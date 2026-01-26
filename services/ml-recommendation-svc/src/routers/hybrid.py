"""
Hybrid Recommender Router

Provides REST endpoints for the hybrid recommendation engine combining:
- Collaborative filtering (similar learners)
- Content-based filtering (skill similarity)
- Knowledge tracing (mastery levels)
- Multi-armed bandits (exploration/exploitation)
"""

import time
from typing import Annotated, List, Dict, Any, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from src.models.hybrid_recommender import (
    HybridRecommender,
    RecommendationContext,
    RecommendedActivity,
)

logger = structlog.get_logger()
router = APIRouter(prefix="/hybrid", tags=["Hybrid Recommendations"])


# Request/Response Models
class HybridContextRequest(BaseModel):
    """Request context for hybrid recommendations"""
    learner_id: str = Field(..., description="Unique learner identifier")
    current_skill_id: Optional[str] = Field(None, description="Current focus skill")
    mastery_levels: Dict[str, float] = Field(
        default_factory=dict, 
        description="Skill mastery levels (0-1)"
    )
    recent_activities: List[str] = Field(
        default_factory=list, 
        description="Recently completed activities"
    )
    session_duration_minutes: int = Field(30, description="Available session time")
    time_of_day: str = Field("afternoon", description="Time of day")
    focus_score: float = Field(0.8, description="Current focus level (0-1)")
    learning_style: str = Field("visual", description="Preferred learning style")
    device_type: str = Field("tablet", description="Device type")


class HybridRecommendRequest(BaseModel):
    """Request for hybrid recommendations"""
    context: HybridContextRequest
    n: int = Field(10, ge=1, le=50, description="Number of recommendations")
    use_exploration: bool = Field(True, description="Include exploration items")
    explain: bool = Field(False, description="Include detailed explanations")


class HybridRecommendedItem(BaseModel):
    """A recommended activity from hybrid engine"""
    activity_id: str
    score: float
    confidence: float
    reason: str
    skill_id: str
    difficulty: float
    estimated_duration_minutes: int
    prerequisites_met: bool
    engagement_prediction: float


class HybridRecommendResponse(BaseModel):
    """Response with hybrid recommendations"""
    success: bool
    recommendations: List[HybridRecommendedItem]
    learner_id: str
    total_candidates: int
    processing_time_ms: float


class HybridFeedbackRequest(BaseModel):
    """Feedback for hybrid recommender"""
    activity_id: str = Field(..., description="Completed activity")
    completed: bool = Field(..., description="Whether completed")
    accuracy: float = Field(..., ge=0, le=1, description="Accuracy (0-1)")
    duration_minutes: Optional[int] = Field(None, description="Time spent")


class ActivityMetadataRequest(BaseModel):
    """Activity metadata for registration"""
    activity_id: str
    skill_id: str
    difficulty: float = Field(..., ge=0, le=1)
    duration_minutes: int = Field(10, ge=1)
    modality: str = Field("interactive")
    prerequisites: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)


class TrainingInteraction(BaseModel):
    """An interaction for collaborative filtering training"""
    learner_id: str
    activity_id: str
    rating: float = Field(..., ge=0, le=1)


class CollaborativeTrainRequest(BaseModel):
    """Request to train collaborative filter"""
    interactions: List[TrainingInteraction]


class SimilarLearnersResponse(BaseModel):
    """Response with similar learners"""
    success: bool
    learner_id: str
    similar_learners: List[Dict[str, Any]]


def get_hybrid_recommender(request: Request) -> HybridRecommender:
    """Get hybrid recommender from app state"""
    recommender = getattr(request.app.state, 'hybrid_recommender', None)
    if recommender is None:
        raise HTTPException(
            status_code=503, 
            detail="Hybrid recommender not initialized"
        )
    return recommender


@router.post("/recommend", response_model=HybridRecommendResponse)
async def get_hybrid_recommendations(
    request: HybridRecommendRequest,
    recommender: Annotated[HybridRecommender, Depends(get_hybrid_recommender)],
) -> HybridRecommendResponse:
    """
    Get personalized activity recommendations using hybrid approach
    
    Combines multiple recommendation strategies:
    - Collaborative filtering: Based on similar learners' preferences
    - Content-based: Based on skill similarity and difficulty matching
    - Knowledge tracing: Based on mastery levels and ZPD targeting
    - Multi-armed bandit: Balances exploration vs. exploitation
    """
    start_time = time.perf_counter()
    
    try:
        ctx = request.context
        
        # Create recommendation context
        rec_context = RecommendationContext(
            learner_id=ctx.learner_id,
            current_skill_id=ctx.current_skill_id,
            mastery_levels=ctx.mastery_levels,
            recent_activities=ctx.recent_activities,
            session_duration_minutes=ctx.session_duration_minutes,
            time_of_day=ctx.time_of_day,
            focus_score=ctx.focus_score,
            learning_style=ctx.learning_style,
            device_type=ctx.device_type,
        )
        
        # Get recommendations
        recs = recommender.recommend(
            context=rec_context,
            n=request.n,
            use_exploration=request.use_exploration,
            explain=request.explain,
        )
        
        processing_time = (time.perf_counter() - start_time) * 1000
        
        logger.info(
            "Generated hybrid recommendations",
            learner_id=ctx.learner_id,
            count=len(recs),
            processing_time_ms=processing_time,
        )
        
        return HybridRecommendResponse(
            success=True,
            recommendations=[
                HybridRecommendedItem(
                    activity_id=r.activity_id,
                    score=r.score,
                    confidence=r.confidence,
                    reason=r.reason,
                    skill_id=r.skill_id,
                    difficulty=r.difficulty,
                    estimated_duration_minutes=r.estimated_duration_minutes,
                    prerequisites_met=r.prerequisites_met,
                    engagement_prediction=r.engagement_prediction,
                )
                for r in recs
            ],
            learner_id=ctx.learner_id,
            total_candidates=len(recommender.content_based.activities),
            processing_time_ms=processing_time,
        )
        
    except Exception as e:
        logger.exception("Hybrid recommendation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback")
async def submit_hybrid_feedback(
    feedback: HybridFeedbackRequest,
    recommender: Annotated[HybridRecommender, Depends(get_hybrid_recommender)],
) -> Dict[str, Any]:
    """
    Submit feedback for activity completion
    
    Updates the multi-armed bandit and improves future recommendations
    """
    try:
        recommender.update_feedback(
            activity_id=feedback.activity_id,
            completed=feedback.completed,
            accuracy=feedback.accuracy,
            duration_minutes=feedback.duration_minutes,
        )
        
        logger.info(
            "Processed hybrid feedback",
            activity_id=feedback.activity_id,
            completed=feedback.completed,
            accuracy=feedback.accuracy,
        )
        
        return {
            "success": True,
            "activity_id": feedback.activity_id,
            "message": "Feedback recorded",
        }
        
    except Exception as e:
        logger.exception("Feedback processing failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/similar-learners/{learner_id}", response_model=SimilarLearnersResponse)
async def get_similar_learners(
    learner_id: str,
    n: int = 10,
    recommender: Annotated[HybridRecommender, Depends(get_hybrid_recommender)] = None,
) -> SimilarLearnersResponse:
    """
    Find learners with similar learning patterns
    
    Useful for peer learning groups and study partners
    """
    try:
        similar = recommender.get_similar_learners(learner_id, n)
        
        return SimilarLearnersResponse(
            success=True,
            learner_id=learner_id,
            similar_learners=[
                {"learner_id": lid, "similarity": sim}
                for lid, sim in similar
            ],
        )
        
    except Exception as e:
        logger.exception("Similar learners query failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/activities")
async def add_activity(
    activity: ActivityMetadataRequest,
    recommender: Annotated[HybridRecommender, Depends(get_hybrid_recommender)],
) -> Dict[str, Any]:
    """
    Register a new activity with the recommendation system
    """
    try:
        recommender.add_activity(
            activity_id=activity.activity_id,
            skill_id=activity.skill_id,
            difficulty=activity.difficulty,
            duration_minutes=activity.duration_minutes,
            modality=activity.modality,
            prerequisites=activity.prerequisites,
            tags=activity.tags,
        )
        
        logger.info(
            "Added activity",
            activity_id=activity.activity_id,
            skill_id=activity.skill_id,
        )
        
        return {
            "success": True,
            "activity_id": activity.activity_id,
            "message": "Activity registered",
        }
        
    except Exception as e:
        logger.exception("Add activity failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/activities/bulk")
async def add_activities_bulk(
    activities: List[ActivityMetadataRequest],
    recommender: Annotated[HybridRecommender, Depends(get_hybrid_recommender)],
) -> Dict[str, Any]:
    """
    Register multiple activities at once
    """
    try:
        activities_data = [
            {
                "activity_id": a.activity_id,
                "skill_id": a.skill_id,
                "difficulty": a.difficulty,
                "duration_minutes": a.duration_minutes,
                "modality": a.modality,
                "prerequisites": a.prerequisites,
                "tags": a.tags,
            }
            for a in activities
        ]
        
        recommender.add_activities_bulk(activities_data)
        
        logger.info("Added activities in bulk", count=len(activities))
        
        return {
            "success": True,
            "count": len(activities),
            "message": f"Registered {len(activities)} activities",
        }
        
    except Exception as e:
        logger.exception("Bulk add activities failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train/collaborative")
async def train_collaborative(
    request: CollaborativeTrainRequest,
    recommender: Annotated[HybridRecommender, Depends(get_hybrid_recommender)],
) -> Dict[str, Any]:
    """
    Train/update collaborative filtering model with interactions
    """
    try:
        interactions = [
            (i.learner_id, i.activity_id, i.rating)
            for i in request.interactions
        ]
        
        recommender.fit_collaborative(interactions)
        
        logger.info(
            "Trained collaborative filter",
            interaction_count=len(interactions),
        )
        
        return {
            "success": True,
            "interactions_trained": len(interactions),
            "message": "Collaborative filter updated",
        }
        
    except Exception as e:
        logger.exception("Collaborative training failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_hybrid_stats(
    recommender: Annotated[HybridRecommender, Depends(get_hybrid_recommender)],
) -> Dict[str, Any]:
    """
    Get hybrid recommender statistics
    """
    try:
        stats = recommender.get_stats()
        
        return {
            "success": True,
            "stats": stats,
        }
        
    except Exception as e:
        logger.exception("Stats retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/skills")
async def list_skills(
    recommender: Annotated[HybridRecommender, Depends(get_hybrid_recommender)],
) -> Dict[str, Any]:
    """
    List available skills in the system
    """
    try:
        skills = list(recommender.content_based.skill_embeddings.keys())
        
        return {
            "success": True,
            "skills": skills,
            "count": len(skills),
        }
        
    except Exception as e:
        logger.exception("Skills listing failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/skills/embeddings")
async def update_skill_embeddings(
    embeddings: Dict[str, List[float]],
    recommender: Annotated[HybridRecommender, Depends(get_hybrid_recommender)],
) -> Dict[str, Any]:
    """
    Update skill embeddings for content-based filtering
    """
    try:
        import numpy as np
        
        embeddings_np = {
            skill: np.array(emb)
            for skill, emb in embeddings.items()
        }
        
        recommender.set_skill_embeddings(embeddings_np)
        
        logger.info("Updated skill embeddings", skill_count=len(embeddings))
        
        return {
            "success": True,
            "skills_updated": len(embeddings),
            "message": "Skill embeddings updated",
        }
        
    except Exception as e:
        logger.exception("Embeddings update failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save")
async def save_model(
    path: str = "/app/models/hybrid",
    recommender: Annotated[HybridRecommender, Depends(get_hybrid_recommender)] = None,
) -> Dict[str, Any]:
    """
    Save hybrid recommender state to disk
    """
    try:
        recommender.save(path)
        
        logger.info("Saved hybrid recommender", path=path)
        
        return {
            "success": True,
            "path": path,
            "message": "Model saved",
        }
        
    except Exception as e:
        logger.exception("Model save failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/load")
async def load_model(
    path: str = "/app/models/hybrid",
    recommender: Annotated[HybridRecommender, Depends(get_hybrid_recommender)] = None,
) -> Dict[str, Any]:
    """
    Load hybrid recommender state from disk
    """
    try:
        recommender.load(path)
        
        logger.info("Loaded hybrid recommender", path=path)
        
        return {
            "success": True,
            "path": path,
            "stats": recommender.get_stats(),
            "message": "Model loaded",
        }
        
    except Exception as e:
        logger.exception("Model load failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
