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


# ---------------------------------------------------------------------------
# Sprint 3 — Availability + Booking + BookingEvent
# ---------------------------------------------------------------------------
# ADR-001 — UUID PKs, ORM only, NUMERIC(12,2) for money.
# ADR-012 — Booking state machine. Every transition wraps transaction.atomic()
#           and inserts a BookingEvent row. BookingEvent is APPEND ONLY: no
#           UPDATE, no DELETE, and intentionally does not inherit
#           TimeStampedModel (no updated_at — events are immutable).
# ADR-018 — Region FK present on Booking; currency is copied from yacht at
#           creation, never hardcoded.


class AvailabilityStatus(models.TextChoices):
    """Per-date availability status set by yacht owners or the booking system."""

    OPEN = "open", "Open"
    BLOCKED = "blocked", "Blocked"
    BOOKED = "booked", "Booked"


class Availability(TimeStampedModel):
    """Per-date availability record for a yacht.

    Owners write rows here to block out specific dates or override pricing.
    The booking flow flips status to ``booked`` when a confirmed booking
    covers the date.

    The ``unique_together`` constraint guarantees that a yacht cannot have
    two records for the same date.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    yacht = models.ForeignKey(
        Yacht,
        on_delete=models.CASCADE,
        related_name="availability",
        help_text="Yacht this availability record applies to.",
    )
    date = models.DateField(
        help_text="Calendar date in the yacht's region timezone.",
    )
    status = models.CharField(
        max_length=10,
        choices=AvailabilityStatus.choices,
        default=AvailabilityStatus.OPEN,
        help_text="open=bookable, blocked=owner unavailable, booked=reserved.",
    )
    price_override = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Overrides yacht.price_per_day for this date. NUMERIC(12,2).",
    )
    notes = models.TextField(
        blank=True,
        help_text="Owner-visible notes (e.g. reason for block).",
    )

    class Meta:
        db_table = "bookings_availability"
        unique_together = [("yacht", "date")]
        ordering = ["date"]
        indexes = [
            models.Index(fields=["yacht", "date"], name="idx_avail_yacht_date"),
            models.Index(fields=["yacht", "status"], name="idx_avail_yacht_status"),
        ]
        verbose_name = "Availability"
        verbose_name_plural = "Availability"

    def __str__(self) -> str:
        return f"{self.yacht.name} — {self.date} ({self.get_status_display()})"


class BookingStatus(models.TextChoices):
    """Lifecycle states for a Booking.

    Allowed transitions (enforced in BookingService, not at the model level):
      pending_owner → confirmed   (owner action)
      pending_owner → declined    (owner action; or auto-expire by Celery beat)
      pending_owner → cancelled   (customer action)
      confirmed     → cancelled   (customer action, before trip)
      confirmed     → completed   (system, after trip end date passes)
    """

    PENDING_OWNER = "pending_owner", "Pending Owner Approval"
    CONFIRMED = "confirmed", "Confirmed"
    DECLINED = "declined", "Declined"
    CANCELLED = "cancelled", "Cancelled"
    COMPLETED = "completed", "Completed"


class BookingEventType(models.TextChoices):
    """Event types written to the BookingEvent append-only audit log."""

    CREATED = "created", "Created"
    CONFIRMED = "confirmed", "Confirmed"
    DECLINED = "declined", "Declined"
    CANCELLED = "cancelled", "Cancelled"
    COMPLETED = "completed", "Completed"
    PAYMENT_RECEIVED = "payment_received", "Payment Received"


class Booking(TimeStampedModel):
    """A customer's request to charter a yacht for a date range.

    All state changes MUST go through ``apps.bookings.services.BookingService``
    so that a matching ``BookingEvent`` row is inserted in the same atomic
    transaction (ADR-012). Direct ``booking.save()`` calls from views are
    forbidden.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    yacht = models.ForeignKey(
        Yacht,
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    customer = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="bookings",
        help_text="The user who created this booking request.",
    )
    region = models.ForeignKey(
        Region,
        on_delete=models.PROTECT,
        related_name="bookings",
        help_text="Region at booking time — drives currency and timezone.",
    )
    departure_port = models.ForeignKey(
        DeparturePort,
        on_delete=models.PROTECT,
        related_name="bookings",
        help_text="Port the trip departs from.",
    )
    start_date = models.DateField(help_text="First day of the charter (inclusive).")
    end_date = models.DateField(help_text="Last day of the charter (exclusive).")
    num_passengers = models.PositiveSmallIntegerField(
        help_text="Number of passengers for this trip.",
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Total charter cost. NUMERIC(12,2) — never float.",
    )
    currency = models.CharField(
        max_length=3,
        help_text="ISO 4217 code copied from yacht.currency at creation time.",
    )
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING_OWNER,
        db_index=True,
    )
    decline_reason = models.TextField(
        blank=True,
        help_text="Owner-supplied reason when declining (optional).",
    )

    class Meta:
        db_table = "bookings_booking"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer", "status"], name="idx_booking_customer_status"),
            models.Index(fields=["yacht", "status"], name="idx_booking_yacht_status"),
            models.Index(fields=["status"], name="idx_booking_status"),
            models.Index(fields=["start_date", "end_date"], name="idx_booking_dates"),
        ]
        verbose_name = "Booking"
        verbose_name_plural = "Bookings"

    def __str__(self) -> str:
        return f"Booking {self.id} — {self.yacht.name} ({self.get_status_display()})"


class BookingEvent(models.Model):
    """Append-only audit log of every state change on a Booking (ADR-012).

    Hard rules:
      - Never UPDATE a row in this table.
      - Never DELETE a row in this table.
      - No ``updated_at`` field — events are immutable, mutability would lie.
      - Always inserted inside the same ``transaction.atomic()`` block as the
        Booking status update they describe. Use BookingService — never call
        ``BookingEvent.objects.create()`` directly from a view.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
        Booking,
        on_delete=models.PROTECT,
        related_name="events",
    )
    event_type = models.CharField(
        max_length=30,
        choices=BookingEventType.choices,
    )
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking_events",
        help_text="User who triggered this event. Null for system events.",
    )
    notes = models.TextField(
        blank=True,
        help_text="Human-readable note about this event.",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured snapshot at the time of the event.",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "bookings_booking_event"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["booking", "created_at"], name="idx_bookingevent_booking"),
            models.Index(fields=["event_type"], name="idx_bookingevent_type"),
        ]
        verbose_name = "Booking Event"
        verbose_name_plural = "Booking Events"

    def __str__(self) -> str:
        return f"{self.booking_id} — {self.event_type} @ {self.created_at}"
