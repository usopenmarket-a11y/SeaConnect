"""Notification service layer.

Business rules:
- Checks NotificationPreference before dispatching (opt-out respected).
- Creates a Notification row first, then enqueues the Celery task.
- notify_booking_event() is the single entry point called by bookings.services
  after every state transition — it never imports Celery tasks directly to
  avoid circular imports at module load time (tasks import models, models
  import nothing from tasks).

Cross-app imports:
  This module imports from apps.bookings at function call time (inside the
  function body), not at module level, to avoid circular import errors.
  (CLAUDE.md: "Import directly between Django apps — use signals or service layer")
"""
import logging
import uuid as _uuid
from typing import Optional

from apps.notifications.models import (
    Notification,
    NotificationChannel,
    NotificationPreference,
    NotificationType,
)

logger = logging.getLogger(__name__)


def _is_channel_enabled(recipient, channel: str) -> bool:
    """Return False if the user has opted out of this channel.

    Uses get_or_create so missing preference rows are treated as fully opted-in.
    """
    prefs, _ = NotificationPreference.objects.get_or_create(user=recipient)

    if channel == NotificationChannel.PUSH:
        return prefs.push_enabled
    if channel == NotificationChannel.EMAIL:
        return prefs.email_enabled
    # IN_APP is always enabled — no opt-out for in-app feed
    return True


def send_notification(
    recipient,
    notification_type: str,
    channel: str,
    title_ar: str,
    title_en: str,
    body_ar: str,
    body_en: str,
    reference_id: Optional[_uuid.UUID] = None,
    reference_type: str = "",
) -> Optional[Notification]:
    """Create a Notification record and enqueue its delivery task.

    Returns the created Notification, or None if the user has opted out of
    the requested channel.

    Args:
        recipient: User instance (must have .fcm_token, .email, .preferred_lang).
        notification_type: One of NotificationType values.
        channel: One of NotificationChannel values.
        title_ar: Arabic title (primary per ADR-014).
        title_en: English title fallback.
        body_ar: Arabic body (primary per ADR-014).
        body_en: English body fallback.
        reference_id: UUID of the related domain object (optional).
        reference_type: String label for the related object type (optional).
    """
    if not _is_channel_enabled(recipient, channel):
        logger.debug(
            "Notification suppressed — user %s opted out of channel '%s'.",
            recipient.id,
            channel,
        )
        return None

    notif = Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        channel=channel,
        title_ar=title_ar,
        title_en=title_en,
        body_ar=body_ar,
        body_en=body_en,
        reference_id=reference_id,
        reference_type=reference_type,
    )

    # Import tasks here (not at module level) to prevent circular imports at
    # Python module load time: tasks.py imports models.py which would cause a
    # circular chain if models.py imported tasks.py.
    from apps.notifications.tasks import send_email_notification, send_push_notification

    if channel == NotificationChannel.PUSH:
        send_push_notification.delay(str(notif.id))
    elif channel == NotificationChannel.EMAIL:
        send_email_notification.delay(str(notif.id))
    # IN_APP: record is already stored; no async dispatch needed.

    return notif


def notify_booking_event(booking, event_type: str) -> None:
    """Dispatch the appropriate notifications after a booking state transition.

    Called by ``apps.bookings.services.BookingService`` immediately after every
    state change.  The booking and its related objects must already be saved
    before this function is invoked.

    Notification targets per event:
      CONFIRMED  → customer push
      DECLINED   → customer push
      CANCELLED  → owner push
      CREATED    → owner push (new booking request arrived)
      PAYMENT_RECEIVED → customer push
    """
    # Late import — avoids circular dependency between bookings and notifications
    from apps.bookings.models import BookingEventType

    customer = booking.customer
    owner = booking.yacht.owner

    # Yacht name helpers — name_ar is the primary display name per ADR-014
    yacht_name_ar = booking.yacht.name_ar
    yacht_name_en = booking.yacht.name

    TEMPLATES: dict = {
        BookingEventType.CREATED: {
            "owner": {
                "title_ar": "طلب حجز جديد!",
                "title_en": "New Booking Request!",
                "body_ar": (
                    f"وصل طلب حجز جديد على {yacht_name_ar}. "
                    "يُرجى المراجعة والرد خلال ساعتين."
                ),
                "body_en": (
                    f"A new booking request arrived for {yacht_name_en}. "
                    "Please review and respond within 2 hours."
                ),
            }
        },
        BookingEventType.CONFIRMED: {
            "customer": {
                "title_ar": "تم تأكيد حجزك!",
                "title_en": "Booking Confirmed!",
                "body_ar": f"تم تأكيد حجزك على {yacht_name_ar} بواسطة الربان.",
                "body_en": f"Your booking on {yacht_name_en} has been confirmed by the captain.",
            }
        },
        BookingEventType.DECLINED: {
            "customer": {
                "title_ar": "تم رفض طلب الحجز",
                "title_en": "Booking Declined",
                "body_ar": f"للأسف، رفض الربان طلب حجزك على {yacht_name_ar}.",
                "body_en": f"Your booking request for {yacht_name_en} was declined by the captain.",
            }
        },
        BookingEventType.CANCELLED: {
            "owner": {
                "title_ar": "تم إلغاء الحجز",
                "title_en": "Booking Cancelled",
                "body_ar": f"ألغى العميل حجز {yacht_name_ar}.",
                "body_en": f"A customer cancelled their booking on {yacht_name_en}.",
            }
        },
        BookingEventType.PAYMENT_RECEIVED: {
            "customer": {
                "title_ar": "تم استلام الدفع",
                "title_en": "Payment Received",
                "body_ar": f"تم استلام دفعتك لحجز {yacht_name_ar} بنجاح.",
                "body_en": f"Your payment for the booking on {yacht_name_en} was received successfully.",
            }
        },
    }

    template = TEMPLATES.get(event_type, {})
    if not template:
        logger.debug("notify_booking_event: no template for event_type='%s'.", event_type)
        return

    for role, content in template.items():
        recipient = customer if role == "customer" else owner
        if not recipient:
            logger.warning(
                "notify_booking_event: recipient for role='%s' is None on booking %s.",
                role,
                booking.id,
            )
            continue

        # Map booking event types to notification types for the Notification record
        _TYPE_MAP = {
            BookingEventType.CREATED: NotificationType.BOOKING_CREATED,
            BookingEventType.CONFIRMED: NotificationType.BOOKING_CONFIRMED,
            BookingEventType.DECLINED: NotificationType.BOOKING_DECLINED,
            BookingEventType.CANCELLED: NotificationType.BOOKING_CANCELLED,
            BookingEventType.PAYMENT_RECEIVED: NotificationType.PAYMENT_RECEIVED,
        }
        notif_type = _TYPE_MAP.get(event_type, event_type)

        send_notification(
            recipient=recipient,
            notification_type=notif_type,
            channel=NotificationChannel.PUSH,
            reference_id=booking.id,
            reference_type="booking",
            **content,
        )
