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
from datetime import datetime, timedelta
from typing import Optional
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from ..models.student_risk_model import StudentRiskModel, RiskLevel
from ..services.bias_detection import BiasDetectionService
from ..services.intervention_recommender import InterventionRecommenderService
from ..services.notification_service import NotificationService
from ..config import settings

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
        start_time = datetime.utcnow()
        logger.info(f"Starting daily predictions at {start_time}")
        
        try:
            # Get tenants to process
            if tenant_id:
                tenants = [{"id": tenant_id}]
            else:
                tenants = await self._get_active_tenants()
            
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
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            logger.info(
                f"Daily predictions complete. "
                f"Tenants: {len(tenants)}, "
                f"Students: {total_students}, "
                f"Predictions: {total_predictions}, "
                f"Critical alerts: {critical_alerts}, "
                f"Duration: {duration:.1f}s"
            )
            
            # Record job metrics
            await self._record_job_metrics("daily_predictions", {
                "tenants": len(tenants),
                "students": total_students,
                "predictions": total_predictions,
                "critical_alerts": critical_alerts,
                "duration_seconds": duration,
                "success": True,
            })
            
        except Exception as e:
            logger.exception(f"Daily predictions job failed: {e}")
            await self._record_job_metrics("daily_predictions", {
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
            students = await self._get_active_students(tenant_id, batch_size, offset)
            
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
                await self._store_prediction(tenant_id, prediction)
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
            staff = await self._get_student_staff(prediction.student_id)
            
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
                f"\n⚠️ Please review this student's profile and consider "
                f"appropriate interventions. This is a prediction to assist "
                f"your judgment, not a diagnosis."
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
        start_time = datetime.utcnow()
        logger.info(f"Starting weekly bias report at {start_time}")
        
        try:
            tenants = await self._get_active_tenants()
            
            for tenant in tenants:
                try:
                    # Generate bias report for last 7 days
                    end_date = datetime.utcnow()
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
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            logger.info(f"Weekly bias report complete. Duration: {duration:.1f}s")
            
        except Exception as e:
            logger.exception(f"Weekly bias report job failed: {e}")
            raise
    
    async def _handle_bias_alert(self, tenant_id: str, report, alerts: list):
        """Handle critical bias alerts - notify ML team and admins"""
        # Get ML team and tenant admins
        recipients = await self._get_ml_team_and_admins(tenant_id)
        
        message = (
            f"⚠️ BIAS ALERT: Fairness issues detected in risk predictions\n\n"
            f"Overall Fairness Score: {report.overall_fairness_score:.0%}\n"
            f"Period: {report.period_start.date()} to {report.period_end.date()}\n\n"
            f"Critical Alerts:\n"
        )
        
        for alert in alerts[:5]:
            message += f"• {alert.message}\n"
        
        message += (
            f"\n📊 Please review the full bias report and take corrective action. "
            f"Model predictions may need to be adjusted for affected populations."
        )
        
        await self.notification_service.send_system_alert(
            tenant_id=tenant_id,
            recipients=recipients,
            message=message,
            alert_type="bias_detection",
        )
    
    async def run_prediction_cleanup(self, retention_days: int = 90):
        """Clean up old predictions to manage storage"""
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        try:
            # Delete old predictions (keep most recent per student)
            deleted_count = await self._delete_old_predictions(cutoff_date)
            logger.info(f"Cleaned up {deleted_count} predictions older than {retention_days} days")
            
        except Exception as e:
            logger.exception(f"Prediction cleanup failed: {e}")
            raise
    
    async def run_model_monitoring(self):
        """Monitor model health and performance"""
        logger.info("Running model health check")
        
        try:
            # Check prediction distribution (should be reasonable)
            stats = await self._get_recent_prediction_stats()
            
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
                await self._send_monitoring_alert(issues)
            else:
                logger.info("Model health check passed")
            
        except Exception as e:
            logger.exception(f"Model monitoring failed: {e}")
    
    # Database helper methods (placeholders - implement with actual ORM)
    
    async def _get_active_tenants(self) -> list[dict]:
        """Get list of active tenants"""
        # Placeholder - query tenants table
        return []
    
    async def _get_active_students(
        self,
        tenant_id: str,
        limit: int,
        offset: int,
    ) -> list[dict]:
        """Get active students for a tenant with pagination"""
        # Placeholder - query students
        return []
    
    async def _store_prediction(self, tenant_id: str, prediction) -> None:
        """Store a risk prediction"""
        # Placeholder - insert into risk_predictions
        pass
    
    async def _get_student_staff(self, student_id: str) -> list[dict]:
        """Get teachers and counselors for a student"""
        # Placeholder - query enrollments and staff
        return []
    
    async def _get_ml_team_and_admins(self, tenant_id: str) -> list[dict]:
        """Get ML team and tenant admins"""
        # Placeholder - query users with admin/ml roles
        return []
    
    async def _delete_old_predictions(self, cutoff_date: datetime) -> int:
        """Delete predictions older than cutoff"""
        # Placeholder - delete from risk_predictions
        return 0
    
    async def _get_recent_prediction_stats(self) -> dict:
        """Get statistics on recent predictions"""
        # Placeholder - aggregate recent predictions
        return {
            "total": 0,
            "critical_rate": 0.0,
            "high_rate": 0.0,
            "moderate_rate": 0.0,
            "low_rate": 0.0,
        }
    
    async def _record_job_metrics(self, job_name: str, metrics: dict) -> None:
        """Record job execution metrics"""
        # Placeholder - log to metrics system
        logger.info(f"Job metrics - {job_name}: {metrics}")
    
    async def _send_monitoring_alert(self, issues: list[str]) -> None:
        """Send monitoring alert to ML team"""
        # Placeholder - send alert
        logger.warning(f"Monitoring alert: {issues}")


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
