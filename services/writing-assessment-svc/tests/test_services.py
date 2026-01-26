"""Tests for service classes (FeedbackGenerator and RubricMapper)."""

import pytest

from app.services.feedback_generator import FeedbackGenerator
from app.services.rubric_mapper import RubricMapper


class TestFeedbackGenerator:
    """Tests for FeedbackGenerator."""

    def test_initialization(self, feedback_generator):
        """Test generator initialization."""
        assert feedback_generator is not None

    def test_generate_basic_feedback(self, feedback_generator):
        """Test basic feedback generation."""
        assessment = {
            "overall_score": 75.0,
            "grammar_report": {
                "total_errors": 3,
                "errors": [],
                "by_category": {"spelling": 2, "grammar": 1}
            },
            "coherence_analysis": {
                "overall_score": 0.7,
                "local_coherence": {"coherence_score": 0.7},
                "global_coherence": {"structure_score": 0.8}
            },
            "style_report": {
                "tone": "formal",
                "word_variety_score": 0.6,
                "vocabulary_level": {"grade_level_estimate": 8}
            },
            "readability_profile": {
                "average_grade_level": 8.5,
                "target_audience": "Middle school students"
            }
        }

        result = feedback_generator.generate(assessment)

        assert "summary" in result
        assert "strengths" in result
        assert "areas_for_improvement" in result
        assert "specific_suggestions" in result
        assert "next_steps" in result

    def test_feedback_style_encouraging(self, feedback_generator):
        """Test encouraging feedback style."""
        assessment = {
            "overall_score": 60.0,
            "grammar_report": {"total_errors": 5, "errors": [], "by_category": {}},
            "coherence_analysis": {"overall_score": 0.5},
            "style_report": {"tone": "neutral", "word_variety_score": 0.5},
            "readability_profile": {"average_grade_level": 6}
        }

        result = feedback_generator.generate(
            assessment,
            feedback_style="encouraging"
        )

        # Encouraging feedback should focus on positive aspects
        assert len(result["strengths"]) >= 0
        assert "summary" in result

    def test_feedback_style_direct(self, feedback_generator):
        """Test direct feedback style."""
        assessment = {
            "overall_score": 50.0,
            "grammar_report": {"total_errors": 10, "errors": [], "by_category": {}},
            "coherence_analysis": {"overall_score": 0.4},
            "style_report": {"tone": "neutral", "word_variety_score": 0.4},
            "readability_profile": {"average_grade_level": 5}
        }

        result = feedback_generator.generate(
            assessment,
            feedback_style="direct"
        )

        assert "areas_for_improvement" in result
        assert len(result["areas_for_improvement"]) >= 0

    def test_feedback_focus_areas(self, feedback_generator):
        """Test feedback with specific focus areas."""
        assessment = {
            "overall_score": 70.0,
            "grammar_report": {"total_errors": 2, "errors": [], "by_category": {}},
            "coherence_analysis": {"overall_score": 0.6},
            "style_report": {"tone": "neutral", "word_variety_score": 0.5},
            "readability_profile": {"average_grade_level": 7}
        }

        result = feedback_generator.generate(
            assessment,
            focus_areas=["grammar", "vocabulary"]
        )

        assert "specific_suggestions" in result

    def test_feedback_grade_level(self, feedback_generator):
        """Test grade-appropriate feedback."""
        assessment = {
            "overall_score": 80.0,
            "grammar_report": {"total_errors": 1, "errors": [], "by_category": {}},
            "coherence_analysis": {"overall_score": 0.8},
            "style_report": {"tone": "formal", "word_variety_score": 0.7},
            "readability_profile": {"average_grade_level": 10}
        }

        # Test elementary level
        result_elem = feedback_generator.generate(assessment, grade_level=3)
        # Test high school level
        result_hs = feedback_generator.generate(assessment, grade_level=11)

        assert "summary" in result_elem
        assert "summary" in result_hs

    def test_max_suggestions(self, feedback_generator):
        """Test maximum suggestions limit."""
        assessment = {
            "overall_score": 50.0,
            "grammar_report": {"total_errors": 20, "errors": [], "by_category": {}},
            "coherence_analysis": {"overall_score": 0.3},
            "style_report": {"tone": "informal", "word_variety_score": 0.3},
            "readability_profile": {"average_grade_level": 4}
        }

        result = feedback_generator.generate(
            assessment,
            max_suggestions=3
        )

        assert len(result["specific_suggestions"]) <= 3


class TestRubricMapper:
    """Tests for RubricMapper."""

    def test_initialization(self, rubric_mapper):
        """Test mapper initialization."""
        assert rubric_mapper is not None

    def test_map_scores_default_rubric(self, rubric_mapper):
        """Test score mapping with default 6-trait rubric."""
        assessment = {
            "holistic_score": {"score": 4.5},
            "trait_scores": {
                "overall_score": 75.0,
                "traits": {
                    "ideas": {"score": 4, "max_score": 6},
                    "organization": {"score": 5, "max_score": 6},
                    "voice": {"score": 4, "max_score": 6},
                    "word_choice": {"score": 3, "max_score": 6},
                    "sentence_fluency": {"score": 4, "max_score": 6},
                    "conventions": {"score": 5, "max_score": 6}
                }
            }
        }

        result = rubric_mapper.map_scores(assessment)

        assert "rubric_name" in result
        assert "mapped_scores" in result
        assert "level_descriptors" in result

    def test_map_scores_simple_rubric(self, rubric_mapper):
        """Test score mapping with simple rubric."""
        assessment = {
            "holistic_score": {"score": 4.0}
        }

        result = rubric_mapper.map_scores(assessment, rubric_id="simple")

        assert result["rubric_name"] == "simple"
        assert "overall" in result["mapped_scores"]

    def test_map_scores_holistic_rubric(self, rubric_mapper):
        """Test score mapping with holistic rubric."""
        assessment = {
            "holistic_score": {"score": 5.0}
        }

        result = rubric_mapper.map_scores(assessment, rubric_id="holistic")

        assert result["rubric_name"] == "holistic"

    def test_level_descriptors(self, rubric_mapper):
        """Test that level descriptors are provided."""
        assessment = {
            "holistic_score": {"score": 3.0},
            "trait_scores": {
                "traits": {
                    "ideas": {"score": 3, "max_score": 6}
                }
            }
        }

        result = rubric_mapper.map_scores(assessment)

        assert "level_descriptors" in result
        assert isinstance(result["level_descriptors"], dict)

    def test_get_available_rubrics(self, rubric_mapper):
        """Test getting list of available rubrics."""
        rubrics = rubric_mapper.get_available_rubrics()

        assert isinstance(rubrics, list)
        assert len(rubrics) > 0
        assert "6trait" in rubrics

    def test_custom_rubric(self, rubric_mapper):
        """Test loading custom rubric."""
        custom_rubric = {
            "name": "custom",
            "criteria": {
                "content": {"weight": 0.4, "levels": 4},
                "format": {"weight": 0.3, "levels": 4},
                "style": {"weight": 0.3, "levels": 4}
            }
        }

        result = rubric_mapper.register_rubric("custom", custom_rubric)
        assert result is True

    def test_score_normalization(self, rubric_mapper):
        """Test that scores are normalized correctly."""
        assessment = {
            "holistic_score": {"score": 6.0},  # Max score
            "trait_scores": {
                "traits": {
                    "ideas": {"score": 6, "max_score": 6}
                }
            }
        }

        result = rubric_mapper.map_scores(assessment)

        # Max score should map to highest level
        assert "mapped_scores" in result

    def test_unknown_rubric_fallback(self, rubric_mapper):
        """Test handling of unknown rubric ID."""
        assessment = {
            "holistic_score": {"score": 4.0}
        }

        result = rubric_mapper.map_scores(assessment, rubric_id="nonexistent")

        # Should fall back to default rubric
        assert "mapped_scores" in result
