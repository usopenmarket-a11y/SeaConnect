"""End-to-end workflow tests for the competition lifecycle.

Walks through complete user journeys via HTTP calls against a real test DB.
No DB mocking — ADR rule (mocks caused prod incidents).

Journeys covered:
  1. Admin creates a competition; two customers register; customer submits catch
  2. Capacity guard (max_participants=1)
  3. Closed-competition guard
  4. My-entries journey across multiple competitions
  5. Permission guards (anonymous → 401, non-staff create → 405/403)
"""
from __future__ import annotations

import datetime
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.competitions.models import Competition, CompetitionEntry
from apps.core.models import DeparturePort, Region
from apps.weather.models import FishingSpecies


# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------

COMP_LIST_URL = "/api/v1/competitions/"
MY_ENTRIES_URL = "/api/v1/competitions/my-entries/"


def _enter_url(comp_id) -> str:
    return f"/api/v1/competitions/{comp_id}/enter/"


def _leaderboard_url(comp_id) -> str:
    return f"/api/v1/competitions/{comp_id}/leaderboard/"


def _catches_url(entry_id) -> str:
    return f"/api/v1/competitions/entries/{entry_id}/catches/"


# ---------------------------------------------------------------------------
# Object builders (never Model.objects.create in test bodies)
# ---------------------------------------------------------------------------


def _region(code: str = "EG") -> Region:
    region, _ = Region.objects.get_or_create(
        code=code,
        defaults={
            "name_ar": "مصر",
            "name_en": "Egypt",
            "currency": "EGP",
            "timezone": "Africa/Cairo",
            "is_active": True,
        },
    )
    return region


def _user(email: str, role: str = UserRole.CUSTOMER, region: Region | None = None) -> User:
    if region is None:
        region = _region()
    return User.objects.create_user(
        email=email,
        password="TestPass123!",
        first_name=email.split("@")[0].title(),
        last_name="Test",
        role=role,
        region=region,
    )


def _admin_user(email: str = "workflow-admin@test.com", region: Region | None = None) -> User:
    if region is None:
        region = _region()
    return User.objects.create_user(
        email=email,
        password="TestPass123!",
        first_name="Workflow",
        last_name="Admin",
        role=UserRole.ADMIN,
        is_staff=True,
        region=region,
    )


def _competition(
    region: Region,
    created_by: User,
    *,
    status: str = Competition.Status.OPEN,
    max_participants: int = 10,
    deadline_delta_days: int = 7,
) -> Competition:
    now = datetime.datetime.now(tz=datetime.timezone.utc)
    return Competition.objects.create(
        title="بطولة الصيد البحري",
        title_en="Sea Fishing Tournament",
        description="Annual open-water fishing event.",
        region=region,
        start_date=(now + datetime.timedelta(days=10)).date(),
        end_date=(now + datetime.timedelta(days=12)).date(),
        registration_deadline=now + datetime.timedelta(days=deadline_delta_days),
        entry_fee=Decimal("100.00"),
        prize_pool=Decimal("10000.00"),
        max_participants=max_participants,
        status=status,
        rules="Heaviest total catch wins.",
        created_by=created_by,
    )


def _entry(
    competition: Competition,
    user: User,
    *,
    status: str = CompetitionEntry.Status.REGISTERED,
) -> CompetitionEntry:
    return CompetitionEntry.objects.create(
        competition=competition,
        user=user,
        status=status,
    )


def _species(name: str = "Sea Bass", name_ar: str = "قاروص") -> FishingSpecies:
    obj, _ = FishingSpecies.objects.get_or_create(
        name=name,
        defaults={"name_ar": name_ar, "scientific_name": "Dicentrarchus labrax"},
    )
    return obj


def _catch_payload(species: FishingSpecies) -> dict:
    return {
        "species": str(species.id),
        "weight_kg": "2.750",
        "caught_at": "2026-06-15T08:00:00Z",
        "photo_url": "https://cdn.example.com/catch.jpg",
    }


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def eg_region(db) -> Region:
    return _region()


@pytest.fixture
def admin(db, eg_region) -> User:
    return _admin_user(region=eg_region)


@pytest.fixture
def customer_a(db, eg_region) -> User:
    return _user("wf_customer_a@test.com", region=eg_region)


@pytest.fixture
def customer_b(db, eg_region) -> User:
    return _user("wf_customer_b@test.com", region=eg_region)


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def open_competition(db, eg_region, admin) -> Competition:
    return _competition(eg_region, admin, max_participants=10)


@pytest.fixture
def sea_bass(db) -> FishingSpecies:
    return _species()


# ---------------------------------------------------------------------------
# 1. Happy path — register and submit catch
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCompetitionRegisterAndCatchWorkflow:
    """Full workflow: admin creates → two customers enter → leaderboard → catch submit."""

    def test_happy_path_two_customers_register_and_submit_catch(
        self, api_client, eg_region, admin, customer_a, customer_b, sea_bass
    ):
        # Step 1: Create competition (direct via ORM — no create endpoint in the API)
        comp = _competition(eg_region, admin, max_participants=10)

        # Step 2: Customer A registers
        api_client.force_authenticate(customer_a)
        resp = api_client.post(_enter_url(comp.id))
        assert resp.status_code == 201, f"Expected 201 got {resp.status_code}: {resp.data}"
        assert resp.data["status"] == CompetitionEntry.Status.REGISTERED
        entry_a_id = resp.data["id"]

        # Verify DB row
        assert CompetitionEntry.objects.filter(
            competition=comp, user=customer_a, status=CompetitionEntry.Status.REGISTERED
        ).exists()

        # Step 3: Customer B registers
        api_client.force_authenticate(customer_b)
        resp = api_client.post(_enter_url(comp.id))
        assert resp.status_code == 201
        assert resp.data["status"] == CompetitionEntry.Status.REGISTERED

        # Step 4: Promote both to CONFIRMED so leaderboard shows them
        CompetitionEntry.objects.filter(competition=comp).update(
            status=CompetitionEntry.Status.CONFIRMED
        )

        # Step 5: Leaderboard returns both confirmed entries (weight=0 until catch)
        api_client.force_authenticate(None)
        resp = api_client.get(_leaderboard_url(comp.id))
        assert resp.status_code == 200
        assert "results" in resp.data
        assert str(resp.data["competition_id"]) == str(comp.id)
        # Both confirmed entries appear on the leaderboard
        user_names = {r["user_name"] for r in resp.data["results"]}
        assert len(user_names) == 2

        # Step 6: Customer A submits a catch log
        api_client.force_authenticate(customer_a)
        resp = api_client.post(_catches_url(entry_a_id), _catch_payload(sea_bass), format="json")
        assert resp.status_code == 201, f"Expected 201 got {resp.status_code}: {resp.data}"
        assert resp.data["weight_kg"] == "2.750"
        assert resp.data["verified"] is False

        # Step 7: Customer A tries to register again → ALREADY_ENTERED
        resp = api_client.post(_enter_url(comp.id))
        assert resp.status_code == 400
        assert resp.data["error"]["code"] == "ALREADY_ENTERED"

    def test_happy_path_entry_response_has_required_fields(
        self, api_client, open_competition, customer_a
    ):
        api_client.force_authenticate(customer_a)
        resp = api_client.post(_enter_url(open_competition.id))
        assert resp.status_code == 201
        for field in ("id", "competition", "status", "user"):
            assert field in resp.data, f"Missing field '{field}' in entry response"

    def test_happy_path_catch_verified_defaults_false(
        self, api_client, eg_region, admin, customer_a, sea_bass
    ):
        comp = _competition(eg_region, admin)
        entry = _entry(comp, customer_a, status=CompetitionEntry.Status.CONFIRMED)

        api_client.force_authenticate(customer_a)
        resp = api_client.post(_catches_url(entry.id), _catch_payload(sea_bass), format="json")
        assert resp.status_code == 201
        assert resp.data["verified"] is False


# ---------------------------------------------------------------------------
# 2. Capacity guard — max_participants=1
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCompetitionCapacityGuard:
    """Competition with max_participants=1 rejects the second registrant."""

    def test_sad_competition_full_returns_400(
        self, api_client, eg_region, admin, customer_a, customer_b
    ):
        comp = _competition(eg_region, admin, max_participants=1)

        # Pre-fill with one confirmed entry for customer_a
        _entry(comp, customer_a, status=CompetitionEntry.Status.CONFIRMED)

        # Customer B should be rejected
        api_client.force_authenticate(customer_b)
        resp = api_client.post(_enter_url(comp.id))
        assert resp.status_code == 400
        assert resp.data["error"]["code"] == "COMP_FULL"

    def test_sad_comp_full_does_not_create_entry(
        self, api_client, eg_region, admin, customer_a, customer_b
    ):
        comp = _competition(eg_region, admin, max_participants=1)
        _entry(comp, customer_a, status=CompetitionEntry.Status.CONFIRMED)
        count_before = CompetitionEntry.objects.filter(competition=comp).count()

        api_client.force_authenticate(customer_b)
        api_client.post(_enter_url(comp.id))

        count_after = CompetitionEntry.objects.filter(competition=comp).count()
        assert count_after == count_before

    def test_happy_first_participant_enters_full_comp_slot(
        self, api_client, eg_region, admin, customer_a
    ):
        """max_participants=1 allows exactly 1 registered entry to be created."""
        comp = _competition(eg_region, admin, max_participants=1)

        api_client.force_authenticate(customer_a)
        resp = api_client.post(_enter_url(comp.id))
        # No confirmed entries yet — capacity is not yet exhausted
        assert resp.status_code == 201


# ---------------------------------------------------------------------------
# 3. Closed competition guard
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestClosedCompetitionGuard:
    """A closed/draft competition must reject new entries."""

    def test_sad_closed_competition_returns_400(
        self, api_client, eg_region, admin, customer_a
    ):
        comp = _competition(eg_region, admin, status=Competition.Status.CLOSED)
        api_client.force_authenticate(customer_a)
        resp = api_client.post(_enter_url(comp.id))
        assert resp.status_code == 400
        assert resp.data["error"]["code"] == "COMP_NOT_OPEN"

    def test_sad_draft_competition_returns_comp_not_open(
        self, api_client, eg_region, admin, customer_a
    ):
        comp = _competition(eg_region, admin, status=Competition.Status.DRAFT)
        api_client.force_authenticate(customer_a)
        resp = api_client.post(_enter_url(comp.id))
        assert resp.status_code == 400
        assert resp.data["error"]["code"] == "COMP_NOT_OPEN"

    def test_sad_completed_competition_returns_comp_not_open(
        self, api_client, eg_region, admin, customer_a
    ):
        comp = _competition(eg_region, admin, status=Competition.Status.COMPLETED)
        api_client.force_authenticate(customer_a)
        resp = api_client.post(_enter_url(comp.id))
        assert resp.status_code == 400
        assert resp.data["error"]["code"] == "COMP_NOT_OPEN"

    def test_sad_closed_competition_no_entry_created(
        self, api_client, eg_region, admin, customer_a
    ):
        comp = _competition(eg_region, admin, status=Competition.Status.CLOSED)
        api_client.force_authenticate(customer_a)
        api_client.post(_enter_url(comp.id))
        assert not CompetitionEntry.objects.filter(competition=comp, user=customer_a).exists()


# ---------------------------------------------------------------------------
# 4. My-entries journey across multiple competitions
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestMyEntriesWorkflow:
    """Customer registers for two competitions; my-entries returns both."""

    def test_happy_my_entries_returns_both_competitions(
        self, api_client, eg_region, admin, customer_a
    ):
        comp1 = _competition(eg_region, admin, max_participants=10)
        comp2 = _competition(eg_region, admin, max_participants=10)

        api_client.force_authenticate(customer_a)
        api_client.post(_enter_url(comp1.id))
        api_client.post(_enter_url(comp2.id))

        resp = api_client.get(MY_ENTRIES_URL)
        assert resp.status_code == 200
        assert "results" in resp.data
        comp_ids = {str(e["competition"]) for e in resp.data["results"]}
        assert str(comp1.id) in comp_ids
        assert str(comp2.id) in comp_ids
        assert len(comp_ids) == 2

    def test_happy_my_entries_count_matches(
        self, api_client, eg_region, admin, customer_a
    ):
        comp1 = _competition(eg_region, admin, max_participants=5)
        comp2 = _competition(eg_region, admin, max_participants=5)

        api_client.force_authenticate(customer_a)
        api_client.post(_enter_url(comp1.id))
        api_client.post(_enter_url(comp2.id))

        resp = api_client.get(MY_ENTRIES_URL)
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2

    def test_sad_my_entries_anonymous_returns_401(self, api_client):
        resp = api_client.get(MY_ENTRIES_URL)
        assert resp.status_code == 401

    def test_happy_my_entries_scoped_to_requesting_user(
        self, api_client, eg_region, admin, customer_a, customer_b
    ):
        """Customer A cannot see Customer B's entries."""
        comp = _competition(eg_region, admin)
        _entry(comp, customer_b)

        api_client.force_authenticate(customer_a)
        resp = api_client.get(MY_ENTRIES_URL)
        assert resp.status_code == 200
        # customer_a has no entries; customer_b's entry must not appear
        assert len(resp.data["results"]) == 0

    def test_happy_my_entries_empty_when_no_registrations(
        self, api_client, customer_a
    ):
        api_client.force_authenticate(customer_a)
        resp = api_client.get(MY_ENTRIES_URL)
        assert resp.status_code == 200
        assert resp.data["results"] == []


# ---------------------------------------------------------------------------
# 5. Permission guards
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCompetitionPermissionGuards:
    """Auth and role checks across competition endpoints."""

    def test_sad_anonymous_enter_returns_401(self, api_client, open_competition):
        resp = api_client.post(_enter_url(open_competition.id))
        assert resp.status_code == 401

    def test_sad_anonymous_catch_returns_401(self, api_client, eg_region, admin, customer_a, sea_bass):
        comp = _competition(eg_region, admin)
        entry = _entry(comp, customer_a, status=CompetitionEntry.Status.CONFIRMED)
        resp = api_client.post(_catches_url(entry.id), _catch_payload(sea_bass), format="json")
        assert resp.status_code == 401

    def test_happy_leaderboard_is_public(self, api_client, open_competition):
        """Leaderboard does not require authentication."""
        resp = api_client.get(_leaderboard_url(open_competition.id))
        assert resp.status_code == 200

    def test_happy_competition_list_is_public(self, api_client, open_competition):
        """List endpoint does not require authentication."""
        resp = api_client.get(COMP_LIST_URL)
        assert resp.status_code == 200
        assert "results" in resp.data

    def test_sad_wrong_user_catch_returns_404(
        self, api_client, eg_region, admin, customer_a, customer_b, sea_bass
    ):
        """Customer B cannot add a catch to Customer A's entry."""
        comp = _competition(eg_region, admin)
        entry_a = _entry(comp, customer_a, status=CompetitionEntry.Status.CONFIRMED)

        api_client.force_authenticate(customer_b)
        resp = api_client.post(_catches_url(entry_a.id), _catch_payload(sea_bass), format="json")
        assert resp.status_code == 404

    def test_sad_competition_create_via_api_not_available(self, api_client, admin):
        """There is no POST /api/v1/competitions/ endpoint — CompetitionListView is GET-only."""
        api_client.force_authenticate(admin)
        resp = api_client.post(COMP_LIST_URL, data={"title": "test"}, format="json")
        # The list view only exposes GET; POST returns 405 Method Not Allowed
        assert resp.status_code == 405

    def test_sad_missing_required_catch_fields_returns_400(
        self, api_client, eg_region, admin, customer_a, sea_bass
    ):
        """Submitting a catch without required weight_kg returns 400."""
        comp = _competition(eg_region, admin)
        entry = _entry(comp, customer_a, status=CompetitionEntry.Status.CONFIRMED)

        api_client.force_authenticate(customer_a)
        # Missing weight_kg
        resp = api_client.post(
            _catches_url(entry.id),
            {"species": str(sea_bass.id), "caught_at": "2026-06-15T08:00:00Z"},
            format="json",
        )
        assert resp.status_code == 400

    def test_sad_already_entered_double_registration_returns_400(
        self, api_client, open_competition, customer_a
    ):
        """Second identical POST from the same user returns ALREADY_ENTERED."""
        api_client.force_authenticate(customer_a)
        api_client.post(_enter_url(open_competition.id))
        resp = api_client.post(_enter_url(open_competition.id))
        assert resp.status_code == 400
        assert resp.data["error"]["code"] == "ALREADY_ENTERED"


# ---------------------------------------------------------------------------
# 6. Leaderboard — only confirmed entries appear
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestLeaderboardWorkflow:
    """Leaderboard reflects only CONFIRMED entries, sorted by total weight."""

    def test_happy_leaderboard_shows_confirmed_only(
        self, api_client, eg_region, admin, customer_a, customer_b, sea_bass
    ):
        comp = _competition(eg_region, admin)

        # customer_a: confirmed with a catch
        entry_a = _entry(comp, customer_a, status=CompetitionEntry.Status.CONFIRMED)
        CompetitionEntry.objects.filter(id=entry_a.id).update(
            status=CompetitionEntry.Status.CONFIRMED
        )
        # customer_b: registered only — must not appear
        _entry(comp, customer_b, status=CompetitionEntry.Status.REGISTERED)

        from apps.competitions.models import CatchLog

        CatchLog.objects.create(
            entry=entry_a,
            species=sea_bass,
            weight_kg=Decimal("3.500"),
            caught_at=datetime.datetime.now(tz=datetime.timezone.utc),
        )

        resp = api_client.get(_leaderboard_url(comp.id))
        assert resp.status_code == 200
        user_names = [r["user_name"] for r in resp.data["results"]]
        # customer_a's name should appear; customer_b should not
        assert customer_a.full_name in user_names or customer_a.email in user_names
        registered_name = customer_b.full_name or customer_b.email
        assert registered_name not in user_names

    def test_happy_leaderboard_empty_with_no_confirmed_entries(
        self, api_client, open_competition
    ):
        resp = api_client.get(_leaderboard_url(open_competition.id))
        assert resp.status_code == 200
        assert resp.data["results"] == []
