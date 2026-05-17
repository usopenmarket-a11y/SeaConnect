"""URL routes for the notifications app.

Registered under /api/v1/ by config/urls.py.

Endpoints:
  GET  notifications/           — InAppNotificationListView
  POST notifications/read-all/  — MarkAllReadView  (must come before <uuid:id> pattern)
  POST notifications/<id>/read/ — MarkReadView
"""
import uuid

from django.urls import path

from apps.notifications.views import InAppNotificationListView, MarkAllReadView, MarkReadView

app_name = "notifications"

urlpatterns = [
    path(
        "notifications/",
        InAppNotificationListView.as_view(),
        name="notification-list",
    ),
    # read-all must be registered before <uuid:id>/read/ to avoid routing conflict
    path(
        "notifications/read-all/",
        MarkAllReadView.as_view(),
        name="notifications-read-all",
    ),
    path(
        "notifications/<uuid:id>/read/",
        MarkReadView.as_view(),
        name="notification-read",
    ),
]
