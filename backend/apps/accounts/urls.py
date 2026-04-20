"""URL routes for the accounts app.

JWT obtain/refresh/verify endpoints use djangorestframework-simplejwt views.
Custom endpoints (register, /me, OTP) will be added in Sprint 2.
"""
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from . import views

app_name = "accounts"

urlpatterns = [
    # JWT token lifecycle
    path("auth/token/", TokenObtainPairView.as_view(), name="token-obtain"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/token/verify/", TokenVerifyView.as_view(), name="token-verify"),
    path("auth/token/blacklist/", TokenBlacklistView.as_view(), name="token-blacklist"),

    # Profile
    path("me/", views.MeView.as_view(), name="me"),
]
