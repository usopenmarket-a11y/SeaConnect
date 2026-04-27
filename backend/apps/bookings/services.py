"""BookingService — authoritative state machine for Booking transitions.

ADR-012 — All state changes are wrapped in ``transaction.atomic()`` and ALWAYS
insert a ``BookingEvent`` row in the same transaction. Never call
``booking.save()`` directly from a view; always go through this service.

The Celery side-effect (notification email) is dispatched via
``transaction.on_commit()`` so it never fires before the database commits the
status change. If the transaction rolls back, the notification is not sent.
"""
from __future__ import annotations

import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from django.db import transaction

from .models import (
    Availability,
    AvailabilityStatus,
    Booking,
    BookingEvent,
    BookingEventType,
    BookingStatus,
)

if TYPE_CHECKING:
    from apps.accounts.models import User
    from apps.core.models import DeparturePort

    from .models import Yacht


class BookingTransitionError(Exception):
    """Raised when a state transition is not permitted in the current status."""


class BookingService:
    """All booking-state mutations live here.

    Static methods only — there is no instance state.  Each method that
    changes status is wrapped in ``transaction.atomic()`` and writes the
    matching ``BookingEvent`` before returning.
    """

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def create_booking(
        *,
        yacht: "Yacht",
        customer: "User",
        start_date: "datetime.date",
        end_date: "datetime.date",
        num_passengers: int,
        departure_port: "DeparturePort",
    ) -> Booking:
        """Create a new booking in ``pending_owner`` status.

        Total amount is the yacht's daily price multiplied by the number of
        days in the requested range. ``end_date`` is treated as exclusive,
        matching the BookingCreateSerializer validator (``end > start``).

        After the surrounding transaction commits the caller may dispatch a
        notification task — that side-effect should be wired via
        ``transaction.on_commit()`` to avoid firing before the DB write.
        """
        # Lock the yacht row to prevent concurrent bookings on the same dates.
        yacht_locked = (
            type(yacht).objects.select_for_update().get(id=yacht.id)
        )
        blocked_dates = Availability.objects.filter(
            yacht=yacht_locked,
            date__gte=start_date,
            date__lt=end_date,
            status__in=[AvailabilityStatus.BLOCKED, AvailabilityStatus.BOOKED],
        )
        if blocked_dates.exists():
            raise BookingTransitionError(
                "One or more requested dates are unavailable for this yacht.",
            )

        days = max((end_date - start_date).days, 1)
        total_amount: Decimal = (yacht_locked.price_per_day or Decimal("0")) * days

        booking = Booking.objects.create(
            yacht=yacht_locked,
            customer=customer,
            region=yacht_locked.region,
            departure_port=departure_port,
            start_date=start_date,
            end_date=end_date,
            num_passengers=num_passengers,
            total_amount=total_amount,
            currency=yacht_locked.currency,
            status=BookingStatus.PENDING_OWNER,
        )

        # Mark each calendar day as booked (upsert so existing open rows are updated).
        current = start_date
        while current < end_date:
            Availability.objects.update_or_create(
                yacht=yacht_locked,
                date=current,
                defaults={"status": AvailabilityStatus.BOOKED},
            )
            current += datetime.timedelta(days=1)

        BookingEvent.objects.create(
            booking=booking,
            event_type=BookingEventType.CREATED,
            actor=customer,
            metadata={
                "total_amount": str(total_amount),
                "currency": yacht_locked.currency,
                "num_days": days,
            },
        )

        # Notify the yacht owner — dispatched only after commit.
        # Imported lazily to avoid circular imports at module load time.
        def _dispatch() -> None:
            from .tasks import send_booking_request_notification

            send_booking_request_notification.delay(str(booking.id))

        transaction.on_commit(_dispatch)
        return booking

    # ------------------------------------------------------------------
    # Owner actions
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def confirm(booking: Booking, *, actor: "User") -> Booking:
        if booking.status != BookingStatus.PENDING_OWNER:
            raise BookingTransitionError(
                f"Cannot confirm a booking in '{booking.status}' status.",
            )
        booking.status = BookingStatus.CONFIRMED
        booking.save(update_fields=["status", "updated_at"])
        BookingEvent.objects.create(
            booking=booking,
            event_type=BookingEventType.CONFIRMED,
            actor=actor,
        )
        return booking

    @staticmethod
    @transaction.atomic
    def decline(booking: Booking, *, actor: "User", reason: str = "") -> Booking:
        if booking.status != BookingStatus.PENDING_OWNER:
            raise BookingTransitionError(
                f"Cannot decline a booking in '{booking.status}' status.",
            )
        booking.status = BookingStatus.DECLINED
        booking.decline_reason = reason
        booking.save(update_fields=["status", "decline_reason", "updated_at"])
        BookingEvent.objects.create(
            booking=booking,
            event_type=BookingEventType.DECLINED,
            actor=actor,
            notes=reason,
        )
        return booking

    # ------------------------------------------------------------------
    # Customer actions
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def cancel(booking: Booking, *, actor: "User") -> Booking:
        if booking.status not in (BookingStatus.PENDING_OWNER, BookingStatus.CONFIRMED):
            raise BookingTransitionError(
                f"Cannot cancel a booking in '{booking.status}' status.",
            )
        booking.status = BookingStatus.CANCELLED
        booking.save(update_fields=["status", "updated_at"])
        BookingEvent.objects.create(
            booking=booking,
            event_type=BookingEventType.CANCELLED,
            actor=actor,
        )
        return booking

    # ------------------------------------------------------------------
    # System actions
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def complete(booking: Booking, *, actor: "User | None" = None) -> Booking:
        """Mark a confirmed booking as completed (system-driven, post-trip)."""
        if booking.status != BookingStatus.CONFIRMED:
            raise BookingTransitionError(
                f"Cannot complete a booking in '{booking.status}' status.",
            )
        booking.status = BookingStatus.COMPLETED
        booking.save(update_fields=["status", "updated_at"])
        BookingEvent.objects.create(
            booking=booking,
            event_type=BookingEventType.COMPLETED,
            actor=actor,
        )
        return booking
