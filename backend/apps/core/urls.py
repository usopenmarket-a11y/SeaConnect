"""URL routes for the core app.

Currently exposes read-only endpoints for Regions and DeparturePorts.
These are used by the frontend to populate location selectors.
"""
from django.urls import path

from . import views

app_name = "core"

urlpatterns = [
    path("regions/", views.RegionListView.as_view(), name="region-list"),
    path("ports/", views.DeparturePortListView.as_view(), name="port-list"),
]
