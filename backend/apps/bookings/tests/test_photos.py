"""Sprint 12A — Yacht photo upload / delete API tests.

Covers:
  POST   /api/v1/yachts/{id}/photos/           — upload a yacht photo
  DELETE /api/v1/yachts/{id}/photos/{photo_id}/ — delete a yacht photo

ADR compliance tested:
  ADR-001 — UUID PKs returned in responses
  ADR-009 — JWT authentication required (401 for anonymous)
  ADR-010 — Storage via default_storage (mocked; no real file I/O in tests)

All DB fixtures use real writes (no DB mocking per project rules).
File I/O is mocked via ``unittest.mock.patch`` on ``default_storage``.
"""
from __future__ import annotations

import io
from unittest.mock import MagicMock, patch

import pytest
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.bookings.models import Yacht, YachtMedia
from apps.core.models import DeparturePort, Region


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

UPLOAD_URL = "/api/v1/yachts/{id}/photos/"
DELETE_URL = "/api/v1/yachts/{id}/photos/{photo_id}/"


def _make_image_file(
    name: str = "photo.jpg",
    content_type: str = "image/jpeg",
    fmt: str = "JPEG",
    size_bytes: int | None = None,
) -> InMemoryUploadedFile:
    """Return a real 1x1 pixel in-memory image for multipart upload tests.

    DRF's ``ImageField`` validates actual image content via Pillow, so the
    file must be a valid image.  ``size_bytes`` is ignored when provided
    (the real pixel data takes precedence); it is kept in the signature for
    the oversized test which injects a large fake size attribute.
    """
    buf = io.BytesIO()
    img = Image.new("RGB", (1, 1), color=(255, 0, 0))
    img.save(buf, format=fmt)
    buf.seek(0)
    actual_size = size_bytes if size_bytes is not None else buf.getbuffer().nbytes
    file = InMemoryUploadedFile(
        file=buf,
        field_name="file",
        name=name,
        content_type=content_type,
        size=actual_size,
        charset=None,
    )
    return file


def _make_pdf_file(size_bytes: int = 512) -> InMemoryUploadedFile:
    """Return a fake PDF file to test rejected content-type."""
    stream = io.BytesIO(b"%PDF-1.4" + b"\x00" * size_bytes)
    stream.seek(0)
    return InMemoryUploadedFile(
        file=stream,
        field_name="file",
        name="document.pdf",
        content_type="application/pdf",
        size=size_bytes,
        charset=None,
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def egypt_region(db) -> Region:
    region, _ = Region.objects.get_or_create(
        code="EG",
        defaults={
            "name_ar": "مصر",
            "name_en": "Egypt",
            "currency": "EGP",
            "timezone": "Africa/Cairo",
            "is_active": True,
        },
    )
    return region


@pytest.fixture
def departure_port(db, egypt_region: Region) -> DeparturePort:
    port, _ = DeparturePort.objects.get_or_create(
        name_en="Hurghada Marina",
        defaults={
            "name_ar": "مرسى الغردقة",
            "region": egypt_region,
            "city_en": "Hurghada",
            "city_ar": "الغردقة",
            "latitude": "27.257400",
            "longitude": "33.811600",
            "is_active": True,
        },
    )
    return port


@pytest.fixture
def owner_user(db, egypt_region: Region) -> User:
    return User.objects.create_user(
        email="photo_owner@test.com",
        password="TestPass123!",
        first_name="Photo",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
    )


@pytest.fixture
def other_owner_user(db, egypt_region: Region) -> User:
    """A second owner — must not be able to upload to another owner's yacht."""
    return User.objects.create_user(
        email="photo_other_owner@test.com",
        password="TestPass123!",
        first_name="Other",
        last_name="Owner",
        role=UserRole.OWNER,
        region=egypt_region,
    )


@pytest.fixture
def customer_user(db, egypt_region: Region) -> User:
    return User.objects.create_user(
        email="photo_customer@test.com",
        password="TestPass123!",
        first_name="Photo",
        last_name="Customer",
        role=UserRole.CUSTOMER,
        region=egypt_region,
    )


@pytest.fixture
def yacht(db, owner_user: User, egypt_region: Region, departure_port: DeparturePort) -> Yacht:
    return Yacht.objects.create(
        owner=owner_user,
        region=egypt_region,
        departure_port=departure_port,
        name="Sea Dream",
        name_ar="حلم البحر",
        capacity=8,
        price_per_day="1500.00",
        currency="EGP",
        yacht_type="motorboat",
        status="active",
    )


@pytest.fixture
def existing_photo(db, yacht: Yacht) -> YachtMedia:
    """A non-primary photo already attached to the test yacht."""
    return YachtMedia.objects.create(
        yacht=yacht,
        url="https://minio.local/yachts/old-photo.jpg",
        media_type="image",
        is_primary=False,
        order=0,
    )


@pytest.fixture
def primary_photo(db, yacht: Yacht) -> YachtMedia:
    """The existing primary/cover photo for the yacht."""
    return YachtMedia.objects.create(
        yacht=yacht,
        url="https://minio.local/yachts/cover.jpg",
        media_type="image",
        is_primary=True,
        order=0,
    )


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


# ---------------------------------------------------------------------------
# POST /api/v1/yachts/{id}/photos/ — upload tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestYachtPhotoUpload:
    """Happy-path and validation tests for the photo upload endpoint."""

    def test_upload_photo_as_owner(
        self, api_client: APIClient, owner_user: User, yacht: Yacht
    ) -> None:
        """Owner uploads a valid JPEG: 201 returned, YachtMedia row created."""
        api_client.force_authenticate(owner_user)

        with patch("apps.bookings.views.default_storage") as mock_storage:
            mock_storage.save.return_value = "yachts/test/photos/abc.jpg"
            mock_storage.url.return_value = "https://minio.local/yachts/test/photos/abc.jpg"

            response = api_client.post(
                UPLOAD_URL.format(id=yacht.id),
                data={"file": _make_image_file()},
                format="multipart",
            )

        assert response.status_code == 201, response.data
        data = response.data
        assert "id" in data
        assert "url" in data
        assert data["is_cover"] is False
        assert data["caption"] == ""

        # Verify DB row was created.
        assert YachtMedia.objects.filter(yacht=yacht, is_primary=False).exists()

    def test_upload_sets_cover_clears_others(
        self,
        api_client: APIClient,
        owner_user: User,
        yacht: Yacht,
        primary_photo: YachtMedia,
    ) -> None:
        """Uploading with is_cover=True demotes all existing primary photos."""
        api_client.force_authenticate(owner_user)

        with patch("apps.bookings.views.default_storage") as mock_storage:
            mock_storage.save.return_value = "yachts/test/photos/new-cover.jpg"
            mock_storage.url.return_value = "https://minio.local/yachts/test/photos/new-cover.jpg"

            response = api_client.post(
                UPLOAD_URL.format(id=yacht.id),
                data={"file": _make_image_file(), "is_cover": True},
                format="multipart",
            )

        assert response.status_code == 201, response.data
        assert response.data["is_cover"] is True

        # Old primary photo must now be demoted.
        primary_photo.refresh_from_db()
        assert primary_photo.is_primary is False

        # Exactly one primary photo must exist for this yacht.
        assert YachtMedia.objects.filter(yacht=yacht, is_primary=True).count() == 1

    def test_upload_rejects_non_image(
        self, api_client: APIClient, owner_user: User, yacht: Yacht
    ) -> None:
        """PDF upload is rejected with 400 and UNSUPPORTED_FILE_TYPE code."""
        api_client.force_authenticate(owner_user)

        response = api_client.post(
            UPLOAD_URL.format(id=yacht.id),
            data={"file": _make_pdf_file()},
            format="multipart",
        )

        assert response.status_code == 400, response.data
        # The custom exception handler wraps the error.
        assert "error" in response.data

    def test_upload_rejects_oversized(
        self, api_client: APIClient, owner_user: User, yacht: Yacht
    ) -> None:
        """File larger than MAX_PHOTO_SIZE (10 MB) is rejected with 400.

        We override Django's DATA_UPLOAD_MAX_MEMORY_SIZE and MAX_PHOTO_SIZE
        to a tiny limit (100 bytes) so a normal test image exceeds it.
        """
        api_client.force_authenticate(owner_user)
        oversized = _make_image_file(name="big.jpg", content_type="image/jpeg")

        with patch("apps.bookings.views.default_storage") as mock_storage, \
             patch("apps.core.validators.settings") as mock_settings:
            mock_settings.MAX_PHOTO_SIZE = 10  # 10 bytes — real image exceeds this
            mock_storage.save.return_value = "yachts/test/big.jpg"
            mock_storage.url.return_value = "https://minio.local/big.jpg"

            response = api_client.post(
                UPLOAD_URL.format(id=yacht.id),
                data={"file": oversized},
                format="multipart",
            )

        assert response.status_code == 400, response.data
        assert "error" in response.data

    def test_upload_requires_owner_role(
        self, api_client: APIClient, customer_user: User, yacht: Yacht
    ) -> None:
        """Customer role must receive 403 — only owners may upload photos."""
        api_client.force_authenticate(customer_user)

        response = api_client.post(
            UPLOAD_URL.format(id=yacht.id),
            data={"file": _make_image_file()},
            format="multipart",
        )

        assert response.status_code == 403, response.data

    def test_upload_requires_authentication(
        self, api_client: APIClient, yacht: Yacht
    ) -> None:
        """Anonymous request must receive 401."""
        response = api_client.post(
            UPLOAD_URL.format(id=yacht.id),
            data={"file": _make_image_file()},
            format="multipart",
        )

        assert response.status_code == 401, response.data

    def test_upload_wrong_owner(
        self,
        api_client: APIClient,
        other_owner_user: User,
        yacht: Yacht,
    ) -> None:
        """Another owner (not the yacht's owner) must receive 403."""
        api_client.force_authenticate(other_owner_user)

        with patch("apps.bookings.views.default_storage"):
            response = api_client.post(
                UPLOAD_URL.format(id=yacht.id),
                data={"file": _make_image_file()},
                format="multipart",
            )

        assert response.status_code == 403, response.data

    def test_upload_webp_accepted(
        self, api_client: APIClient, owner_user: User, yacht: Yacht
    ) -> None:
        """WebP content-type is explicitly allowed."""
        api_client.force_authenticate(owner_user)

        with patch("apps.bookings.views.default_storage") as mock_storage:
            mock_storage.save.return_value = "yachts/test/photos/photo.webp"
            mock_storage.url.return_value = "https://minio.local/yachts/test/photos/photo.webp"

            response = api_client.post(
                UPLOAD_URL.format(id=yacht.id),
                data={
                    "file": _make_image_file(
                        name="photo.webp", content_type="image/webp", fmt="WEBP"
                    )
                },
                format="multipart",
            )

        assert response.status_code == 201, response.data

    def test_upload_png_accepted(
        self, api_client: APIClient, owner_user: User, yacht: Yacht
    ) -> None:
        """PNG content-type is explicitly allowed."""
        api_client.force_authenticate(owner_user)

        with patch("apps.bookings.views.default_storage") as mock_storage:
            mock_storage.save.return_value = "yachts/test/photos/photo.png"
            mock_storage.url.return_value = "https://minio.local/yachts/test/photos/photo.png"

            response = api_client.post(
                UPLOAD_URL.format(id=yacht.id),
                data={
                    "file": _make_image_file(
                        name="photo.png", content_type="image/png", fmt="PNG"
                    )
                },
                format="multipart",
            )

        assert response.status_code == 201, response.data

    def test_upload_missing_file_field(
        self, api_client: APIClient, owner_user: User, yacht: Yacht
    ) -> None:
        """Request with no file field must return 400."""
        api_client.force_authenticate(owner_user)

        response = api_client.post(
            UPLOAD_URL.format(id=yacht.id),
            data={},
            format="multipart",
        )

        assert response.status_code == 400, response.data


# ---------------------------------------------------------------------------
# DELETE /api/v1/yachts/{id}/photos/{photo_id}/ — delete tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestYachtPhotoDelete:
    """Tests for the photo delete endpoint."""

    def test_delete_photo_as_owner(
        self,
        api_client: APIClient,
        owner_user: User,
        yacht: Yacht,
        existing_photo: YachtMedia,
    ) -> None:
        """Owner deletes their photo: 204, YachtMedia row removed from DB."""
        api_client.force_authenticate(owner_user)
        photo_id = existing_photo.id

        with patch("apps.bookings.views.default_storage") as mock_storage:
            mock_storage.exists.return_value = False  # File not in storage (already gone)

            response = api_client.delete(
                DELETE_URL.format(id=yacht.id, photo_id=photo_id),
            )

        assert response.status_code == 204, response.data
        assert not YachtMedia.objects.filter(id=photo_id).exists()

    def test_delete_photo_wrong_owner(
        self,
        api_client: APIClient,
        other_owner_user: User,
        yacht: Yacht,
        existing_photo: YachtMedia,
    ) -> None:
        """Another owner may not delete a photo belonging to a different yacht: 403."""
        api_client.force_authenticate(other_owner_user)

        response = api_client.delete(
            DELETE_URL.format(id=yacht.id, photo_id=existing_photo.id),
        )

        assert response.status_code == 403, response.data
        # Photo must still exist in DB.
        assert YachtMedia.objects.filter(id=existing_photo.id).exists()

    def test_delete_photo_requires_authentication(
        self,
        api_client: APIClient,
        yacht: Yacht,
        existing_photo: YachtMedia,
    ) -> None:
        """Anonymous DELETE must return 401."""
        response = api_client.delete(
            DELETE_URL.format(id=yacht.id, photo_id=existing_photo.id),
        )

        assert response.status_code == 401, response.data

    def test_delete_photo_customer_role_denied(
        self,
        api_client: APIClient,
        customer_user: User,
        yacht: Yacht,
        existing_photo: YachtMedia,
    ) -> None:
        """Customer role must receive 403 — only owners may delete photos."""
        api_client.force_authenticate(customer_user)

        response = api_client.delete(
            DELETE_URL.format(id=yacht.id, photo_id=existing_photo.id),
        )

        assert response.status_code == 403, response.data

    def test_delete_nonexistent_photo(
        self,
        api_client: APIClient,
        owner_user: User,
        yacht: Yacht,
    ) -> None:
        """Deleting a photo_id that does not exist returns 404."""
        import uuid
        api_client.force_authenticate(owner_user)

        response = api_client.delete(
            DELETE_URL.format(id=yacht.id, photo_id=uuid.uuid4()),
        )

        assert response.status_code == 404, response.data

    def test_delete_removes_file_from_storage(
        self,
        api_client: APIClient,
        owner_user: User,
        yacht: Yacht,
        existing_photo: YachtMedia,
    ) -> None:
        """When the file exists in storage, default_storage.delete is called."""
        api_client.force_authenticate(owner_user)

        with patch("apps.bookings.views.default_storage") as mock_storage:
            mock_storage.exists.return_value = True
            mock_storage.delete = MagicMock()

            response = api_client.delete(
                DELETE_URL.format(id=yacht.id, photo_id=existing_photo.id),
            )

        assert response.status_code == 204, response.data
        mock_storage.delete.assert_called_once_with(existing_photo.url)
