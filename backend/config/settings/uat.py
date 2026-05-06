"""UAT (User Acceptance Testing) settings.

Extends base.py for the UAT environment on Render.com (API) + Vercel (web/admin).
DEBUG is off. Sentry is active if SENTRY_DSN is set.
Deployed automatically on merge to develop branch (ADR-020).

Deploy targets:
  API:     Render.com free tier (Frankfurt)   — seaconnect-uat-api.onrender.com
  Web:     Vercel                             — seaconnect-uat.vercel.app
  Admin:   Vercel                             — seaconnect-uat-admin.vercel.app
  DB:      Supabase free tier (PostgreSQL 15) — DATABASE_URL env var
  Cache:   Redis Cloud free tier              — REDIS_URL env var
  Storage: Cloudflare R2 free tier            — USE_S3=True + AWS_* env vars
  Email:   Brevo free tier (300/day)          — EMAIL_HOST_USER / EMAIL_HOST_PASSWORD
"""
from .base import *  # noqa: F401, F403
from .base import ALLOWED_HOSTS, REST_FRAMEWORK, config

# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

DEBUG = False

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="seaconnect-uat-api.onrender.com",
    cast=lambda v: [s.strip() for s in v.split(",")],
)

# ---------------------------------------------------------------------------
# Security hardening (all required for python manage.py check --deploy)
# ---------------------------------------------------------------------------

# Render terminates TLS at its edge; the forwarded-proto header tells Django
# the original request used HTTPS so SECURE_SSL_REDIRECT works correctly.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = "DENY"

# ---------------------------------------------------------------------------
# Email — Brevo SMTP (300 free emails/day; enough for UAT)
# ---------------------------------------------------------------------------
# base.py reads EMAIL_HOST / EMAIL_PORT / EMAIL_USE_TLS from env vars, so
# the defaults below serve as documentation of expected UAT values.  Override
# by setting the corresponding env vars in Render's dashboard.

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST", default="smtp-relay.brevo.com")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")

# ---------------------------------------------------------------------------
# Storage — Cloudflare R2 (S3-compatible, free tier 10 GB)
#
# IMPORTANT: base.py reads USE_S3 from the environment at import time (before
# this module runs its overrides).  Setting USE_S3=True here as a Python
# variable has no effect on the storage backend selection — the `if _USE_S3:`
# branch in base.py already ran during the star-import.
#
# The correct way to activate R2 storage in UAT is to set the environment
# variable USE_S3=True in Render's dashboard (already done in render.yaml).
# All AWS_* variables must also be set there.  This comment documents the
# intent; do not rely on the Python assignment below for activation.
# ---------------------------------------------------------------------------

# Documented intent — actual activation via USE_S3 env var in Render.
USE_S3 = True  # noqa: F841  (documents UAT intent; env var drives base.py)

# ---------------------------------------------------------------------------
# CORS — allow Vercel web and admin frontends
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = config(  # type: ignore[assignment]
    "CORS_ALLOWED_ORIGINS",
    default="https://seaconnect-uat.vercel.app,https://seaconnect-uat-admin.vercel.app",
    cast=lambda v: [s.strip() for s in v.split(",")],
)
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Throttling — UAT rates: slightly stricter than base on auth/payment,
# higher than base on generic and search (more traffic expected in UAT).
# These override the DEFAULT_THROTTLE_RATES dict from base.py.
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # inherit all base DRF settings
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/minute",
        "user": "600/minute",
        # Per-concern scopes — stricter in production than base defaults.
        "auth_anon": "5/minute",       # tighter brute-force cap in prod
        "auth_user": "20/minute",
        "payment": "10/hour",          # tighter fraud prevention in prod
        "upload": "20/hour",
        "search_anon": "200/minute",   # search traffic is higher in UAT
    },
}

# ---------------------------------------------------------------------------
# Firebase Cloud Messaging (optional — push notifications)
# ---------------------------------------------------------------------------
# The firebase-admin SDK reads GOOGLE_APPLICATION_CREDENTIALS (file path) or
# an explicit credential object.  In Render we store the service account as a
# base64 string to avoid file-system secrets.  apps.notifications.tasks
# decodes it at import time if FIREBASE_CREDENTIALS_JSON is set.

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
        traces_sample_rate=0.1,  # 10% of requests for performance monitoring
        profiles_sample_rate=0.05,
        send_default_pii=False,
        environment="uat",
        release=config("GIT_COMMIT_SHA", default="unknown"),
    )

# ---------------------------------------------------------------------------
# Logging — structured JSON for Render log drain / Papertrail
# ---------------------------------------------------------------------------

LOGGING = {  # type: ignore[assignment]
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": '{"time": "%(asctime)s", "level": "%(levelname)s", "module": "%(module)s", "message": "%(message)s"}',
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
        "level": "INFO",
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
            "level": "INFO",
            "propagate": False,
        },
    },
}
