"""Serializers for the accounts app.

Includes a custom JWT token serializer that embeds user role and region
in the token payload — useful for the frontend to avoid an extra /me call.

Sprint 2 additions:
  - RegisterSerializer  — validates email uniqueness, hashes password, creates User
  - UserProfileSerializer — read/update current user profile
"""
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import BoatOwnerProfile, KYCDocument, User, UserRole


class UserSerializer(serializers.ModelSerializer[User]):
    """Read serializer for the User model.  Never exposes password hash."""

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "role",
            "auth_provider",
            "is_verified",
            "preferred_lang",
            "region",
            "created_at",
        ]
        read_only_fields = fields


class UserUpdateSerializer(serializers.ModelSerializer[User]):
    """Write serializer for user profile updates (excludes auth-sensitive fields)."""

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "phone",
            "preferred_lang",
            "fcm_token",
            "region",
        ]


class UserProfileSerializer(serializers.ModelSerializer[User]):
    """Read/update serializer for the authenticated user's own profile.

    id, email, role, and is_verified are always read-only.
    first_name, last_name, phone, and region are updatable via PATCH.
    """

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "is_verified",
            "preferred_lang",
            "region",
        ]
        read_only_fields = ["id", "email", "role", "is_verified"]


class RegisterSerializer(serializers.ModelSerializer[User]):
    """Validates and creates a new User account.

    - email must be unique (enforced by model, surfaced here for early feedback)
    - password is write-only and validated by Django's built-in password validators
    - role defaults to 'customer'; only 'customer' and 'owner' are accepted at registration
    - wraps create_user() in an atomic transaction
    """

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
        help_text="Minimum 8 characters.",
    )
    role = serializers.ChoiceField(
        choices=[UserRole.CUSTOMER, UserRole.OWNER, UserRole.VENDOR],
        default=UserRole.CUSTOMER,
        required=False,
    )

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "first_name",
            "last_name",
            "role",
        ]

    def validate_email(self, value: str) -> str:
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "A user with this email address already exists."
            )
        return value

    def validate_password(self, value: str) -> str:
        # Run Django's AUTH_PASSWORD_VALIDATORS against a throwaway User instance.
        validate_password(value, user=User())
        return value

    @transaction.atomic
    def create(self, validated_data: dict) -> User:  # type: ignore[override]
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role=validated_data.get("role", UserRole.CUSTOMER),
        )


class AdminUserSerializer(serializers.ModelSerializer[User]):
    """Read serializer for the admin user list endpoint.

    Exposes identity and status fields needed by the admin portal to review
    and manage users across all roles. region_name avoids a client-side join.
    """

    region_name = serializers.SerializerMethodField(
        help_text="English name of the user's home region, or null if unset.",
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_verified",
            "is_active",
            "created_at",
            "region_name",
        ]
        read_only_fields = fields

    def get_region_name(self, obj: User) -> str | None:
        """Return region.name_en if the user has a region FK, else None."""
        if obj.region_id and obj.region:
            return obj.region.name_en
        return None


# ---------------------------------------------------------------------------
# Sprint 10C: BoatOwnerProfile serializers
# ---------------------------------------------------------------------------


class KYCDocumentSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Read serializer for KYC document uploads."""

    class Meta:
        model = KYCDocument
        fields = ["id", "doc_type", "file", "uploaded_at"]
        read_only_fields = fields


class BoatOwnerProfileSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Read serializer for the owner's own BoatOwnerProfile.

    Exposes the full KYC state, per-step verification booleans, and
    computed progress properties.  All fields are read-only from the
    owner's perspective — the admin uses AdminKYCSerializer for writes.
    """

    completed_steps = serializers.IntegerField(read_only=True)
    total_steps = serializers.IntegerField(read_only=True)
    documents = KYCDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = BoatOwnerProfile
        fields = [
            "id",
            "kyc_status",
            "national_id_verified",
            "vessel_docs_verified",
            "captain_license_verified",
            "insurance_verified",
            "inspection_passed",
            "bank_account_configured",
            "completed_steps",
            "total_steps",
            "reviewed_at",
            "rejection_reason",
            "documents",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "kyc_status",
            "national_id_verified",
            "vessel_docs_verified",
            "captain_license_verified",
            "insurance_verified",
            "inspection_passed",
            "bank_account_configured",
            "reviewed_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]


class OwnerProfileStepSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Write serializer for Sprint 10D step-marking (PATCH).

    Allows the owner to flip individual step booleans to True via a
    PATCH to /api/v1/accounts/owner-profile/.  kyc_status is not writable
    here — use the /submit/ endpoint for that transition.

    Only accepts the six step boolean fields; all other profile fields are
    ignored.  Steps can only be set to True, never cleared back to False
    via this endpoint (idempotent-safe: setting True→True is a no-op).
    """

    class Meta:
        model = BoatOwnerProfile
        fields = [
            "national_id_verified",
            "vessel_docs_verified",
            "captain_license_verified",
            "insurance_verified",
            "inspection_passed",
            "bank_account_configured",
        ]

    def validate(self, attrs: dict) -> dict:  # type: ignore[override]
        """Prevent clearing a step that is already True."""
        for field, value in attrs.items():
            existing = getattr(self.instance, field, False)
            if existing and not value:
                raise serializers.ValidationError(
                    {field: "Cannot un-complete a step that is already marked ready."}
                )
        return attrs


class AdminKYCSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Read serializer for the admin KYC queue.

    Includes the owner's email and name so the admin portal can display
    identity without a separate user lookup.
    """

    owner_email = serializers.EmailField(source="user.email", read_only=True)
    owner_name = serializers.CharField(source="user.full_name", read_only=True)
    completed_steps = serializers.IntegerField(read_only=True)
    total_steps = serializers.IntegerField(read_only=True)

    class Meta:
        model = BoatOwnerProfile
        fields = [
            "id",
            "owner_email",
            "owner_name",
            "kyc_status",
            "national_id_verified",
            "vessel_docs_verified",
            "captain_license_verified",
            "insurance_verified",
            "inspection_passed",
            "bank_account_configured",
            "completed_steps",
            "total_steps",
            "reviewed_at",
            "rejection_reason",
            "created_at",
        ]
        read_only_fields = fields


class AdminKYCRejectSerializer(serializers.Serializer):  # type: ignore[type-arg]
    """Write serializer for the admin reject action.

    Only accepts ``rejection_reason`` — the status transition is handled
    by the view, never delegated to a serializer.
    """

    rejection_reason = serializers.CharField(
        min_length=10,
        help_text="Required rejection reason (minimum 10 characters).",
    )


class UserRoleUpdateSerializer(serializers.Serializer):  # type: ignore[type-arg]
    """Write serializer for PATCH /api/v1/admin/users/{id}/role/.

    Accepts only the ``role`` field. Admins can reassign any user to
    customer, owner, or vendor — not to admin (escalation requires DB access).
    """

    ASSIGNABLE_ROLES = [UserRole.CUSTOMER, UserRole.OWNER, UserRole.VENDOR]

    role = serializers.ChoiceField(
        choices=ASSIGNABLE_ROLES,
        help_text="New role: customer | owner | vendor",
    )


# ---------------------------------------------------------------------------
# Sprint 11A: KYC document upload serializer
# ---------------------------------------------------------------------------

ALLOWED_DOC_TYPES = [
    "identity",
    "boat_docs",
    "insurance",
    "port_auth",
    "safety_cert",
    "bank_details",
]

ALLOWED_CONTENT_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
]

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


class KYCDocumentUploadSerializer(serializers.Serializer):  # type: ignore[type-arg]
    """Write serializer for the KYC document upload endpoint.

    Validates file size, content-type, and doc_type before the view
    touches the storage backend.  All errors raised here surface
    through the standard DRF exception handler as 400 responses.

    Allowed doc_type values:
        identity, boat_docs, insurance, port_auth, safety_cert, bank_details

    Allowed content types:
        application/pdf, image/jpeg, image/jpg, image/png
    """

    file = serializers.FileField(
        help_text="The document file.  Maximum 10 MB.",
    )
    doc_type = serializers.ChoiceField(
        choices=ALLOWED_DOC_TYPES,
        help_text="Document category.  Must be one of: " + ", ".join(ALLOWED_DOC_TYPES),
    )

    def validate_file(self, value):  # type: ignore[override]
        if value.size > MAX_UPLOAD_SIZE:
            raise serializers.ValidationError(
                "FILE_TOO_LARGE",
                code="FILE_TOO_LARGE",
            )
        content_type = getattr(value, "content_type", None)
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise serializers.ValidationError(
                "INVALID_FILE_TYPE",
                code="INVALID_FILE_TYPE",
            )
        return value


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Extends the standard JWT serializer to embed role and region in the token.

    The frontend reads ``role`` from the decoded access token to determine
    which dashboard to show — avoiding a round-trip /me call on every page load.
    """

    @classmethod
    def get_token(cls, user: User) -> "CustomTokenObtainPairSerializer":  # type: ignore[override]
        token = super().get_token(user)
        # Custom claims embedded in the JWT payload.
        token["role"] = user.role
        token["email"] = user.email
        token["region_code"] = user.region.code if user.region else None
        return token  # type: ignore[return-value]
