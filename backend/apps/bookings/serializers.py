from rest_framework import serializers

from apps.core.validators import validate_image_upload

from .models import (
    Availability,
    Booking,
    BookingEvent,
    Dispute,
    Yacht,
    YachtMedia,
    YachtReview,
)


class YachtMediaSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    class Meta:
        model = YachtMedia
        fields = ["id", "url", "media_type", "is_primary", "order"]


class DeparturePortNestedSerializer(serializers.Serializer):  # type: ignore[type-arg]
    id = serializers.UUIDField()
    name_en = serializers.CharField()
    name_ar = serializers.CharField()
    city_en = serializers.CharField()
    city_ar = serializers.CharField()


class RegionNestedSerializer(serializers.Serializer):  # type: ignore[type-arg]
    id = serializers.UUIDField()
    code = serializers.CharField()
    name_en = serializers.CharField()
    name_ar = serializers.CharField()
    currency = serializers.CharField()


class OwnerNestedSerializer(serializers.Serializer):  # type: ignore[type-arg]
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()


class YachtListSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    departure_port = DeparturePortNestedSerializer(read_only=True)
    region = RegionNestedSerializer(read_only=True)
    primary_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Yacht
        fields = [
            "id",
            "name",
            "name_ar",
            "capacity",
            "price_per_day",
            "currency",
            "yacht_type",
            "status",
            "departure_port",
            "region",
            "primary_image_url",
            "created_at",
        ]

    def get_primary_image_url(self, obj: Yacht) -> str | None:
        primary = next((m for m in obj.media.all() if m.is_primary), None)
        if primary:
            return primary.url
        first = next(iter(obj.media.all()), None)
        return first.url if first else None


class YachtDetailSerializer(YachtListSerializer):
    media = YachtMediaSerializer(many=True, read_only=True)
    owner = OwnerNestedSerializer(read_only=True)

    class Meta(YachtListSerializer.Meta):
        fields = YachtListSerializer.Meta.fields + [
            "description",
            "description_ar",
            "media",
            "owner",
        ]


# ---------------------------------------------------------------------------
# Sprint 3 — Booking + BookingEvent + Availability serializers
# ---------------------------------------------------------------------------


class BookingEventSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Read-only serializer for a single immutable booking event (ADR-012)."""

    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = BookingEvent
        fields = [
            "id",
            "event_type",
            "actor_name",
            "notes",
            "metadata",
            "created_at",
        ]

    def get_actor_name(self, obj: BookingEvent) -> str | None:
        if obj.actor_id and obj.actor:
            full = f"{obj.actor.first_name} {obj.actor.last_name}".strip()
            return full or obj.actor.email
        return None


class BookingListSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Compact serializer for ``GET /api/v1/bookings/``.

    Excludes the events array to keep list payloads small.
    """

    yacht_name = serializers.CharField(source="yacht.name", read_only=True)
    yacht_name_ar = serializers.CharField(source="yacht.name_ar", read_only=True)
    yacht_id = serializers.UUIDField(source="yacht.id", read_only=True)
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "yacht_id",
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
        full = f"{obj.customer.first_name} {obj.customer.last_name}".strip()
        return full or obj.customer.email


class BookingDetailSerializer(BookingListSerializer):
    """Full booking detail including the immutable event timeline."""

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


class BookingCreateSerializer(serializers.Serializer):  # type: ignore[type-arg]
    """Write serializer for ``POST /api/v1/bookings/``.

    Customer-facing — validates date order; everything else (yacht active,
    departure port exists, capacity respect) is enforced in the view.
    """

    yacht_id = serializers.UUIDField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    num_passengers = serializers.IntegerField(min_value=1)
    departure_port_id = serializers.UUIDField()

    def validate(self, data: dict) -> dict:  # type: ignore[override]
        if data["end_date"] <= data["start_date"]:
            raise serializers.ValidationError(
                {"end_date": "end_date must be after start_date."},
            )
        return data


class AvailabilitySerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Read serializer for ``GET /api/v1/yachts/{id}/availability/``."""

    class Meta:
        model = Availability
        fields = ["date", "status", "price_override"]


class AvailabilityWriteSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Write serializer for the bulk availability upsert PUT endpoint."""

    class Meta:
        model = Availability
        fields = ["date", "status", "price_override", "notes"]
        extra_kwargs = {
            "notes": {"required": False, "allow_blank": True},
            "price_override": {"required": False, "allow_null": True},
        }


# ---------------------------------------------------------------------------
# Sprint 10A — Yacht owner CRUD serializers
# ---------------------------------------------------------------------------


class YachtCreateSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Write serializer for ``POST /api/v1/yachts/`` (owner creates a yacht).

    ``owner``, ``status``, and ``region`` are set server-side in the view —
    never accepted from the request body.

    ADR-018: ``currency`` must come from the departure port's region at
    creation time.  The view resolves this via ``perform_create``; the field
    is accepted here only as an optional override when the port's region has
    no currency configured (edge-case safety valve — normally absent from the
    request).
    """

    class Meta:
        model = Yacht
        fields = [
            "name",
            "name_ar",
            "description",
            "description_ar",
            "capacity",
            "price_per_day",
            "currency",
            "yacht_type",
            "departure_port",
        ]
        extra_kwargs = {
            "description": {"required": False, "allow_blank": True},
            "description_ar": {"required": False, "allow_blank": True},
            "currency": {"required": False},
        }

    def validate_capacity(self, value: int) -> int:
        if value < 1:
            raise serializers.ValidationError("capacity must be at least 1.")
        return value

    def validate_price_per_day(self, value):  # type: ignore[override]
        if value <= 0:
            raise serializers.ValidationError("price_per_day must be greater than zero.")
        return value


class YachtUpdateSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Write serializer for ``PATCH /api/v1/yachts/{id}/`` (owner partial update).

    All fields optional — only provided fields are updated.  Owner can toggle
    status between draft / active / inactive.  ``owner`` and ``region`` are
    immutable after creation and not exposed here.
    """

    class Meta:
        model = Yacht
        fields = [
            "name",
            "name_ar",
            "description",
            "description_ar",
            "capacity",
            "price_per_day",
            "currency",
            "yacht_type",
            "departure_port",
            "status",
        ]
        extra_kwargs = {
            "name": {"required": False},
            "name_ar": {"required": False},
            "description": {"required": False, "allow_blank": True},
            "description_ar": {"required": False, "allow_blank": True},
            "capacity": {"required": False},
            "price_per_day": {"required": False},
            "currency": {"required": False},
            "yacht_type": {"required": False},
            "departure_port": {"required": False},
            "status": {"required": False},
        }

    def validate_capacity(self, value: int) -> int:
        if value < 1:
            raise serializers.ValidationError("capacity must be at least 1.")
        return value

    def validate_price_per_day(self, value):  # type: ignore[override]
        if value <= 0:
            raise serializers.ValidationError("price_per_day must be greater than zero.")
        return value


# ---------------------------------------------------------------------------
# Sprint 12A — Yacht photo upload serializers
# ---------------------------------------------------------------------------


class YachtPhotoUploadSerializer(serializers.Serializer):  # type: ignore[type-arg]
    """Request serializer for ``POST /api/v1/yachts/{id}/photos/``.

    Accepts a multipart/form-data body:
      - ``file``      — required image file (JPEG / PNG / WebP, max 10 MB)
      - ``caption``   — optional human-readable caption stored as ``url``
                        metadata (future field); ignored in current model
                        but accepted so clients can pass it without error.
      - ``is_cover``  — if True, mark this photo as the primary image and
                        clear the is_primary flag on all existing media for
                        the same yacht.

    Validation is input-only; the serializer does not write to the DB.
    All DB work is done in the view to keep the service boundary clear.
    """

    file = serializers.ImageField(
        help_text="Image file (JPEG / PNG / WebP). Max 10 MB.",
    )
    caption = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=500,
        help_text="Optional caption displayed below the photo.",
    )
    is_cover = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Set to true to make this the primary cover image.",
    )

    def validate_file(self, value):  # type: ignore[override]
        """Run the shared image upload validator, converting Django ValidationError to DRF."""
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_image_upload(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message) from exc
        return value


class YachtPhotoResponseSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Response serializer for the yacht photo upload and delete endpoints."""

    is_cover = serializers.BooleanField(source="is_primary", read_only=True)
    caption = serializers.SerializerMethodField()

    class Meta:
        model = YachtMedia
        fields = ["id", "url", "is_cover", "caption", "order", "created_at"]

    def get_caption(self, obj: YachtMedia) -> str:
        # Caption is not a model field yet; return empty string for API stability.
        return ""


# ---------------------------------------------------------------------------
# Sprint 12A — YachtReview serializers
# ---------------------------------------------------------------------------


class YachtReviewSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Read serializer for GET /api/v1/yachts/{id}/reviews/.

    ``customer_name`` is a derived field — never exposes PII beyond the
    display name agreed in the API spec.
    """

    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = YachtReview
        fields = ["id", "rating", "title", "body", "customer_name", "created_at"]
        read_only_fields = fields

    def get_customer_name(self, obj: YachtReview) -> str:
        full = f"{obj.customer.first_name} {obj.customer.last_name}".strip()
        return full or obj.customer.email


class YachtReviewWriteSerializer(serializers.Serializer):  # type: ignore[type-arg]
    """Write serializer for POST /api/v1/yachts/{id}/reviews/.

    Validates rating (1–5), title (optional), and body (required, min 10 chars).
    All business-rule checks (completed booking, no duplicate) are in the view.
    """

    rating = serializers.IntegerField(min_value=1, max_value=5)
    title = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=200,
        default="",
    )
    body = serializers.CharField(min_length=10, max_length=5000)


# ---------------------------------------------------------------------------
# Sprint 13B — Dispute serializers
# ---------------------------------------------------------------------------


class DisputeSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Read serializer for disputes — used in both admin list and create responses.

    ``booking_ref`` returns the short booking UUID string as a reference.
    ``raised_by_name`` returns the display name of the user who raised it.
    """

    booking_id = serializers.UUIDField(source="booking.id", read_only=True)
    booking_ref = serializers.SerializerMethodField()
    raised_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Dispute
        fields = [
            "id",
            "booking_id",
            "booking_ref",
            "raised_by_name",
            "reason",
            "status",
            "resolution",
            "created_at",
        ]
        read_only_fields = fields

    def get_booking_ref(self, obj) -> str:  # type: ignore[override]
        # Short UUID reference (first 8 chars) matching the admin table display.
        return str(obj.booking_id)[:8].upper()

    def get_raised_by_name(self, obj) -> str:  # type: ignore[override]
        full = f"{obj.raised_by.first_name} {obj.raised_by.last_name}".strip()
        return full or obj.raised_by.email


class DisputeCreateSerializer(serializers.Serializer):  # type: ignore[type-arg]
    """Write serializer for POST /api/v1/bookings/{id}/dispute/.

    Only accepts ``reason`` — ``booking`` comes from the URL and ``raised_by``
    is set from ``request.user`` in the view.
    """

    reason = serializers.CharField(
        min_length=10,
        max_length=500,
        help_text="Description of the dispute (10–500 chars; Arabic accommodated).",
    )


class DisputeResolveSerializer(serializers.Serializer):  # type: ignore[type-arg]
    """Write serializer for POST /api/v1/admin/disputes/{id}/resolve/.

    Accepts only ``resolution`` text.  Status, resolved_by, and resolved_at
    are set server-side in the view.
    """

    resolution = serializers.CharField(
        min_length=5,
        max_length=5000,
        help_text="Admin resolution note (5–5000 chars).",
    )
