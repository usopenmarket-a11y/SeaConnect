"""Weather and fishing season tests — Sprint 5.

Tests cover:
  - GET /api/v1/weather/ (advisory level, Redis cache, 400 on missing port_id,
    404 on inactive port, 200 fallback to DB cache, 503 on total failure)
  - _compute_advisory unit tests (no DB, no http calls)
  - GET /api/v1/fishing/whats-biting/ (current month species, 400 on missing param)
  - GET /api/v1/fishing/seasons/ (all months, 400 on missing param)

Rules:
  - Real PostgreSQL test DB — no DB mocking (ADR rule)
  - All requests.get calls are mocked via unittest.mock.patch
  - @pytest.mark.django_db on every test that touches the DB
"""
import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.core.models import DeparturePort, Region
from apps.weather.models import FishingSeason, FishingSpecies, WeatherCache
from apps.weather.views import _compute_advisory


# ---------------------------------------------------------------------------
# Mock Open-Meteo payloads
# ---------------------------------------------------------------------------

MOCK_MARINE_RESPONSE = {
    "current": {"wave_height": 0.8, "wave_period": 6.5}
}

MOCK_FORECAST_RESPONSE = {
    "current": {
        "temperature_2m": 28.5,
        "wind_speed_10m": 15.0,
        "wind_direction_10m": 180,
        "weather_code": 1,
    }
}


def _build_mock_response(json_data: dict) -> MagicMock:
    mock = MagicMock()
    mock.raise_for_status.return_value = None
    mock.json.return_value = json_data
    return mock


def _mock_requests_get(url: str, **kwargs) -> MagicMock:
    """Side-effect for requests.get that returns appropriate mock per URL."""
    if "marine-api" in url:
        return _build_mock_response(MOCK_MARINE_RESPONSE)
    return _build_mock_response(MOCK_FORECAST_RESPONSE)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def region(db) -> Region:
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
def active_port(db, region: Region) -> DeparturePort:
    port, _ = DeparturePort.objects.get_or_create(
        name_en="Hurghada Marina",
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


@pytest.fixture
def inactive_port(db, region: Region) -> DeparturePort:
    return DeparturePort.objects.create(
        name_en="Closed Port",
        name_ar="ميناء مغلق",
        region=region,
        city_en="Cairo",
        city_ar="القاهرة",
        latitude=Decimal("30.044420"),
        longitude=Decimal("31.235712"),
        is_active=False,
    )


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture(autouse=True)
def clear_weather_cache():
    """Clear Django cache before each test so Redis state does not bleed between tests."""
    cache.clear()
    yield
    cache.clear()


# ---------------------------------------------------------------------------
# Advisory unit tests — no DB, no HTTP, no django_db marker
# ---------------------------------------------------------------------------


class TestComputeAdvisory:
    """Pure logic tests for _compute_advisory — no DB or network needed."""

    def test_advisory_safe_when_low_waves_and_wind(self):
        result = _compute_advisory(0.5, 10)
        assert result == "safe"

    def test_advisory_caution_medium(self):
        result = _compute_advisory(1.2, 20)
        assert result == "caution"

    def test_advisory_danger_high_waves(self):
        result = _compute_advisory(2.5, 10)
        assert result == "danger"

    def test_advisory_danger_high_wind(self):
        result = _compute_advisory(0.5, 45)
        assert result == "danger"

    def test_advisory_safe_boundary_below_caution(self):
        """Wave exactly at 0.99 and wind at 24 should still be safe."""
        result = _compute_advisory(0.99, 24)
        assert result == "safe"

    def test_advisory_caution_boundary_wave_threshold(self):
        """Wave exactly at 1.0 triggers caution."""
        result = _compute_advisory(1.0, 10)
        assert result == "caution"

    def test_advisory_danger_boundary_wave_threshold(self):
        """Wave exactly at 2.0 triggers danger."""
        result = _compute_advisory(2.0, 10)
        assert result == "danger"

    def test_advisory_handles_none_values(self):
        """None values should be treated as 0 without raising."""
        result = _compute_advisory(None, None)
        assert result == "safe"


# ---------------------------------------------------------------------------
# Weather endpoint tests
# ---------------------------------------------------------------------------

WEATHER_URL = "/api/v1/weather/"


@pytest.mark.django_db
class TestWeatherView:
    """GET /api/v1/weather/?port_id={uuid}"""

    @patch("apps.weather.views.requests.get", side_effect=_mock_requests_get)
    def test_happy_weather_returns_advisory_level(self, mock_get, api_client, active_port):
        """Response must include advisory_level in the allowed set."""
        response = api_client.get(WEATHER_URL, {"port_id": str(active_port.id)})
        assert response.status_code == 200
        assert response.data["advisory_level"] in ("safe", "caution", "danger")

    @patch("apps.weather.views.requests.get", side_effect=_mock_requests_get)
    def test_happy_weather_response_contains_expected_fields(self, mock_get, api_client, active_port):
        """Response should include wind, wave, and temperature fields."""
        response = api_client.get(WEATHER_URL, {"port_id": str(active_port.id)})
        assert response.status_code == 200
        for field in ("wind_speed_kmh", "wave_height_m", "temperature_c", "advisory_level"):
            assert field in response.data, f"Missing field: {field}"

    @patch("apps.weather.views.requests.get", side_effect=_mock_requests_get)
    def test_happy_weather_caches_in_redis(self, mock_get, api_client, active_port):
        """Second call to the same port must NOT re-call Open-Meteo (served from cache)."""
        api_client.get(WEATHER_URL, {"port_id": str(active_port.id)})
        first_call_count = mock_get.call_count

        # Second request — should be served from cache, no new HTTP calls
        api_client.get(WEATHER_URL, {"port_id": str(active_port.id)})
        assert mock_get.call_count == first_call_count, (
            "requests.get should not be called again on cache hit"
        )

    def test_sad_weather_missing_port_id_returns_400(self, api_client):
        """GET without port_id must return 400."""
        response = api_client.get(WEATHER_URL)
        assert response.status_code == 400

    def test_sad_weather_inactive_port_returns_404(self, api_client, inactive_port):
        """GET for an inactive port must return 404."""
        response = api_client.get(WEATHER_URL, {"port_id": str(inactive_port.id)})
        assert response.status_code == 404

    @patch("apps.weather.views.requests.get")
    def test_happy_weather_open_meteo_failure_falls_back_to_db(
        self, mock_get, api_client, active_port
    ):
        """When Open-Meteo is unreachable, the endpoint returns the last DB-cached record."""
        import requests as req_module
        mock_get.side_effect = req_module.ConnectionError("network unreachable")

        # Pre-seed a WeatherCache record for this port
        WeatherCache.objects.create(
            port=active_port,
            wind_speed_kmh=Decimal("12.00"),
            wind_direction_deg=90,
            wave_height_m=Decimal("0.50"),
            wave_period_s=Decimal("5.00"),
            temperature_c=Decimal("26.00"),
            weather_code=0,
            advisory_level="safe",
            fetched_at=datetime.datetime(2026, 4, 1, 12, 0, tzinfo=datetime.timezone.utc),
        )

        response = api_client.get(WEATHER_URL, {"port_id": str(active_port.id)})
        assert response.status_code == 200
        assert response.data["advisory_level"] == "safe"

    @patch("apps.weather.views.requests.get")
    def test_sad_weather_open_meteo_failure_no_db_cache_returns_503(
        self, mock_get, api_client, active_port
    ):
        """When Open-Meteo fails and no DB cache exists, the endpoint returns 503."""
        import requests as req_module
        mock_get.side_effect = req_module.ConnectionError("network unreachable")

        # Ensure no WeatherCache record exists for this port
        WeatherCache.objects.filter(port=active_port).delete()

        response = api_client.get(WEATHER_URL, {"port_id": str(active_port.id)})
        assert response.status_code == 503


# ---------------------------------------------------------------------------
# Fishing — What's Biting
# ---------------------------------------------------------------------------

WHATS_BITING_URL = "/api/v1/fishing/whats-biting/"


def _make_species(name: str = "Sea Bass", name_ar: str = "قاروص") -> FishingSpecies:
    return FishingSpecies.objects.create(
        name=name,
        name_ar=name_ar,
        scientific_name="Dicentrarchus labrax",
    )


@pytest.mark.django_db
class TestWhatsBiting:
    """GET /api/v1/fishing/whats-biting/?port_id={uuid}"""

    def test_sad_whats_biting_missing_port_id_returns_400(self, api_client):
        """GET without port_id must return 400."""
        response = api_client.get(WHATS_BITING_URL)
        assert response.status_code == 400

    def test_happy_whats_biting_returns_current_month_species(self, api_client, active_port):
        """Species with season matching current month must appear in the response."""
        current_month = datetime.date.today().month
        species = _make_species(name="Red Snapper", name_ar="الدنيس")
        FishingSeason.objects.create(
            species=species,
            port=active_port,
            month=current_month,
            is_peak=True,
        )

        response = api_client.get(WHATS_BITING_URL, {"port_id": str(active_port.id)})
        assert response.status_code == 200
        names = [item["species"]["name"] for item in response.data]
        assert "Red Snapper" in names

    def test_sad_whats_biting_excludes_other_months(self, api_client, active_port):
        """Species in a different month must NOT appear in the current-month response."""
        current_month = datetime.date.today().month
        # Pick a month that is guaranteed to differ
        other_month = (current_month % 12) + 1  # wrap around

        species = _make_species(name="Off-season Fish", name_ar="سمكة خارج الموسم")
        FishingSeason.objects.create(
            species=species,
            port=active_port,
            month=other_month,
        )

        response = api_client.get(WHATS_BITING_URL, {"port_id": str(active_port.id)})
        assert response.status_code == 200
        names = [item["species"]["name"] for item in response.data]
        assert "Off-season Fish" not in names

    def test_happy_whats_biting_peak_species_appear_first(self, api_client, active_port):
        """Peak-season species must be ordered before non-peak species."""
        current_month = datetime.date.today().month
        peak_species = _make_species(name="Peak Fish", name_ar="سمكة ذروة")
        regular_species = _make_species(name="Aardvark Fish", name_ar="سمكة عادية")
        FishingSeason.objects.create(species=peak_species, port=active_port, month=current_month, is_peak=True)
        FishingSeason.objects.create(species=regular_species, port=active_port, month=current_month, is_peak=False)

        response = api_client.get(WHATS_BITING_URL, {"port_id": str(active_port.id)})
        names = [item["species"]["name"] for item in response.data]
        assert names.index("Peak Fish") < names.index("Aardvark Fish")


# ---------------------------------------------------------------------------
# Fishing — Full Seasons
# ---------------------------------------------------------------------------

SEASONS_URL = "/api/v1/fishing/seasons/"


@pytest.mark.django_db
class TestFishingSeasons:
    """GET /api/v1/fishing/seasons/?port_id={uuid}"""

    def test_sad_fishing_seasons_missing_port_id_returns_400(self, api_client):
        """GET without port_id must return 400."""
        response = api_client.get(SEASONS_URL)
        assert response.status_code == 400

    def test_happy_fishing_seasons_returns_all_months(self, api_client, active_port):
        """Seeding seasons for 3 different months must yield all 3 in the response."""
        species = _make_species(name="Grouper", name_ar="هامور")
        months = [1, 6, 11]
        for m in months:
            FishingSeason.objects.create(species=species, port=active_port, month=m)

        response = api_client.get(SEASONS_URL, {"port_id": str(active_port.id)})
        assert response.status_code == 200
        returned_months = [item["month"] for item in response.data]
        for m in months:
            assert m in returned_months, f"Month {m} missing from seasons response"

    def test_happy_fishing_seasons_empty_when_none_seeded(self, api_client, active_port):
        """With no seasons seeded, the response must be an empty list (not an error)."""
        response = api_client.get(SEASONS_URL, {"port_id": str(active_port.id)})
        assert response.status_code == 200
        assert response.data == []

    def test_happy_fishing_seasons_scoped_to_port(self, api_client, active_port, region):
        """Seasons for a different port must not appear in the response."""
        other_port = DeparturePort.objects.create(
            name_en="Alexandria Port",
            name_ar="ميناء الإسكندرية",
            region=region,
            city_en="Alexandria",
            city_ar="الإسكندرية",
            latitude=Decimal("31.200092"),
            longitude=Decimal("29.918739"),
            is_active=True,
        )
        species = _make_species(name="Sole", name_ar="موسى")
        # Season exists only on other_port
        FishingSeason.objects.create(species=species, port=other_port, month=3)

        response = api_client.get(SEASONS_URL, {"port_id": str(active_port.id)})
        assert response.status_code == 200
        assert response.data == []
