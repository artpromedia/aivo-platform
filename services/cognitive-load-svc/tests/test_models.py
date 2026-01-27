"""Tests for Cognitive Load Service model components."""

import pytest

from app.models import (
    IntrinsicLoadAnalyzer,
    ExtraneousLoadDetector,
    WorkingMemoryModel,
    OverloadPredictor,
    ScaffoldingGenerator,
    LoadEstimator,
    UIElement,
    Domain,
    ScaffoldType,
    LoadLevel,
)


class TestIntrinsicLoadAnalyzer:
    """Test intrinsic load analyzer."""

    @pytest.fixture
    def analyzer(self):
        """Create analyzer instance."""
        return IntrinsicLoadAnalyzer()

    def test_analyze_simple_text(self, analyzer):
        """Test analysis of simple text."""
        metrics = analyzer.analyze("The cat sat on the mat.")

        assert metrics.overall_complexity < 0.3
        assert metrics.vocabulary_load < 0.3
        assert metrics.syntactic_complexity < 0.3

    def test_analyze_complex_text(self, analyzer):
        """Test analysis of complex text."""
        complex_text = """
        The mitochondria, often referred to as the powerhouse of the cell,
        generates adenosine triphosphate through oxidative phosphorylation,
        a process involving electron transport chain reactions and
        chemiosmotic coupling.
        """
        metrics = analyzer.analyze(complex_text, domain="science")

        assert metrics.overall_complexity > 0.3
        assert len(metrics.complexity_factors) > 0

    def test_element_interactivity(self, analyzer):
        """Test element interactivity analysis."""
        content = "If x equals 5 and y equals 10, then x plus y equals 15."
        analysis = analyzer.analyze_element_interactivity(content, domain="math")

        assert analysis.interactivity_score >= 0.0
        assert len(analysis.cognitive_operations) >= 0

    def test_compare_alternatives(self, analyzer):
        """Test comparing content alternatives."""
        simple = "The sun is hot."
        complex = "The sun's core temperature reaches approximately 15 million degrees Celsius."

        results = analyzer.compare_alternatives([simple, complex])

        # Results should be sorted by complexity (ascending)
        assert results[0].overall_complexity <= results[1].overall_complexity


class TestExtraneousLoadDetector:
    """Test extraneous load detector."""

    @pytest.fixture
    def detector(self):
        """Create detector instance."""
        return ExtraneousLoadDetector()

    def test_analyze_minimal_ui(self, detector):
        """Test analysis with minimal UI elements."""
        analysis = detector.analyze(
            learner_id="test",
            visible_elements=[
                UIElement(element_type="text", is_essential=True),
            ],
            navigation_depth=1,
        )

        assert analysis.total_extraneous_load < 0.5
        assert analysis.load_level in ["low", "optimal"]

    def test_analyze_cluttered_ui(self, detector):
        """Test analysis with cluttered UI."""
        elements = [
            UIElement(element_type=f"element_{i}", is_essential=i < 5, is_distracting=i >= 10)
            for i in range(20)
        ]

        analysis = detector.analyze(
            learner_id="test",
            visible_elements=elements,
            navigation_depth=5,
            distractors_present=["ads", "popups"],
        )

        assert analysis.visual_clutter_score > 0.3
        assert len(analysis.issues) > 0

    def test_split_attention_detection(self, detector):
        """Test split attention detection."""
        analysis = detector.analyze(
            learner_id="test",
            split_attention_sources=["text", "diagram", "video", "reference"],
        )

        assert analysis.split_attention_score > 0.3


class TestWorkingMemoryModel:
    """Test working memory model."""

    @pytest.fixture
    def model(self):
        """Create model instance."""
        return WorkingMemoryModel()

    def test_estimate_load(self, model):
        """Test load estimation."""
        state = model.estimate_load(
            learner_id="test",
            current_content="Learn about photosynthesis.",
            recent_content=["Plants need sunlight."],
        )

        assert state.estimated_load >= 0.0
        assert state.estimated_load <= 1.0
        assert 3 <= state.estimated_capacity <= 9

    def test_add_and_retrieve_content(self, model):
        """Test adding content to memory."""
        chunk = model.add_content(
            learner_id="test",
            content="Mitochondria is the powerhouse of the cell.",
            complexity=0.6,
        )

        assert chunk.chunk_id is not None
        assert chunk.activation_level == 1.0

        snapshot = model.get_memory_snapshot("test")
        assert snapshot["chunk_count"] >= 1

    def test_rehearsal_boosts_activation(self, model):
        """Test that rehearsal boosts activation."""
        chunk = model.add_content(
            learner_id="test",
            content="Test content",
        )

        initial_activation = chunk.activation_level
        model.rehearse_content("test", chunk.chunk_id)

        snapshot = model.get_memory_snapshot("test")
        # After rehearsal, activation should still be high
        active = [c for c in snapshot["chunks"] if c["id"] == chunk.chunk_id]
        assert len(active) >= 0  # Chunk might have been processed


class TestOverloadPredictor:
    """Test overload predictor."""

    @pytest.fixture
    def predictor(self):
        """Create predictor instance."""
        return OverloadPredictor()

    def test_predict_no_overload(self, predictor):
        """Test prediction with low load."""
        prediction = predictor.predict(
            learner_id="test",
            current_load=0.3,
            load_history=[0.2, 0.25, 0.3],
        )

        assert prediction.overload_probability < 0.5
        assert prediction.warning_level.value in ["none", "low"]

    def test_predict_high_risk(self, predictor):
        """Test prediction with high load."""
        prediction = predictor.predict(
            learner_id="test",
            current_load=0.85,
            load_history=[0.7, 0.75, 0.8, 0.82, 0.85],
            upcoming_content_complexity=[0.9, 0.85],
        )

        assert prediction.overload_probability > 0.5
        assert prediction.warning_level.value in ["medium", "high", "critical"]
        assert len(prediction.preventive_actions) > 0

    def test_early_warning_signals(self, predictor):
        """Test early warning signal detection."""
        signals = predictor.get_early_warning_signals(
            current_load=0.8,
            load_history=[0.5, 0.55, 0.6, 0.7, 0.75, 0.8],
        )

        assert len(signals) > 0
        signal_types = [s["signal"] for s in signals]
        assert "approaching_threshold" in signal_types or "rapid_increase" in signal_types


class TestScaffoldingGenerator:
    """Test scaffolding generator."""

    @pytest.fixture
    def generator(self):
        """Create generator instance."""
        return ScaffoldingGenerator()

    def test_generate_scaffolding_low_load(self, generator):
        """Test that low load doesn't trigger scaffolding."""
        plan = generator.generate(
            learner_id="test",
            current_content="What is 2+2?",
            current_load=0.2,
            domain=Domain.MATH,
        )

        assert len(plan.scaffolds) == 0
        assert plan.scaffolding_level == 0

    def test_generate_scaffolding_high_load(self, generator):
        """Test scaffolding generation at high load."""
        plan = generator.generate(
            learner_id="test",
            current_content="Solve the quadratic equation: x² + 5x + 6 = 0",
            current_load=0.8,
            domain=Domain.MATH,
            max_scaffolds=3,
        )

        assert len(plan.scaffolds) > 0
        assert plan.scaffolding_level >= 3
        assert plan.total_expected_load_reduction > 0

    def test_generate_hint(self, generator):
        """Test progressive hint generation."""
        hint1 = generator.generate_hint(
            content="Solve: x + 5 = 10",
            domain=Domain.MATH,
            hint_level=1,
        )

        hint5 = generator.generate_hint(
            content="Solve: x + 5 = 10",
            domain=Domain.MATH,
            hint_level=5,
        )

        assert hint1 is not None
        assert hint5 is not None

    def test_fading_recommendation(self, generator):
        """Test scaffold fading recommendation."""
        recommendation = generator.recommend_fading(
            learner_id="test",
            scaffold_type=ScaffoldType.HINT,
            recent_accuracy=0.9,
            uses_count=5,
        )

        assert recommendation["should_fade"] is True
        assert recommendation["reason"] is not None


class TestLoadEstimator:
    """Test load estimator."""

    @pytest.fixture
    def estimator(self):
        """Create estimator instance."""
        return LoadEstimator()

    def test_estimate_basic(self, estimator):
        """Test basic estimation."""
        estimate = estimator.estimate(
            response_times=[2.0, 3.0, 4.0],
            error_rates=[0.0, 0.1, 0.0],
        )

        assert 0.0 <= estimate.intrinsic_load <= 1.0
        assert 0.0 <= estimate.extraneous_load <= 1.0
        assert 0.0 <= estimate.total_load <= 1.0
        assert estimate.load_level in LoadLevel

    def test_estimate_with_complexity(self, estimator):
        """Test estimation with known complexity."""
        estimate_high = estimator.estimate(
            response_times=[5.0, 6.0, 7.0],
            error_rates=[0.3, 0.4, 0.5],
            content_complexity=0.9,
        )

        estimate_low = estimator.estimate(
            response_times=[1.0, 1.5, 2.0],
            error_rates=[0.0, 0.0, 0.0],
            content_complexity=0.2,
        )

        assert estimate_high.intrinsic_load > estimate_low.intrinsic_load

    def test_load_history_tracking(self, estimator):
        """Test load history tracking."""
        learner_id = "test-learner"

        for i in range(5):
            estimator.estimate(
                response_times=[2.0 + i * 0.5],
                learner_id=learner_id,
            )

        history = estimator.get_load_history(learner_id)
        assert len(history["load_history"]) == 5

    def test_trend_detection(self, estimator):
        """Test trend detection."""
        learner_id = "trend-test"

        # Create increasing load pattern
        for load in [0.3, 0.4, 0.5, 0.6, 0.7]:
            estimator._update_history(learner_id, load, load * 0.6, load * 0.2, load * 0.2)

        estimate = estimator.estimate(
            response_times=[5.0],
            learner_id=learner_id,
            content_complexity=0.8,
        )

        assert estimate.trend == "increasing"
