"""Co-located pytest tests for apps/payments/ — Sprint 11C.

Covers all four payment endpoints:
  POST   /api/v1/payments/initiate/       — PaymentInitiateView
  POST   /api/v1/payments/webhook/fawry/  — FawryWebhookView
  GET    /api/v1/payments/payouts/        — PayoutListView
  GET    /api/v1/payments/escrow/         — EscrowListView

ADR compliance:
  ADR-001 — UUID PKs, ORM only
  ADR-007 — Provider never called directly; patched via get_provider path
  ADR-009 — JWT authentication enforced on all authenticated endpoints
  ADR-012 — BookingEvent inserted atomically with payment status update
  ADR-013 — CursorPagination shape on payout list
  ADR-018 — Currency sourced from booking, never hardcoded

Rules:
  - NEVER mock the database — all DB interactions use the real test DB.
  - The Fawry provider's httpx.post is patched in initiate tests to avoid
    real network calls (the provider HTTP layer, not the DB layer).
"""
from __future__ import annotations

import datetime
import hashlib
import json
import uuid
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.bookings.models import Booking, BookingEvent, BookingEventType, BookingStatus
from apps.core.models import Region
from apps.payments.models import Payment, PaymentProviderChoices, PaymentStatus, Payout, PayoutStatus


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

INITIATE_URL = "/api/v1/payments/initiate/"
WEBHOOK_URL = "/api/v1/payments/webhook/fawry/"
PAYOUTS_URL = "/api/v1/payments/payouts/"
ESCROW_URL = "/api/v1/payments/escrow/"


def _signed_fawry(payload: bytes, key: str) -> str:
    """Compute the expected Fawry webhook signature for a given payload + key."""
    return hashlib.sha256(
        (payload.decode("utf-8") + key).encode("utf-8"),
    ).hexdigest()


def _fawry_payload(provider_ref: str, status: str = "PAID", amount: str = "3000.00") -> bytes:
    return json.dumps(
        {
            "fawryRefNumber": provider_ref,
            "paymentStatus": status,
            "paymentAmount": amount,
            "currency": "EGP",
        },
    ).encode("utf-8")


# ---------------------------------------------------------------------------
# PaymentInitiateView — POST /api/v1/payments/initiate/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPaymentInitiateView:
    """Tests for POST /api/v1/payments/initiate/."""

    # -----------------------------------------------------------------------
    # Authentication
    # -----------------------------------------------------------------------

    def test_initiate_requires_auth(self, api_client: APIClient, confirmed_booking: Booking) -> None:
        """ADR-009: anonymous request must return 401."""
        response = api_client.post(
            INITIATE_URL,
            data={
                "booking_id": str(confirmed_booking.id),
                "return_url": "https://seaconnect.app/confirm",
            },
            format="json",
        )
        assert response.status_code == 401

    # -----------------------------------------------------------------------
    # Booking ownership / state guard
    # -----------------------------------------------------------------------

    def test_initiate_requires_confirmed_booking(
        self,
        customer_client: APIClient,
        pending_booking: Booking,
    ) -> None:
        """A booking in pending_owner status is invisible to the endpoint (404)."""
        response = customer_client.post(
            INITIATE_URL,
            data={
                "booking_id": str(pending_booking.id),
                "return_url": "https://seaconnect.app/confirm",
            },
            format="json",
        )
        # get_object_or_404 filters status=CONFIRMED — pending → 404
        assert response.status_code == 404

    def test_initiate_sad_other_customers_booking_returns_404(
        self,
        api_client: APIClient,
        confirmed_booking: Booking,
        other_customer: User,
    ) -> None:
        """A customer trying to pay for another customer's booking gets 404."""
        api_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(other_customer).access_token)}",
        )
        response = api_client.post(
            INITIATE_URL,
            data={
                "booking_id": str(confirmed_booking.id),
                "return_url": "https://seaconnect.app/confirm",
            },
            format="json",
        )
        assert response.status_code == 404

    # -----------------------------------------------------------------------
    # Happy path
    # -----------------------------------------------------------------------

    def test_initiate_creates_payment_record(
        self,
        customer_client: APIClient,
        confirmed_booking: Booking,
    ) -> None:
        """Happy path: confirmed booking → 201, a pending Payment row is persisted."""
        with patch("apps.payments.views.get_provider") as mock_get_provider:
            mock_provider = MagicMock()
            mock_provider.initiate.return_value = MagicMock(
                provider_ref="FAW-CREATE-001",
                checkout_url="https://atfawry.fawrystaging.com/pay/FAW-CREATE-001",
                raw_response={"referenceNumber": "FAW-CREATE-001"},
            )
            mock_get_provider.return_value = mock_provider

            response = customer_client.post(
                INITIATE_URL,
                data={
                    "booking_id": str(confirmed_booking.id),
                    "return_url": "https://seaconnect.app/confirm",
                },
                format="json",
            )

        assert response.status_code == 201
        # Verify the Payment row was written to the real DB
        payment = Payment.objects.get(provider_ref="FAW-CREATE-001")
        assert payment.booking_id == confirmed_booking.id
        assert payment.status == PaymentStatus.PENDING
        assert payment.amount == Decimal("3000.00")
        assert payment.currency == "EGP"
        assert payment.provider == PaymentProviderChoices.FAWRY

    def test_initiate_returns_provider_response(
        self,
        customer_client: APIClient,
        confirmed_booking: Booking,
    ) -> None:
        """Response body must contain checkout_url and a payment object."""
        with patch("apps.payments.views.get_provider") as mock_get_provider:
            mock_provider = MagicMock()
            mock_provider.initiate.return_value = MagicMock(
                provider_ref="FAW-RESP-001",
                checkout_url="https://atfawry.fawrystaging.com/pay/FAW-RESP-001",
                raw_response={"referenceNumber": "FAW-RESP-001"},
            )
            mock_get_provider.return_value = mock_provider

            response = customer_client.post(
                INITIATE_URL,
                data={
                    "booking_id": str(confirmed_booking.id),
                    "return_url": "https://seaconnect.app/confirm",
                },
                format="json",
            )

        assert response.status_code == 201
        body = response.json()
        assert "checkout_url" in body
        assert body["checkout_url"] == "https://atfawry.fawrystaging.com/pay/FAW-RESP-001"
        assert "payment" in body
        assert body["payment"]["status"] == PaymentStatus.PENDING
        # Amount must come from the booking (server-trusted), not from the request
        assert body["payment"]["amount"] == "3000.00"
        assert body["payment"]["currency"] == "EGP"

    def test_initiate_sad_provider_failure_returns_502(
        self,
        customer_client: APIClient,
        confirmed_booking: Booking,
    ) -> None:
        """When the provider raises, the view returns 502 with a structured error."""
        with patch("apps.payments.views.get_provider") as mock_get_provider:
            mock_provider = MagicMock()
            mock_provider.initiate.side_effect = RuntimeError("Fawry is down")
            mock_get_provider.return_value = mock_provider

            response = customer_client.post(
                INITIATE_URL,
                data={
                    "booking_id": str(confirmed_booking.id),
                    "return_url": "https://seaconnect.app/confirm",
                },
                format="json",
            )

        assert response.status_code == 502
        assert response.json()["error"]["code"] == "PAYMENT_INITIATION_FAILED"

    def test_initiate_sad_missing_fields_returns_400(
        self,
        customer_client: APIClient,
    ) -> None:
        """Submitting an empty body must return 400 (serializer validation)."""
        response = customer_client.post(INITIATE_URL, data={}, format="json")
        assert response.status_code == 400

    def test_initiate_sad_invalid_uuid_returns_400(
        self,
        customer_client: APIClient,
    ) -> None:
        """A malformed booking_id must fail serializer validation with 400."""
        response = customer_client.post(
            INITIATE_URL,
            data={"booking_id": "not-a-uuid", "return_url": "https://seaconnect.app/confirm"},
            format="json",
        )
        assert response.status_code == 400

    def test_initiate_sad_nonexistent_booking_returns_404(
        self,
        customer_client: APIClient,
    ) -> None:
        """A valid UUID that references no booking must return 404."""
        with patch("apps.payments.views.get_provider"):
            response = customer_client.post(
                INITIATE_URL,
                data={
                    "booking_id": str(uuid.uuid4()),
                    "return_url": "https://seaconnect.app/confirm",
                },
                format="json",
            )
        assert response.status_code == 404

    def test_initiate_provider_lookup_uses_booking_currency(
        self,
        customer_client: APIClient,
        confirmed_booking: Booking,
    ) -> None:
        """ADR-007: provider must be resolved by booking.currency, not any request field."""
        with patch("apps.payments.views.get_provider") as mock_get_provider:
            mock_provider = MagicMock()
            mock_provider.initiate.return_value = MagicMock(
                provider_ref="FAW-CUR-001",
                checkout_url="https://atfawry.fawrystaging.com/pay/FAW-CUR-001",
                raw_response={},
            )
            mock_get_provider.return_value = mock_provider

            customer_client.post(
                INITIATE_URL,
                data={
                    "booking_id": str(confirmed_booking.id),
                    "return_url": "https://seaconnect.app/confirm",
                },
                format="json",
            )
            mock_get_provider.assert_called_once_with(confirmed_booking.currency)


# ---------------------------------------------------------------------------
# FawryWebhookView — POST /api/v1/payments/webhook/fawry/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestFawryWebhookView:
    """Tests for POST /api/v1/payments/webhook/fawry/."""

    # -----------------------------------------------------------------------
    # Authentication
    # -----------------------------------------------------------------------

    def test_webhook_no_auth_required(self, api_client: APIClient, settings) -> None:
        """AllowAny: the webhook endpoint must accept requests without JWT."""
        settings.FAWRY_SECURITY_KEY = "test-secret"
        # We use an unknown ref so the view returns 200 early without touching
        # any real records — this is the retry-storm suppression path.
        payload = _fawry_payload("UNKNOWN-REF-NO-AUTH")
        sig = _signed_fawry(payload, "test-secret")
        response = api_client.post(
            WEBHOOK_URL,
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=sig,
        )
        assert response.status_code == 200

    # -----------------------------------------------------------------------
    # Signature verification
    # -----------------------------------------------------------------------

    def test_webhook_invalid_signature_returns_400(
        self,
        api_client: APIClient,
        settings,
    ) -> None:
        """A tampered or missing signature must be rejected before any DB write."""
        settings.FAWRY_SECURITY_KEY = "test-secret"
        payload = _fawry_payload("FAW-SIG-001")
        response = api_client.post(
            WEBHOOK_URL,
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE="completely-wrong-signature",
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "INVALID_SIGNATURE"

    def test_webhook_missing_signature_header_returns_400(
        self,
        api_client: APIClient,
        settings,
    ) -> None:
        """Omitting the X-Fawry-Signature header entirely must return 400."""
        settings.FAWRY_SECURITY_KEY = "test-secret"
        payload = _fawry_payload("FAW-NOSIG-001")
        # No HTTP_X_FAWRY_SIGNATURE kwarg — verify_webhook returns False
        response = api_client.post(
            WEBHOOK_URL,
            data=payload,
            content_type="application/json",
        )
        assert response.status_code == 400

    # -----------------------------------------------------------------------
    # Happy path — payment captured
    # -----------------------------------------------------------------------

    def test_webhook_valid_signature_updates_booking(
        self,
        api_client: APIClient,
        pending_payment: Payment,
        settings,
    ) -> None:
        """Valid PAID webhook: payment.status flips to captured and BookingEvent inserted."""
        settings.FAWRY_SECURITY_KEY = "test-secret"
        payload = _fawry_payload(
            pending_payment.provider_ref,
            status="PAID",
            amount=str(pending_payment.amount),
        )
        sig = _signed_fawry(payload, "test-secret")

        response = api_client.post(
            WEBHOOK_URL,
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=sig,
        )
        assert response.status_code == 200

        # DB assertions — real DB, no mocks
        pending_payment.refresh_from_db()
        assert pending_payment.status == PaymentStatus.CAPTURED
        assert "webhook" in pending_payment.metadata

        # ADR-012: BookingEvent must be in the same atomic transaction
        event_qs = BookingEvent.objects.filter(
            booking=pending_payment.booking,
            event_type=BookingEventType.PAYMENT_RECEIVED,
        )
        assert event_qs.count() == 1
        evt = event_qs.first()
        assert evt.actor_id is None  # system-generated event
        assert evt.metadata["payment_id"] == str(pending_payment.id)
        assert evt.metadata["amount"] == str(pending_payment.amount)

    def test_webhook_sad_failed_status_does_not_emit_booking_event(
        self,
        api_client: APIClient,
        pending_payment: Payment,
        settings,
    ) -> None:
        """A FAILED webhook updates the payment to failed but does NOT insert a BookingEvent."""
        settings.FAWRY_SECURITY_KEY = "test-secret"
        payload = _fawry_payload(pending_payment.provider_ref, status="FAILED", amount="0")
        sig = _signed_fawry(payload, "test-secret")

        response = api_client.post(
            WEBHOOK_URL,
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=sig,
        )
        assert response.status_code == 200

        pending_payment.refresh_from_db()
        assert pending_payment.status == PaymentStatus.FAILED

        assert not BookingEvent.objects.filter(
            booking=pending_payment.booking,
            event_type=BookingEventType.PAYMENT_RECEIVED,
        ).exists()

    def test_webhook_expired_status_maps_to_failed(
        self,
        api_client: APIClient,
        pending_payment: Payment,
        settings,
    ) -> None:
        """Fawry EXPIRED status must map to payment.status = failed."""
        settings.FAWRY_SECURITY_KEY = "test-secret"
        payload = _fawry_payload(pending_payment.provider_ref, status="EXPIRED", amount="0")
        sig = _signed_fawry(payload, "test-secret")

        api_client.post(
            WEBHOOK_URL,
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=sig,
        )
        pending_payment.refresh_from_db()
        assert pending_payment.status == PaymentStatus.FAILED

    def test_webhook_sad_unknown_provider_ref_returns_200(
        self,
        api_client: APIClient,
        settings,
    ) -> None:
        """Unknown provider_ref: returns 200 to suppress Fawry retry storms."""
        settings.FAWRY_SECURITY_KEY = "test-secret"
        payload = _fawry_payload("DOES-NOT-EXIST-9999")
        sig = _signed_fawry(payload, "test-secret")

        response = api_client.post(
            WEBHOOK_URL,
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=sig,
        )
        assert response.status_code == 200

    def test_webhook_metadata_stored_on_capture(
        self,
        api_client: APIClient,
        pending_payment: Payment,
        settings,
    ) -> None:
        """The raw webhook JSON must be merged into payment.metadata['webhook']."""
        settings.FAWRY_SECURITY_KEY = "test-secret"
        payload = _fawry_payload(
            pending_payment.provider_ref,
            status="PAID",
            amount=str(pending_payment.amount),
        )
        sig = _signed_fawry(payload, "test-secret")
        api_client.post(
            WEBHOOK_URL,
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=sig,
        )
        pending_payment.refresh_from_db()
        assert "webhook" in pending_payment.metadata
        assert pending_payment.metadata["webhook"]["fawryRefNumber"] == pending_payment.provider_ref


# ---------------------------------------------------------------------------
# PayoutListView — GET /api/v1/payments/payouts/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPayoutListView:
    """Tests for GET /api/v1/payments/payouts/."""

    # -----------------------------------------------------------------------
    # Authentication
    # -----------------------------------------------------------------------

    def test_payout_list_requires_auth(self, api_client: APIClient) -> None:
        """ADR-009: unauthenticated request must return 401."""
        response = api_client.get(PAYOUTS_URL)
        assert response.status_code == 401

    # -----------------------------------------------------------------------
    # Data isolation
    # -----------------------------------------------------------------------

    def test_payout_list_returns_own_payouts_only(
        self,
        owner_client: APIClient,
        owner: User,
        payout: Payout,
        egypt_region: Region,
    ) -> None:
        """Owner sees only their own payouts; another owner's payouts must not leak."""
        other_owner = User.objects.create_user(
            email="other-owner-payout@test.com",
            password="TestPass123!",
            first_name="Other",
            last_name="Owner",
            role=UserRole.OWNER,
            region=egypt_region,
        )
        other_payout = Payout.objects.create(
            owner=other_owner,
            amount=Decimal("5000.00"),
            currency="EGP",
            status=PayoutStatus.PAID,
            reference="PO-OTHER-001",
            payment_method="Bank Transfer",
            scheduled_date=datetime.date(2026, 5, 20),
            escrow_booking_ids=[],
        )

        response = owner_client.get(PAYOUTS_URL)
        assert response.status_code == 200

        result_ids = [item["id"] for item in response.json()["results"]]
        assert str(payout.id) in result_ids
        assert str(other_payout.id) not in result_ids

    # -----------------------------------------------------------------------
    # Pagination
    # -----------------------------------------------------------------------

    def test_payout_list_cursor_pagination(
        self,
        owner_client: APIClient,
        owner: User,
    ) -> None:
        """ADR-013: response must include 'results' list and cursor fields."""
        for i in range(3):
            Payout.objects.create(
                owner=owner,
                amount=Decimal("1000.00"),
                currency="EGP",
                status=PayoutStatus.SCHEDULED,
                reference=f"PO-PAG-{i:03d}",
                payment_method="Bank Transfer",
                scheduled_date=datetime.date(2026, 6, i + 1),
                escrow_booking_ids=[],
            )

        response = owner_client.get(PAYOUTS_URL)
        assert response.status_code == 200

        body = response.json()
        assert "results" in body, "Response must have a 'results' key (ADR-013)"
        assert isinstance(body["results"], list)
        # Cursor pagination shape — project uses 'next_cursor' or 'next'
        assert "next_cursor" in body or "next" in body, (
            "Cursor-paginated response must expose a next cursor field (ADR-013)"
        )
        assert "has_more" in body or "next_cursor" in body or "next" in body

    # -----------------------------------------------------------------------
    # Empty state
    # -----------------------------------------------------------------------

    def test_payout_list_empty_for_new_owner(
        self,
        owner_client: APIClient,
    ) -> None:
        """A freshly created owner with no payouts must get 200 with empty results."""
        response = owner_client.get(PAYOUTS_URL)
        assert response.status_code == 200
        assert response.json()["results"] == []

    # -----------------------------------------------------------------------
    # Serializer fields
    # -----------------------------------------------------------------------

    def test_payout_list_response_fields(
        self,
        owner_client: APIClient,
        payout: Payout,
    ) -> None:
        """All documented payout fields must be present in the response item."""
        response = owner_client.get(PAYOUTS_URL)
        assert response.status_code == 200

        results = response.json()["results"]
        assert len(results) >= 1
        item = next(r for r in results if r["id"] == str(payout.id))

        required_fields = [
            "id", "amount", "currency", "status", "reference",
            "payment_method", "scheduled_date", "paid_at",
            "escrow_booking_ids", "created_at",
        ]
        for field in required_fields:
            assert field in item, f"Field '{field}' missing from payout response"

    def test_payout_list_adr018_currency_not_hardcoded(
        self,
        owner_client: APIClient,
        payout: Payout,
    ) -> None:
        """ADR-018: currency field must be present and non-empty; never assumed to be 'EGP'."""
        response = owner_client.get(PAYOUTS_URL)
        results = response.json()["results"]
        item = next(r for r in results if r["id"] == str(payout.id))
        assert item["currency"] != ""
        assert len(item["currency"]) == 3  # ISO 4217

    # -----------------------------------------------------------------------
    # Ordering
    # -----------------------------------------------------------------------

    def test_payout_list_ordered_newest_scheduled_date_first(
        self,
        owner_client: APIClient,
        owner: User,
    ) -> None:
        """Payouts are ordered by -scheduled_date: most recent schedule date first."""
        older = Payout.objects.create(
            owner=owner,
            amount=Decimal("1000.00"),
            currency="EGP",
            status=PayoutStatus.PAID,
            reference="PO-ORD-OLD",
            payment_method="Bank Transfer",
            scheduled_date=datetime.date(2026, 3, 1),
            escrow_booking_ids=[],
        )
        newer = Payout.objects.create(
            owner=owner,
            amount=Decimal("2000.00"),
            currency="EGP",
            status=PayoutStatus.SCHEDULED,
            reference="PO-ORD-NEW",
            payment_method="Bank Transfer",
            scheduled_date=datetime.date(2026, 7, 1),
            escrow_booking_ids=[],
        )

        response = owner_client.get(PAYOUTS_URL)
        ids = [r["id"] for r in response.json()["results"]]
        assert ids.index(str(newer.id)) < ids.index(str(older.id)), (
            "Newer scheduled_date must appear before older one"
        )


# ---------------------------------------------------------------------------
# EscrowListView — GET /api/v1/payments/escrow/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestEscrowListView:
    """Tests for GET /api/v1/payments/escrow/."""

    # -----------------------------------------------------------------------
    # Authentication
    # -----------------------------------------------------------------------

    def test_escrow_list_requires_auth(self, api_client: APIClient) -> None:
        """ADR-009: unauthenticated request must return 401."""
        response = api_client.get(ESCROW_URL)
        assert response.status_code == 401

    # -----------------------------------------------------------------------
    # Happy path — bookings inside the 24h window
    # -----------------------------------------------------------------------

    def test_escrow_returns_bookings_in_hold_window(
        self,
        owner_client: APIClient,
        owner: User,
        active_yacht,
        customer: User,
        egypt_region: Region,
        departure_port,
    ) -> None:
        """A completed booking whose updated_at is within the 24h hold must appear."""
        recent_booking = Booking.objects.create(
            yacht=active_yacht,
            customer=customer,
            region=egypt_region,
            departure_port=departure_port,
            start_date=datetime.date(2026, 6, 1),
            end_date=datetime.date(2026, 6, 3),
            num_passengers=2,
            total_amount=Decimal("3000.00"),
            currency="EGP",
            status=BookingStatus.COMPLETED,
        )
        # updated_at defaults to now() — within the 24h window

        response = owner_client.get(ESCROW_URL)
        assert response.status_code == 200

        result_ids = [item["id"] for item in response.json()["results"]]
        assert str(recent_booking.id) in result_ids

    def test_escrow_sad_excludes_completed_bookings_older_than_24h(
        self,
        owner_client: APIClient,
        owner: User,
        active_yacht,
        customer: User,
        egypt_region: Region,
        departure_port,
    ) -> None:
        """Bookings completed more than 24h ago must not appear in the escrow window."""
        from django.utils import timezone

        old_booking = Booking.objects.create(
            yacht=active_yacht,
            customer=customer,
            region=egypt_region,
            departure_port=departure_port,
            start_date=datetime.date(2026, 4, 1),
            end_date=datetime.date(2026, 4, 3),
            num_passengers=2,
            total_amount=Decimal("3000.00"),
            currency="EGP",
            status=BookingStatus.COMPLETED,
        )
        # Force updated_at to >24h ago (auto_now prevents direct assignment)
        stale_time = timezone.now() - datetime.timedelta(hours=48)
        Booking.objects.filter(pk=old_booking.pk).update(updated_at=stale_time)

        response = owner_client.get(ESCROW_URL)
        assert response.status_code == 200
        result_ids = [item["id"] for item in response.json()["results"]]
        assert str(old_booking.id) not in result_ids

    def test_escrow_sad_excludes_other_owners_completed_bookings(
        self,
        owner_client: APIClient,
        owner: User,
        customer: User,
        egypt_region: Region,
        departure_port,
    ) -> None:
        """Escrow items must be scoped to the authenticated owner's yachts only."""
        from apps.bookings.models import Yacht as YachtModel, YachtStatus

        other_owner = User.objects.create_user(
            email="escrow-other-owner@test.com",
            password="TestPass123!",
            first_name="Other",
            last_name="Owner",
            role=UserRole.OWNER,
            region=egypt_region,
        )
        other_yacht = YachtModel.objects.create(
            owner=other_owner,
            region=egypt_region,
            departure_port=departure_port,
            name="Other Escrow Yacht",
            name_ar="قارب الضمان الآخر",
            description="Another yacht.",
            description_ar="قارب آخر.",
            capacity=4,
            price_per_day=Decimal("1000.00"),
            currency="EGP",
            yacht_type="motorboat",
            status=YachtStatus.ACTIVE,
        )
        other_booking = Booking.objects.create(
            yacht=other_yacht,
            customer=customer,
            region=egypt_region,
            departure_port=departure_port,
            start_date=datetime.date(2026, 5, 1),
            end_date=datetime.date(2026, 5, 3),
            num_passengers=2,
            total_amount=Decimal("2000.00"),
            currency="EGP",
            status=BookingStatus.COMPLETED,
        )

        response = owner_client.get(ESCROW_URL)
        assert response.status_code == 200
        result_ids = [item["id"] for item in response.json()["results"]]
        assert str(other_booking.id) not in result_ids

    def test_escrow_empty_for_owner_with_no_completed_bookings(
        self,
        owner_client: APIClient,
    ) -> None:
        """Owner with no completed bookings sees an empty results list, not a 500."""
        response = owner_client.get(ESCROW_URL)
        assert response.status_code == 200
        body = response.json()
        assert "results" in body
        assert body["results"] == []

    def test_escrow_response_fields(
        self,
        owner_client: APIClient,
        owner: User,
        active_yacht,
        customer: User,
        egypt_region: Region,
        departure_port,
    ) -> None:
        """Escrow response items must expose all documented fields."""
        Booking.objects.create(
            yacht=active_yacht,
            customer=customer,
            region=egypt_region,
            departure_port=departure_port,
            start_date=datetime.date(2026, 6, 10),
            end_date=datetime.date(2026, 6, 12),
            num_passengers=3,
            total_amount=Decimal("4500.00"),
            currency="EGP",
            status=BookingStatus.COMPLETED,
        )

        response = owner_client.get(ESCROW_URL)
        assert response.status_code == 200
        results = response.json()["results"]
        assert len(results) >= 1
        item = results[0]

        for field in ["id", "customer_name", "trip_date", "amount", "currency", "release_hours"]:
            assert field in item, f"Escrow response missing required field '{field}'"

        assert float(item["release_hours"]) >= 0
        assert float(item["release_hours"]) <= 24

    def test_escrow_sad_non_completed_booking_excluded(
        self,
        owner_client: APIClient,
        owner: User,
        active_yacht,
        customer: User,
        egypt_region: Region,
        departure_port,
    ) -> None:
        """A confirmed (not yet completed) booking must not appear in escrow."""
        confirmed = Booking.objects.create(
            yacht=active_yacht,
            customer=customer,
            region=egypt_region,
            departure_port=departure_port,
            start_date=datetime.date(2026, 7, 1),
            end_date=datetime.date(2026, 7, 3),
            num_passengers=2,
            total_amount=Decimal("3000.00"),
            currency="EGP",
            status=BookingStatus.CONFIRMED,  # not COMPLETED
        )
        response = owner_client.get(ESCROW_URL)
        result_ids = [item["id"] for item in response.json()["results"]]
        assert str(confirmed.id) not in result_ids
