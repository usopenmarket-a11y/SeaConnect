"""URL routes for the competitions app."""
from django.urls import path

from .views import (
    CatchLogCreateView,
    CompetitionDetailView,
    CompetitionEnterView,
    CompetitionListView,
    LeaderboardView,
    MyEntriesView,
    MyEntryView,
    RegisterView,
    ResultsView,
)

app_name = "competitions"

urlpatterns = [
    # Static paths must come before parameterised <uuid:id> paths to avoid
    # Django matching "my-entries" as a UUID.
    path("competitions/my-entries/", MyEntriesView.as_view(), name="my-entries"),
    path("competitions/entries/<uuid:entry_id>/catches/", CatchLogCreateView.as_view(), name="catch-log-create"),

    # List + detail
    path("competitions/", CompetitionListView.as_view(), name="competition-list"),
    path("competitions/<uuid:id>/", CompetitionDetailView.as_view(), name="competition-detail"),

    # Sprint 6 legacy endpoints (kept for backwards compatibility)
    path("competitions/<uuid:id>/enter/", CompetitionEnterView.as_view(), name="competition-enter"),
    path("competitions/<uuid:id>/leaderboard/", LeaderboardView.as_view(), name="competition-leaderboard"),

    # Sprint 13E new endpoints
    path("competitions/<uuid:id>/register/", RegisterView.as_view(), name="competition-register"),
    path("competitions/<uuid:id>/results/", ResultsView.as_view(), name="competition-results"),
    path("competitions/<uuid:id>/my-entry/", MyEntryView.as_view(), name="competition-my-entry"),
]
