"""
Specialized Support Service - FastAPI Application.

AI-powered support for learners with ADHD, ASD, Dyslexia, Anxiety, and other needs.
"""

import logging
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .adhd import (
    ADHDSupportService,
    ExecutiveFunctionStrategies,
    ProjectBreakdownService,
    DailyPlannerService,
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Constant for error message
ERROR_SERVICE_NOT_INITIALIZED = "Service not initialized"


# Service instances
adhd_service: ADHDSupportService | None = None
ef_strategies: ExecutiveFunctionStrategies | None = None
project_breakdown: ProjectBreakdownService | None = None
daily_planner: DailyPlannerService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global adhd_service, ef_strategies, project_breakdown, daily_planner

    logger.info(f"Starting {settings.SERVICE_NAME} v{settings.VERSION}")

    # Initialize services
    adhd_service = ADHDSupportService()
    ef_strategies = ExecutiveFunctionStrategies()
    project_breakdown = ProjectBreakdownService()
    daily_planner = DailyPlannerService()

    logger.info("All services initialized successfully")

    yield

    # Cleanup
    logger.info("Shutting down services")


app = FastAPI(
    title="Specialized Support Service",
    description="AI-powered support for learners with ADHD, ASD, Dyslexia, and other needs",
    version=settings.VERSION,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    return {
        "status": "ready",
        "services": {
            "adhd": adhd_service is not None,
            "ef_strategies": ef_strategies is not None,
            "project_breakdown": project_breakdown is not None,
            "daily_planner": daily_planner is not None,
        },
    }


# =============================================================================
# ADHD Support Endpoints
# =============================================================================


@app.post("/api/v1/adhd/executive-function/strategies")
async def get_ef_strategies(request: Request) -> Dict[str, Any]:
    """Get executive function strategies for a learner."""
    if not ef_strategies:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_profile = body.get("learner_profile", {})
    ef_domain = body.get("domain", "organization")
    context = body.get("context", {})

    strategies = await ef_strategies.get_strategies(
        learner_profile=learner_profile,
        domain=ef_domain,
        context=context,
    )

    return {"strategies": strategies}


@app.post("/api/v1/adhd/project-breakdown")
async def break_down_project(request: Request) -> Dict[str, Any]:
    """Break down a complex project into manageable chunks."""
    if not project_breakdown:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    project = body.get("project", {})
    learner_profile = body.get("learner_profile", {})

    breakdown = await project_breakdown.break_down(
        project=project,
        learner_profile=learner_profile,
    )

    return {"breakdown": breakdown}


@app.post("/api/v1/adhd/daily-plan")
async def create_daily_plan(request: Request) -> Dict[str, Any]:
    """Create a personalized daily plan for a learner with ADHD."""
    if not daily_planner:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_profile = body.get("learner_profile", {})
    tasks = body.get("tasks", [])
    preferences = body.get("preferences", {})

    plan = await daily_planner.create_plan(
        learner_profile=learner_profile,
        tasks=tasks,
        preferences=preferences,
    )

    return {"daily_plan": plan}


@app.post("/api/v1/adhd/support")
async def get_adhd_support(request: Request) -> Dict[str, Any]:
    """Get comprehensive ADHD support recommendations."""
    if not adhd_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_profile = body.get("learner_profile", {})
    current_context = body.get("context", {})
    support_type = body.get("support_type", "general")

    support = await adhd_service.get_support(
        learner_profile=learner_profile,
        context=current_context,
        support_type=support_type,
    )

    return {"support": support}


# =============================================================================
# Error Handlers
# =============================================================================


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
