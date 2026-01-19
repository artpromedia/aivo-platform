"""
AutoGrader - AI-powered auto-grading system for various question types

This module provides intelligent grading capabilities for:
- Multiple choice questions
- True/false questions
- Short answer questions (with AI evaluation)
- Essay questions (with rubric-based AI grading)
- Math problems (with step-by-step analysis)
"""

from typing import Any, TypedDict
import json
import re
from abc import ABC, abstractmethod
from openai import AsyncOpenAI


# ════════════════════════════════════════════════════════════════════════════
# TYPE DEFINITIONS
# ════════════════════════════════════════════════════════════════════════════


class QuestionDict(TypedDict, total=False):
    """Type definition for a question."""

    id: str
    type: str
    text: str
    points: int
    correct_answer: Any
    expected_answer: str
    rubric: dict[str, Any]
    options: list[dict[str, Any]]


class AssessmentDict(TypedDict, total=False):
    """Type definition for an assessment."""

    title: str
    grade_level: str
    questions: list[QuestionDict]


class GradeResult(TypedDict, total=False):
    """Type definition for a grade result."""

    points: float
    feedback: str
    correct: bool
    rubric_scores: dict[str, float]
    strengths: list[str]
    improvements: list[str]
    mistakes: list[str]


class QuestionGradeResult(TypedDict):
    """Type definition for a question grade result."""

    question_id: str
    points: float
    max_points: int
    feedback: str
    correct: bool


class AssessmentResults(TypedDict):
    """Type definition for assessment results."""

    total_points: int
    earned_points: float
    percentage: float
    questions: list[QuestionGradeResult]
    feedback: list[str]
    overall_feedback: str


# ════════════════════════════════════════════════════════════════════════════
# GRADING STRATEGIES
# ════════════════════════════════════════════════════════════════════════════


class GradingStrategy(ABC):
    """Abstract base class for grading strategies."""

    @abstractmethod
    async def grade(
        self, question: QuestionDict, student_answer: Any
    ) -> GradeResult:
        """Grade a question and return the result."""
        pass


class MultipleChoiceGrader(GradingStrategy):
    """Grader for multiple choice questions."""

    async def grade(
        self, question: QuestionDict, student_answer: Any
    ) -> GradeResult:
        correct = student_answer == question.get("correct_answer")
        points = question["points"] if correct else 0

        return {
            "points": points,
            "correct": correct,
            "feedback": (
                "Correct!"
                if correct
                else f"The correct answer is {question.get('correct_answer')}"
            ),
        }


class TrueFalseGrader(GradingStrategy):
    """Grader for true/false questions."""

    async def grade(
        self, question: QuestionDict, student_answer: Any
    ) -> GradeResult:
        correct = student_answer == question.get("correct_answer")
        points = question["points"] if correct else 0

        return {
            "points": points,
            "correct": correct,
            "feedback": "Correct!" if correct else "Incorrect",
        }


class AIGrader(GradingStrategy):
    """Base class for AI-powered graders."""

    def __init__(self, openai_client: AsyncOpenAI):
        self.openai = openai_client

    async def _get_ai_response(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
    ) -> dict[str, Any]:
        """Get a response from the AI model."""
        response = await self.openai.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
        )

        content = response.choices[0].message.content or "{}"

        # Extract JSON from response
        json_match = re.search(r"\{[\s\S]*\}", content)
        if json_match:
            return json.loads(json_match.group())
        return json.loads(content)


class ShortAnswerGrader(AIGrader):
    """AI-powered grader for short answer questions."""

    async def grade(
        self, question: QuestionDict, student_answer: Any
    ) -> GradeResult:
        prompt = f"""
Grade this short answer question:

Question: {question['text']}
Expected Answer: {question.get('expected_answer', 'Not provided')}
Student Answer: {student_answer}

Provide:
1. Score (0-{question['points']})
2. Brief feedback explaining the grade

Return as JSON: {{"score": number, "feedback": "string"}}
"""

        result = await self._get_ai_response(
            system_prompt="You are an expert teacher grading student work.",
            user_prompt=prompt,
        )

        score = float(result.get("score", 0))
        return {
            "points": score,
            "feedback": result.get("feedback", ""),
            "correct": score == question["points"],
        }


class EssayGrader(AIGrader):
    """AI-powered grader for essay questions with rubric support."""

    async def grade(
        self, question: QuestionDict, student_answer: Any
    ) -> GradeResult:
        rubric = question.get("rubric", {})

        prompt = f"""
Grade this essay question using the provided rubric:

Question: {question['text']}

Rubric:
{self._format_rubric(rubric)}

Student Essay:
{student_answer}

Provide:
1. Score for each rubric criterion
2. Overall score (0-{question['points']})
3. Detailed feedback with specific examples

Return as JSON with structure:
{{
    "rubric_scores": {{"criterion": score}},
    "total_score": number,
    "feedback": "detailed feedback",
    "strengths": ["strength1", "strength2"],
    "improvements": ["improvement1", "improvement2"]
}}
"""

        result = await self._get_ai_response(
            system_prompt=(
                "You are an expert teacher grading essays "
                "with constructive feedback."
            ),
            user_prompt=prompt,
        )

        total_score = float(result.get("total_score", 0))
        return {
            "points": total_score,
            "feedback": result.get("feedback", ""),
            "rubric_scores": result.get("rubric_scores", {}),
            "strengths": result.get("strengths", []),
            "improvements": result.get("improvements", []),
            "correct": total_score >= question["points"] * 0.7,
        }

    def _format_rubric(self, rubric: dict[str, Any]) -> str:
        """Format rubric for AI prompt."""
        if not rubric:
            return "No specific rubric provided. Grade on clarity, accuracy, and completeness."

        formatted = ""
        for criterion, details in rubric.items():
            formatted += f"\n{criterion}:\n"
            if isinstance(details, dict) and "levels" in details:
                for level, description in details["levels"].items():
                    formatted += f"  {level}: {description}\n"
            else:
                formatted += f"  {details}\n"
        return formatted


class MathGrader(AIGrader):
    """AI-powered grader for math problems with step-by-step analysis."""

    async def grade(
        self, question: QuestionDict, student_answer: Any
    ) -> GradeResult:
        prompt = f"""
Grade this math problem:

Problem: {question['text']}
Correct Answer: {question.get('correct_answer')}
Student Answer: {student_answer}

Analyze:
1. Is the final answer correct?
2. If work is shown, evaluate the methodology
3. Award partial credit for correct approach even if final answer is wrong

Return JSON:
{{
    "score": number (0-{question['points']}),
    "correct_answer": boolean,
    "correct_methodology": boolean,
    "feedback": "string",
    "mistakes": ["list of mistakes if any"]
}}
"""

        result = await self._get_ai_response(
            system_prompt=(
                "You are a math teacher grading student work "
                "with partial credit."
            ),
            user_prompt=prompt,
            temperature=0.2,
        )

        score = float(result.get("score", 0))
        return {
            "points": score,
            "feedback": result.get("feedback", ""),
            "correct": result.get("correct_answer", False),
            "mistakes": result.get("mistakes", []),
        }


# ════════════════════════════════════════════════════════════════════════════
# MAIN AUTO GRADER CLASS
# ════════════════════════════════════════════════════════════════════════════


class AutoGrader:
    """
    AI-powered auto-grading system for various question types.

    Features:
    - Multiple choice and true/false instant grading
    - AI-powered short answer evaluation
    - Essay grading with rubric support
    - Math problem grading with methodology analysis
    - Personalized feedback generation
    """

    def __init__(self, openai_api_key: str):
        """Initialize the AutoGrader with OpenAI API key."""
        self.openai = AsyncOpenAI(api_key=openai_api_key)
        self._graders: dict[str, GradingStrategy] = {
            "multiple-choice": MultipleChoiceGrader(),
            "true-false": TrueFalseGrader(),
            "short-answer": ShortAnswerGrader(self.openai),
            "essay": EssayGrader(self.openai),
            "math": MathGrader(self.openai),
        }

    async def grade_assessment(
        self,
        assessment: AssessmentDict,
        student_answers: dict[str, Any],
    ) -> AssessmentResults:
        """
        Grade a complete assessment.

        Args:
            assessment: The assessment containing questions
            student_answers: Dictionary mapping question IDs to student answers

        Returns:
            AssessmentResults with scores, feedback, and analysis
        """
        results: AssessmentResults = {
            "total_points": 0,
            "earned_points": 0,
            "percentage": 0,
            "questions": [],
            "feedback": [],
            "overall_feedback": "",
        }

        for question in assessment.get("questions", []):
            question_id = question["id"]
            student_answer = student_answers.get(question_id)

            if not student_answer:
                results["questions"].append(
                    {
                        "question_id": question_id,
                        "points": 0,
                        "max_points": question["points"],
                        "feedback": "No answer provided",
                        "correct": False,
                    }
                )
                results["total_points"] += question["points"]
                continue

            # Get appropriate grader for question type
            grader = self._graders.get(question["type"])

            if grader:
                grade_result = await grader.grade(question, student_answer)
            else:
                grade_result = {
                    "points": 0,
                    "feedback": "Unknown question type",
                    "correct": False,
                }

            results["questions"].append(
                {
                    "question_id": question_id,
                    "points": grade_result["points"],
                    "max_points": question["points"],
                    "feedback": grade_result["feedback"],
                    "correct": grade_result.get("correct", False),
                }
            )

            results["total_points"] += question["points"]
            results["earned_points"] += grade_result["points"]

        # Calculate percentage
        if results["total_points"] > 0:
            results["percentage"] = (
                results["earned_points"] / results["total_points"] * 100
            )
        else:
            results["percentage"] = 0

        # Generate overall feedback
        results["overall_feedback"] = await self._generate_overall_feedback(
            assessment, results
        )

        return results

    async def grade_single_question(
        self,
        question: QuestionDict,
        student_answer: Any,
    ) -> GradeResult:
        """
        Grade a single question.

        Args:
            question: The question to grade
            student_answer: The student's answer

        Returns:
            GradeResult with score and feedback
        """
        grader = self._graders.get(question["type"])

        if grader:
            return await grader.grade(question, student_answer)

        return {
            "points": 0,
            "feedback": "Unknown question type",
            "correct": False,
        }

    async def _generate_overall_feedback(
        self,
        assessment: AssessmentDict,
        results: AssessmentResults,
    ) -> str:
        """Generate personalized overall feedback for the student."""
        prompt = f"""
Generate encouraging overall feedback for a student based on their assessment results:

Assessment: {assessment.get('title', 'Assessment')}
Score: {results['percentage']:.1f}%

Question Results:
{self._summarize_results(results['questions'])}

Provide:
1. Encouraging opening
2. Highlight strengths
3. Gentle suggestions for improvement
4. Motivating closing

Keep it positive, constructive, and age-appropriate for {assessment.get('grade_level', 'elementary')}.
"""

        try:
            response = await self.openai.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an encouraging teacher providing "
                            "constructive feedback."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
            )

            return response.choices[0].message.content or ""
        except Exception:
            # Fallback feedback if AI fails
            if results["percentage"] >= 90:
                return "Excellent work! You've demonstrated strong understanding."
            elif results["percentage"] >= 70:
                return "Good job! Keep practicing to improve further."
            elif results["percentage"] >= 50:
                return "Nice effort! Review the topics you found challenging."
            else:
                return "Keep trying! Practice makes perfect."

    def _summarize_results(self, questions: list[QuestionGradeResult]) -> str:
        """Summarize question results for feedback generation."""
        summary = ""
        for i, q in enumerate(questions, 1):
            status = "Correct" if q["correct"] else "Needs review"
            summary += (
                f"Q{i}: {q['points']}/{q['max_points']} - "
                f"{status} - {q['feedback']}\n"
            )
        return summary


# ════════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════


def create_auto_grader(api_key: str | None = None) -> AutoGrader:
    """
    Factory function to create an AutoGrader instance.

    Args:
        api_key: OpenAI API key. If not provided, reads from OPENAI_API_KEY env var.

    Returns:
        Configured AutoGrader instance
    """
    import os

    key = api_key or os.environ.get("OPENAI_API_KEY", "")
    if not key:
        raise ValueError(
            "OpenAI API key required. Set OPENAI_API_KEY environment variable "
            "or pass api_key parameter."
        )

    return AutoGrader(key)
