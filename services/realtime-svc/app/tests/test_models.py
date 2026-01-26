"""
Tests for WebSocket models.
"""

from datetime import datetime

import pytest

from app.models import (
    ActionType,
    CognitiveState,
    CognitiveStateLevel,
    ConnectionInfo,
    DeviceType,
    EngagementLevel,
    Intervention,
    InterventionType,
    LearnerAction,
    MessageType,
    RoomInfo,
    RoomType,
    UserStatus,
    WebSocketMessage,
    generate_connection_id,
    generate_id,
)


class TestMessageGeneration:
    """Tests for ID generation functions."""

    def test_generate_id_format(self):
        """Test that generate_id returns correct format."""
        msg_id = generate_id()
        assert msg_id.startswith("msg_")
        assert len(msg_id) == 20  # "msg_" + 16 chars

    def test_generate_id_uniqueness(self):
        """Test that generate_id returns unique IDs."""
        ids = [generate_id() for _ in range(100)]
        assert len(set(ids)) == 100

    def test_generate_connection_id_format(self):
        """Test that generate_connection_id returns correct format."""
        conn_id = generate_connection_id()
        assert conn_id.startswith("conn_")
        assert len(conn_id) == 17  # "conn_" + 12 chars

    def test_generate_connection_id_uniqueness(self):
        """Test that generate_connection_id returns unique IDs."""
        ids = [generate_connection_id() for _ in range(100)]
        assert len(set(ids)) == 100


class TestMessageType:
    """Tests for MessageType enum."""

    def test_client_to_server_types(self):
        """Test client-to-server message types."""
        assert MessageType.JOIN_SESSION == "join_session"
        assert MessageType.LEAVE_SESSION == "leave_session"
        assert MessageType.LEARNER_ACTION == "learner_action"
        assert MessageType.HEARTBEAT == "heartbeat"

    def test_server_to_client_types(self):
        """Test server-to-client message types."""
        assert MessageType.SESSION_STATE == "session_state"
        assert MessageType.INTERVENTION == "intervention"
        assert MessageType.COGNITIVE_UPDATE == "cognitive_update"
        assert MessageType.ERROR == "error"

    def test_bidirectional_types(self):
        """Test bidirectional message types."""
        assert MessageType.CHAT == "chat"
        assert MessageType.PRESENCE_UPDATE == "presence_update"


class TestWebSocketMessage:
    """Tests for WebSocketMessage model."""

    def test_create_message(self):
        """Test creating a WebSocket message."""
        msg = WebSocketMessage(
            type=MessageType.HEARTBEAT,
            payload={"client_time": "2024-01-01T00:00:00"},
        )
        assert msg.type == MessageType.HEARTBEAT
        assert msg.payload == {"client_time": "2024-01-01T00:00:00"}
        assert msg.message_id.startswith("msg_")
        assert isinstance(msg.timestamp, datetime)

    def test_message_json_serialization(self):
        """Test message JSON serialization."""
        msg = WebSocketMessage(
            type=MessageType.CHAT,
            payload={"content": "Hello!"},
        )
        data = msg.model_dump(mode="json")
        assert data["type"] == "chat"
        assert data["payload"] == {"content": "Hello!"}
        assert "timestamp" in data
        assert "message_id" in data


class TestConnectionInfo:
    """Tests for ConnectionInfo model."""

    def test_create_connection_info(self):
        """Test creating connection info."""
        info = ConnectionInfo(
            learner_id="learner_123",
            tenant_id="tenant_abc",
        )
        assert info.learner_id == "learner_123"
        assert info.tenant_id == "tenant_abc"
        assert info.connection_id.startswith("conn_")
        assert info.device == DeviceType.WEB
        assert info.status == UserStatus.ONLINE
        assert info.rooms == []
        assert info.reconnect_count == 0

    def test_connection_info_with_all_fields(self):
        """Test connection info with all fields."""
        info = ConnectionInfo(
            connection_id="conn_custom",
            learner_id="learner_123",
            tenant_id="tenant_abc",
            session_id="session_456",
            user_agent="Mozilla/5.0",
            ip_address="192.168.1.1",
            device=DeviceType.MOBILE,
            status=UserStatus.AWAY,
            rooms=["room1", "room2"],
            reconnect_count=2,
        )
        assert info.connection_id == "conn_custom"
        assert info.session_id == "session_456"
        assert info.device == DeviceType.MOBILE
        assert info.status == UserStatus.AWAY
        assert len(info.rooms) == 2


class TestRoomInfo:
    """Tests for RoomInfo model."""

    def test_create_room_info(self):
        """Test creating room info."""
        room = RoomInfo(
            room_id="session:123",
            room_type=RoomType.SESSION,
        )
        assert room.room_id == "session:123"
        assert room.room_type == RoomType.SESSION
        assert room.connections == []
        assert room.member_count == 0
        assert room.persistent is False

    def test_room_types(self):
        """Test different room types."""
        for room_type in RoomType:
            room = RoomInfo(room_id=f"{room_type.value}:1", room_type=room_type)
            assert room.room_type == room_type


class TestCognitiveState:
    """Tests for CognitiveState model."""

    def test_create_cognitive_state(self):
        """Test creating cognitive state."""
        state = CognitiveState(learner_id="learner_123")
        assert state.learner_id == "learner_123"
        assert state.cognitive_load == CognitiveStateLevel.OPTIMAL
        assert state.engagement_level == EngagementLevel.MODERATE
        assert 0 <= state.frustration_index <= 1
        assert state.needs_intervention is False

    def test_cognitive_state_with_intervention_needed(self):
        """Test cognitive state that needs intervention."""
        state = CognitiveState(
            learner_id="learner_123",
            cognitive_load=CognitiveStateLevel.OVERLOAD,
            cognitive_load_score=0.9,
            frustration_index=0.8,
            needs_intervention=True,
            intervention_triggers=["high_frustration", "cognitive_overload"],
        )
        assert state.needs_intervention is True
        assert len(state.intervention_triggers) == 2

    def test_score_validation(self):
        """Test that scores are validated."""
        state = CognitiveState(
            learner_id="learner_123",
            cognitive_load_score=0.5,
            engagement_score=0.7,
            frustration_index=0.3,
        )
        assert 0 <= state.cognitive_load_score <= 1
        assert 0 <= state.engagement_score <= 1
        assert 0 <= state.frustration_index <= 1


class TestIntervention:
    """Tests for Intervention model."""

    def test_create_intervention(self):
        """Test creating an intervention."""
        intervention = Intervention(
            learner_id="learner_123",
            intervention_type=InterventionType.ENCOURAGEMENT,
            title="Keep Going!",
            message="You're doing great!",
            trigger_reason="mild_frustration",
        )
        assert intervention.learner_id == "learner_123"
        assert intervention.intervention_type == InterventionType.ENCOURAGEMENT
        assert intervention.title == "Keep Going!"
        assert intervention.dismissible is True
        assert intervention.priority == 5

    def test_intervention_types(self):
        """Test different intervention types."""
        types = [
            InterventionType.ENCOURAGEMENT,
            InterventionType.HINT,
            InterventionType.BREAK_SUGGESTION,
            InterventionType.SCAFFOLDING,
        ]
        for int_type in types:
            intervention = Intervention(
                learner_id="test",
                intervention_type=int_type,
                title="Test",
                message="Test message",
                trigger_reason="test",
            )
            assert intervention.intervention_type == int_type


class TestLearnerAction:
    """Tests for LearnerAction model."""

    def test_create_learner_action(self):
        """Test creating a learner action."""
        action = LearnerAction(
            action_type=ActionType.ANSWER_SUBMITTED,
            learner_id="learner_123",
            data={"question_id": "q1", "answer": "A", "correct": True},
        )
        assert action.action_type == ActionType.ANSWER_SUBMITTED
        assert action.learner_id == "learner_123"
        assert action.data["correct"] is True

    def test_action_types(self):
        """Test different action types."""
        assert ActionType.ANSWER_SUBMITTED == "answer_submitted"
        assert ActionType.HINT_REQUESTED == "hint_requested"
        assert ActionType.CONTENT_VIEWED == "content_viewed"
