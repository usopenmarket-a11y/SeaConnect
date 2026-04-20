"""Root URL configuration for SeaConnect API."""
from django.contrib import admin
from django.http import HttpRequest, JsonResponse
from django.urls import include, path


def health_check(request: HttpRequest) -> JsonResponse:
    """Lightweight health check endpoint for load balancers and uptime monitors."""
    return JsonResponse({"status": "ok", "service": "seaconnect-api"})


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
