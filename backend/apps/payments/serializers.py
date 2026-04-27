"""Serializers for the payments app."""
from __future__ import annotations

from rest_framework import serializers

from .models import Payment


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
