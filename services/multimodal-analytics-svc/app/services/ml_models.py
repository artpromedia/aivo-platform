"""
ML Models for Multimodal Analytics

Machine learning components for:
- Engagement prediction
- Content recommendation scoring
- Anomaly detection (cheating indicators)
- Learning outcome prediction
"""
import logging
import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
import numpy as np
from collections import defaultdict

logger = logging.getLogger(__name__)


class RiskLevel(Enum):
    """Risk level categories."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class EngagementPrediction:
    """Predicted engagement for a student/content combination."""
    predicted_score: float
    confidence: float
    factors: Dict[str, float]
    recommendation: str
    model_version: str = "1.0"


@dataclass
class RecommendationScore:
    """Content recommendation score."""
    content_id: str
    score: float
    components: Dict[str, float]
    rank: int
    explanation: str


@dataclass
class AnomalyDetectionResult:
    """Result of anomaly detection analysis."""
    is_anomaly: bool
    anomaly_score: float
    anomaly_type: Optional[str]
    risk_level: str
    indicators: List[str]
    confidence: float
    recommended_action: str


@dataclass
class OutcomePrediction:
    """Predicted learning outcome."""
    outcome: str  # success, at_risk, needs_support
    probability: float
    confidence_interval: Tuple[float, float]
    risk_factors: List[str]
    protective_factors: List[str]
    interventions: List[str]


class EngagementPredictor:
    """
    ML model for predicting student engagement.

    Uses historical engagement patterns, content characteristics,
    and student profiles to predict future engagement.

    Features used:
    - Historical engagement scores by content type
    - Time of day patterns
    - Content difficulty alignment
    - Learning style compatibility
    - Recent activity trends
    """

    # Feature weights (would be learned in production)
    FEATURE_WEIGHTS = {
        "historical_engagement": 0.25,
        "content_type_preference": 0.20,
        "time_alignment": 0.15,
        "difficulty_match": 0.15,
        "style_compatibility": 0.10,
        "trend_factor": 0.10,
        "session_context": 0.05,
    }

    def __init__(self, model_version: str = "1.0"):
        """
        Initialize the EngagementPredictor.

        Args:
            model_version: Version identifier for the model.
        """
        self.model_version = model_version
        self._student_history: Dict[str, List[float]] = defaultdict(list)
        logger.info(f"EngagementPredictor initialized (version {model_version})")

    def predict(
        self,
        student_id: str,
        content_id: str,
        content_type: str,
        student_profile: Optional[Dict[str, Any]] = None,
        content_metadata: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> EngagementPrediction:
        """
        Predict engagement for a student-content combination.

        Args:
            student_id: Student identifier.
            content_id: Content identifier.
            content_type: Type of content.
            student_profile: Optional student profile data.
            content_metadata: Optional content metadata.
            context: Optional context (time, device, etc.).

        Returns:
            EngagementPrediction with predicted score and factors.
        """
        profile = student_profile or {}
        metadata = content_metadata or {}
        ctx = context or {}
        
        # Compute feature values
        factors = {}
        
        # Historical engagement
        history = self._student_history.get(student_id, [])
        if history:
            factors["historical_engagement"] = np.mean(history[-10:])
        else:
            factors["historical_engagement"] = 0.5  # Default
        
        # Content type preference
        type_preferences = profile.get("engagement_by_content_type", {})
        factors["content_type_preference"] = type_preferences.get(content_type, 0.5)
        
        # Time alignment
        current_hour = ctx.get("hour", datetime.utcnow().hour)
        peak_hours = profile.get("peak_engagement_hours", [10, 14, 19])
        if current_hour in peak_hours:
            factors["time_alignment"] = 0.9
        elif abs(min(current_hour - h for h in peak_hours)) <= 2:
            factors["time_alignment"] = 0.7
        else:
            factors["time_alignment"] = 0.5
        
        # Difficulty match
        student_level = profile.get("skill_level", 0.5)
        content_difficulty = metadata.get("difficulty", 0.5)
        diff_gap = abs(student_level - content_difficulty)
        factors["difficulty_match"] = max(0, 1 - diff_gap * 2)
        
        # Style compatibility
        student_style = profile.get("learning_style", "visual")
        content_style = metadata.get("primary_style", "visual")
        factors["style_compatibility"] = 0.9 if student_style == content_style else 0.6
        
        # Trend factor
        trend = profile.get("engagement_trend", "stable")
        if trend == "improving":
            factors["trend_factor"] = 0.8
        elif trend == "declining":
            factors["trend_factor"] = 0.4
        else:
            factors["trend_factor"] = 0.6
        
        # Session context
        session_length = ctx.get("session_duration_minutes", 0)
        if 15 <= session_length <= 45:
            factors["session_context"] = 0.8  # Optimal session length
        elif session_length > 60:
            factors["session_context"] = 0.5  # Fatigue likely
        else:
            factors["session_context"] = 0.6
        
        # Compute weighted prediction
        weighted_sum = sum(
            factors[f] * self.FEATURE_WEIGHTS[f]
            for f in self.FEATURE_WEIGHTS
        )
        predicted_score = max(0.0, min(1.0, weighted_sum))
        
        # Compute confidence based on data availability
        data_completeness = sum(1 for f in factors.values() if f != 0.5) / len(factors)
        confidence = 0.5 + data_completeness * 0.4 + (len(history) / 50) * 0.1
        confidence = min(0.95, confidence)
        
        # Generate recommendation
        recommendation = self._generate_recommendation(predicted_score, factors)
        
        return EngagementPrediction(
            predicted_score=predicted_score,
            confidence=confidence,
            factors=factors,
            recommendation=recommendation,
            model_version=self.model_version,
        )

    def update_history(
        self,
        student_id: str,
        actual_engagement: float,
    ) -> None:
        """
        Update student engagement history for learning.

        Args:
            student_id: Student identifier.
            actual_engagement: Actual engagement score observed.
        """
        self._student_history[student_id].append(actual_engagement)
        
        # Keep last 100 observations
        if len(self._student_history[student_id]) > 100:
            self._student_history[student_id] = self._student_history[student_id][-100:]

    def _generate_recommendation(
        self,
        score: float,
        factors: Dict[str, float],
    ) -> str:
        """Generate recommendation based on prediction."""
        if score >= 0.7:
            return "High engagement expected. Proceed with content."
        elif score >= 0.5:
            # Find lowest factors
            low_factors = sorted(factors.items(), key=lambda x: x[1])[:2]
            suggestions = []
            for factor, value in low_factors:
                if factor == "time_alignment" and value < 0.6:
                    suggestions.append("consider optimal study times")
                elif factor == "difficulty_match" and value < 0.6:
                    suggestions.append("review prerequisite content first")
                elif factor == "session_context" and value < 0.6:
                    suggestions.append("take a break before starting")
            
            return f"Moderate engagement expected. Consider: {', '.join(suggestions) or 'shorter sessions'}."
        else:
            return "Low engagement predicted. Consider alternative content or timing."


class ContentRecommender:
    """
    ML model for content recommendation scoring.

    Scores content based on:
    - Relevance to learning objectives
    - Predicted engagement
    - Learning path position
    - Peer success rates
    - Diversity of content types
    """

    def __init__(self):
        """Initialize the ContentRecommender."""
        self._content_stats: Dict[str, Dict[str, float]] = {}
        logger.info("ContentRecommender initialized")

    def score_content(
        self,
        content_items: List[Dict[str, Any]],
        student_profile: Dict[str, Any],
        learning_objectives: Optional[List[str]] = None,
        history: Optional[List[str]] = None,
    ) -> List[RecommendationScore]:
        """
        Score and rank content for a student.

        Args:
            content_items: List of content items to score.
            student_profile: Student profile data.
            learning_objectives: Optional learning objectives.
            history: Optional content history (already consumed).

        Returns:
            List of RecommendationScore, sorted by score.
        """
        consumed = set(history or [])
        objectives = learning_objectives or []
        
        scores = []
        for content in content_items:
            content_id = content.get("id", "")
            
            # Skip already consumed
            if content_id in consumed:
                continue
            
            # Compute score components
            components = {}
            
            # Relevance to objectives
            content_topics = set(content.get("topics", []))
            if objectives:
                overlap = len(content_topics & set(objectives))
                components["objective_relevance"] = min(1.0, overlap / len(objectives))
            else:
                components["objective_relevance"] = 0.5
            
            # Type preference
            content_type = content.get("type", "document")
            type_prefs = student_profile.get("engagement_by_content_type", {})
            components["type_preference"] = type_prefs.get(content_type, 0.5)
            
            # Difficulty alignment
            student_level = student_profile.get("skill_level", 0.5)
            content_diff = content.get("difficulty", 0.5)
            components["difficulty_alignment"] = 1 - abs(student_level - content_diff)
            
            # Peer success rate
            stats = self._content_stats.get(content_id, {})
            components["peer_success"] = stats.get("success_rate", 0.6)
            
            # Freshness (newer content gets slight boost)
            days_old = content.get("days_since_published", 30)
            components["freshness"] = max(0, 1 - days_old / 365)
            
            # Diversity bonus (different from recent history)
            recent_types = [c.get("type") for c in content_items[:5] if c.get("id") in consumed]
            if content_type not in recent_types:
                components["diversity_bonus"] = 0.2
            else:
                components["diversity_bonus"] = 0.0
            
            # Compute weighted score
            weights = {
                "objective_relevance": 0.30,
                "type_preference": 0.25,
                "difficulty_alignment": 0.20,
                "peer_success": 0.15,
                "freshness": 0.05,
                "diversity_bonus": 0.05,
            }
            
            total_score = sum(components[k] * weights[k] for k in weights)
            
            # Generate explanation
            top_factors = sorted(components.items(), key=lambda x: x[1], reverse=True)[:2]
            explanation = f"Recommended due to {top_factors[0][0].replace('_', ' ')} " \
                         f"and {top_factors[1][0].replace('_', ' ')}"
            
            scores.append(RecommendationScore(
                content_id=content_id,
                score=total_score,
                components=components,
                rank=0,  # Will be set after sorting
                explanation=explanation,
            ))
        
        # Sort and assign ranks
        scores.sort(key=lambda x: x.score, reverse=True)
        for i, score in enumerate(scores):
            score.rank = i + 1
        
        return scores

    def update_content_stats(
        self,
        content_id: str,
        success: bool,
        engagement: float,
    ) -> None:
        """
        Update content statistics for learning.

        Args:
            content_id: Content identifier.
            success: Whether learning was successful.
            engagement: Engagement score observed.
        """
        if content_id not in self._content_stats:
            self._content_stats[content_id] = {
                "success_count": 0,
                "total_count": 0,
                "engagement_sum": 0,
            }
        
        stats = self._content_stats[content_id]
        stats["total_count"] += 1
        if success:
            stats["success_count"] += 1
        stats["engagement_sum"] += engagement
        stats["success_rate"] = stats["success_count"] / stats["total_count"]
        stats["avg_engagement"] = stats["engagement_sum"] / stats["total_count"]


class AnomalyDetector:
    """
    ML model for detecting anomalies in learning behavior.

    Detects potential:
    - Cheating indicators
    - Account sharing
    - Automated bot activity
    - Unusual patterns
    """

    # Anomaly thresholds
    THRESHOLDS = {
        "rapid_completion_factor": 0.2,  # < 20% of expected time
        "perfect_accuracy_threshold": 0.95,
        "response_time_min_ms": 1000,  # Minimum realistic response time
        "session_gap_min_seconds": 1,  # Minimum gap between events
        "activity_burst_threshold": 50,  # Events per minute
    }

    def __init__(self, sensitivity: float = 0.7):
        """
        Initialize the AnomalyDetector.

        Args:
            sensitivity: Detection sensitivity (0-1).
        """
        self.sensitivity = sensitivity
        self._baseline_stats: Dict[str, Dict[str, float]] = {}
        logger.info(f"AnomalyDetector initialized (sensitivity={sensitivity})")

    def detect(
        self,
        events: List[Dict[str, Any]],
        student_id: str,
        content_id: Optional[str] = None,
    ) -> AnomalyDetectionResult:
        """
        Detect anomalies in learning events.

        Args:
            events: Events to analyze.
            student_id: Student identifier.
            content_id: Optional content filter.

        Returns:
            AnomalyDetectionResult with detection status.
        """
        if not events:
            return AnomalyDetectionResult(
                is_anomaly=False,
                anomaly_score=0.0,
                anomaly_type=None,
                risk_level="low",
                indicators=[],
                confidence=0.0,
                recommended_action="No events to analyze",
            )
        
        if content_id:
            events = [e for e in events if e.get("content_id") == content_id]
        
        indicators = []
        anomaly_scores = []
        
        # Check rapid completion
        rapid_score, rapid_indicators = self._check_rapid_completion(events)
        anomaly_scores.append(rapid_score)
        indicators.extend(rapid_indicators)
        
        # Check perfect accuracy with fast times
        accuracy_score, accuracy_indicators = self._check_suspicious_accuracy(events)
        anomaly_scores.append(accuracy_score)
        indicators.extend(accuracy_indicators)
        
        # Check timing anomalies
        timing_score, timing_indicators = self._check_timing_anomalies(events)
        anomaly_scores.append(timing_score)
        indicators.extend(timing_indicators)
        
        # Check activity bursts
        burst_score, burst_indicators = self._check_activity_bursts(events)
        anomaly_scores.append(burst_score)
        indicators.extend(burst_indicators)
        
        # Check pattern consistency
        pattern_score, pattern_indicators = self._check_pattern_consistency(events, student_id)
        anomaly_scores.append(pattern_score)
        indicators.extend(pattern_indicators)
        
        # Compute overall anomaly score
        overall_score = max(anomaly_scores) * 0.6 + np.mean(anomaly_scores) * 0.4
        overall_score = float(overall_score * self.sensitivity)
        
        # Determine risk level
        is_anomaly = bool(overall_score >= 0.5)
        risk_level = self._score_to_risk(overall_score)
        
        # Determine anomaly type
        anomaly_type = None
        if is_anomaly:
            if rapid_score == max(anomaly_scores):
                anomaly_type = "rapid_completion"
            elif accuracy_score == max(anomaly_scores):
                anomaly_type = "suspicious_accuracy"
            elif timing_score == max(anomaly_scores):
                anomaly_type = "timing_anomaly"
            elif burst_score == max(anomaly_scores):
                anomaly_type = "activity_burst"
            else:
                anomaly_type = "pattern_deviation"
        
        # Compute confidence
        confidence = min(0.95, 0.5 + len(events) / 100)
        
        # Generate recommended action
        action = self._generate_action(risk_level, anomaly_type, indicators)
        
        return AnomalyDetectionResult(
            is_anomaly=is_anomaly,
            anomaly_score=overall_score,
            anomaly_type=anomaly_type,
            risk_level=risk_level,
            indicators=indicators[:5],  # Limit indicators
            confidence=confidence,
            recommended_action=action,
        )

    def update_baseline(
        self,
        student_id: str,
        events: List[Dict[str, Any]],
    ) -> None:
        """
        Update baseline statistics for a student.

        Args:
            student_id: Student identifier.
            events: Normal events to learn from.
        """
        if not events:
            return
        
        # Compute baseline metrics
        response_times = [e.get("duration_ms", 0) for e in events if e.get("duration_ms")]
        
        if response_times:
            self._baseline_stats[student_id] = {
                "avg_response_time": np.mean(response_times),
                "std_response_time": np.std(response_times),
                "event_count": len(events),
            }

    def _check_rapid_completion(
        self,
        events: List[Dict[str, Any]],
    ) -> Tuple[float, List[str]]:
        """Check for suspiciously rapid completions."""
        indicators = []
        score = 0.0
        
        complete_events = [e for e in events if "complete" in e.get("event_type", "")]
        
        for event in complete_events:
            duration = event.get("duration_ms") or 0
            expected = event.get("metadata", {}).get("expected_duration_ms", 60000)
            
            if duration > 0 and expected > 0:
                ratio = duration / expected
                if ratio < self.THRESHOLDS["rapid_completion_factor"]:
                    indicators.append(
                        f"Completed in {ratio*100:.0f}% of expected time"
                    )
                    score = max(score, 1.0 - ratio)
        
        return score, indicators

    def _check_suspicious_accuracy(
        self,
        events: List[Dict[str, Any]],
    ) -> Tuple[float, List[str]]:
        """Check for suspicious accuracy patterns."""
        indicators = []
        score = 0.0
        
        answer_events = [
            e for e in events 
            if e.get("event_type") in ["assessment_answer", "assessment_submit"]
        ]
        
        if len(answer_events) >= 5:
            correct = [e for e in answer_events if e.get("metadata", {}).get("correct")]
            accuracy = len(correct) / len(answer_events)
            
            # Check response times
            response_times = [
                e.get("duration_ms", 0) for e in answer_events
                if e.get("duration_ms", 0) > 0
            ]
            
            if accuracy >= self.THRESHOLDS["perfect_accuracy_threshold"]:
                if response_times and np.mean(response_times) < self.THRESHOLDS["response_time_min_ms"]:
                    indicators.append(
                        f"Perfect accuracy ({accuracy*100:.0f}%) with very fast responses"
                    )
                    score = 0.9
                else:
                    # Perfect accuracy alone is less suspicious
                    score = 0.3
        
        return score, indicators

    def _check_timing_anomalies(
        self,
        events: List[Dict[str, Any]],
    ) -> Tuple[float, List[str]]:
        """Check for timing anomalies."""
        indicators = []
        score = 0.0
        
        # Sort by timestamp
        sorted_events = sorted(
            [e for e in events if e.get("timestamp")],
            key=lambda e: str(e.get("timestamp", ""))
        )
        
        if len(sorted_events) < 2:
            return 0.0, []
        
        # Check for impossibly small gaps
        small_gaps = 0
        for i in range(1, len(sorted_events)):
            prev_ts = sorted_events[i-1].get("timestamp")
            curr_ts = sorted_events[i].get("timestamp")
            
            if isinstance(prev_ts, str) and isinstance(curr_ts, str):
                try:
                    prev_dt = datetime.fromisoformat(prev_ts.replace("Z", "+00:00"))
                    curr_dt = datetime.fromisoformat(curr_ts.replace("Z", "+00:00"))
                    gap = (curr_dt - prev_dt).total_seconds()
                    
                    if 0 < gap < self.THRESHOLDS["session_gap_min_seconds"]:
                        small_gaps += 1
                except ValueError:
                    pass
        
        if small_gaps > len(sorted_events) * 0.1:
            indicators.append(f"Multiple events with impossibly small time gaps ({small_gaps})")
            score = 0.7
        
        return score, indicators

    def _check_activity_bursts(
        self,
        events: List[Dict[str, Any]],
    ) -> Tuple[float, List[str]]:
        """Check for unusual activity bursts."""
        indicators = []
        score = 0.0
        
        if len(events) < 10:
            return 0.0, []
        
        # Group by minute
        minute_counts = defaultdict(int)
        for event in events:
            ts = event.get("timestamp")
            if isinstance(ts, str):
                try:
                    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    minute_key = dt.strftime("%Y-%m-%d %H:%M")
                    minute_counts[minute_key] += 1
                except ValueError:
                    pass
        
        if minute_counts:
            max_per_minute = max(minute_counts.values())
            if max_per_minute > self.THRESHOLDS["activity_burst_threshold"]:
                indicators.append(
                    f"Unusual activity burst: {max_per_minute} events in one minute"
                )
                score = min(1.0, max_per_minute / 100)
        
        return score, indicators

    def _check_pattern_consistency(
        self,
        events: List[Dict[str, Any]],
        student_id: str,
    ) -> Tuple[float, List[str]]:
        """Check for deviation from baseline patterns."""
        indicators = []
        score = 0.0
        
        baseline = self._baseline_stats.get(student_id)
        if not baseline:
            return 0.0, []
        
        # Compare response times
        current_times = [
            e.get("duration_ms", 0) for e in events
            if e.get("duration_ms", 0) > 0
        ]
        
        if current_times and baseline.get("avg_response_time"):
            current_avg = np.mean(current_times)
            baseline_avg = baseline["avg_response_time"]
            baseline_std = baseline.get("std_response_time", baseline_avg * 0.3)
            
            z_score = abs(current_avg - baseline_avg) / max(baseline_std, 1)
            
            if z_score > 3:
                indicators.append(
                    f"Response times deviate significantly from baseline (z={z_score:.1f})"
                )
                score = min(1.0, z_score / 5)
        
        return score, indicators

    def _score_to_risk(self, score: float) -> str:
        """Convert anomaly score to risk level."""
        if score >= 0.8:
            return "critical"
        elif score >= 0.6:
            return "high"
        elif score >= 0.4:
            return "medium"
        else:
            return "low"

    def _generate_action(
        self,
        risk_level: str,
        anomaly_type: Optional[str],
        indicators: List[str],
    ) -> str:
        """Generate recommended action."""
        if risk_level == "critical":
            return "Immediate review required. Consider flagging for manual verification."
        elif risk_level == "high":
            return "Review student activity. May require additional verification."
        elif risk_level == "medium":
            return "Monitor closely. Consider additional assessment questions."
        else:
            return "No immediate action required. Continue normal monitoring."


class OutcomePredictor:
    """
    ML model for predicting learning outcomes.

    Predicts:
    - Course completion probability
    - Assessment performance
    - Risk of dropping out
    - Need for intervention
    """

    def __init__(self):
        """Initialize the OutcomePredictor."""
        self._student_outcomes: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        logger.info("OutcomePredictor initialized")

    def predict(
        self,
        student_id: str,
        engagement_data: Dict[str, Any],
        performance_data: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> OutcomePrediction:
        """
        Predict learning outcomes for a student.

        Args:
            student_id: Student identifier.
            engagement_data: Engagement metrics.
            performance_data: Optional performance metrics.
            context: Optional contextual data.

        Returns:
            OutcomePrediction with probability and factors.
        """
        performance = performance_data or {}
        ctx = context or {}
        
        # Extract key metrics
        engagement_score = engagement_data.get("overall_engagement", 0.5)
        engagement_trend = engagement_data.get("engagement_trend", "stable")
        at_risk_indicators = engagement_data.get("at_risk_indicators", [])
        
        avg_score = performance.get("average_score", 0.5)
        completion_rate = performance.get("completion_rate", 0.5)
        
        # Compute risk factors
        risk_factors = []
        protective_factors = []
        
        if engagement_score < 0.4:
            risk_factors.append("Low engagement")
        elif engagement_score > 0.7:
            protective_factors.append("High engagement")
        
        if engagement_trend == "declining":
            risk_factors.append("Declining engagement trend")
        elif engagement_trend == "improving":
            protective_factors.append("Improving engagement trend")
        
        if avg_score < 0.5:
            risk_factors.append("Below average performance")
        elif avg_score > 0.7:
            protective_factors.append("Strong performance")
        
        if completion_rate < 0.5:
            risk_factors.append("Low content completion")
        elif completion_rate > 0.8:
            protective_factors.append("High content completion")
        
        risk_factors.extend(at_risk_indicators)
        
        # Compute outcome probability
        base_probability = (
            engagement_score * 0.35 +
            avg_score * 0.35 +
            completion_rate * 0.20 +
            (0.1 if engagement_trend == "improving" else 0)
        )
        
        # Adjust for risk factors
        risk_adjustment = len(risk_factors) * 0.05
        protective_adjustment = len(protective_factors) * 0.05
        
        probability = base_probability - risk_adjustment + protective_adjustment
        probability = max(0.05, min(0.95, probability))
        
        # Determine outcome
        if probability >= 0.7:
            outcome = "success"
        elif probability >= 0.4:
            outcome = "at_risk"
        else:
            outcome = "needs_support"
        
        # Compute confidence interval
        margin = 0.15 * (1 - probability)  # Narrower at extremes
        confidence_interval = (
            max(0, probability - margin),
            min(1, probability + margin)
        )
        
        # Generate interventions
        interventions = self._generate_interventions(outcome, risk_factors)
        
        return OutcomePrediction(
            outcome=outcome,
            probability=probability,
            confidence_interval=confidence_interval,
            risk_factors=risk_factors,
            protective_factors=protective_factors,
            interventions=interventions,
        )

    def update_outcome(
        self,
        student_id: str,
        actual_outcome: str,
        predicted_outcome: str,
    ) -> None:
        """
        Update with actual outcome for learning.

        Args:
            student_id: Student identifier.
            actual_outcome: Actual outcome observed.
            predicted_outcome: What was predicted.
        """
        self._student_outcomes[student_id].append({
            "actual": actual_outcome,
            "predicted": predicted_outcome,
            "correct": actual_outcome == predicted_outcome,
            "timestamp": datetime.utcnow().isoformat(),
        })

    def _generate_interventions(
        self,
        outcome: str,
        risk_factors: List[str],
    ) -> List[str]:
        """Generate intervention recommendations."""
        interventions = []
        
        if outcome == "needs_support":
            interventions.append("Schedule one-on-one support session")
            interventions.append("Reduce content difficulty level")
            interventions.append("Provide additional practice materials")
        elif outcome == "at_risk":
            interventions.append("Send engagement reminder")
            interventions.append("Suggest study group participation")
        
        # Factor-specific interventions
        for factor in risk_factors:
            if "engagement" in factor.lower():
                interventions.append("Recommend interactive content")
            elif "completion" in factor.lower():
                interventions.append("Break content into smaller segments")
            elif "performance" in factor.lower():
                interventions.append("Provide additional review materials")
        
        return list(set(interventions))[:5]  # Dedupe and limit
