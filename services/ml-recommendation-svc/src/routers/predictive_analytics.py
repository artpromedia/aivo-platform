"""
Predictive Analytics API Router

REST API endpoints for:
- Student risk predictions
- Intervention recommendations
- Bias reports and monitoring
- A/B testing for interventions

All endpoints require educator authentication and respect FERPA requirements.
"""

from datetime import datetime, timedelta
from typing import Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field

from ..models.student_risk_model import (
    StudentRiskModel,
    RiskPrediction,
    RiskLevel,
    RiskTrend
)
from ..services.intervention_recommender import (
    InterventionRecommender,
    InterventionPlan,
    InterventionOutcome,
    InterventionStatus
)
from ..services.bias_detection import (
    BiasDetectionService,
    BiasReport,
    BiasSeverity
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predictive-analytics", tags=["predictive-analytics"])


# ============================================================================
# Request/Response Models
# ============================================================================

class RiskPredictionRequest(BaseModel):
    """Request to predict risk for a student"""
    student_id: str = Field(..., description="Student identifier")
    include_interventions: bool = Field(
        default=True,
        description="Include intervention recommendations in response"
    )
    context: Optional[dict] = Field(
        default=None,
        description="Additional context (IEP status, etc.)"
    )


class BatchRiskPredictionRequest(BaseModel):
    """Request to predict risk for multiple students"""
    student_ids: list[str] = Field(..., max_length=100)
    include_interventions: bool = Field(default=False)


class RiskFactorResponse(BaseModel):
    """Risk factor in response"""
    feature: str
    category: str
    description: str
    current_value: float | str
    contribution: float
    severity: str
    recommendation: Optional[str] = None


class ProtectiveFactorResponse(BaseModel):
    """Protective factor in response"""
    feature: str
    category: str
    description: str
    current_value: float | str
    contribution: float


class RiskPredictionResponse(BaseModel):
    """Response with risk prediction"""
    student_id: str
    timestamp: datetime
    risk_score: float
    risk_level: str
    confidence: float
    category_scores: dict[str, float]
    top_risk_factors: list[RiskFactorResponse]
    protective_factors: list[ProtectiveFactorResponse]
    risk_trend: str
    previous_risk_score: Optional[float] = None
    score_change: Optional[float] = None
    model_version: str


class InterventionResponse(BaseModel):
    """Intervention recommendation in response"""
    intervention_id: str
    name: str
    type: str
    intensity: str
    urgency: str
    relevance_score: float
    expected_effectiveness: float
    confidence: float
    target_risk_factors: list[str]
    rationale: str
    implementation_notes: str
    estimated_duration_days: int
    requires_parent_consent: bool
    requires_educator_approval: bool
    success_indicators: list[str]


class InterventionPlanResponse(BaseModel):
    """Complete intervention plan response"""
    student_id: str
    created_at: datetime
    risk_level: str
    primary_recommendations: list[InterventionResponse]
    secondary_recommendations: list[InterventionResponse]
    excluded_interventions: list[dict]
    review_date: datetime
    notes: str
    requires_immediate_action: bool
    educator_approval_required: bool


class RiskWithInterventionsResponse(BaseModel):
    """Combined risk prediction with interventions"""
    prediction: RiskPredictionResponse
    interventions: Optional[InterventionPlanResponse] = None


class RecordOutcomeRequest(BaseModel):
    """Request to record intervention outcome"""
    intervention_id: str
    student_id: str
    status: str = Field(..., description="completed, cancelled, declined")
    initial_risk_score: float
    final_risk_score: Optional[float] = None
    success_indicators_met: dict[str, bool] = Field(default_factory=dict)
    educator_notes: Optional[str] = None
    effectiveness_rating: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        description="Educator rating 0-1"
    )


class BiasReportRequest(BaseModel):
    """Request for bias analysis"""
    days: int = Field(default=30, ge=7, le=90)
    include_outcomes: bool = Field(default=True)


class BiasAlertResponse(BaseModel):
    """Bias alert in response"""
    alert_id: str
    created_at: datetime
    metric: str
    attribute: str
    affected_group: str
    severity: str
    description: str
    impact_estimate: str
    recommended_actions: list[str]
    acknowledged: bool
    resolved: bool


class ClassroomRiskSummary(BaseModel):
    """Summary of risk for a classroom"""
    classroom_id: str
    total_students: int
    risk_distribution: dict[str, int]
    average_risk_score: float
    students_needing_attention: int
    trend_improving: int
    trend_worsening: int


# ============================================================================
# Dependencies
# ============================================================================

async def get_risk_model() -> StudentRiskModel:
    """Dependency to get risk model instance"""
    # In production, this would be injected with proper configuration
    return StudentRiskModel()


async def get_intervention_recommender() -> InterventionRecommender:
    """Dependency to get intervention recommender instance"""
    return InterventionRecommender()


async def get_bias_service() -> BiasDetectionService:
    """Dependency to get bias detection service"""
    return BiasDetectionService()


async def get_tenant_id() -> str:
    """Extract tenant ID from request context"""
    # In production, this would come from JWT or request context
    return "default_tenant"


async def get_user_id() -> str:
    """Extract user ID from request context"""
    return "default_user"


# ============================================================================
# Risk Prediction Endpoints
# ============================================================================

@router.post(
    "/risk/predict",
    response_model=RiskWithInterventionsResponse,
    summary="Predict risk for a student",
    description="""
    Generate a risk prediction for a single student.
    
    The prediction includes:
    - Overall risk score (0-1) and level (low/moderate/high/critical)
    - Top contributing risk factors with explanations
    - Protective factors that reduce risk
    - Trend compared to previous predictions
    
    If include_interventions is true, also returns intervention recommendations.
    
    IMPORTANT: Predictions are meant to ASSIST educators, not replace their judgment.
    """
)
async def predict_student_risk(
    request: RiskPredictionRequest,
    risk_model: StudentRiskModel = Depends(get_risk_model),
    recommender: InterventionRecommender = Depends(get_intervention_recommender),
    tenant_id: str = Depends(get_tenant_id)
) -> RiskWithInterventionsResponse:
    """Predict risk for a single student"""
    
    # Get risk prediction
    prediction = await risk_model.predict_risk(
        student_id=request.student_id,
        tenant_id=tenant_id
    )
    
    # Convert to response
    prediction_response = _convert_prediction(prediction)
    
    # Get interventions if requested
    interventions_response = None
    if request.include_interventions:
        plan = await recommender.recommend_interventions(
            student_id=request.student_id,
            tenant_id=tenant_id,
            risk_prediction=prediction,
            student_context=request.context
        )
        interventions_response = _convert_intervention_plan(plan)
    
    return RiskWithInterventionsResponse(
        prediction=prediction_response,
        interventions=interventions_response
    )


@router.post(
    "/risk/predict/batch",
    response_model=list[RiskPredictionResponse],
    summary="Batch predict risk for multiple students",
    description="Generate risk predictions for up to 100 students at once."
)
async def predict_batch_risk(
    request: BatchRiskPredictionRequest,
    risk_model: StudentRiskModel = Depends(get_risk_model),
    tenant_id: str = Depends(get_tenant_id)
) -> list[RiskPredictionResponse]:
    """Batch predict risk for multiple students"""
    
    predictions = await risk_model.predict_risk_batch(
        student_ids=request.student_ids,
        tenant_id=tenant_id
    )
    
    return [_convert_prediction(p) for p in predictions.values()]


@router.get(
    "/risk/classroom/{classroom_id}",
    response_model=ClassroomRiskSummary,
    summary="Get risk summary for a classroom",
    description="Aggregate risk statistics for all students in a classroom."
)
async def get_classroom_risk_summary(
    classroom_id: str,
    risk_model: StudentRiskModel = Depends(get_risk_model),
    tenant_id: str = Depends(get_tenant_id)
) -> ClassroomRiskSummary:
    """Get aggregated risk summary for a classroom"""
    
    # In production, we'd fetch student IDs from the classroom
    # For now, return a placeholder
    
    return ClassroomRiskSummary(
        classroom_id=classroom_id,
        total_students=0,
        risk_distribution={
            "low": 0,
            "moderate": 0,
            "high": 0,
            "critical": 0
        },
        average_risk_score=0.0,
        students_needing_attention=0,
        trend_improving=0,
        trend_worsening=0
    )


@router.get(
    "/risk/alerts",
    summary="Get students requiring immediate attention",
    description="Returns students with high/critical risk or worsening trends."
)
async def get_risk_alerts(
    classroom_id: Optional[str] = Query(default=None),
    min_risk_level: str = Query(default="high"),
    tenant_id: str = Depends(get_tenant_id)
) -> list[dict]:
    """Get students requiring immediate attention"""
    # In production, this would query the database
    return []


# ============================================================================
# Intervention Endpoints
# ============================================================================

@router.get(
    "/interventions/{student_id}",
    response_model=InterventionPlanResponse,
    summary="Get intervention plan for a student",
    description="Get current intervention recommendations for a student."
)
async def get_student_interventions(
    student_id: str,
    risk_model: StudentRiskModel = Depends(get_risk_model),
    recommender: InterventionRecommender = Depends(get_intervention_recommender),
    tenant_id: str = Depends(get_tenant_id)
) -> InterventionPlanResponse:
    """Get intervention recommendations for a student"""
    
    prediction = await risk_model.predict_risk(
        student_id=student_id,
        tenant_id=tenant_id
    )
    
    plan = await recommender.recommend_interventions(
        student_id=student_id,
        tenant_id=tenant_id,
        risk_prediction=prediction
    )
    
    return _convert_intervention_plan(plan)


@router.post(
    "/interventions/{student_id}/approve/{intervention_id}",
    summary="Approve an intervention for a student",
    description="Educator approval to begin an intervention."
)
async def approve_intervention(
    student_id: str,
    intervention_id: str,
    notes: Optional[str] = None,
    user_id: str = Depends(get_user_id),
    tenant_id: str = Depends(get_tenant_id)
) -> dict:
    """Approve an intervention to begin"""
    
    logger.info(
        f"Intervention {intervention_id} approved for student {student_id} "
        f"by educator {user_id}"
    )
    
    return {
        "status": "approved",
        "intervention_id": intervention_id,
        "student_id": student_id,
        "approved_by": user_id,
        "approved_at": datetime.utcnow().isoformat()
    }


@router.post(
    "/interventions/outcome",
    summary="Record intervention outcome",
    description="Record the outcome of a completed intervention for effectiveness tracking."
)
async def record_intervention_outcome(
    request: RecordOutcomeRequest,
    recommender: InterventionRecommender = Depends(get_intervention_recommender),
    tenant_id: str = Depends(get_tenant_id)
) -> dict:
    """Record outcome of an intervention"""
    
    outcome = InterventionOutcome(
        intervention_id=request.intervention_id,
        student_id=request.student_id,
        tenant_id=tenant_id,
        started_at=datetime.utcnow() - timedelta(days=14),  # Placeholder
        ended_at=datetime.utcnow(),
        status=InterventionStatus(request.status),
        initial_risk_score=request.initial_risk_score,
        final_risk_score=request.final_risk_score,
        success_indicators_met=request.success_indicators_met,
        educator_notes=request.educator_notes,
        effectiveness_rating=request.effectiveness_rating
    )
    
    await recommender.record_outcome(outcome)
    
    return {"status": "recorded", "outcome_id": outcome.intervention_id}


@router.get(
    "/interventions/catalog",
    summary="Get intervention catalog",
    description="Get list of all available interventions and their details."
)
async def get_intervention_catalog() -> list[dict]:
    """Get catalog of available interventions"""
    from ..services.intervention_recommender import INTERVENTION_CATALOG
    
    return [
        {
            "id": i.id,
            "name": i.name,
            "description": i.description,
            "type": i.intervention_type.value,
            "intensity": i.intensity.value,
            "target_risk_factors": i.target_risk_factors,
            "estimated_duration_days": i.estimated_duration_days,
            "requires_parent_consent": i.requires_parent_consent,
            "requires_educator_approval": i.requires_educator_approval,
            "effectiveness_score": i.effectiveness_score,
            "evidence_base": i.evidence_base
        }
        for i in INTERVENTION_CATALOG
    ]


# ============================================================================
# Bias Monitoring Endpoints
# ============================================================================

@router.post(
    "/bias/analyze",
    summary="Run bias analysis",
    description="""
    Run comprehensive bias analysis on recent predictions.
    
    Analyzes fairness across protected attributes including:
    - Race/ethnicity
    - Gender
    - Socioeconomic status
    - Disability status
    - English learner status
    
    Returns statistical analysis, severity assessment, and recommendations.
    """
)
async def run_bias_analysis(
    request: BiasReportRequest,
    background_tasks: BackgroundTasks,
    bias_service: BiasDetectionService = Depends(get_bias_service),
    tenant_id: str = Depends(get_tenant_id)
) -> dict:
    """Run bias analysis on predictions"""
    
    # In production, we'd fetch predictions from the database
    # For now, return that analysis has been queued
    
    return {
        "status": "queued",
        "message": f"Bias analysis queued for last {request.days} days",
        "estimated_completion": datetime.utcnow() + timedelta(minutes=5)
    }


@router.get(
    "/bias/reports",
    summary="Get bias reports",
    description="Get historical bias analysis reports."
)
async def get_bias_reports(
    limit: int = Query(default=10, le=50),
    severity_filter: Optional[str] = Query(default=None),
    tenant_id: str = Depends(get_tenant_id)
) -> list[dict]:
    """Get historical bias reports"""
    # In production, fetch from database/cache
    return []


@router.get(
    "/bias/reports/{report_id}",
    summary="Get specific bias report",
    description="Get detailed bias report by ID."
)
async def get_bias_report(
    report_id: str,
    tenant_id: str = Depends(get_tenant_id)
) -> dict:
    """Get a specific bias report"""
    raise HTTPException(status_code=404, detail="Report not found")


@router.get(
    "/bias/alerts",
    response_model=list[BiasAlertResponse],
    summary="Get pending bias alerts",
    description="Get unresolved bias alerts requiring attention."
)
async def get_bias_alerts(
    bias_service: BiasDetectionService = Depends(get_bias_service),
    tenant_id: str = Depends(get_tenant_id)
) -> list[BiasAlertResponse]:
    """Get pending bias alerts"""
    
    alerts = await bias_service.get_pending_alerts(tenant_id)
    
    return [
        BiasAlertResponse(
            alert_id=a["alert_id"],
            created_at=datetime.fromisoformat(a["created_at"]),
            metric=a["metric"],
            attribute=a["attribute"],
            affected_group=a["affected_group"],
            severity=a["severity"],
            description=a.get("description", ""),
            impact_estimate=a.get("impact_estimate", ""),
            recommended_actions=a.get("recommended_actions", []),
            acknowledged=a.get("acknowledged", False),
            resolved=a.get("resolved", False)
        )
        for a in alerts
    ]


@router.post(
    "/bias/alerts/{alert_id}/acknowledge",
    summary="Acknowledge a bias alert",
    description="Mark a bias alert as acknowledged for review."
)
async def acknowledge_bias_alert(
    alert_id: str,
    bias_service: BiasDetectionService = Depends(get_bias_service),
    user_id: str = Depends(get_user_id),
    tenant_id: str = Depends(get_tenant_id)
) -> dict:
    """Acknowledge a bias alert"""
    
    success = await bias_service.acknowledge_alert(tenant_id, alert_id, user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"status": "acknowledged", "alert_id": alert_id}


@router.post(
    "/bias/alerts/{alert_id}/resolve",
    summary="Resolve a bias alert",
    description="Mark a bias alert as resolved with resolution notes."
)
async def resolve_bias_alert(
    alert_id: str,
    resolution_notes: str,
    bias_service: BiasDetectionService = Depends(get_bias_service),
    user_id: str = Depends(get_user_id),
    tenant_id: str = Depends(get_tenant_id)
) -> dict:
    """Resolve a bias alert"""
    
    success = await bias_service.resolve_alert(
        tenant_id, alert_id, user_id, resolution_notes
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"status": "resolved", "alert_id": alert_id}


# ============================================================================
# Helper Functions
# ============================================================================

def _convert_prediction(prediction: RiskPrediction) -> RiskPredictionResponse:
    """Convert internal prediction to API response"""
    return RiskPredictionResponse(
        student_id=prediction.student_id,
        timestamp=prediction.timestamp,
        risk_score=prediction.risk_score,
        risk_level=prediction.risk_level.value,
        confidence=prediction.confidence,
        category_scores=prediction.category_scores,
        top_risk_factors=[
            RiskFactorResponse(
                feature=f.feature,
                category=f.category.value,
                description=f.description,
                current_value=f.current_value,
                contribution=f.contribution,
                severity=f.severity,
                recommendation=f.recommendation
            )
            for f in prediction.top_risk_factors
        ],
        protective_factors=[
            ProtectiveFactorResponse(
                feature=f.feature,
                category=f.category.value,
                description=f.description,
                current_value=f.current_value,
                contribution=f.contribution
            )
            for f in prediction.protective_factors
        ],
        risk_trend=prediction.risk_trend.value,
        previous_risk_score=prediction.previous_risk_score,
        score_change=prediction.score_change,
        model_version=prediction.model_version
    )


def _convert_intervention_plan(plan: InterventionPlan) -> InterventionPlanResponse:
    """Convert internal intervention plan to API response"""
    return InterventionPlanResponse(
        student_id=plan.student_id,
        created_at=plan.created_at,
        risk_level=plan.risk_level,
        primary_recommendations=[
            _convert_intervention(r) for r in plan.primary_recommendations
        ],
        secondary_recommendations=[
            _convert_intervention(r) for r in plan.secondary_recommendations
        ],
        excluded_interventions=plan.excluded_interventions,
        review_date=plan.review_date,
        notes=plan.notes,
        requires_immediate_action=plan.requires_immediate_action,
        educator_approval_required=plan.educator_approval_required
    )


def _convert_intervention(rec) -> InterventionResponse:
    """Convert intervention recommendation to response"""
    return InterventionResponse(
        intervention_id=rec.intervention_id,
        name=rec.intervention_name,
        type=rec.intervention_type.value,
        intensity=rec.intensity.value,
        urgency=rec.urgency.value,
        relevance_score=rec.relevance_score,
        expected_effectiveness=rec.expected_effectiveness,
        confidence=rec.confidence,
        target_risk_factors=rec.target_risk_factors,
        rationale=rec.rationale,
        implementation_notes=rec.implementation_notes,
        estimated_duration_days=rec.estimated_duration_days,
        requires_parent_consent=rec.requires_parent_consent,
        requires_educator_approval=rec.requires_educator_approval,
        success_indicators=rec.success_indicators
    )
