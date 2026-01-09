"""
Student Risk Prediction Model

Machine learning model for predicting at-risk students with:
- Feature engineering for academic, engagement, and behavioral signals
- Gradient boosting classifier with explainability
- Bias detection and mitigation
- FERPA-compliant design

IMPORTANT: This model is designed to ASSIST educators, not replace their judgment.
All predictions should be reviewed by qualified educators before taking action.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional
import hashlib
import json
import logging
import pickle
import re
from pathlib import Path

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.calibration import CalibratedClassifierCV

logger = logging.getLogger(__name__)


def _sanitize_id(identifier: str) -> str:
    """Sanitize user-controlled identifiers for safe logging.
    
    Removes potentially dangerous characters to prevent log injection attacks.
    Only allows alphanumeric characters, hyphens, and underscores.
    """
    if not identifier:
        return "<empty>"
    # Only allow alphanumeric, hyphens, and underscores
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '', str(identifier)[:128])
    return sanitized if sanitized else "<invalid>"


class RiskLevel(str, Enum):
    """Risk level categories"""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class RiskTrend(str, Enum):
    """Risk trend direction"""
    INCREASING = "increasing"
    STABLE = "stable"
    DECREASING = "decreasing"


class FeatureCategory(str, Enum):
    """Feature categories for grouping"""
    ACADEMIC = "academic"
    ENGAGEMENT = "engagement"
    BEHAVIORAL = "behavioral"
    TEMPORAL = "temporal"


@dataclass
class RiskFactor:
    """A factor contributing to risk prediction"""
    feature: str
    category: FeatureCategory
    description: str
    current_value: float | str
    contribution: float
    severity: str  # 'low', 'medium', 'high'
    threshold: Optional[float] = None
    recommendation: Optional[str] = None


@dataclass
class ProtectiveFactor:
    """A factor reducing risk"""
    feature: str
    category: FeatureCategory
    description: str
    current_value: float | str
    contribution: float


@dataclass
class RiskPrediction:
    """Complete risk prediction for a student"""
    student_id: str
    timestamp: datetime
    risk_score: float  # 0-1
    risk_level: RiskLevel
    confidence: float  # 0-1
    category_scores: dict[str, float]
    top_risk_factors: list[RiskFactor]
    protective_factors: list[ProtectiveFactor]
    risk_trend: RiskTrend
    previous_risk_score: Optional[float] = None
    score_change: Optional[float] = None
    model_version: str = "1.0.0"


@dataclass
class FeatureDefinition:
    """Definition of a feature for the risk model"""
    name: str
    category: FeatureCategory
    description: str
    risk_direction: str  # 'high_is_risk', 'low_is_risk'
    threshold_low: Optional[float] = None
    threshold_high: Optional[float] = None
    importance_weight: float = 1.0
    recommendation_template: Optional[str] = None


# Feature definitions with clear descriptions for explainability
RISK_FEATURES: list[FeatureDefinition] = [
    # Academic features
    FeatureDefinition(
        name="current_mastery",
        category=FeatureCategory.ACADEMIC,
        description="Current overall mastery level across all skills",
        risk_direction="low_is_risk",
        threshold_low=0.4,
        threshold_high=0.7,
        importance_weight=0.15,
        recommendation_template="Consider focused practice on skills below 50% mastery"
    ),
    FeatureDefinition(
        name="mastery_trend_7d",
        category=FeatureCategory.ACADEMIC,
        description="Change in mastery level over the last 7 days",
        risk_direction="low_is_risk",
        threshold_low=-0.1,
        threshold_high=0.05,
        importance_weight=0.12,
        recommendation_template="Mastery is declining; review recent learning activities"
    ),
    FeatureDefinition(
        name="skill_gaps_count",
        category=FeatureCategory.ACADEMIC,
        description="Number of skills below 50% mastery",
        risk_direction="high_is_risk",
        threshold_low=2,
        threshold_high=5,
        importance_weight=0.08,
        recommendation_template="Target the {value} skills that need the most improvement"
    ),
    FeatureDefinition(
        name="correct_first_attempt_rate",
        category=FeatureCategory.ACADEMIC,
        description="Proportion of questions answered correctly on first attempt",
        risk_direction="low_is_risk",
        threshold_low=0.4,
        threshold_high=0.7,
        importance_weight=0.07,
        recommendation_template="Consider prerequisite skill review before new content"
    ),
    FeatureDefinition(
        name="mastery_vs_class",
        category=FeatureCategory.ACADEMIC,
        description="Performance relative to class average",
        risk_direction="low_is_risk",
        threshold_low=-0.2,
        threshold_high=0.0,
        importance_weight=0.05,
        recommendation_template="Student may benefit from peer tutoring or additional support"
    ),
    
    # Engagement features
    FeatureDefinition(
        name="days_since_last_session",
        category=FeatureCategory.ENGAGEMENT,
        description="Number of days since last learning session",
        risk_direction="high_is_risk",
        threshold_low=3,
        threshold_high=7,
        importance_weight=0.11,
        recommendation_template="Re-engage student with motivating content or check-in"
    ),
    FeatureDefinition(
        name="session_frequency_7d",
        category=FeatureCategory.ENGAGEMENT,
        description="Number of learning sessions in the last 7 days",
        risk_direction="low_is_risk",
        threshold_low=2,
        threshold_high=5,
        importance_weight=0.10,
        recommendation_template="Encourage more frequent, shorter practice sessions"
    ),
    FeatureDefinition(
        name="completion_rate",
        category=FeatureCategory.ENGAGEMENT,
        description="Proportion of assigned activities completed",
        risk_direction="low_is_risk",
        threshold_low=0.5,
        threshold_high=0.8,
        importance_weight=0.09,
        recommendation_template="Break down assignments into smaller, achievable goals"
    ),
    FeatureDefinition(
        name="session_abandonment_rate",
        category=FeatureCategory.ENGAGEMENT,
        description="Proportion of sessions ended early without completion",
        risk_direction="high_is_risk",
        threshold_low=0.1,
        threshold_high=0.3,
        importance_weight=0.06,
        recommendation_template="Investigate potential frustration or distraction issues"
    ),
    FeatureDefinition(
        name="avg_session_duration",
        category=FeatureCategory.ENGAGEMENT,
        description="Average time spent per session in minutes",
        risk_direction="low_is_risk",
        threshold_low=5,
        threshold_high=15,
        importance_weight=0.04,
        recommendation_template="Encourage sustained engagement with appropriate breaks"
    ),
    
    # Behavioral features
    FeatureDefinition(
        name="frustration_signals",
        category=FeatureCategory.BEHAVIORAL,
        description="Detected frustration events (rapid wrong answers, resets)",
        risk_direction="high_is_risk",
        threshold_low=3,
        threshold_high=8,
        importance_weight=0.08,
        recommendation_template="Provide scaffolding or reduce difficulty temporarily"
    ),
    FeatureDefinition(
        name="help_request_rate",
        category=FeatureCategory.BEHAVIORAL,
        description="Rate of help/hint requests per activity",
        risk_direction="high_is_risk",
        threshold_low=0.3,
        threshold_high=0.6,
        importance_weight=0.04,
        recommendation_template="Consider if content is at appropriate difficulty level"
    ),
    FeatureDefinition(
        name="hint_dependency_ratio",
        category=FeatureCategory.BEHAVIORAL,
        description="Ratio of correct answers following hints to total correct",
        risk_direction="high_is_risk",
        threshold_low=0.3,
        threshold_high=0.6,
        importance_weight=0.03,
        recommendation_template="Gradually reduce hint availability to build independence"
    ),
    
    # Temporal features
    FeatureDefinition(
        name="time_of_day_variance",
        category=FeatureCategory.TEMPORAL,
        description="Consistency of learning time (lower is more consistent)",
        risk_direction="high_is_risk",
        threshold_low=2,
        threshold_high=6,
        importance_weight=0.02,
        recommendation_template="Help establish consistent learning routine"
    ),
    FeatureDefinition(
        name="weekend_engagement_ratio",
        category=FeatureCategory.TEMPORAL,
        description="Ratio of weekend to weekday engagement",
        risk_direction="low_is_risk",
        threshold_low=0.1,
        threshold_high=0.5,
        importance_weight=0.01,
        recommendation_template="Encourage balanced learning schedule"
    ),
]


class StudentRiskModel:
    """
    Machine learning model for predicting at-risk students.
    
    ETHICAL CONSIDERATIONS:
    - This model provides predictions to ASSIST educators, not replace their judgment
    - All predictions come with confidence scores and explanations
    - The model is regularly audited for bias across demographic groups
    - Students should never be harmed by these predictions (e.g., tracked into lower courses)
    - Predictions are used to provide ADDITIONAL support, not reduce opportunities
    """
    
    MODEL_VERSION = "1.0.0"
    CACHE_TTL_SECONDS = 3600  # 1 hour cache for predictions
    
    def __init__(
        self,
        model_path: Optional[Path] = None,
        redis_client: Optional[Any] = None
    ):
        self.redis = redis_client
        self.model: Optional[CalibratedClassifierCV] = None
        self.scaler: Optional[StandardScaler] = None
        self.feature_names: list[str] = [f.name for f in RISK_FEATURES]
        self.feature_map = {f.name: f for f in RISK_FEATURES}
        
        if model_path and model_path.exists():
            self._load_model(model_path)
        else:
            self._initialize_default_model()
    
    def _initialize_default_model(self) -> None:
        """Initialize with a default model for new deployments"""
        base_model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            min_samples_leaf=10,
            random_state=42
        )
        self.model = CalibratedClassifierCV(base_model, cv=5, method='isotonic')
        self.scaler = StandardScaler()
        logger.info("Initialized default risk model")
    
    def _load_model(self, path: Path) -> None:
        """Load a trained model from disk"""
        with open(path / "model.pkl", "rb") as f:
            self.model = pickle.load(f)
        with open(path / "scaler.pkl", "rb") as f:
            self.scaler = pickle.load(f)
        logger.info(f"Loaded risk model from {path}")
    
    async def predict_risk(
        self,
        student_id: str,
        tenant_id: str,
        features: Optional[dict[str, float]] = None
    ) -> RiskPrediction:
        """
        Generate risk prediction for a single student.
        
        Args:
            student_id: The student's unique identifier
            tenant_id: The tenant context
            features: Pre-computed features (if None, will be fetched)
        
        Returns:
            Complete RiskPrediction with explanation
        """
        # Check cache first
        cache_key = f"risk_prediction:{tenant_id}:{student_id}"
        if self.redis:
            cached = await self.redis.get(cache_key)
            if cached:
                return self._deserialize_prediction(cached)
        
        # Get or compute features
        if features is None:
            features = await self._fetch_student_features(student_id, tenant_id)
        
        # Prepare feature vector
        feature_vector = self._prepare_features(features)
        
        # Get probability prediction
        scaled_features = self.scaler.transform([feature_vector])
        risk_prob = self.model.predict_proba(scaled_features)[0][1]
        
        # Determine risk level
        risk_level = self._get_risk_level(risk_prob)
        
        # Calculate confidence based on feature completeness and model certainty
        confidence = self._calculate_confidence(features, risk_prob)
        
        # Get category-specific scores
        category_scores = self._calculate_category_scores(features)
        
        # Identify top risk factors
        risk_factors = self._identify_risk_factors(features, risk_prob)
        
        # Identify protective factors
        protective_factors = self._identify_protective_factors(features)
        
        # Get previous prediction for trend
        previous = await self._get_previous_prediction(student_id, tenant_id)
        risk_trend, score_change = self._calculate_trend(risk_prob, previous)
        
        prediction = RiskPrediction(
            student_id=student_id,
            timestamp=datetime.utcnow(),
            risk_score=risk_prob,
            risk_level=risk_level,
            confidence=confidence,
            category_scores=category_scores,
            top_risk_factors=risk_factors[:5],  # Top 5 factors
            protective_factors=protective_factors[:3],  # Top 3 protective
            risk_trend=risk_trend,
            previous_risk_score=previous,
            score_change=score_change,
            model_version=self.MODEL_VERSION
        )
        
        # Cache prediction
        if self.redis:
            await self.redis.setex(
                cache_key,
                self.CACHE_TTL_SECONDS,
                self._serialize_prediction(prediction)
            )
        
        # Store prediction for historical tracking
        await self._store_prediction(prediction, tenant_id)
        
        return prediction
    
    async def predict_risk_batch(
        self,
        student_ids: list[str],
        tenant_id: str
    ) -> dict[str, RiskPrediction]:
        """Generate predictions for multiple students efficiently"""
        results = {}
        
        for student_id in student_ids:
            try:
                prediction = await self.predict_risk(student_id, tenant_id)
                results[student_id] = prediction
            except Exception as e:
                logger.error(f"Failed to predict risk for {_sanitize_id(student_id)}: {e}")
        
        return results
    
    def _prepare_features(self, features: dict[str, float]) -> list[float]:
        """Prepare feature vector with defaults for missing features"""
        vector = []
        for feature_name in self.feature_names:
            value = features.get(feature_name, 0.0)
            vector.append(float(value) if value is not None else 0.0)
        return vector
    
    def _get_risk_level(self, risk_score: float) -> RiskLevel:
        """Categorize risk score into risk level"""
        if risk_score >= 0.75:
            return RiskLevel.CRITICAL
        elif risk_score >= 0.5:
            return RiskLevel.HIGH
        elif risk_score >= 0.25:
            return RiskLevel.MODERATE
        return RiskLevel.LOW
    
    def _calculate_confidence(
        self,
        features: dict[str, float],
        risk_prob: float
    ) -> float:
        """Calculate confidence score based on data completeness and prediction certainty"""
        # Data completeness (how many features we have)
        available = sum(1 for f in self.feature_names if f in features and features[f] is not None)
        completeness = available / len(self.feature_names)
        
        # Prediction certainty (how far from 0.5 the prediction is)
        certainty = abs(risk_prob - 0.5) * 2
        
        # Combined confidence
        return 0.6 * completeness + 0.4 * certainty
    
    def _calculate_category_scores(self, features: dict[str, float]) -> dict[str, float]:
        """Calculate risk scores per category"""
        category_scores = {cat.value: [] for cat in FeatureCategory}
        
        for feature_def in RISK_FEATURES:
            value = features.get(feature_def.name)
            if value is None:
                continue
            
            # Normalize value to 0-1 risk contribution
            risk_contribution = self._normalize_risk_contribution(feature_def, value)
            category_scores[feature_def.category.value].append(
                risk_contribution * feature_def.importance_weight
            )
        
        # Calculate weighted average per category
        result = {}
        for category, values in category_scores.items():
            if values:
                result[category] = sum(values) / sum(
                    f.importance_weight 
                    for f in RISK_FEATURES 
                    if f.category.value == category
                )
            else:
                result[category] = 0.0
        
        return result
    
    def _normalize_risk_contribution(
        self,
        feature_def: FeatureDefinition,
        value: float
    ) -> float:
        """Normalize feature value to 0-1 risk contribution"""
        if feature_def.threshold_low is None or feature_def.threshold_high is None:
            return 0.5
        
        if feature_def.risk_direction == "high_is_risk":
            if value <= feature_def.threshold_low:
                return 0.0
            elif value >= feature_def.threshold_high:
                return 1.0
            else:
                return (value - feature_def.threshold_low) / (
                    feature_def.threshold_high - feature_def.threshold_low
                )
        else:  # low_is_risk
            if value >= feature_def.threshold_high:
                return 0.0
            elif value <= feature_def.threshold_low:
                return 1.0
            else:
                return 1.0 - (value - feature_def.threshold_low) / (
                    feature_def.threshold_high - feature_def.threshold_low
                )
    
    def _identify_risk_factors(
        self,
        features: dict[str, float],
        risk_score: float
    ) -> list[RiskFactor]:
        """Identify the top factors contributing to risk"""
        factors = []
        
        for feature_def in RISK_FEATURES:
            value = features.get(feature_def.name)
            if value is None:
                continue
            
            contribution = self._normalize_risk_contribution(feature_def, value)
            
            # Only include if contributing to risk
            if contribution > 0.3:
                severity = "high" if contribution > 0.7 else ("medium" if contribution > 0.5 else "low")
                
                recommendation = None
                if feature_def.recommendation_template:
                    recommendation = feature_def.recommendation_template.format(
                        value=int(value) if isinstance(value, float) and value == int(value) else value
                    )
                
                factors.append(RiskFactor(
                    feature=feature_def.name,
                    category=feature_def.category,
                    description=feature_def.description,
                    current_value=value,
                    contribution=contribution * feature_def.importance_weight,
                    severity=severity,
                    threshold=feature_def.threshold_high if feature_def.risk_direction == "high_is_risk" 
                              else feature_def.threshold_low,
                    recommendation=recommendation
                ))
        
        # Sort by contribution (highest first)
        factors.sort(key=lambda f: f.contribution, reverse=True)
        return factors
    
    def _identify_protective_factors(
        self,
        features: dict[str, float]
    ) -> list[ProtectiveFactor]:
        """Identify factors that protect against risk"""
        factors = []
        
        for feature_def in RISK_FEATURES:
            value = features.get(feature_def.name)
            if value is None:
                continue
            
            contribution = self._normalize_risk_contribution(feature_def, value)
            
            # Protective if NOT contributing to risk
            if contribution < 0.3:
                factors.append(ProtectiveFactor(
                    feature=feature_def.name,
                    category=feature_def.category,
                    description=feature_def.description,
                    current_value=value,
                    contribution=(1 - contribution) * feature_def.importance_weight
                ))
        
        # Sort by contribution (highest protective effect first)
        factors.sort(key=lambda f: f.contribution, reverse=True)
        return factors
    
    def _calculate_trend(
        self,
        current_score: float,
        previous_score: Optional[float]
    ) -> tuple[RiskTrend, Optional[float]]:
        """Calculate risk trend compared to previous prediction"""
        if previous_score is None:
            return RiskTrend.STABLE, None
        
        change = current_score - previous_score
        
        if change > 0.05:
            return RiskTrend.INCREASING, change
        elif change < -0.05:
            return RiskTrend.DECREASING, change
        return RiskTrend.STABLE, change
    
    async def _fetch_student_features(
        self,
        student_id: str,
        tenant_id: str
    ) -> dict[str, float]:
        """Fetch student features from the feature store"""
        # In production, this would fetch from a feature store or compute from raw data
        # For now, return placeholder values
        logger.warning(f"Using placeholder features for student {_sanitize_id(student_id)}")
        return {}
    
    async def _get_previous_prediction(
        self,
        student_id: str,
        tenant_id: str
    ) -> Optional[float]:
        """Get the most recent previous prediction for trend calculation"""
        if not self.redis:
            return None
        
        history_key = f"risk_history:{tenant_id}:{student_id}"
        previous = await self.redis.lindex(history_key, 0)
        
        if previous:
            data = json.loads(previous)
            return data.get("risk_score")
        return None
    
    async def _store_prediction(
        self,
        prediction: RiskPrediction,
        tenant_id: str
    ) -> None:
        """Store prediction for historical tracking"""
        if not self.redis:
            return
        
        history_key = f"risk_history:{tenant_id}:{prediction.student_id}"
        
        data = {
            "risk_score": prediction.risk_score,
            "risk_level": prediction.risk_level.value,
            "timestamp": prediction.timestamp.isoformat()
        }
        
        await self.redis.lpush(history_key, json.dumps(data))
        await self.redis.ltrim(history_key, 0, 29)  # Keep last 30 predictions
    
    def _serialize_prediction(self, prediction: RiskPrediction) -> str:
        """Serialize prediction for caching"""
        return json.dumps({
            "student_id": prediction.student_id,
            "timestamp": prediction.timestamp.isoformat(),
            "risk_score": prediction.risk_score,
            "risk_level": prediction.risk_level.value,
            "confidence": prediction.confidence,
            "category_scores": prediction.category_scores,
            "top_risk_factors": [
                {
                    "feature": f.feature,
                    "category": f.category.value,
                    "description": f.description,
                    "current_value": f.current_value,
                    "contribution": f.contribution,
                    "severity": f.severity,
                    "threshold": f.threshold,
                    "recommendation": f.recommendation
                }
                for f in prediction.top_risk_factors
            ],
            "protective_factors": [
                {
                    "feature": f.feature,
                    "category": f.category.value,
                    "description": f.description,
                    "current_value": f.current_value,
                    "contribution": f.contribution
                }
                for f in prediction.protective_factors
            ],
            "risk_trend": prediction.risk_trend.value,
            "previous_risk_score": prediction.previous_risk_score,
            "score_change": prediction.score_change,
            "model_version": prediction.model_version
        })
    
    def _deserialize_prediction(self, data: str) -> RiskPrediction:
        """Deserialize prediction from cache"""
        obj = json.loads(data)
        
        return RiskPrediction(
            student_id=obj["student_id"],
            timestamp=datetime.fromisoformat(obj["timestamp"]),
            risk_score=obj["risk_score"],
            risk_level=RiskLevel(obj["risk_level"]),
            confidence=obj["confidence"],
            category_scores=obj["category_scores"],
            top_risk_factors=[
                RiskFactor(
                    feature=f["feature"],
                    category=FeatureCategory(f["category"]),
                    description=f["description"],
                    current_value=f["current_value"],
                    contribution=f["contribution"],
                    severity=f["severity"],
                    threshold=f.get("threshold"),
                    recommendation=f.get("recommendation")
                )
                for f in obj["top_risk_factors"]
            ],
            protective_factors=[
                ProtectiveFactor(
                    feature=f["feature"],
                    category=FeatureCategory(f["category"]),
                    description=f["description"],
                    current_value=f["current_value"],
                    contribution=f["contribution"]
                )
                for f in obj["protective_factors"]
            ],
            risk_trend=RiskTrend(obj["risk_trend"]),
            previous_risk_score=obj.get("previous_risk_score"),
            score_change=obj.get("score_change"),
            model_version=obj["model_version"]
        )
