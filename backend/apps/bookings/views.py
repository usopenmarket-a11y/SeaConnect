from rest_framework import generics
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import AllowAny

from django_filters.rest_framework import DjangoFilterBackend

from .filters import YachtFilter
from .models import Yacht
from .serializers import YachtDetailSerializer, YachtListSerializer


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
