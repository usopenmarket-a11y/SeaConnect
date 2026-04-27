"""Provider registry — maps ISO 4217 currency to the correct PaymentProvider.

ADR-007 — Currency → provider resolved at runtime. Never hardcode a
provider class in views or services. New payment methods are added here
only.

Usage::

    from apps.payments.providers.registry import get_provider

    provider = get_provider(booking.currency)  # raises KeyError for unsupported
    result = provider.initiate(...)
"""
from __future__ import annotations

from .base import PaymentProvider
from .fawry import FawryProvider

# Currency code (ISO 4217) → concrete provider class.
PROVIDER_REGISTRY: dict[str, type[PaymentProvider]] = {
    "EGP": FawryProvider,
    # "AED": TelrProvider,    # Sprint 7 — UAE expansion
    # "EUR": StripeProvider,  # Sprint 8 — EU expansion
    # "SAR": MadaProvider,    # Phase 4 — KSA expansion
}


def get_provider(currency: str) -> PaymentProvider:
    """Return an initialized provider instance for the given currency.

    Raises KeyError if the currency is not registered.
    """
    if not currency:
        raise KeyError("currency must be a non-empty ISO 4217 code")
    provider_class = PROVIDER_REGISTRY.get(currency.upper())
    if provider_class is None:
        raise KeyError(
            f"No payment provider registered for currency '{currency}'.",
        )
    return provider_class()
