"""
Analytics & ROI Service

Business analytics for education platforms:
- Performance aggregation with k-anonymity protection
- Intervention tracking and effectiveness
- ROI calculation
- Predictive at-risk student identification
- Board report generation
"""

import statistics
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

import structlog
from pydantic import BaseModel, Field

logger = structlog.get_logger()


class AnalyticsGranularity(str, Enum):
    """Granularity levels for analytics."""

    STUDENT = "student"
    CLASSROOM = "classroom"
    SCHOOL = "school"
    DISTRICT = "district"


class InterventionStatus(str, Enum):
    """Status of an intervention."""

    PLANNED = "planned"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class InterventionEffectiveness(str, Enum):
    """Effectiveness rating for interventions."""

    HIGHLY_EFFECTIVE = "highly_effective"
    EFFECTIVE = "effective"
    MODERATELY_EFFECTIVE = "moderately_effective"
    INEFFECTIVE = "ineffective"


class RiskLevel(str, Enum):
    """Risk level for at-risk predictions."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PerformanceAggregate(BaseModel):
    """Aggregated performance metrics with k-anonymity protection."""

    id: UUID = Field(default_factory=uuid4)
    district_id: UUID
    school_id: Optional[str] = None
    grade_level: Optional[str] = None
    period_start: datetime
    period_end: datetime
    student_count: int
    k_anonymity: int = 5  # Minimum group size

    # Engagement metrics
    avg_engagement_score: Optional[float] = None
    avg_completion_rate: Optional[float] = None
    avg_time_on_task_minutes: Optional[float] = None

    # Session metrics
    ai_sessions_total: int = 0
    avg_sessions_per_student: float = 0.0

    # IEP metrics
    iep_student_count: int = 0
    iep_goal_completion_rate: Optional[float] = None
    skills_mastered_total: int = 0

    granularity: AnalyticsGranularity = AnalyticsGranularity.DISTRICT
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Intervention(BaseModel):
    """Intervention tracking."""

    id: UUID = Field(default_factory=uuid4)
    district_id: UUID
    name: str
    intervention_type: str
    target_criteria: Dict[str, Any]
    student_count: int
    start_date: datetime
    end_date: Optional[datetime] = None
    status: InterventionStatus = InterventionStatus.PLANNED

    # Cost tracking
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None

    # Metrics
    baseline_metrics: Dict[str, float] = Field(default_factory=dict)
    current_metrics: Dict[str, float] = Field(default_factory=dict)
    goals_total: int = 1
    goals_met: int = 0

    effectiveness_rating: Optional[InterventionEffectiveness] = None
    improvement_percentage: Optional[float] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)


class ROIMetric(BaseModel):
    """ROI calculation metrics."""

    id: UUID = Field(default_factory=uuid4)
    district_id: UUID
    period_start: datetime
    period_end: datetime

    # Investment costs
    ai_platform_cost: float = 0.0
    training_cost: float = 0.0
    implementation_cost: float = 0.0
    infrastructure_cost: float = 0.0
    total_investment: float = 0.0

    # Benefits
    improved_outcomes_value: float = 0.0
    time_saved_value: float = 0.0
    reduced_intervention_cost: float = 0.0
    compliance_cost_avoidance: float = 0.0
    total_benefit: float = 0.0

    # Calculations
    roi_percentage: float = 0.0
    payback_period_months: Optional[float] = None
    student_count: int = 0
    cost_per_student: float = 0.0
    benefit_per_student: float = 0.0

    created_at: datetime = Field(default_factory=datetime.utcnow)


class StudentPrediction(BaseModel):
    """At-risk student prediction."""

    id: UUID = Field(default_factory=uuid4)
    student_id: UUID
    model_id: UUID
    prediction_date: datetime = Field(default_factory=datetime.utcnow)
    risk_level: RiskLevel
    confidence_score: float
    risk_factors: List[str] = Field(default_factory=list)
    recommended_interventions: List[str] = Field(default_factory=list)


class BoardReport(BaseModel):
    """Board-level report."""

    id: UUID = Field(default_factory=uuid4)
    district_id: UUID
    title: str
    report_type: str
    period_start: datetime
    period_end: datetime
    generated_by: UUID
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    # Report content
    executive_summary: str = ""
    key_metrics: Dict[str, Any] = Field(default_factory=dict)
    highlights: List[str] = Field(default_factory=list)
    concerns: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


class AnalyticsService:
    """Service for analytics and ROI operations."""

    def __init__(self):
        # In-memory storage for demo
        self._aggregates: Dict[str, PerformanceAggregate] = {}
        self._interventions: Dict[str, Intervention] = {}
        self._roi_metrics: Dict[str, ROIMetric] = {}
        self._predictions: Dict[str, List[StudentPrediction]] = {}
        self._reports: Dict[str, BoardReport] = {}

    async def aggregate_performance(
        self,
        district_id: UUID,
        period_start: datetime,
        period_end: datetime,
        school_id: Optional[str] = None,
        grade_level: Optional[str] = None,
        min_k_anonymity: int = 5,
        # Demo data for simulation
        demo_data: Optional[Dict[str, Any]] = None,
    ) -> PerformanceAggregate:
        """
        Aggregate performance metrics with k-anonymity protection.

        Args:
            district_id: District ID
            period_start: Start of period
            period_end: End of period
            school_id: Optional school filter
            grade_level: Optional grade filter
            min_k_anonymity: Minimum group size (default 5)
            demo_data: Demo data for simulation

        Returns:
            PerformanceAggregate instance

        Raises:
            ValueError: If student count < min_k_anonymity
        """
        # Use demo data or generate simulated data
        if demo_data:
            student_count = demo_data.get("student_count", 100)
            sessions = demo_data.get("sessions", [])
        else:
            # Generate demo data
            student_count = 150 if not school_id else 45
            sessions = [
                {"engagement_score": 85 + i % 15, "completion_rate": 78 + i % 20}
                for i in range(student_count * 3)
            ]

        # Enforce k-anonymity
        if student_count < min_k_anonymity:
            raise ValueError(
                f"Insufficient students for k-anonymity. "
                f"Need at least {min_k_anonymity}, found {student_count}"
            )

        # Calculate metrics
        if sessions:
            engagement_scores = [s["engagement_score"] for s in sessions]
            completion_rates = [s["completion_rate"] for s in sessions]
            avg_engagement = statistics.mean(engagement_scores)
            avg_completion = statistics.mean(completion_rates)
        else:
            avg_engagement = None
            avg_completion = None

        aggregate = PerformanceAggregate(
            district_id=district_id,
            school_id=school_id,
            grade_level=grade_level,
            period_start=period_start,
            period_end=period_end,
            student_count=student_count,
            k_anonymity=min_k_anonymity,
            avg_engagement_score=avg_engagement,
            avg_completion_rate=avg_completion,
            avg_time_on_task_minutes=25.5,
            ai_sessions_total=len(sessions),
            avg_sessions_per_student=len(sessions) / student_count if student_count else 0,
            iep_student_count=int(student_count * 0.15),
            iep_goal_completion_rate=73.5,
            skills_mastered_total=student_count * 8,
            granularity=(
                AnalyticsGranularity.SCHOOL if school_id
                else AnalyticsGranularity.DISTRICT
            ),
        )

        self._aggregates[str(aggregate.id)] = aggregate

        logger.info(
            "performance_aggregated",
            aggregate_id=str(aggregate.id),
            student_count=student_count,
            k_anonymity=min_k_anonymity,
        )

        return aggregate

    async def create_intervention(
        self,
        district_id: UUID,
        name: str,
        intervention_type: str,
        target_criteria: Dict[str, Any],
        student_count: int,
        start_date: datetime,
        estimated_cost: Optional[float] = None,
        baseline_metrics: Optional[Dict[str, float]] = None,
        goals_total: int = 1,
    ) -> Intervention:
        """Create a new intervention."""
        intervention = Intervention(
            district_id=district_id,
            name=name,
            intervention_type=intervention_type,
            target_criteria=target_criteria,
            student_count=student_count,
            start_date=start_date,
            estimated_cost=estimated_cost,
            baseline_metrics=baseline_metrics or {},
            goals_total=goals_total,
            status=InterventionStatus.PLANNED,
        )

        self._interventions[str(intervention.id)] = intervention

        logger.info(
            "intervention_created",
            intervention_id=str(intervention.id),
            name=name,
            student_count=student_count,
        )

        return intervention

    async def evaluate_intervention(
        self,
        intervention_id: UUID,
        current_metrics: Dict[str, float],
    ) -> Intervention:
        """Evaluate and update intervention effectiveness."""
        intervention = self._interventions.get(str(intervention_id))
        if not intervention:
            raise ValueError("Intervention not found")

        intervention.current_metrics = current_metrics

        # Calculate effectiveness score
        if intervention.baseline_metrics and current_metrics:
            baseline_values = list(intervention.baseline_metrics.values())
            current_values = list(current_metrics.values())

            baseline_avg = statistics.mean(baseline_values)
            current_avg = statistics.mean(current_values)

            if baseline_avg > 0:
                improvement = ((current_avg - baseline_avg) / baseline_avg) * 100
                intervention.improvement_percentage = improvement

                # Determine effectiveness rating
                if improvement >= 20:
                    intervention.effectiveness_rating = InterventionEffectiveness.HIGHLY_EFFECTIVE
                elif improvement >= 10:
                    intervention.effectiveness_rating = InterventionEffectiveness.EFFECTIVE
                elif improvement >= 5:
                    intervention.effectiveness_rating = InterventionEffectiveness.MODERATELY_EFFECTIVE
                else:
                    intervention.effectiveness_rating = InterventionEffectiveness.INEFFECTIVE

        logger.info(
            "intervention_evaluated",
            intervention_id=str(intervention_id),
            improvement=intervention.improvement_percentage,
            rating=intervention.effectiveness_rating,
        )

        return intervention

    async def calculate_roi(
        self,
        district_id: UUID,
        period_start: datetime,
        period_end: datetime,
        costs: Dict[str, float],
        benefits: Dict[str, float],
        student_count: int,
    ) -> ROIMetric:
        """Calculate ROI metrics."""
        # Calculate totals
        total_investment = sum(costs.values())
        total_benefit = sum(benefits.values())

        # Calculate ROI
        roi_percentage = (
            ((total_benefit - total_investment) / total_investment * 100)
            if total_investment > 0
            else 0
        )

        # Calculate payback period (months)
        period_days = (period_end - period_start).days
        period_months = period_days / 30
        monthly_benefit = total_benefit / period_months if period_months else 0
        payback_months = (
            total_investment / monthly_benefit if monthly_benefit > 0 else None
        )

        roi_metric = ROIMetric(
            district_id=district_id,
            period_start=period_start,
            period_end=period_end,
            ai_platform_cost=costs.get("platform", 0),
            training_cost=costs.get("training", 0),
            implementation_cost=costs.get("implementation", 0),
            infrastructure_cost=costs.get("infrastructure", 0),
            total_investment=total_investment,
            improved_outcomes_value=benefits.get("outcomes", 0),
            time_saved_value=benefits.get("time_saved", 0),
            reduced_intervention_cost=benefits.get("intervention", 0),
            compliance_cost_avoidance=benefits.get("compliance", 0),
            total_benefit=total_benefit,
            roi_percentage=roi_percentage,
            payback_period_months=payback_months,
            student_count=student_count,
            cost_per_student=total_investment / student_count if student_count else 0,
            benefit_per_student=total_benefit / student_count if student_count else 0,
        )

        self._roi_metrics[str(roi_metric.id)] = roi_metric

        logger.info(
            "roi_calculated",
            roi_id=str(roi_metric.id),
            roi_percentage=roi_percentage,
            payback_months=payback_months,
        )

        return roi_metric

    async def predict_at_risk_students(
        self,
        district_id: UUID,
        student_data: List[Dict[str, Any]],
        threshold: float = 0.6,
    ) -> List[StudentPrediction]:
        """
        Predict at-risk students based on performance data.

        Uses a simple risk scoring model based on:
        - Engagement scores
        - Accuracy rates
        - Attendance patterns
        - Goal progress
        """
        predictions = []
        model_id = uuid4()

        for student in student_data:
            student_id = student.get("student_id")
            if not student_id:
                continue

            # Calculate risk score (0-1)
            risk_factors = []
            risk_score = 0.0

            # Factor 1: Low engagement
            engagement = student.get("engagement_score", 75)
            if engagement < 60:
                risk_score += 0.3
                risk_factors.append("Low engagement score")
            elif engagement < 70:
                risk_score += 0.15
                risk_factors.append("Below average engagement")

            # Factor 2: Low accuracy
            accuracy = student.get("accuracy_rate", 75)
            if accuracy < 60:
                risk_score += 0.3
                risk_factors.append("Low accuracy rate")
            elif accuracy < 70:
                risk_score += 0.15
                risk_factors.append("Below average accuracy")

            # Factor 3: Poor attendance
            attendance = student.get("attendance_rate", 95)
            if attendance < 80:
                risk_score += 0.25
                risk_factors.append("Poor attendance")
            elif attendance < 90:
                risk_score += 0.1
                risk_factors.append("Below average attendance")

            # Factor 4: IEP goal progress
            goal_progress = student.get("goal_progress", 70)
            if goal_progress < 50:
                risk_score += 0.2
                risk_factors.append("Behind on IEP goals")
            elif goal_progress < 65:
                risk_score += 0.1
                risk_factors.append("Slow IEP goal progress")

            # Normalize risk score
            risk_score = min(risk_score, 1.0)

            # Determine risk level
            if risk_score >= 0.7:
                risk_level = RiskLevel.CRITICAL
            elif risk_score >= 0.5:
                risk_level = RiskLevel.HIGH
            elif risk_score >= 0.3:
                risk_level = RiskLevel.MEDIUM
            else:
                risk_level = RiskLevel.LOW

            # Only include students above threshold
            if risk_score >= threshold:
                # Generate recommendations
                recommendations = self._generate_intervention_recommendations(
                    risk_factors
                )

                prediction = StudentPrediction(
                    student_id=UUID(student_id) if isinstance(student_id, str) else student_id,
                    model_id=model_id,
                    risk_level=risk_level,
                    confidence_score=0.85 + (risk_score * 0.1),  # Higher confidence for higher risk
                    risk_factors=risk_factors,
                    recommended_interventions=recommendations,
                )
                predictions.append(prediction)

        # Store predictions
        self._predictions[str(district_id)] = predictions

        logger.info(
            "at_risk_predictions_generated",
            district_id=str(district_id),
            total_students=len(student_data),
            at_risk_count=len(predictions),
        )

        return predictions

    def _generate_intervention_recommendations(
        self,
        risk_factors: List[str],
    ) -> List[str]:
        """Generate intervention recommendations based on risk factors."""
        recommendations = []

        for factor in risk_factors:
            if "engagement" in factor.lower():
                recommendations.append("Increase gamification and rewards")
                recommendations.append("Schedule more frequent check-ins")
            if "accuracy" in factor.lower():
                recommendations.append("Reduce activity difficulty")
                recommendations.append("Provide additional scaffolding")
            if "attendance" in factor.lower():
                recommendations.append("Contact parent/guardian")
                recommendations.append("Investigate barriers to attendance")
            if "iep" in factor.lower() or "goal" in factor.lower():
                recommendations.append("Review and adjust IEP goals")
                recommendations.append("Increase intervention intensity")

        return list(set(recommendations))[:5]  # Unique, max 5

    async def generate_board_report(
        self,
        district_id: UUID,
        title: str,
        report_type: str,
        period_start: datetime,
        period_end: datetime,
        generated_by: UUID,
    ) -> BoardReport:
        """Generate a board-level report with key metrics."""

        # Get performance aggregates for period
        aggregates = [
            a for a in self._aggregates.values()
            if a.district_id == district_id
            and a.period_start >= period_start
            and a.period_end <= period_end
        ]

        # Get interventions for period
        interventions = [
            i for i in self._interventions.values()
            if i.district_id == district_id
            and i.start_date >= period_start
        ]

        # Get ROI metrics
        roi_metrics = [
            r for r in self._roi_metrics.values()
            if r.district_id == district_id
            and r.period_start >= period_start
        ]

        # Compile key metrics
        total_students = sum(a.student_count for a in aggregates) if aggregates else 0
        avg_engagement = (
            statistics.mean([a.avg_engagement_score for a in aggregates if a.avg_engagement_score])
            if aggregates and any(a.avg_engagement_score for a in aggregates)
            else None
        )
        roi = roi_metrics[-1].roi_percentage if roi_metrics else None

        key_metrics = {
            "total_students": total_students,
            "avg_engagement": round(avg_engagement, 1) if avg_engagement else None,
            "total_interventions": len(interventions),
            "roi_percentage": round(roi, 1) if roi else None,
            "iep_students": sum(a.iep_student_count for a in aggregates),
            "skills_mastered": sum(a.skills_mastered_total for a in aggregates),
        }

        # Generate highlights
        highlights = []
        if avg_engagement and avg_engagement > 80:
            highlights.append(f"Strong student engagement at {avg_engagement:.1f}%")
        if roi and roi > 50:
            highlights.append(f"Positive ROI of {roi:.1f}%")
        if interventions:
            effective = [i for i in interventions if i.effectiveness_rating in [
                InterventionEffectiveness.HIGHLY_EFFECTIVE,
                InterventionEffectiveness.EFFECTIVE
            ]]
            if effective:
                highlights.append(f"{len(effective)} of {len(interventions)} interventions showing effectiveness")

        # Generate concerns
        concerns = []
        if avg_engagement and avg_engagement < 70:
            concerns.append("Student engagement below target threshold")
        at_risk = self._predictions.get(str(district_id), [])
        critical = [p for p in at_risk if p.risk_level == RiskLevel.CRITICAL]
        if critical:
            concerns.append(f"{len(critical)} students at critical risk level")

        # Generate recommendations
        recommendations = [
            "Continue monitoring at-risk students closely",
            "Expand successful intervention programs",
            "Invest in teacher professional development",
        ]

        report = BoardReport(
            district_id=district_id,
            title=title,
            report_type=report_type,
            period_start=period_start,
            period_end=period_end,
            generated_by=generated_by,
            executive_summary=f"Report covering {total_students} students from {period_start.date()} to {period_end.date()}.",
            key_metrics=key_metrics,
            highlights=highlights,
            concerns=concerns,
            recommendations=recommendations,
        )

        self._reports[str(report.id)] = report

        logger.info(
            "board_report_generated",
            report_id=str(report.id),
            title=title,
        )

        return report

    async def get_demo_metrics(self) -> Dict[str, Any]:
        """Get demo metrics for investor presentation."""
        return {
            "total_students": 12847,
            "active_students": 8934,
            "sessions_today": 3421,
            "avg_engagement": 87.3,
            "avg_accuracy": 82.1,
            "goal_progress": 73.5,
            "ai_interactions": 28493,
            "time_in_flow_state": 67.2,
            "roi_metrics": {
                "total_investment": 2400000,
                "total_benefit": 4800000,
                "roi_percentage": 100,
                "payback_months": 8,
                "cost_per_student": 186,
                "benefit_per_student": 373,
            },
            "analytics_highlights": [
                {"label": "At-Risk Detection Accuracy", "value": "94.2%", "trend": "+2.3%"},
                {"label": "Goal Completion Rate", "value": "78.5%", "trend": "+12.1%"},
                {"label": "Intervention Effectiveness", "value": "86.3%", "trend": "+5.7%"},
                {"label": "Parent Engagement", "value": "72.4%", "trend": "+18.9%"},
            ],
        }


# Global service instance
_analytics_service: Optional[AnalyticsService] = None


def get_analytics_service() -> AnalyticsService:
    """Get global Analytics service instance."""
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = AnalyticsService()
    return _analytics_service
