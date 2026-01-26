"""
API Routes for Vision Analysis Service.

Provides REST endpoints for:
- Handwriting OCR
- Math equation recognition
- Diagram analysis
- Document scanning
- Combined homework analysis
- Drawing assessment (Sprint 6)
- Attention tracking (Sprint 6)
- Work comparison (Sprint 6)
- Multimodal analysis (Sprint 6)
"""

import base64
import io
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

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
from app.models.drawing_assessment import (
    DrawingAssessor,
    DrawingAssessorConfig,
    DrawingRubric,
    DrawingCategory,
)
from app.models.attention_tracker import (
    AttentionTracker,
    AttentionTrackerConfig,
    AttentionMetrics,
)
from app.models.work_comparator import (
    WorkComparator,
    WorkComparatorConfig,
)
from app.services.multimodal_fusion import (
    MultimodalFuser,
    MultimodalFusionConfig,
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
    # Sprint 6 schemas
    DrawingAssessRequest,
    DrawingAssessResponse,
    DrawingRubricSchema,
    DetectedElementSchema,
    LabelDetectionSchema,
    AttentionProcessRequest,
    AttentionProcessResponse,
    AttentionSessionSummaryResponse,
    AttentionMetricsSchema,
    SessionSummarySchema,
    HeadPoseSchema,
    CompareSubmissionsRequest,
    CompareSubmissionsResponse,
    ProgressTrackRequest,
    ProgressTrackResponse,
    DifferenceRegionSchema,
    MultimodalAnalyzeRequest,
    MultimodalAnalyzeResponse,
    ContentBlockSchema,
    RelationshipSchema,
    DocumentStructureSchema,
    FusedDocumentSchema,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["vision"])

# Global model instances
_handwriting_recognizer: Optional[HandwritingRecognizer] = None
_math_detector: Optional[MathEquationDetector] = None
_diagram_analyzer: Optional[DiagramAnalyzer] = None
_document_scanner: Optional[DocumentScanner] = None
# Sprint 6 components
_drawing_assessor: Optional[DrawingAssessor] = None
_attention_tracker: Optional[AttentionTracker] = None
_work_comparator: Optional[WorkComparator] = None
_multimodal_fuser: Optional[MultimodalFuser] = None

# Session storage for attention tracking
_attention_sessions: Dict[str, List[AttentionMetrics]] = {}


def init_components(settings: Settings) -> None:
    """Initialize all model components."""
    global _handwriting_recognizer, _math_detector, _diagram_analyzer, _document_scanner
    global _drawing_assessor, _attention_tracker, _work_comparator, _multimodal_fuser

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

    # Sprint 6: Drawing assessor
    drawing_config = DrawingAssessorConfig(
        device=settings.DEVICE,
        enable_ocr=True,
    )
    _drawing_assessor = DrawingAssessor(drawing_config)

    # Sprint 6: Attention tracker
    attention_config = AttentionTrackerConfig(
        device=settings.DEVICE,
        privacy_mode="strict",
        local_only=True,
    )
    _attention_tracker = AttentionTracker(attention_config)

    # Sprint 6: Work comparator
    comparator_config = WorkComparatorConfig(
        enable_feature_matching=True,
    )
    _work_comparator = WorkComparator(comparator_config)

    # Sprint 6: Multimodal fuser
    fusion_config = MultimodalFusionConfig(
        fusion_strategy="attention",
        embedding_dim=512,
    )
    _multimodal_fuser = MultimodalFuser(fusion_config)

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
# Drawing Assessment Endpoints (Sprint 6)
# =============================================================================


@router.post("/assess/drawing", response_model=DrawingAssessResponse)
async def assess_drawing(request: DrawingAssessRequest) -> DrawingAssessResponse:
    """
    Assess a student drawing or artwork.

    Supports:
    - Art class assignments
    - Science diagrams (labeled drawings)
    - Map drawings
    - Technical sketches
    """
    if _drawing_assessor is None:
        raise HTTPException(status_code=503, detail="Drawing assessor not initialized")

    image = _decode_image(request.image_base64)

    # Convert rubric schema to model rubric if provided
    rubric = None
    if request.rubric:
        rubric = DrawingRubric(
            rubric_id=request.rubric.rubric_id or "custom",
            name=request.rubric.name or "Custom Rubric",
            category=DrawingCategory.ART,
            dimensions=request.rubric.dimensions,
            required_elements=request.rubric.required_elements,
            dimension_weights=request.rubric.dimension_weights or {},
        )

    # Decode reference image if provided
    reference = None
    if request.reference_image_base64:
        reference = _decode_image(request.reference_image_base64)

    # Perform assessment
    result = _drawing_assessor.assess_drawing(
        image=image,
        rubric=rubric,
        reference=reference,
        assignment_type=request.assignment_type,
    )

    # Convert detected elements
    detected_elements = [
        DetectedElementSchema(
            element_id=elem.element_id,
            element_type=elem.element_type,
            name=elem.name,
            bounding_box=BoundingBoxSchema(
                x=elem.bounding_box.x,
                y=elem.bounding_box.y,
                width=elem.bounding_box.width,
                height=elem.bounding_box.height,
            ),
            confidence=elem.confidence,
            attributes=elem.attributes,
        )
        for elem in result.detected_elements
    ]

    # Convert labels
    labels = [
        LabelDetectionSchema(
            label_id=label.label_id,
            text=label.text,
            text_box=BoundingBoxSchema(
                x=label.text_box.x,
                y=label.text_box.y,
                width=label.text_box.width,
                height=label.text_box.height,
            ),
            confidence=label.confidence,
            spelling_correct=label.spelling_correct,
            spelling_suggestions=label.spelling_suggestions,
        )
        for label in result.labels
    ]

    return DrawingAssessResponse(
        overall_score=result.overall_score,
        dimension_scores=result.dimension_scores,
        detected_elements=detected_elements,
        missing_elements=result.missing_elements,
        labels=labels,
        feedback=result.feedback,
        suggestions=result.suggestions,
        comparison_to_reference=result.comparison_to_reference,
        composition_analysis=result.composition_analysis,
        color_analysis=result.color_analysis,
        processing_time_ms=result.processing_time_ms,
    )


# =============================================================================
# Attention Tracking Endpoints (Sprint 6)
# =============================================================================


@router.post("/attention/process", response_model=AttentionProcessResponse)
async def process_attention_metrics(
    request: AttentionProcessRequest
) -> AttentionProcessResponse:
    """
    Process batched attention metrics from client-side tracking.

    Note: This endpoint receives pre-computed metrics from client-side code.
    All image processing happens on the client - only numerical metrics are sent.
    """
    if _attention_tracker is None:
        raise HTTPException(status_code=503, detail="Attention tracker not initialized")

    # Store metrics for the session
    session_id = request.session_id
    if session_id not in _attention_sessions:
        _attention_sessions[session_id] = []

    # Convert and store metrics
    for metric in request.metrics:
        head_pose = None
        if metric.head_pose:
            from app.models.attention_tracker import HeadPose
            head_pose = HeadPose(
                pitch=metric.head_pose.pitch,
                yaw=metric.head_pose.yaw,
                roll=metric.head_pose.roll,
            )

        attention_metric = AttentionMetrics(
            timestamp=datetime.fromisoformat(metric.timestamp.replace('Z', '+00:00')),
            attention_score=metric.attention_score,
            gaze_on_screen=metric.gaze_on_screen,
            face_detected=metric.face_detected,
            head_pose=head_pose,
            engagement_state=metric.engagement_state,
            blink_detected=metric.blink_detected,
            eye_aspect_ratio=metric.eye_aspect_ratio,
        )
        _attention_sessions[session_id].append(attention_metric)

    # Determine current engagement
    recent_metrics = _attention_sessions[session_id][-10:]
    if recent_metrics:
        avg_score = sum(m.attention_score for m in recent_metrics) / len(recent_metrics)
        if avg_score >= 0.7:
            current_engagement = "engaged"
        elif avg_score >= 0.4:
            current_engagement = "neutral"
        else:
            current_engagement = "distracted"
    else:
        current_engagement = "unknown"

    # Generate recommendations
    recommendations = []
    if current_engagement == "distracted":
        recommendations.append("Consider taking a short break to refocus.")

    return AttentionProcessResponse(
        session_id=session_id,
        metrics_received=len(request.metrics),
        current_engagement=current_engagement,
        recommendations=recommendations,
    )


@router.get("/attention/session/{session_id}/summary", response_model=AttentionSessionSummaryResponse)
async def get_attention_session_summary(session_id: str) -> AttentionSessionSummaryResponse:
    """
    Get summary of attention tracking session.

    Returns aggregated metrics and recommendations.
    """
    if _attention_tracker is None:
        raise HTTPException(status_code=503, detail="Attention tracker not initialized")

    if session_id not in _attention_sessions:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    metrics = _attention_sessions[session_id]

    if not metrics:
        raise HTTPException(status_code=404, detail=f"No metrics for session {session_id}")

    # Aggregate session data
    summary = _attention_tracker.aggregate_session(metrics)

    return AttentionSessionSummaryResponse(
        session_id=session_id,
        summary=SessionSummarySchema(
            total_duration_seconds=summary.total_duration_seconds,
            attention_percentage=summary.attention_percentage,
            distraction_events=summary.distraction_events,
            average_engagement=summary.average_engagement,
            engagement_over_time=summary.engagement_over_time,
            focus_periods=summary.focus_periods,
            average_focus_duration_seconds=summary.average_focus_duration_seconds,
            drowsiness_events=summary.drowsiness_events,
            recommendations=summary.recommendations,
        ),
    )


# =============================================================================
# Work Comparison Endpoints (Sprint 6)
# =============================================================================


@router.post("/compare/submissions", response_model=CompareSubmissionsResponse)
async def compare_submissions(request: CompareSubmissionsRequest) -> CompareSubmissionsResponse:
    """
    Compare two student work submissions.

    Supports:
    - Similarity comparison
    - Plagiarism detection
    - Progress tracking
    """
    if _work_comparator is None:
        raise HTTPException(status_code=503, detail="Work comparator not initialized")

    submission1 = _decode_image(request.submission1_base64)
    submission2 = _decode_image(request.submission2_base64)

    result = _work_comparator.compare_submissions(
        submission1=submission1,
        submission2=submission2,
        comparison_type=request.comparison_type,
    )

    # Convert difference regions
    differences = [
        DifferenceRegionSchema(
            region_id=diff.region_id,
            bounding_box=BoundingBoxSchema(
                x=diff.bounding_box.x,
                y=diff.bounding_box.y,
                width=diff.bounding_box.width,
                height=diff.bounding_box.height,
            ),
            difference_type=diff.difference_type,
            intensity=diff.intensity,
            area_percentage=diff.area_percentage,
        )
        for diff in result.differences
    ]

    return CompareSubmissionsResponse(
        similarity_score=result.similarity_score,
        structural_similarity=result.structural_similarity,
        content_similarity=result.content_similarity,
        differences=differences,
        is_potential_copy=result.is_potential_copy,
        copy_confidence=result.copy_confidence,
        processing_time_ms=result.processing_time_ms,
    )


@router.post("/compare/progress", response_model=ProgressTrackResponse)
async def track_progress(request: ProgressTrackRequest) -> ProgressTrackResponse:
    """
    Track progress across multiple submissions over time.

    Analyzes improvement in quality metrics.
    """
    if _work_comparator is None:
        raise HTTPException(status_code=503, detail="Work comparator not initialized")

    # Decode all submission images
    submissions = [_decode_image(img_b64) for img_b64 in request.submission_images_base64]

    # Parse timestamps if provided
    if request.timestamps:
        timestamps = [
            datetime.fromisoformat(ts.replace('Z', '+00:00'))
            for ts in request.timestamps
        ]
    else:
        # Generate sequential timestamps
        now = datetime.now(timezone.utc)
        timestamps = [now] * len(submissions)

    result = _work_comparator.track_progress(
        submissions=submissions,
        timestamps=timestamps,
    )

    return ProgressTrackResponse(
        submissions_count=result.submissions_count,
        improvement_score=result.improvement_score,
        metrics_over_time=result.metrics_over_time,
        notable_improvements=result.notable_improvements,
        areas_unchanged=result.areas_unchanged,
        first_submission_score=result.first_submission_score,
        latest_submission_score=result.latest_submission_score,
        processing_time_ms=result.processing_time_ms,
    )


# =============================================================================
# Multimodal Analysis Endpoints (Sprint 6)
# =============================================================================


@router.post("/analyze/multimodal", response_model=MultimodalAnalyzeResponse)
async def analyze_multimodal(request: MultimodalAnalyzeRequest) -> MultimodalAnalyzeResponse:
    """
    Comprehensive multimodal document analysis.

    Combines OCR, math detection, and diagram analysis into
    a unified document representation.
    """
    if _multimodal_fuser is None:
        raise HTTPException(status_code=503, detail="Multimodal fuser not initialized")

    start_time = time.time()
    image = _decode_image(request.image_base64)

    # Gather results from other analyzers based on expected content types
    ocr_result = None
    math_result = None
    diagram_result = None

    if "text" in request.expected_content_types and _handwriting_recognizer:
        try:
            ocr_result = _handwriting_recognizer.recognize_with_positions(image)
        except Exception as e:
            logger.warning(f"OCR failed in multimodal analysis: {e}")

    if "math" in request.expected_content_types and _math_detector:
        try:
            math_content = _math_detector.extract_from_document(image)
            math_result = math_content.equations
        except Exception as e:
            logger.warning(f"Math detection failed in multimodal analysis: {e}")

    if "diagram" in request.expected_content_types and _diagram_analyzer:
        try:
            diagram_result = _diagram_analyzer.analyze(image)
        except Exception as e:
            logger.warning(f"Diagram analysis failed in multimodal analysis: {e}")

    # Fuse all results
    fused_doc = _multimodal_fuser.fuse_document(
        image=image,
        ocr_result=ocr_result,
        math_result=math_result,
        diagram_result=diagram_result,
    )

    # Convert content blocks
    content_blocks = [
        ContentBlockSchema(
            block_id=block.block_id,
            block_type=block.block_type,
            content=str(block.content) if block.content else "",
            bounding_box=BoundingBoxSchema(
                x=block.bounding_box.x,
                y=block.bounding_box.y,
                width=block.bounding_box.width,
                height=block.bounding_box.height,
            ),
            confidence=block.confidence,
            metadata=block.metadata,
        )
        for block in fused_doc.content_blocks
    ]

    # Convert relationships
    relationships = [
        RelationshipSchema(
            source_id=rel.source_id,
            target_id=rel.target_id,
            relationship_type=rel.relationship_type,
            confidence=rel.confidence,
        )
        for rel in fused_doc.relationships
    ]

    # Convert structure
    structure = DocumentStructureSchema(
        page_width=fused_doc.structure.page_width,
        page_height=fused_doc.structure.page_height,
        num_columns=fused_doc.structure.num_columns,
        has_header=fused_doc.structure.has_header,
        has_footer=fused_doc.structure.has_footer,
        margins=fused_doc.structure.margins,
        primary_reading_direction=fused_doc.structure.primary_reading_direction,
    )

    # Count content types
    content_type_counts: Dict[str, int] = {}
    for block in fused_doc.content_blocks:
        content_type_counts[block.block_type] = content_type_counts.get(block.block_type, 0) + 1

    # Generate summary
    summary_parts = []
    if content_type_counts:
        for content_type, count in content_type_counts.items():
            summary_parts.append(f"{count} {content_type} block(s)")
    summary = "; ".join(summary_parts) if summary_parts else "No content detected"

    elapsed_ms = int((time.time() - start_time) * 1000)

    return MultimodalAnalyzeResponse(
        document=FusedDocumentSchema(
            content_blocks=content_blocks,
            reading_order=fused_doc.reading_order,
            relationships=relationships,
            unified_text=fused_doc.unified_text,
            structure=structure,
        ),
        summary=summary,
        content_type_counts=content_type_counts,
        processing_time_ms=elapsed_ms,
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


def get_drawing_assessor() -> Optional[DrawingAssessor]:
    """Get the drawing assessor instance."""
    return _drawing_assessor


def get_attention_tracker() -> Optional[AttentionTracker]:
    """Get the attention tracker instance."""
    return _attention_tracker


def get_work_comparator() -> Optional[WorkComparator]:
    """Get the work comparator instance."""
    return _work_comparator


def get_multimodal_fuser() -> Optional[MultimodalFuser]:
    """Get the multimodal fuser instance."""
    return _multimodal_fuser


def get_components() -> Dict[str, bool]:
    """Get status of all components for health checks."""
    return {
        "handwriting_recognizer": _handwriting_recognizer is not None,
        "math_detector": _math_detector is not None,
        "diagram_analyzer": _diagram_analyzer is not None,
        "document_scanner": _document_scanner is not None,
        "drawing_assessor": _drawing_assessor is not None,
        "attention_tracker": _attention_tracker is not None,
        "work_comparator": _work_comparator is not None,
        "multimodal_fuser": _multimodal_fuser is not None,
    }
