"""
IRT Calibration Service.

This module provides tools for calibrating and maintaining Item Response Theory
(IRT) item parameters based on production response data. It ensures assessment
accuracy is maintained as items are used with real learners.

Key Components:
    - IRTCalibrator: Main calibration logic with Bayesian and MLE methods
    - DriftDetector: Detects significant parameter drift over time
    - CalibrationScheduler: Manages calibration job scheduling
    - CalibrationTaskManager: Celery task management interface

Features:
    - Bayesian calibration for stable estimates with prior knowledge
    - Maximum Likelihood Estimation for unbiased estimates
    - Difficulty drift detection (configurable threshold, default 0.5 logits)
    - Discrimination parameter tracking
    - Batch calibration for efficient processing
    - Celery integration for scheduled jobs
    - Historical parameter tracking for audit

Example Usage:
    Basic calibration:
    >>> from src.services.calibration import (
    ...     CalibrationConfig,
    ...     IRTCalibrator,
    ...     DriftDetector,
    ... )
    >>> config = CalibrationConfig(min_responses=100)
    >>> calibrator = IRTCalibrator(config)
    >>> new_params = await calibrator.calibrate_item(
    ...     item_id="MATH_001",
    ...     responses=responses,
    ...     method="bayesian"
    ... )

    Scheduled calibration:
    >>> from src.services.calibration import CalibrationScheduler
    >>> scheduler = CalibrationScheduler(calibrator, detector)
    >>> report = await scheduler.run_scheduled_calibration()
    >>> print(f"Calibrated {report.items_calibrated} items")

    Drift detection:
    >>> detector = DriftDetector(threshold=0.5)
    >>> alerts = detector.detect_drift(old_params, new_params)
    >>> for alert in alerts:
    ...     print(f"Alert: {alert.drift_type} for {alert.item_id}")

    Celery tasks:
    >>> from src.services.calibration import CalibrationTaskManager
    >>> manager = CalibrationTaskManager()
    >>> task_id = manager.schedule_calibration(method="bayesian")

References:
    - Bock, R. D., & Aitkin, M. (1981). Marginal maximum likelihood estimation
      of item parameters.
    - Bock, R. D., Muraki, E., & Pfeiffenberger, W. (1988). Item pool
      maintenance in the presence of item parameter drift.
"""

from .calibrator import (
    CalibrationConfig,
    CalibrationResult,
    InsufficientDataError,
    IRTCalibrator,
)
from .drift_detector import (
    DriftAlert,
    DriftDetector,
    DriftDetectorConfig,
    DriftType,
)
from .scheduler import (
    CalibrationJobRunner,
    CalibrationReport,
    CalibrationScheduler,
)
from .tasks import (
    CalibrationTaskManager,
    analyze_drift,
    calibrate_single_item,
    run_priority_calibration,
    run_scheduled_calibration,
    CALIBRATION_BEAT_SCHEDULE,
)

__all__ = [
    # Calibrator
    "CalibrationConfig",
    "CalibrationResult",
    "InsufficientDataError",
    "IRTCalibrator",
    # Drift Detection
    "DriftAlert",
    "DriftDetector",
    "DriftDetectorConfig",
    "DriftType",
    # Scheduler
    "CalibrationJobRunner",
    "CalibrationReport",
    "CalibrationScheduler",
    # Tasks
    "CalibrationTaskManager",
    "analyze_drift",
    "calibrate_single_item",
    "run_priority_calibration",
    "run_scheduled_calibration",
    "CALIBRATION_BEAT_SCHEDULE",
]

__version__ = "1.0.0"
