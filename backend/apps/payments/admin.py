"""Django admin for the payments app.

Payment is largely read-only in the admin — money state changes happen
via webhook only and must not be edited by humans without an audit trail.

Payout is read-only in the admin — payouts are created by the system
payout-cycle job. Admins can view but not create or mutate rows.
"""
from django.contrib import admin

from .models import Payment, Payout


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


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = [
        "reference",
        "owner",
        "amount",
        "currency",
        "status",
        "scheduled_date",
        "paid_at",
    ]
    list_filter = ["status", "currency"]
    search_fields = ["reference", "owner__email"]
    raw_id_fields = ["owner"]
    readonly_fields = [
        "id",
        "owner",
        "amount",
        "currency",
        "status",
        "reference",
        "payment_method",
        "scheduled_date",
        "paid_at",
        "escrow_booking_ids",
        "created_at",
        "updated_at",
    ]

    def has_add_permission(self, request) -> bool:  # type: ignore[override]
        # Payouts are created by the system payout-cycle job, not the admin.
        return False

    def has_change_permission(self, request, obj=None) -> bool:  # type: ignore[override]
        # Payout status changes must flow through the payout cycle service.
        return False
