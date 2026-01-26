"""
Reward Model

Model rewards for tutoring actions.
"""
import logging
from dataclasses import dataclass
from typing import Dict, Any, List

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
        logger.info("RewardModel initialized")
    
    def compute(
        self,
        state: Dict[str, Any],
        action: Dict[str, Any],
        outcome: Dict[str, Any],
    ) -> RewardComponents:
        """Compute reward for a tutoring interaction."""
        raise NotImplementedError()
    
    def learn_from_feedback(
        self,
        examples: List[Dict],
    ):
        """Learn reward function from human feedback."""
        raise NotImplementedError()
    
    def get_shaped_reward(
        self,
        current_state: Dict,
        next_state: Dict,
    ) -> float:
        """Get reward shaping term for faster learning."""
        raise NotImplementedError()
