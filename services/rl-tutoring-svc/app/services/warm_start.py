"""
Warm-Start Training Data Generator (S11.3)

Produces synthetic RL experiences so the Q-learner starts with a
sensible initial policy instead of random exploration.

Two strategies:
1. **BKT-based**: Convert existing Bayesian Knowledge Tracing mastery
   data into (state, action, reward, next_state) tuples.
2. **Curriculum-based**: Use pedagogical rules from SafetyMonitor
   fallback actions to pre-train the policy on "known-good" actions.
"""

import logging
import random
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

# Action types mirror ActionSelector.ACTION_TYPES
_ACTION_TYPES = [
    "hint", "question", "explanation", "practice", "review",
    "skip", "encourage", "challenge", "simplify", "elaborate",
]

# Curriculum rules: mapping (mastery_bucket, engagement_bucket) → best action
_CURRICULUM_RULES: Dict[str, Dict[str, str]] = {
    "low": {       # mastery < 0.4
        "low": "simplify",
        "medium": "explanation",
        "high": "practice",
    },
    "medium": {    # 0.4 ≤ mastery < 0.75
        "low": "encourage",
        "medium": "practice",
        "high": "challenge",
    },
    "high": {      # mastery ≥ 0.75
        "low": "review",
        "medium": "challenge",
        "high": "skip",
    },
}


def _mastery_bucket(mastery: float) -> str:
    if mastery < 0.4:
        return "low"
    if mastery < 0.75:
        return "medium"
    return "high"


def _engagement_bucket(eng: float) -> str:
    if eng < 0.35:
        return "low"
    if eng < 0.7:
        return "medium"
    return "high"


def _action_index(action_type: str) -> int:
    try:
        return _ACTION_TYPES.index(action_type)
    except ValueError:
        return 2  # default to "explanation"


def _reward_for_rule(mastery: float, engagement: float, action_type: str) -> float:
    """Heuristic reward based on how well the action matches the
    curriculum rule for the current mastery/engagement bucket."""
    expected = _CURRICULUM_RULES[_mastery_bucket(mastery)][_engagement_bucket(engagement)]
    if action_type == expected:
        return 0.8 + random.uniform(-0.1, 0.1)
    # Partial credit for related actions
    if action_type in ("explanation", "practice", "hint"):
        return 0.3 + random.uniform(-0.1, 0.1)
    return -0.2 + random.uniform(-0.1, 0.1)


def _make_state(mastery: float, engagement: float, time_in_session: float = 300) -> Dict[str, Any]:
    """Create a minimal state dict that StateEncoder can consume."""
    # 5 knowledge dimensions spread around the mastery value
    knowledge_state = {}
    for i in range(5):
        jitter = random.uniform(-0.1, 0.1)
        knowledge_state[f"skill_{i}"] = max(0.0, min(1.0, mastery + jitter))

    return {
        "knowledge_state": knowledge_state,
        "recent_performance": [mastery + random.uniform(-0.1, 0.1) for _ in range(5)],
        "engagement_level": engagement,
        "time_in_session": time_in_session,
    }


# ── Public API ───────────────────────────────────────────────────────────

def generate_curriculum_experiences(num_experiences: int = 500) -> List[Dict[str, Any]]:
    """Generate synthetic experiences from pedagogical curriculum rules.

    Returns a list of experience dicts suitable for
    ``ExperienceBuffer.add_batch()``.
    """
    experiences: List[Dict[str, Any]] = []
    mastery_range = np.linspace(0.05, 0.95, 20)
    engagement_range = np.linspace(0.1, 0.95, 10)

    for _ in range(num_experiences):
        mastery = float(random.choice(mastery_range))
        engagement = float(random.choice(engagement_range))
        time_in_session = random.uniform(60, 1800)

        # Determine "correct" action from curriculum rules
        action_type = _CURRICULUM_RULES[_mastery_bucket(mastery)][_engagement_bucket(engagement)]
        action_idx = _action_index(action_type)
        reward = _reward_for_rule(mastery, engagement, action_type)

        state = _make_state(mastery, engagement, time_in_session)

        # Next state: slight mastery improvement if reward was positive
        delta = 0.05 if reward > 0 else -0.02
        next_mastery = max(0.0, min(1.0, mastery + delta))
        next_engagement = max(0.0, min(1.0, engagement + random.uniform(-0.05, 0.05)))
        next_state = _make_state(next_mastery, next_engagement, time_in_session + 30)

        experiences.append({
            "state": state,
            "action": action_idx,
            "reward": reward,
            "next_state": next_state,
            "done": False,
        })

    logger.info("Generated %d curriculum warm-start experiences", len(experiences))
    return experiences


def generate_bkt_experiences(
    bkt_data: List[Dict[str, Any]],
    default_engagement: float = 0.6,
) -> List[Dict[str, Any]]:
    """Convert BKT mastery history into RL experiences.

    ``bkt_data`` is a list of dicts with at least:
        - ``learner_id``
        - ``skill_id``
        - ``mastery_before`` (0-1)
        - ``mastery_after`` (0-1)
        - ``correct`` (bool)
        - ``time_spent`` (seconds, optional)

    Each BKT observation generates one experience.
    """
    experiences: List[Dict[str, Any]] = []

    for entry in bkt_data:
        mastery_before = entry.get("mastery_before", 0.5)
        mastery_after = entry.get("mastery_after", mastery_before)
        correct = entry.get("correct", True)
        time_spent = entry.get("time_spent", 120)

        engagement = default_engagement
        state = _make_state(mastery_before, engagement, time_spent)

        # Infer action: if mastery was low and learner got it right → explanation worked
        if mastery_before < 0.4:
            action_type = "explanation" if correct else "simplify"
        elif mastery_before < 0.75:
            action_type = "practice" if correct else "hint"
        else:
            action_type = "challenge" if correct else "review"

        action_idx = _action_index(action_type)

        # Reward = learning gain + correctness bonus
        learning_gain = mastery_after - mastery_before
        correctness_bonus = 0.3 if correct else -0.2
        reward = float(np.clip(learning_gain * 2 + correctness_bonus, -1.0, 1.0))

        next_state = _make_state(mastery_after, engagement, time_spent + 30)

        experiences.append({
            "state": state,
            "action": action_idx,
            "reward": reward,
            "next_state": next_state,
            "done": False,
        })

    logger.info("Generated %d BKT warm-start experiences from %d records", len(experiences), len(bkt_data))
    return experiences


def warm_start_policy(
    policy_learner: Any,
    experience_buffer: Any,
    num_curriculum: int = 500,
    bkt_data: Optional[List[Dict]] = None,
    train_epochs: int = 20,
) -> Dict[str, Any]:
    """Run full warm-start: generate experiences, load into buffer, train.

    Returns a summary dict with counts and training stats.
    """
    # 1. Curriculum-based experiences
    curriculum_exps = generate_curriculum_experiences(num_curriculum)
    experience_buffer.add_batch(curriculum_exps)

    # 2. BKT-based experiences (if available)
    bkt_exps: List[Dict] = []
    if bkt_data:
        bkt_exps = generate_bkt_experiences(bkt_data)
        experience_buffer.add_batch(bkt_exps)

    # 3. Train
    total_exps = len(curriculum_exps) + len(bkt_exps)
    batch_size = min(64, total_exps)
    if total_exps >= batch_size:
        batch = experience_buffer.sample(batch_size)
        policy_learner.train(batch, epochs=train_epochs)

    summary = {
        "curriculum_experiences": len(curriculum_exps),
        "bkt_experiences": len(bkt_exps),
        "total_experiences": total_exps,
        "training_steps_after": policy_learner.training_steps,
        "buffer_size": len(experience_buffer),
    }
    logger.info("Warm-start complete: %s", summary)
    return summary
