from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.core.pagination import SeaConnectCursorPagination

from .models import BoatOwnerProfile, KYCStatus, User
from .permissions import IsAdminUser as IsAdminRole
from .permissions import IsOwner
from .serializers import (
    AdminKYCRejectSerializer,
    AdminKYCSerializer,
    AdminUserSerializer,
    BoatOwnerProfileSerializer,
    RegisterSerializer,
    UserProfileSerializer,
)


class RegisterView(generics.CreateAPIView):  # type: ignore[type-arg]
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user: User = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserProfileSerializer(user).data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )


LoginView = TokenObtainPairView


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": {"code": "MISSING_REFRESH_TOKEN", "message": "Refresh token is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            return Response(
                {"error": {"code": "INVALID_TOKEN", "message": "Token is invalid or already blacklisted."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserMeView(generics.RetrieveUpdateAPIView):  # type: ignore[type-arg]
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self) -> User:
        return self.request.user  # type: ignore[return-value]


class AdminUserListView(generics.ListAPIView):  # type: ignore[type-arg]
    """GET /api/v1/admin/users/ — paginated user list for the admin portal.

    Query parameters:
        role   — filter by UserRole value (customer, owner, vendor, admin).
        search — case-insensitive email substring match.

    Requires: Django admin role (is_staff=True).
    Pagination: CursorPagination (ADR-013), 20 per page, ordered by -created_at.
    """

    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]
    pagination_class = SeaConnectCursorPagination

    def get_queryset(self):  # type: ignore[override]
        qs = User.objects.select_related("region").order_by("-created_at")

        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(email__icontains=search)

        return qs


# ---------------------------------------------------------------------------
# Sprint 10C: BoatOwnerProfile + KYC admin endpoints
# ---------------------------------------------------------------------------


class OwnerProfileView(APIView):
    """GET /api/v1/accounts/owner-profile/

    Returns the authenticated owner's BoatOwnerProfile, creating one lazily
    if it does not exist yet (first visit to the owner portal).

    Requires: IsAuthenticated + role == 'owner'.
    """

    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request: Request) -> Response:
        profile, _ = BoatOwnerProfile.objects.get_or_create(user=request.user)
        serializer = BoatOwnerProfileSerializer(profile)
        return Response(serializer.data)


class OwnerProfileSubmitView(APIView):
    """POST /api/v1/accounts/owner-profile/submit/

    Transitions the profile from NOT_STARTED or IN_PROGRESS to SUBMITTED.
    Returns 409 if already submitted, approved, or rejected.

    Requires: IsAuthenticated + role == 'owner'.
    """

    permission_classes = [IsAuthenticated, IsOwner]

    # Valid statuses that can transition to SUBMITTED.
    _SUBMITTABLE = {KYCStatus.NOT_STARTED, KYCStatus.IN_PROGRESS}

    def post(self, request: Request) -> Response:
        profile, _ = BoatOwnerProfile.objects.get_or_create(user=request.user)

        if profile.kyc_status not in self._SUBMITTABLE:
            return Response(
                {
                    "error": {
                        "code": "INVALID_KYC_TRANSITION",
                        "message": (
                            f"Cannot submit from status '{profile.kyc_status}'. "
                            "Only 'not_started' and 'in_progress' profiles can be submitted."
                        ),
                    }
                },
                status=status.HTTP_409_CONFLICT,
            )

        profile.kyc_status = KYCStatus.SUBMITTED
        profile.save(update_fields=["kyc_status", "updated_at"])
        serializer = BoatOwnerProfileSerializer(profile)
        return Response(serializer.data)


class AdminKYCListView(generics.ListAPIView):  # type: ignore[type-arg]
    """GET /api/v1/admin/kyc/

    Lists all BoatOwnerProfile rows whose kyc_status is 'submitted'.
    Admin portal KYC review queue.

    Requires: role == 'admin'.
    Pagination: CursorPagination (ADR-013).
    """

    serializer_class = AdminKYCSerializer
    permission_classes = [IsAdminRole]
    pagination_class = SeaConnectCursorPagination

    def get_queryset(self):  # type: ignore[override]
        return (
            BoatOwnerProfile.objects.select_related("user")
            .filter(kyc_status=KYCStatus.SUBMITTED, is_deleted=False)
            .order_by("-created_at")
        )


class AdminKYCApproveView(APIView):
    """POST /api/v1/admin/kyc/{id}/approve/

    Transitions a submitted BoatOwnerProfile to 'approved'.
    Sets reviewed_by to the acting admin and reviewed_at to now.

    Requires: role == 'admin'.
    """

    permission_classes = [IsAdminRole]

    def post(self, request: Request, id: str) -> Response:
        profile = get_object_or_404(
            BoatOwnerProfile.objects.select_related("user"),
            id=id,
            is_deleted=False,
        )

        if profile.kyc_status != KYCStatus.SUBMITTED:
            return Response(
                {
                    "error": {
                        "code": "INVALID_KYC_TRANSITION",
                        "message": (
                            f"Cannot approve a profile with status '{profile.kyc_status}'. "
                            "Only 'submitted' profiles can be approved."
                        ),
                    }
                },
                status=status.HTTP_409_CONFLICT,
            )

        profile.kyc_status = KYCStatus.APPROVED
        profile.reviewed_by = request.user  # type: ignore[assignment]
        profile.reviewed_at = timezone.now()
        profile.rejection_reason = ""
        profile.save(update_fields=["kyc_status", "reviewed_by", "reviewed_at", "rejection_reason", "updated_at"])
        serializer = AdminKYCSerializer(profile)
        return Response(serializer.data)


class AdminKYCRejectView(APIView):
    """POST /api/v1/admin/kyc/{id}/reject/

    Transitions a submitted BoatOwnerProfile to 'rejected'.
    Requires a rejection_reason in the request body (minimum 10 chars).
    Sets reviewed_by and reviewed_at.

    Requires: role == 'admin'.
    """

    permission_classes = [IsAdminRole]

    def post(self, request: Request, id: str) -> Response:
        profile = get_object_or_404(
            BoatOwnerProfile.objects.select_related("user"),
            id=id,
            is_deleted=False,
        )

        if profile.kyc_status != KYCStatus.SUBMITTED:
            return Response(
                {
                    "error": {
                        "code": "INVALID_KYC_TRANSITION",
                        "message": (
                            f"Cannot reject a profile with status '{profile.kyc_status}'. "
                            "Only 'submitted' profiles can be rejected."
                        ),
                    }
                },
                status=status.HTTP_409_CONFLICT,
            )

        serializer = AdminKYCRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        profile.kyc_status = KYCStatus.REJECTED
        profile.reviewed_by = request.user  # type: ignore[assignment]
        profile.reviewed_at = timezone.now()
        profile.rejection_reason = serializer.validated_data["rejection_reason"]
        profile.save(
            update_fields=["kyc_status", "reviewed_by", "reviewed_at", "rejection_reason", "updated_at"]
        )
        serializer_out = AdminKYCSerializer(profile)
        return Response(serializer_out.data)
