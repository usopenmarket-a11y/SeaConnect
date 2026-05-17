"""Accounts app tests — model layer, serializer validation, and endpoint contracts.

Covers cases NOT already in tests/test_auth.py (which tests the HTTP endpoints
in depth). This file focuses on:
  - UserManager.create_user / create_superuser behaviour
  - User model property and meta behaviour (UUID PK, full_name, ordering)
  - RegisterSerializer validation edge cases
  - Region FK and currency path (ADR-018)
  - Auth endpoint contracts as a self-contained acceptance suite

Endpoint URLs:
  POST /api/v1/auth/register/
  POST /api/v1/auth/login/
  POST /api/v1/auth/refresh/
  GET  /api/v1/users/me/
  PATCH /api/v1/users/me/

Rules:
  - Real PostgreSQL DB — no DB mocking (ADR rule)
  - @pytest.mark.django_db on every test touching the DB
  - APIClient (DRF) for all HTTP calls
  - All test data via helper functions at the top of this file
"""
import uuid

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import AuthProvider, User, UserRole
from apps.accounts.serializers import RegisterSerializer
from apps.core.models import Region


# ---------------------------------------------------------------------------
# URLs
# ---------------------------------------------------------------------------

REGISTER_URL = "/api/v1/auth/register/"
LOGIN_URL = "/api/v1/auth/login/"
REFRESH_URL = "/api/v1/auth/refresh/"
ME_URL = "/api/v1/users/me/"


# ---------------------------------------------------------------------------
# Helpers — no Model.objects.create in test bodies
# ---------------------------------------------------------------------------


def _make_region(code: str = "EG", currency: str = "EGP") -> Region:
    region, _ = Region.objects.get_or_create(
        code=code,
        defaults={
            "name_ar": "مصر",
            "name_en": "Egypt",
            "currency": currency,
            "timezone": "Africa/Cairo",
            "is_active": True,
        },
    )
    return region


def _make_user(
    email: str,
    role: str = UserRole.CUSTOMER,
    password: str = "TestPass123!",
    region: Region | None = None,
) -> User:
    if region is None:
        region = _make_region()
    return User.objects.create_user(
        email=email,
        password=password,
        first_name="Test",
        last_name="User",
        role=role,
        region=region,
    )


def _register_payload(**overrides) -> dict:
    base = {
        "email": "new@test.com",
        "password": "StrongPass99!",
        "first_name": "New",
        "last_name": "User",
    }
    base.update(overrides)
    return base


# ===========================================================================
# UserManager unit tests — no HTTP layer
# ===========================================================================


@pytest.mark.django_db
class TestUserManager:
    """Unit tests for UserManager.create_user and create_superuser."""

    def test_create_user_stores_hashed_password(self, db):
        """Password is stored as a hash, never plaintext."""
        user = _make_user("hash@test.com")
        assert user.password != "TestPass123!"
        assert user.check_password("TestPass123!")

    def test_create_user_normalises_email(self, db):
        """Email is normalised (domain lower-cased) on save."""
        user = User.objects.create_user(
            email="MixedCase@TEST.COM",
            password="TestPass123!",
        )
        assert user.email == "MixedCase@test.com"

    def test_create_user_without_email_raises(self, db):
        """Creating a user with an empty email raises ValueError."""
        with pytest.raises(ValueError, match="email address"):
            User.objects.create_user(email="", password="TestPass123!")

    def test_create_user_default_role_is_customer(self, db):
        """When role is not provided, the user gets the 'customer' role."""
        user = User.objects.create_user(email="norole@test.com", password="TestPass123!")
        assert user.role == UserRole.CUSTOMER

    def test_create_user_default_auth_provider_is_email(self, db):
        """New users default to email auth_provider."""
        user = _make_user("emailprov@test.com")
        assert user.auth_provider == AuthProvider.EMAIL

    def test_create_user_pk_is_uuid(self, db):
        """User PK must be a UUID (ADR-001)."""
        user = _make_user("uuid@test.com")
        assert isinstance(user.id, uuid.UUID)

    def test_create_superuser_sets_is_staff(self, db):
        """create_superuser sets is_staff=True."""
        superuser = User.objects.create_superuser(
            email="super@test.com",
            password="SuperPass99!",
        )
        assert superuser.is_staff is True

    def test_create_superuser_sets_is_superuser(self, db):
        """create_superuser sets is_superuser=True."""
        superuser = User.objects.create_superuser(
            email="super2@test.com",
            password="SuperPass99!",
        )
        assert superuser.is_superuser is True

    def test_create_superuser_default_role_is_admin(self, db):
        """create_superuser assigns the admin role by default."""
        superuser = User.objects.create_superuser(
            email="super3@test.com",
            password="SuperPass99!",
        )
        assert superuser.role == UserRole.ADMIN

    def test_create_superuser_is_verified(self, db):
        """create_superuser sets is_verified=True."""
        superuser = User.objects.create_superuser(
            email="super4@test.com",
            password="SuperPass99!",
        )
        assert superuser.is_verified is True


# ===========================================================================
# User model properties
# ===========================================================================


@pytest.mark.django_db
class TestUserModelProperties:
    """Tests for computed properties on the User model."""

    def test_full_name_returns_first_and_last(self, db):
        """full_name joins first_name and last_name with a space."""
        user = User.objects.create_user(
            email="fullname@test.com",
            password="TestPass123!",
            first_name="Ahmed",
            last_name="Mohamed",
        )
        assert user.full_name == "Ahmed Mohamed"

    def test_full_name_falls_back_to_email(self, db):
        """full_name returns email when both name fields are blank."""
        user = User.objects.create_user(
            email="nofullname@test.com",
            password="TestPass123!",
            first_name="",
            last_name="",
        )
        assert user.full_name == "nofullname@test.com"

    def test_str_returns_email(self, db):
        """__str__ returns the user's email."""
        user = _make_user("str@test.com")
        assert str(user) == "str@test.com"

    def test_user_region_fk(self, db):
        """User has a Region FK — currency path works without hardcoding (ADR-018)."""
        region = _make_region(code="AE", currency="AED")
        user = User.objects.create_user(
            email="aed@test.com",
            password="TestPass123!",
            region=region,
        )
        user.refresh_from_db()
        assert user.region.currency == "AED"

    def test_user_region_nullable(self, db):
        """Region FK is nullable — user without a region is valid."""
        user = User.objects.create_user(
            email="noregion@test.com",
            password="TestPass123!",
        )
        assert user.region is None

    def test_user_is_active_by_default(self, db):
        """Newly created users are active by default."""
        user = _make_user("active@test.com")
        assert user.is_active is True


# ===========================================================================
# RegisterSerializer validation
# ===========================================================================


@pytest.mark.django_db
class TestRegisterSerializer:
    """Unit tests for RegisterSerializer — validates without an HTTP call."""

    def test_valid_payload_creates_user(self, db):
        """A fully valid payload passes validation and creates a User."""
        data = {
            "email": "serial@test.com",
            "password": "StrongPass99!",
            "first_name": "Serial",
            "last_name": "Tester",
        }
        serializer = RegisterSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        user = serializer.save()
        assert User.objects.filter(email="serial@test.com").exists()
        assert user.role == UserRole.CUSTOMER

    def test_duplicate_email_fails_validation(self, db):
        """Registering a duplicate email raises a validation error."""
        _make_user("dup@test.com")
        data = _register_payload(email="dup@test.com")
        serializer = RegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert "email" in serializer.errors

    def test_short_password_fails_validation(self, db):
        """Password shorter than 8 characters fails Django's validators."""
        data = _register_payload(password="abc")
        serializer = RegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert "password" in serializer.errors

    def test_common_password_fails_validation(self, db):
        """A too-common password (e.g. 'password') fails Django's validators."""
        data = _register_payload(password="password")
        serializer = RegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert "password" in serializer.errors

    def test_password_is_not_exposed_on_read(self, db):
        """The password field is write_only and never appears in serialized output."""
        data = _register_payload(email="writeonly@test.com")
        serializer = RegisterSerializer(data=data)
        assert serializer.is_valid()
        user = serializer.save()
        read_serializer = RegisterSerializer(user)
        assert "password" not in read_serializer.data

    def test_role_vendor_is_allowed(self, db):
        """A vendor role can be registered through the serializer."""
        data = _register_payload(email="vendor_ser@test.com", role=UserRole.VENDOR)
        serializer = RegisterSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        user = serializer.save()
        assert user.role == UserRole.VENDOR

    def test_role_admin_is_rejected(self, db):
        """Admin role is NOT accepted at registration — choices list excludes it."""
        data = _register_payload(email="admin_ser@test.com", role=UserRole.ADMIN)
        serializer = RegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert "role" in serializer.errors


# ===========================================================================
# Register endpoint — POST /api/v1/auth/register/
# ===========================================================================


@pytest.mark.django_db
class TestRegisterEndpoint:
    """POST /api/v1/auth/register/"""

    def test_happy_register_creates_user(self, api_client):
        """Valid payload returns 201 and the user is persisted in the DB."""
        response = api_client.post(REGISTER_URL, data=_register_payload())
        assert response.status_code == 201
        assert User.objects.filter(email="new@test.com").exists()

    def test_happy_register_returns_tokens(self, api_client):
        """201 response contains access and refresh tokens."""
        response = api_client.post(REGISTER_URL, data=_register_payload())
        assert response.status_code == 201
        assert "tokens" in response.data
        assert "access" in response.data["tokens"]
        assert "refresh" in response.data["tokens"]

    def test_happy_register_returns_user_payload(self, api_client):
        """201 response contains a 'user' key with email and role."""
        response = api_client.post(REGISTER_URL, data=_register_payload())
        assert response.status_code == 201
        assert "user" in response.data
        assert response.data["user"]["email"] == "new@test.com"

    def test_sad_register_duplicate_email(self, api_client, db):
        """Second registration with same email returns 400."""
        _make_user("dup2@test.com")
        response = api_client.post(REGISTER_URL, data=_register_payload(email="dup2@test.com"))
        assert response.status_code == 400

    def test_sad_register_missing_email_returns_400(self, api_client):
        """Missing email field returns 400."""
        payload = _register_payload()
        del payload["email"]
        response = api_client.post(REGISTER_URL, data=payload)
        assert response.status_code == 400

    def test_sad_register_missing_password_returns_400(self, api_client):
        """Missing password field returns 400."""
        payload = _register_payload()
        del payload["password"]
        response = api_client.post(REGISTER_URL, data=payload)
        assert response.status_code == 400

    def test_sad_register_weak_password_returns_400(self, api_client):
        """A password that is too short returns 400."""
        response = api_client.post(REGISTER_URL, data=_register_payload(password="short"))
        assert response.status_code == 400

    def test_happy_register_default_role_customer(self, api_client):
        """When role is omitted the created user has role='customer'."""
        api_client.post(REGISTER_URL, data=_register_payload(email="roleless@test.com"))
        user = User.objects.get(email="roleless@test.com")
        assert user.role == UserRole.CUSTOMER

    def test_happy_register_owner_role(self, api_client):
        """Providing role='owner' creates an owner-role user."""
        api_client.post(REGISTER_URL, data=_register_payload(email="owner2@test.com", role="owner"))
        user = User.objects.get(email="owner2@test.com")
        assert user.role == UserRole.OWNER

    def test_sad_register_admin_role_rejected(self, api_client):
        """Attempting to register as admin is rejected with 400."""
        response = api_client.post(REGISTER_URL, data=_register_payload(role="admin"))
        assert response.status_code == 400


# ===========================================================================
# Login endpoint — POST /api/v1/auth/login/
# ===========================================================================


@pytest.mark.django_db
class TestLoginEndpoint:
    """POST /api/v1/auth/login/"""

    def test_happy_login_returns_tokens(self, api_client, db):
        """Valid credentials return 200 with access and refresh tokens."""
        _make_user("login@test.com", password="LoginPass99!")
        response = api_client.post(LOGIN_URL, data={"email": "login@test.com", "password": "LoginPass99!"})
        assert response.status_code == 200
        assert "access" in response.data
        assert "refresh" in response.data

    def test_sad_login_wrong_password_returns_401(self, api_client, db):
        """Wrong password returns 401."""
        _make_user("loginbad@test.com")
        response = api_client.post(
            LOGIN_URL,
            data={"email": "loginbad@test.com", "password": "WrongPassword!"},
        )
        assert response.status_code == 401

    def test_sad_login_unknown_email_returns_401(self, api_client):
        """Non-existent email returns 401."""
        response = api_client.post(
            LOGIN_URL,
            data={"email": "nobody@test.com", "password": "AnyPass123!"},
        )
        assert response.status_code == 401

    def test_happy_login_inactive_user_returns_401(self, api_client, db):
        """Deactivated users cannot log in — must return 401."""
        user = _make_user("inactive@test.com")
        user.is_active = False
        user.save(update_fields=["is_active"])
        response = api_client.post(
            LOGIN_URL,
            data={"email": "inactive@test.com", "password": "TestPass123!"},
        )
        assert response.status_code == 401


# ===========================================================================
# Token refresh — POST /api/v1/auth/refresh/
# ===========================================================================


@pytest.mark.django_db
class TestTokenRefreshEndpoint:
    """POST /api/v1/auth/refresh/"""

    def test_happy_refresh_returns_new_access_token(self, api_client, db):
        """A valid refresh token returns 200 with a new access token."""
        user = _make_user("refresh@test.com")
        refresh = RefreshToken.for_user(user)
        response = api_client.post(REFRESH_URL, data={"refresh": str(refresh)})
        assert response.status_code == 200
        assert "access" in response.data

    def test_sad_refresh_invalid_token_returns_401(self, api_client):
        """A garbage refresh token returns 401."""
        response = api_client.post(REFRESH_URL, data={"refresh": "not.a.valid.token"})
        assert response.status_code == 401


# ===========================================================================
# /users/me/ — GET and PATCH
# ===========================================================================


@pytest.mark.django_db
class TestMeEndpoint:
    """GET and PATCH /api/v1/users/me/"""

    def test_happy_me_returns_200(self, auth_client):
        """Authenticated GET returns 200."""
        response = auth_client.get(ME_URL)
        assert response.status_code == 200

    def test_happy_me_returns_email(self, auth_client, customer_user):
        """Response contains the authenticated user's email."""
        response = auth_client.get(ME_URL)
        assert response.data["email"] == customer_user.email

    def test_happy_me_returns_role(self, auth_client, customer_user):
        """Response contains the correct role."""
        response = auth_client.get(ME_URL)
        assert response.data["role"] == UserRole.CUSTOMER

    def test_sad_me_unauthenticated_returns_401(self, api_client):
        """No Bearer token returns 401."""
        response = api_client.get(ME_URL)
        assert response.status_code == 401

    def test_happy_me_response_has_no_password(self, auth_client):
        """Password hash must never be exposed in /me/ response."""
        response = auth_client.get(ME_URL)
        assert "password" not in response.data

    def test_happy_me_patch_first_name(self, auth_client, customer_user):
        """PATCH first_name persists the change."""
        auth_client.patch(ME_URL, data={"first_name": "Patched"})
        customer_user.refresh_from_db()
        assert customer_user.first_name == "Patched"

    def test_happy_me_patch_returns_200(self, auth_client):
        """PATCH returns 200 on valid update."""
        response = auth_client.patch(ME_URL, data={"first_name": "Valid"})
        assert response.status_code == 200

    def test_sad_me_patch_email_is_readonly(self, auth_client, customer_user):
        """PATCH email is silently ignored — email is read-only."""
        original_email = customer_user.email
        auth_client.patch(ME_URL, data={"email": "hacked@evil.com"})
        customer_user.refresh_from_db()
        assert customer_user.email == original_email

    def test_sad_me_patch_role_is_readonly(self, auth_client, customer_user):
        """PATCH role is silently ignored — role is read-only after registration."""
        auth_client.patch(ME_URL, data={"role": "admin"})
        customer_user.refresh_from_db()
        assert customer_user.role == UserRole.CUSTOMER

    def test_sad_me_put_not_allowed(self, auth_client):
        """PUT is not in the allowed methods for /me/ — must return 405."""
        response = auth_client.put(ME_URL, data={"first_name": "Full"})
        assert response.status_code == 405

    def test_happy_me_patch_preferred_lang(self, auth_client, customer_user):
        """PATCH preferred_lang to 'en' is persisted."""
        auth_client.patch(ME_URL, data={"preferred_lang": "en"})
        customer_user.refresh_from_db()
        assert customer_user.preferred_lang == "en"

    # -----------------------------------------------------------------------
    # Sprint 11C — four additional PATCH /users/me/ contract tests
    # -----------------------------------------------------------------------

    def test_happy_me_patch_phone_returns_updated_user(self, auth_client, customer_user):
        """PATCH phone persists the new value and response body reflects it."""
        response = auth_client.patch(ME_URL, data={"phone": "+201099887766"})
        assert response.status_code == 200
        assert response.data["phone"] == "+201099887766"
        customer_user.refresh_from_db()
        assert customer_user.phone == "+201099887766"

    def test_happy_me_patch_first_name_response_body(self, auth_client, customer_user):
        """PATCH first_name returns the updated first_name in the response body."""
        response = auth_client.patch(ME_URL, data={"first_name": "Renamed"})
        assert response.status_code == 200
        assert response.data["first_name"] == "Renamed"

    def test_sad_me_patch_email_not_updated(self, auth_client, customer_user):
        """PATCH with email field must NOT update the stored email (read-only).

        The serializer marks email as read_only so the field is silently
        ignored rather than returning 400 — but the DB value must stay the
        same, and the response must still be 200 (valid partial update).
        """
        original = customer_user.email
        response = auth_client.patch(ME_URL, data={"email": "attacker@evil.com"})
        assert response.status_code == 200
        customer_user.refresh_from_db()
        assert customer_user.email == original

    def test_sad_me_patch_unauthenticated_returns_401(self, api_client):
        """PATCH /users/me/ without a Bearer token must return 401."""
        response = api_client.patch(ME_URL, data={"first_name": "Ghost"})
        assert response.status_code == 401
