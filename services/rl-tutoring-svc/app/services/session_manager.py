"""
Session Manager

Manages learning sessions lifecycle and student profiles.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

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

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manage student profiles and learning sessions.
    
    Provides:
    - Student profile CRUD
    - Session lifecycle management
    - Knowledge state tracking
    - Learning path generation
    """
    
    def __init__(self):
        # In-memory storage (would be replaced with database in production)
        self._students: Dict[str, StudentProfile] = {}
        self._sessions: Dict[str, LearningSession] = {}
        self._learning_paths: Dict[str, LearningPath] = {}
        
        logger.info("SessionManager initialized")
    
    # ==================== Student Management ====================
    
    def get_or_create_student(
        self,
        student_id: str,
        age_group: StudentAgeGroup = StudentAgeGroup.ADULT,
        grade_level: Optional[int] = None,
    ) -> StudentProfile:
        """Get existing student or create new profile."""
        if student_id in self._students:
            return self._students[student_id]
        
        student = StudentProfile(
            student_id=student_id,
            age_group=age_group,
            grade_level=grade_level,
        )
        self._students[student_id] = student
        logger.info(f"Created new student profile: {student_id}")
        return student
    
    def get_student(self, student_id: str) -> Optional[StudentProfile]:
        """Get student profile by ID."""
        return self._students.get(student_id)
    
    def update_student(self, student: StudentProfile) -> None:
        """Update student profile."""
        self._students[student.student_id] = student
        student.last_active_at = datetime.now(timezone.utc)
    
    def delete_student(self, student_id: str) -> bool:
        """Delete student profile."""
        if student_id in self._students:
            del self._students[student_id]
            logger.info(f"Deleted student profile: {student_id}")
            return True
        return False
    
    def list_students(self, limit: int = 100, offset: int = 0) -> List[StudentProfile]:
        """List all student profiles."""
        students = list(self._students.values())
        return students[offset:offset + limit]
    
    # ==================== Session Management ====================
    
    def start_session(
        self,
        student_id: str,
        age_group: StudentAgeGroup = StudentAgeGroup.ADULT,
        max_duration: Optional[int] = None,
    ) -> LearningSession:
        """Start a new learning session for a student."""
        student = self.get_or_create_student(student_id, age_group)
        
        # End any existing session
        if student.has_active_session():
            self.end_session(student_id)
        
        # Create new session
        session = student.start_session(max_duration)
        self._sessions[session.session_id] = session
        
        logger.info(f"Started session {session.session_id} for student {student_id}")
        return session
    
    def get_session(self, session_id: str) -> Optional[LearningSession]:
        """Get session by ID."""
        return self._sessions.get(session_id)
    
    def get_active_session(self, student_id: str) -> Optional[LearningSession]:
        """Get active session for a student."""
        student = self.get_student(student_id)
        if student and student.has_active_session():
            return student.current_session
        return None
    
    def end_session(self, student_id: str) -> Optional[Dict[str, Any]]:
        """End the current session for a student."""
        student = self.get_student(student_id)
        if not student:
            return None
        
        summary = student.end_session()
        if summary and "session_id" in summary:
            # Update session in storage
            session_id = summary["session_id"]
            if session_id in self._sessions:
                self._sessions[session_id].status = SessionStatus.COMPLETED
        
        self.update_student(student)
        logger.info(f"Ended session for student {student_id}")
        return summary
    
    def pause_session(self, student_id: str) -> bool:
        """Pause the current session."""
        student = self.get_student(student_id)
        if student and student.current_session:
            student.current_session.status = SessionStatus.PAUSED
            return True
        return False
    
    def resume_session(self, student_id: str) -> bool:
        """Resume a paused session."""
        student = self.get_student(student_id)
        if student and student.current_session:
            if student.current_session.status == SessionStatus.PAUSED:
                student.current_session.status = SessionStatus.ACTIVE
                return True
        return False
    
    # ==================== Knowledge State Management ====================
    
    def update_knowledge_state(
        self,
        student_id: str,
        topic: str,
        correct: bool,
        delta: float = 0.1,
    ) -> Optional[float]:
        """Update a student's knowledge state based on interaction."""
        student = self.get_student(student_id)
        if not student:
            return None
        
        new_mastery = student.knowledge_state.update_mastery(topic, delta, correct)
        self.update_student(student)
        return new_mastery
    
    def get_knowledge_state(self, student_id: str) -> Optional[KnowledgeState]:
        """Get a student's knowledge state."""
        student = self.get_student(student_id)
        return student.knowledge_state if student else None
    
    def set_topic_mastery(
        self,
        student_id: str,
        topic: str,
        mastery: float,
        confidence: float = 0.5,
    ) -> bool:
        """Set mastery level for a specific topic."""
        student = self.get_student(student_id)
        if not student:
            return False
        
        student.knowledge_state.set_mastery(topic, mastery, confidence)
        self.update_student(student)
        return True
    
    # ==================== Session Performance Tracking ====================
    
    def record_performance(
        self,
        student_id: str,
        correct: bool,
        response_time: float,
        topic: Optional[str] = None,
    ) -> bool:
        """Record a performance result in the current session."""
        student = self.get_student(student_id)
        if not student or not student.current_session:
            return False
        
        student.current_session.record_performance(correct, response_time)
        
        # Update knowledge state if topic provided
        if topic:
            student.knowledge_state.update_mastery(topic, 0.1, correct)
        
        self.update_student(student)
        return True
    
    def record_hint_used(self, student_id: str) -> bool:
        """Record that a hint was used."""
        student = self.get_student(student_id)
        if not student or not student.current_session:
            return False
        
        student.current_session.record_hint_used()
        return True
    
    def record_help_request(self, student_id: str) -> bool:
        """Record a help request."""
        student = self.get_student(student_id)
        if not student or not student.current_session:
            return False
        
        student.current_session.record_help_request()
        return True
    
    def update_engagement(self, student_id: str, engagement: float) -> bool:
        """Update the current engagement level."""
        student = self.get_student(student_id)
        if not student or not student.current_session:
            return False
        
        student.current_session.update_engagement(engagement)
        return True
    
    def set_current_content(self, student_id: str, content_id: str) -> bool:
        """Set the current content being worked on."""
        student = self.get_student(student_id)
        if not student or not student.current_session:
            return False
        
        session = student.current_session
        if session.current_content_id and session.current_content_id != content_id:
            session.completed_content_ids.append(session.current_content_id)
        
        session.current_content_id = content_id
        return True
    
    # ==================== Learning Path Management ====================
    
    def create_learning_path(
        self,
        student_id: str,
        target_topic: str,
        available_content: List[Dict[str, Any]],
    ) -> LearningPath:
        """Create a personalized learning path for a student."""
        student = self.get_or_create_student(student_id)
        
        # Sort content by difficulty and prerequisites
        nodes = []
        total_duration = 0
        
        for i, content in enumerate(available_content):
            node = LearningPathNode(
                content_id=content.get("content_id", f"content_{i}"),
                content_type=ContentType(content.get("type", "lesson")),
                topic=content.get("topic", target_topic),
                prerequisites=content.get("prerequisites", []),
                estimated_duration=content.get("duration", 300),
                target_mastery=content.get("target_mastery", 0.7),
                order=i,
            )
            nodes.append(node)
            total_duration += node.estimated_duration
        
        # Mark first node as in_progress
        if nodes:
            nodes[0].status = "in_progress"
        
        path = LearningPath(
            student_id=student_id,
            target_topic=target_topic,
            nodes=nodes,
            estimated_total_duration=total_duration,
        )
        
        self._learning_paths[path.path_id] = path
        logger.info(f"Created learning path {path.path_id} for student {student_id}")
        return path
    
    def get_learning_path(
        self,
        student_id: str,
        path_id: Optional[str] = None,
    ) -> Optional[LearningPath]:
        """Get a student's learning path."""
        if path_id:
            return self._learning_paths.get(path_id)
        
        # Find most recent path for student
        student_paths = [
            p for p in self._learning_paths.values()
            if p.student_id == student_id
        ]
        if student_paths:
            return max(student_paths, key=lambda p: p.created_at)
        return None
    
    def advance_learning_path(self, path_id: str) -> bool:
        """Advance to the next node in a learning path."""
        path = self._learning_paths.get(path_id)
        if path:
            return path.advance()
        return False
    
    # ==================== Context Generation ====================
    
    def get_learning_context(self, student_id: str) -> Dict[str, Any]:
        """Get full learning context for policy decisions."""
        student = self.get_student(student_id)
        if not student:
            return {"error": "Student not found", "student_id": student_id}
        
        context = student.get_learning_context()
        
        # Add learning path info if available
        path = self.get_learning_path(student_id)
        if path:
            context["learning_path"] = {
                "path_id": path.path_id,
                "target_topic": path.target_topic,
                "progress": path.get_progress(),
                "current_node": path.get_current_node().to_dict() if path.get_current_node() else None,
                "next_node": path.get_next_node().to_dict() if path.get_next_node() else None,
            }
        
        return context
    
    # ==================== Statistics ====================
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get session manager statistics."""
        active_sessions = sum(
            1 for s in self._students.values()
            if s.has_active_session()
        )
        
        return {
            "total_students": len(self._students),
            "active_sessions": active_sessions,
            "total_sessions_stored": len(self._sessions),
            "total_learning_paths": len(self._learning_paths),
        }
