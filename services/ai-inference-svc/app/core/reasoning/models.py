"""
Pydantic models for ReAct Reasoning Engine.

This module defines the data models for multi-step reasoning traces,
intervention decisions, and learner context used by the ReActReasoningEngine.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class InterventionType(str, Enum):
    """Types of learning interventions the system can apply."""

    HINT = "hint"
    SCAFFOLD = "scaffold"
    SIMPLIFY = "simplify"
    ENCOURAGE = "encourage"
    BREAK = "break"
    REVIEW = "review"
    ADVANCE = "advance"
    NONE = "none"


class UrgencyLevel(str, Enum):
    """Urgency levels for interventions."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ReasoningStep(BaseModel):
    """
    A single step in the ReAct reasoning process.

    The ReAct pattern follows: Thought -> Action -> Observation
    Each step captures the agent's internal reasoning, the action taken,
    and the resulting observation.
    """

    thought: str = Field(
        ...,
        description="The agent's internal reasoning about the current state",
        min_length=1,
    )
    action: str = Field(
        ...,
        description="The action taken based on the thought",
        min_length=1,
    )
    observation: str = Field(
        ...,
        description="The observation resulting from the action",
        min_length=1,
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence level in this reasoning step (0-1)",
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this reasoning step was created",
    )


class ReasoningTrace(BaseModel):
    """
    Complete trace of a multi-step reasoning process.

    Contains all reasoning steps taken to reach a final decision,
    along with aggregate confidence and timing information.
    """

    steps: List[ReasoningStep] = Field(
        ...,
        description="Ordered list of reasoning steps",
        min_length=1,
    )
    final_decision: str = Field(
        ...,
        description="The final decision reached after reasoning",
        min_length=1,
    )
    total_confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Overall confidence in the final decision (0-1)",
    )
    reasoning_duration_ms: int = Field(
        ...,
        ge=0,
        description="Total time taken for reasoning in milliseconds",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata about the reasoning process",
    )

    @property
    def num_steps(self) -> int:
        """Return the number of reasoning steps."""
        return len(self.steps)

    @property
    def average_step_confidence(self) -> float:
        """Calculate average confidence across all steps."""
        if not self.steps:
            return 0.0
        return sum(step.confidence for step in self.steps) / len(self.steps)


class InterventionDecision(BaseModel):
    """
    A decision about what intervention to apply for a learner.

    Contains the intervention type, parameters, the full reasoning trace
    that led to this decision, and urgency information.
    """

    intervention_type: InterventionType = Field(
        ...,
        description="The type of intervention to apply",
    )
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Parameters specific to this intervention type",
    )
    reasoning_trace: ReasoningTrace = Field(
        ...,
        description="The reasoning trace that led to this decision",
    )
    urgency: UrgencyLevel = Field(
        ...,
        description="How urgently this intervention should be applied",
    )
    learner_id: str = Field(
        ...,
        description="ID of the learner this intervention is for",
        min_length=1,
    )
    session_id: str = Field(
        ...,
        description="ID of the learning session",
        min_length=1,
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this decision was made",
    )


class LearnerContext(BaseModel):
    """
    Current context information about a learner.

    Used as input to the reasoning engine to understand
    the learner's current state and needs.
    """

    learner_id: str = Field(..., description="Unique learner identifier")
    session_id: str = Field(..., description="Current session identifier")
    current_skill_id: str = Field(..., description="Skill being worked on")
    grade_level: int = Field(..., ge=0, le=12, description="Learner's grade level")
    learning_pace: float = Field(
        default=1.0,
        ge=0.1,
        le=3.0,
        description="Learner's pace (0.5=slow, 1.0=avg, 1.5=fast)",
    )
    preferred_modality: str = Field(
        default="visual",
        description="Preferred learning modality (visual, auditory, kinesthetic)",
    )
    attention_span_minutes: int = Field(
        default=15,
        ge=1,
        le=120,
        description="Typical attention span in minutes",
    )
    cognitive_load_capacity: float = Field(
        default=1.0,
        ge=0.1,
        le=2.0,
        description="Cognitive load capacity (0-2 scale)",
    )
    current_mastery_estimate: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Estimated mastery of current skill (0-1)",
    )
    session_duration_minutes: int = Field(
        default=0,
        ge=0,
        description="How long the current session has been active",
    )
    recent_success_rate: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Success rate in recent interactions (0-1)",
    )
    frustration_signals: int = Field(
        default=0,
        ge=0,
        description="Count of frustration signals detected",
    )
    iep_accommodations: List[str] = Field(
        default_factory=list,
        description="List of IEP accommodations",
    )

    @field_validator("preferred_modality")
    @classmethod
    def validate_modality(cls, v: str) -> str:
        valid = {"visual", "auditory", "kinesthetic", "reading_writing", "multimodal"}
        if v.lower() not in valid:
            raise ValueError(f"Modality must be one of: {valid}")
        return v.lower()


class Interaction(BaseModel):
    """
    A single learning interaction.

    Represents one question-response cycle in the learning process.
    """

    interaction_id: str = Field(..., description="Unique interaction identifier")
    skill_id: str = Field(..., description="Skill being assessed")
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
    difficulty: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Difficulty level of the question (0-1)",
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this interaction occurred",
    )
    engagement_score: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Engagement score during interaction (0-1)",
    )
    scaffolding_level: int = Field(
        default=0,
        ge=0,
        le=3,
        description="Level of scaffolding applied (0=none, 1-3=increasing)",
    )


class PerformanceMetrics(BaseModel):
    """
    Aggregated performance metrics for a learner.

    Used to inform intervention decisions based on
    overall learning patterns.
    """

    overall_accuracy: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Overall accuracy rate (0-1)",
    )
    recent_accuracy: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Accuracy in recent interactions (0-1)",
    )
    average_response_time_ms: int = Field(
        ...,
        ge=0,
        description="Average response time in milliseconds",
    )
    skill_mastery_levels: Dict[str, float] = Field(
        default_factory=dict,
        description="Mastery level per skill (skill_id -> 0-1)",
    )
    struggle_patterns: List[str] = Field(
        default_factory=list,
        description="Identified patterns of struggle",
    )
    strength_areas: List[str] = Field(
        default_factory=list,
        description="Identified areas of strength",
    )
    engagement_trend: float = Field(
        default=0.0,
        ge=-1.0,
        le=1.0,
        description="Engagement trend (-1=declining, 0=stable, 1=improving)",
    )
    time_on_task_ratio: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Ratio of productive time on task (0-1)",
    )
    hint_dependency_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Level of hint dependency (0=independent, 1=dependent)",
    )


class InterventionOutcome(BaseModel):
    """
    Outcome of an applied intervention.

    Used for reflection and learning about intervention effectiveness.
    """

    intervention_id: str = Field(..., description="ID of the intervention applied")
    intervention_type: InterventionType = Field(
        ...,
        description="Type of intervention that was applied",
    )
    effectiveness_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="How effective the intervention was (0-1)",
    )
    learner_response: str = Field(
        ...,
        description="Category of learner response (positive, neutral, negative)",
    )
    performance_delta: float = Field(
        ...,
        ge=-1.0,
        le=1.0,
        description="Change in performance after intervention",
    )
    engagement_delta: float = Field(
        ...,
        ge=-1.0,
        le=1.0,
        description="Change in engagement after intervention",
    )
    applied_at: datetime = Field(
        ...,
        description="When the intervention was applied",
    )
    evaluated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the outcome was evaluated",
    )

    @field_validator("learner_response")
    @classmethod
    def validate_response(cls, v: str) -> str:
        valid = {"positive", "neutral", "negative", "mixed"}
        if v.lower() not in valid:
            raise ValueError(f"Response must be one of: {valid}")
        return v.lower()


class SessionReflection(BaseModel):
    """
    Reflection on a learning session's effectiveness.

    Contains insights and recommendations for future sessions.
    """

    session_id: str = Field(..., description="ID of the session being reflected upon")
    learner_id: str = Field(..., description="ID of the learner")
    total_interventions: int = Field(
        ...,
        ge=0,
        description="Total number of interventions applied",
    )
    effective_interventions: int = Field(
        ...,
        ge=0,
        description="Number of interventions deemed effective",
    )
    overall_effectiveness: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Overall effectiveness score (0-1)",
    )
    key_insights: List[str] = Field(
        default_factory=list,
        description="Key insights from the session",
    )
    recommendations: List[str] = Field(
        default_factory=list,
        description="Recommendations for future sessions",
    )
    intervention_patterns: Dict[str, float] = Field(
        default_factory=dict,
        description="Effectiveness by intervention type",
    )
    learner_preferences_learned: Dict[str, Any] = Field(
        default_factory=dict,
        description="New insights about learner preferences",
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this reflection was created",
    )


class LearnerProfile(BaseModel):
    """
    Complete learner profile for strategy selection.

    Contains all relevant learner characteristics for
    personalized teaching strategy selection.
    """

    learner_id: str = Field(..., description="Unique learner identifier")
    grade_level: int = Field(..., ge=0, le=12, description="Grade level")
    learning_pace: float = Field(
        default=1.0,
        ge=0.1,
        le=3.0,
        description="Learning pace multiplier",
    )
    preferred_modality: str = Field(
        default="visual",
        description="Preferred learning modality",
    )
    attention_span_minutes: int = Field(
        default=15,
        ge=1,
        le=120,
        description="Typical attention span",
    )
    iep_accommodations: List[str] = Field(
        default_factory=list,
        description="IEP accommodations",
    )
    strengths: List[str] = Field(
        default_factory=list,
        description="Skill IDs where learner excels",
    )
    challenges: List[str] = Field(
        default_factory=list,
        description="Skill IDs where learner struggles",
    )
    cognitive_load_capacity: float = Field(
        default=1.0,
        ge=0.1,
        le=2.0,
        description="Cognitive load capacity",
    )
    preferred_difficulty: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Preferred difficulty level",
    )
    response_to_encouragement: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="How well learner responds to encouragement",
    )
    persistence_level: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Tendency to persist through challenges",
    )


class ReasoningConfig(BaseModel):
    """
    Configuration for the ReAct reasoning engine.

    Controls reasoning behavior, limits, and thresholds.
    """

    max_reasoning_steps: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Maximum number of reasoning steps",
    )
    min_confidence_threshold: float = Field(
        default=0.6,
        ge=0.0,
        le=1.0,
        description="Minimum confidence to proceed with decision",
    )
    reasoning_timeout_ms: int = Field(
        default=5000,
        ge=100,
        le=60000,
        description="Maximum time for reasoning in milliseconds",
    )
    enable_reflection: bool = Field(
        default=True,
        description="Whether to enable post-session reflection",
    )
    llm_temperature: float = Field(
        default=0.3,
        ge=0.0,
        le=2.0,
        description="LLM temperature for reasoning",
    )
    llm_model: str = Field(
        default="gpt-4",
        description="LLM model to use for reasoning",
    )
    intervention_cooldown_seconds: int = Field(
        default=60,
        ge=0,
        description="Minimum time between interventions",
    )
    urgency_thresholds: Dict[str, float] = Field(
        default_factory=lambda: {
            "critical": 0.9,
            "high": 0.7,
            "medium": 0.4,
            "low": 0.0,
        },
        description="Thresholds for urgency classification",
    )
