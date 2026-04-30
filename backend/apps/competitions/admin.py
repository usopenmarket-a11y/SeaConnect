"""Django admin registration for the competitions app."""
from django.contrib import admin

from .models import CatchLog, Competition, CompetitionEntry


@admin.register(Competition)
class CompetitionAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "start_date", "end_date", "region", "entry_fee", "prize_pool"]
    list_filter = ["status", "region"]
    search_fields = ["title", "title_en"]
    date_hierarchy = "start_date"
    ordering = ["-start_date"]


@admin.register(CompetitionEntry)
class CompetitionEntryAdmin(admin.ModelAdmin):
    list_display = ["competition", "user", "status", "payment_ref", "created_at"]
    list_filter = ["status", "competition"]
    search_fields = ["user__email", "payment_ref"]
    ordering = ["-created_at"]


@admin.register(CatchLog)
class CatchLogAdmin(admin.ModelAdmin):
    list_display = ["entry", "species", "weight_kg", "caught_at", "verified"]
    list_filter = ["verified", "species"]
    search_fields = ["entry__user__email"]
    ordering = ["-weight_kg"]
