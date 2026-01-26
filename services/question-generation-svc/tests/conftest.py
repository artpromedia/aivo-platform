"""
Pytest configuration and fixtures for Question Generation Service tests.
"""

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch

# Sample test data
SAMPLE_PASSAGE = """
The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France.
It is named after the engineer Gustave Eiffel, whose company designed and built the tower.
Constructed from 1887 to 1889 as the centerpiece of the 1889 World's Fair, it was initially
criticized by some of France's leading artists and intellectuals for its design, but it has
become a global cultural icon of France and one of the most recognizable structures in the world.
The tower is 330 metres tall and was the tallest man-made structure in the world until 1930.
"""

SAMPLE_QUESTION = "What is the Eiffel Tower named after?"
SAMPLE_ANSWER = "Gustave Eiffel"


@pytest.fixture
def sample_passage():
    """Sample educational passage for testing."""
    return SAMPLE_PASSAGE


@pytest.fixture
def sample_question():
    """Sample question for testing."""
    return SAMPLE_QUESTION


@pytest.fixture
def sample_answer():
    """Sample answer for testing."""
    return SAMPLE_ANSWER


@pytest.fixture
def mock_pipeline():
    """Mocked generation pipeline for unit tests."""
    pipeline = MagicMock()

    # Mock generate_questions
    pipeline.generate_questions = AsyncMock(return_value={
        "request_id": "test-123",
        "questions": [
            {
                "question_id": "q-1",
                "question_text": "What is the Eiffel Tower?",
                "answer": "A wrought-iron lattice tower",
                "distractors": None,
                "question_type": "factual",
                "difficulty_estimate": 0.4,
                "bloom_level": "remember",
                "source_span": (0, 50),
                "confidence": 0.85,
            }
        ],
        "generation_time_ms": 150,
        "model_version": "test-model",
    })

    # Mock other methods
    pipeline.generate_mcq = AsyncMock(return_value={
        "request_id": "test-123",
        "questions": [],
        "generation_time_ms": 200,
        "model_version": "test-model",
    })

    pipeline.generate_cloze = AsyncMock(return_value={
        "request_id": "test-123",
        "items": [],
        "generation_time_ms": 100,
        "model_version": "cloze-v1",
    })

    pipeline.score_quality = AsyncMock(return_value={
        "overall_score": 0.75,
        "answerability": 0.8,
        "fluency": 0.9,
        "relevance": 0.7,
        "difficulty_estimate": 0.5,
        "specificity": 0.6,
        "is_acceptable": True,
        "issues": [],
    })

    pipeline.classify_bloom = AsyncMock(return_value={
        "primary_level": "remember",
        "confidence": 0.85,
        "level_probabilities": {
            "remember": 0.85,
            "understand": 0.1,
            "apply": 0.02,
            "analyze": 0.01,
            "evaluate": 0.01,
            "create": 0.01,
        },
    })

    pipeline.estimate_difficulty = AsyncMock(return_value={
        "difficulty": 0.4,
        "confidence": 0.8,
        "factors": {
            "linguistic_complexity": 0.3,
            "bloom_level": 0.2,
            "answer_complexity": 0.4,
        },
        "estimated_p_correct": 0.7,
        "grade_level_estimate": 6,
    })

    pipeline.is_ready = MagicMock(return_value=True)
    pipeline.get_status = MagicMock(return_value={
        "ready": True,
        "config": {},
        "cache_size": 0,
        "components": {},
    })

    return pipeline


@pytest.fixture
def app_with_mock_pipeline(mock_pipeline):
    """FastAPI app with mocked pipeline for testing."""
    from app.main import app

    # Store original state
    original_pipeline = getattr(app.state, "pipeline", None)

    # Set mock pipeline
    app.state.pipeline = mock_pipeline

    yield app

    # Restore original state
    if original_pipeline:
        app.state.pipeline = original_pipeline


@pytest.fixture
def client(app_with_mock_pipeline):
    """Sync test client."""
    return TestClient(app_with_mock_pipeline)


@pytest.fixture
async def async_client(app_with_mock_pipeline):
    """Async test client."""
    transport = ASGITransport(app=app_with_mock_pipeline)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# Fixtures for model testing (without mocks)

@pytest.fixture
def answer_extractor():
    """Real answer extractor for integration tests."""
    from app.models.answer_extractor import AnswerExtractor
    return AnswerExtractor()


@pytest.fixture
def bloom_classifier():
    """Real Bloom classifier for integration tests."""
    from app.models.bloom_classifier import BloomClassifier
    return BloomClassifier()


@pytest.fixture
def difficulty_estimator():
    """Real difficulty estimator for integration tests."""
    from app.models.difficulty_estimator import DifficultyEstimator
    return DifficultyEstimator()


@pytest.fixture
def quality_filter():
    """Real quality filter for integration tests."""
    from app.services.quality_filter import QualityFilter
    return QualityFilter()


@pytest.fixture
def cloze_generator():
    """Real cloze generator for integration tests."""
    from app.models.cloze_generator import ClozeGenerator
    return ClozeGenerator()


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
