"""
Cognitive Load Service - FastAPI Application

Provides REST endpoints for adaptive cognitive load management:
- Real-time load estimation
- Content complexity analysis
- Working memory modeling
- Overload prediction
- Scaffolding generation
- Pacing optimization
"""

import logging
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as cognitive_router, init_components, get_components
from app.core.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Settings instance
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Initializing Cognitive Load Service...")

    # Initialize all model components
    try:
        init_components(settings)
        logger.info("Cognitive Load Service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize components: {e}")
        # Continue anyway - components will be initialized lazily on first use

    yield

    logger.info("Shutting down Cognitive Load Service...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
AI-powered cognitive load management for personalized learning.

## Features

- **Load Estimation**: Real-time cognitive load estimation from behavioral signals
- **Content Analysis**: Analyze intrinsic complexity of educational content
- **Working Memory**: Model learner working memory capacity and usage
- **Overload Prediction**: Proactive warning system for cognitive overload
- **Scaffolding**: Adaptive support recommendations based on load
- **Pacing**: Optimize content delivery based on cognitive state

## API Endpoints

### Cognitive Load Estimation
- `POST /api/v1/load/estimate` - Estimate cognitive load from interaction data
- `GET /api/v1/load/history/{learner_id}` - Get load history for a learner

### Content Complexity
- `POST /api/v1/content/complexity` - Analyze content complexity
- `POST /api/v1/content/element-interactivity` - Analyze element interactivity

### Extraneous Load
- `POST /api/v1/extraneous/detect` - Detect extraneous load from UI

### Working Memory
- `POST /api/v1/memory/estimate` - Estimate working memory load
- `GET /api/v1/memory/snapshot/{learner_id}` - Get memory snapshot

### Overload Prediction
- `POST /api/v1/overload/predict` - Predict cognitive overload
- `POST /api/v1/overload/trend` - Analyze load trend
- `GET /api/v1/overload/warnings/{learner_id}` - Get early warnings

### Scaffolding
- `POST /api/v1/scaffolding/generate` - Generate scaffolding recommendations
- `POST /api/v1/scaffolding/hint` - Generate progressive hints

### Pacing
- `POST /api/v1/pacing/recommend` - Recommend content pacing

### Adaptation
- `POST /api/v1/adaptation/recommend` - Get adaptation recommendations

### Session Management
- `POST /api/v1/session/start` - Start tracking session
- `POST /api/v1/session/{session_id}/update` - Update session
- `GET /api/v1/session/{session_id}/summary` - Get session summary
- `DELETE /api/v1/session/{session_id}` - End session
    """,
    version=settings.VERSION,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Include cognitive load API routes
app.include_router(cognitive_router, prefix="/api/v1")


# =============================================================================
# Health Endpoints
# =============================================================================


@app.get("/health")
async def health() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
    }


@app.get("/health/ready")
async def readiness() -> Dict[str, Any]:
    """Readiness check endpoint."""
    components = get_components()

    all_loaded = all(components.values())

    return {
        "status": "ready" if all_loaded else "partial",
        "components_loaded": components,
    }


@app.get("/health/live")
async def liveness() -> Dict[str, str]:
    """Liveness check endpoint."""
    return {"status": "alive"}


@app.get("/metrics")
async def metrics() -> Dict[str, Any]:
    """Basic metrics endpoint."""
    components = get_components()

    return {
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "components_initialized": sum(1 for v in components.values() if v),
        "total_components": len(components),
        "settings": {
            "low_load_threshold": settings.LOW_LOAD_THRESHOLD,
            "optimal_load_threshold": settings.OPTIMAL_LOAD_THRESHOLD,
            "high_load_threshold": settings.HIGH_LOAD_THRESHOLD,
            "default_wm_capacity": settings.DEFAULT_WM_CAPACITY,
            "prediction_window_seconds": settings.PREDICTION_WINDOW_SECONDS,
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower(),
    )
