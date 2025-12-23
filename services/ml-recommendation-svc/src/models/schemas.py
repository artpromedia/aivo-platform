"""
Pydantic models for recommendation requests and responses.
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class RecommendationType(str, Enum):
    """Types of recommendations."""

    ACTIVITY = "activity"
    SKILL = "skill"
    CONTENT = "content"
    ASSESSMENT = "assessment"


class LearnerContext(BaseModel):
    """Context information about a learner."""

    learner_id: str
    tenant_id: str
    grade_level: int | None = None
    current_skill_id: str | None = None
    session_duration_minutes: int | None = None
    time_of_day: str | None = None  # morning, afternoon, evening
    device_type: str | None = None
    neurodiverse_profile: dict[str, Any] | None = None


class SkillMastery(BaseModel):
    """Skill mastery information."""

    skill_id: str
    skill_code: str
    mastery_level: float = Field(ge=0, le=1)
    practice_count: int = 0
    last_practiced_at: datetime | None = None
    bkt_p_know: float | None = None


class RecommendationRequest(BaseModel):
    """Request for recommendations."""

    learner: LearnerContext
    skill_masteries: list[SkillMastery] = []
    recommendation_type: RecommendationType = RecommendationType.ACTIVITY
    limit: int = Field(default=10, ge=1, le=50)
    exclude_ids: list[str] = []
    domain_filter: str | None = None
    difficulty_range: tuple[float, float] | None = None


class RecommendedItem(BaseModel):
    """A single recommended item."""

    item_id: str
    item_type: str
    score: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    reason: str
    metadata: dict[str, Any] = {}
    
    # Component scores for explainability
    collaborative_score: float | None = None
    content_score: float | None = None
    knowledge_tracing_score: float | None = None
    exploration_bonus: float | None = None


class RecommendationResponse(BaseModel):
    """Response containing recommendations."""

    learner_id: str
    recommendation_type: RecommendationType
    items: list[RecommendedItem]
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    model_version: str = "1.0.0"
    processing_time_ms: float


class FeedbackType(str, Enum):
    """Types of recommendation feedback."""

    CLICKED = "clicked"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    RATED = "rated"


class RecommendationFeedback(BaseModel):
    """Feedback on a recommendation."""

    learner_id: str
    tenant_id: str
    item_id: str
    recommendation_type: RecommendationType
    feedback_type: FeedbackType
    rating: float | None = Field(default=None, ge=0, le=5)
    time_spent_seconds: int | None = None
    completed: bool = False
    metadata: dict[str, Any] = {}


class SkillRecommendation(BaseModel):
    """Skill practice recommendation."""

    skill_id: str
    skill_code: str
    display_name: str
    domain: str
    priority_score: float
    reason: str
    estimated_practices_needed: int
    current_mastery: float
    target_mastery: float = 0.95


class ContentRecommendation(BaseModel):
    """Content recommendation."""

    content_id: str
    title: str
    content_type: str
    difficulty: float
    relevance_score: float
    prerequisite_met: bool
    estimated_duration_minutes: int | None = None
    skills_covered: list[str] = []
