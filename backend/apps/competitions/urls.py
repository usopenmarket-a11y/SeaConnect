"""URL routes for the competitions app."""
from django.urls import path

from .views import (
    CatchLogCreateView,
    CompetitionDetailView,
    CompetitionEnterView,
    CompetitionListView,
    LeaderboardView,
    MyEntriesView,
)

app_name = "competitions"

urlpatterns = [
    path("competitions/", CompetitionListView.as_view(), name="competition-list"),
    path("competitions/<uuid:id>/", CompetitionDetailView.as_view(), name="competition-detail"),
    path("competitions/<uuid:id>/enter/", CompetitionEnterView.as_view(), name="competition-enter"),
    path("competitions/<uuid:id>/leaderboard/", LeaderboardView.as_view(), name="competition-leaderboard"),
    path("competitions/my-entries/", MyEntriesView.as_view(), name="my-entries"),
    path("competitions/entries/<uuid:entry_id>/catches/", CatchLogCreateView.as_view(), name="catch-log-create"),
]
