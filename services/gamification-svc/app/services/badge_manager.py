"""
Badge Manager Service

Service for managing learner badges and achievements with user-specific tracking.
"""
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.models.achievement_engine import (
    Achievement,
    AchievementCategory,
    AchievementProgress,
    AchievementRarity,
    AchievementRequirement,
    AchievementTier,
    ACHIEVEMENT_DEFINITIONS,
)

logger = logging.getLogger(__name__)


@dataclass
class Badge:
    """A badge earned by a learner."""
    id: str
    name: str
    description: str
    icon: str
    category: str
    rarity: str
    earned_at: datetime
    xp_reward: int
    tier: Optional[str] = None


@dataclass
class BadgeProgress:
    """Progress toward earning a badge."""
    badge_id: str
    badge_name: str
    description: str
    icon: str
    category: str
    rarity: str
    current_value: int
    target_value: int
    progress_percentage: float
    is_earned: bool = False
    tier: Optional[str] = None


@dataclass
class LearnerBadges:
    """All badges and progress for a learner."""
    learner_id: str
    earned_badges: List[Badge] = field(default_factory=list)
    in_progress: List[BadgeProgress] = field(default_factory=list)
    total_badges: int = 0
    badges_by_rarity: Dict[str, int] = field(default_factory=dict)


@dataclass
class BadgeCheckResult:
    """Result of checking for new badges."""
    learner_id: str
    newly_unlocked: List[Badge]
    xp_earned: int
    message: str


@dataclass
class LearnerStats:
    """Statistics for determining badge eligibility."""
    lessons_completed: int = 0
    quizzes_completed: int = 0
    perfect_scores: int = 0
    streak_days: int = 0
    total_xp: int = 0
    total_time_minutes: int = 0
    skills_mastered: int = 0
    challenges_won: int = 0
    help_given: int = 0


class BadgeManager:
    """
    Manage learner badges and achievements.
    
    Features:
    - Track earned badges per user
    - Calculate progress toward badges
    - Check and unlock new badges
    - Filter by category and rarity
    - Award XP for badge unlocks
    
    Usage:
        manager = BadgeManager()
        badges = manager.get_badges("learner123")
        result = manager.check_badges("learner123", stats)
    """
    
    def __init__(self):
        """Initialize the badge manager."""
        # In-memory storage (in production, use database)
        self._learner_badges: Dict[str, LearnerBadges] = {}
        self._learner_stats: Dict[str, LearnerStats] = {}
        
        # Build achievement lookup
        self._achievements: Dict[str, Achievement] = {
            a.id: a for a in ACHIEVEMENT_DEFINITIONS
        }
        
        logger.info(f"BadgeManager initialized with {len(self._achievements)} badges")
    
    def get_badges(
        self,
        learner_id: str,
        category: Optional[str] = None,
        rarity: Optional[str] = None,
        include_progress: bool = True,
    ) -> LearnerBadges:
        """
        Get all badges for a learner.
        
        Args:
            learner_id: Unique identifier for the learner
            category: Filter by category
            rarity: Filter by rarity
            include_progress: Include in-progress badges
            
        Returns:
            LearnerBadges with earned and in-progress badges
        """
        learner = self._get_or_create_learner_badges(learner_id)
        stats = self._get_or_create_learner_stats(learner_id)
        
        # Filter earned badges
        earned = learner.earned_badges
        if category:
            earned = [b for b in earned if b.category == category]
        if rarity:
            earned = [b for b in earned if b.rarity == rarity]
        
        # Calculate progress for unearned badges
        in_progress = []
        if include_progress:
            earned_ids = {b.id for b in learner.earned_badges}
            for achievement in self._achievements.values():
                if achievement.id in earned_ids:
                    continue
                if category and achievement.category.value != category:
                    continue
                if rarity and achievement.rarity.value != rarity:
                    continue
                if achievement.secret:
                    continue  # Don't show secret achievements
                
                progress = self._calculate_progress(achievement, stats)
                in_progress.append(progress)
        
        # Sort by progress percentage (highest first)
        in_progress.sort(key=lambda p: p.progress_percentage, reverse=True)
        
        # Calculate rarity counts
        rarity_counts = {}
        for badge in learner.earned_badges:
            rarity_counts[badge.rarity] = rarity_counts.get(badge.rarity, 0) + 1
        
        return LearnerBadges(
            learner_id=learner_id,
            earned_badges=earned,
            in_progress=in_progress,
            total_badges=len(learner.earned_badges),
            badges_by_rarity=rarity_counts,
        )
    
    def check_badges(
        self,
        learner_id: str,
        stats: Optional[LearnerStats] = None,
    ) -> BadgeCheckResult:
        """
        Check if any new badges should be unlocked.
        
        Args:
            learner_id: Unique identifier for the learner
            stats: Current learner stats (if not provided, uses stored stats)
            
        Returns:
            BadgeCheckResult with any newly unlocked badges
        """
        if stats:
            self._learner_stats[learner_id] = stats
        else:
            stats = self._get_or_create_learner_stats(learner_id)
        
        learner = self._get_or_create_learner_badges(learner_id)
        earned_ids = {b.id for b in learner.earned_badges}
        
        newly_unlocked = []
        total_xp = 0
        
        for achievement in self._achievements.values():
            if achievement.id in earned_ids:
                continue
            
            if self._check_requirement(achievement, stats):
                badge = Badge(
                    id=achievement.id,
                    name=achievement.name,
                    description=achievement.description,
                    icon=achievement.icon,
                    category=achievement.category.value,
                    rarity=achievement.rarity.value,
                    earned_at=datetime.now(timezone.utc),
                    xp_reward=achievement.xp_reward,
                    tier=achievement.tier.value if achievement.tier else None,
                )
                learner.earned_badges.append(badge)
                newly_unlocked.append(badge)
                total_xp += achievement.xp_reward
                
                logger.info(f"Learner {learner_id} unlocked badge: {achievement.name}")
        
        learner.total_badges = len(learner.earned_badges)
        
        if newly_unlocked:
            message = f"Congratulations! You unlocked {len(newly_unlocked)} new badge(s)!"
        else:
            message = "No new badges unlocked."
        
        return BadgeCheckResult(
            learner_id=learner_id,
            newly_unlocked=newly_unlocked,
            xp_earned=total_xp,
            message=message,
        )
    
    def update_stats(
        self,
        learner_id: str,
        **stat_updates: int,
    ) -> LearnerStats:
        """
        Update learner statistics.
        
        Args:
            learner_id: Unique identifier for the learner
            **stat_updates: Stat fields to update (e.g., lessons_completed=5)
            
        Returns:
            Updated LearnerStats
        """
        stats = self._get_or_create_learner_stats(learner_id)
        
        for field, value in stat_updates.items():
            if hasattr(stats, field):
                setattr(stats, field, value)
        
        return stats
    
    def increment_stat(
        self,
        learner_id: str,
        stat_name: str,
        increment: int = 1,
    ) -> int:
        """
        Increment a specific stat.
        
        Args:
            learner_id: Unique identifier for the learner
            stat_name: Name of the stat to increment
            increment: Amount to increment by
            
        Returns:
            New value of the stat
        """
        stats = self._get_or_create_learner_stats(learner_id)
        
        if hasattr(stats, stat_name):
            current = getattr(stats, stat_name)
            new_value = current + increment
            setattr(stats, stat_name, new_value)
            return new_value
        
        return 0
    
    def get_badge_by_id(self, badge_id: str) -> Optional[Achievement]:
        """Get a badge definition by ID."""
        return self._achievements.get(badge_id)
    
    def get_all_badges(
        self,
        category: Optional[str] = None,
        rarity: Optional[str] = None,
        include_secret: bool = False,
    ) -> List[Achievement]:
        """
        Get all available badge definitions.
        
        Args:
            category: Filter by category
            rarity: Filter by rarity
            include_secret: Include secret achievements
            
        Returns:
            List of Achievement definitions
        """
        badges = list(self._achievements.values())
        
        if not include_secret:
            badges = [b for b in badges if not b.secret]
        if category:
            badges = [b for b in badges if b.category.value == category]
        if rarity:
            badges = [b for b in badges if b.rarity.value == rarity]
        
        return badges
    
    def get_learner_stats(self, learner_id: str) -> LearnerStats:
        """Get current stats for a learner."""
        return self._get_or_create_learner_stats(learner_id)
    
    def _get_or_create_learner_badges(self, learner_id: str) -> LearnerBadges:
        """Get or create a learner's badge record."""
        if learner_id not in self._learner_badges:
            self._learner_badges[learner_id] = LearnerBadges(learner_id=learner_id)
        return self._learner_badges[learner_id]
    
    def _get_or_create_learner_stats(self, learner_id: str) -> LearnerStats:
        """Get or create a learner's stats record."""
        if learner_id not in self._learner_stats:
            self._learner_stats[learner_id] = LearnerStats()
        return self._learner_stats[learner_id]
    
    def _check_requirement(self, achievement: Achievement, stats: LearnerStats) -> bool:
        """Check if an achievement's requirement is met."""
        if not achievement.requirement:
            return False
        
        req = achievement.requirement
        stat_mapping = {
            "lessons_completed": stats.lessons_completed,
            "quizzes_completed": stats.quizzes_completed,
            "perfect_scores": stats.perfect_scores,
            "streak_days": stats.streak_days,
            "total_xp": stats.total_xp,
            "total_time_minutes": stats.total_time_minutes,
            "skills_mastered": stats.skills_mastered,
            "challenges_won": stats.challenges_won,
            "help_given": stats.help_given,
        }
        
        current_value = stat_mapping.get(req.requirement_type, 0)
        return current_value >= req.count
    
    def _calculate_progress(
        self,
        achievement: Achievement,
        stats: LearnerStats,
    ) -> BadgeProgress:
        """Calculate progress toward an achievement."""
        if not achievement.requirement:
            return BadgeProgress(
                badge_id=achievement.id,
                badge_name=achievement.name,
                description=achievement.description,
                icon=achievement.icon,
                category=achievement.category.value,
                rarity=achievement.rarity.value,
                current_value=0,
                target_value=0,
                progress_percentage=0.0,
                tier=achievement.tier.value if achievement.tier else None,
            )
        
        req = achievement.requirement
        stat_mapping = {
            "lessons_completed": stats.lessons_completed,
            "quizzes_completed": stats.quizzes_completed,
            "perfect_scores": stats.perfect_scores,
            "streak_days": stats.streak_days,
            "total_xp": stats.total_xp,
            "total_time_minutes": stats.total_time_minutes,
            "skills_mastered": stats.skills_mastered,
            "challenges_won": stats.challenges_won,
            "help_given": stats.help_given,
        }
        
        current_value = stat_mapping.get(req.requirement_type, 0)
        target_value = req.count
        percentage = min(100.0, (current_value / target_value) * 100) if target_value > 0 else 0.0
        
        return BadgeProgress(
            badge_id=achievement.id,
            badge_name=achievement.name,
            description=achievement.description,
            icon=achievement.icon,
            category=achievement.category.value,
            rarity=achievement.rarity.value,
            current_value=current_value,
            target_value=target_value,
            progress_percentage=round(percentage, 1),
            is_earned=current_value >= target_value,
            tier=achievement.tier.value if achievement.tier else None,
        )


# Singleton instance
_badge_manager: Optional[BadgeManager] = None


def get_badge_manager() -> BadgeManager:
    """Get the singleton BadgeManager instance."""
    global _badge_manager
    if _badge_manager is None:
        _badge_manager = BadgeManager()
    return _badge_manager
