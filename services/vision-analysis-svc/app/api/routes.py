"""
API Routes for Vision Analysis Service.

Provides REST endpoints for:
- Handwriting OCR
- Math equation recognition
- Diagram analysis
- Document scanning
- Combined homework analysis
"""

import base64
import io
import logging
import time
from typing import Any, Dict, Optional

import cv2
import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image

from app.core.config import Settings
from app.models.diagram_analyzer import DiagramAnalyzer, DiagramAnalyzerConfig
from app.models.document_scanner import DocumentScanner, DocumentScannerConfig
from app.models.handwriting_recognition import (
    HandwritingRecognizer,
    HandwritingRecognizerConfig,
)
from app.models.math_equation_detector import (
    MathEquationDetector,
    MathEquationDetectorConfig,
)
from app.schemas.requests import (
    BoundingBoxSchema,
    ChartDataSchema,
    ContentRegionSchema,
    DataPointSchema,
    DiagramAnalyzeRequest,
    DiagramAnalyzeResponse,
    DocumentScanRequest,
    DocumentScanResponse,
    EquationResultSchema,
    HandwritingOCRRequest,
    HandwritingOCRResponse,
    HomeworkAnalyzeRequest,
    HomeworkAnalyzeResponse,
    LineResultSchema,
    MathRecognizeRequest,
    MathRecognizeResponse,
    WordPositionSchema,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["vision"])

# Global model instances
_handwriting_recognizer: Optional[HandwritingRecognizer] = None
_math_detector: Optional[MathEquationDetector] = None
_diagram_analyzer: Optional[DiagramAnalyzer] = None
_document_scanner: Optional[DocumentScanner] = None


def init_components(settings: Settings) -> None:
    """Initialize all model components."""
    global _handwriting_recognizer, _math_detector, _diagram_analyzer, _document_scanner

    logger.info("Initializing vision analysis components...")

    # Handwriting recognizer
    hw_config = HandwritingRecognizerConfig(
        primary_model=settings.TROCR_MODEL,
        device=settings.DEVICE,
        supported_languages=settings.EASYOCR_LANGUAGES,
        confidence_threshold=settings.OCR_CONFIDENCE_THRESHOLD,
    )
    _handwriting_recognizer = HandwritingRecognizer(hw_config)

    # Math equation detector
    math_config = MathEquationDetectorConfig(
        model_name=settings.LATEX_OCR_MODEL,
        device=settings.DEVICE,
        max_resolution=settings.MAX_EQUATION_RESOLUTION,
    )
    _math_detector = MathEquationDetector(math_config)

    # Diagram analyzer
    diagram_config = DiagramAnalyzerConfig(
        chart_detection_model=settings.CHART_DETECTION_MODEL,
        enable_ocr=settings.ENABLE_DIAGRAM_OCR,
        device=settings.DEVICE,
    )
    _diagram_analyzer = DiagramAnalyzer(diagram_config)

    # Document scanner
    scanner_config = DocumentScannerConfig(
        auto_enhance=settings.SCANNER_AUTO_ENHANCE,
        denoise_strength=settings.SCANNER_DENOISE_STRENGTH,
        contrast_method=settings.SCANNER_CONTRAST_METHOD,
    )
    _document_scanner = DocumentScanner(scanner_config)

    logger.info("All vision analysis components initialized")


def _decode_image(image_base64: str) -> np.ndarray:
    """Decode base64 image to numpy array."""
    try:
        # Remove data URL prefix if present
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]

        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))

        # Convert to RGB if needed
        if image.mode == "RGBA":
            image = image.convert("RGB")
        elif image.mode == "L":
            image = image.convert("RGB")

        # Convert to OpenCV format (BGR)
        return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to decode image: {str(e)}"
        )


def _encode_image(image: np.ndarray, format: str = "png") -> str:
    """Encode numpy array to base64 string."""
    # Convert BGR to RGB
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(rgb)

    buffer = io.BytesIO()
    pil_image.save(buffer, format=format.upper())
    buffer.seek(0)

    return base64.b64encode(buffer.read()).decode("utf-8")


# =============================================================================
# Handwriting OCR Endpoints
# =============================================================================


@router.post("/ocr/handwriting", response_model=HandwritingOCRResponse)
async def recognize_handwriting(request: HandwritingOCRRequest) -> HandwritingOCRResponse:
    """
    Recognize handwritten text from an image.

    Returns extracted text with confidence scores.
    """
    if _handwriting_recognizer is None:
        raise HTTPException(status_code=503, detail="Handwriting recognizer not initialized")

    if not request.image_base64 and not request.image_url:
        raise HTTPException(status_code=400, detail="Either image_base64 or image_url is required")

    # Decode image
    if request.image_base64:
        image = _decode_image(request.image_base64)
    else:
        raise HTTPException(status_code=400, detail="image_url not yet supported")

    # Process based on requested output
    lines = None
    words = None

    if request.return_positions:
        result = _handwriting_recognizer.recognize_with_positions(image, request.language)
        text = result.full_text
        confidence = result.average_confidence

        words = [
            WordPositionSchema(
                word=w.word,
                confidence=w.confidence,
                bounding_box=BoundingBoxSchema(
                    x=w.bounding_box.x,
                    y=w.bounding_box.y,
                    width=w.bounding_box.width,
                    height=w.bounding_box.height
                )
            )
            for w in result.words
        ]

        lines = [
            LineResultSchema(
                text=ln.text,
                confidence=ln.confidence,
                bounding_box=BoundingBoxSchema(
                    x=ln.bounding_box.x,
                    y=ln.bounding_box.y,
                    width=ln.bounding_box.width,
                    height=ln.bounding_box.height
                ),
                line_number=ln.line_number
            )
            for ln in result.lines
        ]

        processing_time = result.processing_time_ms
        model_used = "mixed"

    elif request.return_lines:
        line_results = _handwriting_recognizer.recognize_lines(image, request.language)
        text = " ".join(ln.text for ln in line_results)
        confidence = sum(ln.confidence for ln in line_results) / len(line_results) if line_results else 0.0

        lines = [
            LineResultSchema(
                text=ln.text,
                confidence=ln.confidence,
                bounding_box=BoundingBoxSchema(
                    x=ln.bounding_box.x,
                    y=ln.bounding_box.y,
                    width=ln.bounding_box.width,
                    height=ln.bounding_box.height
                ),
                line_number=ln.line_number
            )
            for ln in line_results
        ]

        processing_time = 0  # Not tracked for line-by-line
        model_used = "trocr"

    else:
        result = _handwriting_recognizer.recognize(image, request.language)
        text = result.text
        confidence = result.confidence
        processing_time = result.processing_time_ms
        model_used = result.model_used

    return HandwritingOCRResponse(
        text=text,
        confidence=confidence,
        model_used=model_used,
        lines=lines,
        words=words,
        processing_time_ms=processing_time
    )


@router.post("/ocr/handwriting/upload", response_model=HandwritingOCRResponse)
async def ocr_handwriting_upload(
    file: UploadFile = File(...),
    language: str = "en",
    return_positions: bool = False,
) -> HandwritingOCRResponse:
    """Recognize handwriting from uploaded file."""
    if _handwriting_recognizer is None:
        raise HTTPException(status_code=503, detail="Handwriting recognizer not initialized")

    # Read file
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    if image.mode == "RGBA":
        image = image.convert("RGB")

    np_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

    # Process
    if return_positions:
        result = _handwriting_recognizer.recognize_with_positions(np_image, language)
        return HandwritingOCRResponse(
            text=result.full_text,
            confidence=result.average_confidence,
            model_used="mixed",
            words=[
                WordPositionSchema(
                    word=w.word,
                    confidence=w.confidence,
                    bounding_box=BoundingBoxSchema(
                        x=w.bounding_box.x,
                        y=w.bounding_box.y,
                        width=w.bounding_box.width,
                        height=w.bounding_box.height
                    )
                )
                for w in result.words
            ],
            processing_time_ms=result.processing_time_ms
        )
    else:
        result = _handwriting_recognizer.recognize(np_image, language)
        return HandwritingOCRResponse(
            text=result.text,
            confidence=result.confidence,
            model_used=result.model_used,
            processing_time_ms=result.processing_time_ms
        )


# =============================================================================
# Math Recognition Endpoints
# =============================================================================


@router.post("/math/recognize", response_model=MathRecognizeResponse)
async def recognize_math(request: MathRecognizeRequest) -> MathRecognizeResponse:
    """
    Recognize mathematical equations from an image.

    Returns LaTeX representation.
    """
    if _math_detector is None:
        raise HTTPException(status_code=503, detail="Math detector not initialized")

    image = _decode_image(request.image_base64)

    if request.detect_multiple:
        # Detect all equations in document
        doc_content = _math_detector.extract_from_document(image)

        equations = [
            EquationResultSchema(
                latex=eq.latex,
                confidence=eq.confidence,
                bounding_box=BoundingBoxSchema(
                    x=eq.bounding_box.x,
                    y=eq.bounding_box.y,
                    width=eq.bounding_box.width,
                    height=eq.bounding_box.height
                ) if eq.bounding_box else None,
                equation_type=eq.equation_type,
                symbols_detected=eq.symbols_detected,
                is_valid=eq.is_valid,
                validation_message=eq.validation_message
            )
            for eq in doc_content.equations
        ]

        full_latex = " \\\\ ".join(eq.latex for eq in doc_content.equations)

        return MathRecognizeResponse(
            equations=equations,
            full_latex=full_latex,
            equation_count=doc_content.equation_count,
            has_matrices=doc_content.has_matrices,
            has_fractions=doc_content.has_fractions,
            complexity_score=doc_content.complexity_score,
            processing_time_ms=doc_content.processing_time_ms
        )

    else:
        # Single equation
        result = _math_detector.detect_equation(image)

        equation = EquationResultSchema(
            latex=result.latex,
            confidence=result.confidence,
            bounding_box=BoundingBoxSchema(
                x=result.bounding_box.x,
                y=result.bounding_box.y,
                width=result.bounding_box.width,
                height=result.bounding_box.height
            ) if result.bounding_box else None,
            equation_type=result.equation_type,
            symbols_detected=result.symbols_detected,
            is_valid=result.is_valid,
            validation_message=result.validation_message
        )

        return MathRecognizeResponse(
            equations=[equation],
            full_latex=result.latex,
            equation_count=1,
            has_matrices="matrix" in result.equation_type,
            has_fractions=result.equation_type == "fraction",
            complexity_score=0.5,
            processing_time_ms=0
        )


# =============================================================================
# Diagram Analysis Endpoints
# =============================================================================


@router.post("/diagram/analyze", response_model=DiagramAnalyzeResponse)
async def analyze_diagram(request: DiagramAnalyzeRequest) -> DiagramAnalyzeResponse:
    """
    Analyze a diagram, chart, or graph.

    Returns structured understanding of the visual.
    """
    if _diagram_analyzer is None:
        raise HTTPException(status_code=503, detail="Diagram analyzer not initialized")

    image = _decode_image(request.image_base64)

    # Analyze diagram
    result = _diagram_analyzer.analyze(image)

    # Convert data points
    data_points = [
        DataPointSchema(
            label=dp.label,
            value=dp.value,
            x=dp.x,
            y=dp.y,
            category=dp.category
        )
        for dp in result.data_points
    ]

    # Convert chart data if available
    chart_data = None
    if result.chart_data:
        chart_data = ChartDataSchema(
            chart_type=result.chart_data.chart_type,
            title=result.chart_data.title,
            x_axis_label=result.chart_data.x_axis_label,
            y_axis_label=result.chart_data.y_axis_label,
            legend=result.chart_data.legend,
            data_points=[
                DataPointSchema(
                    label=dp.label,
                    value=dp.value,
                    x=dp.x,
                    y=dp.y,
                    category=dp.category
                )
                for dp in result.chart_data.data_points
            ]
        )

    return DiagramAnalyzeResponse(
        diagram_type=result.diagram_type.value,
        confidence=result.confidence,
        title=result.title,
        description=result.description,
        extracted_data=chart_data,
        data_points=data_points,
        shape_count=len(result.geometric_shapes) if result.geometric_shapes else 0,
        processing_time_ms=result.processing_time_ms
    )


# =============================================================================
# Document Scanner Endpoints
# =============================================================================


@router.post("/document/scan", response_model=DocumentScanResponse)
async def scan_document(request: DocumentScanRequest) -> DocumentScanResponse:
    """
    Scan and enhance a document photo.

    Returns processed, cleaned-up document image.
    """
    if _document_scanner is None:
        raise HTTPException(status_code=503, detail="Document scanner not initialized")

    image = _decode_image(request.image_base64)

    # Scan document
    result = _document_scanner.scan(image, auto_enhance=request.auto_enhance)

    # Encode processed image
    processed_base64 = _encode_image(result.processed_image, request.output_format)

    # Calculate quality improvement
    original_quality = _document_scanner._estimate_quality(result.original_image)
    quality_improvement = (result.quality_score - original_quality) * 100

    # Convert bounds
    bounds = None
    if result.detected_bounds:
        bounds = [{"x": p.x, "y": p.y} for p in result.detected_bounds]

    return DocumentScanResponse(
        processed_image_base64=processed_base64,
        quality_score=result.quality_score,
        quality_improvement=quality_improvement,
        operations_applied=result.enhancements_applied,
        detected_bounds=bounds,
        rotation_applied=result.rotation_applied,
        processing_time_ms=result.processing_time_ms
    )


# =============================================================================
# Combined Homework Analysis Endpoint
# =============================================================================


@router.post("/analyze/homework", response_model=HomeworkAnalyzeResponse)
async def analyze_homework(request: HomeworkAnalyzeRequest) -> HomeworkAnalyzeResponse:
    """
    Combined analysis for homework photos.

    Extracts text, math equations, and diagrams from a single image.
    """
    start_time = time.time()

    image = _decode_image(request.image_base64)

    content_regions: list[ContentRegionSchema] = []
    extracted_text = ""
    extracted_math: list[EquationResultSchema] = []
    diagrams: list[Dict[str, Any]] = []

    # Extract text
    if _handwriting_recognizer and request.expected_content in ("text", "mixed"):
        try:
            text_result = _handwriting_recognizer.recognize_with_positions(image)
            extracted_text = text_result.full_text

            for line in text_result.lines:
                content_regions.append(ContentRegionSchema(
                    region_type="text",
                    bounding_box=BoundingBoxSchema(
                        x=line.bounding_box.x,
                        y=line.bounding_box.y,
                        width=line.bounding_box.width,
                        height=line.bounding_box.height
                    ),
                    content=line.text,
                    confidence=line.confidence
                ))
        except Exception as e:
            logger.warning(f"Text extraction failed: {e}")

    # Extract math
    if _math_detector and request.expected_content in ("math", "mixed"):
        try:
            math_content = _math_detector.extract_from_document(image)

            for eq in math_content.equations:
                extracted_math.append(EquationResultSchema(
                    latex=eq.latex,
                    confidence=eq.confidence,
                    bounding_box=BoundingBoxSchema(
                        x=eq.bounding_box.x,
                        y=eq.bounding_box.y,
                        width=eq.bounding_box.width,
                        height=eq.bounding_box.height
                    ) if eq.bounding_box else None,
                    equation_type=eq.equation_type,
                    symbols_detected=eq.symbols_detected,
                    is_valid=eq.is_valid
                ))

                if eq.bounding_box:
                    content_regions.append(ContentRegionSchema(
                        region_type="math",
                        bounding_box=BoundingBoxSchema(
                            x=eq.bounding_box.x,
                            y=eq.bounding_box.y,
                            width=eq.bounding_box.width,
                            height=eq.bounding_box.height
                        ),
                        content=eq.latex,
                        confidence=eq.confidence
                    ))
        except Exception as e:
            logger.warning(f"Math extraction failed: {e}")

    # Analyze diagrams
    if _diagram_analyzer and request.expected_content in ("diagram", "mixed"):
        try:
            diagram_result = _diagram_analyzer.analyze(image)

            if diagram_result.diagram_type.value != "unknown":
                diagrams.append({
                    "type": diagram_result.diagram_type.value,
                    "description": diagram_result.description,
                    "confidence": diagram_result.confidence,
                    "data_points": len(diagram_result.data_points)
                })
        except Exception as e:
            logger.warning(f"Diagram analysis failed: {e}")

    # Calculate overall quality
    confidences = [r.confidence for r in content_regions]
    overall_quality = sum(confidences) / len(confidences) if confidences else 0.5

    # Generate summary
    parts = []
    if extracted_text:
        parts.append(f"Text: {len(extracted_text.split())} words")
    if extracted_math:
        parts.append(f"Math: {len(extracted_math)} equations")
    if diagrams:
        parts.append(f"Diagrams: {len(diagrams)}")
    content_summary = ", ".join(parts) if parts else "No content detected"

    elapsed_ms = int((time.time() - start_time) * 1000)

    return HomeworkAnalyzeResponse(
        content_regions=content_regions,
        extracted_text=extracted_text,
        extracted_math=extracted_math,
        diagrams=diagrams,
        overall_quality=overall_quality,
        content_summary=content_summary,
        processing_time_ms=elapsed_ms
    )


# =============================================================================
# Utility Functions for Direct Model Access
# =============================================================================


def get_handwriting_recognizer() -> Optional[HandwritingRecognizer]:
    """Get the handwriting recognizer instance."""
    return _handwriting_recognizer


def get_math_detector() -> Optional[MathEquationDetector]:
    """Get the math equation detector instance."""
    return _math_detector


def get_diagram_analyzer() -> Optional[DiagramAnalyzer]:
    """Get the diagram analyzer instance."""
    return _diagram_analyzer


def get_document_scanner() -> Optional[DocumentScanner]:
    """Get the document scanner instance."""
    return _document_scanner
