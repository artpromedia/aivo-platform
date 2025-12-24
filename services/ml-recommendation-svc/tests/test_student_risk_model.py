"""
Tests for Student Risk Model

Comprehensive tests covering:
- Risk prediction logic
- Feature handling
- Risk level classification
- Trend calculation
- Explainability features
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from src.models.student_risk_model import (
    StudentRiskModel,
    RiskPrediction,
    RiskLevel,
    RiskTrend,
    FeatureCategory,
    RiskFactor,
    ProtectiveFactor,
    RISK_FEATURES,
)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def risk_model():
    """Create a StudentRiskModel instance for testing"""
    return StudentRiskModel()


@pytest.fixture
def sample_features():
    """Sample feature set representing a moderate-risk student"""
    return {
        # Academic features
        "current_mastery": 0.55,
        "mastery_trend_7d": -0.03,
        "skill_gaps_count": 4,
        "correct_first_attempt_rate": 0.50,
        "mastery_vs_class": -0.10,
        # Engagement features
        "days_since_last_session": 4,
        "session_frequency_7d": 3,
        "completion_rate": 0.60,
        "session_abandonment_rate": 0.20,
        "avg_session_duration": 12,
        # Behavioral features
        "frustration_signals": 5,
        "help_request_rate": 0.40,
        "hint_dependency_ratio": 0.35,
        # Temporal features
        "time_of_day_variance": 3,
        "weekend_engagement_ratio": 0.25,
    }


@pytest.fixture
def low_risk_features():
    """Features representing a low-risk student"""
    return {
        "current_mastery": 0.85,
        "mastery_trend_7d": 0.05,
        "skill_gaps_count": 1,
        "correct_first_attempt_rate": 0.75,
        "mastery_vs_class": 0.10,
        "days_since_last_session": 1,
        "session_frequency_7d": 6,
        "completion_rate": 0.90,
        "session_abandonment_rate": 0.05,
        "avg_session_duration": 25,
        "frustration_signals": 1,
        "help_request_rate": 0.15,
        "hint_dependency_ratio": 0.10,
        "time_of_day_variance": 1,
        "weekend_engagement_ratio": 0.40,
    }


@pytest.fixture
def high_risk_features():
    """Features representing a high-risk student"""
    return {
        "current_mastery": 0.30,
        "mastery_trend_7d": -0.15,
        "skill_gaps_count": 8,
        "correct_first_attempt_rate": 0.30,
        "mastery_vs_class": -0.25,
        "days_since_last_session": 10,
        "session_frequency_7d": 1,
        "completion_rate": 0.35,
        "session_abandonment_rate": 0.45,
        "avg_session_duration": 5,
        "frustration_signals": 12,
        "help_request_rate": 0.70,
        "hint_dependency_ratio": 0.65,
        "time_of_day_variance": 8,
        "weekend_engagement_ratio": 0.05,
    }


@pytest.fixture
def mock_redis():
    """Mock Redis client"""
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=None)
    mock.setex = AsyncMock()
    mock.lpush = AsyncMock()
    mock.ltrim = AsyncMock()
    mock.lindex = AsyncMock(return_value=None)
    return mock


# ============================================================================
# Model Initialization Tests
# ============================================================================

class TestModelInitialization:
    """Tests for model initialization"""
    
    def test_default_initialization(self, risk_model):
        """Test that model initializes with default parameters"""
        assert risk_model.model is not None
        assert risk_model.scaler is not None
        assert len(risk_model.feature_names) == len(RISK_FEATURES)
    
    def test_feature_map_populated(self, risk_model):
        """Test that feature map is properly populated"""
        assert len(risk_model.feature_map) == len(RISK_FEATURES)
        assert "current_mastery" in risk_model.feature_map
        assert "days_since_last_session" in risk_model.feature_map
    
    def test_model_version_set(self, risk_model):
        """Test that model version is set"""
        assert risk_model.MODEL_VERSION == "1.0.0"


# ============================================================================
# Feature Preparation Tests
# ============================================================================

class TestFeaturePreparation:
    """Tests for feature vector preparation"""
    
    def test_prepare_features_all_present(self, risk_model, sample_features):
        """Test feature preparation with all features present"""
        vector = risk_model._prepare_features(sample_features)
        assert len(vector) == len(RISK_FEATURES)
        assert all(isinstance(v, float) for v in vector)
    
    def test_prepare_features_missing_features(self, risk_model):
        """Test feature preparation with missing features defaults to 0"""
        partial_features = {"current_mastery": 0.75}
        vector = risk_model._prepare_features(partial_features)
        
        # First feature should be present
        assert vector[0] == 0.75
        # Rest should be 0.0
        assert vector[1] == 0.0
    
    def test_prepare_features_empty(self, risk_model):
        """Test feature preparation with empty features"""
        vector = risk_model._prepare_features({})
        assert len(vector) == len(RISK_FEATURES)
        assert all(v == 0.0 for v in vector)
    
    def test_prepare_features_handles_none(self, risk_model):
        """Test that None values are converted to 0.0"""
        features = {"current_mastery": None, "mastery_trend_7d": 0.05}
        vector = risk_model._prepare_features(features)
        assert vector[0] == 0.0  # None converted to 0.0


# ============================================================================
# Risk Level Classification Tests
# ============================================================================

class TestRiskLevelClassification:
    """Tests for risk level determination"""
    
    def test_critical_risk_level(self, risk_model):
        """Test critical risk classification"""
        assert risk_model._get_risk_level(0.75) == RiskLevel.CRITICAL
        assert risk_model._get_risk_level(0.90) == RiskLevel.CRITICAL
        assert risk_model._get_risk_level(1.0) == RiskLevel.CRITICAL
    
    def test_high_risk_level(self, risk_model):
        """Test high risk classification"""
        assert risk_model._get_risk_level(0.50) == RiskLevel.HIGH
        assert risk_model._get_risk_level(0.60) == RiskLevel.HIGH
        assert risk_model._get_risk_level(0.74) == RiskLevel.HIGH
    
    def test_moderate_risk_level(self, risk_model):
        """Test moderate risk classification"""
        assert risk_model._get_risk_level(0.25) == RiskLevel.MODERATE
        assert risk_model._get_risk_level(0.35) == RiskLevel.MODERATE
        assert risk_model._get_risk_level(0.49) == RiskLevel.MODERATE
    
    def test_low_risk_level(self, risk_model):
        """Test low risk classification"""
        assert risk_model._get_risk_level(0.0) == RiskLevel.LOW
        assert risk_model._get_risk_level(0.10) == RiskLevel.LOW
        assert risk_model._get_risk_level(0.24) == RiskLevel.LOW


# ============================================================================
# Confidence Calculation Tests
# ============================================================================

class TestConfidenceCalculation:
    """Tests for confidence score calculation"""
    
    def test_full_features_high_certainty(self, risk_model, sample_features):
        """Test confidence with full features and high certainty"""
        confidence = risk_model._calculate_confidence(sample_features, 0.90)
        assert 0.5 < confidence <= 1.0
    
    def test_partial_features_lower_confidence(self, risk_model):
        """Test that partial features result in lower confidence"""
        partial = {"current_mastery": 0.5}
        full = {f.name: 0.5 for f in RISK_FEATURES}
        
        partial_conf = risk_model._calculate_confidence(partial, 0.5)
        full_conf = risk_model._calculate_confidence(full, 0.5)
        
        assert partial_conf < full_conf
    
    def test_uncertain_prediction_lower_confidence(self, risk_model, sample_features):
        """Test that predictions near 0.5 have lower certainty component"""
        conf_at_50 = risk_model._calculate_confidence(sample_features, 0.50)
        conf_at_90 = risk_model._calculate_confidence(sample_features, 0.90)
        
        # 0.9 is more certain than 0.5
        assert conf_at_90 > conf_at_50


# ============================================================================
# Category Scores Tests
# ============================================================================

class TestCategoryScores:
    """Tests for per-category risk score calculation"""
    
    def test_all_categories_calculated(self, risk_model, sample_features):
        """Test that all categories are calculated"""
        scores = risk_model._calculate_category_scores(sample_features)
        
        assert FeatureCategory.ACADEMIC.value in scores
        assert FeatureCategory.ENGAGEMENT.value in scores
        assert FeatureCategory.BEHAVIORAL.value in scores
        assert FeatureCategory.TEMPORAL.value in scores
    
    def test_category_scores_range(self, risk_model, sample_features):
        """Test that category scores are in valid range"""
        scores = risk_model._calculate_category_scores(sample_features)
        
        for category, score in scores.items():
            assert 0.0 <= score <= 1.0, f"{category} score out of range: {score}"
    
    def test_low_risk_features_low_scores(self, risk_model, low_risk_features):
        """Test that low-risk features produce low category scores"""
        scores = risk_model._calculate_category_scores(low_risk_features)
        
        # All scores should be relatively low for low-risk student
        for category, score in scores.items():
            assert score < 0.5, f"{category} score too high for low-risk: {score}"
    
    def test_high_risk_features_high_scores(self, risk_model, high_risk_features):
        """Test that high-risk features produce high category scores"""
        scores = risk_model._calculate_category_scores(high_risk_features)
        
        # Most scores should be elevated for high-risk student
        high_scores = sum(1 for s in scores.values() if s > 0.4)
        assert high_scores >= 2, "High-risk student should have multiple elevated categories"


# ============================================================================
# Risk Factor Identification Tests
# ============================================================================

class TestRiskFactorIdentification:
    """Tests for identifying risk factors"""
    
    def test_identifies_risk_factors(self, risk_model, high_risk_features):
        """Test that risk factors are identified for high-risk student"""
        factors = risk_model._identify_risk_factors(high_risk_features, 0.75)
        
        assert len(factors) > 0
        assert all(isinstance(f, RiskFactor) for f in factors)
    
    def test_risk_factors_have_recommendations(self, risk_model, high_risk_features):
        """Test that risk factors include recommendations"""
        factors = risk_model._identify_risk_factors(high_risk_features, 0.75)
        
        # At least some factors should have recommendations
        with_recommendations = [f for f in factors if f.recommendation]
        assert len(with_recommendations) > 0
    
    def test_risk_factors_sorted_by_contribution(self, risk_model, high_risk_features):
        """Test that risk factors are sorted by contribution (highest first)"""
        factors = risk_model._identify_risk_factors(high_risk_features, 0.75)
        
        if len(factors) >= 2:
            for i in range(len(factors) - 1):
                assert factors[i].contribution >= factors[i + 1].contribution
    
    def test_low_risk_minimal_factors(self, risk_model, low_risk_features):
        """Test that low-risk students have minimal risk factors"""
        factors = risk_model._identify_risk_factors(low_risk_features, 0.15)
        
        # Low-risk students should have few or no high-severity factors
        high_severity = [f for f in factors if f.severity == "high"]
        assert len(high_severity) == 0


# ============================================================================
# Protective Factor Identification Tests
# ============================================================================

class TestProtectiveFactorIdentification:
    """Tests for identifying protective factors"""
    
    def test_identifies_protective_factors(self, risk_model, low_risk_features):
        """Test that protective factors are identified for low-risk student"""
        factors = risk_model._identify_protective_factors(low_risk_features)
        
        assert len(factors) > 0
        assert all(isinstance(f, ProtectiveFactor) for f in factors)
    
    def test_protective_factors_sorted(self, risk_model, low_risk_features):
        """Test that protective factors are sorted by contribution"""
        factors = risk_model._identify_protective_factors(low_risk_features)
        
        if len(factors) >= 2:
            for i in range(len(factors) - 1):
                assert factors[i].contribution >= factors[i + 1].contribution
    
    def test_high_risk_few_protective(self, risk_model, high_risk_features):
        """Test that high-risk students have few protective factors"""
        factors = risk_model._identify_protective_factors(high_risk_features)
        
        # High-risk students should have fewer protective factors
        assert len(factors) <= 3


# ============================================================================
# Risk Trend Calculation Tests
# ============================================================================

class TestRiskTrendCalculation:
    """Tests for risk trend calculation"""
    
    def test_increasing_trend(self, risk_model):
        """Test increasing trend detection"""
        trend, change = risk_model._calculate_trend(0.60, 0.40)
        
        assert trend == RiskTrend.INCREASING
        assert change == pytest.approx(0.20, abs=0.01)
    
    def test_decreasing_trend(self, risk_model):
        """Test decreasing trend detection"""
        trend, change = risk_model._calculate_trend(0.30, 0.50)
        
        assert trend == RiskTrend.DECREASING
        assert change == pytest.approx(-0.20, abs=0.01)
    
    def test_stable_trend(self, risk_model):
        """Test stable trend detection"""
        trend, change = risk_model._calculate_trend(0.50, 0.48)
        
        assert trend == RiskTrend.STABLE
        assert change == pytest.approx(0.02, abs=0.01)
    
    def test_no_previous_stable(self, risk_model):
        """Test that no previous prediction results in stable trend"""
        trend, change = risk_model._calculate_trend(0.50, None)
        
        assert trend == RiskTrend.STABLE
        assert change is None


# ============================================================================
# Prediction Integration Tests
# ============================================================================

class TestPredictionIntegration:
    """Integration tests for the full prediction flow"""
    
    @pytest.mark.asyncio
    async def test_predict_risk_returns_prediction(self, risk_model, sample_features):
        """Test that predict_risk returns a valid RiskPrediction"""
        prediction = await risk_model.predict_risk(
            student_id="student_123",
            tenant_id="tenant_456",
            features=sample_features
        )
        
        assert isinstance(prediction, RiskPrediction)
        assert prediction.student_id == "student_123"
        assert 0.0 <= prediction.risk_score <= 1.0
        assert prediction.risk_level in RiskLevel
        assert prediction.risk_trend in RiskTrend
    
    @pytest.mark.asyncio
    async def test_prediction_includes_factors(self, risk_model, sample_features):
        """Test that prediction includes risk and protective factors"""
        prediction = await risk_model.predict_risk(
            student_id="student_123",
            tenant_id="tenant_456",
            features=sample_features
        )
        
        assert hasattr(prediction, "top_risk_factors")
        assert hasattr(prediction, "protective_factors")
        assert len(prediction.top_risk_factors) <= 5  # Top 5
        assert len(prediction.protective_factors) <= 3  # Top 3
    
    @pytest.mark.asyncio
    async def test_prediction_includes_category_scores(self, risk_model, sample_features):
        """Test that prediction includes category scores"""
        prediction = await risk_model.predict_risk(
            student_id="student_123",
            tenant_id="tenant_456",
            features=sample_features
        )
        
        assert "academic" in prediction.category_scores
        assert "engagement" in prediction.category_scores
        assert "behavioral" in prediction.category_scores
        assert "temporal" in prediction.category_scores
    
    @pytest.mark.asyncio
    async def test_batch_prediction(self, risk_model):
        """Test batch prediction for multiple students"""
        predictions = await risk_model.predict_risk_batch(
            student_ids=["student_1", "student_2", "student_3"],
            tenant_id="tenant_456"
        )
        
        assert len(predictions) == 3
        assert all(isinstance(p, RiskPrediction) for p in predictions.values())


# ============================================================================
# Caching Tests
# ============================================================================

class TestCaching:
    """Tests for prediction caching"""
    
    @pytest.mark.asyncio
    async def test_caches_prediction(self, sample_features, mock_redis):
        """Test that predictions are cached"""
        model = StudentRiskModel(redis_client=mock_redis)
        
        await model.predict_risk(
            student_id="student_123",
            tenant_id="tenant_456",
            features=sample_features
        )
        
        # Should have called setex to cache
        mock_redis.setex.assert_called()
    
    @pytest.mark.asyncio
    async def test_returns_cached_prediction(self, sample_features, mock_redis):
        """Test that cached predictions are returned"""
        import json
        from datetime import datetime
        
        # Set up cached value
        cached_prediction = {
            "student_id": "student_123",
            "timestamp": datetime.utcnow().isoformat(),
            "risk_score": 0.45,
            "risk_level": "moderate",
            "confidence": 0.80,
            "category_scores": {"academic": 0.4, "engagement": 0.3, "behavioral": 0.2, "temporal": 0.1},
            "top_risk_factors": [],
            "protective_factors": [],
            "risk_trend": "stable",
            "previous_risk_score": None,
            "score_change": None,
            "model_version": "1.0.0"
        }
        mock_redis.get = AsyncMock(return_value=json.dumps(cached_prediction))
        
        model = StudentRiskModel(redis_client=mock_redis)
        
        prediction = await model.predict_risk(
            student_id="student_123",
            tenant_id="tenant_456",
            features=sample_features
        )
        
        assert prediction.risk_score == 0.45
        assert prediction.risk_level == RiskLevel.MODERATE


# ============================================================================
# Serialization Tests
# ============================================================================

class TestSerialization:
    """Tests for prediction serialization/deserialization"""
    
    @pytest.mark.asyncio
    async def test_serialize_deserialize_roundtrip(self, risk_model, sample_features):
        """Test that serialization and deserialization are consistent"""
        prediction = await risk_model.predict_risk(
            student_id="student_123",
            tenant_id="tenant_456",
            features=sample_features
        )
        
        serialized = risk_model._serialize_prediction(prediction)
        deserialized = risk_model._deserialize_prediction(serialized)
        
        assert deserialized.student_id == prediction.student_id
        assert deserialized.risk_score == prediction.risk_score
        assert deserialized.risk_level == prediction.risk_level
        assert deserialized.confidence == prediction.confidence
        assert len(deserialized.top_risk_factors) == len(prediction.top_risk_factors)


# ============================================================================
# Edge Cases
# ============================================================================

class TestEdgeCases:
    """Tests for edge cases and error handling"""
    
    @pytest.mark.asyncio
    async def test_empty_features(self, risk_model):
        """Test prediction with empty features"""
        prediction = await risk_model.predict_risk(
            student_id="student_123",
            tenant_id="tenant_456",
            features={}
        )
        
        # Should still return a valid prediction
        assert isinstance(prediction, RiskPrediction)
        assert prediction.confidence < 0.5  # Low confidence due to missing data
    
    @pytest.mark.asyncio
    async def test_extreme_values(self, risk_model):
        """Test prediction with extreme feature values"""
        extreme_features = {
            "current_mastery": 0.0,
            "days_since_last_session": 100,
            "frustration_signals": 50,
        }
        
        prediction = await risk_model.predict_risk(
            student_id="student_123",
            tenant_id="tenant_456",
            features=extreme_features
        )
        
        # Should handle extreme values gracefully
        assert isinstance(prediction, RiskPrediction)
        assert 0.0 <= prediction.risk_score <= 1.0
