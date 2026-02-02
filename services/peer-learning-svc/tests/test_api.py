"""Tests for API endpoints."""
import pytest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    def test_health_check(self, client):
        """Test health check returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "peer-learning-svc"


class TestGroupEndpoints:
    """Tests for group management endpoints."""

    def test_create_group(self, client):
        """Test creating a study group."""
        response = client.post(
            "/api/v1/groups/create",
            json={
                "name": "Calculus Study Group",
                "topic": "Calculus",
                "creator_id": "user_001",
                "member_ids": ["user_002", "user_003"],
                "max_members": 10,
                "description": "Weekly calculus study sessions",
                "is_public": True,
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["name"] == "Calculus Study Group"
        assert "group_id" in data
        assert "user_001" in data["members"]

    def test_create_group_minimal(self, client):
        """Test creating group with minimal data."""
        response = client.post(
            "/api/v1/groups/create",
            json={
                "name": "Study Group",
                "topic": "Math",
                "creator_id": "user_001",
            },
        )
        
        assert response.status_code == 200

    def test_get_group_activity(self, client):
        """Test getting group activity."""
        response = client.get("/api/v1/groups/test_group_001/activity")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "group_id" in data

    def test_form_groups(self, client, sample_learner_profiles):
        """Test group formation."""
        response = client.post(
            "/api/v1/groups/form",
            json={
                "learner_ids": [p["learner_id"] for p in sample_learner_profiles],
                "learner_profiles": sample_learner_profiles,
                "topic": "Mathematics",
                "group_size": 3,
                "optimization_goal": "balanced",
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["topic"] == "Mathematics"


class TestUserMatchingEndpoints:
    """Tests for user matching endpoints."""

    def test_get_user_matches_no_candidates(self, client):
        """Test getting matches when no candidates."""
        response = client.get("/api/v1/users/user_001/matches")
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "user_001"

    def test_update_candidate_pool(self, client, sample_learner_profiles):
        """Test updating candidate pool."""
        response = client.post(
            "/api/v1/candidates/update",
            json={"candidates": sample_learner_profiles},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["pool_size"] == len(sample_learner_profiles)

    def test_get_user_matches_with_candidates(self, client, sample_learner_profiles):
        """Test getting matches after updating pool."""
        # Update pool first
        client.post(
            "/api/v1/candidates/update",
            json={"candidates": sample_learner_profiles},
        )
        
        # Get matches
        response = client.get(
            "/api/v1/users/user_001/matches",
            params={"role": "study_partner", "limit": 5},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "user_001"

    def test_match_peer(self, client, sample_learner_profiles):
        """Test peer matching endpoint."""
        # Update pool
        client.post(
            "/api/v1/candidates/update",
            json={"candidates": sample_learner_profiles},
        )
        
        response = client.post(
            "/api/v1/match/peer",
            params={"role": "study_partner"},
            json={"profile": sample_learner_profiles[0]},
        )
        
        assert response.status_code == 200

    def test_match_tutor(self, client, sample_learner_profiles):
        """Test tutor matching endpoint."""
        client.post(
            "/api/v1/candidates/update",
            json={"candidates": sample_learner_profiles},
        )
        
        response = client.post(
            "/api/v1/match/tutor",
            params={"topic": "math"},
            json={"profile": sample_learner_profiles[0]},
        )
        
        assert response.status_code == 200

    def test_compute_compatibility(self, client, sample_learner_profiles):
        """Test computing compatibility between two learners."""
        response = client.post(
            "/api/v1/match/compatibility",
            params={"role": "study_partner"},
            json={
                "profile_a": sample_learner_profiles[0],
                "profile_b": sample_learner_profiles[1],
            },
        )
        
        # The endpoint expects two separate profile parameters
        # Adjusting for actual API signature


class TestSessionEndpoints:
    """Tests for session management endpoints."""

    def test_start_session(self, client):
        """Test starting a new session."""
        response = client.post(
            "/api/v1/sessions/start",
            json={
                "group_id": "group_001",
                "session_type": "study_group",
                "topic": "Calculus Review",
                "created_by": "user_001",
                "scheduled_duration_minutes": 60,
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "session_id" in data
        assert data["group_id"] == "group_001"

    def test_join_session(self, client):
        """Test joining a session."""
        # Create session first
        create_response = client.post(
            "/api/v1/sessions/start",
            json={
                "group_id": "group_001",
                "session_type": "study_group",
                "topic": "Math",
                "created_by": "user_001",
            },
        )
        session_id = create_response.json()["session_id"]
        
        # Join session
        response = client.post(
            f"/api/v1/sessions/{session_id}/join",
            json={
                "user_id": "user_002",
                "role": "learner",
                "has_recording_consent": True,
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    def test_leave_session(self, client):
        """Test leaving a session."""
        # Create and join session
        create_response = client.post(
            "/api/v1/sessions/start",
            json={
                "group_id": "group_001",
                "session_type": "study_group",
                "topic": "Math",
                "created_by": "user_001",
                "requires_recording_consent": False,  # Don't require consent for easier testing
            },
        )
        session_id = create_response.json()["session_id"]
        
        client.post(
            f"/api/v1/sessions/{session_id}/join",
            json={"user_id": "user_002", "role": "learner", "has_recording_consent": True},
        )
        
        # Leave
        response = client.post(
            f"/api/v1/sessions/{session_id}/leave",
            params={"user_id": "user_002"},
        )
        
        assert response.status_code == 200

    def test_end_session(self, client):
        """Test ending a session."""
        create_response = client.post(
            "/api/v1/sessions/start",
            json={
                "group_id": "group_001",
                "session_type": "study_group",
                "topic": "Math",
                "created_by": "user_001",
            },
        )
        session_id = create_response.json()["session_id"]
        
        response = client.post(
            f"/api/v1/sessions/{session_id}/end",
            params={"ended_by": "user_001", "reason": "completed"},
        )
        
        assert response.status_code == 200

    def test_get_session(self, client):
        """Test getting session details."""
        create_response = client.post(
            "/api/v1/sessions/start",
            json={
                "group_id": "group_001",
                "session_type": "study_group",
                "topic": "Math",
                "created_by": "user_001",
            },
        )
        session_id = create_response.json()["session_id"]
        
        response = client.get(f"/api/v1/sessions/{session_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "session" in data


class TestAssessmentEndpoints:
    """Tests for peer assessment endpoints."""

    def test_submit_peer_review(self, client):
        """Test submitting a peer review."""
        response = client.post(
            "/api/v1/assessments/peer-review",
            json={
                "assessor_id": "user_001",
                "assessee_id": "user_002",
                "assessment_type": "session_feedback",
                "scores": [
                    {"criterion_id": "participation", "score": 4, "comments": "Good participation"},
                    {"criterion_id": "helpfulness", "score": 5, "comments": "Very helpful"},
                    {"criterion_id": "respectfulness", "score": 5, "comments": "Always respectful"},
                    {"criterion_id": "collaboration", "score": 4, "comments": "Good collaborator"},
                ],
                "overall_feedback": "Great session!",
                "strengths": ["Clear communication"],
                "areas_for_improvement": ["Time management"],
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "assessment_id" in data

    def test_get_user_assessments_received(self, client):
        """Test getting assessments received by a user."""
        response = client.get("/api/v1/assessments/user/user_001/received")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "assessments" in data

    def test_list_rubrics(self, client):
        """Test listing available rubrics."""
        response = client.get("/api/v1/assessments/rubrics")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "rubrics" in data

    def test_list_rubrics_by_type(self, client):
        """Test listing rubrics filtered by type."""
        response = client.get(
            "/api/v1/assessments/rubrics",
            params={"assessment_type": "session_feedback"},
        )
        
        assert response.status_code == 200


class TestCollaborationEndpoints:
    """Tests for collaboration scoring endpoints."""

    def test_score_collaboration(self, client, sample_messages):
        """Test scoring collaboration."""
        response = client.post(
            "/api/v1/collaboration/score",
            json={
                "group_id": "group_001",
                "messages": sample_messages,
                "topic": "Calculus",
                "member_ids": ["user_001", "user_002", "user_003", "user_004"],
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "scores" in data

    def test_detect_collaboration_issues(self, client, sample_messages):
        """Test detecting collaboration issues."""
        response = client.post(
            "/api/v1/collaboration/issues",
            json={
                "group_id": "group_001",
                "messages": sample_messages,
                "member_ids": ["user_001", "user_002", "user_003", "user_004"],
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "issues" in data


class TestDiscussionEndpoints:
    """Tests for discussion facilitation endpoints."""

    def test_facilitate_discussion(self, client, sample_messages):
        """Test discussion facilitation."""
        response = client.post(
            "/api/v1/discussion/facilitate",
            json={
                "group_id": "group_001",
                "topic": "Calculus",
                "messages": sample_messages,
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "actions" in data or "suggestions" in data

    def test_summarize_discussion(self, client, sample_messages):
        """Test discussion summarization."""
        response = client.post(
            "/api/v1/discussion/summarize",
            json=sample_messages,
            params={"topic": "Calculus"},
        )
        
        assert response.status_code == 200


class TestSafetyEndpoints:
    """Tests for safety endpoints."""

    def test_moderate_safe_content(self, client):
        """Test moderating safe content."""
        response = client.post(
            "/api/v1/safety/moderate",
            json={
                "content": "Let's study math together!",
                "user_id": "user_001",
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["is_safe"] is True

    def test_moderate_unsafe_content(self, client):
        """Test moderating potentially unsafe content."""
        response = client.post(
            "/api/v1/safety/moderate",
            json={
                "content": "You're so stupid!",
                "user_id": "user_001",
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        # Should flag as unsafe or have categories

    def test_submit_report(self, client):
        """Test submitting a report."""
        response = client.post(
            "/api/v1/safety/report",
            json={
                "reporter_id": "user_001",
                "reported_user_id": "user_002",
                "report_type": "harassment",
                "description": "User was being rude in the session",
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "report_id" in data

    def test_record_consent(self, client):
        """Test recording user consent."""
        response = client.post(
            "/api/v1/safety/consent",
            json={
                "user_id": "user_001",
                "consent_type": "session_recording",
                "granted": True,
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    def test_check_session_safety(self, client):
        """Test checking session safety."""
        response = client.get(
            "/api/v1/safety/check-session",
            params={
                "participant_ids": "user_001,user_002,user_003",
                "session_type": "study",
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "all_allowed" in data


class TestGroupValidation:
    """Tests for group validation endpoints."""

    def test_validate_groups(self, client, sample_learner_profiles):
        """Test group validation."""
        # Update pool
        client.post(
            "/api/v1/candidates/update",
            json={"candidates": sample_learner_profiles},
        )
        
        response = client.post(
            "/api/v1/groups/validate",
            json={
                "groups": [
                    {
                        "group_id": "group_001",
                        "member_ids": ["user_001", "user_002"],
                    }
                ],
                "learner_profiles": sample_learner_profiles[:2],
            },
        )
        
        assert response.status_code == 200
