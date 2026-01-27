"""
State Encoder

Encode learner state for RL policy.
"""
import logging
from typing import Dict, Any, List
import numpy as np

logger = logging.getLogger(__name__)


class StateEncoder:
    """
    Encode learner state for policy input.

    Encodes:
    - Knowledge state
    - Performance history
    - Engagement metrics
    - Session context

    Usage:
        encoder = StateEncoder()
        state_vector = encoder.encode(learner_state)
    """

    # Feature dimensions
    KNOWLEDGE_DIM = 20  # Max topics to track
    PERFORMANCE_HISTORY_LEN = 10
    ENGAGEMENT_DIM = 4
    SESSION_DIM = 4

    def __init__(self, state_dim: int = 64):
        self.state_dim = state_dim
        self._feature_names: List[str] = []
        self._build_feature_names()
        logger.info(f"StateEncoder initialized with dim={state_dim}")

    def _build_feature_names(self):
        """Build list of feature names for interpretability."""
        self._feature_names = []
        # Knowledge state features
        for i in range(self.KNOWLEDGE_DIM):
            self._feature_names.append(f"knowledge_topic_{i}")
        # Performance history features
        for i in range(self.PERFORMANCE_HISTORY_LEN):
            self._feature_names.append(f"perf_history_{i}")
        # Engagement features
        self._feature_names.extend([
            "engagement_level", "attention_score",
            "participation_rate", "frustration_indicator"
        ])
        # Session features
        self._feature_names.extend([
            "time_in_session", "items_completed",
            "help_requests", "session_progress"
        ])

    def encode(
        self,
        learner_state: Dict[str, Any],
    ) -> np.ndarray:
        """Encode learner state to vector."""
        features = []

        # 1. Encode knowledge state (Dict[str, float] -> fixed-size vector)
        knowledge_state = learner_state.get("knowledge_state", {})
        knowledge_vec = np.zeros(self.KNOWLEDGE_DIM)
        for i, (topic, mastery) in enumerate(knowledge_state.items()):
            if i >= self.KNOWLEDGE_DIM:
                break
            knowledge_vec[i] = float(mastery)
        features.extend(knowledge_vec.tolist())

        # 2. Encode performance history (List[float] -> fixed-size vector)
        recent_performance = learner_state.get("recent_performance", [])
        perf_vec = np.zeros(self.PERFORMANCE_HISTORY_LEN)
        for i, perf in enumerate(recent_performance[-self.PERFORMANCE_HISTORY_LEN:]):
            perf_vec[i] = float(perf)
        features.extend(perf_vec.tolist())

        # 3. Encode engagement metrics
        engagement_level = float(learner_state.get("engagement_level", 0.5))
        attention_score = float(learner_state.get("attention_score", 0.5))
        participation_rate = float(learner_state.get("participation_rate", 0.5))
        # Compute frustration indicator from performance drops
        frustration = self._compute_frustration(recent_performance)
        features.extend([engagement_level, attention_score, participation_rate, frustration])

        # 4. Encode session context
        time_in_session = min(float(learner_state.get("time_in_session", 0)) / 3600.0, 1.0)  # Normalize to hours
        items_completed = min(float(learner_state.get("items_completed", 0)) / 50.0, 1.0)
        help_requests = min(float(learner_state.get("help_requests", 0)) / 10.0, 1.0)
        session_progress = float(learner_state.get("session_progress", 0.0))
        features.extend([time_in_session, items_completed, help_requests, session_progress])

        # Convert to numpy array and pad/truncate to state_dim
        state_vector = np.array(features, dtype=np.float32)
        if len(state_vector) < self.state_dim:
            state_vector = np.pad(state_vector, (0, self.state_dim - len(state_vector)))
        elif len(state_vector) > self.state_dim:
            state_vector = state_vector[:self.state_dim]

        return state_vector

    def _compute_frustration(self, performance_history: List[float]) -> float:
        """Compute frustration indicator from performance drops."""
        if len(performance_history) < 2:
            return 0.0
        # Count consecutive failures or drops
        drops = 0
        for i in range(1, len(performance_history)):
            if performance_history[i] < performance_history[i-1]:
                drops += 1
            if performance_history[i] < 0.5:
                drops += 0.5
        return min(drops / len(performance_history), 1.0)

    def encode_batch(
        self,
        states: List[Dict[str, Any]],
    ) -> np.ndarray:
        """Encode batch of states."""
        if not states:
            return np.zeros((0, self.state_dim), dtype=np.float32)
        return np.stack([self.encode(s) for s in states])

    def decode(
        self,
        state_vector: np.ndarray,
    ) -> Dict[str, Any]:
        """Decode state vector (for interpretability)."""
        decoded = {}

        # Decode knowledge state
        knowledge_state = {}
        for i in range(self.KNOWLEDGE_DIM):
            if state_vector[i] > 0:
                knowledge_state[f"topic_{i}"] = float(state_vector[i])
        decoded["knowledge_state"] = knowledge_state

        # Decode performance history
        start_idx = self.KNOWLEDGE_DIM
        decoded["recent_performance"] = [
            float(state_vector[start_idx + i])
            for i in range(self.PERFORMANCE_HISTORY_LEN)
            if state_vector[start_idx + i] > 0
        ]

        # Decode engagement metrics
        start_idx = self.KNOWLEDGE_DIM + self.PERFORMANCE_HISTORY_LEN
        decoded["engagement_level"] = float(state_vector[start_idx])
        decoded["attention_score"] = float(state_vector[start_idx + 1])
        decoded["participation_rate"] = float(state_vector[start_idx + 2])
        decoded["frustration_indicator"] = float(state_vector[start_idx + 3])

        # Decode session context
        start_idx += 4
        decoded["time_in_session"] = float(state_vector[start_idx]) * 3600  # Convert back from hours
        decoded["items_completed"] = int(float(state_vector[start_idx + 1]) * 50)
        decoded["help_requests"] = int(float(state_vector[start_idx + 2]) * 10)
        decoded["session_progress"] = float(state_vector[start_idx + 3])

        return decoded
