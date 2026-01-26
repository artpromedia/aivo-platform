"""
Pytest fixtures for Vision Analysis Service tests.

Provides sample images, mock models, and test clients for testing
all vision analysis functionality.
"""
import base64
import io
from typing import Generator
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import Settings, get_settings
from app.main import app


# =============================================================================
# Settings Fixtures
# =============================================================================


def get_test_settings() -> Settings:
    """Get test settings with disabled model loading."""
    return Settings(
        PROJECT_NAME="Vision Analysis Service (Test)",
        DEVICE="cpu",
        LAZY_LOAD_MODELS=True,
    )


@pytest.fixture
def settings() -> Settings:
    """Provide test settings."""
    return get_test_settings()


# =============================================================================
# Client Fixtures
# =============================================================================


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Provide FastAPI test client."""
    app.dependency_overrides[get_settings] = get_test_settings
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# =============================================================================
# Sample Image Fixtures
# =============================================================================


@pytest.fixture
def sample_image_array() -> np.ndarray:
    """Create a simple test image as numpy array (BGR format)."""
    # Create a 200x100 white image with some black text-like regions
    image = np.ones((100, 200, 3), dtype=np.uint8) * 255

    # Add some black rectangles to simulate text
    image[20:30, 20:80] = 0  # Line 1
    image[40:50, 20:100] = 0  # Line 2
    image[60:70, 20:60] = 0  # Line 3

    return image


@pytest.fixture
def sample_image_grayscale() -> np.ndarray:
    """Create a simple grayscale test image."""
    image = np.ones((100, 200), dtype=np.uint8) * 255
    image[20:30, 20:80] = 0
    image[40:50, 20:100] = 0
    return image


@pytest.fixture
def sample_pil_image(sample_image_array: np.ndarray) -> Image.Image:
    """Create a PIL Image from sample array."""
    # Convert BGR to RGB
    rgb = sample_image_array[:, :, ::-1]
    return Image.fromarray(rgb)


@pytest.fixture
def sample_image_base64(sample_pil_image: Image.Image) -> str:
    """Create base64 encoded image string."""
    buffer = io.BytesIO()
    sample_pil_image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


@pytest.fixture
def sample_image_bytes(sample_pil_image: Image.Image) -> bytes:
    """Create image bytes for file upload."""
    buffer = io.BytesIO()
    sample_pil_image.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture
def sample_handwriting_image() -> np.ndarray:
    """Create an image simulating handwritten text."""
    image = np.ones((150, 300, 3), dtype=np.uint8) * 255

    # Simulate curved handwriting strokes
    for y in range(20, 140, 30):
        for x in range(20, 280):
            offset = int(5 * np.sin(x / 10))
            if 0 <= y + offset < 150:
                image[y + offset: y + offset + 3, x] = 0

    return image


@pytest.fixture
def sample_math_equation_image() -> np.ndarray:
    """Create an image simulating a math equation."""
    image = np.ones((80, 200, 3), dtype=np.uint8) * 255

    # Simulate "x^2 + 1" text regions
    image[30:45, 20:40] = 0  # x
    image[20:35, 45:55] = 0  # superscript 2
    image[35:40, 70:90] = 0  # +
    image[30:45, 100:120] = 0  # 1

    return image


@pytest.fixture
def sample_chart_image() -> np.ndarray:
    """Create an image simulating a bar chart."""
    image = np.ones((200, 300, 3), dtype=np.uint8) * 255

    # Draw axes
    image[180:185, 30:280] = 0  # X-axis
    image[20:185, 30:35] = 0  # Y-axis

    # Draw bars
    bar_colors = [(50, 50, 200), (50, 200, 50), (200, 50, 50)]
    bar_heights = [80, 120, 60]
    bar_width = 40
    bar_gap = 20

    for i, (color, height) in enumerate(zip(bar_colors, bar_heights)):
        x_start = 60 + i * (bar_width + bar_gap)
        y_start = 180 - height
        image[y_start:180, x_start:x_start + bar_width] = color

    return image


@pytest.fixture
def sample_document_image() -> np.ndarray:
    """Create an image simulating a document with perspective distortion."""
    image = np.ones((300, 400, 3), dtype=np.uint8) * 200

    # Add a white "document" region
    image[50:250, 80:320] = 255

    # Add some "text" lines on the document
    for y in range(70, 230, 20):
        line_length = np.random.randint(150, 220)
        image[y:y + 5, 100:100 + line_length] = 30

    return image


# =============================================================================
# Mock Model Fixtures
# =============================================================================


@pytest.fixture
def mock_handwriting_recognizer():
    """Create a mock handwriting recognizer."""
    from app.models.handwriting_recognition import RecognitionResult

    mock = MagicMock()
    mock.recognize.return_value = RecognitionResult(
        text="Hello World",
        confidence=0.95,
        model_used="mock",
        processing_time_ms=50,
        language="en",
    )
    mock.is_loaded.return_value = True
    return mock


@pytest.fixture
def mock_math_detector():
    """Create a mock math equation detector."""
    from app.models.math_equation_detector import EquationResult

    mock = MagicMock()
    mock.detect_equation.return_value = EquationResult(
        latex=r"x^2 + 1 = 0",
        confidence=0.92,
        model_used="mock",
        processing_time_ms=100,
    )
    mock.is_loaded.return_value = True
    return mock


@pytest.fixture
def mock_diagram_analyzer():
    """Create a mock diagram analyzer."""
    from app.models.diagram_analyzer import ChartType, DiagramAnalysisResult

    mock = MagicMock()
    mock.analyze.return_value = DiagramAnalysisResult(
        diagram_type=ChartType.BAR_CHART,
        confidence=0.88,
        description="A bar chart showing three data series",
        processing_time_ms=150,
    )
    mock.is_loaded.return_value = True
    return mock


@pytest.fixture
def mock_document_scanner():
    """Create a mock document scanner."""
    from app.models.document_scanner import ScanResult

    mock = MagicMock()
    mock.scan.return_value = ScanResult(
        enhanced_image=np.ones((200, 300, 3), dtype=np.uint8) * 255,
        rotation_angle=0.0,
        quality_score=0.9,
        processing_time_ms=80,
    )
    mock.is_loaded.return_value = True
    return mock


# =============================================================================
# Integration Test Fixtures
# =============================================================================


@pytest.fixture
def patched_models(
    mock_handwriting_recognizer,
    mock_math_detector,
    mock_diagram_analyzer,
    mock_document_scanner,
):
    """Patch all models for integration tests."""
    with patch("app.api.routes.handwriting_recognizer", mock_handwriting_recognizer), \
         patch("app.api.routes.math_detector", mock_math_detector), \
         patch("app.api.routes.diagram_analyzer", mock_diagram_analyzer), \
         patch("app.api.routes.document_scanner", mock_document_scanner):
        yield {
            "handwriting": mock_handwriting_recognizer,
            "math": mock_math_detector,
            "diagram": mock_diagram_analyzer,
            "document": mock_document_scanner,
        }


# =============================================================================
# Helper Functions
# =============================================================================


def create_test_image(
    width: int = 200,
    height: int = 100,
    channels: int = 3,
    background: int = 255,
) -> np.ndarray:
    """Create a test image with specified dimensions."""
    if channels == 1:
        return np.ones((height, width), dtype=np.uint8) * background
    return np.ones((height, width, channels), dtype=np.uint8) * background


def image_to_base64(image: np.ndarray) -> str:
    """Convert numpy array image to base64 string."""
    # Convert BGR to RGB if needed
    if len(image.shape) == 3:
        rgb = image[:, :, ::-1]
    else:
        rgb = image

    pil_image = Image.fromarray(rgb)
    buffer = io.BytesIO()
    pil_image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def base64_to_image(base64_str: str) -> np.ndarray:
    """Convert base64 string to numpy array image."""
    image_data = base64.b64decode(base64_str)
    pil_image = Image.open(io.BytesIO(image_data))
    return np.array(pil_image)
