"""i18n / language parity tests — Sprint test coverage area 4 (API side).

Verifies that every API response for Arabic-first models contains both the
Arabic and English field variants as defined in ADR-014.

Rules tested:
  - Every Yacht in /api/v1/yachts/ has both `name` (EN) and `name_ar` (AR)
  - Every Competition in /api/v1/competitions/ has an Arabic title field
  - Every Product in /api/v1/marketplace/products/ has `name_ar`
  - Field presence is checked on ALL items in results, not just the first
  - Empty string is acceptable (field must exist in payload, not necessarily populated)

No mocks — real DB, real serializers.
"""
import pytest
from rest_framework.test import APIClient

YACHT_LIST_URL = "/api/v1/yachts/"
COMPETITION_LIST_URL = "/api/v1/competitions/"
PRODUCT_LIST_URL = "/api/v1/marketplace/products/"


# ===========================================================================
# Area 4A.1 — Yacht bilingual field parity
# ===========================================================================


@pytest.mark.django_db
class TestYachtI18nFieldParity:
    """Every yacht in the public listing must expose both language fields."""

    def test_happy_yacht_list_has_name_field(
        self, api_client: APIClient, active_yacht
    ) -> None:
        response = api_client.get(YACHT_LIST_URL)
        assert response.status_code == 200
        for item in response.data["results"]:
            assert "name" in item, f"Yacht {item.get('id')} missing 'name' field"

    def test_happy_yacht_list_has_name_ar_field(
        self, api_client: APIClient, active_yacht
    ) -> None:
        """Arabic name must always be present (ADR-014 — Arabic-first)."""
        response = api_client.get(YACHT_LIST_URL)
        assert response.status_code == 200
        for item in response.data["results"]:
            assert "name_ar" in item, f"Yacht {item.get('id')} missing 'name_ar' field"

    def test_happy_yacht_detail_has_both_name_fields(
        self, api_client: APIClient, active_yacht
    ) -> None:
        response = api_client.get(f"{YACHT_LIST_URL}{active_yacht.id}/")
        assert response.status_code == 200
        assert "name" in response.data
        assert "name_ar" in response.data

    def test_happy_yacht_detail_has_both_description_fields(
        self, api_client: APIClient, active_yacht
    ) -> None:
        response = api_client.get(f"{YACHT_LIST_URL}{active_yacht.id}/")
        assert response.status_code == 200
        assert "description" in response.data
        assert "description_ar" in response.data

    def test_happy_active_yacht_name_ar_is_string(
        self, api_client: APIClient, active_yacht
    ) -> None:
        response = api_client.get(YACHT_LIST_URL)
        assert response.status_code == 200
        for item in response.data["results"]:
            assert isinstance(item["name_ar"], str), (
                f"name_ar for yacht {item.get('id')} must be a string"
            )

    def test_happy_active_yacht_name_is_string(
        self, api_client: APIClient, active_yacht
    ) -> None:
        response = api_client.get(YACHT_LIST_URL)
        assert response.status_code == 200
        for item in response.data["results"]:
            assert isinstance(item["name"], str), (
                f"name for yacht {item.get('id')} must be a string"
            )

    def test_happy_fixture_yacht_name_ar_is_non_empty(
        self, api_client: APIClient, active_yacht
    ) -> None:
        """The conftest active_yacht fixture sets name_ar — verify it round-trips."""
        response = api_client.get(f"{YACHT_LIST_URL}{active_yacht.id}/")
        assert response.status_code == 200
        assert response.data["name_ar"] == active_yacht.name_ar

    def test_happy_fixture_yacht_name_en_is_non_empty(
        self, api_client: APIClient, active_yacht
    ) -> None:
        response = api_client.get(f"{YACHT_LIST_URL}{active_yacht.id}/")
        assert response.status_code == 200
        assert response.data["name"] == active_yacht.name

    def test_happy_region_nested_has_arabic_name(
        self, api_client: APIClient, active_yacht
    ) -> None:
        """Nested region object must include both name_ar and name_en."""
        response = api_client.get(YACHT_LIST_URL)
        assert response.status_code == 200
        for item in response.data["results"]:
            region = item.get("region", {})
            assert "name_ar" in region, f"region nested object missing 'name_ar'"
            assert "name_en" in region, f"region nested object missing 'name_en'"

    def test_happy_departure_port_nested_has_arabic_name(
        self, api_client: APIClient, active_yacht
    ) -> None:
        """Nested departure_port must include name_ar and name_en."""
        response = api_client.get(YACHT_LIST_URL)
        assert response.status_code == 200
        for item in response.data["results"]:
            port = item.get("departure_port", {})
            assert "name_ar" in port, "departure_port nested object missing 'name_ar'"
            assert "name_en" in port, "departure_port nested object missing 'name_en'"


# ===========================================================================
# Area 4A.2 — Competition bilingual field parity
# ===========================================================================


@pytest.mark.django_db
class TestCompetitionI18nFieldParity:
    """Competition list must expose at least one Arabic title variant."""

    def test_happy_competition_list_returns_200(self, api_client: APIClient) -> None:
        response = api_client.get(COMPETITION_LIST_URL)
        assert response.status_code == 200

    def test_happy_competition_list_results_is_list(self, api_client: APIClient) -> None:
        response = api_client.get(COMPETITION_LIST_URL)
        assert isinstance(response.data.get("results"), list)

    def test_happy_competition_items_have_arabic_title_field(
        self, api_client: APIClient
    ) -> None:
        """Every competition must expose either 'title' (AR primary) or 'title_ar'."""
        response = api_client.get(COMPETITION_LIST_URL)
        results = response.data.get("results", [])
        for item in results:
            has_ar_title = "title" in item or "title_ar" in item
            assert has_ar_title, (
                f"Competition {item.get('id')} has neither 'title' nor 'title_ar' field"
            )

    def test_happy_competition_items_have_english_title_field(
        self, api_client: APIClient
    ) -> None:
        """Every competition must expose 'title_en' for bilingual parity."""
        response = api_client.get(COMPETITION_LIST_URL)
        results = response.data.get("results", [])
        for item in results:
            assert "title_en" in item, (
                f"Competition {item.get('id')} missing 'title_en' field"
            )


# ===========================================================================
# Area 4A.3 — Product bilingual field parity
# ===========================================================================


@pytest.mark.django_db
class TestProductI18nFieldParity:
    """Product list must expose both Arabic and English name fields."""

    def test_happy_product_list_returns_200(self, api_client: APIClient) -> None:
        response = api_client.get(PRODUCT_LIST_URL)
        assert response.status_code == 200

    def test_happy_product_list_results_is_list(self, api_client: APIClient) -> None:
        response = api_client.get(PRODUCT_LIST_URL)
        assert isinstance(response.data.get("results"), list)

    def test_happy_product_items_have_name_ar_field(self, api_client: APIClient) -> None:
        """Every product must expose 'name_ar' (ADR-014 Arabic-first)."""
        response = api_client.get(PRODUCT_LIST_URL)
        results = response.data.get("results", [])
        for item in results:
            assert "name_ar" in item, (
                f"Product {item.get('id')} missing 'name_ar' field"
            )

    def test_happy_product_items_have_name_field(self, api_client: APIClient) -> None:
        """Every product must expose 'name' (English)."""
        response = api_client.get(PRODUCT_LIST_URL)
        results = response.data.get("results", [])
        for item in results:
            assert "name" in item, f"Product {item.get('id')} missing 'name' field"

    def test_happy_product_name_ar_is_string_type(self, api_client: APIClient) -> None:
        response = api_client.get(PRODUCT_LIST_URL)
        results = response.data.get("results", [])
        for item in results:
            assert isinstance(item["name_ar"], str), (
                f"Product {item.get('id')} name_ar is not a string"
            )

    def test_happy_product_items_have_vendor_arabic_name(
        self, api_client: APIClient
    ) -> None:
        """Product list must include vendor_name_ar for bilingual display."""
        response = api_client.get(PRODUCT_LIST_URL)
        results = response.data.get("results", [])
        for item in results:
            assert "vendor_name_ar" in item, (
                f"Product {item.get('id')} missing 'vendor_name_ar' field"
            )


# ===========================================================================
# Area 4A.4 — Auth response i18n (error messages)
# ===========================================================================


@pytest.mark.django_db
class TestAuthI18nErrors:
    """Error responses must use the standard error envelope (not locale-specific)."""

    def test_happy_401_error_has_error_key(self, api_client: APIClient) -> None:
        """Unauthenticated response must use {'error': {...}} envelope."""
        response = api_client.get("/api/v1/bookings/")
        assert response.status_code == 401
        # The custom error format defined in the API spec
        assert "error" in response.data, (
            f"401 response missing 'error' key: {response.data}"
        )

    def test_happy_401_error_has_code_field(self, api_client: APIClient) -> None:
        response = api_client.get("/api/v1/users/me/")
        assert response.status_code == 401
        assert "code" in response.data["error"], (
            f"error envelope missing 'code' field: {response.data['error']}"
        )

    def test_happy_401_error_has_message_field(self, api_client: APIClient) -> None:
        response = api_client.get("/api/v1/users/me/")
        assert response.status_code == 401
        assert "message" in response.data["error"], (
            f"error envelope missing 'message' field: {response.data['error']}"
        )

    def test_sad_register_missing_email_returns_400_with_error_key(
        self, api_client: APIClient
    ) -> None:
        """Validation errors on register must include 'error' or field errors."""
        response = api_client.post(
            "/api/v1/auth/register/",
            data={"password": "Test123!"},
            format="json",
        )
        assert response.status_code == 400
        # Either custom error envelope or DRF field error dict
        has_error_key = "error" in response.data or "email" in response.data
        assert has_error_key, f"400 response shape unexpected: {response.data}"
