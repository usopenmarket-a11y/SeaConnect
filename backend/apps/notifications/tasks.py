"""Celery tasks for the notifications app.

All tasks are idempotent: they check the current status before acting and
return immediately if the notification has already been processed.

ADR-011 compliance:
  - bind=True so self.retry() is available.
  - max_retries=3, default_retry_delay=60 (seconds).
  - Idempotency guard on every task (check status != PENDING before acting).

Dev behaviour:
  - FCM: payload is logged at INFO level; no real HTTP call is made.
  - Email: routed to Mailpit via Django's SMTP backend (EMAIL_HOST=mailpit).
"""
import logging

from celery import shared_task
from django.utils import timezone

from apps.notifications.models import Notification, NotificationStatus

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_push_notification(self, notification_id: str) -> None:
    """Send an FCM push notification for the given Notification row.

    Idempotency guard: exits immediately if status is not PENDING.

    In development, the FCM payload is logged at INFO level.  The real FCM
    HTTP v1 API call is deferred to Sprint 9 (marked with TODO below).

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

    try:
        # Dev: log the payload. No real HTTP call in this sprint.
        # TODO Sprint 9: replace with real FCM call:
        #   import firebase_admin
        #   from firebase_admin import messaging
        #   msg = messaging.Message(
        #       token=payload["token"],
        #       notification=messaging.Notification(**payload["notification"]),
        #       data=payload["data"],
        #   )
        #   messaging.send(msg)
        logger.info("FCM push payload (dev): %s", payload)

        notif.status = NotificationStatus.SENT
        notif.sent_at = timezone.now()
        notif.save(update_fields=["status", "sent_at", "updated_at"])

    except Exception as exc:
        logger.error(
            "send_push_notification: delivery failed for %s — %s",
            notification_id,
            exc,
        )
        notif.status = NotificationStatus.FAILED
        notif.failure_reason = str(exc)
        notif.save(update_fields=["status", "failure_reason", "updated_at"])
        raise self.retry(exc=exc)


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
