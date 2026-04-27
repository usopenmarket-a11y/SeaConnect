"""HTTP-level tests for the payment endpoints.

Covers:
  - PaymentInitiateView authentication + booking-state guard
  - FawryWebhookView signature verification (positive + negative)
  - Atomic BookingEvent insertion on capture
  - Unknown provider_ref returns 200 to suppress retry storms

The provider HTTP layer (httpx.post) is patched in the initiate test
so no real network call is made.
"""
from __future__ import annotations

import hashlib
import json
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.bookings.models import BookingEvent, BookingEventType
from apps.payments.models import Payment, PaymentStatus


def _auth(client: APIClient, user) -> APIClient:
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


# ---------------------------------------------------------------------------
# /payments/initiate/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPaymentInitiate:

    def test_unauthenticated_returns_401(self, api_client, confirmed_booking):
        response = api_client.post(
            "/api/v1/payments/initiate/",
            data={
                "booking_id": str(confirmed_booking.id),
                "return_url": "https://seaconnect.app/confirm",
            },
            format="json",
        )
        assert response.status_code == 401

    def test_initiate_with_confirmed_booking_returns_201(
        self, api_client, customer_user, confirmed_booking,
    ):
        _auth(api_client, customer_user)
        with patch("apps.payments.views.get_provider") as mock_get_provider:
            mock_provider = MagicMock()
            mock_provider.initiate.return_value = MagicMock(
                provider_ref="FAW-INIT-001",
                checkout_url="https://atfawry.fawrystaging.com/pay/FAW-INIT-001",
                raw_response={"referenceNumber": "FAW-INIT-001"},
            )
            mock_get_provider.return_value = mock_provider

            response = api_client.post(
                "/api/v1/payments/initiate/",
                data={
                    "booking_id": str(confirmed_booking.id),
                    "return_url": "https://seaconnect.app/confirm",
                },
                format="json",
            )
            assert response.status_code == 201
            body = response.json()
            assert body["checkout_url"] == "https://atfawry.fawrystaging.com/pay/FAW-INIT-001"
            assert body["payment"]["status"] == PaymentStatus.PENDING
            # Amount comes from the booking, not the request body.
            assert body["payment"]["amount"] == "3000.00"
            assert body["payment"]["currency"] == "EGP"

            # Provider lookup should be by booking.currency
            mock_get_provider.assert_called_once_with("EGP")

            # The Payment row must exist and reference the booking
            payment = Payment.objects.get(provider_ref="FAW-INIT-001")
            assert payment.booking_id == confirmed_booking.id
            assert payment.amount == Decimal("3000.00")

    def test_initiate_with_pending_booking_returns_404(
        self, api_client, customer_user, pending_booking,
    ):
        _auth(api_client, customer_user)
        response = api_client.post(
            "/api/v1/payments/initiate/",
            data={
                "booking_id": str(pending_booking.id),
                "return_url": "https://seaconnect.app/confirm",
            },
            format="json",
        )
        # The view's get_object_or_404 filters status=CONFIRMED, so a
        # pending booking is invisible.
        assert response.status_code == 404

    def test_initiate_for_other_customers_booking_returns_404(
        self,
        api_client,
        confirmed_booking,
        egypt_region,
    ):
        from apps.accounts.models import User, UserRole

        other = User.objects.create_user(
            email="other-customer@test.com",
            password="TestPass123!",
            first_name="Other",
            last_name="Customer",
            role=UserRole.CUSTOMER,
            region=egypt_region,
        )
        _auth(api_client, other)
        response = api_client.post(
            "/api/v1/payments/initiate/",
            data={
                "booking_id": str(confirmed_booking.id),
                "return_url": "https://seaconnect.app/confirm",
            },
            format="json",
        )
        assert response.status_code == 404

    def test_initiate_provider_failure_returns_502(
        self, api_client, customer_user, confirmed_booking,
    ):
        _auth(api_client, customer_user)
        with patch("apps.payments.views.get_provider") as mock_get_provider:
            mock_provider = MagicMock()
            mock_provider.initiate.side_effect = RuntimeError("provider down")
            mock_get_provider.return_value = mock_provider
            response = api_client.post(
                "/api/v1/payments/initiate/",
                data={
                    "booking_id": str(confirmed_booking.id),
                    "return_url": "https://seaconnect.app/confirm",
                },
                format="json",
            )
            assert response.status_code == 502
            assert (
                response.json()["error"]["code"] == "PAYMENT_INITIATION_FAILED"
            )


# ---------------------------------------------------------------------------
# /payments/webhook/fawry/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestFawryWebhook:

    def _signed(self, payload: bytes, key: str) -> str:
        return hashlib.sha256(
            (payload.decode("utf-8") + key).encode("utf-8"),
        ).hexdigest()

    def test_invalid_signature_returns_400(self, api_client, settings):
        settings.FAWRY_SECURITY_KEY = "test-secret"
        response = api_client.post(
            "/api/v1/payments/webhook/fawry/",
            data=b'{"paymentStatus":"PAID"}',
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE="bad-signature",
        )
        assert response.status_code == 400

    def test_paid_event_captures_payment_and_inserts_booking_event(
        self, api_client, pending_payment, settings,
    ):
        settings.FAWRY_SECURITY_KEY = "test-secret"
        payload = json.dumps(
            {
                "fawryRefNumber": pending_payment.provider_ref,
                "paymentStatus": "PAID",
                "paymentAmount": str(pending_payment.amount),
                "currency": "EGP",
            },
        ).encode("utf-8")
        signature = self._signed(payload, "test-secret")
        response = api_client.post(
            "/api/v1/payments/webhook/fawry/",
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=signature,
        )
        assert response.status_code == 200

        pending_payment.refresh_from_db()
        assert pending_payment.status == PaymentStatus.CAPTURED
        # Webhook payload was merged into metadata.
        assert "webhook" in pending_payment.metadata

        # ADR-012: BookingEvent(payment_received) must be inserted in the
        # same transaction.
        events = BookingEvent.objects.filter(
            booking=pending_payment.booking,
            event_type=BookingEventType.PAYMENT_RECEIVED,
        )
        assert events.count() == 1
        evt = events.first()
        assert evt.actor_id is None  # system event
        assert evt.metadata["payment_id"] == str(pending_payment.id)

    def test_failed_event_does_not_insert_booking_event(
        self, api_client, pending_payment, settings,
    ):
        settings.FAWRY_SECURITY_KEY = "test-secret"
        payload = json.dumps(
            {
                "fawryRefNumber": pending_payment.provider_ref,
                "paymentStatus": "FAILED",
                "paymentAmount": "0",
                "currency": "EGP",
            },
        ).encode("utf-8")
        signature = self._signed(payload, "test-secret")
        response = api_client.post(
            "/api/v1/payments/webhook/fawry/",
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=signature,
        )
        assert response.status_code == 200
        pending_payment.refresh_from_db()
        assert pending_payment.status == PaymentStatus.FAILED
        assert not BookingEvent.objects.filter(
            booking=pending_payment.booking,
            event_type=BookingEventType.PAYMENT_RECEIVED,
        ).exists()

    def test_unknown_provider_ref_returns_200(self, api_client, settings):
        """Returns 200 to prevent Fawry retry storms on stale events."""
        settings.FAWRY_SECURITY_KEY = "test-secret"
        payload = json.dumps(
            {
                "fawryRefNumber": "DOES-NOT-EXIST",
                "paymentStatus": "PAID",
                "paymentAmount": "100.00",
                "currency": "EGP",
            },
        ).encode("utf-8")
        signature = self._signed(payload, "test-secret")
        response = api_client.post(
            "/api/v1/payments/webhook/fawry/",
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=signature,
        )
        assert response.status_code == 200
