"""Tests for AdminPlatformStatsView and OwnerEarningsSummaryListView.

Covers:
  GET /api/v1/analytics/stats/    — admin-only platform KPI snapshot
  GET /api/v1/analytics/earnings/ — owner earnings history (cursor-paginated)

Rules enforced:
  - NEVER mock the database — all DB operations use the real test DB.
  - @pytest.mark.django_db on every class.
  - APIClient from DRF for endpoint tests.
  - Users created via User.objects.create_user (direct ORM, no factory_boy).
  - Never hardcode currency string — use region.currency (ADR-018).
"""
from __future__ import annotations

import datetime
import uuid
from decimal import Decimal

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.analytics.models import OwnerEarningsSummary
from apps.bookings.models import Booking, BookingStatus, Yacht, YachtMedia, YachtStatus
from apps.core.models import DeparturePort, Region
from apps.payments.models import Payment, PaymentProviderChoices, PaymentStatus

STATS_URL = "/api/v1/analytics/stats/"
EARNINGS_URL = "/api/v1/analytics/earnings/"


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client() -> APIClient:
    """Unauthenticated DRF APIClient."""
    return APIClient()


@pytest.fixture
def egypt_region(db) -> Region:
    """Egypt region seed record."""
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
    """Hurghada marina — primary test port."""
    port, _ = DeparturePort.objects.get_or_create(
        name_en="Hurghada Marina Stats",
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
def admin_user(db, egypt_region: Region) -> User:
    """Staff admin user — is_staff=True satisfies IsAdminUser permission."""
    return User.objects.create_user(
        email=f"stats-admin-{uuid.uuid4().hex[:6]}@test.com",
        password="TestPass123!",
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
        region=egypt_region,
        is_staff=True,
    )


@pytest.fixture
def owner_user(db, egypt_region: Region) -> User:
    """Active owner-role user (non-admin, non-staff)."""
    return User.objects.create_user(
        email=f"stats-owner-{uuid.uuid4().hex[:6]}@test.com",
        password="TestPass123!",
        first_name="Boat",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
    )


@pytest.fixture
def second_owner(db, egypt_region: Region) -> User:
    """A second owner — used to verify earnings isolation."""
    return User.objects.create_user(
        email=f"stats-owner2-{uuid.uuid4().hex[:6]}@test.com",
        password="TestPass123!",
        first_name="Second",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
    )


@pytest.fixture
def customer_user(db, egypt_region: Region) -> User:
    """Active customer-role user."""
    return User.objects.create_user(
        email=f"stats-customer-{uuid.uuid4().hex[:6]}@test.com",
        password="TestPass123!",
        first_name="Test",
        last_name="Customer",
        role=UserRole.CUSTOMER,
        region=egypt_region,
    )


def _auth_client(user: User) -> APIClient:
    """Return an APIClient pre-authenticated with a valid JWT for *user*."""
    client = APIClient()
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


@pytest.fixture
def admin_client(admin_user: User) -> APIClient:
    return _auth_client(admin_user)


@pytest.fixture
def owner_client(owner_user: User) -> APIClient:
    return _auth_client(owner_user)


@pytest.fixture
def customer_client(customer_user: User) -> APIClient:
    return _auth_client(customer_user)


# ---------------------------------------------------------------------------
# Helpers — build the minimum object graph for a Payment
# ---------------------------------------------------------------------------


def _make_yacht(owner: User, region: Region, port: DeparturePort) -> Yacht:
    """Create an active Yacht owned by *owner*."""
    yacht = Yacht.objects.create(
        owner=owner,
        region=region,
        departure_port=port,
        name=f"Stats Test Yacht {uuid.uuid4().hex[:4]}",
        name_ar="قارب اختبار",
        description="Yacht for stats tests.",
        description_ar="قارب لاختبارات الإحصائيات.",
        capacity=6,
        price_per_day="1500.00",
        currency=region.currency,
        yacht_type="motorboat",
        status=YachtStatus.ACTIVE,
    )
    YachtMedia.objects.create(
        yacht=yacht,
        url="https://example.com/stats-test.jpg",
        media_type="image",
        is_primary=True,
        order=0,
    )
    return yacht


def _make_booking(
    yacht: Yacht,
    customer: User,
    region: Region,
    port: DeparturePort,
    status: str = BookingStatus.COMPLETED,
    amount: str = "3000.00",
) -> Booking:
    """Create a Booking for *yacht* / *customer* in the given status."""
    return Booking.objects.create(
        yacht=yacht,
        customer=customer,
        region=region,
        departure_port=port,
        start_date=datetime.date(2026, 7, 1),
        end_date=datetime.date(2026, 7, 3),
        num_passengers=4,
        total_amount=amount,
        currency=region.currency,
        status=status,
    )


def _make_captured_payment(booking: Booking, amount: str) -> Payment:
    """Create a captured Payment linked to *booking*."""
    return Payment.objects.create(
        booking=booking,
        provider=PaymentProviderChoices.FAWRY,
        provider_ref=f"FAW-STATS-{uuid.uuid4().hex[:8]}",
        amount=amount,
        currency=booking.currency,
        status=PaymentStatus.CAPTURED,
    )


def _make_earnings(
    owner: User, year: int, month: int, currency: str
) -> OwnerEarningsSummary:
    """Create an OwnerEarningsSummary row for the given owner and period."""
    return OwnerEarningsSummary.objects.create(
        owner=owner,
        year=year,
        month=month,
        gross_revenue=Decimal("5000.00"),
        platform_fee=Decimal("600.00"),
        net_revenue=Decimal("4400.00"),
        currency=currency,
        booking_count=3,
    )


# ---------------------------------------------------------------------------
# TestAdminPlatformStatsView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAdminPlatformStatsView:
    """Tests for GET /api/v1/analytics/stats/."""

    # -- Permission tests ---------------------------------------------------

    def test_stats_requires_admin_anonymous(self, api_client: APIClient):
        """Anonymous request must return 401 Unauthorized."""
        response = api_client.get(STATS_URL)
        assert response.status_code == 401

    def test_stats_requires_admin_non_admin_gets_403(
        self, owner_client: APIClient
    ):
        """Authenticated non-staff user must receive 403 Forbidden."""
        response = owner_client.get(STATS_URL)
        assert response.status_code == 403

    def test_stats_requires_admin_customer_gets_403(
        self, customer_client: APIClient
    ):
        """Authenticated customer (non-staff) must receive 403 Forbidden."""
        response = customer_client.get(STATS_URL)
        assert response.status_code == 403

    # -- Happy path ---------------------------------------------------------

    def test_stats_returns_correct_gtv(
        self,
        admin_client: APIClient,
        owner_user: User,
        customer_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ):
        """GTV must equal the sum of all captured Payment amounts."""
        yacht = _make_yacht(owner_user, egypt_region, departure_port)
        booking = _make_booking(yacht, customer_user, egypt_region, departure_port)

        # Two captured payments — amounts chosen for easy mental arithmetic.
        _make_captured_payment(booking, "10000.00")
        _make_captured_payment(booking, "5000.00")
        # One pending payment — must NOT be counted in GTV.
        Payment.objects.create(
            booking=booking,
            provider=PaymentProviderChoices.FAWRY,
            provider_ref=f"FAW-PENDING-{uuid.uuid4().hex[:6]}",
            amount="999.00",
            currency=egypt_region.currency,
            status=PaymentStatus.PENDING,
        )

        response = admin_client.get(STATS_URL)
        assert response.status_code == 200
        data = response.json()

        assert data["gtv_total"] == "15000.00"
        # Revenue = 12% of 15000.00 = 1800.00
        assert data["revenue_total"] == "1800.00"
        # Currency hard-coded to region currency for Egypt-first phase
        assert data["gtv_currency"] == egypt_region.currency

    def test_stats_returns_zero_when_no_data(self, admin_client: APIClient):
        """Empty DB must return '0.00' for monetary fields, not None or null."""
        response = admin_client.get(STATS_URL)
        assert response.status_code == 200
        data = response.json()

        assert data["gtv_total"] == "0.00"
        assert data["revenue_total"] == "0.00"
        assert data["bookings_total"] == 0
        assert data["active_yachts"] == 0

    def test_stats_counts_completed_bookings_only(
        self,
        admin_client: APIClient,
        owner_user: User,
        customer_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ):
        """bookings_total must count only completed bookings, not pending/confirmed."""
        yacht = _make_yacht(owner_user, egypt_region, departure_port)
        _make_booking(
            yacht, customer_user, egypt_region, departure_port,
            status=BookingStatus.COMPLETED,
        )
        _make_booking(
            yacht, customer_user, egypt_region, departure_port,
            status=BookingStatus.CONFIRMED,
        )
        _make_booking(
            yacht, customer_user, egypt_region, departure_port,
            status=BookingStatus.PENDING_OWNER,
        )

        response = admin_client.get(STATS_URL)
        assert response.status_code == 200
        assert response.json()["bookings_total"] == 1

    def test_stats_counts_active_yachts_only(
        self,
        admin_client: APIClient,
        owner_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ):
        """active_yachts must count only yachts with status='active' and is_deleted=False."""
        # Active yacht — must be counted.
        _make_yacht(owner_user, egypt_region, departure_port)
        # Draft yacht — must NOT be counted.
        Yacht.objects.create(
            owner=owner_user,
            region=egypt_region,
            departure_port=departure_port,
            name=f"Draft Yacht {uuid.uuid4().hex[:4]}",
            name_ar="قارب مسودة",
            capacity=4,
            price_per_day="1000.00",
            currency=egypt_region.currency,
            yacht_type="sailboat",
            status=YachtStatus.DRAFT,
        )

        response = admin_client.get(STATS_URL)
        assert response.status_code == 200
        assert response.json()["active_yachts"] == 1

    def test_stats_response_shape_has_all_keys(self, admin_client: APIClient):
        """Response must contain all documented keys including active_vendors and mom_gtv_delta."""
        response = admin_client.get(STATS_URL)
        assert response.status_code == 200
        data = response.json()
        required_keys = {
            "gtv_total", "gtv_currency", "revenue_total",
            "bookings_total", "active_yachts", "active_vendors", "mom_gtv_delta",
        }
        assert required_keys.issubset(set(data.keys()))

    def test_stats_counts_active_vendors(
        self,
        admin_client: APIClient,
        egypt_region: Region,
    ):
        """active_vendors must count only users with role='vendor' and is_active=True."""
        User.objects.create_user(
            email=f"vendor-active-{uuid.uuid4().hex[:6]}@test.com",
            password="TestPass123!",
            first_name="Active",
            last_name="Vendor",
            role=UserRole.VENDOR,
            region=egypt_region,
            is_active=True,
        )
        # Inactive vendor — must NOT be counted.
        inactive_vendor = User.objects.create_user(
            email=f"vendor-inactive-{uuid.uuid4().hex[:6]}@test.com",
            password="TestPass123!",
            first_name="Inactive",
            last_name="Vendor",
            role=UserRole.VENDOR,
            region=egypt_region,
        )
        User.objects.filter(pk=inactive_vendor.pk).update(is_active=False)

        response = admin_client.get(STATS_URL)
        assert response.status_code == 200
        # At least 1 active vendor created in this test must appear in the count.
        assert response.json()["active_vendors"] >= 1

    def test_stats_mom_gtv_delta_zero_with_no_prior_month(
        self, admin_client: APIClient
    ):
        """mom_gtv_delta must be 0.0 when there are no captured payments last month."""
        response = admin_client.get(STATS_URL)
        assert response.status_code == 200
        assert response.json()["mom_gtv_delta"] == 0.0

    def test_stats_mom_gtv_delta_is_float(
        self,
        admin_client: APIClient,
        owner_user: User,
        customer_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ):
        """mom_gtv_delta field must be a float (not a string or None)."""
        response = admin_client.get(STATS_URL)
        assert response.status_code == 200
        delta = response.json()["mom_gtv_delta"]
        assert isinstance(delta, float)

    def test_stats_post_not_allowed(self, admin_client: APIClient):
        """Stats endpoint is read-only; POST must return 405."""
        response = admin_client.post(STATS_URL, data={})
        assert response.status_code == 405


# ---------------------------------------------------------------------------
# TestOwnerEarningsSummaryListView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestOwnerEarningsSummaryListView:
    """Tests for GET /api/v1/analytics/earnings/."""

    # -- Permission tests ---------------------------------------------------

    def test_earnings_requires_authentication(self, api_client: APIClient):
        """Anonymous request must return 401 Unauthorized."""
        response = api_client.get(EARNINGS_URL)
        assert response.status_code == 401

    # -- Happy path ---------------------------------------------------------

    def test_earnings_returns_only_own(
        self,
        owner_user: User,
        second_owner: User,
        egypt_region: Region,
    ):
        """Each owner sees only their own earnings rows, not those of other owners."""
        _make_earnings(owner_user, 2026, 4, egypt_region.currency)
        _make_earnings(owner_user, 2026, 3, egypt_region.currency)
        _make_earnings(second_owner, 2026, 4, egypt_region.currency)

        client = _auth_client(owner_user)
        response = client.get(EARNINGS_URL)

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        results = data["results"]
        assert len(results) == 2
        for row in results:
            assert str(row["owner"]) == str(owner_user.id)

    def test_earnings_staff_sees_all(
        self,
        admin_user: User,
        owner_user: User,
        second_owner: User,
        egypt_region: Region,
    ):
        """Staff users must see all earnings rows across all owners."""
        _make_earnings(owner_user, 2026, 4, egypt_region.currency)
        _make_earnings(second_owner, 2026, 4, egypt_region.currency)

        client = _auth_client(admin_user)
        response = client.get(EARNINGS_URL)

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        # Both owners' rows must appear.
        owner_ids = {str(row["owner"]) for row in data["results"]}
        assert str(owner_user.id) in owner_ids
        assert str(second_owner.id) in owner_ids

    def test_earnings_cursor_paginated_response_shape(
        self, owner_user: User, egypt_region: Region
    ):
        """Response must carry the DRF CursorPagination envelope keys."""
        _make_earnings(owner_user, 2026, 1, egypt_region.currency)

        client = _auth_client(owner_user)
        response = client.get(EARNINGS_URL)

        assert response.status_code == 200
        data = response.json()
        # Standard DRF CursorPagination keys
        assert "results" in data
        assert "next" in data

    def test_earnings_empty_for_new_owner(
        self, owner_user: User
    ):
        """Owner with no earnings summaries must receive an empty results list."""
        client = _auth_client(owner_user)
        response = client.get(EARNINGS_URL)

        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []

    def test_earnings_row_has_correct_fields(
        self, owner_user: User, egypt_region: Region
    ):
        """Each result row must expose the documented serializer fields."""
        summary = _make_earnings(owner_user, 2026, 5, egypt_region.currency)

        client = _auth_client(owner_user)
        response = client.get(EARNINGS_URL)

        assert response.status_code == 200
        row = response.json()["results"][0]
        assert str(row["id"]) == str(summary.id)
        assert row["year"] == 2026
        assert row["month"] == 5
        assert row["gross_revenue"] == "5000.00"
        assert row["platform_fee"] == "600.00"
        assert row["net_revenue"] == "4400.00"
        assert row["currency"] == egypt_region.currency
        assert row["booking_count"] == 3

    def test_earnings_post_not_allowed(self, owner_user: User):
        """Earnings endpoint is read-only; POST must return 405."""
        client = _auth_client(owner_user)
        response = client.post(EARNINGS_URL, data={})
        assert response.status_code == 405

    def test_earnings_row_includes_month_label(
        self, owner_user: User, egypt_region: Region
    ):
        """Each result row must include month_label in 'YYYY-MM' format."""
        _make_earnings(owner_user, 2026, 5, egypt_region.currency)

        client = _auth_client(owner_user)
        response = client.get(EARNINGS_URL)

        assert response.status_code == 200
        row = response.json()["results"][0]
        assert "month_label" in row
        assert row["month_label"] == "2026-05"

    def test_earnings_row_includes_mom_delta(
        self, owner_user: User, egypt_region: Region
    ):
        """Each result row must include mom_delta as a float (0.0 for oldest row)."""
        _make_earnings(owner_user, 2026, 5, egypt_region.currency)
        _make_earnings(owner_user, 2026, 4, egypt_region.currency)

        client = _auth_client(owner_user)
        response = client.get(EARNINGS_URL)

        assert response.status_code == 200
        results = response.json()["results"]
        # Both rows must carry mom_delta.
        for row in results:
            assert "mom_delta" in row
            assert isinstance(row["mom_delta"], float)
        # Oldest row (May 2026 at index 0 = newest, April 2026 at index 1)
        # May vs April: same net_revenue (4400.00 each) → delta = 0.0
        assert results[0]["mom_delta"] == 0.0
        # April is the oldest visible row — no prior context → 0.0
        assert results[1]["mom_delta"] == 0.0

    def test_earnings_customer_gets_200_empty_results(
        self, customer_user: User
    ):
        """Customer (non-owner) is authenticated but has no earnings rows — returns 200 + []."""
        client = _auth_client(customer_user)
        response = client.get(EARNINGS_URL)

        # Permission is IsAuthenticated — customers get 200 with an empty list,
        # not 403. They simply have no OwnerEarningsSummary rows.
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []
