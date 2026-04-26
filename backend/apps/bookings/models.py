"""Bookings app models — Yacht and YachtMedia (Sprint 2 Phase B).

ADR compliance:
  ADR-001 — UUID PKs, ORM only (no raw SQL)
  ADR-012 — All booking state changes must write to BookingEvent within the
             same transaction.atomic() block as the state change itself.
  ADR-013 — List endpoints use CursorPagination with ordering='-created_at'.
  ADR-018 — Region FK on all location-specific models; currency never hardcoded.

Sprint 3 will add:
  Availability, MatchRequest, MatchResult, Booking, BookingEvent
  BookingEvent must be append-only (no UPDATE, no DELETE) per ADR-012.
  Use transaction.atomic() + BookingEvent.objects.create() on every state change.
"""
import uuid

from django.db import models

from apps.accounts.models import User
from apps.core.models import DeparturePort, Region, TimeStampedModel


class YachtType(models.TextChoices):
    MOTORBOAT = "motorboat", "Motorboat"
    SAILBOAT = "sailboat", "Sailboat"
    CATAMARAN = "catamaran", "Catamaran"
    FISHING = "fishing", "Fishing Boat"
    SPEEDBOAT = "speedboat", "Speedboat"


class YachtStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"


class Yacht(TimeStampedModel):
    """A boat listed on the SeaConnect marketplace.

    Owned by a User with role=owner.  The currency field mirrors the region's
    ISO 4217 currency at creation time — it must never be hardcoded as 'EGP'
    (ADR-018).  Soft-delete is enforced via is_deleted; status='inactive'
    removes the yacht from customer-facing queries but retains the record.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="yachts",
        help_text="Boat owner — must have role='owner'.",
    )
    region = models.ForeignKey(
        Region,
        on_delete=models.PROTECT,
        related_name="yachts",
        help_text="Region this yacht operates in (drives currency).",
    )
    departure_port = models.ForeignKey(
        DeparturePort,
        on_delete=models.PROTECT,
        related_name="yachts",
        help_text="Primary home port for this yacht.",
    )
    name = models.CharField(
        max_length=200,
        help_text="Yacht name in English.",
    )
    name_ar = models.CharField(
        max_length=200,
        help_text="Yacht name in Arabic (primary display language).",
    )
    description = models.TextField(
        blank=True,
        help_text="Full description in English.",
    )
    description_ar = models.TextField(
        blank=True,
        help_text="Full description in Arabic (primary display language).",
    )
    capacity = models.PositiveSmallIntegerField(
        help_text="Maximum number of passengers (excluding crew).",
    )
    price_per_day = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Daily charter price.  NUMERIC(12,2) — never float.",
    )
    currency = models.CharField(
        max_length=3,
        help_text="ISO 4217 currency code copied from region at creation. e.g. 'EGP', 'AED'.",
    )
    yacht_type = models.CharField(
        max_length=20,
        choices=YachtType.choices,
        help_text="Vessel category.",
    )
    status = models.CharField(
        max_length=20,
        choices=YachtStatus.choices,
        default=YachtStatus.DRAFT,
        help_text="Only 'active' yachts appear in customer-facing queries.",
    )
    is_deleted = models.BooleanField(
        default=False,
        help_text="Soft-delete flag — never hard-delete user-facing records.",
    )

    class Meta:
        db_table = "bookings_yacht"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"], name="idx_yacht_status"),
            models.Index(fields=["owner"], name="idx_yacht_owner"),
            models.Index(fields=["region"], name="idx_yacht_region"),
            models.Index(fields=["departure_port"], name="idx_yacht_departure_port"),
            models.Index(fields=["yacht_type"], name="idx_yacht_type"),
            models.Index(fields=["is_deleted"], name="idx_yacht_is_deleted"),
        ]
        verbose_name = "Yacht"
        verbose_name_plural = "Yachts"

    def __str__(self) -> str:
        return f"{self.name_ar} / {self.name} ({self.get_status_display()})"


class YachtMedia(TimeStampedModel):
    """Photo or video attached to a Yacht listing.

    ``is_primary`` marks the hero image shown in list views.
    ``order`` controls display sequence within the detail gallery.
    Only one record should have is_primary=True per yacht — enforced at the
    serializer / service layer, not at DB level (to keep migrations simple).
    """

    MEDIA_TYPE_CHOICES = [
        ("image", "Image"),
        ("video", "Video"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    yacht = models.ForeignKey(
        Yacht,
        on_delete=models.CASCADE,
        related_name="media",
        help_text="Yacht this media belongs to.",
    )
    url = models.URLField(
        max_length=500,
        help_text="Absolute URL to the media asset (MinIO / R2).",
    )
    media_type = models.CharField(
        max_length=10,
        choices=MEDIA_TYPE_CHOICES,
        default="image",
    )
    is_primary = models.BooleanField(
        default=False,
        help_text="True for the hero image shown on listing cards.",
    )
    order = models.PositiveSmallIntegerField(
        default=0,
        help_text="Ascending display order within the yacht's gallery.",
    )

    class Meta:
        db_table = "bookings_yachtmedia"
        ordering = ["order"]
        indexes = [
            models.Index(fields=["yacht", "is_primary"], name="idx_yachtmedia_primary"),
            models.Index(fields=["yacht", "order"], name="idx_yachtmedia_order"),
        ]
        verbose_name = "Yacht Media"
        verbose_name_plural = "Yacht Media"

    def __str__(self) -> str:
        flag = " [primary]" if self.is_primary else ""
        return f"{self.yacht.name} — {self.media_type} #{self.order}{flag}"
