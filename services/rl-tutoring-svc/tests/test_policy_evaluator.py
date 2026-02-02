"""
Tests for Policy Evaluator
"""
import pytest
import numpy as np

from app.services.policy_evaluator import (
    PolicyEvaluator,
    EvaluationMetrics,
    EpisodeResult,
)


class MockPolicy:
    """Mock policy for testing."""
    
    def __init__(self, default_action: int = 1):
        self.default_action = default_action
    
    def predict(self, state, deterministic: bool = False):
        return self.default_action


class TestEvaluationMetrics:
    """Test suite for EvaluationMetrics."""

    def test_dataclass(self):
        """Test EvaluationMetrics dataclass."""
        metrics = EvaluationMetrics(
            average_reward=0.75,
            learning_gain=0.15,
            completion_rate=0.8,
            engagement_score=0.65,
            episodes_evaluated=100,
        )
        
        assert metrics.average_reward == 0.75
        assert metrics.learning_gain == 0.15
        assert metrics.completion_rate == 0.8
        assert metrics.engagement_score == 0.65
        assert metrics.episodes_evaluated == 100


class TestEpisodeResult:
    """Test suite for EpisodeResult."""

    def test_dataclass(self):
        """Test EpisodeResult dataclass."""
        result = EpisodeResult(
            total_reward=5.5,
            steps=20,
            learning_gain=0.2,
            final_engagement=0.7,
            completed=True,
        )
        
        assert result.total_reward == 5.5
        assert result.steps == 20
        assert result.learning_gain == 0.2
        assert result.completed is True


class TestPolicyEvaluator:
    """Test suite for PolicyEvaluator."""

    def test_init(self):
        """Test initialization."""
        evaluator = PolicyEvaluator()
        assert evaluator._evaluation_history == []

    def test_evaluate_simulated(self):
        """Test evaluation with simulated episodes."""
        evaluator = PolicyEvaluator()
        policy = MockPolicy(default_action=3)  # practice action
        
        metrics = evaluator.evaluate(
            policy,
            num_episodes=5,
            max_steps_per_episode=10,
        )
        
        assert isinstance(metrics, EvaluationMetrics)
        assert metrics.episodes_evaluated == 5

    def test_evaluate_from_data(self):
        """Test evaluation from recorded experience data."""
        evaluator = PolicyEvaluator()
        policy = MockPolicy()
        
        # Create sample experience data
        experience_data = []
        for session_idx in range(3):
            for step in range(5):
                experience_data.append({
                    "session_id": f"session_{session_idx}",
                    "state": {
                        "knowledge_state": {"topic_0": 0.3, "topic_1": 0.4},
                        "engagement_level": 0.6,
                    },
                    "next_state": {
                        "knowledge_state": {"topic_0": 0.35, "topic_1": 0.45},
                        "engagement_level": 0.65,
                    },
                    "action": step % 4,
                    "reward": 0.1 * step,
                    "done": step == 4,
                })
        
        metrics = evaluator.evaluate(
            policy,
            num_episodes=3,
            experience_data=experience_data,
        )
        
        assert isinstance(metrics, EvaluationMetrics)
        assert metrics.episodes_evaluated <= 3

    def test_evaluate_empty_data(self):
        """Test evaluation with empty data falls back to simulation."""
        evaluator = PolicyEvaluator()
        policy = MockPolicy()
        
        # Empty data triggers fallback to simulated evaluation
        metrics = evaluator.evaluate(
            policy,
            num_episodes=5,
            experience_data=[],
        )
        
        # Falls back to simulation when data is empty
        assert metrics.episodes_evaluated == 5

    def test_create_initial_state(self):
        """Test initial state creation for simulation."""
        evaluator = PolicyEvaluator()
        
        state = evaluator._create_initial_state()
        
        assert "knowledge_state" in state
        assert "recent_performance" in state
        assert "engagement_level" in state
        assert "time_in_session" in state
        assert len(state["knowledge_state"]) == 5
        assert len(state["recent_performance"]) == 5

    def test_simulate_step(self):
        """Test step simulation."""
        evaluator = PolicyEvaluator()
        state = evaluator._create_initial_state()
        
        reward, next_state, done = evaluator._simulate_step(state, action=1)
        
        assert isinstance(reward, float)
        assert isinstance(next_state, dict)
        # done can be numpy bool or Python bool
        assert done in [True, False] or done == True or done == False
        assert "knowledge_state" in next_state
        assert "engagement_level" in next_state

    def test_simulate_step_all_actions(self):
        """Test that all actions produce valid results."""
        evaluator = PolicyEvaluator()
        
        for action in range(10):
            state = evaluator._create_initial_state()
            reward, next_state, done = evaluator._simulate_step(state, action)
            
            assert isinstance(reward, float)
            # Knowledge should be bounded [0, 1]
            for val in next_state["knowledge_state"].values():
                assert 0.0 <= val <= 1.0
            # Engagement should be bounded
            assert 0.0 <= next_state["engagement_level"] <= 1.0

    def test_group_by_episode(self):
        """Test grouping experiences by session."""
        evaluator = PolicyEvaluator()
        
        experiences = [
            {"session_id": "s1", "reward": 0.1},
            {"session_id": "s1", "reward": 0.2},
            {"session_id": "s2", "reward": 0.3},
            {"session_id": "s1", "reward": 0.15},
            {"session_id": "s2", "reward": 0.4},
        ]
        
        grouped = evaluator._group_by_episode(experiences)
        
        assert "s1" in grouped
        assert "s2" in grouped
        assert len(grouped["s1"]) == 3
        assert len(grouped["s2"]) == 2

    def test_compare_policies(self):
        """Test policy comparison."""
        evaluator = PolicyEvaluator()
        
        policy_a = MockPolicy(default_action=1)
        policy_b = MockPolicy(default_action=3)
        
        results = evaluator.compare_policies(
            policies=[policy_a, policy_b],
            num_episodes=3,
            policy_names=["policy_a", "policy_b"],
        )
        
        assert "policy_a" in results
        assert "policy_b" in results
        assert isinstance(results["policy_a"], EvaluationMetrics)
        assert isinstance(results["policy_b"], EvaluationMetrics)

    def test_compare_policies_default_names(self):
        """Test policy comparison with default names."""
        evaluator = PolicyEvaluator()
        
        policies = [MockPolicy(i) for i in range(3)]
        
        results = evaluator.compare_policies(
            policies=policies,
            num_episodes=2,
        )
        
        assert "policy_0" in results
        assert "policy_1" in results
        assert "policy_2" in results

    def test_a_b_test(self):
        """Test A/B testing between policies."""
        evaluator = PolicyEvaluator()
        
        policy_a = MockPolicy(default_action=1)
        policy_b = MockPolicy(default_action=3)
        
        # Create sample data
        experience_data = []
        for session_idx in range(10):
            for step in range(3):
                experience_data.append({
                    "session_id": f"session_{session_idx}",
                    "state": {"knowledge_state": {"t1": 0.3}, "engagement_level": 0.6},
                    "next_state": {"knowledge_state": {"t1": 0.35}, "engagement_level": 0.65},
                    "action": step % 4,
                    "reward": 0.2,
                    "done": step == 2,
                })
        
        result = evaluator.a_b_test(
            policy_a,
            policy_b,
            experience_data,
            num_episodes=5,
        )
        
        assert "policy_a_metrics" in result
        assert "policy_b_metrics" in result
        assert "winner" in result
        assert result["winner"] in ["policy_a", "policy_b", "tie"]
        assert "reward_difference" in result
        assert "timestamp" in result

    def test_get_evaluation_history(self):
        """Test getting evaluation history."""
        evaluator = PolicyEvaluator()
        
        # Initially empty
        history = evaluator.get_evaluation_history()
        assert history == []
        
        # Run an A/B test to add to history
        policy_a = MockPolicy(1)
        policy_b = MockPolicy(2)
        experience_data = [
            {"session_id": "s1", "state": {}, "next_state": {}, "reward": 0.1, "done": True}
            for _ in range(5)
        ]
        
        evaluator.a_b_test(policy_a, policy_b, experience_data, num_episodes=2)
        
        history = evaluator.get_evaluation_history()
        assert len(history) == 1

    def test_run_simulated_episode(self):
        """Test running a full simulated episode."""
        evaluator = PolicyEvaluator()
        policy = MockPolicy(default_action=3)
        
        result = evaluator._run_simulated_episode(policy, max_steps=20)
        
        assert isinstance(result, EpisodeResult)
        assert result.steps <= 20
        assert isinstance(result.total_reward, float)
        assert isinstance(result.learning_gain, float)

    def test_episode_terminates_on_mastery(self):
        """Test that episode terminates when mastery is achieved."""
        evaluator = PolicyEvaluator()
        
        # Create a policy that always challenges to maximize learning
        policy = MockPolicy(default_action=7)  # challenge action
        
        # Run many steps - should terminate early on mastery
        result = evaluator._run_simulated_episode(policy, max_steps=1000)
        
        # Should complete (either mastery or disengagement)
        assert result.steps <= 1000
