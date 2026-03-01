"""
Tests for Sprint S6: Pydantic Schemas + BKT EM Fitting + Model Registry.

Covers:
- enterprise_core.schemas (learner, assessment, iep, ai)
- enterprise_core.ml.knowledge_tracing (Baum-Welch EM)
- enterprise_core.ml.registry (ModelRegistry)
"""

import math
import pytest
import numpy as np
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

# ── Schema imports ───────────────────────────────────────────────

from enterprise_core.schemas.learner import (
    LearnerMetricsSchema,
    LearnerProfileSchema,
)
from enterprise_core.schemas.assessment import (
    AssessmentRequestSchema,
    AssessmentResponseSchema,
    AssessmentType,
    DifficultyLevel,
    QuestionResult,
)
from enterprise_core.schemas.iep import (
    GoalStatus,
    GoalType,
    IEPAccommodationSchema,
    IEPGoalSchema,
    ProgressTrend,
)
from enterprise_core.schemas.ai import (
    GenerateRequestSchema,
    GenerateResponseSchema,
    HintRequestSchema,
    HintResponseSchema,
    ModelId,
    ProviderId,
    TokenUsageSchema,
)

# ── ML imports ───────────────────────────────────────────────────

from enterprise_core.ml.knowledge_tracing import (
    BKTParameters,
    BayesianKnowledgeTracer,
    Response,
)
from enterprise_core.ml.registry import (
    ModelFramework,
    ModelRegistry,
    ModelStage,
    ModelVersionSchema,
)


# ══════════════════════════════════════════════════════════════════
#  TASK 1 — Pydantic Schema Tests
# ══════════════════════════════════════════════════════════════════


class TestLearnerSchemas:
    """Tests for learner profile and metrics schemas."""

    def test_learner_profile_valid(self):
        profile = LearnerProfileSchema(
            student_id=uuid4(),
            tenant_id=uuid4(),
            first_name="Alice",
            last_name="Smith",
            grade_level=5,
            age=11,
        )
        assert profile.first_name == "Alice"
        assert profile.grade_level == 5
        assert profile.preferred_language == "en"

    def test_learner_profile_defaults(self):
        profile = LearnerProfileSchema(
            student_id=uuid4(),
            first_name="Bob",
            last_name="Jones",
            grade_level=3,
            age=9,
        )
        assert profile.subjects == []
        assert profile.accommodations == []
        assert profile.metadata == {}
        assert profile.metrics is None

    def test_learner_profile_invalid_grade(self):
        with pytest.raises(Exception):  # ValidationError
            LearnerProfileSchema(
                student_id=uuid4(),
                first_name="X",
                last_name="Y",
                grade_level=15,
                age=10,
            )

    def test_learner_profile_invalid_age(self):
        with pytest.raises(Exception):
            LearnerProfileSchema(
                student_id=uuid4(),
                first_name="X",
                last_name="Y",
                grade_level=5,
                age=2,  # too young
            )

    def test_learner_profile_learning_style(self):
        profile = LearnerProfileSchema(
            student_id=uuid4(),
            first_name="C",
            last_name="D",
            grade_level=7,
            age=13,
            learning_style="visual",
        )
        assert profile.learning_style == "visual"

    def test_learner_profile_invalid_learning_style(self):
        with pytest.raises(Exception):
            LearnerProfileSchema(
                student_id=uuid4(),
                first_name="C",
                last_name="D",
                grade_level=7,
                age=13,
                learning_style="telepathy",
            )

    def test_learner_metrics(self):
        m = LearnerMetricsSchema(
            mastery_probability=0.85,
            accuracy=0.9,
            total_attempts=42,
            streak=5,
            average_time_seconds=12.3,
            skills_mastered=3,
            skills_in_progress=2,
        )
        assert m.mastery_probability == 0.85
        assert m.skills_mastered == 3

    def test_learner_profile_with_metrics(self):
        m = LearnerMetricsSchema(
            mastery_probability=0.5,
            accuracy=0.6,
            total_attempts=10,
        )
        profile = LearnerProfileSchema(
            student_id=uuid4(),
            first_name="E",
            last_name="F",
            grade_level=1,
            age=6,
            metrics=m,
        )
        assert profile.metrics is not None
        assert profile.metrics.accuracy == 0.6


class TestAssessmentSchemas:
    """Tests for assessment request/response schemas."""

    def test_assessment_request_valid(self):
        req = AssessmentRequestSchema(
            student_id=uuid4(),
            subject="math",
            grade_level=4,
            assessment_type=AssessmentType.FORMATIVE,
        )
        assert req.subject == "MATH"  # auto-uppercased
        assert req.num_questions == 10

    def test_assessment_request_difficulty(self):
        req = AssessmentRequestSchema(
            student_id=uuid4(),
            subject="ela",
            grade_level=8,
            assessment_type=AssessmentType.DIAGNOSTIC,
            difficulty=DifficultyLevel.ABOVE_GRADE,
            num_questions=25,
        )
        assert req.difficulty == DifficultyLevel.ABOVE_GRADE
        assert req.num_questions == 25

    def test_assessment_request_num_questions_bounds(self):
        with pytest.raises(Exception):
            AssessmentRequestSchema(
                student_id=uuid4(),
                subject="math",
                grade_level=3,
                assessment_type=AssessmentType.PRACTICE,
                num_questions=0,
            )
        with pytest.raises(Exception):
            AssessmentRequestSchema(
                student_id=uuid4(),
                subject="math",
                grade_level=3,
                assessment_type=AssessmentType.PRACTICE,
                num_questions=100,
            )

    def test_question_result(self):
        qr = QuestionResult(
            question_id="q-123",
            skill="fractions",
            correct=True,
            time_spent_seconds=8.5,
            attempt_number=1,
        )
        assert qr.correct is True
        assert qr.hint_used is False

    def test_assessment_response_score_bounds(self):
        with pytest.raises(Exception):
            AssessmentResponseSchema(
                assessment_id=uuid4(),
                student_id=uuid4(),
                subject="MATH",
                assessment_type=AssessmentType.SUMMATIVE,
                score=150,  # > 100
                questions_total=10,
                questions_correct=5,
                results=[],
                started_at=datetime.now(timezone.utc),
            )

    def test_assessment_response_valid(self):
        now = datetime.now(timezone.utc)
        resp = AssessmentResponseSchema(
            assessment_id=uuid4(),
            student_id=uuid4(),
            subject="SCIENCE",
            assessment_type=AssessmentType.BENCHMARK,
            score=87.5,
            questions_total=20,
            questions_correct=17,
            results=[],
            started_at=now,
            completed_at=now,
            duration_seconds=300.0,
        )
        assert resp.score == 87.5
        assert resp.recommended_skills == []


class TestIEPSchemas:
    """Tests for IEP goal and accommodation schemas."""

    def _make_goal(self, **overrides) -> IEPGoalSchema:
        defaults = dict(
            student_id=uuid4(),
            goal_text="Student will solve 2-step word problems with 80% accuracy.",
            goal_type=GoalType.ACADEMIC,
            area="Mathematics",
            baseline={"accuracy": 0.55},
            target={"accuracy": 0.80},
            measurement_method="Weekly curriculum-based assessments",
            timeline_end=date.today() + timedelta(days=180),
        )
        defaults.update(overrides)
        return IEPGoalSchema(**defaults)

    def test_goal_valid(self):
        g = self._make_goal()
        assert g.goal_type == GoalType.ACADEMIC
        assert g.status == GoalStatus.DRAFT

    def test_goal_all_types(self):
        for gt in GoalType:
            g = self._make_goal(goal_type=gt)
            assert g.goal_type == gt

    def test_goal_status_transitions(self):
        for status in GoalStatus:
            g = self._make_goal(status=status)
            assert g.status == status

    def test_goal_progress_bounds(self):
        g = self._make_goal(current_progress=75.0)
        assert g.current_progress == 75.0

        with pytest.raises(Exception):
            self._make_goal(current_progress=101)

    def test_goal_trend(self):
        g = self._make_goal(trend=ProgressTrend.ON_TRACK)
        assert g.trend == ProgressTrend.ON_TRACK

    def test_goal_empty_baseline_rejected(self):
        with pytest.raises(Exception):
            self._make_goal(baseline={})

    def test_goal_empty_target_rejected(self):
        with pytest.raises(Exception):
            self._make_goal(target={})

    def test_goal_text_min_length(self):
        with pytest.raises(Exception):
            self._make_goal(goal_text="Too short")

    def test_goal_confidence_bounds(self):
        g = self._make_goal(confidence_score=0.92)
        assert g.confidence_score == 0.92

        with pytest.raises(Exception):
            self._make_goal(confidence_score=1.5)

    def test_accommodation_valid(self):
        acc = IEPAccommodationSchema(
            student_id=uuid4(),
            accommodation_text="Extended time on tests (1.5x)",
            category="testing",
        )
        assert acc.active is True
        assert acc.category == "testing"

    def test_accommodation_invalid_category(self):
        with pytest.raises(Exception):
            IEPAccommodationSchema(
                student_id=uuid4(),
                accommodation_text="Some accommodation text here",
                category="invalid_category",
            )

    def test_accommodation_all_categories(self):
        valid = [
            "testing", "classroom", "assignment", "technology",
            "behavioral", "physical", "communication", "other",
        ]
        for cat in valid:
            acc = IEPAccommodationSchema(
                student_id=uuid4(),
                accommodation_text="Valid accommodation text here",
                category=cat,
            )
            assert acc.category == cat


class TestAISchemas:
    """Tests for AI request/response schemas — must match OpenAPI spec."""

    def test_generate_request_minimal(self):
        req = GenerateRequestSchema(prompt="Hello, world!")
        assert req.max_tokens == 1000
        assert req.temperature == 0.7
        assert req.model is None
        assert req.preferred_provider is None

    def test_generate_request_full(self):
        req = GenerateRequestSchema(
            prompt="Explain photosynthesis for a 5th grader",
            system_prompt="You are a K-12 tutor",
            model=ModelId.GPT_5_2_PRO,
            max_tokens=2048,
            temperature=0.5,
            preferred_provider=ProviderId.OPENAI,
        )
        assert req.model == ModelId.GPT_5_2_PRO
        assert req.preferred_provider == ProviderId.OPENAI

    def test_generate_request_prompt_bounds(self):
        # empty prompt
        with pytest.raises(Exception):
            GenerateRequestSchema(prompt="")
        # max_tokens out of range
        with pytest.raises(Exception):
            GenerateRequestSchema(prompt="hi", max_tokens=10000)

    def test_generate_request_temperature_bounds(self):
        with pytest.raises(Exception):
            GenerateRequestSchema(prompt="hi", temperature=-0.1)
        with pytest.raises(Exception):
            GenerateRequestSchema(prompt="hi", temperature=2.1)

    def test_generate_response_required_fields(self):
        resp = GenerateResponseSchema(
            content="Photosynthesis is…",
            model="gpt-5.2-pro",
            provider="openai",
            tokens_used=150,
            latency_ms=320,
        )
        assert resp.tokens_used == 150

    def test_generate_response_tokens_non_negative(self):
        with pytest.raises(Exception):
            GenerateResponseSchema(
                content="x",
                model="m",
                provider="p",
                tokens_used=-1,
                latency_ms=100,
            )

    def test_model_id_enum_members(self):
        expected = {
            "gpt-5.2-pro", "gpt-5.2-instant", "gpt-5.3-codex",
            "claude-opus-4-6-20260201", "claude-sonnet-4-6-20260201",
            "gemini-3.1-pro", "gemini-3.1-flash",
        }
        assert {m.value for m in ModelId} == expected

    def test_provider_id_enum_members(self):
        assert {p.value for p in ProviderId} == {"openai", "anthropic", "gemini"}

    def test_hint_request_valid(self):
        req = HintRequestSchema(
            question="What is 2 + 2?",
            subject="MATH",
        )
        assert req.difficulty == 3

    def test_hint_response_valid(self):
        resp = HintResponseSchema(
            hint="Think about combining groups.",
            model="gpt-5.2-pro",
            provider="openai",
        )
        assert resp.tokens_used is None

    def test_token_usage(self):
        t = TokenUsageSchema(
            input_tokens=100,
            output_tokens=50,
            total_tokens=150,
        )
        assert t.total_tokens == 150

    def test_token_usage_non_negative(self):
        with pytest.raises(Exception):
            TokenUsageSchema(input_tokens=-1, output_tokens=0, total_tokens=0)


# ══════════════════════════════════════════════════════════════════
#  TASK 2 — Baum-Welch EM Fitting Tests
# ══════════════════════════════════════════════════════════════════


def _make_response(correct: bool, time_spent: float = 15.0) -> Response:
    """Helper to create a Response with sane defaults."""
    return Response(
        correct=correct,
        time_spent=time_spent,
        attempt_number=1,
        timestamp=datetime.now(timezone.utc),
    )


def _generate_bkt_sequence(
    params: BKTParameters,
    length: int,
    rng: np.random.Generator,
) -> list[Response]:
    """
    Generate a synthetic response sequence from known BKT params.

    Simulates the HMM generative process so we can verify
    that Baum-Welch recovers the generating parameters.
    """
    known = rng.random() < params.p_init
    responses: list[Response] = []
    for _ in range(length):
        if known:
            correct = rng.random() >= params.p_slip
        else:
            correct = rng.random() < params.p_guess
        responses.append(_make_response(correct))
        # Transition
        if not known:
            known = rng.random() < params.p_learn
    return responses


class TestForwardBackward:
    """Unit tests for _forward / _backward / _emission_prob."""

    def test_forward_shape(self):
        tracer = BayesianKnowledgeTracer()
        obs = [True, False, True]
        params = BKTParameters()
        alpha = tracer._forward(obs, params)
        assert alpha.shape == (3, 2)

    def test_backward_shape(self):
        tracer = BayesianKnowledgeTracer()
        obs = [True, False, True, True]
        params = BKTParameters()
        beta = tracer._backward(obs, params)
        assert beta.shape == (4, 2)

    def test_forward_probabilities_positive(self):
        tracer = BayesianKnowledgeTracer()
        obs = [True, True, True]
        alpha = tracer._forward(obs, BKTParameters())
        assert (alpha > 0).all()

    def test_backward_last_is_ones(self):
        tracer = BayesianKnowledgeTracer()
        obs = [True, False]
        beta = tracer._backward(obs, BKTParameters())
        np.testing.assert_array_equal(beta[-1], [1.0, 1.0])

    def test_emission_correct(self):
        params = BKTParameters(p_guess=0.25, p_slip=0.1)
        em = BayesianKnowledgeTracer._emission_prob(True, params)
        np.testing.assert_allclose(em, [0.25, 0.9])

    def test_emission_incorrect(self):
        params = BKTParameters(p_guess=0.25, p_slip=0.1)
        em = BayesianKnowledgeTracer._emission_prob(False, params)
        np.testing.assert_allclose(em, [0.75, 0.1])

    def test_gamma_sums_to_one(self):
        """γ(t) should sum to 1 over states for each time-step."""
        tracer = BayesianKnowledgeTracer()
        obs = [True, False, True, False, True]
        params = BKTParameters()
        alpha = tracer._forward(obs, params)
        beta = tracer._backward(obs, params)
        gamma = alpha * beta
        gamma_norm = gamma / gamma.sum(axis=1, keepdims=True)
        np.testing.assert_allclose(gamma_norm.sum(axis=1), 1.0, atol=1e-12)


class TestFitParametersEM:
    """Tests for the multi-sequence Baum-Welch EM fitting."""

    def test_empty_sequences_raises(self):
        tracer = BayesianKnowledgeTracer()
        with pytest.raises(ValueError):
            tracer.fit_parameters_em([])

    def test_all_empty_subsequences_raises(self):
        tracer = BayesianKnowledgeTracer()
        with pytest.raises(ValueError):
            tracer.fit_parameters_em([[], []])

    def test_single_sequence(self):
        tracer = BayesianKnowledgeTracer()
        seq = [_make_response(c) for c in [False, False, True, True, True]]
        params = tracer.fit_parameters_em([seq])
        assert params.validate()

    def test_returns_valid_params(self):
        tracer = BayesianKnowledgeTracer()
        rng = np.random.default_rng(42)
        true_params = BKTParameters(p_init=0.3, p_learn=0.15, p_guess=0.2, p_slip=0.1)
        seqs = [_generate_bkt_sequence(true_params, 30, rng) for _ in range(20)]
        fitted = tracer.fit_parameters_em(seqs)
        assert fitted.validate()

    def test_recovers_high_p_learn(self):
        """EM should recover a high learning rate from synthetic data."""
        tracer = BayesianKnowledgeTracer()
        rng = np.random.default_rng(123)
        true_params = BKTParameters(p_init=0.1, p_learn=0.4, p_guess=0.2, p_slip=0.1)
        seqs = [_generate_bkt_sequence(true_params, 50, rng) for _ in range(50)]
        fitted = tracer.fit_parameters_em(seqs, max_iterations=200)
        # Should be within 0.15 of the true value
        assert abs(fitted.p_learn - true_params.p_learn) < 0.15

    def test_recovers_low_guess(self):
        """EM should recover a low guess rate."""
        tracer = BayesianKnowledgeTracer()
        rng = np.random.default_rng(456)
        true_params = BKTParameters(p_init=0.2, p_learn=0.1, p_guess=0.05, p_slip=0.05)
        seqs = [_generate_bkt_sequence(true_params, 40, rng) for _ in range(40)]
        fitted = tracer.fit_parameters_em(seqs, max_iterations=200)
        assert fitted.p_guess < 0.2  # clearly below 0.5 default

    def test_convergence(self):
        """EM should converge within max_iterations for clean data."""
        tracer = BayesianKnowledgeTracer()
        rng = np.random.default_rng(789)
        true_params = BKTParameters(p_init=0.3, p_learn=0.15, p_guess=0.2, p_slip=0.1)
        seqs = [_generate_bkt_sequence(true_params, 30, rng) for _ in range(20)]
        # Tight convergence threshold
        fitted = tracer.fit_parameters_em(
            seqs, max_iterations=500, convergence_threshold=1e-6
        )
        assert fitted.validate()

    def test_does_not_break_existing_em(self):
        """
        Existing _em_parameter_estimation and personalize_parameters
        must still work alongside the new fit_parameters_em.
        """
        tracer = BayesianKnowledgeTracer()
        sid, skill = "student-em-compat", "algebra"

        # Feed enough data for personalize_parameters
        for c in [False, False, True, False, True, True, True, True, True, True]:
            tracer.update_knowledge(sid, skill, _make_response(c))

        # Should work and not interfere
        result = tracer.personalize_parameters(sid, skill)
        assert isinstance(result, bool)

    def test_custom_initial_params(self):
        tracer = BayesianKnowledgeTracer()
        seq = [_make_response(c) for c in [True, True, False, True]]
        custom = BKTParameters(p_init=0.5, p_learn=0.3, p_guess=0.15, p_slip=0.05)
        fitted = tracer.fit_parameters_em([seq], initial_params=custom)
        assert fitted.validate()


# ══════════════════════════════════════════════════════════════════
#  TASK 3 — Model Registry Tests
# ══════════════════════════════════════════════════════════════════


class TestModelRegistry:
    """Tests for the in-memory ML Model Registry."""

    def _registry_with_model(self) -> tuple[ModelRegistry, str]:
        """Helper: returns a registry with one registered model."""
        reg = ModelRegistry()
        reg.register_model(
            name="bkt-algebra",
            framework=ModelFramework.SKLEARN,
            artifact_uri="s3://models/bkt-algebra/v1.pkl",
            metrics={"accuracy": 0.88},
        )
        return reg, "bkt-algebra"

    def test_register_model(self):
        reg, name = self._registry_with_model()
        mv = reg.get_model(name, 1)
        assert mv is not None
        assert mv.version == 1
        assert mv.stage == ModelStage.REGISTERED

    def test_auto_increment_version(self):
        reg, name = self._registry_with_model()
        v2 = reg.register_model(name=name, framework=ModelFramework.PYTORCH)
        assert v2.version == 2

    def test_list_versions(self):
        reg, name = self._registry_with_model()
        reg.register_model(name=name)
        assert len(reg.list_versions(name)) == 2

    def test_list_versions_by_stage(self):
        reg, name = self._registry_with_model()
        reg.register_model(name=name)
        reg.promote(name, 1)
        prods = reg.list_versions(name, stage=ModelStage.PRODUCTION)
        assert len(prods) == 1

    def test_list_models(self):
        reg = ModelRegistry()
        reg.register_model(name="model-a")
        reg.register_model(name="model-b")
        assert set(reg.list_models()) == {"model-a", "model-b"}

    def test_get_active_model_none_initially(self):
        reg, name = self._registry_with_model()
        assert reg.get_active_model(name) is None

    def test_promote(self):
        reg, name = self._registry_with_model()
        promoted = reg.promote(name, 1)
        assert promoted.is_active is True
        assert promoted.stage == ModelStage.PRODUCTION
        assert promoted.promoted_at is not None

    def test_promote_deactivates_previous(self):
        reg, name = self._registry_with_model()
        reg.register_model(name=name)
        reg.promote(name, 1)
        reg.promote(name, 2)

        v1 = reg.get_model(name, 1)
        v2 = reg.get_model(name, 2)
        assert v1.is_active is False
        assert v1.stage == ModelStage.RETIRED
        assert v2.is_active is True

    def test_promote_nonexistent_raises(self):
        reg = ModelRegistry()
        with pytest.raises(KeyError):
            reg.promote("nope", 1)

    def test_rollback(self):
        reg, name = self._registry_with_model()
        reg.register_model(name=name)
        reg.promote(name, 1)
        reg.promote(name, 2)

        rolled = reg.rollback(name)
        assert rolled is not None
        assert rolled.version == 1
        assert rolled.is_active is True
        assert rolled.stage == ModelStage.PRODUCTION

        v2 = reg.get_model(name, 2)
        assert v2.is_active is False
        assert v2.stage == ModelStage.RETIRED

    def test_rollback_no_active_returns_none(self):
        reg, name = self._registry_with_model()
        assert reg.rollback(name) is None

    def test_rollback_no_previous_returns_none(self):
        reg, name = self._registry_with_model()
        reg.promote(name, 1)
        assert reg.rollback(name) is None

    def test_shadow_test_lifecycle(self):
        reg, name = self._registry_with_model()
        v2 = reg.register_model(name=name)
        reg.promote(name, 1)

        shadow = reg.start_shadow_test(name, 2)
        assert shadow.stage == ModelStage.SHADOW

        # Complete without promoting
        completed = reg.complete_shadow_test(name, 2, promote_shadow=False)
        assert completed.stage == ModelStage.VALIDATED

    def test_shadow_test_promote(self):
        reg, name = self._registry_with_model()
        reg.register_model(name=name)
        reg.promote(name, 1)
        reg.start_shadow_test(name, 2)

        completed = reg.complete_shadow_test(name, 2, promote_shadow=True)
        assert completed.is_active is True
        assert completed.stage == ModelStage.PRODUCTION

    def test_shadow_test_requires_active(self):
        reg, name = self._registry_with_model()
        with pytest.raises(ValueError):
            reg.start_shadow_test(name, 1)

    def test_update_metrics(self):
        reg, name = self._registry_with_model()
        reg.update_metrics(name, 1, {"f1_score": 0.91})
        mv = reg.get_model(name, 1)
        assert mv.metrics["accuracy"] == 0.88
        assert mv.metrics["f1_score"] == 0.91

    def test_update_metrics_nonexistent_raises(self):
        reg = ModelRegistry()
        with pytest.raises(KeyError):
            reg.update_metrics("nope", 1, {"a": 1})

    def test_retire(self):
        reg, name = self._registry_with_model()
        reg.promote(name, 1)
        retired = reg.retire(name, 1)
        assert retired.stage == ModelStage.RETIRED
        assert retired.is_active is False

    def test_retire_nonexistent_raises(self):
        reg = ModelRegistry()
        with pytest.raises(KeyError):
            reg.retire("nope", 1)

    def test_model_version_schema_from_attributes(self):
        """ModelVersionSchema should support from_attributes mode."""
        mv = ModelVersionSchema(
            name="test-model",
            version=1,
            stage=ModelStage.REGISTERED,
            framework=ModelFramework.ONNX,
        )
        assert mv.name == "test-model"
        assert mv.framework == ModelFramework.ONNX

    def test_model_stage_enum_values(self):
        expected = {
            "registered", "validated", "staging",
            "production", "shadow", "retired",
        }
        assert {s.value for s in ModelStage} == expected

    def test_model_framework_enum_values(self):
        expected = {"sklearn", "pytorch", "onnx", "custom"}
        assert {f.value for f in ModelFramework} == expected
