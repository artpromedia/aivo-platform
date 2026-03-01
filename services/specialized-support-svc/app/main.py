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
from .models import IEPAnalyzer, DifferentiationEngine, AccommodationRecommender

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
iep_analyzer: IEPAnalyzer | None = None
differentiation_engine: DifferentiationEngine | None = None
accommodation_recommender: AccommodationRecommender | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global adhd_service, ef_strategies, project_breakdown, daily_planner
    global asd_service, dyslexia_service, anxiety_service
    global iep_analyzer, differentiation_engine, accommodation_recommender

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

    # Initialize cross-cutting models
    iep_analyzer = IEPAnalyzer()
    differentiation_engine = DifferentiationEngine()
    accommodation_recommender = AccommodationRecommender()

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
            "iep_analyzer": iep_analyzer is not None,
            "differentiation_engine": differentiation_engine is not None,
            "accommodation_recommender": accommodation_recommender is not None,
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
# IEP Analyzer Endpoints
# =============================================================================


@app.post("/api/v1/specialized-support/analyze-iep")
async def analyze_iep_endpoint(request: Request) -> Dict[str, Any]:
    """Analyse an IEP document for completeness and IDEA compliance."""
    if not iep_analyzer:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    iep_document = body.get("iep_document", body)
    result = iep_analyzer.analyze_iep(iep_document)

    return {
        "quality_score": result.quality_score,
        "sections": [
            {
                "section": s.section,
                "present": s.present,
                "completeness": s.completeness,
                "issues": s.issues,
            }
            for s in result.sections
        ],
        "goals": [
            {
                "goal_id": g.goal_id,
                "measurability_score": g.measurability_score,
                "has_condition": g.has_condition,
                "has_behaviour": g.has_behaviour,
                "has_criteria": g.has_criteria,
                "has_timeframe": g.has_timeframe,
                "issues": g.issues,
                "suggestions": g.suggestions,
            }
            for g in result.goals
        ],
        "missing_accommodations": result.missing_accommodations,
        "compliance_issues": result.compliance_issues,
        "strengths": result.strengths,
        "recommendations": result.recommendations,
    }


@app.post("/api/v1/specialized-support/iep-implications")
async def iep_implications_endpoint(request: Request) -> Dict[str, Any]:
    """Extract platform learning implications from IEP data."""
    if not iep_analyzer:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    iep_data = body.get("iep_data", body)
    result = iep_analyzer.extract_learning_implications(iep_data)

    return {
        "feature_toggles": [
            {
                "source": ft.source,
                "feature": ft.feature,
                "value": ft.value,
                "description": ft.description,
            }
            for ft in result.feature_toggles
        ],
        "path_constraints": result.path_constraints,
        "scheduling_rules": result.scheduling_rules,
        "summary": result.summary,
    }


@app.post("/api/v1/specialized-support/iep-progress")
async def iep_progress_endpoint(request: Request) -> Dict[str, Any]:
    """Track IEP goal progress against mastery data."""
    if not iep_analyzer:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    report = iep_analyzer.track_goal_progress(
        iep_goals=body.get("iep_goals", []),
        mastery_data=body.get("mastery_data", {}),
        learner_id=body.get("learner_id", "unknown"),
        report_period=body.get("report_period", "current"),
    )

    return {
        "learner_id": report.learner_id,
        "report_period": report.report_period,
        "overall_progress_pct": report.overall_progress_pct,
        "goals_on_track": report.goals_on_track,
        "goals_at_risk": report.goals_at_risk,
        "goals": [
            {
                "goal_id": g.goal_id,
                "goal_text": g.goal_text,
                "current_mastery": g.current_mastery,
                "target_mastery": g.target_mastery,
                "progress_pct": g.progress_pct,
                "on_track": g.on_track,
                "matched_skills": g.matched_skills,
                "notes": g.notes,
            }
            for g in report.goals
        ],
        "recommendations": report.recommendations,
    }


# =============================================================================
# Differentiation Engine Endpoints
# =============================================================================


@app.post("/api/v1/specialized-support/differentiate")
async def differentiate_content_endpoint(request: Request) -> Dict[str, Any]:
    """Generate differentiated content for a learner."""
    if not differentiation_engine:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    result = differentiation_engine.differentiate_content(
        content=body.get("content", {}),
        learner_profile=body.get("learner_profile", {}),
        iep_data=body.get("iep_data"),
        strategy=body.get("strategy"),
    )

    response: Dict[str, Any] = {
        "strategy_type": result.strategy_type,
        "content_area": result.content_area,
        "learner_summary": result.learner_summary,
        "accommodations_applied": result.accommodations_applied,
        "implementation_notes": result.implementation_notes,
    }

    if result.tiered_content:
        response["tiered_content"] = [
            {
                "tier": t.tier,
                "complexity_level": t.complexity_level,
                "content_modifications": t.content_modifications,
                "support_structures": t.support_structures,
                "assessment_adjustments": t.assessment_adjustments,
                "sample_activities": t.sample_activities,
            }
            for t in result.tiered_content
        ]
    if result.grouping_plan:
        response["grouping_plan"] = {
            "strategy": result.grouping_plan.strategy,
            "rationale": result.grouping_plan.rationale,
            "group_count": result.grouping_plan.group_count,
            "rotation_interval_minutes": result.grouping_plan.rotation_interval_minutes,
            "group_descriptions": result.grouping_plan.group_descriptions,
        }
    if result.compacting_plan:
        response["compacting_plan"] = {
            "pretest_skills": result.compacting_plan.pretest_skills,
            "mastered_content": result.compacting_plan.mastered_content,
            "skip_sections": result.compacting_plan.skip_sections,
            "enrichment_activities": result.compacting_plan.enrichment_activities,
            "acceleration_options": result.compacting_plan.acceleration_options,
        }
    if result.interest_centers:
        response["interest_centers"] = [
            {
                "name": ic.name,
                "description": ic.description,
                "learning_objectives": ic.learning_objectives,
                "activities": ic.activities,
                "materials": ic.materials,
                "duration_minutes": ic.duration_minutes,
            }
            for ic in result.interest_centers
        ]
    if result.scaffold_levels:
        response["scaffold_levels"] = [
            {
                "level": sl.level,
                "support_type": sl.support_type,
                "description": sl.description,
                "when_to_use": sl.when_to_use,
                "fade_criteria": sl.fade_criteria,
            }
            for sl in result.scaffold_levels
        ]
    if result.multi_sensory_plan:
        response["multi_sensory_plan"] = {
            "visual_activities": result.multi_sensory_plan.visual_activities,
            "auditory_activities": result.multi_sensory_plan.auditory_activities,
            "kinesthetic_activities": result.multi_sensory_plan.kinesthetic_activities,
            "combined_activities": result.multi_sensory_plan.combined_activities,
        }

    return response


@app.post("/api/v1/specialized-support/suggest-differentiation")
async def suggest_differentiation_endpoint(request: Request) -> Dict[str, Any]:
    """Analyse class diversity and suggest differentiation strategies."""
    if not differentiation_engine:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    result = differentiation_engine.suggest_differentiation(
        lesson_plan=body.get("lesson_plan", {}),
        class_profiles=body.get("class_profiles", []),
    )

    return {
        "class_analysis": {
            "total_students": result.class_analysis.total_students,
            "skill_distribution": result.class_analysis.skill_distribution,
            "iep_count": result.class_analysis.iep_count,
            "ell_count": result.class_analysis.ell_count,
            "gifted_count": result.class_analysis.gifted_count,
            "disability_categories": result.class_analysis.disability_categories,
            "diversity_score": result.class_analysis.diversity_score,
            "primary_challenges": result.class_analysis.primary_challenges,
        },
        "suggestions": [
            {
                "strategy": s.strategy,
                "priority": s.priority,
                "rationale": s.rationale,
                "estimated_prep_minutes": s.estimated_prep_minutes,
                "evidence_base": s.evidence_base,
                "implementation_guide": {
                    "lesson_title": s.implementation_guide.lesson_title,
                    "strategy_used": s.implementation_guide.strategy_used,
                    "preparation_steps": s.implementation_guide.preparation_steps,
                    "implementation_steps": s.implementation_guide.implementation_steps,
                    "monitoring_checklist": s.implementation_guide.monitoring_checklist,
                    "adjustment_triggers": s.implementation_guide.adjustment_triggers,
                    "reflection_prompts": s.implementation_guide.reflection_prompts,
                },
            }
            for s in result.suggestions
        ],
        "summary": result.summary,
    }


# =============================================================================
# Accommodation Recommender Endpoints
# =============================================================================


@app.post("/api/v1/specialized-support/recommend-accommodations")
async def recommend_accommodations_endpoint(request: Request) -> Dict[str, Any]:
    """Recommend accommodations based on performance data."""
    if not accommodation_recommender:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    result = accommodation_recommender.recommend_accommodations(
        learner_profile=body.get("learner_profile", {}),
        performance_data=body.get("performance_data", {}),
        existing_accommodations=body.get("existing_accommodations"),
        iep_accommodations=body.get("iep_accommodations"),
    )

    return {
        "learner_id": result.learner_id,
        "detected_patterns": [
            {
                "pattern_type": p.pattern_type,
                "confidence": p.confidence,
                "evidence": p.evidence,
                "affected_skills": p.affected_skills,
                "severity": p.severity,
                "data_points": p.data_points,
            }
            for p in result.detected_patterns
        ],
        "iep_gaps": result.iep_gaps,
        "new_suggestions": [
            {
                "name": s.name,
                "category": s.category,
                "rationale": s.rationale,
                "triggered_by": s.triggered_by,
                "priority": s.priority,
                "implementation_notes": s.implementation_notes,
            }
            for s in result.new_suggestions
        ],
        "existing_to_review": result.existing_to_review,
        "summary": result.summary,
    }


@app.post("/api/v1/specialized-support/evaluate-effectiveness")
async def evaluate_effectiveness_endpoint(request: Request) -> Dict[str, Any]:
    """Evaluate accommodation effectiveness."""
    if not accommodation_recommender:
        raise HTTPException(status_code=503, detail=ERROR_SERVICE_NOT_INITIALIZED)

    body = await request.json()
    result = accommodation_recommender.evaluate_accommodation_effectiveness(
        learner_id=body.get("learner_id", "unknown"),
        accommodation=body.get("accommodation", ""),
        performance_before=body.get("performance_before", []),
        performance_after=body.get("performance_after", []),
        time_period=body.get("time_period", "current"),
    )

    return {
        "learner_id": result.learner_id,
        "accommodation_name": result.accommodation_name,
        "time_period": result.time_period,
        "rating": result.rating,
        "metrics": {
            "pre_mean": result.metrics.pre_mean,
            "post_mean": result.metrics.post_mean,
            "pre_std": result.metrics.pre_std,
            "post_std": result.metrics.post_std,
            "effect_size": result.metrics.effect_size,
            "improvement_pct": result.metrics.improvement_pct,
            "data_points_pre": result.metrics.data_points_pre,
            "data_points_post": result.metrics.data_points_post,
        },
        "action": result.action,
        "rationale": result.rationale,
        "modification_suggestions": result.modification_suggestions,
        "summary": result.summary,
    }


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
