"""
Model checkpoint persistence for PolicyLearner.

Wraps the existing JSON-based save/load with:
- PostgreSQL checkpoint storage (via PgStore)
- Auto-save every N training steps
- Load-latest-on-startup
"""

import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

CHECKPOINT_INTERVAL = int(os.getenv("RL_CHECKPOINT_INTERVAL", "100"))


class CheckpointStore:
    """Manages model checkpoint lifecycle."""

    def __init__(self, pg_store: Any = None) -> None:
        self._pg = pg_store
        self._last_saved_step = 0

    async def maybe_save(self, policy_learner: Any) -> bool:
        """Save checkpoint if enough steps have elapsed since last save."""
        steps = getattr(policy_learner, "training_steps", 0)
        if steps - self._last_saved_step < CHECKPOINT_INTERVAL:
            return False
        return await self.force_save(policy_learner)

    async def force_save(self, policy_learner: Any) -> bool:
        """Unconditionally persist the current policy weights."""
        steps = getattr(policy_learner, "training_steps", 0)
        data = _policy_to_dict(policy_learner)
        if self._pg is not None and self._pg.available:
            await self._pg.save_checkpoint(steps, data)
            self._last_saved_step = steps
            logger.info("Checkpoint persisted at step %d", steps)
            return True
        # Fallback: save locally
        try:
            policy_learner.save("/tmp/rl_policy_checkpoint.json")
            self._last_saved_step = steps
            return True
        except Exception as exc:
            logger.warning("Local checkpoint save failed: %s", exc)
            return False

    async def load_latest(self, policy_learner: Any) -> bool:
        """Restore the latest checkpoint into *policy_learner*."""
        if self._pg is not None and self._pg.available:
            data = await self._pg.load_latest_checkpoint()
            if data:
                _dict_to_policy(data, policy_learner)
                self._last_saved_step = getattr(policy_learner, "training_steps", 0)
                logger.info(
                    "Policy restored from PG checkpoint (step %d)",
                    self._last_saved_step,
                )
                return True
        # Fallback: try local file
        return policy_learner.load("/tmp/rl_policy_checkpoint.json")


# ── serialization helpers ────────────────────────────────────────────────

def _policy_to_dict(pl: Any) -> Dict[str, Any]:
    import numpy as np

    return {
        "algorithm": pl.algorithm,
        "state_dim": pl.state_dim,
        "action_dim": pl.action_dim,
        "learning_rate": pl.learning_rate,
        "discount_factor": pl.discount_factor,
        "epsilon": pl.epsilon,
        "q_weights": pl.q_weights.tolist(),
        "q_bias": pl.q_bias.tolist(),
        "training_steps": pl.training_steps,
        "total_reward": pl.total_reward,
    }


def _dict_to_policy(data: Dict[str, Any], pl: Any) -> None:
    import numpy as np

    pl.algorithm = data.get("algorithm", pl.algorithm)
    pl.state_dim = data.get("state_dim", pl.state_dim)
    pl.action_dim = data.get("action_dim", pl.action_dim)
    pl.learning_rate = data.get("learning_rate", pl.learning_rate)
    pl.discount_factor = data.get("discount_factor", pl.discount_factor)
    pl.epsilon = data.get("epsilon", pl.epsilon)
    pl.q_weights = np.array(data["q_weights"]) if "q_weights" in data else pl.q_weights
    pl.q_bias = np.array(data["q_bias"]) if "q_bias" in data else pl.q_bias
    pl.training_steps = data.get("training_steps", 0)
    pl.total_reward = data.get("total_reward", 0.0)
