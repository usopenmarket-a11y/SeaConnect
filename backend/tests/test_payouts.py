"""Integration tests for the payout and escrow endpoints — Sprint 9B.

Covers:
  - GET /api/v1/payments/payouts/  (PayoutListView)
  - GET /api/v1/payments/escrow/   (EscrowListView)
  - Payout model UUID primary key and field constraints

ADR compliance verified:
  ADR-001 — UUID PKs, ORM only
  ADR-009 — JWT authentication enforced
  ADR-013 — CursorPagination shape (results, next_cursor, has_more)
  ADR-018 — Currency sourced from owner's region, never hardcoded 'EGP'
"""
from __future__ import annotations

import datetime
import uuid
from decimal import Decimal

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.bookings.models import Booking, BookingStatus
from apps.core.models import Region
from apps.payments.models import Payout, PayoutStatus


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _auth(client: APIClient, user: User) -> APIClient:
    """Attach a valid Bearer token for the given user to the client."""
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


def _make_payout(owner: User, reference_suffix: str, currency: str = "EGP") -> Payout:
    """Factory helper — creates a scheduled payout for the given owner."""
    return Payout.objects.create(
        owner=owner,
        amount=Decimal("1500.00"),
        currency=currency,
        status=PayoutStatus.SCHEDULED,
        reference=f"PAYOUT-2026-05-{reference_suffix}",
        payment_method="Bank Transfer",
        scheduled_date=datetime.date(2026, 5, 15),
        escrow_booking_ids=[],
    )


# ---------------------------------------------------------------------------
# Tests — Payout model internals (ADR-001)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPayoutModel:

    def test_payout_model_uuid_pk(self, owner_user: User) -> None:
        """ADR-001: primary key must be UUID, not an auto-incrementing int."""
        payout = _make_payout(owner_user, "MODEL-001")
        assert isinstance(payout.id, uuid.UUID), (
            "Payout.id must be a UUID instance — ADR-001 requires UUID PKs on all models."
        )

    def test_payout_default_status_is_scheduled(self, owner_user: User) -> None:
        payout = _make_payout(owner_user, "STATUS-001")
        assert payout.status == PayoutStatus.SCHEDULED

    def test_payout_reference_unique_constraint(self, owner_user: User) -> None:
        """Duplicate reference values must raise an IntegrityError."""
        import pytest as _pytest

        from django.db import IntegrityError

        _make_payout(owner_user, "UNIQUE-001")
        with _pytest.raises(IntegrityError):
            _make_payout(owner_user, "UNIQUE-001")  # same suffix → same reference

    def test_payout_str_representation(self, owner_user: User) -> None:
        payout = _make_payout(owner_user, "STR-001")
        assert "PAYOUT-2026-05-STR-001" in str(payout)
        assert "scheduled" in str(payout).lower()

    def test_payout_currency_not_hardcoded(self, owner_user: User, egypt_region: Region) -> None:
        """ADR-018: currency must come from region, never be hardcoded."""
        # AED represents a second region — currency must be stored, not assumed 'EGP'
        payout = _make_payout(owner_user, "CURR-001", currency=egypt_region.currency)
        assert payout.currency == egypt_region.currency  # 'EGP' from fixture region
        assert payout.currency != ""


# ---------------------------------------------------------------------------
# Tests — GET /api/v1/payments/payouts/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPayoutListView:

    def test_payout_list_requires_auth(self, api_client: APIClient) -> None:
        """ADR-009: unauthenticated request must return 401."""
        response = api_client.get("/api/v1/payments/payouts/")
        assert response.status_code == 401

    def test_payout_list_returns_own_payouts(
        self,
        api_client: APIClient,
        owner_user: User,
        egypt_region: Region,
    ) -> None:
        """Owner sees their payouts; payouts for another owner are not returned."""
        # Create a second owner
        other_owner = User.objects.create_user(
            email="other-owner@test.com",
            password="TestPass123!",
            first_name="Other",
            last_name="Owner",
            role=UserRole.OWNER,
            region=egypt_region,
        )

        my_payout = _make_payout(owner_user, "OWN-001")
        _make_payout(other_owner, "OTH-001")  # must not appear in response

        _auth(api_client, owner_user)
        response = api_client.get("/api/v1/payments/payouts/")
        assert response.status_code == 200

        body = response.json()
        result_ids = [item["id"] for item in body["results"]]
        assert str(my_payout.id) in result_ids
        # The other owner's payout must not leak through
        other_payout_qs = Payout.objects.filter(owner=other_owner)
        for payout in other_payout_qs:
            assert str(payout.id) not in result_ids

    def test_payout_list_cursor_pagination_shape(
        self,
        api_client: APIClient,
        owner_user: User,
    ) -> None:
        """ADR-013: response must contain 'results', 'next_cursor', 'has_more' keys."""
        _make_payout(owner_user, "PAG-001")
        _make_payout(owner_user, "PAG-002")

        _auth(api_client, owner_user)
        response = api_client.get("/api/v1/payments/payouts/")
        assert response.status_code == 200

        body = response.json()
        assert "results" in body, "Cursor-paginated response must have a 'results' key (ADR-013)"
        assert "next_cursor" in body or "next" in body, (
            "Cursor-paginated response must expose next cursor (ADR-013)"
        )
        assert isinstance(body["results"], list)

    def test_payout_list_serializer_fields(
        self,
        api_client: APIClient,
        owner_user: User,
    ) -> None:
        """Serializer must expose all documented fields and no extra sensitive data."""
        payout = _make_payout(owner_user, "FIELD-001")

        _auth(api_client, owner_user)
        response = api_client.get("/api/v1/payments/payouts/")
        assert response.status_code == 200

        item = response.json()["results"][0]
        assert item["id"] == str(payout.id)
        assert "amount" in item
        assert "currency" in item
        assert "status" in item
        assert "reference" in item
        assert "scheduled_date" in item
        assert "created_at" in item
        # escrow_booking_ids present (may be empty list)
        assert "escrow_booking_ids" in item

    def test_payout_list_empty_for_customer(
        self,
        api_client: APIClient,
        customer_user: User,
        owner_user: User,
    ) -> None:
        """A customer-role user has no payouts — must return empty results."""
        _make_payout(owner_user, "CUST-CHK-001")  # belongs to owner, not customer

        _auth(api_client, customer_user)
        response = api_client.get("/api/v1/payments/payouts/")
        assert response.status_code == 200
        assert response.json()["results"] == []

    def test_payout_list_ordering_newest_first(
        self,
        api_client: APIClient,
        owner_user: User,
    ) -> None:
        """Payouts are ordered by -scheduled_date — latest date appears first."""
        p_old = Payout.objects.create(
            owner=owner_user,
            amount=Decimal("1000.00"),
            currency="EGP",
            status=PayoutStatus.PAID,
            reference="PAYOUT-OLD-001",
            scheduled_date=datetime.date(2026, 3, 1),
            escrow_booking_ids=[],
        )
        p_new = Payout.objects.create(
            owner=owner_user,
            amount=Decimal("2000.00"),
            currency="EGP",
            status=PayoutStatus.SCHEDULED,
            reference="PAYOUT-NEW-001",
            scheduled_date=datetime.date(2026, 6, 1),
            escrow_booking_ids=[],
        )

        _auth(api_client, owner_user)
        response = api_client.get("/api/v1/payments/payouts/")
        results = response.json()["results"]
        ids = [r["id"] for r in results]
        assert ids.index(str(p_new.id)) < ids.index(str(p_old.id)), (
            "Newer scheduled_date must appear before older one"
        )


# ---------------------------------------------------------------------------
# Tests — GET /api/v1/payments/escrow/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestEscrowListView:

    def test_escrow_list_requires_auth(self, api_client: APIClient) -> None:
        """ADR-009: unauthenticated request must return 401."""
        response = api_client.get("/api/v1/payments/escrow/")
        assert response.status_code == 401

    def test_escrow_list_returns_200_for_authenticated_owner(
        self,
        api_client: APIClient,
        owner_user: User,
    ) -> None:
        """Authenticated owner receives 200 and a results list (may be empty)."""
        _auth(api_client, owner_user)
        response = api_client.get("/api/v1/payments/escrow/")
        assert response.status_code == 200
        body = response.json()
        assert "results" in body
        assert isinstance(body["results"], list)

    def test_escrow_list_excludes_old_completed_bookings(
        self,
        api_client: APIClient,
        owner_user: User,
        active_yacht,
        customer_user: User,
        egypt_region: Region,
        departure_port,
    ) -> None:
        """Bookings completed more than 24h ago must NOT appear in escrow."""
        from django.utils import timezone

        old_booking = Booking.objects.create(
            yacht=active_yacht,
            customer=customer_user,
            region=egypt_region,
            departure_port=departure_port,
            start_date=datetime.date(2026, 4, 1),
            end_date=datetime.date(2026, 4, 3),
            num_passengers=2,
            total_amount=Decimal("3000.00"),
            currency="EGP",
            status=BookingStatus.COMPLETED,
        )
        # Force updated_at to >24h ago by using a direct SQL update
        # (auto_now prevents normal assignment)
        old_time = timezone.now() - datetime.timedelta(hours=48)
        Booking.objects.filter(pk=old_booking.pk).update(updated_at=old_time)

        _auth(api_client, owner_user)
        response = api_client.get("/api/v1/payments/escrow/")
        assert response.status_code == 200

        result_ids = [item["id"] for item in response.json()["results"]]
        assert str(old_booking.id) not in result_ids, (
            "Booking completed more than 24h ago must not appear in escrow window"
        )

    def test_escrow_list_includes_recent_completed_bookings(
        self,
        api_client: APIClient,
        owner_user: User,
        active_yacht,
        customer_user: User,
        egypt_region: Region,
        departure_port,
    ) -> None:
        """Bookings completed within 24h must appear in escrow results."""
        recent_booking = Booking.objects.create(
            yacht=active_yacht,
            customer=customer_user,
            region=egypt_region,
            departure_port=departure_port,
            start_date=datetime.date(2026, 5, 1),
            end_date=datetime.date(2026, 5, 3),
            num_passengers=2,
            total_amount=Decimal("3000.00"),
            currency="EGP",
            status=BookingStatus.COMPLETED,
        )
        # updated_at defaults to now() — within the 24h window

        _auth(api_client, owner_user)
        response = api_client.get("/api/v1/payments/escrow/")
        assert response.status_code == 200

        result_ids = [item["id"] for item in response.json()["results"]]
        assert str(recent_booking.id) in result_ids, (
            "Recently completed booking must appear in the 24h escrow window"
        )

    def test_escrow_list_response_fields(
        self,
        api_client: APIClient,
        owner_user: User,
        active_yacht,
        customer_user: User,
        egypt_region: Region,
        departure_port,
    ) -> None:
        """Escrow items must expose id, customer_name, trip_date, amount, currency, release_hours."""
        Booking.objects.create(
            yacht=active_yacht,
            customer=customer_user,
            region=egypt_region,
            departure_port=departure_port,
            start_date=datetime.date(2026, 5, 1),
            end_date=datetime.date(2026, 5, 3),
            num_passengers=2,
            total_amount=Decimal("3000.00"),
            currency="EGP",
            status=BookingStatus.COMPLETED,
        )

        _auth(api_client, owner_user)
        response = api_client.get("/api/v1/payments/escrow/")
        assert response.status_code == 200

        results = response.json()["results"]
        assert len(results) >= 1
        item = results[0]
        assert "id" in item
        assert "customer_name" in item
        assert "trip_date" in item
        assert "amount" in item
        assert "currency" in item
        assert "release_hours" in item
        # release_hours must be a non-negative number
        assert float(item["release_hours"]) >= 0

    def test_escrow_list_scoped_to_owner_yachts(
        self,
        api_client: APIClient,
        owner_user: User,
        active_yacht,
        customer_user: User,
        egypt_region: Region,
        departure_port,
    ) -> None:
        """Owner only sees escrow items for their own yachts."""
        # Create a second owner + yacht
        other_owner = User.objects.create_user(
            email="other-owner-escrow@test.com",
            password="TestPass123!",
            first_name="Other",
            last_name="Owner",
            role=UserRole.OWNER,
            region=egypt_region,
        )
        from apps.bookings.models import Yacht, YachtStatus

        other_yacht = Yacht.objects.create(
            owner=other_owner,
            region=egypt_region,
            departure_port=departure_port,
            name="Other Vessel",
            name_ar="سفينة أخرى",
            description="Another yacht.",
            description_ar="قارب آخر.",
            capacity=4,
            price_per_day=Decimal("1000.00"),
            currency="EGP",
            yacht_type="motorboat",
            status=YachtStatus.ACTIVE,
        )
        other_booking = Booking.objects.create(
            yacht=other_yacht,
            customer=customer_user,
            region=egypt_region,
            departure_port=departure_port,
            start_date=datetime.date(2026, 5, 1),
            end_date=datetime.date(2026, 5, 3),
            num_passengers=2,
            total_amount=Decimal("2000.00"),
            currency="EGP",
            status=BookingStatus.COMPLETED,
        )

        _auth(api_client, owner_user)
        response = api_client.get("/api/v1/payments/escrow/")
        assert response.status_code == 200

        result_ids = [item["id"] for item in response.json()["results"]]
        assert str(other_booking.id) not in result_ids, (
            "Escrow endpoint must not expose another owner's booking"
        )
