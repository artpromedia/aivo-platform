"""
Realtime Service - Python WebSocket Manager

Production-ready WebSocket infrastructure for real-time learning feedback.

Features:
- Connection management with heartbeat monitoring
- Room-based messaging and broadcasting
- Cognitive state updates and interventions
- Prometheus metrics for observability
- Redis-backed distributed state
"""

import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Optional

import redis.asyncio as redis
import structlog
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from app.config import Settings, get_settings
from app.handlers import MessageHandler
from app.manager import ConnectionManager
from app.metrics import WebSocketMetrics, get_metrics, init_metrics
from app.models import MessageType, WebSocketMessage
from app.rooms import RoomManager
from app.routers import health

logger = structlog.get_logger()

# Global instances
_redis_client: Optional[redis.Redis] = None
_connection_manager: Optional[ConnectionManager] = None
_room_manager: Optional[RoomManager] = None
_message_handler: Optional[MessageHandler] = None
_metrics: Optional[WebSocketMetrics] = None


async def get_redis_client(settings: Settings) -> redis.Redis:
    """Create and return a Redis client."""
    return redis.from_url(
        settings.redis_url_str,
        encoding="utf-8",
        decode_responses=False,
        max_connections=settings.redis_max_connections,
        socket_connect_timeout=settings.redis_connection_timeout,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup and shutdown of:
    - Redis connections
    - Connection manager
    - Room manager
    - Metrics collection
    """
    global _redis_client, _connection_manager, _room_manager, _message_handler, _metrics

    settings = get_settings()

    logger.info(
        "Starting Realtime Service",
        service=settings.service_name,
        version=settings.service_version,
        environment=settings.environment,
    )

    # Initialize Redis
    _redis_client = await get_redis_client(settings)

    try:
        await _redis_client.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.error("Failed to connect to Redis", error=str(e))
        raise

    # Initialize metrics
    _metrics = init_metrics(settings)

    # Initialize managers
    _connection_manager = ConnectionManager(_redis_client, settings)
    _room_manager = RoomManager(_redis_client, settings)
    _message_handler = MessageHandler(
        manager=_connection_manager,
        room_manager=_room_manager,
        settings=settings,
    )

    # Start connection manager background tasks
    await _connection_manager.start()

    # Store instances in app state
    app.state.redis = _redis_client
    app.state.connection_manager = _connection_manager
    app.state.room_manager = _room_manager
    app.state.message_handler = _message_handler
    app.state.metrics = _metrics
    app.state.settings = settings

    logger.info(
        "Realtime Service started",
        ws_path=settings.ws_path,
        heartbeat_interval=settings.heartbeat_interval,
    )

    yield

    # Shutdown
    logger.info("Shutting down Realtime Service")

    # Stop connection manager
    if _connection_manager:
        await _connection_manager.stop()

    # Close Redis
    if _redis_client:
        await _redis_client.close()

    logger.info("Realtime Service shutdown complete")


def create_app(settings: Optional[Settings] = None) -> FastAPI:
    """
    Create and configure the FastAPI application.

    Args:
        settings: Optional settings override

    Returns:
        Configured FastAPI application
    """
    settings = settings or get_settings()

    app = FastAPI(
        title="Realtime Service - Python WebSocket Manager",
        description="Real-time WebSocket infrastructure for learning feedback",
        version=settings.service_version,
        lifespan=lifespan,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount Prometheus metrics endpoint
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)

    # Include routers
    app.include_router(health.router, tags=["Health"])

    # WebSocket endpoint
    @app.websocket("/ws/{learner_id}")
    async def websocket_endpoint(websocket: WebSocket, learner_id: str):
        """
        Main WebSocket endpoint for learner connections.

        Args:
            websocket: The WebSocket connection
            learner_id: ID of the connecting learner
        """
        connection_manager: ConnectionManager = app.state.connection_manager
        message_handler: MessageHandler = app.state.message_handler
        metrics: WebSocketMetrics = app.state.metrics

        # Extract connection metadata
        user_agent = websocket.headers.get("user-agent")
        forwarded_for = websocket.headers.get("x-forwarded-for")
        ip_address = forwarded_for.split(",")[0].strip() if forwarded_for else websocket.client.host if websocket.client else None

        connection_info = None
        connect_time = datetime.utcnow()

        try:
            # Connect and register
            connection_info = await connection_manager.connect(
                websocket=websocket,
                learner_id=learner_id,
                user_agent=user_agent,
                ip_address=ip_address,
            )

            # Record metrics
            metrics.record_connect(
                device=connection_info.device.value,
                tenant_id=connection_info.tenant_id,
            )

            logger.info(
                "WebSocket connected",
                connection_id=connection_info.connection_id,
                learner_id=learner_id,
            )

            # Message loop
            while True:
                try:
                    # Receive message
                    data = await websocket.receive_json()
                    receive_time = datetime.utcnow()

                    # Parse message
                    try:
                        message = WebSocketMessage(**data)
                    except Exception as e:
                        logger.warning(
                            "Invalid message format",
                            error=str(e),
                            connection_id=connection_info.connection_id,
                        )
                        metrics.record_error("invalid_message")
                        await websocket.send_json({
                            "type": "error",
                            "payload": {
                                "code": "INVALID_MESSAGE",
                                "message": "Invalid message format",
                            },
                        })
                        continue

                    # Record message metrics
                    metrics.record_message_received(
                        msg_type=message.type.value,
                        size_bytes=len(json.dumps(data)),
                    )

                    # Handle message
                    await message_handler.handle(
                        connection_info.connection_id,
                        message,
                    )

                    # Record processing latency
                    latency = (datetime.utcnow() - receive_time).total_seconds()
                    metrics.record_message_received(
                        msg_type=message.type.value,
                        latency_seconds=latency,
                    )

                except WebSocketDisconnect:
                    raise
                except json.JSONDecodeError:
                    logger.warning(
                        "Invalid JSON received",
                        connection_id=connection_info.connection_id,
                    )
                    metrics.record_error("json_decode_error")
                except Exception as e:
                    logger.error(
                        "Message processing error",
                        error=str(e),
                        connection_id=connection_info.connection_id,
                    )
                    metrics.record_error("message_processing_error")

        except WebSocketDisconnect:
            logger.info(
                "WebSocket disconnected",
                connection_id=connection_info.connection_id if connection_info else "unknown",
                learner_id=learner_id,
            )
        except Exception as e:
            logger.error(
                "WebSocket error",
                error=str(e),
                learner_id=learner_id,
            )
            metrics.record_error("websocket_error")
        finally:
            # Cleanup
            if connection_info:
                await connection_manager.disconnect(
                    connection_info.connection_id,
                    reason="client_disconnect",
                )

                # Record disconnect metrics
                duration = (datetime.utcnow() - connect_time).total_seconds()
                metrics.record_disconnect(
                    device=connection_info.device.value,
                    tenant_id=connection_info.tenant_id,
                    duration_seconds=duration,
                )

    # Alternative WebSocket endpoint with session
    @app.websocket("/ws/{learner_id}/session/{session_id}")
    async def websocket_session_endpoint(
        websocket: WebSocket,
        learner_id: str,
        session_id: str,
    ):
        """
        WebSocket endpoint for learner connections with session context.

        Args:
            websocket: The WebSocket connection
            learner_id: ID of the connecting learner
            session_id: ID of the learning session
        """
        connection_manager: ConnectionManager = app.state.connection_manager
        message_handler: MessageHandler = app.state.message_handler
        metrics: WebSocketMetrics = app.state.metrics

        user_agent = websocket.headers.get("user-agent")
        ip_address = websocket.client.host if websocket.client else None

        connection_info = None
        connect_time = datetime.utcnow()

        try:
            connection_info = await connection_manager.connect(
                websocket=websocket,
                learner_id=learner_id,
                user_agent=user_agent,
                ip_address=ip_address,
            )

            # Set session ID
            connection_info.session_id = session_id

            metrics.record_connect(
                device=connection_info.device.value,
                tenant_id=connection_info.tenant_id,
            )

            # Auto-join session room
            room_id = f"session:{session_id}"
            await connection_manager.join_room(connection_info.connection_id, room_id)

            logger.info(
                "WebSocket connected with session",
                connection_id=connection_info.connection_id,
                learner_id=learner_id,
                session_id=session_id,
            )

            # Message loop (same as above)
            while True:
                try:
                    data = await websocket.receive_json()

                    try:
                        message = WebSocketMessage(**data)
                    except Exception:
                        await websocket.send_json({
                            "type": "error",
                            "payload": {"code": "INVALID_MESSAGE", "message": "Invalid message format"},
                        })
                        continue

                    metrics.record_message_received(msg_type=message.type.value)
                    await message_handler.handle(connection_info.connection_id, message)

                except WebSocketDisconnect:
                    raise
                except Exception as e:
                    logger.error("Message error", error=str(e))

        except WebSocketDisconnect:
            pass
        finally:
            if connection_info:
                await connection_manager.disconnect(
                    connection_info.connection_id,
                    reason="client_disconnect",
                )
                duration = (datetime.utcnow() - connect_time).total_seconds()
                metrics.record_disconnect(
                    device=connection_info.device.value,
                    duration_seconds=duration,
                )

    return app


# Create the application instance
app = create_app()


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
