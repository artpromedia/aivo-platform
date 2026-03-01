"""
Redis-backed store for hot data: experience buffer, active sessions.

Falls back to in-memory dicts when Redis is unavailable so the service
stays runnable in local-dev without infrastructure.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Redis is optional — the service works in-memory when it is missing.
try:
    import redis.asyncio as aioredis  # redis-py ≥5 async support
except ImportError:
    aioredis = None  # type: ignore[assignment]

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
SESSION_TTL = int(os.getenv("RL_SESSION_TTL", str(2 * 3600)))  # 2 h default
BUFFER_KEY = "rl:experience_buffer"
SESSION_PREFIX = "rl:session:"


class RedisStore:
    """Thin async wrapper around Redis for hot RL data."""

    def __init__(self) -> None:
        self._pool: Any = None
        self._available = False

    # ── lifecycle ────────────────────────────────────────────────────────

    async def connect(self) -> bool:
        """Try to establish a Redis connection pool; return *False* on failure."""
        if aioredis is None:
            logger.warning("redis package not installed — using in-memory fallback")
            return False
        try:
            self._pool = aioredis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=3,
            )
            await self._pool.ping()
            self._available = True
            logger.info("Redis connected (%s)", REDIS_URL)
            return True
        except Exception as exc:
            logger.warning("Redis unavailable (%s), in-memory fallback: %s", REDIS_URL, exc)
            self._pool = None
            self._available = False
            return False

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()

    @property
    def available(self) -> bool:
        return self._available

    # ── experience buffer ────────────────────────────────────────────────

    async def push_experiences(self, experiences: List[Dict]) -> int:
        """Append experiences to the hot list in Redis. Returns new length."""
        if not self._available:
            return 0
        pipe = self._pool.pipeline()
        for exp in experiences:
            pipe.rpush(BUFFER_KEY, json.dumps(exp, default=str))
        results = await pipe.execute()
        return int(results[-1]) if results else 0

    async def pop_experiences(self, count: int) -> List[Dict]:
        """Pop *count* oldest experiences (FIFO). Used to flush to cold store."""
        if not self._available:
            return []
        pipe = self._pool.pipeline()
        for _ in range(count):
            pipe.lpop(BUFFER_KEY)
        results = await pipe.execute()
        return [json.loads(r) for r in results if r is not None]

    async def get_all_experiences(self) -> List[Dict]:
        """Return entire hot buffer (used on startup to rehydrate)."""
        if not self._available:
            return []
        raw = await self._pool.lrange(BUFFER_KEY, 0, -1)
        return [json.loads(r) for r in raw]

    async def experience_count(self) -> int:
        if not self._available:
            return 0
        return await self._pool.llen(BUFFER_KEY)

    # ── session store ────────────────────────────────────────────────────

    async def save_session(self, session_id: str, data: Dict) -> None:
        if not self._available:
            return
        key = f"{SESSION_PREFIX}{session_id}"
        await self._pool.set(key, json.dumps(data, default=str), ex=SESSION_TTL)

    async def load_session(self, session_id: str) -> Optional[Dict]:
        if not self._available:
            return None
        key = f"{SESSION_PREFIX}{session_id}"
        raw = await self._pool.get(key)
        return json.loads(raw) if raw else None

    async def delete_session(self, session_id: str) -> None:
        if not self._available:
            return
        await self._pool.delete(f"{SESSION_PREFIX}{session_id}")

    async def list_session_ids(self) -> List[str]:
        if not self._available:
            return []
        keys = await self._pool.keys(f"{SESSION_PREFIX}*")
        prefix_len = len(SESSION_PREFIX)
        return [k[prefix_len:] for k in keys]
