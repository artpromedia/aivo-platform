"""
ReAct Reasoning Engine Module.

This module provides transparent multi-step reasoning with intervention
decision making for AI-driven learning support.

The ReAct (Reasoning + Acting) pattern enables:
- Transparent reasoning traces for audit and explanation
- Multi-step analysis of learner state
- Evidence-based intervention decisions
- Teaching strategy selection based on learner profiles

Example usage:
    from app.core.reasoning import (
        ReActReasoningEngine,
        ReasoningConfig,
        LearnerContext,
        PerformanceMetrics,
        InterventionType,
    )

    # Initialize engine with LLM client
    engine = ReActReasoningEngine(llm_client, config=ReasoningConfig())

    # Reason about learner state
    trace = await engine.reason_about_learner_state(
        learner_context=context,
        recent_interactions=interactions,
        performance_metrics=metrics,
    )

    # Decide on intervention
    decision = await engine.decide_intervention(
        reasoning_trace=trace,
        available_interventions=[InterventionType.HINT, InterventionType.SCAFFOLD],
    )
"""

# Models
from .models import (
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

# Strategy definitions
from .strategies import (
    ContentType,
    FeedbackConfig,
    InterventionConfig,
    PacingMode,
    PresentationConfig,
    ProgressionConfig,
    StrategyCategory,
    StrategySelector,
    TeachingStrategy,
    get_strategy_selector,
    select_teaching_strategy,
)

# Engine
from .react_engine import (
    LLMClient,
    MockLLMClient,
    ReActReasoningEngine,
)

__all__ = [
    # Models
    "InterventionType",
    "UrgencyLevel",
    "ReasoningStep",
    "ReasoningTrace",
    "InterventionDecision",
    "LearnerContext",
    "Interaction",
    "PerformanceMetrics",
    "InterventionOutcome",
    "SessionReflection",
    "LearnerProfile",
    "ReasoningConfig",
    # Strategies
    "StrategyCategory",
    "ContentType",
    "PacingMode",
    "InterventionConfig",
    "PresentationConfig",
    "FeedbackConfig",
    "ProgressionConfig",
    "TeachingStrategy",
    "StrategySelector",
    "get_strategy_selector",
    "select_teaching_strategy",
    # Engine
    "LLMClient",
    "MockLLMClient",
    "ReActReasoningEngine",
]
