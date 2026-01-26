"""
Connection Manager

Manages WebSocket connections with heartbeat monitoring, Redis-backed state,
and support for distributed deployments.
"""

import asyncio
import json
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Set

import redis.asyncio as redis
import structlog
from fastapi import WebSocket, WebSocketDisconnect

from app.config import Settings, get_settings
from app.models import (
    ConnectionInfo,
    DeviceType,
    MessageType,
    UserStatus,
    WebSocketMessage,
    generate_connection_id,
)

logger = structlog.get_logger()


class ConnectionManager:
    """
    Manages WebSocket connections with heartbeat monitoring and Redis-backed state.

    Features:
    - Connection tracking with metadata
    - Heartbeat monitoring for stale connection detection
    - Room-based messaging
    - Redis-backed state for distributed deployments
    - Graceful disconnect handling
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        settings: Optional[Settings] = None,
    ):
        """
        Initialize the connection manager.

        Args:
            redis_client: Async Redis client for distributed state
            settings: Application settings
        """
        self.settings = settings or get_settings()
        self.redis = redis_client

        # Local connection tracking (websocket objects can't be serialized to Redis)
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_info: Dict[str, ConnectionInfo] = {}

        # Heartbeat configuration
        self.heartbeat_interval = self.settings.heartbeat_interval
        self.heartbeat_timeout = self.settings.heartbeat_timeout

        # Background tasks
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._running = False

        # Event callbacks
        self._on_connect_callbacks: List[Callable] = []
        self._on_disconnect_callbacks: List[Callable] = []

        logger.info(
            "ConnectionManager initialized",
            heartbeat_interval=self.heartbeat_interval,
            heartbeat_timeout=self.heartbeat_timeout,
        )

    async def start(self) -> None:
        """Start background tasks."""
        self._running = True
        self._heartbeat_task = asyncio.create_task(self._heartbeat_monitor())
        logger.info("ConnectionManager started")

    async def stop(self) -> None:
        """Stop background tasks and cleanup."""
        self._running = False

        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass

        # Disconnect all connections
        connection_ids = list(self.active_connections.keys())
        for conn_id in connection_ids:
            await self.disconnect(conn_id, reason="server_shutdown")

        logger.info("ConnectionManager stopped")

    async def connect(
        self,
        websocket: WebSocket,
        learner_id: str,
        connection_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> ConnectionInfo:
        """
        Accept and register a new WebSocket connection.

        Args:
            websocket: The WebSocket connection
            learner_id: ID of the learner
            connection_id: Optional custom connection ID
            tenant_id: Optional tenant ID for multi-tenancy
            user_agent: Client user agent string
            ip_address: Client IP address

        Returns:
            ConnectionInfo with connection details
        """
        # Accept the WebSocket connection
        await websocket.accept()

        # Generate connection ID if not provided
        if not connection_id:
            connection_id = generate_connection_id()

        # Detect device type from user agent
        device = self._detect_device(user_agent)

        # Create connection info
        now = datetime.utcnow()
        info = ConnectionInfo(
            connection_id=connection_id,
            learner_id=learner_id,
            tenant_id=tenant_id,
            connected_at=now,
            last_heartbeat=now,
            last_activity=now,
            user_agent=user_agent,
            ip_address=ip_address,
            device=device,
            status=UserStatus.ONLINE,
        )

        # Store connection locally
        self.active_connections[connection_id] = websocket
        self.connection_info[connection_id] = info

        # Store in Redis for distributed access
        await self._store_connection_redis(info)

        # Track learner's connections
        await self._add_learner_connection(learner_id, connection_id)

        logger.info(
            "Connection established",
            connection_id=connection_id,
            learner_id=learner_id,
            device=device.value,
        )

        # Trigger connect callbacks
        for callback in self._on_connect_callbacks:
            try:
                await callback(info)
            except Exception as e:
                logger.error("Connect callback error", error=str(e))

        return info

    async def disconnect(
        self,
        connection_id: str,
        reason: str = "client_disconnect",
    ) -> None:
        """
        Handle connection disconnect.

        Args:
            connection_id: ID of the connection to disconnect
            reason: Reason for disconnection
        """
        info = self.connection_info.get(connection_id)
        if not info:
            return

        # Leave all rooms
        for room_id in list(info.rooms):
            await self.leave_room(connection_id, room_id)

        # Remove from local tracking
        self.active_connections.pop(connection_id, None)
        self.connection_info.pop(connection_id, None)

        # Remove from Redis
        await self._remove_connection_redis(connection_id)

        # Remove from learner's connections
        await self._remove_learner_connection(info.learner_id, connection_id)

        logger.info(
            "Connection disconnected",
            connection_id=connection_id,
            learner_id=info.learner_id,
            reason=reason,
        )

        # Trigger disconnect callbacks
        for callback in self._on_disconnect_callbacks:
            try:
                await callback(info, reason)
            except Exception as e:
                logger.error("Disconnect callback error", error=str(e))

    async def send_personal(
        self,
        connection_id: str,
        message: WebSocketMessage,
    ) -> bool:
        """
        Send a message to a specific connection.

        Args:
            connection_id: Target connection ID
            message: Message to send

        Returns:
            True if sent successfully, False otherwise
        """
        websocket = self.active_connections.get(connection_id)
        if not websocket:
            return False

        try:
            await websocket.send_json(message.model_dump(mode="json"))
            self._update_activity(connection_id)
            return True
        except WebSocketDisconnect:
            await self.disconnect(connection_id, reason="send_failed")
            return False
        except Exception as e:
            logger.error(
                "Send personal failed",
                connection_id=connection_id,
                error=str(e),
            )
            return False

    async def send_to_learner(
        self,
        learner_id: str,
        message: WebSocketMessage,
    ) -> int:
        """
        Send a message to all connections for a learner.

        Args:
            learner_id: Target learner ID
            message: Message to send

        Returns:
            Number of connections that received the message
        """
        sent_count = 0

        # Get learner's connection IDs from Redis
        connection_ids = await self._get_learner_connections(learner_id)

        for conn_id in connection_ids:
            if await self.send_personal(conn_id, message):
                sent_count += 1

        return sent_count

    async def broadcast_to_room(
        self,
        room_id: str,
        message: WebSocketMessage,
        exclude: Optional[List[str]] = None,
    ) -> int:
        """
        Broadcast a message to all connections in a room.

        Args:
            room_id: Target room ID
            message: Message to broadcast
            exclude: Connection IDs to exclude

        Returns:
            Number of connections that received the message
        """
        exclude = exclude or []
        sent_count = 0

        # Get room connections from Redis
        connection_ids = await self._get_room_connections(room_id)

        for conn_id in connection_ids:
            if conn_id not in exclude:
                if await self.send_personal(conn_id, message):
                    sent_count += 1

        return sent_count

    async def broadcast_all(
        self,
        message: WebSocketMessage,
        exclude: Optional[List[str]] = None,
    ) -> int:
        """
        Broadcast a message to all connections.

        Args:
            message: Message to broadcast
            exclude: Connection IDs to exclude

        Returns:
            Number of connections that received the message
        """
        exclude = exclude or []
        sent_count = 0

        for conn_id in list(self.active_connections.keys()):
            if conn_id not in exclude:
                if await self.send_personal(conn_id, message):
                    sent_count += 1

        return sent_count

    async def join_room(
        self,
        connection_id: str,
        room_id: str,
    ) -> bool:
        """
        Add a connection to a room.

        Args:
            connection_id: Connection to add
            room_id: Room to join

        Returns:
            True if joined successfully
        """
        info = self.connection_info.get(connection_id)
        if not info:
            return False

        if room_id not in info.rooms:
            info.rooms.append(room_id)

        # Add to Redis room set
        key = f"{self.settings.redis_key_prefix}room:{room_id}:connections"
        await self.redis.sadd(key, connection_id)
        await self.redis.expire(key, self.settings.room_ttl)

        logger.debug(
            "Connection joined room",
            connection_id=connection_id,
            room_id=room_id,
        )

        return True

    async def leave_room(
        self,
        connection_id: str,
        room_id: str,
    ) -> bool:
        """
        Remove a connection from a room.

        Args:
            connection_id: Connection to remove
            room_id: Room to leave

        Returns:
            True if left successfully
        """
        info = self.connection_info.get(connection_id)
        if info and room_id in info.rooms:
            info.rooms.remove(room_id)

        # Remove from Redis room set
        key = f"{self.settings.redis_key_prefix}room:{room_id}:connections"
        await self.redis.srem(key, connection_id)

        logger.debug(
            "Connection left room",
            connection_id=connection_id,
            room_id=room_id,
        )

        return True

    def update_heartbeat(self, connection_id: str) -> bool:
        """
        Update the last heartbeat time for a connection.

        Args:
            connection_id: Connection to update

        Returns:
            True if updated successfully
        """
        info = self.connection_info.get(connection_id)
        if info:
            info.last_heartbeat = datetime.utcnow()
            return True
        return False

    def get_connection(self, connection_id: str) -> Optional[ConnectionInfo]:
        """Get connection info by ID."""
        return self.connection_info.get(connection_id)

    def get_connections_by_learner(self, learner_id: str) -> List[ConnectionInfo]:
        """Get all connections for a learner."""
        return [
            info
            for info in self.connection_info.values()
            if info.learner_id == learner_id
        ]

    def get_active_connection_count(self) -> int:
        """Get total number of active connections."""
        return len(self.active_connections)

    def get_all_connection_ids(self) -> List[str]:
        """Get all active connection IDs."""
        return list(self.active_connections.keys())

    def on_connect(self, callback: Callable) -> None:
        """Register a callback for connection events."""
        self._on_connect_callbacks.append(callback)

    def on_disconnect(self, callback: Callable) -> None:
        """Register a callback for disconnect events."""
        self._on_disconnect_callbacks.append(callback)

    # =========================================================================
    # PRIVATE METHODS
    # =========================================================================

    def _detect_device(self, user_agent: Optional[str]) -> DeviceType:
        """Detect device type from user agent string."""
        if not user_agent:
            return DeviceType.WEB

        user_agent_lower = user_agent.lower()

        if "mobile" in user_agent_lower or "android" in user_agent_lower:
            if "tablet" in user_agent_lower or "ipad" in user_agent_lower:
                return DeviceType.TABLET
            return DeviceType.MOBILE

        if "tablet" in user_agent_lower or "ipad" in user_agent_lower:
            return DeviceType.TABLET

        return DeviceType.WEB

    def _update_activity(self, connection_id: str) -> None:
        """Update last activity time for a connection."""
        info = self.connection_info.get(connection_id)
        if info:
            info.last_activity = datetime.utcnow()

    async def _heartbeat_monitor(self) -> None:
        """Background task to monitor heartbeats and disconnect stale connections."""
        while self._running:
            try:
                await asyncio.sleep(self.settings.heartbeat_check_interval)

                now = datetime.utcnow()
                stale_connections: List[str] = []

                for conn_id, info in self.connection_info.items():
                    elapsed = (now - info.last_heartbeat).total_seconds()
                    if elapsed > self.heartbeat_timeout:
                        stale_connections.append(conn_id)

                # Disconnect stale connections
                for conn_id in stale_connections:
                    logger.warning(
                        "Disconnecting stale connection",
                        connection_id=conn_id,
                    )
                    await self.disconnect(conn_id, reason="heartbeat_timeout")

                if stale_connections:
                    logger.info(
                        "Heartbeat check completed",
                        stale_count=len(stale_connections),
                        active_count=len(self.active_connections),
                    )

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Heartbeat monitor error", error=str(e))

    async def _store_connection_redis(self, info: ConnectionInfo) -> None:
        """Store connection info in Redis."""
        key = f"{self.settings.redis_key_prefix}conn:{info.connection_id}"
        data = info.model_dump(mode="json")
        await self.redis.setex(
            key,
            self.settings.connection_ttl,
            json.dumps(data),
        )

    async def _remove_connection_redis(self, connection_id: str) -> None:
        """Remove connection info from Redis."""
        key = f"{self.settings.redis_key_prefix}conn:{connection_id}"
        await self.redis.delete(key)

    async def _add_learner_connection(
        self,
        learner_id: str,
        connection_id: str,
    ) -> None:
        """Add connection to learner's connection set in Redis."""
        key = f"{self.settings.redis_key_prefix}learner:{learner_id}:connections"
        await self.redis.sadd(key, connection_id)
        await self.redis.expire(key, self.settings.connection_ttl)

    async def _remove_learner_connection(
        self,
        learner_id: str,
        connection_id: str,
    ) -> None:
        """Remove connection from learner's connection set in Redis."""
        key = f"{self.settings.redis_key_prefix}learner:{learner_id}:connections"
        await self.redis.srem(key, connection_id)

    async def _get_learner_connections(self, learner_id: str) -> Set[str]:
        """Get all connection IDs for a learner from Redis."""
        key = f"{self.settings.redis_key_prefix}learner:{learner_id}:connections"
        members = await self.redis.smembers(key)
        return {m.decode() if isinstance(m, bytes) else m for m in members}

    async def _get_room_connections(self, room_id: str) -> Set[str]:
        """Get all connection IDs in a room from Redis."""
        key = f"{self.settings.redis_key_prefix}room:{room_id}:connections"
        members = await self.redis.smembers(key)
        return {m.decode() if isinstance(m, bytes) else m for m in members}
