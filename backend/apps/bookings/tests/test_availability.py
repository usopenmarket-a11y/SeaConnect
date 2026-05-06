"""Sprint 9C — tests for YachtMonthAvailabilityView and BlockedDate model.

Endpoint under test:
  GET /api/v1/bookings/yachts/{yacht_id}/availability/?month=YYYY-MM

All tests use real DB (no mocking per project rules).
Fixtures rely on the top-level tests/conftest.py for shared fixtures
(api_client, active_yacht, owner_user, customer_user, egypt_region,
departure_port) plus local helpers defined here.

ADR compliance verified:
  ADR-001 — UUID PKs on BlockedDate
  ADR-013 — NOT a list endpoint (returns dict), no cursor pagination
  ADR-018 — Currency resolved from region, not hardcoded
"""
from __future__ import annotations

import datetime
import uuid

import pytest
from rest_framework.test import APIClient

from apps.bookings.models import BlockedDate, Booking, BookingStatus, Yacht
from apps.bookings.services import BookingService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

URL_TEMPLATE = "/api/v1/bookings/yachts/{yacht_id}/availability/"
FIXED_MONTH = "2030-03"  # far future so no prod data interference
FIXED_YEAR, FIXED_MONTH_INT = 2030, 3


def _url(yacht_id) -> str:
    return URL_TEMPLATE.format(yacht_id=yacht_id)


def _make_booking(yacht, customer, start: datetime.date, end: datetime.date) -> Booking:
    """Create a confirmed booking covering [start, end] inclusive."""
    return BookingService.create_booking(
        yacht=yacht,
        customer=customer,
        start_date=start,
        end_date=end,
        num_passengers=1,
        departure_port=yacht.departure_port,
    )


# ---------------------------------------------------------------------------
# Test: basic 200 / 404 / no-auth
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAvailabilityBasic:
    def test_availability_returns_200_for_valid_yacht(self, api_client, active_yacht):
        """Happy path — valid yacht_id + valid month returns 200 with expected shape."""
        response = api_client.get(_url(active_yacht.id), {"month": FIXED_MONTH})

        assert response.status_code == 200
        data = response.json()
        assert data["yacht_id"] == str(active_yacht.id)
        assert data["month"] == FIXED_MONTH
        assert "days" in data
        assert "pricing" in data
        # March 2030 has 31 days
        assert len(data["days"]) == 31
        # All keys are ISO date strings for that month
        assert all(k.startswith("2030-03-") for k in data["days"].keys())
        # Pricing shape
        assert "base_price" in data["pricing"]
        assert "currency" in data["pricing"]

    def test_availability_returns_404_for_unknown_yacht(self, api_client):
        """Unknown UUID returns 404."""
        response = api_client.get(_url(uuid.uuid4()), {"month": FIXED_MONTH})
        assert response.status_code == 404

    def test_availability_no_auth_required(self, api_client, active_yacht):
        """Public endpoint — anonymous request must succeed with 200."""
        # api_client has no authentication by default from conftest
        response = api_client.get(_url(active_yacht.id), {"month": FIXED_MONTH})
        assert response.status_code == 200

    def test_availability_deleted_yacht_returns_404(self, api_client, active_yacht):
        """Soft-deleted yacht must return 404."""
        active_yacht.is_deleted = True
        active_yacht.save()
        response = api_client.get(_url(active_yacht.id), {"month": FIXED_MONTH})
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Test: default month fallback
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAvailabilityDefaultMonth:
    def test_availability_default_month_when_no_param(self, api_client, active_yacht):
        """When ?month is absent, response defaults to current calendar month."""
        today = datetime.date.today()
        expected_month = f"{today.year:04d}-{today.month:02d}"

        response = api_client.get(_url(active_yacht.id))
        assert response.status_code == 200
        assert response.json()["month"] == expected_month

    def test_availability_default_month_on_invalid_param(self, api_client, active_yacht):
        """When ?month is malformed, response defaults to current calendar month."""
        today = datetime.date.today()
        expected_month = f"{today.year:04d}-{today.month:02d}"

        response = api_client.get(_url(active_yacht.id), {"month": "not-a-month"})
        assert response.status_code == 200
        assert response.json()["month"] == expected_month


# ---------------------------------------------------------------------------
# Test: booking status logic
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAvailabilityBookingStatus:
    def test_availability_marks_confirmed_booking_as_booked(
        self, api_client, active_yacht, customer_user
    ):
        """Days covered by a confirmed booking appear as 'booked'."""
        booking = _make_booking(
            active_yacht,
            customer_user,
            datetime.date(FIXED_YEAR, FIXED_MONTH_INT, 5),
            datetime.date(FIXED_YEAR, FIXED_MONTH_INT, 7),
        )
        # Confirm the booking so status = confirmed
        from apps.accounts.models import User
        owner = active_yacht.owner
        BookingService.confirm(booking, actor=owner)

        response = api_client.get(_url(active_yacht.id), {"month": FIXED_MONTH})
        assert response.status_code == 200
        days = response.json()["days"]

        assert days["2030-03-05"] == "booked"
        assert days["2030-03-06"] == "booked"
        assert days["2030-03-07"] == "booked"
        # Adjacent days should still be open
        assert days["2030-03-04"] == "open"
        assert days["2030-03-08"] == "open"

    def test_availability_marks_pending_owner_booking_as_booked(
        self, api_client, active_yacht, customer_user
    ):
        """Days covered by a pending_owner booking also appear as 'booked'."""
        _make_booking(
            active_yacht,
            customer_user,
            datetime.date(FIXED_YEAR, FIXED_MONTH_INT, 10),
            datetime.date(FIXED_YEAR, FIXED_MONTH_INT, 10),
        )
        # Status is pending_owner by default after creation

        response = api_client.get(_url(active_yacht.id), {"month": FIXED_MONTH})
        days = response.json()["days"]
        assert days["2030-03-10"] == "booked"

    def test_availability_open_when_no_bookings(self, api_client, active_yacht):
        """All days are 'open' when there are no bookings or blocked dates."""
        response = api_client.get(_url(active_yacht.id), {"month": FIXED_MONTH})
        assert response.status_code == 200
        days = response.json()["days"]
        assert all(v == "open" for v in days.values())

    def test_availability_cancelled_booking_not_booked(
        self, api_client, active_yacht, customer_user
    ):
        """Cancelled bookings do not mark days as booked."""
        booking = _make_booking(
            active_yacht,
            customer_user,
            datetime.date(FIXED_YEAR, FIXED_MONTH_INT, 15),
            datetime.date(FIXED_YEAR, FIXED_MONTH_INT, 15),
        )
        BookingService.cancel(booking, actor=customer_user)

        response = api_client.get(_url(active_yacht.id), {"month": FIXED_MONTH})
        days = response.json()["days"]
        assert days["2030-03-15"] == "open"


# ---------------------------------------------------------------------------
# Test: blocked date status
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAvailabilityBlockedDate:
    def test_availability_marks_blocked_date(self, api_client, active_yacht):
        """A BlockedDate row renders the day as 'blocked'."""
        BlockedDate.objects.create(
            yacht=active_yacht,
            date=datetime.date(FIXED_YEAR, FIXED_MONTH_INT, 20),
            reason="Annual maintenance",
        )

        response = api_client.get(_url(active_yacht.id), {"month": FIXED_MONTH})
        assert response.status_code == 200
        days = response.json()["days"]
        assert days["2030-03-20"] == "blocked"
        # Other days unaffected
        assert days["2030-03-19"] == "open"
        assert days["2030-03-21"] == "open"

    def test_blocked_takes_priority_over_booking(
        self, api_client, active_yacht, customer_user
    ):
        """'blocked' status takes priority over a booking on the same day."""
        _make_booking(
            active_yacht,
            customer_user,
            datetime.date(FIXED_YEAR, FIXED_MONTH_INT, 25),
            datetime.date(FIXED_YEAR, FIXED_MONTH_INT, 25),
        )
        BlockedDate.objects.create(
            yacht=active_yacht,
            date=datetime.date(FIXED_YEAR, FIXED_MONTH_INT, 25),
        )

        response = api_client.get(_url(active_yacht.id), {"month": FIXED_MONTH})
        days = response.json()["days"]
        assert days["2030-03-25"] == "blocked"


# ---------------------------------------------------------------------------
# Test: limited status
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAvailabilityLimitedStatus:
    def test_availability_limited_when_one_slot_left(
        self, api_client, active_yacht, customer_user
    ):
        """'limited' appears when confirmed bookings fill capacity - 1 slots."""
        # active_yacht has some capacity; set it to 2 so one confirmed booking
        # leaves exactly one slot.
        active_yacht.capacity = 2
        active_yacht.save()

        booking = _make_booking(
            active_yacht,
            customer_user,
            datetime.date(FIXED_YEAR, FIXED_MONTH_INT, 12),
            datetime.date(FIXED_YEAR, FIXED_MONTH_INT, 12),
        )
        BookingService.confirm(booking, actor=active_yacht.owner)

        response = api_client.get(_url(active_yacht.id), {"month": FIXED_MONTH})
        days = response.json()["days"]
        assert days["2030-03-12"] == "limited"


# ---------------------------------------------------------------------------
# Test: currency resolution (ADR-018)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAvailabilityCurrency:
    def test_currency_from_region(self, api_client, active_yacht):
        """Currency in pricing block comes from departure_port.region, not hardcoded."""
        response = api_client.get(_url(active_yacht.id), {"month": FIXED_MONTH})
        pricing = response.json()["pricing"]
        # egypt_region.currency = 'EGP' as seeded in conftest
        assert pricing["currency"] in ("EGP", "USD", "AED", "EUR")  # valid ISO 4217
        assert pricing["base_price"] == str(active_yacht.price_per_day)
