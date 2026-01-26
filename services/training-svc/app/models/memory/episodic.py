"""
Episodic Memory System

Stores specific learning events with importance scoring.
Uses Redis for fast caching and retrieval of recent memories.
"""

import json
import logging
import uuid
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol

import numpy as np
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """Types of learning events that can be stored as episodic memories."""
    SUCCESS = "success"
    STRUGGLE = "struggle"
    BREAKTHROUGH = "breakthrough"
    MISCONCEPTION = "misconception"
    PREFERENCE = "preference"
    ENGAGEMENT = "engagement"
    FRUSTRATION = "frustration"
    CURIOSITY = "curiosity"
    HELP_SEEKING = "help_seeking"
    MASTERY = "mastery"


class EmbeddingService(Protocol):
    """Protocol for embedding service interface."""

    def encode(self, texts: List[str]) -> np.ndarray:
        """Encode texts to embeddings."""
        ...


class RedisClient(Protocol):
    """Protocol for Redis client interface."""

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        ...

    async def get(self, key: str) -> Optional[str]:
        ...

    async def delete(self, key: str) -> int:
        ...

    async def keys(self, pattern: str) -> List[str]:
        ...

    async def expire(self, key: str, seconds: int) -> bool:
        ...

    async def scan_iter(self, match: str) -> List[str]:
        ...


class EpisodicMemory(BaseModel):
    """
    Represents a specific learning event in the learner's history.

    Episodic memories capture what happened during a learning session,
    including emotional context and importance scoring for later retrieval.
    """
    memory_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    learner_id: str
    event_type: EventType
    content: Dict[str, Any] = Field(default_factory=dict)
    context: Dict[str, Any] = Field(default_factory=dict)
    emotional_valence: float = Field(ge=-1.0, le=1.0, default=0.0)
    importance_score: float = Field(ge=0.0, le=1.0, default=0.5)
    embedding: Optional[List[float]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    decay_factor: float = Field(ge=0.0, le=1.0, default=1.0)
    access_count: int = Field(ge=0, default=0)
    last_accessed: Optional[datetime] = None
    consolidated: bool = False
    skill_ids: List[str] = Field(default_factory=list)
    session_id: Optional[str] = None

    model_config = {"extra": "forbid"}

    @field_validator("emotional_valence", mode="before")
    @classmethod
    def clamp_emotional_valence(cls, v: float) -> float:
        """Clamp emotional valence to valid range."""
        return max(-1.0, min(1.0, float(v)))

    @field_validator("importance_score", mode="before")
    @classmethod
    def clamp_importance_score(cls, v: float) -> float:
        """Clamp importance score to valid range."""
        return max(0.0, min(1.0, float(v)))

    def to_text(self) -> str:
        """Convert memory to text representation for embedding."""
        parts = [
            f"Event: {self.event_type.value}",
        ]

        if self.content.get("description"):
            parts.append(f"Description: {self.content['description']}")

        if self.content.get("skill_name"):
            parts.append(f"Skill: {self.content['skill_name']}")

        if self.content.get("topic"):
            parts.append(f"Topic: {self.content['topic']}")

        if self.context.get("activity_type"):
            parts.append(f"Activity: {self.context['activity_type']}")

        return ". ".join(parts)

    def get_effective_importance(self) -> float:
        """Get importance adjusted by decay factor."""
        return self.importance_score * self.decay_factor

    def to_redis_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Redis storage."""
        return {
            "memory_id": self.memory_id,
            "learner_id": self.learner_id,
            "event_type": self.event_type.value,
            "content": self.content,
            "context": self.context,
            "emotional_valence": self.emotional_valence,
            "importance_score": self.importance_score,
            "embedding": self.embedding,
            "timestamp": self.timestamp.isoformat(),
            "decay_factor": self.decay_factor,
            "access_count": self.access_count,
            "last_accessed": self.last_accessed.isoformat() if self.last_accessed else None,
            "consolidated": self.consolidated,
            "skill_ids": self.skill_ids,
            "session_id": self.session_id,
        }

    @classmethod
    def from_redis_dict(cls, data: Dict[str, Any]) -> "EpisodicMemory":
        """Create from Redis dictionary."""
        return cls(
            memory_id=data["memory_id"],
            learner_id=data["learner_id"],
            event_type=EventType(data["event_type"]),
            content=data["content"],
            context=data["context"],
            emotional_valence=data["emotional_valence"],
            importance_score=data["importance_score"],
            embedding=data.get("embedding"),
            timestamp=datetime.fromisoformat(data["timestamp"]),
            decay_factor=data["decay_factor"],
            access_count=data["access_count"],
            last_accessed=datetime.fromisoformat(data["last_accessed"]) if data.get("last_accessed") else None,
            consolidated=data.get("consolidated", False),
            skill_ids=data.get("skill_ids", []),
            session_id=data.get("session_id"),
        )


class EpisodicMemoryStore:
    """
    Storage and retrieval system for episodic memories.

    Uses Redis for fast access to recent memories and supports:
    - Vector similarity search for relevant memory retrieval
    - Time-based decay of memory importance
    - Memory reinforcement when accessed
    - Efficient batch operations
    """

    # Redis key prefixes
    MEMORY_KEY_PREFIX = "episodic:memory:"
    LEARNER_INDEX_PREFIX = "episodic:learner:"
    TYPE_INDEX_PREFIX = "episodic:type:"

    def __init__(
        self,
        redis_client: RedisClient,
        embedding_service: EmbeddingService,
        max_memories_per_learner: int = 1000,
        memory_ttl_days: int = 365,
    ):
        """
        Initialize with Redis for persistence and embedding service.

        Args:
            redis_client: Redis client for storage
            embedding_service: Service to generate embeddings
            max_memories_per_learner: Maximum memories to retain per learner
            memory_ttl_days: Time-to-live for memories in days
        """
        self.redis = redis_client
        self.embedding_service = embedding_service
        self.max_memories = max_memories_per_learner
        self.memory_ttl = memory_ttl_days * 24 * 60 * 60  # Convert to seconds

        logger.info(
            f"EpisodicMemoryStore initialized: max_memories={max_memories_per_learner}, "
            f"ttl_days={memory_ttl_days}"
        )

    def _memory_key(self, memory_id: str) -> str:
        """Generate Redis key for a memory."""
        return f"{self.MEMORY_KEY_PREFIX}{memory_id}"

    def _learner_index_key(self, learner_id: str) -> str:
        """Generate Redis key for learner's memory index."""
        return f"{self.LEARNER_INDEX_PREFIX}{learner_id}"

    def _type_index_key(self, learner_id: str, event_type: EventType) -> str:
        """Generate Redis key for event type index."""
        return f"{self.TYPE_INDEX_PREFIX}{learner_id}:{event_type.value}"

    async def store(self, memory: EpisodicMemory) -> str:
        """
        Store new episodic memory with embedding generation.

        Args:
            memory: The episodic memory to store

        Returns:
            The memory_id of the stored memory
        """
        # Generate embedding if not provided
        if memory.embedding is None:
            text = memory.to_text()
            embedding = self.embedding_service.encode([text])[0]
            memory.embedding = embedding.tolist()

        # Store the memory
        memory_key = self._memory_key(memory.memory_id)
        memory_data = json.dumps(memory.to_redis_dict())
        await self.redis.set(memory_key, memory_data, ex=self.memory_ttl)

        # Update learner index (store memory_id in a list)
        learner_key = self._learner_index_key(memory.learner_id)
        existing_index = await self.redis.get(learner_key)

        if existing_index:
            memory_ids = json.loads(existing_index)
        else:
            memory_ids = []

        memory_ids.append(memory.memory_id)

        # Enforce max memories limit (remove oldest if exceeded)
        if len(memory_ids) > self.max_memories:
            # Remove oldest memories
            to_remove = memory_ids[:-self.max_memories]
            memory_ids = memory_ids[-self.max_memories:]

            for old_id in to_remove:
                await self.redis.delete(self._memory_key(old_id))

        await self.redis.set(learner_key, json.dumps(memory_ids), ex=self.memory_ttl)

        # Update type index
        type_key = self._type_index_key(memory.learner_id, memory.event_type)
        type_index = await self.redis.get(type_key)

        if type_index:
            type_ids = json.loads(type_index)
        else:
            type_ids = []

        type_ids.append(memory.memory_id)
        await self.redis.set(type_key, json.dumps(type_ids), ex=self.memory_ttl)

        logger.debug(
            f"Stored episodic memory {memory.memory_id} for learner {memory.learner_id}"
        )

        return memory.memory_id

    async def get(self, memory_id: str) -> Optional[EpisodicMemory]:
        """
        Retrieve a specific memory by ID.

        Args:
            memory_id: The memory to retrieve

        Returns:
            The memory if found, None otherwise
        """
        memory_key = self._memory_key(memory_id)
        data = await self.redis.get(memory_key)

        if data is None:
            return None

        memory = EpisodicMemory.from_redis_dict(json.loads(data))
        return memory

    async def retrieve_similar(
        self,
        query_embedding: List[float],
        learner_id: str,
        top_k: int = 10,
        min_importance: float = 0.3,
        exclude_consolidated: bool = False,
    ) -> List[EpisodicMemory]:
        """
        Retrieve memories similar to query using cosine similarity.

        Args:
            query_embedding: Query vector for similarity search
            learner_id: Learner whose memories to search
            top_k: Maximum number of memories to return
            min_importance: Minimum effective importance score
            exclude_consolidated: Whether to exclude consolidated memories

        Returns:
            List of similar memories sorted by relevance
        """
        # Get all memory IDs for this learner
        learner_key = self._learner_index_key(learner_id)
        index_data = await self.redis.get(learner_key)

        if not index_data:
            return []

        memory_ids = json.loads(index_data)

        # Load and score memories
        query_vec = np.array(query_embedding)
        scored_memories = []

        for memory_id in memory_ids:
            memory = await self.get(memory_id)

            if memory is None:
                continue

            if exclude_consolidated and memory.consolidated:
                continue

            effective_importance = memory.get_effective_importance()
            if effective_importance < min_importance:
                continue

            if memory.embedding is None:
                continue

            # Calculate cosine similarity
            memory_vec = np.array(memory.embedding)
            similarity = float(np.dot(query_vec, memory_vec) / (
                np.linalg.norm(query_vec) * np.linalg.norm(memory_vec) + 1e-9
            ))

            # Combined score: similarity * importance
            combined_score = similarity * (0.5 + 0.5 * effective_importance)

            scored_memories.append((memory, combined_score))

        # Sort by score and return top_k
        scored_memories.sort(key=lambda x: x[1], reverse=True)

        return [m for m, _ in scored_memories[:top_k]]

    async def retrieve_by_type(
        self,
        learner_id: str,
        event_type: EventType,
        limit: int = 20,
        min_importance: float = 0.0,
    ) -> List[EpisodicMemory]:
        """
        Retrieve memories by event type.

        Args:
            learner_id: Learner whose memories to search
            event_type: Type of events to retrieve
            limit: Maximum number of memories to return
            min_importance: Minimum importance score

        Returns:
            List of memories of the specified type
        """
        type_key = self._type_index_key(learner_id, event_type)
        index_data = await self.redis.get(type_key)

        if not index_data:
            return []

        memory_ids = json.loads(index_data)

        # Load memories and filter
        memories = []
        for memory_id in reversed(memory_ids):  # Most recent first
            if len(memories) >= limit:
                break

            memory = await self.get(memory_id)
            if memory and memory.get_effective_importance() >= min_importance:
                memories.append(memory)

        return memories

    async def retrieve_recent(
        self,
        learner_id: str,
        limit: int = 50,
        hours: Optional[int] = None,
    ) -> List[EpisodicMemory]:
        """
        Retrieve recent memories for a learner.

        Args:
            learner_id: Learner whose memories to retrieve
            limit: Maximum number of memories
            hours: Optional time limit in hours

        Returns:
            List of recent memories
        """
        learner_key = self._learner_index_key(learner_id)
        index_data = await self.redis.get(learner_key)

        if not index_data:
            return []

        memory_ids = json.loads(index_data)

        cutoff_time = None
        if hours:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        memories = []
        for memory_id in reversed(memory_ids):  # Most recent first
            if len(memories) >= limit:
                break

            memory = await self.get(memory_id)
            if memory is None:
                continue

            if cutoff_time and memory.timestamp < cutoff_time:
                continue

            memories.append(memory)

        return memories

    async def retrieve_by_skill(
        self,
        learner_id: str,
        skill_id: str,
        limit: int = 20,
    ) -> List[EpisodicMemory]:
        """
        Retrieve memories related to a specific skill.

        Args:
            learner_id: Learner whose memories to search
            skill_id: Skill to filter by
            limit: Maximum number of memories

        Returns:
            List of memories related to the skill
        """
        learner_key = self._learner_index_key(learner_id)
        index_data = await self.redis.get(learner_key)

        if not index_data:
            return []

        memory_ids = json.loads(index_data)

        memories = []
        for memory_id in reversed(memory_ids):
            if len(memories) >= limit:
                break

            memory = await self.get(memory_id)
            if memory and skill_id in memory.skill_ids:
                memories.append(memory)

        return memories

    async def decay_memories(
        self,
        learner_id: str,
        decay_rate: float = 0.99,
        min_decay_factor: float = 0.1,
    ) -> int:
        """
        Apply time-based decay to memory importance scores.

        Args:
            learner_id: Learner whose memories to decay
            decay_rate: Decay multiplier (applied once per call)
            min_decay_factor: Minimum decay factor (floor)

        Returns:
            Number of memories decayed
        """
        learner_key = self._learner_index_key(learner_id)
        index_data = await self.redis.get(learner_key)

        if not index_data:
            return 0

        memory_ids = json.loads(index_data)
        decayed_count = 0

        for memory_id in memory_ids:
            memory = await self.get(memory_id)
            if memory is None:
                continue

            # Apply decay
            new_decay = max(min_decay_factor, memory.decay_factor * decay_rate)

            if new_decay != memory.decay_factor:
                memory.decay_factor = new_decay

                # Save updated memory
                memory_key = self._memory_key(memory_id)
                await self.redis.set(
                    memory_key,
                    json.dumps(memory.to_redis_dict()),
                    ex=self.memory_ttl
                )
                decayed_count += 1

        logger.debug(f"Decayed {decayed_count} memories for learner {learner_id}")
        return decayed_count

    async def reinforce_memory(
        self,
        memory_id: str,
        boost: float = 0.1,
    ) -> Optional[EpisodicMemory]:
        """
        Reinforce a memory when it's accessed or relevant.

        Increases both decay factor and access count.

        Args:
            memory_id: Memory to reinforce
            boost: Amount to boost decay factor

        Returns:
            Updated memory or None if not found
        """
        memory = await self.get(memory_id)
        if memory is None:
            return None

        # Boost decay factor (capped at 1.0)
        memory.decay_factor = min(1.0, memory.decay_factor + boost)

        # Update access tracking
        memory.access_count += 1
        memory.last_accessed = datetime.utcnow()

        # Save updated memory
        memory_key = self._memory_key(memory_id)
        await self.redis.set(
            memory_key,
            json.dumps(memory.to_redis_dict()),
            ex=self.memory_ttl
        )

        logger.debug(f"Reinforced memory {memory_id}, decay_factor={memory.decay_factor}")
        return memory

    async def mark_consolidated(self, memory_id: str) -> Optional[EpisodicMemory]:
        """
        Mark a memory as having been consolidated to semantic memory.

        Args:
            memory_id: Memory to mark

        Returns:
            Updated memory or None if not found
        """
        memory = await self.get(memory_id)
        if memory is None:
            return None

        memory.consolidated = True

        # Save updated memory
        memory_key = self._memory_key(memory_id)
        await self.redis.set(
            memory_key,
            json.dumps(memory.to_redis_dict()),
            ex=self.memory_ttl
        )

        return memory

    async def delete(self, memory_id: str, learner_id: str) -> bool:
        """
        Delete a specific memory.

        Args:
            memory_id: Memory to delete
            learner_id: Learner who owns the memory

        Returns:
            True if deleted, False if not found
        """
        memory = await self.get(memory_id)
        if memory is None:
            return False

        # Delete the memory
        await self.redis.delete(self._memory_key(memory_id))

        # Remove from learner index
        learner_key = self._learner_index_key(learner_id)
        index_data = await self.redis.get(learner_key)

        if index_data:
            memory_ids = json.loads(index_data)
            if memory_id in memory_ids:
                memory_ids.remove(memory_id)
                await self.redis.set(learner_key, json.dumps(memory_ids), ex=self.memory_ttl)

        # Remove from type index
        type_key = self._type_index_key(learner_id, memory.event_type)
        type_data = await self.redis.get(type_key)

        if type_data:
            type_ids = json.loads(type_data)
            if memory_id in type_ids:
                type_ids.remove(memory_id)
                await self.redis.set(type_key, json.dumps(type_ids), ex=self.memory_ttl)

        logger.debug(f"Deleted memory {memory_id}")
        return True

    async def get_memory_count(self, learner_id: str) -> int:
        """Get total number of memories for a learner."""
        learner_key = self._learner_index_key(learner_id)
        index_data = await self.redis.get(learner_key)

        if not index_data:
            return 0

        return len(json.loads(index_data))

    async def get_stats(self, learner_id: str) -> Dict[str, Any]:
        """
        Get statistics about a learner's episodic memories.

        Args:
            learner_id: Learner to get stats for

        Returns:
            Dictionary with memory statistics
        """
        memories = await self.retrieve_recent(learner_id, limit=1000)

        if not memories:
            return {
                "total_memories": 0,
                "event_type_counts": {},
                "avg_importance": 0.0,
                "avg_decay_factor": 0.0,
                "consolidated_count": 0,
            }

        event_type_counts = {}
        total_importance = 0.0
        total_decay = 0.0
        consolidated_count = 0

        for memory in memories:
            event_type_counts[memory.event_type.value] = (
                event_type_counts.get(memory.event_type.value, 0) + 1
            )
            total_importance += memory.importance_score
            total_decay += memory.decay_factor
            if memory.consolidated:
                consolidated_count += 1

        return {
            "total_memories": len(memories),
            "event_type_counts": event_type_counts,
            "avg_importance": total_importance / len(memories),
            "avg_decay_factor": total_decay / len(memories),
            "consolidated_count": consolidated_count,
        }
