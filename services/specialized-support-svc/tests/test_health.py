"""
Health endpoint tests for Specialized Support Service.
"""

import pytest


def test_health_endpoint(client):
    """Test that health endpoint returns healthy status."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "specialized-support-svc"
    assert "version" in data


def test_readiness_endpoint(client):
    """Test that readiness endpoint returns service status."""
    response = client.get("/health/ready")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ready"
    assert "services" in data
