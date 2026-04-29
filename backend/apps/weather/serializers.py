"""DRF serializers for the weather app."""
from rest_framework import serializers

from .models import FishingSeason, FishingSpecies, WeatherCache


class WeatherSerializer(serializers.ModelSerializer):
    port_name_en = serializers.CharField(source="port.name_en", read_only=True)
    port_name_ar = serializers.CharField(source="port.name_ar", read_only=True)

    class Meta:
        model = WeatherCache
        fields = [
            "port_name_en",
            "port_name_ar",
            "wind_speed_kmh",
            "wind_direction_deg",
            "wave_height_m",
            "wave_period_s",
            "temperature_c",
            "weather_code",
            "advisory_level",
            "fetched_at",
        ]


class FishingSpeciesSerializer(serializers.ModelSerializer):
    class Meta:
        model = FishingSpecies
        fields = ["id", "name", "name_ar", "scientific_name", "image_url"]


class FishingSeasonSerializer(serializers.ModelSerializer):
    species = FishingSpeciesSerializer(read_only=True)

    class Meta:
        model = FishingSeason
        fields = ["species", "month", "is_peak"]
