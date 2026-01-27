"""
Load Estimator

Real-time cognitive load estimation from multimodal behavioral signals.
Integrates intrinsic, extraneous, and germane load components.
"""

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class LoadLevel(str, Enum):
    """Cognitive load level classification."""
    LOW = "low"
    OPTIMAL = "optimal"
    HIGH = "high"
    OVERLOAD = "overload"


@dataclass
class CognitiveLoadEstimate:
    """Complete cognitive load estimate."""
    intrinsic_load: float  # Task complexity (0-1)
    extraneous_load: float  # Poor design overhead (0-1)
    germane_load: float  # Schema building effort (0-1)
    total_load: float  # Combined load (0-1)
    load_level: LoadLevel = LoadLevel.OPTIMAL
    confidence: float = 0.5  # Estimation confidence (0-1)
    contributing_factors: Dict[str, float] = field(default_factory=dict)
    trend: str = "unknown"  # increasing, stable, decreasing
    recommendation: str = ""
    processing_time_ms: int = 0


@dataclass
class LoadEstimatorConfig:
    """Configuration for load estimation."""
    # Thresholds for load levels
    low_threshold: float = 0.3
    optimal_threshold: float = 0.7
    high_threshold: float = 0.85
    overload_threshold: float = 0.95

    # Signal weights for total load
    intrinsic_weight: float = 0.4
    extraneous_weight: float = 0.3
    germane_weight: float = 0.3

    # Behavioral signal weights
    response_time_weight: float = 0.25
    error_rate_weight: float = 0.25
    help_seeking_weight: float = 0.2
    backtracking_weight: float = 0.15
    hesitation_weight: float = 0.15

    # Response time parameters (in seconds)
    baseline_response_time: float = 3.0
    max_response_time: float = 30.0

    # Trend detection
    trend_window_size: int = 5
    trend_threshold: float = 0.1

    # Confidence parameters
    min_samples_for_high_confidence: int = 10


class LoadEstimator:
    """
    Estimates cognitive load from behavioral signals.

    Combines multiple signal types to estimate the three types
    of cognitive load:
    - Intrinsic: Inherent task complexity
    - Extraneous: Load from poor design
    - Germane: Productive learning effort

    Signals used:
    - Response time patterns
    - Error rates
    - Help-seeking behavior
    - Navigation/backtracking patterns
    - Hesitation indicators

    Usage:
        estimator = LoadEstimator()
        estimate = estimator.estimate(
            response_times=[2.5, 3.0, 4.5],
            error_rates=[0.0, 0.0, 0.5],
            help_requests=1,
            content_complexity=0.6
        )
        print(f"Total load: {estimate.total_load}")
        print(f"Level: {estimate.load_level}")
    """

    def __init__(self, config: Optional[LoadEstimatorConfig] = None):
        self.config = config or LoadEstimatorConfig()

        # Track load history per learner for trend analysis
        self._learner_history: Dict[str, List[Dict[str, Any]]] = {}

        logger.info("LoadEstimator initialized")

    def estimate(
        self,
        response_times: Optional[List[float]] = None,
        error_rates: Optional[List[float]] = None,
        help_requests: int = 0,
        learner_id: str = "",
        session_id: Optional[str] = None,
        backtracking_count: int = 0,
        time_on_task: float = 0.0,
        content_complexity: Optional[float] = None,
        extraneous_load_estimate: Optional[float] = None,
        interaction_signals: Optional[List[Dict[str, Any]]] = None,
    ) -> CognitiveLoadEstimate:
        """
        Estimate cognitive load from interaction data.

        Args:
            response_times: Response times in seconds
            error_rates: Error rates per task (0-1)
            help_requests: Number of help requests
            learner_id: Learner identifier
            session_id: Session identifier
            backtracking_count: Times learner went back
            time_on_task: Time spent on current task
            content_complexity: Known intrinsic complexity (0-1)
            extraneous_load_estimate: Known extraneous load (0-1)
            interaction_signals: Additional interaction signals

        Returns:
            CognitiveLoadEstimate with detailed breakdown
        """
        start_time = time.time()

        response_times = response_times or []
        error_rates = error_rates or []
        interaction_signals = interaction_signals or []

        # Estimate intrinsic load
        intrinsic = self._estimate_intrinsic_load(
            content_complexity, response_times, error_rates
        )

        # Estimate extraneous load
        extraneous = self._estimate_extraneous_load(
            extraneous_load_estimate, backtracking_count, help_requests
        )

        # Estimate germane load
        germane = self._estimate_germane_load(
            response_times, error_rates, time_on_task
        )

        # Calculate total load
        total = self._calculate_total_load(intrinsic, extraneous, germane)

        # Determine load level
        level = self._determine_load_level(total)

        # Identify contributing factors
        factors = self._identify_contributing_factors(
            response_times, error_rates, help_requests,
            backtracking_count, content_complexity
        )

        # Calculate confidence
        confidence = self._calculate_confidence(
            response_times, error_rates, content_complexity
        )

        # Determine trend
        trend = self._determine_trend(learner_id, total)

        # Generate recommendation
        recommendation = self._generate_recommendation(
            level, intrinsic, extraneous, factors
        )

        # Update history
        if learner_id:
            self._update_history(learner_id, total, intrinsic, extraneous, germane)

        processing_time = int((time.time() - start_time) * 1000)

        return CognitiveLoadEstimate(
            intrinsic_load=intrinsic,
            extraneous_load=extraneous,
            germane_load=germane,
            total_load=total,
            load_level=level,
            confidence=confidence,
            contributing_factors=factors,
            trend=trend,
            recommendation=recommendation,
            processing_time_ms=processing_time,
        )

    def estimate_quick(
        self,
        learner_id: str,
        current_task_complexity: float,
        recent_performance: float = 0.5,
    ) -> Tuple[float, LoadLevel]:
        """
        Quick load estimate without full analysis.

        Args:
            learner_id: Learner identifier
            current_task_complexity: Task complexity (0-1)
            recent_performance: Recent performance (0-1, higher is better)

        Returns:
            Tuple of (load_estimate, load_level)
        """
        # Simple estimation based on complexity and performance
        # Lower performance with high complexity = higher load
        inverse_performance = 1 - recent_performance
        load = (current_task_complexity * 0.6 + inverse_performance * 0.4)

        level = self._determine_load_level(load)

        return load, level

    def get_load_history(
        self,
        learner_id: str,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get load history for a learner.

        Args:
            learner_id: Learner identifier
            session_id: Optional session filter

        Returns:
            Load history dictionary
        """
        history = self._learner_history.get(learner_id, [])

        if not history:
            return {
                "learner_id": learner_id,
                "session_id": session_id,
                "load_history": [],
                "average_load": 0.0,
                "peak_load": 0.0,
                "time_in_overload_seconds": 0.0,
                "load_pattern": "unknown",
            }

        loads = [h["total_load"] for h in history]

        # Calculate time in overload (assuming 1 sample per second approx)
        overload_samples = sum(1 for l in loads if l > self.config.high_threshold)
        time_in_overload = overload_samples  # Approximate seconds

        # Detect pattern
        pattern = self._detect_pattern(loads)

        return {
            "learner_id": learner_id,
            "session_id": session_id,
            "load_history": history[-20:],  # Last 20 samples
            "average_load": float(np.mean(loads)),
            "peak_load": float(max(loads)),
            "time_in_overload_seconds": float(time_in_overload),
            "load_pattern": pattern,
        }

    def track_over_time(
        self,
        learner_id: str,
        estimates: List[CognitiveLoadEstimate],
    ) -> Dict[str, Any]:
        """
        Track load trends over a session.

        Args:
            learner_id: Learner identifier
            estimates: List of load estimates

        Returns:
            Trend analysis dictionary
        """
        if not estimates:
            return {
                "trend": "unknown",
                "average_load": 0.0,
                "load_variance": 0.0,
                "overload_count": 0,
                "recommendations": [],
            }

        loads = [e.total_load for e in estimates]

        # Calculate statistics
        avg = float(np.mean(loads))
        variance = float(np.var(loads))

        # Count overload periods
        overload_count = sum(1 for e in estimates if e.load_level == LoadLevel.OVERLOAD)

        # Determine overall trend
        trend = self._calculate_overall_trend(loads)

        # Generate session recommendations
        recommendations = self._generate_session_recommendations(
            avg, variance, overload_count, trend
        )

        return {
            "trend": trend,
            "average_load": avg,
            "load_variance": variance,
            "overload_count": overload_count,
            "time_in_optimal": sum(1 for e in estimates if e.load_level == LoadLevel.OPTIMAL),
            "recommendations": recommendations,
        }

    def estimate_from_biometrics(
        self,
        heart_rate: Optional[List[float]] = None,
        pupil_dilation: Optional[List[float]] = None,
        skin_conductance: Optional[List[float]] = None,
    ) -> Optional[CognitiveLoadEstimate]:
        """
        Estimate load from biometric data (if available).

        Biometric signals can provide additional load indicators:
        - Heart rate variability correlates with cognitive effort
        - Pupil dilation indicates processing load
        - Skin conductance shows arousal/stress

        Args:
            heart_rate: Heart rate values (BPM)
            pupil_dilation: Pupil diameter measurements
            skin_conductance: Skin conductance values

        Returns:
            Load estimate or None if insufficient data
        """
        if not any([heart_rate, pupil_dilation, skin_conductance]):
            return None

        start_time = time.time()
        load_signals = []

        # Heart rate analysis
        if heart_rate and len(heart_rate) >= 3:
            # Higher variability often indicates lower load
            hr_std = float(np.std(heart_rate))
            hr_mean = float(np.mean(heart_rate))

            # Elevated HR with low variability suggests high load
            hr_load = 0.5
            if hr_mean > 80:  # Elevated
                hr_load += 0.2
            if hr_std < 5:  # Low variability
                hr_load += 0.2

            load_signals.append(hr_load)

        # Pupil dilation analysis
        if pupil_dilation and len(pupil_dilation) >= 3:
            # Larger pupils indicate higher cognitive load
            pupil_mean = float(np.mean(pupil_dilation))
            # Normalize (assuming typical range 2-8mm)
            pupil_load = min(1.0, (pupil_mean - 2) / 6)
            load_signals.append(pupil_load)

        # Skin conductance analysis
        if skin_conductance and len(skin_conductance) >= 3:
            # Higher conductance indicates arousal/stress
            sc_mean = float(np.mean(skin_conductance))
            sc_std = float(np.std(skin_conductance))

            # Normalize and combine
            sc_load = min(1.0, sc_mean / 10)  # Assuming typical range
            if sc_std > 1:  # High variability suggests fluctuating load
                sc_load = min(1.0, sc_load + 0.1)

            load_signals.append(sc_load)

        if not load_signals:
            return None

        # Combine signals
        total_load = float(np.mean(load_signals))
        level = self._determine_load_level(total_load)

        processing_time = int((time.time() - start_time) * 1000)

        return CognitiveLoadEstimate(
            intrinsic_load=total_load * 0.6,  # Approximate split
            extraneous_load=total_load * 0.2,
            germane_load=total_load * 0.2,
            total_load=total_load,
            load_level=level,
            confidence=0.6,  # Lower confidence for biometric-only
            contributing_factors={
                "biometric_signals": float(len(load_signals)),
            },
            trend="unknown",
            recommendation=self._generate_recommendation(
                level, total_load * 0.6, total_load * 0.2, {}
            ),
            processing_time_ms=processing_time,
        )

    def _estimate_intrinsic_load(
        self,
        content_complexity: Optional[float],
        response_times: List[float],
        error_rates: List[float],
    ) -> float:
        """Estimate intrinsic load component."""
        if content_complexity is not None:
            # Use provided complexity as base
            intrinsic = content_complexity
        else:
            intrinsic = 0.5  # Default moderate complexity

        # Adjust based on behavioral indicators
        if response_times:
            avg_rt = float(np.mean(response_times))
            # Longer response times suggest higher intrinsic load
            rt_factor = min(1.0, avg_rt / self.config.max_response_time)
            intrinsic = 0.6 * intrinsic + 0.4 * rt_factor

        if error_rates:
            avg_error = float(np.mean(error_rates))
            # Higher error rates suggest content too complex
            intrinsic = 0.7 * intrinsic + 0.3 * avg_error

        return min(1.0, max(0.0, intrinsic))

    def _estimate_extraneous_load(
        self,
        extraneous_estimate: Optional[float],
        backtracking: int,
        help_requests: int,
    ) -> float:
        """Estimate extraneous load component."""
        if extraneous_estimate is not None:
            extraneous = extraneous_estimate
        else:
            extraneous = 0.2  # Default low extraneous

        # Backtracking suggests navigation/UI issues
        backtrack_factor = min(0.3, backtracking * 0.05)
        extraneous = min(1.0, extraneous + backtrack_factor)

        # Many help requests might indicate poor instructions
        help_factor = min(0.2, help_requests * 0.05)
        extraneous = min(1.0, extraneous + help_factor)

        return min(1.0, max(0.0, extraneous))

    def _estimate_germane_load(
        self,
        response_times: List[float],
        error_rates: List[float],
        time_on_task: float,
    ) -> float:
        """Estimate germane (productive) load component."""
        germane = 0.3  # Base germane load

        if response_times and len(response_times) >= 2:
            # Improving response times suggest active learning
            if response_times[-1] < response_times[0]:
                germane += 0.2

        if error_rates and len(error_rates) >= 2:
            # Decreasing errors suggest schema formation
            if error_rates[-1] < error_rates[0]:
                germane += 0.2

        # Sustained engagement suggests productive effort
        if time_on_task > 60:  # More than a minute
            germane += 0.1

        return min(1.0, max(0.0, germane))

    def _calculate_total_load(
        self,
        intrinsic: float,
        extraneous: float,
        germane: float,
    ) -> float:
        """Calculate total cognitive load."""
        # Total load is sum of components, but germane is beneficial
        # so we weight it differently
        raw_total = (
            self.config.intrinsic_weight * intrinsic +
            self.config.extraneous_weight * extraneous +
            self.config.germane_weight * (germane * 0.5)  # Germane contributes less to total
        )

        # Normalize
        return min(1.0, max(0.0, raw_total * 1.5))  # Scale up

    def _determine_load_level(self, load: float) -> LoadLevel:
        """Determine load level from score."""
        if load <= self.config.low_threshold:
            return LoadLevel.LOW
        elif load <= self.config.optimal_threshold:
            return LoadLevel.OPTIMAL
        elif load <= self.config.high_threshold:
            return LoadLevel.HIGH
        else:
            return LoadLevel.OVERLOAD

    def _identify_contributing_factors(
        self,
        response_times: List[float],
        error_rates: List[float],
        help_requests: int,
        backtracking: int,
        content_complexity: Optional[float],
    ) -> Dict[str, float]:
        """Identify factors contributing to cognitive load."""
        factors: Dict[str, float] = {}

        if response_times:
            avg_rt = float(np.mean(response_times))
            factors["response_time"] = min(1.0, avg_rt / self.config.max_response_time)

            if len(response_times) >= 3:
                # Response time variability
                rt_std = float(np.std(response_times))
                factors["response_variability"] = min(1.0, rt_std / 5)

        if error_rates:
            factors["error_rate"] = float(np.mean(error_rates))

        if help_requests > 0:
            factors["help_seeking"] = min(1.0, help_requests / 5)

        if backtracking > 0:
            factors["backtracking"] = min(1.0, backtracking / 10)

        if content_complexity is not None:
            factors["content_complexity"] = content_complexity

        return factors

    def _calculate_confidence(
        self,
        response_times: List[float],
        error_rates: List[float],
        content_complexity: Optional[float],
    ) -> float:
        """Calculate confidence in the estimate."""
        confidence = 0.5  # Base confidence

        # More data = higher confidence
        data_points = len(response_times) + len(error_rates)
        data_bonus = min(0.3, data_points * 0.02)
        confidence += data_bonus

        # Known content complexity increases confidence
        if content_complexity is not None:
            confidence += 0.15

        # Consistency in signals increases confidence
        if response_times and len(response_times) >= 3:
            rt_mean = float(np.mean(response_times))
            rt_cv = float(np.std(response_times)) / rt_mean if rt_mean > 0 else 1
            if rt_cv < 0.3:  # Low coefficient of variation
                confidence += 0.1

        return min(1.0, confidence)

    def _determine_trend(self, learner_id: str, current_load: float) -> str:
        """Determine load trend."""
        if not learner_id:
            return "unknown"

        history = self._learner_history.get(learner_id, [])

        if len(history) < self.config.trend_window_size:
            return "unknown"

        recent_loads = [h["total_load"] for h in history[-self.config.trend_window_size:]]
        recent_loads.append(current_load)

        # Simple linear trend
        slope = self._calculate_slope(recent_loads)

        if slope > self.config.trend_threshold:
            return "increasing"
        elif slope < -self.config.trend_threshold:
            return "decreasing"
        else:
            return "stable"

    def _calculate_slope(self, values: List[float]) -> float:
        """Calculate slope of values."""
        if len(values) < 2:
            return 0.0

        n = len(values)
        x = np.arange(n)
        y = np.array(values)

        x_mean = float(np.mean(x))
        y_mean = float(np.mean(y))

        numerator = float(np.sum((x - x_mean) * (y - y_mean)))
        denominator = float(np.sum((x - x_mean) ** 2))

        return numerator / denominator if denominator != 0 else 0.0

    def _generate_recommendation(
        self,
        level: LoadLevel,
        intrinsic: float,
        extraneous: float,
        factors: Dict[str, float],
    ) -> str:
        """Generate primary recommendation."""
        if level == LoadLevel.OVERLOAD:
            if extraneous > 0.5:
                return "Reduce extraneous load by simplifying the interface or presentation"
            else:
                return "Take a break or simplify the task - cognitive capacity is exceeded"

        elif level == LoadLevel.HIGH:
            if intrinsic > 0.7:
                return "Consider breaking down this complex content into smaller chunks"
            else:
                return "Provide scaffolding support to reduce current cognitive demands"

        elif level == LoadLevel.OPTIMAL:
            return "Current load is optimal for learning - maintain this level"

        else:  # LOW
            if factors.get("content_complexity", 0) < 0.3:
                return "Consider introducing more challenging content to maximize learning"
            return "Load is low - good opportunity to introduce new concepts"

    def _update_history(
        self,
        learner_id: str,
        total: float,
        intrinsic: float,
        extraneous: float,
        germane: float,
    ) -> None:
        """Update learner load history."""
        if learner_id not in self._learner_history:
            self._learner_history[learner_id] = []

        self._learner_history[learner_id].append({
            "total_load": total,
            "intrinsic": intrinsic,
            "extraneous": extraneous,
            "germane": germane,
            "timestamp": datetime.utcnow().isoformat(),
        })

        # Keep history bounded
        max_history = 100
        if len(self._learner_history[learner_id]) > max_history:
            self._learner_history[learner_id] = \
                self._learner_history[learner_id][-max_history:]

    def _detect_pattern(self, loads: List[float]) -> str:
        """Detect load pattern."""
        if len(loads) < 5:
            return "insufficient_data"

        # Check for monotonic increase
        increasing = all(loads[i] <= loads[i+1] for i in range(len(loads)-1))
        if increasing:
            return "monotonic_increase"

        # Check for monotonic decrease
        decreasing = all(loads[i] >= loads[i+1] for i in range(len(loads)-1))
        if decreasing:
            return "monotonic_decrease"

        # Check for oscillation
        changes = [loads[i+1] - loads[i] for i in range(len(loads)-1)]
        sign_changes = sum(1 for i in range(len(changes)-1)
                         if changes[i] * changes[i+1] < 0)
        if sign_changes > len(changes) * 0.6:
            return "oscillating"

        # Check variance
        variance = float(np.var(loads))
        if variance < 0.01:
            return "stable"

        return "variable"

    def _calculate_overall_trend(self, loads: List[float]) -> str:
        """Calculate overall trend for session."""
        if len(loads) < 3:
            return "unknown"

        # Compare first third to last third
        third = len(loads) // 3
        first_avg = float(np.mean(loads[:third]))
        last_avg = float(np.mean(loads[-third:]))

        diff = last_avg - first_avg
        if diff > 0.1:
            return "increasing"
        elif diff < -0.1:
            return "decreasing"
        else:
            return "stable"

    def _generate_session_recommendations(
        self,
        avg: float,
        variance: float,
        overload_count: int,
        trend: str,
    ) -> List[str]:
        """Generate session-level recommendations."""
        recommendations = []

        if overload_count > 3:
            recommendations.append("Session had frequent overload events - consider shorter sessions or simpler content")

        if avg > 0.8:
            recommendations.append("Average load was very high - introduce more breaks and scaffolding")
        elif avg < 0.3:
            recommendations.append("Load was consistently low - increase content difficulty for better learning")

        if variance > 0.1:
            recommendations.append("Load was highly variable - consider more consistent content pacing")

        if trend == "increasing":
            recommendations.append("Load increased throughout session - consider ending sessions earlier")
        elif trend == "decreasing":
            recommendations.append("Good adaptation observed - load decreased as learning progressed")

        if not recommendations:
            recommendations.append("Session load was well-managed overall")

        return recommendations
