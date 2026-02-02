"""
Tests for Safety Monitor
"""
import pytest

from app.models.student_model import (
    LearningSession,
    SessionStatus,
    StudentAgeGroup,
    StudentProfile,
)
from app.services.safety_monitor import (
    ActionCategory,
    RiskLevel,
    SafetyAssessment,
    SafetyConstraints,
    SafetyMonitor,
)


class TestSafetyConstraints:
    """Test suite for SafetyConstraints."""

    def test_default_constraints(self):
        """Test default constraints."""
        constraints = SafetyConstraints()
        assert constraints.max_exploration_rate == 0.1
        assert constraints.max_consecutive_failures == 5
        assert constraints.max_session_duration == 3600

    def test_child_constraints(self):
        """Test child-specific constraints."""
        constraints = SafetyConstraints.for_age_group(StudentAgeGroup.CHILD)
        assert constraints.max_exploration_rate == 0.05
        assert constraints.max_consecutive_failures == 3
        assert constraints.max_session_duration == 1200

    def test_teen_constraints(self):
        """Test teen-specific constraints."""
        constraints = SafetyConstraints.for_age_group(StudentAgeGroup.TEEN)
        assert constraints.max_exploration_rate == 0.08
        assert constraints.max_consecutive_failures == 4
        assert constraints.max_session_duration == 1800

    def test_adult_constraints(self):
        """Test adult-specific constraints."""
        constraints = SafetyConstraints.for_age_group(StudentAgeGroup.ADULT)
        assert constraints.max_exploration_rate == 0.15
        assert constraints.max_consecutive_failures == 7
        assert constraints.max_session_duration == 3600


class TestSafetyMonitor:
    """Test suite for SafetyMonitor."""

    def test_init(self):
        """Test initialization."""
        monitor = SafetyMonitor()
        assert monitor._enable_logging is True
        assert monitor._audit_log == []

    def test_init_logging_disabled(self):
        """Test initialization with logging disabled."""
        monitor = SafetyMonitor(enable_logging=False)
        assert monitor._enable_logging is False

    def test_get_constraints(self):
        """Test getting constraints for student."""
        monitor = SafetyMonitor()
        student = StudentProfile(student_id="s1", age_group=StudentAgeGroup.CHILD)
        constraints = monitor.get_constraints(student)
        assert constraints.max_exploration_rate == 0.05

    def test_assess_action_safe(self):
        """Test assessing a safe action."""
        monitor = SafetyMonitor()
        student = StudentProfile(student_id="s1")
        student.start_session()
        
        proposed_action = {"action_type": "explanation", "difficulty_modifier": 0.1}
        assessment = monitor.assess_action(student, proposed_action, is_exploration=False)
        
        assert assessment.is_safe is True
        assert assessment.use_fallback is False

    def test_assess_action_exploration_limit_minor(self):
        """Test exploration limit for minors."""
        monitor = SafetyMonitor()
        student = StudentProfile(student_id="s1", age_group=StudentAgeGroup.CHILD)
        student.start_session()
        session = student.current_session
        
        # Simulate many actions with high exploration rate
        for i in range(20):
            proposed_action = {"action_type": "test"}
            monitor._session_action_counts[session.session_id] = i + 1
            monitor._session_exploration_counts[session.session_id] = i + 1
        
        proposed_action = {"action_type": "explore"}
        assessment = monitor.assess_action(student, proposed_action, is_exploration=True)
        
        assert "max_exploration_rate" in assessment.constraints_violated
        assert assessment.use_fallback is True

    def test_assess_action_consecutive_failures(self):
        """Test consecutive failures detection."""
        monitor = SafetyMonitor()
        student = StudentProfile(student_id="s1")
        student.start_session()
        # Default max_consecutive_failures for adults is 7, so set to 7 to trigger
        student.current_session.consecutive_failures = 7
        
        proposed_action = {"action_type": "challenge"}
        assessment = monitor.assess_action(student, proposed_action)
        
        # The implementation checks via get_fallback_action, not assess_action
        # Verify assessment is returned properly
        assert assessment is not None
        assert isinstance(assessment.is_safe, bool)
        
        # Test fallback separately - this is where consecutive failures are handled
        context = student.get_learning_context()
        fallback = monitor.get_fallback_action(student, context)
        assert fallback["action_type"] == "simplify"
        assert assessment.recommended_action == "simplify"
        assert assessment.risk_level == RiskLevel.HIGH

    def test_assess_action_low_engagement(self):
        """Test low engagement trigger."""
        monitor = SafetyMonitor()
        student = StudentProfile(student_id="s1")
        student.start_session()
        student.current_session.engagement_history = [0.1]
        
        proposed_action = {"action_type": "challenge"}
        assessment = monitor.assess_action(student, proposed_action)
        
        assert assessment.use_fallback is True
        assert assessment.recommended_action == "encourage"

    def test_assess_action_difficulty_too_high(self):
        """Test difficulty increase limit."""
        monitor = SafetyMonitor()
        student = StudentProfile(student_id="s1")
        student.start_session()
        
        proposed_action = {"action_type": "challenge", "difficulty_modifier": 0.5}
        assessment = monitor.assess_action(student, proposed_action)
        
        assert "max_difficulty_increase" in assessment.constraints_violated

    def test_get_fallback_action_low_engagement(self):
        """Test fallback for low engagement."""
        monitor = SafetyMonitor()
        student = StudentProfile(student_id="s1")
        student.start_session()
        student.current_session.engagement_history = [0.2]
        
        fallback = monitor.get_fallback_action(student, {})
        
        assert fallback["action_type"] == "encourage"
        assert fallback["is_fallback"] is True
        assert fallback["fallback_reason"] == "low_engagement"

    def test_get_fallback_action_many_failures(self):
        """Test fallback for many failures."""
        monitor = SafetyMonitor()
        student = StudentProfile(student_id="s1")
        student.start_session()
        student.current_session.consecutive_failures = 4
        
        fallback = monitor.get_fallback_action(student, {})
        
        assert fallback["action_type"] == "simplify"
        assert fallback["fallback_reason"] == "many_failures"

    def test_get_fallback_action_struggling(self):
        """Test fallback for struggling student."""
        monitor = SafetyMonitor()
        student = StudentProfile(student_id="s1")
        # Set up many weak topics
        for i in range(10):
            student.knowledge_state.set_mastery(f"topic_{i}", 0.2)
        
        fallback = monitor.get_fallback_action(student, {})
        
        assert fallback["action_type"] == "explanation"
        assert fallback["fallback_reason"] == "struggling"

    def test_get_safe_parameters_minor(self):
        """Test safe parameters for minors."""
        monitor = SafetyMonitor()
        student = StudentProfile(student_id="s1", age_group=StudentAgeGroup.CHILD)
        
        params = monitor._get_safe_parameters("encourage", student)
        
        assert params["child_friendly"] is True
        assert params["max_text_length"] == 200

    def test_record_action(self):
        """Test recording action."""
        monitor = SafetyMonitor()
        assessment = SafetyAssessment()
        
        log_id = monitor.record_action(
            student_id="s1",
            session_id="sess_1",
            action_type="explanation",
            action_details={"content_id": "c1"},
            assessment=assessment,
            is_exploration=False,
        )
        
        assert log_id != ""
        assert len(monitor._audit_log) == 1

    def test_record_action_exploration(self):
        """Test recording exploration action."""
        monitor = SafetyMonitor()
        assessment = SafetyAssessment()
        
        monitor.record_action(
            student_id="s1",
            session_id="sess_1",
            action_type="test",
            action_details={},
            assessment=assessment,
            is_exploration=True,
        )
        
        assert monitor._session_exploration_counts.get("sess_1", 0) == 1

    def test_record_action_logging_disabled(self):
        """Test recording with logging disabled."""
        monitor = SafetyMonitor(enable_logging=False)
        assessment = SafetyAssessment()
        
        log_id = monitor.record_action(
            student_id="s1",
            session_id="sess_1",
            action_type="test",
            action_details={},
            assessment=assessment,
        )
        
        assert log_id == ""
        assert len(monitor._audit_log) == 0

    def test_record_outcome(self):
        """Test recording outcome."""
        monitor = SafetyMonitor()
        assessment = SafetyAssessment()
        
        log_id = monitor.record_action(
            student_id="s1",
            session_id="sess_1",
            action_type="test",
            action_details={},
            assessment=assessment,
        )
        
        result = monitor.record_outcome(log_id, {"correct": True})
        assert result is True

    def test_record_outcome_not_found(self):
        """Test recording outcome for non-existent log."""
        monitor = SafetyMonitor()
        result = monitor.record_outcome("nonexistent", {"correct": True})
        assert result is False

    def test_get_audit_log(self):
        """Test getting audit log."""
        monitor = SafetyMonitor()
        assessment = SafetyAssessment()
        
        for i in range(5):
            monitor.record_action(
                student_id="s1",
                session_id="sess_1",
                action_type=f"action_{i}",
                action_details={},
                assessment=assessment,
            )
        
        log = monitor.get_audit_log(student_id="s1")
        assert len(log) == 5

    def test_get_audit_log_filter_session(self):
        """Test filtering audit log by session."""
        monitor = SafetyMonitor()
        assessment = SafetyAssessment()
        
        monitor.record_action("s1", "sess_1", "a1", {}, assessment)
        monitor.record_action("s1", "sess_2", "a2", {}, assessment)
        
        log = monitor.get_audit_log(session_id="sess_1")
        assert len(log) == 1
        assert log[0]["session_id"] == "sess_1"

    def test_get_audit_log_limit(self):
        """Test audit log limit."""
        monitor = SafetyMonitor()
        assessment = SafetyAssessment()
        
        for i in range(20):
            monitor.record_action("s1", "sess_1", f"a{i}", {}, assessment)
        
        log = monitor.get_audit_log(limit=10)
        assert len(log) == 10

    def test_get_safety_statistics(self):
        """Test getting safety statistics."""
        monitor = SafetyMonitor()
        
        # Record some actions
        safe_assessment = SafetyAssessment()
        risky_assessment = SafetyAssessment(
            risk_level=RiskLevel.HIGH,
            use_fallback=True,
        )
        
        monitor.record_action("s1", "sess_1", "a1", {}, safe_assessment)
        monitor.record_action("s1", "sess_1", "a2", {}, safe_assessment, is_exploration=True)
        monitor.record_action("s1", "sess_1", "a3", {}, risky_assessment)
        
        stats = monitor.get_safety_statistics()
        
        assert stats["total_actions"] == 3
        assert stats["exploration_count"] == 1
        assert stats["fallback_count"] == 1
        assert stats["high_risk_count"] == 1

    def test_get_safety_statistics_empty(self):
        """Test statistics with no actions."""
        monitor = SafetyMonitor()
        stats = monitor.get_safety_statistics()
        
        assert stats["total_actions"] == 0
        assert stats["exploration_rate"] == 0.0

    def test_check_fairness(self):
        """Test fairness check."""
        monitor = SafetyMonitor()
        
        students = [
            StudentProfile(student_id="s1", age_group=StudentAgeGroup.ADULT),
            StudentProfile(student_id="s2", age_group=StudentAgeGroup.TEEN),
            StudentProfile(student_id="s3", age_group=StudentAgeGroup.CHILD),
        ]
        
        report = monitor.check_fairness(students)
        
        assert "by_age_group" in report
        assert "overall_status" in report

    def test_check_fairness_empty(self):
        """Test fairness check with no students."""
        monitor = SafetyMonitor()
        report = monitor.check_fairness([])
        assert report["status"] == "no_students"

    def test_clear_session_tracking(self):
        """Test clearing session tracking."""
        monitor = SafetyMonitor()
        monitor._session_exploration_counts["sess_1"] = 5
        monitor._session_action_counts["sess_1"] = 10
        
        monitor.clear_session_tracking("sess_1")
        
        assert "sess_1" not in monitor._session_exploration_counts
        assert "sess_1" not in monitor._session_action_counts

    def test_safety_assessment_to_dict(self):
        """Test SafetyAssessment serialization."""
        assessment = SafetyAssessment(
            is_safe=False,
            risk_level=RiskLevel.HIGH,
            warnings=["Warning 1"],
            use_fallback=True,
        )
        data = assessment.to_dict()
        
        assert data["is_safe"] is False
        assert data["risk_level"] == "high"
        assert data["use_fallback"] is True
