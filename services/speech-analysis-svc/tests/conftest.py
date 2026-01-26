"""
Pytest configuration for Speech Analysis Service tests.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create a test client for the FastAPI application."""
    from app.main import app
    return TestClient(app)


@pytest.fixture
def sample_transcription():
    """Sample transcription result for testing."""
    return {
        "text": "The quick brown fox jumps over the lazy dog",
        "segments": [
            {"start": 0.0, "end": 2.5, "text": "The quick brown fox"},
            {"start": 2.5, "end": 4.8, "text": "jumps over the lazy dog"},
        ],
        "language": "en",
        "confidence": 0.95,
    }


@pytest.fixture
def sample_articulation_result():
    """Sample articulation analysis result."""
    return {
        "phonemes_analyzed": 42,
        "errors_detected": 3,
        "error_rate": 0.071,
        "error_types": {
            "substitution": 2,
            "omission": 1,
        },
        "problem_phonemes": ["/r/", "/s/"],
    }
