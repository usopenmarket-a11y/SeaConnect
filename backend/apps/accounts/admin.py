"""Django admin configuration for the accounts app."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


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
