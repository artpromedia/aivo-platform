"""
Leaderboard Manager

Manage multi-scope gamification leaderboards.
"""
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class LeaderboardScope(str, Enum):
    """Leaderboard scope levels."""
    CLASS = "class"
    SCHOOL = "school"
    DISTRICT = "district"
    GLOBAL = "global"


class LeaderboardPeriod(str, Enum):
    """Leaderboard time periods."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    ALL_TIME = "all_time"


class LeaderboardMetric(str, Enum):
    """Metrics for leaderboard ranking."""
    XP = "xp"
    LESSONS = "lessons"
    STREAK = "streak"
    ACHIEVEMENTS = "achievements"


@dataclass
class LeaderboardEntry:
    """A single entry in the leaderboard."""
    rank: int
    learner_id: str
    display_name: str
    avatar_url: Optional[str]
    score: int
    level: int
    change: int = 0  # Position change from previous period
    is_current_user: bool = False


@dataclass
class LeaderboardResponse:
    """Complete leaderboard response."""
    entries: List[LeaderboardEntry]
    total: int
    period: LeaderboardPeriod
    scope: LeaderboardScope
    metric: LeaderboardMetric
    updated_at: datetime
    current_user_rank: Optional[int] = None


class LeaderboardManager:
    """
    Manage multi-scope leaderboards.

    Scopes:
    - Class: Classmates only
    - School: Same school
    - District: Same district
    - Global: All learners

    Features:
    - Multiple time periods (daily, weekly, monthly, all-time)
    - Multiple metrics (XP, lessons, streaks, achievements)
    - Position change tracking
    - Privacy-aware (respects showOnLeaderboard setting)

    Usage:
        manager = LeaderboardManager()
        board = manager.get_leaderboard("class", class_id="123")
    """

    # Cache settings
    CACHE_TTL_SECONDS = 60  # Cache leaderboards for 1 minute
    MAX_ENTRIES_PER_PAGE = 100

    def __init__(self):
        """Initialize the leaderboard manager."""
        # In-memory storage (in production, use Redis for caching)
        self._learner_scores: Dict[str, Dict[str, Any]] = {}
        self._leaderboard_cache: Dict[str, Tuple[LeaderboardResponse, datetime]] = {}
        self._previous_rankings: Dict[str, Dict[str, int]] = {}

        logger.info("LeaderboardManager initialized")

    def get_leaderboard(
        self,
        scope: str,
        scope_id: Optional[str] = None,
        limit: int = 10,
        offset: int = 0,
        period: str = "weekly",
        metric: str = "xp",
        current_learner_id: Optional[str] = None,
    ) -> LeaderboardResponse:
        """
        Get leaderboard for specified scope.

        Args:
            scope: Leaderboard scope (class, school, district, global)
            scope_id: ID of the scope (class_id, school_id, etc.)
            limit: Maximum number of entries to return
            offset: Number of entries to skip (for pagination)
            period: Time period (daily, weekly, monthly, all_time)
            metric: Ranking metric (xp, lessons, streak, achievements)
            current_learner_id: ID of the current user (for highlighting)

        Returns:
            LeaderboardResponse with ranked entries
        """
        scope_enum = LeaderboardScope(scope.lower())
        period_enum = LeaderboardPeriod(period.lower())
        metric_enum = LeaderboardMetric(metric.lower())

        # Check cache
        cache_key = f"{scope}:{scope_id}:{period}:{metric}"
        cached = self._get_cached_leaderboard(cache_key)
        if cached:
            return self._apply_pagination_and_user(
                cached, limit, offset, current_learner_id
            )

        # Get eligible learners for this scope
        learners = self._get_learners_for_scope(scope_enum, scope_id)

        # Get scores for the period and metric
        scored_learners = self._get_scores_for_period(
            learners, period_enum, metric_enum
        )

        # Compute rankings
        entries = self.compute_rankings(scored_learners, metric_enum)

        # Get previous rankings for change calculation
        prev_key = f"{scope}:{scope_id}:{metric}"
        prev_rankings = self._previous_rankings.get(prev_key, {})

        # Calculate position changes
        for entry in entries:
            if entry.learner_id in prev_rankings:
                prev_rank = prev_rankings[entry.learner_id]
                entry.change = prev_rank - entry.rank  # Positive = moved up
            else:
                entry.change = 0

        # Update previous rankings for next comparison
        self._previous_rankings[prev_key] = {
            e.learner_id: e.rank for e in entries
        }

        # Create response
        response = LeaderboardResponse(
            entries=entries,
            total=len(entries),
            period=period_enum,
            scope=scope_enum,
            metric=metric_enum,
            updated_at=datetime.utcnow(),
            current_user_rank=None,
        )

        # Cache the result
        self._cache_leaderboard(cache_key, response)

        # Apply pagination and mark current user
        return self._apply_pagination_and_user(
            response, limit, offset, current_learner_id
        )

    def compute_rankings(
        self,
        learners: List[Dict[str, Any]],
        metric: LeaderboardMetric = LeaderboardMetric.XP,
    ) -> List[LeaderboardEntry]:
        """
        Compute learner rankings based on scores.

        Args:
            learners: List of learner data with scores
            metric: Metric to rank by

        Returns:
            List of LeaderboardEntry objects sorted by rank
        """
        if not learners:
            return []

        # Sort by score descending
        sorted_learners = sorted(
            learners,
            key=lambda x: x.get("score", 0),
            reverse=True,
        )

        entries: List[LeaderboardEntry] = []
        current_rank = 1
        previous_score = None

        for i, learner in enumerate(sorted_learners):
            score = learner.get("score", 0)

            # Handle ties (same rank for same score)
            if previous_score is not None and score < previous_score:
                current_rank = i + 1

            entry = LeaderboardEntry(
                rank=current_rank,
                learner_id=learner.get("learner_id", ""),
                display_name=learner.get("display_name", "Anonymous"),
                avatar_url=learner.get("avatar_url"),
                score=score,
                level=learner.get("level", 1),
                change=0,
                is_current_user=False,
            )
            entries.append(entry)
            previous_score = score

        return entries

    def update_scores(
        self,
        learner_id: str,
        score_delta: int,
        metric: str = "xp",
        scope_info: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Update learner's score.

        Args:
            learner_id: Unique identifier for the learner
            score_delta: Amount to add to the score (can be negative)
            metric: Which metric to update
            scope_info: Optional scope information (class_id, school_id, etc.)

        Returns:
            Updated score information
        """
        if learner_id not in self._learner_scores:
            self._learner_scores[learner_id] = {
                "learner_id": learner_id,
                "xp": 0,
                "lessons": 0,
                "streak": 0,
                "achievements": 0,
                "level": 1,
                "display_name": f"Learner {learner_id[:8]}",
                "avatar_url": None,
                "show_on_leaderboard": True,
                "scope_info": scope_info or {},
                "daily_scores": {},
                "weekly_scores": {},
                "monthly_scores": {},
            }

        learner = self._learner_scores[learner_id]

        # Update the metric
        if metric in learner:
            learner[metric] = max(0, learner[metric] + score_delta)

        # Update period-specific scores
        now = datetime.utcnow()
        day_key = now.strftime("%Y-%m-%d")
        week_key = now.strftime("%Y-W%W")
        month_key = now.strftime("%Y-%m")

        # Initialize period scores if needed
        for period_key, period_dict in [
            (day_key, "daily_scores"),
            (week_key, "weekly_scores"),
            (month_key, "monthly_scores"),
        ]:
            if period_dict not in learner:
                learner[period_dict] = {}
            if metric not in learner[period_dict]:
                learner[period_dict][metric] = {}
            if period_key not in learner[period_dict][metric]:
                learner[period_dict][metric][period_key] = 0
            learner[period_dict][metric][period_key] += max(0, score_delta)

        # Update scope info if provided
        if scope_info:
            learner["scope_info"].update(scope_info)

        # Invalidate relevant caches
        self._invalidate_caches(learner_id, scope_info)

        logger.debug(
            "Updated score for %s: %s += %d (total: %d)",
            learner_id,
            metric,
            score_delta,
            learner.get(metric, 0),
        )

        return {
            "learner_id": learner_id,
            "metric": metric,
            "new_score": learner.get(metric, 0),
            "delta": score_delta,
        }

    def get_rank(
        self,
        learner_id: str,
        scope: str,
        scope_id: Optional[str] = None,
        period: str = "weekly",
        metric: str = "xp",
    ) -> Optional[int]:
        """
        Get learner's rank in a specific scope.

        Args:
            learner_id: Unique identifier for the learner
            scope: Leaderboard scope
            scope_id: ID of the scope
            period: Time period
            metric: Ranking metric

        Returns:
            Rank number or None if not found
        """
        response = self.get_leaderboard(
            scope=scope,
            scope_id=scope_id,
            limit=1000,  # Get full leaderboard
            period=period,
            metric=metric,
        )

        for entry in response.entries:
            if entry.learner_id == learner_id:
                return entry.rank

        return None

    def get_learner_rankings(
        self,
        learner_id: str,
    ) -> Dict[str, Dict[str, int]]:
        """
        Get all rankings for a learner across scopes and metrics.

        Args:
            learner_id: Unique identifier for the learner

        Returns:
            Dictionary of rankings by scope and metric
        """
        learner = self._learner_scores.get(learner_id)
        if not learner:
            return {}

        rankings = {}
        scope_info = learner.get("scope_info", {})

        for scope in LeaderboardScope:
            scope_id = scope_info.get(f"{scope.value}_id")
            rankings[scope.value] = {}

            for metric in LeaderboardMetric:
                rank = self.get_rank(
                    learner_id=learner_id,
                    scope=scope.value,
                    scope_id=scope_id,
                    metric=metric.value,
                )
                if rank is not None:
                    rankings[scope.value][metric.value] = rank

        return rankings

    def set_learner_visibility(
        self,
        learner_id: str,
        show_on_leaderboard: bool,
    ) -> None:
        """
        Set whether a learner appears on leaderboards.

        Args:
            learner_id: Unique identifier for the learner
            show_on_leaderboard: Whether to show on leaderboards
        """
        if learner_id in self._learner_scores:
            self._learner_scores[learner_id]["show_on_leaderboard"] = show_on_leaderboard

    def update_learner_profile(
        self,
        learner_id: str,
        display_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        level: Optional[int] = None,
    ) -> None:
        """
        Update learner's display information.

        Args:
            learner_id: Unique identifier for the learner
            display_name: Display name for leaderboard
            avatar_url: Avatar URL
            level: Current level
        """
        if learner_id not in self._learner_scores:
            self._learner_scores[learner_id] = {
                "learner_id": learner_id,
                "xp": 0,
                "lessons": 0,
                "streak": 0,
                "achievements": 0,
                "level": 1,
                "display_name": display_name or f"Learner {learner_id[:8]}",
                "avatar_url": avatar_url,
                "show_on_leaderboard": True,
                "scope_info": {},
            }
        else:
            learner = self._learner_scores[learner_id]
            if display_name is not None:
                learner["display_name"] = display_name
            if avatar_url is not None:
                learner["avatar_url"] = avatar_url
            if level is not None:
                learner["level"] = level

    def _get_learners_for_scope(
        self,
        scope: LeaderboardScope,
        scope_id: Optional[str],
    ) -> List[Dict[str, Any]]:
        """Get all learners that belong to a specific scope."""
        learners = []

        for learner_id, learner_data in self._learner_scores.items():
            # Skip learners who opted out
            if not learner_data.get("show_on_leaderboard", True):
                continue

            # Check scope membership
            scope_info = learner_data.get("scope_info", {})

            if scope == LeaderboardScope.GLOBAL:
                learners.append(learner_data)
            elif scope == LeaderboardScope.DISTRICT:
                if scope_info.get("district_id") == scope_id:
                    learners.append(learner_data)
            elif scope == LeaderboardScope.SCHOOL:
                if scope_info.get("school_id") == scope_id:
                    learners.append(learner_data)
            elif scope == LeaderboardScope.CLASS:
                if scope_info.get("class_id") == scope_id:
                    learners.append(learner_data)

        return learners

    def _get_scores_for_period(
        self,
        learners: List[Dict[str, Any]],
        period: LeaderboardPeriod,
        metric: LeaderboardMetric,
    ) -> List[Dict[str, Any]]:
        """Get scores for learners within a specific time period."""
        now = datetime.utcnow()

        if period == LeaderboardPeriod.ALL_TIME:
            # Use cumulative scores
            for learner in learners:
                learner["score"] = learner.get(metric.value, 0)
            return learners

        # Get period key
        if period == LeaderboardPeriod.DAILY:
            period_key = now.strftime("%Y-%m-%d")
            period_dict = "daily_scores"
        elif period == LeaderboardPeriod.WEEKLY:
            period_key = now.strftime("%Y-W%W")
            period_dict = "weekly_scores"
        elif period == LeaderboardPeriod.MONTHLY:
            period_key = now.strftime("%Y-%m")
            period_dict = "monthly_scores"
        else:
            period_key = ""
            period_dict = ""

        for learner in learners:
            scores = learner.get(period_dict, {}).get(metric.value, {})
            learner["score"] = scores.get(period_key, 0)

        return learners

    def _get_cached_leaderboard(
        self,
        cache_key: str,
    ) -> Optional[LeaderboardResponse]:
        """Get cached leaderboard if still valid."""
        if cache_key in self._leaderboard_cache:
            response, cached_at = self._leaderboard_cache[cache_key]
            if (datetime.utcnow() - cached_at).total_seconds() < self.CACHE_TTL_SECONDS:
                return response
            else:
                # Cache expired
                del self._leaderboard_cache[cache_key]
        return None

    def _cache_leaderboard(
        self,
        cache_key: str,
        response: LeaderboardResponse,
    ) -> None:
        """Cache a leaderboard response."""
        self._leaderboard_cache[cache_key] = (response, datetime.utcnow())

    def _invalidate_caches(
        self,
        learner_id: str,
        scope_info: Optional[Dict[str, str]],
    ) -> None:
        """Invalidate relevant caches when scores change."""
        # Simple approach: clear all caches
        # In production, would be more selective
        self._leaderboard_cache.clear()

    def _apply_pagination_and_user(
        self,
        response: LeaderboardResponse,
        limit: int,
        offset: int,
        current_learner_id: Optional[str],
    ) -> LeaderboardResponse:
        """Apply pagination and mark current user."""
        # Find current user's rank
        current_user_rank = None
        if current_learner_id:
            for entry in response.entries:
                if entry.learner_id == current_learner_id:
                    entry.is_current_user = True
                    current_user_rank = entry.rank
                    break

        # Apply pagination
        limit = min(limit, self.MAX_ENTRIES_PER_PAGE)
        paginated_entries = response.entries[offset:offset + limit]

        return LeaderboardResponse(
            entries=paginated_entries,
            total=response.total,
            period=response.period,
            scope=response.scope,
            metric=response.metric,
            updated_at=response.updated_at,
            current_user_rank=current_user_rank,
        )
