"""
Tests for rubric-based grading in the grading-engine service.

Tests cover:
- Rubric parsing and formatting
- Essay grading with various rubric structures
- Rubric score aggregation
- Edge cases in rubric handling
"""

import pytest
from unittest.mock import AsyncMock, MagicMock


# ============================================================================
# RUBRIC FORMATTING TESTS
# ============================================================================


class TestRubricFormatting:
    """Tests for rubric formatting functionality."""

    def test_format_rubric_with_levels(self):
        """Test formatting a rubric with detailed levels."""
        from src.auto_grader import EssayGrader

        mock_client = AsyncMock()
        grader = EssayGrader(mock_client)

        rubric = {
            "content": {
                "weight": 40,
                "levels": {
                    "excellent": "Comprehensive coverage with examples",
                    "good": "Covers main points",
                    "satisfactory": "Basic coverage",
                    "needs_improvement": "Missing key points",
                },
            },
        }

        formatted = grader._format_rubric(rubric)

        assert "content" in formatted
        assert "excellent" in formatted
        assert "Comprehensive" in formatted

    def test_format_rubric_simple(self):
        """Test formatting a simple rubric without levels."""
        from src.auto_grader import EssayGrader

        mock_client = AsyncMock()
        grader = EssayGrader(mock_client)

        rubric = {
            "content": "Describes the topic clearly",
            "grammar": "Uses correct grammar and spelling",
        }

        formatted = grader._format_rubric(rubric)

        assert "content" in formatted
        assert "grammar" in formatted
        assert "Describes the topic clearly" in formatted

    def test_format_empty_rubric(self):
        """Test formatting an empty rubric."""
        from src.auto_grader import EssayGrader

        mock_client = AsyncMock()
        grader = EssayGrader(mock_client)

        formatted = grader._format_rubric({})

        assert "No specific rubric provided" in formatted
        assert "clarity" in formatted.lower()

    def test_format_none_rubric(self):
        """Test formatting a None rubric."""
        from src.auto_grader import EssayGrader

        mock_client = AsyncMock()
        grader = EssayGrader(mock_client)

        formatted = grader._format_rubric(None)

        assert "No specific rubric provided" in formatted


# ============================================================================
# ESSAY GRADING WITH RUBRICS TESTS
# ============================================================================


class TestEssayGradingWithRubrics:
    """Tests for essay grading using rubrics."""

    @pytest.mark.asyncio
    async def test_essay_with_detailed_rubric(self, essay_question, mock_openai_client, mock_openai_response):
        """Test grading essay with detailed rubric structure."""
        from src.auto_grader import EssayGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '''{
                "rubric_scores": {
                    "content": 35,
                    "organization": 25,
                    "writing_quality": 20
                },
                "total_score": 16,
                "feedback": "Good essay with strong content but could improve organization.",
                "strengths": ["Clear thesis statement", "Good use of examples"],
                "improvements": ["Work on transitions between paragraphs"]
            }'''
        )

        grader = EssayGrader(mock_openai_client)
        result = await grader.grade(
            essay_question,
            "Climate change is caused by greenhouse gas emissions..."
        )

        assert result["points"] == 16
        assert "rubric_scores" in result
        assert result["rubric_scores"]["content"] == 35
        assert len(result["strengths"]) > 0
        assert len(result["improvements"]) > 0

    @pytest.mark.asyncio
    async def test_essay_with_simple_rubric(self, essay_question_simple_rubric, mock_openai_client, mock_openai_response):
        """Test grading essay with simple rubric structure."""
        from src.auto_grader import EssayGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '''{
                "rubric_scores": {
                    "content": 4,
                    "clarity": 5
                },
                "total_score": 9,
                "feedback": "Well-written description of your favorite book.",
                "strengths": ["Clear writing"],
                "improvements": ["Could add more detail"]
            }'''
        )

        grader = EssayGrader(mock_openai_client)
        result = await grader.grade(
            essay_question_simple_rubric,
            "My favorite book is Harry Potter because..."
        )

        assert result["points"] == 9
        assert result["correct"] is True  # 9/10 >= 70%

    @pytest.mark.asyncio
    async def test_essay_without_rubric(self, mock_openai_client, mock_openai_response):
        """Test grading essay without any rubric."""
        from src.auto_grader import EssayGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '''{
                "rubric_scores": {},
                "total_score": 7,
                "feedback": "Decent essay covering the topic.",
                "strengths": ["Addresses the prompt"],
                "improvements": ["Add more depth"]
            }'''
        )

        question = {
            "id": "essay-no-rubric",
            "type": "essay",
            "text": "Write about your summer vacation.",
            "points": 10,
            # No rubric provided
        }

        grader = EssayGrader(mock_openai_client)
        result = await grader.grade(question, "This summer I went to the beach...")

        assert result["points"] == 7
        assert "feedback" in result

    @pytest.mark.asyncio
    async def test_essay_low_score(self, essay_question, mock_openai_client, mock_openai_response):
        """Test essay grading with low score (below passing threshold)."""
        from src.auto_grader import EssayGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '''{
                "rubric_scores": {
                    "content": 5,
                    "organization": 3,
                    "writing_quality": 2
                },
                "total_score": 5,
                "feedback": "The essay lacks depth and organization.",
                "strengths": ["Attempted to address the topic"],
                "improvements": ["Need more research", "Improve structure", "Check grammar"]
            }'''
        )

        grader = EssayGrader(mock_openai_client)
        result = await grader.grade(
            essay_question,
            "Climate change is bad."
        )

        assert result["points"] == 5
        assert result["correct"] is False  # 5/20 = 25% < 70%
        assert len(result["improvements"]) >= 2

    @pytest.mark.asyncio
    async def test_essay_perfect_score(self, essay_question, mock_openai_client, mock_openai_response):
        """Test essay grading with perfect score."""
        from src.auto_grader import EssayGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '''{
                "rubric_scores": {
                    "content": 40,
                    "organization": 30,
                    "writing_quality": 30
                },
                "total_score": 20,
                "feedback": "Excellent essay demonstrating mastery of the topic.",
                "strengths": ["Comprehensive analysis", "Perfect structure", "Excellent vocabulary"],
                "improvements": []
            }'''
        )

        grader = EssayGrader(mock_openai_client)
        result = await grader.grade(
            essay_question,
            "A comprehensive essay about climate change..."
        )

        assert result["points"] == 20
        assert result["correct"] is True
        assert len(result["strengths"]) >= 2


# ============================================================================
# RUBRIC SCORE CALCULATION TESTS
# ============================================================================


class TestRubricScoreCalculation:
    """Tests for rubric score calculations."""

    @pytest.mark.asyncio
    async def test_rubric_scores_match_total(self, mock_openai_client, mock_openai_response):
        """Test that rubric scores properly contribute to total."""
        from src.auto_grader import EssayGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '''{
                "rubric_scores": {
                    "criterion_a": 8,
                    "criterion_b": 7,
                    "criterion_c": 5
                },
                "total_score": 20,
                "feedback": "Total matches rubric scores.",
                "strengths": [],
                "improvements": []
            }'''
        )

        question = {
            "id": "essay-calc",
            "type": "essay",
            "text": "Test essay",
            "points": 30,
            "rubric": {
                "criterion_a": {"weight": 10},
                "criterion_b": {"weight": 10},
                "criterion_c": {"weight": 10},
            },
        }

        grader = EssayGrader(mock_openai_client)
        result = await grader.grade(question, "Essay response")

        # Total score should be what AI returned
        assert result["points"] == 20
        # Individual rubric scores should be preserved
        assert result["rubric_scores"]["criterion_a"] == 8

    @pytest.mark.asyncio
    async def test_weighted_rubric_scores(self, mock_openai_client, mock_openai_response):
        """Test handling of weighted rubric criteria."""
        from src.auto_grader import EssayGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '''{
                "rubric_scores": {
                    "content": 45,
                    "grammar": 20
                },
                "total_score": 65,
                "feedback": "Good content, some grammar issues.",
                "strengths": ["Strong content"],
                "improvements": ["Review grammar"]
            }'''
        )

        question = {
            "id": "weighted",
            "type": "essay",
            "text": "Weighted rubric test",
            "points": 100,
            "rubric": {
                "content": {"weight": 70},
                "grammar": {"weight": 30},
            },
        }

        grader = EssayGrader(mock_openai_client)
        result = await grader.grade(question, "Essay with good content but grammar issues")

        assert result["points"] == 65
        assert result["rubric_scores"]["content"] == 45
        assert result["rubric_scores"]["grammar"] == 20


# ============================================================================
# RUBRIC EDGE CASES TESTS
# ============================================================================


class TestRubricEdgeCases:
    """Tests for edge cases in rubric handling."""

    @pytest.mark.asyncio
    async def test_rubric_with_nested_criteria(self, mock_openai_client, mock_openai_response):
        """Test rubric with deeply nested criteria structure."""
        from src.auto_grader import EssayGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '''{
                "rubric_scores": {"overall": 15},
                "total_score": 15,
                "feedback": "Handled nested rubric.",
                "strengths": [],
                "improvements": []
            }'''
        )

        question = {
            "id": "nested",
            "type": "essay",
            "text": "Nested rubric test",
            "points": 20,
            "rubric": {
                "writing": {
                    "levels": {
                        "excellent": {
                            "description": "Outstanding writing",
                            "points": "18-20",
                        },
                        "good": {
                            "description": "Good writing",
                            "points": "14-17",
                        },
                    },
                },
            },
        }

        grader = EssayGrader(mock_openai_client)
        result = await grader.grade(question, "Essay response")

        assert result["points"] == 15

    @pytest.mark.asyncio
    async def test_rubric_with_special_characters(self, mock_openai_client, mock_openai_response):
        """Test rubric with special characters in criteria names."""
        from src.auto_grader import EssayGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '''{
                "rubric_scores": {"content_quality": 8},
                "total_score": 8,
                "feedback": "Good.",
                "strengths": [],
                "improvements": []
            }'''
        )

        question = {
            "id": "special",
            "type": "essay",
            "text": "Special chars test",
            "points": 10,
            "rubric": {
                "Content & Quality": "Clear and accurate",
                "Grammar/Spelling": "Correct usage",
            },
        }

        grader = EssayGrader(mock_openai_client)
        result = await grader.grade(question, "Essay")

        # Should handle special characters without errors
        assert "points" in result

    @pytest.mark.asyncio
    async def test_rubric_with_numeric_keys(self, mock_openai_client, mock_openai_response):
        """Test rubric with numeric criteria identifiers."""
        from src.auto_grader import EssayGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '''{
                "rubric_scores": {"1": 5, "2": 4, "3": 3},
                "total_score": 12,
                "feedback": "Numeric rubric handled.",
                "strengths": [],
                "improvements": []
            }'''
        )

        question = {
            "id": "numeric",
            "type": "essay",
            "text": "Numeric rubric test",
            "points": 15,
            "rubric": {
                "1": "First criterion",
                "2": "Second criterion",
                "3": "Third criterion",
            },
        }

        grader = EssayGrader(mock_openai_client)
        result = await grader.grade(question, "Essay")

        assert result["points"] == 12

    @pytest.mark.asyncio
    async def test_empty_essay_response(self, essay_question, mock_openai_client, mock_openai_response):
        """Test grading an empty essay response."""
        from src.auto_grader import EssayGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '''{
                "rubric_scores": {
                    "content": 0,
                    "organization": 0,
                    "writing_quality": 0
                },
                "total_score": 0,
                "feedback": "No response provided.",
                "strengths": [],
                "improvements": ["Submit a complete essay"]
            }'''
        )

        grader = EssayGrader(mock_openai_client)
        result = await grader.grade(essay_question, "")

        assert result["points"] == 0
        assert result["correct"] is False

    @pytest.mark.asyncio
    async def test_very_long_rubric(self, mock_openai_client, mock_openai_response):
        """Test handling a rubric with many criteria."""
        from src.auto_grader import EssayGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '''{
                "rubric_scores": {"c1": 10, "c2": 10, "c3": 10, "c4": 10, "c5": 10},
                "total_score": 50,
                "feedback": "Comprehensive evaluation.",
                "strengths": ["Met all criteria"],
                "improvements": []
            }'''
        )

        # Create rubric with many criteria
        rubric = {}
        for i in range(1, 11):
            rubric[f"criterion_{i}"] = {
                "weight": 10,
                "levels": {
                    "excellent": f"Excellent on criterion {i}",
                    "good": f"Good on criterion {i}",
                    "poor": f"Poor on criterion {i}",
                },
            }

        question = {
            "id": "long-rubric",
            "type": "essay",
            "text": "Test with many criteria",
            "points": 100,
            "rubric": rubric,
        }

        grader = EssayGrader(mock_openai_client)
        result = await grader.grade(question, "Comprehensive essay response")

        assert result["points"] == 50


# ============================================================================
# RUBRIC INTEGRATION TESTS
# ============================================================================


class TestRubricIntegration:
    """Integration tests for rubric-based grading in assessments."""

    @pytest.mark.asyncio
    async def test_assessment_with_essay_rubrics(self, auto_grader, mock_openai_response):
        """Test full assessment grading with essay rubrics."""
        # Configure mock to return different responses
        auto_grader.openai.chat.completions.create.return_value = mock_openai_response(
            '''{
                "rubric_scores": {"content": 8, "grammar": 7},
                "total_score": 15,
                "feedback": "Good essay.",
                "strengths": ["Clear writing"],
                "improvements": ["More examples"]
            }'''
        )

        assessment = {
            "id": "essay-assess",
            "title": "Essay Assessment",
            "grade_level": "high",
            "questions": [
                {
                    "id": "essay-1",
                    "type": "essay",
                    "text": "Discuss topic A.",
                    "points": 20,
                    "rubric": {
                        "content": {"weight": 60},
                        "grammar": {"weight": 40},
                    },
                },
            ],
        }

        student_answers = {
            "essay-1": "My essay about topic A discusses several important points...",
        }

        results = await auto_grader.grade_assessment(assessment, student_answers)

        assert results["total_points"] == 20
        assert results["earned_points"] == 15
        assert results["percentage"] == 75.0

    @pytest.mark.asyncio
    async def test_mixed_assessment_with_rubrics(self, auto_grader, mock_openai_response):
        """Test assessment with mixed question types including rubric essays."""
        auto_grader.openai.chat.completions.create.return_value = mock_openai_response(
            '''{
                "rubric_scores": {"content": 5},
                "total_score": 8,
                "feedback": "Satisfactory response.",
                "strengths": [],
                "improvements": []
            }'''
        )

        assessment = {
            "id": "mixed",
            "title": "Mixed Assessment",
            "grade_level": "middle",
            "questions": [
                {
                    "id": "mc-1",
                    "type": "multiple-choice",
                    "text": "MC question",
                    "points": 2,
                    "correct_answer": "A",
                },
                {
                    "id": "essay-1",
                    "type": "essay",
                    "text": "Write an essay.",
                    "points": 10,
                    "rubric": {"content": "Clear and relevant"},
                },
            ],
        }

        student_answers = {
            "mc-1": "A",
            "essay-1": "My essay response...",
        }

        results = await auto_grader.grade_assessment(assessment, student_answers)

        assert results["total_points"] == 12
        assert results["earned_points"] == 10  # 2 (MC) + 8 (Essay)

        # Verify individual results
        mc_result = next(q for q in results["questions"] if q["question_id"] == "mc-1")
        assert mc_result["correct"] is True

        essay_result = next(q for q in results["questions"] if q["question_id"] == "essay-1")
        assert essay_result["points"] == 8
