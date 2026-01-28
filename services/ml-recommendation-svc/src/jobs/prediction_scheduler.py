"""
Scheduled Job for Daily Risk Predictions

Runs daily to:
1. Generate risk predictions for all active students
2. Update risk trends
3. Generate bias reports weekly
4. Trigger alerts for critical-risk students
5. Clean up old predictions

IMPORTANT: This job should be scheduled during off-peak hours
to minimize database load impact on user experience.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
import logging
import uuid

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, delete, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.student_risk_model import StudentRiskModel, RiskLevel
from ..services.bias_detection import BiasDetectionService
from ..services.intervention_recommender import InterventionRecommenderService
from ..services.notification_service import NotificationService
from ..config import settings
from ..database import get_session
from ..database.models import (
    Tenant,
    Student,
    RiskPrediction,
    StaffAssignment,
    User,
    JobExecution,
    MonitoringAlert as MonitoringAlertModel,
    RiskLevelEnum,
    RiskTrendEnum,
    JobStatusEnum,
    AlertSeverityEnum,
)

logger = logging.getLogger(__name__)


class PredictionScheduler:
    """
    Manages scheduled jobs for risk prediction system.
    
    Schedule:
    - Daily predictions: 3:00 AM tenant local time (off-peak)
    - Bias reports: Sundays at 4:00 AM
    - Prediction cleanup: Daily at 5:00 AM (keep 90 days)
    """
    
    def __init__(
        self,
        risk_model: StudentRiskModel,
        bias_service: BiasDetectionService,
        intervention_service: InterventionRecommenderService,
        notification_service: NotificationService,
        db_connection,
    ):
        self.risk_model = risk_model
        self.bias_service = bias_service
        self.intervention_service = intervention_service
        self.notification_service = notification_service
        self.db = db_connection
        self.scheduler = AsyncIOScheduler()
        
    def start(self):
        """Start the scheduler with all jobs"""
        # Daily predictions - 3 AM
        self.scheduler.add_job(
            self.run_daily_predictions,
            CronTrigger(hour=3, minute=0),
            id="daily_predictions",
            name="Generate daily risk predictions",
            replace_existing=True,
            misfire_grace_time=3600,  # 1 hour grace
        )
        
        # Weekly bias reports - Sunday 4 AM
        self.scheduler.add_job(
            self.run_weekly_bias_report,
            CronTrigger(day_of_week=6, hour=4, minute=0),  # Sunday
            id="weekly_bias_report",
            name="Generate weekly bias report",
            replace_existing=True,
            misfire_grace_time=7200,  # 2 hour grace
        )
        
        # Daily cleanup - 5 AM
        self.scheduler.add_job(
            self.run_prediction_cleanup,
            CronTrigger(hour=5, minute=0),
            id="prediction_cleanup",
            name="Clean up old predictions",
            replace_existing=True,
            misfire_grace_time=3600,
        )
        
        # Model monitoring - every 6 hours
        self.scheduler.add_job(
            self.run_model_monitoring,
            CronTrigger(hour="*/6", minute=30),
            id="model_monitoring",
            name="Check model health",
            replace_existing=True,
            misfire_grace_time=1800,  # 30 min grace
        )
        
        self.scheduler.start()
        logger.info("Prediction scheduler started")
    
    def stop(self):
        """Stop the scheduler"""
        self.scheduler.shutdown()
        logger.info("Prediction scheduler stopped")
    
    async def run_daily_predictions(self, tenant_id: Optional[str] = None):
        """
        Generate risk predictions for all active students.
        
        Can be run for a specific tenant or all tenants.
        Processes students in batches to manage memory and database load.
        """
        start_time = datetime.now(timezone.utc)
        logger.info(f"Starting daily predictions at {start_time}")
        
        try:
            # Get tenants to process
            if tenant_id:
                tenants = [{"id": tenant_id}]
            else:
                tenants = self._get_active_tenants()
            
            total_students = 0
            total_predictions = 0
            critical_alerts = 0
            
            for tenant in tenants:
                try:
                    results = await self._process_tenant_predictions(tenant["id"])
                    total_students += results["students"]
                    total_predictions += results["predictions"]
                    critical_alerts += results["critical_alerts"]
                except Exception as e:
                    logger.error(f"Error processing tenant {tenant['id']}: {e}")
                    continue

            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.info(
                f"Daily predictions complete. "
                f"Tenants: {len(tenants)}, "
                f"Students: {total_students}, "
                f"Predictions: {total_predictions}, "
                f"Critical alerts: {critical_alerts}, "
                f"Duration: {duration:.1f}s"
            )
            
            # Record job metrics
            self._record_job_metrics("daily_predictions", {
                "tenants": len(tenants),
                "students": total_students,
                "predictions": total_predictions,
                "critical_alerts": critical_alerts,
                "duration_seconds": duration,
                "success": True,
            })
            
        except Exception as e:
            logger.exception(f"Daily predictions job failed: {e}")
            self._record_job_metrics("daily_predictions", {
                "success": False,
                "error": str(e),
            })
            raise
    
    async def _process_tenant_predictions(self, tenant_id: str) -> dict:
        """Process predictions for a single tenant"""
        logger.info(f"Processing predictions for tenant {tenant_id}")
        
        # Get active students in batches
        batch_size = 100
        offset = 0
        total_students = 0
        total_predictions = 0
        critical_alerts = 0
        
        while True:
            students = self._get_active_students(tenant_id, batch_size, offset)

            if not students:
                break
            
            total_students += len(students)
            
            # Generate predictions for batch
            student_ids = [s["id"] for s in students]
            
            predictions = await self.risk_model.predict_batch(
                student_ids=student_ids,
                tenant_id=tenant_id,
            )
            
            # Store predictions
            for prediction in predictions:
                self._store_prediction(tenant_id, prediction)
                total_predictions += 1
                
                # Check for critical risk
                if prediction.risk_level == RiskLevel.CRITICAL:
                    critical_alerts += 1
                    await self._handle_critical_alert(tenant_id, prediction)
                
                # Auto-generate intervention plans for high/critical
                if prediction.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                    try:
                        await self.intervention_service.recommend_interventions(
                            student_id=prediction.student_id,
                            risk_prediction=prediction,
                        )
                    except Exception as e:
                        logger.warning(
                            f"Failed to generate intervention plan for {prediction.student_id}: {e}"
                        )
            
            offset += batch_size
            
            # Small delay between batches to reduce database pressure
            await asyncio.sleep(0.1)
        
        return {
            "students": total_students,
            "predictions": total_predictions,
            "critical_alerts": critical_alerts,
        }
    
    async def _handle_critical_alert(self, tenant_id: str, prediction):
        """Handle critical risk alert - notify relevant staff"""
        try:
            # Get student's teachers and counselors
            staff = self._get_student_staff(prediction.student_id)
            
            # Create alert notification
            alert_message = (
                f"CRITICAL RISK ALERT: Student requires immediate attention.\n\n"
                f"Risk Score: {prediction.risk_score:.0%}\n"
                f"Trend: {prediction.risk_trend.value}\n\n"
                f"Top Risk Factors:\n"
            )
            
            for factor in prediction.top_risk_factors[:3]:
                alert_message += f"• {factor.description}\n"
            
            alert_message += (
                "\n⚠️ Please review this student's profile and consider "
                "appropriate interventions. This is a prediction to assist "
                "your judgment, not a diagnosis."
            )
            
            # Send notifications
            await self.notification_service.send_risk_alert(
                tenant_id=tenant_id,
                student_id=prediction.student_id,
                recipients=staff,
                message=alert_message,
                risk_level="critical",
            )
            
            logger.info(
                f"Critical alert sent for student {prediction.student_id} "
                f"to {len(staff)} staff members"
            )
            
        except Exception as e:
            logger.error(f"Failed to send critical alert: {e}")
    
    async def run_weekly_bias_report(self):
        """Generate weekly bias analysis report"""
        start_time = datetime.now(timezone.utc)
        logger.info(f"Starting weekly bias report at {start_time}")
        
        try:
            tenants = self._get_active_tenants()
            
            for tenant in tenants:
                try:
                    # Generate bias report for last 7 days
                    end_date = datetime.now(timezone.utc)
                    start_date = end_date - timedelta(days=7)
                    
                    report = await self.bias_service.generate_report(
                        tenant_id=tenant["id"],
                        start_date=start_date,
                        end_date=end_date,
                    )
                    
                    # Check for critical bias alerts
                    critical_alerts = [
                        a for a in report.alerts
                        if a.severity in ["critical", "high"]
                    ]
                    
                    if critical_alerts:
                        await self._handle_bias_alert(tenant["id"], report, critical_alerts)
                    
                    logger.info(
                        f"Bias report for tenant {tenant['id']}: "
                        f"fairness_score={report.overall_fairness_score:.2f}, "
                        f"alerts={len(report.alerts)}"
                    )
                    
                except Exception as e:
                    logger.error(f"Error generating bias report for {tenant['id']}: {e}")

            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.info(f"Weekly bias report complete. Duration: {duration:.1f}s")
            
        except Exception as e:
            logger.exception(f"Weekly bias report job failed: {e}")
            raise
    
    async def _handle_bias_alert(self, tenant_id: str, report, alerts: list):
        """Handle critical bias alerts - notify ML team and admins"""
        # Get ML team and tenant admins
        recipients = self._get_ml_team_and_admins(tenant_id)
        
        message = (
            f"⚠️ BIAS ALERT: Fairness issues detected in risk predictions\n\n"
            f"Overall Fairness Score: {report.overall_fairness_score:.0%}\n"
            f"Period: {report.period_start.date()} to {report.period_end.date()}\n\n"
            f"Critical Alerts:\n"
        )
        
        for alert in alerts[:5]:
            message += f"• {alert.message}\n"
        
        message += (
            "\n📊 Please review the full bias report and take corrective action. "
            "Model predictions may need to be adjusted for affected populations."
        )
        
        await self.notification_service.send_system_alert(
            tenant_id=tenant_id,
            recipients=recipients,
            message=message,
            alert_type="bias_detection",
        )
    
    def run_prediction_cleanup(self, retention_days: int = 90):
        """Clean up old predictions to manage storage"""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
        
        try:
            # Delete old predictions (keep most recent per student)
            deleted_count = self._delete_old_predictions(cutoff_date)
            logger.info(f"Cleaned up {deleted_count} predictions older than {retention_days} days")
            
        except Exception as e:
            logger.exception(f"Prediction cleanup failed: {e}")
            raise
    
    def run_model_monitoring(self):
        """Monitor model health and performance"""
        logger.info("Running model health check")
        
        try:
            # Check prediction distribution (should be reasonable)
            stats = self._get_recent_prediction_stats()

            # Alert if unusual patterns detected
            issues = []
            
            # Check for extreme distributions
            if stats["critical_rate"] > 0.20:
                issues.append(
                    f"High critical rate: {stats['critical_rate']:.1%} "
                    "(expected < 20%)"
                )
            
            if stats["low_rate"] > 0.95:
                issues.append(
                    f"Very high low-risk rate: {stats['low_rate']:.1%} "
                    "(model may be under-predicting)"
                )
            
            # Check for prediction drift
            if stats.get("avg_score_change", 0) > 0.10:
                issues.append(
                    f"Significant prediction drift detected: "
                    f"{stats['avg_score_change']:.1%} average change"
                )
            
            if issues:
                logger.warning(f"Model monitoring issues: {issues}")
                self._send_monitoring_alert(issues)
            else:
                logger.info("Model health check passed")
            
        except Exception as e:
            logger.exception(f"Model monitoring failed: {e}")
    
    # Database helper methods - fully implemented with SQLAlchemy
    
    async def _get_active_tenants(self) -> List[Dict[str, Any]]:
        """
        Get list of active tenants from database.
        
        Returns:
            List of tenant dictionaries with id, name, timezone, settings
        """
        async with get_session() as session:
            result = await session.execute(
                select(Tenant)
                .where(Tenant.is_active == True)
                .order_by(Tenant.name)
            )
            tenants = result.scalars().all()
            
            return [
                {
                    "id": str(tenant.id),
                    "name": tenant.name,
                    "timezone": tenant.timezone,
                    "settings": tenant.settings or {},
                }
                for tenant in tenants
            ]
    
    async def _get_active_students(
        self,
        tenant_id: str,
        limit: int,
        offset: int,
    ) -> List[Dict[str, Any]]:
        """
        Get active students for a tenant with pagination.
        
        Args:
            tenant_id: Tenant UUID
            limit: Maximum number of students to return
            offset: Number of students to skip
        
        Returns:
            List of student dictionaries with id, name, grade_level, profile_data
        """
        async with get_session() as session:
            result = await session.execute(
                select(Student)
                .where(
                    and_(
                        Student.tenant_id == tenant_id,
                        Student.is_active == True
                    )
                )
                .order_by(Student.id)
                .limit(limit)
                .offset(offset)
            )
            students = result.scalars().all()
            
            return [
                {
                    "id": str(student.id),
                    "name": student.name,
                    "grade_level": student.grade_level,
                    "profile_data": student.profile_data or {},
                }
                for student in students
            ]
    
    async def _store_prediction(self, tenant_id: str, prediction) -> None:
        """
        Store a risk prediction to database.
        
        Args:
            tenant_id: Tenant UUID
            prediction: Risk prediction object from model
        """
        async with get_session() as session:
            # Convert risk level enum
            risk_level_map = {
                RiskLevel.LOW: RiskLevelEnum.LOW,
                RiskLevel.MODERATE: RiskLevelEnum.MODERATE,
                RiskLevel.HIGH: RiskLevelEnum.HIGH,
                RiskLevel.CRITICAL: RiskLevelEnum.CRITICAL,
            }
            
            # Convert trend if available
            trend_value = RiskTrendEnum.STABLE
            if hasattr(prediction, 'risk_trend') and prediction.risk_trend:
                trend_str = prediction.risk_trend.value.lower()
                if trend_str == 'improving':
                    trend_value = RiskTrendEnum.IMPROVING
                elif trend_str == 'declining':
                    trend_value = RiskTrendEnum.DECLINING
            
            # Build risk factors JSON
            risk_factors = []
            if hasattr(prediction, 'top_risk_factors'):
                risk_factors = [
                    {
                        "name": factor.name if hasattr(factor, 'name') else str(factor),
                        "description": factor.description if hasattr(factor, 'description') else "",
                        "weight": factor.weight if hasattr(factor, 'weight') else 0.0,
                    }
                    for factor in prediction.top_risk_factors
                ]
            
            db_prediction = RiskPrediction(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                student_id=str(prediction.student_id),
                risk_score=float(prediction.risk_score),
                risk_level=risk_level_map.get(prediction.risk_level, RiskLevelEnum.LOW),
                risk_trend=trend_value,
                confidence=getattr(prediction, 'confidence', None),
                risk_factors=risk_factors,
                feature_values=getattr(prediction, 'feature_values', {}),
                model_version=getattr(prediction, 'model_version', 'v1'),
                prediction_latency_ms=getattr(prediction, 'latency_ms', None),
                predicted_at=datetime.now(timezone.utc),
            )
            
            session.add(db_prediction)
            await session.commit()
            
            logger.debug(f"Stored prediction for student {prediction.student_id}")
    
    async def _get_student_staff(self, student_id: str) -> List[Dict[str, Any]]:
        """
        Get teachers and counselors assigned to a student.
        
        Args:
            student_id: Student UUID
        
        Returns:
            List of staff dictionaries with id, name, email, role
        """
        async with get_session() as session:
            result = await session.execute(
                select(User, StaffAssignment)
                .join(
                    StaffAssignment,
                    User.id == StaffAssignment.user_id
                )
                .where(
                    and_(
                        StaffAssignment.student_id == student_id,
                        StaffAssignment.end_date.is_(None),  # Active assignments only
                        User.is_active == True
                    )
                )
            )
            rows = result.all()
            
            return [
                {
                    "id": str(user.id),
                    "name": user.name,
                    "email": user.email,
                    "role": user.role,
                    "is_primary": assignment.is_primary,
                    "assignment_type": assignment.assignment_type,
                }
                for user, assignment in rows
            ]
    
    async def _get_ml_team_and_admins(self, tenant_id: str) -> List[Dict[str, Any]]:
        """
        Get ML team members and tenant admins for bias alerts.
        
        Args:
            tenant_id: Tenant UUID
        
        Returns:
            List of user dictionaries with id, name, email, role
        """
        async with get_session() as session:
            result = await session.execute(
                select(User)
                .where(
                    and_(
                        User.tenant_id == tenant_id,
                        User.is_active == True,
                        User.role.in_(["admin", "ml_team", "data_scientist"])
                    )
                )
            )
            users = result.scalars().all()
            
            return [
                {
                    "id": str(user.id),
                    "name": user.name,
                    "email": user.email,
                    "role": user.role,
                }
                for user in users
            ]
    
    async def _delete_old_predictions(self, cutoff_date: datetime) -> int:
        """
        Delete predictions older than cutoff date.
        
        Keeps the most recent prediction per student to maintain history.
        
        Args:
            cutoff_date: Delete predictions before this date
        
        Returns:
            Number of deleted predictions
        """
        async with get_session() as session:
            # First, identify the most recent prediction per student to keep
            # Using a subquery to get the latest prediction ID per student
            latest_subquery = (
                select(
                    RiskPrediction.student_id,
                    func.max(RiskPrediction.predicted_at).label('max_date')
                )
                .group_by(RiskPrediction.student_id)
                .subquery()
            )
            
            # Get IDs of predictions to keep
            keep_ids_query = (
                select(RiskPrediction.id)
                .join(
                    latest_subquery,
                    and_(
                        RiskPrediction.student_id == latest_subquery.c.student_id,
                        RiskPrediction.predicted_at == latest_subquery.c.max_date
                    )
                )
            )
            keep_result = await session.execute(keep_ids_query)
            keep_ids = {row[0] for row in keep_result.all()}
            
            # Delete old predictions that aren't the most recent per student
            delete_stmt = (
                delete(RiskPrediction)
                .where(
                    and_(
                        RiskPrediction.predicted_at < cutoff_date,
                        RiskPrediction.id.notin_(keep_ids) if keep_ids else True
                    )
                )
            )
            
            result = await session.execute(delete_stmt)
            await session.commit()
            
            deleted_count = result.rowcount
            logger.info(f"Deleted {deleted_count} old predictions")
            return deleted_count
    
    async def _get_recent_prediction_stats(self) -> Dict[str, Any]:
        """
        Get statistics on recent predictions (last 24 hours).
        
        Returns:
            Dictionary with prediction statistics including:
            - total: Total predictions
            - critical_rate: Percentage of critical predictions
            - high_rate: Percentage of high predictions
            - moderate_rate: Percentage of moderate predictions
            - low_rate: Percentage of low predictions
            - avg_score: Average risk score
            - avg_score_change: Average change from previous predictions
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        
        async with get_session() as session:
            # Get total count
            total_result = await session.execute(
                select(func.count(RiskPrediction.id))
                .where(RiskPrediction.predicted_at >= cutoff)
            )
            total = total_result.scalar() or 0
            
            if total == 0:
                return {
                    "total": 0,
                    "critical_rate": 0.0,
                    "high_rate": 0.0,
                    "moderate_rate": 0.0,
                    "low_rate": 0.0,
                    "avg_score": 0.0,
                    "avg_score_change": 0.0,
                }
            
            # Get counts by risk level
            level_counts = {}
            for level in RiskLevelEnum:
                count_result = await session.execute(
                    select(func.count(RiskPrediction.id))
                    .where(
                        and_(
                            RiskPrediction.predicted_at >= cutoff,
                            RiskPrediction.risk_level == level
                        )
                    )
                )
                level_counts[level.value] = count_result.scalar() or 0
            
            # Get average score
            avg_result = await session.execute(
                select(func.avg(RiskPrediction.risk_score))
                .where(RiskPrediction.predicted_at >= cutoff)
            )
            avg_score = avg_result.scalar() or 0.0
            
            # Calculate score change (compare to 24-48 hours ago)
            prev_cutoff = cutoff - timedelta(hours=24)
            prev_avg_result = await session.execute(
                select(func.avg(RiskPrediction.risk_score))
                .where(
                    and_(
                        RiskPrediction.predicted_at >= prev_cutoff,
                        RiskPrediction.predicted_at < cutoff
                    )
                )
            )
            prev_avg = prev_avg_result.scalar() or avg_score
            avg_score_change = abs(avg_score - prev_avg) if prev_avg else 0.0
            
            return {
                "total": total,
                "critical_rate": level_counts.get("critical", 0) / total,
                "high_rate": level_counts.get("high", 0) / total,
                "moderate_rate": level_counts.get("moderate", 0) / total,
                "low_rate": level_counts.get("low", 0) / total,
                "avg_score": float(avg_score),
                "avg_score_change": float(avg_score_change),
            }
    
    async def _record_job_metrics(
        self,
        job_name: str,
        metrics: Dict[str, Any],
    ) -> None:
        """
        Record job execution metrics to database.
        
        Args:
            job_name: Name of the job
            metrics: Dictionary of metrics to record
        """
        async with get_session() as session:
            job_execution = JobExecution(
                id=str(uuid.uuid4()),
                job_name=job_name,
                job_type="prediction",
                status=JobStatusEnum.COMPLETED if metrics.get("success", True) else JobStatusEnum.FAILED,
                started_at=datetime.now(timezone.utc) - timedelta(seconds=metrics.get("duration_seconds", 0)),
                completed_at=datetime.now(timezone.utc),
                duration_seconds=metrics.get("duration_seconds"),
                records_processed=metrics.get("predictions", 0) or metrics.get("students", 0),
                errors_count=1 if not metrics.get("success", True) else 0,
                metrics=metrics,
                error_details=metrics.get("error") if not metrics.get("success", True) else None,
            )
            
            session.add(job_execution)
            await session.commit()
            
            logger.info(f"Recorded metrics for job {job_name}")

    async def _send_monitoring_alert(
        self,
        issues: List[str],
    ) -> None:
        """
        Send monitoring alert to ML team about model health issues.
        
        Args:
            issues: List of issue descriptions
        """
        async with get_session() as session:
            alert = MonitoringAlertModel(
                id=str(uuid.uuid4()),
                tenant_id=None,  # System-wide alert
                alert_type="model_monitoring",
                severity=AlertSeverityEnum.WARNING,
                title="Model Health Issues Detected",
                description="\n".join(f"• {issue}" for issue in issues),
                is_resolved=False,
                metadata={
                    "issues": issues,
                    "check_time": datetime.now(timezone.utc).isoformat(),
                },
            )
            
            session.add(alert)
            await session.commit()
            
            logger.warning(f"Created monitoring alert for {len(issues)} issues")
            
            # Also attempt to notify via notification service
            try:
                await self.notification_service.send_system_alert(
                    tenant_id=None,
                    recipients=[],  # Will use system default recipients
                    message=f"Model Monitoring Alert:\n" + "\n".join(f"• {issue}" for issue in issues),
                    alert_type="model_health",
                )
            except Exception as e:
                logger.error(f"Failed to send notification: {e}")


# Convenience function to run predictions manually
async def run_predictions_now(tenant_id: Optional[str] = None):
    """
    Run predictions immediately (for manual triggering).
    
    Usage:
        from src.jobs.prediction_scheduler import run_predictions_now
        await run_predictions_now(tenant_id="...")
    """
    from ..main import get_services
    
    services = get_services()
    scheduler = PredictionScheduler(
        risk_model=services["risk_model"],
        bias_service=services["bias_service"],
        intervention_service=services["intervention_service"],
        notification_service=services["notification_service"],
        db_connection=services["db"],
    )
    
    await scheduler.run_daily_predictions(tenant_id)
