from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginView, LogoutView, RegisterView, UserMeView

app_name = "accounts"

# Sprint 2 Phase F-1 audit: removed publicly exposed auth/verify/ route — not
# documented in the API spec and not used by any client. The verify primitive
# remains importable for internal services if ever needed.
urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("users/me/", UserMeView.as_view(), name="users-me"),
]
