"""
Pytest fixtures for ReAct Reasoning Engine tests.

Provides common fixtures for testing models, strategies, and the reasoning engine.
"""

from datetime import datetime, timedelta
from typing import List

import pytest

from app.core.reasoning import (
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
    UrgencyLevel,
)


@pytest.fixture
def sample_learner_context() -> LearnerContext:
    """Create a sample learner context for testing."""
    return LearnerContext(
        learner_id="test-learner-001",
        session_id="test-session-001",
        current_skill_id="math-fractions-add",
        grade_level=4,
        learning_pace=1.0,
        preferred_modality="visual",
        attention_span_minutes=15,
        cognitive_load_capacity=1.0,
        current_mastery_estimate=0.6,
        session_duration_minutes=10,
        recent_success_rate=0.7,
        frustration_signals=0,
        iep_accommodations=[],
    )


@pytest.fixture
def sample_learner_context_struggling() -> LearnerContext:
    """Create a sample learner context showing struggle."""
    return LearnerContext(
        learner_id="test-learner-002",
        session_id="test-session-002",
        current_skill_id="math-fractions-multiply",
        grade_level=4,
        learning_pace=0.7,
        preferred_modality="visual",
        attention_span_minutes=10,
        cognitive_load_capacity=0.8,
        current_mastery_estimate=0.3,
        session_duration_minutes=25,
        recent_success_rate=0.3,
        frustration_signals=3,
        iep_accommodations=["extended_time"],
    )


@pytest.fixture
def sample_learner_profile() -> LearnerProfile:
    """Create a sample learner profile for testing."""
    return LearnerProfile(
        learner_id="test-learner-001",
        grade_level=4,
        learning_pace=1.0,
        preferred_modality="visual",
        attention_span_minutes=15,
        iep_accommodations=[],
        strengths=["math-addition", "math-subtraction"],
        challenges=["math-fractions"],
        cognitive_load_capacity=1.0,
        preferred_difficulty=0.5,
        response_to_encouragement=0.7,
        persistence_level=0.6,
    )


@pytest.fixture
def sample_learner_profile_iep() -> LearnerProfile:
    """Create a sample learner profile with IEP accommodations."""
    return LearnerProfile(
        learner_id="test-learner-iep",
        grade_level=3,
        learning_pace=0.6,
        preferred_modality="multimodal",
        attention_span_minutes=8,
        iep_accommodations=["extended_time", "visual_supports", "frequent_breaks"],
        strengths=["reading-comprehension"],
        challenges=["math-computation", "writing"],
        cognitive_load_capacity=0.6,
        preferred_difficulty=0.3,
        response_to_encouragement=0.9,
        persistence_level=0.4,
    )


@pytest.fixture
def sample_interactions() -> List[Interaction]:
    """Create sample learning interactions."""
    base_time = datetime.utcnow()
    return [
        Interaction(
            interaction_id="int-001",
            skill_id="math-fractions-add",
            correct=True,
            response_time_ms=5000,
            hints_used=0,
            attempts=1,
            difficulty=0.5,
            timestamp=base_time - timedelta(minutes=5),
            engagement_score=0.9,
            scaffolding_level=0,
        ),
        Interaction(
            interaction_id="int-002",
            skill_id="math-fractions-add",
            correct=False,
            response_time_ms=12000,
            hints_used=1,
            attempts=2,
            difficulty=0.6,
            timestamp=base_time - timedelta(minutes=4),
            engagement_score=0.7,
            scaffolding_level=1,
        ),
        Interaction(
            interaction_id="int-003",
            skill_id="math-fractions-add",
            correct=True,
            response_time_ms=8000,
            hints_used=1,
            attempts=1,
            difficulty=0.6,
            timestamp=base_time - timedelta(minutes=3),
            engagement_score=0.8,
            scaffolding_level=1,
        ),
        Interaction(
            interaction_id="int-004",
            skill_id="math-fractions-add",
            correct=True,
            response_time_ms=6000,
            hints_used=0,
            attempts=1,
            difficulty=0.7,
            timestamp=base_time - timedelta(minutes=2),
            engagement_score=0.85,
            scaffolding_level=0,
        ),
        Interaction(
            interaction_id="int-005",
            skill_id="math-fractions-add",
            correct=False,
            response_time_ms=15000,
            hints_used=2,
            attempts=3,
            difficulty=0.8,
            timestamp=base_time - timedelta(minutes=1),
            engagement_score=0.6,
            scaffolding_level=2,
        ),
    ]


@pytest.fixture
def sample_performance_metrics() -> PerformanceMetrics:
    """Create sample performance metrics."""
    return PerformanceMetrics(
        overall_accuracy=0.72,
        recent_accuracy=0.6,
        average_response_time_ms=8500,
        skill_mastery_levels={
            "math-fractions-add": 0.65,
            "math-fractions-subtract": 0.55,
            "math-fractions-multiply": 0.3,
        },
        struggle_patterns=["difficulty_spikes", "hint_dependency"],
        strength_areas=["addition", "subtraction"],
        engagement_trend=-0.1,
        time_on_task_ratio=0.85,
        hint_dependency_score=0.4,
    )


@pytest.fixture
def sample_reasoning_step() -> ReasoningStep:
    """Create a sample reasoning step."""
    return ReasoningStep(
        thought="The learner shows moderate engagement with recent struggles on higher difficulty problems.",
        action="Analyzing response time patterns and hint usage trends.",
        observation="Response times increase significantly above difficulty 0.7, and hint dependency is growing.",
        confidence=0.75,
    )


@pytest.fixture
def sample_reasoning_trace(sample_reasoning_step: ReasoningStep) -> ReasoningTrace:
    """Create a sample reasoning trace."""
    steps = [
        sample_reasoning_step,
        ReasoningStep(
            thought="Need to assess if the learner is frustrated or just challenged appropriately.",
            action="Checking frustration signals and engagement scores.",
            observation="No clear frustration signals detected. Engagement remains above 0.6.",
            confidence=0.8,
        ),
        ReasoningStep(
            thought="The learner may benefit from scaffolding on the current difficulty level.",
            action="Evaluating intervention options based on learner profile.",
            observation="Hint or scaffold intervention would be appropriate without disrupting learning flow.",
            confidence=0.85,
        ),
    ]
    return ReasoningTrace(
        steps=steps,
        final_decision="Light scaffolding recommended to support learning without creating dependency.",
        total_confidence=0.8,
        reasoning_duration_ms=1500,
        metadata={
            "learner_id": "test-learner-001",
            "session_id": "test-session-001",
        },
    )


@pytest.fixture
def sample_intervention_decision(
    sample_reasoning_trace: ReasoningTrace,
) -> InterventionDecision:
    """Create a sample intervention decision."""
    return InterventionDecision(
        intervention_type=InterventionType.HINT,
        parameters={"hint_level": 1, "focus_area": "fraction_concepts"},
        reasoning_trace=sample_reasoning_trace,
        urgency=UrgencyLevel.MEDIUM,
        learner_id="test-learner-001",
        session_id="test-session-001",
    )


@pytest.fixture
def sample_intervention_outcome() -> InterventionOutcome:
    """Create a sample intervention outcome."""
    return InterventionOutcome(
        intervention_id="int-decision-001",
        intervention_type=InterventionType.HINT,
        effectiveness_score=0.75,
        learner_response="positive",
        performance_delta=0.15,
        engagement_delta=0.1,
        applied_at=datetime.utcnow() - timedelta(minutes=5),
    )


@pytest.fixture
def mock_llm_client() -> MockLLMClient:
    """Create a mock LLM client for testing."""
    return MockLLMClient()


@pytest.fixture
def mock_llm_client_with_responses() -> MockLLMClient:
    """Create a mock LLM client with custom responses."""
    responses = {
        "frustration": """THOUGHT: High frustration signals detected in recent interactions.
ACTION: Checking engagement scores and error patterns.
OBSERVATION: Learner is showing clear signs of frustration with declining engagement.
CONFIDENCE: 0.9""",
        "struggling": """THOUGHT: Learner is struggling with the current concept.
ACTION: Analyzing pattern of incorrect responses.
OBSERVATION: Consistent errors suggest fundamental misunderstanding.
CONFIDENCE: 0.85""",
    }
    return MockLLMClient(responses=responses)


@pytest.fixture
def reasoning_config() -> ReasoningConfig:
    """Create a standard reasoning configuration."""
    return ReasoningConfig(
        max_reasoning_steps=5,
        min_confidence_threshold=0.6,
        reasoning_timeout_ms=5000,
        enable_reflection=True,
        llm_temperature=0.3,
        llm_model="gpt-4",
        intervention_cooldown_seconds=60,
    )


@pytest.fixture
def reasoning_engine(
    mock_llm_client: MockLLMClient,
    reasoning_config: ReasoningConfig,
) -> ReActReasoningEngine:
    """Create a ReActReasoningEngine instance for testing."""
    return ReActReasoningEngine(
        llm_client=mock_llm_client,
        config=reasoning_config,
    )


@pytest.fixture
def available_interventions() -> List[InterventionType]:
    """Create a list of available intervention types."""
    return [
        InterventionType.HINT,
        InterventionType.SCAFFOLD,
        InterventionType.ENCOURAGE,
        InterventionType.SIMPLIFY,
        InterventionType.BREAK,
        InterventionType.NONE,
    ]
