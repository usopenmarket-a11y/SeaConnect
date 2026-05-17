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
    CompetitionEntryResultSerializer,
    CompetitionEntrySerializer,
    CompetitionListSerializer,
    MyEntrySerializer,
)


class CompetitionPagination(CursorPagination):
    page_size = 20
    ordering = "-start_date"


class EntryPagination(CursorPagination):
    page_size = 20
    ordering = "-created_at"


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
    pagination_class = EntryPagination

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
                "user_name": entry.user.full_name or entry.user.email,
                "total_weight_kg": str(entry.total_weight or 0),
                "catch_count": entry.catch_count,
            }
            for rank, entry in enumerate(entries, 1)
        ]
        return Response({"results": data, "competition_id": str(id)})


# ---------------------------------------------------------------------------
# Sprint 13E — new endpoints: /register/, /results/, /my-entry/
# ---------------------------------------------------------------------------


class RegisterView(APIView):
    """POST /api/v1/competitions/<id>/register/

    Authenticated users register for a competition.

    Guard order:
      1. Competition must be status=OPEN
      2. registration_deadline must not have passed
      3. confirmed participant count must be below max_participants
      4. User must not already have an entry (returns 409)
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        competition = get_object_or_404(Competition, id=id)

        if competition.status != Competition.Status.OPEN:
            return Response(
                {
                    "error": "Competition is not accepting registrations",
                    "code": "REGISTRATION_CLOSED",
                    "detail": {"status": competition.status},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if competition.registration_deadline < timezone.now():
            return Response(
                {
                    "error": "Registration deadline has passed",
                    "code": "REGISTRATION_CLOSED",
                    "detail": {"deadline": competition.registration_deadline.isoformat()},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        confirmed_count = competition.entries.filter(
            status=CompetitionEntry.Status.CONFIRMED
        ).count()
        if confirmed_count >= competition.max_participants:
            return Response(
                {
                    "error": "Competition has reached its maximum number of participants",
                    "code": "COMPETITION_FULL",
                    "detail": {"max_participants": competition.max_participants},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check duplicate before get_or_create to return 409 not 400
        if CompetitionEntry.objects.filter(
            competition=competition, user=request.user
        ).exists():
            return Response(
                {
                    "error": "You are already registered for this competition",
                    "code": "ALREADY_REGISTERED",
                    "detail": {},
                },
                status=status.HTTP_409_CONFLICT,
            )

        entry = CompetitionEntry.objects.create(
            competition=competition,
            user=request.user,
            status=CompetitionEntry.Status.REGISTERED,
        )
        return Response(
            MyEntrySerializer(entry).data,
            status=status.HTTP_201_CREATED,
        )


class ResultsView(APIView):
    """GET /api/v1/competitions/<id>/results/

    Public endpoint returning the competition leaderboard.

    If the competition has not yet ended (end_date is in the future),
    returns an empty list with status='upcoming'.
    Results are ordered by rank (nulls last) then catch_weight descending.
    Falls back to CatchLog sum when rank/catch_weight not set on entries.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, id):
        competition = get_object_or_404(Competition, id=id)
        today = timezone.now().date()

        if competition.end_date > today:
            return Response(
                {
                    "status": "upcoming",
                    "results": [],
                    "competition_id": str(id),
                },
                status=status.HTTP_200_OK,
            )

        entries = (
            CompetitionEntry.objects.filter(competition=competition)
            .exclude(status=CompetitionEntry.Status.WITHDRAWN)
            .annotate(
                total_weight=Sum("catches__weight_kg"),
                catch_count=Count("catches"),
            )
            .select_related("user")
            .order_by("rank", "-catch_weight", "-total_weight")
        )

        serializer = CompetitionEntryResultSerializer(entries, many=True)
        return Response(
            {
                "status": "completed",
                "results": serializer.data,
                "competition_id": str(id),
            },
            status=status.HTTP_200_OK,
        )


class MyEntryView(APIView):
    """GET /api/v1/competitions/<id>/my-entry/

    Returns the authenticated user's entry for the specified competition.
    Returns 404 if the user has not registered.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        competition = get_object_or_404(Competition, id=id)
        entry = get_object_or_404(
            CompetitionEntry.objects.select_related("competition", "user"),
            competition=competition,
            user=request.user,
        )
        return Response(MyEntrySerializer(entry).data, status=status.HTTP_200_OK)
