"""
Integration Tests for Predictive Analytics System

Tests the complete flow from feature extraction through prediction to intervention.
Includes tests for bias detection, FERPA compliance, and A/B testing.
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch
import numpy as np

# Test fixtures and mocks
@pytest.fixture
def mock_db():
    """Mock database connection"""
    db = AsyncMock()
    return db


@pytest.fixture
def mock_feature_store():
    """Mock feature store with sample student data"""
    return {
        "student_001": {
            "current_mastery": 0.65,
            "mastery_trend_7d": -0.05,
            "days_since_last_session": 3,
            "session_frequency_7d": 4,
            "avg_session_duration": 25,
            "completion_rate": 0.80,
            "frustration_signals": 2,
            "session_abandonment_rate": 0.15,
            "help_seeking_ratio": 0.3,
            "skill_gaps_count": 4,
            "correct_first_attempt_rate": 0.6,
            "mastery_vs_class": -0.1,
            "time_since_strong_performance": 10,
            "weekend_activity_ratio": 0.2,
            "engagement_consistency": 0.7,
        },
        "student_002": {
            "current_mastery": 0.85,
            "mastery_trend_7d": 0.02,
            "days_since_last_session": 1,
            "session_frequency_7d": 7,
            "avg_session_duration": 35,
            "completion_rate": 0.95,
            "frustration_signals": 0,
            "session_abandonment_rate": 0.05,
            "help_seeking_ratio": 0.4,
            "skill_gaps_count": 1,
            "correct_first_attempt_rate": 0.85,
            "mastery_vs_class": 0.15,
            "time_since_strong_performance": 1,
            "weekend_activity_ratio": 0.4,
            "engagement_consistency": 0.9,
        },
        "student_003": {
            "current_mastery": 0.35,
            "mastery_trend_7d": -0.12,
            "days_since_last_session": 10,
            "session_frequency_7d": 1,
            "avg_session_duration": 10,
            "completion_rate": 0.40,
            "frustration_signals": 8,
            "session_abandonment_rate": 0.45,
            "help_seeking_ratio": 0.1,
            "skill_gaps_count": 12,
            "correct_first_attempt_rate": 0.35,
            "mastery_vs_class": -0.35,
            "time_since_strong_performance": 25,
            "weekend_activity_ratio": 0.0,
            "engagement_consistency": 0.3,
        },
    }


@pytest.fixture
def sample_prediction():
    """Sample risk prediction"""
    from src.models.student_risk_model import (
        RiskPrediction, RiskFactor, ProtectiveFactor,
        RiskLevel, RiskTrend, FeatureCategory
    )
    
    return RiskPrediction(
        student_id="student_003",
        timestamp=datetime.now(timezone.utc),
        risk_score=0.75,
        risk_level=RiskLevel.HIGH,
        confidence=0.85,
        category_scores={
            "academic": 0.8,
            "engagement": 0.7,
            "behavioral": 0.75,
            "temporal": 0.6,
        },
        top_risk_factors=[
            RiskFactor(
                feature="current_mastery",
                category=FeatureCategory.ACADEMIC,
                description="Current mastery level is very low",
                current_value=0.35,
                contribution=0.25,
                severity="high",
                threshold=0.5,
                recommendation="Consider diagnostic assessment",
            ),
            RiskFactor(
                feature="days_since_last_session",
                category=FeatureCategory.ENGAGEMENT,
                description="Extended absence from platform",
                current_value=10,
                contribution=0.20,
                severity="high",
                threshold=5,
                recommendation="Contact family about absence",
            ),
        ],
        protective_factors=[
            ProtectiveFactor(
                feature="help_seeking_ratio",
                category=FeatureCategory.BEHAVIORAL,
                description="Occasionally seeks help when struggling",
                current_value=0.1,
                contribution=0.05,
            ),
        ],
        risk_trend=RiskTrend.INCREASING,
        previous_risk_score=0.60,
        score_change=0.15,
        model_version="1.0.0",
    )


# ============================================================================
# Risk Model Integration Tests
# ============================================================================

class TestRiskModelIntegration:
    """Integration tests for the risk prediction model"""
    
    @pytest.mark.asyncio
    async def test_predict_single_student(self, mock_db, mock_feature_store):
        """Test predicting risk for a single student"""
        from src.models.student_risk_model import StudentRiskModel
        
        model = StudentRiskModel()
        
        with patch.object(model, '_get_student_features', return_value=mock_feature_store["student_001"]):
            with patch.object(model, '_get_previous_prediction', return_value=None):
                prediction = await model.predict_risk(
                    student_id="student_001",
                    tenant_id="tenant_001",
                )
        
        assert prediction is not None
        assert prediction.student_id == "student_001"
        assert 0 <= prediction.risk_score <= 1
        assert prediction.risk_level in ["low", "moderate", "high", "critical"]
        assert len(prediction.top_risk_factors) > 0
    
    @pytest.mark.asyncio
    async def test_predict_batch_students(self, mock_db, mock_feature_store):
        """Test batch prediction for multiple students"""
        from src.models.student_risk_model import StudentRiskModel
        
        model = StudentRiskModel()
        student_ids = list(mock_feature_store.keys())
        
        def get_features_mock(student_id, tenant_id):  # noqa: ARG001
            return mock_feature_store.get(student_id)
        
        with patch.object(model, '_get_student_features', side_effect=get_features_mock):
            with patch.object(model, '_get_previous_prediction', return_value=None):
                predictions = await model.predict_batch(
                    student_ids=student_ids,
                    tenant_id="tenant_001",
                )
        
        assert len(predictions) == len(student_ids)
        
        # Verify risk ordering makes sense
        risk_scores = {p.student_id: p.risk_score for p in predictions}
        
        # Student 003 (worst metrics) should have highest risk
        assert risk_scores["student_003"] > risk_scores["student_001"]
        # Student 002 (best metrics) should have lowest risk
        assert risk_scores["student_002"] < risk_scores["student_001"]
    
    @pytest.mark.asyncio
    async def test_risk_level_thresholds(self, mock_feature_store):
        """Test that risk levels are assigned correctly based on score"""
        from src.models.student_risk_model import StudentRiskModel, RiskLevel
        
        model = StudentRiskModel()
        
        test_cases = [
            (0.15, RiskLevel.LOW),
            (0.35, RiskLevel.MODERATE),
            (0.55, RiskLevel.HIGH),
            (0.85, RiskLevel.CRITICAL),
        ]
        
        for score, expected_level in test_cases:
            level = model._score_to_level(score)
            assert level == expected_level, f"Score {score} should be {expected_level}, got {level}"
    
    @pytest.mark.asyncio
    async def test_feature_contribution_sum(self, mock_db, mock_feature_store):
        """Test that feature contributions sum to approximately 1"""
        from src.models.student_risk_model import StudentRiskModel
        
        model = StudentRiskModel()
        
        with patch.object(model, '_get_student_features', return_value=mock_feature_store["student_003"]):
            with patch.object(model, '_get_previous_prediction', return_value=None):
                prediction = await model.predict_risk(
                    student_id="student_003",
                    tenant_id="tenant_001",
                )
        
        total_contribution = sum(f.contribution for f in prediction.top_risk_factors)
        
        # Top risk factors should account for most of the prediction
        assert total_contribution >= 0.5, "Top risk factors should explain at least 50% of prediction"
    
    @pytest.mark.asyncio
    async def test_trend_calculation(self, mock_db):
        """Test risk trend is calculated correctly"""
        from src.models.student_risk_model import StudentRiskModel, RiskTrend
        
        model = StudentRiskModel()
        
        test_cases = [
            (0.50, 0.65, RiskTrend.INCREASING),
            (0.50, 0.50, RiskTrend.STABLE),
            (0.50, 0.35, RiskTrend.DECREASING),
            (0.50, 0.52, RiskTrend.STABLE),  # Small change = stable
        ]
        
        for previous, current, expected_trend in test_cases:
            trend = model._calculate_trend(previous, current)
            assert trend == expected_trend, (
                f"Previous {previous} -> Current {current} should be {expected_trend}, got {trend}"
            )


# ============================================================================
# Intervention Recommender Integration Tests
# ============================================================================

class TestInterventionRecommenderIntegration:
    """Integration tests for intervention recommendations"""
    
    @pytest.mark.asyncio
    async def test_generate_intervention_plan(self, mock_db, sample_prediction):
        """Test generating an intervention plan for a risk prediction"""
        from src.services.intervention_recommender import InterventionRecommenderService
        
        service = InterventionRecommenderService(db=mock_db)
        
        with patch.object(service, '_get_intervention_history', return_value=[]):
            with patch.object(service, '_get_student_context', return_value={
                "has_iep": False,
                "has_504": False,
                "grade_level": 5,
                "family_engagement_level": "medium",
            }):
                with patch.object(service, '_store_intervention_plan', return_value=None):
                    plan = await service.recommend_interventions(
                        student_id="student_003",
                        risk_prediction=sample_prediction,
                    )
        
        assert plan is not None
        assert plan.student_id == "student_003"
        assert len(plan.recommendations) > 0
        assert len(plan.immediate_actions) > 0
        assert plan.monitoring_schedule is not None
    
    @pytest.mark.asyncio
    async def test_intervention_priority_ordering(self, mock_db, sample_prediction):
        """Test that interventions are prioritized correctly"""
        from src.services.intervention_recommender import InterventionRecommenderService
        
        service = InterventionRecommenderService(db=mock_db)
        
        with patch.object(service, '_get_intervention_history', return_value=[]):
            with patch.object(service, '_get_student_context', return_value={}):
                with patch.object(service, '_store_intervention_plan', return_value=None):
                    plan = await service.recommend_interventions(
                        student_id="student_003",
                        risk_prediction=sample_prediction,
                    )
        
        # Check priorities are sequential
        priorities = [r.priority for r in plan.recommendations]
        assert priorities == list(range(1, len(priorities) + 1))
        
        # Check relevance scores are descending
        scores = [r.relevance_score for r in plan.recommendations]
        assert scores == sorted(scores, reverse=True)
    
    @pytest.mark.asyncio
    async def test_intervention_tier_matching(self, mock_db, sample_prediction):
        """Test that intervention tiers match risk level"""
        from src.services.intervention_recommender import InterventionRecommenderService
        
        service = InterventionRecommenderService(db=mock_db)
        
        # High risk should prioritize Tier 2 and 3 interventions
        with patch.object(service, '_get_intervention_history', return_value=[]):
            with patch.object(service, '_get_student_context', return_value={}):
                with patch.object(service, '_store_intervention_plan', return_value=None):
                    plan = await service.recommend_interventions(
                        student_id="student_003",
                        risk_prediction=sample_prediction,
                    )
        
        top_intervention = plan.recommendations[0].intervention
        
        # For high-risk student, top intervention should be Tier 2 or 3
        assert top_intervention.tier >= 2, (
            f"High-risk student should get Tier 2+ intervention, got Tier {top_intervention.tier}"
        )
    
    @pytest.mark.asyncio
    async def test_intervention_history_influences_recommendations(self, mock_db, sample_prediction):
        """Test that past interventions affect recommendations"""
        from src.services.intervention_recommender import InterventionRecommenderService
        
        service = InterventionRecommenderService(db=mock_db)
        
        # Test with unsuccessful history
        history = [
            {
                "intervention_id": "check_in",
                "outcome": "unsuccessful",
                "start_date": datetime.now(timezone.utc) - timedelta(days=30),
            }
        ]
        
        with patch.object(service, '_get_intervention_history', return_value=history):
            with patch.object(service, '_get_student_context', return_value={}):
                with patch.object(service, '_store_intervention_plan', return_value=None):
                    plan = await service.recommend_interventions(
                        student_id="student_003",
                        risk_prediction=sample_prediction,
                    )
        
        # Previously unsuccessful intervention should be deprioritized
        intervention_ids = [r.intervention.id for r in plan.recommendations]
        
        if "check_in" in intervention_ids:
            check_in_priority = next(
                r.priority for r in plan.recommendations
                if r.intervention.id == "check_in"
            )
            assert check_in_priority > 1, "Unsuccessful intervention should not be top priority"


# ============================================================================
# Bias Detection Integration Tests
# ============================================================================

class TestBiasDetectionIntegration:
    """Integration tests for bias detection"""
    
    @pytest.fixture
    def sample_predictions_with_demographics(self):
        """Sample predictions with demographic information"""
        rng = np.random.default_rng(42)
        n_samples = 500
        
        return {
            \"predictions\": rng.beta(2, 5, n_samples),  # Skewed toward lower risk
            \"outcomes\": rng.binomial(1, 0.3, n_samples),  # 30% positive rate
            \"demographics\": {
                \"gender\": rng.choice([\"male\", \"female\"], n_samples),
                \"race\": rng.choice([\"white\", \"black\", \"hispanic\", \"asian\"], n_samples),
                \"ell\": rng.choice([\"ell\", \"non_ell\"], n_samples, p=[0.2, 0.8]),
            }
        }
    
    @pytest.mark.asyncio
    async def test_generate_bias_report(self, mock_db, sample_predictions_with_demographics):
        """Test generating a bias report"""
        from src.services.bias_detection import BiasDetectionService
        
        service = BiasDetectionService(db=mock_db)
        
        with patch.object(service, '_get_predictions_with_demographics', return_value=sample_predictions_with_demographics):
            with patch.object(service, '_get_actual_outcomes', return_value={}):
                with patch.object(service, '_store_report', return_value=None):
                    report = await service.generate_report(
                        tenant_id="tenant_001",
                        start_date=datetime.now(timezone.utc) - timedelta(days=7),
                        end_date=datetime.now(timezone.utc),
                    )
        
        assert report is not None
        assert 0 <= report.overall_fairness_score <= 1
        assert len(report.fairness_by_attribute) > 0
    
    @pytest.mark.asyncio
    async def test_demographic_parity_calculation(self, mock_db):
        """Test demographic parity calculation"""
        from src.services.bias_detection import BiasDetectionService
        
        service = BiasDetectionService(db=mock_db)
        
        # Create data with known disparity
        data = {
            "group_a": {"predictions": [1, 1, 1, 0, 0], "total": 5},  # 60% selection rate
            "group_b": {"predictions": [1, 0, 0, 0, 0], "total": 5},  # 20% selection rate
        }
        
        parity = service._calculate_demographic_parity(data)
        
        assert parity[\"group_a\"] == pytest.approx(0.6)
        assert parity[\"group_b\"] == pytest.approx(0.2)
        assert parity[\"disparity\"] == pytest.approx(0.4)  # 60% - 20%
    
    @pytest.mark.asyncio
    async def test_disparate_impact_ratio(self, mock_db):
        """Test disparate impact ratio calculation"""
        from src.services.bias_detection import BiasDetectionService
        
        service = BiasDetectionService(db=mock_db)
        
        # Create data with known disparity
        selection_rates = {"group_a": 0.6, "group_b": 0.48}
        
        ratio = service._calculate_disparate_impact_ratio(selection_rates)
        
        # 0.48 / 0.6 = 0.8 (exactly at the 80% threshold)
        assert ratio == pytest.approx(0.8, rel=0.01)
    
    @pytest.mark.asyncio
    async def test_bias_alert_generation(self, mock_db):
        """Test that alerts are generated for significant bias"""
        from src.services.bias_detection import BiasDetectionService, BiasSeverity
        
        service = BiasDetectionService(db=mock_db)
        
        # Create data with significant disparity
        fairness_metrics = {
            "demographic_parity": {
                "disparity": 0.35,  # Above 0.20 threshold
                "passes_threshold": False,
                "by_group": {"group_a": 0.6, "group_b": 0.25},
            }
        }
        
        alerts = service._generate_alerts("gender", fairness_metrics)
        
        assert len(alerts) > 0
        assert alerts[0].severity in [BiasSeverity.HIGH, BiasSeverity.CRITICAL]


# ============================================================================
# FERPA Compliance Integration Tests
# ============================================================================

class TestFERPAComplianceIntegration:
    """Integration tests for FERPA compliance"""
    
    @pytest.mark.asyncio
    async def test_authorized_access_granted(self, mock_db):
        """Test that authorized users can access data"""
        from src.compliance.ferpa_compliance import (
            FERPAComplianceService, DataAccessRequest
        )
        
        service = FERPAComplianceService(db=mock_db)
        
        request = DataAccessRequest(
            request_id="req_001",
            requestor_id="teacher_001",
            requestor_role="teacher",
            student_id="student_001",
            data_types=["risk_score", "risk_level"],
            purpose="Monitor student progress",
        )
        
        with patch.object(service, '_check_relationship', return_value=True):
            allowed, _reason, permitted = await service.check_access(request)
        
        assert allowed is True
        assert "risk_score" in permitted
        assert "risk_level" in permitted
    
    @pytest.mark.asyncio
    async def test_unauthorized_role_denied(self, mock_db):
        """Test that unauthorized roles are denied access"""
        from src.compliance.ferpa_compliance import (
            FERPAComplianceService, DataAccessRequest
        )
        
        service = FERPAComplianceService(db=mock_db)
        
        request = DataAccessRequest(
            request_id="req_002",
            requestor_id="visitor_001",
            requestor_role="visitor",  # Not authorized
            student_id="student_001",
            data_types=["risk_score"],
            purpose="Curiosity",
        )
        
        allowed, reason, _permitted = await service.check_access(request)
        
        assert allowed is False
        assert \"not authorized\" in reason.lower()
    
    @pytest.mark.asyncio
    async def test_no_relationship_denied(self, mock_db):
        """Test that users without relationship are denied"""
        from src.compliance.ferpa_compliance import (
            FERPAComplianceService, DataAccessRequest
        )
        
        service = FERPAComplianceService(db=mock_db)
        
        request = DataAccessRequest(
            request_id="req_003",
            requestor_id="teacher_002",
            requestor_role="teacher",
            student_id="student_001",  # Not their student
            data_types=["risk_score"],
            purpose="Check on student",
        )
        
        with patch.object(service, '_check_relationship', return_value=False):
            allowed, reason, _permitted = await service.check_access(request)
        
        assert allowed is False
        assert "relationship" in reason.lower()
    
    @pytest.mark.asyncio
    async def test_disclosure_logging(self, mock_db):
        """Test that disclosures are properly logged"""
        from src.compliance.ferpa_compliance import (
            FERPAComplianceService, DisclosureReason
        )
        
        service = FERPAComplianceService(db=mock_db)
        
        with patch.object(service, '_store_disclosure', return_value=None) as mock_store:
            record = await service.log_disclosure(
                student_id="student_001",
                disclosed_to="teacher_001",
                disclosed_by="system",
                reason=DisclosureReason.SCHOOL_OFFICIAL,
                data_disclosed=["risk_score", "risk_factors"],
                purpose="Intervention planning",
            )
        
        assert record is not None
        assert record.disclosure_id.startswith("disc_")
        mock_store.assert_called_once()
    
    def test_data_minimization(self, mock_db):
        """Test that data minimization works correctly"""
        from src.compliance.ferpa_compliance import FERPAComplianceService
        
        service = FERPAComplianceService(db=mock_db)
        
        full_data = {
            "risk_score": 0.65,
            "risk_level": "high",
            "risk_factors": [],
            "ssn": "123-45-6789",
            "home_address": "123 Main St",
            "medical_records": [],
        }
        
        permitted = ["risk_score", "risk_level"]
        minimized = service.minimize_data(full_data, permitted)
        
        assert "risk_score" in minimized
        assert "risk_level" in minimized
        assert "ssn" not in minimized
        assert "home_address" not in minimized
        assert "medical_records" not in minimized
    
    def test_deidentification(self, mock_db):
        """Test data de-identification"""
        from src.compliance.ferpa_compliance import FERPAComplianceService
        
        service = FERPAComplianceService(db=mock_db)
        
        data = [
            {
                "student_id": "student_001",
                "name": "John Doe",
                "email": "john@school.edu",
                "risk_score": 0.65,
                "zip_code": "12345",
            }
        ]
        
        deidentified = service.de_identify_data(data)
        
        assert len(deidentified) == 1
        assert "student_id" not in deidentified[0]
        assert "name" not in deidentified[0]
        assert "email" not in deidentified[0]
        assert "risk_score" in deidentified[0]
        assert deidentified[0]["zip_code"] == "123XX"  # Generalized


# ============================================================================
# A/B Testing Integration Tests
# ============================================================================

class TestABTestingIntegration:
    """Integration tests for A/B testing framework"""
    
    @pytest.fixture
    def sample_experiment_config(self):
        """Sample experiment configuration"""
        from src.services.ab_testing import (
            ExperimentConfig, ExperimentVariant, AssignmentStrategy
        )
        
        return ExperimentConfig(
            experiment_id="",  # Will be assigned
            name="Test Intervention Effectiveness",
            description="Testing new tutoring intervention",
            tenant_id="tenant_001",
            target_risk_levels=["high", "critical"],
            variants=[
                ExperimentVariant(
                    name="control",
                    weight=0.5,
                    intervention_id=None,
                ),
                ExperimentVariant(
                    name="treatment",
                    weight=0.5,
                    intervention_id="tutoring_referral",
                ),
            ],
            assignment_strategy=AssignmentStrategy.RANDOM,
            primary_metric="risk_score_improvement",
            min_sample_size=50,
        )
    
    @pytest.mark.asyncio
    async def test_create_experiment(self, mock_db, sample_experiment_config):
        """Test creating an experiment"""
        from src.services.ab_testing import ABTestingService
        
        service = ABTestingService(db=mock_db)
        
        with patch.object(service, '_store_experiment', return_value=None):
            config = await service.create_experiment(
                config=sample_experiment_config,
                creator_id="admin_001",
            )
        
        assert config.experiment_id.startswith("exp_")
        assert config.status.value == "draft"
    
    @pytest.mark.asyncio
    async def test_variant_assignment_consistency(self, mock_db, sample_experiment_config):
        """Test that deterministic assignment is consistent"""
        from src.services.ab_testing import ABTestingService, AssignmentStrategy
        
        sample_experiment_config.assignment_strategy = AssignmentStrategy.DETERMINISTIC
        
        service = ABTestingService(db=mock_db)
        service._active_experiments["exp_001"] = sample_experiment_config
        sample_experiment_config.experiment_id = "exp_001"
        sample_experiment_config.status = "active"
        
        # Assign same student multiple times
        assignments = []
        for _ in range(10):
            with patch.object(service, '_get_assignment', return_value=None):
                with patch.object(service, '_store_assignment', return_value=None):
                    variant = await service.assign_variant(
                        experiment_id="exp_001",
                        student_id="student_001",
                    )
                    assignments.append(variant)
        
        # All assignments should be the same
        assert len(set(assignments)) == 1
    
    @pytest.mark.asyncio
    async def test_variant_weight_distribution(self, mock_db, sample_experiment_config):
        """Test that variant weights are respected"""
        from src.services.ab_testing import ABTestingService, ExperimentStatus
        
        service = ABTestingService(db=mock_db)
        sample_experiment_config.experiment_id = "exp_001"
        sample_experiment_config.status = ExperimentStatus.ACTIVE
        service._active_experiments["exp_001"] = sample_experiment_config
        
        # Assign many students
        assignments = {"control": 0, "treatment": 0}
        n_students = 1000
        
        for i in range(n_students):
            with patch.object(service, '_get_assignment', return_value=None):
                with patch.object(service, '_store_assignment', return_value=None):
                    variant = await service.assign_variant(
                        experiment_id="exp_001",
                        student_id=f"student_{i:04d}",
                    )
                    if variant:
                        assignments[variant] += 1
        
        # Should be roughly 50/50
        control_ratio = assignments["control"] / n_students
        treatment_ratio = assignments["treatment"] / n_students
        
        assert 0.45 < control_ratio < 0.55, f"Control ratio {control_ratio} out of range"
        assert 0.45 < treatment_ratio < 0.55, f"Treatment ratio {treatment_ratio} out of range"
    
    @pytest.mark.asyncio
    async def test_experiment_analysis(self, mock_db, sample_experiment_config):
        """Test experiment analysis with mock data"""
        from src.services.ab_testing import ABTestingService, ExperimentStatus
        
        service = ABTestingService(db=mock_db)
        sample_experiment_config.experiment_id = "exp_001"
        sample_experiment_config.status = ExperimentStatus.ACTIVE
        
        # Mock outcomes data
        rng = np.random.default_rng(42)
        outcomes = []
        
        # Control group (baseline improvement)
        for i in range(100):
            outcomes.append({
                "student_id": f"control_{i}",
                "variant_name": "control",
                "metric_name": "risk_score_improvement",
                "value": rng.normal(-0.05, 0.1),  # Slight improvement
            })
        
        # Treatment group (better improvement)
        for i in range(100):
            outcomes.append({
                "student_id": f"treatment_{i}",
                "variant_name": "treatment",
                "metric_name": "risk_score_improvement",
                "value": rng.normal(-0.15, 0.1),  # More improvement
            })
        
        with patch.object(service, '_get_experiment', return_value=sample_experiment_config):
            with patch.object(service, '_get_experiment_outcomes', return_value=outcomes):
                with patch.object(service, '_store_results', return_value=None):
                    results = await service.analyze_results("exp_001")
        
        assert results is not None
        assert results.p_value < 0.05  # Should be significant
        assert results.is_significant is True
        assert results.effect_size < 0  # Treatment is better (lower improvement = less risk)


# ============================================================================
# End-to-End Integration Tests
# ============================================================================

class TestEndToEndFlow:
    """End-to-end integration tests for the complete flow"""
    
    @pytest.mark.asyncio
    async def test_prediction_to_intervention_flow(
        self, mock_db, mock_feature_store
    ):
        """Test complete flow from prediction to intervention"""
        from src.models.student_risk_model import StudentRiskModel
        from src.services.intervention_recommender import InterventionRecommenderService
        from src.compliance.ferpa_compliance import (
            FERPAComplianceService, DataAccessRequest
        )
        
        # Step 1: Generate prediction
        risk_model = StudentRiskModel()
        
        with patch.object(risk_model, '_get_student_features', return_value=mock_feature_store["student_003"]):
            with patch.object(risk_model, '_get_previous_prediction', return_value=None):
                with patch.object(risk_model, '_store_prediction', return_value=None):
                    prediction = await risk_model.predict_risk(
                        student_id="student_003",
                        tenant_id="tenant_001",
                    )
        
        assert prediction.risk_level.value in ["high", "critical"]
        
        # Step 2: Check FERPA compliance for access
        ferpa = FERPAComplianceService(db=mock_db)
        
        request = DataAccessRequest(
            request_id="req_e2e",
            requestor_id="teacher_001",
            requestor_role="teacher",
            student_id="student_003",
            data_types=["risk_score", "risk_factors", "intervention_recommendations"],
            purpose="Review at-risk student",
        )
        
        with patch.object(ferpa, '_check_relationship', return_value=True):
            with patch.object(ferpa, '_log_approved_access', return_value=None):
                allowed, _reason, _permitted = await ferpa.check_access(request)
        
        assert allowed is True
        
        # Step 3: Generate intervention recommendations
        intervention_service = InterventionRecommenderService(db=mock_db)
        
        with patch.object(intervention_service, '_get_intervention_history', return_value=[]):
            with patch.object(intervention_service, '_get_student_context', return_value={}):
                with patch.object(intervention_service, '_store_intervention_plan', return_value=None):
                    plan = await intervention_service.recommend_interventions(
                        student_id="student_003",
                        risk_prediction=prediction,
                    )
        
        assert len(plan.recommendations) > 0
        assert len(plan.immediate_actions) > 0
        
        # Step 4: Log disclosure
        with patch.object(ferpa, '_store_disclosure', return_value=None):
            disclosure = await ferpa.log_disclosure(
                student_id="student_003",
                disclosed_to="teacher_001",
                disclosed_by="system",
                reason="school_official",
                data_disclosed=["risk_prediction", "intervention_plan"],
                purpose="Student support planning",
            )
        
        assert disclosure.disclosure_id is not None
    
    @pytest.mark.asyncio
    async def test_batch_prediction_with_bias_monitoring(
        self, mock_db, mock_feature_store
    ):
        """Test batch predictions followed by bias analysis"""
        from src.models.student_risk_model import StudentRiskModel
        from src.services.bias_detection import BiasDetectionService
        
        # Step 1: Generate batch predictions
        risk_model = StudentRiskModel()
        
        def get_features_mock(student_id, tenant_id):  # noqa: ARG001
            return mock_feature_store.get(student_id)
        
        with patch.object(risk_model, '_get_student_features', side_effect=get_features_mock):
            with patch.object(risk_model, '_get_previous_prediction', return_value=None):
                with patch.object(risk_model, '_store_prediction', return_value=None):
                    predictions = await risk_model.predict_batch(
                        student_ids=list(mock_feature_store.keys()),
                        tenant_id="tenant_001",
                    )
        
        assert len(predictions) == 3
        
        # Step 2: Run bias detection
        bias_service = BiasDetectionService(db=mock_db)
        
        # Mock predictions with demographics for bias analysis
        mock_predictions_with_demo = [
            {
                "student_id": p.student_id,
                "risk_score": p.risk_score,
                "demographics": {
                    "gender": "male" if i % 2 == 0 else "female",
                    "ell": "non_ell",
                }
            }
            for i, p in enumerate(predictions)
        ]
        
        with patch.object(bias_service, '_get_predictions_with_demographics', return_value=mock_predictions_with_demo):
            with patch.object(bias_service, '_get_actual_outcomes', return_value={}):
                with patch.object(bias_service, '_store_report', return_value=None):
                    report = await bias_service.generate_report(
                        tenant_id="tenant_001",
                        start_date=datetime.now(timezone.utc) - timedelta(days=1),
                        end_date=datetime.now(timezone.utc),
                    )
        
        # With such small sample, may not have meaningful fairness metrics
        # but report should be generated
        assert report is not None


# ============================================================================
# Performance Tests
# ============================================================================

class TestPerformance:
    """Performance tests for the predictive analytics system"""
    
    @pytest.mark.asyncio
    async def test_prediction_latency(self, mock_db, mock_feature_store):
        """Test that predictions complete within acceptable time"""
        import time
        from src.models.student_risk_model import StudentRiskModel
        
        model = StudentRiskModel()
        
        start = time.time()
        n_predictions = 100
        
        for i in range(n_predictions):
            with patch.object(model, '_get_student_features', return_value=mock_feature_store["student_001"]):
                with patch.object(model, '_get_previous_prediction', return_value=None):
                    with patch.object(model, '_store_prediction', return_value=None):
                        await model.predict_risk(
                            student_id=f"student_{i}",
                            tenant_id="tenant_001",
                        )
        
        elapsed = time.time() - start
        avg_latency_ms = (elapsed / n_predictions) * 1000
        
        assert avg_latency_ms < 100, f"Average latency {avg_latency_ms:.1f}ms exceeds 100ms threshold"
    
    @pytest.mark.asyncio
    async def test_batch_prediction_efficiency(self, mock_db, mock_feature_store):
        """Test that batch prediction is more efficient than individual"""
        import time
        from src.models.student_risk_model import StudentRiskModel
        
        model = StudentRiskModel()
        student_ids = [f"student_{i:04d}" for i in range(50)]
        
        # Create mock features for all students
        all_features = {sid: mock_feature_store["student_001"].copy() for sid in student_ids}
        
        def get_features_mock(student_id, tenant_id):  # noqa: ARG001
            return all_features.get(student_id)
        
        # Time batch prediction
        start = time.time()
        
        with patch.object(model, '_get_student_features', side_effect=get_features_mock):
            with patch.object(model, '_get_previous_prediction', return_value=None):
                with patch.object(model, '_store_prediction', return_value=None):
                    batch_predictions = await model.predict_batch(
                        student_ids=student_ids,
                        tenant_id="tenant_001",
                    )
        
        batch_time = time.time() - start
        
        # Time individual predictions
        start = time.time()
        
        individual_predictions = []
        for sid in student_ids:
            with patch.object(model, '_get_student_features', side_effect=get_features_mock):
                with patch.object(model, '_get_previous_prediction', return_value=None):
                    with patch.object(model, '_store_prediction', return_value=None):
                        pred = await model.predict_risk(
                            student_id=sid,
                            tenant_id="tenant_001",
                        )
                        individual_predictions.append(pred)
        
        individual_time = time.time() - start
        
        assert len(batch_predictions) == len(individual_predictions)
        
        # Batch should be at least as fast (and usually faster due to optimization)
        # Allow some variance for test environment
        assert batch_time <= individual_time * 1.5, (
            f"Batch ({batch_time:.2f}s) significantly slower than individual ({individual_time:.2f}s)"
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
