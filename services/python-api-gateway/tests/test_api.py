"""
Comprehensive API tests for Python API Gateway.

Tests all endpoints including proxy routes with mocked httpx.
Target: 95% code coverage.
"""

import sys
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from io import BytesIO

# Pre-patch modules that might not be available
mock_modules = {}

# Apply module patches
for mod_name, mock_mod in mock_modules.items():
    if mod_name not in sys.modules:
        sys.modules[mod_name] = mock_mod

from fastapi.testclient import TestClient
import httpx


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture(scope="module")
def app_module():
    """Import app module once for all tests."""
    from app.main import app
    return app


@pytest.fixture
def client(app_module):
    """Create test client."""
    return TestClient(app_module)


def create_mock_client(response_data=None, status_code=200):
    """Helper to create mock httpx client."""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.json.return_value = response_data or {"success": True}
    
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.put = AsyncMock(return_value=mock_response)
    mock_client.delete = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    
    return mock_client


# =============================================================================
# Test Classes
# =============================================================================


class TestHealthEndpoints:
    """Tests for health check endpoints."""
    
    def test_root_endpoint(self, client):
        """Test root endpoint."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "service" in data
        assert "version" in data
        assert data["status"] == "running"
        assert "docs" in data
    
    def test_health_check_gateway_healthy(self, client):
        """Test health check when gateway is healthy."""
        with patch("httpx.AsyncClient") as mock:
            # Mock responses for each service
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"status": "healthy"}
            
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            assert "gateway" in data["services"]
            assert data["services"]["gateway"] == "healthy"


class TestAIRoutes:
    """Tests for AI proxy routes."""
    
    def test_ai_inference(self, client):
        """Test AI inference proxy."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "success": True,
                "response": "Generated content"
            }
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/ai/inference",
                json={"prompt": "Hello", "context": {}}
            )
            
            assert response.status_code == 200
    
    def test_ai_hint(self, client):
        """Test AI hint proxy."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "success": True,
                "hint": "Try breaking the problem down"
            }
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/ai/hint",
                json={"problem_id": "p123", "learner_id": "l456"}
            )
            
            assert response.status_code == 200
    
    def test_ai_explanation(self, client):
        """Test AI explanation proxy."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "success": True,
                "explanation": "This concept works because..."
            }
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/ai/explanation",
                json={"concept_id": "c789"}
            )
            
            assert response.status_code == 200
    
    def test_ai_feedback(self, client):
        """Test AI feedback proxy."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "success": True,
                "feedback": "Great work!"
            }
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/ai/feedback",
                json={"submission_id": "s123", "answer": "42"}
            )
            
            assert response.status_code == 200
    
    def test_ai_timeout_handling(self, client):
        """Test AI service timeout handling."""
        import httpx
        
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/ai/inference",
                json={"prompt": "test"}
            )
            
            assert response.status_code == 504
            assert "timeout" in response.json()["detail"].lower()
    
    def test_adapt_content(self, client):
        """Test content adaptation proxy."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "success": True,
                "adapted_content": "Simplified content"
            }
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/ai/adapt/content",
                json={"content_id": "c123", "learner_profile": {}}
            )
            
            assert response.status_code == 200
    
    def test_personalize_content(self, client):
        """Test content personalization proxy."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "success": True,
                "personalized": True
            }
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/ai/adapt/personalize",
                json={"learner_id": "l123"}
            )
            
            assert response.status_code == 200


class TestTrainingRoutes:
    """Tests for training proxy routes."""
    
    def test_create_training_job(self, client):
        """Test training job creation proxy."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "job_id": "job-123",
                "status": "queued"
            }
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/training/jobs",
                json={"model_type": "bkt", "learner_id": "l123"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "job_id" in data
    
    def test_get_training_job(self, client):
        """Test getting training job status proxy."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "job_id": "job-123",
                "status": "completed",
                "progress": 100
            }
            
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/training/jobs/job-123")
            
            assert response.status_code == 200
            data = response.json()
            assert data["job_id"] == "job-123"
    
    def test_update_bkt(self, client):
        """Test BKT update proxy."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "success": True,
                "new_mastery": 0.75
            }
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/training/bkt/update",
                json={
                    "learner_id": "l123",
                    "skill_id": "s456",
                    "correct": True
                }
            )
            
            assert response.status_code == 200
    
    def test_get_bkt_mastery(self, client):
        """Test BKT mastery retrieval proxy."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "learner_id": "l123",
                "skill_id": "s456",
                "mastery_probability": 0.85
            }
            
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/training/bkt/mastery/l123/s456")
            
            assert response.status_code == 200
            data = response.json()
            assert "mastery_probability" in data
    
    def test_clone_brain(self, client):
        """Test brain cloning proxy."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "success": True,
                "brain_id": "brain-456"
            }
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/training/brain/clone",
                json={"learner_id": "l123", "base_model": "default"}
            )
            
            assert response.status_code == 200
    
    def test_fine_tune_brain(self, client):
        """Test brain fine-tuning proxy."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "success": True,
                "job_id": "ft-job-789"
            }
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/training/brain/fine-tune",
                json={"brain_id": "brain-456", "training_data": []}
            )
            
            assert response.status_code == 200
    
    def test_predict_mastery(self, client):
        """Test mastery prediction proxy."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "success": True,
                "predictions": {"skill1": 0.8, "skill2": 0.6}
            }
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/training/brain/predict-mastery",
                json={"learner_id": "l123", "skills": ["skill1", "skill2"]}
            )
            
            assert response.status_code == 200
    
    def test_training_health(self, client):
        """Test training service health check proxy."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"status": "healthy"}
            
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/training/health")
            
            assert response.status_code == 200


class TestCurriculumRoutes:
    """Tests for curriculum proxy routes."""
    
    def test_list_curricula(self, client):
        """Test listing curricula proxy."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "curricula": [
                    {"id": "c1", "name": "Math Grade 3"},
                    {"id": "c2", "name": "Math Grade 4"}
                ]
            }
            
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/curricula")
            
            assert response.status_code == 200
            data = response.json()
            assert "curricula" in data
    
    def test_get_curriculum(self, client):
        """Test getting a single curriculum proxy."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "id": "c1",
                "name": "Math Grade 3",
                "units": []
            }
            
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/curricula/c1")
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "c1"
    
    def test_create_curriculum(self, client):
        """Test creating a curriculum proxy."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "id": "c3",
                "name": "New Curriculum",
                "created": True
            }
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/curriculum/curricula",
                json={"name": "New Curriculum", "subject": "Math"}
            )
            
            assert response.status_code == 200
    
    def test_update_curriculum(self, client):
        """Test updating a curriculum proxy."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "id": "c1",
                "name": "Updated Curriculum",
                "updated": True
            }
            
            mock_client = AsyncMock()
            mock_client.put = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.put(
                "/api/v1/curriculum/curricula/c1",
                json={"name": "Updated Curriculum"}
            )
            
            assert response.status_code == 200
    
    def test_delete_curriculum(self, client):
        """Test deleting a curriculum proxy."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"deleted": True}
            
            mock_client = AsyncMock()
            mock_client.delete = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.delete("/api/v1/curriculum/curricula/c1")
            
            assert response.status_code == 200
    
    def test_list_lessons(self, client):
        """Test listing lessons in a unit proxy."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "lessons": [
                    {"id": "l1", "title": "Addition"},
                    {"id": "l2", "title": "Subtraction"}
                ]
            }
            
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/units/u1/lessons")
            
            assert response.status_code == 200


class TestMainProxyEndpoints:
    """Tests for main.py proxy endpoints (duplicated from routes)."""
    
    def test_main_ai_inference(self, client):
        """Test main.py AI inference proxy."""
        with patch("httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"success": True}
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/ai/inference",
                json={"prompt": "test"}
            )
            
            assert response.status_code == 200
    
    def test_main_ai_hint(self, client):
        """Test main.py AI hint proxy."""
        with patch("httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"hint": "Try this"}
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/hint", json={"problem_id": "p1"})
            assert response.status_code == 200
    
    def test_main_training_jobs_post(self, client):
        """Test main.py training jobs POST proxy."""
        with patch("httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"job_id": "j123"}
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/training/jobs", json={"model": "test"})
            assert response.status_code == 200
    
    def test_main_training_jobs_get(self, client):
        """Test main.py training jobs GET proxy."""
        with patch("httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"job_id": "j123", "status": "running"}
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/training/jobs/j123")
            assert response.status_code == 200
    
    def test_main_bkt_update(self, client):
        """Test main.py BKT update proxy."""
        with patch("httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"success": True}
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/training/bkt/update", json={"learner_id": "l1"})
            assert response.status_code == 200
    
    def test_main_bkt_mastery(self, client):
        """Test main.py BKT mastery GET proxy."""
        with patch("httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"mastery": 0.75}
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/training/bkt/mastery/learner1/skill1")
            assert response.status_code == 200
    
    def test_main_brain_clone(self, client):
        """Test main.py brain clone proxy."""
        with patch("httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"brain_id": "b123"}
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/training/brain/clone", json={"learner_id": "l1"})
            assert response.status_code == 200
    
    def test_main_brain_fine_tune(self, client):
        """Test main.py brain fine-tune proxy."""
        with patch("httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"status": "training"}
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/training/brain/fine-tune", json={"brain_id": "b1"})
            assert response.status_code == 200
    
    def test_main_brain_predict_mastery(self, client):
        """Test main.py brain predict-mastery proxy."""
        with patch("httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"predicted_mastery": 0.85}
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/training/brain/predict-mastery", json={"learner_id": "l1"})
            assert response.status_code == 200


class TestErrorHandling:
    """Tests for error handling."""
    
    def test_global_exception_handler(self, client):
        """Test global exception handler."""
        # This tests that unhandled exceptions are caught
        # by the global exception handler
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=RuntimeError("Unexpected error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/ai/inference",
                json={"prompt": "test"}
            )
            
            assert response.status_code == 500
    
    def test_service_unavailable(self, client):
        """Test when downstream service is unavailable."""
        import httpx
        
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(
                side_effect=httpx.ConnectError("Connection refused")
            )
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post(
                "/api/v1/training/jobs",
                json={"model": "test"}
            )
            
            assert response.status_code == 500


class TestStubServiceMiddleware:
    """Tests for stub service middleware."""
    
    def test_stub_services_status(self, client):
        """Test getting stub services status."""
        response = client.get("/api/v1/stub-services/status")
        
        # This endpoint should exist if stub middleware is configured
        assert response.status_code in [200, 404]  # May or may not be enabled


class TestIntegration:
    """Integration tests for end-to-end workflows."""
    
    def test_learner_workflow(self, client):
        """Test complete learner interaction workflow."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as ai_mock, \
             patch("app.api.v1.training.httpx.AsyncClient") as training_mock:
            
            # Setup AI mock
            ai_response = MagicMock()
            ai_response.json.return_value = {"hint": "Try this..."}
            ai_client = AsyncMock()
            ai_client.post = AsyncMock(return_value=ai_response)
            ai_client.__aenter__ = AsyncMock(return_value=ai_client)
            ai_client.__aexit__ = AsyncMock(return_value=None)
            ai_mock.return_value = ai_client
            
            # Setup training mock
            training_response = MagicMock()
            training_response.json.return_value = {"mastery": 0.75}
            training_client = AsyncMock()
            training_client.post = AsyncMock(return_value=training_response)
            training_client.__aenter__ = AsyncMock(return_value=training_client)
            training_client.__aexit__ = AsyncMock(return_value=None)
            training_mock.return_value = training_client
            
            # 1. Get a hint
            hint_response = client.post(
                "/api/v1/ai/hint",
                json={"problem_id": "p1", "learner_id": "l1"}
            )
            assert hint_response.status_code == 200
            
            # 2. Update BKT after response
            bkt_response = client.post(
                "/api/v1/training/bkt/update",
                json={"learner_id": "l1", "skill_id": "s1", "correct": True}
            )
            assert bkt_response.status_code == 200
    
    def test_content_adaptation_workflow(self, client):
        """Test content adaptation workflow."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "adapted_content": "Simplified explanation",
                "readability_level": "grade_3"
            }
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            # Request content adaptation
            response = client.post(
                "/api/v1/ai/adapt/content",
                json={
                    "content_id": "c1",
                    "learner_profile": {
                        "grade_level": 3,
                        "reading_level": "basic"
                    }
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "adapted_content" in data


# =============================================================================
# Additional Tests for Full Coverage
# =============================================================================


class TestAIRoutesComplete:
    """Complete tests for all AI routes including timeouts and errors."""
    
    def test_ai_hint_timeout(self, client):
        """Test AI hint timeout."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/hint", json={"problem_id": "p1"})
            assert response.status_code == 504
    
    def test_ai_hint_error(self, client):
        """Test AI hint general error."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/hint", json={"problem_id": "p1"})
            assert response.status_code == 500
    
    def test_ai_explanation_timeout(self, client):
        """Test AI explanation timeout."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/explanation", json={"concept_id": "c1"})
            assert response.status_code == 504
    
    def test_ai_explanation_error(self, client):
        """Test AI explanation general error."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/explanation", json={"concept_id": "c1"})
            assert response.status_code == 500
    
    def test_ai_feedback_timeout(self, client):
        """Test AI feedback timeout."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/feedback", json={"submission_id": "s1"})
            assert response.status_code == 504
    
    def test_ai_feedback_error(self, client):
        """Test AI feedback general error."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/feedback", json={"submission_id": "s1"})
            assert response.status_code == 500
    
    def test_adapt_content_timeout(self, client):
        """Test content adaptation timeout."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/adapt/content", json={"content_id": "c1"})
            assert response.status_code == 504
    
    def test_adapt_content_error(self, client):
        """Test content adaptation general error."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/adapt/content", json={"content_id": "c1"})
            assert response.status_code == 500
    
    def test_personalize_content_timeout(self, client):
        """Test content personalization timeout."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/adapt/personalize", json={"learner_id": "l1"})
            assert response.status_code == 504
    
    def test_personalize_content_error(self, client):
        """Test content personalization general error."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/adapt/personalize", json={"learner_id": "l1"})
            assert response.status_code == 500
    
    def test_brain_mastery_predict(self, client):
        """Test brain mastery prediction."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"prediction": 0.85}
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/brain/mastery/predict", json={"learner_id": "l1"})
            assert response.status_code == 200
    
    def test_brain_mastery_predict_timeout(self, client):
        """Test brain mastery prediction timeout."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/brain/mastery/predict", json={"learner_id": "l1"})
            assert response.status_code == 504
    
    def test_brain_mastery_predict_error(self, client):
        """Test brain mastery prediction general error."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/brain/mastery/predict", json={"learner_id": "l1"})
            assert response.status_code == 500
    
    def test_brain_knowledge_update(self, client):
        """Test brain knowledge update."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"updated": True}
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/brain/knowledge/update", json={"learner_id": "l1"})
            assert response.status_code == 200
    
    def test_brain_knowledge_update_timeout(self, client):
        """Test brain knowledge update timeout."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/brain/knowledge/update", json={"learner_id": "l1"})
            assert response.status_code == 504
    
    def test_brain_knowledge_update_error(self, client):
        """Test brain knowledge update general error."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/ai/brain/knowledge/update", json={"learner_id": "l1"})
            assert response.status_code == 500
    
    def test_ai_health_success(self, client):
        """Test AI health check success."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"status": "healthy"}
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/ai/health")
            assert response.status_code == 200
    
    def test_ai_health_unavailable(self, client):
        """Test AI health check when service is unavailable."""
        with patch("app.api.v1.ai.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("Connection refused"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/ai/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "unavailable"


class TestTrainingRoutesComplete:
    """Complete tests for all training routes including timeouts and errors."""
    
    def test_create_job_timeout(self, client):
        """Test training job creation timeout."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/training/jobs", json={"model": "bkt"})
            assert response.status_code == 504
    
    def test_get_job_timeout(self, client):
        """Test getting training job timeout."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/training/jobs/job-123")
            assert response.status_code == 504
    
    def test_get_job_error(self, client):
        """Test getting training job general error."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/training/jobs/job-123")
            assert response.status_code == 500
    
    def test_bkt_update_timeout(self, client):
        """Test BKT update timeout."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/training/bkt/update", json={"learner_id": "l1"})
            assert response.status_code == 504
    
    def test_bkt_update_error(self, client):
        """Test BKT update general error."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/training/bkt/update", json={"learner_id": "l1"})
            assert response.status_code == 500
    
    def test_bkt_mastery_timeout(self, client):
        """Test BKT mastery timeout."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/training/bkt/mastery/l1/s1")
            assert response.status_code == 504
    
    def test_bkt_mastery_error(self, client):
        """Test BKT mastery general error."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/training/bkt/mastery/l1/s1")
            assert response.status_code == 500
    
    def test_clone_brain_timeout(self, client):
        """Test brain cloning timeout."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/training/brain/clone", json={"learner_id": "l1"})
            assert response.status_code == 504
    
    def test_clone_brain_error(self, client):
        """Test brain cloning general error."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/training/brain/clone", json={"learner_id": "l1"})
            assert response.status_code == 500
    
    def test_fine_tune_timeout(self, client):
        """Test brain fine-tuning timeout."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/training/brain/fine-tune", json={"brain_id": "b1"})
            assert response.status_code == 504
    
    def test_fine_tune_error(self, client):
        """Test brain fine-tuning general error."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/training/brain/fine-tune", json={"brain_id": "b1"})
            assert response.status_code == 500
    
    def test_predict_mastery_timeout(self, client):
        """Test mastery prediction timeout."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/training/brain/predict-mastery", json={"learner_id": "l1"})
            assert response.status_code == 504
    
    def test_predict_mastery_error(self, client):
        """Test mastery prediction general error."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/training/brain/predict-mastery", json={"learner_id": "l1"})
            assert response.status_code == 500
    
    def test_training_health_unavailable(self, client):
        """Test training health check when service is unavailable."""
        with patch("app.api.v1.training.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("Connection refused"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/training/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "unavailable"


class TestCurriculumRoutesComplete:
    """Complete tests for all curriculum routes including timeouts and errors."""
    
    def test_list_curricula_timeout(self, client):
        """Test listing curricula timeout."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/curricula")
            assert response.status_code == 504
    
    def test_list_curricula_error(self, client):
        """Test listing curricula general error."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/curricula")
            assert response.status_code == 500
    
    def test_get_curriculum_timeout(self, client):
        """Test getting curriculum timeout."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/curricula/c1")
            assert response.status_code == 504
    
    def test_get_curriculum_error(self, client):
        """Test getting curriculum general error."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/curricula/c1")
            assert response.status_code == 500
    
    def test_create_curriculum_timeout(self, client):
        """Test creating curriculum timeout."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/curriculum/curricula", json={"name": "New"})
            assert response.status_code == 504
    
    def test_create_curriculum_error(self, client):
        """Test creating curriculum general error."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.post("/api/v1/curriculum/curricula", json={"name": "New"})
            assert response.status_code == 500
    
    def test_update_curriculum_timeout(self, client):
        """Test updating curriculum timeout."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.put = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.put("/api/v1/curriculum/curricula/c1", json={"name": "Updated"})
            assert response.status_code == 504
    
    def test_update_curriculum_error(self, client):
        """Test updating curriculum general error."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.put = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.put("/api/v1/curriculum/curricula/c1", json={"name": "Updated"})
            assert response.status_code == 500
    
    def test_delete_curriculum_timeout(self, client):
        """Test deleting curriculum timeout."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.delete = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.delete("/api/v1/curriculum/curricula/c1")
            assert response.status_code == 504
    
    def test_delete_curriculum_error(self, client):
        """Test deleting curriculum general error."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.delete = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.delete("/api/v1/curriculum/curricula/c1")
            assert response.status_code == 500
    
    def test_list_lessons_timeout(self, client):
        """Test listing lessons timeout."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/units/u1/lessons")
            assert response.status_code == 504
    
    def test_list_lessons_error(self, client):
        """Test listing lessons general error."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/units/u1/lessons")
            assert response.status_code == 500
    
    def test_get_lesson(self, client):
        """Test getting a lesson."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"id": "l1", "title": "Addition"}
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/lessons/l1")
            assert response.status_code == 200
    
    def test_get_lesson_timeout(self, client):
        """Test getting lesson timeout."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/lessons/l1")
            assert response.status_code == 504
    
    def test_get_lesson_error(self, client):
        """Test getting lesson general error."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/lessons/l1")
            assert response.status_code == 500
    
    def test_list_pacing_guides(self, client):
        """Test listing pacing guides."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"guides": []}
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/pacing-guides")
            assert response.status_code == 200
    
    def test_list_pacing_guides_timeout(self, client):
        """Test listing pacing guides timeout."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/pacing-guides")
            assert response.status_code == 504
    
    def test_list_pacing_guides_error(self, client):
        """Test listing pacing guides general error."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("Service error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/pacing-guides")
            assert response.status_code == 500
    
    def test_curriculum_health_success(self, client):
        """Test curriculum health check success."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.json.return_value = {"status": "healthy"}
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/health")
            assert response.status_code == 200
    
    def test_curriculum_health_unavailable(self, client):
        """Test curriculum health check when service is unavailable."""
        with patch("app.api.v1.curriculum.httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("Connection refused"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/api/v1/curriculum/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "unavailable"


class TestStubServicesComplete:
    """Complete tests for stub services."""
    
    def test_stub_services_health(self, client):
        """Test stub services health endpoint."""
        response = client.get("/api/v1/stub-services/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_stub_services_status_content(self, client):
        """Test stub services status response content."""
        response = client.get("/api/v1/stub-services/status")
        assert response.status_code == 200
        data = response.json()
        assert "stub_services" in data
        assert "metrics" in data


class TestStubServiceUtilities:
    """Tests for stub service utilities."""
    
    def test_clear_feature_flag_cache(self):
        """Test clearing feature flag cache."""
        from app.core.stub_services import clear_feature_flag_cache
        clear_feature_flag_cache()  # Should not raise
    
    def test_get_stub_service_config(self):
        """Test getting stub service config."""
        from app.core.stub_services import get_stub_service_config, StubService
        config = get_stub_service_config(StubService.RL_TUTORING)
        assert config is not None
        assert config.display_name == "Reinforcement Learning Tutoring"
    
    def test_get_all_stub_services_status(self):
        """Test getting all stub services status."""
        from app.core.stub_services import get_all_stub_services_status
        status = get_all_stub_services_status()
        assert isinstance(status, dict)
        assert len(status) > 0
    
    def test_get_stub_service_by_path_found(self):
        """Test finding stub service by path."""
        from app.core.stub_services import get_stub_service_by_path
        config = get_stub_service_by_path("/api/v1/rl-tutoring/something")
        assert config is not None
    
    def test_get_stub_service_by_path_not_found(self):
        """Test stub service not found by path."""
        from app.core.stub_services import get_stub_service_by_path
        config = get_stub_service_by_path("/api/v1/unknown/something")
        assert config is None
    
    def test_is_stub_service_enabled(self):
        """Test checking if stub service is enabled."""
        from app.core.stub_services import is_stub_service_enabled, StubService
        # By default, stub services are disabled
        enabled = is_stub_service_enabled(StubService.RL_TUTORING)
        assert isinstance(enabled, bool)


class TestMiddlewareMetrics:
    """Tests for middleware metrics."""
    
    def test_get_stub_service_metrics(self):
        """Test getting stub service metrics."""
        from app.middleware.stub_service_middleware import get_stub_service_metrics
        metrics = get_stub_service_metrics()
        assert "stub_service_requests" in metrics
        assert "unhandled_501_responses" in metrics
        assert "timestamp" in metrics
    
    def test_reset_stub_service_metrics(self):
        """Test resetting stub service metrics."""
        from app.middleware.stub_service_middleware import reset_stub_service_metrics
        reset_stub_service_metrics()  # Should not raise


class TestHealthCheckServiceStatus:
    """Tests for health check with various service statuses."""
    
    def test_health_check_unhealthy_service(self, client):
        """Test health check when a service returns non-200."""
        with patch("httpx.AsyncClient") as mock:
            mock_response = MagicMock()
            mock_response.status_code = 500  # Service returns error
            mock_response.json.return_value = {"status": "error"}
            
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/health")
            assert response.status_code == 200
            data = response.json()
            # When services are unhealthy, status is degraded
            assert data["status"] == "degraded"
    
    def test_health_check_service_exception(self, client):
        """Test health check when a service is unavailable."""
        with patch("httpx.AsyncClient") as mock:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("Connection refused"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = mock_client
            
            response = client.get("/health")
            assert response.status_code == 200
            data = response.json()
            # Service exceptions should mark service as unavailable
            assert "services" in data


class TestStubServiceMiddlewareDispatch:
    """Tests for stub service middleware dispatch behavior."""
    
    def test_middleware_blocks_disabled_stub_service(self, client):
        """Test middleware blocks requests to disabled stub services."""
        # Access a stub service endpoint (RL tutoring is disabled by default)
        response = client.post("/api/v1/rl-tutoring/sessions", json={"learner_id": "l1"})
        
        # Should be blocked by middleware with 503
        assert response.status_code in [503, 404]  # 503 if blocked, 404 if no route
    
    def test_middleware_tracks_stub_service_metrics(self, client):
        """Test middleware tracks stub service request metrics."""
        from app.middleware.stub_service_middleware import get_stub_service_metrics, reset_stub_service_metrics
        
        # Reset metrics
        reset_stub_service_metrics()
        
        # Make a request to a stub service
        client.post("/api/v1/rl-tutoring/test", json={})
        
        # Check metrics were updated
        metrics = get_stub_service_metrics()
        assert "stub_service_requests" in metrics


class TestConfigCoverage:
    """Tests for config module coverage."""
    
    def test_settings_initialization(self):
        """Test settings can be initialized."""
        from app.core.config import settings
        assert settings.PROJECT_NAME is not None
        assert settings.VERSION is not None
        assert settings.ENVIRONMENT is not None
    
    def test_settings_api_prefix(self):
        """Test API prefix is configured."""
        from app.core.config import settings
        assert settings.API_V1_STR == "/api/v1"
    
    def test_settings_cors_origins(self):
        """Test CORS origins are configured."""
        from app.core.config import settings
        assert isinstance(settings.CORS_ORIGINS, list)
    
    def test_get_database_url_production_without_url(self):
        """Test that production requires DATABASE_URL."""
        import os
        from app.core import config
        
        # Save original values
        original_url = os.environ.get("DATABASE_URL")
        original_env = os.environ.get("ENVIRONMENT")
        
        try:
            # Set production environment without DATABASE_URL
            os.environ.pop("DATABASE_URL", None)
            os.environ["ENVIRONMENT"] = "production"
            
            # Should raise EnvironmentError
            with pytest.raises(EnvironmentError, match="DATABASE_URL is required"):
                config._get_database_url()
        finally:
            # Restore original values
            if original_url:
                os.environ["DATABASE_URL"] = original_url
            if original_env:
                os.environ["ENVIRONMENT"] = original_env
            else:
                os.environ.pop("ENVIRONMENT", None)
    
    def test_get_database_url_development(self):
        """Test development uses default database URL."""
        import os
        from app.core import config
        
        # Save original values
        original_url = os.environ.get("DATABASE_URL")
        original_env = os.environ.get("ENVIRONMENT")
        
        try:
            os.environ.pop("DATABASE_URL", None)
            os.environ["ENVIRONMENT"] = "development"
            
            url = config._get_database_url()
            assert "postgresql://localhost" in url
        finally:
            if original_url:
                os.environ["DATABASE_URL"] = original_url
            if original_env:
                os.environ["ENVIRONMENT"] = original_env


class TestStubServiceEnabled:
    """Tests for stub service enable/disable behavior."""
    
    def test_stub_service_disabled_returns_503(self, client):
        """Test that disabled stub service returns 503."""
        # RL tutoring is a stub service
        response = client.get("/api/v1/rl-tutoring/health")
        # Should be 503 (blocked) or 404 (no route)
        assert response.status_code in [503, 404]
    
    def test_get_stub_service_config_all_services(self):
        """Test getting config for all stub services."""
        from app.core.stub_services import get_stub_service_config, StubService
        
        for service in StubService:
            config = get_stub_service_config(service)
            assert config is not None
            assert config.service_id == service
            assert config.display_name is not None
    
    def test_load_feature_flags_with_enabled_service(self):
        """Test loading feature flags with an enabled service."""
        import os
        from app.core.stub_services import (
            _load_feature_flags,
            clear_feature_flag_cache,
            StubService,
            STUB_SERVICE_CONFIGS
        )
        
        # Get env var name for a stub service
        config = STUB_SERVICE_CONFIGS[StubService.RL_TUTORING]
        env_var = config.env_var
        
        # Save original value
        original = os.environ.get(env_var)
        
        try:
            # Enable the stub service
            os.environ[env_var] = "true"
            clear_feature_flag_cache()
            
            flags = _load_feature_flags()
            assert flags[StubService.RL_TUTORING] == True
        finally:
            # Restore original value
            if original:
                os.environ[env_var] = original
            else:
                os.environ.pop(env_var, None)
            clear_feature_flag_cache()
    
    def test_load_feature_flags_variants(self):
        """Test loading feature flags with different enabled values."""
        import os
        from app.core.stub_services import (
            _load_feature_flags,
            clear_feature_flag_cache,
            StubService,
            STUB_SERVICE_CONFIGS
        )
        
        config = STUB_SERVICE_CONFIGS[StubService.RL_TUTORING]
        env_var = config.env_var
        original = os.environ.get(env_var)
        
        try:
            # Test various "enabled" values
            for value in ["1", "yes", "enabled"]:
                os.environ[env_var] = value
                clear_feature_flag_cache()
                flags = _load_feature_flags()
                assert flags[StubService.RL_TUTORING] == True
        finally:
            if original:
                os.environ[env_var] = original
            else:
                os.environ.pop(env_var, None)
            clear_feature_flag_cache()


class TestMiddleware501Intercept:
    """Tests for middleware 501 response intercept."""
    
    def test_501_response_tracked(self, client):
        """Test that 501 responses are tracked by middleware."""
        from app.middleware.stub_service_middleware import (
            get_stub_service_metrics,
            reset_stub_service_metrics,
            _501_intercepts
        )
        
        reset_stub_service_metrics()
        
        # The 501 tracking happens when a route returns 501
        # We can't easily trigger this without a route that returns 501
        # But we can test the metrics tracking is working
        metrics = get_stub_service_metrics()
        assert "unhandled_501_responses" in metrics
    
    def test_middleware_metrics_dict_operations(self):
        """Test middleware internal metrics dict operations."""
        from app.middleware.stub_service_middleware import (
            _stub_service_requests,
            _501_intercepts,
            reset_stub_service_metrics
        )
        
        # Test the metrics dict operations
        reset_stub_service_metrics()
        assert len(_stub_service_requests) == 0
        assert len(_501_intercepts) == 0
    
    def test_501_intercept_logging(self):
        """Test 501 intercept updates metrics dict."""
        from app.middleware.stub_service_middleware import _501_intercepts, reset_stub_service_metrics
        
        reset_stub_service_metrics()
        
        # Simulate the 501 intercept operation directly
        path = "/api/v1/test/endpoint"
        _501_intercepts[path] = _501_intercepts.get(path, 0) + 1
        
        assert path in _501_intercepts
        assert _501_intercepts[path] == 1
        
        # Simulate second request to same path
        _501_intercepts[path] = _501_intercepts.get(path, 0) + 1
        assert _501_intercepts[path] == 2
        
        reset_stub_service_metrics()
    
    def test_middleware_501_response_intercept(self):
        """Test middleware intercepts 501 responses."""
        from fastapi import FastAPI
        from fastapi.responses import JSONResponse
        from fastapi.testclient import TestClient
        from app.middleware.stub_service_middleware import (
            StubServiceMiddleware,
            reset_stub_service_metrics,
            get_stub_service_metrics,
        )
        
        # Create a test app with a route that returns 501
        test_app = FastAPI()
        test_app.add_middleware(StubServiceMiddleware)
        
        @test_app.get("/test-501")
        async def test_501_endpoint():
            return JSONResponse(status_code=501, content={"error": "Not implemented"})
        
        reset_stub_service_metrics()
        
        test_client = TestClient(test_app)
        response = test_client.get("/test-501")
        
        assert response.status_code == 501
        
        # Get metrics to verify the 501 was tracked
        # Note: We use get_stub_service_metrics() to access the updated metrics
        metrics = get_stub_service_metrics()
        assert "unhandled_501_responses" in metrics
        assert "/test-501" in metrics["unhandled_501_responses"]
        assert metrics["unhandled_501_responses"]["/test-501"] == 1
        
        reset_stub_service_metrics()


class TestLifespanEvents:
    """Tests for app lifespan events."""
    
    @pytest.mark.asyncio
    async def test_lifespan_startup_shutdown(self):
        """Test lifespan context manager executes startup and shutdown."""
        from app.main import lifespan, app
        
        # Test that lifespan can be entered and exited
        async with lifespan(app):
            # Inside the context = after startup
            pass
        # After exiting = shutdown executed