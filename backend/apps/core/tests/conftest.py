"""conftest.py — shared fixtures for core app tests.

All fixtures use real DB writes — no mocking per project ADR rules.
Mirrors the pattern used by bookings/tests/conftest.py so the core
tests can run standalone without relying on the top-level conftest.
"""
import pytest
from rest_framework.test import APIClient

from apps.core.models import DeparturePort, Region


@pytest.fixture
def api_client() -> APIClient:
    """Unauthenticated DRF APIClient."""
    return APIClient()


@pytest.fixture
def egypt_region(db) -> Region:
    """Active Egypt region seed record.

    Uses get_or_create so tests are idempotent even when the seed
    migration (0002_seed_egypt.py) has already inserted this row.
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
def inactive_region(db) -> Region:
    """An inactive region — must not appear in the public regions list."""
    region, _ = Region.objects.get_or_create(
        code="AE",
        defaults={
            "name_ar": "الإمارات",
            "name_en": "UAE",
            "currency": "AED",
            "timezone": "Asia/Dubai",
            "is_active": False,
        },
    )
    return region


@pytest.fixture
def hurghada_port(db, egypt_region: Region) -> DeparturePort:
    """Hurghada Marina — primary test port in the Egypt region."""
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
def inactive_port(db, egypt_region: Region) -> DeparturePort:
    """An inactive port — must not appear in the public ports list."""
    port, _ = DeparturePort.objects.get_or_create(
        name_en="Closed Dock",
        defaults={
            "name_ar": "الرصيف المغلق",
            "region": egypt_region,
            "city_en": "Sharm",
            "city_ar": "شرم",
            "latitude": "27.912900",
            "longitude": "34.329600",
            "is_active": False,
        },
    )
    return port
