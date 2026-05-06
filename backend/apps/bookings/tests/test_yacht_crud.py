"""Sprint 10A — Owner yacht create + update API tests.

Covers:
  POST /api/v1/yachts/   — owner can create a yacht (draft status, owner set server-side)
  PATCH /api/v1/yachts/{id}/ — owner can partially update their own yacht
  GET  /api/v1/yachts/       — still public, no auth required (regression guard)

ADR compliance tested:
  ADR-001  — UUID PK returned in response
  ADR-013  — GET list is still cursor-paginated
  ADR-018  — currency resolved from departure port region, not hardcoded

All fixtures use real DB writes (no mocking the database per project rules).
"""
from __future__ import annotations

import uuid

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.bookings.models import Yacht, YachtStatus
from apps.core.models import DeparturePort, Region


# ---------------------------------------------------------------------------
# Local fixtures (mirrors apps/bookings/tests/conftest.py pattern)
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


@pytest.fixture
def owner_user(db, egypt_region: Region) -> User:
    return User.objects.create_user(
        email="owner_crud@test.com",
        password="TestPass123!",
        first_name="Boat",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
    )


@pytest.fixture
def second_owner_user(db, egypt_region: Region) -> User:
    """A different owner — must NOT be allowed to update another owner's yacht."""
    return User.objects.create_user(
        email="owner2_crud@test.com",
        password="TestPass123!",
        first_name="Other",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
    )


@pytest.fixture
def customer_user(db, egypt_region: Region) -> User:
    return User.objects.create_user(
        email="customer_crud@test.com",
        password="TestPass123!",
        first_name="Test",
        last_name="Customer",
        role=UserRole.CUSTOMER,
        region=egypt_region,
    )


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


def _auth_client(api_client: APIClient, user: User) -> APIClient:
    """Attach a valid JWT Bearer token for the given user."""
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return api_client


@pytest.fixture
def owner_client(api_client: APIClient, owner_user: User) -> APIClient:
    return _auth_client(api_client, owner_user)


@pytest.fixture
def second_owner_client(api_client: APIClient, second_owner_user: User) -> APIClient:
    return _auth_client(APIClient(), second_owner_user)


@pytest.fixture
def customer_client(api_client: APIClient, customer_user: User) -> APIClient:
    return _auth_client(api_client, customer_user)


@pytest.fixture
def active_yacht(
    db, owner_user: User, egypt_region: Region, departure_port: DeparturePort
) -> Yacht:
    """Active yacht owned by owner_user."""
    return Yacht.objects.create(
        owner=owner_user,
        region=egypt_region,
        departure_port=departure_port,
        name="Sea Dream",
        name_ar="حلم البحر",
        description="A beautiful yacht.",
        description_ar="قارب جميل.",
        capacity=8,
        price_per_day="1500.00",
        currency="EGP",
        yacht_type="motorboat",
        status="active",
    )


@pytest.fixture
def draft_yacht(
    db, owner_user: User, egypt_region: Region, departure_port: DeparturePort
) -> Yacht:
    """Draft yacht owned by owner_user — not visible on public GET."""
    return Yacht.objects.create(
        owner=owner_user,
        region=egypt_region,
        departure_port=departure_port,
        name="Draft Vessel",
        name_ar="سفينة مسودة",
        description="Draft.",
        description_ar="مسودة.",
        capacity=4,
        price_per_day="800.00",
        currency="EGP",
        yacht_type="sailboat",
        status="draft",
    )


# ---------------------------------------------------------------------------
# POST /api/v1/yachts/
# ---------------------------------------------------------------------------

CREATE_URL = "/api/v1/yachts/"

VALID_PAYLOAD = {
    "name": "Sunset Cruiser",
    "name_ar": "جوالة الغروب",
    "description": "Luxury sunset charter.",
    "description_ar": "رحلة فاخرة عند الغروب.",
    "capacity": 10,
    "price_per_day": "2000.00",
    "yacht_type": "motorboat",
}


@pytest.mark.django_db
class TestYachtCreate:
    """POST /api/v1/yachts/ — owner creates a new yacht."""

    def test_create_yacht_as_owner(
        self,
        owner_client: APIClient,
        departure_port: DeparturePort,
        egypt_region: Region,
        owner_user: User,
    ) -> None:
        """Happy path: owner creates yacht → 201, owner set server-side, status=draft.

        ADR-001: response includes UUID id.
        ADR-018: currency resolved from departure port's region (EGP from egypt_region).
        """
        payload = {**VALID_PAYLOAD, "departure_port": str(departure_port.id)}
        response = owner_client.post(CREATE_URL, data=payload, format="json")

        assert response.status_code == 201, response.data

        data = response.data
        # UUID id present (ADR-001)
        assert "id" in data
        uuid.UUID(str(data["id"]))  # raises if not a valid UUID

        # Owner set server-side — never from the request body
        assert str(data["owner"]["id"]) == str(owner_user.id)

        # Status must be draft regardless of any status field in the payload
        assert data["status"] == YachtStatus.DRAFT

        # Currency resolved from region (ADR-018)
        assert data["currency"] == egypt_region.currency

        # Verify DB state
        yacht = Yacht.objects.get(id=data["id"])
        assert yacht.owner_id == owner_user.id
        assert yacht.status == YachtStatus.DRAFT
        assert yacht.name == "Sunset Cruiser"

    def test_create_yacht_requires_owner_role(
        self,
        customer_client: APIClient,
        departure_port: DeparturePort,
    ) -> None:
        """Customer role must receive 403 — role check is in permission class."""
        payload = {**VALID_PAYLOAD, "departure_port": str(departure_port.id)}
        response = customer_client.post(CREATE_URL, data=payload, format="json")
        assert response.status_code == 403

    def test_create_yacht_requires_auth(
        self,
        api_client: APIClient,
        departure_port: DeparturePort,
    ) -> None:
        """Unauthenticated request must receive 401."""
        payload = {**VALID_PAYLOAD, "departure_port": str(departure_port.id)}
        response = api_client.post(CREATE_URL, data=payload, format="json")
        assert response.status_code == 401

    def test_create_yacht_missing_required_fields(
        self,
        owner_client: APIClient,
    ) -> None:
        """Empty body — validation error 400."""
        response = owner_client.post(CREATE_URL, data={}, format="json")
        assert response.status_code == 400

    def test_create_yacht_invalid_capacity_zero(
        self,
        owner_client: APIClient,
        departure_port: DeparturePort,
    ) -> None:
        """Capacity of 0 must be rejected (validator in serializer)."""
        payload = {**VALID_PAYLOAD, "departure_port": str(departure_port.id), "capacity": 0}
        response = owner_client.post(CREATE_URL, data=payload, format="json")
        assert response.status_code == 400
        # custom exception handler wraps errors: {"error": {"field": "capacity", ...}}
        assert response.data.get("error", {}).get("field") == "capacity"

    def test_create_yacht_invalid_price_zero(
        self,
        owner_client: APIClient,
        departure_port: DeparturePort,
    ) -> None:
        """price_per_day of 0 must be rejected (validator in serializer)."""
        payload = {**VALID_PAYLOAD, "departure_port": str(departure_port.id), "price_per_day": "0.00"}
        response = owner_client.post(CREATE_URL, data=payload, format="json")
        assert response.status_code == 400
        assert response.data.get("error", {}).get("field") == "price_per_day"

    def test_create_yacht_status_cannot_be_set_by_client(
        self,
        owner_client: APIClient,
        departure_port: DeparturePort,
    ) -> None:
        """Client sending status='active' must be ignored — always created as draft."""
        payload = {
            **VALID_PAYLOAD,
            "departure_port": str(departure_port.id),
            "status": "active",
        }
        response = owner_client.post(CREATE_URL, data=payload, format="json")
        assert response.status_code == 201
        assert response.data["status"] == YachtStatus.DRAFT


# ---------------------------------------------------------------------------
# PATCH /api/v1/yachts/{id}/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestYachtUpdate:
    """PATCH /api/v1/yachts/{id}/ — owner partially updates their yacht."""

    def test_update_yacht_as_owner(
        self,
        owner_client: APIClient,
        active_yacht: Yacht,
    ) -> None:
        """Happy path: owner patches name and capacity → 200, only those fields changed."""
        url = f"/api/v1/yachts/{active_yacht.id}/"
        response = owner_client.patch(
            url,
            data={"name": "Updated Name", "capacity": 12},
            format="json",
        )
        assert response.status_code == 200, response.data

        data = response.data
        assert data["name"] == "Updated Name"
        assert data["capacity"] == 12
        # Unchanged fields must remain
        assert data["name_ar"] == active_yacht.name_ar

        # Verify DB state
        active_yacht.refresh_from_db()
        assert active_yacht.name == "Updated Name"
        assert active_yacht.capacity == 12

    def test_update_yacht_status_to_active(
        self,
        owner_client: APIClient,
        draft_yacht: Yacht,
    ) -> None:
        """Owner can publish a draft by patching status to 'active'."""
        url = f"/api/v1/yachts/{draft_yacht.id}/"
        response = owner_client.patch(url, data={"status": "active"}, format="json")
        assert response.status_code == 200, response.data
        assert response.data["status"] == "active"

        draft_yacht.refresh_from_db()
        assert draft_yacht.status == "active"

    def test_update_yacht_wrong_owner(
        self,
        second_owner_client: APIClient,
        active_yacht: Yacht,
    ) -> None:
        """A different owner must receive 403 — object-level permission."""
        url = f"/api/v1/yachts/{active_yacht.id}/"
        response = second_owner_client.patch(
            url,
            data={"name": "Hijacked Name"},
            format="json",
        )
        assert response.status_code == 403
        # Verify yacht was NOT modified
        active_yacht.refresh_from_db()
        assert active_yacht.name != "Hijacked Name"

    def test_update_yacht_requires_auth(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
    ) -> None:
        """Unauthenticated PATCH must receive 401."""
        url = f"/api/v1/yachts/{active_yacht.id}/"
        response = api_client.patch(url, data={"name": "X"}, format="json")
        assert response.status_code == 401

    def test_update_yacht_customer_role_denied(
        self,
        customer_client: APIClient,
        active_yacht: Yacht,
    ) -> None:
        """Customer role patching an active yacht must receive 403."""
        url = f"/api/v1/yachts/{active_yacht.id}/"
        response = customer_client.patch(url, data={"name": "X"}, format="json")
        assert response.status_code == 403

    def test_update_yacht_not_found(
        self,
        owner_client: APIClient,
    ) -> None:
        """PATCH on a non-existent yacht UUID must return 404."""
        url = f"/api/v1/yachts/{uuid.uuid4()}/"
        response = owner_client.patch(url, data={"name": "X"}, format="json")
        assert response.status_code == 404

    def test_update_invalid_capacity(
        self,
        owner_client: APIClient,
        active_yacht: Yacht,
    ) -> None:
        """Validation error on capacity=0 must return 400."""
        url = f"/api/v1/yachts/{active_yacht.id}/"
        response = owner_client.patch(url, data={"capacity": 0}, format="json")
        assert response.status_code == 400
        assert response.data.get("error", {}).get("field") == "capacity"


# ---------------------------------------------------------------------------
# GET /api/v1/yachts/ — regression guard (must still be public)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestYachtListPublic:
    """GET /api/v1/yachts/ — public access regression guard (Sprint 2 behaviour)."""

    def test_list_yachts_still_public(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
    ) -> None:
        """Unauthenticated GET must return 200 with cursor-paginated results (ADR-013)."""
        response = api_client.get("/api/v1/yachts/")
        assert response.status_code == 200

        # ADR-013 cursor pagination shape
        assert "results" in response.data
        assert isinstance(response.data["results"], list)

        # The active yacht must appear in results
        ids = [str(r["id"]) for r in response.data["results"]]
        assert str(active_yacht.id) in ids

    def test_list_yachts_excludes_draft(
        self,
        api_client: APIClient,
        draft_yacht: Yacht,
    ) -> None:
        """Draft yacht must NOT appear in the public list."""
        response = api_client.get("/api/v1/yachts/")
        assert response.status_code == 200
        ids = [str(r["id"]) for r in response.data["results"]]
        assert str(draft_yacht.id) not in ids

    def test_detail_still_public(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
    ) -> None:
        """Unauthenticated GET on detail must return 200."""
        response = api_client.get(f"/api/v1/yachts/{active_yacht.id}/")
        assert response.status_code == 200
        assert str(response.data["id"]) == str(active_yacht.id)

    def test_put_not_allowed(
        self,
        owner_client: APIClient,
        active_yacht: Yacht,
    ) -> None:
        """PUT is disabled on the detail endpoint — only PATCH is accepted."""
        url = f"/api/v1/yachts/{active_yacht.id}/"
        response = owner_client.put(url, data={"name": "X"}, format="json")
        assert response.status_code == 405
