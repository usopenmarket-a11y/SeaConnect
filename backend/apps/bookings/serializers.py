from rest_framework import serializers

from .models import (
    Availability,
    Booking,
    BookingEvent,
    Yacht,
    YachtMedia,
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
