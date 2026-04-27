"""Object-level permissions for the bookings app.

Object permissions are enforced via DRF's ``has_object_permission`` hook.
Where a queryset already filters by ownership (e.g. ``customer=request.user``),
returning a 404 instead of 403 hides the existence of the resource from
unauthorised callers — preferred for booking detail endpoints.
"""
from __future__ import annotations

from rest_framework.permissions import BasePermission
from rest_framework.request import Request


class IsYachtOwnerOfBooking(BasePermission):
    """Allow access only to the owner of the yacht in the booking."""

    def has_object_permission(self, request: Request, view, obj) -> bool:  # type: ignore[override]
        return bool(request.user and obj.yacht.owner_id == request.user.id)


class IsBookingCustomer(BasePermission):
    """Allow access only to the customer who made the booking."""

    def has_object_permission(self, request: Request, view, obj) -> bool:  # type: ignore[override]
        return bool(request.user and obj.customer_id == request.user.id)
