"""
Tests for Vision Analysis Service API endpoints.

Tests cover:
- Health endpoints
- Handwriting OCR endpoints
- Math equation recognition
- Diagram analysis
- Document scanning
"""
import pytest
from fastapi.testclient import TestClient

from tests.conftest import image_to_base64


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_health_endpoint(self, client: TestClient):
        """Test basic health check."""
        response = client.get("/health")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "vision-analysis-svc"
        assert "version" in data

    def test_liveness_endpoint(self, client: TestClient):
        """Test liveness check."""
        response = client.get("/health/live")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "alive"

    def test_readiness_endpoint(self, client: TestClient):
        """Test readiness check."""
        response = client.get("/health/ready")
        assert response.status_code == 200

        data = response.json()
        assert "status" in data
        assert "models_loaded" in data

    def test_metrics_endpoint(self, client: TestClient):
        """Test metrics endpoint."""
        response = client.get("/metrics")
        assert response.status_code == 200

        data = response.json()
        assert data["service"] == "vision-analysis-svc"
        assert "settings" in data


class TestHandwritingOCR:
    """Tests for handwriting OCR endpoints."""

    def test_ocr_handwriting_valid_request(
        self,
        client: TestClient,
        sample_image_base64: str,
        patched_models,
    ):
        """Test handwriting OCR with valid base64 image."""
        response = client.post(
            "/api/v1/ocr/handwriting",
            json={"image_base64": sample_image_base64},
        )
        assert response.status_code == 200

        data = response.json()
        assert "text" in data
        assert "confidence" in data
        assert data["text"] == "Hello World"

    def test_ocr_handwriting_invalid_base64(self, client: TestClient, patched_models):
        """Test handwriting OCR with invalid base64."""
        response = client.post(
            "/api/v1/ocr/handwriting",
            json={"image_base64": "not-valid-base64!!!"},
        )
        assert response.status_code == 400

    def test_ocr_handwriting_upload(
        self,
        client: TestClient,
        sample_image_bytes: bytes,
        patched_models,
    ):
        """Test handwriting OCR with file upload."""
        response = client.post(
            "/api/v1/ocr/handwriting/upload",
            files={"file": ("test.png", sample_image_bytes, "image/png")},
        )
        assert response.status_code == 200

        data = response.json()
        assert "text" in data


class TestMathRecognition:
    """Tests for math equation recognition endpoints."""

    def test_math_recognize_valid_request(
        self,
        client: TestClient,
        sample_math_equation_image,
        patched_models,
    ):
        """Test math recognition with valid image."""
        base64_image = image_to_base64(sample_math_equation_image)

        response = client.post(
            "/api/v1/math/recognize",
            json={"image_base64": base64_image},
        )
        assert response.status_code == 200

        data = response.json()
        assert "latex" in data
        assert "confidence" in data

    def test_math_recognize_empty_request(self, client: TestClient, patched_models):
        """Test math recognition with empty request."""
        response = client.post(
            "/api/v1/math/recognize",
            json={},
        )
        assert response.status_code == 422  # Validation error


class TestDiagramAnalysis:
    """Tests for diagram analysis endpoints."""

    def test_diagram_analyze_valid_request(
        self,
        client: TestClient,
        sample_chart_image,
        patched_models,
    ):
        """Test diagram analysis with valid chart image."""
        base64_image = image_to_base64(sample_chart_image)

        response = client.post(
            "/api/v1/diagram/analyze",
            json={"image_base64": base64_image},
        )
        assert response.status_code == 200

        data = response.json()
        assert "diagram_type" in data
        assert "confidence" in data


class TestDocumentScanning:
    """Tests for document scanning endpoints."""

    def test_document_scan_valid_request(
        self,
        client: TestClient,
        sample_document_image,
        patched_models,
    ):
        """Test document scanning with valid document image."""
        base64_image = image_to_base64(sample_document_image)

        response = client.post(
            "/api/v1/document/scan",
            json={"image_base64": base64_image},
        )
        assert response.status_code == 200

        data = response.json()
        assert "enhanced_image_base64" in data
        assert "quality_score" in data


class TestHomeworkAnalysis:
    """Tests for combined homework analysis endpoint."""

    def test_homework_analyze_valid_request(
        self,
        client: TestClient,
        sample_handwriting_image,
        patched_models,
    ):
        """Test homework analysis with valid image."""
        base64_image = image_to_base64(sample_handwriting_image)

        response = client.post(
            "/api/v1/analyze/homework",
            json={
                "image_base64": base64_image,
                "analyze_text": True,
                "analyze_math": True,
                "analyze_diagrams": False,
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert "text_content" in data or "handwriting" in data


class TestImagePreprocessor:
    """Tests for image preprocessing functionality."""

    def test_preprocess_image_resize(self, sample_image_array):
        """Test image resizing."""
        from app.services.image_preprocessor import ImagePreprocessor

        preprocessor = ImagePreprocessor()
        result = preprocessor.resize(sample_image_array, width=100, height=50)

        assert result.shape[0] == 50
        assert result.shape[1] == 100

    def test_preprocess_image_grayscale(self, sample_image_array):
        """Test grayscale conversion."""
        from app.services.image_preprocessor import ImagePreprocessor

        preprocessor = ImagePreprocessor()
        result = preprocessor.to_grayscale(sample_image_array)

        assert len(result.shape) == 2  # Grayscale has no channel dimension

    def test_preprocess_for_ocr(self, sample_image_array):
        """Test OCR preprocessing pipeline."""
        from app.services.image_preprocessor import ImagePreprocessor

        preprocessor = ImagePreprocessor()
        result = preprocessor.preprocess_for_ocr(sample_image_array)

        assert result is not None
        assert result.dtype == sample_image_array.dtype


class TestBoundingBox:
    """Tests for bounding box utilities."""

    def test_bounding_box_to_tuple(self):
        """Test bounding box tuple conversion."""
        from app.models.handwriting_recognition import BoundingBox

        bbox = BoundingBox(x=10, y=20, width=100, height=50)
        assert bbox.to_tuple() == (10, 20, 100, 50)

    def test_bounding_box_to_points(self):
        """Test bounding box corner points."""
        from app.models.handwriting_recognition import BoundingBox

        bbox = BoundingBox(x=10, y=20, width=100, height=50)
        points = bbox.to_points()

        assert len(points) == 4
        assert points[0] == (10, 20)  # Top-left
        assert points[2] == (110, 70)  # Bottom-right

    def test_bounding_box_from_points(self):
        """Test creating bounding box from points."""
        from app.models.handwriting_recognition import BoundingBox

        points = [(10, 20), (110, 20), (110, 70), (10, 70)]
        bbox = BoundingBox.from_points(points)

        assert bbox.x == 10
        assert bbox.y == 20
        assert bbox.width == 100
        assert bbox.height == 50
