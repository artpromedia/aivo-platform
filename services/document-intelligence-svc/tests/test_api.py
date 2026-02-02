"""
Comprehensive API tests for Document Intelligence Service.

Tests all endpoints with mocked extractors and services.
"""

import sys
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from io import BytesIO
from datetime import date, datetime

# Pre-patch modules before any imports
mock_modules = {
    "fitz": MagicMock(),
    "pytesseract": MagicMock(),
    "PIL": MagicMock(),
    "PIL.Image": MagicMock(),
    "spacy": MagicMock(),
    "transformers": MagicMock(),
}

# Apply module patches
for mod_name, mock_mod in mock_modules.items():
    if mod_name not in sys.modules:
        sys.modules[mod_name] = mock_mod

from fastapi.testclient import TestClient


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def mock_iep_document():
    """Create a mock IEP document result."""
    # Create mock student
    student = MagicMock()
    student.name = "John Doe"
    student.student_id = "12345"
    student.date_of_birth = date(2014, 1, 15)
    student.grade_level = "5"
    student.school = "Lincoln Elementary"
    student.disability_categories = ["Specific Learning Disability"]
    
    # Create mock goal
    goal = MagicMock()
    goal.goal_number = "1"
    goal.category = "academic"
    goal.domain = "reading"
    goal.baseline = "3rd grade reading level"
    goal.target = "4th grade reading level"
    goal.measurement = "Curriculum-based assessments"
    goal.timeline = "By end of IEP year"
    goal.accommodations = ["Extended time"]
    goal.benchmarks = ["Read 50 words per minute"]
    goal.confidence = 0.95
    
    # Create mock accommodation
    accommodation = MagicMock()
    accommodation.name = "Extended Time"
    accommodation.category = "timing"
    accommodation.description = "1.5x time on all tests"
    accommodation.applies_to = ["tests", "quizzes"]
    
    # Create mock service
    service = MagicMock()
    service.service_type = "Special Education"
    service.provider = "Special Education Teacher"
    service.minutes_per_week = 300
    service.location = "Resource Room"
    service.frequency = "Daily"
    
    # Create mock document
    doc = MagicMock()
    doc.student = student
    doc.iep_date = date(2025, 1, 15)
    doc.goals = [goal]
    doc.accommodations = [accommodation]
    doc.services = [service]
    doc.placement = "General Education with Resource"
    doc.present_levels = {"reading": "Currently at 3rd grade level"}
    doc.extraction_confidence = 0.92
    doc.extraction_warnings = []
    doc.page_count = 10
    
    return doc


@pytest.fixture
def mock_iep_extractor(mock_iep_document):
    """Create a mock IEP extractor."""
    mock = MagicMock()
    mock.extract_from_bytes.return_value = mock_iep_document
    return mock


@pytest.fixture
def mock_pdf_processor():
    """Create a mock PDF processor."""
    mock = MagicMock()
    
    result = MagicMock()
    result.text = "Sample extracted text from PDF document"
    result.page_count = 5
    result.has_images = False
    result.ocr_pages = []
    result.metadata = {"title": "Sample Document"}
    
    mock.process_bytes.return_value = result
    return mock


@pytest.fixture
def mock_curriculum_parser():
    """Create a mock curriculum parser."""
    mock = MagicMock()
    
    result = MagicMock()
    result.title = "Math Curriculum"
    result.subject = "Mathematics"
    result.grade_levels = ["3", "4", "5"]
    result.standards = []
    result.units = []
    result.scope_sequence = {}
    
    mock.parse.return_value = result
    return mock


@pytest.fixture
def sample_pdf_content():
    """Create sample PDF-like bytes."""
    return b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"


@pytest.fixture(scope="module")
def app_module():
    """Import app module once for all tests."""
    from app.main import app
    return app


@pytest.fixture
def client(app_module, mock_iep_extractor):
    """Create test client with mocked services."""
    app_module.state.iep_extractor = mock_iep_extractor
    return TestClient(app_module)


# =============================================================================
# Health Endpoint Tests
# =============================================================================


class TestHealthEndpoints:
    """Test health check endpoints."""

    def test_health_check(self, client):
        """Test basic health check."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "document-intelligence-svc"

    def test_readiness_check(self, client):
        """Test readiness check."""
        response = client.get("/ready")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "details" in data

    def test_root_endpoint(self, client):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "Document Intelligence Service"
        assert "endpoints" in data


# =============================================================================
# IEP Extraction Tests
# =============================================================================


class TestIEPExtraction:
    """Test IEP extraction endpoints."""

    def test_extract_iep_success(self, client, sample_pdf_content, mock_iep_extractor):
        """Test successful IEP extraction."""
        files = {"file": ("test.pdf", BytesIO(sample_pdf_content), "application/pdf")}
        
        response = client.post("/api/v1/extract/iep", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["student"]["name"] == "John Doe"
        assert len(data["goals"]) == 1
        assert data["goals"][0]["domain"] == "reading"

    def test_extract_iep_invalid_file_type(self, client):
        """Test IEP extraction with non-PDF file."""
        files = {"file": ("test.txt", BytesIO(b"Not a PDF"), "text/plain")}
        
        response = client.post("/api/v1/extract/iep", files=files)
        
        assert response.status_code == 400

    def test_extract_iep_file_too_large(self, client):
        """Test IEP extraction with oversized file."""
        # Create content larger than 50MB
        large_content = b"X" * (51 * 1024 * 1024)
        files = {"file": ("large.pdf", BytesIO(large_content), "application/pdf")}
        
        response = client.post("/api/v1/extract/iep", files=files)
        
        assert response.status_code == 400
        assert "50MB" in response.json()["detail"]

    def test_extract_iep_with_validation(self, client, sample_pdf_content):
        """Test IEP extraction with validation enabled."""
        files = {"file": ("test.pdf", BytesIO(sample_pdf_content), "application/pdf")}
        
        response = client.post(
            "/api/v1/extract/iep",
            files=files,
            params={"validate": True},
        )
        
        assert response.status_code == 200


# =============================================================================
# Curriculum Parsing Tests
# =============================================================================


class TestCurriculumParsing:
    """Test curriculum parsing endpoints."""

    @patch("app.api.routes.CurriculumParser")
    @patch("app.api.routes.PDFProcessor")
    def test_extract_curriculum_pdf(
        self, mock_pdf_class, mock_parser_class, client, sample_pdf_content
    ):
        """Test curriculum extraction from PDF."""
        # Setup mocks
        mock_pdf_instance = MagicMock()
        mock_pdf_instance.process_bytes.return_value = MagicMock(text="Curriculum content")
        mock_pdf_class.return_value = mock_pdf_instance
        
        mock_parser_instance = MagicMock()
        mock_parser_instance.parse.return_value = MagicMock(
            title="Math Curriculum",
            subject="Math",
            grade_levels=["3"],
            standards=[],
            units=[],
            scope_sequence={},
        )
        mock_parser_class.return_value = mock_parser_instance
        
        files = {"file": ("curriculum.pdf", BytesIO(sample_pdf_content), "application/pdf")}
        
        response = client.post("/api/v1/extract/curriculum", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["title"] == "Math Curriculum"

    @patch("app.api.routes.CurriculumParser")
    def test_extract_curriculum_text(self, mock_parser_class, client):
        """Test curriculum extraction from text file."""
        mock_parser_instance = MagicMock()
        mock_parser_instance.parse.return_value = MagicMock(
            title="Reading Standards",
            subject="Reading",
            grade_levels=["K", "1", "2"],
            standards=[],
            units=[],
            scope_sequence={},
        )
        mock_parser_class.return_value = mock_parser_instance
        
        text_content = b"Common Core Standards: Reading"
        files = {"file": ("standards.txt", BytesIO(text_content), "text/plain")}
        
        response = client.post("/api/v1/extract/curriculum", files=files)
        
        assert response.status_code == 200


# =============================================================================
# PDF Extraction Tests
# =============================================================================


class TestPDFExtraction:
    """Test PDF text extraction endpoints."""

    @patch("app.api.routes.PDFProcessor")
    def test_extract_pdf_success(self, mock_pdf_class, client, sample_pdf_content):
        """Test successful PDF text extraction."""
        mock_instance = MagicMock()
        mock_instance.process_bytes.return_value = MagicMock(
            text="Extracted text content",
            page_count=3,
            has_images=True,
            ocr_pages=[2],
            metadata={"author": "Test Author"},
        )
        mock_pdf_class.return_value = mock_instance
        
        files = {"file": ("document.pdf", BytesIO(sample_pdf_content), "application/pdf")}
        
        response = client.post("/api/v1/extract/pdf", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["text"] == "Extracted text content"
        assert data["page_count"] == 3

    def test_extract_pdf_invalid_file_type(self, client):
        """Test PDF extraction with non-PDF file."""
        files = {"file": ("document.docx", BytesIO(b"Not a PDF"), "application/vnd.openxmlformats")}
        
        response = client.post("/api/v1/extract/pdf", files=files)
        
        assert response.status_code == 400


# =============================================================================
# Document Classification Tests
# =============================================================================


class TestDocumentClassification:
    """Test document classification endpoint."""

    def test_classify_iep_document(self, client):
        """Test classification of IEP document."""
        response = client.post(
            "/api/v1/classify",
            json={"text": "This is an Individualized Education Program (IEP) for a student with special education needs and accommodations."},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["document_type"] == "iep"
        assert data["confidence"] > 0

    def test_classify_curriculum_document(self, client):
        """Test classification of curriculum document."""
        response = client.post(
            "/api/v1/classify",
            json={"text": "Curriculum standards and scope and sequence for learning objectives based on CCSS."},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["document_type"] == "curriculum"

    def test_classify_assessment_document(self, client):
        """Test classification of assessment document."""
        response = client.post(
            "/api/v1/classify",
            json={"text": "Assessment test quiz for evaluation with rubric and score."},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["document_type"] == "assessment"

    def test_classify_progress_report(self, client):
        """Test classification of progress report."""
        response = client.post(
            "/api/v1/classify",
            json={"text": "Progress report showing academic progress and grade report for the student."},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["document_type"] == "progress_report"

    def test_classify_unknown_document(self, client):
        """Test classification of unrecognized document."""
        response = client.post(
            "/api/v1/classify",
            json={"text": "Random text without educational keywords."},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["document_type"] == "other"


# =============================================================================
# AI-Powered IEP Extraction Tests
# =============================================================================


class TestAIIEPExtraction:
    """Test AI-powered IEP extraction endpoints."""

    @patch("app.api.routes.IEPExtractionService")
    def test_extract_iep_ai_success(self, mock_service_class, client, sample_pdf_content):
        """Test successful AI IEP extraction."""
        # Setup mock service
        mock_service = MagicMock()
        
        # Create mock extraction result
        mock_extraction = MagicMock()
        mock_extraction.document_id = "doc-123"
        mock_extraction.goals = []
        mock_extraction.services = []
        mock_extraction.accommodations = []
        mock_extraction.present_levels = []
        mock_extraction.iep_date = date(2025, 1, 15)
        mock_extraction.annual_review_date = None
        mock_extraction.eligibility_category = "SLD"
        mock_extraction.placement = "General Education"
        mock_extraction.total_pages = 10
        mock_extraction.overall_confidence = 0.9
        mock_extraction.extraction_warnings = []
        
        mock_service.extract_and_validate = AsyncMock(return_value={
            "extraction": mock_extraction,
            "goal_validations": [],
            "quality_analysis": None,
            "processing_time_ms": 1500,
        })
        mock_service_class.return_value = mock_service
        
        files = {"file": ("test.pdf", BytesIO(sample_pdf_content), "application/pdf")}
        
        response = client.post("/api/v1/extract/iep/ai", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["document_id"] == "doc-123"

    def test_extract_iep_ai_invalid_file(self, client):
        """Test AI IEP extraction with invalid file."""
        files = {"file": ("test.txt", BytesIO(b"Not PDF"), "text/plain")}
        
        response = client.post("/api/v1/extract/iep/ai", files=files)
        
        assert response.status_code == 400


# =============================================================================
# Goal Validation Tests
# =============================================================================


class TestGoalValidation:
    """Test goal validation endpoints."""

    @patch("app.api.routes.IEPExtractionService")
    def test_validate_goal_success(self, mock_service_class, client):
        """Test successful goal validation."""
        mock_service = MagicMock()
        mock_result = MagicMock(
            goal_number="1",
            goal_text="Test goal",
            specific_score=0.8,
            specific_explanation="Clear target behavior",
            specific_suggestion=None,
            measurable_score=0.9,
            measurable_explanation="Quantifiable",
            measurable_suggestion=None,
            achievable_score=0.7,
            achievable_explanation="Realistic",
            achievable_suggestion="Consider baseline",
            relevant_score=0.85,
            relevant_explanation="Addresses needs",
            relevant_suggestion=None,
            timebound_score=0.95,
            timebound_explanation="Clear deadline",
            timebound_suggestion=None,
            overall_score=0.84,
            is_smart=True,
            recommendations=[],
        )
        mock_service.revalidate_goal = AsyncMock(return_value=mock_result)
        mock_service_class.return_value = mock_service
        
        response = client.post(
            "/api/v1/validate/goal",
            json={
                "goal_text": "By end of year, student will read at 4th grade level with 80% accuracy.",
                "baseline": "Currently at 3rd grade level",
                "target": "4th grade level",
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_smart"] is True
        assert data["overall_score"] > 0.8

    @patch("app.api.routes.IEPExtractionService")
    def test_compare_goal_versions(self, mock_service_class, client):
        """Test goal version comparison."""
        mock_service = MagicMock()
        
        original_validation = MagicMock(overall_score=0.6, is_smart=False)
        revised_validation = MagicMock(overall_score=0.85, is_smart=True)
        
        mock_service.compare_goal_versions = AsyncMock(return_value={
            "original": {
                "text": "Original goal text",
                "validation": original_validation,
            },
            "revised": {
                "text": "Revised goal text",
                "validation": revised_validation,
            },
            "improvements": ["Added measurable criteria"],
            "improved_criteria": ["measurable", "specific"],
            "declined_criteria": [],
            "overall_improved": True,
        })
        mock_service_class.return_value = mock_service
        
        response = client.post(
            "/api/v1/validate/goal/compare",
            json={
                "original_goal_text": "Student will improve reading.",
                "revised_goal_text": "By June 2025, student will improve reading fluency from 60 to 90 wpm.",
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["overall_improved"] is True
        assert data["revised"]["is_smart"] is True


# =============================================================================
# Batch Processing Tests
# =============================================================================


class TestBatchProcessing:
    """Test batch processing endpoints."""

    def test_batch_extraction_iep(self, client, sample_pdf_content, mock_iep_extractor):
        """Test batch IEP extraction."""
        files = [
            ("files", ("doc1.pdf", BytesIO(sample_pdf_content), "application/pdf")),
            ("files", ("doc2.pdf", BytesIO(sample_pdf_content), "application/pdf")),
        ]
        
        response = client.post(
            "/api/v1/extract/batch",
            files=files,
            params={"document_type": "iep"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert data["successful"] == 2

    def test_batch_extraction_too_many_files(self, client, sample_pdf_content):
        """Test batch extraction with too many files."""
        files = [
            ("files", (f"doc{i}.pdf", BytesIO(sample_pdf_content), "application/pdf"))
            for i in range(11)
        ]
        
        response = client.post(
            "/api/v1/extract/batch",
            files=files,
        )
        
        assert response.status_code == 400
        assert "10 files" in response.json()["detail"]

    @patch("app.api.routes.CurriculumParser")
    @patch("app.api.routes.PDFProcessor")
    def test_batch_extraction_curriculum(
        self, mock_pdf_class, mock_parser_class, client, sample_pdf_content
    ):
        """Test batch curriculum extraction."""
        mock_pdf_instance = MagicMock()
        mock_pdf_instance.process_bytes.return_value = MagicMock(text="Curriculum")
        mock_pdf_class.return_value = mock_pdf_instance
        
        mock_parser_instance = MagicMock()
        mock_parser_instance.parse.return_value = MagicMock(
            title="Curriculum",
            standards=[],
        )
        mock_parser_class.return_value = mock_parser_instance
        
        files = [
            ("files", ("curriculum.pdf", BytesIO(sample_pdf_content), "application/pdf")),
        ]
        
        response = client.post(
            "/api/v1/extract/batch",
            files=files,
            params={"document_type": "curriculum"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1


# =============================================================================
# Error Handling Tests
# =============================================================================


class TestErrorHandling:
    """Test error handling across endpoints."""

    @patch("app.api.routes.IEPExtractor")
    def test_extraction_error_handling(self, mock_extractor_class, client, sample_pdf_content):
        """Test error handling during extraction."""
        mock_extractor = MagicMock()
        mock_extractor.extract_from_bytes.side_effect = ValueError("Invalid IEP format")
        mock_extractor_class.return_value = mock_extractor
        
        # Reset app state to use new mock
        from app.main import app
        app.state.iep_extractor = mock_extractor
        
        files = {"file": ("test.pdf", BytesIO(sample_pdf_content), "application/pdf")}
        
        response = client.post("/api/v1/extract/iep", files=files)
        
        assert response.status_code == 422
        assert "Invalid IEP format" in response.json()["detail"]

    def test_missing_required_field(self, client):
        """Test error when required field is missing."""
        response = client.post("/api/v1/classify", json={})
        
        assert response.status_code == 422


# =============================================================================
# Integration Tests
# =============================================================================


class TestIntegration:
    """Integration tests for document processing flow."""

    def test_full_iep_workflow(self, client, sample_pdf_content, mock_iep_extractor):
        """Test complete IEP processing workflow."""
        # 1. Extract IEP
        files = {"file": ("iep.pdf", BytesIO(sample_pdf_content), "application/pdf")}
        extract_response = client.post("/api/v1/extract/iep", files=files)
        
        assert extract_response.status_code == 200
        iep_data = extract_response.json()
        
        # 2. Verify classification
        classify_response = client.post(
            "/api/v1/classify",
            json={"text": "individualized education program accommodations special education"},
        )
        
        assert classify_response.status_code == 200
        assert classify_response.json()["document_type"] == "iep"

    def test_classification_extraction_consistency(self, client, sample_pdf_content, mock_iep_extractor):
        """Test consistency between classification and extraction."""
        # First classify
        classify_response = client.post(
            "/api/v1/classify",
            json={"text": "IEP special education goals accommodations"},
        )
        
        doc_type = classify_response.json()["document_type"]
        assert doc_type == "iep"
        
        # Then extract as classified type
        files = {"file": ("doc.pdf", BytesIO(sample_pdf_content), "application/pdf")}
        extract_response = client.post("/api/v1/extract/iep", files=files)
        
        assert extract_response.status_code == 200
