"""
Training Service - Main Application
Part of AIVO Platform Migration - Base Brain Model Training
"""

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional, Dict

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifespan manager."""
    print(f"Starting {settings.PROJECT_NAME} {settings.VERSION}")
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
