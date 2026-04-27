"""Abstract payment provider interface.

ADR-007 — All payment operations go through this interface. Views and
services NEVER import a concrete provider class directly. They call:

    from apps.payments.providers.registry import get_provider
    provider = get_provider(currency)

Adding a new payment provider:
  1. Create apps/payments/providers/<provider>.py
  2. Subclass PaymentProvider and implement all abstract methods.
  3. Register the currency → class mapping in
     apps/payments/providers/registry.py PROVIDER_REGISTRY.

The dataclasses returned from `initiate()` and `parse_webhook()` give
calling code a stable shape that does not change when a new provider is
added.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal


@dataclass
class PaymentInitResult:
    """Result of initiating a payment session at the provider."""

    provider_ref: str
    """Provider-assigned reference ID (e.g. Fawry referenceNumber)."""

    checkout_url: str
    """URL the customer is redirected to in order to complete payment."""

    raw_response: dict = field(default_factory=dict)
    """Full provider response stored for audit and debugging."""


@dataclass
class PaymentStatusResult:
    """Result of parsing or querying a payment's current status."""

    provider_ref: str
    status: str
    """One of: 'pending', 'captured', 'failed', 'refunded'."""

    amount: Decimal
    currency: str
    raw_response: dict = field(default_factory=dict)


class PaymentProvider(ABC):
    """Base class every concrete payment gateway must implement."""

    @abstractmethod
    def initiate(
        self,
        amount: Decimal,
        currency: str,
        order_ref: str,
        customer_email: str,
        customer_name: str,
        return_url: str,
    ) -> PaymentInitResult:
        """Create a payment session and return the checkout URL."""
        ...

    @abstractmethod
    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """Verify the authenticity of an inbound webhook from the provider.

        Implementations must be constant-time-safe where possible —
        signatures are compared with `hmac.compare_digest` rather than `==`.
        """
        ...

    @abstractmethod
    def parse_webhook(self, payload: bytes) -> PaymentStatusResult:
        """Parse the raw webhook body into a PaymentStatusResult."""
        ...
