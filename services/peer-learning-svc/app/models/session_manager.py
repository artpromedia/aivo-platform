"""
Collaborative Session Manager

Manages real-time collaborative learning sessions with state tracking,
presence management, and recording consent.
"""
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import List, Dict, Optional, Set, Any, Callable

import numpy as np

logger = logging.getLogger(__name__)


class SessionStatus(str, Enum):
    """Status of a collaborative session."""
    PENDING = "pending"  # Waiting for participants
    ACTIVE = "active"  # Session in progress
    PAUSED = "paused"  # Temporarily paused
    COMPLETED = "completed"  # Successfully ended
    CANCELLED = "cancelled"  # Cancelled before completion
    EXPIRED = "expired"  # Timed out


class SessionType(str, Enum):
    """Types of collaborative sessions."""
    STUDY_GROUP = "study_group"
    PEER_TUTORING = "peer_tutoring"
    DISCUSSION = "discussion"
    PROJECT = "project"
    REVIEW = "review"
    PRACTICE = "practice"


class ParticipantRole(str, Enum):
    """Roles within a session."""
    HOST = "host"
    TUTOR = "tutor"
    LEARNER = "learner"
    OBSERVER = "observer"
    FACILITATOR = "facilitator"


class PresenceStatus(str, Enum):
    """Presence status of a participant."""
    ONLINE = "online"
    AWAY = "away"
    BUSY = "busy"
    OFFLINE = "offline"


class EditSignalType(str, Enum):
    """Types of collaborative editing signals."""
    CURSOR_MOVE = "cursor_move"
    TEXT_INSERT = "text_insert"
    TEXT_DELETE = "text_delete"
    SELECTION = "selection"
    HIGHLIGHT = "highlight"
    COMMENT = "comment"
    SCROLL = "scroll"


@dataclass
class ParticipantState:
    """State of a session participant."""
    user_id: str
    role: ParticipantRole
    joined_at: datetime
    presence: PresenceStatus = PresenceStatus.ONLINE
    last_active: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    cursor_position: Optional[Dict[str, int]] = None  # {line, column}
    selected_range: Optional[Dict[str, Any]] = None
    is_typing: bool = False
    is_speaking: bool = False
    has_recording_consent: bool = False
    muted: bool = False
    contributions_count: int = 0


@dataclass
class SessionMessage:
    """A message in a session."""
    message_id: str
    sender_id: str
    content: str
    timestamp: datetime
    message_type: str = "text"  # text, system, file, action
    metadata: Dict[str, Any] = field(default_factory=dict)
    edited: bool = False
    deleted: bool = False


@dataclass
class SessionResource:
    """A shared resource in a session."""
    resource_id: str
    resource_type: str  # document, whiteboard, code, link
    name: str
    url: Optional[str]
    content: Optional[str]
    created_by: str
    created_at: datetime
    last_modified: datetime
    last_modified_by: str
    version: int = 1


@dataclass
class EditSignal:
    """A collaborative editing signal."""
    signal_id: str
    signal_type: EditSignalType
    user_id: str
    resource_id: str
    timestamp: datetime
    data: Dict[str, Any]  # Signal-specific data


@dataclass
class CollaborativeSession:
    """A collaborative learning session."""
    session_id: str
    group_id: str
    session_type: SessionType
    topic: str
    created_at: datetime
    created_by: str
    status: SessionStatus
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    max_participants: int = 10
    requires_recording_consent: bool = True
    is_recorded: bool = False
    recording_id: Optional[str] = None
    participants: Dict[str, ParticipantState] = field(default_factory=dict)
    messages: List[SessionMessage] = field(default_factory=list)
    resources: Dict[str, SessionResource] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def is_participant(self, user_id: str) -> bool:
        """Check if user is a participant."""
        return user_id in self.participants
    
    def get_active_count(self) -> int:
        """Get count of active (online) participants."""
        return sum(
            1 for p in self.participants.values()
            if p.presence == PresenceStatus.ONLINE
        )
    
    def get_duration_minutes(self) -> Optional[int]:
        """Get session duration in minutes."""
        if not self.actual_start:
            return None
        end_time = self.actual_end or datetime.now(timezone.utc)
        delta = end_time - self.actual_start
        return int(delta.total_seconds() / 60)


@dataclass
class SessionActivity:
    """Activity summary for a session."""
    session_id: str
    total_messages: int
    total_resources: int
    participation_scores: Dict[str, float]
    peak_participants: int
    average_participants: float
    active_duration_minutes: int
    idle_periods: List[Dict[str, Any]]


class SessionManager:
    """
    Manages collaborative learning sessions.
    
    Handles:
    - Session lifecycle (create, start, pause, end)
    - Participant management
    - Presence tracking
    - Message handling
    - Resource sharing
    """
    
    # Default session limits
    DEFAULT_MAX_DURATION_MINUTES = 120
    IDLE_TIMEOUT_MINUTES = 10
    MAX_MESSAGE_LENGTH = 5000
    
    def __init__(self):
        """Initialize SessionManager."""
        self._sessions: Dict[str, CollaborativeSession] = {}
        self._user_sessions: Dict[str, Set[str]] = {}  # user_id -> session_ids
        self._group_sessions: Dict[str, List[str]] = {}  # group_id -> session_ids
        self._edit_signals: Dict[str, List[EditSignal]] = {}  # session_id -> signals
        logger.info("SessionManager initialized")
    
    def create_session(
        self,
        group_id: str,
        session_type: SessionType,
        topic: str,
        created_by: str,
        scheduled_start: Optional[datetime] = None,
        scheduled_end: Optional[datetime] = None,
        max_participants: int = 10,
        requires_recording_consent: bool = True,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> CollaborativeSession:
        """
        Create a new collaborative session.
        
        Args:
            group_id: ID of the group
            session_type: Type of session
            topic: Session topic
            created_by: User ID of creator
            scheduled_start: Optional scheduled start time
            scheduled_end: Optional scheduled end time
            max_participants: Maximum allowed participants
            requires_recording_consent: Whether recording consent is required
            metadata: Additional session metadata
        
        Returns:
            Created CollaborativeSession
        """
        session_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        session = CollaborativeSession(
            session_id=session_id,
            group_id=group_id,
            session_type=session_type,
            topic=topic,
            created_at=now,
            created_by=created_by,
            status=SessionStatus.PENDING,
            scheduled_start=scheduled_start,
            scheduled_end=scheduled_end,
            max_participants=max_participants,
            requires_recording_consent=requires_recording_consent,
            metadata=metadata or {},
        )
        
        self._sessions[session_id] = session
        
        # Track by group
        if group_id not in self._group_sessions:
            self._group_sessions[group_id] = []
        self._group_sessions[group_id].append(session_id)
        
        # Initialize edit signals storage
        self._edit_signals[session_id] = []
        
        logger.info(
            "Session created: %s (type=%s, group=%s, creator=%s)",
            session_id, session_type.value, group_id, created_by
        )
        
        return session
    
    def get_session(self, session_id: str) -> Optional[CollaborativeSession]:
        """Get a session by ID."""
        return self._sessions.get(session_id)
    
    def get_group_sessions(
        self,
        group_id: str,
        include_completed: bool = False,
    ) -> List[CollaborativeSession]:
        """Get all sessions for a group."""
        session_ids = self._group_sessions.get(group_id, [])
        sessions = [self._sessions[sid] for sid in session_ids if sid in self._sessions]
        
        if not include_completed:
            sessions = [s for s in sessions if s.status not in [
                SessionStatus.COMPLETED, SessionStatus.CANCELLED, SessionStatus.EXPIRED
            ]]
        
        return sessions
    
    def get_user_sessions(self, user_id: str) -> List[CollaborativeSession]:
        """Get all active sessions for a user."""
        session_ids = self._user_sessions.get(user_id, set())
        return [
            self._sessions[sid] for sid in session_ids
            if sid in self._sessions and self._sessions[sid].status in [
                SessionStatus.PENDING, SessionStatus.ACTIVE, SessionStatus.PAUSED
            ]
        ]
    
    def start_session(
        self,
        session_id: str,
        started_by: str,
    ) -> Optional[CollaborativeSession]:
        """
        Start a session.
        
        Args:
            session_id: Session ID
            started_by: User ID who is starting
        
        Returns:
            Updated session or None if not found
        """
        session = self._sessions.get(session_id)
        if not session:
            return None
        
        if session.status != SessionStatus.PENDING:
            logger.warning(
                "Cannot start session %s: status is %s",
                session_id, session.status.value
            )
            return session
        
        session.status = SessionStatus.ACTIVE
        session.actual_start = datetime.now(timezone.utc)
        
        logger.info("Session %s started by %s", session_id, started_by)
        return session
    
    def pause_session(self, session_id: str, paused_by: str) -> Optional[CollaborativeSession]:
        """Pause an active session."""
        session = self._sessions.get(session_id)
        if not session:
            return None
        
        if session.status != SessionStatus.ACTIVE:
            return session
        
        session.status = SessionStatus.PAUSED
        logger.info("Session %s paused by %s", session_id, paused_by)
        return session
    
    def resume_session(self, session_id: str, resumed_by: str) -> Optional[CollaborativeSession]:
        """Resume a paused session."""
        session = self._sessions.get(session_id)
        if not session:
            return None
        
        if session.status != SessionStatus.PAUSED:
            return session
        
        session.status = SessionStatus.ACTIVE
        logger.info("Session %s resumed by %s", session_id, resumed_by)
        return session
    
    def end_session(
        self,
        session_id: str,
        ended_by: str,
        reason: str = "completed",
    ) -> Optional[CollaborativeSession]:
        """
        End a session.
        
        Args:
            session_id: Session ID
            ended_by: User ID who is ending
            reason: Reason for ending (completed, cancelled)
        
        Returns:
            Updated session
        """
        session = self._sessions.get(session_id)
        if not session:
            return None
        
        session.status = (
            SessionStatus.COMPLETED if reason == "completed"
            else SessionStatus.CANCELLED
        )
        session.actual_end = datetime.now(timezone.utc)
        
        # Update all participants to offline
        for participant in session.participants.values():
            participant.presence = PresenceStatus.OFFLINE
        
        logger.info(
            "Session %s ended by %s (reason=%s, duration=%d min)",
            session_id, ended_by, reason,
            session.get_duration_minutes() or 0
        )
        
        return session
    
    def join_session(
        self,
        session_id: str,
        user_id: str,
        role: ParticipantRole = ParticipantRole.LEARNER,
        has_recording_consent: bool = False,
    ) -> tuple[bool, str]:
        """
        Add a participant to a session.
        
        Args:
            session_id: Session ID
            user_id: User ID
            role: Participant role
            has_recording_consent: Whether user consents to recording
        
        Returns:
            Tuple of (success, message)
        """
        session = self._sessions.get(session_id)
        if not session:
            return False, "Session not found"
        
        if session.status not in [SessionStatus.PENDING, SessionStatus.ACTIVE]:
            return False, f"Cannot join session in {session.status.value} state"
        
        if len(session.participants) >= session.max_participants:
            return False, "Session is full"
        
        if session.requires_recording_consent and not has_recording_consent:
            return False, "Recording consent required to join"
        
        # Add participant
        participant = ParticipantState(
            user_id=user_id,
            role=role,
            joined_at=datetime.now(timezone.utc),
            has_recording_consent=has_recording_consent,
        )
        session.participants[user_id] = participant
        
        # Track user's sessions
        if user_id not in self._user_sessions:
            self._user_sessions[user_id] = set()
        self._user_sessions[user_id].add(session_id)
        
        # Add system message
        self._add_system_message(
            session, f"{user_id} joined the session"
        )
        
        logger.info(
            "User %s joined session %s as %s",
            user_id, session_id, role.value
        )
        
        return True, "Successfully joined session"
    
    def leave_session(
        self,
        session_id: str,
        user_id: str,
    ) -> tuple[bool, str]:
        """
        Remove a participant from a session.
        
        Args:
            session_id: Session ID
            user_id: User ID
        
        Returns:
            Tuple of (success, message)
        """
        session = self._sessions.get(session_id)
        if not session:
            return False, "Session not found"
        
        if user_id not in session.participants:
            return False, "User is not in this session"
        
        # Set to offline but keep in participants for history
        session.participants[user_id].presence = PresenceStatus.OFFLINE
        
        # Remove from user's active sessions
        if user_id in self._user_sessions:
            self._user_sessions[user_id].discard(session_id)
        
        # Add system message
        self._add_system_message(
            session, f"{user_id} left the session"
        )
        
        logger.info("User %s left session %s", user_id, session_id)
        
        # End session if no active participants
        active_count = session.get_active_count()
        if active_count == 0 and session.status == SessionStatus.ACTIVE:
            self.end_session(session_id, "system", "no_participants")
        
        return True, "Successfully left session"
    
    def update_presence(
        self,
        session_id: str,
        user_id: str,
        presence: PresenceStatus,
    ) -> bool:
        """Update a participant's presence status."""
        session = self._sessions.get(session_id)
        if not session or user_id not in session.participants:
            return False
        
        session.participants[user_id].presence = presence
        session.participants[user_id].last_active = datetime.now(timezone.utc)
        
        return True
    
    def update_typing_status(
        self,
        session_id: str,
        user_id: str,
        is_typing: bool,
    ) -> bool:
        """Update typing indicator for a participant."""
        session = self._sessions.get(session_id)
        if not session or user_id not in session.participants:
            return False
        
        session.participants[user_id].is_typing = is_typing
        session.participants[user_id].last_active = datetime.now(timezone.utc)
        
        return True
    
    def send_message(
        self,
        session_id: str,
        sender_id: str,
        content: str,
        message_type: str = "text",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[SessionMessage]:
        """
        Send a message in a session.
        
        Args:
            session_id: Session ID
            sender_id: Sender's user ID
            content: Message content
            message_type: Type of message
            metadata: Additional metadata
        
        Returns:
            Created message or None if failed
        """
        session = self._sessions.get(session_id)
        if not session:
            return None
        
        if session.status != SessionStatus.ACTIVE:
            return None
        
        if sender_id not in session.participants:
            return None
        
        # Validate content length
        if len(content) > self.MAX_MESSAGE_LENGTH:
            content = content[:self.MAX_MESSAGE_LENGTH] + "..."
        
        message = SessionMessage(
            message_id=str(uuid.uuid4()),
            sender_id=sender_id,
            content=content,
            timestamp=datetime.now(timezone.utc),
            message_type=message_type,
            metadata=metadata or {},
        )
        
        session.messages.append(message)
        
        # Update participant activity
        session.participants[sender_id].last_active = datetime.now(timezone.utc)
        session.participants[sender_id].contributions_count += 1
        session.participants[sender_id].is_typing = False
        
        return message
    
    def _add_system_message(
        self,
        session: CollaborativeSession,
        content: str,
    ) -> None:
        """Add a system message to session."""
        message = SessionMessage(
            message_id=str(uuid.uuid4()),
            sender_id="system",
            content=content,
            timestamp=datetime.now(timezone.utc),
            message_type="system",
        )
        session.messages.append(message)
    
    def add_resource(
        self,
        session_id: str,
        user_id: str,
        resource_type: str,
        name: str,
        url: Optional[str] = None,
        content: Optional[str] = None,
    ) -> Optional[SessionResource]:
        """
        Add a shared resource to a session.
        
        Args:
            session_id: Session ID
            user_id: User adding the resource
            resource_type: Type of resource
            name: Resource name
            url: Optional URL
            content: Optional content
        
        Returns:
            Created resource or None
        """
        session = self._sessions.get(session_id)
        if not session or user_id not in session.participants:
            return None
        
        now = datetime.now(timezone.utc)
        resource = SessionResource(
            resource_id=str(uuid.uuid4()),
            resource_type=resource_type,
            name=name,
            url=url,
            content=content,
            created_by=user_id,
            created_at=now,
            last_modified=now,
            last_modified_by=user_id,
        )
        
        session.resources[resource.resource_id] = resource
        
        # Add system message
        self._add_system_message(
            session, f"{user_id} shared a {resource_type}: {name}"
        )
        
        logger.info(
            "Resource %s added to session %s by %s",
            resource.resource_id, session_id, user_id
        )
        
        return resource
    
    def update_resource(
        self,
        session_id: str,
        resource_id: str,
        user_id: str,
        content: str,
    ) -> Optional[SessionResource]:
        """Update a shared resource."""
        session = self._sessions.get(session_id)
        if not session:
            return None
        
        resource = session.resources.get(resource_id)
        if not resource:
            return None
        
        resource.content = content
        resource.last_modified = datetime.now(timezone.utc)
        resource.last_modified_by = user_id
        resource.version += 1
        
        return resource
    
    def send_edit_signal(
        self,
        session_id: str,
        user_id: str,
        resource_id: str,
        signal_type: EditSignalType,
        data: Dict[str, Any],
    ) -> Optional[EditSignal]:
        """
        Send a collaborative editing signal.
        
        Args:
            session_id: Session ID
            user_id: User sending signal
            resource_id: Resource being edited
            signal_type: Type of edit signal
            data: Signal data
        
        Returns:
            Created signal or None
        """
        session = self._sessions.get(session_id)
        if not session or user_id not in session.participants:
            return None
        
        signal = EditSignal(
            signal_id=str(uuid.uuid4()),
            signal_type=signal_type,
            user_id=user_id,
            resource_id=resource_id,
            timestamp=datetime.now(timezone.utc),
            data=data,
        )
        
        if session_id not in self._edit_signals:
            self._edit_signals[session_id] = []
        self._edit_signals[session_id].append(signal)
        
        # Keep only recent signals (last 5 minutes)
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
        self._edit_signals[session_id] = [
            s for s in self._edit_signals[session_id]
            if s.timestamp > cutoff
        ]
        
        # Update cursor position if applicable
        if signal_type == EditSignalType.CURSOR_MOVE:
            session.participants[user_id].cursor_position = data.get("position")
        elif signal_type == EditSignalType.SELECTION:
            session.participants[user_id].selected_range = data.get("range")
        
        return signal
    
    def get_edit_signals(
        self,
        session_id: str,
        since: Optional[datetime] = None,
    ) -> List[EditSignal]:
        """Get recent edit signals for a session."""
        if session_id not in self._edit_signals:
            return []
        
        signals = self._edit_signals[session_id]
        
        if since:
            signals = [s for s in signals if s.timestamp > since]
        
        return signals
    
    def get_session_activity(self, session_id: str) -> Optional[SessionActivity]:
        """
        Get activity summary for a session.
        
        Args:
            session_id: Session ID
        
        Returns:
            SessionActivity summary or None
        """
        session = self._sessions.get(session_id)
        if not session:
            return None
        
        # Calculate participation scores
        participation_scores = {}
        total_messages = len([m for m in session.messages if m.message_type == "text"])
        
        for user_id, participant in session.participants.items():
            if total_messages > 0:
                user_messages = sum(
                    1 for m in session.messages
                    if m.sender_id == user_id and m.message_type == "text"
                )
                participation_scores[user_id] = user_messages / total_messages
            else:
                participation_scores[user_id] = 0.0
        
        # Calculate idle periods
        idle_periods = self._calculate_idle_periods(session)
        
        return SessionActivity(
            session_id=session_id,
            total_messages=len(session.messages),
            total_resources=len(session.resources),
            participation_scores=participation_scores,
            peak_participants=len(session.participants),
            average_participants=len([
                p for p in session.participants.values()
                if p.contributions_count > 0
            ]),
            active_duration_minutes=session.get_duration_minutes() or 0,
            idle_periods=idle_periods,
        )
    
    def _calculate_idle_periods(
        self,
        session: CollaborativeSession,
    ) -> List[Dict[str, Any]]:
        """Calculate idle periods in a session."""
        if len(session.messages) < 2:
            return []
        
        idle_periods = []
        sorted_messages = sorted(session.messages, key=lambda m: m.timestamp)
        
        for i in range(1, len(sorted_messages)):
            prev_time = sorted_messages[i - 1].timestamp
            curr_time = sorted_messages[i].timestamp
            gap_minutes = (curr_time - prev_time).total_seconds() / 60
            
            if gap_minutes > self.IDLE_TIMEOUT_MINUTES:
                idle_periods.append({
                    "start": prev_time.isoformat(),
                    "end": curr_time.isoformat(),
                    "duration_minutes": gap_minutes,
                })
        
        return idle_periods
    
    def check_session_health(
        self,
        session_id: str,
    ) -> Dict[str, Any]:
        """
        Check health and status of a session.
        
        Args:
            session_id: Session ID
        
        Returns:
            Health status dictionary
        """
        session = self._sessions.get(session_id)
        if not session:
            return {"healthy": False, "reason": "Session not found"}
        
        issues = []
        warnings = []
        
        # Check for timeout
        if session.status == SessionStatus.ACTIVE:
            duration = session.get_duration_minutes() or 0
            if duration > self.DEFAULT_MAX_DURATION_MINUTES:
                warnings.append(
                    f"Session has exceeded maximum duration ({duration} min)"
                )
        
        # Check for idle participants
        now = datetime.now(timezone.utc)
        for user_id, participant in session.participants.items():
            if participant.presence == PresenceStatus.ONLINE:
                idle_minutes = (now - participant.last_active).total_seconds() / 60
                if idle_minutes > self.IDLE_TIMEOUT_MINUTES:
                    warnings.append(f"Participant {user_id} has been idle for {idle_minutes:.0f} min")
        
        # Check active participants
        active_count = session.get_active_count()
        if session.status == SessionStatus.ACTIVE and active_count == 0:
            issues.append("No active participants in session")
        elif session.status == SessionStatus.ACTIVE and active_count == 1:
            warnings.append("Only one active participant")
        
        return {
            "healthy": len(issues) == 0,
            "session_id": session_id,
            "status": session.status.value,
            "active_participants": active_count,
            "total_participants": len(session.participants),
            "duration_minutes": session.get_duration_minutes(),
            "issues": issues,
            "warnings": warnings,
        }
    
    def cleanup_expired_sessions(self) -> int:
        """
        Clean up expired/stale sessions.
        
        Returns:
            Number of sessions cleaned up
        """
        count = 0
        now = datetime.now(timezone.utc)
        
        for session_id, session in list(self._sessions.items()):
            should_expire = False
            
            # Check scheduled end time
            if session.scheduled_end and now > session.scheduled_end:
                should_expire = True
            
            # Check max duration
            if session.status == SessionStatus.ACTIVE:
                duration = session.get_duration_minutes() or 0
                if duration > self.DEFAULT_MAX_DURATION_MINUTES * 2:
                    should_expire = True
            
            # Check stale pending sessions
            if session.status == SessionStatus.PENDING:
                age_hours = (now - session.created_at).total_seconds() / 3600
                if age_hours > 24:
                    should_expire = True
            
            if should_expire:
                session.status = SessionStatus.EXPIRED
                session.actual_end = now
                count += 1
                logger.info("Session %s expired", session_id)
        
        return count
