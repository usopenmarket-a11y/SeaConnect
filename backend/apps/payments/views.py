from __future__ import annotations

import logging

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import (
    Booking,
    BookingEvent,
    BookingEventType,
    BookingStatus,
)

from .models import Payment, PaymentProviderChoices, PaymentStatus
from .providers.registry import get_provider  # ADR-007 — currency-driven lookup
from .serializers import PaymentInitiateSerializer, PaymentSerializer

logger = logging.getLogger(__name__)


class PaymentInitiateView(APIView):
    """POST /api/v1/payments/initiate/.

    Authenticated. Customer must own a `confirmed` booking. Creates a
    `pending` Payment row and returns the provider's checkout URL.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = PaymentInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Read amount + currency from the booking (server-trusted), not from
        # the request body (item 7 of the audit checklist).
        booking = get_object_or_404(
            Booking,
            id=data["booking_id"],
            customer=request.user,
            status=BookingStatus.CONFIRMED,
        )

        try:
            provider = get_provider(booking.currency)
        except KeyError as exc:
            logger.error(
                "No provider for currency=%s booking=%s", booking.currency, booking.id,
            )
            return Response(
                {
                    "error": {
                        "code": "PROVIDER_NOT_CONFIGURED",
                        "message": str(exc),
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = provider.initiate(
                amount=booking.total_amount,
                currency=booking.currency,
                order_ref=str(booking.id),
                customer_email=request.user.email,
                customer_name=(
                    f"{request.user.first_name} {request.user.last_name}".strip()
                    or request.user.email
                ),
                return_url=data["return_url"],
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Payment initiate failed for booking=%s: %s", booking.id, exc)
            return Response(
                {
                    "error": {
                        "code": "PAYMENT_INITIATION_FAILED",
                        "message": "Payment provider returned an error.",
                    },
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        provider_key = _resolve_provider_key(booking.currency)
        payment = Payment.objects.create(
            booking=booking,
            provider=provider_key,
            provider_ref=result.provider_ref,
            amount=booking.total_amount,
            currency=booking.currency,
            status=PaymentStatus.PENDING,
            checkout_url=result.checkout_url,
            metadata={"initiate": result.raw_response},
        )
        return Response(
            {
                "payment": PaymentSerializer(payment).data,
                "checkout_url": result.checkout_url,
            },
            status=status.HTTP_201_CREATED,
        )


def _resolve_provider_key(currency: str) -> str:
    """Map currency → PaymentProviderChoices key without importing concrete classes."""
    mapping = {
        "EGP": PaymentProviderChoices.FAWRY,
    }
    key = mapping.get(currency.upper())
    if key is None:
        raise KeyError(f"No provider key mapping for currency '{currency}'.")
    return key


@method_decorator(csrf_exempt, name="dispatch")
class FawryWebhookView(APIView):
    """POST /api/v1/payments/webhook/fawry/.

    Unauthenticated — Fawry calls this from their servers. Signature is
    verified before any DB write. On a captured payment, a
    BookingEvent(payment_received) is inserted in the same atomic block
    as the Payment status update (ADR-012).
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request: Request) -> Response:
        raw_body = request.body
        signature = request.headers.get("X-Fawry-Signature", "")

        # Verify signature BEFORE any DB write (audit item 2).
        provider = get_provider("EGP")
        if not provider.verify_webhook(raw_body, signature):
            return Response(
                {
                    "error": {
                        "code": "INVALID_SIGNATURE",
                        "message": "Webhook signature mismatch.",
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = provider.parse_webhook(raw_body)
        except Exception as exc:  # noqa: BLE001
            logger.error("Webhook parse failed: %s", exc)
            return Response(status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.select_related("booking").get(
                provider_ref=result.provider_ref,
            )
        except Payment.DoesNotExist:
            logger.warning(
                "Webhook for unknown provider_ref=%s — returning 200 to "
                "prevent retry storm",
                result.provider_ref,
            )
            return Response(status=status.HTTP_200_OK)

        with transaction.atomic():
            payment.status = result.status
            payment.metadata = {
                **(payment.metadata or {}),
                "webhook": result.raw_response,
            }
            payment.save(update_fields=["status", "metadata", "updated_at"])

            if result.status == PaymentStatus.CAPTURED:
                BookingEvent.objects.create(
                    booking=payment.booking,
                    event_type=BookingEventType.PAYMENT_RECEIVED,
                    actor=None,
                    metadata={
                        "payment_id": str(payment.id),
                        "amount": str(result.amount),
                        "currency": result.currency,
                    },
                )

        return Response(status=status.HTTP_200_OK)
