"""
Streak Tracker

Track and manage learning streaks with bonus multipliers.
"""
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, date
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class StreakType(str, Enum):
    """Types of streaks to track."""
    DAILY = "daily"
    PRACTICE = "practice"
    PERFECT_SCORE = "perfect_score"
    HELP_GIVEN = "help_given"
    CHALLENGE = "challenge"


class StreakStatus(str, Enum):
    """Status of a streak update."""
    CONTINUED = "continued"
    EXTENDED = "extended"
    BROKEN = "broken"
    RESET = "reset"
    FROZEN = "frozen"


@dataclass
class StreakInfo:
    """Information about a specific streak."""
    streak_type: StreakType
    current_count: int
    best_count: int
    last_activity: Optional[datetime]
    started_at: Optional[datetime]
    is_at_risk: bool = False
    hours_until_expiry: float = 0.0
    freezes_used: int = 0
    freezes_available: int = 0


@dataclass
class StreakUpdateResult:
    """Result of a streak update operation."""
    streak_type: StreakType
    status: StreakStatus
    previous_count: int
    new_count: int
    bonus_multiplier: float
    is_milestone: bool
    milestone_type: Optional[str] = None
    xp_bonus: int = 0


@dataclass
class LearnerStreaks:
    """All streaks for a learner."""
    learner_id: str
    streaks: Dict[str, StreakInfo] = field(default_factory=dict)
    total_streak_days: int = 0
    longest_streak_ever: int = 0
    streak_freezes_available: int = 2


class StreakTracker:
    """
    Track and manage learning streaks.

    Streak types:
    - Daily login/activity
    - Practice sessions
    - Perfect scores
    - Help given to peers

    Features:
    - Streak bonus multipliers
    - Milestone rewards
    - Streak freeze protection
    - At-risk notifications

    Usage:
        tracker = StreakTracker()
        result = tracker.track_streak(learner_id, "daily")
    """

    # Streak configuration
    STREAK_EXPIRY_HOURS = 36  # Hours before streak expires (allows some buffer)
    AT_RISK_HOURS = 20  # Hours remaining when streak is "at risk"

    # Milestone thresholds
    MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365]

    # Bonus multiplier configuration
    BASE_BONUS = 1.0
    BONUS_PER_DAY = 0.02  # 2% increase per streak day
    MAX_BONUS = 2.0  # Maximum 2x multiplier

    # Streak-specific bonuses
    STREAK_BONUSES = {
        StreakType.DAILY: {"base": 1.0, "per_day": 0.02, "max": 2.0},
        StreakType.PRACTICE: {"base": 1.0, "per_day": 0.01, "max": 1.5},
        StreakType.PERFECT_SCORE: {"base": 1.1, "per_day": 0.03, "max": 2.5},
        StreakType.HELP_GIVEN: {"base": 1.0, "per_day": 0.015, "max": 1.8},
        StreakType.CHALLENGE: {"base": 1.05, "per_day": 0.025, "max": 2.0},
    }

    # XP bonuses for milestones
    MILESTONE_XP_BONUSES = {
        3: 25,
        7: 75,
        14: 150,
        30: 300,
        60: 500,
        100: 1000,
        180: 2000,
        365: 5000,
    }

    def __init__(self):
        """Initialize the streak tracker."""
        # In-memory storage (in production, use database)
        self._learner_streaks: Dict[str, LearnerStreaks] = {}

        logger.info("StreakTracker initialized")

    def track_streak(
        self,
        learner_id: str,
        activity_type: str,
        activity_timestamp: Optional[datetime] = None,
    ) -> StreakUpdateResult:
        """
        Track a streak-eligible activity.

        Args:
            learner_id: Unique identifier for the learner
            activity_type: Type of activity (maps to streak type)
            activity_timestamp: When the activity occurred (default: now)

        Returns:
            StreakUpdateResult with status and bonus information
        """
        timestamp = activity_timestamp or datetime.utcnow()
        streak_type = self._map_activity_to_streak_type(activity_type)

        # Get or create learner's streaks
        learner_streaks = self._get_or_create_learner_streaks(learner_id)

        # Get or create the specific streak
        streak = self._get_or_create_streak(learner_streaks, streak_type)

        # Update the streak
        result = self.update_streak(learner_id, streak_type, timestamp)

        return result

    def update_streak(
        self,
        learner_id: str,
        streak_type: StreakType,
        activity_timestamp: Optional[datetime] = None,
    ) -> StreakUpdateResult:
        """
        Update streak status based on new activity.

        Args:
            learner_id: Unique identifier for the learner
            streak_type: Type of streak to update
            activity_timestamp: When the activity occurred

        Returns:
            StreakUpdateResult with updated status
        """
        timestamp = activity_timestamp or datetime.utcnow()
        learner_streaks = self._get_or_create_learner_streaks(learner_id)
        streak = self._get_or_create_streak(learner_streaks, streak_type)

        previous_count = streak.current_count
        status = StreakStatus.CONTINUED
        is_milestone = False
        milestone_type = None

        if streak.last_activity is None:
            # First activity - start the streak
            streak.current_count = 1
            streak.best_count = 1
            streak.started_at = timestamp
            status = StreakStatus.EXTENDED
        else:
            # Check if this is the same day
            last_date = streak.last_activity.date()
            current_date = timestamp.date()

            if current_date == last_date:
                # Same day - streak continues but doesn't increase
                status = StreakStatus.CONTINUED
            elif current_date == last_date + timedelta(days=1):
                # Next day - streak extends
                streak.current_count += 1
                status = StreakStatus.EXTENDED
            else:
                # Check if expired
                hours_since = (timestamp - streak.last_activity).total_seconds() / 3600

                if hours_since <= self.STREAK_EXPIRY_HOURS:
                    # Within grace period - extend
                    streak.current_count += 1
                    status = StreakStatus.EXTENDED
                else:
                    # Streak broken - check for freeze
                    if streak.freezes_available > 0:
                        streak.freezes_available -= 1
                        streak.freezes_used += 1
                        status = StreakStatus.FROZEN
                        # Don't reset, just continue
                        streak.current_count += 1
                    else:
                        # No freeze available - reset streak
                        streak.current_count = 1
                        streak.started_at = timestamp
                        status = StreakStatus.RESET

        # Update last activity
        streak.last_activity = timestamp

        # Update best count
        if streak.current_count > streak.best_count:
            streak.best_count = streak.current_count

        # Check for milestone
        if streak.current_count in self.MILESTONES and status == StreakStatus.EXTENDED:
            is_milestone = True
            milestone_type = f"{streak.current_count}_day"

        # Update learner totals if this is the daily streak
        if streak_type == StreakType.DAILY:
            learner_streaks.total_streak_days = streak.current_count
            if streak.current_count > learner_streaks.longest_streak_ever:
                learner_streaks.longest_streak_ever = streak.current_count

        # Calculate bonus multiplier
        bonus_multiplier = self.compute_streak_bonus(streak.current_count, streak_type)

        # Calculate XP bonus for milestone
        xp_bonus = 0
        if is_milestone and streak.current_count in self.MILESTONE_XP_BONUSES:
            xp_bonus = self.MILESTONE_XP_BONUSES[streak.current_count]

        # Update at-risk status
        self._update_at_risk_status(streak)

        logger.info(
            "Streak updated for %s: %s %d -> %d (%s)",
            learner_id,
            streak_type.value,
            previous_count,
            streak.current_count,
            status.value,
        )

        return StreakUpdateResult(
            streak_type=streak_type,
            status=status,
            previous_count=previous_count,
            new_count=streak.current_count,
            bonus_multiplier=bonus_multiplier,
            is_milestone=is_milestone,
            milestone_type=milestone_type,
            xp_bonus=xp_bonus,
        )

    def compute_streak_bonus(
        self,
        streak_count: int,
        streak_type: StreakType = StreakType.DAILY,
    ) -> float:
        """
        Compute streak bonus multiplier.

        Args:
            streak_count: Current streak count
            streak_type: Type of streak

        Returns:
            Bonus multiplier (1.0 = no bonus, 2.0 = 100% bonus)
        """
        config = self.STREAK_BONUSES.get(streak_type, {
            "base": self.BASE_BONUS,
            "per_day": self.BONUS_PER_DAY,
            "max": self.MAX_BONUS,
        })

        base = config["base"]
        per_day = config["per_day"]
        max_bonus = config["max"]

        # Calculate bonus: base + (per_day * streak_count)
        bonus = base + (per_day * max(0, streak_count - 1))

        # Cap at maximum
        bonus = min(bonus, max_bonus)

        return round(bonus, 3)

    def get_streaks(
        self,
        learner_id: str,
    ) -> Dict[str, StreakInfo]:
        """
        Get all streaks for a learner.

        Args:
            learner_id: Unique identifier for the learner

        Returns:
            Dictionary of streak type to StreakInfo
        """
        learner_streaks = self._get_or_create_learner_streaks(learner_id)

        # Update at-risk status for all streaks
        for streak in learner_streaks.streaks.values():
            self._update_at_risk_status(streak)

        return learner_streaks.streaks

    def get_streak(
        self,
        learner_id: str,
        streak_type: StreakType,
    ) -> StreakInfo:
        """
        Get a specific streak for a learner.

        Args:
            learner_id: Unique identifier for the learner
            streak_type: Type of streak to get

        Returns:
            StreakInfo for the specified streak
        """
        learner_streaks = self._get_or_create_learner_streaks(learner_id)
        streak = self._get_or_create_streak(learner_streaks, streak_type)
        self._update_at_risk_status(streak)
        return streak

    def check_streak_at_risk(
        self,
        learner_id: str,
    ) -> List[StreakInfo]:
        """
        Check which streaks are at risk of breaking.

        Args:
            learner_id: Unique identifier for the learner

        Returns:
            List of StreakInfo for at-risk streaks
        """
        learner_streaks = self._get_or_create_learner_streaks(learner_id)
        at_risk_streaks: List[StreakInfo] = []

        for streak in learner_streaks.streaks.values():
            self._update_at_risk_status(streak)
            if streak.is_at_risk and streak.current_count > 0:
                at_risk_streaks.append(streak)

        # Sort by hours until expiry (most urgent first)
        at_risk_streaks.sort(key=lambda s: s.hours_until_expiry)

        return at_risk_streaks

    def use_streak_freeze(
        self,
        learner_id: str,
        streak_type: StreakType = StreakType.DAILY,
    ) -> bool:
        """
        Use a streak freeze to protect a streak.

        Args:
            learner_id: Unique identifier for the learner
            streak_type: Type of streak to protect

        Returns:
            True if freeze was used successfully, False otherwise
        """
        learner_streaks = self._get_or_create_learner_streaks(learner_id)
        streak = self._get_or_create_streak(learner_streaks, streak_type)

        if learner_streaks.streak_freezes_available > 0:
            learner_streaks.streak_freezes_available -= 1
            streak.freezes_available += 1
            logger.info(
                "Streak freeze used for %s: %s (remaining: %d)",
                learner_id,
                streak_type.value,
                learner_streaks.streak_freezes_available,
            )
            return True

        return False

    def add_streak_freeze(
        self,
        learner_id: str,
        count: int = 1,
    ) -> int:
        """
        Add streak freeze(s) to learner's inventory.

        Args:
            learner_id: Unique identifier for the learner
            count: Number of freezes to add

        Returns:
            New total freeze count
        """
        learner_streaks = self._get_or_create_learner_streaks(learner_id)
        learner_streaks.streak_freezes_available += count
        return learner_streaks.streak_freezes_available

    def get_streak_calendar(
        self,
        learner_id: str,
        year: int,
        month: int,
    ) -> List[Dict[str, Any]]:
        """
        Get calendar view of streak activity for a month.

        Args:
            learner_id: Unique identifier for the learner
            year: Year to get calendar for
            month: Month to get calendar for

        Returns:
            List of days with activity status
        """
        # In production, this would query activity logs
        # For now, return a simple representation

        from calendar import monthrange

        _, num_days = monthrange(year, month)
        calendar_data = []

        for day in range(1, num_days + 1):
            day_date = date(year, month, day)
            calendar_data.append({
                "date": day_date.isoformat(),
                "has_activity": False,  # Would be populated from activity log
                "used_freeze": False,
                "xp_earned": 0,
            })

        return calendar_data

    def get_next_milestone(
        self,
        learner_id: str,
        streak_type: StreakType = StreakType.DAILY,
    ) -> Tuple[int, int]:
        """
        Get the next milestone and days until reaching it.

        Args:
            learner_id: Unique identifier for the learner
            streak_type: Type of streak

        Returns:
            Tuple of (next_milestone, days_until)
        """
        streak = self.get_streak(learner_id, streak_type)
        current = streak.current_count

        for milestone in self.MILESTONES:
            if milestone > current:
                return (milestone, milestone - current)

        # All milestones reached
        return (self.MILESTONES[-1], 0)

    def _get_or_create_learner_streaks(
        self,
        learner_id: str,
    ) -> LearnerStreaks:
        """Get or create learner's streak data."""
        if learner_id not in self._learner_streaks:
            self._learner_streaks[learner_id] = LearnerStreaks(
                learner_id=learner_id,
                streaks={},
                total_streak_days=0,
                longest_streak_ever=0,
                streak_freezes_available=2,  # Start with 2 freezes
            )
        return self._learner_streaks[learner_id]

    def _get_or_create_streak(
        self,
        learner_streaks: LearnerStreaks,
        streak_type: StreakType,
    ) -> StreakInfo:
        """Get or create a specific streak."""
        if streak_type.value not in learner_streaks.streaks:
            learner_streaks.streaks[streak_type.value] = StreakInfo(
                streak_type=streak_type,
                current_count=0,
                best_count=0,
                last_activity=None,
                started_at=None,
                is_at_risk=False,
                hours_until_expiry=self.STREAK_EXPIRY_HOURS,
                freezes_used=0,
                freezes_available=0,
            )
        return learner_streaks.streaks[streak_type.value]

    def _update_at_risk_status(
        self,
        streak: StreakInfo,
    ) -> None:
        """Update the at-risk status for a streak."""
        if streak.last_activity is None or streak.current_count == 0:
            streak.is_at_risk = False
            streak.hours_until_expiry = self.STREAK_EXPIRY_HOURS
            return

        now = datetime.utcnow()
        hours_since = (now - streak.last_activity).total_seconds() / 3600
        hours_remaining = max(0, self.STREAK_EXPIRY_HOURS - hours_since)

        streak.hours_until_expiry = round(hours_remaining, 1)
        streak.is_at_risk = hours_remaining <= self.AT_RISK_HOURS and hours_remaining > 0

    def _map_activity_to_streak_type(
        self,
        activity_type: str,
    ) -> StreakType:
        """Map activity type to streak type."""
        mapping = {
            "login": StreakType.DAILY,
            "lesson": StreakType.DAILY,
            "lesson_completed": StreakType.DAILY,
            "practice": StreakType.PRACTICE,
            "practice_session": StreakType.PRACTICE,
            "perfect_score": StreakType.PERFECT_SCORE,
            "quiz_perfect": StreakType.PERFECT_SCORE,
            "help": StreakType.HELP_GIVEN,
            "peer_help": StreakType.HELP_GIVEN,
            "challenge": StreakType.CHALLENGE,
            "challenge_completed": StreakType.CHALLENGE,
        }

        return mapping.get(activity_type.lower(), StreakType.DAILY)
