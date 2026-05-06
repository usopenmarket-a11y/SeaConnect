"""Tests for booking state-change push notifications (Sprint 12D).

Strategy
--------
``transaction.on_commit()`` callbacks are swallowed by the test-transaction
wrapper that pytest-django uses (the transaction never actually commits).  We
patch ``django.db.transaction.on_commit`` to invoke the callback immediately
so the notification side-effect fires synchronously inside the test.

We also patch ``apps.notifications.tasks.send_push_notification.delay`` to
prevent real Celery enqueues and patch ``apps.bookings.tasks.send_booking_request_notification.delay``
to prevent the legacy email task from firing.

All tests use real DB writes — mocking the database layer is prohibited
per project rules (see CLAUDE.md).

Notification model invariants checked:
  - Booking CREATED   → owner gets a PUSH notification (booking_created type)
  - Booking CONFIRMED → customer gets a PUSH notification (booking_confirmed type)
  - Booking DECLINED  → customer gets a PUSH notification (booking_declined type)
  - Booking CANCELLED → owner gets a PUSH notification (booking_cancelled type)
  - Notification failure must NOT break the booking state transition
"""
from __future__ import annotations

import datetime
from unittest.mock import MagicMock, patch

import pytest

from apps.accounts.models import User, UserRole
from apps.bookings.models import Booking, BookingStatus, Yacht, YachtMedia
from apps.bookings.services import BookingService
from apps.core.models import DeparturePort, Region
from apps.notifications.models import Notification, NotificationChannel, NotificationType


# ---------------------------------------------------------------------------
# Shared fixtures (duplicated from top-level conftest because pytest resolves
# conftest.py files scoped to the app directory, not the repo root tests/).
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
def departure_port(db, egypt_region: Region) -> DeparturePort:
    port, _ = DeparturePort.objects.get_or_create(
        name_en="Hurghada Marina",
        defaults={
            "name_ar": "مرسى الغردقة",
            "region": egypt_region,
            "city_en": "Hurghada",
            "city_ar": "الغردقة",
            "latitude": "27.257400",
            "longitude": "33.811600",
            "is_active": True,
        },
    )
    return port


@pytest.fixture
def owner_user(db, egypt_region: Region) -> User:
    return User.objects.create_user(
        email="owner_notif@test.com",
        password="TestPass123!",
        first_name="Boat",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
        fcm_token="fake-owner-fcm-token",
    )


@pytest.fixture
def customer_user(db, egypt_region: Region) -> User:
    return User.objects.create_user(
        email="customer_notif@test.com",
        password="TestPass123!",
        first_name="Test",
        last_name="Customer",
        role=UserRole.CUSTOMER,
        region=egypt_region,
        fcm_token="fake-customer-fcm-token",
    )


@pytest.fixture
def active_yacht(
    db, owner_user: User, egypt_region: Region, departure_port: DeparturePort
) -> Yacht:
    yacht = Yacht.objects.create(
        owner=owner_user,
        region=egypt_region,
        departure_port=departure_port,
        name="Sea Dream",
        name_ar="حلم البحر",
        description="A beautiful yacht for charter.",
        description_ar="قارب جميل للإيجار.",
        capacity=8,
        price_per_day="1500.00",
        currency="EGP",
        yacht_type="motorboat",
        status="active",
    )
    YachtMedia.objects.create(
        yacht=yacht,
        url="https://example.com/photo.jpg",
        media_type="image",
        is_primary=True,
        order=0,
    )
    return yacht


@pytest.fixture
def pending_booking(
    db, active_yacht: Yacht, customer_user: User, departure_port: DeparturePort
) -> Booking:
    """A booking already in pending_owner state (bypasses create_booking to skip
    the on_commit side-effects so each test controls them independently)."""
    return Booking.objects.create(
        yacht=active_yacht,
        customer=customer_user,
        region=active_yacht.region,
        departure_port=departure_port,
        start_date=datetime.date(2035, 6, 1),
        end_date=datetime.date(2035, 6, 4),
        num_passengers=2,
        total_amount="4500.00",
        currency="EGP",
        status=BookingStatus.PENDING_OWNER,
    )


# ---------------------------------------------------------------------------
# Helper — make on_commit fire immediately inside the test transaction
# ---------------------------------------------------------------------------

def _immediate_on_commit(func):
    """Replacement for transaction.on_commit that runs the callback immediately.

    Django's test runner wraps each test in a transaction that never commits,
    so on_commit callbacks are silently dropped.  This helper fires them
    synchronously so we can assert on their side-effects.
    """
    func()


# ---------------------------------------------------------------------------
# Test: new booking notifies owner
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_new_booking_triggers_owner_notification(
    active_yacht, customer_user, departure_port
):
    """Creating a booking should create a push Notification row for the yacht owner."""
    with (
        patch("django.db.transaction.on_commit", side_effect=_immediate_on_commit),
        patch(
            "apps.bookings.tasks.send_booking_request_notification.delay"
        ) as _mock_email_task,
        patch(
            "apps.notifications.tasks.send_push_notification.delay"
        ) as mock_push_delay,
    ):
        booking = BookingService.create_booking(
            yacht=active_yacht,
            customer=customer_user,
            start_date=datetime.date(2035, 7, 1),
            end_date=datetime.date(2035, 7, 4),
            num_passengers=2,
            departure_port=departure_port,
        )

    # A Notification row for the owner should exist.
    notif = Notification.objects.filter(
        recipient=active_yacht.owner,
        notification_type=NotificationType.BOOKING_CREATED,
        reference_id=booking.id,
        reference_type="booking",
        channel=NotificationChannel.PUSH,
    ).first()

    assert notif is not None, "Expected a BOOKING_CREATED push notification for the owner"
    # The Celery push task should have been enqueued.
    mock_push_delay.assert_called_once_with(str(notif.id))


# ---------------------------------------------------------------------------
# Test: confirm notifies customer
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_confirm_booking_triggers_customer_notification(
    pending_booking, owner_user
):
    """Confirming a booking should create a push Notification row for the customer."""
    with (
        patch("django.db.transaction.on_commit", side_effect=_immediate_on_commit),
        patch(
            "apps.notifications.tasks.send_push_notification.delay"
        ) as mock_push_delay,
    ):
        BookingService.confirm(pending_booking, actor=owner_user)

    notif = Notification.objects.filter(
        recipient=pending_booking.customer,
        notification_type=NotificationType.BOOKING_CONFIRMED,
        reference_id=pending_booking.id,
        reference_type="booking",
        channel=NotificationChannel.PUSH,
    ).first()

    assert notif is not None, "Expected a BOOKING_CONFIRMED push notification for the customer"
    mock_push_delay.assert_called_once_with(str(notif.id))


# ---------------------------------------------------------------------------
# Test: decline notifies customer
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_decline_booking_triggers_customer_notification(
    pending_booking, owner_user
):
    """Declining a booking should create a push Notification row for the customer."""
    with (
        patch("django.db.transaction.on_commit", side_effect=_immediate_on_commit),
        patch(
            "apps.notifications.tasks.send_push_notification.delay"
        ) as mock_push_delay,
    ):
        BookingService.decline(pending_booking, actor=owner_user, reason="Unavailable")

    notif = Notification.objects.filter(
        recipient=pending_booking.customer,
        notification_type=NotificationType.BOOKING_DECLINED,
        reference_id=pending_booking.id,
        reference_type="booking",
        channel=NotificationChannel.PUSH,
    ).first()

    assert notif is not None, "Expected a BOOKING_DECLINED push notification for the customer"
    mock_push_delay.assert_called_once_with(str(notif.id))


# ---------------------------------------------------------------------------
# Test: cancel notifies owner
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_cancel_booking_triggers_owner_notification(
    pending_booking, customer_user, active_yacht
):
    """Cancelling a booking should create a push Notification row for the yacht owner."""
    with (
        patch("django.db.transaction.on_commit", side_effect=_immediate_on_commit),
        patch(
            "apps.notifications.tasks.send_push_notification.delay"
        ) as mock_push_delay,
    ):
        BookingService.cancel(pending_booking, actor=customer_user)

    notif = Notification.objects.filter(
        recipient=active_yacht.owner,
        notification_type=NotificationType.BOOKING_CANCELLED,
        reference_id=pending_booking.id,
        reference_type="booking",
        channel=NotificationChannel.PUSH,
    ).first()

    assert notif is not None, "Expected a BOOKING_CANCELLED push notification for the owner"
    mock_push_delay.assert_called_once_with(str(notif.id))


# ---------------------------------------------------------------------------
# Test: notification failure must not break the booking state change
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_notification_failure_does_not_break_confirm(
    pending_booking, owner_user
):
    """If notify_booking_event raises, the booking state change must still persist."""
    with (
        patch("django.db.transaction.on_commit", side_effect=_immediate_on_commit),
        patch(
            "apps.notifications.services.notify_booking_event",
            side_effect=RuntimeError("FCM service down"),
        ),
    ):
        # Should NOT raise even though notifications are broken.
        returned_booking = BookingService.confirm(pending_booking, actor=owner_user)

    # Booking state is persisted despite the notification failure.
    pending_booking.refresh_from_db()
    assert pending_booking.status == BookingStatus.CONFIRMED
    assert returned_booking.status == BookingStatus.CONFIRMED


@pytest.mark.django_db
def test_notification_failure_does_not_break_decline(
    pending_booking, owner_user
):
    """If notify_booking_event raises on decline, booking state must still be saved."""
    with (
        patch("django.db.transaction.on_commit", side_effect=_immediate_on_commit),
        patch(
            "apps.notifications.services.notify_booking_event",
            side_effect=RuntimeError("push service unavailable"),
        ),
    ):
        returned_booking = BookingService.decline(
            pending_booking, actor=owner_user, reason="No availability"
        )

    pending_booking.refresh_from_db()
    assert pending_booking.status == BookingStatus.DECLINED
    assert returned_booking.status == BookingStatus.DECLINED


@pytest.mark.django_db
def test_notification_failure_does_not_break_cancel(
    pending_booking, customer_user
):
    """If notify_booking_event raises on cancel, booking state must still be saved."""
    with (
        patch("django.db.transaction.on_commit", side_effect=_immediate_on_commit),
        patch(
            "apps.notifications.services.notify_booking_event",
            side_effect=RuntimeError("notification table locked"),
        ),
    ):
        returned_booking = BookingService.cancel(pending_booking, actor=customer_user)

    pending_booking.refresh_from_db()
    assert pending_booking.status == BookingStatus.CANCELLED
    assert returned_booking.status == BookingStatus.CANCELLED


# ---------------------------------------------------------------------------
# Test: opted-out users do not receive notifications
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_opted_out_owner_skips_notification(
    active_yacht, owner_user, customer_user, departure_port
):
    """If the owner has opted out of push, no Notification row is created."""
    from apps.notifications.models import NotificationPreference

    # Owner explicitly opts out of push.
    NotificationPreference.objects.create(user=owner_user, push_enabled=False)

    with (
        patch("django.db.transaction.on_commit", side_effect=_immediate_on_commit),
        patch("apps.bookings.tasks.send_booking_request_notification.delay"),
        patch("apps.notifications.tasks.send_push_notification.delay") as mock_push,
    ):
        BookingService.create_booking(
            yacht=active_yacht,
            customer=customer_user,
            start_date=datetime.date(2035, 8, 1),
            end_date=datetime.date(2035, 8, 3),
            num_passengers=1,
            departure_port=departure_port,
        )

    # No push Notification row for the owner.
    assert not Notification.objects.filter(
        recipient=owner_user,
        notification_type=NotificationType.BOOKING_CREATED,
        channel=NotificationChannel.PUSH,
    ).exists()
    # The Celery push task should NOT have been enqueued.
    mock_push.assert_not_called()
