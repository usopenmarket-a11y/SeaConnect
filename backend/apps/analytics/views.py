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
from decimal import Decimal, InvalidOperation

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User, UserRole
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
        now = timezone.now()

        # Month boundaries for MoM delta calculation.
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if this_month_start.month == 1:
            last_month_start = this_month_start.replace(year=this_month_start.year - 1, month=12)
        else:
            last_month_start = this_month_start.replace(month=this_month_start.month - 1)

        captured_qs = Payment.objects.filter(status=PaymentStatus.CAPTURED)

        # GTV — sum of all captured payments (all time).
        gtv_result = captured_qs.aggregate(total=Sum("amount"))
        gtv_total: Decimal = gtv_result["total"] or Decimal("0.00")

        # GTV for this month and last month (for MoM delta).
        this_month_gtv: Decimal = (
            captured_qs.filter(created_at__gte=this_month_start).aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )
        last_month_gtv: Decimal = (
            captured_qs.filter(
                created_at__gte=last_month_start, created_at__lt=this_month_start
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        # MoM delta = (this_month - last_month) / last_month; 0.0 when no prior data.
        if last_month_gtv > Decimal("0.00"):
            mom_gtv_delta = float(
                ((this_month_gtv - last_month_gtv) / last_month_gtv).quantize(
                    Decimal("0.0001")
                )
            )
        else:
            mom_gtv_delta = 0.0

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

        # Active vendors count.
        # ADR-018 note: role='vendor' is a platform-wide role, not region-specific.
        active_vendors: int = User.objects.filter(
            role=UserRole.VENDOR,
            is_active=True,
        ).count()

        return Response(
            {
                "gtv_total": str(gtv_total),
                "gtv_currency": "EGP",  # Egypt-first phase — see ADR-018 note above
                "revenue_total": str(revenue_total),
                "bookings_total": bookings_total,
                "active_yachts": active_yachts,
                "active_vendors": active_vendors,
                "mom_gtv_delta": mom_gtv_delta,
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
    Permission: all authenticated users may call this endpoint; non-owners
    will receive an empty list (they have no earnings rows).  Customers are
    NOT blocked at the permission layer — they simply get [].  If a stricter
    403 for non-owners is needed, add an IsOwnerRole permission class.
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

    def get_serializer_context(self) -> dict:  # type: ignore[override]
        """Inject the full page queryset list so the serializer can compute mom_delta.

        The mom_delta computation requires the serializer to look at adjacent rows
        in the result list.  We evaluate the queryset once here and pass it via
        context; the serializer reads it in get_mom_delta().
        """
        ctx = super().get_serializer_context()
        # Evaluate the filtered queryset into a list for O(1) index lookup.
        # This is safe: the list has already been paginated by the time
        # get_serializer_context is called from get_serializer().
        # We store the full un-paginated list so cross-page look-back works
        # within a single request's visible page — limitation noted in serializer.
        ctx["results_list"] = list(self.get_queryset())
        return ctx
