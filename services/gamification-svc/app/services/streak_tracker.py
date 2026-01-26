"""
Streak Tracker

Track learning streaks.
"""
import logging
from dataclasses import dataclass
from typing import Dict, List

logger = logging.getLogger(__name__)


@dataclass
class StreakInfo:
    streak_type: str
    current_count: int
    best_count: int
    last_activity: str


class StreakTracker:
    """
    Track and manage learning streaks.
    
    Streak types:
    - Daily login
    - Practice sessions
    - Perfect scores
    - Help given
    
    Usage:
        tracker = StreakTracker()
        streaks = tracker.get_streaks(learner_id)
    """
    
    def __init__(self):
        logger.info("StreakTracker initialized")
    
    def record_activity(
        self,
        learner_id: str,
        activity_type: str,
    ) -> StreakInfo:
        """Record activity and update streak."""
        raise NotImplementedError()
    
    def get_streaks(
        self,
        learner_id: str,
    ) -> Dict[str, StreakInfo]:
        """Get all streaks for learner."""
        raise NotImplementedError()
    
    def check_streak_at_risk(
        self,
        learner_id: str,
    ) -> List[str]:
        """Check which streaks are at risk of breaking."""
        raise NotImplementedError()
