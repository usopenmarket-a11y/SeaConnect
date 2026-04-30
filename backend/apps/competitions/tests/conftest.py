"""conftest.py — shared fixtures for competitions tests.

Provides the api_client fixture so competitions tests can run from within the
apps/ subtree, which is outside the top-level tests/ directory where the
global conftest.py lives.
"""
import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client() -> APIClient:
    """Unauthenticated DRF APIClient."""
    return APIClient()
