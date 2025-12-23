"""
Recommendations router.
"""

import time
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request

from src.models import (
    RecommendationFeedback,
    RecommendationRequest,
    RecommendationResponse,
    RecommendationType,
)
from src.services.recommendation_engine import RecommendationEngine

logger = structlog.get_logger()
router = APIRouter()


def get_engine(request: Request) -> RecommendationEngine:
    """Get recommendation engine from app state."""
    return request.app.state.recommendation_engine


@router.post("/activities", response_model=RecommendationResponse)
async def get_activity_recommendations(
    request: RecommendationRequest,
    engine: Annotated[RecommendationEngine, Depends(get_engine)],
) -> RecommendationResponse:
    """
    Get personalized activity recommendations for a learner.
    
    Uses a hybrid approach combining:
    - Collaborative filtering (similar learner preferences)
    - Content-based filtering (skill/topic similarity)
    - Knowledge tracing (BKT-based mastery predictions)
    - Multi-armed bandit (exploration vs exploitation)
    """
    start_time = time.perf_counter()
    
    try:
        request.recommendation_type = RecommendationType.ACTIVITY
        recommendations = await engine.get_recommendations(request)
        
        processing_time = (time.perf_counter() - start_time) * 1000
        recommendations.processing_time_ms = processing_time
        
        logger.info(
            "Generated activity recommendations",
            learner_id=request.learner.learner_id,
            count=len(recommendations.items),
            processing_time_ms=processing_time,
        )
        
        return recommendations
        
    except Exception as e:
        logger.error(
            "Failed to generate recommendations",
            learner_id=request.learner.learner_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")


@router.post("/skills", response_model=RecommendationResponse)
async def get_skill_recommendations(
    request: RecommendationRequest,
    engine: Annotated[RecommendationEngine, Depends(get_engine)],
) -> RecommendationResponse:
    """
    Get skill practice recommendations based on mastery gaps.
    
    Prioritizes skills that:
    - Have low mastery but are prerequisites for target skills
    - Show declining performance trends
    - Haven't been practiced recently
    """
    start_time = time.perf_counter()
    
    try:
        request.recommendation_type = RecommendationType.SKILL
        recommendations = await engine.get_recommendations(request)
        
        processing_time = (time.perf_counter() - start_time) * 1000
        recommendations.processing_time_ms = processing_time
        
        return recommendations
        
    except Exception as e:
        logger.error(
            "Failed to generate skill recommendations",
            learner_id=request.learner.learner_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")


@router.post("/content", response_model=RecommendationResponse)
async def get_content_recommendations(
    request: RecommendationRequest,
    engine: Annotated[RecommendationEngine, Depends(get_engine)],
) -> RecommendationResponse:
    """
    Get content recommendations (videos, articles, interactive content).
    
    Considers:
    - Content difficulty vs learner level
    - Topic relevance to current learning goals
    - Content engagement history
    - Neurodiverse accessibility requirements
    """
    start_time = time.perf_counter()
    
    try:
        request.recommendation_type = RecommendationType.CONTENT
        recommendations = await engine.get_recommendations(request)
        
        processing_time = (time.perf_counter() - start_time) * 1000
        recommendations.processing_time_ms = processing_time
        
        return recommendations
        
    except Exception as e:
        logger.error(
            "Failed to generate content recommendations",
            learner_id=request.learner.learner_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")


@router.post("/feedback")
async def submit_feedback(
    feedback: RecommendationFeedback,
    engine: Annotated[RecommendationEngine, Depends(get_engine)],
) -> dict[str, str]:
    """
    Submit feedback on a recommendation.
    
    Used to improve recommendations through:
    - Bandit arm reward updates
    - Collaborative filtering model updates
    - Personalization refinement
    """
    try:
        await engine.process_feedback(feedback)
        
        logger.info(
            "Processed recommendation feedback",
            learner_id=feedback.learner_id,
            item_id=feedback.item_id,
            feedback_type=feedback.feedback_type,
        )
        
        return {"status": "ok", "message": "Feedback recorded"}
        
    except Exception as e:
        logger.error(
            "Failed to process feedback",
            learner_id=feedback.learner_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail="Failed to process feedback")
