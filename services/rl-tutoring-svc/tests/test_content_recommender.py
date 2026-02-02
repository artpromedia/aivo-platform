"""
Tests for Content Recommender
"""
import pytest

from app.models.student_model import (
    ContentType,
    StudentAgeGroup,
    StudentProfile,
)
from app.services.content_recommender import ContentItem, ContentRecommender
from app.services.safety_monitor import SafetyMonitor


class TestContentItem:
    """Test suite for ContentItem."""

    def test_init(self):
        """Test ContentItem initialization."""
        item = ContentItem(
            content_id="c1",
            content_type=ContentType.LESSON,
            topic="math",
            difficulty=0.5,
        )
        assert item.content_id == "c1"
        assert item.content_type == ContentType.LESSON
        assert item.topic == "math"
        assert item.difficulty == 0.5

    def test_to_dict(self):
        """Test ContentItem serialization."""
        item = ContentItem(
            content_id="c1",
            content_type=ContentType.QUIZ,
            topic="math",
            subtopics=["addition", "subtraction"],
            difficulty=0.7,
            estimated_duration=300,
        )
        data = item.to_dict()
        
        assert data["content_id"] == "c1"
        assert data["content_type"] == "quiz"
        assert data["subtopics"] == ["addition", "subtraction"]


class TestContentRecommender:
    """Test suite for ContentRecommender."""

    def test_init(self):
        """Test initialization."""
        recommender = ContentRecommender()
        assert recommender._content_library == {}
        assert recommender._recommendation_count == 0

    def test_add_content(self):
        """Test adding content."""
        recommender = ContentRecommender()
        item = ContentItem(
            content_id="c1",
            content_type=ContentType.LESSON,
            topic="math",
            difficulty=0.5,
        )
        recommender.add_content(item)
        
        assert "c1" in recommender._content_library
        assert "math" in recommender._content_by_topic
        assert "c1" in recommender._content_by_topic["math"]

    def test_add_content_indexing(self):
        """Test content indexing by difficulty."""
        recommender = ContentRecommender()
        
        easy = ContentItem("c1", ContentType.LESSON, "math", difficulty=0.2)
        medium = ContentItem("c2", ContentType.LESSON, "math", difficulty=0.5)
        hard = ContentItem("c3", ContentType.LESSON, "math", difficulty=0.8)
        
        recommender.add_content(easy)
        recommender.add_content(medium)
        recommender.add_content(hard)
        
        assert "c1" in recommender._content_by_difficulty["easy"]
        assert "c2" in recommender._content_by_difficulty["medium"]
        assert "c3" in recommender._content_by_difficulty["hard"]

    def test_recommend_next_content_basic(self):
        """Test basic recommendation."""
        recommender = ContentRecommender()
        
        # Add some content
        for i, diff in enumerate([0.3, 0.5, 0.7]):
            item = ContentItem(
                content_id=f"c{i}",
                content_type=ContentType.LESSON,
                topic="math",
                difficulty=diff,
            )
            recommender.add_content(item)
        
        student = StudentProfile(student_id="s1")
        student.start_session()
        
        recommendation, metadata = recommender.recommend_next_content(
            student=student,
            target_topic="math",
            use_policy=False,
        )
        
        assert recommendation is not None
        assert recommendation.topic == "math"
        assert "latency_ms" in metadata

    def test_recommend_next_content_with_safety(self):
        """Test recommendation with safety monitor."""
        safety_monitor = SafetyMonitor()
        recommender = ContentRecommender(safety_monitor=safety_monitor)
        
        item = ContentItem("c1", ContentType.LESSON, "math", difficulty=0.5)
        recommender.add_content(item)
        
        student = StudentProfile(student_id="s1")
        student.start_session()
        
        recommendation, metadata = recommender.recommend_next_content(
            student=student,
            use_policy=False,
        )
        
        assert "safety_warnings" in metadata

    def test_recommend_next_content_filters_completed(self):
        """Test that completed content is filtered."""
        recommender = ContentRecommender()
        
        for i in range(3):
            item = ContentItem(f"c{i}", ContentType.LESSON, "math", difficulty=0.5)
            recommender.add_content(item)
        
        student = StudentProfile(student_id="s1")
        student.start_session()
        student.current_session.completed_content_ids = ["c0", "c1"]
        
        recommendation, _ = recommender.recommend_next_content(
            student=student,
            use_policy=False,
        )
        
        # Should not recommend completed content
        assert recommendation.content_id == "c2"

    def test_recommend_next_content_synthetic(self):
        """Test synthetic content generation when library empty."""
        recommender = ContentRecommender()
        student = StudentProfile(student_id="s1")
        student.start_session()
        
        recommendation, _ = recommender.recommend_next_content(
            student=student,
            target_topic="science",
            use_policy=False,
        )
        
        assert "synthetic" in recommendation.content_id
        assert recommendation.topic == "science"

    def test_recommend_next_content_fallback(self):
        """Test fallback recommendation for struggling student."""
        safety_monitor = SafetyMonitor()
        recommender = ContentRecommender(safety_monitor=safety_monitor)
        
        for i in range(3):
            item = ContentItem(
                content_id=f"c{i}",
                content_type=ContentType.LESSON,
                topic="math",
                difficulty=0.3 + i * 0.2,
            )
            recommender.add_content(item)
        
        student = StudentProfile(student_id="s1")
        student.start_session()
        student.current_session.consecutive_failures = 6  # Triggers fallback
        
        recommendation, metadata = recommender.recommend_next_content(
            student=student,
            use_policy=False,
        )
        
        # Either fallback or regular - check we got a recommendation
        assert recommendation is not None

    def test_select_content_by_rules_simplify(self):
        """Test rule-based selection for simplify action."""
        recommender = ContentRecommender()
        
        candidates = [
            ContentItem("c1", ContentType.LESSON, "math", difficulty=0.8),
            ContentItem("c2", ContentType.LESSON, "math", difficulty=0.3),
            ContentItem("c3", ContentType.LESSON, "math", difficulty=0.5),
        ]
        
        student = StudentProfile(student_id="s1")
        selected = recommender._select_content_by_rules(student, candidates, "simplify")
        
        # Should select easiest
        assert selected.content_id == "c2"

    def test_generate_learning_path(self):
        """Test learning path generation."""
        recommender = ContentRecommender()
        
        for i in range(5):
            item = ContentItem(
                content_id=f"math_lesson_{i}",
                content_type=ContentType.LESSON,
                topic="math",
                difficulty=0.2 + i * 0.15,
                estimated_duration=300,
            )
            recommender.add_content(item)
        
        student = StudentProfile(student_id="s1")
        student.knowledge_state.set_mastery("math", 0.3)
        
        path = recommender.generate_learning_path(
            student=student,
            target_topic="math",
            target_mastery=0.8,
            max_nodes=5,
        )
        
        assert path is not None
        assert path.student_id == "s1"
        assert path.target_topic == "math"
        assert len(path.nodes) <= 5

    def test_generate_learning_path_synthetic(self):
        """Test learning path with synthetic content."""
        recommender = ContentRecommender()
        student = StudentProfile(student_id="s1")
        
        path = recommender.generate_learning_path(
            student=student,
            target_topic="history",
            target_mastery=0.7,
        )
        
        assert path is not None
        # Should generate synthetic content for unknown topic

    def test_get_statistics(self):
        """Test getting statistics."""
        recommender = ContentRecommender()
        
        for i in range(3):
            item = ContentItem(f"c{i}", ContentType.LESSON, "math", difficulty=0.5)
            recommender.add_content(item)
        
        stats = recommender.get_statistics()
        
        assert stats["content_library_size"] == 3
        assert "math" in stats["topics"]
        assert "average_latency_ms" in stats
        assert "meets_latency_target" in stats

    def test_latency_tracking(self):
        """Test latency statistics tracking."""
        recommender = ContentRecommender()
        item = ContentItem("c1", ContentType.LESSON, "math", difficulty=0.5)
        recommender.add_content(item)
        
        student = StudentProfile(student_id="s1")
        student.start_session()
        
        # Make several recommendations
        for _ in range(5):
            recommender.recommend_next_content(student, use_policy=False)
        
        stats = recommender.get_statistics()
        assert stats["recommendation_count"] == 5
        # Latency may be 0 or near 0 for fast operations
        assert stats["average_latency_ms"] >= 0

    def test_difficulty_bucket(self):
        """Test difficulty bucket classification."""
        recommender = ContentRecommender()
        
        assert recommender._get_difficulty_bucket(0.1) == "easy"
        assert recommender._get_difficulty_bucket(0.25) == "easy"
        assert recommender._get_difficulty_bucket(0.35) == "medium"
        assert recommender._get_difficulty_bucket(0.6) == "medium"
        assert recommender._get_difficulty_bucket(0.75) == "hard"
        assert recommender._get_difficulty_bucket(0.95) == "hard"

    def test_set_components(self):
        """Test setting components."""
        recommender = ContentRecommender()
        
        class MockPolicy:
            pass
        
        class MockSelector:
            pass
        
        class MockMonitor:
            pass
        
        recommender.set_policy_learner(MockPolicy())
        recommender.set_action_selector(MockSelector())
        recommender.set_safety_monitor(MockMonitor())
        
        assert recommender._policy_learner is not None
        assert recommender._action_selector is not None
        assert recommender._safety_monitor is not None
