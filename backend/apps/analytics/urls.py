"""URL routes for the analytics app."""
from django.urls import path

from .views import AuditLogListView

app_name = "analytics"

urlpatterns = [
    path("analytics/audit-log/", AuditLogListView.as_view(), name="audit-log"),
]
