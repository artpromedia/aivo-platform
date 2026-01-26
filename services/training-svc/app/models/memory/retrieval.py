"""
Memory Retrieval System

Provides unified vector-based memory retrieval across both
episodic and semantic memory stores.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol, Union

import numpy as np
from pydantic import BaseModel, Field

from .episodic import EpisodicMemory, EpisodicMemoryStore, EventType
from .semantic import (
    KnowledgeType,
    SemanticKnowledge,
    SemanticMemoryStore,
)

logger = logging.getLogger(__name__)


class MemoryType(str, Enum):
    """Types of memories that can be retrieved."""
    EPISODIC = "episodic"
    SEMANTIC = "semantic"
    ALL = "all"


class EmbeddingService(Protocol):
    """Protocol for embedding service interface."""

    def encode(self, texts: List[str]) -> np.ndarray:
        """Encode texts to embeddings."""
        ...


class RetrievalConfig(BaseModel):
    """Configuration for memory retrieval."""
    top_k: int = Field(default=10, ge=1, le=100)
    min_similarity: float = Field(default=0.3, ge=0.0, le=1.0)
    include_episodic: bool = Field(default=True)
    include_semantic: bool = Field(default=True)
    episodic_weight: float = Field(default=0.5, ge=0.0, le=1.0)
    semantic_weight: float = Field(default=0.5, ge=0.0, le=1.0)
    recency_bias: float = Field(default=0.1, ge=0.0, le=1.0)
    importance_bias: float = Field(default=0.2, ge=0.0, le=1.0)
    event_type_filter: Optional[List[EventType]] = None
    knowledge_type_filter: Optional[List[KnowledgeType]] = None
    skill_filter: Optional[List[str]] = None


@dataclass
class RetrievalResult:
    """Result from memory retrieval."""
    memory_type: MemoryType
    memory_id: str
    score: float
    content: Union[EpisodicMemory, SemanticKnowledge]
    relevance_explanation: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        if isinstance(self.content, EpisodicMemory):
            content_dict = self.content.to_redis_dict()
        else:
            content_dict = self.content.to_dict()

        return {
            "memory_type": self.memory_type.value,
            "memory_id": self.memory_id,
            "score": self.score,
            "content": content_dict,
            "relevance_explanation": self.relevance_explanation,
        }


class MemoryRetriever:
    """
    Unified memory retrieval system.

    Provides vector similarity search across both episodic and
    semantic memory stores with configurable weighting and filtering.
    """

    def __init__(
        self,
        episodic_store: EpisodicMemoryStore,
        semantic_store: SemanticMemoryStore,
        embedding_service: EmbeddingService,
        default_config: Optional[RetrievalConfig] = None,
    ):
        """
        Initialize retriever with memory stores.

        Args:
            episodic_store: Store for episodic memories
            semantic_store: Store for semantic knowledge
            embedding_service: Service to generate query embeddings
            default_config: Default retrieval configuration
        """
        self.episodic_store = episodic_store
        self.semantic_store = semantic_store
        self.embedding_service = embedding_service
        self.default_config = default_config or RetrievalConfig()

        logger.info("MemoryRetriever initialized")

    async def retrieve(
        self,
        query: str,
        learner_id: str,
        config: Optional[RetrievalConfig] = None,
    ) -> List[RetrievalResult]:
        """
        Retrieve relevant memories based on a text query.

        Args:
            query: Natural language query
            learner_id: Learner whose memories to search
            config: Optional retrieval configuration

        Returns:
            List of retrieval results sorted by relevance
        """
        config = config or self.default_config

        # Generate query embedding
        query_embedding = self.embedding_service.encode([query])[0]

        results: List[RetrievalResult] = []

        # Retrieve from episodic memory
        if config.include_episodic:
            episodic_results = await self._retrieve_episodic(
                query_embedding=query_embedding.tolist(),
                learner_id=learner_id,
                config=config,
            )
            results.extend(episodic_results)

        # Retrieve from semantic memory
        if config.include_semantic:
            semantic_results = await self._retrieve_semantic(
                query=query,
                query_embedding=query_embedding,
                learner_id=learner_id,
                config=config,
            )
            results.extend(semantic_results)

        # Sort by combined score
        results.sort(key=lambda x: x.score, reverse=True)

        return results[:config.top_k]

    async def retrieve_by_embedding(
        self,
        embedding: List[float],
        learner_id: str,
        config: Optional[RetrievalConfig] = None,
    ) -> List[RetrievalResult]:
        """
        Retrieve relevant memories using a pre-computed embedding.

        Args:
            embedding: Query embedding vector
            learner_id: Learner whose memories to search
            config: Optional retrieval configuration

        Returns:
            List of retrieval results sorted by relevance
        """
        config = config or self.default_config
        query_embedding = np.array(embedding)

        results: List[RetrievalResult] = []

        if config.include_episodic:
            episodic_results = await self._retrieve_episodic(
                query_embedding=embedding,
                learner_id=learner_id,
                config=config,
            )
            results.extend(episodic_results)

        if config.include_semantic:
            semantic_results = await self._retrieve_semantic(
                query=None,
                query_embedding=query_embedding,
                learner_id=learner_id,
                config=config,
            )
            results.extend(semantic_results)

        results.sort(key=lambda x: x.score, reverse=True)
        return results[:config.top_k]

    async def _retrieve_episodic(
        self,
        query_embedding: List[float],
        learner_id: str,
        config: RetrievalConfig,
    ) -> List[RetrievalResult]:
        """Retrieve from episodic memory store."""
        # Get similar memories
        memories = await self.episodic_store.retrieve_similar(
            query_embedding=query_embedding,
            learner_id=learner_id,
            top_k=config.top_k * 2,  # Get more to allow filtering
            min_importance=0.0,  # We'll handle importance in scoring
        )

        results = []
        query_vec = np.array(query_embedding)
        now = datetime.utcnow()

        for memory in memories:
            # Apply event type filter
            if config.event_type_filter and memory.event_type not in config.event_type_filter:
                continue

            # Apply skill filter
            if config.skill_filter:
                if not any(s in memory.skill_ids for s in config.skill_filter):
                    continue

            # Calculate similarity score
            if memory.embedding:
                memory_vec = np.array(memory.embedding)
                similarity = float(np.dot(query_vec, memory_vec) / (
                    np.linalg.norm(query_vec) * np.linalg.norm(memory_vec) + 1e-9
                ))
            else:
                continue

            if similarity < config.min_similarity:
                continue

            # Apply recency bias
            age_hours = (now - memory.timestamp).total_seconds() / 3600
            recency_score = 1.0 / (1.0 + age_hours / 24)  # Decay over days

            # Apply importance bias
            importance_score = memory.get_effective_importance()

            # Combined score
            score = (
                similarity * (1 - config.recency_bias - config.importance_bias) +
                recency_score * config.recency_bias +
                importance_score * config.importance_bias
            ) * config.episodic_weight

            results.append(RetrievalResult(
                memory_type=MemoryType.EPISODIC,
                memory_id=memory.memory_id,
                score=score,
                content=memory,
                relevance_explanation=self._explain_episodic_relevance(
                    memory, similarity, recency_score, importance_score
                ),
            ))

        return results

    async def _retrieve_semantic(
        self,
        query: Optional[str],
        query_embedding: np.ndarray,
        learner_id: str,
        config: RetrievalConfig,
    ) -> List[RetrievalResult]:
        """Retrieve from semantic memory store."""
        # Get knowledge matching filters
        knowledge_items = await self.semantic_store.query_knowledge(
            learner_id=learner_id,
            query=query,
            knowledge_types=config.knowledge_type_filter,
            min_confidence=0.0,  # We'll handle confidence in scoring
            limit=config.top_k * 2,
        )

        results = []

        for knowledge in knowledge_items:
            # Calculate similarity score
            if knowledge.embedding:
                knowledge_vec = np.array(knowledge.embedding)
                similarity = float(np.dot(query_embedding, knowledge_vec) / (
                    np.linalg.norm(query_embedding) * np.linalg.norm(knowledge_vec) + 1e-9
                ))
            else:
                # If no embedding, use lower score
                similarity = 0.3

            if similarity < config.min_similarity:
                continue

            # Apply confidence as importance
            confidence_score = knowledge.confidence

            # Combined score
            score = (
                similarity * (1 - config.importance_bias) +
                confidence_score * config.importance_bias
            ) * config.semantic_weight

            results.append(RetrievalResult(
                memory_type=MemoryType.SEMANTIC,
                memory_id=knowledge.knowledge_id,
                score=score,
                content=knowledge,
                relevance_explanation=self._explain_semantic_relevance(
                    knowledge, similarity, confidence_score
                ),
            ))

        return results

    def _explain_episodic_relevance(
        self,
        memory: EpisodicMemory,
        similarity: float,
        recency: float,
        importance: float,
    ) -> str:
        """Generate explanation for episodic memory relevance."""
        parts = [
            f"Similarity: {similarity:.2f}",
            f"Recency: {recency:.2f}",
            f"Importance: {importance:.2f}",
        ]

        if memory.event_type in [EventType.SUCCESS, EventType.BREAKTHROUGH]:
            parts.append("Positive learning event")
        elif memory.event_type in [EventType.STRUGGLE, EventType.MISCONCEPTION]:
            parts.append("Learning challenge identified")

        return " | ".join(parts)

    def _explain_semantic_relevance(
        self,
        knowledge: SemanticKnowledge,
        similarity: float,
        confidence: float,
    ) -> str:
        """Generate explanation for semantic knowledge relevance."""
        parts = [
            f"Similarity: {similarity:.2f}",
            f"Confidence: {confidence:.2f}",
            f"Evidence: {knowledge.evidence_count} episodes",
        ]

        if knowledge.knowledge_type == KnowledgeType.STRENGTH:
            parts.append("Identified strength")
        elif knowledge.knowledge_type == KnowledgeType.WEAKNESS:
            parts.append("Identified challenge area")
        elif knowledge.knowledge_type == KnowledgeType.MISCONCEPTION:
            parts.append("Known misconception")

        return " | ".join(parts)

    async def retrieve_for_skill(
        self,
        skill_id: str,
        learner_id: str,
        top_k: int = 10,
    ) -> List[RetrievalResult]:
        """
        Retrieve memories related to a specific skill.

        Args:
            skill_id: Skill to retrieve memories for
            learner_id: Learner ID
            top_k: Maximum results

        Returns:
            List of relevant memories
        """
        config = RetrievalConfig(
            top_k=top_k,
            skill_filter=[skill_id],
            min_similarity=0.0,  # Don't filter by similarity for skill-based retrieval
        )

        # Get episodic memories for the skill
        episodic_memories = await self.episodic_store.retrieve_by_skill(
            learner_id=learner_id,
            skill_id=skill_id,
            limit=top_k,
        )

        results = []
        for memory in episodic_memories:
            results.append(RetrievalResult(
                memory_type=MemoryType.EPISODIC,
                memory_id=memory.memory_id,
                score=memory.get_effective_importance(),
                content=memory,
                relevance_explanation=f"Related to skill {skill_id}",
            ))

        # Get semantic knowledge about the skill
        semantic_knowledge = await self.semantic_store.get(
            learner_id=learner_id,
            concept=skill_id,
        )

        if semantic_knowledge:
            results.append(RetrievalResult(
                memory_type=MemoryType.SEMANTIC,
                memory_id=semantic_knowledge.knowledge_id,
                score=semantic_knowledge.confidence,
                content=semantic_knowledge,
                relevance_explanation=f"Knowledge about skill {skill_id}",
            ))

        results.sort(key=lambda x: x.score, reverse=True)
        return results[:top_k]

    async def retrieve_context(
        self,
        learner_id: str,
        current_activity: Dict[str, Any],
        top_k: int = 20,
    ) -> Dict[str, Any]:
        """
        Retrieve comprehensive context for a learning activity.

        Gathers relevant memories to provide context for personalization.

        Args:
            learner_id: Learner ID
            current_activity: Information about current activity
            top_k: Maximum memories per category

        Returns:
            Context dictionary with categorized memories
        """
        context = {
            "learner_id": learner_id,
            "recent_history": [],
            "relevant_memories": [],
            "known_strengths": [],
            "known_weaknesses": [],
            "misconceptions": [],
            "preferences": [],
        }

        # Get recent episodic memories
        recent = await self.episodic_store.retrieve_recent(
            learner_id=learner_id,
            limit=10,
            hours=24,
        )
        context["recent_history"] = [
            {
                "type": m.event_type.value,
                "content": m.content,
                "timestamp": m.timestamp.isoformat(),
                "importance": m.importance_score,
            }
            for m in recent
        ]

        # Get memories relevant to current activity
        activity_desc = current_activity.get("description", "")
        skill_ids = current_activity.get("skill_ids", [])

        if activity_desc:
            relevant = await self.retrieve(
                query=activity_desc,
                learner_id=learner_id,
                config=RetrievalConfig(
                    top_k=top_k,
                    skill_filter=skill_ids if skill_ids else None,
                ),
            )
            context["relevant_memories"] = [r.to_dict() for r in relevant]

        # Get semantic knowledge categories
        strengths = await self.semantic_store.get_strengths(learner_id)
        context["known_strengths"] = [
            {"concept": s.concept, "confidence": s.confidence}
            for s in strengths[:5]
        ]

        weaknesses = await self.semantic_store.get_weaknesses(learner_id)
        context["known_weaknesses"] = [
            {"concept": w.concept, "confidence": w.confidence}
            for w in weaknesses[:5]
        ]

        misconceptions = await self.semantic_store.get_misconceptions(learner_id)
        context["misconceptions"] = [
            {"concept": m.concept, "confidence": m.confidence, "details": m.attributes}
            for m in misconceptions[:5]
        ]

        preferences = await self.semantic_store.get_preferences(learner_id)
        context["preferences"] = [
            {"concept": p.concept, "type": p.knowledge_type.value, "confidence": p.confidence}
            for p in preferences[:5]
        ]

        return context

    async def find_similar_learners(
        self,
        learner_id: str,
        other_learner_ids: List[str],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Find learners with similar learning patterns.

        Compares semantic knowledge profiles to find similar learners.
        Useful for collaborative filtering or peer matching.

        Args:
            learner_id: Target learner
            other_learner_ids: Pool of learners to compare
            top_k: Number of similar learners to return

        Returns:
            List of similar learners with similarity scores
        """
        # Get target learner's knowledge profile
        target_knowledge = await self.semantic_store.get_all_knowledge(learner_id)

        if not target_knowledge:
            return []

        # Build target profile vector
        target_concepts = {k.concept: k.confidence for k in target_knowledge}

        similarities = []

        for other_id in other_learner_ids:
            if other_id == learner_id:
                continue

            other_knowledge = await self.semantic_store.get_all_knowledge(other_id)

            if not other_knowledge:
                continue

            # Build other profile vector
            other_concepts = {k.concept: k.confidence for k in other_knowledge}

            # Calculate similarity based on shared concepts
            shared_concepts = set(target_concepts.keys()) & set(other_concepts.keys())

            if not shared_concepts:
                continue

            # Cosine similarity on shared concept confidences
            target_vec = [target_concepts.get(c, 0) for c in shared_concepts]
            other_vec = [other_concepts.get(c, 0) for c in shared_concepts]

            dot_product = sum(t * o for t, o in zip(target_vec, other_vec))
            target_norm = sum(t ** 2 for t in target_vec) ** 0.5
            other_norm = sum(o ** 2 for o in other_vec) ** 0.5

            if target_norm > 0 and other_norm > 0:
                similarity = dot_product / (target_norm * other_norm)
            else:
                similarity = 0.0

            similarities.append({
                "learner_id": other_id,
                "similarity": similarity,
                "shared_concepts": len(shared_concepts),
                "total_concepts": len(other_concepts),
            })

        # Sort by similarity
        similarities.sort(key=lambda x: x["similarity"], reverse=True)

        return similarities[:top_k]

    async def get_retrieval_stats(
        self,
        learner_id: str,
    ) -> Dict[str, Any]:
        """Get statistics about available memories for retrieval."""
        episodic_stats = await self.episodic_store.get_stats(learner_id)
        semantic_stats = await self.semantic_store.get_stats(learner_id)

        return {
            "learner_id": learner_id,
            "episodic": episodic_stats,
            "semantic": semantic_stats,
            "total_memories": (
                episodic_stats["total_memories"] +
                semantic_stats["total_knowledge"]
            ),
        }
