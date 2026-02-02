"""
Integration tests for RL Tutoring Service API endpoints.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    with TestClient(app) as test_client:
        yield test_client


class TestHealthEndpoints:
    """Test health check endpoints."""

    def test_health(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_health_ready(self, client):
        """Test readiness endpoint."""
        response = client.get("/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data


class TestSessionEndpoints:
    """Test session management endpoints."""

    def test_start_session(self, client):
        """Test starting a learning session."""
        response = client.post(
            "/api/v1/students/student_test_1/session/start",
            json={"age_group": "teen", "target_topic": "mathematics"},
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "session" in data
        assert data["session"]["student_id"] == "student_test_1"

    def test_start_session_default_age(self, client):
        """Test starting session with default age group."""
        response = client.post(
            "/api/v1/students/student_test_2/session/start",
            json={},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    def test_end_session(self, client):
        """Test ending a learning session."""
        # First start a session
        client.post(
            "/api/v1/students/student_test_3/session/start",
            json={"age_group": "adult"},
        )
        
        # Then end it
        response = client.post(
            "/api/v1/students/student_test_3/session/end"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "session_summary" in data

    def test_end_session_no_active(self, client):
        """Test ending session when none is active."""
        response = client.post(
            "/api/v1/students/no_session_student_1234/session/end"
        )
        
        # Should return 404 for no active session
        assert response.status_code == 404


class TestContentRecommendation:
    """Test content recommendation endpoints."""

    def test_get_next_content(self, client):
        """Test getting next content recommendation."""
        # Start a session first
        client.post(
            "/api/v1/students/content_test_1/session/start",
            json={"age_group": "teen"},
        )
        
        response = client.get(
            "/api/v1/students/content_test_1/next-content",
            params={"topic": "math"},
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "recommendation" in data
        assert "content_id" in data["recommendation"]

    def test_get_next_content_default_topic(self, client):
        """Test getting content without specifying topic."""
        # Start a session
        client.post(
            "/api/v1/students/content_test_2/session/start",
            json={"age_group": "adult"},
        )
        
        response = client.get("/api/v1/students/content_test_2/next-content")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    def test_get_next_content_auto_creates_session(self, client):
        """Test that recommendation auto-creates session if needed."""
        response = client.get(
            "/api/v1/students/auto_session_content/next-content",
            params={"topic": "science"},
        )
        
        # Should auto-create session and return content
        assert response.status_code == 200


class TestFeedback:
    """Test feedback submission endpoints."""

    def test_submit_feedback(self, client):
        """Test submitting learning feedback."""
        # Start session
        client.post(
            "/api/v1/students/feedback_test_1/session/start",
            json={"age_group": "teen"},
        )
        
        # Get content
        content_response = client.get(
            "/api/v1/students/feedback_test_1/next-content",
            params={"topic": "math"},
        )
        content_id = content_response.json()["recommendation"]["content_id"]
        
        # Submit feedback
        response = client.post(
            "/api/v1/students/feedback_test_1/feedback",
            json={
                "content_id": content_id,
                "correct": True,
                "response_time": 120,
                "engagement": 0.8,
                "topic": "math",
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert data["feedback_recorded"] is True
        assert "reward" in data

    def test_submit_feedback_incorrect(self, client):
        """Test submitting incorrect answer feedback."""
        client.post(
            "/api/v1/students/feedback_test_2/session/start",
            json={"age_group": "child"},
        )
        
        # Get content first
        content_response = client.get(
            "/api/v1/students/feedback_test_2/next-content",
        )
        content_id = content_response.json()["recommendation"]["content_id"]
        
        response = client.post(
            "/api/v1/students/feedback_test_2/feedback",
            json={
                "content_id": content_id,
                "correct": False,
                "response_time": 60,
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["feedback_recorded"] is True

    def test_submit_feedback_no_session(self, client):
        """Test feedback without active session."""
        response = client.post(
            "/api/v1/students/no_session_fb_1234/feedback",
            json={
                "content_id": "test_content",
                "correct": True,
                "response_time": 100,
            },
        )
        
        # Should return error for no active session
        assert response.status_code in [400, 404]


class TestLearningPath:
    """Test learning path endpoints."""

    def test_get_learning_path(self, client):
        """Test getting learning path."""
        # Start session
        client.post(
            "/api/v1/students/path_test_1/session/start",
            json={"age_group": "teen"},
        )
        
        response = client.get(
            "/api/v1/students/path_test_1/learning-path",
            params={"topic": "math", "target_mastery": 0.8},
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "learning_path" in data

    def test_get_learning_path_custom_mastery(self, client):
        """Test learning path with custom mastery target."""
        client.post(
            "/api/v1/students/path_test_2/session/start",
            json={"age_group": "adult"},
        )
        
        response = client.get(
            "/api/v1/students/path_test_2/learning-path",
            params={"topic": "science", "target_mastery": 0.95},
        )
        
        assert response.status_code == 200


class TestStudentProfile:
    """Test student profile endpoints."""

    def test_get_profile(self, client):
        """Test getting student profile."""
        # Start session to create profile
        client.post(
            "/api/v1/students/profile_test_1/session/start",
            json={"age_group": "teen"},
        )
        
        response = client.get("/api/v1/students/profile_test_1/profile")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "profile" in data
        assert data["profile"]["student_id"] == "profile_test_1"

    def test_get_profile_new_student(self, client):
        """Test getting profile for non-existent student."""
        response = client.get("/api/v1/students/new_student_not_exists/profile")
        
        # Should return 404 for student not found
        assert response.status_code == 404


class TestAuditLog:
    """Test audit log endpoints."""

    def test_get_audit_log(self, client):
        """Test getting student audit log."""
        # Start session and do some actions
        client.post(
            "/api/v1/students/audit_test_1/session/start",
            json={"age_group": "child"},
        )
        
        # Get content (should be logged)
        client.get(
            "/api/v1/students/audit_test_1/next-content",
            params={"topic": "math"},
        )
        
        response = client.get("/api/v1/students/audit_test_1/audit-log")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "audit_log" in data

    def test_get_audit_log_with_limit(self, client):
        """Test getting audit log with limit."""
        client.post(
            "/api/v1/students/audit_test_2/session/start",
            json={"age_group": "teen"},
        )
        
        # Do multiple actions
        for _ in range(5):
            client.get("/api/v1/students/audit_test_2/next-content")
        
        response = client.get(
            "/api/v1/students/audit_test_2/audit-log",
            params={"limit": 3},
        )
        
        assert response.status_code == 200


class TestStatisticsEndpoints:
    """Test statistics endpoints."""

    def test_session_stats(self, client):
        """Test session statistics endpoint."""
        response = client.get("/api/v1/stats/sessions")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "session_stats" in data

    def test_safety_stats(self, client):
        """Test safety statistics endpoint."""
        response = client.get("/api/v1/stats/safety")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "safety_stats" in data

    def test_recommendation_stats(self, client):
        """Test recommendation statistics endpoint."""
        response = client.get("/api/v1/stats/recommendations")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "recommendation_stats" in data


class TestCoreRLEndpoints:
    """Test core RL endpoints."""

    def test_select_action(self, client):
        """Test action selection endpoint."""
        response = client.post(
            "/api/v1/action/select",
            json={
                "learner_id": "test_learner",
                "knowledge_state": {"math": 0.5, "reading": 0.6},
                "recent_performance": [0.6, 0.7, 0.8],
                "engagement_level": 0.7,
                "time_in_session": 300,
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "action" in data
        assert "confidence" in data

    def test_record_reward(self, client):
        """Test reward recording endpoint."""
        response = client.post(
            "/api/v1/reward/record",
            json={
                "learner_id": "test_learner",
                "state": {"knowledge_state": {"math": 0.5}},
                "action_taken": {"action_type": "explanation"},
                "outcome": {"correctness": 1.0, "time": 60, "engagement": 0.8},
                "done": False,
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert data["recorded"] is True

    def test_get_buffer_stats(self, client):
        """Test buffer statistics endpoint."""
        response = client.get("/api/v1/buffer/stats")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "buffer_stats" in data


class TestFullWorkflow:
    """Test complete learning workflows."""

    def test_complete_learning_session(self, client):
        """Test a complete learning session workflow."""
        student_id = "workflow_test_complete"
        
        # 1. Start session
        start_response = client.post(
            f"/api/v1/students/{student_id}/session/start",
            json={"age_group": "teen", "target_topic": "math"},
        )
        assert start_response.status_code == 200
        
        # 2. Get learning path
        path_response = client.get(
            f"/api/v1/students/{student_id}/learning-path",
            params={"topic": "math", "target_mastery": 0.7},
        )
        assert path_response.status_code == 200
        
        # 3. Get first content
        content_response = client.get(
            f"/api/v1/students/{student_id}/next-content",
            params={"topic": "math"},
        )
        assert content_response.status_code == 200
        content = content_response.json()["recommendation"]
        
        # 4. Submit feedback (correct answer)
        feedback_response = client.post(
            f"/api/v1/students/{student_id}/feedback",
            json={
                "content_id": content["content_id"],
                "correct": True,
                "response_time": 120,
                "engagement": 0.85,
                "topic": "math",
            },
        )
        assert feedback_response.status_code == 200
        
        # 5. Get next content
        next_content_response = client.get(
            f"/api/v1/students/{student_id}/next-content",
            params={"topic": "math"},
        )
        assert next_content_response.status_code == 200
        
        # 6. Submit another feedback (incorrect)
        client.post(
            f"/api/v1/students/{student_id}/feedback",
            json={
                "content_id": next_content_response.json()["recommendation"]["content_id"],
                "correct": False,
                "response_time": 90,
            },
        )
        
        # 7. Check profile
        profile_response = client.get(f"/api/v1/students/{student_id}/profile")
        assert profile_response.status_code == 200
        
        # 8. Check audit log
        audit_response = client.get(f"/api/v1/students/{student_id}/audit-log")
        assert audit_response.status_code == 200
        
        # 9. End session
        end_response = client.post(f"/api/v1/students/{student_id}/session/end")
        assert end_response.status_code == 200

    def test_multiple_students_concurrent(self, client):
        """Test handling multiple students."""
        students = ["multi_api_1", "multi_api_2", "multi_api_3"]
        
        # Start sessions for all
        for student_id in students:
            response = client.post(
                f"/api/v1/students/{student_id}/session/start",
                json={"age_group": "teen"},
            )
            assert response.status_code == 200
        
        # Get content for all
        for student_id in students:
            response = client.get(f"/api/v1/students/{student_id}/next-content")
            assert response.status_code == 200
        
        # Check stats reflect multiple students
        stats = client.get("/api/v1/stats/sessions").json()
        assert stats["status"] == "success"


class TestErrorHandling:
    """Test error handling."""

    def test_invalid_feedback_data(self, client):
        """Test invalid feedback data handling."""
        response = client.post(
            "/api/v1/students/error_test/feedback",
            json={
                # Missing required fields
                "engagement": 0.5,
            },
        )
        
        # Should return validation error
        assert response.status_code == 422
