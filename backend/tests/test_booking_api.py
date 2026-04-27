"""HTTP-level tests for the booking endpoints.

Covers permissions, creation validation, transition endpoints, and
yacht-availability GET/PUT. All tests use real DB writes (no mocks).

URL paths assume the bookings app is included under /api/v1/.
"""
from __future__ import annotations

import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.bookings.models import (
    Availability,
    AvailabilityStatus,
    Booking,
    BookingEventType,
    BookingStatus,
    Yacht,
)
from apps.bookings.services import BookingService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _auth(client: APIClient, user: User) -> APIClient:
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


def _booking_payload(yacht: Yacht, departure_port) -> dict:
    return {
        "yacht_id": str(yacht.id),
        "start_date": (datetime.date.today() + datetime.timedelta(days=7)).isoformat(),
        "end_date": (datetime.date.today() + datetime.timedelta(days=10)).isoformat(),
        "num_passengers": 4,
        "departure_port_id": str(departure_port.id),
    }


# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBookingPermissions:

    def test_unauthenticated_cannot_list_bookings(self, api_client):
        response = api_client.get("/api/v1/bookings/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_cannot_create_booking(
        self, api_client, active_yacht, departure_port,
    ):
        response = api_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(active_yacht, departure_port),
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_customer_cannot_see_another_customers_booking(
        self, api_client, active_yacht, departure_port, customer_user, egypt_region,
    ):
        # Customer A creates a booking
        booking = BookingService.create_booking(
            yacht=active_yacht,
            customer=customer_user,
            start_date=datetime.date.today() + datetime.timedelta(days=7),
            end_date=datetime.date.today() + datetime.timedelta(days=10),
            num_passengers=2,
            departure_port=departure_port,
        )
        # Customer B logs in
        other = User.objects.create_user(
            email="other@test.com",
            password="TestPass123!",
            first_name="Other",
            last_name="Customer",
            role=UserRole.CUSTOMER,
            region=egypt_region,
        )
        _auth(api_client, other)
        response = api_client.get(f"/api/v1/bookings/{booking.id}/")
        # 404 (not 403) — booking does not exist as far as customer B is concerned
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_customer_cannot_confirm_booking(
        self, api_client, active_yacht, departure_port, customer_user,
    ):
        booking = BookingService.create_booking(
            yacht=active_yacht,
            customer=customer_user,
            start_date=datetime.date.today() + datetime.timedelta(days=7),
            end_date=datetime.date.today() + datetime.timedelta(days=10),
            num_passengers=2,
            departure_port=departure_port,
        )
        _auth(api_client, customer_user)
        response = api_client.patch(f"/api/v1/bookings/{booking.id}/confirm/")
        # Customer is not the yacht owner — view returns 404 (queryset filter).
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_owner_cannot_cancel_customer_booking(
        self, api_client, active_yacht, departure_port, customer_user, owner_user,
    ):
        booking = BookingService.create_booking(
            yacht=active_yacht,
            customer=customer_user,
            start_date=datetime.date.today() + datetime.timedelta(days=7),
            end_date=datetime.date.today() + datetime.timedelta(days=10),
            num_passengers=2,
            departure_port=departure_port,
        )
        _auth(api_client, owner_user)
        response = api_client.patch(f"/api/v1/bookings/{booking.id}/cancel/")
        # Cancel endpoint queryset filters on customer=request.user.
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_owner_sees_bookings_on_their_yachts(
        self, api_client, active_yacht, departure_port, customer_user, owner_user,
    ):
        BookingService.create_booking(
            yacht=active_yacht,
            customer=customer_user,
            start_date=datetime.date.today() + datetime.timedelta(days=7),
            end_date=datetime.date.today() + datetime.timedelta(days=10),
            num_passengers=2,
            departure_port=departure_port,
        )
        _auth(api_client, owner_user)
        response = api_client.get("/api/v1/bookings/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "results" in data
        assert len(data["results"]) == 1


# ---------------------------------------------------------------------------
# Booking creation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBookingCreate:

    def test_create_booking_returns_201_with_events(
        self, api_client, active_yacht, departure_port, customer_user,
    ):
        _auth(api_client, customer_user)
        response = api_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(active_yacht, departure_port),
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        body = response.json()
        assert body["status"] == BookingStatus.PENDING_OWNER
        assert "events" in body
        assert len(body["events"]) == 1
        assert body["events"][0]["event_type"] == BookingEventType.CREATED

    def test_create_returns_total_amount_and_currency(
        self, api_client, active_yacht, departure_port, customer_user,
    ):
        _auth(api_client, customer_user)
        response = api_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(active_yacht, departure_port),
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        body = response.json()
        # 3 days × 1500.00 EGP/day = 4500.00 (active_yacht fixture)
        assert body["total_amount"] == "4500.00"
        assert body["currency"] == "EGP"

    def test_create_with_end_before_start_returns_400(
        self, api_client, active_yacht, departure_port, customer_user,
    ):
        _auth(api_client, customer_user)
        payload = _booking_payload(active_yacht, departure_port)
        payload["end_date"] = payload["start_date"]  # equal, not strictly after
        response = api_client.post(
            "/api/v1/bookings/", data=payload, format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_for_inactive_yacht_returns_404(
        self, api_client, draft_yacht, departure_port, customer_user,
    ):
        _auth(api_client, customer_user)
        response = api_client.post(
            "/api/v1/bookings/",
            data=_booking_payload(draft_yacht, departure_port),
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_with_excess_passengers_returns_400(
        self, api_client, active_yacht, departure_port, customer_user,
    ):
        _auth(api_client, customer_user)
        payload = _booking_payload(active_yacht, departure_port)
        payload["num_passengers"] = active_yacht.capacity + 5
        response = api_client.post(
            "/api/v1/bookings/", data=payload, format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        body = response.json()
        assert body["error"]["field"] == "num_passengers"


# ---------------------------------------------------------------------------
# Owner transitions
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestOwnerActions:

    def test_owner_confirms_booking(
        self, api_client, active_yacht, departure_port, customer_user, owner_user,
    ):
        booking = BookingService.create_booking(
            yacht=active_yacht,
            customer=customer_user,
            start_date=datetime.date.today() + datetime.timedelta(days=7),
            end_date=datetime.date.today() + datetime.timedelta(days=10),
            num_passengers=2,
            departure_port=departure_port,
        )
        _auth(api_client, owner_user)
        response = api_client.patch(f"/api/v1/bookings/{booking.id}/confirm/")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["status"] == BookingStatus.CONFIRMED

    def test_owner_declines_with_reason(
        self, api_client, active_yacht, departure_port, customer_user, owner_user,
    ):
        booking = BookingService.create_booking(
            yacht=active_yacht,
            customer=customer_user,
            start_date=datetime.date.today() + datetime.timedelta(days=7),
            end_date=datetime.date.today() + datetime.timedelta(days=10),
            num_passengers=2,
            departure_port=departure_port,
        )
        _auth(api_client, owner_user)
        response = api_client.patch(
            f"/api/v1/bookings/{booking.id}/decline/",
            data={"reason": "Engine in service"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["status"] == BookingStatus.DECLINED
        assert body["decline_reason"] == "Engine in service"

    def test_double_confirm_returns_409(
        self, api_client, active_yacht, departure_port, customer_user, owner_user,
    ):
        booking = BookingService.create_booking(
            yacht=active_yacht,
            customer=customer_user,
            start_date=datetime.date.today() + datetime.timedelta(days=7),
            end_date=datetime.date.today() + datetime.timedelta(days=10),
            num_passengers=2,
            departure_port=departure_port,
        )
        BookingService.confirm(booking, actor=owner_user)
        _auth(api_client, owner_user)
        response = api_client.patch(f"/api/v1/bookings/{booking.id}/confirm/")
        assert response.status_code == status.HTTP_409_CONFLICT
        body = response.json()
        assert body["error"]["code"] == "INVALID_TRANSITION"


# ---------------------------------------------------------------------------
# Customer cancel
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCustomerCancel:

    def test_customer_cancels_pending_booking(
        self, api_client, active_yacht, departure_port, customer_user,
    ):
        booking = BookingService.create_booking(
            yacht=active_yacht,
            customer=customer_user,
            start_date=datetime.date.today() + datetime.timedelta(days=7),
            end_date=datetime.date.today() + datetime.timedelta(days=10),
            num_passengers=2,
            departure_port=departure_port,
        )
        _auth(api_client, customer_user)
        response = api_client.patch(f"/api/v1/bookings/{booking.id}/cancel/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == BookingStatus.CANCELLED


# ---------------------------------------------------------------------------
# Yacht availability
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestYachtAvailability:

    def test_get_availability_is_public(self, api_client, active_yacht):
        response = api_client.get(
            f"/api/v1/yachts/{active_yacht.id}/availability/",
        )
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    def test_put_availability_requires_auth(self, api_client, active_yacht):
        response = api_client.put(
            f"/api/v1/yachts/{active_yacht.id}/availability/",
            data=[],
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_put_availability_by_non_owner_returns_404(
        self, api_client, active_yacht, customer_user,
    ):
        _auth(api_client, customer_user)
        response = api_client.put(
            f"/api/v1/yachts/{active_yacht.id}/availability/",
            data=[],
            format="json",
        )
        # get_object_or_404 with owner=request.user
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_put_availability_upserts_records(
        self, api_client, active_yacht, owner_user,
    ):
        _auth(api_client, owner_user)
        today = datetime.date.today()
        response = api_client.put(
            f"/api/v1/yachts/{active_yacht.id}/availability/",
            data=[
                {
                    "date": today.isoformat(),
                    "status": AvailabilityStatus.BLOCKED,
                    "notes": "Maintenance",
                },
                {
                    "date": (today + datetime.timedelta(days=1)).isoformat(),
                    "status": AvailabilityStatus.OPEN,
                },
            ],
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        records = Availability.objects.filter(yacht=active_yacht)
        assert records.count() == 2
        assert records.filter(date=today, status=AvailabilityStatus.BLOCKED).exists()


# ---------------------------------------------------------------------------
# Auto-expire beat task — round-trip integration check
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAutoExpire:

    def test_auto_expire_declines_stale_pending_bookings(
        self,
        active_yacht,
        departure_port,
        customer_user,
        settings,
    ):
        from django.utils import timezone

        from apps.bookings.tasks import auto_expire_pending_bookings

        settings.BOOKING_OWNER_RESPONSE_HOURS = 1

        booking = BookingService.create_booking(
            yacht=active_yacht,
            customer=customer_user,
            start_date=datetime.date.today() + datetime.timedelta(days=7),
            end_date=datetime.date.today() + datetime.timedelta(days=10),
            num_passengers=2,
            departure_port=departure_port,
        )
        # Force created_at to be older than the cutoff.
        Booking.objects.filter(id=booking.id).update(
            created_at=timezone.now() - datetime.timedelta(hours=2),
        )

        result = auto_expire_pending_bookings()
        assert result["expired"] == 1

        booking.refresh_from_db()
        assert booking.status == BookingStatus.DECLINED
        assert booking.decline_reason.startswith("Auto-expired")

    def test_auto_expire_is_idempotent(
        self,
        active_yacht,
        departure_port,
        customer_user,
        settings,
    ):
        from django.utils import timezone

        from apps.bookings.tasks import auto_expire_pending_bookings

        settings.BOOKING_OWNER_RESPONSE_HOURS = 1

        booking = BookingService.create_booking(
            yacht=active_yacht,
            customer=customer_user,
            start_date=datetime.date.today() + datetime.timedelta(days=7),
            end_date=datetime.date.today() + datetime.timedelta(days=10),
            num_passengers=2,
            departure_port=departure_port,
        )
        Booking.objects.filter(id=booking.id).update(
            created_at=timezone.now() - datetime.timedelta(hours=2),
        )

        first = auto_expire_pending_bookings()
        second = auto_expire_pending_bookings()
        assert first["expired"] == 1
        assert second["expired"] == 0
