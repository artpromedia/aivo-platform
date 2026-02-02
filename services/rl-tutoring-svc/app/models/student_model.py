"""
Student Model

Data models for student state, sessions, and knowledge tracking.
"""
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)


class StudentAgeGroup(str, Enum):
    """Age groups for safety constraints."""
    CHILD = "child"        # Under 13
    TEEN = "teen"          # 13-17
    ADULT = "adult"        # 18+


class SessionStatus(str, Enum):
    """Learning session status."""
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    EXPIRED = "expired"


class ContentType(str, Enum):
    """Types of learning content."""
    LESSON = "lesson"
    QUIZ = "quiz"
    PRACTICE = "practice"
    VIDEO = "video"
    INTERACTIVE = "interactive"
    REVIEW = "review"


@dataclass
class KnowledgeState:
    """
    Represents a student's knowledge state across topics.
    
    Each topic has a mastery level (0.0 to 1.0) and confidence score.
    """
    topic_mastery: Dict[str, float] = field(default_factory=dict)
    topic_confidence: Dict[str, float] = field(default_factory=dict)
    last_updated: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    version: int = 1
    
    def get_mastery(self, topic: str) -> float:
        """Get mastery level for a topic."""
        return self.topic_mastery.get(topic, 0.0)
    
    def set_mastery(self, topic: str, mastery: float, confidence: float = 0.5) -> None:
        """Set mastery level for a topic."""
        self.topic_mastery[topic] = max(0.0, min(1.0, mastery))
        self.topic_confidence[topic] = max(0.0, min(1.0, confidence))
        self.last_updated = datetime.now(timezone.utc)
        self.version += 1
    
    def update_mastery(self, topic: str, delta: float, correct: bool) -> float:
        """
        Update mastery based on interaction outcome.
        
        Args:
            topic: Topic identifier
            delta: Base change amount
            correct: Whether the answer was correct
        
        Returns:
            New mastery level
        """
        current = self.get_mastery(topic)
        current_confidence = self.topic_confidence.get(topic, 0.5)
        
        if correct:
            # Increase mastery, more if confidence was low (surprising success)
            adjustment = delta * (1.0 + (1.0 - current_confidence) * 0.5)
            new_mastery = current + adjustment
            new_confidence = min(1.0, current_confidence + 0.1)
        else:
            # Decrease mastery, more if confidence was high (surprising failure)
            adjustment = delta * (1.0 + current_confidence * 0.5)
            new_mastery = current - adjustment * 0.5  # Forgetting is slower
            new_confidence = max(0.0, current_confidence - 0.15)
        
        self.set_mastery(topic, new_mastery, new_confidence)
        return self.topic_mastery[topic]
    
    def get_average_mastery(self) -> float:
        """Get average mastery across all topics."""
        if not self.topic_mastery:
            return 0.0
        return sum(self.topic_mastery.values()) / len(self.topic_mastery)
    
    def get_weak_topics(self, threshold: float = 0.5) -> List[str]:
        """Get topics with mastery below threshold."""
        return [topic for topic, mastery in self.topic_mastery.items() if mastery < threshold]
    
    def get_strong_topics(self, threshold: float = 0.7) -> List[str]:
        """Get topics with mastery above threshold."""
        return [topic for topic, mastery in self.topic_mastery.items() if mastery >= threshold]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "topic_mastery": self.topic_mastery.copy(),
            "topic_confidence": self.topic_confidence.copy(),
            "last_updated": self.last_updated.isoformat(),
            "version": self.version,
            "average_mastery": self.get_average_mastery(),
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "KnowledgeState":
        """Create from dictionary."""
        state = cls(
            topic_mastery=data.get("topic_mastery", {}),
            topic_confidence=data.get("topic_confidence", {}),
            version=data.get("version", 1),
        )
        if "last_updated" in data:
            state.last_updated = datetime.fromisoformat(data["last_updated"])
        return state


@dataclass
class LearningSession:
    """
    Represents an active learning session for a student.
    """
    session_id: str = field(default_factory=lambda: str(uuid4()))
    student_id: str = ""
    status: SessionStatus = SessionStatus.ACTIVE
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None
    
    # Session progress
    items_completed: int = 0
    items_correct: int = 0
    hints_used: int = 0
    help_requests: int = 0
    
    # Content tracking
    current_content_id: Optional[str] = None
    completed_content_ids: List[str] = field(default_factory=list)
    
    # Engagement metrics
    engagement_history: List[float] = field(default_factory=list)
    attention_scores: List[float] = field(default_factory=list)
    
    # Performance tracking
    performance_history: List[float] = field(default_factory=list)
    response_times: List[float] = field(default_factory=list)
    
    # Safety constraints
    max_session_duration: int = 3600  # 1 hour default (seconds)
    max_consecutive_failures: int = 5
    consecutive_failures: int = 0
    exploration_actions_taken: int = 0
    max_exploration_actions: int = 10  # Limit for minors
    
    def get_duration_seconds(self) -> float:
        """Get session duration in seconds."""
        end = self.ended_at or datetime.now(timezone.utc)
        return (end - self.started_at).total_seconds()
    
    def get_accuracy(self) -> float:
        """Get session accuracy (correct / total)."""
        if self.items_completed == 0:
            return 0.0
        return self.items_correct / self.items_completed
    
    def get_current_engagement(self) -> float:
        """Get current engagement level."""
        if not self.engagement_history:
            return 0.7  # Default moderate engagement
        return self.engagement_history[-1]
    
    def get_average_engagement(self) -> float:
        """Get average engagement over session."""
        if not self.engagement_history:
            return 0.7
        return sum(self.engagement_history) / len(self.engagement_history)
    
    def update_engagement(self, engagement: float) -> None:
        """Update engagement history."""
        self.engagement_history.append(max(0.0, min(1.0, engagement)))
    
    def record_performance(self, correct: bool, response_time: float) -> None:
        """Record a performance result."""
        self.items_completed += 1
        if correct:
            self.items_correct += 1
            self.consecutive_failures = 0
        else:
            self.consecutive_failures += 1
        
        self.performance_history.append(1.0 if correct else 0.0)
        self.response_times.append(response_time)
    
    def record_hint_used(self) -> None:
        """Record a hint was used."""
        self.hints_used += 1
    
    def record_help_request(self) -> None:
        """Record a help request."""
        self.help_requests += 1
    
    def record_exploration_action(self) -> None:
        """Record an exploration (non-optimal) action was taken."""
        self.exploration_actions_taken += 1
    
    def can_explore(self, is_minor: bool = False) -> bool:
        """Check if exploration is allowed."""
        if is_minor:
            return self.exploration_actions_taken < self.max_exploration_actions
        return True  # Adults have no limit
    
    def needs_intervention(self) -> bool:
        """Check if the student needs intervention (too many failures)."""
        return self.consecutive_failures >= self.max_consecutive_failures
    
    def is_expired(self) -> bool:
        """Check if session has exceeded max duration."""
        return self.get_duration_seconds() > self.max_session_duration
    
    def end_session(self, status: SessionStatus = SessionStatus.COMPLETED) -> None:
        """End the session."""
        self.status = status
        self.ended_at = datetime.now(timezone.utc)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "session_id": self.session_id,
            "student_id": self.student_id,
            "status": self.status.value,
            "started_at": self.started_at.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "duration_seconds": self.get_duration_seconds(),
            "items_completed": self.items_completed,
            "items_correct": self.items_correct,
            "accuracy": self.get_accuracy(),
            "hints_used": self.hints_used,
            "help_requests": self.help_requests,
            "current_content_id": self.current_content_id,
            "completed_content_ids": self.completed_content_ids.copy(),
            "current_engagement": self.get_current_engagement(),
            "average_engagement": self.get_average_engagement(),
            "consecutive_failures": self.consecutive_failures,
            "exploration_actions_taken": self.exploration_actions_taken,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LearningSession":
        """Create from dictionary."""
        session = cls(
            session_id=data.get("session_id", str(uuid4())),
            student_id=data.get("student_id", ""),
            items_completed=data.get("items_completed", 0),
            items_correct=data.get("items_correct", 0),
            hints_used=data.get("hints_used", 0),
            help_requests=data.get("help_requests", 0),
            current_content_id=data.get("current_content_id"),
            completed_content_ids=data.get("completed_content_ids", []),
            engagement_history=data.get("engagement_history", []),
            performance_history=data.get("performance_history", []),
            consecutive_failures=data.get("consecutive_failures", 0),
            exploration_actions_taken=data.get("exploration_actions_taken", 0),
        )
        
        if "status" in data:
            session.status = SessionStatus(data["status"])
        if "started_at" in data:
            session.started_at = datetime.fromisoformat(data["started_at"])
        if "ended_at" in data and data["ended_at"]:
            session.ended_at = datetime.fromisoformat(data["ended_at"])
        
        return session


@dataclass
class StudentProfile:
    """
    Complete student profile for personalized tutoring.
    """
    student_id: str
    age_group: StudentAgeGroup = StudentAgeGroup.ADULT
    grade_level: Optional[int] = None
    
    # Knowledge state
    knowledge_state: KnowledgeState = field(default_factory=KnowledgeState)
    
    # Learning preferences
    preferred_content_types: List[ContentType] = field(default_factory=list)
    preferred_difficulty: float = 0.5  # 0.0 = easy, 1.0 = hard
    learning_pace: float = 1.0  # Multiplier for content speed
    
    # Historical metrics
    total_sessions: int = 0
    total_time_spent: float = 0.0  # seconds
    total_items_completed: int = 0
    total_items_correct: int = 0
    
    # Current session
    current_session: Optional[LearningSession] = None
    
    # Timestamps
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_active_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Safety and ethics tracking
    is_minor: bool = False
    requires_parental_consent: bool = False
    exploration_budget: int = 10  # Remaining exploration actions for session
    
    def __post_init__(self):
        """Set safety flags based on age group."""
        if self.age_group in (StudentAgeGroup.CHILD, StudentAgeGroup.TEEN):
            self.is_minor = True
            self.requires_parental_consent = self.age_group == StudentAgeGroup.CHILD
    
    def get_overall_accuracy(self) -> float:
        """Get overall accuracy across all sessions."""
        if self.total_items_completed == 0:
            return 0.0
        return self.total_items_correct / self.total_items_completed
    
    def start_session(self, max_duration: Optional[int] = None) -> LearningSession:
        """Start a new learning session."""
        session = LearningSession(
            student_id=self.student_id,
            max_session_duration=max_duration or (1800 if self.is_minor else 3600),
            max_exploration_actions=self.exploration_budget,
        )
        self.current_session = session
        self.total_sessions += 1
        self.last_active_at = datetime.now(timezone.utc)
        return session
    
    def end_session(self) -> Optional[Dict[str, Any]]:
        """End current session and update stats."""
        if not self.current_session:
            return None
        
        session = self.current_session
        session.end_session()
        
        # Update cumulative stats
        self.total_time_spent += session.get_duration_seconds()
        self.total_items_completed += session.items_completed
        self.total_items_correct += session.items_correct
        
        # Reset exploration budget
        self.exploration_budget = 10 if self.is_minor else 100
        
        summary = session.to_dict()
        self.current_session = None
        return summary
    
    def has_active_session(self) -> bool:
        """Check if student has an active session."""
        return self.current_session is not None and self.current_session.status == SessionStatus.ACTIVE
    
    def get_learning_context(self) -> Dict[str, Any]:
        """Get current learning context for policy decisions."""
        context = {
            "student_id": self.student_id,
            "age_group": self.age_group.value,
            "is_minor": self.is_minor,
            "knowledge_state": self.knowledge_state.topic_mastery,
            "average_mastery": self.knowledge_state.get_average_mastery(),
            "weak_topics": self.knowledge_state.get_weak_topics(),
            "strong_topics": self.knowledge_state.get_strong_topics(),
            "preferred_difficulty": self.preferred_difficulty,
            "learning_pace": self.learning_pace,
            "overall_accuracy": self.get_overall_accuracy(),
        }
        
        if self.current_session:
            context.update({
                "session_id": self.current_session.session_id,
                "session_duration": self.current_session.get_duration_seconds(),
                "session_accuracy": self.current_session.get_accuracy(),
                "current_engagement": self.current_session.get_current_engagement(),
                "items_completed": self.current_session.items_completed,
                "hints_used": self.current_session.hints_used,
                "consecutive_failures": self.current_session.consecutive_failures,
                "can_explore": self.current_session.can_explore(self.is_minor),
                "needs_intervention": self.current_session.needs_intervention(),
                "current_content_id": self.current_session.current_content_id,
                "completed_content_ids": self.current_session.completed_content_ids,
                "recent_performance": self.current_session.performance_history[-10:] if self.current_session.performance_history else [],
            })
        
        return context
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "student_id": self.student_id,
            "age_group": self.age_group.value,
            "grade_level": self.grade_level,
            "knowledge_state": self.knowledge_state.to_dict(),
            "preferred_content_types": [ct.value for ct in self.preferred_content_types],
            "preferred_difficulty": self.preferred_difficulty,
            "learning_pace": self.learning_pace,
            "total_sessions": self.total_sessions,
            "total_time_spent": self.total_time_spent,
            "total_items_completed": self.total_items_completed,
            "total_items_correct": self.total_items_correct,
            "overall_accuracy": self.get_overall_accuracy(),
            "is_minor": self.is_minor,
            "requires_parental_consent": self.requires_parental_consent,
            "created_at": self.created_at.isoformat(),
            "last_active_at": self.last_active_at.isoformat(),
            "current_session": self.current_session.to_dict() if self.current_session else None,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StudentProfile":
        """Create from dictionary."""
        profile = cls(
            student_id=data["student_id"],
            age_group=StudentAgeGroup(data.get("age_group", "adult")),
            grade_level=data.get("grade_level"),
            preferred_difficulty=data.get("preferred_difficulty", 0.5),
            learning_pace=data.get("learning_pace", 1.0),
            total_sessions=data.get("total_sessions", 0),
            total_time_spent=data.get("total_time_spent", 0.0),
            total_items_completed=data.get("total_items_completed", 0),
            total_items_correct=data.get("total_items_correct", 0),
            exploration_budget=data.get("exploration_budget", 10),
        )
        
        # Parse knowledge state
        if "knowledge_state" in data:
            profile.knowledge_state = KnowledgeState.from_dict(data["knowledge_state"])
        
        # Parse content types
        if "preferred_content_types" in data:
            profile.preferred_content_types = [
                ContentType(ct) for ct in data["preferred_content_types"]
            ]
        
        # Parse timestamps
        if "created_at" in data:
            profile.created_at = datetime.fromisoformat(data["created_at"])
        if "last_active_at" in data:
            profile.last_active_at = datetime.fromisoformat(data["last_active_at"])
        
        # Parse current session
        if data.get("current_session"):
            profile.current_session = LearningSession.from_dict(data["current_session"])
        
        return profile


@dataclass
class ContentRecommendation:
    """A content recommendation with metadata."""
    content_id: str
    content_type: ContentType
    topic: str
    difficulty: float
    estimated_duration: int  # seconds
    reason: str  # Why this content was recommended
    confidence: float  # Confidence in the recommendation
    is_exploration: bool  # Whether this is an exploration action
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "content_id": self.content_id,
            "content_type": self.content_type.value,
            "topic": self.topic,
            "difficulty": self.difficulty,
            "estimated_duration": self.estimated_duration,
            "reason": self.reason,
            "confidence": self.confidence,
            "is_exploration": self.is_exploration,
        }


@dataclass
class LearningPathNode:
    """A node in the learning path."""
    content_id: str
    content_type: ContentType
    topic: str
    prerequisites: List[str]  # Content IDs that should be completed first
    estimated_duration: int  # seconds
    target_mastery: float  # Mastery level to achieve before moving on
    order: int  # Position in the path
    status: str = "not_started"  # not_started, in_progress, completed, skipped
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "content_id": self.content_id,
            "content_type": self.content_type.value,
            "topic": self.topic,
            "prerequisites": self.prerequisites,
            "estimated_duration": self.estimated_duration,
            "target_mastery": self.target_mastery,
            "order": self.order,
            "status": self.status,
        }


@dataclass  
class LearningPath:
    """A personalized learning path for a student."""
    path_id: str = field(default_factory=lambda: str(uuid4()))
    student_id: str = ""
    target_topic: str = ""
    nodes: List[LearningPathNode] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    estimated_total_duration: int = 0  # seconds
    current_node_index: int = 0
    
    def get_current_node(self) -> Optional[LearningPathNode]:
        """Get the current node in the path."""
        if 0 <= self.current_node_index < len(self.nodes):
            return self.nodes[self.current_node_index]
        return None
    
    def get_next_node(self) -> Optional[LearningPathNode]:
        """Get the next node in the path."""
        next_idx = self.current_node_index + 1
        if 0 <= next_idx < len(self.nodes):
            return self.nodes[next_idx]
        return None
    
    def advance(self) -> bool:
        """Advance to the next node. Returns False if at end."""
        if self.current_node_index < len(self.nodes) - 1:
            self.nodes[self.current_node_index].status = "completed"
            self.current_node_index += 1
            self.nodes[self.current_node_index].status = "in_progress"
            return True
        return False
    
    def get_progress(self) -> float:
        """Get path completion progress (0.0 to 1.0)."""
        if not self.nodes:
            return 0.0
        completed = sum(1 for n in self.nodes if n.status == "completed")
        return completed / len(self.nodes)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "path_id": self.path_id,
            "student_id": self.student_id,
            "target_topic": self.target_topic,
            "nodes": [n.to_dict() for n in self.nodes],
            "created_at": self.created_at.isoformat(),
            "estimated_total_duration": self.estimated_total_duration,
            "current_node_index": self.current_node_index,
            "progress": self.get_progress(),
            "total_nodes": len(self.nodes),
        }
