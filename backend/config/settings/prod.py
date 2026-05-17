"""Production settings.

Extends base.py for the production environment.
DEBUG is always False. All secrets must be supplied via environment variables.

Deploy targets:
  API:     TBD (production server)
  Web:     Vercel                       — seaconnect.eg / www.seaconnect.eg
  DB:      PostgreSQL (managed service) — DATABASE_URL env var
  Cache:   Redis (managed service)      — REDIS_URL env var
  Storage: Cloudflare R2                — USE_S3=True + AWS_* env vars
  Email:   Brevo / SendGrid             — EMAIL_HOST_USER / EMAIL_HOST_PASSWORD

Required environment variables (no defaults accepted in prod):
  SECRET_KEY, DATABASE_URL, REDIS_URL, ALLOWED_HOSTS,
  CORS_ALLOWED_ORIGINS, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
  AWS_STORAGE_BUCKET_NAME, AWS_S3_ENDPOINT_URL
"""
from .base import *  # noqa: F401, F403
from .base import REST_FRAMEWORK, config

# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

DEBUG = False

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="seaconnect.eg,www.seaconnect.eg",
    cast=lambda v: [s.strip() for s in v.split(",")],
)

# ---------------------------------------------------------------------------
# Security hardening (required for python manage.py check --deploy)
# ---------------------------------------------------------------------------

# Production runs behind a TLS-terminating reverse proxy (Nginx / Cloudflare).
# The forwarded-proto header tells Django the original request used HTTPS.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
SECURE_HSTS_SECONDS = 31536000          # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = "DENY"

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------

STATIC_ROOT = BASE_DIR / "staticfiles"  # noqa: F405 — BASE_DIR from base.*

# ---------------------------------------------------------------------------
# CORS — allow production frontends only
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = config(  # type: ignore[assignment]
    "CORS_ALLOWED_ORIGINS",
    default="https://seaconnect.eg,https://www.seaconnect.eg",
    cast=lambda v: [s.strip() for s in v.split(",")],
)
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Throttling — tightest rates in production
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # inherit all base DRF settings
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/minute",
        "user": "300/minute",
        "auth_anon": "5/minute",    # brute-force protection
        "auth_user": "20/minute",
        "payment": "10/hour",       # fraud prevention
        "upload": "20/hour",
        "search_anon": "120/minute",
    },
}

# ---------------------------------------------------------------------------
# Firebase Cloud Messaging (optional — push notifications)
# ---------------------------------------------------------------------------

FIREBASE_CREDENTIALS_JSON: str = config("FIREBASE_CREDENTIALS_JSON", default="")

# ---------------------------------------------------------------------------
# Sentry — error tracking (optional; only activated when SENTRY_DSN is set)
# ---------------------------------------------------------------------------

_SENTRY_DSN: str = config("SENTRY_DSN", default="")

if _SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.redis import RedisIntegration

    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        integrations=[
            DjangoIntegration(transaction_style="url"),
            CeleryIntegration(monitor_beat_tasks=True),
            RedisIntegration(),
        ],
        traces_sample_rate=0.05,   # 5% of requests in prod (lower cost)
        profiles_sample_rate=0.02,
        send_default_pii=False,
        environment="production",
        release=config("GIT_COMMIT_SHA", default="unknown"),
    )

# ---------------------------------------------------------------------------
# Logging — structured JSON for production log aggregators
# ---------------------------------------------------------------------------

LOGGING = {  # type: ignore[assignment]
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": (
                '{"time": "%(asctime)s", "level": "%(levelname)s", '
                '"module": "%(module)s", "message": "%(message)s"}'
            ),
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "celery": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}
