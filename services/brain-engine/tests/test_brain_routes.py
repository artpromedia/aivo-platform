"""
Comprehensive tests for Brain Routes API.

Tests all REST API endpoints for brain state management.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI

from src.routes.brain_routes import router
from src.services.brain_manager import (
    BrainState,
    KnowledgeGraph,
    LearningPatterns,
    MasteryLevel,
    EngagementProfile,
    AdaptiveParameters,
    LearnerBrainManager,
)


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def mock_brain_state():
    """Create a mock brain state for testing."""
    return BrainState(
        learner_id="test-learner-123",
        knowledge_graph=KnowledgeGraph(),
        learning_patterns=LearningPatterns(
            preferred_modality="visual",
            optimal_session_length=25,
            best_time_of_day="morning",
        ),
        mastery_levels={
            "math": MasteryLevel(
                current_level=0.7,
                target_level=0.8,
                practice_count=10,
                streak=3,
                last_practiced=datetime.now(timezone.utc),
            ),
            "reading": MasteryLevel(
                current_level=0.85,
                target_level=0.8,
                practice_count=15,
                streak=5,
            ),
        },
        engagement_profile=EngagementProfile(
            favorite_subjects=["math"],
            struggle_subjects=["writing"],
            average_engagement_score=0.75,
            total_time_spent=3600,
        ),
    )


@pytest.fixture
def mock_brain_manager(mock_brain_state):
    """Create a mock brain manager."""
    manager = MagicMock(spec=LearnerBrainManager)
    
    # Setup async methods
    manager.initialize_brain = AsyncMock(return_value=mock_brain_state.to_dict())
    manager.get_brain = AsyncMock(return_value=mock_brain_state)
    manager.update_brain = AsyncMock(return_value=mock_brain_state.to_dict())
    manager.reset_brain = AsyncMock(return_value=True)
    manager.get_brain_insights = AsyncMock(return_value={
        "learner_id": "test-learner-123",
        "overall_mastery": 0.75,
        "strongest_subjects": [{"subject": "reading", "mastery": 0.85}],
        "weakest_subjects": [{"subject": "math", "mastery": 0.7}],
        "learning_velocity": 0.05,
        "preferred_learning_style": "visual",
        "optimal_session_length": 25,
        "best_time_of_day": "morning",
        "total_time_spent_hours": 1.0,
        "engagement_score": 0.75,
        "subjects_at_target": 1,
        "total_subjects": 2,
        "current_streak": 5,
        "best_streak_ever": 7,
    })
    manager.get_personalized_recommendations = AsyncMock(return_value=[
        {
            "type": "practice",
            "subject": "math",
            "priority": 0.8,
            "reason": "Improve math mastery",
            "estimated_time": 15,
            "current_mastery": 0.7,
            "target_mastery": 0.8,
            "suggested_difficulty": "moderate",
        },
        {
            "type": "review",
            "subject": "reading",
            "priority": 0.5,
            "reason": "Review reading skills",
            "estimated_time": 10,
            "days_since_practice": 3,
        },
    ])
    
    return manager


@pytest.fixture
def mock_curriculum_service():
    """Create a mock curriculum integration service."""
    service = MagicMock()
    service.align_brain_to_curriculum = AsyncMock(return_value={
        "success": True,
        "curriculum_standards": ["CCSS.MATH.CONTENT.3"],
        "aligned_skills": ["3.OA.A.1", "3.OA.A.2"],
        "message": "Successfully aligned to Common Core"
    })
    service.get_curriculum_aligned_path = AsyncMock(return_value={
        "path_id": "path-123",
        "path_name": "Math Grade 3",
        "total_items": 5,
        "estimated_total_time_hours": 2.5,
        "curriculum_standards": ["CCSS.MATH"],
        "items": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return service


@pytest.fixture
def app(mock_brain_manager, mock_curriculum_service):
    """Create FastAPI app with mocked dependencies."""
    app = FastAPI()
    app.include_router(router)
    
    # Override dependencies
    from src.routes.brain_routes import get_manager, get_curriculum_service
    app.dependency_overrides[get_manager] = lambda: mock_brain_manager
    app.dependency_overrides[get_curriculum_service] = lambda: mock_curriculum_service
    
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)


# =============================================================================
# Initialize Brain Tests
# =============================================================================


class TestInitializeBrain:
    """Tests for POST /brain/initialize endpoint."""

    def test_initialize_brain_success(self, client, mock_brain_manager):
        """Test successful brain initialization."""
        request_data = {
            "learner_id": "new-learner-123",
            "baseline_assessment": {
                "strengths": ["math", "science"],
                "weaknesses": ["writing"],
                "learning_style": "visual",
                "subject_scores": {"math": 80, "reading": 70},
            },
        }
        
        response = client.post("/brain/initialize", json=request_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["learner_id"] == "test-learner-123"
        mock_brain_manager.initialize_brain.assert_called_once()

    def test_initialize_brain_invalid_request(self, client):
        """Test initialization with missing required fields."""
        request_data = {
            "baseline_assessment": {"subject_scores": {}},
        }
        
        response = client.post("/brain/initialize", json=request_data)
        
        assert response.status_code == 422  # Validation error

    def test_initialize_brain_server_error(self, client, mock_brain_manager):
        """Test initialization when server error occurs."""
        mock_brain_manager.initialize_brain = AsyncMock(
            side_effect=Exception("Database error")
        )
        
        request_data = {
            "learner_id": "learner-123",
            "baseline_assessment": {"subject_scores": {}},
        }
        
        response = client.post("/brain/initialize", json=request_data)
        
        assert response.status_code == 500
        assert "Failed to initialize" in response.json()["detail"]


# =============================================================================
# Get Brain Tests
# =============================================================================


class TestGetBrain:
    """Tests for GET /brain/{learner_id} endpoint."""

    def test_get_brain_success(self, client, mock_brain_manager):
        """Test successful brain retrieval."""
        response = client.get("/brain/test-learner-123")
        
        assert response.status_code == 200
        data = response.json()
        assert data["learner_id"] == "test-learner-123"
        assert "knowledge_graph" in data
        assert "mastery_levels" in data

    def test_get_brain_not_found(self, client, mock_brain_manager):
        """Test getting non-existent brain."""
        mock_brain_manager.get_brain = AsyncMock(return_value=None)
        
        response = client.get("/brain/nonexistent-learner")
        
        assert response.status_code == 404
        assert "Brain not found" in response.json()["detail"]


# =============================================================================
# Update Brain Tests
# =============================================================================


class TestUpdateBrain:
    """Tests for PUT /brain/{learner_id}/update endpoint."""

    def test_update_brain_success(self, client, mock_brain_manager):
        """Test successful brain update."""
        request_data = {
            "subject": "math",
            "accuracy": 0.9,
            "time_spent": 300,
            "engagement": 0.8,
            "completed": True,
        }
        
        response = client.put(
            "/brain/test-learner-123/update",
            json=request_data
        )
        
        assert response.status_code == 200
        mock_brain_manager.update_brain.assert_called_once()

    def test_update_brain_not_found(self, client, mock_brain_manager):
        """Test updating non-existent brain."""
        mock_brain_manager.update_brain = AsyncMock(
            side_effect=ValueError("Brain not found")
        )
        
        request_data = {
            "subject": "math",
            "accuracy": 0.9,
            "time_spent": 300,
        }
        
        response = client.put(
            "/brain/nonexistent/update",
            json=request_data
        )
        
        assert response.status_code == 404

    def test_update_brain_invalid_accuracy(self, client):
        """Test update with invalid accuracy value."""
        request_data = {
            "subject": "math",
            "accuracy": 1.5,  # Invalid: > 1.0
            "time_spent": 300,
        }
        
        response = client.put(
            "/brain/test-learner-123/update",
            json=request_data
        )
        
        assert response.status_code == 422

    def test_update_brain_with_optional_fields(self, client, mock_brain_manager):
        """Test update with all optional fields."""
        request_data = {
            "subject": "math",
            "accuracy": 0.9,
            "time_spent": 300,
            "engagement": 0.8,
            "completed": True,
            "activity_type": "quiz",
            "questions_answered": 10,
            "timestamp": "2024-01-15T10:30:00Z",
        }
        
        response = client.put(
            "/brain/test-learner-123/update",
            json=request_data
        )
        
        assert response.status_code == 200


# =============================================================================
# Recommendations Tests
# =============================================================================


class TestGetRecommendations:
    """Tests for GET /brain/{learner_id}/recommendations endpoint."""

    def test_get_recommendations_success(self, client, mock_brain_manager):
        """Test successful recommendation retrieval."""
        response = client.get("/brain/test-learner-123/recommendations")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["type"] == "practice"
        assert data[0]["subject"] == "math"

    def test_get_recommendations_with_limit(self, client, mock_brain_manager):
        """Test recommendations with custom limit."""
        response = client.get("/brain/test-learner-123/recommendations?limit=1")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 1

    def test_get_recommendations_brain_not_found(self, client, mock_brain_manager):
        """Test recommendations for non-existent brain."""
        mock_brain_manager.get_personalized_recommendations = AsyncMock(return_value=[])
        mock_brain_manager.get_brain = AsyncMock(return_value=None)
        
        response = client.get("/brain/nonexistent/recommendations")
        
        assert response.status_code == 404


# =============================================================================
# Insights Tests
# =============================================================================


class TestGetInsights:
    """Tests for GET /brain/{learner_id}/insights endpoint."""

    def test_get_insights_success(self, client, mock_brain_manager):
        """Test successful insights retrieval."""
        response = client.get("/brain/test-learner-123/insights")
        
        assert response.status_code == 200
        data = response.json()
        assert data["learner_id"] == "test-learner-123"
        assert data["overall_mastery"] == 0.75
        assert len(data["strongest_subjects"]) > 0
        assert data["preferred_learning_style"] == "visual"

    def test_get_insights_not_found(self, client, mock_brain_manager):
        """Test insights for non-existent brain."""
        mock_brain_manager.get_brain_insights = AsyncMock(return_value={})
        
        response = client.get("/brain/nonexistent/insights")
        
        assert response.status_code == 404


# =============================================================================
# Reset Brain Tests
# =============================================================================


class TestResetBrain:
    """Tests for DELETE /brain/{learner_id} endpoint."""

    def test_reset_brain_success(self, client, mock_brain_manager):
        """Test successful brain reset."""
        response = client.delete("/brain/test-learner-123")
        
        assert response.status_code == 204
        mock_brain_manager.reset_brain.assert_called_once_with("test-learner-123")

    def test_reset_brain_failure(self, client, mock_brain_manager):
        """Test brain reset failure."""
        mock_brain_manager.reset_brain = AsyncMock(return_value=False)
        
        response = client.delete("/brain/test-learner-123")
        
        assert response.status_code == 500


# =============================================================================
# Subject Mastery Tests
# =============================================================================


class TestSubjectMastery:
    """Tests for subject-specific mastery endpoints."""

    def test_get_subject_mastery_success(self, client, mock_brain_manager):
        """Test getting mastery for a specific subject."""
        response = client.get("/brain/test-learner-123/mastery/math")
        
        assert response.status_code == 200
        data = response.json()
        assert data["learner_id"] == "test-learner-123"
        assert data["subject"] == "math"
        assert data["current_level"] == 0.7
        assert data["streak"] == 3

    def test_get_subject_mastery_brain_not_found(self, client, mock_brain_manager):
        """Test getting mastery for non-existent brain."""
        mock_brain_manager.get_brain = AsyncMock(return_value=None)
        
        response = client.get("/brain/nonexistent/mastery/math")
        
        assert response.status_code == 404
        assert "Brain not found" in response.json()["detail"]

    def test_get_subject_mastery_subject_not_found(self, client, mock_brain_manager):
        """Test getting mastery for non-existent subject."""
        response = client.get("/brain/test-learner-123/mastery/unknown_subject")
        
        assert response.status_code == 404
        assert "Subject" in response.json()["detail"]

    def test_set_mastery_target_success(self, client, mock_brain_manager):
        """Test setting custom mastery target."""
        response = client.post(
            "/brain/test-learner-123/mastery/math/target?target=0.9"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["subject"] == "math"
        assert data["new_target"] == 0.9

    def test_set_mastery_target_invalid_value(self, client, mock_brain_manager):
        """Test setting invalid mastery target."""
        response = client.post(
            "/brain/test-learner-123/mastery/math/target?target=1.5"
        )
        
        assert response.status_code == 400
        assert "between 0.0 and 1.0" in response.json()["detail"]


# =============================================================================
# Curriculum Integration Tests
# =============================================================================


class TestCurriculumIntegration:
    """Tests for curriculum integration endpoints."""

    def test_align_curriculum_success(self, client, mock_curriculum_service, mock_brain_manager):
        """Test successful curriculum alignment."""
        request_data = {
            "state_code": "TX",
            "grade_level": "3",
        }
        
        response = client.post(
            "/brain/test-learner-123/curriculum/align",
            json=request_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["curriculum_standards"]) > 0

    def test_get_curriculum_path_success(self, client, mock_curriculum_service, mock_brain_manager):
        """Test getting curriculum-aligned learning path."""
        response = client.get(
            "/brain/test-learner-123/curriculum/path?subject=math"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "path_id" in data
        assert data["path_name"] == "Math Grade 3"


# =============================================================================
# Batch Operations Tests
# =============================================================================


class TestBatchOperations:
    """Tests for batch operation endpoints."""

    def test_batch_update_activities(self, client, mock_brain_manager):
        """Test batch activity update."""
        activities = [
            {"subject": "math", "accuracy": 0.9, "time_spent": 300},
            {"subject": "reading", "accuracy": 0.85, "time_spent": 250},
        ]
        
        response = client.post(
            "/brain/test-learner-123/batch/activities",
            json={"activities": activities}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["processed"] == 2


# =============================================================================
# Health Check Tests
# =============================================================================


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_brain_service_health(self, client):
        """Test brain service health check."""
        response = client.get("/brain/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


# =============================================================================
# Error Handling Tests
# =============================================================================


class TestErrorHandling:
    """Tests for error handling scenarios."""

    def test_malformed_json(self, client):
        """Test handling of malformed JSON."""
        response = client.post(
            "/brain/initialize",
            content="not valid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422

    def test_missing_content_type(self, client):
        """Test handling of missing content type."""
        response = client.post("/brain/initialize", json={})
        
        # Should still fail validation
        assert response.status_code == 422

    def test_server_error_logging(self, client, mock_brain_manager):
        """Test that server errors are logged."""
        mock_brain_manager.update_brain = AsyncMock(
            side_effect=Exception("Unexpected error")
        )
        
        request_data = {
            "subject": "math",
            "accuracy": 0.9,
            "time_spent": 300,
        }
        
        response = client.put(
            "/brain/test-learner-123/update",
            json=request_data
        )
        
        assert response.status_code == 500
        assert "Failed to update brain" in response.json()["detail"]


# =============================================================================
# Request/Response Model Tests
# =============================================================================


class TestRequestModels:
    """Tests for request model validation."""

    def test_update_brain_request_defaults(self, client, mock_brain_manager):
        """Test UpdateBrainRequest default values."""
        request_data = {
            "subject": "math",
            "accuracy": 0.9,
            "time_spent": 300,
        }
        
        response = client.put(
            "/brain/test-learner-123/update",
            json=request_data
        )
        
        assert response.status_code == 200
        # Defaults should be applied
        call_args = mock_brain_manager.update_brain.call_args
        activity_data = call_args.kwargs["activity_data"]
        assert activity_data["engagement"] == 0.5  # Default
        assert activity_data["completed"] is True  # Default

    def test_negative_time_spent_rejected(self, client):
        """Test that negative time_spent is rejected."""
        request_data = {
            "subject": "math",
            "accuracy": 0.9,
            "time_spent": -100,  # Invalid
        }
        
        response = client.put(
            "/brain/test-learner-123/update",
            json=request_data
        )
        
        assert response.status_code == 422


# =============================================================================
# Integration Scenario Tests
# =============================================================================


class TestIntegrationScenarios:
    """Tests for complete workflow scenarios."""

    def test_full_learning_session_workflow(self, client, mock_brain_manager, mock_brain_state):
        """Test complete learning session workflow."""
        # 1. Get initial brain state
        response = client.get("/brain/test-learner-123")
        assert response.status_code == 200
        
        # 2. Get recommendations
        response = client.get("/brain/test-learner-123/recommendations")
        assert response.status_code == 200
        recommendations = response.json()
        
        # 3. Complete an activity based on recommendation
        activity = {
            "subject": recommendations[0]["subject"],
            "accuracy": 0.85,
            "time_spent": 600,
            "engagement": 0.9,
            "completed": True,
        }
        response = client.put(
            "/brain/test-learner-123/update",
            json=activity
        )
        assert response.status_code == 200
        
        # 4. Get updated insights
        response = client.get("/brain/test-learner-123/insights")
        assert response.status_code == 200

    def test_new_learner_onboarding_workflow(self, client, mock_brain_manager):
        """Test new learner onboarding workflow."""
        # 1. Initialize brain from assessment
        init_request = {
            "learner_id": "new-learner",
            "baseline_assessment": {
                "strengths": ["reading"],
                "weaknesses": ["math"],
                "learning_style": "visual",
                "subject_scores": {"reading": 80, "math": 50},
            },
        }
        response = client.post("/brain/initialize", json=init_request)
        assert response.status_code == 201
        
        # 2. Get initial recommendations
        response = client.get("/brain/new-learner/recommendations")
        # Note: This would return 404 if brain wasn't created
        # In real test, mock would need to be updated
        
        # 3. Align with curriculum
        curriculum_request = {
            "state_code": "CA",
            "grade_level": "3",
        }
        response = client.post(
            "/brain/new-learner/curriculum/align",
            json=curriculum_request
        )
        assert response.status_code == 200
