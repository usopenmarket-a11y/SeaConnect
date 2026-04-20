"""Views for the accounts app.

Stub — full implementation in Sprint 2.
Currently exposes only the /me endpoint (retrieve + update own profile).
JWT token endpoints are provided by djangorestframework-simplejwt directly.
"""
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .models import User
from .serializers import UserSerializer, UserUpdateSerializer


class MeView(generics.RetrieveUpdateAPIView):  # type: ignore[type-arg]
    """Retrieve or update the authenticated user's own profile."""

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):  # type: ignore[override]
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self) -> User:
        return self.request.user  # type: ignore[return-value]
