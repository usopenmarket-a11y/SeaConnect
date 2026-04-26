from rest_framework import serializers

from .models import Yacht, YachtMedia


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
