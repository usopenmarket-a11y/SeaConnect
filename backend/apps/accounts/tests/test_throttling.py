"""HTTP-level throttle integration tests for Sprint 15A.

Verifies that the custom throttle classes (AuthAnonThrottle) correctly:
  - Return HTTP 429 when the rate limit is exceeded.
  - Return the SeaConnect error envelope: {"error": {"code": "RATE_LIMITED", ...}}
  - Allow requests that are within the configured rate limit.

Both login and register endpoints share ``AuthAnonThrottle`` (scope ``auth_anon``).
The tests use ``override_settings`` to set a tight rate (2/minute) so the limit
is reachable in a test without needing to fire hundreds of requests.

A ``locmem`` cache is injected for the duration of each test so that:
  1. Tests do not require a live Redis connection.
  2. Throttle state is fully isolated between test functions.

ADR compliance:
  ADR-005  — Redis cache in production; locmem in tests is the correct override.
  ADR-009  — JWT login/register are the primary auth entry points.
"""

import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from apps.core.models import Region


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

REGISTER_URL = "/api/v1/auth/register/"
LOGIN_URL = "/api/v1/auth/login/"

# Tight rate used for all throttle tests — 2 requests per minute means the
# 3rd request within the same minute window will be rejected with 429.
_TIGHT_THROTTLE_RATES = {
    "anon": "2/minute",
    "user": "10000/minute",
    "auth_anon": "2/minute",
    "auth_user": "10000/minute",
    "payment": "10000/hour",
    "upload": "10000/hour",
    "search_anon": "10000/minute",
}

# Use Django's in-process cache so no Redis connection is required.
_LOCMEM_CACHE = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}


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


def _register_payload(suffix: str = "") -> dict:
    """Build a valid register payload. ``suffix`` disambiguates repeated calls."""
    return {
        "email": f"throttle{suffix}@test.com",
        "password": "ThrottlePass123!",
        "first_name": "Rate",
        "last_name": "Limit",
        "role": "customer",
    }


def _login_payload(email: str = "user@throttle.com", password: str = "pass") -> dict:
    return {"email": email, "password": password}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": [
            "rest_framework_simplejwt.authentication.JWTAuthentication",
        ],
        "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
        "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.SeaConnectCursorPagination",
        "PAGE_SIZE": 20,
        "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
        "DEFAULT_PARSER_CLASSES": [
            "rest_framework.parsers.JSONParser",
            "rest_framework.parsers.MultiPartParser",
        ],
        "DEFAULT_FILTER_BACKENDS": [
            "django_filters.rest_framework.DjangoFilterBackend",
            "rest_framework.filters.OrderingFilter",
            "rest_framework.filters.SearchFilter",
        ],
        "DEFAULT_THROTTLE_CLASSES": [
            "rest_framework.throttling.AnonRateThrottle",
            "rest_framework.throttling.UserRateThrottle",
        ],
        "DEFAULT_THROTTLE_RATES": _TIGHT_THROTTLE_RATES,
        "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
    },
    CACHES=_LOCMEM_CACHE,
)
def test_login_rate_limit_returns_429_after_threshold():
    """Exceeding the login rate limit returns HTTP 429 with the RATE_LIMITED envelope.

    With ``auth_anon`` set to ``2/minute``, the 3rd login attempt in the same
    window must be rejected. The response body must conform to the SeaConnect
    error envelope: {"error": {"code": "RATE_LIMITED", "message": ..., "retry_after": ...}}
    """
    _get_or_create_region()
    client = APIClient()
    payload = _login_payload()

    # First two requests: within the limit — 400 (invalid credentials) or 200 is fine,
    # but not 429.
    for _ in range(2):
        response = client.post(LOGIN_URL, payload, format="json")
        assert response.status_code != 429, (
            f"Unexpected 429 on request within limit: status={response.status_code}"
        )

    # 3rd request must be throttled.
    response = client.post(LOGIN_URL, payload, format="json")
    assert response.status_code == 429

    data = response.json()
    assert "error" in data, f"Missing 'error' key in 429 body: {data}"
    error = data["error"]
    assert error.get("code") == "RATE_LIMITED", (
        f"Expected code='RATE_LIMITED', got '{error.get('code')}'"
    )
    assert "message" in error, "Missing 'message' key in error envelope"
    assert "retry_after" in error, (
        "Missing 'retry_after' key — clients need this to implement backoff"
    )


@pytest.mark.django_db
@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": [
            "rest_framework_simplejwt.authentication.JWTAuthentication",
        ],
        "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
        "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.SeaConnectCursorPagination",
        "PAGE_SIZE": 20,
        "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
        "DEFAULT_PARSER_CLASSES": [
            "rest_framework.parsers.JSONParser",
            "rest_framework.parsers.MultiPartParser",
        ],
        "DEFAULT_FILTER_BACKENDS": [
            "django_filters.rest_framework.DjangoFilterBackend",
            "rest_framework.filters.OrderingFilter",
            "rest_framework.filters.SearchFilter",
        ],
        "DEFAULT_THROTTLE_CLASSES": [
            "rest_framework.throttling.AnonRateThrottle",
            "rest_framework.throttling.UserRateThrottle",
        ],
        "DEFAULT_THROTTLE_RATES": _TIGHT_THROTTLE_RATES,
        "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
    },
    CACHES=_LOCMEM_CACHE,
)
def test_register_rate_limit_returns_429_after_threshold():
    """Exceeding the register rate limit returns HTTP 429 with the RATE_LIMITED envelope.

    Register and login share ``AuthAnonThrottle`` (scope ``auth_anon``), so the same
    2/minute limit applies.  The 3rd registration attempt must be rejected.
    The ``register`` scope is keyed by client IP address, not user identity, since the
    caller is unauthenticated at registration time.
    """
    _get_or_create_region()
    client = APIClient()

    # First two requests — within limit.
    for i in range(2):
        payload = _register_payload(suffix=str(i))
        response = client.post(REGISTER_URL, payload, format="json")
        assert response.status_code != 429, (
            f"Unexpected 429 on request {i + 1} within limit: status={response.status_code}"
        )

    # 3rd request must be throttled.
    response = client.post(REGISTER_URL, _register_payload(suffix="throttled"), format="json")
    assert response.status_code == 429

    data = response.json()
    assert "error" in data, f"Missing 'error' key in 429 body: {data}"
    error = data["error"]
    assert error.get("code") == "RATE_LIMITED", (
        f"Expected code='RATE_LIMITED', got '{error.get('code')}'"
    )
    assert "message" in error, "Missing 'message' key in error envelope"
    assert "retry_after" in error, (
        "Missing 'retry_after' key — clients need this to implement backoff"
    )


@pytest.mark.django_db
@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": [
            "rest_framework_simplejwt.authentication.JWTAuthentication",
        ],
        "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
        "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.SeaConnectCursorPagination",
        "PAGE_SIZE": 20,
        "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
        "DEFAULT_PARSER_CLASSES": [
            "rest_framework.parsers.JSONParser",
            "rest_framework.parsers.MultiPartParser",
        ],
        "DEFAULT_FILTER_BACKENDS": [
            "django_filters.rest_framework.DjangoFilterBackend",
            "rest_framework.filters.OrderingFilter",
            "rest_framework.filters.SearchFilter",
        ],
        "DEFAULT_THROTTLE_CLASSES": [
            "rest_framework.throttling.AnonRateThrottle",
            "rest_framework.throttling.UserRateThrottle",
        ],
        "DEFAULT_THROTTLE_RATES": _TIGHT_THROTTLE_RATES,
        "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
    },
    CACHES=_LOCMEM_CACHE,
)
def test_login_within_rate_limit_is_not_throttled():
    """Requests within the rate limit must never receive HTTP 429.

    Fires exactly ``limit - 1`` requests (1 request, since limit = 2) and
    asserts that none receives 429.  This guards against the throttle being
    applied too aggressively or the cache key being incorrectly shared across
    test runs.
    """
    _get_or_create_region()
    client = APIClient()
    payload = _login_payload()

    # Send one request — safely within the 2/minute window.
    response = client.post(LOGIN_URL, payload, format="json")

    # Accept any status code that is not 429.  A 400 (bad credentials) is
    # expected here since no real user exists; a 200 would mean valid creds.
    assert response.status_code != 429, (
        f"First login request was unexpectedly throttled: status={response.status_code}, "
        f"body={response.json()}"
    )
