"""Sprint 10C — BoatOwnerProfile / KYC endpoint tests.

Covers:
  - Lazy profile creation on first GET
  - Returning the existing profile on subsequent GETs
  - Submit transition (NOT_STARTED / IN_PROGRESS → SUBMITTED)
  - Role guard: non-owners cannot access owner-profile endpoints
  - Admin KYC list returns only SUBMITTED profiles
  - Admin approve: SUBMITTED → APPROVED, sets reviewed_by + reviewed_at
  - Admin reject: SUBMITTED → REJECTED, stores rejection_reason

Rules:
  - Real PostgreSQL DB (ADR rule — no DB mocking)
  - pytest.mark.django_db on every test that touches the DB
  - APIClient (DRF) for all HTTP calls

URLs under test (all prefixed by /api/v1/):
  GET  accounts/owner-profile/
  POST accounts/owner-profile/submit/
  GET  admin/kyc/
  POST admin/kyc/{id}/approve/
  POST admin/kyc/{id}/reject/
"""
import uuid

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import BoatOwnerProfile, KYCStatus, User, UserRole
from apps.core.models import Region


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_region() -> Region:
    region, _ = Region.objects.get_or_create(
        code="EG-KYC",
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


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def region(db) -> Region:
    return _make_region()


@pytest.fixture
def owner(db, region) -> User:
    return _make_user("owner@kyc-test.com", UserRole.OWNER, region)


@pytest.fixture
def customer(db, region) -> User:
    return _make_user("customer@kyc-test.com", UserRole.CUSTOMER, region)


@pytest.fixture
def admin(db, region) -> User:
    user = _make_user("admin@kyc-test.com", UserRole.ADMIN, region)
    user.is_staff = True
    user.save(update_fields=["is_staff"])
    return user


@pytest.fixture
def owner_client(owner) -> APIClient:
    return _auth_client(owner)


@pytest.fixture
def customer_client(customer) -> APIClient:
    return _auth_client(customer)


@pytest.fixture
def admin_client(admin) -> APIClient:
    return _auth_client(admin)


# ---------------------------------------------------------------------------
# Owner profile — basic CRUD
# ---------------------------------------------------------------------------


PROFILE_URL = "/api/v1/accounts/owner-profile/"
SUBMIT_URL = "/api/v1/accounts/owner-profile/submit/"
KYC_LIST_URL = "/api/v1/admin/kyc/"


class TestGetOwnerProfile:
    """GET /api/v1/accounts/owner-profile/"""

    @pytest.mark.django_db
    def test_get_owner_profile_creates_if_missing(self, owner_client, owner):
        """First GET creates a profile with NOT_STARTED status."""
        assert not BoatOwnerProfile.objects.filter(user=owner).exists()

        resp = owner_client.get(PROFILE_URL)

        assert resp.status_code == 200, resp.data
        assert resp.data["kyc_status"] == KYCStatus.NOT_STARTED
        assert resp.data["completed_steps"] == 0
        assert resp.data["total_steps"] == 6
        assert BoatOwnerProfile.objects.filter(user=owner).count() == 1

    @pytest.mark.django_db
    def test_get_owner_profile_returns_existing(self, owner_client, owner):
        """Subsequent GETs return the same profile, not a duplicate."""
        profile = BoatOwnerProfile.objects.create(
            user=owner,
            kyc_status=KYCStatus.IN_PROGRESS,
        )

        resp = owner_client.get(PROFILE_URL)

        assert resp.status_code == 200
        assert str(resp.data["id"]) == str(profile.id)
        assert resp.data["kyc_status"] == KYCStatus.IN_PROGRESS
        # Ensure no second profile was created
        assert BoatOwnerProfile.objects.filter(user=owner).count() == 1

    @pytest.mark.django_db
    def test_get_profile_requires_authentication(self):
        """Unauthenticated request is rejected with 401."""
        client = APIClient()
        resp = client.get(PROFILE_URL)
        assert resp.status_code == 401

    @pytest.mark.django_db
    def test_get_profile_requires_owner_role(self, customer_client):
        """Customer role is rejected with 403."""
        resp = customer_client.get(PROFILE_URL)
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Submit transition
# ---------------------------------------------------------------------------


class TestSubmitOwnerProfile:
    """POST /api/v1/accounts/owner-profile/submit/"""

    @pytest.mark.django_db
    def test_submit_profile_from_not_started(self, owner_client, owner):
        """NOT_STARTED → SUBMITTED succeeds."""
        resp = owner_client.post(SUBMIT_URL)

        assert resp.status_code == 200, resp.data
        assert resp.data["kyc_status"] == KYCStatus.SUBMITTED
        profile = BoatOwnerProfile.objects.get(user=owner)
        assert profile.kyc_status == KYCStatus.SUBMITTED

    @pytest.mark.django_db
    def test_submit_profile_from_in_progress(self, owner_client, owner):
        """IN_PROGRESS → SUBMITTED succeeds."""
        BoatOwnerProfile.objects.create(user=owner, kyc_status=KYCStatus.IN_PROGRESS)

        resp = owner_client.post(SUBMIT_URL)

        assert resp.status_code == 200
        assert resp.data["kyc_status"] == KYCStatus.SUBMITTED

    @pytest.mark.django_db
    def test_submit_profile_already_submitted_returns_409(self, owner_client, owner):
        """Submitting an already-submitted profile returns 409."""
        BoatOwnerProfile.objects.create(user=owner, kyc_status=KYCStatus.SUBMITTED)

        resp = owner_client.post(SUBMIT_URL)

        assert resp.status_code == 409
        assert resp.data["error"]["code"] == "INVALID_KYC_TRANSITION"

    @pytest.mark.django_db
    def test_submit_approved_profile_returns_409(self, owner_client, owner):
        """Submitting an approved profile returns 409."""
        BoatOwnerProfile.objects.create(user=owner, kyc_status=KYCStatus.APPROVED)

        resp = owner_client.post(SUBMIT_URL)

        assert resp.status_code == 409

    @pytest.mark.django_db
    def test_submit_profile_requires_owner_role(self, customer_client):
        """Customer role cannot submit a profile."""
        resp = customer_client.post(SUBMIT_URL)
        assert resp.status_code == 403

    @pytest.mark.django_db
    def test_submit_profile_requires_authentication(self):
        """Unauthenticated request is rejected."""
        client = APIClient()
        resp = client.post(SUBMIT_URL)
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Admin KYC list
# ---------------------------------------------------------------------------


class TestAdminKYCList:
    """GET /api/v1/admin/kyc/"""

    @pytest.mark.django_db
    def test_admin_kyc_list_shows_submitted(self, admin_client, owner, region):
        """Admin KYC list only returns SUBMITTED profiles."""
        # Create one of each status — only SUBMITTED should appear.
        other_owner = _make_user("other-owner@kyc-test.com", UserRole.OWNER, region)
        BoatOwnerProfile.objects.create(user=owner, kyc_status=KYCStatus.SUBMITTED)
        BoatOwnerProfile.objects.create(user=other_owner, kyc_status=KYCStatus.NOT_STARTED)

        resp = admin_client.get(KYC_LIST_URL)

        assert resp.status_code == 200, resp.data
        results = resp.data["results"]
        assert len(results) == 1
        assert results[0]["kyc_status"] == KYCStatus.SUBMITTED

    @pytest.mark.django_db
    def test_admin_kyc_list_excludes_deleted(self, admin_client, owner):
        """Soft-deleted profiles are excluded from the list."""
        BoatOwnerProfile.objects.create(
            user=owner, kyc_status=KYCStatus.SUBMITTED, is_deleted=True
        )

        resp = admin_client.get(KYC_LIST_URL)

        assert resp.status_code == 200
        assert len(resp.data["results"]) == 0

    @pytest.mark.django_db
    def test_admin_kyc_list_requires_admin_role(self, owner_client):
        """Owner role cannot access the admin KYC list."""
        resp = owner_client.get(KYC_LIST_URL)
        assert resp.status_code == 403

    @pytest.mark.django_db
    def test_admin_kyc_list_requires_authentication(self):
        """Unauthenticated request is rejected."""
        client = APIClient()
        resp = client.get(KYC_LIST_URL)
        assert resp.status_code == 401

    @pytest.mark.django_db
    def test_admin_kyc_list_response_shape(self, admin_client, owner):
        """Response includes expected fields for admin review."""
        BoatOwnerProfile.objects.create(user=owner, kyc_status=KYCStatus.SUBMITTED)

        resp = admin_client.get(KYC_LIST_URL)

        assert resp.status_code == 200
        result = resp.data["results"][0]
        for field in ("id", "owner_email", "owner_name", "kyc_status",
                      "completed_steps", "total_steps", "created_at"):
            assert field in result, f"Missing field: {field}"


# ---------------------------------------------------------------------------
# Admin KYC approve
# ---------------------------------------------------------------------------


class TestAdminKYCApprove:
    """POST /api/v1/admin/kyc/{id}/approve/"""

    @pytest.mark.django_db
    def test_admin_approve_sets_approved(self, admin_client, admin, owner):
        """Approving a submitted profile transitions it to APPROVED."""
        profile = BoatOwnerProfile.objects.create(
            user=owner, kyc_status=KYCStatus.SUBMITTED
        )
        url = f"/api/v1/admin/kyc/{profile.id}/approve/"

        resp = admin_client.post(url)

        assert resp.status_code == 200, resp.data
        assert resp.data["kyc_status"] == KYCStatus.APPROVED
        profile.refresh_from_db()
        assert profile.kyc_status == KYCStatus.APPROVED
        assert profile.reviewed_by_id == admin.id
        assert profile.reviewed_at is not None

    @pytest.mark.django_db
    def test_admin_approve_non_submitted_returns_409(self, admin_client, owner):
        """Approving a non-submitted profile returns 409."""
        profile = BoatOwnerProfile.objects.create(
            user=owner, kyc_status=KYCStatus.NOT_STARTED
        )
        url = f"/api/v1/admin/kyc/{profile.id}/approve/"

        resp = admin_client.post(url)

        assert resp.status_code == 409
        assert resp.data["error"]["code"] == "INVALID_KYC_TRANSITION"

    @pytest.mark.django_db
    def test_admin_approve_requires_admin_role(self, owner_client, owner):
        """Owner role cannot approve profiles."""
        profile = BoatOwnerProfile.objects.create(
            user=owner, kyc_status=KYCStatus.SUBMITTED
        )
        url = f"/api/v1/admin/kyc/{profile.id}/approve/"

        resp = owner_client.post(url)

        assert resp.status_code == 403

    @pytest.mark.django_db
    def test_admin_approve_unknown_id_returns_404(self, admin_client):
        """Approving a non-existent profile returns 404."""
        url = f"/api/v1/admin/kyc/{uuid.uuid4()}/approve/"
        resp = admin_client.post(url)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Admin KYC reject
# ---------------------------------------------------------------------------


class TestAdminKYCReject:
    """POST /api/v1/admin/kyc/{id}/reject/"""

    @pytest.mark.django_db
    def test_admin_reject_sets_rejected_with_reason(self, admin_client, admin, owner):
        """Rejecting a submitted profile transitions it to REJECTED with reason."""
        profile = BoatOwnerProfile.objects.create(
            user=owner, kyc_status=KYCStatus.SUBMITTED
        )
        url = f"/api/v1/admin/kyc/{profile.id}/reject/"
        reason = "National ID document is expired. Please upload a valid document."

        resp = admin_client.post(url, {"rejection_reason": reason}, format="json")

        assert resp.status_code == 200, resp.data
        assert resp.data["kyc_status"] == KYCStatus.REJECTED
        profile.refresh_from_db()
        assert profile.kyc_status == KYCStatus.REJECTED
        assert profile.rejection_reason == reason
        assert profile.reviewed_by_id == admin.id
        assert profile.reviewed_at is not None

    @pytest.mark.django_db
    def test_admin_reject_missing_reason_returns_400(self, admin_client, owner):
        """Rejecting without a reason returns 400."""
        profile = BoatOwnerProfile.objects.create(
            user=owner, kyc_status=KYCStatus.SUBMITTED
        )
        url = f"/api/v1/admin/kyc/{profile.id}/reject/"

        resp = admin_client.post(url, {}, format="json")

        assert resp.status_code == 400

    @pytest.mark.django_db
    def test_admin_reject_short_reason_returns_400(self, admin_client, owner):
        """Rejection reason shorter than 10 chars is rejected."""
        profile = BoatOwnerProfile.objects.create(
            user=owner, kyc_status=KYCStatus.SUBMITTED
        )
        url = f"/api/v1/admin/kyc/{profile.id}/reject/"

        resp = admin_client.post(url, {"rejection_reason": "Too short"}, format="json")

        assert resp.status_code == 400

    @pytest.mark.django_db
    def test_admin_reject_non_submitted_returns_409(self, admin_client, owner):
        """Rejecting a non-submitted profile returns 409."""
        profile = BoatOwnerProfile.objects.create(
            user=owner, kyc_status=KYCStatus.APPROVED
        )
        url = f"/api/v1/admin/kyc/{profile.id}/reject/"

        resp = admin_client.post(
            url,
            {"rejection_reason": "Changed our minds after approval."},
            format="json",
        )

        assert resp.status_code == 409

    @pytest.mark.django_db
    def test_admin_reject_requires_admin_role(self, owner_client, owner):
        """Owner role cannot reject profiles."""
        profile = BoatOwnerProfile.objects.create(
            user=owner, kyc_status=KYCStatus.SUBMITTED
        )
        url = f"/api/v1/admin/kyc/{profile.id}/reject/"

        resp = owner_client.post(
            url,
            {"rejection_reason": "This should fail due to role."},
            format="json",
        )

        assert resp.status_code == 403

    @pytest.mark.django_db
    def test_admin_reject_unknown_id_returns_404(self, admin_client):
        """Rejecting a non-existent profile returns 404."""
        url = f"/api/v1/admin/kyc/{uuid.uuid4()}/reject/"
        resp = admin_client.post(
            url,
            {"rejection_reason": "Does not matter — profile does not exist."},
            format="json",
        )
        assert resp.status_code == 404
