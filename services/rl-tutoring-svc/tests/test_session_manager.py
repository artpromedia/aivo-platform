"""
Tests for Session Manager
"""
import pytest

from app.models.student_model import (
    ContentType,
    SessionStatus,
    StudentAgeGroup,
)
from app.services.session_manager import SessionManager


class TestSessionManager:
    """Test suite for SessionManager."""

    def test_init(self):
        """Test initialization."""
        manager = SessionManager()
        assert manager._students == {}
        assert manager._sessions == {}

    def test_get_or_create_student_new(self):
        """Test creating new student."""
        manager = SessionManager()
        student = manager.get_or_create_student("student_1")
        assert student.student_id == "student_1"
        assert "student_1" in manager._students

    def test_get_or_create_student_existing(self):
        """Test getting existing student."""
        manager = SessionManager()
        student1 = manager.get_or_create_student("student_1")
        student2 = manager.get_or_create_student("student_1")
        assert student1 is student2

    def test_get_or_create_student_with_age(self):
        """Test creating student with age group."""
        manager = SessionManager()
        student = manager.get_or_create_student(
            "child_1", age_group=StudentAgeGroup.CHILD
        )
        assert student.age_group == StudentAgeGroup.CHILD
        assert student.is_minor is True

    def test_get_student(self):
        """Test getting student."""
        manager = SessionManager()
        manager.get_or_create_student("student_1")
        student = manager.get_student("student_1")
        assert student is not None
        assert student.student_id == "student_1"

    def test_get_student_not_found(self):
        """Test getting non-existent student."""
        manager = SessionManager()
        student = manager.get_student("nonexistent")
        assert student is None

    def test_update_student(self):
        """Test updating student."""
        manager = SessionManager()
        student = manager.get_or_create_student("student_1")
        student.preferred_difficulty = 0.8
        manager.update_student(student)
        
        retrieved = manager.get_student("student_1")
        assert retrieved.preferred_difficulty == 0.8

    def test_delete_student(self):
        """Test deleting student."""
        manager = SessionManager()
        manager.get_or_create_student("student_1")
        result = manager.delete_student("student_1")
        assert result is True
        assert manager.get_student("student_1") is None

    def test_delete_student_not_found(self):
        """Test deleting non-existent student."""
        manager = SessionManager()
        result = manager.delete_student("nonexistent")
        assert result is False

    def test_list_students(self):
        """Test listing students."""
        manager = SessionManager()
        for i in range(5):
            manager.get_or_create_student(f"student_{i}")
        
        students = manager.list_students(limit=3)
        assert len(students) == 3

    def test_start_session(self):
        """Test starting session."""
        manager = SessionManager()
        session = manager.start_session("student_1")
        assert session is not None
        assert session.student_id == "student_1"
        assert session.status == SessionStatus.ACTIVE

    def test_start_session_ends_previous(self):
        """Test starting session ends previous."""
        manager = SessionManager()
        session1 = manager.start_session("student_1")
        session2 = manager.start_session("student_1")
        
        assert session1.session_id != session2.session_id
        # Previous session should be ended
        assert session1.status == SessionStatus.COMPLETED

    def test_get_session(self):
        """Test getting session."""
        manager = SessionManager()
        session = manager.start_session("student_1")
        retrieved = manager.get_session(session.session_id)
        assert retrieved is session

    def test_get_active_session(self):
        """Test getting active session."""
        manager = SessionManager()
        manager.start_session("student_1")
        session = manager.get_active_session("student_1")
        assert session is not None

    def test_get_active_session_none(self):
        """Test getting active session when none exists."""
        manager = SessionManager()
        manager.get_or_create_student("student_1")
        session = manager.get_active_session("student_1")
        assert session is None

    def test_end_session(self):
        """Test ending session."""
        manager = SessionManager()
        manager.start_session("student_1")
        summary = manager.end_session("student_1")
        
        assert summary is not None
        assert "session_id" in summary
        assert manager.get_active_session("student_1") is None

    def test_end_session_no_student(self):
        """Test ending session for non-existent student."""
        manager = SessionManager()
        summary = manager.end_session("nonexistent")
        assert summary is None

    def test_pause_session(self):
        """Test pausing session."""
        manager = SessionManager()
        manager.start_session("student_1")
        result = manager.pause_session("student_1")
        assert result is True
        
        student = manager.get_student("student_1")
        assert student.current_session.status == SessionStatus.PAUSED

    def test_resume_session(self):
        """Test resuming session."""
        manager = SessionManager()
        manager.start_session("student_1")
        manager.pause_session("student_1")
        result = manager.resume_session("student_1")
        assert result is True
        
        student = manager.get_student("student_1")
        assert student.current_session.status == SessionStatus.ACTIVE

    def test_update_knowledge_state(self):
        """Test updating knowledge state."""
        manager = SessionManager()
        manager.get_or_create_student("student_1")
        new_mastery = manager.update_knowledge_state(
            "student_1", "math", correct=True, delta=0.1
        )
        assert new_mastery is not None
        assert new_mastery > 0

    def test_get_knowledge_state(self):
        """Test getting knowledge state."""
        manager = SessionManager()
        student = manager.get_or_create_student("student_1")
        student.knowledge_state.set_mastery("math", 0.7)
        
        ks = manager.get_knowledge_state("student_1")
        assert ks is not None
        assert ks.get_mastery("math") == 0.7

    def test_set_topic_mastery(self):
        """Test setting topic mastery."""
        manager = SessionManager()
        manager.get_or_create_student("student_1")
        result = manager.set_topic_mastery("student_1", "math", 0.8, confidence=0.9)
        assert result is True
        
        student = manager.get_student("student_1")
        assert student.knowledge_state.get_mastery("math") == 0.8

    def test_record_performance(self):
        """Test recording performance."""
        manager = SessionManager()
        manager.start_session("student_1")
        result = manager.record_performance(
            "student_1", correct=True, response_time=5.0, topic="math"
        )
        assert result is True
        
        student = manager.get_student("student_1")
        assert student.current_session.items_completed == 1
        assert student.current_session.items_correct == 1

    def test_record_performance_no_session(self):
        """Test recording performance without session."""
        manager = SessionManager()
        manager.get_or_create_student("student_1")
        result = manager.record_performance("student_1", correct=True, response_time=5.0)
        assert result is False

    def test_record_hint_used(self):
        """Test recording hint usage."""
        manager = SessionManager()
        manager.start_session("student_1")
        result = manager.record_hint_used("student_1")
        assert result is True
        
        student = manager.get_student("student_1")
        assert student.current_session.hints_used == 1

    def test_record_help_request(self):
        """Test recording help request."""
        manager = SessionManager()
        manager.start_session("student_1")
        result = manager.record_help_request("student_1")
        assert result is True
        
        student = manager.get_student("student_1")
        assert student.current_session.help_requests == 1

    def test_update_engagement(self):
        """Test updating engagement."""
        manager = SessionManager()
        manager.start_session("student_1")
        result = manager.update_engagement("student_1", 0.75)
        assert result is True
        
        student = manager.get_student("student_1")
        assert student.current_session.get_current_engagement() == 0.75

    def test_set_current_content(self):
        """Test setting current content."""
        manager = SessionManager()
        manager.start_session("student_1")
        result = manager.set_current_content("student_1", "content_1")
        assert result is True
        
        student = manager.get_student("student_1")
        assert student.current_session.current_content_id == "content_1"

    def test_set_current_content_tracks_completed(self):
        """Test that setting new content tracks completed."""
        manager = SessionManager()
        manager.start_session("student_1")
        manager.set_current_content("student_1", "content_1")
        manager.set_current_content("student_1", "content_2")
        
        student = manager.get_student("student_1")
        assert "content_1" in student.current_session.completed_content_ids
        assert student.current_session.current_content_id == "content_2"

    def test_create_learning_path(self):
        """Test creating learning path."""
        manager = SessionManager()
        content = [
            {"content_id": "c1", "type": "lesson", "topic": "math", "duration": 300},
            {"content_id": "c2", "type": "quiz", "topic": "math", "duration": 200},
        ]
        path = manager.create_learning_path("student_1", "math", content)
        
        assert path is not None
        assert path.student_id == "student_1"
        assert path.target_topic == "math"
        assert len(path.nodes) == 2

    def test_get_learning_path(self):
        """Test getting learning path."""
        manager = SessionManager()
        content = [{"content_id": "c1", "type": "lesson", "topic": "math", "duration": 300}]
        created = manager.create_learning_path("student_1", "math", content)
        
        retrieved = manager.get_learning_path("student_1")
        assert retrieved is not None
        assert retrieved.path_id == created.path_id

    def test_advance_learning_path(self):
        """Test advancing learning path."""
        manager = SessionManager()
        content = [
            {"content_id": "c1", "type": "lesson", "topic": "math"},
            {"content_id": "c2", "type": "quiz", "topic": "math"},
        ]
        path = manager.create_learning_path("student_1", "math", content)
        
        result = manager.advance_learning_path(path.path_id)
        assert result is True
        assert path.current_node_index == 1

    def test_get_learning_context(self):
        """Test getting learning context."""
        manager = SessionManager()
        manager.get_or_create_student("student_1")
        manager.set_topic_mastery("student_1", "math", 0.7)
        manager.start_session("student_1")
        
        context = manager.get_learning_context("student_1")
        assert context["student_id"] == "student_1"
        assert "math" in context["knowledge_state"]
        assert "session_id" in context

    def test_get_learning_context_not_found(self):
        """Test getting context for non-existent student."""
        manager = SessionManager()
        context = manager.get_learning_context("nonexistent")
        assert "error" in context

    def test_get_statistics(self):
        """Test getting statistics."""
        manager = SessionManager()
        manager.start_session("student_1")
        manager.start_session("student_2")
        
        stats = manager.get_statistics()
        assert stats["total_students"] == 2
        assert stats["active_sessions"] == 2
