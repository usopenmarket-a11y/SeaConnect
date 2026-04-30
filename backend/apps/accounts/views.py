from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.core.pagination import SeaConnectCursorPagination

from .models import User
from .serializers import AdminUserSerializer, RegisterSerializer, UserProfileSerializer


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
