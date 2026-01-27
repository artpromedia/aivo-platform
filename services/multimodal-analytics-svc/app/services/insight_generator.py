"""
Insight Generator

Generate actionable insights from multimodal analytics data.
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


class InsightCategory(Enum):
    """Categories of insights."""
    LEARNING = "learning"
    ENGAGEMENT = "engagement"
    EMOTIONAL = "emotional"
    SOCIAL = "social"
    BEHAVIORAL = "behavioral"
    PERFORMANCE = "performance"


class AnomalyType(Enum):
    """Types of detected anomalies."""
    SUDDEN_DROP = "sudden_drop"
    SUDDEN_SPIKE = "sudden_spike"
    PATTERN_BREAK = "pattern_break"
    OUTLIER = "outlier"
    TREND_REVERSAL = "trend_reversal"


@dataclass
class Insight:
    """Represents an actionable insight."""
    category: str  # learning, engagement, emotional, social
    finding: str
    confidence: float
    action_items: List[str]
    evidence: List[str]
    priority: str = "medium"
    impact_score: float = 0.5


@dataclass
class Anomaly:
    """Represents a detected anomaly."""
    anomaly_type: str
    metric: str
    severity: str  # low, medium, high
    description: str
    timestamp: Optional[str] = None
    value: Optional[float] = None
    expected_range: Optional[Tuple[float, float]] = None


@dataclass
class OutcomePrediction:
    """Prediction for learning outcomes."""
    outcome_type: str
    prediction: str
    probability: float
    confidence_interval: Tuple[float, float]
    contributing_factors: List[str]
    recommendations: List[str]


class InsightGenerator:
    """
    Generate actionable insights from multimodal analytics.

    Insight types:
    - Learning patterns
    - Engagement indicators
    - Emotional states
    - Social dynamics

    Usage:
        generator = InsightGenerator()
        insights = generator.generate_insights(analytics_data)
        anomalies = generator.identify_anomalies(time_series_data)
        predictions = generator.predict_outcomes(learner_data)
    """

    # Thresholds for insight generation
    INSIGHT_THRESHOLDS = {
        "high_engagement": 0.75,
        "low_engagement": 0.35,
        "high_performance": 0.80,
        "at_risk": 0.40,
        "anomaly_z_score": 2.5,
    }

    # Insight templates for different categories
    INSIGHT_TEMPLATES = {
        "learning": {
            "strong_progress": "Learner shows strong progress in {area}",
            "struggling": "Learner appears to struggle with {area}",
            "breakthrough": "Significant improvement detected in {area}",
            "plateau": "Learning progress has plateaued in {area}",
        },
        "engagement": {
            "highly_engaged": "Learner demonstrates high engagement with {content_type}",
            "declining_engagement": "Engagement has been declining over the past {period}",
            "peak_times": "Learner is most engaged during {time_period}",
            "content_preference": "Learner prefers {preferred_type} over {other_type}",
        },
        "emotional": {
            "positive_sentiment": "Learner shows positive emotional indicators",
            "frustration_detected": "Signs of frustration detected during {activity}",
            "confidence_growing": "Learner's confidence appears to be growing",
            "anxiety_indicators": "Potential anxiety indicators detected",
        },
        "behavioral": {
            "consistent_habits": "Learner maintains consistent study habits",
            "irregular_patterns": "Irregular learning patterns detected",
            "improvement_trend": "Behavioral improvement trend observed",
        },
    }

    def __init__(
        self,
        confidence_threshold: float = 0.6,
        anomaly_sensitivity: float = 2.0,
    ):
        """
        Initialize the InsightGenerator.

        Args:
            confidence_threshold: Minimum confidence for generating insights
            anomaly_sensitivity: Z-score threshold for anomaly detection
        """
        self.confidence_threshold = confidence_threshold
        self.anomaly_sensitivity = anomaly_sensitivity
        logger.info("InsightGenerator initialized")

    def generate_insights(
        self,
        analytics_data: Dict[str, Any],
    ) -> List[Insight]:
        """
        Generate actionable insights from analytics data.

        Args:
            analytics_data: Dictionary containing multimodal analytics results.
                Expected keys: engagement, performance, emotional, behavioral, etc.

        Returns:
            List of Insight objects.
        """
        insights = []

        # Generate learning insights
        learning_insights = self._generate_learning_insights(analytics_data)
        insights.extend(learning_insights)

        # Generate engagement insights
        engagement_insights = self._generate_engagement_insights(analytics_data)
        insights.extend(engagement_insights)

        # Generate emotional insights
        emotional_insights = self._generate_emotional_insights(analytics_data)
        insights.extend(emotional_insights)

        # Generate behavioral insights
        behavioral_insights = self._generate_behavioral_insights(analytics_data)
        insights.extend(behavioral_insights)

        # Filter by confidence threshold
        insights = [i for i in insights if i.confidence >= self.confidence_threshold]

        # Sort by impact and priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        insights.sort(key=lambda i: (priority_order.get(i.priority, 1), -i.impact_score))

        logger.info(f"Generated {len(insights)} insights")
        return insights

    def generate(
        self,
        analytics_data: Dict[str, Any],
    ) -> List[Insight]:
        """
        Generate insights from analytics (alias for generate_insights).

        Args:
            analytics_data: Dictionary containing analytics results.

        Returns:
            List of Insight objects.
        """
        return self.generate_insights(analytics_data)

    def identify_anomalies(
        self,
        data: Dict[str, Any],
        time_series_data: Optional[Dict[str, List[float]]] = None,
    ) -> List[Anomaly]:
        """
        Identify learning anomalies in the data.

        Args:
            data: Dictionary containing learner data.
            time_series_data: Optional time series data for trend analysis.

        Returns:
            List of Anomaly objects.
        """
        anomalies = []
        time_series_data = time_series_data or {}

        # Extract time series from data if not provided separately
        if not time_series_data:
            time_series_data = self._extract_time_series(data)

        # Detect statistical anomalies
        for metric, series in time_series_data.items():
            if len(series) < 5:
                continue

            # Detect outliers using Z-score
            outliers = self._detect_outliers(series, metric)
            anomalies.extend(outliers)

            # Detect sudden changes
            sudden_changes = self._detect_sudden_changes(series, metric)
            anomalies.extend(sudden_changes)

            # Detect trend reversals
            trend_reversals = self._detect_trend_reversals(series, metric)
            anomalies.extend(trend_reversals)

        # Detect pattern breaks
        pattern_breaks = self._detect_pattern_breaks(data)
        anomalies.extend(pattern_breaks)

        # Sort by severity
        severity_order = {"high": 0, "medium": 1, "low": 2}
        anomalies.sort(key=lambda a: severity_order.get(a.severity, 1))

        logger.info(f"Identified {len(anomalies)} anomalies")
        return anomalies

    def predict_outcomes(
        self,
        learner_data: Dict[str, Any],
        historical_data: Optional[List[Dict[str, Any]]] = None,
    ) -> List[OutcomePrediction]:
        """
        Predict learning outcomes based on current data.

        Args:
            learner_data: Current learner analytics data.
            historical_data: Optional historical data for trend analysis.

        Returns:
            List of OutcomePrediction objects.
        """
        predictions = []

        # Predict completion likelihood
        completion_prediction = self._predict_completion(learner_data, historical_data)
        if completion_prediction:
            predictions.append(completion_prediction)

        # Predict performance level
        performance_prediction = self._predict_performance(learner_data, historical_data)
        if performance_prediction:
            predictions.append(performance_prediction)

        # Predict engagement trajectory
        engagement_prediction = self._predict_engagement_trajectory(learner_data, historical_data)
        if engagement_prediction:
            predictions.append(engagement_prediction)

        # Predict at-risk status
        risk_prediction = self._predict_at_risk_status(learner_data, historical_data)
        if risk_prediction:
            predictions.append(risk_prediction)

        logger.info(f"Generated {len(predictions)} outcome predictions")
        return predictions

    def prioritize(
        self,
        insights: List[Insight],
    ) -> List[Insight]:
        """
        Prioritize insights by actionability and impact.

        Args:
            insights: List of insights to prioritize.

        Returns:
            Sorted list of insights by priority.
        """
        # Score each insight
        scored_insights = []
        for insight in insights:
            score = self._compute_priority_score(insight)
            scored_insights.append((insight, score))

        # Sort by score
        scored_insights.sort(key=lambda x: x[1], reverse=True)

        # Update priorities based on ranking
        result = []
        for i, (insight, score) in enumerate(scored_insights):
            if i < len(scored_insights) * 0.2:
                insight.priority = "high"
            elif i < len(scored_insights) * 0.5:
                insight.priority = "medium"
            else:
                insight.priority = "low"
            result.append(insight)

        return result

    def format_for_audience(
        self,
        insights: List[Insight],
        audience: str = "teacher",
    ) -> str:
        """
        Format insights for specific audience.

        Args:
            insights: List of insights to format.
            audience: Target audience ("teacher", "learner", "parent", "admin").

        Returns:
            Formatted insights string.
        """
        if audience == "learner":
            return self._format_for_learner(insights)
        elif audience == "parent":
            return self._format_for_parent(insights)
        elif audience == "admin":
            return self._format_for_admin(insights)
        else:
            return self._format_for_teacher(insights)

    def _generate_learning_insights(
        self,
        data: Dict[str, Any],
    ) -> List[Insight]:
        """Generate learning-related insights."""
        insights = []

        # Check performance indicators
        performance = data.get("performance", data.get("score", 0.5))
        if isinstance(performance, (list, np.ndarray)):
            performance = float(np.mean(performance))

        if performance > self.INSIGHT_THRESHOLDS["high_performance"]:
            insights.append(Insight(
                category="learning",
                finding="Learner demonstrates excellent performance",
                confidence=0.8,
                action_items=[
                    "Consider advanced or enrichment activities",
                    "Explore opportunities for peer tutoring",
                ],
                evidence=[f"Performance score: {performance:.0%}"],
                priority="medium",
                impact_score=0.7,
            ))
        elif performance < self.INSIGHT_THRESHOLDS["at_risk"]:
            insights.append(Insight(
                category="learning",
                finding="Learner may need additional support",
                confidence=0.85,
                action_items=[
                    "Schedule one-on-one support session",
                    "Review foundational concepts",
                    "Provide additional practice materials",
                ],
                evidence=[f"Performance score: {performance:.0%}"],
                priority="high",
                impact_score=0.9,
            ))

        # Check progress metrics
        progress = data.get("progress", {})
        if isinstance(progress, dict):
            completion_rate = progress.get("completion_rate", 0.5)
            if completion_rate < 0.3:
                insights.append(Insight(
                    category="learning",
                    finding="Low completion rate detected",
                    confidence=0.75,
                    action_items=[
                        "Investigate potential barriers to completion",
                        "Consider breaking content into smaller chunks",
                    ],
                    evidence=[f"Completion rate: {completion_rate:.0%}"],
                    priority="high",
                    impact_score=0.8,
                ))

        return insights

    def _generate_engagement_insights(
        self,
        data: Dict[str, Any],
    ) -> List[Insight]:
        """Generate engagement-related insights."""
        insights = []

        # Check engagement level
        engagement = data.get("engagement", data.get("engagement_score", 0.5))
        if isinstance(engagement, (list, np.ndarray)):
            engagement = float(np.mean(engagement))

        if engagement > self.INSIGHT_THRESHOLDS["high_engagement"]:
            insights.append(Insight(
                category="engagement",
                finding="Learner shows high engagement levels",
                confidence=0.8,
                action_items=[
                    "Maintain current engagement strategies",
                    "Introduce new challenges to sustain interest",
                ],
                evidence=[f"Engagement score: {engagement:.0%}"],
                priority="low",
                impact_score=0.6,
            ))
        elif engagement < self.INSIGHT_THRESHOLDS["low_engagement"]:
            insights.append(Insight(
                category="engagement",
                finding="Engagement levels are concerning",
                confidence=0.8,
                action_items=[
                    "Incorporate more interactive elements",
                    "Connect content to learner interests",
                    "Review content presentation format",
                ],
                evidence=[f"Engagement score: {engagement:.0%}"],
                priority="high",
                impact_score=0.85,
            ))

        # Check session patterns
        session_data = data.get("session", {})
        if isinstance(session_data, dict):
            avg_duration = session_data.get("average_duration", 0)
            if avg_duration < 5:  # Less than 5 minutes
                insights.append(Insight(
                    category="engagement",
                    finding="Short session durations indicate potential engagement issues",
                    confidence=0.7,
                    action_items=[
                        "Review content pacing",
                        "Add hooks at session start",
                    ],
                    evidence=[f"Average session: {avg_duration:.1f} minutes"],
                    priority="medium",
                    impact_score=0.7,
                ))

        return insights

    def _generate_emotional_insights(
        self,
        data: Dict[str, Any],
    ) -> List[Insight]:
        """Generate emotional-related insights."""
        insights = []

        # Check emotional indicators
        emotional = data.get("emotional", data.get("sentiment", {}))

        if isinstance(emotional, dict):
            frustration = emotional.get("frustration", 0)
            if frustration > 0.6:
                insights.append(Insight(
                    category="emotional",
                    finding="Signs of learner frustration detected",
                    confidence=0.75,
                    action_items=[
                        "Provide additional guidance or hints",
                        "Simplify current task or provide scaffolding",
                        "Check in with learner directly",
                    ],
                    evidence=[f"Frustration indicator: {frustration:.0%}"],
                    priority="high",
                    impact_score=0.85,
                ))

            confidence = emotional.get("confidence", 0.5)
            if confidence < 0.3:
                insights.append(Insight(
                    category="emotional",
                    finding="Learner may lack confidence",
                    confidence=0.7,
                    action_items=[
                        "Provide positive reinforcement",
                        "Start with easier tasks to build confidence",
                        "Celebrate small achievements",
                    ],
                    evidence=[f"Confidence indicator: {confidence:.0%}"],
                    priority="medium",
                    impact_score=0.75,
                ))

        return insights

    def _generate_behavioral_insights(
        self,
        data: Dict[str, Any],
    ) -> List[Insight]:
        """Generate behavioral insights."""
        insights = []

        # Check study patterns
        behavioral = data.get("behavioral", data.get("habits", {}))

        if isinstance(behavioral, dict):
            regularity = behavioral.get("regularity", behavioral.get("session_regularity", 0.5))
            if regularity > 0.8:
                insights.append(Insight(
                    category="behavioral",
                    finding="Learner maintains excellent study habits",
                    confidence=0.8,
                    action_items=[
                        "Acknowledge and reinforce positive habits",
                        "Consider as model for other learners",
                    ],
                    evidence=[f"Regularity score: {regularity:.0%}"],
                    priority="low",
                    impact_score=0.5,
                ))
            elif regularity < 0.3:
                insights.append(Insight(
                    category="behavioral",
                    finding="Irregular study patterns detected",
                    confidence=0.75,
                    action_items=[
                        "Help establish consistent study schedule",
                        "Set up regular reminders",
                        "Discuss time management strategies",
                    ],
                    evidence=[f"Regularity score: {regularity:.0%}"],
                    priority="medium",
                    impact_score=0.7,
                ))

        return insights

    def _extract_time_series(
        self,
        data: Dict[str, Any],
    ) -> Dict[str, List[float]]:
        """Extract time series data from nested dictionary."""
        time_series = {}

        for key, value in data.items():
            if isinstance(value, (list, np.ndarray)):
                arr = np.asarray(value, dtype=np.float64).flatten()
                if len(arr) > 1 and not np.all(np.isnan(arr)):
                    time_series[key] = arr.tolist()
            elif isinstance(value, dict):
                for sub_key, sub_value in value.items():
                    if isinstance(sub_value, (list, np.ndarray)):
                        arr = np.asarray(sub_value, dtype=np.float64).flatten()
                        if len(arr) > 1 and not np.all(np.isnan(arr)):
                            time_series[f"{key}_{sub_key}"] = arr.tolist()

        return time_series

    def _detect_outliers(
        self,
        series: List[float],
        metric: str,
    ) -> List[Anomaly]:
        """Detect outliers using Z-score method."""
        anomalies = []
        arr = np.asarray(series, dtype=np.float64)

        mean = np.mean(arr)
        std = np.std(arr)

        if std < 1e-10:
            return anomalies

        z_scores = np.abs((arr - mean) / std)

        for i, (value, z) in enumerate(zip(arr, z_scores)):
            if z > self.anomaly_sensitivity:
                severity = "high" if z > 3 else "medium"
                anomalies.append(Anomaly(
                    anomaly_type=AnomalyType.OUTLIER.value,
                    metric=metric,
                    severity=severity,
                    description=f"Outlier detected in {metric} (z-score: {z:.2f})",
                    value=float(value),
                    expected_range=(float(mean - 2 * std), float(mean + 2 * std)),
                ))

        return anomalies

    def _detect_sudden_changes(
        self,
        series: List[float],
        metric: str,
    ) -> List[Anomaly]:
        """Detect sudden changes in time series."""
        anomalies = []
        arr = np.asarray(series, dtype=np.float64)

        if len(arr) < 3:
            return anomalies

        # Compute first differences
        diffs = np.diff(arr)
        mean_diff = np.mean(np.abs(diffs))
        std_diff = np.std(np.abs(diffs))

        if std_diff < 1e-10:
            return anomalies

        for i, diff in enumerate(diffs):
            z = np.abs(diff - mean_diff) / std_diff
            if z > self.anomaly_sensitivity:
                if diff > 0:
                    anomaly_type = AnomalyType.SUDDEN_SPIKE.value
                    description = f"Sudden increase in {metric}"
                else:
                    anomaly_type = AnomalyType.SUDDEN_DROP.value
                    description = f"Sudden decrease in {metric}"

                anomalies.append(Anomaly(
                    anomaly_type=anomaly_type,
                    metric=metric,
                    severity="high" if z > 3 else "medium",
                    description=description,
                    value=float(arr[i + 1]),
                ))

        return anomalies

    def _detect_trend_reversals(
        self,
        series: List[float],
        metric: str,
    ) -> List[Anomaly]:
        """Detect trend reversals in time series."""
        anomalies = []
        arr = np.asarray(series, dtype=np.float64)

        if len(arr) < 10:
            return anomalies

        # Compute rolling trend
        window = min(5, len(arr) // 3)
        if window < 2:
            return anomalies

        # Simple trend detection using linear regression on windows
        half = len(arr) // 2
        first_half = arr[:half]
        second_half = arr[half:]

        try:
            slope1, _, _, _, _ = stats.linregress(range(len(first_half)), first_half)
            slope2, _, _, _, _ = stats.linregress(range(len(second_half)), second_half)

            # Check for reversal
            if (slope1 > 0.1 and slope2 < -0.1) or (slope1 < -0.1 and slope2 > 0.1):
                direction = "downward" if slope2 < 0 else "upward"
                anomalies.append(Anomaly(
                    anomaly_type=AnomalyType.TREND_REVERSAL.value,
                    metric=metric,
                    severity="medium",
                    description=f"Trend reversal detected in {metric}: now trending {direction}",
                ))
        except Exception:
            pass

        return anomalies

    def _detect_pattern_breaks(
        self,
        data: Dict[str, Any],
    ) -> List[Anomaly]:
        """Detect breaks in expected patterns."""
        anomalies = []

        # Check for unusual metric combinations
        performance = data.get("performance", 0.5)
        engagement = data.get("engagement", 0.5)

        if isinstance(performance, (list, np.ndarray)):
            performance = float(np.mean(performance))
        if isinstance(engagement, (list, np.ndarray)):
            engagement = float(np.mean(engagement))

        # High performance but low engagement is unusual
        if performance > 0.8 and engagement < 0.4:
            anomalies.append(Anomaly(
                anomaly_type=AnomalyType.PATTERN_BREAK.value,
                metric="performance_engagement_relationship",
                severity="medium",
                description="Unusual pattern: high performance with low engagement",
            ))

        # Low performance but high engagement might indicate struggling
        if performance < 0.4 and engagement > 0.7:
            anomalies.append(Anomaly(
                anomaly_type=AnomalyType.PATTERN_BREAK.value,
                metric="performance_engagement_relationship",
                severity="high",
                description="Learner is engaged but struggling with content",
            ))

        return anomalies

    def _predict_completion(
        self,
        learner_data: Dict[str, Any],
        historical_data: Optional[List[Dict[str, Any]]],
    ) -> Optional[OutcomePrediction]:
        """Predict course/module completion likelihood."""
        # Extract relevant features
        progress = learner_data.get("progress", {})
        completion_rate = progress.get("completion_rate", 0.5) if isinstance(progress, dict) else 0.5
        engagement = learner_data.get("engagement", 0.5)
        performance = learner_data.get("performance", 0.5)

        if isinstance(engagement, (list, np.ndarray)):
            engagement = float(np.mean(engagement))
        if isinstance(performance, (list, np.ndarray)):
            performance = float(np.mean(performance))

        # Simple prediction model (in production, use trained ML model)
        probability = 0.4 * completion_rate + 0.35 * engagement + 0.25 * performance

        if probability > 0.7:
            prediction = "likely_to_complete"
            contributing = ["Strong engagement", "Good progress rate"]
            recommendations = ["Continue current approach"]
        elif probability > 0.4:
            prediction = "at_risk_of_incomplete"
            contributing = ["Moderate engagement", "Average progress"]
            recommendations = ["Monitor progress closely", "Provide encouragement"]
        else:
            prediction = "unlikely_to_complete"
            contributing = ["Low engagement indicators", "Slow progress"]
            recommendations = ["Immediate intervention needed", "Schedule check-in"]

        return OutcomePrediction(
            outcome_type="completion",
            prediction=prediction,
            probability=float(np.clip(probability, 0, 1)),
            confidence_interval=(max(0, probability - 0.15), min(1, probability + 0.15)),
            contributing_factors=contributing,
            recommendations=recommendations,
        )

    def _predict_performance(
        self,
        learner_data: Dict[str, Any],
        historical_data: Optional[List[Dict[str, Any]]],
    ) -> Optional[OutcomePrediction]:
        """Predict future performance level."""
        current_performance = learner_data.get("performance", 0.5)
        engagement = learner_data.get("engagement", 0.5)

        if isinstance(current_performance, (list, np.ndarray)):
            current_performance = float(np.mean(current_performance))
        if isinstance(engagement, (list, np.ndarray)):
            engagement = float(np.mean(engagement))

        # Simple trend-based prediction
        predicted_performance = 0.6 * current_performance + 0.4 * engagement

        if predicted_performance > 0.75:
            prediction = "high_performer"
            recommendations = ["Provide enrichment opportunities"]
        elif predicted_performance > 0.5:
            prediction = "average_performer"
            recommendations = ["Continue current support level"]
        else:
            prediction = "needs_support"
            recommendations = ["Provide additional scaffolding", "Consider remediation"]

        return OutcomePrediction(
            outcome_type="performance",
            prediction=prediction,
            probability=float(np.clip(predicted_performance, 0, 1)),
            confidence_interval=(max(0, predicted_performance - 0.1), min(1, predicted_performance + 0.1)),
            contributing_factors=["Current performance trend", "Engagement level"],
            recommendations=recommendations,
        )

    def _predict_engagement_trajectory(
        self,
        learner_data: Dict[str, Any],
        historical_data: Optional[List[Dict[str, Any]]],
    ) -> Optional[OutcomePrediction]:
        """Predict engagement trajectory."""
        engagement = learner_data.get("engagement", 0.5)

        if isinstance(engagement, (list, np.ndarray)):
            arr = np.asarray(engagement, dtype=np.float64)
            if len(arr) > 2:
                # Compute trend
                try:
                    slope, _, _, _, _ = stats.linregress(range(len(arr)), arr)
                    if slope > 0.05:
                        prediction = "increasing_engagement"
                        probability = min(1, 0.5 + slope * 5)
                        recommendations = ["Maintain current strategies"]
                    elif slope < -0.05:
                        prediction = "declining_engagement"
                        probability = max(0, 0.5 + slope * 5)
                        recommendations = ["Investigate causes of decline", "Refresh content approach"]
                    else:
                        prediction = "stable_engagement"
                        probability = 0.5
                        recommendations = ["Consider new engagement strategies"]

                    return OutcomePrediction(
                        outcome_type="engagement_trajectory",
                        prediction=prediction,
                        probability=float(np.clip(probability, 0, 1)),
                        confidence_interval=(max(0, probability - 0.2), min(1, probability + 0.2)),
                        contributing_factors=["Historical engagement trend"],
                        recommendations=recommendations,
                    )
                except Exception:
                    pass

        return None

    def _predict_at_risk_status(
        self,
        learner_data: Dict[str, Any],
        historical_data: Optional[List[Dict[str, Any]]],
    ) -> Optional[OutcomePrediction]:
        """Predict at-risk status."""
        # Aggregate risk factors
        risk_score = 0
        factors = []

        performance = learner_data.get("performance", 0.5)
        engagement = learner_data.get("engagement", 0.5)
        emotional = learner_data.get("emotional", {})

        if isinstance(performance, (list, np.ndarray)):
            performance = float(np.mean(performance))
        if isinstance(engagement, (list, np.ndarray)):
            engagement = float(np.mean(engagement))

        if performance < 0.4:
            risk_score += 0.35
            factors.append("Low performance")
        if engagement < 0.4:
            risk_score += 0.3
            factors.append("Low engagement")

        if isinstance(emotional, dict):
            frustration = emotional.get("frustration", 0)
            if frustration > 0.6:
                risk_score += 0.2
                factors.append("High frustration")
            confidence = emotional.get("confidence", 0.5)
            if confidence < 0.3:
                risk_score += 0.15
                factors.append("Low confidence")

        if risk_score > 0.5:
            prediction = "at_risk"
            recommendations = [
                "Schedule immediate intervention",
                "Provide additional support resources",
                "Consider one-on-one tutoring",
            ]
        elif risk_score > 0.3:
            prediction = "watch_list"
            recommendations = [
                "Monitor closely",
                "Check in regularly",
            ]
        else:
            prediction = "on_track"
            recommendations = ["Continue standard monitoring"]

        return OutcomePrediction(
            outcome_type="at_risk_status",
            prediction=prediction,
            probability=float(np.clip(risk_score, 0, 1)),
            confidence_interval=(max(0, risk_score - 0.1), min(1, risk_score + 0.1)),
            contributing_factors=factors if factors else ["No significant risk factors"],
            recommendations=recommendations,
        )

    def _compute_priority_score(self, insight: Insight) -> float:
        """Compute priority score for an insight."""
        # Category weights
        category_weights = {
            "learning": 0.9,
            "emotional": 0.85,
            "engagement": 0.8,
            "behavioral": 0.7,
            "social": 0.6,
        }

        category_score = category_weights.get(insight.category, 0.5)
        actionability = min(1.0, len(insight.action_items) * 0.25)

        return (
            0.3 * insight.confidence +
            0.3 * insight.impact_score +
            0.2 * category_score +
            0.2 * actionability
        )

    def _format_for_teacher(self, insights: List[Insight]) -> str:
        """Format insights for teachers."""
        lines = ["# Learner Insights Report", ""]

        for category in ["learning", "engagement", "emotional", "behavioral"]:
            category_insights = [i for i in insights if i.category == category]
            if category_insights:
                lines.append(f"## {category.title()} Insights")
                for insight in category_insights:
                    lines.append(f"- **{insight.finding}** (Confidence: {insight.confidence:.0%})")
                    lines.append(f"  Actions: {', '.join(insight.action_items[:2])}")
                lines.append("")

        return "\n".join(lines)

    def _format_for_learner(self, insights: List[Insight]) -> str:
        """Format insights for learners (student-friendly)."""
        lines = ["# Your Learning Insights", ""]

        positive = [i for i in insights if i.priority == "low"]
        actionable = [i for i in insights if i.priority in ["high", "medium"]]

        if positive:
            lines.append("## What You're Doing Well")
            for i in positive[:3]:
                lines.append(f"- {i.finding}")
            lines.append("")

        if actionable:
            lines.append("## How You Can Improve")
            for i in actionable[:3]:
                lines.append(f"- {i.action_items[0] if i.action_items else i.finding}")
            lines.append("")

        return "\n".join(lines)

    def _format_for_parent(self, insights: List[Insight]) -> str:
        """Format insights for parents."""
        lines = ["# Learning Progress Insights", ""]

        high_priority = [i for i in insights if i.priority == "high"]
        others = [i for i in insights if i.priority != "high"]

        if high_priority:
            lines.append("## Attention Needed")
            for i in high_priority[:2]:
                lines.append(f"- {i.finding}")
            lines.append("")

        if others:
            lines.append("## General Progress")
            for i in others[:3]:
                lines.append(f"- {i.finding}")
            lines.append("")

        return "\n".join(lines)

    def _format_for_admin(self, insights: List[Insight]) -> str:
        """Format insights for administrators."""
        lines = [
            "# Analytics Insights Report",
            "",
            f"Total insights: {len(insights)}",
            f"High priority: {len([i for i in insights if i.priority == 'high'])}",
            "",
            "## Insights by Category",
        ]

        for category in ["learning", "engagement", "emotional", "behavioral"]:
            count = len([i for i in insights if i.category == category])
            avg_confidence = np.mean([i.confidence for i in insights if i.category == category]) if count > 0 else 0
            lines.append(f"- {category}: {count} (avg confidence: {avg_confidence:.0%})")

        return "\n".join(lines)
