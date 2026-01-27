"""Pytest configuration and fixtures for Cognitive Load Service tests."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.routes import init_components
from app.core.config import get_settings


@pytest.fixture(scope="session")
def settings():
    """Get test settings."""
    return get_settings()


@pytest.fixture(scope="session")
def initialized_app(settings):
    """Initialize app with components."""
    init_components(settings)
    return app


@pytest.fixture
def client(initialized_app):
    """Create test client."""
    return TestClient(initialized_app)


@pytest.fixture
def sample_content():
    """Sample educational content for testing."""
    return {
        "simple": "The cat sat on the mat.",
        "moderate": "Photosynthesis is the process by which plants convert sunlight into energy.",
        "complex": """
        The mitochondria is often referred to as the powerhouse of the cell because
        it generates most of the cell's supply of adenosine triphosphate (ATP),
        which is used as a source of chemical energy. The process involves the
        oxidation of nutrients through a series of enzymatic reactions in the
        electron transport chain, ultimately producing ATP through oxidative
        phosphorylation.
        """,
    }


@pytest.fixture
def sample_interaction_data():
    """Sample interaction data for testing."""
    return {
        "learner_id": "test-learner-123",
        "response_times": [2.5, 3.0, 4.5, 3.2, 5.0],
        "error_rates": [0.0, 0.0, 0.2, 0.0, 0.1],
        "help_requests": 1,
        "backtracking_count": 2,
        "time_on_task": 120.0,
    }


@pytest.fixture
def sample_working_memory_data():
    """Sample working memory data for testing."""
    return {
        "learner_id": "test-learner-123",
        "current_content": "Learn about photosynthesis and cellular respiration.",
        "recent_content": [
            "Plants need sunlight to grow.",
            "Chlorophyll gives plants their green color.",
        ],
        "time_on_task_seconds": 180.0,
        "response_latencies": [2.0, 3.5, 4.0],
        "error_count": 1,
    }


@pytest.fixture
def sample_overload_data():
    """Sample data for overload prediction testing."""
    return {
        "learner_id": "test-learner-123",
        "current_load": 0.75,
        "load_history": [0.5, 0.55, 0.6, 0.65, 0.7, 0.75],
        "upcoming_content_complexity": [0.8, 0.7, 0.6],
        "fatigue_indicators": {
            "session_duration": 0.6,
            "time_of_day": 0.3,
        },
    }
