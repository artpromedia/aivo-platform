"""
IRT Parameter Drift Detection.

This module provides tools for detecting significant drift in IRT item parameters
over time. Parameter drift can indicate:
- Item exposure (memorization effects)
- Curriculum changes affecting item difficulty
- Population shifts in the learner base
- Item quality degradation

Drift detection is critical for maintaining assessment validity and ensures
that items continue to measure abilities accurately.

References:
    - Bock, R. D., Muraki, E., & Pfeiffenberger, W. (1988). Item pool
      maintenance in the presence of item parameter drift.
    - Guo, F., & Wang, L. (2014). Monitoring item parameter drift.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from src.models.irt.models import ItemParameters


class DriftType(str, Enum):
    """Types of parameter drift that can be detected."""

    DIFFICULTY_INCREASE = "difficulty_increase"
    DIFFICULTY_DECREASE = "difficulty_decrease"
    DISCRIMINATION_CHANGE = "discrimination_change"
    GUESSING_ANOMALY = "guessing_anomaly"


class DriftAlert(BaseModel):
    """
    Alert generated when significant parameter drift is detected.

    Attributes:
        item_id: Identifier of the drifting item
        drift_type: Type of drift detected
        magnitude: Size of the drift in logits or relative change
        old_value: Previous parameter value
        new_value: New (recalibrated) parameter value
        detected_at: Timestamp of drift detection
        recommendation: Suggested action for content team
        confidence: Confidence level in the drift detection (0-1)
        supporting_data: Additional diagnostic information
    """

    item_id: str = Field(..., description="Item identifier")
    drift_type: DriftType = Field(..., description="Type of drift detected")
    magnitude: float = Field(
        ...,
        ge=0.0,
        description="Magnitude of drift (logits or relative change)"
    )
    old_value: float = Field(..., description="Previous parameter value")
    new_value: float = Field(..., description="New parameter value")
    detected_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When drift was detected"
    )
    recommendation: str = Field(
        ...,
        description="Recommended action for the content team"
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Confidence in drift detection"
    )
    supporting_data: dict = Field(
        default_factory=dict,
        description="Additional diagnostic information"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "item_id": "MATH_001",
                "drift_type": "difficulty_increase",
                "magnitude": 0.75,
                "old_value": 0.5,
                "new_value": 1.25,
                "recommendation": "Item may have become harder due to curriculum changes",
            }
        }
    }


class DriftDetectorConfig(BaseModel):
    """Configuration for drift detection thresholds."""

    difficulty_threshold: float = Field(
        default=0.5,
        ge=0.0,
        description="Difficulty drift threshold in logits"
    )
    discrimination_relative_threshold: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Discrimination relative change threshold (30% default)"
    )
    guessing_absolute_threshold: float = Field(
        default=0.15,
        ge=0.0,
        le=1.0,
        description="Guessing parameter absolute change threshold"
    )
    guessing_relative_threshold: float = Field(
        default=0.5,
        ge=0.0,
        description="Guessing parameter relative change threshold"
    )
    min_calibration_n: int = Field(
        default=100,
        ge=0,
        description="Minimum sample size for confident drift detection"
    )


class DriftDetector:
    """
    Detects significant parameter drift in IRT items over time.

    The detector compares old and new item parameters and generates
    alerts when drift exceeds configured thresholds. Different types
    of drift are handled with appropriate metrics:

    - Difficulty: Absolute difference in logits (0.5 threshold)
    - Discrimination: Relative change (30% threshold)
    - Guessing: Both absolute and relative changes

    Example:
        >>> detector = DriftDetector(threshold=0.5)
        >>> old_params = ItemParameters(item_id="Q1", a=1.2, b=0.5, c=0.25)
        >>> new_params = ItemParameters(item_id="Q1", a=1.2, b=1.1, c=0.25)
        >>> alerts = detector.detect_drift(old_params, new_params)
        >>> if alerts:
        ...     print(f"Drift detected: {alerts[0].drift_type}")
    """

    def __init__(
        self,
        config: Optional[DriftDetectorConfig] = None,
        threshold: float = 0.5
    ):
        """
        Initialize the drift detector.

        Args:
            config: Full configuration object (takes precedence)
            threshold: Simple difficulty threshold for backward compatibility
        """
        if config is not None:
            self.config = config
        else:
            self.config = DriftDetectorConfig(difficulty_threshold=threshold)

    @property
    def threshold(self) -> float:
        """Backward-compatible access to difficulty threshold."""
        return self.config.difficulty_threshold

    def detect_drift(
        self,
        old_params: ItemParameters,
        new_params: ItemParameters
    ) -> list[DriftAlert]:
        """
        Check for significant drift in any parameter.

        Compares old and new item parameters and generates alerts for
        any parameter that has drifted beyond the configured thresholds.

        Args:
            old_params: Previous item parameters
            new_params: Newly calibrated parameters

        Returns:
            List of DriftAlert objects for each detected drift
        """
        alerts = []

        # Verify we're comparing the same item
        if old_params.item_id != new_params.item_id:
            raise ValueError(
                f"Item ID mismatch: {old_params.item_id} vs {new_params.item_id}"
            )

        # Difficulty drift detection
        difficulty_alert = self._check_difficulty_drift(old_params, new_params)
        if difficulty_alert:
            alerts.append(difficulty_alert)

        # Discrimination drift detection
        discrimination_alert = self._check_discrimination_drift(old_params, new_params)
        if discrimination_alert:
            alerts.append(discrimination_alert)

        # Guessing parameter drift detection
        guessing_alert = self._check_guessing_drift(old_params, new_params)
        if guessing_alert:
            alerts.append(guessing_alert)

        return alerts

    def _check_difficulty_drift(
        self,
        old_params: ItemParameters,
        new_params: ItemParameters
    ) -> Optional[DriftAlert]:
        """
        Check for significant difficulty parameter drift.

        Difficulty drift is measured as absolute difference in logits.
        A 0.5 logit shift corresponds to approximately one grade level
        or a meaningful change in item difficulty.

        Args:
            old_params: Previous item parameters
            new_params: New item parameters

        Returns:
            DriftAlert if drift detected, None otherwise
        """
        diff_drift = new_params.difficulty - old_params.difficulty
        abs_drift = abs(diff_drift)

        if abs_drift > self.config.difficulty_threshold:
            drift_type = (
                DriftType.DIFFICULTY_INCREASE
                if diff_drift > 0
                else DriftType.DIFFICULTY_DECREASE
            )

            # Calculate confidence based on sample size
            confidence = self._calculate_confidence(
                old_params.calibration_n,
                new_params.calibration_n
            )

            recommendation = self._get_recommendation(drift_type, abs_drift)

            return DriftAlert(
                item_id=old_params.item_id,
                drift_type=drift_type,
                magnitude=abs_drift,
                old_value=old_params.difficulty,
                new_value=new_params.difficulty,
                detected_at=datetime.utcnow(),
                recommendation=recommendation,
                confidence=confidence,
                supporting_data={
                    "direction": "harder" if diff_drift > 0 else "easier",
                    "old_calibration_n": old_params.calibration_n,
                    "new_calibration_n": new_params.calibration_n,
                    "threshold": self.config.difficulty_threshold,
                }
            )

        return None

    def _check_discrimination_drift(
        self,
        old_params: ItemParameters,
        new_params: ItemParameters
    ) -> Optional[DriftAlert]:
        """
        Check for significant discrimination parameter drift.

        Discrimination drift is measured as relative change since
        absolute changes have different implications at different
        scale points. A 30% change is considered significant.

        Args:
            old_params: Previous item parameters
            new_params: New item parameters

        Returns:
            DriftAlert if drift detected, None otherwise
        """
        # Use relative change for discrimination
        if old_params.discrimination > 0.01:  # Avoid division by near-zero
            disc_change = (
                abs(new_params.discrimination - old_params.discrimination)
                / old_params.discrimination
            )
        else:
            # If old discrimination was near zero, use absolute change
            disc_change = abs(new_params.discrimination - old_params.discrimination)

        if disc_change > self.config.discrimination_relative_threshold:
            confidence = self._calculate_confidence(
                old_params.calibration_n,
                new_params.calibration_n
            )

            # Determine if item is becoming more or less discriminating
            direction = (
                "increasing" if new_params.discrimination > old_params.discrimination
                else "decreasing"
            )

            return DriftAlert(
                item_id=old_params.item_id,
                drift_type=DriftType.DISCRIMINATION_CHANGE,
                magnitude=disc_change,
                old_value=old_params.discrimination,
                new_value=new_params.discrimination,
                detected_at=datetime.utcnow(),
                recommendation=self._get_discrimination_recommendation(
                    direction, disc_change
                ),
                confidence=confidence,
                supporting_data={
                    "relative_change": disc_change,
                    "direction": direction,
                    "old_calibration_n": old_params.calibration_n,
                    "new_calibration_n": new_params.calibration_n,
                }
            )

        return None

    def _check_guessing_drift(
        self,
        old_params: ItemParameters,
        new_params: ItemParameters
    ) -> Optional[DriftAlert]:
        """
        Check for anomalous guessing parameter changes.

        Significant changes in the guessing parameter may indicate:
        - Answer key errors
        - Item format issues
        - Test security breaches (if guessing increases)

        Args:
            old_params: Previous item parameters
            new_params: New item parameters

        Returns:
            DriftAlert if anomaly detected, None otherwise
        """
        abs_change = abs(new_params.guessing - old_params.guessing)

        # Check both absolute and relative thresholds
        relative_change = 0.0
        if old_params.guessing > 0.01:
            relative_change = abs_change / old_params.guessing

        exceeds_absolute = abs_change > self.config.guessing_absolute_threshold
        exceeds_relative = relative_change > self.config.guessing_relative_threshold

        if exceeds_absolute or exceeds_relative:
            confidence = self._calculate_confidence(
                old_params.calibration_n,
                new_params.calibration_n
            )

            direction = (
                "increasing" if new_params.guessing > old_params.guessing
                else "decreasing"
            )

            return DriftAlert(
                item_id=old_params.item_id,
                drift_type=DriftType.GUESSING_ANOMALY,
                magnitude=abs_change,
                old_value=old_params.guessing,
                new_value=new_params.guessing,
                detected_at=datetime.utcnow(),
                recommendation=self._get_guessing_recommendation(
                    direction, abs_change
                ),
                confidence=confidence,
                supporting_data={
                    "absolute_change": abs_change,
                    "relative_change": relative_change,
                    "direction": direction,
                    "exceeds_absolute_threshold": exceeds_absolute,
                    "exceeds_relative_threshold": exceeds_relative,
                }
            )

        return None

    def _calculate_confidence(
        self,
        old_n: int,
        new_n: int
    ) -> float:
        """
        Calculate confidence in drift detection based on sample sizes.

        Larger sample sizes lead to more confident drift detection.
        Uses a sigmoid-like function that approaches 1.0 for large samples.

        Args:
            old_n: Sample size for old parameters
            new_n: Sample size for new parameters

        Returns:
            Confidence value between 0 and 1
        """
        min_n = min(old_n, new_n)
        target_n = self.config.min_calibration_n

        if min_n >= target_n:
            return 1.0
        elif min_n <= 0:
            return 0.1
        else:
            # Sigmoid-like scaling
            ratio = min_n / target_n
            return 0.1 + 0.9 * ratio

    def _get_recommendation(
        self,
        drift_type: DriftType,
        magnitude: float
    ) -> str:
        """
        Generate recommendation based on drift pattern.

        Args:
            drift_type: Type of drift detected
            magnitude: Size of the drift

        Returns:
            Human-readable recommendation string
        """
        recommendations = {
            DriftType.DIFFICULTY_INCREASE: (
                "Item may have become harder due to curriculum changes, "
                "population shift, or increased prerequisite requirements. "
                "Review item content and consider if the target population "
                "has changed."
            ),
            DriftType.DIFFICULTY_DECREASE: (
                "Item may have become easier due to exposure/memorization, "
                "coaching effects, or improved instruction. "
                "Consider replacing or modifying the item if exposure is suspected."
            ),
        }

        base_recommendation = recommendations.get(
            drift_type,
            "Review item performance data for potential issues."
        )

        # Add severity note for large drifts
        if magnitude > 1.0:
            base_recommendation += (
                f" SEVERE: Drift of {magnitude:.2f} logits is very large. "
                "Consider immediate review or temporary item removal."
            )

        return base_recommendation

    def _get_discrimination_recommendation(
        self,
        direction: str,
        magnitude: float
    ) -> str:
        """
        Generate recommendation for discrimination drift.

        Args:
            direction: Whether discrimination is increasing or decreasing
            magnitude: Relative change magnitude

        Returns:
            Human-readable recommendation string
        """
        if direction == "decreasing":
            recommendation = (
                "Item discrimination is decreasing, which may indicate: "
                "ambiguous wording, multiple valid interpretations, "
                "or distractor issues. Review item for clarity and revise "
                "if needed."
            )
        else:
            recommendation = (
                "Item discrimination is increasing, which may indicate: "
                "improved item clarity, population homogeneity changes, "
                "or sampling variation. Monitor for consistency."
            )

        if magnitude > 0.5:
            recommendation += (
                f" NOTE: {magnitude:.0%} change is substantial. "
                "Prioritize review of this item."
            )

        return recommendation

    def _get_guessing_recommendation(
        self,
        direction: str,
        magnitude: float
    ) -> str:
        """
        Generate recommendation for guessing parameter drift.

        Args:
            direction: Whether guessing is increasing or decreasing
            magnitude: Absolute change magnitude

        Returns:
            Human-readable recommendation string
        """
        if direction == "increasing":
            recommendation = (
                "Guessing parameter is increasing, which may indicate: "
                "test security breach, answer sharing, or poor distractor "
                "quality. Investigate potential cheating and review distractors."
            )
        else:
            recommendation = (
                "Guessing parameter is decreasing, which may indicate: "
                "improved distractor effectiveness or population changes. "
                "Generally positive but verify calibration quality."
            )

        return recommendation

    def calculate_drift_summary(
        self,
        alerts: list[DriftAlert]
    ) -> dict:
        """
        Calculate summary statistics from a list of drift alerts.

        Args:
            alerts: List of drift alerts to summarize

        Returns:
            Dictionary with summary statistics
        """
        if not alerts:
            return {
                "total_alerts": 0,
                "by_type": {},
                "mean_magnitude": 0.0,
                "max_magnitude": 0.0,
                "affected_items": [],
            }

        by_type = {}
        for alert in alerts:
            type_name = alert.drift_type.value
            if type_name not in by_type:
                by_type[type_name] = []
            by_type[type_name].append(alert.item_id)

        magnitudes = [alert.magnitude for alert in alerts]

        return {
            "total_alerts": len(alerts),
            "by_type": {k: len(v) for k, v in by_type.items()},
            "affected_items_by_type": by_type,
            "mean_magnitude": sum(magnitudes) / len(magnitudes),
            "max_magnitude": max(magnitudes),
            "affected_items": list(set(a.item_id for a in alerts)),
        }
