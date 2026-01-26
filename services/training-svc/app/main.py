"""
Training Service - Main Application
Part of AIVO Platform Migration - Base Brain Model Training

Provides:
1. Base brain model training from aggregate learner data
2. Personalized brain cloning for individual learners
3. Curriculum-aligned training
4. Incremental brain updates
5. Bayesian Knowledge Tracing (BKT) endpoints
"""

import asyncio
import os
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional, Dict, List

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.core.config import settings
from app.brain_trainer import (
    get_brain_trainer,
    BrainTrainer,
    TrainingDataset,
    LearnerInteraction,
    BrainTrainingConfig,
    LearnerBrainModel,
)

# Import BKT model
try:
    from app.models.bkt_model import BayesianKnowledgeTracing
except ImportError:
    BayesianKnowledgeTracing = None

# Import DKT model
try:
    from app.models.dkt_model import DeepKnowledgeTracing
except ImportError:
    DeepKnowledgeTracing = None

# Import PFA model
try:
    from app.models.pfa_model import PerformanceFactorAnalysis
except ImportError:
    PerformanceFactorAnalysis = None

# Import KT Ensemble
try:
    from app.models.kt_ensemble import KnowledgeTracingEnsemble
except ImportError:
    KnowledgeTracingEnsemble = None

# Import LoRA Fine-Tuner
try:
    from app.pipelines.lora_fine_tuning import LoRAFineTuner
except ImportError:
    LoRAFineTuner = None

# Import API routes
try:
    from app.api.routes import router as training_api_router
except ImportError:
    training_api_router = None

logger = logging.getLogger(__name__)

# Global brain trainer instance
brain_trainer: BrainTrainer = get_brain_trainer()

# In-memory storage for learner brains (replace with Redis/DB in production)
learner_brains: Dict[str, LearnerBrainModel] = {}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifespan manager."""
    print("Starting %s %s" % (settings.PROJECT_NAME, settings.VERSION))
    # Brain trainer already initialized at module level
    print("Brain trainer initialized")
    
    # Ensure model directories exist
    os.makedirs("models/learners", exist_ok=True)
    os.makedirs("models/checkpoints", exist_ok=True)
    
    # Initialize BKT model
    if BayesianKnowledgeTracing:
        try:
            _app.state.bkt_model = BayesianKnowledgeTracing()
            logger.info("BKT model initialized")
        except Exception as e:
            logger.warning(f"BKT model initialization failed: {e}")
            _app.state.bkt_model = None
    
    # Initialize DKT model
    if DeepKnowledgeTracing:
        try:
            num_skills = int(os.getenv("NUM_SKILLS", "1000"))
            device = os.getenv("DEVICE", "cpu")
            _app.state.dkt_model = DeepKnowledgeTracing(
                num_skills=num_skills,
                hidden_size=128,
                num_layers=2,
                device=device
            )
            logger.info(f"DKT model initialized with {num_skills} skills on {device}")
        except Exception as e:
            logger.warning(f"DKT model initialization failed: {e}")
            _app.state.dkt_model = None
    else:
        _app.state.dkt_model = None
    
    # Initialize PFA model
    if PerformanceFactorAnalysis:
        try:
            _app.state.pfa_model = PerformanceFactorAnalysis()
            logger.info("PFA model initialized")
        except Exception as e:
            logger.warning(f"PFA model initialization failed: {e}")
            _app.state.pfa_model = None
    else:
        _app.state.pfa_model = None
    
    # Initialize Knowledge Tracing Ensemble
    if KnowledgeTracingEnsemble:
        try:
            bkt = _app.state.bkt_model
            dkt = _app.state.dkt_model
            pfa = _app.state.pfa_model
            _app.state.kt_ensemble = KnowledgeTracingEnsemble(
                bkt_model=bkt,
                dkt_model=dkt,
                pfa_model=pfa
            )
            logger.info("Knowledge Tracing Ensemble initialized")
        except Exception as e:
            logger.warning(f"KT Ensemble initialization failed: {e}")
            _app.state.kt_ensemble = None
    else:
        _app.state.kt_ensemble = None
    
    # Initialize Brain Cloner for API routes
    try:
        from app.models.learner_model import PersonalizedBrainCloner
        base_model_path = os.getenv("BASE_MODEL_PATH", "models/base_brain.pt")
        num_skills = int(os.getenv("NUM_SKILLS", "1000"))
        device = os.getenv("DEVICE", "cpu")
        _app.state.brain_cloner = PersonalizedBrainCloner(
            base_model_path=base_model_path,
            num_skills=num_skills,
            device=device,
        )
        logger.info(f"Brain cloner initialized with {num_skills} skills on {device}")
    except Exception as e:
        logger.warning(f"Brain cloner initialization failed: {e}")
        _app.state.brain_cloner = None
    
    # Initialize LoRA Fine-Tuner for personalized LLM responses
    if LoRAFineTuner:
        try:
            lora_base_model = os.getenv("LORA_BASE_MODEL", "microsoft/phi-2")
            lora_device = os.getenv("LORA_DEVICE", "cpu")
            lora_r = int(os.getenv("LORA_R", "8"))
            lora_alpha = int(os.getenv("LORA_ALPHA", "16"))
            _app.state.lora_fine_tuner = LoRAFineTuner(
                base_model_name=lora_base_model,
                device=lora_device,
                lora_r=lora_r,
                lora_alpha=lora_alpha,
            )
            logger.info(f"LoRA Fine-Tuner initialized with {lora_base_model} on {lora_device}")
        except Exception as e:
            logger.warning(f"LoRA Fine-Tuner initialization failed: {e}")
            _app.state.lora_fine_tuner = None
    else:
        _app.state.lora_fine_tuner = None
    
    yield
    
    print("Shutting down Training Service")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Base Brain Model Training & Curriculum Integration",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class TrainingJobCreate(BaseModel):
    """Request to start a training job."""

    config_override: Optional[Dict] = None
    dataset_version: Optional[str] = None


class TrainingJobStatus(BaseModel):
    """Training job status response."""

    job_id: str
    status: str
    progress: float
    message: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    model_id: Optional[str] = None


class CloneBrainRequest(BaseModel):
    """Request to clone a brain for a learner."""
    
    learner_id: str
    curriculum_standards: Optional[List[str]] = None
    interactions: Optional[List[Dict]] = None


class CloneBrainResponse(BaseModel):
    """Response from brain cloning."""
    
    model_id: str
    learner_id: str
    version: str
    skills_count: int
    curriculum_aligned: bool


class UpdateBrainRequest(BaseModel):
    """Request to update brain with new interaction."""
    
    learner_id: str
    skill_id: str
    activity_id: str
    correct: bool
    response_time_ms: int = 5000
    hints_used: int = 0
    attempts: int = 1
    difficulty: float = 0.5
    curriculum_aligned: bool = True


class AlignCurriculumRequest(BaseModel):
    """Request to align brain with curriculum."""
    
    learner_id: str
    curriculum_skills: List[str]
    skill_weights: Optional[Dict[str, float]] = None


class BrainModelResponse(BaseModel):
    """Brain model details response."""
    
    model_id: str
    learner_id: str
    version: str
    created_at: str
    updated_at: str
    overall_accuracy: float
    total_interactions: int
    curriculum_standards: List[str]
    skill_params: Dict[str, Dict]


# In-memory job storage (replace with Redis in production)
training_jobs: Dict[str, TrainingJobStatus] = {}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


@app.post("/api/v1/training/jobs", response_model=TrainingJobStatus)
async def create_training_job(
    request: TrainingJobCreate, background_tasks: BackgroundTasks
):
    """Start a new training job."""
    import uuid

    job_id = str(uuid.uuid4())
    job = TrainingJobStatus(
        job_id=job_id,
        status="queued",
        progress=0.0,
        message="Training job queued",
        started_at=datetime.now(tz=timezone.utc).isoformat(),
    )
    training_jobs[job_id] = job

    # Start training in background
    background_tasks.add_task(run_training, job_id, request)

    return job


async def run_training(job_id: str, request: TrainingJobCreate) -> None:
    """
    Run the training job in the background.
    
    This is a simplified training implementation. In production, this would:
    1. Load training data from the configured dataset
    2. Initialize the model with any config overrides
    3. Train the model with progress updates
    4. Save the trained model and update job status
    """
    job = training_jobs.get(job_id)
    if not job:
        return
    
    try:
        # Update status to running
        job.status = "running"
        job.message = "Training started"
        job.progress = 0.0
        
        # Simulate training epochs (replace with actual training logic)
        total_epochs = 10
        for epoch in range(total_epochs):
            # In production: actual model training step here
            await asyncio.sleep(1)  # Simulate training time
            
            # Update progress
            job.progress = (epoch + 1) / total_epochs
            job.message = f"Epoch {epoch + 1}/{total_epochs}"
        
        # Generate model ID
        model_id = f"model_{job_id[:8]}"
        
        # Update job as completed
        job.status = "completed"
        job.progress = 1.0
        job.message = "Training completed successfully"
        job.completed_at = datetime.now(tz=timezone.utc).isoformat()
        job.model_id = model_id
        
    except Exception as e:
        job.status = "failed"
        job.message = f"Training failed: {str(e)}"
        job.completed_at = datetime.now(tz=timezone.utc).isoformat()


@app.get("/api/v1/training/jobs/{job_id}", response_model=TrainingJobStatus)
async def get_training_job(job_id: str):
    """Get training job status."""
    if job_id not in training_jobs:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Job not found")
    return training_jobs[job_id]


@app.get("/api/v1/training/jobs")
async def list_training_jobs():
    """List all training jobs."""
    return list(training_jobs.values())


# ========== Brain Training Endpoints ==========


@app.post("/api/v1/brain/clone", response_model=CloneBrainResponse)
async def clone_brain_for_learner(request: CloneBrainRequest):
    """
    Clone a base brain model for a specific learner.
    
    This creates a personalized brain model based on the base population model,
    optionally personalized with the learner's interaction history and aligned
    with their curriculum.
    """
    from fastapi import HTTPException
    
    try:
        # Convert interactions to LearnerInteraction objects if provided
        interactions = []
        if request.interactions:
            for i in request.interactions:
                interactions.append(LearnerInteraction(
                    learner_id=request.learner_id,
                    skill_id=i.get("skill_id", "unknown"),
                    activity_id=i.get("activity_id", "unknown"),
                    correct=i.get("correct", False),
                    timestamp=i.get("timestamp", datetime.now(tz=timezone.utc).isoformat()),
                    response_time_ms=i.get("response_time_ms", 5000),
                    hints_used=i.get("hints_used", 0),
                    attempts=i.get("attempts", 1),
                    difficulty=i.get("difficulty", 0.5),
                ))
        
        # Clone the brain for this learner
        brain_model = brain_trainer.clone_brain_for_learner(
            learner_id=request.learner_id,
            learner_history=interactions,
        )
        
        # Align with curriculum if specified
        if request.curriculum_standards:
            brain_model = brain_trainer.align_with_curriculum(
                brain=brain_model,
                curriculum_skills=request.curriculum_standards,
            )
        
        return CloneBrainResponse(
            model_id=brain_model.model_id,
            learner_id=brain_model.learner_id,
            version=brain_model.version,
            skills_count=len(brain_model.skill_params),
            curriculum_aligned=len(brain_model.curriculum_standards) > 0,
        )
        
    except Exception as e:
        logger.exception("Failed to clone brain")
        raise HTTPException(status_code=500, detail=f"Brain cloning failed: {str(e)}")


@app.post("/api/v1/brain/update")
async def update_brain_with_interaction(request: UpdateBrainRequest):
    """
    Update a learner's brain model with a new interaction.
    
    This performs incremental/online learning to update the skill parameters
    based on the learner's latest activity.
    """
    from fastapi import HTTPException
    
    try:
        # Create interaction object
        interaction = LearnerInteraction(
            learner_id=request.learner_id,
            skill_id=request.skill_id,
            activity_id=request.activity_id,
            correct=request.correct,
            timestamp=datetime.now(tz=timezone.utc).isoformat(),
            response_time_ms=request.response_time_ms,
            hints_used=request.hints_used,
            attempts=request.attempts,
            difficulty=request.difficulty,
        )
        
        # Get or create brain for learner
        brain_model = learner_brains.get(request.learner_id)
        if not brain_model:
            # Clone a new brain for this learner
            brain_model = brain_trainer.clone_brain_for_learner(request.learner_id)
        
        # Update the brain with the new interaction
        updated_brain = brain_trainer.update_brain(brain_model, interaction)
        
        # Store updated brain
        learner_brains[request.learner_id] = updated_brain
        
        # Get updated skill params
        skill_params = updated_brain.skill_params.get(request.skill_id)
        mastery = skill_params.p_mastery if skill_params else 0.0
        
        return {
            "success": True,
            "learner_id": request.learner_id,
            "skill_id": request.skill_id,
            "new_mastery": mastery,
            "total_interactions": updated_brain.learner_characteristics.get("total_interactions", 0),
        }
        
    except Exception as e:
        logger.exception("Failed to update brain")
        raise HTTPException(status_code=500, detail=f"Brain update failed: {str(e)}")


@app.post("/api/v1/brain/curriculum/align")
async def align_brain_with_curriculum(request: AlignCurriculumRequest):
    """
    Align a learner's brain model with their curriculum.
    
    This adjusts skill weights and priorities based on the curriculum
    standards for the learner's location/school.
    """
    from fastapi import HTTPException
    
    try:
        # Get or create brain for learner
        brain_model = learner_brains.get(request.learner_id)
        if not brain_model:
            brain_model = brain_trainer.clone_brain_for_learner(request.learner_id)
        
        # Align with curriculum
        aligned_brain = brain_trainer.align_with_curriculum(
            brain=brain_model,
            curriculum_skills=request.curriculum_skills,
            skill_weights=request.skill_weights,
        )
        
        # Store updated brain
        learner_brains[request.learner_id] = aligned_brain
        
        return {
            "success": True,
            "learner_id": request.learner_id,
            "curriculum_standards": aligned_brain.curriculum_standards,
            "skills_aligned": len([s for s in aligned_brain.skill_params if aligned_brain.skill_params[s].curriculum_weight > 0]),
        }
        
    except Exception as e:
        logger.exception("Failed to align brain with curriculum")
        raise HTTPException(status_code=500, detail=f"Curriculum alignment failed: {str(e)}")


@app.get("/api/v1/brain/{learner_id}", response_model=BrainModelResponse)
async def get_learner_brain(learner_id: str):
    """
    Get a learner's brain model details.
    """
    from fastapi import HTTPException
    
    brain_model = learner_brains.get(learner_id)
    if not brain_model:
        raise HTTPException(status_code=404, detail="Brain not found for learner")
    
    # Calculate overall accuracy
    total_correct = sum(sp.correct_count for sp in brain_model.skill_params.values())
    total_attempts = sum(sp.attempt_count for sp in brain_model.skill_params.values())
    overall_accuracy = total_correct / max(total_attempts, 1)
    
    return BrainModelResponse(
        model_id=brain_model.model_id,
        learner_id=brain_model.learner_id,
        version=brain_model.version,
        created_at=brain_model.created_at,
        updated_at=brain_model.updated_at,
        overall_accuracy=overall_accuracy,
        total_interactions=brain_model.learner_characteristics.get("total_interactions", 0),
        curriculum_standards=brain_model.curriculum_standards,
        skill_params={
            skill_id: {
                "p_mastery": sp.p_mastery,
                "p_init": sp.p_init,
                "p_learn": sp.p_learn,
                "correct_count": sp.correct_count,
                "attempt_count": sp.attempt_count,
                "curriculum_weight": sp.curriculum_weight,
            }
            for skill_id, sp in brain_model.skill_params.items()
        },
    )


@app.get("/api/v1/brain/{learner_id}/skills/{skill_id}/mastery")
async def get_skill_mastery(learner_id: str, skill_id: str):
    """
    Get mastery level for a specific skill.
    """
    from fastapi import HTTPException
    
    brain_model = learner_brains.get(learner_id)
    if not brain_model:
        raise HTTPException(status_code=404, detail="Brain not found for learner")
    
    skill_params = brain_model.skill_params.get(skill_id)
    if not skill_params:
        # Return default for untracked skill
        return {
            "learner_id": learner_id,
            "skill_id": skill_id,
            "mastery": 0.0,
            "confidence": 0.0,
            "attempts": 0,
        }
    
    # Calculate confidence based on attempt count
    confidence = min(1.0, skill_params.attempt_count / 20.0)
    
    return {
        "learner_id": learner_id,
        "skill_id": skill_id,
        "mastery": skill_params.p_mastery,
        "confidence": confidence,
        "attempts": skill_params.attempt_count,
        "last_updated": brain_model.updated_at,
    }


@app.post("/api/v1/brain/{learner_id}/predict")
async def predict_performance(
    learner_id: str,
    skill_id: str,
    difficulty: float = 0.5,
):
    """
    Predict learner performance on a skill.
    
    Uses the brain model to predict the probability of success.
    """
    from fastapi import HTTPException
    
    brain_model = learner_brains.get(learner_id)
    if not brain_model:
        # Clone a default brain for prediction
        brain_model = brain_trainer.clone_brain_for_learner(learner_id)
    
    skill_params = brain_model.skill_params.get(skill_id)
    if not skill_params:
        # Use default parameters for unknown skill
        p_mastery = 0.3
        p_guess = 0.25
        p_slip = 0.1
    else:
        p_mastery = skill_params.p_mastery
        p_guess = skill_params.p_guess
        p_slip = skill_params.p_slip
    
    # BKT prediction: P(correct) = P(mastery) * (1 - P(slip)) + (1 - P(mastery)) * P(guess)
    p_correct_base = p_mastery * (1 - p_slip) + (1 - p_mastery) * p_guess
    
    # Adjust for difficulty
    difficulty_factor = 1 - (difficulty - 0.5) * 0.3  # Lower prob for harder items
    p_correct = max(0.1, min(0.95, p_correct_base * difficulty_factor))
    
    return {
        "learner_id": learner_id,
        "skill_id": skill_id,
        "difficulty": difficulty,
        "p_correct": p_correct,
        "p_mastery": p_mastery,
        "recommendation": "practice" if p_mastery < 0.7 else "advance",
    }


# Include training API router (BKT and Brain Cloning endpoints)
if training_api_router:
    app.include_router(training_api_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
