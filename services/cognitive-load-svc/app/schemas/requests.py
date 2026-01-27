"""
API Request and Response schemas for Cognitive Load Service.

Defines Pydantic models for all API endpoints.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# =============================================================================
# Enums
# =============================================================================


class LoadLevel(str, Enum):
    """Cognitive load level classification."""
    LOW = "low"
    OPTIMAL = "optimal"
    HIGH = "high"
    OVERLOAD = "overload"


class ScaffoldType(str, Enum):
    """Types of scaffolding support."""
    HINT = "hint"
    WORKED_EXAMPLE = "worked_example"
    DECOMPOSITION = "decomposition"
    VISUAL_AID = "visual_aid"
    ANALOGY = "analogy"
    SIMPLIFICATION = "simplification"
    CHUNKING = "chunking"
    PRIOR_KNOWLEDGE = "prior_knowledge"


class AdaptationType(str, Enum):
    """Types of adaptation actions."""
    REDUCE_COMPLEXITY = "reduce_complexity"
    ADD_SCAFFOLDING = "add_scaffolding"
    SUGGEST_BREAK = "suggest_break"
    CHANGE_MODALITY = "change_modality"
    SLOW_PACE = "slow_pace"
    PROVIDE_SUMMARY = "provide_summary"
    OFFER_HELP = "offer_help"
    SKIP_TO_EASIER = "skip_to_easier"


class ContentType(str, Enum):
    """Types of educational content."""
    TEXT = "text"
    VIDEO = "video"
    INTERACTIVE = "interactive"
    QUIZ = "quiz"
    PROBLEM = "problem"
    DIAGRAM = "diagram"
    SIMULATION = "simulation"


class Domain(str, Enum):
    """Educational domains."""
    MATH = "math"
    SCIENCE = "science"
    READING = "reading"
    WRITING = "writing"
    LANGUAGE = "language"
    HISTORY = "history"
    ART = "art"
    MUSIC = "music"
    GENERAL = "general"


# =============================================================================
# Intrinsic Load Schemas
# =============================================================================


class ContentAnalysisRequest(BaseModel):
    """Request for content complexity analysis."""
    content: str = Field(
        ...,
        description="The content text to analyze",
        max_length=10000,
    )
    content_type: ContentType = Field(
        default=ContentType.TEXT,
        description="Type of content being analyzed",
    )
    domain: Optional[Domain] = Field(
        None,
        description="Educational domain for context",
    )
    grade_level: Optional[int] = Field(
        None,
        ge=1,
        le=12,
        description="Target grade level (1-12)",
    )
    prior_knowledge_assumed: Optional[List[str]] = Field(
        None,
        description="List of concepts assumed as prior knowledge",
    )


class ContentComplexityResponse(BaseModel):
    """Response from content complexity analysis."""
    element_interactivity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="How many elements must be processed simultaneously",
    )
    vocabulary_load: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Difficulty of vocabulary used",
    )
    syntactic_complexity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Complexity of sentence structures",
    )
    conceptual_density: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Number of concepts per unit of content",
    )
    overall_complexity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Overall intrinsic complexity score",
    )
    intrinsic_load_estimate: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Estimated intrinsic cognitive load",
    )
    complexity_factors: List[str] = Field(
        default=[],
        description="Key factors contributing to complexity",
    )
    simplification_suggestions: List[str] = Field(
        default=[],
        description="Suggestions for reducing complexity",
    )
    grade_level_match: Optional[str] = Field(
        None,
        description="Assessment of grade level appropriateness",
    )
    processing_time_ms: int = Field(
        ...,
        description="Processing time in milliseconds",
    )


class ElementInteractivityRequest(BaseModel):
    """Request for element interactivity analysis."""
    content: str = Field(..., description="Content to analyze")
    domain: Domain = Field(default=Domain.GENERAL)
    identify_elements: bool = Field(
        default=True,
        description="Whether to return individual elements",
    )


class ElementInteractivityResponse(BaseModel):
    """Response from element interactivity analysis."""
    interactivity_score: float = Field(..., ge=0.0, le=1.0)
    element_count: int = Field(..., ge=0)
    interacting_elements: int = Field(..., ge=0)
    elements: Optional[List[Dict[str, Any]]] = None
    interaction_patterns: List[str] = []
    cognitive_operations_required: List[str] = []


# =============================================================================
# Extraneous Load Schemas
# =============================================================================


class UIElement(BaseModel):
    """Description of a UI element."""
    element_type: str
    position: Optional[Dict[str, int]] = None
    size: Optional[Dict[str, int]] = None
    is_distracting: bool = False
    relevance_score: float = Field(default=1.0, ge=0.0, le=1.0)


class ExtraneousLoadRequest(BaseModel):
    """Request for extraneous load detection."""
    learner_id: str = Field(..., description="Learner identifier")
    session_id: Optional[str] = Field(None, description="Session identifier")
    ui_description: Optional[str] = Field(
        None,
        description="Description of the UI/presentation",
    )
    navigation_depth: int = Field(
        default=0,
        ge=0,
        description="Current navigation depth",
    )
    visible_elements: List[UIElement] = Field(
        default=[],
        description="Currently visible UI elements",
    )
    distractors_present: List[str] = Field(
        default=[],
        description="Known distracting elements",
    )
    split_attention_sources: List[str] = Field(
        default=[],
        description="Sources requiring split attention",
    )


class ExtraneousLoadResponse(BaseModel):
    """Response from extraneous load detection."""
    extraneous_load: float = Field(..., ge=0.0, le=1.0)
    load_level: LoadLevel
    issues_detected: List[Dict[str, Any]] = []
    visual_clutter_score: float = Field(default=0.0, ge=0.0, le=1.0)
    split_attention_score: float = Field(default=0.0, ge=0.0, le=1.0)
    redundancy_score: float = Field(default=0.0, ge=0.0, le=1.0)
    navigation_complexity: float = Field(default=0.0, ge=0.0, le=1.0)
    recommendations: List[str] = []
    processing_time_ms: int


class UIAnalysisRequest(BaseModel):
    """Request for UI/presentation analysis."""
    screenshot_base64: Optional[str] = Field(
        None,
        description="Base64 encoded screenshot",
    )
    layout_description: Optional[Dict[str, Any]] = Field(
        None,
        description="Structured layout description",
    )
    content_areas: List[Dict[str, Any]] = Field(
        default=[],
        description="Defined content areas",
    )


class UIAnalysisResponse(BaseModel):
    """Response from UI analysis."""
    layout_score: float = Field(..., ge=0.0, le=1.0)
    issues: List[Dict[str, Any]] = []
    suggested_improvements: List[str] = []
    accessibility_concerns: List[str] = []
    processing_time_ms: int


# =============================================================================
# Working Memory Schemas
# =============================================================================


class MemoryChunk(BaseModel):
    """A chunk of information in working memory."""
    chunk_id: str
    content: str
    complexity: float = Field(default=0.5, ge=0.0, le=1.0)
    age_seconds: float = Field(default=0.0, ge=0.0)
    activation_level: float = Field(default=1.0, ge=0.0, le=1.0)
    related_chunks: List[str] = []


class WorkingMemoryRequest(BaseModel):
    """Request for working memory model estimation."""
    learner_id: str = Field(..., description="Learner identifier")
    session_id: Optional[str] = None
    current_content: str = Field(..., description="Current content being processed")
    recent_content: List[str] = Field(
        default=[],
        description="Recently presented content items",
    )
    time_on_task_seconds: float = Field(default=0.0, ge=0.0)
    response_latencies: List[float] = Field(
        default=[],
        description="Recent response times in seconds",
    )
    error_count: int = Field(default=0, ge=0)
    learner_wm_capacity: Optional[int] = Field(
        None,
        ge=3,
        le=9,
        description="Known WM capacity (default: 7)",
    )


class WorkingMemoryResponse(BaseModel):
    """Response from working memory estimation."""
    estimated_load: float = Field(..., ge=0.0, le=1.0)
    capacity_used: float = Field(..., ge=0.0, le=1.0)
    estimated_capacity: int = Field(..., ge=3, le=9)
    chunks_in_memory: int = Field(..., ge=0)
    active_chunks: List[MemoryChunk] = []
    decay_prediction: Dict[str, float] = Field(
        default={},
        description="Predicted chunk activation over time",
    )
    overload_risk: float = Field(..., ge=0.0, le=1.0)
    recommendations: List[str] = []
    processing_time_ms: int


class MemoryLoadUpdate(BaseModel):
    """Update to memory load during session."""
    learner_id: str
    session_id: str
    new_content: Optional[str] = None
    content_completed: Optional[str] = None
    error_occurred: bool = False
    help_requested: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# Cognitive Load Estimation Schemas
# =============================================================================


class InteractionSignal(BaseModel):
    """A single interaction signal."""
    signal_type: str  # response_time, error, help_request, navigation, etc.
    value: float
    timestamp: datetime
    context: Optional[Dict[str, Any]] = None


class InteractionDataRequest(BaseModel):
    """Request for cognitive load estimation from interactions."""
    learner_id: str = Field(..., description="Learner identifier")
    session_id: Optional[str] = None
    response_times: List[float] = Field(
        default=[],
        description="Response times in seconds",
    )
    error_rates: List[float] = Field(
        default=[],
        description="Error rates (0-1) per task",
    )
    help_requests: int = Field(default=0, ge=0)
    backtracking_count: int = Field(default=0, ge=0)
    time_on_task: float = Field(default=0.0, ge=0.0)
    interaction_signals: List[InteractionSignal] = Field(
        default=[],
        description="Detailed interaction signals",
    )
    content_complexity: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Known content complexity",
    )


class CognitiveLoadResponse(BaseModel):
    """Response from cognitive load estimation."""
    intrinsic_load: float = Field(..., ge=0.0, le=1.0)
    extraneous_load: float = Field(..., ge=0.0, le=1.0)
    germane_load: float = Field(..., ge=0.0, le=1.0)
    total_load: float = Field(..., ge=0.0, le=1.0)
    load_level: LoadLevel
    confidence: float = Field(..., ge=0.0, le=1.0)
    contributing_factors: Dict[str, float] = {}
    trend: str = Field(
        default="stable",
        description="Load trend: increasing, stable, decreasing",
    )
    recommendation: str = Field(..., description="Primary recommendation")
    processing_time_ms: int


class LoadEstimateRequest(BaseModel):
    """Request for quick load estimate."""
    learner_id: str
    current_task_complexity: float = Field(..., ge=0.0, le=1.0)
    recent_performance: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Recent performance score",
    )


class LoadHistoryResponse(BaseModel):
    """Response with load history."""
    learner_id: str
    session_id: Optional[str] = None
    load_history: List[Dict[str, Any]] = []
    average_load: float = Field(..., ge=0.0, le=1.0)
    peak_load: float = Field(..., ge=0.0, le=1.0)
    time_in_overload_seconds: float = Field(default=0.0, ge=0.0)
    load_pattern: str = Field(default="unknown")


# =============================================================================
# Overload Prediction Schemas
# =============================================================================


class OverloadPredictionRequest(BaseModel):
    """Request for overload prediction."""
    learner_id: str = Field(..., description="Learner identifier")
    session_id: Optional[str] = None
    current_load: float = Field(..., ge=0.0, le=1.0)
    load_history: List[float] = Field(
        default=[],
        description="Recent load measurements",
    )
    upcoming_content_complexity: List[float] = Field(
        default=[],
        description="Complexity of upcoming content items",
    )
    time_remaining_seconds: Optional[float] = None
    fatigue_indicators: Dict[str, float] = Field(
        default={},
        description="Indicators of learner fatigue",
    )


class OverloadPredictionResponse(BaseModel):
    """Response from overload prediction."""
    overload_probability: float = Field(..., ge=0.0, le=1.0)
    predicted_time_to_overload_seconds: Optional[float] = None
    warning_level: str = Field(
        ...,
        description="none, low, medium, high, critical",
    )
    risk_factors: List[str] = []
    preventive_actions: List[str] = []
    confidence: float = Field(..., ge=0.0, le=1.0)
    processing_time_ms: int


class LoadTrendRequest(BaseModel):
    """Request for load trend analysis."""
    learner_id: str
    session_id: Optional[str] = None
    window_size_seconds: int = Field(default=300, ge=60, le=3600)


class LoadTrendResponse(BaseModel):
    """Response from load trend analysis."""
    trend_direction: str  # increasing, stable, decreasing
    trend_slope: float
    volatility: float = Field(..., ge=0.0, le=1.0)
    stability_score: float = Field(..., ge=0.0, le=1.0)
    predicted_load_5min: float = Field(..., ge=0.0, le=1.0)
    predicted_load_15min: float = Field(..., ge=0.0, le=1.0)
    anomalies_detected: List[Dict[str, Any]] = []


# =============================================================================
# Scaffolding Schemas
# =============================================================================


class ScaffoldingRequest(BaseModel):
    """Request for scaffolding recommendations."""
    learner_id: str = Field(..., description="Learner identifier")
    content_id: Optional[str] = None
    current_content: str = Field(..., description="Current content/problem")
    current_load: float = Field(..., ge=0.0, le=1.0)
    learner_knowledge_state: Optional[Dict[str, float]] = Field(
        None,
        description="Learner's knowledge state by concept",
    )
    previous_scaffolds_used: List[ScaffoldType] = Field(
        default=[],
        description="Scaffolds already applied",
    )
    learning_objective: Optional[str] = None
    domain: Domain = Field(default=Domain.GENERAL)
    max_scaffolds: int = Field(default=3, ge=1, le=5)


class ScaffoldRecommendation(BaseModel):
    """A single scaffolding recommendation."""
    scaffold_type: ScaffoldType
    priority: int = Field(..., ge=1, le=5)
    content: str = Field(..., description="The scaffold content")
    rationale: str = Field(..., description="Why this scaffold is recommended")
    expected_load_reduction: float = Field(..., ge=0.0, le=0.5)
    target_concept: Optional[str] = None


class ScaffoldingResponse(BaseModel):
    """Response from scaffolding generator."""
    scaffolds: List[ScaffoldRecommendation] = []
    total_expected_load_reduction: float = Field(..., ge=0.0, le=1.0)
    scaffolding_level: int = Field(..., ge=1, le=5)
    fade_recommendation: Optional[str] = None
    processing_time_ms: int


# =============================================================================
# Pacing Schemas
# =============================================================================


class ContentItem(BaseModel):
    """A content item for pacing."""
    content_id: str
    title: Optional[str] = None
    complexity: float = Field(..., ge=0.0, le=1.0)
    estimated_duration_seconds: int = Field(default=300, ge=0)
    prerequisites: List[str] = []


class PacingRequest(BaseModel):
    """Request for pacing recommendations."""
    learner_id: str = Field(..., description="Learner identifier")
    current_load: float = Field(..., ge=0.0, le=1.0)
    upcoming_content: List[ContentItem] = Field(
        ...,
        description="Upcoming content items",
    )
    session_duration_remaining_seconds: Optional[int] = None
    learner_pace_preference: Optional[str] = Field(
        None,
        description="slow, normal, fast",
    )
    fatigue_level: float = Field(default=0.0, ge=0.0, le=1.0)


class PacingResponse(BaseModel):
    """Response from pacing optimizer."""
    recommended_pace: str = Field(..., description="slow, normal, fast")
    break_suggested: bool = Field(default=False)
    break_duration_seconds: Optional[int] = None
    content_order: List[str] = Field(
        ...,
        description="Recommended content order (content_ids)",
    )
    time_per_item: Dict[str, int] = Field(
        ...,
        description="Recommended time per content item",
    )
    items_to_skip: List[str] = Field(
        default=[],
        description="Content items to skip or defer",
    )
    rationale: str = Field(..., description="Explanation for recommendations")
    processing_time_ms: int


# =============================================================================
# Mental Model Schemas
# =============================================================================


class LearnerResponse(BaseModel):
    """A learner's response to a question/prompt."""
    response_id: str
    prompt: str
    response_text: str
    response_time_seconds: float
    confidence_self_report: Optional[float] = Field(None, ge=0.0, le=1.0)


class MentalModelRequest(BaseModel):
    """Request for mental model assessment."""
    learner_id: str = Field(..., description="Learner identifier")
    concept: str = Field(..., description="Concept being assessed")
    responses: List[LearnerResponse] = Field(
        ...,
        description="Learner's responses",
    )
    expected_understanding: Optional[Dict[str, Any]] = Field(
        None,
        description="Expected mental model structure",
    )
    domain: Domain = Field(default=Domain.GENERAL)


class MentalModelResponse(BaseModel):
    """Response from mental model assessment."""
    concept: str
    completeness: float = Field(..., ge=0.0, le=1.0)
    accuracy: float = Field(..., ge=0.0, le=1.0)
    coherence: float = Field(..., ge=0.0, le=1.0)
    overall_score: float = Field(..., ge=0.0, le=1.0)
    misconceptions: List[Dict[str, Any]] = []
    gaps: List[str] = []
    strengths: List[str] = []
    recommended_interventions: List[str] = []
    germane_load_opportunity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Opportunity for productive learning",
    )
    processing_time_ms: int


# =============================================================================
# Adaptation Schemas
# =============================================================================


class AdaptationAction(BaseModel):
    """A single adaptation action."""
    action_type: AdaptationType
    priority: int = Field(..., ge=1, le=5)
    description: str
    parameters: Dict[str, Any] = {}
    expected_effect: str
    reversible: bool = True


class AdaptationRequest(BaseModel):
    """Request for adaptation recommendations."""
    learner_id: str = Field(..., description="Learner identifier")
    session_id: Optional[str] = None
    current_load: CognitiveLoadResponse
    current_context: Dict[str, Any] = Field(
        default={},
        description="Current learning context",
    )
    available_adaptations: List[AdaptationType] = Field(
        default=[],
        description="Adaptations available in the system",
    )
    learner_preferences: Dict[str, Any] = Field(
        default={},
        description="Learner preferences",
    )
    recent_adaptations: List[AdaptationType] = Field(
        default=[],
        description="Recently applied adaptations",
    )


class AdaptationResponse(BaseModel):
    """Response from adaptation engine."""
    adaptations: List[AdaptationAction] = []
    urgency: str = Field(
        ...,
        description="low, medium, high, critical",
    )
    expected_load_after: float = Field(..., ge=0.0, le=1.0)
    fallback_plan: Optional[str] = None
    processing_time_ms: int


# =============================================================================
# Session Management Schemas
# =============================================================================


class SessionStartRequest(BaseModel):
    """Request to start a cognitive load tracking session."""
    learner_id: str = Field(..., description="Learner identifier")
    session_type: str = Field(
        default="learning",
        description="Type of session",
    )
    expected_duration_minutes: Optional[int] = Field(None, ge=1, le=180)
    content_domain: Optional[Domain] = None
    initial_content_complexity: Optional[float] = Field(None, ge=0.0, le=1.0)
    learner_baseline: Optional[Dict[str, float]] = None


class SessionUpdateRequest(BaseModel):
    """Request to update session state."""
    session_id: str = Field(..., description="Session identifier")
    learner_id: str = Field(..., description="Learner identifier")
    interaction_data: Optional[InteractionDataRequest] = None
    content_update: Optional[str] = None
    event_type: str = Field(
        default="update",
        description="Type of update event",
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SessionSummaryResponse(BaseModel):
    """Response with session summary."""
    session_id: str
    learner_id: str
    duration_seconds: int
    average_load: float = Field(..., ge=0.0, le=1.0)
    peak_load: float = Field(..., ge=0.0, le=1.0)
    time_in_optimal_zone_seconds: int
    time_in_overload_seconds: int
    overload_events: int
    scaffolds_provided: int
    adaptations_made: int
    load_over_time: List[Dict[str, Any]] = []
    key_insights: List[str] = []
    recommendations_for_next_session: List[str] = []
