"""
Pytest configuration for Document Intelligence Service tests.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock
from io import BytesIO
from datetime import date
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

from fastapi.testclient import TestClient


# =============================================================================
# Mock Data Classes
# =============================================================================


@dataclass
class MockIEPStudent:
    """Mock IEP student data."""
    name: str = "John Doe"
    student_id: Optional[str] = "12345"
    date_of_birth: Optional[date] = None
    grade_level: Optional[str] = "5"
    school: Optional[str] = "Lincoln Elementary"
    disability_categories: List[str] = field(default_factory=lambda: ["Specific Learning Disability"])


@dataclass
class MockIEPGoal:
    """Mock IEP goal data."""
    goal_number: str = "1"
    category: str = "academic"
    domain: str = "reading"
    baseline: str = "3rd grade reading level"
    target: str = "4th grade reading level"
    measurement: str = "Curriculum-based assessments"
    timeline: str = "By end of IEP year"
    accommodations: List[str] = field(default_factory=list)
    benchmarks: List[str] = field(default_factory=list)
    confidence: float = 0.95


@dataclass
class MockIEPAccommodation:
    """Mock IEP accommodation data."""
    name: str = "Extended Time"
    category: str = "timing"
    description: str = "1.5x time on all tests"
    applies_to: List[str] = field(default_factory=lambda: ["tests", "quizzes"])


@dataclass
class MockIEPService:
    """Mock IEP service data."""
    service_type: str = "Special Education"
    provider: str = "Special Education Teacher"
    minutes_per_week: int = 300
    location: str = "Resource Room"
    frequency: str = "Daily"


@dataclass
class MockIEPDocument:
    """Mock IEP document data."""
    student: MockIEPStudent = field(default_factory=MockIEPStudent)
    iep_date: Optional[date] = None
    goals: List[MockIEPGoal] = field(default_factory=list)
    accommodations: List[MockIEPAccommodation] = field(default_factory=list)
    services: List[MockIEPService] = field(default_factory=list)
    placement: Optional[str] = "General Education with Resource"
    present_levels: Dict[str, str] = field(default_factory=dict)
    extraction_confidence: float = 0.92
    extraction_warnings: List[str] = field(default_factory=list)
    page_count: int = 10


@dataclass
class MockPDFContent:
    """Mock PDF content data."""
    text: str = "Sample extracted text from PDF document"
    page_count: int = 5
    has_images: bool = False
    ocr_pages: List[int] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=lambda: {"title": "Sample Document"})


@dataclass
class MockCurriculumStandard:
    """Mock curriculum standard."""
    code: str = "CCSS.ELA-LITERACY.RL.5.1"
    description: str = "Quote accurately from a text"
    grade_level: str = "5"
    subject: str = "ELA"
    domain: str = "Reading Literature"


@dataclass
class MockCurriculumUnit:
    """Mock curriculum unit."""
    title: str = "Introduction to Fractions"
    unit_number: int = 1
    grade_level: str = "3"
    subject: str = "Math"
    standards: List[str] = field(default_factory=list)
    objectives: List[str] = field(default_factory=list)
    essential_questions: List[str] = field(default_factory=list)
    vocabulary: List[str] = field(default_factory=list)


@dataclass
class MockCurriculumDocument:
    """Mock curriculum document."""
    title: str = "Math Curriculum"
    subject: str = "Mathematics"
    grade_levels: List[str] = field(default_factory=lambda: ["3", "4", "5"])
    standards: List[MockCurriculumStandard] = field(default_factory=list)
    units: List[MockCurriculumUnit] = field(default_factory=list)
    scope_sequence: Dict[str, Any] = field(default_factory=dict)


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def client():
    """Create a test client for the FastAPI application."""
    from app.main import app
    return TestClient(app)


@pytest.fixture
def mock_iep_extractor():
    """Create a mock IEP extractor."""
    mock = MagicMock()
    
    mock_student = MockIEPStudent(date_of_birth=date(2014, 1, 15))
    mock_doc = MockIEPDocument(
        student=mock_student,
        iep_date=date(2025, 1, 15),
        goals=[MockIEPGoal()],
        accommodations=[MockIEPAccommodation()],
        services=[MockIEPService()],
        present_levels={"reading": "Currently at 3rd grade level"},
    )
    
    mock.extract_from_bytes.return_value = mock_doc
    return mock


@pytest.fixture
def mock_pdf_processor():
    """Create a mock PDF processor."""
    mock = MagicMock()
    mock.process_bytes.return_value = MockPDFContent()
    return mock


@pytest.fixture
def mock_curriculum_parser():
    """Create a mock curriculum parser."""
    mock = MagicMock()
    mock.parse.return_value = MockCurriculumDocument()
    return mock


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


@pytest.fixture
def sample_curriculum_text():
    """Sample curriculum document text for testing."""
    return """
    MATHEMATICS CURRICULUM GUIDE
    Grade 3-5 Scope and Sequence
    
    Standards Alignment: Common Core State Standards
    
    Unit 1: Introduction to Fractions
    Standards: CCSS.MATH.CONTENT.3.NF.A.1
    Objectives:
    - Understand fractions as parts of a whole
    - Compare fractions with same denominator
    
    Essential Questions:
    - What is a fraction?
    - How do fractions relate to wholes?
    """


@pytest.fixture
def sample_pdf_content():
    """Create sample PDF-like bytes for testing."""
    # Minimal PDF header (not a real PDF but enough for testing)
    return b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"


@pytest.fixture
def mock_llm_client():
    """Create a mock LLM client."""
    mock = MagicMock()
    mock.generate = AsyncMock(return_value="Generated response")
    return mock


@pytest.fixture
def mock_iep_extraction_service(mock_llm_client):
    """Create a mock IEP extraction service."""
    mock = MagicMock()
    mock.extract_and_validate = AsyncMock()
    mock.revalidate_goal = AsyncMock()
    mock.compare_goal_versions = AsyncMock()
    return mock


@pytest.fixture
def mock_smart_validation_result():
    """Create a mock SMART validation result."""
    return MagicMock(
        goal_number="1",
        goal_text="Test goal text",
        specific_score=0.8,
        specific_explanation="Clear target behavior identified",
        specific_suggestion=None,
        measurable_score=0.9,
        measurable_explanation="Quantifiable criteria present",
        measurable_suggestion=None,
        achievable_score=0.7,
        achievable_explanation="Appears realistic",
        achievable_suggestion="Consider adjusting baseline",
        relevant_score=0.85,
        relevant_explanation="Addresses identified needs",
        relevant_suggestion=None,
        timebound_score=0.95,
        timebound_explanation="Clear deadline specified",
        timebound_suggestion=None,
        overall_score=0.84,
        is_smart=True,
        recommendations=[],
    )

