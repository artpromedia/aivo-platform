"""
Celery Tasks for IRT Calibration.

This module provides Celery tasks for scheduled and on-demand
IRT calibration jobs. Tasks can be triggered manually or
scheduled via Celery Beat.

Usage with Celery Beat (in celeryconfig.py or settings):
    beat_schedule = {
        'daily-calibration': {
            'task': 'src.services.calibration.tasks.run_scheduled_calibration',
            'schedule': crontab(hour=2, minute=0),  # 2 AM daily
            'kwargs': {'method': 'bayesian'},
        },
    }
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Optional

from src.models.irt.models import ItemResponse

from .calibrator import CalibrationConfig, IRTCalibrator
from .drift_detector import DriftDetector, DriftDetectorConfig
from .scheduler import CalibrationJobRunner, CalibrationReport, CalibrationScheduler

logger = logging.getLogger(__name__)

# Celery app - will be imported from main app configuration
# This is a placeholder that will be replaced with actual Celery app import
try:
    from celery import Celery, shared_task
    celery_available = True
except ImportError:
    celery_available = False
    shared_task = lambda *args, **kwargs: lambda f: f  # type: ignore
    Celery = None  # type: ignore


def get_celery_app() -> Optional[Any]:
    """
    Get or create Celery application.

    Returns the configured Celery app or None if Celery is not available.
    """
    if not celery_available:
        logger.warning("Celery is not installed. Tasks will run synchronously.")
        return None

    # In production, this would import from the main app
    # from src.celery_app import celery_app
    # return celery_app

    return None


def run_async(coro):
    """Helper to run async functions in sync context."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@shared_task(
    name="src.services.calibration.tasks.run_scheduled_calibration",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
    autoretry_for=(Exception,),
    acks_late=True,
)
def run_scheduled_calibration(
    self,
    method: str = "bayesian",
    item_ids: Optional[list[str]] = None,
    since_days: Optional[int] = None
) -> dict[str, Any]:
    """
    Celery task for scheduled IRT calibration.

    This task runs the full calibration process:
    1. Identifies items due for calibration
    2. Runs batch calibration
    3. Detects parameter drift
    4. Sends alerts
    5. Returns a summary report

    Args:
        method: Calibration method ("bayesian" or "mle")
        item_ids: Specific items to calibrate (None = auto-detect)
        since_days: Only use responses from last N days

    Returns:
        Dictionary with calibration results
    """
    task_id = self.request.id if hasattr(self, 'request') else "sync"
    logger.info(f"Starting scheduled calibration task {task_id}")

    try:
        since = None
        if since_days is not None:
            since = datetime.utcnow() - timedelta(days=since_days)

        result = run_async(
            CalibrationJobRunner.run_full_calibration(
                method=method,
            )
        )

        logger.info(
            f"Calibration task {task_id} completed: "
            f"{result['items_calibrated']} items calibrated"
        )

        return result

    except Exception as e:
        logger.error(f"Calibration task {task_id} failed: {e}")
        raise


@shared_task(
    name="src.services.calibration.tasks.calibrate_single_item",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def calibrate_single_item(
    self,
    item_id: str,
    responses: list[dict],
    method: str = "bayesian"
) -> dict[str, Any]:
    """
    Celery task to calibrate a single item.

    Useful for immediate recalibration of specific items,
    such as when new response data becomes available.

    Args:
        item_id: Item identifier to calibrate
        responses: List of response dictionaries
        method: Calibration method

    Returns:
        Dictionary with new item parameters
    """
    task_id = self.request.id if hasattr(self, 'request') else "sync"
    logger.info(f"Starting single item calibration task {task_id} for {item_id}")

    try:
        result = run_async(
            CalibrationJobRunner.run_item_calibration(
                item_id=item_id,
                responses=responses,
                method=method
            )
        )

        logger.info(f"Calibration task {task_id} completed for {item_id}")
        return result

    except Exception as e:
        logger.error(f"Calibration task {task_id} failed for {item_id}: {e}")
        raise


@shared_task(
    name="src.services.calibration.tasks.run_priority_calibration",
    bind=True,
    max_retries=1,
    priority=9,  # High priority
)
def run_priority_calibration(
    self,
    item_ids: list[str],
    method: str = "bayesian"
) -> dict[str, Any]:
    """
    High-priority calibration task for specific items.

    This task has higher priority than scheduled calibration
    and is used for items that need immediate attention (e.g.,
    items with detected drift or newly added items).

    Args:
        item_ids: List of item IDs to calibrate
        method: Calibration method

    Returns:
        Dictionary with calibration results
    """
    task_id = self.request.id if hasattr(self, 'request') else "sync"
    logger.info(
        f"Starting priority calibration task {task_id} "
        f"for {len(item_ids)} items"
    )

    # Create components
    config = CalibrationConfig()
    calibrator = IRTCalibrator(config)
    detector = DriftDetector()
    scheduler = CalibrationScheduler(calibrator, detector)

    try:
        report = run_async(
            scheduler.run_priority_calibration(
                priority_items=item_ids,
                method=method
            )
        )

        result = {
            "run_id": report.run_id,
            "items_calibrated": report.items_calibrated,
            "alerts_generated": report.alerts_generated,
            "success_rate": report.success_rate,
        }

        logger.info(f"Priority calibration task {task_id} completed")
        return result

    except Exception as e:
        logger.error(f"Priority calibration task {task_id} failed: {e}")
        raise


@shared_task(
    name="src.services.calibration.tasks.analyze_drift",
    bind=True,
)
def analyze_drift(
    self,
    item_ids: list[str]
) -> dict[str, Any]:
    """
    Analyze drift trends for specified items.

    This task examines historical calibration data to identify
    items with concerning drift patterns.

    Args:
        item_ids: List of item IDs to analyze

    Returns:
        Dictionary with drift analysis results
    """
    task_id = self.request.id if hasattr(self, 'request') else "sync"
    logger.info(f"Starting drift analysis task {task_id}")

    config = CalibrationConfig()
    calibrator = IRTCalibrator(config)
    detector = DriftDetector()
    scheduler = CalibrationScheduler(calibrator, detector)

    results = {}
    for item_id in item_ids:
        analysis = scheduler.analyze_drift_trends(item_id)
        results[item_id] = analysis

    return {
        "task_id": task_id,
        "items_analyzed": len(item_ids),
        "analyses": results,
    }


class CalibrationTaskManager:
    """
    Manager for calibration tasks.

    Provides a convenient interface for scheduling and
    managing calibration tasks.
    """

    def __init__(self, celery_app: Optional[Any] = None):
        """
        Initialize the task manager.

        Args:
            celery_app: Optional Celery application instance
        """
        self.celery_app = celery_app or get_celery_app()

    def schedule_calibration(
        self,
        method: str = "bayesian",
        item_ids: Optional[list[str]] = None,
        since_days: Optional[int] = None,
        eta: Optional[datetime] = None,
        countdown: Optional[int] = None
    ) -> Optional[str]:
        """
        Schedule a calibration task.

        Args:
            method: Calibration method
            item_ids: Specific items to calibrate
            since_days: Only use responses from last N days
            eta: Run at specific datetime
            countdown: Run after N seconds

        Returns:
            Task ID or None if running synchronously
        """
        if self.celery_app is None:
            # Run synchronously
            result = run_scheduled_calibration(
                method=method,
                item_ids=item_ids,
                since_days=since_days
            )
            logger.info(f"Synchronous calibration completed: {result}")
            return None

        # Schedule via Celery
        task = run_scheduled_calibration.apply_async(
            kwargs={
                "method": method,
                "item_ids": item_ids,
                "since_days": since_days,
            },
            eta=eta,
            countdown=countdown,
        )

        return task.id

    def schedule_priority_calibration(
        self,
        item_ids: list[str],
        method: str = "bayesian"
    ) -> Optional[str]:
        """
        Schedule high-priority calibration for specific items.

        Args:
            item_ids: Items needing immediate calibration
            method: Calibration method

        Returns:
            Task ID or None if running synchronously
        """
        if self.celery_app is None:
            result = run_priority_calibration(
                item_ids=item_ids,
                method=method
            )
            logger.info(f"Synchronous priority calibration completed: {result}")
            return None

        task = run_priority_calibration.apply_async(
            kwargs={
                "item_ids": item_ids,
                "method": method,
            }
        )

        return task.id

    def calibrate_item_async(
        self,
        item_id: str,
        responses: list[dict],
        method: str = "bayesian"
    ) -> Optional[str]:
        """
        Schedule single item calibration.

        Args:
            item_id: Item to calibrate
            responses: Response data
            method: Calibration method

        Returns:
            Task ID or None if running synchronously
        """
        if self.celery_app is None:
            result = calibrate_single_item(
                item_id=item_id,
                responses=responses,
                method=method
            )
            logger.info(f"Synchronous item calibration completed: {result}")
            return None

        task = calibrate_single_item.apply_async(
            kwargs={
                "item_id": item_id,
                "responses": responses,
                "method": method,
            }
        )

        return task.id

    def get_task_result(
        self,
        task_id: str,
        timeout: Optional[float] = None
    ) -> Optional[dict]:
        """
        Get the result of a calibration task.

        Args:
            task_id: Task identifier
            timeout: Maximum time to wait for result

        Returns:
            Task result or None if not available
        """
        if self.celery_app is None:
            return None

        from celery.result import AsyncResult
        result = AsyncResult(task_id, app=self.celery_app)

        if result.ready():
            return result.get(timeout=timeout)

        return None

    def get_task_status(self, task_id: str) -> dict:
        """
        Get the status of a calibration task.

        Args:
            task_id: Task identifier

        Returns:
            Dictionary with task status information
        """
        if self.celery_app is None:
            return {"status": "unknown", "task_id": task_id}

        from celery.result import AsyncResult
        result = AsyncResult(task_id, app=self.celery_app)

        return {
            "task_id": task_id,
            "status": result.status,
            "ready": result.ready(),
            "successful": result.successful() if result.ready() else None,
        }


# Celery Beat schedule configuration example
# Add this to your celeryconfig.py or settings file:
CALIBRATION_BEAT_SCHEDULE = {
    "daily-irt-calibration": {
        "task": "src.services.calibration.tasks.run_scheduled_calibration",
        "schedule": {
            "hour": 2,
            "minute": 0,
        },  # 2 AM daily (use crontab in actual config)
        "kwargs": {
            "method": "bayesian",
            "since_days": 30,
        },
        "options": {
            "queue": "calibration",
            "expires": 3600,  # 1 hour
        },
    },
    "weekly-full-calibration": {
        "task": "src.services.calibration.tasks.run_scheduled_calibration",
        "schedule": {
            "day_of_week": 0,  # Sunday
            "hour": 3,
            "minute": 0,
        },
        "kwargs": {
            "method": "bayesian",
            "since_days": None,  # Use all data
        },
        "options": {
            "queue": "calibration",
            "expires": 7200,  # 2 hours
        },
    },
}
