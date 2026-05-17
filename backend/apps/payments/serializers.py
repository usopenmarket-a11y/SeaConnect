"""Serializers for the payments app."""
from __future__ import annotations

from rest_framework import serializers

from .models import Payment, Payout


class PaymentInitiateSerializer(serializers.Serializer):  # type: ignore[type-arg]
    """Write serializer for `POST /api/v1/payments/initiate/`."""

    booking_id = serializers.UUIDField()
    return_url = serializers.URLField(
        help_text="URL the customer is redirected back to after Fawry payment.",
    )


class PaymentSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Read serializer — never exposes the raw provider metadata in lists."""

    class Meta:
        model = Payment
        fields = [
            "id",
            "booking",
            "provider",
            "status",
            "amount",
            "currency",
            "checkout_url",
            "created_at",
        ]
        read_only_fields = fields


class PayoutSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Read-only serializer for owner payout history.

    All fields are read-only — payouts are created by the system (payout
    cycle job), never by API callers.
    """

    class Meta:
        model = Payout
        fields = [
            "id",
            "amount",
            "currency",
            "status",
            "reference",
            "payment_method",
            "scheduled_date",
            "paid_at",
            "escrow_booking_ids",
            "created_at",
        ]
        read_only_fields = fields


class AdminPayoutSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Read serializer for the admin payout list endpoint.

    Includes owner identity fields so the admin portal can display the
    owner name/email without a separate user lookup.
    """

    owner_name = serializers.SerializerMethodField()
    owner_email = serializers.EmailField(source="owner.email", read_only=True)

    class Meta:
        model = Payout
        fields = [
            "id",
            "owner_name",
            "owner_email",
            "amount",
            "currency",
            "status",
            "reference",
            "payment_method",
            "scheduled_date",
            "paid_at",
            "escrow_booking_ids",
            "created_at",
        ]
        read_only_fields = fields

    def get_owner_name(self, obj) -> str:  # type: ignore[override]
        full = f"{obj.owner.first_name} {obj.owner.last_name}".strip()
        return full or obj.owner.email


class EscrowBookingSerializer(serializers.Serializer):  # type: ignore[type-arg]
    """Read serializer for bookings currently in the escrow hold window.

    Returned by GET /api/v1/payments/escrow/. Shows completed bookings
    where the 24-hour release window has not yet elapsed.
    """

    id = serializers.UUIDField(read_only=True)
    customer_name = serializers.SerializerMethodField()
    trip_date = serializers.DateField(source="end_date", read_only=True)
    amount = serializers.DecimalField(
        source="total_amount",
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )
    currency = serializers.CharField(read_only=True)
    release_hours = serializers.SerializerMethodField()

    def get_customer_name(self, obj) -> str:  # type: ignore[override]
        full = f"{obj.customer.first_name} {obj.customer.last_name}".strip()
        return full or obj.customer.email

    def get_release_hours(self, obj) -> float:  # type: ignore[override]
        """Hours remaining before the 24-hour escrow window expires."""
        from django.utils import timezone

        hold_hours: int = 24
        if obj.updated_at is None:
            return float(hold_hours)
        elapsed = (timezone.now() - obj.updated_at).total_seconds() / 3600
        remaining = hold_hours - elapsed
        return round(max(remaining, 0.0), 2)
