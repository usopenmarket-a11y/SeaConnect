"""Serializers for core models."""
from rest_framework import serializers

from .models import DeparturePort, Region


class RegionSerializer(serializers.ModelSerializer[Region]):
    class Meta:
        model = Region
        fields = [
            "id",
            "code",
            "name_ar",
            "name_en",
            "currency",
            "timezone",
            "is_active",
            "launched_at",
        ]
        read_only_fields = fields


class DeparturePortSerializer(serializers.ModelSerializer[DeparturePort]):
    region_code = serializers.CharField(source="region.code", read_only=True)
    region_currency = serializers.CharField(source="region.currency", read_only=True)

    class Meta:
        model = DeparturePort
        fields = [
            "id",
            "region",
            "region_code",
            "region_currency",
            "name_ar",
            "name_en",
            "city_ar",
            "city_en",
            "latitude",
            "longitude",
            "is_active",
        ]
        read_only_fields = fields
