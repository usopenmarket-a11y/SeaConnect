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


# ---------------------------------------------------------------------------
# Sprint 13C — pgvector semantic search embedding generation (ADR-019)
# ---------------------------------------------------------------------------


def _get_embedding(text: str) -> list[float]:
    """Fetch a 768-dim text embedding from Ollama (dev) or OpenAI (UAT/prod).

    Uses OLLAMA_BASE_URL setting when present (Docker service ``ollama`` on
    port 11434 in dev). Falls back to OpenAI when OPENAI_API_KEY is configured.

    Raises ``httpx.HTTPError`` on transport failures so the calling Celery
    task can retry.
    """
    import httpx

    ollama_url: str = getattr(settings, "OLLAMA_BASE_URL", "http://ollama:11434")

    resp = httpx.post(
        f"{ollama_url}/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": text},
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()["embedding"]  # type: ignore[no-any-return]


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_yacht_embedding(self, yacht_id: str) -> None:
    """Generate and store a 768-dim embedding for a yacht listing (ADR-019).

    Idempotent — safe to re-run on existing yachts. Called via
    ``transaction.on_commit`` after every yacht create or update so the
    embedding always reflects the latest description text.

    Steps:
      1. Load the Yacht (early-exit if not found — stale task from deleted row).
      2. Concatenate Arabic + English name/description for maximum recall.
      3. Call Ollama (dev) / OpenAI (prod) via ``_get_embedding``.
      4. Persist with ``Yacht.objects.filter(...).update(...)`` — avoids
         triggering extra signals and is safe to retry.
    """
    # Local import avoids circular import at module load.
    from .models import Yacht

    try:
        yacht = Yacht.objects.get(id=yacht_id)
    except Yacht.DoesNotExist:
        logger.info("generate_yacht_embedding: yacht %s not found — skipping", yacht_id)
        return

    # Build the text corpus to embed (Arabic first per ADR-014).
    text = " ".join(
        filter(
            None,
            [
                yacht.name_ar,
                yacht.name,
                yacht.description_ar,
                yacht.description,
                yacht.get_yacht_type_display(),
            ],
        )
    )

    if not text.strip():
        logger.info("generate_yacht_embedding: yacht %s has no text — skipping", yacht_id)
        return

    try:
        embedding = _get_embedding(text)
    except Exception as exc:
        logger.warning(
            "generate_yacht_embedding: embedding failed for yacht %s: %s",
            yacht_id,
            exc,
        )
        raise self.retry(exc=exc) from exc

    # Use .update() to avoid triggering signals / touching updated_at unnecessarily.
    Yacht.objects.filter(id=yacht_id).update(embedding=embedding)
    logger.info("generate_yacht_embedding: stored embedding for yacht %s", yacht_id)


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
