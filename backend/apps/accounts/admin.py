"""Django admin configuration for the accounts app."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import BoatOwnerProfile, KYCDocument, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):  # type: ignore[type-arg]
    """Custom admin for the email-based User model."""

    ordering = ["-created_at"]
    list_display = ("email", "first_name", "last_name", "role", "is_verified", "is_active", "is_staff", "created_at")
    list_filter = ("role", "is_verified", "is_active", "is_staff", "auth_provider", "region")
    search_fields = ("email", "first_name", "last_name", "phone")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "phone", "preferred_lang", "fcm_token")}),
        ("Role & verification", {"fields": ("role", "auth_provider", "is_verified", "region")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login_at", "last_login", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "role"),
            },
        ),
    )
    readonly_fields = ("created_at", "updated_at", "last_login")


# ---------------------------------------------------------------------------
# Sprint 10C: BoatOwnerProfile + KYCDocument admin
# ---------------------------------------------------------------------------


class KYCDocumentInline(admin.TabularInline):  # type: ignore[type-arg]
    """Inline table showing all KYC documents for an owner profile."""

    model = KYCDocument
    extra = 0
    readonly_fields = ("id", "doc_type", "file", "uploaded_at", "created_at")
    can_delete = False
    show_change_link = False


@admin.register(BoatOwnerProfile)
class BoatOwnerProfileAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    """Admin for the KYC review queue.

    Provides bulk approve/reject actions and a clear view of KYC state.
    """

    list_display = (
        "user_email",
        "kyc_status",
        "completed_steps",
        "reviewed_by",
        "reviewed_at",
        "is_deleted",
        "created_at",
    )
    list_filter = ("kyc_status", "is_deleted")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    readonly_fields = (
        "id",
        "user",
        "completed_steps_display",
        "reviewed_by",
        "reviewed_at",
        "created_at",
        "updated_at",
    )
    raw_id_fields = ("user",)
    inlines = [KYCDocumentInline]

    fieldsets = (
        ("Identity", {"fields": ("id", "user", "kyc_status", "is_deleted")}),
        (
            "KYC Steps",
            {
                "fields": (
                    "national_id_verified",
                    "vessel_docs_verified",
                    "captain_license_verified",
                    "insurance_verified",
                    "inspection_passed",
                    "bank_account_configured",
                    "completed_steps_display",
                )
            },
        ),
        (
            "Admin Review",
            {"fields": ("reviewed_by", "reviewed_at", "rejection_reason")},
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    @admin.display(description="Owner email")
    def user_email(self, obj: BoatOwnerProfile) -> str:
        return obj.user.email

    @admin.display(description="Completed steps")
    def completed_steps_display(self, obj: BoatOwnerProfile) -> str:
        return f"{obj.completed_steps} / {obj.total_steps}"

    @admin.action(description="Approve selected KYC profiles")
    def approve_profiles(self, request, queryset):  # type: ignore[override]
        from django.utils import timezone
        from .models import KYCStatus
        updated = queryset.filter(kyc_status=KYCStatus.SUBMITTED).update(
            kyc_status=KYCStatus.APPROVED,
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
            rejection_reason="",
        )
        self.message_user(request, f"{updated} profile(s) approved.")

    actions = ["approve_profiles"]


@admin.register(KYCDocument)
class KYCDocumentAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    """Admin for KYC document uploads."""

    list_display = ("id", "owner_email", "doc_type", "uploaded_at")
    list_filter = ("doc_type",)
    search_fields = ("owner_profile__user__email",)
    readonly_fields = ("id", "owner_profile", "doc_type", "file", "uploaded_at", "created_at")

    @admin.display(description="Owner email")
    def owner_email(self, obj: KYCDocument) -> str:
        return obj.owner_profile.user.email
