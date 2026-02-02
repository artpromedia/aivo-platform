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
    ADHDAIService,
    EFStrategyLibrary,
    ProjectBreakdownService,
    DailyPlannerService,
)
from .asd import ASDSupportService
from .dyslexia import DyslexiaSupportService
from .anxiety import AnxietySupportService

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Constant for error message
ERROR_SERVICE_NOT_INITIALIZED = "Service not initialized"


# Service instances
adhd_service: ADHDAIService | None = None
ef_strategies: EFStrategyLibrary | None = None
project_breakdown: ProjectBreakdownService | None = None
daily_planner: DailyPlannerService | None = None
asd_service: ASDSupportService | None = None
dyslexia_service: DyslexiaSupportService | None = None
anxiety_service: AnxietySupportService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global adhd_service, ef_strategies, project_breakdown, daily_planner
    global asd_service, dyslexia_service, anxiety_service

    logger.info(f"Starting {settings.SERVICE_NAME} v{settings.VERSION}")

    # Initialize ADHD services
    adhd_service = ADHDAIService()
    ef_strategies = EFStrategyLibrary()
    project_breakdown = ProjectBreakdownService()
    daily_planner = DailyPlannerService()

    # Initialize ASD, Dyslexia, and Anxiety services
    asd_service = ASDSupportService()
    dyslexia_service = DyslexiaSupportService()
    anxiety_service = AnxietySupportService()

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
            "asd": asd_service is not None,
            "dyslexia": dyslexia_service is not None,
            "anxiety": anxiety_service is not None,
        },
    }


# =============================================================================
# ADHD Support Endpoints
# =============================================================================


@app.post("/api/v1/adhd/executive-function/strategies")
async def get_ef_strategies_endpoint(request: Request) -> Dict[str, Any]:
    """Get executive function strategies for a learner."""
    if not ef_strategies:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    ef_domain = body.get("domain", "organization")

    from .adhd.models import ExecutiveFunctionDomain
    try:
        domain_enum = ExecutiveFunctionDomain(ef_domain)
    except ValueError:
        domain_enum = ExecutiveFunctionDomain.ORGANIZATION

    strategies = ef_strategies.get_strategies_for_domain(domain=domain_enum)

    return {"strategies": [
        {"name": s.name, "description": s.description, "steps": s.steps}
        for s in strategies
    ]}


@app.post("/api/v1/adhd/project-breakdown")
async def break_down_project(request: Request) -> Dict[str, Any]:
    """Break down a complex project into manageable chunks."""
    if not project_breakdown:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    project_description = body.get("project", {}).get("description", "")
    deadline_str = body.get("project", {}).get("deadline")
    subject_area = body.get("project", {}).get("subject", "general")

    from datetime import datetime, timedelta
    from .adhd.models import ADHDProfile
    
    # Parse deadline or use default
    if deadline_str:
        try:
            deadline = datetime.fromisoformat(deadline_str)
        except ValueError:
            deadline = datetime.now() + timedelta(days=7)
    else:
        deadline = datetime.now() + timedelta(days=7)
    
    # Use default profile for now
    profile = ADHDProfile(learner_id="default")

    chunks = await project_breakdown.breakdown_project(
        project_description=project_description,
        deadline=deadline,
        profile=profile,
        subject_area=subject_area,
    )

    return {"breakdown": [
        {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "estimated_minutes": c.estimated_minutes,
            "sequence_order": c.sequence_order,
        }
        for c in chunks
    ]}


@app.post("/api/v1/adhd/daily-plan")
async def create_daily_plan(request: Request) -> Dict[str, Any]:
    """Create a personalized daily plan for a learner with ADHD."""
    if not daily_planner:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_id = body.get("learner_id", "default")
    tasks_data = body.get("tasks", [])

    from .adhd.models import ADHDProfile, Task
    
    # Use default profile for now
    profile = ADHDProfile(learner_id=learner_id)
    
    # Convert task dicts to Task objects
    tasks = []
    for t in tasks_data:
        tasks.append(Task(
            title=t.get("title", ""),
            description=t.get("description", ""),
            estimated_minutes=t.get("estimated_minutes", 30),
            priority=t.get("priority", 3),
        ))

    schedule = await daily_planner.generate_schedule(
        learner_id=learner_id,
        profile=profile,
        tasks=tasks,
    )

    return {"daily_plan": {
        "id": schedule.id,
        "learner_id": schedule.learner_id,
        "total_blocks": len(schedule.time_blocks),
        "blocks": [
            {
                "id": b.id,
                "category": b.category.value if hasattr(b.category, 'value') else str(b.category),
                "title": b.title,
                "start_time": b.start_time.isoformat() if b.start_time else None,
                "end_time": b.end_time.isoformat() if b.end_time else None,
                "duration_minutes": b.duration_minutes,
            }
            for b in schedule.time_blocks[:10]  # Limit to first 10 blocks
        ],
    }}


@app.post("/api/v1/adhd/support")
async def get_adhd_support(request: Request) -> Dict[str, Any]:
    """Get comprehensive ADHD support recommendations."""
    if not adhd_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_id = body.get("learner_id", "default")
    current_context = body.get("context", {})
    support_type = body.get("support_type", "ef_strategies")

    try:
        support = await adhd_service.get_support(
            learner_id=learner_id,
            support_type=support_type,
            context=current_context,
        )
        return {"support": support}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# ASD Support Endpoints
# =============================================================================


@app.post("/api/v1/asd/support")
async def get_asd_support(request: Request) -> Dict[str, Any]:
    """Get ASD support based on request type."""
    if not asd_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_id = body.get("learner_id", "")
    support_type = body.get("support_type", "sensory")
    context = body.get("context", {})

    from .asd.models import SupportRequest, SupportType
    request_obj = SupportRequest(
        learner_id=learner_id,
        support_type=SupportType(support_type),
        context=context,
    )

    response = await asd_service.get_support(request_obj)
    return {"support": response.content, "support_type": response.support_type.value}


@app.get("/api/v1/asd/profile/{learner_id}")
async def get_asd_profile(learner_id: str) -> Dict[str, Any]:
    """Get ASD profile for a learner."""
    if not asd_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    profile = await asd_service.get_profile(learner_id)
    return {
        "learner_id": profile.learner_id,
        "sensory_profile": profile.sensory_profile.__dict__ if profile.sensory_profile else None,
        "communication_preferences": [p.value for p in profile.communication_preferences],
        "special_interests": [i.topic for i in profile.special_interests],
        "routine_importance": profile.routine_importance,
    }


@app.post("/api/v1/asd/transition-plan")
async def create_transition_plan(request: Request) -> Dict[str, Any]:
    """Create a transition plan for an upcoming change."""
    if not asd_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_id = body.get("learner_id", "")
    transition_name = body.get("transition_name", "")
    from_activity = body.get("from_activity", "")
    to_activity = body.get("to_activity", "")
    context = body.get("context", {})

    from .asd.models import SupportRequest, SupportType
    request_obj = SupportRequest(
        learner_id=learner_id,
        support_type=SupportType.TRANSITION,
        context={
            "transition_name": transition_name,
            "from_activity": from_activity,
            "to_activity": to_activity,
            **context,
        },
    )

    response = await asd_service.get_support(request_obj)
    return {"transition_plan": response.content}


@app.post("/api/v1/asd/social-script")
async def get_social_script(request: Request) -> Dict[str, Any]:
    """Get a social script for a situation."""
    if not asd_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_id = body.get("learner_id", "")
    situation = body.get("situation", "")
    context = body.get("context", {})

    from .asd.models import SupportRequest, SupportType
    request_obj = SupportRequest(
        learner_id=learner_id,
        support_type=SupportType.SOCIAL,
        context={"situation": situation, **context},
    )

    response = await asd_service.get_support(request_obj)
    return {"social_script": response.content}


# =============================================================================
# Dyslexia Support Endpoints
# =============================================================================


@app.post("/api/v1/dyslexia/support")
async def get_dyslexia_support(request: Request) -> Dict[str, Any]:
    """Get dyslexia support based on request type."""
    if not dyslexia_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_id = body.get("learner_id", "")
    support_type = body.get("support_type", "reading")
    context = body.get("context", {})

    from .dyslexia.models import SupportRequest
    request_obj = SupportRequest(
        learner_id=learner_id,
        support_type=support_type,
        context=context,
    )

    response = await dyslexia_service.get_support(request_obj)
    return {"support": response.content, "support_type": response.support_type}


@app.get("/api/v1/dyslexia/profile/{learner_id}")
async def get_dyslexia_profile(learner_id: str) -> Dict[str, Any]:
    """Get dyslexia profile for a learner."""
    if not dyslexia_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    profile = await dyslexia_service.get_profile(learner_id)
    return {
        "learner_id": profile.learner_id,
        "reading_level": profile.reading_level,
        "reading_preferences": profile.reading_preferences.__dict__ if profile.reading_preferences else None,
        "writing_support": profile.writing_support.__dict__ if profile.writing_support else None,
        "strengths": profile.strengths,
        "accommodations": profile.accommodations,
    }


@app.post("/api/v1/dyslexia/format-text")
async def format_text_for_reading(request: Request) -> Dict[str, Any]:
    """Format text for dyslexia-friendly reading."""
    if not dyslexia_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_id = body.get("learner_id", "")
    text = body.get("text", "")
    context = body.get("context", {})

    from .dyslexia.models import SupportRequest
    request_obj = SupportRequest(
        learner_id=learner_id,
        support_type="format_text",
        context={"text": text, **context},
    )

    response = await dyslexia_service.get_support(request_obj)
    return {"formatted_text": response.content}


@app.post("/api/v1/dyslexia/writing-support")
async def get_writing_support(request: Request) -> Dict[str, Any]:
    """Get writing support for a learner with dyslexia."""
    if not dyslexia_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_id = body.get("learner_id", "")
    task_type = body.get("task_type", "paragraph")
    topic = body.get("topic", "")
    context = body.get("context", {})

    from .dyslexia.models import SupportRequest
    request_obj = SupportRequest(
        learner_id=learner_id,
        support_type="writing",
        context={"task_type": task_type, "topic": topic, **context},
    )

    response = await dyslexia_service.get_support(request_obj)
    return {"writing_support": response.content}


# =============================================================================
# Anxiety Support Endpoints
# =============================================================================


@app.post("/api/v1/anxiety/support")
async def get_anxiety_support(request: Request) -> Dict[str, Any]:
    """Get anxiety support based on request type."""
    if not anxiety_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_id = body.get("learner_id", "")
    support_type = body.get("support_type", "coping_strategies")
    current_level = body.get("current_level", "moderate")
    context = body.get("context", {})

    from .anxiety.models import AnxietyLevel, SupportRequest
    request_obj = SupportRequest(
        learner_id=learner_id,
        support_type=support_type,
        current_level=AnxietyLevel(current_level),
        context=context,
    )

    response = await anxiety_service.get_support(request_obj)
    return {"support": response.content, "support_type": response.support_type}


@app.get("/api/v1/anxiety/profile/{learner_id}")
async def get_anxiety_profile(learner_id: str) -> Dict[str, Any]:
    """Get anxiety profile for a learner."""
    if not anxiety_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    profile = await anxiety_service.get_profile(learner_id)
    return {
        "learner_id": profile.learner_id,
        "anxiety_types": [t.value for t in profile.anxiety_types],
        "triggers": [{"name": t.name, "category": t.category.value} for t in profile.triggers],
        "effective_coping": [s.name for s in profile.effective_coping],
        "safe_person": profile.safe_person,
        "accommodations": profile.accommodations,
    }


@app.post("/api/v1/anxiety/check-in")
async def anxiety_check_in(request: Request) -> Dict[str, Any]:
    """Record an anxiety check-in and get support if needed."""
    if not anxiety_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_id = body.get("learner_id", "")
    level = body.get("level", "moderate")
    notes = body.get("notes", "")

    from .anxiety.models import AnxietyCheckIn, AnxietyLevel
    check_in = AnxietyCheckIn(
        level=AnxietyLevel(level),
        notes=notes,
    )

    response = await anxiety_service.record_check_in(learner_id, check_in)
    return {"check_in_response": response}


@app.post("/api/v1/anxiety/immediate-help")
async def get_immediate_help(request: Request) -> Dict[str, Any]:
    """Get immediate help for acute anxiety."""
    if not anxiety_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_id = body.get("learner_id", "")
    current_level = body.get("current_level", "high")

    from .anxiety.models import AnxietyLevel, SupportRequest
    request_obj = SupportRequest(
        learner_id=learner_id,
        support_type="immediate_help",
        current_level=AnxietyLevel(current_level),
    )

    response = await anxiety_service.get_support(request_obj)
    return {"immediate_help": response.content}


@app.post("/api/v1/anxiety/test-anxiety")
async def get_test_anxiety_support(request: Request) -> Dict[str, Any]:
    """Get test anxiety support."""
    if not anxiety_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_id = body.get("learner_id", "")
    timing = body.get("timing", "before_test")

    from .anxiety.models import SupportRequest
    request_obj = SupportRequest(
        learner_id=learner_id,
        support_type="test_anxiety",
        context={"timing": timing},
    )

    response = await anxiety_service.get_support(request_obj)
    return {"test_anxiety_support": response.content}


@app.post("/api/v1/anxiety/reframe-thought")
async def reframe_anxious_thought(request: Request) -> Dict[str, Any]:
    """Help reframe an anxious thought."""
    if not anxiety_service:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    learner_id = body.get("learner_id", "")
    thought = body.get("thought", "")

    from .anxiety.models import SupportRequest
    request_obj = SupportRequest(
        learner_id=learner_id,
        support_type="reframe",
        context={"thought": thought},
    )

    response = await anxiety_service.get_support(request_obj)
    return {"reframed": response.content}


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
