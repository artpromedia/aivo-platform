"""
Pydantic models for Content Adaptation Engine.

This module defines the data models for multi-strategy content adaptation,
including strategies, content features, adaptation requests, and results.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, Field, field_validator


class AdaptationStrategy(str, Enum):
    """Types of content adaptation strategies."""

    REDUCE_DIFFICULTY = "reduce_difficulty"
    INCREASE_DIFFICULTY = "increase_difficulty"
    ADD_SCAFFOLDING = "add_scaffolding"
    REMOVE_SCAFFOLDING = "remove_scaffolding"
    SIMPLIFY_LANGUAGE = "simplify_language"
    ADD_VISUAL_AIDS = "add_visual_aids"
    STEP_BY_STEP = "step_by_step"
    ADD_EXAMPLES = "add_examples"
    CHANGE_FORMAT = "change_format"
    ADD_HINTS = "add_hints"
    REDUCE_COGNITIVE_LOAD = "reduce_cognitive_load"
    INCREASE_ENGAGEMENT = "increase_engagement"
    PROVIDE_REVIEW = "provide_review"


class ContentFormat(str, Enum):
    """Supported content formats."""

    TEXT = "text"
    VISUAL = "visual"
    AUDIO = "audio"
    INTERACTIVE = "interactive"
    VIDEO = "video"
    MIXED = "mixed"


class ScaffoldType(str, Enum):
    """Types of learning scaffolds."""

    WORKED_EXAMPLE = "worked_example"
    STEP_HINTS = "step_hints"
    VOCABULARY_SUPPORT = "vocabulary_support"
    VISUAL_ORGANIZER = "visual_organizer"
    CHUNKED_PRESENTATION = "chunked_presentation"
    PROGRESS_INDICATORS = "progress_indicators"
    SELF_CHECK_QUESTIONS = "self_check_questions"
    CONCEPT_MAP = "concept_map"
    GUIDED_PRACTICE = "guided_practice"


class ContentFeatures(BaseModel):
    """
    Features of content that can be adapted.

    Represents measurable characteristics of learning content that
    the adaptation engine can modify to suit learner needs.
    """

    difficulty_level: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Overall difficulty level (0=easiest, 1=hardest)",
    )
    vocabulary_level: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Vocabulary complexity level (0=basic, 1=advanced)",
    )
    sentence_complexity: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Sentence structure complexity (0=simple, 1=complex)",
    )
    concept_density: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Density of concepts per unit content (0=sparse, 1=dense)",
    )
    scaffolding_level: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Amount of scaffolding present (0=none, 1=maximum)",
    )
    visual_support_level: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Level of visual aids/supports (0=none, 1=extensive)",
    )
    interactivity_level: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Level of interactive elements (0=passive, 1=highly interactive)",
    )
    format: ContentFormat = Field(
        default=ContentFormat.TEXT,
        description="Primary content format",
    )
    estimated_completion_minutes: int = Field(
        default=10,
        ge=1,
        le=120,
        description="Estimated time to complete content in minutes",
    )
    prerequisite_count: int = Field(
        default=0,
        ge=0,
        description="Number of prerequisite concepts",
    )

    def copy_with_changes(self, **changes: Any) -> "ContentFeatures":
        """Create a copy with specified changes."""
        data = self.model_dump()
        data.update(changes)
        return ContentFeatures(**data)


class CognitiveState(BaseModel):
    """
    Current cognitive state of a learner.

    Captures real-time cognitive and emotional indicators
    that influence adaptation decisions.
    """

    engagement: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Current engagement level (0=disengaged, 1=fully engaged)",
    )
    frustration: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Frustration level (0=calm, 1=highly frustrated)",
    )
    cognitive_load: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Current cognitive load (0=underloaded, 1=overloaded)",
    )
    fatigue: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Mental fatigue level (0=fresh, 1=exhausted)",
    )
    confidence: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Learner confidence level (0=low, 1=high)",
    )
    attention_focus: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Attention/focus level (0=distracted, 1=focused)",
    )
    session_duration_minutes: int = Field(
        default=0,
        ge=0,
        description="Time spent in current session",
    )


class PerformanceRecord(BaseModel):
    """
    A single performance record for tracking learner progress.

    Used to inform adaptation decisions based on historical performance.
    """

    interaction_id: str = Field(..., description="Unique interaction identifier")
    content_id: str = Field(..., description="Content being assessed")
    correct: bool = Field(..., description="Whether the response was correct")
    response_time_ms: int = Field(
        ...,
        ge=0,
        description="Time taken to respond in milliseconds",
    )
    hints_used: int = Field(
        default=0,
        ge=0,
        description="Number of hints used",
    )
    attempts: int = Field(
        default=1,
        ge=1,
        description="Number of attempts made",
    )
    difficulty_level: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Difficulty of the content",
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this interaction occurred",
    )
    scaffolding_active: bool = Field(
        default=False,
        description="Whether scaffolding was active",
    )


class PerformanceMetrics(BaseModel):
    """
    Aggregated performance metrics for adaptation decisions.

    Provides summary statistics used by the safety monitor and
    adaptation engine to make informed decisions.
    """

    accuracy: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Overall accuracy rate",
    )
    recent_accuracy: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Accuracy in recent interactions",
    )
    average_response_time_ms: int = Field(
        ...,
        ge=0,
        description="Average response time",
    )
    consecutive_failures: int = Field(
        default=0,
        ge=0,
        description="Number of consecutive failures",
    )
    consecutive_successes: int = Field(
        default=0,
        ge=0,
        description="Number of consecutive successes",
    )
    hint_dependency_rate: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Rate of hint usage",
    )
    improvement_trend: float = Field(
        default=0.0,
        ge=-1.0,
        le=1.0,
        description="Performance trend (-1=declining, 0=stable, 1=improving)",
    )
    total_interactions: int = Field(
        default=0,
        ge=0,
        description="Total number of interactions",
    )


class AdaptationContext(BaseModel):
    """
    Context for applying an adaptation strategy.

    Contains all necessary information for a strategy to make
    informed content modifications.
    """

    learner_id: str = Field(..., description="Unique learner identifier")
    cognitive_state: CognitiveState = Field(
        ...,
        description="Current cognitive state",
    )
    performance_history: List[PerformanceRecord] = Field(
        default_factory=list,
        description="Recent performance records",
    )
    active_scaffolds: List[ScaffoldType] = Field(
        default_factory=list,
        description="Currently active scaffolds",
    )
    adaptation_history: List["AdaptationResult"] = Field(
        default_factory=list,
        description="Previous adaptations applied",
    )
    learner_preferences: Dict[str, Any] = Field(
        default_factory=dict,
        description="Learner preferences and settings",
    )
    session_id: str = Field(
        default="",
        description="Current session identifier",
    )

    @property
    def recent_accuracy(self) -> float:
        """Calculate accuracy from recent performance."""
        if not self.performance_history:
            return 0.5
        recent = self.performance_history[-10:]
        correct = sum(1 for r in recent if r.correct)
        return correct / len(recent)


class AdaptationRequest(BaseModel):
    """
    Request for content adaptation.

    Contains the content to adapt, current features, and
    the strategies to apply.
    """

    content_id: str = Field(..., description="Unique content identifier")
    original_content: Dict[str, Any] = Field(
        ...,
        description="Original content to adapt",
    )
    current_features: ContentFeatures = Field(
        ...,
        description="Current content features",
    )
    learner_id: str = Field(..., description="Learner requesting adaptation")
    strategies: List[AdaptationStrategy] = Field(
        ...,
        min_length=1,
        description="Strategies to apply",
    )
    target_features: Optional[ContentFeatures] = Field(
        default=None,
        description="Optional target feature state",
    )
    constraints: Dict[str, Any] = Field(
        default_factory=dict,
        description="Constraints on adaptation",
    )
    max_difficulty_change: float = Field(
        default=0.1,
        ge=0.0,
        le=0.5,
        description="Maximum difficulty change per adaptation",
    )
    preserve_correctness: bool = Field(
        default=True,
        description="Ensure content correctness is preserved",
    )


class AdaptationResult(BaseModel):
    """
    Result of a content adaptation.

    Contains the adapted content, applied strategies, and
    information for potential rollback.
    """

    original_content_id: str = Field(
        ...,
        description="ID of original content",
    )
    adapted_content: Dict[str, Any] = Field(
        ...,
        description="Adapted content",
    )
    strategies_applied: List[AdaptationStrategy] = Field(
        ...,
        description="Strategies that were applied",
    )
    feature_changes: Dict[str, Tuple[float, float]] = Field(
        default_factory=dict,
        description="Feature changes (old, new) pairs",
    )
    original_features: ContentFeatures = Field(
        ...,
        description="Original content features",
    )
    new_features: ContentFeatures = Field(
        ...,
        description="New content features",
    )
    adaptation_rationale: str = Field(
        default="",
        description="Explanation of adaptation choices",
    )
    rollback_available: bool = Field(
        default=True,
        description="Whether rollback is possible",
    )
    adaptation_id: str = Field(
        default="",
        description="Unique adaptation identifier",
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When adaptation was performed",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional adaptation metadata",
    )


class RollbackResult(BaseModel):
    """
    Result of a rollback operation.

    Contains information about what was rolled back and why.
    """

    learner_id: str = Field(..., description="Learner ID")
    adaptation_id: str = Field(..., description="ID of rolled back adaptation")
    rolled_back_strategies: List[AdaptationStrategy] = Field(
        ...,
        description="Strategies that were rolled back",
    )
    rollback_reason: str = Field(
        ...,
        description="Reason for rollback",
    )
    restored_features: ContentFeatures = Field(
        ...,
        description="Features restored after rollback",
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When rollback was performed",
    )
    triggered_by: str = Field(
        default="safety_monitor",
        description="What triggered the rollback",
    )


class AdaptationConfig(BaseModel):
    """
    Configuration for the adaptation engine.

    Controls adaptation behavior, limits, and thresholds.
    """

    max_strategies_per_adaptation: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Maximum strategies to apply at once",
    )
    min_sessions_before_difficulty_increase: int = Field(
        default=5,
        ge=1,
        description="Minimum sessions before increasing difficulty",
    )
    max_difficulty_change_per_session: float = Field(
        default=0.1,
        ge=0.01,
        le=0.3,
        description="Maximum difficulty change per session",
    )
    gradual_transition_sessions: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Sessions for gradual transitions",
    )
    safety_accuracy_threshold: float = Field(
        default=0.6,
        ge=0.0,
        le=1.0,
        description="Accuracy threshold for safety rollback",
    )
    enable_auto_rollback: bool = Field(
        default=True,
        description="Enable automatic safety rollbacks",
    )
    llm_temperature: float = Field(
        default=0.3,
        ge=0.0,
        le=2.0,
        description="LLM temperature for content adaptation",
    )
    adaptation_cooldown_seconds: int = Field(
        default=30,
        ge=0,
        description="Minimum time between adaptations",
    )
    preserve_content_integrity: bool = Field(
        default=True,
        description="Ensure educational accuracy in adaptations",
    )
    strategy_priority: Dict[AdaptationStrategy, int] = Field(
        default_factory=lambda: {
            AdaptationStrategy.REDUCE_DIFFICULTY: 1,
            AdaptationStrategy.ADD_SCAFFOLDING: 2,
            AdaptationStrategy.SIMPLIFY_LANGUAGE: 3,
            AdaptationStrategy.ADD_HINTS: 4,
            AdaptationStrategy.ADD_EXAMPLES: 5,
            AdaptationStrategy.REDUCE_COGNITIVE_LOAD: 6,
            AdaptationStrategy.STEP_BY_STEP: 7,
            AdaptationStrategy.ADD_VISUAL_AIDS: 8,
            AdaptationStrategy.INCREASE_ENGAGEMENT: 9,
            AdaptationStrategy.PROVIDE_REVIEW: 10,
            AdaptationStrategy.CHANGE_FORMAT: 11,
            AdaptationStrategy.REMOVE_SCAFFOLDING: 12,
            AdaptationStrategy.INCREASE_DIFFICULTY: 13,
        },
        description="Priority order for strategies (lower = higher priority)",
    )


# Forward reference resolution
AdaptationContext.model_rebuild()
