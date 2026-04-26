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

from .models import User, UserRole


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
