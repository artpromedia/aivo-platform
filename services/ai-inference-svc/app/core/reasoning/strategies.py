"""
Teaching Strategy Definitions for ReAct Reasoning Engine.

This module defines teaching strategies that can be selected based on
learner characteristics, content type, and learning context.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from .models import InterventionType, LearnerProfile


class StrategyCategory(str, Enum):
    """Categories of teaching strategies."""

    DIRECT_INSTRUCTION = "direct_instruction"
    GUIDED_DISCOVERY = "guided_discovery"
    SCAFFOLDED_LEARNING = "scaffolded_learning"
    MASTERY_BASED = "mastery_based"
    GAME_BASED = "game_based"
    COLLABORATIVE = "collaborative"
    SELF_PACED = "self_paced"
    DIFFERENTIATED = "differentiated"


class ContentType(str, Enum):
    """Types of learning content."""

    CONCEPT_INTRODUCTION = "concept_introduction"
    SKILL_PRACTICE = "skill_practice"
    PROBLEM_SOLVING = "problem_solving"
    REVIEW = "review"
    ASSESSMENT = "assessment"
    EXPLORATION = "exploration"
    REMEDIATION = "remediation"


class PacingMode(str, Enum):
    """Pacing modes for content delivery."""

    ACCELERATED = "accelerated"
    STANDARD = "standard"
    EXTENDED = "extended"
    ADAPTIVE = "adaptive"


@dataclass
class InterventionConfig:
    """Configuration for when and how to apply interventions."""

    enabled_interventions: List[InterventionType] = field(
        default_factory=lambda: list(InterventionType)
    )
    auto_hint_threshold: float = 0.3  # Auto-hint if success rate drops below
    scaffold_trigger_failures: int = 2  # Scaffold after N consecutive failures
    encourage_interval_minutes: int = 10  # Encouragement every N minutes
    break_suggestion_minutes: int = 20  # Suggest break after N minutes
    max_hints_per_problem: int = 3
    hint_delay_seconds: int = 30  # Wait before offering hint


@dataclass
class PresentationConfig:
    """Configuration for content presentation."""

    primary_modality: str = "visual"
    secondary_modality: Optional[str] = None
    use_animations: bool = True
    use_audio: bool = False
    font_size_multiplier: float = 1.0
    contrast_mode: str = "normal"  # normal, high, dark
    reading_level_adjustment: int = 0  # Grade levels to adjust (-2 to +2)
    chunk_size: str = "medium"  # small, medium, large


@dataclass
class FeedbackConfig:
    """Configuration for feedback delivery."""

    immediate_feedback: bool = True
    show_correct_answer: bool = True
    explain_mistakes: bool = True
    positive_reinforcement_frequency: float = 0.7  # Fraction of correct to celebrate
    use_growth_mindset_language: bool = True
    personalize_feedback: bool = True


@dataclass
class ProgressionConfig:
    """Configuration for learning progression."""

    mastery_threshold: float = 0.85  # Required mastery to advance
    min_attempts_before_advance: int = 3
    allow_skip: bool = False
    spiral_review: bool = True  # Periodically review mastered content
    difficulty_adjustment_rate: float = 0.1  # Rate of difficulty change


@dataclass
class TeachingStrategy:
    """
    Complete teaching strategy definition.

    Combines category, pacing, intervention rules, presentation preferences,
    feedback style, and progression logic into a cohesive strategy.
    """

    name: str
    description: str
    category: StrategyCategory
    pacing_mode: PacingMode
    intervention_config: InterventionConfig = field(default_factory=InterventionConfig)
    presentation_config: PresentationConfig = field(default_factory=PresentationConfig)
    feedback_config: FeedbackConfig = field(default_factory=FeedbackConfig)
    progression_config: ProgressionConfig = field(default_factory=ProgressionConfig)
    suitable_content_types: List[ContentType] = field(
        default_factory=lambda: list(ContentType)
    )
    suitable_grade_bands: List[str] = field(
        default_factory=lambda: ["K-2", "3-5", "6-8", "9-12"]
    )
    metadata: Dict[str, Any] = field(default_factory=dict)

    def is_suitable_for(
        self,
        content_type: ContentType,
        grade_level: int,
        difficulty: float,
    ) -> bool:
        """Check if this strategy is suitable for the given context."""
        # Check content type
        if content_type not in self.suitable_content_types:
            return False

        # Check grade band
        grade_band = self._grade_to_band(grade_level)
        if grade_band not in self.suitable_grade_bands:
            return False

        return True

    def _grade_to_band(self, grade_level: int) -> str:
        """Convert grade level to grade band."""
        if grade_level <= 2:
            return "K-2"
        elif grade_level <= 5:
            return "3-5"
        elif grade_level <= 8:
            return "6-8"
        else:
            return "9-12"

    def to_dict(self) -> Dict[str, Any]:
        """Convert strategy to dictionary representation."""
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category.value,
            "pacing_mode": self.pacing_mode.value,
            "suitable_content_types": [ct.value for ct in self.suitable_content_types],
            "suitable_grade_bands": self.suitable_grade_bands,
            "metadata": self.metadata,
        }


class StrategySelector:
    """
    Selects appropriate teaching strategies based on learner and content.

    Uses a scoring system to match learner characteristics with
    strategy configurations.
    """

    def __init__(self) -> None:
        self._strategies: Dict[str, TeachingStrategy] = {}
        self._register_default_strategies()

    def _register_default_strategies(self) -> None:
        """Register the default set of teaching strategies."""
        # Direct Instruction - Explicit Teaching
        self.register_strategy(
            TeachingStrategy(
                name="explicit_instruction",
                description="Clear, step-by-step instruction with modeling and guided practice",
                category=StrategyCategory.DIRECT_INSTRUCTION,
                pacing_mode=PacingMode.STANDARD,
                intervention_config=InterventionConfig(
                    auto_hint_threshold=0.4,
                    scaffold_trigger_failures=2,
                    max_hints_per_problem=3,
                ),
                presentation_config=PresentationConfig(
                    primary_modality="visual",
                    use_animations=True,
                    chunk_size="small",
                ),
                feedback_config=FeedbackConfig(
                    immediate_feedback=True,
                    explain_mistakes=True,
                ),
                progression_config=ProgressionConfig(
                    mastery_threshold=0.8,
                    min_attempts_before_advance=5,
                ),
                suitable_content_types=[
                    ContentType.CONCEPT_INTRODUCTION,
                    ContentType.SKILL_PRACTICE,
                    ContentType.REMEDIATION,
                ],
                suitable_grade_bands=["K-2", "3-5", "6-8", "9-12"],
            )
        )

        # Guided Discovery
        self.register_strategy(
            TeachingStrategy(
                name="guided_discovery",
                description="Student-led exploration with strategic hints and scaffolding",
                category=StrategyCategory.GUIDED_DISCOVERY,
                pacing_mode=PacingMode.ADAPTIVE,
                intervention_config=InterventionConfig(
                    auto_hint_threshold=0.2,
                    scaffold_trigger_failures=3,
                    hint_delay_seconds=60,
                    max_hints_per_problem=2,
                ),
                presentation_config=PresentationConfig(
                    primary_modality="visual",
                    use_animations=True,
                    chunk_size="large",
                ),
                feedback_config=FeedbackConfig(
                    immediate_feedback=False,
                    show_correct_answer=False,
                    explain_mistakes=True,
                    use_growth_mindset_language=True,
                ),
                progression_config=ProgressionConfig(
                    mastery_threshold=0.75,
                    allow_skip=True,
                ),
                suitable_content_types=[
                    ContentType.EXPLORATION,
                    ContentType.PROBLEM_SOLVING,
                ],
                suitable_grade_bands=["3-5", "6-8", "9-12"],
            )
        )

        # Scaffolded Learning - High Support
        self.register_strategy(
            TeachingStrategy(
                name="high_scaffold",
                description="Maximum support with gradual release of responsibility",
                category=StrategyCategory.SCAFFOLDED_LEARNING,
                pacing_mode=PacingMode.EXTENDED,
                intervention_config=InterventionConfig(
                    auto_hint_threshold=0.5,
                    scaffold_trigger_failures=1,
                    encourage_interval_minutes=5,
                    max_hints_per_problem=5,
                    hint_delay_seconds=15,
                ),
                presentation_config=PresentationConfig(
                    primary_modality="visual",
                    secondary_modality="auditory",
                    use_animations=True,
                    chunk_size="small",
                    font_size_multiplier=1.2,
                ),
                feedback_config=FeedbackConfig(
                    immediate_feedback=True,
                    show_correct_answer=True,
                    explain_mistakes=True,
                    positive_reinforcement_frequency=0.9,
                    use_growth_mindset_language=True,
                    personalize_feedback=True,
                ),
                progression_config=ProgressionConfig(
                    mastery_threshold=0.9,
                    min_attempts_before_advance=5,
                    allow_skip=False,
                    spiral_review=True,
                ),
                suitable_content_types=[
                    ContentType.CONCEPT_INTRODUCTION,
                    ContentType.SKILL_PRACTICE,
                    ContentType.REMEDIATION,
                ],
                suitable_grade_bands=["K-2", "3-5", "6-8", "9-12"],
            )
        )

        # Mastery-Based Learning
        self.register_strategy(
            TeachingStrategy(
                name="mastery_based",
                description="Focus on complete understanding before progression",
                category=StrategyCategory.MASTERY_BASED,
                pacing_mode=PacingMode.ADAPTIVE,
                intervention_config=InterventionConfig(
                    auto_hint_threshold=0.4,
                    scaffold_trigger_failures=2,
                ),
                feedback_config=FeedbackConfig(
                    immediate_feedback=True,
                    explain_mistakes=True,
                ),
                progression_config=ProgressionConfig(
                    mastery_threshold=0.95,
                    min_attempts_before_advance=3,
                    allow_skip=False,
                    spiral_review=True,
                    difficulty_adjustment_rate=0.05,
                ),
                suitable_content_types=[
                    ContentType.SKILL_PRACTICE,
                    ContentType.ASSESSMENT,
                ],
                suitable_grade_bands=["K-2", "3-5", "6-8", "9-12"],
            )
        )

        # Accelerated Learning
        self.register_strategy(
            TeachingStrategy(
                name="accelerated",
                description="Fast-paced learning for advanced learners",
                category=StrategyCategory.SELF_PACED,
                pacing_mode=PacingMode.ACCELERATED,
                intervention_config=InterventionConfig(
                    auto_hint_threshold=0.1,
                    scaffold_trigger_failures=4,
                    hint_delay_seconds=90,
                    max_hints_per_problem=2,
                ),
                presentation_config=PresentationConfig(
                    chunk_size="large",
                ),
                feedback_config=FeedbackConfig(
                    immediate_feedback=True,
                    show_correct_answer=False,
                    positive_reinforcement_frequency=0.3,
                ),
                progression_config=ProgressionConfig(
                    mastery_threshold=0.7,
                    min_attempts_before_advance=2,
                    allow_skip=True,
                    difficulty_adjustment_rate=0.2,
                ),
                suitable_content_types=[
                    ContentType.SKILL_PRACTICE,
                    ContentType.PROBLEM_SOLVING,
                    ContentType.EXPLORATION,
                ],
                suitable_grade_bands=["3-5", "6-8", "9-12"],
            )
        )

        # Game-Based Learning
        self.register_strategy(
            TeachingStrategy(
                name="game_based",
                description="Learning through game mechanics and engagement",
                category=StrategyCategory.GAME_BASED,
                pacing_mode=PacingMode.ADAPTIVE,
                intervention_config=InterventionConfig(
                    encourage_interval_minutes=5,
                    break_suggestion_minutes=30,
                ),
                presentation_config=PresentationConfig(
                    use_animations=True,
                    use_audio=True,
                ),
                feedback_config=FeedbackConfig(
                    immediate_feedback=True,
                    positive_reinforcement_frequency=0.8,
                    personalize_feedback=True,
                ),
                progression_config=ProgressionConfig(
                    mastery_threshold=0.7,
                    allow_skip=True,
                ),
                suitable_content_types=[
                    ContentType.SKILL_PRACTICE,
                    ContentType.REVIEW,
                    ContentType.EXPLORATION,
                ],
                suitable_grade_bands=["K-2", "3-5", "6-8"],
            )
        )

        # IEP/Accommodated Learning
        self.register_strategy(
            TeachingStrategy(
                name="iep_accommodated",
                description="Strategy optimized for learners with IEP accommodations",
                category=StrategyCategory.DIFFERENTIATED,
                pacing_mode=PacingMode.EXTENDED,
                intervention_config=InterventionConfig(
                    auto_hint_threshold=0.5,
                    scaffold_trigger_failures=1,
                    encourage_interval_minutes=3,
                    break_suggestion_minutes=15,
                    max_hints_per_problem=5,
                    hint_delay_seconds=10,
                ),
                presentation_config=PresentationConfig(
                    primary_modality="multimodal",
                    use_animations=True,
                    use_audio=True,
                    font_size_multiplier=1.3,
                    contrast_mode="high",
                    reading_level_adjustment=-1,
                    chunk_size="small",
                ),
                feedback_config=FeedbackConfig(
                    immediate_feedback=True,
                    show_correct_answer=True,
                    explain_mistakes=True,
                    positive_reinforcement_frequency=0.95,
                    use_growth_mindset_language=True,
                    personalize_feedback=True,
                ),
                progression_config=ProgressionConfig(
                    mastery_threshold=0.85,
                    min_attempts_before_advance=5,
                    allow_skip=False,
                    spiral_review=True,
                    difficulty_adjustment_rate=0.05,
                ),
                suitable_content_types=list(ContentType),
                suitable_grade_bands=["K-2", "3-5", "6-8", "9-12"],
                metadata={"requires_iep": True},
            )
        )

    def register_strategy(self, strategy: TeachingStrategy) -> None:
        """Register a teaching strategy."""
        self._strategies[strategy.name] = strategy

    def get_strategy(self, name: str) -> Optional[TeachingStrategy]:
        """Get a strategy by name."""
        return self._strategies.get(name)

    def list_strategies(self) -> List[str]:
        """List all available strategy names."""
        return list(self._strategies.keys())

    def select_strategy(
        self,
        learner_profile: LearnerProfile,
        content_type: str,
        difficulty_level: float,
    ) -> TeachingStrategy:
        """
        Select the most appropriate teaching strategy.

        Args:
            learner_profile: The learner's profile
            content_type: Type of content being taught
            difficulty_level: Difficulty level (0-1)

        Returns:
            The most appropriate teaching strategy
        """
        try:
            content_type_enum = ContentType(content_type)
        except ValueError:
            content_type_enum = ContentType.SKILL_PRACTICE

        # Score each strategy
        scores: Dict[str, float] = {}
        for name, strategy in self._strategies.items():
            score = self._score_strategy(
                strategy,
                learner_profile,
                content_type_enum,
                difficulty_level,
            )
            scores[name] = score

        # Select highest scoring strategy
        best_strategy_name = max(scores, key=scores.get)  # type: ignore
        return self._strategies[best_strategy_name]

    def _score_strategy(
        self,
        strategy: TeachingStrategy,
        profile: LearnerProfile,
        content_type: ContentType,
        difficulty: float,
    ) -> float:
        """
        Score a strategy for a given learner and context.

        Returns a score from 0-1 indicating suitability.
        """
        score = 0.5  # Base score

        # Check basic suitability
        if not strategy.is_suitable_for(content_type, profile.grade_level, difficulty):
            return 0.0

        # IEP accommodations strongly prefer accommodated strategy
        if profile.iep_accommodations:
            if strategy.metadata.get("requires_iep"):
                score += 0.4
            elif strategy.category == StrategyCategory.SCAFFOLDED_LEARNING:
                score += 0.2

        # Learning pace alignment
        if profile.learning_pace < 0.7:
            # Slow learner prefers scaffolded/extended
            if strategy.pacing_mode == PacingMode.EXTENDED:
                score += 0.3
            elif strategy.pacing_mode == PacingMode.ACCELERATED:
                score -= 0.3
        elif profile.learning_pace > 1.3:
            # Fast learner prefers accelerated
            if strategy.pacing_mode == PacingMode.ACCELERATED:
                score += 0.3
            elif strategy.pacing_mode == PacingMode.EXTENDED:
                score -= 0.2

        # Modality alignment
        if (
            profile.preferred_modality
            == strategy.presentation_config.primary_modality
        ):
            score += 0.15
        elif (
            profile.preferred_modality
            == strategy.presentation_config.secondary_modality
        ):
            score += 0.1

        # Attention span considerations
        if profile.attention_span_minutes < 10:
            # Short attention - prefer frequent breaks and encouragement
            if strategy.intervention_config.break_suggestion_minutes <= 15:
                score += 0.1
            if strategy.intervention_config.encourage_interval_minutes <= 5:
                score += 0.1
            if strategy.presentation_config.chunk_size == "small":
                score += 0.1

        # Cognitive load considerations
        if profile.cognitive_load_capacity < 0.7:
            # Low cognitive capacity - prefer high scaffolding
            if strategy.category == StrategyCategory.SCAFFOLDED_LEARNING:
                score += 0.2
            if strategy.presentation_config.chunk_size == "small":
                score += 0.1

        # Difficulty alignment
        difficulty_gap = abs(difficulty - profile.preferred_difficulty)
        if difficulty_gap > 0.3:
            # Large gap - need more scaffolding
            if strategy.category == StrategyCategory.SCAFFOLDED_LEARNING:
                score += 0.15

        # Persistence consideration
        if profile.persistence_level < 0.4:
            # Low persistence - need more encouragement
            if strategy.feedback_config.positive_reinforcement_frequency > 0.7:
                score += 0.15

        # Response to encouragement
        if profile.response_to_encouragement > 0.7:
            if strategy.feedback_config.use_growth_mindset_language:
                score += 0.1

        # Challenges consideration
        if profile.challenges:
            # Has known challenges - prefer remediation-friendly strategies
            if ContentType.REMEDIATION in strategy.suitable_content_types:
                score += 0.1

        # Content type bonus
        if content_type in strategy.suitable_content_types:
            score += 0.1

        # Clamp score to valid range
        return max(0.0, min(1.0, score))


# Default strategy selector instance
_default_selector: Optional[StrategySelector] = None


def get_strategy_selector() -> StrategySelector:
    """Get the default strategy selector instance."""
    global _default_selector
    if _default_selector is None:
        _default_selector = StrategySelector()
    return _default_selector


def select_teaching_strategy(
    learner_profile: LearnerProfile,
    content_type: str,
    difficulty_level: float,
) -> TeachingStrategy:
    """
    Convenience function to select a teaching strategy.

    Args:
        learner_profile: The learner's profile
        content_type: Type of content being taught
        difficulty_level: Difficulty level (0-1)

    Returns:
        The most appropriate teaching strategy
    """
    selector = get_strategy_selector()
    return selector.select_strategy(learner_profile, content_type, difficulty_level)
