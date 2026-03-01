"""RL Tutoring Service - FastAPI Application"""
import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.models.state_encoder import StateEncoder
from app.models.action_selector import ActionSelector
from app.models.reward_model import RewardModel
from app.models.policy_learner import PolicyLearner
from app.models.student_model import (
    ContentType,
    StudentAgeGroup,
    StudentProfile,
)
from app.services.experience_buffer import ExperienceBuffer
from app.services.policy_evaluator import PolicyEvaluator
from app.services.session_manager import SessionManager
from app.services.safety_monitor import SafetyMonitor
from app.services.content_recommender import ContentRecommender, ContentItem
from app.safety_middleware import ContentSafetyMiddleware
from app.persistence import RedisStore, PgStore, CheckpointStore
from app.hardening import (
    ProductionHardeningMiddleware,
    get_metrics_response,
    observe_reward,
    update_gauge_metrics,
    rl_circuit_breaker,
    assign_ab_group,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Configuration from env ───────────────────────────────────────────────
POLICY_UPDATE_INTERVAL = int(os.getenv("RL_POLICY_UPDATE_INTERVAL", "900"))  # 15 min
POLICY_UPDATE_MIN_BUFFER = int(os.getenv("RL_POLICY_UPDATE_MIN_BUFFER", "32"))
POLICY_UPDATE_BATCH_SIZE = int(os.getenv("RL_POLICY_UPDATE_BATCH_SIZE", "32"))
POLICY_UPDATE_EPOCHS = int(os.getenv("RL_POLICY_UPDATE_EPOCHS", "10"))

# Global instances
state_encoder: Optional[StateEncoder] = None
action_selector: Optional[ActionSelector] = None
reward_model: Optional[RewardModel] = None
policy_learner: Optional[PolicyLearner] = None
experience_buffer: Optional[ExperienceBuffer] = None
policy_evaluator: Optional[PolicyEvaluator] = None
session_manager: Optional[SessionManager] = None
safety_monitor: Optional[SafetyMonitor] = None
content_recommender: Optional[ContentRecommender] = None

# Persistence instances
redis_store: Optional[RedisStore] = None
pg_store: Optional[PgStore] = None
checkpoint_store: Optional[CheckpointStore] = None

# Background task handle
_policy_update_task: Optional[asyncio.Task] = None


async def _periodic_policy_update() -> None:
    """Background loop: train policy every POLICY_UPDATE_INTERVAL seconds
    when buffer has enough experiences, then checkpoint."""
    while True:
        await asyncio.sleep(POLICY_UPDATE_INTERVAL)
        try:
            if (
                policy_learner is not None
                and experience_buffer is not None
                and len(experience_buffer) >= POLICY_UPDATE_MIN_BUFFER
            ):
                experiences = experience_buffer.sample(POLICY_UPDATE_BATCH_SIZE)
                policy_learner.train(experiences, epochs=POLICY_UPDATE_EPOCHS)
                logger.info(
                    "Periodic policy update: steps=%d, buffer=%d",
                    policy_learner.training_steps,
                    len(experience_buffer),
                )
                # Auto-checkpoint after training
                if checkpoint_store is not None:
                    await checkpoint_store.maybe_save(policy_learner)
        except Exception as exc:
            logger.warning("Periodic policy update failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global state_encoder, action_selector, reward_model, policy_learner
    global experience_buffer, policy_evaluator
    global session_manager, safety_monitor, content_recommender
    global redis_store, pg_store, checkpoint_store, _policy_update_task

    logger.info("Initializing RL Tutoring Service...")

    # ── 1. Core RL components ────────────────────────────────────────────
    state_encoder = StateEncoder(state_dim=64)
    action_selector = ActionSelector()
    reward_model = RewardModel()
    policy_learner = PolicyLearner(
        algorithm="q_learning",
        state_dim=64,
        action_dim=len(action_selector.ACTION_TYPES),
    )
    experience_buffer = ExperienceBuffer(capacity=10000)
    policy_evaluator = PolicyEvaluator()

    # ── 2. Persistence layer (best-effort — service works without it) ────
    redis_store = RedisStore()
    pg_store = PgStore()
    await redis_store.connect()
    await pg_store.connect()
    checkpoint_store = CheckpointStore(pg_store)

    # Restore latest policy checkpoint
    await checkpoint_store.load_latest(policy_learner)

    # Rehydrate experience buffer from Redis
    loaded = await experience_buffer.load_from_store(redis_store)
    if loaded:
        logger.info("Rehydrated %d experiences from Redis", loaded)

    # ── 3. Student management ────────────────────────────────────────────
    session_manager = SessionManager()
    safety_monitor = SafetyMonitor(enable_logging=True)
    content_recommender = ContentRecommender(
        policy_learner=policy_learner,
        action_selector=action_selector,
        safety_monitor=safety_monitor,
    )

    # Add some default content
    _initialize_default_content()

    # ── 4. Start periodic background policy trainer ──────────────────────
    _policy_update_task = asyncio.create_task(_periodic_policy_update())

    logger.info("All RL components initialized successfully")

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────
    logger.info("Shutting down RL Tutoring Service...")

    # Cancel background task
    if _policy_update_task is not None:
        _policy_update_task.cancel()
        try:
            await _policy_update_task
        except asyncio.CancelledError:
            pass

    # Persist buffer & checkpoint before exit
    if experience_buffer is not None and redis_store is not None:
        await experience_buffer.save_to_store(redis_store, pg_store)
    if checkpoint_store is not None and policy_learner is not None:
        await checkpoint_store.force_save(policy_learner)

    # Flush safety audit log to PG
    if safety_monitor is not None and pg_store is not None and pg_store.available:
        entries = safety_monitor.get_audit_log(limit=10000)
        if entries:
            await pg_store.store_audit_entries(entries)
            logger.info("Flushed %d audit entries to PostgreSQL", len(entries))

    # Close stores
    if redis_store is not None:
        await redis_store.close()
    if pg_store is not None:
        await pg_store.close()


def _initialize_default_content():
    """Initialize default content library."""
    if not content_recommender:
        return

    topics = ["math", "reading", "science"]
    content_types = [ContentType.LESSON, ContentType.QUIZ, ContentType.PRACTICE]

    for topic in topics:
        for i, ctype in enumerate(content_types):
            for difficulty in [0.3, 0.5, 0.7]:
                content = ContentItem(
                    content_id=f"{topic}_{ctype.value}_{int(difficulty*10)}",
                    content_type=ctype,
                    topic=topic,
                    difficulty=difficulty,
                    estimated_duration=300 + int(difficulty * 300),
                )
                content_recommender.add_content(content)


app = FastAPI(
    title="RL Tutoring Service",
    description="""
Reinforcement learning for adaptive tutoring decisions.

## Features

- **Policy Learning**: Learn optimal tutoring strategies
- **Action Selection**: Select next tutoring action
- **Reward Modeling**: Model learning outcomes as rewards
- **Strategy Optimization**: Continuously improve tutoring
    """,
    version="1.0.0",
    lifespan=lifespan,
)

# Content safety middleware – intercepts AI responses before they reach students
app.add_middleware(
    ContentSafetyMiddleware,
    enabled=True,
)

# Production hardening – rate limiting + Prometheus latency tracking (S11.4)
app.add_middleware(ProductionHardeningMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LearnerState(BaseModel):
    learner_id: str
    knowledge_state: Dict[str, float]
    recent_performance: List[float]
    engagement_level: float
    time_in_session: float
    current_content_id: Optional[str] = None
    available_content: List[str] = []
    previous_content_ids: List[str] = []
    hints_given: int = 0


class TutoringActionResponse(BaseModel):
    action_type: str
    content_id: Optional[str] = None
    difficulty: float
    parameters: Dict[str, Any] = {}


class RewardSignal(BaseModel):
    learner_id: str
    session_id: Optional[str] = None
    state: Dict[str, Any]
    action_taken: Dict[str, Any]
    outcome: Dict[str, float]  # correctness, time, engagement
    next_state: Optional[Dict[str, Any]] = None
    done: bool = False


# ==================== Student-Centric Models ====================

class StartSessionRequest(BaseModel):
    """Request to start a learning session."""
    age_group: str = Field(default="adult", description="Age group: child, teen, or adult")
    max_duration: Optional[int] = Field(default=None, description="Max session duration in seconds")
    target_topic: Optional[str] = Field(default=None, description="Target topic to focus on")


class SessionResponse(BaseModel):
    """Response containing session information."""
    session_id: str
    student_id: str
    status: str
    started_at: str
    duration_seconds: float
    items_completed: int
    accuracy: float
    current_engagement: float


class FeedbackRequest(BaseModel):
    """Request to provide feedback on a recommendation."""
    content_id: str = Field(..., description="Content ID that was interacted with")
    correct: bool = Field(..., description="Whether the answer/interaction was correct")
    response_time: float = Field(..., description="Time taken to respond in seconds")
    engagement: Optional[float] = Field(default=None, description="Engagement level 0.0-1.0")
    hint_used: bool = Field(default=False, description="Whether a hint was used")
    help_requested: bool = Field(default=False, description="Whether help was requested")
    topic: Optional[str] = Field(default=None, description="Topic of the content")


class ContentRecommendationResponse(BaseModel):
    """Response containing a content recommendation."""
    content_id: str
    content_type: str
    topic: str
    difficulty: float
    estimated_duration: int
    reason: str
    confidence: float
    is_exploration: bool
    metadata: Dict[str, Any] = {}


class LearningPathResponse(BaseModel):
    """Response containing a learning path."""
    path_id: str
    student_id: str
    target_topic: str
    total_nodes: int
    progress: float
    estimated_total_duration: int
    current_node: Optional[Dict[str, Any]] = None
    nodes: List[Dict[str, Any]] = []


class StudentProfileResponse(BaseModel):
    """Response containing student profile information."""
    student_id: str
    age_group: str
    knowledge_state: Dict[str, Any]
    overall_accuracy: float
    total_sessions: int
    total_time_spent: float
    is_minor: bool
    current_session: Optional[Dict[str, Any]] = None


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "rl-tutoring-svc",
        "components": {
            "state_encoder": state_encoder is not None,
            "action_selector": action_selector is not None,
            "reward_model": reward_model is not None,
            "policy_learner": policy_learner is not None,
            "experience_buffer": experience_buffer is not None,
            "policy_evaluator": policy_evaluator is not None,
            "session_manager": session_manager is not None,
            "safety_monitor": safety_monitor is not None,
            "content_recommender": content_recommender is not None,
        },
        "persistence": {
            "redis": redis_store.available if redis_store else False,
            "postgresql": pg_store.available if pg_store else False,
        },
    }


@app.get("/health/ready")
async def health_ready() -> Dict[str, Any]:
    all_ready = all([
        state_encoder is not None,
        action_selector is not None,
        reward_model is not None,
        policy_learner is not None,
        experience_buffer is not None,
        policy_evaluator is not None,
        session_manager is not None,
        safety_monitor is not None,
        content_recommender is not None,
    ])
    return {
        "status": "ready" if all_ready else "not_ready",
        "service": "rl-tutoring-svc"
    }


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    if experience_buffer is not None and policy_learner is not None:
        update_gauge_metrics(len(experience_buffer), policy_learner.training_steps)
    return get_metrics_response()


@app.post("/api/v1/action/select")
async def select_action(state: LearnerState) -> Dict[str, Any]:
    """Select optimal tutoring action for current state."""
    if policy_learner is None or action_selector is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    logger.info(f"Selecting action for learner {state.learner_id}")

    # Convert state to dict for processing
    state_dict = state.model_dump()

    # Get action from policy
    action_idx, confidence = policy_learner.predict_with_confidence(state_dict)

    # Convert to tutoring action with context
    context = {
        "engagement_level": state.engagement_level,
        "current_mastery": sum(state.knowledge_state.values()) / len(state.knowledge_state) if state.knowledge_state else 0.5,
        "recent_performance": state.recent_performance,
        "current_content_id": state.current_content_id,
        "available_content": state.available_content,
        "previous_content_ids": state.previous_content_ids,
        "hints_given": state.hints_given,
    }

    action = action_selector.select(action_idx, context)

    return {
        "status": "success",
        "learner_id": state.learner_id,
        "action": {
            "action_type": action.action_type,
            "action_id": action.action_id,
            "content_id": action.content_id,
            "parameters": action.parameters,
        },
        "confidence": confidence,
        "q_values": policy_learner.get_action_values(state_dict),
        "policy_version": f"trained_{policy_learner.training_steps}",
    }


@app.post("/api/v1/reward/record")
async def record_reward(reward: RewardSignal) -> Dict[str, Any]:
    """Record reward signal for policy update."""
    if reward_model is None or experience_buffer is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    logger.info(f"Recording reward for learner {reward.learner_id}")

    # Compute reward components
    reward_components = reward_model.compute(
        state=reward.state,
        action=reward.action_taken,
        outcome=reward.outcome,
    )

    # Get action index
    action_type = reward.action_taken.get("action_type", "explanation")
    action_idx = action_selector.get_action_index(action_type) if action_selector else 0

    # Store experience
    next_state = reward.next_state if reward.next_state else reward.state
    experience_buffer.add(
        state=reward.state,
        action=action_idx,
        reward=reward_components.total,
        next_state=next_state,
        done=reward.done,
    )

    # Track reward distribution in Prometheus (S11.4)
    observe_reward(reward_components.total)

    return {
        "status": "success",
        "recorded": True,
        "learner_id": reward.learner_id,
        "reward_components": {
            "learning_gain": reward_components.learning_gain,
            "engagement": reward_components.engagement,
            "efficiency": reward_components.efficiency,
            "total": reward_components.total,
        },
        "buffer_size": len(experience_buffer),
    }


@app.post("/api/v1/policy/update")
async def update_policy(batch_size: int = 32, epochs: int = 10) -> Dict[str, Any]:
    """Trigger policy update from collected experiences."""
    if policy_learner is None or experience_buffer is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    buffer_size = len(experience_buffer)
    if buffer_size < batch_size:
        return {
            "status": "skipped",
            "message": f"Not enough experiences in buffer ({buffer_size} < {batch_size})",
            "updated": False,
            "buffer_size": buffer_size,
        }

    logger.info(f"Updating policy with batch_size={batch_size}, epochs={epochs}")

    # Sample experiences and train
    experiences = experience_buffer.sample(batch_size)
    prev_steps = policy_learner.training_steps

    policy_learner.train(experiences, epochs=epochs)

    return {
        "status": "success",
        "updated": True,
        "batch_size": batch_size,
        "epochs": epochs,
        "training_steps": policy_learner.training_steps,
        "steps_this_update": policy_learner.training_steps - prev_steps,
        "buffer_size": buffer_size,
        "policy_stats": policy_learner.get_statistics(),
    }


@app.get("/api/v1/policy/evaluate")
async def evaluate_policy(num_episodes: int = 100) -> Dict[str, Any]:
    """Evaluate current policy performance."""
    if policy_learner is None or policy_evaluator is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    logger.info(f"Evaluating policy over {num_episodes} episodes")

    # Get experience data if available
    experience_data = None
    if experience_buffer and len(experience_buffer) > 0:
        experience_data = experience_buffer.get_all()

    metrics = policy_evaluator.evaluate(
        policy=policy_learner,
        num_episodes=num_episodes,
        experience_data=experience_data,
    )

    return {
        "status": "success",
        "metrics": {
            "average_reward": metrics.average_reward,
            "learning_gain": metrics.learning_gain,
            "completion_rate": metrics.completion_rate,
            "engagement_score": metrics.engagement_score,
            "episodes_evaluated": metrics.episodes_evaluated,
        },
        "policy_version": f"trained_{policy_learner.training_steps}",
        "policy_stats": policy_learner.get_statistics(),
    }


@app.get("/api/v1/buffer/stats")
async def get_buffer_stats() -> Dict[str, Any]:
    """Get experience buffer statistics."""
    if experience_buffer is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    return {
        "status": "success",
        "buffer_stats": experience_buffer.get_statistics(),
    }


@app.post("/api/v1/policy/save")
async def save_policy(path: str = "/tmp/rl_policy.json") -> Dict[str, Any]:
    """Save current policy to file."""
    if policy_learner is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    policy_learner.save(path)
    return {
        "status": "success",
        "saved_to": path,
        "training_steps": policy_learner.training_steps,
    }


@app.post("/api/v1/policy/load")
async def load_policy(path: str = "/tmp/rl_policy.json") -> Dict[str, Any]:
    """Load policy from file."""
    if policy_learner is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    success = policy_learner.load(path)
    if not success:
        raise HTTPException(status_code=404, detail=f"Policy file not found: {path}")

    return {
        "status": "success",
        "loaded_from": path,
        "training_steps": policy_learner.training_steps,
        "policy_stats": policy_learner.get_statistics(),
    }


# ==================== Student-Centric Endpoints ====================

@app.post("/api/v1/students/{student_id}/session/start")
async def start_session(
    student_id: str,
    request: StartSessionRequest,
) -> Dict[str, Any]:
    """Start a new learning session for a student."""
    if session_manager is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    logger.info(f"Starting session for student {student_id}")

    # Map age group string to enum
    age_group_map = {
        "child": StudentAgeGroup.CHILD,
        "teen": StudentAgeGroup.TEEN,
        "adult": StudentAgeGroup.ADULT,
    }
    age_group = age_group_map.get(request.age_group.lower(), StudentAgeGroup.ADULT)

    session = session_manager.start_session(
        student_id=student_id,
        age_group=age_group,
        max_duration=request.max_duration,
    )

    # Get student profile
    student = session_manager.get_student(student_id)

    return {
        "status": "success",
        "session": session.to_dict(),
        "student": student.to_dict() if student else None,
        "safety_constraints": {
            "is_minor": student.is_minor if student else False,
            "max_exploration_actions": session.max_exploration_actions,
            "max_session_duration": session.max_session_duration,
        },
    }


@app.post("/api/v1/students/{student_id}/session/end")
async def end_session(student_id: str) -> Dict[str, Any]:
    """End the current learning session for a student."""
    if session_manager is None or safety_monitor is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    logger.info(f"Ending session for student {student_id}")

    # Get session before ending
    student = session_manager.get_student(student_id)
    if not student or not student.has_active_session():
        raise HTTPException(status_code=404, detail="No active session found")

    session_id = student.current_session.session_id if student.current_session else None

    # End session
    summary = session_manager.end_session(student_id)

    # Clear safety tracking
    if session_id:
        safety_monitor.clear_session_tracking(session_id)

    # Get safety statistics for the session
    safety_stats = safety_monitor.get_safety_statistics(student_id)

    return {
        "status": "success",
        "session_summary": summary,
        "safety_statistics": safety_stats,
    }


@app.get("/api/v1/students/{student_id}/next-content")
async def get_next_content(
    student_id: str,
    topic: Optional[str] = Query(default=None, description="Target topic"),
    use_policy: bool = Query(default=True, description="Use RL policy (False = rule-based)"),
) -> Dict[str, Any]:
    """Get the next content recommendation for a student."""
    if session_manager is None or content_recommender is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    logger.info(f"Getting next content for student {student_id}")

    # Get or create student
    student = session_manager.get_or_create_student(student_id)

    # Start session if needed
    if not student.has_active_session():
        session_manager.start_session(student_id)
        student = session_manager.get_student(student_id)
        if student is None:
            raise HTTPException(status_code=500, detail="Failed to create student")

    # Get recommendation
    recommendation, metadata = content_recommender.recommend_next_content(
        student=student,
        target_topic=topic,
        use_policy=use_policy,
    )

    # Update current content in session
    session_manager.set_current_content(student_id, recommendation.content_id)

    return {
        "status": "success",
        "student_id": student_id,
        "recommendation": recommendation.to_dict(),
        "metadata": metadata,
        "session": student.current_session.to_dict() if student.current_session else None,
    }


@app.post("/api/v1/students/{student_id}/feedback")
async def submit_feedback(
    student_id: str,
    feedback: FeedbackRequest,
) -> Dict[str, Any]:
    """Submit feedback on a content interaction."""
    if session_manager is None or reward_model is None or experience_buffer is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    logger.info(f"Recording feedback for student {student_id}")

    student = session_manager.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if not student.has_active_session():
        raise HTTPException(status_code=400, detail="No active session")

    session = student.current_session
    if session is None:
        raise HTTPException(status_code=400, detail="No active session")

    # Record performance in session
    session_manager.record_performance(
        student_id=student_id,
        correct=feedback.correct,
        response_time=feedback.response_time,
        topic=feedback.topic,
    )

    # Record hints and help requests
    if feedback.hint_used:
        session_manager.record_hint_used(student_id)
    if feedback.help_requested:
        session_manager.record_help_request(student_id)

    # Update engagement if provided
    if feedback.engagement is not None:
        session_manager.update_engagement(student_id, feedback.engagement)

    # Compute reward for RL training
    state = student.get_learning_context()
    outcome = {
        "correctness": 1.0 if feedback.correct else 0.0,
        "time": feedback.response_time,
        "engagement": feedback.engagement or session.get_current_engagement(),
        "hints_used": 1 if feedback.hint_used else 0,
    }

    action_taken = {
        "action_type": "content_delivery",
        "content_id": feedback.content_id,
    }

    reward_components = reward_model.compute(
        state=state,
        action=action_taken,
        outcome=outcome,
    )

    # Store experience for training
    experience_buffer.add(
        state=state,
        action=0,  # Will be improved with proper action tracking
        reward=reward_components.total,
        next_state=student.get_learning_context(),
        done=False,
    )

    # Refresh student data
    student = session_manager.get_student(student_id)

    return {
        "status": "success",
        "student_id": student_id,
        "feedback_recorded": True,
        "reward": {
            "learning_gain": reward_components.learning_gain,
            "engagement": reward_components.engagement,
            "efficiency": reward_components.efficiency,
            "total": reward_components.total,
        },
        "session_stats": {
            "items_completed": session.items_completed,
            "accuracy": session.get_accuracy(),
            "current_engagement": session.get_current_engagement(),
            "consecutive_failures": session.consecutive_failures,
        },
        "knowledge_update": {
            "topic": feedback.topic,
            "new_mastery": student.knowledge_state.get_mastery(feedback.topic) if student and feedback.topic else None,
        },
    }


@app.get("/api/v1/students/{student_id}/learning-path")
async def get_learning_path(
    student_id: str,
    topic: str = Query(..., description="Target topic for learning path"),
    target_mastery: float = Query(default=0.8, description="Target mastery level (0.0-1.0)"),
    max_nodes: int = Query(default=10, description="Maximum number of nodes in path"),
) -> Dict[str, Any]:
    """Get or generate a personalized learning path for a student."""
    if session_manager is None or content_recommender is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    logger.info(f"Getting learning path for student {student_id}, topic={topic}")

    # Get or create student
    student = session_manager.get_or_create_student(student_id)

    # Check if there's an existing path
    existing_path = session_manager.get_learning_path(student_id)
    if existing_path and existing_path.target_topic == topic:
        return {
            "status": "success",
            "student_id": student_id,
            "learning_path": existing_path.to_dict(),
            "is_new": False,
        }

    # Generate new learning path
    path = content_recommender.generate_learning_path(
        student=student,
        target_topic=topic,
        target_mastery=target_mastery,
        max_nodes=max_nodes,
    )

    # Store in session manager
    session_manager._learning_paths[path.path_id] = path

    return {
        "status": "success",
        "student_id": student_id,
        "learning_path": path.to_dict(),
        "is_new": True,
        "current_mastery": student.knowledge_state.get_mastery(topic),
        "target_mastery": target_mastery,
    }


@app.get("/api/v1/students/{student_id}/profile")
async def get_student_profile(student_id: str) -> Dict[str, Any]:
    """Get a student's profile and learning statistics."""
    if session_manager is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    student = session_manager.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get safety statistics
    safety_stats = None
    if safety_monitor:
        safety_stats = safety_monitor.get_safety_statistics(student_id)

    return {
        "status": "success",
        "profile": student.to_dict(),
        "safety_statistics": safety_stats,
    }


@app.get("/api/v1/students/{student_id}/audit-log")
async def get_student_audit_log(
    student_id: str,
    limit: int = Query(default=50, description="Maximum entries to return"),
) -> Dict[str, Any]:
    """Get audit log for a student's tutoring interactions."""
    if safety_monitor is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    entries = safety_monitor.get_audit_log(student_id=student_id, limit=limit)

    return {
        "status": "success",
        "student_id": student_id,
        "entries_count": len(entries),
        "audit_log": entries,
    }


# ==================== Service Statistics Endpoints ====================

@app.get("/api/v1/stats/sessions")
async def get_session_stats() -> Dict[str, Any]:
    """Get session management statistics."""
    if session_manager is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    return {
        "status": "success",
        "session_stats": session_manager.get_statistics(),
    }


@app.get("/api/v1/stats/safety")
async def get_safety_stats() -> Dict[str, Any]:
    """Get safety monitoring statistics."""
    if safety_monitor is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    return {
        "status": "success",
        "safety_stats": safety_monitor.get_safety_statistics(),
    }


@app.get("/api/v1/stats/recommendations")
async def get_recommendation_stats() -> Dict[str, Any]:
    """Get content recommendation statistics."""
    if content_recommender is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    return {
        "status": "success",
        "recommendation_stats": content_recommender.get_statistics(),
    }


# ==================== Warm-Start Endpoint ====================

@app.post("/api/v1/warm-start")
async def trigger_warm_start(
    num_curriculum: int = 500,
    train_epochs: int = 20,
) -> Dict[str, Any]:
    """Trigger warm-start training from curriculum rules and optional BKT data."""
    if policy_learner is None or experience_buffer is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    from app.services.warm_start import warm_start_policy

    summary = warm_start_policy(
        policy_learner=policy_learner,
        experience_buffer=experience_buffer,
        num_curriculum=num_curriculum,
        train_epochs=train_epochs,
    )

    # Auto-checkpoint after warm-start
    if checkpoint_store is not None:
        await checkpoint_store.force_save(policy_learner)

    return {"status": "success", **summary}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
