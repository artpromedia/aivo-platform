"""
Tests for Student Model
"""
from datetime import datetime, timezone, timedelta
import pytest

from app.models.student_model import (
    ContentRecommendation,
    ContentType,
    KnowledgeState,
    LearningPath,
    LearningPathNode,
    LearningSession,
    SessionStatus,
    StudentAgeGroup,
    StudentProfile,
)


class TestKnowledgeState:
    """Test suite for KnowledgeState."""

    def test_init_default(self):
        """Test default initialization."""
        ks = KnowledgeState()
        assert ks.topic_mastery == {}
        assert ks.topic_confidence == {}
        assert ks.version == 1

    def test_get_mastery_empty(self):
        """Test getting mastery for unknown topic."""
        ks = KnowledgeState()
        assert ks.get_mastery("math") == 0.0

    def test_set_mastery(self):
        """Test setting mastery."""
        ks = KnowledgeState()
        ks.set_mastery("math", 0.75, confidence=0.8)
        assert ks.get_mastery("math") == 0.75
        assert ks.topic_confidence["math"] == 0.8
        assert ks.version == 2

    def test_set_mastery_clamping(self):
        """Test mastery clamping to [0, 1]."""
        ks = KnowledgeState()
        ks.set_mastery("math", 1.5)
        assert ks.get_mastery("math") == 1.0
        ks.set_mastery("reading", -0.5)
        assert ks.get_mastery("reading") == 0.0

    def test_update_mastery_correct(self):
        """Test updating mastery with correct answer."""
        ks = KnowledgeState()
        ks.set_mastery("math", 0.5, confidence=0.5)
        new_mastery = ks.update_mastery("math", delta=0.1, correct=True)
        assert new_mastery > 0.5
        assert ks.topic_confidence["math"] > 0.5

    def test_update_mastery_incorrect(self):
        """Test updating mastery with incorrect answer."""
        ks = KnowledgeState()
        ks.set_mastery("math", 0.5, confidence=0.5)
        new_mastery = ks.update_mastery("math", delta=0.1, correct=False)
        assert new_mastery < 0.5
        assert ks.topic_confidence["math"] < 0.5

    def test_get_average_mastery(self):
        """Test average mastery calculation."""
        ks = KnowledgeState()
        ks.set_mastery("math", 0.8)
        ks.set_mastery("reading", 0.6)
        ks.set_mastery("science", 0.4)
        assert ks.get_average_mastery() == pytest.approx(0.6, rel=0.01)

    def test_get_average_mastery_empty(self):
        """Test average mastery with no topics."""
        ks = KnowledgeState()
        assert ks.get_average_mastery() == 0.0

    def test_get_weak_topics(self):
        """Test identifying weak topics."""
        ks = KnowledgeState()
        ks.set_mastery("math", 0.8)
        ks.set_mastery("reading", 0.3)
        ks.set_mastery("science", 0.4)
        weak = ks.get_weak_topics(threshold=0.5)
        assert "reading" in weak
        assert "science" in weak
        assert "math" not in weak

    def test_get_strong_topics(self):
        """Test identifying strong topics."""
        ks = KnowledgeState()
        ks.set_mastery("math", 0.8)
        ks.set_mastery("reading", 0.3)
        ks.set_mastery("science", 0.75)
        strong = ks.get_strong_topics(threshold=0.7)
        assert "math" in strong
        assert "science" in strong
        assert "reading" not in strong

    def test_to_dict(self):
        """Test conversion to dictionary."""
        ks = KnowledgeState()
        ks.set_mastery("math", 0.7)
        data = ks.to_dict()
        assert data["topic_mastery"]["math"] == 0.7
        assert "average_mastery" in data
        assert "last_updated" in data

    def test_from_dict(self):
        """Test creation from dictionary."""
        data = {
            "topic_mastery": {"math": 0.7, "reading": 0.5},
            "topic_confidence": {"math": 0.8, "reading": 0.6},
            "version": 5,
        }
        ks = KnowledgeState.from_dict(data)
        assert ks.get_mastery("math") == 0.7
        assert ks.version == 5


class TestLearningSession:
    """Test suite for LearningSession."""

    def test_init_default(self):
        """Test default initialization."""
        session = LearningSession(student_id="student_1")
        assert session.student_id == "student_1"
        assert session.status == SessionStatus.ACTIVE
        assert session.items_completed == 0

    def test_get_duration(self):
        """Test duration calculation."""
        session = LearningSession()
        session.started_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        duration = session.get_duration_seconds()
        assert 590 < duration < 610  # About 10 minutes

    def test_get_accuracy(self):
        """Test accuracy calculation."""
        session = LearningSession()
        session.items_completed = 10
        session.items_correct = 7
        assert session.get_accuracy() == 0.7

    def test_get_accuracy_empty(self):
        """Test accuracy with no items."""
        session = LearningSession()
        assert session.get_accuracy() == 0.0

    def test_record_performance_correct(self):
        """Test recording correct answer."""
        session = LearningSession()
        session.record_performance(correct=True, response_time=5.0)
        assert session.items_completed == 1
        assert session.items_correct == 1
        assert session.consecutive_failures == 0

    def test_record_performance_incorrect(self):
        """Test recording incorrect answer."""
        session = LearningSession()
        session.record_performance(correct=False, response_time=5.0)
        assert session.items_completed == 1
        assert session.items_correct == 0
        assert session.consecutive_failures == 1

    def test_consecutive_failures_reset(self):
        """Test consecutive failures reset on correct."""
        session = LearningSession()
        session.record_performance(correct=False, response_time=5.0)
        session.record_performance(correct=False, response_time=5.0)
        assert session.consecutive_failures == 2
        session.record_performance(correct=True, response_time=5.0)
        assert session.consecutive_failures == 0

    def test_needs_intervention(self):
        """Test intervention detection."""
        session = LearningSession()
        session.max_consecutive_failures = 3
        for _ in range(3):
            session.record_performance(correct=False, response_time=5.0)
        assert session.needs_intervention()

    def test_update_engagement(self):
        """Test engagement update."""
        session = LearningSession()
        session.update_engagement(0.8)
        session.update_engagement(0.6)
        assert session.engagement_history == [0.8, 0.6]
        assert session.get_current_engagement() == 0.6

    def test_can_explore_minor(self):
        """Test exploration limit for minors."""
        session = LearningSession()
        session.max_exploration_actions = 5
        for _ in range(5):
            session.record_exploration_action()
        assert not session.can_explore(is_minor=True)
        assert session.can_explore(is_minor=False)

    def test_is_expired(self):
        """Test session expiration."""
        session = LearningSession()
        session.max_session_duration = 1800
        session.started_at = datetime.now(timezone.utc) - timedelta(hours=1)
        assert session.is_expired()

    def test_end_session(self):
        """Test ending session."""
        session = LearningSession()
        session.end_session(SessionStatus.COMPLETED)
        assert session.status == SessionStatus.COMPLETED
        assert session.ended_at is not None

    def test_to_dict(self):
        """Test conversion to dictionary."""
        session = LearningSession(student_id="test")
        data = session.to_dict()
        assert data["student_id"] == "test"
        assert "session_id" in data
        assert "accuracy" in data


class TestStudentProfile:
    """Test suite for StudentProfile."""

    def test_init_default(self):
        """Test default initialization."""
        profile = StudentProfile(student_id="student_1")
        assert profile.student_id == "student_1"
        assert profile.age_group == StudentAgeGroup.ADULT
        assert profile.is_minor is False

    def test_init_minor(self):
        """Test initialization for minor."""
        profile = StudentProfile(
            student_id="child_1",
            age_group=StudentAgeGroup.CHILD,
        )
        assert profile.is_minor is True
        assert profile.requires_parental_consent is True

    def test_init_teen(self):
        """Test initialization for teen."""
        profile = StudentProfile(
            student_id="teen_1",
            age_group=StudentAgeGroup.TEEN,
        )
        assert profile.is_minor is True
        assert profile.requires_parental_consent is False

    def test_start_session(self):
        """Test starting a session."""
        profile = StudentProfile(student_id="student_1")
        session = profile.start_session()
        assert session is not None
        assert session.student_id == "student_1"
        assert profile.has_active_session()
        assert profile.total_sessions == 1

    def test_start_session_minor_duration(self):
        """Test session duration limit for minors."""
        profile = StudentProfile(
            student_id="child_1",
            age_group=StudentAgeGroup.CHILD,
        )
        session = profile.start_session()
        assert session.max_session_duration == 1800  # 30 minutes

    def test_end_session(self):
        """Test ending a session."""
        profile = StudentProfile(student_id="student_1")
        profile.start_session()
        profile.current_session.items_completed = 5
        profile.current_session.items_correct = 3
        summary = profile.end_session()
        assert summary is not None
        assert profile.total_items_completed == 5
        assert not profile.has_active_session()

    def test_get_overall_accuracy(self):
        """Test overall accuracy calculation."""
        profile = StudentProfile(student_id="student_1")
        profile.total_items_completed = 20
        profile.total_items_correct = 15
        assert profile.get_overall_accuracy() == 0.75

    def test_get_learning_context(self):
        """Test getting learning context."""
        profile = StudentProfile(student_id="student_1")
        profile.knowledge_state.set_mastery("math", 0.7)
        profile.start_session()
        context = profile.get_learning_context()
        assert context["student_id"] == "student_1"
        assert "math" in context["knowledge_state"]
        assert "session_id" in context

    def test_to_dict(self):
        """Test conversion to dictionary."""
        profile = StudentProfile(student_id="student_1")
        data = profile.to_dict()
        assert data["student_id"] == "student_1"
        assert "knowledge_state" in data
        assert "overall_accuracy" in data

    def test_from_dict(self):
        """Test creation from dictionary."""
        data = {
            "student_id": "student_1",
            "age_group": "teen",
            "total_sessions": 5,
            "knowledge_state": {"topic_mastery": {"math": 0.8}},
        }
        profile = StudentProfile.from_dict(data)
        assert profile.student_id == "student_1"
        assert profile.age_group == StudentAgeGroup.TEEN
        assert profile.total_sessions == 5


class TestContentRecommendation:
    """Test suite for ContentRecommendation."""

    def test_to_dict(self):
        """Test conversion to dictionary."""
        rec = ContentRecommendation(
            content_id="content_1",
            content_type=ContentType.LESSON,
            topic="math",
            difficulty=0.5,
            estimated_duration=300,
            reason="Policy recommendation",
            confidence=0.8,
            is_exploration=False,
        )
        data = rec.to_dict()
        assert data["content_id"] == "content_1"
        assert data["content_type"] == "lesson"
        assert data["confidence"] == 0.8


class TestLearningPath:
    """Test suite for LearningPath."""

    def test_init_default(self):
        """Test default initialization."""
        path = LearningPath(student_id="student_1", target_topic="math")
        assert path.student_id == "student_1"
        assert path.target_topic == "math"
        assert path.current_node_index == 0

    def test_get_current_node(self):
        """Test getting current node."""
        node1 = LearningPathNode(
            content_id="c1", content_type=ContentType.LESSON,
            topic="math", prerequisites=[], estimated_duration=300,
            target_mastery=0.7, order=0,
        )
        node2 = LearningPathNode(
            content_id="c2", content_type=ContentType.QUIZ,
            topic="math", prerequisites=["c1"], estimated_duration=300,
            target_mastery=0.8, order=1,
        )
        path = LearningPath(nodes=[node1, node2])
        assert path.get_current_node().content_id == "c1"

    def test_advance(self):
        """Test advancing through path."""
        node1 = LearningPathNode(
            content_id="c1", content_type=ContentType.LESSON,
            topic="math", prerequisites=[], estimated_duration=300,
            target_mastery=0.7, order=0, status="in_progress",
        )
        node2 = LearningPathNode(
            content_id="c2", content_type=ContentType.QUIZ,
            topic="math", prerequisites=["c1"], estimated_duration=300,
            target_mastery=0.8, order=1,
        )
        path = LearningPath(nodes=[node1, node2])
        assert path.advance()
        assert path.current_node_index == 1
        assert node1.status == "completed"
        assert node2.status == "in_progress"

    def test_advance_at_end(self):
        """Test advancing at end of path."""
        node = LearningPathNode(
            content_id="c1", content_type=ContentType.LESSON,
            topic="math", prerequisites=[], estimated_duration=300,
            target_mastery=0.7, order=0,
        )
        path = LearningPath(nodes=[node])
        assert not path.advance()

    def test_get_progress(self):
        """Test progress calculation."""
        nodes = [
            LearningPathNode(
                content_id=f"c{i}", content_type=ContentType.LESSON,
                topic="math", prerequisites=[], estimated_duration=300,
                target_mastery=0.7, order=i, status="completed" if i < 2 else "not_started",
            )
            for i in range(4)
        ]
        path = LearningPath(nodes=nodes)
        assert path.get_progress() == 0.5

    def test_to_dict(self):
        """Test conversion to dictionary."""
        path = LearningPath(student_id="s1", target_topic="math")
        data = path.to_dict()
        assert data["student_id"] == "s1"
        assert data["target_topic"] == "math"
        assert "progress" in data
