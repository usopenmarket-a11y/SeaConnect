"""Serializers for the notifications app.

NotificationSerializer exposes all Notification fields plus two derived read-only
fields — ``title`` and ``body`` — resolved from the recipient's ``preferred_lang``
(Arabic default, per ADR-014).

The derived fields are computed at serialisation time so the client always
receives a single localised string rather than having to select the language
variant itself.
"""
from rest_framework import serializers

from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Read serializer for Notification records.

    Includes localised ``title`` and ``body`` fields resolved from
    ``recipient.preferred_lang``.  These are read-only and not persisted;
    they are convenience fields for front-end rendering.
    """

    title = serializers.SerializerMethodField(
        help_text="Localised title resolved from the recipient's preferred language.",
    )
    body = serializers.SerializerMethodField(
        help_text="Localised body resolved from the recipient's preferred language.",
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "channel",
            "status",
            # Bilingual raw fields — Arabic first (ADR-014)
            "title_ar",
            "title_en",
            "body_ar",
            "body_en",
            # Derived localised convenience fields
            "title",
            "body",
            # Reference
            "reference_id",
            "reference_type",
            # Timestamps
            "sent_at",
            "read_at",
            "created_at",
        ]
        read_only_fields = fields  # This is a read-only serializer

    def _get_lang(self, obj: Notification) -> str:
        """Resolve preferred language from recipient; fall back to Arabic."""
        return getattr(obj.recipient, "preferred_lang", "ar") or "ar"

    def get_title(self, obj: Notification) -> str:
        lang = self._get_lang(obj)
        return obj.title_ar if lang == "ar" else obj.title_en

    def get_body(self, obj: Notification) -> str:
        lang = self._get_lang(obj)
        return obj.body_ar if lang == "ar" else obj.body_en
