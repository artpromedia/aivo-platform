"""
Unit tests for Points Manager service.

Tests cover:
- Getting point balances
- Earning points (XP, coins, gems)
- Spending points
- Transaction history
- Level progression
- Administrative adjustments
"""
import pytest
from datetime import datetime
from unittest.mock import patch

from app.models.points_system import (
    EarnSource,
    PointType,
    SpendCategory,
    TransactionType,
)
from app.services.points_manager import (
    PointsManager,
    get_points_manager,
)


@pytest.fixture
def points_manager():
    """Create a fresh PointsManager for each test."""
    return PointsManager()


@pytest.fixture
def learner_with_points(points_manager):
    """Create a learner with some starting points."""
    learner_id = "test_learner_001"
    # Earn some initial points
    points_manager.earn_points(
        learner_id=learner_id,
        source=EarnSource.LESSON_COMPLETE,
        point_type=PointType.XP,
    )
    points_manager.earn_points(
        learner_id=learner_id,
        source=EarnSource.LESSON_COMPLETE,
        point_type=PointType.COINS,
    )
    return learner_id, points_manager


class TestPointsManagerInit:
    """Tests for PointsManager initialization."""

    def test_initialization(self, points_manager):
        """Test PointsManager initializes correctly."""
        assert points_manager is not None
        assert hasattr(points_manager, '_learner_points')
        assert hasattr(points_manager, '_transactions')

    def test_singleton_factory(self):
        """Test get_points_manager returns singleton."""
        pm1 = get_points_manager()
        pm2 = get_points_manager()
        assert pm1 is pm2


class TestGetBalance:
    """Tests for getting point balances."""

    def test_get_balance_new_learner(self, points_manager):
        """Test getting balance for a new learner."""
        balance = points_manager.get_balance("new_learner_001")
        
        assert balance.learner_id == "new_learner_001"
        assert balance.xp == 0
        assert balance.coins == 0
        assert balance.gems == 0
        assert balance.level is not None
        assert balance.level.current_level == 1

    def test_get_balance_includes_level(self, points_manager):
        """Test balance includes level information."""
        balance = points_manager.get_balance("learner_002")
        
        assert balance.level is not None
        assert balance.level.level_name == "Beginner"
        assert balance.level.progress_percentage >= 0

    def test_get_balance_updates_timestamp(self, points_manager):
        """Test getting balance updates the timestamp."""
        learner_id = "learner_003"
        balance1 = points_manager.get_balance(learner_id)
        time1 = balance1.updated_at
        
        # Get balance again
        balance2 = points_manager.get_balance(learner_id)
        
        assert balance2.updated_at >= time1


class TestEarnPoints:
    """Tests for earning points."""

    def test_earn_xp_from_lesson(self, points_manager):
        """Test earning XP from lesson completion."""
        result = points_manager.earn_points(
            learner_id="learner_xp_001",
            source=EarnSource.LESSON_COMPLETE,
            point_type=PointType.XP,
        )
        
        assert result.success is True
        assert result.point_type == PointType.XP
        assert result.amount_earned > 0
        assert result.new_balance > 0

    def test_earn_coins_from_quiz(self, points_manager):
        """Test earning coins from quiz completion."""
        result = points_manager.earn_points(
            learner_id="learner_coin_001",
            source=EarnSource.QUIZ_COMPLETE,
            point_type=PointType.COINS,
        )
        
        assert result.success is True
        assert result.point_type == PointType.COINS
        assert result.amount_earned > 0

    def test_earn_with_streak_multiplier(self, points_manager):
        """Test streak multiplier increases earnings."""
        learner_id = "learner_streak_001"
        
        # Base earnings
        result1 = points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.LESSON_COMPLETE,
            point_type=PointType.XP,
            streak_multiplier=1.0,
        )
        base_xp = result1.total_amount
        
        # With streak multiplier (different learner for clean comparison)
        result2 = points_manager.earn_points(
            learner_id="learner_streak_002",
            source=EarnSource.LESSON_COMPLETE,
            point_type=PointType.XP,
            streak_multiplier=1.5,
        )
        
        assert result2.total_amount > base_xp
        assert result2.bonus_amount > 0

    def test_earn_with_difficulty_multiplier(self, points_manager):
        """Test difficulty multiplier increases XP."""
        result = points_manager.earn_points(
            learner_id="learner_diff_001",
            source=EarnSource.QUIZ_COMPLETE,
            point_type=PointType.XP,
            difficulty_multiplier=2.5,
        )
        
        assert result.bonus_amount > 0
        assert result.total_amount > result.amount_earned

    def test_earn_with_event_multiplier(self, points_manager):
        """Test event multiplier increases earnings."""
        result = points_manager.earn_points(
            learner_id="learner_event_001",
            source=EarnSource.LESSON_COMPLETE,
            point_type=PointType.XP,
            event_multiplier=3.0,
        )
        
        assert result.bonus_amount > 0

    def test_earn_custom_amount(self, points_manager):
        """Test earning a custom amount."""
        result = points_manager.earn_points(
            learner_id="learner_custom_001",
            source=EarnSource.MILESTONE_BONUS,
            point_type=PointType.XP,
            custom_amount=500,
        )
        
        assert result.total_amount == 500
        assert result.new_balance == 500

    def test_earn_gems(self, points_manager):
        """Test earning gems."""
        result = points_manager.earn_points(
            learner_id="learner_gem_001",
            source=EarnSource.ACHIEVEMENT_UNLOCK,
            point_type=PointType.GEMS,
            custom_amount=5,
        )
        
        assert result.success is True
        assert result.point_type == PointType.GEMS
        assert result.new_balance == 5

    def test_earn_creates_transaction(self, points_manager):
        """Test earning creates a transaction record."""
        learner_id = "learner_txn_001"
        
        points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.LESSON_COMPLETE,
            point_type=PointType.XP,
        )
        
        transactions, total = points_manager.get_transaction_history(learner_id)
        assert total >= 1
        assert transactions[0].transaction_type == TransactionType.EARN

    def test_earn_with_metadata(self, points_manager):
        """Test earning with metadata."""
        result = points_manager.earn_points(
            learner_id="learner_meta_001",
            source=EarnSource.LESSON_COMPLETE,
            point_type=PointType.XP,
            metadata={"lesson_id": "lesson_123", "subject": "math"},
        )
        
        assert result.success is True

    def test_multiple_earnings_accumulate(self, points_manager):
        """Test multiple earnings accumulate correctly."""
        learner_id = "learner_acc_001"
        
        # First earning
        result1 = points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.LESSON_COMPLETE,
            point_type=PointType.XP,
        )
        first_balance = result1.new_balance
        
        # Second earning
        result2 = points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.QUIZ_COMPLETE,
            point_type=PointType.XP,
        )
        
        assert result2.new_balance == first_balance + result2.total_amount


class TestLevelUp:
    """Tests for level-up functionality."""

    def test_level_up_detection(self, points_manager):
        """Test level up is detected when earning enough XP."""
        learner_id = "learner_lvlup_001"
        
        # Earn enough XP to level up (level 2 at 100 XP)
        result = points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.MILESTONE_BONUS,
            point_type=PointType.XP,
            custom_amount=100,
        )
        
        assert result.level_up is True
        assert result.new_level == 2

    def test_level_up_awards_bonus_coins(self, points_manager):
        """Test level up awards bonus coins."""
        learner_id = "learner_lvlbonus_001"
        
        # Level up
        points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.MILESTONE_BONUS,
            point_type=PointType.XP,
            custom_amount=100,
        )
        
        # Check coin balance
        balance = points_manager.get_balance(learner_id)
        assert balance.coins > 0  # Level up bonus

    def test_no_level_up_for_small_gain(self, points_manager):
        """Test no level up for small XP gains."""
        learner_id = "learner_nolvl_001"
        
        result = points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.LESSON_COMPLETE,
            point_type=PointType.XP,
            custom_amount=10,
        )
        
        assert result.level_up is False
        assert result.new_level is None


class TestSpendPoints:
    """Tests for spending points."""

    def test_spend_coins_success(self, learner_with_points):
        """Test successfully spending coins."""
        learner_id, pm = learner_with_points
        
        # Give more coins
        pm.earn_points(
            learner_id=learner_id,
            source=EarnSource.MILESTONE_BONUS,
            point_type=PointType.COINS,
            custom_amount=100,
        )
        
        result = pm.spend_points(
            learner_id=learner_id,
            category=SpendCategory.STREAK_FREEZE,
            point_type=PointType.COINS,
        )
        
        assert result.success is True
        assert result.amount_spent == 50  # Streak freeze cost
        assert result.item_purchased == "streak_freeze"

    def test_spend_insufficient_balance(self, points_manager):
        """Test spending fails with insufficient balance."""
        learner_id = "learner_broke_001"
        
        result = points_manager.spend_points(
            learner_id=learner_id,
            category=SpendCategory.COSMETIC,
            point_type=PointType.COINS,
        )
        
        assert result.success is False
        assert "Insufficient" in result.error

    def test_spend_xp_not_allowed(self, points_manager):
        """Test XP cannot be spent."""
        learner_id = "learner_xpspend_001"
        
        # Give some XP
        points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.MILESTONE_BONUS,
            point_type=PointType.XP,
            custom_amount=1000,
        )
        
        result = points_manager.spend_points(
            learner_id=learner_id,
            category=SpendCategory.POWER_UP,
            point_type=PointType.XP,
        )
        
        assert result.success is False
        assert "XP cannot be spent" in result.error

    def test_spend_custom_amount(self, points_manager):
        """Test spending a custom amount."""
        learner_id = "learner_custom_spend_001"
        
        # Give coins
        points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.MILESTONE_BONUS,
            point_type=PointType.COINS,
            custom_amount=200,
        )
        
        result = points_manager.spend_points(
            learner_id=learner_id,
            category=SpendCategory.DONATION,
            point_type=PointType.COINS,
            custom_amount=75,
        )
        
        assert result.success is True
        assert result.amount_spent == 75
        assert result.new_balance == 125

    def test_spend_gems(self, points_manager):
        """Test spending gems."""
        learner_id = "learner_gem_spend_001"
        
        # Give gems
        points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.ACHIEVEMENT_UNLOCK,
            point_type=PointType.GEMS,
            custom_amount=20,
        )
        
        result = points_manager.spend_points(
            learner_id=learner_id,
            category=SpendCategory.COSMETIC,
            point_type=PointType.GEMS,
            custom_amount=10,
        )
        
        assert result.success is True
        assert result.new_balance == 10

    def test_spend_creates_transaction(self, points_manager):
        """Test spending creates a transaction record."""
        learner_id = "learner_spend_txn_001"
        
        # Give coins
        points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.MILESTONE_BONUS,
            point_type=PointType.COINS,
            custom_amount=100,
        )
        
        points_manager.spend_points(
            learner_id=learner_id,
            category=SpendCategory.HINT,
            point_type=PointType.COINS,
        )
        
        transactions, total = points_manager.get_transaction_history(
            learner_id,
            transaction_type=TransactionType.SPEND,
        )
        
        assert len(transactions) >= 1
        assert transactions[0].transaction_type == TransactionType.SPEND
        assert transactions[0].amount < 0


class TestTransactionHistory:
    """Tests for transaction history."""

    def test_history_returns_transactions(self, learner_with_points):
        """Test history returns transaction list."""
        learner_id, pm = learner_with_points
        
        transactions, total = pm.get_transaction_history(learner_id)
        
        assert total >= 2  # At least 2 transactions from fixture
        assert len(transactions) <= total

    def test_history_filter_by_point_type(self, learner_with_points):
        """Test filtering history by point type."""
        learner_id, pm = learner_with_points
        
        xp_transactions, total = pm.get_transaction_history(
            learner_id,
            point_type=PointType.XP,
        )
        
        for txn in xp_transactions:
            assert txn.point_type == PointType.XP

    def test_history_filter_by_transaction_type(self, points_manager):
        """Test filtering history by transaction type."""
        learner_id = "learner_filter_001"
        
        # Create some transactions
        points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.LESSON_COMPLETE,
            point_type=PointType.COINS,
            custom_amount=100,
        )
        points_manager.spend_points(
            learner_id=learner_id,
            category=SpendCategory.HINT,
            point_type=PointType.COINS,
        )
        
        spend_txns, _ = points_manager.get_transaction_history(
            learner_id,
            transaction_type=TransactionType.SPEND,
        )
        
        for txn in spend_txns:
            assert txn.transaction_type == TransactionType.SPEND

    def test_history_pagination(self, points_manager):
        """Test transaction history pagination."""
        learner_id = "learner_page_001"
        
        # Create many transactions
        for i in range(10):
            points_manager.earn_points(
                learner_id=learner_id,
                source=EarnSource.DAILY_LOGIN,
                point_type=PointType.XP,
            )
        
        # Get first page
        page1, total = points_manager.get_transaction_history(
            learner_id,
            limit=5,
            offset=0,
        )
        
        # Get second page
        page2, _ = points_manager.get_transaction_history(
            learner_id,
            limit=5,
            offset=5,
        )
        
        assert len(page1) == 5
        assert len(page2) == 5
        assert page1[0].id != page2[0].id

    def test_history_sorted_newest_first(self, points_manager):
        """Test history is sorted newest first."""
        learner_id = "learner_sort_001"
        
        # Create transactions
        points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.LESSON_COMPLETE,
            point_type=PointType.XP,
        )
        points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.QUIZ_COMPLETE,
            point_type=PointType.XP,
        )
        
        transactions, _ = points_manager.get_transaction_history(learner_id)
        
        if len(transactions) >= 2:
            assert transactions[0].created_at >= transactions[1].created_at


class TestLevelProgress:
    """Tests for level progress retrieval."""

    def test_get_level_progress(self, points_manager):
        """Test getting level progress."""
        learner_id = "learner_lvl_001"
        
        points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.MILESTONE_BONUS,
            point_type=PointType.XP,
            custom_amount=150,
        )
        
        progress = points_manager.get_level_progress(learner_id)
        
        assert progress.current_level == 2
        assert progress.current_xp == 150
        assert progress.level_name == "Apprentice"

    def test_level_progress_percentage(self, points_manager):
        """Test level progress percentage calculation."""
        learner_id = "learner_pct_001"
        
        # Earn 50 XP (50% of level 1: 0-100)
        points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.MILESTONE_BONUS,
            point_type=PointType.XP,
            custom_amount=50,
        )
        
        progress = points_manager.get_level_progress(learner_id)
        
        assert 45 <= progress.progress_percentage <= 55


class TestLeaderboardScore:
    """Tests for leaderboard score retrieval."""

    def test_get_leaderboard_score(self, points_manager):
        """Test getting leaderboard score."""
        learner_id = "learner_lb_001"
        
        points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.MILESTONE_BONUS,
            point_type=PointType.XP,
            custom_amount=500,
        )
        
        score = points_manager.get_leaderboard_score(learner_id)
        
        assert score["xp"] == 500
        assert score["total_xp_earned"] == 500
        assert score["level"] >= 1
        assert "coins" in score


class TestAdjustPoints:
    """Tests for administrative point adjustments."""

    def test_adjust_positive_xp(self, points_manager):
        """Test positive XP adjustment."""
        learner_id = "learner_adj_001"
        
        result = points_manager.adjust_points(
            learner_id=learner_id,
            point_type=PointType.XP,
            amount=100,
            reason="Bug fix compensation",
            admin_id="admin_001",
        )
        
        assert result.success is True
        assert result.new_balance == 100

    def test_adjust_negative_xp(self, points_manager):
        """Test negative XP adjustment."""
        learner_id = "learner_adj_002"
        
        # Give some XP first
        points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.MILESTONE_BONUS,
            point_type=PointType.XP,
            custom_amount=500,
        )
        
        result = points_manager.adjust_points(
            learner_id=learner_id,
            point_type=PointType.XP,
            amount=-100,
            reason="Cheating penalty",
        )
        
        assert result.success is True
        assert result.new_balance == 400

    def test_adjust_cannot_go_negative(self, points_manager):
        """Test adjustment cannot make balance negative."""
        learner_id = "learner_adj_003"
        
        # Give 50 XP
        points_manager.earn_points(
            learner_id=learner_id,
            source=EarnSource.DAILY_LOGIN,
            point_type=PointType.XP,
            custom_amount=50,
        )
        
        # Try to remove 100
        result = points_manager.adjust_points(
            learner_id=learner_id,
            point_type=PointType.XP,
            amount=-100,
            reason="Test adjustment",
        )
        
        assert result.success is True
        assert result.new_balance == 0  # Clamped to 0

    def test_adjust_coins(self, points_manager):
        """Test coin adjustment."""
        learner_id = "learner_adj_004"
        
        result = points_manager.adjust_points(
            learner_id=learner_id,
            point_type=PointType.COINS,
            amount=500,
            reason="Customer service gift",
        )
        
        assert result.success is True
        assert result.new_balance == 500

    def test_adjust_creates_transaction(self, points_manager):
        """Test adjustment creates transaction record."""
        learner_id = "learner_adj_005"
        
        points_manager.adjust_points(
            learner_id=learner_id,
            point_type=PointType.XP,
            amount=100,
            reason="Manual adjustment",
            admin_id="admin_002",
        )
        
        transactions, _ = points_manager.get_transaction_history(learner_id)
        
        assert len(transactions) >= 1
        assert transactions[0].transaction_type == TransactionType.ADJUSTMENT
