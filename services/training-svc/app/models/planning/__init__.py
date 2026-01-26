"""
SMART Goal Planning Module.

This module provides autonomous goal planning capabilities with
diagnosis-specific adaptations for personalized learning.

Key Components:
- LearningGoal: Complete SMART goal with milestones and weekly plans
- GoalPlanner: Autonomous goal generation and planning
- DiagnosisAdaptationEngine: Applies diagnosis-specific adaptations
- ProgressEvaluator: Evaluates progress and recommends adjustments

Example Usage:
    from app.models.planning import (
        GoalPlanner,
        GoalPlannerConfig,
        GoalDomain,
        LearnerContext,
        DiagnosisAdaptationEngine,
        ProgressEvaluator,
    )

    # Create planner
    config = GoalPlannerConfig(
        default_goal_duration_weeks=12,
        milestones_per_goal=4,
    )
    planner = GoalPlanner(config=config)

    # Create learner context
    context = LearnerContext(
        learner_id="learner_123",
        grade_level=5,
        diagnoses=["ADHD", "Dyslexia"],
        accommodations=["extended_time", "text_to_speech"],
    )

    # Generate a SMART goal
    goal = await planner.generate_goal(
        learner_id="learner_123",
        domain=GoalDomain.READING,
        context=context,
    )

    # Evaluate progress
    evaluator = ProgressEvaluator()
    evaluation = await evaluator.evaluate_progress(goal)

    # Get recommendations
    if evaluation.requires_attention:
        adjustment = await evaluator.recommend_adjustment(goal, evaluation)
"""

# Models
from .models import (
    GoalDomain,
    GoalStatus,
    MeasurementFrequency,
    SMARTCriteria,
    ProgressEvidence,
    Milestone,
    WeeklyActivity,
    WeeklyActionPlan,
    LearnerContext,
    LearningGoal,
    generate_id,
)

# Adaptations
from .adaptations import (
    AdaptationStrategy,
    BaseGoal,
    AdaptedGoal,
    DiagnosisAdaptationConfig,
    DiagnosisAdaptationEngine,
    create_adaptation_engine,
)

# Planner
from .planner import (
    StateAnalysis,
    GoalPlannerConfig,
    GoalTemplates,
    GoalPlanner,
    create_goal_planner,
)

# Evaluator
from .evaluator import (
    ProgressTrajectory,
    RecommendationType,
    AdjustmentType,
    ProgressEvaluation,
    GoalAdjustment,
    EvaluatorConfig,
    ProgressEvaluator,
    create_progress_evaluator,
)

__all__ = [
    # Models
    "GoalDomain",
    "GoalStatus",
    "MeasurementFrequency",
    "SMARTCriteria",
    "ProgressEvidence",
    "Milestone",
    "WeeklyActivity",
    "WeeklyActionPlan",
    "LearnerContext",
    "LearningGoal",
    "generate_id",
    # Adaptations
    "AdaptationStrategy",
    "BaseGoal",
    "AdaptedGoal",
    "DiagnosisAdaptationConfig",
    "DiagnosisAdaptationEngine",
    "create_adaptation_engine",
    # Planner
    "StateAnalysis",
    "GoalPlannerConfig",
    "GoalTemplates",
    "GoalPlanner",
    "create_goal_planner",
    # Evaluator
    "ProgressTrajectory",
    "RecommendationType",
    "AdjustmentType",
    "ProgressEvaluation",
    "GoalAdjustment",
    "EvaluatorConfig",
    "ProgressEvaluator",
    "create_progress_evaluator",
]

__version__ = "0.1.0"
