"""
Generate API Routes.

Endpoints for AI text generation and completion.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.providers.service import get_ai_service, init_ai_service
from app.providers.models import AIRequest, Message, MessageRole

router = APIRouter()


class GenerateRequest(BaseModel):
    """Request model for text generation."""

    prompt: str = Field(..., description="The prompt to generate from")
    system_prompt: Optional[str] = Field(None, description="Optional system prompt")
    max_tokens: int = Field(1024, ge=1, le=8192, description="Maximum tokens to generate")
    temperature: float = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    model: Optional[str] = Field(None, description="Model to use (optional)")
    preferred_provider: Optional[str] = Field(None, description="Preferred provider ID")


class GenerateResponse(BaseModel):
    """Response model for text generation."""

    content: str
    model: str
    provider: str
    tokens_used: int
    latency_ms: int


class HintRequest(BaseModel):
    """Request model for hint generation."""

    question: str = Field(..., description="The question to generate a hint for")
    subject: str = Field(..., description="Subject area")
    difficulty: int = Field(3, ge=1, le=5, description="Difficulty level 1-5")
    learner_context: Optional[dict] = Field(None, description="Optional learner context")


class HintResponse(BaseModel):
    """Response model for hint generation."""

    hint: str
    hint_level: int
    follow_up_prompt: Optional[str] = None


class ExplanationRequest(BaseModel):
    """Request model for explanation generation."""

    concept: str = Field(..., description="The concept to explain")
    grade_level: int = Field(..., ge=0, le=12, description="Grade level")
    learning_style: Optional[str] = Field(None, description="Preferred learning style")


class FeedbackRequest(BaseModel):
    """Request model for feedback generation."""

    question: str = Field(..., description="The original question")
    student_answer: str = Field(..., description="The student's answer")
    correct_answer: str = Field(..., description="The correct answer")
    subject: str = Field(..., description="Subject area")


@router.post("/generate", response_model=GenerateResponse)
async def generate_text(request: GenerateRequest):
    """
    Generate text using AI with automatic failover.

    Uses the multi-provider service to generate text, automatically
    failing over to backup providers if the primary is unavailable.
    """
    try:
        service = get_ai_service()

        messages = []
        if request.system_prompt:
            messages.append(Message(role=MessageRole.SYSTEM, content=request.system_prompt))
        messages.append(Message(role=MessageRole.USER, content=request.prompt))

        ai_request = AIRequest(
            messages=messages,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            model=request.model,
            preferred_provider=request.preferred_provider,
        )

        response = await service.complete(ai_request)

        return GenerateResponse(
            content=response.content,
            model=response.model_used,
            provider=response.provider_used,
            tokens_used=response.usage.total_tokens,
            latency_ms=response.latency_ms,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hint", response_model=HintResponse)
async def generate_hint(request: HintRequest):
    """
    Generate a pedagogical hint for a question.

    Creates a hint that guides the learner without giving away the answer,
    appropriate for the difficulty level and subject area.
    """
    try:
        service = get_ai_service()

        system_prompt = f"""You are an educational AI assistant helping students learn {request.subject}.
Generate a helpful hint for the following question that guides the student toward the answer
without giving it away directly. The hint should be appropriate for difficulty level {request.difficulty}/5."""

        if request.learner_context:
            system_prompt += f"\n\nLearner context: {request.learner_context}"

        messages = [
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(role=MessageRole.USER, content=f"Question: {request.question}\n\nProvide a helpful hint."),
        ]

        ai_request = AIRequest(
            messages=messages,
            max_tokens=256,
            temperature=0.7,
        )

        response = await service.complete(ai_request)

        return HintResponse(
            hint=response.content,
            hint_level=1,
            follow_up_prompt="Would you like another hint?",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explanation")
async def generate_explanation(request: ExplanationRequest):
    """
    Generate an explanation for a concept at the appropriate grade level.
    """
    try:
        service = get_ai_service()

        system_prompt = f"""You are an educational AI assistant. Explain concepts clearly and appropriately
for a grade {request.grade_level} student."""

        if request.learning_style:
            system_prompt += f" Adapt your explanation to a {request.learning_style} learning style."

        messages = [
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(role=MessageRole.USER, content=f"Please explain: {request.concept}"),
        ]

        ai_request = AIRequest(
            messages=messages,
            max_tokens=512,
            temperature=0.5,
        )

        response = await service.complete(ai_request)

        return {
            "explanation": response.content,
            "grade_level": request.grade_level,
            "concept": request.concept,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback")
async def generate_feedback(request: FeedbackRequest):
    """
    Generate constructive feedback on a student's answer.
    """
    try:
        service = get_ai_service()

        system_prompt = f"""You are an educational AI assistant providing feedback on student answers in {request.subject}.
Provide constructive, encouraging feedback that helps the student learn."""

        prompt = f"""Question: {request.question}
Student's Answer: {request.student_answer}
Correct Answer: {request.correct_answer}

Provide constructive feedback on the student's answer."""

        messages = [
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(role=MessageRole.USER, content=prompt),
        ]

        ai_request = AIRequest(
            messages=messages,
            max_tokens=512,
            temperature=0.5,
        )

        response = await service.complete(ai_request)

        return {
            "feedback": response.content,
            "is_correct": request.student_answer.strip().lower() == request.correct_answer.strip().lower(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def generate_health():
    """Health check for the generate service."""
    try:
        service = get_ai_service()
        health = await service.get_detailed_health()
        return {
            "status": "healthy",
            "providers": health,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }
