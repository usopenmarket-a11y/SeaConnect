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


class IsOrderVendor(BasePermission):
    """Object-level: at least one OrderItem in this Order must belong to
    the authenticated vendor's VendorProfile.

    This allows a vendor to confirm/ship/cancel only orders that contain
    their products.  It intentionally does NOT require ALL items to be
    theirs — multi-vendor carts are a future concern.

    has_permission always returns True (view-level gatekeeping is done by
    IsVendorRole); the real check is object-level.
    """

    message = "This order does not contain any of your products."

    def has_permission(self, request: Request, view) -> bool:  # type: ignore[override]
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request: Request, view, obj) -> bool:  # type: ignore[override]
        if not (request.user and request.user.is_authenticated):
            return False
        # Avoid extra DB query — items should already be prefetched in the view.
        return any(
            item.product.vendor.user_id == request.user.id
            for item in obj.items.all()
        )
