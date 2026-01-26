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
