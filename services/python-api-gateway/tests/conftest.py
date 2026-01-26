"""
Pytest configuration for Python API Gateway tests.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create a test client for the FastAPI application."""
    from app.main import app
    return TestClient(app)


@pytest.fixture
def sample_auth_token():
    """Sample authentication token for testing."""
    return "test-bearer-token-12345"


@pytest.fixture
def sample_request_context():
    """Sample request context for testing."""
    return {
        "tenant_id": "tenant-123",
        "user_id": "user-456",
        "roles": ["teacher", "admin"],
        "permissions": ["read:students", "write:grades"],
    }
