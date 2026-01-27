"""
Challenge Calibrator

Calibrate challenge difficulty for optimal engagement using flow theory.
"""
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class DifficultyStakes(str, Enum):
    """Challenge stakes levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class ChallengeConfig:
    """Configuration for a calibrated challenge."""
    difficulty: float  # 0-1 scale
    time_limit: float  # seconds
    hint_availability: bool
    stakes: DifficultyStakes
    question_count: int = 10
    partial_credit: bool = True
    adaptive: bool = True


@dataclass
class PerformanceMetrics:
    """Performance metrics from a challenge attempt."""
    accuracy: float  # 0-1
    completion_time: float  # seconds
    hints_used: int
    streak_correct: int
    streak_incorrect: int
    time_per_question: List[float]
    difficulty_at_start: float
    difficulty_at_end: float


class ChallengeCalibrator:
    """
    Calibrate challenge difficulty for flow state.

    Based on:
    - Current skill level
    - Recent performance
    - Engagement patterns
    - Flow theory (challenge/skill balance)

    The optimal difficulty is where challenge slightly exceeds current skill,
    keeping learners in the "flow channel" - not too bored, not too anxious.

    Usage:
        calibrator = ChallengeCalibrator()
        config = calibrator.calibrate_challenge(learner_profile, skill_area)
    """

    # Flow theory parameters
    FLOW_CHANNEL_WIDTH = 0.15  # How much challenge can exceed skill
    OPTIMAL_CHALLENGE_RATIO = 1.05  # Challenge should be 5% above skill
    ANXIETY_THRESHOLD = 1.20  # Above this ratio causes anxiety
    BOREDOM_THRESHOLD = 0.85  # Below this ratio causes boredom

    # Difficulty adjustment parameters
    MAX_DIFFICULTY_CHANGE = 0.15  # Max change per adjustment
    MIN_DIFFICULTY = 0.1
    MAX_DIFFICULTY = 0.95

    # Time limit parameters (seconds)
    BASE_TIME_PER_QUESTION = 60  # Base seconds per question
    DIFFICULTY_TIME_MULTIPLIER = 0.5  # Extra time for harder questions

    def __init__(self):
        """Initialize the challenge calibrator."""
        # Weights for different factors in difficulty estimation
        self._skill_weight = 0.4
        self._performance_weight = 0.35
        self._confidence_weight = 0.15
        self._engagement_weight = 0.10

        logger.info("ChallengeCalibrator initialized")

    def calibrate_challenge(
        self,
        learner_profile: Dict[str, Any],
        skill_area: str,
    ) -> ChallengeConfig:
        """
        Calibrate challenge difficulty for optimal flow state.

        Args:
            learner_profile: Dictionary containing learner data including:
                - learner_id: str
                - skill_levels: Dict[str, float] - mastery per skill area (0-1)
                - recent_performance: List[Dict] - recent challenge results
                - preferences: Dict - learner preferences
                - engagement_history: List[Dict] - engagement metrics
            skill_area: The skill area for this challenge

        Returns:
            ChallengeConfig with calibrated settings
        """
        # Get current skill level for this area
        skill_levels = learner_profile.get("skill_levels", {})
        current_skill = skill_levels.get(skill_area, 0.5)

        # Estimate optimal difficulty
        optimal_difficulty = self.estimate_difficulty(learner_profile, skill_area)

        # Determine time limit based on difficulty
        time_limit = self._calculate_time_limit(optimal_difficulty)

        # Determine if hints should be available
        hint_availability = self._should_offer_hints(
            learner_profile, optimal_difficulty
        )

        # Determine stakes level
        stakes = self._determine_stakes(learner_profile, skill_area)

        # Calculate question count
        question_count = self._calculate_question_count(learner_profile, optimal_difficulty)

        return ChallengeConfig(
            difficulty=round(optimal_difficulty, 3),
            time_limit=time_limit,
            hint_availability=hint_availability,
            stakes=stakes,
            question_count=question_count,
            partial_credit=optimal_difficulty < 0.7,  # Partial credit for easier challenges
            adaptive=True,
        )

    def estimate_difficulty(
        self,
        learner_profile: Dict[str, Any],
        skill_area: str,
    ) -> float:
        """
        Estimate optimal difficulty based on skill level and other factors.

        Uses a weighted combination of:
        - Current skill level (primary factor)
        - Recent performance trends
        - Confidence indicators
        - Engagement patterns

        Args:
            learner_profile: Dictionary containing learner data
            skill_area: The skill area for this challenge

        Returns:
            Optimal difficulty value (0-1)
        """
        # Get skill level
        skill_levels = learner_profile.get("skill_levels", {})
        current_skill = skill_levels.get(skill_area, 0.5)

        # Base difficulty from flow theory
        base_difficulty = current_skill * self.OPTIMAL_CHALLENGE_RATIO

        # Adjust based on recent performance
        performance_adjustment = self._compute_performance_adjustment(
            learner_profile.get("recent_performance", []),
            skill_area,
        )

        # Adjust based on confidence
        confidence_adjustment = self._compute_confidence_adjustment(learner_profile)

        # Adjust based on engagement
        engagement_adjustment = self._compute_engagement_adjustment(
            learner_profile.get("engagement_history", [])
        )

        # Combine with weights
        optimal_difficulty = (
            base_difficulty * self._skill_weight +
            (base_difficulty + performance_adjustment) * self._performance_weight +
            (base_difficulty + confidence_adjustment) * self._confidence_weight +
            (base_difficulty + engagement_adjustment) * self._engagement_weight
        )

        # Normalize weights (they should sum to 1)
        total_weight = (
            self._skill_weight + self._performance_weight +
            self._confidence_weight + self._engagement_weight
        )
        optimal_difficulty /= total_weight

        # Clamp to valid range
        optimal_difficulty = np.clip(
            optimal_difficulty,
            self.MIN_DIFFICULTY,
            self.MAX_DIFFICULTY,
        )

        logger.debug(
            "Estimated difficulty for %s: %.3f (skill: %.2f, perf_adj: %.3f)",
            skill_area,
            optimal_difficulty,
            current_skill,
            performance_adjustment,
        )

        return float(optimal_difficulty)

    def adapt_difficulty(
        self,
        current_config: ChallengeConfig,
        performance: Dict[str, Any],
    ) -> ChallengeConfig:
        """
        Adapt difficulty based on recent performance during a challenge.

        This enables real-time difficulty adjustment within a challenge
        to maintain flow state.

        Args:
            current_config: Current challenge configuration
            performance: Performance data from recent questions including:
                - accuracy: float - current accuracy (0-1)
                - avg_response_time: float - average response time
                - streak_correct: int - consecutive correct answers
                - streak_incorrect: int - consecutive incorrect answers
                - questions_answered: int - number of questions answered
                - time_remaining: float - time remaining in challenge

        Returns:
            Adjusted ChallengeConfig
        """
        current_difficulty = current_config.difficulty
        accuracy = performance.get("accuracy", 0.5)
        streak_correct = performance.get("streak_correct", 0)
        streak_incorrect = performance.get("streak_incorrect", 0)
        avg_response_time = performance.get("avg_response_time", 30)

        # Calculate adjustment based on performance
        adjustment = 0.0

        # Accuracy-based adjustment
        if accuracy > 0.85:
            # Too easy - increase difficulty
            adjustment += 0.05
        elif accuracy < 0.5:
            # Too hard - decrease difficulty
            adjustment -= 0.08

        # Streak-based adjustment for more responsive adaptation
        if streak_correct >= 3:
            adjustment += 0.03 * (streak_correct - 2)
        elif streak_incorrect >= 2:
            adjustment -= 0.05 * streak_incorrect

        # Time-based adjustment
        expected_time = self.BASE_TIME_PER_QUESTION * (1 + current_difficulty * self.DIFFICULTY_TIME_MULTIPLIER)
        if avg_response_time < expected_time * 0.5:
            # Answering very quickly - might be too easy
            adjustment += 0.02
        elif avg_response_time > expected_time * 1.5:
            # Taking too long - might be too hard
            adjustment -= 0.02

        # Clamp adjustment
        adjustment = np.clip(
            adjustment,
            -self.MAX_DIFFICULTY_CHANGE,
            self.MAX_DIFFICULTY_CHANGE,
        )

        # Apply adjustment
        new_difficulty = np.clip(
            current_difficulty + adjustment,
            self.MIN_DIFFICULTY,
            self.MAX_DIFFICULTY,
        )

        # Recalculate time limit
        new_time_limit = self._calculate_time_limit(new_difficulty)

        # Update hints based on new difficulty
        new_hints = current_config.hint_availability
        if new_difficulty > current_difficulty + 0.1:
            new_hints = True  # Enable hints if difficulty increased significantly

        logger.debug(
            "Adapted difficulty: %.3f -> %.3f (adjustment: %.3f)",
            current_difficulty,
            new_difficulty,
            adjustment,
        )

        return ChallengeConfig(
            difficulty=round(float(new_difficulty), 3),
            time_limit=new_time_limit,
            hint_availability=new_hints,
            stakes=current_config.stakes,
            question_count=current_config.question_count,
            partial_credit=current_config.partial_credit,
            adaptive=current_config.adaptive,
        )

    def compute_flow_score(
        self,
        skill_level: float,
        challenge_level: float,
    ) -> float:
        """
        Compute how close to flow state based on skill/challenge balance.

        Flow state occurs when challenge slightly exceeds skill.
        Score of 1.0 means perfect flow, 0.0 means far from flow.

        Args:
            skill_level: Current skill level (0-1)
            challenge_level: Challenge difficulty (0-1)

        Returns:
            Flow score (0-1)
        """
        if skill_level <= 0:
            return 0.0

        ratio = challenge_level / skill_level

        # Perfect flow is at OPTIMAL_CHALLENGE_RATIO
        optimal = self.OPTIMAL_CHALLENGE_RATIO

        # Calculate distance from optimal
        if ratio < self.BOREDOM_THRESHOLD:
            # Boredom zone
            distance = (self.BOREDOM_THRESHOLD - ratio) / self.BOREDOM_THRESHOLD
            flow_score = max(0.0, 0.5 - distance * 0.5)
        elif ratio > self.ANXIETY_THRESHOLD:
            # Anxiety zone
            distance = (ratio - self.ANXIETY_THRESHOLD) / (2.0 - self.ANXIETY_THRESHOLD)
            flow_score = max(0.0, 0.5 - distance * 0.5)
        else:
            # Flow channel
            distance_from_optimal = abs(ratio - optimal) / self.FLOW_CHANNEL_WIDTH
            flow_score = max(0.0, 1.0 - distance_from_optimal * 0.5)

        return round(float(flow_score), 3)

    def get_flow_zone(
        self,
        skill_level: float,
    ) -> Tuple[float, float]:
        """
        Get the difficulty range that maintains flow state.

        Args:
            skill_level: Current skill level (0-1)

        Returns:
            Tuple of (min_difficulty, max_difficulty) for flow zone
        """
        min_flow = skill_level * self.BOREDOM_THRESHOLD
        max_flow = skill_level * self.ANXIETY_THRESHOLD

        return (
            max(self.MIN_DIFFICULTY, min_flow),
            min(self.MAX_DIFFICULTY, max_flow),
        )

    def _compute_performance_adjustment(
        self,
        recent_performance: List[Dict[str, Any]],
        skill_area: str,
    ) -> float:
        """Compute difficulty adjustment based on recent performance."""
        if not recent_performance:
            return 0.0

        # Filter to relevant skill area and recent attempts
        relevant = [
            p for p in recent_performance
            if p.get("skill_area") == skill_area
        ][-10:]  # Last 10 attempts

        if not relevant:
            return 0.0

        # Calculate weighted accuracy (more recent = higher weight)
        weights = np.exp(np.linspace(-2, 0, len(relevant)))
        weights /= weights.sum()

        accuracies = np.array([p.get("accuracy", 0.5) for p in relevant])
        weighted_accuracy = np.dot(weights, accuracies)

        # Convert accuracy to adjustment
        # High accuracy (>0.8) -> increase difficulty
        # Low accuracy (<0.5) -> decrease difficulty
        if weighted_accuracy > 0.8:
            adjustment = (weighted_accuracy - 0.8) * 0.3
        elif weighted_accuracy < 0.5:
            adjustment = (weighted_accuracy - 0.5) * 0.4
        else:
            adjustment = 0.0

        return float(adjustment)

    def _compute_confidence_adjustment(
        self,
        learner_profile: Dict[str, Any],
    ) -> float:
        """Compute adjustment based on learner confidence indicators."""
        # Confidence indicators
        hints_usage_rate = learner_profile.get("hints_usage_rate", 0.3)
        skip_rate = learner_profile.get("skip_rate", 0.1)
        retry_rate = learner_profile.get("retry_rate", 0.2)

        # High hint usage or skip rate suggests lower confidence
        low_confidence_signal = hints_usage_rate * 0.3 + skip_rate * 0.5

        # High retry rate suggests motivation despite difficulty
        high_confidence_signal = retry_rate * 0.2

        adjustment = (high_confidence_signal - low_confidence_signal) * 0.1

        return float(adjustment)

    def _compute_engagement_adjustment(
        self,
        engagement_history: List[Dict[str, Any]],
    ) -> float:
        """Compute adjustment based on engagement patterns."""
        if not engagement_history:
            return 0.0

        # Look at recent engagement metrics
        recent = engagement_history[-5:]

        avg_session_duration = np.mean([
            e.get("session_duration_minutes", 15)
            for e in recent
        ])

        avg_completion_rate = np.mean([
            e.get("challenge_completion_rate", 0.7)
            for e in recent
        ])

        # Short sessions or low completion might indicate difficulty issues
        if avg_session_duration < 5:
            adjustment = -0.05  # Lower difficulty to encourage longer sessions
        elif avg_session_duration > 30:
            adjustment = 0.02  # Can handle current difficulty well

        if avg_completion_rate < 0.5:
            adjustment -= 0.05  # Lower difficulty if not completing challenges

        return float(adjustment)

    def _calculate_time_limit(self, difficulty: float) -> float:
        """Calculate appropriate time limit for given difficulty."""
        # Base time plus extra time for harder questions
        time_per_question = (
            self.BASE_TIME_PER_QUESTION *
            (1 + difficulty * self.DIFFICULTY_TIME_MULTIPLIER)
        )

        # Assume 10 questions by default
        total_time = time_per_question * 10

        # Round to nearest 30 seconds
        total_time = round(total_time / 30) * 30

        return float(total_time)

    def _should_offer_hints(
        self,
        learner_profile: Dict[str, Any],
        difficulty: float,
    ) -> bool:
        """Determine if hints should be available."""
        # Always offer hints for high difficulty
        if difficulty > 0.75:
            return True

        # Check learner preference
        preferences = learner_profile.get("preferences", {})
        if preferences.get("always_hints", False):
            return True

        # Newer learners (lower level) get hints
        level = learner_profile.get("level", 1)
        if level < 5:
            return True

        # Medium difficulty - no hints by default
        return difficulty > 0.6

    def _determine_stakes(
        self,
        learner_profile: Dict[str, Any],
        skill_area: str,
    ) -> DifficultyStakes:
        """Determine appropriate stakes level."""
        # Check if this is a mastery test
        is_mastery_test = learner_profile.get("is_mastery_test", False)
        if is_mastery_test:
            return DifficultyStakes.HIGH

        # Check streak - high stake for long streaks
        streak_days = learner_profile.get("streak_days", 0)
        if streak_days > 14:
            return DifficultyStakes.MEDIUM

        # Check skill mastery - near mastery means higher stakes
        skill_levels = learner_profile.get("skill_levels", {})
        skill_mastery = skill_levels.get(skill_area, 0.5)
        if skill_mastery > 0.85:
            return DifficultyStakes.MEDIUM

        return DifficultyStakes.LOW

    def _calculate_question_count(
        self,
        learner_profile: Dict[str, Any],
        difficulty: float,
    ) -> int:
        """Calculate appropriate number of questions."""
        # Base count
        base_count = 10

        # Adjust based on difficulty
        if difficulty > 0.8:
            base_count = 8  # Fewer questions for very hard challenges
        elif difficulty < 0.3:
            base_count = 12  # More questions for easier challenges

        # Adjust based on available time (if specified)
        available_minutes = learner_profile.get("available_minutes")
        if available_minutes:
            # Estimate questions that can fit
            time_per_question = self.BASE_TIME_PER_QUESTION / 60  # in minutes
            max_questions = int(available_minutes / time_per_question)
            base_count = min(base_count, max(5, max_questions))

        return base_count
