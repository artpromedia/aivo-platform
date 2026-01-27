"""
Achievement Engine

Dynamic achievement system for tracking progress and unlocking rewards.
"""
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class AchievementCategory(str, Enum):
    """Achievement categories."""
    ONBOARDING = "onboarding"
    LESSONS = "lessons"
    MASTERY = "mastery"
    CONSISTENCY = "consistency"
    XP = "xp"
    SKILLS = "skills"
    TIME = "time"
    SOCIAL = "social"
    CHALLENGES = "challenges"
    SECRET = "secret"


class AchievementRarity(str, Enum):
    """Achievement rarity levels."""
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


class AchievementTier(str, Enum):
    """Achievement tier levels for tiered achievements."""
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"
    DIAMOND = "diamond"


@dataclass
class AchievementRequirement:
    """Requirement for unlocking an achievement."""
    requirement_type: str
    count: int
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class Achievement:
    """Achievement definition."""
    id: str
    name: str
    description: str
    icon: str
    category: AchievementCategory
    rarity: AchievementRarity
    xp_reward: int
    tier: Optional[AchievementTier] = None
    requirement: Optional[AchievementRequirement] = None
    secret: bool = False
    earned_at: Optional[datetime] = None


@dataclass
class AchievementProgress:
    """Progress toward an achievement."""
    achievement_id: str
    achievement: Achievement
    current_value: int
    target_value: int
    percentage: float


# Achievement definitions
ACHIEVEMENT_DEFINITIONS: List[Achievement] = [
    # Onboarding achievements
    Achievement(
        id="welcome",
        name="Welcome!",
        description="Started your learning journey",
        icon="/achievements/welcome.svg",
        category=AchievementCategory.ONBOARDING,
        rarity=AchievementRarity.COMMON,
        xp_reward=10,
    ),
    Achievement(
        id="first_lesson",
        name="First Steps",
        description="Completed your first lesson",
        icon="/achievements/first_lesson.svg",
        category=AchievementCategory.ONBOARDING,
        rarity=AchievementRarity.COMMON,
        xp_reward=25,
    ),
    Achievement(
        id="profile_complete",
        name="Identity Established",
        description="Completed your profile",
        icon="/achievements/profile.svg",
        category=AchievementCategory.ONBOARDING,
        rarity=AchievementRarity.COMMON,
        xp_reward=15,
    ),

    # Lesson achievements (tiered)
    Achievement(
        id="lessons_10",
        name="Eager Learner",
        description="Completed 10 lessons",
        icon="/achievements/lessons_bronze.svg",
        category=AchievementCategory.LESSONS,
        rarity=AchievementRarity.COMMON,
        xp_reward=50,
        tier=AchievementTier.BRONZE,
        requirement=AchievementRequirement("lessons_completed", 10),
    ),
    Achievement(
        id="lessons_50",
        name="Dedicated Student",
        description="Completed 50 lessons",
        icon="/achievements/lessons_silver.svg",
        category=AchievementCategory.LESSONS,
        rarity=AchievementRarity.UNCOMMON,
        xp_reward=100,
        tier=AchievementTier.SILVER,
        requirement=AchievementRequirement("lessons_completed", 50),
    ),
    Achievement(
        id="lessons_100",
        name="Knowledge Seeker",
        description="Completed 100 lessons",
        icon="/achievements/lessons_gold.svg",
        category=AchievementCategory.LESSONS,
        rarity=AchievementRarity.RARE,
        xp_reward=250,
        tier=AchievementTier.GOLD,
        requirement=AchievementRequirement("lessons_completed", 100),
    ),
    Achievement(
        id="lessons_250",
        name="Scholarly Elite",
        description="Completed 250 lessons",
        icon="/achievements/lessons_platinum.svg",
        category=AchievementCategory.LESSONS,
        rarity=AchievementRarity.EPIC,
        xp_reward=500,
        tier=AchievementTier.PLATINUM,
        requirement=AchievementRequirement("lessons_completed", 250),
    ),
    Achievement(
        id="lessons_500",
        name="Master Scholar",
        description="Completed 500 lessons",
        icon="/achievements/lessons_diamond.svg",
        category=AchievementCategory.LESSONS,
        rarity=AchievementRarity.LEGENDARY,
        xp_reward=1000,
        tier=AchievementTier.DIAMOND,
        requirement=AchievementRequirement("lessons_completed", 500),
    ),

    # Perfect score achievements
    Achievement(
        id="perfect_1",
        name="Perfectionist",
        description="Got your first perfect score",
        icon="/achievements/perfect_bronze.svg",
        category=AchievementCategory.MASTERY,
        rarity=AchievementRarity.COMMON,
        xp_reward=30,
        tier=AchievementTier.BRONZE,
        requirement=AchievementRequirement("perfect_scores", 1),
    ),
    Achievement(
        id="perfect_10",
        name="Precision Expert",
        description="Got 10 perfect scores",
        icon="/achievements/perfect_silver.svg",
        category=AchievementCategory.MASTERY,
        rarity=AchievementRarity.UNCOMMON,
        xp_reward=100,
        tier=AchievementTier.SILVER,
        requirement=AchievementRequirement("perfect_scores", 10),
    ),
    Achievement(
        id="perfect_25",
        name="Accuracy Master",
        description="Got 25 perfect scores",
        icon="/achievements/perfect_gold.svg",
        category=AchievementCategory.MASTERY,
        rarity=AchievementRarity.RARE,
        xp_reward=200,
        tier=AchievementTier.GOLD,
        requirement=AchievementRequirement("perfect_scores", 25),
    ),
    Achievement(
        id="perfect_50",
        name="Flawless Master",
        description="Got 50 perfect scores",
        icon="/achievements/perfect_platinum.svg",
        category=AchievementCategory.MASTERY,
        rarity=AchievementRarity.EPIC,
        xp_reward=300,
        tier=AchievementTier.PLATINUM,
        requirement=AchievementRequirement("perfect_scores", 50),
    ),

    # Streak achievements
    Achievement(
        id="streak_3",
        name="Getting Started",
        description="Maintained a 3-day streak",
        icon="/achievements/streak_3.svg",
        category=AchievementCategory.CONSISTENCY,
        rarity=AchievementRarity.COMMON,
        xp_reward=25,
        requirement=AchievementRequirement("streak_days", 3),
    ),
    Achievement(
        id="streak_7",
        name="Week Warrior",
        description="Maintained a 7-day streak",
        icon="/achievements/streak_7.svg",
        category=AchievementCategory.CONSISTENCY,
        rarity=AchievementRarity.UNCOMMON,
        xp_reward=75,
        requirement=AchievementRequirement("streak_days", 7),
    ),
    Achievement(
        id="streak_14",
        name="Fortnight Fighter",
        description="Maintained a 14-day streak",
        icon="/achievements/streak_14.svg",
        category=AchievementCategory.CONSISTENCY,
        rarity=AchievementRarity.UNCOMMON,
        xp_reward=150,
        requirement=AchievementRequirement("streak_days", 14),
    ),
    Achievement(
        id="streak_30",
        name="Monthly Master",
        description="Maintained a 30-day streak",
        icon="/achievements/streak_30.svg",
        category=AchievementCategory.CONSISTENCY,
        rarity=AchievementRarity.RARE,
        xp_reward=300,
        requirement=AchievementRequirement("streak_days", 30),
    ),
    Achievement(
        id="streak_60",
        name="Habit Former",
        description="Maintained a 60-day streak",
        icon="/achievements/streak_60.svg",
        category=AchievementCategory.CONSISTENCY,
        rarity=AchievementRarity.RARE,
        xp_reward=500,
        requirement=AchievementRequirement("streak_days", 60),
    ),
    Achievement(
        id="streak_100",
        name="Century Streak",
        description="Maintained a 100-day streak",
        icon="/achievements/streak_100.svg",
        category=AchievementCategory.CONSISTENCY,
        rarity=AchievementRarity.EPIC,
        xp_reward=1000,
        requirement=AchievementRequirement("streak_days", 100),
    ),
    Achievement(
        id="streak_365",
        name="Year of Learning",
        description="Maintained a 365-day streak",
        icon="/achievements/streak_365.svg",
        category=AchievementCategory.CONSISTENCY,
        rarity=AchievementRarity.LEGENDARY,
        xp_reward=5000,
        requirement=AchievementRequirement("streak_days", 365),
    ),

    # XP achievements
    Achievement(
        id="xp_1000",
        name="XP Collector",
        description="Earned 1,000 total XP",
        icon="/achievements/xp_bronze.svg",
        category=AchievementCategory.XP,
        rarity=AchievementRarity.COMMON,
        xp_reward=50,
        tier=AchievementTier.BRONZE,
        requirement=AchievementRequirement("total_xp", 1000),
    ),
    Achievement(
        id="xp_5000",
        name="XP Accumulator",
        description="Earned 5,000 total XP",
        icon="/achievements/xp_silver.svg",
        category=AchievementCategory.XP,
        rarity=AchievementRarity.UNCOMMON,
        xp_reward=100,
        tier=AchievementTier.SILVER,
        requirement=AchievementRequirement("total_xp", 5000),
    ),
    Achievement(
        id="xp_10000",
        name="XP Enthusiast",
        description="Earned 10,000 total XP",
        icon="/achievements/xp_gold.svg",
        category=AchievementCategory.XP,
        rarity=AchievementRarity.RARE,
        xp_reward=200,
        tier=AchievementTier.GOLD,
        requirement=AchievementRequirement("total_xp", 10000),
    ),
    Achievement(
        id="xp_25000",
        name="XP Master",
        description="Earned 25,000 total XP",
        icon="/achievements/xp_platinum.svg",
        category=AchievementCategory.XP,
        rarity=AchievementRarity.EPIC,
        xp_reward=400,
        tier=AchievementTier.PLATINUM,
        requirement=AchievementRequirement("total_xp", 25000),
    ),
    Achievement(
        id="xp_50000",
        name="XP Champion",
        description="Earned 50,000 total XP",
        icon="/achievements/xp_diamond.svg",
        category=AchievementCategory.XP,
        rarity=AchievementRarity.LEGENDARY,
        xp_reward=500,
        tier=AchievementTier.DIAMOND,
        requirement=AchievementRequirement("total_xp", 50000),
    ),

    # Time-based achievements
    Achievement(
        id="time_60",
        name="Hour of Power",
        description="Spent 1 hour learning",
        icon="/achievements/time_60.svg",
        category=AchievementCategory.TIME,
        rarity=AchievementRarity.COMMON,
        xp_reward=25,
        requirement=AchievementRequirement("total_time_minutes", 60),
    ),
    Achievement(
        id="time_300",
        name="Five Hour Scholar",
        description="Spent 5 hours learning",
        icon="/achievements/time_300.svg",
        category=AchievementCategory.TIME,
        rarity=AchievementRarity.UNCOMMON,
        xp_reward=75,
        requirement=AchievementRequirement("total_time_minutes", 300),
    ),
    Achievement(
        id="time_600",
        name="Ten Hour Titan",
        description="Spent 10 hours learning",
        icon="/achievements/time_600.svg",
        category=AchievementCategory.TIME,
        rarity=AchievementRarity.RARE,
        xp_reward=150,
        requirement=AchievementRequirement("total_time_minutes", 600),
    ),
    Achievement(
        id="time_1500",
        name="Day Devotee",
        description="Spent 25 hours learning",
        icon="/achievements/time_1500.svg",
        category=AchievementCategory.TIME,
        rarity=AchievementRarity.EPIC,
        xp_reward=300,
        requirement=AchievementRequirement("total_time_minutes", 1500),
    ),

    # Quiz achievements
    Achievement(
        id="quizzes_10",
        name="Quiz Taker",
        description="Completed 10 quizzes",
        icon="/achievements/quiz_bronze.svg",
        category=AchievementCategory.MASTERY,
        rarity=AchievementRarity.COMMON,
        xp_reward=50,
        tier=AchievementTier.BRONZE,
        requirement=AchievementRequirement("quizzes_completed", 10),
    ),
    Achievement(
        id="quizzes_50",
        name="Quiz Expert",
        description="Completed 50 quizzes",
        icon="/achievements/quiz_silver.svg",
        category=AchievementCategory.MASTERY,
        rarity=AchievementRarity.UNCOMMON,
        xp_reward=150,
        tier=AchievementTier.SILVER,
        requirement=AchievementRequirement("quizzes_completed", 50),
    ),
    Achievement(
        id="quizzes_100",
        name="Quiz Master",
        description="Completed 100 quizzes",
        icon="/achievements/quiz_gold.svg",
        category=AchievementCategory.MASTERY,
        rarity=AchievementRarity.RARE,
        xp_reward=300,
        tier=AchievementTier.GOLD,
        requirement=AchievementRequirement("quizzes_completed", 100),
    ),

    # Social achievements
    Achievement(
        id="helper_5",
        name="Helpful Hand",
        description="Helped 5 fellow learners",
        icon="/achievements/helper_bronze.svg",
        category=AchievementCategory.SOCIAL,
        rarity=AchievementRarity.COMMON,
        xp_reward=50,
        tier=AchievementTier.BRONZE,
        requirement=AchievementRequirement("peers_helped", 5),
    ),
    Achievement(
        id="helper_25",
        name="Community Contributor",
        description="Helped 25 fellow learners",
        icon="/achievements/helper_silver.svg",
        category=AchievementCategory.SOCIAL,
        rarity=AchievementRarity.UNCOMMON,
        xp_reward=150,
        tier=AchievementTier.SILVER,
        requirement=AchievementRequirement("peers_helped", 25),
    ),
    Achievement(
        id="helper_100",
        name="Mentor",
        description="Helped 100 fellow learners",
        icon="/achievements/helper_gold.svg",
        category=AchievementCategory.SOCIAL,
        rarity=AchievementRarity.RARE,
        xp_reward=400,
        tier=AchievementTier.GOLD,
        requirement=AchievementRequirement("peers_helped", 100),
    ),

    # Secret achievements
    Achievement(
        id="night_owl",
        name="Night Owl",
        description="Completed a lesson between midnight and 5 AM",
        icon="/achievements/night_owl.svg",
        category=AchievementCategory.SECRET,
        rarity=AchievementRarity.RARE,
        xp_reward=50,
        secret=True,
    ),
    Achievement(
        id="early_bird",
        name="Early Bird",
        description="Completed a lesson before 6 AM",
        icon="/achievements/early_bird.svg",
        category=AchievementCategory.SECRET,
        rarity=AchievementRarity.RARE,
        xp_reward=50,
        secret=True,
    ),
    Achievement(
        id="weekend_warrior",
        name="Weekend Warrior",
        description="Completed 10 lessons on a weekend",
        icon="/achievements/weekend_warrior.svg",
        category=AchievementCategory.SECRET,
        rarity=AchievementRarity.RARE,
        xp_reward=100,
        secret=True,
    ),
    Achievement(
        id="comeback_kid",
        name="Comeback Kid",
        description="Returned after 30 days away",
        icon="/achievements/comeback.svg",
        category=AchievementCategory.SECRET,
        rarity=AchievementRarity.RARE,
        xp_reward=75,
        secret=True,
    ),
    Achievement(
        id="speed_demon",
        name="Speed Demon",
        description="Completed 5 lessons in one hour",
        icon="/achievements/speed_demon.svg",
        category=AchievementCategory.SECRET,
        rarity=AchievementRarity.EPIC,
        xp_reward=100,
        secret=True,
    ),
    Achievement(
        id="marathon_learner",
        name="Marathon Learner",
        description="Studied for 3+ hours in a single session",
        icon="/achievements/marathon.svg",
        category=AchievementCategory.SECRET,
        rarity=AchievementRarity.EPIC,
        xp_reward=150,
        secret=True,
    ),
]

# Build lookup dictionary for fast access
ACHIEVEMENT_BY_ID: Dict[str, Achievement] = {a.id: a for a in ACHIEVEMENT_DEFINITIONS}


class AchievementEngine:
    """
    Dynamic achievement unlocking engine.

    Categories:
    - Progress (complete X lessons)
    - Mastery (achieve X% in skill)
    - Streak (X days in a row)
    - Social (help X peers)
    - Challenge (complete hard tasks)

    Usage:
        engine = AchievementEngine()
        new_achievements = engine.check(learner_state)
    """

    def __init__(self):
        """Initialize the achievement engine."""
        self._definitions = ACHIEVEMENT_DEFINITIONS
        self._by_id = ACHIEVEMENT_BY_ID
        self._by_requirement_type: Dict[str, List[Achievement]] = {}

        # Index achievements by requirement type for efficient lookup
        for achievement in self._definitions:
            if achievement.requirement:
                req_type = achievement.requirement.requirement_type
                if req_type not in self._by_requirement_type:
                    self._by_requirement_type[req_type] = []
                self._by_requirement_type[req_type].append(achievement)

        logger.info("AchievementEngine initialized with %d achievements", len(self._definitions))

    def check(
        self,
        learner_state: Dict[str, Any],
    ) -> List[Achievement]:
        """
        Check for newly unlocked achievements based on learner state.

        Args:
            learner_state: Dictionary containing learner's current state including:
                - learner_id: str
                - achievements: List[str] - already earned achievement IDs
                - lessons_completed: int
                - perfect_scores: int
                - streak_days: int
                - total_xp: int
                - total_time_minutes: int
                - quizzes_completed: int
                - peers_helped: int
                - recent_activities: List[Dict] - recent activity records

        Returns:
            List of newly unlocked Achievement objects
        """
        earned_ids = set(learner_state.get("achievements", []))
        newly_unlocked: List[Achievement] = []

        # Check requirement-based achievements
        for req_type, achievements in self._by_requirement_type.items():
            current_value = self._get_state_value(learner_state, req_type)

            for achievement in achievements:
                if achievement.id in earned_ids:
                    continue

                if achievement.requirement and current_value >= achievement.requirement.count:
                    newly_unlocked.append(achievement)
                    logger.info(
                        "Achievement unlocked: %s for learner %s",
                        achievement.name,
                        learner_state.get("learner_id"),
                    )

        # Check secret achievements based on recent activities
        newly_unlocked.extend(
            self._check_secret_achievements(learner_state, earned_ids)
        )

        # Check one-time achievements (onboarding)
        newly_unlocked.extend(
            self._check_onboarding_achievements(learner_state, earned_ids)
        )

        return newly_unlocked

    def get_progress(
        self,
        learner_id: str,
        achievement_id: str,
        learner_state: Optional[Dict[str, Any]] = None,
    ) -> AchievementProgress:
        """
        Get progress toward a specific achievement.

        Args:
            learner_id: The learner's unique identifier
            achievement_id: The achievement to check progress for
            learner_state: Optional learner state (if not provided, returns 0 progress)

        Returns:
            AchievementProgress object with current and target values
        """
        achievement = self._by_id.get(achievement_id)
        if not achievement:
            raise ValueError(f"Achievement {achievement_id} not found")

        if not achievement.requirement:
            # Achievement has no progress requirement (one-time or secret)
            earned = learner_state and achievement_id in learner_state.get("achievements", [])
            return AchievementProgress(
                achievement_id=achievement_id,
                achievement=achievement,
                current_value=1 if earned else 0,
                target_value=1,
                percentage=100.0 if earned else 0.0,
            )

        current_value = 0
        if learner_state:
            current_value = self._get_state_value(
                learner_state,
                achievement.requirement.requirement_type,
            )

        target_value = achievement.requirement.count
        percentage = min(100.0, (current_value / target_value) * 100) if target_value > 0 else 0.0

        return AchievementProgress(
            achievement_id=achievement_id,
            achievement=achievement,
            current_value=current_value,
            target_value=target_value,
            percentage=round(percentage, 1),
        )

    def get_near_achievements(
        self,
        learner_state: Dict[str, Any],
        threshold: float = 0.8,
    ) -> List[AchievementProgress]:
        """
        Get achievements close to unlocking.

        Args:
            learner_state: Dictionary containing learner's current state
            threshold: Minimum progress percentage (0.0 to 1.0) to consider "near"

        Returns:
            List of AchievementProgress objects for achievements above threshold,
            sorted by percentage (closest to completion first)
        """
        earned_ids = set(learner_state.get("achievements", []))
        near_achievements: List[AchievementProgress] = []

        for achievement in self._definitions:
            if achievement.id in earned_ids:
                continue

            if achievement.secret or not achievement.requirement:
                continue

            current_value = self._get_state_value(
                learner_state,
                achievement.requirement.requirement_type,
            )
            target_value = achievement.requirement.count

            if target_value > 0:
                percentage = current_value / target_value

                if percentage >= threshold and percentage < 1.0:
                    near_achievements.append(
                        AchievementProgress(
                            achievement_id=achievement.id,
                            achievement=achievement,
                            current_value=current_value,
                            target_value=target_value,
                            percentage=round(percentage * 100, 1),
                        )
                    )

        # Sort by percentage descending (closest to completion first)
        near_achievements.sort(key=lambda p: p.percentage, reverse=True)

        return near_achievements

    def get_all_achievements(
        self,
        include_secret: bool = False,
    ) -> List[Achievement]:
        """
        Get all achievement definitions.

        Args:
            include_secret: Whether to include secret achievements

        Returns:
            List of Achievement objects
        """
        if include_secret:
            return list(self._definitions)
        return [a for a in self._definitions if not a.secret]

    def get_achievements_by_category(
        self,
        category: AchievementCategory,
        include_secret: bool = False,
    ) -> List[Achievement]:
        """
        Get achievements filtered by category.

        Args:
            category: The category to filter by
            include_secret: Whether to include secret achievements

        Returns:
            List of Achievement objects in the category
        """
        achievements = [a for a in self._definitions if a.category == category]
        if not include_secret:
            achievements = [a for a in achievements if not a.secret]
        return achievements

    def calculate_total_xp_from_achievements(
        self,
        earned_achievement_ids: List[str],
    ) -> int:
        """
        Calculate total XP earned from achievements.

        Args:
            earned_achievement_ids: List of earned achievement IDs

        Returns:
            Total XP earned from achievements
        """
        total_xp = 0
        for achievement_id in earned_achievement_ids:
            achievement = self._by_id.get(achievement_id)
            if achievement:
                total_xp += achievement.xp_reward
        return total_xp

    def _get_state_value(self, learner_state: Dict[str, Any], requirement_type: str) -> int:
        """Extract the relevant value from learner state for a requirement type."""
        mapping = {
            "lessons_completed": "lessons_completed",
            "perfect_scores": "perfect_scores",
            "streak_days": "streak_days",
            "total_xp": "total_xp",
            "total_time_minutes": "total_time_minutes",
            "quizzes_completed": "quizzes_completed",
            "peers_helped": "peers_helped",
            "skills_mastered": "skills_mastered",
        }

        state_key = mapping.get(requirement_type)
        if state_key:
            return learner_state.get(state_key, 0)

        # Also check streaks dict for streak_days
        if requirement_type == "streak_days":
            streaks = learner_state.get("streaks", {})
            return streaks.get("daily", 0)

        return 0

    def _check_secret_achievements(
        self,
        learner_state: Dict[str, Any],
        earned_ids: set,
    ) -> List[Achievement]:
        """Check for unlocked secret achievements based on recent activities."""
        newly_unlocked: List[Achievement] = []
        recent_activities = learner_state.get("recent_activities", [])

        if not recent_activities:
            return newly_unlocked

        # Check time-based secret achievements
        for activity in recent_activities:
            activity_time = activity.get("timestamp")
            if isinstance(activity_time, str):
                try:
                    activity_time = datetime.fromisoformat(activity_time.replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    continue
            elif isinstance(activity_time, datetime):
                pass
            else:
                continue

            hour = activity_time.hour

            # Night owl (midnight to 5 AM)
            if "night_owl" not in earned_ids and 0 <= hour < 5:
                if activity.get("type") == "lesson_completed":
                    newly_unlocked.append(self._by_id["night_owl"])
                    earned_ids.add("night_owl")

            # Early bird (5 AM to 6 AM)
            if "early_bird" not in earned_ids and 5 <= hour < 6:
                if activity.get("type") == "lesson_completed":
                    newly_unlocked.append(self._by_id["early_bird"])
                    earned_ids.add("early_bird")

            # Weekend warrior
            if "weekend_warrior" not in earned_ids:
                day_of_week = activity_time.weekday()
                if day_of_week >= 5:  # Saturday = 5, Sunday = 6
                    weekend_lessons = sum(
                        1 for a in recent_activities
                        if a.get("type") == "lesson_completed"
                        and self._is_weekend(a.get("timestamp"))
                    )
                    if weekend_lessons >= 10:
                        newly_unlocked.append(self._by_id["weekend_warrior"])
                        earned_ids.add("weekend_warrior")

        # Check speed demon (5 lessons in one hour)
        if "speed_demon" not in earned_ids:
            lesson_times = [
                self._parse_timestamp(a.get("timestamp"))
                for a in recent_activities
                if a.get("type") == "lesson_completed"
            ]
            lesson_times = [t for t in lesson_times if t is not None]

            if len(lesson_times) >= 5:
                lesson_times.sort()
                for i in range(len(lesson_times) - 4):
                    time_diff = (lesson_times[i + 4] - lesson_times[i]).total_seconds()
                    if time_diff <= 3600:  # 1 hour
                        newly_unlocked.append(self._by_id["speed_demon"])
                        earned_ids.add("speed_demon")
                        break

        # Check marathon learner (3+ hours in single session)
        if "marathon_learner" not in earned_ids:
            session_duration = learner_state.get("current_session_minutes", 0)
            if session_duration >= 180:
                newly_unlocked.append(self._by_id["marathon_learner"])
                earned_ids.add("marathon_learner")

        return newly_unlocked

    def _check_onboarding_achievements(
        self,
        learner_state: Dict[str, Any],
        earned_ids: set,
    ) -> List[Achievement]:
        """Check for onboarding achievements."""
        newly_unlocked: List[Achievement] = []

        # Welcome achievement (first login)
        if "welcome" not in earned_ids:
            if learner_state.get("has_logged_in", False):
                newly_unlocked.append(self._by_id["welcome"])

        # First lesson
        if "first_lesson" not in earned_ids:
            if learner_state.get("lessons_completed", 0) >= 1:
                newly_unlocked.append(self._by_id["first_lesson"])

        # Profile complete
        if "profile_complete" not in earned_ids:
            if learner_state.get("profile_complete", False):
                newly_unlocked.append(self._by_id["profile_complete"])

        return newly_unlocked

    def _is_weekend(self, timestamp: Any) -> bool:
        """Check if a timestamp falls on a weekend."""
        dt = self._parse_timestamp(timestamp)
        if dt:
            return dt.weekday() >= 5
        return False

    def _parse_timestamp(self, timestamp: Any) -> Optional[datetime]:
        """Parse a timestamp from various formats."""
        if isinstance(timestamp, datetime):
            return timestamp
        if isinstance(timestamp, str):
            try:
                return datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                return None
        return None
