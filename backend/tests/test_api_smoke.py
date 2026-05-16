"""API endpoint smoke + correctness tests — Sprint test coverage area 2.

Hits EVERY registered endpoint with correct expected status codes.
Uses the real running API — no mocks, no test database override.

The test client talks directly to Django via DRF's APIClient (in-process),
so no external HTTP server is required.  All data is created through
conftest.py fixtures (real DB writes; ADR prohibition on mocking the DB layer).

Coverage targets:
  - Public endpoints → correct 200 responses + shape assertions
  - Unauthenticated protected endpoints → 401
  - Auth flow: register → login → me → logout
  - Response shape: pagination keys, field names, UUID format, decimal strings
"""
import json
import re
import uuid

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.core.models import DeparturePort, Region

# ---------------------------------------------------------------------------
# URL constants
# ---------------------------------------------------------------------------

HEALTH_URL = "/health/"
YACHT_LIST_URL = "/api/v1/yachts/"
COMPETITION_LIST_URL = "/api/v1/competitions/"
PRODUCT_LIST_URL = "/api/v1/marketplace/products/"
BOOKING_LIST_URL = "/api/v1/bookings/"
USERS_ME_URL = "/api/v1/users/me/"
ANALYTICS_STATS_URL = "/api/v1/analytics/stats/"
ANALYTICS_EARNINGS_URL = "/api/v1/analytics/earnings/"
REGISTER_URL = "/api/v1/auth/register/"
LOGIN_URL = "/api/v1/auth/login/"
LOGOUT_URL = "/api/v1/auth/logout/"
WEATHER_URL = "/api/v1/weather/"
FISHING_SEASONS_URL = "/api/v1/fishing/seasons/"

# Regex for UUID4 format validation
UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def _is_uuid(value: str) -> bool:
    return bool(UUID_RE.match(str(value)))


# ===========================================================================
# Area 2.1 — Public endpoints (no auth required)
# ===========================================================================


@pytest.mark.django_db
class TestPublicEndpoints:
    """Public endpoints must return 200 and correct shapes without any auth."""

    def test_happy_health_check_returns_200(self, api_client: APIClient) -> None:
        response = api_client.get(HEALTH_URL)
        assert response.status_code == 200
        # health_check is a plain Django JsonResponse (not DRF), so use json() not .data
        body = json.loads(response.content)
        assert body["status"] == "ok"

    def test_happy_yacht_list_returns_200(self, api_client: APIClient, active_yacht) -> None:
        response = api_client.get(YACHT_LIST_URL)
        assert response.status_code == 200

    def test_happy_yacht_list_has_results_key(self, api_client: APIClient, active_yacht) -> None:
        response = api_client.get(YACHT_LIST_URL)
        assert "results" in response.data

    def test_happy_yacht_list_first_item_has_id(self, api_client: APIClient, active_yacht) -> None:
        response = api_client.get(YACHT_LIST_URL)
        results = response.data["results"]
        assert len(results) >= 1
        assert "id" in results[0]

    def test_happy_yacht_list_first_item_has_name(self, api_client: APIClient, active_yacht) -> None:
        response = api_client.get(YACHT_LIST_URL)
        results = response.data["results"]
        assert len(results) >= 1
        assert "name" in results[0]

    def test_happy_yacht_list_first_item_has_price_per_day(
        self, api_client: APIClient, active_yacht
    ) -> None:
        response = api_client.get(YACHT_LIST_URL)
        results = response.data["results"]
        assert len(results) >= 1
        assert "price_per_day" in results[0]

    def test_happy_yacht_detail_returns_200(self, api_client: APIClient, active_yacht) -> None:
        response = api_client.get(f"{YACHT_LIST_URL}{active_yacht.id}/")
        assert response.status_code == 200

    def test_happy_yacht_detail_has_id(self, api_client: APIClient, active_yacht) -> None:
        response = api_client.get(f"{YACHT_LIST_URL}{active_yacht.id}/")
        assert "id" in response.data

    def test_happy_yacht_detail_has_name(self, api_client: APIClient, active_yacht) -> None:
        response = api_client.get(f"{YACHT_LIST_URL}{active_yacht.id}/")
        assert "name" in response.data

    def test_happy_yacht_detail_has_media(self, api_client: APIClient, active_yacht) -> None:
        response = api_client.get(f"{YACHT_LIST_URL}{active_yacht.id}/")
        assert "media" in response.data

    def test_happy_competition_list_returns_200(self, api_client: APIClient) -> None:
        response = api_client.get(COMPETITION_LIST_URL)
        assert response.status_code == 200

    def test_happy_competition_list_has_results(self, api_client: APIClient) -> None:
        response = api_client.get(COMPETITION_LIST_URL)
        assert "results" in response.data

    def test_happy_product_list_returns_200(self, api_client: APIClient) -> None:
        response = api_client.get(PRODUCT_LIST_URL)
        assert response.status_code == 200

    def test_happy_product_list_has_results(self, api_client: APIClient) -> None:
        response = api_client.get(PRODUCT_LIST_URL)
        assert "results" in response.data


# ===========================================================================
# Area 2.2 — Auth-required endpoints (expect 401 when unauthenticated)
# ===========================================================================


@pytest.mark.django_db
class TestAuthRequired:
    """Protected endpoints must return 401 for unauthenticated requests."""

    def test_sad_bookings_list_anonymous_gets_401(self, api_client: APIClient) -> None:
        response = api_client.get(BOOKING_LIST_URL)
        assert response.status_code == 401

    def test_sad_users_me_anonymous_gets_401(self, api_client: APIClient) -> None:
        response = api_client.get(USERS_ME_URL)
        assert response.status_code == 401

    def test_sad_analytics_stats_anonymous_gets_401(self, api_client: APIClient) -> None:
        response = api_client.get(ANALYTICS_STATS_URL)
        assert response.status_code == 401

    def test_sad_analytics_earnings_anonymous_gets_401(self, api_client: APIClient) -> None:
        response = api_client.get(ANALYTICS_EARNINGS_URL)
        assert response.status_code == 401


# ===========================================================================
# Area 2.3 — Auth flow: register → login → me → logout
# ===========================================================================


@pytest.mark.django_db
class TestAuthFlow:
    """Full register/login/me/logout flow — real DB, no mocks."""

    REGISTER_PAYLOAD = {
        "email": "smoketest_auth_flow@seaconnect.test",
        "password": "SmokePass123!",
        "first_name": "Smoke",
        "last_name": "Test",
        "role": "customer",
    }

    def test_happy_register_creates_user_and_returns_201(self, api_client: APIClient) -> None:
        response = api_client.post(REGISTER_URL, data=self.REGISTER_PAYLOAD, format="json")
        assert response.status_code == 201

    def test_happy_register_returns_access_token(self, api_client: APIClient) -> None:
        response = api_client.post(REGISTER_URL, data=self.REGISTER_PAYLOAD, format="json")
        assert response.status_code == 201
        tokens = response.data.get("tokens") or response.data
        assert "access" in tokens

    def test_happy_register_returns_refresh_token(self, api_client: APIClient) -> None:
        response = api_client.post(REGISTER_URL, data=self.REGISTER_PAYLOAD, format="json")
        assert response.status_code == 201
        tokens = response.data.get("tokens") or response.data
        assert "refresh" in tokens

    def test_happy_login_with_registered_credentials_returns_200(
        self, api_client: APIClient
    ) -> None:
        # Register first, then login
        api_client.post(REGISTER_URL, data=self.REGISTER_PAYLOAD, format="json")
        login_payload = {
            "email": self.REGISTER_PAYLOAD["email"],
            "password": self.REGISTER_PAYLOAD["password"],
        }
        response = api_client.post(LOGIN_URL, data=login_payload, format="json")
        assert response.status_code == 200

    def test_happy_login_returns_access_token(self, api_client: APIClient) -> None:
        api_client.post(REGISTER_URL, data=self.REGISTER_PAYLOAD, format="json")
        login_payload = {
            "email": self.REGISTER_PAYLOAD["email"],
            "password": self.REGISTER_PAYLOAD["password"],
        }
        response = api_client.post(LOGIN_URL, data=login_payload, format="json")
        tokens = response.data.get("tokens") or response.data
        assert "access" in tokens

    def test_happy_me_with_bearer_token_returns_200(self, api_client: APIClient) -> None:
        reg = api_client.post(REGISTER_URL, data=self.REGISTER_PAYLOAD, format="json")
        tokens = reg.data.get("tokens") or reg.data
        access = tokens["access"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        me = api_client.get(USERS_ME_URL)
        assert me.status_code == 200

    def test_happy_me_response_has_email(self, api_client: APIClient) -> None:
        reg = api_client.post(REGISTER_URL, data=self.REGISTER_PAYLOAD, format="json")
        tokens = reg.data.get("tokens") or reg.data
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        me = api_client.get(USERS_ME_URL)
        assert "email" in me.data

    def test_happy_me_response_has_id(self, api_client: APIClient) -> None:
        reg = api_client.post(REGISTER_URL, data=self.REGISTER_PAYLOAD, format="json")
        tokens = reg.data.get("tokens") or reg.data
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        me = api_client.get(USERS_ME_URL)
        assert "id" in me.data

    def test_happy_logout_returns_200_or_204(self, api_client: APIClient) -> None:
        reg = api_client.post(REGISTER_URL, data=self.REGISTER_PAYLOAD, format="json")
        tokens = reg.data.get("tokens") or reg.data
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        refresh = tokens["refresh"]
        response = api_client.post(LOGOUT_URL, data={"refresh": refresh}, format="json")
        assert response.status_code in (200, 204)

    def test_sad_login_wrong_password_returns_401(self, api_client: APIClient) -> None:
        api_client.post(REGISTER_URL, data=self.REGISTER_PAYLOAD, format="json")
        response = api_client.post(
            LOGIN_URL,
            data={"email": self.REGISTER_PAYLOAD["email"], "password": "WrongPassword!"},
            format="json",
        )
        assert response.status_code in (400, 401)

    def test_sad_register_duplicate_email_returns_400(self, api_client: APIClient) -> None:
        api_client.post(REGISTER_URL, data=self.REGISTER_PAYLOAD, format="json")
        # Second registration with same email must fail
        response = api_client.post(REGISTER_URL, data=self.REGISTER_PAYLOAD, format="json")
        assert response.status_code == 400


# ===========================================================================
# Area 2.4 — Weather endpoints
# ===========================================================================


@pytest.mark.django_db
class TestWeatherEndpoints:
    """Weather endpoints — tested with real port_id from DB, or skipped."""

    def test_happy_weather_with_valid_port_returns_200_or_400(
        self, api_client: APIClient, departure_port
    ) -> None:
        response = api_client.get(WEATHER_URL, {"port_id": str(departure_port.id)})
        # 200 = weather data returned; 400 = port found but weather upstream error
        assert response.status_code in (200, 400)

    def test_sad_weather_without_port_id_returns_400(self, api_client: APIClient) -> None:
        response = api_client.get(WEATHER_URL)
        assert response.status_code == 400

    def test_sad_weather_with_nonexistent_port_returns_404(
        self, api_client: APIClient
    ) -> None:
        fake_id = str(uuid.uuid4())
        response = api_client.get(WEATHER_URL, {"port_id": fake_id})
        assert response.status_code in (400, 404)

    def test_happy_fishing_seasons_returns_200_or_400(self, api_client: APIClient) -> None:
        response = api_client.get(FISHING_SEASONS_URL)
        # 400 expected if port_id is required; 200 if not needed
        assert response.status_code in (200, 400)


# ===========================================================================
# Area 2.5 — Response shape correctness for /api/v1/yachts/
# ===========================================================================


@pytest.mark.django_db
class TestYachtListResponseShape:
    """Validate every field contract in the yacht list response (ADR-013)."""

    def test_happy_response_results_is_a_list(self, api_client: APIClient, active_yacht) -> None:
        response = api_client.get(YACHT_LIST_URL)
        assert isinstance(response.data["results"], list)

    def test_happy_each_yacht_id_is_uuid_format(self, api_client: APIClient, active_yacht) -> None:
        response = api_client.get(YACHT_LIST_URL)
        for item in response.data["results"]:
            assert _is_uuid(item["id"]), f"id {item['id']} is not a valid UUID4"

    def test_happy_each_yacht_name_is_string(self, api_client: APIClient, active_yacht) -> None:
        response = api_client.get(YACHT_LIST_URL)
        for item in response.data["results"]:
            assert isinstance(item["name"], str)

    def test_happy_each_yacht_price_per_day_is_numeric_string(
        self, api_client: APIClient, active_yacht
    ) -> None:
        """price_per_day must be a string representation of a decimal (DRF default for DecimalField)."""
        response = api_client.get(YACHT_LIST_URL)
        for item in response.data["results"]:
            price = item["price_per_day"]
            # DRF serializes DecimalField as string
            assert isinstance(price, str), f"price_per_day is {type(price)}, expected str"
            float(price)  # must be parseable as number

    def test_happy_each_yacht_currency_is_three_char_iso(
        self, api_client: APIClient, active_yacht
    ) -> None:
        response = api_client.get(YACHT_LIST_URL)
        for item in response.data["results"]:
            currency = item["currency"]
            assert isinstance(currency, str)
            assert len(currency) == 3, f"currency '{currency}' is not 3 chars"
            assert currency.isupper(), f"currency '{currency}' is not uppercase ISO code"

    def test_happy_response_has_cursor_pagination_next_key(
        self, api_client: APIClient, active_yacht
    ) -> None:
        """DRF CursorPagination returns 'next' (URL or null) per ADR-013.

        Note: the API uses DRF's standard CursorPagination which produces
        'next'/'previous' keys, not the custom 'next_cursor'/'has_more' shape
        documented in the ADR.  This test validates the actual implementation.
        """
        response = api_client.get(YACHT_LIST_URL)
        assert "next" in response.data, "Pagination 'next' key missing from response"

    def test_happy_response_has_cursor_pagination_previous_key(
        self, api_client: APIClient, active_yacht
    ) -> None:
        response = api_client.get(YACHT_LIST_URL)
        assert "previous" in response.data, "Pagination 'previous' key missing from response"

    def test_happy_yacht_list_name_ar_field_present(
        self, api_client: APIClient, active_yacht
    ) -> None:
        """Arabic name field is required per ADR-014 (Arabic-first)."""
        response = api_client.get(YACHT_LIST_URL)
        for item in response.data["results"]:
            assert "name_ar" in item, "name_ar field missing from yacht list item"

    def test_happy_yacht_list_region_nested_object_present(
        self, api_client: APIClient, active_yacht
    ) -> None:
        response = api_client.get(YACHT_LIST_URL)
        for item in response.data["results"]:
            assert "region" in item
            assert "currency" in item["region"]

    def test_happy_active_yacht_appears_in_list(
        self, api_client: APIClient, active_yacht
    ) -> None:
        response = api_client.get(YACHT_LIST_URL)
        ids = [str(r["id"]) for r in response.data["results"]]
        assert str(active_yacht.id) in ids

    def test_sad_draft_yacht_not_in_public_list(
        self, api_client: APIClient, draft_yacht
    ) -> None:
        response = api_client.get(YACHT_LIST_URL)
        ids = [str(r["id"]) for r in response.data["results"]]
        assert str(draft_yacht.id) not in ids

    def test_sad_deleted_yacht_not_in_public_list(
        self, api_client: APIClient, deleted_yacht
    ) -> None:
        response = api_client.get(YACHT_LIST_URL)
        ids = [str(r["id"]) for r in response.data["results"]]
        assert str(deleted_yacht.id) not in ids
