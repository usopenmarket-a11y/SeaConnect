"""Payments app models — stub for Sprint 1.

Full implementation in Sprint 2 (Payment, Transaction, PaymentProvider interface).

ADR-007: ALL payment operations go through PaymentProvider abstract interface.
         Never call Fawry/Stripe APIs directly from business logic.
ADR-008: Phase 1 uses Fawry for EGP payments only.
ADR-018: currency field is always explicit ISO 4217 — never hardcode 'EGP'.

Provider registry (Sprint 2):
    PROVIDER_MAP = {
        'EGP': 'payments.providers.fawry.FawryProvider',
        'AED': 'payments.providers.telr.TelrProvider',   # Phase 3
        'SAR': 'payments.providers.mada.MadaProvider',   # Phase 4
        'EUR': 'payments.providers.stripe.StripeProvider', # Phase 3
    }
"""
# Sprint 2 will add:
#   payments/providers/base.py   — PaymentProvider ABC (see ADR-007 for interface)
#   payments/providers/fawry.py  — FawryProvider implementation
#   payments/providers/registry.py — get_provider(currency) factory
#   Payment model
#   Transaction model
