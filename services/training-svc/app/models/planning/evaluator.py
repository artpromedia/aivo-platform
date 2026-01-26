"""
Goal Progress Evaluation.

This module provides progress evaluation for learning goals,
including trajectory analysis, recommendations, and adjustments.
"""

import logging
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .models import (
    GoalDomain,
    GoalStatus,
    LearnerContext,
    LearningGoal,
    Milestone,
    ProgressEvidence,
    WeeklyActionPlan,
    generate_id,
)

logger = logging.getLogger(__name__)


class ProgressTrajectory(str, Enum):
    """Trajectory indicating progress direction."""

    SIGNIFICANTLY_AHEAD = "significantly_ahead"
    AHEAD = "ahead"
    ON_TRACK = "on_track"
    SLIGHTLY_BEHIND = "slightly_behind"
    BEHIND = "behind"
    SIGNIFICANTLY_BEHIND = "significantly_behind"


class RecommendationType(str, Enum):
    """Types of recommendations from evaluation."""

    CONTINUE = "continue"
    CELEBRATE = "celebrate"
    INCREASE_INTENSITY = "increase_intensity"
    ADD_SCAFFOLDS = "add_scaffolds"
    ADJUST_TIMELINE = "adjust_timeline"
    MODIFY_TARGET = "modify_target"
    REVISE_GOAL = "revise_goal"
    ESCALATE = "escalate"


class AdjustmentType(str, Enum):
    """Types of goal adjustments."""

    TIMELINE_EXTENSION = "timeline_extension"
    TIMELINE_REDUCTION = "timeline_reduction"
    TARGET_INCREASE = "target_increase"
    TARGET_DECREASE = "target_decrease"
    SCAFFOLD_ADDITION = "scaffold_addition"
    SCAFFOLD_REMOVAL = "scaffold_removal"
    MILESTONE_ADJUSTMENT = "milestone_adjustment"
    MEASUREMENT_CHANGE = "measurement_change"
    GOAL_REVISION = "goal_revision"


class ProgressEvaluation(BaseModel):
    """
    Comprehensive evaluation of goal progress.

    Contains progress metrics, trajectory analysis, and recommendations.
    """

    evaluation_id: str = Field(default_factory=generate_id)
    goal_id: str
    evaluation_date: date = Field(default_factory=date.today)

    # Progress metrics
    overall_progress: float = Field(
        ge=0.0, le=100.0, description="Overall progress percentage"
    )
    expected_progress: float = Field(
        ge=0.0, le=100.0, description="Expected progress at this point"
    )
    progress_delta: float = Field(
        description="Difference between actual and expected progress"
    )

    # Trajectory
    trajectory: ProgressTrajectory
    trajectory_confidence: float = Field(ge=0.0, le=1.0)

    # Milestone progress
    current_milestone: Optional[int] = None
    milestones_completed: int = 0
    milestones_total: int = 0

    # Evidence summary
    evidence_count: int = 0
    recent_evidence_trend: str = "stable"  # improving, stable, declining

    # Recommendations
    primary_recommendation: RecommendationType
    recommendations: List[Dict[str, Any]] = Field(default_factory=list)

    # Alerts
    alerts: List[str] = Field(default_factory=list)
    requires_attention: bool = False

    # Notes
    evaluator_notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "evaluation_id": self.evaluation_id,
            "goal_id": self.goal_id,
            "evaluation_date": self.evaluation_date.isoformat(),
            "overall_progress": self.overall_progress,
            "expected_progress": self.expected_progress,
            "progress_delta": self.progress_delta,
            "trajectory": self.trajectory.value,
            "trajectory_confidence": self.trajectory_confidence,
            "current_milestone": self.current_milestone,
            "milestones_completed": self.milestones_completed,
            "milestones_total": self.milestones_total,
            "evidence_count": self.evidence_count,
            "recent_evidence_trend": self.recent_evidence_trend,
            "primary_recommendation": self.primary_recommendation.value,
            "recommendations": self.recommendations,
            "alerts": self.alerts,
            "requires_attention": self.requires_attention,
            "evaluator_notes": self.evaluator_notes,
        }


class GoalAdjustment(BaseModel):
    """Recommended adjustment to a goal."""

    adjustment_id: str = Field(default_factory=generate_id)
    goal_id: str
    adjustment_type: AdjustmentType
    description: str
    rationale: str

    # Specific changes
    timeline_change_weeks: Optional[int] = None
    new_target: Optional[str] = None
    scaffolds_to_add: List[str] = Field(default_factory=list)
    scaffolds_to_remove: List[str] = Field(default_factory=list)
    milestone_changes: List[Dict[str, Any]] = Field(default_factory=list)

    # Metadata
    priority: str = "medium"  # low, medium, high
    requires_approval: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "adjustment_id": self.adjustment_id,
            "goal_id": self.goal_id,
            "adjustment_type": self.adjustment_type.value,
            "description": self.description,
            "rationale": self.rationale,
            "timeline_change_weeks": self.timeline_change_weeks,
            "new_target": self.new_target,
            "scaffolds_to_add": self.scaffolds_to_add,
            "scaffolds_to_remove": self.scaffolds_to_remove,
            "milestone_changes": self.milestone_changes,
            "priority": self.priority,
            "requires_approval": self.requires_approval,
            "created_at": self.created_at.isoformat(),
            "approved": self.approved,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
        }


@dataclass
class EvaluatorConfig:
    """Configuration for the progress evaluator."""

    # Trajectory thresholds (as percentage points from expected)
    significantly_ahead_threshold: float = 15.0
    ahead_threshold: float = 5.0
    slightly_behind_threshold: float = -5.0
    behind_threshold: float = -15.0
    significantly_behind_threshold: float = -25.0

    # Evaluation settings
    min_evidence_for_trend: int = 3
    trend_window_days: int = 14

    # Adjustment thresholds
    suggest_timeline_extension_threshold: float = -20.0
    suggest_scaffold_threshold: float = -10.0
    suggest_escalation_threshold: float = -30.0

    # Alert settings
    overdue_milestone_days: int = 7
    stalled_progress_days: int = 14


class ProgressEvaluator:
    """
    Evaluates goal progress and recommends adjustments.

    Analyzes evidence, calculates trajectory, and generates
    recommendations for goal modifications when needed.
    """

    def __init__(self, config: Optional[EvaluatorConfig] = None):
        """Initialize the evaluator."""
        self.config = config or EvaluatorConfig()
        logger.info("Initialized ProgressEvaluator")

    async def evaluate_progress(
        self,
        goal: LearningGoal,
        evidence: Optional[List[ProgressEvidence]] = None,
    ) -> ProgressEvaluation:
        """
        Evaluate progress toward goal.

        Args:
            goal: The learning goal to evaluate
            evidence: Optional additional evidence to consider

        Returns:
            ProgressEvaluation with metrics, trajectory, and recommendations
        """
        logger.info(f"Evaluating progress for goal {goal.goal_id}")

        # Calculate expected progress based on timeline
        expected_progress = self._calculate_expected_progress(goal)

        # Calculate actual progress from milestones and evidence
        actual_progress = self._calculate_actual_progress(goal, evidence)

        # Calculate progress delta
        progress_delta = actual_progress - expected_progress

        # Determine trajectory
        trajectory = self._determine_trajectory(progress_delta)
        trajectory_confidence = self._calculate_trajectory_confidence(goal, evidence)

        # Count milestones
        milestones_completed = sum(
            1 for m in goal.milestones if m.status == GoalStatus.COMPLETED
        )
        current_milestone = self._get_current_milestone_sequence(goal)

        # Analyze evidence trend
        all_evidence = self._collect_all_evidence(goal, evidence)
        evidence_trend = self._analyze_evidence_trend(all_evidence)

        # Generate recommendations
        recommendations = self._generate_recommendations(
            goal, trajectory, progress_delta, evidence_trend
        )
        primary_recommendation = recommendations[0]["type"] if recommendations else RecommendationType.CONTINUE

        # Generate alerts
        alerts = self._generate_alerts(goal, trajectory, progress_delta)

        evaluation = ProgressEvaluation(
            goal_id=goal.goal_id,
            overall_progress=actual_progress,
            expected_progress=expected_progress,
            progress_delta=progress_delta,
            trajectory=trajectory,
            trajectory_confidence=trajectory_confidence,
            current_milestone=current_milestone,
            milestones_completed=milestones_completed,
            milestones_total=len(goal.milestones),
            evidence_count=len(all_evidence),
            recent_evidence_trend=evidence_trend,
            primary_recommendation=primary_recommendation,
            recommendations=recommendations,
            alerts=alerts,
            requires_attention=len(alerts) > 0 or trajectory in [
                ProgressTrajectory.BEHIND,
                ProgressTrajectory.SIGNIFICANTLY_BEHIND,
            ],
        )

        logger.info(
            f"Evaluation complete: {actual_progress:.1f}% progress, "
            f"trajectory: {trajectory.value}"
        )

        return evaluation

    def _calculate_expected_progress(self, goal: LearningGoal) -> float:
        """Calculate expected progress based on time elapsed."""
        if goal.start_date >= goal.target_date:
            return 100.0

        total_days = (goal.target_date - goal.start_date).days
        elapsed_days = (date.today() - goal.start_date).days

        if elapsed_days <= 0:
            return 0.0
        if elapsed_days >= total_days:
            return 100.0

        # Linear expectation (could be adjusted for learning curves)
        return (elapsed_days / total_days) * 100

    def _calculate_actual_progress(
        self,
        goal: LearningGoal,
        additional_evidence: Optional[List[ProgressEvidence]] = None,
    ) -> float:
        """Calculate actual progress from milestones and evidence."""
        if not goal.milestones:
            return goal.overall_progress

        # Weight milestones by sequence
        total_weight = sum(range(1, len(goal.milestones) + 1))
        weighted_progress = 0.0

        for milestone in goal.milestones:
            weight = milestone.sequence / total_weight
            weighted_progress += milestone.progress_percentage * weight

        return weighted_progress

    def _determine_trajectory(self, progress_delta: float) -> ProgressTrajectory:
        """Determine trajectory based on progress delta."""
        if progress_delta >= self.config.significantly_ahead_threshold:
            return ProgressTrajectory.SIGNIFICANTLY_AHEAD
        elif progress_delta >= self.config.ahead_threshold:
            return ProgressTrajectory.AHEAD
        elif progress_delta >= self.config.slightly_behind_threshold:
            return ProgressTrajectory.ON_TRACK
        elif progress_delta >= self.config.behind_threshold:
            return ProgressTrajectory.SLIGHTLY_BEHIND
        elif progress_delta >= self.config.significantly_behind_threshold:
            return ProgressTrajectory.BEHIND
        else:
            return ProgressTrajectory.SIGNIFICANTLY_BEHIND

    def _calculate_trajectory_confidence(
        self,
        goal: LearningGoal,
        evidence: Optional[List[ProgressEvidence]] = None,
    ) -> float:
        """Calculate confidence in trajectory assessment."""
        base_confidence = 0.5

        # Increase confidence with more evidence
        all_evidence = self._collect_all_evidence(goal, evidence)
        if len(all_evidence) >= 10:
            base_confidence += 0.3
        elif len(all_evidence) >= 5:
            base_confidence += 0.2
        elif len(all_evidence) >= 2:
            base_confidence += 0.1

        # Increase confidence with more milestones completed
        completed = sum(1 for m in goal.milestones if m.status == GoalStatus.COMPLETED)
        if completed >= 2:
            base_confidence += 0.1

        # Decrease confidence if early in goal
        elapsed_pct = self._get_elapsed_percentage(goal)
        if elapsed_pct < 0.25:
            base_confidence -= 0.2

        return min(1.0, max(0.0, base_confidence))

    def _get_elapsed_percentage(self, goal: LearningGoal) -> float:
        """Calculate percentage of goal timeline elapsed."""
        total_days = (goal.target_date - goal.start_date).days
        if total_days <= 0:
            return 1.0
        elapsed_days = (date.today() - goal.start_date).days
        return max(0.0, min(1.0, elapsed_days / total_days))

    def _get_current_milestone_sequence(self, goal: LearningGoal) -> Optional[int]:
        """Get the sequence number of the current active milestone."""
        for milestone in sorted(goal.milestones, key=lambda m: m.sequence):
            if milestone.status == GoalStatus.ACTIVE:
                return milestone.sequence
        return None

    def _collect_all_evidence(
        self,
        goal: LearningGoal,
        additional: Optional[List[ProgressEvidence]] = None,
    ) -> List[ProgressEvidence]:
        """Collect all evidence from milestones and additional sources."""
        evidence = []
        for milestone in goal.milestones:
            evidence.extend(milestone.evidence)
        if additional:
            evidence.extend(additional)
        return sorted(evidence, key=lambda e: e.timestamp)

    def _analyze_evidence_trend(
        self, evidence: List[ProgressEvidence]
    ) -> str:
        """Analyze trend in recent evidence."""
        if len(evidence) < self.config.min_evidence_for_trend:
            return "insufficient_data"

        # Get recent evidence
        cutoff = datetime.utcnow() - timedelta(days=self.config.trend_window_days)
        recent = [e for e in evidence if e.timestamp >= cutoff]

        if len(recent) < 2:
            return "stable"

        # Analyze metric values if available
        values = [e.metric_value for e in recent if e.metric_value is not None]
        if len(values) >= 2:
            first_half_avg = sum(values[: len(values) // 2]) / (len(values) // 2)
            second_half_avg = sum(values[len(values) // 2 :]) / (
                len(values) - len(values) // 2
            )

            if second_half_avg > first_half_avg * 1.1:
                return "improving"
            elif second_half_avg < first_half_avg * 0.9:
                return "declining"

        return "stable"

    def _generate_recommendations(
        self,
        goal: LearningGoal,
        trajectory: ProgressTrajectory,
        progress_delta: float,
        evidence_trend: str,
    ) -> List[Dict[str, Any]]:
        """Generate recommendations based on evaluation."""
        recommendations = []

        # Trajectory-based recommendations
        if trajectory == ProgressTrajectory.SIGNIFICANTLY_AHEAD:
            recommendations.append({
                "type": RecommendationType.CELEBRATE,
                "priority": "low",
                "description": "Excellent progress! Consider celebrating achievements.",
                "actions": [
                    "Acknowledge significant progress",
                    "Consider advancing target if appropriate",
                    "Maintain current approach",
                ],
            })
        elif trajectory == ProgressTrajectory.AHEAD:
            recommendations.append({
                "type": RecommendationType.CONTINUE,
                "priority": "low",
                "description": "Good progress. Continue current approach.",
                "actions": ["Maintain current activities", "Monitor for continued progress"],
            })
        elif trajectory == ProgressTrajectory.ON_TRACK:
            recommendations.append({
                "type": RecommendationType.CONTINUE,
                "priority": "low",
                "description": "On track. Continue current plan.",
                "actions": ["Continue planned activities", "Regular monitoring"],
            })
        elif trajectory == ProgressTrajectory.SLIGHTLY_BEHIND:
            recommendations.append({
                "type": RecommendationType.ADD_SCAFFOLDS,
                "priority": "medium",
                "description": "Slightly behind. Consider adding supports.",
                "actions": [
                    "Review current scaffolds",
                    "Consider additional practice opportunities",
                    "Check for barriers to progress",
                ],
            })
        elif trajectory == ProgressTrajectory.BEHIND:
            recommendations.append({
                "type": RecommendationType.ADJUST_TIMELINE,
                "priority": "high",
                "description": "Behind schedule. Recommend adjustments.",
                "actions": [
                    "Consider timeline extension",
                    "Add intensive scaffolds",
                    "Review goal achievability",
                    "Schedule review meeting",
                ],
            })
        else:  # SIGNIFICANTLY_BEHIND
            recommendations.append({
                "type": RecommendationType.ESCALATE,
                "priority": "high",
                "description": "Significantly behind. Escalation recommended.",
                "actions": [
                    "Schedule urgent review",
                    "Consider goal revision",
                    "Evaluate barriers",
                    "Involve additional support",
                ],
            })

        # Evidence trend recommendations
        if evidence_trend == "declining":
            recommendations.append({
                "type": RecommendationType.ADD_SCAFFOLDS,
                "priority": "high",
                "description": "Recent evidence shows declining trend.",
                "actions": [
                    "Investigate cause of decline",
                    "Add additional supports",
                    "Consider motivation factors",
                ],
            })
        elif evidence_trend == "improving" and trajectory in [
            ProgressTrajectory.BEHIND,
            ProgressTrajectory.SLIGHTLY_BEHIND,
        ]:
            recommendations.append({
                "type": RecommendationType.CONTINUE,
                "priority": "medium",
                "description": "Showing improvement despite being behind. Continue current approach.",
                "actions": ["Maintain momentum", "Monitor closely"],
            })

        return recommendations

    def _generate_alerts(
        self,
        goal: LearningGoal,
        trajectory: ProgressTrajectory,
        progress_delta: float,
    ) -> List[str]:
        """Generate alerts for conditions requiring attention."""
        alerts = []

        # Overdue milestone alert
        for milestone in goal.milestones:
            if milestone.is_overdue:
                days_overdue = (date.today() - milestone.target_date).days
                if days_overdue > self.config.overdue_milestone_days:
                    alerts.append(
                        f"Milestone '{milestone.title}' is {days_overdue} days overdue"
                    )

        # Trajectory alerts
        if trajectory == ProgressTrajectory.SIGNIFICANTLY_BEHIND:
            alerts.append("Goal is significantly behind schedule - immediate review needed")
        elif trajectory == ProgressTrajectory.BEHIND:
            alerts.append("Goal is behind schedule - consider adjustments")

        # Goal overdue alert
        if goal.is_overdue:
            days_overdue = (date.today() - goal.target_date).days
            alerts.append(f"Goal target date passed {days_overdue} days ago")

        # No recent activity alert
        recent_activity = self._check_recent_activity(goal)
        if not recent_activity:
            alerts.append(
                f"No progress recorded in {self.config.stalled_progress_days} days"
            )

        return alerts

    def _check_recent_activity(self, goal: LearningGoal) -> bool:
        """Check if there has been recent activity on the goal."""
        cutoff = datetime.utcnow() - timedelta(days=self.config.stalled_progress_days)

        for milestone in goal.milestones:
            for evidence in milestone.evidence:
                if evidence.timestamp >= cutoff:
                    return True

        return False

    async def recommend_adjustment(
        self,
        goal: LearningGoal,
        evaluation: ProgressEvaluation,
    ) -> Optional[GoalAdjustment]:
        """
        Recommend goal adjustments if needed.

        Args:
            goal: The learning goal
            evaluation: Progress evaluation results

        Returns:
            GoalAdjustment if changes are recommended, None otherwise
        """
        if evaluation.trajectory in [
            ProgressTrajectory.ON_TRACK,
            ProgressTrajectory.AHEAD,
            ProgressTrajectory.SIGNIFICANTLY_AHEAD,
        ]:
            return None

        # Determine adjustment type based on trajectory
        if evaluation.trajectory == ProgressTrajectory.SIGNIFICANTLY_BEHIND:
            return await self._create_major_adjustment(goal, evaluation)
        elif evaluation.trajectory == ProgressTrajectory.BEHIND:
            return await self._create_timeline_adjustment(goal, evaluation)
        else:  # SLIGHTLY_BEHIND
            return await self._create_scaffold_adjustment(goal, evaluation)

    async def _create_major_adjustment(
        self,
        goal: LearningGoal,
        evaluation: ProgressEvaluation,
    ) -> GoalAdjustment:
        """Create major adjustment for significantly behind goals."""
        return GoalAdjustment(
            goal_id=goal.goal_id,
            adjustment_type=AdjustmentType.GOAL_REVISION,
            description="Major goal revision recommended due to significant progress gap",
            rationale=(
                f"Progress is {abs(evaluation.progress_delta):.1f}% behind expected. "
                "Current goal may need significant modification to be achievable."
            ),
            timeline_change_weeks=4,  # Suggest 4-week extension
            scaffolds_to_add=[
                "Intensive support sessions",
                "Additional practice materials",
                "Frequent progress monitoring",
            ],
            priority="high",
            requires_approval=True,
        )

    async def _create_timeline_adjustment(
        self,
        goal: LearningGoal,
        evaluation: ProgressEvaluation,
    ) -> GoalAdjustment:
        """Create timeline adjustment for behind goals."""
        # Calculate extension needed
        behind_percentage = abs(evaluation.progress_delta)
        weeks_behind = int(
            (behind_percentage / 100) * goal.duration_weeks
        )
        extension_weeks = max(2, weeks_behind)

        return GoalAdjustment(
            goal_id=goal.goal_id,
            adjustment_type=AdjustmentType.TIMELINE_EXTENSION,
            description=f"Extend goal timeline by {extension_weeks} weeks",
            rationale=(
                f"Progress is {behind_percentage:.1f}% behind expected. "
                f"Extending timeline will allow for successful goal completion."
            ),
            timeline_change_weeks=extension_weeks,
            scaffolds_to_add=[
                "Additional practice opportunities",
                "Review of challenging concepts",
            ],
            priority="medium",
            requires_approval=True,
        )

    async def _create_scaffold_adjustment(
        self,
        goal: LearningGoal,
        evaluation: ProgressEvaluation,
    ) -> GoalAdjustment:
        """Create scaffold adjustment for slightly behind goals."""
        return GoalAdjustment(
            goal_id=goal.goal_id,
            adjustment_type=AdjustmentType.SCAFFOLD_ADDITION,
            description="Add additional scaffolds to support progress",
            rationale=(
                f"Progress is slightly behind ({abs(evaluation.progress_delta):.1f}%). "
                "Additional scaffolds may help get back on track."
            ),
            scaffolds_to_add=[
                "Visual supports",
                "Chunked task presentation",
                "Frequent feedback",
            ],
            priority="low",
            requires_approval=False,
        )

    async def apply_adjustment(
        self,
        goal: LearningGoal,
        adjustment: GoalAdjustment,
    ) -> LearningGoal:
        """
        Apply an approved adjustment to a goal.

        Args:
            goal: The learning goal to adjust
            adjustment: The approved adjustment

        Returns:
            Updated LearningGoal
        """
        if adjustment.requires_approval and not adjustment.approved:
            raise ValueError("Adjustment requires approval before application")

        logger.info(
            f"Applying {adjustment.adjustment_type.value} adjustment to goal {goal.goal_id}"
        )

        # Apply timeline changes
        if adjustment.timeline_change_weeks:
            goal.target_date = goal.target_date + timedelta(
                weeks=adjustment.timeline_change_weeks
            )
            # Update milestone dates proportionally
            self._adjust_milestone_dates(goal, adjustment.timeline_change_weeks)

        # Apply target changes
        if adjustment.new_target:
            goal.target = adjustment.new_target

        # Apply scaffold changes
        if adjustment.scaffolds_to_add:
            for scaffold in adjustment.scaffolds_to_add:
                if scaffold not in goal.accommodations:
                    goal.accommodations.append(scaffold)

        if adjustment.scaffolds_to_remove:
            goal.accommodations = [
                a for a in goal.accommodations
                if a not in adjustment.scaffolds_to_remove
            ]

        # Update goal status and timestamp
        goal.updated_at = datetime.utcnow()
        if adjustment.adjustment_type == AdjustmentType.GOAL_REVISION:
            goal.status = GoalStatus.REVISED

        return goal

    def _adjust_milestone_dates(
        self, goal: LearningGoal, extension_weeks: int
    ) -> None:
        """Adjust milestone dates proportionally for timeline extension."""
        if not goal.milestones:
            return

        total_milestones = len(goal.milestones)
        weeks_per_milestone = extension_weeks / total_milestones

        for i, milestone in enumerate(goal.milestones):
            if milestone.status != GoalStatus.COMPLETED:
                extension = timedelta(weeks=weeks_per_milestone * (i + 1))
                milestone.target_date = milestone.target_date + timedelta(
                    days=extension.days
                )

    async def generate_progress_report(
        self,
        goal: LearningGoal,
        evaluation: ProgressEvaluation,
        include_recommendations: bool = True,
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive progress report.

        Args:
            goal: The learning goal
            evaluation: Progress evaluation
            include_recommendations: Whether to include recommendations

        Returns:
            Dictionary containing the progress report
        """
        report = {
            "report_id": generate_id(),
            "generated_at": datetime.utcnow().isoformat(),
            "goal_summary": {
                "goal_id": goal.goal_id,
                "domain": goal.domain.value,
                "goal_text": goal.goal_text,
                "status": goal.status.value,
                "start_date": goal.start_date.isoformat(),
                "target_date": goal.target_date.isoformat(),
                "duration_weeks": goal.duration_weeks,
                "weeks_remaining": goal.weeks_remaining,
            },
            "progress_summary": {
                "overall_progress": evaluation.overall_progress,
                "expected_progress": evaluation.expected_progress,
                "progress_delta": evaluation.progress_delta,
                "trajectory": evaluation.trajectory.value,
                "trajectory_confidence": evaluation.trajectory_confidence,
            },
            "milestone_summary": {
                "total": evaluation.milestones_total,
                "completed": evaluation.milestones_completed,
                "current": evaluation.current_milestone,
                "milestones": [
                    {
                        "sequence": m.sequence,
                        "title": m.title,
                        "status": m.status.value,
                        "progress": m.progress_percentage,
                        "target_date": m.target_date.isoformat(),
                        "is_overdue": m.is_overdue,
                    }
                    for m in goal.milestones
                ],
            },
            "evidence_summary": {
                "total_evidence": evaluation.evidence_count,
                "recent_trend": evaluation.recent_evidence_trend,
            },
            "alerts": evaluation.alerts,
            "requires_attention": evaluation.requires_attention,
        }

        if include_recommendations:
            report["recommendations"] = evaluation.recommendations

        return report


def create_progress_evaluator(
    config: Optional[EvaluatorConfig] = None,
) -> ProgressEvaluator:
    """Factory function to create a progress evaluator."""
    return ProgressEvaluator(config)
