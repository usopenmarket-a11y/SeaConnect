from django.urls import path

from .views import (
    AdminDisputeListView,
    AdminDisputeResolveView,
    AdminYachtListView,
    BookingCancelView,
    BookingConfirmView,
    BookingDeclineView,
    BookingDetailView,
    BookingListCreateView,
    DisputeCreateView,
    OwnerReviewsListView,
    YachtAvailabilityView,
    YachtListCreateView,
    YachtMonthAvailabilityView,
    YachtPhotoDeleteView,
    YachtPhotoUploadView,
    YachtPricingInsightView,
    YachtRetrieveUpdateView,
    YachtReviewListCreateView,
    YachtSemanticSearchView,
)

app_name = "bookings"

urlpatterns = [
    # Sprint 13C — semantic search (must be before yacht-list to avoid UUID clash)
    path("yachts/search/", YachtSemanticSearchView.as_view(), name="yacht-search"),
    # Sprint 12A — owner reviews list (MUST be before <uuid:yacht_id> pattern)
    path("yachts/reviews/", OwnerReviewsListView.as_view(), name="owner-reviews-list"),
    # Sprint 2 / Sprint 10A — yachts (public GET, owner POST/PATCH)
    path("yachts/", YachtListCreateView.as_view(), name="yacht-list"),
    path("yachts/<uuid:id>/", YachtRetrieveUpdateView.as_view(), name="yacht-detail"),
    path(
        "yachts/<uuid:id>/availability/",
        YachtAvailabilityView.as_view(),
        name="yacht-availability",
    ),
    # Sprint 16A — AI pricing insight (owner only, cached 24h)
    path(
        "yachts/<uuid:yacht_id>/pricing-insight/",
        YachtPricingInsightView.as_view(),
        name="yacht-pricing-insight",
    ),
    # Sprint 12A — yacht reviews (customer GET/POST per yacht)
    path(
        "yachts/<uuid:yacht_id>/reviews/",
        YachtReviewListCreateView.as_view(),
        name="yacht-reviews",
    ),
    # Sprint 12A — yacht photo upload / delete
    path(
        "yachts/<uuid:id>/photos/",
        YachtPhotoUploadView.as_view(),
        name="yacht-photo-upload",
    ),
    path(
        "yachts/<uuid:id>/photos/<uuid:photo_id>/",
        YachtPhotoDeleteView.as_view(),
        name="yacht-photo-delete",
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
    # Sprint 13B — dispute: customer/owner creates a dispute on a booking
    path(
        "bookings/<uuid:booking_id>/dispute/",
        DisputeCreateView.as_view(),
        name="booking-dispute-create",
    ),
    # Admin — KYC / operations portal
    path("admin/yachts/", AdminYachtListView.as_view(), name="admin-yacht-list"),
    # Sprint 13B — admin dispute management
    path("admin/disputes/", AdminDisputeListView.as_view(), name="admin-dispute-list"),
    path(
        "admin/disputes/<uuid:id>/resolve/",
        AdminDisputeResolveView.as_view(),
        name="admin-dispute-resolve",
    ),
]
