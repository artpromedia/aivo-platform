"""
Pytest configuration for Curriculum Python Service tests.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create a test client for the FastAPI application."""
    from app.main import app
    return TestClient(app)


@pytest.fixture
def sample_curriculum():
    """Sample curriculum structure for testing."""
    return {
        "curriculum_id": "math-grade-5",
        "name": "Grade 5 Mathematics",
        "grade_level": 5,
        "subject": "math",
        "units": [
            {
                "unit_id": "unit-1",
                "name": "Place Value and Decimals",
                "standards": ["5.NBT.1", "5.NBT.2"],
            },
            {
                "unit_id": "unit-2",
                "name": "Operations with Decimals",
                "standards": ["5.NBT.5", "5.NBT.6", "5.NBT.7"],
            },
        ],
    }
