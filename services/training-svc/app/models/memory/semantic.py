"""
Semantic Memory System

Stores generalized knowledge extracted from episodic memories.
Uses PostgreSQL for long-term persistence.
"""

import logging
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol

import numpy as np
from pydantic import BaseModel, Field, field_validator

from .episodic import EpisodicMemory, EventType

logger = logging.getLogger(__name__)


class KnowledgeType(str, Enum):
    """Types of semantic knowledge that can be stored."""
    SKILL = "skill"
    PREFERENCE = "preference"
    PATTERN = "pattern"
    MISCONCEPTION = "misconception"
    STRENGTH = "strength"
    WEAKNESS = "weakness"
    LEARNING_STYLE = "learning_style"
    ENGAGEMENT_PATTERN = "engagement_pattern"
    OPTIMAL_DIFFICULTY = "optimal_difficulty"
    RESPONSE_TIME_PATTERN = "response_time_pattern"


class EmbeddingService(Protocol):
    """Protocol for embedding service interface."""

    def encode(self, texts: List[str]) -> np.ndarray:
        """Encode texts to embeddings."""
        ...


class DatabaseSession(Protocol):
    """Protocol for async database session."""

    async def execute(self, query: Any) -> Any:
        ...

    async def commit(self) -> None:
        ...

    async def rollback(self) -> None:
        ...


class SemanticKnowledge(BaseModel):
    """
    Represents generalized knowledge about a learner.

    Semantic knowledge is extracted from patterns across multiple
    episodic memories and represents stable learner characteristics.
    """
    knowledge_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    learner_id: str
    concept: str
    knowledge_type: KnowledgeType
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    evidence_count: int = Field(ge=0, default=1)
    first_observed: datetime = Field(default_factory=datetime.utcnow)
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    related_concepts: List[str] = Field(default_factory=list)
    source_episodes: List[str] = Field(default_factory=list)
    attributes: Dict[str, Any] = Field(default_factory=dict)
    embedding: Optional[List[float]] = None

    model_config = {"extra": "forbid"}

    @field_validator("confidence", mode="before")
    @classmethod
    def clamp_confidence(cls, v: float) -> float:
        """Clamp confidence to valid range."""
        return max(0.0, min(1.0, float(v)))

    def to_text(self) -> str:
        """Convert knowledge to text representation for embedding."""
        parts = [
            f"Knowledge: {self.concept}",
            f"Type: {self.knowledge_type.value}",
        ]

        if self.attributes.get("description"):
            parts.append(f"Description: {self.attributes['description']}")

        if self.related_concepts:
            parts.append(f"Related: {', '.join(self.related_concepts[:5])}")

        return ". ".join(parts)

    def update_confidence(self, new_evidence: bool, weight: float = 1.0) -> float:
        """
        Update confidence based on new evidence using a simple averaging approach.

        Args:
            new_evidence: True if evidence supports this knowledge
            weight: Weight of the new evidence

        Returns:
            Updated confidence value
        """
        evidence_value = 1.0 if new_evidence else 0.0

        # Weighted average
        total_weight = self.evidence_count + weight
        new_confidence = (
            (self.confidence * self.evidence_count) + (evidence_value * weight)
        ) / total_weight

        self.confidence = max(0.0, min(1.0, new_confidence))
        self.evidence_count += 1
        self.last_updated = datetime.utcnow()

        return self.confidence

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "knowledge_id": self.knowledge_id,
            "learner_id": self.learner_id,
            "concept": self.concept,
            "knowledge_type": self.knowledge_type.value,
            "confidence": self.confidence,
            "evidence_count": self.evidence_count,
            "first_observed": self.first_observed.isoformat(),
            "last_updated": self.last_updated.isoformat(),
            "related_concepts": self.related_concepts,
            "source_episodes": self.source_episodes,
            "attributes": self.attributes,
            "embedding": self.embedding,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SemanticKnowledge":
        """Create from dictionary."""
        return cls(
            knowledge_id=data["knowledge_id"],
            learner_id=data["learner_id"],
            concept=data["concept"],
            knowledge_type=KnowledgeType(data["knowledge_type"]),
            confidence=data["confidence"],
            evidence_count=data["evidence_count"],
            first_observed=datetime.fromisoformat(data["first_observed"]),
            last_updated=datetime.fromisoformat(data["last_updated"]),
            related_concepts=data.get("related_concepts", []),
            source_episodes=data.get("source_episodes", []),
            attributes=data.get("attributes", {}),
            embedding=data.get("embedding"),
        )


class PatternExtractor:
    """Helper class to extract patterns from episodic memories."""

    @staticmethod
    def extract_skill_patterns(
        episodes: List[EpisodicMemory],
        min_occurrences: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Extract skill-related patterns from episodes.

        Args:
            episodes: List of episodic memories
            min_occurrences: Minimum occurrences to consider a pattern

        Returns:
            List of pattern dictionaries
        """
        skill_events: Dict[str, List[EpisodicMemory]] = {}

        for episode in episodes:
            for skill_id in episode.skill_ids:
                if skill_id not in skill_events:
                    skill_events[skill_id] = []
                skill_events[skill_id].append(episode)

        patterns = []

        for skill_id, skill_episodes in skill_events.items():
            if len(skill_episodes) < min_occurrences:
                continue

            # Count success vs struggle
            success_count = sum(
                1 for e in skill_episodes if e.event_type == EventType.SUCCESS
            )
            struggle_count = sum(
                1 for e in skill_episodes if e.event_type == EventType.STRUGGLE
            )
            misconception_count = sum(
                1 for e in skill_episodes if e.event_type == EventType.MISCONCEPTION
            )

            total = len(skill_episodes)
            success_rate = success_count / total if total > 0 else 0

            # Determine pattern type
            if success_rate >= 0.8:
                pattern_type = KnowledgeType.STRENGTH
            elif success_rate <= 0.3:
                pattern_type = KnowledgeType.WEAKNESS
            elif misconception_count >= 2:
                pattern_type = KnowledgeType.MISCONCEPTION
            else:
                pattern_type = KnowledgeType.SKILL

            patterns.append({
                "concept": skill_id,
                "knowledge_type": pattern_type,
                "confidence": success_rate,
                "evidence_count": total,
                "source_episodes": [e.memory_id for e in skill_episodes],
                "attributes": {
                    "success_count": success_count,
                    "struggle_count": struggle_count,
                    "misconception_count": misconception_count,
                    "success_rate": success_rate,
                },
            })

        return patterns

    @staticmethod
    def extract_preference_patterns(
        episodes: List[EpisodicMemory],
        min_occurrences: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Extract learning preference patterns from episodes.

        Args:
            episodes: List of episodic memories
            min_occurrences: Minimum occurrences to consider a pattern

        Returns:
            List of pattern dictionaries
        """
        # Track activity type engagement
        activity_engagement: Dict[str, List[float]] = {}

        for episode in episodes:
            activity_type = episode.context.get("activity_type")
            if not activity_type:
                continue

            if activity_type not in activity_engagement:
                activity_engagement[activity_type] = []

            # Use emotional valence and engagement signals
            engagement = 0.5 + (episode.emotional_valence * 0.5)
            if episode.event_type == EventType.ENGAGEMENT:
                engagement = min(1.0, engagement + 0.2)
            elif episode.event_type == EventType.FRUSTRATION:
                engagement = max(0.0, engagement - 0.2)

            activity_engagement[activity_type].append(engagement)

        patterns = []

        for activity_type, engagements in activity_engagement.items():
            if len(engagements) < min_occurrences:
                continue

            avg_engagement = sum(engagements) / len(engagements)

            patterns.append({
                "concept": f"preference:{activity_type}",
                "knowledge_type": KnowledgeType.PREFERENCE,
                "confidence": avg_engagement,
                "evidence_count": len(engagements),
                "source_episodes": [],  # Not tracking specific episodes for preferences
                "attributes": {
                    "activity_type": activity_type,
                    "avg_engagement": avg_engagement,
                    "sample_count": len(engagements),
                },
            })

        return patterns

    @staticmethod
    def extract_engagement_patterns(
        episodes: List[EpisodicMemory],
        min_occurrences: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Extract engagement patterns (time of day, session duration, etc.).

        Args:
            episodes: List of episodic memories
            min_occurrences: Minimum occurrences to consider a pattern

        Returns:
            List of pattern dictionaries
        """
        patterns = []

        # Analyze time of day patterns
        time_buckets: Dict[str, List[float]] = {
            "morning": [],      # 6-12
            "afternoon": [],    # 12-17
            "evening": [],      # 17-21
            "night": [],        # 21-6
        }

        for episode in episodes:
            hour = episode.timestamp.hour

            if 6 <= hour < 12:
                bucket = "morning"
            elif 12 <= hour < 17:
                bucket = "afternoon"
            elif 17 <= hour < 21:
                bucket = "evening"
            else:
                bucket = "night"

            # Use importance as proxy for productive engagement
            time_buckets[bucket].append(episode.importance_score)

        for time_bucket, scores in time_buckets.items():
            if len(scores) < min_occurrences:
                continue

            avg_productivity = sum(scores) / len(scores)

            patterns.append({
                "concept": f"engagement:{time_bucket}",
                "knowledge_type": KnowledgeType.ENGAGEMENT_PATTERN,
                "confidence": avg_productivity,
                "evidence_count": len(scores),
                "source_episodes": [],
                "attributes": {
                    "time_bucket": time_bucket,
                    "avg_productivity": avg_productivity,
                    "sample_count": len(scores),
                },
            })

        return patterns


class SemanticMemoryStore:
    """
    Storage and retrieval system for semantic knowledge.

    Uses PostgreSQL for long-term persistence and supports:
    - Pattern extraction from episodic memories
    - Knowledge updates with new evidence
    - Semantic search across knowledge
    """

    def __init__(
        self,
        db_session_factory,
        embedding_service: EmbeddingService,
    ):
        """
        Initialize with database session factory.

        Args:
            db_session_factory: Factory function to create database sessions
            embedding_service: Service to generate embeddings
        """
        self.db_session_factory = db_session_factory
        self.embedding_service = embedding_service
        self.pattern_extractor = PatternExtractor()

        # In-memory cache for frequently accessed knowledge
        self._cache: Dict[str, Dict[str, SemanticKnowledge]] = {}

        logger.info("SemanticMemoryStore initialized")

    def _get_learner_cache(self, learner_id: str) -> Dict[str, SemanticKnowledge]:
        """Get or create cache for a learner."""
        if learner_id not in self._cache:
            self._cache[learner_id] = {}
        return self._cache[learner_id]

    async def store(self, knowledge: SemanticKnowledge) -> str:
        """
        Store semantic knowledge.

        Args:
            knowledge: Knowledge to store

        Returns:
            Knowledge ID
        """
        # Generate embedding if not provided
        if knowledge.embedding is None:
            text = knowledge.to_text()
            embedding = self.embedding_service.encode([text])[0]
            knowledge.embedding = embedding.tolist()

        # Update cache
        cache = self._get_learner_cache(knowledge.learner_id)
        cache_key = f"{knowledge.concept}:{knowledge.knowledge_type.value}"
        cache[cache_key] = knowledge

        # In production, this would store to PostgreSQL
        # For now, we use in-memory storage
        logger.debug(
            f"Stored semantic knowledge {knowledge.knowledge_id}: "
            f"{knowledge.concept} ({knowledge.knowledge_type.value})"
        )

        return knowledge.knowledge_id

    async def get(
        self,
        learner_id: str,
        concept: str,
        knowledge_type: Optional[KnowledgeType] = None,
    ) -> Optional[SemanticKnowledge]:
        """
        Get specific knowledge.

        Args:
            learner_id: Learner ID
            concept: Concept name
            knowledge_type: Optional type filter

        Returns:
            Knowledge if found
        """
        cache = self._get_learner_cache(learner_id)

        if knowledge_type:
            cache_key = f"{concept}:{knowledge_type.value}"
            return cache.get(cache_key)

        # Search all types for this concept
        for key, knowledge in cache.items():
            if key.startswith(f"{concept}:"):
                return knowledge

        return None

    async def extract_from_episodes(
        self,
        episodes: List[EpisodicMemory],
        learner_id: str,
        min_occurrences: int = 3,
    ) -> List[SemanticKnowledge]:
        """
        Extract semantic knowledge from recurring episodic patterns.

        Args:
            episodes: List of episodic memories to analyze
            learner_id: Learner ID
            min_occurrences: Minimum occurrences to form a pattern

        Returns:
            List of extracted semantic knowledge
        """
        all_patterns = []

        # Extract different types of patterns
        skill_patterns = self.pattern_extractor.extract_skill_patterns(
            episodes, min_occurrences
        )
        all_patterns.extend(skill_patterns)

        preference_patterns = self.pattern_extractor.extract_preference_patterns(
            episodes, min_occurrences
        )
        all_patterns.extend(preference_patterns)

        engagement_patterns = self.pattern_extractor.extract_engagement_patterns(
            episodes, min_occurrences
        )
        all_patterns.extend(engagement_patterns)

        # Convert patterns to SemanticKnowledge
        extracted = []

        for pattern in all_patterns:
            knowledge = SemanticKnowledge(
                learner_id=learner_id,
                concept=pattern["concept"],
                knowledge_type=pattern["knowledge_type"],
                confidence=pattern["confidence"],
                evidence_count=pattern["evidence_count"],
                source_episodes=pattern.get("source_episodes", []),
                attributes=pattern.get("attributes", {}),
            )

            # Check if we already have this knowledge
            existing = await self.get(
                learner_id, knowledge.concept, knowledge.knowledge_type
            )

            if existing:
                # Update existing knowledge
                existing.evidence_count += knowledge.evidence_count
                existing.confidence = (
                    existing.confidence * 0.7 + knowledge.confidence * 0.3
                )
                existing.last_updated = datetime.utcnow()
                existing.source_episodes = list(
                    set(existing.source_episodes + knowledge.source_episodes)
                )[-50:]  # Keep last 50 episode IDs

                await self.store(existing)
                extracted.append(existing)
            else:
                await self.store(knowledge)
                extracted.append(knowledge)

        logger.info(
            f"Extracted {len(extracted)} semantic knowledge items for learner {learner_id}"
        )

        return extracted

    async def update_knowledge(
        self,
        learner_id: str,
        concept: str,
        knowledge_type: KnowledgeType,
        new_evidence: Dict[str, Any],
    ) -> SemanticKnowledge:
        """
        Update existing semantic knowledge with new evidence.

        Args:
            learner_id: Learner ID
            concept: Concept to update
            knowledge_type: Type of knowledge
            new_evidence: New evidence dictionary

        Returns:
            Updated knowledge
        """
        existing = await self.get(learner_id, concept, knowledge_type)

        if existing:
            # Update with new evidence
            if "success" in new_evidence:
                existing.update_confidence(
                    new_evidence["success"],
                    weight=new_evidence.get("weight", 1.0)
                )

            if "episode_id" in new_evidence:
                existing.source_episodes.append(new_evidence["episode_id"])
                existing.source_episodes = existing.source_episodes[-50:]

            if "attributes" in new_evidence:
                existing.attributes.update(new_evidence["attributes"])

            await self.store(existing)
            return existing
        else:
            # Create new knowledge
            knowledge = SemanticKnowledge(
                learner_id=learner_id,
                concept=concept,
                knowledge_type=knowledge_type,
                confidence=0.5,
                evidence_count=1,
                attributes=new_evidence.get("attributes", {}),
            )

            if "success" in new_evidence:
                knowledge.confidence = 1.0 if new_evidence["success"] else 0.0

            await self.store(knowledge)
            return knowledge

    async def query_knowledge(
        self,
        learner_id: str,
        query: Optional[str] = None,
        knowledge_types: Optional[List[KnowledgeType]] = None,
        min_confidence: float = 0.0,
        limit: int = 50,
    ) -> List[SemanticKnowledge]:
        """
        Query semantic knowledge relevant to a topic.

        Args:
            learner_id: Learner ID
            query: Optional text query for semantic search
            knowledge_types: Optional filter by knowledge types
            min_confidence: Minimum confidence threshold
            limit: Maximum results

        Returns:
            List of matching knowledge
        """
        cache = self._get_learner_cache(learner_id)

        # Filter by type and confidence
        results = []
        for knowledge in cache.values():
            if knowledge_types and knowledge.knowledge_type not in knowledge_types:
                continue

            if knowledge.confidence < min_confidence:
                continue

            results.append(knowledge)

        # If query provided, rank by semantic similarity
        if query and results:
            query_embedding = self.embedding_service.encode([query])[0]

            scored_results = []
            for knowledge in results:
                if knowledge.embedding:
                    knowledge_vec = np.array(knowledge.embedding)
                    similarity = float(np.dot(query_embedding, knowledge_vec) / (
                        np.linalg.norm(query_embedding) * np.linalg.norm(knowledge_vec) + 1e-9
                    ))
                else:
                    similarity = 0.0

                scored_results.append((knowledge, similarity))

            scored_results.sort(key=lambda x: x[1], reverse=True)
            results = [k for k, _ in scored_results]

        return results[:limit]

    async def get_all_knowledge(
        self,
        learner_id: str,
        knowledge_types: Optional[List[KnowledgeType]] = None,
    ) -> List[SemanticKnowledge]:
        """
        Get all semantic knowledge for a learner.

        Args:
            learner_id: Learner ID
            knowledge_types: Optional filter by types

        Returns:
            List of all knowledge
        """
        cache = self._get_learner_cache(learner_id)

        results = []
        for knowledge in cache.values():
            if knowledge_types and knowledge.knowledge_type not in knowledge_types:
                continue
            results.append(knowledge)

        return results

    async def get_strengths(
        self,
        learner_id: str,
        min_confidence: float = 0.7,
    ) -> List[SemanticKnowledge]:
        """Get learner's identified strengths."""
        return await self.query_knowledge(
            learner_id,
            knowledge_types=[KnowledgeType.STRENGTH],
            min_confidence=min_confidence,
        )

    async def get_weaknesses(
        self,
        learner_id: str,
        max_confidence: float = 0.3,
    ) -> List[SemanticKnowledge]:
        """Get learner's identified weaknesses."""
        all_weaknesses = await self.query_knowledge(
            learner_id,
            knowledge_types=[KnowledgeType.WEAKNESS],
        )
        return [w for w in all_weaknesses if w.confidence <= max_confidence]

    async def get_misconceptions(
        self,
        learner_id: str,
        min_confidence: float = 0.5,
    ) -> List[SemanticKnowledge]:
        """Get learner's identified misconceptions."""
        return await self.query_knowledge(
            learner_id,
            knowledge_types=[KnowledgeType.MISCONCEPTION],
            min_confidence=min_confidence,
        )

    async def get_preferences(
        self,
        learner_id: str,
    ) -> List[SemanticKnowledge]:
        """Get learner's preferences."""
        return await self.query_knowledge(
            learner_id,
            knowledge_types=[KnowledgeType.PREFERENCE, KnowledgeType.LEARNING_STYLE],
        )

    async def delete_knowledge(
        self,
        learner_id: str,
        knowledge_id: str,
    ) -> bool:
        """Delete specific knowledge."""
        cache = self._get_learner_cache(learner_id)

        for key, knowledge in list(cache.items()):
            if knowledge.knowledge_id == knowledge_id:
                del cache[key]
                return True

        return False

    async def get_stats(self, learner_id: str) -> Dict[str, Any]:
        """Get statistics about learner's semantic knowledge."""
        all_knowledge = await self.get_all_knowledge(learner_id)

        type_counts: Dict[str, int] = {}
        total_confidence = 0.0

        for knowledge in all_knowledge:
            type_key = knowledge.knowledge_type.value
            type_counts[type_key] = type_counts.get(type_key, 0) + 1
            total_confidence += knowledge.confidence

        return {
            "total_knowledge": len(all_knowledge),
            "type_counts": type_counts,
            "avg_confidence": total_confidence / len(all_knowledge) if all_knowledge else 0.0,
        }
