"""
API Request and Response schemas for Vision Analysis Service.

Defines Pydantic models for all API endpoints.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# =============================================================================
# Shared Schemas
# =============================================================================


class BoundingBoxSchema(BaseModel):
    """Bounding box coordinates."""
    x: int
    y: int
    width: int
    height: int


class WordPositionSchema(BaseModel):
    """Word with position information."""
    word: str
    confidence: float
    bounding_box: BoundingBoxSchema


class LineResultSchema(BaseModel):
    """Recognition result for a single line."""
    text: str
    confidence: float
    bounding_box: BoundingBoxSchema
    line_number: int


class EquationResultSchema(BaseModel):
    """Result from equation detection."""
    latex: str
    confidence: float
    bounding_box: Optional[BoundingBoxSchema] = None
    equation_type: str = "expression"
    symbols_detected: List[str] = []
    rendered_preview: Optional[str] = None
    is_valid: bool = True
    validation_message: Optional[str] = None


class DataPointSchema(BaseModel):
    """Data point from chart."""
    label: str
    value: float
    x: Optional[float] = None
    y: Optional[float] = None
    category: Optional[str] = None


class ChartDataSchema(BaseModel):
    """Extracted chart data."""
    chart_type: str
    title: Optional[str] = None
    x_axis_label: Optional[str] = None
    y_axis_label: Optional[str] = None
    legend: Optional[List[str]] = None
    data_points: List[DataPointSchema] = []


class ContentRegionSchema(BaseModel):
    """Content region in homework."""
    region_type: str  # text, math, diagram
    bounding_box: BoundingBoxSchema
    content: Optional[str] = None
    confidence: float


# =============================================================================
# Handwriting OCR Schemas
# =============================================================================


class HandwritingOCRRequest(BaseModel):
    """Request for handwriting OCR."""
    image_base64: Optional[str] = Field(
        None,
        description="Base64 encoded image data"
    )
    image_url: Optional[str] = Field(
        None,
        description="URL to fetch image from"
    )
    language: str = Field(
        default="en",
        description="Language hint for recognition"
    )
    return_positions: bool = Field(
        default=False,
        description="Whether to return word positions"
    )
    return_lines: bool = Field(
        default=False,
        description="Whether to return line-by-line results"
    )


class HandwritingOCRResponse(BaseModel):
    """Response from handwriting OCR."""
    text: str
    confidence: float
    model_used: str
    lines: Optional[List[LineResultSchema]] = None
    words: Optional[List[WordPositionSchema]] = None
    processing_time_ms: int


# =============================================================================
# Math Recognition Schemas
# =============================================================================


class MathRecognizeRequest(BaseModel):
    """Request for math equation recognition."""
    image_base64: str = Field(
        ...,
        description="Base64 encoded image of math equation"
    )
    output_format: str = Field(
        default="latex",
        description="Output format: latex, mathml, or ascii"
    )
    detect_multiple: bool = Field(
        default=False,
        description="Whether to detect multiple equations"
    )
    validate: bool = Field(
        default=True,
        description="Whether to validate LaTeX syntax"
    )


class MathRecognizeResponse(BaseModel):
    """Response from math recognition."""
    equations: List[EquationResultSchema]
    full_latex: str
    equation_count: int
    has_matrices: bool = False
    has_fractions: bool = False
    complexity_score: float = 0.0
    processing_time_ms: int


# =============================================================================
# Diagram Analysis Schemas
# =============================================================================


class DiagramAnalyzeRequest(BaseModel):
    """Request for diagram analysis."""
    image_base64: str = Field(
        ...,
        description="Base64 encoded diagram image"
    )
    expected_type: Optional[str] = Field(
        None,
        description="Hint for expected diagram type"
    )
    extract_data: bool = Field(
        default=True,
        description="Whether to extract data points"
    )
    detect_shapes: bool = Field(
        default=True,
        description="Whether to detect geometric shapes"
    )


class DiagramAnalyzeResponse(BaseModel):
    """Response from diagram analysis."""
    diagram_type: str
    confidence: float
    title: Optional[str] = None
    description: str
    extracted_data: Optional[ChartDataSchema] = None
    data_points: List[DataPointSchema] = []
    shape_count: int = 0
    processing_time_ms: int


# =============================================================================
# Document Scanner Schemas
# =============================================================================


class DocumentScanRequest(BaseModel):
    """Request for document scanning."""
    image_base64: str = Field(
        ...,
        description="Base64 encoded document photo"
    )
    auto_enhance: bool = Field(
        default=True,
        description="Whether to auto-enhance the document"
    )
    auto_crop: bool = Field(
        default=True,
        description="Whether to auto-detect and crop document"
    )
    output_format: str = Field(
        default="png",
        description="Output image format: png or jpeg"
    )
    output_dpi: int = Field(
        default=300,
        description="Output resolution in DPI"
    )


class DocumentScanResponse(BaseModel):
    """Response from document scanning."""
    processed_image_base64: str
    quality_score: float
    quality_improvement: float
    operations_applied: List[str]
    detected_bounds: Optional[List[Dict[str, int]]] = None
    rotation_applied: float = 0.0
    processing_time_ms: int


# =============================================================================
# Homework Analysis Schemas (Combined Analysis)
# =============================================================================


class HomeworkAnalyzeRequest(BaseModel):
    """Request for combined homework analysis."""
    image_base64: str = Field(
        ...,
        description="Base64 encoded homework image"
    )
    expected_content: str = Field(
        default="mixed",
        description="Expected content type: math, text, diagram, or mixed"
    )
    subject: Optional[str] = Field(
        None,
        description="Subject hint: math, science, english, etc."
    )
    grade_level: Optional[int] = Field(
        None,
        description="Student grade level for context"
    )
    extract_all: bool = Field(
        default=True,
        description="Whether to extract all content types"
    )


class HomeworkAnalyzeResponse(BaseModel):
    """Response from homework analysis."""
    content_regions: List[ContentRegionSchema]
    extracted_text: str
    extracted_math: List[EquationResultSchema]
    diagrams: List[Dict[str, Any]]
    overall_quality: float
    content_summary: str
    processing_time_ms: int


# =============================================================================
# Drawing Assessment Schemas (Sprint 6)
# =============================================================================


class DrawingRubricSchema(BaseModel):
    """Rubric for drawing assessment."""
    rubric_id: Optional[str] = None
    name: Optional[str] = None
    dimensions: List[str] = Field(
        default=["composition", "technical_skill", "creativity"],
        description="Assessment dimensions"
    )
    required_elements: List[str] = Field(
        default=[],
        description="Required elements that must be present"
    )
    dimension_weights: Optional[Dict[str, float]] = None


class DetectedElementSchema(BaseModel):
    """Detected element in a drawing."""
    element_id: str
    element_type: str
    name: str
    bounding_box: BoundingBoxSchema
    confidence: float
    attributes: Dict[str, Any] = {}


class LabelDetectionSchema(BaseModel):
    """Detected label in a diagram."""
    label_id: str
    text: str
    text_box: BoundingBoxSchema
    confidence: float
    spelling_correct: bool = True
    spelling_suggestions: List[str] = []


class DrawingAssessRequest(BaseModel):
    """Request for drawing assessment."""
    image_base64: str = Field(
        ...,
        description="Base64 encoded drawing image"
    )
    assignment_type: str = Field(
        default="art",
        description="Type of assignment: art, science_diagram, map, technical"
    )
    rubric: Optional[DrawingRubricSchema] = Field(
        None,
        description="Optional assessment rubric"
    )
    reference_image_base64: Optional[str] = Field(
        None,
        description="Optional reference image for comparison"
    )


class DrawingAssessResponse(BaseModel):
    """Response from drawing assessment."""
    overall_score: float
    dimension_scores: Dict[str, float]
    detected_elements: List[DetectedElementSchema]
    missing_elements: List[str]
    labels: List[LabelDetectionSchema] = []
    feedback: str
    suggestions: List[str]
    comparison_to_reference: Optional[float] = None
    composition_analysis: Dict[str, Any] = {}
    color_analysis: Dict[str, Any] = {}
    processing_time_ms: int


# =============================================================================
# Attention Tracking Schemas (Sprint 6)
# =============================================================================


class HeadPoseSchema(BaseModel):
    """Head pose angles."""
    pitch: float
    yaw: float
    roll: float


class AttentionMetricsSchema(BaseModel):
    """Attention metrics for a single measurement."""
    timestamp: str
    attention_score: float
    gaze_on_screen: bool
    face_detected: bool
    head_pose: Optional[HeadPoseSchema] = None
    engagement_state: str = "unknown"
    blink_detected: bool = False
    eye_aspect_ratio: float = 0.0


class AttentionProcessRequest(BaseModel):
    """Request to process attention metrics batch."""
    session_id: str = Field(
        ...,
        description="Unique session identifier"
    )
    metrics: List[AttentionMetricsSchema] = Field(
        ...,
        description="Batch of attention metrics from client"
    )


class AttentionProcessResponse(BaseModel):
    """Response from attention processing."""
    session_id: str
    metrics_received: int
    current_engagement: str
    recommendations: List[str] = []


class SessionSummarySchema(BaseModel):
    """Summary of an attention tracking session."""
    total_duration_seconds: int
    attention_percentage: float
    distraction_events: int
    average_engagement: float
    engagement_over_time: List[float]
    focus_periods: int
    average_focus_duration_seconds: float
    drowsiness_events: int = 0
    recommendations: List[str] = []


class AttentionSessionSummaryResponse(BaseModel):
    """Response with session summary."""
    session_id: str
    summary: SessionSummarySchema


# =============================================================================
# Work Comparison Schemas (Sprint 6)
# =============================================================================


class DifferenceRegionSchema(BaseModel):
    """Region of difference between submissions."""
    region_id: str
    bounding_box: BoundingBoxSchema
    difference_type: str  # added, removed, modified
    intensity: float
    area_percentage: float


class CompareSubmissionsRequest(BaseModel):
    """Request to compare two submissions."""
    submission1_base64: str = Field(
        ...,
        description="Base64 encoded first submission image"
    )
    submission2_base64: str = Field(
        ...,
        description="Base64 encoded second submission image"
    )
    comparison_type: str = Field(
        default="similarity",
        description="Type: similarity, progress, plagiarism"
    )


class CompareSubmissionsResponse(BaseModel):
    """Response from submission comparison."""
    similarity_score: float
    structural_similarity: float
    content_similarity: float
    differences: List[DifferenceRegionSchema]
    is_potential_copy: bool
    copy_confidence: float = 0.0
    processing_time_ms: int


class ProgressTrackRequest(BaseModel):
    """Request to track progress across submissions."""
    submission_images_base64: List[str] = Field(
        ...,
        description="List of base64 encoded submission images in order"
    )
    timestamps: Optional[List[str]] = Field(
        None,
        description="Optional timestamps for each submission"
    )


class ProgressTrackResponse(BaseModel):
    """Response from progress tracking."""
    submissions_count: int
    improvement_score: float
    metrics_over_time: Dict[str, List[float]]
    notable_improvements: List[str]
    areas_unchanged: List[str]
    first_submission_score: float
    latest_submission_score: float
    processing_time_ms: int


# =============================================================================
# Multimodal Analysis Schemas (Sprint 6)
# =============================================================================


class ContentBlockSchema(BaseModel):
    """Content block in fused document."""
    block_id: str
    block_type: str  # text, math, diagram, image
    content: Any
    bounding_box: BoundingBoxSchema
    confidence: float
    metadata: Dict[str, Any] = {}


class RelationshipSchema(BaseModel):
    """Relationship between content blocks."""
    source_id: str
    target_id: str
    relationship_type: str
    confidence: float = 1.0


class DocumentStructureSchema(BaseModel):
    """Document structure analysis."""
    page_width: int
    page_height: int
    num_columns: int
    has_header: bool
    has_footer: bool
    margins: Dict[str, int]
    primary_reading_direction: str = "ltr"


class FusedDocumentSchema(BaseModel):
    """Fused document representation."""
    content_blocks: List[ContentBlockSchema]
    reading_order: List[int]
    relationships: List[RelationshipSchema]
    unified_text: str
    structure: DocumentStructureSchema


class MultimodalAnalyzeRequest(BaseModel):
    """Request for multimodal document analysis."""
    image_base64: str = Field(
        ...,
        description="Base64 encoded document image"
    )
    analysis_depth: str = Field(
        default="standard",
        description="Analysis depth: quick, standard, deep"
    )
    expected_content_types: List[str] = Field(
        default=["text", "math", "diagram"],
        description="Expected content types to detect"
    )


class MultimodalAnalyzeResponse(BaseModel):
    """Response from multimodal analysis."""
    document: FusedDocumentSchema
    summary: str
    content_type_counts: Dict[str, int] = {}
    processing_time_ms: int


# =============================================================================
# Health Check Schemas
# =============================================================================


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str


class ReadinessResponse(BaseModel):
    """Readiness check response."""
    status: str
    models_loaded: Dict[str, bool]
