"""
Cognitive State Detector for Real-time Learner Monitoring.

This module detects cognitive state changes from interaction signals
using exponential moving averages and multi-factor analysis.
The detector processes signals in real-time to update learner state
with < 50ms processing time per update.
"""

import logging
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Deque, Dict, List, Optional, Tuple

from .state import (
    CognitiveLoadLevel,
    CognitiveState,
    CognitiveStateUpdate,
    DetectorConfig,
    EngagementLevel,
    LearnerProfile,
    SignalType,
    StateSnapshot,
)

logger = logging.getLogger(__name__)


@dataclass
class SignalBuffer:
    """
    Circular buffer for recent signals of each type.

    Maintains a fixed-size window of recent signals for each type
    to enable pattern detection and trend analysis.
    """

    max_size: int = 50
    signals: Dict[SignalType, Deque[CognitiveStateUpdate]] = field(
        default_factory=lambda: {st: deque(maxlen=50) for st in SignalType}
    )

    def add(self, signal: CognitiveStateUpdate) -> None:
        """Add a signal to the appropriate buffer."""
        self.signals[signal.signal_type].append(signal)

    def get_recent(
        self,
        signal_type: SignalType,
        count: int = 10
    ) -> List[CognitiveStateUpdate]:
        """Get the most recent signals of a specific type."""
        buffer = self.signals[signal_type]
        return list(buffer)[-count:] if buffer else []

    def get_all_recent(self, seconds: float = 60.0) -> List[CognitiveStateUpdate]:
        """Get all signals from the last N seconds."""
        cutoff = datetime.utcnow() - timedelta(seconds=seconds)
        result = []
        for buffer in self.signals.values():
            result.extend(s for s in buffer if s.timestamp > cutoff)
        return sorted(result, key=lambda s: s.timestamp)

    def count_recent(
        self,
        signal_type: SignalType,
        seconds: float = 60.0
    ) -> int:
        """Count signals of a type in the last N seconds."""
        cutoff = datetime.utcnow() - timedelta(seconds=seconds)
        return sum(1 for s in self.signals[signal_type] if s.timestamp > cutoff)

    def average_value(
        self,
        signal_type: SignalType,
        count: int = 10
    ) -> Optional[float]:
        """Calculate average value of recent signals of a type."""
        recent = self.get_recent(signal_type, count)
        if not recent:
            return None
        return sum(s.signal_value for s in recent) / len(recent)

    def clear(self) -> None:
        """Clear all signal buffers."""
        for buffer in self.signals.values():
            buffer.clear()


class CognitiveStateDetector:
    """
    Detects cognitive state changes from interaction signals.

    Uses exponential moving average for smooth state transitions and
    multi-factor analysis to calculate frustration, engagement, fatigue,
    and other cognitive dimensions from learner interaction signals.
    """

    def __init__(self, config: Optional[DetectorConfig] = None):
        """
        Initialize the detector with configuration.

        Args:
            config: Detector configuration. Uses defaults if not provided.
        """
        self.config = config or DetectorConfig()
        self.signal_buffer = SignalBuffer()
        self._consecutive_errors = 0
        self._consecutive_successes = 0
        self._last_frustration_high_time: Optional[datetime] = None
        self._processing_times: Deque[float] = deque(maxlen=100)

    async def update_state(
        self,
        current_state: CognitiveState,
        signals: List[CognitiveStateUpdate],
        learner_profile: LearnerProfile
    ) -> CognitiveState:
        """
        Update cognitive state based on new signals.

        Uses exponential moving average for smooth transitions and
        combines multiple signal types to update each cognitive dimension.
        Processing time is tracked and should be < 50ms.

        Args:
            current_state: Current cognitive state to update.
            signals: List of new signals to process.
            learner_profile: Learner's profile for personalized thresholds.

        Returns:
            Updated cognitive state.
        """
        start_time = time.perf_counter()

        # Add signals to buffer
        for signal in signals:
            self.signal_buffer.add(signal)
            self._update_streak_counters(signal)

        # Calculate new values for each dimension
        new_frustration = self._calculate_frustration(
            signals, current_state.frustration, learner_profile
        )
        new_engagement = self._calculate_engagement(
            signals, current_state.engagement, learner_profile
        )
        new_fatigue = self._calculate_fatigue(
            signals, current_state, learner_profile
        )
        new_cognitive_load = self._calculate_cognitive_load(
            signals, current_state.cognitive_load, learner_profile
        )
        new_confidence = self._calculate_confidence(
            signals, current_state.confidence, learner_profile
        )
        new_motivation = self._calculate_motivation(
            signals, current_state, learner_profile
        )

        # Apply exponential moving average for smooth transitions
        alpha = self.config.ema_alpha
        updated_state = CognitiveState(
            learner_id=current_state.learner_id,
            session_id=current_state.session_id,
            cognitive_load=self._ema(current_state.cognitive_load, new_cognitive_load, alpha),
            engagement=self._ema(current_state.engagement, new_engagement, alpha),
            frustration=self._ema(current_state.frustration, new_frustration, alpha),
            fatigue=self._ema(current_state.fatigue, new_fatigue, alpha),
            confidence=self._ema(current_state.confidence, new_confidence, alpha),
            motivation=self._ema(current_state.motivation, new_motivation, alpha),
            session_start=current_state.session_start,
            last_break=current_state.last_break,
            state_history=current_state.state_history,
            update_count=current_state.update_count + 1,
        )

        # Update derived states
        updated_state.engagement_level = EngagementLevel.from_score(updated_state.engagement)
        updated_state.cognitive_load_level = CognitiveLoadLevel.from_score(
            updated_state.cognitive_load,
            (learner_profile.optimal_cognitive_load - 0.15,
             learner_profile.optimal_cognitive_load + 0.15)
        )
        updated_state.attention_span_minutes = self._calculate_remaining_attention(
            updated_state, learner_profile
        )
        updated_state.needs_break = self._detect_needs_break(updated_state, learner_profile)

        # Check warmup completion
        if not current_state.warmup_complete:
            warmup_seconds = self.config.warmup_period_seconds
            if updated_state.session_duration_minutes >= warmup_seconds / 60.0:
                updated_state.warmup_complete = True

        # Track frustration duration for sustained frustration detection
        if updated_state.frustration > learner_profile.frustration_threshold:
            if self._last_frustration_high_time is None:
                self._last_frustration_high_time = datetime.utcnow()
        else:
            self._last_frustration_high_time = None

        # Update timestamp and add to history
        updated_state.last_updated = datetime.utcnow()
        updated_state.add_to_history()

        # Track processing time
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        self._processing_times.append(elapsed_ms)
        if elapsed_ms > 50:
            logger.warning(f"State update took {elapsed_ms:.2f}ms (target: <50ms)")

        return updated_state

    def _ema(self, old_value: float, new_value: float, alpha: float) -> float:
        """Apply exponential moving average."""
        return alpha * new_value + (1 - alpha) * old_value

    def _update_streak_counters(self, signal: CognitiveStateUpdate) -> None:
        """Update consecutive success/error counters."""
        if signal.signal_type == SignalType.ACCURACY:
            if signal.signal_value >= 0.5:  # Correct answer
                self._consecutive_successes += 1
                self._consecutive_errors = 0
            else:  # Incorrect answer
                self._consecutive_errors += 1
                self._consecutive_successes = 0

    def _calculate_frustration(
        self,
        signals: List[CognitiveStateUpdate],
        current_frustration: float,
        learner_profile: LearnerProfile
    ) -> float:
        """
        Calculate frustration from interaction signals.

        Frustration indicators:
        - Repeated incorrect answers (consecutive errors)
        - Increasing response times
        - Multiple hint requests
        - Rapid clicking/skipping behavior

        Args:
            signals: Recent signals to process.
            current_frustration: Current frustration level.
            learner_profile: Learner profile for baselines.

        Returns:
            Calculated frustration level (0-1).
        """
        if not signals:
            return current_frustration

        frustration_factors = []
        config = self.config

        # Factor 1: Consecutive errors
        if self._consecutive_errors > 0:
            error_factor = min(self._consecutive_errors / 5.0, 1.0)  # Max at 5 errors
            frustration_factors.append(
                (error_factor, config.consecutive_errors_weight)
            )

        # Factor 2: Response time increases
        response_times = self.signal_buffer.get_recent(SignalType.RESPONSE_TIME, 10)
        if len(response_times) >= 3:
            recent_avg = sum(s.signal_value for s in response_times[-3:]) / 3
            earlier_avg = sum(s.signal_value for s in response_times[:3]) / 3 if len(response_times) >= 6 else recent_avg
            if earlier_avg > 0:
                time_increase = max(0, (recent_avg - earlier_avg) / earlier_avg)
                frustration_factors.append(
                    (min(time_increase, 1.0), config.frustration_response_time_factor)
                )

        # Factor 3: Low accuracy
        accuracy_signals = [s for s in signals if s.signal_type == SignalType.ACCURACY]
        if accuracy_signals:
            avg_accuracy = sum(s.signal_value for s in accuracy_signals) / len(accuracy_signals)
            accuracy_frustration = max(0, 1.0 - avg_accuracy * 1.5)  # Low accuracy -> high frustration
            frustration_factors.append(
                (accuracy_frustration, config.frustration_accuracy_factor)
            )

        # Factor 4: Hint requests
        hint_count = self.signal_buffer.count_recent(SignalType.HINT_REQUEST, 120)
        if hint_count > 0:
            hint_factor = min(hint_count / 4.0, 1.0)  # Max at 4 hints in 2 minutes
            frustration_factors.append(
                (hint_factor, config.frustration_hint_factor)
            )

        # Factor 5: Rapid clicking / skipping
        skip_count = self.signal_buffer.count_recent(SignalType.SKIP_ACTION, 60)
        rapid_click_count = self.signal_buffer.count_recent(SignalType.RAPID_CLICKING, 60)
        if skip_count + rapid_click_count > 0:
            agitation_factor = min((skip_count + rapid_click_count) / 5.0, 1.0)
            frustration_factors.append(
                (agitation_factor, config.frustration_rapid_click_factor)
            )

        # Calculate weighted average
        if frustration_factors:
            total_weight = sum(w for _, w in frustration_factors)
            weighted_sum = sum(v * w for v, w in frustration_factors)
            return min(max(weighted_sum / total_weight, 0.0), 1.0)

        return current_frustration

    def _calculate_engagement(
        self,
        signals: List[CognitiveStateUpdate],
        current_engagement: float,
        learner_profile: LearnerProfile
    ) -> float:
        """
        Calculate engagement from interaction signals.

        Engagement indicators:
        - Response consistency (not too fast, not too slow)
        - Time on task (active interaction)
        - Interaction depth (exploring content)
        - Question exploration (trying different approaches)

        Args:
            signals: Recent signals to process.
            current_engagement: Current engagement level.
            learner_profile: Learner profile for baselines.

        Returns:
            Calculated engagement level (0-1).
        """
        if not signals:
            return current_engagement

        engagement_factors = []
        config = self.config

        # Factor 1: Response time consistency
        response_times = self.signal_buffer.get_recent(SignalType.RESPONSE_TIME, 10)
        if len(response_times) >= 3:
            values = [s.signal_value for s in response_times]
            mean_val = sum(values) / len(values)
            variance = sum((v - mean_val) ** 2 for v in values) / len(values)
            # Low variance = consistent = engaged
            consistency = max(0, 1.0 - min(variance, 1.0))
            engagement_factors.append(
                (consistency, config.engagement_consistency_weight)
            )

        # Factor 2: Interaction rate (time on task)
        interaction_signals = self.signal_buffer.get_all_recent(120)  # Last 2 minutes
        if interaction_signals:
            # Good interaction rate is around 1-2 interactions per minute
            rate = len(interaction_signals) / 2.0  # Per minute
            # Optimal range: 0.5 - 3 interactions per minute
            if 0.5 <= rate <= 3.0:
                time_on_task = 1.0
            elif rate < 0.5:
                time_on_task = rate / 0.5  # Penalize low rate
            else:
                time_on_task = max(0.5, 1.0 - (rate - 3.0) / 5.0)  # Penalize rushing
            engagement_factors.append(
                (time_on_task, config.engagement_time_on_task_weight)
            )

        # Factor 3: Content exploration
        exploration_count = self.signal_buffer.count_recent(
            SignalType.QUESTION_EXPLORATION, 300  # Last 5 minutes
        )
        content_revisit_count = self.signal_buffer.count_recent(
            SignalType.CONTENT_REVISIT, 300
        )
        if exploration_count + content_revisit_count > 0:
            exploration_factor = min((exploration_count + content_revisit_count) / 3.0, 1.0)
            engagement_factors.append(
                (exploration_factor, config.engagement_exploration_weight)
            )

        # Factor 4: Retry attempts (shows persistence)
        retry_count = self.signal_buffer.count_recent(SignalType.RETRY_ATTEMPT, 300)
        if retry_count > 0:
            depth_factor = min(retry_count / 5.0, 1.0)
            engagement_factors.append(
                (depth_factor, config.engagement_interaction_depth_weight)
            )

        # Negative factors
        # Pause duration (long pauses indicate disengagement)
        pause_signals = self.signal_buffer.get_recent(SignalType.PAUSE_DURATION, 5)
        if pause_signals:
            avg_pause = sum(s.signal_value for s in pause_signals) / len(pause_signals)
            # Pauses > 30 seconds normalized to 0-1
            pause_penalty = min(avg_pause / 60.0, 0.5)  # Max 0.5 penalty
            engagement_factors.append(
                (1.0 - pause_penalty, 0.2)
            )

        # Calculate weighted average
        if engagement_factors:
            total_weight = sum(w for _, w in engagement_factors)
            weighted_sum = sum(v * w for v, w in engagement_factors)
            return min(max(weighted_sum / total_weight, 0.0), 1.0)

        return current_engagement

    def _calculate_fatigue(
        self,
        signals: List[CognitiveStateUpdate],
        current_state: CognitiveState,
        learner_profile: LearnerProfile
    ) -> float:
        """
        Calculate fatigue from session duration and performance trends.

        Fatigue indicators:
        - Session duration vs baseline attention span
        - Decreasing performance over time
        - Increasing response times
        - Time since last break

        Args:
            signals: Recent signals to process.
            current_state: Current cognitive state.
            learner_profile: Learner profile for baselines.

        Returns:
            Calculated fatigue level (0-1).
        """
        fatigue_factors = []
        config = self.config

        # Factor 1: Session duration relative to attention span
        session_duration = current_state.session_duration_minutes
        attention_span = learner_profile.effective_attention_span
        duration_ratio = session_duration / attention_span if attention_span > 0 else 0
        duration_fatigue = min(duration_ratio * 0.8, 1.0)  # Max out at 125% of attention span
        fatigue_factors.append(
            (duration_fatigue, config.fatigue_session_duration_weight)
        )

        # Factor 2: Performance decline over session
        if len(current_state.state_history) >= 5:
            # Compare early accuracy to recent accuracy
            early_states = current_state.state_history[:5]
            recent_states = current_state.state_history[-5:]
            early_engagement = sum(s.get("engagement", 0.7) for s in early_states) / 5
            recent_engagement = sum(s.get("engagement", 0.7) for s in recent_states) / 5
            if early_engagement > 0:
                decline = max(0, (early_engagement - recent_engagement) / early_engagement)
                fatigue_factors.append(
                    (decline, config.fatigue_performance_decline_weight)
                )

        # Factor 3: Response time increase
        response_times = self.signal_buffer.get_recent(SignalType.RESPONSE_TIME, 20)
        if len(response_times) >= 10:
            first_half = response_times[:10]
            second_half = response_times[10:]
            first_avg = sum(s.signal_value for s in first_half) / len(first_half)
            second_avg = sum(s.signal_value for s in second_half) / len(second_half)
            if first_avg > 0:
                time_increase = max(0, (second_avg - first_avg) / first_avg)
                fatigue_factors.append(
                    (min(time_increase, 1.0), config.fatigue_response_time_increase_weight)
                )

        # Factor 4: Time since break
        break_interval = learner_profile.recommended_break_interval
        time_since_break = current_state.minutes_since_break or session_duration
        if break_interval > 0:
            break_overdue_ratio = time_since_break / break_interval
            if break_overdue_ratio > 1.0:
                break_fatigue = min((break_overdue_ratio - 1.0) * 0.5, 0.5)
                fatigue_factors.append(
                    (break_fatigue, config.fatigue_break_absence_weight)
                )

        # Calculate weighted average
        if fatigue_factors:
            total_weight = sum(w for _, w in fatigue_factors)
            weighted_sum = sum(v * w for v, w in fatigue_factors)
            return min(max(weighted_sum / total_weight, 0.0), 1.0)

        return current_state.fatigue

    def _calculate_cognitive_load(
        self,
        signals: List[CognitiveStateUpdate],
        current_load: float,
        learner_profile: LearnerProfile
    ) -> float:
        """
        Calculate cognitive load from task complexity and performance.

        High cognitive load indicators:
        - Slow response times
        - High hint usage
        - Low accuracy on difficult content
        - Extended pauses (processing time)

        Args:
            signals: Recent signals to process.
            current_load: Current cognitive load level.
            learner_profile: Learner profile for baselines.

        Returns:
            Calculated cognitive load level (0-1).
        """
        load_factors = []

        # Factor 1: Response time relative to baseline
        response_times = self.signal_buffer.get_recent(SignalType.RESPONSE_TIME, 5)
        if response_times:
            avg_time = sum(s.raw_value or s.signal_value * 10000 for s in response_times) / len(response_times)
            baseline = learner_profile.baseline_response_time_ms
            time_ratio = avg_time / baseline if baseline > 0 else 1.0
            # Response time 2x baseline = high load
            load_from_time = min(time_ratio / 2.0, 1.0)
            load_factors.append((load_from_time, 0.35))

        # Factor 2: Hint requests indicate high load
        hint_count = self.signal_buffer.count_recent(SignalType.HINT_REQUEST, 180)
        if hint_count > 0:
            hint_load = min(hint_count / 3.0, 1.0)
            load_factors.append((hint_load, 0.25))

        # Factor 3: Accuracy inversely related to load
        accuracy_signals = [s for s in signals if s.signal_type == SignalType.ACCURACY]
        if accuracy_signals:
            avg_accuracy = sum(s.signal_value for s in accuracy_signals) / len(accuracy_signals)
            # Low accuracy suggests high load
            accuracy_load = 1.0 - avg_accuracy
            load_factors.append((accuracy_load, 0.25))

        # Factor 4: Pause duration indicates processing
        pause_signals = self.signal_buffer.get_recent(SignalType.PAUSE_DURATION, 5)
        if pause_signals:
            avg_pause = sum(s.signal_value for s in pause_signals) / len(pause_signals)
            # Moderate pauses (10-30s) indicate optimal load
            # Very long pauses (>60s) indicate overload
            if avg_pause > 60:
                pause_load = min(avg_pause / 120.0, 1.0)
            elif avg_pause > 30:
                pause_load = 0.6 + (avg_pause - 30) / 60
            else:
                pause_load = avg_pause / 50.0
            load_factors.append((pause_load, 0.15))

        if load_factors:
            total_weight = sum(w for _, w in load_factors)
            weighted_sum = sum(v * w for v, w in load_factors)
            return min(max(weighted_sum / total_weight, 0.0), 1.0)

        return current_load

    def _calculate_confidence(
        self,
        signals: List[CognitiveStateUpdate],
        current_confidence: float,
        learner_profile: LearnerProfile
    ) -> float:
        """
        Calculate learner confidence from success patterns.

        Confidence indicators:
        - Recent success rate
        - Decreasing hint usage
        - Consistent response times (not hesitating)
        - Success streaks

        Args:
            signals: Recent signals to process.
            current_confidence: Current confidence level.
            learner_profile: Learner profile for baselines.

        Returns:
            Calculated confidence level (0-1).
        """
        confidence_factors = []

        # Factor 1: Success streak
        if self._consecutive_successes > 0:
            streak_confidence = min(self._consecutive_successes / 5.0, 1.0)
            confidence_factors.append((streak_confidence, 0.35))
        elif self._consecutive_errors > 0:
            streak_penalty = min(self._consecutive_errors / 3.0, 0.5)
            confidence_factors.append((0.5 - streak_penalty, 0.35))

        # Factor 2: Recent accuracy
        accuracy_signals = [s for s in signals if s.signal_type == SignalType.ACCURACY]
        if accuracy_signals:
            avg_accuracy = sum(s.signal_value for s in accuracy_signals) / len(accuracy_signals)
            confidence_factors.append((avg_accuracy, 0.35))

        # Factor 3: Hint dependency (fewer hints = more confident)
        hint_count = self.signal_buffer.count_recent(SignalType.HINT_REQUEST, 300)
        interaction_count = len(self.signal_buffer.get_all_recent(300))
        if interaction_count > 0:
            hint_ratio = hint_count / max(interaction_count / 2, 1)
            hint_confidence = max(0, 1.0 - hint_ratio)
            confidence_factors.append((hint_confidence, 0.3))

        if confidence_factors:
            total_weight = sum(w for _, w in confidence_factors)
            weighted_sum = sum(v * w for v, w in confidence_factors)
            return min(max(weighted_sum / total_weight, 0.0), 1.0)

        return current_confidence

    def _calculate_motivation(
        self,
        signals: List[CognitiveStateUpdate],
        current_state: CognitiveState,
        learner_profile: LearnerProfile
    ) -> float:
        """
        Calculate learner motivation from engagement and persistence.

        Motivation indicators:
        - High engagement despite challenges
        - Retry attempts after failures
        - Continued participation
        - Low skip/quit behavior

        Args:
            signals: Recent signals to process.
            current_state: Current cognitive state.
            learner_profile: Learner profile for baselines.

        Returns:
            Calculated motivation level (0-1).
        """
        motivation_factors = []

        # Factor 1: Base on current engagement
        motivation_factors.append((current_state.engagement, 0.3))

        # Factor 2: Retry attempts show motivation
        retry_count = self.signal_buffer.count_recent(SignalType.RETRY_ATTEMPT, 300)
        if retry_count > 0:
            retry_motivation = min(retry_count / 5.0, 1.0)
            motivation_factors.append((retry_motivation, 0.25))

        # Factor 3: Low skip behavior
        skip_count = self.signal_buffer.count_recent(SignalType.SKIP_ACTION, 300)
        interaction_count = len(self.signal_buffer.get_all_recent(300))
        if interaction_count > 0:
            skip_ratio = skip_count / interaction_count
            skip_motivation = max(0, 1.0 - skip_ratio * 2)
            motivation_factors.append((skip_motivation, 0.25))

        # Factor 4: Inverse of frustration (motivated despite challenges)
        frustration_penalty = current_state.frustration * 0.5
        motivation_factors.append((1.0 - frustration_penalty, 0.2))

        if motivation_factors:
            total_weight = sum(w for _, w in motivation_factors)
            weighted_sum = sum(v * w for v, w in motivation_factors)
            return min(max(weighted_sum / total_weight, 0.0), 1.0)

        return current_state.motivation

    def _calculate_remaining_attention(
        self,
        state: CognitiveState,
        profile: LearnerProfile
    ) -> float:
        """
        Calculate estimated remaining attention span in minutes.

        Considers baseline attention span, current fatigue,
        time since break, and ADHD accommodations.

        Args:
            state: Current cognitive state.
            profile: Learner profile.

        Returns:
            Estimated remaining attention span in minutes.
        """
        base_span = profile.effective_attention_span
        elapsed = state.minutes_since_break or state.session_duration_minutes

        # Reduce based on elapsed time and fatigue
        remaining = base_span - elapsed
        fatigue_reduction = state.fatigue * base_span * 0.3
        remaining = remaining - fatigue_reduction

        # Never return negative
        return max(remaining, 0.0)

    def _detect_needs_break(
        self,
        state: CognitiveState,
        profile: LearnerProfile
    ) -> bool:
        """
        Determine if learner needs a break.

        Break conditions:
        - Fatigue level > threshold
        - Frustration sustained > 5 minutes
        - Session duration > attention span
        - ADHD accommodation requirements

        Args:
            state: Current cognitive state.
            profile: Learner profile.

        Returns:
            True if learner needs a break.
        """
        config = self.config

        # Don't trigger breaks during warmup
        if state.is_in_warmup:
            return False

        # Condition 1: High fatigue
        fatigue_threshold = config.fatigue_break_threshold
        if profile.has_adhd:
            fatigue_threshold *= config.adhd_break_multiplier
        if state.fatigue > fatigue_threshold:
            return True

        # Condition 2: Sustained high frustration
        if self._last_frustration_high_time is not None:
            frustration_duration = (
                datetime.utcnow() - self._last_frustration_high_time
            ).total_seconds() / 60.0
            if frustration_duration >= config.frustration_sustained_minutes:
                return True

        # Condition 3: Exceeded attention span
        if state.session_duration_minutes > profile.effective_attention_span:
            return True

        # Condition 4: IEP/504 break requirements
        if profile.break_frequency_minutes is not None:
            time_since_break = state.minutes_since_break
            if time_since_break is not None and time_since_break >= profile.break_frequency_minutes:
                return True

        # Condition 5: Max session duration exceeded
        if profile.max_session_duration_minutes is not None:
            if state.session_duration_minutes >= profile.max_session_duration_minutes:
                return True

        return False

    def record_break(self, state: CognitiveState) -> CognitiveState:
        """
        Record that a break was taken and reset relevant counters.

        Args:
            state: Current cognitive state.

        Returns:
            Updated state with break recorded.
        """
        state.last_break = datetime.utcnow()
        state.needs_break = False
        # Reduce fatigue after break
        state.fatigue = max(0.0, state.fatigue - 0.4)
        # Reset frustration tracking
        self._last_frustration_high_time = None
        return state

    def get_average_processing_time_ms(self) -> float:
        """Get average processing time for state updates."""
        if not self._processing_times:
            return 0.0
        return sum(self._processing_times) / len(self._processing_times)

    def reset(self) -> None:
        """Reset detector state for a new session."""
        self.signal_buffer.clear()
        self._consecutive_errors = 0
        self._consecutive_successes = 0
        self._last_frustration_high_time = None
        self._processing_times.clear()


def create_detector(config: Optional[Dict] = None) -> CognitiveStateDetector:
    """
    Factory function to create a configured detector.

    Args:
        config: Optional configuration dictionary.

    Returns:
        Configured CognitiveStateDetector instance.
    """
    if config:
        detector_config = DetectorConfig.from_dict(config)
    else:
        detector_config = DetectorConfig()
    return CognitiveStateDetector(detector_config)
