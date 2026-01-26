"""
Tests for Connection Manager.
"""

import pytest

from app.manager import ConnectionManager
from app.models import DeviceType, MessageType, UserStatus, WebSocketMessage


class TestConnectionManager:
    """Tests for ConnectionManager class."""

    @pytest.mark.asyncio
    async def test_connect(self, connection_manager, mock_websocket):
        """Test connecting a new WebSocket."""
        info = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
            user_agent="Mozilla/5.0",
            ip_address="192.168.1.1",
        )

        assert info.learner_id == "learner_123"
        assert info.connection_id in connection_manager.active_connections
        assert info.status == UserStatus.ONLINE
        mock_websocket.accept.assert_called_once()

    @pytest.mark.asyncio
    async def test_disconnect(self, connection_manager, mock_websocket):
        """Test disconnecting a WebSocket."""
        info = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
        )

        assert info.connection_id in connection_manager.active_connections

        await connection_manager.disconnect(info.connection_id)

        assert info.connection_id not in connection_manager.active_connections

    @pytest.mark.asyncio
    async def test_send_personal(self, connection_manager, mock_websocket):
        """Test sending a message to a specific connection."""
        info = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
        )

        message = WebSocketMessage(
            type=MessageType.PONG,
            payload={"server_time": "2024-01-01T00:00:00"},
        )

        result = await connection_manager.send_personal(info.connection_id, message)

        assert result is True
        mock_websocket.send_json.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_personal_nonexistent_connection(self, connection_manager):
        """Test sending to a nonexistent connection."""
        message = WebSocketMessage(
            type=MessageType.PONG,
            payload={},
        )

        result = await connection_manager.send_personal("nonexistent", message)

        assert result is False

    @pytest.mark.asyncio
    async def test_join_room(self, connection_manager, mock_websocket):
        """Test joining a room."""
        info = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
        )

        result = await connection_manager.join_room(info.connection_id, "room:test")

        assert result is True
        assert "room:test" in info.rooms

    @pytest.mark.asyncio
    async def test_leave_room(self, connection_manager, mock_websocket):
        """Test leaving a room."""
        info = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
        )

        await connection_manager.join_room(info.connection_id, "room:test")
        assert "room:test" in info.rooms

        result = await connection_manager.leave_room(info.connection_id, "room:test")

        assert result is True
        assert "room:test" not in info.rooms

    @pytest.mark.asyncio
    async def test_update_heartbeat(self, connection_manager, mock_websocket):
        """Test updating heartbeat."""
        info = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
        )

        old_heartbeat = info.last_heartbeat

        result = connection_manager.update_heartbeat(info.connection_id)

        assert result is True
        assert info.last_heartbeat >= old_heartbeat

    @pytest.mark.asyncio
    async def test_get_connection(self, connection_manager, mock_websocket):
        """Test getting connection info."""
        info = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
        )

        retrieved = connection_manager.get_connection(info.connection_id)

        assert retrieved is not None
        assert retrieved.learner_id == "learner_123"

    @pytest.mark.asyncio
    async def test_get_connections_by_learner(self, connection_manager, mock_websocket):
        """Test getting all connections for a learner."""
        # Connect same learner twice
        mock_ws2 = mock_websocket.__class__()
        mock_ws2.accept = mock_websocket.accept
        mock_ws2.send_json = mock_websocket.send_json

        info1 = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
        )
        info2 = await connection_manager.connect(
            websocket=mock_ws2,
            learner_id="learner_123",
        )

        connections = connection_manager.get_connections_by_learner("learner_123")

        assert len(connections) == 2
        assert all(c.learner_id == "learner_123" for c in connections)

    @pytest.mark.asyncio
    async def test_device_detection_mobile(self, connection_manager, mock_websocket):
        """Test mobile device detection."""
        info = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS) Mobile Safari",
        )

        assert info.device == DeviceType.MOBILE

    @pytest.mark.asyncio
    async def test_device_detection_tablet(self, connection_manager, mock_websocket):
        """Test tablet device detection."""
        info = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
            user_agent="Mozilla/5.0 (iPad; CPU OS) Safari",
        )

        assert info.device == DeviceType.TABLET

    @pytest.mark.asyncio
    async def test_device_detection_web(self, connection_manager, mock_websocket):
        """Test web device detection."""
        info = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome",
        )

        assert info.device == DeviceType.WEB

    @pytest.mark.asyncio
    async def test_on_connect_callback(self, mock_redis, test_settings, mock_websocket):
        """Test connect callback is called."""
        callback_called = []

        async def on_connect(info):
            callback_called.append(info)

        manager = ConnectionManager(mock_redis, test_settings)
        await manager.start()
        manager.on_connect(on_connect)

        await manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
        )

        assert len(callback_called) == 1
        assert callback_called[0].learner_id == "learner_123"

        await manager.stop()

    @pytest.mark.asyncio
    async def test_on_disconnect_callback(self, mock_redis, test_settings, mock_websocket):
        """Test disconnect callback is called."""
        callback_called = []

        async def on_disconnect(info, reason):
            callback_called.append((info, reason))

        manager = ConnectionManager(mock_redis, test_settings)
        await manager.start()
        manager.on_disconnect(on_disconnect)

        info = await manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
        )

        await manager.disconnect(info.connection_id, reason="test")

        assert len(callback_called) == 1
        assert callback_called[0][0].learner_id == "learner_123"
        assert callback_called[0][1] == "test"

        await manager.stop()

    @pytest.mark.asyncio
    async def test_get_active_connection_count(self, connection_manager, mock_websocket):
        """Test getting active connection count."""
        assert connection_manager.get_active_connection_count() == 0

        await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
        )

        assert connection_manager.get_active_connection_count() == 1
