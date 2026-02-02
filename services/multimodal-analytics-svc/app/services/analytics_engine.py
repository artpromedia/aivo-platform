"""
Analytics Engine

Process learning events to compute engagement scores,
attention analysis, content effectiveness, and cross-modal correlations.
"""
import logging
import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
from collections import defaultdict
import numpy as np

logger = logging.getLogger(__name__)


class ContentType(Enum):
    """Types of learning content."""
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"
    ASSESSMENT = "assessment"
    INTERACTIVE = "interactive"
    SIMULATION = "simulation"


class EngagementLevel(Enum):
    """Engagement level categories."""
    VERY_LOW = "very_low"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"


@dataclass
class EngagementScore:
    """Engagement score for content or student."""
    score: float  # 0-1
    level: str
    components: Dict[str, float]
    confidence: float
    sample_size: int
    time_period: str


@dataclass
class AttentionMetrics:
    """Attention analysis metrics for video/audio content."""
    completion_rate: float
    average_watch_time_percent: float
    rewatch_rate: float
    skip_rate: float
    pause_frequency: float
    attention_score: float
    attention_drops: List[Dict[str, Any]]
    peak_attention_points: List[Dict[str, Any]]


@dataclass
class ContentEffectiveness:
    """Content effectiveness metrics."""
    content_id: str
    content_type: str
    effectiveness_score: float
    engagement_score: float
    completion_rate: float
    learning_outcome_correlation: float
    student_satisfaction: float
    difficulty_alignment: float
    recommendations: List[str]
    comparative_rank: Optional[int] = None


@dataclass
class CrossModalCorrelation:
    """Correlation between different content modalities."""
    modality_a: str
    modality_b: str
    correlation_coefficient: float
    p_value: float
    sample_size: int
    insight: str


@dataclass
class StudentEngagementProfile:
    """Comprehensive engagement profile for a student."""
    student_id: str
    overall_engagement: float
    engagement_by_content_type: Dict[str, float]
    engagement_trend: str  # improving, declining, stable
    peak_engagement_times: List[str]
    preferred_content_types: List[str]
    at_risk_indicators: List[str]
    recommendations: List[str]
    last_updated: datetime


@dataclass
class ContentRecommendation:
    """Content recommendation with scoring."""
    content_id: str
    content_type: str
    relevance_score: float
    predicted_engagement: float
    reasoning: List[str]
    priority: int


class AnalyticsEngine:
    """
    Process learning events for engagement and effectiveness analytics.

    Features:
    - Engagement scoring by content type
    - Attention analysis (video watch patterns)
    - Content effectiveness metrics
    - Cross-modal learning correlations
    - Student engagement profiles
    - Anomaly detection

    Usage:
        engine = AnalyticsEngine()
        engagement = engine.compute_engagement(events)
        attention = engine.analyze_attention(video_events)
        effectiveness = engine.compute_content_effectiveness(content_id)
    """

    # Engagement weight configurations
    ENGAGEMENT_WEIGHTS = {
        "video": {
            "watch_time": 0.3,
            "completion": 0.25,
            "interactions": 0.2,
            "rewatch": 0.15,
            "speed_normal": 0.1,
        },
        "audio": {
            "listen_time": 0.35,
            "completion": 0.25,
            "replays": 0.2,
            "speed_normal": 0.2,
        },
        "document": {
            "read_time": 0.3,
            "scroll_depth": 0.25,
            "highlights": 0.2,
            "annotations": 0.15,
            "return_visits": 0.1,
        },
        "assessment": {
            "completion": 0.3,
            "accuracy": 0.25,
            "time_on_task": 0.2,
            "review_behavior": 0.15,
            "improvement": 0.1,
        },
    }

    # Attention thresholds
    ATTENTION_THRESHOLDS = {
        "drop_threshold": 0.3,  # 30% drop in engagement
        "peak_threshold": 0.8,  # 80% engagement
        "skip_threshold": 0.1,  # Skip if < 10% watched
    }

    def __init__(
        self,
        min_events_for_analysis: int = 5,
        engagement_decay_days: int = 30,
    ):
        """
        Initialize the AnalyticsEngine.

        Args:
            min_events_for_analysis: Minimum events required for analysis
            engagement_decay_days: Days for engagement decay calculation
        """
        self.min_events = min_events_for_analysis
        self.engagement_decay_days = engagement_decay_days
        
        # Caches
        self._content_stats: Dict[str, Dict[str, Any]] = defaultdict(dict)
        self._student_profiles: Dict[str, StudentEngagementProfile] = {}
        
        logger.info("AnalyticsEngine initialized")

    def compute_engagement(
        self,
        events: List[Dict[str, Any]],
        content_type: Optional[str] = None,
        time_period: str = "7d",
    ) -> EngagementScore:
        """
        Compute engagement score from events.

        Args:
            events: List of learning events.
            content_type: Optional content type filter.
            time_period: Time period for analysis.

        Returns:
            EngagementScore with detailed breakdown.
        """
        if not events:
            return EngagementScore(
                score=0.0,
                level="very_low",
                components={},
                confidence=0.0,
                sample_size=0,
                time_period=time_period,
            )
        
        # Filter by content type if specified
        if content_type:
            events = [e for e in events if self._get_content_type(e) == content_type]
        
        if len(events) < self.min_events:
            return EngagementScore(
                score=0.0,
                level="very_low",
                components={},
                confidence=0.3,
                sample_size=len(events),
                time_period=time_period,
            )
        
        # Compute components
        components = self._compute_engagement_components(events)
        
        # Determine content type for weights
        detected_type = self._detect_primary_content_type(events)
        weights = self.ENGAGEMENT_WEIGHTS.get(detected_type, self.ENGAGEMENT_WEIGHTS["video"])
        
        # Weighted average
        total_weight = 0
        weighted_sum = 0
        for component, weight in weights.items():
            if component in components:
                weighted_sum += components[component] * weight
                total_weight += weight
        
        score = weighted_sum / total_weight if total_weight > 0 else 0.0
        score = max(0.0, min(1.0, score))
        
        # Determine engagement level
        level = self._score_to_level(score)
        
        # Calculate confidence based on sample size
        confidence = min(1.0, len(events) / 50)
        
        return EngagementScore(
            score=score,
            level=level,
            components=components,
            confidence=confidence,
            sample_size=len(events),
            time_period=time_period,
        )

    def analyze_attention(
        self,
        events: List[Dict[str, Any]],
        content_duration_seconds: Optional[int] = None,
    ) -> AttentionMetrics:
        """
        Analyze attention patterns from video/audio events.

        Args:
            events: List of video/audio events.
            content_duration_seconds: Total content duration.

        Returns:
            AttentionMetrics with detailed analysis.
        """
        if not events:
            return AttentionMetrics(
                completion_rate=0.0,
                average_watch_time_percent=0.0,
                rewatch_rate=0.0,
                skip_rate=0.0,
                pause_frequency=0.0,
                attention_score=0.0,
                attention_drops=[],
                peak_attention_points=[],
            )
        
        # Extract relevant metrics
        play_events = [e for e in events if e.get("event_type") in ["video_play", "audio_play"]]
        pause_events = [e for e in events if e.get("event_type") in ["video_pause", "audio_pause"]]
        seek_events = [e for e in events if e.get("event_type") in ["video_seek", "audio_seek"]]
        complete_events = [e for e in events if e.get("event_type") in ["video_complete", "audio_complete"]]
        
        # Completion rate
        unique_sessions = len(set(e.get("session_id", "") for e in events))
        completion_rate = len(complete_events) / max(unique_sessions, 1)
        completion_rate = min(1.0, completion_rate)
        
        # Average watch time
        total_watch_time = sum((e.get("duration_ms") or 0) for e in events) / 1000
        if content_duration_seconds:
            avg_watch_percent = total_watch_time / (content_duration_seconds * unique_sessions)
        else:
            avg_watch_percent = completion_rate * 0.8  # Estimate
        avg_watch_percent = min(1.0, avg_watch_percent)
        
        # Rewatch rate (seek backwards)
        backward_seeks = [e for e in seek_events if self._is_backward_seek(e)]
        rewatch_rate = len(backward_seeks) / max(len(events), 1)
        
        # Skip rate (seek forwards > 30 seconds)
        forward_seeks = [e for e in seek_events if self._is_forward_skip(e)]
        skip_rate = len(forward_seeks) / max(len(events), 1)
        
        # Pause frequency
        pause_frequency = len(pause_events) / max(total_watch_time / 60, 1)  # Per minute
        
        # Identify attention drops and peaks
        attention_drops = self._find_attention_drops(events)
        peak_points = self._find_peak_attention(events)
        
        # Compute overall attention score
        attention_score = (
            completion_rate * 0.3 +
            avg_watch_percent * 0.25 +
            (1 - skip_rate) * 0.2 +
            min(rewatch_rate * 2, 0.15) +  # Some rewatch is good
            min(pause_frequency / 5, 0.1) * 0.5  # Some pausing indicates engagement
        )
        attention_score = max(0.0, min(1.0, attention_score))
        
        return AttentionMetrics(
            completion_rate=completion_rate,
            average_watch_time_percent=avg_watch_percent,
            rewatch_rate=rewatch_rate,
            skip_rate=skip_rate,
            pause_frequency=pause_frequency,
            attention_score=attention_score,
            attention_drops=attention_drops,
            peak_attention_points=peak_points,
        )

    def compute_content_effectiveness(
        self,
        content_id: str,
        events: List[Dict[str, Any]],
        assessment_scores: Optional[List[float]] = None,
        feedback_scores: Optional[List[float]] = None,
    ) -> ContentEffectiveness:
        """
        Compute content effectiveness metrics.

        Args:
            content_id: Content identifier.
            events: Events related to this content.
            assessment_scores: Optional assessment scores after content.
            feedback_scores: Optional student feedback scores.

        Returns:
            ContentEffectiveness metrics.
        """
        content_type = self._detect_content_type_from_id(content_id, events)
        
        # Compute engagement
        engagement = self.compute_engagement(events)
        
        # Completion rate
        total_interactions = len(events)
        complete_events = [e for e in events if "complete" in e.get("event_type", "")]
        unique_students = len(set(e.get("student_id", "") for e in events))
        completion_rate = len(complete_events) / max(unique_students, 1)
        completion_rate = min(1.0, completion_rate)
        
        # Learning outcome correlation
        if assessment_scores and len(assessment_scores) >= 3:
            # Correlate engagement with outcomes
            avg_assessment = np.mean(assessment_scores)
            learning_correlation = min(1.0, avg_assessment * engagement.score)
        else:
            learning_correlation = engagement.score * 0.7  # Estimate
        
        # Student satisfaction
        if feedback_scores and len(feedback_scores) >= 3:
            satisfaction = np.mean(feedback_scores)
        else:
            satisfaction = engagement.score * 0.8  # Estimate
        
        # Difficulty alignment (based on completion patterns)
        difficulty_alignment = self._compute_difficulty_alignment(events)
        
        # Overall effectiveness
        effectiveness_score = (
            engagement.score * 0.25 +
            completion_rate * 0.25 +
            learning_correlation * 0.25 +
            satisfaction * 0.15 +
            difficulty_alignment * 0.1
        )
        
        # Generate recommendations
        recommendations = self._generate_content_recommendations(
            engagement.score, completion_rate, learning_correlation, satisfaction
        )
        
        return ContentEffectiveness(
            content_id=content_id,
            content_type=content_type,
            effectiveness_score=effectiveness_score,
            engagement_score=engagement.score,
            completion_rate=completion_rate,
            learning_outcome_correlation=learning_correlation,
            student_satisfaction=satisfaction,
            difficulty_alignment=difficulty_alignment,
            recommendations=recommendations,
        )

    def compute_cross_modal_correlations(
        self,
        events_by_modality: Dict[str, List[Dict[str, Any]]],
    ) -> List[CrossModalCorrelation]:
        """
        Compute correlations between different content modalities.

        Args:
            events_by_modality: Events grouped by modality.

        Returns:
            List of CrossModalCorrelation results.
        """
        correlations = []
        modalities = list(events_by_modality.keys())
        
        for i, mod_a in enumerate(modalities):
            for mod_b in modalities[i+1:]:
                events_a = events_by_modality[mod_a]
                events_b = events_by_modality[mod_b]
                
                if len(events_a) < self.min_events or len(events_b) < self.min_events:
                    continue
                
                # Compute engagement scores for both
                eng_a = self.compute_engagement(events_a)
                eng_b = self.compute_engagement(events_b)
                
                # Simple correlation based on engagement patterns
                # In production, would use proper statistical correlation
                correlation = self._compute_simple_correlation(events_a, events_b)
                
                # Generate insight
                insight = self._generate_correlation_insight(mod_a, mod_b, correlation)
                
                correlations.append(CrossModalCorrelation(
                    modality_a=mod_a,
                    modality_b=mod_b,
                    correlation_coefficient=correlation,
                    p_value=0.05 if abs(correlation) > 0.3 else 0.5,  # Simplified
                    sample_size=min(len(events_a), len(events_b)),
                    insight=insight,
                ))
        
        return correlations

    def compute_student_engagement_profile(
        self,
        student_id: str,
        events: List[Dict[str, Any]],
    ) -> StudentEngagementProfile:
        """
        Compute comprehensive engagement profile for a student.

        Args:
            student_id: Student identifier.
            events: All events for this student.

        Returns:
            StudentEngagementProfile.
        """
        if not events:
            return StudentEngagementProfile(
                student_id=student_id,
                overall_engagement=0.0,
                engagement_by_content_type={},
                engagement_trend="stable",
                peak_engagement_times=[],
                preferred_content_types=[],
                at_risk_indicators=[],
                recommendations=["Need more activity data for analysis"],
                last_updated=datetime.utcnow(),
            )
        
        # Overall engagement
        overall = self.compute_engagement(events)
        
        # Engagement by content type
        by_type = {}
        for content_type in ContentType:
            type_events = [e for e in events if self._get_content_type(e) == content_type.value]
            if type_events:
                type_engagement = self.compute_engagement(type_events)
                by_type[content_type.value] = type_engagement.score
        
        # Engagement trend
        trend = self._compute_engagement_trend(events)
        
        # Peak engagement times
        peak_times = self._find_peak_engagement_times(events)
        
        # Preferred content types
        preferred = sorted(by_type.items(), key=lambda x: x[1], reverse=True)
        preferred_types = [t[0] for t in preferred[:3] if t[1] > 0.5]
        
        # At-risk indicators
        at_risk = self._identify_at_risk_indicators(events, overall.score, trend)
        
        # Recommendations
        recommendations = self._generate_student_recommendations(
            overall.score, trend, at_risk, preferred_types
        )
        
        profile = StudentEngagementProfile(
            student_id=student_id,
            overall_engagement=overall.score,
            engagement_by_content_type=by_type,
            engagement_trend=trend,
            peak_engagement_times=peak_times,
            preferred_content_types=preferred_types,
            at_risk_indicators=at_risk,
            recommendations=recommendations,
            last_updated=datetime.utcnow(),
        )
        
        # Cache profile
        self._student_profiles[student_id] = profile
        
        return profile

    def generate_content_recommendations(
        self,
        student_id: str,
        student_profile: StudentEngagementProfile,
        available_content: List[Dict[str, Any]],
        limit: int = 5,
    ) -> List[ContentRecommendation]:
        """
        Generate personalized content recommendations.

        Args:
            student_id: Student identifier.
            student_profile: Student's engagement profile.
            available_content: List of available content items.
            limit: Maximum recommendations to return.

        Returns:
            List of ContentRecommendation.
        """
        recommendations = []
        
        for content in available_content:
            content_id = content.get("id", "")
            content_type = content.get("type", "document")
            
            # Compute relevance score
            relevance = self._compute_content_relevance(content, student_profile)
            
            # Predict engagement
            predicted_engagement = self._predict_engagement(content_type, student_profile)
            
            # Generate reasoning
            reasoning = self._generate_recommendation_reasoning(
                content, student_profile, relevance, predicted_engagement
            )
            
            recommendations.append(ContentRecommendation(
                content_id=content_id,
                content_type=content_type,
                relevance_score=relevance,
                predicted_engagement=predicted_engagement,
                reasoning=reasoning,
                priority=0,  # Will be set after sorting
            ))
        
        # Sort by combined score
        recommendations.sort(
            key=lambda r: r.relevance_score * 0.6 + r.predicted_engagement * 0.4,
            reverse=True
        )
        
        # Set priorities
        for i, rec in enumerate(recommendations[:limit]):
            rec.priority = i + 1
        
        return recommendations[:limit]

    def detect_anomalies(
        self,
        events: List[Dict[str, Any]],
        student_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Detect anomalies in learning behavior (potential cheating indicators).

        Args:
            events: Events to analyze.
            student_id: Optional student filter.

        Returns:
            List of detected anomalies.
        """
        anomalies = []
        
        if student_id:
            events = [e for e in events if e.get("student_id") == student_id]
        
        if len(events) < self.min_events:
            return []
        
        # Check for rapid completion (too fast)
        rapid_completions = self._detect_rapid_completions(events)
        anomalies.extend(rapid_completions)
        
        # Check for unusual patterns
        unusual_patterns = self._detect_unusual_patterns(events)
        anomalies.extend(unusual_patterns)
        
        # Check for time-based anomalies
        time_anomalies = self._detect_time_anomalies(events)
        anomalies.extend(time_anomalies)
        
        return anomalies

    # Private helper methods

    def _compute_engagement_components(
        self,
        events: List[Dict[str, Any]],
    ) -> Dict[str, float]:
        """Compute individual engagement components."""
        components = {}
        
        # Watch/read time
        total_duration = sum(e.get("duration_ms") or 0 for e in events)
        avg_duration = total_duration / len(events) if events else 0
        components["watch_time"] = min(1.0, avg_duration / 60000)  # Normalize to 1 min
        components["listen_time"] = components["watch_time"]
        components["read_time"] = components["watch_time"]
        
        # Completion
        complete_events = [e for e in events if "complete" in e.get("event_type", "")]
        components["completion"] = len(complete_events) / len(events) if events else 0
        
        # Interactions
        interaction_events = [
            e for e in events 
            if e.get("event_type") in ["highlight", "annotate", "pause", "seek"]
        ]
        components["interactions"] = min(1.0, len(interaction_events) / len(events))
        components["highlights"] = components["interactions"]
        components["annotations"] = components["interactions"]
        
        # Rewatch/return visits
        session_ids = set(e.get("session_id", "") for e in events)
        components["rewatch"] = min(1.0, (len(session_ids) - 1) / 3)
        components["return_visits"] = components["rewatch"]
        
        # Speed (normal speed is good)
        speed_events = [e for e in events if "speed_change" in e.get("event_type", "")]
        if speed_events:
            avg_speed = np.mean([e.get("metadata", {}).get("speed", 1.0) for e in speed_events])
            components["speed_normal"] = 1.0 - abs(avg_speed - 1.0)
        else:
            components["speed_normal"] = 1.0
        
        # Scroll depth
        scroll_events = [e for e in events if "scroll" in e.get("event_type", "")]
        if scroll_events:
            max_depth = max(e.get("position", 0) for e in scroll_events)
            components["scroll_depth"] = min(1.0, max_depth)
        else:
            components["scroll_depth"] = components["completion"]
        
        # Assessment-specific
        assessment_events = [e for e in events if "assessment" in e.get("event_type", "")]
        if assessment_events:
            correct = [e for e in assessment_events if e.get("metadata", {}).get("correct")]
            components["accuracy"] = len(correct) / len(assessment_events)
            components["time_on_task"] = components["watch_time"]
            components["review_behavior"] = components["interactions"]
            components["improvement"] = 0.5  # Would need historical data
        
        return components

    def _detect_primary_content_type(self, events: List[Dict[str, Any]]) -> str:
        """Detect the primary content type from events."""
        type_counts = defaultdict(int)
        for event in events:
            content_type = self._get_content_type(event)
            type_counts[content_type] += 1
        
        if not type_counts:
            return "video"
        
        return max(type_counts.items(), key=lambda x: x[1])[0]

    def _get_content_type(self, event: Dict[str, Any]) -> str:
        """Get content type from event."""
        event_type = event.get("event_type", "")
        if "video" in event_type:
            return "video"
        elif "audio" in event_type:
            return "audio"
        elif "document" in event_type or "scroll" in event_type or "highlight" in event_type:
            return "document"
        elif "assessment" in event_type:
            return "assessment"
        else:
            return event.get("content_type", "video")

    def _detect_content_type_from_id(
        self,
        content_id: str,
        events: List[Dict[str, Any]],
    ) -> str:
        """Detect content type from content ID and events."""
        if events:
            return self._detect_primary_content_type(events)
        
        # Guess from ID
        if "video" in content_id.lower():
            return "video"
        elif "audio" in content_id.lower():
            return "audio"
        elif "doc" in content_id.lower() or "pdf" in content_id.lower():
            return "document"
        elif "quiz" in content_id.lower() or "test" in content_id.lower():
            return "assessment"
        
        return "document"

    def _score_to_level(self, score: float) -> str:
        """Convert score to engagement level."""
        if score >= 0.8:
            return "very_high"
        elif score >= 0.6:
            return "high"
        elif score >= 0.4:
            return "moderate"
        elif score >= 0.2:
            return "low"
        else:
            return "very_low"

    def _is_backward_seek(self, event: Dict[str, Any]) -> bool:
        """Check if seek event is backwards (rewatch)."""
        metadata = event.get("metadata", {})
        from_pos = metadata.get("from_position", 0)
        to_pos = metadata.get("to_position", 0)
        return to_pos < from_pos

    def _is_forward_skip(self, event: Dict[str, Any]) -> bool:
        """Check if seek event is a forward skip (>30 seconds)."""
        metadata = event.get("metadata", {})
        from_pos = metadata.get("from_position", 0)
        to_pos = metadata.get("to_position", 0)
        return (to_pos - from_pos) > 30

    def _find_attention_drops(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Find points where attention dropped significantly."""
        drops = []
        
        # Group events by time windows
        # Simplified - in production would use proper time series analysis
        skip_events = [e for e in events if self._is_forward_skip(e)]
        
        for event in skip_events[:5]:  # Limit
            metadata = event.get("metadata", {})
            drops.append({
                "position": metadata.get("from_position", 0),
                "drop_type": "skip",
                "timestamp": event.get("timestamp"),
            })
        
        return drops

    def _find_peak_attention(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Find points of peak attention."""
        peaks = []
        
        # Find rewatch events
        rewatch_events = [e for e in events if self._is_backward_seek(e)]
        
        for event in rewatch_events[:5]:  # Limit
            metadata = event.get("metadata", {})
            peaks.append({
                "position": metadata.get("to_position", 0),
                "peak_type": "rewatch",
                "timestamp": event.get("timestamp"),
            })
        
        return peaks

    def _compute_difficulty_alignment(self, events: List[Dict[str, Any]]) -> float:
        """Compute how well content difficulty aligns with student level."""
        if not events:
            return 0.5
        
        # Use completion and engagement as proxies
        complete = len([e for e in events if "complete" in e.get("event_type", "")])
        total = len(events)
        
        completion_rate = complete / total if total > 0 else 0
        
        # Ideal completion rate is around 70-80%
        # Too high (>90%) might be too easy, too low (<40%) might be too hard
        if 0.6 <= completion_rate <= 0.85:
            return 1.0
        elif completion_rate > 0.85:
            return 0.8  # Possibly too easy
        elif completion_rate >= 0.4:
            return 0.7  # Acceptable
        else:
            return 0.5  # Possibly too hard

    def _generate_content_recommendations(
        self,
        engagement: float,
        completion: float,
        learning: float,
        satisfaction: float,
    ) -> List[str]:
        """Generate recommendations for content improvement."""
        recommendations = []
        
        if engagement < 0.5:
            recommendations.append("Consider adding more interactive elements")
            recommendations.append("Review content pacing and structure")
        
        if completion < 0.6:
            recommendations.append("Content may be too long - consider breaking into smaller segments")
            recommendations.append("Add progress indicators and checkpoints")
        
        if learning < 0.5:
            recommendations.append("Add more practice exercises and assessments")
            recommendations.append("Strengthen connections between concepts")
        
        if satisfaction < 0.5:
            recommendations.append("Gather student feedback for specific improvements")
            recommendations.append("Review content quality and presentation")
        
        if not recommendations:
            recommendations.append("Content performing well - maintain current approach")
        
        return recommendations

    def _compute_simple_correlation(
        self,
        events_a: List[Dict[str, Any]],
        events_b: List[Dict[str, Any]],
    ) -> float:
        """Compute simplified correlation between event sets."""
        # In production, would use proper statistical methods
        eng_a = self.compute_engagement(events_a)
        eng_b = self.compute_engagement(events_b)
        
        # Simple correlation based on engagement similarity
        diff = abs(eng_a.score - eng_b.score)
        correlation = 1.0 - diff
        
        return correlation

    def _generate_correlation_insight(
        self,
        mod_a: str,
        mod_b: str,
        correlation: float,
    ) -> str:
        """Generate insight from correlation."""
        if correlation > 0.7:
            return f"Strong positive relationship between {mod_a} and {mod_b} engagement"
        elif correlation > 0.4:
            return f"Moderate positive relationship between {mod_a} and {mod_b}"
        elif correlation > 0.0:
            return f"Weak positive relationship between {mod_a} and {mod_b}"
        else:
            return f"No significant relationship between {mod_a} and {mod_b}"

    def _compute_engagement_trend(self, events: List[Dict[str, Any]]) -> str:
        """Compute engagement trend over time."""
        if len(events) < 10:
            return "stable"
        
        # Sort by timestamp
        sorted_events = sorted(events, key=lambda e: e.get("timestamp", ""))
        
        # Split into halves
        mid = len(sorted_events) // 2
        first_half = sorted_events[:mid]
        second_half = sorted_events[mid:]
        
        eng_first = self.compute_engagement(first_half)
        eng_second = self.compute_engagement(second_half)
        
        diff = eng_second.score - eng_first.score
        
        if diff > 0.1:
            return "improving"
        elif diff < -0.1:
            return "declining"
        else:
            return "stable"

    def _find_peak_engagement_times(self, events: List[Dict[str, Any]]) -> List[str]:
        """Find times of day with peak engagement."""
        hour_counts = defaultdict(int)
        
        for event in events:
            timestamp = event.get("timestamp")
            if isinstance(timestamp, str):
                try:
                    dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                    hour_counts[dt.hour] += 1
                except ValueError:
                    pass
            elif isinstance(timestamp, datetime):
                hour_counts[timestamp.hour] += 1
        
        if not hour_counts:
            return []
        
        # Find top 3 hours
        sorted_hours = sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)
        peak_times = []
        
        for hour, count in sorted_hours[:3]:
            if hour < 12:
                period = "morning"
            elif hour < 17:
                period = "afternoon"
            else:
                period = "evening"
            peak_times.append(f"{hour:02d}:00 ({period})")
        
        return peak_times

    def _identify_at_risk_indicators(
        self,
        events: List[Dict[str, Any]],
        engagement: float,
        trend: str,
    ) -> List[str]:
        """Identify at-risk indicators."""
        indicators = []
        
        if engagement < 0.3:
            indicators.append("Very low overall engagement")
        
        if trend == "declining":
            indicators.append("Declining engagement trend")
        
        # Check for inactivity
        if events:
            latest = max(
                events,
                key=lambda e: e.get("timestamp", datetime.min)
            )
            latest_ts = latest.get("timestamp")
            if isinstance(latest_ts, str):
                try:
                    latest_ts = datetime.fromisoformat(latest_ts.replace("Z", "+00:00"))
                except ValueError:
                    latest_ts = None
            
            if latest_ts and (datetime.utcnow() - latest_ts).days > 7:
                indicators.append("No activity in past 7 days")
        
        # Check completion rate
        complete = len([e for e in events if "complete" in e.get("event_type", "")])
        if complete == 0 and len(events) > 10:
            indicators.append("No content completions recorded")
        
        return indicators

    def _generate_student_recommendations(
        self,
        engagement: float,
        trend: str,
        at_risk: List[str],
        preferred_types: List[str],
    ) -> List[str]:
        """Generate recommendations for a student."""
        recommendations = []
        
        if at_risk:
            recommendations.append("Consider reaching out for support")
        
        if engagement < 0.5:
            if preferred_types:
                recommendations.append(
                    f"Try more {preferred_types[0]} content for better engagement"
                )
            recommendations.append("Set smaller, achievable learning goals")
        
        if trend == "declining":
            recommendations.append("Review recent learning activities for challenges")
            recommendations.append("Consider adjusting study schedule")
        
        if trend == "improving":
            recommendations.append("Great progress! Keep up the momentum")
        
        if not recommendations:
            recommendations.append("Continue with current learning approach")
        
        return recommendations

    def _compute_content_relevance(
        self,
        content: Dict[str, Any],
        profile: StudentEngagementProfile,
    ) -> float:
        """Compute content relevance for a student."""
        content_type = content.get("type", "document")
        
        # Base relevance on content type preference
        if content_type in profile.preferred_content_types:
            type_relevance = 0.8
        else:
            type_relevance = 0.5
        
        # Consider topic relevance (would use more sophisticated matching in production)
        topic_relevance = 0.6  # Default
        
        return (type_relevance + topic_relevance) / 2

    def _predict_engagement(
        self,
        content_type: str,
        profile: StudentEngagementProfile,
    ) -> float:
        """Predict engagement for content based on profile."""
        # Use historical engagement for this content type
        historical = profile.engagement_by_content_type.get(content_type, 0.5)
        
        # Adjust for trend
        if profile.engagement_trend == "improving":
            predicted = historical * 1.1
        elif profile.engagement_trend == "declining":
            predicted = historical * 0.9
        else:
            predicted = historical
        
        return min(1.0, max(0.0, predicted))

    def _generate_recommendation_reasoning(
        self,
        content: Dict[str, Any],
        profile: StudentEngagementProfile,
        relevance: float,
        predicted_engagement: float,
    ) -> List[str]:
        """Generate reasoning for a recommendation."""
        reasoning = []
        
        content_type = content.get("type", "document")
        
        if content_type in profile.preferred_content_types:
            reasoning.append(f"Matches preferred content type: {content_type}")
        
        if predicted_engagement > 0.7:
            reasoning.append("High predicted engagement based on history")
        
        if relevance > 0.7:
            reasoning.append("Strong relevance to learning goals")
        
        if not reasoning:
            reasoning.append("Recommended for comprehensive coverage")
        
        return reasoning

    def _detect_rapid_completions(
        self,
        events: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Detect suspiciously rapid content completions."""
        anomalies = []
        
        # Find complete events
        complete_events = [e for e in events if "complete" in e.get("event_type", "")]
        
        for event in complete_events:
            duration = event.get("duration_ms") or 0
            expected_min = event.get("metadata", {}).get("expected_duration_ms", 60000)
            
            if duration > 0 and duration < expected_min * 0.1:  # Less than 10% expected time
                anomalies.append({
                    "type": "rapid_completion",
                    "severity": "high",
                    "description": "Content completed unusually fast",
                    "event_id": event.get("event_id"),
                    "duration_ms": duration,
                    "expected_min_ms": expected_min * 0.5,
                })
        
        return anomalies

    def _detect_unusual_patterns(
        self,
        events: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Detect unusual behavioral patterns."""
        anomalies = []
        
        # Check for repeated exact answer patterns (copy-paste)
        assessment_events = [e for e in events if "assessment" in e.get("event_type", "")]
        
        if len(assessment_events) >= 5:
            # Check for consistent perfect scores
            correct = [e for e in assessment_events if e.get("metadata", {}).get("correct")]
            if len(correct) == len(assessment_events):
                times = [(e.get("duration_ms") or 0) for e in assessment_events]
                if times and max(times) < 5000:  # All answered in < 5 seconds
                    anomalies.append({
                        "type": "perfect_rapid_answers",
                        "severity": "medium",
                        "description": "All answers correct with very fast response times",
                        "count": len(correct),
                    })
        
        return anomalies

    def _detect_time_anomalies(
        self,
        events: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Detect time-based anomalies."""
        anomalies = []
        
        # Sort by timestamp
        sorted_events = sorted(
            [e for e in events if e.get("timestamp")],
            key=lambda e: e.get("timestamp", "")
        )
        
        if len(sorted_events) < 2:
            return []
        
        # Check for impossible time gaps (negative or too small)
        for i in range(1, len(sorted_events)):
            prev = sorted_events[i-1]
            curr = sorted_events[i]
            
            prev_ts = prev.get("timestamp")
            curr_ts = curr.get("timestamp")
            
            if isinstance(prev_ts, str) and isinstance(curr_ts, str):
                try:
                    prev_dt = datetime.fromisoformat(prev_ts.replace("Z", "+00:00"))
                    curr_dt = datetime.fromisoformat(curr_ts.replace("Z", "+00:00"))
                    gap = (curr_dt - prev_dt).total_seconds()
                    
                    if gap < 0:
                        anomalies.append({
                            "type": "time_inconsistency",
                            "severity": "high",
                            "description": "Events recorded out of chronological order",
                            "gap_seconds": gap,
                        })
                except ValueError:
                    pass
        
        return anomalies
