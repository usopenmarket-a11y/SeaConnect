from django.urls import path

from .views import YachtDetailView, YachtListView

app_name = "bookings"

urlpatterns = [
    path("yachts/", YachtListView.as_view(), name="yacht-list"),
    path("yachts/<uuid:id>/", YachtDetailView.as_view(), name="yacht-detail"),
]
