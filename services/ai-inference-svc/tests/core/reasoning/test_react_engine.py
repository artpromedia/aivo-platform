"""
Tests for ReActReasoningEngine logic.

Tests the reasoning engine's ability to:
- Perform multi-step reasoning about learner state
- Decide on appropriate interventions
- Reflect on session effectiveness
- Select teaching strategies
"""

from datetime import datetime, timedelta
from typing import List

import pytest

from app.core.reasoning import (
    ContentType,
    Interaction,
    InterventionDecision,
    InterventionOutcome,
    InterventionType,
    LearnerContext,
    LearnerProfile,
    MockLLMClient,
    PerformanceMetrics,
    ReActReasoningEngine,
    ReasoningConfig,
    ReasoningStep,
    ReasoningTrace,
    StrategyCategory,
    TeachingStrategy,
    UrgencyLevel,
)


class TestReActReasoningEngineInit:
    """Tests for ReActReasoningEngine initialization."""

    def test_init_with_defaults(self, mock_llm_client: MockLLMClient) -> None:
        """Test initialization with default config."""
        engine = ReActReasoningEngine(llm_client=mock_llm_client)
        assert engine.config.max_reasoning_steps == 5
        assert engine.config.min_confidence_threshold == 0.6

    def test_init_with_custom_config(
        self, mock_llm_client: MockLLMClient, reasoning_config: ReasoningConfig
    ) -> None:
        """Test initialization with custom config."""
        engine = ReActReasoningEngine(
            llm_client=mock_llm_client,
            config=reasoning_config,
        )
        assert engine.config == reasoning_config


class TestReasonAboutLearnerState:
    """Tests for reason_about_learner_state method."""

    @pytest.mark.asyncio
    async def test_reason_about_learner_state_basic(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_learner_context: LearnerContext,
        sample_interactions: List[Interaction],
        sample_performance_metrics: PerformanceMetrics,
    ) -> None:
        """Test basic reasoning about learner state."""
        trace = await reasoning_engine.reason_about_learner_state(
            learner_context=sample_learner_context,
            recent_interactions=sample_interactions,
            performance_metrics=sample_performance_metrics,
        )

        assert isinstance(trace, ReasoningTrace)
        assert len(trace.steps) >= 1
        assert trace.total_confidence >= 0.0
        assert trace.total_confidence <= 1.0
        assert trace.reasoning_duration_ms >= 0

    @pytest.mark.asyncio
    async def test_reason_about_learner_state_metadata(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_learner_context: LearnerContext,
        sample_interactions: List[Interaction],
        sample_performance_metrics: PerformanceMetrics,
    ) -> None:
        """Test that metadata is populated correctly."""
        trace = await reasoning_engine.reason_about_learner_state(
            learner_context=sample_learner_context,
            recent_interactions=sample_interactions,
            performance_metrics=sample_performance_metrics,
        )

        assert "learner_id" in trace.metadata
        assert trace.metadata["learner_id"] == sample_learner_context.learner_id
        assert "session_id" in trace.metadata

    @pytest.mark.asyncio
    async def test_reason_about_learner_state_with_no_interactions(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_learner_context: LearnerContext,
        sample_performance_metrics: PerformanceMetrics,
    ) -> None:
        """Test reasoning with no recent interactions."""
        trace = await reasoning_engine.reason_about_learner_state(
            learner_context=sample_learner_context,
            recent_interactions=[],
            performance_metrics=sample_performance_metrics,
        )

        assert isinstance(trace, ReasoningTrace)
        assert len(trace.steps) >= 1

    @pytest.mark.asyncio
    async def test_reason_about_struggling_learner(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_learner_context_struggling: LearnerContext,
        sample_interactions: List[Interaction],
        sample_performance_metrics: PerformanceMetrics,
    ) -> None:
        """Test reasoning about a struggling learner."""
        # Modify metrics to reflect struggle
        metrics = PerformanceMetrics(
            overall_accuracy=0.4,
            recent_accuracy=0.2,
            average_response_time_ms=15000,
            struggle_patterns=["concept_gaps", "hint_dependency"],
            engagement_trend=-0.3,
            hint_dependency_score=0.7,
        )

        trace = await reasoning_engine.reason_about_learner_state(
            learner_context=sample_learner_context_struggling,
            recent_interactions=sample_interactions,
            performance_metrics=metrics,
        )

        assert isinstance(trace, ReasoningTrace)
        # Should have multiple steps due to complex situation
        assert len(trace.steps) >= 2


class TestDecideIntervention:
    """Tests for decide_intervention method."""

    @pytest.mark.asyncio
    async def test_decide_intervention_basic(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_reasoning_trace: ReasoningTrace,
        available_interventions: List[InterventionType],
    ) -> None:
        """Test basic intervention decision."""
        decision = await reasoning_engine.decide_intervention(
            reasoning_trace=sample_reasoning_trace,
            available_interventions=available_interventions,
        )

        assert isinstance(decision, InterventionDecision)
        assert decision.intervention_type in available_interventions
        assert decision.urgency in UrgencyLevel
        assert isinstance(decision.parameters, dict)

    @pytest.mark.asyncio
    async def test_decide_intervention_records_history(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_reasoning_trace: ReasoningTrace,
        available_interventions: List[InterventionType],
    ) -> None:
        """Test that intervention decisions are recorded in history."""
        learner_id = sample_reasoning_trace.metadata.get("learner_id", "unknown")

        # Clear any existing history
        reasoning_engine.clear_intervention_history(learner_id)

        decision = await reasoning_engine.decide_intervention(
            reasoning_trace=sample_reasoning_trace,
            available_interventions=available_interventions,
        )

        history = reasoning_engine.get_intervention_history(learner_id)
        assert len(history) == 1
        assert history[0] == decision

    @pytest.mark.asyncio
    async def test_decide_intervention_with_limited_options(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_reasoning_trace: ReasoningTrace,
    ) -> None:
        """Test intervention decision with limited options."""
        limited_interventions = [InterventionType.HINT, InterventionType.NONE]

        decision = await reasoning_engine.decide_intervention(
            reasoning_trace=sample_reasoning_trace,
            available_interventions=limited_interventions,
        )

        assert decision.intervention_type in limited_interventions


class TestReflectOnSession:
    """Tests for reflect_on_session method."""

    @pytest.mark.asyncio
    async def test_reflect_on_session_basic(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_intervention_decision: InterventionDecision,
        sample_intervention_outcome: InterventionOutcome,
    ) -> None:
        """Test basic session reflection."""
        reflection = await reasoning_engine.reflect_on_session(
            session_id="test-session-001",
            interventions_used=[sample_intervention_decision],
            outcomes=[sample_intervention_outcome],
        )

        assert reflection.session_id == "test-session-001"
        assert reflection.total_interventions == 1
        assert reflection.overall_effectiveness > 0

    @pytest.mark.asyncio
    async def test_reflect_on_session_with_multiple_interventions(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_reasoning_trace: ReasoningTrace,
    ) -> None:
        """Test reflection with multiple interventions."""
        interventions = [
            InterventionDecision(
                intervention_type=InterventionType.HINT,
                parameters={},
                reasoning_trace=sample_reasoning_trace,
                urgency=UrgencyLevel.MEDIUM,
                learner_id="learner-001",
                session_id="session-001",
            ),
            InterventionDecision(
                intervention_type=InterventionType.ENCOURAGE,
                parameters={},
                reasoning_trace=sample_reasoning_trace,
                urgency=UrgencyLevel.LOW,
                learner_id="learner-001",
                session_id="session-001",
            ),
        ]

        outcomes = [
            InterventionOutcome(
                intervention_id="int-001",
                intervention_type=InterventionType.HINT,
                effectiveness_score=0.8,
                learner_response="positive",
                performance_delta=0.15,
                engagement_delta=0.1,
                applied_at=datetime.utcnow() - timedelta(minutes=10),
            ),
            InterventionOutcome(
                intervention_id="int-002",
                intervention_type=InterventionType.ENCOURAGE,
                effectiveness_score=0.6,
                learner_response="neutral",
                performance_delta=0.05,
                engagement_delta=0.2,
                applied_at=datetime.utcnow() - timedelta(minutes=5),
            ),
        ]

        reflection = await reasoning_engine.reflect_on_session(
            session_id="session-001",
            interventions_used=interventions,
            outcomes=outcomes,
        )

        assert reflection.total_interventions == 2
        assert reflection.effective_interventions >= 1  # At least hint was effective
        assert "hint" in reflection.intervention_patterns
        assert "encourage" in reflection.intervention_patterns

    @pytest.mark.asyncio
    async def test_reflect_on_session_disabled(
        self,
        mock_llm_client: MockLLMClient,
        sample_intervention_decision: InterventionDecision,
        sample_intervention_outcome: InterventionOutcome,
    ) -> None:
        """Test reflection when disabled in config."""
        config = ReasoningConfig(enable_reflection=False)
        engine = ReActReasoningEngine(llm_client=mock_llm_client, config=config)

        reflection = await engine.reflect_on_session(
            session_id="test-session",
            interventions_used=[sample_intervention_decision],
            outcomes=[sample_intervention_outcome],
        )

        assert "Reflection disabled" in reflection.key_insights


class TestSelectTeachingStrategy:
    """Tests for select_teaching_strategy method."""

    def test_select_teaching_strategy_basic(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_learner_profile: LearnerProfile,
    ) -> None:
        """Test basic strategy selection."""
        strategy = reasoning_engine.select_teaching_strategy(
            learner_profile=sample_learner_profile,
            content_type="skill_practice",
            difficulty_level=0.5,
        )

        assert isinstance(strategy, TeachingStrategy)
        assert strategy.name is not None

    def test_select_teaching_strategy_for_struggling_learner(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_learner_profile_iep: LearnerProfile,
    ) -> None:
        """Test strategy selection for IEP learner."""
        strategy = reasoning_engine.select_teaching_strategy(
            learner_profile=sample_learner_profile_iep,
            content_type="concept_introduction",
            difficulty_level=0.3,
        )

        assert isinstance(strategy, TeachingStrategy)
        # Should prefer accommodated or scaffolded strategy
        assert strategy.category in [
            StrategyCategory.DIFFERENTIATED,
            StrategyCategory.SCAFFOLDED_LEARNING,
        ]

    def test_select_teaching_strategy_for_fast_learner(
        self,
        reasoning_engine: ReActReasoningEngine,
    ) -> None:
        """Test strategy selection for fast learner."""
        fast_learner = LearnerProfile(
            learner_id="fast-learner",
            grade_level=6,
            learning_pace=1.5,
            cognitive_load_capacity=1.5,
            preferred_difficulty=0.7,
            persistence_level=0.8,
        )

        strategy = reasoning_engine.select_teaching_strategy(
            learner_profile=fast_learner,
            content_type="problem_solving",
            difficulty_level=0.8,
        )

        assert isinstance(strategy, TeachingStrategy)
        # Should prefer accelerated or discovery-based strategy
        assert strategy.pacing_mode.value in ["accelerated", "adaptive"]

    def test_select_teaching_strategy_for_different_content_types(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_learner_profile: LearnerProfile,
    ) -> None:
        """Test strategy selection for different content types."""
        content_types = [
            "concept_introduction",
            "skill_practice",
            "review",
            "assessment",
        ]

        strategies = []
        for content_type in content_types:
            strategy = reasoning_engine.select_teaching_strategy(
                learner_profile=sample_learner_profile,
                content_type=content_type,
                difficulty_level=0.5,
            )
            strategies.append(strategy)

        # All should return valid strategies
        assert all(isinstance(s, TeachingStrategy) for s in strategies)


class TestMockLLMClient:
    """Tests for MockLLMClient."""

    @pytest.mark.asyncio
    async def test_mock_client_reasoning_response(
        self, mock_llm_client: MockLLMClient
    ) -> None:
        """Test mock client returns valid reasoning response."""
        response = await mock_llm_client.generate(
            prompt="Use the ReAct pattern to analyze this learner...",
            temperature=0.3,
        )

        assert "THOUGHT:" in response
        assert "ACTION:" in response
        assert "OBSERVATION:" in response
        assert "CONFIDENCE:" in response

    @pytest.mark.asyncio
    async def test_mock_client_intervention_response(
        self, mock_llm_client: MockLLMClient
    ) -> None:
        """Test mock client returns valid intervention response."""
        response = await mock_llm_client.generate(
            prompt="Select the most appropriate intervention...",
            temperature=0.3,
        )

        assert "INTERVENTION:" in response
        assert "URGENCY:" in response

    @pytest.mark.asyncio
    async def test_mock_client_with_custom_responses(
        self, mock_llm_client_with_responses: MockLLMClient
    ) -> None:
        """Test mock client with custom response patterns."""
        response = await mock_llm_client_with_responses.generate(
            prompt="The learner shows frustration signals...",
        )

        assert "High frustration" in response

    @pytest.mark.asyncio
    async def test_mock_client_tracks_calls(
        self, mock_llm_client: MockLLMClient
    ) -> None:
        """Test that mock client tracks call count."""
        assert mock_llm_client.call_count == 0

        await mock_llm_client.generate(prompt="Test 1")
        assert mock_llm_client.call_count == 1

        await mock_llm_client.generate(prompt="Test 2")
        assert mock_llm_client.call_count == 2


class TestInterventionHistory:
    """Tests for intervention history management."""

    @pytest.mark.asyncio
    async def test_get_intervention_history_empty(
        self, reasoning_engine: ReActReasoningEngine
    ) -> None:
        """Test getting history for learner with no interventions."""
        history = reasoning_engine.get_intervention_history("nonexistent-learner")
        assert history == []

    @pytest.mark.asyncio
    async def test_clear_intervention_history(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_reasoning_trace: ReasoningTrace,
        available_interventions: List[InterventionType],
    ) -> None:
        """Test clearing intervention history."""
        learner_id = sample_reasoning_trace.metadata.get("learner_id", "unknown")

        # Create some history
        await reasoning_engine.decide_intervention(
            reasoning_trace=sample_reasoning_trace,
            available_interventions=available_interventions,
        )

        assert len(reasoning_engine.get_intervention_history(learner_id)) > 0

        # Clear history
        reasoning_engine.clear_intervention_history(learner_id)
        assert len(reasoning_engine.get_intervention_history(learner_id)) == 0


class TestContextPreparation:
    """Tests for context preparation helpers."""

    @pytest.mark.asyncio
    async def test_prepare_context_summary(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_learner_context: LearnerContext,
        sample_interactions: List[Interaction],
        sample_performance_metrics: PerformanceMetrics,
    ) -> None:
        """Test context summary preparation."""
        context = reasoning_engine._prepare_context_summary(
            sample_learner_context,
            sample_interactions,
            sample_performance_metrics,
        )

        assert "learner" in context
        assert "recent_interactions" in context
        assert "performance" in context
        assert context["learner"]["id"] == sample_learner_context.learner_id

    @pytest.mark.asyncio
    async def test_prepare_context_with_empty_interactions(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_learner_context: LearnerContext,
        sample_performance_metrics: PerformanceMetrics,
    ) -> None:
        """Test context preparation with empty interactions."""
        context = reasoning_engine._prepare_context_summary(
            sample_learner_context,
            [],  # No interactions
            sample_performance_metrics,
        )

        assert context["recent_interactions"]["count"] == 0
        assert context["recent_interactions"]["accuracy"] == 0.5  # Default


class TestConfidenceCalculation:
    """Tests for confidence calculation."""

    def test_calculate_total_confidence_single_step(
        self, reasoning_engine: ReActReasoningEngine
    ) -> None:
        """Test confidence calculation with single step."""
        steps = [
            ReasoningStep(
                thought="Test",
                action="Test",
                observation="Test",
                confidence=0.8,
            )
        ]
        confidence = reasoning_engine._calculate_total_confidence(steps)
        assert confidence == 0.8

    def test_calculate_total_confidence_multiple_steps(
        self, reasoning_engine: ReActReasoningEngine
    ) -> None:
        """Test confidence calculation with recency bias."""
        steps = [
            ReasoningStep(
                thought="Test 1",
                action="Test",
                observation="Test",
                confidence=0.6,
            ),
            ReasoningStep(
                thought="Test 2",
                action="Test",
                observation="Test",
                confidence=0.8,
            ),
            ReasoningStep(
                thought="Test 3",
                action="Test",
                observation="Test",
                confidence=0.9,
            ),
        ]
        confidence = reasoning_engine._calculate_total_confidence(steps)

        # More recent steps should have higher weight
        # So total should be closer to 0.9 than simple average
        assert confidence > sum(s.confidence for s in steps) / len(steps)

    def test_calculate_total_confidence_empty(
        self, reasoning_engine: ReActReasoningEngine
    ) -> None:
        """Test confidence calculation with no steps."""
        confidence = reasoning_engine._calculate_total_confidence([])
        assert confidence == 0.5  # Default


class TestResponseParsing:
    """Tests for LLM response parsing."""

    def test_parse_reasoning_response_valid(
        self, reasoning_engine: ReActReasoningEngine
    ) -> None:
        """Test parsing valid reasoning response."""
        response = """THOUGHT: The learner is struggling with fractions.
ACTION: Analyzing error patterns.
OBSERVATION: Consistent mistakes in denominator handling.
CONFIDENCE: 0.85"""

        thought, action, observation, confidence = (
            reasoning_engine._parse_reasoning_response(response)
        )

        assert "struggling" in thought.lower()
        assert "analyzing" in action.lower()
        assert "mistakes" in observation.lower()
        assert confidence == 0.85

    def test_parse_reasoning_response_multiline(
        self, reasoning_engine: ReActReasoningEngine
    ) -> None:
        """Test parsing multiline reasoning response."""
        response = """THOUGHT: The learner shows multiple signs of struggle.
They are taking longer to respond and using more hints.
ACTION: Reviewing the last 5 interactions in detail.
OBSERVATION: Clear pattern of difficulty emerging after
problem complexity increased.
CONFIDENCE: 0.75"""

        thought, action, observation, confidence = (
            reasoning_engine._parse_reasoning_response(response)
        )

        assert "multiple signs" in thought
        assert confidence == 0.75

    def test_parse_intervention_response_valid(
        self, reasoning_engine: ReActReasoningEngine
    ) -> None:
        """Test parsing valid intervention response."""
        response = """INTERVENTION: hint
URGENCY: medium
PARAMETERS: {"hint_level": 1}
REASONING: Student needs gentle support."""

        available = [InterventionType.HINT, InterventionType.SCAFFOLD]
        intervention_type, parameters, urgency = (
            reasoning_engine._parse_intervention_response(response, available)
        )

        assert intervention_type == InterventionType.HINT
        assert urgency == UrgencyLevel.MEDIUM
        assert parameters.get("hint_level") == 1
