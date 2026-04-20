"""Custom DRF exception handler.

Normalises all error responses to the SeaConnect error envelope:
    {"error": {"code": "ERR_CODE", "message": "Human readable", "field": "field_name"}}

Referenced in REST_FRAMEWORK['EXCEPTION_HANDLER'] in settings/base.py.
"""
from typing import Any

from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """Convert DRF exceptions into the SeaConnect error envelope format."""

    # Let DRF do its default processing first so we get a Response object.
    response = exception_handler(exc, context)

    if response is None:
        return None

    error_code = "ERR_UNKNOWN"
    message = "An unexpected error occurred."
    field: str | None = None

    if isinstance(exc, exceptions.ValidationError):
        error_code = "ERR_VALIDATION"
        # Flatten the first validation error for single-field errors.
        detail = exc.detail
        if isinstance(detail, dict):
            first_field = next(iter(detail))
            field = first_field
            first_errors = detail[first_field]
            message = str(first_errors[0]) if isinstance(first_errors, list) else str(first_errors)
        elif isinstance(detail, list):
            message = str(detail[0])
        else:
            message = str(detail)

    elif isinstance(exc, exceptions.AuthenticationFailed):
        error_code = "ERR_AUTHENTICATION"
        message = str(exc.detail)

    elif isinstance(exc, exceptions.NotAuthenticated):
        error_code = "ERR_NOT_AUTHENTICATED"
        message = "Authentication credentials were not provided."

    elif isinstance(exc, exceptions.PermissionDenied):
        error_code = "ERR_PERMISSION_DENIED"
        message = "You do not have permission to perform this action."

    elif isinstance(exc, (exceptions.NotFound, Http404)):
        error_code = "ERR_NOT_FOUND"
        message = "The requested resource was not found."

    elif isinstance(exc, exceptions.Throttled):
        error_code = "ERR_THROTTLED"
        wait = exc.wait
        message = f"Request was throttled. Expected available in {wait:.0f}s." if wait else "Request was throttled."

    elif isinstance(exc, exceptions.MethodNotAllowed):
        error_code = "ERR_METHOD_NOT_ALLOWED"
        message = f"Method '{exc.args[0] if exc.args else ''}' not allowed."

    else:
        message = str(exc.detail) if hasattr(exc, "detail") else message  # type: ignore[union-attr]

    error_body: dict[str, Any] = {
        "code": error_code,
        "message": message,
    }
    if field:
        error_body["field"] = field

    response.data = {"error": error_body}
    return response
