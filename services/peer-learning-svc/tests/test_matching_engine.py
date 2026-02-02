"""Tests for MatchingEngine service."""
import pytest
import numpy as np
from typing import List, Dict

from app.services.matching_engine import (
    MatchingEngine,
    MatchingConstraints,
    MatchResult,
)


class TestMatchResult:
    """Tests for MatchResult dataclass."""

    def test_creation(self):
        """Test creating a match result."""
        result = MatchResult(
            learner_id="user_001",
            matched_peer_id="user_002",
            score=0.85,
            match_type="study_partner",
            reasons=["Similar knowledge levels"],
        )
        
        assert result.learner_id == "user_001"
        assert result.matched_peer_id == "user_002"
        assert result.score == 0.85
        assert result.match_type == "study_partner"
        assert "Similar knowledge levels" in result.reasons

    def test_default_reasons(self):
        """Test match result with default empty reasons."""
        result = MatchResult(
            learner_id="user_001",
            matched_peer_id="user_002",
            score=0.5,
            match_type="tutor",
        )
        
        assert result.reasons == []


class TestMatchingConstraints:
    """Tests for MatchingConstraints dataclass."""

    def test_default_values(self):
        """Test default constraint values."""
        constraints = MatchingConstraints()
        
        assert constraints.min_compatibility == 0.3
        assert constraints.max_skill_gap == 0.5
        assert constraints.require_availability_overlap is True
        assert constraints.min_availability_slots == 1
        assert constraints.excluded_pairs == []

    def test_custom_values(self):
        """Test custom constraint values."""
        constraints = MatchingConstraints(
            min_compatibility=0.5,
            max_skill_gap=0.3,
            require_availability_overlap=False,
            min_availability_slots=2,
            excluded_pairs=[("user_001", "user_002")],
        )
        
        assert constraints.min_compatibility == 0.5
        assert constraints.max_skill_gap == 0.3
        assert constraints.require_availability_overlap is False
        assert constraints.min_availability_slots == 2
        assert len(constraints.excluded_pairs) == 1


class TestMatchingEngine:
    """Tests for MatchingEngine class."""

    @pytest.fixture
    def engine(self):
        """Create a matching engine instance."""
        return MatchingEngine()

    @pytest.fixture
    def sample_profiles(self) -> List[Dict]:
        """Create sample learner profiles."""
        return [
            {
                "learner_id": "user_001",
                "knowledge_state": {"math": 0.8, "science": 0.6, "english": 0.7},
                "learning_style": "visual",
                "availability": ["morning", "afternoon"],
            },
            {
                "learner_id": "user_002",
                "knowledge_state": {"math": 0.7, "science": 0.7, "english": 0.6},
                "learning_style": "visual",
                "availability": ["afternoon", "evening"],
            },
            {
                "learner_id": "user_003",
                "knowledge_state": {"math": 0.4, "science": 0.5, "english": 0.8},
                "learning_style": "auditory",
                "availability": ["morning", "evening"],
            },
            {
                "learner_id": "user_004",
                "knowledge_state": {"math": 0.9, "science": 0.8, "english": 0.9},
                "learning_style": "reading",
                "availability": ["afternoon"],
            },
            {
                "learner_id": "user_005",
                "knowledge_state": {"math": 0.5, "science": 0.4, "english": 0.5},
                "learning_style": "kinesthetic",
                "availability": ["morning", "afternoon", "evening"],
            },
            {
                "learner_id": "user_006",
                "knowledge_state": {"math": 0.6, "science": 0.6, "english": 0.6},
                "learning_style": "visual",
                "availability": ["morning"],
            },
        ]

    def test_init(self, engine):
        """Test engine initialization."""
        assert engine.default_constraints is not None
        assert engine.waiting_pool == []

    def test_init_with_custom_constraints(self):
        """Test engine with custom constraints."""
        constraints = MatchingConstraints(min_compatibility=0.6)
        engine = MatchingEngine(default_constraints=constraints)
        
        assert engine.default_constraints.min_compatibility == 0.6

    def test_match_pairs_empty(self, engine):
        """Test matching with empty profiles list."""
        result = engine.match_pairs([])
        assert result == []

    def test_match_pairs_single_profile(self, engine, sample_profiles):
        """Test matching with single profile."""
        result = engine.match_pairs([sample_profiles[0]])
        assert result == []

    def test_match_pairs_two_profiles(self, engine, sample_profiles):
        """Test matching two profiles."""
        profiles = sample_profiles[:2]
        pairs = engine.match_pairs(profiles)
        
        assert len(pairs) == 1
        assert pairs[0][0] in ["user_001", "user_002"]
        assert pairs[0][1] in ["user_001", "user_002"]
        assert pairs[0][0] != pairs[0][1]
        assert 0 <= pairs[0][2] <= 1  # Score in valid range

    def test_match_pairs_multiple_profiles(self, engine, sample_profiles):
        """Test matching multiple profiles."""
        pairs = engine.match_pairs(sample_profiles)
        
        # Should have 3 pairs for 6 learners
        assert len(pairs) == 3
        
        # Each learner should appear exactly once
        matched_ids = set()
        for p1, p2, _ in pairs:
            assert p1 not in matched_ids
            assert p2 not in matched_ids
            matched_ids.add(p1)
            matched_ids.add(p2)

    def test_match_pairs_odd_number(self, engine, sample_profiles):
        """Test matching with odd number of profiles."""
        profiles = sample_profiles[:5]  # 5 profiles
        pairs = engine.match_pairs(profiles)
        
        # Should have 2 pairs, one learner unmatched
        assert len(pairs) == 2

    def test_match_pairs_with_similarity_matrix(self, engine, sample_profiles):
        """Test matching with provided similarity matrix."""
        profiles = sample_profiles[:4]
        n = len(profiles)
        
        # Create custom similarity matrix
        similarity = [[0.0] * n for _ in range(n)]
        similarity[0][1] = similarity[1][0] = 0.9
        similarity[0][2] = similarity[2][0] = 0.3
        similarity[0][3] = similarity[3][0] = 0.5
        similarity[1][2] = similarity[2][1] = 0.4
        similarity[1][3] = similarity[3][1] = 0.6
        similarity[2][3] = similarity[3][2] = 0.8
        
        pairs = engine.match_pairs(profiles, similarity_matrix=similarity)
        
        assert len(pairs) == 2

    def test_match_pairs_with_constraints(self, engine, sample_profiles):
        """Test matching with custom constraints."""
        constraints = MatchingConstraints(
            min_compatibility=0.7,
            require_availability_overlap=True,
        )
        
        pairs = engine.match_pairs(sample_profiles, constraints=constraints)
        
        # Pairs should be valid
        for p1, p2, score in pairs:
            assert p1 != p2

    def test_match_pairs_with_excluded_pairs(self, engine, sample_profiles):
        """Test matching with excluded pairs."""
        constraints = MatchingConstraints(
            excluded_pairs=[("user_001", "user_002"), ("user_003", "user_004")],
        )
        
        pairs = engine.match_pairs(sample_profiles, constraints=constraints)
        
        # Excluded pairs should not appear
        for p1, p2, _ in pairs:
            assert not (p1 == "user_001" and p2 == "user_002")
            assert not (p1 == "user_002" and p2 == "user_001")
            assert not (p1 == "user_003" and p2 == "user_004")
            assert not (p1 == "user_004" and p2 == "user_003")


class TestFormGroupsCSP:
    """Tests for form_groups_csp method."""

    @pytest.fixture
    def engine(self):
        return MatchingEngine()

    @pytest.fixture
    def profiles(self) -> List[Dict]:
        return [
            {"learner_id": f"user_{i:03d}", "knowledge_state": {"math": i * 0.1}, "learning_style": ["visual", "auditory", "kinesthetic", "reading"][i % 4], "availability": ["morning"]}
            for i in range(12)
        ]

    def test_empty_profiles(self, engine):
        """Test with empty profiles list."""
        groups = engine.form_groups_csp([], {})
        assert groups == []

    def test_basic_grouping(self, engine, profiles):
        """Test basic group formation."""
        constraints = {"group_size": 4}
        groups = engine.form_groups_csp(profiles, constraints)
        
        assert len(groups) == 3
        # All learners should be assigned
        all_members = [m for g in groups for m in g]
        assert len(all_members) == 12

    def test_grouping_with_balance(self, engine, profiles):
        """Test grouping with skill balance."""
        constraints = {"group_size": 4, "balance_skills": True}
        groups = engine.form_groups_csp(profiles, constraints)
        
        assert len(groups) == 3

    def test_grouping_without_balance(self, engine, profiles):
        """Test grouping without skill balance."""
        constraints = {"group_size": 4, "balance_skills": False}
        groups = engine.form_groups_csp(profiles, constraints)
        
        assert len(groups) == 3

    def test_grouping_with_diversity(self, engine, profiles):
        """Test grouping with style diversity."""
        constraints = {"group_size": 4, "diverse_styles": True}
        groups = engine.form_groups_csp(profiles, constraints)
        
        assert len(groups) == 3

    def test_size_constraints(self, engine, profiles):
        """Test group size constraints."""
        constraints = {"group_size": 3, "min_size": 2, "max_size": 4}
        groups = engine.form_groups_csp(profiles, constraints)
        
        for group in groups:
            assert 2 <= len(group) <= 4

    def test_small_group(self, engine):
        """Test with small number of profiles."""
        profiles = [
            {"learner_id": "user_001", "knowledge_state": {"math": 0.5}},
            {"learner_id": "user_002", "knowledge_state": {"math": 0.6}},
        ]
        constraints = {"group_size": 4}
        groups = engine.form_groups_csp(profiles, constraints)
        
        assert len(groups) == 1
        assert len(groups[0]) == 2


class TestOnlineMatch:
    """Tests for online_match method."""

    @pytest.fixture
    def engine(self):
        return MatchingEngine()

    @pytest.fixture
    def waiting_learner(self):
        return {
            "learner_id": "waiting_001",
            "knowledge_state": {"math": 0.7, "science": 0.6},
            "learning_style": "visual",
            "availability": ["morning", "afternoon"],
        }

    @pytest.fixture
    def new_learner(self):
        return {
            "learner_id": "new_001",
            "knowledge_state": {"math": 0.7, "science": 0.7},
            "learning_style": "visual",
            "availability": ["afternoon", "evening"],
        }

    def test_match_with_empty_pool(self, engine, new_learner):
        """Test online match with empty pool adds to waiting."""
        result = engine.online_match(new_learner)
        
        assert result is None
        assert len(engine.waiting_pool) == 1
        assert engine.waiting_pool[0]["learner_id"] == "new_001"

    def test_match_with_external_pool(self, engine, waiting_learner, new_learner):
        """Test online match with external pool."""
        pool = [waiting_learner]
        result = engine.online_match(new_learner, waiting_pool=pool)
        
        assert result is not None
        assert result.learner_id == "new_001"
        assert result.matched_peer_id == "waiting_001"
        assert result.match_type == "online"
        assert len(pool) == 0  # Matched learner removed

    def test_match_with_internal_pool(self, engine, waiting_learner, new_learner):
        """Test online match with internal pool."""
        engine.waiting_pool.append(waiting_learner)
        
        result = engine.online_match(new_learner)
        
        assert result is not None
        assert result.matched_peer_id == "waiting_001"
        assert len(engine.waiting_pool) == 0

    def test_no_suitable_match(self, engine):
        """Test when no suitable match exists."""
        # Learner with very different profile
        waiting = {
            "learner_id": "waiting_001",
            "knowledge_state": {"math": 0.1},
            "availability": ["morning"],
        }
        new_learner = {
            "learner_id": "new_001",
            "knowledge_state": {"art": 0.9},
            "availability": ["evening"],
        }
        
        constraints = MatchingConstraints(min_compatibility=0.9)
        engine.waiting_pool.append(waiting)
        
        result = engine.online_match(new_learner, constraints=constraints)
        
        assert result is None
        assert len(engine.waiting_pool) == 2  # Both in pool

    def test_match_with_excluded_pair(self, engine, waiting_learner, new_learner):
        """Test online match skips excluded pairs."""
        constraints = MatchingConstraints(
            excluded_pairs=[("new_001", "waiting_001")]
        )
        pool = [waiting_learner]
        
        result = engine.online_match(new_learner, waiting_pool=pool, constraints=constraints)
        
        assert result is None


class TestMatchLearner:
    """Tests for match_learner method."""

    @pytest.fixture
    def engine(self):
        return MatchingEngine()

    @pytest.fixture
    def learner(self):
        return {
            "learner_id": "learner_001",
            "knowledge_state": {"math": 0.7, "science": 0.6},
            "learning_style": "visual",
            "availability": ["morning", "afternoon"],
        }

    @pytest.fixture
    def peers(self):
        return [
            {
                "learner_id": "peer_001",
                "knowledge_state": {"math": 0.8, "science": 0.7},
                "learning_style": "visual",
                "availability": ["morning", "afternoon"],
            },
            {
                "learner_id": "peer_002",
                "knowledge_state": {"math": 0.5, "science": 0.4},
                "learning_style": "auditory",
                "availability": ["evening"],
            },
        ]

    def test_match_empty_peers(self, engine, learner):
        """Test matching with no available peers."""
        result = engine.match_learner(learner, [])
        assert result is None

    def test_match_study_partner(self, engine, learner, peers):
        """Test matching for study partner."""
        result = engine.match_learner(learner, peers, match_type="study_partner")
        
        assert result is not None
        assert result.learner_id == "learner_001"
        assert result.matched_peer_id in ["peer_001", "peer_002"]
        assert result.match_type == "study_partner"

    def test_match_tutor(self, engine, learner, peers):
        """Test matching for tutor."""
        result = engine.match_learner(learner, peers, match_type="tutor")
        
        assert result is not None
        assert result.match_type == "tutor"

    def test_match_discussion(self, engine, learner, peers):
        """Test matching for discussion partner."""
        result = engine.match_learner(learner, peers, match_type="discussion")
        
        assert result is not None
        assert result.match_type == "discussion"

    def test_skip_self(self, engine, learner, peers):
        """Test that learner doesn't match with self."""
        peers_with_self = peers + [learner]
        result = engine.match_learner(learner, peers_with_self)
        
        assert result is not None
        assert result.matched_peer_id != learner["learner_id"]

    def test_skip_excluded(self, engine, learner, peers):
        """Test that excluded pairs are skipped."""
        constraints = MatchingConstraints(
            excluded_pairs=[("learner_001", "peer_001")]
        )
        result = engine.match_learner(learner, peers, constraints=constraints)
        
        assert result is not None
        assert result.matched_peer_id == "peer_002"

    def test_min_compatibility(self, engine, learner):
        """Test minimum compatibility threshold."""
        poor_peer = {
            "learner_id": "poor_peer",
            "knowledge_state": {"art": 0.1},
            "availability": [],
        }
        
        constraints = MatchingConstraints(min_compatibility=0.9)
        result = engine.match_learner(learner, [poor_peer], constraints=constraints)
        
        assert result is None


class TestGetAvailablePeers:
    """Tests for get_available_peers method."""

    @pytest.fixture
    def engine(self):
        return MatchingEngine()

    @pytest.fixture
    def learner(self):
        return {"learner_id": "learner_001"}

    @pytest.fixture
    def all_peers(self):
        return [
            {
                "learner_id": "peer_001",
                "knowledge_state": {"math": 0.8},
                "learning_style": "visual",
                "availability": ["morning"],
            },
            {
                "learner_id": "peer_002",
                "knowledge_state": {"math": 0.5},
                "learning_style": "auditory",
                "availability": ["afternoon"],
            },
            {
                "learner_id": "peer_003",
                "knowledge_state": {"math": 0.3},
                "learning_style": "visual",
                "availability": ["morning", "afternoon"],
            },
            {
                "learner_id": "learner_001",  # Self
                "knowledge_state": {"math": 0.6},
                "learning_style": "visual",
                "availability": ["morning"],
            },
        ]

    def test_get_all_peers(self, engine, learner, all_peers):
        """Test getting all available peers (excluding self)."""
        available = engine.get_available_peers(learner, all_peers)
        
        assert len(available) == 3
        assert all(p["learner_id"] != "learner_001" for p in available)

    def test_filter_by_min_knowledge(self, engine, learner, all_peers):
        """Test filtering by minimum knowledge."""
        criteria = {"min_knowledge": 0.5}
        available = engine.get_available_peers(learner, all_peers, criteria)
        
        assert len(available) == 2
        assert all(p["learner_id"] in ["peer_001", "peer_002"] for p in available)

    def test_filter_by_max_knowledge(self, engine, learner, all_peers):
        """Test filtering by maximum knowledge."""
        criteria = {"max_knowledge": 0.4}
        available = engine.get_available_peers(learner, all_peers, criteria)
        
        assert len(available) == 1
        assert available[0]["learner_id"] == "peer_003"

    def test_filter_by_learning_style(self, engine, learner, all_peers):
        """Test filtering by learning style."""
        criteria = {"learning_style": "visual"}
        available = engine.get_available_peers(learner, all_peers, criteria)
        
        assert len(available) == 2
        assert all(p["learning_style"] == "visual" for p in available)

    def test_filter_by_availability(self, engine, learner, all_peers):
        """Test filtering by availability."""
        criteria = {"availability": ["afternoon"]}
        available = engine.get_available_peers(learner, all_peers, criteria)
        
        assert len(available) == 2
        assert all("afternoon" in p["availability"] for p in available)

    def test_combined_filters(self, engine, learner, all_peers):
        """Test combined filters."""
        criteria = {
            "learning_style": "visual",
            "availability": ["morning"],
        }
        available = engine.get_available_peers(learner, all_peers, criteria)
        
        assert len(available) == 2


class TestScoreMatch:
    """Tests for score_match method."""

    @pytest.fixture
    def engine(self):
        return MatchingEngine()

    def test_score_similar_learners(self, engine):
        """Test scoring similar learners."""
        learner_a = {
            "knowledge_state": {"math": 0.7, "science": 0.6},
            "learning_style": "visual",
            "availability": ["morning", "afternoon"],
        }
        learner_b = {
            "knowledge_state": {"math": 0.7, "science": 0.7},
            "learning_style": "visual",
            "availability": ["afternoon", "evening"],
        }
        
        score = engine.score_match(learner_a, learner_b)
        
        assert 0 <= score <= 1
        assert score > 0.5  # Should be a good match

    def test_score_different_learners(self, engine):
        """Test scoring different learners."""
        learner_a = {
            "knowledge_state": {"math": 0.9},
            "learning_style": "visual",
            "availability": ["morning"],
        }
        learner_b = {
            "knowledge_state": {"art": 0.1},
            "learning_style": "kinesthetic",
            "availability": ["evening"],
        }
        
        score = engine.score_match(learner_a, learner_b)
        
        assert 0 <= score <= 1

    def test_score_tutor_match(self, engine):
        """Test scoring for tutor match type."""
        tutor = {
            "knowledge_state": {"math": 0.9},
            "learning_style": "visual",
            "availability": ["afternoon"],
        }
        student = {
            "knowledge_state": {"math": 0.6},
            "learning_style": "visual",
            "availability": ["afternoon"],
        }
        
        score = engine.score_match(student, tutor, match_type="tutor")
        
        assert 0 <= score <= 1


class TestWaitingPool:
    """Tests for waiting pool management."""

    @pytest.fixture
    def engine(self):
        return MatchingEngine()

    @pytest.fixture
    def learner(self):
        return {"learner_id": "user_001", "name": "Test User"}

    def test_add_to_waiting_pool(self, engine, learner):
        """Test adding learner to waiting pool."""
        engine.add_to_waiting_pool(learner)
        
        assert len(engine.waiting_pool) == 1
        assert engine.waiting_pool[0]["learner_id"] == "user_001"

    def test_remove_from_waiting_pool_exists(self, engine, learner):
        """Test removing existing learner from pool."""
        engine.waiting_pool.append(learner)
        
        result = engine.remove_from_waiting_pool("user_001")
        
        assert result is True
        assert len(engine.waiting_pool) == 0

    def test_remove_from_waiting_pool_not_exists(self, engine):
        """Test removing non-existing learner from pool."""
        result = engine.remove_from_waiting_pool("nonexistent")
        
        assert result is False

    def test_get_waiting_pool_size(self, engine, learner):
        """Test getting waiting pool size."""
        assert engine.get_waiting_pool_size() == 0
        
        engine.waiting_pool.append(learner)
        assert engine.get_waiting_pool_size() == 1
        
        engine.waiting_pool.append({"learner_id": "user_002"})
        assert engine.get_waiting_pool_size() == 2


class TestPrivateMethods:
    """Tests for private helper methods."""

    @pytest.fixture
    def engine(self):
        return MatchingEngine()

    def test_compute_similarity_matrix(self, engine):
        """Test similarity matrix computation."""
        profiles = [
            {"learner_id": "user_001", "knowledge_state": {"math": 0.8}, "availability": ["morning"]},
            {"learner_id": "user_002", "knowledge_state": {"math": 0.7}, "availability": ["morning"]},
            {"learner_id": "user_003", "knowledge_state": {"math": 0.3}, "availability": ["evening"]},
        ]
        
        matrix = engine._compute_similarity_matrix(profiles)
        
        assert matrix.shape == (3, 3)
        # Diagonal should be 0 (no self-matching)
        assert matrix[0, 0] == 0
        assert matrix[1, 1] == 0
        assert matrix[2, 2] == 0
        # Symmetric
        assert matrix[0, 1] == matrix[1, 0]

    def test_compute_match_score_with_knowledge(self, engine):
        """Test match score computation with knowledge states."""
        learner_a = {"knowledge_state": {"math": 0.8, "science": 0.7}}
        learner_b = {"knowledge_state": {"math": 0.8, "science": 0.6}}
        
        score, reasons = engine._compute_match_score(
            learner_a, learner_b, engine.default_constraints
        )
        
        assert 0 <= score <= 1

    def test_compute_match_score_tutor(self, engine):
        """Test match score for tutor type."""
        student = {"knowledge_state": {"math": 0.4}}
        tutor = {"knowledge_state": {"math": 0.7}}
        
        score, reasons = engine._compute_match_score(
            student, tutor, engine.default_constraints, match_type="tutor"
        )
        
        assert 0 <= score <= 1
        # Good knowledge differential
        assert any("tutor" in r.lower() for r in reasons) or score > 0.5

    def test_compute_match_score_same_style(self, engine):
        """Test match score with same learning style."""
        learner_a = {"learning_style": "visual", "knowledge_state": {}}
        learner_b = {"learning_style": "visual", "knowledge_state": {}}
        
        score, reasons = engine._compute_match_score(
            learner_a, learner_b, engine.default_constraints
        )
        
        assert any("style" in r.lower() for r in reasons)

    def test_compute_match_score_availability_overlap(self, engine):
        """Test match score with availability overlap."""
        learner_a = {"availability": ["morning", "afternoon"], "knowledge_state": {}}
        learner_b = {"availability": ["afternoon", "evening"], "knowledge_state": {}}
        
        score, reasons = engine._compute_match_score(
            learner_a, learner_b, engine.default_constraints
        )
        
        assert 0 <= score <= 1

    def test_enforce_size_constraints(self, engine):
        """Test group size constraint enforcement."""
        groups = [[0, 1, 2, 3, 4, 5], [6], [7, 8]]  # One oversized, one undersized
        
        result = engine._enforce_size_constraints(groups, min_size=2, max_size=4)
        
        for group in result:
            assert 2 <= len(group) <= 4

    def test_enforce_size_constraints_empty_group(self, engine):
        """Test handling of empty groups."""
        groups = [[0, 1], [], [2, 3]]
        
        result = engine._enforce_size_constraints(groups, min_size=2, max_size=4)
        
        assert all(len(g) > 0 for g in result)

    def test_diversify_styles(self, engine):
        """Test learning style diversification."""
        groups = [[0, 1], [2, 3]]
        styles = ["visual", "visual", "auditory", "auditory"]
        
        result = engine._diversify_styles(groups, styles)
        
        # Should attempt to diversify
        assert len(result) == 2
