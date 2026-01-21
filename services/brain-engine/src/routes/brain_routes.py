"""
Brain Management API Routes

REST API endpoints for managing learner brain states.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
import structlog

from src.services.brain_manager import LearnerBrainManager, get_brain_manager
from src.services.curriculum_integration import (
    CurriculumIntegrationService,
    get_curriculum_integration,
)
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


# Curriculum-related models

class CurriculumLocationRequest(BaseModel):
    """Request to align brain with curriculum based on location."""

    state_code: Optional[str] = Field(None, description="Two-letter state code (e.g., TX, CA)")
    zip_code: Optional[str] = Field(None, description="5-digit ZIP code")
    district_id: Optional[str] = Field(None, description="NCES district ID")
    district_name: Optional[str] = Field(None, description="District name")
    school_id: Optional[str] = Field(None, description="School identifier")
    grade_level: Optional[str] = Field(None, description="Grade level (e.g., 'K', '1', '2', ..., '12')")


class CurriculumAlignmentResponse(BaseModel):
    """Response for curriculum alignment."""

    learner_id: str
    success: bool
    curriculum_standards: List[str]
    aligned_skills: List[str]
    state_code: Optional[str]
    district_name: Optional[str]
    message: str


class LearningPathItem(BaseModel):
    """Single item in a learning path."""

    skill_id: str
    skill_name: str
    priority: float
    current_mastery: float
    target_mastery: float
    estimated_time_minutes: int
    prerequisites: List[str]
    curriculum_standard: Optional[str]
    difficulty: str


class LearningPathResponse(BaseModel):
    """Curriculum-aligned learning path response."""

    learner_id: str
    path_id: str
    path_name: str
    total_items: int
    estimated_total_time_hours: float
    curriculum_standards: List[str]
    items: List[LearningPathItem]
    created_at: str


# Dependency to get brain manager
def get_manager() -> LearnerBrainManager:
    """Get brain manager with Supabase client."""
    client = get_supabase_client()
    return get_brain_manager(client)


# Dependency to get curriculum integration service
def get_curriculum_service() -> CurriculumIntegrationService:
    """Get curriculum integration service."""
    return get_curriculum_integration()


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


# ========== Curriculum Integration Endpoints ==========


@router.put(
    "/{learner_id}/curriculum",
    response_model=CurriculumAlignmentResponse,
    summary="Align brain with curriculum",
    description="Align learner's brain with curriculum based on location (state, ZIP, district)"
)
async def align_brain_with_curriculum(
    learner_id: str,
    request: CurriculumLocationRequest,
    manager: LearnerBrainManager = Depends(get_manager),
    curriculum_service: CurriculumIntegrationService = Depends(get_curriculum_service),
) -> Dict[str, Any]:
    """
    Align a learner's brain with curriculum based on their location.
    
    This endpoint:
    1. Detects curriculum standards from the learner's state
    2. Looks up district-specific curriculum if available
    3. Updates the brain's curriculum alignment
    4. Adjusts skill priorities based on curriculum requirements
    """
    # Get existing brain state
    brain_state = await manager.get_brain(learner_id)
    
    if not brain_state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brain not found for learner: {learner_id}"
        )
    
    try:
        # Detect curriculum standards from location (sync function)
        curriculum_standards = curriculum_service.detect_curriculum_standards(
            state_code=request.state_code,
            _zip_code=request.zip_code,
        )
        
        # Look up district-specific curriculum if district provided
        if request.district_id or request.zip_code:
            district_curriculum = await curriculum_service.lookup_district_curriculum(
                zip_code=request.zip_code,
                state_code=request.state_code,
                district_id=request.district_id,
                district_name=request.district_name,
            )
            # Use district's standards if available
            if district_curriculum.get("standards"):
                curriculum_standards = district_curriculum["standards"]
        
        # Align brain with curriculum
        aligned_brain = await curriculum_service.align_brain_with_curriculum(
            brain_state=brain_state,
            state_code=request.state_code,
            zip_code=request.zip_code,
            _nces_district_id=request.district_id,
            curriculum_standards=curriculum_standards,
        )
        
        # Get aligned skills
        aligned_skills = aligned_brain.curriculum_alignment.aligned_skills
        
        logger.info(
            "brain_curriculum_aligned",
            learner_id=learner_id,
            state_code=request.state_code,
            standards_count=len(curriculum_standards),
            skills_aligned=len(aligned_skills),
        )
        
        return {
            "learner_id": learner_id,
            "success": True,
            "curriculum_standards": curriculum_standards,
            "aligned_skills": aligned_skills,
            "state_code": request.state_code,
            "district_name": request.district_name,
            "message": f"Brain aligned with {len(curriculum_standards)} curriculum standards",
        }
        
    except Exception as e:
        logger.error("curriculum_alignment_failed", error=str(e), learner_id=learner_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to align curriculum: {str(e)}"
        )


@router.get(
    "/{learner_id}/curriculum",
    summary="Get curriculum alignment",
    description="Get the current curriculum alignment for a learner's brain"
)
async def get_curriculum_alignment(
    learner_id: str,
    manager: LearnerBrainManager = Depends(get_manager),
) -> Dict[str, Any]:
    """Get the current curriculum alignment for a learner."""
    brain_state = await manager.get_brain(learner_id)
    
    if not brain_state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brain not found for learner: {learner_id}"
        )
    
    alignment = brain_state.curriculum_alignment
    
    return {
        "learner_id": learner_id,
        "state_code": alignment.state_code,
        "zip_code": alignment.zip_code,
        "nces_district_id": alignment.nces_district_id,
        "district_name": alignment.district_name,
        "curriculum_standards": alignment.curriculum_standards,
        "curriculum_version": alignment.curriculum_version,
        "aligned_skills": alignment.aligned_skills,
        "last_synced": alignment.last_synced.isoformat() if alignment.last_synced else None,
    }


@router.get(
    "/{learner_id}/learning-path",
    summary="Get curriculum-aligned learning path",
    description="Generate a personalized learning path based on curriculum and mastery"
)
async def get_learning_path(
    learner_id: str,
    max_items: int = 20,
    manager: LearnerBrainManager = Depends(get_manager),
    curriculum_service: CurriculumIntegrationService = Depends(get_curriculum_service),
) -> Dict[str, Any]:
    """
    Generate a personalized, curriculum-aligned learning path.
    
    This considers:
    - Current mastery levels
    - Curriculum requirements
    - Skill prerequisites
    - Learning velocity
    """
    brain_state = await manager.get_brain(learner_id)
    
    if not brain_state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brain not found for learner: {learner_id}"
        )
    
    try:
        learning_path_items = await curriculum_service.create_curriculum_learning_path(
            brain_state=brain_state,
        )
        
        # Limit to max_items
        limited_items = learning_path_items[:max_items]
        
        # Calculate estimated total time (15 min per item average)
        estimated_hours = len(limited_items) * 0.25
        
        return {
            "learner_id": learner_id,
            "path_id": f"path_{learner_id}_{len(limited_items)}",
            "path_name": "Personalized Learning Path",
            "total_items": len(limited_items),
            "estimated_total_time_hours": estimated_hours,
            "curriculum_standards": brain_state.curriculum_alignment.curriculum_standards,
            "items": [
                {
                    "skill_id": item["skill_id"],
                    "skill_name": item.get("name", item["skill_id"]),
                    "priority": item.get("priority", 0.5),
                    "current_mastery": item.get("current_mastery", 0.0),
                    "target_mastery": item.get("target_mastery", 0.8),
                    "estimated_time_minutes": 15,
                    "prerequisites": [],
                    "curriculum_standard": None,
                    "difficulty": "medium",
                }
                for item in limited_items
            ],
            "created_at": datetime.now().isoformat(),
        }
        
    except Exception as e:
        logger.error("learning_path_generation_failed", error=str(e), learner_id=learner_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate learning path: {str(e)}"
        )


@router.post(
    "/{learner_id}/curriculum/sync",
    summary="Sync curriculum from external source",
    description="Force a curriculum sync from the curriculum service"
)
async def sync_curriculum(
    learner_id: str,
    manager: LearnerBrainManager = Depends(get_manager),
    curriculum_service: CurriculumIntegrationService = Depends(get_curriculum_service),
) -> Dict[str, Any]:
    """
    Force a curriculum sync for a learner.
    
    This re-fetches the latest curriculum standards and updates the brain.
    """
    brain_state = await manager.get_brain(learner_id)
    
    if not brain_state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brain not found for learner: {learner_id}"
        )
    
    try:
        # Get current alignment info
        alignment = brain_state.curriculum_alignment
        
        if not alignment.state_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No curriculum alignment configured. Use PUT /brain/{id}/curriculum first."
            )
        
        # Re-fetch curriculum standards (sync function)
        curriculum_standards = curriculum_service.detect_curriculum_standards(
            state_code=alignment.state_code,
            _zip_code=alignment.zip_code,
        )
        
        # Look up district curriculum if configured
        if alignment.nces_district_id or alignment.zip_code:
            district_curriculum = await curriculum_service.lookup_district_curriculum(
                zip_code=alignment.zip_code,
                state_code=alignment.state_code,
                district_id=alignment.nces_district_id,
            )
            if district_curriculum.get("standards"):
                curriculum_standards = district_curriculum["standards"]
        
        # Align brain with curriculum
        aligned_brain = await curriculum_service.align_brain_with_curriculum(
            brain_state=brain_state,
            state_code=alignment.state_code,
            zip_code=alignment.zip_code,
            _nces_district_id=alignment.nces_district_id,
            curriculum_standards=curriculum_standards,
        )
        
        logger.info(
            "curriculum_synced",
            learner_id=learner_id,
            standards_count=len(curriculum_standards),
        )
        
        return {
            "success": True,
            "learner_id": learner_id,
            "curriculum_standards": curriculum_standards,
            "synced_at": aligned_brain.curriculum_alignment.last_synced.isoformat(),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("curriculum_sync_failed", error=str(e), learner_id=learner_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync curriculum: {str(e)}"
        )