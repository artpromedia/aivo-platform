"""
IEP Data Models

Pydantic models for structured IEP document extraction results.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import date, datetime


class IEPDomain(str, Enum):
    """Domain classification for IEP goals."""
    READING = "reading"
    WRITING = "writing"
    MATH = "math"
    COMMUNICATION = "communication"
    SOCIAL_EMOTIONAL = "social_emotional"
    BEHAVIOR = "behavior"
    MOTOR = "motor"
    DAILY_LIVING = "daily_living"
    VOCATIONAL = "vocational"
    EXECUTIVE_FUNCTION = "executive_function"
    OTHER = "other"


class ServiceType(str, Enum):
    """Types of special education and related services."""
    SPECIAL_EDUCATION = "special_education"
    SPEECH_LANGUAGE = "speech_language"
    OCCUPATIONAL_THERAPY = "occupational_therapy"
    PHYSICAL_THERAPY = "physical_therapy"
    COUNSELING = "counseling"
    BEHAVIORAL_SUPPORT = "behavioral_support"
    ASSISTIVE_TECHNOLOGY = "assistive_technology"
    TRANSPORTATION = "transportation"
    VISION_SERVICES = "vision_services"
    HEARING_SERVICES = "hearing_services"
    NURSING = "nursing"
    SOCIAL_WORK = "social_work"
    PSYCHOLOGY = "psychology"
    OTHER = "other"


class AccommodationCategory(str, Enum):
    """Categories of accommodations."""
    PRESENTATION = "presentation"
    RESPONSE = "response"
    SETTING = "setting"
    TIMING = "timing"
    SCHEDULING = "scheduling"
    ORGANIZATION = "organization"
    ASSIGNMENT = "assignment"
    OTHER = "other"


class DocumentSection(BaseModel):
    """A section extracted from the document."""
    section_type: str
    text: str
    page_number: int
    start_position: int = 0
    end_position: int = 0
    confidence: float = Field(ge=0.0, le=1.0, default=1.0)


class ExtractedGoal(BaseModel):
    """Goal extracted from IEP document."""
    goal_number: str = Field(..., description="Goal identifier (e.g., '1', '1.a', 'Reading Goal 1')")
    domain: IEPDomain = Field(..., description="Skill domain classification")
    goal_text: str = Field(..., description="Complete goal text")
    baseline: Optional[str] = Field(None, description="Current performance level")
    target: Optional[str] = Field(None, description="Expected outcome/target")
    measurement_method: Optional[str] = Field(None, description="How progress will be measured")
    measurement_frequency: Optional[str] = Field(None, description="How often progress will be measured")
    page_reference: int = Field(..., description="Page number where goal was found")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Extraction confidence")

    # Objectives/benchmarks
    objectives: List[str] = Field(default_factory=list, description="Short-term objectives or benchmarks")

    # Additional metadata
    category: Optional[str] = Field(None, description="Goal category (academic, behavioral, functional)")
    timeline: Optional[str] = Field(None, description="Timeline for goal achievement")
    raw_text: Optional[str] = Field(None, description="Original extracted text segment")

    class Config:
        use_enum_values = True


class ExtractedService(BaseModel):
    """Service extracted from IEP document."""
    service_type: ServiceType = Field(..., description="Type of service")
    service_description: str = Field(..., description="Description of the service")
    minutes_per_session: Optional[int] = Field(None, ge=0, description="Minutes per session")
    sessions_per_week: Optional[float] = Field(None, ge=0, description="Sessions per week")
    total_minutes_per_week: Optional[int] = Field(None, ge=0, description="Total minutes per week")
    provider_type: Optional[str] = Field(None, description="Type of provider (specialist, teacher, aide)")
    location: Optional[str] = Field(None, description="Service location (general_ed, resource, separate)")
    page_reference: int = Field(..., description="Page number where service was found")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Extraction confidence")

    # Additional metadata
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    frequency_description: Optional[str] = None
    goals_addressed: List[str] = Field(default_factory=list)

    class Config:
        use_enum_values = True


class ExtractedAccommodation(BaseModel):
    """Accommodation extracted from IEP document."""
    category: AccommodationCategory = Field(..., description="Accommodation category")
    description: str = Field(..., description="Description of the accommodation")
    applies_to: List[str] = Field(
        default_factory=list,
        description="Contexts where accommodation applies (tests, classwork, homework, all)"
    )
    page_reference: int = Field(..., description="Page number where accommodation was found")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Extraction confidence")

    # Additional metadata
    name: Optional[str] = Field(None, description="Short name for the accommodation")
    frequency: Optional[str] = Field(None, description="How often accommodation is provided")
    is_modification: bool = Field(False, description="Whether this is a modification vs accommodation")

    class Config:
        use_enum_values = True


class PresentLevel(BaseModel):
    """Present level of performance extracted from IEP."""
    domain: IEPDomain = Field(..., description="Skill domain")
    description: str = Field(..., description="Description of current performance")
    strengths: List[str] = Field(default_factory=list, description="Identified strengths")
    needs: List[str] = Field(default_factory=list, description="Identified needs/areas for growth")
    assessment_data: Dict[str, str] = Field(default_factory=dict, description="Assessment results")
    page_reference: int = Field(..., description="Page number where info was found")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Extraction confidence")

    # Additional context
    grade_level_performance: Optional[str] = Field(None, description="Grade level equivalent if available")
    recent_progress: Optional[str] = Field(None, description="Recent progress notes")

    class Config:
        use_enum_values = True


class StudentInfo(BaseModel):
    """Student information extracted from IEP."""
    name: Optional[str] = None
    student_id: Optional[str] = None
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    grade_level: Optional[str] = None
    school: Optional[str] = None
    district: Optional[str] = None
    disability_categories: List[str] = Field(default_factory=list)
    eligibility_date: Optional[date] = None


class IEPExtractionResult(BaseModel):
    """Complete IEP extraction result."""
    document_id: str = Field(..., description="Unique identifier for this extraction")
    learner_id: Optional[str] = Field(None, description="Associated learner ID if known")

    # Student info
    student: Optional[StudentInfo] = None

    # Extracted content
    goals: List[ExtractedGoal] = Field(default_factory=list)
    services: List[ExtractedService] = Field(default_factory=list)
    accommodations: List[ExtractedAccommodation] = Field(default_factory=list)
    present_levels: List[PresentLevel] = Field(default_factory=list)

    # Document metadata
    iep_date: Optional[date] = Field(None, description="IEP meeting/creation date")
    annual_review_date: Optional[date] = Field(None, description="Next annual review date")
    reevaluation_date: Optional[date] = Field(None, description="Next reevaluation date")
    eligibility_category: Optional[str] = Field(None, description="Primary eligibility category")

    # Placement information
    placement: Optional[str] = Field(None, description="Educational placement")
    time_in_general_ed_percent: Optional[float] = Field(None, ge=0, le=100)
    least_restrictive_environment: Optional[str] = None

    # Transition (for older students)
    transition_goals: List[str] = Field(default_factory=list)
    post_secondary_goals: Dict[str, str] = Field(default_factory=dict)

    # Extraction metadata
    total_pages: int = Field(..., description="Total pages in document")
    extraction_timestamp: datetime = Field(default_factory=datetime.utcnow)
    overall_confidence: float = Field(ge=0.0, le=1.0, description="Overall extraction confidence")
    extraction_warnings: List[str] = Field(default_factory=list, description="Warnings generated during extraction")
    extraction_errors: List[str] = Field(default_factory=list, description="Non-fatal errors during extraction")

    # Processing info
    ocr_pages: List[int] = Field(default_factory=list, description="Pages that required OCR")
    processing_time_ms: Optional[int] = Field(None, description="Processing time in milliseconds")


class SMARTCriterion(BaseModel):
    """Evaluation of a single SMART criterion."""
    criterion: str = Field(..., description="Criterion name (Specific, Measurable, etc.)")
    score: float = Field(ge=0.0, le=1.0, description="Score for this criterion")
    explanation: str = Field(..., description="Explanation of the score")
    suggestion: Optional[str] = Field(None, description="Improvement suggestion if score < 0.8")


class SMARTValidationResult(BaseModel):
    """SMART goal validation result."""
    goal_number: str = Field(..., description="Goal identifier being validated")
    goal_text: str = Field(..., description="The goal text that was validated")

    # Individual criterion scores
    specific_score: float = Field(ge=0.0, le=1.0)
    specific_explanation: str = ""
    specific_suggestion: Optional[str] = None

    measurable_score: float = Field(ge=0.0, le=1.0)
    measurable_explanation: str = ""
    measurable_suggestion: Optional[str] = None

    achievable_score: float = Field(ge=0.0, le=1.0)
    achievable_explanation: str = ""
    achievable_suggestion: Optional[str] = None

    relevant_score: float = Field(ge=0.0, le=1.0)
    relevant_explanation: str = ""
    relevant_suggestion: Optional[str] = None

    timebound_score: float = Field(ge=0.0, le=1.0)
    timebound_explanation: str = ""
    timebound_suggestion: Optional[str] = None

    # Overall assessment
    overall_score: float = Field(ge=0.0, le=1.0, description="Average of all criterion scores")
    is_smart: bool = Field(..., description="Whether goal meets SMART criteria (overall >= 0.7)")
    recommendations: List[str] = Field(default_factory=list, description="Improvement recommendations")

    @classmethod
    def calculate_overall(cls, scores: Dict[str, float]) -> float:
        """Calculate overall score from individual criterion scores."""
        if not scores:
            return 0.0
        return sum(scores.values()) / len(scores)


class GoalWithValidation(BaseModel):
    """A goal paired with its SMART validation result."""
    goal: ExtractedGoal
    validation: SMARTValidationResult
    improvements: List[str] = Field(default_factory=list)


class IEPExtractionRequest(BaseModel):
    """Request model for IEP extraction."""
    document_path: Optional[str] = Field(None, description="Path to PDF document")
    document_bytes: Optional[bytes] = Field(None, description="PDF document as bytes")
    learner_id: Optional[str] = Field(None, description="Associated learner ID")
    validate_goals: bool = Field(True, description="Whether to validate goals against SMART criteria")
    extract_present_levels: bool = Field(True, description="Whether to extract present levels")
    include_raw_text: bool = Field(False, description="Whether to include raw text in results")


class IEPExtractionResponse(BaseModel):
    """Response model for IEP extraction API."""
    success: bool
    result: Optional[IEPExtractionResult] = None
    goal_validations: List[SMARTValidationResult] = Field(default_factory=list)
    error: Optional[str] = None
    processing_time_ms: int = 0
