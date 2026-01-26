"""
Experience Buffer

Store and sample experiences for RL training.
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class ExperienceBuffer:
    """
    Replay buffer for RL experiences.
    
    Stores (state, action, reward, next_state, done) tuples.
    
    Usage:
        buffer = ExperienceBuffer(capacity=10000)
        buffer.add(state, action, reward, next_state, done)
        batch = buffer.sample(batch_size=32)
    """
    
    def __init__(
        self,
        capacity: int = 10000,
        prioritized: bool = False,
    ):
        self.capacity = capacity
        self.prioritized = prioritized
        logger.info(f"ExperienceBuffer initialized with capacity={capacity}")
    
    def add(
        self,
        state: Dict,
        action: int,
        reward: float,
        next_state: Dict,
        done: bool,
    ):
        """Add experience to buffer."""
        raise NotImplementedError()
    
    def sample(
        self,
        batch_size: int = 32,
    ) -> List[Dict]:
        """Sample batch of experiences."""
        raise NotImplementedError()
    
    def clear(self):
        """Clear buffer."""
        raise NotImplementedError()
    
    def __len__(self) -> int:
        raise NotImplementedError()
