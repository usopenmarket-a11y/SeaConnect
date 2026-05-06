"""Bookings app views.

Sprint 2 — Yacht list / detail (public).
Sprint 3 — Booking CRUD + state transitions + per-yacht availability.
Sprint 12A — Yacht photo upload / delete.

ADR compliance:
  ADR-001 — UUID PKs, ORM only.
  ADR-010 — File storage via default_storage (USE_S3 toggle respected).
  ADR-012 — All booking state mutations go through BookingService so the
            BookingEvent audit row is inserted in the same atomic transaction.
  ADR-013 — Cursor pagination on list endpoints.
  ADR-018 — Region FK + currency carried on every booking; never hardcoded.
"""
from __future__ import annotations

import calendar
import datetime
import os
import uuid as uuid_module

from django.core.files.storage import default_storage
from django.db import transaction
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import UserRole
from apps.core.models import DeparturePort
from apps.core.pagination import SeaConnectCursorPagination

from .filters import YachtFilter
from .models import Availability, BlockedDate, Booking, BookingStatus, Yacht, YachtMedia, YachtStatus
from .permissions import IsOwnerRole, IsYachtOwner
from .serializers import (
    AvailabilitySerializer,
    AvailabilityWriteSerializer,
    BookingCreateSerializer,
    BookingDetailSerializer,
    BookingListSerializer,
    YachtCreateSerializer,
    YachtDetailSerializer,
    YachtListSerializer,
    YachtPhotoResponseSerializer,
    YachtPhotoUploadSerializer,
    YachtUpdateSerializer,
)
from .services import BookingService, BookingTransitionError


# ---------------------------------------------------------------------------
# Sprint 2 / Sprint 10A — Yachts (public GET, owner POST)
# ---------------------------------------------------------------------------


class YachtListCreateView(generics.ListCreateAPIView):  # type: ignore[type-arg]
    """GET /api/v1/yachts/ — public paginated list.
    POST /api/v1/yachts/ — authenticated owner creates a new yacht (Sprint 10A).

    Permission dispatch:
      GET  — AllowAny (public listing, ADR-003 SSR requires no auth).
      POST — IsAuthenticated + IsOwnerRole (role check in permission class,
             never inline).

    N+1 prevention: both methods use select_related + prefetch_related.
    """

    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = YachtFilter
    ordering_fields = ["price_per_day", "created_at", "capacity"]
    ordering = ["-created_at"]

    def get_permissions(self):  # type: ignore[override]
        if self.request.method == "POST":
            return [IsAuthenticated(), IsOwnerRole()]
        return [AllowAny()]

    def get_serializer_class(self):  # type: ignore[override]
        if self.request.method == "POST":
            return YachtCreateSerializer
        return YachtListSerializer

    def get_queryset(self):  # type: ignore[override]
        return (
            Yacht.objects.filter(status="active", is_deleted=False)
            .select_related("departure_port", "region", "owner")
            .prefetch_related("media")
        )

    def perform_create(self, serializer):  # type: ignore[override]
        """Set owner + status server-side; resolve currency from departure port region.

        ADR-018: currency is sourced from the departure port's region, not from
        the request body.  If the departure port has no region configured the
        request-supplied currency field (validated by the serializer) is used as
        a fallback.
        """
        departure_port = serializer.validated_data.get("departure_port")
        currency = serializer.validated_data.get("currency", "")

        # Attempt to resolve currency from the port's region (ADR-018).
        if departure_port and hasattr(departure_port, "region") and departure_port.region_id:
            region = departure_port.region
            currency = region.currency
        elif not currency:
            # Last-resort: owner's own region currency.
            owner_region = getattr(self.request.user, "region", None)
            if owner_region:
                currency = owner_region.currency

        # Resolve region from departure port, fall back to owner's region.
        region = None
        if departure_port and departure_port.region_id:
            region = departure_port.region
        if region is None:
            region = getattr(self.request.user, "region", None)

        serializer.save(
            owner=self.request.user,
            status=YachtStatus.DRAFT,
            currency=currency,
            region=region,
        )

    def create(self, request: Request, *args, **kwargs) -> Response:  # type: ignore[override]
        """POST creates the yacht and returns the full YachtDetailSerializer (201)."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        yacht = (
            Yacht.objects.select_related("departure_port", "region", "owner")
            .prefetch_related("media")
            .get(id=serializer.instance.id)
        )
        return Response(
            YachtDetailSerializer(yacht).data,
            status=status.HTTP_201_CREATED,
        )


class YachtRetrieveUpdateView(generics.RetrieveUpdateAPIView):  # type: ignore[type-arg]
    """GET /api/v1/yachts/{id}/ — public detail.
    PATCH /api/v1/yachts/{id}/ — authenticated owner partial update (Sprint 10A).

    PUT is disabled: only PATCH (partial update) is supported for updates.

    Permission dispatch:
      GET   — AllowAny.
      PATCH — IsAuthenticated + IsYachtOwner (object-level: only the yacht's
              owner may update it; enforced via check_object_permissions).
    """

    http_method_names = ["get", "patch", "head", "options"]
    lookup_field = "id"

    def get_permissions(self):  # type: ignore[override]
        if self.request.method == "PATCH":
            return [IsAuthenticated(), IsYachtOwner()]
        return [AllowAny()]

    def get_serializer_class(self):  # type: ignore[override]
        if self.request.method == "PATCH":
            return YachtUpdateSerializer
        return YachtDetailSerializer

    def get_queryset(self):  # type: ignore[override]
        """PATCH queries ALL non-deleted yachts (owner can update draft/inactive too).
        GET queries only active, non-deleted yachts (public visibility).
        """
        if self.request.method == "PATCH":
            return (
                Yacht.objects.filter(is_deleted=False)
                .select_related("departure_port", "region", "owner")
                .prefetch_related("media")
            )
        return (
            Yacht.objects.filter(status="active", is_deleted=False)
            .select_related("departure_port", "region", "owner")
            .prefetch_related("media")
        )

    def get_object(self):  # type: ignore[override]
        obj = super().get_object()
        # Triggers IsYachtOwner.has_object_permission for PATCH.
        self.check_object_permissions(self.request, obj)
        return obj

    def partial_update(self, request: Request, *args, **kwargs) -> Response:  # type: ignore[override]
        """PATCH — partial update; returns full YachtDetailSerializer (200)."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Refetch with all relations so the response is fully populated.
        yacht = (
            Yacht.objects.select_related("departure_port", "region", "owner")
            .prefetch_related("media")
            .get(id=instance.id)
        )
        return Response(YachtDetailSerializer(yacht).data, status=status.HTTP_200_OK)


# Keep legacy aliases so any other internal code referencing the old names
# does not break during the transition period.
YachtListView = YachtListCreateView
YachtDetailView = YachtRetrieveUpdateView


# ---------------------------------------------------------------------------
# Sprint 3 — Bookings (authenticated)
# ---------------------------------------------------------------------------


class BookingListCreateView(generics.ListCreateAPIView):  # type: ignore[type-arg]
    """List the caller's bookings or create a new one.

    GET — customer sees their own bookings; owner sees bookings against any
          yacht they own.
    POST — only customers create bookings.  The new booking is in
           ``pending_owner`` status until the owner confirms or declines.
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):  # type: ignore[override]
        if self.request.method == "POST":
            return BookingCreateSerializer
        return BookingListSerializer

    def get_queryset(self):  # type: ignore[override]
        user = self.request.user
        base = Booking.objects.select_related(
            "yacht", "customer", "region", "departure_port",
        )
        if getattr(user, "role", None) == UserRole.OWNER:
            return base.filter(yacht__owner=user).order_by("-created_at")
        return base.filter(customer=user).order_by("-created_at")

    def create(self, request: Request, *args, **kwargs) -> Response:  # type: ignore[override]
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        yacht = get_object_or_404(
            Yacht.objects.select_related("region"),
            id=data["yacht_id"],
            status="active",
            is_deleted=False,
        )
        departure_port = get_object_or_404(
            DeparturePort, id=data["departure_port_id"],
        )

        if data["num_passengers"] > yacht.capacity:
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": (
                            f"num_passengers ({data['num_passengers']}) exceeds "
                            f"yacht capacity ({yacht.capacity})."
                        ),
                        "field": "num_passengers",
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking = BookingService.create_booking(
            yacht=yacht,
            customer=request.user,
            start_date=data["start_date"],
            end_date=data["end_date"],
            num_passengers=data["num_passengers"],
            departure_port=departure_port,
        )
        # Refetch with prefetched events so the timeline appears in the response.
        booking = (
            Booking.objects.select_related(
                "yacht", "customer", "region", "departure_port",
            )
            .prefetch_related("events__actor")
            .get(id=booking.id)
        )
        return Response(
            BookingDetailSerializer(booking).data,
            status=status.HTTP_201_CREATED,
        )


class BookingDetailView(generics.RetrieveAPIView):  # type: ignore[type-arg]
    """GET /api/v1/bookings/{id}/ — visible to the booking customer or yacht owner."""

    permission_classes = [IsAuthenticated]
    serializer_class = BookingDetailSerializer
    lookup_field = "id"

    def get_queryset(self):  # type: ignore[override]
        user = self.request.user
        base = (
            Booking.objects.select_related(
                "yacht", "customer", "region", "departure_port",
            )
            .prefetch_related("events__actor")
        )
        if getattr(user, "role", None) == UserRole.OWNER:
            return base.filter(yacht__owner=user)
        return base.filter(customer=user)


class _BookingTransitionView(APIView):
    """Shared logic for the four PATCH transition endpoints.

    Subclasses override ``_get_booking()`` and ``_perform()``.  The view
    catches ``BookingTransitionError`` and returns 409 with the standard
    error envelope.
    """

    permission_classes = [IsAuthenticated]

    def _get_booking(self, request: Request, id) -> Booking:
        raise NotImplementedError

    def _perform(self, request: Request, booking: Booking) -> Booking:
        raise NotImplementedError

    def patch(self, request: Request, id) -> Response:
        booking = self._get_booking(request, id)
        try:
            booking = self._perform(request, booking)
        except BookingTransitionError as exc:
            return Response(
                {
                    "error": {
                        "code": "INVALID_TRANSITION",
                        "message": str(exc),
                    },
                },
                status=status.HTTP_409_CONFLICT,
            )
        booking = (
            Booking.objects.select_related(
                "yacht", "customer", "region", "departure_port",
            )
            .prefetch_related("events__actor")
            .get(id=booking.id)
        )
        return Response(BookingDetailSerializer(booking).data)


class BookingConfirmView(_BookingTransitionView):
    """PATCH /api/v1/bookings/{id}/confirm/ — owner confirms (pending_owner → confirmed)."""

    def _get_booking(self, request, id) -> Booking:
        return get_object_or_404(Booking, id=id, yacht__owner=request.user)

    def _perform(self, request, booking) -> Booking:
        return BookingService.confirm(booking, actor=request.user)


class BookingDeclineView(_BookingTransitionView):
    """PATCH /api/v1/bookings/{id}/decline/ — owner declines (pending_owner → declined)."""

    def _get_booking(self, request, id) -> Booking:
        return get_object_or_404(Booking, id=id, yacht__owner=request.user)

    def _perform(self, request, booking) -> Booking:
        reason = (request.data or {}).get("reason", "")
        return BookingService.decline(booking, actor=request.user, reason=reason)


class BookingCancelView(_BookingTransitionView):
    """PATCH /api/v1/bookings/{id}/cancel/ — customer cancels their own booking."""

    def _get_booking(self, request, id) -> Booking:
        return get_object_or_404(Booking, id=id, customer=request.user)

    def _perform(self, request, booking) -> Booking:
        return BookingService.cancel(booking, actor=request.user)


# ---------------------------------------------------------------------------
# Yacht availability — calendar view + owner upsert
# ---------------------------------------------------------------------------


class YachtAvailabilityView(APIView):
    """GET (public) and PUT (yacht owner only) the 60-day availability calendar."""

    def get_permissions(self):  # type: ignore[override]
        if self.request.method == "PUT":
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request: Request, id) -> Response:
        yacht = get_object_or_404(
            Yacht, id=id, status="active", is_deleted=False,
        )
        today = datetime.date.today()
        end = today + datetime.timedelta(days=60)
        records = (
            Availability.objects.filter(
                yacht=yacht,
                date__gte=today,
                date__lte=end,
            )
            .order_by("date")
        )
        return Response(AvailabilitySerializer(records, many=True).data)

    def put(self, request: Request, id) -> Response:
        yacht = get_object_or_404(Yacht, id=id, owner=request.user, is_deleted=False)
        serializer = AvailabilityWriteSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        results = []
        for item in serializer.validated_data:
            obj, _ = Availability.objects.update_or_create(
                yacht=yacht,
                date=item["date"],
                defaults={
                    "status": item["status"],
                    "price_override": item.get("price_override"),
                    "notes": item.get("notes", ""),
                },
            )
            results.append(obj)
        return Response(AvailabilitySerializer(results, many=True).data)


# ---------------------------------------------------------------------------
# Sprint 9C — Month-based yacht availability calendar
# ---------------------------------------------------------------------------


class YachtMonthAvailabilityView(APIView):
    """GET /api/v1/bookings/yachts/{yacht_id}/availability/?month=YYYY-MM

    Public endpoint — no authentication required.  Returns a day-keyed dict
    with open / booked / blocked / limited status for every day in the
    requested month, plus the yacht's base pricing.

    Status priority (highest wins for a day):
      1. blocked  — BlockedDate row exists for this yacht+date
      2. booked   — any Booking with status in (confirmed, pending_owner)
                    whose range covers the date
      3. limited  — confirmed booking count on this day == yacht.capacity - 1
                    (one passenger slot left; only applies when capacity > 0)
      4. open     — no conflicts

    Currency is resolved from the yacht's departure_port region if available,
    then from yacht.currency directly, then falls back to 'EGP' as last resort.
    (ADR-018: never hardcode currency except as final fallback per the spec comment.)
    """

    permission_classes = [AllowAny]

    def get(self, request: Request, yacht_id) -> Response:
        yacht = get_object_or_404(
            Yacht.objects.select_related("departure_port__region", "region"),
            id=yacht_id,
            is_deleted=False,
        )

        # Parse ?month=YYYY-MM, default to current month on invalid/absent value.
        month_param = request.query_params.get("month", "")
        try:
            parsed = datetime.datetime.strptime(month_param, "%Y-%m")
            year, month = parsed.year, parsed.month
        except (ValueError, TypeError):
            today = datetime.date.today()
            year, month = today.year, today.month

        # Build the list of all calendar days in the requested month.
        _, days_in_month = calendar.monthrange(year, month)
        month_start = datetime.date(year, month, 1)
        month_end = datetime.date(year, month, days_in_month)

        # Fetch all bookings whose range overlaps with this month in one query.
        # A booking overlaps if: start_date <= month_end AND end_date >= month_start
        active_statuses = (
            BookingStatus.CONFIRMED,
            BookingStatus.PENDING_OWNER,
        )
        bookings = list(
            Booking.objects.filter(
                yacht=yacht,
                status__in=active_statuses,
                start_date__lte=month_end,
                end_date__gte=month_start,
            ).values("start_date", "end_date", "status")
        )

        # Fetch all blocked dates for this yacht within the month.
        blocked_dates = set(
            BlockedDate.objects.filter(
                yacht=yacht,
                date__gte=month_start,
                date__lte=month_end,
            ).values_list("date", flat=True)
        )

        # Build per-day booking count maps.
        # confirmed_count — number of confirmed bookings covering a day (for capacity math)
        # active_days     — days covered by any confirmed OR pending_owner booking
        confirmed_count: dict[datetime.date, int] = {}
        active_days: set[datetime.date] = set()

        for b in bookings:
            # Clamp booking range to month boundaries for iteration efficiency.
            b_start = max(b["start_date"], month_start)
            b_end = min(b["end_date"], month_end)
            current = b_start
            while current <= b_end:
                active_days.add(current)
                if b["status"] == BookingStatus.CONFIRMED:
                    confirmed_count[current] = confirmed_count.get(current, 0) + 1
                current += datetime.timedelta(days=1)

        # Determine status for each day in the month.
        # Priority (highest wins):
        #   1. blocked — BlockedDate row exists
        #   2. limited — capacity > 0 AND confirmed_count == capacity - 1 (one slot left)
        #                This takes priority over generic "booked" so the UI can show
        #                "last slot" even when the day has other active bookings.
        #   3. booked  — any Booking (confirmed or pending_owner) covers the date
        #   4. open    — no conflicts
        days: dict[str, str] = {}
        capacity = yacht.capacity or 0

        for day_num in range(1, days_in_month + 1):
            day = datetime.date(year, month, day_num)
            day_str = day.isoformat()
            cnt = confirmed_count.get(day, 0)

            if day in blocked_dates:
                days[day_str] = "blocked"
            elif capacity > 0 and cnt == capacity - 1:
                # Exactly one slot remaining — surface as limited for the UI
                days[day_str] = "limited"
            elif day in active_days:
                days[day_str] = "booked"
            else:
                days[day_str] = "open"

        # Resolve currency (ADR-018: from region, not hardcoded).
        currency = "EGP"  # last-resort fallback only
        if hasattr(yacht, "departure_port") and yacht.departure_port_id:
            dp = yacht.departure_port
            if hasattr(dp, "region") and dp.region_id:
                currency = dp.region.currency
            elif yacht.currency:
                currency = yacht.currency
        elif yacht.currency:
            currency = yacht.currency

        return Response(
            {
                "yacht_id": str(yacht.id),
                "month": f"{year:04d}-{month:02d}",
                "days": days,
                "pricing": {
                    "base_price": str(yacht.price_per_day),
                    "currency": currency,
                },
            }
        )


# ---------------------------------------------------------------------------
# Admin — KYC / operations portal views
# ---------------------------------------------------------------------------


class AdminYachtListView(generics.ListAPIView):  # type: ignore[type-arg]
    """GET /api/v1/admin/yachts/ — all yachts including drafts for admin review.

    Returns every yacht regardless of status (draft, active, inactive) and
    including soft-deleted records so admins have full visibility.

    Query parameters:
        status — filter by YachtStatus value (draft, active, inactive).

    Requires: Django admin role (is_staff=True).
    Pagination: CursorPagination (ADR-013), 20 per page, ordered by -created_at.
    """

    permission_classes = [IsAdminUser]
    pagination_class = SeaConnectCursorPagination

    def get_queryset(self):  # type: ignore[override]
        qs = (
            Yacht.objects.select_related("owner", "region", "departure_port")
            .prefetch_related("media")
            .order_by("-created_at")
        )

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs

    def get_serializer_class(self):  # type: ignore[override]
        from apps.bookings.serializers import YachtListSerializer
        return YachtListSerializer


# ---------------------------------------------------------------------------
# Sprint 12A — Yacht photo upload / delete
# ---------------------------------------------------------------------------


def _build_photo_upload_path(yacht_id: str, filename: str) -> str:
    """Return a deterministic, collision-resistant storage path for a yacht photo.

    Pattern: ``yachts/{yacht_id}/photos/{uuid4}{ext}``

    The original filename is discarded to avoid path traversal and to ensure
    uniqueness.  The file extension is preserved so the storage backend can
    serve the correct Content-Type.
    """
    ext = os.path.splitext(filename)[1].lower()
    return f"yachts/{yacht_id}/photos/{uuid_module.uuid4()}{ext}"


class YachtPhotoUploadView(APIView):
    """POST /api/v1/yachts/{id}/photos/

    Upload a photo for a yacht.  The caller must be the yacht's owner.

    Steps:
      1. Validate the uploaded file (type + size) via ``YachtPhotoUploadSerializer``.
      2. Save the file to ``default_storage`` (FileSystem in dev, S3/R2 in prod).
      3. Create a ``YachtMedia`` row with the public URL.
      4. If ``is_cover=True``, clear ``is_primary`` on all other media for this
         yacht in the same atomic transaction.

    Returns 201 with the new YachtMedia record.

    ADR-010: ``default_storage.save`` is used; the storage backend is
    determined at runtime by the ``USE_S3`` setting — views never import
    S3Boto3Storage directly.
    """

    permission_classes = [IsAuthenticated, IsOwnerRole]
    parser_classes = [MultiPartParser]

    def post(self, request: Request, id) -> Response:
        # Ownership check — only the yacht's owner may upload photos.
        yacht = get_object_or_404(
            Yacht.objects.select_related("owner"),
            id=id,
            is_deleted=False,
        )
        if yacht.owner_id != request.user.id:
            return Response(
                {
                    "error": {
                        "code": "ERR_PERMISSION_DENIED",
                        "message": "You do not own this yacht.",
                    }
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = YachtPhotoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file = serializer.validated_data["file"]
        is_cover: bool = serializer.validated_data["is_cover"]

        # Save to storage backend (ADR-010 — never reference S3Boto3Storage directly).
        upload_path = _build_photo_upload_path(str(yacht.id), file.name)
        saved_name = default_storage.save(upload_path, file)
        file_url = default_storage.url(saved_name)

        with transaction.atomic():
            if is_cover:
                # Clear existing primary flags before setting the new one.
                YachtMedia.objects.filter(yacht=yacht, is_primary=True).update(is_primary=False)

            media = YachtMedia.objects.create(
                yacht=yacht,
                url=file_url,
                media_type="image",
                is_primary=is_cover,
                order=YachtMedia.objects.filter(yacht=yacht).count(),
            )

        return Response(
            YachtPhotoResponseSerializer(media).data,
            status=status.HTTP_201_CREATED,
        )


class YachtPhotoDeleteView(APIView):
    """DELETE /api/v1/yachts/{id}/photos/{photo_id}/

    Hard-delete a single yacht photo.  The caller must be the yacht's owner.

    Steps:
      1. Verify yacht ownership.
      2. Delete the file from ``default_storage`` (best-effort; does not fail
         the request if the file is already gone from storage).
      3. Hard-delete the ``YachtMedia`` row.

    Returns 204 No Content on success.
    """

    permission_classes = [IsAuthenticated, IsOwnerRole]

    def delete(self, request: Request, id, photo_id) -> Response:
        yacht = get_object_or_404(
            Yacht.objects.select_related("owner"),
            id=id,
            is_deleted=False,
        )
        if yacht.owner_id != request.user.id:
            return Response(
                {
                    "error": {
                        "code": "ERR_PERMISSION_DENIED",
                        "message": "You do not own this yacht.",
                    }
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        media = get_object_or_404(YachtMedia, id=photo_id, yacht=yacht)

        # Best-effort: delete from storage. If the file is already missing,
        # we still want to remove the DB row so the client is not stuck.
        try:
            if default_storage.exists(media.url):
                default_storage.delete(media.url)
        except Exception:
            pass

        media.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
