"""Fawry payment provider — sandbox implementation.

ADR-007 — This class is NEVER imported directly by views or services.
Callers always use::

    from apps.payments.providers.registry import get_provider
    provider = get_provider(currency)   # currency-driven lookup

Documentation:
  https://developer.fawrystaging.com/

Outbound auth (initiate):
  Each request is signed with SHA-256 over the concatenated string
  ``merchant_code + order_ref + amount + security_key`` (no separators).

Inbound auth (webhook):
  Fawry posts JSON to ``/api/v1/payments/webhook/fawry/`` with the
  signature provided in an HTTP header. We verify it as
  ``SHA-256(payload + security_key)`` using ``hmac.compare_digest`` so
  the comparison is constant-time.

The provider uses ``httpx`` (already in requirements/base.txt) — not
``requests``.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from decimal import Decimal

import httpx
from django.conf import settings

from .base import PaymentInitResult, PaymentProvider, PaymentStatusResult

logger = logging.getLogger(__name__)

# Map Fawry payment status strings → SeaConnect canonical statuses.
# Anything unrecognised falls through to "pending" (safe default — caller
# will not over-credit a booking on an unknown payload).
_FAWRY_STATUS_MAP: dict[str, str] = {
    "PAID": "captured",
    "FAILED": "failed",
    "REFUNDED": "refunded",
    "EXPIRED": "failed",
    "CANCELED": "failed",
    "CANCELLED": "failed",
}


class FawryProvider(PaymentProvider):
    """Fawry (Egypt) payment gateway."""

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_signature(*parts: str) -> str:
        """SHA-256 hex of concatenated string parts (no separators)."""
        raw = "".join(parts)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    # ------------------------------------------------------------------
    # PaymentProvider contract
    # ------------------------------------------------------------------

    def initiate(
        self,
        amount: Decimal,
        currency: str,
        order_ref: str,
        customer_email: str,
        customer_name: str,
        return_url: str,
    ) -> PaymentInitResult:
        signature = self._compute_signature(
            settings.FAWRY_MERCHANT_CODE,
            order_ref,
            str(amount),
            settings.FAWRY_SECURITY_KEY,
        )
        payload = {
            "merchantCode": settings.FAWRY_MERCHANT_CODE,
            "merchantRefNum": order_ref,
            "customerName": customer_name,
            "customerEmail": customer_email,
            "amount": str(amount),
            "currencyCode": currency,
            "returnUrl": return_url,
            "signature": signature,
            "paymentMethod": "CARD",
        }

        url = f"{settings.FAWRY_BASE_URL.rstrip('/')}/ECommerceWeb/Fawry/payments/charge"
        try:
            response = httpx.post(url, json=payload, timeout=15.0)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            # Never log the security key. Order ref + status are safe.
            logger.error(
                "Fawry initiate failed for order_ref=%s status=%s",
                order_ref,
                getattr(exc.response, "status_code", "n/a") if hasattr(exc, "response") else "n/a",
            )
            raise

        data = response.json()
        return PaymentInitResult(
            provider_ref=data.get("referenceNumber", ""),
            checkout_url=data.get("nextAction", {}).get("redirectUrl", ""),
            raw_response=data,
        )

    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """Constant-time SHA-256 verification of the Fawry webhook body."""
        if not signature:
            return False
        try:
            decoded = payload.decode("utf-8")
        except UnicodeDecodeError:
            return False
        expected = hashlib.sha256(
            (decoded + settings.FAWRY_SECURITY_KEY).encode("utf-8"),
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def parse_webhook(self, payload: bytes) -> PaymentStatusResult:
        data = json.loads(payload)
        raw_status = str(data.get("paymentStatus", "")).upper()
        return PaymentStatusResult(
            provider_ref=data.get("fawryRefNumber", ""),
            status=_FAWRY_STATUS_MAP.get(raw_status, "pending"),
            amount=Decimal(str(data.get("paymentAmount", "0"))),
            currency=data.get("currency", "EGP"),
            raw_response=data,
        )
