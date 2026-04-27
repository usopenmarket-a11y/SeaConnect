"""Django admin for the payments app.

Payment is largely read-only in the admin — money state changes happen
via webhook only and must not be edited by humans without an audit trail.
"""
from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = [
        "id",
        "booking",
        "provider",
        "status",
        "amount",
        "currency",
        "created_at",
    ]
    list_filter = ["status", "provider"]
    search_fields = ["provider_ref", "booking__id"]
    raw_id_fields = ["booking"]
    readonly_fields = [
        "id",
        "booking",
        "provider",
        "provider_ref",
        "amount",
        "currency",
        "checkout_url",
        "metadata",
        "created_at",
        "updated_at",
    ]

    def has_add_permission(self, request) -> bool:  # type: ignore[override]
        # Payments are created via the API, not the admin.
        return False
