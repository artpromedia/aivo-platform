"""
Policy Learner

Learn tutoring policies using RL.
"""
import logging
import json
import os
from typing import Dict, Any, List, Optional
import numpy as np

logger = logging.getLogger(__name__)


class PolicyLearner:
    """
    Learn tutoring policies using reinforcement learning.

    Implements a tabular Q-learning approach with function approximation
    for continuous state spaces. Can be upgraded to DQN/PPO for production.

    Algorithms supported:
    - q_learning: Simple Q-learning with discretized states
    - linear_q: Linear function approximation
    - epsilon_greedy: Epsilon-greedy exploration

    Usage:
        learner = PolicyLearner(algorithm="q_learning")
        learner.train(experiences)
        action = learner.predict(state)
    """

    def __init__(
        self,
        algorithm: str = "q_learning",
        state_dim: int = 64,
        action_dim: int = 10,
        learning_rate: float = 0.1,
        discount_factor: float = 0.95,
        epsilon: float = 0.1,
        epsilon_decay: float = 0.995,
        min_epsilon: float = 0.01,
    ):
        self.algorithm = algorithm
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.epsilon = epsilon
        self.epsilon_decay = epsilon_decay
        self.min_epsilon = min_epsilon

        # Initialize Q-function approximation (linear weights)
        # For each action, we have weights for state features
        self.q_weights = np.random.randn(action_dim, state_dim) * 0.01
        self.q_bias = np.zeros(action_dim)

        # Training statistics
        self.training_steps = 0
        self.total_reward = 0.0
        self.episode_rewards: List[float] = []

        logger.info(
            f"PolicyLearner initialized with {algorithm}, "
            f"state_dim={state_dim}, action_dim={action_dim}"
        )

    def _state_to_features(self, state: Dict[str, Any]) -> np.ndarray:
        """Convert state dict to feature vector."""
        if isinstance(state, np.ndarray):
            features = state
        elif isinstance(state, dict):
            # Extract features from state dict
            features = []

            # Knowledge state
            knowledge = state.get("knowledge_state", {})
            knowledge_values = list(knowledge.values())[:20]
            features.extend(knowledge_values + [0] * (20 - len(knowledge_values)))

            # Performance history
            performance = state.get("recent_performance", [])[:10]
            features.extend(performance + [0] * (10 - len(performance)))

            # Engagement and session features
            features.append(state.get("engagement_level", 0.5))
            features.append(state.get("time_in_session", 0) / 3600.0)

            features = np.array(features, dtype=np.float32)
        else:
            features = np.zeros(self.state_dim, dtype=np.float32)

        # Pad or truncate to state_dim
        if len(features) < self.state_dim:
            features = np.pad(features, (0, self.state_dim - len(features)))
        elif len(features) > self.state_dim:
            features = features[:self.state_dim]

        return features.astype(np.float32)

    def _compute_q_values(self, state_features: np.ndarray) -> np.ndarray:
        """Compute Q-values for all actions given state features."""
        # Linear Q-function: Q(s, a) = w_a · s + b_a
        q_values = np.dot(self.q_weights, state_features) + self.q_bias
        return q_values

    def train(
        self,
        experiences: List[Dict],
        epochs: int = 10,
    ):
        """Train policy on collected experiences."""
        if not experiences:
            logger.warning("No experiences provided for training")
            return

        logger.info(f"Training on {len(experiences)} experiences for {epochs} epochs")

        for epoch in range(epochs):
            epoch_loss = 0.0
            np.random.shuffle(experiences)

            for exp in experiences:
                state = self._state_to_features(exp.get("state", {}))
                action = exp.get("action", 0)
                reward = exp.get("reward", 0.0)
                next_state = self._state_to_features(exp.get("next_state", {}))
                done = exp.get("done", False)

                # Compute current Q-value
                current_q = self._compute_q_values(state)

                # Compute target Q-value
                if done:
                    target = reward
                else:
                    next_q = self._compute_q_values(next_state)
                    target = reward + self.discount_factor * np.max(next_q)

                # Compute TD error
                td_error = target - current_q[action]
                epoch_loss += td_error ** 2

                # Update weights for the taken action (gradient descent)
                self.q_weights[action] += self.learning_rate * td_error * state
                self.q_bias[action] += self.learning_rate * td_error

                self.training_steps += 1
                self.total_reward += reward

            # Decay epsilon
            self.epsilon = max(self.min_epsilon, self.epsilon * self.epsilon_decay)

            avg_loss = epoch_loss / len(experiences)
            logger.debug(f"Epoch {epoch + 1}/{epochs}, Loss: {avg_loss:.4f}, Epsilon: {self.epsilon:.4f}")

        logger.info(
            f"Training complete. Total steps: {self.training_steps}, "
            f"Final epsilon: {self.epsilon:.4f}"
        )

    def predict(
        self,
        state: Dict[str, Any],
        deterministic: bool = False,
    ) -> int:
        """Predict best action for state."""
        state_features = self._state_to_features(state)
        q_values = self._compute_q_values(state_features)

        if deterministic or np.random.random() > self.epsilon:
            # Exploit: choose best action
            action = int(np.argmax(q_values))
        else:
            # Explore: choose random action
            action = np.random.randint(0, self.action_dim)

        return action

    def predict_with_confidence(
        self,
        state: Dict[str, Any],
    ) -> tuple:
        """Predict action with confidence score."""
        state_features = self._state_to_features(state)
        q_values = self._compute_q_values(state_features)

        # Softmax to get action probabilities
        exp_q = np.exp(q_values - np.max(q_values))  # Numerical stability
        probs = exp_q / np.sum(exp_q)

        action = int(np.argmax(q_values))
        confidence = float(probs[action])

        return action, confidence

    def get_action_values(self, state: Dict[str, Any]) -> Dict[int, float]:
        """Get Q-values for all actions in a state."""
        state_features = self._state_to_features(state)
        q_values = self._compute_q_values(state_features)
        return {i: float(q) for i, q in enumerate(q_values)}

    def save(self, path: str):
        """Save trained policy."""
        os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)

        policy_data = {
            "algorithm": self.algorithm,
            "state_dim": self.state_dim,
            "action_dim": self.action_dim,
            "learning_rate": self.learning_rate,
            "discount_factor": self.discount_factor,
            "epsilon": self.epsilon,
            "q_weights": self.q_weights.tolist(),
            "q_bias": self.q_bias.tolist(),
            "training_steps": self.training_steps,
            "total_reward": self.total_reward,
        }

        with open(path, "w") as f:
            json.dump(policy_data, f)

        logger.info(f"Policy saved to {path}")

    def load(self, path: str):
        """Load trained policy."""
        if not os.path.exists(path):
            logger.warning(f"Policy file not found: {path}")
            return False

        with open(path, "r") as f:
            policy_data = json.load(f)

        self.algorithm = policy_data.get("algorithm", self.algorithm)
        self.state_dim = policy_data.get("state_dim", self.state_dim)
        self.action_dim = policy_data.get("action_dim", self.action_dim)
        self.learning_rate = policy_data.get("learning_rate", self.learning_rate)
        self.discount_factor = policy_data.get("discount_factor", self.discount_factor)
        self.epsilon = policy_data.get("epsilon", self.epsilon)
        self.q_weights = np.array(policy_data.get("q_weights", self.q_weights))
        self.q_bias = np.array(policy_data.get("q_bias", self.q_bias))
        self.training_steps = policy_data.get("training_steps", 0)
        self.total_reward = policy_data.get("total_reward", 0.0)

        logger.info(f"Policy loaded from {path}, training_steps={self.training_steps}")
        return True

    def get_statistics(self) -> Dict[str, Any]:
        """Get training statistics."""
        return {
            "algorithm": self.algorithm,
            "training_steps": self.training_steps,
            "total_reward": self.total_reward,
            "epsilon": self.epsilon,
            "average_q_magnitude": float(np.mean(np.abs(self.q_weights))),
        }
