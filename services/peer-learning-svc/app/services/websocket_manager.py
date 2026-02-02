"""
WebSocket Manager

Real-time communication for collaborative learning sessions.
Handles presence, messaging, and collaborative editing signals.
"""
import asyncio
import json
import logging
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Set, Any, Callable

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class MessageType(str, Enum):
    """Types of WebSocket messages."""
    # Connection
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    PING = "ping"
    PONG = "pong"
    ERROR = "error"
    
    # Session
    JOIN_SESSION = "join_session"
    LEAVE_SESSION = "leave_session"
    SESSION_UPDATE = "session_update"
    
    # Presence
    PRESENCE_UPDATE = "presence_update"
    TYPING_START = "typing_start"
    TYPING_STOP = "typing_stop"
    PARTICIPANTS_LIST = "participants_list"
    
    # Chat
    CHAT_MESSAGE = "chat_message"
    MESSAGE_DELIVERED = "message_delivered"
    MESSAGE_READ = "message_read"
    
    # Collaboration
    CURSOR_MOVE = "cursor_move"
    SELECTION_CHANGE = "selection_change"
    CONTENT_EDIT = "content_edit"
    RESOURCE_UPDATE = "resource_update"
    
    # Notifications
    NOTIFICATION = "notification"
    SESSION_ENDING = "session_ending"
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"


@dataclass
class WebSocketMessage:
    """A WebSocket message."""
    type: MessageType
    session_id: Optional[str]
    sender_id: Optional[str]
    data: Dict[str, Any]
    timestamp: str
    message_id: str = ""
    
    def __post_init__(self):
        if not self.message_id:
            self.message_id = str(uuid.uuid4())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "type": self.type.value if isinstance(self.type, MessageType) else self.type,
            "session_id": self.session_id,
            "sender_id": self.sender_id,
            "data": self.data,
            "timestamp": self.timestamp,
            "message_id": self.message_id,
        }
    
    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WebSocketMessage":
        """Create from dictionary."""
        return cls(
            type=MessageType(data.get("type", "error")),
            session_id=data.get("session_id"),
            sender_id=data.get("sender_id"),
            data=data.get("data", {}),
            timestamp=data.get("timestamp", datetime.now(timezone.utc).isoformat()),
            message_id=data.get("message_id", ""),
        )
    
    @classmethod
    def from_json(cls, json_str: str) -> "WebSocketMessage":
        """Create from JSON string."""
        return cls.from_dict(json.loads(json_str))


@dataclass
class ConnectionInfo:
    """Information about a WebSocket connection."""
    connection_id: str
    user_id: str
    websocket: WebSocket
    connected_at: datetime
    session_ids: Set[str]
    last_ping: datetime
    is_active: bool = True
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class WebSocketManager:
    """
    Manages WebSocket connections for real-time features.
    
    Features:
    - Connection management
    - Session-based message routing
    - Presence tracking
    - Heartbeat/ping-pong
    """
    
    HEARTBEAT_INTERVAL = 30  # seconds
    CONNECTION_TIMEOUT = 60  # seconds
    
    def __init__(self):
        """Initialize WebSocketManager."""
        # user_id -> list of connections (user can have multiple)
        self._user_connections: Dict[str, List[ConnectionInfo]] = {}
        # connection_id -> connection info
        self._connections: Dict[str, ConnectionInfo] = {}
        # session_id -> set of user_ids
        self._session_participants: Dict[str, Set[str]] = {}
        # Message handlers
        self._handlers: Dict[MessageType, List[Callable]] = {}
        logger.info("WebSocketManager initialized")
    
    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ConnectionInfo:
        """
        Accept and register a new WebSocket connection.
        
        Args:
            websocket: The WebSocket connection
            user_id: User's ID
            metadata: Optional connection metadata
        
        Returns:
            ConnectionInfo for the new connection
        """
        await websocket.accept()
        
        connection_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        connection = ConnectionInfo(
            connection_id=connection_id,
            user_id=user_id,
            websocket=websocket,
            connected_at=now,
            session_ids=set(),
            last_ping=now,
            metadata=metadata or {},
        )
        
        self._connections[connection_id] = connection
        
        if user_id not in self._user_connections:
            self._user_connections[user_id] = []
        self._user_connections[user_id].append(connection)
        
        logger.info(
            "WebSocket connected: user=%s, connection=%s",
            user_id, connection_id
        )
        
        # Send connection confirmation
        await self._send_to_connection(connection, WebSocketMessage(
            type=MessageType.CONNECT,
            session_id=None,
            sender_id="system",
            data={"connection_id": connection_id, "user_id": user_id},
            timestamp=now.isoformat(),
        ))
        
        return connection
    
    async def disconnect(self, connection_id: str) -> None:
        """
        Handle WebSocket disconnection.
        
        Args:
            connection_id: ID of the connection to disconnect
        """
        connection = self._connections.get(connection_id)
        if not connection:
            return
        
        connection.is_active = False
        
        # Remove from sessions
        for session_id in list(connection.session_ids):
            await self.leave_session(connection_id, session_id)
        
        # Remove from user connections
        if connection.user_id in self._user_connections:
            self._user_connections[connection.user_id] = [
                c for c in self._user_connections[connection.user_id]
                if c.connection_id != connection_id
            ]
            if not self._user_connections[connection.user_id]:
                del self._user_connections[connection.user_id]
        
        # Remove connection
        del self._connections[connection_id]
        
        logger.info(
            "WebSocket disconnected: user=%s, connection=%s",
            connection.user_id, connection_id
        )
    
    async def join_session(
        self,
        connection_id: str,
        session_id: str,
    ) -> bool:
        """
        Add a connection to a session.
        
        Args:
            connection_id: Connection ID
            session_id: Session ID to join
        
        Returns:
            True if successfully joined
        """
        connection = self._connections.get(connection_id)
        if not connection or not connection.is_active:
            return False
        
        connection.session_ids.add(session_id)
        
        if session_id not in self._session_participants:
            self._session_participants[session_id] = set()
        self._session_participants[session_id].add(connection.user_id)
        
        logger.info(
            "User %s joined session %s via connection %s",
            connection.user_id, session_id, connection_id
        )
        
        # Notify other participants
        await self.broadcast_to_session(
            session_id,
            WebSocketMessage(
                type=MessageType.USER_JOINED,
                session_id=session_id,
                sender_id="system",
                data={"user_id": connection.user_id},
                timestamp=datetime.now(timezone.utc).isoformat(),
            ),
            exclude_user=connection.user_id,
        )
        
        # Send participant list to joining user
        participants = list(self._session_participants.get(session_id, set()))
        await self._send_to_connection(connection, WebSocketMessage(
            type=MessageType.PARTICIPANTS_LIST,
            session_id=session_id,
            sender_id="system",
            data={"participants": participants},
            timestamp=datetime.now(timezone.utc).isoformat(),
        ))
        
        return True
    
    async def leave_session(
        self,
        connection_id: str,
        session_id: str,
    ) -> bool:
        """
        Remove a connection from a session.
        
        Args:
            connection_id: Connection ID
            session_id: Session ID to leave
        
        Returns:
            True if successfully left
        """
        connection = self._connections.get(connection_id)
        if not connection:
            return False
        
        if session_id in connection.session_ids:
            connection.session_ids.remove(session_id)
        
        # Check if user still has other connections to this session
        user_still_in_session = any(
            session_id in c.session_ids
            for c in self._user_connections.get(connection.user_id, [])
            if c.connection_id != connection_id and c.is_active
        )
        
        if not user_still_in_session and session_id in self._session_participants:
            self._session_participants[session_id].discard(connection.user_id)
            
            # Notify other participants
            await self.broadcast_to_session(
                session_id,
                WebSocketMessage(
                    type=MessageType.USER_LEFT,
                    session_id=session_id,
                    sender_id="system",
                    data={"user_id": connection.user_id},
                    timestamp=datetime.now(timezone.utc).isoformat(),
                ),
            )
            
            # Clean up empty sessions
            if not self._session_participants[session_id]:
                del self._session_participants[session_id]
        
        logger.info(
            "User %s left session %s",
            connection.user_id, session_id
        )
        
        return True
    
    async def _send_to_connection(
        self,
        connection: ConnectionInfo,
        message: WebSocketMessage,
    ) -> bool:
        """Send a message to a specific connection."""
        if not connection.is_active:
            return False
        
        try:
            await connection.websocket.send_text(message.to_json())
            return True
        except Exception as e:
            logger.warning(
                "Failed to send message to connection %s: %s",
                connection.connection_id, str(e)
            )
            connection.is_active = False
            return False
    
    async def send_to_user(
        self,
        user_id: str,
        message: WebSocketMessage,
    ) -> int:
        """
        Send a message to all of a user's connections.
        
        Args:
            user_id: User ID
            message: Message to send
        
        Returns:
            Number of connections message was sent to
        """
        connections = self._user_connections.get(user_id, [])
        sent_count = 0
        
        for connection in connections:
            if await self._send_to_connection(connection, message):
                sent_count += 1
        
        return sent_count
    
    async def broadcast_to_session(
        self,
        session_id: str,
        message: WebSocketMessage,
        exclude_user: Optional[str] = None,
    ) -> int:
        """
        Broadcast a message to all participants in a session.
        
        Args:
            session_id: Session ID
            message: Message to broadcast
            exclude_user: Optional user ID to exclude
        
        Returns:
            Number of users message was sent to
        """
        participants = self._session_participants.get(session_id, set())
        sent_count = 0
        
        for user_id in participants:
            if user_id == exclude_user:
                continue
            
            count = await self.send_to_user(user_id, message)
            if count > 0:
                sent_count += 1
        
        return sent_count
    
    async def broadcast_presence(
        self,
        session_id: str,
        user_id: str,
        presence_status: str,
    ) -> None:
        """
        Broadcast presence update to session participants.
        
        Args:
            session_id: Session ID
            user_id: User whose presence changed
            presence_status: New presence status
        """
        await self.broadcast_to_session(
            session_id,
            WebSocketMessage(
                type=MessageType.PRESENCE_UPDATE,
                session_id=session_id,
                sender_id=user_id,
                data={"user_id": user_id, "status": presence_status},
                timestamp=datetime.now(timezone.utc).isoformat(),
            ),
            exclude_user=user_id,
        )
    
    async def broadcast_typing(
        self,
        session_id: str,
        user_id: str,
        is_typing: bool,
    ) -> None:
        """
        Broadcast typing indicator to session participants.
        
        Args:
            session_id: Session ID
            user_id: User who is typing
            is_typing: Whether typing started or stopped
        """
        message_type = MessageType.TYPING_START if is_typing else MessageType.TYPING_STOP
        
        await self.broadcast_to_session(
            session_id,
            WebSocketMessage(
                type=message_type,
                session_id=session_id,
                sender_id=user_id,
                data={"user_id": user_id},
                timestamp=datetime.now(timezone.utc).isoformat(),
            ),
            exclude_user=user_id,
        )
    
    async def broadcast_cursor_position(
        self,
        session_id: str,
        user_id: str,
        resource_id: str,
        position: Dict[str, int],
    ) -> None:
        """
        Broadcast cursor position for collaborative editing.
        
        Args:
            session_id: Session ID
            user_id: User moving cursor
            resource_id: Resource being edited
            position: Cursor position {line, column}
        """
        await self.broadcast_to_session(
            session_id,
            WebSocketMessage(
                type=MessageType.CURSOR_MOVE,
                session_id=session_id,
                sender_id=user_id,
                data={
                    "user_id": user_id,
                    "resource_id": resource_id,
                    "position": position,
                },
                timestamp=datetime.now(timezone.utc).isoformat(),
            ),
            exclude_user=user_id,
        )
    
    async def broadcast_selection(
        self,
        session_id: str,
        user_id: str,
        resource_id: str,
        selection: Dict[str, Any],
    ) -> None:
        """
        Broadcast text selection for collaborative editing.
        
        Args:
            session_id: Session ID
            user_id: User making selection
            resource_id: Resource being edited
            selection: Selection range {start, end}
        """
        await self.broadcast_to_session(
            session_id,
            WebSocketMessage(
                type=MessageType.SELECTION_CHANGE,
                session_id=session_id,
                sender_id=user_id,
                data={
                    "user_id": user_id,
                    "resource_id": resource_id,
                    "selection": selection,
                },
                timestamp=datetime.now(timezone.utc).isoformat(),
            ),
            exclude_user=user_id,
        )
    
    async def broadcast_content_edit(
        self,
        session_id: str,
        user_id: str,
        resource_id: str,
        edit_operation: Dict[str, Any],
    ) -> None:
        """
        Broadcast content edit operation.
        
        Args:
            session_id: Session ID
            user_id: User making edit
            resource_id: Resource being edited
            edit_operation: Edit operation {type, position, content, etc.}
        """
        await self.broadcast_to_session(
            session_id,
            WebSocketMessage(
                type=MessageType.CONTENT_EDIT,
                session_id=session_id,
                sender_id=user_id,
                data={
                    "user_id": user_id,
                    "resource_id": resource_id,
                    "operation": edit_operation,
                },
                timestamp=datetime.now(timezone.utc).isoformat(),
            ),
            exclude_user=user_id,
        )
    
    async def handle_message(
        self,
        connection_id: str,
        raw_message: str,
    ) -> Optional[WebSocketMessage]:
        """
        Handle incoming WebSocket message.
        
        Args:
            connection_id: Connection ID
            raw_message: Raw JSON message string
        
        Returns:
            Response message if any
        """
        connection = self._connections.get(connection_id)
        if not connection:
            return None
        
        try:
            message = WebSocketMessage.from_json(raw_message)
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning("Invalid message from connection %s: %s", connection_id, str(e))
            return WebSocketMessage(
                type=MessageType.ERROR,
                session_id=None,
                sender_id="system",
                data={"error": "Invalid message format"},
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
        
        # Update last ping time
        connection.last_ping = datetime.now(timezone.utc)
        
        # Handle ping
        if message.type == MessageType.PING:
            return WebSocketMessage(
                type=MessageType.PONG,
                session_id=message.session_id,
                sender_id="system",
                data={},
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
        
        # Handle session join
        if message.type == MessageType.JOIN_SESSION:
            session_id = message.data.get("session_id")
            if session_id:
                await self.join_session(connection_id, session_id)
            return None
        
        # Handle session leave
        if message.type == MessageType.LEAVE_SESSION:
            session_id = message.data.get("session_id")
            if session_id:
                await self.leave_session(connection_id, session_id)
            return None
        
        # Handle chat message
        if message.type == MessageType.CHAT_MESSAGE and message.session_id:
            # Broadcast to session
            await self.broadcast_to_session(
                message.session_id,
                message,
                exclude_user=connection.user_id,
            )
            return None
        
        # Handle presence update
        if message.type == MessageType.PRESENCE_UPDATE and message.session_id:
            await self.broadcast_presence(
                message.session_id,
                connection.user_id,
                message.data.get("status", "online"),
            )
            return None
        
        # Handle typing indicators
        if message.type == MessageType.TYPING_START and message.session_id:
            await self.broadcast_typing(message.session_id, connection.user_id, True)
            return None
        
        if message.type == MessageType.TYPING_STOP and message.session_id:
            await self.broadcast_typing(message.session_id, connection.user_id, False)
            return None
        
        # Handle cursor move
        if message.type == MessageType.CURSOR_MOVE and message.session_id:
            await self.broadcast_cursor_position(
                message.session_id,
                connection.user_id,
                message.data.get("resource_id", ""),
                message.data.get("position", {}),
            )
            return None
        
        # Handle selection change
        if message.type == MessageType.SELECTION_CHANGE and message.session_id:
            await self.broadcast_selection(
                message.session_id,
                connection.user_id,
                message.data.get("resource_id", ""),
                message.data.get("selection", {}),
            )
            return None
        
        # Handle content edit
        if message.type == MessageType.CONTENT_EDIT and message.session_id:
            await self.broadcast_content_edit(
                message.session_id,
                connection.user_id,
                message.data.get("resource_id", ""),
                message.data.get("operation", {}),
            )
            return None
        
        # Call registered handlers
        handlers = self._handlers.get(message.type, [])
        for handler in handlers:
            try:
                await handler(connection, message)
            except Exception as e:
                logger.error("Handler error for %s: %s", message.type, str(e))
        
        return None
    
    def register_handler(
        self,
        message_type: MessageType,
        handler: Callable,
    ) -> None:
        """Register a handler for a message type."""
        if message_type not in self._handlers:
            self._handlers[message_type] = []
        self._handlers[message_type].append(handler)
    
    def get_session_participants(self, session_id: str) -> List[str]:
        """Get list of user IDs in a session."""
        return list(self._session_participants.get(session_id, set()))
    
    def get_user_sessions(self, user_id: str) -> List[str]:
        """Get list of session IDs a user is in."""
        connections = self._user_connections.get(user_id, [])
        sessions = set()
        for conn in connections:
            sessions.update(conn.session_ids)
        return list(sessions)
    
    def get_connection_count(self) -> int:
        """Get total number of active connections."""
        return sum(1 for c in self._connections.values() if c.is_active)
    
    def get_session_count(self) -> int:
        """Get number of active sessions."""
        return len(self._session_participants)
    
    async def cleanup_stale_connections(self) -> int:
        """
        Clean up stale connections that haven't pinged recently.
        
        Returns:
            Number of connections cleaned up
        """
        now = datetime.now(timezone.utc)
        stale_ids = []
        
        for conn_id, conn in self._connections.items():
            elapsed = (now - conn.last_ping).total_seconds()
            if elapsed > self.CONNECTION_TIMEOUT:
                stale_ids.append(conn_id)
        
        for conn_id in stale_ids:
            await self.disconnect(conn_id)
        
        if stale_ids:
            logger.info("Cleaned up %d stale connections", len(stale_ids))
        
        return len(stale_ids)


# Singleton instance
ws_manager = WebSocketManager()
