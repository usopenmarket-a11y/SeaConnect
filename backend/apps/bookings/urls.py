from django.urls import path

from .views import (
    BookingCancelView,
    BookingConfirmView,
    BookingDeclineView,
    BookingDetailView,
    BookingListCreateView,
    YachtAvailabilityView,
    YachtDetailView,
    YachtListView,
)

app_name = "bookings"

urlpatterns = [
    # Sprint 2 — public yachts
    path("yachts/", YachtListView.as_view(), name="yacht-list"),
    path("yachts/<uuid:id>/", YachtDetailView.as_view(), name="yacht-detail"),
    path(
        "yachts/<uuid:id>/availability/",
        YachtAvailabilityView.as_view(),
        name="yacht-availability",
    ),
    # Sprint 3 — bookings
    path("bookings/", BookingListCreateView.as_view(), name="booking-list-create"),
    path(
        "bookings/<uuid:id>/",
        BookingDetailView.as_view(),
        name="booking-detail",
    ),
    path(
        "bookings/<uuid:id>/confirm/",
        BookingConfirmView.as_view(),
        name="booking-confirm",
    ),
    path(
        "bookings/<uuid:id>/decline/",
        BookingDeclineView.as_view(),
        name="booking-decline",
    ),
    path(
        "bookings/<uuid:id>/cancel/",
        BookingCancelView.as_view(),
        name="booking-cancel",
    ),
]
