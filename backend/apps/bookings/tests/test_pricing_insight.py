"""Tests for GET /api/v1/yachts/{yacht_id}/pricing-insight/

Sprint 16A — AI pricing insight via Ollama + Redis cache.

Coverage:
  1. Happy path — Ollama available, response cached.
  2. Cache hit — second request returns cached value, Ollama NOT called again.
  3. Ollama unavailable — mock fallback returned, NOT cached.
  4. Permission denied — anonymous caller gets 401.
  5. Permission denied — authenticated customer (not owner) gets 403.
  6. Permission denied — authenticated owner who does not own the yacht gets 403.
  7. Not found — non-existent yacht_id returns 404.

All tests use the fixtures from conftest.py (no DB mocking per project rules).
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.bookings.models import Yacht, YachtMedia
from apps.core.models import DeparturePort, Region


# ---------------------------------------------------------------------------
# Extra fixtures (supplement conftest.py)
# ---------------------------------------------------------------------------


@pytest.fixture
def other_owner_user(db, egypt_region: Region) -> User:
    """A second owner — does NOT own the test yacht."""
    return User.objects.create_user(
        email="other_owner@test.com",
        password="TestPass123!",
        first_name="Other",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
    )


@pytest.fixture
def customer_user_insight(db, egypt_region: Region) -> User:
    """Customer — cannot access owner-only pricing insight."""
    return User.objects.create_user(
        email="customer_insight@test.com",
        password="TestPass123!",
        first_name="Jane",
        last_name="Customer",
        role=UserRole.CUSTOMER,
        region=egypt_region,
    )


INSIGHT_URL = "/api/v1/yachts/{yacht_id}/pricing-insight/"


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _url(yacht_id) -> str:
    return INSIGHT_URL.format(yacht_id=yacht_id)


def _mock_ollama_response(recommendation: str = "السعر المقترح هو 2000 جنيه يومياً."):
    """Return a mock httpx.Response-like object for Ollama."""
    mock_resp = MagicMock()
    mock_resp.raise_for_status.return_value = None
    mock_resp.json.return_value = {"response": recommendation}
    return mock_resp


# ---------------------------------------------------------------------------
# 1. Happy path — Ollama available, result cached
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPricingInsightHappyPath:
    def test_returns_200_with_recommendation(
        self, api_client: APIClient, owner_user: User, active_yacht: Yacht
    ):
        """Owner gets 200 with recommendation, suggested_price, currency, etc."""
        api_client.force_authenticate(owner_user)

        with patch("apps.bookings.views.httpx.post") as mock_post, \
             patch("django.core.cache.cache.get", return_value=None), \
             patch("django.core.cache.cache.set") as mock_cache_set:

            mock_post.return_value = _mock_ollama_response(
                "السعر المقترح 2000 جنيه لأن الطلب مرتفع."
            )

            response = api_client.get(_url(active_yacht.id))

        assert response.status_code == 200
        data = response.data
        assert "recommendation" in data
        assert "suggested_price" in data
        assert "currency" in data
        assert "comparable_count" in data
        assert "generated_at" in data
        # Internal flag must NOT be exposed in the response.
        assert "_from_cache_eligible" not in data
        # Cache.set must have been called (result is eligible to be cached).
        mock_cache_set.assert_called_once()

    def test_suggested_price_extracted_from_ollama_text(
        self, api_client: APIClient, owner_user: User, active_yacht: Yacht
    ):
        """suggested_price is the first numeric value found in the recommendation."""
        api_client.force_authenticate(owner_user)

        with patch("apps.bookings.views.httpx.post") as mock_post, \
             patch("django.core.cache.cache.get", return_value=None), \
             patch("django.core.cache.cache.set"):

            mock_post.return_value = _mock_ollama_response(
                "ننصح بتسعير اليخت بـ 3200 جنيه يومياً."
            )
            response = api_client.get(_url(active_yacht.id))

        assert response.status_code == 200
        assert response.data["suggested_price"] == "3200.00"


# ---------------------------------------------------------------------------
# 2. Cache hit — second request skips Ollama
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPricingInsightCacheHit:
    def test_cached_result_returned_without_calling_ollama(
        self, api_client: APIClient, owner_user: User, active_yacht: Yacht
    ):
        """When Redis has a cached value Ollama is never called."""
        api_client.force_authenticate(owner_user)

        cached_payload = {
            "recommendation": "السعر الحالي مناسب جداً.",
            "suggested_price": "1500.00",
            "currency": "EGP",
            "comparable_count": 2,
            "generated_at": "2026-05-17T10:00:00+00:00",
        }

        with patch("apps.bookings.views.httpx.post") as mock_post, \
             patch("django.core.cache.cache.get", return_value=cached_payload):

            response = api_client.get(_url(active_yacht.id))

        assert response.status_code == 200
        assert response.data["recommendation"] == "السعر الحالي مناسب جداً."
        # Ollama must NOT have been called.
        mock_post.assert_not_called()


# ---------------------------------------------------------------------------
# 3. Ollama unavailable — mock fallback returned, NOT cached
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPricingInsightOllamaUnavailable:
    def test_fallback_when_ollama_times_out(
        self, api_client: APIClient, owner_user: User, active_yacht: Yacht
    ):
        """When Ollama raises ConnectError a mock recommendation is returned
        and cache.set is NOT called (so the next request retries the model)."""
        import httpx as real_httpx

        api_client.force_authenticate(owner_user)

        with patch("apps.bookings.views.httpx.post", side_effect=real_httpx.ConnectError("timeout")), \
             patch("django.core.cache.cache.get", return_value=None), \
             patch("django.core.cache.cache.set") as mock_cache_set:

            response = api_client.get(_url(active_yacht.id))

        assert response.status_code == 200
        data = response.data
        assert "recommendation" in data
        assert "suggested_price" in data
        # The fallback must NOT be cached so the next request retries Ollama.
        mock_cache_set.assert_not_called()

    def test_fallback_price_is_near_current_price(
        self, api_client: APIClient, owner_user: User, active_yacht: Yacht
    ):
        """Fallback price stays within a sensible range of the current price."""
        import httpx as real_httpx

        api_client.force_authenticate(owner_user)

        with patch("apps.bookings.views.httpx.post", side_effect=real_httpx.ConnectError("down")), \
             patch("django.core.cache.cache.get", return_value=None), \
             patch("django.core.cache.cache.set"):

            response = api_client.get(_url(active_yacht.id))

        current = float(active_yacht.price_per_day)
        suggested = float(response.data["suggested_price"])
        # Must be within ±20 % of current price for sensible fallback.
        assert abs(suggested - current) / current <= 0.20


# ---------------------------------------------------------------------------
# 4. Permission denied — anonymous caller
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPricingInsightPermissionDeniedAnonymous:
    def test_anonymous_gets_401(self, api_client: APIClient, active_yacht: Yacht):
        """Unauthenticated request is rejected with 401."""
        response = api_client.get(_url(active_yacht.id))
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# 5. Permission denied — customer role
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPricingInsightPermissionDeniedCustomer:
    def test_customer_gets_403(
        self, api_client: APIClient, customer_user_insight: User, active_yacht: Yacht
    ):
        """A customer (not the owner) is rejected with 403."""
        api_client.force_authenticate(customer_user_insight)

        with patch("django.core.cache.cache.get", return_value=None):
            response = api_client.get(_url(active_yacht.id))

        assert response.status_code == 403
        assert response.data["code"] == "ERR_PERMISSION_DENIED"


# ---------------------------------------------------------------------------
# 6. Permission denied — wrong owner
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPricingInsightPermissionDeniedWrongOwner:
    def test_other_owner_gets_403(
        self,
        api_client: APIClient,
        other_owner_user: User,
        active_yacht: Yacht,
    ):
        """An owner who does NOT own the yacht is rejected with 403."""
        api_client.force_authenticate(other_owner_user)

        with patch("django.core.cache.cache.get", return_value=None):
            response = api_client.get(_url(active_yacht.id))

        assert response.status_code == 403
        assert response.data["code"] == "ERR_PERMISSION_DENIED"


# ---------------------------------------------------------------------------
# 7. Not found
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPricingInsightNotFound:
    def test_nonexistent_yacht_returns_404(
        self, api_client: APIClient, owner_user: User
    ):
        """A UUID that does not match any Yacht row returns 404."""
        import uuid

        api_client.force_authenticate(owner_user)
        response = api_client.get(_url(uuid.uuid4()))
        assert response.status_code == 404
