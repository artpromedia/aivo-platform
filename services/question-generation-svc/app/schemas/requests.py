"""
Pydantic schemas for API request/response validation.

Defines all input and output models for the Question Generation Service.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


class QuestionType(str, Enum):
    """Types of questions that can be generated."""

    FACTUAL = "factual"
    INFERENTIAL = "inferential"
    CONCEPTUAL = "conceptual"
    PROCEDURAL = "procedural"
    MCQ = "mcq"
    SHORT_ANSWER = "short_answer"
    TRUE_FALSE = "true_false"
    CLOZE = "cloze"


class BloomLevel(str, Enum):
    """Bloom's Taxonomy cognitive levels."""

    REMEMBER = "remember"
    UNDERSTAND = "understand"
    APPLY = "apply"
    ANALYZE = "analyze"
    EVALUATE = "evaluate"
    CREATE = "create"


# =============================================================================
# Question Generation Schemas
# =============================================================================


class GenerateQuestionsRequest(BaseModel):
    """Request model for generating questions from a passage."""

    passage: str = Field(
        ...,
        min_length=50,
        max_length=5000,
        description="Source text to generate questions from",
    )
    num_questions: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of questions to generate",
    )
    question_types: List[QuestionType] = Field(
        default=[QuestionType.FACTUAL, QuestionType.INFERENTIAL],
        description="Types of questions to generate",
    )
    difficulty_target: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Target difficulty level (0=easy, 1=hard)",
    )
    grade_level: Optional[int] = Field(
        default=None,
        ge=1,
        le=12,
        description="Target grade level (1-12)",
    )
    subject: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Subject area (math, science, history, etc.)",
    )
    curriculum_standards: Optional[List[str]] = Field(
        default=None,
        description="Curriculum standards to align questions to",
    )
    include_distractors: bool = Field(
        default=False,
        description="Include distractors for MCQ questions",
    )

    @field_validator("passage")
    @classmethod
    def validate_passage(cls, v: str) -> str:
        """Validate passage has sufficient content."""
        words = v.split()
        if len(words) < 10:
            raise ValueError("Passage must contain at least 10 words")
        return v


class GeneratedQuestion(BaseModel):
    """A single generated question with metadata."""

    question_id: str = Field(
        default_factory=lambda: str(uuid4()),
        description="Unique identifier for the question",
    )
    question_text: str = Field(
        ...,
        description="The generated question text",
    )
    answer: str = Field(
        ...,
        description="The correct answer",
    )
    distractors: Optional[List[str]] = Field(
        default=None,
        description="Wrong answer options for MCQ",
    )
    question_type: QuestionType = Field(
        ...,
        description="Type of question",
    )
    difficulty_estimate: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Estimated difficulty (0=easy, 1=hard)",
    )
    bloom_level: BloomLevel = Field(
        ...,
        description="Bloom's Taxonomy cognitive level",
    )
    source_span: Tuple[int, int] = Field(
        ...,
        description="Character positions in source passage",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model confidence score",
    )
    quality_score: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Quality assessment score",
    )
    curriculum_alignment: Optional[List[str]] = Field(
        default=None,
        description="Aligned curriculum standards",
    )


class GenerateQuestionsResponse(BaseModel):
    """Response model for question generation."""

    request_id: str = Field(
        default_factory=lambda: str(uuid4()),
        description="Unique request identifier",
    )
    questions: List[GeneratedQuestion] = Field(
        ...,
        description="List of generated questions",
    )
    generation_time_ms: int = Field(
        ...,
        ge=0,
        description="Generation time in milliseconds",
    )
    model_version: str = Field(
        ...,
        description="Model version used for generation",
    )
    passage_summary: Optional[str] = Field(
        default=None,
        description="Brief summary of the source passage",
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional metadata",
    )


# =============================================================================
# MCQ Generation Schemas
# =============================================================================


class GenerateMCQRequest(BaseModel):
    """Request model for generating multiple choice questions."""

    passage: str = Field(
        ...,
        min_length=50,
        max_length=5000,
        description="Source text for MCQ generation",
    )
    num_questions: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of MCQ items to generate",
    )
    num_distractors: int = Field(
        default=3,
        ge=2,
        le=5,
        description="Number of distractors per question",
    )
    difficulty_target: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Target difficulty level",
    )
    grade_level: Optional[int] = Field(
        default=None,
        ge=1,
        le=12,
        description="Target grade level",
    )
    shuffle_options: bool = Field(
        default=True,
        description="Shuffle answer options",
    )


class MCQItem(BaseModel):
    """A single multiple choice question item."""

    question_id: str = Field(
        default_factory=lambda: str(uuid4()),
    )
    stem: str = Field(
        ...,
        description="The question stem",
    )
    correct_answer: str = Field(
        ...,
        description="The correct answer",
    )
    distractors: List[str] = Field(
        ...,
        min_length=2,
        max_length=5,
        description="Wrong answer options",
    )
    options: List[str] = Field(
        ...,
        description="All options (correct + distractors)",
    )
    correct_index: int = Field(
        ...,
        ge=0,
        description="Index of correct answer in options",
    )
    difficulty: float = Field(
        ...,
        ge=0.0,
        le=1.0,
    )
    bloom_level: BloomLevel = Field(...)
    distractor_quality: List[float] = Field(
        default=[],
        description="Quality scores for each distractor",
    )


class GenerateMCQResponse(BaseModel):
    """Response model for MCQ generation."""

    request_id: str = Field(default_factory=lambda: str(uuid4()))
    questions: List[MCQItem] = Field(...)
    generation_time_ms: int = Field(...)
    model_version: str = Field(...)


# =============================================================================
# Cloze Generation Schemas
# =============================================================================


class GenerateClozeRequest(BaseModel):
    """Request model for generating cloze (fill-in-blank) items."""

    passage: str = Field(
        ...,
        min_length=50,
        max_length=5000,
        description="Source text for cloze generation",
    )
    num_items: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of cloze items to generate",
    )
    blank_strategy: str = Field(
        default="key_terms",
        description="Strategy for selecting blanks (key_terms, entities, definitions)",
    )
    include_hints: bool = Field(
        default=True,
        description="Include hints for blanks",
    )
    grade_level: Optional[int] = Field(
        default=None,
        ge=1,
        le=12,
    )


class ClozeItem(BaseModel):
    """A single cloze (fill-in-blank) item."""

    item_id: str = Field(default_factory=lambda: str(uuid4()))
    text_with_blank: str = Field(
        ...,
        description="Text with _____ marking the blank",
    )
    answer: str = Field(
        ...,
        description="The correct answer for the blank",
    )
    hint: Optional[str] = Field(
        default=None,
        description="Hint for the answer",
    )
    difficulty: float = Field(
        ...,
        ge=0.0,
        le=1.0,
    )
    blank_type: str = Field(
        ...,
        description="Type of blank (entity, term, concept)",
    )
    context_sentence: str = Field(
        ...,
        description="Original sentence with the answer",
    )


class GenerateClozeResponse(BaseModel):
    """Response model for cloze generation."""

    request_id: str = Field(default_factory=lambda: str(uuid4()))
    items: List[ClozeItem] = Field(...)
    generation_time_ms: int = Field(...)
    model_version: str = Field(...)


# =============================================================================
# Quality Scoring Schemas
# =============================================================================


class QualityScoreRequest(BaseModel):
    """Request model for scoring question quality."""

    question: str = Field(
        ...,
        min_length=5,
        description="The question to score",
    )
    answer: str = Field(
        ...,
        min_length=1,
        description="The answer to the question",
    )
    passage: str = Field(
        ...,
        min_length=20,
        description="The source passage",
    )
    distractors: Optional[List[str]] = Field(
        default=None,
        description="Distractors if MCQ",
    )


class QualityScoreResponse(BaseModel):
    """Response model for quality scoring."""

    overall_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Overall quality score",
    )
    answerability: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Can question be answered from passage?",
    )
    fluency: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Grammatical quality",
    )
    relevance: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Relevance to main content",
    )
    difficulty_estimate: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Predicted difficulty",
    )
    specificity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="How specific is the question",
    )
    is_acceptable: bool = Field(
        ...,
        description="Meets minimum quality threshold",
    )
    issues: List[str] = Field(
        default=[],
        description="Identified quality issues",
    )


# =============================================================================
# Distractor Generation Schemas
# =============================================================================


class GenerateDistractorsRequest(BaseModel):
    """Request model for generating distractors."""

    question: str = Field(
        ...,
        description="The question text",
    )
    correct_answer: str = Field(
        ...,
        description="The correct answer",
    )
    context: Optional[str] = Field(
        default=None,
        description="Optional context/passage",
    )
    num_distractors: int = Field(
        default=3,
        ge=2,
        le=5,
        description="Number of distractors to generate",
    )
    subject: Optional[str] = Field(
        default=None,
        description="Subject area for better distractors",
    )


class Distractor(BaseModel):
    """A single distractor with metadata."""

    text: str = Field(..., description="The distractor text")
    similarity_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Semantic similarity to correct answer",
    )
    generation_method: str = Field(
        ...,
        description="Method used to generate (semantic, wordnet, entity)",
    )
    quality_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Quality score",
    )


class GenerateDistractorsResponse(BaseModel):
    """Response model for distractor generation."""

    distractors: List[Distractor] = Field(...)
    generation_time_ms: int = Field(...)


# =============================================================================
# Bloom's Classification Schemas
# =============================================================================


class BloomClassifyRequest(BaseModel):
    """Request for Bloom's taxonomy classification."""

    question: str = Field(
        ...,
        min_length=5,
        description="Question to classify",
    )


class BloomClassifyResponse(BaseModel):
    """Response for Bloom's taxonomy classification."""

    primary_level: BloomLevel = Field(
        ...,
        description="Primary Bloom's level",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Classification confidence",
    )
    level_probabilities: Dict[str, float] = Field(
        ...,
        description="Probability for each level",
    )


# =============================================================================
# Difficulty Estimation Schemas
# =============================================================================


class DifficultyEstimateRequest(BaseModel):
    """Request for difficulty estimation."""

    question: str = Field(..., description="The question")
    answer: str = Field(..., description="The answer")
    distractors: Optional[List[str]] = Field(
        default=None,
        description="Distractors if MCQ",
    )


class DifficultyEstimateResponse(BaseModel):
    """Response for difficulty estimation."""

    difficulty: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Estimated difficulty (0=easy, 1=hard)",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
    )
    factors: Dict[str, float] = Field(
        ...,
        description="Contributing factors",
    )
    estimated_p_correct: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Estimated probability of correct response",
    )
    grade_level_estimate: Optional[int] = Field(
        default=None,
        description="Estimated appropriate grade level",
    )


# =============================================================================
# Health Check Schemas
# =============================================================================


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Check timestamp",
    )


class ReadinessResponse(BaseModel):
    """Readiness check response with dependencies."""

    status: str = Field(..., description="Ready status")
    dependencies: Dict[str, Dict[str, str]] = Field(
        ...,
        description="Dependency status",
    )
    models_loaded: bool = Field(
        ...,
        description="Whether ML models are loaded",
    )
