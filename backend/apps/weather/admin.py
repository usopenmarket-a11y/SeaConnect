"""Django admin registrations for the weather app."""
from django.contrib import admin

from .models import FishingSeason, FishingSpecies, WeatherCache


@admin.register(WeatherCache)
class WeatherCacheAdmin(admin.ModelAdmin):
    list_display = ["port", "advisory_level", "wave_height_m", "wind_speed_kmh", "fetched_at"]
    readonly_fields = ["id", "fetched_at", "created_at", "updated_at"]


@admin.register(FishingSpecies)
class FishingSpeciesAdmin(admin.ModelAdmin):
    list_display = ["name_ar", "name", "scientific_name"]


@admin.register(FishingSeason)
class FishingSeasonAdmin(admin.ModelAdmin):
    list_display = ["species", "port", "month", "is_peak"]
    list_filter = ["port", "is_peak"]
