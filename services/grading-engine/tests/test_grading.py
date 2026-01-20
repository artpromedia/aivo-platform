"""
Tests for grading algorithms in the grading-engine service.

Tests cover:
- Multiple choice grading
- True/false grading
- Short answer grading (with mocked AI)
- Math problem grading (with mocked AI)
- Assessment-level grading
- Edge cases and error handling
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ============================================================================
# MULTIPLE CHOICE GRADING TESTS
# ============================================================================


class TestMultipleChoiceGrading:
    """Tests for multiple choice question grading."""

    @pytest.mark.asyncio
    async def test_correct_answer(self, multiple_choice_question):
        """Test grading a correct multiple choice answer."""
        from src.auto_grader import MultipleChoiceGrader

        grader = MultipleChoiceGrader()
        result = await grader.grade(multiple_choice_question, "B")

        assert result["correct"] is True
        assert result["points"] == 1
        assert "Correct" in result["feedback"]

    @pytest.mark.asyncio
    async def test_incorrect_answer(self, multiple_choice_question):
        """Test grading an incorrect multiple choice answer."""
        from src.auto_grader import MultipleChoiceGrader

        grader = MultipleChoiceGrader()
        result = await grader.grade(multiple_choice_question, "A")

        assert result["correct"] is False
        assert result["points"] == 0
        assert "correct answer" in result["feedback"].lower()

    @pytest.mark.asyncio
    async def test_case_sensitivity(self, multiple_choice_question):
        """Test that answer matching is case-sensitive."""
        from src.auto_grader import MultipleChoiceGrader

        grader = MultipleChoiceGrader()

        # Lowercase 'b' should not match 'B'
        result = await grader.grade(multiple_choice_question, "b")
        assert result["correct"] is False

    @pytest.mark.asyncio
    async def test_higher_point_value(self):
        """Test multiple choice with higher point value."""
        from src.auto_grader import MultipleChoiceGrader

        question = {
            "id": "mc-2",
            "type": "multiple-choice",
            "text": "What is 2 + 2?",
            "points": 5,
            "correct_answer": "C",
        }

        grader = MultipleChoiceGrader()
        result = await grader.grade(question, "C")

        assert result["points"] == 5


# ============================================================================
# TRUE/FALSE GRADING TESTS
# ============================================================================


class TestTrueFalseGrading:
    """Tests for true/false question grading."""

    @pytest.mark.asyncio
    async def test_correct_false_answer(self, true_false_question):
        """Test grading a correct false answer."""
        from src.auto_grader import TrueFalseGrader

        grader = TrueFalseGrader()
        result = await grader.grade(true_false_question, False)

        assert result["correct"] is True
        assert result["points"] == 1

    @pytest.mark.asyncio
    async def test_incorrect_true_answer(self, true_false_question):
        """Test grading an incorrect true answer."""
        from src.auto_grader import TrueFalseGrader

        grader = TrueFalseGrader()
        result = await grader.grade(true_false_question, True)

        assert result["correct"] is False
        assert result["points"] == 0

    @pytest.mark.asyncio
    async def test_true_question_correct(self):
        """Test a question where true is correct."""
        from src.auto_grader import TrueFalseGrader

        question = {
            "id": "tf-2",
            "type": "true-false",
            "text": "Water boils at 100 degrees Celsius at sea level.",
            "points": 2,
            "correct_answer": True,
        }

        grader = TrueFalseGrader()
        result = await grader.grade(question, True)

        assert result["correct"] is True
        assert result["points"] == 2


# ============================================================================
# SHORT ANSWER GRADING TESTS
# ============================================================================


class TestShortAnswerGrading:
    """Tests for short answer question grading with mocked AI."""

    @pytest.mark.asyncio
    async def test_good_answer(self, short_answer_question, mock_openai_client, mock_openai_response):
        """Test grading a good short answer."""
        from src.auto_grader import ShortAnswerGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '{"score": 5, "feedback": "Excellent explanation of the water cycle!"}'
        )

        grader = ShortAnswerGrader(mock_openai_client)
        result = await grader.grade(
            short_answer_question,
            "Water evaporates from oceans and lakes, rises into the atmosphere where it condenses into clouds, and then falls as rain or snow."
        )

        assert result["points"] == 5
        assert result["correct"] is True
        assert "Excellent" in result["feedback"]

    @pytest.mark.asyncio
    async def test_partial_credit(self, short_answer_question, mock_openai_client, mock_openai_response):
        """Test partial credit for short answer."""
        from src.auto_grader import ShortAnswerGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '{"score": 3, "feedback": "Good start, but missing some key steps."}'
        )

        grader = ShortAnswerGrader(mock_openai_client)
        result = await grader.grade(
            short_answer_question,
            "Water evaporates and becomes rain."
        )

        assert result["points"] == 3
        assert result["correct"] is False

    @pytest.mark.asyncio
    async def test_poor_answer(self, short_answer_question, mock_openai_client, mock_openai_response):
        """Test grading a poor short answer."""
        from src.auto_grader import ShortAnswerGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '{"score": 0, "feedback": "The answer does not address the water cycle."}'
        )

        grader = ShortAnswerGrader(mock_openai_client)
        result = await grader.grade(
            short_answer_question,
            "I don't know."
        )

        assert result["points"] == 0
        assert result["correct"] is False


# ============================================================================
# MATH GRADING TESTS
# ============================================================================


class TestMathGrading:
    """Tests for math problem grading with mocked AI."""

    @pytest.mark.asyncio
    async def test_correct_answer(self, math_question, mock_openai_client, mock_openai_response):
        """Test grading a correct math answer."""
        from src.auto_grader import MathGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '{"score": 5, "correct_answer": true, "correct_methodology": true, "feedback": "Perfect!", "mistakes": []}'
        )

        grader = MathGrader(mock_openai_client)
        result = await grader.grade(math_question, "x = 5")

        assert result["points"] == 5
        assert result["correct"] is True
        assert result["mistakes"] == []

    @pytest.mark.asyncio
    async def test_correct_answer_wrong_methodology(self, math_question, mock_openai_client, mock_openai_response):
        """Test correct answer but poor methodology gets partial credit."""
        from src.auto_grader import MathGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '{"score": 4, "correct_answer": true, "correct_methodology": false, "feedback": "Correct answer but work shown is unclear.", "mistakes": ["Work not shown clearly"]}'
        )

        grader = MathGrader(mock_openai_client)
        result = await grader.grade(math_question, "5")

        assert result["points"] == 4
        assert result["correct"] is True

    @pytest.mark.asyncio
    async def test_wrong_answer_good_methodology(self, math_question, mock_openai_client, mock_openai_response):
        """Test wrong answer but good methodology gets partial credit."""
        from src.auto_grader import MathGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            '{"score": 3, "correct_answer": false, "correct_methodology": true, "feedback": "Good approach but arithmetic error.", "mistakes": ["2x + 5 = 15, 2x = 10, but wrote x = 4 instead of 5"]}'
        )

        grader = MathGrader(mock_openai_client)
        result = await grader.grade(math_question, "2x + 5 = 15\n2x = 10\nx = 4")

        assert result["points"] == 3
        assert result["correct"] is False
        assert len(result["mistakes"]) > 0


# ============================================================================
# ASSESSMENT GRADING TESTS
# ============================================================================


class TestAssessmentGrading:
    """Tests for full assessment grading."""

    @pytest.mark.asyncio
    async def test_grade_mixed_assessment(self, auto_grader, sample_assessment, mock_openai_response):
        """Test grading an assessment with mixed question types."""
        # Configure mock for short answer
        auto_grader.openai.chat.completions.create.return_value = mock_openai_response(
            '{"score": 4, "feedback": "Good explanation."}'
        )

        student_answers = {
            "mc-1": "B",  # Correct
            "tf-1": False,  # Correct
            "sa-1": "Water evaporates, condenses into clouds, and falls as rain.",
        }

        results = await auto_grader.grade_assessment(sample_assessment, student_answers)

        assert results["total_points"] == 7  # 1 + 1 + 5
        assert results["earned_points"] == 6  # 1 + 1 + 4
        assert len(results["questions"]) == 3

        # Check individual results
        mc_result = next(q for q in results["questions"] if q["question_id"] == "mc-1")
        assert mc_result["correct"] is True

        tf_result = next(q for q in results["questions"] if q["question_id"] == "tf-1")
        assert tf_result["correct"] is True

    @pytest.mark.asyncio
    async def test_missing_answers(self, auto_grader, sample_assessment, mock_openai_response):
        """Test grading when some answers are missing."""
        auto_grader.openai.chat.completions.create.return_value = mock_openai_response(
            '{"score": 5, "feedback": "Great!"}'
        )

        student_answers = {
            "mc-1": "B",
            # tf-1 missing
            # sa-1 missing
        }

        results = await auto_grader.grade_assessment(sample_assessment, student_answers)

        assert results["total_points"] == 7
        assert results["earned_points"] == 1  # Only MC correct

        # Check that missing answers are handled
        tf_result = next(q for q in results["questions"] if q["question_id"] == "tf-1")
        assert tf_result["points"] == 0
        assert "No answer" in tf_result["feedback"]

    @pytest.mark.asyncio
    async def test_all_correct(self, auto_grader, sample_assessment, mock_openai_response):
        """Test perfect score scenario."""
        auto_grader.openai.chat.completions.create.return_value = mock_openai_response(
            '{"score": 5, "feedback": "Perfect answer!"}'
        )

        student_answers = {
            "mc-1": "B",
            "tf-1": False,
            "sa-1": "Complete and accurate explanation of the water cycle.",
        }

        results = await auto_grader.grade_assessment(sample_assessment, student_answers)

        assert results["percentage"] == 100.0

    @pytest.mark.asyncio
    async def test_all_incorrect(self, auto_grader, sample_assessment, mock_openai_response):
        """Test zero score scenario."""
        auto_grader.openai.chat.completions.create.return_value = mock_openai_response(
            '{"score": 0, "feedback": "Incorrect."}'
        )

        student_answers = {
            "mc-1": "A",  # Wrong
            "tf-1": True,  # Wrong
            "sa-1": "Wrong answer",
        }

        results = await auto_grader.grade_assessment(sample_assessment, student_answers)

        assert results["earned_points"] == 0
        assert results["percentage"] == 0.0

    @pytest.mark.asyncio
    async def test_percentage_calculation(self, auto_grader, mock_openai_response):
        """Test percentage calculation accuracy."""
        auto_grader.openai.chat.completions.create.return_value = mock_openai_response(
            '{"score": 3, "feedback": "Partial credit."}'
        )

        assessment = {
            "id": "test",
            "title": "Test",
            "grade_level": "elementary",
            "questions": [
                {"id": "q1", "type": "multiple-choice", "text": "Q1", "points": 10, "correct_answer": "A"},
                {"id": "q2", "type": "short-answer", "text": "Q2", "points": 10, "expected_answer": "test"},
            ],
        }

        student_answers = {
            "q1": "A",  # Full credit: 10
            "q2": "partial",  # Partial: 3
        }

        results = await auto_grader.grade_assessment(assessment, student_answers)

        assert results["total_points"] == 20
        assert results["earned_points"] == 13
        assert results["percentage"] == 65.0


# ============================================================================
# EDGE CASE TESTS
# ============================================================================


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    @pytest.mark.asyncio
    async def test_unknown_question_type(self, auto_grader):
        """Test handling of unknown question type."""
        question = {
            "id": "unknown-1",
            "type": "unknown-type",
            "text": "Some question",
            "points": 5,
        }

        result = await auto_grader.grade_single_question(question, "answer")

        assert result["points"] == 0
        assert "Unknown question type" in result["feedback"]

    @pytest.mark.asyncio
    async def test_empty_assessment(self, auto_grader):
        """Test grading an assessment with no questions."""
        assessment = {
            "id": "empty",
            "title": "Empty Assessment",
            "grade_level": "elementary",
            "questions": [],
        }

        results = await auto_grader.grade_assessment(assessment, {})

        assert results["total_points"] == 0
        assert results["earned_points"] == 0
        assert results["percentage"] == 0

    @pytest.mark.asyncio
    async def test_zero_point_question(self):
        """Test question with zero points."""
        from src.auto_grader import MultipleChoiceGrader

        question = {
            "id": "zero-pt",
            "type": "multiple-choice",
            "text": "Bonus question",
            "points": 0,
            "correct_answer": "A",
        }

        grader = MultipleChoiceGrader()
        result = await grader.grade(question, "A")

        assert result["points"] == 0
        assert result["correct"] is True

    @pytest.mark.asyncio
    async def test_single_question_grading(self, auto_grader):
        """Test grading a single question directly."""
        question = {
            "id": "single",
            "type": "multiple-choice",
            "text": "What is 1 + 1?",
            "points": 1,
            "correct_answer": "B",
        }

        result = await auto_grader.grade_single_question(question, "B")

        assert result["correct"] is True
        assert result["points"] == 1

    @pytest.mark.asyncio
    async def test_null_correct_answer(self):
        """Test question with no correct answer defined."""
        from src.auto_grader import MultipleChoiceGrader

        question = {
            "id": "no-answer",
            "type": "multiple-choice",
            "text": "Question without answer",
            "points": 1,
        }

        grader = MultipleChoiceGrader()
        result = await grader.grade(question, "A")

        # Should be incorrect since correct_answer is None
        assert result["correct"] is False


# ============================================================================
# AI RESPONSE PARSING TESTS
# ============================================================================


class TestAIResponseParsing:
    """Tests for AI response parsing."""

    @pytest.mark.asyncio
    async def test_json_in_markdown_code_block(self, short_answer_question, mock_openai_client, mock_openai_response):
        """Test parsing JSON wrapped in markdown code blocks."""
        from src.auto_grader import ShortAnswerGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            'Here is the grading:\n```json\n{"score": 4, "feedback": "Good answer"}\n```'
        )

        grader = ShortAnswerGrader(mock_openai_client)
        result = await grader.grade(short_answer_question, "Some answer")

        assert result["points"] == 4

    @pytest.mark.asyncio
    async def test_json_with_extra_text(self, short_answer_question, mock_openai_client, mock_openai_response):
        """Test parsing JSON with surrounding text."""
        from src.auto_grader import ShortAnswerGrader

        mock_openai_client.chat.completions.create.return_value = mock_openai_response(
            'Based on my analysis: {"score": 3, "feedback": "Decent"} That is my assessment.'
        )

        grader = ShortAnswerGrader(mock_openai_client)
        result = await grader.grade(short_answer_question, "Some answer")

        assert result["points"] == 3
