"""Tests for EssayScorer model."""

import pytest

from app.models.essay_scorer import EssayScorer, EssayScorerConfig


class TestEssayScorerConfig:
    """Tests for EssayScorerConfig."""

    def test_default_config(self):
        """Test default configuration values."""
        config = EssayScorerConfig()
        assert config.model_name == "allenai/longformer-base-4096"
        assert config.max_length == 4096
        assert config.min_score == 1
        assert config.max_score == 6
        assert config.scoring_mode == "holistic"
        assert config.confidence_threshold == 0.7

    def test_custom_config(self):
        """Test custom configuration."""
        config = EssayScorerConfig(
            max_score=10,
            min_score=0,
            scoring_mode="trait-based"
        )
        assert config.max_score == 10
        assert config.min_score == 0
        assert config.scoring_mode == "trait-based"


class TestEssayScorer:
    """Tests for EssayScorer."""

    def test_initialization(self, essay_scorer):
        """Test scorer initialization."""
        assert essay_scorer is not None
        assert essay_scorer.config is not None

    def test_score_holistic_with_sample_essay(self, essay_scorer, sample_essay):
        """Test holistic scoring with a sample essay."""
        result = essay_scorer.score_holistic(sample_essay)

        assert "score" in result
        assert "confidence" in result
        assert "score_distribution" in result
        assert "comparable_percentile" in result

        assert 1 <= result["score"] <= 6
        assert 0 <= result["confidence"] <= 1
        assert 0 <= result["comparable_percentile"] <= 100

    def test_score_holistic_with_short_text(self, essay_scorer, short_text):
        """Test holistic scoring with short text."""
        result = essay_scorer.score_holistic(short_text)

        assert "score" in result
        # Short text should receive a lower score
        assert result["score"] <= 4

    def test_score_holistic_with_academic_text(self, essay_scorer, academic_text):
        """Test holistic scoring with academic text."""
        result = essay_scorer.score_holistic(academic_text)

        assert "score" in result
        # Academic text should score higher
        assert result["score"] >= 3

    def test_score_traits(self, essay_scorer, sample_essay):
        """Test trait-based scoring."""
        result = essay_scorer.score_traits(sample_essay)

        assert "traits" in result
        assert "overall_score" in result
        assert "strengths" in result
        assert "weaknesses" in result

        # Check all expected traits are present
        expected_traits = [
            "ideas", "organization", "voice",
            "word_choice", "sentence_fluency", "conventions"
        ]
        for trait in expected_traits:
            assert trait in result["traits"]
            assert "score" in result["traits"][trait]
            assert "max_score" in result["traits"][trait]
            assert "confidence" in result["traits"][trait]

    def test_score_traits_with_errors_text(self, essay_scorer, text_with_errors):
        """Test trait scoring with text containing errors."""
        result = essay_scorer.score_traits(text_with_errors)

        # Text with errors should have lower conventions score
        conventions_score = result["traits"]["conventions"]["score"]
        assert conventions_score < 5  # Should be penalized for errors

    def test_extract_features(self, essay_scorer, sample_essay):
        """Test feature extraction."""
        features = essay_scorer._extract_features(sample_essay)

        assert "sentence_count" in features
        assert "word_count" in features
        assert "avg_sentence_length" in features
        assert "vocabulary_diversity" in features
        assert "paragraph_count" in features
        assert "transition_words" in features
        assert "avg_word_length" in features

        assert features["sentence_count"] > 0
        assert features["word_count"] > 0
        assert features["vocabulary_diversity"] > 0

    def test_heuristic_score(self, essay_scorer, sample_essay):
        """Test heuristic scoring."""
        features = essay_scorer._extract_features(sample_essay)
        score = essay_scorer._heuristic_score(features)

        assert 1 <= score <= 6

    def test_empty_text_handling(self, essay_scorer):
        """Test handling of empty or near-empty text."""
        result = essay_scorer.score_holistic("   ")

        assert result["score"] == 1
        assert result["confidence"] < 0.5

    def test_informal_vs_academic(self, essay_scorer, informal_text, academic_text):
        """Test that academic text scores higher than informal text."""
        informal_result = essay_scorer.score_holistic(informal_text)
        academic_result = essay_scorer.score_holistic(academic_text)

        # Academic text should generally score higher
        assert academic_result["score"] >= informal_result["score"]
