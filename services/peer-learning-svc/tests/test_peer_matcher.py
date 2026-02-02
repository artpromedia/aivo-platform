"""Tests for PeerMatcher model."""
import pytest
from typing import List, Dict

from app.models.peer_matcher import (
    PeerMatcher,
    PeerMatch,
    LearnerProfile,
)


class TestPeerMatch:
    """Tests for PeerMatch dataclass."""

    def test_creation(self):
        """Test creating a peer match."""
        match = PeerMatch(
            learner_id="user_001",
            matched_peer_id="user_002",
            compatibility_score=0.85,
            match_reasons=["Similar knowledge levels"],
        )
        
        assert match.learner_id == "user_001"
        assert match.matched_peer_id == "user_002"
        assert match.compatibility_score == 0.85
        assert "Similar knowledge levels" in match.match_reasons


class TestLearnerProfile:
    """Tests for LearnerProfile dataclass."""

    def test_creation(self):
        """Test creating a learner profile."""
        profile = LearnerProfile(
            learner_id="user_001",
            knowledge_state={"math": 0.8},
            learning_style="visual",
            availability=["morning"],
            preferences={"collaborative": True},
        )
        
        assert profile.learner_id == "user_001"
        assert profile.knowledge_state["math"] == 0.8

    def test_from_dict(self):
        """Test creating profile from dictionary."""
        data = {
            "learner_id": "user_001",
            "knowledge_state": {"math": 0.8, "science": 0.6},
            "learning_style": "visual",
            "availability": ["morning", "afternoon"],
            "preferences": {"collaborative": True},
        }
        
        profile = LearnerProfile.from_dict(data)
        
        assert profile.learner_id == "user_001"
        assert profile.knowledge_state["math"] == 0.8
        assert profile.learning_style == "visual"
        assert "morning" in profile.availability

    def test_from_dict_defaults(self):
        """Test creating profile from minimal dictionary."""
        data = {"learner_id": "user_001"}
        
        profile = LearnerProfile.from_dict(data)
        
        assert profile.learner_id == "user_001"
        assert profile.knowledge_state == {}
        assert profile.learning_style is None
        assert profile.availability == []


class TestPeerMatcher:
    """Tests for PeerMatcher class."""

    @pytest.fixture
    def matcher(self):
        """Create a matcher instance."""
        return PeerMatcher()

    @pytest.fixture
    def candidates(self) -> List[Dict]:
        """Create sample candidate profiles."""
        return [
            {
                "learner_id": "peer_001",
                "knowledge_state": {"math": 0.8, "science": 0.7},
                "learning_style": "visual",
                "availability": ["morning", "afternoon"],
                "preferences": {"collaborative": True},
            },
            {
                "learner_id": "peer_002",
                "knowledge_state": {"math": 0.5, "science": 0.8},
                "learning_style": "auditory",
                "availability": ["afternoon", "evening"],
                "preferences": {"collaborative": False},
            },
            {
                "learner_id": "peer_003",
                "knowledge_state": {"math": 0.9, "science": 0.6},
                "learning_style": "kinesthetic",
                "availability": ["morning", "evening"],
                "preferences": {"collaborative": True},
            },
            {
                "learner_id": "peer_004",
                "knowledge_state": {"math": 0.3, "science": 0.4},
                "learning_style": "reading",
                "availability": ["afternoon"],
                "preferences": {"collaborative": True},
            },
        ]

    @pytest.fixture
    def learner(self) -> Dict:
        """Create a learner profile."""
        return {
            "learner_id": "learner_001",
            "knowledge_state": {"math": 0.6, "science": 0.7},
            "learning_style": "visual",
            "availability": ["afternoon", "evening"],
            "preferences": {"collaborative": True},
        }

    def test_init(self, matcher):
        """Test matcher initialization."""
        assert matcher.candidate_pool == []

    def test_init_with_pool(self, candidates):
        """Test matcher with candidate pool."""
        matcher = PeerMatcher(candidate_pool=candidates)
        
        assert len(matcher.candidate_pool) == 4

    def test_set_candidate_pool(self, matcher, candidates):
        """Test setting candidate pool."""
        matcher.set_candidate_pool(candidates)
        
        assert len(matcher.candidate_pool) == 4


class TestFindMatch:
    """Tests for find_match method."""

    @pytest.fixture
    def matcher(self):
        return PeerMatcher()

    @pytest.fixture
    def learner(self):
        return {
            "learner_id": "learner_001",
            "knowledge_state": {"math": 0.6, "science": 0.7},
            "learning_style": "visual",
            "availability": ["afternoon", "evening"],
            "preferences": {"collaborative": True},
        }

    @pytest.fixture
    def candidates(self):
        return [
            {
                "learner_id": "peer_001",
                "knowledge_state": {"math": 0.65, "science": 0.68},
                "learning_style": "visual",
                "availability": ["afternoon", "evening"],
                "preferences": {"collaborative": True},
            },
            {
                "learner_id": "peer_002",
                "knowledge_state": {"math": 0.3, "science": 0.9},
                "learning_style": "auditory",
                "availability": ["morning"],
                "preferences": {"collaborative": False},
            },
        ]

    def test_find_match_study_partner(self, matcher, learner, candidates):
        """Test finding a study partner."""
        match = matcher.find_match(learner, role="study_partner", candidates=candidates)
        
        assert match.learner_id == "learner_001"
        assert match.matched_peer_id in ["peer_001", "peer_002"]
        assert 0 <= match.compatibility_score <= 1

    def test_find_match_peer_tutor(self, matcher, learner, candidates):
        """Test finding a peer tutor."""
        match = matcher.find_match(learner, role="peer_tutor", candidates=candidates)
        
        assert match.learner_id == "learner_001"
        assert match.matched_peer_id is not None
        assert 0 <= match.compatibility_score <= 1

    def test_find_match_discussion_partner(self, matcher, learner, candidates):
        """Test finding a discussion partner."""
        match = matcher.find_match(learner, role="discussion_partner", candidates=candidates)
        
        assert match.learner_id == "learner_001"
        assert 0 <= match.compatibility_score <= 1

    def test_find_match_invalid_role(self, matcher, learner, candidates):
        """Test finding match with invalid role raises error."""
        with pytest.raises(ValueError, match="Invalid role"):
            matcher.find_match(learner, role="invalid_role", candidates=candidates)

    def test_find_match_no_candidates(self, matcher, learner):
        """Test finding match with no candidates raises error."""
        with pytest.raises(ValueError, match="No candidates available"):
            matcher.find_match(learner, role="study_partner", candidates=[])

    def test_find_match_only_self(self, matcher):
        """Test finding match when only self in candidates raises error."""
        learner = {"learner_id": "user_001"}
        candidates = [{"learner_id": "user_001"}]
        
        with pytest.raises(ValueError, match="No valid candidates"):
            matcher.find_match(learner, role="study_partner", candidates=candidates)

    def test_find_match_uses_pool(self, learner, candidates):
        """Test finding match uses pool when no candidates provided."""
        matcher = PeerMatcher(candidate_pool=candidates)
        
        match = matcher.find_match(learner, role="study_partner")
        
        assert match.matched_peer_id is not None


class TestFindTutor:
    """Tests for find_tutor method."""

    @pytest.fixture
    def matcher(self):
        return PeerMatcher()

    @pytest.fixture
    def learner(self):
        return {
            "learner_id": "learner_001",
            "knowledge_state": {"math": 0.4, "science": 0.5},
            "learning_style": "visual",
            "availability": ["afternoon"],
        }

    @pytest.fixture
    def candidates(self):
        return [
            {
                "learner_id": "tutor_001",
                "knowledge_state": {"math": 0.7, "science": 0.6},
                "learning_style": "visual",
                "availability": ["afternoon"],
            },
            {
                "learner_id": "tutor_002",
                "knowledge_state": {"math": 0.95, "science": 0.9},
                "learning_style": "auditory",
                "availability": ["morning"],
            },
            {
                "learner_id": "peer_001",
                "knowledge_state": {"math": 0.3, "science": 0.4},
                "learning_style": "kinesthetic",
                "availability": ["afternoon"],
            },
        ]

    def test_find_tutor_basic(self, matcher, learner, candidates):
        """Test finding a tutor for a topic."""
        match = matcher.find_tutor(learner, topic="math", candidates=candidates)
        
        assert match.learner_id == "learner_001"
        assert match.matched_peer_id in ["tutor_001", "tutor_002"]
        assert 0 <= match.compatibility_score <= 1

    def test_find_tutor_optimal_gap(self, matcher, learner, candidates):
        """Test that tutor with optimal knowledge gap is preferred."""
        # tutor_001 has math: 0.7 (gap of 0.3 - optimal)
        # tutor_002 has math: 0.95 (gap of 0.55 - too large)
        match = matcher.find_tutor(learner, topic="math", candidates=candidates)
        
        # Should prefer tutor_001 due to optimal gap
        assert match.matched_peer_id == "tutor_001"

    def test_find_tutor_no_candidates(self, matcher, learner):
        """Test finding tutor with no candidates raises error."""
        with pytest.raises(ValueError, match="No candidates available"):
            matcher.find_tutor(learner, topic="math", candidates=[])

    def test_find_tutor_no_better_knowledge(self, matcher):
        """Test finding tutor when no one knows more (falls back to general match)."""
        learner = {
            "learner_id": "learner_001",
            "knowledge_state": {"math": 0.9},
        }
        candidates = [
            {"learner_id": "peer_001", "knowledge_state": {"math": 0.5}},
            {"learner_id": "peer_002", "knowledge_state": {"math": 0.6}},
        ]
        
        match = matcher.find_tutor(learner, topic="math", candidates=candidates)
        
        # Should fall back to general peer_tutor match
        assert match.matched_peer_id is not None


class TestComputeCompatibility:
    """Tests for compute_compatibility method."""

    @pytest.fixture
    def matcher(self):
        return PeerMatcher()

    def test_compute_compatibility_similar(self, matcher):
        """Test compatibility between similar profiles."""
        profile_a = {
            "learner_id": "user_001",
            "knowledge_state": {"math": 0.7, "science": 0.6},
            "learning_style": "visual",
            "availability": ["afternoon"],
        }
        profile_b = {
            "learner_id": "user_002",
            "knowledge_state": {"math": 0.65, "science": 0.65},
            "learning_style": "visual",
            "availability": ["afternoon"],
        }
        
        score = matcher.compute_compatibility(profile_a, profile_b)
        
        assert 0 <= score <= 1
        assert score > 0.5  # Should be relatively compatible

    def test_compute_compatibility_different(self, matcher):
        """Test compatibility between different profiles."""
        profile_a = {
            "learner_id": "user_001",
            "knowledge_state": {"math": 0.9},
            "learning_style": "visual",
            "availability": ["morning"],
        }
        profile_b = {
            "learner_id": "user_002",
            "knowledge_state": {"art": 0.9},
            "learning_style": "kinesthetic",
            "availability": ["evening"],
        }
        
        score = matcher.compute_compatibility(profile_a, profile_b)
        
        assert 0 <= score <= 1

    def test_compute_compatibility_invalid_role(self, matcher):
        """Test compatibility with invalid role defaults to study_partner."""
        profile_a = {"learner_id": "user_001"}
        profile_b = {"learner_id": "user_002"}
        
        score = matcher.compute_compatibility(profile_a, profile_b, role="invalid")
        
        assert 0 <= score <= 1


class TestPrivateMethods:
    """Tests for private helper methods."""

    @pytest.fixture
    def matcher(self):
        return PeerMatcher()

    def test_compute_knowledge_similarity_empty(self, matcher):
        """Test knowledge similarity with empty states."""
        score = matcher._compute_knowledge_similarity({}, {})
        assert score == 0.5

    def test_compute_knowledge_similarity_same(self, matcher):
        """Test knowledge similarity with same states."""
        knowledge_a = {"math": 0.7, "science": 0.6}
        knowledge_b = {"math": 0.7, "science": 0.6}
        
        score = matcher._compute_knowledge_similarity(knowledge_a, knowledge_b)
        
        assert score > 0.9

    def test_compute_knowledge_similarity_different(self, matcher):
        """Test knowledge similarity with different states."""
        knowledge_a = {"math": 0.9, "science": 0.1}
        knowledge_b = {"math": 0.1, "science": 0.9}
        
        score = matcher._compute_knowledge_similarity(knowledge_a, knowledge_b)
        
        assert 0 <= score <= 1

    def test_compute_knowledge_differential_score_empty(self, matcher):
        """Test differential score with empty knowledge."""
        score = matcher._compute_knowledge_differential_score({}, {})
        assert score == 0.5

    def test_compute_knowledge_differential_score_good(self, matcher):
        """Test differential score with good tutoring gap."""
        learner = {"math": 0.4}
        tutor = {"math": 0.7}
        
        score = matcher._compute_knowledge_differential_score(learner, tutor)
        
        assert score > 0.7  # 0.3 gap is optimal

    def test_compute_differential_score(self, matcher):
        """Test differential score computation."""
        # No differential
        assert matcher._compute_differential_score(0) == 0.1
        
        # Optimal differential (0.3)
        score_optimal = matcher._compute_differential_score(0.3)
        assert score_optimal > 0.8
        
        # Too large gap
        score_large = matcher._compute_differential_score(0.8)
        assert score_large < 0.5

    def test_compute_knowledge_diversity_empty(self, matcher):
        """Test diversity with empty knowledge."""
        score = matcher._compute_knowledge_diversity({}, {})
        assert score == 0.5

    def test_compute_knowledge_diversity_different_topics(self, matcher):
        """Test diversity with different topics."""
        knowledge_a = {"math": 0.8}
        knowledge_b = {"art": 0.8}
        
        score = matcher._compute_knowledge_diversity(knowledge_a, knowledge_b)
        
        # No overlap is penalized - score can be negative in edge cases
        assert -1 <= score <= 1

    def test_compute_style_compatibility_same(self, matcher):
        """Test style compatibility with same styles."""
        score = matcher._compute_style_compatibility("visual", "visual")
        assert score == 1.0

    def test_compute_style_compatibility_different(self, matcher):
        """Test style compatibility with different styles."""
        score = matcher._compute_style_compatibility("visual", "auditory")
        assert 0 < score < 1

    def test_compute_style_compatibility_unknown(self, matcher):
        """Test style compatibility with unknown styles."""
        score = matcher._compute_style_compatibility(None, "visual")
        assert score == 0.5
        
        score = matcher._compute_style_compatibility("visual", None)
        assert score == 0.5

    def test_compute_style_compatibility_reverse_lookup(self, matcher):
        """Test style compatibility uses reverse lookup."""
        score_forward = matcher._compute_style_compatibility("visual", "auditory")
        score_reverse = matcher._compute_style_compatibility("auditory", "visual")
        assert score_forward == score_reverse

    def test_compute_availability_overlap_full(self, matcher):
        """Test availability overlap with full overlap."""
        avail_a = ["morning", "afternoon"]
        avail_b = ["morning", "afternoon"]
        
        score = matcher._compute_availability_overlap(avail_a, avail_b)
        
        assert score == 1.0

    def test_compute_availability_overlap_partial(self, matcher):
        """Test availability overlap with partial overlap."""
        avail_a = ["morning", "afternoon"]
        avail_b = ["afternoon", "evening"]
        
        score = matcher._compute_availability_overlap(avail_a, avail_b)
        
        assert 0 < score < 1

    def test_compute_availability_overlap_none(self, matcher):
        """Test availability overlap with no overlap."""
        avail_a = ["morning"]
        avail_b = ["evening"]
        
        score = matcher._compute_availability_overlap(avail_a, avail_b)
        
        assert score < 0.5

    def test_compute_availability_overlap_empty(self, matcher):
        """Test availability overlap with empty lists."""
        score = matcher._compute_availability_overlap([], [])
        assert score == 0.3

    def test_compute_preference_alignment_empty(self, matcher):
        """Test preference alignment with empty preferences."""
        score = matcher._compute_preference_alignment({}, {})
        assert score == 0.5

    def test_compute_preference_alignment_same(self, matcher):
        """Test preference alignment with same preferences."""
        prefs = {"collaborative": True, "quiet": False}
        
        score = matcher._compute_preference_alignment(prefs, prefs)
        
        assert score == 1.0

    def test_compute_preference_alignment_different(self, matcher):
        """Test preference alignment with different preferences."""
        prefs_a = {"collaborative": True}
        prefs_b = {"collaborative": False}
        
        score = matcher._compute_preference_alignment(prefs_a, prefs_b)
        
        assert score < 1.0

    def test_compute_preference_alignment_numeric(self, matcher):
        """Test preference alignment with numeric preferences."""
        prefs_a = {"study_hours": 5}
        prefs_b = {"study_hours": 5.5}
        
        score = matcher._compute_preference_alignment(prefs_a, prefs_b)
        
        # Close numeric values should align well
        assert score > 0.7

    def test_compute_preference_alignment_no_overlap(self, matcher):
        """Test preference alignment with no overlapping keys."""
        prefs_a = {"pref_a": True}
        prefs_b = {"pref_b": True}
        
        score = matcher._compute_preference_alignment(prefs_a, prefs_b)
        
        assert score == 0.5


class TestMatchReasons:
    """Tests for match reasons generation."""

    @pytest.fixture
    def matcher(self):
        return PeerMatcher()

    def test_match_has_reasons(self, matcher):
        """Test that matches include reasons."""
        learner = {
            "learner_id": "learner_001",
            "knowledge_state": {"math": 0.7},
            "learning_style": "visual",
            "availability": ["afternoon"],
        }
        candidates = [
            {
                "learner_id": "peer_001",
                "knowledge_state": {"math": 0.7},
                "learning_style": "visual",
                "availability": ["afternoon"],
            },
        ]
        
        match = matcher.find_match(learner, role="study_partner", candidates=candidates)
        
        assert len(match.match_reasons) >= 1


class TestRoleWeights:
    """Tests for different role weight configurations."""

    @pytest.fixture
    def matcher(self):
        return PeerMatcher()

    def test_role_weights_exist(self, matcher):
        """Test that all role weights are defined."""
        assert "study_partner" in matcher.ROLE_WEIGHTS
        assert "peer_tutor" in matcher.ROLE_WEIGHTS
        assert "discussion_partner" in matcher.ROLE_WEIGHTS

    def test_weights_sum_to_one(self, matcher):
        """Test that weights sum to 1.0 for each role."""
        for role, weights in matcher.ROLE_WEIGHTS.items():
            total = sum(weights.values())
            assert abs(total - 1.0) < 0.01, f"Role {role} weights sum to {total}"

    def test_style_compatibility_symmetric(self, matcher):
        """Test that style compatibility is symmetric."""
        for (style_a, style_b), score in matcher.STYLE_COMPATIBILITY.items():
            # Check reverse also exists or defaults correctly
            reverse_key = (style_b, style_a)
            if reverse_key in matcher.STYLE_COMPATIBILITY:
                assert matcher.STYLE_COMPATIBILITY[reverse_key] == score
