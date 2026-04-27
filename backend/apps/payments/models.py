"""Payment models — Sprint 4.

ADR-001 — UUID PK, ORM only, NUMERIC(12,2) for money.
ADR-007 — `provider` field stores the registry key (e.g. "fawry"). Views
          never reference the concrete class; they go through get_provider().
ADR-018 — Currency is ISO 4217 inherited from booking.currency at the
          moment the Payment row is created. Never hardcoded.

Lifecycle:
  pending  → captured  (Fawry webhook with PAID)
  pending  → failed    (Fawry webhook with FAILED / EXPIRED / CANCELLED)
  captured → refunded  (Fawry webhook with REFUNDED — future support)

A Booking can have multiple Payment rows (a fresh attempt after a failure
gets its own row). The booking is considered paid when *any* Payment row
reaches `captured`.
"""
from __future__ import annotations

import uuid

from django.db import models

from apps.core.models import TimeStampedModel


class PaymentProviderChoices(models.TextChoices):
    """String keys must match keys in
    apps.payments.providers.registry.PROVIDER_REGISTRY.
    """

    FAWRY = "fawry", "Fawry"
    TELR = "telr", "Telr"
    STRIPE = "stripe", "Stripe"
    MADA = "mada", "Mada"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    CAPTURED = "captured", "Captured"
    FAILED = "failed", "Failed"
    REFUNDED = "refunded", "Refunded"


class Payment(TimeStampedModel):
    """A single payment attempt against a Booking."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.PROTECT,
        related_name="payments",
        help_text="The booking this payment is paying for.",
    )
    provider = models.CharField(
        max_length=20,
        choices=PaymentProviderChoices.choices,
        help_text="Gateway key — must match a key in PROVIDER_REGISTRY.",
    )
    provider_ref = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        help_text="Provider-assigned transaction reference (e.g. Fawry referenceNumber).",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Amount charged. NUMERIC(12,2) — never float.",
    )
    currency = models.CharField(
        max_length=3,
        help_text="ISO 4217 currency code inherited from booking.currency.",
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )
    checkout_url = models.URLField(
        max_length=1000,
        blank=True,
        help_text="The provider URL the customer was redirected to.",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Full provider request/response payloads, for audit + debugging.",
    )

    class Meta:
        db_table = "payments_payment"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["booking", "status"], name="idx_payment_booking_status"),
            models.Index(fields=["provider_ref"], name="idx_payment_provider_ref"),
            models.Index(fields=["status"], name="idx_payment_status"),
        ]
        verbose_name = "Payment"
        verbose_name_plural = "Payments"

    def __str__(self) -> str:
        return f"Payment {self.id} — {self.booking_id} ({self.get_status_display()})"
