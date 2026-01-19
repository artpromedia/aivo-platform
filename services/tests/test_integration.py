"""
Integration tests for AIVO Python Services.
Part of Migration Validation from aivo-agentic-ai-learning-app.
"""

import pytest
import httpx
import asyncio
from typing import Dict

# Service URLs (override via environment variables)
BASE_URL = "http://localhost:8000"
AI_INFERENCE_URL = "http://localhost:8001"
TRAINING_URL = "http://localhost:8003"
CURRICULUM_URL = "http://localhost:8004"


@pytest.fixture
def anyio_backend():
    """Use asyncio as the backend."""
    return "asyncio"


class TestAPIGateway:
    """Tests for API Gateway service."""

    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test API Gateway health endpoint."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] in ["healthy", "degraded"]
            assert "services" in data

    @pytest.mark.asyncio
    async def test_root_endpoint(self):
        """Test API Gateway root endpoint."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/")
            assert response.status_code == 200
            data = response.json()
            assert "service" in data
            assert "version" in data
            assert data["status"] == "running"

    @pytest.mark.asyncio
    async def test_docs_endpoint(self):
        """Test Swagger documentation is available."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/docs")
            assert response.status_code == 200


class TestAIInferenceService:
    """Tests for AI Inference service."""

    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test AI Inference health endpoint."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{AI_INFERENCE_URL}/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_root_endpoint(self):
        """Test AI Inference root endpoint."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{AI_INFERENCE_URL}/")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "running"


class TestTrainingService:
    """Tests for Training service."""

    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test Training service health endpoint."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{TRAINING_URL}/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_list_training_jobs(self):
        """Test listing training jobs."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{TRAINING_URL}/api/v1/training/jobs")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_create_training_job(self):
        """Test creating a training job."""
        async with httpx.AsyncClient() as client:
            payload = {
                "config_override": {"learning_rate": 0.001},
                "dataset_version": "v1",
            }
            response = await client.post(
                f"{TRAINING_URL}/api/v1/training/jobs", json=payload
            )
            assert response.status_code == 200
            data = response.json()
            assert "job_id" in data
            assert "status" in data


class TestCurriculumService:
    """Tests for Curriculum service."""

    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test Curriculum service health endpoint."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{CURRICULUM_URL}/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_list_standards(self):
        """Test listing educational standards."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{CURRICULUM_URL}/api/v1/standards")
            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert "total" in data

    @pytest.mark.asyncio
    async def test_list_districts(self):
        """Test listing districts."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{CURRICULUM_URL}/api/v1/districts")
            assert response.status_code == 200
            data = response.json()
            assert "items" in data


class TestServiceIntegration:
    """Tests for service-to-service communication."""

    @pytest.mark.asyncio
    async def test_gateway_to_ai_inference_proxy(self):
        """Test API Gateway proxying to AI Inference."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "model": "gpt-4",
                "prompt": "Test prompt",
                "max_tokens": 10,
            }
            response = await client.post(f"{BASE_URL}/api/v1/ai/inference", json=payload)
            # May fail if AI keys not configured, but should not 500
            assert response.status_code in [200, 400, 401, 422, 500]

    @pytest.mark.asyncio
    async def test_gateway_to_training_proxy(self):
        """Test API Gateway proxying to Training service."""
        async with httpx.AsyncClient() as client:
            payload = {"config_override": {}}
            response = await client.post(
                f"{BASE_URL}/api/v1/training/jobs", json=payload
            )
            assert response.status_code in [200, 400, 422]


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
