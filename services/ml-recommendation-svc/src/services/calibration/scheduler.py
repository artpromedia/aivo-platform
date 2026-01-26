"""
IRT Calibration Scheduler.

This module provides scheduling and management for calibration jobs.
It coordinates between the IRTCalibrator and DriftDetector to maintain
item parameter quality over time.

Key Features:
    - Scheduled calibration runs
    - Priority-based item selection
    - Drift alert processing and notification
    - Historical calibration tracking
    - Performance monitoring
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Callable, Optional, Protocol, Sequence

from pydantic import BaseModel, Field

from src.models.irt.models import ItemParameters, ItemResponse

from .calibrator import (
    CalibrationConfig,
    CalibrationResult,
    IRTCalibrator,
    InsufficientDataError,
)
from .drift_detector import DriftAlert, DriftDetector, DriftDetectorConfig

logger = logging.getLogger(__name__)


class CalibrationReport(BaseModel):
    """
    Report generated after a calibration run.

    Attributes:
        run_id: Unique identifier for this calibration run
        started_at: When the calibration run started
        completed_at: When the calibration run completed
        items_calibrated: Number of items successfully calibrated
        items_skipped: Number of items skipped (insufficient data, etc.)
        items_failed: Number of items that failed calibration
        alerts_generated: Total number of drift alerts generated
        drift_alerts: List of drift alerts
        total_responses_processed: Total responses used in calibration
        mean_calibration_time_ms: Average calibration time per item
        parameter_changes_summary: Summary statistics of parameter changes
    """

    run_id: str = Field(..., description="Unique run identifier")
    started_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Run start time"
    )
    completed_at: Optional[datetime] = Field(
        default=None,
        description="Run completion time"
    )
    items_calibrated: int = Field(
        default=0,
        ge=0,
        description="Successfully calibrated items"
    )
    items_skipped: int = Field(
        default=0,
        ge=0,
        description="Items skipped due to insufficient data"
    )
    items_failed: int = Field(
        default=0,
        ge=0,
        description="Items that failed calibration"
    )
    alerts_generated: int = Field(
        default=0,
        ge=0,
        description="Number of drift alerts"
    )
    drift_alerts: list[DriftAlert] = Field(
        default_factory=list,
        description="All drift alerts from this run"
    )
    total_responses_processed: int = Field(
        default=0,
        ge=0,
        description="Total responses processed"
    )
    mean_calibration_time_ms: float = Field(
        default=0.0,
        ge=0.0,
        description="Average calibration time per item"
    )
    parameter_changes_summary: dict[str, Any] = Field(
        default_factory=dict,
        description="Summary of parameter changes"
    )

    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate run duration in seconds."""
        if self.completed_at is None:
            return None
        return (self.completed_at - self.started_at).total_seconds()

    @property
    def success_rate(self) -> float:
        """Calculate calibration success rate."""
        total = self.items_calibrated + self.items_skipped + self.items_failed
        if total == 0:
            return 0.0
        return self.items_calibrated / total


class NotificationService(Protocol):
    """Protocol for notification services."""

    async def send_alert(
        self,
        alert_type: str,
        message: str,
        data: dict
    ) -> None:
        """Send an alert notification."""
        ...


class CalibrationScheduler:
    """
    Schedules and manages calibration jobs.

    This class coordinates the calibration process, including:
    - Identifying items needing calibration
    - Running batch calibration
    - Detecting and alerting on parameter drift
    - Persisting results
    - Generating reports

    Example:
        >>> scheduler = CalibrationScheduler(calibrator, detector)
        >>> report = await scheduler.run_scheduled_calibration()
        >>> print(f"Calibrated {report.items_calibrated} items")
    """

    def __init__(
        self,
        calibrator: IRTCalibrator,
        detector: DriftDetector,
        notification_service: Optional[NotificationService] = None,
        batch_size: int = 100,
        max_concurrent: int = 10
    ):
        """
        Initialize the calibration scheduler.

        Args:
            calibrator: IRTCalibrator instance for performing calibration
            detector: DriftDetector instance for detecting parameter drift
            notification_service: Optional service for sending alerts
            batch_size: Number of items to process in each batch
            max_concurrent: Maximum concurrent calibrations
        """
        self.calibrator = calibrator
        self.detector = detector
        self.notification_service = notification_service
        self.batch_size = batch_size
        self.max_concurrent = max_concurrent

        # Tracking
        self._run_history: list[CalibrationReport] = []
        self._parameter_history: dict[str, list[ItemParameters]] = {}

    async def run_scheduled_calibration(
        self,
        item_ids: Optional[list[str]] = None,
        since: Optional[datetime] = None,
        method: str = "bayesian"
    ) -> CalibrationReport:
        """
        Run scheduled calibration job.

        This is the main entry point for scheduled calibration. It:
        1. Identifies items due for calibration
        2. Runs batch calibration
        3. Detects parameter drift
        4. Sends alerts for significant drift
        5. Persists updated parameters
        6. Generates a comprehensive report

        Args:
            item_ids: Specific items to calibrate (None = auto-detect)
            since: Only use responses after this date
            method: Calibration method ("bayesian" or "mle")

        Returns:
            CalibrationReport with results summary
        """
        run_id = f"cal_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        report = CalibrationReport(run_id=run_id, started_at=datetime.utcnow())

        logger.info(f"Starting calibration run {run_id}")

        try:
            # Get items due for calibration
            if item_ids is None:
                item_ids = await self._get_due_items()

            logger.info(f"Found {len(item_ids)} items due for calibration")

            if not item_ids:
                report.completed_at = datetime.utcnow()
                return report

            # Process in batches
            all_alerts: list[DriftAlert] = []
            all_results: list[CalibrationResult] = []

            for batch_start in range(0, len(item_ids), self.batch_size):
                batch_end = min(batch_start + self.batch_size, len(item_ids))
                batch_ids = item_ids[batch_start:batch_end]

                logger.debug(
                    f"Processing batch {batch_start // self.batch_size + 1}: "
                    f"items {batch_start + 1}-{batch_end}"
                )

                # Calibrate batch
                batch_results = await self.calibrator.batch_calibrate(
                    item_ids=batch_ids,
                    since=since,
                    method=method
                )

                # Process each result for drift detection
                for item_id, result in batch_results.items():
                    all_results.append(result)

                    # Check for drift
                    if result.old_params is not None:
                        alerts = self.detector.detect_drift(
                            result.old_params,
                            result.new_params
                        )
                        all_alerts.extend(alerts)

                    # Track parameter history
                    self._track_parameter_history(item_id, result.new_params)

                    # Persist new parameters
                    await self._save_params(result.new_params)

                # Track skipped items in this batch
                calibrated_ids = set(batch_results.keys())
                skipped_ids = set(batch_ids) - calibrated_ids
                report.items_skipped += len(skipped_ids)

            # Send alerts if there are any
            if all_alerts:
                await self._notify_alerts(all_alerts)

            # Build report
            report = self._build_report(
                run_id=run_id,
                started_at=report.started_at,
                results=all_results,
                alerts=all_alerts,
                items_skipped=report.items_skipped
            )

            self._run_history.append(report)
            logger.info(
                f"Calibration run {run_id} completed: "
                f"{report.items_calibrated} calibrated, "
                f"{report.alerts_generated} alerts"
            )

        except Exception as e:
            logger.error(f"Calibration run {run_id} failed: {e}")
            report.items_failed += 1
            report.completed_at = datetime.utcnow()
            raise

        return report

    async def run_priority_calibration(
        self,
        priority_items: list[str],
        method: str = "bayesian"
    ) -> CalibrationReport:
        """
        Run calibration for priority items.

        Priority calibration bypasses normal scheduling and immediately
        calibrates the specified items. Useful for items with suspected
        drift or new items needing initial calibration.

        Args:
            priority_items: Item IDs to calibrate immediately
            method: Calibration method

        Returns:
            CalibrationReport with results
        """
        logger.info(f"Running priority calibration for {len(priority_items)} items")
        return await self.run_scheduled_calibration(
            item_ids=priority_items,
            method=method
        )

    async def _get_due_items(self) -> list[str]:
        """
        Get items due for calibration.

        Identifies items that need recalibration based on:
        - Time since last calibration
        - Number of new responses
        - Previously flagged drift

        Returns:
            List of item IDs due for calibration
        """
        # Delegate to calibrator's method
        due_items = await self.calibrator._get_items_needing_calibration()

        # Also check for previously flagged items
        flagged_items = await self._get_flagged_items()

        # Combine and deduplicate
        all_items = list(set(due_items + flagged_items))

        return all_items

    async def _get_flagged_items(self) -> list[str]:
        """
        Get items flagged for recalibration.

        Returns items that were flagged in previous runs due to
        drift or other issues.

        Returns:
            List of flagged item IDs
        """
        # In production, this would query a flags table
        return []

    async def _get_previous_params(
        self,
        item_id: str
    ) -> Optional[ItemParameters]:
        """
        Get previous parameters for an item.

        Args:
            item_id: Item identifier

        Returns:
            Previous ItemParameters or None
        """
        if item_id in self._parameter_history:
            history = self._parameter_history[item_id]
            if len(history) >= 2:
                return history[-2]  # Second to last
        return None

    async def _save_params(
        self,
        params: ItemParameters
    ) -> None:
        """
        Save updated parameters to database.

        Args:
            params: ItemParameters to save
        """
        if self.calibrator.db is not None:
            # In production, this would persist to database
            logger.debug(f"Saving parameters for {params.item_id}")

    async def _notify_alerts(
        self,
        alerts: list[DriftAlert]
    ) -> None:
        """
        Notify content team of drift alerts.

        Args:
            alerts: List of drift alerts to send
        """
        if not alerts:
            return

        if self.notification_service is not None:
            summary = self.detector.calculate_drift_summary(alerts)

            await self.notification_service.send_alert(
                alert_type="irt_drift",
                message=f"Detected {len(alerts)} parameter drift alerts",
                data={
                    "summary": summary,
                    "alerts": [a.model_dump() for a in alerts],
                }
            )

        # Log all alerts
        for alert in alerts:
            logger.warning(
                f"Drift alert [{alert.drift_type.value}] for {alert.item_id}: "
                f"{alert.old_value:.3f} -> {alert.new_value:.3f} "
                f"(magnitude={alert.magnitude:.3f})"
            )

    def _track_parameter_history(
        self,
        item_id: str,
        params: ItemParameters
    ) -> None:
        """
        Track parameter history for an item.

        Maintains a rolling history of parameters for trend analysis.

        Args:
            item_id: Item identifier
            params: New parameters to track
        """
        if item_id not in self._parameter_history:
            self._parameter_history[item_id] = []

        self._parameter_history[item_id].append(params)

        # Keep last 10 calibrations
        if len(self._parameter_history[item_id]) > 10:
            self._parameter_history[item_id] = self._parameter_history[item_id][-10:]

    def _build_report(
        self,
        run_id: str,
        started_at: datetime,
        results: list[CalibrationResult],
        alerts: list[DriftAlert],
        items_skipped: int
    ) -> CalibrationReport:
        """
        Build comprehensive calibration report.

        Args:
            run_id: Run identifier
            started_at: Run start time
            results: List of calibration results
            alerts: List of drift alerts
            items_skipped: Count of skipped items

        Returns:
            Complete CalibrationReport
        """
        # Calculate statistics
        total_responses = sum(r.n_responses for r in results)
        calibration_times = [r.calibration_time_ms for r in results if r.calibration_time_ms > 0]
        mean_time = sum(calibration_times) / len(calibration_times) if calibration_times else 0.0

        # Calculate parameter change summary
        difficulty_changes = []
        discrimination_changes = []
        guessing_changes = []

        for result in results:
            if result.old_params is not None:
                difficulty_changes.append(
                    result.new_params.difficulty - result.old_params.difficulty
                )
                discrimination_changes.append(
                    result.new_params.discrimination - result.old_params.discrimination
                )
                guessing_changes.append(
                    result.new_params.guessing - result.old_params.guessing
                )

        def safe_stats(values: list[float]) -> dict[str, float]:
            if not values:
                return {"mean": 0.0, "std": 0.0, "min": 0.0, "max": 0.0}
            import numpy as np
            arr = np.array(values)
            return {
                "mean": float(np.mean(arr)),
                "std": float(np.std(arr)),
                "min": float(np.min(arr)),
                "max": float(np.max(arr)),
            }

        parameter_changes = {
            "difficulty": safe_stats(difficulty_changes),
            "discrimination": safe_stats(discrimination_changes),
            "guessing": safe_stats(guessing_changes),
        }

        # Count failed items (items that raised exceptions are not in results)
        items_failed = 0  # Would track from try/except in batch_calibrate

        return CalibrationReport(
            run_id=run_id,
            started_at=started_at,
            completed_at=datetime.utcnow(),
            items_calibrated=len(results),
            items_skipped=items_skipped,
            items_failed=items_failed,
            alerts_generated=len(alerts),
            drift_alerts=alerts,
            total_responses_processed=total_responses,
            mean_calibration_time_ms=mean_time,
            parameter_changes_summary=parameter_changes,
        )

    def get_run_history(
        self,
        limit: int = 10
    ) -> list[CalibrationReport]:
        """
        Get recent calibration run history.

        Args:
            limit: Maximum number of runs to return

        Returns:
            List of recent CalibrationReport objects
        """
        return self._run_history[-limit:]

    def get_parameter_history(
        self,
        item_id: str
    ) -> list[ItemParameters]:
        """
        Get parameter history for an item.

        Args:
            item_id: Item identifier

        Returns:
            List of historical ItemParameters
        """
        return self._parameter_history.get(item_id, [])

    def analyze_drift_trends(
        self,
        item_id: str
    ) -> dict[str, Any]:
        """
        Analyze drift trends for an item over time.

        Args:
            item_id: Item identifier

        Returns:
            Dictionary with trend analysis
        """
        history = self.get_parameter_history(item_id)

        if len(history) < 2:
            return {
                "item_id": item_id,
                "sufficient_history": False,
                "n_calibrations": len(history),
            }

        import numpy as np

        difficulties = [p.difficulty for p in history]
        discriminations = [p.discrimination for p in history]
        sample_sizes = [p.calibration_n for p in history]

        # Calculate trends (simple linear regression slope)
        x = np.arange(len(history))

        def calc_slope(y: list[float]) -> float:
            if len(y) < 2:
                return 0.0
            y_arr = np.array(y)
            slope = np.polyfit(x, y_arr, 1)[0]
            return float(slope)

        return {
            "item_id": item_id,
            "sufficient_history": True,
            "n_calibrations": len(history),
            "difficulty_trend": {
                "slope": calc_slope(difficulties),
                "current": difficulties[-1],
                "first": difficulties[0],
                "total_change": difficulties[-1] - difficulties[0],
            },
            "discrimination_trend": {
                "slope": calc_slope(discriminations),
                "current": discriminations[-1],
                "first": discriminations[0],
            },
            "sample_size_trend": {
                "mean": float(np.mean(sample_sizes)),
                "latest": sample_sizes[-1],
            },
            "dates": [
                p.calibration_date.isoformat() if p.calibration_date else None
                for p in history
            ],
        }


class CalibrationJobRunner:
    """
    Runner for calibration jobs that can be used with task queues.

    This class provides static methods that can be easily called
    from Celery tasks or other job runners.
    """

    @staticmethod
    async def run_full_calibration(
        calibrator_config: Optional[dict] = None,
        detector_config: Optional[dict] = None,
        method: str = "bayesian"
    ) -> dict:
        """
        Run full calibration job.

        Creates necessary components and runs calibration.
        Returns a serializable dictionary for job tracking.

        Args:
            calibrator_config: Optional calibrator configuration dict
            detector_config: Optional detector configuration dict
            method: Calibration method

        Returns:
            Serializable result dictionary
        """
        # Create configuration
        cal_config = CalibrationConfig(
            **(calibrator_config or {})
        )
        det_config = DriftDetectorConfig(
            **(detector_config or {})
        )

        # Create components
        calibrator = IRTCalibrator(cal_config)
        detector = DriftDetector(det_config)
        scheduler = CalibrationScheduler(calibrator, detector)

        # Run calibration
        report = await scheduler.run_scheduled_calibration(method=method)

        # Return serializable result
        return {
            "run_id": report.run_id,
            "started_at": report.started_at.isoformat(),
            "completed_at": report.completed_at.isoformat() if report.completed_at else None,
            "items_calibrated": report.items_calibrated,
            "items_skipped": report.items_skipped,
            "alerts_generated": report.alerts_generated,
            "total_responses_processed": report.total_responses_processed,
            "success_rate": report.success_rate,
            "duration_seconds": report.duration_seconds,
        }

    @staticmethod
    async def run_item_calibration(
        item_id: str,
        responses: list[dict],
        method: str = "bayesian"
    ) -> dict:
        """
        Calibrate a single item.

        Args:
            item_id: Item to calibrate
            responses: List of response dictionaries
            method: Calibration method

        Returns:
            Serializable result dictionary
        """
        # Convert responses
        item_responses = [
            ItemResponse(**r) for r in responses
        ]

        # Create calibrator
        calibrator = IRTCalibrator(CalibrationConfig())

        # Calibrate
        new_params = await calibrator.calibrate_item(
            item_id=item_id,
            responses=item_responses,
            method=method
        )

        return {
            "item_id": new_params.item_id,
            "difficulty": new_params.difficulty,
            "discrimination": new_params.discrimination,
            "guessing": new_params.guessing,
            "calibration_n": new_params.calibration_n,
            "calibration_date": new_params.calibration_date.isoformat(),
        }
