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

from src.models.risk_predictor import (
    AtRiskPredictor,
    StudentFeatures,
    RiskPrediction,
    RiskThresholds,
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
    # Risk predictor
    "AtRiskPredictor",
    "StudentFeatures",
    "RiskPrediction",
    "RiskThresholds",
]
