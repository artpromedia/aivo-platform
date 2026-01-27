"""
AIVO API Gateway - Main Application Entry Point
Part of AIVO Platform Migration from aivo-agentic-ai-learning-app

This gateway provides unified access to all Python services:
- AI Inference Service
- Training Service
- Curriculum Service
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("🚀 Starting AIVO API Gateway...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Version: {settings.VERSION}")

    yield

    # Shutdown
    logger.info("👋 Shutting down AIVO API Gateway...")


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AIVO Federated AI Learning Platform API Gateway",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Mount static files for uploads
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# Include API routers
from app.api.v1 import api_router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for all services."""
    import httpx

    services = {
        "ai-inference": settings.AI_INFERENCE_URL,
        "training": settings.TRAINING_URL,
        "curriculum": settings.CURRICULUM_URL,
    }

    health = {"gateway": "healthy"}

    async with httpx.AsyncClient(timeout=5.0) as client:
        for name, url in services.items():
            try:
                response = await client.get(f"{url}/health")
                health[name] = "healthy" if response.status_code == 200 else "unhealthy"
            except Exception:
                health[name] = "unavailable"

    all_healthy = all(v == "healthy" for v in health.values())

    return {
        "status": "healthy" if all_healthy else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "services": health,
    }


# Proxy endpoints for AI Inference Service
@app.post("/api/v1/ai/inference")
async def ai_inference(request: Request):
    """Proxy to AI engine for inference."""
    import httpx

    body = await request.json()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.AI_INFERENCE_URL}/api/v1/generate/generate", json=body
        )
        return response.json()


@app.post("/api/v1/ai/hint")
async def ai_hint(request: Request):
    """Proxy to AI engine for hints."""
    import httpx

    body = await request.json()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.AI_INFERENCE_URL}/api/v1/generate/hint", json=body
        )
        return response.json()


# Proxy endpoints for Training Service
@app.post("/api/v1/training/jobs")
async def create_training_job(request: Request):
    """Proxy to training service."""
    import httpx

    body = await request.json()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.TRAINING_URL}/api/v1/training/jobs", json=body
        )
        return response.json()


@app.get("/api/v1/training/jobs/{job_id}")
async def get_training_job(job_id: str):
    """Proxy to get training job status."""
    import httpx

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.TRAINING_URL}/api/v1/training/jobs/{job_id}"
        )
        return response.json()


# BKT (Bayesian Knowledge Tracing) Proxy Endpoints
@app.post("/api/v1/training/bkt/update")
async def update_bkt(request: Request):
    """Proxy to update BKT model with learning interaction."""
    import httpx

    body = await request.json()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.TRAINING_URL}/api/v1/training/bkt/update", json=body
        )
        return response.json()


@app.get("/api/v1/training/bkt/mastery/{learner_id}/{skill_id}")
async def get_bkt_mastery(learner_id: str, skill_id: str):
    """Proxy to get BKT mastery probability."""
    import httpx

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.TRAINING_URL}/api/v1/training/bkt/mastery/{learner_id}/{skill_id}"
        )
        return response.json()


# Brain Cloning Proxy Endpoints
@app.post("/api/v1/training/brain/clone")
async def clone_brain(request: Request):
    """Proxy to clone base brain for a learner."""
    import httpx

    body = await request.json()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.TRAINING_URL}/api/v1/training/brain/clone", json=body
        )
        return response.json()


@app.post("/api/v1/training/brain/fine-tune")
async def fine_tune_brain(request: Request):
    """Proxy to fine-tune learner's brain model."""
    import httpx

    body = await request.json()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.TRAINING_URL}/api/v1/training/brain/fine-tune", json=body
        )
        return response.json()


@app.post("/api/v1/training/brain/predict-mastery")
async def predict_mastery(request: Request):
    """Proxy to predict mastery using neural network."""
    import httpx

    body = await request.json()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.TRAINING_URL}/api/v1/training/brain/predict-mastery", json=body
        )
        return response.json()


# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error_code": "INTERNAL_ERROR",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
