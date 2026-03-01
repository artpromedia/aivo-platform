"""
Learner Profile & Metrics Pydantic Schemas.

API validation schemas for learner data used across services.
Matches the data contracts expected by:
- learner-model-svc (TS)
- ai-inference-svc (Python)
- assessment-svc (TS)
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class LearnerMetricsSchema(BaseModel):
    """Aggregated learning metrics for a student."""

    mastery_probability: float = Field(
        ..., ge=0.0, le=1.0, description="Current mastery probability (BKT)"
    )
    accuracy: float = Field(
        ..., ge=0.0, le=1.0, description="Overall accuracy rate"
    )
    total_attempts: int = Field(..., ge=0, description="Total learning attempts")
    streak: int = Field(0, ge=0, description="Current correct-answer streak")
    average_time_seconds: float = Field(
        0.0, ge=0.0, description="Average response time in seconds"
    )
    skills_mastered: int = Field(0, ge=0, description="Number of skills mastered")
    skills_in_progress: int = Field(0, ge=0, description="Skills currently in progress")
    last_active: Optional[datetime] = Field(
        None, description="Last activity timestamp"
    )

    model_config = {"json_schema_extra": {"examples": [
        {
            "mastery_probability": 0.85,
            "accuracy": 0.78,
            "total_attempts": 142,
            "streak": 5,
            "average_time_seconds": 18.3,
            "skills_mastered": 12,
            "skills_in_progress": 4,
            "last_active": "2026-02-28T14:30:00Z",
        }
    ]}}


class LearnerProfileSchema(BaseModel):
    """
    Learner profile for API communication.

    Carries identity, grade-level, and learning preference data
    used by adaptive-learning and AI inference services.
    """

    student_id: UUID = Field(..., description="Student UUID")
    tenant_id: Optional[UUID] = Field(None, description="District/tenant UUID")
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)

    grade_level: int = Field(
        ..., ge=0, le=12, description="Grade level (K=0, 1-12)"
    )
    age: Optional[int] = Field(None, ge=3, le=21, description="Student age")

    subjects: List[str] = Field(
        default_factory=list,
        description="Enrolled subject areas (e.g. MATH, ELA, SCIENCE)",
    )
    learning_style: Optional[str] = Field(
        None,
        description="Preferred learning style (visual, auditory, kinesthetic, reading)",
    )
    accommodations: List[str] = Field(
        default_factory=list,
        description="Active accommodation codes (IEP/504)",
    )
    preferred_language: str = Field(
        "en", max_length=10, description="ISO 639-1 language code"
    )

    # Aggregated metrics (optional — populated on read, omitted on create)
    metrics: Optional[LearnerMetricsSchema] = Field(
        None, description="Aggregated learning metrics"
    )

    # Metadata
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional unstructured metadata",
    )

    @field_validator("learning_style")
    @classmethod
    def validate_learning_style(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {"visual", "auditory", "kinesthetic", "reading"}
            if v.lower() not in allowed:
                raise ValueError(f"learning_style must be one of {allowed}")
            return v.lower()
        return v

    model_config = {"from_attributes": True}
