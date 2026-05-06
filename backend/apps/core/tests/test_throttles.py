"""Tests for Sprint 14C — custom throttle classes.

Covers:
  - Class existence and correct import paths
  - Scope attribute values
  - View-level throttle_classes wiring (no HTTP calls required)
  - All 7 throttle rate scopes present in settings

These are unit tests that exercise class attributes and imports — no DB
access is required, so none of the test classes use @pytest.mark.django_db.
The settings verification test imports Django settings directly.
"""

import pytest

# ---------------------------------------------------------------------------
# 1. Import tests — verifies the module exists and classes are exported
# ---------------------------------------------------------------------------


def test_auth_anon_throttle_class_exists():
    """AuthAnonThrottle imports cleanly from apps.core.throttles."""
    from apps.core.throttles import AuthAnonThrottle

    assert AuthAnonThrottle is not None


def test_auth_user_throttle_class_exists():
    """AuthUserThrottle imports cleanly from apps.core.throttles."""
    from apps.core.throttles import AuthUserThrottle

    assert AuthUserThrottle is not None


def test_payment_throttle_class_exists():
    """PaymentThrottle imports cleanly from apps.core.throttles."""
    from apps.core.throttles import PaymentThrottle

    assert PaymentThrottle is not None


def test_upload_throttle_class_exists():
    """UploadThrottle imports cleanly from apps.core.throttles."""
    from apps.core.throttles import UploadThrottle

    assert UploadThrottle is not None


def test_search_anon_throttle_class_exists():
    """SearchAnonThrottle imports cleanly from apps.core.throttles."""
    from apps.core.throttles import SearchAnonThrottle

    assert SearchAnonThrottle is not None


# ---------------------------------------------------------------------------
# 2. Scope attribute tests — verifies DRF will resolve the right rate key
# ---------------------------------------------------------------------------


def test_auth_anon_throttle_scope():
    """AuthAnonThrottle.scope must be 'auth_anon' to match settings key."""
    from apps.core.throttles import AuthAnonThrottle

    assert AuthAnonThrottle.scope == "auth_anon"


def test_auth_user_throttle_scope():
    """AuthUserThrottle.scope must be 'auth_user' to match settings key."""
    from apps.core.throttles import AuthUserThrottle

    assert AuthUserThrottle.scope == "auth_user"


def test_payment_throttle_scope():
    """PaymentThrottle.scope must be 'payment' to match settings key."""
    from apps.core.throttles import PaymentThrottle

    assert PaymentThrottle.scope == "payment"


def test_upload_throttle_scope():
    """UploadThrottle.scope must be 'upload' to match settings key."""
    from apps.core.throttles import UploadThrottle

    assert UploadThrottle.scope == "upload"


def test_search_anon_throttle_scope():
    """SearchAnonThrottle.scope must be 'search_anon' to match settings key."""
    from apps.core.throttles import SearchAnonThrottle

    assert SearchAnonThrottle.scope == "search_anon"


# ---------------------------------------------------------------------------
# 3. Base class inheritance — verifies correct parent (Anon vs User)
# ---------------------------------------------------------------------------


def test_auth_anon_throttle_inherits_anon_rate_throttle():
    """AuthAnonThrottle must inherit AnonRateThrottle (keyed by IP, not user)."""
    from rest_framework.throttling import AnonRateThrottle

    from apps.core.throttles import AuthAnonThrottle

    assert issubclass(AuthAnonThrottle, AnonRateThrottle)


def test_auth_user_throttle_inherits_user_rate_throttle():
    """AuthUserThrottle must inherit UserRateThrottle (keyed by user ID)."""
    from rest_framework.throttling import UserRateThrottle

    from apps.core.throttles import AuthUserThrottle

    assert issubclass(AuthUserThrottle, UserRateThrottle)


def test_payment_throttle_inherits_user_rate_throttle():
    """PaymentThrottle must inherit UserRateThrottle — fraud prevention is per-user."""
    from rest_framework.throttling import UserRateThrottle

    from apps.core.throttles import PaymentThrottle

    assert issubclass(PaymentThrottle, UserRateThrottle)


def test_upload_throttle_inherits_user_rate_throttle():
    """UploadThrottle must inherit UserRateThrottle — limits per authenticated user."""
    from rest_framework.throttling import UserRateThrottle

    from apps.core.throttles import UploadThrottle

    assert issubclass(UploadThrottle, UserRateThrottle)


def test_search_anon_throttle_inherits_anon_rate_throttle():
    """SearchAnonThrottle must inherit AnonRateThrottle — public, keyed by IP."""
    from rest_framework.throttling import AnonRateThrottle

    from apps.core.throttles import SearchAnonThrottle

    assert issubclass(SearchAnonThrottle, AnonRateThrottle)


# ---------------------------------------------------------------------------
# 4. View wiring tests — verifies throttle_classes on each target view
# ---------------------------------------------------------------------------


def test_register_view_uses_auth_anon_throttle():
    """RegisterView.throttle_classes must contain AuthAnonThrottle."""
    from apps.accounts.views import RegisterView
    from apps.core.throttles import AuthAnonThrottle

    throttle_types = [type(t) if not isinstance(t, type) else t for t in RegisterView.throttle_classes]
    assert AuthAnonThrottle in throttle_types


def test_login_view_uses_auth_anon_throttle():
    """LoginView.throttle_classes must contain AuthAnonThrottle."""
    from apps.accounts.views import LoginView
    from apps.core.throttles import AuthAnonThrottle

    throttle_types = [type(t) if not isinstance(t, type) else t for t in LoginView.throttle_classes]
    assert AuthAnonThrottle in throttle_types


def test_logout_view_uses_auth_user_throttle():
    """LogoutView.throttle_classes must contain AuthUserThrottle."""
    from apps.accounts.views import LogoutView
    from apps.core.throttles import AuthUserThrottle

    throttle_types = [type(t) if not isinstance(t, type) else t for t in LogoutView.throttle_classes]
    assert AuthUserThrottle in throttle_types


def test_payment_view_uses_payment_throttle():
    """PaymentInitiateView.throttle_classes must contain PaymentThrottle."""
    from apps.core.throttles import PaymentThrottle
    from apps.payments.views import PaymentInitiateView

    throttle_types = [type(t) if not isinstance(t, type) else t for t in PaymentInitiateView.throttle_classes]
    assert PaymentThrottle in throttle_types


def test_yacht_photo_upload_view_uses_upload_throttle():
    """YachtPhotoUploadView.throttle_classes must contain UploadThrottle."""
    from apps.bookings.views import YachtPhotoUploadView
    from apps.core.throttles import UploadThrottle

    throttle_types = [type(t) if not isinstance(t, type) else t for t in YachtPhotoUploadView.throttle_classes]
    assert UploadThrottle in throttle_types


def test_product_image_upload_view_uses_upload_throttle():
    """ProductImageUploadView.throttle_classes must contain UploadThrottle."""
    from apps.core.throttles import UploadThrottle
    from apps.marketplace.views import ProductImageUploadView

    throttle_types = [type(t) if not isinstance(t, type) else t for t in ProductImageUploadView.throttle_classes]
    assert UploadThrottle in throttle_types


def test_yacht_semantic_search_view_uses_search_anon_throttle():
    """YachtSemanticSearchView.throttle_classes must contain SearchAnonThrottle."""
    from apps.bookings.views import YachtSemanticSearchView
    from apps.core.throttles import SearchAnonThrottle

    throttle_types = [type(t) if not isinstance(t, type) else t for t in YachtSemanticSearchView.throttle_classes]
    assert SearchAnonThrottle in throttle_types


# ---------------------------------------------------------------------------
# 5. Settings completeness test — verifies all 7 scopes have rate strings
# ---------------------------------------------------------------------------


def test_throttle_rates_defined_for_all_scopes():
    """All 7 throttle scopes (2 generic + 5 per-concern) must be in DEFAULT_THROTTLE_RATES.

    This test imports Django settings after setup so it sees the active
    settings module (dev.py in the test environment).
    """
    from django.conf import settings

    rates = settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {})

    required_scopes = {
        "anon",
        "user",
        "auth_anon",
        "auth_user",
        "payment",
        "upload",
        "search_anon",
    }

    missing = required_scopes - set(rates.keys())
    assert not missing, f"Missing throttle rate scopes in settings: {missing}"


def test_throttle_rate_strings_are_non_empty():
    """Every throttle scope in DEFAULT_THROTTLE_RATES must have a non-empty rate string."""
    from django.conf import settings

    rates = settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {})
    per_concern_scopes = ["auth_anon", "auth_user", "payment", "upload", "search_anon"]

    for scope in per_concern_scopes:
        rate = rates.get(scope, "")
        assert rate, f"Throttle rate for scope '{scope}' is empty or missing"
        # Rate strings must contain a slash (e.g. "10/minute", "20/hour")
        assert "/" in rate, f"Throttle rate '{rate}' for scope '{scope}' is not in 'N/period' format"
