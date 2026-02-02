"""
Tests for Experience Buffer
"""
import pytest

from app.services.experience_buffer import ExperienceBuffer


class TestExperienceBuffer:
    """Test suite for ExperienceBuffer."""

    def test_init_default(self):
        """Test default initialization."""
        buffer = ExperienceBuffer()
        assert buffer.capacity == 10000
        assert buffer.prioritized is False
        assert len(buffer) == 0

    def test_init_custom(self):
        """Test custom initialization."""
        buffer = ExperienceBuffer(capacity=1000, prioritized=True)
        assert buffer.capacity == 1000
        assert buffer.prioritized is True

    def test_add_experience(self):
        """Test adding experience."""
        buffer = ExperienceBuffer()
        buffer.add(
            state={"knowledge": 0.5},
            action=1,
            reward=0.8,
            next_state={"knowledge": 0.6},
            done=False,
        )
        assert len(buffer) == 1

    def test_add_multiple(self):
        """Test adding multiple experiences."""
        buffer = ExperienceBuffer()
        for i in range(10):
            buffer.add(
                state={"value": i},
                action=i % 5,
                reward=i * 0.1,
                next_state={"value": i + 1},
                done=i == 9,
            )
        assert len(buffer) == 10

    def test_add_batch(self):
        """Test batch add."""
        buffer = ExperienceBuffer()
        experiences = [
            {"state": {"v": i}, "action": i, "reward": 0.1, "next_state": {}, "done": False}
            for i in range(5)
        ]
        buffer.add_batch(experiences)
        assert len(buffer) == 5

    def test_capacity_limit(self):
        """Test capacity limit enforcement."""
        buffer = ExperienceBuffer(capacity=5)
        for i in range(10):
            buffer.add(state={}, action=i, reward=0.1, next_state={}, done=False)
        assert len(buffer) == 5

    def test_sample_uniform(self):
        """Test uniform sampling."""
        buffer = ExperienceBuffer(capacity=100)
        for i in range(50):
            buffer.add(state={"i": i}, action=i % 5, reward=0.1, next_state={}, done=False)
        
        batch = buffer.sample(batch_size=10)
        assert len(batch) == 10
        assert all("state" in exp for exp in batch)
        assert all("action" in exp for exp in batch)
        assert all("reward" in exp for exp in batch)

    def test_sample_prioritized(self):
        """Test prioritized sampling."""
        buffer = ExperienceBuffer(capacity=100, prioritized=True)
        for i in range(50):
            buffer.add(
                state={"i": i},
                action=i % 5,
                reward=0.1,
                next_state={},
                done=False,
                td_error=i * 0.1,
            )
        
        batch = buffer.sample(batch_size=10)
        assert len(batch) == 10
        assert all("weight" in exp for exp in batch)

    def test_sample_limited_by_size(self):
        """Test sampling limited by buffer size."""
        buffer = ExperienceBuffer(capacity=100)
        for i in range(5):
            buffer.add(state={}, action=i, reward=0.1, next_state={}, done=False)
        
        batch = buffer.sample(batch_size=10)
        assert len(batch) == 5

    def test_sample_empty(self):
        """Test sampling from empty buffer."""
        buffer = ExperienceBuffer()
        batch = buffer.sample(batch_size=10)
        assert batch == []

    def test_update_priorities(self):
        """Test priority updates."""
        buffer = ExperienceBuffer(capacity=100, prioritized=True)
        for i in range(10):
            buffer.add(state={}, action=i, reward=0.1, next_state={}, done=False)
        
        buffer.update_priorities([0, 1, 2], [0.5, 0.3, 0.8])
        # Should not raise error

    def test_clear(self):
        """Test clearing buffer."""
        buffer = ExperienceBuffer()
        for i in range(10):
            buffer.add(state={}, action=i, reward=0.1, next_state={}, done=False)
        buffer.clear()
        assert len(buffer) == 0

    def test_get_all(self):
        """Test getting all experiences."""
        buffer = ExperienceBuffer()
        for i in range(5):
            buffer.add(state={"i": i}, action=i, reward=0.1, next_state={}, done=False)
        
        all_exp = buffer.get_all()
        assert len(all_exp) == 5

    def test_get_statistics(self):
        """Test getting statistics."""
        buffer = ExperienceBuffer(capacity=1000)
        for i in range(20):
            buffer.add(state={}, action=i, reward=0.1, next_state={}, done=False)
        buffer.sample(batch_size=5)
        
        stats = buffer.get_statistics()
        assert stats["capacity"] == 1000
        assert stats["current_size"] == 20
        assert stats["total_added"] == 20
        assert stats["total_sampled"] == 5

    def test_is_ready(self):
        """Test ready check."""
        buffer = ExperienceBuffer()
        assert not buffer.is_ready(min_size=10)
        
        for i in range(15):
            buffer.add(state={}, action=i, reward=0.1, next_state={}, done=False)
        assert buffer.is_ready(min_size=10)

    def test_len(self):
        """Test length property."""
        buffer = ExperienceBuffer()
        assert len(buffer) == 0
        buffer.add(state={}, action=0, reward=0.1, next_state={}, done=False)
        assert len(buffer) == 1

    def test_beta_increment(self):
        """Test beta increment in prioritized replay."""
        buffer = ExperienceBuffer(capacity=100, prioritized=True, beta=0.4)
        for i in range(50):
            buffer.add(state={}, action=i, reward=0.1, next_state={}, done=False)
        
        initial_beta = buffer.beta
        buffer.sample(batch_size=10)
        assert buffer.beta > initial_beta

    def test_beta_max(self):
        """Test beta doesn't exceed 1.0."""
        buffer = ExperienceBuffer(capacity=100, prioritized=True, beta=0.99)
        for i in range(50):
            buffer.add(state={}, action=i, reward=0.1, next_state={}, done=False)
        
        for _ in range(10):
            buffer.sample(batch_size=10)
        assert buffer.beta <= 1.0
