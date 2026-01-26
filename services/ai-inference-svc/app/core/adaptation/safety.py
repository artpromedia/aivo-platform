"""
Safety Monitor and Rollback Logic for Content Adaptation.

This module implements safety monitoring that tracks learner performance
after adaptations and triggers rollbacks when performance degrades
beyond acceptable thresholds.
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from .models import (
    AdaptationResult,
    AdaptationStrategy,
    ContentFeatures,
    PerformanceMetrics,
    RollbackResult,
)

logger = logging.getLogger(__name__)


@dataclass
class RollbackTriggers:
    """Configuration for rollback trigger thresholds."""

    accuracy_drop: float = 0.2  # 20% drop from baseline triggers rollback
    frustration_spike: float = 0.3  # 30% increase in frustration
    engagement_crash: float = 0.4  # 40% drop in engagement
    consecutive_failures: int = 3  # 3 failures in a row
    cognitive_overload: float = 0.85  # Cognitive load above 85%
    rapid_response_decline: float = 0.5  # 50% increase in response time


@dataclass
class SafetyState:
    """Tracks safety-related state for a learner."""

    learner_id: str
    baseline_metrics: Optional[PerformanceMetrics] = None
    adaptation_stack: List[AdaptationResult] = field(default_factory=list)
    rollback_count: int = 0
    last_rollback_time: Optional[datetime] = None
    consecutive_rollbacks: int = 0
    warning_issued: bool = False


class SafetyMonitor:
    """
    Monitors adaptation safety and triggers rollbacks when needed.

    Tracks learner performance before and after adaptations, detects
    degradation patterns, and initiates rollbacks to restore previous
    content states when safety thresholds are breached.
    """

    def __init__(
        self,
        triggers: Optional[RollbackTriggers] = None,
        min_observations_before_rollback: int = 3,
        rollback_cooldown_minutes: int = 5,
        max_rollback_depth: int = 3,
    ) -> None:
        """
        Initialize the safety monitor.

        Args:
            triggers: Rollback trigger configuration
            min_observations_before_rollback: Minimum observations before rollback
            rollback_cooldown_minutes: Cooldown between rollbacks
            max_rollback_depth: Maximum number of adaptations to roll back
        """
        self.triggers = triggers or RollbackTriggers()
        self.min_observations = min_observations_before_rollback
        self.rollback_cooldown = timedelta(minutes=rollback_cooldown_minutes)
        self.max_rollback_depth = max_rollback_depth

        # State tracking per learner
        self._safety_states: Dict[str, SafetyState] = {}
        self._observation_counts: Dict[str, int] = defaultdict(int)

    def register_adaptation(
        self,
        learner_id: str,
        adaptation: AdaptationResult,
        baseline: Optional[PerformanceMetrics] = None,
    ) -> None:
        """
        Register a new adaptation for safety monitoring.

        Args:
            learner_id: The learner identifier
            adaptation: The adaptation that was applied
            baseline: Optional baseline metrics (if first adaptation)
        """
        state = self._get_or_create_state(learner_id)

        # Set baseline if provided and not already set
        if baseline and not state.baseline_metrics:
            state.baseline_metrics = baseline
            logger.info(
                f"Set baseline for learner {learner_id}: "
                f"accuracy={baseline.accuracy:.2f}"
            )

        # Add to adaptation stack
        if adaptation.rollback_available:
            state.adaptation_stack.append(adaptation)
            logger.debug(
                f"Registered adaptation {adaptation.adaptation_id} "
                f"for learner {learner_id}"
            )

        # Reset observation count for new adaptation
        self._observation_counts[learner_id] = 0

    async def check_and_rollback(
        self,
        learner_id: str,
        current_metrics: PerformanceMetrics,
        cognitive_state: Optional[Dict[str, float]] = None,
    ) -> Optional[RollbackResult]:
        """
        Check if rollback is needed and execute if so.

        Evaluates current performance against baseline and trigger
        thresholds, then rolls back if conditions are met.

        Args:
            learner_id: The learner identifier
            current_metrics: Current performance metrics
            cognitive_state: Optional current cognitive state

        Returns:
            RollbackResult if rollback was performed, None otherwise
        """
        state = self._safety_states.get(learner_id)
        if not state:
            return None

        # Increment observation count
        self._observation_counts[learner_id] += 1

        # Check if we have enough observations
        if self._observation_counts[learner_id] < self.min_observations:
            logger.debug(
                f"Not enough observations for learner {learner_id}: "
                f"{self._observation_counts[learner_id]}/{self.min_observations}"
            )
            return None

        # Check cooldown
        if not self._can_rollback(state):
            logger.debug(f"Rollback cooldown active for learner {learner_id}")
            return None

        # Evaluate if rollback is needed
        should_rollback, reason = self._should_rollback(
            state, current_metrics, cognitive_state
        )

        if should_rollback:
            return await self._execute_rollback(state, reason)

        # Clear warning if performance recovered
        if state.warning_issued and self._performance_recovered(
            state.baseline_metrics, current_metrics
        ):
            state.warning_issued = False
            state.consecutive_rollbacks = 0
            logger.info(f"Performance recovered for learner {learner_id}")

        return None

    def _should_rollback(
        self,
        state: SafetyState,
        current: PerformanceMetrics,
        cognitive_state: Optional[Dict[str, float]],
    ) -> Tuple[bool, str]:
        """
        Determine if rollback is warranted.

        Args:
            state: Current safety state
            current: Current performance metrics
            cognitive_state: Optional cognitive state

        Returns:
            Tuple of (should_rollback, reason)
        """
        if not state.baseline_metrics:
            return False, ""

        baseline = state.baseline_metrics

        # Check accuracy drop
        accuracy_drop = baseline.accuracy - current.accuracy
        if accuracy_drop > self.triggers.accuracy_drop:
            logger.warning(
                f"Accuracy drop detected for learner {state.learner_id}: "
                f"{accuracy_drop:.2f} > threshold {self.triggers.accuracy_drop:.2f}"
            )
            return True, f"Accuracy dropped by {accuracy_drop:.1%}"

        # Check consecutive failures
        if current.consecutive_failures >= self.triggers.consecutive_failures:
            logger.warning(
                f"Consecutive failures for learner {state.learner_id}: "
                f"{current.consecutive_failures}"
            )
            return True, f"{current.consecutive_failures} consecutive failures"

        # Check cognitive state if provided
        if cognitive_state:
            # Cognitive overload
            if cognitive_state.get("cognitive_load", 0) > self.triggers.cognitive_overload:
                logger.warning(
                    f"Cognitive overload for learner {state.learner_id}: "
                    f"{cognitive_state['cognitive_load']:.2f}"
                )
                return True, "Cognitive overload detected"

            # Frustration spike
            frustration = cognitive_state.get("frustration", 0)
            baseline_frustration = cognitive_state.get("baseline_frustration", 0.3)
            if frustration - baseline_frustration > self.triggers.frustration_spike:
                logger.warning(
                    f"Frustration spike for learner {state.learner_id}: "
                    f"{frustration:.2f}"
                )
                return True, "Frustration spike detected"

            # Engagement crash
            engagement = cognitive_state.get("engagement", 1.0)
            baseline_engagement = cognitive_state.get("baseline_engagement", 0.7)
            if baseline_engagement - engagement > self.triggers.engagement_crash:
                logger.warning(
                    f"Engagement crash for learner {state.learner_id}: "
                    f"{engagement:.2f}"
                )
                return True, "Engagement crashed"

        # Check response time degradation
        if baseline.average_response_time_ms > 0:
            time_increase = (
                current.average_response_time_ms - baseline.average_response_time_ms
            ) / baseline.average_response_time_ms

            if time_increase > self.triggers.rapid_response_decline:
                logger.warning(
                    f"Response time degradation for learner {state.learner_id}: "
                    f"{time_increase:.1%} increase"
                )
                # Issue warning first time, rollback on second
                if state.warning_issued:
                    return True, f"Response time increased by {time_increase:.1%}"
                else:
                    state.warning_issued = True
                    logger.info(
                        f"Warning issued for learner {state.learner_id}: "
                        "response time degradation"
                    )

        return False, ""

    async def _execute_rollback(
        self,
        state: SafetyState,
        reason: str,
    ) -> RollbackResult:
        """
        Execute a rollback to previous content state.

        Args:
            state: Current safety state
            reason: Reason for rollback

        Returns:
            RollbackResult with details of what was rolled back
        """
        if not state.adaptation_stack:
            logger.warning(
                f"No adaptations to rollback for learner {state.learner_id}"
            )
            return RollbackResult(
                learner_id=state.learner_id,
                adaptation_id="",
                rolled_back_strategies=[],
                rollback_reason=reason,
                restored_features=ContentFeatures(),
                triggered_by="safety_monitor",
            )

        # Determine rollback depth based on consecutive rollbacks
        rollback_depth = min(
            state.consecutive_rollbacks + 1,
            self.max_rollback_depth,
            len(state.adaptation_stack),
        )

        # Collect adaptations to rollback
        rolled_back: List[AdaptationResult] = []
        for _ in range(rollback_depth):
            if state.adaptation_stack:
                rolled_back.append(state.adaptation_stack.pop())

        # Collect all rolled back strategies
        all_strategies = []
        for adaptation in rolled_back:
            all_strategies.extend(adaptation.strategies_applied)

        # Get restored features from the last remaining adaptation
        # or original features if stack is empty
        if state.adaptation_stack:
            restored_features = state.adaptation_stack[-1].new_features
        elif rolled_back:
            restored_features = rolled_back[-1].original_features
        else:
            restored_features = ContentFeatures()

        # Update state
        state.rollback_count += 1
        state.last_rollback_time = datetime.utcnow()
        state.consecutive_rollbacks += 1

        result = RollbackResult(
            learner_id=state.learner_id,
            adaptation_id=rolled_back[0].adaptation_id if rolled_back else "",
            rolled_back_strategies=all_strategies,
            rollback_reason=reason,
            restored_features=restored_features,
            triggered_by="safety_monitor",
        )

        logger.info(
            f"Executed rollback for learner {state.learner_id}: "
            f"rolled back {len(all_strategies)} strategies, reason: {reason}"
        )

        return result

    def _can_rollback(self, state: SafetyState) -> bool:
        """Check if rollback is allowed (cooldown period)."""
        if not state.last_rollback_time:
            return True

        elapsed = datetime.utcnow() - state.last_rollback_time
        return elapsed >= self.rollback_cooldown

    def _performance_recovered(
        self,
        baseline: Optional[PerformanceMetrics],
        current: PerformanceMetrics,
    ) -> bool:
        """Check if performance has recovered to baseline levels."""
        if not baseline:
            return False

        # Consider recovered if accuracy is within 5% of baseline
        accuracy_diff = abs(baseline.accuracy - current.accuracy)
        return accuracy_diff <= 0.05

    def _get_or_create_state(self, learner_id: str) -> SafetyState:
        """Get or create safety state for a learner."""
        if learner_id not in self._safety_states:
            self._safety_states[learner_id] = SafetyState(learner_id=learner_id)
        return self._safety_states[learner_id]

    def set_baseline(
        self,
        learner_id: str,
        metrics: PerformanceMetrics,
    ) -> None:
        """
        Set baseline metrics for a learner.

        Args:
            learner_id: The learner identifier
            metrics: Baseline performance metrics
        """
        state = self._get_or_create_state(learner_id)
        state.baseline_metrics = metrics
        logger.info(
            f"Set baseline for learner {learner_id}: "
            f"accuracy={metrics.accuracy:.2f}"
        )

    def get_safety_state(self, learner_id: str) -> Optional[SafetyState]:
        """Get current safety state for a learner."""
        return self._safety_states.get(learner_id)

    def get_rollback_stats(self, learner_id: str) -> Dict[str, Any]:
        """Get rollback statistics for a learner."""
        state = self._safety_states.get(learner_id)
        if not state:
            return {
                "total_rollbacks": 0,
                "consecutive_rollbacks": 0,
                "adaptation_stack_depth": 0,
                "warning_issued": False,
            }

        return {
            "total_rollbacks": state.rollback_count,
            "consecutive_rollbacks": state.consecutive_rollbacks,
            "adaptation_stack_depth": len(state.adaptation_stack),
            "warning_issued": state.warning_issued,
            "last_rollback_time": state.last_rollback_time,
        }

    def clear_learner_state(self, learner_id: str) -> None:
        """Clear all safety state for a learner."""
        if learner_id in self._safety_states:
            del self._safety_states[learner_id]
        if learner_id in self._observation_counts:
            del self._observation_counts[learner_id]
        logger.info(f"Cleared safety state for learner {learner_id}")

    def reset_consecutive_rollbacks(self, learner_id: str) -> None:
        """Reset consecutive rollback counter (e.g., after session break)."""
        state = self._safety_states.get(learner_id)
        if state:
            state.consecutive_rollbacks = 0
            state.warning_issued = False
            logger.debug(
                f"Reset consecutive rollbacks for learner {learner_id}"
            )


class GradualTransitionManager:
    """
    Manages gradual difficulty transitions over multiple sessions.

    Ensures that difficulty changes happen slowly over 5-10 sessions
    rather than abruptly, reducing learner stress and improving
    adaptation effectiveness.
    """

    def __init__(
        self,
        target_sessions: int = 7,
        max_change_per_session: float = 0.1,
    ) -> None:
        """
        Initialize the transition manager.

        Args:
            target_sessions: Target number of sessions for full transition
            max_change_per_session: Maximum difficulty change per session
        """
        self.target_sessions = target_sessions
        self.max_change_per_session = max_change_per_session

        # Track transitions per learner
        self._transitions: Dict[str, Dict[str, Any]] = {}

    def start_transition(
        self,
        learner_id: str,
        feature_name: str,
        start_value: float,
        target_value: float,
    ) -> None:
        """
        Start a gradual transition for a feature.

        Args:
            learner_id: The learner identifier
            feature_name: Name of the feature to transition
            start_value: Starting value
            target_value: Target value
        """
        key = f"{learner_id}:{feature_name}"

        total_change = target_value - start_value
        sessions_needed = max(
            1,
            int(abs(total_change) / self.max_change_per_session),
        )
        sessions_needed = min(sessions_needed, self.target_sessions)

        self._transitions[key] = {
            "start_value": start_value,
            "target_value": target_value,
            "current_value": start_value,
            "sessions_completed": 0,
            "sessions_needed": sessions_needed,
            "change_per_session": total_change / sessions_needed,
            "started_at": datetime.utcnow(),
        }

        logger.info(
            f"Started transition for {learner_id}/{feature_name}: "
            f"{start_value:.2f} -> {target_value:.2f} over {sessions_needed} sessions"
        )

    def get_current_value(
        self,
        learner_id: str,
        feature_name: str,
        default: float = 0.5,
    ) -> float:
        """
        Get the current value for a transitioning feature.

        Args:
            learner_id: The learner identifier
            feature_name: Name of the feature
            default: Default value if no transition

        Returns:
            Current transition value
        """
        key = f"{learner_id}:{feature_name}"
        transition = self._transitions.get(key)

        if not transition:
            return default

        return transition["current_value"]

    def advance_session(
        self,
        learner_id: str,
        feature_name: str,
    ) -> Tuple[float, bool]:
        """
        Advance the transition by one session.

        Args:
            learner_id: The learner identifier
            feature_name: Name of the feature

        Returns:
            Tuple of (new_value, is_complete)
        """
        key = f"{learner_id}:{feature_name}"
        transition = self._transitions.get(key)

        if not transition:
            return 0.5, True

        # Update session count
        transition["sessions_completed"] += 1

        # Calculate new value
        new_value = transition["current_value"] + transition["change_per_session"]

        # Clamp to valid range and target
        if transition["change_per_session"] > 0:
            new_value = min(new_value, transition["target_value"])
        else:
            new_value = max(new_value, transition["target_value"])

        transition["current_value"] = new_value

        # Check if complete
        is_complete = (
            transition["sessions_completed"] >= transition["sessions_needed"]
            or abs(new_value - transition["target_value"]) < 0.01
        )

        if is_complete:
            logger.info(
                f"Transition complete for {learner_id}/{feature_name}: "
                f"final value {new_value:.2f}"
            )
            # Optionally clean up
            # del self._transitions[key]

        return new_value, is_complete

    def get_transition_status(
        self,
        learner_id: str,
        feature_name: str,
    ) -> Optional[Dict[str, Any]]:
        """Get the status of a transition."""
        key = f"{learner_id}:{feature_name}"
        transition = self._transitions.get(key)

        if not transition:
            return None

        return {
            "start_value": transition["start_value"],
            "target_value": transition["target_value"],
            "current_value": transition["current_value"],
            "progress": (
                transition["sessions_completed"] / transition["sessions_needed"]
            ),
            "sessions_remaining": (
                transition["sessions_needed"] - transition["sessions_completed"]
            ),
        }

    def cancel_transition(
        self,
        learner_id: str,
        feature_name: str,
    ) -> None:
        """Cancel an ongoing transition."""
        key = f"{learner_id}:{feature_name}"
        if key in self._transitions:
            del self._transitions[key]
            logger.info(f"Cancelled transition for {learner_id}/{feature_name}")

    def get_all_transitions(
        self,
        learner_id: str,
    ) -> Dict[str, Dict[str, Any]]:
        """Get all active transitions for a learner."""
        prefix = f"{learner_id}:"
        return {
            key.replace(prefix, ""): value
            for key, value in self._transitions.items()
            if key.startswith(prefix)
        }
