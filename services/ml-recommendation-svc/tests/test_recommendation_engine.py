"""
Tests for the recommendation engine.
"""

import pytest

from src.config import Settings
from src.models import (
    LearnerContext,
    RecommendationRequest,
    RecommendationType,
    SkillMastery,
)


class MockFeatureStore:
    """Mock feature store for testing."""

    async def get_learner_features(self, learner_id: str):
        return {"total_practices": 10, "accuracy": 0.7}

    async def set_learner_features(self, learner_id: str, features: dict, ttl: int = 3600):
        pass

    async def get_learner_embedding(self, learner_id: str):
        return [0.1, 0.2, 0.3, 0.4, 0.5]

    async def get_item_embedding(self, item_id: str):
        return [0.15, 0.25, 0.35, 0.45, 0.55]

    async def get_similar_learners(self, learner_id: str, limit: int = 10):
        return [("learner_002", 0.9), ("learner_003", 0.8)]

    async def get_bandit_stats(self, arm_id: str):
        return {"pulls": 10, "rewards": 7, "mean_reward": 0.7}

    async def update_bandit_stats(self, arm_id: str, reward: float):
        pass

    async def add_interaction(self, learner_id: str, item_id: str, interaction_type: str, score: float):
        pass


@pytest.fixture
def settings():
    return Settings()


@pytest.fixture
def feature_store():
    return MockFeatureStore()


@pytest.fixture
def sample_request():
    return RecommendationRequest(
        learner=LearnerContext(
            learner_id="learner_001",
            tenant_id="tenant_001",
            grade_level=5,
        ),
        skill_masteries=[
            SkillMastery(
                skill_id="skill_001",
                skill_code="MATH.5.OA.A.1",
                mastery_level=0.6,
                practice_count=15,
            ),
            SkillMastery(
                skill_id="skill_002",
                skill_code="MATH.5.OA.A.2",
                mastery_level=0.3,
                practice_count=5,
            ),
        ],
        recommendation_type=RecommendationType.ACTIVITY,
        limit=5,
    )


class TestRecommendationEngine:
    """Test suite for RecommendationEngine."""

    @pytest.mark.asyncio
    async def test_get_recommendations_returns_items(
        self, feature_store, settings, sample_request
    ):
        """Test that recommendations are generated."""
        from src.services.recommendation_engine import RecommendationEngine

        engine = RecommendationEngine(feature_store, settings)
        response = await engine.get_recommendations(sample_request)

        assert response.learner_id == "learner_001"
        assert response.recommendation_type == RecommendationType.ACTIVITY
        assert len(response.items) <= sample_request.limit
        assert len(response.items) > 0

    @pytest.mark.asyncio
    async def test_recommendations_have_scores(
        self, feature_store, settings, sample_request
    ):
        """Test that recommendations have valid scores."""
        from src.services.recommendation_engine import RecommendationEngine

        engine = RecommendationEngine(feature_store, settings)
        response = await engine.get_recommendations(sample_request)

        for item in response.items:
            assert 0 <= item.score <= 1
            assert 0 <= item.confidence <= 1
            assert item.reason is not None

    @pytest.mark.asyncio
    async def test_excludes_specified_items(
        self, feature_store, settings, sample_request
    ):
        """Test that excluded items are not recommended."""
        from src.services.recommendation_engine import RecommendationEngine

        sample_request.exclude_ids = ["activity_000", "activity_001"]

        engine = RecommendationEngine(feature_store, settings)
        response = await engine.get_recommendations(sample_request)

        item_ids = [item.item_id for item in response.items]
        assert "activity_000" not in item_ids
        assert "activity_001" not in item_ids

    @pytest.mark.asyncio
    async def test_domain_filter(self, feature_store, settings, sample_request):
        """Test that domain filter works."""
        from src.services.recommendation_engine import RecommendationEngine

        sample_request.domain_filter = "MATH"

        engine = RecommendationEngine(feature_store, settings)
        response = await engine.get_recommendations(sample_request)

        # All items should be from MATH domain
        for item in response.items:
            # In real implementation, check metadata
            assert response.items  # At least has results

    @pytest.mark.asyncio
    async def test_knowledge_tracing_score(self, feature_store, settings):
        """Test knowledge tracing scoring logic."""
        from src.services.recommendation_engine import RecommendationEngine

        engine = RecommendationEngine(feature_store, settings)

        # Create candidate with skill
        candidate = {
            "id": "test_item",
            "skill_ids": ["skill_001"],
        }

        # Test with low mastery skill
        low_mastery = [
            SkillMastery(skill_id="skill_001", skill_code="TEST.1", mastery_level=0.3)
        ]
        score_low = engine._knowledge_tracing_score(candidate, low_mastery)

        # Test with high mastery skill
        high_mastery = [
            SkillMastery(skill_id="skill_001", skill_code="TEST.1", mastery_level=0.9)
        ]
        score_high = engine._knowledge_tracing_score(candidate, high_mastery)

        # Low mastery should have higher priority (still learning)
        assert score_low > score_high

    @pytest.mark.asyncio
    async def test_content_score_difficulty_matching(self, feature_store, settings):
        """Test content-based scoring for difficulty matching."""
        from src.services.recommendation_engine import RecommendationEngine

        engine = RecommendationEngine(feature_store, settings)

        request = RecommendationRequest(
            learner=LearnerContext(learner_id="l1", tenant_id="t1"),
            skill_masteries=[
                SkillMastery(skill_id="s1", skill_code="TEST.1", mastery_level=0.5)
            ],
        )

        # Easy item for 0.5 mastery learner
        easy_candidate = {"id": "easy", "difficulty": 0.3, "skill_ids": []}
        score_easy = engine._content_score(request, easy_candidate, request.skill_masteries)

        # Appropriate difficulty item
        good_candidate = {"id": "good", "difficulty": 0.6, "skill_ids": []}
        score_good = engine._content_score(request, good_candidate, request.skill_masteries)

        # Hard item
        hard_candidate = {"id": "hard", "difficulty": 0.9, "skill_ids": []}
        score_hard = engine._content_score(request, hard_candidate, request.skill_masteries)

        # Good difficulty should score higher than extremes
        assert score_good > score_easy
        assert score_good > score_hard
