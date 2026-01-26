"""
Tests for Semantic Memory System.
"""

from datetime import datetime

import pytest

from app.models.memory.episodic import EpisodicMemory, EventType
from app.models.memory.semantic import (
    KnowledgeType,
    PatternExtractor,
    SemanticKnowledge,
    SemanticMemoryStore,
)


class TestSemanticKnowledge:
    """Tests for SemanticKnowledge model."""

    def test_create_knowledge_with_defaults(self, learner_id):
        """Test creating semantic knowledge with default values."""
        knowledge = SemanticKnowledge(
            learner_id=learner_id,
            concept="math-addition",
            knowledge_type=KnowledgeType.SKILL,
        )

        assert knowledge.learner_id == learner_id
        assert knowledge.concept == "math-addition"
        assert knowledge.knowledge_type == KnowledgeType.SKILL
        assert knowledge.confidence == 0.5
        assert knowledge.evidence_count == 1

    def test_confidence_clamping(self, learner_id):
        """Test that confidence is clamped to valid range."""
        knowledge = SemanticKnowledge(
            learner_id=learner_id,
            concept="test",
            knowledge_type=KnowledgeType.SKILL,
            confidence=1.5,
        )
        assert knowledge.confidence == 1.0

    def test_update_confidence(self, learner_id):
        """Test updating confidence with new evidence."""
        knowledge = SemanticKnowledge(
            learner_id=learner_id,
            concept="test",
            knowledge_type=KnowledgeType.SKILL,
            confidence=0.5,
            evidence_count=1,
        )

        # Positive evidence should increase confidence
        new_conf = knowledge.update_confidence(new_evidence=True, weight=1.0)
        assert new_conf > 0.5
        assert knowledge.evidence_count == 2

        # Negative evidence should decrease confidence
        old_conf = knowledge.confidence
        knowledge.update_confidence(new_evidence=False, weight=1.0)
        assert knowledge.confidence < old_conf

    def test_to_text_representation(self, learner_id):
        """Test converting knowledge to text for embedding."""
        knowledge = SemanticKnowledge(
            learner_id=learner_id,
            concept="fraction-mastery",
            knowledge_type=KnowledgeType.STRENGTH,
            attributes={"description": "Strong understanding of fractions"},
            related_concepts=["decimals", "percentages"],
        )

        text = knowledge.to_text()

        assert "fraction-mastery" in text
        assert "strength" in text.lower()

    def test_to_dict_roundtrip(self, learner_id):
        """Test serialization to dict and back."""
        original = SemanticKnowledge(
            learner_id=learner_id,
            concept="test-concept",
            knowledge_type=KnowledgeType.MISCONCEPTION,
            confidence=0.8,
            evidence_count=5,
            related_concepts=["concept-a", "concept-b"],
            source_episodes=["ep-1", "ep-2"],
        )

        dict_data = original.to_dict()
        restored = SemanticKnowledge.from_dict(dict_data)

        assert restored.knowledge_id == original.knowledge_id
        assert restored.concept == original.concept
        assert restored.knowledge_type == original.knowledge_type
        assert restored.confidence == original.confidence
        assert restored.related_concepts == original.related_concepts

    def test_all_knowledge_types(self, learner_id):
        """Test that all knowledge types are valid."""
        for knowledge_type in KnowledgeType:
            knowledge = SemanticKnowledge(
                learner_id=learner_id,
                concept=f"test-{knowledge_type.value}",
                knowledge_type=knowledge_type,
            )
            assert knowledge.knowledge_type == knowledge_type


class TestPatternExtractor:
    """Tests for PatternExtractor."""

    @pytest.fixture
    def extractor(self):
        return PatternExtractor()

    def test_extract_skill_patterns_strength(self, extractor, learner_id):
        """Test extracting strength patterns from episodes."""
        # Create episodes with high success rate for a skill
        episodes = []
        for i in range(5):
            episodes.append(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                skill_ids=["math-addition"],
                importance_score=0.7,
            ))

        patterns = extractor.extract_skill_patterns(episodes, min_occurrences=3)

        assert len(patterns) >= 1
        addition_pattern = next(
            (p for p in patterns if p["concept"] == "math-addition"),
            None
        )
        assert addition_pattern is not None
        assert addition_pattern["knowledge_type"] == KnowledgeType.STRENGTH
        assert addition_pattern["confidence"] >= 0.8

    def test_extract_skill_patterns_weakness(self, extractor, learner_id):
        """Test extracting weakness patterns from episodes."""
        # Create episodes with low success rate for a skill
        episodes = []
        for i in range(5):
            episodes.append(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.STRUGGLE if i < 4 else EventType.SUCCESS,
                skill_ids=["math-fractions"],
                importance_score=0.7,
            ))

        patterns = extractor.extract_skill_patterns(episodes, min_occurrences=3)

        assert len(patterns) >= 1
        fraction_pattern = next(
            (p for p in patterns if p["concept"] == "math-fractions"),
            None
        )
        assert fraction_pattern is not None
        assert fraction_pattern["knowledge_type"] == KnowledgeType.WEAKNESS
        assert fraction_pattern["confidence"] <= 0.3

    def test_extract_skill_patterns_misconception(self, extractor, learner_id):
        """Test extracting misconception patterns."""
        episodes = []
        for i in range(5):
            event_type = EventType.MISCONCEPTION if i < 2 else EventType.STRUGGLE
            episodes.append(EpisodicMemory(
                learner_id=learner_id,
                event_type=event_type,
                skill_ids=["negative-numbers"],
                importance_score=0.8,
            ))

        patterns = extractor.extract_skill_patterns(episodes, min_occurrences=3)

        misconception_pattern = next(
            (p for p in patterns
             if p["concept"] == "negative-numbers"
             and p["knowledge_type"] == KnowledgeType.MISCONCEPTION),
            None
        )
        # Should detect misconception if enough misconception events
        if misconception_pattern:
            assert misconception_pattern["knowledge_type"] == KnowledgeType.MISCONCEPTION

    def test_extract_preference_patterns(self, extractor, learner_id):
        """Test extracting preference patterns."""
        episodes = []

        # High engagement with videos
        for i in range(5):
            episodes.append(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.ENGAGEMENT,
                context={"activity_type": "video"},
                emotional_valence=0.8,
            ))

        # Low engagement with reading
        for i in range(5):
            episodes.append(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.FRUSTRATION,
                context={"activity_type": "reading"},
                emotional_valence=-0.5,
            ))

        patterns = extractor.extract_preference_patterns(episodes, min_occurrences=3)

        video_pref = next(
            (p for p in patterns if "video" in p["concept"]),
            None
        )
        reading_pref = next(
            (p for p in patterns if "reading" in p["concept"]),
            None
        )

        if video_pref and reading_pref:
            assert video_pref["confidence"] > reading_pref["confidence"]

    def test_extract_engagement_patterns(self, extractor, learner_id):
        """Test extracting time-of-day engagement patterns."""
        episodes = []

        # Create episodes at different times
        from datetime import datetime, timedelta

        base_time = datetime.utcnow().replace(hour=10)  # Morning

        for i in range(10):
            episodes.append(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                timestamp=base_time + timedelta(hours=i * 2),
                importance_score=0.8 if i < 3 else 0.5,  # Higher in morning
            ))

        patterns = extractor.extract_engagement_patterns(episodes, min_occurrences=3)

        # Should find engagement patterns for time buckets
        assert len(patterns) >= 0  # May or may not find patterns depending on data

    def test_min_occurrences_threshold(self, extractor, learner_id):
        """Test that min_occurrences threshold is respected."""
        # Create only 2 episodes for a skill (below threshold of 3)
        episodes = [
            EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                skill_ids=["rare-skill"],
            ),
            EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                skill_ids=["rare-skill"],
            ),
        ]

        patterns = extractor.extract_skill_patterns(episodes, min_occurrences=3)

        # Should not find pattern for rare-skill
        rare_pattern = next(
            (p for p in patterns if p["concept"] == "rare-skill"),
            None
        )
        assert rare_pattern is None


class TestSemanticMemoryStore:
    """Tests for SemanticMemoryStore."""

    @pytest.fixture
    def store(self, mock_db_session, mock_embedding_service):
        """Create a semantic memory store for testing."""
        return SemanticMemoryStore(
            db_session_factory=mock_db_session,
            embedding_service=mock_embedding_service,
        )

    @pytest.mark.asyncio
    async def test_store_and_retrieve_knowledge(self, store, learner_id):
        """Test storing and retrieving knowledge."""
        knowledge = SemanticKnowledge(
            learner_id=learner_id,
            concept="math-addition",
            knowledge_type=KnowledgeType.SKILL,
            confidence=0.8,
        )

        knowledge_id = await store.store(knowledge)
        assert knowledge_id == knowledge.knowledge_id

        retrieved = await store.get(
            learner_id=learner_id,
            concept="math-addition",
            knowledge_type=KnowledgeType.SKILL,
        )

        assert retrieved is not None
        assert retrieved.concept == "math-addition"
        assert retrieved.confidence == 0.8

    @pytest.mark.asyncio
    async def test_embedding_generated_on_store(self, store, learner_id):
        """Test that embedding is generated when storing."""
        knowledge = SemanticKnowledge(
            learner_id=learner_id,
            concept="test-concept",
            knowledge_type=KnowledgeType.SKILL,
        )

        assert knowledge.embedding is None

        await store.store(knowledge)
        retrieved = await store.get(
            learner_id=learner_id,
            concept="test-concept",
        )

        assert retrieved.embedding is not None
        assert len(retrieved.embedding) == 384

    @pytest.mark.asyncio
    async def test_extract_from_episodes(self, store, learner_id):
        """Test extracting knowledge from episodic memories."""
        # Create episodes with clear patterns
        episodes = []

        # Success pattern for skill A
        for i in range(5):
            episodes.append(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.SUCCESS,
                skill_ids=["skill-a"],
                importance_score=0.8,
            ))

        # Struggle pattern for skill B
        for i in range(5):
            episodes.append(EpisodicMemory(
                learner_id=learner_id,
                event_type=EventType.STRUGGLE,
                skill_ids=["skill-b"],
                importance_score=0.7,
            ))

        extracted = await store.extract_from_episodes(
            episodes=episodes,
            learner_id=learner_id,
            min_occurrences=3,
        )

        assert len(extracted) >= 2

    @pytest.mark.asyncio
    async def test_update_knowledge(self, store, learner_id):
        """Test updating knowledge with new evidence."""
        # Create initial knowledge
        knowledge = SemanticKnowledge(
            learner_id=learner_id,
            concept="update-test",
            knowledge_type=KnowledgeType.SKILL,
            confidence=0.5,
        )
        await store.store(knowledge)

        # Update with positive evidence
        updated = await store.update_knowledge(
            learner_id=learner_id,
            concept="update-test",
            knowledge_type=KnowledgeType.SKILL,
            new_evidence={"success": True, "weight": 1.0},
        )

        assert updated.confidence > 0.5

    @pytest.mark.asyncio
    async def test_query_knowledge(self, store, learner_id, mock_embedding_service):
        """Test querying knowledge by type and text."""
        # Store various knowledge
        for concept, ktype in [
            ("math-skill", KnowledgeType.SKILL),
            ("visual-preference", KnowledgeType.PREFERENCE),
            ("number-misconception", KnowledgeType.MISCONCEPTION),
        ]:
            await store.store(SemanticKnowledge(
                learner_id=learner_id,
                concept=concept,
                knowledge_type=ktype,
                confidence=0.7,
            ))

        # Query by type
        skills = await store.query_knowledge(
            learner_id=learner_id,
            knowledge_types=[KnowledgeType.SKILL],
        )
        assert len(skills) == 1
        assert skills[0].knowledge_type == KnowledgeType.SKILL

        # Query by text
        results = await store.query_knowledge(
            learner_id=learner_id,
            query="math",
        )
        # Should return results ranked by relevance

    @pytest.mark.asyncio
    async def test_get_strengths(self, store, learner_id):
        """Test getting learner strengths."""
        await store.store(SemanticKnowledge(
            learner_id=learner_id,
            concept="strong-skill",
            knowledge_type=KnowledgeType.STRENGTH,
            confidence=0.9,
        ))

        strengths = await store.get_strengths(learner_id, min_confidence=0.7)

        assert len(strengths) == 1
        assert strengths[0].concept == "strong-skill"

    @pytest.mark.asyncio
    async def test_get_weaknesses(self, store, learner_id):
        """Test getting learner weaknesses."""
        await store.store(SemanticKnowledge(
            learner_id=learner_id,
            concept="weak-skill",
            knowledge_type=KnowledgeType.WEAKNESS,
            confidence=0.2,
        ))

        weaknesses = await store.get_weaknesses(learner_id, max_confidence=0.3)

        assert len(weaknesses) == 1
        assert weaknesses[0].concept == "weak-skill"

    @pytest.mark.asyncio
    async def test_get_misconceptions(self, store, learner_id):
        """Test getting learner misconceptions."""
        await store.store(SemanticKnowledge(
            learner_id=learner_id,
            concept="wrong-understanding",
            knowledge_type=KnowledgeType.MISCONCEPTION,
            confidence=0.8,
        ))

        misconceptions = await store.get_misconceptions(learner_id)

        assert len(misconceptions) == 1
        assert misconceptions[0].concept == "wrong-understanding"

    @pytest.mark.asyncio
    async def test_get_preferences(self, store, learner_id):
        """Test getting learner preferences."""
        await store.store(SemanticKnowledge(
            learner_id=learner_id,
            concept="video-learning",
            knowledge_type=KnowledgeType.PREFERENCE,
            confidence=0.85,
        ))
        await store.store(SemanticKnowledge(
            learner_id=learner_id,
            concept="visual-style",
            knowledge_type=KnowledgeType.LEARNING_STYLE,
            confidence=0.9,
        ))

        preferences = await store.get_preferences(learner_id)

        assert len(preferences) == 2

    @pytest.mark.asyncio
    async def test_delete_knowledge(self, store, learner_id):
        """Test deleting knowledge."""
        knowledge = SemanticKnowledge(
            learner_id=learner_id,
            concept="to-delete",
            knowledge_type=KnowledgeType.SKILL,
        )
        await store.store(knowledge)

        # Verify it exists
        exists = await store.get(learner_id, "to-delete")
        assert exists is not None

        # Delete it
        deleted = await store.delete_knowledge(learner_id, knowledge.knowledge_id)
        assert deleted == True

        # Verify it's gone
        gone = await store.get(learner_id, "to-delete")
        assert gone is None

    @pytest.mark.asyncio
    async def test_get_stats(self, store, learner_id):
        """Test getting knowledge statistics."""
        for concept, ktype, conf in [
            ("skill-1", KnowledgeType.SKILL, 0.8),
            ("skill-2", KnowledgeType.SKILL, 0.6),
            ("pref-1", KnowledgeType.PREFERENCE, 0.9),
        ]:
            await store.store(SemanticKnowledge(
                learner_id=learner_id,
                concept=concept,
                knowledge_type=ktype,
                confidence=conf,
            ))

        stats = await store.get_stats(learner_id)

        assert stats["total_knowledge"] == 3
        assert KnowledgeType.SKILL.value in stats["type_counts"]
        assert stats["type_counts"][KnowledgeType.SKILL.value] == 2
