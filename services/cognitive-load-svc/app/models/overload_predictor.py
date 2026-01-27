"""
Overload Predictor

Proactive warning system for cognitive overload.
Predicts overload based on:
- Current load trajectory
- Upcoming content complexity
- Learner fatigue indicators
- Historical patterns
"""

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class WarningLevel(str, Enum):
    """Warning severity levels."""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskFactor(str, Enum):
    """Types of risk factors."""
    HIGH_CURRENT_LOAD = "high_current_load"
    INCREASING_TREND = "increasing_trend"
    COMPLEX_UPCOMING = "complex_upcoming"
    FATIGUE = "fatigue"
    TIME_PRESSURE = "time_pressure"
    REPEATED_ERRORS = "repeated_errors"
    DECLINING_PERFORMANCE = "declining_performance"
    EXTENDED_SESSION = "extended_session"


@dataclass
class OverloadPrediction:
    """Prediction of cognitive overload."""
    overload_probability: float  # 0-1
    predicted_time_to_overload: Optional[float]  # seconds, None if not predicted
    warning_level: WarningLevel
    risk_factors: List[str]
    preventive_actions: List[str]
    confidence: float  # 0-1
    processing_time_ms: int


@dataclass
class LoadTrendAnalysis:
    """Analysis of load trends."""
    trend_direction: str  # increasing, stable, decreasing
    trend_slope: float  # rate of change
    volatility: float  # 0-1, how variable the load is
    stability_score: float  # 0-1
    predicted_load_5min: float
    predicted_load_15min: float
    anomalies: List[Dict[str, Any]]


@dataclass
class OverloadPredictorConfig:
    """Configuration for overload prediction."""
    # Thresholds
    overload_threshold: float = 0.9
    warning_threshold: float = 0.75
    high_warning_threshold: float = 0.85

    # Prediction parameters
    prediction_window_seconds: int = 300  # 5 minutes
    min_history_for_prediction: int = 5
    trend_sensitivity: float = 0.1

    # Fatigue parameters
    session_fatigue_onset_minutes: int = 30
    fatigue_load_multiplier: float = 1.2

    # Time pressure parameters
    time_pressure_threshold: float = 0.3  # <30% time remaining

    # Learning rate for adaptive predictions
    learning_rate: float = 0.1


class OverloadPredictor:
    """
    Predicts cognitive overload before it occurs.

    Uses multiple signals to predict when a learner is likely to
    experience cognitive overload, enabling proactive intervention.

    Key features:
    - Trend analysis of load history
    - Upcoming content complexity analysis
    - Fatigue detection
    - Multi-factor risk assessment
    - Adaptive prediction based on learner history

    Usage:
        predictor = OverloadPredictor()
        prediction = predictor.predict(
            learner_id="learner123",
            current_load=0.7,
            load_history=[0.5, 0.55, 0.6, 0.65, 0.7],
            upcoming_complexity=[0.8, 0.7, 0.6]
        )
        print(f"Overload probability: {prediction.overload_probability}")
        print(f"Warning level: {prediction.warning_level}")
    """

    def __init__(self, config: Optional[OverloadPredictorConfig] = None):
        self.config = config or OverloadPredictorConfig()

        # Learner-specific prediction history
        self._learner_history: Dict[str, Dict[str, Any]] = {}

        logger.info("OverloadPredictor initialized")

    def predict(
        self,
        learner_id: str,
        session_id: Optional[str] = None,
        current_load: float = 0.5,
        load_history: Optional[List[float]] = None,
        upcoming_content_complexity: Optional[List[float]] = None,
        time_remaining_seconds: Optional[float] = None,
        fatigue_indicators: Optional[Dict[str, float]] = None,
        session_duration_seconds: float = 0,
    ) -> OverloadPrediction:
        """
        Predict cognitive overload.

        Args:
            learner_id: Learner identifier
            session_id: Session identifier
            current_load: Current cognitive load (0-1)
            load_history: Recent load measurements
            upcoming_content_complexity: Complexity of upcoming content
            time_remaining_seconds: Time remaining in session/task
            fatigue_indicators: Fatigue indicator values
            session_duration_seconds: Duration of current session

        Returns:
            OverloadPrediction with probability, timing, and recommendations
        """
        start_time = time.time()

        load_history = load_history or []
        upcoming_content_complexity = upcoming_content_complexity or []
        fatigue_indicators = fatigue_indicators or {}

        # Get learner history for adaptive prediction
        learner_data = self._get_learner_data(learner_id)

        # Calculate risk factors
        risk_factors, risk_scores = self._assess_risk_factors(
            current_load=current_load,
            load_history=load_history,
            upcoming_complexity=upcoming_content_complexity,
            time_remaining=time_remaining_seconds,
            fatigue=fatigue_indicators,
            session_duration=session_duration_seconds,
            learner_data=learner_data,
        )

        # Calculate overload probability
        probability = self._calculate_overload_probability(
            current_load, risk_scores, learner_data
        )

        # Predict time to overload
        time_to_overload = self._predict_time_to_overload(
            current_load, load_history, upcoming_content_complexity
        )

        # Determine warning level
        warning_level = self._determine_warning_level(probability, current_load, risk_factors)

        # Generate preventive actions
        preventive_actions = self._generate_preventive_actions(
            warning_level, risk_factors, current_load
        )

        # Calculate confidence
        confidence = self._calculate_confidence(load_history, learner_data)

        # Update learner history
        self._update_learner_history(learner_id, current_load, probability)

        processing_time = int((time.time() - start_time) * 1000)

        return OverloadPrediction(
            overload_probability=probability,
            predicted_time_to_overload=time_to_overload,
            warning_level=warning_level,
            risk_factors=risk_factors,
            preventive_actions=preventive_actions,
            confidence=confidence,
            processing_time_ms=processing_time,
        )

    def analyze_trend(
        self,
        learner_id: str,
        session_id: Optional[str] = None,
        window_size_seconds: int = 300,
    ) -> LoadTrendAnalysis:
        """
        Analyze load trend over time.

        Args:
            learner_id: Learner identifier
            session_id: Session identifier
            window_size_seconds: Analysis window size

        Returns:
            LoadTrendAnalysis with trend information
        """
        learner_data = self._get_learner_data(learner_id)
        history = learner_data.get("load_history", [])

        if len(history) < self.config.min_history_for_prediction:
            return LoadTrendAnalysis(
                trend_direction="unknown",
                trend_slope=0.0,
                volatility=0.0,
                stability_score=1.0,
                predicted_load_5min=0.5,
                predicted_load_15min=0.5,
                anomalies=[],
            )

        # Extract load values
        loads = [h["load"] for h in history[-20:]]

        # Calculate trend
        slope = self._calculate_slope(loads)

        if slope > self.config.trend_sensitivity:
            direction = "increasing"
        elif slope < -self.config.trend_sensitivity:
            direction = "decreasing"
        else:
            direction = "stable"

        # Calculate volatility
        volatility = np.std(loads) if len(loads) > 1 else 0.0
        stability = 1.0 - min(1.0, volatility * 2)

        # Detect anomalies
        anomalies = self._detect_anomalies(loads)

        # Predict future load
        current = loads[-1] if loads else 0.5
        predicted_5min = min(1.0, max(0.0, current + slope * 5))
        predicted_15min = min(1.0, max(0.0, current + slope * 15))

        return LoadTrendAnalysis(
            trend_direction=direction,
            trend_slope=slope,
            volatility=volatility,
            stability_score=stability,
            predicted_load_5min=predicted_5min,
            predicted_load_15min=predicted_15min,
            anomalies=anomalies,
        )

    def get_early_warning_signals(
        self,
        current_load: float,
        load_history: List[float],
        threshold: float = 0.1,
    ) -> List[Dict[str, Any]]:
        """
        Identify early warning signals of impending overload.

        Args:
            current_load: Current cognitive load
            load_history: Historical load values
            threshold: Sensitivity threshold

        Returns:
            List of warning signals detected
        """
        signals = []

        if not load_history:
            return signals

        # Signal 1: Rapid load increase
        if len(load_history) >= 3:
            recent_increase = current_load - load_history[-3]
            if recent_increase > 0.2:
                signals.append({
                    "signal": "rapid_increase",
                    "severity": "high" if recent_increase > 0.3 else "medium",
                    "description": f"Load increased by {recent_increase:.2f} in recent samples",
                    "value": recent_increase,
                })

        # Signal 2: Approaching threshold
        if current_load > 0.7 and current_load < self.config.overload_threshold:
            distance_to_overload = self.config.overload_threshold - current_load
            signals.append({
                "signal": "approaching_threshold",
                "severity": "high" if distance_to_overload < 0.1 else "medium",
                "description": f"Only {distance_to_overload:.2f} from overload threshold",
                "value": distance_to_overload,
            })

        # Signal 3: Sustained high load
        if len(load_history) >= 5:
            recent = load_history[-5:]
            if all(l > 0.7 for l in recent):
                signals.append({
                    "signal": "sustained_high_load",
                    "severity": "high",
                    "description": "Load has been high for extended period",
                    "value": np.mean(recent),
                })

        # Signal 4: Load volatility
        if len(load_history) >= 4:
            volatility = np.std(load_history[-4:])
            if volatility > 0.15:
                signals.append({
                    "signal": "high_volatility",
                    "severity": "medium",
                    "description": f"Load is highly variable (std: {volatility:.2f})",
                    "value": volatility,
                })

        # Signal 5: No recovery periods
        if len(load_history) >= 10:
            below_50 = sum(1 for l in load_history[-10:] if l < 0.5)
            if below_50 == 0 and current_load > 0.6:
                signals.append({
                    "signal": "no_recovery",
                    "severity": "medium",
                    "description": "No low-load periods detected recently",
                    "value": below_50,
                })

        return signals

    def should_intervene(
        self,
        prediction: OverloadPrediction,
        intervention_threshold: float = 0.6,
    ) -> Tuple[bool, str]:
        """
        Determine if intervention is warranted.

        Args:
            prediction: Overload prediction
            intervention_threshold: Probability threshold for intervention

        Returns:
            Tuple of (should_intervene, reason)
        """
        # Immediate intervention needed
        if prediction.warning_level == WarningLevel.CRITICAL:
            return True, "Critical overload warning - immediate intervention required"

        if prediction.warning_level == WarningLevel.HIGH:
            return True, "High overload risk - intervention recommended"

        # Probability-based intervention
        if prediction.overload_probability >= intervention_threshold:
            return True, f"Overload probability ({prediction.overload_probability:.2f}) exceeds threshold"

        # Time-based intervention
        if prediction.predicted_time_to_overload is not None:
            if prediction.predicted_time_to_overload < 60:
                return True, "Overload predicted within 1 minute"

        return False, "No intervention needed at this time"

    def _get_learner_data(self, learner_id: str) -> Dict[str, Any]:
        """Get or create learner-specific data."""
        if learner_id not in self._learner_history:
            self._learner_history[learner_id] = {
                "load_history": [],
                "prediction_history": [],
                "overload_events": [],
                "accuracy_calibration": 1.0,
            }
        return self._learner_history[learner_id]

    def _update_learner_history(
        self,
        learner_id: str,
        current_load: float,
        probability: float,
    ) -> None:
        """Update learner history with new data."""
        data = self._get_learner_data(learner_id)

        data["load_history"].append({
            "load": current_load,
            "timestamp": datetime.utcnow().isoformat(),
        })

        data["prediction_history"].append({
            "probability": probability,
            "timestamp": datetime.utcnow().isoformat(),
        })

        # Keep history bounded
        max_history = 100
        if len(data["load_history"]) > max_history:
            data["load_history"] = data["load_history"][-max_history:]
        if len(data["prediction_history"]) > max_history:
            data["prediction_history"] = data["prediction_history"][-max_history:]

    def _assess_risk_factors(
        self,
        current_load: float,
        load_history: List[float],
        upcoming_complexity: List[float],
        time_remaining: Optional[float],
        fatigue: Dict[str, float],
        session_duration: float,
        learner_data: Dict[str, Any],
    ) -> Tuple[List[str], Dict[str, float]]:
        """Assess all risk factors for overload."""
        risk_factors = []
        risk_scores = {}

        # Risk 1: High current load
        if current_load > self.config.warning_threshold:
            risk_factors.append(RiskFactor.HIGH_CURRENT_LOAD.value)
            risk_scores[RiskFactor.HIGH_CURRENT_LOAD.value] = (
                current_load - self.config.warning_threshold
            ) / (1 - self.config.warning_threshold)

        # Risk 2: Increasing trend
        if len(load_history) >= 3:
            slope = self._calculate_slope(load_history[-5:] if len(load_history) >= 5 else load_history)
            if slope > self.config.trend_sensitivity:
                risk_factors.append(RiskFactor.INCREASING_TREND.value)
                risk_scores[RiskFactor.INCREASING_TREND.value] = min(1.0, slope * 5)

        # Risk 3: Complex upcoming content
        if upcoming_complexity:
            avg_upcoming = np.mean(upcoming_complexity)
            if avg_upcoming > 0.7:
                risk_factors.append(RiskFactor.COMPLEX_UPCOMING.value)
                risk_scores[RiskFactor.COMPLEX_UPCOMING.value] = avg_upcoming

        # Risk 4: Fatigue
        if fatigue:
            fatigue_score = np.mean(list(fatigue.values()))
            if fatigue_score > 0.5:
                risk_factors.append(RiskFactor.FATIGUE.value)
                risk_scores[RiskFactor.FATIGUE.value] = fatigue_score

        # Risk 5: Extended session
        session_minutes = session_duration / 60
        if session_minutes > self.config.session_fatigue_onset_minutes:
            risk_factors.append(RiskFactor.EXTENDED_SESSION.value)
            risk_scores[RiskFactor.EXTENDED_SESSION.value] = min(
                1.0, (session_minutes - self.config.session_fatigue_onset_minutes) / 30
            )

        # Risk 6: Time pressure
        if time_remaining is not None:
            # Estimate total time from what's remaining
            estimated_total = time_remaining / max(0.1, 1 - current_load)
            remaining_ratio = time_remaining / estimated_total if estimated_total > 0 else 1.0
            if remaining_ratio < self.config.time_pressure_threshold:
                risk_factors.append(RiskFactor.TIME_PRESSURE.value)
                risk_scores[RiskFactor.TIME_PRESSURE.value] = 1 - remaining_ratio

        return risk_factors, risk_scores

    def _calculate_overload_probability(
        self,
        current_load: float,
        risk_scores: Dict[str, float],
        learner_data: Dict[str, Any],
    ) -> float:
        """Calculate probability of overload."""
        # Base probability from current load
        if current_load >= self.config.overload_threshold:
            base_probability = 0.9
        elif current_load >= self.config.high_warning_threshold:
            base_probability = 0.6 + (current_load - self.config.high_warning_threshold) * 2
        elif current_load >= self.config.warning_threshold:
            base_probability = 0.3 + (current_load - self.config.warning_threshold) * 3
        else:
            base_probability = current_load * 0.4

        # Add risk factor contributions
        risk_contribution = sum(risk_scores.values()) * 0.1

        # Calibration factor from learner history
        calibration = learner_data.get("accuracy_calibration", 1.0)

        probability = (base_probability + risk_contribution) * calibration

        return min(1.0, max(0.0, probability))

    def _predict_time_to_overload(
        self,
        current_load: float,
        load_history: List[float],
        upcoming_complexity: List[float],
    ) -> Optional[float]:
        """Predict time until overload occurs."""
        if current_load >= self.config.overload_threshold:
            return 0.0  # Already in overload

        if len(load_history) < 2:
            return None  # Not enough data

        # Calculate rate of change
        slope = self._calculate_slope(load_history)

        if slope <= 0:
            return None  # Load is not increasing

        # Simple linear projection
        distance_to_overload = self.config.overload_threshold - current_load

        # Assuming each history point is ~1 second apart
        time_to_overload = distance_to_overload / slope * 60  # Convert to seconds

        # Adjust for upcoming complexity
        if upcoming_complexity:
            avg_complexity = np.mean(upcoming_complexity)
            complexity_factor = 1 - (avg_complexity - 0.5)  # Complex content accelerates
            time_to_overload *= complexity_factor

        return max(0.0, time_to_overload)

    def _determine_warning_level(
        self,
        probability: float,
        current_load: float,
        risk_factors: List[str],
    ) -> WarningLevel:
        """Determine appropriate warning level."""
        if probability >= 0.9 or current_load >= self.config.overload_threshold:
            return WarningLevel.CRITICAL

        if probability >= 0.7 or current_load >= self.config.high_warning_threshold:
            return WarningLevel.HIGH

        if probability >= 0.5 or current_load >= self.config.warning_threshold:
            return WarningLevel.MEDIUM

        if probability >= 0.3 or len(risk_factors) >= 2:
            return WarningLevel.LOW

        return WarningLevel.NONE

    def _generate_preventive_actions(
        self,
        warning_level: WarningLevel,
        risk_factors: List[str],
        current_load: float,
    ) -> List[str]:
        """Generate preventive actions based on risk assessment."""
        actions = []

        if warning_level == WarningLevel.CRITICAL:
            actions.append("Immediately reduce task complexity or take a break")
            actions.append("Remove all non-essential elements from the interface")
            actions.append("Provide explicit scaffolding for current task")

        elif warning_level == WarningLevel.HIGH:
            actions.append("Consider simplifying the current task")
            actions.append("Offer a short break or change of activity")
            actions.append("Reduce cognitive load by removing distractions")

        elif warning_level == WarningLevel.MEDIUM:
            actions.append("Monitor closely for signs of struggle")
            actions.append("Be ready to offer hints or scaffolding")

        # Risk-factor specific actions
        if RiskFactor.INCREASING_TREND.value in risk_factors:
            actions.append("Slow down content delivery pace")

        if RiskFactor.COMPLEX_UPCOMING.value in risk_factors:
            actions.append("Pre-teach key concepts before complex content")
            actions.append("Consider reordering content to intersperse easier items")

        if RiskFactor.FATIGUE.value in risk_factors:
            actions.append("Suggest a break to recover mental energy")
            actions.append("Switch to a less demanding activity")

        if RiskFactor.EXTENDED_SESSION.value in risk_factors:
            actions.append("Recommend ending the session soon")
            actions.append("Summarize key learnings before concluding")

        if RiskFactor.TIME_PRESSURE.value in risk_factors:
            actions.append("Reassess task scope and priorities")
            actions.append("Focus on most critical learning objectives")

        return actions[:5]  # Return top 5 most relevant actions

    def _calculate_confidence(
        self,
        load_history: List[float],
        learner_data: Dict[str, Any],
    ) -> float:
        """Calculate confidence in the prediction."""
        confidence = 0.5  # Base confidence

        # More history = higher confidence
        history_bonus = min(0.3, len(load_history) * 0.03)
        confidence += history_bonus

        # More learner data = higher confidence
        learner_history = learner_data.get("load_history", [])
        learner_bonus = min(0.2, len(learner_history) * 0.01)
        confidence += learner_bonus

        # Calibration factor
        calibration = learner_data.get("accuracy_calibration", 1.0)
        if 0.8 <= calibration <= 1.2:
            confidence += 0.1  # Good calibration

        return min(1.0, confidence)

    def _calculate_slope(self, values: List[float]) -> float:
        """Calculate the slope (rate of change) of a series."""
        if len(values) < 2:
            return 0.0

        n = len(values)
        x = np.arange(n)
        y = np.array(values)

        # Linear regression
        x_mean = np.mean(x)
        y_mean = np.mean(y)

        numerator = np.sum((x - x_mean) * (y - y_mean))
        denominator = np.sum((x - x_mean) ** 2)

        if denominator == 0:
            return 0.0

        return numerator / denominator

    def _detect_anomalies(self, values: List[float]) -> List[Dict[str, Any]]:
        """Detect anomalies in load values."""
        anomalies = []

        if len(values) < 5:
            return anomalies

        mean = np.mean(values)
        std = np.std(values)

        for i, value in enumerate(values):
            z_score = (value - mean) / std if std > 0 else 0

            if abs(z_score) > 2:
                anomalies.append({
                    "index": i,
                    "value": value,
                    "z_score": z_score,
                    "type": "spike" if z_score > 0 else "dip",
                })

        return anomalies
