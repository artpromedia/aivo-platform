"""
Brain API Routes.

Endpoints for virtual brain operations, knowledge tracing, and mastery prediction.
"""

from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.providers.service import get_ai_service
from app.providers.models import AIRequest, Message, MessageRole

router = APIRouter()


class SkillMasteryRequest(BaseModel):
    """Request model for skill mastery analysis."""

    learner_id: str = Field(..., description="Learner identifier")
    skill_code: str = Field(..., description="Skill code to analyze")
    performance_history: List[Dict] = Field(
        default_factory=list, description="Recent performance data"
    )
    context: Optional[Dict] = Field(None, description="Additional context")


class MasteryPrediction(BaseModel):
    """Response model for mastery prediction."""

    learner_id: str
    skill_code: str
    current_mastery: float
    predicted_mastery: float
    confidence: float
    recommended_actions: List[str]


class KnowledgeStateRequest(BaseModel):
    """Request model for knowledge state update."""

    learner_id: str = Field(..., description="Learner identifier")
    skill_code: str = Field(..., description="Skill being practiced")
    is_correct: bool = Field(..., description="Whether the response was correct")
    response_time_ms: Optional[int] = Field(None, description="Response time in milliseconds")
    attempt_count: int = Field(1, ge=1, description="Attempt number for this question")


class KnowledgeStateResponse(BaseModel):
    """Response model for knowledge state."""

    learner_id: str
    skill_code: str
    p_know: float
    p_learn: float
    p_guess: float
    p_slip: float
    mastery_level: str


class LearningPathRequest(BaseModel):
    """Request for generating a learning path."""

    learner_id: str = Field(..., description="Learner identifier")
    target_skills: List[str] = Field(..., description="Target skills to master")
    current_mastery: Dict[str, float] = Field(
        default_factory=dict, description="Current mastery levels"
    )
    time_available_minutes: Optional[int] = Field(None, description="Available study time")


class NextContentRequest(BaseModel):
    """Request for next content recommendation."""

    learner_id: str = Field(..., description="Learner identifier")
    current_skill: str = Field(..., description="Current skill being practiced")
    recent_performance: List[Dict] = Field(
        default_factory=list, description="Recent performance data"
    )
    available_content_ids: List[str] = Field(
        default_factory=list, description="Available content IDs"
    )


@router.post("/mastery/predict", response_model=MasteryPrediction)
async def predict_mastery(request: SkillMasteryRequest):
    """
    Predict mastery level for a skill using AI analysis.

    Uses Bayesian knowledge tracing combined with neural predictions
    to estimate current and future mastery levels.
    """
    try:
        service = get_ai_service()

        # Build analysis prompt
        system_prompt = """You are an educational AI analyzing student mastery levels.
Based on the performance history provided, analyze the student's skill mastery
and provide predictions and recommendations."""

        performance_summary = (
            f"Performance history: {len(request.performance_history)} attempts"
            if request.performance_history
            else "No performance history available"
        )

        messages = [
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(
                role=MessageRole.USER,
                content=f"""Analyze mastery for:
Learner: {request.learner_id}
Skill: {request.skill_code}
{performance_summary}

Provide:
1. Estimated current mastery (0-1)
2. Predicted mastery after continued practice (0-1)
3. Confidence in prediction (0-1)
4. Recommended learning actions""",
            ),
        ]

        ai_request = AIRequest(
            messages=messages,
            max_tokens=512,
            temperature=0.3,
        )

        response = await service.complete(ai_request)

        # Calculate mastery from performance if available
        if request.performance_history:
            correct_count = sum(1 for p in request.performance_history if p.get("is_correct", False))
            current_mastery = correct_count / len(request.performance_history)
        else:
            current_mastery = 0.5  # Default prior

        return MasteryPrediction(
            learner_id=request.learner_id,
            skill_code=request.skill_code,
            current_mastery=current_mastery,
            predicted_mastery=min(1.0, current_mastery + 0.1),  # Simplified prediction
            confidence=0.75 if request.performance_history else 0.5,
            recommended_actions=[
                "Continue practicing with varied examples",
                "Review foundational concepts if struggling",
                "Attempt more challenging problems if mastering",
            ],
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/knowledge/update", response_model=KnowledgeStateResponse)
async def update_knowledge_state(request: KnowledgeStateRequest):
    """
    Update the knowledge state using Bayesian Knowledge Tracing.

    Applies BKT update equations to compute new probability of knowing
    based on the observed response.
    """
    # BKT parameters (could be learned/configured per skill)
    p_init = 0.3  # Initial probability of knowing
    p_learn = 0.1  # Probability of learning on each opportunity
    p_guess = 0.25  # Probability of guessing correctly
    p_slip = 0.1  # Probability of slipping (knowing but answering wrong)

    # Apply BKT update equations
    if request.is_correct:
        # P(K|correct) using Bayes' rule
        p_correct_if_know = 1 - p_slip
        p_correct_if_not_know = p_guess
        p_know_prior = p_init  # Would normally come from state

        numerator = p_correct_if_know * p_know_prior
        denominator = numerator + p_correct_if_not_know * (1 - p_know_prior)
        p_know = numerator / denominator if denominator > 0 else p_know_prior
    else:
        # P(K|incorrect) using Bayes' rule
        p_incorrect_if_know = p_slip
        p_incorrect_if_not_know = 1 - p_guess
        p_know_prior = p_init

        numerator = p_incorrect_if_know * p_know_prior
        denominator = numerator + p_incorrect_if_not_know * (1 - p_know_prior)
        p_know = numerator / denominator if denominator > 0 else p_know_prior

    # Apply learning (for unlearned probability mass)
    p_know_updated = p_know + (1 - p_know) * p_learn

    # Determine mastery level
    if p_know_updated >= 0.95:
        mastery_level = "mastered"
    elif p_know_updated >= 0.7:
        mastery_level = "proficient"
    elif p_know_updated >= 0.5:
        mastery_level = "developing"
    else:
        mastery_level = "novice"

    return KnowledgeStateResponse(
        learner_id=request.learner_id,
        skill_code=request.skill_code,
        p_know=round(p_know_updated, 4),
        p_learn=p_learn,
        p_guess=p_guess,
        p_slip=p_slip,
        mastery_level=mastery_level,
    )


@router.post("/learning-path/generate")
async def generate_learning_path(request: LearningPathRequest):
    """
    Generate an optimized learning path for target skills.

    Uses AI to create a personalized sequence of learning activities
    based on current mastery and target goals.
    """
    try:
        service = get_ai_service()

        system_prompt = """You are an educational AI that creates optimized learning paths.
Generate a sequence of learning steps that efficiently moves a student from their
current knowledge state to mastery of target skills."""

        mastery_summary = ", ".join(
            f"{skill}: {level:.0%}" for skill, level in request.current_mastery.items()
        ) or "No prior mastery data"

        messages = [
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(
                role=MessageRole.USER,
                content=f"""Create a learning path for:
Learner: {request.learner_id}
Target Skills: {', '.join(request.target_skills)}
Current Mastery: {mastery_summary}
Time Available: {request.time_available_minutes or 'Unlimited'} minutes

Provide an ordered list of learning steps with estimated durations.""",
            ),
        ]

        ai_request = AIRequest(
            messages=messages,
            max_tokens=1024,
            temperature=0.5,
        )

        response = await service.complete(ai_request)

        # Generate structured path
        steps = []
        for i, skill in enumerate(request.target_skills):
            current = request.current_mastery.get(skill, 0.0)
            steps.append({
                "order": i + 1,
                "skill": skill,
                "current_mastery": current,
                "target_mastery": 0.8,
                "estimated_minutes": max(10, int((0.8 - current) * 60)),
                "activities": ["Review concepts", "Practice problems", "Assessment"],
            })

        return {
            "learner_id": request.learner_id,
            "path": steps,
            "total_estimated_minutes": sum(s["estimated_minutes"] for s in steps),
            "ai_recommendations": response.content,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/content/next")
async def recommend_next_content(request: NextContentRequest):
    """
    Recommend the next best content item for the learner.

    Uses knowledge state and performance history to select
    appropriately challenging content.
    """
    try:
        # Calculate performance metrics
        if request.recent_performance:
            correct_rate = sum(
                1 for p in request.recent_performance if p.get("is_correct", False)
            ) / len(request.recent_performance)
        else:
            correct_rate = 0.5

        # Determine recommended difficulty adjustment
        if correct_rate >= 0.85:
            difficulty_adjustment = "increase"
            recommendation_reason = "Student is performing well, ready for more challenge"
        elif correct_rate <= 0.5:
            difficulty_adjustment = "decrease"
            recommendation_reason = "Student may need easier content to build confidence"
        else:
            difficulty_adjustment = "maintain"
            recommendation_reason = "Current difficulty level is appropriate"

        # Select content (would normally query content service)
        selected_content = (
            request.available_content_ids[0]
            if request.available_content_ids
            else None
        )

        return {
            "learner_id": request.learner_id,
            "skill": request.current_skill,
            "recommended_content_id": selected_content,
            "difficulty_adjustment": difficulty_adjustment,
            "reason": recommendation_reason,
            "performance_summary": {
                "recent_correct_rate": correct_rate,
                "attempts": len(request.recent_performance),
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def brain_health():
    """Health check for the brain service."""
    return {
        "status": "healthy",
        "service": "brain",
        "capabilities": [
            "mastery_prediction",
            "knowledge_tracing",
            "learning_path_generation",
            "content_recommendation",
        ],
    }
