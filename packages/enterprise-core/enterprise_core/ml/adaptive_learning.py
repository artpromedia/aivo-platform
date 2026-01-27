"""
Adaptive Learning Orchestrator

Intelligent system that analyzes learner performance and makes recommendations
for difficulty adjustments, content suggestions, and personalized learning paths.

Ported from: aivo-pro/services/training-alignment-svc/src/adaptive_orchestrator.py

Features:
- Performance classification (struggling to advanced)
- Intelligent level recommendations
- Urgent intervention detection
- Evidence-based reasoning
- Confidence scoring

Author: AIVO Platform Team
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class PerformanceLevel(str, Enum):
    """Learner performance classification."""

    STRUGGLING = "struggling"  # < 60% accuracy
    DEVELOPING = "developing"  # 60-74% accuracy
    PROFICIENT = "proficient"  # 75-89% accuracy
    MASTERED = "mastered"  # >= 90% accuracy
    ADVANCED = "advanced"  # 95%+ with speed


class RecommendationType(str, Enum):
    """Types of learning recommendations."""

    LEVEL_UP = "level_up"  # Advance to harder content
    LEVEL_DOWN = "level_down"  # Return to easier content
    MAINTAIN = "maintain"  # Continue current level
    REMEDIATION = "remediation"  # Review fundamentals
    ENRICHMENT = "enrichment"  # Additional challenges
    BREAK = "break"  # Suggest break/rest
    CHANGE_APPROACH = "change_approach"  # Different teaching method


@dataclass
class LearnerMetrics:
    """
    Real-time learner performance metrics.

    Comprehensive metrics capturing performance, engagement, and progress.

    Attributes:
        student_id: Student identifier
        subject: Subject being studied
        skill: Specific skill being practiced
        recent_accuracy: Accuracy over last 10 attempts
        overall_accuracy: All-time accuracy for this skill
        completion_rate: Percentage of assigned tasks completed
        average_time_per_task: Average time per task in seconds
        focus_score: Focus/attention score (0-1)
        session_duration: Current session length in minutes
        consecutive_sessions: Number of consecutive days active
        hint_usage_rate: How often hints are used (0-1)
        current_level: Current difficulty level (1-10)
        attempts_at_current_level: Total attempts at current level
        successful_at_current_level: Successful attempts at current level
        time_at_current_level: Days spent at current level
        last_7_days_accuracy: Daily accuracy for past 7 days
        last_7_days_time: Daily time spent for past 7 days
    """

    student_id: str
    subject: str
    skill: str

    # Performance metrics
    recent_accuracy: float  # Last 10 attempts
    overall_accuracy: float  # All-time for this skill
    completion_rate: float  # % of assigned tasks done
    average_time_per_task: float  # Seconds

    # Engagement metrics
    focus_score: float  # 0-1, from focus monitor
    session_duration: float  # Minutes in current session
    consecutive_sessions: int  # Days streak
    hint_usage_rate: float  # 0-1, frequency of hints used

    # Progress metrics
    current_level: int  # 1-10 difficulty level
    attempts_at_current_level: int
    successful_at_current_level: int
    time_at_current_level: float  # Days

    # Historical data
    last_7_days_accuracy: List[float] = field(default_factory=list)
    last_7_days_time: List[float] = field(default_factory=list)


@dataclass
class LearningRecommendation:
    """
    Intelligent recommendation for learner progression.

    Contains the recommendation type, reasoning, evidence, and actionable steps.

    Attributes:
        student_id: Student identifier
        recommendation_type: Type of recommendation
        current_level: Current difficulty level
        recommended_level: Suggested level
        confidence: Confidence in recommendation (0-1)
        reasoning: Human-readable explanation
        evidence: List of supporting evidence points
        expected_impact: Expected outcome of following recommendation
        suggested_actions: List of specific actions to take
        suggested_content: List of content suggestions
        estimated_time_to_adjustment: Estimated time for adjustment to take effect
        created_at: When recommendation was generated
        priority: Priority level (low, medium, high, urgent)
    """

    student_id: str
    recommendation_type: RecommendationType
    current_level: int
    recommended_level: int
    confidence: float  # 0-1

    # Explanation
    reasoning: str
    evidence: List[str]
    expected_impact: str

    # Action items
    suggested_actions: List[str]
    suggested_content: List[str]
    estimated_time_to_adjustment: str  # e.g., "2-3 sessions"

    # Metadata
    created_at: datetime
    priority: str  # "low", "medium", "high", "urgent"


class AdaptiveLearningOrchestrator:
    """
    Intelligent orchestrator for adaptive learning decisions.

    Analyzes learner performance and makes data-driven recommendations
    for content difficulty, learning paths, and interventions.

    The orchestrator considers:
    - Recent and historical accuracy
    - Time spent on tasks
    - Engagement indicators (focus, hints)
    - Progress trends
    - Session duration

    Example:
        orchestrator = AdaptiveLearningOrchestrator()

        metrics = LearnerMetrics(
            student_id="student-123",
            subject="math",
            skill="algebra",
            recent_accuracy=0.92,
            overall_accuracy=0.85,
            completion_rate=0.95,
            average_time_per_task=25.0,
            focus_score=0.8,
            session_duration=20.0,
            consecutive_sessions=5,
            hint_usage_rate=0.1,
            current_level=5,
            attempts_at_current_level=15,
            successful_at_current_level=13,
            time_at_current_level=3.5,
            last_7_days_accuracy=[0.8, 0.82, 0.85, 0.88, 0.90, 0.91, 0.92],
            last_7_days_time=[20, 22, 25, 24, 23, 25, 20],
        )

        recommendation = await orchestrator.analyze_and_recommend(metrics)
        print(f"Recommendation: {recommendation.recommendation_type}")
    """

    def __init__(
        self,
        mastery_threshold: float = 0.90,
        proficiency_threshold: float = 0.75,
        developing_threshold: float = 0.60,
        min_attempts_before_level_up: int = 10,
        min_days_at_level: float = 2.0,
        consecutive_success_for_level_up: int = 8,
        consecutive_failure_for_level_down: int = 5,
        low_focus_threshold: float = 0.4,
        optimal_session_length: float = 25.0,
        max_session_length: float = 50.0,
    ):
        """
        Initialize the adaptive learning orchestrator.

        Args:
            mastery_threshold: Accuracy threshold for mastery
            proficiency_threshold: Accuracy threshold for proficiency
            developing_threshold: Accuracy threshold for developing
            min_attempts_before_level_up: Minimum attempts before leveling up
            min_days_at_level: Minimum days at a level before leveling up
            consecutive_success_for_level_up: Successes needed for level up
            consecutive_failure_for_level_down: Failures triggering level down
            low_focus_threshold: Focus score indicating disengagement
            optimal_session_length: Optimal session length in minutes
            max_session_length: Maximum recommended session length
        """
        self.MASTERY_THRESHOLD = mastery_threshold
        self.PROFICIENCY_THRESHOLD = proficiency_threshold
        self.DEVELOPING_THRESHOLD = developing_threshold
        self.MIN_ATTEMPTS_BEFORE_LEVEL_UP = min_attempts_before_level_up
        self.MIN_DAYS_AT_LEVEL = min_days_at_level
        self.CONSECUTIVE_SUCCESS_FOR_LEVEL_UP = consecutive_success_for_level_up
        self.CONSECUTIVE_FAILURE_FOR_LEVEL_DOWN = consecutive_failure_for_level_down
        self.LOW_FOCUS_THRESHOLD = low_focus_threshold
        self.OPTIMAL_SESSION_LENGTH = optimal_session_length
        self.MAX_SESSION_LENGTH = max_session_length

    async def analyze_and_recommend(
        self, metrics: LearnerMetrics
    ) -> LearningRecommendation:
        """
        Analyze learner metrics and generate intelligent recommendation.

        This is the main decision engine that considers all available
        metrics to produce a comprehensive recommendation.

        Args:
            metrics: Current learner metrics

        Returns:
            LearningRecommendation with type, reasoning, and actions
        """
        logger.info(
            f"Analyzing performance for student {metrics.student_id} "
            f"on {metrics.subject}/{metrics.skill}"
        )

        # Step 1: Classify current performance level
        performance_level = self._classify_performance(metrics)

        # Step 2: Check for urgent interventions
        urgent_action = self._check_urgent_interventions(metrics)
        if urgent_action:
            return urgent_action

        # Step 3: Determine recommendation type
        recommendation_type = self._determine_recommendation(metrics, performance_level)

        # Step 4: Calculate recommended level
        recommended_level = self._calculate_recommended_level(
            metrics, recommendation_type
        )

        # Step 5: Generate reasoning and evidence
        reasoning, evidence = self._generate_reasoning(
            metrics, performance_level, recommendation_type
        )

        # Step 6: Create actionable suggestions
        suggested_actions = self._generate_actions(recommendation_type, metrics)
        suggested_content = self._suggest_content(metrics, recommended_level)

        # Step 7: Calculate confidence
        confidence = self._calculate_confidence(metrics)

        # Step 8: Determine priority
        priority = self._determine_priority(recommendation_type, performance_level)

        recommendation = LearningRecommendation(
            student_id=metrics.student_id,
            recommendation_type=recommendation_type,
            current_level=metrics.current_level,
            recommended_level=recommended_level,
            confidence=confidence,
            reasoning=reasoning,
            evidence=evidence,
            expected_impact=self._describe_expected_impact(recommendation_type),
            suggested_actions=suggested_actions,
            suggested_content=suggested_content,
            estimated_time_to_adjustment=self._estimate_adjustment_time(
                metrics, recommendation_type
            ),
            created_at=datetime.utcnow(),
            priority=priority,
        )

        logger.info(
            f"Generated recommendation: {recommendation_type.value} "
            f"({metrics.current_level} -> {recommended_level}) "
            f"with {confidence:.0%} confidence"
        )

        return recommendation

    def _classify_performance(self, metrics: LearnerMetrics) -> PerformanceLevel:
        """Classify learner's current performance level."""
        accuracy = metrics.recent_accuracy
        speed = metrics.average_time_per_task

        # Advanced: High accuracy + fast completion
        if accuracy >= 0.95 and speed < 30:  # 30 seconds
            return PerformanceLevel.ADVANCED

        # Mastered: Consistent high accuracy
        elif accuracy >= self.MASTERY_THRESHOLD:
            return PerformanceLevel.MASTERED

        # Proficient: Good accuracy
        elif accuracy >= self.PROFICIENCY_THRESHOLD:
            return PerformanceLevel.PROFICIENT

        # Developing: Moderate accuracy
        elif accuracy >= self.DEVELOPING_THRESHOLD:
            return PerformanceLevel.DEVELOPING

        # Struggling: Low accuracy
        else:
            return PerformanceLevel.STRUGGLING

    def _check_urgent_interventions(
        self, metrics: LearnerMetrics
    ) -> Optional[LearningRecommendation]:
        """Check if urgent intervention is needed."""

        # Urgent: Very low focus (learner is disengaged)
        if metrics.focus_score < self.LOW_FOCUS_THRESHOLD:
            return LearningRecommendation(
                student_id=metrics.student_id,
                recommendation_type=RecommendationType.BREAK,
                current_level=metrics.current_level,
                recommended_level=metrics.current_level,
                confidence=0.95,
                reasoning="Focus score critically low - immediate break needed",
                evidence=[
                    f"Focus score: {metrics.focus_score:.0%} "
                    f"(threshold: {self.LOW_FOCUS_THRESHOLD:.0%})",
                    f"Session duration: {metrics.session_duration:.0f} min",
                ],
                expected_impact="Restore focus and prevent frustration",
                suggested_actions=[
                    "Take a 10-minute break with physical activity",
                    "Return to easier content after break",
                    "Consider shorter learning sessions",
                ],
                suggested_content=["5-minute movement break video"],
                estimated_time_to_adjustment="Immediate",
                created_at=datetime.utcnow(),
                priority="urgent",
            )

        # Urgent: Session too long
        if metrics.session_duration > self.MAX_SESSION_LENGTH:
            return LearningRecommendation(
                student_id=metrics.student_id,
                recommendation_type=RecommendationType.BREAK,
                current_level=metrics.current_level,
                recommended_level=metrics.current_level,
                confidence=0.90,
                reasoning="Session length exceeds optimal learning duration",
                evidence=[
                    f"Current session: {metrics.session_duration:.0f} min",
                    f"Optimal: {self.OPTIMAL_SESSION_LENGTH} min",
                ],
                expected_impact="Prevent cognitive overload",
                suggested_actions=[
                    "End current session",
                    "Schedule next session for tomorrow",
                    "Review today's learning during break",
                ],
                suggested_content=["Session summary review"],
                estimated_time_to_adjustment="Immediate",
                created_at=datetime.utcnow(),
                priority="urgent",
            )

        # Urgent: Consecutive failures (frustration risk)
        recent_failures = (
            metrics.attempts_at_current_level - metrics.successful_at_current_level
        )
        if recent_failures >= self.CONSECUTIVE_FAILURE_FOR_LEVEL_DOWN:
            return LearningRecommendation(
                student_id=metrics.student_id,
                recommendation_type=RecommendationType.LEVEL_DOWN,
                current_level=metrics.current_level,
                recommended_level=max(1, metrics.current_level - 1),
                confidence=0.92,
                reasoning=(
                    "Multiple consecutive failures indicate content "
                    "is too challenging"
                ),
                evidence=[
                    f"{recent_failures} consecutive failures",
                    f"Accuracy: {metrics.recent_accuracy:.0%}",
                    f"Hint usage: {metrics.hint_usage_rate:.0%}",
                ],
                expected_impact="Rebuild confidence and fill knowledge gaps",
                suggested_actions=[
                    "Return to previous level immediately",
                    "Focus on foundational concepts",
                    "Provide encouraging feedback",
                ],
                suggested_content=[
                    f"Review materials for Level {metrics.current_level - 1}"
                ],
                estimated_time_to_adjustment="1-2 sessions",
                created_at=datetime.utcnow(),
                priority="high",
            )

        return None

    def _determine_recommendation(
        self,
        metrics: LearnerMetrics,
        performance_level: PerformanceLevel,
    ) -> RecommendationType:
        """Determine what type of recommendation to make."""

        # Check if enough data to make decision
        if metrics.attempts_at_current_level < self.MIN_ATTEMPTS_BEFORE_LEVEL_UP:
            return RecommendationType.MAINTAIN

        # Check time at current level
        if metrics.time_at_current_level < self.MIN_DAYS_AT_LEVEL:
            return RecommendationType.MAINTAIN

        # Advanced/Mastered: Level up
        if performance_level in [PerformanceLevel.ADVANCED, PerformanceLevel.MASTERED]:
            consecutive_successes = metrics.successful_at_current_level
            if consecutive_successes >= self.CONSECUTIVE_SUCCESS_FOR_LEVEL_UP:
                return RecommendationType.LEVEL_UP
            else:
                return RecommendationType.ENRICHMENT

        # Proficient: Maintain or enrich
        elif performance_level == PerformanceLevel.PROFICIENT:
            if self._is_trend_improving(metrics.last_7_days_accuracy):
                return RecommendationType.ENRICHMENT
            else:
                return RecommendationType.MAINTAIN

        # Developing: Maintain or change approach
        elif performance_level == PerformanceLevel.DEVELOPING:
            if metrics.time_at_current_level > 7:  # More than a week
                return RecommendationType.CHANGE_APPROACH
            else:
                return RecommendationType.MAINTAIN

        # Struggling: Remediation or level down
        else:
            if metrics.attempts_at_current_level > 15:
                return RecommendationType.LEVEL_DOWN
            else:
                return RecommendationType.REMEDIATION

    def _calculate_recommended_level(
        self,
        metrics: LearnerMetrics,
        recommendation_type: RecommendationType,
    ) -> int:
        """Calculate what level to recommend."""
        current = metrics.current_level

        if recommendation_type == RecommendationType.LEVEL_UP:
            return min(10, current + 1)
        elif recommendation_type == RecommendationType.LEVEL_DOWN:
            return max(1, current - 1)
        elif recommendation_type == RecommendationType.REMEDIATION:
            return max(1, current - 2)
        else:
            return current

    def _generate_reasoning(
        self,
        metrics: LearnerMetrics,
        performance_level: PerformanceLevel,
        recommendation_type: RecommendationType,
    ) -> Tuple[str, List[str]]:
        """Generate human-readable reasoning and evidence."""

        if recommendation_type == RecommendationType.LEVEL_UP:
            reasoning = (
                f"Learner has mastered Level {metrics.current_level} content "
                f"with {metrics.recent_accuracy:.0%} accuracy. Ready for "
                f"more challenging material."
            )
            evidence = [
                f"Recent accuracy: {metrics.recent_accuracy:.0%}",
                f"Successful completions: {metrics.successful_at_current_level}"
                f"/{metrics.attempts_at_current_level}",
                f"Time at current level: {metrics.time_at_current_level:.1f} days",
                f"Minimal hint usage: {metrics.hint_usage_rate:.0%}",
            ]

        elif recommendation_type == RecommendationType.LEVEL_DOWN:
            reasoning = (
                f"Learner is struggling with Level {metrics.current_level}. "
                f"Returning to Level {metrics.current_level - 1} will "
                f"rebuild confidence and address knowledge gaps."
            )
            evidence = [
                f"Recent accuracy: {metrics.recent_accuracy:.0%}",
                f"High hint usage: {metrics.hint_usage_rate:.0%}",
                f"Slow completion: {metrics.average_time_per_task:.0f}s per task",
            ]

        elif recommendation_type == RecommendationType.ENRICHMENT:
            reasoning = (
                f"Learner is performing well at Level {metrics.current_level}. "
                f"Suggest enrichment activities before advancing."
            )
            evidence = [
                f"Consistent accuracy: {metrics.recent_accuracy:.0%}",
                "Needs more practice for mastery",
            ]

        elif recommendation_type == RecommendationType.REMEDIATION:
            reasoning = (
                "Learner shows gaps in foundational concepts. "
                "Recommend focused review before continuing."
            )
            evidence = [
                f"Low accuracy: {metrics.recent_accuracy:.0%}",
                f"Multiple attempts: {metrics.attempts_at_current_level}",
                "Foundation concepts need reinforcement",
            ]

        elif recommendation_type == RecommendationType.CHANGE_APPROACH:
            reasoning = (
                f"Learner has plateaued at Level {metrics.current_level}. "
                "Try different teaching methods or content formats."
            )
            evidence = [
                f"Time at level: {metrics.time_at_current_level:.1f} days",
                f"Static accuracy: {metrics.recent_accuracy:.0%}",
                "No improvement trend detected",
            ]

        else:  # MAINTAIN
            reasoning = (
                f"Learner is making steady progress at Level "
                f"{metrics.current_level}. Continue current approach."
            )
            evidence = [
                f"Accuracy: {metrics.recent_accuracy:.0%}",
                "Consistent engagement",
            ]

        return reasoning, evidence

    def _generate_actions(
        self,
        recommendation_type: RecommendationType,
        metrics: LearnerMetrics,
    ) -> List[str]:
        """Generate specific action items."""

        actions_map = {
            RecommendationType.LEVEL_UP: [
                f"Advance to Level {metrics.current_level + 1} content",
                "Introduce new concepts gradually",
                "Provide scaffolding for new material",
                "Celebrate achievement with positive feedback",
            ],
            RecommendationType.LEVEL_DOWN: [
                f"Return to Level {max(1, metrics.current_level - 1)}",
                "Focus on fundamental concepts",
                "Use multi-modal teaching (visual, auditory, kinesthetic)",
                "Provide frequent encouragement",
                "Reduce task complexity temporarily",
            ],
            RecommendationType.ENRICHMENT: [
                "Provide additional practice problems",
                "Introduce application-based activities",
                "Offer creative extension projects",
                "Maintain current difficulty level",
            ],
            RecommendationType.REMEDIATION: [
                f"Review Level {max(1, metrics.current_level - 2)} fundamentals",
                "Use diagnostic assessment to identify gaps",
                "Provide targeted mini-lessons",
                "Check for prerequisite knowledge",
            ],
            RecommendationType.CHANGE_APPROACH: [
                "Try different content format (video, interactive, text)",
                "Change teaching method (explicit, discovery, collaborative)",
                "Use real-world examples and applications",
                "Incorporate learner's interests",
            ],
            RecommendationType.BREAK: [
                "Pause learning session",
                "Suggest physical activity or relaxation",
                "Review session achievements",
                "Plan shorter sessions in future",
            ],
            RecommendationType.MAINTAIN: [
                "Continue current learning path",
                "Monitor progress closely",
                "Provide positive reinforcement",
                "Prepare for advancement",
            ],
        }

        return actions_map.get(recommendation_type, [])

    def _suggest_content(
        self, metrics: LearnerMetrics, recommended_level: int
    ) -> List[str]:
        """Suggest specific content based on level and subject."""
        return [
            f"{metrics.subject} - Level {recommended_level} lessons",
            f"{metrics.skill} practice activities",
            f"Interactive exercises for {metrics.subject}",
        ]

    def _calculate_confidence(self, metrics: LearnerMetrics) -> float:
        """Calculate confidence in recommendation (0-1)."""
        confidence = 0.5

        # More attempts = higher confidence
        if metrics.attempts_at_current_level >= 20:
            confidence += 0.2
        elif metrics.attempts_at_current_level >= 10:
            confidence += 0.1

        # Longer time at level = higher confidence
        if metrics.time_at_current_level >= 7:
            confidence += 0.15
        elif metrics.time_at_current_level >= 3:
            confidence += 0.1

        # Clear trend = higher confidence
        if self._is_trend_clear(metrics.last_7_days_accuracy):
            confidence += 0.15

        return min(1.0, confidence)

    def _determine_priority(
        self,
        recommendation_type: RecommendationType,
        performance_level: PerformanceLevel,
    ) -> str:
        """Determine recommendation priority."""

        if recommendation_type == RecommendationType.BREAK:
            return "urgent"
        elif recommendation_type == RecommendationType.LEVEL_DOWN:
            return "high"
        elif recommendation_type == RecommendationType.LEVEL_UP:
            return "high" if performance_level == PerformanceLevel.ADVANCED else "medium"
        elif recommendation_type == RecommendationType.REMEDIATION:
            return "high"
        else:
            return "medium"

    def _describe_expected_impact(
        self, recommendation_type: RecommendationType
    ) -> str:
        """Describe expected impact of recommendation."""
        impacts = {
            RecommendationType.LEVEL_UP: (
                "Increased engagement through challenge, "
                "accelerated learning progress"
            ),
            RecommendationType.LEVEL_DOWN: (
                "Improved confidence, stronger foundation, "
                "reduced frustration"
            ),
            RecommendationType.ENRICHMENT: (
                "Deeper understanding, mastery consolidation"
            ),
            RecommendationType.REMEDIATION: (
                "Fill knowledge gaps, improved future performance"
            ),
            RecommendationType.CHANGE_APPROACH: (
                "Break through plateau, renewed engagement"
            ),
            RecommendationType.BREAK: "Restored focus, better retention",
            RecommendationType.MAINTAIN: "Steady progress, skill development",
        }
        return impacts.get(recommendation_type, "Improved learning outcomes")

    def _estimate_adjustment_time(
        self,
        metrics: LearnerMetrics,
        recommendation_type: RecommendationType,
    ) -> str:
        """Estimate time until adjustment takes effect."""
        time_map = {
            RecommendationType.BREAK: "Immediate",
            RecommendationType.LEVEL_DOWN: "1-2 sessions",
            RecommendationType.LEVEL_UP: "2-3 sessions",
            RecommendationType.REMEDIATION: "3-5 sessions",
            RecommendationType.CHANGE_APPROACH: "1-2 weeks",
            RecommendationType.ENRICHMENT: "1-2 sessions",
            RecommendationType.MAINTAIN: "Ongoing",
        }
        return time_map.get(recommendation_type, "Ongoing")

    def _is_trend_improving(self, values: List[float]) -> bool:
        """Check if trend is improving."""
        if len(values) < 3:
            return False
        recent = sum(values[-3:]) / 3
        older = sum(values[:-3]) / max(1, len(values) - 3)
        return recent > older + 0.05  # 5% improvement

    def _is_trend_clear(self, values: List[float]) -> bool:
        """Check if trend is clear (not noisy)."""
        if len(values) < 3:
            return False
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        return variance < 0.05  # Low variance = clear trend

    async def batch_analyze_students(
        self, student_metrics: List[LearnerMetrics]
    ) -> List[LearningRecommendation]:
        """
        Analyze multiple students and generate recommendations.

        Results are sorted by priority (urgent first).

        Args:
            student_metrics: List of learner metrics

        Returns:
            List of recommendations sorted by priority
        """
        recommendations = []

        for metrics in student_metrics:
            try:
                recommendation = await self.analyze_and_recommend(metrics)
                recommendations.append(recommendation)
            except Exception as e:
                logger.error(f"Error analyzing student {metrics.student_id}: {e}")

        # Sort by priority
        priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        recommendations.sort(key=lambda r: priority_order.get(r.priority, 4))

        return recommendations
