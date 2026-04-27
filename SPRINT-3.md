# Sprint 3 — Booking Flow + Availability
**Dates:** 2026-04-28 to 2026-05-05
**Goal:** A customer can request to book a yacht, an owner can approve or decline, and the full booking state machine works end-to-end through the web UI.
**Status:** PLANNED

**Primary agents:** django-model-agent, api-endpoint-agent, nextjs-page-agent, celery-task-agent, test-writer-agent

---

## Pre-Execution Checklist

Every agent must complete these steps before writing a single line of code:

1. Read `03-Technical-Product/10-ADR-Log.md` — all 20 binding architecture decisions. Pay special attention to ADR-001 (ORM only, UUID PKs), ADR-012 (event sourcing for booking state), ADR-013 (CursorPagination), ADR-014 (RTL-first), ADR-015 (i18n keys), ADR-018 (Region FK).
2. Read `HANDOFFS.md` — confirm Sprint 2 deliverables are DONE before building on them.
3. Read `AGENT-COSTS.md` — check daily token budget before starting.
4. Read `backend/apps/bookings/models.py` — understand the existing Yacht/YachtMedia models that booking models will reference.
5. Read `backend/apps/core/models.py` — understand `Region`, `DeparturePort`, `TimeStampedModel`.
6. Read `backend/apps/accounts/models.py` — understand the `User` model and `UserRole` choices.

---

## Carry-overs from Sprint 2

| Task | Reason not completed | Priority |
|------|----------------------|----------|
| DeparturePortNestedSerializer field fix | Serializer references `.name`/`.city` but model has `.name_en`/`.city_en` — flagged in HANDOFF-2026-04-26-002. Must be fixed before booking serializers can nest departure port data. | High |
| OTP / phone verification for `is_verified` | Intentionally deferred — `is_verified` remains False after register | Low |
| Book Now button on yacht detail page | Was a dead link — Sprint 3 makes it live | High |
| `GET /api/v1/yachts/{id}/book/` route | Not wired — Sprint 3 adds the full booking form page | High |

---

## Sprint 3 Tasks

---

### Phase A — Booking Models + State Machine

**Agent:** django-model-agent
**Can start:** Immediately — Yacht model and User model are both available.
**Blocks:** Phase B (API endpoints need the models), Phase E (tests need models and endpoints).

---

#### Task A-1 — Availability model
**Agent:** django-model-agent
**Depends on:** Nothing (Yacht model already exists in `apps/bookings/models.py`)
**Files touched:**
- `backend/apps/bookings/models.py` — append `AvailabilityStatus` choices class and `Availability` model
- `backend/apps/bookings/migrations/` — new migration file (auto-generated via makemigrations)
- `backend/apps/bookings/admin.py` — register `Availability` with list_display and list_filter

**What to build:**

```python
class AvailabilityStatus(models.TextChoices):
    OPEN = "open", "Open"
    BLOCKED = "blocked", "Blocked"
    BOOKED = "booked", "Booked"


class Availability(TimeStampedModel):
    """
    Per-date availability record for a yacht.

    Owners set this to block out dates or mark them open.
    The booking flow writes status='booked' when a confirmed booking covers the date.

    ADR-001: UUID PK, ORM only.
    ADR-018: no hardcoded currency — inherits from yacht.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    yacht = models.ForeignKey(
        Yacht,
        on_delete=models.CASCADE,
        related_name="availability",
    )
    date = models.DateField(
        help_text="Calendar date this record applies to.",
    )
    status = models.CharField(
        max_length=10,
        choices=AvailabilityStatus.choices,
        default=AvailabilityStatus.OPEN,
    )
    price_override = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="If set, overrides yacht.price_per_day for this date. NUMERIC(12,2).",
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
```

Admin registration:
```python
@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ["yacht", "date", "status", "price_override"]
    list_filter = ["status", "yacht"]
    ordering = ["yacht", "date"]
```

**Definition of done:**
- `python manage.py makemigrations bookings` produces a clean migration.
- `python manage.py migrate` applies without errors.
- `python manage.py check` passes.
- `Availability` visible in Django admin with correct list_display.
- `unique_together` constraint prevents duplicate (yacht, date) pairs.

---

#### Task A-2 — Booking model and BookingEvent model (ADR-012 compliance)
**Agent:** django-model-agent
**Depends on:** Task A-1 (same migration file context)
**Files touched:**
- `backend/apps/bookings/models.py` — append `BookingStatus`, `BookingEventType`, `Booking`, `BookingEvent`
- `backend/apps/bookings/migrations/` — included in the same migration as A-1, OR a sequential new migration
- `backend/apps/bookings/admin.py` — register `Booking` and `BookingEvent`
- `backend/apps/bookings/services.py` — create file with `BookingService` state transition methods

**What to build:**

```python
class BookingStatus(models.TextChoices):
    PENDING_OWNER = "pending_owner", "Pending Owner Approval"
    CONFIRMED = "confirmed", "Confirmed"
    DECLINED = "declined", "Declined"
    CANCELLED = "cancelled", "Cancelled"
    COMPLETED = "completed", "Completed"


class BookingEventType(models.TextChoices):
    CREATED = "created", "Created"
    CONFIRMED = "confirmed", "Confirmed"
    DECLINED = "declined", "Declined"
    CANCELLED = "cancelled", "Cancelled"
    COMPLETED = "completed", "Completed"
    PAYMENT_RECEIVED = "payment_received", "Payment Received"


class Booking(TimeStampedModel):
    """
    A customer's request to charter a yacht.

    State transitions:
      pending_owner → confirmed   (owner action)
      pending_owner → declined    (owner action)
      pending_owner → cancelled   (customer action)
      confirmed → cancelled       (customer action, before trip)
      confirmed → completed       (system, after trip end date passes)

    ADR-012: EVERY state change must write a BookingEvent within the same
             transaction.atomic() block. Use BookingService, never direct .save().
    ADR-001: UUID PK, ORM only.
    ADR-018: Region FK present; currency not hardcoded.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    yacht = models.ForeignKey(
        Yacht,
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    customer = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="bookings",
        help_text="The user who made this booking request.",
    )
    region = models.ForeignKey(
        "core.Region",
        on_delete=models.PROTECT,
        related_name="bookings",
        help_text="Region at time of booking — drives currency display.",
    )
    departure_port = models.ForeignKey(
        "core.DeparturePort",
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    start_date = models.DateField()
    end_date = models.DateField()
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
        help_text="ISO 4217 code inherited from region at booking creation time.",
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
    """
    Append-only audit log of every state change on a Booking.

    ADR-012: This table is APPEND ONLY.
      - Never UPDATE a BookingEvent row.
      - Never DELETE a BookingEvent row.
      - No updated_at field (would imply mutability).
      - Always inserted inside a transaction.atomic() alongside the Booking status update.

    Note: BookingEvent intentionally does NOT inherit TimeStampedModel because
    TimeStampedModel adds updated_at, which is semantically wrong for an immutable
    event log. Only created_at is present.
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
        "accounts.User",
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
        help_text="Structured data snapshot at the time of the event.",
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
```

Create `backend/apps/bookings/services.py` — all state machine transitions live here:

```python
"""BookingService — authoritative state machine for Booking transitions.

ADR-012: All state changes are wrapped in transaction.atomic() and ALWAYS
         insert a BookingEvent in the same transaction. Never call
         booking.save() directly from views — always go through this service.
"""
from django.db import transaction
from django.utils import timezone

from .models import Availability, AvailabilityStatus, Booking, BookingEvent, BookingEventType, BookingStatus
from apps.accounts.models import User


class BookingTransitionError(Exception):
    """Raised when a state transition is not permitted."""


class BookingService:

    @staticmethod
    @transaction.atomic
    def create_booking(
        yacht,
        customer: User,
        start_date,
        end_date,
        num_passengers: int,
        departure_port,
    ) -> Booking:
        """Create a new booking in pending_owner status."""
        region = yacht.region
        days = (end_date - start_date).days or 1
        total_amount = yacht.price_per_day * days

        booking = Booking.objects.create(
            yacht=yacht,
            customer=customer,
            region=region,
            departure_port=departure_port,
            start_date=start_date,
            end_date=end_date,
            num_passengers=num_passengers,
            total_amount=total_amount,
            currency=yacht.currency,
            status=BookingStatus.PENDING_OWNER,
        )
        BookingEvent.objects.create(
            booking=booking,
            event_type=BookingEventType.CREATED,
            actor=customer,
            metadata={"total_amount": str(total_amount), "currency": yacht.currency},
        )
        return booking

    @staticmethod
    @transaction.atomic
    def confirm(booking: Booking, actor: User) -> Booking:
        if booking.status != BookingStatus.PENDING_OWNER:
            raise BookingTransitionError(
                f"Cannot confirm a booking in '{booking.status}' status."
            )
        booking.status = BookingStatus.CONFIRMED
        booking.save(update_fields=["status", "updated_at"])
        BookingEvent.objects.create(
            booking=booking,
            event_type=BookingEventType.CONFIRMED,
            actor=actor,
        )
        return booking

    @staticmethod
    @transaction.atomic
    def decline(booking: Booking, actor: User, reason: str = "") -> Booking:
        if booking.status != BookingStatus.PENDING_OWNER:
            raise BookingTransitionError(
                f"Cannot decline a booking in '{booking.status}' status."
            )
        booking.status = BookingStatus.DECLINED
        booking.decline_reason = reason
        booking.save(update_fields=["status", "decline_reason", "updated_at"])
        BookingEvent.objects.create(
            booking=booking,
            event_type=BookingEventType.DECLINED,
            actor=actor,
            notes=reason,
        )
        return booking

    @staticmethod
    @transaction.atomic
    def cancel(booking: Booking, actor: User) -> Booking:
        if booking.status not in (BookingStatus.PENDING_OWNER, BookingStatus.CONFIRMED):
            raise BookingTransitionError(
                f"Cannot cancel a booking in '{booking.status}' status."
            )
        booking.status = BookingStatus.CANCELLED
        booking.save(update_fields=["status", "updated_at"])
        BookingEvent.objects.create(
            booking=booking,
            event_type=BookingEventType.CANCELLED,
            actor=actor,
        )
        return booking
```

Admin registration:
```python
class BookingEventInline(admin.TabularInline):
    model = BookingEvent
    extra = 0
    readonly_fields = ["id", "event_type", "actor", "notes", "metadata", "created_at"]
    can_delete = False

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ["id", "yacht", "customer", "status", "start_date", "end_date", "total_amount", "currency"]
    list_filter = ["status", "region"]
    inlines = [BookingEventInline]
    readonly_fields = ["id", "created_at", "updated_at"]

@admin.register(BookingEvent)
class BookingEventAdmin(admin.ModelAdmin):
    list_display = ["booking", "event_type", "actor", "created_at"]
    list_filter = ["event_type"]
    readonly_fields = ["id", "booking", "event_type", "actor", "notes", "metadata", "created_at"]
```

**Definition of done:**
- `python manage.py makemigrations bookings` generates a clean migration containing Availability, Booking, and BookingEvent.
- `python manage.py migrate` applies without errors.
- `python manage.py check` passes.
- `BookingService.create_booking()` inserts a `BookingEvent` with `event_type='created'` in the same transaction — verifiable by wrapping in `transaction.atomic()` and checking the count after a rollback test.
- All invalid state transitions raise `BookingTransitionError`.
- Django admin shows Booking with inline BookingEvent records (read-only).
- `BookingEvent` rows can only be inserted — no admin action allows UPDATE or DELETE.

---

### Phase B — Booking API Endpoints

**Agent:** api-endpoint-agent
**Can start:** After Task A-1 and A-2 are complete (needs models).
**Blocks:** Phase C (web pages need live endpoints), Phase E (tests).

---

#### Task B-1 — Fix DeparturePortNestedSerializer field names (carry-over)
**Agent:** api-endpoint-agent
**Depends on:** Nothing (this is a bug fix to an existing file)
**Files touched:**
- `backend/apps/bookings/serializers.py` — fix field names in `DeparturePortNestedSerializer`

**What to build:**

The existing `DeparturePortNestedSerializer` in `backend/apps/bookings/serializers.py` references `.name` and `.city` attributes, but the `DeparturePort` model (in `core/models.py`) has `name_en`, `name_ar`, `city_en`, `city_ar`. This causes a 500 error whenever the departure_port nested object is serialized.

The fix is already documented in HANDOFF-2026-04-26-002. Apply it:
```python
class DeparturePortNestedSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name_en = serializers.CharField()
    name_ar = serializers.CharField()
    city_en = serializers.CharField()
    city_ar = serializers.CharField()
```

After applying this fix, run `pytest backend/tests/test_yachts.py -v` to confirm previously failing departure_port nesting tests now pass.

**Definition of done:**
- `DeparturePortNestedSerializer` has `name_en`, `name_ar`, `city_en`, `city_ar` fields.
- `GET /api/v1/yachts/` returns departure_port objects with `name_en`, not a 500 error.
- `pytest backend/tests/test_yachts.py` passes (previously failing tests now green).

---

#### Task B-2 — Booking serializers
**Agent:** api-endpoint-agent
**Depends on:** Task A-2 (Booking and BookingEvent models)
**Files touched:**
- `backend/apps/bookings/serializers.py` — append booking-related serializers

**What to build:**

Append to `backend/apps/bookings/serializers.py`:

```python
from .models import Availability, Booking, BookingEvent, BookingStatus


class BookingEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = BookingEvent
        fields = ["id", "event_type", "actor_name", "notes", "metadata", "created_at"]

    def get_actor_name(self, obj: BookingEvent) -> str | None:
        if obj.actor:
            return f"{obj.actor.first_name} {obj.actor.last_name}".strip()
        return None


class BookingListSerializer(serializers.ModelSerializer):
    yacht_name = serializers.CharField(source="yacht.name", read_only=True)
    yacht_name_ar = serializers.CharField(source="yacht.name_ar", read_only=True)
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "yacht_name",
            "yacht_name_ar",
            "customer_name",
            "start_date",
            "end_date",
            "num_passengers",
            "total_amount",
            "currency",
            "status",
            "created_at",
        ]

    def get_customer_name(self, obj: Booking) -> str:
        return f"{obj.customer.first_name} {obj.customer.last_name}".strip()


class BookingDetailSerializer(BookingListSerializer):
    events = BookingEventSerializer(many=True, read_only=True)
    departure_port = DeparturePortNestedSerializer(read_only=True)
    region = RegionNestedSerializer(read_only=True)

    class Meta(BookingListSerializer.Meta):
        fields = BookingListSerializer.Meta.fields + [
            "departure_port",
            "region",
            "decline_reason",
            "events",
            "updated_at",
        ]


class BookingCreateSerializer(serializers.Serializer):
    """Write serializer for POST /api/v1/bookings/ — customer creates a booking request."""
    yacht_id = serializers.UUIDField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    num_passengers = serializers.IntegerField(min_value=1)
    departure_port_id = serializers.UUIDField()

    def validate(self, data: dict) -> dict:
        if data["end_date"] <= data["start_date"]:
            raise serializers.ValidationError(
                {"end_date": "end_date must be after start_date."}
            )
        return data


class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = ["date", "status", "price_override"]


class AvailabilityWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = ["date", "status", "price_override", "notes"]
```

**Definition of done:**
- `BookingCreateSerializer` validates that `end_date > start_date`.
- `BookingDetailSerializer` includes nested `events` array.
- `BookingListSerializer` does not include the `events` array (keeps list responses small).
- No circular imports (`python manage.py check` passes).

---

#### Task B-3 — Booking CRUD views and URL routing
**Agent:** api-endpoint-agent
**Depends on:** Task B-2 (serializers), Task A-2 (services)
**Files touched:**
- `backend/apps/bookings/views.py` — append booking views (do not remove existing yacht views)
- `backend/apps/bookings/urls.py` — append booking URL patterns
- `backend/apps/bookings/permissions.py` — create file with `IsBookingOwner`, `IsYachtOwner` permission classes

**What to build:**

Create `backend/apps/bookings/permissions.py`:
```python
from rest_framework.permissions import BasePermission


class IsYachtOwnerOfBooking(BasePermission):
    """Allow access only to the owner of the yacht in the booking."""
    def has_object_permission(self, request, view, obj):
        return obj.yacht.owner == request.user


class IsBookingCustomer(BasePermission):
    """Allow access only to the customer who made the booking."""
    def has_object_permission(self, request, view, obj):
        return obj.customer == request.user
```

Add to `backend/apps/bookings/views.py`:

```python
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
import datetime

from .models import Availability, Booking, Yacht
from .serializers import (
    AvailabilitySerializer,
    AvailabilityWriteSerializer,
    BookingCreateSerializer,
    BookingDetailSerializer,
    BookingListSerializer,
)
from .services import BookingService, BookingTransitionError
from .permissions import IsBookingCustomer, IsYachtOwnerOfBooking


class BookingListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/bookings/   — list caller's bookings (customer sees theirs; owner sees for their yachts)
    POST /api/v1/bookings/   — customer creates a booking request
    ADR-013: CursorPagination enforced via StandardCursorPagination.
    """
    permission_classes = [IsAuthenticated]
    pagination_class = StandardCursorPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return BookingCreateSerializer
        return BookingListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "owner":
            return (
                Booking.objects.filter(yacht__owner=user)
                .select_related("yacht", "customer", "region", "departure_port")
                .order_by("-created_at")
            )
        return (
            Booking.objects.filter(customer=user)
            .select_related("yacht", "customer", "region", "departure_port")
            .order_by("-created_at")
        )

    def create(self, request, *args, **kwargs):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        yacht = get_object_or_404(Yacht, id=data["yacht_id"], status="active")
        from apps.core.models import DeparturePort
        departure_port = get_object_or_404(DeparturePort, id=data["departure_port_id"])

        booking = BookingService.create_booking(
            yacht=yacht,
            customer=request.user,
            start_date=data["start_date"],
            end_date=data["end_date"],
            num_passengers=data["num_passengers"],
            departure_port=departure_port,
        )
        return Response(
            BookingDetailSerializer(booking).data,
            status=status.HTTP_201_CREATED,
        )


class BookingDetailView(generics.RetrieveAPIView):
    """GET /api/v1/bookings/{id}/"""
    permission_classes = [IsAuthenticated]
    serializer_class = BookingDetailSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "owner":
            return Booking.objects.filter(yacht__owner=user).select_related(
                "yacht", "customer", "region", "departure_port"
            ).prefetch_related("events__actor")
        return Booking.objects.filter(customer=user).select_related(
            "yacht", "customer", "region", "departure_port"
        ).prefetch_related("events__actor")

    lookup_field = "id"


class BookingConfirmView(APIView):
    """PATCH /api/v1/bookings/{id}/confirm/ — owner confirms (pending_owner → confirmed)"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, id):
        booking = get_object_or_404(Booking, id=id, yacht__owner=request.user)
        try:
            booking = BookingService.confirm(booking, actor=request.user)
        except BookingTransitionError as exc:
            return Response(
                {"error": {"code": "INVALID_TRANSITION", "message": str(exc)}},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(BookingDetailSerializer(booking).data)


class BookingDeclineView(APIView):
    """PATCH /api/v1/bookings/{id}/decline/ — owner declines (pending_owner → declined)"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, id):
        booking = get_object_or_404(Booking, id=id, yacht__owner=request.user)
        reason = request.data.get("reason", "")
        try:
            booking = BookingService.decline(booking, actor=request.user, reason=reason)
        except BookingTransitionError as exc:
            return Response(
                {"error": {"code": "INVALID_TRANSITION", "message": str(exc)}},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(BookingDetailSerializer(booking).data)


class BookingCancelView(APIView):
    """PATCH /api/v1/bookings/{id}/cancel/ — customer cancels"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, id):
        booking = get_object_or_404(Booking, id=id, customer=request.user)
        try:
            booking = BookingService.cancel(booking, actor=request.user)
        except BookingTransitionError as exc:
            return Response(
                {"error": {"code": "INVALID_TRANSITION", "message": str(exc)}},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(BookingDetailSerializer(booking).data)


class YachtAvailabilityView(APIView):
    """
    GET  /api/v1/yachts/{id}/availability/ — public, returns 60-day calendar
    PUT  /api/v1/yachts/{id}/availability/ — owner sets availability dates (bulk upsert)
    """

    def get_permissions(self):
        if self.request.method == "PUT":
            return [IsAuthenticated()]
        return []

    def get(self, request, id):
        yacht = get_object_or_404(Yacht, id=id, status="active")
        today = datetime.date.today()
        end = today + datetime.timedelta(days=60)
        records = Availability.objects.filter(yacht=yacht, date__range=(today, end))
        return Response(AvailabilitySerializer(records, many=True).data)

    def put(self, request, id):
        yacht = get_object_or_404(Yacht, id=id, owner=request.user)
        serializer = AvailabilityWriteSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        results = []
        for item in serializer.validated_data:
            obj, _ = Availability.objects.update_or_create(
                yacht=yacht,
                date=item["date"],
                defaults={
                    "status": item["status"],
                    "price_override": item.get("price_override"),
                    "notes": item.get("notes", ""),
                },
            )
            results.append(obj)
        return Response(AvailabilitySerializer(results, many=True).data)
```

Wire in `backend/apps/bookings/urls.py` — append alongside existing yacht patterns:
```python
path("bookings/", views.BookingListCreateView.as_view(), name="booking-list-create"),
path("bookings/<uuid:id>/", views.BookingDetailView.as_view(), name="booking-detail"),
path("bookings/<uuid:id>/confirm/", views.BookingConfirmView.as_view(), name="booking-confirm"),
path("bookings/<uuid:id>/decline/", views.BookingDeclineView.as_view(), name="booking-decline"),
path("bookings/<uuid:id>/cancel/", views.BookingCancelView.as_view(), name="booking-cancel"),
path("yachts/<uuid:id>/availability/", views.YachtAvailabilityView.as_view(), name="yacht-availability"),
```

**Definition of done:**
- `POST /api/v1/bookings/` with valid payload returns HTTP 201 with booking JSON including `events` array containing one `created` event.
- `GET /api/v1/bookings/` for a customer returns only their bookings (not others).
- `GET /api/v1/bookings/` for an owner returns bookings for their yachts only.
- `PATCH /api/v1/bookings/{id}/confirm/` returns 409 if booking is not `pending_owner`.
- `PATCH /api/v1/bookings/{id}/decline/` persists `decline_reason` in the response.
- `PATCH /api/v1/bookings/{id}/cancel/` returns 409 if booking is already `completed`.
- `GET /api/v1/yachts/{id}/availability/` returns 60 days of records, no auth required.
- `PUT /api/v1/yachts/{id}/availability/` requires auth and yacht ownership; upserts records.
- `python manage.py check` passes.

---

### Phase C — Booking Web Pages

**Agent:** nextjs-page-agent
**Can start:** After Phase B endpoints are live and verifiable via curl.
**Depends on:** Phase B complete (Task B-3 specifically).

---

#### Task C-1 — Booking form page
**Agent:** nextjs-page-agent
**Depends on:** Task B-3 (POST /api/v1/bookings/ must be live)
**Files touched:**
- `web/app/[locale]/yachts/[id]/book/page.tsx` — create Client Component booking form
- `web/app/[locale]/yachts/[id]/book/loading.tsx` — create loading skeleton
- `web/messages/ar.json` — add `booking.*` i18n keys
- `web/messages/en.json` — add `booking.*` i18n keys

**What to build:**

This is a Client Component (`'use client'`). It receives the yacht `id` from params, fetches the yacht detail to show the name and price, and presents a booking form.

Required i18n keys to add:
```
booking.title, booking.startDate, booking.endDate, booking.passengers,
booking.totalAmount, booking.submit, booking.submitting, booking.success,
booking.error.generic, booking.error.dateRange, booking.error.capacity,
booking.perDay, booking.nights
```

Form fields:
- Start date (date input, `min` set to today)
- End date (date input, `min` set to start_date + 1)
- Number of passengers (number input, 1 to yacht.capacity)
- Calculated total amount displayed (read-only, updates reactively)

On submit:
- Call `POST /api/v1/bookings/` with `{yacht_id, start_date, end_date, num_passengers, departure_port_id}`.
- Use the yacht's `departure_port.id` from the fetched yacht detail for `departure_port_id`.
- On 201: redirect to `/[locale]/bookings/{booking.id}` (the booking detail page).
- On error: show the error message in the form.

The "Book Now" link on the yacht detail page (`web/app/[locale]/yachts/[id]/page.tsx`) must be updated to point to `/${locale}/yachts/${id}/book` — this activates the previously-disabled CTA from Sprint 2.

RTL rules: all Tailwind classes must use logical properties (`ms-`, `me-`, `ps-`, `pe-`, not `ml-`, `mr-`, `pl-`, `pr-`). The `dir` attribute is already set at the layout level.

**Definition of done:**
- Navigating to `/ar/yachts/{id}/book` renders the booking form in RTL.
- Navigating to `/en/yachts/{id}/book` renders the booking form in LTR.
- Submitting a valid form calls `POST /api/v1/bookings/` and redirects to the booking detail page.
- Total amount updates reactively when dates change.
- All text is via `t()` — no hardcoded Arabic or English strings in JSX.
- Unauthenticated users are redirected to login (wrap the page in `AuthGuard`).
- `npx tsc --noEmit` passes.

---

#### Task C-2 — Customer booking list page
**Agent:** nextjs-page-agent
**Depends on:** Task C-1 (depends on auth pattern established there)
**Files touched:**
- `web/app/[locale]/bookings/page.tsx` — replace stub with real Client Component using SWR
- `web/components/bookings/BookingCard.tsx` — create card component
- `web/messages/ar.json` — add `bookingList.*` keys
- `web/messages/en.json` — add `bookingList.*` keys

**What to build:**

This page already exists as a stub (`web/app/[locale]/(dashboard)/bookings/page.tsx`). Replace with a real Client Component that uses SWR to fetch `GET /api/v1/bookings/`.

Required i18n keys:
```
bookingList.title, bookingList.empty, bookingList.status.pending_owner,
bookingList.status.confirmed, bookingList.status.declined,
bookingList.status.cancelled, bookingList.status.completed,
bookingList.dates, bookingList.passengers, bookingList.total
```

`BookingCard.tsx` must show: yacht name (locale-aware), status badge (color-coded), start/end dates, total amount, and a link to the booking detail page.

Note: the stub is at `web/app/[locale]/(dashboard)/bookings/page.tsx`. The booking detail page created in Task C-3 should be at `web/app/[locale]/bookings/[id]/page.tsx` (outside the dashboard group, accessible to both customers and owners via direct link). Move or create accordingly.

**Definition of done:**
- `/ar/bookings` and `/en/bookings` render the customer's bookings.
- SWR fetches with the Authorization Bearer token from `useAuth()`.
- Status badges are color-coded (pending: yellow, confirmed: green, declined/cancelled: red).
- Empty state shows `bookingList.empty` message.
- Unauthenticated access redirects to login.
- `npx tsc --noEmit` passes.

---

#### Task C-3 — Booking detail page
**Agent:** nextjs-page-agent
**Depends on:** Task C-2
**Files touched:**
- `web/app/[locale]/bookings/[id]/page.tsx` — create Client Component with SWR
- `web/components/bookings/BookingTimeline.tsx` — create event timeline component
- `web/messages/ar.json` — add `bookingDetail.*` keys
- `web/messages/en.json` — add `bookingDetail.*` keys

**What to build:**

Client Component that uses SWR to fetch `GET /api/v1/bookings/{id}/` and displays:
- Booking header: yacht name, status badge, dates, total amount.
- Booking timeline: ordered list of `events[]` from the API showing event_type, actor_name, notes, and created_at timestamp.
- Cancel button: visible only when status is `pending_owner` or `confirmed`; calls `PATCH /api/v1/bookings/{id}/cancel/` on click.

Required i18n keys:
```
bookingDetail.title, bookingDetail.timeline, bookingDetail.cancelBooking,
bookingDetail.confirmCancel, bookingDetail.event.created,
bookingDetail.event.confirmed, bookingDetail.event.declined,
bookingDetail.event.cancelled, bookingDetail.event.completed,
bookingDetail.event.payment_received
```

**Definition of done:**
- `/ar/bookings/{id}` renders booking detail with timeline in RTL.
- Cancel button triggers the cancel endpoint and refreshes via SWR mutation.
- Event timeline lists all events in chronological order.
- `npx tsc --noEmit` passes.

---

### Phase D — Celery Async Tasks

**Agent:** celery-task-agent
**Can start:** After Phase A is complete (needs Booking model). Does not need Phase B or C.
**Depends on:** Task A-2.

---

#### Task D-1 — send_booking_request_notification task
**Agent:** celery-task-agent
**Depends on:** Task A-2 (Booking model)
**Files touched:**
- `backend/apps/bookings/tasks.py` — create file
- `backend/apps/bookings/apps.py` — ensure Celery autodiscover picks up tasks

**What to build:**

```python
"""Celery tasks for the bookings app.

All tasks are idempotent: they check the current state of the record before
acting, so re-running on retry does not cause duplicate side effects.
"""
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_booking_request_notification(self, booking_id: str) -> None:
    """Notify the yacht owner that a new booking request has arrived.

    Idempotency: checks booking.status == 'pending_owner' before sending.
    If the booking has already moved out of pending_owner (owner acted quickly),
    skip the notification to avoid confusion.
    """
    from apps.bookings.models import Booking, BookingStatus
    try:
        booking = Booking.objects.select_related("yacht__owner", "customer").get(id=booking_id)
    except Booking.DoesNotExist:
        return  # booking deleted or id wrong — nothing to do

    if booking.status != BookingStatus.PENDING_OWNER:
        return  # already acted on — idempotency guard

    owner = booking.yacht.owner
    customer = booking.customer
    if not owner.email:
        return

    try:
        send_mail(
            subject=f"New booking request — {booking.yacht.name}",
            message=(
                f"You have a new booking request from {customer.first_name} {customer.last_name}.\n"
                f"Dates: {booking.start_date} to {booking.end_date}\n"
                f"Passengers: {booking.num_passengers}\n"
                f"Total: {booking.total_amount} {booking.currency}\n\n"
                f"Log in to review and confirm or decline."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[owner.email],
            fail_silently=False,
        )
    except Exception as exc:
        raise self.retry(exc=exc)
```

Wire the task call into `BookingService.create_booking()` in `services.py` — after the atomic block commits, call:
```python
from apps.bookings.tasks import send_booking_request_notification
send_booking_request_notification.delay(str(booking.id))
```

Note: the `.delay()` call must happen OUTSIDE the `@transaction.atomic` decorator to avoid the task firing before the transaction commits. Use Django's `transaction.on_commit()` pattern:
```python
from django.db import transaction as db_transaction
db_transaction.on_commit(
    lambda: send_booking_request_notification.delay(str(booking.id))
)
```

**Definition of done:**
- `send_booking_request_notification` is idempotent: re-running it when `booking.status != 'pending_owner'` returns without sending an email.
- Task is retried up to 3 times with 60-second delay on SMTP failure.
- `on_commit()` ensures the task is not dispatched until the transaction commits.
- `python manage.py check` passes.

---

#### Task D-2 — auto_expire_pending_bookings beat task
**Agent:** celery-task-agent
**Depends on:** Task A-2, Task D-1
**Files touched:**
- `backend/apps/bookings/tasks.py` — append the beat task
- `backend/seaconnect/celery.py` — verify beat schedule entry
- `backend/config/settings/base.py` — add `BOOKING_OWNER_RESPONSE_HOURS = 2` setting

**What to build:**

Add to `backend/config/settings/base.py`:
```python
BOOKING_OWNER_RESPONSE_HOURS: int = env.int("BOOKING_OWNER_RESPONSE_HOURS", default=2)
```

Append to `backend/apps/bookings/tasks.py`:
```python
from celery import shared_task
from django.utils import timezone
from datetime import timedelta


@shared_task
def auto_expire_pending_bookings() -> dict:
    """
    Beat task: expire booking requests that have been pending for too long.

    Runs every 15 minutes via Celery Beat.
    Idempotency: only transitions bookings still in 'pending_owner' status
    that were created more than BOOKING_OWNER_RESPONSE_HOURS ago.
    """
    from django.conf import settings
    from apps.bookings.models import Booking, BookingStatus, BookingEvent, BookingEventType
    from django.db import transaction

    cutoff = timezone.now() - timedelta(hours=settings.BOOKING_OWNER_RESPONSE_HOURS)
    expired_qs = Booking.objects.filter(
        status=BookingStatus.PENDING_OWNER,
        created_at__lt=cutoff,
    )
    count = 0
    for booking in expired_qs:
        with transaction.atomic():
            booking.status = BookingStatus.DECLINED
            booking.decline_reason = "Auto-expired: owner did not respond in time."
            booking.save(update_fields=["status", "decline_reason", "updated_at"])
            BookingEvent.objects.create(
                booking=booking,
                event_type=BookingEventType.DECLINED,
                actor=None,
                notes="System auto-expire — no owner response within the allowed window.",
            )
        count += 1
    return {"expired": count}
```

Add to Celery Beat schedule in `backend/seaconnect/celery.py`:
```python
app.conf.beat_schedule = {
    "auto-expire-pending-bookings": {
        "task": "apps.bookings.tasks.auto_expire_pending_bookings",
        "schedule": 900.0,  # every 15 minutes
    },
}
```

**Definition of done:**
- `auto_expire_pending_bookings` only touches bookings with `status='pending_owner'` older than `BOOKING_OWNER_RESPONSE_HOURS`.
- Each expired booking gets a `BookingEvent` with `event_type='declined'` and `actor=None`.
- Running the task twice produces no duplicate events (bookings are no longer `pending_owner` after the first run).
- `BOOKING_OWNER_RESPONSE_HOURS` is configurable via environment variable.
- `python manage.py check` passes.

---

### Phase E — Tests

**Agent:** test-writer-agent
**Can start:** After Phase A and Phase B are fully complete.
**Depends on:** Task A-2, Task B-3.

---

#### Task E-1 — Booking state machine tests
**Agent:** test-writer-agent
**Depends on:** Task A-2 (`BookingService` in `services.py`)
**Files touched:**
- `backend/apps/bookings/tests/__init__.py` — ensure it exists
- `backend/apps/bookings/tests/test_booking_state_machine.py` — create test file

**What to build:**

Create `backend/apps/bookings/tests/test_booking_state_machine.py`. Use `@pytest.mark.django_db` and real DB (no mocks). Reuse existing fixtures from `backend/tests/conftest.py` where available (`egypt_region`, `departure_port`, `customer_user`, `owner_user`, `active_yacht`).

Tests to include:

Valid transitions:
- `test_create_booking_sets_pending_owner` — assert status is `pending_owner` after `create_booking()`.
- `test_create_booking_inserts_created_event` — assert exactly one `BookingEvent` with `event_type='created'` exists after `create_booking()`.
- `test_confirm_booking_sets_confirmed` — create a pending booking, call `confirm()`, assert status is `confirmed`.
- `test_confirm_booking_inserts_confirmed_event` — after confirm, assert `BookingEvent` with `event_type='confirmed'` exists.
- `test_decline_booking_sets_declined` — after decline, assert status is `declined` and `decline_reason` is persisted.
- `test_cancel_pending_booking` — cancel a `pending_owner` booking, assert status is `cancelled`.
- `test_cancel_confirmed_booking` — cancel a `confirmed` booking, assert status is `cancelled`.

Invalid transitions:
- `test_cannot_confirm_declined_booking` — attempt to confirm a declined booking, assert `BookingTransitionError` is raised.
- `test_cannot_decline_confirmed_booking` — attempt to decline a confirmed booking, assert `BookingTransitionError`.
- `test_cannot_cancel_completed_booking` — attempt to cancel a completed booking, assert `BookingTransitionError`.

Atomic guarantee:
- `test_state_change_rolls_back_if_event_insert_fails` — mock `BookingEvent.objects.create` to raise `Exception`, call `confirm()`, assert the booking status has NOT changed (the transaction rolled back).

**Definition of done:**
- `pytest backend/apps/bookings/tests/test_booking_state_machine.py -v` all tests pass.
- Each valid transition test asserts the exact `BookingEvent` count after the transition.
- The rollback test proves atomicity of the state change + event insert.

---

#### Task E-2 — Booking API endpoint tests
**Agent:** test-writer-agent
**Depends on:** Task B-3, Task E-1 (reuse fixtures)
**Files touched:**
- `backend/apps/bookings/tests/test_booking_api.py` — create test file

**What to build:**

Create `backend/apps/bookings/tests/test_booking_api.py`:

Permission tests:
- `test_customer_cannot_confirm_booking` — a customer attempts to PATCH confirm on a booking they own; assert 404 (they are not the yacht owner).
- `test_owner_cannot_book_own_yacht` — owner POSTs to `/bookings/` with their own yacht; the create endpoint should succeed (booking is valid), but assert the booking is created for the correct customer.
- `test_unauthenticated_cannot_list_bookings` — GET `/bookings/` without token returns 401.
- `test_customer_cannot_see_other_customers_bookings` — two customers, each with a booking; assert that customer A cannot retrieve customer B's booking via GET `/bookings/{id}/`.

Booking creation:
- `test_create_booking_returns_201_with_events` — POST valid payload, assert 201, assert response contains `events` array with one item of type `created`.
- `test_create_booking_end_before_start_returns_400` — POST with `end_date < start_date`, assert 400.
- `test_create_booking_for_inactive_yacht_returns_404` — POST with a draft yacht's ID, assert 404.

Owner actions:
- `test_owner_confirm_booking` — owner PATCH `/bookings/{id}/confirm/`, assert 200 and `status == 'confirmed'` in response.
- `test_owner_decline_booking_with_reason` — owner PATCH `/bookings/{id}/decline/` with `{"reason": "Not available"}`, assert `decline_reason` in response.
- `test_confirm_already_confirmed_returns_409` — assert 409 CONFLICT on duplicate confirm.

Availability:
- `test_availability_get_public` — GET `yachts/{id}/availability/` without auth returns 200.
- `test_availability_put_requires_auth` — PUT without auth returns 401.
- `test_availability_put_by_non_owner_returns_404` — PUT by a user who does not own the yacht returns 404.
- `test_availability_upsert` — PUT with two date records; GET and assert both records exist.

**Definition of done:**
- `pytest backend/apps/bookings/tests/test_booking_api.py -v` all tests pass.
- No test relies on `seed_yachts` — all fixtures created within the test.

---

## Agent Coordination Notes

### Dependency order

```
Week 1 — Days 1-5 (2026-04-28 to 2026-05-02):
  Day 1:   Phase A — django-model-agent builds Availability, Booking, BookingEvent, BookingService
  Day 1-2: Task B-1 — api-endpoint-agent fixes DeparturePortNestedSerializer (unblocks existing yacht tests)
  Day 2-3: Phase B (B-2, B-3) — api-endpoint-agent builds booking serializers + views (needs A done)
            Phase D (D-1, D-2) — celery-task-agent works in parallel with Phase B (only needs A-2)
  Day 4-5: Phase C — nextjs-page-agent builds booking web pages (needs B-3 live)

Week 2 — Days 6-8 (2026-05-02 to 2026-05-05):
  Day 6-7: Phase E — test-writer-agent writes all booking tests (needs A + B complete)
  Day 7-8: Integration smoke test. Fix any failures. Update HANDOFFS.md and AGENT-COSTS.md.
```

### File conflict zones

| File | Agents writing | Resolution |
|------|---------------|------------|
| `backend/apps/bookings/models.py` | django-model-agent (A-1, A-2) | Sequential — one session appends Availability then Booking + BookingEvent |
| `backend/apps/bookings/serializers.py` | api-endpoint-agent (B-1, B-2) | Sequential — B-1 fixes existing, B-2 appends new serializers |
| `backend/apps/bookings/views.py` | api-endpoint-agent (B-3) | Appends only — does not touch existing YachtListView/YachtDetailView |
| `backend/apps/bookings/urls.py` | api-endpoint-agent (B-3) | Appends new URL patterns only |
| `backend/apps/bookings/tasks.py` | celery-task-agent (D-1, D-2) | Sequential — D-2 appends after D-1 |
| `web/messages/ar.json` | nextjs-page-agent (C-1, C-2, C-3) | Sequential — each task adds a new top-level key namespace |
| `web/messages/en.json` | nextjs-page-agent (C-1, C-2, C-3) | Same |

### Critical implementation notes

1. `BookingEvent` must NOT inherit `TimeStampedModel` — it is append-only and `TimeStampedModel` adds `updated_at`, which is semantically incorrect for an immutable event log.
2. `BookingService` state transitions must use `transaction.atomic()`. The view layer must call `BookingService`, never `booking.status = ... ; booking.save()` directly.
3. The Celery notification task must be dispatched via `transaction.on_commit()`, not directly inside the `@transaction.atomic` block, to avoid firing before the transaction commits.
4. The "Book Now" link on `web/app/[locale]/yachts/[id]/page.tsx` was left as a dead link in Sprint 2. Task C-1 must update it to point to `/${locale}/yachts/${id}/book`.
5. `StandardCursorPagination` from `apps.core.pagination` must be imported in the booking views — it already exists from Sprint 1. Do not create a second pagination class.
6. Owner cannot book their own yacht: `BookingListCreateView.create()` should not add this validation — the business constraint is enforced at the payment step (Sprint 4). However, a test documents the expected behavior for future reference.

---

## Token Budget

| Agent | Phase | Estimated tokens | Purpose |
|-------|-------|-----------------|---------|
| django-model-agent | A | 22,000 | Availability model, Booking model, BookingEvent model, BookingService |
| api-endpoint-agent | B | 25,000 | Serializer fix + new serializers, booking views, permission classes |
| nextjs-page-agent | C | 35,000 | Booking form, customer list, booking detail with timeline |
| celery-task-agent | D | 12,000 | Notification task + beat auto-expire task |
| test-writer-agent | E | 25,000 | State machine tests + API endpoint tests |
| **Total** | | **119,000** | |
| **Sprint 1 estimate** | | ~74,500 | Actuals TBD |
| **Sprint 2 estimate** | | ~118,500 | Actuals TBD |
| **Sprint 3 estimate** | | ~119,000 | |
| **Cumulative estimate** | | ~312,000 | Of 500,000 sprint budget |
| **Budget remaining** | | ~188,000 | |

---

## Risk Flags

- The `is_deleted` field referenced in `YachtListView.get_queryset()` in Sprint 2 (`filter(status="active", is_active=True)`) does not match the actual Yacht model field names — the model uses `is_deleted`, not `is_active`. The api-endpoint-agent must verify this when touching `views.py` in Task B-3.
- Celery Beat requires a running Redis broker. The Docker Compose stack already includes Redis from Sprint 1. Confirm `CELERY_BROKER_URL` is set correctly in the dev environment before running D-2.
- The `departure_port_id` field in `BookingCreateSerializer` requires the customer to know the departure port UUID. The booking form (Task C-1) must fetch the yacht detail first and use its `departure_port.id`. This creates a UI dependency: the booking form page must make two API calls — one for the yacht detail, one to POST the booking.
- `BOOKING_OWNER_RESPONSE_HOURS = 2` is intentionally aggressive for testing. The Celery beat task runs every 15 minutes, so in dev it will auto-expire bookings within 2 hours. Adjust via environment variable if needed during manual testing.

---

## Definition of Sprint Done

- [ ] `POST /api/v1/bookings/` creates a booking with `status='pending_owner'` and one BookingEvent.
- [ ] `GET /api/v1/bookings/` returns the authenticated user's bookings (scoped by role).
- [ ] `GET /api/v1/bookings/{id}/` returns full detail including event timeline.
- [ ] `PATCH /api/v1/bookings/{id}/confirm/` transitions to `confirmed` (owner only).
- [ ] `PATCH /api/v1/bookings/{id}/decline/` transitions to `declined` with optional reason (owner only).
- [ ] `PATCH /api/v1/bookings/{id}/cancel/` transitions to `cancelled` (customer only).
- [ ] `GET /api/v1/yachts/{id}/availability/` returns 60-day calendar without auth.
- [ ] `PUT /api/v1/yachts/{id}/availability/` upserts availability records (owner only).
- [ ] `DeparturePortNestedSerializer` field mismatch is fixed — all yacht API tests pass.
- [ ] All state transitions are wrapped in `transaction.atomic()` + BookingEvent insert.
- [ ] Invalid state transitions raise `BookingTransitionError` and return HTTP 409.
- [ ] `send_booking_request_notification` Celery task fires on booking creation via `on_commit()`.
- [ ] `auto_expire_pending_bookings` beat task runs every 15 minutes and is idempotent.
- [ ] `/[locale]/yachts/[id]/book` booking form submits and redirects to booking detail.
- [ ] `/[locale]/bookings` customer list renders with SWR and status badges.
- [ ] `/[locale]/bookings/[id]` detail page shows event timeline and cancel button.
- [ ] All state machine tests pass (`pytest backend/apps/bookings/tests/test_booking_state_machine.py`).
- [ ] All API endpoint tests pass (`pytest backend/apps/bookings/tests/test_booking_api.py`).
- [ ] `python manage.py check` passes.
- [ ] `npx tsc --noEmit` passes in `web/`.
- [ ] `HANDOFFS.md` updated with Sprint 3 → Sprint 4 handoff entry.
- [ ] `AGENT-COSTS.md` updated with Sprint 3 actual token row.
