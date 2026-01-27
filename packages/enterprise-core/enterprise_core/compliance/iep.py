"""
IEP (Individualized Education Program) Models

Special education compliance models for FERPA/IDEA requirements.
Supports SMART goal tracking, progress monitoring, and compliance auditing.

Ported from: aivo-pro/services/iep-assistant-svc/src/db/models.py

Features:
- SMART goal framework (Specific, Measurable, Achievable, Relevant, Time-bound)
- Progress tracking with trend analysis
- Accommodation and service management
- FERPA-compliant audit logging
- Meeting and amendment tracking

Author: AIVO Platform Team
"""

import enum
from datetime import datetime, date
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Date,
    Enum,
    ForeignKey,
    Float,
    Integer,
    String,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from enterprise_core.models.base import Base


class GoalType(str, enum.Enum):
    """IEP goal types aligned with IDEA requirements."""

    ACADEMIC = "academic"
    BEHAVIORAL = "behavioral"
    SOCIAL = "social"
    COMMUNICATION = "communication"
    MOTOR = "motor"
    SELF_HELP = "self_help"
    VOCATIONAL = "vocational"
    FUNCTIONAL = "functional"


class GoalStatus(str, enum.Enum):
    """Goal lifecycle status."""

    DRAFT = "draft"
    ACTIVE = "active"
    MASTERED = "mastered"
    DISCONTINUED = "discontinued"
    AMENDED = "amended"


class ProgressTrend(str, enum.Enum):
    """Progress trend analysis categories."""

    ACCELERATED = "accelerated"
    ON_TRACK = "on_track"
    SLOW = "slow"
    DECLINING = "declining"
    INSUFFICIENT_DATA = "insufficient_data"


class MeetingType(str, enum.Enum):
    """Types of IEP meetings."""

    INITIAL = "initial"
    ANNUAL_REVIEW = "annual_review"
    TRIENNIAL = "triennial"
    AMENDMENT = "amendment"
    TRANSITION = "transition"
    MANIFESTATION = "manifestation"


class IEPGoal(Base):
    """
    IEP Goal with SMART framework validation.

    Represents an Individualized Education Program goal for a student,
    following the SMART criteria (Specific, Measurable, Achievable,
    Relevant, Time-bound).

    Attributes:
        student_id: UUID of the student
        goal_text: The goal statement
        goal_type: Category of goal (academic, behavioral, etc.)
        baseline: Starting point measurements (JSONB)
        target: Target measurements to achieve (JSONB)
        measurement_method: How progress will be measured
        timeline_end: Target completion date

    Example:
        goal = IEPGoal(
            student_id=student_uuid,
            goal_text="Student will read grade-level text with 95% accuracy",
            goal_type=GoalType.ACADEMIC,
            area="reading",
            baseline={"accuracy": 0.75, "wpm": 80},
            target={"accuracy": 0.95, "wpm": 120},
            measurement_method="Weekly oral reading assessments",
            timeline_end=date(2025, 6, 15),
        )
    """

    __tablename__ = "iep_goals"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    student_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), nullable=False, index=True
    )
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )

    # Goal information
    goal_text: Mapped[str] = mapped_column(Text, nullable=False)
    goal_type: Mapped[GoalType] = mapped_column(Enum(GoalType), nullable=False)
    area: Mapped[str] = mapped_column(String(100), nullable=False)

    # SMART components
    baseline: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    target: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    measurement_method: Mapped[str] = mapped_column(String(500), nullable=False)
    timeline_end: Mapped[date] = mapped_column(Date, nullable=False)

    # Progress tracking
    current_progress: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    trend: Mapped[Optional[ProgressTrend]] = mapped_column(
        Enum(ProgressTrend), nullable=True
    )
    projected_outcome: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # SMART validation (automated analysis)
    smart_validation: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB, nullable=True
    )
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Status
    status: Mapped[GoalStatus] = mapped_column(
        Enum(GoalStatus), default=GoalStatus.DRAFT
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    data_points: Mapped[list["IEPDataPoint"]] = relationship(
        "IEPDataPoint", back_populates="goal", cascade="all, delete-orphan"
    )
    objectives: Mapped[list["IEPObjective"]] = relationship(
        "IEPObjective", back_populates="goal", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_iep_goal_student", "student_id"),
        Index("idx_iep_goal_status", "status"),
        Index("idx_iep_goal_type", "goal_type"),
    )

    def __repr__(self) -> str:
        return f"<IEPGoal(student={self.student_id}, type={self.goal_type.value}, status={self.status.value})>"

    def calculate_progress_percentage(self) -> Optional[float]:
        """Calculate progress as a percentage from baseline to target."""
        if not self.data_points:
            return None

        latest_value = self.data_points[-1].value
        baseline_value = list(self.baseline.values())[0] if self.baseline else 0
        target_value = list(self.target.values())[0] if self.target else 1

        if target_value == baseline_value:
            return 100.0 if latest_value >= target_value else 0.0

        progress = (latest_value - baseline_value) / (target_value - baseline_value)
        return min(100.0, max(0.0, progress * 100))


class IEPObjective(Base):
    """
    Short-term objectives/benchmarks within a goal.

    Objectives break down annual goals into quarterly or shorter-term
    measurable targets.

    Attributes:
        goal_id: Reference to parent IEP goal
        quarter: Quarter number (1-4)
        target: Target value for this objective
        criteria: Success criteria description
    """

    __tablename__ = "iep_objectives"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    goal_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("iep_goals.id"), nullable=False
    )

    # Objective info
    quarter: Mapped[int] = mapped_column(Integer, nullable=False)
    timeline: Mapped[str] = mapped_column(String(100), nullable=False)
    target: Mapped[float] = mapped_column(Float, nullable=False)
    criteria: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    goal: Mapped["IEPGoal"] = relationship("IEPGoal", back_populates="objectives")

    def __repr__(self) -> str:
        return f"<IEPObjective(goal={self.goal_id}, quarter={self.quarter})>"


class IEPDataPoint(Base):
    """
    Progress data point for goal tracking.

    Records individual progress measurements linked to specific goals.

    Attributes:
        goal_id: Reference to parent IEP goal
        date: Date of measurement
        value: Measured value
        notes: Optional notes about this measurement
    """

    __tablename__ = "iep_data_points"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    goal_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("iep_goals.id"), nullable=False
    )

    # Data
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Metadata
    recorded_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    goal: Mapped["IEPGoal"] = relationship("IEPGoal", back_populates="data_points")

    __table_args__ = (Index("idx_iep_data_goal_date", "goal_id", "date"),)

    def __repr__(self) -> str:
        return f"<IEPDataPoint(goal={self.goal_id}, date={self.date}, value={self.value})>"


class IEPDocument(Base):
    """
    IEP document container.

    Stores complete IEP documents in JSONB format for flexibility
    while maintaining structured metadata.

    Attributes:
        student_id: UUID of the student
        document_type: Type of document (initial, annual, amendment)
        content: Full document content (JSONB)
        status: Document status (draft, finalized)
    """

    __tablename__ = "iep_documents"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    student_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), nullable=False, index=True
    )
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )

    # Document info
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)

    # Status
    status: Mapped[str] = mapped_column(String(50), default="draft")

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    finalized_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:
        return f"<IEPDocument(student={self.student_id}, type={self.document_type})>"


class IEPMeeting(Base):
    """
    IEP meeting record.

    Tracks IEP team meetings with attendee information.

    Attributes:
        student_id: UUID of the student
        meeting_type: Type of meeting
        meeting_date: Date of the meeting
        attendees: List of attendees (JSONB)
    """

    __tablename__ = "iep_meetings"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    student_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), nullable=False, index=True
    )
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )

    # Meeting info
    meeting_type: Mapped[str] = mapped_column(String(50), nullable=False)
    meeting_date: Mapped[date] = mapped_column(Date, nullable=False)
    attendees: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decisions: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (Index("idx_iep_meeting_student_date", "student_id", "meeting_date"),)

    def __repr__(self) -> str:
        return f"<IEPMeeting(student={self.student_id}, type={self.meeting_type})>"


class IEPAmendment(Base):
    """
    Goal amendment record.

    Tracks changes to IEP goals with full before/after documentation.

    Attributes:
        goal_id: Reference to the amended goal
        amendment_type: Type of amendment
        original_text: Original goal text
        amended_text: New goal text
        reason: Reason for the amendment
    """

    __tablename__ = "iep_amendments"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    goal_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("iep_goals.id"), nullable=False
    )

    # Amendment info
    amendment_type: Mapped[str] = mapped_column(String(50), nullable=False)
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    amended_text: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)

    # Approval
    approved_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<IEPAmendment(goal={self.goal_id}, type={self.amendment_type})>"


class IEPAccommodation(Base):
    """
    Student accommodation record.

    Documents accommodations and modifications provided to students.

    Attributes:
        student_id: UUID of the student
        accommodation_text: Description of the accommodation
        category: Category (testing, classroom, assignment, etc.)
        active: Whether the accommodation is currently active
    """

    __tablename__ = "iep_accommodations"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    student_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), nullable=False, index=True
    )
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )

    # Accommodation info
    accommodation_text: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    setting: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Status
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    __table_args__ = (Index("idx_iep_accommodation_student_active", "student_id", "active"),)

    def __repr__(self) -> str:
        return f"<IEPAccommodation(student={self.student_id}, category={self.category})>"


class IEPService(Base):
    """
    Special education service record.

    Documents related services provided to students.

    Attributes:
        student_id: UUID of the student
        service_type: Type of service (speech, OT, PT, etc.)
        frequency: How often the service is provided
        duration_minutes: Length of each session
        location: Where services are provided
    """

    __tablename__ = "iep_services"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    student_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), nullable=False, index=True
    )
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )

    # Service info
    service_type: Mapped[str] = mapped_column(String(200), nullable=False)
    frequency: Mapped[str] = mapped_column(String(100), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    provider: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Timestamps
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    __table_args__ = (Index("idx_iep_service_student_type", "student_id", "service_type"),)

    def __repr__(self) -> str:
        return f"<IEPService(student={self.student_id}, type={self.service_type})>"


class StudentProgress(Base):
    """
    Overall student progress summary.

    Aggregates progress data for reporting periods.

    Attributes:
        student_id: UUID of the student
        reporting_period: Period identifier (Q1 2024, etc.)
        progress_summary: Aggregated progress data (JSONB)
    """

    __tablename__ = "iep_student_progress"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    student_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), nullable=False, index=True
    )
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )

    # Progress data
    reporting_period: Mapped[str] = mapped_column(String(50), nullable=False)
    progress_summary: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("idx_iep_progress_student_period", "student_id", "reporting_period"),
    )

    def __repr__(self) -> str:
        return f"<StudentProgress(student={self.student_id}, period={self.reporting_period})>"


class ComplianceLog(Base):
    """
    FERPA/IDEA compliance audit log.

    Immutable log of all access and modifications to IEP data.

    Attributes:
        action: Action performed
        user_id: User who performed the action
        student_id: Student whose data was accessed
        details: Action details (JSONB)
    """

    __tablename__ = "iep_compliance_logs"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )

    # Log info
    action: Mapped[str] = mapped_column(String(200), nullable=False)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    student_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True
    )
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )
    details: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    # Context
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Timestamp
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    __table_args__ = (
        Index("idx_iep_compliance_user", "user_id"),
        Index("idx_iep_compliance_student", "student_id"),
        Index("idx_iep_compliance_timestamp", "timestamp"),
    )

    def __repr__(self) -> str:
        return f"<ComplianceLog(action={self.action}, user={self.user_id})>"
