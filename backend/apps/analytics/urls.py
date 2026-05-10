"""URL routes for the analytics app."""
from django.urls import path

from .views import AdminPlatformStatsView, AuditLogListView, OwnerEarningsSummaryListView

app_name = "analytics"

urlpatterns = [
    path("analytics/audit-log/", AuditLogListView.as_view(), name="audit-log"),
    path("analytics/stats/", AdminPlatformStatsView.as_view(), name="platform-stats"),
    path("analytics/earnings/", OwnerEarningsSummaryListView.as_view(), name="earnings"),
]
