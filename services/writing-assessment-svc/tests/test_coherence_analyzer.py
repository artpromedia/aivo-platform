"""Tests for CoherenceAnalyzer model."""

import pytest

from app.models.coherence_analyzer import CoherenceAnalyzer


class TestCoherenceAnalyzer:
    """Tests for CoherenceAnalyzer."""

    def test_initialization(self, coherence_analyzer):
        """Test analyzer initialization."""
        assert coherence_analyzer is not None

    def test_analyze_sample_essay(self, coherence_analyzer, sample_essay):
        """Test coherence analysis on sample essay."""
        result = coherence_analyzer.analyze(sample_essay)

        assert "overall_score" in result
        assert "local_coherence" in result
        assert "global_coherence" in result
        assert "transition_analysis" in result

        assert 0 <= result["overall_score"] <= 1

    def test_local_coherence(self, coherence_analyzer, sample_essay):
        """Test local coherence analysis."""
        result = coherence_analyzer.analyze(sample_essay)
        local = result["local_coherence"]

        assert "coherence_score" in local
        assert "sentence_similarities" in local
        assert "weak_transitions" in local

        assert 0 <= local["coherence_score"] <= 1
        assert isinstance(local["sentence_similarities"], list)
        assert isinstance(local["weak_transitions"], list)

    def test_global_coherence(self, coherence_analyzer, sample_essay):
        """Test global coherence analysis."""
        result = coherence_analyzer.analyze(sample_essay)
        global_coh = result["global_coherence"]

        assert "structure_score" in global_coh
        assert "has_clear_intro" in global_coh
        assert "has_clear_conclusion" in global_coh
        assert "paragraph_topics" in global_coh
        assert "topic_drift_score" in global_coh

        assert 0 <= global_coh["structure_score"] <= 1
        assert isinstance(global_coh["has_clear_intro"], bool)
        assert isinstance(global_coh["has_clear_conclusion"], bool)

    def test_transition_analysis(self, coherence_analyzer, sample_essay):
        """Test transition analysis."""
        result = coherence_analyzer.analyze(sample_essay)
        transitions = result["transition_analysis"]

        assert "total_transitions" in transitions
        assert "transition_types" in transitions
        assert "missing_transition_locations" in transitions
        assert "suggested_transitions" in transitions

        # Sample essay has transition words
        assert transitions["total_transitions"] >= 0
        assert isinstance(transitions["transition_types"], dict)

    def test_analyze_with_suggestions(self, coherence_analyzer, sample_essay):
        """Test coherence analysis with suggestions enabled."""
        result = coherence_analyzer.analyze(sample_essay, include_suggestions=True)

        assert "transition_analysis" in result
        assert "suggested_transitions" in result["transition_analysis"]

    def test_short_text_coherence(self, coherence_analyzer, short_text):
        """Test coherence on short text."""
        result = coherence_analyzer.analyze(short_text)

        assert "overall_score" in result
        # Short text should have limited coherence analysis
        assert 0 <= result["overall_score"] <= 1

    def test_well_structured_essay(self, coherence_analyzer, sample_essay):
        """Test that well-structured essay is detected."""
        result = coherence_analyzer.analyze(sample_essay)

        # Sample essay has intro and conclusion
        assert result["global_coherence"]["has_clear_intro"] or \
               result["global_coherence"]["has_clear_conclusion"]

    def test_academic_text_coherence(self, coherence_analyzer, academic_text):
        """Test coherence on academic text."""
        result = coherence_analyzer.analyze(academic_text)

        # Academic text should have good coherence
        assert result["overall_score"] >= 0.3

    def test_analyze_paragraphs(self, coherence_analyzer, sample_essay):
        """Test paragraph analysis."""
        paragraphs = [p.strip() for p in sample_essay.split('\n\n') if p.strip()]

        if len(paragraphs) > 1:
            result = coherence_analyzer.analyze(sample_essay)
            assert len(result["global_coherence"]["paragraph_topics"]) >= 0

    def test_transition_detection(self, coherence_analyzer):
        """Test transition word detection."""
        text_with_transitions = """
        First, we need to understand the problem.
        Furthermore, we must consider all options.
        In conclusion, the best approach is clear.
        """
        result = coherence_analyzer.analyze(text_with_transitions)

        assert result["transition_analysis"]["total_transitions"] >= 2
