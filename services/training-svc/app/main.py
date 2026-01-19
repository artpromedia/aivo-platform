"""
Training Service - Main Application
Part of AIVO Platform Migration - Base Brain Model Training
"""

from contextlib import asynccontextmanager
from typing import Optional, Dict

from fastapi import FastAPI, BackgroundTasks
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
    from datetime import datetime

    job_id = str(uuid.uuid4())
    job = TrainingJobStatus(
        job_id=job_id,
        status="queued",
        progress=0.0,
        message="Training job queued",
        started_at=datetime.utcnow().isoformat(),
    )
    training_jobs[job_id] = job

    # TODO: Add actual training logic in background task
    # background_tasks.add_task(run_training, job_id, request)

    return job


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
