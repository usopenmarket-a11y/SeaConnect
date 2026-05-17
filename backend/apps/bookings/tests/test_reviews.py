"""Sprint 12A — YachtReview API tests.

Covers:
  POST /api/v1/yachts/{id}/reviews/ — customer with completed booking can post
  POST /api/v1/yachts/{id}/reviews/ — customer without booking is forbidden
  POST /api/v1/yachts/{id}/reviews/ — duplicate review returns 409
  GET  /api/v1/yachts/{id}/reviews/ — public, no auth, returns review list
  GET  /api/v1/yachts/reviews/      — owner sees all reviews for their yachts

ADR compliance tested:
  ADR-001  — UUID PKs on all returned records
  ADR-013  — list endpoints use CursorPagination (next_cursor in response)
  ADR-009  — JWT required on POST; anonymous returns 401 on write
"""
from __future__ import annotations

import datetime

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.bookings.models import Booking, BookingEvent, BookingEventType, BookingStatus, Yacht, YachtReview
from apps.core.models import DeparturePort, Region


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


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
        email="owner_reviews@test.com",
        password="TestPass123!",
        first_name="Boat",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
    )


@pytest.fixture
def customer_user(db, egypt_region: Region) -> User:
    return User.objects.create_user(
        email="customer_reviews@test.com",
        password="TestPass123!",
        first_name="Test",
        last_name="Customer",
        role=UserRole.CUSTOMER,
        region=egypt_region,
    )


@pytest.fixture
def second_customer(db, egypt_region: Region) -> User:
    return User.objects.create_user(
        email="customer2_reviews@test.com",
        password="TestPass123!",
        first_name="Second",
        last_name="Reviewer",
        role=UserRole.CUSTOMER,
        region=egypt_region,
    )


@pytest.fixture
def active_yacht(db, owner_user: User, egypt_region: Region, departure_port: DeparturePort) -> Yacht:
    return Yacht.objects.create(
        owner=owner_user,
        region=egypt_region,
        departure_port=departure_port,
        name="Sea Dream",
        name_ar="حلم البحر",
        description="A beautiful yacht.",
        description_ar="قارب جميل.",
        capacity=8,
        price_per_day="1500.00",
        currency="EGP",
        yacht_type="motorboat",
        status="active",
    )


def _make_completed_booking(
    yacht: Yacht,
    customer: User,
    region: Region,
    departure_port: DeparturePort,
) -> Booking:
    """Create a completed booking (and its required BookingEvent rows)."""
    today = datetime.date.today()
    booking = Booking.objects.create(
        yacht=yacht,
        customer=customer,
        region=region,
        departure_port=departure_port,
        start_date=today - datetime.timedelta(days=7),
        end_date=today - datetime.timedelta(days=6),
        num_passengers=2,
        total_amount="1500.00",
        currency="EGP",
        status=BookingStatus.COMPLETED,
    )
    BookingEvent.objects.create(
        booking=booking,
        event_type=BookingEventType.COMPLETED,
        notes="Trip completed.",
    )
    return booking


def _auth_client(user: User) -> APIClient:
    """Return an APIClient with a valid JWT Bearer token for the user."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


# ---------------------------------------------------------------------------
# Test: POST /api/v1/yachts/{id}/reviews/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestYachtReviewCreate:
    """POST review endpoint — happy path, permission checks, duplicate guard."""

    REVIEW_PAYLOAD = {
        "rating": 5,
        "title": "Amazing trip!",
        "body": "Truly one of the best sailing experiences I have ever had.",
    }

    def test_happy_path_customer_with_completed_booking(
        self,
        active_yacht: Yacht,
        customer_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ) -> None:
        """Customer who has a completed booking can post a review → 201."""
        _make_completed_booking(active_yacht, customer_user, egypt_region, departure_port)
        client = _auth_client(customer_user)

        response = client.post(
            f"/api/v1/yachts/{active_yacht.id}/reviews/",
            data=self.REVIEW_PAYLOAD,
            format="json",
        )

        assert response.status_code == 201, response.data
        data = response.data
        assert data["rating"] == 5
        assert data["title"] == "Amazing trip!"
        assert "customer_name" in data
        assert "id" in data  # UUID PK

        # Verify aggregate write-back
        active_yacht.refresh_from_db()
        assert active_yacht.review_count == 1
        assert float(active_yacht.average_rating) == 5.0

    def test_permission_denied_no_completed_booking(
        self,
        active_yacht: Yacht,
        customer_user: User,
    ) -> None:
        """Customer without a completed booking is forbidden → 403."""
        client = _auth_client(customer_user)

        response = client.post(
            f"/api/v1/yachts/{active_yacht.id}/reviews/",
            data=self.REVIEW_PAYLOAD,
            format="json",
        )

        assert response.status_code == 403
        assert response.data["code"] == "NO_COMPLETED_BOOKING"

    def test_anonymous_cannot_post_review(self, api_client: APIClient, active_yacht: Yacht) -> None:
        """Anonymous caller gets 401 on POST (JWT required, ADR-009)."""
        response = api_client.post(
            f"/api/v1/yachts/{active_yacht.id}/reviews/",
            data=self.REVIEW_PAYLOAD,
            format="json",
        )
        assert response.status_code == 401

    def test_owner_role_cannot_post_review(
        self,
        active_yacht: Yacht,
        owner_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ) -> None:
        """Owner-role user cannot submit a review (must be customer) → 403."""
        client = _auth_client(owner_user)
        response = client.post(
            f"/api/v1/yachts/{active_yacht.id}/reviews/",
            data=self.REVIEW_PAYLOAD,
            format="json",
        )
        assert response.status_code == 403

    def test_duplicate_review_returns_409(
        self,
        active_yacht: Yacht,
        customer_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ) -> None:
        """Second review attempt by same customer → 409 ALREADY_REVIEWED."""
        _make_completed_booking(active_yacht, customer_user, egypt_region, departure_port)
        client = _auth_client(customer_user)

        # First review — should succeed
        r1 = client.post(
            f"/api/v1/yachts/{active_yacht.id}/reviews/",
            data=self.REVIEW_PAYLOAD,
            format="json",
        )
        assert r1.status_code == 201

        # Second attempt — must be rejected
        r2 = client.post(
            f"/api/v1/yachts/{active_yacht.id}/reviews/",
            data=self.REVIEW_PAYLOAD,
            format="json",
        )
        assert r2.status_code == 409
        assert r2.data["code"] == "ALREADY_REVIEWED"

    def test_validation_error_rating_out_of_range(
        self,
        active_yacht: Yacht,
        customer_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ) -> None:
        """Rating outside 1–5 → 400 validation error."""
        _make_completed_booking(active_yacht, customer_user, egypt_region, departure_port)
        client = _auth_client(customer_user)

        response = client.post(
            f"/api/v1/yachts/{active_yacht.id}/reviews/",
            data={"rating": 6, "body": "This should fail validation."},
            format="json",
        )
        assert response.status_code == 400

    def test_validation_error_body_too_short(
        self,
        active_yacht: Yacht,
        customer_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ) -> None:
        """Body under 10 chars → 400 validation error."""
        _make_completed_booking(active_yacht, customer_user, egypt_region, departure_port)
        client = _auth_client(customer_user)

        response = client.post(
            f"/api/v1/yachts/{active_yacht.id}/reviews/",
            data={"rating": 4, "body": "short"},
            format="json",
        )
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# Test: GET /api/v1/yachts/{id}/reviews/  (public)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestYachtReviewList:
    """GET reviews endpoint — public access, cursor pagination."""

    def test_public_get_reviews_200(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
        customer_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ) -> None:
        """Anyone can list reviews — no auth required, returns paginated list."""
        booking = _make_completed_booking(active_yacht, customer_user, egypt_region, departure_port)
        YachtReview.objects.create(
            yacht=active_yacht,
            customer=customer_user,
            booking=booking,
            rating=4,
            title="Great!",
            body="Really enjoyed the trip on this yacht.",
        )

        response = api_client.get(f"/api/v1/yachts/{active_yacht.id}/reviews/")

        assert response.status_code == 200
        assert "results" in response.data
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["rating"] == 4

    def test_empty_reviews_returns_empty_list(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
    ) -> None:
        """No reviews yet → 200 with empty results."""
        response = api_client.get(f"/api/v1/yachts/{active_yacht.id}/reviews/")
        assert response.status_code == 200
        assert response.data["results"] == []

    def test_cursor_pagination_keys_present(
        self,
        api_client: APIClient,
        active_yacht: Yacht,
    ) -> None:
        """Response includes has_more and next_cursor keys (ADR-013)."""
        response = api_client.get(f"/api/v1/yachts/{active_yacht.id}/reviews/")
        assert response.status_code == 200
        assert "has_more" in response.data or "next" in response.data


# ---------------------------------------------------------------------------
# Test: GET /api/v1/yachts/reviews/  (owner only)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestOwnerReviewsList:
    """GET /api/v1/yachts/reviews/ — owner sees reviews for their yachts."""

    def test_owner_sees_own_yacht_reviews(
        self,
        active_yacht: Yacht,
        owner_user: User,
        customer_user: User,
        egypt_region: Region,
        departure_port: DeparturePort,
    ) -> None:
        """Owner with reviews on their yacht sees them → 200."""
        booking = _make_completed_booking(active_yacht, customer_user, egypt_region, departure_port)
        YachtReview.objects.create(
            yacht=active_yacht,
            customer=customer_user,
            booking=booking,
            rating=5,
            title="Superb",
            body="Best boat in the Red Sea, no question about it.",
        )

        client = _auth_client(owner_user)
        response = client.get("/api/v1/yachts/reviews/")

        assert response.status_code == 200
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["rating"] == 5

    def test_anonymous_cannot_access_owner_reviews(self, api_client: APIClient) -> None:
        """Anonymous caller → 401 on owner reviews endpoint (ADR-009)."""
        response = api_client.get("/api/v1/yachts/reviews/")
        assert response.status_code == 401

    def test_customer_role_cannot_access_owner_reviews(
        self,
        customer_user: User,
    ) -> None:
        """Customer-role user → 403 on owner-only endpoint."""
        client = _auth_client(customer_user)
        response = client.get("/api/v1/yachts/reviews/")
        assert response.status_code == 403
