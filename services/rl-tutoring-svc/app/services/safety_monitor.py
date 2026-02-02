"""
Safety Monitor

Safety and ethics monitoring for RL tutoring decisions.
Implements fairness constraints, exploration limits, and audit logging.
"""
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.models.student_model import StudentAgeGroup, StudentProfile

logger = logging.getLogger(__name__)


class RiskLevel(str, Enum):
    """Risk level for safety assessment."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ActionCategory(str, Enum):
    """Categories of tutoring actions for audit."""
    EXPLOIT = "exploit"  # Using learned optimal policy
    EXPLORE = "explore"  # Trying non-optimal action to learn
    FALLBACK = "fallback"  # Using rule-based fallback
    INTERVENTION = "intervention"  # Safety intervention


@dataclass
class SafetyConstraints:
    """Safety constraints based on student profile."""
    max_exploration_rate: float = 0.1  # Max % of exploration actions
    max_consecutive_failures: int = 5  # Trigger intervention
    max_session_duration: int = 3600  # 1 hour
    min_engagement_threshold: float = 0.2  # Below this, intervene
    max_difficulty_increase: float = 0.2  # Max difficulty jump
    require_diverse_content: bool = True  # Avoid repetitive content
    
    @classmethod
    def for_age_group(cls, age_group: StudentAgeGroup) -> "SafetyConstraints":
        """Get constraints appropriate for age group."""
        if age_group == StudentAgeGroup.CHILD:
            return cls(
                max_exploration_rate=0.05,  # Very limited exploration
                max_consecutive_failures=3,
                max_session_duration=1200,  # 20 minutes
                min_engagement_threshold=0.3,
                max_difficulty_increase=0.1,
                require_diverse_content=True,
            )
        elif age_group == StudentAgeGroup.TEEN:
            return cls(
                max_exploration_rate=0.08,
                max_consecutive_failures=4,
                max_session_duration=1800,  # 30 minutes
                min_engagement_threshold=0.25,
                max_difficulty_increase=0.15,
                require_diverse_content=True,
            )
        else:  # ADULT
            return cls(
                max_exploration_rate=0.15,
                max_consecutive_failures=7,
                max_session_duration=3600,  # 1 hour
                min_engagement_threshold=0.15,
                max_difficulty_increase=0.25,
                require_diverse_content=False,
            )


@dataclass
class AuditLogEntry:
    """Single audit log entry."""
    log_id: str = field(default_factory=lambda: str(uuid4()))
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    student_id: str = ""
    session_id: Optional[str] = None
    action_type: str = ""
    action_category: ActionCategory = ActionCategory.EXPLOIT
    risk_level: RiskLevel = RiskLevel.LOW
    
    # Context
    state_summary: Dict[str, Any] = field(default_factory=dict)
    action_details: Dict[str, Any] = field(default_factory=dict)
    
    # Safety assessment
    safety_check_passed: bool = True
    safety_warnings: List[str] = field(default_factory=list)
    constraints_applied: List[str] = field(default_factory=list)
    fallback_used: bool = False
    fallback_reason: Optional[str] = None
    
    # Outcome (filled in later)
    outcome: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "log_id": self.log_id,
            "timestamp": self.timestamp.isoformat(),
            "student_id": self.student_id,
            "session_id": self.session_id,
            "action_type": self.action_type,
            "action_category": self.action_category.value,
            "risk_level": self.risk_level.value,
            "state_summary": self.state_summary,
            "action_details": self.action_details,
            "safety_check_passed": self.safety_check_passed,
            "safety_warnings": self.safety_warnings,
            "constraints_applied": self.constraints_applied,
            "fallback_used": self.fallback_used,
            "fallback_reason": self.fallback_reason,
            "outcome": self.outcome,
        }


@dataclass
class SafetyAssessment:
    """Result of a safety assessment."""
    is_safe: bool = True
    risk_level: RiskLevel = RiskLevel.LOW
    warnings: List[str] = field(default_factory=list)
    blocked_reason: Optional[str] = None
    recommended_action: Optional[str] = None
    constraints_violated: List[str] = field(default_factory=list)
    use_fallback: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "is_safe": self.is_safe,
            "risk_level": self.risk_level.value,
            "warnings": self.warnings,
            "blocked_reason": self.blocked_reason,
            "recommended_action": self.recommended_action,
            "constraints_violated": self.constraints_violated,
            "use_fallback": self.use_fallback,
        }


class SafetyMonitor:
    """
    Monitor and enforce safety constraints for RL tutoring.
    
    Responsibilities:
    - Assess risk of proposed actions
    - Enforce exploration limits for minors
    - Detect problematic patterns
    - Maintain audit logs
    - Provide fallback recommendations
    """
    
    # Fallback action mapping (rule-based safe actions)
    FALLBACK_ACTIONS = {
        "low_engagement": "encourage",
        "many_failures": "simplify",
        "high_frustration": "hint",
        "struggling": "explanation",
        "default": "explanation",
    }
    
    def __init__(self, enable_logging: bool = True):
        self._audit_log: List[AuditLogEntry] = []
        self._enable_logging = enable_logging
        self._session_exploration_counts: Dict[str, int] = {}
        self._session_action_counts: Dict[str, int] = {}
        
        logger.info("SafetyMonitor initialized")
    
    def get_constraints(self, student: StudentProfile) -> SafetyConstraints:
        """Get safety constraints for a student."""
        return SafetyConstraints.for_age_group(student.age_group)
    
    def assess_action(
        self,
        student: StudentProfile,
        proposed_action: Dict[str, Any],
        is_exploration: bool = False,
    ) -> SafetyAssessment:
        """
        Assess the safety of a proposed action.
        
        Args:
            student: Student profile
            proposed_action: The action being proposed
            is_exploration: Whether this is an exploration action
        
        Returns:
            SafetyAssessment with recommendations
        """
        assessment = SafetyAssessment()
        constraints = self.get_constraints(student)
        
        session = student.current_session
        session_id = session.session_id if session else "no_session"
        
        # Initialize session tracking
        if session_id not in self._session_exploration_counts:
            self._session_exploration_counts[session_id] = 0
            self._session_action_counts[session_id] = 0
        
        # Check 1: Exploration limits for minors
        if is_exploration and student.is_minor:
            exploration_count = self._session_exploration_counts.get(session_id, 0)
            total_actions = self._session_action_counts.get(session_id, 0) + 1
            exploration_rate = (exploration_count + 1) / total_actions if total_actions > 0 else 1.0
            
            if exploration_rate > constraints.max_exploration_rate:
                assessment.warnings.append(
                    f"Exploration rate ({exploration_rate:.1%}) exceeds limit ({constraints.max_exploration_rate:.1%})"
                )
                assessment.constraints_violated.append("max_exploration_rate")
                assessment.use_fallback = True
                assessment.risk_level = RiskLevel.MEDIUM
        
        # Check 2: Session duration
        if session and session.get_duration_seconds() > constraints.max_session_duration:
            assessment.warnings.append("Session duration exceeded")
            assessment.constraints_violated.append("max_session_duration")
            assessment.recommended_action = "end_session"
            assessment.risk_level = RiskLevel.MEDIUM
        
        # Check 3: Consecutive failures (intervention needed)
        if session and session.consecutive_failures >= constraints.max_consecutive_failures:
            assessment.warnings.append(
                f"Consecutive failures ({session.consecutive_failures}) exceeds limit"
            )
            assessment.constraints_violated.append("max_consecutive_failures")
            assessment.use_fallback = True
            assessment.recommended_action = "simplify"
            assessment.risk_level = RiskLevel.HIGH
        
        # Check 4: Low engagement
        if session:
            engagement = session.get_current_engagement()
            if engagement < constraints.min_engagement_threshold:
                assessment.warnings.append(
                    f"Low engagement ({engagement:.2f}) below threshold"
                )
                assessment.use_fallback = True
                assessment.recommended_action = "encourage"
                assessment.risk_level = max(assessment.risk_level, RiskLevel.MEDIUM)
        
        # Check 5: Difficulty increase (prevent overwhelming)
        proposed_difficulty = proposed_action.get("difficulty_modifier", 0)
        if proposed_difficulty > constraints.max_difficulty_increase:
            assessment.warnings.append(
                f"Difficulty increase ({proposed_difficulty:.2f}) exceeds limit"
            )
            assessment.constraints_violated.append("max_difficulty_increase")
            assessment.use_fallback = True
        
        # Determine final safety status
        if assessment.constraints_violated:
            assessment.is_safe = False if len(assessment.constraints_violated) > 1 else True
        
        # For critical risk, always use fallback
        if assessment.risk_level == RiskLevel.CRITICAL:
            assessment.is_safe = False
            assessment.use_fallback = True
        
        return assessment
    
    def get_fallback_action(
        self,
        student: StudentProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Get a rule-based fallback action when RL is unsafe or uncertain.
        
        This provides deterministic, conservative actions based on rules.
        """
        session = student.current_session
        
        # Determine situation
        situation = "default"
        
        if session:
            if session.get_current_engagement() < 0.3:
                situation = "low_engagement"
            elif session.consecutive_failures >= 3:
                situation = "many_failures"
            elif session.hints_used > 5:
                situation = "high_frustration"
        
        # Check knowledge state for struggling
        weak_topics = student.knowledge_state.get_weak_topics(threshold=0.3)
        if len(weak_topics) > len(student.knowledge_state.topic_mastery) * 0.5:
            situation = "struggling"
        
        action_type = self.FALLBACK_ACTIONS.get(situation, "explanation")
        
        return {
            "action_type": action_type,
            "is_fallback": True,
            "fallback_reason": situation,
            "parameters": self._get_safe_parameters(action_type, student),
            "difficulty_modifier": -0.1 if situation in ("many_failures", "struggling") else 0.0,
        }
    
    def _get_safe_parameters(
        self,
        action_type: str,
        student: StudentProfile,
    ) -> Dict[str, Any]:
        """Get safe parameters for fallback actions."""
        base_params = {
            "encourage": {"tone": "supportive", "include_progress": True},
            "simplify": {"complexity_reduction": 0.3, "add_examples": True},
            "hint": {"hint_level": "strong", "reveal_partial": True},
            "explanation": {"detail_level": "extended", "use_analogies": True},
        }
        
        params = base_params.get(action_type, {})
        
        # Adjust for minors
        if student.is_minor:
            params["child_friendly"] = True
            params["max_text_length"] = 200  # Shorter text for children
        
        return params
    
    def record_action(
        self,
        student_id: str,
        session_id: Optional[str],
        action_type: str,
        action_details: Dict[str, Any],
        assessment: SafetyAssessment,
        is_exploration: bool = False,
    ) -> str:
        """
        Record an action in the audit log.
        
        Returns the log entry ID.
        """
        # Update session counts
        if session_id:
            self._session_action_counts[session_id] = \
                self._session_action_counts.get(session_id, 0) + 1
            if is_exploration:
                self._session_exploration_counts[session_id] = \
                    self._session_exploration_counts.get(session_id, 0) + 1
        
        if not self._enable_logging:
            return ""
        
        # Determine action category
        if assessment.use_fallback:
            category = ActionCategory.FALLBACK
        elif assessment.risk_level == RiskLevel.HIGH:
            category = ActionCategory.INTERVENTION
        elif is_exploration:
            category = ActionCategory.EXPLORE
        else:
            category = ActionCategory.EXPLOIT
        
        entry = AuditLogEntry(
            student_id=student_id,
            session_id=session_id,
            action_type=action_type,
            action_category=category,
            risk_level=assessment.risk_level,
            action_details=action_details,
            safety_check_passed=assessment.is_safe,
            safety_warnings=assessment.warnings,
            constraints_applied=assessment.constraints_violated,
            fallback_used=assessment.use_fallback,
            fallback_reason=assessment.blocked_reason,
        )
        
        self._audit_log.append(entry)
        
        # Log high-risk actions
        if assessment.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
            logger.warning(
                f"High-risk action recorded: student={student_id}, "
                f"action={action_type}, risk={assessment.risk_level.value}, "
                f"warnings={assessment.warnings}"
            )
        
        return entry.log_id
    
    def record_outcome(
        self,
        log_id: str,
        outcome: Dict[str, Any],
    ) -> bool:
        """Record the outcome of a logged action."""
        for entry in reversed(self._audit_log):
            if entry.log_id == log_id:
                entry.outcome = outcome
                return True
        return False
    
    def get_audit_log(
        self,
        student_id: Optional[str] = None,
        session_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get audit log entries."""
        entries = self._audit_log
        
        if student_id:
            entries = [e for e in entries if e.student_id == student_id]
        if session_id:
            entries = [e for e in entries if e.session_id == session_id]
        
        # Return most recent first
        entries = sorted(entries, key=lambda e: e.timestamp, reverse=True)
        return [e.to_dict() for e in entries[:limit]]
    
    def get_safety_statistics(
        self,
        student_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get safety statistics."""
        entries = self._audit_log
        if student_id:
            entries = [e for e in entries if e.student_id == student_id]
        
        if not entries:
            return {
                "total_actions": 0,
                "exploration_rate": 0.0,
                "fallback_rate": 0.0,
                "high_risk_count": 0,
            }
        
        total = len(entries)
        exploration_count = sum(1 for e in entries if e.action_category == ActionCategory.EXPLORE)
        fallback_count = sum(1 for e in entries if e.fallback_used)
        high_risk_count = sum(
            1 for e in entries 
            if e.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)
        )
        
        return {
            "total_actions": total,
            "exploration_count": exploration_count,
            "exploration_rate": exploration_count / total if total > 0 else 0.0,
            "fallback_count": fallback_count,
            "fallback_rate": fallback_count / total if total > 0 else 0.0,
            "high_risk_count": high_risk_count,
            "risk_by_level": {
                level.value: sum(1 for e in entries if e.risk_level == level)
                for level in RiskLevel
            },
            "actions_by_category": {
                cat.value: sum(1 for e in entries if e.action_category == cat)
                for cat in ActionCategory
            },
        }
    
    def check_fairness(
        self,
        students: List[StudentProfile],
    ) -> Dict[str, Any]:
        """
        Check fairness across students.
        
        Ensures no group is being over-explored or under-served.
        """
        if not students:
            return {"status": "no_students"}
        
        # Group by age group
        by_age_group: Dict[str, List[StudentProfile]] = {}
        for student in students:
            group = student.age_group.value
            if group not in by_age_group:
                by_age_group[group] = []
            by_age_group[group].append(student)
        
        fairness_report = {
            "by_age_group": {},
            "overall_status": "fair",
            "warnings": [],
        }
        
        for group, group_students in by_age_group.items():
            # Get exploration rates for this group
            group_stats = []
            for student in group_students:
                stats = self.get_safety_statistics(student.student_id)
                group_stats.append(stats)
            
            avg_exploration = (
                sum(s["exploration_rate"] for s in group_stats) / len(group_stats)
                if group_stats else 0.0
            )
            
            fairness_report["by_age_group"][group] = {
                "student_count": len(group_students),
                "average_exploration_rate": avg_exploration,
            }
            
            # Check for concerning patterns
            if group in ("child", "teen") and avg_exploration > 0.1:
                fairness_report["warnings"].append(
                    f"High exploration rate ({avg_exploration:.1%}) for {group} group"
                )
                fairness_report["overall_status"] = "warning"
        
        return fairness_report
    
    def clear_session_tracking(self, session_id: str) -> None:
        """Clear tracking data for a completed session."""
        self._session_exploration_counts.pop(session_id, None)
        self._session_action_counts.pop(session_id, None)
