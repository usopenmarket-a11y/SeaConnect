"""Analytics app models — AuditLog and OwnerEarningsSummary.

ADR compliance:
  ADR-001 — UUID PKs, ORM only (no raw SQL)
  ADR-012 — AuditLog is append-only; never UPDATE or DELETE rows.
  ADR-018 — currency always from region, never hardcoded.

AuditLog captures significant platform events across all apps.
OwnerEarningsSummary is a monthly read-only rollup updated by Celery Beat.
"""
import uuid

from django.conf import settings
from django.db import models
from django.db.models import CASCADE, SET_NULL, TextChoices

from apps.core.models import TimeStampedModel


class AuditLog(TimeStampedModel):
    """Append-only audit log for significant platform events.

    NEVER UPDATE OR DELETE rows — this is an event log.
    All monetary amounts stored as NUMERIC(12,2) to preserve exact precision.
    ADR-001: UUID PK. ADR-018: currency from region, never hardcoded.
    """

    class EventType(TextChoices):
        # Booking events
        BOOKING_CREATED = "booking_created", "Booking Created"
        BOOKING_CONFIRMED = "booking_confirmed", "Booking Confirmed"
        BOOKING_DECLINED = "booking_declined", "Booking Declined"
        BOOKING_CANCELLED = "booking_cancelled", "Booking Cancelled"
        BOOKING_COMPLETED = "booking_completed", "Booking Completed"
        # Payment events
        PAYMENT_INITIATED = "payment_initiated", "Payment Initiated"
        PAYMENT_CONFIRMED = "payment_confirmed", "Payment Confirmed"
        PAYMENT_FAILED = "payment_failed", "Payment Failed"
        PAYOUT_SENT = "payout_sent", "Payout Sent"
        # User events
        USER_REGISTERED = "user_registered", "User Registered"
        USER_KYC_SUBMITTED = "user_kyc_submitted", "KYC Submitted"
        USER_KYC_APPROVED = "user_kyc_approved", "KYC Approved"
        USER_KYC_REJECTED = "user_kyc_rejected", "KYC Rejected"
        # Marketplace
        ORDER_CREATED = "order_created", "Order Created"
        # Competition
        COMPETITION_ENTRY = "competition_entry", "Competition Entry"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(
        max_length=40,
        choices=EventType.choices,
        db_index=True,
        help_text="Category of the platform event.",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=SET_NULL,
        related_name="audit_logs",
        help_text="User who triggered the event. Null for system-generated events.",
    )
    # Generic reference to any object — intentionally a plain UUID + type string
    # so we avoid cross-app FK coupling (see ADR: no direct cross-app imports).
    reference_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text="UUID of the related object (booking, payment, order, etc.).",
    )
    reference_type = models.CharField(
        max_length=40,
        blank=True,
        help_text="Type label for reference_id, e.g. 'booking', 'payment'.",
    )
    # Monetary snapshot — optional, stored at event time.
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Monetary amount at event time. NUMERIC(12,2) — never float.",
    )
    currency = models.CharField(
        max_length=3,
        blank=True,
        help_text="ISO 4217 currency code (from region). Blank for non-monetary events.",
    )
    # Arbitrary extra context — keeps the schema stable as event types evolve.
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured snapshot of relevant data at event time.",
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP of the request that triggered the event. Null for system events.",
    )

    class Meta:
        db_table = "analytics_audit_log"
        ordering = ["-created_at"]
        # Append-only enforcement is at the service layer (log_event helper),
        # not at the DB level, to keep migrations simple.
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"

    def __str__(self) -> str:
        actor_label = self.actor.email if self.actor_id and self.actor else "system"
        return f"{self.event_type} by {actor_label} @ {self.created_at}"


class OwnerEarningsSummary(TimeStampedModel):
    """Monthly earnings rollup per owner — updated by Celery Beat.

    Read-only snapshot — never relied on for financial settlement.
    Settlement uses the payments app directly.
    ADR-018: currency sourced from region, not hardcoded.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=CASCADE,
        related_name="earnings_summaries",
        help_text="Boat owner this summary belongs to.",
    )
    year = models.PositiveSmallIntegerField(
        help_text="Calendar year, e.g. 2025.",
    )
    month = models.PositiveSmallIntegerField(
        help_text="Calendar month 1–12.",
    )
    gross_revenue = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Total revenue before platform fee deduction. NUMERIC(12,2).",
    )
    platform_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Platform commission charged for the period. NUMERIC(12,2).",
    )
    net_revenue = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="gross_revenue - platform_fee. NUMERIC(12,2).",
    )
    currency = models.CharField(
        max_length=3,
        help_text="ISO 4217 currency code sourced from the owner's region.",
    )
    booking_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of completed bookings in this period.",
    )

    class Meta:
        db_table = "analytics_owner_earnings"
        unique_together = [("owner", "year", "month")]
        ordering = ["-year", "-month"]
        verbose_name = "Owner Earnings Summary"
        verbose_name_plural = "Owner Earnings Summaries"

    def __str__(self) -> str:
        return f"{self.owner} — {self.year}/{self.month:02d} ({self.currency})"
