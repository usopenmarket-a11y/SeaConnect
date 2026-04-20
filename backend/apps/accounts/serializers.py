"""Serializers for the accounts app.

Includes a custom JWT token serializer that embeds user role and region
in the token payload — useful for the frontend to avoid an extra /me call.
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


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
