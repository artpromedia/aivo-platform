"""
Assessment Request/Response Pydantic Schemas.

API validation schemas for assessment operations used by
assessment-svc and adaptive-learning orchestrators.
"""

from datetime import datetime
from enum import StrEnum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class DifficultyLevel(StrEnum):
    """Assessment difficulty tiers."""

    BELOW_GRADE = "below_grade"
    ON_GRADE = "on_grade"
    ABOVE_GRADE = "above_grade"


class AssessmentType(StrEnum):
    """Types of assessments."""

    DIAGNOSTIC = "diagnostic"
    FORMATIVE = "formative"
    SUMMATIVE = "summative"
    PRACTICE = "practice"
    BENCHMARK = "benchmark"


class AssessmentRequestSchema(BaseModel):
    """
    Request to generate or retrieve an assessment.

    Used by assessment-svc and adaptive-learning orchestrator
    to create personalised assessments for learners.
    """

    student_id: UUID = Field(..., description="Target student UUID")
    subject: str = Field(
        ..., min_length=1, max_length=50, description="Subject area (MATH, ELA, etc.)"
    )
    grade_level: int = Field(..., ge=0, le=12, description="Grade level (K=0)")
    assessment_type: AssessmentType = Field(
        AssessmentType.FORMATIVE, description="Type of assessment"
    )
    difficulty: DifficultyLevel = Field(
        DifficultyLevel.ON_GRADE, description="Difficulty tier"
    )
    num_questions: int = Field(
        10, ge=1, le=50, description="Number of questions"
    )
    skills: List[str] = Field(
        default_factory=list,
        description="Specific skills to assess (empty = auto-select)",
    )
    time_limit_minutes: Optional[int] = Field(
        None, ge=1, le=180, description="Time limit in minutes"
    )
    accommodations: List[str] = Field(
        default_factory=list,
        description="Accommodation codes to apply",
    )
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("subject")
    @classmethod
    def normalise_subject(cls, v: str) -> str:
        return v.strip().upper()


class QuestionResult(BaseModel):
    """Result for a single assessment question."""

    question_id: str = Field(..., description="Question identifier")
    skill: str = Field(..., description="Skill being assessed")
    correct: bool = Field(..., description="Whether the answer was correct")
    time_spent_seconds: float = Field(..., ge=0, description="Time on question")
    attempt_number: int = Field(1, ge=1, description="Attempt count")
    hint_used: bool = Field(False, description="Whether a hint was requested")
    confidence: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Self-reported confidence"
    )
    response_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Raw response payload",
    )


class AssessmentResponseSchema(BaseModel):
    """
    Assessment completion response.

    Returned after a student completes an assessment, carrying
    per-question results and aggregate scores.
    """

    assessment_id: UUID = Field(..., description="Assessment UUID")
    student_id: UUID = Field(..., description="Student UUID")
    subject: str = Field(...)
    assessment_type: AssessmentType = Field(...)

    # Results
    score: float = Field(
        ..., ge=0.0, le=100.0, description="Overall percentage score"
    )
    questions_total: int = Field(..., ge=1)
    questions_correct: int = Field(..., ge=0)
    results: List[QuestionResult] = Field(
        default_factory=list, description="Per-question results"
    )

    # Timing
    started_at: datetime = Field(...)
    completed_at: datetime = Field(...)
    duration_seconds: float = Field(..., ge=0)

    # Skill-level mastery deltas (skill → new mastery probability)
    mastery_updates: Dict[str, float] = Field(
        default_factory=dict,
        description="Post-assessment mastery probabilities per skill",
    )

    # Recommendations
    recommended_skills: List[str] = Field(
        default_factory=list,
        description="Skills recommended for further practice",
    )

    model_config = {"from_attributes": True}
