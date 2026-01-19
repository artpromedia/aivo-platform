"""
Grading Engine Service - FastAPI Application

Provides REST API endpoints for AI-powered assessment grading.
"""

import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .auto_grader import AutoGrader, create_auto_grader


# ════════════════════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ════════════════════════════════════════════════════════════════════════════


class QuestionOption(BaseModel):
    """Model for question option."""

    id: str
    text: str
    is_correct: bool = False


class Question(BaseModel):
    """Model for a question."""

    id: str
    type: str
    text: str
    points: int = 1
    correct_answer: Any = None
    expected_answer: str | None = None
    rubric: dict[str, Any] | None = None
    options: list[QuestionOption] | None = None


class Assessment(BaseModel):
    """Model for an assessment."""

    id: str
    title: str
    grade_level: str = "elementary"
    questions: list[Question]


class GradeAssessmentRequest(BaseModel):
    """Request model for grading an assessment."""

    assessment: Assessment
    student_answers: dict[str, Any] = Field(
        ..., description="Mapping of question IDs to student answers"
    )


class GradeSingleQuestionRequest(BaseModel):
    """Request model for grading a single question."""

    question: Question
    student_answer: Any


class QuestionResult(BaseModel):
    """Model for a question grading result."""

    question_id: str
    points: float
    max_points: int
    feedback: str
    correct: bool


class GradeAssessmentResponse(BaseModel):
    """Response model for assessment grading."""

    total_points: int
    earned_points: float
    percentage: float
    questions: list[QuestionResult]
    overall_feedback: str


class GradeSingleQuestionResponse(BaseModel):
    """Response model for single question grading."""

    points: float
    feedback: str
    correct: bool


class HealthResponse(BaseModel):
    """Response model for health check."""

    status: str
    service: str
    version: str


# ════════════════════════════════════════════════════════════════════════════
# APPLICATION SETUP
# ════════════════════════════════════════════════════════════════════════════


# Global grader instance
grader: AutoGrader | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global grader
    # Initialize the grader on startup
    try:
        grader = create_auto_grader()
    except ValueError as e:
        print(f"Warning: Could not initialize AutoGrader: {e}")
        print("AI-powered grading will not be available.")

    yield

    # Cleanup on shutdown
    grader = None


app = FastAPI(
    title="Grading Engine Service",
    description="AI-powered auto-grading system for educational assessments",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ════════════════════════════════════════════════════════════════════════════
# ROUTES
# ════════════════════════════════════════════════════════════════════════════


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "grading-engine",
        "version": "1.0.0",
    }


@app.post("/grade/assessment", response_model=GradeAssessmentResponse)
async def grade_assessment(request: GradeAssessmentRequest):
    """
    Grade a complete assessment.

    This endpoint grades all questions in an assessment and provides
    detailed feedback for each question plus overall feedback.
    """
    if grader is None:
        raise HTTPException(
            status_code=503,
            detail="Grading service not available. Check OPENAI_API_KEY configuration.",
        )

    # Convert Pydantic models to dicts for the grader
    assessment_dict = {
        "title": request.assessment.title,
        "grade_level": request.assessment.grade_level,
        "questions": [
            {
                "id": q.id,
                "type": q.type,
                "text": q.text,
                "points": q.points,
                "correct_answer": q.correct_answer,
                "expected_answer": q.expected_answer,
                "rubric": q.rubric,
                "options": (
                    [o.model_dump() for o in q.options] if q.options else None
                ),
            }
            for q in request.assessment.questions
        ],
    }

    try:
        results = await grader.grade_assessment(
            assessment_dict, request.student_answers
        )

        return GradeAssessmentResponse(
            total_points=results["total_points"],
            earned_points=results["earned_points"],
            percentage=results["percentage"],
            questions=[
                QuestionResult(
                    question_id=q["question_id"],
                    points=q["points"],
                    max_points=q["max_points"],
                    feedback=q["feedback"],
                    correct=q["correct"],
                )
                for q in results["questions"]
            ],
            overall_feedback=results["overall_feedback"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grading failed: {str(e)}")


@app.post("/grade/question", response_model=GradeSingleQuestionResponse)
async def grade_single_question(request: GradeSingleQuestionRequest):
    """
    Grade a single question.

    This endpoint grades a single question and returns the score and feedback.
    """
    if grader is None:
        raise HTTPException(
            status_code=503,
            detail="Grading service not available. Check OPENAI_API_KEY configuration.",
        )

    question_dict = {
        "id": request.question.id,
        "type": request.question.type,
        "text": request.question.text,
        "points": request.question.points,
        "correct_answer": request.question.correct_answer,
        "expected_answer": request.question.expected_answer,
        "rubric": request.question.rubric,
    }

    try:
        result = await grader.grade_single_question(
            question_dict, request.student_answer
        )

        return GradeSingleQuestionResponse(
            points=result["points"],
            feedback=result["feedback"],
            correct=result.get("correct", False),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grading failed: {str(e)}")


# ════════════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════════════


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", "8080")),
        reload=os.environ.get("ENV", "development") == "development",
    )
