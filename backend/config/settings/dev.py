"""Development settings.

Extends base.py with developer-friendly settings: DEBUG on, verbose logging,
local services (MinIO, Mailpit, local PostgreSQL), and optional debug toolbar.
"""
from .base import *  # noqa: F401, F403
from .base import INSTALLED_APPS, MIDDLEWARE, config

# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

DEBUG = True

SECRET_KEY = config(
    "SECRET_KEY",
    default="dev-only-insecure-secret-key-do-not-use-in-production",
)

ALLOWED_HOSTS = ["*"]

# ---------------------------------------------------------------------------
# Developer tools (loaded only when packages are installed)
# ---------------------------------------------------------------------------

try:
    import django_extensions  # noqa: F401

    INSTALLED_APPS = INSTALLED_APPS + ["django_extensions"]
except ImportError:
    pass

try:
    import debug_toolbar  # noqa: F401

    INSTALLED_APPS = INSTALLED_APPS + ["debug_toolbar"]
    MIDDLEWARE = ["debug_toolbar.middleware.DebugToolbarMiddleware"] + MIDDLEWARE
    INTERNAL_IPS = ["127.0.0.1"]
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Static & media files (served locally via Django in dev)
# ---------------------------------------------------------------------------

STATIC_URL = "/static/"
MEDIA_URL = "/media/"

# ---------------------------------------------------------------------------
# Email — Mailpit catches all outgoing email in dev
# ---------------------------------------------------------------------------

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST", default="localhost")
EMAIL_PORT = config("EMAIL_PORT", default=1025, cast=int)
EMAIL_USE_TLS = False

# ---------------------------------------------------------------------------
# JWT — fall back to HS256 in dev if RSA key files are missing
# ---------------------------------------------------------------------------

import os  # noqa: E402
from pathlib import Path  # noqa: E402

_BASE_DIR = Path(__file__).resolve().parent.parent.parent
_private_key_path = config(
    "JWT_PRIVATE_KEY_PATH",
    default=str(_BASE_DIR / "keys" / "jwt_private.pem"),
)
_public_key_path = config(
    "JWT_PUBLIC_KEY_PATH",
    default=str(_BASE_DIR / "keys" / "jwt_public.pem"),
)

if not os.path.exists(_private_key_path) or not os.path.exists(_public_key_path):
    # Fall back to HS256 with a simple secret for local dev convenience.
    # Production MUST use RS256 with real key files.
    from datetime import timedelta  # noqa: E402

    SIMPLE_JWT = {  # type: ignore[assignment]
        "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),  # longer in dev for convenience
        "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
        "ROTATE_REFRESH_TOKENS": True,
        "BLACKLIST_AFTER_ROTATION": True,
        "UPDATE_LAST_LOGIN": True,
        "ALGORITHM": "HS256",
        "SIGNING_KEY": SECRET_KEY,
        "AUTH_HEADER_TYPES": ("Bearer",),
        "USER_ID_FIELD": "id",
        "USER_ID_CLAIM": "user_id",
        "TOKEN_OBTAIN_SERIALIZER": "apps.accounts.serializers.CustomTokenObtainPairSerializer",
    }

# ---------------------------------------------------------------------------
# Logging — more verbose in dev
# ---------------------------------------------------------------------------

LOGGING = {  # type: ignore[assignment]
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG",
    },
    "loggers": {
        "django.db.backends": {
            "handlers": ["console"],
            "level": "DEBUG",  # Log all SQL queries in dev
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}
