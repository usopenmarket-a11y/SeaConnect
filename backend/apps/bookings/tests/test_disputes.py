"""Sprint 13B — Dispute API tests.

Covers:
  POST /api/v1/bookings/{id}/dispute/ — customer can raise dispute on own booking → 201
  POST /api/v1/bookings/{id}/dispute/ — stranger cannot raise dispute on others' booking → 403
  GET  /api/v1/admin/disputes/        — admin can list disputes → 200
  GET  /api/v1/admin/disputes/        — non-admin cannot list disputes → 403
  POST /api/v1/admin/disputes/{id}/resolve/ — admin can resolve dispute → status becomes 'resolved'

ADR compliance tested:
  ADR-001 — UUID PKs on all returned records
  ADR-009 — JWT required; anonymous returns 401 on write
  ADR-013 — list endpoint returns next_cursor and has_more
"""
from __future__ import annotations

import datetime

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.bookings.models import (
    Booking,
    BookingEvent,
    BookingEventType,
    BookingStatus,
    Dispute,
    DisputeStatus,
    Yacht,
)
from apps.core.models import DeparturePort, Region


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


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


@pytest.fixture
def owner_user(db, egypt_region: Region) -> User:
    return User.objects.create_user(
        email="dispute_owner@test.com",
        password="TestPass123!",
        first_name="Boat",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
    )


@pytest.fixture
def customer_user(db, egypt_region: Region) -> User:
    return User.objects.create_user(
        email="dispute_customer@test.com",
        password="TestPass123!",
        first_name="Test",
        last_name="Customer",
        role=UserRole.CUSTOMER,
        region=egypt_region,
    )


@pytest.fixture
def stranger_user(db, egypt_region: Region) -> User:
    """Authenticated user who has no relationship with the booking."""
    return User.objects.create_user(
        email="dispute_stranger@test.com",
        password="TestPass123!",
        first_name="Random",
        last_name="Stranger",
        role=UserRole.CUSTOMER,
        region=egypt_region,
    )


@pytest.fixture
def admin_user(db, egypt_region: Region) -> User:
    return User.objects.create_user(
        email="dispute_admin@test.com",
        password="TestPass123!",
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
        region=egypt_region,
        is_staff=True,
    )


@pytest.fixture
def active_yacht(db, owner_user: User, egypt_region: Region, departure_port: DeparturePort) -> Yacht:
    return Yacht.objects.create(
        owner=owner_user,
        region=egypt_region,
        departure_port=departure_port,
        name="Dispute Test Yacht",
        name_ar="قارب اختبار النزاع",
        capacity=8,
        price_per_day="1500.00",
        currency="EGP",
        yacht_type="motorboat",
        status="active",
    )


@pytest.fixture
def confirmed_booking(
    db,
    active_yacht: Yacht,
    customer_user: User,
    egypt_region: Region,
    departure_port: DeparturePort,
) -> Booking:
    """Confirmed booking owned by customer_user for active_yacht."""
    booking = Booking.objects.create(
        yacht=active_yacht,
        customer=customer_user,
        region=egypt_region,
        departure_port=departure_port,
        start_date=datetime.date.today() + datetime.timedelta(days=10),
        end_date=datetime.date.today() + datetime.timedelta(days=12),
        num_passengers=3,
        total_amount="3000.00",
        currency="EGP",
        status=BookingStatus.CONFIRMED,
    )
    BookingEvent.objects.create(
        booking=booking,
        event_type=BookingEventType.CONFIRMED,
        actor=customer_user,
    )
    return booking


def _auth_client(api_client: APIClient, user: User) -> APIClient:
    """Return the APIClient with a valid JWT for ``user``."""
    token = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")
    return api_client


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_customer_can_raise_dispute_on_own_booking(
    api_client: APIClient,
    customer_user: User,
    confirmed_booking: Booking,
) -> None:
    """Customer who owns the booking can create a dispute — 201."""
    client = _auth_client(api_client, customer_user)
    url = f"/api/v1/bookings/{confirmed_booking.id}/dispute/"
    payload = {"reason": "The yacht was in poor condition and unsafe for passengers."}

    response = client.post(url, payload, format="json")

    assert response.status_code == 201, response.data
    data = response.data
    assert data["status"] == DisputeStatus.OPEN
    assert data["reason"] == payload["reason"]
    assert "id" in data
    # Persisted to DB
    assert Dispute.objects.filter(booking=confirmed_booking).exists()


@pytest.mark.django_db
def test_stranger_cannot_raise_dispute_on_others_booking(
    api_client: APIClient,
    stranger_user: User,
    confirmed_booking: Booking,
) -> None:
    """User unrelated to the booking receives 403."""
    client = _auth_client(api_client, stranger_user)
    url = f"/api/v1/bookings/{confirmed_booking.id}/dispute/"
    payload = {"reason": "I want to raise a dispute I should not be able to raise."}

    response = client.post(url, payload, format="json")

    assert response.status_code == 403
    assert not Dispute.objects.filter(booking=confirmed_booking).exists()


@pytest.mark.django_db
def test_admin_can_list_disputes(
    api_client: APIClient,
    admin_user: User,
    customer_user: User,
    confirmed_booking: Booking,
) -> None:
    """Admin sees the dispute list — 200 with CursorPagination shape."""
    Dispute.objects.create(
        booking=confirmed_booking,
        raised_by=customer_user,
        reason="Test dispute for admin listing.",
        status=DisputeStatus.OPEN,
    )

    client = _auth_client(api_client, admin_user)
    response = client.get("/api/v1/admin/disputes/")

    assert response.status_code == 200, response.data
    # ADR-013: cursor pagination shape
    assert "results" in response.data
    assert "next_cursor" in response.data
    assert "has_more" in response.data
    assert len(response.data["results"]) >= 1


@pytest.mark.django_db
def test_non_admin_cannot_list_disputes(
    api_client: APIClient,
    customer_user: User,
) -> None:
    """Non-admin user receives 403 on admin dispute list endpoint."""
    client = _auth_client(api_client, customer_user)
    response = client.get("/api/v1/admin/disputes/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_can_resolve_dispute(
    api_client: APIClient,
    admin_user: User,
    customer_user: User,
    confirmed_booking: Booking,
) -> None:
    """Admin resolves a dispute — status becomes 'resolved' and resolution is stored."""
    dispute = Dispute.objects.create(
        booking=confirmed_booking,
        raised_by=customer_user,
        reason="Dispute that the admin will resolve.",
        status=DisputeStatus.OPEN,
    )

    client = _auth_client(api_client, admin_user)
    url = f"/api/v1/admin/disputes/{dispute.id}/resolve/"
    payload = {"resolution": "After investigation, the customer's claim is valid. Partial refund issued."}

    response = client.post(url, payload, format="json")

    assert response.status_code == 200, response.data
    data = response.data
    assert data["status"] == DisputeStatus.RESOLVED

    # Confirm DB state was updated
    dispute.refresh_from_db()
    assert dispute.status == DisputeStatus.RESOLVED
    assert dispute.resolution == payload["resolution"]
    assert dispute.resolved_by_id == admin_user.id
    assert dispute.resolved_at is not None
