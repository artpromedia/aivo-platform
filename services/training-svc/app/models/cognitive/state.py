"""
Cognitive State Models for Real-time Learner Monitoring.

This module defines the data models for tracking learner cognitive state
in real-time, including engagement, frustration, fatigue, and cognitive load.
These models enable the AI to detect mental states that affect learning
and trigger appropriate interventions.
"""

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Deque, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class LearningStyle(str, Enum):
    """Learning modality preferences for personalized instruction."""

    VISUAL = "visual"
    AUDITORY = "auditory"
    KINESTHETIC = "kinesthetic"
    READING_WRITING = "reading_writing"
    MULTIMODAL = "multimodal"


class EngagementLevel(str, Enum):
    """Discrete engagement levels derived from continuous engagement score."""

    HIGHLY_ENGAGED = "highly_engaged"
    ENGAGED = "engaged"
    NEUTRAL = "neutral"
    DISENGAGED = "disengaged"
    CHECKED_OUT = "checked_out"

    @classmethod
    def from_score(cls, score: float) -> "EngagementLevel":
        """Convert engagement score (0-1) to discrete level."""
        if score >= 0.85:
            return cls.HIGHLY_ENGAGED
        elif score >= 0.65:
            return cls.ENGAGED
        elif score >= 0.45:
            return cls.NEUTRAL
        elif score >= 0.25:
            return cls.DISENGAGED
        else:
            return cls.CHECKED_OUT


class CognitiveLoadLevel(str, Enum):
    """Discrete cognitive load levels for interventions."""

    UNDERLOAD = "underload"
    OPTIMAL = "optimal"
    HIGH = "high"
    OVERLOAD = "overload"

    @classmethod
    def from_score(cls, score: float, optimal_range: tuple = (0.4, 0.7)) -> "CognitiveLoadLevel":
        """Convert cognitive load score to discrete level."""
        if score < optimal_range[0]:
            return cls.UNDERLOAD
        elif score <= optimal_range[1]:
            return cls.OPTIMAL
        elif score <= 0.85:
            return cls.HIGH
        else:
            return cls.OVERLOAD


class SignalType(str, Enum):
    """Types of signals that update cognitive state."""

    RESPONSE_TIME = "response_time"
    ACCURACY = "accuracy"
    HINT_REQUEST = "hint_request"
    PAUSE_DURATION = "pause_duration"
    INTERACTION_RATE = "interaction_rate"
    SKIP_ACTION = "skip_action"
    RAPID_CLICKING = "rapid_clicking"
    QUESTION_EXPLORATION = "question_exploration"
    RETRY_ATTEMPT = "retry_attempt"
    SUCCESS_STREAK = "success_streak"
    FAILURE_STREAK = "failure_streak"
    SESSION_DURATION = "session_duration"
    BREAK_TAKEN = "break_taken"
    CONTENT_REVISIT = "content_revisit"
    EXTERNAL_DISTRACTION = "external_distraction"


class CognitiveStateUpdate(BaseModel):
    """
    Signals that update cognitive state.

    Each update represents a measurable signal from the learner's
    interaction that can be used to infer cognitive state changes.
    """

    signal_type: SignalType = Field(
        ...,
        description="Type of signal being reported",
    )
    signal_value: float = Field(
        ...,
        description="Normalized value of the signal (interpretation depends on type)",
    )
    raw_value: Optional[float] = Field(
        default=None,
        description="Raw value before normalization (e.g., milliseconds for response time)",
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this signal was recorded",
    )
    context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional context about the signal",
    )

    def model_dump_for_history(self) -> Dict[str, Any]:
        """Create a serializable dict for state history."""
        return {
            "signal_type": self.signal_type.value,
            "signal_value": self.signal_value,
            "timestamp": self.timestamp.isoformat(),
            "context": self.context,
        }


class StateSnapshot(BaseModel):
    """
    A point-in-time snapshot of cognitive state for history tracking.

    Stored in a rolling window for trend analysis and pattern detection.
    """

    timestamp: datetime
    cognitive_load: float
    engagement: float
    frustration: float
    fatigue: float
    confidence: float
    motivation: float
    engagement_level: EngagementLevel

    class Config:
        use_enum_values = True


class CognitiveState(BaseModel):
    """
    Real-time cognitive state of a learner.

    Tracks multiple dimensions of cognitive state on a 0-1 scale,
    with derived states and a rolling history for trend analysis.
    The warmup_complete flag prevents false positives in the first
    2 minutes of a session while baseline data is collected.
    """

    learner_id: str = Field(..., description="Unique learner identifier")
    session_id: str = Field(..., description="Current session identifier")

    # Core dimensions (0.0 to 1.0)
    cognitive_load: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Current cognitive load level (0=bored, 0.5-0.7=optimal, 1=overloaded)",
    )
    engagement: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Current engagement level (0=disengaged, 1=highly engaged)",
    )
    frustration: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Current frustration level (0=calm, 1=highly frustrated)",
    )
    fatigue: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Current fatigue level (0=fresh, 1=exhausted)",
    )
    confidence: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Current confidence level (0=unsure, 1=confident)",
    )
    motivation: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Current motivation level (0=unmotivated, 1=highly motivated)",
    )

    # Derived states
    attention_span_minutes: float = Field(
        default=25.0,
        ge=0.0,
        description="Estimated remaining attention span in minutes",
    )
    needs_break: bool = Field(
        default=False,
        description="Whether the learner needs a break",
    )
    engagement_level: EngagementLevel = Field(
        default=EngagementLevel.ENGAGED,
        description="Discrete engagement level derived from score",
    )
    cognitive_load_level: CognitiveLoadLevel = Field(
        default=CognitiveLoadLevel.OPTIMAL,
        description="Discrete cognitive load level",
    )

    # Session tracking
    session_start: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the session started",
    )
    last_break: Optional[datetime] = Field(
        default=None,
        description="When the last break was taken",
    )
    warmup_complete: bool = Field(
        default=False,
        description="Whether the 2-minute warmup period has passed",
    )

    # Metadata
    last_updated: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this state was last updated",
    )
    update_count: int = Field(
        default=0,
        ge=0,
        description="Number of state updates in this session",
    )
    state_history: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Rolling window of recent state snapshots (30-minute window)",
    )

    class Config:
        use_enum_values = True

    @property
    def session_duration_minutes(self) -> float:
        """Calculate current session duration in minutes."""
        return (datetime.utcnow() - self.session_start).total_seconds() / 60.0

    @property
    def minutes_since_break(self) -> Optional[float]:
        """Calculate minutes since last break, or None if no break taken."""
        if self.last_break is None:
            return self.session_duration_minutes
        return (datetime.utcnow() - self.last_break).total_seconds() / 60.0

    @property
    def is_in_warmup(self) -> bool:
        """Check if still in the 2-minute warmup period."""
        return self.session_duration_minutes < 2.0 and not self.warmup_complete

    def get_snapshot(self) -> StateSnapshot:
        """Create a snapshot of the current state."""
        return StateSnapshot(
            timestamp=datetime.utcnow(),
            cognitive_load=self.cognitive_load,
            engagement=self.engagement,
            frustration=self.frustration,
            fatigue=self.fatigue,
            confidence=self.confidence,
            motivation=self.motivation,
            engagement_level=EngagementLevel.from_score(self.engagement),
        )

    def add_to_history(self) -> None:
        """
        Add current state to history and prune old entries.
        Maintains a 30-minute rolling window.
        """
        snapshot = self.get_snapshot()
        self.state_history.append(snapshot.model_dump())

        # Prune entries older than 30 minutes
        cutoff = datetime.utcnow() - timedelta(minutes=30)
        self.state_history = [
            s for s in self.state_history
            if datetime.fromisoformat(s["timestamp"]) > cutoff
        ]

    def get_trend(self, dimension: str, window_minutes: int = 5) -> float:
        """
        Calculate the trend for a dimension over a time window.

        Returns:
            Positive value indicates increasing trend,
            negative indicates decreasing, zero indicates stable.
        """
        if len(self.state_history) < 2:
            return 0.0

        cutoff = datetime.utcnow() - timedelta(minutes=window_minutes)
        recent = [
            s for s in self.state_history
            if datetime.fromisoformat(s["timestamp"]) > cutoff
        ]

        if len(recent) < 2:
            return 0.0

        values = [s.get(dimension, 0.0) for s in recent]
        # Simple linear trend: (last - first) / count
        return (values[-1] - values[0]) / len(values)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize state to dictionary."""
        return {
            "learner_id": self.learner_id,
            "session_id": self.session_id,
            "cognitive_load": self.cognitive_load,
            "engagement": self.engagement,
            "frustration": self.frustration,
            "fatigue": self.fatigue,
            "confidence": self.confidence,
            "motivation": self.motivation,
            "attention_span_minutes": self.attention_span_minutes,
            "needs_break": self.needs_break,
            "engagement_level": self.engagement_level,
            "cognitive_load_level": self.cognitive_load_level,
            "session_start": self.session_start.isoformat(),
            "last_break": self.last_break.isoformat() if self.last_break else None,
            "warmup_complete": self.warmup_complete,
            "last_updated": self.last_updated.isoformat(),
            "update_count": self.update_count,
            "session_duration_minutes": self.session_duration_minutes,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CognitiveState":
        """Deserialize state from dictionary."""
        if "session_start" in data and isinstance(data["session_start"], str):
            data["session_start"] = datetime.fromisoformat(data["session_start"])
        if "last_break" in data and isinstance(data["last_break"], str):
            data["last_break"] = datetime.fromisoformat(data["last_break"])
        if "last_updated" in data and isinstance(data["last_updated"], str):
            data["last_updated"] = datetime.fromisoformat(data["last_updated"])
        # Remove computed properties
        data.pop("session_duration_minutes", None)
        return cls(**data)


class LearnerProfile(BaseModel):
    """
    Extended learner profile with cognitive preferences.

    Contains baseline cognitive characteristics, diagnosed conditions,
    and accommodations that affect how cognitive state is interpreted
    and what interventions are appropriate.
    """

    learner_id: str = Field(..., description="Unique learner identifier")
    learning_style: LearningStyle = Field(
        default=LearningStyle.MULTIMODAL,
        description="Preferred learning modality",
    )
    preferred_difficulty: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Preferred difficulty level (0=easy, 1=hard)",
    )
    preferred_pace: str = Field(
        default="moderate",
        description="Preferred learning pace (slow, moderate, fast)",
    )

    # Baseline cognitive characteristics
    baseline_attention_span: float = Field(
        default=25.0,
        ge=1.0,
        le=120.0,
        description="Baseline attention span in minutes",
    )
    optimal_cognitive_load: float = Field(
        default=0.6,
        ge=0.3,
        le=0.8,
        description="Optimal cognitive load level for this learner",
    )
    frustration_threshold: float = Field(
        default=0.7,
        ge=0.3,
        le=1.0,
        description="Frustration level that triggers intervention",
    )
    fatigue_threshold: float = Field(
        default=0.6,
        ge=0.3,
        le=1.0,
        description="Fatigue level that triggers break recommendation",
    )

    # Performance baselines
    baseline_response_time_ms: float = Field(
        default=5000.0,
        ge=500.0,
        le=60000.0,
        description="Typical response time in milliseconds",
    )
    baseline_accuracy: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Baseline accuracy rate",
    )

    # Diagnosed conditions affecting cognition
    diagnoses: List[str] = Field(
        default_factory=list,
        description="Diagnosed conditions (ADHD, Dyslexia, etc.)",
    )
    accommodations: List[str] = Field(
        default_factory=list,
        description="Required accommodations",
    )

    # IEP/504 specific settings
    has_iep: bool = Field(
        default=False,
        description="Whether learner has an IEP",
    )
    break_frequency_minutes: Optional[float] = Field(
        default=None,
        description="Required break frequency from IEP/504",
    )
    max_session_duration_minutes: Optional[float] = Field(
        default=None,
        description="Maximum session duration from IEP/504",
    )

    class Config:
        use_enum_values = True

    @field_validator("preferred_pace")
    @classmethod
    def validate_pace(cls, v: str) -> str:
        valid = {"slow", "moderate", "fast"}
        if v.lower() not in valid:
            raise ValueError(f"Pace must be one of: {valid}")
        return v.lower()

    @property
    def has_adhd(self) -> bool:
        """Check if learner has ADHD diagnosis."""
        return any("adhd" in d.lower() for d in self.diagnoses)

    @property
    def has_dyslexia(self) -> bool:
        """Check if learner has dyslexia diagnosis."""
        return any("dyslexia" in d.lower() for d in self.diagnoses)

    @property
    def effective_attention_span(self) -> float:
        """
        Calculate effective attention span considering diagnoses.
        ADHD typically reduces attention span by 30-50%.
        """
        span = self.baseline_attention_span
        if self.has_adhd:
            span *= 0.6  # 40% reduction for ADHD
        return max(span, 5.0)  # Minimum 5 minutes

    @property
    def recommended_break_interval(self) -> float:
        """
        Calculate recommended break interval in minutes.
        Uses IEP requirement if set, otherwise based on attention span.
        """
        if self.break_frequency_minutes is not None:
            return self.break_frequency_minutes
        # Default: break at 80% of effective attention span
        return self.effective_attention_span * 0.8

    def to_dict(self) -> Dict[str, Any]:
        """Serialize profile to dictionary."""
        return {
            "learner_id": self.learner_id,
            "learning_style": self.learning_style,
            "preferred_difficulty": self.preferred_difficulty,
            "preferred_pace": self.preferred_pace,
            "baseline_attention_span": self.baseline_attention_span,
            "optimal_cognitive_load": self.optimal_cognitive_load,
            "frustration_threshold": self.frustration_threshold,
            "fatigue_threshold": self.fatigue_threshold,
            "baseline_response_time_ms": self.baseline_response_time_ms,
            "baseline_accuracy": self.baseline_accuracy,
            "diagnoses": self.diagnoses,
            "accommodations": self.accommodations,
            "has_iep": self.has_iep,
            "break_frequency_minutes": self.break_frequency_minutes,
            "max_session_duration_minutes": self.max_session_duration_minutes,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LearnerProfile":
        """Deserialize profile from dictionary."""
        return cls(**data)


@dataclass
class DetectorConfig:
    """
    Configuration for the CognitiveStateDetector.

    Controls signal weights, smoothing parameters, and thresholds
    for cognitive state detection algorithms.
    """

    # Exponential moving average smoothing factor (0-1)
    # Higher = more responsive to recent changes, lower = smoother
    ema_alpha: float = 0.3

    # Signal weights for state calculation
    signal_weights: Dict[str, float] = field(default_factory=lambda: {
        "response_time": 0.25,
        "accuracy": 0.25,
        "hint_requests": 0.2,
        "pause_duration": 0.15,
        "interaction_rate": 0.15,
    })

    # Frustration detection parameters
    frustration_response_time_factor: float = 0.3
    frustration_accuracy_factor: float = 0.3
    frustration_hint_factor: float = 0.25
    frustration_rapid_click_factor: float = 0.15
    consecutive_errors_weight: float = 0.4

    # Engagement detection parameters
    engagement_consistency_weight: float = 0.3
    engagement_time_on_task_weight: float = 0.25
    engagement_interaction_depth_weight: float = 0.25
    engagement_exploration_weight: float = 0.2

    # Fatigue detection parameters
    fatigue_session_duration_weight: float = 0.35
    fatigue_performance_decline_weight: float = 0.3
    fatigue_response_time_increase_weight: float = 0.2
    fatigue_break_absence_weight: float = 0.15

    # Break detection thresholds
    fatigue_break_threshold: float = 0.65
    frustration_sustained_minutes: float = 5.0
    adhd_break_multiplier: float = 0.7  # Trigger breaks earlier for ADHD

    # Warmup period (no triggers fire during this time)
    warmup_period_seconds: float = 120.0

    # History window for trend analysis
    history_window_minutes: int = 30

    def to_dict(self) -> Dict[str, Any]:
        """Serialize config to dictionary."""
        return {
            "ema_alpha": self.ema_alpha,
            "signal_weights": self.signal_weights,
            "frustration_response_time_factor": self.frustration_response_time_factor,
            "frustration_accuracy_factor": self.frustration_accuracy_factor,
            "frustration_hint_factor": self.frustration_hint_factor,
            "frustration_rapid_click_factor": self.frustration_rapid_click_factor,
            "consecutive_errors_weight": self.consecutive_errors_weight,
            "engagement_consistency_weight": self.engagement_consistency_weight,
            "engagement_time_on_task_weight": self.engagement_time_on_task_weight,
            "engagement_interaction_depth_weight": self.engagement_interaction_depth_weight,
            "engagement_exploration_weight": self.engagement_exploration_weight,
            "fatigue_session_duration_weight": self.fatigue_session_duration_weight,
            "fatigue_performance_decline_weight": self.fatigue_performance_decline_weight,
            "fatigue_response_time_increase_weight": self.fatigue_response_time_increase_weight,
            "fatigue_break_absence_weight": self.fatigue_break_absence_weight,
            "fatigue_break_threshold": self.fatigue_break_threshold,
            "frustration_sustained_minutes": self.frustration_sustained_minutes,
            "adhd_break_multiplier": self.adhd_break_multiplier,
            "warmup_period_seconds": self.warmup_period_seconds,
            "history_window_minutes": self.history_window_minutes,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DetectorConfig":
        """Deserialize config from dictionary."""
        return cls(**data)
