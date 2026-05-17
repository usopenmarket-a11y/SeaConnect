"""URL routes for the payments app.

ADR-007: payment views call get_provider() and never import a concrete
provider class. Route names are stable across providers — when Telr/
Stripe are added in Sprint 7/8 they get their own webhook routes.
"""
from django.urls import path

from .views import (
    AdminPayoutApproveView,
    AdminPayoutListView,
    EscrowListView,
    FawryWebhookView,
    PaymentInitiateView,
    PayoutListView,
)

app_name = "payments"

urlpatterns = [
    path(
        "payments/initiate/",
        PaymentInitiateView.as_view(),
        name="payment-initiate",
    ),
    path(
        "payments/webhook/fawry/",
        FawryWebhookView.as_view(),
        name="fawry-webhook",
    ),
    path(
        "payments/payouts/",
        PayoutListView.as_view(),
        name="payout-list",
    ),
    path(
        "payments/escrow/",
        EscrowListView.as_view(),
        name="escrow-list",
    ),
    # Sprint 13C — admin payout management
    path(
        "admin/payouts/",
        AdminPayoutListView.as_view(),
        name="admin-payout-list",
    ),
    path(
        "admin/payouts/<uuid:id>/approve/",
        AdminPayoutApproveView.as_view(),
        name="admin-payout-approve",
    ),
]
