"""Integration tests for the yacht listing endpoints.

Endpoints under test:
  GET /api/v1/yachts/          — YachtListView (public, cursor-paginated, filterable)
  GET /api/v1/yachts/{id}/     — YachtDetailView (public)

Rules enforced:
  - Real PostgreSQL/SQLite DB — no mocks (ADR prohibition)
  - pytest-django @pytest.mark.django_db on every test
  - APIClient (DRF) for all requests
  - All fixtures via conftest.py
  - CursorPagination: list response shape is {results, next, previous} per ADR-013
"""
import uuid

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.bookings.models import Yacht, YachtMedia, YachtStatus
from apps.core.models import DeparturePort, Region

YACHT_LIST_URL = "/api/v1/yachts/"


def yacht_detail_url(yacht_id) -> str:
    return f"/api/v1/yachts/{yacht_id}/"


# ===========================================================================
# Yacht List — GET /api/v1/yachts/
# ===========================================================================


@pytest.mark.django_db
class TestYachtList:
    """GET /api/v1/yachts/ — public cursor-paginated listing."""

    def test_yacht_list_public(self, api_client: APIClient, active_yacht: Yacht) -> None:
        """Anonymous requests return 200 — the list endpoint is public."""
        response = api_client.get(YACHT_LIST_URL)
        assert response.status_code == 200

    def test_yacht_list_returns_results_key(self, api_client: APIClient, active_yacht: Yacht) -> None:
        """CursorPagination wraps items in a 'results' key (ADR-013)."""
        response = api_client.get(YACHT_LIST_URL)
        assert "results" in response.data

    def test_yacht_list_returns_active_only(
        self, api_client: APIClient, active_yacht: Yacht, draft_yacht: Yacht
    ) -> None:
        """Draft yachts must not appear in the public listing."""
        response = api_client.get(YACHT_LIST_URL)
        ids = [item["id"] for item in response.data["results"]]
        assert str(active_yacht.id) in ids
        assert str(draft_yacht.id) not in ids

    def test_yacht_list_deleted_excluded(
        self, api_client: APIClient, active_yacht: Yacht, deleted_yacht: Yacht
    ) -> None:
        """Soft-deleted yachts (is_deleted=True) must not appear in the listing."""
        response = api_client.get(YACHT_LIST_URL)
        ids = [item["id"] for item in response.data["results"]]
        assert str(deleted_yacht.id) not in ids

    def test_yacht_list_has_primary_image_url(
        self, api_client: APIClient, active_yacht: Yacht
    ) -> None:
        """Each list item includes a primary_image_url field."""
        response = api_client.get(YACHT_LIST_URL)
        result = next(
            item for item in response.data["results"] if item["id"] == str(active_yacht.id)
        )
        assert "primary_image_url" in result

    def test_yacht_list_primary_image_url_value(
        self, api_client: APIClient, active_yacht: Yacht
    ) -> None:
        """primary_image_url matches the is_primary=True media URL."""
        response = api_client.get(YACHT_LIST_URL)
        result = next(
            item for item in response.data["results"] if item["id"] == str(active_yacht.id)
        )
        assert result["primary_image_url"] == "https://example.com/photo.jpg"

    def test_yacht_list_filter_by_region(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
        db,
        egypt_region: Region,
        departure_port: DeparturePort,
        owner_user: User,
    ) -> None:
        """?region=EG returns only yachts in the EG region."""
        # Create a second region and yacht that should NOT appear.
        other_region = Region.objects.create(
            code="AE",
            name_ar="الإمارات",
            name_en="UAE",
            currency="AED",
            timezone="Asia/Dubai",
            is_active=True,
        )
        other_port = DeparturePort.objects.create(
            region=other_region,
            name_en="Dubai Marina",
            name_ar="مرسى دبي",
            city_en="Dubai",
            city_ar="دبي",
            latitude="25.080000",
            longitude="55.140000",
        )
        Yacht.objects.create(
            owner=owner_user,
            region=other_region,
            departure_port=other_port,
            name="Dubai Yacht",
            name_ar="يخت دبي",
            capacity=12,
            price_per_day="3000.00",
            currency="AED",
            yacht_type="motorboat",
            status="active",
        )

        response = api_client.get(YACHT_LIST_URL, {"region": "EG"})
        assert response.status_code == 200
        ids = [item["id"] for item in response.data["results"]]
        assert str(active_yacht.id) in ids
        # All returned yachts belong to the EG region.
        for item in response.data["results"]:
            assert item["region"]["code"].upper() == "EG"

    def test_yacht_list_filter_by_capacity_min(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
        db,
        owner_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ) -> None:
        """?capacity_min=10 excludes yachts with capacity < 10."""
        # active_yacht has capacity=8, so it should be excluded.
        response = api_client.get(YACHT_LIST_URL, {"capacity_min": "10"})
        ids = [item["id"] for item in response.data["results"]]
        assert str(active_yacht.id) not in ids

    def test_yacht_list_filter_capacity_min_includes_matching(
        self,
        api_client: APIClient,
        db,
        owner_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ) -> None:
        """?capacity_min=12 includes a yacht with capacity=12."""
        large_yacht = Yacht.objects.create(
            owner=owner_user,
            region=egypt_region,
            departure_port=departure_port,
            name="Large Yacht",
            name_ar="يخت كبير",
            capacity=12,
            price_per_day="2500.00",
            currency="EGP",
            yacht_type="catamaran",
            status="active",
        )
        response = api_client.get(YACHT_LIST_URL, {"capacity_min": "12"})
        ids = [item["id"] for item in response.data["results"]]
        assert str(large_yacht.id) in ids

    def test_yacht_list_filter_by_type(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
        db,
        owner_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ) -> None:
        """?yacht_type=motorboat returns only motorboats."""
        Yacht.objects.create(
            owner=owner_user,
            region=egypt_region,
            departure_port=departure_port,
            name="Sail Away",
            name_ar="شراع بعيد",
            capacity=4,
            price_per_day="800.00",
            currency="EGP",
            yacht_type="sailboat",
            status="active",
        )
        response = api_client.get(YACHT_LIST_URL, {"yacht_type": "motorboat"})
        for item in response.data["results"]:
            assert item["yacht_type"] == "motorboat"

    def test_yacht_list_filter_type_excludes_others(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
        db,
        owner_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ) -> None:
        """?yacht_type=sailboat must not return active_yacht (motorboat)."""
        response = api_client.get(YACHT_LIST_URL, {"yacht_type": "sailboat"})
        ids = [item["id"] for item in response.data["results"]]
        assert str(active_yacht.id) not in ids

    def test_yacht_list_cursor_pagination_shape(
        self, api_client: APIClient, active_yacht: Yacht
    ) -> None:
        """Response has cursor pagination shape: results + next + previous (ADR-013)."""
        response = api_client.get(YACHT_LIST_URL)
        assert "results" in response.data
        # CursorPagination always includes next and previous (may be null).
        assert "next" in response.data
        assert "previous" in response.data

    def test_yacht_list_includes_departure_port(
        self, api_client: APIClient, active_yacht: Yacht
    ) -> None:
        """Each list item includes a nested departure_port object.

        Note: DeparturePortNestedSerializer references 'name' and 'city' fields that
        do not exist on DeparturePort model (model uses name_en/city_en). This test
        will surface that serializer mismatch if it causes a serialization error.
        """
        response = api_client.get(YACHT_LIST_URL)
        assert response.status_code == 200
        result = next(
            item for item in response.data["results"] if item["id"] == str(active_yacht.id)
        )
        assert "departure_port" in result

    def test_yacht_list_includes_region(
        self, api_client: APIClient, active_yacht: Yacht
    ) -> None:
        """Each list item includes a nested region object with currency."""
        response = api_client.get(YACHT_LIST_URL)
        result = next(
            item for item in response.data["results"] if item["id"] == str(active_yacht.id)
        )
        assert "region" in result
        assert "currency" in result["region"]

    def test_yacht_list_inactive_excluded(
        self,
        api_client: APIClient,
        db,
        owner_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ) -> None:
        """Inactive yachts (status='inactive') are not returned."""
        inactive = Yacht.objects.create(
            owner=owner_user,
            region=egypt_region,
            departure_port=departure_port,
            name="Inactive Vessel",
            name_ar="سفينة غير نشطة",
            capacity=5,
            price_per_day="900.00",
            currency="EGP",
            yacht_type="speedboat",
            status="inactive",
        )
        response = api_client.get(YACHT_LIST_URL)
        ids = [item["id"] for item in response.data["results"]]
        assert str(inactive.id) not in ids

    def test_yacht_list_filter_price_max(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
        db,
        owner_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ) -> None:
        """?price_max=1000 excludes active_yacht priced at 1500."""
        response = api_client.get(YACHT_LIST_URL, {"price_max": "1000"})
        ids = [item["id"] for item in response.data["results"]]
        assert str(active_yacht.id) not in ids


# ===========================================================================
# Yacht Detail — GET /api/v1/yachts/{id}/
# ===========================================================================


@pytest.mark.django_db
class TestYachtDetail:
    """GET /api/v1/yachts/{id}/ — public yacht detail."""

    def test_yacht_detail_success(self, api_client: APIClient, active_yacht: Yacht) -> None:
        """GET a valid active yacht returns 200."""
        response = api_client.get(yacht_detail_url(active_yacht.id))
        assert response.status_code == 200

    def test_yacht_detail_returns_id(self, api_client: APIClient, active_yacht: Yacht) -> None:
        """Response body contains the correct yacht id."""
        response = api_client.get(yacht_detail_url(active_yacht.id))
        assert str(response.data["id"]) == str(active_yacht.id)

    def test_yacht_detail_has_media(self, api_client: APIClient, active_yacht: Yacht) -> None:
        """Response includes a media array."""
        response = api_client.get(yacht_detail_url(active_yacht.id))
        assert "media" in response.data
        assert isinstance(response.data["media"], list)

    def test_yacht_detail_media_contains_primary_image(
        self, api_client: APIClient, active_yacht: Yacht
    ) -> None:
        """The media array includes the primary image with is_primary=True."""
        response = api_client.get(yacht_detail_url(active_yacht.id))
        primary_items = [m for m in response.data["media"] if m["is_primary"]]
        assert len(primary_items) == 1

    def test_yacht_detail_has_owner(self, api_client: APIClient, active_yacht: Yacht) -> None:
        """Response includes a nested owner object."""
        response = api_client.get(yacht_detail_url(active_yacht.id))
        assert "owner" in response.data
        assert "first_name" in response.data["owner"]

    def test_yacht_detail_has_description_ar(
        self, api_client: APIClient, active_yacht: Yacht
    ) -> None:
        """Response includes description_ar (Arabic description — ADR-014 arabic-first)."""
        response = api_client.get(yacht_detail_url(active_yacht.id))
        assert "description_ar" in response.data
        assert response.data["description_ar"] == active_yacht.description_ar

    def test_yacht_detail_has_description_en(
        self, api_client: APIClient, active_yacht: Yacht
    ) -> None:
        """Response includes English description."""
        response = api_client.get(yacht_detail_url(active_yacht.id))
        assert "description" in response.data

    def test_yacht_detail_not_found(self, api_client: APIClient) -> None:
        """Random UUID returns 404."""
        response = api_client.get(yacht_detail_url(uuid.uuid4()))
        assert response.status_code == 404

    def test_yacht_detail_draft_not_found(
        self, api_client: APIClient, draft_yacht: Yacht
    ) -> None:
        """A draft yacht's UUID returns 404 on the detail endpoint."""
        response = api_client.get(yacht_detail_url(draft_yacht.id))
        assert response.status_code == 404

    def test_yacht_detail_deleted_not_found(
        self, api_client: APIClient, deleted_yacht: Yacht
    ) -> None:
        """A soft-deleted yacht's UUID returns 404."""
        response = api_client.get(yacht_detail_url(deleted_yacht.id))
        assert response.status_code == 404

    def test_yacht_detail_public_no_auth_needed(
        self, api_client: APIClient, active_yacht: Yacht
    ) -> None:
        """Detail endpoint is public — no Bearer header required."""
        # api_client has no credentials set.
        response = api_client.get(yacht_detail_url(active_yacht.id))
        assert response.status_code == 200

    def test_yacht_detail_price_per_day_is_string_decimal(
        self, api_client: APIClient, active_yacht: Yacht
    ) -> None:
        """price_per_day is serialised as a decimal string (never float) — ADR NUMERIC(12,2)."""
        response = api_client.get(yacht_detail_url(active_yacht.id))
        price = response.data["price_per_day"]
        # DRF serialises DecimalField as string; confirm the value is not a float.
        assert isinstance(price, str)
        assert "." in price

    def test_yacht_detail_currency_not_hardcoded(
        self, api_client: APIClient, active_yacht: Yacht
    ) -> None:
        """Currency in the response comes from the model, not hardcoded 'EGP' (ADR-018)."""
        response = api_client.get(yacht_detail_url(active_yacht.id))
        assert response.data["currency"] == active_yacht.currency

    def test_yacht_detail_includes_departure_port(
        self, api_client: APIClient, active_yacht: Yacht
    ) -> None:
        """Response includes a departure_port nested object.

        Note: DeparturePortNestedSerializer references field names 'name' and 'city'
        which do not exist on the DeparturePort model (model uses name_en/city_en).
        This test will surface that serializer bug if it causes a 500 response.
        """
        response = api_client.get(yacht_detail_url(active_yacht.id))
        assert response.status_code == 200
        assert "departure_port" in response.data

    def test_yacht_detail_includes_region(
        self, api_client: APIClient, active_yacht: Yacht
    ) -> None:
        """Response includes region nested object with code and currency."""
        response = api_client.get(yacht_detail_url(active_yacht.id))
        region = response.data["region"]
        assert "code" in region
        assert "currency" in region
