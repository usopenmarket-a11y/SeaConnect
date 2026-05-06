"""Tests for Sprint 13C — Yacht semantic search endpoint.

Endpoint: GET /api/v1/yachts/search/?q=<query>

Coverage (per agent spec):
  1. test_search_requires_q_param            — missing q → 400 with error envelope
  2. test_search_returns_results_shape       — 200 with results/next_cursor/has_more
  3. test_search_fallback_text_search        — Ollama unreachable → text search works
  4. test_search_no_auth_required            — 200 without JWT

ADR compliance:
  ADR-001 — ORM only; no raw SQL in any assertion.
  ADR-019 — pgvector, 768 dims; _get_embedding mocked to zero-vector for tests.
  ADR-013 — max 10 results; search is not cursor-paginated.

Notes:
  - _get_embedding is patched so tests never hit a real Ollama instance.
  - A zero-vector (768 zeros) is a valid pgvector value and exercises the
    CosineDistance annotation path when the DB has the vector extension.
  - The fallback path is tested by patching _get_embedding to raise.
"""
from __future__ import annotations

from typing import Any
from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.bookings.models import Yacht, YachtMedia
from apps.core.models import DeparturePort, Region

SEARCH_URL = "/api/v1/yachts/search/"

ZERO_EMBEDDING: list[float] = [0.0] * 768


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def egypt_region(db) -> Region:
    region, _ = Region.objects.get_or_create(
        code="EG-SEARCH",
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
        name_en="Hurghada Marina (search)",
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
        email="search_owner@test.com",
        password="TestPass123!",
        first_name="Search",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
    )


@pytest.fixture
def active_yacht(db, owner_user: User, egypt_region: Region, departure_port: DeparturePort) -> Yacht:
    """Active yacht with an embedding so the semantic path can be exercised."""
    yacht = Yacht.objects.create(
        owner=owner_user,
        region=egypt_region,
        departure_port=departure_port,
        name="Fishing Dream",
        name_ar="حلم الصيد",
        description="Best fishing boat in Hurghada.",
        description_ar="أفضل قارب صيد في الغردقة.",
        capacity=6,
        price_per_day="1200.00",
        currency="EGP",
        yacht_type="fishing",
        status="active",
        embedding=ZERO_EMBEDDING,
    )
    YachtMedia.objects.create(
        yacht=yacht,
        url="https://example.com/fishing.jpg",
        media_type="image",
        is_primary=True,
        order=0,
    )
    return yacht


@pytest.fixture
def inactive_yacht(db, owner_user: User, egypt_region: Region, departure_port: DeparturePort) -> Yacht:
    """Inactive yacht — must never appear in search results."""
    return Yacht.objects.create(
        owner=owner_user,
        region=egypt_region,
        departure_port=departure_port,
        name="Hidden Yacht",
        name_ar="يخت مخفي",
        description="This yacht should never appear in search.",
        description_ar="هذا اليخت لا يجب أن يظهر في البحث.",
        capacity=4,
        price_per_day="900.00",
        currency="EGP",
        yacht_type="motorboat",
        status="inactive",
    )


# ---------------------------------------------------------------------------
# Test cases
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestYachtSearchMissingQ:
    """Test 1 — validation: q parameter is required."""

    def test_search_requires_q_param(self, api_client: APIClient) -> None:
        response = api_client.get(SEARCH_URL)

        assert response.status_code == 400
        data: dict[str, Any] = response.json()
        # Must include the standard error envelope fields.
        assert "error" in data
        assert data.get("code") == "ERR_VALIDATION"
        assert "detail" in data

    def test_search_empty_q_param_is_rejected(self, api_client: APIClient) -> None:
        response = api_client.get(SEARCH_URL, {"q": "   "})

        assert response.status_code == 400
        assert response.json().get("code") == "ERR_VALIDATION"


@pytest.mark.django_db
class TestYachtSearchResultsShape:
    """Test 2 — happy path: response has results/next_cursor/has_more."""

    def test_search_returns_results_shape(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
    ) -> None:
        with patch("apps.bookings.views.YachtSemanticSearchView._semantic_search") as mock_search:
            # Return the active yacht so the serializer has something to work with.
            mock_search.return_value = Yacht.objects.filter(id=active_yacht.id).select_related(
                "departure_port", "region", "owner"
            ).prefetch_related("media")

            response = api_client.get(SEARCH_URL, {"q": "fishing hurghada"})

        assert response.status_code == 200
        data: dict[str, Any] = response.json()

        # ADR shape: results list, next_cursor (None for semantic search), has_more
        assert "results" in data
        assert "next_cursor" in data
        assert "has_more" in data
        assert data["next_cursor"] is None
        assert data["has_more"] is False
        assert isinstance(data["results"], list)

    def test_search_result_fields(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
    ) -> None:
        """Each result must include the standard YachtListSerializer fields."""
        with patch("apps.bookings.tasks._get_embedding", return_value=ZERO_EMBEDDING):
            response = api_client.get(SEARCH_URL, {"q": "fishing"})

        assert response.status_code == 200
        results = response.json()["results"]
        # At least our active yacht should come back (text fallback will find it).
        assert len(results) >= 1
        first = results[0]
        for key in ("id", "name", "name_ar", "capacity", "price_per_day", "currency", "yacht_type"):
            assert key in first, f"missing key: {key}"

    def test_search_excludes_inactive_yachts(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
        inactive_yacht: Yacht,
    ) -> None:
        """Inactive yachts must never appear in results."""
        with patch("apps.bookings.tasks._get_embedding", return_value=ZERO_EMBEDDING):
            response = api_client.get(SEARCH_URL, {"q": "hidden yacht"})

        assert response.status_code == 200
        ids = [r["id"] for r in response.json()["results"]]
        assert str(inactive_yacht.id) not in ids


@pytest.mark.django_db
class TestYachtSearchFallback:
    """Test 3 — fallback: when Ollama is unreachable, text search still works."""

    def test_search_fallback_text_search(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
    ) -> None:
        """Patch _get_embedding to raise so the view falls back to text search."""
        with patch(
            "apps.bookings.tasks._get_embedding",
            side_effect=Exception("Ollama not reachable"),
        ):
            response = api_client.get(SEARCH_URL, {"q": "fishing"})

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        # The fallback icontains on "fishing" must match the active_yacht.
        ids = [r["id"] for r in data["results"]]
        assert str(active_yacht.id) in ids

    def test_search_fallback_arabic_query(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
    ) -> None:
        """Arabic query string works in the text-search fallback path."""
        with patch(
            "apps.bookings.tasks._get_embedding",
            side_effect=Exception("Ollama not reachable"),
        ):
            response = api_client.get(SEARCH_URL, {"q": "صيد"})

        assert response.status_code == 200
        ids = [r["id"] for r in response.json()["results"]]
        assert str(active_yacht.id) in ids


@pytest.mark.django_db
class TestYachtSearchNoAuthRequired:
    """Test 4 — public endpoint: no JWT required."""

    def test_search_no_auth_required(self, api_client: APIClient, active_yacht: Yacht) -> None:
        """Unauthenticated request must return 200 — public listing (ADR-003)."""
        # Ensure client has no credentials at all.
        api_client.credentials()

        with patch("apps.bookings.tasks._get_embedding", return_value=ZERO_EMBEDDING):
            response = api_client.get(SEARCH_URL, {"q": "fishing"})

        assert response.status_code == 200

    def test_search_authenticated_also_works(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
        owner_user: User,
    ) -> None:
        """Authenticated users should get the same 200 response."""
        api_client.force_authenticate(owner_user)

        with patch("apps.bookings.tasks._get_embedding", return_value=ZERO_EMBEDDING):
            response = api_client.get(SEARCH_URL, {"q": "fishing"})

        assert response.status_code == 200
        assert "results" in response.json()


@pytest.mark.django_db
class TestYachtSearchEdgeCases:
    """Additional edge-case coverage."""

    def test_search_returns_at_most_10_results(
        self,
        db,
        api_client: APIClient,
        owner_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ) -> None:
        """Result set is capped at 10 regardless of matching rows (ADR-013)."""
        for i in range(12):
            Yacht.objects.create(
                owner=owner_user,
                region=egypt_region,
                departure_port=departure_port,
                name=f"Fishing Boat {i}",
                name_ar=f"قارب صيد {i}",
                description="fishing boat description",
                description_ar="وصف قارب الصيد",
                capacity=4,
                price_per_day="500.00",
                currency="EGP",
                yacht_type="fishing",
                status="active",
            )

        with patch(
            "apps.bookings.tasks._get_embedding",
            side_effect=Exception("Ollama not reachable"),
        ):
            response = api_client.get(SEARCH_URL, {"q": "fishing"})

        assert response.status_code == 200
        assert len(response.json()["results"]) <= 10
