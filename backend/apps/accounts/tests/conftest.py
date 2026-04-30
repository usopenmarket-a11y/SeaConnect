"""conftest.py — shared fixtures for accounts app tests.

Provides api_client so tests within apps/accounts/tests/ can run standalone,
and a pre-authenticated auth_client for endpoints that require a Bearer token.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.core.models import Region


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_or_create_region() -> Region:
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


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client() -> APIClient:
    """Unauthenticated DRF APIClient."""
    return APIClient()


@pytest.fixture
def egypt_region(db) -> Region:
    return _get_or_create_region()


@pytest.fixture
def customer_user(db, egypt_region) -> User:
    return User.objects.create_user(
        email="customer@accounts-test.com",
        password="TestPass123!",
        first_name="Test",
        last_name="Customer",
        role=UserRole.CUSTOMER,
        region=egypt_region,
    )


@pytest.fixture
def owner_user(db, egypt_region) -> User:
    return User.objects.create_user(
        email="owner@accounts-test.com",
        password="TestPass123!",
        first_name="Boat",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
    )


@pytest.fixture
def auth_client(api_client, customer_user) -> APIClient:
    """APIClient pre-authenticated as the customer_user via JWT Bearer token."""
    refresh = RefreshToken.for_user(customer_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return api_client
