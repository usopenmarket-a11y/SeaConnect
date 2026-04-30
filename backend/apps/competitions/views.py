"""Views for the competitions app — Sprint 6."""
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CatchLog, Competition, CompetitionEntry
from .serializers import (
    CatchLogSerializer,
    CompetitionDetailSerializer,
    CompetitionEntrySerializer,
    CompetitionListSerializer,
)


class CompetitionPagination(CursorPagination):
    page_size = 20
    ordering = "-start_date"


class CompetitionListView(generics.ListAPIView):
    serializer_class = CompetitionListSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = CompetitionPagination

    def get_queryset(self):
        qs = Competition.objects.select_related("region").annotate(
            entry_count=Count(
                "entries", filter=Q(entries__status=CompetitionEntry.Status.CONFIRMED)
            )
        ).order_by("-start_date")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        region_filter = self.request.query_params.get("region")
        if region_filter:
            qs = qs.filter(region_id=region_filter)
        return qs


class CompetitionDetailView(generics.RetrieveAPIView):
    queryset = Competition.objects.select_related("region", "departure_port")
    serializer_class = CompetitionDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "id"


class CompetitionEnterView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        competition = get_object_or_404(Competition, id=id)

        if competition.status != Competition.Status.OPEN:
            return Response(
                {"error": {"code": "COMP_NOT_OPEN", "message": "Competition is not accepting entries"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if competition.registration_deadline < timezone.now():
            return Response(
                {"error": {"code": "DEADLINE_PASSED", "message": "Registration deadline has passed"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        confirmed_count = competition.entries.filter(
            status=CompetitionEntry.Status.CONFIRMED
        ).count()
        if confirmed_count >= competition.max_participants:
            return Response(
                {"error": {"code": "COMP_FULL", "message": "Competition is full"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        entry, created = CompetitionEntry.objects.get_or_create(
            competition=competition,
            user=request.user,
            defaults={"status": CompetitionEntry.Status.REGISTERED},
        )
        if not created:
            return Response(
                {"error": {"code": "ALREADY_ENTERED", "message": "Already registered for this competition"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(CompetitionEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class MyEntriesView(generics.ListAPIView):
    serializer_class = CompetitionEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CompetitionPagination

    def get_queryset(self):
        return CompetitionEntry.objects.filter(
            user=self.request.user
        ).select_related("competition").prefetch_related("catches").order_by("-created_at")


class CatchLogCreateView(generics.CreateAPIView):
    serializer_class = CatchLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        entry = get_object_or_404(
            CompetitionEntry,
            id=self.kwargs["entry_id"],
            user=self.request.user,
        )
        serializer.save(entry=entry)


class LeaderboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, id):
        competition = get_object_or_404(Competition, id=id)
        entries = (
            CompetitionEntry.objects.filter(
                competition=competition,
                status=CompetitionEntry.Status.CONFIRMED,
            )
            .annotate(
                total_weight=Sum("catches__weight_kg"),
                catch_count=Count("catches"),
            )
            .select_related("user")
            .order_by("-total_weight")[:20]
        )

        data = [
            {
                "rank": rank,
                "user_name": entry.user.get_full_name() or entry.user.email,
                "total_weight_kg": str(entry.total_weight or 0),
                "catch_count": entry.catch_count,
            }
            for rank, entry in enumerate(entries, 1)
        ]
        return Response({"results": data, "competition_id": str(id)})
