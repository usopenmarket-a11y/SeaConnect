"""Core models shared across the entire SeaConnect platform.

ADR compliance:
  ADR-001 — UUID PKs, ORM only (no raw SQL)
  ADR-018 — Region model with explicit currency (ISO 4217); never hardcode 'EGP'
"""
import uuid

from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base model that adds ``created_at`` and ``updated_at`` timestamps.

    All SeaConnect models must inherit from this class instead of
    ``django.db.models.Model`` directly.
    """

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class Region(TimeStampedModel):
    """Geographic and economic region used for multi-region deployment.

    Each region has its own currency, timezone, and activation status.
    All location-specific models carry a FK to this table.

    Seed data lives in migration 0002_seed_egypt.py.

    ADR-018: currency is an explicit ISO 4217 code — never hardcode 'EGP'
    in application logic.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(
        max_length=10,
        unique=True,
        help_text="Short region identifier, e.g. 'sa-egy', 'sa-uae'.",
    )
    name_ar = models.CharField(max_length=100, help_text="Arabic display name.")
    name_en = models.CharField(max_length=100, help_text="English display name.")
    currency = models.CharField(
        max_length=3,
        help_text="ISO 4217 currency code, e.g. 'EGP', 'AED', 'SAR'.",
    )
    timezone = models.CharField(
        max_length=50,
        help_text="IANA timezone string, e.g. 'Africa/Cairo', 'Asia/Dubai'.",
    )
    is_active = models.BooleanField(
        default=False,
        help_text="Only active regions are visible to end users.",
    )
    launched_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="UTC timestamp when this region went live.",
    )

    class Meta:
        db_table = "core_region"
        ordering = ["-created_at"]
        verbose_name = "Region"
        verbose_name_plural = "Regions"

    def __str__(self) -> str:
        return f"{self.name_en} ({self.code})"


class DeparturePort(TimeStampedModel):
    """Physical port or marina from which boat trips depart.

    Coordinates use DECIMAL(9,6) which gives ~0.1m precision — adequate for
    harbour-level geocoding.  Any model that associates a booking or yacht
    with a port references this table.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    region = models.ForeignKey(
        Region,
        on_delete=models.PROTECT,
        related_name="departure_ports",
        help_text="Region this port belongs to.",
    )
    name_en = models.CharField(max_length=255, help_text="English port name.")
    name_ar = models.CharField(max_length=255, help_text="Arabic port name (primary).")
    city_en = models.CharField(max_length=100, help_text="City in English.")
    city_ar = models.CharField(max_length=100, help_text="City in Arabic.")
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        help_text="WGS-84 latitude, e.g. 31.200092.",
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        help_text="WGS-84 longitude, e.g. 29.918739.",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Inactive ports are hidden from booking flow.",
    )

    class Meta:
        db_table = "core_departure_port"
        ordering = ["-created_at"]
        verbose_name = "Departure Port"
        verbose_name_plural = "Departure Ports"

    def __str__(self) -> str:
        return f"{self.name_en} — {self.city_en}"


class FeatureFlag(TimeStampedModel):
    """Runtime feature toggle stored in the database.

    Allows enabling/disabling features per-region or globally without deploys.
    Cache key pattern: ``sc:feature:{key}:v1``  (TTL: 300 seconds)
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique feature key, e.g. 'competitions.enabled'.",
    )
    is_enabled = models.BooleanField(
        default=False,
        help_text="Master toggle — if False the feature is off regardless of region.",
    )
    description = models.TextField(
        blank=True,
        help_text="Human-readable description of what this flag controls.",
    )
    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feature_flags",
        help_text="If set, this flag applies only to the specified region.",
    )

    class Meta:
        db_table = "core_feature_flag"
        ordering = ["-created_at"]
        verbose_name = "Feature Flag"
        verbose_name_plural = "Feature Flags"

    def __str__(self) -> str:
        status = "on" if self.is_enabled else "off"
        region_suffix = f" [{self.region.code}]" if self.region_id else " [global]"
        return f"{self.key} ({status}){region_suffix}"
