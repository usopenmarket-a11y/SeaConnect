"""Firebase Admin SDK singleton initialiser for SeaConnect notifications.

This module is the single authoritative location for the Firebase app object.
It is imported by ``apps.notifications.tasks`` and can be imported by any other
module that needs to interact with Firebase without re-initialising the SDK.

Design:
  - Singleton pattern: the Firebase app is initialised at most once per worker
    process, regardless of how many Celery tasks consume it.
  - Graceful no-op: when ``FIREBASE_CREDENTIALS_JSON`` is not set (local dev,
    CI) the function returns ``None`` instead of raising, so callers can skip
    the real FCM call without crashing.
  - Credentials are stored as a base-64-encoded JSON blob in the environment
    variable (never as a file on disk) for compatibility with Render / Docker.

ADR compliance:
  ADR-011 — Celery tasks must be idempotent; Firebase initialisation must never
             cause a task to fail silently or re-initialise the SDK.
"""
import base64
import json
import logging

from decouple import config

logger = logging.getLogger(__name__)

_firebase_app = None


def get_firebase_app():
    """Return the Firebase App singleton, initialising it on first call.

    Returns:
        A ``firebase_admin.App`` instance on success.
        ``None`` when ``FIREBASE_CREDENTIALS_JSON`` is empty (dev / CI mode).

    The returned value is cached at module level.  Subsequent calls return the
    cached object immediately without re-reading the environment variable or
    re-initialising the SDK.

    Raises:
        Nothing — all errors are caught, logged, and ``None`` is returned so
        that callers can degrade gracefully.
    """
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    import firebase_admin
    from firebase_admin import credentials

    # If another code path (e.g. tests) has already initialised the default app,
    # reuse it rather than calling initialize_app() again.
    try:
        _firebase_app = firebase_admin.get_app()
        return _firebase_app
    except ValueError:
        pass  # Default app not yet initialised — proceed below.

    creds_b64 = config("FIREBASE_CREDENTIALS_JSON", default="")
    if not creds_b64:
        logger.info(
            "FIREBASE_CREDENTIALS_JSON not set — FCM calls will be skipped (dev mode)."
        )
        return None

    try:
        creds_json = json.loads(base64.b64decode(creds_b64))
        cred = credentials.Certificate(creds_json)
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialised successfully.")
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to initialise Firebase Admin SDK: %s", exc)
        _firebase_app = None

    return _firebase_app
