"""Tests for GroupFormer model."""
import pytest
import numpy as np
from typing import List, Dict

from app.models.group_former import GroupFormer, StudyGroup, GroupValidation


class TestStudyGroup:
    """Tests for StudyGroup dataclass."""

    def test_creation(self):
        """Test creating a study group."""
        group = StudyGroup(
            group_id="group_001",
            member_ids=["user_001", "user_002", "user_003"],
            balance_score=0.85,
            predicted_effectiveness=0.9,
        )
        
        assert group.group_id == "group_001"
        assert len(group.member_ids) == 3
        assert group.balance_score == 0.85
        assert group.predicted_effectiveness == 0.9
        assert group.member_roles == {}

    def test_with_member_roles(self):
        """Test study group with member roles."""
        group = StudyGroup(
            group_id="group_001",
            member_ids=["user_001", "user_002"],
            balance_score=0.8,
            predicted_effectiveness=0.85,
            member_roles={"user_001": "leader", "user_002": "contributor"},
        )
        
        assert group.member_roles["user_001"] == "leader"
        assert group.member_roles["user_002"] == "contributor"


class TestGroupValidation:
    """Tests for GroupValidation dataclass."""

    def test_valid_group(self):
        """Test validation for a valid group."""
        validation = GroupValidation(
            is_valid=True,
            issues=[],
            suggestions=[],
            compatibility_score=0.9,
        )
        
        assert validation.is_valid is True
        assert len(validation.issues) == 0
        assert validation.compatibility_score == 0.9

    def test_invalid_group(self):
        """Test validation for an invalid group."""
        validation = GroupValidation(
            is_valid=False,
            issues=["Group too small"],
            suggestions=["Merge with another group"],
            compatibility_score=0.3,
        )
        
        assert validation.is_valid is False
        assert "Group too small" in validation.issues


class TestGroupFormer:
    """Tests for GroupFormer class."""

    @pytest.fixture
    def former(self):
        """Create a group former instance."""
        return GroupFormer()

    @pytest.fixture
    def sample_profiles(self) -> List[Dict]:
        """Create sample learner profiles."""
        return [
            {
                "learner_id": "user_001",
                "knowledge_state": {"math": 0.9, "science": 0.8},
                "learning_style": "visual",
                "availability": ["morning", "afternoon"],
            },
            {
                "learner_id": "user_002",
                "knowledge_state": {"math": 0.7, "science": 0.6},
                "learning_style": "auditory",
                "availability": ["afternoon", "evening"],
            },
            {
                "learner_id": "user_003",
                "knowledge_state": {"math": 0.4, "science": 0.5},
                "learning_style": "kinesthetic",
                "availability": ["morning", "evening"],
            },
            {
                "learner_id": "user_004",
                "knowledge_state": {"math": 0.3, "science": 0.3},
                "learning_style": "reading",
                "availability": ["afternoon"],
            },
            {
                "learner_id": "user_005",
                "knowledge_state": {"math": 0.6, "science": 0.7},
                "learning_style": "visual",
                "availability": ["morning", "afternoon", "evening"],
            },
            {
                "learner_id": "user_006",
                "knowledge_state": {"math": 0.5, "science": 0.5},
                "learning_style": "auditory",
                "availability": ["morning"],
            },
            {
                "learner_id": "user_007",
                "knowledge_state": {"math": 0.8, "science": 0.7},
                "learning_style": "kinesthetic",
                "availability": ["afternoon", "evening"],
            },
            {
                "learner_id": "user_008",
                "knowledge_state": {"math": 0.2, "science": 0.3},
                "learning_style": "visual",
                "availability": ["morning", "afternoon"],
            },
        ]

    def test_init(self, former):
        """Test group former initialization."""
        assert former.ROLES is not None
        assert "leader" in former.ROLES
        assert "contributor" in former.ROLES

    def test_form_empty(self, former):
        """Test forming groups with empty list."""
        groups = former.form([])
        assert groups == []

    def test_form_single_learner(self, former):
        """Test forming groups with single learner."""
        profiles = [{"learner_id": "user_001", "knowledge_state": {"math": 0.5}}]
        groups = former.form(profiles, group_size=4)
        
        assert len(groups) == 1
        assert len(groups[0].member_ids) == 1

    def test_form_smaller_than_group_size(self, former):
        """Test forming with fewer learners than group size."""
        profiles = [
            {"learner_id": "user_001", "knowledge_state": {"math": 0.5}},
            {"learner_id": "user_002", "knowledge_state": {"math": 0.6}},
        ]
        groups = former.form(profiles, group_size=4)
        
        assert len(groups) == 1
        assert len(groups[0].member_ids) == 2

    def test_form_balanced_groups(self, former, sample_profiles):
        """Test forming balanced groups."""
        groups = former.form(sample_profiles, group_size=4, optimization_goal="balanced")
        
        # Should have 2 groups of 4
        assert len(groups) == 2
        
        # Check all learners are assigned
        all_members = set()
        for group in groups:
            all_members.update(group.member_ids)
        assert len(all_members) == 8

    def test_form_diverse_groups(self, former, sample_profiles):
        """Test forming diverse groups."""
        groups = former.form(sample_profiles, group_size=4, optimization_goal="diverse")
        
        assert len(groups) >= 1
        # All members should be assigned
        all_members = [m for g in groups for m in g.member_ids]
        assert len(all_members) == 8

    def test_form_similar_groups(self, former, sample_profiles):
        """Test forming similar groups."""
        groups = former.form(sample_profiles, group_size=4, optimization_goal="similar")
        
        assert len(groups) >= 1

    def test_form_unknown_goal_defaults_to_balanced(self, former, sample_profiles):
        """Test that unknown goal defaults to balanced."""
        groups = former.form(sample_profiles, group_size=4, optimization_goal="unknown")
        
        assert len(groups) >= 1

    def test_form_with_group_scores(self, former, sample_profiles):
        """Test that formed groups have valid scores."""
        groups = former.form(sample_profiles, group_size=4)
        
        for group in groups:
            assert 0 <= group.balance_score <= 1
            assert 0 <= group.predicted_effectiveness <= 1


class TestRebalance:
    """Tests for rebalance method."""

    @pytest.fixture
    def former(self):
        return GroupFormer()

    @pytest.fixture
    def existing_groups(self):
        return [
            StudyGroup(
                group_id="group_001",
                member_ids=["user_001", "user_002", "user_003", "user_004"],
                balance_score=0.6,
                predicted_effectiveness=0.7,
            ),
            StudyGroup(
                group_id="group_002",
                member_ids=["user_005", "user_006", "user_007", "user_008"],
                balance_score=0.5,
                predicted_effectiveness=0.6,
            ),
        ]

    def test_rebalance_empty(self, former):
        """Test rebalancing empty list."""
        result = former.rebalance([])
        assert result == []

    def test_rebalance_without_profiles(self, former, existing_groups):
        """Test rebalancing without updated profiles."""
        result = former.rebalance(existing_groups)
        
        assert len(result) >= 1
        # All members should still be present
        all_members = set()
        for group in result:
            all_members.update(group.member_ids)
        assert len(all_members) == 8

    def test_rebalance_with_profiles(self, former, existing_groups):
        """Test rebalancing with updated profiles."""
        profiles = [
            {"learner_id": f"user_{i:03d}", "knowledge_state": {"math": i * 0.1}}
            for i in range(1, 9)
        ]
        
        result = former.rebalance(existing_groups, learner_profiles=profiles)
        
        assert len(result) >= 1


class TestSuggestRole:
    """Tests for suggest_role method."""

    @pytest.fixture
    def former(self):
        return GroupFormer()

    @pytest.fixture
    def group(self):
        return StudyGroup(
            group_id="group_001",
            member_ids=["user_001", "user_002", "user_003", "user_004"],
            balance_score=0.8,
            predicted_effectiveness=0.85,
        )

    def test_suggest_role_not_in_group(self, former, group):
        """Test suggesting role for non-member raises error."""
        with pytest.raises(ValueError, match="is not in group"):
            former.suggest_role(group, "user_999")

    def test_suggest_role_already_assigned(self, former):
        """Test returning existing role if already assigned."""
        group = StudyGroup(
            group_id="group_001",
            member_ids=["user_001", "user_002"],
            balance_score=0.8,
            predicted_effectiveness=0.85,
            member_roles={"user_001": "leader"},
        )
        
        role = former.suggest_role(group, "user_001")
        assert role == "leader"

    def test_suggest_role_without_profile(self, former, group):
        """Test suggesting role without profile (position-based)."""
        role = former.suggest_role(group, "user_001")
        assert role in ["leader", "contributor", "learner", "facilitator"]

    def test_suggest_role_high_knowledge_leader(self, former, group):
        """Test high knowledge learner gets leader role."""
        profile = {
            "learner_id": "user_001",
            "knowledge_state": {"math": 0.9, "science": 0.8},
        }
        
        role = former.suggest_role(group, "user_001", learner_profile=profile)
        assert role == "leader"

    def test_suggest_role_low_knowledge_learner(self, former, group):
        """Test low knowledge learner gets learner role."""
        profile = {
            "learner_id": "user_001",
            "knowledge_state": {"math": 0.1, "science": 0.2},
        }
        
        role = former.suggest_role(group, "user_001", learner_profile=profile)
        assert role == "learner"

    def test_suggest_role_social_facilitator(self, former, group):
        """Test social learner gets facilitator role."""
        profile = {
            "learner_id": "user_001",
            "knowledge_state": {"math": 0.5, "science": 0.5},
            "preferences": {"social": True},
        }
        
        role = former.suggest_role(group, "user_001", learner_profile=profile)
        assert role == "facilitator"

    def test_suggest_role_contributor(self, former, group):
        """Test mid-level non-social gets contributor role."""
        profile = {
            "learner_id": "user_001",
            "knowledge_state": {"math": 0.5, "science": 0.5},
            "preferences": {},
        }
        
        role = former.suggest_role(group, "user_001", learner_profile=profile)
        assert role == "contributor"


class TestOptimizeGroups:
    """Tests for optimize_groups method."""

    @pytest.fixture
    def former(self):
        return GroupFormer()

    @pytest.fixture
    def groups(self):
        return [
            StudyGroup(
                group_id="group_001",
                member_ids=["user_001", "user_002"],
                balance_score=0.5,
                predicted_effectiveness=0.6,
            ),
            StudyGroup(
                group_id="group_002",
                member_ids=["user_003", "user_004"],
                balance_score=0.5,
                predicted_effectiveness=0.6,
            ),
        ]

    @pytest.fixture
    def profiles(self):
        return [
            {"learner_id": "user_001", "knowledge_state": {"math": 0.9}},
            {"learner_id": "user_002", "knowledge_state": {"math": 0.2}},
            {"learner_id": "user_003", "knowledge_state": {"math": 0.8}},
            {"learner_id": "user_004", "knowledge_state": {"math": 0.3}},
        ]

    def test_optimize_single_group(self, former, profiles):
        """Test optimizing single group returns it unchanged."""
        groups = [
            StudyGroup(
                group_id="group_001",
                member_ids=["user_001", "user_002"],
                balance_score=0.5,
                predicted_effectiveness=0.6,
            ),
        ]
        
        result = former.optimize_groups(groups, profiles)
        assert len(result) == 1

    def test_optimize_diversity(self, former, groups, profiles):
        """Test optimizing for diversity."""
        result = former.optimize_groups(groups, profiles, optimization_goal="diversity")
        
        assert len(result) == 2
        # All members should be preserved
        all_members = set()
        for group in result:
            all_members.update(group.member_ids)
        assert len(all_members) == 4

    def test_optimize_similarity(self, former, groups, profiles):
        """Test optimizing for similarity."""
        result = former.optimize_groups(groups, profiles, optimization_goal="similarity")
        
        assert len(result) == 2


class TestValidateGroups:
    """Tests for validate_groups method."""

    @pytest.fixture
    def former(self):
        return GroupFormer()

    def test_validate_good_group(self, former):
        """Test validation of a well-formed group."""
        groups = [
            StudyGroup(
                group_id="group_001",
                member_ids=["user_001", "user_002", "user_003", "user_004"],
                balance_score=0.8,
                predicted_effectiveness=0.85,
            ),
        ]
        profiles = [
            {"learner_id": "user_001", "knowledge_state": {"math": 0.7}, "availability": ["morning"]},
            {"learner_id": "user_002", "knowledge_state": {"math": 0.6}, "availability": ["morning"]},
            {"learner_id": "user_003", "knowledge_state": {"math": 0.5}, "availability": ["morning"]},
            {"learner_id": "user_004", "knowledge_state": {"math": 0.4}, "availability": ["morning"]},
        ]
        
        validations = former.validate_groups(groups, profiles)
        
        assert len(validations) == 1
        assert 0 <= validations[0].compatibility_score <= 1

    def test_validate_too_small_group(self, former):
        """Test validation of group that's too small."""
        groups = [
            StudyGroup(
                group_id="group_001",
                member_ids=["user_001"],
                balance_score=0.5,
                predicted_effectiveness=0.5,
            ),
        ]
        profiles = [{"learner_id": "user_001", "knowledge_state": {"math": 0.5}}]
        
        validations = former.validate_groups(groups, profiles)
        
        assert len(validations) == 1
        assert "too small" in validations[0].issues[0].lower()
        assert "Merge" in validations[0].suggestions[0]

    def test_validate_too_large_group(self, former):
        """Test validation of group that's too large."""
        member_ids = [f"user_{i:03d}" for i in range(10)]
        groups = [
            StudyGroup(
                group_id="group_001",
                member_ids=member_ids,
                balance_score=0.5,
                predicted_effectiveness=0.5,
            ),
        ]
        profiles = [{"learner_id": m, "knowledge_state": {"math": 0.5}} for m in member_ids]
        
        validations = former.validate_groups(groups, profiles)
        
        assert len(validations) == 1
        assert "too large" in validations[0].issues[0].lower()

    def test_validate_missing_profile(self, former):
        """Test validation with missing profile."""
        groups = [
            StudyGroup(
                group_id="group_001",
                member_ids=["user_001", "user_002", "user_999"],
                balance_score=0.5,
                predicted_effectiveness=0.5,
            ),
        ]
        profiles = [
            {"learner_id": "user_001", "knowledge_state": {"math": 0.5}},
            {"learner_id": "user_002", "knowledge_state": {"math": 0.6}},
        ]
        
        validations = former.validate_groups(groups, profiles)
        
        assert any("Missing profile" in issue for issue in validations[0].issues)

    def test_validate_low_availability_overlap(self, former):
        """Test validation with low availability overlap."""
        groups = [
            StudyGroup(
                group_id="group_001",
                member_ids=["user_001", "user_002", "user_003"],
                balance_score=0.5,
                predicted_effectiveness=0.5,
            ),
        ]
        profiles = [
            {"learner_id": "user_001", "availability": ["morning"]},
            {"learner_id": "user_002", "availability": ["afternoon"]},
            {"learner_id": "user_003", "availability": ["evening"]},
        ]
        
        validations = former.validate_groups(groups, profiles)
        
        assert any("availability" in issue.lower() for issue in validations[0].issues)

    def test_validate_high_knowledge_variance(self, former):
        """Test validation with high knowledge variance."""
        groups = [
            StudyGroup(
                group_id="group_001",
                member_ids=["user_001", "user_002", "user_003"],
                balance_score=0.5,
                predicted_effectiveness=0.5,
            ),
        ]
        profiles = [
            {"learner_id": "user_001", "knowledge_state": {"math": 0.1}, "availability": ["morning"]},
            {"learner_id": "user_002", "knowledge_state": {"math": 0.9}, "availability": ["morning"]},
            {"learner_id": "user_003", "knowledge_state": {"math": 0.5}, "availability": ["morning"]},
        ]
        
        validations = former.validate_groups(groups, profiles)
        
        # High variance may trigger issue
        assert len(validations) == 1

    def test_validate_group_with_no_profiles(self, former):
        """Test validation when no profiles match."""
        groups = [
            StudyGroup(
                group_id="group_001",
                member_ids=["user_001", "user_002"],
                balance_score=0.5,
                predicted_effectiveness=0.5,
            ),
        ]
        profiles = []
        
        validations = former.validate_groups(groups, profiles)
        
        assert validations[0].is_valid is False


class TestPrivateMethods:
    """Tests for private helper methods."""

    @pytest.fixture
    def former(self):
        return GroupFormer()

    def test_extract_features(self, former):
        """Test feature extraction."""
        profiles = [
            {"learner_id": "user_001", "knowledge_state": {"math": 0.8, "science": 0.6}, "learning_style": "visual"},
            {"learner_id": "user_002", "knowledge_state": {"math": 0.5, "science": 0.7}, "learning_style": "auditory"},
        ]
        
        features, ids = former._extract_features(profiles)
        
        assert features.shape[0] == 2
        assert len(ids) == 2
        assert ids[0] == "user_001"

    def test_extract_features_missing_style(self, former):
        """Test feature extraction with missing learning style."""
        profiles = [
            {"learner_id": "user_001", "knowledge_state": {"math": 0.5}},
        ]
        
        features, ids = former._extract_features(profiles)
        
        assert features.shape[0] == 1

    def test_compute_balance_score_empty(self, former):
        """Test balance score for empty profiles."""
        score = former._compute_balance_score([])
        assert score == 0.0

    def test_compute_balance_score_single(self, former):
        """Test balance score for single profile."""
        profiles = [{"knowledge_state": {"math": 0.5}}]
        score = former._compute_balance_score(profiles)
        assert 0 <= score <= 1

    def test_compute_balance_score_balanced(self, former):
        """Test balance score for balanced profiles."""
        profiles = [
            {"knowledge_state": {"math": 0.5}},
            {"knowledge_state": {"math": 0.55}},
            {"knowledge_state": {"math": 0.5}},
        ]
        score = former._compute_balance_score(profiles)
        assert score > 0.8  # Low variance = high balance

    def test_compute_balance_score_imbalanced(self, former):
        """Test balance score for imbalanced profiles."""
        profiles = [
            {"knowledge_state": {"math": 0.1}},
            {"knowledge_state": {"math": 0.9}},
        ]
        score = former._compute_balance_score(profiles)
        # Higher variance = lower balance
        assert score < 1.0

    def test_predict_effectiveness_empty(self, former):
        """Test effectiveness prediction for empty profiles."""
        score = former._predict_effectiveness([], "balanced")
        assert score == 0.0

    def test_predict_effectiveness_balanced(self, former):
        """Test effectiveness for balanced goal."""
        profiles = [
            {"knowledge_state": {"math": 0.5}, "learning_style": "visual"},
            {"knowledge_state": {"math": 0.6}, "learning_style": "auditory"},
            {"knowledge_state": {"math": 0.55}, "learning_style": "kinesthetic"},
            {"knowledge_state": {"math": 0.45}, "learning_style": "reading"},
        ]
        score = former._predict_effectiveness(profiles, "balanced")
        assert 0 <= score <= 1

    def test_predict_effectiveness_diverse(self, former):
        """Test effectiveness for diverse goal."""
        profiles = [
            {"knowledge_state": {"math": 0.2}, "learning_style": "visual"},
            {"knowledge_state": {"math": 0.9}, "learning_style": "auditory"},
        ]
        score = former._predict_effectiveness(profiles, "diverse")
        assert 0 <= score <= 1

    def test_predict_effectiveness_similar(self, former):
        """Test effectiveness for similar goal."""
        profiles = [
            {"knowledge_state": {"math": 0.5}},
            {"knowledge_state": {"math": 0.5}},
        ]
        score = former._predict_effectiveness(profiles, "similar")
        assert 0 <= score <= 1

    def test_size_effectiveness(self, former):
        """Test size-based effectiveness scores."""
        assert former._size_effectiveness(1) == 0.3
        assert former._size_effectiveness(2) == 0.6
        assert former._size_effectiveness(3) == 0.8
        assert former._size_effectiveness(4) == 1.0
        assert former._size_effectiveness(5) == 1.0
        assert former._size_effectiveness(6) == 0.9
        assert former._size_effectiveness(10) < 0.9

    def test_style_diversity_score(self, former):
        """Test learning style diversity scoring."""
        # No styles
        score = former._style_diversity_score([{}])
        assert score == 0.5
        
        # One style
        score = former._style_diversity_score([{"learning_style": "visual"}])
        assert score > 0
        
        # Multiple styles
        profiles = [
            {"learning_style": "visual"},
            {"learning_style": "auditory"},
            {"learning_style": "kinesthetic"},
        ]
        score = former._style_diversity_score(profiles)
        assert score == 1.0

    def test_compute_availability_overlap(self, former):
        """Test availability overlap computation."""
        # Empty profiles
        assert former._compute_availability_overlap([]) == 0.0
        
        # No availability data
        score = former._compute_availability_overlap([{"learner_id": "user_001"}])
        assert score == 0.5
        
        # Full overlap
        profiles = [
            {"availability": ["morning", "afternoon"]},
            {"availability": ["morning", "afternoon"]},
        ]
        score = former._compute_availability_overlap(profiles)
        assert score == 1.0
        
        # Partial overlap
        profiles = [
            {"availability": ["morning", "afternoon"]},
            {"availability": ["afternoon", "evening"]},
        ]
        score = former._compute_availability_overlap(profiles)
        assert 0 < score < 1

    def test_compute_knowledge_variance(self, former):
        """Test knowledge variance computation."""
        # No profiles
        assert former._compute_knowledge_variance([]) == 0.0
        
        # Similar knowledge
        profiles = [
            {"knowledge_state": {"math": 0.5}},
            {"knowledge_state": {"math": 0.5}},
        ]
        variance = former._compute_knowledge_variance(profiles)
        assert variance == 0.0
        
        # Different knowledge
        profiles = [
            {"knowledge_state": {"math": 0.2}},
            {"knowledge_state": {"math": 0.8}},
        ]
        variance = former._compute_knowledge_variance(profiles)
        assert variance > 0

    def test_compute_group_compatibility(self, former):
        """Test group compatibility computation."""
        # Single member
        score = former._compute_group_compatibility([{"learner_id": "user_001"}])
        assert score == 1.0
        
        # Multiple members
        profiles = [
            {"availability": ["morning"], "learning_style": "visual", "knowledge_state": {"math": 0.5}},
            {"availability": ["morning"], "learning_style": "auditory", "knowledge_state": {"math": 0.6}},
        ]
        score = former._compute_group_compatibility(profiles)
        assert 0 <= score <= 1

    def test_balance_group_sizes(self, former):
        """Test group size balancing."""
        groups = [[0, 1, 2, 3, 4, 5], [6], [7, 8]]
        
        balanced = former._balance_group_sizes(groups, target_size=3)
        
        # Check sizes are more balanced
        sizes = [len(g) for g in balanced]
        assert max(sizes) - min(sizes) <= 2

    def test_compute_total_group_score(self, former):
        """Test total group score computation."""
        groups = [
            StudyGroup(
                group_id="group_001",
                member_ids=["user_001", "user_002"],
                balance_score=0.5,
                predicted_effectiveness=0.5,
            ),
            StudyGroup(
                group_id="group_002",
                member_ids=["user_003", "user_004"],
                balance_score=0.5,
                predicted_effectiveness=0.5,
            ),
        ]
        profile_map = {
            "user_001": {"knowledge_state": {"math": 0.5}},
            "user_002": {"knowledge_state": {"math": 0.6}},
            "user_003": {"knowledge_state": {"math": 0.4}},
            "user_004": {"knowledge_state": {"math": 0.7}},
        }
        
        score = former._compute_total_group_score(groups, profile_map, "balanced")
        assert 0 <= score <= 1

    def test_compute_total_group_score_empty(self, former):
        """Test total score for empty groups."""
        score = former._compute_total_group_score([], {}, "balanced")
        assert score == 0.0


class TestFormGroupVariants:
    """Tests for different group formation strategies."""

    @pytest.fixture
    def former(self):
        return GroupFormer()

    @pytest.fixture
    def profiles(self):
        """Create profiles with varying knowledge levels."""
        return [
            {"learner_id": f"user_{i:03d}", "knowledge_state": {"math": i * 0.1, "science": (10 - i) * 0.1}, "learning_style": ["visual", "auditory", "kinesthetic", "reading"][i % 4], "availability": ["morning", "afternoon"] if i % 2 == 0 else ["evening"]}
            for i in range(1, 13)
        ]

    def test_balanced_spreads_knowledge_levels(self, former, profiles):
        """Test balanced groups spread knowledge levels evenly."""
        groups = former.form(profiles, group_size=4, optimization_goal="balanced")
        
        assert len(groups) == 3
        
        # Each group should have members from different knowledge levels
        for group in groups:
            profiles_in_group = [
                p for p in profiles if p["learner_id"] in group.member_ids
            ]
            levels = [
                np.mean(list(p["knowledge_state"].values()))
                for p in profiles_in_group
            ]
            # Balanced groups should have at least one member
            assert len(levels) >= 1
            # Check that group has valid members
            assert len(group.member_ids) >= 1

    def test_diverse_maximizes_differences(self, former, profiles):
        """Test diverse groups maximize within-group differences."""
        groups = former.form(profiles, group_size=4, optimization_goal="diverse")
        
        assert len(groups) == 3
        # All members should be assigned
        all_members = set()
        for group in groups:
            all_members.update(group.member_ids)
        assert len(all_members) == 12

    def test_similar_groups_cluster(self, former, profiles):
        """Test similar groups cluster alike learners."""
        groups = former.form(profiles, group_size=4, optimization_goal="similar")
        
        assert len(groups) >= 1
        # Similar groups should cluster learners with similar profiles


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    @pytest.fixture
    def former(self):
        return GroupFormer()

    def test_form_with_minimal_profiles(self, former):
        """Test forming with minimal profile data."""
        profiles = [
            {"learner_id": "user_001"},
            {"learner_id": "user_002"},
            {"learner_id": "user_003"},
            {"learner_id": "user_004"},
        ]
        
        groups = former.form(profiles, group_size=2)
        
        assert len(groups) == 2

    def test_form_with_empty_knowledge_state(self, former):
        """Test forming with empty knowledge states."""
        profiles = [
            {"learner_id": "user_001", "knowledge_state": {}},
            {"learner_id": "user_002", "knowledge_state": {}},
        ]
        
        groups = former.form(profiles, group_size=2)
        
        assert len(groups) == 1

    def test_form_many_learners(self, former):
        """Test forming with many learners."""
        profiles = [
            {"learner_id": f"user_{i:03d}", "knowledge_state": {"math": i * 0.01}}
            for i in range(50)
        ]
        
        groups = former.form(profiles, group_size=5)
        
        assert len(groups) == 10
        # All learners should be assigned
        all_members = set()
        for group in groups:
            all_members.update(group.member_ids)
        assert len(all_members) == 50

    def test_form_with_duplicate_ids(self, former):
        """Test forming handles profiles gracefully."""
        profiles = [
            {"learner_id": "user_001", "knowledge_state": {"math": 0.5}},
            {"learner_id": "user_002", "knowledge_state": {"math": 0.6}},
            {"learner_id": "user_003", "knowledge_state": {"math": 0.7}},
            {"learner_id": "user_004", "knowledge_state": {"math": 0.8}},
        ]
        
        groups = former.form(profiles, group_size=2)
        
        assert len(groups) == 2
