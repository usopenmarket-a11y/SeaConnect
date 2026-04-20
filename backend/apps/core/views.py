"""Views for the core app.

Read-only public endpoints — no authentication required for region/port data.
These lists are small and rarely change, so they are cached at the view level.
"""
from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import DeparturePort, Region
from .serializers import DeparturePortSerializer, RegionSerializer


class RegionListView(generics.ListAPIView):  # type: ignore[type-arg]
    """Return all active regions.  Used by frontend location selectors."""

    serializer_class = RegionSerializer
    permission_classes = [AllowAny]
    queryset = Region.objects.filter(is_active=True).order_by("code")
    # Disable cursor pagination for this small, static dataset.
    pagination_class = None


class DeparturePortListView(generics.ListAPIView):  # type: ignore[type-arg]
    """Return all active departure ports, optionally filtered by region code."""

    serializer_class = DeparturePortSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):  # type: ignore[override]
        qs = DeparturePort.objects.filter(is_active=True).select_related("region")
        region_code = self.request.query_params.get("region")
        if region_code:
            qs = qs.filter(region__code=region_code)
        return qs.order_by("region__code", "name_en")
