"""
Points Manager Service

Service for managing learner points, transactions, and level progression.
"""
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.models.points_system import (
    BASE_COIN_REWARDS,
    BASE_XP_REWARDS,
    EarnSource,
    LearnerLevel,
    LearnerPoints,
    LevelInfo,
    PointsEarnResult,
    PointsSpendResult,
    PointTransaction,
    PointType,
    SpendCategory,
    TransactionType,
    calculate_coin_reward,
    calculate_learner_level,
    calculate_xp_reward,
    check_level_up,
    get_level_for_xp,
    ITEM_COSTS,
)

logger = logging.getLogger(__name__)


class PointsManager:
    """
    Manage learner points including XP, coins, and gems.
    
    Features:
    - Earn points from various activities
    - Spend coins on items
    - Track transaction history
    - Level progression
    - Multiplier support (streak, event, difficulty)
    
    Usage:
        manager = PointsManager()
        result = manager.earn_points("learner123", EarnSource.LESSON_COMPLETE)
        balance = manager.get_balance("learner123")
    """
    
    # Transaction history limits
    MAX_HISTORY_ITEMS = 100
    HISTORY_RETENTION_DAYS = 90
    
    def __init__(self):
        """Initialize the points manager."""
        # In-memory storage (in production, use database)
        self._learner_points: Dict[str, LearnerPoints] = {}
        self._transactions: Dict[str, List[PointTransaction]] = {}
        
        logger.info("PointsManager initialized")
    
    def get_balance(self, learner_id: str) -> LearnerPoints:
        """
        Get current point balances for a learner.
        
        Args:
            learner_id: Unique identifier for the learner
            
        Returns:
            LearnerPoints with current balances and level info
        """
        points = self._get_or_create_learner_points(learner_id)
        
        # Update level info
        points.level = calculate_learner_level(points.xp)
        points.updated_at = datetime.now(timezone.utc)
        
        return points
    
    def earn_points(
        self,
        learner_id: str,
        source: EarnSource,
        point_type: PointType = PointType.XP,
        custom_amount: Optional[int] = None,
        streak_multiplier: float = 1.0,
        difficulty_multiplier: float = 1.0,
        event_multiplier: float = 1.0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> PointsEarnResult:
        """
        Award points to a learner.
        
        Args:
            learner_id: Unique identifier for the learner
            source: Source of the points (lesson, quiz, etc.)
            point_type: Type of points to earn (XP, coins, gems)
            custom_amount: Override default amount
            streak_multiplier: Bonus from current streak (1.0 - 2.0)
            difficulty_multiplier: Bonus for harder content (1.0 - 3.0)
            event_multiplier: Special event bonuses (1.0 - 5.0)
            metadata: Additional context about the transaction
            
        Returns:
            PointsEarnResult with details of the award
        """
        points = self._get_or_create_learner_points(learner_id)
        
        # Calculate the amount to award
        if custom_amount is not None:
            base_amount = custom_amount
            bonus_amount = 0
        elif point_type == PointType.XP:
            base_amount = BASE_XP_REWARDS.get(source, 0)
            final_amount = calculate_xp_reward(
                source, streak_multiplier, difficulty_multiplier, event_multiplier
            )
            bonus_amount = final_amount - base_amount
        elif point_type == PointType.COINS:
            base_amount = BASE_COIN_REWARDS.get(source, 0)
            final_amount = calculate_coin_reward(source, streak_multiplier)
            bonus_amount = final_amount - base_amount
        else:
            base_amount = 0
            bonus_amount = 0
        
        total_amount = base_amount + bonus_amount
        
        # Store old XP for level-up check
        old_xp = points.xp
        
        # Update balance
        if point_type == PointType.XP:
            points.xp += total_amount
            points.total_xp_earned += total_amount
            new_balance = points.xp
        elif point_type == PointType.COINS:
            points.coins += total_amount
            points.total_coins_earned += total_amount
            new_balance = points.coins
        elif point_type == PointType.GEMS:
            points.gems += total_amount
            new_balance = points.gems
        else:
            new_balance = 0
        
        points.updated_at = datetime.now(timezone.utc)
        
        # Create transaction record
        transaction_id = str(uuid.uuid4())
        transaction = PointTransaction(
            id=transaction_id,
            learner_id=learner_id,
            point_type=point_type,
            transaction_type=TransactionType.EARN,
            amount=total_amount,
            balance_after=new_balance,
            source=source.value,
            description=f"Earned {total_amount} {point_type.value} from {source.value}",
            metadata=metadata,
        )
        self._add_transaction(learner_id, transaction)
        
        # Check for level up
        level_up = False
        new_level = None
        achievements_unlocked = []
        
        if point_type == PointType.XP:
            new_level = check_level_up(old_xp, points.xp)
            if new_level:
                level_up = True
                # Award level-up bonus coins
                self._award_level_up_bonus(learner_id, new_level)
        
        return PointsEarnResult(
            success=True,
            transaction_id=transaction_id,
            point_type=point_type,
            amount_earned=base_amount,
            bonus_amount=bonus_amount,
            total_amount=total_amount,
            new_balance=new_balance,
            level_up=level_up,
            new_level=new_level,
            achievements_unlocked=achievements_unlocked,
            message=f"Earned {total_amount} {point_type.value}!",
        )
    
    def spend_points(
        self,
        learner_id: str,
        category: SpendCategory,
        point_type: PointType = PointType.COINS,
        custom_amount: Optional[int] = None,
        item_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> PointsSpendResult:
        """
        Spend points on an item or service.
        
        Args:
            learner_id: Unique identifier for the learner
            category: Category of item being purchased
            point_type: Type of points to spend
            custom_amount: Override default cost
            item_id: Specific item being purchased
            metadata: Additional context
            
        Returns:
            PointsSpendResult with transaction details
        """
        points = self._get_or_create_learner_points(learner_id)
        
        # Get the cost
        amount = custom_amount if custom_amount is not None else ITEM_COSTS.get(category, 0)
        
        # Check balance
        if point_type == PointType.COINS:
            current_balance = points.coins
        elif point_type == PointType.GEMS:
            current_balance = points.gems
        elif point_type == PointType.XP:
            return PointsSpendResult(
                success=False,
                transaction_id="",
                point_type=point_type,
                amount_spent=0,
                new_balance=points.xp,
                error="XP cannot be spent",
            )
        else:
            current_balance = 0
        
        if current_balance < amount:
            return PointsSpendResult(
                success=False,
                transaction_id="",
                point_type=point_type,
                amount_spent=0,
                new_balance=current_balance,
                error=f"Insufficient {point_type.value}. Need {amount}, have {current_balance}",
            )
        
        # Deduct points
        if point_type == PointType.COINS:
            points.coins -= amount
            points.total_coins_spent += amount
            new_balance = points.coins
        elif point_type == PointType.GEMS:
            points.gems -= amount
            new_balance = points.gems
        else:
            new_balance = 0
        
        points.updated_at = datetime.now(timezone.utc)
        
        # Create transaction record
        transaction_id = str(uuid.uuid4())
        transaction = PointTransaction(
            id=transaction_id,
            learner_id=learner_id,
            point_type=point_type,
            transaction_type=TransactionType.SPEND,
            amount=-amount,
            balance_after=new_balance,
            category=category.value,
            description=f"Spent {amount} {point_type.value} on {category.value}",
            metadata={**(metadata or {}), "item_id": item_id} if item_id else metadata,
        )
        self._add_transaction(learner_id, transaction)
        
        return PointsSpendResult(
            success=True,
            transaction_id=transaction_id,
            point_type=point_type,
            amount_spent=amount,
            new_balance=new_balance,
            item_purchased=item_id or category.value,
        )
    
    def get_transaction_history(
        self,
        learner_id: str,
        point_type: Optional[PointType] = None,
        transaction_type: Optional[TransactionType] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[PointTransaction], int]:
        """
        Get transaction history for a learner.
        
        Args:
            learner_id: Unique identifier for the learner
            point_type: Filter by point type
            transaction_type: Filter by transaction type
            limit: Maximum number of transactions to return
            offset: Number of transactions to skip
            
        Returns:
            Tuple of (transactions list, total count)
        """
        all_transactions = self._transactions.get(learner_id, [])
        
        # Apply filters
        filtered = all_transactions
        if point_type:
            filtered = [t for t in filtered if t.point_type == point_type]
        if transaction_type:
            filtered = [t for t in filtered if t.transaction_type == transaction_type]
        
        # Sort by date (newest first)
        filtered.sort(key=lambda t: t.created_at, reverse=True)
        
        # Apply pagination
        total = len(filtered)
        paginated = filtered[offset:offset + limit]
        
        return paginated, total
    
    def get_level_progress(self, learner_id: str) -> LearnerLevel:
        """
        Get detailed level progress for a learner.
        
        Args:
            learner_id: Unique identifier for the learner
            
        Returns:
            LearnerLevel with progression details
        """
        points = self._get_or_create_learner_points(learner_id)
        return calculate_learner_level(points.xp)
    
    def get_leaderboard_score(self, learner_id: str) -> Dict[str, int]:
        """
        Get a learner's scores for leaderboard purposes.
        
        Args:
            learner_id: Unique identifier for the learner
            
        Returns:
            Dictionary with various score metrics
        """
        points = self._get_or_create_learner_points(learner_id)
        level = calculate_learner_level(points.xp)
        
        return {
            "xp": points.xp,
            "total_xp_earned": points.total_xp_earned,
            "level": level.current_level,
            "coins": points.coins,
        }
    
    def adjust_points(
        self,
        learner_id: str,
        point_type: PointType,
        amount: int,
        reason: str,
        admin_id: Optional[str] = None,
    ) -> PointsEarnResult:
        """
        Administrative adjustment of points.
        
        Args:
            learner_id: Unique identifier for the learner
            point_type: Type of points to adjust
            amount: Amount to add (positive) or remove (negative)
            reason: Reason for the adjustment
            admin_id: ID of the admin making the adjustment
            
        Returns:
            PointsEarnResult with adjustment details
        """
        points = self._get_or_create_learner_points(learner_id)
        
        # Update balance
        if point_type == PointType.XP:
            points.xp = max(0, points.xp + amount)  # Don't go negative
            new_balance = points.xp
        elif point_type == PointType.COINS:
            points.coins = max(0, points.coins + amount)
            new_balance = points.coins
        elif point_type == PointType.GEMS:
            points.gems = max(0, points.gems + amount)
            new_balance = points.gems
        else:
            return PointsEarnResult(
                success=False,
                transaction_id="",
                point_type=point_type,
                amount_earned=0,
                new_balance=0,
                message="Invalid point type",
            )
        
        points.updated_at = datetime.now(timezone.utc)
        
        # Create transaction record
        transaction_id = str(uuid.uuid4())
        transaction = PointTransaction(
            id=transaction_id,
            learner_id=learner_id,
            point_type=point_type,
            transaction_type=TransactionType.ADJUSTMENT,
            amount=amount,
            balance_after=new_balance,
            description=f"Adjustment: {reason}",
            metadata={"admin_id": admin_id, "reason": reason},
        )
        self._add_transaction(learner_id, transaction)
        
        return PointsEarnResult(
            success=True,
            transaction_id=transaction_id,
            point_type=point_type,
            amount_earned=amount,
            total_amount=amount,
            new_balance=new_balance,
            message=f"Adjusted {point_type.value} by {amount}",
        )
    
    def _get_or_create_learner_points(self, learner_id: str) -> LearnerPoints:
        """Get or create a learner's points record."""
        if learner_id not in self._learner_points:
            self._learner_points[learner_id] = LearnerPoints(
                learner_id=learner_id,
                level=calculate_learner_level(0),
            )
        return self._learner_points[learner_id]
    
    def _add_transaction(self, learner_id: str, transaction: PointTransaction):
        """Add a transaction to history."""
        if learner_id not in self._transactions:
            self._transactions[learner_id] = []
        
        self._transactions[learner_id].append(transaction)
        
        # Trim old transactions
        if len(self._transactions[learner_id]) > self.MAX_HISTORY_ITEMS:
            self._transactions[learner_id] = self._transactions[learner_id][-self.MAX_HISTORY_ITEMS:]
    
    def _award_level_up_bonus(self, learner_id: str, new_level: int):
        """Award bonus coins for leveling up."""
        bonus_coins = new_level * 10  # 10 coins per level
        
        points = self._get_or_create_learner_points(learner_id)
        points.coins += bonus_coins
        points.total_coins_earned += bonus_coins
        
        transaction = PointTransaction(
            id=str(uuid.uuid4()),
            learner_id=learner_id,
            point_type=PointType.COINS,
            transaction_type=TransactionType.BONUS,
            amount=bonus_coins,
            balance_after=points.coins,
            source=EarnSource.LEVEL_UP_BONUS.value,
            description=f"Level up bonus for reaching level {new_level}",
        )
        self._add_transaction(learner_id, transaction)
        
        logger.info(f"Awarded {bonus_coins} coins to {learner_id} for reaching level {new_level}")


# Singleton instance
_points_manager: Optional[PointsManager] = None


def get_points_manager() -> PointsManager:
    """Get the singleton PointsManager instance."""
    global _points_manager
    if _points_manager is None:
        _points_manager = PointsManager()
    return _points_manager
