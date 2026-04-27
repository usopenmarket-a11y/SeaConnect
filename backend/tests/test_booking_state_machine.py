"""Tests for the BookingService state machine (ADR-012).

All tests use real DB writes (no mocks) and exercise the BookingService
contract directly — no HTTP layer involved here.

Coverage:
  - Valid transitions (create / confirm / decline / cancel / complete)
  - Each transition writes exactly one BookingEvent in the same transaction
  - Invalid transitions raise BookingTransitionError and do not mutate state
  - Atomicity: if BookingEvent.create raises, the status change rolls back
"""
from __future__ import annotations

import datetime
from unittest.mock import patch

import pytest

from apps.bookings.models import (
    Booking,
    BookingEvent,
    BookingEventType,
    BookingStatus,
)
from apps.bookings.services import BookingService, BookingTransitionError


# ---------------------------------------------------------------------------
# Helper — create a pending_owner booking via the service
# ---------------------------------------------------------------------------


def _create_pending(yacht, customer, departure_port) -> Booking:
    """Build a pending_owner booking using BookingService — the only path."""
    return BookingService.create_booking(
        yacht=yacht,
        customer=customer,
        start_date=datetime.date.today() + datetime.timedelta(days=7),
        end_date=datetime.date.today() + datetime.timedelta(days=10),
        num_passengers=4,
        departure_port=departure_port,
    )


# ---------------------------------------------------------------------------
# Valid transitions
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCreateBooking:

    def test_create_sets_pending_owner(self, active_yacht, customer_user, departure_port):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        assert booking.status == BookingStatus.PENDING_OWNER

    def test_create_inserts_one_created_event(self, active_yacht, customer_user, departure_port):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        events = list(booking.events.all())
        assert len(events) == 1
        assert events[0].event_type == BookingEventType.CREATED
        assert events[0].actor_id == customer_user.id

    def test_create_total_amount_matches_days_times_price(
        self, active_yacht, customer_user, departure_port,
    ):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        # 3 days × 1500.00 EGP/day = 4500.00
        assert str(booking.total_amount) == "4500.00"
        assert booking.currency == active_yacht.currency

    def test_create_carries_region_from_yacht(self, active_yacht, customer_user, departure_port):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        assert booking.region_id == active_yacht.region_id

    def test_create_metadata_contains_total_and_currency(
        self, active_yacht, customer_user, departure_port,
    ):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        event = booking.events.get(event_type=BookingEventType.CREATED)
        assert event.metadata.get("total_amount") == "4500.00"
        assert event.metadata.get("currency") == "EGP"


@pytest.mark.django_db
class TestConfirmBooking:

    def test_confirm_sets_confirmed(self, active_yacht, customer_user, owner_user, departure_port):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        BookingService.confirm(booking, actor=owner_user)
        booking.refresh_from_db()
        assert booking.status == BookingStatus.CONFIRMED

    def test_confirm_inserts_confirmed_event(
        self, active_yacht, customer_user, owner_user, departure_port,
    ):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        BookingService.confirm(booking, actor=owner_user)
        events = list(booking.events.order_by("created_at"))
        assert events[-1].event_type == BookingEventType.CONFIRMED
        assert events[-1].actor_id == owner_user.id


@pytest.mark.django_db
class TestDeclineBooking:

    def test_decline_sets_declined_with_reason(
        self, active_yacht, customer_user, owner_user, departure_port,
    ):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        BookingService.decline(booking, actor=owner_user, reason="Yacht in repair")
        booking.refresh_from_db()
        assert booking.status == BookingStatus.DECLINED
        assert booking.decline_reason == "Yacht in repair"

    def test_decline_inserts_declined_event_with_notes(
        self, active_yacht, customer_user, owner_user, departure_port,
    ):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        BookingService.decline(booking, actor=owner_user, reason="Yacht in repair")
        latest = booking.events.order_by("created_at").last()
        assert latest is not None
        assert latest.event_type == BookingEventType.DECLINED
        assert latest.notes == "Yacht in repair"


@pytest.mark.django_db
class TestCancelBooking:

    def test_cancel_pending_booking(self, active_yacht, customer_user, departure_port):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        BookingService.cancel(booking, actor=customer_user)
        booking.refresh_from_db()
        assert booking.status == BookingStatus.CANCELLED

    def test_cancel_confirmed_booking(
        self, active_yacht, customer_user, owner_user, departure_port,
    ):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        BookingService.confirm(booking, actor=owner_user)
        BookingService.cancel(booking, actor=customer_user)
        booking.refresh_from_db()
        assert booking.status == BookingStatus.CANCELLED

    def test_cancel_inserts_cancelled_event(self, active_yacht, customer_user, departure_port):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        BookingService.cancel(booking, actor=customer_user)
        latest = booking.events.order_by("created_at").last()
        assert latest is not None
        assert latest.event_type == BookingEventType.CANCELLED


@pytest.mark.django_db
class TestCompleteBooking:

    def test_complete_only_from_confirmed(
        self, active_yacht, customer_user, owner_user, departure_port,
    ):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        BookingService.confirm(booking, actor=owner_user)
        BookingService.complete(booking)
        booking.refresh_from_db()
        assert booking.status == BookingStatus.COMPLETED


# ---------------------------------------------------------------------------
# Invalid transitions
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestInvalidTransitions:

    def test_cannot_confirm_declined_booking(
        self, active_yacht, customer_user, owner_user, departure_port,
    ):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        BookingService.decline(booking, actor=owner_user)
        with pytest.raises(BookingTransitionError):
            BookingService.confirm(booking, actor=owner_user)

    def test_cannot_decline_confirmed_booking(
        self, active_yacht, customer_user, owner_user, departure_port,
    ):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        BookingService.confirm(booking, actor=owner_user)
        with pytest.raises(BookingTransitionError):
            BookingService.decline(booking, actor=owner_user, reason="too late")

    def test_cannot_cancel_completed_booking(
        self, active_yacht, customer_user, owner_user, departure_port,
    ):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        BookingService.confirm(booking, actor=owner_user)
        BookingService.complete(booking)
        with pytest.raises(BookingTransitionError):
            BookingService.cancel(booking, actor=customer_user)

    def test_cannot_complete_pending_booking(
        self, active_yacht, customer_user, departure_port,
    ):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        with pytest.raises(BookingTransitionError):
            BookingService.complete(booking)

    def test_invalid_transition_does_not_mutate_status(
        self, active_yacht, customer_user, owner_user, departure_port,
    ):
        booking = _create_pending(active_yacht, customer_user, departure_port)
        BookingService.decline(booking, actor=owner_user)
        booking.refresh_from_db()
        original_status = booking.status

        with pytest.raises(BookingTransitionError):
            BookingService.confirm(booking, actor=owner_user)

        booking.refresh_from_db()
        assert booking.status == original_status


# ---------------------------------------------------------------------------
# Atomicity guarantee — ADR-012
# ---------------------------------------------------------------------------


@pytest.mark.django_db(transaction=True)
class TestStateChangeAtomicity:

    def test_confirm_rolls_back_when_event_insert_fails(
        self, active_yacht, customer_user, owner_user, departure_port,
    ):
        """If BookingEvent.create raises, the status update must roll back.

        This proves the state machine and the audit log are written in the
        same transaction (ADR-012).
        """
        booking = _create_pending(active_yacht, customer_user, departure_port)
        original_status = booking.status

        # Make the second BookingEvent.create call (the CONFIRMED event) blow up.
        # The CREATED event was written in _create_pending so we patch *during*
        # the confirm() call only.
        original_create = BookingEvent.objects.create

        def _exploding_create(*args, **kwargs):
            if kwargs.get("event_type") == BookingEventType.CONFIRMED:
                raise RuntimeError("simulated DB write failure")
            return original_create(*args, **kwargs)

        with patch.object(
            BookingEvent.objects, "create", side_effect=_exploding_create,
        ):
            with pytest.raises(RuntimeError):
                BookingService.confirm(booking, actor=owner_user)

        booking.refresh_from_db()
        assert booking.status == original_status
        # No CONFIRMED event was committed
        assert not booking.events.filter(
            event_type=BookingEventType.CONFIRMED,
        ).exists()
