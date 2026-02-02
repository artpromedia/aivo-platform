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
from app.models.points_system import (
    EarnSource,
    LearnerPoints,
    PointType,
    SpendCategory,
    TransactionType,
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
from app.services.points_manager import (
    PointsManager,
    get_points_manager,
)
from app.services.badge_manager import (
    BadgeManager,
    LearnerStats,
    get_badge_manager,
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
points_manager: Optional[PointsManager] = None
badge_manager: Optional[BadgeManager] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup resources."""
    global achievement_engine, challenge_calibrator, engagement_predictor
    global reward_optimizer, leaderboard_manager, streak_tracker
    global points_manager, badge_manager

    logger.info("Initializing Gamification Service...")

    # Initialize all models and services
    achievement_engine = AchievementEngine()
    challenge_calibrator = ChallengeCalibrator()
    engagement_predictor = EngagementPredictor()
    reward_optimizer = RewardOptimizer()
    leaderboard_manager = LeaderboardManager()
    streak_tracker = StreakTracker()
    points_manager = get_points_manager()
    badge_manager = get_badge_manager()

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


# =============================================================================
# User Points Endpoints
# =============================================================================

class EarnPointsRequest(BaseModel):
    """Request body for earning points."""
    source: str = Field(..., description="Source of points (lesson_complete, quiz_complete, etc.)")
    point_type: str = Field(default="xp", description="Type of points (xp, coins, gems)")
    custom_amount: Optional[int] = Field(default=None, description="Override default amount")
    streak_multiplier: float = Field(default=1.0, ge=1.0, le=5.0)
    difficulty_multiplier: float = Field(default=1.0, ge=1.0, le=3.0)
    event_multiplier: float = Field(default=1.0, ge=1.0, le=5.0)
    metadata: Optional[Dict[str, Any]] = None


class SpendPointsRequest(BaseModel):
    """Request body for spending points."""
    category: str = Field(..., description="Category of purchase (streak_freeze, power_up, etc.)")
    point_type: str = Field(default="coins", description="Type of points to spend")
    custom_amount: Optional[int] = Field(default=None, description="Override default cost")
    item_id: Optional[str] = Field(default=None, description="Specific item ID")
    metadata: Optional[Dict[str, Any]] = None


class PointsResponse(BaseModel):
    """Response model for points balance."""
    learner_id: str
    xp: int
    coins: int
    gems: int
    total_xp_earned: int
    total_coins_earned: int
    total_coins_spent: int
    level: int
    level_name: str
    xp_to_next_level: int
    progress_percentage: float


class EarnPointsResponse(BaseModel):
    """Response model for earning points."""
    success: bool
    transaction_id: str
    point_type: str
    amount_earned: int
    bonus_amount: int
    total_amount: int
    new_balance: int
    level_up: bool
    new_level: Optional[int]
    achievements_unlocked: List[str]
    message: Optional[str]


class SpendPointsResponse(BaseModel):
    """Response model for spending points."""
    success: bool
    transaction_id: str
    point_type: str
    amount_spent: int
    new_balance: int
    item_purchased: Optional[str]
    error: Optional[str]


class TransactionResponse(BaseModel):
    """Response model for a transaction."""
    id: str
    point_type: str
    transaction_type: str
    amount: int
    balance_after: int
    source: Optional[str]
    category: Optional[str]
    description: Optional[str]
    created_at: str


@app.get("/api/v1/users/{learner_id}/points", response_model=PointsResponse)
async def get_user_points(learner_id: str) -> PointsResponse:
    """Get current point balances and level for a user."""
    if not points_manager:
        raise HTTPException(status_code=503, detail="Service not initialized")

    balance = points_manager.get_balance(learner_id)

    return PointsResponse(
        learner_id=balance.learner_id,
        xp=balance.xp,
        coins=balance.coins,
        gems=balance.gems,
        total_xp_earned=balance.total_xp_earned,
        total_coins_earned=balance.total_coins_earned,
        total_coins_spent=balance.total_coins_spent,
        level=balance.level.current_level,
        level_name=balance.level.level_name,
        xp_to_next_level=balance.level.xp_to_next_level,
        progress_percentage=balance.level.progress_percentage,
    )


@app.post("/api/v1/users/{learner_id}/points/earn", response_model=EarnPointsResponse)
async def earn_user_points(learner_id: str, request: EarnPointsRequest) -> EarnPointsResponse:
    """Award points to a user for completing activities."""
    if not points_manager:
        raise HTTPException(status_code=503, detail="Service not initialized")

    try:
        source = EarnSource(request.source)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source: {request.source}. Valid sources: {[e.value for e in EarnSource]}"
        )

    try:
        point_type = PointType(request.point_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid point_type: {request.point_type}. Valid types: {[e.value for e in PointType]}"
        )

    result = points_manager.earn_points(
        learner_id=learner_id,
        source=source,
        point_type=point_type,
        custom_amount=request.custom_amount,
        streak_multiplier=request.streak_multiplier,
        difficulty_multiplier=request.difficulty_multiplier,
        event_multiplier=request.event_multiplier,
        metadata=request.metadata,
    )

    return EarnPointsResponse(
        success=result.success,
        transaction_id=result.transaction_id,
        point_type=result.point_type.value,
        amount_earned=result.amount_earned,
        bonus_amount=result.bonus_amount,
        total_amount=result.total_amount,
        new_balance=result.new_balance,
        level_up=result.level_up,
        new_level=result.new_level,
        achievements_unlocked=result.achievements_unlocked,
        message=result.message,
    )


@app.post("/api/v1/users/{learner_id}/points/spend", response_model=SpendPointsResponse)
async def spend_user_points(learner_id: str, request: SpendPointsRequest) -> SpendPointsResponse:
    """Spend points on items or services."""
    if not points_manager:
        raise HTTPException(status_code=503, detail="Service not initialized")

    try:
        category = SpendCategory(request.category)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category: {request.category}. Valid categories: {[e.value for e in SpendCategory]}"
        )

    try:
        point_type = PointType(request.point_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid point_type: {request.point_type}. Valid types: {[e.value for e in PointType]}"
        )

    result = points_manager.spend_points(
        learner_id=learner_id,
        category=category,
        point_type=point_type,
        custom_amount=request.custom_amount,
        item_id=request.item_id,
        metadata=request.metadata,
    )

    return SpendPointsResponse(
        success=result.success,
        transaction_id=result.transaction_id,
        point_type=result.point_type.value,
        amount_spent=result.amount_spent,
        new_balance=result.new_balance,
        item_purchased=result.item_purchased,
        error=result.error,
    )


@app.get("/api/v1/users/{learner_id}/points/history", response_model=Dict[str, Any])
async def get_user_points_history(
    learner_id: str,
    point_type: Optional[str] = Query(default=None, description="Filter by point type"),
    transaction_type: Optional[str] = Query(default=None, description="Filter by transaction type"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> Dict[str, Any]:
    """Get transaction history for a user."""
    if not points_manager:
        raise HTTPException(status_code=503, detail="Service not initialized")

    pt = None
    if point_type:
        try:
            pt = PointType(point_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid point_type: {point_type}")

    tt = None
    if transaction_type:
        try:
            tt = TransactionType(transaction_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid transaction_type: {transaction_type}")

    transactions, total = points_manager.get_transaction_history(
        learner_id=learner_id,
        point_type=pt,
        transaction_type=tt,
        limit=limit,
        offset=offset,
    )

    return {
        "transactions": [
            TransactionResponse(
                id=t.id,
                point_type=t.point_type.value,
                transaction_type=t.transaction_type.value,
                amount=t.amount,
                balance_after=t.balance_after,
                source=t.source,
                category=t.category,
                description=t.description,
                created_at=t.created_at.isoformat(),
            ).model_dump()
            for t in transactions
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@app.get("/api/v1/users/{learner_id}/level")
async def get_user_level(learner_id: str) -> Dict[str, Any]:
    """Get detailed level progress for a user."""
    if not points_manager:
        raise HTTPException(status_code=503, detail="Service not initialized")

    level = points_manager.get_level_progress(learner_id)

    return {
        "current_level": level.current_level,
        "current_xp": level.current_xp,
        "xp_to_next_level": level.xp_to_next_level,
        "xp_in_current_level": level.xp_in_current_level,
        "progress_percentage": level.progress_percentage,
        "level_name": level.level_name,
        "next_level_name": level.next_level_name,
    }


# =============================================================================
# User Badges Endpoints
# =============================================================================

class BadgeResponse(BaseModel):
    """Response model for a badge."""
    id: str
    name: str
    description: str
    icon: str
    category: str
    rarity: str
    xp_reward: int
    tier: Optional[str]
    earned_at: Optional[str]


class BadgeProgressResponse(BaseModel):
    """Response model for badge progress."""
    badge_id: str
    badge_name: str
    description: str
    icon: str
    category: str
    rarity: str
    current_value: int
    target_value: int
    progress_percentage: float
    is_earned: bool
    tier: Optional[str]


class UserBadgesResponse(BaseModel):
    """Response model for user badges."""
    learner_id: str
    earned_badges: List[BadgeResponse]
    in_progress: List[BadgeProgressResponse]
    total_badges: int
    badges_by_rarity: Dict[str, int]


class CheckBadgesRequest(BaseModel):
    """Request body for checking badges."""
    lessons_completed: int = Field(default=0, ge=0)
    quizzes_completed: int = Field(default=0, ge=0)
    perfect_scores: int = Field(default=0, ge=0)
    streak_days: int = Field(default=0, ge=0)
    total_xp: int = Field(default=0, ge=0)
    total_time_minutes: int = Field(default=0, ge=0)
    skills_mastered: int = Field(default=0, ge=0)
    challenges_won: int = Field(default=0, ge=0)
    help_given: int = Field(default=0, ge=0)


class CheckBadgesResponse(BaseModel):
    """Response model for badge check."""
    learner_id: str
    newly_unlocked: List[BadgeResponse]
    xp_earned: int
    message: str


@app.get("/api/v1/users/{learner_id}/badges", response_model=UserBadgesResponse)
async def get_user_badges(
    learner_id: str,
    category: Optional[str] = Query(default=None, description="Filter by category"),
    rarity: Optional[str] = Query(default=None, description="Filter by rarity"),
    include_progress: bool = Query(default=True, description="Include in-progress badges"),
) -> UserBadgesResponse:
    """Get all badges and progress for a user."""
    if not badge_manager:
        raise HTTPException(status_code=503, detail="Service not initialized")

    badges = badge_manager.get_badges(
        learner_id=learner_id,
        category=category,
        rarity=rarity,
        include_progress=include_progress,
    )

    return UserBadgesResponse(
        learner_id=badges.learner_id,
        earned_badges=[
            BadgeResponse(
                id=b.id,
                name=b.name,
                description=b.description,
                icon=b.icon,
                category=b.category,
                rarity=b.rarity,
                xp_reward=b.xp_reward,
                tier=b.tier,
                earned_at=b.earned_at.isoformat() if b.earned_at else None,
            )
            for b in badges.earned_badges
        ],
        in_progress=[
            BadgeProgressResponse(
                badge_id=p.badge_id,
                badge_name=p.badge_name,
                description=p.description,
                icon=p.icon,
                category=p.category,
                rarity=p.rarity,
                current_value=p.current_value,
                target_value=p.target_value,
                progress_percentage=p.progress_percentage,
                is_earned=p.is_earned,
                tier=p.tier,
            )
            for p in badges.in_progress
        ],
        total_badges=badges.total_badges,
        badges_by_rarity=badges.badges_by_rarity,
    )


@app.post("/api/v1/users/{learner_id}/badges/check", response_model=CheckBadgesResponse)
async def check_user_badges(learner_id: str, request: CheckBadgesRequest) -> CheckBadgesResponse:
    """Check if a user has earned any new badges based on their stats."""
    if not badge_manager:
        raise HTTPException(status_code=503, detail="Service not initialized")

    stats = LearnerStats(
        lessons_completed=request.lessons_completed,
        quizzes_completed=request.quizzes_completed,
        perfect_scores=request.perfect_scores,
        streak_days=request.streak_days,
        total_xp=request.total_xp,
        total_time_minutes=request.total_time_minutes,
        skills_mastered=request.skills_mastered,
        challenges_won=request.challenges_won,
        help_given=request.help_given,
    )

    result = badge_manager.check_badges(learner_id=learner_id, stats=stats)

    return CheckBadgesResponse(
        learner_id=result.learner_id,
        newly_unlocked=[
            BadgeResponse(
                id=b.id,
                name=b.name,
                description=b.description,
                icon=b.icon,
                category=b.category,
                rarity=b.rarity,
                xp_reward=b.xp_reward,
                tier=b.tier,
                earned_at=b.earned_at.isoformat() if b.earned_at else None,
            )
            for b in result.newly_unlocked
        ],
        xp_earned=result.xp_earned,
        message=result.message,
    )


@app.get("/api/v1/badges")
async def list_all_badges(
    category: Optional[str] = Query(default=None, description="Filter by category"),
    rarity: Optional[str] = Query(default=None, description="Filter by rarity"),
) -> List[Dict[str, Any]]:
    """List all available badges."""
    if not badge_manager:
        raise HTTPException(status_code=503, detail="Service not initialized")

    badges = badge_manager.get_all_badges(category=category, rarity=rarity)

    return [
        {
            "id": b.id,
            "name": b.name,
            "description": b.description,
            "icon": b.icon,
            "category": b.category.value,
            "rarity": b.rarity.value,
            "xp_reward": b.xp_reward,
            "tier": b.tier.value if b.tier else None,
            "requirement": {
                "type": b.requirement.requirement_type,
                "count": b.requirement.count,
            } if b.requirement else None,
        }
        for b in badges
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
