"""Custom DRF throttle classes for SeaConnect.

Rate limits are defined per concern rather than per user role:
  - AuthAnonThrottle:  brute-force protection on login/register (anonymous)
  - AuthUserThrottle:  rate-limiting on authenticated auth actions (logout, refresh)
  - PaymentThrottle:   fraud prevention on payment initiation (per user)
  - UploadThrottle:    bandwidth/abuse protection on file uploads (per user)
  - SearchAnonThrottle: generous limit for public search (anonymous)

All throttle classes use the Redis cache backend configured by ADR-005.
Cache key prefix is managed by DRF's built-in throttle key generation,
which respects the KEY_PREFIX ("sc") set in CACHES settings.

Rate values are declared as ``scope`` strings resolved against
``REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`` in settings:

  base.py  — conservative defaults for production environments
  dev.py   — overrides the two generic scopes to 10000/min so pytest
             suites never trigger 429s; the per-concern scopes remain
             at base values (they are not exercised by tests)
  uat.py   — slightly stricter than base for auth and payment scopes

ADR compliance:
  ADR-005  — Redis cache backend used by throttling
  ADR-009  — JWT authentication on all non-public endpoints
"""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthAnonThrottle(AnonRateThrottle):
    """Anonymous auth attempts (login, register).

    Strict limit to prevent credential stuffing and brute-force attacks.
    Applied to RegisterView and the simplejwt TokenObtainPairView (LoginView).
    """

    scope = "auth_anon"


class AuthUserThrottle(UserRateThrottle):
    """Authenticated auth actions (logout, token refresh).

    Prevents token refresh storms from a compromised client.
    Applied to LogoutView.
    """

    scope = "auth_user"


class PaymentThrottle(UserRateThrottle):
    """Payment initiation — strict to prevent fraud.

    Applied to PaymentInitiateView.  The hourly window makes it harder
    to enumerate payment endpoints or trigger multiple charge attempts
    in a short window.
    """

    scope = "payment"


class UploadThrottle(UserRateThrottle):
    """File upload endpoints — bandwidth and abuse protection.

    Applied to YachtPhotoUploadView and ProductImageUploadView.
    Hourly window prevents a single user from filling storage quotas
    through rapid automated uploads.
    """

    scope = "upload"


class SearchAnonThrottle(AnonRateThrottle):
    """Public search — generous limit.

    Applied to YachtSemanticSearchView.  Search is read-only and
    important for SEO/discovery, so the limit is higher than standard
    anonymous access while still guarding against scraping.
    """

    scope = "search_anon"
