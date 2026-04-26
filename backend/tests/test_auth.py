"""Integration tests for the accounts auth endpoints.

Endpoints under test:
  POST /api/v1/auth/register/
  POST /api/v1/auth/login/
  POST /api/v1/auth/refresh/
  POST /api/v1/auth/logout/
  GET  /api/v1/users/me/
  PATCH /api/v1/users/me/

Rules enforced:
  - Real PostgreSQL/SQLite DB — no mocks (ADR prohibition)
  - pytest-django @pytest.mark.django_db on every test
  - APIClient (DRF) for all requests
  - All fixtures via conftest.py
"""
import base64
import json

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.core.models import Region


REGISTER_URL = "/api/v1/auth/register/"
LOGIN_URL = "/api/v1/auth/login/"
REFRESH_URL = "/api/v1/auth/refresh/"
LOGOUT_URL = "/api/v1/auth/logout/"
ME_URL = "/api/v1/users/me/"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _decode_jwt_payload(token: str) -> dict:
    """Decode the payload segment of a JWT without verifying the signature.

    Used only in tests to inspect custom claims — never for auth decisions.
    """
    payload_b64 = token.split(".")[1]
    # JWT base64url may be missing padding — add it back.
    padding = 4 - len(payload_b64) % 4
    if padding != 4:
        payload_b64 += "=" * padding
    return json.loads(base64.urlsafe_b64decode(payload_b64))


def _register_payload(**overrides) -> dict:
    """Return a valid registration payload, with optional field overrides."""
    base = {
        "email": "newuser@test.com",
        "password": "StrongPass99!",
        "first_name": "New",
        "last_name": "User",
    }
    base.update(overrides)
    return base


# ===========================================================================
# Registration
# ===========================================================================


@pytest.mark.django_db
class TestRegister:
    """POST /api/v1/auth/register/"""

    def test_register_success(self, api_client: APIClient) -> None:
        """Valid payload returns 201 with user and tokens keys."""
        response = api_client.post(REGISTER_URL, data=_register_payload())
        assert response.status_code == 201
        assert "user" in response.data
        assert "tokens" in response.data

    def test_register_returns_jwt_tokens(self, api_client: APIClient) -> None:
        """tokens.access and tokens.refresh are non-empty strings."""
        response = api_client.post(REGISTER_URL, data=_register_payload())
        tokens = response.data["tokens"]
        assert isinstance(tokens["access"], str) and len(tokens["access"]) > 20
        assert isinstance(tokens["refresh"], str) and len(tokens["refresh"]) > 20

    def test_register_duplicate_email(self, api_client: APIClient, customer_user: User) -> None:
        """Second registration with the same email returns 400."""
        payload = _register_payload(email=customer_user.email)
        response = api_client.post(REGISTER_URL, data=payload)
        assert response.status_code == 400

    def test_register_weak_password(self, api_client: APIClient) -> None:
        """Password shorter than 8 characters returns 400."""
        response = api_client.post(REGISTER_URL, data=_register_payload(password="abc"))
        assert response.status_code == 400

    def test_register_missing_email(self, api_client: APIClient) -> None:
        """Omitting email returns 400."""
        payload = _register_payload()
        del payload["email"]
        response = api_client.post(REGISTER_URL, data=payload)
        assert response.status_code == 400

    def test_register_default_role_is_customer(self, api_client: APIClient) -> None:
        """When role is not provided, the created user has role 'customer'."""
        api_client.post(REGISTER_URL, data=_register_payload())
        user = User.objects.get(email="newuser@test.com")
        assert user.role == UserRole.CUSTOMER

    def test_register_owner_role(self, api_client: APIClient) -> None:
        """Providing role='owner' creates a user with role 'owner'."""
        payload = _register_payload(email="owner_new@test.com", role="owner")
        api_client.post(REGISTER_URL, data=payload)
        user = User.objects.get(email="owner_new@test.com")
        assert user.role == UserRole.OWNER

    def test_register_creates_user_in_db(self, api_client: APIClient) -> None:
        """A successful registration persists the user to the database."""
        api_client.post(REGISTER_URL, data=_register_payload())
        assert User.objects.filter(email="newuser@test.com").exists()

    def test_register_missing_password_returns_400(self, api_client: APIClient) -> None:
        """Omitting password returns 400."""
        payload = _register_payload()
        del payload["password"]
        response = api_client.post(REGISTER_URL, data=payload)
        assert response.status_code == 400

    def test_register_common_password_returns_400(self, api_client: APIClient) -> None:
        """A password that is too common (e.g. 'password123') returns 400."""
        response = api_client.post(REGISTER_URL, data=_register_payload(password="password123"))
        assert response.status_code == 400


# ===========================================================================
# Login
# ===========================================================================


@pytest.mark.django_db
class TestLogin:
    """POST /api/v1/auth/login/"""

    def test_login_success(self, api_client: APIClient, customer_user: User) -> None:
        """Valid credentials return 200 with access and refresh tokens."""
        response = api_client.post(
            LOGIN_URL,
            data={"email": customer_user.email, "password": "TestPass123!"},
        )
        assert response.status_code == 200
        assert "access" in response.data
        assert "refresh" in response.data

    def test_login_wrong_password(self, api_client: APIClient, customer_user: User) -> None:
        """Wrong password returns 401."""
        response = api_client.post(
            LOGIN_URL,
            data={"email": customer_user.email, "password": "WrongPass!"},
        )
        assert response.status_code == 401

    def test_login_unknown_email(self, api_client: APIClient) -> None:
        """Unknown email returns 401."""
        response = api_client.post(
            LOGIN_URL,
            data={"email": "nobody@test.com", "password": "AnyPass123!"},
        )
        assert response.status_code == 401

    def test_login_jwt_contains_role_claim(self, api_client: APIClient, customer_user: User) -> None:
        """The access token payload must contain a 'role' custom claim."""
        response = api_client.post(
            LOGIN_URL,
            data={"email": customer_user.email, "password": "TestPass123!"},
        )
        assert response.status_code == 200
        payload = _decode_jwt_payload(response.data["access"])
        assert "role" in payload

    def test_login_role_claim_matches_user_role(
        self, api_client: APIClient, owner_user: User
    ) -> None:
        """The 'role' claim in the access token matches the user's actual role."""
        response = api_client.post(
            LOGIN_URL,
            data={"email": owner_user.email, "password": "TestPass123!"},
        )
        payload = _decode_jwt_payload(response.data["access"])
        assert payload["role"] == UserRole.OWNER

    def test_login_jwt_contains_email_claim(self, api_client: APIClient, customer_user: User) -> None:
        """The access token payload must embed the user's email."""
        response = api_client.post(
            LOGIN_URL,
            data={"email": customer_user.email, "password": "TestPass123!"},
        )
        payload = _decode_jwt_payload(response.data["access"])
        assert payload.get("email") == customer_user.email


# ===========================================================================
# Token Refresh
# ===========================================================================


@pytest.mark.django_db
class TestTokenRefresh:
    """POST /api/v1/auth/refresh/"""

    def test_refresh_success(self, api_client: APIClient, customer_user: User) -> None:
        """A valid refresh token returns 200 and a new access token."""
        refresh = RefreshToken.for_user(customer_user)
        response = api_client.post(REFRESH_URL, data={"refresh": str(refresh)})
        assert response.status_code == 200
        assert "access" in response.data

    def test_refresh_new_access_token_is_string(
        self, api_client: APIClient, customer_user: User
    ) -> None:
        """The new access token is a non-empty string."""
        refresh = RefreshToken.for_user(customer_user)
        response = api_client.post(REFRESH_URL, data={"refresh": str(refresh)})
        assert isinstance(response.data["access"], str) and len(response.data["access"]) > 20

    def test_refresh_invalid_token_returns_401(self, api_client: APIClient) -> None:
        """A garbage refresh token returns 401."""
        response = api_client.post(REFRESH_URL, data={"refresh": "not.a.valid.token"})
        assert response.status_code == 401


# ===========================================================================
# Logout
# ===========================================================================


@pytest.mark.django_db
class TestLogout:
    """POST /api/v1/auth/logout/"""

    def test_logout_success(self, auth_client: APIClient, customer_user: User) -> None:
        """A valid refresh token is blacklisted and 204 is returned."""
        refresh = RefreshToken.for_user(customer_user)
        response = auth_client.post(LOGOUT_URL, data={"refresh": str(refresh)})
        assert response.status_code == 204

    def test_logout_invalid_token_returns_400(self, auth_client: APIClient) -> None:
        """A garbage token body returns 400 with an error payload."""
        response = auth_client.post(LOGOUT_URL, data={"refresh": "garbage.token.value"})
        assert response.status_code == 400

    def test_logout_missing_token_returns_400(self, auth_client: APIClient) -> None:
        """An empty body (no refresh key) returns 400."""
        response = auth_client.post(LOGOUT_URL, data={})
        assert response.status_code == 400

    def test_logout_missing_token_error_code(self, auth_client: APIClient) -> None:
        """Missing refresh token response includes MISSING_REFRESH_TOKEN error code."""
        response = auth_client.post(LOGOUT_URL, data={})
        assert response.data["error"]["code"] == "MISSING_REFRESH_TOKEN"

    def test_logout_requires_auth(self, api_client: APIClient, customer_user: User) -> None:
        """No Bearer header returns 401 — logout endpoint is protected."""
        refresh = RefreshToken.for_user(customer_user)
        response = api_client.post(LOGOUT_URL, data={"refresh": str(refresh)})
        assert response.status_code == 401

    def test_logout_blacklisted_token_cannot_refresh(
        self, auth_client: APIClient, api_client: APIClient, customer_user: User
    ) -> None:
        """After logout, the blacklisted token cannot be used to obtain a new access token."""
        refresh = RefreshToken.for_user(customer_user)
        auth_client.post(LOGOUT_URL, data={"refresh": str(refresh)})
        response = api_client.post(REFRESH_URL, data={"refresh": str(refresh)})
        assert response.status_code == 401


# ===========================================================================
# GET /api/v1/users/me/
# ===========================================================================


@pytest.mark.django_db
class TestUserMeGet:
    """GET /api/v1/users/me/"""

    def test_me_get_success(self, auth_client: APIClient) -> None:
        """Authenticated GET returns 200."""
        response = auth_client.get(ME_URL)
        assert response.status_code == 200

    def test_me_get_returns_email(self, auth_client: APIClient, customer_user: User) -> None:
        """Response body contains the authenticated user's email."""
        response = auth_client.get(ME_URL)
        assert response.data["email"] == customer_user.email

    def test_me_get_returns_role(self, auth_client: APIClient, customer_user: User) -> None:
        """Response body contains the user's role field."""
        response = auth_client.get(ME_URL)
        assert response.data["role"] == UserRole.CUSTOMER

    def test_me_get_unauthenticated_returns_401(self, api_client: APIClient) -> None:
        """No auth header returns 401."""
        response = api_client.get(ME_URL)
        assert response.status_code == 401

    def test_me_get_response_never_exposes_password(self, auth_client: APIClient) -> None:
        """The response must not include a password field."""
        response = auth_client.get(ME_URL)
        assert "password" not in response.data


# ===========================================================================
# PATCH /api/v1/users/me/
# ===========================================================================


@pytest.mark.django_db
class TestUserMePatch:
    """PATCH /api/v1/users/me/"""

    def test_me_patch_first_name(self, auth_client: APIClient, customer_user: User) -> None:
        """PATCH {first_name} returns 200 and persists the update."""
        response = auth_client.patch(ME_URL, data={"first_name": "Updated"})
        assert response.status_code == 200
        customer_user.refresh_from_db()
        assert customer_user.first_name == "Updated"

    def test_me_patch_first_name_reflected_in_response(
        self, auth_client: APIClient
    ) -> None:
        """The updated first_name appears in the response body."""
        response = auth_client.patch(ME_URL, data={"first_name": "Reflected"})
        assert response.data["first_name"] == "Reflected"

    def test_me_patch_last_name(self, auth_client: APIClient, customer_user: User) -> None:
        """PATCH {last_name} returns 200 and persists the update."""
        auth_client.patch(ME_URL, data={"last_name": "NewLast"})
        customer_user.refresh_from_db()
        assert customer_user.last_name == "NewLast"

    def test_me_patch_preferred_lang(self, auth_client: APIClient, customer_user: User) -> None:
        """PATCH {preferred_lang: 'en'} persists the language preference."""
        auth_client.patch(ME_URL, data={"preferred_lang": "en"})
        customer_user.refresh_from_db()
        assert customer_user.preferred_lang == "en"

    def test_me_patch_email_ignored(self, auth_client: APIClient, customer_user: User) -> None:
        """PATCH {email} is silently ignored — email is read-only on the profile endpoint."""
        original_email = customer_user.email
        auth_client.patch(ME_URL, data={"email": "hacked@evil.com"})
        customer_user.refresh_from_db()
        assert customer_user.email == original_email

    def test_me_patch_role_ignored(self, auth_client: APIClient, customer_user: User) -> None:
        """PATCH {role: 'admin'} is silently ignored — role is read-only."""
        auth_client.patch(ME_URL, data={"role": "admin"})
        customer_user.refresh_from_db()
        assert customer_user.role == UserRole.CUSTOMER

    def test_me_patch_unauthenticated_returns_401(self, api_client: APIClient) -> None:
        """PATCH without auth returns 401."""
        response = api_client.patch(ME_URL, data={"first_name": "Ghost"})
        assert response.status_code == 401

    def test_me_put_not_allowed(self, auth_client: APIClient) -> None:
        """PUT is not in the allowed methods — must return 405."""
        response = auth_client.put(ME_URL, data={"first_name": "Full"})
        assert response.status_code == 405
