"""
Experience Buffer

Store and sample experiences for RL training.
"""
import logging
from typing import Dict, Any, List, Optional
from collections import deque
import random
import numpy as np

logger = logging.getLogger(__name__)


class ExperienceBuffer:
    """
    Replay buffer for RL experiences.

    Stores (state, action, reward, next_state, done) tuples.
    Supports both uniform and prioritized experience replay.

    Usage:
        buffer = ExperienceBuffer(capacity=10000)
        buffer.add(state, action, reward, next_state, done)
        batch = buffer.sample(batch_size=32)
    """

    def __init__(
        self,
        capacity: int = 10000,
        prioritized: bool = False,
        alpha: float = 0.6,  # Prioritization exponent
        beta: float = 0.4,   # Importance sampling exponent
        beta_increment: float = 0.001,
    ):
        self.capacity = capacity
        self.prioritized = prioritized
        self.alpha = alpha
        self.beta = beta
        self.beta_increment = beta_increment

        # Storage
        self._buffer: deque = deque(maxlen=capacity)
        self._priorities: deque = deque(maxlen=capacity) if prioritized else None

        # Statistics
        self._total_added = 0
        self._total_sampled = 0

        logger.info(
            f"ExperienceBuffer initialized with capacity={capacity}, "
            f"prioritized={prioritized}"
        )

    def add(
        self,
        state: Dict,
        action: int,
        reward: float,
        next_state: Dict,
        done: bool,
        td_error: Optional[float] = None,
    ):
        """Add experience to buffer."""
        experience = {
            "state": state,
            "action": action,
            "reward": reward,
            "next_state": next_state,
            "done": done,
        }

        self._buffer.append(experience)

        if self.prioritized:
            # Set initial priority (max priority for new experiences)
            if td_error is not None:
                priority = (abs(td_error) + 1e-6) ** self.alpha
            else:
                max_priority = max(self._priorities) if self._priorities else 1.0
                priority = max_priority
            self._priorities.append(priority)

        self._total_added += 1

    def add_batch(
        self,
        experiences: List[Dict],
    ):
        """Add multiple experiences at once."""
        for exp in experiences:
            self.add(
                state=exp.get("state", {}),
                action=exp.get("action", 0),
                reward=exp.get("reward", 0.0),
                next_state=exp.get("next_state", {}),
                done=exp.get("done", False),
                td_error=exp.get("td_error"),
            )

    def sample(
        self,
        batch_size: int = 32,
    ) -> List[Dict]:
        """Sample batch of experiences."""
        if len(self._buffer) == 0:
            return []

        batch_size = min(batch_size, len(self._buffer))

        if self.prioritized:
            # Prioritized experience replay
            priorities = np.array(list(self._priorities))
            probabilities = priorities / priorities.sum()

            indices = np.random.choice(
                len(self._buffer),
                size=batch_size,
                replace=False,
                p=probabilities
            )

            # Importance sampling weights
            weights = (len(self._buffer) * probabilities[indices]) ** (-self.beta)
            weights = weights / weights.max()

            # Increment beta toward 1
            self.beta = min(1.0, self.beta + self.beta_increment)

            batch = []
            for i, idx in enumerate(indices):
                exp = dict(self._buffer[idx])
                exp["weight"] = float(weights[i])
                exp["index"] = int(idx)
                batch.append(exp)
        else:
            # Uniform sampling
            indices = random.sample(range(len(self._buffer)), batch_size)
            batch = [dict(self._buffer[i]) for i in indices]
            for exp in batch:
                exp["weight"] = 1.0

        self._total_sampled += batch_size
        return batch

    def update_priorities(
        self,
        indices: List[int],
        td_errors: List[float],
    ):
        """Update priorities for sampled experiences (for prioritized replay)."""
        if not self.prioritized:
            return

        for idx, td_error in zip(indices, td_errors):
            if 0 <= idx < len(self._priorities):
                self._priorities[idx] = (abs(td_error) + 1e-6) ** self.alpha

    def clear(self):
        """Clear buffer."""
        self._buffer.clear()
        if self._priorities:
            self._priorities.clear()
        logger.info("ExperienceBuffer cleared")

    def get_all(self) -> List[Dict]:
        """Get all experiences in buffer."""
        return list(self._buffer)

    def get_statistics(self) -> Dict[str, Any]:
        """Get buffer statistics."""
        return {
            "capacity": self.capacity,
            "current_size": len(self._buffer),
            "total_added": self._total_added,
            "total_sampled": self._total_sampled,
            "prioritized": self.prioritized,
            "beta": self.beta if self.prioritized else None,
        }

    def __len__(self) -> int:
        return len(self._buffer)

    def is_ready(self, min_size: int = 100) -> bool:
        """Check if buffer has enough experiences for training."""
        return len(self._buffer) >= min_size

    # ── persistence helpers (S11.1) ──────────────────────────────────────

    async def save_to_store(self, redis_store: "Any", pg_store: "Any" = None) -> int:
        """Flush current buffer to Redis (hot) and optionally move old
        entries to PostgreSQL (cold).  Returns total persisted count."""
        from datetime import datetime, timezone

        all_exp = list(self._buffer)
        if not all_exp:
            return 0

        persisted = 0

        # Push all to Redis hot buffer
        if redis_store and redis_store.available:
            persisted = await redis_store.push_experiences(all_exp)

        # Move entries > 24 h old into cold PG storage
        if pg_store and pg_store.available and redis_store and redis_store.available:
            from datetime import timedelta

            cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
            cold: list = []
            hot: list = []
            for exp in all_exp:
                ts = exp.get("_ts")
                if ts and datetime.fromisoformat(str(ts)) < cutoff:
                    cold.append(exp)
                else:
                    hot.append(exp)
            if cold:
                await pg_store.store_experiences(cold)

        logger.info("Buffer persisted: %d experiences", persisted)
        return persisted

    async def load_from_store(self, redis_store: "Any") -> int:
        """Re-hydrate buffer from Redis on startup.  Returns loaded count."""
        if not redis_store or not redis_store.available:
            return 0
        experiences = await redis_store.get_all_experiences()
        for exp in experiences:
            self.add(
                state=exp.get("state", {}),
                action=exp.get("action", 0),
                reward=exp.get("reward", 0.0),
                next_state=exp.get("next_state", {}),
                done=exp.get("done", False),
            )
        logger.info("Buffer rehydrated: %d experiences from Redis", len(experiences))
        return len(experiences)
