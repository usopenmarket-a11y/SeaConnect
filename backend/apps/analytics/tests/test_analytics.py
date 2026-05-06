"""Tests for the analytics app — Sprint 14A.

Covers:
  AuditLogListView  GET /api/v1/analytics/audit-log/
  log_event()       service function
  AuditLogAdmin     append-only admin enforcement
  OwnerEarningsSummary model creation

Rules enforced:
  - NEVER mock the database — all DB operations use the real test DB.
  - @pytest.mark.django_db on every class.
  - APIClient from DRF for endpoint tests.
  - Real users created via User.objects.create_user (no factories needed;
    project uses direct ORM in tests/conftest.py per the established pattern).
"""
from __future__ import annotations

import uuid
from decimal import Decimal

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole
from apps.analytics.admin import AuditLogAdmin
from apps.analytics.models import AuditLog, OwnerEarningsSummary
from apps.analytics.services import log_event
from apps.core.models import Region

AUDIT_LOG_URL = "/api/v1/analytics/audit-log/"


# ---------------------------------------------------------------------------
# TestAuditLogListView — GET /api/v1/analytics/audit-log/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAuditLogListView:
    """Tests for the admin-only audit log list endpoint.

    Permission rule: IsAdminUser means is_staff=True.
    Anonymous → 401, non-staff → 403, staff → 200.
    """

    def test_happy_admin_can_list_audit_logs(self, admin_client: APIClient, admin_user: User):
        """Happy path: admin user gets 200 with a results list."""
        AuditLog.objects.create(
            event_type=AuditLog.EventType.BOOKING_CREATED,
            actor=admin_user,
        )
        response = admin_client.get(AUDIT_LOG_URL)
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert isinstance(data["results"], list)
        assert len(data["results"]) >= 1

    def test_sad_anonymous_gets_401(self, api_client: APIClient):
        """Anonymous request must return 401 Unauthorized."""
        response = api_client.get(AUDIT_LOG_URL)
        assert response.status_code == 401

    def test_sad_customer_role_gets_403(self, customer_client: APIClient):
        """Authenticated customer (non-staff) must receive 403 Forbidden."""
        response = customer_client.get(AUDIT_LOG_URL)
        assert response.status_code == 403

    def test_sad_owner_role_gets_403(self, owner_client: APIClient):
        """Authenticated owner (non-staff) must receive 403 Forbidden."""
        response = owner_client.get(AUDIT_LOG_URL)
        assert response.status_code == 403

    def test_happy_response_has_cursor_pagination_keys(self, admin_client: APIClient):
        """Response envelope must carry cursor pagination fields (ADR-013).

        DRF CursorPagination emits 'next', 'previous', 'results'.
        The SeaConnect ADR shape documents these as next_cursor / has_more
        for custom search endpoints; the standard DRF cursor pagination used
        here returns the standard 'next' URL key.
        """
        response = admin_client.get(AUDIT_LOG_URL)
        assert response.status_code == 200
        data = response.json()
        # Standard DRF CursorPagination response keys
        assert "results" in data
        # 'next' is None/null when there are no more pages
        assert "next" in data

    def test_happy_filters_by_event_type(
        self, admin_client: APIClient, admin_user: User
    ):
        """?event_type= query parameter filters results to matching event type only."""
        AuditLog.objects.create(
            event_type=AuditLog.EventType.BOOKING_CREATED,
            actor=admin_user,
        )
        AuditLog.objects.create(
            event_type=AuditLog.EventType.PAYMENT_CONFIRMED,
            actor=admin_user,
        )

        response = admin_client.get(
            AUDIT_LOG_URL, {"event_type": AuditLog.EventType.BOOKING_CREATED}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) >= 1
        for entry in data["results"]:
            assert entry["event_type"] == AuditLog.EventType.BOOKING_CREATED

    def test_happy_filters_by_reference_type(
        self, admin_client: APIClient, admin_user: User
    ):
        """?reference_type= query parameter filters results by reference_type field."""
        booking_ref = uuid.uuid4()
        AuditLog.objects.create(
            event_type=AuditLog.EventType.BOOKING_CREATED,
            actor=admin_user,
            reference_id=booking_ref,
            reference_type="booking",
        )
        AuditLog.objects.create(
            event_type=AuditLog.EventType.ORDER_CREATED,
            actor=admin_user,
            reference_type="order",
        )

        response = admin_client.get(AUDIT_LOG_URL, {"reference_type": "booking"})
        assert response.status_code == 200
        data = response.json()
        for entry in data["results"]:
            assert entry["reference_type"] == "booking"

    def test_happy_ordered_newest_first(
        self, admin_client: APIClient, admin_user: User
    ):
        """Audit log entries must be returned newest first (ordering: -created_at)."""
        first = AuditLog.objects.create(
            event_type=AuditLog.EventType.USER_REGISTERED,
            actor=admin_user,
        )
        second = AuditLog.objects.create(
            event_type=AuditLog.EventType.BOOKING_CREATED,
            actor=admin_user,
        )
        # Ensure second is newer by bumping its created_at explicitly
        # (usually same-second in fast test runs, so force via QuerySet update)
        from django.utils import timezone
        import datetime
        AuditLog.objects.filter(pk=second.pk).update(
            created_at=first.created_at + datetime.timedelta(seconds=1)
        )

        response = admin_client.get(AUDIT_LOG_URL)
        assert response.status_code == 200
        results = response.json()["results"]
        # At least 2 records should be present
        assert len(results) >= 2
        # Verify ordering: created_at of first result >= created_at of second
        first_ts = results[0]["created_at"]
        second_ts = results[1]["created_at"]
        assert first_ts >= second_ts, (
            f"Expected newest first, but got {first_ts} before {second_ts}"
        )

    def test_happy_response_includes_actor_email(
        self, admin_client: APIClient, admin_user: User
    ):
        """Serializer must expose actor_email as a computed field for admin readability."""
        AuditLog.objects.create(
            event_type=AuditLog.EventType.USER_KYC_APPROVED,
            actor=admin_user,
        )
        response = admin_client.get(AUDIT_LOG_URL)
        assert response.status_code == 200
        entry = response.json()["results"][0]
        assert "actor_email" in entry
        assert entry["actor_email"] == admin_user.email

    def test_happy_system_event_actor_email_is_null(self, admin_client: APIClient):
        """System-generated events have actor=None; actor_email must be null in response."""
        AuditLog.objects.create(
            event_type=AuditLog.EventType.PAYOUT_SENT,
            actor=None,
        )
        response = admin_client.get(AUDIT_LOG_URL)
        assert response.status_code == 200
        # Find the payout_sent entry (it may not be the first if others exist)
        results = response.json()["results"]
        payout_entry = next(
            (r for r in results if r["event_type"] == "payout_sent"), None
        )
        assert payout_entry is not None
        assert payout_entry["actor_email"] is None

    def test_happy_cursor_pagination_next_page(
        self, admin_client: APIClient, admin_user: User
    ):
        """When more than page_size entries exist, 'next' must be a non-null URL."""
        # SeaConnectCursorPagination.page_size = 20; create 21 entries
        for i in range(21):
            AuditLog.objects.create(
                event_type=AuditLog.EventType.BOOKING_CREATED,
                actor=admin_user,
                metadata={"index": i},
            )

        response = admin_client.get(AUDIT_LOG_URL)
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 20
        # 'next' must be a URL string pointing to the second page
        assert data["next"] is not None
        assert "cursor=" in data["next"]

    def test_happy_post_not_allowed(self, admin_client: APIClient):
        """Audit-log endpoint is read-only; POST must return 405 Method Not Allowed."""
        response = admin_client.post(AUDIT_LOG_URL, data={})
        assert response.status_code == 405


# ---------------------------------------------------------------------------
# TestLogEventService — log_event() service function
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestLogEventService:
    """Unit tests for the log_event() service function.

    log_event() must:
      - Always create an AuditLog row with the correct fields.
      - Never raise — silently return None on failure.
      - Persist metadata dicts exactly.
    """

    def test_happy_creates_audit_log_row(self, customer_user: User):
        """log_event() must create exactly one AuditLog row with the given event_type."""
        before_count = AuditLog.objects.count()
        result = log_event(
            event_type=AuditLog.EventType.BOOKING_CREATED,
            actor=customer_user,
        )
        assert AuditLog.objects.count() == before_count + 1
        assert result is not None
        assert isinstance(result, AuditLog)
        assert result.event_type == AuditLog.EventType.BOOKING_CREATED

    def test_happy_stores_actor_reference(self, customer_user: User):
        """log_event() must store the actor FK pointing to the provided user."""
        result = log_event(
            event_type=AuditLog.EventType.USER_REGISTERED,
            actor=customer_user,
        )
        assert result is not None
        assert result.actor_id == customer_user.id

    def test_happy_stores_metadata_dict(self, customer_user: User):
        """metadata dict must be persisted exactly as provided."""
        meta = {"yacht_id": str(uuid.uuid4()), "amount": "1500.00", "currency": "EGP"}
        result = log_event(
            event_type=AuditLog.EventType.BOOKING_CREATED,
            actor=customer_user,
            metadata=meta,
        )
        assert result is not None
        # Reload from DB to confirm persistence
        stored = AuditLog.objects.get(pk=result.pk)
        assert stored.metadata == meta

    def test_happy_stores_reference_id_and_type(self):
        """reference_id and reference_type must be persisted correctly."""
        ref_id = uuid.uuid4()
        result = log_event(
            event_type=AuditLog.EventType.PAYMENT_CONFIRMED,
            actor=None,
            reference_id=ref_id,
            reference_type="payment",
        )
        assert result is not None
        stored = AuditLog.objects.get(pk=result.pk)
        assert stored.reference_id == ref_id
        assert stored.reference_type == "payment"

    def test_happy_stores_monetary_fields(self):
        """amount and currency must be persisted precisely."""
        result = log_event(
            event_type=AuditLog.EventType.PAYMENT_CONFIRMED,
            amount=Decimal("3500.50"),
            currency="EGP",
        )
        assert result is not None
        stored = AuditLog.objects.get(pk=result.pk)
        assert stored.amount == Decimal("3500.50")
        assert stored.currency == "EGP"

    def test_happy_stores_ip_address(self):
        """ip_address must be persisted when provided."""
        result = log_event(
            event_type=AuditLog.EventType.USER_REGISTERED,
            ip_address="192.168.1.100",
        )
        assert result is not None
        stored = AuditLog.objects.get(pk=result.pk)
        assert stored.ip_address == "192.168.1.100"

    def test_happy_system_event_actor_none(self):
        """System events (no actor) must create a row with actor=None."""
        result = log_event(
            event_type=AuditLog.EventType.PAYOUT_SENT,
        )
        assert result is not None
        assert result.actor_id is None

    def test_happy_metadata_defaults_to_empty_dict(self):
        """When metadata is omitted, the persisted value must be {} not None."""
        result = log_event(event_type=AuditLog.EventType.COMPETITION_ENTRY)
        assert result is not None
        stored = AuditLog.objects.get(pk=result.pk)
        assert stored.metadata == {}

    def test_sad_never_raises_on_invalid_event_type(self):
        """log_event() must never raise, even with an unrecognised event_type.

        Django's choices= is validation-only — the DB accepts any string value,
        so the service stores it without error. The key contract is that
        log_event() never propagates an exception to the caller.
        """
        try:
            log_event(event_type="completely_invalid_event_type_xyz")
        except Exception as exc:  # noqa: BLE001
            raise AssertionError(f"log_event() must not raise, but got: {exc}") from exc

    def test_sad_never_raises_on_bad_ip(self):
        """An un-parseable IP address causes a ValidationError; must return None."""
        result = log_event(
            event_type=AuditLog.EventType.USER_REGISTERED,
            ip_address="not-an-ip-address",
        )
        assert result is None

    def test_happy_reference_id_as_string_uuid(self):
        """reference_id accepted as a string UUID (converted to UUID internally)."""
        ref_str = str(uuid.uuid4())
        result = log_event(
            event_type=AuditLog.EventType.ORDER_CREATED,
            reference_id=ref_str,
            reference_type="order",
        )
        assert result is not None
        stored = AuditLog.objects.get(pk=result.pk)
        assert str(stored.reference_id) == ref_str


# ---------------------------------------------------------------------------
# TestAuditLogAdminAppendOnly — AuditLogAdmin permission overrides
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAuditLogAdminAppendOnly:
    """Verify that AuditLogAdmin enforces the append-only contract.

    ADR-012: AuditLog rows must never be mutated or deleted via the admin.
    The admin class overrides has_add_permission, has_change_permission,
    and has_delete_permission to all return False.
    """

    def test_has_add_permission_returns_false(self, admin_user: User):
        """AuditLogAdmin.has_add_permission must always return False."""
        from django.test import RequestFactory
        from django.contrib.admin.sites import AdminSite

        site = AdminSite()
        admin_instance = AuditLogAdmin(AuditLog, site)
        request = RequestFactory().get("/admin/analytics/auditlog/add/")
        request.user = admin_user
        assert admin_instance.has_add_permission(request) is False

    def test_has_change_permission_returns_false(self, admin_user: User):
        """AuditLogAdmin.has_change_permission must always return False."""
        from django.test import RequestFactory
        from django.contrib.admin.sites import AdminSite

        site = AdminSite()
        admin_instance = AuditLogAdmin(AuditLog, site)
        request = RequestFactory().get("/admin/analytics/auditlog/")
        request.user = admin_user

        # Without obj
        assert admin_instance.has_change_permission(request) is False
        # With an obj
        log = AuditLog.objects.create(event_type=AuditLog.EventType.USER_REGISTERED)
        assert admin_instance.has_change_permission(request, obj=log) is False

    def test_has_delete_permission_returns_false(self, admin_user: User):
        """AuditLogAdmin.has_delete_permission must always return False."""
        from django.test import RequestFactory
        from django.contrib.admin.sites import AdminSite

        site = AdminSite()
        admin_instance = AuditLogAdmin(AuditLog, site)
        request = RequestFactory().get("/admin/analytics/auditlog/")
        request.user = admin_user

        # Without obj
        assert admin_instance.has_delete_permission(request) is False
        # With an obj
        log = AuditLog.objects.create(event_type=AuditLog.EventType.PAYOUT_SENT)
        assert admin_instance.has_delete_permission(request, obj=log) is False


# ---------------------------------------------------------------------------
# TestOwnerEarningsSummaryModel — model-level tests (no HTTP endpoint exposed)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestOwnerEarningsSummaryModel:
    """Model-level tests for OwnerEarningsSummary.

    No HTTP endpoint is exposed for this model — it is populated by Celery Beat.
    Tests verify:
      - Row creation with correct field values.
      - unique_together constraint on (owner, year, month).
      - String representation.
    """

    def test_happy_create_earnings_summary(self, owner_user: User):
        """OwnerEarningsSummary row can be created with all required fields."""
        summary = OwnerEarningsSummary.objects.create(
            owner=owner_user,
            year=2026,
            month=5,
            gross_revenue=Decimal("15000.00"),
            platform_fee=Decimal("1500.00"),
            net_revenue=Decimal("13500.00"),
            currency="EGP",
            booking_count=10,
        )
        assert summary.pk is not None
        assert summary.gross_revenue == Decimal("15000.00")
        assert summary.platform_fee == Decimal("1500.00")
        assert summary.net_revenue == Decimal("13500.00")
        assert summary.currency == "EGP"
        assert summary.booking_count == 10

    def test_happy_str_representation(self, owner_user: User):
        """__str__ must include owner, year, month, and currency."""
        summary = OwnerEarningsSummary.objects.create(
            owner=owner_user,
            year=2026,
            month=3,
            gross_revenue=Decimal("5000.00"),
            platform_fee=Decimal("500.00"),
            net_revenue=Decimal("4500.00"),
            currency="EGP",
            booking_count=5,
        )
        text = str(summary)
        assert "2026" in text
        assert "03" in text
        assert "EGP" in text

    def test_sad_unique_together_owner_year_month(self, owner_user: User):
        """Creating a second row for the same (owner, year, month) must raise IntegrityError."""
        from django.db import IntegrityError

        OwnerEarningsSummary.objects.create(
            owner=owner_user,
            year=2026,
            month=1,
            gross_revenue=Decimal("1000.00"),
            platform_fee=Decimal("100.00"),
            net_revenue=Decimal("900.00"),
            currency="EGP",
            booking_count=2,
        )
        with pytest.raises(IntegrityError):
            OwnerEarningsSummary.objects.create(
                owner=owner_user,
                year=2026,
                month=1,
                gross_revenue=Decimal("2000.00"),
                platform_fee=Decimal("200.00"),
                net_revenue=Decimal("1800.00"),
                currency="EGP",
                booking_count=4,
            )

    def test_happy_ordering_newest_year_month_first(self, owner_user: User):
        """Default ordering must be -year, -month (most recent period first)."""
        OwnerEarningsSummary.objects.create(
            owner=owner_user,
            year=2025,
            month=12,
            gross_revenue=Decimal("1000.00"),
            platform_fee=Decimal("100.00"),
            net_revenue=Decimal("900.00"),
            currency="EGP",
            booking_count=1,
        )
        OwnerEarningsSummary.objects.create(
            owner=owner_user,
            year=2026,
            month=4,
            gross_revenue=Decimal("2000.00"),
            platform_fee=Decimal("200.00"),
            net_revenue=Decimal("1800.00"),
            currency="EGP",
            booking_count=2,
        )
        summaries = list(
            OwnerEarningsSummary.objects.filter(owner=owner_user).values("year", "month")
        )
        assert summaries[0]["year"] == 2026
        assert summaries[0]["month"] == 4
        assert summaries[1]["year"] == 2025

    def test_happy_booking_count_defaults_to_zero(self, owner_user: User):
        """booking_count field must default to 0 when not specified."""
        summary = OwnerEarningsSummary.objects.create(
            owner=owner_user,
            year=2026,
            month=6,
            gross_revenue=Decimal("0.00"),
            platform_fee=Decimal("0.00"),
            net_revenue=Decimal("0.00"),
            currency="EGP",
        )
        assert summary.booking_count == 0
