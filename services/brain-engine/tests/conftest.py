"""
Pytest configuration for Brain Engine tests.
"""

import pytest


@pytest.fixture
def sample_learner_state():
    """Sample learner state for testing."""
    return {
        "learner_id": "test-learner-123",
        "current_skill": "addition",
        "mastery_level": 0.75,
        "engagement_score": 0.8,
        "cognitive_load": 0.5,
        "recent_performance": [0.8, 0.9, 0.7, 0.85],
    }


@pytest.fixture
def sample_recommendation_request():
    """Sample recommendation request for testing."""
    return {
        "learner_id": "test-learner-123",
        "context": {
            "session_type": "practice",
            "time_available_minutes": 20,
            "focus_area": "math",
        },
        "constraints": {
            "max_difficulty": 0.8,
            "min_engagement": 0.6,
        },
    }
