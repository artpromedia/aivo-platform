"""Tests for API endpoints."""

import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_health_check(self, client):
        """Test /health endpoint."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data
        assert "version" in data

    def test_readiness_check(self, client):
        """Test /ready endpoint."""
        response = client.get("/ready")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "models_loaded" in data

    def test_liveness_check(self, client):
        """Test /live endpoint."""
        response = client.get("/live")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "alive"


class TestAssessmentEndpoints:
    """Tests for assessment API endpoints."""

    def test_full_assessment(self, client, sample_essay):
        """Test /assess/full endpoint."""
        response = client.post(
            "/assess/full",
            json={
                "text": sample_essay,
                "include_feedback": True,
                "scoring_mode": "holistic"
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert "assessment_id" in data
        assert "overall_score" in data
        assert "holistic_score" in data
        assert "grammar_report" in data
        assert "coherence_analysis" in data
        assert "style_report" in data
        assert "readability_profile" in data
        assert "processing_time_ms" in data

    def test_full_assessment_trait_based(self, client, sample_essay):
        """Test full assessment with trait-based scoring."""
        response = client.post(
            "/assess/full",
            json={
                "text": sample_essay,
                "scoring_mode": "trait-based"
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert "trait_scores" in data

    def test_full_assessment_validation_error(self, client):
        """Test validation error for short text."""
        response = client.post(
            "/assess/full",
            json={"text": "Too short"}
        )

        assert response.status_code == 422  # Validation error

    def test_grammar_check(self, client, text_with_errors):
        """Test /assess/grammar endpoint."""
        response = client.post(
            "/assess/grammar",
            json={
                "text": text_with_errors,
                "include_style": True
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert "report" in data
        assert "errors" in data["report"]
        assert "total_errors" in data["report"]
        assert "processing_time_ms" in data

    def test_grammar_check_auto_correct(self, client, text_with_errors):
        """Test grammar check with auto-correction."""
        response = client.post(
            "/assess/grammar",
            json={
                "text": text_with_errors,
                "auto_correct": True
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert "corrected_text" in data["report"]

    def test_readability_analysis(self, client, sample_essay):
        """Test /assess/readability endpoint."""
        response = client.post(
            "/assess/readability",
            json={"text": sample_essay}
        )

        assert response.status_code == 200
        data = response.json()

        assert "profile" in data
        assert "flesch_kincaid_grade" in data["profile"]
        assert "flesch_reading_ease" in data["profile"]
        assert "average_grade_level" in data["profile"]
        assert "processing_time_ms" in data

    def test_readability_with_target(self, client, sample_essay):
        """Test readability analysis with target grade."""
        response = client.post(
            "/assess/readability",
            json={
                "text": sample_essay,
                "target_grade": 8
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert "comparison_to_target" in data

    def test_style_analysis(self, client, sample_essay):
        """Test /assess/style endpoint."""
        response = client.post(
            "/assess/style",
            json={"text": sample_essay}
        )

        assert response.status_code == 200
        data = response.json()

        assert "report" in data
        assert "sentence_length_stats" in data["report"]
        assert "vocabulary_level" in data["report"]
        assert "tone" in data["report"]
        assert "processing_time_ms" in data

    def test_coherence_analysis(self, client, sample_essay):
        """Test /assess/coherence endpoint."""
        response = client.post(
            "/assess/coherence",
            json={
                "text": sample_essay,
                "include_suggestions": True
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert "analysis" in data
        assert "overall_score" in data["analysis"]
        assert "local_coherence" in data["analysis"]
        assert "global_coherence" in data["analysis"]
        assert "suggestions" in data
        assert "processing_time_ms" in data


class TestFeedbackEndpoints:
    """Tests for feedback generation endpoints."""

    def test_feedback_generation(self, client, sample_essay):
        """Test feedback generation flow."""
        # First, create an assessment
        assess_response = client.post(
            "/assess/full",
            json={
                "text": sample_essay,
                "include_feedback": False
            }
        )

        assert assess_response.status_code == 200
        assessment_id = assess_response.json()["assessment_id"]

        # Then generate feedback
        feedback_response = client.post(
            "/feedback/generate",
            json={
                "assessment_id": assessment_id,
                "feedback_style": "encouraging",
                "max_suggestions": 5
            }
        )

        assert feedback_response.status_code == 200
        data = feedback_response.json()

        assert "feedback" in data
        assert "summary" in data["feedback"]
        assert "strengths" in data["feedback"]
        assert "areas_for_improvement" in data["feedback"]

    def test_feedback_invalid_assessment_id(self, client):
        """Test feedback with invalid assessment ID."""
        response = client.post(
            "/feedback/generate",
            json={
                "assessment_id": "nonexistent-id",
                "feedback_style": "direct"
            }
        )

        assert response.status_code == 404


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_empty_text_handling(self, client):
        """Test handling of empty text."""
        response = client.post(
            "/assess/grammar",
            json={"text": ""}
        )

        # Should return validation error or handle gracefully
        assert response.status_code in [200, 422]

    def test_very_long_text(self, client):
        """Test handling of very long text."""
        long_text = "This is a sentence. " * 500  # ~10000 chars

        response = client.post(
            "/assess/readability",
            json={"text": long_text}
        )

        assert response.status_code == 200

    def test_special_characters(self, client):
        """Test handling of special characters."""
        text = """
        This text contains special characters: @#$%^&*()
        And also "quotes" and 'apostrophes'.
        Plus some unicode: café, naïve, résumé.
        """

        response = client.post(
            "/assess/grammar",
            json={"text": text}
        )

        assert response.status_code == 200

    def test_concurrent_requests(self, client, sample_essay):
        """Test handling of concurrent requests."""
        import concurrent.futures

        def make_request():
            return client.post(
                "/assess/readability",
                json={"text": sample_essay}
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(5)]
            results = [f.result() for f in futures]

        # All requests should succeed
        for result in results:
            assert result.status_code == 200
