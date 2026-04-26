from django.contrib import admin

from .models import Yacht, YachtMedia


class YachtMediaInline(admin.TabularInline):  # type: ignore[type-arg]
    model = YachtMedia
    extra = 0
    fields = ["url", "media_type", "is_primary", "order"]


@admin.register(Yacht)
class YachtAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ["name_ar", "name", "owner", "region", "departure_port", "yacht_type", "status", "price_per_day", "currency"]
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
