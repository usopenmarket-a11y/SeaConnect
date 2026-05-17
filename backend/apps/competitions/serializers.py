"""DRF serializers for the competitions app — Sprint 6.

Serializer hierarchy:
  CatchLogSerializer
  CompetitionEntrySerializer (nests CatchLogSerializer)
  CompetitionListSerializer  (lightweight, used on list endpoint)
  CompetitionDetailSerializer (extends list, adds description/rules/port)
"""
from rest_framework import serializers

from .models import CatchLog, Competition, CompetitionEntry


class CatchLogSerializer(serializers.ModelSerializer):
    """Full catch log representation.

    ``species_name`` exposes the Arabic species name (Arabic-first — ADR-014).
    ``entry`` is write-only on creation; the view sets it via perform_create.
    """

    species_name = serializers.CharField(
        source="species.name_ar",
        read_only=True,
    )

    class Meta:
        model = CatchLog
        fields = [
            "id",
            "entry",
            "species",
            "species_name",
            "weight_kg",
            "length_cm",
            "caught_at",
            "photo_url",
            "verified",
            "created_at",
        ]
        read_only_fields = ["id", "verified", "created_at", "species_name"]
        extra_kwargs = {
            # entry is injected by CatchLogCreateView.perform_create; hide from input
            "entry": {"write_only": True, "required": False},
        }


class CompetitionEntrySerializer(serializers.ModelSerializer):
    """Full entry representation including nested catches.

    ``user_name`` exposes the participant's display name.
    ``catches`` is a read-only nested list.
    """

    user_name = serializers.SerializerMethodField()
    catches = CatchLogSerializer(many=True, read_only=True)

    class Meta:
        model = CompetitionEntry
        fields = [
            "id",
            "competition",
            "user",
            "user_name",
            "status",
            "payment_ref",
            "catches",
            "created_at",
        ]
        read_only_fields = ["id", "user", "user_name", "catches", "created_at"]

    def get_user_name(self, obj: CompetitionEntry) -> str:
        """Return full name or email as fallback."""
        return obj.user.full_name or obj.user.email


class CompetitionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list endpoints.

    ``region_name`` uses the English region name for API consumers.
    ``entry_count`` is populated by an annotation in the view queryset.
    """

    region_name = serializers.CharField(source="region.name_en", read_only=True)
    entry_count = serializers.SerializerMethodField()

    class Meta:
        model = Competition
        fields = [
            "id",
            "title",
            "title_en",
            "start_date",
            "end_date",
            "entry_fee",
            "prize_pool",
            "status",
            "region_name",
            "entry_count",
        ]
        read_only_fields = fields

    def get_entry_count(self, obj: Competition) -> int:
        """Return count of confirmed entries.

        Uses the ``entry_count`` annotation injected by CompetitionListView.get_queryset
        when available; falls back to a direct DB query.
        """
        if hasattr(obj, "entry_count"):
            return obj.entry_count  # type: ignore[return-value]
        return obj.entries.filter(status="confirmed").count()


class CompetitionEntryResultSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the public results leaderboard.

    Used by ResultsView (GET /api/v1/competitions/<id>/results/).
    Exposes rank, participant name, and catch_weight only — no PII beyond
    the display name.
    """

    participant_name = serializers.SerializerMethodField()

    class Meta:
        model = CompetitionEntry
        fields = [
            "id",
            "rank",
            "participant_name",
            "catch_weight",
            "status",
        ]
        read_only_fields = fields

    def get_participant_name(self, obj: CompetitionEntry) -> str:
        """Arabic-first: full name or email fallback (ADR-014)."""
        return obj.user.full_name or obj.user.email


class MyEntrySerializer(serializers.ModelSerializer):
    """Serializer for a single user's entry in a specific competition.

    Used by MyEntryView (GET /api/v1/competitions/<id>/my-entry/).
    """

    user_name = serializers.SerializerMethodField()
    competition_title = serializers.CharField(source="competition.title", read_only=True)
    competition_title_en = serializers.CharField(source="competition.title_en", read_only=True)

    class Meta:
        model = CompetitionEntry
        fields = [
            "id",
            "competition",
            "competition_title",
            "competition_title_en",
            "user",
            "user_name",
            "status",
            "catch_weight",
            "rank",
            "created_at",
        ]
        read_only_fields = fields

    def get_user_name(self, obj: CompetitionEntry) -> str:
        return obj.user.full_name or obj.user.email


class CompetitionDetailSerializer(CompetitionListSerializer):
    """Full competition detail — extends list serializer with additional fields."""

    departure_port_id = serializers.UUIDField(
        source="departure_port.id",
        read_only=True,
        allow_null=True,
    )
    departure_port_name = serializers.SerializerMethodField()

    class Meta(CompetitionListSerializer.Meta):
        fields = CompetitionListSerializer.Meta.fields + [  # type: ignore[operator]
            "description",
            "rules",
            "departure_port_id",
            "departure_port_name",
            "registration_deadline",
            "max_participants",
        ]
        read_only_fields = fields

    def get_departure_port_name(self, obj: Competition) -> str | None:
        """Return Arabic port name (primary) if a port is set."""
        if obj.departure_port_id:
            return obj.departure_port.name_ar
        return None
