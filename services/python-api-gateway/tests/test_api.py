"""
Comprehensive API tests for Python API Gateway.

Tests all endpoints including proxy routes with mocked httpx.
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


@pytest.fixture
def mock_httpx_client():
    """Create mock httpx client."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"success": True, "data": "mocked"}
    
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
