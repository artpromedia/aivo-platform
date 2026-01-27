"""Gamification Service - FastAPI Application"""
import logging
from contextlib import asynccontextmanager
from dataclasses import asdict
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.models.achievement_engine import (
    AchievementEngine,
    Achievement,
    AchievementProgress,
)
from app.models.challenge_calibrator import (
    ChallengeCalibrator,
    ChallengeConfig,
)
from app.models.engagement_predictor import (
    EngagementPredictor,
    EngagementPrediction,
)
from app.models.reward_optimizer import (
    RewardOptimizer,
    RewardRecommendation,
    RewardType,
)
from app.services.leaderboard_manager import (
    LeaderboardManager,
    LeaderboardEntry,
    LeaderboardResponse,
)
from app.services.streak_tracker import (
    StreakTracker,
    StreakInfo,
    StreakType,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize global instances of the models and services
achievement_engine: Optional[AchievementEngine] = None
challenge_calibrator: Optional[ChallengeCalibrator] = None
engagement_predictor: Optional[EngagementPredictor] = None
reward_optimizer: Optional[RewardOptimizer] = None
leaderboard_manager: Optional[LeaderboardManager] = None
streak_tracker: Optional[StreakTracker] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup resources."""
    global achievement_engine, challenge_calibrator, engagement_predictor
    global reward_optimizer, leaderboard_manager, streak_tracker

    logger.info("Initializing Gamification Service...")

    # Initialize all models and services
    achievement_engine = AchievementEngine()
    challenge_calibrator = ChallengeCalibrator()
    engagement_predictor = EngagementPredictor()
    reward_optimizer = RewardOptimizer()
    leaderboard_manager = LeaderboardManager()
    streak_tracker = StreakTracker()

    logger.info("All gamification models and services initialized")

    yield

    logger.info("Shutting down Gamification Service...")


app = FastAPI(
    title="Gamification Service",
    description="""
AI-powered gamification for engagement and motivation.

## Features

- **Challenge Calibration**: Adaptive difficulty for flow state
- **Achievement System**: Dynamic achievement unlocking
- **Reward Optimization**: Optimal reward scheduling
- **Engagement Prediction**: Predict and prevent disengagement
- **Leaderboards**: Multi-scope competitive rankings
- **Streak Tracking**: Daily streak management with bonuses
    """,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for request/response
class LearnerGameState(BaseModel):
    """Learner's current game state."""
    learner_id: str
    level: int = 1
    xp: int = 0
    achievements: List[str] = Field(default_factory=list)
    streaks: Dict[str, int] = Field(default_factory=dict)
    recent_activities: List[Dict] = Field(default_factory=list)
    lessons_completed: int = 0
    perfect_scores: int = 0
    total_time_minutes: int = 0
    quizzes_completed: int = 0
    peers_helped: int = 0
    streak_days: int = 0
    total_xp: int = 0
    has_logged_in: bool = True
    profile_complete: bool = False


class ChallengeRequest(BaseModel):
    """Request for challenge calibration."""
    learner_id: str
    skill_area: str
    current_mastery: float = Field(ge=0.0, le=1.0)
    skill_levels: Dict[str, float] = Field(default_factory=dict)
    recent_performance: List[Dict] = Field(default_factory=list)
    preferences: Dict[str, Any] = Field(default_factory=dict)


class ChallengeResponse(BaseModel):
    """Response with calibrated challenge config."""
    difficulty: float
    time_limit: float
    hint_availability: bool
    stakes: str
    question_count: int
    partial_credit: bool
    adaptive: bool
    flow_score: float


class AchievementCheckResponse(BaseModel):
    """Response for achievement check."""
    newly_unlocked: List[Dict[str, Any]]
    near_achievements: List[Dict[str, Any]]
    total_achievements: int


class RewardOptimizeRequest(BaseModel):
    """Request for reward optimization."""
    learner_id: str
    available_rewards: List[str]
    context: Dict[str, Any] = Field(default_factory=dict)


class RewardOptimizeResponse(BaseModel):
    """Response with optimized reward recommendation."""
    should_give_reward: bool
    reward: Optional[Dict[str, Any]] = None


class EngagementResponse(BaseModel):
    """Response for engagement prediction."""
    engagement_level: str
    engagement_score: float
    dropout_risk: float
    dropout_probability_7_days: float
    dropout_probability_30_days: float
    intervention_recommended: bool
    suggested_interventions: List[str]
    disengagement_signals: List[Dict[str, Any]]
    confidence: float


class LeaderboardEntryResponse(BaseModel):
    """A single leaderboard entry."""
    rank: int
    learner_id: str
    display_name: str
    avatar_url: Optional[str]
    score: int
    level: int
    change: int
    is_current_user: bool


class LeaderboardResponseModel(BaseModel):
    """Leaderboard response."""
    entries: List[LeaderboardEntryResponse]
    total: int
    period: str
    scope: str
    metric: str
    current_user_rank: Optional[int]


class StreakResponse(BaseModel):
    """Streak information response."""
    streak_type: str
    current_count: int
    best_count: int
    last_activity: Optional[str]
    is_at_risk: bool
    hours_until_expiry: float
    bonus_multiplier: float


# Health check endpoint
@app.get("/health")
async def health() -> Dict[str, Any]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "gamification-svc"}


# Challenge calibration endpoints
@app.post("/api/v1/challenge/calibrate", response_model=ChallengeResponse)
async def calibrate_challenge(request: ChallengeRequest) -> ChallengeResponse:
    """
    Calibrate challenge difficulty for flow state.

    Uses flow theory to find the optimal difficulty level where the learner
    is challenged but not overwhelmed.
    """
    if not challenge_calibrator:
        raise HTTPException(status_code=503, detail="Service not initialized")

    # Build learner profile from request
    learner_profile = {
        "learner_id": request.learner_id,
        "skill_levels": request.skill_levels or {request.skill_area: request.current_mastery},
        "recent_performance": request.recent_performance,
        "preferences": request.preferences,
    }

    # Calibrate the challenge
    config = challenge_calibrator.calibrate_challenge(
        learner_profile=learner_profile,
        skill_area=request.skill_area,
    )

    # Calculate flow score
    flow_score = challenge_calibrator.compute_flow_score(
        skill_level=request.current_mastery,
        challenge_level=config.difficulty,
    )

    return ChallengeResponse(
        difficulty=config.difficulty,
        time_limit=config.time_limit,
        hint_availability=config.hint_availability,
        stakes=config.stakes.value,
        question_count=config.question_count,
        partial_credit=config.partial_credit,
        adaptive=config.adaptive,
        flow_score=flow_score,
    )


# Achievement endpoints
@app.post("/api/v1/achievements/check", response_model=AchievementCheckResponse)
async def check_achievements(state: LearnerGameState) -> AchievementCheckResponse:
    """
    Check for newly unlocked achievements.

    Analyzes the learner's current state and returns any achievements
    that have been newly unlocked.
    """
    if not achievement_engine:
        raise HTTPException(status_code=503, detail="Service not initialized")

    # Convert state to dict for the engine
    learner_state = {
        "learner_id": state.learner_id,
        "achievements": state.achievements,
        "lessons_completed": state.lessons_completed,
        "perfect_scores": state.perfect_scores,
        "streak_days": state.streak_days or state.streaks.get("daily", 0),
        "total_xp": state.total_xp or state.xp,
        "total_time_minutes": state.total_time_minutes,
        "quizzes_completed": state.quizzes_completed,
        "peers_helped": state.peers_helped,
        "recent_activities": state.recent_activities,
        "has_logged_in": state.has_logged_in,
        "profile_complete": state.profile_complete,
        "streaks": state.streaks,
    }

    # Check for newly unlocked achievements
    newly_unlocked = achievement_engine.check(learner_state)

    # Get achievements close to unlocking
    near_achievements = achievement_engine.get_near_achievements(
        learner_state, threshold=0.7
    )

    # Convert to response format
    unlocked_list = [
        {
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "icon": a.icon,
            "category": a.category.value,
            "rarity": a.rarity.value,
            "xp_reward": a.xp_reward,
        }
        for a in newly_unlocked
    ]

    near_list = [
        {
            "achievement_id": p.achievement_id,
            "name": p.achievement.name,
            "description": p.achievement.description,
            "current_value": p.current_value,
            "target_value": p.target_value,
            "percentage": p.percentage,
        }
        for p in near_achievements
    ]

    return AchievementCheckResponse(
        newly_unlocked=unlocked_list,
        near_achievements=near_list,
        total_achievements=len(achievement_engine.get_all_achievements()),
    )


@app.get("/api/v1/achievements")
async def get_all_achievements(
    include_secret: bool = Query(False, description="Include secret achievements"),
) -> Dict[str, Any]:
    """Get all achievement definitions."""
    if not achievement_engine:
        raise HTTPException(status_code=503, detail="Service not initialized")

    achievements = achievement_engine.get_all_achievements(include_secret=include_secret)

    return {
        "achievements": [
            {
                "id": a.id,
                "name": a.name,
                "description": a.description,
                "icon": a.icon,
                "category": a.category.value,
                "rarity": a.rarity.value,
                "xp_reward": a.xp_reward,
                "tier": a.tier.value if a.tier else None,
                "secret": a.secret,
            }
            for a in achievements
        ],
        "total": len(achievements),
    }


# Reward optimization endpoints
@app.post("/api/v1/rewards/optimize", response_model=RewardOptimizeResponse)
async def optimize_rewards(request: RewardOptimizeRequest) -> RewardOptimizeResponse:
    """
    Optimize reward timing and selection.

    Uses variable ratio reinforcement scheduling and personalization
    to determine the optimal reward to give.
    """
    if not reward_optimizer:
        raise HTTPException(status_code=503, detail="Service not initialized")

    # Get optimized reward recommendation
    recommendation = reward_optimizer.optimize_rewards(
        learner_id=request.learner_id,
        context=request.context,
        available_rewards=request.available_rewards,
    )

    if recommendation is None:
        return RewardOptimizeResponse(should_give_reward=False, reward=None)

    return RewardOptimizeResponse(
        should_give_reward=True,
        reward={
            "reward_type": recommendation.reward_type.value,
            "reward_id": recommendation.reward_id,
            "timing": recommendation.timing.value,
            "reason": recommendation.reason,
            "value": recommendation.value,
            "delay_seconds": recommendation.delay_seconds,
            "personalization_score": recommendation.personalization_score,
        },
    )


# Engagement prediction endpoints
@app.post("/api/v1/engagement/predict", response_model=EngagementResponse)
async def predict_engagement(state: LearnerGameState) -> EngagementResponse:
    """
    Predict engagement level and dropout risk.

    Analyzes behavioral patterns to predict engagement and identify
    early signs of disengagement.
    """
    if not engagement_predictor:
        raise HTTPException(status_code=503, detail="Service not initialized")

    # Convert state to dict for the predictor
    learner_state = {
        "learner_id": state.learner_id,
        "recent_activities": state.recent_activities,
        "streak_days": state.streak_days or state.streaks.get("daily", 0),
        "level": state.level,
        "total_xp": state.total_xp or state.xp,
        "lessons_completed": state.lessons_completed,
        "streaks": state.streaks,
    }

    # Get prediction
    prediction = engagement_predictor.predict_engagement(learner_state)

    # Convert disengagement signals to dict format
    signals = [
        {
            "signal_type": s.signal_type,
            "severity": s.severity,
            "description": s.description,
            "detected_at": s.detected_at.isoformat(),
        }
        for s in prediction.disengagement_signals
    ]

    return EngagementResponse(
        engagement_level=prediction.engagement_level.value,
        engagement_score=prediction.engagement_score,
        dropout_risk=prediction.dropout_risk,
        dropout_probability_7_days=prediction.dropout_probability_7_days,
        dropout_probability_30_days=prediction.dropout_probability_30_days,
        intervention_recommended=prediction.intervention_recommended,
        suggested_interventions=prediction.suggested_interventions,
        disengagement_signals=signals,
        confidence=prediction.confidence,
    )


# Leaderboard endpoints
@app.get("/api/v1/leaderboard/{scope}", response_model=LeaderboardResponseModel)
async def get_leaderboard(
    scope: str,
    scope_id: Optional[str] = Query(None, description="ID of the scope (class_id, school_id)"),
    learner_id: Optional[str] = Query(None, description="Current learner ID"),
    limit: int = Query(10, ge=1, le=100, description="Number of entries to return"),
    offset: int = Query(0, ge=0, description="Number of entries to skip"),
    period: str = Query("weekly", description="Time period (daily, weekly, monthly, all_time)"),
    metric: str = Query("xp", description="Ranking metric (xp, lessons, streak, achievements)"),
) -> LeaderboardResponseModel:
    """
    Get leaderboard for scope (class, school, global).

    Returns ranked entries with position changes from previous period.
    """
    if not leaderboard_manager:
        raise HTTPException(status_code=503, detail="Service not initialized")

    # Validate scope
    valid_scopes = ["class", "school", "district", "global"]
    if scope.lower() not in valid_scopes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scope. Must be one of: {valid_scopes}",
        )

    # Get leaderboard
    response = leaderboard_manager.get_leaderboard(
        scope=scope,
        scope_id=scope_id,
        limit=limit,
        offset=offset,
        period=period,
        metric=metric,
        current_learner_id=learner_id,
    )

    # Convert entries to response format
    entries = [
        LeaderboardEntryResponse(
            rank=e.rank,
            learner_id=e.learner_id,
            display_name=e.display_name,
            avatar_url=e.avatar_url,
            score=e.score,
            level=e.level,
            change=e.change,
            is_current_user=e.is_current_user,
        )
        for e in response.entries
    ]

    return LeaderboardResponseModel(
        entries=entries,
        total=response.total,
        period=response.period.value,
        scope=response.scope.value,
        metric=response.metric.value,
        current_user_rank=response.current_user_rank,
    )


@app.post("/api/v1/leaderboard/score")
async def update_leaderboard_score(
    learner_id: str,
    score_delta: int,
    metric: str = "xp",
    scope_info: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Update a learner's score on the leaderboard."""
    if not leaderboard_manager:
        raise HTTPException(status_code=503, detail="Service not initialized")

    result = leaderboard_manager.update_scores(
        learner_id=learner_id,
        score_delta=score_delta,
        metric=metric,
        scope_info=scope_info,
    )

    return result


# Streak endpoints
@app.get("/api/v1/streaks/{learner_id}", response_model=Dict[str, StreakResponse])
async def get_streaks(learner_id: str) -> Dict[str, StreakResponse]:
    """Get all streaks for a learner."""
    if not streak_tracker:
        raise HTTPException(status_code=503, detail="Service not initialized")

    streaks = streak_tracker.get_streaks(learner_id)

    result = {}
    for streak_type, streak_info in streaks.items():
        bonus = streak_tracker.compute_streak_bonus(
            streak_info.current_count,
            streak_info.streak_type,
        )
        result[streak_type] = StreakResponse(
            streak_type=streak_type,
            current_count=streak_info.current_count,
            best_count=streak_info.best_count,
            last_activity=streak_info.last_activity.isoformat() if streak_info.last_activity else None,
            is_at_risk=streak_info.is_at_risk,
            hours_until_expiry=streak_info.hours_until_expiry,
            bonus_multiplier=bonus,
        )

    return result


@app.post("/api/v1/streaks/{learner_id}/track")
async def track_streak(
    learner_id: str,
    activity_type: str = Query("lesson", description="Type of activity"),
) -> Dict[str, Any]:
    """Track a streak-eligible activity."""
    if not streak_tracker:
        raise HTTPException(status_code=503, detail="Service not initialized")

    result = streak_tracker.track_streak(
        learner_id=learner_id,
        activity_type=activity_type,
    )

    return {
        "streak_type": result.streak_type.value,
        "status": result.status.value,
        "previous_count": result.previous_count,
        "new_count": result.new_count,
        "bonus_multiplier": result.bonus_multiplier,
        "is_milestone": result.is_milestone,
        "milestone_type": result.milestone_type,
        "xp_bonus": result.xp_bonus,
    }


@app.get("/api/v1/streaks/{learner_id}/at-risk")
async def get_at_risk_streaks(learner_id: str) -> List[Dict[str, Any]]:
    """Get streaks that are at risk of breaking."""
    if not streak_tracker:
        raise HTTPException(status_code=503, detail="Service not initialized")

    at_risk = streak_tracker.check_streak_at_risk(learner_id)

    return [
        {
            "streak_type": s.streak_type.value,
            "current_count": s.current_count,
            "hours_until_expiry": s.hours_until_expiry,
        }
        for s in at_risk
    ]


@app.post("/api/v1/streaks/{learner_id}/freeze")
async def use_streak_freeze(
    learner_id: str,
    streak_type: str = Query("daily", description="Type of streak to freeze"),
) -> Dict[str, Any]:
    """Use a streak freeze to protect a streak."""
    if not streak_tracker:
        raise HTTPException(status_code=503, detail="Service not initialized")

    try:
        st = StreakType(streak_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid streak type: {streak_type}")

    success = streak_tracker.use_streak_freeze(learner_id, st)

    return {
        "success": success,
        "message": "Streak freeze applied" if success else "No freezes available",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
