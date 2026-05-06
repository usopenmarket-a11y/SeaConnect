"""conftest.py — fixtures for the payments app co-located tests.

Real DB only — mocking the database layer is prohibited per ADR
(mocks caused production incidents).  All fixture data is created
through the ORM; factory_boy is not required because this project
uses direct ORM calls as its factory pattern (see top-level conftest).

Fixtures here mirror the top-level tests/conftest.py where needed so
that these tests can be run standalone via:

    pytest apps/payments/tests/ -v
"""
from __future__ import annotations

import datetime
from decimal import Decimal

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.bookings.models import Booking, BookingStatus, Yacht, YachtMedia
from apps.core.models import DeparturePort, Region
from apps.payments.models import Payment, PaymentProviderChoices, PaymentStatus, Payout, PayoutStatus


# ---------------------------------------------------------------------------
# Infrastructure
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client() -> APIClient:
    """Unauthenticated DRF APIClient."""
    return APIClient()


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------


@pytest.fixture
def egypt_region(db) -> Region:
    region, _ = Region.objects.get_or_create(
        code="EG",
        defaults={
            "name_ar": "مصر",
            "name_en": "Egypt",
            "currency": "EGP",
            "timezone": "Africa/Cairo",
            "is_active": True,
        },
    )
    return region


@pytest.fixture
def departure_port(db, egypt_region: Region) -> DeparturePort:
    port, _ = DeparturePort.objects.get_or_create(
        name_en="Hurghada Marina",
        defaults={
            "name_ar": "مرسى الغردقة",
            "region": egypt_region,
            "city_en": "Hurghada",
            "city_ar": "الغردقة",
            "latitude": "27.257400",
            "longitude": "33.811600",
            "is_active": True,
        },
    )
    return port


# ---------------------------------------------------------------------------
# User fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def owner(db, egypt_region: Region) -> User:
    """Active owner-role user."""
    return User.objects.create_user(
        email="payments-owner@test.com",
        password="TestPass123!",
        first_name="Boat",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
    )


@pytest.fixture
def customer(db, egypt_region: Region) -> User:
    """Active customer-role user."""
    return User.objects.create_user(
        email="payments-customer@test.com",
        password="TestPass123!",
        first_name="Test",
        last_name="Customer",
        role=UserRole.CUSTOMER,
        region=egypt_region,
    )


@pytest.fixture
def other_customer(db, egypt_region: Region) -> User:
    """A second customer — used to verify booking ownership enforcement."""
    return User.objects.create_user(
        email="payments-other-customer@test.com",
        password="TestPass123!",
        first_name="Other",
        last_name="Customer",
        role=UserRole.CUSTOMER,
        region=egypt_region,
    )


# ---------------------------------------------------------------------------
# Pre-authenticated clients
# ---------------------------------------------------------------------------


def _make_token(user: User) -> str:
    """Return a valid JWT access token string for the given user."""
    return str(RefreshToken.for_user(user).access_token)


@pytest.fixture
def owner_client(api_client: APIClient, owner: User) -> APIClient:
    """APIClient authenticated as the owner user."""
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_make_token(owner)}")
    return api_client


@pytest.fixture
def customer_client(api_client: APIClient, customer: User) -> APIClient:
    """APIClient authenticated as the customer user."""
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_make_token(customer)}")
    return api_client


# ---------------------------------------------------------------------------
# Yacht fixture
# ---------------------------------------------------------------------------


@pytest.fixture
def active_yacht(db, owner: User, egypt_region: Region, departure_port: DeparturePort) -> Yacht:
    yacht = Yacht.objects.create(
        owner=owner,
        region=egypt_region,
        departure_port=departure_port,
        name="Payment Test Yacht",
        name_ar="قارب اختبار الدفع",
        description="Yacht for payment tests.",
        description_ar="قارب لاختبارات الدفع.",
        capacity=6,
        price_per_day="1500.00",
        currency="EGP",
        yacht_type="motorboat",
        status="active",
    )
    YachtMedia.objects.create(
        yacht=yacht,
        url="https://example.com/pay-test.jpg",
        media_type="image",
        is_primary=True,
        order=0,
    )
    return yacht


# ---------------------------------------------------------------------------
# Booking fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def confirmed_booking(
    db,
    active_yacht: Yacht,
    customer: User,
    egypt_region: Region,
    departure_port: DeparturePort,
) -> Booking:
    """A confirmed booking owned by `customer` — eligible for payment initiate."""
    return Booking.objects.create(
        yacht=active_yacht,
        customer=customer,
        region=egypt_region,
        departure_port=departure_port,
        start_date=datetime.date(2026, 7, 1),
        end_date=datetime.date(2026, 7, 3),
        num_passengers=4,
        total_amount="3000.00",
        currency="EGP",
        status=BookingStatus.CONFIRMED,
    )


@pytest.fixture
def pending_booking(
    db,
    active_yacht: Yacht,
    customer: User,
    egypt_region: Region,
    departure_port: DeparturePort,
) -> Booking:
    """A pending_owner booking — must be rejected by payment initiate view."""
    return Booking.objects.create(
        yacht=active_yacht,
        customer=customer,
        region=egypt_region,
        departure_port=departure_port,
        start_date=datetime.date(2026, 7, 10),
        end_date=datetime.date(2026, 7, 12),
        num_passengers=2,
        total_amount="3000.00",
        currency="EGP",
        status=BookingStatus.PENDING_OWNER,
    )


# ---------------------------------------------------------------------------
# Payment fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def pending_payment(db, confirmed_booking: Booking) -> Payment:
    """A pending Payment row attached to confirmed_booking."""
    return Payment.objects.create(
        booking=confirmed_booking,
        provider=PaymentProviderChoices.FAWRY,
        provider_ref="FAW-PAYMENTS-APP-001",
        amount=confirmed_booking.total_amount,
        currency=confirmed_booking.currency,
        status=PaymentStatus.PENDING,
        checkout_url="https://atfawry.fawrystaging.com/pay/FAW-PAYMENTS-APP-001",
    )


# ---------------------------------------------------------------------------
# Payout fixture
# ---------------------------------------------------------------------------


@pytest.fixture
def payout(db, owner: User) -> Payout:
    """A scheduled payout for the owner user."""
    return Payout.objects.create(
        owner=owner,
        amount=Decimal("38420.00"),
        currency="EGP",
        status=PayoutStatus.SCHEDULED,
        reference="PO-TEST-001",
        payment_method="Test Bank",
        scheduled_date=datetime.date(2026, 5, 15),
        escrow_booking_ids=[],
    )
