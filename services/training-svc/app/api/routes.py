"""
FastAPI routes for training service
Integrates all ML models into production API

This module provides the REST API interface for:
- Bayesian Knowledge Tracing (BKT) updates and queries
- Brain cloning (personalized model creation)
- Fine-tuning personalized models
- Federated learning aggregation
"""

import os
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/training", tags=["Training"])


# ============================================================================
# Request/Response Models
# ============================================================================

class BKTUpdateRequest(BaseModel):
    """Request to update BKT with a learning interaction"""
    learner_id: str = Field(..., description="Unique learner identifier")
    skill_id: str = Field(..., description="Skill being practiced")
    correct: bool = Field(..., description="Whether response was correct")


class BKTMasteryResponse(BaseModel):
    """BKT mastery probability response"""
    learner_id: str
    skill_id: str
    mastery_probability: float
    updated_at: datetime


class BKTBatchUpdateRequest(BaseModel):
    """Batch update for multiple interactions"""
    learner_id: str
    interactions: List[Dict[str, Any]]  # [{skill_id, correct}, ...]


class CloneBrainRequest(BaseModel):
    """Request to clone base brain for a learner"""
    learner_id: str = Field(..., description="Unique learner identifier")
    grade_level: int = Field(..., ge=1, le=12, description="Grade level 1-12")
    learning_pace: float = Field(1.0, ge=0.5, le=2.0, description="Learning pace multiplier")
    preferred_modality: str = Field("visual", description="visual, auditory, kinesthetic")
    attention_span_minutes: int = Field(20, ge=5, le=60, description="Attention span")
    iep_accommodations: List[str] = Field(default_factory=list, description="IEP accommodations")
    strengths: List[str] = Field(default_factory=list, description="Learning strengths")
    challenges: List[str] = Field(default_factory=list, description="Learning challenges")


class FineTuneRequest(BaseModel):
    """Request to fine-tune a learner's model"""
    learner_id: str = Field(..., description="Learner to fine-tune")
    interactions: List[Dict[str, Any]] = Field(..., description="Interaction history")
    num_epochs: int = Field(5, ge=1, le=20, description="Training epochs")
    learning_rate: float = Field(0.001, ge=0.0001, le=0.1, description="Learning rate")


class PredictMasteryRequest(BaseModel):
    """Request to predict mastery using neural network"""
    learner_id: str
    skill_id: str
    context: Dict[str, float] = Field(default_factory=dict, description="Context features")


class AggregateUpdatesRequest(BaseModel):
    """Request to aggregate federated updates"""
    learner_ids: List[str] = Field(..., description="Learners to aggregate")
    aggregation_weight: float = Field(0.1, ge=0.01, le=0.5, description="Weight for base model update")


# ============================================================================
# Model Accessors
# ============================================================================

def get_bkt_model(request: Request):
    """Get BKT model from app state"""
    bkt = getattr(request.app.state, 'bkt_model', None)
    if bkt is None:
        raise HTTPException(status_code=503, detail="BKT model not initialized")
    return bkt


def get_brain_cloner(request: Request):
    """Get brain cloner from app state"""
    cloner = getattr(request.app.state, 'brain_cloner', None)
    if cloner is None:
        raise HTTPException(status_code=503, detail="Brain cloner not initialized")
    return cloner


# ============================================================================
# BKT Endpoints
# ============================================================================

@router.post("/bkt/update", response_model=BKTMasteryResponse)
async def update_bkt(request: Request, body: BKTUpdateRequest):
    """
    Update BKT model with learning interaction
    
    Returns updated mastery probability for the skill.
    This should be called after each practice attempt.
    """
    try:
        bkt_model = get_bkt_model(request)
        
        # Initialize skill if not exists
        if body.skill_id not in bkt_model.parameters:
            bkt_model.initialize_skill(body.skill_id)
        
        # Update mastery
        mastery = bkt_model.update(
            body.learner_id,
            body.skill_id,
            body.correct
        )
        
        logger.info(
            f"BKT updated: learner={body.learner_id}, skill={body.skill_id}, "
            f"correct={body.correct}, mastery={mastery:.3f}"
        )
        
        return BKTMasteryResponse(
            learner_id=body.learner_id,
            skill_id=body.skill_id,
            mastery_probability=mastery,
            updated_at=datetime.utcnow()
        )
    
    except Exception as e:
        logger.exception(f"BKT update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bkt/update/batch")
async def update_bkt_batch(request: Request, body: BKTBatchUpdateRequest):
    """
    Batch update BKT with multiple interactions
    
    More efficient than individual calls for bulk updates.
    """
    try:
        bkt_model = get_bkt_model(request)
        
        results = []
        for interaction in body.interactions:
            skill_id = interaction['skill_id']
            correct = interaction['correct']
            
            if skill_id not in bkt_model.parameters:
                bkt_model.initialize_skill(skill_id)
            
            mastery = bkt_model.update(body.learner_id, skill_id, correct)
            results.append({
                'skill_id': skill_id,
                'mastery_probability': mastery,
            })
        
        return {
            'learner_id': body.learner_id,
            'updates': results,
            'count': len(results),
            'updated_at': datetime.utcnow().isoformat(),
        }
    
    except Exception as e:
        logger.exception(f"BKT batch update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bkt/mastery/{learner_id}/{skill_id}")
async def get_bkt_mastery(request: Request, learner_id: str, skill_id: str):
    """Get current BKT mastery probability for a skill"""
    try:
        bkt_model = get_bkt_model(request)
        mastery = bkt_model.get_mastery(learner_id, skill_id)
        
        return {
            "learner_id": learner_id,
            "skill_id": skill_id,
            "mastery_probability": mastery,
            "status": "tracked" if skill_id in bkt_model.parameters else "using_prior"
        }
    
    except Exception as e:
        logger.exception(f"Get mastery failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bkt/mastery/{learner_id}")
async def get_all_mastery(request: Request, learner_id: str):
    """Get mastery probabilities for all skills for a learner"""
    try:
        bkt_model = get_bkt_model(request)
        
        masteries = {}
        if learner_id in bkt_model.learner_mastery:
            masteries = dict(bkt_model.learner_mastery[learner_id])
        
        return {
            "learner_id": learner_id,
            "skills": masteries,
            "count": len(masteries),
        }
    
    except Exception as e:
        logger.exception(f"Get all mastery failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bkt/optimal-skill/{learner_id}")
async def get_optimal_skill(
    request: Request,
    learner_id: str,
    candidate_skills: List[str],
    target_mastery: float = 0.7,
):
    """
    Find the optimal skill to practice next
    
    Returns the skill closest to but below the target mastery.
    """
    try:
        bkt_model = get_bkt_model(request)
        
        optimal = bkt_model.get_optimal_skill(
            learner_id,
            candidate_skills,
            target_mastery,
        )
        
        return {
            "learner_id": learner_id,
            "optimal_skill": optimal,
            "reason": "Closest to target mastery without exceeding it",
        }
    
    except Exception as e:
        logger.exception(f"Get optimal skill failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Brain Cloning Endpoints
# ============================================================================

@router.post("/brain/clone")
async def clone_brain(
    request: Request,
    body: CloneBrainRequest,
    background_tasks: BackgroundTasks,
):
    """
    Clone base brain model for a learner
    
    Creates a personalized neural network model that will be
    fine-tuned on the learner's interaction history.
    """
    try:
        brain_cloner = get_brain_cloner(request)
        
        # Create learner profile
        from app.models.learner_model import LearnerProfile
        
        profile = LearnerProfile(
            learner_id=body.learner_id,
            grade_level=body.grade_level,
            learning_pace=body.learning_pace,
            preferred_modality=body.preferred_modality,
            attention_span_minutes=body.attention_span_minutes,
            iep_accommodations=body.iep_accommodations,
            strengths=body.strengths,
            challenges=body.challenges,
        )
        
        # Clone model
        model = brain_cloner.clone_for_learner(profile)
        
        # Schedule async save
        model_path = f"models/learners/{body.learner_id}.pt"
        background_tasks.add_task(
            brain_cloner.save_learner_model,
            body.learner_id,
            model_path,
        )
        
        logger.info(f"Cloned brain for learner {body.learner_id}")
        
        return {
            "status": "success",
            "learner_id": body.learner_id,
            "model_cloned": True,
            "personalization_strength": 0.3,
            "model_path": model_path,
            "message": "Brain model cloned and ready for fine-tuning"
        }
    
    except Exception as e:
        logger.exception(f"Clone brain failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brain/fine-tune")
async def fine_tune_brain(request: Request, body: FineTuneRequest):
    """
    Fine-tune learner's brain model on their interaction history
    
    Should be called periodically (e.g., after every 20 interactions)
    to update the personalized model.
    """
    try:
        brain_cloner = get_brain_cloner(request)
        
        # Convert interactions to InteractionHistory objects
        from app.models.learner_model import InteractionHistory
        
        interactions = []
        for item in body.interactions:
            interactions.append(InteractionHistory(
                skill_id=item['skill_id'],
                correct=item['correct'],
                response_time_ms=item.get('response_time_ms', 5000),
                hints_used=item.get('hints_used', 0),
                difficulty=item.get('difficulty', 0.5),
                timestamp=datetime.fromisoformat(item['timestamp']) if 'timestamp' in item else datetime.utcnow(),
            ))
        
        # Fine-tune model
        metrics = brain_cloner.fine_tune(
            body.learner_id,
            interactions,
            num_epochs=body.num_epochs,
            learning_rate=body.learning_rate,
        )
        
        logger.info(
            f"Fine-tuned brain for {body.learner_id}: "
            f"samples={metrics['samples']}, loss={metrics.get('final_loss', 'N/A')}"
        )
        
        return {
            "status": metrics['status'],
            "learner_id": body.learner_id,
            "samples_used": metrics['samples'],
            "final_loss": metrics.get('final_loss'),
            "message": "Model fine-tuned successfully"
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Fine-tune failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brain/predict-mastery")
async def predict_mastery(request: Request, body: PredictMasteryRequest):
    """
    Predict mastery probability using personalized brain model
    
    Uses neural network instead of BKT for more nuanced predictions
    that consider context like time of day, recent performance, etc.
    """
    try:
        brain_cloner = get_brain_cloner(request)
        
        probability = brain_cloner.predict_mastery(
            body.learner_id,
            body.skill_id,
            body.context,
        )
        
        return {
            "learner_id": body.learner_id,
            "skill_id": body.skill_id,
            "mastery_probability": probability,
            "model_type": "neural_network",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.exception(f"Predict mastery failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/brain/status/{learner_id}")
async def get_brain_status(request: Request, learner_id: str):
    """Get status of learner's personalized brain model"""
    try:
        brain_cloner = get_brain_cloner(request)
        
        has_model = learner_id in brain_cloner.learner_models
        model_path = f"models/learners/{learner_id}.pt"
        model_exists = os.path.exists(model_path)
        
        return {
            "learner_id": learner_id,
            "model_in_memory": has_model,
            "model_on_disk": model_exists,
            "model_path": model_path if model_exists else None,
            "status": "ready" if has_model else ("loadable" if model_exists else "not_created"),
        }
    
    except Exception as e:
        logger.exception(f"Get brain status failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Model Management
# ============================================================================

@router.post("/models/aggregate-updates")
async def aggregate_federated_updates(request: Request, body: AggregateUpdatesRequest):
    """
    Federated Learning: Aggregate learner updates back to base model
    
    Should be run periodically (e.g., nightly) to improve base model
    with insights from individual learner models while preserving privacy.
    """
    try:
        brain_cloner = get_brain_cloner(request)
        
        brain_cloner.aggregate_updates(
            body.learner_ids,
            aggregation_weight=body.aggregation_weight,
        )
        
        logger.info(
            f"Aggregated federated updates from {len(body.learner_ids)} learners "
            f"with weight {body.aggregation_weight}"
        )
        
        return {
            "status": "success",
            "learners_aggregated": len(body.learner_ids),
            "aggregation_weight": body.aggregation_weight,
            "message": "Base model updated with federated learning"
        }
    
    except Exception as e:
        logger.exception(f"Aggregate updates failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/save-checkpoint")
async def save_checkpoint(request: Request, checkpoint_name: str = "checkpoint"):
    """Save current model state as checkpoint"""
    try:
        brain_cloner = get_brain_cloner(request)
        
        checkpoint_path = f"models/checkpoints/{checkpoint_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pt"
        brain_cloner.save_base_model(checkpoint_path)
        
        return {
            "status": "success",
            "checkpoint_path": checkpoint_path,
            "message": "Checkpoint saved"
        }
    
    except Exception as e:
        logger.exception(f"Save checkpoint failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Health & Stats
# ============================================================================

@router.get("/health")
async def health_check(request: Request):
    """Health check endpoint"""
    bkt_loaded = hasattr(request.app.state, 'bkt_model') and request.app.state.bkt_model is not None
    brain_loaded = hasattr(request.app.state, 'brain_cloner') and request.app.state.brain_cloner is not None
    
    learner_count = 0
    if brain_loaded:
        learner_count = len(request.app.state.brain_cloner.learner_models)
    
    return {
        "status": "healthy" if (bkt_loaded and brain_loaded) else "degraded",
        "models_loaded": {
            "bkt": bkt_loaded,
            "brain_cloner": brain_loaded,
        },
        "learner_models_cached": learner_count,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/stats")
async def get_stats(request: Request):
    """Get training service statistics"""
    stats = {
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    # BKT stats
    if hasattr(request.app.state, 'bkt_model') and request.app.state.bkt_model:
        bkt = request.app.state.bkt_model
        stats["bkt"] = {
            "skills_tracked": len(bkt.parameters),
            "learners_tracked": len(bkt.learner_mastery),
        }
    
    # Brain cloner stats
    if hasattr(request.app.state, 'brain_cloner') and request.app.state.brain_cloner:
        cloner = request.app.state.brain_cloner
        stats["brain_cloner"] = {
            "learner_models_cached": len(cloner.learner_models),
            "num_skills": cloner.num_skills,
        }
    
    return stats
