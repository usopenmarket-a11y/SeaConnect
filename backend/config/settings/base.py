"""Base settings shared across all environments.

All environment-specific overrides go in dev.py, uat.py, or prod.py.
Never put secrets in this file — use environment variables via python-decouple.

ADR compliance:
  ADR-001 — Django + DRF
  ADR-005 — Redis via REDIS_URL
  ADR-009 — JWT RS256, 15min access / 30day refresh
  ADR-011 — Celery + Celery Beat
  ADR-013 — CursorPagination on all list endpoints
  ADR-018 — Multi-region: language Arabic-first, UTC timestamps
"""
import os
from pathlib import Path

from decouple import Csv, config

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

# /mnt/.../backend/config/settings/base.py  → three levels up = backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------

SECRET_KEY: str = config("SECRET_KEY", default="insecure-default-change-in-production")

# Populated per-environment
ALLOWED_HOSTS: list[str] = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "storages",
    "django_celery_beat",
    "django_celery_results",
    "django_filters",
]

LOCAL_APPS = [
    "apps.core",
    "apps.accounts",
    "apps.bookings",
    "apps.marketplace",
    "apps.competitions",
    "apps.weather",
    "apps.payments",
    "apps.notifications",
    "apps.analytics",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Database — ADR-004 (PostgreSQL 16)
# ---------------------------------------------------------------------------

import dj_database_url  # noqa: E402

_DATABASE_URL: str = config(
    "DATABASE_URL",
    default="postgresql://seaconnect:seaconnect@db:5432/seaconnect",
)

DATABASES = {
    "default": dj_database_url.parse(
        _DATABASE_URL,
        conn_max_age=600,
        conn_health_checks=True,
    )
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Custom User model — ADR-009
# ---------------------------------------------------------------------------

AUTH_USER_MODEL = "accounts.User"

# ---------------------------------------------------------------------------
# Authentication & Password validation
# ---------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Django REST Framework — ADR-009 (JWT), ADR-013 (CursorPagination)
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.CursorPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
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
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/minute",
        "user": "300/minute",
    },
    "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
}

# ---------------------------------------------------------------------------
# SimpleJWT — ADR-009: RS256, 15min access / 30day refresh
# ---------------------------------------------------------------------------

from datetime import timedelta  # noqa: E402

_JWT_PRIVATE_KEY_PATH: str = config(
    "JWT_PRIVATE_KEY_PATH",
    default=str(BASE_DIR / "keys" / "jwt_private.pem"),
)
_JWT_PUBLIC_KEY_PATH: str = config(
    "JWT_PUBLIC_KEY_PATH",
    default=str(BASE_DIR / "keys" / "jwt_public.pem"),
)


def _read_key(path: str) -> str:
    """Read a PEM key file. Returns empty string if file does not exist (dev fallback)."""
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        return ""


SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "RS256",
    "SIGNING_KEY": _read_key(_JWT_PRIVATE_KEY_PATH),
    "VERIFYING_KEY": _read_key(_JWT_PUBLIC_KEY_PATH),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_OBTAIN_SERIALIZER": "apps.accounts.serializers.CustomTokenObtainPairSerializer",
}

# ---------------------------------------------------------------------------
# CORS — ADR-003 (Next.js web), ADR-009 (no cookies across origins)
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS: list[str] = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://localhost:3001",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Internationalisation — ADR-014 (Arabic-first), ADR-018 (UTC)
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "ar"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

LANGUAGES = [
    ("ar", "Arabic"),
    ("en", "English"),
]

# ---------------------------------------------------------------------------
# Static & media files
# ---------------------------------------------------------------------------

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ---------------------------------------------------------------------------
# File storage — ADR-010 (Cloudflare R2 via S3-compatible API)
# ---------------------------------------------------------------------------

_USE_S3: bool = config("USE_S3", default=False, cast=bool)

if _USE_S3:
    AWS_ACCESS_KEY_ID: str = config("AWS_ACCESS_KEY_ID", default="")
    AWS_SECRET_ACCESS_KEY: str = config("AWS_SECRET_ACCESS_KEY", default="")
    AWS_STORAGE_BUCKET_NAME: str = config("AWS_STORAGE_BUCKET_NAME", default="seaconnect")
    AWS_S3_ENDPOINT_URL: str = config("AWS_S3_ENDPOINT_URL", default="")
    AWS_S3_CUSTOM_DOMAIN: str = config("AWS_S3_CUSTOM_DOMAIN", default="")
    AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}
    AWS_DEFAULT_ACL = None  # R2 does not support ACLs
    AWS_QUERYSTRING_AUTH = False

    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "bucket_name": AWS_STORAGE_BUCKET_NAME,
                "endpoint_url": AWS_S3_ENDPOINT_URL,
                "custom_domain": AWS_S3_CUSTOM_DOMAIN or None,
                "object_parameters": AWS_S3_OBJECT_PARAMETERS,
                "default_acl": None,
                "querystring_auth": False,
            },
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
else:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

# ---------------------------------------------------------------------------
# Redis — ADR-005
# Cache key pattern: sc:{module}:{id}:{version}  (all keys must have explicit TTL)
# ---------------------------------------------------------------------------

REDIS_URL: str = config("REDIS_URL", default="redis://redis:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
        "KEY_PREFIX": "sc",
    }
}

# ---------------------------------------------------------------------------
# Celery — ADR-011
# ---------------------------------------------------------------------------

CELERY_BROKER_URL: str = REDIS_URL
CELERY_RESULT_BACKEND = "django-db"
CELERY_CACHE_BACKEND = "default"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_ENABLE_UTC = True
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

# Default task settings — all tasks must override per ADR-011.
CELERY_TASK_MAX_RETRIES = 3
CELERY_TASK_DEFAULT_RETRY_DELAY = 60  # seconds

# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------

EMAIL_BACKEND: str = config(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST: str = config("EMAIL_HOST", default="mailpit")
EMAIL_PORT: int = config("EMAIL_PORT", default=1025, cast=int)
EMAIL_USE_TLS: bool = config("EMAIL_USE_TLS", default=False, cast=bool)
EMAIL_HOST_USER: str = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD: str = config("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL: str = config("DEFAULT_FROM_EMAIL", default="noreply@seaconnect.app")

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {asctime} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "celery": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# ---------------------------------------------------------------------------
# SeaConnect application settings
# ---------------------------------------------------------------------------

# Platform commission rates
PLATFORM_BOOKING_FEE_PCT = 12  # 12% of booking total_amount
PLATFORM_MARKETPLACE_FEE_PCT = 10  # 10% of order subtotal
PLATFORM_COMPETITION_FEE_PCT = 15  # 15% of entry fees

# File upload limits (bytes)
MAX_PHOTO_SIZE = 10 * 1024 * 1024   # 10 MB
MAX_DOCUMENT_SIZE = 25 * 1024 * 1024  # 25 MB

# Owner response window for bookings
BOOKING_OWNER_RESPONSE_HOURS = 2

# Payout hold period after trip completion
PAYOUT_HOLD_HOURS = 24

# ---------------------------------------------------------------------------
# Payment gateways — Sprint 4
# ---------------------------------------------------------------------------
# ADR-007: views never import concrete providers; they call get_provider().
# Real merchant credentials must be supplied via environment variables in
# UAT/prod — the defaults below are sandbox placeholders only.

FAWRY_MERCHANT_CODE: str = config("FAWRY_MERCHANT_CODE", default="sandbox-merchant")
FAWRY_SECURITY_KEY: str = config("FAWRY_SECURITY_KEY", default="sandbox-key")
FAWRY_BASE_URL: str = config(
    "FAWRY_BASE_URL", default="https://atfawry.fawrystaging.com",
)
