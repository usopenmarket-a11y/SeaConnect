"""URL routes for the notifications app.

Registered under /api/v1/ by config/urls.py.

Endpoints:
  GET  notifications/           — InAppNotificationListView
  POST notifications/<id>/read/ — MarkReadView
"""
import uuid

from django.urls import path

from apps.notifications.views import InAppNotificationListView, MarkReadView

app_name = "notifications"

urlpatterns = [
    path(
        "notifications/",
        InAppNotificationListView.as_view(),
        name="notification-list",
    ),
    path(
        "notifications/<uuid:id>/read/",
        MarkReadView.as_view(),
        name="notification-read",
    ),
]
