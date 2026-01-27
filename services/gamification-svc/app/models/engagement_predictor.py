"""
Engagement Predictor

Predict engagement levels and dropout risk using behavioral patterns.
"""
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class EngagementLevel(str, Enum):
    """Engagement level categories."""
    HIGHLY_ENGAGED = "highly_engaged"
    ENGAGED = "engaged"
    NEUTRAL = "neutral"
    DISENGAGING = "disengaging"
    AT_RISK = "at_risk"


class InterventionType(str, Enum):
    """Types of re-engagement interventions."""
    STREAK_REMINDER = "streak_reminder"
    ACHIEVEMENT_NUDGE = "achievement_nudge"
    CHALLENGE_INVITATION = "challenge_invitation"
    REWARD_TEASER = "reward_teaser"
    SOCIAL_PROMPT = "social_prompt"
    DIFFICULTY_ADJUSTMENT = "difficulty_adjustment"
    PERSONALIZED_CONTENT = "personalized_content"
    BREAK_SUGGESTION = "break_suggestion"
    GOAL_REMINDER = "goal_reminder"
    CELEBRATION = "celebration"


@dataclass
class DisengagementSignal:
    """A detected signal of disengagement."""
    signal_type: str
    severity: float  # 0-1, higher = more severe
    description: str
    detected_at: datetime
    metric_value: Optional[float] = None
    expected_value: Optional[float] = None


@dataclass
class EngagementPrediction:
    """Prediction results for engagement and dropout risk."""
    engagement_level: EngagementLevel
    engagement_score: float  # 0-1
    dropout_risk: float  # 0-1
    dropout_probability_7_days: float  # Probability of dropout in next 7 days
    dropout_probability_30_days: float  # Probability of dropout in next 30 days
    intervention_recommended: bool
    suggested_interventions: List[str]
    disengagement_signals: List[DisengagementSignal]
    confidence: float  # 0-1 confidence in prediction


class EngagementPredictor:
    """
    Predict engagement and prevent disengagement.

    Signals analyzed:
    - Activity frequency
    - Session duration trends
    - Performance patterns
    - Social interactions
    - Response time changes
    - Streak maintenance
    - Goal completion

    Usage:
        predictor = EngagementPredictor()
        prediction = predictor.predict_engagement(learner_state)
    """

    # Thresholds for engagement levels
    HIGH_ENGAGEMENT_THRESHOLD = 0.8
    ENGAGED_THRESHOLD = 0.6
    NEUTRAL_THRESHOLD = 0.4
    DISENGAGING_THRESHOLD = 0.25

    # Dropout risk thresholds
    LOW_RISK_THRESHOLD = 0.2
    MEDIUM_RISK_THRESHOLD = 0.5
    HIGH_RISK_THRESHOLD = 0.75

    # Feature weights for engagement score
    FEATURE_WEIGHTS = {
        "activity_frequency": 0.20,
        "session_duration": 0.15,
        "streak_maintenance": 0.15,
        "performance_trend": 0.12,
        "completion_rate": 0.12,
        "social_engagement": 0.08,
        "goal_progress": 0.10,
        "recency": 0.08,
    }

    def __init__(self):
        """Initialize the engagement predictor."""
        logger.info("EngagementPredictor initialized")

    def predict_engagement(
        self,
        learner_state: Dict[str, Any],
    ) -> EngagementPrediction:
        """
        Predict engagement level and dropout risk.

        Args:
            learner_state: Dictionary containing learner's current state including:
                - learner_id: str
                - recent_activities: List[Dict] - recent activity records
                - streak_days: int - current streak length
                - level: int - current level
                - total_xp: int - total XP earned
                - daily_goal_completion: float - recent goal completion rate
                - last_active_at: str/datetime - last activity timestamp
                - session_history: List[Dict] - session duration history
                - performance_history: List[Dict] - recent performance metrics

        Returns:
            EngagementPrediction with level, risk, and recommendations
        """
        # Extract features
        features = self._extract_features(learner_state)

        # Calculate engagement score
        engagement_score = self._calculate_engagement_score(features)

        # Identify disengagement signals
        signals = self.identify_disengagement_signs(
            learner_state.get("recent_activities", []),
            learner_state,
        )

        # Calculate dropout risk
        dropout_risk, prob_7d, prob_30d = self._calculate_dropout_risk(
            features, signals
        )

        # Determine engagement level
        engagement_level = self._determine_engagement_level(
            engagement_score, dropout_risk
        )

        # Generate intervention recommendations
        intervention_needed = dropout_risk > self.LOW_RISK_THRESHOLD
        interventions = []
        if intervention_needed:
            interventions = self._suggest_interventions(
                learner_state, signals, engagement_level
            )

        # Calculate confidence based on data availability
        confidence = self._calculate_confidence(learner_state)

        return EngagementPrediction(
            engagement_level=engagement_level,
            engagement_score=round(engagement_score, 3),
            dropout_risk=round(dropout_risk, 3),
            dropout_probability_7_days=round(prob_7d, 3),
            dropout_probability_30_days=round(prob_30d, 3),
            intervention_recommended=intervention_needed,
            suggested_interventions=interventions,
            disengagement_signals=signals,
            confidence=round(confidence, 3),
        )

    def predict_dropout_risk(
        self,
        learner_state: Dict[str, Any],
    ) -> Tuple[float, List[str]]:
        """
        Predict dropout risk based on behavioral patterns.

        Args:
            learner_state: Dictionary containing learner's current state

        Returns:
            Tuple of (dropout_risk, risk_factors)
        """
        features = self._extract_features(learner_state)
        signals = self.identify_disengagement_signs(
            learner_state.get("recent_activities", []),
            learner_state,
        )

        dropout_risk, _, _ = self._calculate_dropout_risk(features, signals)

        # Identify key risk factors
        risk_factors = []
        for signal in signals:
            if signal.severity > 0.5:
                risk_factors.append(signal.description)

        # Add feature-based risk factors
        if features.get("days_since_active", 0) > 3:
            risk_factors.append(
                f"No activity for {features['days_since_active']} days"
            )
        if features.get("activity_frequency", 1) < 0.3:
            risk_factors.append("Declining activity frequency")
        if features.get("streak_maintenance", 1) < 0.5:
            risk_factors.append("Broken or declining streak")

        return (round(dropout_risk, 3), risk_factors)

    def identify_disengagement_signs(
        self,
        activity_history: List[Dict[str, Any]],
        learner_state: Optional[Dict[str, Any]] = None,
    ) -> List[DisengagementSignal]:
        """
        Identify early disengagement signals from activity patterns.

        Args:
            activity_history: List of recent activities
            learner_state: Optional additional learner state data

        Returns:
            List of detected DisengagementSignal objects
        """
        signals: List[DisengagementSignal] = []
        now = datetime.utcnow()
        learner_state = learner_state or {}

        # Check activity frequency decline
        frequency_signal = self._check_activity_frequency(activity_history)
        if frequency_signal:
            signals.append(frequency_signal)

        # Check session duration decline
        duration_signal = self._check_session_duration(
            learner_state.get("session_history", [])
        )
        if duration_signal:
            signals.append(duration_signal)

        # Check performance decline
        performance_signal = self._check_performance_trend(
            learner_state.get("performance_history", [])
        )
        if performance_signal:
            signals.append(performance_signal)

        # Check streak at risk
        streak_signal = self._check_streak_risk(learner_state)
        if streak_signal:
            signals.append(streak_signal)

        # Check goal completion decline
        goal_signal = self._check_goal_completion(learner_state)
        if goal_signal:
            signals.append(goal_signal)

        # Check time since last activity
        recency_signal = self._check_activity_recency(learner_state)
        if recency_signal:
            signals.append(recency_signal)

        # Check for frustration patterns
        frustration_signal = self._check_frustration_patterns(activity_history)
        if frustration_signal:
            signals.append(frustration_signal)

        # Sort by severity (most severe first)
        signals.sort(key=lambda s: s.severity, reverse=True)

        return signals

    def suggest_re_engagement(
        self,
        learner_profile: Dict[str, Any],
        disengagement_signals: List[DisengagementSignal],
    ) -> List[str]:
        """
        Suggest re-engagement strategies based on signals.

        Args:
            learner_profile: Dictionary containing learner preferences and history
            disengagement_signals: List of detected disengagement signals

        Returns:
            List of suggested re-engagement strategies
        """
        strategies = []

        for signal in disengagement_signals:
            if signal.signal_type == "activity_frequency_decline":
                strategies.append(InterventionType.STREAK_REMINDER.value)
                strategies.append(InterventionType.CHALLENGE_INVITATION.value)

            elif signal.signal_type == "session_duration_decline":
                strategies.append(InterventionType.PERSONALIZED_CONTENT.value)
                strategies.append(InterventionType.GOAL_REMINDER.value)

            elif signal.signal_type == "performance_decline":
                strategies.append(InterventionType.DIFFICULTY_ADJUSTMENT.value)
                strategies.append(InterventionType.ACHIEVEMENT_NUDGE.value)

            elif signal.signal_type == "streak_at_risk":
                strategies.append(InterventionType.STREAK_REMINDER.value)
                strategies.append(InterventionType.REWARD_TEASER.value)

            elif signal.signal_type == "goal_completion_decline":
                strategies.append(InterventionType.GOAL_REMINDER.value)
                strategies.append(InterventionType.CELEBRATION.value)

            elif signal.signal_type == "inactivity":
                strategies.append(InterventionType.SOCIAL_PROMPT.value)
                strategies.append(InterventionType.PERSONALIZED_CONTENT.value)

            elif signal.signal_type == "frustration":
                strategies.append(InterventionType.DIFFICULTY_ADJUSTMENT.value)
                strategies.append(InterventionType.BREAK_SUGGESTION.value)

        # Remove duplicates while preserving order
        seen = set()
        unique_strategies = []
        for strategy in strategies:
            if strategy not in seen:
                seen.add(strategy)
                unique_strategies.append(strategy)

        # Personalize based on learner preferences
        preferences = learner_profile.get("preferences", {})
        if preferences.get("social_learning", True) is False:
            unique_strategies = [
                s for s in unique_strategies
                if s != InterventionType.SOCIAL_PROMPT.value
            ]

        return unique_strategies[:5]  # Limit to top 5 strategies

    def _extract_features(
        self,
        learner_state: Dict[str, Any],
    ) -> Dict[str, float]:
        """Extract engagement features from learner state."""
        features = {}
        now = datetime.utcnow()

        # Activity frequency (normalized to 0-1)
        recent_activities = learner_state.get("recent_activities", [])
        if recent_activities:
            # Count activities in last 7 days
            week_ago = now - timedelta(days=7)
            recent_count = sum(
                1 for a in recent_activities
                if self._parse_timestamp(a.get("timestamp", "")) and
                self._parse_timestamp(a.get("timestamp", "")) > week_ago
            )
            # Normalize: 7+ activities/week = 1.0
            features["activity_frequency"] = min(1.0, recent_count / 7.0)
        else:
            features["activity_frequency"] = 0.0

        # Session duration (normalized)
        session_history = learner_state.get("session_history", [])
        if session_history:
            recent_sessions = session_history[-5:]
            avg_duration = np.mean([
                s.get("duration_minutes", 0) for s in recent_sessions
            ])
            # Normalize: 30+ minutes = 1.0
            features["session_duration"] = min(1.0, avg_duration / 30.0)
        else:
            features["session_duration"] = 0.5  # Default

        # Streak maintenance
        streak_days = learner_state.get("streak_days", 0)
        longest_streak = learner_state.get("longest_streak", streak_days)
        if longest_streak > 0:
            features["streak_maintenance"] = min(1.0, streak_days / max(longest_streak, 7))
        else:
            features["streak_maintenance"] = 0.5

        # Performance trend
        performance_history = learner_state.get("performance_history", [])
        if len(performance_history) >= 3:
            recent_scores = [p.get("accuracy", 0.5) for p in performance_history[-5:]]
            older_scores = [p.get("accuracy", 0.5) for p in performance_history[-10:-5]]
            if older_scores:
                trend = np.mean(recent_scores) - np.mean(older_scores)
                # Normalize trend to 0-1 (trend can be -1 to 1)
                features["performance_trend"] = (trend + 1) / 2
            else:
                features["performance_trend"] = 0.5
        else:
            features["performance_trend"] = 0.5

        # Completion rate
        features["completion_rate"] = learner_state.get(
            "challenge_completion_rate", 0.7
        )

        # Social engagement
        peers_helped = learner_state.get("peers_helped", 0)
        features["social_engagement"] = min(1.0, peers_helped / 10.0)

        # Goal progress
        features["goal_progress"] = learner_state.get(
            "daily_goal_completion", 0.5
        )

        # Recency (how recently active)
        last_active = learner_state.get("last_active_at")
        if last_active:
            last_active_dt = self._parse_timestamp(last_active)
            if last_active_dt:
                days_since = (now - last_active_dt).days
                features["days_since_active"] = days_since
                # Normalize: 0 days = 1.0, 7+ days = 0.0
                features["recency"] = max(0.0, 1.0 - days_since / 7.0)
            else:
                features["recency"] = 0.5
                features["days_since_active"] = 0
        else:
            features["recency"] = 0.5
            features["days_since_active"] = 0

        return features

    def _calculate_engagement_score(
        self,
        features: Dict[str, float],
    ) -> float:
        """Calculate overall engagement score from features."""
        score = 0.0
        total_weight = 0.0

        for feature_name, weight in self.FEATURE_WEIGHTS.items():
            if feature_name in features:
                score += features[feature_name] * weight
                total_weight += weight

        if total_weight > 0:
            score /= total_weight

        return float(np.clip(score, 0.0, 1.0))

    def _calculate_dropout_risk(
        self,
        features: Dict[str, float],
        signals: List[DisengagementSignal],
    ) -> Tuple[float, float, float]:
        """
        Calculate dropout risk based on features and signals.

        Returns:
            Tuple of (overall_risk, 7_day_probability, 30_day_probability)
        """
        # Base risk from engagement score
        engagement_score = self._calculate_engagement_score(features)
        base_risk = 1.0 - engagement_score

        # Adjust based on disengagement signals
        signal_risk = 0.0
        if signals:
            signal_risk = np.mean([s.severity for s in signals])

        # Combine risks
        overall_risk = 0.6 * base_risk + 0.4 * signal_risk

        # Factor in recency (days since active is very predictive)
        days_inactive = features.get("days_since_active", 0)
        if days_inactive > 0:
            # Exponential increase in risk with inactivity
            inactivity_factor = 1.0 - np.exp(-days_inactive / 5.0)
            overall_risk = overall_risk * 0.7 + inactivity_factor * 0.3

        overall_risk = float(np.clip(overall_risk, 0.0, 1.0))

        # Calculate time-specific probabilities
        # Using a simplified model based on current risk
        prob_7_days = overall_risk * (1 - np.exp(-0.3))  # ~26% base rate scaled by risk
        prob_30_days = overall_risk * (1 - np.exp(-1.0))  # ~63% base rate scaled by risk

        return (overall_risk, prob_7_days, prob_30_days)

    def _determine_engagement_level(
        self,
        engagement_score: float,
        dropout_risk: float,
    ) -> EngagementLevel:
        """Determine engagement level category."""
        # Combine engagement score with dropout risk for more robust classification
        combined_score = engagement_score * 0.7 + (1 - dropout_risk) * 0.3

        if combined_score >= self.HIGH_ENGAGEMENT_THRESHOLD:
            return EngagementLevel.HIGHLY_ENGAGED
        elif combined_score >= self.ENGAGED_THRESHOLD:
            return EngagementLevel.ENGAGED
        elif combined_score >= self.NEUTRAL_THRESHOLD:
            return EngagementLevel.NEUTRAL
        elif combined_score >= self.DISENGAGING_THRESHOLD:
            return EngagementLevel.DISENGAGING
        else:
            return EngagementLevel.AT_RISK

    def _suggest_interventions(
        self,
        learner_state: Dict[str, Any],
        signals: List[DisengagementSignal],
        engagement_level: EngagementLevel,
    ) -> List[str]:
        """Generate intervention recommendations."""
        interventions = self.suggest_re_engagement(learner_state, signals)

        # Add engagement-level specific interventions
        if engagement_level == EngagementLevel.AT_RISK:
            if InterventionType.PERSONALIZED_CONTENT.value not in interventions:
                interventions.insert(0, InterventionType.PERSONALIZED_CONTENT.value)

        elif engagement_level == EngagementLevel.DISENGAGING:
            if InterventionType.ACHIEVEMENT_NUDGE.value not in interventions:
                interventions.append(InterventionType.ACHIEVEMENT_NUDGE.value)

        return interventions[:5]

    def _calculate_confidence(
        self,
        learner_state: Dict[str, Any],
    ) -> float:
        """Calculate confidence in prediction based on data availability."""
        confidence_factors = []

        # More recent activities = higher confidence
        activities = learner_state.get("recent_activities", [])
        if len(activities) >= 20:
            confidence_factors.append(1.0)
        elif len(activities) >= 10:
            confidence_factors.append(0.8)
        elif len(activities) >= 5:
            confidence_factors.append(0.6)
        else:
            confidence_factors.append(0.3)

        # Session history availability
        sessions = learner_state.get("session_history", [])
        if len(sessions) >= 10:
            confidence_factors.append(1.0)
        elif len(sessions) >= 5:
            confidence_factors.append(0.7)
        else:
            confidence_factors.append(0.4)

        # Performance history availability
        performance = learner_state.get("performance_history", [])
        if len(performance) >= 10:
            confidence_factors.append(1.0)
        elif len(performance) >= 5:
            confidence_factors.append(0.7)
        else:
            confidence_factors.append(0.4)

        # Account tenure (longer = more reliable patterns)
        total_xp = learner_state.get("total_xp", 0)
        if total_xp >= 5000:
            confidence_factors.append(1.0)
        elif total_xp >= 1000:
            confidence_factors.append(0.8)
        else:
            confidence_factors.append(0.5)

        return float(np.mean(confidence_factors)) if confidence_factors else 0.5

    def _check_activity_frequency(
        self,
        activity_history: List[Dict[str, Any]],
    ) -> Optional[DisengagementSignal]:
        """Check for declining activity frequency."""
        if len(activity_history) < 10:
            return None

        now = datetime.utcnow()

        # Compare recent week to previous week
        week_ago = now - timedelta(days=7)
        two_weeks_ago = now - timedelta(days=14)

        recent_count = 0
        previous_count = 0

        for activity in activity_history:
            timestamp = self._parse_timestamp(activity.get("timestamp"))
            if timestamp:
                if timestamp > week_ago:
                    recent_count += 1
                elif timestamp > two_weeks_ago:
                    previous_count += 1

        if previous_count > 0:
            decline_ratio = recent_count / previous_count
            if decline_ratio < 0.5:
                severity = min(1.0, (1.0 - decline_ratio))
                return DisengagementSignal(
                    signal_type="activity_frequency_decline",
                    severity=severity,
                    description=f"Activity dropped {int((1-decline_ratio)*100)}% from previous week",
                    detected_at=now,
                    metric_value=float(recent_count),
                    expected_value=float(previous_count),
                )

        return None

    def _check_session_duration(
        self,
        session_history: List[Dict[str, Any]],
    ) -> Optional[DisengagementSignal]:
        """Check for declining session duration."""
        if len(session_history) < 6:
            return None

        recent_sessions = session_history[-3:]
        older_sessions = session_history[-6:-3]

        recent_avg = np.mean([s.get("duration_minutes", 0) for s in recent_sessions])
        older_avg = np.mean([s.get("duration_minutes", 0) for s in older_sessions])

        if older_avg > 5:  # Meaningful baseline
            decline_ratio = recent_avg / older_avg
            if decline_ratio < 0.6:
                severity = min(1.0, (1.0 - decline_ratio) * 0.8)
                return DisengagementSignal(
                    signal_type="session_duration_decline",
                    severity=severity,
                    description=f"Session duration dropped to {recent_avg:.1f} min (was {older_avg:.1f} min)",
                    detected_at=datetime.utcnow(),
                    metric_value=recent_avg,
                    expected_value=older_avg,
                )

        return None

    def _check_performance_trend(
        self,
        performance_history: List[Dict[str, Any]],
    ) -> Optional[DisengagementSignal]:
        """Check for declining performance."""
        if len(performance_history) < 6:
            return None

        recent = performance_history[-3:]
        older = performance_history[-6:-3]

        recent_avg = np.mean([p.get("accuracy", 0.5) for p in recent])
        older_avg = np.mean([p.get("accuracy", 0.5) for p in older])

        decline = older_avg - recent_avg
        if decline > 0.15:  # 15% drop in accuracy
            severity = min(1.0, decline * 2)
            return DisengagementSignal(
                signal_type="performance_decline",
                severity=severity,
                description=f"Performance dropped from {older_avg*100:.0f}% to {recent_avg*100:.0f}%",
                detected_at=datetime.utcnow(),
                metric_value=recent_avg,
                expected_value=older_avg,
            )

        return None

    def _check_streak_risk(
        self,
        learner_state: Dict[str, Any],
    ) -> Optional[DisengagementSignal]:
        """Check if streak is at risk."""
        streak_days = learner_state.get("streak_days", 0)
        if streak_days == 0:
            return None

        last_active = learner_state.get("last_active_at")
        if not last_active:
            return None

        last_active_dt = self._parse_timestamp(last_active)
        if not last_active_dt:
            return None

        now = datetime.utcnow()
        hours_since = (now - last_active_dt).total_seconds() / 3600

        # Streak is at risk if > 20 hours since last activity
        if hours_since > 20 and streak_days > 0:
            severity = min(1.0, (hours_since - 20) / 4)  # Max severity at 24h
            return DisengagementSignal(
                signal_type="streak_at_risk",
                severity=severity * (min(streak_days, 30) / 30),  # Higher severity for longer streaks
                description=f"{streak_days}-day streak at risk ({24-hours_since:.1f}h remaining)",
                detected_at=now,
                metric_value=hours_since,
                expected_value=20.0,
            )

        return None

    def _check_goal_completion(
        self,
        learner_state: Dict[str, Any],
    ) -> Optional[DisengagementSignal]:
        """Check for declining goal completion."""
        goal_history = learner_state.get("goal_completion_history", [])
        if len(goal_history) < 5:
            return None

        recent = goal_history[-3:]
        older = goal_history[-6:-3] if len(goal_history) >= 6 else goal_history[:-3]

        recent_rate = np.mean(recent)
        older_rate = np.mean(older) if older else 0.5

        if older_rate > 0.3 and recent_rate < older_rate * 0.5:
            severity = min(1.0, (1.0 - recent_rate / older_rate) * 0.7)
            return DisengagementSignal(
                signal_type="goal_completion_decline",
                severity=severity,
                description=f"Daily goal completion dropped to {recent_rate*100:.0f}%",
                detected_at=datetime.utcnow(),
                metric_value=recent_rate,
                expected_value=older_rate,
            )

        return None

    def _check_activity_recency(
        self,
        learner_state: Dict[str, Any],
    ) -> Optional[DisengagementSignal]:
        """Check for prolonged inactivity."""
        last_active = learner_state.get("last_active_at")
        if not last_active:
            return None

        last_active_dt = self._parse_timestamp(last_active)
        if not last_active_dt:
            return None

        now = datetime.utcnow()
        days_inactive = (now - last_active_dt).days

        if days_inactive >= 3:
            severity = min(1.0, days_inactive / 7)
            return DisengagementSignal(
                signal_type="inactivity",
                severity=severity,
                description=f"No activity for {days_inactive} days",
                detected_at=now,
                metric_value=float(days_inactive),
                expected_value=1.0,
            )

        return None

    def _check_frustration_patterns(
        self,
        activity_history: List[Dict[str, Any]],
    ) -> Optional[DisengagementSignal]:
        """Check for signs of frustration (repeated failures, rage quits)."""
        if len(activity_history) < 5:
            return None

        recent = activity_history[-10:]

        # Count consecutive failures
        consecutive_failures = 0
        max_consecutive_failures = 0

        for activity in recent:
            if activity.get("result") == "failure" or activity.get("accuracy", 1.0) < 0.3:
                consecutive_failures += 1
                max_consecutive_failures = max(max_consecutive_failures, consecutive_failures)
            else:
                consecutive_failures = 0

        # Check for rage quit patterns (abandoned sessions)
        abandoned_sessions = sum(
            1 for a in recent
            if a.get("abandoned", False) or a.get("completion_rate", 1.0) < 0.3
        )

        if max_consecutive_failures >= 3 or abandoned_sessions >= 2:
            severity = min(1.0, (max_consecutive_failures / 5 + abandoned_sessions / 3) / 2)
            return DisengagementSignal(
                signal_type="frustration",
                severity=severity,
                description="Signs of frustration detected (repeated failures or abandoned sessions)",
                detected_at=datetime.utcnow(),
                metric_value=float(max_consecutive_failures),
                expected_value=0.0,
            )

        return None

    def _parse_timestamp(
        self,
        timestamp: Any,
    ) -> Optional[datetime]:
        """Parse a timestamp from various formats."""
        if isinstance(timestamp, datetime):
            return timestamp
        if isinstance(timestamp, str):
            try:
                # Handle ISO format with or without timezone
                timestamp = timestamp.replace("Z", "+00:00")
                return datetime.fromisoformat(timestamp)
            except (ValueError, TypeError):
                return None
        return None
