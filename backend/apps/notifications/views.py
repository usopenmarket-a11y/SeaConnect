"""API views for the notifications app.

Endpoints:
  GET  /api/v1/notifications/           — list authenticated user's in-app notifications
  POST /api/v1/notifications/<id>/read/ — mark a single in-app notification as read

Only IN_APP channel notifications are surfaced through the REST API.
Push and email deliveries are fire-and-forget via Celery tasks.

ADR-013: cursor pagination via SeaConnectCursorPagination (project default).
ADR-009: all endpoints require JWT authentication (IsAuthenticated).
"""
import logging

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import SeaConnectCursorPagination
from apps.notifications.models import Notification, NotificationChannel, NotificationStatus
from apps.notifications.serializers import NotificationSerializer

logger = logging.getLogger(__name__)


class InAppNotificationListView(generics.ListAPIView):
    """List the authenticated user's in-app notifications, newest first.

    Only ``channel=in_app`` records are returned.  Push and email records are
    internal delivery-tracking rows not intended for the client notification feed.

    Supports cursor pagination (ADR-013).
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = SeaConnectCursorPagination

    def get_queryset(self):
        return (
            Notification.objects.filter(
                recipient=self.request.user,
                channel=NotificationChannel.IN_APP,
            )
            .select_related("recipient")
            .order_by("-created_at")
        )


class MarkReadView(APIView):
    """Mark a single in-app notification as read.

    Idempotent: if the notification is already ``read``, returns 200 without
    modifying the row.

    Only the owning user can mark their own notifications.  Attempting to mark
    another user's notification results in 404 (object not found for that user).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, id) -> Response:
        notif = get_object_or_404(
            Notification,
            id=id,
            recipient=request.user,
            channel=NotificationChannel.IN_APP,
        )

        if notif.status != NotificationStatus.READ:
            notif.status = NotificationStatus.READ
            notif.read_at = timezone.now()
            notif.save(update_fields=["status", "read_at", "updated_at"])
            logger.debug("Notification %s marked as read by user %s.", id, request.user.id)

        return Response({"status": "read"}, status=status.HTTP_200_OK)
