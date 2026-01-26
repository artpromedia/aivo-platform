"""
Pytest configuration for Document Intelligence Service tests.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create a test client for the FastAPI application."""
    from app.main import app
    return TestClient(app)


@pytest.fixture
def sample_iep_text():
    """Sample IEP document text for testing."""
    return """
    INDIVIDUALIZED EDUCATION PROGRAM
    
    Student: John Doe
    Date of Birth: 01/15/2014
    Grade: 5
    
    Present Levels of Performance:
    John is currently reading at a 3rd grade level. He struggles with reading comprehension
    and decoding multisyllabic words.
    
    Annual Goal 1 - Reading:
    By the end of the IEP period, John will improve his reading comprehension from
    a 3rd grade level to a 4th grade level as measured by curriculum-based assessments
    with 80% accuracy.
    
    Services:
    - Special Education: 60 minutes daily
    - Speech-Language Therapy: 30 minutes, 2x weekly
    
    Accommodations:
    - Extended time on tests (1.5x)
    - Preferential seating
    - Chunked assignments
    """
