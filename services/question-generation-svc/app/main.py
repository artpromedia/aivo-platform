"""
Question Generation Service - FastAPI Application.

AI-powered automatic question and assessment item generation service.
"""

import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.services.generation_pipeline import GenerationPipeline, PipelineConfig

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
        if settings.LOG_FORMAT == "json"
        else structlog.dev.ConsoleRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

# Configure standard logging
logging.basicConfig(
    format="%(message)s",
    stream=sys.stdout,
    level=getattr(logging, settings.LOG_LEVEL.upper()),
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - handles startup and shutdown."""
    # STARTUP
    logger.info(
        "Starting Question Generation Service",
        service=settings.SERVICE_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
    )

    # Initialize the generation pipeline
    try:
        pipeline_config = PipelineConfig(
            qg_model_name=settings.QG_MODEL_NAME,
            device=settings.DEVICE,
            default_num_questions=settings.DEFAULT_NUM_QUESTIONS,
            default_num_distractors=settings.DEFAULT_NUM_DISTRACTORS,
            min_quality_score=settings.MIN_QUALITY_SCORE,
            enable_caching=settings.CACHE_ENABLED,
        )
        app.state.pipeline = GenerationPipeline(config=pipeline_config)
        logger.info("Generation pipeline initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize generation pipeline", error=str(e))
        raise

    logger.info(
        "Question Generation Service started",
        host=settings.HOST,
        port=settings.PORT,
    )

    yield  # Application runs here

    # SHUTDOWN
    logger.info("Shutting down Question Generation Service")

    # Cleanup resources
    if hasattr(app.state, "pipeline"):
        app.state.pipeline.clear_cache()

    logger.info("Question Generation Service stopped")


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
AI-powered automatic question and assessment item generation.

## Features

- **Question Generation**: Generate questions from any content passage using T5 models
- **MCQ Generation**: Create multiple choice questions with plausible distractors
- **Cloze Generation**: Fill-in-the-blank item creation
- **Difficulty Estimation**: Pre-deployment difficulty prediction
- **Bloom's Classification**: Classify cognitive level of questions
- **Quality Filtering**: Ensure high-quality question output

## API Endpoints

- `POST /api/v1/generate/questions` - Generate questions from passage
- `POST /api/v1/generate/mcq` - Generate multiple choice questions
- `POST /api/v1/generate/cloze` - Generate fill-in-blank items
- `POST /api/v1/generate/distractors` - Generate distractors for MCQ
- `POST /api/v1/quality/score` - Score question quality
- `POST /api/v1/bloom/classify` - Classify Bloom's taxonomy level
- `POST /api/v1/difficulty/estimate` - Estimate question difficulty
    """,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
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

# Include API routes
app.include_router(router)


# =============================================================================
# Health Check Endpoints
# =============================================================================


@app.get("/health", tags=["health"])
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/ready", tags=["health"])
async def readiness_check() -> Dict[str, Any]:
    """Kubernetes-style readiness check with dependency status."""
    pipeline_ready = False
    pipeline_status = "not_initialized"

    if hasattr(app.state, "pipeline"):
        try:
            pipeline_ready = app.state.pipeline.is_ready()
            pipeline_status = "ready" if pipeline_ready else "not_ready"
        except Exception as e:
            pipeline_status = f"error: {str(e)}"

    dependencies = {
        "pipeline": {
            "status": pipeline_status,
            "ready": pipeline_ready,
        },
    }

    all_ready = all(d.get("ready", False) for d in dependencies.values())

    return {
        "status": "ready" if all_ready else "not_ready",
        "service": settings.SERVICE_NAME,
        "dependencies": dependencies,
        "models_loaded": pipeline_ready,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/live", tags=["health"])
async def liveness_check() -> Dict[str, str]:
    """Kubernetes-style liveness check."""
    return {"status": "alive"}


@app.get("/", tags=["root"])
async def root() -> Dict[str, Any]:
    """Root endpoint with service information."""
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


# =============================================================================
# Metrics Endpoint (Prometheus-compatible)
# =============================================================================


@app.get("/metrics", tags=["monitoring"])
async def metrics() -> str:
    """Prometheus metrics endpoint."""
    try:
        from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

        return generate_latest()
    except ImportError:
        # Return basic metrics if prometheus_client not available
        return """
# HELP qg_service_info Question Generation Service info
# TYPE qg_service_info gauge
qg_service_info{version="%s",service="%s"} 1
""" % (
            settings.VERSION,
            settings.SERVICE_NAME,
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
