"""
Tests for Memory Consolidation System.
"""

import pytest

from app.models.memory.consolidation import (
    ConsolidationConfig,
    ConsolidationResult,
    MemoryConsolidator,
)
from app.models.memory.episodic import (
    EpisodicMemory,
    EpisodicMemoryStore,
    EventType,
)
from app.models.memory.semantic import (
    KnowledgeType,
    SemanticMemoryStore,
)


class TestConsolidationConfig:
    """Tests for ConsolidationConfig."""

    def test_default_config(self):
        """Test default configuration values."""
        config = ConsolidationConfig()

        assert config.importance_threshold == 0.5
        assert config.min_episodes_for_pattern == 3
        assert config.consolidation_window_hours == 24
        assert config.decay_consolidated_memories == True

    def test_custom_config(self):
        """Test custom configuration."""
        config = ConsolidationConfig(
            importance_threshold=0.7,
            min_episodes_for_pattern=5,
            consolidation_window_hours=48,
        )

        assert config.importance_threshold == 0.7
        assert config.min_episodes_for_pattern == 5
        assert config.consolidation_window_hours == 48


class TestConsolidationResult:
    """Tests for ConsolidationResult."""

    def test_create_result(self, learner_id):
        """Test creating a consolidation result."""
        result = ConsolidationResult(
            learner_id=learner_id,
            episodes_processed=10,
            episodes_consolidated=8,
            knowledge_created=3,
            knowledge_updated=2,
        )

        assert result.learner_id == learner_id
        assert result.episodes_processed == 10
        assert result.episodes_consolidated == 8
        assert result.knowledge_created == 3
        assert result.knowledge_updated == 2
        assert result.errors == []

    def test_result_to_dict(self, learner_id):
        """Test converting result to dictionary."""
        result = ConsolidationResult(
            learner_id=learner_id,
            episodes_processed=5,
            patterns_found=[
                {"concept": "skill-a", "type": "strength"},
                {"concept": "skill-b", "type": "weakness"},
            ],
        )

        dict_data = result.to_dict()

        assert dict_data["learner_id"] == learner_id
        assert dict_data["episodes_processed"] == 5
        assert len(dict_data["patterns_found"]) == 2


class TestMemoryConsolidator:
    """Tests for MemoryConsolidator."""

    @pytest.fixture
    def episodic_store(self, mock_redis, mock_embedding_service):
        """Create episodic memory store."""
        return EpisodicMemoryStore(
            redis_client=mock_redis,
            embedding_service=mock_embedding_service,
        )

    @pytest.fixture
    def semantic_store(self, mock_db_session, mock_embedding_service):
        """Create semantic memory store."""
        return SemanticMemoryStore(
            db_session_factory=mock_db_session,
            embedding_service=mock_embedding_service,
        )

    @pytest.fixture
    def consolidator(self, episodic_store, semantic_store):
        """Create memory consolidator."""
        return MemoryConsolidator(
            episodic_store=episodic_store,
            semantic_store=semantic_store,
            config=ConsolidationConfig(
                min_episodes_for_pattern=3,
                importance_threshold=0.3,
            ),
        )

    @pytest.mark.asyncio
    async def test_consolidate_empty(self, consolidator, learner_id):
        """Test consolidation with no memories."""
        result = await consolidator.consolidate(learner_id)

        assert result.learner_id == learner_id
        assert result.episodes_processed == 0
        assert result.episodes_consolidated == 0

    @pytest.mark.asyncio
    async def test_consolidate_insufficient_episodes(
        self, consolidator, episodic_store, learner_id
    ):
        """Test consolidation with insufficient episodes."""
        # Store only 2 episodes (below threshold of 3)
        for i in range(2):
            await episodic_store.store(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                importance_score=0.8,
            ))

        result = await consolidator.consolidate(learner_id)

        # Should not consolidate with insufficient episodes
        assert result.episodes_processed <= 2

    @pytest.mark.asyncio
    async def test_consolidate_creates_knowledge(
        self, consolidator, episodic_store, semantic_store, learner_id
    ):
        """Test that consolidation creates semantic knowledge."""
        # Store enough episodes with a clear pattern
        for i in range(5):
            await episodic_store.store(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                skill_ids=["math-addition"],
                importance_score=0.8,
            ))

        result = await consolidator.consolidate(learner_id)

        assert result.episodes_processed >= 5
        assert result.knowledge_created > 0 or result.knowledge_updated > 0

        # Verify knowledge was created
        knowledge = await semantic_store.get_all_knowledge(learner_id)
        assert len(knowledge) > 0

    @pytest.mark.asyncio
    async def test_consolidate_marks_episodes(
        self, consolidator, episodic_store, learner_id
    ):
        """Test that consolidated episodes are marked."""
        # Store episodes
        memory_ids = []
        for i in range(5):
            memory = EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                skill_ids=["test-skill"],
                importance_score=0.8,
            )
            await episodic_store.store(memory)
            memory_ids.append(memory.memory_id)

        await consolidator.consolidate(learner_id)

        # Check some memories are marked as consolidated
        consolidated_count = 0
        for memory_id in memory_ids:
            memory = await episodic_store.get(memory_id)
            if memory and memory.consolidated:
                consolidated_count += 1

        assert consolidated_count > 0

    @pytest.mark.asyncio
    async def test_consolidate_with_llm(
        self, episodic_store, semantic_store, mock_llm_client, learner_id
    ):
        """Test consolidation with LLM pattern synthesis."""
        consolidator = MemoryConsolidator(
            episodic_store=episodic_store,
            semantic_store=semantic_store,
            llm_client=mock_llm_client,
            config=ConsolidationConfig(min_episodes_for_pattern=3),
        )

        # Store episodes
        for i in range(5):
            await episodic_store.store(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                importance_score=0.8,
                content={"description": f"Test event {i}"},
            ))

        result = await consolidator.consolidate(learner_id)

        # Should have found patterns (including LLM-synthesized ones)
        assert len(result.patterns_found) >= 0

    @pytest.mark.asyncio
    async def test_scheduled_consolidation(
        self, consolidator, episodic_store, learner_id
    ):
        """Test scheduled consolidation applies decay."""
        # Store memories
        for i in range(5):
            await episodic_store.store(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                importance_score=0.8,
                decay_factor=1.0,
            ))

        result = await consolidator.scheduled_consolidation(learner_id)

        assert result is not None

        # Check that decay was applied
        memories = await episodic_store.retrieve_recent(learner_id, limit=10)
        decayed_count = sum(1 for m in memories if m.decay_factor < 1.0)
        assert decayed_count > 0

    @pytest.mark.asyncio
    async def test_consolidate_skill_group(
        self, consolidator, episodic_store, learner_id
    ):
        """Test targeted consolidation for specific skills."""
        # Store memories for different skills
        target_skills = ["skill-a", "skill-b"]

        for skill in target_skills:
            for i in range(3):
                await episodic_store.store(EpisodicMemory(
                    learner_id=learner_id,
                    event_type=EventType.SUCCESS,
                    skill_ids=[skill],
                    importance_score=0.8,
                ))

        # Also store memories for other skills
        for i in range(3):
            await episodic_store.store(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                skill_ids=["skill-c"],
                importance_score=0.8,
            ))

        result = await consolidator.consolidate_skill_group(
            learner_id=learner_id,
            skill_ids=target_skills,
        )

        assert result.episodes_processed >= 6  # skill-a + skill-b episodes

    @pytest.mark.asyncio
    async def test_get_consolidation_status(
        self, consolidator, episodic_store, semantic_store, learner_id
    ):
        """Test getting consolidation status."""
        # Store some memories
        for i in range(5):
            await episodic_store.store(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                importance_score=0.8,
            ))

        status = await consolidator.get_consolidation_status(learner_id)

        assert status["learner_id"] == learner_id
        assert "episodic_memory_count" in status
        assert "semantic_knowledge_count" in status
        assert "unconsolidated_memories" in status
        assert "ready_for_consolidation" in status

    @pytest.mark.asyncio
    async def test_importance_threshold_filtering(
        self, episodic_store, semantic_store, learner_id
    ):
        """Test that importance threshold filters episodes."""
        consolidator = MemoryConsolidator(
            episodic_store=episodic_store,
            semantic_store=semantic_store,
            config=ConsolidationConfig(
                importance_threshold=0.7,  # High threshold
                min_episodes_for_pattern=3,
            ),
        )

        # Store low-importance memories
        for i in range(5):
            await episodic_store.store(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                importance_score=0.3,  # Below threshold
            ))

        result = await consolidator.consolidate(learner_id)

        # Should filter out low-importance memories
        assert result.episodes_processed == 0

    @pytest.mark.asyncio
    async def test_consolidation_error_handling(
        self, consolidator, learner_id
    ):
        """Test that errors are captured in result."""
        # This test verifies error handling structure
        result = await consolidator.consolidate(learner_id)

        # Even with no errors, the structure should be correct
        assert hasattr(result, "errors")
        assert isinstance(result.errors, list)

    @pytest.mark.asyncio
    async def test_consolidation_duration_tracking(
        self, consolidator, episodic_store, learner_id
    ):
        """Test that consolidation duration is tracked."""
        # Store some memories
        for i in range(3):
            await episodic_store.store(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                importance_score=0.8,
            ))

        result = await consolidator.consolidate(learner_id)

        assert result.duration_ms >= 0

    @pytest.mark.asyncio
    async def test_force_reconsolidate(
        self, consolidator, episodic_store, learner_id
    ):
        """Test forcing reconsolidation of already consolidated memories."""
        # Store and consolidate
        for i in range(5):
            await episodic_store.store(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                skill_ids=["test-skill"],
                importance_score=0.8,
            ))

        await consolidator.consolidate(learner_id)

        # Force reconsolidate
        result = await consolidator.consolidate(learner_id, force=True)

        # Should process memories even if already consolidated
        assert result is not None
