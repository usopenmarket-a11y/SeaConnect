"""Weather and fishing season models — Sprint 5.

ADR compliance:
  ADR-001 — UUID PKs, ORM only (no raw SQL)
  ADR-016 — Never call Open-Meteo from request handler without Redis cache check first.
             Cache key: sc:weather:{port_id}:v1, TTL 6 hours.
"""
import uuid

from django.db import models

from apps.core.models import DeparturePort, TimeStampedModel


class WeatherCache(TimeStampedModel):
    """Cached weather data from Open-Meteo. One record per port. Overwritten on each fetch.

    Redis is the primary cache (6h TTL). This DB record is the fallback on Redis cold start.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    port = models.OneToOneField(
        DeparturePort,
        on_delete=models.CASCADE,
        related_name="weather_cache",
    )
    wind_speed_kmh = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    wind_direction_deg = models.SmallIntegerField(null=True, blank=True)
    wave_height_m = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    wave_period_s = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    temperature_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    weather_code = models.SmallIntegerField(
        null=True,
        blank=True,
        help_text="WMO weather interpretation code.",
    )
    advisory_level = models.CharField(
        max_length=10,
        choices=[("safe", "Safe"), ("caution", "Caution"), ("danger", "Danger")],
        default="safe",
    )
    fetched_at = models.DateTimeField(
        help_text="UTC timestamp when fetched from Open-Meteo.",
    )

    class Meta:
        db_table = "weather_cache"

    def __str__(self) -> str:
        return f"Weather @ {self.port.name_en} — {self.advisory_level}"


class FishingSpecies(TimeStampedModel):
    """A fish species found in Egyptian waters."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    name_ar = models.CharField(max_length=100)
    scientific_name = models.CharField(max_length=150, blank=True)
    image_url = models.URLField(max_length=500, blank=True)

    class Meta:
        db_table = "weather_fishing_species"
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name_ar} / {self.name}"


class FishingSeason(TimeStampedModel):
    """Records which months a species is in season at a specific departure port.

    month is 1–12. One record per (species, port, month).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    species = models.ForeignKey(
        FishingSpecies,
        on_delete=models.CASCADE,
        related_name="seasons",
    )
    port = models.ForeignKey(
        DeparturePort,
        on_delete=models.CASCADE,
        related_name="fishing_seasons",
    )
    month = models.SmallIntegerField(choices=[(i, i) for i in range(1, 13)])
    is_peak = models.BooleanField(default=False)

    class Meta:
        db_table = "weather_fishing_season"
        unique_together = [("species", "port", "month")]
        ordering = ["species", "port", "month"]

    def __str__(self) -> str:
        return f"{self.species.name} @ {self.port.name_en} — month {self.month}"
