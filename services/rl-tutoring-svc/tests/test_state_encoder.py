"""
Tests for State Encoder Model
"""
import numpy as np
import pytest

from app.models.state_encoder import StateEncoder


class TestStateEncoder:
    """Test suite for StateEncoder."""

    def test_init_default(self):
        """Test default initialization."""
        encoder = StateEncoder()
        assert encoder.state_dim == 64
        assert len(encoder._feature_names) > 0

    def test_init_custom_dim(self):
        """Test custom state dimension."""
        encoder = StateEncoder(state_dim=128)
        assert encoder.state_dim == 128

    def test_encode_empty_state(self):
        """Test encoding empty state."""
        encoder = StateEncoder()
        state = {}
        vector = encoder.encode(state)
        assert isinstance(vector, np.ndarray)
        assert vector.shape == (64,)
        assert vector.dtype == np.float32

    def test_encode_with_knowledge_state(self):
        """Test encoding state with knowledge."""
        encoder = StateEncoder()
        state = {
            "knowledge_state": {
                "math": 0.8,
                "reading": 0.6,
                "science": 0.4,
            }
        }
        vector = encoder.encode(state)
        assert vector.shape == (64,)
        # First values should be knowledge state
        assert vector[0] == pytest.approx(0.8, rel=0.01)
        assert vector[1] == pytest.approx(0.6, rel=0.01)
        assert vector[2] == pytest.approx(0.4, rel=0.01)

    def test_encode_with_performance_history(self):
        """Test encoding with performance history."""
        encoder = StateEncoder()
        state = {
            "recent_performance": [0.9, 0.8, 0.7, 0.6, 0.5],
        }
        vector = encoder.encode(state)
        assert vector.shape == (64,)

    def test_encode_full_state(self):
        """Test encoding complete state."""
        encoder = StateEncoder()
        state = {
            "knowledge_state": {"topic_0": 0.5, "topic_1": 0.6},
            "recent_performance": [0.7, 0.8, 0.9],
            "engagement_level": 0.75,
            "attention_score": 0.65,
            "participation_rate": 0.8,
            "time_in_session": 600,
            "items_completed": 10,
            "help_requests": 2,
            "session_progress": 0.5,
        }
        vector = encoder.encode(state)
        assert vector.shape == (64,)
        assert np.all(np.isfinite(vector))

    def test_encode_batch(self):
        """Test batch encoding."""
        encoder = StateEncoder()
        states = [
            {"knowledge_state": {"math": 0.5}},
            {"knowledge_state": {"math": 0.7}},
            {"knowledge_state": {"math": 0.9}},
        ]
        batch = encoder.encode_batch(states)
        assert batch.shape == (3, 64)

    def test_encode_batch_empty(self):
        """Test batch encoding with empty list."""
        encoder = StateEncoder()
        batch = encoder.encode_batch([])
        assert batch.shape == (0, 64)

    def test_decode(self):
        """Test decoding state vector."""
        encoder = StateEncoder()
        state = {
            "knowledge_state": {"topic_0": 0.5},
            "recent_performance": [0.7],
            "engagement_level": 0.6,
        }
        vector = encoder.encode(state)
        decoded = encoder.decode(vector)
        assert "knowledge_state" in decoded
        assert "recent_performance" in decoded
        assert "engagement_level" in decoded

    def test_compute_frustration_empty(self):
        """Test frustration computation with empty history."""
        encoder = StateEncoder()
        frustration = encoder._compute_frustration([])
        assert frustration == 0.0

    def test_compute_frustration_single(self):
        """Test frustration computation with single value."""
        encoder = StateEncoder()
        frustration = encoder._compute_frustration([0.5])
        assert frustration == 0.0

    def test_compute_frustration_drops(self):
        """Test frustration computation with performance drops."""
        encoder = StateEncoder()
        # Declining performance
        frustration = encoder._compute_frustration([0.9, 0.7, 0.5, 0.3])
        assert frustration > 0.0

    def test_compute_frustration_improvements(self):
        """Test frustration computation with improvements."""
        encoder = StateEncoder()
        # Improving performance
        frustration = encoder._compute_frustration([0.3, 0.5, 0.7, 0.9])
        assert frustration < 0.5  # Should be low

    def test_state_truncation(self):
        """Test that large states are truncated."""
        encoder = StateEncoder(state_dim=32)
        state = {
            "knowledge_state": {f"topic_{i}": 0.5 for i in range(50)},
        }
        vector = encoder.encode(state)
        assert vector.shape == (32,)

    def test_state_padding(self):
        """Test that small states are padded."""
        encoder = StateEncoder(state_dim=128)
        state = {"knowledge_state": {"math": 0.5}}
        vector = encoder.encode(state)
        assert vector.shape == (128,)

    def test_normalization_time(self):
        """Test time normalization."""
        encoder = StateEncoder()
        # 2 hours should be normalized to ~1.0
        state = {"time_in_session": 7200}
        vector = encoder.encode(state)
        # Time feature should be capped at 1.0
        assert np.all(vector <= 1.5)

    def test_feature_names(self):
        """Test feature names are built correctly."""
        encoder = StateEncoder()
        assert "engagement_level" in encoder._feature_names
        assert "attention_score" in encoder._feature_names
        assert "time_in_session" in encoder._feature_names
