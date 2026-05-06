"""conftest.py — shared fixtures for analytics app tests.

All fixtures use real DB writes — mocking the database layer is
prohibited per ADR (mocks caused production incidents).
"""
import uuid

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.core.models import Region


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
def customer_user(db, egypt_region: Region) -> User:
    """Active customer-role user."""
    return User.objects.create_user(
        email=f"analytics-customer-{uuid.uuid4().hex[:6]}@test.com",
        password="TestPass123!",
        first_name="Test",
        last_name="Customer",
        role=UserRole.CUSTOMER,
        region=egypt_region,
    )


@pytest.fixture
def owner_user(db, egypt_region: Region) -> User:
    """Active owner-role user (non-admin)."""
    return User.objects.create_user(
        email=f"analytics-owner-{uuid.uuid4().hex[:6]}@test.com",
        password="TestPass123!",
        first_name="Boat",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
    )


@pytest.fixture
def admin_user(db, egypt_region: Region) -> User:
    """Staff admin user — required for audit-log endpoint (IsAdminUser = is_staff)."""
    return User.objects.create_user(
        email=f"analytics-admin-{uuid.uuid4().hex[:6]}@test.com",
        password="TestPass123!",
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
        region=egypt_region,
        is_staff=True,
    )


@pytest.fixture
def admin_client(api_client: APIClient, admin_user: User) -> APIClient:
    """APIClient pre-authenticated as admin_user via Bearer JWT."""
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return api_client


@pytest.fixture
def customer_client(api_client: APIClient, customer_user: User) -> APIClient:
    """APIClient pre-authenticated as customer_user via Bearer JWT."""
    refresh = RefreshToken.for_user(customer_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return api_client


@pytest.fixture
def owner_client(api_client: APIClient, owner_user: User) -> APIClient:
    """APIClient pre-authenticated as owner_user via Bearer JWT."""
    refresh = RefreshToken.for_user(owner_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return api_client
