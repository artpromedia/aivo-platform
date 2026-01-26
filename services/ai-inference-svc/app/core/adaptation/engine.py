"""
Content Adaptation Engine.

This module implements the main adaptation engine that coordinates
multiple adaptation strategies to personalize learning content
based on learner performance and cognitive state.
"""

import logging
import time
import uuid
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol, Tuple

from .models import (
    AdaptationConfig,
    AdaptationContext,
    AdaptationRequest,
    AdaptationResult,
    AdaptationStrategy,
    CognitiveState,
    ContentFeatures,
    PerformanceMetrics,
    PerformanceRecord,
)
from .strategies import (
    BaseAdaptationStrategy,
    get_all_strategies,
    get_strategy,
)

logger = logging.getLogger(__name__)


class LLMClient(Protocol):
    """Protocol for LLM client interface."""

    async def generate(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> str:
        """Generate text from a prompt."""
        ...


class AdaptationEngine:
    """
    Main content adaptation engine.

    Coordinates multiple adaptation strategies to personalize learning
    content based on learner performance, cognitive state, and history.
    Supports gradual transitions and safety rollbacks.
    """

    def __init__(
        self,
        llm_client: LLMClient,
        strategies: Optional[Dict[AdaptationStrategy, BaseAdaptationStrategy]] = None,
        config: Optional[AdaptationConfig] = None,
    ) -> None:
        """
        Initialize the adaptation engine.

        Args:
            llm_client: Client for LLM inference
            strategies: Optional dict of strategy instances
            config: Optional configuration
        """
        self.llm_client = llm_client
        self.config = config or AdaptationConfig()
        self.strategies = strategies or get_all_strategies(llm_client)

        # History tracking per learner
        self._adaptation_history: Dict[str, List[AdaptationResult]] = defaultdict(list)
        self._performance_baselines: Dict[str, PerformanceMetrics] = {}
        self._last_adaptation_times: Dict[str, datetime] = {}
        self._session_adaptation_counts: Dict[str, int] = defaultdict(int)

    async def adapt_content(
        self,
        request: AdaptationRequest,
        cognitive_state: CognitiveState,
    ) -> AdaptationResult:
        """
        Adapt content using requested strategies.

        Process:
        1. Validate strategies can be applied
        2. Apply strategies in priority order
        3. Verify adaptation meets constraints
        4. Store for potential rollback

        Args:
            request: The adaptation request
            cognitive_state: Current cognitive state

        Returns:
            AdaptationResult with adapted content
        """
        start_time = time.time()

        # Check cooldown
        if not self._can_adapt(request.learner_id):
            logger.info(
                f"Adaptation cooldown active for learner {request.learner_id}, "
                "returning original content"
            )
            return self._create_no_change_result(request)

        content = request.original_content.copy()
        features = request.current_features
        applied_strategies: List[AdaptationStrategy] = []
        feature_changes: Dict[str, Tuple[float, float]] = {}

        # Create adaptation context
        context = AdaptationContext(
            learner_id=request.learner_id,
            cognitive_state=cognitive_state,
            adaptation_history=self._adaptation_history[request.learner_id][-10:],
        )

        # Sort strategies by priority
        ordered_strategies = self._prioritize_strategies(
            request.strategies,
            cognitive_state,
        )

        # Limit strategies per adaptation
        ordered_strategies = ordered_strategies[
            : self.config.max_strategies_per_adaptation
        ]

        original_features = features

        # Apply each strategy
        for strategy_type in ordered_strategies:
            strategy = self.strategies.get(strategy_type)
            if not strategy:
                logger.warning(f"Strategy {strategy_type} not found, skipping")
                continue

            if not strategy.can_apply(features):
                logger.debug(
                    f"Strategy {strategy_type} cannot be applied to current features"
                )
                continue

            try:
                old_features = features
                content, features = await strategy.apply(content, features, context)

                # Track feature changes
                self._track_feature_changes(
                    old_features, features, feature_changes
                )

                applied_strategies.append(strategy_type)
                logger.info(f"Applied strategy {strategy_type.value}")

            except Exception as e:
                logger.error(f"Failed to apply strategy {strategy_type}: {e}")
                continue

        # Verify constraints
        if request.preserve_correctness:
            content = self._verify_content_correctness(content, request.original_content)

        # Enforce max difficulty change
        features = self._enforce_difficulty_limits(
            original_features,
            features,
            request.max_difficulty_change,
        )

        # Generate result
        adaptation_id = str(uuid.uuid4())
        elapsed_ms = int((time.time() - start_time) * 1000)

        result = AdaptationResult(
            original_content_id=request.content_id,
            adapted_content=content,
            strategies_applied=applied_strategies,
            feature_changes=feature_changes,
            original_features=original_features,
            new_features=features,
            adaptation_rationale=self._generate_rationale(
                applied_strategies, feature_changes
            ),
            rollback_available=True,
            adaptation_id=adaptation_id,
            metadata={
                "elapsed_ms": elapsed_ms,
                "learner_id": request.learner_id,
                "cognitive_state": cognitive_state.model_dump(),
            },
        )

        # Store for rollback
        self._store_adaptation(request.learner_id, result)
        self._last_adaptation_times[request.learner_id] = datetime.utcnow()

        logger.info(
            f"Completed adaptation {adaptation_id} for learner {request.learner_id}: "
            f"applied {len(applied_strategies)} strategies in {elapsed_ms}ms"
        )

        return result

    async def auto_adapt(
        self,
        content_id: str,
        content: Dict[str, Any],
        learner_id: str,
        performance_history: List[PerformanceRecord],
        cognitive_state: CognitiveState,
    ) -> AdaptationResult:
        """
        Automatically determine and apply needed adaptations.

        Decision logic:
        - Accuracy < 60%: Reduce difficulty, add scaffolding
        - Accuracy 60-80%: Add scaffolding or hints
        - Accuracy > 90%: Consider increasing difficulty
        - High frustration: Simplify language, add breaks
        - Low engagement: Increase interactivity

        Args:
            content_id: Content identifier
            content: The content to adapt
            learner_id: Learner identifier
            performance_history: Recent performance records
            cognitive_state: Current cognitive state

        Returns:
            AdaptationResult with adapted content
        """
        # Analyze current features
        current_features = self._analyze_features(content)

        # Select strategies based on performance and state
        strategies = self._select_strategies(
            performance_history,
            cognitive_state,
        )

        if not strategies:
            logger.info(
                f"No adaptation needed for learner {learner_id}, "
                "returning original content"
            )
            return self._create_no_change_result(
                AdaptationRequest(
                    content_id=content_id,
                    original_content=content,
                    current_features=current_features,
                    learner_id=learner_id,
                    strategies=[],
                )
            )

        request = AdaptationRequest(
            content_id=content_id,
            original_content=content,
            current_features=current_features,
            learner_id=learner_id,
            strategies=strategies,
            max_difficulty_change=self.config.max_difficulty_change_per_session,
        )

        return await self.adapt_content(request, cognitive_state)

    def _select_strategies(
        self,
        performance_history: List[PerformanceRecord],
        state: CognitiveState,
    ) -> List[AdaptationStrategy]:
        """
        Select strategies based on performance and cognitive state.

        Args:
            performance_history: Recent performance records
            state: Current cognitive state

        Returns:
            List of strategies to apply
        """
        strategies: List[AdaptationStrategy] = []

        recent_accuracy = self._calculate_recent_accuracy(performance_history)
        consecutive_failures = self._count_consecutive_failures(performance_history)

        # Performance-based selection
        if recent_accuracy < 0.6:
            # Struggling - significant support needed
            strategies.extend([
                AdaptationStrategy.REDUCE_DIFFICULTY,
                AdaptationStrategy.ADD_SCAFFOLDING,
                AdaptationStrategy.ADD_EXAMPLES,
            ])
            logger.info(
                f"Low accuracy ({recent_accuracy:.2f}): "
                "selecting difficulty reduction and scaffolding"
            )

        elif recent_accuracy < 0.8:
            # Some difficulty - moderate support
            strategies.append(AdaptationStrategy.ADD_HINTS)
            if consecutive_failures >= 2:
                strategies.append(AdaptationStrategy.ADD_SCAFFOLDING)
            logger.info(
                f"Moderate accuracy ({recent_accuracy:.2f}): selecting hints"
            )

        elif recent_accuracy > 0.9 and len(performance_history) >= 5:
            # Excelling - consider increasing challenge
            consecutive_successes = self._count_consecutive_successes(performance_history)
            if consecutive_successes >= 5:
                strategies.append(AdaptationStrategy.INCREASE_DIFFICULTY)
                strategies.append(AdaptationStrategy.REMOVE_SCAFFOLDING)
                logger.info(
                    f"High accuracy ({recent_accuracy:.2f}): "
                    "selecting difficulty increase"
                )

        # State-based selection
        if state.frustration > 0.6:
            strategies.extend([
                AdaptationStrategy.SIMPLIFY_LANGUAGE,
                AdaptationStrategy.REDUCE_COGNITIVE_LOAD,
            ])
            logger.info(
                f"High frustration ({state.frustration:.2f}): "
                "selecting simplification strategies"
            )

        if state.engagement < 0.4:
            strategies.append(AdaptationStrategy.INCREASE_ENGAGEMENT)
            logger.info(
                f"Low engagement ({state.engagement:.2f}): "
                "selecting engagement strategy"
            )

        if state.cognitive_load > 0.8:
            strategies.append(AdaptationStrategy.REDUCE_COGNITIVE_LOAD)
            if AdaptationStrategy.STEP_BY_STEP not in strategies:
                strategies.append(AdaptationStrategy.STEP_BY_STEP)
            logger.info(
                f"High cognitive load ({state.cognitive_load:.2f}): "
                "selecting load reduction strategies"
            )

        if state.fatigue > 0.7:
            # Fatigued learner needs simplified content
            strategies.append(AdaptationStrategy.REDUCE_COGNITIVE_LOAD)
            strategies.append(AdaptationStrategy.ADD_VISUAL_AIDS)

        # Need for review based on session duration
        if state.session_duration_minutes > 20:
            strategies.append(AdaptationStrategy.PROVIDE_REVIEW)

        # Remove duplicates while preserving order
        seen = set()
        unique_strategies = []
        for s in strategies:
            if s not in seen:
                seen.add(s)
                unique_strategies.append(s)

        return unique_strategies

    def _prioritize_strategies(
        self,
        strategies: List[AdaptationStrategy],
        cognitive_state: CognitiveState,
    ) -> List[AdaptationStrategy]:
        """
        Sort strategies by priority for application order.

        Args:
            strategies: List of strategies to prioritize
            cognitive_state: Current cognitive state

        Returns:
            Sorted list of strategies
        """
        priority = self.config.strategy_priority

        # Adjust priorities based on state
        adjusted_priority = priority.copy()

        # If highly frustrated, prioritize calming strategies
        if cognitive_state.frustration > 0.7:
            adjusted_priority[AdaptationStrategy.SIMPLIFY_LANGUAGE] = 0
            adjusted_priority[AdaptationStrategy.REDUCE_COGNITIVE_LOAD] = 0

        # If low engagement, prioritize engagement
        if cognitive_state.engagement < 0.3:
            adjusted_priority[AdaptationStrategy.INCREASE_ENGAGEMENT] = 0

        return sorted(
            strategies,
            key=lambda s: adjusted_priority.get(s, 100),
        )

    def _calculate_recent_accuracy(
        self,
        history: List[PerformanceRecord],
    ) -> float:
        """Calculate accuracy from recent performance."""
        if not history:
            return 0.5

        recent = history[-10:]  # Last 10 interactions
        correct = sum(1 for r in recent if r.correct)
        return correct / len(recent)

    def _count_consecutive_failures(
        self,
        history: List[PerformanceRecord],
    ) -> int:
        """Count consecutive failures from end of history."""
        count = 0
        for record in reversed(history):
            if not record.correct:
                count += 1
            else:
                break
        return count

    def _count_consecutive_successes(
        self,
        history: List[PerformanceRecord],
    ) -> int:
        """Count consecutive successes from end of history."""
        count = 0
        for record in reversed(history):
            if record.correct:
                count += 1
            else:
                break
        return count

    def _analyze_features(self, content: Dict[str, Any]) -> ContentFeatures:
        """Analyze content to extract features."""
        # Extract features from content metadata or estimate
        return ContentFeatures(
            difficulty_level=content.get("difficulty", 0.5),
            vocabulary_level=content.get("vocabulary_level", 0.5),
            sentence_complexity=content.get("sentence_complexity", 0.5),
            concept_density=content.get("concept_density", 0.5),
            scaffolding_level=content.get("scaffolding_level", 0.0),
            visual_support_level=content.get("visual_support_level", 0.0),
            interactivity_level=content.get("interactivity_level", 0.0),
            format=content.get("format", "text"),
        )

    def _track_feature_changes(
        self,
        old_features: ContentFeatures,
        new_features: ContentFeatures,
        changes: Dict[str, Tuple[float, float]],
    ) -> None:
        """Track changes between old and new features."""
        old_dict = old_features.model_dump()
        new_dict = new_features.model_dump()

        for key in old_dict:
            if isinstance(old_dict[key], (int, float)):
                if old_dict[key] != new_dict[key]:
                    changes[key] = (old_dict[key], new_dict[key])

    def _enforce_difficulty_limits(
        self,
        original: ContentFeatures,
        current: ContentFeatures,
        max_change: float,
    ) -> ContentFeatures:
        """Ensure difficulty changes stay within limits."""
        diff = current.difficulty_level - original.difficulty_level

        if abs(diff) > max_change:
            # Clamp the change
            clamped_difficulty = original.difficulty_level + (
                max_change if diff > 0 else -max_change
            )
            return current.copy_with_changes(difficulty_level=clamped_difficulty)

        return current

    def _verify_content_correctness(
        self,
        adapted: Dict[str, Any],
        original: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Verify adapted content preserves correctness."""
        # Preserve critical fields
        critical_fields = ["correct_answer", "learning_objectives", "facts"]

        for field in critical_fields:
            if field in original:
                adapted[field] = original[field]

        return adapted

    def _generate_rationale(
        self,
        strategies: List[AdaptationStrategy],
        changes: Dict[str, Tuple[float, float]],
    ) -> str:
        """Generate explanation of adaptation choices."""
        if not strategies:
            return "No adaptations were applied."

        rationale_parts = [
            f"Applied {len(strategies)} adaptation strategies:"
        ]

        for strategy in strategies:
            rationale_parts.append(f"- {strategy.value}")

        if changes:
            rationale_parts.append("\nFeature changes:")
            for feature, (old, new) in changes.items():
                direction = "increased" if new > old else "decreased"
                rationale_parts.append(
                    f"- {feature}: {direction} from {old:.2f} to {new:.2f}"
                )

        return "\n".join(rationale_parts)

    def _can_adapt(self, learner_id: str) -> bool:
        """Check if adaptation is allowed (cooldown period)."""
        last_time = self._last_adaptation_times.get(learner_id)
        if not last_time:
            return True

        elapsed = (datetime.utcnow() - last_time).total_seconds()
        return elapsed >= self.config.adaptation_cooldown_seconds

    def _store_adaptation(
        self,
        learner_id: str,
        result: AdaptationResult,
    ) -> None:
        """Store adaptation result for history and rollback."""
        self._adaptation_history[learner_id].append(result)

        # Keep only recent history
        if len(self._adaptation_history[learner_id]) > 100:
            self._adaptation_history[learner_id] = (
                self._adaptation_history[learner_id][-100:]
            )

        self._session_adaptation_counts[learner_id] += 1

    def _create_no_change_result(
        self,
        request: AdaptationRequest,
    ) -> AdaptationResult:
        """Create a result indicating no changes were made."""
        return AdaptationResult(
            original_content_id=request.content_id,
            adapted_content=request.original_content,
            strategies_applied=[],
            feature_changes={},
            original_features=request.current_features,
            new_features=request.current_features,
            adaptation_rationale="No adaptation applied",
            rollback_available=False,
            adaptation_id=str(uuid.uuid4()),
        )

    def get_adaptation_history(
        self,
        learner_id: str,
        limit: int = 10,
    ) -> List[AdaptationResult]:
        """Get recent adaptation history for a learner."""
        return self._adaptation_history[learner_id][-limit:]

    def get_last_adaptation(
        self,
        learner_id: str,
    ) -> Optional[AdaptationResult]:
        """Get the most recent adaptation for a learner."""
        history = self._adaptation_history.get(learner_id, [])
        return history[-1] if history else None

    def set_performance_baseline(
        self,
        learner_id: str,
        baseline: PerformanceMetrics,
    ) -> None:
        """Set performance baseline for safety monitoring."""
        self._performance_baselines[learner_id] = baseline
        logger.info(
            f"Set performance baseline for learner {learner_id}: "
            f"accuracy={baseline.accuracy:.2f}"
        )

    def get_performance_baseline(
        self,
        learner_id: str,
    ) -> Optional[PerformanceMetrics]:
        """Get performance baseline for a learner."""
        return self._performance_baselines.get(learner_id)

    def clear_learner_data(self, learner_id: str) -> None:
        """Clear all stored data for a learner."""
        if learner_id in self._adaptation_history:
            del self._adaptation_history[learner_id]
        if learner_id in self._performance_baselines:
            del self._performance_baselines[learner_id]
        if learner_id in self._last_adaptation_times:
            del self._last_adaptation_times[learner_id]
        if learner_id in self._session_adaptation_counts:
            del self._session_adaptation_counts[learner_id]

        logger.info(f"Cleared all data for learner {learner_id}")

    def get_session_stats(self, learner_id: str) -> Dict[str, Any]:
        """Get adaptation statistics for current session."""
        history = self._adaptation_history.get(learner_id, [])

        strategies_used: Dict[str, int] = defaultdict(int)
        for result in history:
            for strategy in result.strategies_applied:
                strategies_used[strategy.value] += 1

        return {
            "total_adaptations": self._session_adaptation_counts.get(learner_id, 0),
            "strategies_used": dict(strategies_used),
            "last_adaptation_time": self._last_adaptation_times.get(learner_id),
            "history_length": len(history),
        }


class MockLLMClient:
    """
    Mock LLM client for testing purposes.

    Provides deterministic responses for testing the adaptation engine
    without requiring actual LLM API calls.
    """

    def __init__(self, responses: Optional[Dict[str, str]] = None) -> None:
        """
        Initialize mock client.

        Args:
            responses: Optional mapping of prompt patterns to responses
        """
        self.responses = responses or {}
        self.call_count = 0
        self.last_prompt: Optional[str] = None

    async def generate(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> str:
        """Generate mock response."""
        self.call_count += 1
        self.last_prompt = prompt

        # Check for pattern matches
        for pattern, response in self.responses.items():
            if pattern.lower() in prompt.lower():
                return response

        # Return adapted content structure
        return self._default_adaptation_response()

    def _default_adaptation_response(self) -> str:
        """Default response for content adaptation."""
        return """{
    "title": "Adapted Content",
    "content": "This is simplified content that maintains the learning objectives.",
    "examples": [
        "Example 1: A simple illustration of the concept",
        "Example 2: Another practical example"
    ],
    "key_points": [
        "Main concept explained simply",
        "Supporting detail with clarity"
    ]
}"""
