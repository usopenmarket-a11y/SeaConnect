"""Marketplace permission classes — Sprint 11D.

Role and object-level permissions for vendor product management.
All role checks live here — never inline in views (project hard rule).

ADR-009: JWT authentication is enforced at the DRF global level;
these classes only add the role/ownership layer on top.
"""
from __future__ import annotations

from rest_framework.permissions import BasePermission
from rest_framework.request import Request

from apps.accounts.models import UserRole


class IsVendorRole(BasePermission):
    """Allow access only to authenticated users with role='vendor'.

    Used at the view level (has_permission) for product create/update/delete.
    """

    message = "Only vendors may perform this action."

    def has_permission(self, request: Request, view) -> bool:  # type: ignore[override]
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == UserRole.VENDOR
        )


class IsProductOwner(BasePermission):
    """Object-level: authenticated vendor must own the Product instance.

    Compares ``product.vendor.user`` against ``request.user``.
    Returns 403 so the frontend knows the resource exists but is not theirs.
    Called after ``has_permission`` via ``check_object_permissions()``.
    """

    message = "You do not own this product."

    def has_object_permission(self, request: Request, view, obj) -> bool:  # type: ignore[override]
        return bool(
            request.user
            and request.user.is_authenticated
            and obj.vendor.user_id == request.user.id
        )


class IsVendorProfileOwner(BasePermission):
    """Object-level: authenticated vendor must own the VendorProfile instance."""

    message = "You do not own this vendor profile."

    def has_object_permission(self, request: Request, view, obj) -> bool:  # type: ignore[override]
        return bool(
            request.user
            and request.user.is_authenticated
            and obj.user_id == request.user.id
        )
