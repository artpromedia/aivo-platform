"""
Intervention Trigger Logic for Cognitive State Monitoring.

This module evaluates cognitive state against thresholds and fires
intervention triggers when learner needs support. Triggers are
prioritized and include recommended actions for the AI tutor.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .state import (
    CognitiveLoadLevel,
    CognitiveState,
    EngagementLevel,
    LearnerProfile,
)

logger = logging.getLogger(__name__)


class TriggerType(str, Enum):
    """Types of intervention triggers."""

    FRUSTRATION_HIGH = "frustration_high"
    FRUSTRATION_ESCALATING = "frustration_escalating"
    ENGAGEMENT_LOW = "engagement_low"
    ENGAGEMENT_DECLINING = "engagement_declining"
    FATIGUE_DETECTED = "fatigue_detected"
    COGNITIVE_OVERLOAD = "cognitive_overload"
    COGNITIVE_UNDERLOAD = "cognitive_underload"
    CONFIDENCE_DROP = "confidence_drop"
    BREAK_NEEDED = "break_needed"
    MOMENTUM_POSITIVE = "momentum_positive"
    STREAK_SUCCESS = "streak_success"
    ATTENTION_WANING = "attention_waning"
    STRUGGLING_PATTERN = "struggling_pattern"
    RECOVERY_DETECTED = "recovery_detected"


class TriggerPriority(int, Enum):
    """Priority levels for triggers (higher = more urgent)."""

    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

    @classmethod
    def from_severity(cls, severity: float) -> "TriggerPriority":
        """Convert severity (0-1) to priority level."""
        if severity >= 0.9:
            return cls.CRITICAL
        elif severity >= 0.7:
            return cls.HIGH
        elif severity >= 0.4:
            return cls.MEDIUM
        else:
            return cls.LOW


class InterventionTrigger(BaseModel):
    """
    An intervention trigger fired based on cognitive state.

    Contains the trigger type, severity, recommended actions,
    and context for the intervention system to act upon.
    """

    trigger_type: TriggerType = Field(
        ...,
        description="Type of trigger that fired",
    )
    severity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Severity of the trigger (0=minor, 1=critical)",
    )
    priority: TriggerPriority = Field(
        ...,
        description="Priority level for intervention ordering",
    )
    recommended_actions: List[str] = Field(
        default_factory=list,
        description="Recommended intervention actions",
    )
    context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional context for the intervention",
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the trigger was fired",
    )
    cooldown_seconds: int = Field(
        default=60,
        description="Minimum time before this trigger can fire again",
    )

    class Config:
        use_enum_values = True

    def to_dict(self) -> Dict[str, Any]:
        """Serialize trigger to dictionary."""
        return {
            "trigger_type": self.trigger_type,
            "severity": self.severity,
            "priority": self.priority,
            "recommended_actions": self.recommended_actions,
            "context": self.context,
            "timestamp": self.timestamp.isoformat(),
            "cooldown_seconds": self.cooldown_seconds,
        }


@dataclass
class TriggerThresholds:
    """
    Configurable thresholds for intervention triggers.

    Thresholds can be personalized per learner based on their
    profile and learning needs.
    """

    # Frustration thresholds
    frustration_high: float = 0.7
    frustration_escalating_delta: float = 0.2  # Increase over 2 min

    # Engagement thresholds
    engagement_low: float = 0.35
    engagement_declining_delta: float = -0.15  # Decrease over 5 min

    # Fatigue threshold
    fatigue_high: float = 0.65

    # Cognitive load thresholds
    cognitive_overload: float = 0.85
    cognitive_underload: float = 0.25

    # Confidence threshold
    confidence_drop_delta: float = -0.2  # Drop over 3 min

    # Positive triggers
    momentum_threshold: float = 0.75  # High engagement + confidence
    streak_success_count: int = 5

    # Attention threshold
    attention_waning_minutes: float = 5.0  # Remaining attention

    # Struggle pattern detection
    error_streak_count: int = 3
    hint_request_threshold: int = 3  # In 2 minutes

    # Recovery detection
    recovery_improvement: float = 0.15  # Improvement in key metrics

    def to_dict(self) -> Dict[str, Any]:
        """Serialize thresholds to dictionary."""
        return {
            "frustration_high": self.frustration_high,
            "frustration_escalating_delta": self.frustration_escalating_delta,
            "engagement_low": self.engagement_low,
            "engagement_declining_delta": self.engagement_declining_delta,
            "fatigue_high": self.fatigue_high,
            "cognitive_overload": self.cognitive_overload,
            "cognitive_underload": self.cognitive_underload,
            "confidence_drop_delta": self.confidence_drop_delta,
            "momentum_threshold": self.momentum_threshold,
            "streak_success_count": self.streak_success_count,
            "attention_waning_minutes": self.attention_waning_minutes,
            "error_streak_count": self.error_streak_count,
            "hint_request_threshold": self.hint_request_threshold,
            "recovery_improvement": self.recovery_improvement,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TriggerThresholds":
        """Deserialize thresholds from dictionary."""
        return cls(**data)

    @classmethod
    def for_learner(cls, profile: LearnerProfile) -> "TriggerThresholds":
        """
        Create personalized thresholds based on learner profile.

        Adjusts thresholds for ADHD, dyslexia, and other conditions.
        """
        thresholds = cls()

        # Personalize based on profile
        thresholds.frustration_high = profile.frustration_threshold
        thresholds.fatigue_high = profile.fatigue_threshold

        # ADHD adjustments
        if profile.has_adhd:
            thresholds.engagement_low = 0.4  # More sensitive to disengagement
            thresholds.attention_waning_minutes = 3.0  # Earlier attention warnings
            thresholds.streak_success_count = 3  # Celebrate smaller wins

        # Dyslexia adjustments
        if profile.has_dyslexia:
            thresholds.frustration_high = 0.6  # Lower frustration threshold
            thresholds.error_streak_count = 2  # Intervene earlier on errors

        return thresholds


class TriggerEngine:
    """
    Evaluates cognitive state and fires intervention triggers.

    The engine evaluates the current state against configurable
    thresholds and returns appropriate triggers with recommended
    actions. Triggers respect cooldown periods to avoid intervention
    fatigue.
    """

    # Recommended actions for each trigger type
    RECOMMENDED_ACTIONS = {
        TriggerType.FRUSTRATION_HIGH: [
            "provide_encouragement",
            "reduce_difficulty",
            "offer_scaffolding",
            "suggest_break",
        ],
        TriggerType.FRUSTRATION_ESCALATING: [
            "immediate_encouragement",
            "switch_to_easier_content",
            "offer_worked_example",
        ],
        TriggerType.ENGAGEMENT_LOW: [
            "introduce_interactive_element",
            "change_modality",
            "ask_engaging_question",
            "gamify_current_task",
        ],
        TriggerType.ENGAGEMENT_DECLINING: [
            "check_in_with_learner",
            "offer_choice",
            "introduce_novelty",
        ],
        TriggerType.FATIGUE_DETECTED: [
            "suggest_break",
            "reduce_cognitive_load",
            "switch_to_lighter_activity",
        ],
        TriggerType.COGNITIVE_OVERLOAD: [
            "break_down_problem",
            "provide_scaffolding",
            "reduce_complexity",
            "remove_distractions",
        ],
        TriggerType.COGNITIVE_UNDERLOAD: [
            "increase_challenge",
            "introduce_complexity",
            "offer_extension_activity",
        ],
        TriggerType.CONFIDENCE_DROP: [
            "provide_reassurance",
            "highlight_past_successes",
            "offer_easier_warmup",
            "give_specific_praise",
        ],
        TriggerType.BREAK_NEEDED: [
            "take_break",
            "movement_activity",
            "breathing_exercise",
        ],
        TriggerType.MOMENTUM_POSITIVE: [
            "acknowledge_progress",
            "offer_advancement",
            "celebrate_achievement",
        ],
        TriggerType.STREAK_SUCCESS: [
            "celebrate_streak",
            "award_badge",
            "increase_difficulty_slightly",
        ],
        TriggerType.ATTENTION_WANING: [
            "refocus_activity",
            "short_energizer",
            "change_pace",
        ],
        TriggerType.STRUGGLING_PATTERN: [
            "provide_targeted_help",
            "review_prerequisites",
            "alternative_explanation",
            "peer_support_option",
        ],
        TriggerType.RECOVERY_DETECTED: [
            "acknowledge_improvement",
            "gentle_progression",
        ],
    }

    def __init__(self, thresholds: Optional[TriggerThresholds] = None):
        """
        Initialize the trigger engine.

        Args:
            thresholds: Trigger thresholds. Uses defaults if not provided.
        """
        self.thresholds = thresholds or TriggerThresholds()
        self._last_trigger_times: Dict[TriggerType, datetime] = {}
        self._previous_state: Optional[CognitiveState] = None

    async def evaluate(
        self,
        state: CognitiveState,
        profile: LearnerProfile,
        skip_warmup_check: bool = False
    ) -> List[InterventionTrigger]:
        """
        Evaluate current state against thresholds.

        Returns list of triggered interventions, respecting cooldown
        periods and warmup phase. Triggers are sorted by priority.

        Args:
            state: Current cognitive state.
            profile: Learner profile for personalized thresholds.
            skip_warmup_check: If True, evaluate even during warmup (for testing).

        Returns:
            List of intervention triggers, sorted by priority (highest first).
        """
        # Don't fire triggers during warmup period
        if not skip_warmup_check and state.is_in_warmup:
            logger.debug("Skipping trigger evaluation during warmup period")
            return []

        triggers = []

        # Evaluate each trigger condition
        triggers.extend(self._evaluate_frustration(state, profile))
        triggers.extend(self._evaluate_engagement(state, profile))
        triggers.extend(self._evaluate_fatigue(state, profile))
        triggers.extend(self._evaluate_cognitive_load(state, profile))
        triggers.extend(self._evaluate_confidence(state, profile))
        triggers.extend(self._evaluate_attention(state, profile))
        triggers.extend(self._evaluate_positive_momentum(state, profile))

        # Break trigger (highest priority when needed)
        if state.needs_break:
            triggers.append(self._create_trigger(
                TriggerType.BREAK_NEEDED,
                severity=0.9,
                context={
                    "fatigue_level": state.fatigue,
                    "session_duration_minutes": state.session_duration_minutes,
                    "attention_remaining": state.attention_span_minutes,
                },
            ))

        # Filter by cooldown
        triggers = self._filter_by_cooldown(triggers)

        # Update tracking
        self._previous_state = state
        for trigger in triggers:
            self._last_trigger_times[TriggerType(trigger.trigger_type)] = datetime.utcnow()

        # Sort by priority (highest first)
        triggers.sort(key=lambda t: t.priority, reverse=True)

        return triggers

    def _create_trigger(
        self,
        trigger_type: TriggerType,
        severity: float,
        context: Dict[str, Any],
        cooldown_seconds: int = 60
    ) -> InterventionTrigger:
        """Create an intervention trigger with recommended actions."""
        return InterventionTrigger(
            trigger_type=trigger_type,
            severity=severity,
            priority=TriggerPriority.from_severity(severity),
            recommended_actions=self.RECOMMENDED_ACTIONS.get(trigger_type, []),
            context=context,
            cooldown_seconds=cooldown_seconds,
        )

    def _evaluate_frustration(
        self,
        state: CognitiveState,
        profile: LearnerProfile
    ) -> List[InterventionTrigger]:
        """Evaluate frustration-related triggers."""
        triggers = []

        # High frustration trigger
        if state.frustration > self.thresholds.frustration_high:
            triggers.append(self._create_trigger(
                TriggerType.FRUSTRATION_HIGH,
                severity=state.frustration,
                context={
                    "frustration_level": state.frustration,
                    "threshold": self.thresholds.frustration_high,
                    "engagement_level": state.engagement,
                },
            ))

        # Escalating frustration (rapid increase)
        if self._previous_state is not None:
            frustration_delta = state.frustration - self._previous_state.frustration
            if frustration_delta >= self.thresholds.frustration_escalating_delta:
                triggers.append(self._create_trigger(
                    TriggerType.FRUSTRATION_ESCALATING,
                    severity=min(state.frustration + 0.1, 1.0),
                    context={
                        "frustration_delta": frustration_delta,
                        "current_level": state.frustration,
                        "previous_level": self._previous_state.frustration,
                    },
                    cooldown_seconds=120,
                ))

        return triggers

    def _evaluate_engagement(
        self,
        state: CognitiveState,
        profile: LearnerProfile
    ) -> List[InterventionTrigger]:
        """Evaluate engagement-related triggers."""
        triggers = []

        # Low engagement trigger
        if state.engagement < self.thresholds.engagement_low:
            triggers.append(self._create_trigger(
                TriggerType.ENGAGEMENT_LOW,
                severity=1.0 - state.engagement,
                context={
                    "engagement_level": state.engagement,
                    "engagement_category": state.engagement_level,
                    "threshold": self.thresholds.engagement_low,
                },
            ))

        # Declining engagement trend
        engagement_trend = state.get_trend("engagement", window_minutes=5)
        if engagement_trend < self.thresholds.engagement_declining_delta:
            triggers.append(self._create_trigger(
                TriggerType.ENGAGEMENT_DECLINING,
                severity=min(abs(engagement_trend) * 2, 1.0),
                context={
                    "engagement_trend": engagement_trend,
                    "current_engagement": state.engagement,
                },
                cooldown_seconds=180,
            ))

        return triggers

    def _evaluate_fatigue(
        self,
        state: CognitiveState,
        profile: LearnerProfile
    ) -> List[InterventionTrigger]:
        """Evaluate fatigue-related triggers."""
        triggers = []

        if state.fatigue > self.thresholds.fatigue_high:
            triggers.append(self._create_trigger(
                TriggerType.FATIGUE_DETECTED,
                severity=state.fatigue,
                context={
                    "fatigue_level": state.fatigue,
                    "session_duration_minutes": state.session_duration_minutes,
                    "minutes_since_break": state.minutes_since_break,
                    "attention_span_baseline": profile.effective_attention_span,
                },
                cooldown_seconds=300,  # 5 min cooldown for fatigue alerts
            ))

        return triggers

    def _evaluate_cognitive_load(
        self,
        state: CognitiveState,
        profile: LearnerProfile
    ) -> List[InterventionTrigger]:
        """Evaluate cognitive load triggers."""
        triggers = []

        # Cognitive overload
        if state.cognitive_load > self.thresholds.cognitive_overload:
            triggers.append(self._create_trigger(
                TriggerType.COGNITIVE_OVERLOAD,
                severity=state.cognitive_load,
                context={
                    "cognitive_load": state.cognitive_load,
                    "optimal_load": profile.optimal_cognitive_load,
                    "load_level": state.cognitive_load_level,
                },
            ))

        # Cognitive underload (bored)
        if state.cognitive_load < self.thresholds.cognitive_underload:
            triggers.append(self._create_trigger(
                TriggerType.COGNITIVE_UNDERLOAD,
                severity=0.5,  # Lower severity for underload
                context={
                    "cognitive_load": state.cognitive_load,
                    "engagement": state.engagement,
                },
                cooldown_seconds=180,
            ))

        return triggers

    def _evaluate_confidence(
        self,
        state: CognitiveState,
        profile: LearnerProfile
    ) -> List[InterventionTrigger]:
        """Evaluate confidence-related triggers."""
        triggers = []

        # Confidence drop trend
        confidence_trend = state.get_trend("confidence", window_minutes=3)
        if confidence_trend < self.thresholds.confidence_drop_delta:
            triggers.append(self._create_trigger(
                TriggerType.CONFIDENCE_DROP,
                severity=min(abs(confidence_trend) * 2, 1.0),
                context={
                    "confidence_trend": confidence_trend,
                    "current_confidence": state.confidence,
                    "frustration_level": state.frustration,
                },
                cooldown_seconds=120,
            ))

        return triggers

    def _evaluate_attention(
        self,
        state: CognitiveState,
        profile: LearnerProfile
    ) -> List[InterventionTrigger]:
        """Evaluate attention-related triggers."""
        triggers = []

        if state.attention_span_minutes < self.thresholds.attention_waning_minutes:
            triggers.append(self._create_trigger(
                TriggerType.ATTENTION_WANING,
                severity=0.6,
                context={
                    "attention_remaining_minutes": state.attention_span_minutes,
                    "threshold": self.thresholds.attention_waning_minutes,
                    "fatigue_level": state.fatigue,
                },
                cooldown_seconds=300,
            ))

        return triggers

    def _evaluate_positive_momentum(
        self,
        state: CognitiveState,
        profile: LearnerProfile
    ) -> List[InterventionTrigger]:
        """Evaluate positive momentum triggers for encouragement."""
        triggers = []

        # Positive momentum (high engagement + confidence + low frustration)
        momentum_score = (
            state.engagement * 0.4 +
            state.confidence * 0.4 +
            (1.0 - state.frustration) * 0.2
        )
        if momentum_score > self.thresholds.momentum_threshold:
            triggers.append(self._create_trigger(
                TriggerType.MOMENTUM_POSITIVE,
                severity=0.3,  # Low severity (positive trigger)
                context={
                    "momentum_score": momentum_score,
                    "engagement": state.engagement,
                    "confidence": state.confidence,
                },
                cooldown_seconds=300,  # Don't over-celebrate
            ))

        # Recovery detection (improvement after struggle)
        if self._previous_state is not None:
            # Check if key metrics improved significantly
            engagement_improvement = state.engagement - self._previous_state.engagement
            frustration_reduction = self._previous_state.frustration - state.frustration
            confidence_improvement = state.confidence - self._previous_state.confidence

            recovery_score = (
                max(0, engagement_improvement) +
                max(0, frustration_reduction) +
                max(0, confidence_improvement)
            ) / 3

            if recovery_score > self.thresholds.recovery_improvement:
                triggers.append(self._create_trigger(
                    TriggerType.RECOVERY_DETECTED,
                    severity=0.3,
                    context={
                        "recovery_score": recovery_score,
                        "engagement_delta": engagement_improvement,
                        "frustration_delta": -frustration_reduction,
                        "confidence_delta": confidence_improvement,
                    },
                    cooldown_seconds=180,
                ))

        return triggers

    def _filter_by_cooldown(
        self,
        triggers: List[InterventionTrigger]
    ) -> List[InterventionTrigger]:
        """Filter triggers that are still in cooldown period."""
        now = datetime.utcnow()
        filtered = []

        for trigger in triggers:
            trigger_type = TriggerType(trigger.trigger_type)
            last_time = self._last_trigger_times.get(trigger_type)

            if last_time is None:
                filtered.append(trigger)
            else:
                elapsed = (now - last_time).total_seconds()
                if elapsed >= trigger.cooldown_seconds:
                    filtered.append(trigger)
                else:
                    logger.debug(
                        f"Trigger {trigger_type.value} in cooldown "
                        f"({elapsed:.0f}s / {trigger.cooldown_seconds}s)"
                    )

        return filtered

    def get_priority_trigger(
        self,
        triggers: List[InterventionTrigger]
    ) -> Optional[InterventionTrigger]:
        """
        Return highest priority trigger for immediate action.

        Args:
            triggers: List of triggers to prioritize.

        Returns:
            Highest priority trigger, or None if list is empty.
        """
        if not triggers:
            return None
        # Already sorted by priority in evaluate()
        return triggers[0]

    def get_triggers_by_type(
        self,
        triggers: List[InterventionTrigger],
        trigger_type: TriggerType
    ) -> List[InterventionTrigger]:
        """Get all triggers of a specific type."""
        return [t for t in triggers if TriggerType(t.trigger_type) == trigger_type]

    def reset_cooldowns(self) -> None:
        """Reset all cooldown timers."""
        self._last_trigger_times.clear()

    def reset(self) -> None:
        """Reset engine state for a new session."""
        self._last_trigger_times.clear()
        self._previous_state = None


def create_trigger_engine(
    profile: Optional[LearnerProfile] = None,
    thresholds: Optional[Dict] = None
) -> TriggerEngine:
    """
    Factory function to create a configured trigger engine.

    Args:
        profile: Learner profile for personalized thresholds.
        thresholds: Optional threshold overrides.

    Returns:
        Configured TriggerEngine instance.
    """
    if profile:
        engine_thresholds = TriggerThresholds.for_learner(profile)
    elif thresholds:
        engine_thresholds = TriggerThresholds.from_dict(thresholds)
    else:
        engine_thresholds = TriggerThresholds()

    return TriggerEngine(engine_thresholds)
