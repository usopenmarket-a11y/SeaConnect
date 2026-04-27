# Sprint 4 — Payments + Owner Dashboard
**Dates:** 2026-05-05 to 2026-05-12
**Goal:** End-to-end payment flow using Fawry sandbox, and an owner dashboard where owners manage their yacht listings and act on incoming bookings.
**Status:** PLANNED

**Primary agents:** payment-integration-agent, nextjs-page-agent, test-writer-agent, security-audit-agent

---

## Pre-Execution Checklist

Every agent must complete these steps before writing a single line of code:

1. Read `03-Technical-Product/10-ADR-Log.md` — all 20 binding decisions. Pay closest attention to ADR-007 (`PaymentProvider` abstract class — never call Fawry directly), ADR-009 (JWT RS256, never localStorage), ADR-012 (booking event sourcing), ADR-013 (CursorPagination), ADR-018 (Region FK, currency from region).
2. Read `HANDOFFS.md` — verify Sprint 3 deliverables (Booking state machine, booking endpoints, booking web pages) are marked DONE.
3. Read `AGENT-COSTS.md` — check remaining sprint budget before starting.
4. Read `backend/apps/bookings/models.py` — understand `Booking`, `BookingEvent`, `BookingStatus` before building the payment layer on top.
5. Read `backend/apps/bookings/services.py` — understand `BookingService` to correctly call `payment_received` event.
6. Read `backend/apps/payments/models.py` — this file exists but is a stub (empty). Sprint 4 owns it.

---

## Carry-overs from Sprint 3

| Task | Reason not completed | Priority |
|------|----------------------|----------|
| Booking form "departure_port_id" UX | If Sprint 3 left departure_port as a raw UUID input, the booking form UX is poor — Sprint 4 must make it a dropdown populated from the yacht's port | Medium |
| Owner-side booking confirmation UI | Sprint 3 built the customer-facing booking flow; owner actions were only via API — Sprint 4 delivers the owner dashboard UI | High |
| Django admin polish for Booking/Payment | Sprint 3 registered models but may not have polished list_display and actions | Low |

---

## Sprint 4 Tasks

---

### Phase A — Payment Infrastructure (Backend)

**Agent:** payment-integration-agent
**Can start:** Immediately — Sprint 3's Booking model is the only dependency, and it should be merged.
**Blocks:** Phase D (tests need the payment endpoints).

This phase owns the entire `backend/apps/payments/` app. The app stub exists from Sprint 1 (empty models, urls, admin files). Sprint 4 fills it.

**Critical ADR-007 rule:** The payment views MUST go through the `PaymentProvider` abstract interface. The views must never import `FawryProvider` directly. They call the provider resolved from `PROVIDER_REGISTRY`. This is the load-bearing pattern for future payment method additions.

---

#### Task A-1 — PaymentProvider abstract base class
**Agent:** payment-integration-agent
**Depends on:** Nothing
**Files touched:**
- `backend/apps/payments/providers/__init__.py` — create empty file
- `backend/apps/payments/providers/base.py` — create abstract base class

**What to build:**

Create the directory `backend/apps/payments/providers/` and the following files:

`backend/apps/payments/providers/base.py`:
```python
"""Abstract payment provider interface.

ADR-007: All payment operations go through this interface.
Views and services NEVER import a concrete provider class directly.
They call: provider = PROVIDER_REGISTRY[currency]()

Implementing a new payment provider:
  1. Create apps/payments/providers/myprovider.py
  2. Subclass PaymentProvider and implement all abstract methods.
  3. Add the currency → class mapping to PROVIDER_REGISTRY in registry.py.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal


@dataclass
class PaymentInitResult:
    """Result of initiating a payment."""
    provider_ref: str           # Provider-assigned reference ID
    checkout_url: str           # URL to redirect the customer to
    raw_response: dict          # Full provider response for metadata storage


@dataclass
class PaymentStatusResult:
    """Result of querying a payment's current status."""
    provider_ref: str
    status: str                 # 'captured', 'pending', 'failed', 'refunded'
    amount: Decimal
    currency: str
    raw_response: dict


class PaymentProvider(ABC):
    """Base class for all payment gateways."""

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
        """Verify the authenticity of an inbound webhook from the provider."""
        ...

    @abstractmethod
    def parse_webhook(self, payload: bytes) -> PaymentStatusResult:
        """Parse the webhook payload into a PaymentStatusResult."""
        ...
```

**Definition of done:**
- `PaymentProvider` is abstract — instantiating it directly raises `TypeError`.
- `PaymentInitResult` and `PaymentStatusResult` are importable from `apps.payments.providers.base`.
- `python manage.py check` passes.

---

#### Task A-2 — FawryProvider (sandbox implementation)
**Agent:** payment-integration-agent
**Depends on:** Task A-1
**Files touched:**
- `backend/apps/payments/providers/fawry.py` — create Fawry sandbox implementation
- `backend/apps/payments/providers/registry.py` — create provider registry
- `backend/config/settings/base.py` — add Fawry sandbox settings

**What to build:**

Add to `backend/config/settings/base.py`:
```python
# Payment gateway settings — Fawry sandbox
FAWRY_MERCHANT_CODE: str = env.str("FAWRY_MERCHANT_CODE", default="sandbox-merchant")
FAWRY_SECURITY_KEY: str = env.str("FAWRY_SECURITY_KEY", default="sandbox-key")
FAWRY_BASE_URL: str = env.str("FAWRY_BASE_URL", default="https://atfawry.fawrystaging.com")
```

Create `backend/apps/payments/providers/fawry.py`:
```python
"""Fawry payment provider — sandbox implementation.

ADR-007: This class is NEVER imported directly by views.
Views use: from apps.payments.providers.registry import PROVIDER_REGISTRY
           provider = PROVIDER_REGISTRY[currency]()

Fawry sandbox documentation:
  https://developer.fawrystaging.com/

Authentication:
  Each request includes a SHA-256 signature computed from:
  merchant_code + order_ref + amount + security_key (in that order, concatenated).

Webhook verification:
  Fawry sends a POST to /api/v1/payments/webhook/fawry/ with a JSON body.
  The signature field in the body is verified against a hash of the payload fields.
"""
import hashlib
import json
import logging
from decimal import Decimal

import requests
from django.conf import settings

from .base import PaymentInitResult, PaymentProvider, PaymentStatusResult

logger = logging.getLogger(__name__)


class FawryProvider(PaymentProvider):

    def _compute_signature(self, *parts: str) -> str:
        """SHA-256 hash of concatenated string parts (no separators)."""
        raw = "".join(parts)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

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
        response = requests.post(
            f"{settings.FAWRY_BASE_URL}/ECommerceWeb/Fawry/payments/charge",
            json=payload,
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()
        return PaymentInitResult(
            provider_ref=data.get("referenceNumber", ""),
            checkout_url=data.get("nextAction", {}).get("redirectUrl", ""),
            raw_response=data,
        )

    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """Verify the SHA-256 signature on the Fawry webhook."""
        computed = hashlib.sha256(
            (payload.decode("utf-8") + settings.FAWRY_SECURITY_KEY).encode("utf-8")
        ).hexdigest()
        return computed == signature

    def parse_webhook(self, payload: bytes) -> PaymentStatusResult:
        data = json.loads(payload)
        status_map = {
            "PAID": "captured",
            "FAILED": "failed",
            "REFUNDED": "refunded",
        }
        return PaymentStatusResult(
            provider_ref=data.get("fawryRefNumber", ""),
            status=status_map.get(data.get("paymentStatus", ""), "pending"),
            amount=Decimal(str(data.get("paymentAmount", "0"))),
            currency=data.get("currency", "EGP"),
            raw_response=data,
        )
```

Create `backend/apps/payments/providers/registry.py`:
```python
"""Provider registry — maps ISO 4217 currency to the correct PaymentProvider class.

ADR-007: Currency → provider resolved at runtime. Never hardcode a provider
in views or services. New payment methods are added here only.

Usage:
    from apps.payments.providers.registry import get_provider
    provider = get_provider(currency)   # raises KeyError if currency not supported
"""
from .base import PaymentProvider
from .fawry import FawryProvider

PROVIDER_REGISTRY: dict[str, type[PaymentProvider]] = {
    "EGP": FawryProvider,
    # "AED": TelrProvider,     # Sprint 7 — UAE expansion
    # "EUR": StripeProvider,   # Sprint 8 — EU expansion
}


def get_provider(currency: str) -> PaymentProvider:
    """Return an initialized provider instance for the given currency."""
    provider_class = PROVIDER_REGISTRY.get(currency.upper())
    if provider_class is None:
        raise KeyError(f"No payment provider registered for currency '{currency}'.")
    return provider_class()
```

**Definition of done:**
- `get_provider("EGP")` returns a `FawryProvider` instance.
- `get_provider("USD")` raises `KeyError`.
- `FawryProvider` is never imported directly in any file outside `registry.py`.
- `FawryProvider.verify_webhook()` returns `False` for a tampered signature.
- `python manage.py check` passes.

---

#### Task A-3 — Payment model
**Agent:** payment-integration-agent
**Depends on:** Task A-2 (need provider choices to match registry)
**Files touched:**
- `backend/apps/payments/models.py` — create Payment model
- `backend/apps/payments/migrations/` — generate migration
- `backend/apps/payments/admin.py` — register Payment

**What to build:**

```python
"""Payment models — Sprint 4.

ADR-001: UUID PK, ORM only.
ADR-018: currency is ISO 4217 from the booking — never hardcoded.
ADR-007: provider field matches keys in PROVIDER_REGISTRY.
"""
import uuid
from django.db import models
from apps.core.models import TimeStampedModel


class PaymentProvider(models.TextChoices):
    FAWRY = "fawry", "Fawry"
    TELR = "telr", "Telr"
    STRIPE = "stripe", "Stripe"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    CAPTURED = "captured", "Captured"
    FAILED = "failed", "Failed"
    REFUNDED = "refunded", "Refunded"


class Payment(TimeStampedModel):
    """
    Represents a single payment attempt against a Booking.

    One Booking can have multiple Payment records (retry after failure).
    A Booking is considered paid when any of its Payments reaches 'captured'.

    ADR-007: provider field is the string key — never a direct class reference.
    ADR-018: currency must come from booking.currency, never hardcoded.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.PROTECT,
        related_name="payments",
    )
    provider = models.CharField(
        max_length=20,
        choices=PaymentProvider.choices,
        help_text="Payment gateway used (matches PROVIDER_REGISTRY key).",
    )
    provider_ref = models.CharField(
        max_length=255,
        blank=True,
        help_text="Provider-assigned transaction reference (e.g. Fawry reference number).",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Amount charged. NUMERIC(12,2) — never float.",
    )
    currency = models.CharField(
        max_length=3,
        help_text="ISO 4217 currency code inherited from booking.",
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )
    checkout_url = models.URLField(
        max_length=1000,
        blank=True,
        help_text="The URL the customer was redirected to for payment.",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Full provider response stored for audit and debugging.",
    )

    class Meta:
        db_table = "payments_payment"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["booking", "status"], name="idx_payment_booking_status"),
            models.Index(fields=["provider_ref"], name="idx_payment_provider_ref"),
            models.Index(fields=["status"], name="idx_payment_status"),
        ]
        verbose_name = "Payment"
        verbose_name_plural = "Payments"

    def __str__(self) -> str:
        return f"Payment {self.id} — {self.booking_id} ({self.get_status_display()})"
```

Admin registration:
```python
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "booking", "provider", "status", "amount", "currency", "created_at"]
    list_filter = ["status", "provider"]
    readonly_fields = ["id", "booking", "provider_ref", "metadata", "created_at", "updated_at"]
    search_fields = ["provider_ref", "booking__id"]
```

**Definition of done:**
- `python manage.py makemigrations payments` generates a clean migration.
- `python manage.py migrate` applies without errors.
- `Payment` visible in Django admin.
- `python manage.py check` passes.

---

#### Task A-4 — Payment initiate and webhook endpoints
**Agent:** payment-integration-agent
**Depends on:** Task A-3
**Files touched:**
- `backend/apps/payments/serializers.py` — create file
- `backend/apps/payments/views.py` — create payment views
- `backend/apps/payments/urls.py` — wire endpoints
- `backend/config/urls.py` — include payments URLs

**What to build:**

Create `backend/apps/payments/serializers.py`:
```python
from rest_framework import serializers
from .models import Payment


class PaymentInitiateSerializer(serializers.Serializer):
    booking_id = serializers.UUIDField()
    return_url = serializers.URLField(
        help_text="The URL to redirect to after Fawry payment completes.",
    )


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "booking", "provider", "status", "amount", "currency", "checkout_url", "created_at"]
        read_only_fields = fields
```

Create `backend/apps/payments/views.py`:
```python
"""Payment views.

ADR-007: Views never import concrete provider classes. They use get_provider().
ADR-012: Successful payment capture writes a BookingEvent(payment_received).
"""
import hashlib
import logging

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking, BookingEvent, BookingEventType, BookingStatus
from .models import Payment, PaymentProvider as PaymentProviderChoices, PaymentStatus
from .providers.registry import get_provider
from .serializers import PaymentInitiateSerializer, PaymentSerializer

logger = logging.getLogger(__name__)


class PaymentInitiateView(APIView):
    """
    POST /api/v1/payments/initiate/
    Authenticated (customer must be logged in).
    Creates a Payment record and calls the provider to get a checkout URL.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PaymentInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        booking = get_object_or_404(
            Booking,
            id=data["booking_id"],
            customer=request.user,
            status=BookingStatus.CONFIRMED,
        )

        provider = get_provider(booking.currency)
        try:
            result = provider.initiate(
                amount=booking.total_amount,
                currency=booking.currency,
                order_ref=str(booking.id),
                customer_email=request.user.email,
                customer_name=f"{request.user.first_name} {request.user.last_name}".strip(),
                return_url=data["return_url"],
            )
        except Exception as exc:
            logger.error("Payment initiation failed: %s", exc)
            return Response(
                {"error": {"code": "PAYMENT_INITIATION_FAILED", "message": str(exc)}},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payment = Payment.objects.create(
            booking=booking,
            provider=PaymentProviderChoices.FAWRY,
            provider_ref=result.provider_ref,
            amount=booking.total_amount,
            currency=booking.currency,
            status=PaymentStatus.PENDING,
            checkout_url=result.checkout_url,
            metadata=result.raw_response,
        )
        return Response(
            {
                "payment": PaymentSerializer(payment).data,
                "checkout_url": result.checkout_url,
            },
            status=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_exempt, name="dispatch")
class FawryWebhookView(APIView):
    """
    POST /api/v1/payments/webhook/fawry/
    Unauthenticated — Fawry sends this from their servers.
    Verifies the signature, updates Payment + Booking status.
    ADR-012: writes BookingEvent(payment_received) on capture.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_body = request.body
        signature = request.headers.get("X-Fawry-Signature", "")

        provider = get_provider("EGP")
        if not provider.verify_webhook(raw_body, signature):
            return Response(
                {"error": {"code": "INVALID_SIGNATURE", "message": "Webhook signature mismatch."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = provider.parse_webhook(raw_body)
        except Exception as exc:
            logger.error("Webhook parse failed: %s", exc)
            return Response(status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(provider_ref=result.provider_ref)
        except Payment.DoesNotExist:
            logger.warning("Webhook for unknown provider_ref: %s", result.provider_ref)
            return Response(status=status.HTTP_200_OK)  # return 200 to prevent Fawry retry

        with transaction.atomic():
            payment.status = result.status
            payment.metadata = {**payment.metadata, "webhook": result.raw_response}
            payment.save(update_fields=["status", "metadata", "updated_at"])

            if result.status == "captured":
                BookingEvent.objects.create(
                    booking=payment.booking,
                    event_type=BookingEventType.PAYMENT_RECEIVED,
                    actor=None,
                    metadata={"payment_id": str(payment.id), "amount": str(result.amount)},
                )

        return Response(status=status.HTTP_200_OK)
```

Create `backend/apps/payments/urls.py`:
```python
from django.urls import path
from . import views

app_name = "payments"

urlpatterns = [
    path("payments/initiate/", views.PaymentInitiateView.as_view(), name="payment-initiate"),
    path("payments/webhook/fawry/", views.FawryWebhookView.as_view(), name="fawry-webhook"),
]
```

Add to `backend/config/urls.py`:
```python
path("api/v1/", include("apps.payments.urls")),
```

**Definition of done:**
- `POST /api/v1/payments/initiate/` with a confirmed booking returns HTTP 201 with `checkout_url`.
- `POST /api/v1/payments/initiate/` with a `pending_owner` booking returns HTTP 404 (booking is not confirmed yet).
- `POST /api/v1/payments/webhook/fawry/` with invalid signature returns HTTP 400.
- `POST /api/v1/payments/webhook/fawry/` with valid captured event: sets `payment.status='captured'` and inserts a `BookingEvent(payment_received)` in the same transaction.
- No concrete provider class is imported in `views.py` — only `get_provider()` is called.
- `python manage.py check` passes.

---

### Phase B — Owner Dashboard Web

**Agent:** nextjs-page-agent
**Can start:** Independently of Phase A. The owner dashboard reads bookings and yachts from endpoints already built in Sprint 2 and 3.
**Depends on:** Sprint 3 booking endpoints live at `/api/v1/bookings/` (must be confirmed in HANDOFFS.md).

---

#### Task B-1 — Owner dashboard home (KPI cards)
**Agent:** nextjs-page-agent
**Depends on:** Sprint 3 complete (needs booking list endpoint with owner-scoped results)
**Files touched:**
- `web/app/[locale]/owner/layout.tsx` — create owner layout with role guard
- `web/app/[locale]/owner/dashboard/page.tsx` — create Client Component
- `web/components/owner/StatCard.tsx` — create reusable KPI card component
- `web/messages/ar.json` — add `owner.*` i18n keys
- `web/messages/en.json` — add `owner.*` i18n keys

**What to build:**

Create `web/app/[locale]/owner/layout.tsx`:
- Wraps all `/owner/*` pages.
- Uses `useAuth()` to check `user.role === 'owner'`.
- If user is not authenticated: redirect to `/${locale}/login`.
- If user is authenticated but not an owner: redirect to `/${locale}/` (home).
- Shows an owner navigation sidebar with links to: Dashboard, Bookings, My Yachts.

Create `web/app/[locale]/owner/dashboard/page.tsx`:
- Client Component that uses SWR to fetch `GET /api/v1/bookings/?status=pending_owner` (count of pending bookings) and `GET /api/v1/bookings/` for overall stats.
- Renders three `StatCard` components:
  1. Pending bookings: count of `pending_owner` status bookings.
  2. Active bookings: count of `confirmed` status bookings.
  3. Total earnings: sum of `total_amount` from `completed` bookings (compute client-side from the list response).

Required i18n keys:
```
owner.dashboard.title, owner.dashboard.pendingBookings,
owner.dashboard.activeBookings, owner.dashboard.totalEarnings,
owner.nav.dashboard, owner.nav.bookings, owner.nav.myYachts
```

RTL compliance: use `ms-`, `me-`, `ps-`, `pe-` throughout. Sidebar layout uses `flex-row` with logical direction.

**Definition of done:**
- `/ar/owner/dashboard` redirects to login if not authenticated.
- `/ar/owner/dashboard` redirects to home if user is a `customer`.
- Three KPI cards render with real data from the API.
- TypeScript compiles with no errors.

---

#### Task B-2 — Owner booking list with confirm/decline actions
**Agent:** nextjs-page-agent
**Depends on:** Task B-1 (owner layout)
**Files touched:**
- `web/app/[locale]/owner/bookings/page.tsx` — create Client Component
- `web/components/owner/BookingActionRow.tsx` — create row with confirm/decline buttons
- `web/messages/ar.json` — add `owner.bookings.*` keys
- `web/messages/en.json` — add `owner.bookings.*` keys

**What to build:**

Owner booking list page that:
- Uses SWR to fetch `GET /api/v1/bookings/` (owner sees their yacht bookings).
- Renders a table with: customer name, yacht name, dates, passengers, total, status, actions.
- For `pending_owner` bookings: shows Confirm and Decline buttons.
- Confirm button: calls `PATCH /api/v1/bookings/{id}/confirm/`, triggers SWR revalidation.
- Decline button: opens an inline textarea for a reason, then calls `PATCH /api/v1/bookings/{id}/decline/` with `{reason}`.
- Loading and error states handled.
- Status filter tabs: All / Pending / Confirmed / Completed.

Required i18n keys:
```
owner.bookings.title, owner.bookings.empty, owner.bookings.confirm,
owner.bookings.decline, owner.bookings.declineReason, owner.bookings.declineSubmit,
owner.bookings.filter.all, owner.bookings.filter.pending,
owner.bookings.filter.confirmed, owner.bookings.filter.completed
```

**Definition of done:**
- Confirm button calls the correct endpoint and updates the row status without a page reload.
- Decline inline form submits with reason and updates the row.
- Filter tabs correctly filter the displayed bookings client-side.
- TypeScript compiles with no errors.

---

#### Task B-3 — Owner yacht management list
**Agent:** nextjs-page-agent
**Depends on:** Task B-1 (owner layout)
**Files touched:**
- `web/app/[locale]/owner/yachts/page.tsx` — create Client Component
- `web/messages/ar.json` — add `owner.yachts.*` keys
- `web/messages/en.json` — add `owner.yachts.*` keys

**What to build:**

Owner yacht management list that:
- Uses SWR to fetch `GET /api/v1/yachts/?owner_id={userId}` (owner-scoped). Note: the existing yacht endpoint is public and filters by status=active. The owner needs to see their own yachts regardless of status. If the existing endpoint does not support owner filtering, this page falls back to filtering the general list client-side — document this as a known gap for Sprint 6.
- Renders a table with: yacht name (name_ar / name), type, status, price per day, and an Edit link.
- Shows a "New Listing" button linking to `/[locale]/owner/yachts/new`.

Required i18n keys:
```
owner.yachts.title, owner.yachts.empty, owner.yachts.newListing,
owner.yachts.status.active, owner.yachts.status.draft, owner.yachts.status.inactive,
owner.yachts.edit
```

**Definition of done:**
- Yacht list renders for an authenticated owner.
- "New Listing" button links to the create form page.
- TypeScript compiles with no errors.

---

#### Task B-4 — Owner new yacht listing form
**Agent:** nextjs-page-agent
**Depends on:** Task B-3
**Files touched:**
- `web/app/[locale]/owner/yachts/new/page.tsx` — create Client Component
- `web/messages/ar.json` — add `owner.yachts.form.*` keys
- `web/messages/en.json` — add `owner.yachts.form.*` keys

**What to build:**

A multi-field form for yacht creation. The API endpoint for creating yachts does not yet exist (it will be built in Sprint 6's full owner management sprint). For now, the form must be built and submit to a placeholder — either call the endpoint if Sprint 6 agents have added it, or display a "coming soon" toast if the API returns 404/405.

Form fields (based on the Yacht model):
- Name (English): text input
- Name (Arabic): text input — labeled "اسم اليخت"
- Description (English): textarea
- Description (Arabic): textarea
- Capacity: number input
- Price per day: decimal input
- Yacht type: select (motorboat, sailboat, catamaran, fishing, speedboat)
- Departure port: select populated from `GET /api/v1/ports/` (add this endpoint in Phase C below if not done)

Required i18n keys:
```
owner.yachts.form.title, owner.yachts.form.nameEn, owner.yachts.form.nameAr,
owner.yachts.form.descriptionEn, owner.yachts.form.descriptionAr,
owner.yachts.form.capacity, owner.yachts.form.pricePerDay,
owner.yachts.form.type, owner.yachts.form.departurePort,
owner.yachts.form.submit, owner.yachts.form.successMessage,
owner.yachts.form.comingSoon
```

**Definition of done:**
- Form renders correctly in RTL (Arabic) and LTR (English).
- All field labels use i18n keys.
- If the POST API returns 405, the form shows the `owner.yachts.form.comingSoon` message.
- TypeScript compiles with no errors.

---

### Phase C — Departure Ports Public Endpoint

**Agent:** payment-integration-agent (can be any backend-capable agent — added here as it is a small task that unblocks the yacht form)
**Can start:** Immediately.
**Depends on:** Nothing — `DeparturePort` model exists from Sprint 1.

---

#### Task C-1 — Public ports list endpoint
**Agent:** payment-integration-agent
**Depends on:** Nothing
**Files touched:**
- `backend/apps/core/views.py` — add `DeparturePortListView`
- `backend/apps/core/serializers.py` — add `DeparturePortSerializer`
- `backend/apps/core/urls.py` — wire endpoint
- `backend/config/urls.py` — confirm core URLs are included

**What to build:**

Add to `backend/apps/core/serializers.py`:
```python
from rest_framework import serializers
from .models import DeparturePort, Region


class DeparturePortSerializer(serializers.ModelSerializer):
    region_code = serializers.CharField(source="region.code", read_only=True)

    class Meta:
        model = DeparturePort
        fields = ["id", "name_en", "name_ar", "city_en", "city_ar", "latitude", "longitude", "region_code", "is_active"]
```

Add to `backend/apps/core/views.py`:
```python
from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import DeparturePort
from .serializers import DeparturePortSerializer


class DeparturePortListView(generics.ListAPIView):
    """GET /api/v1/ports/ — public list of active departure ports."""
    permission_classes = [AllowAny]
    serializer_class = DeparturePortSerializer
    queryset = DeparturePort.objects.filter(is_active=True).select_related("region").order_by("name_en")
```

Wire in `backend/apps/core/urls.py`:
```python
path("ports/", views.DeparturePortListView.as_view(), name="port-list"),
```

**Definition of done:**
- `GET /api/v1/ports/` returns all active ports, no auth required.
- Response includes `name_en`, `name_ar`, `city_en`, `city_ar`, `latitude`, `longitude`.
- `python manage.py check` passes.

---

### Phase D — Tests

**Agent:** test-writer-agent
**Can start:** After Phase A is complete.
**Depends on:** Task A-4 (payment endpoints), Task A-2 (FawryProvider).

---

#### Task D-1 — Payment provider unit tests
**Agent:** test-writer-agent
**Depends on:** Task A-2 (FawryProvider implementation)
**Files touched:**
- `backend/apps/payments/tests/__init__.py` — create
- `backend/apps/payments/tests/test_providers.py` — create

**What to build:**

These are unit tests — they must NOT make real HTTP calls to Fawry. Use `unittest.mock.patch` to mock `requests.post`.

```python
# backend/apps/payments/tests/test_providers.py
import hashlib
import json
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from apps.payments.providers.fawry import FawryProvider
from apps.payments.providers.registry import get_provider


class TestFawryProvider:

    def test_get_provider_egp_returns_fawry(self):
        provider = get_provider("EGP")
        assert isinstance(provider, FawryProvider)

    def test_get_provider_unknown_currency_raises(self):
        with pytest.raises(KeyError):
            get_provider("XYZ")

    def test_initiate_calls_correct_endpoint(self):
        with patch("apps.payments.providers.fawry.requests.post") as mock_post:
            mock_post.return_value.json.return_value = {
                "referenceNumber": "FAW-001",
                "nextAction": {"redirectUrl": "https://fawry.sandbox/pay/FAW-001"},
            }
            mock_post.return_value.raise_for_status = MagicMock()

            provider = FawryProvider()
            result = provider.initiate(
                amount=Decimal("1500.00"),
                currency="EGP",
                order_ref="booking-uuid-123",
                customer_email="test@example.com",
                customer_name="Ahmed Mohamed",
                return_url="https://seaconnect.app/booking/confirm",
            )
            assert result.provider_ref == "FAW-001"
            assert "FAW-001" in result.checkout_url
            mock_post.assert_called_once()

    def test_verify_webhook_valid_signature(self, settings):
        settings.FAWRY_SECURITY_KEY = "test-key"
        provider = FawryProvider()
        payload = b'{"paymentStatus": "PAID"}'
        signature = hashlib.sha256(
            (payload.decode("utf-8") + "test-key").encode("utf-8")
        ).hexdigest()
        assert provider.verify_webhook(payload, signature) is True

    def test_verify_webhook_invalid_signature(self, settings):
        settings.FAWRY_SECURITY_KEY = "test-key"
        provider = FawryProvider()
        payload = b'{"paymentStatus": "PAID"}'
        assert provider.verify_webhook(payload, "wrong-sig") is False

    def test_parse_webhook_paid_maps_to_captured(self):
        provider = FawryProvider()
        payload = json.dumps({
            "fawryRefNumber": "FAW-001",
            "paymentStatus": "PAID",
            "paymentAmount": "1500.00",
            "currency": "EGP",
        }).encode("utf-8")
        result = provider.parse_webhook(payload)
        assert result.status == "captured"
        assert result.amount == Decimal("1500.00")

    def test_parse_webhook_failed_maps_to_failed(self):
        provider = FawryProvider()
        payload = json.dumps({
            "fawryRefNumber": "FAW-001",
            "paymentStatus": "FAILED",
            "paymentAmount": "0",
            "currency": "EGP",
        }).encode("utf-8")
        result = provider.parse_webhook(payload)
        assert result.status == "failed"
```

**Definition of done:**
- All tests pass with `pytest backend/apps/payments/tests/test_providers.py -v`.
- No test makes a real HTTP call to Fawry — all HTTP is mocked.
- `test_verify_webhook_invalid_signature` covers the tampered-payload case.

---

#### Task D-2 — Webhook integration tests and owner dashboard permission tests
**Agent:** test-writer-agent
**Depends on:** Task A-4 (webhook endpoint), Task D-1
**Files touched:**
- `backend/apps/payments/tests/test_payments_api.py` — create

**What to build:**

```python
# backend/apps/payments/tests/test_payments_api.py
import hashlib
import json
from decimal import Decimal
from unittest.mock import MagicMock, patch
import pytest
from rest_framework.test import APIClient
from apps.bookings.models import Booking, BookingStatus, BookingEvent, BookingEventType
from apps.payments.models import Payment, PaymentStatus


@pytest.mark.django_db
class TestPaymentInitiate:

    def test_initiate_requires_authentication(self, api_client, confirmed_booking):
        response = api_client.post("/api/v1/payments/initiate/", {"booking_id": str(confirmed_booking.id), "return_url": "https://example.com"})
        assert response.status_code == 401

    def test_initiate_with_confirmed_booking_returns_201(self, auth_client, confirmed_booking):
        with patch("apps.payments.views.get_provider") as mock_get_provider:
            mock_provider = MagicMock()
            mock_provider.initiate.return_value = MagicMock(
                provider_ref="FAW-TEST-001",
                checkout_url="https://fawry.sandbox/pay/FAW-TEST-001",
                raw_response={},
            )
            mock_get_provider.return_value = mock_provider
            response = auth_client.post("/api/v1/payments/initiate/", {
                "booking_id": str(confirmed_booking.id),
                "return_url": "https://seaconnect.app/confirm",
            })
            assert response.status_code == 201
            assert "checkout_url" in response.data

    def test_initiate_with_pending_booking_returns_404(self, auth_client, pending_booking):
        response = auth_client.post("/api/v1/payments/initiate/", {
            "booking_id": str(pending_booking.id),
            "return_url": "https://seaconnect.app/confirm",
        })
        assert response.status_code == 404


@pytest.mark.django_db
class TestFawryWebhook:

    def test_webhook_invalid_signature_returns_400(self, api_client):
        response = api_client.post(
            "/api/v1/payments/webhook/fawry/",
            data=b'{"paymentStatus": "PAID"}',
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE="bad-signature",
        )
        assert response.status_code == 400

    def test_webhook_paid_sets_payment_captured_and_inserts_event(self, api_client, pending_payment, settings):
        settings.FAWRY_SECURITY_KEY = "test-secret"
        payload = json.dumps({
            "fawryRefNumber": pending_payment.provider_ref,
            "paymentStatus": "PAID",
            "paymentAmount": str(pending_payment.amount),
            "currency": "EGP",
        }).encode("utf-8")
        signature = hashlib.sha256(
            (payload.decode("utf-8") + "test-secret").encode("utf-8")
        ).hexdigest()
        response = api_client.post(
            "/api/v1/payments/webhook/fawry/",
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=signature,
        )
        assert response.status_code == 200
        pending_payment.refresh_from_db()
        assert pending_payment.status == PaymentStatus.CAPTURED
        assert BookingEvent.objects.filter(
            booking=pending_payment.booking,
            event_type=BookingEventType.PAYMENT_RECEIVED,
        ).exists()

    def test_webhook_unknown_provider_ref_returns_200(self, api_client, settings):
        """Unknown ref returns 200 to prevent Fawry from retrying indefinitely."""
        settings.FAWRY_SECURITY_KEY = "test-secret"
        payload = json.dumps({
            "fawryRefNumber": "NONEXISTENT-REF",
            "paymentStatus": "PAID",
            "paymentAmount": "100.00",
            "currency": "EGP",
        }).encode("utf-8")
        signature = hashlib.sha256(
            (payload.decode("utf-8") + "test-secret").encode("utf-8")
        ).hexdigest()
        response = api_client.post(
            "/api/v1/payments/webhook/fawry/",
            data=payload,
            content_type="application/json",
            HTTP_X_FAWRY_SIGNATURE=signature,
        )
        assert response.status_code == 200
```

Add the following fixtures to `backend/tests/conftest.py` (append — do not replace):
```python
@pytest.fixture
def confirmed_booking(active_yacht, customer_user, egypt_region, departure_port):
    from apps.bookings.models import Booking, BookingStatus
    import datetime
    return Booking.objects.create(
        yacht=active_yacht,
        customer=customer_user,
        region=egypt_region,
        departure_port=departure_port,
        start_date=datetime.date(2026, 6, 1),
        end_date=datetime.date(2026, 6, 3),
        num_passengers=4,
        total_amount="3000.00",
        currency="EGP",
        status=BookingStatus.CONFIRMED,
    )

@pytest.fixture
def pending_booking(active_yacht, customer_user, egypt_region, departure_port):
    from apps.bookings.models import Booking, BookingStatus
    import datetime
    return Booking.objects.create(
        yacht=active_yacht,
        customer=customer_user,
        region=egypt_region,
        departure_port=departure_port,
        start_date=datetime.date(2026, 6, 1),
        end_date=datetime.date(2026, 6, 3),
        num_passengers=4,
        total_amount="3000.00",
        currency="EGP",
        status=BookingStatus.PENDING_OWNER,
    )

@pytest.fixture
def pending_payment(confirmed_booking):
    from apps.payments.models import Payment, PaymentProviderChoices, PaymentStatus
    return Payment.objects.create(
        booking=confirmed_booking,
        provider=PaymentProviderChoices.FAWRY,
        provider_ref="FAW-PYTEST-001",
        amount=confirmed_booking.total_amount,
        currency=confirmed_booking.currency,
        status=PaymentStatus.PENDING,
        checkout_url="https://fawry.sandbox/pay/FAW-PYTEST-001",
    )
```

**Definition of done:**
- All tests pass with `pytest backend/apps/payments/tests/ -v`.
- The webhook test asserts that `BookingEvent(payment_received)` is created atomically with the payment status update.
- The unknown-ref test asserts HTTP 200 (not 404 or 500) to prevent Fawry retry loops.

---

### Phase E — Security Audit

**Agent:** security-audit-agent
**Can start:** After Phase A is complete.
**Depends on:** Task A-4 (payment views must exist to be audited).

---

#### Task E-1 — Payment endpoint security audit
**Agent:** security-audit-agent
**Depends on:** Task A-4
**Files reviewed:**
- `backend/apps/payments/views.py`
- `backend/apps/payments/providers/fawry.py`
- `backend/apps/payments/providers/registry.py`
- `backend/config/settings/base.py` (Fawry section)

**Checklist:**

1. Webhook endpoint has `authentication_classes = []` and `permission_classes = [AllowAny]` — not protected by JWT (correct, because Fawry calls it from their server without a user token).
2. Webhook endpoint is protected by signature verification BEFORE any database writes occur.
3. `FAWRY_SECURITY_KEY` is loaded from environment variable — never hardcoded in settings.
4. The `PaymentInitiateView` requires `IsAuthenticated` and verifies the booking belongs to `request.user`.
5. No concrete provider class is imported in views — only `get_provider()`.
6. `FawryProvider` never logs the full `FAWRY_SECURITY_KEY` in error messages.
7. Amount is always read from the `Booking` object — never from user-supplied request data (cannot be tampered).
8. CSRF is exempt on the webhook view via `@csrf_exempt` — this is correct and intentional for server-to-server webhooks.

**Definition of done:**
- Written audit note added as a comment block at the top of `backend/apps/payments/views.py`.
- Items 1–7 all pass. Any critical failure must be fixed before sprint close.
- Non-critical findings recorded in `HANDOFFS.md`.

---

## Agent Coordination Notes

### Dependency order

```
Week 1 — Days 1-5 (2026-05-05 to 2026-05-09):
  Day 1:   Phase A (payment-integration-agent) — base class + Fawry provider
            Phase C (can be done in parallel — small, standalone ports endpoint)
  Day 2-3: Phase A (A-3, A-4) — Payment model, initiate/webhook views
            Phase B (nextjs-page-agent) — owner dashboard, booking list (needs no payment APIs)
  Day 3-4: Phase B continues — yacht list, yacht form
  Day 4-5: Phase D (test-writer-agent) — payment unit + integration tests

Week 2 — Days 6-8 (2026-05-09 to 2026-05-12):
  Day 6:   Phase E (security-audit-agent) — payment endpoint review
  Day 7:   Fix any audit findings. Full integration smoke test.
  Day 8:   HANDOFFS.md update, AGENT-COSTS.md update, sprint retrospective notes.
```

### File conflict zones

| File | Agents writing | Resolution |
|------|---------------|------------|
| `backend/apps/payments/models.py` | payment-integration-agent (A-3) | Sole owner — app was empty stub |
| `backend/apps/payments/views.py` | payment-integration-agent (A-4) | Sole owner — app was empty stub |
| `backend/tests/conftest.py` | test-writer-agent (D-2) | Appends only — adds confirmed_booking, pending_booking, pending_payment fixtures |
| `web/messages/ar.json` | nextjs-page-agent (B-1, B-2, B-3, B-4) | Sequential — each task adds a new `owner.*` sub-key |
| `backend/config/urls.py` | payment-integration-agent (A-4), possibly core agent (C-1) | Core urls may already be included — check before adding |

### Critical implementation notes

1. ADR-007 is the most important constraint for this sprint. The `views.py` must import `get_provider()`, not `FawryProvider`. The security audit will flag a violation.
2. The webhook endpoint MUST NOT be behind JWT authentication — Fawry calls it server-to-server. The `@csrf_exempt` decorator and `authentication_classes = []` are correct.
3. Payment amount must be read from `booking.total_amount`, not from the webhook payload amount. Fawry's amount in the webhook is for display/confirmation only — do not set `payment.amount` from the webhook.
4. The owner dashboard layout (`owner/layout.tsx`) must check both authentication AND role. A logged-in customer must be redirected away from `/owner/*` pages.
5. The yacht creation form (Task B-4) submits to an endpoint that does not yet exist. This is intentional — the full owner CRUD for yachts is Sprint 6. The form should degrade gracefully.

---

## Token Budget

| Agent | Phase | Estimated tokens | Purpose |
|-------|-------|-----------------|---------|
| payment-integration-agent | A + C | 40,000 | Provider base class, Fawry implementation, registry, Payment model, initiate/webhook views, ports endpoint |
| nextjs-page-agent | B | 45,000 | Owner layout + role guard, dashboard KPIs, booking list with actions, yacht list, yacht form |
| test-writer-agent | D | 25,000 | Provider unit tests, webhook integration tests, conftest fixtures |
| security-audit-agent | E | 10,000 | Payment endpoint security review |
| **Total** | | **120,000** | |
| **Sprint 1–3 cumulative estimate** | | ~312,000 | |
| **Sprint 4 estimate** | | ~120,000 | |
| **Cumulative estimate** | | ~432,000 | Of 500,000 sprint budget |
| **Budget remaining** | | ~68,000 | |

---

## Risk Flags

- Fawry sandbox merchant account requires registration at developer.fawrystaging.com. If `FAWRY_MERCHANT_CODE` and `FAWRY_SECURITY_KEY` are not configured in `.env.local`, the initiate endpoint will fail in dev. The default values in settings (`sandbox-merchant`, `sandbox-key`) are placeholders only.
- The owner yacht creation form submits to an endpoint that does not exist until Sprint 6. This is a known gap. Ensure the form's error handling is graceful and does not crash the page.
- The cumulative token budget after Sprint 4 is ~432,000 of 500,000 — Sprint 5 has only ~68,000 tokens remaining at the sprint level. The monthly budget (2,000,000 tokens) has more headroom. If Sprint 5 runs over the sprint estimate, escalate to the sprint planner before starting additional sessions.
- Django admin polish for Booking and Payment (carry-over from sprint description) is low-priority — do not spend significant tokens on it. The registered models with basic `list_display` from Phase A are sufficient.

---

## Definition of Sprint Done

- [ ] `PaymentProvider` abstract base class exists in `apps/payments/providers/base.py`.
- [ ] `FawryProvider` implements the abstract interface in `apps/payments/providers/fawry.py`.
- [ ] `get_provider("EGP")` returns `FawryProvider` instance; unknown currency raises `KeyError`.
- [ ] `Payment` model migrated and visible in Django admin.
- [ ] `POST /api/v1/payments/initiate/` creates a `Payment` record and returns `checkout_url`.
- [ ] `POST /api/v1/payments/webhook/fawry/` verifies signature and updates `Payment.status`.
- [ ] Successful webhook capture inserts a `BookingEvent(payment_received)` atomically.
- [ ] `GET /api/v1/ports/` returns active departure ports without auth.
- [ ] `/[locale]/owner/dashboard` redirects customers to home and unauthenticated users to login.
- [ ] Owner dashboard shows pending/active/earnings KPI cards.
- [ ] Owner booking list allows confirming and declining bookings inline.
- [ ] Owner yacht management list renders correctly.
- [ ] Owner yacht creation form renders in RTL and LTR (endpoint can be a placeholder).
- [ ] All payment provider unit tests pass (no real Fawry HTTP calls).
- [ ] Webhook tests assert atomic event + payment status update.
- [ ] Security audit complete — no critical findings outstanding.
- [ ] `python manage.py check` passes.
- [ ] `npx tsc --noEmit` passes in `web/`.
- [ ] `HANDOFFS.md` updated with Sprint 4 → Sprint 5 handoff entry.
- [ ] `AGENT-COSTS.md` updated with Sprint 4 actual token row.
