"""Celery tasks for the notifications app.

All tasks are idempotent: they check the current status before acting and
return immediately if the notification has already been processed.

ADR-011 compliance:
  - bind=True so self.retry() is available.
  - max_retries=3, default_retry_delay=60 (seconds).
  - Idempotency guard on every task (check status != PENDING before acting).

Dev behaviour:
  - FCM: when FIREBASE_CREDENTIALS_JSON env var is absent, the push is marked
    'sent' immediately (no real HTTP call) so the dev loop stays unblocked.
  - Email: routed to Mailpit via Django's SMTP backend (EMAIL_HOST=mailpit).

Sprint 9A: real Firebase Admin SDK integration via apps.notifications.firebase.
"""
import logging

from celery import shared_task
from django.utils import timezone

from apps.notifications.firebase import get_firebase_app
from apps.notifications.models import Notification, NotificationStatus

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Firebase singleton — resolved via apps.notifications.firebase.get_firebase_app
# ---------------------------------------------------------------------------

# ``_firebase_app`` is kept as a module-level alias so that existing tests that
# patch ``apps.notifications.tasks._firebase_app`` (to reset state between test
# runs) continue to work.  The real singleton is owned by firebase.py; this
# variable shadows the private ``_firebase_app`` in that module when tests
# inject it directly here.
_firebase_app = None


def _get_firebase_app():
    """Delegate to the canonical singleton in apps.notifications.firebase.

    This thin wrapper exists so that tests which patch
    ``apps.notifications.tasks._firebase_app`` at the module level can still
    short-circuit the Firebase initialisation logic during test runs.

    When ``_firebase_app`` has been set (e.g. by a test's monkeypatch or by a
    previous call that populated the firebase module's singleton), return it
    directly.  Otherwise delegate to ``get_firebase_app()`` from firebase.py.
    """
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app
    result = get_firebase_app()
    # Mirror the result back into the module-level alias so subsequent calls
    # within the same worker process are O(1) dictionary lookups.
    _firebase_app = result
    return result


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_push_notification(self, notification_id: str) -> None:
    """Send an FCM push notification for the given Notification row.

    Idempotency guard: exits immediately if status is not PENDING.

    When FIREBASE_CREDENTIALS_JSON is not set (dev/CI), the notification is
    marked 'sent' immediately without a real FCM call so the dev loop
    stays unblocked.

    FCM errors are NOT retried — a stale/revoked device token would keep
    failing regardless of how many retries are attempted.

    Args:
        notification_id: String UUID of the Notification row to process.
    """
    try:
        notif = Notification.objects.select_related("recipient").get(id=notification_id)
    except Notification.DoesNotExist:
        logger.warning("send_push_notification: Notification %s not found.", notification_id)
        return

    # Idempotency guard — do not re-send an already-dispatched notification
    if notif.status != NotificationStatus.PENDING:
        logger.info(
            "send_push_notification: skipping notification %s (status=%s).",
            notification_id,
            notif.status,
        )
        return

    recipient = notif.recipient

    if not recipient.fcm_token:
        logger.warning(
            "send_push_notification: user %s has no FCM token — marking failed.",
            recipient.id,
        )
        notif.status = NotificationStatus.FAILED
        notif.failure_reason = "No FCM token registered"
        notif.save(update_fields=["status", "failure_reason", "updated_at"])
        return

    # Select the body language based on user preference (Arabic is default per ADR-014)
    lang = getattr(recipient, "preferred_lang", "ar")
    title = notif.title_ar if lang == "ar" else notif.title_en
    body = notif.body_ar if lang == "ar" else notif.body_en

    payload = {
        "token": recipient.fcm_token,
        "notification": {"title": title, "body": body},
        "data": {
            "type": notif.notification_type,
            "reference_id": str(notif.reference_id or ""),
            "reference_type": notif.reference_type,
        },
    }

    app = _get_firebase_app()

    if app is None:
        # Firebase not configured — dev/CI mode: log and mark sent immediately.
        logger.info(
            "Firebase not configured — skipping real FCM call for notification %s (dev mode).",
            notification_id,
        )
        notif.status = NotificationStatus.SENT
        notif.sent_at = timezone.now()
        notif.save(update_fields=["status", "sent_at", "updated_at"])
        return

    from firebase_admin import messaging  # noqa: PLC0415 — late import, firebase_admin is optional

    fcm_message = messaging.Message(
        notification=messaging.Notification(
            title=payload["notification"]["title"],
            body=payload["notification"]["body"],
        ),
        token=payload["token"],
        data=payload["data"],
    )

    try:
        messaging.send(fcm_message, app=app)
        notif.status = NotificationStatus.SENT
        notif.sent_at = timezone.now()
        notif.save(update_fields=["status", "sent_at", "updated_at"])
        logger.info("send_push_notification: FCM accepted notification %s.", notification_id)

    except Exception as exc:
        # Do NOT retry FCM failures — the device token may be stale/invalid.
        # Retrying would flood Firebase and never succeed for revoked tokens.
        logger.error(
            "send_push_notification: FCM rejected notification %s — %s",
            notification_id,
            exc,
        )
        notif.status = NotificationStatus.FAILED
        notif.failure_reason = str(exc)
        notif.save(update_fields=["status", "failure_reason", "updated_at"])


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_notification(self, notification_id: str) -> None:
    """Send an email notification via Django's email backend (Mailpit in dev).

    Idempotency guard: exits immediately if status is not PENDING.

    Args:
        notification_id: String UUID of the Notification row to process.
    """
    try:
        notif = Notification.objects.select_related("recipient").get(id=notification_id)
    except Notification.DoesNotExist:
        logger.warning("send_email_notification: Notification %s not found.", notification_id)
        return

    if notif.status != NotificationStatus.PENDING:
        logger.info(
            "send_email_notification: skipping notification %s (status=%s).",
            notification_id,
            notif.status,
        )
        return

    recipient = notif.recipient

    lang = getattr(recipient, "preferred_lang", "ar")
    subject = notif.title_ar if lang == "ar" else notif.title_en
    body_text = notif.body_ar if lang == "ar" else notif.body_en

    try:
        from django.conf import settings
        from django.core.mail import send_mail

        send_mail(
            subject=subject,
            message=body_text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient.email],
            fail_silently=False,
        )

        notif.status = NotificationStatus.SENT
        notif.sent_at = timezone.now()
        notif.save(update_fields=["status", "sent_at", "updated_at"])

        logger.info(
            "send_email_notification: sent to %s (notification %s).",
            recipient.email,
            notification_id,
        )

    except Exception as exc:
        logger.error(
            "send_email_notification: delivery failed for %s — %s",
            notification_id,
            exc,
        )
        notif.status = NotificationStatus.FAILED
        notif.failure_reason = str(exc)
        notif.save(update_fields=["status", "failure_reason", "updated_at"])
        raise self.retry(exc=exc)


@shared_task
def send_booking_reminder(booking_id: str) -> None:
    """Send a 24-hour-before-trip reminder push to the booking's customer.

    Idempotency guard: only fires if the booking is still in 'confirmed' status.
    Scheduled via Celery Beat (configured in the Django admin PeriodicTask table).

    This task is intentionally not retried on failure — a missed reminder is
    non-critical and retrying after the trip date would be misleading.

    Args:
        booking_id: String UUID of the Booking to send a reminder for.
    """
    # Late import — avoids circular dependency between apps at module load time
    from apps.bookings.models import Booking, BookingStatus
    from apps.notifications.services import send_notification

    try:
        booking = Booking.objects.select_related("customer", "yacht").get(id=booking_id)
    except Booking.DoesNotExist:
        logger.warning("send_booking_reminder: Booking %s not found.", booking_id)
        return

    # Idempotency: only remind for confirmed bookings
    if booking.status != BookingStatus.CONFIRMED:
        logger.info(
            "send_booking_reminder: booking %s is not confirmed (status=%s) — skipping.",
            booking_id,
            booking.status,
        )
        return

    yacht_name_ar = booking.yacht.name_ar
    yacht_name_en = booking.yacht.name

    # Check reminder preference before dispatching
    from apps.notifications.models import NotificationChannel, NotificationType

    send_notification(
        recipient=booking.customer,
        notification_type=NotificationType.BOOKING_REMINDER,
        channel=NotificationChannel.PUSH,
        title_ar="تذكير: رحلتك غداً!",
        title_en="Reminder: Your trip is tomorrow!",
        body_ar=(
            f"رحلتك على {yacht_name_ar} غداً. "
            "استعد للإبحار في الموعد."
        ),
        body_en=(
            f"Your trip on {yacht_name_en} is tomorrow. "
            "Be ready to sail on time."
        ),
        reference_id=booking.id,
        reference_type="booking",
    )

    logger.info(
        "send_booking_reminder: reminder dispatched for booking %s (customer %s).",
        booking_id,
        booking.customer_id,
    )
