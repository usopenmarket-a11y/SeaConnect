"""Object-level permissions for the bookings app.

Object permissions are enforced via DRF's ``has_object_permission`` hook.
Where a queryset already filters by ownership (e.g. ``customer=request.user``),
returning a 404 instead of 403 hides the existence of the resource from
unauthorised callers — preferred for booking detail endpoints.
"""
from __future__ import annotations

from rest_framework.permissions import BasePermission
from rest_framework.request import Request

from apps.accounts.models import UserRole


class IsYachtOwnerOfBooking(BasePermission):
    """Allow access only to the owner of the yacht in the booking."""

    def has_object_permission(self, request: Request, view, obj) -> bool:  # type: ignore[override]
        return bool(request.user and obj.yacht.owner_id == request.user.id)


class IsBookingCustomer(BasePermission):
    """Allow access only to the customer who made the booking."""

    def has_object_permission(self, request: Request, view, obj) -> bool:  # type: ignore[override]
        return bool(request.user and obj.customer_id == request.user.id)


# ---------------------------------------------------------------------------
# Sprint 10A — Yacht create / update permissions
# ---------------------------------------------------------------------------


class IsOwnerRole(BasePermission):
    """Allow access only to authenticated users with role='owner'.

    Used at the view level (has_permission) for yacht create.
    Role check is in a permission class — never inline in the view (project rule).
    """

    def has_permission(self, request: Request, view) -> bool:  # type: ignore[override]
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == UserRole.OWNER
        )


class IsYachtOwner(BasePermission):
    """Object-level: authenticated user must own the Yacht instance.

    Called after ``has_permission`` via ``check_object_permissions()``.
    Returns 403 (not 404) so the frontend knows the resource exists but the
    caller is not permitted to modify it.
    """

    def has_object_permission(self, request: Request, view, obj) -> bool:  # type: ignore[override]
        return bool(request.user and obj.owner_id == request.user.id)
