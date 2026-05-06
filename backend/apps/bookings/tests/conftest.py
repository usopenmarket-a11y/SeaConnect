"""conftest.py — shared fixtures for bookings app tests.

Provides the full fixture set needed by availability tests.  The top-level
tests/conftest.py is not on pytest's conftest resolution path when running
from within apps/, so we duplicate the relevant fixtures here.

All fixtures use real DB writes — no mocking per project rules.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.bookings.models import Yacht, YachtMedia
from apps.core.models import DeparturePort, Region


@pytest.fixture
def api_client() -> APIClient:
    """Unauthenticated DRF APIClient."""
    return APIClient()


@pytest.fixture
def egypt_region(db) -> Region:
    """Egypt region seed record."""
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


@pytest.fixture
def owner_user(db, egypt_region: Region) -> User:
    """Active owner-role user."""
    return User.objects.create_user(
        email="owner_avail@test.com",
        password="TestPass123!",
        first_name="Boat",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
    )


@pytest.fixture
def customer_user(db, egypt_region: Region) -> User:
    """Active customer-role user."""
    return User.objects.create_user(
        email="customer_avail@test.com",
        password="TestPass123!",
        first_name="Test",
        last_name="Customer",
        role=UserRole.CUSTOMER,
        region=egypt_region,
    )


@pytest.fixture
def active_yacht(
    db, owner_user: User, egypt_region: Region, departure_port: DeparturePort
) -> Yacht:
    """Active (customer-visible) yacht with one primary image and capacity=8."""
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
