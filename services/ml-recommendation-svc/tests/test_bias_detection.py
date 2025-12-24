"""
Tests for Bias Detection Service

Comprehensive tests covering:
- Fairness metric calculations
- Statistical parity analysis
- Disparate impact detection
- Alert generation
- Recommendation generation
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
import json

from src.services.bias_detection import (
    BiasDetectionService,
    BiasReport,
    BiasAlert,
    BiasSeverity,
    FairnessMetric,
    ProtectedAttribute,
    GroupStatistics,
    FairnessResult,
    BIAS_THRESHOLDS,
)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def bias_service():
    """Create a BiasDetectionService instance for testing"""
    return BiasDetectionService()


@pytest.fixture
def mock_redis():
    """Mock Redis client"""
    mock = AsyncMock()
    mock.lpush = AsyncMock()
    mock.ltrim = AsyncMock()
    mock.setex = AsyncMock()
    mock.lrange = AsyncMock(return_value=[])
    mock.hgetall = AsyncMock(return_value={})
    mock.hset = AsyncMock()
    return mock


@pytest.fixture
def balanced_predictions():
    """Predictions with balanced demographic distribution"""
    predictions = []
    demographics_groups = [
        {"gender": "male", "race_ethnicity": "white"},
        {"gender": "female", "race_ethnicity": "white"},
        {"gender": "male", "race_ethnicity": "black"},
        {"gender": "female", "race_ethnicity": "black"},
    ]
    
    # Create 50 predictions per group with similar risk distributions
    for i, demo in enumerate(demographics_groups):
        for j in range(50):
            # Similar risk distribution across groups
            risk = 0.3 + (j % 10) * 0.05
            predictions.append({
                "student_id": f"student_{i}_{j}",
                "risk_score": risk,
                "demographics": demo
            })
    
    return predictions


@pytest.fixture
def biased_predictions():
    """Predictions showing bias against a demographic group"""
    predictions = []
    
    # Group A (majority): lower risk scores
    for i in range(100):
        predictions.append({
            "student_id": f"group_a_{i}",
            "risk_score": 0.20 + (i % 20) * 0.02,  # 0.20 - 0.58
            "demographics": {"race_ethnicity": "group_a", "gender": "male"}
        })
    
    # Group B (minority): higher risk scores - showing bias
    for i in range(50):
        predictions.append({
            "student_id": f"group_b_{i}",
            "risk_score": 0.50 + (i % 20) * 0.02,  # 0.50 - 0.88
            "demographics": {"race_ethnicity": "group_b", "gender": "male"}
        })
    
    return predictions


@pytest.fixture
def predictions_with_outcomes():
    """Predictions with ground truth outcomes"""
    predictions = []
    outcomes = []
    
    for i in range(100):
        student_id = f"student_{i}"
        risk = 0.3 + (i % 10) * 0.07
        actual = risk > 0.5  # True if actually at-risk
        
        predictions.append({
            "student_id": student_id,
            "risk_score": risk,
            "demographics": {
                "gender": "male" if i % 2 == 0 else "female",
                "race_ethnicity": "group_a" if i % 3 == 0 else "group_b"
            }
        })
        
        outcomes.append({
            "student_id": student_id,
            "actual_outcome": actual
        })
    
    return predictions, outcomes


# ============================================================================
# Group Statistics Tests
# ============================================================================

class TestGroupStatistics:
    """Tests for group statistics calculation"""
    
    def test_calculates_mean_prediction(self, bias_service, balanced_predictions):
        """Test mean prediction calculation"""
        groups = bias_service._group_by_demographics(balanced_predictions)
        gender_groups = groups["gender"]
        
        stats = bias_service._calculate_group_statistics(gender_groups, {})
        
        male_stats = next(s for s in stats if s.group_name == "male")
        female_stats = next(s for s in stats if s.group_name == "female")
        
        assert male_stats.mean_prediction > 0
        assert female_stats.mean_prediction > 0
    
    def test_calculates_positive_rate(self, bias_service, balanced_predictions):
        """Test positive rate calculation"""
        groups = bias_service._group_by_demographics(balanced_predictions)
        gender_groups = groups["gender"]
        
        stats = bias_service._calculate_group_statistics(gender_groups, {})
        
        for s in stats:
            assert 0.0 <= s.positive_rate <= 1.0
    
    def test_calculates_sample_size(self, bias_service, balanced_predictions):
        """Test sample size tracking"""
        groups = bias_service._group_by_demographics(balanced_predictions)
        gender_groups = groups["gender"]
        
        stats = bias_service._calculate_group_statistics(gender_groups, {})
        
        total = sum(s.sample_size for s in stats)
        assert total == len(balanced_predictions)


# ============================================================================
# Statistical Parity Tests
# ============================================================================

class TestStatisticalParity:
    """Tests for statistical parity evaluation"""
    
    def test_detects_no_bias_when_balanced(self, bias_service, balanced_predictions):
        """Test no significant bias in balanced predictions"""
        groups = bias_service._group_by_demographics(balanced_predictions)
        gender_groups = groups["gender"]
        
        stats = bias_service._calculate_group_statistics(gender_groups, {})
        
        reference = stats[0]
        comparison = stats[1]
        
        result = bias_service._evaluate_statistical_parity(
            ProtectedAttribute.GENDER,
            reference,
            comparison
        )
        
        # Should not show severe bias for balanced data
        assert result.severity in [BiasSeverity.NONE, BiasSeverity.LOW]
    
    def test_detects_bias_when_unbalanced(self, bias_service, biased_predictions):
        """Test bias detection in biased predictions"""
        groups = bias_service._group_by_demographics(biased_predictions)
        race_groups = groups["race_ethnicity"]
        
        stats = bias_service._calculate_group_statistics(race_groups, {})
        
        group_a = next(s for s in stats if s.group_name == "group_a")
        group_b = next(s for s in stats if s.group_name == "group_b")
        
        result = bias_service._evaluate_statistical_parity(
            ProtectedAttribute.RACE_ETHNICITY,
            group_a,
            group_b
        )
        
        # Should detect significant bias
        assert result.is_significant or result.difference > 0.10
    
    def test_result_includes_explanation(self, bias_service, biased_predictions):
        """Test that results include human-readable explanation"""
        groups = bias_service._group_by_demographics(biased_predictions)
        race_groups = groups["race_ethnicity"]
        
        stats = bias_service._calculate_group_statistics(race_groups, {})
        
        result = bias_service._evaluate_statistical_parity(
            ProtectedAttribute.RACE_ETHNICITY,
            stats[0],
            stats[1]
        )
        
        assert result.explanation is not None
        assert len(result.explanation) > 0
        assert "race ethnicity" in result.explanation.lower()


# ============================================================================
# Disparate Impact Tests
# ============================================================================

class TestDisparateImpact:
    """Tests for disparate impact evaluation"""
    
    def test_calculates_disparate_impact_ratio(self, bias_service, biased_predictions):
        """Test disparate impact ratio calculation"""
        groups = bias_service._group_by_demographics(biased_predictions)
        race_groups = groups["race_ethnicity"]
        
        stats = bias_service._calculate_group_statistics(race_groups, {})
        
        result = bias_service._evaluate_disparate_impact(
            ProtectedAttribute.RACE_ETHNICITY,
            stats[0],
            stats[1]
        )
        
        assert result.ratio is not None
        assert result.metric == FairnessMetric.DISPARATE_IMPACT
    
    def test_flags_ratio_below_80_percent(self, bias_service):
        """Test that ratios below 80% are flagged (four-fifths rule)"""
        # Create stats that violate 80% rule
        reference = GroupStatistics(
            group_name="reference",
            sample_size=100,
            mean_prediction=0.4,
            std_prediction=0.1,
            positive_rate=0.50
        )
        comparison = GroupStatistics(
            group_name="comparison",
            sample_size=100,
            mean_prediction=0.7,
            std_prediction=0.1,
            positive_rate=0.35  # 70% of reference rate
        )
        
        result = bias_service._evaluate_disparate_impact(
            ProtectedAttribute.RACE_ETHNICITY,
            reference,
            comparison
        )
        
        # 0.35/0.50 = 0.70, below 0.80 threshold
        assert result.severity != BiasSeverity.NONE


# ============================================================================
# Equalized Odds Tests
# ============================================================================

class TestEqualizedOdds:
    """Tests for equalized odds evaluation"""
    
    def test_evaluates_false_positive_rate(self, bias_service):
        """Test false positive rate difference evaluation"""
        reference = GroupStatistics(
            group_name="reference",
            sample_size=100,
            mean_prediction=0.4,
            std_prediction=0.1,
            positive_rate=0.40,
            false_positive_rate=0.10,
            false_negative_rate=0.15
        )
        comparison = GroupStatistics(
            group_name="comparison",
            sample_size=100,
            mean_prediction=0.5,
            std_prediction=0.1,
            positive_rate=0.50,
            false_positive_rate=0.25,  # Higher FPR
            false_negative_rate=0.15
        )
        
        results = bias_service._evaluate_equalized_odds(
            ProtectedAttribute.GENDER,
            reference,
            comparison
        )
        
        fpr_result = next(r for r in results if r.metric == FairnessMetric.FALSE_POSITIVE_RATE)
        assert fpr_result.difference == pytest.approx(0.15, abs=0.01)
    
    def test_evaluates_false_negative_rate(self, bias_service):
        """Test false negative rate difference evaluation"""
        reference = GroupStatistics(
            group_name="reference",
            sample_size=100,
            mean_prediction=0.4,
            std_prediction=0.1,
            positive_rate=0.40,
            false_positive_rate=0.10,
            false_negative_rate=0.10
        )
        comparison = GroupStatistics(
            group_name="comparison",
            sample_size=100,
            mean_prediction=0.5,
            std_prediction=0.1,
            positive_rate=0.50,
            false_positive_rate=0.10,
            false_negative_rate=0.30  # Higher FNR - missing at-risk students
        )
        
        results = bias_service._evaluate_equalized_odds(
            ProtectedAttribute.GENDER,
            reference,
            comparison
        )
        
        fnr_result = next(r for r in results if r.metric == FairnessMetric.FALSE_NEGATIVE_RATE)
        assert fnr_result.difference == pytest.approx(0.20, abs=0.01)
        assert fnr_result.severity != BiasSeverity.NONE


# ============================================================================
# Severity Classification Tests
# ============================================================================

class TestSeverityClassification:
    """Tests for bias severity classification"""
    
    def test_no_bias_for_small_differences(self, bias_service):
        """Test that small differences are classified as no bias"""
        severity = bias_service._get_severity(
            FairnessMetric.STATISTICAL_PARITY,
            0.03
        )
        assert severity == BiasSeverity.NONE
    
    def test_low_severity_classification(self, bias_service):
        """Test low severity classification"""
        severity = bias_service._get_severity(
            FairnessMetric.STATISTICAL_PARITY,
            0.07
        )
        assert severity == BiasSeverity.LOW
    
    def test_moderate_severity_classification(self, bias_service):
        """Test moderate severity classification"""
        severity = bias_service._get_severity(
            FairnessMetric.STATISTICAL_PARITY,
            0.12
        )
        assert severity == BiasSeverity.MODERATE
    
    def test_high_severity_classification(self, bias_service):
        """Test high severity classification"""
        severity = bias_service._get_severity(
            FairnessMetric.STATISTICAL_PARITY,
            0.17
        )
        assert severity == BiasSeverity.HIGH
    
    def test_critical_severity_classification(self, bias_service):
        """Test critical severity classification"""
        severity = bias_service._get_severity(
            FairnessMetric.STATISTICAL_PARITY,
            0.25
        )
        assert severity == BiasSeverity.CRITICAL
    
    def test_disparate_impact_severity(self, bias_service):
        """Test disparate impact severity (lower ratio = worse)"""
        severity = bias_service._get_severity_di(0.65)
        assert severity == BiasSeverity.CRITICAL
        
        severity = bias_service._get_severity_di(0.95)
        assert severity == BiasSeverity.NONE


# ============================================================================
# Overall Severity Determination Tests
# ============================================================================

class TestOverallSeverity:
    """Tests for overall bias severity determination"""
    
    def test_no_results_returns_none(self, bias_service):
        """Test that empty results return no bias"""
        severity = bias_service._determine_overall_severity([])
        assert severity == BiasSeverity.NONE
    
    def test_returns_highest_severity(self, bias_service):
        """Test that highest severity is returned"""
        results = [
            FairnessResult(
                metric=FairnessMetric.STATISTICAL_PARITY,
                attribute=ProtectedAttribute.GENDER,
                reference_group="a",
                comparison_group="b",
                reference_value=0.5,
                comparison_value=0.4,
                difference=0.1,
                ratio=0.8,
                p_value=0.01,
                is_significant=True,
                severity=BiasSeverity.MODERATE,
                explanation="test"
            ),
            FairnessResult(
                metric=FairnessMetric.DISPARATE_IMPACT,
                attribute=ProtectedAttribute.GENDER,
                reference_group="a",
                comparison_group="b",
                reference_value=0.5,
                comparison_value=0.3,
                difference=0.2,
                ratio=0.6,
                p_value=None,
                is_significant=True,
                severity=BiasSeverity.CRITICAL,
                explanation="test"
            ),
        ]
        
        severity = bias_service._determine_overall_severity(results)
        assert severity == BiasSeverity.CRITICAL


# ============================================================================
# Recommendation Generation Tests
# ============================================================================

class TestRecommendationGeneration:
    """Tests for bias remediation recommendation generation"""
    
    def test_generates_recommendations_for_bias(self, bias_service):
        """Test recommendation generation for detected bias"""
        results = [
            FairnessResult(
                metric=FairnessMetric.STATISTICAL_PARITY,
                attribute=ProtectedAttribute.RACE_ETHNICITY,
                reference_group="a",
                comparison_group="b",
                reference_value=0.5,
                comparison_value=0.7,
                difference=0.2,
                ratio=0.7,
                p_value=0.001,
                is_significant=True,
                severity=BiasSeverity.HIGH,
                explanation="test"
            ),
        ]
        
        recommendations = bias_service._generate_recommendations(results)
        
        assert len(recommendations) > 0
        assert any("race ethnicity" in r.lower() for r in recommendations)
    
    def test_urgent_recommendation_for_critical(self, bias_service):
        """Test urgent recommendations for critical bias"""
        results = [
            FairnessResult(
                metric=FairnessMetric.STATISTICAL_PARITY,
                attribute=ProtectedAttribute.GENDER,
                reference_group="a",
                comparison_group="b",
                reference_value=0.5,
                comparison_value=0.8,
                difference=0.3,
                ratio=0.6,
                p_value=0.0001,
                is_significant=True,
                severity=BiasSeverity.CRITICAL,
                explanation="test"
            ),
        ]
        
        recommendations = bias_service._generate_recommendations(results)
        
        assert any("urgent" in r.lower() for r in recommendations)
    
    def test_no_significant_bias_recommendation(self, bias_service):
        """Test recommendations when no significant bias found"""
        results = [
            FairnessResult(
                metric=FairnessMetric.STATISTICAL_PARITY,
                attribute=ProtectedAttribute.GENDER,
                reference_group="a",
                comparison_group="b",
                reference_value=0.5,
                comparison_value=0.52,
                difference=0.02,
                ratio=0.96,
                p_value=0.5,
                is_significant=False,
                severity=BiasSeverity.NONE,
                explanation="test"
            ),
        ]
        
        recommendations = bias_service._generate_recommendations(results)
        
        assert any("continue monitoring" in r.lower() for r in recommendations)


# ============================================================================
# Full Analysis Integration Tests
# ============================================================================

class TestFullAnalysis:
    """Integration tests for the full bias analysis flow"""
    
    @pytest.mark.asyncio
    async def test_analyze_bias_returns_report(self, bias_service, balanced_predictions):
        """Test that analyze_bias returns a valid BiasReport"""
        report = await bias_service.analyze_bias(
            tenant_id="tenant_123",
            model_version="1.0.0",
            predictions=balanced_predictions
        )
        
        assert isinstance(report, BiasReport)
        assert report.tenant_id == "tenant_123"
        assert report.model_version == "1.0.0"
        assert report.total_predictions == len(balanced_predictions)
    
    @pytest.mark.asyncio
    async def test_analyze_includes_demographic_coverage(self, bias_service, balanced_predictions):
        """Test that analysis includes demographic coverage"""
        report = await bias_service.analyze_bias(
            tenant_id="tenant_123",
            model_version="1.0.0",
            predictions=balanced_predictions
        )
        
        assert "gender" in report.demographic_coverage
        assert "race_ethnicity" in report.demographic_coverage
    
    @pytest.mark.asyncio
    async def test_analyze_biased_data_flags_review(self, bias_service, biased_predictions):
        """Test that biased data triggers review requirement"""
        report = await bias_service.analyze_bias(
            tenant_id="tenant_123",
            model_version="1.0.0",
            predictions=biased_predictions
        )
        
        # Biased predictions should trigger review
        assert report.overall_bias_severity != BiasSeverity.NONE
        # Note: requires_review depends on severity being HIGH or CRITICAL
    
    @pytest.mark.asyncio
    async def test_analyze_includes_group_statistics(self, bias_service, balanced_predictions):
        """Test that analysis includes group statistics"""
        report = await bias_service.analyze_bias(
            tenant_id="tenant_123",
            model_version="1.0.0",
            predictions=balanced_predictions
        )
        
        assert len(report.group_statistics) > 0


# ============================================================================
# Alert Management Tests
# ============================================================================

class TestAlertManagement:
    """Tests for bias alert management"""
    
    @pytest.mark.asyncio
    async def test_creates_alerts_for_high_severity(self, mock_redis, biased_predictions):
        """Test that alerts are created for high-severity bias"""
        service = BiasDetectionService(redis_client=mock_redis)
        
        report = await service.analyze_bias(
            tenant_id="tenant_123",
            model_version="1.0.0",
            predictions=biased_predictions
        )
        
        # If high/critical severity was found, alerts should be created
        if report.overall_bias_severity in [BiasSeverity.HIGH, BiasSeverity.CRITICAL]:
            mock_redis.lpush.assert_called()
    
    @pytest.mark.asyncio
    async def test_get_pending_alerts(self, mock_redis):
        """Test retrieving pending alerts"""
        alerts_data = [
            json.dumps({
                "alert_id": "alert_1",
                "created_at": datetime.utcnow().isoformat(),
                "metric": "statistical_parity",
                "attribute": "gender",
                "affected_group": "female",
                "severity": "high",
                "resolved": False
            }),
            json.dumps({
                "alert_id": "alert_2",
                "created_at": datetime.utcnow().isoformat(),
                "metric": "disparate_impact",
                "attribute": "race_ethnicity",
                "affected_group": "group_b",
                "severity": "moderate",
                "resolved": True  # Already resolved
            }),
        ]
        mock_redis.lrange = AsyncMock(return_value=alerts_data)
        
        service = BiasDetectionService(redis_client=mock_redis)
        alerts = await service.get_pending_alerts("tenant_123")
        
        # Only unresolved alerts should be returned
        assert len(alerts) == 1
        assert alerts[0]["alert_id"] == "alert_1"
    
    @pytest.mark.asyncio
    async def test_acknowledge_alert(self, mock_redis):
        """Test acknowledging an alert"""
        service = BiasDetectionService(redis_client=mock_redis)
        
        result = await service.acknowledge_alert(
            tenant_id="tenant_123",
            alert_id="alert_1",
            user_id="user_456"
        )
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_resolve_alert(self, mock_redis):
        """Test resolving an alert"""
        service = BiasDetectionService(redis_client=mock_redis)
        
        result = await service.resolve_alert(
            tenant_id="tenant_123",
            alert_id="alert_1",
            user_id="user_456",
            resolution_notes="Reviewed and addressed by retraining model"
        )
        
        assert result is True


# ============================================================================
# Minimum Sample Size Tests
# ============================================================================

class TestMinimumSampleSize:
    """Tests for minimum sample size requirements"""
    
    @pytest.mark.asyncio
    async def test_skips_small_groups(self, bias_service):
        """Test that groups below minimum size are skipped"""
        # Create predictions with one small group
        predictions = []
        
        # Large group
        for i in range(50):
            predictions.append({
                "student_id": f"large_{i}",
                "risk_score": 0.4,
                "demographics": {"gender": "male"}
            })
        
        # Small group (below minimum)
        for i in range(10):  # Below 30 minimum
            predictions.append({
                "student_id": f"small_{i}",
                "risk_score": 0.6,
                "demographics": {"gender": "female"}
            })
        
        report = await bias_service.analyze_bias(
            tenant_id="tenant_123",
            model_version="1.0.0",
            predictions=predictions
        )
        
        # Should have no fairness results since we can't compare
        # (one group is too small)
        gender_results = [
            r for r in report.fairness_results
            if r.attribute == ProtectedAttribute.GENDER
        ]
        assert len(gender_results) == 0


# ============================================================================
# Confidence Score Tests
# ============================================================================

class TestConfidenceScore:
    """Tests for analysis confidence score calculation"""
    
    @pytest.mark.asyncio
    async def test_low_confidence_for_small_sample(self, bias_service):
        """Test low confidence for small sample sizes"""
        predictions = [
            {"student_id": f"s_{i}", "risk_score": 0.5, "demographics": {}}
            for i in range(50)
        ]
        
        report = await bias_service.analyze_bias(
            tenant_id="tenant_123",
            model_version="1.0.0",
            predictions=predictions
        )
        
        assert report.confidence_score < 0.5
    
    @pytest.mark.asyncio
    async def test_higher_confidence_for_large_sample(self, bias_service, balanced_predictions):
        """Test higher confidence for larger sample sizes"""
        report = await bias_service.analyze_bias(
            tenant_id="tenant_123",
            model_version="1.0.0",
            predictions=balanced_predictions
        )
        
        assert report.confidence_score >= 0.3


# ============================================================================
# Edge Cases
# ============================================================================

class TestEdgeCases:
    """Tests for edge cases and error handling"""
    
    @pytest.mark.asyncio
    async def test_empty_predictions(self, bias_service):
        """Test handling of empty predictions"""
        report = await bias_service.analyze_bias(
            tenant_id="tenant_123",
            model_version="1.0.0",
            predictions=[]
        )
        
        assert report.total_predictions == 0
        assert report.overall_bias_severity == BiasSeverity.NONE
    
    @pytest.mark.asyncio
    async def test_no_demographics(self, bias_service):
        """Test handling of predictions without demographics"""
        predictions = [
            {"student_id": f"s_{i}", "risk_score": 0.5, "demographics": {}}
            for i in range(100)
        ]
        
        report = await bias_service.analyze_bias(
            tenant_id="tenant_123",
            model_version="1.0.0",
            predictions=predictions
        )
        
        assert len(report.fairness_results) == 0
    
    @pytest.mark.asyncio
    async def test_single_group_per_attribute(self, bias_service):
        """Test handling when only one group exists per attribute"""
        predictions = [
            {"student_id": f"s_{i}", "risk_score": 0.5, "demographics": {"gender": "male"}}
            for i in range(100)
        ]
        
        report = await bias_service.analyze_bias(
            tenant_id="tenant_123",
            model_version="1.0.0",
            predictions=predictions
        )
        
        # Can't compare with only one group
        gender_results = [
            r for r in report.fairness_results
            if r.attribute == ProtectedAttribute.GENDER
        ]
        assert len(gender_results) == 0
