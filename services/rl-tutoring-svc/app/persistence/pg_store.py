"""
PostgreSQL cold storage for experiences older than 24 h and safety audit log.

Uses raw asyncpg when available, falls back to no-op.
"""

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

try:
    import asyncpg  # type: ignore[import-untyped]
except ImportError:
    asyncpg = None  # type: ignore[assignment]

DATABASE_URL = os.getenv(
    "RL_DATABASE_URL",
    os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/aivo_rl_tutoring"),
)

# SQL table definitions -------------------------------------------------------

_INIT_SQL = """
CREATE TABLE IF NOT EXISTS rl_experiences (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    data        JSONB       NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rl_exp_created ON rl_experiences (created_at);

CREATE TABLE IF NOT EXISTS rl_safety_audit (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    student_id  TEXT        NOT NULL,
    session_id  TEXT,
    data        JSONB       NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rl_audit_student ON rl_safety_audit (student_id, created_at);

CREATE TABLE IF NOT EXISTS rl_policy_checkpoints (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    training_steps INT      NOT NULL,
    data        JSONB       NOT NULL
);
"""


class PgStore:
    """Async PostgreSQL store for cold RL data."""

    def __init__(self) -> None:
        self._pool: Any = None
        self._available = False

    # ── lifecycle ────────────────────────────────────────────────────────

    async def connect(self) -> bool:
        if asyncpg is None:
            logger.warning("asyncpg not installed — cold storage disabled")
            return False
        try:
            self._pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5, timeout=5)
            async with self._pool.acquire() as conn:
                await conn.execute(_INIT_SQL)
            self._available = True
            logger.info("PostgreSQL cold store connected")
            return True
        except Exception as exc:
            logger.warning("PostgreSQL unavailable, cold storage disabled: %s", exc)
            self._pool = None
            self._available = False
            return False

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()

    @property
    def available(self) -> bool:
        return self._available

    # ── experiences (cold) ───────────────────────────────────────────────

    async def store_experiences(self, experiences: List[Dict]) -> int:
        """Bulk-insert experiences into cold storage. Returns rows inserted."""
        if not self._available or not experiences:
            return 0
        async with self._pool.acquire() as conn:
            values = [(json.dumps(e, default=str),) for e in experiences]
            await conn.executemany(
                "INSERT INTO rl_experiences (data) VALUES ($1)",
                values,
            )
        return len(experiences)

    async def load_experiences_since(
        self, since: Optional[datetime] = None, limit: int = 5000
    ) -> List[Dict]:
        """Load cold experiences (e.g. for warm-start rehydration)."""
        if not self._available:
            return []
        since = since or (datetime.now(timezone.utc) - timedelta(days=7))
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT data FROM rl_experiences WHERE created_at >= $1 ORDER BY created_at ASC LIMIT $2",
                since,
                limit,
            )
        return [json.loads(r["data"]) for r in rows]

    async def prune_experiences(self, older_than_days: int = 30) -> int:
        """Delete experiences older than N days."""
        if not self._available:
            return 0
        cutoff = datetime.now(timezone.utc) - timedelta(days=older_than_days)
        async with self._pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM rl_experiences WHERE created_at < $1",
                cutoff,
            )
        # asyncpg returns 'DELETE N'
        return int(result.split()[-1])

    # ── safety audit ─────────────────────────────────────────────────────

    async def store_audit_entries(self, entries: List[Dict]) -> int:
        if not self._available or not entries:
            return 0
        async with self._pool.acquire() as conn:
            values = [
                (e.get("student_id", ""), e.get("session_id"), json.dumps(e, default=str))
                for e in entries
            ]
            await conn.executemany(
                "INSERT INTO rl_safety_audit (student_id, session_id, data) VALUES ($1, $2, $3)",
                values,
            )
        return len(entries)

    async def get_audit_entries(
        self, student_id: Optional[str] = None, limit: int = 100
    ) -> List[Dict]:
        if not self._available:
            return []
        async with self._pool.acquire() as conn:
            if student_id:
                rows = await conn.fetch(
                    "SELECT data FROM rl_safety_audit WHERE student_id=$1 ORDER BY created_at DESC LIMIT $2",
                    student_id,
                    limit,
                )
            else:
                rows = await conn.fetch(
                    "SELECT data FROM rl_safety_audit ORDER BY created_at DESC LIMIT $1",
                    limit,
                )
        return [json.loads(r["data"]) for r in rows]

    # ── policy checkpoints ───────────────────────────────────────────────

    async def save_checkpoint(self, training_steps: int, data: Dict) -> None:
        if not self._available:
            return
        async with self._pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO rl_policy_checkpoints (training_steps, data) VALUES ($1, $2)",
                training_steps,
                json.dumps(data, default=str),
            )
        logger.info("Checkpoint saved at step %d", training_steps)

    async def load_latest_checkpoint(self) -> Optional[Dict]:
        if not self._available:
            return None
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT data FROM rl_policy_checkpoints ORDER BY training_steps DESC LIMIT 1"
            )
        if row is None:
            return None
        return json.loads(row["data"])
