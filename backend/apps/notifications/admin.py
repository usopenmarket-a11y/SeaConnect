"""Django admin registrations for the notifications app."""
from django.contrib import admin

from apps.notifications.models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin view for individual Notification delivery records."""

    list_display = [
        "id",
        "recipient",
        "notification_type",
        "channel",
        "status",
        "title_ar",
        "sent_at",
        "created_at",
    ]
    list_filter = ["channel", "status", "notification_type"]
    search_fields = ["recipient__email", "title_ar", "title_en", "reference_type"]
    readonly_fields = [
        "id",
        "sent_at",
        "read_at",
        "created_at",
        "updated_at",
    ]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"

    fieldsets = (
        (
            "Delivery",
            {
                "fields": (
                    "id",
                    "recipient",
                    "notification_type",
                    "channel",
                    "status",
                    "failure_reason",
                )
            },
        ),
        (
            "Content (Arabic first — ADR-014)",
            {
                "fields": (
                    "title_ar",
                    "title_en",
                    "body_ar",
                    "body_en",
                )
            },
        ),
        (
            "Reference",
            {
                "fields": (
                    "reference_id",
                    "reference_type",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "sent_at",
                    "read_at",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    """Admin view for per-user notification preferences."""

    list_display = [
        "user",
        "push_enabled",
        "email_enabled",
        "booking_reminders",
        "marketing",
        "created_at",
    ]
    list_filter = ["push_enabled", "email_enabled", "booking_reminders", "marketing"]
    search_fields = ["user__email"]
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["-created_at"]
