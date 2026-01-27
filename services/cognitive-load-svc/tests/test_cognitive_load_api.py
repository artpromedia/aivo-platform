"""Tests for Cognitive Load Service API endpoints."""

import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoints:
    """Test health check endpoints."""

    def test_health_check(self, client: TestClient):
        """Test basic health check."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "cognitive-load-svc"

    def test_readiness_check(self, client: TestClient):
        """Test readiness check."""
        response = client.get("/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "components_loaded" in data

    def test_liveness_check(self, client: TestClient):
        """Test liveness check."""
        response = client.get("/health/live")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "alive"

    def test_metrics(self, client: TestClient):
        """Test metrics endpoint."""
        response = client.get("/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "service" in data
        assert "components_initialized" in data


class TestLoadEstimation:
    """Test cognitive load estimation endpoints."""

    def test_estimate_load_basic(self, client: TestClient, sample_interaction_data):
        """Test basic load estimation."""
        response = client.post("/api/v1/load/estimate", json=sample_interaction_data)
        assert response.status_code == 200
        data = response.json()

        assert "intrinsic_load" in data
        assert "extraneous_load" in data
        assert "germane_load" in data
        assert "total_load" in data
        assert "load_level" in data
        assert "confidence" in data
        assert "recommendation" in data

        # Verify load values are in valid range
        assert 0.0 <= data["intrinsic_load"] <= 1.0
        assert 0.0 <= data["extraneous_load"] <= 1.0
        assert 0.0 <= data["germane_load"] <= 1.0
        assert 0.0 <= data["total_load"] <= 1.0

    def test_estimate_load_minimal_data(self, client: TestClient):
        """Test load estimation with minimal data."""
        response = client.post("/api/v1/load/estimate", json={
            "learner_id": "test-learner",
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_load" in data

    def test_load_history(self, client: TestClient, sample_interaction_data):
        """Test getting load history."""
        # First, create some history
        client.post("/api/v1/load/estimate", json=sample_interaction_data)

        # Then get history
        response = client.get(f"/api/v1/load/history/{sample_interaction_data['learner_id']}")
        assert response.status_code == 200
        data = response.json()
        assert "learner_id" in data
        assert "load_history" in data


class TestContentComplexity:
    """Test content complexity analysis endpoints."""

    def test_analyze_simple_content(self, client: TestClient, sample_content):
        """Test analysis of simple content."""
        response = client.post("/api/v1/content/complexity", json={
            "content": sample_content["simple"],
            "content_type": "text",
        })
        assert response.status_code == 200
        data = response.json()

        assert "element_interactivity" in data
        assert "vocabulary_load" in data
        assert "syntactic_complexity" in data
        assert "overall_complexity" in data
        assert "intrinsic_load_estimate" in data

        # Simple content should have low complexity
        assert data["overall_complexity"] < 0.5

    def test_analyze_complex_content(self, client: TestClient, sample_content):
        """Test analysis of complex content."""
        response = client.post("/api/v1/content/complexity", json={
            "content": sample_content["complex"],
            "content_type": "text",
            "domain": "science",
        })
        assert response.status_code == 200
        data = response.json()

        # Complex content should have higher complexity
        assert data["overall_complexity"] > 0.3

    def test_analyze_with_grade_level(self, client: TestClient, sample_content):
        """Test analysis with grade level."""
        response = client.post("/api/v1/content/complexity", json={
            "content": sample_content["moderate"],
            "content_type": "text",
            "grade_level": 8,
        })
        assert response.status_code == 200
        data = response.json()
        assert "grade_level_match" in data


class TestExtraneousLoad:
    """Test extraneous load detection endpoints."""

    def test_detect_extraneous_load(self, client: TestClient):
        """Test extraneous load detection."""
        response = client.post("/api/v1/extraneous/detect", json={
            "learner_id": "test-learner",
            "navigation_depth": 3,
            "visible_elements": [
                {"element_type": "button", "is_distracting": False, "relevance_score": 0.9},
                {"element_type": "advertisement", "is_distracting": True, "relevance_score": 0.1},
            ],
            "distractors_present": ["advertisement"],
            "split_attention_sources": ["text", "diagram"],
        })
        assert response.status_code == 200
        data = response.json()

        assert "extraneous_load" in data
        assert "visual_clutter_score" in data
        assert "split_attention_score" in data
        assert "recommendations" in data


class TestWorkingMemory:
    """Test working memory model endpoints."""

    def test_estimate_working_memory(self, client: TestClient, sample_working_memory_data):
        """Test working memory estimation."""
        response = client.post("/api/v1/memory/estimate", json=sample_working_memory_data)
        assert response.status_code == 200
        data = response.json()

        assert "estimated_load" in data
        assert "capacity_used" in data
        assert "estimated_capacity" in data
        assert "overload_risk" in data

        # Capacity should be in valid range (3-9)
        assert 3 <= data["estimated_capacity"] <= 9

    def test_memory_snapshot(self, client: TestClient, sample_working_memory_data):
        """Test memory snapshot retrieval."""
        # First, create some memory state
        client.post("/api/v1/memory/estimate", json=sample_working_memory_data)

        # Then get snapshot
        response = client.get(f"/api/v1/memory/snapshot/{sample_working_memory_data['learner_id']}")
        assert response.status_code == 200
        data = response.json()
        assert "learner_id" in data


class TestOverloadPrediction:
    """Test overload prediction endpoints."""

    def test_predict_overload(self, client: TestClient, sample_overload_data):
        """Test overload prediction."""
        response = client.post("/api/v1/overload/predict", json=sample_overload_data)
        assert response.status_code == 200
        data = response.json()

        assert "overload_probability" in data
        assert "warning_level" in data
        assert "risk_factors" in data
        assert "preventive_actions" in data

        assert 0.0 <= data["overload_probability"] <= 1.0
        assert data["warning_level"] in ["none", "low", "medium", "high", "critical"]

    def test_analyze_trend(self, client: TestClient):
        """Test load trend analysis."""
        response = client.post("/api/v1/overload/trend", json={
            "learner_id": "test-learner",
            "window_size_seconds": 300,
        })
        assert response.status_code == 200
        data = response.json()

        assert "trend_direction" in data
        assert "stability_score" in data

    def test_early_warnings(self, client: TestClient):
        """Test early warning signals."""
        response = client.get("/api/v1/overload/warnings/test-learner?current_load=0.8")
        assert response.status_code == 200
        data = response.json()
        assert "warning_signals" in data


class TestScaffolding:
    """Test scaffolding generation endpoints."""

    def test_generate_scaffolding(self, client: TestClient):
        """Test scaffolding generation."""
        response = client.post("/api/v1/scaffolding/generate", json={
            "learner_id": "test-learner",
            "current_content": "Solve: 2x + 5 = 13",
            "current_load": 0.75,
            "domain": "math",
            "max_scaffolds": 3,
        })
        assert response.status_code == 200
        data = response.json()

        assert "scaffolds" in data
        assert "scaffolding_level" in data
        assert "total_expected_load_reduction" in data

    def test_generate_hint(self, client: TestClient):
        """Test hint generation."""
        response = client.post("/api/v1/scaffolding/hint", params={
            "content": "What is 2 + 2?",
            "domain": "math",
            "hint_level": 1,
        })
        assert response.status_code == 200
        data = response.json()
        assert "hint" in data


class TestPacing:
    """Test pacing recommendation endpoints."""

    def test_recommend_pacing(self, client: TestClient):
        """Test pacing recommendations."""
        response = client.post("/api/v1/pacing/recommend", json={
            "learner_id": "test-learner",
            "current_load": 0.7,
            "upcoming_content": [
                {"content_id": "c1", "title": "Easy", "complexity": 0.3, "estimated_duration_seconds": 120},
                {"content_id": "c2", "title": "Hard", "complexity": 0.8, "estimated_duration_seconds": 300},
            ],
            "fatigue_level": 0.4,
        })
        assert response.status_code == 200
        data = response.json()

        assert "recommended_pace" in data
        assert "break_suggested" in data
        assert "content_order" in data
        assert data["recommended_pace"] in ["slow", "normal", "fast"]


class TestAdaptation:
    """Test adaptation recommendation endpoints."""

    def test_recommend_adaptations(self, client: TestClient):
        """Test adaptation recommendations."""
        response = client.post("/api/v1/adaptation/recommend", json={
            "learner_id": "test-learner",
            "current_load": {
                "intrinsic_load": 0.7,
                "extraneous_load": 0.5,
                "germane_load": 0.3,
                "total_load": 0.85,
                "load_level": "high",
                "confidence": 0.8,
                "recommendation": "Consider reducing load",
            },
        })
        assert response.status_code == 200
        data = response.json()

        assert "adaptations" in data
        assert "urgency" in data
        assert "expected_load_after" in data


class TestSessionManagement:
    """Test session management endpoints."""

    def test_session_lifecycle(self, client: TestClient):
        """Test full session lifecycle."""
        # Start session
        start_response = client.post("/api/v1/session/start", json={
            "learner_id": "test-learner",
            "session_type": "learning",
            "expected_duration_minutes": 30,
        })
        assert start_response.status_code == 200
        session_data = start_response.json()
        session_id = session_data["session_id"]

        # Update session
        update_response = client.post(f"/api/v1/session/{session_id}/update", json={
            "session_id": session_id,
            "learner_id": "test-learner",
            "interaction_data": {
                "learner_id": "test-learner",
                "response_times": [2.0, 3.0],
                "error_rates": [0.0, 0.1],
            },
        })
        assert update_response.status_code == 200

        # Get summary
        summary_response = client.get(f"/api/v1/session/{session_id}/summary")
        assert summary_response.status_code == 200
        summary = summary_response.json()
        assert summary["session_id"] == session_id

        # End session
        end_response = client.delete(f"/api/v1/session/{session_id}")
        assert end_response.status_code == 200
        assert end_response.json()["status"] == "ended"

    def test_session_not_found(self, client: TestClient):
        """Test accessing non-existent session."""
        response = client.get("/api/v1/session/non-existent/summary")
        assert response.status_code == 404
