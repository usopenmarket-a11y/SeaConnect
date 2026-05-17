from django.contrib import admin

from .models import (
    Availability,
    BlockedDate,
    Booking,
    BookingEvent,
    Dispute,
    Yacht,
    YachtMedia,
)


class YachtMediaInline(admin.TabularInline):  # type: ignore[type-arg]
    model = YachtMedia
    extra = 0
    fields = ["url", "media_type", "is_primary", "order"]


@admin.register(Yacht)
class YachtAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = [
        "name_ar",
        "name",
        "owner",
        "region",
        "departure_port",
        "yacht_type",
        "status",
        "price_per_day",
        "currency",
    ]
    list_filter = ["status", "yacht_type", "region", "is_deleted"]
    search_fields = ["name", "name_ar", "owner__email"]
    raw_id_fields = ["owner", "region", "departure_port"]
    inlines = [YachtMediaInline]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(YachtMedia)
class YachtMediaAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ["yacht", "media_type", "is_primary", "order"]
    list_filter = ["media_type", "is_primary"]
    raw_id_fields = ["yacht"]


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ["yacht", "date", "status", "price_override"]
    list_filter = ["status"]
    search_fields = ["yacht__name", "yacht__name_ar"]
    raw_id_fields = ["yacht"]
    ordering = ["yacht", "date"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(BlockedDate)
class BlockedDateAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ["yacht", "date", "reason"]
    list_filter = ["yacht"]
    search_fields = ["yacht__name", "yacht__name_ar", "reason"]
    raw_id_fields = ["yacht"]
    ordering = ["yacht", "date"]
    readonly_fields = ["id", "created_at", "updated_at"]


class BookingEventInline(admin.TabularInline):  # type: ignore[type-arg]
    """Inline read-only audit log on the Booking detail page (ADR-012)."""

    model = BookingEvent
    extra = 0
    fields = ["event_type", "actor", "notes", "metadata", "created_at"]
    readonly_fields = ["event_type", "actor", "notes", "metadata", "created_at"]
    can_delete = False

    def has_add_permission(self, request, obj=None) -> bool:  # type: ignore[override]
        # ADR-012: BookingEvent is append-only via BookingService — block manual inserts.
        return False


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = [
        "id",
        "yacht",
        "customer",
        "status",
        "start_date",
        "end_date",
        "total_amount",
        "currency",
    ]
    list_filter = ["status", "region"]
    search_fields = ["yacht__name", "yacht__name_ar", "customer__email"]
    raw_id_fields = ["yacht", "customer", "region", "departure_port"]
    inlines = [BookingEventInline]
    readonly_fields = ["id", "created_at", "updated_at", "total_amount", "currency"]


@admin.register(BookingEvent)
class BookingEventAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    """Read-only admin for the booking event log (ADR-012)."""

    list_display = ["booking", "event_type", "actor", "created_at"]
    list_filter = ["event_type"]
    search_fields = ["booking__id"]
    readonly_fields = [
        "id",
        "booking",
        "event_type",
        "actor",
        "notes",
        "metadata",
        "created_at",
    ]

    def has_add_permission(self, request) -> bool:  # type: ignore[override]
        return False

    def has_change_permission(self, request, obj=None) -> bool:  # type: ignore[override]
        return False

    def has_delete_permission(self, request, obj=None) -> bool:  # type: ignore[override]
        return False


# ---------------------------------------------------------------------------
# Sprint 13B — Dispute admin
# ---------------------------------------------------------------------------


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    """Admin registration for customer/owner disputes (Sprint 13B).

    Admins may update status and resolution; the created_at / raised_by fields
    are read-only to preserve the audit trail.
    """

    list_display = ["booking", "raised_by", "status", "created_at"]
    list_filter = ["status"]
    search_fields = [
        "booking__id",
        "raised_by__email",
        "raised_by__first_name",
        "raised_by__last_name",
    ]
    raw_id_fields = ["booking", "raised_by", "resolved_by"]
    readonly_fields = ["id", "booking", "raised_by", "reason", "created_at", "updated_at"]
    fieldsets = [
        (
            "Dispute",
            {
                "fields": [
                    "id",
                    "booking",
                    "raised_by",
                    "reason",
                    "status",
                    "created_at",
                    "updated_at",
                ],
            },
        ),
        (
            "Resolution",
            {
                "fields": ["resolution", "resolved_by", "resolved_at"],
            },
        ),
    ]
