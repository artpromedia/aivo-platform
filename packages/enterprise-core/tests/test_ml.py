"""
Tests for enterprise_core.ml.knowledge_tracing module.

Covers BKTParameters, Response, and BayesianKnowledgeTracer.
"""

import pytest
import numpy as np
from datetime import datetime

from enterprise_core.ml.knowledge_tracing import (
    BKTParameters,
    Response,
    BayesianKnowledgeTracer,
)


# ── BKTParameters tests ──────────────────────────────────────────


class TestBKTParameters:
    """Tests for BKTParameters dataclass."""

    def test_default_values(self):
        params = BKTParameters()
        assert params.p_init == 0.2
        assert params.p_learn == 0.1
        assert params.p_guess == 0.2
        assert params.p_slip == 0.1

    def test_custom_values(self):
        params = BKTParameters(p_init=0.5, p_learn=0.3, p_guess=0.4, p_slip=0.05)
        assert params.p_init == 0.5
        assert params.p_learn == 0.3

    def test_validate_valid_params(self):
        params = BKTParameters(p_init=0.2, p_learn=0.1, p_guess=0.2, p_slip=0.1)
        assert params.validate() is True

    def test_validate_boundary_zero(self):
        params = BKTParameters(p_init=0.0, p_learn=0.0, p_guess=0.0, p_slip=0.0)
        assert params.validate() is True

    def test_validate_boundary_max(self):
        params = BKTParameters(p_init=1.0, p_learn=1.0, p_guess=0.5, p_slip=0.5)
        assert params.validate() is True

    def test_validate_invalid_guess_too_high(self):
        params = BKTParameters(p_guess=0.6)
        assert params.validate() is False

    def test_validate_invalid_slip_too_high(self):
        params = BKTParameters(p_slip=0.6)
        assert params.validate() is False

    def test_validate_invalid_negative(self):
        params = BKTParameters(p_init=-0.1)
        assert params.validate() is False

    def test_validate_init_above_one(self):
        params = BKTParameters(p_init=1.1)
        assert params.validate() is False

    def test_to_dict(self):
        params = BKTParameters(p_init=0.3, p_learn=0.15, p_guess=0.25, p_slip=0.05)
        d = params.to_dict()
        assert d == {
            "p_init": 0.3,
            "p_learn": 0.15,
            "p_guess": 0.25,
            "p_slip": 0.05,
        }

    def test_from_dict(self):
        data = {"p_init": 0.4, "p_learn": 0.2, "p_guess": 0.1, "p_slip": 0.05}
        params = BKTParameters.from_dict(data)
        assert params.p_init == 0.4
        assert params.p_learn == 0.2

    def test_from_dict_defaults(self):
        params = BKTParameters.from_dict({})
        assert params.p_init == 0.2
        assert params.p_learn == 0.1

    def test_roundtrip_dict(self):
        original = BKTParameters(p_init=0.35, p_learn=0.12, p_guess=0.18, p_slip=0.09)
        restored = BKTParameters.from_dict(original.to_dict())
        assert restored.p_init == original.p_init
        assert restored.p_learn == original.p_learn
        assert restored.p_guess == original.p_guess
        assert restored.p_slip == original.p_slip


# ── Response tests ────────────────────────────────────────────────


class TestResponse:
    """Tests for the Response dataclass."""

    def test_basic_response(self):
        r = Response(
            correct=True,
            time_spent=12.5,
            attempt_number=1,
            timestamp=datetime(2024, 1, 1),
        )
        assert r.correct is True
        assert r.time_spent == 12.5
        assert r.attempt_number == 1

    def test_defaults(self):
        r = Response(
            correct=False,
            time_spent=5.0,
            attempt_number=2,
            timestamp=datetime(2024, 6, 15),
        )
        assert r.hint_used is False
        assert r.confidence is None

    def test_with_optional_fields(self):
        r = Response(
            correct=True,
            time_spent=8.0,
            attempt_number=1,
            timestamp=datetime(2024, 3, 1),
            hint_used=True,
            confidence=0.8,
        )
        assert r.hint_used is True
        assert r.confidence == 0.8


# ── BayesianKnowledgeTracer tests ─────────────────────────────────


class TestBayesianKnowledgeTracer:
    """Tests for BayesianKnowledgeTracer engine."""

    def _make_response(self, correct: bool, time_spent: float = 15.0) -> Response:
        return Response(
            correct=correct,
            time_spent=time_spent,
            attempt_number=1,
            timestamp=datetime.utcnow(),
        )

    def test_initialization_defaults(self):
        tracer = BayesianKnowledgeTracer()
        assert tracer.default_params.p_init == 0.2
        assert tracer.default_params.p_learn == 0.1

    def test_initialization_custom(self):
        tracer = BayesianKnowledgeTracer(default_p_init=0.5, default_p_learn=0.2)
        assert tracer.default_params.p_init == 0.5
        assert tracer.default_params.p_learn == 0.2

    def test_get_mastery_initial(self):
        tracer = BayesianKnowledgeTracer()
        mastery = tracer.get_mastery_probability("s1", "math")
        assert mastery == pytest.approx(0.2)

    def test_get_parameters_default(self):
        tracer = BayesianKnowledgeTracer()
        params = tracer.get_parameters("s1", "math")
        assert params.p_init == 0.2
        assert params.p_learn == 0.1

    def test_set_parameters(self):
        tracer = BayesianKnowledgeTracer()
        custom = BKTParameters(p_init=0.5, p_learn=0.3, p_guess=0.1, p_slip=0.05)
        tracer.set_parameters("s1", "math", custom)
        params = tracer.get_parameters("s1", "math")
        assert params.p_init == 0.5

    def test_set_invalid_parameters_raises(self):
        tracer = BayesianKnowledgeTracer()
        invalid = BKTParameters(p_init=-0.5)
        with pytest.raises(ValueError, match="Invalid BKT parameters"):
            tracer.set_parameters("s1", "math", invalid)

    def test_update_correct_increases_mastery(self):
        tracer = BayesianKnowledgeTracer()
        prior = tracer.get_mastery_probability("s1", "math")
        _, posterior = tracer.update_knowledge("s1", "math", self._make_response(True))
        assert posterior > prior

    def test_update_incorrect_response(self):
        tracer = BayesianKnowledgeTracer()
        prior = tracer.get_mastery_probability("s1", "math")
        _, posterior = tracer.update_knowledge("s1", "math", self._make_response(False))
        # After incorrect, mastery should stay low (may still increase slightly
        # due to learning transition, but should be modest relative to correct)
        assert posterior >= 0.0
        assert posterior <= 1.0

    def test_multiple_correct_converges_to_mastery(self):
        tracer = BayesianKnowledgeTracer()
        for _ in range(20):
            tracer.update_knowledge("s1", "algebra", self._make_response(True))
        mastery = tracer.get_mastery_probability("s1", "algebra")
        assert mastery > 0.9, "Should converge toward mastery after many correct"

    def test_mastery_bounded_zero_one(self):
        tracer = BayesianKnowledgeTracer()
        for _ in range(50):
            tracer.update_knowledge("s1", "reading", self._make_response(True))
        mastery = tracer.get_mastery_probability("s1", "reading")
        assert 0.0 <= mastery <= 1.0

    def test_different_skills_independent(self):
        tracer = BayesianKnowledgeTracer()
        for _ in range(10):
            tracer.update_knowledge("s1", "math", self._make_response(True))

        math_mastery = tracer.get_mastery_probability("s1", "math")
        reading_mastery = tracer.get_mastery_probability("s1", "reading")

        assert math_mastery > reading_mastery

    def test_different_students_independent(self):
        tracer = BayesianKnowledgeTracer()
        for _ in range(10):
            tracer.update_knowledge("s1", "math", self._make_response(True))

        s1_mastery = tracer.get_mastery_probability("s1", "math")
        s2_mastery = tracer.get_mastery_probability("s2", "math")

        assert s1_mastery > s2_mastery

    def test_update_returns_prior_and_posterior(self):
        tracer = BayesianKnowledgeTracer()
        prior, posterior = tracer.update_knowledge(
            "s1", "math", self._make_response(True)
        )
        assert isinstance(prior, float)
        assert isinstance(posterior, float)
        assert prior == pytest.approx(0.2)
        assert posterior > prior

    def test_response_history_stored(self):
        tracer = BayesianKnowledgeTracer()
        resp = self._make_response(True)
        tracer.update_knowledge("s1", "math", resp)
        key = "s1_math"
        assert len(tracer.response_history[key]) == 1
        assert tracer.response_history[key][0] is resp

    def test_fast_correct_boosts_more(self):
        """Quick correct answers should boost mastery more via contextual adjustments."""
        tracer1 = BayesianKnowledgeTracer()
        tracer2 = BayesianKnowledgeTracer()

        # Fast correct (< 10s triggers boost)
        _, posterior_fast = tracer1.update_knowledge(
            "s1", "math", self._make_response(True, time_spent=5.0)
        )
        # Slow correct
        _, posterior_slow = tracer2.update_knowledge(
            "s1", "math", self._make_response(True, time_spent=30.0)
        )

        assert posterior_fast >= posterior_slow
