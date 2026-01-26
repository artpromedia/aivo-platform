"""
Memory Consolidation System

Handles the process of consolidating episodic memories into semantic knowledge.
Simulates the cognitive process of memory consolidation that occurs during sleep.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Protocol

from pydantic import BaseModel, Field

from .episodic import EpisodicMemory, EpisodicMemoryStore, EventType
from .semantic import (
    KnowledgeType,
    SemanticKnowledge,
    SemanticMemoryStore,
)

logger = logging.getLogger(__name__)


class LLMClient(Protocol):
    """Protocol for LLM client interface used for pattern synthesis."""

    async def complete(
        self,
        prompt: str,
        max_tokens: int = 500,
    ) -> str:
        """Generate completion for a prompt."""
        ...


class ConsolidationConfig(BaseModel):
    """Configuration for memory consolidation."""
    importance_threshold: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Minimum importance for episodic memory to be considered"
    )
    min_episodes_for_pattern: int = Field(
        default=3,
        ge=1,
        description="Minimum episodes needed to extract a pattern"
    )
    consolidation_window_hours: int = Field(
        default=24,
        ge=1,
        description="Time window to look back for consolidation"
    )
    max_episodes_per_consolidation: int = Field(
        default=100,
        ge=1,
        description="Maximum episodes to process in one consolidation"
    )
    decay_consolidated_memories: bool = Field(
        default=True,
        description="Whether to apply extra decay to consolidated episodic memories"
    )
    decay_rate_after_consolidation: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Decay rate to apply after consolidation"
    )


@dataclass
class ConsolidationResult:
    """Result of a memory consolidation operation."""
    learner_id: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    episodes_processed: int = 0
    episodes_consolidated: int = 0
    knowledge_created: int = 0
    knowledge_updated: int = 0
    patterns_found: List[Dict[str, Any]] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    duration_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "learner_id": self.learner_id,
            "timestamp": self.timestamp.isoformat(),
            "episodes_processed": self.episodes_processed,
            "episodes_consolidated": self.episodes_consolidated,
            "knowledge_created": self.knowledge_created,
            "knowledge_updated": self.knowledge_updated,
            "patterns_found": self.patterns_found,
            "errors": self.errors,
            "duration_ms": self.duration_ms,
        }


class MemoryConsolidator:
    """
    Handles memory consolidation from episodic to semantic memory.

    Memory consolidation mimics the cognitive process where:
    1. Important episodic memories are identified
    2. Patterns across episodes are extracted
    3. Generalized knowledge is formed and stored
    4. Source episodic memories are marked as consolidated
    """

    def __init__(
        self,
        episodic_store: EpisodicMemoryStore,
        semantic_store: SemanticMemoryStore,
        llm_client: Optional[LLMClient] = None,
        config: Optional[ConsolidationConfig] = None,
    ):
        """
        Initialize consolidator with both memory stores.

        Args:
            episodic_store: Store for episodic memories
            semantic_store: Store for semantic knowledge
            llm_client: Optional LLM client for pattern synthesis
            config: Consolidation configuration
        """
        self.episodic_store = episodic_store
        self.semantic_store = semantic_store
        self.llm_client = llm_client
        self.config = config or ConsolidationConfig()

        logger.info(
            f"MemoryConsolidator initialized with threshold={self.config.importance_threshold}"
        )

    async def consolidate(
        self,
        learner_id: str,
        force: bool = False,
    ) -> ConsolidationResult:
        """
        Consolidate episodic memories into semantic knowledge.

        Process:
        1. Retrieve unconsolidated episodic memories above importance threshold
        2. Group memories by skill/concept
        3. Identify patterns across episodes
        4. Extract generalizable knowledge
        5. Update semantic store
        6. Mark source episodes as consolidated

        Args:
            learner_id: Learner whose memories to consolidate
            force: If True, include already consolidated memories

        Returns:
            ConsolidationResult with details of the operation
        """
        start_time = datetime.utcnow()
        result = ConsolidationResult(learner_id=learner_id)

        try:
            # Get recent episodic memories
            episodes = await self.episodic_store.retrieve_recent(
                learner_id=learner_id,
                limit=self.config.max_episodes_per_consolidation,
                hours=self.config.consolidation_window_hours,
            )

            # Filter by importance and consolidation status
            eligible_episodes = [
                e for e in episodes
                if e.get_effective_importance() >= self.config.importance_threshold
                and (force or not e.consolidated)
            ]

            result.episodes_processed = len(eligible_episodes)

            if len(eligible_episodes) < self.config.min_episodes_for_pattern:
                logger.debug(
                    f"Insufficient episodes for consolidation: "
                    f"{len(eligible_episodes)} < {self.config.min_episodes_for_pattern}"
                )
                result.duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
                return result

            # Extract semantic knowledge from episodes
            knowledge_items = await self.semantic_store.extract_from_episodes(
                episodes=eligible_episodes,
                learner_id=learner_id,
                min_occurrences=self.config.min_episodes_for_pattern,
            )

            # Track created vs updated
            existing_ids = set()
            for item in knowledge_items:
                if item.evidence_count > self.config.min_episodes_for_pattern:
                    result.knowledge_updated += 1
                else:
                    result.knowledge_created += 1

                result.patterns_found.append({
                    "concept": item.concept,
                    "type": item.knowledge_type.value,
                    "confidence": item.confidence,
                })

            # Find and synthesize additional patterns using LLM (if available)
            if self.llm_client:
                llm_patterns = await self._synthesize_patterns_with_llm(
                    eligible_episodes, learner_id
                )

                for pattern in llm_patterns:
                    await self.semantic_store.update_knowledge(
                        learner_id=learner_id,
                        concept=pattern["concept"],
                        knowledge_type=pattern["knowledge_type"],
                        new_evidence=pattern["evidence"],
                    )
                    result.patterns_found.append({
                        "concept": pattern["concept"],
                        "type": pattern["knowledge_type"].value,
                        "source": "llm_synthesis",
                    })
                    result.knowledge_created += 1

            # Mark episodes as consolidated
            consolidated_episode_ids = set()
            for item in knowledge_items:
                consolidated_episode_ids.update(item.source_episodes)

            for episode_id in consolidated_episode_ids:
                episode = await self.episodic_store.mark_consolidated(episode_id)

                if episode and self.config.decay_consolidated_memories:
                    # Apply extra decay to consolidated memories
                    episode.decay_factor *= self.config.decay_rate_after_consolidation
                    await self.episodic_store.reinforce_memory(
                        episode_id,
                        boost=-0.2  # Negative boost = decay
                    )

                result.episodes_consolidated += 1

            logger.info(
                f"Consolidated memories for {learner_id}: "
                f"{result.episodes_consolidated} episodes → "
                f"{result.knowledge_created} new, {result.knowledge_updated} updated knowledge"
            )

        except Exception as e:
            logger.error(f"Consolidation error for {learner_id}: {e}")
            result.errors.append(str(e))

        result.duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        return result

    async def scheduled_consolidation(
        self,
        learner_id: str,
    ) -> ConsolidationResult:
        """
        Run consolidation on schedule (e.g., end of session, daily).

        Simulates sleep-based memory consolidation by:
        1. Running full consolidation
        2. Applying decay to all episodic memories
        3. Reinforcing important recurring patterns

        Args:
            learner_id: Learner to consolidate

        Returns:
            ConsolidationResult
        """
        # Run consolidation
        result = await self.consolidate(learner_id)

        # Apply decay to all memories
        await self.episodic_store.decay_memories(
            learner_id=learner_id,
            decay_rate=0.95,  # 5% decay per scheduled consolidation
        )

        # Reinforce important semantic knowledge
        important_knowledge = await self.semantic_store.query_knowledge(
            learner_id=learner_id,
            min_confidence=0.7,
        )

        for knowledge in important_knowledge:
            # Reinforce source episodes that led to important knowledge
            for episode_id in knowledge.source_episodes[-10:]:  # Last 10 episodes
                await self.episodic_store.reinforce_memory(
                    episode_id,
                    boost=0.05
                )

        logger.info(f"Completed scheduled consolidation for {learner_id}")
        return result

    async def _synthesize_patterns_with_llm(
        self,
        episodes: List[EpisodicMemory],
        learner_id: str,
    ) -> List[Dict[str, Any]]:
        """
        Use LLM to synthesize higher-level patterns from episodes.

        Args:
            episodes: Episodes to analyze
            learner_id: Learner ID

        Returns:
            List of synthesized patterns
        """
        if not self.llm_client:
            return []

        try:
            # Prepare episode summaries for LLM
            episode_summaries = []
            for episode in episodes[:20]:  # Limit to 20 for context
                summary = {
                    "type": episode.event_type.value,
                    "content": episode.content.get("description", ""),
                    "skills": episode.skill_ids,
                    "emotional": "positive" if episode.emotional_valence > 0.2 else
                                "negative" if episode.emotional_valence < -0.2 else "neutral",
                    "importance": episode.importance_score,
                }
                episode_summaries.append(summary)

            prompt = self._build_synthesis_prompt(episode_summaries)
            response = await self.llm_client.complete(prompt, max_tokens=500)

            # Parse LLM response into patterns
            patterns = self._parse_llm_patterns(response)
            return patterns

        except Exception as e:
            logger.warning(f"LLM pattern synthesis failed: {e}")
            return []

    def _build_synthesis_prompt(
        self,
        episode_summaries: List[Dict[str, Any]],
    ) -> str:
        """Build prompt for LLM pattern synthesis."""
        episodes_text = "\n".join(
            f"- {s['type']}: {s['content'][:100]} (skills: {s['skills']}, emotion: {s['emotional']})"
            for s in episode_summaries
        )

        return f"""Analyze these learning episodes and identify patterns:

{episodes_text}

Identify 2-3 key patterns about this learner's:
1. Learning strengths or challenges
2. Emotional patterns during learning
3. Skill relationships or dependencies

For each pattern, provide:
- concept: A brief name for the pattern
- type: One of [strength, weakness, misconception, pattern, preference]
- confidence: How confident (0.0-1.0) based on evidence
- description: Brief explanation

Respond in JSON format:
[{{"concept": "...", "type": "...", "confidence": 0.X, "description": "..."}}]"""

    def _parse_llm_patterns(
        self,
        response: str,
    ) -> List[Dict[str, Any]]:
        """Parse LLM response into pattern dictionaries."""
        import json

        patterns = []

        try:
            # Try to extract JSON from response
            start_idx = response.find("[")
            end_idx = response.rfind("]") + 1

            if start_idx >= 0 and end_idx > start_idx:
                json_str = response[start_idx:end_idx]
                raw_patterns = json.loads(json_str)

                type_mapping = {
                    "strength": KnowledgeType.STRENGTH,
                    "weakness": KnowledgeType.WEAKNESS,
                    "misconception": KnowledgeType.MISCONCEPTION,
                    "pattern": KnowledgeType.PATTERN,
                    "preference": KnowledgeType.PREFERENCE,
                }

                for raw in raw_patterns:
                    pattern_type = type_mapping.get(
                        raw.get("type", "pattern"),
                        KnowledgeType.PATTERN
                    )

                    patterns.append({
                        "concept": raw.get("concept", "unnamed_pattern"),
                        "knowledge_type": pattern_type,
                        "evidence": {
                            "confidence": raw.get("confidence", 0.5),
                            "attributes": {
                                "description": raw.get("description", ""),
                                "source": "llm_synthesis",
                            }
                        }
                    })

        except json.JSONDecodeError:
            logger.warning("Failed to parse LLM pattern response as JSON")

        return patterns

    async def consolidate_skill_group(
        self,
        learner_id: str,
        skill_ids: List[str],
    ) -> ConsolidationResult:
        """
        Consolidate memories for a specific group of skills.

        Useful for targeted consolidation after completing a learning unit.

        Args:
            learner_id: Learner ID
            skill_ids: Skills to consolidate

        Returns:
            ConsolidationResult
        """
        start_time = datetime.utcnow()
        result = ConsolidationResult(learner_id=learner_id)

        try:
            # Gather episodes for each skill
            all_episodes = []
            for skill_id in skill_ids:
                skill_episodes = await self.episodic_store.retrieve_by_skill(
                    learner_id=learner_id,
                    skill_id=skill_id,
                    limit=50,
                )
                all_episodes.extend(skill_episodes)

            # Deduplicate
            seen_ids = set()
            unique_episodes = []
            for episode in all_episodes:
                if episode.memory_id not in seen_ids:
                    seen_ids.add(episode.memory_id)
                    unique_episodes.append(episode)

            result.episodes_processed = len(unique_episodes)

            if unique_episodes:
                # Extract knowledge
                knowledge_items = await self.semantic_store.extract_from_episodes(
                    episodes=unique_episodes,
                    learner_id=learner_id,
                    min_occurrences=2,  # Lower threshold for targeted consolidation
                )

                for item in knowledge_items:
                    result.patterns_found.append({
                        "concept": item.concept,
                        "type": item.knowledge_type.value,
                        "confidence": item.confidence,
                    })

                result.knowledge_created = len(knowledge_items)

                # Mark episodes as consolidated
                for episode in unique_episodes:
                    await self.episodic_store.mark_consolidated(episode.memory_id)
                    result.episodes_consolidated += 1

        except Exception as e:
            logger.error(f"Skill group consolidation error: {e}")
            result.errors.append(str(e))

        result.duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        return result

    async def get_consolidation_status(
        self,
        learner_id: str,
    ) -> Dict[str, Any]:
        """
        Get status of memory consolidation for a learner.

        Args:
            learner_id: Learner ID

        Returns:
            Status dictionary
        """
        episodic_stats = await self.episodic_store.get_stats(learner_id)
        semantic_stats = await self.semantic_store.get_stats(learner_id)

        # Count unconsolidated memories
        recent_memories = await self.episodic_store.retrieve_recent(
            learner_id, limit=100
        )
        unconsolidated = sum(1 for m in recent_memories if not m.consolidated)

        return {
            "learner_id": learner_id,
            "episodic_memory_count": episodic_stats["total_memories"],
            "semantic_knowledge_count": semantic_stats["total_knowledge"],
            "unconsolidated_memories": unconsolidated,
            "consolidation_ratio": (
                episodic_stats["consolidated_count"] / episodic_stats["total_memories"]
                if episodic_stats["total_memories"] > 0 else 0.0
            ),
            "avg_memory_importance": episodic_stats["avg_importance"],
            "avg_knowledge_confidence": semantic_stats["avg_confidence"],
            "ready_for_consolidation": unconsolidated >= self.config.min_episodes_for_pattern,
        }
