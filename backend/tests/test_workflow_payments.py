"""End-to-end workflow tests for the payment + webhook → booking state flow.

Walks through complete payment journeys via HTTP calls against a real test DB.
No DB mocking — ADR rule (mocks caused prod incidents).

Journeys covered:
  1. Fawry webhook → payment captured → BookingEvent(payment_received) inserted
  2. Invalid HMAC signature rejected with 400
  3. Payout list — owner isolation
  4. Escrow list — 24-hour hold window
"""
from __future__ import annotations

import datetime
import hashlib
import json
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.bookings.models import (
    Booking,
    BookingEvent,
    BookingEventType,
    BookingStatus,
    Yacht,
    YachtStatus,
)
from apps.core.models import DeparturePort, Region
from apps.payments.models import (
    Payment,
    PaymentProviderChoices,
    PaymentStatus,
    Payout,
    PayoutStatus,
)


# ---------------------------------------------------------------------------
# URL constants
# ---------------------------------------------------------------------------

WEBHOOK_FAWRY_URL = "/api/v1/payments/webhook/fawry/"
PAYOUTS_URL = "/api/v1/payments/payouts/"
ESCROW_URL = "/api/v1/payments/escrow/"


# ---------------------------------------------------------------------------
# Object builders
# ---------------------------------------------------------------------------


def _region(code: str = "EG") -> Region:
    region, _ = Region.objects.get_or_create(
        code=code,
        defaults={
            "name_ar": "مصر",
            "name_en": "Egypt",
            "currency": "EGP",
            "timezone": "Africa/Cairo",
            "is_active": True,
        },
    )
    return region


def _port(region: Region, name_en: str = "Hurghada Marina") -> DeparturePort:
    port, _ = DeparturePort.objects.get_or_create(
        name_en=name_en,
        defaults={
            "name_ar": "مرسى الغردقة",
            "region": region,
            "city_en": "Hurghada",
            "city_ar": "الغردقة",
            "latitude": Decimal("27.257400"),
            "longitude": Decimal("33.811600"),
            "is_active": True,
        },
    )
    return port


def _user(email: str, role: str = UserRole.CUSTOMER, region: Region | None = None) -> User:
    if region is None:
        region = _region()
    return User.objects.create_user(
        email=email,
        password="TestPass123!",
        first_name=email.split("@")[0].title(),
        last_name="Test",
        role=role,
        region=region,
    )


def _yacht(owner: User, region: Region, port: DeparturePort) -> Yacht:
    return Yacht.objects.create(
        owner=owner,
        region=region,
        departure_port=port,
        name="Sea Dream",
        name_ar="حلم البحر",
        description="Charter yacht.",
        description_ar="قارب إيجار.",
        capacity=8,
        price_per_day=Decimal("1500.00"),
        currency="EGP",
        yacht_type="motorboat",
        status=YachtStatus.ACTIVE,
    )


def _booking(
    yacht: Yacht,
    customer: User,
    region: Region,
    port: DeparturePort,
    *,
    status: str = BookingStatus.CONFIRMED,
    total_amount: str = "3000.00",
) -> Booking:
    return Booking.objects.create(
        yacht=yacht,
        customer=customer,
        region=region,
        departure_port=port,
        start_date=datetime.date(2026, 6, 1),
        end_date=datetime.date(2026, 6, 3),
        num_passengers=4,
        total_amount=Decimal(total_amount),
        currency="EGP",
        status=status,
    )


def _payment(
    booking: Booking,
    provider_ref: str,
    *,
    status: str = PaymentStatus.PENDING,
) -> Payment:
    return Payment.objects.create(
        booking=booking,
        provider=PaymentProviderChoices.FAWRY,
        provider_ref=provider_ref,
        amount=booking.total_amount,
        currency=booking.currency,
        status=status,
        checkout_url=f"https://atfawry.fawrystaging.com/pay/{provider_ref}",
    )


def _payout(owner: User, reference: str, currency: str = "EGP") -> Payout:
    return Payout.objects.create(
        owner=owner,
        amount=Decimal("1500.00"),
        currency=currency,
        status=PayoutStatus.SCHEDULED,
        reference=reference,
        payment_method="Bank Transfer",
        scheduled_date=datetime.date(2026, 5, 15),
        escrow_booking_ids=[],
    )


def _fawry_signature(payload: bytes, security_key: str) -> str:
    """Reproduce FawryProvider.verify_webhook HMAC: SHA-256(payload + key)."""
    return hashlib.sha256(
        (payload.decode("utf-8") + security_key).encode("utf-8")
    ).hexdigest()


def _auth(client: APIClient, user: User) -> APIClient:
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def eg_region(db) -> Region:
    return _region()


@pytest.fixture
def port(db, eg_region) -> DeparturePort:
    return _port(eg_region)


@pytest.fixture
def owner(db, eg_region) -> User:
    return _user("wf_pay_owner@test.com", role=UserRole.OWNER, region=eg_region)


@pytest.fixture
def customer(db, eg_region) -> User:
    return _user("wf_pay_customer@test.com", role=UserRole.CUSTOMER, region=eg_region)


@pytest.fixture
def yacht(db, owner, eg_region, port) -> Yacht:
    return _yacht(owner, eg_region, port)


@pytest.fixture
def confirmed_booking(db, yacht, customer, eg_region, port) -> Booking:
    return _booking(yacht, customer, eg_region, port, status=BookingStatus.CONFIRMED)


@pytest.fixture
def pending_payment(db, confirmed_booking) -> Payment:
    return _payment(confirmed_booking, "FAW-WF-WORKFLOW-001")


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


# ---------------------------------------------------------------------------
# 1. Fawry webhook → booking paid flow
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestFawryWebhookWorkflow:
    """Full webhook journey: correct signature → payment captured → BookingEvent inserted."""

    def test_happy_webhook_paid_captures_payment(
        self, api_client, pending_payment, settings
    ):
        settings.FAWRY_SECURITY_KEY = "webhook-test-secret"

        payload = json.dumps(
            {
                "fawryRefNumber": pending_payment.provider_ref,
                "paymentStatus": "PAID",
                "paymentAmount": str(pending_payment.amount),
                "currency": "EGP",
            }
        ).encode("utf-8")
        signature = _fawry_signature(payload, "webhook-test-secret")

        resp = api_client.post(
            WEBHOOK_FAWRY_URL,
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=signature,
        )
        assert resp.status_code == 200

        pending_payment.refresh_from_db()
        assert pending_payment.status == PaymentStatus.CAPTURED

    def test_happy_webhook_paid_inserts_booking_event(
        self, api_client, pending_payment, settings
    ):
        """ADR-012: BookingEvent(payment_received) must be created in the same atomic block."""
        settings.FAWRY_SECURITY_KEY = "webhook-test-secret"

        payload = json.dumps(
            {
                "fawryRefNumber": pending_payment.provider_ref,
                "paymentStatus": "PAID",
                "paymentAmount": str(pending_payment.amount),
                "currency": "EGP",
            }
        ).encode("utf-8")
        signature = _fawry_signature(payload, "webhook-test-secret")

        api_client.post(
            WEBHOOK_FAWRY_URL,
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=signature,
        )

        events = BookingEvent.objects.filter(
            booking=pending_payment.booking,
            event_type=BookingEventType.PAYMENT_RECEIVED,
        )
        assert events.count() == 1
        evt = events.first()
        assert evt.actor_id is None  # system event — no actor
        assert evt.metadata["payment_id"] == str(pending_payment.id)

    def test_happy_webhook_paid_merges_webhook_payload_into_metadata(
        self, api_client, pending_payment, settings
    ):
        settings.FAWRY_SECURITY_KEY = "webhook-test-secret"

        payload = json.dumps(
            {
                "fawryRefNumber": pending_payment.provider_ref,
                "paymentStatus": "PAID",
                "paymentAmount": str(pending_payment.amount),
                "currency": "EGP",
            }
        ).encode("utf-8")
        signature = _fawry_signature(payload, "webhook-test-secret")

        api_client.post(
            WEBHOOK_FAWRY_URL,
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=signature,
        )

        pending_payment.refresh_from_db()
        assert "webhook" in pending_payment.metadata

    def test_happy_webhook_complete_workflow_in_sequence(
        self, api_client, yacht, customer, eg_region, port, settings
    ):
        """Smoke test: create booking + payment then fire webhook; verify both DB tables."""
        settings.FAWRY_SECURITY_KEY = "seq-test-secret"

        booking = _booking(yacht, customer, eg_region, port, status=BookingStatus.CONFIRMED)
        payment = _payment(booking, "FAW-SEQ-999")

        payload = json.dumps(
            {
                "fawryRefNumber": "FAW-SEQ-999",
                "paymentStatus": "PAID",
                "paymentAmount": str(payment.amount),
                "currency": "EGP",
            }
        ).encode("utf-8")
        signature = _fawry_signature(payload, "seq-test-secret")

        resp = api_client.post(
            WEBHOOK_FAWRY_URL,
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=signature,
        )
        assert resp.status_code == 200

        payment.refresh_from_db()
        assert payment.status == PaymentStatus.CAPTURED

        assert BookingEvent.objects.filter(
            booking=booking,
            event_type=BookingEventType.PAYMENT_RECEIVED,
        ).exists()


# ---------------------------------------------------------------------------
# 2. Invalid signature rejected
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestFawryWebhookSignatureGuard:
    """Malformed or missing HMAC signatures must return 400 without touching the DB."""

    def test_sad_invalid_signature_returns_400(self, api_client, settings):
        settings.FAWRY_SECURITY_KEY = "sig-guard-secret"

        payload = json.dumps(
            {"fawryRefNumber": "FAW-SIG-001", "paymentStatus": "PAID"}
        ).encode("utf-8")

        resp = api_client.post(
            WEBHOOK_FAWRY_URL,
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE="bad-sig-that-is-wrong",
        )
        assert resp.status_code == 400
        assert resp.data["error"]["code"] == "INVALID_SIGNATURE"

    def test_sad_missing_signature_header_returns_400(self, api_client, settings):
        settings.FAWRY_SECURITY_KEY = "sig-guard-secret"

        payload = json.dumps(
            {"fawryRefNumber": "FAW-SIG-002", "paymentStatus": "PAID"}
        ).encode("utf-8")

        # No X-Fawry-Signature header
        resp = api_client.post(
            WEBHOOK_FAWRY_URL,
            data=payload,
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_sad_invalid_signature_does_not_update_payment(
        self, api_client, pending_payment, settings
    ):
        """DB must not be touched when signature is invalid."""
        settings.FAWRY_SECURITY_KEY = "sig-guard-secret"

        payload = json.dumps(
            {
                "fawryRefNumber": pending_payment.provider_ref,
                "paymentStatus": "PAID",
                "paymentAmount": str(pending_payment.amount),
                "currency": "EGP",
            }
        ).encode("utf-8")

        api_client.post(
            WEBHOOK_FAWRY_URL,
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE="tampered-signature-value",
        )

        pending_payment.refresh_from_db()
        # Payment status must remain pending — no DB write should have occurred
        assert pending_payment.status == PaymentStatus.PENDING

    def test_sad_wrong_key_returns_400(self, api_client, settings):
        """Payload signed with a different key must be rejected."""
        settings.FAWRY_SECURITY_KEY = "real-secret"

        payload = json.dumps(
            {"fawryRefNumber": "FAW-WRONG-KEY", "paymentStatus": "PAID"}
        ).encode("utf-8")
        # Sign with a different key
        wrong_signature = _fawry_signature(payload, "different-secret")

        resp = api_client.post(
            WEBHOOK_FAWRY_URL,
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=wrong_signature,
        )
        assert resp.status_code == 400

    def test_happy_unknown_provider_ref_returns_200_no_retry_storm(
        self, api_client, settings
    ):
        """Unknown provider_ref returns 200 to prevent Fawry retry storms."""
        settings.FAWRY_SECURITY_KEY = "no-retry-secret"

        payload = json.dumps(
            {
                "fawryRefNumber": "DOES-NOT-EXIST-EVER",
                "paymentStatus": "PAID",
                "paymentAmount": "100.00",
                "currency": "EGP",
            }
        ).encode("utf-8")
        signature = _fawry_signature(payload, "no-retry-secret")

        resp = api_client.post(
            WEBHOOK_FAWRY_URL,
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=signature,
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 3. Payout list — owner isolation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPayoutListWorkflow:
    """GET /api/v1/payments/payouts/ — owner sees only their own payouts."""

    def test_sad_payout_list_requires_auth(self, api_client):
        resp = api_client.get(PAYOUTS_URL)
        assert resp.status_code == 401

    def test_happy_owner_sees_own_payouts(self, api_client, eg_region):
        owner1 = _user("wf_payout_owner1@test.com", role=UserRole.OWNER, region=eg_region)
        owner2 = _user("wf_payout_owner2@test.com", role=UserRole.OWNER, region=eg_region)

        p1 = _payout(owner1, "PAYOUT-WF-001")
        _payout(owner2, "PAYOUT-WF-002")

        _auth(api_client, owner1)
        resp = api_client.get(PAYOUTS_URL)
        assert resp.status_code == 200
        assert "results" in resp.data

        result_ids = [item["id"] for item in resp.data["results"]]
        assert str(p1.id) in result_ids

    def test_sad_owner1_cannot_see_owner2_payouts(self, api_client, eg_region):
        owner1 = _user("wf_payout_iso1@test.com", role=UserRole.OWNER, region=eg_region)
        owner2 = _user("wf_payout_iso2@test.com", role=UserRole.OWNER, region=eg_region)

        _payout(owner1, "PAYOUT-ISO-001")
        p2 = _payout(owner2, "PAYOUT-ISO-002")

        _auth(api_client, owner1)
        resp = api_client.get(PAYOUTS_URL)
        assert resp.status_code == 200

        result_ids = [item["id"] for item in resp.data["results"]]
        assert str(p2.id) not in result_ids, (
            "Owner 1 must not see Owner 2's payout — data isolation violated"
        )

    def test_happy_payout_list_returns_two_payouts(self, api_client, eg_region):
        owner = _user("wf_payout_two@test.com", role=UserRole.OWNER, region=eg_region)
        _payout(owner, "PAYOUT-TWO-A")
        _payout(owner, "PAYOUT-TWO-B")

        _auth(api_client, owner)
        resp = api_client.get(PAYOUTS_URL)
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2

    def test_happy_payout_zero_results_for_different_owner(self, api_client, eg_region):
        owner1 = _user("wf_payout_zero1@test.com", role=UserRole.OWNER, region=eg_region)
        owner2 = _user("wf_payout_zero2@test.com", role=UserRole.OWNER, region=eg_region)

        _payout(owner1, "PAYOUT-ZERO-001")
        # owner2 has no payouts

        _auth(api_client, owner2)
        resp = api_client.get(PAYOUTS_URL)
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 0

    def test_happy_payout_response_fields(self, api_client, eg_region):
        owner = _user("wf_payout_fields@test.com", role=UserRole.OWNER, region=eg_region)
        payout = _payout(owner, "PAYOUT-FIELDS-001")

        _auth(api_client, owner)
        resp = api_client.get(PAYOUTS_URL)
        assert resp.status_code == 200

        item = resp.data["results"][0]
        assert item["id"] == str(payout.id)
        for field in ("amount", "currency", "status", "reference", "scheduled_date", "created_at"):
            assert field in item, f"Missing field '{field}' in payout response"


# ---------------------------------------------------------------------------
# 4. Escrow list — 24-hour hold window
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestEscrowListWorkflow:
    """GET /api/v1/payments/escrow/ — only recent completed bookings appear."""

    def test_sad_escrow_list_requires_auth(self, api_client):
        resp = api_client.get(ESCROW_URL)
        assert resp.status_code == 401

    def test_happy_recent_completed_booking_appears_in_escrow(
        self, api_client, owner, customer, eg_region, port
    ):
        """A booking completed within the last 24h must appear in escrow."""
        yacht = _yacht(owner, eg_region, port)
        booking = _booking(yacht, customer, eg_region, port, status=BookingStatus.COMPLETED)
        # updated_at defaults to now() — within the 24h window

        _auth(api_client, owner)
        resp = api_client.get(ESCROW_URL)
        assert resp.status_code == 200
        result_ids = [item["id"] for item in resp.data["results"]]
        assert str(booking.id) in result_ids

    def test_sad_old_completed_booking_excluded_from_escrow(
        self, api_client, owner, customer, eg_region, port
    ):
        """A booking completed more than 24h ago must NOT appear in escrow."""
        yacht = _yacht(owner, eg_region, port)
        booking = _booking(yacht, customer, eg_region, port, status=BookingStatus.COMPLETED)

        # Push updated_at back by 48h — beyond the escrow window
        old_time = timezone.now() - datetime.timedelta(hours=48)
        Booking.objects.filter(pk=booking.pk).update(updated_at=old_time)

        _auth(api_client, owner)
        resp = api_client.get(ESCROW_URL)
        assert resp.status_code == 200
        result_ids = [item["id"] for item in resp.data["results"]]
        assert str(booking.id) not in result_ids, (
            "Booking completed >24h ago must not appear in escrow window"
        )

    def test_sad_escrow_does_not_show_other_owners_bookings(
        self, api_client, customer, eg_region, port
    ):
        """Owner A cannot see Owner B's escrow items — data isolation."""
        owner_a = _user("wf_escrow_owner_a@test.com", role=UserRole.OWNER, region=eg_region)
        owner_b = _user("wf_escrow_owner_b@test.com", role=UserRole.OWNER, region=eg_region)

        yacht_b = _yacht(owner_b, eg_region, port)
        booking_b = _booking(yacht_b, customer, eg_region, port, status=BookingStatus.COMPLETED)

        _auth(api_client, owner_a)
        resp = api_client.get(ESCROW_URL)
        assert resp.status_code == 200
        result_ids = [item["id"] for item in resp.data["results"]]
        assert str(booking_b.id) not in result_ids

    def test_happy_escrow_boundary_booking_exactly_at_cutoff_still_appears(
        self, api_client, owner, customer, eg_region, port
    ):
        """Booking updated_at exactly at (now - 23h) must still be within the window."""
        yacht = _yacht(owner, eg_region, port)
        booking = _booking(yacht, customer, eg_region, port, status=BookingStatus.COMPLETED)

        # 23 hours ago — just inside the 24h window
        recent_ish = timezone.now() - datetime.timedelta(hours=23)
        Booking.objects.filter(pk=booking.pk).update(updated_at=recent_ish)

        _auth(api_client, owner)
        resp = api_client.get(ESCROW_URL)
        assert resp.status_code == 200
        result_ids = [item["id"] for item in resp.data["results"]]
        assert str(booking.id) in result_ids

    def test_happy_escrow_response_shape(
        self, api_client, owner, customer, eg_region, port
    ):
        """Escrow items expose id, customer_name, trip_date, amount, currency, release_hours."""
        yacht = _yacht(owner, eg_region, port)
        _booking(yacht, customer, eg_region, port, status=BookingStatus.COMPLETED)

        _auth(api_client, owner)
        resp = api_client.get(ESCROW_URL)
        assert resp.status_code == 200
        assert len(resp.data["results"]) >= 1

        item = resp.data["results"][0]
        for field in ("id", "customer_name", "trip_date", "amount", "currency", "release_hours"):
            assert field in item, f"Missing field '{field}' in escrow response"
        assert float(item["release_hours"]) >= 0

    def test_happy_escrow_empty_when_no_completed_bookings(
        self, api_client, owner
    ):
        """Owner with no completed bookings sees an empty escrow list."""
        _auth(api_client, owner)
        resp = api_client.get(ESCROW_URL)
        assert resp.status_code == 200
        assert resp.data["results"] == []

    def test_sad_non_completed_booking_not_in_escrow(
        self, api_client, owner, customer, eg_region, port
    ):
        """A confirmed (non-completed) booking must never appear in escrow."""
        yacht = _yacht(owner, eg_region, port)
        booking = _booking(yacht, customer, eg_region, port, status=BookingStatus.CONFIRMED)

        _auth(api_client, owner)
        resp = api_client.get(ESCROW_URL)
        assert resp.status_code == 200
        result_ids = [item["id"] for item in resp.data["results"]]
        assert str(booking.id) not in result_ids
