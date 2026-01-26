"""
Pytest fixtures for WebSocket manager tests.
"""

import asyncio
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.config import Settings
from app.main import create_app


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_settings() -> Settings:
    """Create test settings."""
    return Settings(
        service_name="realtime-svc-test",
        environment="development",
        debug=True,
        redis_url="redis://localhost:6379/0",
        heartbeat_interval=5,
        heartbeat_timeout=15,
        auth_required=False,
    )


@pytest.fixture
def mock_redis() -> AsyncMock:
    """Create a mock Redis client."""
    mock = AsyncMock()
    mock.ping.return_value = True
    mock.get.return_value = None
    mock.set.return_value = True
    mock.setex.return_value = True
    mock.delete.return_value = 1
    mock.sadd.return_value = 1
    mock.srem.return_value = 1
    mock.smembers.return_value = set()
    mock.hset.return_value = 1
    mock.hget.return_value = None
    mock.hgetall.return_value = {}
    mock.hdel.return_value = 1
    mock.hlen.return_value = 0
    mock.hexists.return_value = False
    mock.lpush.return_value = 1
    mock.lrange.return_value = []
    mock.ltrim.return_value = True
    mock.expire.return_value = True
    mock.close.return_value = None
    return mock


@pytest.fixture
def mock_websocket() -> MagicMock:
    """Create a mock WebSocket."""
    mock = MagicMock()
    mock.accept = AsyncMock()
    mock.send_json = AsyncMock()
    mock.receive_json = AsyncMock()
    mock.close = AsyncMock()
    mock.client = MagicMock()
    mock.client.host = "127.0.0.1"
    mock.headers = {"user-agent": "test-client"}
    return mock


@pytest_asyncio.fixture
async def connection_manager(mock_redis, test_settings):
    """Create a ConnectionManager with mock Redis."""
    from app.manager import ConnectionManager

    manager = ConnectionManager(mock_redis, test_settings)
    await manager.start()
    yield manager
    await manager.stop()


@pytest_asyncio.fixture
async def room_manager(mock_redis, test_settings):
    """Create a RoomManager with mock Redis."""
    from app.rooms import RoomManager

    return RoomManager(mock_redis, test_settings)


@pytest_asyncio.fixture
async def message_handler(connection_manager, room_manager, test_settings):
    """Create a MessageHandler."""
    from app.handlers import MessageHandler

    return MessageHandler(
        manager=connection_manager,
        room_manager=room_manager,
        settings=test_settings,
    )
