"""
Realtime Service - Python WebSocket Manager

Production-ready WebSocket infrastructure for real-time learning feedback with:
- Connection management with heartbeat monitoring
- Room-based messaging and broadcasting
- Cognitive state updates and interventions
- Prometheus metrics for observability
- Redis-backed distributed state
"""

from app.config import Settings, get_settings
from app.manager import ConnectionManager
from app.handlers import MessageHandler
from app.rooms import RoomManager
from app.metrics import WebSocketMetrics
from app.models import (
    MessageType,
    WebSocketMessage,
    ConnectionInfo,
    RoomInfo,
    CognitiveState,
    Intervention,
    LearnerAction,
)

__version__ = "1.0.0"
__all__ = [
    "Settings",
    "get_settings",
    "ConnectionManager",
    "MessageHandler",
    "RoomManager",
    "WebSocketMetrics",
    "MessageType",
    "WebSocketMessage",
    "ConnectionInfo",
    "RoomInfo",
    "CognitiveState",
    "Intervention",
    "LearnerAction",
]
