"""
Pydantic models for Writing Assessment Service API requests and responses.

Defines all request/response schemas for the assessment endpoints.
"""

from enum import Enum
from typing import Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


# =============================================================================
# Enums
# =============================================================================


class ScoringMode(str, Enum):
    """Essay scoring mode."""

    HOLISTIC = "holistic"
    TRAIT_BASED = "trait-based"


class FeedbackStyle(str, Enum):
    """Feedback generation style."""

    ENCOURAGING = "encouraging"
    DIRECT = "direct"
    DETAILED = "detailed"


class GrammarCategory(str, Enum):
    """Grammar error categories."""

    SPELLING = "spelling"
    GRAMMAR = "grammar"
    PUNCTUATION = "punctuation"
    CAPITALIZATION = "capitalization"
    STYLE = "style"
    WORDINESS = "wordiness"
    PASSIVE_VOICE = "passive_voice"
    CONFUSED_WORDS = "confused_words"


class WritingGenre(str, Enum):
    """Writing genre types."""

    ESSAY = "essay"
    NARRATIVE = "narrative"
    ARGUMENTATIVE = "argumentative"
    EXPOSITORY = "expository"
    DESCRIPTIVE = "descriptive"
    PERSUASIVE = "persuasive"
    RESEARCH = "research"


# =============================================================================
# Sub-models for Responses
# =============================================================================


class WeakTransition(BaseModel):
    """Weak transition between sentences."""

    sentence_index: int = Field(..., description="Index of sentence after weak transition")
    before_text: str = Field(..., description="Text before the transition")
    after_text: str = Field(..., description="Text after the transition")
    suggestion: str = Field(..., description="Suggested improvement")


class LocalCoherence(BaseModel):
    """Local coherence analysis within paragraphs."""

    coherence_score: float = Field(..., ge=0.0, le=1.0, description="Local coherence score")
    sentence_similarities: List[float] = Field(
        default_factory=list, description="Adjacent sentence similarity scores"
    )
    weak_transitions: List[WeakTransition] = Field(
        default_factory=list, description="Identified weak transitions"
    )


class GlobalCoherence(BaseModel):
    """Global coherence analysis across paragraphs."""

    structure_score: float = Field(..., ge=0.0, le=1.0, description="Structure score")
    has_clear_intro: bool = Field(..., description="Has clear introduction")
    has_clear_conclusion: bool = Field(..., description="Has clear conclusion")
    paragraph_topics: List[str] = Field(
        default_factory=list, description="Extracted paragraph topics"
    )
    topic_drift_score: float = Field(..., ge=0.0, le=1.0, description="Topic consistency")


class TransitionAnalysis(BaseModel):
    """Analysis of transitions in the text."""

    total_transitions: int = Field(..., description="Total transition words found")
    transition_types: Dict[str, int] = Field(
        default_factory=dict, description="Count by transition type"
    )
    missing_transition_locations: List[int] = Field(
        default_factory=list, description="Sentence indices missing transitions"
    )
    suggested_transitions: List[Dict[str, str]] = Field(
        default_factory=list, description="Suggested transitions"
    )


class CoherenceAnalysis(BaseModel):
    """Complete coherence analysis."""

    overall_score: float = Field(..., ge=0.0, le=1.0, description="Overall coherence score")
    local_coherence: LocalCoherence = Field(..., description="Local coherence analysis")
    global_coherence: GlobalCoherence = Field(..., description="Global coherence analysis")
    transition_analysis: TransitionAnalysis = Field(..., description="Transition analysis")


class GrammarError(BaseModel):
    """Single grammar error."""

    offset: int = Field(..., description="Character offset in text")
    length: int = Field(..., description="Length of error span")
    message: str = Field(..., description="Error message")
    category: GrammarCategory = Field(..., description="Error category")
    rule_id: str = Field(..., description="Rule identifier")
    replacements: List[str] = Field(default_factory=list, description="Suggested replacements")
    context: str = Field(..., description="Context around error")


class GrammarReport(BaseModel):
    """Complete grammar check report."""

    errors: List[GrammarError] = Field(default_factory=list, description="List of errors")
    error_density: float = Field(..., description="Errors per 100 words")
    by_category: Dict[str, int] = Field(
        default_factory=dict, description="Error counts by category"
    )
    total_errors: int = Field(..., description="Total number of errors")
    corrected_text: Optional[str] = Field(None, description="Auto-corrected text if requested")


class VocabularyLevel(BaseModel):
    """Vocabulary sophistication analysis."""

    average_word_length: float = Field(..., description="Average word length in characters")
    awl_coverage: float = Field(
        ..., ge=0.0, le=1.0, description="Academic Word List coverage"
    )
    rare_word_percentage: float = Field(
        ..., ge=0.0, le=1.0, description="Percentage of rare words"
    )
    grade_level_estimate: int = Field(..., ge=1, le=16, description="Estimated grade level")


class OverusedWord(BaseModel):
    """Information about an overused word."""

    word: str = Field(..., description="The overused word")
    count: int = Field(..., description="Number of occurrences")
    percentage: float = Field(..., description="Percentage of total words")
    suggestions: List[str] = Field(default_factory=list, description="Alternative words")


class SentenceStats(BaseModel):
    """Sentence length statistics."""

    mean: float = Field(..., description="Mean sentence length")
    std: float = Field(..., description="Standard deviation")
    min: int = Field(..., description="Minimum sentence length")
    max: int = Field(..., description="Maximum sentence length")


class StyleReport(BaseModel):
    """Complete style analysis report."""

    sentence_length_stats: SentenceStats = Field(..., description="Sentence length statistics")
    sentence_type_distribution: Dict[str, float] = Field(
        default_factory=dict, description="Distribution of sentence types"
    )
    vocabulary_level: VocabularyLevel = Field(..., description="Vocabulary analysis")
    voice_ratio: float = Field(
        ..., ge=0.0, le=1.0, description="Active voice ratio"
    )
    tone: str = Field(..., description="Detected writing tone")
    word_variety_score: float = Field(
        ..., ge=0.0, le=1.0, description="Type-token ratio"
    )
    overused_words: List[OverusedWord] = Field(
        default_factory=list, description="List of overused words"
    )
    sophisticated_words_used: List[str] = Field(
        default_factory=list, description="Sophisticated vocabulary used"
    )


class ComplexityFactor(BaseModel):
    """Factor contributing to text complexity."""

    factor: str = Field(..., description="Name of the complexity factor")
    value: float = Field(..., description="Measured value")
    impact: str = Field(..., description="Impact on readability: increases/decreases")
    description: str = Field(..., description="Description of the factor")


class ReadabilityProfile(BaseModel):
    """Complete readability analysis."""

    flesch_kincaid_grade: float = Field(..., description="Flesch-Kincaid Grade Level")
    flesch_reading_ease: float = Field(..., description="Flesch Reading Ease score")
    gunning_fog: float = Field(..., description="Gunning Fog Index")
    smog_index: float = Field(..., description="SMOG Index")
    coleman_liau: float = Field(..., description="Coleman-Liau Index")
    ari: float = Field(..., description="Automated Readability Index")
    dale_chall: float = Field(..., description="Dale-Chall Readability Score")
    average_grade_level: float = Field(..., description="Consensus grade level")
    target_audience: str = Field(..., description="Recommended target audience")
    complexity_factors: List[ComplexityFactor] = Field(
        default_factory=list, description="Factors affecting complexity"
    )


class TraitScore(BaseModel):
    """Score for a single writing trait."""

    trait_name: str = Field(..., description="Name of the trait")
    score: float = Field(..., description="Score for this trait")
    max_score: float = Field(..., description="Maximum possible score")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence in score")
    feedback: str = Field(default="", description="Feedback for this trait")


class HolisticScore(BaseModel):
    """Holistic essay score."""

    score: float = Field(..., description="Overall holistic score")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence in score")
    score_distribution: List[float] = Field(
        default_factory=list, description="Probability distribution over score levels"
    )
    comparable_percentile: int = Field(
        ..., ge=0, le=100, description="Percentile vs other students"
    )


class TraitScores(BaseModel):
    """Trait-based essay scores."""

    traits: Dict[str, TraitScore] = Field(default_factory=dict, description="Scores by trait")
    overall_score: float = Field(..., description="Weighted overall score")
    strengths: List[str] = Field(default_factory=list, description="Identified strengths")
    weaknesses: List[str] = Field(default_factory=list, description="Areas for improvement")


class FeedbackPoint(BaseModel):
    """Single feedback point."""

    area: str = Field(..., description="Area of feedback")
    description: str = Field(..., description="Detailed description")
    example_from_text: Optional[str] = Field(None, description="Example from student's text")


class Suggestion(BaseModel):
    """Specific improvement suggestion."""

    category: str = Field(..., description="Category of suggestion")
    original_text: str = Field(..., description="Original text to improve")
    suggestion: str = Field(..., description="Suggested improvement")
    explanation: str = Field(..., description="Why this improves the writing")


class WritingFeedback(BaseModel):
    """Complete writing feedback."""

    summary: str = Field(..., description="2-3 sentence overview")
    strengths: List[FeedbackPoint] = Field(default_factory=list, description="Writing strengths")
    areas_for_improvement: List[FeedbackPoint] = Field(
        default_factory=list, description="Areas to improve"
    )
    specific_suggestions: List[Suggestion] = Field(
        default_factory=list, description="Specific suggestions"
    )
    next_steps: List[str] = Field(default_factory=list, description="Recommended next steps")


# =============================================================================
# Request Models
# =============================================================================


class FullAssessmentRequest(BaseModel):
    """Request for complete writing assessment."""

    text: str = Field(..., min_length=50, max_length=10000, description="Student writing")
    prompt: Optional[str] = Field(None, description="Writing prompt")
    grade_level: Optional[int] = Field(None, ge=1, le=12, description="Expected grade level")
    genre: Optional[WritingGenre] = Field(None, description="Writing genre")
    rubric_id: Optional[str] = Field(None, description="Custom rubric reference")
    include_feedback: bool = Field(True, description="Include detailed feedback")
    scoring_mode: ScoringMode = Field(
        ScoringMode.HOLISTIC, description="Scoring mode"
    )

    @field_validator("text")
    @classmethod
    def validate_text_not_empty(cls, v: str) -> str:
        """Validate that text is not just whitespace."""
        if not v.strip():
            raise ValueError("Text cannot be empty or just whitespace")
        return v.strip()


class GrammarCheckRequest(BaseModel):
    """Request for grammar-only check."""

    text: str = Field(..., min_length=1, max_length=10000, description="Text to check")
    include_style: bool = Field(True, description="Include style issues")
    language: str = Field("en-US", description="Language code")
    auto_correct: bool = Field(False, description="Return auto-corrected text")


class ReadabilityRequest(BaseModel):
    """Request for readability-only analysis."""

    text: str = Field(..., min_length=50, max_length=10000, description="Text to analyze")
    target_grade: Optional[int] = Field(None, ge=1, le=16, description="Target grade level")


class FeedbackRequest(BaseModel):
    """Request for feedback generation."""

    assessment_id: str = Field(..., description="Reference to previous assessment")
    feedback_style: FeedbackStyle = Field(
        FeedbackStyle.ENCOURAGING, description="Feedback tone"
    )
    focus_areas: List[str] = Field(default_factory=list, description="Areas to focus on")
    max_suggestions: int = Field(5, ge=1, le=20, description="Maximum suggestions")


class StyleAnalysisRequest(BaseModel):
    """Request for style-only analysis."""

    text: str = Field(..., min_length=50, max_length=10000, description="Text to analyze")
    target_style: Optional[str] = Field(None, description="Target style (academic, etc.)")


class CoherenceAnalysisRequest(BaseModel):
    """Request for coherence-only analysis."""

    text: str = Field(..., min_length=50, max_length=10000, description="Text to analyze")
    include_suggestions: bool = Field(True, description="Include improvement suggestions")


# =============================================================================
# Response Models
# =============================================================================


class FullAssessmentResponse(BaseModel):
    """Response for complete writing assessment."""

    assessment_id: str = Field(
        default_factory=lambda: str(uuid4()), description="Unique assessment ID"
    )
    overall_score: float = Field(..., ge=0.0, le=100.0, description="Overall score 0-100")
    holistic_score: HolisticScore = Field(..., description="Holistic score details")
    trait_scores: Optional[TraitScores] = Field(None, description="Trait-based scores")
    grammar_report: GrammarReport = Field(..., description="Grammar analysis")
    coherence_analysis: CoherenceAnalysis = Field(..., description="Coherence analysis")
    style_report: StyleReport = Field(..., description="Style analysis")
    readability_profile: ReadabilityProfile = Field(..., description="Readability profile")
    feedback: Optional[WritingFeedback] = Field(None, description="Generated feedback")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")


class GrammarCheckResponse(BaseModel):
    """Response for grammar check."""

    report: GrammarReport = Field(..., description="Grammar check report")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")


class ReadabilityResponse(BaseModel):
    """Response for readability analysis."""

    profile: ReadabilityProfile = Field(..., description="Readability profile")
    comparison_to_target: Optional[Dict[str, float]] = Field(
        None, description="Comparison to target grade"
    )
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")


class StyleAnalysisResponse(BaseModel):
    """Response for style analysis."""

    report: StyleReport = Field(..., description="Style analysis report")
    suggestions: List[str] = Field(default_factory=list, description="Style suggestions")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")


class CoherenceAnalysisResponse(BaseModel):
    """Response for coherence analysis."""

    analysis: CoherenceAnalysis = Field(..., description="Coherence analysis")
    suggestions: List[str] = Field(default_factory=list, description="Improvement suggestions")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")


class FeedbackResponse(BaseModel):
    """Response for feedback generation."""

    feedback: WritingFeedback = Field(..., description="Generated feedback")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")


# =============================================================================
# Health and Status Models
# =============================================================================


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")


class ReadyResponse(BaseModel):
    """Readiness check response."""

    status: str = Field(..., description="Ready status")
    models_loaded: bool = Field(..., description="ML models loaded")
    dependencies: Dict[str, bool] = Field(
        default_factory=dict, description="Dependency status"
    )


class ModelStatusResponse(BaseModel):
    """Model status response."""

    models: Dict[str, Dict[str, str]] = Field(
        default_factory=dict, description="Status of each model"
    )
