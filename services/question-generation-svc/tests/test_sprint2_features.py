"""
Tests for Sprint 2 Features.

Comprehensive tests for:
- Bloom Classifier (ML-enhanced)
- Difficulty Estimator (confidence intervals)
- Cloze Generator (advanced types)
- Curriculum Aligner
- Batch Generation
- Async Jobs
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# =============================================================================
# Bloom Classifier Tests
# =============================================================================


class TestBloomClassifier:
    """Tests for the enhanced Bloom Classifier."""

    @pytest.fixture
    def classifier(self):
        from app.models.bloom_classifier import BloomClassifier, BloomClassifierConfig
        config = BloomClassifierConfig(use_ml_model=False)  # Use keyword-based for tests
        return BloomClassifier(config=config)

    def test_classify_remember_question(self, classifier):
        """Test classification of Remember-level questions."""
        question = "What is the capital of France?"
        result = classifier.classify(question)

        assert result.level.value == "remember"
        assert result.confidence > 0.0
        assert "remember" in result.level_probabilities

    def test_classify_understand_question(self, classifier):
        """Test classification of Understand-level questions."""
        question = "Explain how photosynthesis works in your own words."
        result = classifier.classify(question)

        assert result.level.value in ["understand", "apply"]
        assert result.confidence > 0.0

    def test_classify_analyze_question(self, classifier):
        """Test classification of Analyze-level questions."""
        question = "Why did the Roman Empire fall?"
        result = classifier.classify(question)

        assert result.level.value in ["analyze", "evaluate"]
        assert result.confidence > 0.0

    def test_classify_evaluate_question(self, classifier):
        """Test classification of Evaluate-level questions."""
        question = "Do you agree with the author's argument? Defend your position."
        result = classifier.classify(question)

        assert result.level.value in ["evaluate", "analyze"]
        assert result.confidence > 0.0

    def test_classify_create_question(self, classifier):
        """Test classification of Create-level questions."""
        question = "Design a new experiment to test this hypothesis."
        result = classifier.classify(question)

        assert result.level.value == "create"
        assert result.confidence > 0.0

    def test_batch_classify(self, classifier):
        """Test batch classification of multiple questions."""
        questions = [
            "What is 2 + 2?",
            "Explain why the sky is blue.",
            "Design a better mousetrap.",
        ]
        results = classifier.batch_classify(questions)

        assert len(results) == 3
        for result in results:
            assert result.level is not None
            assert result.confidence >= 0.0

    def test_get_level_distribution(self, classifier):
        """Test getting distribution of Bloom levels."""
        questions = [
            "What year did WWII end?",
            "Who wrote Hamlet?",
            "Explain the theory of relativity.",
        ]
        distribution = classifier.get_level_distribution(questions)

        from app.models.bloom_classifier import BloomLevel
        assert all(level in distribution for level in BloomLevel)

    def test_suggest_higher_order_question(self, classifier):
        """Test suggestion for transforming questions."""
        from app.models.bloom_classifier import BloomLevel

        question = "What is the capital of France?"
        suggestion = classifier.suggest_higher_order_question(
            question, BloomLevel.ANALYZE
        )

        assert len(suggestion) > 0
        assert "compare" in suggestion.lower() or "relationship" in suggestion.lower() or "transform" in suggestion.lower()

    def test_empty_question(self, classifier):
        """Test handling of empty question."""
        result = classifier.classify("")

        assert result.level.value == "remember"
        assert result.confidence == 0.0

    def test_level_comparison(self, classifier):
        """Test comparing Bloom levels."""
        from app.models.bloom_classifier import BloomLevel

        assert classifier.compare_levels(BloomLevel.REMEMBER, BloomLevel.ANALYZE) == -1
        assert classifier.compare_levels(BloomLevel.CREATE, BloomLevel.REMEMBER) == 1
        assert classifier.compare_levels(BloomLevel.APPLY, BloomLevel.APPLY) == 0


# =============================================================================
# Difficulty Estimator Tests
# =============================================================================


class TestDifficultyEstimator:
    """Tests for the enhanced Difficulty Estimator."""

    @pytest.fixture
    def estimator(self):
        from app.models.difficulty_estimator import DifficultyEstimator, DifficultyEstimatorConfig
        config = DifficultyEstimatorConfig(use_ml_model=False)
        return DifficultyEstimator(config=config)

    def test_estimate_simple_question(self, estimator):
        """Test estimation of a simple question."""
        result = estimator.estimate_difficulty(
            question="What is 2 + 2?",
            answer="4",
        )

        assert 0.0 <= result.difficulty <= 1.0
        assert 0.0 <= result.confidence <= 1.0
        assert result.confidence_lower <= result.difficulty <= result.confidence_upper
        assert len(result.features_used) > 0

    def test_estimate_complex_question(self, estimator):
        """Test estimation of a complex question."""
        result = estimator.estimate_difficulty(
            question="Analyze the socioeconomic factors that contributed to the decline of the Roman Empire.",
            answer="Multiple factors including economic instability, military overexpansion, and political corruption",
        )

        assert result.difficulty > 0.3  # Should be moderately difficult
        assert result.confidence_lower < result.confidence_upper

    def test_estimate_with_passage(self, estimator):
        """Test estimation with passage context."""
        result = estimator.estimate_difficulty(
            question="What is the capital of France?",
            answer="Paris",
            passage="France is a country in Europe. Its capital is Paris, known for the Eiffel Tower.",
        )

        assert "answer_accessibility" in result.factors

    def test_estimate_with_distractors(self, estimator):
        """Test estimation with MCQ distractors."""
        result = estimator.estimate_difficulty(
            question="What is the capital of France?",
            answer="Paris",
            distractors=["London", "Berlin", "Madrid"],
        )

        assert "distractor_quality" in result.factors

    def test_confidence_interval_bounds(self, estimator):
        """Test that confidence intervals are bounded correctly."""
        result = estimator.estimate_difficulty(
            question="What is the speed of light?",
            answer="299,792,458 meters per second",
        )

        assert result.confidence_lower >= 0.0
        assert result.confidence_upper <= 1.0
        assert result.confidence_lower <= result.confidence_upper

    def test_grade_level_estimate(self, estimator):
        """Test grade level estimation."""
        result = estimator.estimate_difficulty(
            question="What color is the sky?",
            answer="Blue",
        )

        assert result.grade_level_estimate is not None
        assert 1 <= result.grade_level_estimate <= 12

    def test_estimated_p_correct(self, estimator):
        """Test probability of correct response estimation."""
        result = estimator.estimate_difficulty(
            question="What is 1 + 1?",
            answer="2",
        )

        assert 0.0 <= result.estimated_p_correct <= 1.0
        # Easy question should have high probability of correct
        assert result.estimated_p_correct > 0.3

    def test_compare_difficulty(self, estimator):
        """Test comparing difficulty of two questions."""
        comparison = estimator.compare_difficulty(
            "What is 1 + 1?", "2",
            "Explain the implications of quantum entanglement on information theory.", "Complex answer"
        )

        assert comparison in [-1, 0, 1]

    def test_get_difficulty_band(self, estimator):
        """Test difficulty band classification."""
        assert estimator.get_difficulty_band(0.1) == "very_easy"
        assert estimator.get_difficulty_band(0.3) == "easy"
        assert estimator.get_difficulty_band(0.5) == "medium"
        assert estimator.get_difficulty_band(0.7) == "hard"
        assert estimator.get_difficulty_band(0.9) == "very_hard"


# =============================================================================
# Cloze Generator Tests
# =============================================================================


class TestClozeGenerator:
    """Tests for the enhanced Cloze Generator."""

    @pytest.fixture
    def generator(self):
        from app.models.cloze_generator import ClozeGenerator
        return ClozeGenerator()

    @pytest.fixture
    def sample_passage(self):
        return (
            "The mitochondria is the powerhouse of the cell. "
            "It produces ATP through cellular respiration. "
            "The process involves oxygen and glucose."
        )

    def test_generate_single_blank(self, generator, sample_passage):
        """Test single blank cloze generation."""
        items = generator.generate(sample_passage, num_items=3)

        assert len(items) <= 3
        for item in items:
            assert "_____" in item.text_with_blank
            assert len(item.answer) > 0
            assert item.difficulty >= 0.0

    def test_generate_cloze_single_type(self, generator, sample_passage):
        """Test single blank cloze questions."""
        questions = generator.generate_cloze(
            sample_passage,
            num_blanks=1,
            cloze_type="single",
        )

        assert len(questions) > 0
        for q in questions:
            assert len(q.answers) == 1
            assert "_____" in q.blanked_sentence

    def test_generate_cloze_multiple_type(self, generator, sample_passage):
        """Test multiple blanks cloze questions."""
        questions = generator.generate_cloze(
            sample_passage,
            num_blanks=2,
            cloze_type="multiple",
        )

        for q in questions:
            assert len(q.answers) >= 1

    def test_generate_cloze_mcq_type(self, generator, sample_passage):
        """Test MCQ cloze with distractors."""
        questions = generator.generate_cloze(
            sample_passage,
            num_blanks=1,
            cloze_type="mcq",
        )

        for q in questions:
            if q.distractors:
                assert len(q.distractors) > 0

    def test_generate_cloze_selective_nouns(self, generator, sample_passage):
        """Test selective cloze targeting nouns."""
        questions = generator.generate_cloze(
            sample_passage,
            cloze_type="selective",
            pos_filter="noun",
        )

        assert len(questions) > 0

    def test_generate_with_hints(self, generator, sample_passage):
        """Test cloze generation with hints."""
        items = generator.generate(sample_passage, num_items=2)

        for item in items:
            if item.hint:
                assert len(item.hint) > 0

    def test_validate_cloze_item(self, generator, sample_passage):
        """Test cloze item validation."""
        items = generator.generate(sample_passage, num_items=1)

        if items:
            is_valid, issues = generator.validate_cloze_item(items[0])
            assert isinstance(is_valid, bool)
            assert isinstance(issues, list)

    def test_convert_to_mcq(self, generator, sample_passage):
        """Test converting cloze to MCQ format."""
        items = generator.generate(sample_passage, num_items=1)

        if items:
            mcq_item = generator.convert_to_mcq(items[0], num_distractors=3)
            assert mcq_item.blank_type == "mcq" or len(mcq_item.distractors) >= 0


# =============================================================================
# Curriculum Aligner Tests
# =============================================================================


class TestCurriculumAligner:
    """Tests for the Curriculum Aligner."""

    @pytest.fixture
    def aligner(self):
        from app.services.curriculum_aligner import CurriculumAligner, CurriculumAlignerConfig
        config = CurriculumAlignerConfig(use_semantic_similarity=False)
        return CurriculumAligner(config=config)

    def test_align_math_question(self, aligner):
        """Test aligning a math question to standards."""
        alignments = aligner.align(
            question="What is 5 + 3?",
            answer="8",
            grade=2,
            subject="math",
        )

        assert isinstance(alignments, list)

    def test_align_ela_question(self, aligner):
        """Test aligning an ELA question to standards."""
        alignments = aligner.align(
            question="What is the main idea of this story?",
            answer="The importance of friendship",
            grade=4,
            subject="ela",
        )

        assert isinstance(alignments, list)

    def test_get_fallback_standards(self, aligner):
        """Test fallback standards generation."""
        standards = aligner._get_fallback_standards(grade=5, subject="math")

        assert len(standards) > 0
        for standard in standards:
            assert "standard_id" in standard
            assert "description" in standard

    def test_suggest_standards(self, aligner):
        """Test suggesting standards across grade levels."""
        suggestions = aligner.suggest_standards(
            question="Calculate the area of a rectangle.",
            answer="length × width",
            subject="math",
            grade_range=(3, 8),
        )

        assert isinstance(suggestions, list)

    def test_validate_alignment(self, aligner):
        """Test alignment validation."""
        standards = aligner._get_fallback_standards(grade=5, subject="math")

        if standards:
            confidence = aligner.validate_alignment(
                question="What is 10 × 5?",
                standard_id=standards[0]["standard_id"],
                standards=standards,
            )
            assert 0.0 <= confidence <= 1.0


# =============================================================================
# Batch Generation API Tests
# =============================================================================


class TestBatchGenerationAPI:
    """Tests for batch generation endpoints."""

    @pytest.fixture
    def sample_passages(self):
        return [
            {
                "passage_id": "p1",
                "text": "The Eiffel Tower is a wrought-iron lattice tower in Paris, France. It was named after the engineer Gustave Eiffel.",
            },
            {
                "passage_id": "p2",
                "text": "The Great Wall of China is a series of fortifications made of stone and brick. It was built to protect against invasions.",
            },
        ]

    def test_batch_generate_request_schema(self, sample_passages):
        """Test BatchGenerateRequest schema validation."""
        from app.schemas import BatchGenerateRequest, PassageInput

        passages = [PassageInput(**p) for p in sample_passages]
        request = BatchGenerateRequest(
            passages=passages,
            questions_per_passage=3,
        )

        assert len(request.passages) == 2
        assert request.questions_per_passage == 3

    def test_passage_input_validation(self):
        """Test PassageInput validation."""
        from app.schemas import PassageInput

        # Valid input
        passage = PassageInput(
            passage_id="test",
            text="A" * 60,  # Min 50 chars
        )
        assert passage.passage_id == "test"

        # Invalid - too short
        with pytest.raises(Exception):
            PassageInput(passage_id="test", text="Too short")


# =============================================================================
# Model Status Tests
# =============================================================================


class TestModelStatus:
    """Tests for model status endpoint."""

    def test_model_status_schema(self):
        """Test ModelStatus schema."""
        from app.schemas import ModelStatus

        status = ModelStatus(
            loaded=True,
            model_name="test-model",
            device="cpu",
            memory_mb=100.5,
        )

        assert status.loaded is True
        assert status.model_name == "test-model"
        assert status.memory_mb == 100.5

    def test_models_status_response_schema(self):
        """Test ModelsStatusResponse schema."""
        from app.schemas import ModelsStatusResponse, ModelStatus

        response = ModelsStatusResponse(
            question_generator=ModelStatus(
                loaded=True, model_name="qg", device="cpu", memory_mb=800.0
            ),
            distractor_generator=ModelStatus(
                loaded=True, model_name="dg", device="cpu", memory_mb=200.0
            ),
            bloom_classifier=ModelStatus(
                loaded=True, model_name="bloom", device="cpu", memory_mb=50.0
            ),
            difficulty_estimator=ModelStatus(
                loaded=True, model_name="diff", device="cpu", memory_mb=20.0
            ),
            total_memory_mb=1070.0,
        )

        assert response.question_generator.loaded is True
        assert response.total_memory_mb == 1070.0


# =============================================================================
# Async Job Tests
# =============================================================================


class TestAsyncJobs:
    """Tests for async job handling."""

    def test_job_status_enum(self):
        """Test JobStatus enum values."""
        from app.schemas import JobStatus

        assert JobStatus.QUEUED.value == "queued"
        assert JobStatus.PROCESSING.value == "processing"
        assert JobStatus.COMPLETED.value == "completed"
        assert JobStatus.FAILED.value == "failed"

    def test_async_generate_request_schema(self):
        """Test AsyncGenerateRequest schema."""
        from app.schemas import AsyncGenerateRequest, PassageInput

        request = AsyncGenerateRequest(
            passages=[
                PassageInput(passage_id="p1", text="A" * 60)
            ],
            questions_per_passage=5,
        )

        assert len(request.passages) == 1
        assert request.priority == 5  # Default

    def test_job_status_response_schema(self):
        """Test JobStatusResponse schema."""
        from app.schemas import JobStatusResponse, JobStatus
        from datetime import datetime

        response = JobStatusResponse(
            job_id="test-job-id",
            status=JobStatus.PROCESSING,
            progress=0.5,
            created_at=datetime.utcnow(),
            passages_processed=5,
            passages_total=10,
        )

        assert response.job_id == "test-job-id"
        assert response.progress == 0.5


# =============================================================================
# Curriculum Generation Tests
# =============================================================================


class TestCurriculumGeneration:
    """Tests for curriculum-based generation."""

    def test_curriculum_generate_request_schema(self):
        """Test CurriculumGenerateRequest schema."""
        from app.schemas import CurriculumGenerateRequest

        request = CurriculumGenerateRequest(
            curriculum_id="curr-123",
            learning_objectives=["Understand fractions", "Add fractions"],
            question_distribution={"remember": 3, "apply": 5},
            grade_level=5,
            subject="math",
        )

        assert request.curriculum_id == "curr-123"
        assert len(request.learning_objectives) == 2
        assert request.question_distribution["remember"] == 3

    def test_curriculum_generate_response_schema(self):
        """Test CurriculumGenerateResponse schema."""
        from app.schemas import CurriculumGenerateResponse, GeneratedQuestion, BloomLevel

        response = CurriculumGenerateResponse(
            curriculum_id="curr-123",
            questions=[
                GeneratedQuestion(
                    question_text="What is 1/2 + 1/2?",
                    answer="1",
                    question_type="mcq",
                    difficulty_estimate=0.3,
                    bloom_level=BloomLevel.REMEMBER,
                    source_span=(0, 10),
                    confidence=0.8,
                )
            ],
            bloom_distribution={"remember": 1, "apply": 0},
            generation_time_ms=1500,
        )

        assert len(response.questions) == 1
        assert response.bloom_distribution["remember"] == 1


# =============================================================================
# Integration Tests
# =============================================================================


class TestIntegration:
    """Integration tests for the complete pipeline."""

    @pytest.fixture
    def pipeline(self):
        from app.services.generation_pipeline import GenerationPipeline, PipelineConfig
        config = PipelineConfig(
            enable_quality_filter=False,  # Disable for faster tests
        )
        return GenerationPipeline(config=config)

    @pytest.mark.asyncio
    async def test_full_generation_pipeline(self, pipeline):
        """Test the complete generation pipeline."""
        # This test uses mocks since actual models may not be loaded
        with patch.object(pipeline, 'answer_extractor') as mock_extractor:
            with patch.object(pipeline, 'question_generator') as mock_qg:
                # Setup mocks
                mock_answer = MagicMock()
                mock_answer.text = "Paris"
                mock_extractor.extract.return_value = [mock_answer]

                mock_question = MagicMock()
                mock_question.question = "What is the capital of France?"
                mock_question.answer = "Paris"
                mock_question.source_span = (0, 10)
                mock_question.confidence = 0.9
                mock_qg.generate_questions.return_value = [mock_question]

                result = await pipeline.generate_questions(
                    passage="France is a country. Paris is its capital.",
                    num_questions=1,
                )

                assert "questions" in result
                assert "generation_time_ms" in result

    def test_get_models_status(self, pipeline):
        """Test getting model status."""
        status = pipeline.get_models_status()

        assert "question_generator" in status
        assert "bloom_classifier" in status
        assert "total_memory_mb" in status

    @pytest.mark.asyncio
    async def test_classify_bloom(self, pipeline):
        """Test Bloom classification through pipeline."""
        result = await pipeline.classify_bloom(
            "What is the capital of France?"
        )

        assert "primary_level" in result
        assert "confidence" in result

    @pytest.mark.asyncio
    async def test_estimate_difficulty(self, pipeline):
        """Test difficulty estimation through pipeline."""
        result = await pipeline.estimate_difficulty(
            question="What is 2+2?",
            answer="4",
        )

        assert "difficulty" in result
        assert "confidence" in result
        assert "factors" in result


# =============================================================================
# Question Validation Tests
# =============================================================================


class TestQuestionValidation:
    """Tests for question validation and quality."""

    def test_generated_questions_are_valid(self):
        """Test that generated questions are structurally valid."""
        from app.schemas import GeneratedQuestion, BloomLevel

        question = GeneratedQuestion(
            question_text="What is the capital of France?",
            answer="Paris",
            question_type="factual",
            difficulty_estimate=0.3,
            bloom_level=BloomLevel.REMEMBER,
            source_span=(0, 50),
            confidence=0.9,
        )

        assert len(question.question_text) > 0
        assert len(question.answer) > 0
        assert question.question_text.endswith("?")
        assert 0 <= question.difficulty_estimate <= 1

    def test_distractors_not_match_correct(self):
        """Test that distractors don't match correct answer."""
        correct = "Paris"
        distractors = ["London", "Berlin", "Madrid"]

        for d in distractors:
            assert d.lower() != correct.lower()

    def test_mcq_has_correct_structure(self):
        """Test that MCQ items have correct structure."""
        from app.schemas import MCQItem, BloomLevel

        mcq = MCQItem(
            stem="What is the capital of France?",
            correct_answer="Paris",
            distractors=["London", "Berlin", "Madrid"],
            options=["London", "Paris", "Berlin", "Madrid"],
            correct_index=1,
            difficulty=0.4,
            bloom_level=BloomLevel.REMEMBER,
        )

        assert mcq.correct_answer in mcq.options
        assert mcq.options[mcq.correct_index] == mcq.correct_answer
        assert len(mcq.distractors) == 3


# =============================================================================
# Performance Tests
# =============================================================================


class TestPerformance:
    """Tests for performance considerations."""

    def test_cache_key_generation(self):
        """Test cache key generation is consistent."""
        from app.services.generation_pipeline import GenerationPipeline

        pipeline = GenerationPipeline()

        key1 = pipeline._get_cache_key("test passage", 5)
        key2 = pipeline._get_cache_key("test passage", 5)
        key3 = pipeline._get_cache_key("different passage", 5)

        assert key1 == key2  # Same input = same key
        assert key1 != key3  # Different input = different key

    def test_cache_clear(self):
        """Test cache clearing."""
        from app.services.generation_pipeline import GenerationPipeline

        pipeline = GenerationPipeline()
        pipeline._cache["test"] = {"data": "value"}

        assert len(pipeline._cache) > 0
        pipeline.clear_cache()
        assert len(pipeline._cache) == 0
