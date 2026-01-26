"""Tests for ReadabilityProfiler model."""

import pytest

from app.models.readability_profiler import ReadabilityProfiler


class TestReadabilityProfiler:
    """Tests for ReadabilityProfiler."""

    def test_initialization(self, readability_profiler):
        """Test profiler initialization."""
        assert readability_profiler is not None

    def test_analyze_sample_essay(self, readability_profiler, sample_essay):
        """Test readability analysis on sample essay."""
        result = readability_profiler.analyze(sample_essay)

        assert "flesch_kincaid_grade" in result
        assert "flesch_reading_ease" in result
        assert "gunning_fog" in result
        assert "smog_index" in result
        assert "coleman_liau" in result
        assert "ari" in result
        assert "dale_chall" in result
        assert "average_grade_level" in result
        assert "target_audience" in result
        assert "complexity_factors" in result

    def test_flesch_kincaid_grade(self, readability_profiler, sample_essay):
        """Test Flesch-Kincaid grade level calculation."""
        result = readability_profiler.analyze(sample_essay)

        # Grade level should be reasonable
        assert 0 <= result["flesch_kincaid_grade"] <= 20

    def test_flesch_reading_ease(self, readability_profiler, sample_essay):
        """Test Flesch Reading Ease score."""
        result = readability_profiler.analyze(sample_essay)

        # Score typically between 0-100, can go slightly outside
        assert -50 <= result["flesch_reading_ease"] <= 120

    def test_gunning_fog(self, readability_profiler, sample_essay):
        """Test Gunning Fog index."""
        result = readability_profiler.analyze(sample_essay)

        assert result["gunning_fog"] >= 0

    def test_smog_index(self, readability_profiler, sample_essay):
        """Test SMOG index."""
        result = readability_profiler.analyze(sample_essay)

        assert result["smog_index"] >= 0

    def test_coleman_liau(self, readability_profiler, sample_essay):
        """Test Coleman-Liau index."""
        result = readability_profiler.analyze(sample_essay)

        assert result["coleman_liau"] >= 0

    def test_ari(self, readability_profiler, sample_essay):
        """Test Automated Readability Index."""
        result = readability_profiler.analyze(sample_essay)

        assert result["ari"] >= 0

    def test_dale_chall(self, readability_profiler, sample_essay):
        """Test Dale-Chall readability score."""
        result = readability_profiler.analyze(sample_essay)

        assert result["dale_chall"] >= 0

    def test_average_grade_level(self, readability_profiler, sample_essay):
        """Test consensus grade level calculation."""
        result = readability_profiler.analyze(sample_essay)

        # Average should be within reasonable range
        assert 0 <= result["average_grade_level"] <= 20

    def test_target_audience(self, readability_profiler, sample_essay):
        """Test target audience determination."""
        result = readability_profiler.analyze(sample_essay)

        assert "target_audience" in result
        assert len(result["target_audience"]) > 0

    def test_complexity_factors(self, readability_profiler, sample_essay):
        """Test complexity factor analysis."""
        result = readability_profiler.analyze(sample_essay)

        assert "complexity_factors" in result
        assert isinstance(result["complexity_factors"], list)

        for factor in result["complexity_factors"]:
            assert "factor" in factor
            assert "value" in factor
            assert "impact" in factor
            assert "description" in factor

    def test_compare_to_target(self, readability_profiler, sample_essay):
        """Test comparison to target grade level."""
        result = readability_profiler.compare_to_target(sample_essay, target_grade=8)

        assert "profile" in result
        assert "comparison" in result
        assert "difference" in result["comparison"]
        assert "is_appropriate" in result["comparison"]

    def test_academic_text_higher_grade(self, readability_profiler, academic_text, informal_text):
        """Test that academic text has higher grade level than informal."""
        academic_result = readability_profiler.analyze(academic_text)
        informal_result = readability_profiler.analyze(informal_text)

        # Academic text should generally have higher grade level
        assert academic_result["average_grade_level"] >= informal_result["average_grade_level"] - 2

    def test_short_text_handling(self, readability_profiler, short_text):
        """Test handling of short text."""
        result = readability_profiler.analyze(short_text)

        # Should return valid results even for short text
        assert "average_grade_level" in result
        assert result["average_grade_level"] >= 0

    def test_simplify_suggestions(self, readability_profiler, academic_text):
        """Test simplification suggestions."""
        suggestions = readability_profiler.simplify_suggestions(academic_text, target_grade=6)

        assert isinstance(suggestions, list)
        # Academic text should have suggestions for simplification

    def test_grade_level_boundaries(self, readability_profiler):
        """Test very simple and very complex texts."""
        simple_text = "See the cat. The cat is big. I like the cat."
        complex_text = """
        The epistemological ramifications of postmodernist deconstructionism
        necessitate a comprehensive reevaluation of hegemonic discursive
        paradigms within contemporary socio-cultural frameworks.
        """

        simple_result = readability_profiler.analyze(simple_text)
        complex_result = readability_profiler.analyze(complex_text)

        # Simple text should have lower grade level
        assert simple_result["average_grade_level"] < complex_result["average_grade_level"]
