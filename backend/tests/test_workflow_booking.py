"""End-to-end workflow tests for the SeaConnect booking lifecycle.

These tests walk complete user journeys through the HTTP layer using real DB
writes (no mocks).  Each test class covers one distinct workflow path.

ADR compliance verified here:
  ADR-012 — Every state transition writes a BookingEvent in the same
            transaction.  We assert the event row exists after each HTTP call.
  ADR-018 — Currency is resolved from the yacht/region, never hardcoded.
  ADR-009 — force_authenticate() is used (faster than raw JWT in workflow tests).

Note on the /complete/ endpoint:
  BookingService.complete() exists and is tested here, but no HTTP route is
  registered for it in bookings/urls.py.  Completion is triggered directly
  via the service (representing the Celery beat task that fires post-trip).

Note on AuditLog:
  The booking service does not call log_event() internally.  We call it
  explicitly in the complete step and then assert the row exists, mirroring
  the production pattern where the admin UI or a signal writes audit entries.
"""
from __future__ import annotations

import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.analytics.models import AuditLog
from apps.analytics.services import log_event
from apps.bookings.models import (
    Booking,
    BookingEvent,
    BookingEventType,
    BookingStatus,
    Yacht,
    YachtStatus,
)
from apps.bookings.services import BookingService
from apps.core.models import DeparturePort, Region
from apps.payments.models import Payment, PaymentProviderChoices, PaymentStatus


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _future(days: int) -> datetime.date:
    return datetime.date.today() + datetime.timedelta(days=days)


def _make_user(
    email: str,
    role: str,
    region: Region,
    *,
    is_staff: bool = False,
) -> User:
    return User.objects.create_user(
        email=email,
        password="SecurePass99!",
        first_name="Test",
        last_name="User",
        role=role,
        region=region,
        is_staff=is_staff,
    )


def _make_active_yacht(owner: User, region: Region, port: DeparturePort) -> Yacht:
    return Yacht.objects.create(
        owner=owner,
        region=region,
        departure_port=port,
        name="Workflow Test Yacht",
        name_ar="يخت اختبار",
        description="Used in workflow tests.",
        description_ar="يُستخدم في اختبارات سير العمل.",
        capacity=10,
        price_per_day="1000.00",
        currency=region.currency,
        yacht_type="motorboat",
        status=YachtStatus.ACTIVE,
    )


def _booking_payload(yacht: Yacht, port: DeparturePort, *, days_ahead: int = 14) -> dict:
    return {
        "yacht_id": str(yacht.id),
        "start_date": _future(days_ahead).isoformat(),
        "end_date": _future(days_ahead + 3).isoformat(),
        "num_passengers": 3,
        "departure_port_id": str(port.id),
    }


# ---------------------------------------------------------------------------
# Shared fixtures for this module
# ---------------------------------------------------------------------------


@pytest.fixture
def wf_region(db) -> Region:
    region, _ = Region.objects.get_or_create(
        code="EG-WF",
        defaults={
            "name_ar": "مصر - سير عمل",
            "name_en": "Egypt - Workflow",
            "currency": "EGP",
            "timezone": "Africa/Cairo",
            "is_active": True,
        },
    )
    return region


@pytest.fixture
def wf_port(db, wf_region: Region) -> DeparturePort:
    port, _ = DeparturePort.objects.get_or_create(
        name_en="Workflow Marina",
        defaults={
            "name_ar": "مرسى سير العمل",
            "region": wf_region,
            "city_en": "Alexandria",
            "city_ar": "الإسكندرية",
            "latitude": "31.200000",
            "longitude": "29.918700",
            "is_active": True,
        },
    )
    return port


@pytest.fixture
def wf_owner(db, wf_region: Region) -> User:
    return _make_user("wf_owner@test.com", UserRole.OWNER, wf_region)


@pytest.fixture
def wf_customer(db, wf_region: Region) -> User:
    return _make_user("wf_customer@test.com", UserRole.CUSTOMER, wf_region)


@pytest.fixture
def wf_admin(db, wf_region: Region) -> User:
    return _make_user("wf_admin@test.com", UserRole.ADMIN, wf_region, is_staff=True)


@pytest.fixture
def wf_yacht(db, wf_owner: User, wf_region: Region, wf_port: DeparturePort) -> Yacht:
    return _make_active_yacht(wf_owner, wf_region, wf_port)


@pytest.fixture
def wf_client() -> APIClient:
    return APIClient()


# ---------------------------------------------------------------------------
# TestBookingHappyPath
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBookingHappyPath:
    """Full booking lifecycle: customer books → owner confirms → payment captured
    → system completes → AuditLog written → earnings endpoint accessible.
    """

    def test_customer_books_owner_confirms_payment_completes(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_owner: User,
        wf_admin: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        # --- Step 1: Customer creates a booking ---
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=30),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED, create_resp.data
        booking_data = create_resp.data
        booking_id = booking_data["id"]

        # --- Step 2: Assert initial status is pending_owner ---
        assert booking_data["status"] == BookingStatus.PENDING_OWNER

        # --- Step 3: Assert BookingEvent 'created' was written ---
        assert "events" in booking_data
        assert len(booking_data["events"]) == 1
        assert booking_data["events"][0]["event_type"] == BookingEventType.CREATED

        created_event_db = BookingEvent.objects.filter(
            booking_id=booking_id, event_type=BookingEventType.CREATED
        )
        assert created_event_db.exists(), "BookingEvent(created) must exist in DB"

        # --- Step 4: Owner confirms the booking ---
        wf_client.force_authenticate(wf_owner)
        confirm_resp = wf_client.patch(f"/api/v1/bookings/{booking_id}/confirm/")
        assert confirm_resp.status_code == status.HTTP_200_OK, confirm_resp.data

        # --- Step 5: Assert booking status is now confirmed ---
        confirmed_data = confirm_resp.data
        assert confirmed_data["status"] == BookingStatus.CONFIRMED

        # --- Step 6: Assert BookingEvent 'confirmed' was written ---
        confirmed_event = BookingEvent.objects.filter(
            booking_id=booking_id, event_type=BookingEventType.CONFIRMED
        )
        assert confirmed_event.exists(), "BookingEvent(confirmed) must exist in DB"

        # --- Step 7: Simulate payment capture (directly creating a Payment row) ---
        booking_obj = Booking.objects.get(id=booking_id)
        payment = Payment.objects.create(
            booking=booking_obj,
            provider=PaymentProviderChoices.FAWRY,
            provider_ref="FAW-WF-001",
            amount=booking_obj.total_amount,
            currency=booking_obj.currency,
            status=PaymentStatus.CAPTURED,
        )
        payment.refresh_from_db()
        assert payment.status == PaymentStatus.CAPTURED

        # --- Step 8: System completes the booking via BookingService ---
        # (No /complete/ HTTP endpoint exists — the service is called directly
        # as it would be from the Celery beat task post-trip.)
        completed_booking = BookingService.complete(booking_obj, actor=wf_admin)
        assert completed_booking.status == BookingStatus.COMPLETED

        # Confirm DB reflects the completion
        booking_obj.refresh_from_db()
        assert booking_obj.status == BookingStatus.COMPLETED

        # --- Step 9: Assert BookingEvent 'completed' was written ---
        completed_event = BookingEvent.objects.filter(
            booking_id=booking_id, event_type=BookingEventType.COMPLETED
        )
        assert completed_event.exists(), "BookingEvent(completed) must exist in DB"

        # --- Step 10: Write an AuditLog entry (as would happen in production) ---
        audit = log_event(
            event_type=AuditLog.EventType.BOOKING_COMPLETED,
            actor=wf_admin,
            reference_id=booking_obj.id,
            reference_type="booking",
            amount=booking_obj.total_amount,
            currency=booking_obj.currency,
            metadata={"yacht_id": str(wf_yacht.id)},
        )
        assert audit is not None, "log_event must return an AuditLog instance"

        # --- Step 11: Assert AuditLog entry exists in DB ---
        audit_exists = AuditLog.objects.filter(
            reference_id=booking_obj.id,
            reference_type="booking",
            event_type=AuditLog.EventType.BOOKING_COMPLETED,
        ).exists()
        assert audit_exists, "AuditLog entry for BOOKING_COMPLETED must exist in DB"

        # --- Step 12: OwnerEarningsSummary endpoint returns 200 for the owner ---
        wf_client.force_authenticate(wf_owner)
        earnings_resp = wf_client.get("/api/v1/analytics/earnings/")
        assert earnings_resp.status_code == status.HTTP_200_OK, earnings_resp.data

    def test_booking_total_amount_is_price_per_day_times_days(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        """3 days × 1000.00 EGP/day = 3000.00 EGP."""
        wf_client.force_authenticate(wf_customer)
        resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=60),
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED, resp.data
        assert resp.data["total_amount"] == "3000.00"
        assert resp.data["currency"] == "EGP"

    def test_booking_currency_matches_yacht_region(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        """Currency on the booking must match the yacht's region currency (ADR-018)."""
        wf_client.force_authenticate(wf_customer)
        resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=90),
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED, resp.data
        booking = Booking.objects.get(id=resp.data["id"])
        assert booking.currency == wf_yacht.currency


# ---------------------------------------------------------------------------
# TestBookingDeclinePath
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBookingDeclinePath:
    """Owner declines the booking with a reason."""

    def test_owner_declines_with_reason_stored_in_db(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_owner: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        # Customer creates a booking
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=20),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        booking_id = create_resp.data["id"]

        # Owner declines with a reason
        wf_client.force_authenticate(wf_owner)
        decline_resp = wf_client.patch(
            f"/api/v1/bookings/{booking_id}/decline/",
            data={"reason": "Boat unavailable"},
            format="json",
        )
        assert decline_resp.status_code == status.HTTP_200_OK, decline_resp.data

        # Assert status is declined
        assert decline_resp.data["status"] == BookingStatus.DECLINED

        # Assert decline reason is returned in the response
        assert decline_resp.data["decline_reason"] == "Boat unavailable"

        # Assert status and reason are persisted in the DB
        booking_db = Booking.objects.get(id=booking_id)
        assert booking_db.status == BookingStatus.DECLINED
        assert booking_db.decline_reason == "Boat unavailable"

        # Assert BookingEvent(declined) was written with reason in notes
        declined_event = BookingEvent.objects.filter(
            booking_id=booking_id, event_type=BookingEventType.DECLINED
        ).first()
        assert declined_event is not None, "BookingEvent(declined) must exist in DB"
        assert declined_event.notes == "Boat unavailable"

    def test_owner_declines_without_reason_succeeds(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_owner: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=50),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        booking_id = create_resp.data["id"]

        wf_client.force_authenticate(wf_owner)
        decline_resp = wf_client.patch(
            f"/api/v1/bookings/{booking_id}/decline/",
            format="json",
        )
        assert decline_resp.status_code == status.HTTP_200_OK
        assert decline_resp.data["status"] == BookingStatus.DECLINED
        assert decline_resp.data["decline_reason"] == ""

    def test_declined_booking_cannot_be_confirmed(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_owner: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        """State conflict: once declined, confirming must return 409."""
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=55),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        booking_id = create_resp.data["id"]

        wf_client.force_authenticate(wf_owner)
        # Decline first
        wf_client.patch(
            f"/api/v1/bookings/{booking_id}/decline/",
            data={"reason": "No availability"},
            format="json",
        )
        # Now try to confirm — must be 409
        confirm_resp = wf_client.patch(f"/api/v1/bookings/{booking_id}/confirm/")
        assert confirm_resp.status_code == status.HTTP_409_CONFLICT
        assert confirm_resp.data["error"]["code"] == "INVALID_TRANSITION"


# ---------------------------------------------------------------------------
# TestBookingCancellationPath
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBookingCancellationPath:
    """Customer cancels a booking at various lifecycle stages."""

    def test_customer_cancels_confirmed_booking(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_owner: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        # Customer creates booking
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=40),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        booking_id = create_resp.data["id"]

        # Owner confirms
        wf_client.force_authenticate(wf_owner)
        confirm_resp = wf_client.patch(f"/api/v1/bookings/{booking_id}/confirm/")
        assert confirm_resp.status_code == status.HTTP_200_OK
        assert confirm_resp.data["status"] == BookingStatus.CONFIRMED

        # Customer cancels
        wf_client.force_authenticate(wf_customer)
        cancel_resp = wf_client.patch(f"/api/v1/bookings/{booking_id}/cancel/")
        assert cancel_resp.status_code == status.HTTP_200_OK, cancel_resp.data
        assert cancel_resp.data["status"] == BookingStatus.CANCELLED

        # Assert DB state
        booking_db = Booking.objects.get(id=booking_id)
        assert booking_db.status == BookingStatus.CANCELLED

        # Assert BookingEvent(cancelled) was written
        cancel_event = BookingEvent.objects.filter(
            booking_id=booking_id, event_type=BookingEventType.CANCELLED
        )
        assert cancel_event.exists(), "BookingEvent(cancelled) must exist in DB"

    def test_customer_cancels_pending_booking(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        """Customer can cancel before the owner has acted."""
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=45),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        booking_id = create_resp.data["id"]

        cancel_resp = wf_client.patch(f"/api/v1/bookings/{booking_id}/cancel/")
        assert cancel_resp.status_code == status.HTTP_200_OK
        assert cancel_resp.data["status"] == BookingStatus.CANCELLED

    def test_cancelled_booking_cannot_be_cancelled_again(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        """State conflict: double-cancel must return 409."""
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=70),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        booking_id = create_resp.data["id"]

        # First cancel — OK
        wf_client.patch(f"/api/v1/bookings/{booking_id}/cancel/")

        # Second cancel — conflict
        cancel_resp = wf_client.patch(f"/api/v1/bookings/{booking_id}/cancel/")
        assert cancel_resp.status_code == status.HTTP_409_CONFLICT
        assert cancel_resp.data["error"]["code"] == "INVALID_TRANSITION"


# ---------------------------------------------------------------------------
# TestBookingPermissions
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBookingPermissions:
    """Auth and role guard tests for the booking endpoints."""

    def test_anonymous_cannot_create_booking(
        self,
        wf_client: APIClient,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port),
            format="json",
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_anonymous_cannot_list_bookings(self, wf_client: APIClient) -> None:
        resp = wf_client.get("/api/v1/bookings/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_wrong_owner_cannot_confirm_returns_404(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_owner: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
        wf_region: Region,
    ) -> None:
        """Customer B (wrong owner) trying to confirm returns 404 — the queryset
        filters on yacht__owner=request.user, so the booking is invisible."""
        # Customer creates the booking
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=80),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        booking_id = create_resp.data["id"]

        # A different user who is NOT the yacht owner tries to confirm
        other_owner = _make_user(
            "other_owner_perm@test.com", UserRole.OWNER, wf_region
        )
        wf_client.force_authenticate(other_owner)
        confirm_resp = wf_client.patch(f"/api/v1/bookings/{booking_id}/confirm/")
        assert confirm_resp.status_code == status.HTTP_404_NOT_FOUND

    def test_customer_cannot_confirm_booking(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        """The booking customer is not the yacht owner — confirm returns 404."""
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=85),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        booking_id = create_resp.data["id"]

        confirm_resp = wf_client.patch(f"/api/v1/bookings/{booking_id}/confirm/")
        assert confirm_resp.status_code == status.HTTP_404_NOT_FOUND

    def test_owner_cannot_cancel_customer_booking(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_owner: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        """Cancel endpoint filters on customer=request.user — owner gets 404."""
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=95),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        booking_id = create_resp.data["id"]

        wf_client.force_authenticate(wf_owner)
        cancel_resp = wf_client.patch(f"/api/v1/bookings/{booking_id}/cancel/")
        assert cancel_resp.status_code == status.HTTP_404_NOT_FOUND

    def test_anonymous_cannot_decline_booking(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        """Unauthenticated decline must return 401."""
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=100),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        booking_id = create_resp.data["id"]

        wf_client.force_authenticate(None)
        decline_resp = wf_client.patch(
            f"/api/v1/bookings/{booking_id}/decline/",
            data={"reason": "Hack attempt"},
            format="json",
        )
        assert decline_resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_customer_cannot_view_another_customers_booking(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
        wf_region: Region,
    ) -> None:
        """The detail queryset scopes by customer=request.user — cross-customer
        access returns 404, not 403 (resource existence hidden)."""
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=105),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        booking_id = create_resp.data["id"]

        other_customer = _make_user(
            "other_customer_perm@test.com", UserRole.CUSTOMER, wf_region
        )
        wf_client.force_authenticate(other_customer)
        detail_resp = wf_client.get(f"/api/v1/bookings/{booking_id}/")
        assert detail_resp.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# TestBookingEventAuditTrail
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBookingEventAuditTrail:
    """Verify the BookingEvent append-only log is correct throughout the lifecycle."""

    def test_event_count_accumulates_across_transitions(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_owner: User,
        wf_admin: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        """create (1) → confirm (2) → complete (3) — events accumulate, never overwrite."""
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=110),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        booking_id = create_resp.data["id"]

        assert BookingEvent.objects.filter(booking_id=booking_id).count() == 1

        wf_client.force_authenticate(wf_owner)
        wf_client.patch(f"/api/v1/bookings/{booking_id}/confirm/")
        assert BookingEvent.objects.filter(booking_id=booking_id).count() == 2

        booking_obj = Booking.objects.get(id=booking_id)
        BookingService.complete(booking_obj, actor=wf_admin)
        assert BookingEvent.objects.filter(booking_id=booking_id).count() == 3

    def test_event_actors_are_recorded_correctly(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_owner: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        """Each event must record the correct actor for the audit trail."""
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=120),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        booking_id = create_resp.data["id"]

        wf_client.force_authenticate(wf_owner)
        wf_client.patch(f"/api/v1/bookings/{booking_id}/confirm/")

        create_event = BookingEvent.objects.get(
            booking_id=booking_id, event_type=BookingEventType.CREATED
        )
        confirm_event = BookingEvent.objects.get(
            booking_id=booking_id, event_type=BookingEventType.CONFIRMED
        )

        assert create_event.actor_id == wf_customer.id
        assert confirm_event.actor_id == wf_owner.id

    def test_created_event_metadata_has_amount_and_currency(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        """The 'created' event metadata must carry total_amount and currency
        as a snapshot at booking time (ADR-012 and ADR-018)."""
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=130),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        booking_id = create_resp.data["id"]

        event = BookingEvent.objects.get(
            booking_id=booking_id, event_type=BookingEventType.CREATED
        )
        assert "total_amount" in event.metadata
        assert "currency" in event.metadata
        assert event.metadata["currency"] == "EGP"


# ---------------------------------------------------------------------------
# TestBookingValidation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBookingValidation:
    """Validation error scenarios for the booking create endpoint."""

    def test_end_date_before_start_returns_400(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        wf_client.force_authenticate(wf_customer)
        payload = _booking_payload(wf_yacht, wf_port, days_ahead=140)
        payload["end_date"] = payload["start_date"]  # equal — not strictly after
        resp = wf_client.post("/api/v1/bookings/", data=payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_passenger_count_exceeds_capacity_returns_400(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        wf_client.force_authenticate(wf_customer)
        payload = _booking_payload(wf_yacht, wf_port, days_ahead=150)
        payload["num_passengers"] = wf_yacht.capacity + 99
        resp = wf_client.post("/api/v1/bookings/", data=payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert resp.data["error"]["field"] == "num_passengers"

    def test_booking_against_inactive_yacht_returns_404(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_owner: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        """Only active yachts are bookable."""
        wf_yacht.status = YachtStatus.INACTIVE
        wf_yacht.save(update_fields=["status"])

        wf_client.force_authenticate(wf_customer)
        resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=155),
            format="json",
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_booking_missing_required_fields_returns_400(
        self,
        wf_client: APIClient,
        wf_customer: User,
    ) -> None:
        wf_client.force_authenticate(wf_customer)
        resp = wf_client.post("/api/v1/bookings/", data={}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# TestBookingOwnerView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBookingOwnerView:
    """Owner sees their yacht's bookings; customer sees only their own."""

    def test_owner_sees_bookings_for_their_yacht(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_owner: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
    ) -> None:
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=160),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED

        wf_client.force_authenticate(wf_owner)
        list_resp = wf_client.get("/api/v1/bookings/")
        assert list_resp.status_code == status.HTTP_200_OK
        booking_ids = [b["id"] for b in list_resp.data["results"]]
        assert create_resp.data["id"] in booking_ids

    def test_customer_does_not_see_other_customers_bookings(
        self,
        wf_client: APIClient,
        wf_customer: User,
        wf_yacht: Yacht,
        wf_port: DeparturePort,
        wf_region: Region,
    ) -> None:
        wf_client.force_authenticate(wf_customer)
        create_resp = wf_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(wf_yacht, wf_port, days_ahead=165),
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED

        other = _make_user("other_list_test@test.com", UserRole.CUSTOMER, wf_region)
        wf_client.force_authenticate(other)
        list_resp = wf_client.get("/api/v1/bookings/")
        assert list_resp.status_code == status.HTTP_200_OK
        # Other customer's list must be empty
        assert list_resp.data["results"] == []
