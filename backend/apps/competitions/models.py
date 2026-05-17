"""Competitions app models — Sprint 6.

Implements fishing competition lifecycle: Competition → CompetitionEntry → CatchLog.

ADR compliance:
  ADR-001 — UUID PKs, ORM only (no raw SQL)
  ADR-018 — Region FK on Competition; currency never hardcoded
"""
import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Competition(TimeStampedModel):
    """A fishing competition event open to registered users.

    Competitions belong to a Region and optionally depart from a specific port.
    Entry fees and prize pools use DecimalField with an explicit currency derived
    from region.currency at runtime — never hardcoded (ADR-018).
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"
        ONGOING = "ongoing", "Ongoing"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(
        max_length=200,
        help_text="Arabic competition name (primary).",
    )
    title_en = models.CharField(
        max_length=200,
        help_text="English competition name.",
    )
    description = models.TextField(blank=True)
    region = models.ForeignKey(
        "core.Region",
        on_delete=models.PROTECT,
        related_name="competitions",
        help_text="Region this competition runs in. Currency is derived from region.currency.",
    )
    departure_port = models.ForeignKey(
        "core.DeparturePort",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="competitions",
        help_text="Optional departure port for this competition.",
    )
    start_date = models.DateField()
    end_date = models.DateField()
    registration_deadline = models.DateTimeField(
        help_text="UTC deadline after which no new entries are accepted.",
    )
    entry_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Entry fee amount. Currency comes from region.currency (ADR-018).",
    )
    prize_pool = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Total prize pool. Currency comes from region.currency (ADR-018).",
    )
    max_participants = models.PositiveIntegerField(
        default=100,
        help_text="Maximum number of confirmed participants allowed.",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    rules = models.TextField(blank=True, help_text="Competition rules and scoring criteria.")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="competitions_created",
        help_text="Staff or admin user who created this competition.",
    )

    class Meta:
        db_table = "competitions_competition"
        ordering = ["-start_date"]
        verbose_name = "Competition"
        verbose_name_plural = "Competitions"

    def __str__(self) -> str:
        return f"{self.title} ({self.start_date} — {self.end_date})"


class CompetitionEntry(TimeStampedModel):
    """A user's registration in a competition.

    Unique per (competition, user). Payment reference is stored for reconciliation
    against the payments app once the entry fee is collected.
    """

    class Status(models.TextChoices):
        REGISTERED = "registered", "Registered"
        CONFIRMED = "confirmed", "Confirmed"
        DISQUALIFIED = "disqualified", "Disqualified"
        WITHDRAWN = "withdrawn", "Withdrawn"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    competition = models.ForeignKey(
        Competition,
        on_delete=models.CASCADE,
        related_name="entries",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="competition_entries",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.REGISTERED,
    )
    payment_ref = models.CharField(
        max_length=100,
        blank=True,
        help_text="Payment gateway reference for the entry fee transaction.",
    )
    catch_weight = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Total verified catch weight in kg for leaderboard ranking.",
    )
    rank = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Official final rank after competition ends.",
    )

    class Meta:
        db_table = "competitions_entry"
        unique_together = [("competition", "user")]
        ordering = ["-created_at"]
        verbose_name = "Competition Entry"
        verbose_name_plural = "Competition Entries"

    def __str__(self) -> str:
        return f"{self.user} → {self.competition.title} ({self.status})"


class CatchLog(TimeStampedModel):
    """A single fish catch recorded by a competition participant.

    Weight drives the leaderboard ranking. Catches must be verified by a judge
    before counting toward the official score.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entry = models.ForeignKey(
        CompetitionEntry,
        on_delete=models.CASCADE,
        related_name="catches",
    )
    species = models.ForeignKey(
        "weather.FishingSpecies",
        on_delete=models.PROTECT,
        related_name="catch_logs",
    )
    weight_kg = models.DecimalField(
        max_digits=8,
        decimal_places=3,
        help_text="Fish weight in kilograms.",
    )
    length_cm = models.DecimalField(
        max_digits=6,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Fish length in centimetres (optional).",
    )
    caught_at = models.DateTimeField(
        help_text="UTC timestamp when the fish was caught.",
    )
    photo_url = models.URLField(blank=True, help_text="URL of catch verification photo.")
    verified = models.BooleanField(
        default=False,
        help_text="Set to True by a competition judge after verification.",
    )

    class Meta:
        db_table = "competitions_catch"
        ordering = ["-weight_kg"]
        verbose_name = "Catch Log"
        verbose_name_plural = "Catch Logs"

    def __str__(self) -> str:
        return f"{self.species.name_ar} {self.weight_kg} kg — {self.entry}"
