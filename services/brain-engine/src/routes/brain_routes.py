"""
Brain Management API Routes

REST API endpoints for managing learner brain states.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
import structlog

from src.services.brain_manager import LearnerBrainManager, get_brain_manager
from src.lib.supabase_client import get_supabase_client

logger = structlog.get_logger()

router = APIRouter(prefix="/brain", tags=["brain"])


# Request/Response Models

class InitializeBrainRequest(BaseModel):
    """Request to initialize a new brain."""

    learner_id: str = Field(..., description="Unique learner identifier")
    baseline_assessment: Dict[str, Any] = Field(
        ...,
        description="Baseline assessment results",
        example={
            "strengths": ["reading", "creativity"],
            "weaknesses": ["math"],
            "learning_style": "visual",
            "subject_scores": {"reading": 75, "math": 45, "writing": 60}
        }
    )


class UpdateBrainRequest(BaseModel):
    """Request to update brain from activity."""

    subject: str = Field(..., description="Subject of the activity")
    accuracy: float = Field(..., ge=0.0, le=1.0, description="Accuracy score 0-1")
    time_spent: int = Field(..., ge=0, description="Time spent in seconds")
    engagement: float = Field(default=0.5, ge=0.0, le=1.0, description="Engagement score 0-1")
    completed: bool = Field(default=True, description="Whether activity was completed")
    activity_type: Optional[str] = Field(default=None, description="Type of activity")
    questions_answered: Optional[int] = Field(default=1, description="Number of questions")
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp of activity")


class BrainResponse(BaseModel):
    """Brain state response."""

    learner_id: str
    version: str
    created_at: str
    updated_at: str
    knowledge_graph: Dict[str, Any]
    learning_patterns: Dict[str, Any]
    mastery_levels: Dict[str, Any]
    engagement_profile: Dict[str, Any]
    adaptive_parameters: Dict[str, Any]


class RecommendationResponse(BaseModel):
    """Learning recommendation."""

    type: str
    subject: str
    priority: float
    reason: str
    estimated_time: int
    current_mastery: Optional[float] = None
    target_mastery: Optional[float] = None
    suggested_difficulty: Optional[str] = None
    days_since_practice: Optional[int] = None
    prerequisites_met: Optional[bool] = None


class InsightsResponse(BaseModel):
    """Brain insights response."""

    learner_id: str
    overall_mastery: float
    strongest_subjects: List[Dict[str, Any]]
    weakest_subjects: List[Dict[str, Any]]
    learning_velocity: float
    preferred_learning_style: str
    optimal_session_length: int
    best_time_of_day: Optional[str]
    total_time_spent_hours: float
    engagement_score: float
    subjects_at_target: int
    total_subjects: int
    current_streak: int
    best_streak_ever: int


# Dependency to get brain manager
def get_manager() -> LearnerBrainManager:
    """Get brain manager with Supabase client."""
    client = get_supabase_client()
    return get_brain_manager(client)


# Routes

@router.post(
    "/initialize",
    response_model=BrainResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initialize a new learner brain",
    description="Create initial brain model from baseline assessment results"
)
async def initialize_brain(
    request: InitializeBrainRequest,
    manager: LearnerBrainManager = Depends(get_manager)
) -> Dict[str, Any]:
    """Initialize a new learner brain from baseline assessment."""
    try:
        brain_state = await manager.initialize_brain(
            learner_id=request.learner_id,
            baseline_assessment=request.baseline_assessment
        )

        logger.info(
            "brain_initialized_via_api",
            learner_id=request.learner_id
        )

        return brain_state

    except Exception as e:
        logger.error("brain_initialization_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize brain: {str(e)}"
        )


@router.get(
    "/{learner_id}",
    response_model=BrainResponse,
    summary="Get learner brain state",
    description="Retrieve the current brain state for a learner"
)
async def get_brain(
    learner_id: str,
    manager: LearnerBrainManager = Depends(get_manager)
) -> Dict[str, Any]:
    """Get current brain state for a learner."""
    brain_state = await manager.get_brain(learner_id)

    if not brain_state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brain not found for learner: {learner_id}"
        )

    return brain_state.to_dict()


@router.put(
    "/{learner_id}/update",
    response_model=BrainResponse,
    summary="Update brain from activity",
    description="Update brain state based on learning activity results"
)
async def update_brain(
    learner_id: str,
    request: UpdateBrainRequest,
    manager: LearnerBrainManager = Depends(get_manager)
) -> Dict[str, Any]:
    """Update brain based on learning activity."""
    try:
        brain_state = await manager.update_brain(
            learner_id=learner_id,
            activity_data=request.model_dump()
        )

        logger.info(
            "brain_updated_via_api",
            learner_id=learner_id,
            subject=request.subject,
            accuracy=request.accuracy
        )

        return brain_state

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error("brain_update_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update brain: {str(e)}"
        )


@router.get(
    "/{learner_id}/recommendations",
    response_model=List[RecommendationResponse],
    summary="Get personalized recommendations",
    description="Generate personalized learning recommendations based on brain state"
)
async def get_recommendations(
    learner_id: str,
    limit: int = 5,
    manager: LearnerBrainManager = Depends(get_manager)
) -> List[Dict[str, Any]]:
    """Get personalized learning recommendations."""
    recommendations = await manager.get_personalized_recommendations(learner_id)

    if not recommendations:
        # Return empty list if brain not found or no recommendations
        brain = await manager.get_brain(learner_id)
        if not brain:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Brain not found for learner: {learner_id}"
            )

    return recommendations[:limit]


@router.get(
    "/{learner_id}/insights",
    response_model=InsightsResponse,
    summary="Get brain insights",
    description="Get comprehensive insights and analytics about a learner's brain state"
)
async def get_insights(
    learner_id: str,
    manager: LearnerBrainManager = Depends(get_manager)
) -> Dict[str, Any]:
    """Get comprehensive brain insights."""
    insights = await manager.get_brain_insights(learner_id)

    if not insights:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brain not found for learner: {learner_id}"
        )

    return insights


@router.delete(
    "/{learner_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Reset learner brain",
    description="Reset a learner's brain state (typically for re-assessment)"
)
async def reset_brain(
    learner_id: str,
    manager: LearnerBrainManager = Depends(get_manager)
) -> None:
    """Reset a learner's brain state."""
    success = await manager.reset_brain(learner_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset brain"
        )

    logger.info("brain_reset_via_api", learner_id=learner_id)


@router.get(
    "/{learner_id}/mastery/{subject}",
    summary="Get subject mastery",
    description="Get mastery level for a specific subject"
)
async def get_subject_mastery(
    learner_id: str,
    subject: str,
    manager: LearnerBrainManager = Depends(get_manager)
) -> Dict[str, Any]:
    """Get mastery level for a specific subject."""
    brain_state = await manager.get_brain(learner_id)

    if not brain_state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brain not found for learner: {learner_id}"
        )

    if subject not in brain_state.mastery_levels:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject '{subject}' not found in mastery levels"
        )

    mastery = brain_state.mastery_levels[subject]

    return {
        "learner_id": learner_id,
        "subject": subject,
        "current_level": mastery.current_level,
        "target_level": mastery.target_level,
        "progress_rate": mastery.progress_rate,
        "last_practiced": mastery.last_practiced.isoformat() if mastery.last_practiced else None,
        "practice_count": mastery.practice_count,
        "streak": mastery.streak,
        "best_streak": mastery.best_streak,
        "spaced_repetition_interval": mastery.spaced_repetition_interval,
    }


@router.post(
    "/{learner_id}/mastery/{subject}/target",
    summary="Set mastery target",
    description="Set a custom mastery target for a subject"
)
async def set_mastery_target(
    learner_id: str,
    subject: str,
    target: float,
    manager: LearnerBrainManager = Depends(get_manager)
) -> Dict[str, Any]:
    """Set a custom mastery target for a subject."""
    if not 0.0 <= target <= 1.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target must be between 0.0 and 1.0"
        )

    brain_state = await manager.get_brain(learner_id)

    if not brain_state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brain not found for learner: {learner_id}"
        )

    if subject not in brain_state.mastery_levels:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject '{subject}' not found"
        )

    brain_state.mastery_levels[subject].target_level = target

    # Save the update
    await manager.update_brain(learner_id, {
        "subject": subject,
        "accuracy": brain_state.mastery_levels[subject].current_level,
        "time_spent": 0,
        "engagement": brain_state.engagement_profile.average_engagement_score,
    })

    return {
        "learner_id": learner_id,
        "subject": subject,
        "new_target": target,
        "current_level": brain_state.mastery_levels[subject].current_level,
    }
