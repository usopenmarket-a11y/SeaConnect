"""Celery tasks for the bookings app.

Idempotency contract: every task here re-reads the booking from the DB and
checks its current status before acting. Re-running on retry never duplicates
a side effect.
"""
from __future__ import annotations

import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_booking_request_notification(self, booking_id: str) -> None:
    """Notify the yacht owner that a new booking request has arrived.

    Idempotent: if the booking is no longer in ``pending_owner`` status (the
    owner already acted, or the customer cancelled, or a beat task expired
    it), the task exits without sending mail.
    """
    # Local imports — avoid circular import at module load.
    from apps.bookings.models import Booking, BookingStatus

    try:
        booking = Booking.objects.select_related(
            "yacht__owner", "customer",
        ).get(id=booking_id)
    except Booking.DoesNotExist:
        logger.info("send_booking_request_notification: booking %s not found", booking_id)
        return

    if booking.status != BookingStatus.PENDING_OWNER:
        logger.info(
            "send_booking_request_notification: booking %s in status %s — skipping",
            booking_id,
            booking.status,
        )
        return

    owner = booking.yacht.owner
    customer = booking.customer
    if not owner.email:
        logger.warning(
            "send_booking_request_notification: owner %s has no email", owner.id,
        )
        return

    customer_name = (
        f"{customer.first_name} {customer.last_name}".strip() or customer.email
    )

    try:
        send_mail(
            subject=f"New booking request — {booking.yacht.name}",
            message=(
                f"You have a new booking request from {customer_name}.\n\n"
                f"Dates: {booking.start_date} to {booking.end_date}\n"
                f"Passengers: {booking.num_passengers}\n"
                f"Total: {booking.total_amount} {booking.currency}\n\n"
                f"Log in to review and confirm or decline."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[owner.email],
            fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("send_booking_request_notification failed for %s", booking_id)
        raise self.retry(exc=exc) from exc


@shared_task
def auto_expire_pending_bookings() -> dict:
    """Beat task — auto-decline bookings the owner did not respond to in time.

    Runs every 15 minutes via Celery Beat. Idempotent: only touches bookings
    still in ``pending_owner`` status whose ``created_at`` is older than
    ``settings.BOOKING_OWNER_RESPONSE_HOURS``. After the first run a given
    booking is in ``declined`` and is no longer matched by the filter.
    """
    from apps.bookings.models import (
        Booking,
        BookingEvent,
        BookingEventType,
        BookingStatus,
    )

    cutoff = timezone.now() - timedelta(
        hours=settings.BOOKING_OWNER_RESPONSE_HOURS,
    )
    expired_qs = Booking.objects.filter(
        status=BookingStatus.PENDING_OWNER,
        created_at__lt=cutoff,
    ).values_list("id", flat=True).iterator(chunk_size=100)

    count = 0
    for booking_id in expired_qs:
        with transaction.atomic():
            # Re-read inside the transaction in case another worker grabbed it.
            booking = Booking.objects.select_for_update().get(id=booking_id)
            if booking.status != BookingStatus.PENDING_OWNER:
                continue
            booking.status = BookingStatus.DECLINED
            booking.decline_reason = "Auto-expired: owner did not respond in time."
            booking.save(
                update_fields=["status", "decline_reason", "updated_at"],
            )
            BookingEvent.objects.create(
                booking=booking,
                event_type=BookingEventType.DECLINED,
                actor=None,
                notes="System auto-expire — no owner response within the allowed window.",
            )
            count += 1
    if count:
        logger.info("auto_expire_pending_bookings: declined %s bookings", count)
    return {"expired": count}
