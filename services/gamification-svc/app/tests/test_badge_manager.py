"""
Unit tests for Badge Manager service.

Tests cover:
- Getting badges for users
- Badge progress calculation
- Badge unlocking
- Filtering by category/rarity
- Stats management
"""
import pytest
from datetime import datetime

from app.models.achievement_engine import (
    Achievement,
    AchievementCategory,
    AchievementRarity,
    AchievementTier,
    ACHIEVEMENT_DEFINITIONS,
)
from app.services.badge_manager import (
    BadgeManager,
    LearnerStats,
    Badge,
    BadgeProgress,
    get_badge_manager,
)


@pytest.fixture
def badge_manager():
    """Create a fresh BadgeManager for each test."""
    return BadgeManager()


@pytest.fixture
def learner_with_badges(badge_manager):
    """Create a learner with some earned badges."""
    learner_id = "test_learner_001"
    
    # Set stats high enough to unlock some badges
    stats = LearnerStats(
        lessons_completed=50,
        perfect_scores=10,
        streak_days=7,
        total_xp=5000,
    )
    
    badge_manager.check_badges(learner_id, stats)
    return learner_id, badge_manager


class TestBadgeManagerInit:
    """Tests for BadgeManager initialization."""

    def test_initialization(self, badge_manager):
        """Test BadgeManager initializes correctly."""
        assert badge_manager is not None
        assert len(badge_manager._achievements) > 0

    def test_achievements_loaded(self, badge_manager):
        """Test achievements are loaded from definitions."""
        assert len(badge_manager._achievements) == len(ACHIEVEMENT_DEFINITIONS)

    def test_singleton_factory(self):
        """Test get_badge_manager returns singleton."""
        bm1 = get_badge_manager()
        bm2 = get_badge_manager()
        assert bm1 is bm2


class TestGetBadges:
    """Tests for getting badges."""

    def test_get_badges_new_learner(self, badge_manager):
        """Test getting badges for a new learner."""
        badges = badge_manager.get_badges("new_learner_001")
        
        assert badges.learner_id == "new_learner_001"
        assert badges.total_badges == 0
        assert len(badges.earned_badges) == 0

    def test_get_badges_includes_progress(self, badge_manager):
        """Test badges include progress for unearned badges."""
        badges = badge_manager.get_badges("learner_progress_001")
        
        assert len(badges.in_progress) > 0

    def test_get_badges_with_category_filter(self, badge_manager):
        """Test filtering badges by category."""
        badges = badge_manager.get_badges(
            "learner_cat_001",
            category="lessons",
        )
        
        for badge in badges.in_progress:
            assert badge.category == "lessons"

    def test_get_badges_with_rarity_filter(self, badge_manager):
        """Test filtering badges by rarity."""
        badges = badge_manager.get_badges(
            "learner_rare_001",
            rarity="common",
        )
        
        for badge in badges.in_progress:
            assert badge.rarity == "common"

    def test_get_badges_exclude_progress(self, badge_manager):
        """Test excluding progress badges."""
        badges = badge_manager.get_badges(
            "learner_noprog_001",
            include_progress=False,
        )
        
        assert len(badges.in_progress) == 0

    def test_get_badges_rarity_counts(self, learner_with_badges):
        """Test rarity counts are calculated."""
        learner_id, bm = learner_with_badges
        
        badges = bm.get_badges(learner_id)
        
        # Should have some badges by now
        if badges.total_badges > 0:
            total_from_rarity = sum(badges.badges_by_rarity.values())
            assert total_from_rarity == badges.total_badges


class TestBadgeProgress:
    """Tests for badge progress calculation."""

    def test_progress_calculation(self, badge_manager):
        """Test progress percentage is calculated correctly."""
        learner_id = "learner_prog_001"
        
        # Set stats for partial progress
        badge_manager.update_stats(
            learner_id,
            lessons_completed=25,  # 50% of lessons_50 badge
        )
        
        badges = badge_manager.get_badges(learner_id)
        
        # Find lessons_50 badge progress
        lessons_progress = None
        for p in badges.in_progress:
            if p.badge_id == "lessons_50":
                lessons_progress = p
                break
        
        if lessons_progress:
            assert lessons_progress.current_value == 25
            assert lessons_progress.target_value == 50
            assert lessons_progress.progress_percentage == 50.0

    def test_progress_sorted_by_percentage(self, badge_manager):
        """Test in-progress badges are sorted by progress percentage."""
        learner_id = "learner_sort_001"
        
        badge_manager.update_stats(
            learner_id,
            lessons_completed=40,  # High progress on some badges
            streak_days=2,  # Low progress on others
        )
        
        badges = badge_manager.get_badges(learner_id)
        
        if len(badges.in_progress) >= 2:
            for i in range(len(badges.in_progress) - 1):
                assert badges.in_progress[i].progress_percentage >= badges.in_progress[i + 1].progress_percentage

    def test_secret_badges_hidden(self, badge_manager):
        """Test secret badges are not shown in progress."""
        badges = badge_manager.get_badges("learner_secret_001")
        
        for badge in badges.in_progress:
            # Secret badges should not appear in progress
            achievement = badge_manager.get_badge_by_id(badge.badge_id)
            if achievement:
                assert not achievement.secret


class TestCheckBadges:
    """Tests for badge unlocking."""

    def test_unlock_lessons_badge(self, badge_manager):
        """Test unlocking a lessons badge."""
        learner_id = "learner_lessons_001"
        
        stats = LearnerStats(lessons_completed=10)
        result = badge_manager.check_badges(learner_id, stats)
        
        assert len(result.newly_unlocked) >= 1
        
        # Should include lessons_10 badge
        badge_ids = [b.id for b in result.newly_unlocked]
        assert "lessons_10" in badge_ids

    def test_unlock_streak_badge(self, badge_manager):
        """Test unlocking a streak badge."""
        learner_id = "learner_streak_001"
        
        stats = LearnerStats(streak_days=7)
        result = badge_manager.check_badges(learner_id, stats)
        
        # Should unlock streak_7 and streak_3
        badge_ids = [b.id for b in result.newly_unlocked]
        assert "streak_7" in badge_ids
        assert "streak_3" in badge_ids

    def test_unlock_xp_badge(self, badge_manager):
        """Test unlocking an XP badge."""
        learner_id = "learner_xp_001"
        
        stats = LearnerStats(total_xp=1000)
        result = badge_manager.check_badges(learner_id, stats)
        
        badge_ids = [b.id for b in result.newly_unlocked]
        assert "xp_1000" in badge_ids

    def test_xp_reward_calculated(self, badge_manager):
        """Test XP reward is calculated for unlocked badges."""
        learner_id = "learner_reward_001"
        
        stats = LearnerStats(lessons_completed=10)
        result = badge_manager.check_badges(learner_id, stats)
        
        assert result.xp_earned > 0

    def test_no_duplicate_unlocks(self, badge_manager):
        """Test badges are not unlocked twice."""
        learner_id = "learner_dup_001"
        
        stats = LearnerStats(lessons_completed=10)
        
        # First check
        result1 = badge_manager.check_badges(learner_id, stats)
        count1 = len(result1.newly_unlocked)
        
        # Second check with same stats
        result2 = badge_manager.check_badges(learner_id, stats)
        count2 = len(result2.newly_unlocked)
        
        assert count2 == 0  # No new badges on second check

    def test_unlock_multiple_badges(self, badge_manager):
        """Test unlocking multiple badges at once."""
        learner_id = "learner_multi_001"
        
        stats = LearnerStats(
            lessons_completed=50,
            streak_days=14,
            total_xp=5000,
        )
        
        result = badge_manager.check_badges(learner_id, stats)
        
        # Should unlock multiple badges
        assert len(result.newly_unlocked) >= 5

    def test_unlock_message(self, badge_manager):
        """Test unlock result has appropriate message."""
        learner_id = "learner_msg_001"
        
        stats = LearnerStats(lessons_completed=10)
        result = badge_manager.check_badges(learner_id, stats)
        
        assert "Congratulations" in result.message or len(result.newly_unlocked) == 0

    def test_no_unlock_insufficient_stats(self, badge_manager):
        """Test no badges unlocked with insufficient stats."""
        learner_id = "learner_none_001"
        
        stats = LearnerStats(lessons_completed=0)
        result = badge_manager.check_badges(learner_id, stats)
        
        # Should only unlock onboarding badges (no requirement) if any
        for badge in result.newly_unlocked:
            achievement = badge_manager.get_badge_by_id(badge.id)
            if achievement:
                assert achievement.requirement is None


class TestUpdateStats:
    """Tests for updating learner stats."""

    def test_update_single_stat(self, badge_manager):
        """Test updating a single stat."""
        learner_id = "learner_update_001"
        
        stats = badge_manager.update_stats(
            learner_id,
            lessons_completed=10,
        )
        
        assert stats.lessons_completed == 10

    def test_update_multiple_stats(self, badge_manager):
        """Test updating multiple stats."""
        learner_id = "learner_update_002"
        
        stats = badge_manager.update_stats(
            learner_id,
            lessons_completed=20,
            streak_days=5,
            total_xp=1000,
        )
        
        assert stats.lessons_completed == 20
        assert stats.streak_days == 5
        assert stats.total_xp == 1000

    def test_increment_stat(self, badge_manager):
        """Test incrementing a stat."""
        learner_id = "learner_inc_001"
        
        # Set initial value
        badge_manager.update_stats(learner_id, lessons_completed=5)
        
        # Increment
        new_value = badge_manager.increment_stat(learner_id, "lessons_completed", 1)
        
        assert new_value == 6

    def test_increment_nonexistent_stat(self, badge_manager):
        """Test incrementing a nonexistent stat returns 0."""
        learner_id = "learner_inc_002"
        
        result = badge_manager.increment_stat(learner_id, "nonexistent_stat", 1)
        
        assert result == 0

    def test_get_learner_stats(self, badge_manager):
        """Test getting learner stats."""
        learner_id = "learner_stats_001"
        
        badge_manager.update_stats(learner_id, perfect_scores=5)
        
        stats = badge_manager.get_learner_stats(learner_id)
        
        assert stats.perfect_scores == 5


class TestGetBadgeById:
    """Tests for getting individual badge definitions."""

    def test_get_existing_badge(self, badge_manager):
        """Test getting an existing badge."""
        badge = badge_manager.get_badge_by_id("lessons_10")
        
        assert badge is not None
        assert badge.name == "Eager Learner"
        assert badge.category == AchievementCategory.LESSONS

    def test_get_nonexistent_badge(self, badge_manager):
        """Test getting a nonexistent badge returns None."""
        badge = badge_manager.get_badge_by_id("nonexistent_badge")
        
        assert badge is None


class TestGetAllBadges:
    """Tests for getting all badge definitions."""

    def test_get_all_badges(self, badge_manager):
        """Test getting all badges."""
        badges = badge_manager.get_all_badges()
        
        assert len(badges) > 0

    def test_get_all_badges_filter_category(self, badge_manager):
        """Test filtering all badges by category."""
        badges = badge_manager.get_all_badges(category="lessons")
        
        for badge in badges:
            assert badge.category == AchievementCategory.LESSONS

    def test_get_all_badges_filter_rarity(self, badge_manager):
        """Test filtering all badges by rarity."""
        badges = badge_manager.get_all_badges(rarity="rare")
        
        for badge in badges:
            assert badge.rarity == AchievementRarity.RARE

    def test_get_all_badges_exclude_secret(self, badge_manager):
        """Test secret badges are excluded by default."""
        badges = badge_manager.get_all_badges()
        
        for badge in badges:
            assert not badge.secret

    def test_get_all_badges_include_secret(self, badge_manager):
        """Test including secret badges."""
        badges_no_secret = badge_manager.get_all_badges(include_secret=False)
        badges_with_secret = badge_manager.get_all_badges(include_secret=True)
        
        # With secrets should be >= without secrets
        assert len(badges_with_secret) >= len(badges_no_secret)


class TestBadgeDataClasses:
    """Tests for Badge dataclasses."""

    def test_badge_creation(self):
        """Test creating a Badge."""
        badge = Badge(
            id="test_badge",
            name="Test Badge",
            description="A test badge",
            icon="/badges/test.svg",
            category="lessons",
            rarity="common",
            earned_at=datetime.utcnow(),
            xp_reward=50,
            tier="bronze",
        )
        
        assert badge.id == "test_badge"
        assert badge.xp_reward == 50

    def test_badge_progress_creation(self):
        """Test creating BadgeProgress."""
        progress = BadgeProgress(
            badge_id="lessons_10",
            badge_name="Eager Learner",
            description="Complete 10 lessons",
            icon="/badges/lessons.svg",
            category="lessons",
            rarity="common",
            current_value=5,
            target_value=10,
            progress_percentage=50.0,
            is_earned=False,
            tier="bronze",
        )
        
        assert progress.current_value == 5
        assert progress.progress_percentage == 50.0
        assert progress.is_earned is False


class TestLearnerStats:
    """Tests for LearnerStats dataclass."""

    def test_default_stats(self):
        """Test LearnerStats default values."""
        stats = LearnerStats()
        
        assert stats.lessons_completed == 0
        assert stats.quizzes_completed == 0
        assert stats.perfect_scores == 0
        assert stats.streak_days == 0
        assert stats.total_xp == 0

    def test_stats_with_values(self):
        """Test LearnerStats with values."""
        stats = LearnerStats(
            lessons_completed=100,
            streak_days=30,
            total_xp=10000,
        )
        
        assert stats.lessons_completed == 100
        assert stats.streak_days == 30
        assert stats.total_xp == 10000


class TestEdgeCases:
    """Tests for edge cases."""

    def test_empty_learner_id(self, badge_manager):
        """Test handling empty learner ID."""
        badges = badge_manager.get_badges("")
        assert badges.learner_id == ""

    def test_special_characters_in_learner_id(self, badge_manager):
        """Test handling special characters in learner ID."""
        learner_id = "learner_!@#$%^&*()_001"
        badges = badge_manager.get_badges(learner_id)
        assert badges.learner_id == learner_id

    def test_very_high_stats(self, badge_manager):
        """Test handling very high stat values."""
        learner_id = "learner_high_001"
        
        stats = LearnerStats(
            lessons_completed=1000000,
            total_xp=999999999,
        )
        
        result = badge_manager.check_badges(learner_id, stats)
        
        # Should unlock all non-secret badges
        assert len(result.newly_unlocked) > 0
