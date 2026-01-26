"""
Models package
"""

from src.models.schemas import (
    ContentRecommendation,
    FeedbackType,
    LearnerContext,
    RecommendationFeedback,
    RecommendationRequest,
    RecommendationResponse,
    RecommendationType,
    RecommendedItem,
    SkillMastery,
    SkillRecommendation,
)

from src.models.hybrid_recommender import (
    HybridRecommender,
    RecommendationContext,
    RecommendedActivity,
    CollaborativeFilter,
    ContentBasedFilter,
    MultiArmedBandit,
    ActivityMetadata,
)

__all__ = [
    # Schema models
    "ContentRecommendation",
    "FeedbackType",
    "LearnerContext",
    "RecommendationFeedback",
    "RecommendationRequest",
    "RecommendationResponse",
    "RecommendationType",
    "RecommendedItem",
    "SkillMastery",
    "SkillRecommendation",
    # Hybrid recommender
    "HybridRecommender",
    "RecommendationContext",
    "RecommendedActivity",
    "CollaborativeFilter",
    "ContentBasedFilter",
    "MultiArmedBandit",
    "ActivityMetadata",
]
