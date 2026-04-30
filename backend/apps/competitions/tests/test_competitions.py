"""Competitions app integration tests — Sprint 6.

Tests cover:
  - CompetitionListView  (public listing, status filter, region filter, entry_count annotation)
  - CompetitionDetailView (full detail, 404 for non-existent UUID)
  - CompetitionEnterView  (auth required, happy path, double-enter, closed comp,
                           deadline passed, comp full)
  - LeaderboardView       (public ranking sorted by total_weight, confirmed-only)
  - MyEntriesView         (auth required, scoped to current user)
  - CatchLogCreateView    (entry owner can post, other user gets 404)

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
# URL constants — mirrors apps/competitions/urls.py
# ---------------------------------------------------------------------------

COMP_LIST_URL = "/api/v1/competitions/"
MY_ENTRIES_URL = "/api/v1/competitions/my-entries/"


def _comp_detail_url(comp_id) -> str:
    return f"/api/v1/competitions/{comp_id}/"


def _comp_enter_url(comp_id) -> str:
    return f"/api/v1/competitions/{comp_id}/enter/"


def _comp_leaderboard_url(comp_id) -> str:
    return f"/api/v1/competitions/{comp_id}/leaderboard/"


def _catch_create_url(entry_id) -> str:
    return f"/api/v1/competitions/entries/{entry_id}/catches/"


# ---------------------------------------------------------------------------
# Object builders — no Model.objects.create in test bodies
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


def _make_port(region: Region, name_en: str = "Hurghada Marina") -> DeparturePort:
    port, _ = DeparturePort.objects.get_or_create(
        name_en=name_en,
        defaults={
            "name_ar": "مرسى الغردقة",
            "region": region,
            "city_en": "Hurghada",
            "city_ar": "الغردقة",
            "latitude": Decimal("27.257400"),
            "longitude": Decimal("33.811600"),
            "is_active": True,
        },
    )
    return port


def _make_competition(
    region: Region,
    created_by: User,
    *,
    status: str = Competition.Status.OPEN,
    max_participants: int = 100,
    deadline_offset_days: int = 7,
    departure_port: DeparturePort | None = None,
) -> Competition:
    """Create a Competition with sensible defaults for testing."""
    now = datetime.datetime.now(tz=datetime.timezone.utc)
    return Competition.objects.create(
        title="بطولة الصيد",
        title_en="Fishing Tournament",
        region=region,
        departure_port=departure_port,
        start_date=(now + datetime.timedelta(days=10)).date(),
        end_date=(now + datetime.timedelta(days=12)).date(),
        registration_deadline=now + datetime.timedelta(days=deadline_offset_days),
        entry_fee=Decimal("500.00"),
        prize_pool=Decimal("50000.00"),
        max_participants=max_participants,
        status=status,
        rules="Standard competition rules apply.",
        created_by=created_by,
    )


def _make_entry(
    competition: Competition,
    user: User,
    status: str = CompetitionEntry.Status.REGISTERED,
) -> CompetitionEntry:
    return CompetitionEntry.objects.create(
        competition=competition,
        user=user,
        status=status,
    )


def _make_species(name: str = "Sea Bass", name_ar: str = "قاروص") -> FishingSpecies:
    return FishingSpecies.objects.create(
        name=name,
        name_ar=name_ar,
        scientific_name="Dicentrarchus labrax",
    )


def _make_catch(
    entry: CompetitionEntry,
    species: FishingSpecies,
    weight_kg: str = "2.500",
    verified: bool = False,
) -> CatchLog:
    return CatchLog.objects.create(
        entry=entry,
        species=species,
        weight_kg=Decimal(weight_kg),
        caught_at=datetime.datetime.now(tz=datetime.timezone.utc),
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def region(db) -> Region:
    return _make_region()


@pytest.fixture
def admin_user(db, region) -> User:
    return _make_user("admin@test.com", role=UserRole.ADMIN, region=region)


@pytest.fixture
def customer_a(db, region) -> User:
    return _make_user("customer_a@test.com", role=UserRole.CUSTOMER, region=region)


@pytest.fixture
def customer_b(db, region) -> User:
    return _make_user("customer_b@test.com", role=UserRole.CUSTOMER, region=region)


@pytest.fixture
def open_competition(db, region, admin_user) -> Competition:
    return _make_competition(region, admin_user, status=Competition.Status.OPEN)


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def auth_client_a(api_client, customer_a) -> APIClient:
    api_client.force_authenticate(customer_a)
    return api_client


# ---------------------------------------------------------------------------
# CompetitionListView — GET /api/v1/competitions/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCompetitionList:
    """GET /api/v1/competitions/"""

    def test_competition_list_public(self, api_client, open_competition):
        """Unauthenticated GET returns 200 with a results list."""
        response = api_client.get(COMP_LIST_URL)
        assert response.status_code == 200
        assert "results" in response.data
        ids = [str(c["id"]) for c in response.data["results"]]
        assert str(open_competition.id) in ids

    def test_competition_list_filter_status(self, api_client, region, admin_user):
        """?status=open returns only competitions with status='open'."""
        open_comp = _make_competition(region, admin_user, status=Competition.Status.OPEN)
        draft_comp = _make_competition(region, admin_user, status=Competition.Status.DRAFT)

        response = api_client.get(COMP_LIST_URL, {"status": "open"})
        assert response.status_code == 200
        ids = [str(c["id"]) for c in response.data["results"]]
        assert str(open_comp.id) in ids
        assert str(draft_comp.id) not in ids

    def test_competition_list_filter_region(self, api_client, region, admin_user):
        """?region=<id> returns only competitions in that region."""
        other_region = Region.objects.create(
            code="AE",
            name_ar="الإمارات",
            name_en="UAE",
            currency="AED",
            timezone="Asia/Dubai",
            is_active=True,
        )
        other_admin = _make_user("uae_admin@test.com", role=UserRole.ADMIN, region=other_region)

        eg_comp = _make_competition(region, admin_user)
        ae_comp = _make_competition(other_region, other_admin)

        response = api_client.get(COMP_LIST_URL, {"region": str(region.id)})
        assert response.status_code == 200
        ids = [str(c["id"]) for c in response.data["results"]]
        assert str(eg_comp.id) in ids
        assert str(ae_comp.id) not in ids

    def test_competition_list_entry_count_annotation(self, api_client, region, admin_user):
        """entry_count reflects confirmed entries only — not registered or withdrawn."""
        comp = _make_competition(region, admin_user)
        user_confirmed = _make_user("confirmed@test.com", region=region)
        user_registered = _make_user("registered@test.com", region=region)
        user_withdrawn = _make_user("withdrawn@test.com", region=region)

        _make_entry(comp, user_confirmed, status=CompetitionEntry.Status.CONFIRMED)
        _make_entry(comp, user_registered, status=CompetitionEntry.Status.REGISTERED)
        _make_entry(comp, user_withdrawn, status=CompetitionEntry.Status.WITHDRAWN)

        response = api_client.get(COMP_LIST_URL)
        assert response.status_code == 200
        comp_data = next(c for c in response.data["results"] if str(c["id"]) == str(comp.id))
        # Only the one confirmed entry should count
        assert comp_data["entry_count"] == 1

    def test_competition_list_returns_required_fields(self, api_client, open_competition):
        """List items expose id, title, title_en, status, entry_fee, prize_pool."""
        response = api_client.get(COMP_LIST_URL)
        assert response.status_code == 200
        item = next(
            c for c in response.data["results"] if str(c["id"]) == str(open_competition.id)
        )
        for field in ("id", "title", "title_en", "status", "entry_fee", "prize_pool", "entry_count"):
            assert field in item, f"Missing field: {field}"


# ---------------------------------------------------------------------------
# CompetitionDetailView — GET /api/v1/competitions/<id>/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCompetitionDetail:
    """GET /api/v1/competitions/<id>/"""

    def test_competition_detail_public(self, api_client, region, admin_user):
        """Unauthenticated GET returns 200 with description, rules, departure_port_name."""
        port = _make_port(region)
        comp = _make_competition(region, admin_user, departure_port=port)

        response = api_client.get(_comp_detail_url(comp.id))
        assert response.status_code == 200
        data = response.data
        assert str(data["id"]) == str(comp.id)
        assert "description" in data
        assert "rules" in data
        assert "departure_port_name" in data
        # Should expose the Arabic port name (Arabic-first ADR-014)
        assert data["departure_port_name"] == port.name_ar

    def test_competition_detail_no_port(self, api_client, open_competition):
        """Detail for a competition without a port returns departure_port_name=None."""
        response = api_client.get(_comp_detail_url(open_competition.id))
        assert response.status_code == 200
        assert response.data["departure_port_name"] is None

    def test_competition_detail_404(self, api_client):
        """Non-existent UUID returns 404."""
        fake_id = uuid.uuid4()
        response = api_client.get(_comp_detail_url(fake_id))
        assert response.status_code == 404

    def test_competition_detail_contains_registration_deadline(self, api_client, open_competition):
        """Detail response must include registration_deadline and max_participants."""
        response = api_client.get(_comp_detail_url(open_competition.id))
        assert response.status_code == 200
        assert "registration_deadline" in response.data
        assert "max_participants" in response.data


# ---------------------------------------------------------------------------
# CompetitionEnterView — POST /api/v1/competitions/<id>/enter/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCompetitionEnter:
    """POST /api/v1/competitions/<id>/enter/"""

    def test_enter_requires_auth(self, api_client, open_competition):
        """Unauthenticated POST returns 401."""
        response = api_client.post(_comp_enter_url(open_competition.id))
        assert response.status_code == 401

    def test_enter_success(self, api_client, customer_a, open_competition):
        """Authenticated user POSTs, gets 201, and entry.status = 'registered'."""
        api_client.force_authenticate(customer_a)
        response = api_client.post(_comp_enter_url(open_competition.id))
        assert response.status_code == 201
        assert response.data["status"] == CompetitionEntry.Status.REGISTERED
        assert CompetitionEntry.objects.filter(
            competition=open_competition,
            user=customer_a,
            status=CompetitionEntry.Status.REGISTERED,
        ).exists()

    def test_enter_already_registered_returns_400(self, api_client, customer_a, open_competition):
        """Posting twice returns 400 with code ALREADY_ENTERED."""
        api_client.force_authenticate(customer_a)
        api_client.post(_comp_enter_url(open_competition.id))
        response = api_client.post(_comp_enter_url(open_competition.id))
        assert response.status_code == 400
        assert response.data["error"]["code"] == "ALREADY_ENTERED"

    def test_enter_competition_not_open(self, api_client, region, admin_user, customer_a):
        """Competition with status='draft' returns 400 with code COMP_NOT_OPEN."""
        comp = _make_competition(region, admin_user, status=Competition.Status.DRAFT)
        api_client.force_authenticate(customer_a)
        response = api_client.post(_comp_enter_url(comp.id))
        assert response.status_code == 400
        assert response.data["error"]["code"] == "COMP_NOT_OPEN"

    def test_enter_competition_closed_status_not_open(self, api_client, region, admin_user, customer_a):
        """Competition with status='closed' also returns COMP_NOT_OPEN."""
        comp = _make_competition(region, admin_user, status=Competition.Status.CLOSED)
        api_client.force_authenticate(customer_a)
        response = api_client.post(_comp_enter_url(comp.id))
        assert response.status_code == 400
        assert response.data["error"]["code"] == "COMP_NOT_OPEN"

    def test_enter_deadline_passed(self, api_client, region, admin_user, customer_a):
        """Registration deadline in the past returns 400 with code DEADLINE_PASSED."""
        comp = _make_competition(
            region, admin_user,
            status=Competition.Status.OPEN,
            deadline_offset_days=-1,  # deadline was yesterday
        )
        api_client.force_authenticate(customer_a)
        response = api_client.post(_comp_enter_url(comp.id))
        assert response.status_code == 400
        assert response.data["error"]["code"] == "DEADLINE_PASSED"

    def test_enter_competition_full(self, api_client, region, admin_user, customer_a):
        """max_participants already reached returns 400 with code COMP_FULL."""
        # Create a competition that allows only 1 confirmed participant
        comp = _make_competition(region, admin_user, max_participants=1)
        # Pre-fill with one confirmed entry using a different user
        filler = _make_user("filler@test.com", region=region)
        _make_entry(comp, filler, status=CompetitionEntry.Status.CONFIRMED)

        api_client.force_authenticate(customer_a)
        response = api_client.post(_comp_enter_url(comp.id))
        assert response.status_code == 400
        assert response.data["error"]["code"] == "COMP_FULL"

    def test_enter_returns_entry_fields(self, api_client, customer_a, open_competition):
        """201 response includes id, competition, status, and user fields."""
        api_client.force_authenticate(customer_a)
        response = api_client.post(_comp_enter_url(open_competition.id))
        assert response.status_code == 201
        for field in ("id", "competition", "status"):
            assert field in response.data, f"Missing field in response: {field}"

    def test_enter_404_for_nonexistent_competition(self, api_client, customer_a):
        """POST to non-existent competition UUID returns 404."""
        api_client.force_authenticate(customer_a)
        response = api_client.post(_comp_enter_url(uuid.uuid4()))
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# LeaderboardView — GET /api/v1/competitions/<id>/leaderboard/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestLeaderboard:
    """GET /api/v1/competitions/<id>/leaderboard/"""

    def test_leaderboard_public(self, api_client, region, admin_user):
        """Unauthenticated GET returns 200 with a ranked results list."""
        comp = _make_competition(region, admin_user)
        response = api_client.get(_comp_leaderboard_url(comp.id))
        assert response.status_code == 200
        assert "results" in response.data
        assert str(response.data["competition_id"]) == str(comp.id)

    def test_leaderboard_sorted_by_total_weight_descending(self, api_client, region, admin_user):
        """Results are sorted by total_weight_kg descending (highest first)."""
        comp = _make_competition(region, admin_user)
        species = _make_species()

        user_light = _make_user("light@test.com", region=region)
        user_heavy = _make_user("heavy@test.com", region=region)

        entry_light = _make_entry(comp, user_light, status=CompetitionEntry.Status.CONFIRMED)
        entry_heavy = _make_entry(comp, user_heavy, status=CompetitionEntry.Status.CONFIRMED)

        _make_catch(entry_light, species, weight_kg="1.000")
        _make_catch(entry_heavy, species, weight_kg="5.000")

        response = api_client.get(_comp_leaderboard_url(comp.id))
        assert response.status_code == 200
        results = response.data["results"]
        assert len(results) >= 2
        # Rank 1 (index 0) should be the heavier catch
        heavy_name = user_heavy.full_name or user_heavy.email
        assert results[0]["user_name"] == heavy_name
        assert results[0]["rank"] == 1

    def test_leaderboard_only_confirmed_entries(self, api_client, region, admin_user):
        """Registered (non-confirmed) entries are excluded from the leaderboard."""
        comp = _make_competition(region, admin_user)
        species = _make_species(name="Leaderboard Fish", name_ar="سمكة المتصدرين")

        # confirmed entry — should appear
        confirmed_user = _make_user("conf_lb@test.com", region=region)
        confirmed_entry = _make_entry(comp, confirmed_user, status=CompetitionEntry.Status.CONFIRMED)
        _make_catch(confirmed_entry, species, weight_kg="3.000")

        # registered-only entry — must NOT appear
        registered_user = _make_user("reg_lb@test.com", region=region)
        registered_entry = _make_entry(comp, registered_user, status=CompetitionEntry.Status.REGISTERED)
        _make_catch(registered_entry, species, weight_kg="10.000")

        response = api_client.get(_comp_leaderboard_url(comp.id))
        assert response.status_code == 200
        names = [r["user_name"] for r in response.data["results"]]
        confirmed_name = confirmed_user.full_name or confirmed_user.email
        registered_name = registered_user.full_name or registered_user.email
        assert confirmed_name in names
        assert registered_name not in names

    def test_leaderboard_empty_when_no_confirmed_entries(self, api_client, open_competition):
        """Leaderboard is empty when there are no confirmed entries."""
        response = api_client.get(_comp_leaderboard_url(open_competition.id))
        assert response.status_code == 200
        assert response.data["results"] == []

    def test_leaderboard_404_for_nonexistent_competition(self, api_client):
        """Leaderboard for a non-existent UUID returns 404."""
        response = api_client.get(_comp_leaderboard_url(uuid.uuid4()))
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# MyEntriesView — GET /api/v1/competitions/my-entries/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestMyEntries:
    """GET /api/v1/competitions/my-entries/"""

    def test_my_entries_requires_auth(self, api_client):
        """Unauthenticated request returns 401."""
        response = api_client.get(MY_ENTRIES_URL)
        assert response.status_code == 401

    def test_my_entries_scoped_to_current_user(
        self, api_client, region, admin_user, customer_a, customer_b
    ):
        """User A cannot see User B's entries — only their own."""
        comp = _make_competition(region, admin_user)
        _make_entry(comp, customer_a)
        _make_entry(comp, customer_b)

        api_client.force_authenticate(customer_a)
        response = api_client.get(MY_ENTRIES_URL)
        assert response.status_code == 200

        entry_user_ids = {str(e["user"]) for e in response.data["results"]}
        assert str(customer_a.id) in entry_user_ids
        assert str(customer_b.id) not in entry_user_ids

    def test_my_entries_returns_results_key(self, api_client, customer_a, open_competition):
        """Response follows the standard pagination shape with a 'results' key."""
        _make_entry(open_competition, customer_a)
        api_client.force_authenticate(customer_a)
        response = api_client.get(MY_ENTRIES_URL)
        assert response.status_code == 200
        assert "results" in response.data

    def test_my_entries_empty_when_no_registrations(self, api_client, customer_a):
        """Returns empty results list when the user has no entries."""
        api_client.force_authenticate(customer_a)
        response = api_client.get(MY_ENTRIES_URL)
        assert response.status_code == 200
        assert response.data["results"] == []

    def test_my_entries_includes_nested_catches(self, api_client, region, admin_user, customer_a):
        """Each entry in the response includes a 'catches' list."""
        comp = _make_competition(region, admin_user)
        entry = _make_entry(comp, customer_a, status=CompetitionEntry.Status.CONFIRMED)
        species = _make_species(name="My Entry Fish", name_ar="سمكة بطولة")
        _make_catch(entry, species, weight_kg="1.500")

        api_client.force_authenticate(customer_a)
        response = api_client.get(MY_ENTRIES_URL)
        assert response.status_code == 200
        results = response.data["results"]
        assert len(results) == 1
        assert "catches" in results[0]
        assert len(results[0]["catches"]) == 1


# ---------------------------------------------------------------------------
# CatchLogCreateView — POST /api/v1/competitions/entries/<entry_id>/catches/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCatchLogCreate:
    """POST /api/v1/competitions/entries/<entry_id>/catches/"""

    def _catch_payload(self, species: FishingSpecies) -> dict:
        return {
            "species": str(species.id),
            "weight_kg": "2.500",
            "caught_at": "2026-06-15T10:00:00Z",
        }

    def test_create_catch_requires_auth(self, api_client, region, admin_user, customer_a):
        """Unauthenticated POST returns 401."""
        comp = _make_competition(region, admin_user)
        entry = _make_entry(comp, customer_a)
        species = _make_species(name="Auth Fish", name_ar="سمكة مصادقة")
        response = api_client.post(_catch_create_url(entry.id), self._catch_payload(species))
        assert response.status_code == 401

    def test_create_catch_success(self, api_client, region, admin_user, customer_a):
        """Entry owner can POST a catch log and receives 201."""
        comp = _make_competition(region, admin_user)
        entry = _make_entry(comp, customer_a, status=CompetitionEntry.Status.CONFIRMED)
        species = _make_species(name="Happy Catch Fish", name_ar="سمكة سعيدة")

        api_client.force_authenticate(customer_a)
        response = api_client.post(
            _catch_create_url(entry.id),
            self._catch_payload(species),
        )
        assert response.status_code == 201
        assert CatchLog.objects.filter(entry=entry, species=species).exists()

    def test_create_catch_stores_correct_weight(self, api_client, region, admin_user, customer_a):
        """The created catch log stores the exact weight_kg submitted."""
        comp = _make_competition(region, admin_user)
        entry = _make_entry(comp, customer_a, status=CompetitionEntry.Status.CONFIRMED)
        species = _make_species(name="Weight Fish", name_ar="سمكة وزن")

        api_client.force_authenticate(customer_a)
        api_client.post(
            _catch_create_url(entry.id),
            {"species": str(species.id), "weight_kg": "3.750", "caught_at": "2026-06-15T10:00:00Z"},
        )
        catch = CatchLog.objects.get(entry=entry)
        assert catch.weight_kg == Decimal("3.750")

    def test_create_catch_wrong_user_gets_404(self, api_client, region, admin_user, customer_a, customer_b):
        """A different authenticated user trying to post to another user's entry gets 404."""
        comp = _make_competition(region, admin_user)
        entry = _make_entry(comp, customer_a, status=CompetitionEntry.Status.CONFIRMED)
        species = _make_species(name="Wrong User Fish", name_ar="سمكة مستخدم خاطئ")

        # customer_b tries to add a catch to customer_a's entry
        api_client.force_authenticate(customer_b)
        response = api_client.post(
            _catch_create_url(entry.id),
            self._catch_payload(species),
        )
        assert response.status_code == 404
        # No catch should have been created
        assert not CatchLog.objects.filter(entry=entry).exists()

    def test_create_catch_returns_expected_fields(self, api_client, region, admin_user, customer_a):
        """201 response includes id, weight_kg, species, caught_at, and verified."""
        comp = _make_competition(region, admin_user)
        entry = _make_entry(comp, customer_a, status=CompetitionEntry.Status.CONFIRMED)
        species = _make_species(name="Fields Fish", name_ar="سمكة حقول")

        api_client.force_authenticate(customer_a)
        response = api_client.post(
            _catch_create_url(entry.id),
            self._catch_payload(species),
        )
        assert response.status_code == 201
        for field in ("id", "weight_kg", "species", "caught_at", "verified"):
            assert field in response.data, f"Missing field: {field}"

    def test_create_catch_verified_defaults_to_false(self, api_client, region, admin_user, customer_a):
        """Newly created catches have verified=False — judge must set it explicitly."""
        comp = _make_competition(region, admin_user)
        entry = _make_entry(comp, customer_a, status=CompetitionEntry.Status.CONFIRMED)
        species = _make_species(name="Unverified Fish", name_ar="سمكة غير محققة")

        api_client.force_authenticate(customer_a)
        response = api_client.post(
            _catch_create_url(entry.id),
            self._catch_payload(species),
        )
        assert response.status_code == 201
        assert response.data["verified"] is False

    def test_create_catch_missing_weight_returns_400(self, api_client, region, admin_user, customer_a):
        """Missing weight_kg field returns 400 validation error."""
        comp = _make_competition(region, admin_user)
        entry = _make_entry(comp, customer_a)
        species = _make_species(name="No Weight Fish", name_ar="سمكة بدون وزن")

        api_client.force_authenticate(customer_a)
        response = api_client.post(
            _catch_create_url(entry.id),
            {"species": str(species.id), "caught_at": "2026-06-15T10:00:00Z"},
        )
        assert response.status_code == 400

    def test_create_catch_nonexistent_entry_returns_404(self, api_client, customer_a):
        """POST to a non-existent entry_id returns 404."""
        species = _make_species(name="Ghost Entry Fish", name_ar="سمكة إدخال وهمية")
        api_client.force_authenticate(customer_a)
        response = api_client.post(
            _catch_create_url(uuid.uuid4()),
            self._catch_payload(species),
        )
        assert response.status_code == 404
