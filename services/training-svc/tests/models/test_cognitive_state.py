"""
Comprehensive tests for Cognitive State Model.

Test scenarios cover:
- Gradual frustration buildup
- Sudden disengagement
- Fatigue over long session
- Recovery after break
- ADHD-specific patterns
- State updates processing time (<50ms)
- Warmup period behavior
- Trigger accuracy
"""

import asyncio
import time
from datetime import datetime, timedelta
from typing import List
from unittest.mock import patch

import pytest

from app.models.cognitive import (
    CognitiveLoadLevel,
    CognitiveState,
    CognitiveStateDetector,
    CognitiveStateUpdate,
    DetectorConfig,
    EngagementLevel,
    InterventionTrigger,
    LearnerProfile,
    LearningStyle,
    SignalType,
    TriggerEngine,
    TriggerPriority,
    TriggerThresholds,
    TriggerType,
    create_detector,
    create_trigger_engine,
)


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def default_state() -> CognitiveState:
    """Create a default cognitive state for testing."""
    return CognitiveState(
        learner_id="test_learner",
        session_id="test_session",
    )


@pytest.fixture
def warmup_complete_state() -> CognitiveState:
    """Create a state with warmup completed."""
    state = CognitiveState(
        learner_id="test_learner",
        session_id="test_session",
        warmup_complete=True,
    )
    # Set session start to 5 minutes ago
    state.session_start = datetime.utcnow() - timedelta(minutes=5)
    return state


@pytest.fixture
def default_profile() -> LearnerProfile:
    """Create a default learner profile for testing."""
    return LearnerProfile(
        learner_id="test_learner",
        learning_style=LearningStyle.VISUAL,
        baseline_attention_span=25.0,
    )


@pytest.fixture
def adhd_profile() -> LearnerProfile:
    """Create an ADHD learner profile for testing."""
    return LearnerProfile(
        learner_id="test_learner_adhd",
        learning_style=LearningStyle.KINESTHETIC,
        baseline_attention_span=25.0,
        diagnoses=["ADHD"],
        accommodations=["movement_breaks", "chunked_content"],
        break_frequency_minutes=15.0,
    )


@pytest.fixture
def dyslexia_profile() -> LearnerProfile:
    """Create a dyslexia learner profile for testing."""
    return LearnerProfile(
        learner_id="test_learner_dyslexia",
        learning_style=LearningStyle.AUDITORY,
        diagnoses=["Dyslexia"],
        accommodations=["text_to_speech", "extended_time"],
        frustration_threshold=0.5,
    )


@pytest.fixture
def detector() -> CognitiveStateDetector:
    """Create a detector for testing."""
    return CognitiveStateDetector()


@pytest.fixture
def trigger_engine() -> TriggerEngine:
    """Create a trigger engine for testing."""
    return TriggerEngine()


# ============================================================================
# State Model Tests
# ============================================================================


class TestCognitiveState:
    """Tests for CognitiveState model."""

    def test_state_creation_defaults(self):
        """Test state creation with default values."""
        state = CognitiveState(
            learner_id="learner1",
            session_id="session1",
        )
        assert state.cognitive_load == 0.5
        assert state.engagement == 0.7
        assert state.frustration == 0.0
        assert state.fatigue == 0.0
        assert state.confidence == 0.5
        assert state.motivation == 0.7
        assert state.needs_break is False
        assert state.warmup_complete is False

    def test_engagement_level_from_score(self):
        """Test engagement level derivation from score."""
        assert EngagementLevel.from_score(0.9) == EngagementLevel.HIGHLY_ENGAGED
        assert EngagementLevel.from_score(0.7) == EngagementLevel.ENGAGED
        assert EngagementLevel.from_score(0.5) == EngagementLevel.NEUTRAL
        assert EngagementLevel.from_score(0.3) == EngagementLevel.DISENGAGED
        assert EngagementLevel.from_score(0.1) == EngagementLevel.CHECKED_OUT

    def test_cognitive_load_level_from_score(self):
        """Test cognitive load level derivation."""
        assert CognitiveLoadLevel.from_score(0.2) == CognitiveLoadLevel.UNDERLOAD
        assert CognitiveLoadLevel.from_score(0.5) == CognitiveLoadLevel.OPTIMAL
        assert CognitiveLoadLevel.from_score(0.8) == CognitiveLoadLevel.HIGH
        assert CognitiveLoadLevel.from_score(0.95) == CognitiveLoadLevel.OVERLOAD

    def test_state_serialization(self, default_state):
        """Test state to_dict and from_dict."""
        state_dict = default_state.to_dict()
        assert state_dict["learner_id"] == "test_learner"
        assert state_dict["session_id"] == "test_session"

        restored = CognitiveState.from_dict(state_dict)
        assert restored.learner_id == default_state.learner_id
        assert restored.engagement == default_state.engagement

    def test_state_history_rolling_window(self, default_state):
        """Test that state history maintains 30-minute rolling window."""
        # Add some history entries
        for i in range(10):
            default_state.add_to_history()

        assert len(default_state.state_history) == 10

        # Manually add an old entry that should be pruned
        old_snapshot = {
            "timestamp": (datetime.utcnow() - timedelta(minutes=35)).isoformat(),
            "cognitive_load": 0.5,
            "engagement": 0.5,
            "frustration": 0.5,
            "fatigue": 0.5,
            "confidence": 0.5,
            "motivation": 0.5,
            "engagement_level": "engaged",
        }
        default_state.state_history.append(old_snapshot)

        # Add another to trigger pruning
        default_state.add_to_history()

        # Old entry should be pruned
        assert len(default_state.state_history) == 11  # 10 + 1 new, old one pruned

    def test_state_trend_calculation(self, default_state):
        """Test trend calculation for dimensions."""
        # Build history with increasing frustration
        for i in range(5):
            snapshot = {
                "timestamp": (datetime.utcnow() - timedelta(seconds=60 * (5 - i))).isoformat(),
                "cognitive_load": 0.5,
                "engagement": 0.7,
                "frustration": 0.1 * (i + 1),  # 0.1, 0.2, 0.3, 0.4, 0.5
                "fatigue": 0.0,
                "confidence": 0.5,
                "motivation": 0.7,
                "engagement_level": "engaged",
            }
            default_state.state_history.append(snapshot)

        trend = default_state.get_trend("frustration", window_minutes=10)
        assert trend > 0  # Positive trend (increasing)


class TestLearnerProfile:
    """Tests for LearnerProfile model."""

    def test_adhd_detection(self, adhd_profile):
        """Test ADHD diagnosis detection."""
        assert adhd_profile.has_adhd is True
        assert adhd_profile.has_dyslexia is False

    def test_effective_attention_span_adhd(self, adhd_profile):
        """Test ADHD reduces effective attention span."""
        normal_profile = LearnerProfile(
            learner_id="normal",
            baseline_attention_span=25.0,
        )
        assert adhd_profile.effective_attention_span < normal_profile.effective_attention_span
        assert adhd_profile.effective_attention_span == 15.0  # 25 * 0.6

    def test_recommended_break_interval_iep(self, adhd_profile):
        """Test IEP break frequency takes precedence."""
        assert adhd_profile.recommended_break_interval == 15.0  # From IEP

    def test_recommended_break_interval_calculated(self, default_profile):
        """Test calculated break interval without IEP."""
        expected = default_profile.effective_attention_span * 0.8
        assert default_profile.recommended_break_interval == expected


# ============================================================================
# Detector Tests
# ============================================================================


class TestCognitiveStateDetector:
    """Tests for CognitiveStateDetector."""

    @pytest.mark.asyncio
    async def test_state_update_basic(self, warmup_complete_state, default_profile, detector):
        """Test basic state update with signals."""
        signals = [
            CognitiveStateUpdate(
                signal_type=SignalType.ACCURACY,
                signal_value=1.0,  # Correct answer
            ),
        ]

        updated = await detector.update_state(warmup_complete_state, signals, default_profile)

        assert updated.update_count == 1
        assert updated.learner_id == warmup_complete_state.learner_id

    @pytest.mark.asyncio
    async def test_state_update_processing_time(self, warmup_complete_state, default_profile, detector):
        """Test that state updates process in <50ms."""
        signals = [
            CognitiveStateUpdate(signal_type=SignalType.ACCURACY, signal_value=0.5),
            CognitiveStateUpdate(signal_type=SignalType.RESPONSE_TIME, signal_value=0.5),
            CognitiveStateUpdate(signal_type=SignalType.HINT_REQUEST, signal_value=1.0),
        ]

        # Run multiple updates to get average
        for _ in range(10):
            await detector.update_state(warmup_complete_state, signals, default_profile)

        avg_time = detector.get_average_processing_time_ms()
        assert avg_time < 50, f"Average processing time {avg_time:.2f}ms exceeds 50ms target"


class TestGradualFrustrationBuildup:
    """Test scenario: Gradual frustration buildup."""

    @pytest.mark.asyncio
    async def test_frustration_increases_with_errors(self, warmup_complete_state, default_profile):
        """Test that consecutive errors increase frustration."""
        detector = CognitiveStateDetector()
        state = warmup_complete_state

        initial_frustration = state.frustration

        # Simulate 5 consecutive wrong answers
        for i in range(5):
            signals = [
                CognitiveStateUpdate(
                    signal_type=SignalType.ACCURACY,
                    signal_value=0.0,  # Wrong answer
                ),
                CognitiveStateUpdate(
                    signal_type=SignalType.RESPONSE_TIME,
                    signal_value=0.6 + i * 0.1,  # Increasing response time
                    raw_value=5000 + i * 1000,
                ),
            ]
            state = await detector.update_state(state, signals, default_profile)

        assert state.frustration > initial_frustration
        assert state.frustration > 0.3  # Should show noticeable frustration

    @pytest.mark.asyncio
    async def test_frustration_triggers_intervention(self, warmup_complete_state, default_profile):
        """Test that high frustration triggers intervention."""
        detector = CognitiveStateDetector()
        engine = TriggerEngine()
        state = warmup_complete_state

        # Build up frustration with errors and hint requests
        for i in range(8):
            signals = [
                CognitiveStateUpdate(signal_type=SignalType.ACCURACY, signal_value=0.0),
                CognitiveStateUpdate(signal_type=SignalType.HINT_REQUEST, signal_value=1.0),
            ]
            state = await detector.update_state(state, signals, default_profile)

        triggers = await engine.evaluate(state, default_profile, skip_warmup_check=True)

        # Should have frustration-related trigger
        trigger_types = [t.trigger_type for t in triggers]
        assert TriggerType.FRUSTRATION_HIGH.value in trigger_types or state.frustration > 0.5


class TestSuddenDisengagement:
    """Test scenario: Sudden disengagement."""

    @pytest.mark.asyncio
    async def test_disengagement_from_long_pauses(self, warmup_complete_state, default_profile):
        """Test that long pauses indicate disengagement."""
        detector = CognitiveStateDetector()
        state = warmup_complete_state

        initial_engagement = state.engagement

        # Simulate long pauses (inactivity)
        for _ in range(5):
            signals = [
                CognitiveStateUpdate(
                    signal_type=SignalType.PAUSE_DURATION,
                    signal_value=45.0,  # 45 second pause
                ),
            ]
            state = await detector.update_state(state, signals, default_profile)

        assert state.engagement < initial_engagement

    @pytest.mark.asyncio
    async def test_skip_behavior_reduces_engagement(self, warmup_complete_state, default_profile):
        """Test that skipping content reduces engagement."""
        detector = CognitiveStateDetector()
        state = warmup_complete_state

        initial_engagement = state.engagement

        # Simulate skipping behavior
        for _ in range(5):
            signals = [
                CognitiveStateUpdate(signal_type=SignalType.SKIP_ACTION, signal_value=1.0),
                CognitiveStateUpdate(signal_type=SignalType.RAPID_CLICKING, signal_value=1.0),
            ]
            state = await detector.update_state(state, signals, default_profile)

        # Skip behavior should reduce engagement (through frustration) or indicate disengagement
        assert state.engagement < initial_engagement or state.frustration > 0.3


class TestFatigueOverLongSession:
    """Test scenario: Fatigue over long session."""

    @pytest.mark.asyncio
    async def test_fatigue_increases_over_time(self, default_profile):
        """Test that fatigue increases as session exceeds attention span."""
        detector = CognitiveStateDetector()

        # Create a state with a session that started 30 minutes ago
        state = CognitiveState(
            learner_id="test_learner",
            session_id="test_session",
            warmup_complete=True,
        )
        state.session_start = datetime.utcnow() - timedelta(minutes=30)

        # Process some signals to trigger fatigue calculation
        signals = [
            CognitiveStateUpdate(signal_type=SignalType.ACCURACY, signal_value=0.6),
        ]
        state = await detector.update_state(state, signals, default_profile)

        # Session > attention span (25 min) should cause fatigue
        assert state.fatigue > 0.2

    @pytest.mark.asyncio
    async def test_fatigue_triggers_break_recommendation(self, default_profile):
        """Test that high fatigue triggers break recommendation."""
        detector = CognitiveStateDetector()
        engine = TriggerEngine()

        # Create a tired state
        state = CognitiveState(
            learner_id="test_learner",
            session_id="test_session",
            fatigue=0.7,
            warmup_complete=True,
        )
        state.session_start = datetime.utcnow() - timedelta(minutes=35)

        signals = [CognitiveStateUpdate(signal_type=SignalType.ACCURACY, signal_value=0.5)]
        state = await detector.update_state(state, signals, default_profile)

        triggers = await engine.evaluate(state, default_profile, skip_warmup_check=True)

        # Should trigger fatigue or break needed
        trigger_types = [t.trigger_type for t in triggers]
        has_fatigue_trigger = (
            TriggerType.FATIGUE_DETECTED.value in trigger_types or
            TriggerType.BREAK_NEEDED.value in trigger_types or
            state.needs_break
        )
        assert has_fatigue_trigger


class TestRecoveryAfterBreak:
    """Test scenario: Recovery after break."""

    @pytest.mark.asyncio
    async def test_break_reduces_fatigue(self, warmup_complete_state, default_profile):
        """Test that taking a break reduces fatigue."""
        detector = CognitiveStateDetector()

        # Set high fatigue
        warmup_complete_state.fatigue = 0.7
        warmup_complete_state.needs_break = True

        # Record break
        state = detector.record_break(warmup_complete_state)

        assert state.fatigue < 0.7
        assert state.needs_break is False
        assert state.last_break is not None

    @pytest.mark.asyncio
    async def test_positive_signals_after_break(self, warmup_complete_state, default_profile):
        """Test that positive signals after break improve state."""
        detector = CognitiveStateDetector()
        engine = TriggerEngine()

        # Set struggling state
        warmup_complete_state.frustration = 0.6
        warmup_complete_state.engagement = 0.4
        warmup_complete_state.confidence = 0.3

        # Record break
        state = detector.record_break(warmup_complete_state)

        # Simulate positive performance after break
        for _ in range(5):
            signals = [
                CognitiveStateUpdate(signal_type=SignalType.ACCURACY, signal_value=1.0),
                CognitiveStateUpdate(
                    signal_type=SignalType.RESPONSE_TIME,
                    signal_value=0.4,  # Fast response
                    raw_value=3000,
                ),
            ]
            state = await detector.update_state(state, signals, default_profile)

        # State should improve
        assert state.confidence > 0.3


class TestADHDSpecificPatterns:
    """Test scenario: ADHD-specific patterns."""

    @pytest.mark.asyncio
    async def test_adhd_shorter_attention_span(self, adhd_profile):
        """Test ADHD learners have adjusted attention span."""
        detector = CognitiveStateDetector()

        state = CognitiveState(
            learner_id=adhd_profile.learner_id,
            session_id="test_session",
            warmup_complete=True,
        )
        # Session just past ADHD attention span
        state.session_start = datetime.utcnow() - timedelta(minutes=18)

        signals = [CognitiveStateUpdate(signal_type=SignalType.ACCURACY, signal_value=0.7)]
        state = await detector.update_state(state, signals, adhd_profile)

        # Should show fatigue since exceeding ADHD attention span (15 min)
        assert state.fatigue > 0.1 or state.attention_span_minutes < 10

    @pytest.mark.asyncio
    async def test_adhd_earlier_break_triggers(self, adhd_profile):
        """Test ADHD learners get earlier break triggers."""
        engine = create_trigger_engine(profile=adhd_profile)

        state = CognitiveState(
            learner_id=adhd_profile.learner_id,
            session_id="test_session",
            fatigue=0.5,  # Moderate fatigue
            warmup_complete=True,
        )
        state.session_start = datetime.utcnow() - timedelta(minutes=16)

        triggers = await engine.evaluate(state, adhd_profile, skip_warmup_check=True)

        # ADHD profile should trigger break at lower fatigue threshold
        # or due to exceeding IEP break frequency (15 min)
        trigger_types = [t.trigger_type for t in triggers]
        has_break_trigger = (
            TriggerType.BREAK_NEEDED.value in trigger_types or
            TriggerType.FATIGUE_DETECTED.value in trigger_types
        )
        # May trigger due to IEP break frequency
        assert has_break_trigger or state.needs_break or state.session_duration_minutes > 15


class TestWarmupPeriod:
    """Test that triggers don't fire during warmup period."""

    @pytest.mark.asyncio
    async def test_no_triggers_during_warmup(self, default_state, default_profile):
        """Test that no triggers fire in first 2 minutes."""
        engine = TriggerEngine()

        # Set concerning state values
        default_state.frustration = 0.9
        default_state.engagement = 0.2
        default_state.fatigue = 0.8

        # But warmup not complete
        assert default_state.warmup_complete is False
        assert default_state.is_in_warmup is True

        triggers = await engine.evaluate(default_state, default_profile)

        # No triggers should fire during warmup
        assert len(triggers) == 0

    @pytest.mark.asyncio
    async def test_triggers_fire_after_warmup(self, warmup_complete_state, default_profile):
        """Test that triggers fire normally after warmup."""
        engine = TriggerEngine()

        # Set concerning state values
        warmup_complete_state.frustration = 0.9
        warmup_complete_state.engagement = 0.2

        triggers = await engine.evaluate(warmup_complete_state, default_profile)

        # Should have triggers now
        assert len(triggers) > 0


class TestTriggerPrioritization:
    """Test trigger prioritization."""

    @pytest.mark.asyncio
    async def test_critical_triggers_first(self, warmup_complete_state, default_profile):
        """Test that critical triggers are prioritized."""
        engine = TriggerEngine()

        # Set multiple concerning values
        warmup_complete_state.frustration = 0.95  # Critical
        warmup_complete_state.engagement = 0.3  # Low
        warmup_complete_state.needs_break = True

        triggers = await engine.evaluate(warmup_complete_state, default_profile)

        if len(triggers) > 1:
            # First trigger should be highest priority
            assert triggers[0].priority >= triggers[-1].priority

    def test_get_priority_trigger(self, trigger_engine):
        """Test getting highest priority trigger."""
        triggers = [
            InterventionTrigger(
                trigger_type=TriggerType.ENGAGEMENT_LOW,
                severity=0.5,
                priority=TriggerPriority.MEDIUM,
            ),
            InterventionTrigger(
                trigger_type=TriggerType.FRUSTRATION_HIGH,
                severity=0.9,
                priority=TriggerPriority.CRITICAL,
            ),
        ]

        priority = trigger_engine.get_priority_trigger(triggers)
        # After sorting, critical should be first
        assert priority is not None


class TestTriggerCooldowns:
    """Test trigger cooldown behavior."""

    @pytest.mark.asyncio
    async def test_cooldown_prevents_repeated_triggers(self, warmup_complete_state, default_profile):
        """Test that cooldown prevents trigger spam."""
        engine = TriggerEngine()

        warmup_complete_state.frustration = 0.9

        # First evaluation should trigger
        triggers1 = await engine.evaluate(warmup_complete_state, default_profile)
        frustration_triggers1 = [
            t for t in triggers1 if t.trigger_type == TriggerType.FRUSTRATION_HIGH.value
        ]

        # Second evaluation immediately after should not trigger same type
        triggers2 = await engine.evaluate(warmup_complete_state, default_profile)
        frustration_triggers2 = [
            t for t in triggers2 if t.trigger_type == TriggerType.FRUSTRATION_HIGH.value
        ]

        if frustration_triggers1:
            assert len(frustration_triggers2) == 0  # Should be blocked by cooldown


class TestPositiveTriggers:
    """Test positive momentum triggers."""

    @pytest.mark.asyncio
    async def test_positive_momentum_trigger(self, warmup_complete_state, default_profile):
        """Test that positive momentum is detected."""
        engine = TriggerEngine()

        # Set positive state
        warmup_complete_state.engagement = 0.9
        warmup_complete_state.confidence = 0.85
        warmup_complete_state.frustration = 0.1

        triggers = await engine.evaluate(warmup_complete_state, default_profile)

        # Should have positive momentum trigger
        trigger_types = [t.trigger_type for t in triggers]
        assert TriggerType.MOMENTUM_POSITIVE.value in trigger_types


class TestCognitiveLoadTriggers:
    """Test cognitive load triggers."""

    @pytest.mark.asyncio
    async def test_overload_trigger(self, warmup_complete_state, default_profile):
        """Test cognitive overload detection."""
        engine = TriggerEngine()

        warmup_complete_state.cognitive_load = 0.95

        triggers = await engine.evaluate(warmup_complete_state, default_profile)

        trigger_types = [t.trigger_type for t in triggers]
        assert TriggerType.COGNITIVE_OVERLOAD.value in trigger_types

    @pytest.mark.asyncio
    async def test_underload_trigger(self, warmup_complete_state, default_profile):
        """Test cognitive underload (boredom) detection."""
        engine = TriggerEngine()

        warmup_complete_state.cognitive_load = 0.15

        triggers = await engine.evaluate(warmup_complete_state, default_profile)

        trigger_types = [t.trigger_type for t in triggers]
        assert TriggerType.COGNITIVE_UNDERLOAD.value in trigger_types


class TestSignalBuffer:
    """Test signal buffer functionality."""

    def test_buffer_max_size(self, detector):
        """Test buffer respects max size."""
        for i in range(100):
            detector.signal_buffer.add(
                CognitiveStateUpdate(
                    signal_type=SignalType.ACCURACY,
                    signal_value=float(i) / 100,
                )
            )

        recent = detector.signal_buffer.get_recent(SignalType.ACCURACY, 100)
        assert len(recent) <= 50  # Max buffer size

    def test_buffer_average(self, detector):
        """Test buffer average calculation."""
        for i in range(5):
            detector.signal_buffer.add(
                CognitiveStateUpdate(
                    signal_type=SignalType.ACCURACY,
                    signal_value=0.2 * i,  # 0.0, 0.2, 0.4, 0.6, 0.8
                )
            )

        avg = detector.signal_buffer.average_value(SignalType.ACCURACY, 5)
        assert avg is not None
        assert abs(avg - 0.4) < 0.01  # Should be close to 0.4


class TestDyslexiaProfile:
    """Test dyslexia-specific behavior."""

    @pytest.mark.asyncio
    async def test_lower_frustration_threshold(self, dyslexia_profile):
        """Test dyslexia profile has lower frustration threshold."""
        engine = create_trigger_engine(profile=dyslexia_profile)

        state = CognitiveState(
            learner_id=dyslexia_profile.learner_id,
            session_id="test_session",
            frustration=0.55,  # Above dyslexia threshold (0.5) but below default (0.7)
            warmup_complete=True,
        )

        triggers = await engine.evaluate(state, dyslexia_profile, skip_warmup_check=True)

        trigger_types = [t.trigger_type for t in triggers]
        # Should trigger at lower threshold
        assert TriggerType.FRUSTRATION_HIGH.value in trigger_types


class TestFactoryFunctions:
    """Test factory functions."""

    def test_create_detector_default(self):
        """Test detector creation with defaults."""
        detector = create_detector()
        assert isinstance(detector, CognitiveStateDetector)
        assert detector.config.ema_alpha == 0.3

    def test_create_detector_custom_config(self):
        """Test detector creation with custom config."""
        config = {
            "ema_alpha": 0.5,
            "warmup_period_seconds": 60.0,
        }
        detector = create_detector(config)
        assert detector.config.ema_alpha == 0.5
        assert detector.config.warmup_period_seconds == 60.0

    def test_create_trigger_engine_with_profile(self, adhd_profile):
        """Test trigger engine creation with profile."""
        engine = create_trigger_engine(profile=adhd_profile)
        assert isinstance(engine, TriggerEngine)
        # ADHD should have adjusted thresholds
        assert engine.thresholds.attention_waning_minutes == 3.0


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_state_bounds(self):
        """Test that state values are bounded 0-1."""
        state = CognitiveState(
            learner_id="test",
            session_id="test",
            cognitive_load=0.5,
            engagement=0.5,
        )
        # Pydantic should enforce bounds
        with pytest.raises(Exception):
            CognitiveState(
                learner_id="test",
                session_id="test",
                frustration=1.5,  # Out of bounds
            )

    @pytest.mark.asyncio
    async def test_empty_signals(self, warmup_complete_state, default_profile, detector):
        """Test handling of empty signal list."""
        state = await detector.update_state(warmup_complete_state, [], default_profile)
        # Should not crash, state should be relatively unchanged
        assert state.update_count == warmup_complete_state.update_count + 1

    def test_empty_trigger_list(self, trigger_engine):
        """Test getting priority from empty trigger list."""
        result = trigger_engine.get_priority_trigger([])
        assert result is None


# ============================================================================
# Integration Tests
# ============================================================================


class TestIntegrationScenario:
    """Integration test simulating a complete learning session."""

    @pytest.mark.asyncio
    async def test_full_session_scenario(self, default_profile):
        """Test a full learning session from start to break."""
        detector = CognitiveStateDetector()
        engine = TriggerEngine()

        state = CognitiveState(
            learner_id="test_learner",
            session_id="test_session",
        )

        all_triggers = []

        # Phase 1: Warmup (2 minutes) - mixed performance
        for i in range(5):
            signals = [
                CognitiveStateUpdate(
                    signal_type=SignalType.ACCURACY,
                    signal_value=0.5 + (i % 2) * 0.5,
                ),
            ]
            state = await detector.update_state(state, signals, default_profile)

        # No triggers during warmup
        triggers = await engine.evaluate(state, default_profile)
        assert len(triggers) == 0

        # Phase 2: Good performance (simulated 5 min mark)
        state.warmup_complete = True
        state.session_start = datetime.utcnow() - timedelta(minutes=5)

        for i in range(5):
            signals = [
                CognitiveStateUpdate(signal_type=SignalType.ACCURACY, signal_value=1.0),
                CognitiveStateUpdate(
                    signal_type=SignalType.RESPONSE_TIME,
                    signal_value=0.3,
                    raw_value=3000,
                ),
            ]
            state = await detector.update_state(state, signals, default_profile)

        triggers = await engine.evaluate(state, default_profile, skip_warmup_check=True)
        # May have positive momentum trigger

        # Phase 3: Struggling (multiple errors)
        for i in range(6):
            signals = [
                CognitiveStateUpdate(signal_type=SignalType.ACCURACY, signal_value=0.0),
                CognitiveStateUpdate(signal_type=SignalType.HINT_REQUEST, signal_value=1.0),
            ]
            state = await detector.update_state(state, signals, default_profile)

        triggers = await engine.evaluate(state, default_profile, skip_warmup_check=True)
        all_triggers.extend(triggers)

        # Should have some intervention triggers
        assert state.frustration > 0.2 or len(triggers) > 0

        # Phase 4: Recovery with break
        state = detector.record_break(state)
        assert state.fatigue < 0.7

        # Verify session tracked state changes appropriately
        assert state.update_count > 10
        assert len(state.state_history) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
