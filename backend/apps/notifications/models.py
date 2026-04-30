"""Notifications app models.

ADR compliance:
  ADR-001 — UUID PKs, ORM only (no raw SQL)
  ADR-014 — Arabic strings stored first (title_ar, body_ar before title_en, body_en)
  ADR-013 — List endpoints use CursorPagination with ordering='-created_at'

Channels: push (FCM), email (SMTP/Brevo), in_app.
Bilingual content: Arabic is the primary language; English is the fallback.
"""
import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class NotificationChannel(models.TextChoices):
    PUSH = "push", "Push (FCM)"
    EMAIL = "email", "Email"
    IN_APP = "in_app", "In-App"


class NotificationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SENT = "sent", "Sent"
    FAILED = "failed", "Failed"
    READ = "read", "Read"  # in-app only


class NotificationType(models.TextChoices):
    BOOKING_CREATED = "booking_created", "Booking Created"
    BOOKING_CONFIRMED = "booking_confirmed", "Booking Confirmed"
    BOOKING_DECLINED = "booking_declined", "Booking Declined"
    BOOKING_CANCELLED = "booking_cancelled", "Booking Cancelled"
    BOOKING_REMINDER = "booking_reminder", "Booking Reminder"
    PAYMENT_RECEIVED = "payment_received", "Payment Received"
    PAYOUT_SENT = "payout_sent", "Payout Sent"
    COMPETITION_REMINDER = "competition_reminder", "Competition Reminder"


class Notification(TimeStampedModel):
    """A single notification dispatched to a user via one channel.

    Each row represents one delivery attempt on one channel.  If a user should
    receive both a push and an email for the same event, two rows are created.

    ``reference_id`` / ``reference_type`` link back to the originating domain
    object (e.g. a Booking UUID) without creating a hard FK dependency between
    apps (avoids circular import violations, see CLAUDE.md).

    Bilingual content follows ADR-014 — Arabic fields always appear first.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        help_text="User who will receive this notification.",
    )
    notification_type = models.CharField(
        max_length=40,
        choices=NotificationType.choices,
        db_index=True,
        help_text="Semantic type — used for deep-linking and preference filtering.",
    )
    channel = models.CharField(
        max_length=10,
        choices=NotificationChannel.choices,
        db_index=True,
        help_text="Delivery channel for this row.",
    )
    status = models.CharField(
        max_length=10,
        choices=NotificationStatus.choices,
        default=NotificationStatus.PENDING,
        db_index=True,
        help_text="Lifecycle state of this delivery attempt.",
    )

    # Bilingual content — Arabic first (ADR-014)
    title_ar = models.CharField(max_length=200, help_text="Notification title in Arabic (primary).")
    title_en = models.CharField(max_length=200, help_text="Notification title in English.")
    body_ar = models.TextField(help_text="Notification body in Arabic (primary).")
    body_en = models.TextField(help_text="Notification body in English.")

    # Soft link back to the triggering domain object (no hard FK across apps)
    reference_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="UUID of the related object, e.g. booking.id.",
    )
    reference_type = models.CharField(
        max_length=40,
        blank=True,
        help_text="Type name of the related object, e.g. 'booking'.",
    )

    # Delivery tracking
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="UTC timestamp when the message was accepted by the delivery provider.",
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="UTC timestamp when the user read this notification (in-app only).",
    )
    failure_reason = models.TextField(
        blank=True,
        help_text="Error detail if status=failed.",
    )

    class Meta:
        db_table = "notifications_notification"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "channel", "status"], name="idx_notif_recipient_ch_status"),
            models.Index(fields=["recipient", "notification_type"], name="idx_notif_recipient_type"),
            models.Index(fields=["reference_type", "reference_id"], name="idx_notif_reference"),
        ]
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self) -> str:
        return (
            f"{self.notification_type} → {self.recipient_id} "
            f"[{self.channel}] ({self.status})"
        )


class NotificationPreference(TimeStampedModel):
    """Per-user opt-in / opt-out settings for notification delivery.

    One row per user (OneToOne).  Missing rows are treated as fully opted-in
    (the service layer must call ``get_or_create`` before reading preferences).

    ``marketing`` defaults to False — explicit opt-in required (GDPR / PDPL).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
        help_text="The user these preferences belong to.",
    )
    push_enabled = models.BooleanField(
        default=True,
        help_text="Allow push notifications via FCM.",
    )
    email_enabled = models.BooleanField(
        default=True,
        help_text="Allow transactional email notifications.",
    )
    booking_reminders = models.BooleanField(
        default=True,
        help_text="Send 24-hour-before-trip reminder push.",
    )
    marketing = models.BooleanField(
        default=False,
        help_text="Promotional / marketing messages. Requires explicit user opt-in.",
    )

    class Meta:
        db_table = "notifications_preference"
        ordering = ["-created_at"]
        verbose_name = "Notification Preference"
        verbose_name_plural = "Notification Preferences"

    def __str__(self) -> str:
        return f"Preferences for {self.user_id}"
