import os
import uuid as uuid_module

from django.core.files.storage import default_storage
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.core.pagination import SeaConnectCursorPagination
from apps.core.throttles import AuthAnonThrottle, AuthUserThrottle, UploadThrottle

from .models import BoatOwnerProfile, KYCDocument, KYCStatus, User, UserRole
from .permissions import IsAdminUser as IsAdminRole
from .permissions import IsOwner
from .serializers import (
    AdminKYCRejectSerializer,
    AdminKYCSerializer,
    AdminUserSerializer,
    BoatOwnerProfileSerializer,
    KYCDocumentUploadSerializer,
    OwnerProfileStepSerializer,
    RegisterSerializer,
    UserProfileSerializer,
    UserRoleUpdateSerializer,
)

# ---------------------------------------------------------------------------
# Sprint 11A: doc_type → step boolean field map
# ---------------------------------------------------------------------------

_DOC_TYPE_FIELD_MAP: dict[str, str] = {
    "identity": "national_id_verified",
    "boat_docs": "vessel_docs_verified",
    "insurance": "insurance_verified",
    "port_auth": "inspection_passed",
    "safety_cert": "inspection_passed",
    "bank_details": "bank_account_configured",
}


class RegisterView(generics.CreateAPIView):  # type: ignore[type-arg]
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    throttle_classes = [AuthAnonThrottle]

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


class LoginView(TokenObtainPairView):
    """POST /api/v1/auth/login/ — obtain JWT tokens.

    Subclasses simplejwt TokenObtainPairView solely to attach
    AuthAnonThrottle.  All login logic remains in the parent class.
    """

    throttle_classes = [AuthAnonThrottle]


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthUserThrottle]

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

    Requires: IsAdminRole (role=admin).
    Pagination: CursorPagination (ADR-013), 20 per page, ordered by -created_at.
    """

    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminRole]
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
# Sprint 13D: Admin user suspend/unsuspend/role-change endpoints
# ---------------------------------------------------------------------------


class AdminUserSuspendView(APIView):
    """POST /api/v1/admin/users/{id}/suspend/

    Sets is_active=False on the target user (soft suspension).
    Admins cannot suspend themselves or other admins.

    Requires: role == 'admin'.
    """

    permission_classes = [IsAdminRole]

    def post(self, request: Request, id: str) -> Response:
        user = get_object_or_404(User, id=id)

        if user == request.user:
            return Response(
                {
                    "error": {
                        "code": "CANNOT_SUSPEND_SELF",
                        "message": "An admin cannot suspend their own account.",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.role == UserRole.ADMIN:
            return Response(
                {
                    "error": {
                        "code": "CANNOT_SUSPEND_ADMIN",
                        "message": "Admin accounts cannot be suspended via the API.",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_active = False
        user.save(update_fields=["is_active", "updated_at"])

        serializer = AdminUserSerializer(user)
        return Response(serializer.data)


class AdminUserUnsuspendView(APIView):
    """POST /api/v1/admin/users/{id}/unsuspend/

    Sets is_active=True on the target user (re-activates account).

    Requires: role == 'admin'.
    """

    permission_classes = [IsAdminRole]

    def post(self, request: Request, id: str) -> Response:
        user = get_object_or_404(User, id=id)
        user.is_active = True
        user.save(update_fields=["is_active", "updated_at"])
        serializer = AdminUserSerializer(user)
        return Response(serializer.data)


class AdminUserRoleView(APIView):
    """PATCH /api/v1/admin/users/{id}/role/

    Reassigns a user's role to customer, owner, or vendor.
    Promotion to admin is intentionally disallowed here (requires DB access).

    Requires: role == 'admin'.
    """

    permission_classes = [IsAdminRole]

    def patch(self, request: Request, id: str) -> Response:
        user = get_object_or_404(User, id=id)

        if user == request.user:
            return Response(
                {
                    "error": {
                        "code": "CANNOT_CHANGE_OWN_ROLE",
                        "message": "An admin cannot change their own role.",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = UserRoleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user.role = serializer.validated_data["role"]
        user.save(update_fields=["role", "updated_at"])

        out_serializer = AdminUserSerializer(user)
        return Response(out_serializer.data)


# ---------------------------------------------------------------------------
# Sprint 10C: BoatOwnerProfile + KYC admin endpoints
# ---------------------------------------------------------------------------


class OwnerProfileView(APIView):
    """GET/PATCH /api/v1/accounts/owner-profile/

    GET  — Returns the authenticated owner's BoatOwnerProfile, creating one
           lazily if it does not exist yet (first visit to the owner portal).

    PATCH — Sprint 10D: allows the owner to mark individual KYC steps as
            ready by setting step boolean fields to True.  kyc_status
            transitions must go through the /submit/ endpoint instead.
            Only the six step booleans are writable; all other profile
            fields are ignored.

    Requires: IsAuthenticated + role == 'owner'.
    """

    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request: Request) -> Response:
        profile, _ = BoatOwnerProfile.objects.get_or_create(user=request.user)
        serializer = BoatOwnerProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request: Request) -> Response:
        profile, _ = BoatOwnerProfile.objects.get_or_create(user=request.user)

        # Refuse writes once the application has left the editable window
        if profile.kyc_status in (KYCStatus.SUBMITTED, KYCStatus.APPROVED):
            return Response(
                {
                    "error": {
                        "code": "ERR_NOT_EDITABLE",
                        "message": (
                            f"Profile with status '{profile.kyc_status}' cannot be modified. "
                            "Contact support if you need to update your documents."
                        ),
                    }
                },
                status=status.HTTP_409_CONFLICT,
            )

        serializer = OwnerProfileStepSerializer(
            profile, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        updated_fields = list(serializer.validated_data.keys()) + ["updated_at"]

        # Promote status from NOT_STARTED to IN_PROGRESS on first edit
        if profile.kyc_status == KYCStatus.NOT_STARTED and serializer.validated_data:
            profile.kyc_status = KYCStatus.IN_PROGRESS
            updated_fields.append("kyc_status")

        for field, value in serializer.validated_data.items():
            setattr(profile, field, value)

        profile.save(update_fields=updated_fields)

        read_serializer = BoatOwnerProfileSerializer(profile)
        return Response(read_serializer.data)


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


# ---------------------------------------------------------------------------
# Sprint 11A: KYC document upload
# ---------------------------------------------------------------------------


class KYCDocumentUploadView(APIView):
    """POST /api/v1/accounts/owner-profile/upload/

    Accepts a multipart/form-data upload containing:
        file     — the document file (PDF, JPEG, or PNG, max 10 MB)
        doc_type — one of: identity, boat_docs, insurance, port_auth,
                   safety_cert, bank_details

    On success:
      1. Saves the file to the configured storage backend (MinIO / R2) under
         the path ``kyc/<profile_id>/<doc_type>/<original_filename>``.
      2. Creates a KYCDocument record referencing the saved path.
      3. Flips the corresponding step boolean on BoatOwnerProfile to True.
      4. If the profile was NOT_STARTED, advances kyc_status to IN_PROGRESS.
      5. Returns document metadata and updated progress counters.

    Error codes:
        PROFILE_NOT_FOUND  — 404 if the authenticated user has no BoatOwnerProfile.
        FILE_TOO_LARGE     — 413 if the file exceeds 10 MB.
        INVALID_FILE_TYPE  — 400 if the MIME type is not PDF/JPEG/PNG.
        INVALID_DOC_TYPE   — 400 if doc_type is not in the allowed list.

    Requires: IsAuthenticated + role == 'owner'.
    Throttle: UploadThrottle (30/hour) — bandwidth and abuse protection.
    """

    permission_classes = [IsAuthenticated, IsOwner]
    parser_classes = [MultiPartParser]
    throttle_classes = [UploadThrottle]

    def post(self, request: Request) -> Response:
        # 1. Resolve the owner's profile — must already exist.
        try:
            profile = BoatOwnerProfile.objects.get(user=request.user, is_deleted=False)
        except BoatOwnerProfile.DoesNotExist:
            return Response(
                {"error": {"code": "PROFILE_NOT_FOUND", "message": "No owner profile found for this user."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 2. Validate request payload (file size, content-type, doc_type).
        serializer = KYCDocumentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            # Surface file-size errors as 413; everything else as 400.
            errors = serializer.errors
            file_errors = errors.get("file", [])
            if any(getattr(e, "code", None) == "FILE_TOO_LARGE" or str(e) == "FILE_TOO_LARGE" for e in file_errors):
                return Response(
                    {"error": {"code": "FILE_TOO_LARGE", "message": "File exceeds the 10 MB limit."}},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                )
            if any(getattr(e, "code", None) == "INVALID_FILE_TYPE" or str(e) == "INVALID_FILE_TYPE" for e in file_errors):
                return Response(
                    {"error": {"code": "INVALID_FILE_TYPE", "message": "Unsupported file type. Allowed: PDF, JPEG, PNG."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # doc_type choice validation
            return Response(
                {"error": {"code": "INVALID_DOC_TYPE", "message": "Invalid doc_type value.", "detail": errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        upload = serializer.validated_data["file"]
        doc_type: str = serializer.validated_data["doc_type"]

        # 3. Build storage path and persist the file.
        # SECURITY FIX (Sprint 15B): Discard the user-supplied filename to
        # prevent path traversal via crafted filenames (e.g. "../../../etc/passwd").
        # Use a UUID4 + extension pattern identical to yacht photo upload.
        ext = os.path.splitext(upload.name)[1].lower()
        safe_filename = f"{uuid_module.uuid4()}{ext}"
        storage_path = f"kyc/{profile.id}/{doc_type}/{safe_filename}"
        saved_path = default_storage.save(storage_path, upload)

        # 4. Create the KYCDocument record.
        doc = KYCDocument.objects.create(
            owner_profile=profile,
            doc_type=doc_type,
            file=saved_path,
        )

        # 5. Flip the step boolean and advance kyc_status if needed.
        step_field = _DOC_TYPE_FIELD_MAP.get(doc_type)
        update_fields = ["updated_at"]
        if step_field and not getattr(profile, step_field):
            setattr(profile, step_field, True)
            update_fields.append(step_field)

        if profile.kyc_status == KYCStatus.NOT_STARTED:
            profile.kyc_status = KYCStatus.IN_PROGRESS
            update_fields.append("kyc_status")

        profile.save(update_fields=update_fields)

        # 6. Build the public URL for the uploaded file.
        document_url = default_storage.url(saved_path) if default_storage.exists(saved_path) else saved_path

        return Response(
            {
                "document_url": document_url,
                "doc_type": doc_type,
                "completed_steps": profile.completed_steps,
                "kyc_status": profile.kyc_status,
            },
            status=status.HTTP_201_CREATED,
        )
