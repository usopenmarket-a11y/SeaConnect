"""Unit tests for the payment provider layer.

These tests must NOT make real HTTP calls. The httpx.post used inside
FawryProvider is patched out — we only verify the wiring (signature
computation, payload shape, status mapping, webhook verification).

Run:
    pytest backend/tests/test_payment_providers.py -v
"""
from __future__ import annotations

import hashlib
import hmac
import json
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

from apps.payments.providers.base import (
    PaymentInitResult,
    PaymentProvider,
    PaymentStatusResult,
)
from apps.payments.providers.fawry import FawryProvider
from apps.payments.providers.registry import PROVIDER_REGISTRY, get_provider


class TestProviderRegistry:

    def test_egp_resolves_to_fawry(self):
        provider = get_provider("EGP")
        assert isinstance(provider, FawryProvider)

    def test_lowercase_currency_is_normalised(self):
        provider = get_provider("egp")
        assert isinstance(provider, FawryProvider)

    def test_unknown_currency_raises(self):
        with pytest.raises(KeyError):
            get_provider("XYZ")

    def test_empty_currency_raises(self):
        with pytest.raises(KeyError):
            get_provider("")

    def test_registry_only_has_egp_today(self):
        # ADR-008: Egypt-first launch. UAE/EU live in later sprints.
        assert set(PROVIDER_REGISTRY.keys()) == {"EGP"}


class TestPaymentProviderABC:

    def test_cannot_instantiate_abstract_base(self):
        with pytest.raises(TypeError):
            PaymentProvider()  # type: ignore[abstract]


class TestFawryInitiate:

    def test_initiate_returns_provider_ref_and_url(self):
        with patch("apps.payments.providers.fawry.httpx.post") as mock_post:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "referenceNumber": "FAW-001",
                "nextAction": {
                    "redirectUrl": "https://atfawry.fawrystaging.com/pay/FAW-001",
                },
            }
            mock_response.raise_for_status = MagicMock()
            mock_post.return_value = mock_response

            provider = FawryProvider()
            result = provider.initiate(
                amount=Decimal("1500.00"),
                currency="EGP",
                order_ref="booking-uuid-123",
                customer_email="customer@example.com",
                customer_name="Ahmed Mohamed",
                return_url="https://seaconnect.app/booking/confirm",
            )

            assert isinstance(result, PaymentInitResult)
            assert result.provider_ref == "FAW-001"
            assert "FAW-001" in result.checkout_url
            mock_post.assert_called_once()

            # Inspect the payload sent to Fawry
            sent_payload = mock_post.call_args.kwargs["json"]
            assert sent_payload["merchantRefNum"] == "booking-uuid-123"
            assert sent_payload["amount"] == "1500.00"
            assert sent_payload["currencyCode"] == "EGP"
            # Signature is SHA-256 of merchant_code + order_ref + amount + key
            assert "signature" in sent_payload

    def test_initiate_signature_is_deterministic(self):
        # Same inputs → same signature.
        provider = FawryProvider()
        sig1 = provider._compute_signature("m", "ref-1", "100.00", "k")
        sig2 = provider._compute_signature("m", "ref-1", "100.00", "k")
        assert sig1 == sig2
        # Different ref → different signature.
        sig3 = provider._compute_signature("m", "ref-2", "100.00", "k")
        assert sig1 != sig3


class TestFawryWebhookVerification:

    def test_verify_webhook_valid_signature(self, settings):
        settings.FAWRY_SECURITY_KEY = "test-key"
        provider = FawryProvider()
        payload = b'{"paymentStatus":"PAID"}'
        signature = hashlib.sha256(
            (payload.decode("utf-8") + "test-key").encode("utf-8"),
        ).hexdigest()
        assert provider.verify_webhook(payload, signature) is True

    def test_verify_webhook_invalid_signature(self, settings):
        settings.FAWRY_SECURITY_KEY = "test-key"
        provider = FawryProvider()
        payload = b'{"paymentStatus":"PAID"}'
        assert provider.verify_webhook(payload, "wrong-sig") is False

    def test_verify_webhook_empty_signature_rejected(self, settings):
        settings.FAWRY_SECURITY_KEY = "test-key"
        provider = FawryProvider()
        assert provider.verify_webhook(b"{}", "") is False

    def test_verify_uses_constant_time_compare(self, settings):
        # Smoke test — the implementation should call hmac.compare_digest.
        # We patch it and confirm it was called with the expected args.
        settings.FAWRY_SECURITY_KEY = "test-key"
        provider = FawryProvider()
        payload = b'{"paymentStatus":"PAID"}'
        signature = hashlib.sha256(
            (payload.decode("utf-8") + "test-key").encode("utf-8"),
        ).hexdigest()
        with patch(
            "apps.payments.providers.fawry.hmac.compare_digest",
            wraps=hmac.compare_digest,
        ) as mock_cmp:
            assert provider.verify_webhook(payload, signature) is True
            mock_cmp.assert_called_once()


class TestFawryWebhookParsing:

    def test_parse_webhook_paid_maps_to_captured(self):
        provider = FawryProvider()
        payload = json.dumps(
            {
                "fawryRefNumber": "FAW-001",
                "paymentStatus": "PAID",
                "paymentAmount": "1500.00",
                "currency": "EGP",
            },
        ).encode("utf-8")
        result = provider.parse_webhook(payload)
        assert isinstance(result, PaymentStatusResult)
        assert result.status == "captured"
        assert result.amount == Decimal("1500.00")
        assert result.currency == "EGP"
        assert result.provider_ref == "FAW-001"

    def test_parse_webhook_failed_maps_to_failed(self):
        provider = FawryProvider()
        payload = json.dumps(
            {
                "fawryRefNumber": "FAW-002",
                "paymentStatus": "FAILED",
                "paymentAmount": "0",
                "currency": "EGP",
            },
        ).encode("utf-8")
        result = provider.parse_webhook(payload)
        assert result.status == "failed"

    def test_parse_webhook_refunded_maps_to_refunded(self):
        provider = FawryProvider()
        payload = json.dumps(
            {
                "fawryRefNumber": "FAW-003",
                "paymentStatus": "REFUNDED",
                "paymentAmount": "1500.00",
                "currency": "EGP",
            },
        ).encode("utf-8")
        result = provider.parse_webhook(payload)
        assert result.status == "refunded"

    def test_parse_webhook_expired_maps_to_failed(self):
        provider = FawryProvider()
        payload = json.dumps(
            {
                "fawryRefNumber": "FAW-004",
                "paymentStatus": "EXPIRED",
                "paymentAmount": "0",
                "currency": "EGP",
            },
        ).encode("utf-8")
        result = provider.parse_webhook(payload)
        assert result.status == "failed"

    def test_parse_webhook_unknown_status_falls_back_to_pending(self):
        # Safer than failing: an unknown status should not be inferred as
        # captured / failed, since either could over- or under-credit.
        provider = FawryProvider()
        payload = json.dumps(
            {
                "fawryRefNumber": "FAW-099",
                "paymentStatus": "FUTURE_STATUS_WE_DONT_KNOW",
                "paymentAmount": "0",
                "currency": "EGP",
            },
        ).encode("utf-8")
        result = provider.parse_webhook(payload)
        assert result.status == "pending"
