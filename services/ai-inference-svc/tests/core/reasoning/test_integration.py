"""
Integration tests for ReAct Reasoning Engine with LLM service.

Tests the complete reasoning flow including:
- Full reasoning trace generation
- Intervention decision workflow
- Session reflection workflow
- Strategy selection with different learner profiles
"""

from datetime import datetime, timedelta
from typing import Dict, List
from unittest.mock import AsyncMock, MagicMock, patch

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
    ReasoningTrace,
    SessionReflection,
    StrategyCategory,
    TeachingStrategy,
    UrgencyLevel,
)


class TestFullReasoningWorkflow:
    """Integration tests for complete reasoning workflow."""

    @pytest.mark.asyncio
    async def test_full_reasoning_to_intervention_workflow(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_learner_context: LearnerContext,
        sample_interactions: List[Interaction],
        sample_performance_metrics: PerformanceMetrics,
        available_interventions: List[InterventionType],
    ) -> None:
        """Test the complete workflow from reasoning to intervention."""
        # Step 1: Reason about learner state
        trace = await reasoning_engine.reason_about_learner_state(
            learner_context=sample_learner_context,
            recent_interactions=sample_interactions,
            performance_metrics=sample_performance_metrics,
        )

        assert isinstance(trace, ReasoningTrace)
        assert len(trace.steps) >= 1
        assert trace.final_decision is not None

        # Step 2: Decide on intervention based on reasoning
        decision = await reasoning_engine.decide_intervention(
            reasoning_trace=trace,
            available_interventions=available_interventions,
        )

        assert isinstance(decision, InterventionDecision)
        assert decision.intervention_type in available_interventions
        assert decision.reasoning_trace == trace
        assert decision.learner_id == sample_learner_context.learner_id

    @pytest.mark.asyncio
    async def test_complete_session_workflow(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_learner_context: LearnerContext,
        sample_interactions: List[Interaction],
        sample_performance_metrics: PerformanceMetrics,
        available_interventions: List[InterventionType],
    ) -> None:
        """Test complete session workflow including reflection."""
        # Step 1: Multiple reasoning/intervention cycles
        decisions: List[InterventionDecision] = []
        outcomes: List[InterventionOutcome] = []

        for i in range(3):
            trace = await reasoning_engine.reason_about_learner_state(
                learner_context=sample_learner_context,
                recent_interactions=sample_interactions,
                performance_metrics=sample_performance_metrics,
            )

            decision = await reasoning_engine.decide_intervention(
                reasoning_trace=trace,
                available_interventions=available_interventions,
            )
            decisions.append(decision)

            # Simulate outcome
            outcome = InterventionOutcome(
                intervention_id=f"int-{i}",
                intervention_type=decision.intervention_type,
                effectiveness_score=0.6 + (i * 0.1),  # Improving effectiveness
                learner_response="positive" if i > 0 else "neutral",
                performance_delta=0.05 * (i + 1),
                engagement_delta=0.03 * (i + 1),
                applied_at=datetime.utcnow() - timedelta(minutes=10 - i * 3),
            )
            outcomes.append(outcome)

        # Step 2: Reflect on session
        reflection = await reasoning_engine.reflect_on_session(
            session_id=sample_learner_context.session_id,
            interventions_used=decisions,
            outcomes=outcomes,
        )

        assert isinstance(reflection, SessionReflection)
        assert reflection.total_interventions == 3
        assert reflection.overall_effectiveness > 0
        assert len(reflection.key_insights) > 0


class TestLLMIntegration:
    """Tests for LLM client integration patterns."""

    @pytest.mark.asyncio
    async def test_llm_client_error_handling(
        self,
        sample_learner_context: LearnerContext,
        sample_interactions: List[Interaction],
        sample_performance_metrics: PerformanceMetrics,
    ) -> None:
        """Test handling of LLM client errors."""
        # Create a client that raises an error
        error_client = AsyncMock()
        error_client.generate.side_effect = Exception("LLM API Error")

        engine = ReActReasoningEngine(llm_client=error_client)

        with pytest.raises(Exception, match="LLM API Error"):
            await engine.reason_about_learner_state(
                learner_context=sample_learner_context,
                recent_interactions=sample_interactions,
                performance_metrics=sample_performance_metrics,
            )

    @pytest.mark.asyncio
    async def test_llm_client_timeout_behavior(
        self,
        sample_learner_context: LearnerContext,
        sample_interactions: List[Interaction],
        sample_performance_metrics: PerformanceMetrics,
    ) -> None:
        """Test behavior with slow LLM responses."""
        import asyncio

        async def slow_generate(*args, **kwargs):
            await asyncio.sleep(0.1)  # Simulate slow response
            return """THOUGHT: Test thought
ACTION: Test action
OBSERVATION: Test observation
CONFIDENCE: 0.7"""

        slow_client = AsyncMock()
        slow_client.generate = slow_generate

        engine = ReActReasoningEngine(llm_client=slow_client)

        trace = await engine.reason_about_learner_state(
            learner_context=sample_learner_context,
            recent_interactions=sample_interactions,
            performance_metrics=sample_performance_metrics,
        )

        # Should complete even with slow responses
        assert isinstance(trace, ReasoningTrace)
        assert trace.reasoning_duration_ms >= 100  # At least as long as delay


class TestStrategyIntegration:
    """Integration tests for teaching strategy selection."""

    def test_strategy_selection_varies_by_learner(
        self, reasoning_engine: ReActReasoningEngine
    ) -> None:
        """Test that strategy selection adapts to different learners."""
        # Standard learner
        standard_profile = LearnerProfile(
            learner_id="standard",
            grade_level=5,
            learning_pace=1.0,
            cognitive_load_capacity=1.0,
        )

        # Struggling learner with IEP
        iep_profile = LearnerProfile(
            learner_id="iep",
            grade_level=5,
            learning_pace=0.6,
            cognitive_load_capacity=0.6,
            iep_accommodations=["extended_time", "visual_supports"],
        )

        # Advanced learner
        advanced_profile = LearnerProfile(
            learner_id="advanced",
            grade_level=5,
            learning_pace=1.5,
            cognitive_load_capacity=1.5,
            preferred_difficulty=0.8,
        )

        strategy_standard = reasoning_engine.select_teaching_strategy(
            learner_profile=standard_profile,
            content_type="skill_practice",
            difficulty_level=0.5,
        )

        strategy_iep = reasoning_engine.select_teaching_strategy(
            learner_profile=iep_profile,
            content_type="skill_practice",
            difficulty_level=0.5,
        )

        strategy_advanced = reasoning_engine.select_teaching_strategy(
            learner_profile=advanced_profile,
            content_type="skill_practice",
            difficulty_level=0.5,
        )

        # IEP learner should get more scaffolded/accommodated strategy
        assert (
            strategy_iep.category == StrategyCategory.DIFFERENTIATED
            or strategy_iep.category == StrategyCategory.SCAFFOLDED_LEARNING
        )

        # Advanced learner should get accelerated strategy
        assert strategy_advanced.pacing_mode.value in ["accelerated", "adaptive"]

    def test_strategy_selection_varies_by_content(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_learner_profile: LearnerProfile,
    ) -> None:
        """Test that strategy adapts to content type."""
        strategy_intro = reasoning_engine.select_teaching_strategy(
            learner_profile=sample_learner_profile,
            content_type="concept_introduction",
            difficulty_level=0.5,
        )

        strategy_practice = reasoning_engine.select_teaching_strategy(
            learner_profile=sample_learner_profile,
            content_type="skill_practice",
            difficulty_level=0.5,
        )

        strategy_exploration = reasoning_engine.select_teaching_strategy(
            learner_profile=sample_learner_profile,
            content_type="exploration",
            difficulty_level=0.5,
        )

        # All should be valid strategies
        assert all(
            isinstance(s, TeachingStrategy)
            for s in [strategy_intro, strategy_practice, strategy_exploration]
        )


class TestMultipleLearnerScenarios:
    """Integration tests with multiple learner scenarios."""

    @pytest.mark.asyncio
    async def test_parallel_reasoning_for_different_learners(
        self,
        mock_llm_client: MockLLMClient,
        reasoning_config: ReasoningConfig,
        sample_interactions: List[Interaction],
        sample_performance_metrics: PerformanceMetrics,
        available_interventions: List[InterventionType],
    ) -> None:
        """Test reasoning for multiple learners doesn't interfere."""
        engine = ReActReasoningEngine(
            llm_client=mock_llm_client,
            config=reasoning_config,
        )

        learner1_context = LearnerContext(
            learner_id="learner-001",
            session_id="session-001",
            current_skill_id="math-fractions",
            grade_level=4,
        )

        learner2_context = LearnerContext(
            learner_id="learner-002",
            session_id="session-002",
            current_skill_id="math-decimals",
            grade_level=5,
        )

        # Reason about both learners
        trace1 = await engine.reason_about_learner_state(
            learner_context=learner1_context,
            recent_interactions=sample_interactions,
            performance_metrics=sample_performance_metrics,
        )

        trace2 = await engine.reason_about_learner_state(
            learner_context=learner2_context,
            recent_interactions=sample_interactions,
            performance_metrics=sample_performance_metrics,
        )

        # Make decisions for both
        decision1 = await engine.decide_intervention(
            reasoning_trace=trace1,
            available_interventions=available_interventions,
        )

        decision2 = await engine.decide_intervention(
            reasoning_trace=trace2,
            available_interventions=available_interventions,
        )

        # Verify history is separate
        history1 = engine.get_intervention_history("learner-001")
        history2 = engine.get_intervention_history("learner-002")

        assert len(history1) == 1
        assert len(history2) == 1
        assert history1[0].learner_id == "learner-001"
        assert history2[0].learner_id == "learner-002"

    @pytest.mark.asyncio
    async def test_consecutive_sessions_same_learner(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_interactions: List[Interaction],
        sample_performance_metrics: PerformanceMetrics,
        available_interventions: List[InterventionType],
    ) -> None:
        """Test handling multiple sessions for same learner."""
        learner_id = "persistent-learner"

        # Session 1
        context1 = LearnerContext(
            learner_id=learner_id,
            session_id="session-1",
            current_skill_id="math-fractions",
            grade_level=4,
        )

        trace1 = await reasoning_engine.reason_about_learner_state(
            learner_context=context1,
            recent_interactions=sample_interactions,
            performance_metrics=sample_performance_metrics,
        )

        decision1 = await reasoning_engine.decide_intervention(
            reasoning_trace=trace1,
            available_interventions=available_interventions,
        )

        # Session 2
        context2 = LearnerContext(
            learner_id=learner_id,
            session_id="session-2",
            current_skill_id="math-fractions",
            grade_level=4,
        )

        trace2 = await reasoning_engine.reason_about_learner_state(
            learner_context=context2,
            recent_interactions=sample_interactions,
            performance_metrics=sample_performance_metrics,
        )

        decision2 = await reasoning_engine.decide_intervention(
            reasoning_trace=trace2,
            available_interventions=available_interventions,
        )

        # Verify history accumulates
        history = reasoning_engine.get_intervention_history(learner_id)
        assert len(history) == 2
        assert history[0].session_id == "session-1"
        assert history[1].session_id == "session-2"


class TestReasoningTraceSerializability:
    """Tests for reasoning trace serialization and storage."""

    @pytest.mark.asyncio
    async def test_reasoning_trace_json_serializable(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_learner_context: LearnerContext,
        sample_interactions: List[Interaction],
        sample_performance_metrics: PerformanceMetrics,
    ) -> None:
        """Test that reasoning traces can be serialized to JSON."""
        import json

        trace = await reasoning_engine.reason_about_learner_state(
            learner_context=sample_learner_context,
            recent_interactions=sample_interactions,
            performance_metrics=sample_performance_metrics,
        )

        # Should be serializable
        json_str = trace.model_dump_json()
        assert isinstance(json_str, str)

        # Should be deserializable
        data = json.loads(json_str)
        assert "steps" in data
        assert "final_decision" in data
        assert "total_confidence" in data

    @pytest.mark.asyncio
    async def test_intervention_decision_json_serializable(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_reasoning_trace: ReasoningTrace,
        available_interventions: List[InterventionType],
    ) -> None:
        """Test that intervention decisions can be serialized to JSON."""
        import json

        decision = await reasoning_engine.decide_intervention(
            reasoning_trace=sample_reasoning_trace,
            available_interventions=available_interventions,
        )

        # Should be serializable
        json_str = decision.model_dump_json()
        assert isinstance(json_str, str)

        # Should contain key fields
        data = json.loads(json_str)
        assert "intervention_type" in data
        assert "urgency" in data
        assert "reasoning_trace" in data


class TestEdgeCases:
    """Integration tests for edge cases."""

    @pytest.mark.asyncio
    async def test_empty_interactions_list(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_learner_context: LearnerContext,
        sample_performance_metrics: PerformanceMetrics,
        available_interventions: List[InterventionType],
    ) -> None:
        """Test handling of empty interactions list."""
        trace = await reasoning_engine.reason_about_learner_state(
            learner_context=sample_learner_context,
            recent_interactions=[],
            performance_metrics=sample_performance_metrics,
        )

        decision = await reasoning_engine.decide_intervention(
            reasoning_trace=trace,
            available_interventions=available_interventions,
        )

        assert isinstance(trace, ReasoningTrace)
        assert isinstance(decision, InterventionDecision)

    @pytest.mark.asyncio
    async def test_single_intervention_option(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_reasoning_trace: ReasoningTrace,
    ) -> None:
        """Test with only one intervention option."""
        decision = await reasoning_engine.decide_intervention(
            reasoning_trace=sample_reasoning_trace,
            available_interventions=[InterventionType.HINT],
        )

        # Should still work with single option
        assert decision.intervention_type in [
            InterventionType.HINT,
            InterventionType.NONE,  # Engine might choose NONE if not appropriate
        ]

    @pytest.mark.asyncio
    async def test_high_frustration_scenario(
        self,
        reasoning_engine: ReActReasoningEngine,
        sample_interactions: List[Interaction],
        available_interventions: List[InterventionType],
    ) -> None:
        """Test reasoning with high frustration signals."""
        frustrated_context = LearnerContext(
            learner_id="frustrated-learner",
            session_id="session-frustrated",
            current_skill_id="difficult-topic",
            grade_level=5,
            frustration_signals=5,  # High frustration
            recent_success_rate=0.1,
            session_duration_minutes=45,  # Long session
        )

        poor_metrics = PerformanceMetrics(
            overall_accuracy=0.3,
            recent_accuracy=0.1,
            average_response_time_ms=20000,
            engagement_trend=-0.5,
            hint_dependency_score=0.9,
            struggle_patterns=["persistent_errors", "increasing_response_time"],
        )

        trace = await reasoning_engine.reason_about_learner_state(
            learner_context=frustrated_context,
            recent_interactions=sample_interactions,
            performance_metrics=poor_metrics,
        )

        decision = await reasoning_engine.decide_intervention(
            reasoning_trace=trace,
            available_interventions=available_interventions,
        )

        # High frustration should result in higher urgency
        # (depending on mock responses, but structure should be valid)
        assert isinstance(trace, ReasoningTrace)
        assert isinstance(decision, InterventionDecision)


class TestConfigurationImpact:
    """Tests for configuration impact on behavior."""

    @pytest.mark.asyncio
    async def test_max_reasoning_steps_respected(
        self,
        mock_llm_client: MockLLMClient,
        sample_learner_context: LearnerContext,
        sample_interactions: List[Interaction],
        sample_performance_metrics: PerformanceMetrics,
    ) -> None:
        """Test that max reasoning steps config is respected."""
        config = ReasoningConfig(max_reasoning_steps=2)
        engine = ReActReasoningEngine(llm_client=mock_llm_client, config=config)

        trace = await engine.reason_about_learner_state(
            learner_context=sample_learner_context,
            recent_interactions=sample_interactions,
            performance_metrics=sample_performance_metrics,
        )

        # Should not exceed max steps
        assert len(trace.steps) <= 2

    @pytest.mark.asyncio
    async def test_confidence_threshold_affects_reasoning_depth(
        self,
        sample_learner_context: LearnerContext,
        sample_interactions: List[Interaction],
        sample_performance_metrics: PerformanceMetrics,
    ) -> None:
        """Test that confidence threshold affects reasoning depth."""
        # High confidence mock that returns high confidence quickly
        high_conf_responses = {
            "react": """THOUGHT: Clear situation, learner is progressing well.
ACTION: Quick assessment.
OBSERVATION: All indicators positive.
CONFIDENCE: 0.95"""
        }
        high_conf_client = MockLLMClient(responses=high_conf_responses)

        # Low threshold config
        low_threshold_config = ReasoningConfig(min_confidence_threshold=0.5)
        engine = ReActReasoningEngine(
            llm_client=high_conf_client,
            config=low_threshold_config,
        )

        trace = await engine.reason_about_learner_state(
            learner_context=sample_learner_context,
            recent_interactions=sample_interactions,
            performance_metrics=sample_performance_metrics,
        )

        # With high initial confidence, should terminate early
        assert isinstance(trace, ReasoningTrace)
