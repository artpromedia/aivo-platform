"""
Content Adaptation Engine Module.

This module provides multi-strategy content adaptation capabilities
for personalizing learning content based on learner performance
and cognitive state.

Key Components:
- AdaptationEngine: Main engine for applying content adaptations
- SafetyMonitor: Monitors adaptation safety and triggers rollbacks
- GradualTransitionManager: Manages gradual difficulty transitions
- Strategy implementations: Various adaptation strategies

Example Usage:
    ```python
    from app.core.adaptation import (
        AdaptationEngine,
        AdaptationRequest,
        AdaptationStrategy,
        SafetyMonitor,
        ContentFeatures,
        CognitiveState,
    )

    # Initialize engine
    engine = AdaptationEngine(llm_client=my_llm_client)
    safety = SafetyMonitor()

    # Create adaptation request
    request = AdaptationRequest(
        content_id="content_123",
        original_content={"text": "...", "questions": [...]},
        current_features=ContentFeatures(difficulty_level=0.7),
        learner_id="learner_456",
        strategies=[
            AdaptationStrategy.REDUCE_DIFFICULTY,
            AdaptationStrategy.ADD_SCAFFOLDING,
        ],
    )

    # Apply adaptation
    result = await engine.adapt_content(
        request=request,
        cognitive_state=CognitiveState(frustration=0.3),
    )

    # Register with safety monitor
    safety.register_adaptation(
        learner_id="learner_456",
        adaptation=result,
    )
    ```
"""

from .models import (
    AdaptationConfig,
    AdaptationContext,
    AdaptationRequest,
    AdaptationResult,
    AdaptationStrategy,
    CognitiveState,
    ContentFeatures,
    ContentFormat,
    PerformanceMetrics,
    PerformanceRecord,
    RollbackResult,
    ScaffoldType,
)

from .strategies import (
    AddExamplesStrategy,
    AddHintsStrategy,
    AddScaffoldingStrategy,
    AddVisualAidsStrategy,
    BaseAdaptationStrategy,
    ChangeFormatStrategy,
    IncreaseDifficultyStrategy,
    IncreaseEngagementStrategy,
    ProvideReviewStrategy,
    ReduceCognitiveLoadStrategy,
    ReduceDifficultyStrategy,
    RemoveScaffoldingStrategy,
    SimplifyLanguageStrategy,
    StepByStepStrategy,
    get_all_strategies,
    get_strategy,
)

from .engine import (
    AdaptationEngine,
    MockLLMClient,
)

from .safety import (
    GradualTransitionManager,
    RollbackTriggers,
    SafetyMonitor,
    SafetyState,
)

__all__ = [
    # Models
    "AdaptationConfig",
    "AdaptationContext",
    "AdaptationRequest",
    "AdaptationResult",
    "AdaptationStrategy",
    "CognitiveState",
    "ContentFeatures",
    "ContentFormat",
    "PerformanceMetrics",
    "PerformanceRecord",
    "RollbackResult",
    "ScaffoldType",
    # Strategies
    "AddExamplesStrategy",
    "AddHintsStrategy",
    "AddScaffoldingStrategy",
    "AddVisualAidsStrategy",
    "BaseAdaptationStrategy",
    "ChangeFormatStrategy",
    "IncreaseDifficultyStrategy",
    "IncreaseEngagementStrategy",
    "ProvideReviewStrategy",
    "ReduceCognitiveLoadStrategy",
    "ReduceDifficultyStrategy",
    "RemoveScaffoldingStrategy",
    "SimplifyLanguageStrategy",
    "StepByStepStrategy",
    "get_all_strategies",
    "get_strategy",
    # Engine
    "AdaptationEngine",
    "MockLLMClient",
    # Safety
    "GradualTransitionManager",
    "RollbackTriggers",
    "SafetyMonitor",
    "SafetyState",
]
