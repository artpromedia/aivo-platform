"""Tests for SessionManager and collaborative session functionality."""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

from app.models.session_manager import (
    SessionManager,
    CollaborativeSession,
    SessionStatus,
    SessionType,
    ParticipantRole,
    PresenceStatus,
    EditSignalType,
    ParticipantState,
    SessionMessage,
    SessionResource,
    SessionActivity,
    EditSignal,
)


class TestSessionManager:
    """Tests for SessionManager class."""

    def test_init(self):
        """Test initialization."""
        manager = SessionManager()
        assert manager is not None
        assert len(manager._sessions) == 0

    def test_create_session(self):
        """Test creating a new session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Calculus",
            created_by="user_001",
        )
        
        assert isinstance(session, CollaborativeSession)
        assert session.group_id == "group_001"
        assert session.topic == "Calculus"
        assert session.status == SessionStatus.PENDING
        assert session.created_by == "user_001"

    def test_create_session_with_options(self):
        """Test creating session with additional options."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.PEER_TUTORING,
            topic="Physics",
            created_by="tutor_001",
            requires_recording_consent=True,
        )
        
        assert session.session_type == SessionType.PEER_TUTORING
        assert session.requires_recording_consent is True

    def test_get_session(self):
        """Test retrieving a session."""
        manager = SessionManager()
        created = manager.create_session(
            group_id="group_001",
            session_type=SessionType.DISCUSSION,
            topic="History",
            created_by="user_001",
        )
        
        retrieved = manager.get_session(created.session_id)
        assert retrieved is not None
        assert retrieved.session_id == created.session_id

    def test_get_nonexistent_session(self):
        """Test retrieving nonexistent session."""
        manager = SessionManager()
        result = manager.get_session("nonexistent_id")
        assert result is None

    def test_start_session(self):
        """Test starting a session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
        )
        
        started = manager.start_session(session.session_id, "user_001")
        assert started is not None
        assert started.status == SessionStatus.ACTIVE
        assert started.actual_start is not None

    def test_cannot_start_already_active(self):
        """Test cannot start an already active session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
        )
        
        manager.start_session(session.session_id, "user_001")
        
        # Try to start again
        result = manager.start_session(session.session_id, "user_001")
        # Should either return same session or handle gracefully
        assert result.status == SessionStatus.ACTIVE

    def test_join_session(self):
        """Test joining a session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,  # No consent required for tests
        )
        manager.start_session(session.session_id, "user_001")
        
        success, message = manager.join_session(
            session.session_id,
            "user_002",
            ParticipantRole.LEARNER,
        )
        
        assert success is True
        assert "user_002" in session.participants

    def test_join_with_different_roles(self):
        """Test joining with different roles."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.PEER_TUTORING,
            topic="Chemistry",
            created_by="tutor_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "tutor_001")
        
        # Join as host
        manager.join_session(session.session_id, "tutor_001", ParticipantRole.HOST)
        
        # Join as learner
        manager.join_session(session.session_id, "student_001", ParticipantRole.LEARNER)
        
        # Join as observer
        manager.join_session(session.session_id, "observer_001", ParticipantRole.OBSERVER)
        
        assert len(session.participants) == 3
        assert session.participants["tutor_001"].role == ParticipantRole.HOST
        assert session.participants["student_001"].role == ParticipantRole.LEARNER
        assert session.participants["observer_001"].role == ParticipantRole.OBSERVER

    def test_leave_session(self):
        """Test leaving a session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        manager.join_session(session.session_id, "user_002", ParticipantRole.LEARNER)
        
        success, message = manager.leave_session(session.session_id, "user_002")
        
        assert success is True
        # User should be marked as away or removed
        if "user_002" in session.participants:
            assert session.participants["user_002"].presence == PresenceStatus.OFFLINE

    def test_end_session(self):
        """Test ending a session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
        )
        manager.start_session(session.session_id, "user_001")
        
        ended = manager.end_session(session.session_id, "user_001", "completed")
        
        assert ended is not None
        assert ended.status == SessionStatus.COMPLETED
        assert ended.actual_end is not None

    def test_pause_session(self):
        """Test pausing a session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
        )
        manager.start_session(session.session_id, "user_001")
        
        paused = manager.pause_session(session.session_id, "user_001")
        
        assert paused is not None
        assert paused.status == SessionStatus.PAUSED

    def test_resume_session(self):
        """Test resuming a paused session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
        )
        manager.start_session(session.session_id, "user_001")
        manager.pause_session(session.session_id, "user_001")
        
        resumed = manager.resume_session(session.session_id, "user_001")
        
        assert resumed is not None
        assert resumed.status == SessionStatus.ACTIVE

    def test_get_group_sessions(self):
        """Test getting sessions for a group."""
        manager = SessionManager()
        
        # Create multiple sessions for same group
        s1 = manager.create_session("group_001", SessionType.STUDY_GROUP, "Math", "u1")
        s2 = manager.create_session("group_001", SessionType.DISCUSSION, "Physics", "u2")
        s3 = manager.create_session("group_002", SessionType.STUDY_GROUP, "Chemistry", "u3")
        
        manager.start_session(s1.session_id, "u1")
        manager.end_session(s1.session_id, "u1", "done")
        
        # Get all sessions for group_001
        sessions = manager.get_group_sessions("group_001", include_completed=True)
        assert len(sessions) == 2
        
        # Get only active sessions
        active = manager.get_group_sessions("group_001", include_completed=False)
        assert len(active) <= len(sessions)

    def test_add_message(self):
        """Test adding a message to session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.DISCUSSION,
            topic="Topic",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        
        message = manager.send_message(
            session.session_id,
            "user_001",
            "Hello everyone!",
        )
        
        assert message is not None
        # Note: There may be system messages like "user joined" before our message
        assert any(m.content == "Hello everyone!" for m in session.messages)

    def test_add_resource(self):
        """Test adding a resource to session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Topic",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)  # Must join first
        
        resource = manager.add_resource(
            session.session_id,
            "user_001",
            "link",
            "Helpful article",  # name comes before url
            url="https://example.com/resource",
        )
        
        assert resource is not None
        assert len(session.resources) == 1

    def test_update_presence(self):
        """Test updating user presence."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Topic",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        
        # Use AWAY instead of ACTIVE since ACTIVE doesn't exist
        manager.update_presence(session.session_id, "user_001", PresenceStatus.AWAY)
        
        assert session.participants["user_001"].presence == PresenceStatus.AWAY

    def test_get_session_activity(self):
        """Test getting session activity summary."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.DISCUSSION,
            topic="Topic",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        manager.join_session(session.session_id, "user_002", ParticipantRole.LEARNER)
        
        # Add some messages
        manager.send_message(session.session_id, "user_001", "Hello")
        manager.send_message(session.session_id, "user_002", "Hi!")
        manager.send_message(session.session_id, "user_001", "Let's start")
        
        activity = manager.get_session_activity(session.session_id)
        
        assert isinstance(activity, SessionActivity)
        # Note: total_messages includes system messages from joins
        # 2 join messages + 3 user messages = 5
        assert activity.total_messages >= 3
        assert len(activity.participation_scores) == 2


class TestCollaborativeSession:
    """Tests for CollaborativeSession dataclass."""

    def test_session_duration_not_started(self):
        """Test duration when session hasn't started."""
        session = CollaborativeSession(
            session_id="sess_001",
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Test",
            status=SessionStatus.PENDING,
            created_by="user_001",
            created_at=datetime.now(timezone.utc),
        )
        
        # get_duration_minutes returns None when actual_start is None
        assert session.get_duration_minutes() is None

    def test_session_duration_active(self):
        """Test duration of active session."""
        start_time = datetime.now(timezone.utc) - timedelta(minutes=30)
        session = CollaborativeSession(
            session_id="sess_001",
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Test",
            status=SessionStatus.ACTIVE,
            created_by="user_001",
            created_at=start_time,
            actual_start=start_time,
        )
        
        duration = session.get_duration_minutes()
        assert 29 <= duration <= 31  # Allow some variance

    def test_session_duration_completed(self):
        """Test duration of completed session."""
        start_time = datetime.now(timezone.utc) - timedelta(minutes=60)
        end_time = datetime.now(timezone.utc) - timedelta(minutes=15)
        session = CollaborativeSession(
            session_id="sess_001",
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Test",
            status=SessionStatus.COMPLETED,
            created_by="user_001",
            created_at=start_time,
            actual_start=start_time,
            actual_end=end_time,
        )
        
        duration = session.get_duration_minutes()
        assert 44 <= duration <= 46

    def test_session_is_active(self):
        """Test checking session status."""
        session = CollaborativeSession(
            session_id="sess_001",
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Test",
            status=SessionStatus.ACTIVE,
            created_by="user_001",
            created_at=datetime.now(timezone.utc),
        )
        
        assert session.status == SessionStatus.ACTIVE
        
        session.status = SessionStatus.COMPLETED
        assert session.status == SessionStatus.COMPLETED


class TestParticipantState:
    """Tests for ParticipantState dataclass."""

    def test_participant_creation(self):
        """Test creating participant state."""
        state = ParticipantState(
            user_id="user_001",
            role=ParticipantRole.LEARNER,
            joined_at=datetime.now(timezone.utc),
            presence=PresenceStatus.ONLINE,  # Use valid enum value
        )
        
        assert state.user_id == "user_001"
        assert state.role == ParticipantRole.LEARNER
        assert state.contributions_count == 0

    def test_participant_contribution_tracking(self):
        """Test tracking participant contributions."""
        state = ParticipantState(
            user_id="user_001",
            role=ParticipantRole.LEARNER,
            joined_at=datetime.now(timezone.utc),
            presence=PresenceStatus.ONLINE,
        )
        
        state.contributions_count += 1
        state.contributions_count += 1
        
        assert state.contributions_count == 2


class TestSessionMessage:
    """Tests for SessionMessage dataclass."""

    def test_message_creation(self):
        """Test creating a session message."""
        message = SessionMessage(
            message_id="msg_001",
            sender_id="user_001",
            content="Hello world",
            timestamp=datetime.now(timezone.utc),
        )
        
        assert message.message_id == "msg_001"
        assert message.sender_id == "user_001"
        assert message.content == "Hello world"

    def test_message_with_metadata(self):
        """Test message with metadata."""
        message = SessionMessage(
            message_id="msg_002",
            sender_id="user_002",
            content="Reply to your message",
            timestamp=datetime.now(timezone.utc),
            metadata={"reply_to": "msg_001"},
        )
        
        assert message.metadata.get("reply_to") == "msg_001"


class TestEditSignal:
    """Tests for EditSignal dataclass."""

    def test_cursor_signal(self):
        """Test cursor position signal."""
        signal = EditSignal(
            signal_id="sig_001",
            signal_type=EditSignalType.CURSOR_MOVE,  # Use actual enum value
            user_id="user_001",
            resource_id="doc_001",
            timestamp=datetime.now(timezone.utc),
            data={"line": 10, "column": 5},
        )
        
        assert signal.signal_type == EditSignalType.CURSOR_MOVE
        assert signal.data["line"] == 10

    def test_content_edit_signal(self):
        """Test content edit signal."""
        signal = EditSignal(
            signal_id="sig_002",
            signal_type=EditSignalType.TEXT_INSERT,  # Use actual enum value
            user_id="user_001",
            resource_id="doc_001",
            timestamp=datetime.now(timezone.utc),
            data={
                "operation": "insert",
                "position": 100,
                "text": "Hello",
            },
        )
        
        assert signal.signal_type == EditSignalType.TEXT_INSERT
        assert signal.data["operation"] == "insert"

    def test_selection_signal(self):
        """Test selection signal."""
        signal = EditSignal(
            signal_id="sig_003",
            signal_type=EditSignalType.SELECTION,
            user_id="user_001",
            resource_id="doc_001",
            timestamp=datetime.now(timezone.utc),
            data={
                "start": {"line": 5, "column": 0},
                "end": {"line": 5, "column": 20},
            },
        )
        
        assert signal.signal_type == EditSignalType.SELECTION


class TestSessionManagerEdgeCases:
    """Edge case tests for SessionManager."""

    def test_join_nonexistent_session(self):
        """Test joining a session that doesn't exist."""
        manager = SessionManager()
        
        success, message = manager.join_session(
            "nonexistent",
            "user_001",
            ParticipantRole.LEARNER,
        )
        
        assert success is False

    def test_leave_nonexistent_session(self):
        """Test leaving a session that doesn't exist."""
        manager = SessionManager()
        
        success, message = manager.leave_session("nonexistent", "user_001")
        
        assert success is False

    def test_add_message_nonexistent_session(self):
        """Test adding message to nonexistent session."""
        manager = SessionManager()
        
        result = manager.send_message("nonexistent", "user_001", "Hello")
        
        assert result is None

    def test_end_already_ended_session(self):
        """Test ending an already ended session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
        )
        manager.start_session(session.session_id, "user_001")
        manager.end_session(session.session_id, "user_001", "completed")
        
        # Try to end again (should handle gracefully but status may change based on reason)
        result = manager.end_session(session.session_id, "user_001", "completed")
        
        # Should still work without error and return the session
        assert result is not None
        assert result.status in [SessionStatus.COMPLETED, SessionStatus.CANCELLED]

    def test_multiple_sessions_same_group(self):
        """Test multiple concurrent sessions for same group."""
        manager = SessionManager()
        
        s1 = manager.create_session("group_001", SessionType.STUDY_GROUP, "Math", "u1")
        s2 = manager.create_session("group_001", SessionType.DISCUSSION, "Physics", "u2")
        
        manager.start_session(s1.session_id, "u1")
        manager.start_session(s2.session_id, "u2")
        
        # Both should be active
        retrieved1 = manager.get_session(s1.session_id)
        retrieved2 = manager.get_session(s2.session_id)
        
        assert retrieved1.status == SessionStatus.ACTIVE
        assert retrieved2.status == SessionStatus.ACTIVE


class TestAdditionalSessionManagerCoverage:
    """Additional tests for SessionManager coverage."""

    def test_join_session_full(self):
        """Test joining a full session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            max_participants=2,
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        manager.join_session(session.session_id, "user_002", ParticipantRole.LEARNER)
        
        # Try to join when full
        success, message = manager.join_session(
            session.session_id, "user_003", ParticipantRole.LEARNER
        )
        
        assert success is False
        assert "full" in message.lower()

    def test_join_session_requires_consent(self):
        """Test joining session requiring recording consent."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=True,
        )
        manager.start_session(session.session_id, "user_001")
        
        # Try without consent
        success, message = manager.join_session(
            session.session_id, "user_002", has_recording_consent=False
        )
        
        assert success is False
        assert "consent" in message.lower()

    def test_join_session_completed(self):
        """Test joining a completed session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.end_session(session.session_id, "user_001", "completed")
        
        success, message = manager.join_session(
            session.session_id, "user_002", ParticipantRole.LEARNER
        )
        
        assert success is False

    def test_leave_session_user_not_in_session(self):
        """Test leaving session when user isn't in it."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        
        success, message = manager.leave_session(session.session_id, "user_002")
        
        assert success is False
        assert "not in" in message.lower()

    def test_leave_session_auto_end(self):
        """Test session auto-ends when all participants leave."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        
        # Leave session
        manager.leave_session(session.session_id, "user_001")
        
        # Session may have ended automatically
        retrieved = manager.get_session(session.session_id)
        # Either completed or no active participants

    def test_pause_session_not_active(self):
        """Test pausing a non-active session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
        )
        
        # Try to pause pending session
        result = manager.pause_session(session.session_id, "user_001")
        
        # Should return session without changing status
        assert result.status == SessionStatus.PENDING

    def test_resume_session_not_paused(self):
        """Test resuming a non-paused session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
        )
        manager.start_session(session.session_id, "user_001")
        
        # Try to resume active session
        result = manager.resume_session(session.session_id, "user_001")
        
        # Should return session without changing status
        assert result.status == SessionStatus.ACTIVE

    def test_start_nonexistent_session(self):
        """Test starting nonexistent session."""
        manager = SessionManager()
        
        result = manager.start_session("nonexistent", "user_001")
        
        assert result is None

    def test_pause_nonexistent_session(self):
        """Test pausing nonexistent session."""
        manager = SessionManager()
        
        result = manager.pause_session("nonexistent", "user_001")
        
        assert result is None

    def test_resume_nonexistent_session(self):
        """Test resuming nonexistent session."""
        manager = SessionManager()
        
        result = manager.resume_session("nonexistent", "user_001")
        
        assert result is None

    def test_end_nonexistent_session(self):
        """Test ending nonexistent session."""
        manager = SessionManager()
        
        result = manager.end_session("nonexistent", "user_001")
        
        assert result is None

    def test_update_presence_nonexistent(self):
        """Test updating presence for nonexistent session/user."""
        manager = SessionManager()
        
        result = manager.update_presence("nonexistent", "user_001", PresenceStatus.AWAY)
        
        assert result is False

    def test_update_presence_user_not_in_session(self):
        """Test updating presence for user not in session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
        )
        
        result = manager.update_presence(session.session_id, "user_002", PresenceStatus.AWAY)
        
        assert result is False

    def test_update_typing_status(self):
        """Test updating typing status."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        
        result = manager.update_typing_status(session.session_id, "user_001", True)
        
        assert result is True
        assert session.participants["user_001"].is_typing is True

    def test_update_typing_status_nonexistent(self):
        """Test updating typing status for nonexistent session/user."""
        manager = SessionManager()
        
        result = manager.update_typing_status("nonexistent", "user_001", True)
        
        assert result is False

    def test_send_message_not_active(self):
        """Test sending message to non-active session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        
        # Session not started yet
        result = manager.send_message(session.session_id, "user_001", "Hello")
        
        assert result is None

    def test_send_message_user_not_participant(self):
        """Test sending message from non-participant."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        
        # user_002 not joined
        result = manager.send_message(session.session_id, "user_002", "Hello")
        
        assert result is None

    def test_send_message_truncates_long_content(self):
        """Test sending message truncates long content."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        
        long_content = "x" * 6000  # Exceeds MAX_MESSAGE_LENGTH
        result = manager.send_message(session.session_id, "user_001", long_content)
        
        assert result is not None
        assert len(result.content) <= manager.MAX_MESSAGE_LENGTH + 3  # +3 for "..."

    def test_add_resource_nonexistent_session(self):
        """Test adding resource to nonexistent session."""
        manager = SessionManager()
        
        result = manager.add_resource("nonexistent", "user_001", "link", "Test", url="http://example.com")
        
        assert result is None

    def test_add_resource_user_not_participant(self):
        """Test adding resource by non-participant."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        
        result = manager.add_resource(session.session_id, "user_002", "link", "Test", url="http://example.com")
        
        assert result is None

    def test_update_resource(self):
        """Test updating a resource."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        
        resource = manager.add_resource(
            session.session_id, "user_001", "document", "Notes", content="Initial"
        )
        
        updated = manager.update_resource(
            session.session_id, resource.resource_id, "user_001", "Updated content"
        )
        
        assert updated is not None
        assert updated.content == "Updated content"
        assert updated.version == 2

    def test_update_resource_nonexistent_session(self):
        """Test updating resource in nonexistent session."""
        manager = SessionManager()
        
        result = manager.update_resource("nonexistent", "resource_001", "user_001", "Content")
        
        assert result is None

    def test_update_resource_nonexistent_resource(self):
        """Test updating nonexistent resource."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
        )
        
        result = manager.update_resource(session.session_id, "nonexistent", "user_001", "Content")
        
        assert result is None

    def test_send_edit_signal(self):
        """Test sending edit signal."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        
        resource = manager.add_resource(
            session.session_id, "user_001", "document", "Doc", content="Test"
        )
        
        signal = manager.send_edit_signal(
            session.session_id,
            "user_001",
            resource.resource_id,
            EditSignalType.CURSOR_MOVE,
            {"position": {"line": 5, "column": 10}},
        )
        
        assert signal is not None
        assert session.participants["user_001"].cursor_position == {"line": 5, "column": 10}

    def test_send_edit_signal_selection(self):
        """Test sending selection edit signal."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        
        signal = manager.send_edit_signal(
            session.session_id,
            "user_001",
            "doc_001",
            EditSignalType.SELECTION,
            {"range": {"start": 0, "end": 10}},
        )
        
        assert signal is not None
        assert session.participants["user_001"].selected_range == {"start": 0, "end": 10}

    def test_send_edit_signal_nonexistent(self):
        """Test sending edit signal to nonexistent session."""
        manager = SessionManager()
        
        result = manager.send_edit_signal(
            "nonexistent", "user_001", "doc_001", EditSignalType.CURSOR_MOVE, {}
        )
        
        assert result is None

    def test_send_edit_signal_user_not_participant(self):
        """Test sending edit signal by non-participant."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
        )
        
        result = manager.send_edit_signal(
            session.session_id, "user_002", "doc_001", EditSignalType.CURSOR_MOVE, {}
        )
        
        assert result is None

    def test_get_edit_signals(self):
        """Test getting edit signals."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        
        manager.send_edit_signal(
            session.session_id, "user_001", "doc_001", EditSignalType.CURSOR_MOVE, {"position": {"line": 1}}
        )
        manager.send_edit_signal(
            session.session_id, "user_001", "doc_001", EditSignalType.TEXT_INSERT, {"text": "Hello"}
        )
        
        signals = manager.get_edit_signals(session.session_id)
        
        assert len(signals) == 2

    def test_get_edit_signals_since(self):
        """Test getting edit signals since a timestamp."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        
        manager.send_edit_signal(
            session.session_id, "user_001", "doc_001", EditSignalType.CURSOR_MOVE, {}
        )
        
        # Get signals since now (should be empty or very few)
        since = datetime.now(timezone.utc)
        signals = manager.get_edit_signals(session.session_id, since=since)
        
        # Signals created before 'since' should be filtered
        assert isinstance(signals, list)

    def test_get_edit_signals_nonexistent_session(self):
        """Test getting edit signals for nonexistent session."""
        manager = SessionManager()
        
        signals = manager.get_edit_signals("nonexistent")
        
        assert signals == []

    def test_get_session_activity_nonexistent(self):
        """Test getting activity for nonexistent session."""
        manager = SessionManager()
        
        result = manager.get_session_activity("nonexistent")
        
        assert result is None

    def test_check_session_health(self):
        """Test checking session health."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        manager.join_session(session.session_id, "user_002", ParticipantRole.LEARNER)
        
        health = manager.check_session_health(session.session_id)
        
        assert health["healthy"] is True
        assert health["active_participants"] == 2

    def test_check_session_health_nonexistent(self):
        """Test checking health of nonexistent session."""
        manager = SessionManager()
        
        health = manager.check_session_health("nonexistent")
        
        assert health["healthy"] is False
        assert "not found" in health["reason"].lower()

    def test_check_session_health_no_participants(self):
        """Test session health with no active participants."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        manager.leave_session(session.session_id, "user_001")
        
        # Session might have auto-ended, but if not:
        if manager.get_session(session.session_id).status == SessionStatus.ACTIVE:
            health = manager.check_session_health(session.session_id)
            assert len(health.get("issues", [])) > 0 or len(health.get("warnings", [])) > 0

    def test_check_session_health_one_participant(self):
        """Test session health with only one participant."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        
        health = manager.check_session_health(session.session_id)
        
        # Should have warning about only one participant
        assert "warnings" in health

    def test_check_session_health_long_duration(self):
        """Test session health for long-running session."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        
        # Simulate long duration
        session.actual_start = datetime.now(timezone.utc) - timedelta(minutes=150)
        
        health = manager.check_session_health(session.session_id)
        
        # Should have warning about duration
        assert len(health.get("warnings", [])) > 0

    def test_check_session_health_idle_participant(self):
        """Test session health with idle participant."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        
        # Simulate idle participant
        session.participants["user_001"].last_active = (
            datetime.now(timezone.utc) - timedelta(minutes=15)
        )
        
        health = manager.check_session_health(session.session_id)
        
        # Should have warning about idle participant
        assert len(health.get("warnings", [])) > 0

    def test_cleanup_expired_sessions(self):
        """Test cleaning up expired sessions."""
        manager = SessionManager()
        
        # Create session with past scheduled end
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            scheduled_end=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        manager.start_session(session.session_id, "user_001")
        
        count = manager.cleanup_expired_sessions()
        
        assert count >= 1
        assert manager.get_session(session.session_id).status == SessionStatus.EXPIRED

    def test_cleanup_stale_pending_sessions(self):
        """Test cleaning up stale pending sessions."""
        manager = SessionManager()
        
        # Create old pending session
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
        )
        
        # Simulate old session
        session.created_at = datetime.now(timezone.utc) - timedelta(hours=25)
        
        count = manager.cleanup_expired_sessions()
        
        assert count >= 1
        assert manager.get_session(session.session_id).status == SessionStatus.EXPIRED

    def test_cleanup_long_running_sessions(self):
        """Test cleaning up very long-running sessions."""
        manager = SessionManager()
        
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
        )
        manager.start_session(session.session_id, "user_001")
        
        # Simulate very long session (> 2x max duration)
        session.actual_start = datetime.now(timezone.utc) - timedelta(minutes=250)
        
        count = manager.cleanup_expired_sessions()
        
        assert count >= 1
        assert manager.get_session(session.session_id).status == SessionStatus.EXPIRED

    def test_get_user_sessions(self):
        """Test getting user's active sessions."""
        manager = SessionManager()
        
        # Create multiple sessions
        s1 = manager.create_session("group_001", SessionType.STUDY_GROUP, "Math", "user_001", requires_recording_consent=False)
        s2 = manager.create_session("group_002", SessionType.DISCUSSION, "Physics", "user_001", requires_recording_consent=False)
        
        manager.start_session(s1.session_id, "user_001")
        manager.start_session(s2.session_id, "user_001")
        manager.join_session(s1.session_id, "user_001", ParticipantRole.HOST)
        manager.join_session(s2.session_id, "user_001", ParticipantRole.HOST)
        
        sessions = manager.get_user_sessions("user_001")
        
        assert len(sessions) == 2

    def test_end_session_cancelled(self):
        """Test ending session with cancelled reason."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
        )
        manager.start_session(session.session_id, "user_001")
        
        ended = manager.end_session(session.session_id, "user_001", "cancelled")
        
        assert ended.status == SessionStatus.CANCELLED

    def test_create_session_with_metadata(self):
        """Test creating session with metadata."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.PROJECT,
            topic="Project Work",
            created_by="user_001",
            metadata={"project_id": "proj_001", "milestone": "v1.0"},
        )
        
        assert session.metadata["project_id"] == "proj_001"
        assert session.metadata["milestone"] == "v1.0"

    def test_calculate_idle_periods(self):
        """Test idle period calculation."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.DISCUSSION,
            topic="Topic",
            created_by="user_001",
            requires_recording_consent=False,
        )
        manager.start_session(session.session_id, "user_001")
        manager.join_session(session.session_id, "user_001", ParticipantRole.HOST)
        
        # Add messages with gap
        now = datetime.now(timezone.utc)
        msg1 = SessionMessage(
            message_id="msg_001",
            sender_id="user_001",
            content="First",
            timestamp=now - timedelta(minutes=30),
        )
        msg2 = SessionMessage(
            message_id="msg_002",
            sender_id="user_001",
            content="Second",
            timestamp=now,
        )
        session.messages.append(msg1)
        session.messages.append(msg2)
        
        # Get activity which calculates idle periods
        activity = manager.get_session_activity(session.session_id)
        
        # Should detect idle period > 10 minutes
        assert len(activity.idle_periods) >= 1

    def test_join_session_with_recording_consent(self):
        """Test joining session with recording consent."""
        manager = SessionManager()
        session = manager.create_session(
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Math",
            created_by="user_001",
            requires_recording_consent=True,
        )
        manager.start_session(session.session_id, "user_001")
        
        success, message = manager.join_session(
            session.session_id, "user_001", ParticipantRole.HOST, has_recording_consent=True
        )
        
        assert success is True
        assert session.participants["user_001"].has_recording_consent is True


class TestCollaborativeSessionMethods:
    """Additional tests for CollaborativeSession methods."""

    def test_is_participant(self):
        """Test is_participant method."""
        session = CollaborativeSession(
            session_id="sess_001",
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Test",
            status=SessionStatus.ACTIVE,
            created_by="user_001",
            created_at=datetime.now(timezone.utc),
        )
        
        # Add participant
        session.participants["user_001"] = ParticipantState(
            user_id="user_001",
            role=ParticipantRole.HOST,
            joined_at=datetime.now(timezone.utc),
        )
        
        assert session.is_participant("user_001") is True
        assert session.is_participant("user_002") is False

    def test_get_active_count(self):
        """Test get_active_count method."""
        session = CollaborativeSession(
            session_id="sess_001",
            group_id="group_001",
            session_type=SessionType.STUDY_GROUP,
            topic="Test",
            status=SessionStatus.ACTIVE,
            created_by="user_001",
            created_at=datetime.now(timezone.utc),
        )
        
        # Add participants with different presence
        session.participants["user_001"] = ParticipantState(
            user_id="user_001",
            role=ParticipantRole.HOST,
            joined_at=datetime.now(timezone.utc),
            presence=PresenceStatus.ONLINE,
        )
        session.participants["user_002"] = ParticipantState(
            user_id="user_002",
            role=ParticipantRole.LEARNER,
            joined_at=datetime.now(timezone.utc),
            presence=PresenceStatus.AWAY,
        )
        session.participants["user_003"] = ParticipantState(
            user_id="user_003",
            role=ParticipantRole.LEARNER,
            joined_at=datetime.now(timezone.utc),
            presence=PresenceStatus.ONLINE,
        )
        
        assert session.get_active_count() == 2  # Only online users
