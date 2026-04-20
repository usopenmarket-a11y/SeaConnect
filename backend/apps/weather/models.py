"""Weather app models — stub for Sprint 1.

Full implementation in Sprint 2 (weather cache, fishing seasons).

ADR-016:
  - Never call Open-Meteo from a request handler directly.
  - Always check Redis cache (key: sc:weather:{port_id}:{date}:v1, TTL 6h).
  - On cache miss: fetch Open-Meteo, write to Redis AND weather_cache DB table.
  - Cache key pattern: sc:weather:{port_id}:{date}:v1
"""
# Sprint 2 will add:
#   WeatherCache — stores fetched Open-Meteo data for historical analysis
#   FishSeason   — species seasonal availability windows per region
