"""Serializers for the analytics app.

AuditLogSerializer            — read-only serializer for the admin audit log endpoint.
OwnerEarningsSummarySerializer — monthly earnings history with computed month label
                                  and mom_delta field.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any

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
    """Read-only serializer for monthly owner earnings summaries.

    Computed fields:
      month_label — ISO "YYYY-MM" string derived from year + month model fields.
                    Used by the frontend revenue chart for axis labels.
      mom_delta   — float representing month-over-month net_revenue change relative
                    to the previous period row in the queryset.  Set to 0.0 for the
                    oldest row (no prior context available at serialization time).
                    Computed in ``to_representation`` by inspecting the list context
                    injected by the view via SerializerContext.

    Note: mom_delta is computed per-page from the ordered queryset slice.  Because
    cursor pagination may start mid-history, the first row on any page beyond page 1
    will show 0.0 (no cross-page look-back). This is an accepted limitation of the
    cursor-paginated monthly rollup design; full historical delta requires the Celery
    Beat rollup job to pre-compute and store the value.
    """

    month_label = serializers.SerializerMethodField(
        help_text="ISO 'YYYY-MM' string (e.g. '2026-05') derived from year + month.",
    )
    mom_delta = serializers.SerializerMethodField(
        help_text=(
            "Month-over-month net_revenue delta as a float (e.g. 0.15 = +15%). "
            "0.0 for the first row in the page."
        ),
    )

    class Meta:
        model = OwnerEarningsSummary
        fields = [
            "id",
            "owner",
            "year",
            "month",
            "month_label",
            "gross_revenue",
            "platform_fee",
            "net_revenue",
            "currency",
            "booking_count",
            "mom_delta",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_month_label(self, obj: OwnerEarningsSummary) -> str:
        """Return 'YYYY-MM' string for the revenue chart month axis."""
        return f"{obj.year:04d}-{obj.month:02d}"

    def get_mom_delta(self, obj: OwnerEarningsSummary) -> float:
        """Compute MoM net_revenue delta relative to the next (older) item in the list.

        The serializer receives the full ordered results list via context when
        called from a ListAPIView (``many=True``).  We look ahead one position
        in the list (items are -year/-month ordered, so index+1 is the prior month).
        """
        request_list: list[OwnerEarningsSummary] | None = self.context.get("results_list")
        if request_list is None:
            return 0.0
        try:
            idx = request_list.index(obj)
        except ValueError:
            return 0.0

        # idx+1 is the previous calendar month (list is newest-first)
        if idx + 1 >= len(request_list):
            return 0.0

        prev: OwnerEarningsSummary = request_list[idx + 1]
        prev_net: Decimal = prev.net_revenue
        if prev_net == Decimal("0.00"):
            return 0.0

        delta = float(
            ((obj.net_revenue - prev_net) / prev_net).quantize(Decimal("0.0001"))
        )
        return delta
