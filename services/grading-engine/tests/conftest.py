"""
Pytest configuration and fixtures for grading-engine tests.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

# ============================================================================
# MOCK DATA FIXTURES
# ============================================================================


@pytest.fixture
def mock_openai_client():
    """Create a mock OpenAI client for testing."""
    client = AsyncMock()

    # Default mock response structure
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = '{"score": 5, "feedback": "Good work!"}'

    client.chat.completions.create = AsyncMock(return_value=mock_response)

    return client


@pytest.fixture
def mock_openai_response():
    """Factory fixture to create custom mock OpenAI responses."""
    def _create_response(content: str):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = content
        return mock_response
    return _create_response


# ============================================================================
# QUESTION FIXTURES
# ============================================================================


@pytest.fixture
def multiple_choice_question():
    """Sample multiple choice question."""
    return {
        "id": "mc-1",
        "type": "multiple-choice",
        "text": "What is the capital of France?",
        "points": 1,
        "correct_answer": "B",
        "options": [
            {"id": "A", "text": "London", "is_correct": False},
            {"id": "B", "text": "Paris", "is_correct": True},
            {"id": "C", "text": "Berlin", "is_correct": False},
            {"id": "D", "text": "Madrid", "is_correct": False},
        ],
    }


@pytest.fixture
def true_false_question():
    """Sample true/false question."""
    return {
        "id": "tf-1",
        "type": "true-false",
        "text": "The Earth is flat.",
        "points": 1,
        "correct_answer": False,
    }


@pytest.fixture
def short_answer_question():
    """Sample short answer question."""
    return {
        "id": "sa-1",
        "type": "short-answer",
        "text": "Explain the water cycle in 2-3 sentences.",
        "points": 5,
        "expected_answer": "The water cycle describes how water evaporates from the surface, rises into the atmosphere, cools and condenses into clouds, and falls back to the surface as precipitation.",
    }


@pytest.fixture
def essay_question():
    """Sample essay question with rubric."""
    return {
        "id": "essay-1",
        "type": "essay",
        "text": "Discuss the causes and effects of climate change.",
        "points": 20,
        "rubric": {
            "content": {
                "weight": 40,
                "levels": {
                    "excellent": "Comprehensive coverage of causes and effects with specific examples",
                    "good": "Covers main causes and effects with some examples",
                    "satisfactory": "Basic coverage of causes and effects",
                    "needs_improvement": "Missing major causes or effects",
                },
            },
            "organization": {
                "weight": 30,
                "levels": {
                    "excellent": "Clear introduction, body, and conclusion with smooth transitions",
                    "good": "Clear structure with minor flow issues",
                    "satisfactory": "Basic structure present",
                    "needs_improvement": "Lacks clear organization",
                },
            },
            "writing_quality": {
                "weight": 30,
                "levels": {
                    "excellent": "Excellent grammar, vocabulary, and sentence variety",
                    "good": "Good writing with minor errors",
                    "satisfactory": "Acceptable writing with some errors",
                    "needs_improvement": "Frequent errors affecting readability",
                },
            },
        },
    }


@pytest.fixture
def math_question():
    """Sample math question."""
    return {
        "id": "math-1",
        "type": "math",
        "text": "Solve for x: 2x + 5 = 15",
        "points": 5,
        "correct_answer": 5,
    }


@pytest.fixture
def essay_question_simple_rubric():
    """Essay question with a simple rubric."""
    return {
        "id": "essay-2",
        "type": "essay",
        "text": "Describe your favorite book and why you like it.",
        "points": 10,
        "rubric": {
            "content": "Describes the book and gives reasons",
            "clarity": "Writing is clear and easy to understand",
        },
    }


# ============================================================================
# ASSESSMENT FIXTURES
# ============================================================================


@pytest.fixture
def sample_assessment(
    multiple_choice_question, true_false_question, short_answer_question
):
    """Sample assessment with mixed question types."""
    return {
        "id": "assess-1",
        "title": "Science Quiz",
        "grade_level": "middle",
        "questions": [
            multiple_choice_question,
            true_false_question,
            short_answer_question,
        ],
    }


@pytest.fixture
def full_assessment(
    multiple_choice_question,
    true_false_question,
    short_answer_question,
    essay_question,
    math_question,
):
    """Full assessment with all question types."""
    return {
        "id": "assess-full",
        "title": "Comprehensive Test",
        "grade_level": "high",
        "questions": [
            multiple_choice_question,
            true_false_question,
            short_answer_question,
            essay_question,
            math_question,
        ],
    }


# ============================================================================
# GRADER FIXTURES
# ============================================================================


@pytest.fixture
def auto_grader(mock_openai_client):
    """Create an AutoGrader instance with mocked OpenAI client."""
    with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
        from src.auto_grader import AutoGrader

        grader = AutoGrader("test-key")
        grader.openai = mock_openai_client

        # Update AI-powered graders with mock client
        from src.auto_grader import ShortAnswerGrader, EssayGrader, MathGrader

        grader._graders["short-answer"] = ShortAnswerGrader(mock_openai_client)
        grader._graders["essay"] = EssayGrader(mock_openai_client)
        grader._graders["math"] = MathGrader(mock_openai_client)

        return grader


# ============================================================================
# API CLIENT FIXTURES
# ============================================================================


@pytest.fixture
def mock_grader_for_app(mock_openai_client):
    """Create a mock grader for the FastAPI app."""
    with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
        from src.auto_grader import AutoGrader, ShortAnswerGrader, EssayGrader, MathGrader

        grader = AutoGrader("test-key")
        grader.openai = mock_openai_client
        grader._graders["short-answer"] = ShortAnswerGrader(mock_openai_client)
        grader._graders["essay"] = EssayGrader(mock_openai_client)
        grader._graders["math"] = MathGrader(mock_openai_client)

        return grader


@pytest.fixture
async def async_client(mock_grader_for_app):
    """Create an async HTTP client for testing the FastAPI app."""
    from src.main import app
    import src.main as main_module

    # Set the global grader
    original_grader = main_module.grader
    main_module.grader = mock_grader_for_app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    # Restore original grader
    main_module.grader = original_grader


# ============================================================================
# PYTEST CONFIGURATION
# ============================================================================


def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
