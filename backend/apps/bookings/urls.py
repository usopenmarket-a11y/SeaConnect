from django.urls import path

from .views import (
    AdminYachtListView,
    BookingCancelView,
    BookingConfirmView,
    BookingDeclineView,
    BookingDetailView,
    BookingListCreateView,
    YachtAvailabilityView,
    YachtListCreateView,
    YachtMonthAvailabilityView,
    YachtRetrieveUpdateView,
)

app_name = "bookings"

urlpatterns = [
    # Sprint 2 / Sprint 10A — yachts (public GET, owner POST/PATCH)
    path("yachts/", YachtListCreateView.as_view(), name="yacht-list"),
    path("yachts/<uuid:id>/", YachtRetrieveUpdateView.as_view(), name="yacht-detail"),
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
    # Sprint 9C — month-based availability calendar
    path(
        "bookings/yachts/<uuid:yacht_id>/availability/",
        YachtMonthAvailabilityView.as_view(),
        name="yacht-month-availability",
    ),
    # Admin — KYC / operations portal
    path("admin/yachts/", AdminYachtListView.as_view(), name="admin-yacht-list"),
]
