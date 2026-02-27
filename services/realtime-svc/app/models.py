"""
WebSocket Models

Pydantic models for WebSocket messages, connections, rooms, and learning events.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


def generate_id() -> str:
    """Generate a unique message ID."""
    return f"msg_{uuid4().hex[:16]}"


def generate_connection_id() -> str:
    """Generate a unique connection ID."""
    return f"conn_{uuid4().hex[:12]}"


# =============================================================================
# MESSAGE TYPES
# =============================================================================


class MessageType(str, Enum):
    """WebSocket message types for bidirectional communication."""

    # Client -> Server
    JOIN_SESSION = "join_session"
    LEAVE_SESSION = "leave_session"
    LEARNER_ACTION = "learner_action"
    HEARTBEAT = "heartbeat"
    SUBSCRIBE_ROOM = "subscribe_room"
    UNSUBSCRIBE_ROOM = "unsubscribe_room"

    # Server -> Client
    SESSION_STATE = "session_state"
    INTERVENTION = "intervention"
    FEEDBACK = "feedback"
    COGNITIVE_UPDATE = "cognitive_update"
    PROGRESS_UPDATE = "progress_update"
    ERROR = "error"
    PONG = "pong"

    # Bidirectional
    CHAT = "chat"
    PRESENCE_UPDATE = "presence_update"
    ROOM_MESSAGE = "room_message"

    # Tutor session events
    TUTOR_JOIN = "tutor:join"
    TUTOR_LEAVE = "tutor:leave"
    TUTOR_MESSAGE = "tutor:message"
    TUTOR_TYPING = "tutor:typing"
    TUTOR_EMOTION = "tutor:emotion"
    TUTOR_SESSION_END = "tutor:session_end"


class ActionType(str, Enum):
    """Types of learner actions that can be tracked."""

    ANSWER_SUBMITTED = "answer_submitted"
    HINT_REQUESTED = "hint_requested"
    CONTENT_VIEWED = "content_viewed"
    QUESTION_ASKED = "question_asked"
    NAVIGATION = "navigation"
    PAUSE_RESUME = "pause_resume"
    FOCUS_CHANGE = "focus_change"
    INTERACTION = "interaction"
    ASSESSMENT_STARTED = "assessment_started"
    ASSESSMENT_COMPLETED = "assessment_completed"


class InterventionType(str, Enum):
    """Types of interventions that can be triggered."""

    ENCOURAGEMENT = "encouragement"
    HINT = "hint"
    SIMPLIFICATION = "simplification"
    BREAK_SUGGESTION = "break_suggestion"
    DIFFICULTY_ADJUSTMENT = "difficulty_adjustment"
    SCAFFOLDING = "scaffolding"
    REVIEW_PROMPT = "review_prompt"
    CELEBRATION = "celebration"


class CognitiveStateLevel(str, Enum):
    """Cognitive load levels."""

    LOW = "low"
    OPTIMAL = "optimal"
    HIGH = "high"
    OVERLOAD = "overload"


class EngagementLevel(str, Enum):
    """Engagement levels."""

    DISENGAGED = "disengaged"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    FLOW = "flow"


class UserStatus(str, Enum):
    """User presence status."""

    ONLINE = "online"
    AWAY = "away"
    BUSY = "busy"
    OFFLINE = "offline"


class DeviceType(str, Enum):
    """Device types for connections."""

    WEB = "web"
    MOBILE = "mobile"
    TABLET = "tablet"


class RoomType(str, Enum):
    """Types of WebSocket rooms."""

    SESSION = "session"
    CLASS = "class"
    BROADCAST = "broadcast"
    PRIVATE = "private"
    ANALYTICS = "analytics"


# =============================================================================
# MESSAGE MODELS
# =============================================================================


class WebSocketMessage(BaseModel):
    """Base WebSocket message format."""

    type: MessageType
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    message_id: str = Field(default_factory=generate_id)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class ErrorPayload(BaseModel):
    """Error message payload."""

    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


# =============================================================================
# CONNECTION MODELS
# =============================================================================


class ConnectionInfo(BaseModel):
    """Information about a WebSocket connection."""

    connection_id: str = Field(default_factory=generate_connection_id)
    learner_id: str
    tenant_id: Optional[str] = None
    session_id: Optional[str] = None
    connected_at: datetime = Field(default_factory=datetime.utcnow)
    last_heartbeat: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    rooms: List[str] = Field(default_factory=list)
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    device: DeviceType = DeviceType.WEB
    status: UserStatus = UserStatus.ONLINE
    reconnect_count: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class HeartbeatData(BaseModel):
    """Heartbeat message data."""

    client_timestamp: Optional[datetime] = None
    sequence: Optional[int] = None


# =============================================================================
# ROOM MODELS
# =============================================================================


class RoomInfo(BaseModel):
    """Information about a WebSocket room."""

    room_id: str
    room_type: RoomType
    connections: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    member_count: int = 0
    max_members: Optional[int] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    persistent: bool = False

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class RoomMember(BaseModel):
    """A member in a room."""

    connection_id: str
    learner_id: str
    display_name: Optional[str] = None
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    role: Optional[str] = None


class RoomMessage(BaseModel):
    """Message sent to a room."""

    message_id: str = Field(default_factory=generate_id)
    room_id: str
    sender_id: str
    sender_name: Optional[str] = None
    content: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


# =============================================================================
# LEARNER ACTION MODELS
# =============================================================================


class LearnerAction(BaseModel):
    """Represents a learner action for cognitive tracking."""

    action_type: ActionType
    learner_id: str
    session_id: Optional[str] = None
    content_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = Field(default_factory=dict)
    duration_ms: Optional[int] = None
    correct: Optional[bool] = None
    attempt_number: Optional[int] = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class AnswerSubmission(BaseModel):
    """Data for an answer submission action."""

    question_id: str
    answer: Any
    correct: bool
    time_taken_ms: int
    attempt_number: int = 1
    hints_used: int = 0


class ContentView(BaseModel):
    """Data for content view tracking."""

    content_id: str
    content_type: str
    duration_ms: int
    scroll_depth: Optional[float] = None
    interactions: int = 0


# =============================================================================
# COGNITIVE STATE MODELS
# =============================================================================


class CognitiveState(BaseModel):
    """Represents the current cognitive state of a learner."""

    learner_id: str
    session_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Cognitive metrics
    cognitive_load: CognitiveStateLevel = CognitiveStateLevel.OPTIMAL
    cognitive_load_score: float = Field(default=0.5, ge=0.0, le=1.0)
    engagement_level: EngagementLevel = EngagementLevel.MODERATE
    engagement_score: float = Field(default=0.5, ge=0.0, le=1.0)
    frustration_index: float = Field(default=0.0, ge=0.0, le=1.0)
    confidence_score: float = Field(default=0.5, ge=0.0, le=1.0)

    # Learning metrics
    recent_accuracy: float = Field(default=0.0, ge=0.0, le=1.0)
    response_time_trend: str = "stable"  # "improving", "stable", "declining"
    hint_dependency: float = Field(default=0.0, ge=0.0, le=1.0)

    # State indicators
    needs_intervention: bool = False
    intervention_triggers: List[str] = Field(default_factory=list)
    suggested_actions: List[str] = Field(default_factory=list)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


# =============================================================================
# INTERVENTION MODELS
# =============================================================================


class Intervention(BaseModel):
    """An intervention to be delivered to the learner."""

    intervention_id: str = Field(default_factory=generate_id)
    learner_id: str
    session_id: Optional[str] = None
    intervention_type: InterventionType
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Intervention content
    title: str
    message: str
    action_button_text: Optional[str] = None
    action_url: Optional[str] = None

    # Contextual data
    trigger_reason: str
    cognitive_state_snapshot: Optional[CognitiveState] = None
    priority: int = Field(default=5, ge=1, le=10)  # 1 = lowest, 10 = highest
    dismissible: bool = True
    auto_dismiss_seconds: Optional[int] = None

    # Tracking
    delivered_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    action_taken: Optional[str] = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


# =============================================================================
# SESSION STATE MODELS
# =============================================================================


class SessionState(BaseModel):
    """Current state of a learning session."""

    session_id: str
    learner_id: str
    started_at: datetime
    last_activity: datetime = Field(default_factory=datetime.utcnow)

    # Progress
    current_content_id: Optional[str] = None
    progress_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    completed_items: List[str] = Field(default_factory=list)

    # Performance
    questions_answered: int = 0
    questions_correct: int = 0
    hints_used: int = 0
    time_on_task_seconds: int = 0

    # State
    is_active: bool = True
    is_paused: bool = False
    cognitive_state: Optional[CognitiveState] = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


# =============================================================================
# PRESENCE MODELS
# =============================================================================


class PresenceUpdate(BaseModel):
    """Presence update for a user."""

    learner_id: str
    status: UserStatus
    current_room: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


# =============================================================================
# BROADCAST MODELS
# =============================================================================


class BroadcastMessage(BaseModel):
    """Message for cross-server broadcasting."""

    type: str  # "broadcast", "targeted", "room"
    event: str
    data: Dict[str, Any]
    room: Optional[str] = None
    target_learner_ids: Optional[List[str]] = None
    exclude_connection_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}
