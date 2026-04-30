"""Serializers for the analytics app.

AuditLogSerializer — read-only serializer for the admin audit log endpoint.
"""
from rest_framework import serializers

from .models import AuditLog, OwnerEarningsSummary


class AuditLogSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Read-only serializer for AuditLog entries.

    Adds ``actor_email`` as a computed field so the admin UI can display
    the actor's identity without a separate /users/ lookup.
    """

    actor_email = serializers.SerializerMethodField(
        help_text="Email of the actor who triggered the event, or null for system events.",
    )

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "event_type",
            "actor",
            "actor_email",
            "reference_id",
            "reference_type",
            "amount",
            "currency",
            "metadata",
            "ip_address",
            "created_at",
        ]
        read_only_fields = fields

    def get_actor_email(self, obj: AuditLog) -> str | None:
        """Return actor.email if the actor FK is populated, else None."""
        if obj.actor_id and obj.actor:
            return obj.actor.email
        return None


class OwnerEarningsSummarySerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Read-only serializer for monthly owner earnings summaries."""

    class Meta:
        model = OwnerEarningsSummary
        fields = [
            "id",
            "owner",
            "year",
            "month",
            "gross_revenue",
            "platform_fee",
            "net_revenue",
            "currency",
            "booking_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
