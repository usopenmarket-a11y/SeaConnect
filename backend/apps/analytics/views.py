"""Analytics app views.

AuditLogListView           — admin-only paginated list of platform audit log entries.
AdminPlatformStatsView     — admin-only snapshot of platform KPIs (GTV, revenue, counts).
OwnerEarningsSummaryListView — owner's own monthly earnings history, cursor-paginated.

ADR compliance:
  ADR-009 — JWT authentication on all non-public endpoints.
  ADR-013 — CursorPagination on all list endpoints.
  ADR-018 — currency sourced from region; 'EGP' only hardcoded for Egypt-first phase
             aggregation — see inline comment on AdminPlatformStatsView.
"""
from decimal import Decimal

from django.db.models import Count, Q, Sum
from rest_framework import generics
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking, BookingStatus, Yacht, YachtStatus
from apps.core.pagination import SeaConnectCursorPagination
from apps.payments.models import Payment, PaymentStatus

from .models import AuditLog, OwnerEarningsSummary
from .serializers import AuditLogSerializer, OwnerEarningsSummarySerializer


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


class AdminPlatformStatsView(APIView):
    """GET /api/v1/analytics/stats/ — admin-only platform KPI snapshot.

    Returns a single JSON object (not paginated — it is a scalar summary).
    All DB aggregations are performed in a single queryset pass each to
    avoid N+1 issues.

    ADR-018 note: ``gtv_currency`` is hardcoded to 'EGP' for the Egypt-first
    phase only.  When multi-region launches, this endpoint must be refactored
    to return per-region breakdowns (tracked in ADR-018 follow-up).

    Requires: is_staff=True (IsAdminUser).
    """

    permission_classes = [IsAdminUser]

    def get(self, request: Request) -> Response:
        # GTV — sum of all captured payments.
        gtv_result = Payment.objects.filter(
            status=PaymentStatus.CAPTURED,
        ).aggregate(total=Sum("amount"))
        gtv_total: Decimal = gtv_result["total"] or Decimal("0.00")

        # Platform revenue = 12% of GTV.
        revenue_total: Decimal = (gtv_total * Decimal("0.12")).quantize(Decimal("0.01"))

        # Completed bookings count.
        bookings_total: int = Booking.objects.filter(
            status=BookingStatus.COMPLETED,
        ).count()

        # Active yachts count.
        active_yachts: int = Yacht.objects.filter(
            status=YachtStatus.ACTIVE,
            is_deleted=False,
        ).count()

        return Response(
            {
                "gtv_total": str(gtv_total),
                "gtv_currency": "EGP",  # Egypt-first phase — see ADR-018 note above
                "revenue_total": str(revenue_total),
                "bookings_total": bookings_total,
                "active_yachts": active_yachts,
            }
        )


class OwnerEarningsSummaryListView(generics.ListAPIView):  # type: ignore[type-arg]
    """GET /api/v1/analytics/earnings/ — owner earnings history, cursor-paginated.

    Authenticated owners see only their own rows.
    Staff users see all rows (useful for debugging and support).

    Ordering: -year, -month (most recent period first).
    Pagination: CursorPagination (ADR-013) via SeaConnectCursorPagination.
    No N+1: select_related('owner') pre-fetches the FK in one query.

    Requires: IsAuthenticated.
    """

    serializer_class = OwnerEarningsSummarySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = SeaConnectCursorPagination

    def get_queryset(self):  # type: ignore[override]
        qs = OwnerEarningsSummary.objects.select_related("owner").order_by(
            "-year", "-month"
        )
        if self.request.user.is_staff:
            return qs
        return qs.filter(owner=self.request.user)
