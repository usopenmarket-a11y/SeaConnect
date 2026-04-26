"""Shared pytest fixtures for SeaConnect backend tests.

All fixtures use real DB writes — mocking the database layer is prohibited
per ADR (mocks caused production incidents).

Naming conventions:
  - `*_user`   — User instances with a specific role
  - `*_client` — APIClient pre-authenticated as a specific user
  - `*_region` — Region seed data
  - `*_port`   — DeparturePort seed data
  - `*_yacht`  — Yacht instances in a known state
"""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.bookings.models import Yacht, YachtMedia
from apps.core.models import DeparturePort, Region


# ---------------------------------------------------------------------------
# Infrastructure fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client() -> APIClient:
    """Unauthenticated DRF APIClient."""
    return APIClient()


# ---------------------------------------------------------------------------
# Seed data fixtures — Region and DeparturePort
# ---------------------------------------------------------------------------


@pytest.fixture
def egypt_region(db) -> Region:
    """Egypt region seed record.

    Uses get_or_create so tests are idempotent even if seed migrations have
    already inserted this row.
    """
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
    """Hurghada marina — primary test port in the Egypt region."""
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
def customer_user(db, egypt_region: Region) -> User:
    """Active customer-role user."""
    return User.objects.create_user(
        email="customer@test.com",
        password="TestPass123!",
        first_name="Test",
        last_name="Customer",
        role=UserRole.CUSTOMER,
        region=egypt_region,
    )


@pytest.fixture
def owner_user(db, egypt_region: Region) -> User:
    """Active owner-role user."""
    return User.objects.create_user(
        email="owner@test.com",
        password="TestPass123!",
        first_name="Boat",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
    )


# ---------------------------------------------------------------------------
# Yacht fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def active_yacht(db, owner_user: User, egypt_region: Region, departure_port: DeparturePort) -> Yacht:
    """Active (customer-visible) yacht with one primary image."""
    yacht = Yacht.objects.create(
        owner=owner_user,
        region=egypt_region,
        departure_port=departure_port,
        name="Sea Dream",
        name_ar="حلم البحر",
        description="A beautiful yacht for charter.",
        description_ar="قارب جميل للإيجار.",
        capacity=8,
        price_per_day="1500.00",
        currency="EGP",
        yacht_type="motorboat",
        status="active",
    )
    YachtMedia.objects.create(
        yacht=yacht,
        url="https://example.com/photo.jpg",
        media_type="image",
        is_primary=True,
        order=0,
    )
    return yacht


@pytest.fixture
def draft_yacht(db, owner_user: User, egypt_region: Region, departure_port: DeparturePort) -> Yacht:
    """Draft yacht — must NOT appear in public list or detail endpoints."""
    return Yacht.objects.create(
        owner=owner_user,
        region=egypt_region,
        departure_port=departure_port,
        name="Hidden Vessel",
        name_ar="سفينة مخفية",
        description="Draft — not visible to customers.",
        description_ar="مسودة — غير مرئية للعملاء.",
        capacity=6,
        price_per_day="1200.00",
        currency="EGP",
        yacht_type="sailboat",
        status="draft",
    )


@pytest.fixture
def deleted_yacht(db, owner_user: User, egypt_region: Region, departure_port: DeparturePort) -> Yacht:
    """Soft-deleted yacht — must NOT appear in public list or detail endpoints."""
    return Yacht.objects.create(
        owner=owner_user,
        region=egypt_region,
        departure_port=departure_port,
        name="Deleted Vessel",
        name_ar="سفينة محذوفة",
        description="Soft-deleted.",
        description_ar="محذوفة بشكل مؤقت.",
        capacity=10,
        price_per_day="2000.00",
        currency="EGP",
        yacht_type="catamaran",
        status="active",
        is_deleted=True,
    )


# ---------------------------------------------------------------------------
# Pre-authenticated APIClient fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def auth_client(api_client: APIClient, customer_user: User) -> APIClient:
    """APIClient authenticated as the customer_user via Bearer token."""
    refresh = RefreshToken.for_user(customer_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return api_client


@pytest.fixture
def owner_client(api_client: APIClient, owner_user: User) -> APIClient:
    """APIClient authenticated as the owner_user via Bearer token."""
    refresh = RefreshToken.for_user(owner_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return api_client
