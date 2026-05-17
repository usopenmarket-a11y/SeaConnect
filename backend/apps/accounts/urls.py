from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminKYCApproveView,
    AdminKYCListView,
    AdminKYCRejectView,
    AdminUserListView,
    AdminUserRoleView,
    AdminUserSuspendView,
    AdminUserUnsuspendView,
    KYCDocumentUploadView,
    LoginView,
    LogoutView,
    OwnerProfileSubmitView,
    OwnerProfileView,
    RegisterView,
    UserMeView,
)

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
    # Sprint 13D — admin user management
    path("admin/users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("admin/users/<uuid:id>/suspend/", AdminUserSuspendView.as_view(), name="admin-user-suspend"),
    path("admin/users/<uuid:id>/unsuspend/", AdminUserUnsuspendView.as_view(), name="admin-user-unsuspend"),
    path("admin/users/<uuid:id>/role/", AdminUserRoleView.as_view(), name="admin-user-role"),
    # Sprint 10C — owner KYC profile
    path("accounts/owner-profile/", OwnerProfileView.as_view(), name="owner-profile"),
    path("accounts/owner-profile/submit/", OwnerProfileSubmitView.as_view(), name="owner-profile-submit"),
    # Sprint 11A — KYC document upload
    path("accounts/owner-profile/upload/", KYCDocumentUploadView.as_view(), name="owner-profile-upload"),
    # Sprint 10C — admin KYC review queue
    path("admin/kyc/", AdminKYCListView.as_view(), name="admin-kyc-list"),
    path("admin/kyc/<uuid:id>/approve/", AdminKYCApproveView.as_view(), name="admin-kyc-approve"),
    path("admin/kyc/<uuid:id>/reject/", AdminKYCRejectView.as_view(), name="admin-kyc-reject"),
]
