"""
Tests for ReAct Reasoning Engine Pydantic models.

Validates model constraints, serialization, and edge cases.
"""

from datetime import datetime

import pytest
from pydantic import ValidationError

from app.core.reasoning import (
    Interaction,
    InterventionDecision,
    InterventionOutcome,
    InterventionType,
    LearnerContext,
    LearnerProfile,
    PerformanceMetrics,
    ReasoningConfig,
    ReasoningStep,
    ReasoningTrace,
    SessionReflection,
    UrgencyLevel,
)


class TestInterventionType:
    """Tests for InterventionType enum."""

    def test_all_intervention_types_exist(self) -> None:
        """Test that all expected intervention types are defined."""
        expected_types = [
            "hint", "scaffold", "simplify", "encourage",
            "break", "review", "advance", "none"
        ]
        actual_types = [t.value for t in InterventionType]
        assert set(expected_types) == set(actual_types)

    def test_intervention_type_from_string(self) -> None:
        """Test creating intervention type from string value."""
        assert InterventionType("hint") == InterventionType.HINT
        assert InterventionType("scaffold") == InterventionType.SCAFFOLD


class TestUrgencyLevel:
    """Tests for UrgencyLevel enum."""

    def test_all_urgency_levels_exist(self) -> None:
        """Test that all expected urgency levels are defined."""
        expected_levels = ["low", "medium", "high", "critical"]
        actual_levels = [u.value for u in UrgencyLevel]
        assert set(expected_levels) == set(actual_levels)

    def test_urgency_level_ordering(self) -> None:
        """Test that urgency levels can be compared."""
        levels = [UrgencyLevel.LOW, UrgencyLevel.MEDIUM, UrgencyLevel.HIGH, UrgencyLevel.CRITICAL]
        assert len(levels) == 4


class TestReasoningStep:
    """Tests for ReasoningStep model."""

    def test_valid_reasoning_step(self) -> None:
        """Test creating a valid reasoning step."""
        step = ReasoningStep(
            thought="The learner is showing signs of struggle.",
            action="Analyzing recent response patterns.",
            observation="High hint usage detected.",
            confidence=0.8,
        )
        assert step.thought == "The learner is showing signs of struggle."
        assert step.confidence == 0.8
        assert step.timestamp is not None

    def test_reasoning_step_confidence_bounds(self) -> None:
        """Test that confidence must be between 0 and 1."""
        with pytest.raises(ValidationError):
            ReasoningStep(
                thought="Test",
                action="Test",
                observation="Test",
                confidence=1.5,  # Invalid: > 1.0
            )

        with pytest.raises(ValidationError):
            ReasoningStep(
                thought="Test",
                action="Test",
                observation="Test",
                confidence=-0.1,  # Invalid: < 0.0
            )

    def test_reasoning_step_empty_strings(self) -> None:
        """Test that empty strings are not allowed."""
        with pytest.raises(ValidationError):
            ReasoningStep(
                thought="",  # Invalid: empty
                action="Test",
                observation="Test",
                confidence=0.5,
            )

    def test_reasoning_step_serialization(self) -> None:
        """Test that reasoning step serializes correctly."""
        step = ReasoningStep(
            thought="Test thought",
            action="Test action",
            observation="Test observation",
            confidence=0.75,
        )
        data = step.model_dump()
        assert "thought" in data
        assert "confidence" in data
        assert data["confidence"] == 0.75

    def test_reasoning_step_json_serialization(self) -> None:
        """Test JSON serialization with datetime."""
        step = ReasoningStep(
            thought="Test",
            action="Test",
            observation="Test",
            confidence=0.5,
        )
        json_str = step.model_dump_json()
        assert "timestamp" in json_str


class TestReasoningTrace:
    """Tests for ReasoningTrace model."""

    def test_valid_reasoning_trace(self, sample_reasoning_step: ReasoningStep) -> None:
        """Test creating a valid reasoning trace."""
        trace = ReasoningTrace(
            steps=[sample_reasoning_step],
            final_decision="Provide hint",
            total_confidence=0.8,
            reasoning_duration_ms=1000,
        )
        assert trace.num_steps == 1
        assert trace.total_confidence == 0.8

    def test_reasoning_trace_requires_steps(self) -> None:
        """Test that at least one step is required."""
        with pytest.raises(ValidationError):
            ReasoningTrace(
                steps=[],  # Invalid: empty list
                final_decision="Test",
                total_confidence=0.5,
                reasoning_duration_ms=100,
            )

    def test_reasoning_trace_average_confidence(
        self, sample_reasoning_step: ReasoningStep
    ) -> None:
        """Test average confidence calculation."""
        step2 = ReasoningStep(
            thought="Test 2",
            action="Action 2",
            observation="Observation 2",
            confidence=0.9,
        )
        trace = ReasoningTrace(
            steps=[sample_reasoning_step, step2],
            final_decision="Test",
            total_confidence=0.85,
            reasoning_duration_ms=500,
        )
        # Average of 0.75 and 0.9
        expected_avg = (0.75 + 0.9) / 2
        assert abs(trace.average_step_confidence - expected_avg) < 0.01

    def test_reasoning_trace_metadata(self, sample_reasoning_step: ReasoningStep) -> None:
        """Test that metadata is stored correctly."""
        trace = ReasoningTrace(
            steps=[sample_reasoning_step],
            final_decision="Test",
            total_confidence=0.5,
            reasoning_duration_ms=100,
            metadata={"learner_id": "test-123", "custom_field": 42},
        )
        assert trace.metadata["learner_id"] == "test-123"
        assert trace.metadata["custom_field"] == 42


class TestInterventionDecision:
    """Tests for InterventionDecision model."""

    def test_valid_intervention_decision(
        self, sample_reasoning_trace: ReasoningTrace
    ) -> None:
        """Test creating a valid intervention decision."""
        decision = InterventionDecision(
            intervention_type=InterventionType.HINT,
            parameters={"hint_level": 1},
            reasoning_trace=sample_reasoning_trace,
            urgency=UrgencyLevel.MEDIUM,
            learner_id="learner-001",
            session_id="session-001",
        )
        assert decision.intervention_type == InterventionType.HINT
        assert decision.urgency == UrgencyLevel.MEDIUM

    def test_intervention_decision_empty_learner_id(
        self, sample_reasoning_trace: ReasoningTrace
    ) -> None:
        """Test that empty learner_id is not allowed."""
        with pytest.raises(ValidationError):
            InterventionDecision(
                intervention_type=InterventionType.HINT,
                parameters={},
                reasoning_trace=sample_reasoning_trace,
                urgency=UrgencyLevel.LOW,
                learner_id="",  # Invalid: empty
                session_id="session-001",
            )

    def test_intervention_decision_serialization(
        self, sample_intervention_decision: InterventionDecision
    ) -> None:
        """Test serialization of intervention decision."""
        data = sample_intervention_decision.model_dump()
        assert data["intervention_type"] == "hint"
        assert data["urgency"] == "medium"
        assert "reasoning_trace" in data


class TestLearnerContext:
    """Tests for LearnerContext model."""

    def test_valid_learner_context(self) -> None:
        """Test creating a valid learner context."""
        context = LearnerContext(
            learner_id="learner-001",
            session_id="session-001",
            current_skill_id="math-fractions",
            grade_level=5,
        )
        assert context.learning_pace == 1.0  # Default
        assert context.preferred_modality == "visual"  # Default

    def test_learner_context_grade_level_bounds(self) -> None:
        """Test that grade level must be 0-12."""
        with pytest.raises(ValidationError):
            LearnerContext(
                learner_id="test",
                session_id="test",
                current_skill_id="test",
                grade_level=15,  # Invalid: > 12
            )

        # Valid edge case
        context = LearnerContext(
            learner_id="test",
            session_id="test",
            current_skill_id="test",
            grade_level=0,  # K
        )
        assert context.grade_level == 0

    def test_learner_context_modality_validation(self) -> None:
        """Test that modality must be from valid set."""
        with pytest.raises(ValidationError):
            LearnerContext(
                learner_id="test",
                session_id="test",
                current_skill_id="test",
                grade_level=5,
                preferred_modality="invalid_modality",
            )

        # Valid modality
        context = LearnerContext(
            learner_id="test",
            session_id="test",
            current_skill_id="test",
            grade_level=5,
            preferred_modality="kinesthetic",
        )
        assert context.preferred_modality == "kinesthetic"

    def test_learner_context_all_fields(
        self, sample_learner_context: LearnerContext
    ) -> None:
        """Test that all fields are properly set."""
        assert sample_learner_context.learner_id == "test-learner-001"
        assert sample_learner_context.grade_level == 4
        assert sample_learner_context.frustration_signals == 0


class TestInteraction:
    """Tests for Interaction model."""

    def test_valid_interaction(self) -> None:
        """Test creating a valid interaction."""
        interaction = Interaction(
            interaction_id="int-001",
            skill_id="math-add",
            correct=True,
            response_time_ms=5000,
        )
        assert interaction.hints_used == 0  # Default
        assert interaction.engagement_score == 1.0  # Default

    def test_interaction_difficulty_bounds(self) -> None:
        """Test that difficulty must be 0-1."""
        with pytest.raises(ValidationError):
            Interaction(
                interaction_id="test",
                skill_id="test",
                correct=True,
                response_time_ms=1000,
                difficulty=1.5,  # Invalid: > 1.0
            )

    def test_interaction_scaffolding_level_bounds(self) -> None:
        """Test that scaffolding level must be 0-3."""
        with pytest.raises(ValidationError):
            Interaction(
                interaction_id="test",
                skill_id="test",
                correct=True,
                response_time_ms=1000,
                scaffolding_level=5,  # Invalid: > 3
            )


class TestPerformanceMetrics:
    """Tests for PerformanceMetrics model."""

    def test_valid_performance_metrics(self) -> None:
        """Test creating valid performance metrics."""
        metrics = PerformanceMetrics(
            overall_accuracy=0.75,
            recent_accuracy=0.6,
            average_response_time_ms=5000,
        )
        assert metrics.engagement_trend == 0.0  # Default
        assert metrics.skill_mastery_levels == {}  # Default

    def test_performance_metrics_engagement_trend_bounds(self) -> None:
        """Test that engagement trend must be -1 to 1."""
        with pytest.raises(ValidationError):
            PerformanceMetrics(
                overall_accuracy=0.5,
                recent_accuracy=0.5,
                average_response_time_ms=5000,
                engagement_trend=2.0,  # Invalid: > 1.0
            )


class TestInterventionOutcome:
    """Tests for InterventionOutcome model."""

    def test_valid_intervention_outcome(self) -> None:
        """Test creating a valid intervention outcome."""
        outcome = InterventionOutcome(
            intervention_id="int-001",
            intervention_type=InterventionType.HINT,
            effectiveness_score=0.8,
            learner_response="positive",
            performance_delta=0.1,
            engagement_delta=0.05,
            applied_at=datetime.utcnow(),
        )
        assert outcome.effectiveness_score == 0.8

    def test_intervention_outcome_response_validation(self) -> None:
        """Test that learner response must be from valid set."""
        with pytest.raises(ValidationError):
            InterventionOutcome(
                intervention_id="test",
                intervention_type=InterventionType.HINT,
                effectiveness_score=0.5,
                learner_response="invalid_response",  # Invalid
                performance_delta=0.0,
                engagement_delta=0.0,
                applied_at=datetime.utcnow(),
            )


class TestSessionReflection:
    """Tests for SessionReflection model."""

    def test_valid_session_reflection(self) -> None:
        """Test creating a valid session reflection."""
        reflection = SessionReflection(
            session_id="session-001",
            learner_id="learner-001",
            total_interventions=5,
            effective_interventions=4,
            overall_effectiveness=0.8,
        )
        assert reflection.key_insights == []  # Default
        assert reflection.recommendations == []  # Default

    def test_session_reflection_with_insights(self) -> None:
        """Test session reflection with insights and recommendations."""
        reflection = SessionReflection(
            session_id="session-001",
            learner_id="learner-001",
            total_interventions=3,
            effective_interventions=2,
            overall_effectiveness=0.67,
            key_insights=["Learner responds well to hints", "Needs frequent breaks"],
            recommendations=["Increase encouragement frequency"],
            intervention_patterns={"hint": 0.8, "scaffold": 0.6},
        )
        assert len(reflection.key_insights) == 2
        assert "hint" in reflection.intervention_patterns


class TestLearnerProfile:
    """Tests for LearnerProfile model."""

    def test_valid_learner_profile(self) -> None:
        """Test creating a valid learner profile."""
        profile = LearnerProfile(
            learner_id="learner-001",
            grade_level=4,
        )
        assert profile.learning_pace == 1.0  # Default
        assert profile.strengths == []  # Default

    def test_learner_profile_with_all_fields(
        self, sample_learner_profile: LearnerProfile
    ) -> None:
        """Test learner profile with all fields populated."""
        assert sample_learner_profile.learner_id == "test-learner-001"
        assert len(sample_learner_profile.strengths) == 2
        assert len(sample_learner_profile.challenges) == 1


class TestReasoningConfig:
    """Tests for ReasoningConfig model."""

    def test_valid_reasoning_config(self) -> None:
        """Test creating a valid reasoning config."""
        config = ReasoningConfig()
        assert config.max_reasoning_steps == 5  # Default
        assert config.min_confidence_threshold == 0.6  # Default

    def test_reasoning_config_custom_values(self) -> None:
        """Test reasoning config with custom values."""
        config = ReasoningConfig(
            max_reasoning_steps=10,
            min_confidence_threshold=0.8,
            reasoning_timeout_ms=10000,
            llm_temperature=0.5,
        )
        assert config.max_reasoning_steps == 10
        assert config.llm_temperature == 0.5

    def test_reasoning_config_bounds(self) -> None:
        """Test reasoning config value bounds."""
        with pytest.raises(ValidationError):
            ReasoningConfig(max_reasoning_steps=0)  # Invalid: < 1

        with pytest.raises(ValidationError):
            ReasoningConfig(llm_temperature=3.0)  # Invalid: > 2.0

    def test_reasoning_config_urgency_thresholds(self) -> None:
        """Test default urgency thresholds."""
        config = ReasoningConfig()
        assert "critical" in config.urgency_thresholds
        assert config.urgency_thresholds["critical"] == 0.9
