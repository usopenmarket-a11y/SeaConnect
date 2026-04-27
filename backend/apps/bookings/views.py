"""Bookings app views.

Sprint 2 — Yacht list / detail (public).
Sprint 3 — Booking CRUD + state transitions + per-yacht availability.

ADR compliance:
  ADR-001 — UUID PKs, ORM only.
  ADR-012 — All booking state mutations go through BookingService so the
            BookingEvent audit row is inserted in the same atomic transaction.
  ADR-013 — Cursor pagination on list endpoints.
  ADR-018 — Region FK + currency carried on every booking; never hardcoded.
"""
from __future__ import annotations

import datetime

from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import UserRole
from apps.core.models import DeparturePort

from .filters import YachtFilter
from .models import Availability, Booking, Yacht
from .serializers import (
    AvailabilitySerializer,
    AvailabilityWriteSerializer,
    BookingCreateSerializer,
    BookingDetailSerializer,
    BookingListSerializer,
    YachtDetailSerializer,
    YachtListSerializer,
)
from .services import BookingService, BookingTransitionError


# ---------------------------------------------------------------------------
# Sprint 2 — Yachts (public)
# ---------------------------------------------------------------------------


class YachtListView(generics.ListAPIView):  # type: ignore[type-arg]
    permission_classes = [AllowAny]
    serializer_class = YachtListSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = YachtFilter
    ordering_fields = ["price_per_day", "created_at", "capacity"]
    ordering = ["-created_at"]

    def get_queryset(self):  # type: ignore[override]
        return (
            Yacht.objects.filter(status="active", is_deleted=False)
            .select_related("departure_port", "region", "owner")
            .prefetch_related("media")
        )


class YachtDetailView(generics.RetrieveAPIView):  # type: ignore[type-arg]
    permission_classes = [AllowAny]
    serializer_class = YachtDetailSerializer
    lookup_field = "id"

    def get_queryset(self):  # type: ignore[override]
        return (
            Yacht.objects.filter(status="active", is_deleted=False)
            .select_related("departure_port", "region", "owner")
            .prefetch_related("media")
        )


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
