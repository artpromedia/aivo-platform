"""
Unit tests for API endpoints.
"""

import pytest
from fastapi import status


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_health_check(self, client):
        """Test basic health check."""
        response = client.get("/health")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data
        assert "version" in data

    def test_liveness_check(self, client):
        """Test liveness probe."""
        response = client.get("/live")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "alive"

    def test_readiness_check(self, client):
        """Test readiness probe."""
        response = client.get("/ready")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "status" in data
        assert "dependencies" in data

    def test_root_endpoint(self, client):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "service" in data
        assert "status" in data


class TestQuestionGeneration:
    """Tests for question generation endpoints."""

    def test_generate_questions(self, client, sample_passage):
        """Test question generation endpoint."""
        response = client.post(
            "/api/v1/generate/questions",
            json={
                "passage": sample_passage,
                "num_questions": 3,
            },
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "request_id" in data
        assert "questions" in data
        assert "generation_time_ms" in data
        assert "model_version" in data

    def test_generate_questions_with_distractors(self, client, sample_passage):
        """Test question generation with distractors."""
        response = client.post(
            "/api/v1/generate/questions",
            json={
                "passage": sample_passage,
                "num_questions": 2,
                "include_distractors": True,
            },
        )
        assert response.status_code == status.HTTP_200_OK

    def test_generate_questions_validation_error(self, client):
        """Test validation error for short passage."""
        response = client.post(
            "/api/v1/generate/questions",
            json={
                "passage": "Too short",
                "num_questions": 5,
            },
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestMCQGeneration:
    """Tests for MCQ generation endpoint."""

    def test_generate_mcq(self, client, sample_passage):
        """Test MCQ generation."""
        response = client.post(
            "/api/v1/generate/mcq",
            json={
                "passage": sample_passage,
                "num_questions": 3,
                "num_distractors": 3,
            },
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "questions" in data


class TestClozeGeneration:
    """Tests for cloze generation endpoint."""

    def test_generate_cloze(self, client, sample_passage):
        """Test cloze generation."""
        response = client.post(
            "/api/v1/generate/cloze",
            json={
                "passage": sample_passage,
                "num_items": 3,
                "blank_strategy": "key_terms",
            },
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data


class TestQualityScoring:
    """Tests for quality scoring endpoint."""

    def test_score_quality(self, client, sample_passage, sample_question, sample_answer):
        """Test quality scoring."""
        response = client.post(
            "/api/v1/quality/score",
            json={
                "question": sample_question,
                "answer": sample_answer,
                "passage": sample_passage,
            },
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "overall_score" in data
        assert "answerability" in data
        assert "fluency" in data
        assert "relevance" in data
        assert "is_acceptable" in data


class TestBloomClassification:
    """Tests for Bloom's classification endpoint."""

    def test_classify_bloom(self, client, sample_question):
        """Test Bloom's classification."""
        response = client.post(
            "/api/v1/bloom/classify",
            json={"question": sample_question},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "primary_level" in data
        assert "confidence" in data
        assert "level_probabilities" in data


class TestDifficultyEstimation:
    """Tests for difficulty estimation endpoint."""

    def test_estimate_difficulty(self, client, sample_question, sample_answer):
        """Test difficulty estimation."""
        response = client.post(
            "/api/v1/difficulty/estimate",
            json={
                "question": sample_question,
                "answer": sample_answer,
            },
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "difficulty" in data
        assert "confidence" in data
        assert "factors" in data
        assert "estimated_p_correct" in data


class TestPipelineStatus:
    """Tests for pipeline status endpoints."""

    def test_get_status(self, client):
        """Test pipeline status endpoint."""
        response = client.get("/api/v1/status")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "ready" in data

    def test_clear_cache(self, client):
        """Test cache clear endpoint."""
        response = client.post("/api/v1/cache/clear")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "cache cleared"
