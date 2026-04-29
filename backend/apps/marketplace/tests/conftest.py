"""conftest.py — shared fixtures for marketplace tests.

Provides the api_client fixture (unauthenticated DRF APIClient) so that
marketplace tests can run from within the apps/ subtree, which is outside
the tests/ directory where the top-level conftest.py lives.
"""
import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client() -> APIClient:
    """Unauthenticated DRF APIClient."""
    return APIClient()
