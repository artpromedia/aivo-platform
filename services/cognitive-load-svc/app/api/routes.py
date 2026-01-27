"""
API Routes for Cognitive Load Service.

Provides REST endpoints for:
- Cognitive load estimation
- Content complexity analysis
- Working memory modeling
- Overload prediction
- Scaffolding generation
- Pacing optimization
"""

import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query

from app.core.config import Settings, get_settings
from app.models import (
    IntrinsicLoadAnalyzer,
    ExtraneousLoadDetector,
    WorkingMemoryModel,
    OverloadPredictor,
    ScaffoldingGenerator,
    LoadEstimator,
    UIElement as ModelUIElement,
    Domain as ModelDomain,
    ScaffoldType as ModelScaffoldType,
)
from app.schemas.requests import (
    ContentAnalysisRequest,
    ContentComplexityResponse,
    ExtraneousLoadRequest,
    ExtraneousLoadResponse,
    WorkingMemoryRequest,
    WorkingMemoryResponse,
    MemoryChunk,
    InteractionDataRequest,
    CognitiveLoadResponse,
    LoadLevel,
    OverloadPredictionRequest,
    OverloadPredictionResponse,
    LoadTrendRequest,
    LoadTrendResponse,
    ScaffoldingRequest,
    ScaffoldingResponse,
    ScaffoldRecommendation,
    ScaffoldType,
    PacingRequest,
    PacingResponse,
    AdaptationRequest,
    AdaptationResponse,
    AdaptationType,
    AdaptationAction,
    SessionStartRequest,
    SessionUpdateRequest,
    SessionSummaryResponse,
    Domain,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["cognitive-load"])

# Global component instances
_intrinsic_analyzer: Optional[IntrinsicLoadAnalyzer] = None
_extraneous_detector: Optional[ExtraneousLoadDetector] = None
_working_memory: Optional[WorkingMemoryModel] = None
_overload_predictor: Optional[OverloadPredictor] = None
_scaffolding_generator: Optional[ScaffoldingGenerator] = None
_load_estimator: Optional[LoadEstimator] = None

# Session storage
_sessions: Dict[str, Dict[str, Any]] = {}


def init_components(settings: Settings) -> None:
    """Initialize all cognitive load components."""
    global _intrinsic_analyzer, _extraneous_detector, _working_memory
    global _overload_predictor, _scaffolding_generator, _load_estimator

    logger.info("Initializing cognitive load components...")

    _intrinsic_analyzer = IntrinsicLoadAnalyzer()
    _extraneous_detector = ExtraneousLoadDetector()
    _working_memory = WorkingMemoryModel()
    _overload_predictor = OverloadPredictor()
    _scaffolding_generator = ScaffoldingGenerator()
    _load_estimator = LoadEstimator()

    logger.info("All cognitive load components initialized")


def get_components() -> Dict[str, Any]:
    """Get status of all components for health checks."""
    return {
        "intrinsic_analyzer": _intrinsic_analyzer is not None,
        "extraneous_detector": _extraneous_detector is not None,
        "working_memory": _working_memory is not None,
        "overload_predictor": _overload_predictor is not None,
        "scaffolding_generator": _scaffolding_generator is not None,
        "load_estimator": _load_estimator is not None,
    }


# =============================================================================
# Cognitive Load Estimation Endpoints
# =============================================================================


@router.post("/load/estimate", response_model=CognitiveLoadResponse)
async def estimate_load(request: InteractionDataRequest) -> CognitiveLoadResponse:
    """
    Estimate current cognitive load from interaction data.

    Combines multiple behavioral signals to estimate:
    - Intrinsic load (task complexity)
    - Extraneous load (design overhead)
    - Germane load (productive learning)
    """
    if _load_estimator is None:
        raise HTTPException(status_code=503, detail="Load estimator not initialized")

    start_time = time.time()

    # Convert interaction signals
    interaction_signals = None
    if request.interaction_signals:
        interaction_signals = [
            {
                "signal_type": s.signal_type,
                "value": s.value,
                "timestamp": s.timestamp.isoformat(),
                "context": s.context,
            }
            for s in request.interaction_signals
        ]

    estimate = _load_estimator.estimate(
        response_times=request.response_times,
        error_rates=request.error_rates,
        help_requests=request.help_requests,
        learner_id=request.learner_id,
        session_id=request.session_id,
        backtracking_count=request.backtracking_count,
        time_on_task=request.time_on_task,
        content_complexity=request.content_complexity,
        interaction_signals=interaction_signals,
    )

    processing_time = int((time.time() - start_time) * 1000)

    return CognitiveLoadResponse(
        intrinsic_load=estimate.intrinsic_load,
        extraneous_load=estimate.extraneous_load,
        germane_load=estimate.germane_load,
        total_load=estimate.total_load,
        load_level=LoadLevel(estimate.load_level.value),
        confidence=estimate.confidence,
        contributing_factors=estimate.contributing_factors,
        trend=estimate.trend,
        recommendation=estimate.recommendation,
        processing_time_ms=processing_time,
    )


@router.get("/load/history/{learner_id}")
async def get_load_history(
    learner_id: str,
    session_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Get cognitive load history for a learner."""
    if _load_estimator is None:
        raise HTTPException(status_code=503, detail="Load estimator not initialized")

    return _load_estimator.get_load_history(learner_id, session_id)


# =============================================================================
# Content Complexity Analysis Endpoints
# =============================================================================


@router.post("/content/complexity", response_model=ContentComplexityResponse)
async def analyze_complexity(request: ContentAnalysisRequest) -> ContentComplexityResponse:
    """
    Analyze cognitive complexity of content.

    Evaluates:
    - Element interactivity
    - Vocabulary difficulty
    - Syntactic complexity
    - Conceptual density
    """
    if _intrinsic_analyzer is None:
        raise HTTPException(status_code=503, detail="Intrinsic analyzer not initialized")

    domain = request.domain.value if request.domain else None

    metrics = _intrinsic_analyzer.analyze(
        content=request.content,
        content_type=request.content_type.value,
        domain=domain,
        grade_level=request.grade_level,
        prior_knowledge=request.prior_knowledge_assumed,
    )

    return ContentComplexityResponse(
        element_interactivity=metrics.element_interactivity,
        vocabulary_load=metrics.vocabulary_load,
        syntactic_complexity=metrics.syntactic_complexity,
        conceptual_density=metrics.conceptual_density,
        overall_complexity=metrics.overall_complexity,
        intrinsic_load_estimate=metrics.intrinsic_load_estimate,
        complexity_factors=metrics.complexity_factors,
        simplification_suggestions=metrics.simplification_suggestions,
        grade_level_match=metrics.grade_level_match,
        processing_time_ms=metrics.processing_time_ms,
    )


@router.post("/content/element-interactivity")
async def analyze_element_interactivity(
    content: str,
    domain: Optional[Domain] = None,
    identify_elements: bool = True,
) -> Dict[str, Any]:
    """Analyze element interactivity in content."""
    if _intrinsic_analyzer is None:
        raise HTTPException(status_code=503, detail="Intrinsic analyzer not initialized")

    domain_str = domain.value if domain else None

    analysis = _intrinsic_analyzer.analyze_element_interactivity(
        content=content,
        domain=domain_str,
        identify_elements=identify_elements,
    )

    return {
        "interactivity_score": analysis.interactivity_score,
        "element_count": len(analysis.elements),
        "interacting_elements": analysis.interaction_count,
        "elements": analysis.elements if identify_elements else None,
        "interaction_patterns": analysis.interaction_patterns,
        "cognitive_operations_required": analysis.cognitive_operations,
    }


# =============================================================================
# Extraneous Load Detection Endpoints
# =============================================================================


@router.post("/extraneous/detect", response_model=ExtraneousLoadResponse)
async def detect_extraneous_load(request: ExtraneousLoadRequest) -> ExtraneousLoadResponse:
    """
    Detect extraneous cognitive load from UI/presentation.

    Identifies:
    - Visual clutter
    - Split attention issues
    - Redundancy problems
    - Navigation complexity
    """
    if _extraneous_detector is None:
        raise HTTPException(status_code=503, detail="Extraneous detector not initialized")

    # Convert UI elements
    ui_elements = [
        ModelUIElement(
            element_type=e.element_type,
            position=e.position,
            size=e.size,
            is_distracting=e.is_distracting,
            relevance_score=e.relevance_score,
        )
        for e in request.visible_elements
    ]

    analysis = _extraneous_detector.analyze(
        learner_id=request.learner_id,
        session_id=request.session_id,
        ui_description=request.ui_description,
        visible_elements=ui_elements,
        navigation_depth=request.navigation_depth,
        distractors_present=request.distractors_present,
        split_attention_sources=request.split_attention_sources,
    )

    issues = [
        {
            "type": issue.issue_type.value,
            "severity": issue.severity.value,
            "description": issue.description,
            "affected_elements": issue.affected_elements,
            "load_contribution": issue.load_contribution,
            "recommendation": issue.recommendation,
        }
        for issue in analysis.issues
    ]

    return ExtraneousLoadResponse(
        extraneous_load=analysis.total_extraneous_load,
        load_level=LoadLevel(analysis.load_level),
        issues_detected=issues,
        visual_clutter_score=analysis.visual_clutter_score,
        split_attention_score=analysis.split_attention_score,
        redundancy_score=analysis.redundancy_score,
        navigation_complexity=analysis.navigation_complexity,
        recommendations=analysis.recommendations,
        processing_time_ms=analysis.processing_time_ms,
    )


# =============================================================================
# Working Memory Endpoints
# =============================================================================


@router.post("/memory/estimate", response_model=WorkingMemoryResponse)
async def estimate_working_memory(request: WorkingMemoryRequest) -> WorkingMemoryResponse:
    """
    Estimate working memory load and capacity usage.

    Models:
    - Current memory load
    - Capacity utilization
    - Active chunks in memory
    - Decay predictions
    """
    if _working_memory is None:
        raise HTTPException(status_code=503, detail="Working memory model not initialized")

    state = _working_memory.estimate_load(
        learner_id=request.learner_id,
        session_id=request.session_id,
        current_content=request.current_content,
        recent_content=request.recent_content,
        time_on_task_seconds=request.time_on_task_seconds,
        response_latencies=request.response_latencies,
        error_count=request.error_count,
        learner_wm_capacity=request.learner_wm_capacity,
    )

    active_chunks = [
        MemoryChunk(
            chunk_id=c.chunk_id,
            content=c.content,
            complexity=c.complexity,
            age_seconds=c.age_seconds,
            activation_level=c.activation_level,
            related_chunks=c.related_chunks,
        )
        for c in state.active_chunks
    ]

    return WorkingMemoryResponse(
        estimated_load=state.estimated_load,
        capacity_used=state.capacity_used_ratio,
        estimated_capacity=state.estimated_capacity,
        chunks_in_memory=state.slots_used,
        active_chunks=active_chunks,
        decay_prediction=state.decay_predictions,
        overload_risk=state.overload_risk,
        recommendations=state.recommendations,
        processing_time_ms=state.processing_time_ms,
    )


@router.get("/memory/snapshot/{learner_id}")
async def get_memory_snapshot(learner_id: str) -> Dict[str, Any]:
    """Get current working memory snapshot for a learner."""
    if _working_memory is None:
        raise HTTPException(status_code=503, detail="Working memory model not initialized")

    return _working_memory.get_memory_snapshot(learner_id)


# =============================================================================
# Overload Prediction Endpoints
# =============================================================================


@router.post("/overload/predict", response_model=OverloadPredictionResponse)
async def predict_overload(request: OverloadPredictionRequest) -> OverloadPredictionResponse:
    """
    Predict cognitive overload before it occurs.

    Analyzes:
    - Current load trajectory
    - Upcoming content complexity
    - Fatigue indicators
    - Historical patterns
    """
    if _overload_predictor is None:
        raise HTTPException(status_code=503, detail="Overload predictor not initialized")

    prediction = _overload_predictor.predict(
        learner_id=request.learner_id,
        session_id=request.session_id,
        current_load=request.current_load,
        load_history=request.load_history,
        upcoming_content_complexity=request.upcoming_content_complexity,
        time_remaining_seconds=request.time_remaining_seconds,
        fatigue_indicators=request.fatigue_indicators,
    )

    return OverloadPredictionResponse(
        overload_probability=prediction.overload_probability,
        predicted_time_to_overload_seconds=prediction.predicted_time_to_overload,
        warning_level=prediction.warning_level.value,
        risk_factors=prediction.risk_factors,
        preventive_actions=prediction.preventive_actions,
        confidence=prediction.confidence,
        processing_time_ms=prediction.processing_time_ms,
    )


@router.post("/overload/trend", response_model=LoadTrendResponse)
async def analyze_load_trend(request: LoadTrendRequest) -> LoadTrendResponse:
    """Analyze cognitive load trend over time."""
    if _overload_predictor is None:
        raise HTTPException(status_code=503, detail="Overload predictor not initialized")

    analysis = _overload_predictor.analyze_trend(
        learner_id=request.learner_id,
        session_id=request.session_id,
        window_size_seconds=request.window_size_seconds,
    )

    return LoadTrendResponse(
        trend_direction=analysis.trend_direction,
        trend_slope=analysis.trend_slope,
        volatility=analysis.volatility,
        stability_score=analysis.stability_score,
        predicted_load_5min=analysis.predicted_load_5min,
        predicted_load_15min=analysis.predicted_load_15min,
        anomalies_detected=analysis.anomalies,
    )


@router.get("/overload/warnings/{learner_id}")
async def get_early_warnings(
    learner_id: str,
    current_load: float = Query(..., ge=0.0, le=1.0),
) -> Dict[str, Any]:
    """Get early warning signals for a learner."""
    if _overload_predictor is None:
        raise HTTPException(status_code=503, detail="Overload predictor not initialized")

    # Get load history from estimator
    history = []
    if _load_estimator:
        history_data = _load_estimator.get_load_history(learner_id)
        history = [h["total_load"] for h in history_data.get("load_history", [])]

    signals = _overload_predictor.get_early_warning_signals(
        current_load=current_load,
        load_history=history,
    )

    return {
        "learner_id": learner_id,
        "current_load": current_load,
        "warning_signals": signals,
        "signal_count": len(signals),
    }


# =============================================================================
# Scaffolding Endpoints
# =============================================================================


@router.post("/scaffolding/generate", response_model=ScaffoldingResponse)
async def generate_scaffolding(request: ScaffoldingRequest) -> ScaffoldingResponse:
    """
    Generate adaptive scaffolding recommendations.

    Provides:
    - Hints and worked examples
    - Content decomposition
    - Visual aids and analogies
    - Fading recommendations
    """
    if _scaffolding_generator is None:
        raise HTTPException(status_code=503, detail="Scaffolding generator not initialized")

    # Convert domain
    domain = ModelDomain(request.domain.value) if request.domain else ModelDomain.GENERAL

    # Convert previous scaffolds
    previous = [ModelScaffoldType(s.value) for s in request.previous_scaffolds_used]

    plan = _scaffolding_generator.generate(
        learner_id=request.learner_id,
        content_id=request.content_id,
        current_content=request.current_content,
        current_load=request.current_load,
        learner_knowledge_state=request.learner_knowledge_state,
        previous_scaffolds_used=previous,
        learning_objective=request.learning_objective,
        domain=domain,
        max_scaffolds=request.max_scaffolds,
    )

    scaffolds = [
        ScaffoldRecommendation(
            scaffold_type=ScaffoldType(s.scaffold_type.value),
            priority=s.priority,
            content=s.content,
            rationale=s.rationale,
            expected_load_reduction=s.expected_load_reduction,
            target_concept=s.target_concept,
        )
        for s in plan.scaffolds
    ]

    return ScaffoldingResponse(
        scaffolds=scaffolds,
        total_expected_load_reduction=plan.total_expected_load_reduction,
        scaffolding_level=plan.scaffolding_level,
        fade_recommendation=plan.fade_recommendation,
        processing_time_ms=plan.processing_time_ms,
    )


@router.post("/scaffolding/hint")
async def generate_hint(
    content: str,
    domain: Domain = Domain.GENERAL,
    hint_level: int = Query(default=1, ge=1, le=5),
    previous_hints: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Generate a progressive hint for content."""
    if _scaffolding_generator is None:
        raise HTTPException(status_code=503, detail="Scaffolding generator not initialized")

    model_domain = ModelDomain(domain.value)

    hint = _scaffolding_generator.generate_hint(
        content=content,
        domain=model_domain,
        hint_level=hint_level,
        previous_hints=previous_hints,
    )

    return {
        "hint": hint,
        "hint_level": hint_level,
        "domain": domain.value,
    }


# =============================================================================
# Pacing Endpoints
# =============================================================================


@router.post("/pacing/recommend", response_model=PacingResponse)
async def recommend_pacing(request: PacingRequest) -> PacingResponse:
    """
    Recommend optimal content pacing.

    Considers:
    - Current cognitive load
    - Content complexity
    - Learner fatigue
    - Session time remaining
    """
    start_time = time.time()

    # Simple pacing logic (could be enhanced with a dedicated optimizer)
    current_load = request.current_load
    fatigue = request.fatigue_level

    # Determine pace
    if current_load > 0.8 or fatigue > 0.7:
        pace = "slow"
        break_suggested = True
        break_duration = 300  # 5 minutes
    elif current_load > 0.6 or fatigue > 0.5:
        pace = "normal"
        break_suggested = fatigue > 0.5
        break_duration = 180 if break_suggested else None
    else:
        pace = "fast" if request.learner_pace_preference == "fast" else "normal"
        break_suggested = False
        break_duration = None

    # Order content by complexity (intersperse easy and hard)
    content_items = sorted(request.upcoming_content, key=lambda x: x.complexity)

    # Interleave: easy, hard, easy, hard...
    easy = [c for c in content_items if c.complexity < 0.5]
    hard = [c for c in content_items if c.complexity >= 0.5]

    content_order = []
    while easy or hard:
        if easy:
            content_order.append(easy.pop(0).content_id)
        if hard:
            content_order.append(hard.pop(0).content_id)

    # Calculate time per item
    time_per_item = {}
    base_time_factor = 1.5 if pace == "slow" else (0.8 if pace == "fast" else 1.0)
    for item in request.upcoming_content:
        time_per_item[item.content_id] = int(item.estimated_duration_seconds * base_time_factor)

    # Items to skip if overloaded
    items_to_skip = []
    if current_load > 0.85:
        # Skip high complexity items
        high_complexity = [c for c in request.upcoming_content if c.complexity > 0.8]
        items_to_skip = [c.content_id for c in high_complexity[:2]]

    processing_time = int((time.time() - start_time) * 1000)

    return PacingResponse(
        recommended_pace=pace,
        break_suggested=break_suggested,
        break_duration_seconds=break_duration,
        content_order=content_order,
        time_per_item=time_per_item,
        items_to_skip=items_to_skip,
        rationale=f"Based on current load ({current_load:.2f}) and fatigue ({fatigue:.2f})",
        processing_time_ms=processing_time,
    )


# =============================================================================
# Adaptation Endpoints
# =============================================================================


@router.post("/adaptation/recommend", response_model=AdaptationResponse)
async def recommend_adaptations(request: AdaptationRequest) -> AdaptationResponse:
    """
    Generate adaptation recommendations based on cognitive load.

    Recommends actions like:
    - Reducing complexity
    - Adding scaffolding
    - Suggesting breaks
    - Changing modality
    """
    start_time = time.time()

    load = request.current_load
    adaptations: List[AdaptationAction] = []

    # Determine urgency
    if load.total_load > 0.9:
        urgency = "critical"
    elif load.total_load > 0.8:
        urgency = "high"
    elif load.total_load > 0.7:
        urgency = "medium"
    else:
        urgency = "low"

    # Generate adaptations based on load components
    priority = 1

    if load.total_load > 0.85:
        adaptations.append(AdaptationAction(
            action_type=AdaptationType.SUGGEST_BREAK,
            priority=priority,
            description="Suggest a short break to recover cognitive resources",
            parameters={"duration_seconds": 180},
            expected_effect="Reduce total load by 15-20%",
        ))
        priority += 1

    if load.extraneous_load > 0.5:
        adaptations.append(AdaptationAction(
            action_type=AdaptationType.REDUCE_COMPLEXITY,
            priority=priority,
            description="Simplify the interface to reduce extraneous load",
            parameters={"target_reduction": 0.2},
            expected_effect="Reduce extraneous load",
        ))
        priority += 1

    if load.intrinsic_load > 0.7:
        adaptations.append(AdaptationAction(
            action_type=AdaptationType.ADD_SCAFFOLDING,
            priority=priority,
            description="Provide scaffolding to support complex content",
            parameters={"scaffold_type": "worked_example"},
            expected_effect="Make intrinsic load more manageable",
        ))
        priority += 1

    if load.total_load > 0.75:
        adaptations.append(AdaptationAction(
            action_type=AdaptationType.SLOW_PACE,
            priority=priority,
            description="Slow down content delivery pace",
            parameters={"pace_factor": 0.7},
            expected_effect="Allow more processing time",
        ))
        priority += 1

    # Calculate expected load after adaptations
    total_reduction = sum(0.1 for _ in adaptations)  # Simplified
    expected_load_after = max(0.3, load.total_load - total_reduction)

    processing_time = int((time.time() - start_time) * 1000)

    return AdaptationResponse(
        adaptations=adaptations,
        urgency=urgency,
        expected_load_after=expected_load_after,
        fallback_plan="If adaptations fail, end session and reschedule",
        processing_time_ms=processing_time,
    )


# =============================================================================
# Session Management Endpoints
# =============================================================================


@router.post("/session/start")
async def start_session(request: SessionStartRequest) -> Dict[str, Any]:
    """Start a cognitive load tracking session."""
    session_id = str(uuid4())

    _sessions[session_id] = {
        "session_id": session_id,
        "learner_id": request.learner_id,
        "session_type": request.session_type,
        "started_at": datetime.utcnow().isoformat(),
        "expected_duration_minutes": request.expected_duration_minutes,
        "content_domain": request.content_domain.value if request.content_domain else None,
        "load_samples": [],
        "scaffolds_provided": 0,
        "adaptations_made": 0,
        "overload_events": 0,
    }

    return {
        "session_id": session_id,
        "learner_id": request.learner_id,
        "started_at": _sessions[session_id]["started_at"],
        "status": "active",
    }


@router.post("/session/{session_id}/update")
async def update_session(session_id: str, request: SessionUpdateRequest) -> Dict[str, Any]:
    """Update session with new interaction data."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    session = _sessions[session_id]

    # Process interaction data if provided
    if request.interaction_data and _load_estimator:
        estimate = _load_estimator.estimate(
            response_times=request.interaction_data.response_times,
            error_rates=request.interaction_data.error_rates,
            help_requests=request.interaction_data.help_requests,
            learner_id=request.learner_id,
            session_id=session_id,
        )

        session["load_samples"].append({
            "timestamp": request.timestamp.isoformat(),
            "total_load": estimate.total_load,
            "intrinsic": estimate.intrinsic_load,
            "extraneous": estimate.extraneous_load,
            "germane": estimate.germane_load,
        })

        if estimate.load_level.value == "overload":
            session["overload_events"] += 1

    return {
        "session_id": session_id,
        "samples_collected": len(session["load_samples"]),
        "status": "updated",
    }


@router.get("/session/{session_id}/summary", response_model=SessionSummaryResponse)
async def get_session_summary(session_id: str) -> SessionSummaryResponse:
    """Get summary of a cognitive load tracking session."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    session = _sessions[session_id]
    samples = session["load_samples"]

    if not samples:
        return SessionSummaryResponse(
            session_id=session_id,
            learner_id=session["learner_id"],
            duration_seconds=0,
            average_load=0.0,
            peak_load=0.0,
            time_in_optimal_zone_seconds=0,
            time_in_overload_seconds=0,
            overload_events=0,
            scaffolds_provided=session["scaffolds_provided"],
            adaptations_made=session["adaptations_made"],
            load_over_time=[],
            key_insights=["No data collected in this session"],
            recommendations_for_next_session=["Ensure interaction data is being tracked"],
        )

    loads = [s["total_load"] for s in samples]
    avg_load = sum(loads) / len(loads)
    peak_load = max(loads)

    # Estimate time in zones (assuming ~1 sample per interaction)
    optimal_samples = sum(1 for l in loads if 0.3 <= l <= 0.7)
    overload_samples = sum(1 for l in loads if l > 0.85)

    # Generate insights
    insights = []
    if avg_load > 0.8:
        insights.append("Average load was high - consider simpler content")
    elif avg_load < 0.3:
        insights.append("Load was consistently low - learner may need more challenge")
    else:
        insights.append("Load was well-managed overall")

    if session["overload_events"] > 3:
        insights.append(f"Multiple overload events ({session['overload_events']}) detected")

    # Generate recommendations
    recommendations = []
    if avg_load > 0.7:
        recommendations.append("Start next session with lighter content")
        recommendations.append("Include more breaks in future sessions")
    if peak_load > 0.9:
        recommendations.append("Monitor for overload more closely")

    return SessionSummaryResponse(
        session_id=session_id,
        learner_id=session["learner_id"],
        duration_seconds=len(samples) * 30,  # Estimate
        average_load=avg_load,
        peak_load=peak_load,
        time_in_optimal_zone_seconds=optimal_samples * 30,
        time_in_overload_seconds=overload_samples * 30,
        overload_events=session["overload_events"],
        scaffolds_provided=session["scaffolds_provided"],
        adaptations_made=session["adaptations_made"],
        load_over_time=samples,
        key_insights=insights,
        recommendations_for_next_session=recommendations,
    )


@router.delete("/session/{session_id}")
async def end_session(session_id: str) -> Dict[str, Any]:
    """End and clean up a session."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    session = _sessions.pop(session_id)

    return {
        "session_id": session_id,
        "status": "ended",
        "samples_collected": len(session["load_samples"]),
    }
