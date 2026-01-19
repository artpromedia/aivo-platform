"""
Analytics & ROI API Router

Endpoints for analytics and ROI tracking:
- Aggregate performance (k-anonymity)
- Create/evaluate interventions
- Calculate ROI
- Predict at-risk students
- Generate board reports
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.services.analytics_roi import get_analytics_service

router = APIRouter()


class AggregatePerformanceRequest(BaseModel):
    """Request to aggregate performance metrics."""

    district_id: UUID
    period_start: datetime
    period_end: datetime
    school_id: Optional[str] = None
    grade_level: Optional[str] = None
    min_k_anonymity: int = 5


class CreateInterventionRequest(BaseModel):
    """Request to create an intervention."""

    district_id: UUID
    name: str
    intervention_type: str
    target_criteria: Dict[str, Any]
    student_count: int
    start_date: datetime
    estimated_cost: Optional[float] = None
    baseline_metrics: Optional[Dict[str, float]] = None
    goals_total: int = 1


class EvaluateInterventionRequest(BaseModel):
    """Request to evaluate an intervention."""

    intervention_id: UUID
    current_metrics: Dict[str, float]


class CalculateROIRequest(BaseModel):
    """Request to calculate ROI."""

    district_id: UUID
    period_start: datetime
    period_end: datetime
    costs: Dict[str, float]
    benefits: Dict[str, float]
    student_count: int


class PredictAtRiskRequest(BaseModel):
    """Request to predict at-risk students."""

    district_id: UUID
    student_data: List[Dict[str, Any]]
    threshold: float = 0.6


class GenerateBoardReportRequest(BaseModel):
    """Request to generate a board report."""

    district_id: UUID
    title: str
    report_type: str
    period_start: datetime
    period_end: datetime
    generated_by: UUID


@router.post("/aggregate")
async def aggregate_performance(request: AggregatePerformanceRequest):
    """Aggregate performance metrics with k-anonymity protection."""
    service = get_analytics_service()

    try:
        aggregate = await service.aggregate_performance(
            district_id=request.district_id,
            period_start=request.period_start,
            period_end=request.period_end,
            school_id=request.school_id,
            grade_level=request.grade_level,
            min_k_anonymity=request.min_k_anonymity,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "aggregate_id": str(aggregate.id),
        "student_count": aggregate.student_count,
        "k_anonymity": aggregate.k_anonymity,
        "avg_engagement_score": aggregate.avg_engagement_score,
        "avg_completion_rate": aggregate.avg_completion_rate,
        "ai_sessions_total": aggregate.ai_sessions_total,
        "iep_student_count": aggregate.iep_student_count,
        "granularity": aggregate.granularity.value,
    }


@router.post("/interventions")
async def create_intervention(request: CreateInterventionRequest):
    """Create a new intervention."""
    service = get_analytics_service()

    intervention = await service.create_intervention(
        district_id=request.district_id,
        name=request.name,
        intervention_type=request.intervention_type,
        target_criteria=request.target_criteria,
        student_count=request.student_count,
        start_date=request.start_date,
        estimated_cost=request.estimated_cost,
        baseline_metrics=request.baseline_metrics,
        goals_total=request.goals_total,
    )

    return {
        "intervention_id": str(intervention.id),
        "name": intervention.name,
        "status": intervention.status.value,
        "student_count": intervention.student_count,
        "message": "Intervention created successfully",
    }


@router.post("/interventions/evaluate")
async def evaluate_intervention(request: EvaluateInterventionRequest):
    """Evaluate intervention effectiveness."""
    service = get_analytics_service()

    try:
        intervention = await service.evaluate_intervention(
            intervention_id=request.intervention_id,
            current_metrics=request.current_metrics,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {
        "intervention_id": str(intervention.id),
        "effectiveness_rating": (
            intervention.effectiveness_rating.value
            if intervention.effectiveness_rating
            else None
        ),
        "improvement_percentage": intervention.improvement_percentage,
        "message": "Intervention evaluated successfully",
    }


@router.post("/roi")
async def calculate_roi(request: CalculateROIRequest):
    """Calculate ROI metrics."""
    service = get_analytics_service()

    roi_metric = await service.calculate_roi(
        district_id=request.district_id,
        period_start=request.period_start,
        period_end=request.period_end,
        costs=request.costs,
        benefits=request.benefits,
        student_count=request.student_count,
    )

    return {
        "roi_id": str(roi_metric.id),
        "total_investment": roi_metric.total_investment,
        "total_benefit": roi_metric.total_benefit,
        "roi_percentage": round(roi_metric.roi_percentage, 1),
        "payback_period_months": (
            round(roi_metric.payback_period_months, 1)
            if roi_metric.payback_period_months
            else None
        ),
        "cost_per_student": round(roi_metric.cost_per_student, 2),
        "benefit_per_student": round(roi_metric.benefit_per_student, 2),
    }


@router.post("/predict-at-risk")
async def predict_at_risk(request: PredictAtRiskRequest):
    """Predict at-risk students."""
    service = get_analytics_service()

    predictions = await service.predict_at_risk_students(
        district_id=request.district_id,
        student_data=request.student_data,
        threshold=request.threshold,
    )

    return {
        "total_analyzed": len(request.student_data),
        "at_risk_count": len(predictions),
        "predictions": [
            {
                "student_id": str(p.student_id),
                "risk_level": p.risk_level.value,
                "confidence_score": round(p.confidence_score, 2),
                "risk_factors": p.risk_factors,
                "recommended_interventions": p.recommended_interventions,
            }
            for p in predictions
        ],
    }


@router.post("/board-reports")
async def generate_board_report(request: GenerateBoardReportRequest):
    """Generate a board-level report."""
    service = get_analytics_service()

    report = await service.generate_board_report(
        district_id=request.district_id,
        title=request.title,
        report_type=request.report_type,
        period_start=request.period_start,
        period_end=request.period_end,
        generated_by=request.generated_by,
    )

    return {
        "report_id": str(report.id),
        "title": report.title,
        "executive_summary": report.executive_summary,
        "key_metrics": report.key_metrics,
        "highlights": report.highlights,
        "concerns": report.concerns,
        "recommendations": report.recommendations,
    }


@router.get("/demo/metrics")
async def get_demo_metrics():
    """Get demo metrics for investor presentation."""
    service = get_analytics_service()

    return await service.get_demo_metrics()


@router.get("/demo/roi-showcase")
async def get_roi_showcase():
    """Get demo ROI data for showcase."""
    return {
        "roi_metrics": {
            "total_investment": 2400000,
            "total_benefit": 4800000,
            "roi_percentage": 100,
            "payback_months": 8,
            "cost_per_student": 186,
            "benefit_per_student": 373,
            "time_saved_hours": 12400,
            "intervention_reduction_percent": 34,
            "compliance_cost_avoidance": 450000,
        },
        "cost_breakdown": {
            "platform_licensing": 1200000,
            "training": 400000,
            "implementation": 500000,
            "infrastructure": 300000,
        },
        "benefit_breakdown": {
            "improved_outcomes": 2100000,
            "time_saved": 1400000,
            "intervention_reduction": 850000,
            "compliance_savings": 450000,
        },
        "analytics_highlights": [
            {"label": "At-Risk Detection Accuracy", "value": "94.2%", "trend": "+2.3%"},
            {"label": "Goal Completion Rate", "value": "78.5%", "trend": "+12.1%"},
            {"label": "Intervention Effectiveness", "value": "86.3%", "trend": "+5.7%"},
            {"label": "Parent Engagement", "value": "72.4%", "trend": "+18.9%"},
        ],
        "predictive_analytics": {
            "at_risk_detection_accuracy": 94.2,
            "early_detection_weeks": 2.3,
            "false_positive_rate": 3.8,
            "active_models": 12,
            "drift_detection": "Active",
            "last_recalibration": "3 days ago",
        },
    }


@router.get("/demo/compliance-showcase")
async def get_compliance_showcase():
    """Get demo compliance data for showcase."""
    return {
        "compliance_badges": [
            {"name": "FERPA", "status": "Compliant", "icon": "🔒"},
            {"name": "COPPA", "status": "Compliant", "icon": "👶"},
            {"name": "GDPR", "status": "Compliant", "icon": "🇪🇺"},
            {"name": "IDEA 2004", "status": "Compliant", "icon": "📋"},
            {"name": "Section 508", "status": "Compliant", "icon": "♿"},
            {"name": "WCAG 2.1 AA", "status": "Compliant", "icon": "🌐"},
        ],
        "security_features": [
            {"title": "K-Anonymity Protection", "desc": "Minimum group sizes for all analytics", "icon": "👥"},
            {"title": "Data Minimization", "desc": "FERPA-compliant data collection", "icon": "📊"},
            {"title": "Parental Consent", "desc": "COPPA-compliant consent workflows", "icon": "✅"},
            {"title": "Right to Deletion", "desc": "GDPR Article 17 soft delete", "icon": "🗑️"},
            {"title": "Audit Logging", "desc": "Complete activity tracking", "icon": "📝"},
            {"title": "Encryption at Rest", "desc": "AES-256 for all stored data", "icon": "🔒"},
            {"title": "MFA Authentication", "desc": "TOTP multi-factor auth", "icon": "🔑"},
            {"title": "Role-Based Access", "desc": "Granular RBAC permissions", "icon": "👤"},
            {"title": "Virus Scanning", "desc": "ClamAV integration for uploads", "icon": "🛡️"},
        ],
        "infrastructure": {
            "scalability": [
                "Kubernetes orchestration",
                "Auto-scaling policies",
                "Blue-green deployments",
                "Multi-region support",
            ],
            "observability": [
                "OpenTelemetry tracing",
                "Prometheus metrics",
                "Grafana dashboards",
                "Real-time alerting",
            ],
        },
    }
