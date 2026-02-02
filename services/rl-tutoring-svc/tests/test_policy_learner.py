"""
Tests for Policy Learner Model
"""
import json
import os
import tempfile

import numpy as np
import pytest

from app.models.policy_learner import PolicyLearner


class TestPolicyLearner:
    """Test suite for PolicyLearner."""

    def test_init_default(self):
        """Test default initialization."""
        learner = PolicyLearner()
        assert learner.algorithm == "q_learning"
        assert learner.state_dim == 64
        assert learner.action_dim == 10
        assert learner.learning_rate == 0.1
        assert learner.discount_factor == 0.95
        assert learner.epsilon == 0.1

    def test_init_custom(self):
        """Test custom initialization."""
        learner = PolicyLearner(
            algorithm="linear_q",
            state_dim=128,
            action_dim=5,
            learning_rate=0.05,
            epsilon=0.2,
        )
        assert learner.algorithm == "linear_q"
        assert learner.state_dim == 128
        assert learner.action_dim == 5
        assert learner.learning_rate == 0.05

    def test_q_weights_shape(self):
        """Test Q-weights shape."""
        learner = PolicyLearner(state_dim=32, action_dim=5)
        assert learner.q_weights.shape == (5, 32)
        assert learner.q_bias.shape == (5,)

    def test_state_to_features_dict(self):
        """Test converting state dict to features."""
        learner = PolicyLearner(state_dim=64)
        state = {
            "knowledge_state": {"math": 0.5, "reading": 0.6},
            "recent_performance": [0.7, 0.8],
            "engagement_level": 0.75,
            "time_in_session": 600,
        }
        features = learner._state_to_features(state)
        assert features.shape == (64,)
        assert features.dtype == np.float32

    def test_state_to_features_array(self):
        """Test converting array state to features."""
        learner = PolicyLearner(state_dim=64)
        state = np.random.randn(64).astype(np.float32)
        features = learner._state_to_features(state)
        assert features.shape == (64,)
        np.testing.assert_array_almost_equal(features, state)

    def test_state_to_features_padding(self):
        """Test feature padding for small states."""
        learner = PolicyLearner(state_dim=64)
        state = {"knowledge_state": {"math": 0.5}}  # Very small
        features = learner._state_to_features(state)
        assert features.shape == (64,)

    def test_compute_q_values(self):
        """Test Q-value computation."""
        learner = PolicyLearner(state_dim=32, action_dim=5)
        features = np.random.randn(32).astype(np.float32)
        q_values = learner._compute_q_values(features)
        assert q_values.shape == (5,)

    def test_predict_deterministic(self):
        """Test deterministic prediction."""
        learner = PolicyLearner(action_dim=5)
        learner.epsilon = 0.0  # No exploration
        state = {"knowledge_state": {"math": 0.5}}
        
        # Should always return same action
        actions = [learner.predict(state, deterministic=True) for _ in range(10)]
        assert len(set(actions)) == 1  # All same

    def test_predict_with_exploration(self):
        """Test prediction with exploration."""
        learner = PolicyLearner(action_dim=5)
        learner.epsilon = 1.0  # Always explore
        state = {"knowledge_state": {"math": 0.5}}
        
        # Should have some variation
        actions = [learner.predict(state, deterministic=False) for _ in range(50)]
        assert len(set(actions)) > 1  # Some variation expected

    def test_predict_with_confidence(self):
        """Test prediction with confidence score."""
        learner = PolicyLearner(action_dim=5)
        state = {"knowledge_state": {"math": 0.5}}
        action, confidence = learner.predict_with_confidence(state)
        
        assert 0 <= action < 5
        assert 0.0 <= confidence <= 1.0

    def test_get_action_values(self):
        """Test getting action values."""
        learner = PolicyLearner(action_dim=5)
        state = {"knowledge_state": {"math": 0.5}}
        values = learner.get_action_values(state)
        
        assert isinstance(values, dict)
        assert len(values) == 5
        assert all(isinstance(v, float) for v in values.values())

    def test_train_basic(self):
        """Test basic training."""
        learner = PolicyLearner(state_dim=32, action_dim=5)
        experiences = [
            {
                "state": {"knowledge_state": {"math": 0.5}},
                "action": 0,
                "reward": 0.5,
                "next_state": {"knowledge_state": {"math": 0.6}},
                "done": False,
            },
            {
                "state": {"knowledge_state": {"math": 0.6}},
                "action": 1,
                "reward": 0.8,
                "next_state": {"knowledge_state": {"math": 0.7}},
                "done": True,
            },
        ]
        initial_steps = learner.training_steps
        learner.train(experiences, epochs=5)
        assert learner.training_steps > initial_steps

    def test_train_empty(self):
        """Test training with empty experiences."""
        learner = PolicyLearner()
        initial_steps = learner.training_steps
        learner.train([], epochs=5)
        assert learner.training_steps == initial_steps  # No change

    def test_epsilon_decay(self):
        """Test epsilon decays during training."""
        learner = PolicyLearner(epsilon=0.5)
        experiences = [
            {"state": {}, "action": 0, "reward": 0.1, "next_state": {}, "done": False}
            for _ in range(10)
        ]
        initial_epsilon = learner.epsilon
        learner.train(experiences, epochs=5)
        assert learner.epsilon < initial_epsilon

    def test_epsilon_min(self):
        """Test epsilon doesn't go below minimum."""
        learner = PolicyLearner(epsilon=0.02, min_epsilon=0.01)
        experiences = [
            {"state": {}, "action": 0, "reward": 0.1, "next_state": {}, "done": False}
            for _ in range(100)
        ]
        learner.train(experiences, epochs=100)
        assert learner.epsilon >= learner.min_epsilon

    def test_save_and_load(self):
        """Test saving and loading policy."""
        learner = PolicyLearner(state_dim=32, action_dim=5)
        # Train a bit
        experiences = [
            {"state": {}, "action": i % 5, "reward": 0.1 * i, "next_state": {}, "done": False}
            for i in range(10)
        ]
        learner.train(experiences, epochs=2)
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            path = f.name
        
        try:
            learner.save(path)
            
            # Load into new learner
            new_learner = PolicyLearner(state_dim=32, action_dim=5)
            success = new_learner.load(path)
            
            assert success
            assert new_learner.training_steps == learner.training_steps
            np.testing.assert_array_almost_equal(
                new_learner.q_weights, learner.q_weights
            )
        finally:
            os.unlink(path)

    def test_load_nonexistent(self):
        """Test loading nonexistent file."""
        learner = PolicyLearner()
        success = learner.load("/nonexistent/path.json")
        assert not success

    def test_get_statistics(self):
        """Test getting statistics."""
        learner = PolicyLearner()
        stats = learner.get_statistics()
        
        assert "algorithm" in stats
        assert "training_steps" in stats
        assert "total_reward" in stats
        assert "epsilon" in stats
        assert "average_q_magnitude" in stats

    def test_training_updates_weights(self):
        """Test that training actually updates weights."""
        learner = PolicyLearner(state_dim=32, action_dim=5)
        initial_weights = learner.q_weights.copy()
        
        experiences = [
            {
                "state": {"knowledge_state": {f"t{i}": 0.5}},
                "action": i % 5,
                "reward": 1.0,
                "next_state": {"knowledge_state": {f"t{i}": 0.6}},
                "done": False,
            }
            for i in range(20)
        ]
        learner.train(experiences, epochs=10)
        
        # Weights should have changed
        assert not np.allclose(learner.q_weights, initial_weights)

    def test_done_state_handling(self):
        """Test handling of done states."""
        learner = PolicyLearner(state_dim=32, action_dim=5)
        experiences = [
            {
                "state": {},
                "action": 0,
                "reward": 1.0,
                "next_state": {},
                "done": True,
            },
        ]
        # Should not raise error
        learner.train(experiences, epochs=1)

    def test_negative_rewards(self):
        """Test handling negative rewards."""
        learner = PolicyLearner()
        experiences = [
            {"state": {}, "action": 0, "reward": -0.5, "next_state": {}, "done": False},
            {"state": {}, "action": 1, "reward": -1.0, "next_state": {}, "done": True},
        ]
        learner.train(experiences, epochs=5)
        assert learner.total_reward < 0
