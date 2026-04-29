"""Weather and fishing views — Sprint 5.

GET /api/v1/weather/?port_id={uuid}               — current weather for a port (6h Redis cache)
GET /api/v1/fishing/whats-biting/?port_id={uuid}  — species in season this month
GET /api/v1/fishing/seasons/?port_id={uuid}        — full annual season data for port

Open-Meteo is free, no API key required.
Marine API: https://marine-api.open-meteo.com/v1/marine
Forecast API: https://api.open-meteo.com/v1/forecast

ADR-016: All Open-Meteo calls are guarded by a Redis cache check (key: sc:weather:{port_id}:v1,
         TTL 6 hours). The WeatherCache DB table is the cold-start fallback.
"""
import datetime
import logging

import requests
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import DeparturePort

from .models import FishingSeason, WeatherCache
from .serializers import FishingSeasonSerializer, WeatherSerializer

logger = logging.getLogger(__name__)

WEATHER_CACHE_TTL = 6 * 60 * 60  # 6 hours — ADR-016


def _compute_advisory(wave_height_m: object, wind_speed_kmh: object) -> str:
    """Return 'safe', 'caution', or 'danger' based on wave and wind thresholds."""
    wave = float(wave_height_m or 0)
    wind = float(wind_speed_kmh or 0)
    if wave >= 2.0 or wind >= 40:
        return "danger"
    if wave >= 1.0 or wind >= 25:
        return "caution"
    return "safe"


def _fetch_open_meteo(latitude: float, longitude: float) -> dict:
    """Fetch current marine and atmospheric data from Open-Meteo.

    Returns partial data if the marine endpoint is unavailable (Red Sea / Mediterranean only).
    Raises on forecast API failure so the caller can fall back to DB cache.
    """
    result: dict = {}

    # Marine data (wave height/period) — Nile ports will get None here.
    try:
        marine_resp = requests.get(
            "https://marine-api.open-meteo.com/v1/marine",
            params={
                "latitude": latitude,
                "longitude": longitude,
                "current": "wave_height,wave_period",
            },
            timeout=10,
        )
        marine_resp.raise_for_status()
        marine_data = marine_resp.json().get("current", {})
        result["wave_height_m"] = marine_data.get("wave_height")
        result["wave_period_s"] = marine_data.get("wave_period")
    except Exception as exc:
        logger.warning("Open-Meteo Marine API failed for lat=%s lon=%s: %s", latitude, longitude, exc)
        result["wave_height_m"] = None
        result["wave_period_s"] = None

    # Atmospheric / forecast data — always required.
    forecast_resp = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,wind_speed_10m,wind_direction_10m,weather_code",
        },
        timeout=10,
    )
    forecast_resp.raise_for_status()
    forecast_data = forecast_resp.json().get("current", {})
    result["wind_speed_kmh"] = forecast_data.get("wind_speed_10m")
    result["wind_direction_deg"] = forecast_data.get("wind_direction_10m")
    result["temperature_c"] = forecast_data.get("temperature_2m")
    result["weather_code"] = forecast_data.get("weather_code")
    return result


class WeatherView(APIView):
    """Current weather conditions for a single port.

    ADR-016: Redis cache checked first. DB WeatherCache is cold-start fallback.
    """

    permission_classes = [AllowAny]

    def get(self, request):  # type: ignore[override]
        port_id = request.query_params.get("port_id")
        if not port_id:
            return Response(
                {"error": {"code": "MISSING_PARAM", "message": "port_id is required."}},
                status=400,
            )

        port = get_object_or_404(DeparturePort, id=port_id, is_active=True)

        # ADR-016: Redis first.
        cache_key = f"sc:weather:{port_id}:v1"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        # Cache miss — fetch from Open-Meteo.
        try:
            data = _fetch_open_meteo(float(port.latitude), float(port.longitude))
        except Exception as exc:
            logger.error("Open-Meteo fetch failed for port %s: %s", port_id, exc)
            # Fall back to last DB-cached record.
            try:
                return Response(WeatherSerializer(port.weather_cache).data)
            except WeatherCache.DoesNotExist:
                return Response(
                    {"error": {"code": "WEATHER_UNAVAILABLE", "message": "Weather data temporarily unavailable."}},
                    status=503,
                )

        advisory = _compute_advisory(data.get("wave_height_m"), data.get("wind_speed_kmh"))
        weather_obj, _ = WeatherCache.objects.update_or_create(
            port=port,
            defaults={**data, "advisory_level": advisory, "fetched_at": timezone.now()},
        )

        serialized = WeatherSerializer(weather_obj).data
        cache.set(cache_key, serialized, WEATHER_CACHE_TTL)
        return Response(serialized)


class WhatsBitingView(APIView):
    """Species currently in season at a port (filtered to this calendar month)."""

    permission_classes = [AllowAny]

    def get(self, request):  # type: ignore[override]
        port_id = request.query_params.get("port_id")
        if not port_id:
            return Response(
                {"error": {"code": "MISSING_PARAM", "message": "port_id is required."}},
                status=400,
            )

        port = get_object_or_404(DeparturePort, id=port_id)
        current_month = datetime.date.today().month

        seasons = (
            FishingSeason.objects.filter(port=port, month=current_month)
            .select_related("species")
            .order_by("-is_peak", "species__name")
        )
        return Response(FishingSeasonSerializer(seasons, many=True).data)


class FishingSeasonsView(APIView):
    """Full 12-month season matrix for all species at a port."""

    permission_classes = [AllowAny]

    def get(self, request):  # type: ignore[override]
        port_id = request.query_params.get("port_id")
        if not port_id:
            return Response(
                {"error": {"code": "MISSING_PARAM", "message": "port_id is required."}},
                status=400,
            )

        port = get_object_or_404(DeparturePort, id=port_id)
        seasons = (
            FishingSeason.objects.filter(port=port)
            .select_related("species")
            .order_by("month", "species__name")
        )
        return Response(FishingSeasonSerializer(seasons, many=True).data)
