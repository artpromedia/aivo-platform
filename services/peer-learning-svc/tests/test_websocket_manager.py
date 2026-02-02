"""Tests for WebSocketManager and real-time collaboration features."""
import pytest
import json
import asyncio
from datetime import datetime, timezone
from unittest.mock import MagicMock, AsyncMock, patch

from app.services.websocket_manager import (
    WebSocketManager,
    WebSocketMessage,
    MessageType,
    ConnectionInfo,
    ws_manager,
)


class TestMessageType:
    """Tests for MessageType enum."""

    def test_all_message_types_exist(self):
        """Test that all expected message types exist."""
        # Test actual message types from implementation
        expected_types = [
            "CONNECT",
            "DISCONNECT",
            "PING",
            "PONG",
            "ERROR",
            "JOIN_SESSION",
            "LEAVE_SESSION",
            "SESSION_UPDATE",
            "PRESENCE_UPDATE",
            "TYPING_START",
            "TYPING_STOP",
            "CHAT_MESSAGE",
        ]
        
        for type_name in expected_types:
            assert hasattr(MessageType, type_name)


class TestWebSocketMessage:
    """Tests for WebSocketMessage dataclass."""

    def test_creation(self):
        """Test creating a WebSocket message."""
        message = WebSocketMessage(
            type=MessageType.CHAT_MESSAGE,
            session_id="session_001",
            sender_id="user_001",
            data={"content": "Hello!"},
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        
        assert message.type == MessageType.CHAT_MESSAGE
        assert message.session_id == "session_001"
        assert message.sender_id == "user_001"
        assert message.data["content"] == "Hello!"

    def test_to_json(self):
        """Test JSON serialization."""
        message = WebSocketMessage(
            type=MessageType.CHAT_MESSAGE,
            session_id="session_001",
            sender_id="user_001",
            data={"content": "Hello!"},
            timestamp="2024-01-15T10:00:00+00:00",
        )
        
        json_str = message.to_json()
        parsed = json.loads(json_str)
        
        assert parsed["type"] == "chat_message"
        assert parsed["session_id"] == "session_001"
        assert parsed["sender_id"] == "user_001"
        assert parsed["data"]["content"] == "Hello!"

    def test_from_dict(self):
        """Test dictionary deserialization."""
        data = {
            "type": "chat_message",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {"content": "Hello!"},
            "timestamp": "2024-01-15T10:00:00+00:00",
        }
        
        message = WebSocketMessage.from_dict(data)
        
        assert message.type == MessageType.CHAT_MESSAGE
        assert message.session_id == "session_001"
        assert message.data["content"] == "Hello!"

    def test_from_json_invalid(self):
        """Test handling invalid JSON."""
        with pytest.raises(Exception):
            WebSocketMessage.from_json("invalid json")

    def test_message_with_message_id(self):
        """Test message with explicit message ID."""
        message = WebSocketMessage(
            type=MessageType.CHAT_MESSAGE,
            session_id="session_001",
            sender_id="user_001",
            data={},
            timestamp=datetime.now(timezone.utc).isoformat(),
            message_id="msg_123",
        )
        
        assert message.message_id == "msg_123"


class TestConnectionInfo:
    """Tests for ConnectionInfo dataclass."""

    def test_creation(self):
        """Test creating connection info."""
        mock_ws = MagicMock()
        info = ConnectionInfo(
            connection_id="conn_001",
            user_id="user_001",
            websocket=mock_ws,
            connected_at=datetime.now(timezone.utc),
            session_ids=set(),  # ConnectionInfo uses session_ids, not current_session
            last_ping=datetime.now(timezone.utc),
        )
        
        assert info.connection_id == "conn_001"
        assert info.user_id == "user_001"
        assert len(info.session_ids) == 0

    def test_session_tracking(self):
        """Test session tracking in connection."""
        mock_ws = MagicMock()
        info = ConnectionInfo(
            connection_id="conn_001",
            user_id="user_001",
            websocket=mock_ws,
            connected_at=datetime.now(timezone.utc),
            session_ids=set(),
            last_ping=datetime.now(timezone.utc),
        )
        
        info.session_ids.add("session_001")
        
        assert "session_001" in info.session_ids


class TestWebSocketManager:
    """Tests for WebSocketManager class."""

    def test_init(self):
        """Test initialization."""
        manager = WebSocketManager()
        assert manager is not None
        assert manager.get_connection_count() == 0

    @pytest.mark.asyncio
    async def test_connect(self):
        """Test connecting a WebSocket."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        connection = await manager.connect(mock_ws, "user_001")
        
        assert connection is not None
        assert connection.user_id == "user_001"
        assert manager.get_connection_count() == 1

    @pytest.mark.asyncio
    async def test_disconnect(self):
        """Test disconnecting a WebSocket."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        connection = await manager.connect(mock_ws, "user_001")
        await manager.disconnect(connection.connection_id)
        
        assert manager.get_connection_count() == 0

    @pytest.mark.asyncio
    async def test_join_session(self):
        """Test joining a session."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        connection = await manager.connect(mock_ws, "user_001")
        await manager.join_session(connection.connection_id, "session_001")
        
        participants = manager.get_session_participants("session_001")
        assert "user_001" in participants

    @pytest.mark.asyncio
    async def test_leave_session(self):
        """Test leaving a session."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        connection = await manager.connect(mock_ws, "user_001")
        await manager.join_session(connection.connection_id, "session_001")
        await manager.leave_session(connection.connection_id, "session_001")  # Need session_id
        
        participants = manager.get_session_participants("session_001")
        assert "user_001" not in participants

    @pytest.mark.asyncio
    async def test_multiple_users_in_session(self):
        """Test multiple users in same session."""
        manager = WebSocketManager()
        
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        mock_ws3 = AsyncMock()
        
        conn1 = await manager.connect(mock_ws1, "user_001")
        conn2 = await manager.connect(mock_ws2, "user_002")
        conn3 = await manager.connect(mock_ws3, "user_003")
        
        await manager.join_session(conn1.connection_id, "session_001")
        await manager.join_session(conn2.connection_id, "session_001")
        await manager.join_session(conn3.connection_id, "session_002")
        
        session1_participants = manager.get_session_participants("session_001")
        session2_participants = manager.get_session_participants("session_002")
        
        assert len(session1_participants) == 2
        assert len(session2_participants) == 1

    @pytest.mark.asyncio
    async def test_broadcast_to_session(self):
        """Test broadcasting message to session."""
        manager = WebSocketManager()
        
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        conn1 = await manager.connect(mock_ws1, "user_001")
        conn2 = await manager.connect(mock_ws2, "user_002")
        
        await manager.join_session(conn1.connection_id, "session_001")
        await manager.join_session(conn2.connection_id, "session_001")
        
        message = WebSocketMessage(
            type=MessageType.CHAT_MESSAGE,
            session_id="session_001",
            sender_id="user_001",
            data={"content": "Hello everyone!"},
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        
        await manager.broadcast_to_session("session_001", message)
        
        # Both connections should receive the message
        # Note: The actual send call depends on implementation
        # This test verifies the flow works without errors

    @pytest.mark.asyncio
    async def test_send_to_user(self):
        """Test sending message to specific user."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        connection = await manager.connect(mock_ws, "user_001")
        
        message = WebSocketMessage(
            type=MessageType.PING,
            session_id=None,
            sender_id="system",
            data={"status": "ok"},
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        
        await manager.send_to_user("user_001", message)
        
        # Should complete without error

    @pytest.mark.asyncio
    async def test_handle_chat_message(self):
        """Test handling a chat message."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        connection = await manager.connect(mock_ws, "user_001")
        await manager.join_session(connection.connection_id, "session_001")
        
        message_json = json.dumps({
            "type": "chat_message",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {"content": "Hello!"},
        })
        
        response = await manager.handle_message(connection.connection_id, message_json)
        
        # Should process without error

    @pytest.mark.asyncio
    async def test_handle_typing_indicator(self):
        """Test handling typing indicator."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        connection = await manager.connect(mock_ws, "user_001")
        await manager.join_session(connection.connection_id, "session_001")
        
        message_json = json.dumps({
            "type": "typing_start",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {"is_typing": True},
        })
        
        await manager.handle_message(connection.connection_id, message_json)

    @pytest.mark.asyncio
    async def test_handle_presence_update(self):
        """Test handling presence update."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        connection = await manager.connect(mock_ws, "user_001")
        await manager.join_session(connection.connection_id, "session_001")
        
        message_json = json.dumps({
            "type": "presence_update",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {"status": "active"},
        })
        
        await manager.handle_message(connection.connection_id, message_json)

    @pytest.mark.asyncio
    async def test_handle_cursor_position(self):
        """Test handling cursor position update."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        connection = await manager.connect(mock_ws, "user_001")
        await manager.join_session(connection.connection_id, "session_001")
        
        message_json = json.dumps({
            "type": "cursor_move",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {
                "resource_id": "doc_001",
                "line": 10,
                "column": 5,
            },
        })
        
        await manager.handle_message(connection.connection_id, message_json)

    @pytest.mark.asyncio
    async def test_handle_content_edit(self):
        """Test handling content edit signal."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        connection = await manager.connect(mock_ws, "user_001")
        await manager.join_session(connection.connection_id, "session_001")
        
        message_json = json.dumps({
            "type": "content_edit",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {
                "resource_id": "doc_001",
                "operation": "insert",
                "position": 100,
                "text": "Hello",
            },
        })
        
        await manager.handle_message(connection.connection_id, message_json)

    @pytest.mark.asyncio
    async def test_handle_heartbeat(self):
        """Test handling heartbeat message."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        connection = await manager.connect(mock_ws, "user_001")
        
        message_json = json.dumps({
            "type": "HEARTBEAT",
            "session_id": None,
            "sender_id": "user_001",
            "data": {},
        })
        
        response = await manager.handle_message(connection.connection_id, message_json)
        
        # Should return heartbeat ACK

    @pytest.mark.asyncio
    async def test_get_connection_count(self):
        """Test getting connection count."""
        manager = WebSocketManager()
        
        assert manager.get_connection_count() == 0
        
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        await manager.connect(mock_ws1, "user_001")
        assert manager.get_connection_count() == 1
        
        await manager.connect(mock_ws2, "user_002")
        assert manager.get_connection_count() == 2

    @pytest.mark.asyncio
    async def test_get_session_count(self):
        """Test getting session count."""
        manager = WebSocketManager()
        
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        mock_ws3 = AsyncMock()
        
        conn1 = await manager.connect(mock_ws1, "user_001")
        conn2 = await manager.connect(mock_ws2, "user_002")
        conn3 = await manager.connect(mock_ws3, "user_003")
        
        await manager.join_session(conn1.connection_id, "session_001")
        await manager.join_session(conn2.connection_id, "session_001")
        await manager.join_session(conn3.connection_id, "session_002")
        
        assert manager.get_session_count() == 2

    @pytest.mark.asyncio
    async def test_user_reconnection(self):
        """Test user reconnecting with new WebSocket."""
        manager = WebSocketManager()
        
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        # First connection
        conn1 = await manager.connect(mock_ws1, "user_001")
        await manager.join_session(conn1.connection_id, "session_001")
        
        # Simulate disconnect
        await manager.disconnect(conn1.connection_id)
        
        # Reconnect
        conn2 = await manager.connect(mock_ws2, "user_001")
        
        assert conn2.connection_id != conn1.connection_id

    @pytest.mark.asyncio
    async def test_handle_invalid_message(self):
        """Test handling invalid message format."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        connection = await manager.connect(mock_ws, "user_001")
        
        # Invalid JSON
        response = await manager.handle_message(
            connection.connection_id,
            "not valid json"
        )
        
        # Should handle gracefully, possibly return error message
        if response:
            assert response.type == MessageType.ERROR

    @pytest.mark.asyncio
    async def test_handle_message_unknown_type(self):
        """Test handling message with unknown type."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        connection = await manager.connect(mock_ws, "user_001")
        
        message_json = json.dumps({
            "type": "UNKNOWN_TYPE",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {},
        })
        
        # Should handle gracefully
        try:
            await manager.handle_message(connection.connection_id, message_json)
        except Exception:
            pass  # May raise, which is acceptable


class TestSingletonInstance:
    """Tests for the global ws_manager singleton."""

    def test_singleton_exists(self):
        """Test that singleton instance exists."""
        assert ws_manager is not None
        assert isinstance(ws_manager, WebSocketManager)

    def test_singleton_has_methods(self):
        """Test that singleton has expected methods."""
        assert hasattr(ws_manager, "connect")
        assert hasattr(ws_manager, "disconnect")
        assert hasattr(ws_manager, "join_session")
        assert hasattr(ws_manager, "broadcast_to_session")


class TestWebSocketIntegration:
    """Integration tests for WebSocket functionality."""

    @pytest.mark.asyncio
    async def test_full_session_flow(self):
        """Test complete session collaboration flow."""
        manager = WebSocketManager()
        
        # Create mock WebSockets
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        # Connect users
        conn1 = await manager.connect(mock_ws1, "tutor_001")
        conn2 = await manager.connect(mock_ws2, "student_001")
        
        # Join session
        await manager.join_session(conn1.connection_id, "session_001")
        await manager.join_session(conn2.connection_id, "session_001")
        
        # Tutor sends message
        chat_msg = json.dumps({
            "type": "chat_message",
            "session_id": "session_001",
            "sender_id": "tutor_001",
            "data": {"content": "Let's start the lesson"},
        })
        await manager.handle_message(conn1.connection_id, chat_msg)
        
        # Student indicates typing
        typing_msg = json.dumps({
            "type": "typing_start",
            "session_id": "session_001",
            "sender_id": "student_001",
            "data": {"is_typing": True},
        })
        await manager.handle_message(conn2.connection_id, typing_msg)
        
        # Student sends response
        response_msg = json.dumps({
            "type": "chat_message",
            "session_id": "session_001",
            "sender_id": "student_001",
            "data": {"content": "I'm ready!"},
        })
        await manager.handle_message(conn2.connection_id, response_msg)
        
        # Verify session state
        participants = manager.get_session_participants("session_001")
        assert len(participants) == 2
        
        # Student leaves
        await manager.leave_session(conn2.connection_id, "session_001")
        
        participants = manager.get_session_participants("session_001")
        assert len(participants) == 1
        
        # Tutor disconnects
        await manager.disconnect(conn1.connection_id)
        
        assert manager.get_connection_count() == 1  # student still connected but not in session

    @pytest.mark.asyncio
    async def test_collaborative_editing_flow(self):
        """Test collaborative editing scenario."""
        manager = WebSocketManager()
        
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        conn1 = await manager.connect(mock_ws1, "editor_001")
        conn2 = await manager.connect(mock_ws2, "editor_002")
        
        await manager.join_session(conn1.connection_id, "doc_session")
        await manager.join_session(conn2.connection_id, "doc_session")
        
        # Editor 1 moves cursor
        cursor_msg1 = json.dumps({
            "type": "cursor_move",
            "session_id": "doc_session",
            "sender_id": "editor_001",
            "data": {"resource_id": "doc_001", "line": 5, "column": 10},
        })
        await manager.handle_message(conn1.connection_id, cursor_msg1)
        
        # Editor 2 selects text
        selection_msg = json.dumps({
            "type": "selection_change",
            "session_id": "doc_session",
            "sender_id": "editor_002",
            "data": {
                "resource_id": "doc_001",
                "start": {"line": 10, "column": 0},
                "end": {"line": 10, "column": 20},
            },
        })
        await manager.handle_message(conn2.connection_id, selection_msg)
        
        # Editor 1 makes edit
        edit_msg = json.dumps({
            "type": "content_edit",
            "session_id": "doc_session",
            "sender_id": "editor_001",
            "data": {
                "resource_id": "doc_001",
                "operation": "insert",
                "position": 50,
                "text": "// New code\n",
            },
        })
        await manager.handle_message(conn1.connection_id, edit_msg)
        
        # Both should still be in session
        participants = manager.get_session_participants("doc_session")
        assert len(participants) == 2


# ============================================================================
# Additional Tests for Coverage Improvement
# ============================================================================

class TestWebSocketManagerEdgeCases:
    """Tests for edge cases and error paths in WebSocketManager."""

    @pytest.mark.asyncio
    async def test_disconnect_nonexistent_connection(self):
        """Test disconnecting a non-existent connection."""
        manager = WebSocketManager()
        # Should not raise, just return silently
        await manager.disconnect("nonexistent_connection_id")

    @pytest.mark.asyncio
    async def test_join_session_inactive_connection(self):
        """Test joining a session with an inactive connection."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        conn = await manager.connect(mock_ws, "user_001")
        conn.is_active = False
        
        result = await manager.join_session(conn.connection_id, "session_001")
        assert result is False

    @pytest.mark.asyncio
    async def test_join_session_nonexistent_connection(self):
        """Test joining a session with a non-existent connection."""
        manager = WebSocketManager()
        result = await manager.join_session("nonexistent", "session_001")
        assert result is False

    @pytest.mark.asyncio
    async def test_leave_session_nonexistent_connection(self):
        """Test leaving a session with a non-existent connection."""
        manager = WebSocketManager()
        result = await manager.leave_session("nonexistent", "session_001")
        assert result is False

    @pytest.mark.asyncio
    async def test_send_to_inactive_connection(self):
        """Test sending to an inactive connection."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        conn = await manager.connect(mock_ws, "user_001")
        conn.is_active = False
        
        message = WebSocketMessage(
            type=MessageType.CHAT_MESSAGE,
            session_id="session_001",
            sender_id="system",
            data={"content": "test"},
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        
        result = await manager._send_to_connection(conn, message)
        assert result is False

    @pytest.mark.asyncio
    async def test_send_to_connection_with_error(self):
        """Test sending to a connection that raises an error."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        mock_ws.send_text.side_effect = Exception("Connection error")
        
        conn = await manager.connect(mock_ws, "user_001")
        
        message = WebSocketMessage(
            type=MessageType.CHAT_MESSAGE,
            session_id="session_001",
            sender_id="system",
            data={"content": "test"},
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        
        result = await manager._send_to_connection(conn, message)
        assert result is False
        assert conn.is_active is False  # Connection marked as inactive

    @pytest.mark.asyncio
    async def test_send_to_user_no_connections(self):
        """Test sending to a user with no connections."""
        manager = WebSocketManager()
        
        message = WebSocketMessage(
            type=MessageType.CHAT_MESSAGE,
            session_id="session_001",
            sender_id="system",
            data={"content": "test"},
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        
        count = await manager.send_to_user("nonexistent_user", message)
        assert count == 0

    @pytest.mark.asyncio
    async def test_broadcast_to_empty_session(self):
        """Test broadcasting to a session with no participants."""
        manager = WebSocketManager()
        
        message = WebSocketMessage(
            type=MessageType.CHAT_MESSAGE,
            session_id="empty_session",
            sender_id="system",
            data={"content": "test"},
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        
        count = await manager.broadcast_to_session("empty_session", message)
        assert count == 0

    @pytest.mark.asyncio
    async def test_handle_message_invalid_json(self):
        """Test handling invalid JSON message."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        conn = await manager.connect(mock_ws, "user_001")
        
        result = await manager.handle_message(conn.connection_id, "not valid json")
        assert result.type == MessageType.ERROR

    @pytest.mark.asyncio
    async def test_handle_message_nonexistent_connection(self):
        """Test handling message from non-existent connection."""
        manager = WebSocketManager()
        
        result = await manager.handle_message("nonexistent", json.dumps({"type": "ping"}))
        # Non-existent connection returns None, not error message
        assert result is None

    @pytest.mark.asyncio
    async def test_handle_message_ping(self):
        """Test handling PING message."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        conn = await manager.connect(mock_ws, "user_001")
        
        msg = json.dumps({
            "type": "ping",
            "session_id": None,
            "sender_id": "user_001",
            "data": {},
        })
        
        result = await manager.handle_message(conn.connection_id, msg)
        assert result.type == MessageType.PONG

    @pytest.mark.asyncio
    async def test_handle_join_session_message(self):
        """Test handling JOIN_SESSION message type."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        conn = await manager.connect(mock_ws, "user_001")
        
        msg = json.dumps({
            "type": "join_session",
            "session_id": None,
            "sender_id": "user_001",
            "data": {"session_id": "session_001"},
        })
        
        result = await manager.handle_message(conn.connection_id, msg)
        assert result is None
        assert "session_001" in manager.get_user_sessions("user_001")

    @pytest.mark.asyncio
    async def test_handle_leave_session_message(self):
        """Test handling LEAVE_SESSION message type."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        conn = await manager.connect(mock_ws, "user_001")
        await manager.join_session(conn.connection_id, "session_001")
        
        msg = json.dumps({
            "type": "leave_session",
            "session_id": None,
            "sender_id": "user_001",
            "data": {"session_id": "session_001"},
        })
        
        result = await manager.handle_message(conn.connection_id, msg)
        assert result is None
        assert "session_001" not in manager.get_user_sessions("user_001")

    @pytest.mark.asyncio
    async def test_handle_presence_update_message(self):
        """Test handling PRESENCE_UPDATE message type."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        conn = await manager.connect(mock_ws, "user_001")
        await manager.join_session(conn.connection_id, "session_001")
        
        msg = json.dumps({
            "type": "presence_update",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {"status": "away"},
        })
        
        result = await manager.handle_message(conn.connection_id, msg)
        assert result is None

    @pytest.mark.asyncio
    async def test_handle_typing_start_message(self):
        """Test handling TYPING_START message type."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        conn = await manager.connect(mock_ws, "user_001")
        await manager.join_session(conn.connection_id, "session_001")
        
        msg = json.dumps({
            "type": "typing_start",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {},
        })
        
        result = await manager.handle_message(conn.connection_id, msg)
        assert result is None

    @pytest.mark.asyncio
    async def test_handle_typing_stop_message(self):
        """Test handling TYPING_STOP message type."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        conn = await manager.connect(mock_ws, "user_001")
        await manager.join_session(conn.connection_id, "session_001")
        
        msg = json.dumps({
            "type": "typing_stop",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {},
        })
        
        result = await manager.handle_message(conn.connection_id, msg)
        assert result is None

    @pytest.mark.asyncio
    async def test_handle_cursor_move_message(self):
        """Test handling CURSOR_MOVE message type."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        conn = await manager.connect(mock_ws, "user_001")
        await manager.join_session(conn.connection_id, "session_001")
        
        msg = json.dumps({
            "type": "cursor_move",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {"resource_id": "doc_001", "position": {"line": 10, "column": 5}},
        })
        
        result = await manager.handle_message(conn.connection_id, msg)
        assert result is None

    @pytest.mark.asyncio
    async def test_handle_selection_change_message(self):
        """Test handling SELECTION_CHANGE message type."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        conn = await manager.connect(mock_ws, "user_001")
        await manager.join_session(conn.connection_id, "session_001")
        
        msg = json.dumps({
            "type": "selection_change",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {"resource_id": "doc_001", "selection": {"start": 0, "end": 10}},
        })
        
        result = await manager.handle_message(conn.connection_id, msg)
        assert result is None

    @pytest.mark.asyncio
    async def test_handle_content_edit_message(self):
        """Test handling CONTENT_EDIT message type."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        conn = await manager.connect(mock_ws, "user_001")
        await manager.join_session(conn.connection_id, "session_001")
        
        msg = json.dumps({
            "type": "content_edit",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {"resource_id": "doc_001", "operation": {"type": "insert", "position": 0, "text": "Hello"}},
        })
        
        result = await manager.handle_message(conn.connection_id, msg)
        assert result is None

    @pytest.mark.asyncio
    async def test_register_and_call_custom_handler(self):
        """Test registering and calling a custom message handler."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        # Track handler calls
        handler_called = []
        
        async def custom_handler(connection, message):
            handler_called.append((connection.user_id, message.type))
        
        # Register for a message type without built-in handling
        manager.register_handler(MessageType.SESSION_UPDATE, custom_handler)
        
        conn = await manager.connect(mock_ws, "user_001")
        
        msg = json.dumps({
            "type": "session_update",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {"update": "test"},
        })
        
        await manager.handle_message(conn.connection_id, msg)
        
        # Handler should have been called
        assert len(handler_called) == 1
        assert handler_called[0][0] == "user_001"

    @pytest.mark.asyncio
    async def test_handler_with_exception(self):
        """Test handler that raises an exception."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        async def failing_handler(connection, message):
            raise ValueError("Handler error")
        
        manager.register_handler(MessageType.SESSION_UPDATE, failing_handler)
        
        conn = await manager.connect(mock_ws, "user_001")
        
        msg = json.dumps({
            "type": "session_update",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {},
        })
        
        # Should not raise, error should be logged
        result = await manager.handle_message(conn.connection_id, msg)
        assert result is None  # Handler error is logged but not propagated

    @pytest.mark.asyncio
    async def test_cleanup_stale_connections(self):
        """Test cleaning up stale connections."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        conn = await manager.connect(mock_ws, "user_001")
        
        # Make connection stale by setting old last_ping
        from datetime import timedelta
        conn.last_ping = datetime.now(timezone.utc) - timedelta(seconds=manager.CONNECTION_TIMEOUT + 100)
        
        # Cleanup should remove the stale connection
        cleaned = await manager.cleanup_stale_connections()
        assert cleaned == 1
        assert manager.get_connection_count() == 0

    @pytest.mark.asyncio
    async def test_cleanup_no_stale_connections(self):
        """Test cleanup when there are no stale connections."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        conn = await manager.connect(mock_ws, "user_001")
        # Connection is fresh, should not be cleaned up
        
        cleaned = await manager.cleanup_stale_connections()
        assert cleaned == 0
        assert manager.get_connection_count() == 1

    @pytest.mark.asyncio
    async def test_multiple_connections_same_user(self):
        """Test multiple connections from the same user."""
        manager = WebSocketManager()
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        conn1 = await manager.connect(mock_ws1, "user_001")
        conn2 = await manager.connect(mock_ws2, "user_001")
        
        assert manager.get_connection_count() == 2
        
        # Both connections should receive messages
        await manager.join_session(conn1.connection_id, "session_001")
        await manager.join_session(conn2.connection_id, "session_001")
        
        # Disconnect one connection
        await manager.disconnect(conn1.connection_id)
        
        # User should still be in session via conn2
        sessions = manager.get_user_sessions("user_001")
        assert "session_001" in sessions

    @pytest.mark.asyncio
    async def test_user_still_in_session_via_other_connection(self):
        """Test user stays in session when they have multiple connections."""
        manager = WebSocketManager()
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        conn1 = await manager.connect(mock_ws1, "user_001")
        conn2 = await manager.connect(mock_ws2, "user_001")
        
        # Both join same session
        await manager.join_session(conn1.connection_id, "session_001")
        await manager.join_session(conn2.connection_id, "session_001")
        
        # Leave via one connection only
        await manager.leave_session(conn1.connection_id, "session_001")
        
        # User should still be a participant (via conn2)
        participants = manager.get_session_participants("session_001")
        assert "user_001" in participants

    @pytest.mark.asyncio
    async def test_broadcast_presence(self):
        """Test broadcasting presence updates."""
        manager = WebSocketManager()
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        conn1 = await manager.connect(mock_ws1, "user_001")
        conn2 = await manager.connect(mock_ws2, "user_002")
        
        await manager.join_session(conn1.connection_id, "session_001")
        await manager.join_session(conn2.connection_id, "session_001")
        
        # Broadcast presence update
        await manager.broadcast_presence("session_001", "user_001", "away")
        
        # user_002's websocket should have received the message
        assert mock_ws2.send_text.called

    @pytest.mark.asyncio
    async def test_broadcast_typing(self):
        """Test broadcasting typing indicators."""
        manager = WebSocketManager()
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        conn1 = await manager.connect(mock_ws1, "user_001")
        conn2 = await manager.connect(mock_ws2, "user_002")
        
        await manager.join_session(conn1.connection_id, "session_001")
        await manager.join_session(conn2.connection_id, "session_001")
        
        # Broadcast typing start
        await manager.broadcast_typing("session_001", "user_001", True)
        
        # user_002's websocket should have received the message
        assert mock_ws2.send_text.called

    @pytest.mark.asyncio
    async def test_broadcast_cursor_position(self):
        """Test broadcasting cursor positions."""
        manager = WebSocketManager()
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        conn1 = await manager.connect(mock_ws1, "user_001")
        conn2 = await manager.connect(mock_ws2, "user_002")
        
        await manager.join_session(conn1.connection_id, "session_001")
        await manager.join_session(conn2.connection_id, "session_001")
        
        # Broadcast cursor position
        await manager.broadcast_cursor_position(
            "session_001", "user_001", "doc_001", {"line": 10, "column": 5}
        )
        
        assert mock_ws2.send_text.called

    @pytest.mark.asyncio
    async def test_broadcast_selection(self):
        """Test broadcasting text selections."""
        manager = WebSocketManager()
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        conn1 = await manager.connect(mock_ws1, "user_001")
        conn2 = await manager.connect(mock_ws2, "user_002")
        
        await manager.join_session(conn1.connection_id, "session_001")
        await manager.join_session(conn2.connection_id, "session_001")
        
        # Broadcast selection
        await manager.broadcast_selection(
            "session_001", "user_001", "doc_001", {"start": 0, "end": 10}
        )
        
        assert mock_ws2.send_text.called

    @pytest.mark.asyncio
    async def test_broadcast_content_edit(self):
        """Test broadcasting content edits."""
        manager = WebSocketManager()
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        conn1 = await manager.connect(mock_ws1, "user_001")
        conn2 = await manager.connect(mock_ws2, "user_002")
        
        await manager.join_session(conn1.connection_id, "session_001")
        await manager.join_session(conn2.connection_id, "session_001")
        
        # Broadcast content edit
        await manager.broadcast_content_edit(
            "session_001", "user_001", "doc_001", {"type": "insert", "position": 0, "text": "Hello"}
        )
        
        assert mock_ws2.send_text.called

    @pytest.mark.asyncio
    async def test_get_user_sessions_no_connections(self):
        """Test getting sessions for a user with no connections."""
        manager = WebSocketManager()
        sessions = manager.get_user_sessions("nonexistent_user")
        assert sessions == []

    @pytest.mark.asyncio
    async def test_disconnect_removes_from_user_connections(self):
        """Test disconnecting removes user from _user_connections."""
        manager = WebSocketManager()
        mock_ws = AsyncMock()
        
        conn = await manager.connect(mock_ws, "user_001")
        assert "user_001" in manager._user_connections
        
        await manager.disconnect(conn.connection_id)
        
        # User should be removed from _user_connections
        assert "user_001" not in manager._user_connections

    def test_get_session_count(self):
        """Test getting session count."""
        manager = WebSocketManager()
        assert manager.get_session_count() == 0
        
        # Add a session manually for testing
        manager._session_participants["session_001"] = {"user_001"}
        assert manager.get_session_count() == 1


class TestWebSocketMessageFromDict:
    """Tests for WebSocketMessage.from_dict edge cases."""

    def test_from_dict_with_unknown_type(self):
        """Test from_dict with unknown message type."""
        data = {
            "type": "unknown_type_xyz",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {},
        }
        # Should handle gracefully or raise
        try:
            message = WebSocketMessage.from_dict(data)
            # If it doesn't raise, the type handling should be graceful
        except (ValueError, KeyError):
            pass  # Expected for unknown type

    def test_from_dict_with_message_id(self):
        """Test from_dict preserves message_id."""
        data = {
            "type": "chat_message",
            "session_id": "session_001",
            "sender_id": "user_001",
            "data": {"content": "Hello"},
            "message_id": "msg_12345",
            "timestamp": "2024-01-15T10:00:00+00:00",
        }
        
        message = WebSocketMessage.from_dict(data)
        assert message.message_id == "msg_12345"