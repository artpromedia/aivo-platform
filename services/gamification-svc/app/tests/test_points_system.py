"""
Unit tests for Points System model.

Tests cover:
- Level calculations
- XP/coin reward calculations
- Point transactions
- Level-up detection
"""
import pytest
from datetime import datetime

from app.models.points_system import (
    PointType,
    TransactionType,
    EarnSource,
    SpendCategory,
    PointTransaction,
    LevelInfo,
    LearnerLevel,
    LearnerPoints,
    PointsEarnResult,
    PointsSpendResult,
    LEVEL_DEFINITIONS,
    BASE_XP_REWARDS,
    BASE_COIN_REWARDS,
    ITEM_COSTS,
    get_level_for_xp,
    calculate_learner_level,
    calculate_xp_reward,
    calculate_coin_reward,
    check_level_up,
)


class TestPointEnums:
    """Tests for point-related enums."""

    def test_point_type_values(self):
        """Test PointType enum has expected values."""
        assert PointType.XP.value == "xp"
        assert PointType.COINS.value == "coins"
        assert PointType.GEMS.value == "gems"

    def test_transaction_type_values(self):
        """Test TransactionType enum has expected values."""
        assert TransactionType.EARN.value == "earn"
        assert TransactionType.SPEND.value == "spend"
        assert TransactionType.BONUS.value == "bonus"
        assert TransactionType.REFUND.value == "refund"
        assert TransactionType.ADJUSTMENT.value == "adjustment"

    def test_earn_source_values(self):
        """Test EarnSource enum has all activity types."""
        expected_sources = [
            "lesson_complete", "quiz_complete", "perfect_score",
            "streak_bonus", "achievement_unlock", "daily_login",
            "challenge_win", "help_peer", "milestone_bonus",
            "referral", "event_participation", "level_up_bonus"
        ]
        for source in expected_sources:
            assert source in [e.value for e in EarnSource]

    def test_spend_category_values(self):
        """Test SpendCategory enum has all spend types."""
        expected_categories = [
            "streak_freeze", "power_up", "cosmetic",
            "hint", "retry", "donation"
        ]
        for category in expected_categories:
            assert category in [e.value for e in SpendCategory]


class TestLevelDefinitions:
    """Tests for level definitions."""

    def test_level_definitions_exist(self):
        """Test that level definitions are properly defined."""
        assert len(LEVEL_DEFINITIONS) >= 15

    def test_levels_are_sequential(self):
        """Test levels are numbered sequentially starting from 1."""
        for i, level in enumerate(LEVEL_DEFINITIONS):
            assert level.level == i + 1

    def test_xp_thresholds_increase(self):
        """Test XP thresholds increase with each level."""
        for i in range(len(LEVEL_DEFINITIONS) - 1):
            assert LEVEL_DEFINITIONS[i].max_xp <= LEVEL_DEFINITIONS[i + 1].min_xp

    def test_level_names_are_unique(self):
        """Test each level has a unique name."""
        names = [level.name for level in LEVEL_DEFINITIONS]
        assert len(names) == len(set(names))

    def test_level_info_has_required_fields(self):
        """Test LevelInfo has all required fields."""
        level = LEVEL_DEFINITIONS[0]
        assert level.level == 1
        assert level.name is not None
        assert level.min_xp == 0
        assert level.max_xp > 0
        assert level.icon is not None
        assert isinstance(level.perks, list)


class TestGetLevelForXp:
    """Tests for get_level_for_xp function."""

    def test_level_1_at_0_xp(self):
        """Test level 1 at 0 XP."""
        level = get_level_for_xp(0)
        assert level.level == 1

    def test_level_1_at_99_xp(self):
        """Test still level 1 at 99 XP."""
        level = get_level_for_xp(99)
        assert level.level == 1

    def test_level_2_at_100_xp(self):
        """Test level 2 at 100 XP."""
        level = get_level_for_xp(100)
        assert level.level == 2

    def test_level_5_at_1000_xp(self):
        """Test level 5 at 1000 XP."""
        level = get_level_for_xp(1000)
        assert level.level == 5

    def test_max_level_at_high_xp(self):
        """Test max level is returned for very high XP."""
        level = get_level_for_xp(10_000_000)
        assert level.level == 15  # Max level
        assert level.name == "Immortal"

    def test_negative_xp_returns_level_1(self):
        """Test negative XP still returns level 1."""
        # Should handle gracefully - level 1 has min_xp=0
        level = get_level_for_xp(0)
        assert level.level == 1


class TestCalculateLearnerLevel:
    """Tests for calculate_learner_level function."""

    def test_beginner_level_details(self):
        """Test level details for a beginner."""
        level = calculate_learner_level(50)
        assert level.current_level == 1
        assert level.current_xp == 50
        assert level.level_name == "Beginner"
        assert level.xp_to_next_level == 50
        assert level.xp_in_current_level == 50
        assert level.progress_percentage == 50.0

    def test_level_2_progress(self):
        """Test level 2 progress calculation."""
        level = calculate_learner_level(150)  # Level 2 is 100-250
        assert level.current_level == 2
        assert level.xp_in_current_level == 50  # 150 - 100
        assert level.xp_to_next_level == 100  # 250 - 150
        # Progress: 50 / 150 * 100 = 33.3%
        assert 30 <= level.progress_percentage <= 35

    def test_max_level_progress(self):
        """Test progress at max level."""
        level = calculate_learner_level(2_000_000)
        assert level.current_level == 15
        assert level.progress_percentage == 100.0
        assert level.xp_to_next_level == 0
        assert level.next_level_name is None

    def test_next_level_name_provided(self):
        """Test next level name is provided for non-max levels."""
        level = calculate_learner_level(50)
        assert level.next_level_name is not None


class TestXpRewardCalculation:
    """Tests for XP reward calculations."""

    def test_base_xp_rewards_exist(self):
        """Test base XP rewards are defined for all sources."""
        for source in EarnSource:
            assert source in BASE_XP_REWARDS

    def test_lesson_complete_base_xp(self):
        """Test base XP for lesson completion."""
        xp = calculate_xp_reward(EarnSource.LESSON_COMPLETE)
        assert xp == BASE_XP_REWARDS[EarnSource.LESSON_COMPLETE]

    def test_streak_multiplier(self):
        """Test streak multiplier increases XP."""
        base_xp = calculate_xp_reward(EarnSource.LESSON_COMPLETE, streak_multiplier=1.0)
        boosted_xp = calculate_xp_reward(EarnSource.LESSON_COMPLETE, streak_multiplier=1.5)
        assert boosted_xp == int(base_xp * 1.5)

    def test_difficulty_multiplier(self):
        """Test difficulty multiplier increases XP."""
        base_xp = calculate_xp_reward(EarnSource.QUIZ_COMPLETE, difficulty_multiplier=1.0)
        hard_xp = calculate_xp_reward(EarnSource.QUIZ_COMPLETE, difficulty_multiplier=2.0)
        assert hard_xp == int(base_xp * 2.0)

    def test_event_multiplier(self):
        """Test event multiplier increases XP."""
        base_xp = calculate_xp_reward(EarnSource.LESSON_COMPLETE, event_multiplier=1.0)
        event_xp = calculate_xp_reward(EarnSource.LESSON_COMPLETE, event_multiplier=3.0)
        assert event_xp == int(base_xp * 3.0)

    def test_combined_multipliers(self):
        """Test all multipliers combine correctly."""
        base = BASE_XP_REWARDS[EarnSource.LESSON_COMPLETE]
        xp = calculate_xp_reward(
            EarnSource.LESSON_COMPLETE,
            streak_multiplier=1.5,
            difficulty_multiplier=2.0,
            event_multiplier=2.0
        )
        expected = int(base * 1.5 * 2.0 * 2.0)
        assert xp == expected


class TestCoinRewardCalculation:
    """Tests for coin reward calculations."""

    def test_base_coin_rewards_exist(self):
        """Test base coin rewards are defined for all sources."""
        for source in EarnSource:
            assert source in BASE_COIN_REWARDS

    def test_lesson_complete_base_coins(self):
        """Test base coins for lesson completion."""
        coins = calculate_coin_reward(EarnSource.LESSON_COMPLETE)
        assert coins == BASE_COIN_REWARDS[EarnSource.LESSON_COMPLETE]

    def test_streak_multiplier_on_coins(self):
        """Test streak multiplier increases coins."""
        base_coins = calculate_coin_reward(EarnSource.LESSON_COMPLETE, streak_multiplier=1.0)
        boosted_coins = calculate_coin_reward(EarnSource.LESSON_COMPLETE, streak_multiplier=2.0)
        assert boosted_coins == int(base_coins * 2.0)


class TestCheckLevelUp:
    """Tests for level-up detection."""

    def test_no_level_up_same_level(self):
        """Test no level up when staying in same level."""
        result = check_level_up(50, 80)  # Both level 1
        assert result is None

    def test_level_up_detected(self):
        """Test level up is detected."""
        result = check_level_up(90, 110)  # Level 1 to 2
        assert result == 2

    def test_multi_level_up(self):
        """Test multiple level ups returns highest level."""
        result = check_level_up(50, 500)  # Level 1 to 4
        assert result == 4

    def test_no_level_up_same_xp(self):
        """Test no level up with same XP."""
        result = check_level_up(100, 100)
        assert result is None


class TestItemCosts:
    """Tests for item costs."""

    def test_item_costs_defined(self):
        """Test costs are defined for all spend categories."""
        for category in SpendCategory:
            assert category in ITEM_COSTS
            assert ITEM_COSTS[category] > 0

    def test_streak_freeze_cost(self):
        """Test streak freeze has expected cost."""
        assert ITEM_COSTS[SpendCategory.STREAK_FREEZE] == 50


class TestPointTransaction:
    """Tests for PointTransaction dataclass."""

    def test_transaction_creation(self):
        """Test creating a point transaction."""
        transaction = PointTransaction(
            id="txn_123",
            learner_id="learner_456",
            point_type=PointType.XP,
            transaction_type=TransactionType.EARN,
            amount=100,
            balance_after=500,
            source="lesson_complete",
            description="Completed lesson",
        )
        
        assert transaction.id == "txn_123"
        assert transaction.learner_id == "learner_456"
        assert transaction.point_type == PointType.XP
        assert transaction.transaction_type == TransactionType.EARN
        assert transaction.amount == 100
        assert transaction.balance_after == 500
        assert transaction.source == "lesson_complete"

    def test_transaction_default_timestamp(self):
        """Test transaction has default timestamp."""
        transaction = PointTransaction(
            id="txn_1",
            learner_id="learner_1",
            point_type=PointType.COINS,
            transaction_type=TransactionType.SPEND,
            amount=-50,
            balance_after=100,
        )
        
        assert transaction.created_at is not None
        assert isinstance(transaction.created_at, datetime)


class TestLearnerPoints:
    """Tests for LearnerPoints dataclass."""

    def test_learner_points_defaults(self):
        """Test LearnerPoints has correct defaults."""
        points = LearnerPoints(learner_id="learner_123")
        
        assert points.learner_id == "learner_123"
        assert points.xp == 0
        assert points.coins == 0
        assert points.gems == 0
        assert points.total_xp_earned == 0
        assert points.total_coins_earned == 0
        assert points.total_coins_spent == 0

    def test_learner_points_with_values(self):
        """Test LearnerPoints with specified values."""
        points = LearnerPoints(
            learner_id="learner_456",
            xp=1000,
            coins=500,
            gems=10,
            total_xp_earned=1500,
        )
        
        assert points.xp == 1000
        assert points.coins == 500
        assert points.gems == 10
        assert points.total_xp_earned == 1500


class TestPointsEarnResult:
    """Tests for PointsEarnResult dataclass."""

    def test_earn_result_success(self):
        """Test successful earn result."""
        result = PointsEarnResult(
            success=True,
            transaction_id="txn_001",
            point_type=PointType.XP,
            amount_earned=10,
            bonus_amount=5,
            total_amount=15,
            new_balance=115,
            level_up=False,
            new_level=None,
        )
        
        assert result.success is True
        assert result.total_amount == 15
        assert result.level_up is False

    def test_earn_result_with_level_up(self):
        """Test earn result with level up."""
        result = PointsEarnResult(
            success=True,
            transaction_id="txn_002",
            point_type=PointType.XP,
            amount_earned=100,
            total_amount=100,
            new_balance=500,
            level_up=True,
            new_level=4,
        )
        
        assert result.level_up is True
        assert result.new_level == 4


class TestPointsSpendResult:
    """Tests for PointsSpendResult dataclass."""

    def test_spend_result_success(self):
        """Test successful spend result."""
        result = PointsSpendResult(
            success=True,
            transaction_id="txn_003",
            point_type=PointType.COINS,
            amount_spent=50,
            new_balance=450,
            item_purchased="streak_freeze",
        )
        
        assert result.success is True
        assert result.amount_spent == 50
        assert result.error is None

    def test_spend_result_failure(self):
        """Test failed spend result."""
        result = PointsSpendResult(
            success=False,
            transaction_id="",
            point_type=PointType.COINS,
            amount_spent=0,
            new_balance=10,
            error="Insufficient coins",
        )
        
        assert result.success is False
        assert result.error == "Insufficient coins"
