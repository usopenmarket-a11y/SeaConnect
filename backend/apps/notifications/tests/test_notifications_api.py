"""Tests for the notifications app HTTP API — Sprint 14A.

Covers:
  InAppNotificationListView  GET  /api/v1/notifications/
  MarkReadView               POST /api/v1/notifications/<id>/read/
  send_notification()        service function

Rules enforced:
  - NEVER mock the database — all DB operations use the real test DB.
  - @pytest.mark.django_db on every class.
  - APIClient from DRF for all endpoint tests.
  - Real users created via User.objects.create_user (consistent with
    the established project pattern in tests/conftest.py).

ADR compliance:
  ADR-009 — JWT authentication on all endpoints.
  ADR-013 — CursorPagination on the list endpoint.
  ADR-014 — Arabic notification fields are primary; English is fallback.
"""
from __future__ import annotations

import uuid

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.core.models import Region
from apps.notifications.models import (
    Notification,
    NotificationChannel,
    NotificationPreference,
    NotificationStatus,
    NotificationType,
)
from apps.notifications.services import send_notification

NOTIFICATION_LIST_URL = "/api/v1/notifications/"


def _read_url(notification_id) -> str:
    return f"/api/v1/notifications/{notification_id}/read/"


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _make_in_app(recipient: User, **kwargs) -> Notification:
    """Create a minimal in-app Notification for the given recipient."""
    defaults = dict(
        notification_type=NotificationType.BOOKING_CONFIRMED,
        channel=NotificationChannel.IN_APP,
        status=NotificationStatus.PENDING,
        title_ar="تم تأكيد حجزك",
        title_en="Booking Confirmed",
        body_ar="حجزك مؤكد.",
        body_en="Your booking is confirmed.",
    )
    defaults.update(kwargs)
    return Notification.objects.create(recipient=recipient, **defaults)


def _make_push(recipient: User, **kwargs) -> Notification:
    """Create a PUSH channel Notification (not surfaced via REST API list)."""
    defaults = dict(
        notification_type=NotificationType.BOOKING_CREATED,
        channel=NotificationChannel.PUSH,
        status=NotificationStatus.PENDING,
        title_ar="طلب حجز جديد",
        title_en="New Booking Request",
        body_ar="وصل طلب حجز جديد.",
        body_en="A new booking request arrived.",
    )
    defaults.update(kwargs)
    return Notification.objects.create(recipient=recipient, **defaults)


def _auth_client(user: User) -> APIClient:
    """Return an APIClient pre-authenticated with the given user's JWT."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def egypt_region(db) -> Region:
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


@pytest.fixture
def customer_user(db, egypt_region: Region) -> User:
    return User.objects.create_user(
        email=f"notif-customer-{uuid.uuid4().hex[:6]}@test.com",
        password="TestPass123!",
        role=UserRole.CUSTOMER,
        preferred_lang="ar",
        region=egypt_region,
    )


@pytest.fixture
def other_user(db, egypt_region: Region) -> User:
    """A second customer — must NOT see the first customer's notifications."""
    return User.objects.create_user(
        email=f"notif-other-{uuid.uuid4().hex[:6]}@test.com",
        password="TestPass123!",
        role=UserRole.CUSTOMER,
        preferred_lang="en",
        region=egypt_region,
    )


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def auth_client(customer_user: User) -> APIClient:
    return _auth_client(customer_user)


@pytest.fixture
def other_client(other_user: User) -> APIClient:
    return _auth_client(other_user)


# ---------------------------------------------------------------------------
# TestInAppNotificationListView — GET /api/v1/notifications/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestInAppNotificationListView:
    """Tests for the in-app notification list endpoint."""

    def test_happy_authenticated_user_gets_200(
        self, auth_client: APIClient, customer_user: User
    ):
        """Authenticated user with in-app notifications gets 200 with results list."""
        _make_in_app(customer_user)
        response = auth_client.get(NOTIFICATION_LIST_URL)
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert isinstance(data["results"], list)
        assert len(data["results"]) >= 1

    def test_sad_anonymous_gets_401(self, api_client: APIClient):
        """Anonymous request must return 401 Unauthorized."""
        response = api_client.get(NOTIFICATION_LIST_URL)
        assert response.status_code == 401

    def test_happy_returns_only_own_notifications(
        self,
        auth_client: APIClient,
        customer_user: User,
        other_user: User,
    ):
        """User must see only their own in-app notifications, not other users'."""
        own_notif = _make_in_app(customer_user)
        _make_in_app(other_user)  # must NOT appear for customer_user

        response = auth_client.get(NOTIFICATION_LIST_URL)
        assert response.status_code == 200
        result_ids = [str(r["id"]) for r in response.json()["results"]]
        assert str(own_notif.id) in result_ids
        # Ensure the other user's notification is absent
        other_ids = [
            str(n.id)
            for n in Notification.objects.filter(recipient=other_user)
        ]
        for oid in other_ids:
            assert oid not in result_ids

    def test_happy_only_in_app_channel_returned(
        self, auth_client: APIClient, customer_user: User
    ):
        """Only channel=in_app notifications appear in the list; push rows are excluded."""
        in_app_notif = _make_in_app(customer_user)
        push_notif = _make_push(customer_user)

        response = auth_client.get(NOTIFICATION_LIST_URL)
        assert response.status_code == 200
        result_ids = [r["id"] for r in response.json()["results"]]
        assert str(in_app_notif.id) in result_ids
        assert str(push_notif.id) not in result_ids

    def test_happy_response_shape_contains_required_fields(
        self, auth_client: APIClient, customer_user: User
    ):
        """Each result entry must include all serializer fields."""
        _make_in_app(customer_user)
        response = auth_client.get(NOTIFICATION_LIST_URL)
        assert response.status_code == 200
        entry = response.json()["results"][0]
        required_fields = {
            "id",
            "notification_type",
            "channel",
            "status",
            "title_ar",
            "title_en",
            "body_ar",
            "body_en",
            "title",
            "body",
            "created_at",
        }
        for field in required_fields:
            assert field in entry, f"Missing field: {field}"

    def test_happy_cursor_pagination_keys_present(
        self, auth_client: APIClient
    ):
        """Response must carry cursor pagination envelope keys (ADR-013)."""
        response = auth_client.get(NOTIFICATION_LIST_URL)
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "next" in data  # DRF CursorPagination standard key

    def test_happy_cursor_pagination_next_page_link(
        self, auth_client: APIClient, customer_user: User
    ):
        """When more than 20 in-app notifications exist, 'next' must be a URL."""
        for i in range(21):
            _make_in_app(
                customer_user,
                title_ar=f"إشعار {i}",
                title_en=f"Notification {i}",
                body_ar=f"نص {i}",
                body_en=f"Body {i}",
            )
        response = auth_client.get(NOTIFICATION_LIST_URL)
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 20
        assert data["next"] is not None
        assert "cursor=" in data["next"]

    def test_happy_empty_list_for_user_with_no_notifications(
        self, auth_client: APIClient
    ):
        """User with no in-app notifications must receive an empty results list."""
        response = auth_client.get(NOTIFICATION_LIST_URL)
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []

    def test_happy_ordered_newest_first(
        self, auth_client: APIClient, customer_user: User
    ):
        """Notifications must be ordered newest first (-created_at)."""
        import datetime
        from django.utils import timezone

        older = _make_in_app(customer_user, title_ar="قديم", title_en="Old")
        newer = _make_in_app(customer_user, title_ar="جديد", title_en="New")
        # Force newer to have a later created_at
        Notification.objects.filter(pk=newer.pk).update(
            created_at=older.created_at + datetime.timedelta(seconds=1)
        )

        response = auth_client.get(NOTIFICATION_LIST_URL)
        assert response.status_code == 200
        results = response.json()["results"]
        assert len(results) >= 2
        assert results[0]["created_at"] >= results[1]["created_at"]

    def test_happy_ar_preferred_user_gets_arabic_title(
        self, customer_user: User
    ):
        """For preferred_lang='ar', derived 'title' field must equal title_ar."""
        assert customer_user.preferred_lang == "ar"
        notif = _make_in_app(customer_user)

        client = _auth_client(customer_user)
        response = client.get(NOTIFICATION_LIST_URL)
        assert response.status_code == 200
        entry = response.json()["results"][0]
        assert entry["title"] == notif.title_ar
        assert entry["body"] == notif.body_ar

    def test_happy_en_preferred_user_gets_english_title(
        self, other_user: User
    ):
        """For preferred_lang='en', derived 'title' field must equal title_en."""
        assert other_user.preferred_lang == "en"
        notif = _make_in_app(other_user)

        client = _auth_client(other_user)
        response = client.get(NOTIFICATION_LIST_URL)
        assert response.status_code == 200
        entry = response.json()["results"][0]
        assert entry["title"] == notif.title_en
        assert entry["body"] == notif.body_en


# ---------------------------------------------------------------------------
# TestMarkReadView — POST /api/v1/notifications/<id>/read/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestMarkReadView:
    """Tests for the mark-as-read endpoint."""

    def test_happy_marks_pending_notification_as_read(
        self, auth_client: APIClient, customer_user: User
    ):
        """POSTing to /read/ must change status to 'read' and set read_at."""
        notif = _make_in_app(customer_user, status=NotificationStatus.PENDING)
        response = auth_client.post(_read_url(notif.id))
        assert response.status_code == 200
        assert response.json() == {"status": "read"}

        notif.refresh_from_db()
        assert notif.status == NotificationStatus.READ
        assert notif.read_at is not None

    def test_happy_idempotent_already_read(
        self, auth_client: APIClient, customer_user: User
    ):
        """Marking an already-read notification is idempotent — returns 200, no error."""
        notif = _make_in_app(customer_user, status=NotificationStatus.READ)
        first_read_at = notif.read_at  # may be None if never set before
        response = auth_client.post(_read_url(notif.id))
        assert response.status_code == 200
        notif.refresh_from_db()
        assert notif.status == NotificationStatus.READ

    def test_sad_anonymous_gets_401(self, api_client: APIClient, customer_user: User):
        """Anonymous request must return 401 Unauthorized."""
        notif = _make_in_app(customer_user)
        response = api_client.post(_read_url(notif.id))
        assert response.status_code == 401

    def test_sad_other_user_cannot_mark_read(
        self,
        auth_client: APIClient,
        customer_user: User,
        other_user: User,
    ):
        """Attempting to mark another user's notification returns 404 (not 403).

        MarkReadView filters by recipient=request.user, so the notification
        simply does not exist for the requesting user — yielding 404.
        """
        other_notif = _make_in_app(other_user)
        response = auth_client.post(_read_url(other_notif.id))
        assert response.status_code == 404

    def test_sad_nonexistent_notification_id_returns_404(
        self, auth_client: APIClient
    ):
        """Posting a random UUID that does not exist must return 404."""
        random_id = uuid.uuid4()
        response = auth_client.post(_read_url(random_id))
        assert response.status_code == 404

    def test_sad_push_channel_notification_returns_404(
        self, auth_client: APIClient, customer_user: User
    ):
        """Push channel notifications are not in the in-app feed.

        MarkReadView filters channel=in_app, so push rows return 404.
        """
        push_notif = _make_push(customer_user)
        response = auth_client.post(_read_url(push_notif.id))
        assert response.status_code == 404

    def test_happy_read_at_timestamp_is_set(
        self, auth_client: APIClient, customer_user: User
    ):
        """read_at must be a non-null timestamp after marking as read."""
        notif = _make_in_app(customer_user)
        assert notif.read_at is None

        auth_client.post(_read_url(notif.id))
        notif.refresh_from_db()
        assert notif.read_at is not None

    def test_sad_get_not_allowed_on_mark_read(
        self, auth_client: APIClient, customer_user: User
    ):
        """GET method on the /read/ endpoint must return 405 Method Not Allowed."""
        notif = _make_in_app(customer_user)
        response = auth_client.get(_read_url(notif.id))
        assert response.status_code == 405


# ---------------------------------------------------------------------------
# TestSendNotificationService — send_notification() service
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendNotificationService:
    """Unit tests for the send_notification() service function.

    Celery tasks (.delay()) are called within send_notification() for PUSH and
    EMAIL channels.  We call the service directly against the real DB; the
    task dispatch is exercised via the real Celery task API (not mocked),
    but since there is no broker in unit tests the call itself is what we
    validate — the Notification row creation and preference check.

    The IN_APP channel never dispatches a task, so it is the safest to test
    without a broker.
    """

    def test_happy_in_app_creates_notification_row(self, customer_user: User):
        """send_notification() must create a Notification row for IN_APP channel."""
        before_count = Notification.objects.count()
        result = send_notification(
            recipient=customer_user,
            notification_type=NotificationType.BOOKING_CONFIRMED,
            channel=NotificationChannel.IN_APP,
            title_ar="تم تأكيد حجزك",
            title_en="Booking Confirmed",
            body_ar="حجزك مؤكد.",
            body_en="Your booking is confirmed.",
        )
        assert result is not None
        assert isinstance(result, Notification)
        assert Notification.objects.count() == before_count + 1

    def test_happy_in_app_stores_bilingual_fields(self, customer_user: User):
        """Both Arabic and English title/body must be persisted."""
        result = send_notification(
            recipient=customer_user,
            notification_type=NotificationType.BOOKING_CONFIRMED,
            channel=NotificationChannel.IN_APP,
            title_ar="تأكيد",
            title_en="Confirmation",
            body_ar="تم التأكيد.",
            body_en="Confirmed.",
        )
        assert result is not None
        stored = Notification.objects.get(pk=result.pk)
        assert stored.title_ar == "تأكيد"
        assert stored.title_en == "Confirmation"
        assert stored.body_ar == "تم التأكيد."
        assert stored.body_en == "Confirmed."

    def test_happy_in_app_stores_reference_fields(self, customer_user: User):
        """reference_id and reference_type are persisted on the Notification row."""
        ref_id = uuid.uuid4()
        result = send_notification(
            recipient=customer_user,
            notification_type=NotificationType.BOOKING_CREATED,
            channel=NotificationChannel.IN_APP,
            title_ar="حجز جديد",
            title_en="New Booking",
            body_ar="وصل طلب.",
            body_en="Request arrived.",
            reference_id=ref_id,
            reference_type="booking",
        )
        assert result is not None
        stored = Notification.objects.get(pk=result.pk)
        assert stored.reference_id == ref_id
        assert stored.reference_type == "booking"

    def test_happy_in_app_status_defaults_to_pending(self, customer_user: User):
        """Newly created Notification rows must have status=pending."""
        result = send_notification(
            recipient=customer_user,
            notification_type=NotificationType.BOOKING_CONFIRMED,
            channel=NotificationChannel.IN_APP,
            title_ar="إشعار",
            title_en="Notification",
            body_ar="نص.",
            body_en="Body.",
        )
        assert result is not None
        assert result.status == NotificationStatus.PENDING

    def test_sad_push_disabled_returns_none(self, customer_user: User):
        """send_notification() returns None when user has opted out of push."""
        prefs, _ = NotificationPreference.objects.get_or_create(user=customer_user)
        prefs.push_enabled = False
        prefs.save(update_fields=["push_enabled"])

        before_count = Notification.objects.count()
        result = send_notification(
            recipient=customer_user,
            notification_type=NotificationType.BOOKING_CONFIRMED,
            channel=NotificationChannel.PUSH,
            title_ar="إشعار",
            title_en="Notification",
            body_ar="نص.",
            body_en="Body.",
        )
        assert result is None
        # No row should be created when the channel is disabled
        assert Notification.objects.count() == before_count

    def test_sad_email_disabled_returns_none(self, customer_user: User):
        """send_notification() returns None when user has opted out of email."""
        prefs, _ = NotificationPreference.objects.get_or_create(user=customer_user)
        prefs.email_enabled = False
        prefs.save(update_fields=["email_enabled"])

        before_count = Notification.objects.count()
        result = send_notification(
            recipient=customer_user,
            notification_type=NotificationType.PAYMENT_RECEIVED,
            channel=NotificationChannel.EMAIL,
            title_ar="إشعار دفع",
            title_en="Payment Notification",
            body_ar="تم الدفع.",
            body_en="Payment received.",
        )
        assert result is None
        assert Notification.objects.count() == before_count

    def test_happy_in_app_always_enabled_even_when_push_disabled(
        self, customer_user: User
    ):
        """IN_APP channel cannot be opted out — it must create a row regardless."""
        prefs, _ = NotificationPreference.objects.get_or_create(user=customer_user)
        prefs.push_enabled = False
        prefs.email_enabled = False
        prefs.save(update_fields=["push_enabled", "email_enabled"])

        result = send_notification(
            recipient=customer_user,
            notification_type=NotificationType.BOOKING_CONFIRMED,
            channel=NotificationChannel.IN_APP,
            title_ar="إشعار داخلي",
            title_en="In-App Notice",
            body_ar="نص.",
            body_en="Body.",
        )
        assert result is not None
        assert result.channel == NotificationChannel.IN_APP

    def test_happy_missing_preference_row_treated_as_opted_in(
        self, customer_user: User
    ):
        """When no NotificationPreference row exists, send_notification() treats
        the user as fully opted in (get_or_create behaviour in _is_channel_enabled).
        """
        # Ensure no preference row exists
        NotificationPreference.objects.filter(user=customer_user).delete()

        result = send_notification(
            recipient=customer_user,
            notification_type=NotificationType.BOOKING_CONFIRMED,
            channel=NotificationChannel.IN_APP,
            title_ar="إشعار",
            title_en="Notice",
            body_ar="نص.",
            body_en="Body.",
        )
        assert result is not None

        # Preference row must have been created by get_or_create
        assert NotificationPreference.objects.filter(user=customer_user).exists()


# ---------------------------------------------------------------------------
# TestNotificationPreferenceModel — model-level tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestNotificationPreferenceModel:
    """Model-level tests for NotificationPreference.

    Validates defaults, the OneToOne constraint, and that marketing opt-in
    defaults to False (GDPR/PDPL requirement).
    """

    def test_happy_defaults_on_creation(self, customer_user: User):
        """Freshly created preference row must have push/email enabled, marketing=False."""
        prefs = NotificationPreference.objects.create(user=customer_user)
        assert prefs.push_enabled is True
        assert prefs.email_enabled is True
        assert prefs.booking_reminders is True
        assert prefs.marketing is False  # explicit opt-in required

    def test_sad_duplicate_preference_for_same_user_raises(
        self, customer_user: User
    ):
        """OneToOneField constraint: a second preference row for the same user must raise."""
        from django.db import IntegrityError

        NotificationPreference.objects.create(user=customer_user)
        with pytest.raises(IntegrityError):
            NotificationPreference.objects.create(user=customer_user)

    def test_happy_str_representation(self, customer_user: User):
        """__str__ must include the user id."""
        prefs = NotificationPreference.objects.create(user=customer_user)
        assert str(customer_user.id) in str(prefs)


# ---------------------------------------------------------------------------
# TestSendNotificationPushEmailDispatch — covers lines 98, 100 in services.py
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendNotificationPushEmailDispatch:
    """Cover the Celery task dispatch branches in send_notification().

    The .delay() method is patched (not the DB) so no broker is required.
    Patching .delay() is patching a network/queue call, not the DB layer —
    this is consistent with the project's ADR (which forbids DB mocking only).
    """

    def test_happy_push_channel_dispatches_push_task(self, customer_user: User):
        """send_notification() with channel=PUSH must call send_push_notification.delay()."""
        from unittest.mock import patch

        with patch(
            "apps.notifications.tasks.send_push_notification.delay"
        ) as mock_push_delay:
            result = send_notification(
                recipient=customer_user,
                notification_type=NotificationType.BOOKING_CONFIRMED,
                channel=NotificationChannel.PUSH,
                title_ar="تأكيد",
                title_en="Confirmation",
                body_ar="تم التأكيد.",
                body_en="Confirmed.",
            )
        assert result is not None
        mock_push_delay.assert_called_once_with(str(result.id))

    def test_happy_email_channel_dispatches_email_task(self, customer_user: User):
        """send_notification() with channel=EMAIL must call send_email_notification.delay()."""
        from unittest.mock import patch

        with patch(
            "apps.notifications.tasks.send_email_notification.delay"
        ) as mock_email_delay:
            result = send_notification(
                recipient=customer_user,
                notification_type=NotificationType.PAYMENT_RECEIVED,
                channel=NotificationChannel.EMAIL,
                title_ar="تأكيد الدفع",
                title_en="Payment Confirmed",
                body_ar="تم الدفع.",
                body_en="Payment received.",
            )
        assert result is not None
        mock_email_delay.assert_called_once_with(str(result.id))

    def test_happy_in_app_channel_does_not_dispatch_any_task(
        self, customer_user: User
    ):
        """IN_APP channel must not dispatch any Celery task — row is already stored."""
        from unittest.mock import patch

        with patch(
            "apps.notifications.tasks.send_push_notification.delay"
        ) as mock_push, patch(
            "apps.notifications.tasks.send_email_notification.delay"
        ) as mock_email:
            result = send_notification(
                recipient=customer_user,
                notification_type=NotificationType.BOOKING_CONFIRMED,
                channel=NotificationChannel.IN_APP,
                title_ar="إشعار",
                title_en="Notice",
                body_ar="نص.",
                body_en="Body.",
            )
        assert result is not None
        mock_push.assert_not_called()
        mock_email.assert_not_called()


# ---------------------------------------------------------------------------
# TestNotifyBookingEvent — covers notify_booking_event() in services.py
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestNotifyBookingEvent:
    """Tests for notify_booking_event() which wraps send_notification().

    Uses a simple Python object to duck-type the booking argument — the
    function only accesses .customer, .yacht.owner, .yacht.name_ar,
    .yacht.name, and .id. No bookings DB table is needed for these tests.
    """

    def _make_booking_stub(self, customer, owner, booking_id=None):
        """Return a duck-typed booking stub with the fields services.py needs."""
        import types
        yacht = types.SimpleNamespace(
            owner=owner,
            name_ar="يخت الاختبار",
            name="Test Yacht",
        )
        return types.SimpleNamespace(
            id=booking_id or uuid.uuid4(),
            customer=customer,
            yacht=yacht,
        )

    def test_happy_booking_created_notifies_owner(
        self, customer_user: User, other_user: User
    ):
        """CREATED event must send a PUSH notification to the owner."""
        from apps.bookings.models import BookingEventType
        from unittest.mock import patch

        booking = self._make_booking_stub(customer=customer_user, owner=other_user)

        with patch("apps.notifications.tasks.send_push_notification.delay"):
            from apps.notifications.services import notify_booking_event
            notify_booking_event(booking, BookingEventType.CREATED)

        # Owner should have a push notification created
        owner_notifications = Notification.objects.filter(
            recipient=other_user,
            channel=NotificationChannel.PUSH,
            notification_type=NotificationType.BOOKING_CREATED,
        )
        assert owner_notifications.exists()

    def test_happy_booking_confirmed_notifies_customer(
        self, customer_user: User, other_user: User
    ):
        """CONFIRMED event must send a PUSH notification to the customer."""
        from apps.bookings.models import BookingEventType
        from unittest.mock import patch

        booking = self._make_booking_stub(customer=customer_user, owner=other_user)

        with patch("apps.notifications.tasks.send_push_notification.delay"):
            from apps.notifications.services import notify_booking_event
            notify_booking_event(booking, BookingEventType.CONFIRMED)

        customer_notifications = Notification.objects.filter(
            recipient=customer_user,
            channel=NotificationChannel.PUSH,
            notification_type=NotificationType.BOOKING_CONFIRMED,
        )
        assert customer_notifications.exists()

    def test_happy_booking_declined_notifies_customer(
        self, customer_user: User, other_user: User
    ):
        """DECLINED event must send a PUSH notification to the customer."""
        from apps.bookings.models import BookingEventType
        from unittest.mock import patch

        booking = self._make_booking_stub(customer=customer_user, owner=other_user)

        with patch("apps.notifications.tasks.send_push_notification.delay"):
            from apps.notifications.services import notify_booking_event
            notify_booking_event(booking, BookingEventType.DECLINED)

        customer_notifications = Notification.objects.filter(
            recipient=customer_user,
            notification_type=NotificationType.BOOKING_DECLINED,
        )
        assert customer_notifications.exists()

    def test_happy_booking_cancelled_notifies_owner(
        self, customer_user: User, other_user: User
    ):
        """CANCELLED event must send a PUSH notification to the owner."""
        from apps.bookings.models import BookingEventType
        from unittest.mock import patch

        booking = self._make_booking_stub(customer=customer_user, owner=other_user)

        with patch("apps.notifications.tasks.send_push_notification.delay"):
            from apps.notifications.services import notify_booking_event
            notify_booking_event(booking, BookingEventType.CANCELLED)

        owner_notifications = Notification.objects.filter(
            recipient=other_user,
            notification_type=NotificationType.BOOKING_CANCELLED,
        )
        assert owner_notifications.exists()

    def test_happy_payment_received_notifies_customer(
        self, customer_user: User, other_user: User
    ):
        """PAYMENT_RECEIVED event must send a PUSH notification to the customer."""
        from apps.bookings.models import BookingEventType
        from unittest.mock import patch

        booking = self._make_booking_stub(customer=customer_user, owner=other_user)

        with patch("apps.notifications.tasks.send_push_notification.delay"):
            from apps.notifications.services import notify_booking_event
            notify_booking_event(booking, BookingEventType.PAYMENT_RECEIVED)

        customer_notifications = Notification.objects.filter(
            recipient=customer_user,
            notification_type=NotificationType.PAYMENT_RECEIVED,
        )
        assert customer_notifications.exists()

    def test_sad_unknown_event_type_does_nothing(
        self, customer_user: User, other_user: User
    ):
        """An unknown event_type must result in no notification rows created."""
        from unittest.mock import patch

        booking = self._make_booking_stub(customer=customer_user, owner=other_user)
        before_count = Notification.objects.count()

        with patch("apps.notifications.tasks.send_push_notification.delay"):
            from apps.notifications.services import notify_booking_event
            notify_booking_event(booking, "completely_unknown_event_xyz")

        assert Notification.objects.count() == before_count

    def test_sad_push_disabled_owner_gets_no_notification(
        self, customer_user: User, other_user: User
    ):
        """When the owner has push disabled, CREATED event creates no notification row."""
        from apps.bookings.models import BookingEventType
        from unittest.mock import patch

        prefs, _ = NotificationPreference.objects.get_or_create(user=other_user)
        prefs.push_enabled = False
        prefs.save(update_fields=["push_enabled"])

        booking = self._make_booking_stub(customer=customer_user, owner=other_user)

        with patch("apps.notifications.tasks.send_push_notification.delay"):
            from apps.notifications.services import notify_booking_event
            notify_booking_event(booking, BookingEventType.CREATED)

        # Owner has push disabled — no row should be created for them
        owner_notifications = Notification.objects.filter(
            recipient=other_user,
            notification_type=NotificationType.BOOKING_CREATED,
        )
        assert not owner_notifications.exists()
