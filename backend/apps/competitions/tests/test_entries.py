"""Sprint 13E integration tests — competition registration and results flow.

Tests cover:
  - RegisterView   POST /api/v1/competitions/<id>/register/
  - ResultsView    GET  /api/v1/competitions/<id>/results/
  - MyEntryView    GET  /api/v1/competitions/<id>/my-entry/

Rules:
  - Real PostgreSQL test DB — no DB mocking (ADR rule)
  - @pytest.mark.django_db on every test touching the DB
  - APIClient (DRF) for all HTTP calls
  - All test data created via helper functions — no Model.objects.create in test bodies
"""
import datetime
import uuid
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.competitions.models import CatchLog, Competition, CompetitionEntry
from apps.core.models import DeparturePort, Region
from apps.weather.models import FishingSpecies


# ---------------------------------------------------------------------------
# URL builders
# ---------------------------------------------------------------------------


def _register_url(comp_id) -> str:
    return f"/api/v1/competitions/{comp_id}/register/"


def _results_url(comp_id) -> str:
    return f"/api/v1/competitions/{comp_id}/results/"


def _my_entry_url(comp_id) -> str:
    return f"/api/v1/competitions/{comp_id}/my-entry/"


# ---------------------------------------------------------------------------
# Object builders
# ---------------------------------------------------------------------------


def _make_region(code: str = "EG", currency: str = "EGP") -> Region:
    region, _ = Region.objects.get_or_create(
        code=code,
        defaults={
            "name_ar": "مصر",
            "name_en": "Egypt",
            "currency": currency,
            "timezone": "Africa/Cairo",
            "is_active": True,
        },
    )
    return region


def _make_user(email: str, role: str = UserRole.CUSTOMER, region: Region | None = None) -> User:
    if region is None:
        region = _make_region()
    prefix = email.split("@")[0].replace("_", " ").title()
    return User.objects.create_user(
        email=email,
        password="TestPass123!",
        first_name=prefix,
        last_name="",
        role=role,
        region=region,
    )


def _make_competition(
    region: Region,
    created_by: User,
    *,
    status: str = Competition.Status.OPEN,
    max_participants: int = 100,
    deadline_offset_days: int = 7,
    end_date_offset_days: int = 30,
) -> Competition:
    now = datetime.datetime.now(tz=datetime.timezone.utc)
    return Competition.objects.create(
        title="بطولة صيد البحر الأحمر",
        title_en="Red Sea Fishing Tournament",
        region=region,
        start_date=(now + datetime.timedelta(days=5)).date(),
        end_date=(now + datetime.timedelta(days=end_date_offset_days)).date(),
        registration_deadline=now + datetime.timedelta(days=deadline_offset_days),
        entry_fee=Decimal("500.00"),
        prize_pool=Decimal("50000.00"),
        max_participants=max_participants,
        status=status,
        rules="Standard competition rules.",
        created_by=created_by,
    )


def _make_entry(
    competition: Competition,
    user: User,
    status: str = CompetitionEntry.Status.REGISTERED,
    catch_weight: str | None = None,
    rank: int | None = None,
) -> CompetitionEntry:
    return CompetitionEntry.objects.create(
        competition=competition,
        user=user,
        status=status,
        catch_weight=Decimal(catch_weight) if catch_weight else None,
        rank=rank,
    )


def _make_species(name: str = "Sea Bass", name_ar: str = "قاروص") -> FishingSpecies:
    return FishingSpecies.objects.create(
        name=name,
        name_ar=name_ar,
        scientific_name="Dicentrarchus labrax",
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def region(db) -> Region:
    return _make_region()


@pytest.fixture
def admin_user(db, region) -> User:
    return _make_user("admin13e@test.com", role=UserRole.ADMIN, region=region)


@pytest.fixture
def customer_a(db, region) -> User:
    return _make_user("customer_a13e@test.com", role=UserRole.CUSTOMER, region=region)


@pytest.fixture
def customer_b(db, region) -> User:
    return _make_user("customer_b13e@test.com", role=UserRole.CUSTOMER, region=region)


@pytest.fixture
def open_competition(db, region, admin_user) -> Competition:
    return _make_competition(region, admin_user, status=Competition.Status.OPEN)


@pytest.fixture
def ended_competition(db, region, admin_user) -> Competition:
    """Competition whose end_date is in the past."""
    return _make_competition(
        region,
        admin_user,
        status=Competition.Status.COMPLETED,
        deadline_offset_days=-10,
        end_date_offset_days=-1,  # ended yesterday
    )


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


# ---------------------------------------------------------------------------
# RegisterView — POST /api/v1/competitions/<id>/register/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRegisterView:
    """POST /api/v1/competitions/<id>/register/"""

    def test_happy_path_authenticated_user_registers(
        self, api_client, customer_a, open_competition
    ):
        """Authenticated user registers → 201, entry created with status REGISTERED."""
        api_client.force_authenticate(customer_a)
        response = api_client.post(_register_url(open_competition.id))

        assert response.status_code == 201
        assert response.data["status"] == CompetitionEntry.Status.REGISTERED
        assert CompetitionEntry.objects.filter(
            competition=open_competition,
            user=customer_a,
        ).exists()

    def test_permission_denied_anonymous(self, api_client, open_competition):
        """Unauthenticated POST returns 401."""
        response = api_client.post(_register_url(open_competition.id))
        assert response.status_code == 401

    def test_duplicate_registration_returns_409(
        self, api_client, customer_a, open_competition
    ):
        """Registering twice returns 409 ALREADY_REGISTERED."""
        api_client.force_authenticate(customer_a)
        api_client.post(_register_url(open_competition.id))
        response = api_client.post(_register_url(open_competition.id))

        assert response.status_code == 409
        assert response.data["code"] == "ALREADY_REGISTERED"

    def test_registration_closed_when_status_not_open(
        self, api_client, region, admin_user, customer_a
    ):
        """Competition with status other than OPEN returns 400 REGISTRATION_CLOSED."""
        closed_comp = _make_competition(
            region, admin_user, status=Competition.Status.CLOSED
        )
        api_client.force_authenticate(customer_a)
        response = api_client.post(_register_url(closed_comp.id))

        assert response.status_code == 400
        assert response.data["code"] == "REGISTRATION_CLOSED"

    def test_registration_closed_when_deadline_passed(
        self, api_client, region, admin_user, customer_a
    ):
        """Deadline in the past returns 400 REGISTRATION_CLOSED."""
        past_deadline_comp = _make_competition(
            region, admin_user, deadline_offset_days=-1
        )
        api_client.force_authenticate(customer_a)
        response = api_client.post(_register_url(past_deadline_comp.id))

        assert response.status_code == 400
        assert response.data["code"] == "REGISTRATION_CLOSED"

    def test_competition_full_returns_400(
        self, api_client, region, admin_user, customer_a, customer_b
    ):
        """Competition at max capacity returns 400 COMPETITION_FULL."""
        full_comp = _make_competition(region, admin_user, max_participants=1)
        _make_entry(full_comp, customer_b, status=CompetitionEntry.Status.CONFIRMED)

        api_client.force_authenticate(customer_a)
        response = api_client.post(_register_url(full_comp.id))

        assert response.status_code == 400
        assert response.data["code"] == "COMPETITION_FULL"

    def test_404_for_nonexistent_competition(self, api_client, customer_a):
        """POST to non-existent UUID returns 404."""
        api_client.force_authenticate(customer_a)
        response = api_client.post(_register_url(uuid.uuid4()))
        assert response.status_code == 404

    def test_response_shape_matches_my_entry_serializer(
        self, api_client, customer_a, open_competition
    ):
        """201 response includes id, competition, status, and user fields."""
        api_client.force_authenticate(customer_a)
        response = api_client.post(_register_url(open_competition.id))

        assert response.status_code == 201
        for field in ("id", "competition", "status", "user"):
            assert field in response.data, f"Missing field: {field}"


# ---------------------------------------------------------------------------
# ResultsView — GET /api/v1/competitions/<id>/results/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestResultsView:
    """GET /api/v1/competitions/<id>/results/"""

    def test_results_public_access_returns_200(
        self, api_client, ended_competition
    ):
        """Unauthenticated GET on an ended competition returns 200."""
        response = api_client.get(_results_url(ended_competition.id))
        assert response.status_code == 200

    def test_upcoming_competition_returns_upcoming_status(
        self, api_client, open_competition
    ):
        """Competition that has not ended returns status='upcoming' with empty results."""
        response = api_client.get(_results_url(open_competition.id))
        assert response.status_code == 200
        assert response.data["status"] == "upcoming"
        assert response.data["results"] == []

    def test_ended_competition_returns_completed_status(
        self, api_client, ended_competition
    ):
        """Ended competition returns status='completed'."""
        response = api_client.get(_results_url(ended_competition.id))
        assert response.status_code == 200
        assert response.data["status"] == "completed"

    def test_results_ordered_by_rank_then_catch_weight(
        self, api_client, region, admin_user, customer_a, customer_b
    ):
        """Results ordered by rank (asc, nulls last) then catch_weight (desc)."""
        comp = _make_competition(
            region,
            admin_user,
            status=Competition.Status.COMPLETED,
            deadline_offset_days=-10,
            end_date_offset_days=-1,
        )
        _make_entry(
            comp, customer_a,
            status=CompetitionEntry.Status.CONFIRMED,
            catch_weight="5.00",
            rank=1,
        )
        _make_entry(
            comp, customer_b,
            status=CompetitionEntry.Status.CONFIRMED,
            catch_weight="3.50",
            rank=2,
        )

        response = api_client.get(_results_url(comp.id))
        assert response.status_code == 200
        results = response.data["results"]
        assert len(results) == 2
        assert results[0]["rank"] == 1
        assert results[1]["rank"] == 2

    def test_withdrawn_entries_excluded_from_results(
        self, api_client, region, admin_user, customer_a, customer_b
    ):
        """Withdrawn entries are excluded from the results list."""
        comp = _make_competition(
            region,
            admin_user,
            status=Competition.Status.COMPLETED,
            deadline_offset_days=-10,
            end_date_offset_days=-1,
        )
        _make_entry(comp, customer_a, status=CompetitionEntry.Status.CONFIRMED)
        _make_entry(comp, customer_b, status=CompetitionEntry.Status.WITHDRAWN)

        response = api_client.get(_results_url(comp.id))
        assert response.status_code == 200
        user_ids = [str(r["id"]) for r in response.data["results"]]
        # Only customer_a should appear — customer_b was withdrawn
        assert len(user_ids) == 1

    def test_404_for_nonexistent_competition(self, api_client):
        """Non-existent UUID returns 404."""
        response = api_client.get(_results_url(uuid.uuid4()))
        assert response.status_code == 404

    def test_results_response_includes_competition_id(
        self, api_client, ended_competition
    ):
        """Response always contains competition_id field."""
        response = api_client.get(_results_url(ended_competition.id))
        assert response.status_code == 200
        assert str(response.data["competition_id"]) == str(ended_competition.id)


# ---------------------------------------------------------------------------
# MyEntryView — GET /api/v1/competitions/<id>/my-entry/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestMyEntryView:
    """GET /api/v1/competitions/<id>/my-entry/"""

    def test_my_entry_requires_authentication(self, api_client, open_competition):
        """Unauthenticated GET returns 401."""
        response = api_client.get(_my_entry_url(open_competition.id))
        assert response.status_code == 401

    def test_my_entry_returns_404_when_not_registered(
        self, api_client, customer_a, open_competition
    ):
        """User who hasn't registered gets 404."""
        api_client.force_authenticate(customer_a)
        response = api_client.get(_my_entry_url(open_competition.id))
        assert response.status_code == 404

    def test_my_entry_returns_users_own_entry(
        self, api_client, region, admin_user, customer_a, customer_b
    ):
        """Authenticated user retrieves their own entry, not another user's."""
        comp = _make_competition(region, admin_user)
        entry_a = _make_entry(comp, customer_a)
        _make_entry(comp, customer_b)  # customer_b's entry must not be returned

        api_client.force_authenticate(customer_a)
        response = api_client.get(_my_entry_url(comp.id))

        assert response.status_code == 200
        assert str(response.data["id"]) == str(entry_a.id)
        assert str(response.data["user"]) == str(customer_a.id)

    def test_my_entry_response_shape(
        self, api_client, customer_a, open_competition
    ):
        """Response includes expected fields from MyEntrySerializer."""
        _make_entry(open_competition, customer_a)
        api_client.force_authenticate(customer_a)
        response = api_client.get(_my_entry_url(open_competition.id))

        assert response.status_code == 200
        for field in ("id", "competition", "competition_title", "status", "user", "created_at"):
            assert field in response.data, f"Missing field: {field}"

    def test_my_entry_404_for_nonexistent_competition(self, api_client, customer_a):
        """Non-existent competition UUID returns 404."""
        api_client.force_authenticate(customer_a)
        response = api_client.get(_my_entry_url(uuid.uuid4()))
        assert response.status_code == 404
