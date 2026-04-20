"""Django admin registration for core models."""
from django.contrib import admin

from .models import DeparturePort, FeatureFlag, Region


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ("code", "name_en", "name_ar", "currency", "timezone", "is_active", "launched_at")
    list_filter = ("is_active",)
    search_fields = ("code", "name_en", "name_ar", "currency")
    ordering = ("code",)


@admin.register(DeparturePort)
class DeparturePortAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ("name_en", "name_ar", "city_en", "region", "latitude", "longitude", "is_active")
    list_filter = ("is_active", "region")
    search_fields = ("name_en", "name_ar", "city_en", "city_ar")
    ordering = ("region__code", "name_en")


@admin.register(FeatureFlag)
class FeatureFlagAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ("key", "is_enabled", "region", "description")
    list_filter = ("is_enabled", "region")
    search_fields = ("key", "description")
    ordering = ("key",)
