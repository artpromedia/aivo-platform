"""
Points System Model

Core models for the gamification points system including XP, coins, and level progression.
"""
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class PointType(str, Enum):
    """Types of points in the system."""
    XP = "xp"  # Experience points for progression
    COINS = "coins"  # Virtual currency for rewards
    GEMS = "gems"  # Premium currency


class TransactionType(str, Enum):
    """Types of point transactions."""
    EARN = "earn"
    SPEND = "spend"
    BONUS = "bonus"
    REFUND = "refund"
    ADJUSTMENT = "adjustment"


class EarnSource(str, Enum):
    """Sources of earned points."""
    LESSON_COMPLETE = "lesson_complete"
    QUIZ_COMPLETE = "quiz_complete"
    PERFECT_SCORE = "perfect_score"
    STREAK_BONUS = "streak_bonus"
    ACHIEVEMENT_UNLOCK = "achievement_unlock"
    DAILY_LOGIN = "daily_login"
    CHALLENGE_WIN = "challenge_win"
    HELP_PEER = "help_peer"
    MILESTONE_BONUS = "milestone_bonus"
    REFERRAL = "referral"
    EVENT_PARTICIPATION = "event_participation"
    LEVEL_UP_BONUS = "level_up_bonus"


class SpendCategory(str, Enum):
    """Categories for spending points."""
    STREAK_FREEZE = "streak_freeze"
    POWER_UP = "power_up"
    COSMETIC = "cosmetic"
    HINT = "hint"
    RETRY = "retry"
    DONATION = "donation"


@dataclass
class PointTransaction:
    """A single point transaction record."""
    id: str
    learner_id: str
    point_type: PointType
    transaction_type: TransactionType
    amount: int
    balance_after: int
    source: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class LevelInfo:
    """Information about a level."""
    level: int
    name: str
    min_xp: int
    max_xp: int
    icon: str
    perks: List[str] = field(default_factory=list)


@dataclass
class LearnerLevel:
    """Learner's current level status."""
    current_level: int
    current_xp: int
    xp_to_next_level: int
    xp_in_current_level: int
    progress_percentage: float
    level_name: str
    next_level_name: Optional[str] = None


@dataclass
class LearnerPoints:
    """Complete point status for a learner."""
    learner_id: str
    xp: int = 0
    coins: int = 0
    gems: int = 0
    total_xp_earned: int = 0
    total_coins_earned: int = 0
    total_coins_spent: int = 0
    level: Optional[LearnerLevel] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class PointsEarnResult:
    """Result of earning points."""
    success: bool
    transaction_id: str
    point_type: PointType
    amount_earned: int
    bonus_amount: int = 0
    total_amount: int = 0
    new_balance: int = 0
    level_up: bool = False
    new_level: Optional[int] = None
    achievements_unlocked: List[str] = field(default_factory=list)
    message: Optional[str] = None


@dataclass
class PointsSpendResult:
    """Result of spending points."""
    success: bool
    transaction_id: str
    point_type: PointType
    amount_spent: int
    new_balance: int = 0
    item_purchased: Optional[str] = None
    error: Optional[str] = None


# Level definitions with XP thresholds
LEVEL_DEFINITIONS: List[LevelInfo] = [
    LevelInfo(1, "Beginner", 0, 100, "/levels/1.svg", ["Basic lessons unlocked"]),
    LevelInfo(2, "Apprentice", 100, 250, "/levels/2.svg", ["Quiz hints available"]),
    LevelInfo(3, "Learner", 250, 500, "/levels/3.svg", ["Daily challenges unlocked"]),
    LevelInfo(4, "Student", 500, 1000, "/levels/4.svg", ["Custom avatar frames"]),
    LevelInfo(5, "Scholar", 1000, 2000, "/levels/5.svg", ["Streak freeze (1)"]),
    LevelInfo(6, "Expert", 2000, 4000, "/levels/6.svg", ["Profile themes"]),
    LevelInfo(7, "Master", 4000, 8000, "/levels/7.svg", ["Streak freeze (2)"]),
    LevelInfo(8, "Sage", 8000, 16000, "/levels/8.svg", ["Leaderboard badge"]),
    LevelInfo(9, "Wizard", 16000, 32000, "/levels/9.svg", ["Premium challenges"]),
    LevelInfo(10, "Legend", 32000, 64000, "/levels/10.svg", ["Legendary status"]),
    LevelInfo(11, "Champion", 64000, 128000, "/levels/11.svg", ["Champion crown"]),
    LevelInfo(12, "Hero", 128000, 256000, "/levels/12.svg", ["Hero badge"]),
    LevelInfo(13, "Grandmaster", 256000, 512000, "/levels/13.svg", ["GM title"]),
    LevelInfo(14, "Titan", 512000, 1000000, "/levels/14.svg", ["Titan effects"]),
    LevelInfo(15, "Immortal", 1000000, float('inf'), "/levels/15.svg", ["All perks"]),
]

# Base XP rewards for activities
BASE_XP_REWARDS: Dict[EarnSource, int] = {
    EarnSource.LESSON_COMPLETE: 10,
    EarnSource.QUIZ_COMPLETE: 15,
    EarnSource.PERFECT_SCORE: 25,
    EarnSource.STREAK_BONUS: 5,
    EarnSource.ACHIEVEMENT_UNLOCK: 50,
    EarnSource.DAILY_LOGIN: 5,
    EarnSource.CHALLENGE_WIN: 30,
    EarnSource.HELP_PEER: 10,
    EarnSource.MILESTONE_BONUS: 100,
    EarnSource.REFERRAL: 50,
    EarnSource.EVENT_PARTICIPATION: 20,
    EarnSource.LEVEL_UP_BONUS: 25,
}

# Base coin rewards for activities
BASE_COIN_REWARDS: Dict[EarnSource, int] = {
    EarnSource.LESSON_COMPLETE: 5,
    EarnSource.QUIZ_COMPLETE: 10,
    EarnSource.PERFECT_SCORE: 15,
    EarnSource.STREAK_BONUS: 3,
    EarnSource.ACHIEVEMENT_UNLOCK: 25,
    EarnSource.DAILY_LOGIN: 2,
    EarnSource.CHALLENGE_WIN: 20,
    EarnSource.HELP_PEER: 5,
    EarnSource.MILESTONE_BONUS: 50,
    EarnSource.REFERRAL: 30,
    EarnSource.EVENT_PARTICIPATION: 10,
    EarnSource.LEVEL_UP_BONUS: 15,
}

# Cost of items in coins
ITEM_COSTS: Dict[SpendCategory, int] = {
    SpendCategory.STREAK_FREEZE: 50,
    SpendCategory.POWER_UP: 20,
    SpendCategory.COSMETIC: 100,
    SpendCategory.HINT: 10,
    SpendCategory.RETRY: 15,
    SpendCategory.DONATION: 10,  # Minimum donation
}


def get_level_for_xp(xp: int) -> LevelInfo:
    """Get the level info for a given XP amount."""
    for level_info in LEVEL_DEFINITIONS:
        if level_info.min_xp <= xp < level_info.max_xp:
            return level_info
    # Return max level if XP exceeds all thresholds
    return LEVEL_DEFINITIONS[-1]


def calculate_learner_level(xp: int) -> LearnerLevel:
    """Calculate detailed level information for a learner."""
    level_info = get_level_for_xp(xp)
    
    xp_in_current = xp - level_info.min_xp
    xp_for_level = level_info.max_xp - level_info.min_xp
    
    # Handle max level case
    if level_info.max_xp == float('inf'):
        progress = 100.0
        xp_to_next = 0
        next_level_name = None
    else:
        progress = min(100.0, (xp_in_current / xp_for_level) * 100)
        xp_to_next = level_info.max_xp - xp
        # Get next level name
        next_level_idx = min(level_info.level, len(LEVEL_DEFINITIONS) - 1)
        next_level_name = LEVEL_DEFINITIONS[next_level_idx].name
    
    return LearnerLevel(
        current_level=level_info.level,
        current_xp=xp,
        xp_to_next_level=int(xp_to_next),
        xp_in_current_level=xp_in_current,
        progress_percentage=round(progress, 1),
        level_name=level_info.name,
        next_level_name=next_level_name,
    )


def calculate_xp_reward(
    source: EarnSource,
    streak_multiplier: float = 1.0,
    difficulty_multiplier: float = 1.0,
    event_multiplier: float = 1.0,
) -> int:
    """
    Calculate XP reward with multipliers.
    
    Args:
        source: Source of the XP (lesson, quiz, etc.)
        streak_multiplier: Bonus from current streak (1.0 - 2.0)
        difficulty_multiplier: Bonus for harder content (1.0 - 3.0)
        event_multiplier: Special event bonuses (1.0 - 5.0)
    
    Returns:
        Total XP to award
    """
    base_xp = BASE_XP_REWARDS.get(source, 0)
    total_multiplier = streak_multiplier * difficulty_multiplier * event_multiplier
    return int(base_xp * total_multiplier)


def calculate_coin_reward(
    source: EarnSource,
    streak_multiplier: float = 1.0,
) -> int:
    """
    Calculate coin reward.
    
    Args:
        source: Source of the coins
        streak_multiplier: Bonus from current streak
    
    Returns:
        Total coins to award
    """
    base_coins = BASE_COIN_REWARDS.get(source, 0)
    return int(base_coins * streak_multiplier)


def check_level_up(old_xp: int, new_xp: int) -> Optional[int]:
    """
    Check if XP gain resulted in a level up.
    
    Args:
        old_xp: XP before the gain
        new_xp: XP after the gain
    
    Returns:
        New level number if leveled up, None otherwise
    """
    old_level = get_level_for_xp(old_xp)
    new_level = get_level_for_xp(new_xp)
    
    if new_level.level > old_level.level:
        return new_level.level
    return None
