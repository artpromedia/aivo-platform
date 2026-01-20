"""
Tests for API endpoints in the grading-engine service.

Tests cover:
- Health check endpoint
- Grade assessment endpoint
- Grade single question endpoint
- Error handling and edge cases
- Request/response validation
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock


# ============================================================================
# HEALTH CHECK TESTS
# ============================================================================


class TestHealthEndpoint:
    """Tests for the health check endpoint."""

    @pytest.mark.asyncio
    async def test_health_check_returns_healthy(self, async_client):
        """Test that health check returns healthy status."""
        response = await async_client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "grading-engine"
        assert data["version"] == "1.0.0"

    @pytest.mark.asyncio
    async def test_health_check_response_model(self, async_client):
        """Test health check response matches expected schema."""
        response = await async_client.get("/health")

        data = response.json()
        assert "status" in data
        assert "service" in data
        assert "version" in data
        assert len(data) == 3


# ============================================================================
# GRADE ASSESSMENT ENDPOINT TESTS
# ============================================================================


class TestGradeAssessmentEndpoint:
    """Tests for the grade assessment endpoint."""

    @pytest.mark.asyncio
    async def test_grade_simple_assessment(self, async_client, mock_openai_response, mock_grader_for_app):
        """Test grading a simple assessment via API."""
        mock_grader_for_app.openai.chat.completions.create.return_value = mock_openai_response(
            '{"score": 4, "feedback": "Good work!"}'
        )

        request_data = {
            "assessment": {
                "id": "test-1",
                "title": "Simple Quiz",
                "grade_level": "elementary",
                "questions": [
                    {
                        "id": "q1",
                        "type": "multiple-choice",
                        "text": "What is 2 + 2?",
                        "points": 1,
                        "correct_answer": "B",
                        "options": [
                            {"id": "A", "text": "3", "is_correct": False},
                            {"id": "B", "text": "4", "is_correct": True},
                        ],
                    },
                    {
                        "id": "q2",
                        "type": "true-false",
                        "text": "The sky is blue.",
                        "points": 1,
                        "correct_answer": True,
                    },
                ],
            },
            "student_answers": {
                "q1": "B",
                "q2": True,
            },
        }

        response = await async_client.post("/grade/assessment", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["total_points"] == 2
        assert data["earned_points"] == 2
        assert data["percentage"] == 100.0
        assert len(data["questions"]) == 2

    @pytest.mark.asyncio
    async def test_grade_assessment_partial_credit(self, async_client, mock_openai_response, mock_grader_for_app):
        """Test assessment grading with partial credit."""
        mock_grader_for_app.openai.chat.completions.create.return_value = mock_openai_response(
            '{"score": 3, "feedback": "Partial answer."}'
        )

        request_data = {
            "assessment": {
                "id": "test-2",
                "title": "Mixed Quiz",
                "grade_level": "middle",
                "questions": [
                    {
                        "id": "q1",
                        "type": "multiple-choice",
                        "text": "Capital of France?",
                        "points": 2,
                        "correct_answer": "A",
                    },
                    {
                        "id": "q2",
                        "type": "short-answer",
                        "text": "Explain photosynthesis.",
                        "points": 5,
                        "expected_answer": "Process by which plants convert sunlight to energy.",
                    },
                ],
            },
            "student_answers": {
                "q1": "B",  # Wrong
                "q2": "Plants use sunlight.",  # Partial
            },
        }

        response = await async_client.post("/grade/assessment", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["total_points"] == 7
        assert data["earned_points"] == 3  # 0 + 3
        assert data["percentage"] == pytest.approx(42.86, rel=0.01)

    @pytest.mark.asyncio
    async def test_grade_assessment_missing_answers(self, async_client, mock_openai_response, mock_grader_for_app):
        """Test assessment grading with missing student answers."""
        request_data = {
            "assessment": {
                "id": "test-3",
                "title": "Quiz with Missing Answers",
                "grade_level": "elementary",
                "questions": [
                    {
                        "id": "q1",
                        "type": "multiple-choice",
                        "text": "Q1",
                        "points": 1,
                        "correct_answer": "A",
                    },
                    {
                        "id": "q2",
                        "type": "multiple-choice",
                        "text": "Q2",
                        "points": 1,
                        "correct_answer": "B",
                    },
                ],
            },
            "student_answers": {
                "q1": "A",
                # q2 missing
            },
        }

        response = await async_client.post("/grade/assessment", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["earned_points"] == 1

        q2_result = next(q for q in data["questions"] if q["question_id"] == "q2")
        assert q2_result["points"] == 0
        assert "No answer" in q2_result["feedback"]

    @pytest.mark.asyncio
    async def test_grade_assessment_invalid_request(self, async_client):
        """Test assessment grading with invalid request body."""
        request_data = {
            "invalid_field": "data",
        }

        response = await async_client.post("/grade/assessment", json=request_data)

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_grade_assessment_empty_questions(self, async_client, mock_openai_response, mock_grader_for_app):
        """Test assessment with no questions."""
        request_data = {
            "assessment": {
                "id": "empty",
                "title": "Empty Assessment",
                "grade_level": "elementary",
                "questions": [],
            },
            "student_answers": {},
        }

        response = await async_client.post("/grade/assessment", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["total_points"] == 0
        assert data["earned_points"] == 0


# ============================================================================
# GRADE SINGLE QUESTION ENDPOINT TESTS
# ============================================================================


class TestGradeSingleQuestionEndpoint:
    """Tests for the grade single question endpoint."""

    @pytest.mark.asyncio
    async def test_grade_multiple_choice_correct(self, async_client):
        """Test grading a correct multiple choice question."""
        request_data = {
            "question": {
                "id": "mc-1",
                "type": "multiple-choice",
                "text": "What is the capital of Japan?",
                "points": 2,
                "correct_answer": "C",
            },
            "student_answer": "C",
        }

        response = await async_client.post("/grade/question", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["points"] == 2
        assert data["correct"] is True

    @pytest.mark.asyncio
    async def test_grade_multiple_choice_incorrect(self, async_client):
        """Test grading an incorrect multiple choice question."""
        request_data = {
            "question": {
                "id": "mc-2",
                "type": "multiple-choice",
                "text": "What color is the sun?",
                "points": 1,
                "correct_answer": "B",
            },
            "student_answer": "A",
        }

        response = await async_client.post("/grade/question", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["points"] == 0
        assert data["correct"] is False

    @pytest.mark.asyncio
    async def test_grade_true_false(self, async_client):
        """Test grading a true/false question."""
        request_data = {
            "question": {
                "id": "tf-1",
                "type": "true-false",
                "text": "Water freezes at 0 degrees Celsius.",
                "points": 1,
                "correct_answer": True,
            },
            "student_answer": True,
        }

        response = await async_client.post("/grade/question", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["points"] == 1
        assert data["correct"] is True

    @pytest.mark.asyncio
    async def test_grade_short_answer(self, async_client, mock_openai_response, mock_grader_for_app):
        """Test grading a short answer question via API."""
        mock_grader_for_app.openai.chat.completions.create.return_value = mock_openai_response(
            '{"score": 4, "feedback": "Good explanation but missing some details."}'
        )

        request_data = {
            "question": {
                "id": "sa-1",
                "type": "short-answer",
                "text": "Explain gravity.",
                "points": 5,
                "expected_answer": "Gravity is a force that attracts objects with mass toward each other.",
            },
            "student_answer": "Gravity pulls things down to the ground.",
        }

        response = await async_client.post("/grade/question", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["points"] == 4
        assert "missing" in data["feedback"].lower() or "Good" in data["feedback"]

    @pytest.mark.asyncio
    async def test_grade_essay_with_rubric(self, async_client, mock_openai_response, mock_grader_for_app):
        """Test grading an essay question with rubric."""
        mock_grader_for_app.openai.chat.completions.create.return_value = mock_openai_response(
            '{"total_score": 15, "feedback": "Well-written essay.", "rubric_scores": {"content": 8, "organization": 7}, "strengths": ["Clear thesis"], "improvements": ["More examples"]}'
        )

        request_data = {
            "question": {
                "id": "essay-1",
                "type": "essay",
                "text": "Discuss climate change.",
                "points": 20,
                "rubric": {
                    "content": {"weight": 50, "levels": {"excellent": "Comprehensive"}},
                    "organization": {"weight": 50, "levels": {"excellent": "Well structured"}},
                },
            },
            "student_answer": "Climate change is a significant global issue...",
        }

        response = await async_client.post("/grade/question", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["points"] == 15

    @pytest.mark.asyncio
    async def test_grade_question_invalid_type(self, async_client):
        """Test grading a question with unknown type."""
        request_data = {
            "question": {
                "id": "unknown-1",
                "type": "unknown-type",
                "text": "Some question",
                "points": 5,
            },
            "student_answer": "Some answer",
        }

        response = await async_client.post("/grade/question", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["points"] == 0
        assert "Unknown" in data["feedback"]


# ============================================================================
# ERROR HANDLING TESTS
# ============================================================================


class TestErrorHandling:
    """Tests for API error handling."""

    @pytest.mark.asyncio
    async def test_grader_not_available(self):
        """Test response when grader is not initialized."""
        from httpx import AsyncClient, ASGITransport
        from src.main import app
        import src.main as main_module

        # Temporarily set grader to None
        original_grader = main_module.grader
        main_module.grader = None

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                request_data = {
                    "assessment": {
                        "id": "test",
                        "title": "Test",
                        "questions": [],
                    },
                    "student_answers": {},
                }

                response = await client.post("/grade/assessment", json=request_data)

                assert response.status_code == 503
                assert "not available" in response.json()["detail"]
        finally:
            main_module.grader = original_grader

    @pytest.mark.asyncio
    async def test_single_question_grader_not_available(self):
        """Test single question endpoint when grader is not initialized."""
        from httpx import AsyncClient, ASGITransport
        from src.main import app
        import src.main as main_module

        original_grader = main_module.grader
        main_module.grader = None

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                request_data = {
                    "question": {
                        "id": "q1",
                        "type": "multiple-choice",
                        "text": "Test",
                        "points": 1,
                    },
                    "student_answer": "A",
                }

                response = await client.post("/grade/question", json=request_data)

                assert response.status_code == 503
        finally:
            main_module.grader = original_grader

    @pytest.mark.asyncio
    async def test_malformed_json(self, async_client):
        """Test handling of malformed JSON in request."""
        response = await async_client.post(
            "/grade/assessment",
            content="not valid json",
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_missing_required_fields(self, async_client):
        """Test validation error for missing required fields."""
        # Missing student_answers
        request_data = {
            "assessment": {
                "id": "test",
                "title": "Test",
                "questions": [],
            },
        }

        response = await async_client.post("/grade/assessment", json=request_data)

        assert response.status_code == 422


# ============================================================================
# REQUEST VALIDATION TESTS
# ============================================================================


class TestRequestValidation:
    """Tests for request body validation."""

    @pytest.mark.asyncio
    async def test_assessment_requires_id(self, async_client):
        """Test that assessment requires an ID."""
        request_data = {
            "assessment": {
                "title": "Test",
                "questions": [],
            },
            "student_answers": {},
        }

        response = await async_client.post("/grade/assessment", json=request_data)

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_question_requires_id_and_type(self, async_client):
        """Test that questions require id and type fields."""
        request_data = {
            "question": {
                "text": "Missing id and type",
                "points": 1,
            },
            "student_answer": "test",
        }

        response = await async_client.post("/grade/question", json=request_data)

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_default_points_value(self, async_client):
        """Test that points defaults to 1 if not specified."""
        request_data = {
            "question": {
                "id": "q1",
                "type": "multiple-choice",
                "text": "Test question",
                "correct_answer": "A",
                # points not specified - should default to 1
            },
            "student_answer": "A",
        }

        response = await async_client.post("/grade/question", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["points"] == 1  # Default value

    @pytest.mark.asyncio
    async def test_default_grade_level(self, async_client, mock_openai_response, mock_grader_for_app):
        """Test that grade_level defaults to 'elementary'."""
        request_data = {
            "assessment": {
                "id": "test",
                "title": "Test",
                # grade_level not specified
                "questions": [
                    {
                        "id": "q1",
                        "type": "multiple-choice",
                        "text": "Test",
                        "points": 1,
                        "correct_answer": "A",
                    },
                ],
            },
            "student_answers": {"q1": "A"},
        }

        response = await async_client.post("/grade/assessment", json=request_data)

        assert response.status_code == 200


# ============================================================================
# RESPONSE VALIDATION TESTS
# ============================================================================


class TestResponseValidation:
    """Tests for response body validation."""

    @pytest.mark.asyncio
    async def test_assessment_response_structure(self, async_client, mock_openai_response, mock_grader_for_app):
        """Test that assessment response has all required fields."""
        request_data = {
            "assessment": {
                "id": "test",
                "title": "Test",
                "grade_level": "elementary",
                "questions": [
                    {
                        "id": "q1",
                        "type": "multiple-choice",
                        "text": "Test",
                        "points": 1,
                        "correct_answer": "A",
                    },
                ],
            },
            "student_answers": {"q1": "A"},
        }

        response = await async_client.post("/grade/assessment", json=request_data)

        assert response.status_code == 200
        data = response.json()

        # Check all required fields
        assert "total_points" in data
        assert "earned_points" in data
        assert "percentage" in data
        assert "questions" in data
        assert "overall_feedback" in data

        # Check question result structure
        q_result = data["questions"][0]
        assert "question_id" in q_result
        assert "points" in q_result
        assert "max_points" in q_result
        assert "feedback" in q_result
        assert "correct" in q_result

    @pytest.mark.asyncio
    async def test_single_question_response_structure(self, async_client):
        """Test that single question response has all required fields."""
        request_data = {
            "question": {
                "id": "q1",
                "type": "multiple-choice",
                "text": "Test",
                "points": 1,
                "correct_answer": "A",
            },
            "student_answer": "A",
        }

        response = await async_client.post("/grade/question", json=request_data)

        assert response.status_code == 200
        data = response.json()

        assert "points" in data
        assert "feedback" in data
        assert "correct" in data
