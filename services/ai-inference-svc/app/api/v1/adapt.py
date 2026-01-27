"""
Adapt API Routes.

Endpoints for content adaptation and personalization.
"""

from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.providers.service import get_ai_service
from app.providers.models import AIRequest, Message, MessageRole

router = APIRouter()


class AdaptContentRequest(BaseModel):
    """Request for content adaptation."""

    content: str = Field(..., description="Original content to adapt")
    content_type: str = Field(
        "lesson", description="Type of content (lesson, question, explanation)"
    )
    learner_profile: Dict = Field(..., description="Learner profile with preferences")
    adaptation_goals: List[str] = Field(
        default_factory=list,
        description="Specific adaptation goals (simplify, elaborate, personalize)",
    )


class AdaptContentResponse(BaseModel):
    """Response for adapted content."""

    original_content: str
    adapted_content: str
    adaptations_applied: List[str]
    readability_before: float
    readability_after: float


class PersonalizeRequest(BaseModel):
    """Request for content personalization."""

    content_id: str = Field(..., description="Content identifier")
    content: str = Field(..., description="Content to personalize")
    learner_id: str = Field(..., description="Learner identifier")
    personalization_tokens: Dict[str, str] = Field(
        default_factory=dict,
        description="Token replacements (e.g., {learner_name}: 'Alex')",
    )
    interests: List[str] = Field(
        default_factory=list, description="Learner interests"
    )


class SimplifyRequest(BaseModel):
    """Request for content simplification."""

    content: str = Field(..., description="Content to simplify")
    target_grade_level: int = Field(..., ge=0, le=12, description="Target grade level")
    preserve_key_concepts: List[str] = Field(
        default_factory=list, description="Key concepts that must be preserved"
    )


class DifficultyAdjustRequest(BaseModel):
    """Request for difficulty adjustment."""

    question: str = Field(..., description="Question to adjust")
    current_difficulty: int = Field(..., ge=1, le=5, description="Current difficulty 1-5")
    target_difficulty: int = Field(..., ge=1, le=5, description="Target difficulty 1-5")
    skill_code: str = Field(..., description="Skill being assessed")
    subject: str = Field(..., description="Subject area")


class AccessibilityAdaptRequest(BaseModel):
    """Request for accessibility adaptation."""

    content: str = Field(..., description="Content to adapt")
    adaptations_needed: List[str] = Field(
        ...,
        description="Required adaptations (dyslexia_friendly, reduced_text, high_contrast_text, simplified_language)",
    )


@router.post("/content", response_model=AdaptContentResponse)
async def adapt_content(request: AdaptContentRequest):
    """
    Adapt content based on learner profile and goals.

    Applies various adaptations like simplification, elaboration,
    or personalization based on the learner's needs.
    """
    try:
        service = get_ai_service()

        adaptation_instructions = []
        if "simplify" in request.adaptation_goals:
            adaptation_instructions.append("simplify vocabulary and sentence structure")
        if "elaborate" in request.adaptation_goals:
            adaptation_instructions.append("add more detailed explanations and examples")
        if "personalize" in request.adaptation_goals:
            adaptation_instructions.append("make the content more engaging for the learner")

        system_prompt = f"""You are an educational content adapter. Your task is to adapt
educational content to better suit a learner's needs while preserving the educational value.

Adaptation instructions: {', '.join(adaptation_instructions) if adaptation_instructions else 'Make appropriate adaptations based on learner profile.'}

Learner profile: {request.learner_profile}"""

        messages = [
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(
                role=MessageRole.USER,
                content=f"""Adapt the following {request.content_type}:

{request.content}

Provide the adapted version that better suits this learner.""",
            ),
        ]

        ai_request = AIRequest(
            messages=messages,
            max_tokens=1024,
            temperature=0.5,
        )

        response = await service.complete(ai_request)

        # Simple readability estimation (word count per sentence)
        original_words = len(request.content.split())
        original_sentences = max(1, request.content.count('.') + request.content.count('!') + request.content.count('?'))
        readability_before = original_words / original_sentences

        adapted_words = len(response.content.split())
        adapted_sentences = max(1, response.content.count('.') + response.content.count('!') + response.content.count('?'))
        readability_after = adapted_words / adapted_sentences

        return AdaptContentResponse(
            original_content=request.content,
            adapted_content=response.content,
            adaptations_applied=request.adaptation_goals or ["general_adaptation"],
            readability_before=round(readability_before, 2),
            readability_after=round(readability_after, 2),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/personalize")
async def personalize_content(request: PersonalizeRequest):
    """
    Personalize content for a specific learner.

    Replaces personalization tokens and optionally integrates
    learner interests into the content.
    """
    try:
        # Apply token replacements
        personalized = request.content
        for token, value in request.personalization_tokens.items():
            personalized = personalized.replace(f"{{{token}}}", value)

        # If interests provided and content needs interest integration
        if request.interests:
            service = get_ai_service()

            system_prompt = """You are an educational content personalizer.
Your task is to subtly integrate a learner's interests into educational content
to make it more engaging, while preserving the educational objectives."""

            messages = [
                Message(role=MessageRole.SYSTEM, content=system_prompt),
                Message(
                    role=MessageRole.USER,
                    content=f"""Personalize this content by subtly incorporating these interests: {', '.join(request.interests)}

Content:
{personalized}

Keep the core educational content intact while making it more relatable to the learner.""",
                ),
            ]

            ai_request = AIRequest(
                messages=messages,
                max_tokens=1024,
                temperature=0.6,
            )

            response = await service.complete(ai_request)
            personalized = response.content

        return {
            "content_id": request.content_id,
            "learner_id": request.learner_id,
            "original_content": request.content,
            "personalized_content": personalized,
            "tokens_applied": list(request.personalization_tokens.keys()),
            "interests_integrated": request.interests,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/simplify")
async def simplify_content(request: SimplifyRequest):
    """
    Simplify content to target a specific grade level.

    Reduces vocabulary complexity and sentence length while
    preserving key concepts and educational value.
    """
    try:
        service = get_ai_service()

        preserve_note = (
            f"You must preserve these key concepts: {', '.join(request.preserve_key_concepts)}"
            if request.preserve_key_concepts
            else ""
        )

        system_prompt = f"""You are an educational content simplifier.
Simplify the given content to be appropriate for grade {request.target_grade_level} students.
Use simpler vocabulary, shorter sentences, and clearer structure.
{preserve_note}"""

        messages = [
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(
                role=MessageRole.USER,
                content=f"""Simplify this content for grade {request.target_grade_level}:

{request.content}""",
            ),
        ]

        ai_request = AIRequest(
            messages=messages,
            max_tokens=1024,
            temperature=0.4,
        )

        response = await service.complete(ai_request)

        return {
            "original_content": request.content,
            "simplified_content": response.content,
            "target_grade_level": request.target_grade_level,
            "preserved_concepts": request.preserve_key_concepts,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/difficulty")
async def adjust_difficulty(request: DifficultyAdjustRequest):
    """
    Adjust the difficulty of a question.

    Modifies a question to be easier or harder while
    still assessing the same skill.
    """
    try:
        service = get_ai_service()

        direction = "easier" if request.target_difficulty < request.current_difficulty else "harder"
        difficulty_change = abs(request.target_difficulty - request.current_difficulty)

        system_prompt = f"""You are an educational assessment expert.
Modify questions to adjust their difficulty while keeping them focused on the same skill.
The question should assess: {request.skill_code} in {request.subject}."""

        messages = [
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(
                role=MessageRole.USER,
                content=f"""Make this question {direction} (change of {difficulty_change} level(s)):

Current difficulty: {request.current_difficulty}/5
Target difficulty: {request.target_difficulty}/5

Question:
{request.question}

Provide the adjusted question.""",
            ),
        ]

        ai_request = AIRequest(
            messages=messages,
            max_tokens=512,
            temperature=0.5,
        )

        response = await service.complete(ai_request)

        return {
            "original_question": request.question,
            "adjusted_question": response.content,
            "original_difficulty": request.current_difficulty,
            "target_difficulty": request.target_difficulty,
            "skill_code": request.skill_code,
            "adjustment_direction": direction,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/accessibility")
async def adapt_for_accessibility(request: AccessibilityAdaptRequest):
    """
    Adapt content for accessibility needs.

    Applies specific adaptations for various accessibility requirements
    like dyslexia-friendly formatting, reduced text, etc.
    """
    try:
        service = get_ai_service()

        adaptation_details = {
            "dyslexia_friendly": "Use shorter sentences, avoid complex words, add spacing",
            "reduced_text": "Condense to key points only, use bullet points",
            "high_contrast_text": "Format for high contrast display, avoid color-dependent meaning",
            "simplified_language": "Use basic vocabulary, simple sentence structures",
        }

        instructions = [
            adaptation_details.get(a, a) for a in request.adaptations_needed
        ]

        system_prompt = f"""You are an accessibility specialist for educational content.
Apply the following accessibility adaptations:
{chr(10).join(f'- {i}' for i in instructions)}"""

        messages = [
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(
                role=MessageRole.USER,
                content=f"""Adapt this content for accessibility:

{request.content}""",
            ),
        ]

        ai_request = AIRequest(
            messages=messages,
            max_tokens=1024,
            temperature=0.3,
        )

        response = await service.complete(ai_request)

        return {
            "original_content": request.content,
            "accessible_content": response.content,
            "adaptations_applied": request.adaptations_needed,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def adapt_health():
    """Health check for the adaptation service."""
    return {
        "status": "healthy",
        "service": "adapt",
        "capabilities": [
            "content_adaptation",
            "personalization",
            "simplification",
            "difficulty_adjustment",
            "accessibility_adaptation",
        ],
    }
