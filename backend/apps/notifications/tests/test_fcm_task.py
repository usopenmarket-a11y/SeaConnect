"""Tests for send_push_notification Celery task — Sprint 9A FCM implementation.

Strategy
--------
firebase_admin is mocked at the sys.modules level so these tests run in CI
without the firebase-admin package being installed.  Each test resets the
module-level ``_firebase_app`` singleton in tasks.py so state never leaks
between test functions.

ADR compliance:
  - Real DB used throughout (no DB mocking per ADR).
  - All tasks are exercised via direct function calls (not .delay()) so
    Celery broker is not required.
"""

import sys
import types
import uuid
from unittest.mock import MagicMock, patch

import pytest

from apps.accounts.models import User, UserRole
from apps.core.models import Region
from apps.notifications.models import (
    Notification,
    NotificationChannel,
    NotificationStatus,
    NotificationType,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_firebase_stub():
    """Return a minimal firebase_admin stub that can be inserted into sys.modules.

    The stub exposes:
      - firebase_admin.get_app()  — raises ValueError (not yet initialised)
      - firebase_admin.initialize_app(cred) — returns a sentinel App object
      - firebase_admin.credentials.Certificate(json_dict) — returns a MagicMock
      - firebase_admin.messaging.Message / Notification / send  — all MagicMocks
    """
    # Top-level package
    fb = types.ModuleType("firebase_admin")
    fb._app_sentinel = MagicMock(name="firebase_app")

    def get_app():
        raise ValueError("The default Firebase app does not exist.")

    def initialize_app(cred=None, options=None, name="[DEFAULT]"):
        fb.get_app = lambda: fb._app_sentinel
        return fb._app_sentinel

    fb.get_app = get_app
    fb.initialize_app = initialize_app

    # credentials sub-module
    creds_mod = types.ModuleType("firebase_admin.credentials")
    creds_mod.Certificate = MagicMock(return_value=MagicMock(name="certificate"))
    fb.credentials = creds_mod

    # messaging sub-module
    messaging_mod = types.ModuleType("firebase_admin.messaging")
    messaging_mod.Message = MagicMock(name="Message")
    messaging_mod.Notification = MagicMock(name="Notification")
    messaging_mod.send = MagicMock(return_value="projects/test/messages/abc123")
    fb.messaging = messaging_mod

    return fb, messaging_mod


def _reset_firebase_singleton():
    """Reset the module-level _firebase_app to None between tests."""
    import apps.notifications.tasks as tasks_module
    tasks_module._firebase_app = None


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_firebase(monkeypatch):
    """Ensure the Firebase singleton is clean before and after every test."""
    _reset_firebase_singleton()
    yield
    _reset_firebase_singleton()


@pytest.fixture
def firebase_stub():
    """Inject the firebase_admin stub into sys.modules for the test duration."""
    fb, messaging_mod = _make_firebase_stub()
    with patch.dict(sys.modules, {
        "firebase_admin": fb,
        "firebase_admin.credentials": fb.credentials,
        "firebase_admin.messaging": messaging_mod,
    }):
        # Also reset the singleton so _get_firebase_app re-runs its init logic
        _reset_firebase_singleton()
        yield fb, messaging_mod
    _reset_firebase_singleton()


@pytest.fixture
def egypt_region(db):
    region, _ = Region.objects.get_or_create(
        code="EG",
        defaults={
            "name_ar": "مصر",
            "name_en": "Egypt",
            "currency": "EGP",
            "is_active": True,
        },
    )
    return region


@pytest.fixture
def customer_with_token(db, egypt_region):
    """Customer user that has an FCM token registered."""
    user = User.objects.create_user(
        email=f"fcm-customer-{uuid.uuid4().hex[:6]}@test.com",
        password="pass1234!",
        role=UserRole.CUSTOMER,
        preferred_lang="ar",
        fcm_token="ExampleFCMDeviceToken:APA91bHPRgkFLJu4",
    )
    return user


@pytest.fixture
def customer_no_token(db, egypt_region):
    """Customer user with no FCM token."""
    user = User.objects.create_user(
        email=f"no-fcm-{uuid.uuid4().hex[:6]}@test.com",
        password="pass1234!",
        role=UserRole.CUSTOMER,
        fcm_token=None,
    )
    return user


def _make_pending_notification(user):
    """Create a PENDING push notification for the given user."""
    return Notification.objects.create(
        recipient=user,
        notification_type=NotificationType.BOOKING_CONFIRMED,
        channel=NotificationChannel.PUSH,
        status=NotificationStatus.PENDING,
        title_ar="تم تأكيد حجزك",
        title_en="Booking Confirmed",
        body_ar="حجزك على اليخت الجميل مؤكد.",
        body_en="Your yacht booking is confirmed.",
    )


# ---------------------------------------------------------------------------
# Test: Firebase not configured (no FIREBASE_CREDENTIALS_JSON)
# ---------------------------------------------------------------------------

class TestFirebaseNotConfigured:
    """When FIREBASE_CREDENTIALS_JSON env var is empty, task must succeed
    without making any real FCM call (dev/CI mode)."""

    def test_notification_marked_sent_without_fcm_call(self, db, customer_with_token, firebase_stub):
        """Happy path in dev mode: notification transitions PENDING → SENT."""
        _, messaging_mod = firebase_stub
        notif = _make_pending_notification(customer_with_token)

        with patch("apps.notifications.tasks.config", return_value=""):
            from apps.notifications.tasks import send_push_notification
            send_push_notification(str(notif.id))

        notif.refresh_from_db()
        assert notif.status == NotificationStatus.SENT
        assert notif.sent_at is not None
        # No real FCM call should have been made
        messaging_mod.send.assert_not_called()

    def test_sent_at_timestamp_is_populated(self, db, customer_with_token, firebase_stub):
        """sent_at must be set when notification transitions to SENT in dev mode."""
        notif = _make_pending_notification(customer_with_token)

        with patch("apps.notifications.tasks.config", return_value=""):
            from apps.notifications.tasks import send_push_notification
            send_push_notification(str(notif.id))

        notif.refresh_from_db()
        assert notif.sent_at is not None


# ---------------------------------------------------------------------------
# Test: Happy path — Firebase configured, FCM call succeeds
# ---------------------------------------------------------------------------

class TestFCMHappyPath:
    """When Firebase is configured and messaging.send() succeeds."""

    def _configure_firebase(self, fb_stub):
        """Make _get_firebase_app() return the stub app by setting a valid credential."""
        import base64
        import json

        fake_creds = {
            "type": "service_account",
            "project_id": "test-project",
            "private_key_id": "key-id",
            "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----\n",
            "client_email": "firebase@test-project.iam.gserviceaccount.com",
            "client_id": "123456789",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        return base64.b64encode(json.dumps(fake_creds).encode()).decode()

    def test_notification_marked_sent_on_fcm_success(self, db, customer_with_token, firebase_stub):
        """notification transitions PENDING → SENT when FCM accepts the message."""
        fb, messaging_mod = firebase_stub
        creds_b64 = self._configure_firebase(fb)
        notif = _make_pending_notification(customer_with_token)

        with patch("apps.notifications.tasks.config", return_value=creds_b64):
            from apps.notifications.tasks import send_push_notification
            send_push_notification(str(notif.id))

        notif.refresh_from_db()
        assert notif.status == NotificationStatus.SENT
        assert notif.sent_at is not None

    def test_fcm_send_called_with_correct_token(self, db, customer_with_token, firebase_stub):
        """messaging.send() must be called exactly once."""
        fb, messaging_mod = firebase_stub
        creds_b64 = self._configure_firebase(fb)
        notif = _make_pending_notification(customer_with_token)

        with patch("apps.notifications.tasks.config", return_value=creds_b64):
            from apps.notifications.tasks import send_push_notification
            send_push_notification(str(notif.id))

        messaging_mod.send.assert_called_once()

    def test_arabic_title_used_for_ar_user(self, db, customer_with_token, firebase_stub):
        """Arabic title/body must be used for users with preferred_lang='ar'."""
        fb, messaging_mod = firebase_stub
        creds_b64 = self._configure_firebase(fb)
        assert customer_with_token.preferred_lang == "ar"
        notif = _make_pending_notification(customer_with_token)

        with patch("apps.notifications.tasks.config", return_value=creds_b64):
            from apps.notifications.tasks import send_push_notification
            send_push_notification(str(notif.id))

        # Verify messaging.Notification was constructed (title/body come from AR fields)
        messaging_mod.Notification.assert_called_once_with(
            title="تم تأكيد حجزك",
            body="حجزك على اليخت الجميل مؤكد.",
        )


# ---------------------------------------------------------------------------
# Test: FCM raises an exception
# ---------------------------------------------------------------------------

class TestFCMFailure:
    """When messaging.send() raises, notification must transition to FAILED.
    The task must NOT raise self.retry() — FCM errors are not retried."""

    def _configure_firebase(self):
        import base64
        import json
        fake_creds = {
            "type": "service_account",
            "project_id": "test-project",
            "private_key_id": "key-id",
            "private_key": "fake",
            "client_email": "firebase@test.iam.gserviceaccount.com",
            "client_id": "1",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        return base64.b64encode(json.dumps(fake_creds).encode()).decode()

    def test_notification_marked_failed_on_fcm_error(self, db, customer_with_token, firebase_stub):
        """notification transitions PENDING → FAILED when messaging.send() raises."""
        fb, messaging_mod = firebase_stub
        messaging_mod.send.side_effect = Exception("FCM: invalid registration token")
        creds_b64 = self._configure_firebase()
        notif = _make_pending_notification(customer_with_token)

        with patch("apps.notifications.tasks.config", return_value=creds_b64):
            from apps.notifications.tasks import send_push_notification
            # Must NOT raise — FCM errors are swallowed intentionally
            send_push_notification(str(notif.id))

        notif.refresh_from_db()
        assert notif.status == NotificationStatus.FAILED
        assert "FCM: invalid registration token" in notif.failure_reason

    def test_task_does_not_raise_on_fcm_error(self, db, customer_with_token, firebase_stub):
        """Task must complete without raising so the Celery worker stays alive."""
        fb, messaging_mod = firebase_stub
        messaging_mod.send.side_effect = Exception("quota exceeded")
        creds_b64 = self._configure_firebase()
        notif = _make_pending_notification(customer_with_token)

        with patch("apps.notifications.tasks.config", return_value=creds_b64):
            from apps.notifications.tasks import send_push_notification
            try:
                send_push_notification(str(notif.id))
            except Exception:  # noqa: BLE001
                pytest.fail("send_push_notification raised an exception on FCM error — it must not.")

    def test_sent_at_not_set_on_failure(self, db, customer_with_token, firebase_stub):
        """sent_at must remain None when FCM call fails."""
        fb, messaging_mod = firebase_stub
        messaging_mod.send.side_effect = Exception("token not registered")
        creds_b64 = self._configure_firebase()
        notif = _make_pending_notification(customer_with_token)

        with patch("apps.notifications.tasks.config", return_value=creds_b64):
            from apps.notifications.tasks import send_push_notification
            send_push_notification(str(notif.id))

        notif.refresh_from_db()
        assert notif.sent_at is None


# ---------------------------------------------------------------------------
# Test: Missing FCM token on user
# ---------------------------------------------------------------------------

class TestMissingFCMToken:
    """When the recipient has no FCM token, the task must return early."""

    def test_notification_marked_failed_when_no_token(self, db, customer_no_token, firebase_stub):
        """Notification transitions PENDING → FAILED when user.fcm_token is None."""
        _, messaging_mod = firebase_stub
        notif = _make_pending_notification(customer_no_token)

        from apps.notifications.tasks import send_push_notification
        send_push_notification(str(notif.id))

        notif.refresh_from_db()
        assert notif.status == NotificationStatus.FAILED
        assert "No FCM token" in notif.failure_reason
        messaging_mod.send.assert_not_called()

    def test_empty_string_token_treated_as_missing(self, db, egypt_region, firebase_stub):
        """An empty-string FCM token must also be treated as absent."""
        _, messaging_mod = firebase_stub
        user = User.objects.create_user(
            email=f"empty-token-{uuid.uuid4().hex[:6]}@test.com",
            password="pass1234!",
            role=UserRole.CUSTOMER,
            fcm_token="",
        )
        notif = _make_pending_notification(user)

        from apps.notifications.tasks import send_push_notification
        send_push_notification(str(notif.id))

        notif.refresh_from_db()
        assert notif.status == NotificationStatus.FAILED
        messaging_mod.send.assert_not_called()


# ---------------------------------------------------------------------------
# Test: Idempotency guard
# ---------------------------------------------------------------------------

class TestIdempotency:
    """Tasks must be no-ops when the notification is already in a terminal state."""

    @pytest.mark.parametrize("terminal_status", [
        NotificationStatus.SENT,
        NotificationStatus.FAILED,
        NotificationStatus.READ,
    ])
    def test_already_terminal_status_is_skipped(self, db, customer_with_token, firebase_stub, terminal_status):
        """Notification already in a terminal state must not be re-processed."""
        _, messaging_mod = firebase_stub
        notif = _make_pending_notification(customer_with_token)
        notif.status = terminal_status
        notif.save(update_fields=["status"])

        from apps.notifications.tasks import send_push_notification
        send_push_notification(str(notif.id))

        # Status must remain unchanged
        notif.refresh_from_db()
        assert notif.status == terminal_status
        messaging_mod.send.assert_not_called()

    def test_nonexistent_notification_id_returns_gracefully(self, db, firebase_stub):
        """A non-existent notification_id must return without raising."""
        _, messaging_mod = firebase_stub
        missing_id = str(uuid.uuid4())

        from apps.notifications.tasks import send_push_notification
        # Must not raise
        send_push_notification(missing_id)

        messaging_mod.send.assert_not_called()
