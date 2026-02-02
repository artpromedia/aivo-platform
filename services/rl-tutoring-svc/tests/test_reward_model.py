"""
Tests for Reward Model
"""
import numpy as np
import pytest

from app.models.reward_model import RewardModel, RewardComponents


class TestRewardModel:
    """Test suite for RewardModel."""

    def test_init_default(self):
        """Test default initialization."""
        model = RewardModel()
        assert model.learning_weight == 0.5
        assert model.engagement_weight == 0.3
        assert model.efficiency_weight == 0.2

    def test_init_custom_weights(self):
        """Test custom weight initialization."""
        model = RewardModel(
            learning_weight=0.4,
            engagement_weight=0.4,
            efficiency_weight=0.2,
        )
        assert model.learning_weight == 0.4
        assert model.engagement_weight == 0.4

    def test_compute_basic(self):
        """Test basic reward computation."""
        model = RewardModel()
        state = {}
        action = {"action_type": "explanation"}
        outcome = {"correctness": 0.8}
        reward = model.compute(state, action, outcome)
        assert isinstance(reward, RewardComponents)
        assert hasattr(reward, "total")
        assert -1.0 <= reward.total <= 1.0

    def test_compute_perfect_outcome(self):
        """Test reward for perfect outcome."""
        model = RewardModel()
        state = {"engagement_level": 0.8}
        action = {"action_type": "explanation"}
        outcome = {
            "correctness": 1.0,
            "engagement": 0.9,
            "time": 60,
            "expected_time": 60,
        }
        reward = model.compute(state, action, outcome)
        assert reward.total > 0  # Should be positive

    def test_compute_poor_outcome(self):
        """Test reward for poor outcome."""
        model = RewardModel()
        state = {"engagement_level": 0.3}
        action = {"action_type": "explanation"}
        outcome = {
            "correctness": 0.1,
            "engagement": 0.1,
            "time": 200,
            "expected_time": 60,
        }
        reward = model.compute(state, action, outcome)
        assert reward.total < 0.5  # Should be low

    def test_learning_gain_component(self):
        """Test learning gain computation."""
        model = RewardModel()
        state = {"knowledge_state": {"math": 0.5}}
        outcome = {
            "correctness": 1.0,
            "new_knowledge_state": {"math": 0.7},
        }
        reward = model._compute_learning_gain(state, outcome)
        assert reward > 0.5  # Should show positive learning

    def test_learning_gain_mastery_bonus(self):
        """Test mastery achievement bonus."""
        model = RewardModel()
        state = {"knowledge_state": {"math": 0.75}}
        outcome = {
            "correctness": 1.0,
            "new_knowledge_state": {"math": 0.85},  # Crosses 0.8 threshold
        }
        reward = model._compute_learning_gain(state, outcome)
        # Should include mastery bonus
        assert reward > 0.6

    def test_engagement_reward_improvement(self):
        """Test engagement improvement reward."""
        model = RewardModel()
        state = {"engagement_level": 0.4}
        outcome = {"engagement": 0.7}
        reward = model._compute_engagement_reward(state, outcome)
        assert reward > 0  # Improvement should give positive reward

    def test_engagement_reward_decline(self):
        """Test engagement decline penalty."""
        model = RewardModel()
        state = {"engagement_level": 0.7}
        outcome = {"engagement": 0.3}
        reward = model._compute_engagement_reward(state, outcome)
        assert reward < 0  # Decline should be penalized

    def test_engagement_very_low_penalty(self):
        """Test very low engagement penalty."""
        model = RewardModel()
        state = {"engagement_level": 0.3}
        outcome = {"engagement": 0.15}
        reward = model._compute_engagement_reward(state, outcome)
        assert reward < -0.2  # Should include extra penalty

    def test_efficiency_good_pace(self):
        """Test efficiency reward for good pace."""
        model = RewardModel()
        state = {}
        action = {}
        outcome = {
            "time": 55,
            "expected_time": 60,
            "hints_used": 0,
        }
        reward = model._compute_efficiency_reward(state, action, outcome)
        assert reward > 0  # Good pace should be rewarded

    def test_efficiency_too_fast(self):
        """Test efficiency reward for being too fast."""
        model = RewardModel()
        state = {}
        action = {}
        outcome = {
            "time": 20,
            "expected_time": 60,
            "hints_used": 0,
        }
        reward = model._compute_efficiency_reward(state, action, outcome)
        # Too fast might mean guessing
        assert reward < 0.3

    def test_efficiency_too_slow(self):
        """Test efficiency reward for being too slow."""
        model = RewardModel()
        state = {}
        action = {}
        outcome = {
            "time": 180,
            "expected_time": 60,
            "hints_used": 0,
        }
        reward = model._compute_efficiency_reward(state, action, outcome)
        assert reward < 0  # Too slow should be penalized

    def test_efficiency_many_hints(self):
        """Test efficiency penalty for using many hints."""
        model = RewardModel()
        state = {}
        action = {}
        outcome = {
            "time": 60,
            "expected_time": 60,
            "hints_used": 5,
        }
        reward = model._compute_efficiency_reward(state, action, outcome)
        # Many hints should reduce efficiency
        assert reward < 0.3

    def test_reward_components_dataclass(self):
        """Test RewardComponents dataclass."""
        components = RewardComponents(
            learning_gain=0.5,
            engagement=0.3,
            efficiency=0.2,
            total=0.35,
        )
        assert components.learning_gain == 0.5
        assert components.engagement == 0.3
        assert components.efficiency == 0.2
        assert components.total == 0.35

    def test_reward_clamping(self):
        """Test reward is clamped to [-1, 1]."""
        model = RewardModel()
        # Extreme positive case
        state = {
            "knowledge_state": {"math": 0.5},
            "engagement_level": 0.5,
        }
        outcome = {
            "correctness": 1.0,
            "new_knowledge_state": {"math": 1.0},
            "engagement": 1.0,
            "time": 60,
            "expected_time": 60,
        }
        reward = model.compute(state, {"action_type": "test"}, outcome)
        assert -1.0 <= reward.total <= 1.0

    def test_learn_from_feedback(self):
        """Test learning from human feedback."""
        model = RewardModel()
        examples = [
            {"action_type": "hint", "human_rating": 0.8, "computed_reward": 0.6},
            {"action_type": "hint", "human_rating": 0.9, "computed_reward": 0.5},
        ]
        model.learn_from_feedback(examples)
        assert len(model._feedback_examples) == 2

    def test_no_knowledge_state(self):
        """Test computation without knowledge state."""
        model = RewardModel()
        state = {}
        outcome = {"correctness": 0.7}
        reward = model._compute_learning_gain(state, outcome)
        # Should still work
        assert isinstance(reward, float)

    def test_empty_outcome(self):
        """Test computation with minimal outcome."""
        model = RewardModel()
        state = {}
        action = {}
        outcome = {}
        reward = model.compute(state, action, outcome)
        assert isinstance(reward, RewardComponents)
