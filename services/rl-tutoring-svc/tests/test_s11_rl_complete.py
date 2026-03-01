"""
Tests for S11 — RL Tutoring Service Complete & Enable

Covers:
  - Persistence roundtrip (Redis / PG stores, checkpoint store)
  - Warm-start training data generation
  - Production hardening (rate limiter, circuit breaker, A/B assignment)
  - Safety constraint enforcement
"""

import asyncio
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# ── S11.1  Persistence layer tests ──────────────────────────────────────

from app.persistence.redis_store import RedisStore
from app.persistence.pg_store import PgStore
from app.persistence.checkpoint_store import CheckpointStore, _policy_to_dict, _dict_to_policy


class TestRedisStoreOffline:
    """Test RedisStore behaviour when Redis is unavailable."""

    @pytest.mark.asyncio
    async def test_unavailable_connect(self):
        store = RedisStore()
        # Without a running Redis, connect should return False gracefully
        result = await store.connect()
        # Result depends on whether redis package + server exist;
        # in CI without Redis it must be False.
        assert isinstance(result, bool)
        await store.close()

    @pytest.mark.asyncio
    async def test_push_noop_when_unavailable(self):
        store = RedisStore()
        count = await store.push_experiences([{"state": {}, "action": 0}])
        assert count == 0

    @pytest.mark.asyncio
    async def test_session_noop_when_unavailable(self):
        store = RedisStore()
        await store.save_session("s1", {"data": True})
        result = await store.load_session("s1")
        assert result is None

    @pytest.mark.asyncio
    async def test_list_sessions_empty(self):
        store = RedisStore()
        ids = await store.list_session_ids()
        assert ids == []


class TestPgStoreOffline:
    """Test PgStore behaviour when PostgreSQL is unavailable."""

    @pytest.mark.asyncio
    async def test_unavailable_connect(self):
        store = PgStore()
        result = await store.connect()
        assert isinstance(result, bool)
        await store.close()

    @pytest.mark.asyncio
    async def test_store_experiences_noop(self):
        store = PgStore()
        count = await store.store_experiences([{"state": {}}])
        assert count == 0

    @pytest.mark.asyncio
    async def test_load_latest_checkpoint_none(self):
        store = PgStore()
        result = await store.load_latest_checkpoint()
        assert result is None


class TestCheckpointStore:
    """Test CheckpointStore without real PG."""

    def _make_policy(self):
        from app.models.policy_learner import PolicyLearner
        return PolicyLearner(algorithm="q_learning", state_dim=64, action_dim=10)

    def test_policy_roundtrip(self):
        pl = self._make_policy()
        pl.training_steps = 42
        data = _policy_to_dict(pl)
        assert data["training_steps"] == 42
        assert len(data["q_weights"]) == 10
        assert len(data["q_bias"]) == 10

        pl2 = self._make_policy()
        _dict_to_policy(data, pl2)
        assert pl2.training_steps == 42

    @pytest.mark.asyncio
    async def test_maybe_save_skips_below_interval(self):
        pg = MagicMock()
        pg.available = False
        cs = CheckpointStore(pg)
        pl = self._make_policy()
        pl.training_steps = 5
        result = await cs.maybe_save(pl)
        assert result is False

    @pytest.mark.asyncio
    async def test_force_save_local_fallback(self):
        cs = CheckpointStore(pg_store=None)
        pl = self._make_policy()
        pl.training_steps = 10
        result = await cs.force_save(pl)
        assert result is True

    @pytest.mark.asyncio
    async def test_load_latest_pg(self):
        pg = AsyncMock()
        pg.available = True
        pl = self._make_policy()
        pg.load_latest_checkpoint.return_value = _policy_to_dict(pl)
        cs = CheckpointStore(pg)
        pl2 = self._make_policy()
        result = await cs.load_latest(pl2)
        assert result is True


# ── S11.3  Warm-start tests ─────────────────────────────────────────────

from app.services.warm_start import (
    generate_curriculum_experiences,
    generate_bkt_experiences,
    warm_start_policy,
)


class TestWarmStart:
    """Test warm-start data generation."""

    def test_curriculum_experiences_count(self):
        exps = generate_curriculum_experiences(num_experiences=100)
        assert len(exps) == 100

    def test_curriculum_experience_shape(self):
        exps = generate_curriculum_experiences(num_experiences=1)
        e = exps[0]
        assert "state" in e
        assert "action" in e
        assert "reward" in e
        assert "next_state" in e
        assert "done" in e
        assert isinstance(e["action"], int)
        assert 0 <= e["action"] < 10
        assert -1.0 <= e["reward"] <= 1.0

    def test_bkt_experiences(self):
        bkt_data = [
            {"learner_id": "l1", "skill_id": "s1", "mastery_before": 0.3, "mastery_after": 0.4, "correct": True},
            {"learner_id": "l1", "skill_id": "s1", "mastery_before": 0.7, "mastery_after": 0.65, "correct": False},
        ]
        exps = generate_bkt_experiences(bkt_data)
        assert len(exps) == 2

    def test_warm_start_policy_trains(self):
        from app.models.policy_learner import PolicyLearner
        from app.services.experience_buffer import ExperienceBuffer

        pl = PolicyLearner(algorithm="q_learning", state_dim=64, action_dim=10)
        buf = ExperienceBuffer(capacity=2000)
        initial_steps = pl.training_steps

        summary = warm_start_policy(pl, buf, num_curriculum=100, train_epochs=5)

        assert summary["curriculum_experiences"] == 100
        assert pl.training_steps > initial_steps
        assert len(buf) == 100


# ── S11.4  Production hardening tests ────────────────────────────────────

from app.hardening import (
    CircuitBreaker,
    _TokenBucket,
    assign_ab_group,
)


class TestRateLimiter:
    """Test per-key token-bucket rate limiter."""

    def test_allows_within_limit(self):
        limiter = _TokenBucket(rate_per_min=5)
        for _ in range(5):
            assert limiter.allow("user1") is True

    def test_rejects_over_limit(self):
        limiter = _TokenBucket(rate_per_min=2)
        assert limiter.allow("user1") is True
        assert limiter.allow("user1") is True
        assert limiter.allow("user1") is False

    def test_keys_independent(self):
        limiter = _TokenBucket(rate_per_min=1)
        assert limiter.allow("a") is True
        assert limiter.allow("b") is True
        assert limiter.allow("a") is False
        assert limiter.allow("b") is False


class TestCircuitBreaker:
    """Test circuit breaker state machine."""

    def test_starts_closed(self):
        cb = CircuitBreaker(name="test", error_threshold=3, reset_seconds=0.1)
        assert cb.state == CircuitBreaker.CLOSED
        assert cb.allow_request() is True

    def test_opens_after_threshold(self):
        cb = CircuitBreaker(name="test", error_threshold=2)
        cb.record_failure()
        assert cb.state == CircuitBreaker.CLOSED
        cb.record_failure()
        assert cb.state == CircuitBreaker.OPEN
        assert cb.allow_request() is False

    def test_half_open_after_reset(self):
        cb = CircuitBreaker(name="test", error_threshold=1, reset_seconds=0.01)
        cb.record_failure()
        assert cb.state == CircuitBreaker.OPEN
        import time; time.sleep(0.02)
        assert cb.state == CircuitBreaker.HALF_OPEN
        assert cb.allow_request() is True

    def test_closes_on_success(self):
        cb = CircuitBreaker(name="test", error_threshold=1, reset_seconds=0.01)
        cb.record_failure()
        import time; time.sleep(0.02)
        cb.record_success(latency_ms=10)
        assert cb.state == CircuitBreaker.CLOSED

    def test_high_latency_counts_as_failure(self):
        cb = CircuitBreaker(name="test", error_threshold=1, latency_threshold_ms=100)
        cb.record_success(latency_ms=200)
        assert cb.state == CircuitBreaker.OPEN

    def test_to_dict(self):
        cb = CircuitBreaker(name="test")
        d = cb.to_dict()
        assert d["name"] == "test"
        assert d["state"] == "closed"


class TestABAssignment:
    """Test A/B test group assignment."""

    def test_deterministic(self):
        g1 = assign_ab_group("learner-42", percentage=50)
        g2 = assign_ab_group("learner-42", percentage=50)
        assert g1 == g2

    def test_two_groups(self):
        groups = {assign_ab_group(f"l-{i}", 50) for i in range(200)}
        assert "rl" in groups
        assert "rule-based" in groups

    def test_100_percent_rl(self):
        assert assign_ab_group("any-learner", percentage=100) == "rl"

    def test_0_percent_rl(self):
        assert assign_ab_group("any-learner", percentage=0) == "rule-based"


# ── S11.1/S11.4  Experience buffer persistence integration ───────────────

from app.services.experience_buffer import ExperienceBuffer


class TestExperienceBufferPersistence:
    """Test ExperienceBuffer save_to_store / load_from_store."""

    @pytest.mark.asyncio
    async def test_save_noop_when_store_unavailable(self):
        buf = ExperienceBuffer(capacity=100)
        buf.add(state={"k": 0.5}, action=1, reward=0.1, next_state={"k": 0.6}, done=False)
        store = RedisStore()  # not connected
        count = await buf.save_to_store(store)
        assert count == 0

    @pytest.mark.asyncio
    async def test_load_noop_when_store_unavailable(self):
        buf = ExperienceBuffer(capacity=100)
        store = RedisStore()
        loaded = await buf.load_from_store(store)
        assert loaded == 0


# ── Safety constraint enforcement (regression) ──────────────────────────

from app.services.safety_monitor import (
    SafetyMonitor,
    SafetyConstraints,
    SafetyAssessment,
)
from app.models.student_model import StudentAgeGroup


class TestSafetyConstraints:
    """Verify age-based safety constraints are enforced properly."""

    def test_child_exploration_limit(self):
        constraints = SafetyConstraints.for_age_group(StudentAgeGroup.CHILD)
        assert constraints.max_exploration_rate <= 0.05
        assert constraints.max_session_duration <= 1200

    def test_teen_exploration_limit(self):
        constraints = SafetyConstraints.for_age_group(StudentAgeGroup.TEEN)
        assert constraints.max_exploration_rate <= 0.08
        assert constraints.max_session_duration <= 1800

    def test_adult_more_permissive(self):
        constraints = SafetyConstraints.for_age_group(StudentAgeGroup.ADULT)
        assert constraints.max_exploration_rate >= 0.1
        assert constraints.max_session_duration >= 3600

    def test_audit_log_records_entry(self):
        sm = SafetyMonitor(enable_logging=True)
        assessment = SafetyAssessment(is_safe=True)
        sm.record_action(
            student_id="test-student",
            session_id="test-session",
            action_type="hint",
            action_details={"mastery": 0.5},
            assessment=assessment,
        )
        entries = sm.get_audit_log(student_id="test-student")
        assert len(entries) >= 1
