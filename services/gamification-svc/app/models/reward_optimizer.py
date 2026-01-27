"""
Reward Optimizer

Optimize reward timing and selection using behavioral psychology principles.
"""
import logging
import random
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class RewardTiming(str, Enum):
    """Reward timing strategies."""
    IMMEDIATE = "immediate"
    DELAYED = "delayed"
    SURPRISE = "surprise"
    SCHEDULED = "scheduled"


class RewardType(str, Enum):
    """Types of rewards."""
    XP = "xp"
    COINS = "coins"
    GEMS = "gems"
    ITEM = "item"
    BADGE = "badge"
    TITLE = "title"
    BOOSTER = "booster"
    STREAK_FREEZE = "freeze"


@dataclass
class RewardRecommendation:
    """Recommendation for optimal reward delivery."""
    reward_type: RewardType
    reward_id: str
    timing: RewardTiming
    reason: str
    value: float
    delay_seconds: int = 0
    personalization_score: float = 1.0


@dataclass
class RewardSchedule:
    """Personalized reward schedule for a learner."""
    learner_id: str
    base_reward_rate: float  # Rewards per activity (0-1)
    variable_ratio: int  # Average activities between rewards
    current_counter: int  # Activities since last reward
    next_reward_threshold: int  # Activities until next reward
    preferred_reward_types: List[RewardType]
    satiation_levels: Dict[str, float]  # Satiation per reward type (0-1)
    last_updated: datetime


class RewardOptimizer:
    """
    Optimize reward scheduling using behavioral psychology.

    Based on:
    - Variable ratio reinforcement schedules (most engaging)
    - Learner preferences and history
    - Satiation prevention (variety in rewards)
    - Intrinsic motivation balance (avoid over-rewarding)

    Usage:
        optimizer = RewardOptimizer()
        reward = optimizer.optimize_rewards(learner_id, context, available_rewards)
    """

    # Variable ratio schedule parameters
    MIN_RATIO = 2  # Minimum activities between rewards
    MAX_RATIO = 8  # Maximum activities between rewards
    BASE_RATIO = 4  # Average activities between rewards

    # Satiation parameters
    SATIATION_DECAY_HOURS = 24  # Hours for satiation to fully decay
    SATIATION_INCREMENT = 0.2  # Satiation increase per reward
    HIGH_SATIATION_THRESHOLD = 0.7

    # Value calculation weights
    NOVELTY_WEIGHT = 0.25
    PREFERENCE_WEIGHT = 0.30
    RARITY_WEIGHT = 0.20
    TIMING_WEIGHT = 0.15
    ENGAGEMENT_WEIGHT = 0.10

    # Rarity multipliers
    RARITY_MULTIPLIERS = {
        "common": 1.0,
        "uncommon": 1.3,
        "rare": 1.6,
        "epic": 2.0,
        "legendary": 2.5,
    }

    def __init__(self):
        """Initialize the reward optimizer."""
        # In-memory storage for schedules (in production, use Redis/database)
        self._schedules: Dict[str, RewardSchedule] = {}
        self._reward_history: Dict[str, List[Dict]] = {}

        logger.info("RewardOptimizer initialized")

    def optimize_rewards(
        self,
        learner_id: str,
        context: Dict[str, Any],
        available_rewards: List[str],
    ) -> Optional[RewardRecommendation]:
        """
        Optimize reward selection and timing.

        Args:
            learner_id: Unique identifier for the learner
            context: Context of the current activity including:
                - activity_type: str - type of activity completed
                - performance: float - performance score (0-1)
                - streak_days: int - current streak length
                - session_duration: int - minutes in current session
                - engagement_level: str - current engagement level
            available_rewards: List of available reward IDs

        Returns:
            RewardRecommendation or None if no reward should be given
        """
        if not available_rewards:
            return None

        # Get or create learner's reward schedule
        schedule = self._get_or_create_schedule(learner_id)

        # Update schedule counter
        schedule.current_counter += 1

        # Check if reward should be given based on variable ratio
        should_reward = self._should_give_reward(schedule, context)

        if not should_reward:
            return None

        # Select optimal reward
        recommendation = self._select_reward(
            learner_id, schedule, available_rewards, context
        )

        if recommendation:
            # Update schedule for next reward
            self._update_schedule_after_reward(schedule, recommendation.reward_type)

        return recommendation

    def schedule_rewards(
        self,
        learner_id: str,
        upcoming_activities: List[Dict[str, Any]],
    ) -> List[Tuple[int, RewardType]]:
        """
        Schedule reward delivery for upcoming activities using variable ratio.

        Args:
            learner_id: Unique identifier for the learner
            upcoming_activities: List of planned activities

        Returns:
            List of (activity_index, reward_type) tuples indicating when rewards
            should be delivered
        """
        schedule = self._get_or_create_schedule(learner_id)
        reward_plan: List[Tuple[int, RewardType]] = []

        counter = schedule.current_counter
        threshold = schedule.next_reward_threshold

        for i, activity in enumerate(upcoming_activities):
            counter += 1

            if counter >= threshold:
                # Determine reward type based on activity
                reward_type = self._select_reward_type_for_activity(
                    schedule, activity
                )
                reward_plan.append((i, reward_type))

                # Reset counter and calculate new threshold
                counter = 0
                threshold = self._calculate_next_threshold(schedule)

        return reward_plan

    def compute_reward_value(
        self,
        learner_id: str,
        reward_type: RewardType,
        reward_metadata: Dict[str, Any],
    ) -> float:
        """
        Compute personalized reward value for a specific learner.

        Args:
            learner_id: Unique identifier for the learner
            reward_type: Type of the reward
            reward_metadata: Metadata about the reward including:
                - rarity: str - reward rarity
                - base_value: float - base value of the reward
                - category: str - reward category

        Returns:
            Personalized reward value (0-10 scale)
        """
        schedule = self._get_or_create_schedule(learner_id)
        base_value = reward_metadata.get("base_value", 1.0)

        # Calculate novelty score (inverse of satiation)
        satiation = schedule.satiation_levels.get(reward_type.value, 0.0)
        novelty_score = 1.0 - satiation

        # Calculate preference score
        preference_score = self._calculate_preference_score(
            schedule, reward_type
        )

        # Calculate rarity score
        rarity = reward_metadata.get("rarity", "common")
        rarity_score = self.RARITY_MULTIPLIERS.get(rarity, 1.0) / 2.5  # Normalize to 0-1

        # Calculate timing score (based on time since last reward of this type)
        timing_score = self._calculate_timing_score(learner_id, reward_type)

        # Get engagement bonus
        engagement_score = self._get_engagement_score(learner_id)

        # Combine scores with weights
        personalized_value = (
            novelty_score * self.NOVELTY_WEIGHT +
            preference_score * self.PREFERENCE_WEIGHT +
            rarity_score * self.RARITY_WEIGHT +
            timing_score * self.TIMING_WEIGHT +
            engagement_score * self.ENGAGEMENT_WEIGHT
        )

        # Apply base value multiplier and scale to 0-10
        final_value = base_value * personalized_value * 10

        return round(float(final_value), 2)

    def get_satiation_level(
        self,
        learner_id: str,
        reward_type: RewardType,
    ) -> float:
        """
        Get current satiation level for a reward type.

        Args:
            learner_id: Unique identifier for the learner
            reward_type: Type of reward to check

        Returns:
            Satiation level (0-1, higher = more satiated)
        """
        schedule = self._get_or_create_schedule(learner_id)
        return schedule.satiation_levels.get(reward_type.value, 0.0)

    def record_reward_given(
        self,
        learner_id: str,
        reward_type: RewardType,
        reward_id: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Record that a reward was given to update internal state.

        Args:
            learner_id: Unique identifier for the learner
            reward_type: Type of reward given
            reward_id: ID of the specific reward
            context: Optional context about the reward
        """
        schedule = self._get_or_create_schedule(learner_id)

        # Update satiation
        current_satiation = schedule.satiation_levels.get(reward_type.value, 0.0)
        new_satiation = min(1.0, current_satiation + self.SATIATION_INCREMENT)
        schedule.satiation_levels[reward_type.value] = new_satiation

        # Record in history
        if learner_id not in self._reward_history:
            self._reward_history[learner_id] = []

        self._reward_history[learner_id].append({
            "reward_type": reward_type.value,
            "reward_id": reward_id,
            "timestamp": datetime.utcnow().isoformat(),
            "context": context,
        })

        # Keep only recent history
        self._reward_history[learner_id] = self._reward_history[learner_id][-100:]

        schedule.last_updated = datetime.utcnow()

    def _get_or_create_schedule(self, learner_id: str) -> RewardSchedule:
        """Get existing schedule or create a new one."""
        if learner_id in self._schedules:
            schedule = self._schedules[learner_id]
            # Decay satiation based on time
            self._decay_satiation(schedule)
            return schedule

        # Create new schedule with default values
        schedule = RewardSchedule(
            learner_id=learner_id,
            base_reward_rate=0.25,  # ~1 in 4 activities gets a reward
            variable_ratio=self.BASE_RATIO,
            current_counter=0,
            next_reward_threshold=self._calculate_initial_threshold(),
            preferred_reward_types=[RewardType.XP, RewardType.COINS],
            satiation_levels={},
            last_updated=datetime.utcnow(),
        )

        self._schedules[learner_id] = schedule
        return schedule

    def _decay_satiation(self, schedule: RewardSchedule) -> None:
        """Decay satiation levels based on time elapsed."""
        now = datetime.utcnow()
        hours_elapsed = (now - schedule.last_updated).total_seconds() / 3600

        if hours_elapsed > 0:
            decay_factor = min(1.0, hours_elapsed / self.SATIATION_DECAY_HOURS)

            for reward_type in schedule.satiation_levels:
                current = schedule.satiation_levels[reward_type]
                schedule.satiation_levels[reward_type] = max(0.0, current - decay_factor)

            schedule.last_updated = now

    def _should_give_reward(
        self,
        schedule: RewardSchedule,
        context: Dict[str, Any],
    ) -> bool:
        """Determine if a reward should be given based on variable ratio schedule."""
        # Check if threshold reached
        if schedule.current_counter >= schedule.next_reward_threshold:
            return True

        # Bonus chance for exceptional performance
        performance = context.get("performance", 0.5)
        if performance >= 0.95:
            bonus_chance = 0.3
            if random.random() < bonus_chance:
                return True

        # Bonus chance for streak milestones
        streak_days = context.get("streak_days", 0)
        if streak_days > 0 and streak_days % 7 == 0:
            return True

        return False

    def _select_reward(
        self,
        learner_id: str,
        schedule: RewardSchedule,
        available_rewards: List[str],
        context: Dict[str, Any],
    ) -> Optional[RewardRecommendation]:
        """Select the optimal reward from available options."""
        if not available_rewards:
            return None

        # Score each available reward
        scored_rewards: List[Tuple[str, float, RewardType]] = []

        for reward_id in available_rewards:
            reward_type = self._infer_reward_type(reward_id)
            reward_metadata = self._get_reward_metadata(reward_id)

            value = self.compute_reward_value(
                learner_id, reward_type, reward_metadata
            )

            # Apply satiation penalty
            satiation = schedule.satiation_levels.get(reward_type.value, 0.0)
            if satiation > self.HIGH_SATIATION_THRESHOLD:
                value *= 0.5  # Reduce value for saturated rewards

            scored_rewards.append((reward_id, value, reward_type))

        if not scored_rewards:
            return None

        # Sort by value (descending) and add some randomness
        scored_rewards.sort(key=lambda x: x[1], reverse=True)

        # Use softmax selection for variety (not always picking the highest)
        values = np.array([r[1] for r in scored_rewards])
        if values.max() > 0:
            # Temperature parameter controls randomness (lower = more deterministic)
            temperature = 2.0
            exp_values = np.exp(values / temperature)
            probabilities = exp_values / exp_values.sum()
            selected_idx = np.random.choice(len(scored_rewards), p=probabilities)
        else:
            selected_idx = 0

        selected_reward_id, selected_value, selected_type = scored_rewards[selected_idx]

        # Determine timing
        timing = self._determine_timing(context, selected_type)
        delay = 0
        if timing == RewardTiming.DELAYED:
            delay = random.randint(5, 30)  # 5-30 seconds delay

        # Generate reason
        reason = self._generate_reward_reason(context, selected_type)

        return RewardRecommendation(
            reward_type=selected_type,
            reward_id=selected_reward_id,
            timing=timing,
            reason=reason,
            value=selected_value,
            delay_seconds=delay,
            personalization_score=self._calculate_personalization_score(
                schedule, selected_type
            ),
        )

    def _update_schedule_after_reward(
        self,
        schedule: RewardSchedule,
        reward_type: RewardType,
    ) -> None:
        """Update schedule after giving a reward."""
        # Reset counter
        schedule.current_counter = 0

        # Calculate next threshold with variability
        schedule.next_reward_threshold = self._calculate_next_threshold(schedule)

        # Update satiation
        current_satiation = schedule.satiation_levels.get(reward_type.value, 0.0)
        schedule.satiation_levels[reward_type.value] = min(
            1.0, current_satiation + self.SATIATION_INCREMENT
        )

        schedule.last_updated = datetime.utcnow()

    def _calculate_initial_threshold(self) -> int:
        """Calculate initial threshold with some randomness."""
        return random.randint(self.MIN_RATIO, self.MAX_RATIO)

    def _calculate_next_threshold(self, schedule: RewardSchedule) -> int:
        """Calculate next reward threshold using variable ratio."""
        # Add randomness around the base ratio
        variance = (self.MAX_RATIO - self.MIN_RATIO) // 2
        threshold = schedule.variable_ratio + random.randint(-variance, variance)
        return max(self.MIN_RATIO, min(self.MAX_RATIO, threshold))

    def _select_reward_type_for_activity(
        self,
        schedule: RewardSchedule,
        activity: Dict[str, Any],
    ) -> RewardType:
        """Select appropriate reward type for an activity."""
        activity_type = activity.get("type", "lesson")

        # Map activity types to likely reward types
        activity_reward_mapping = {
            "lesson": [RewardType.XP, RewardType.COINS],
            "quiz": [RewardType.XP, RewardType.COINS, RewardType.BOOSTER],
            "challenge": [RewardType.GEMS, RewardType.BADGE],
            "streak": [RewardType.STREAK_FREEZE, RewardType.BOOSTER],
            "social": [RewardType.TITLE, RewardType.BADGE],
        }

        possible_types = activity_reward_mapping.get(
            activity_type,
            [RewardType.XP, RewardType.COINS],
        )

        # Filter out highly satiated types
        non_satiated = [
            rt for rt in possible_types
            if schedule.satiation_levels.get(rt.value, 0.0) < self.HIGH_SATIATION_THRESHOLD
        ]

        if non_satiated:
            return random.choice(non_satiated)
        return random.choice(possible_types)

    def _calculate_preference_score(
        self,
        schedule: RewardSchedule,
        reward_type: RewardType,
    ) -> float:
        """Calculate preference score based on learner's history."""
        if reward_type in schedule.preferred_reward_types:
            # Higher score for preferred types
            idx = schedule.preferred_reward_types.index(reward_type)
            return 1.0 - (idx * 0.1)  # First preference = 1.0, second = 0.9, etc.
        return 0.5

    def _calculate_timing_score(
        self,
        learner_id: str,
        reward_type: RewardType,
    ) -> float:
        """Calculate timing score based on time since last reward of this type."""
        history = self._reward_history.get(learner_id, [])

        # Find most recent reward of this type
        for entry in reversed(history):
            if entry.get("reward_type") == reward_type.value:
                timestamp_str = entry.get("timestamp", "")
                try:
                    last_reward_time = datetime.fromisoformat(timestamp_str)
                    hours_since = (datetime.utcnow() - last_reward_time).total_seconds() / 3600

                    # Score increases with time since last reward (max 1.0 at 24h)
                    return min(1.0, hours_since / 24)
                except (ValueError, TypeError):
                    pass

        # No previous reward of this type
        return 1.0

    def _get_engagement_score(self, learner_id: str) -> float:
        """Get current engagement score for bonus calculations."""
        # In production, this would query the engagement predictor
        # For now, return a reasonable default
        return 0.7

    def _determine_timing(
        self,
        context: Dict[str, Any],
        reward_type: RewardType,
    ) -> RewardTiming:
        """Determine optimal timing for reward delivery."""
        performance = context.get("performance", 0.5)
        engagement_level = context.get("engagement_level", "engaged")

        # Immediate rewards for high performance
        if performance >= 0.9:
            return RewardTiming.IMMEDIATE

        # Surprise rewards for disengaging learners (re-engagement)
        if engagement_level in ["disengaging", "at_risk"]:
            return RewardTiming.SURPRISE

        # Delayed rewards for badges and titles (build anticipation)
        if reward_type in [RewardType.BADGE, RewardType.TITLE]:
            return RewardTiming.DELAYED

        # Mix of immediate and surprise for general engagement
        if random.random() < 0.3:
            return RewardTiming.SURPRISE
        return RewardTiming.IMMEDIATE

    def _generate_reward_reason(
        self,
        context: Dict[str, Any],
        reward_type: RewardType,
    ) -> str:
        """Generate a personalized reason for the reward."""
        activity_type = context.get("activity_type", "activity")
        performance = context.get("performance", 0.5)
        streak_days = context.get("streak_days", 0)

        reasons = []

        if performance >= 0.9:
            reasons.append("Excellent performance!")
        elif performance >= 0.7:
            reasons.append("Great work!")

        if streak_days > 0:
            if streak_days % 7 == 0:
                reasons.append(f"Week {streak_days // 7} streak milestone!")
            elif streak_days % 30 == 0:
                reasons.append(f"Amazing {streak_days} day streak!")

        if activity_type == "challenge":
            reasons.append("Challenge completed!")
        elif activity_type == "quiz":
            reasons.append("Quiz mastered!")

        if not reasons:
            reasons.append("Keep up the great learning!")

        return " ".join(reasons)

    def _calculate_personalization_score(
        self,
        schedule: RewardSchedule,
        reward_type: RewardType,
    ) -> float:
        """Calculate how personalized this reward is for the learner."""
        # Based on preference match and satiation level
        preference_score = self._calculate_preference_score(schedule, reward_type)
        satiation = schedule.satiation_levels.get(reward_type.value, 0.0)

        # High preference + low satiation = highly personalized
        return (preference_score + (1 - satiation)) / 2

    def _infer_reward_type(self, reward_id: str) -> RewardType:
        """Infer reward type from reward ID."""
        reward_id_lower = reward_id.lower()

        if "xp" in reward_id_lower:
            return RewardType.XP
        elif "coin" in reward_id_lower:
            return RewardType.COINS
        elif "gem" in reward_id_lower:
            return RewardType.GEMS
        elif "badge" in reward_id_lower:
            return RewardType.BADGE
        elif "title" in reward_id_lower:
            return RewardType.TITLE
        elif "boost" in reward_id_lower:
            return RewardType.BOOSTER
        elif "freeze" in reward_id_lower:
            return RewardType.STREAK_FREEZE
        else:
            return RewardType.ITEM

    def _get_reward_metadata(self, reward_id: str) -> Dict[str, Any]:
        """Get metadata for a reward (placeholder for database lookup)."""
        # In production, this would fetch from database
        return {
            "base_value": 1.0,
            "rarity": "common",
            "category": "general",
        }
