"""URL routes for the payments app.

ADR-007: payment views call get_provider() and never import a concrete
provider class. Route names are stable across providers — when Telr/
Stripe are added in Sprint 7/8 they get their own webhook routes.
"""
from django.urls import path

from .views import FawryWebhookView, PaymentInitiateView

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
]
