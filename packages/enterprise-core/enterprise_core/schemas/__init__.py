"""
Enterprise Pydantic Schemas

Pydantic models for API request/response validation across the AIVO platform.
"""

from enterprise_core.schemas.ai import (
    GenerateRequestSchema,
    GenerateResponseSchema,
    HintRequestSchema,
    HintResponseSchema,
    ModelId,
    ProviderId,
    TokenUsageSchema,
)
from enterprise_core.schemas.assessment import (
    AssessmentRequestSchema,
    AssessmentResponseSchema,
    AssessmentType,
    DifficultyLevel,
    QuestionResult,
)
from enterprise_core.schemas.iep import (
    GoalStatus,
    GoalType,
    IEPAccommodationSchema,
    IEPGoalSchema,
    ProgressTrend,
)
from enterprise_core.schemas.learner import (
    LearnerMetricsSchema,
    LearnerProfileSchema,
)

__all__ = [
    # Learner
    "LearnerProfileSchema",
    "LearnerMetricsSchema",
    # Assessment
    "AssessmentRequestSchema",
    "AssessmentResponseSchema",
    "QuestionResult",
    "AssessmentType",
    "DifficultyLevel",
    # IEP
    "IEPGoalSchema",
    "IEPAccommodationSchema",
    "GoalType",
    "GoalStatus",
    "ProgressTrend",
    # AI
    "GenerateRequestSchema",
    "GenerateResponseSchema",
    "HintRequestSchema",
    "HintResponseSchema",
    "ModelId",
    "ProviderId",
    "TokenUsageSchema",
]
