"""Analytics app views.

AuditLogListView — admin-only paginated list of platform audit log entries.

ADR compliance:
  ADR-013 — CursorPagination on all list endpoints.
"""
from rest_framework import generics
from rest_framework.permissions import IsAdminUser

from apps.core.pagination import SeaConnectCursorPagination

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):  # type: ignore[type-arg]
    """GET /api/v1/analytics/audit-log/ — admin-only paginated audit log.

    Query parameters:
        event_type  — filter to a specific AuditLog.EventType value.
        reference_type — filter to a specific reference type string.

    Requires: Django admin role (is_staff=True).
    Pagination: CursorPagination (ADR-013), 20 per page, ordered by -created_at.
    """

    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]
    pagination_class = SeaConnectCursorPagination

    def get_queryset(self):  # type: ignore[override]
        qs = AuditLog.objects.select_related("actor").order_by("-created_at")

        event_type = self.request.query_params.get("event_type")
        if event_type:
            qs = qs.filter(event_type=event_type)

        reference_type = self.request.query_params.get("reference_type")
        if reference_type:
            qs = qs.filter(reference_type=reference_type)

        return qs
