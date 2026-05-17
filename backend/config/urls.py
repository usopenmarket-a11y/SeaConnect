"""Root URL configuration for SeaConnect API."""
from django.contrib import admin
from django.db import connection
from django.core.cache import cache
from django.http import HttpRequest, JsonResponse
from django.urls import include, path


def health_check(request: HttpRequest) -> JsonResponse:
    """Health check endpoint for load balancers and uptime monitors.

    Returns HTTP 200 with status "ok" when all critical subsystems are healthy.
    Returns HTTP 503 with status "degraded" if the database or Redis is down.
    Celery broker reachability is checked but is non-critical (never causes 503).
    """
    checks: dict[str, str] = {}
    overall = "ok"

    # Database — critical: failure degrades the service.
    try:
        with connection.cursor() as c:
            c.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
        overall = "degraded"

    # Redis — critical: failure degrades the service.
    try:
        cache.set("health_ping", "1", timeout=5)
        assert cache.get("health_ping") == "1"
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"
        overall = "degraded"

    # Celery broker reachability — non-critical: unknown state never causes 503.
    try:
        from config.celery import app as celery_app  # noqa: PLC0415

        inspector = celery_app.control.inspect(timeout=1.0)
        checks["celery"] = "ok" if inspector.ping() else "degraded"
    except Exception:
        checks["celery"] = "unknown"

    checks["version"] = "0.14.0"
    status_code = 200 if overall == "ok" else 503
    return JsonResponse({"status": overall, "service": "seaconnect-api", **checks}, status=status_code)


urlpatterns = [
    # Health check — no auth required, no DB hit.
    path("health/", health_check, name="health-check"),

    # Django admin — restricted to admin role users.
    path("admin/", admin.site.urls),

    # Versioned API routes — each app registers its own urls.py.
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.bookings.urls")),
    path("api/v1/", include("apps.marketplace.urls")),
    path("api/v1/", include("apps.competitions.urls")),
    path("api/v1/", include("apps.weather.urls")),
    path("api/v1/", include("apps.payments.urls")),
    path("api/v1/", include("apps.notifications.urls")),
    path("api/v1/", include("apps.analytics.urls")),
]
