"""Sprint 11A — KYC document upload endpoint tests.

Covers:
  - Happy path: valid PDF uploaded, step boolean set to True, 201 returned
  - File too large: returns 413
  - Invalid MIME type: returns 400
  - Invalid doc_type: returns 400
  - Unauthenticated request: returns 401

Rules:
  - Real PostgreSQL DB (ADR rule — no DB mocking)
  - default_storage.save is mocked to avoid real MinIO/filesystem calls
  - APIClient (DRF) for all HTTP calls
  - SimpleUploadedFile for in-memory test files

URL under test: POST /api/v1/accounts/owner-profile/upload/
"""
from unittest.mock import MagicMock, patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import BoatOwnerProfile, KYCDocument, KYCStatus, User, UserRole
from apps.core.models import Region

UPLOAD_URL = "/api/v1/accounts/owner-profile/upload/"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_or_create_region() -> Region:
    region, _ = Region.objects.get_or_create(
        code="EG-UPLOAD",
        defaults={
            "name_ar": "مصر",
            "name_en": "Egypt",
            "currency": "EGP",
            "timezone": "Africa/Cairo",
            "is_active": True,
        },
    )
    return region


def _make_user(email: str, role: str, region: Region) -> User:
    return User.objects.create_user(
        email=email,
        password="TestPass123!",
        role=role,
        region=region,
    )


def _auth_client(user: User) -> APIClient:
    """Return a DRF APIClient authenticated as *user*."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


def _small_pdf(filename: str = "test_doc.pdf") -> SimpleUploadedFile:
    """Return a minimal in-memory PDF file well within the 10 MB limit."""
    content = b"%PDF-1.4 minimal test document"
    return SimpleUploadedFile(filename, content, content_type="application/pdf")


def _large_file() -> SimpleUploadedFile:
    """Return a file that exceeds the 10 MB upload limit."""
    eleven_mb = b"X" * (11 * 1024 * 1024)
    return SimpleUploadedFile("big.pdf", eleven_mb, content_type="application/pdf")


def _jpeg_file() -> SimpleUploadedFile:
    """Return a tiny in-memory JPEG."""
    content = b"\xff\xd8\xff\xe0" + b"\x00" * 16  # minimal JPEG header
    return SimpleUploadedFile("photo.jpg", content, content_type="image/jpeg")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def region(db) -> Region:
    return _get_or_create_region()


@pytest.fixture
def owner(db, region) -> User:
    return _make_user("upload-owner@kyc-test.com", UserRole.OWNER, region)


@pytest.fixture
def owner_with_profile(db, owner) -> BoatOwnerProfile:
    """An owner who already has a BoatOwnerProfile (as required by the upload view)."""
    return BoatOwnerProfile.objects.create(user=owner, kyc_status=KYCStatus.NOT_STARTED)


@pytest.fixture
def owner_client(owner) -> APIClient:
    return _auth_client(owner)


# ---------------------------------------------------------------------------
# Test cases
# ---------------------------------------------------------------------------


class TestKYCDocumentUpload:
    """POST /api/v1/accounts/owner-profile/upload/"""

    # ------------------------------------------------------------------
    # 1. Happy path — valid PDF, valid doc_type
    # ------------------------------------------------------------------

    @pytest.mark.django_db
    def test_upload_valid_pdf_sets_step_and_returns_201(self, owner_client, owner, owner_with_profile):
        """A valid PDF upload returns 201, creates KYCDocument, and marks the step True."""
        saved_path = f"kyc/{owner_with_profile.id}/identity/test_doc.pdf"
        fake_url = f"http://minio:9000/seaconnect/{saved_path}"

        with (
            patch("apps.accounts.views.default_storage.save", return_value=saved_path) as mock_save,
            patch("apps.accounts.views.default_storage.exists", return_value=True),
            patch("apps.accounts.views.default_storage.url", return_value=fake_url),
        ):
            response = owner_client.post(
                UPLOAD_URL,
                data={"file": _small_pdf(), "doc_type": "identity"},
                format="multipart",
            )

        assert response.status_code == 201, response.data
        data = response.data
        assert data["doc_type"] == "identity"
        assert data["kyc_status"] == KYCStatus.IN_PROGRESS  # promoted from NOT_STARTED
        assert data["document_url"] == fake_url
        assert data["completed_steps"] == 1

        # Verify the KYCDocument row was created
        doc = KYCDocument.objects.get(owner_profile=owner_with_profile, doc_type="identity")
        assert doc.file.name == saved_path

        # Verify the profile step was flipped
        owner_with_profile.refresh_from_db()
        assert owner_with_profile.national_id_verified is True

        # Verify storage.save was called with the correct path prefix
        call_args = mock_save.call_args
        assert call_args[0][0].startswith(f"kyc/{owner_with_profile.id}/identity/")

    # ------------------------------------------------------------------
    # 2. File too large — returns 413
    # ------------------------------------------------------------------

    @pytest.mark.django_db
    def test_file_too_large_returns_413(self, owner_client, owner_with_profile):
        """A file exceeding 10 MB is rejected with 413."""
        response = owner_client.post(
            UPLOAD_URL,
            data={"file": _large_file(), "doc_type": "identity"},
            format="multipart",
        )

        assert response.status_code == 413, response.data
        assert response.data["error"]["code"] == "FILE_TOO_LARGE"

    # ------------------------------------------------------------------
    # 3. Invalid MIME type — returns 400
    # ------------------------------------------------------------------

    @pytest.mark.django_db
    def test_invalid_mime_type_returns_400(self, owner_client, owner_with_profile):
        """A file with an unsupported MIME type is rejected with 400."""
        exe_file = SimpleUploadedFile(
            "malware.exe", b"MZ\x90\x00", content_type="application/octet-stream"
        )
        response = owner_client.post(
            UPLOAD_URL,
            data={"file": exe_file, "doc_type": "identity"},
            format="multipart",
        )

        assert response.status_code == 400, response.data
        assert response.data["error"]["code"] == "INVALID_FILE_TYPE"

    # ------------------------------------------------------------------
    # 4. Invalid doc_type — returns 400
    # ------------------------------------------------------------------

    @pytest.mark.django_db
    def test_invalid_doc_type_returns_400(self, owner_client, owner_with_profile):
        """An unrecognised doc_type value is rejected with 400."""
        response = owner_client.post(
            UPLOAD_URL,
            data={"file": _small_pdf(), "doc_type": "totally_fake_type"},
            format="multipart",
        )

        assert response.status_code == 400, response.data
        assert response.data["error"]["code"] == "INVALID_DOC_TYPE"

    # ------------------------------------------------------------------
    # 5. Unauthenticated — returns 401
    # ------------------------------------------------------------------

    @pytest.mark.django_db
    def test_unauthenticated_returns_401(self):
        """Anonymous requests are rejected with 401."""
        anon_client = APIClient()
        response = anon_client.post(
            UPLOAD_URL,
            data={"file": _small_pdf(), "doc_type": "identity"},
            format="multipart",
        )

        assert response.status_code == 401

    # ------------------------------------------------------------------
    # 6. Profile not found — returns 404 (bonus test)
    # ------------------------------------------------------------------

    @pytest.mark.django_db
    def test_no_profile_returns_404(self, owner_client, owner):
        """Owner with no BoatOwnerProfile receives 404."""
        # owner fixture has no profile — do not call owner_with_profile
        assert not BoatOwnerProfile.objects.filter(user=owner).exists()

        response = owner_client.post(
            UPLOAD_URL,
            data={"file": _small_pdf(), "doc_type": "identity"},
            format="multipart",
        )

        assert response.status_code == 404, response.data
        assert response.data["error"]["code"] == "PROFILE_NOT_FOUND"

    # ------------------------------------------------------------------
    # 7. boat_docs maps correctly to vessel_docs_verified (bonus test)
    # ------------------------------------------------------------------

    @pytest.mark.django_db
    def test_boat_docs_maps_to_vessel_docs_verified(self, owner_client, owner_with_profile):
        """Uploading boat_docs sets vessel_docs_verified on the profile."""
        saved_path = f"kyc/{owner_with_profile.id}/boat_docs/boat.pdf"
        fake_url = f"http://minio:9000/seaconnect/{saved_path}"

        with (
            patch("apps.accounts.views.default_storage.save", return_value=saved_path),
            patch("apps.accounts.views.default_storage.exists", return_value=True),
            patch("apps.accounts.views.default_storage.url", return_value=fake_url),
        ):
            response = owner_client.post(
                UPLOAD_URL,
                data={"file": _small_pdf("boat.pdf"), "doc_type": "boat_docs"},
                format="multipart",
            )

        assert response.status_code == 201, response.data
        owner_with_profile.refresh_from_db()
        assert owner_with_profile.vessel_docs_verified is True

    # ------------------------------------------------------------------
    # 8. JPEG file accepted (bonus test)
    # ------------------------------------------------------------------

    @pytest.mark.django_db
    def test_jpeg_file_accepted(self, owner_client, owner_with_profile):
        """JPEG images are accepted in addition to PDF."""
        saved_path = f"kyc/{owner_with_profile.id}/identity/photo.jpg"
        fake_url = f"http://minio:9000/seaconnect/{saved_path}"

        with (
            patch("apps.accounts.views.default_storage.save", return_value=saved_path),
            patch("apps.accounts.views.default_storage.exists", return_value=True),
            patch("apps.accounts.views.default_storage.url", return_value=fake_url),
        ):
            response = owner_client.post(
                UPLOAD_URL,
                data={"file": _jpeg_file(), "doc_type": "identity"},
                format="multipart",
            )

        assert response.status_code == 201, response.data

    # ------------------------------------------------------------------
    # 9. Non-owner role is rejected with 403 (bonus test)
    # ------------------------------------------------------------------

    @pytest.mark.django_db
    def test_customer_role_returns_403(self, region):
        """A customer account cannot access the upload endpoint."""
        customer = _make_user("customer-upload@test.com", UserRole.CUSTOMER, region)
        customer_client = _auth_client(customer)

        response = customer_client.post(
            UPLOAD_URL,
            data={"file": _small_pdf(), "doc_type": "identity"},
            format="multipart",
        )

        assert response.status_code == 403
