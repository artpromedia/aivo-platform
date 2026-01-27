"""
Reward Model

Model rewards for tutoring actions.
"""
import logging
from dataclasses import dataclass
from typing import Dict, Any, List
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class RewardComponents:
    learning_gain: float
    engagement: float
    efficiency: float
    total: float


class RewardModel:
    """
    Model rewards for tutoring decisions.

    Components:
    - Learning gain (knowledge improvement)
    - Engagement (attention, participation)
    - Efficiency (time to mastery)

    Usage:
        model = RewardModel()
        reward = model.compute(state, action, outcome)
    """

    def __init__(
        self,
        learning_weight: float = 0.5,
        engagement_weight: float = 0.3,
        efficiency_weight: float = 0.2,
    ):
        self.learning_weight = learning_weight
        self.engagement_weight = engagement_weight
        self.efficiency_weight = efficiency_weight

        # Feedback learning parameters
        self._feedback_examples: List[Dict] = []
        self._learned_adjustments: Dict[str, float] = {}

        logger.info(
            f"RewardModel initialized with weights: "
            f"learning={learning_weight}, engagement={engagement_weight}, efficiency={efficiency_weight}"
        )

    def compute(
        self,
        state: Dict[str, Any],
        action: Dict[str, Any],
        outcome: Dict[str, Any],
    ) -> RewardComponents:
        """Compute reward for a tutoring interaction."""
        # Compute learning gain reward
        learning_gain = self._compute_learning_gain(state, outcome)

        # Compute engagement reward
        engagement = self._compute_engagement_reward(state, outcome)

        # Compute efficiency reward
        efficiency = self._compute_efficiency_reward(state, action, outcome)

        # Apply learned adjustments if any
        action_type = action.get("action_type", "unknown")
        adjustment = self._learned_adjustments.get(action_type, 0.0)

        # Compute weighted total
        total = (
            self.learning_weight * learning_gain +
            self.engagement_weight * engagement +
            self.efficiency_weight * efficiency +
            adjustment
        )

        # Clip to reasonable range
        total = np.clip(total, -1.0, 1.0)

        return RewardComponents(
            learning_gain=learning_gain,
            engagement=engagement,
            efficiency=efficiency,
            total=float(total)
        )

    def _compute_learning_gain(
        self,
        state: Dict[str, Any],
        outcome: Dict[str, Any],
    ) -> float:
        """Compute learning gain component of reward."""
        # Get correctness from outcome
        correctness = outcome.get("correctness", 0.5)

        # Get knowledge state changes
        prev_knowledge = state.get("knowledge_state", {})
        new_knowledge = outcome.get("new_knowledge_state", prev_knowledge)

        # Calculate knowledge improvement
        if prev_knowledge and new_knowledge:
            prev_avg = np.mean(list(prev_knowledge.values())) if prev_knowledge else 0
            new_avg = np.mean(list(new_knowledge.values())) if new_knowledge else 0
            knowledge_gain = new_avg - prev_avg
        else:
            knowledge_gain = 0.0

        # Combine correctness and knowledge gain
        learning_reward = 0.6 * correctness + 0.4 * (knowledge_gain + 0.5)

        # Bonus for mastery achievements
        mastery_threshold = 0.8
        for topic, mastery in new_knowledge.items() if new_knowledge else []:
            prev_mastery = prev_knowledge.get(topic, 0) if prev_knowledge else 0
            if mastery >= mastery_threshold and prev_mastery < mastery_threshold:
                learning_reward += 0.2  # Mastery bonus

        return np.clip(learning_reward, -1.0, 1.0)

    def _compute_engagement_reward(
        self,
        state: Dict[str, Any],
        outcome: Dict[str, Any],
    ) -> float:
        """Compute engagement component of reward."""
        # Current engagement level
        prev_engagement = state.get("engagement_level", 0.5)
        new_engagement = outcome.get("engagement", prev_engagement)

        # Engagement change
        engagement_delta = new_engagement - prev_engagement

        # Base reward from current engagement
        base_reward = new_engagement - 0.5  # Center around 0

        # Bonus for improving engagement
        improvement_bonus = 0.3 * engagement_delta if engagement_delta > 0 else 0.5 * engagement_delta

        # Penalty for very low engagement
        if new_engagement < 0.2:
            base_reward -= 0.3

        return np.clip(base_reward + improvement_bonus, -1.0, 1.0)

    def _compute_efficiency_reward(
        self,
        state: Dict[str, Any],
        action: Dict[str, Any],
        outcome: Dict[str, Any],
    ) -> float:
        """Compute efficiency component of reward."""
        # Time taken for the interaction
        time_taken = outcome.get("time", 60.0)  # seconds
        expected_time = outcome.get("expected_time", 60.0)

        # Efficiency ratio (faster is better, but not too fast)
        if expected_time > 0:
            time_ratio = time_taken / expected_time
            if time_ratio < 0.5:
                # Too fast might mean guessing
                efficiency = 0.3
            elif time_ratio <= 1.0:
                # Good pace
                efficiency = 1.0 - 0.3 * (1.0 - time_ratio)
            elif time_ratio <= 2.0:
                # Slower but acceptable
                efficiency = 0.7 - 0.3 * (time_ratio - 1.0)
            else:
                # Too slow
                efficiency = 0.2
        else:
            efficiency = 0.5

        # Penalty for excessive hints/help
        hints_used = outcome.get("hints_used", 0)
        if hints_used > 2:
            efficiency -= 0.1 * (hints_used - 2)

        return np.clip(efficiency - 0.5, -1.0, 1.0)  # Center around 0

    def learn_from_feedback(
        self,
        examples: List[Dict],
    ):
        """Learn reward function from human feedback."""
        self._feedback_examples.extend(examples)

        # Aggregate feedback by action type
        action_feedback: Dict[str, List[float]] = {}

        for example in examples:
            action_type = example.get("action_type", "unknown")
            human_rating = example.get("human_rating", 0.5)
            computed_reward = example.get("computed_reward", 0.5)

            if action_type not in action_feedback:
                action_feedback[action_type] = []

            # Track discrepancy between human rating and computed reward
            action_feedback[action_type].append(human_rating - computed_reward)

        # Update learned adjustments
        for action_type, discrepancies in action_feedback.items():
            if discrepancies:
                avg_discrepancy = np.mean(discrepancies)
                # Smoothly update adjustment
                current = self._learned_adjustments.get(action_type, 0.0)
                self._learned_adjustments[action_type] = 0.7 * current + 0.3 * avg_discrepancy

        logger.info(f"Learned reward adjustments from {len(examples)} feedback examples")

    def get_shaped_reward(
        self,
        current_state: Dict,
        next_state: Dict,
    ) -> float:
        """Get reward shaping term for faster learning."""
        # Potential-based reward shaping
        current_potential = self._compute_state_potential(current_state)
        next_potential = self._compute_state_potential(next_state)

        # Shaping reward is the difference in potentials (with discount)
        gamma = 0.99
        shaping = gamma * next_potential - current_potential

        return float(shaping)

    def _compute_state_potential(self, state: Dict) -> float:
        """Compute potential function for a state (for reward shaping)."""
        # Potential based on knowledge state and engagement
        knowledge_state = state.get("knowledge_state", {})
        engagement = state.get("engagement_level", 0.5)

        # Average knowledge mastery
        if knowledge_state:
            avg_mastery = np.mean(list(knowledge_state.values()))
        else:
            avg_mastery = 0.0

        # Combined potential
        potential = 0.7 * avg_mastery + 0.3 * engagement

        return float(potential)
