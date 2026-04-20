"""Tests for the /health/ endpoint.

This is the minimal smoke test that verifies the Django project boots
and the health check view returns the expected response shape.

Run with: pytest tests/test_health.py -v
"""
import pytest
from django.test import Client


@pytest.mark.django_db
def test_health_check_returns_200() -> None:
    """GET /health/ must return HTTP 200."""
    client = Client()
    response = client.get("/health/")
    assert response.status_code == 200


@pytest.mark.django_db
def test_health_check_returns_json_status_ok() -> None:
    """GET /health/ must return {'status': 'ok'} in the response body."""
    client = Client()
    response = client.get("/health/")
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.django_db
def test_health_check_returns_service_name() -> None:
    """GET /health/ must identify the service as 'seaconnect-api'."""
    client = Client()
    response = client.get("/health/")
    data = response.json()
    assert data["service"] == "seaconnect-api"


@pytest.mark.django_db
def test_health_check_content_type_is_json() -> None:
    """GET /health/ must respond with Content-Type: application/json."""
    client = Client()
    response = client.get("/health/")
    assert "application/json" in response.get("Content-Type", "")
