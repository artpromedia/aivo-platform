"""
IEP (Individualized Education Program) Pydantic Schemas.

API validation schemas for IEP goal and accommodation operations.
Matches the SQLAlchemy models in enterprise_core.compliance.iep.
"""

from datetime import date, datetime
from enum import StrEnum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ── Enums (mirror SQLAlchemy models) ─────────────────────────────


class GoalType(StrEnum):
    """IEP goal types aligned with IDEA requirements."""

    ACADEMIC = "academic"
    BEHAVIORAL = "behavioral"
    SOCIAL = "social"
    COMMUNICATION = "communication"
    MOTOR = "motor"
    SELF_HELP = "self_help"
    VOCATIONAL = "vocational"
    FUNCTIONAL = "functional"


class GoalStatus(StrEnum):
    """Goal lifecycle status."""

    DRAFT = "draft"
    ACTIVE = "active"
    MASTERED = "mastered"
    DISCONTINUED = "discontinued"
    AMENDED = "amended"


class ProgressTrend(StrEnum):
    """Progress trend analysis categories."""

    ACCELERATED = "accelerated"
    ON_TRACK = "on_track"
    SLOW = "slow"
    DECLINING = "declining"
    INSUFFICIENT_DATA = "insufficient_data"


# ── IEP Goal Schema ─────────────────────────────────────────────


class IEPGoalSchema(BaseModel):
    """
    API schema for IEP goals.

    Mirrors the SQLAlchemy IEPGoal model for CRUD operations.
    Supports SMART-framework goal tracking and progress reporting.
    """

    id: Optional[UUID] = Field(None, description="Goal UUID (set on read)")
    student_id: UUID = Field(..., description="Student UUID")
    tenant_id: Optional[UUID] = Field(None, description="District/tenant UUID")

    # Goal information
    goal_text: str = Field(
        ..., min_length=10, max_length=2000, description="SMART goal statement"
    )
    goal_type: GoalType = Field(..., description="Goal category")
    area: str = Field(
        ..., min_length=1, max_length=100, description="Subject/skill area"
    )

    # SMART components
    baseline: Dict[str, Any] = Field(
        ..., description="Baseline measurements (e.g. {'accuracy': 0.75})"
    )
    target: Dict[str, Any] = Field(
        ..., description="Target measurements (e.g. {'accuracy': 0.95})"
    )
    measurement_method: str = Field(
        ..., max_length=500, description="How progress is measured"
    )
    timeline_end: date = Field(..., description="Target completion date")

    # Progress tracking (populated on read)
    current_progress: Optional[float] = Field(
        None, ge=0.0, le=100.0, description="Progress percentage"
    )
    trend: Optional[ProgressTrend] = Field(None, description="Current trend")
    status: GoalStatus = Field(GoalStatus.DRAFT, description="Goal status")

    # SMART validation (auto-populated by AI analysis)
    smart_validation: Optional[Dict[str, Any]] = Field(
        None, description="SMART criteria validation results"
    )
    confidence_score: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="AI confidence in SMART compliance"
    )

    # Timestamps (read-only)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_validator("baseline", "target")
    @classmethod
    def non_empty_dict(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        if not v:
            raise ValueError("Must contain at least one measurement key")
        return v

    model_config = {"from_attributes": True}


# ── IEP Accommodation Schema ────────────────────────────────────


class IEPAccommodationSchema(BaseModel):
    """
    API schema for IEP accommodations.

    Documents accommodations and modifications provided to students
    under IDEA/Section 504 plans.
    """

    id: Optional[UUID] = Field(None, description="Accommodation UUID (set on read)")
    student_id: UUID = Field(..., description="Student UUID")
    tenant_id: Optional[UUID] = Field(None, description="District/tenant UUID")

    accommodation_text: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Description of the accommodation",
    )
    category: str = Field(
        ...,
        max_length=100,
        description="Category (testing, classroom, assignment, technology, etc.)",
    )
    setting: Optional[str] = Field(
        None, max_length=100, description="Setting where accommodation applies"
    )
    active: bool = Field(True, description="Whether the accommodation is active")

    # Timestamps (read-only)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        allowed = {
            "testing", "classroom", "assignment", "technology",
            "behavioral", "physical", "communication", "other",
        }
        normalised = v.strip().lower()
        if normalised not in allowed:
            raise ValueError(f"category must be one of {sorted(allowed)}")
        return normalised

    model_config = {"from_attributes": True}
