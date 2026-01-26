"""Tests for StyleAnalyzer model."""

import pytest

from app.models.style_analyzer import StyleAnalyzer


class TestStyleAnalyzer:
    """Tests for StyleAnalyzer."""

    def test_initialization(self, style_analyzer):
        """Test analyzer initialization."""
        assert style_analyzer is not None

    def test_analyze_sample_essay(self, style_analyzer, sample_essay):
        """Test style analysis on sample essay."""
        result = style_analyzer.analyze_style(sample_essay)

        assert "sentence_length_stats" in result
        assert "sentence_type_distribution" in result
        assert "vocabulary_level" in result
        assert "voice_ratio" in result
        assert "tone" in result
        assert "word_variety_score" in result
        assert "overused_words" in result

    def test_sentence_length_stats(self, style_analyzer, sample_essay):
        """Test sentence length statistics."""
        result = style_analyzer.analyze_style(sample_essay)
        stats = result["sentence_length_stats"]

        assert "mean" in stats
        assert "std" in stats
        assert "min" in stats
        assert "max" in stats

        assert stats["mean"] > 0
        assert stats["min"] >= 0
        assert stats["max"] >= stats["min"]

    def test_sentence_type_distribution(self, style_analyzer, sample_essay):
        """Test sentence type classification."""
        result = style_analyzer.analyze_style(sample_essay)
        distribution = result["sentence_type_distribution"]

        # Check valid sentence types
        valid_types = {"simple", "compound", "complex", "compound_complex"}
        for sent_type in distribution.keys():
            assert sent_type in valid_types

        # Percentages should sum to approximately 1.0
        total = sum(distribution.values())
        assert 0.9 <= total <= 1.1

    def test_vocabulary_level(self, style_analyzer, sample_essay):
        """Test vocabulary level analysis."""
        result = style_analyzer.analyze_style(sample_essay)
        vocab = result["vocabulary_level"]

        assert "average_word_length" in vocab
        assert "awl_coverage" in vocab
        assert "rare_word_percentage" in vocab
        assert "grade_level_estimate" in vocab

        assert vocab["average_word_length"] > 0
        assert 0 <= vocab["awl_coverage"] <= 1
        assert 0 <= vocab["rare_word_percentage"] <= 1
        assert 1 <= vocab["grade_level_estimate"] <= 16

    def test_voice_ratio(self, style_analyzer, sample_essay):
        """Test active/passive voice ratio."""
        result = style_analyzer.analyze_style(sample_essay)

        assert "voice_ratio" in result
        assert 0 <= result["voice_ratio"] <= 1

    def test_tone_detection(self, style_analyzer, sample_essay):
        """Test tone detection."""
        result = style_analyzer.analyze_style(sample_essay)

        assert "tone" in result
        valid_tones = {"formal", "informal", "neutral", "academic", "conversational"}
        assert result["tone"] in valid_tones

    def test_word_variety_score(self, style_analyzer, sample_essay):
        """Test type-token ratio (word variety)."""
        result = style_analyzer.analyze_style(sample_essay)

        assert "word_variety_score" in result
        assert 0 <= result["word_variety_score"] <= 1

    def test_overused_words(self, style_analyzer):
        """Test overused word detection."""
        repetitive_text = """
        The thing is that the thing about things is complicated.
        This thing is very very important. The thing is essential.
        Every thing we do involves things. Things are everywhere.
        """
        result = style_analyzer.analyze_style(repetitive_text)

        assert "overused_words" in result
        assert isinstance(result["overused_words"], list)

    def test_academic_text_tone(self, style_analyzer, academic_text):
        """Test that academic text is detected as formal/academic."""
        result = style_analyzer.analyze_style(academic_text)

        assert result["tone"] in {"formal", "academic", "neutral"}

    def test_informal_text_tone(self, style_analyzer, informal_text):
        """Test that informal text is detected correctly."""
        result = style_analyzer.analyze_style(informal_text)

        assert result["tone"] in {"informal", "conversational", "neutral"}

    def test_sophisticated_words(self, style_analyzer, academic_text):
        """Test sophisticated word detection."""
        result = style_analyzer.analyze_style(academic_text)

        assert "sophisticated_words_used" in result
        assert isinstance(result["sophisticated_words_used"], list)

    def test_target_style_comparison(self, style_analyzer, sample_essay):
        """Test analysis with target style specified."""
        result = style_analyzer.analyze_style(sample_essay, target_style="academic")

        # Should still return all fields
        assert "tone" in result
        assert "vocabulary_level" in result

    def test_short_text_analysis(self, style_analyzer, short_text):
        """Test style analysis on short text."""
        result = style_analyzer.analyze_style(short_text)

        # Should handle short text gracefully
        assert "sentence_length_stats" in result
        assert "word_variety_score" in result

    def test_empty_text_handling(self, style_analyzer):
        """Test handling of empty text."""
        result = style_analyzer.analyze_style("   ")

        # Should return reasonable defaults
        assert "tone" in result
        assert "word_variety_score" in result
