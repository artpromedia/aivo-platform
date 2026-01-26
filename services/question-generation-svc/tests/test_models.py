"""
Unit tests for ML models.
"""

import pytest


class TestBloomClassifier:
    """Tests for Bloom's taxonomy classifier."""

    def test_classify_remember_question(self, bloom_classifier):
        """Test classification of 'remember' level question."""
        result = bloom_classifier.classify("What is the capital of France?")
        assert result.primary_level.value == "remember"
        assert result.confidence > 0

    def test_classify_understand_question(self, bloom_classifier):
        """Test classification of 'understand' level question."""
        result = bloom_classifier.classify("Explain how photosynthesis works.")
        assert result.primary_level.value in ["understand", "remember"]

    def test_classify_analyze_question(self, bloom_classifier):
        """Test classification of 'analyze' level question."""
        result = bloom_classifier.classify("Why did the Roman Empire fall?")
        assert result.primary_level.value == "analyze"

    def test_classify_evaluate_question(self, bloom_classifier):
        """Test classification of 'evaluate' level question."""
        result = bloom_classifier.classify("Do you agree that climate change is a major threat?")
        assert result.primary_level.value == "evaluate"

    def test_classify_create_question(self, bloom_classifier):
        """Test classification of 'create' level question."""
        result = bloom_classifier.classify("Design a new transportation system for the city.")
        assert result.primary_level.value == "create"

    def test_batch_classify(self, bloom_classifier):
        """Test batch classification."""
        questions = [
            "What is 2+2?",
            "Explain the theory of relativity.",
            "Why do plants need sunlight?",
        ]
        results = bloom_classifier.batch_classify(questions)
        assert len(results) == 3

    def test_level_distribution(self, bloom_classifier):
        """Test level distribution calculation."""
        questions = [
            "What is the capital of France?",
            "Who wrote Romeo and Juliet?",
            "When did World War II end?",
        ]
        distribution = bloom_classifier.get_level_distribution(questions)
        assert sum(distribution.values()) == len(questions)


class TestDifficultyEstimator:
    """Tests for difficulty estimator."""

    def test_estimate_easy_question(self, difficulty_estimator):
        """Test estimation of easy question."""
        result = difficulty_estimator.estimate(
            question="What color is the sky?",
            answer="Blue",
        )
        assert 0 <= result.difficulty <= 1
        assert 0 <= result.confidence <= 1
        assert result.difficulty < 0.5  # Should be easy

    def test_estimate_hard_question(self, difficulty_estimator):
        """Test estimation of harder question."""
        result = difficulty_estimator.estimate(
            question="Analyze the socioeconomic factors that contributed to the decline of the Roman Empire.",
            answer="Multiple factors including economic instability, military overreach, and political corruption",
        )
        assert result.difficulty > 0.3  # Should be harder

    def test_estimate_with_distractors(self, difficulty_estimator):
        """Test estimation with MCQ distractors."""
        result = difficulty_estimator.estimate(
            question="What is the capital of France?",
            answer="Paris",
            distractors=["London", "Berlin", "Madrid"],
        )
        assert "distractor_quality" in result.factors

    def test_analyze_factors(self, difficulty_estimator):
        """Test factor analysis."""
        factors = difficulty_estimator.analyze_factors(
            question="What is photosynthesis?",
            answer="The process by which plants convert sunlight into energy",
        )
        assert "linguistic_complexity" in factors
        assert "bloom_level" in factors
        assert "answer_complexity" in factors

    def test_grade_level_estimate(self, difficulty_estimator):
        """Test grade level estimation."""
        result = difficulty_estimator.estimate(
            question="What is 2+2?",
            answer="4",
        )
        assert result.grade_level_estimate is not None
        assert 1 <= result.grade_level_estimate <= 12


class TestQualityFilter:
    """Tests for quality filter."""

    def test_score_good_question(self, quality_filter, sample_passage):
        """Test scoring a good question."""
        score = quality_filter.score(
            question="What engineer designed the Eiffel Tower?",
            answer="Gustave Eiffel",
            context=sample_passage,
        )
        assert score.is_acceptable
        assert score.overall >= 0.5

    def test_score_bad_question(self, quality_filter, sample_passage):
        """Test scoring a poor question."""
        score = quality_filter.score(
            question="What?",  # Too short
            answer="Something",
            context=sample_passage,
        )
        assert not score.is_acceptable
        assert len(score.issues) > 0

    def test_filter_batch(self, quality_filter, sample_passage):
        """Test batch filtering."""
        questions = [
            {
                "question": "What is the Eiffel Tower?",
                "answer": "A wrought-iron lattice tower",
                "context": sample_passage,
            },
            {
                "question": "Huh?",  # Bad question
                "answer": "Something",
                "context": sample_passage,
            },
        ]
        filtered = quality_filter.filter_batch(questions)
        assert len(filtered) <= len(questions)

    def test_improvement_suggestions(self, quality_filter, sample_passage):
        """Test getting improvement suggestions."""
        score = quality_filter.score(
            question="What?",
            answer="Something",
            context=sample_passage,
        )
        suggestions = quality_filter.get_improvement_suggestions(score)
        assert isinstance(suggestions, list)


class TestClozeGenerator:
    """Tests for cloze generator."""

    @pytest.mark.slow
    def test_generate_cloze_items(self, cloze_generator, sample_passage):
        """Test cloze item generation."""
        items = cloze_generator.generate(
            text=sample_passage,
            num_items=3,
            blank_strategy="key_terms",
        )
        assert len(items) <= 3
        for item in items:
            assert "_____" in item.text_with_blank
            assert item.answer != ""

    @pytest.mark.slow
    def test_generate_entity_blanks(self, cloze_generator, sample_passage):
        """Test entity-based blank selection."""
        items = cloze_generator.generate(
            text=sample_passage,
            num_items=3,
            blank_strategy="entities",
        )
        assert isinstance(items, list)

    def test_select_blanks(self, cloze_generator, sample_passage):
        """Test blank selection without full generation."""
        blanks = cloze_generator.select_blanks(
            text=sample_passage,
            strategy="key_terms",
        )
        assert isinstance(blanks, list)

    def test_generate_hints(self, cloze_generator):
        """Test hint generation."""
        hint = cloze_generator.generate_hints(
            answer="Paris",
            context="The capital of France is Paris.",
        )
        assert "P" in hint  # Should contain first letter hint

    @pytest.mark.slow
    def test_validate_cloze_item(self, cloze_generator, sample_passage):
        """Test cloze item validation."""
        items = cloze_generator.generate(
            text=sample_passage,
            num_items=1,
        )
        if items:
            is_valid, issues = cloze_generator.validate_cloze_item(items[0])
            assert isinstance(is_valid, bool)
            assert isinstance(issues, list)


class TestAnswerExtractor:
    """Tests for answer extractor."""

    @pytest.mark.slow
    def test_extract_answers(self, answer_extractor, sample_passage):
        """Test answer extraction."""
        answers = answer_extractor.extract(
            text=sample_passage,
            max_answers=5,
        )
        assert len(answers) <= 5
        for answer in answers:
            assert answer.text != ""
            assert answer.importance_score >= 0

    @pytest.mark.slow
    def test_extract_entities(self, answer_extractor, sample_passage):
        """Test entity extraction."""
        entities = answer_extractor.extract_entities(sample_passage)
        assert isinstance(entities, list)

    @pytest.mark.slow
    def test_extract_key_terms(self, answer_extractor, sample_passage):
        """Test key term extraction."""
        terms = answer_extractor.extract_key_terms(sample_passage)
        assert isinstance(terms, list)

    def test_rank_answers(self, answer_extractor):
        """Test answer ranking."""
        from app.models.answer_extractor import ExtractedAnswer

        answers = [
            ExtractedAnswer(
                text="Paris",
                entity_type="entity",
                importance_score=0.8,
                char_start=0,
                char_end=5,
                sentence_context="Paris is the capital.",
            ),
            ExtractedAnswer(
                text="France",
                entity_type="entity",
                importance_score=0.6,
                char_start=10,
                char_end=16,
                sentence_context="Paris is in France.",
            ),
        ]
        ranked = answer_extractor.rank_answers(answers, criterion="importance")
        assert ranked[0].importance_score >= ranked[1].importance_score
