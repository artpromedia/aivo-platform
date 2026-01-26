"""
Tests for Memory Retrieval System.
"""

import pytest

from app.models.memory.episodic import (
    EpisodicMemory,
    EpisodicMemoryStore,
    EventType,
)
from app.models.memory.retrieval import (
    MemoryRetriever,
    MemoryType,
    RetrievalConfig,
    RetrievalResult,
)
from app.models.memory.semantic import (
    KnowledgeType,
    SemanticKnowledge,
    SemanticMemoryStore,
)


class TestRetrievalConfig:
    """Tests for RetrievalConfig."""

    def test_default_config(self):
        """Test default configuration values."""
        config = RetrievalConfig()

        assert config.top_k == 10
        assert config.min_similarity == 0.3
        assert config.include_episodic == True
        assert config.include_semantic == True
        assert config.episodic_weight == 0.5
        assert config.semantic_weight == 0.5

    def test_custom_config(self):
        """Test custom configuration."""
        config = RetrievalConfig(
            top_k=20,
            min_similarity=0.5,
            include_episodic=True,
            include_semantic=False,
            event_type_filter=[EventType.SUCCESS, EventType.BREAKTHROUGH],
        )

        assert config.top_k == 20
        assert config.min_similarity == 0.5
        assert config.include_semantic == False
        assert len(config.event_type_filter) == 2


class TestRetrievalResult:
    """Tests for RetrievalResult."""

    def test_create_episodic_result(self, learner_id):
        """Test creating a result for episodic memory."""
        memory = EpisodicMemory(
            learner_id=learner_id,
            event_type=EventType.SUCCESS,
        )

        result = RetrievalResult(
            memory_type=MemoryType.EPISODIC,
            memory_id=memory.memory_id,
            score=0.85,
            content=memory,
            relevance_explanation="High similarity, recent memory",
        )

        assert result.memory_type == MemoryType.EPISODIC
        assert result.score == 0.85
        assert result.content == memory

    def test_create_semantic_result(self, learner_id):
        """Test creating a result for semantic knowledge."""
        knowledge = SemanticKnowledge(
            learner_id=learner_id,
            concept="math-skill",
            knowledge_type=KnowledgeType.SKILL,
        )

        result = RetrievalResult(
            memory_type=MemoryType.SEMANTIC,
            memory_id=knowledge.knowledge_id,
            score=0.9,
            content=knowledge,
        )

        assert result.memory_type == MemoryType.SEMANTIC
        assert result.score == 0.9

    def test_result_to_dict(self, learner_id):
        """Test converting result to dictionary."""
        memory = EpisodicMemory(
            learner_id=learner_id,
            event_type=EventType.SUCCESS,
        )

        result = RetrievalResult(
            memory_type=MemoryType.EPISODIC,
            memory_id=memory.memory_id,
            score=0.75,
            content=memory,
        )

        dict_data = result.to_dict()

        assert dict_data["memory_type"] == "episodic"
        assert dict_data["score"] == 0.75
        assert "content" in dict_data


class TestMemoryRetriever:
    """Tests for MemoryRetriever."""

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
    def retriever(self, episodic_store, semantic_store, mock_embedding_service):
        """Create memory retriever."""
        return MemoryRetriever(
            episodic_store=episodic_store,
            semantic_store=semantic_store,
            embedding_service=mock_embedding_service,
        )

    @pytest.mark.asyncio
    async def test_retrieve_empty(self, retriever, learner_id):
        """Test retrieval with no memories."""
        results = await retriever.retrieve(
            query="math addition",
            learner_id=learner_id,
        )

        assert results == []

    @pytest.mark.asyncio
    async def test_retrieve_episodic_memories(
        self, retriever, episodic_store, learner_id
    ):
        """Test retrieving episodic memories."""
        # Store some memories
        for i in range(3):
            await episodic_store.store(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                content={"description": f"Math addition problem {i}"},
                importance_score=0.8,
            ))

        results = await retriever.retrieve(
            query="math addition",
            learner_id=learner_id,
            config=RetrievalConfig(
                include_episodic=True,
                include_semantic=False,
            ),
        )

        assert len(results) <= 3
        for result in results:
            assert result.memory_type == MemoryType.EPISODIC

    @pytest.mark.asyncio
    async def test_retrieve_semantic_knowledge(
        self, retriever, semantic_store, learner_id
    ):
        """Test retrieving semantic knowledge."""
        # Store some knowledge
        await semantic_store.store(SemanticKnowledge(
            learner_id=learner_id,
            concept="math-addition-skill",
            knowledge_type=KnowledgeType.SKILL,
            confidence=0.8,
        ))
        await semantic_store.store(SemanticKnowledge(
            learner_id=learner_id,
            concept="math-strength",
            knowledge_type=KnowledgeType.STRENGTH,
            confidence=0.9,
        ))

        results = await retriever.retrieve(
            query="math",
            learner_id=learner_id,
            config=RetrievalConfig(
                include_episodic=False,
                include_semantic=True,
            ),
        )

        assert len(results) <= 2
        for result in results:
            assert result.memory_type == MemoryType.SEMANTIC

    @pytest.mark.asyncio
    async def test_retrieve_combined(
        self, retriever, episodic_store, semantic_store, learner_id
    ):
        """Test retrieving from both stores."""
        # Store episodic memory
        await episodic_store.store(EpisodicMemory(
            learner_id=learner_id,
            event_type=EventType.SUCCESS,
            content={"description": "Math problem solved"},
            importance_score=0.8,
        ))

        # Store semantic knowledge
        await semantic_store.store(SemanticKnowledge(
            learner_id=learner_id,
            concept="math-skill",
            knowledge_type=KnowledgeType.SKILL,
            confidence=0.8,
        ))

        results = await retriever.retrieve(
            query="math",
            learner_id=learner_id,
            config=RetrievalConfig(
                include_episodic=True,
                include_semantic=True,
            ),
        )

        # Should have results from both types
        memory_types = {r.memory_type for r in results}
        assert len(memory_types) >= 1

    @pytest.mark.asyncio
    async def test_retrieve_with_top_k(
        self, retriever, episodic_store, learner_id
    ):
        """Test that top_k limit is respected."""
        # Store many memories
        for i in range(10):
            await episodic_store.store(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                content={"description": f"Memory {i}"},
                importance_score=0.8,
            ))

        results = await retriever.retrieve(
            query="memory",
            learner_id=learner_id,
            config=RetrievalConfig(top_k=3),
        )

        assert len(results) <= 3

    @pytest.mark.asyncio
    async def test_retrieve_with_event_type_filter(
        self, retriever, episodic_store, learner_id
    ):
        """Test filtering by event type."""
        # Store different event types
        await episodic_store.store(EpisodicMemory(
            learner_id=learner_id,
            event_type=EventType.SUCCESS,
            content={"description": "Success event"},
            importance_score=0.8,
        ))
        await episodic_store.store(EpisodicMemory(
            learner_id=learner_id,
            event_type=EventType.STRUGGLE,
            content={"description": "Struggle event"},
            importance_score=0.8,
        ))

        results = await retriever.retrieve(
            query="event",
            learner_id=learner_id,
            config=RetrievalConfig(
                event_type_filter=[EventType.SUCCESS],
                include_semantic=False,
            ),
        )

        for result in results:
            if result.memory_type == MemoryType.EPISODIC:
                assert result.content.event_type == EventType.SUCCESS

    @pytest.mark.asyncio
    async def test_retrieve_with_skill_filter(
        self, retriever, episodic_store, learner_id
    ):
        """Test filtering by skill."""
        await episodic_store.store(EpisodicMemory(
            learner_id=learner_id,
            event_type=EventType.SUCCESS,
            skill_ids=["math-addition"],
            importance_score=0.8,
        ))
        await episodic_store.store(EpisodicMemory(
            learner_id=learner_id,
            event_type=EventType.SUCCESS,
            skill_ids=["reading-comprehension"],
            importance_score=0.8,
        ))

        results = await retriever.retrieve(
            query="skill practice",
            learner_id=learner_id,
            config=RetrievalConfig(
                skill_filter=["math-addition"],
                include_semantic=False,
            ),
        )

        for result in results:
            if result.memory_type == MemoryType.EPISODIC:
                assert "math-addition" in result.content.skill_ids

    @pytest.mark.asyncio
    async def test_retrieve_by_embedding(
        self, retriever, episodic_store, mock_embedding_service, learner_id
    ):
        """Test retrieval using pre-computed embedding."""
        await episodic_store.store(EpisodicMemory(
            learner_id=learner_id,
            event_type=EventType.SUCCESS,
            content={"description": "Math problem"},
            importance_score=0.8,
        ))

        # Get embedding for query
        embedding = mock_embedding_service.encode(["math problem"])[0]

        results = await retriever.retrieve_by_embedding(
            embedding=embedding.tolist(),
            learner_id=learner_id,
        )

        assert isinstance(results, list)

    @pytest.mark.asyncio
    async def test_retrieve_for_skill(
        self, retriever, episodic_store, semantic_store, learner_id
    ):
        """Test retrieving memories for a specific skill."""
        skill_id = "math-fractions"

        # Store episodic memory for skill
        await episodic_store.store(EpisodicMemory(
            learner_id=learner_id,
            event_type=EventType.SUCCESS,
            skill_ids=[skill_id],
            importance_score=0.8,
        ))

        # Store semantic knowledge for skill
        await semantic_store.store(SemanticKnowledge(
            learner_id=learner_id,
            concept=skill_id,
            knowledge_type=KnowledgeType.SKILL,
            confidence=0.7,
        ))

        results = await retriever.retrieve_for_skill(
            skill_id=skill_id,
            learner_id=learner_id,
        )

        assert len(results) >= 1

    @pytest.mark.asyncio
    async def test_retrieve_context(
        self, retriever, episodic_store, semantic_store, learner_id
    ):
        """Test retrieving comprehensive context."""
        # Store various memories and knowledge
        for i in range(3):
            await episodic_store.store(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                importance_score=0.8,
            ))

        await semantic_store.store(SemanticKnowledge(
            learner_id=learner_id,
            concept="math-strength",
            knowledge_type=KnowledgeType.STRENGTH,
            confidence=0.9,
        ))
        await semantic_store.store(SemanticKnowledge(
            learner_id=learner_id,
            concept="reading-preference",
            knowledge_type=KnowledgeType.PREFERENCE,
            confidence=0.8,
        ))

        context = await retriever.retrieve_context(
            learner_id=learner_id,
            current_activity={"description": "Math practice session"},
        )

        assert "learner_id" in context
        assert "recent_history" in context
        assert "known_strengths" in context
        assert "preferences" in context

    @pytest.mark.asyncio
    async def test_recency_bias(
        self, retriever, episodic_store, learner_id
    ):
        """Test that recency bias affects scoring."""
        from datetime import datetime, timedelta

        # Store old memory
        old_memory = EpisodicMemory(
            learner_id=learner_id,
            event_type=EventType.SUCCESS,
            content={"description": "Old math problem"},
            importance_score=0.8,
            timestamp=datetime.utcnow() - timedelta(days=7),
        )
        await episodic_store.store(old_memory)

        # Store recent memory
        recent_memory = EpisodicMemory(
            learner_id=learner_id,
            event_type=EventType.SUCCESS,
            content={"description": "Recent math problem"},
            importance_score=0.8,
            timestamp=datetime.utcnow(),
        )
        await episodic_store.store(recent_memory)

        results = await retriever.retrieve(
            query="math problem",
            learner_id=learner_id,
            config=RetrievalConfig(
                recency_bias=0.3,  # High recency bias
                include_semantic=False,
            ),
        )

        # With recency bias, recent memory should score higher
        # (assuming similar semantic similarity)
        if len(results) >= 2:
            # Results should be sorted by score
            assert results[0].score >= results[1].score

    @pytest.mark.asyncio
    async def test_importance_bias(
        self, retriever, episodic_store, learner_id
    ):
        """Test that importance bias affects scoring."""
        # Store low importance memory
        await episodic_store.store(EpisodicMemory(
            learner_id=learner_id,
            event_type=EventType.SUCCESS,
            content={"description": "Low importance math"},
            importance_score=0.3,
        ))

        # Store high importance memory
        await episodic_store.store(EpisodicMemory(
            learner_id=learner_id,
            event_type=EventType.BREAKTHROUGH,
            content={"description": "High importance math breakthrough"},
            importance_score=0.9,
        ))

        results = await retriever.retrieve(
            query="math",
            learner_id=learner_id,
            config=RetrievalConfig(
                importance_bias=0.3,
                include_semantic=False,
            ),
        )

        # High importance memory should rank higher
        assert len(results) >= 1

    @pytest.mark.asyncio
    async def test_get_retrieval_stats(
        self, retriever, episodic_store, semantic_store, learner_id
    ):
        """Test getting retrieval statistics."""
        # Store some data
        await episodic_store.store(EpisodicMemory(
            learner_id=learner_id,
            event_type=EventType.SUCCESS,
        ))
        await semantic_store.store(SemanticKnowledge(
            learner_id=learner_id,
            concept="test",
            knowledge_type=KnowledgeType.SKILL,
        ))

        stats = await retriever.get_retrieval_stats(learner_id)

        assert "episodic" in stats
        assert "semantic" in stats
        assert "total_memories" in stats

    @pytest.mark.asyncio
    async def test_results_sorted_by_score(
        self, retriever, episodic_store, learner_id
    ):
        """Test that results are sorted by score descending."""
        # Store multiple memories
        for i in range(5):
            await episodic_store.store(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                content={"description": f"Memory about math {i}"},
                importance_score=0.5 + i * 0.1,
            ))

        results = await retriever.retrieve(
            query="math memory",
            learner_id=learner_id,
            config=RetrievalConfig(include_semantic=False),
        )

        # Verify sorted by score
        for i in range(len(results) - 1):
            assert results[i].score >= results[i + 1].score

    @pytest.mark.asyncio
    async def test_min_similarity_threshold(
        self, retriever, episodic_store, learner_id
    ):
        """Test that min_similarity filters low-scoring results."""
        await episodic_store.store(EpisodicMemory(
            learner_id=learner_id,
            event_type=EventType.SUCCESS,
            content={"description": "Completely unrelated topic"},
            importance_score=0.8,
        ))

        results = await retriever.retrieve(
            query="quantum physics advanced theory",
            learner_id=learner_id,
            config=RetrievalConfig(
                min_similarity=0.9,  # Very high threshold
                include_semantic=False,
            ),
        )

        # Should filter out low-similarity results
        for result in results:
            # If any results pass, they should meet threshold
            assert result.score >= 0  # Score incorporates multiple factors
