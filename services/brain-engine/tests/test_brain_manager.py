"""
Comprehensive tests for Brain Manager service.

Tests all brain state management including:
- Knowledge graph operations
- Mastery level tracking
- Learning pattern recognition
- Engagement profiling
- Personalized recommendations
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from src.services.brain_manager import (
    KnowledgeNode,
    KnowledgeEdge,
    KnowledgeGraph,
    LearningPatterns,
    MasteryLevel,
    EngagementProfile,
    AdaptiveParameters,
    CurriculumAlignment,
    BrainState,
    LearnerBrainManager,
    get_brain_manager,
)


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def sample_knowledge_node():
    """Create a sample knowledge node."""
    return KnowledgeNode(
        id="math-addition",
        type="concept",
        mastery=0.75,
        last_updated=datetime.now(timezone.utc),
        metadata={"subject": "math", "grade_level": 3},
    )


@pytest.fixture
def sample_knowledge_graph():
    """Create a sample knowledge graph with nodes and edges."""
    graph = KnowledgeGraph()
    
    # Add subject nodes
    graph.add_node(KnowledgeNode(id="math", type="subject", mastery=0.7))
    graph.add_node(KnowledgeNode(id="reading", type="subject", mastery=0.8))
    
    # Add concept nodes
    graph.add_node(KnowledgeNode(id="addition", type="concept", mastery=0.8))
    graph.add_node(KnowledgeNode(id="subtraction", type="concept", mastery=0.6))
    graph.add_node(KnowledgeNode(id="multiplication", type="concept", mastery=0.4))
    
    # Add edges (prerequisites)
    graph.add_edge(KnowledgeEdge(source="addition", target="subtraction", relationship="prerequisite"))
    graph.add_edge(KnowledgeEdge(source="subtraction", target="multiplication", relationship="prerequisite"))
    graph.add_edge(KnowledgeEdge(source="math", target="addition", relationship="contains"))
    
    return graph


@pytest.fixture
def sample_brain_state():
    """Create a sample brain state."""
    return BrainState(
        learner_id="test-learner-123",
        knowledge_graph=KnowledgeGraph(),
        learning_patterns=LearningPatterns(
            preferred_modality="visual",
            optimal_session_length=25,
            best_time_of_day="morning",
        ),
        mastery_levels={
            "math": MasteryLevel(
                current_level=0.7,
                target_level=0.8,
                practice_count=10,
                streak=3,
            ),
            "reading": MasteryLevel(
                current_level=0.85,
                target_level=0.8,
                practice_count=15,
                streak=5,
            ),
        },
        engagement_profile=EngagementProfile(
            favorite_subjects=["math"],
            struggle_subjects=["writing"],
            average_engagement_score=0.75,
            total_time_spent=3600,
        ),
    )


@pytest.fixture
def sample_baseline_assessment():
    """Create a sample baseline assessment."""
    return {
        "strengths": ["math", "science"],
        "weaknesses": ["writing"],
        "learning_style": "visual",
        "subject_scores": {
            "math": 80,
            "reading": 70,
            "writing": 50,
            "science": 75,
        },
        "concept_results": [
            {"concept_id": "addition", "subject": "math", "score": 90, "grade_level": 3},
            {"concept_id": "subtraction", "subject": "math", "score": 75, "grade_level": 3},
            {"name": "fractions", "subject": "math", "score": 60, "grade_level": 4},
        ],
        "prerequisites": [
            {"from": "addition", "to": "subtraction", "strength": 1.0},
            {"from": "subtraction", "to": "fractions", "strength": 0.8},
        ],
    }


@pytest.fixture
def mock_supabase():
    """Create a mock Supabase client."""
    mock = MagicMock()
    mock.table.return_value = mock
    mock.select.return_value = mock
    mock.insert.return_value = mock
    mock.update.return_value = mock
    mock.delete.return_value = mock
    mock.eq.return_value = mock
    mock.single.return_value = mock
    mock.execute = AsyncMock(return_value=MagicMock(data=None))
    return mock


@pytest.fixture
def brain_manager(mock_supabase):
    """Create a BrainManager instance with mocked database."""
    return LearnerBrainManager(mock_supabase)


# =============================================================================
# KnowledgeNode Tests
# =============================================================================


class TestKnowledgeNode:
    """Tests for KnowledgeNode model."""

    def test_create_default_node(self):
        """Test creating a node with defaults."""
        node = KnowledgeNode(id="test-node")
        assert node.id == "test-node"
        assert node.type == "concept"
        assert node.mastery == 0.0
        assert node.metadata == {}

    def test_create_node_with_values(self, sample_knowledge_node):
        """Test creating a node with custom values."""
        assert sample_knowledge_node.id == "math-addition"
        assert sample_knowledge_node.type == "concept"
        assert sample_knowledge_node.mastery == 0.75
        assert sample_knowledge_node.metadata["subject"] == "math"

    def test_mastery_bounds(self):
        """Test that mastery is bounded 0-1."""
        node = KnowledgeNode(id="test", mastery=0.0)
        assert node.mastery == 0.0
        
        node = KnowledgeNode(id="test", mastery=1.0)
        assert node.mastery == 1.0

    def test_invalid_mastery_raises(self):
        """Test that invalid mastery raises validation error."""
        with pytest.raises(ValueError):
            KnowledgeNode(id="test", mastery=1.5)
        
        with pytest.raises(ValueError):
            KnowledgeNode(id="test", mastery=-0.1)


# =============================================================================
# KnowledgeEdge Tests
# =============================================================================


class TestKnowledgeEdge:
    """Tests for KnowledgeEdge model."""

    def test_create_default_edge(self):
        """Test creating an edge with defaults."""
        edge = KnowledgeEdge(source="a", target="b")
        assert edge.source == "a"
        assert edge.target == "b"
        assert edge.relationship == "prerequisite"
        assert edge.weight == 1.0

    def test_create_edge_with_values(self):
        """Test creating an edge with custom values."""
        edge = KnowledgeEdge(
            source="addition",
            target="multiplication",
            relationship="builds_on",
            weight=0.8,
        )
        assert edge.relationship == "builds_on"
        assert edge.weight == 0.8


# =============================================================================
# KnowledgeGraph Tests
# =============================================================================


class TestKnowledgeGraph:
    """Tests for KnowledgeGraph operations."""

    def test_add_new_node(self):
        """Test adding a new node to graph."""
        graph = KnowledgeGraph()
        node = KnowledgeNode(id="test", mastery=0.5)
        
        graph.add_node(node)
        
        assert len(graph.nodes) == 1
        assert graph.nodes[0].id == "test"

    def test_update_existing_node(self):
        """Test updating an existing node in graph."""
        graph = KnowledgeGraph()
        graph.add_node(KnowledgeNode(id="test", mastery=0.3))
        
        # Update with new values
        updated_node = KnowledgeNode(id="test", mastery=0.7, metadata={"new": "data"})
        graph.add_node(updated_node)
        
        assert len(graph.nodes) == 1
        assert graph.nodes[0].mastery == 0.7
        assert graph.nodes[0].metadata["new"] == "data"

    def test_add_edge(self):
        """Test adding an edge to graph."""
        graph = KnowledgeGraph()
        edge = KnowledgeEdge(source="a", target="b")
        
        graph.add_edge(edge)
        
        assert len(graph.edges) == 1
        assert graph.edges[0].source == "a"

    def test_add_duplicate_edge_ignored(self):
        """Test that duplicate edges are not added."""
        graph = KnowledgeGraph()
        graph.add_edge(KnowledgeEdge(source="a", target="b"))
        graph.add_edge(KnowledgeEdge(source="a", target="b"))
        
        assert len(graph.edges) == 1

    def test_get_node_found(self, sample_knowledge_graph):
        """Test getting an existing node."""
        node = sample_knowledge_graph.get_node("math")
        
        assert node is not None
        assert node.id == "math"
        assert node.type == "subject"

    def test_get_node_not_found(self, sample_knowledge_graph):
        """Test getting a non-existent node."""
        node = sample_knowledge_graph.get_node("nonexistent")
        
        assert node is None

    def test_get_prerequisites(self, sample_knowledge_graph):
        """Test getting prerequisites for a node."""
        prereqs = sample_knowledge_graph.get_prerequisites("subtraction")
        
        assert prereqs == ["addition"]

    def test_get_prerequisites_empty(self, sample_knowledge_graph):
        """Test getting prerequisites for node with none."""
        prereqs = sample_knowledge_graph.get_prerequisites("addition")
        
        assert prereqs == []

    def test_to_dict(self, sample_knowledge_graph):
        """Test converting graph to dictionary."""
        result = sample_knowledge_graph.to_dict()
        
        assert "nodes" in result
        assert "edges" in result
        assert len(result["nodes"]) == 5
        assert len(result["edges"]) == 3


# =============================================================================
# LearningPatterns Tests
# =============================================================================


class TestLearningPatterns:
    """Tests for LearningPatterns model."""

    def test_create_default_patterns(self):
        """Test creating patterns with defaults."""
        patterns = LearningPatterns()
        
        assert patterns.preferred_modality == "visual"
        assert patterns.optimal_session_length == 25
        assert patterns.difficulty_preference == "adaptive"
        assert patterns.retention_rate == 0.7

    def test_create_patterns_with_values(self):
        """Test creating patterns with custom values."""
        patterns = LearningPatterns(
            preferred_modality="auditory",
            optimal_session_length=30,
            best_time_of_day="evening",
            response_time_profile={"math": 5.5},
        )
        
        assert patterns.preferred_modality == "auditory"
        assert patterns.optimal_session_length == 30
        assert patterns.response_time_profile["math"] == 5.5


# =============================================================================
# MasteryLevel Tests
# =============================================================================


class TestMasteryLevel:
    """Tests for MasteryLevel model."""

    def test_create_default_mastery(self):
        """Test creating mastery with defaults."""
        mastery = MasteryLevel()
        
        assert mastery.current_level == 0.0
        assert mastery.target_level == 0.8
        assert mastery.streak == 0
        assert mastery.spaced_repetition_interval == 1

    def test_create_mastery_with_values(self):
        """Test creating mastery with custom values."""
        now = datetime.now(timezone.utc)
        mastery = MasteryLevel(
            current_level=0.75,
            target_level=0.9,
            last_practiced=now,
            practice_count=20,
            streak=5,
            best_streak=10,
        )
        
        assert mastery.current_level == 0.75
        assert mastery.practice_count == 20
        assert mastery.best_streak == 10


# =============================================================================
# EngagementProfile Tests
# =============================================================================


class TestEngagementProfile:
    """Tests for EngagementProfile model."""

    def test_create_default_profile(self):
        """Test creating profile with defaults."""
        profile = EngagementProfile()
        
        assert profile.favorite_subjects == []
        assert profile.average_engagement_score == 0.5
        assert profile.total_time_spent == 0

    def test_create_profile_with_values(self):
        """Test creating profile with custom values."""
        profile = EngagementProfile(
            favorite_subjects=["math", "science"],
            struggle_subjects=["writing"],
            game_preferences=["quiz_game", "puzzle_game"],
            activity_completions={"lesson": 10, "quiz": 5},
        )
        
        assert "math" in profile.favorite_subjects
        assert profile.activity_completions["lesson"] == 10


# =============================================================================
# BrainState Tests
# =============================================================================


class TestBrainState:
    """Tests for BrainState model."""

    def test_create_brain_state(self, sample_brain_state):
        """Test creating a brain state."""
        assert sample_brain_state.learner_id == "test-learner-123"
        assert sample_brain_state.version == "1.0"
        assert len(sample_brain_state.mastery_levels) == 2

    def test_to_dict(self, sample_brain_state):
        """Test converting brain state to dictionary."""
        result = sample_brain_state.to_dict()
        
        assert result["learner_id"] == "test-learner-123"
        assert "knowledge_graph" in result
        assert "learning_patterns" in result
        assert "mastery_levels" in result
        assert "engagement_profile" in result


# =============================================================================
# LearnerBrainManager Tests
# =============================================================================


class TestLearnerBrainManager:
    """Tests for LearnerBrainManager class."""

    @pytest.mark.asyncio
    async def test_initialize_brain(self, brain_manager, sample_baseline_assessment, mock_supabase):
        """Test initializing a new brain from assessment."""
        mock_supabase.execute = AsyncMock(return_value=MagicMock(data=None))
        
        result = await brain_manager.initialize_brain(
            learner_id="new-learner-123",
            baseline_assessment=sample_baseline_assessment,
        )
        
        assert result["learner_id"] == "new-learner-123"
        assert "math" in result["mastery_levels"]
        assert result["mastery_levels"]["math"]["current_level"] == 0.8
        
        # Verify database insert was called
        mock_supabase.table.assert_called_with("learner_brain_states")

    @pytest.mark.asyncio
    async def test_initialize_brain_builds_knowledge_graph(self, brain_manager, sample_baseline_assessment):
        """Test that initialize_brain correctly builds knowledge graph."""
        result = await brain_manager.initialize_brain(
            learner_id="test-learner",
            baseline_assessment=sample_baseline_assessment,
        )
        
        kg = result["knowledge_graph"]
        assert len(kg["nodes"]) > 0
        
        # Check subject nodes exist
        node_ids = [n["id"] for n in kg["nodes"]]
        assert "math" in node_ids
        assert "reading" in node_ids
        
        # Check edges exist
        assert len(kg["edges"]) > 0

    @pytest.mark.asyncio
    async def test_get_brain_from_cache(self, brain_manager, sample_brain_state):
        """Test getting brain state from cache."""
        # Pre-populate cache
        brain_manager._cache["test-learner-123"] = sample_brain_state
        
        result = await brain_manager.get_brain("test-learner-123")
        
        assert result is not None
        assert result.learner_id == "test-learner-123"

    @pytest.mark.asyncio
    async def test_get_brain_from_database(self, brain_manager, mock_supabase, sample_brain_state):
        """Test getting brain state from database when not in cache."""
        # Setup mock response
        brain_dict = sample_brain_state.to_dict()
        mock_supabase.execute = AsyncMock(
            return_value=MagicMock(data={"model_state": brain_dict})
        )
        
        result = await brain_manager.get_brain("test-learner-123")
        
        assert result is not None
        assert result.learner_id == "test-learner-123"

    @pytest.mark.asyncio
    async def test_get_brain_not_found(self, brain_manager, mock_supabase):
        """Test getting non-existent brain state."""
        mock_supabase.execute = AsyncMock(return_value=MagicMock(data=None))
        
        result = await brain_manager.get_brain("nonexistent-learner")
        
        assert result is None

    @pytest.mark.asyncio
    async def test_update_brain(self, brain_manager, sample_brain_state, mock_supabase):
        """Test updating brain with activity data."""
        brain_manager._cache["test-learner-123"] = sample_brain_state
        mock_supabase.execute = AsyncMock(return_value=MagicMock(data=None))
        
        activity_data = {
            "subject": "math",
            "accuracy": 0.9,
            "time_spent": 300,
            "engagement": 0.8,
            "completed": True,
        }
        
        result = await brain_manager.update_brain("test-learner-123", activity_data)
        
        assert result is not None
        # Mastery should have increased
        assert result["mastery_levels"]["math"]["current_level"] >= 0.7

    @pytest.mark.asyncio
    async def test_update_brain_not_found(self, brain_manager, mock_supabase):
        """Test updating non-existent brain raises error."""
        mock_supabase.execute = AsyncMock(return_value=MagicMock(data=None))
        
        with pytest.raises(ValueError, match="Brain not found"):
            await brain_manager.update_brain("nonexistent", {"subject": "math"})

    @pytest.mark.asyncio
    async def test_get_personalized_recommendations(self, brain_manager, sample_brain_state):
        """Test generating personalized recommendations."""
        # Setup brain state with low mastery subject
        sample_brain_state.mastery_levels["writing"] = MasteryLevel(
            current_level=0.4,
            target_level=0.8,
            last_practiced=datetime.now(timezone.utc) - timedelta(days=5),
            spaced_repetition_interval=3,
        )
        brain_manager._cache["test-learner-123"] = sample_brain_state
        
        recommendations = await brain_manager.get_personalized_recommendations("test-learner-123")
        
        assert len(recommendations) > 0
        assert len(recommendations) <= 5
        
        # Should have practice recommendation for writing
        practice_recs = [r for r in recommendations if r["type"] == "practice"]
        assert len(practice_recs) > 0

    @pytest.mark.asyncio
    async def test_get_recommendations_includes_review(self, brain_manager, sample_brain_state):
        """Test that overdue subjects get review recommendations."""
        # Set last practiced to long ago
        sample_brain_state.mastery_levels["math"].last_practiced = (
            datetime.now(timezone.utc) - timedelta(days=10)
        )
        sample_brain_state.mastery_levels["math"].spaced_repetition_interval = 3
        brain_manager._cache["test-learner-123"] = sample_brain_state
        
        recommendations = await brain_manager.get_personalized_recommendations("test-learner-123")
        
        review_recs = [r for r in recommendations if r["type"] == "review"]
        assert len(review_recs) > 0
        assert review_recs[0]["subject"] == "math"

    @pytest.mark.asyncio
    async def test_get_brain_insights(self, brain_manager, sample_brain_state):
        """Test getting brain insights."""
        brain_manager._cache["test-learner-123"] = sample_brain_state
        
        insights = await brain_manager.get_brain_insights("test-learner-123")
        
        assert insights["learner_id"] == "test-learner-123"
        assert "overall_mastery" in insights
        assert "strongest_subjects" in insights
        assert "weakest_subjects" in insights
        assert insights["preferred_learning_style"] == "visual"

    @pytest.mark.asyncio
    async def test_get_brain_insights_not_found(self, brain_manager, mock_supabase):
        """Test getting insights for non-existent brain."""
        mock_supabase.execute = AsyncMock(return_value=MagicMock(data=None))
        
        insights = await brain_manager.get_brain_insights("nonexistent")
        
        assert insights == {}

    @pytest.mark.asyncio
    async def test_reset_brain(self, brain_manager, sample_brain_state, mock_supabase):
        """Test resetting brain state."""
        brain_manager._cache["test-learner-123"] = sample_brain_state
        mock_supabase.execute = AsyncMock(return_value=MagicMock(data=None))
        
        result = await brain_manager.reset_brain("test-learner-123")
        
        assert result is True
        assert "test-learner-123" not in brain_manager._cache
        mock_supabase.delete.assert_called()


# =============================================================================
# Internal Method Tests
# =============================================================================


class TestBrainManagerInternalMethods:
    """Tests for internal helper methods."""

    def test_build_knowledge_graph(self, brain_manager, sample_baseline_assessment):
        """Test knowledge graph construction from assessment."""
        graph = brain_manager._build_knowledge_graph(sample_baseline_assessment)
        
        assert isinstance(graph, KnowledgeGraph)
        assert len(graph.nodes) >= 4  # Subjects
        assert len(graph.edges) >= 2  # Prerequisites

    def test_init_mastery_levels(self, brain_manager, sample_baseline_assessment):
        """Test mastery level initialization."""
        mastery = brain_manager._init_mastery_levels(sample_baseline_assessment)
        
        assert "math" in mastery
        assert "reading" in mastery
        assert mastery["math"].current_level == 0.8
        assert mastery["writing"].current_level == 0.5

    def test_update_streak_and_bonus_high_accuracy(self, brain_manager):
        """Test streak update with high accuracy."""
        mastery = MasteryLevel(current_level=0.5, streak=2)
        
        new_level = brain_manager._update_streak_and_bonus(mastery, 0.85, 0.55)
        
        assert mastery.streak == 3
        assert new_level > 0.55  # Bonus applied

    def test_update_streak_and_bonus_low_accuracy(self, brain_manager):
        """Test streak reset with low accuracy."""
        mastery = MasteryLevel(current_level=0.5, streak=5, best_streak=5)
        
        new_level = brain_manager._update_streak_and_bonus(mastery, 0.4, 0.45)
        
        assert mastery.streak == 0
        assert mastery.best_streak == 5  # Best streak preserved
        assert new_level == 0.45  # No bonus

    def test_update_spaced_repetition_excellent(self, brain_manager):
        """Test spaced repetition interval increase for excellent performance."""
        mastery = MasteryLevel(spaced_repetition_interval=2)
        
        brain_manager._update_spaced_repetition(mastery, 0.95)
        
        assert mastery.spaced_repetition_interval == 4  # Doubled

    def test_update_spaced_repetition_poor(self, brain_manager):
        """Test spaced repetition interval reset for poor performance."""
        mastery = MasteryLevel(spaced_repetition_interval=7)
        
        brain_manager._update_spaced_repetition(mastery, 0.3)
        
        assert mastery.spaced_repetition_interval == 1  # Reset

    def test_calculate_suggested_difficulty_low_mastery(self, brain_manager):
        """Test difficulty suggestion for low mastery."""
        mastery = MasteryLevel(current_level=0.2, streak=0)
        params = AdaptiveParameters()
        
        difficulty = brain_manager._calculate_suggested_difficulty(mastery, params)
        
        assert difficulty == "easy"

    def test_calculate_suggested_difficulty_high_mastery_streak(self, brain_manager):
        """Test difficulty suggestion for high mastery with streak."""
        mastery = MasteryLevel(current_level=0.85, streak=6)
        params = AdaptiveParameters()
        
        difficulty = brain_manager._calculate_suggested_difficulty(mastery, params)
        
        assert difficulty == "advanced"


# =============================================================================
# Learning Pattern Update Tests
# =============================================================================


class TestLearningPatternUpdates:
    """Tests for learning pattern update methods."""

    def test_update_session_length(self, brain_manager):
        """Test optimal session length update."""
        patterns = LearningPatterns(optimal_session_length=25)
        activity = {
            "completed": True,
            "engagement": 0.8,
            "time_spent": 1800,  # 30 minutes in seconds
        }
        
        brain_manager._update_session_length(patterns, activity)
        
        # Should move toward 30 minutes
        assert patterns.optimal_session_length > 25

    def test_update_session_length_incomplete_ignored(self, brain_manager):
        """Test that incomplete activities don't affect session length."""
        patterns = LearningPatterns(optimal_session_length=25)
        activity = {
            "completed": False,
            "engagement": 0.8,
            "time_spent": 1800,
        }
        
        brain_manager._update_session_length(patterns, activity)
        
        assert patterns.optimal_session_length == 25

    def test_update_response_time(self, brain_manager):
        """Test response time profile update."""
        patterns = LearningPatterns(response_time_profile={})
        activity = {
            "subject": "math",
            "time_spent": 300,
            "questions_answered": 10,
        }
        
        brain_manager._update_response_time(patterns, activity)
        
        assert "math" in patterns.response_time_profile
        assert patterns.response_time_profile["math"] == 30.0

    def test_update_best_time_of_day(self, brain_manager):
        """Test best time of day detection."""
        patterns = LearningPatterns()
        activity = {
            "timestamp": datetime(2024, 1, 15, 9, 30, tzinfo=timezone.utc),
            "engagement": 0.9,
        }
        
        brain_manager._update_best_time_of_day(patterns, activity)
        
        assert patterns.best_time_of_day == "morning"


# =============================================================================
# Engagement Profile Update Tests
# =============================================================================


class TestEngagementUpdates:
    """Tests for engagement profile update methods."""

    def test_track_activity_completion(self, brain_manager):
        """Test activity completion tracking."""
        profile = EngagementProfile()
        activity = {"activity_type": "quiz"}
        
        brain_manager._track_activity_completion(profile, activity)
        brain_manager._track_activity_completion(profile, activity)
        
        assert profile.activity_completions["quiz"] == 2

    def test_update_subject_preferences_favorite(self, brain_manager):
        """Test favorite subject detection."""
        profile = EngagementProfile()
        
        brain_manager._update_subject_preferences(profile, "math", 0.9, 0.85)
        
        assert "math" in profile.favorite_subjects

    def test_update_subject_preferences_struggle(self, brain_manager):
        """Test struggle subject detection."""
        profile = EngagementProfile()
        
        brain_manager._update_subject_preferences(profile, "writing", 0.2, 0.4)
        
        assert "writing" in profile.struggle_subjects

    def test_update_game_preferences(self, brain_manager):
        """Test game preference tracking."""
        profile = EngagementProfile()
        activity = {
            "activity_type": "math_game",
            "completed": True,
        }
        
        brain_manager._update_game_preferences(profile, activity)
        
        assert "math_game" in profile.game_preferences


# =============================================================================
# Global Service Instance Tests
# =============================================================================


class TestGetBrainManager:
    """Tests for global brain manager getter."""

    def test_get_brain_manager_requires_client_first_time(self):
        """Test that first call requires supabase client."""
        # Reset global instance
        import src.services.brain_manager as bm
        bm._brain_manager = None
        
        with pytest.raises(ValueError, match="Supabase client required"):
            get_brain_manager()

    def test_get_brain_manager_with_client(self, mock_supabase):
        """Test creating manager with client."""
        import src.services.brain_manager as bm
        bm._brain_manager = None
        
        manager = get_brain_manager(mock_supabase)
        
        assert manager is not None
        assert isinstance(manager, LearnerBrainManager)

    def test_get_brain_manager_returns_same_instance(self, mock_supabase):
        """Test that subsequent calls return same instance."""
        import src.services.brain_manager as bm
        bm._brain_manager = None
        
        manager1 = get_brain_manager(mock_supabase)
        manager2 = get_brain_manager()  # No client needed now
        
        assert manager1 is manager2


# =============================================================================
# CurriculumAlignment Tests
# =============================================================================


class TestCurriculumAlignment:
    """Tests for CurriculumAlignment model."""

    def test_create_default_alignment(self):
        """Test creating alignment with defaults."""
        alignment = CurriculumAlignment()
        
        assert alignment.state_code is None
        assert alignment.curriculum_standards == []

    def test_create_alignment_with_values(self):
        """Test creating alignment with values."""
        alignment = CurriculumAlignment(
            state_code="TX",
            zip_code="75001",
            nces_district_id="4812345",
            curriculum_standards=["TEKS", "CCSS"],
            aligned_skills=["math.3.1", "math.3.2"],
        )
        
        assert alignment.state_code == "TX"
        assert "TEKS" in alignment.curriculum_standards


# =============================================================================
# Edge Case Tests
# =============================================================================


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    @pytest.mark.asyncio
    async def test_initialize_brain_empty_assessment(self, brain_manager):
        """Test initializing brain with minimal assessment data."""
        result = await brain_manager.initialize_brain(
            learner_id="minimal-learner",
            baseline_assessment={},
        )
        
        assert result["learner_id"] == "minimal-learner"
        assert result["mastery_levels"] == {}

    @pytest.mark.asyncio
    async def test_update_brain_no_subject(self, brain_manager, sample_brain_state, mock_supabase):
        """Test updating brain without subject in activity."""
        brain_manager._cache["test-learner-123"] = sample_brain_state
        mock_supabase.execute = AsyncMock(return_value=MagicMock(data=None))
        
        activity_data = {
            "accuracy": 0.9,
            "time_spent": 300,
        }
        
        result = await brain_manager.update_brain("test-learner-123", activity_data)
        
        # Should still succeed without subject
        assert result is not None

    def test_dict_to_brain_state_with_string_dates(self, brain_manager):
        """Test converting dict with string dates to BrainState."""
        data = {
            "learner_id": "test",
            "version": "1.0",
            "created_at": "2024-01-15T10:30:00+00:00",
            "updated_at": "2024-01-15T11:00:00+00:00",
            "knowledge_graph": {"nodes": [], "edges": []},
            "learning_patterns": {},
            "mastery_levels": {},
            "engagement_profile": {},
            "adaptive_parameters": {},
        }
        
        brain_state = brain_manager._dict_to_brain_state(data)
        
        assert brain_state.learner_id == "test"
        assert isinstance(brain_state.created_at, datetime)

    @pytest.mark.asyncio
    async def test_recommendations_no_brain(self, brain_manager, mock_supabase):
        """Test getting recommendations for non-existent brain."""
        mock_supabase.execute = AsyncMock(return_value=MagicMock(data=None))
        
        recommendations = await brain_manager.get_personalized_recommendations("nonexistent")
        
        assert recommendations == []

    def test_mastery_and_graph_update_unknown_subject(self, brain_manager, sample_brain_state):
        """Test updating mastery for unknown subject does nothing."""
        original_levels = dict(sample_brain_state.mastery_levels)
        
        brain_manager._update_mastery_and_graph(
            sample_brain_state,
            "unknown_subject",
            0.9
        )
        
        # Mastery levels should be unchanged
        assert sample_brain_state.mastery_levels.keys() == original_levels.keys()
