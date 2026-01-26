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
# Ensemble Knowledge Tracing Request/Response Models
# ============================================================================

class EnsembleUpdateRequest(BaseModel):
    """Request to update ensemble with interaction"""
    learner_id: str = Field(..., description="Learner identifier")
    skill_id: str = Field(..., description="Skill practiced")
    correct: bool = Field(..., description="Whether response was correct")
    timestamp: Optional[str] = Field(None, description="ISO timestamp")


class EnsemblePredictRequest(BaseModel):
    """Request ensemble prediction"""
    learner_id: str = Field(..., description="Learner identifier")
    skill_id: str = Field(..., description="Skill to predict")
    history: Optional[List[Dict[str, Any]]] = Field(None, description="Optional interaction history")


class EnsembleBatchUpdateRequest(BaseModel):
    """Batch update for ensemble"""
    learner_id: str
    interactions: List[Dict[str, Any]]


class DKTTrainRequest(BaseModel):
    """Request to train DKT model"""
    training_data: List[Dict[str, Any]] = Field(..., description="List of learner sequences")
    num_epochs: int = Field(20, ge=1, le=100, description="Training epochs")
    batch_size: int = Field(32, ge=1, le=256, description="Batch size")
    learning_rate: float = Field(0.001, ge=0.0001, le=0.1, description="Learning rate")


class PFATrainRequest(BaseModel):
    """Request to train PFA parameters"""
    training_data: List[Dict[str, Any]] = Field(..., description="Training data tuples")


class OptimalSkillRequest(BaseModel):
    """Request for optimal skill recommendation"""
    learner_id: str
    candidate_skills: List[str]
    target_mastery: float = Field(0.7, ge=0.1, le=0.99)


# ============================================================================
# LoRA Fine-Tuning Request/Response Models
# ============================================================================

class LoRALearnerProfileRequest(BaseModel):
    """Learner profile for LoRA personalization"""
    learner_id: str = Field(..., description="Unique learner identifier")
    grade_level: int = Field(..., ge=1, le=12, description="Grade level 1-12")
    reading_level: str = Field("at", description="below, at, or above grade level")
    learning_style: str = Field("visual", description="visual, verbal, or kinesthetic")
    iep_goals: List[str] = Field(default_factory=list, description="IEP learning goals")
    strengths: List[str] = Field(default_factory=list, description="Learning strengths")
    challenges: List[str] = Field(default_factory=list, description="Learning challenges")
    preferred_language: str = Field("en", description="ISO language code")
    accessibility_needs: List[str] = Field(default_factory=list, description="Accessibility needs")


class LoRATrainingExample(BaseModel):
    """Single training example for LoRA fine-tuning"""
    prompt: str = Field(..., description="Input prompt/question")
    response: str = Field(..., description="Ideal response")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Optional metadata")


class LoRAFineTuneRequest(BaseModel):
    """Request to fine-tune LoRA adapter for a learner"""
    learner_id: str = Field(..., description="Learner identifier")
    profile: LoRALearnerProfileRequest
    examples: List[LoRATrainingExample] = Field(..., min_length=1, description="Training examples")
    num_epochs: int = Field(3, ge=1, le=10, description="Training epochs")
    batch_size: int = Field(4, ge=1, le=16, description="Batch size")
    learning_rate: float = Field(3e-4, ge=1e-5, le=1e-2, description="Learning rate")


class LoRAGenerateRequest(BaseModel):
    """Request to generate personalized response"""
    learner_id: str = Field(..., description="Learner identifier")
    prompt: str = Field(..., description="Input prompt")
    max_length: int = Field(200, ge=50, le=1000, description="Max tokens to generate")
    temperature: float = Field(0.7, ge=0.0, le=1.5, description="Sampling temperature")
    top_p: float = Field(0.9, ge=0.0, le=1.0, description="Nucleus sampling threshold")
    include_context: bool = Field(True, description="Include personalized system prompt")


class LoRAGenerateWithContextRequest(BaseModel):
    """Request to generate with additional context"""
    learner_id: str = Field(..., description="Learner identifier")
    prompt: str = Field(..., description="User question")
    context: str = Field(..., description="Additional context (lesson content, etc.)")
    max_length: int = Field(300, ge=50, le=1000, description="Max tokens to generate")


class LoRACompareRequest(BaseModel):
    """Request to compare responses from multiple adapters"""
    learner_ids: List[str] = Field(..., description="Learner IDs to compare")
    prompt: str = Field(..., description="Input prompt")


# ============================================================================
# Curriculum Embeddings Request/Response Models
# ============================================================================

class SkillRequest(BaseModel):
    """Request to add a skill"""
    skill_id: str = Field(..., description="Unique skill identifier")
    name: str = Field(..., description="Skill name")
    description: str = Field(..., description="Skill description")
    domain: str = Field(..., description="Domain (math, reading, science, etc.)")
    grade_band: str = Field(..., description="Grade band (K-2, 3-5, 6-8, 9-12)")
    standard_codes: List[str] = Field(default_factory=list, description="Standard codes")
    prerequisites: List[str] = Field(default_factory=list, description="Prerequisite skill IDs")
    keywords: List[str] = Field(default_factory=list, description="Keywords for matching")


class ContentRequest(BaseModel):
    """Request to add content"""
    content_id: str = Field(..., description="Unique content identifier")
    title: str = Field(..., description="Content title")
    description: str = Field(..., description="Content description")
    content_type: str = Field(..., description="Type (video, activity, assessment, etc.)")
    difficulty: float = Field(..., ge=0.0, le=1.0, description="Difficulty 0-1")
    skill_ids: List[str] = Field(default_factory=list, description="Skills covered")
    duration_minutes: Optional[int] = Field(None, description="Duration in minutes")
    grade_level: Optional[int] = Field(None, ge=1, le=12, description="Grade level")


class StandardRequest(BaseModel):
    """Request to add an educational standard"""
    standard_code: str = Field(..., description="Standard code (e.g., CCSS.MATH.5.NF.A.1)")
    description: str = Field(..., description="Standard description")
    domain: str = Field(..., description="Domain")
    grade_level: str = Field(..., description="Grade level")
    subject: str = Field(..., description="Subject")
    parent_standard: Optional[str] = Field(None, description="Parent standard code")


class SemanticSearchRequest(BaseModel):
    """Request for semantic search"""
    query: str = Field(..., description="Natural language query")
    search_type: str = Field("skills", description="skills, content, standards, or all")
    n: int = Field(10, ge=1, le=100, description="Number of results")
    filters: Optional[Dict[str, Any]] = Field(None, description="Optional filters")


class SimilarSkillsRequest(BaseModel):
    """Request for similar skills"""
    skill_id: str = Field(..., description="Source skill ID")
    n: int = Field(5, ge=1, le=50, description="Number of results")
    domain_filter: Optional[str] = Field(None, description="Filter by domain")
    grade_band_filter: Optional[str] = Field(None, description="Filter by grade band")


class ContentRecommendationRequest(BaseModel):
    """Request for content recommendations"""
    skill_id: str = Field(..., description="Target skill ID")
    n: int = Field(10, ge=1, le=50, description="Number of results")
    difficulty_min: Optional[float] = Field(None, ge=0, le=1, description="Min difficulty")
    difficulty_max: Optional[float] = Field(None, ge=0, le=1, description="Max difficulty")
    content_type: Optional[str] = Field(None, description="Filter by content type")


class LearningPathRequest(BaseModel):
    """Request for learning path"""
    target_skill_id: str = Field(..., description="Goal skill ID")
    mastered_skills: List[str] = Field(default_factory=list, description="Already mastered skills")


class LearnerContentRecommendationRequest(BaseModel):
    """Request for learner-specific content recommendations"""
    skill_masteries: Dict[str, float] = Field(..., description="Skill ID -> mastery (0-1)")
    n: int = Field(10, ge=1, le=50, description="Number of results")


class SkillClusterRequest(BaseModel):
    """Request for skill clustering"""
    n_clusters: int = Field(10, ge=2, le=50, description="Number of clusters")
    method: str = Field("kmeans", description="kmeans or agglomerative")


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


def get_kt_ensemble(request: Request):
    """Get knowledge tracing ensemble from app state"""
    ensemble = getattr(request.app.state, 'kt_ensemble', None)
    if ensemble is None:
        raise HTTPException(status_code=503, detail="Knowledge tracing ensemble not initialized")
    return ensemble


def get_dkt_model(request: Request):
    """Get DKT model from app state"""
    dkt = getattr(request.app.state, 'dkt_model', None)
    if dkt is None:
        raise HTTPException(status_code=503, detail="DKT model not initialized")
    return dkt


def get_pfa_model(request: Request):
    """Get PFA model from app state"""
    pfa = getattr(request.app.state, 'pfa_model', None)
    if pfa is None:
        raise HTTPException(status_code=503, detail="PFA model not initialized")
    return pfa


def get_lora_fine_tuner(request: Request):
    """Get LoRA fine-tuner from app state"""
    tuner = getattr(request.app.state, 'lora_fine_tuner', None)
    if tuner is None:
        raise HTTPException(status_code=503, detail="LoRA fine-tuner not initialized")
    return tuner


def get_curriculum_embeddings(request: Request):
    """Get curriculum embeddings from app state"""
    embeddings = getattr(request.app.state, 'curriculum_embeddings', None)
    if embeddings is None:
        raise HTTPException(status_code=503, detail="Curriculum embeddings not initialized")
    return embeddings


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
    
    # Ensemble stats
    if hasattr(request.app.state, 'kt_ensemble') and request.app.state.kt_ensemble:
        stats["kt_ensemble"] = request.app.state.kt_ensemble.get_stats()
    
    # DKT stats
    if hasattr(request.app.state, 'dkt_model') and request.app.state.dkt_model:
        stats["dkt"] = request.app.state.dkt_model.get_stats()
    
    # PFA stats
    if hasattr(request.app.state, 'pfa_model') and request.app.state.pfa_model:
        stats["pfa"] = request.app.state.pfa_model.get_stats()
    
    return stats


# ============================================================================
# Knowledge Tracing Ensemble Endpoints
# ============================================================================

@router.post("/ensemble/predict")
async def ensemble_predict(request: Request, body: EnsemblePredictRequest):
    """
    Get ensemble prediction combining BKT, DKT, and PFA
    
    Returns weighted prediction based on data availability and model confidence.
    """
    try:
        ensemble = get_kt_ensemble(request)
        
        prediction = ensemble.predict(
            body.learner_id,
            body.skill_id,
            body.history,
        )
        
        return prediction.to_dict()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Ensemble prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ensemble/update")
async def ensemble_update(request: Request, body: EnsembleUpdateRequest):
    """
    Update all ensemble models with new interaction
    
    Updates BKT, DKT, and PFA simultaneously.
    """
    try:
        ensemble = get_kt_ensemble(request)
        
        timestamp = None
        if body.timestamp:
            timestamp = datetime.fromisoformat(body.timestamp)
        
        prediction = ensemble.update(
            body.learner_id,
            body.skill_id,
            body.correct,
            timestamp,
        )
        
        return prediction.to_dict()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Ensemble update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ensemble/update/batch")
async def ensemble_batch_update(request: Request, body: EnsembleBatchUpdateRequest):
    """Batch update ensemble with multiple interactions"""
    try:
        ensemble = get_kt_ensemble(request)
        
        results = []
        for interaction in body.interactions:
            timestamp = None
            if 'timestamp' in interaction:
                timestamp = datetime.fromisoformat(interaction['timestamp'])
            
            prediction = ensemble.update(
                body.learner_id,
                interaction['skill_id'],
                interaction['correct'],
                timestamp,
            )
            results.append(prediction.to_dict())
        
        return {
            "learner_id": body.learner_id,
            "updates": results,
            "count": len(results),
        }
    
    except Exception as e:
        logger.exception(f"Ensemble batch update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ensemble/mastery/{learner_id}")
async def ensemble_all_mastery(request: Request, learner_id: str):
    """Get ensemble mastery predictions for all skills a learner has practiced"""
    try:
        ensemble = get_kt_ensemble(request)
        predictions = ensemble.get_all_mastery(learner_id)
        
        return {
            "learner_id": learner_id,
            "skills": {k: v.to_dict() for k, v in predictions.items()},
            "count": len(predictions),
        }
    
    except Exception as e:
        logger.exception(f"Get all mastery failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ensemble/optimal-skill")
async def ensemble_optimal_skill(request: Request, body: OptimalSkillRequest):
    """Find optimal skill to practice next (Zone of Proximal Development)"""
    try:
        ensemble = get_kt_ensemble(request)
        
        optimal = ensemble.get_optimal_skill(
            body.learner_id,
            body.candidate_skills,
            body.target_mastery,
        )
        
        prediction = None
        if optimal:
            prediction = ensemble.predict(body.learner_id, optimal).to_dict()
        
        return {
            "learner_id": body.learner_id,
            "optimal_skill": optimal,
            "prediction": prediction,
            "target_mastery": body.target_mastery,
        }
    
    except Exception as e:
        logger.exception(f"Get optimal skill failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ensemble/stats")
async def ensemble_stats(request: Request):
    """Get ensemble statistics including model performance"""
    try:
        ensemble = get_kt_ensemble(request)
        return ensemble.get_stats()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Get ensemble stats failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# DKT-Specific Endpoints
# ============================================================================

@router.post("/dkt/train")
async def train_dkt(request: Request, body: DKTTrainRequest, background_tasks: BackgroundTasks):
    """
    Train DKT model on historical interaction data
    
    This should be run periodically with accumulated learner data.
    Training runs in background to avoid blocking.
    """
    try:
        ensemble = get_kt_ensemble(request)
        
        if 'dkt' not in ensemble.models:
            raise HTTPException(status_code=503, detail="DKT model not available")
        
        # Run training (in production, this would be async)
        history = ensemble.train_dkt(
            body.training_data,
            num_epochs=body.num_epochs,
            batch_size=body.batch_size,
            learning_rate=body.learning_rate,
        )
        
        return {
            "status": "completed",
            "training_history": history,
            "message": "DKT model trained successfully",
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"DKT training failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dkt/predict")
async def dkt_predict(request: Request, learner_id: str, skill_id: int):
    """Get DKT prediction for a specific skill"""
    try:
        ensemble = get_kt_ensemble(request)
        
        if 'dkt' not in ensemble.models:
            raise HTTPException(status_code=503, detail="DKT model not available")
        
        dkt = ensemble.models['dkt']
        prob = dkt.predict(learner_id, skill_id)
        
        return {
            "learner_id": learner_id,
            "skill_id": skill_id,
            "mastery_probability": prob,
            "model": "dkt",
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"DKT prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dkt/predict-all/{learner_id}")
async def dkt_predict_all(request: Request, learner_id: str):
    """Get DKT predictions for all skills"""
    try:
        ensemble = get_kt_ensemble(request)
        
        if 'dkt' not in ensemble.models:
            raise HTTPException(status_code=503, detail="DKT model not available")
        
        dkt = ensemble.models['dkt']
        predictions = dkt.predict_all_skills(learner_id)
        
        return {
            "learner_id": learner_id,
            "predictions": predictions,
            "model": "dkt",
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"DKT predict all failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PFA-Specific Endpoints
# ============================================================================

@router.post("/pfa/predict")
async def pfa_predict(request: Request, learner_id: str, skill_id: str):
    """Get PFA prediction for a specific skill"""
    try:
        ensemble = get_kt_ensemble(request)
        
        if 'pfa' not in ensemble.models:
            raise HTTPException(status_code=503, detail="PFA model not available")
        
        pfa = ensemble.models['pfa']
        prob = pfa.predict(learner_id, skill_id)
        
        return {
            "learner_id": learner_id,
            "skill_id": skill_id,
            "mastery_probability": prob,
            "model": "pfa",
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"PFA prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pfa/practices-needed")
async def pfa_practices_needed(
    request: Request,
    learner_id: str,
    skill_id: str,
    target_mastery: float = 0.8,
):
    """Estimate practices needed to reach target mastery"""
    try:
        ensemble = get_kt_ensemble(request)
        
        if 'pfa' not in ensemble.models:
            raise HTTPException(status_code=503, detail="PFA model not available")
        
        pfa = ensemble.models['pfa']
        practices = pfa.estimate_practices_needed(learner_id, skill_id, target_mastery)
        current = pfa.predict(learner_id, skill_id)
        
        return {
            "learner_id": learner_id,
            "skill_id": skill_id,
            "current_mastery": current,
            "target_mastery": target_mastery,
            "practices_needed": practices,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"PFA practices needed failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pfa/learning-curve/{learner_id}/{skill_id}")
async def pfa_learning_curve(
    request: Request,
    learner_id: str,
    skill_id: str,
    max_practices: int = 20,
):
    """Get projected learning curve for a skill"""
    try:
        ensemble = get_kt_ensemble(request)
        
        if 'pfa' not in ensemble.models:
            raise HTTPException(status_code=503, detail="PFA model not available")
        
        pfa = ensemble.models['pfa']
        curve = pfa.get_learning_curve(learner_id, skill_id, max_practices)
        
        return {
            "learner_id": learner_id,
            "skill_id": skill_id,
            "learning_curve": [{"practice": p, "mastery": m} for p, m in curve],
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"PFA learning curve failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pfa/weakest-skills/{learner_id}")
async def pfa_weakest_skills(request: Request, learner_id: str, n: int = 5):
    """Get learner's weakest skills"""
    try:
        ensemble = get_kt_ensemble(request)
        
        if 'pfa' not in ensemble.models:
            raise HTTPException(status_code=503, detail="PFA model not available")
        
        pfa = ensemble.models['pfa']
        skills = pfa.get_weakest_skills(learner_id, n)
        
        return {
            "learner_id": learner_id,
            "weakest_skills": [
                {"skill_id": s, "mastery": m} for s, m in skills
            ],
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"PFA weakest skills failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# LoRA Fine-Tuning Routes
# ============================================================================

@router.post("/lora/fine-tune")
async def lora_fine_tune(
    request: Request,
    req: LoRAFineTuneRequest,
    background_tasks: BackgroundTasks
):
    """
    Fine-tune a LoRA adapter for a learner
    
    This creates a personalized LLM adapter that generates responses
    tailored to the learner's profile, grade level, and learning style.
    """
    try:
        tuner = get_lora_fine_tuner(request)
        
        # Convert request to pipeline types
        from app.pipelines.lora_fine_tuning import LearnerProfile, FineTuningExample
        
        profile = LearnerProfile(
            learner_id=req.profile.learner_id,
            grade_level=req.profile.grade_level,
            reading_level=req.profile.reading_level,
            learning_style=req.profile.learning_style,
            iep_goals=req.profile.iep_goals,
            strengths=req.profile.strengths,
            challenges=req.profile.challenges,
            preferred_language=req.profile.preferred_language,
            accessibility_needs=req.profile.accessibility_needs
        )
        
        examples = [
            FineTuningExample(
                prompt=ex.prompt,
                response=ex.response,
                metadata=ex.metadata
            )
            for ex in req.examples
        ]
        
        # Run fine-tuning
        metrics = tuner.fine_tune(
            learner_id=req.learner_id,
            profile=profile,
            examples=examples,
            num_epochs=req.num_epochs,
            batch_size=req.batch_size,
            learning_rate=req.learning_rate
        )
        
        return {
            "status": "success",
            "learner_id": req.learner_id,
            "metrics": {
                "train_loss": metrics.train_loss,
                "epochs": metrics.epochs,
                "examples_count": metrics.examples_count,
                "trainable_params": metrics.trainable_params,
                "total_params": metrics.total_params,
                "trainable_percentage": metrics.trainable_percentage,
                "training_time_seconds": metrics.training_time_seconds
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"LoRA fine-tuning failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lora/generate")
async def lora_generate(request: Request, req: LoRAGenerateRequest):
    """
    Generate a personalized response for a learner
    
    Uses the learner's LoRA adapter if available, otherwise falls back to base model.
    """
    try:
        tuner = get_lora_fine_tuner(request)
        
        response = tuner.generate(
            learner_id=req.learner_id,
            prompt=req.prompt,
            max_length=req.max_length,
            temperature=req.temperature,
            top_p=req.top_p,
            include_system_prompt=req.include_context
        )
        
        return {
            "learner_id": req.learner_id,
            "prompt": req.prompt,
            "response": response,
            "has_personalized_adapter": req.learner_id in tuner.learner_adapters
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"LoRA generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lora/generate-with-context")
async def lora_generate_with_context(request: Request, req: LoRAGenerateWithContextRequest):
    """
    Generate a response with additional context (e.g., lesson content)
    
    Useful for homework help where the response should reference specific lesson material.
    """
    try:
        tuner = get_lora_fine_tuner(request)
        
        response = tuner.generate_with_context(
            learner_id=req.learner_id,
            prompt=req.prompt,
            context=req.context,
            max_length=req.max_length
        )
        
        return {
            "learner_id": req.learner_id,
            "prompt": req.prompt,
            "response": response
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"LoRA context generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lora/compare")
async def lora_compare_responses(request: Request, req: LoRACompareRequest):
    """
    Compare responses from different learner adapters
    
    Useful for debugging and evaluating personalization quality.
    """
    try:
        tuner = get_lora_fine_tuner(request)
        
        responses = tuner.compare_responses(
            learner_ids=req.learner_ids,
            prompt=req.prompt
        )
        
        return {
            "prompt": req.prompt,
            "responses": responses
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"LoRA comparison failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lora/adapter/{learner_id}/load")
async def lora_load_adapter(
    request: Request,
    learner_id: str,
    adapter_path: str
):
    """Load a previously saved LoRA adapter"""
    try:
        tuner = get_lora_fine_tuner(request)
        
        success = tuner.load_learner_adapter(learner_id, adapter_path)
        
        if not success:
            raise HTTPException(status_code=404, detail="Adapter not found or failed to load")
        
        return {
            "status": "success",
            "learner_id": learner_id,
            "message": f"Adapter loaded from {adapter_path}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"LoRA adapter load failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/lora/adapter/{learner_id}")
async def lora_unload_adapter(request: Request, learner_id: str):
    """Unload a learner adapter to free memory"""
    try:
        tuner = get_lora_fine_tuner(request)
        
        success = tuner.unload_learner_adapter(learner_id)
        
        return {
            "status": "success" if success else "not_found",
            "learner_id": learner_id,
            "unloaded": success
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"LoRA adapter unload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lora/adapter/{learner_id}")
async def lora_get_adapter_info(request: Request, learner_id: str):
    """Get information about a learner's LoRA adapter"""
    try:
        tuner = get_lora_fine_tuner(request)
        
        info = tuner.get_adapter_info(learner_id)
        
        if info is None:
            raise HTTPException(status_code=404, detail="Adapter not found")
        
        return info
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"LoRA adapter info failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lora/adapters")
async def lora_list_adapters(request: Request):
    """List all currently loaded LoRA adapters"""
    try:
        tuner = get_lora_fine_tuner(request)
        
        adapters = tuner.list_loaded_adapters()
        
        return {
            "count": len(adapters),
            "adapters": adapters,
            "base_model": tuner.base_model_name
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"LoRA list adapters failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lora/adapters/save-all")
async def lora_save_all_adapters(request: Request, output_dir: str = "models/lora_adapters"):
    """Save all loaded adapters to disk"""
    try:
        tuner = get_lora_fine_tuner(request)
        
        tuner.save_all_adapters(output_dir)
        
        return {
            "status": "success",
            "output_dir": output_dir,
            "adapters_saved": tuner.list_loaded_adapters()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"LoRA save all failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Curriculum Embeddings Routes
# ============================================================================

@router.post("/curriculum/skills")
async def add_skill(request: Request, req: SkillRequest):
    """
    Add a skill to the curriculum embeddings
    
    Creates semantic embedding for the skill for similarity search and matching.
    """
    try:
        embeddings = get_curriculum_embeddings(request)
        
        from app.models.curriculum_embeddings import Skill
        
        skill = Skill(
            skill_id=req.skill_id,
            name=req.name,
            description=req.description,
            domain=req.domain,
            grade_band=req.grade_band,
            standard_codes=req.standard_codes,
            prerequisites=req.prerequisites,
            keywords=req.keywords
        )
        
        embedding = embeddings.add_skill(skill)
        
        return {
            "status": "success",
            "skill_id": req.skill_id,
            "embedding_dim": len(embedding)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Add skill failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curriculum/skills/batch")
async def add_skills_batch(request: Request, skills: List[SkillRequest]):
    """Add multiple skills in a batch (more efficient)"""
    try:
        embeddings = get_curriculum_embeddings(request)
        
        from app.models.curriculum_embeddings import Skill
        
        skill_objects = [
            Skill(
                skill_id=req.skill_id,
                name=req.name,
                description=req.description,
                domain=req.domain,
                grade_band=req.grade_band,
                standard_codes=req.standard_codes,
                prerequisites=req.prerequisites,
                keywords=req.keywords
            )
            for req in skills
        ]
        
        result = embeddings.add_skills_batch(skill_objects)
        
        return {
            "status": "success",
            "skills_added": len(result),
            "skill_ids": list(result.keys())
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Add skills batch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/curriculum/skills/{skill_id}")
async def get_skill(request: Request, skill_id: str):
    """Get skill details"""
    try:
        embeddings = get_curriculum_embeddings(request)
        
        if skill_id not in embeddings.skills:
            raise HTTPException(status_code=404, detail="Skill not found")
        
        skill = embeddings.skills[skill_id]
        
        return {
            "skill": skill.to_dict(),
            "prerequisites": embeddings.get_prerequisite_skills(skill_id),
            "dependents": embeddings.get_dependent_skills(skill_id)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Get skill failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curriculum/content")
async def add_content(request: Request, req: ContentRequest):
    """
    Add content to the curriculum embeddings
    
    Creates semantic embedding for content matching and recommendations.
    """
    try:
        embeddings = get_curriculum_embeddings(request)
        
        from app.models.curriculum_embeddings import Content
        
        content = Content(
            content_id=req.content_id,
            title=req.title,
            description=req.description,
            content_type=req.content_type,
            difficulty=req.difficulty,
            skill_ids=req.skill_ids,
            duration_minutes=req.duration_minutes,
            grade_level=req.grade_level
        )
        
        embedding = embeddings.add_content(content)
        
        return {
            "status": "success",
            "content_id": req.content_id,
            "embedding_dim": len(embedding)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Add content failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curriculum/content/batch")
async def add_content_batch(request: Request, contents: List[ContentRequest]):
    """Add multiple content items in a batch"""
    try:
        embeddings = get_curriculum_embeddings(request)
        
        from app.models.curriculum_embeddings import Content
        
        content_objects = [
            Content(
                content_id=req.content_id,
                title=req.title,
                description=req.description,
                content_type=req.content_type,
                difficulty=req.difficulty,
                skill_ids=req.skill_ids,
                duration_minutes=req.duration_minutes,
                grade_level=req.grade_level
            )
            for req in contents
        ]
        
        result = embeddings.add_content_batch(content_objects)
        
        return {
            "status": "success",
            "content_added": len(result),
            "content_ids": list(result.keys())
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Add content batch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/curriculum/content/{content_id}")
async def get_content(request: Request, content_id: str):
    """Get content details"""
    try:
        embeddings = get_curriculum_embeddings(request)
        
        if content_id not in embeddings.contents:
            raise HTTPException(status_code=404, detail="Content not found")
        
        content = embeddings.contents[content_id]
        
        return content.to_dict()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Get content failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curriculum/standards")
async def add_standard(request: Request, req: StandardRequest):
    """Add an educational standard"""
    try:
        embeddings = get_curriculum_embeddings(request)
        
        from app.models.curriculum_embeddings import Standard
        
        standard = Standard(
            standard_code=req.standard_code,
            description=req.description,
            domain=req.domain,
            grade_level=req.grade_level,
            subject=req.subject,
            parent_standard=req.parent_standard
        )
        
        embedding = embeddings.add_standard(standard)
        
        return {
            "status": "success",
            "standard_code": req.standard_code,
            "embedding_dim": len(embedding)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Add standard failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curriculum/search")
async def semantic_search(request: Request, req: SemanticSearchRequest):
    """
    Semantic search across curriculum
    
    Find skills, content, or standards matching a natural language query.
    """
    try:
        embeddings = get_curriculum_embeddings(request)
        
        results = embeddings.semantic_search(
            query=req.query,
            search_type=req.search_type,
            n=req.n,
            filters=req.filters
        )
        
        return {
            "query": req.query,
            "search_type": req.search_type,
            "results": [
                {
                    "item_id": r.item_id,
                    "score": r.score,
                    "item_type": r.item_type,
                    "item": r.item.to_dict() if hasattr(r.item, 'to_dict') else str(r.item)
                }
                for r in results
            ]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Semantic search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curriculum/skills/similar")
async def find_similar_skills(request: Request, req: SimilarSkillsRequest):
    """Find skills similar to a given skill"""
    try:
        embeddings = get_curriculum_embeddings(request)
        
        similar = embeddings.find_similar_skills(
            skill_id=req.skill_id,
            n=req.n,
            domain_filter=req.domain_filter,
            grade_band_filter=req.grade_band_filter
        )
        
        return {
            "source_skill_id": req.skill_id,
            "similar_skills": [
                {
                    "skill_id": skill_id,
                    "similarity": score,
                    "skill": embeddings.skills[skill_id].to_dict() if skill_id in embeddings.skills else None
                }
                for skill_id, score in similar
            ]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Find similar skills failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curriculum/content/recommend")
async def recommend_content_for_skill(request: Request, req: ContentRecommendationRequest):
    """Recommend content items for a skill"""
    try:
        embeddings = get_curriculum_embeddings(request)
        
        difficulty_range = None
        if req.difficulty_min is not None or req.difficulty_max is not None:
            difficulty_range = (
                req.difficulty_min or 0.0,
                req.difficulty_max or 1.0
            )
        
        recommendations = embeddings.recommend_content_for_skill(
            skill_id=req.skill_id,
            n=req.n,
            difficulty_range=difficulty_range,
            content_type_filter=req.content_type
        )
        
        return {
            "skill_id": req.skill_id,
            "recommendations": [
                {
                    "content_id": content_id,
                    "relevance": score,
                    "content": embeddings.contents[content_id].to_dict() if content_id in embeddings.contents else None
                }
                for content_id, score in recommendations
            ]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Content recommendation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curriculum/content/recommend-for-learner")
async def recommend_content_for_learner(request: Request, req: LearnerContentRecommendationRequest):
    """Recommend content based on learner's skill mastery profile"""
    try:
        embeddings = get_curriculum_embeddings(request)
        
        recommendations = embeddings.recommend_content_for_learner(
            skill_masteries=req.skill_masteries,
            n=req.n
        )
        
        return {
            "recommendations": [
                {
                    "content_id": content_id,
                    "score": score,
                    "reason": reason,
                    "content": embeddings.contents[content_id].to_dict() if content_id in embeddings.contents else None
                }
                for content_id, score, reason in recommendations
            ]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Learner content recommendation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curriculum/learning-path")
async def get_learning_path(request: Request, req: LearningPathRequest):
    """
    Generate learning path to a target skill
    
    Uses prerequisite graph to determine optimal order.
    """
    try:
        embeddings = get_curriculum_embeddings(request)
        
        path = embeddings.get_learning_path(
            target_skill_id=req.target_skill_id,
            mastered_skills=req.mastered_skills
        )
        
        return {
            "target_skill_id": req.target_skill_id,
            "mastered_skills": req.mastered_skills,
            "learning_path": path,
            "skills_to_learn": len(path),
            "path_details": [
                embeddings.skills[sid].to_dict() if sid in embeddings.skills else {"skill_id": sid}
                for sid in path
            ]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Learning path failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curriculum/skills/clusters")
async def build_skill_clusters(request: Request, req: SkillClusterRequest):
    """
    Cluster skills by semantic similarity
    
    Useful for curriculum analysis and skill family identification.
    """
    try:
        embeddings = get_curriculum_embeddings(request)
        
        clusters = embeddings.build_skill_clusters(
            n_clusters=req.n_clusters,
            method=req.method
        )
        
        summaries = embeddings.get_cluster_summary(clusters)
        
        return {
            "n_clusters": len(clusters),
            "method": req.method,
            "clusters": summaries
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Skill clustering failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/curriculum/content/{content_id}/match-standards")
async def match_content_to_standards(request: Request, content_id: str, n: int = 5):
    """Find standards that match a piece of content"""
    try:
        embeddings = get_curriculum_embeddings(request)
        
        if content_id not in embeddings.contents:
            raise HTTPException(status_code=404, detail="Content not found")
        
        matches = embeddings.match_content_to_standards(content_id, n=n)
        
        return {
            "content_id": content_id,
            "matched_standards": [
                {
                    "standard_code": code,
                    "similarity": score,
                    "standard": embeddings.standards[code].to_dict() if code in embeddings.standards else None
                }
                for code, score in matches
            ]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Match standards failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/curriculum/stats")
async def get_curriculum_stats(request: Request):
    """Get statistics about the curriculum embeddings"""
    try:
        embeddings = get_curriculum_embeddings(request)
        
        return embeddings.get_stats()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Curriculum stats failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curriculum/save")
async def save_curriculum(request: Request, filepath: str = "models/curriculum_embeddings.pkl"):
    """Save curriculum embeddings to disk"""
    try:
        embeddings = get_curriculum_embeddings(request)
        
        embeddings.save(filepath)
        
        return {
            "status": "success",
            "filepath": filepath,
            "stats": embeddings.get_stats()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Save curriculum failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curriculum/load")
async def load_curriculum(request: Request, filepath: str = "models/curriculum_embeddings.pkl"):
    """Load curriculum embeddings from disk"""
    try:
        embeddings = get_curriculum_embeddings(request)
        
        embeddings.load(filepath)
        
        return {
            "status": "success",
            "filepath": filepath,
            "stats": embeddings.get_stats()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Load curriculum failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
