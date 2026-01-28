"""
SQLAlchemy models for ML Recommendation Service database.

These models support the risk prediction system, model monitoring,
and intervention tracking features.
"""

from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship


Base = declarative_base()


def generate_uuid():
    """Generate a new UUID."""
    return str(uuid.uuid4())


def utc_now():
    """Return current UTC timestamp."""
    return datetime.now(timezone.utc)


class RiskLevelEnum(str, PyEnum):
    """Risk level enumeration."""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class RiskTrendEnum(str, PyEnum):
    """Risk trend enumeration."""
    IMPROVING = "improving"
    STABLE = "stable"
    DECLINING = "declining"


class AlertSeverityEnum(str, PyEnum):
    """Alert severity enumeration."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class JobStatusEnum(str, PyEnum):
    """Job status enumeration."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Tenant(Base):
    """Tenant model for multi-tenant support."""
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    settings = Column(JSON, default=dict)
    timezone = Column(String(50), default="UTC")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    students = relationship("Student", back_populates="tenant")
    predictions = relationship("RiskPrediction", back_populates="tenant")

    __table_args__ = (
        Index("idx_tenants_active", "is_active"),
    )


class User(Base):
    """User model for staff and admins."""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    tenant_id = Column(UUID(as_uuid=False), ForeignKey("tenants.id"), nullable=False)
    email = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # teacher, counselor, admin, ml_team
    is_active = Column(Boolean, default=True, nullable=False)
    notification_preferences = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_users_tenant_role", "tenant_id", "role"),
        Index("idx_users_email", "email"),
        UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
    )


class Student(Base):
    """Student model for prediction targets."""
    __tablename__ = "students"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    tenant_id = Column(UUID(as_uuid=False), ForeignKey("tenants.id"), nullable=False)
    external_id = Column(String(255), nullable=True)  # External SIS ID
    name = Column(String(255), nullable=False)
    grade_level = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    profile_data = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="students")
    predictions = relationship("RiskPrediction", back_populates="student")
    staff_assignments = relationship("StaffAssignment", back_populates="student")
    interventions = relationship("Intervention", back_populates="student")

    __table_args__ = (
        Index("idx_students_tenant_active", "tenant_id", "is_active"),
        Index("idx_students_external_id", "external_id"),
        UniqueConstraint("tenant_id", "external_id", name="uq_students_tenant_external"),
    )


class StaffAssignment(Base):
    """Staff assignment linking students to teachers/counselors."""
    __tablename__ = "staff_assignments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    student_id = Column(UUID(as_uuid=False), ForeignKey("students.id"), nullable=False)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    assignment_type = Column(String(50), nullable=False)  # teacher, counselor, advisor
    is_primary = Column(Boolean, default=False)
    start_date = Column(DateTime(timezone=True), default=utc_now)
    end_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    student = relationship("Student", back_populates="staff_assignments")

    __table_args__ = (
        Index("idx_staff_assignments_student", "student_id"),
        Index("idx_staff_assignments_user", "user_id"),
    )


class RiskPrediction(Base):
    """Risk prediction storage for students."""
    __tablename__ = "risk_predictions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    tenant_id = Column(UUID(as_uuid=False), ForeignKey("tenants.id"), nullable=False)
    student_id = Column(UUID(as_uuid=False), ForeignKey("students.id"), nullable=False)
    
    # Prediction data
    risk_score = Column(Float, nullable=False)
    risk_level = Column(Enum(RiskLevelEnum), nullable=False)
    risk_trend = Column(Enum(RiskTrendEnum), default=RiskTrendEnum.STABLE)
    confidence = Column(Float, nullable=True)
    
    # Risk factors (JSON array of factor objects)
    risk_factors = Column(JSON, default=list)
    
    # Feature values used for prediction (for monitoring)
    feature_values = Column(JSON, default=dict)
    
    # Model metadata
    model_version = Column(String(50), nullable=True)
    prediction_latency_ms = Column(Float, nullable=True)
    
    # Timestamps
    predicted_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="predictions")
    student = relationship("Student", back_populates="predictions")

    __table_args__ = (
        Index("idx_predictions_tenant_student", "tenant_id", "student_id"),
        Index("idx_predictions_predicted_at", "predicted_at"),
        Index("idx_predictions_risk_level", "risk_level"),
        Index("idx_predictions_tenant_date", "tenant_id", "predicted_at"),
    )


class Intervention(Base):
    """Intervention plans for at-risk students."""
    __tablename__ = "interventions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    tenant_id = Column(UUID(as_uuid=False), nullable=False)
    student_id = Column(UUID(as_uuid=False), ForeignKey("students.id"), nullable=False)
    prediction_id = Column(UUID(as_uuid=False), ForeignKey("risk_predictions.id"), nullable=True)
    
    # Intervention details
    intervention_type = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    recommended_actions = Column(JSON, default=list)
    
    # Status tracking
    status = Column(String(50), default="pending")  # pending, active, completed, cancelled
    assigned_to = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    
    # Outcome tracking
    outcome = Column(String(50), nullable=True)
    outcome_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    student = relationship("Student", back_populates="interventions")

    __table_args__ = (
        Index("idx_interventions_student", "student_id"),
        Index("idx_interventions_status", "status"),
    )


class ModelMetric(Base):
    """Model performance metrics over time."""
    __tablename__ = "model_metrics"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    tenant_id = Column(UUID(as_uuid=False), nullable=True)  # Null for global metrics
    
    # Metric identification
    metric_name = Column(String(100), nullable=False)
    metric_type = Column(String(50), nullable=False)  # performance, drift, fairness
    
    # Metric values
    value = Column(Float, nullable=False)
    threshold = Column(Float, nullable=True)
    is_above_threshold = Column(Boolean, nullable=True)
    
    # Additional data
    details = Column(JSON, default=dict)
    
    # Time period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Timestamps
    recorded_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_model_metrics_name_type", "metric_name", "metric_type"),
        Index("idx_model_metrics_recorded_at", "recorded_at"),
        Index("idx_model_metrics_tenant", "tenant_id"),
    )


class MonitoringAlert(Base):
    """Monitoring alerts for model health issues."""
    __tablename__ = "monitoring_alerts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    tenant_id = Column(UUID(as_uuid=False), nullable=True)  # Null for system-wide alerts
    
    # Alert identification
    alert_type = Column(String(100), nullable=False)
    severity = Column(Enum(AlertSeverityEnum), nullable=False)
    
    # Alert content
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    # Metric context
    metric_value = Column(Float, nullable=True)
    threshold = Column(Float, nullable=True)
    
    # Resolution
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(UUID(as_uuid=False), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Metadata
    metadata = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_alerts_severity_resolved", "severity", "is_resolved"),
        Index("idx_alerts_created_at", "created_at"),
        Index("idx_alerts_tenant", "tenant_id"),
    )


class JobExecution(Base):
    """Job execution tracking for scheduled jobs."""
    __tablename__ = "job_executions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    
    # Job identification
    job_name = Column(String(100), nullable=False)
    job_type = Column(String(50), nullable=False)  # prediction, bias_report, cleanup, monitoring
    
    # Execution status
    status = Column(Enum(JobStatusEnum), default=JobStatusEnum.PENDING)
    
    # Execution metrics
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, nullable=True)
    
    # Results
    records_processed = Column(Integer, default=0)
    errors_count = Column(Integer, default=0)
    
    # Detailed metrics (JSON)
    metrics = Column(JSON, default=dict)
    error_details = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_job_executions_name_status", "job_name", "status"),
        Index("idx_job_executions_created_at", "created_at"),
    )


class DriftReport(Base):
    """Drift detection reports."""
    __tablename__ = "drift_reports"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    tenant_id = Column(UUID(as_uuid=False), nullable=True)  # Null for global reports
    
    # Report identification
    report_type = Column(String(50), nullable=False)  # feature_drift, prediction_drift
    
    # Time period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Drift scores
    overall_drift_score = Column(Float, nullable=False)
    feature_drift_score = Column(Float, nullable=True)
    prediction_drift_score = Column(Float, nullable=True)
    
    # Detailed analysis
    drift_details = Column(JSON, default=dict)
    recommendations = Column(JSON, default=list)
    
    # Alert status
    requires_attention = Column(Boolean, default=False)
    alert_count = Column(Integer, default=0)
    
    # Timestamps
    generated_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_drift_reports_tenant_date", "tenant_id", "generated_at"),
        Index("idx_drift_reports_attention", "requires_attention"),
    )


class BiasReport(Base):
    """Bias detection reports for fairness monitoring."""
    __tablename__ = "bias_reports"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    tenant_id = Column(UUID(as_uuid=False), nullable=False)
    
    # Time period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Fairness metrics
    overall_fairness_score = Column(Float, nullable=False)
    demographic_parity = Column(Float, nullable=True)
    equalized_odds = Column(Float, nullable=True)
    calibration_score = Column(Float, nullable=True)
    
    # Group-level analysis
    group_metrics = Column(JSON, default=dict)
    
    # Alerts
    alerts = Column(JSON, default=list)
    critical_alert_count = Column(Integer, default=0)
    
    # Timestamps
    generated_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_bias_reports_tenant_date", "tenant_id", "generated_at"),
    )


class PredictionOutcome(Base):
    """Tracks actual outcomes for model performance evaluation."""
    __tablename__ = "prediction_outcomes"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    prediction_id = Column(UUID(as_uuid=False), ForeignKey("risk_predictions.id"), nullable=False)
    student_id = Column(UUID(as_uuid=False), ForeignKey("students.id"), nullable=False)
    
    # Outcome data
    actual_outcome = Column(Boolean, nullable=False)  # True = student fell behind
    outcome_date = Column(DateTime(timezone=True), nullable=False)
    outcome_type = Column(String(50), nullable=True)  # grade_drop, attendance, engagement
    
    # Linking
    days_after_prediction = Column(Integer, nullable=True)
    
    # Timestamps
    recorded_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_outcomes_prediction", "prediction_id"),
        Index("idx_outcomes_student_date", "student_id", "outcome_date"),
        UniqueConstraint("prediction_id", "outcome_type", name="uq_outcomes_prediction_type"),
    )


class FeatureBaseline(Base):
    """Baseline feature distributions for drift detection."""
    __tablename__ = "feature_baselines"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    tenant_id = Column(UUID(as_uuid=False), nullable=True)  # Null for global baseline
    
    # Feature identification
    feature_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)
    
    # Distribution statistics
    distribution_data = Column(JSON, nullable=False)  # histogram bins, percentiles, etc.
    mean = Column(Float, nullable=True)
    std = Column(Float, nullable=True)
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    
    # Sample info
    sample_size = Column(Integer, nullable=False)
    
    # Timestamps
    baseline_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_feature_baselines_feature", "feature_name", "model_version"),
        Index("idx_feature_baselines_tenant", "tenant_id"),
        UniqueConstraint("tenant_id", "feature_name", "model_version", name="uq_baselines_tenant_feature_version"),
    )
