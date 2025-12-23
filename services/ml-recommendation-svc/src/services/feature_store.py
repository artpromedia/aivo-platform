"""
Feature Store - Redis-based feature storage and retrieval.
"""

import json
from typing import Any

import redis.asyncio as redis
import structlog

logger = structlog.get_logger()


class FeatureStore:
    """
    Redis-based feature store for ML models.
    
    Stores and retrieves:
    - Learner feature vectors
    - Item embeddings
    - Bandit arm statistics
    - Collaborative filtering matrices
    """

    def __init__(self, redis_url: str) -> None:
        self.redis_url = redis_url
        self.client: redis.Redis | None = None
        self.prefix = "ml:features:"

    async def connect(self) -> None:
        """Connect to Redis."""
        self.client = redis.from_url(
            self.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        await self.client.ping()
        logger.info("Connected to Redis feature store")

    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self.client:
            await self.client.close()
            logger.info("Disconnected from Redis feature store")

    def _key(self, *parts: str) -> str:
        """Build a Redis key."""
        return self.prefix + ":".join(parts)

    # ─────────────────────────────────────────────────────────────────────────
    # Learner Features
    # ─────────────────────────────────────────────────────────────────────────

    async def get_learner_features(
        self, learner_id: str
    ) -> dict[str, Any] | None:
        """Get feature vector for a learner."""
        if not self.client:
            return None

        key = self._key("learner", learner_id)
        data = await self.client.get(key)

        if data:
            return json.loads(data)
        return None

    async def set_learner_features(
        self,
        learner_id: str,
        features: dict[str, Any],
        ttl_seconds: int = 3600,
    ) -> None:
        """Set feature vector for a learner."""
        if not self.client:
            return

        key = self._key("learner", learner_id)
        await self.client.setex(key, ttl_seconds, json.dumps(features))

    async def get_learner_embedding(
        self, learner_id: str
    ) -> list[float] | None:
        """Get learner embedding vector for collaborative filtering."""
        if not self.client:
            return None

        key = self._key("embedding", "learner", learner_id)
        data = await self.client.get(key)

        if data:
            return json.loads(data)
        return None

    async def set_learner_embedding(
        self,
        learner_id: str,
        embedding: list[float],
        ttl_seconds: int = 86400,
    ) -> None:
        """Set learner embedding vector."""
        if not self.client:
            return

        key = self._key("embedding", "learner", learner_id)
        await self.client.setex(key, ttl_seconds, json.dumps(embedding))

    # ─────────────────────────────────────────────────────────────────────────
    # Item Features
    # ─────────────────────────────────────────────────────────────────────────

    async def get_item_features(
        self, item_id: str
    ) -> dict[str, Any] | None:
        """Get feature vector for an item."""
        if not self.client:
            return None

        key = self._key("item", item_id)
        data = await self.client.get(key)

        if data:
            return json.loads(data)
        return None

    async def set_item_features(
        self,
        item_id: str,
        features: dict[str, Any],
        ttl_seconds: int = 86400,
    ) -> None:
        """Set feature vector for an item."""
        if not self.client:
            return

        key = self._key("item", item_id)
        await self.client.setex(key, ttl_seconds, json.dumps(features))

    async def get_item_embedding(
        self, item_id: str
    ) -> list[float] | None:
        """Get item embedding vector."""
        if not self.client:
            return None

        key = self._key("embedding", "item", item_id)
        data = await self.client.get(key)

        if data:
            return json.loads(data)
        return None

    async def set_item_embedding(
        self,
        item_id: str,
        embedding: list[float],
        ttl_seconds: int = 86400,
    ) -> None:
        """Set item embedding vector."""
        if not self.client:
            return

        key = self._key("embedding", "item", item_id)
        await self.client.setex(key, ttl_seconds, json.dumps(embedding))

    # ─────────────────────────────────────────────────────────────────────────
    # Bandit Statistics
    # ─────────────────────────────────────────────────────────────────────────

    async def get_bandit_stats(
        self, arm_id: str
    ) -> dict[str, float] | None:
        """Get statistics for a bandit arm."""
        if not self.client:
            return None

        key = self._key("bandit", arm_id)
        data = await self.client.hgetall(key)

        if data:
            return {
                "pulls": float(data.get("pulls", 0)),
                "rewards": float(data.get("rewards", 0)),
                "mean_reward": float(data.get("mean_reward", 0)),
            }
        return None

    async def update_bandit_stats(
        self,
        arm_id: str,
        reward: float,
    ) -> None:
        """Update bandit arm statistics with a new reward."""
        if not self.client:
            return

        key = self._key("bandit", arm_id)

        # Use Redis transaction for atomic update
        async with self.client.pipeline(transaction=True) as pipe:
            # Get current stats
            await pipe.hgetall(key)
            results = await pipe.execute()
            
            current = results[0] if results else {}
            pulls = float(current.get("pulls", 0)) + 1
            rewards = float(current.get("rewards", 0)) + reward
            mean_reward = rewards / pulls if pulls > 0 else 0

            # Update stats
            await self.client.hset(
                key,
                mapping={
                    "pulls": str(pulls),
                    "rewards": str(rewards),
                    "mean_reward": str(mean_reward),
                },
            )

    # ─────────────────────────────────────────────────────────────────────────
    # Similarity Cache
    # ─────────────────────────────────────────────────────────────────────────

    async def get_similar_learners(
        self, learner_id: str, limit: int = 10
    ) -> list[tuple[str, float]] | None:
        """Get similar learners with similarity scores."""
        if not self.client:
            return None

        key = self._key("similar", "learners", learner_id)
        data = await self.client.zrevrange(key, 0, limit - 1, withscores=True)

        if data:
            return [(item, score) for item, score in data]
        return None

    async def set_similar_learners(
        self,
        learner_id: str,
        similar: list[tuple[str, float]],
        ttl_seconds: int = 3600,
    ) -> None:
        """Cache similar learners."""
        if not self.client:
            return

        key = self._key("similar", "learners", learner_id)

        if similar:
            # Store as sorted set
            await self.client.zadd(key, {lid: score for lid, score in similar})
            await self.client.expire(key, ttl_seconds)

    async def get_similar_items(
        self, item_id: str, limit: int = 10
    ) -> list[tuple[str, float]] | None:
        """Get similar items with similarity scores."""
        if not self.client:
            return None

        key = self._key("similar", "items", item_id)
        data = await self.client.zrevrange(key, 0, limit - 1, withscores=True)

        if data:
            return [(item, score) for item, score in data]
        return None

    async def set_similar_items(
        self,
        item_id: str,
        similar: list[tuple[str, float]],
        ttl_seconds: int = 86400,
    ) -> None:
        """Cache similar items."""
        if not self.client:
            return

        key = self._key("similar", "items", item_id)

        if similar:
            await self.client.zadd(key, {iid: score for iid, score in similar})
            await self.client.expire(key, ttl_seconds)

    # ─────────────────────────────────────────────────────────────────────────
    # Interaction History
    # ─────────────────────────────────────────────────────────────────────────

    async def add_interaction(
        self,
        learner_id: str,
        item_id: str,
        interaction_type: str,
        score: float,
    ) -> None:
        """Record a learner-item interaction."""
        if not self.client:
            return

        # Add to learner's interaction history
        learner_key = self._key("interactions", learner_id)
        await self.client.zadd(learner_key, {item_id: score})
        await self.client.expire(learner_key, 86400 * 30)  # 30 days

        # Add to item's interaction history
        item_key = self._key("item_interactions", item_id)
        await self.client.zadd(item_key, {learner_id: score})
        await self.client.expire(item_key, 86400 * 30)

    async def get_learner_interactions(
        self, learner_id: str, limit: int = 100
    ) -> list[tuple[str, float]]:
        """Get learner's recent interactions."""
        if not self.client:
            return []

        key = self._key("interactions", learner_id)
        data = await self.client.zrevrange(key, 0, limit - 1, withscores=True)

        return [(item, score) for item, score in data] if data else []
