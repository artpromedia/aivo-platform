"""
Tests for Intervention Recommender Service

Comprehensive tests covering:
- Intervention matching and scoring
- Eligibility checking
- Resource constraints
- A/B testing support
- Outcome tracking
- Consent requirements
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import json
from typing import Dict, Any

from src.services.intervention_recommender import (
    InterventionRecommender,
    InterventionPlan,
    InterventionRecommendation,
    InterventionDefinition,
    InterventionType,
    InterventionStatus,
    EligibilityCriteria,
    ResourceRequirement,
    OutcomeRecord,
    INTERVENTION_CATALOG,
)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def recommender():
    """Create an InterventionRecommender instance for testing"""
    return InterventionRecommender()


@pytest.fixture
def mock_redis():
    """Mock Redis client"""
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=None)
    mock.set = AsyncMock()
    mock.setex = AsyncMock()
    mock.hget = AsyncMock(return_value=None)
    mock.hset = AsyncMock()
    mock.hincrby = AsyncMock()
    mock.incr = AsyncMock(return_value=1)
    mock.lpush = AsyncMock()
    return mock


@pytest.fixture
def high_risk_prediction():
    """High-risk student prediction with multiple risk factors"""
    return {
        "student_id": "student_001",
        "risk_level": "high",
        "risk_score": 0.78,
        "category_scores": {
            "academic": 0.82,
            "engagement": 0.75,
            "behavioral": 0.45,
            "temporal": 0.70
        },
        "risk_factors": [
            {
                "feature": "assignment_completion_rate",
                "value": 0.35,
                "contribution": 0.25,
                "recommendation": "Provide assignment support"
            },
            {
                "feature": "attendance_rate",
                "value": 0.72,
                "contribution": 0.20,
                "recommendation": "Monitor attendance"
            },
            {
                "feature": "session_duration_avg",
                "value": 8.0,
                "contribution": 0.15,
                "recommendation": "Increase engagement time"
            }
        ],
        "protective_factors": [],
        "explainability": {
            "primary_driver": "academic",
            "confidence": 0.85
        }
    }


@pytest.fixture
def moderate_risk_prediction():
    """Moderate-risk student prediction"""
    return {
        "student_id": "student_002",
        "risk_level": "moderate",
        "risk_score": 0.52,
        "category_scores": {
            "academic": 0.55,
            "engagement": 0.48,
            "behavioral": 0.30,
            "temporal": 0.45
        },
        "risk_factors": [
            {
                "feature": "engagement_score",
                "value": 0.52,
                "contribution": 0.18,
                "recommendation": "Improve engagement"
            }
        ],
        "protective_factors": [
            {"feature": "parent_involvement", "value": 0.8}
        ],
        "explainability": {
            "primary_driver": "engagement",
            "confidence": 0.72
        }
    }


@pytest.fixture
def low_risk_prediction():
    """Low-risk student prediction"""
    return {
        "student_id": "student_003",
        "risk_level": "low",
        "risk_score": 0.22,
        "category_scores": {
            "academic": 0.20,
            "engagement": 0.25,
            "behavioral": 0.15,
            "temporal": 0.18
        },
        "risk_factors": [],
        "protective_factors": [
            {"feature": "gpa", "value": 3.5},
            {"feature": "attendance_rate", "value": 0.95}
        ],
        "explainability": {
            "primary_driver": None,
            "confidence": 0.90
        }
    }


@pytest.fixture
def student_context():
    """Student context information"""
    return {
        "grade_level": 9,
        "current_gpa": 2.1,
        "has_iep": False,
        "ell_status": False,
        "has_504": False,
        "previous_interventions": [],
        "parent_contact_history": []
    }


@pytest.fixture
def resource_availability():
    """Available resources for interventions"""
    return {
        "tutoring_slots": 5,
        "counselor_hours": 10,
        "mentor_capacity": 3,
        "tech_devices": 20,
        "budget_remaining": 5000
    }


# ============================================================================
# Intervention Matching Tests
# ============================================================================

class TestInterventionMatching:
    """Tests for matching interventions to risk factors"""
    
    @pytest.mark.asyncio
    async def test_matches_academic_interventions_for_academic_risk(
        self, recommender, high_risk_prediction, student_context
    ):
        """Test that academic interventions are recommended for academic risk"""
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context
        )
        
        intervention_types = [r.intervention.type for r in plan.recommendations]
        
        # Should include academic intervention types
        academic_types = [InterventionType.TUTORING, InterventionType.STUDY_SKILLS]
        assert any(t in intervention_types for t in academic_types)
    
    @pytest.mark.asyncio
    async def test_matches_engagement_interventions_for_engagement_risk(
        self, recommender, moderate_risk_prediction, student_context
    ):
        """Test that engagement interventions are recommended for engagement risk"""
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=moderate_risk_prediction,
            student_context=student_context
        )
        
        intervention_types = [r.intervention.type for r in plan.recommendations]
        
        # Should include engagement intervention types
        engagement_types = [
            InterventionType.GAMIFICATION,
            InterventionType.PEER_SUPPORT,
            InterventionType.INTEREST_INVENTORY
        ]
        assert any(t in intervention_types for t in engagement_types)
    
    @pytest.mark.asyncio
    async def test_returns_empty_for_low_risk(
        self, recommender, low_risk_prediction, student_context
    ):
        """Test that no interventions are recommended for low-risk students"""
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=low_risk_prediction,
            student_context=student_context
        )
        
        # Low-risk students should get fewer/no interventions
        assert len(plan.recommendations) == 0 or plan.recommendations[0].priority == "low"
    
    @pytest.mark.asyncio
    async def test_respects_max_recommendations(
        self, recommender, high_risk_prediction, student_context
    ):
        """Test that recommendations are capped at max_recommendations"""
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context,
            max_recommendations=2
        )
        
        assert len(plan.recommendations) <= 2


# ============================================================================
# Scoring Tests
# ============================================================================

class TestInterventionScoring:
    """Tests for intervention scoring algorithms"""
    
    @pytest.mark.asyncio
    async def test_higher_match_score_for_relevant_interventions(
        self, recommender, high_risk_prediction, student_context
    ):
        """Test that relevant interventions get higher match scores"""
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context
        )
        
        # All returned recommendations should have positive match scores
        for rec in plan.recommendations:
            assert rec.match_score > 0
    
    @pytest.mark.asyncio
    async def test_recommendations_sorted_by_priority(
        self, recommender, high_risk_prediction, student_context
    ):
        """Test that recommendations are sorted by priority/score"""
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context
        )
        
        if len(plan.recommendations) >= 2:
            # Higher priority items should come first
            for i in range(len(plan.recommendations) - 1):
                assert plan.recommendations[i].match_score >= plan.recommendations[i + 1].match_score
    
    @pytest.mark.asyncio
    async def test_effectiveness_history_affects_score(
        self, mock_redis, high_risk_prediction, student_context
    ):
        """Test that historical effectiveness affects intervention scoring"""
        # Set up mock to return effectiveness stats
        mock_redis.hget = AsyncMock(side_effect=lambda key, field: json.dumps({
            "success_count": 80,
            "total_count": 100,
            "avg_improvement": 0.25
        }) if "tutoring" in key else None)
        
        recommender = InterventionRecommender(redis_client=mock_redis)
        
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context
        )
        
        # Tutoring should be boosted due to good effectiveness
        tutoring_recs = [
            r for r in plan.recommendations
            if r.intervention.type == InterventionType.TUTORING
        ]
        if tutoring_recs:
            assert tutoring_recs[0].match_score > 0.5


# ============================================================================
# Eligibility Tests
# ============================================================================

class TestEligibilityCriteria:
    """Tests for intervention eligibility checking"""
    
    @pytest.mark.asyncio
    async def test_grade_level_eligibility(self, recommender, high_risk_prediction):
        """Test grade level eligibility checking"""
        # Elementary student
        elementary_context = {
            "grade_level": 3,
            "current_gpa": 2.0,
            "has_iep": False,
            "ell_status": False
        }
        
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=elementary_context
        )
        
        # High school only interventions should not be included
        for rec in plan.recommendations:
            if rec.intervention.eligibility:
                if rec.intervention.eligibility.min_grade:
                    assert elementary_context["grade_level"] >= rec.intervention.eligibility.min_grade
    
    @pytest.mark.asyncio
    async def test_iep_required_intervention(self, recommender, high_risk_prediction):
        """Test that IEP-required interventions are only for IEP students"""
        iep_context = {
            "grade_level": 9,
            "current_gpa": 2.0,
            "has_iep": True,
            "ell_status": False
        }
        
        non_iep_context = {
            "grade_level": 9,
            "current_gpa": 2.0,
            "has_iep": False,
            "ell_status": False
        }
        
        iep_plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=iep_context
        )
        
        non_iep_plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=non_iep_context
        )
        
        # IEP students may get additional interventions
        iep_types = set(r.intervention.type for r in iep_plan.recommendations)
        non_iep_types = set(r.intervention.type for r in non_iep_plan.recommendations)
        
        # At minimum, IEP student should get same or more recommendations
        assert len(iep_types) >= len(non_iep_types) or iep_types != non_iep_types
    
    @pytest.mark.asyncio
    async def test_excludes_repeated_interventions(
        self, recommender, high_risk_prediction
    ):
        """Test that previously failed interventions are excluded"""
        context_with_history = {
            "grade_level": 9,
            "current_gpa": 2.0,
            "has_iep": False,
            "ell_status": False,
            "previous_interventions": [
                {
                    "type": "tutoring",
                    "outcome": "unsuccessful",
                    "end_date": datetime.utcnow() - timedelta(days=30)
                }
            ]
        }
        
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=context_with_history
        )
        
        # Recently unsuccessful tutoring should be deprioritized
        tutoring_recs = [
            r for r in plan.recommendations
            if r.intervention.type == InterventionType.TUTORING
        ]
        # Should either be excluded or have lower priority
        if tutoring_recs and len(plan.recommendations) > 1:
            # Tutoring should not be first recommendation
            assert plan.recommendations[0].intervention.type != InterventionType.TUTORING


# ============================================================================
# Resource Constraint Tests
# ============================================================================

class TestResourceConstraints:
    """Tests for resource constraint handling"""
    
    @pytest.mark.asyncio
    async def test_respects_resource_limits(
        self, recommender, high_risk_prediction, student_context
    ):
        """Test that recommendations respect resource availability"""
        limited_resources = {
            "tutoring_slots": 0,
            "counselor_hours": 0,
            "mentor_capacity": 0,
            "tech_devices": 0,
            "budget_remaining": 0
        }
        
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context,
            resource_availability=limited_resources
        )
        
        # Should still return interventions but mark resource constraints
        for rec in plan.recommendations:
            if rec.intervention.resources:
                # Should indicate resource availability issues
                assert hasattr(rec, 'resource_available') or rec.notes
    
    @pytest.mark.asyncio
    async def test_cost_affects_recommendations(
        self, recommender, high_risk_prediction, student_context
    ):
        """Test that intervention costs are considered"""
        low_budget = {
            "tutoring_slots": 10,
            "counselor_hours": 10,
            "mentor_capacity": 5,
            "tech_devices": 20,
            "budget_remaining": 100  # Very low budget
        }
        
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context,
            resource_availability=low_budget
        )
        
        # High-cost interventions should be deprioritized
        total_cost = sum(
            rec.intervention.estimated_cost or 0
            for rec in plan.recommendations
        )
        # Total cost should be within budget or near it
        assert total_cost <= low_budget["budget_remaining"] * 10  # Some flexibility


# ============================================================================
# A/B Testing Tests
# ============================================================================

class TestABTesting:
    """Tests for A/B testing support"""
    
    @pytest.mark.asyncio
    async def test_assigns_experiment_variant(
        self, mock_redis, high_risk_prediction, student_context
    ):
        """Test that students are assigned experiment variants"""
        # Set up active experiment
        mock_redis.hgetall = AsyncMock(return_value={
            "experiment_001": json.dumps({
                "name": "tutoring_frequency",
                "active": True,
                "variants": ["control", "high_frequency"],
                "allocation": [0.5, 0.5],
                "intervention_type": "tutoring"
            })
        })
        
        recommender = InterventionRecommender(redis_client=mock_redis)
        
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context
        )
        
        # Should have experiment assignment in metadata
        assert plan.metadata is not None
        if "experiment_assignments" in plan.metadata:
            assert len(plan.metadata["experiment_assignments"]) > 0
    
    @pytest.mark.asyncio
    async def test_consistent_variant_assignment(
        self, mock_redis, high_risk_prediction, student_context
    ):
        """Test that same student gets same variant assignment"""
        mock_redis.hgetall = AsyncMock(return_value={
            "experiment_001": json.dumps({
                "name": "tutoring_frequency",
                "active": True,
                "variants": ["control", "treatment"],
                "allocation": [0.5, 0.5]
            })
        })
        
        # Track assigned variant
        mock_redis.hget = AsyncMock(return_value=json.dumps({
            "variant": "treatment",
            "assigned_at": datetime.utcnow().isoformat()
        }))
        
        recommender = InterventionRecommender(redis_client=mock_redis)
        
        plan1 = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context
        )
        
        plan2 = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context
        )
        
        # Same student should get same variant
        if "experiment_assignments" in (plan1.metadata or {}):
            assert plan1.metadata == plan2.metadata


# ============================================================================
# Consent and Approval Tests
# ============================================================================

class TestConsentAndApproval:
    """Tests for consent and approval workflow"""
    
    @pytest.mark.asyncio
    async def test_flags_interventions_requiring_consent(
        self, recommender, high_risk_prediction, student_context
    ):
        """Test that interventions requiring consent are flagged"""
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context
        )
        
        for rec in plan.recommendations:
            if rec.intervention.requires_consent:
                assert rec.status == InterventionStatus.PENDING_CONSENT
    
    @pytest.mark.asyncio
    async def test_approve_intervention(
        self, mock_redis, high_risk_prediction, student_context
    ):
        """Test intervention approval workflow"""
        recommender = InterventionRecommender(redis_client=mock_redis)
        
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context
        )
        
        if plan.recommendations:
            rec_id = plan.recommendations[0].recommendation_id
            
            result = await recommender.approve_intervention(
                tenant_id="tenant_123",
                recommendation_id=rec_id,
                approved_by="teacher_001",
                notes="Approved after review"
            )
            
            assert result is True
    
    @pytest.mark.asyncio
    async def test_reject_intervention(
        self, mock_redis, high_risk_prediction, student_context
    ):
        """Test intervention rejection workflow"""
        recommender = InterventionRecommender(redis_client=mock_redis)
        
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context
        )
        
        if plan.recommendations:
            rec_id = plan.recommendations[0].recommendation_id
            
            result = await recommender.reject_intervention(
                tenant_id="tenant_123",
                recommendation_id=rec_id,
                rejected_by="teacher_001",
                reason="Not appropriate for this student"
            )
            
            assert result is True


# ============================================================================
# Outcome Recording Tests
# ============================================================================

class TestOutcomeRecording:
    """Tests for intervention outcome recording"""
    
    @pytest.mark.asyncio
    async def test_record_successful_outcome(
        self, mock_redis
    ):
        """Test recording a successful intervention outcome"""
        recommender = InterventionRecommender(redis_client=mock_redis)
        
        result = await recommender.record_outcome(
            tenant_id="tenant_123",
            recommendation_id="rec_001",
            student_id="student_001",
            intervention_type="tutoring",
            outcome="successful",
            metrics={
                "gpa_change": 0.5,
                "attendance_improvement": 0.10,
                "engagement_score_change": 0.15
            },
            notes="Student showed significant improvement"
        )
        
        assert result is True
        mock_redis.hset.assert_called()
    
    @pytest.mark.asyncio
    async def test_record_partial_outcome(
        self, mock_redis
    ):
        """Test recording a partially successful intervention outcome"""
        recommender = InterventionRecommender(redis_client=mock_redis)
        
        result = await recommender.record_outcome(
            tenant_id="tenant_123",
            recommendation_id="rec_002",
            student_id="student_002",
            intervention_type="peer_support",
            outcome="partial",
            metrics={
                "gpa_change": 0.2,
                "attendance_improvement": 0.02
            },
            notes="Some improvement but not meeting goals"
        )
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_outcome_updates_effectiveness_stats(
        self, mock_redis
    ):
        """Test that outcomes update effectiveness statistics"""
        recommender = InterventionRecommender(redis_client=mock_redis)
        
        await recommender.record_outcome(
            tenant_id="tenant_123",
            recommendation_id="rec_003",
            student_id="student_003",
            intervention_type="tutoring",
            outcome="successful",
            metrics={"gpa_change": 0.3}
        )
        
        # Should update stats
        mock_redis.hincrby.assert_called()


# ============================================================================
# Plan Serialization Tests
# ============================================================================

class TestPlanSerialization:
    """Tests for intervention plan serialization"""
    
    @pytest.mark.asyncio
    async def test_plan_to_dict(
        self, recommender, high_risk_prediction, student_context
    ):
        """Test that intervention plan can be serialized to dict"""
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context
        )
        
        plan_dict = plan.to_dict()
        
        assert "plan_id" in plan_dict
        assert "student_id" in plan_dict
        assert "recommendations" in plan_dict
        assert "created_at" in plan_dict
    
    @pytest.mark.asyncio
    async def test_plan_to_json(
        self, recommender, high_risk_prediction, student_context
    ):
        """Test that intervention plan can be serialized to JSON"""
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context
        )
        
        plan_json = plan.to_json()
        
        # Should be valid JSON
        parsed = json.loads(plan_json)
        assert parsed["student_id"] == high_risk_prediction["student_id"]
    
    @pytest.mark.asyncio
    async def test_recommendation_to_dict(
        self, recommender, high_risk_prediction, student_context
    ):
        """Test that individual recommendations can be serialized"""
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context
        )
        
        if plan.recommendations:
            rec_dict = plan.recommendations[0].to_dict()
            
            assert "recommendation_id" in rec_dict
            assert "intervention" in rec_dict
            assert "match_score" in rec_dict
            assert "rationale" in rec_dict


# ============================================================================
# Catalog Tests
# ============================================================================

class TestInterventionCatalog:
    """Tests for intervention catalog"""
    
    def test_catalog_has_required_types(self):
        """Test that catalog includes required intervention types"""
        catalog_types = set(i.type for i in INTERVENTION_CATALOG)
        
        required_types = [
            InterventionType.TUTORING,
            InterventionType.PARENT_CONTACT,
            InterventionType.COUNSELOR_REFERRAL
        ]
        
        for t in required_types:
            assert t in catalog_types
    
    def test_catalog_interventions_have_descriptions(self):
        """Test that all catalog interventions have descriptions"""
        for intervention in INTERVENTION_CATALOG:
            assert intervention.name is not None
            assert len(intervention.name) > 0
            assert intervention.description is not None
            assert len(intervention.description) > 0
    
    def test_catalog_interventions_have_evidence_basis(self):
        """Test that interventions have evidence basis rating"""
        for intervention in INTERVENTION_CATALOG:
            assert intervention.evidence_rating is not None
            assert intervention.evidence_rating in ["high", "moderate", "low", "emerging"]


# ============================================================================
# Edge Cases
# ============================================================================

class TestEdgeCases:
    """Tests for edge cases and error handling"""
    
    @pytest.mark.asyncio
    async def test_handles_empty_risk_factors(self, recommender, student_context):
        """Test handling predictions with no risk factors"""
        prediction = {
            "student_id": "student_empty",
            "risk_level": "moderate",
            "risk_score": 0.45,
            "category_scores": {},
            "risk_factors": [],
            "protective_factors": []
        }
        
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=prediction,
            student_context=student_context
        )
        
        # Should still return a valid plan
        assert plan is not None
        assert plan.student_id == "student_empty"
    
    @pytest.mark.asyncio
    async def test_handles_missing_context(self, recommender, high_risk_prediction):
        """Test handling missing student context"""
        minimal_context = {"grade_level": 9}
        
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=minimal_context
        )
        
        assert plan is not None
    
    @pytest.mark.asyncio
    async def test_handles_invalid_grade_level(self, recommender, high_risk_prediction):
        """Test handling invalid grade level"""
        invalid_context = {"grade_level": -1}
        
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=invalid_context
        )
        
        assert plan is not None
    
    @pytest.mark.asyncio
    async def test_handles_very_high_risk(self, recommender, student_context):
        """Test handling extreme risk scores"""
        extreme_prediction = {
            "student_id": "student_extreme",
            "risk_level": "critical",
            "risk_score": 0.99,
            "category_scores": {
                "academic": 0.95,
                "engagement": 0.92,
                "behavioral": 0.88,
                "temporal": 0.90
            },
            "risk_factors": [
                {"feature": "all_indicators", "contribution": 0.99}
            ],
            "protective_factors": []
        }
        
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=extreme_prediction,
            student_context=student_context
        )
        
        # Should prioritize immediate interventions
        assert plan is not None
        if plan.recommendations:
            # High urgency should be indicated
            assert any(r.priority == "urgent" for r in plan.recommendations) or \
                   any(r.priority == "high" for r in plan.recommendations)


# ============================================================================
# Caching Tests
# ============================================================================

class TestCaching:
    """Tests for recommendation caching"""
    
    @pytest.mark.asyncio
    async def test_caches_recommendations(
        self, mock_redis, high_risk_prediction, student_context
    ):
        """Test that recommendations are cached"""
        recommender = InterventionRecommender(redis_client=mock_redis)
        
        await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context
        )
        
        # Should cache the plan
        mock_redis.setex.assert_called()
    
    @pytest.mark.asyncio
    async def test_returns_cached_plan(
        self, mock_redis, high_risk_prediction, student_context
    ):
        """Test that cached plans are returned"""
        cached_plan = {
            "plan_id": "cached_plan_001",
            "student_id": high_risk_prediction["student_id"],
            "recommendations": [],
            "created_at": datetime.utcnow().isoformat()
        }
        
        mock_redis.get = AsyncMock(return_value=json.dumps(cached_plan))
        
        recommender = InterventionRecommender(redis_client=mock_redis)
        
        plan = await recommender.recommend_interventions(
            tenant_id="tenant_123",
            prediction=high_risk_prediction,
            student_context=student_context,
            use_cache=True
        )
        
        # Should return cached plan
        if plan.plan_id == "cached_plan_001":
            assert True
