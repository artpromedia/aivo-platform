"""
Writing Assessment Service - FastAPI Application

Provides deep NLP analysis for student writing, complementing
the grading-engine with detailed analytical feedback.
"""

import logging
from contextlib import asynccontextmanager
from typing import Any, Dict

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Histogram, generate_latest

from app.api.routes import init_components, router
from app.core.config import Settings, get_settings

# Configure structured logging
settings = get_settings()


def configure_logging() -> None:
    """Configure structured logging."""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    if settings.LOG_FORMAT == "json":
        structlog.configure(
            processors=[
                structlog.stdlib.filter_by_level,
                structlog.stdlib.add_logger_name,
                structlog.stdlib.add_log_level,
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.JSONRenderer(),
            ],
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            wrapper_class=structlog.stdlib.BoundLogger,
            cache_logger_on_first_use=True,
        )
    else:
        structlog.configure(
            processors=[
                structlog.stdlib.filter_by_level,
                structlog.stdlib.add_logger_name,
                structlog.stdlib.add_log_level,
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.dev.ConsoleRenderer(),
            ],
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            wrapper_class=structlog.stdlib.BoundLogger,
            cache_logger_on_first_use=True,
        )

    logging.basicConfig(level=log_level, format="%(message)s")


configure_logging()
logger = structlog.get_logger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter(
    "writing_assessment_requests_total",
    "Total number of assessment requests",
    ["endpoint", "status"],
)
REQUEST_LATENCY = Histogram(
    "writing_assessment_request_latency_seconds",
    "Request latency in seconds",
    ["endpoint"],
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Initializing Writing Assessment Service...")

    # Initialize all model components
    try:
        init_components(settings)
        logger.info("All components initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize components: {e}")
        raise

    yield

    logger.info("Shutting down Writing Assessment Service...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
AI-powered writing analysis for educational assessment.

## Features

- **Essay Scoring**: BERT-based holistic and trait-based scoring
- **Coherence Analysis**: Paragraph transitions and logical flow
- **Grammar Checking**: Hybrid rule + ML grammar detection
- **Style Analysis**: Writing style metrics and suggestions
- **Readability Profiling**: Multi-dimensional readability metrics
- **Feedback Generation**: Constructive, grade-appropriate feedback

## Endpoints

- `/api/v1/assess/full` - Complete writing assessment
- `/api/v1/assess/grammar` - Grammar-only check (fast)
- `/api/v1/assess/readability` - Readability-only analysis
- `/api/v1/assess/style` - Style-only analysis
- `/api/v1/assess/coherence` - Coherence-only analysis
- `/api/v1/feedback/generate` - Generate constructive feedback
    """,
    version=settings.VERSION,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Include API routes
app.include_router(router)


# =============================================================================
# Health Endpoints
# =============================================================================


@app.get("/health", tags=["health"])
async def health() -> Dict[str, Any]:
    """Basic health check."""
    return {
        "status": "healthy",
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
    }


@app.get("/ready", tags=["health"])
async def ready() -> Dict[str, Any]:
    """Kubernetes readiness check."""
    # Check if models are loaded
    from app.api.routes import (
        _coherence_analyzer,
        _essay_scorer,
        _grammar_checker,
        _readability_profiler,
        _style_analyzer,
    )

    models_loaded = all(
        [
            _essay_scorer is not None,
            _coherence_analyzer is not None,
            _grammar_checker is not None,
            _style_analyzer is not None,
            _readability_profiler is not None,
        ]
    )

    return {
        "status": "ready" if models_loaded else "not_ready",
        "models_loaded": models_loaded,
        "dependencies": {
            "essay_scorer": _essay_scorer is not None,
            "coherence_analyzer": _coherence_analyzer is not None,
            "grammar_checker": _grammar_checker is not None,
            "style_analyzer": _style_analyzer is not None,
            "readability_profiler": _readability_profiler is not None,
        },
    }


@app.get("/live", tags=["health"])
async def live() -> Dict[str, str]:
    """Kubernetes liveness check."""
    return {"status": "alive"}


# =============================================================================
# Metrics Endpoint
# =============================================================================


@app.get("/metrics", tags=["monitoring"])
async def metrics() -> str:
    """Prometheus metrics endpoint."""
    return generate_latest().decode("utf-8")


# =============================================================================
# Root Endpoint
# =============================================================================


@app.get("/", tags=["info"])
async def root() -> Dict[str, Any]:
    """Service information."""
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "description": "AI-powered writing analysis for educational assessment",
        "docs_url": "/docs",
        "health_url": "/health",
        "endpoints": {
            "full_assessment": "/api/v1/assess/full",
            "grammar_check": "/api/v1/assess/grammar",
            "readability_analysis": "/api/v1/assess/readability",
            "style_analysis": "/api/v1/assess/style",
            "coherence_analysis": "/api/v1/assess/coherence",
            "feedback_generation": "/api/v1/feedback/generate",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
