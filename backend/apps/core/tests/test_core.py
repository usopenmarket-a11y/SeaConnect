"""Tests for the core app — Sprint 13B.

Covers:
  - HealthCheckView (GET /health/)
  - RegionListView (GET /api/v1/regions/)
  - DeparturePortListView (GET /api/v1/ports/)
  - SeaConnectCursorPagination attributes
  - validate_image_upload (apps/core/validators.py)
  - custom_exception_handler (apps/core/exceptions.py)

ADR compliance:
  - No DB mocking — all tests that touch the database use a real test DB.
  - pytest-django @pytest.mark.django_db marker on every DB-touching test.
  - APIClient from DRF for endpoint tests.
"""
from __future__ import annotations

import types
from unittest.mock import MagicMock

import pytest
from django.core.exceptions import ValidationError
from django.test import Client
from rest_framework import exceptions as drf_exceptions
from rest_framework.test import APIClient

from apps.core.exceptions import custom_exception_handler
from apps.core.models import DeparturePort, Region
from apps.core.pagination import SeaConnectCursorPagination
from apps.core.validators import validate_image_upload


# ---------------------------------------------------------------------------
# HealthCheckView — GET /health/
# ---------------------------------------------------------------------------


class TestHealthCheckView:
    """The health endpoint lives in config/urls.py and requires no auth."""

    def test_happy_health_check_returns_200(self) -> None:
        """GET /health/ must return HTTP 200 with no authentication."""
        client = Client()
        response = client.get("/health/")
        assert response.status_code == 200

    def test_happy_health_check_returns_status_ok(self) -> None:
        """Response body must contain {'status': 'ok'}."""
        client = Client()
        response = client.get("/health/")
        data = response.json()
        assert data["status"] == "ok"

    def test_happy_health_check_returns_service_name(self) -> None:
        """Response body must identify the service as 'seaconnect-api'."""
        client = Client()
        response = client.get("/health/")
        data = response.json()
        assert data["service"] == "seaconnect-api"

    def test_happy_health_check_content_type_is_json(self) -> None:
        """Response Content-Type must be application/json."""
        client = Client()
        response = client.get("/health/")
        assert "application/json" in response.get("Content-Type", "")

    def test_happy_health_check_no_auth_required(self) -> None:
        """Unauthenticated requests must not be rejected (no 401/403)."""
        client = Client()
        response = client.get("/health/")
        assert response.status_code not in (401, 403)


# ---------------------------------------------------------------------------
# RegionListView — GET /api/v1/regions/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRegionListView:
    endpoint = "/api/v1/regions/"

    def test_happy_regions_list_no_auth_required(
        self, api_client: APIClient, egypt_region: Region
    ) -> None:
        """Public endpoint — anonymous request must return 200."""
        response = api_client.get(self.endpoint)
        assert response.status_code == 200

    def test_happy_regions_list_returns_active_regions(
        self, api_client: APIClient, egypt_region: Region
    ) -> None:
        """Active regions must appear in the response results."""
        response = api_client.get(self.endpoint)
        assert response.status_code == 200
        ids = [r["id"] for r in response.data]
        assert str(egypt_region.id) in ids

    def test_happy_regions_list_returns_correct_fields(
        self, api_client: APIClient, egypt_region: Region
    ) -> None:
        """Each region object must expose id, code, name_ar, name_en, currency."""
        response = api_client.get(self.endpoint)
        assert response.status_code == 200
        assert len(response.data) >= 1
        region_obj = next(r for r in response.data if r["id"] == str(egypt_region.id))
        for field in ("id", "code", "name_ar", "name_en", "currency"):
            assert field in region_obj, f"Missing field: {field}"

    def test_happy_regions_list_currency_matches_model(
        self, api_client: APIClient, egypt_region: Region
    ) -> None:
        """Returned currency must match the value stored on the Region model."""
        response = api_client.get(self.endpoint)
        region_obj = next(r for r in response.data if r["id"] == str(egypt_region.id))
        assert region_obj["currency"] == egypt_region.currency

    def test_sad_inactive_regions_excluded(
        self,
        api_client: APIClient,
        egypt_region: Region,
        inactive_region: Region,
    ) -> None:
        """Inactive regions must not appear in the public list (view filters is_active=True)."""
        response = api_client.get(self.endpoint)
        assert response.status_code == 200
        ids = [r["id"] for r in response.data]
        assert str(inactive_region.id) not in ids

    def test_happy_regions_list_response_is_list(
        self, api_client: APIClient, egypt_region: Region
    ) -> None:
        """RegionListView disables cursor pagination — response is a plain list, not a paged envelope."""
        response = api_client.get(self.endpoint)
        assert response.status_code == 200
        # Plain list (no cursor pagination on this small static dataset).
        assert isinstance(response.data, list)


# ---------------------------------------------------------------------------
# DeparturePortListView — GET /api/v1/ports/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDeparturePortListView:
    endpoint = "/api/v1/ports/"

    def test_happy_ports_list_no_auth_required(
        self, api_client: APIClient, hurghada_port: DeparturePort
    ) -> None:
        """Public endpoint — anonymous request must return 200."""
        response = api_client.get(self.endpoint)
        assert response.status_code == 200

    def test_happy_ports_list_returns_active_ports(
        self, api_client: APIClient, hurghada_port: DeparturePort
    ) -> None:
        """Active ports must appear in the response."""
        response = api_client.get(self.endpoint)
        ids = [p["id"] for p in response.data]
        assert str(hurghada_port.id) in ids

    def test_happy_ports_list_returns_correct_fields(
        self, api_client: APIClient, hurghada_port: DeparturePort
    ) -> None:
        """Each port object must expose id, name_en, name_ar, region, region_code."""
        response = api_client.get(self.endpoint)
        assert len(response.data) >= 1
        port_obj = next(p for p in response.data if p["id"] == str(hurghada_port.id))
        for field in ("id", "name_en", "name_ar", "region", "region_code"):
            assert field in port_obj, f"Missing field: {field}"

    def test_happy_ports_filter_by_region(
        self,
        api_client: APIClient,
        hurghada_port: DeparturePort,
        egypt_region: Region,
        inactive_region: Region,
    ) -> None:
        """?region=EG must return only ports belonging to the EG region."""
        # Create a port in a second region to confirm it is excluded.
        other_port = DeparturePort.objects.create(
            name_en="Dubai Marina",
            name_ar="مرسى دبي",
            region=inactive_region,
            city_en="Dubai",
            city_ar="دبي",
            latitude="25.076200",
            longitude="55.133100",
            is_active=True,
        )
        response = api_client.get(self.endpoint, {"region": "EG"})
        assert response.status_code == 200
        ids = [p["id"] for p in response.data]
        assert str(hurghada_port.id) in ids
        assert str(other_port.id) not in ids

    def test_happy_ports_filter_unknown_region_returns_empty(
        self, api_client: APIClient, hurghada_port: DeparturePort
    ) -> None:
        """?region=XX (no matching region) must return an empty list, not an error."""
        response = api_client.get(self.endpoint, {"region": "XX"})
        assert response.status_code == 200
        assert response.data == []

    def test_sad_inactive_ports_excluded(
        self,
        api_client: APIClient,
        hurghada_port: DeparturePort,
        inactive_port: DeparturePort,
    ) -> None:
        """Inactive ports must not appear in the public list."""
        response = api_client.get(self.endpoint)
        ids = [p["id"] for p in response.data]
        assert str(inactive_port.id) not in ids

    def test_happy_ports_region_currency_present(
        self, api_client: APIClient, hurghada_port: DeparturePort
    ) -> None:
        """Each port must carry region_currency derived from the related Region."""
        response = api_client.get(self.endpoint)
        port_obj = next(p for p in response.data if p["id"] == str(hurghada_port.id))
        assert "region_currency" in port_obj
        assert port_obj["region_currency"] == hurghada_port.region.currency


# ---------------------------------------------------------------------------
# SeaConnectCursorPagination — unit tests (no DB required)
# ---------------------------------------------------------------------------


class TestSeaConnectCursorPagination:
    """Validate the pagination class attributes mandated by ADR-013."""

    def test_cursor_pagination_page_size(self) -> None:
        """Default page_size must be 20 (ADR-013)."""
        paginator = SeaConnectCursorPagination()
        assert paginator.page_size == 20

    def test_cursor_pagination_default_ordering(self) -> None:
        """Default ordering must be '-created_at' to match TimeStampedModel."""
        paginator = SeaConnectCursorPagination()
        assert paginator.ordering == "-created_at"

    def test_cursor_pagination_is_cursor_subclass(self) -> None:
        """SeaConnectCursorPagination must inherit from DRF CursorPagination."""
        from rest_framework.pagination import CursorPagination

        assert issubclass(SeaConnectCursorPagination, CursorPagination)


# ---------------------------------------------------------------------------
# validate_image_upload — unit tests (no DB, no real file I/O)
# ---------------------------------------------------------------------------


def _make_file(content_type: str, size: int) -> object:
    """Return a lightweight mock file object with .content_type and .size."""
    f = MagicMock()
    f.content_type = content_type
    f.size = size
    return f


class TestValidateImageUpload:
    """validate_image_upload raises django.core.exceptions.ValidationError on bad input."""

    # --- accepted formats ---

    def test_happy_validate_accepts_jpeg(self) -> None:
        """image/jpeg within size limit must pass without exception."""
        validate_image_upload(_make_file("image/jpeg", 1 * 1024 * 1024))

    def test_happy_validate_accepts_png(self) -> None:
        """image/png within size limit must pass without exception."""
        validate_image_upload(_make_file("image/png", 2 * 1024 * 1024))

    def test_happy_validate_accepts_webp(self) -> None:
        """image/webp within size limit must pass without exception."""
        validate_image_upload(_make_file("image/webp", 500 * 1024))

    # --- rejected formats ---

    def test_sad_validate_rejects_pdf(self) -> None:
        """application/pdf must raise ValidationError with UNSUPPORTED_FILE_TYPE code."""
        with pytest.raises(ValidationError) as exc_info:
            validate_image_upload(_make_file("application/pdf", 1 * 1024 * 1024))
        assert exc_info.value.code == "UNSUPPORTED_FILE_TYPE"

    def test_sad_validate_rejects_gif(self) -> None:
        """image/gif must raise ValidationError with UNSUPPORTED_FILE_TYPE code."""
        with pytest.raises(ValidationError) as exc_info:
            validate_image_upload(_make_file("image/gif", 1 * 1024 * 1024))
        assert exc_info.value.code == "UNSUPPORTED_FILE_TYPE"

    def test_sad_validate_rejects_empty_content_type(self) -> None:
        """Empty content_type string must raise UNSUPPORTED_FILE_TYPE."""
        with pytest.raises(ValidationError) as exc_info:
            validate_image_upload(_make_file("", 1 * 1024 * 1024))
        assert exc_info.value.code == "UNSUPPORTED_FILE_TYPE"

    # --- size validation ---

    def test_sad_validate_rejects_oversized(self) -> None:
        """File exceeding MAX_PHOTO_SIZE must raise ValidationError with FILE_TOO_LARGE code."""
        oversized = 11 * 1024 * 1024  # 11 MB > default 10 MB limit
        with pytest.raises(ValidationError) as exc_info:
            validate_image_upload(_make_file("image/jpeg", oversized))
        assert exc_info.value.code == "FILE_TOO_LARGE"

    def test_sad_validate_rejects_exactly_one_byte_over_limit(self) -> None:
        """A file exactly one byte over the limit must still raise FILE_TOO_LARGE."""
        max_size = 10 * 1024 * 1024
        with pytest.raises(ValidationError) as exc_info:
            validate_image_upload(_make_file("image/png", max_size + 1))
        assert exc_info.value.code == "FILE_TOO_LARGE"

    def test_happy_validate_accepts_exactly_at_limit(self) -> None:
        """A file whose size equals MAX_PHOTO_SIZE exactly must pass (boundary: not strictly >)."""
        max_size = 10 * 1024 * 1024
        # Should not raise — the check is `size > max_size`
        validate_image_upload(_make_file("image/jpeg", max_size))

    @pytest.mark.django_db
    def test_happy_validate_uses_settings_max_size(self, settings) -> None:
        """Validator must honour the MAX_PHOTO_SIZE Django setting at runtime."""
        settings.MAX_PHOTO_SIZE = 2 * 1024 * 1024  # override to 2 MB for this test

        # 1.5 MB — under the overridden limit, must pass.
        validate_image_upload(_make_file("image/jpeg", int(1.5 * 1024 * 1024)))

        # 3 MB — over the overridden limit, must raise.
        with pytest.raises(ValidationError) as exc_info:
            validate_image_upload(_make_file("image/jpeg", 3 * 1024 * 1024))
        assert exc_info.value.code == "FILE_TOO_LARGE"

    def test_sad_validate_file_too_large_message_contains_mb(self) -> None:
        """The FILE_TOO_LARGE error message must mention MB so it is user-readable."""
        with pytest.raises(ValidationError) as exc_info:
            validate_image_upload(_make_file("image/jpeg", 11 * 1024 * 1024))
        assert "MB" in str(exc_info.value.message)

    def test_sad_validate_unsupported_type_message_lists_formats(self) -> None:
        """The UNSUPPORTED_FILE_TYPE message must mention accepted formats."""
        with pytest.raises(ValidationError) as exc_info:
            validate_image_upload(_make_file("application/zip", 1 * 1024 * 1024))
        message = str(exc_info.value.message)
        assert "JPEG" in message or "PNG" in message or "WebP" in message


# ---------------------------------------------------------------------------
# custom_exception_handler — unit tests (no DB required)
# ---------------------------------------------------------------------------


def _call_handler(exc: Exception) -> dict:
    """Helper: invoke custom_exception_handler and return response.data."""
    # context is unused by our handler but DRF requires it.
    context: dict = {}
    response = custom_exception_handler(exc, context)
    assert response is not None, "Handler returned None — exception not handled by DRF"
    return response.data


class TestCustomExceptionHandler:
    """custom_exception_handler must wrap every DRF exception in the SeaConnect envelope."""

    # --- ValidationError ---

    def test_happy_handler_wraps_validation_error(self) -> None:
        """ValidationError must produce code=ERR_VALIDATION."""
        exc = drf_exceptions.ValidationError({"email": ["This field is required."]})
        data = _call_handler(exc)
        assert "error" in data
        assert data["error"]["code"] == "ERR_VALIDATION"

    def test_happy_handler_validation_error_exposes_field(self) -> None:
        """Single-field ValidationError must carry the field name in the envelope."""
        exc = drf_exceptions.ValidationError({"email": ["Enter a valid email address."]})
        data = _call_handler(exc)
        assert data["error"]["field"] == "email"

    def test_happy_handler_validation_error_exposes_message(self) -> None:
        """ValidationError must carry a human-readable message string."""
        exc = drf_exceptions.ValidationError({"name": ["This field may not be blank."]})
        data = _call_handler(exc)
        assert isinstance(data["error"]["message"], str)
        assert len(data["error"]["message"]) > 0

    def test_happy_handler_validation_error_list_detail(self) -> None:
        """List-shaped ValidationError detail must still produce ERR_VALIDATION."""
        exc = drf_exceptions.ValidationError(["Invalid data."])
        data = _call_handler(exc)
        assert data["error"]["code"] == "ERR_VALIDATION"
        assert "field" not in data["error"]

    # --- NotFound / Http404 ---

    def test_happy_handler_wraps_not_found(self) -> None:
        """NotFound must produce code=ERR_NOT_FOUND."""
        exc = drf_exceptions.NotFound()
        data = _call_handler(exc)
        assert data["error"]["code"] == "ERR_NOT_FOUND"

    def test_happy_handler_not_found_message_present(self) -> None:
        """NotFound envelope must contain a non-empty message."""
        exc = drf_exceptions.NotFound()
        data = _call_handler(exc)
        assert data["error"]["message"]

    def test_happy_handler_wraps_http404(self) -> None:
        """Django Http404 must be treated identically to DRF NotFound."""
        from django.http import Http404

        exc = Http404()
        data = _call_handler(exc)
        assert data["error"]["code"] == "ERR_NOT_FOUND"

    # --- PermissionDenied ---

    def test_happy_handler_wraps_permission_denied(self) -> None:
        """PermissionDenied must produce code=ERR_PERMISSION_DENIED."""
        exc = drf_exceptions.PermissionDenied()
        data = _call_handler(exc)
        assert data["error"]["code"] == "ERR_PERMISSION_DENIED"

    def test_happy_handler_permission_denied_no_field(self) -> None:
        """PermissionDenied envelope must not include a 'field' key."""
        exc = drf_exceptions.PermissionDenied()
        data = _call_handler(exc)
        assert "field" not in data["error"]

    # --- NotAuthenticated ---

    def test_happy_handler_wraps_not_authenticated(self) -> None:
        """NotAuthenticated must produce code=ERR_NOT_AUTHENTICATED."""
        exc = drf_exceptions.NotAuthenticated()
        data = _call_handler(exc)
        assert data["error"]["code"] == "ERR_NOT_AUTHENTICATED"

    # --- AuthenticationFailed ---

    def test_happy_handler_wraps_authentication_failed(self) -> None:
        """AuthenticationFailed must produce code=ERR_AUTHENTICATION."""
        exc = drf_exceptions.AuthenticationFailed("Token has expired.")
        data = _call_handler(exc)
        assert data["error"]["code"] == "ERR_AUTHENTICATION"

    # --- Throttled ---

    def test_happy_handler_wraps_throttled(self) -> None:
        """Throttled must produce code=ERR_THROTTLED."""
        exc = drf_exceptions.Throttled(wait=30)
        data = _call_handler(exc)
        assert data["error"]["code"] == "ERR_THROTTLED"

    def test_happy_handler_throttled_message_mentions_seconds(self) -> None:
        """Throttled message must mention the wait time in seconds."""
        exc = drf_exceptions.Throttled(wait=45)
        data = _call_handler(exc)
        assert "45" in data["error"]["message"]

    # --- MethodNotAllowed ---

    def test_happy_handler_wraps_method_not_allowed(self) -> None:
        """MethodNotAllowed must produce code=ERR_METHOD_NOT_ALLOWED."""
        exc = drf_exceptions.MethodNotAllowed("DELETE")
        data = _call_handler(exc)
        assert data["error"]["code"] == "ERR_METHOD_NOT_ALLOWED"

    # --- Envelope structure ---

    def test_happy_handler_envelope_has_error_key(self) -> None:
        """Every handled exception must wrap its payload under an 'error' key."""
        exc = drf_exceptions.NotFound()
        data = _call_handler(exc)
        assert list(data.keys()) == ["error"]

    def test_happy_handler_error_object_has_code_and_message(self) -> None:
        """The 'error' object must always contain at least 'code' and 'message'."""
        exc = drf_exceptions.PermissionDenied()
        data = _call_handler(exc)
        assert "code" in data["error"]
        assert "message" in data["error"]

    def test_sad_handler_returns_none_for_unhandled_exception(self) -> None:
        """Non-DRF exceptions not handled by DRF's default handler must return None."""
        exc = ValueError("This is not a DRF exception")
        context: dict = {}
        response = custom_exception_handler(exc, context)
        assert response is None

    def test_happy_handler_validation_error_scalar_detail(self) -> None:
        """ValidationError with a plain string detail (not dict or list) hits the else branch.

        Constructs a ValidationError whose .detail is a plain ErrorDetail string
        (not wrapped in a dict or list) to cover exceptions.py line 42.
        """
        exc = drf_exceptions.ValidationError("Plain scalar error message.")
        # Force detail to be a scalar string, bypassing DRF's list-wrapping.
        from rest_framework.exceptions import ErrorDetail

        exc.detail = ErrorDetail("Scalar detail value.", code="invalid")  # type: ignore[assignment]
        data = _call_handler(exc)
        assert data["error"]["code"] == "ERR_VALIDATION"
        assert "Scalar detail value." in data["error"]["message"]

    def test_happy_handler_generic_drf_exception_with_detail(self) -> None:
        """A DRF APIException subclass that doesn't match any specific branch
        but does have a .detail attribute covers exceptions.py line 70.
        """
        from rest_framework.exceptions import APIException

        class CustomDRFException(APIException):
            status_code = 400
            default_detail = "Custom error with detail."
            default_code = "custom_error"

        exc = CustomDRFException()
        data = _call_handler(exc)
        # Falls through to the else branch — code stays ERR_UNKNOWN, message from detail.
        assert data["error"]["code"] == "ERR_UNKNOWN"
        assert "Custom error with detail." in data["error"]["message"]
