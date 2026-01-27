"""
GDPR/COPPA Consent Management Models

Comprehensive models for tracking user consent with full audit trails.
Supports GDPR Article 6 legal basis and COPPA parental consent requirements.

Ported from: aivo-legacy/services/consent-ledger-svc/app/models/models.py

Features:
- Consent tracking with legal basis
- Parental rights management (COPPA)
- Granular preference settings
- Data export/deletion requests (GDPR Articles 17, 20)
- Immutable audit trail

Author: AIVO Platform Team
"""

import enum
from datetime import datetime
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from enterprise_core.models.base import Base


class ConsentType(str, enum.Enum):
    """Types of consent that can be granted or revoked."""

    DATA_COLLECTION = "data_collection"
    DATA_PROCESSING = "data_processing"
    DATA_SHARING = "data_sharing"
    MARKETING = "marketing"
    ANALYTICS = "analytics"
    CHAT_MONITORING = "chat_monitoring"
    MEDIA_CAPTURE = "media_capture"
    BEHAVIORAL_ANALYSIS = "behavioral_analysis"
    THIRD_PARTY_SERVICES = "third_party_services"
    PERSONALIZATION = "personalization"
    RESEARCH = "research"


class ConsentStatus(str, enum.Enum):
    """Current status of consent."""

    GRANTED = "granted"
    REVOKED = "revoked"
    PENDING = "pending"
    EXPIRED = "expired"


class ParentalRightType(str, enum.Enum):
    """Types of parental rights under COPPA."""

    VIEW_CHILD_DATA = "view_child_data"
    MODIFY_CONSENT = "modify_consent"
    DELETE_CHILD_DATA = "delete_child_data"
    EXPORT_CHILD_DATA = "export_child_data"
    RESTRICT_DATA_USE = "restrict_data_use"


class RequestStatus(str, enum.Enum):
    """Status of data export/deletion requests."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AuditAction(str, enum.Enum):
    """Types of audit actions for consent operations."""

    CONSENT_GRANTED = "consent_granted"
    CONSENT_REVOKED = "consent_revoked"
    CONSENT_UPDATED = "consent_updated"
    PARENTAL_RIGHT_EXERCISED = "parental_right_exercised"
    DATA_EXPORT_REQUESTED = "data_export_requested"
    DATA_EXPORT_COMPLETED = "data_export_completed"
    DELETION_REQUESTED = "deletion_requested"
    DELETION_COMPLETED = "deletion_completed"
    CASCADE_DELETE_TRIGGERED = "cascade_delete_triggered"


class ConsentRecord(Base):
    """
    Primary consent record for users.

    Tracks all consent decisions with full audit trail for GDPR/COPPA compliance.

    Attributes:
        user_id: Identifier for the user
        consent_type: Type of consent being tracked
        status: Current consent status
        legal_basis: GDPR Article 6 legal basis for processing
        purpose: Clear description of data processing purpose
        data_categories: List of data types covered by this consent

    Example:
        consent = ConsentRecord(
            user_id="user-123",
            consent_type=ConsentType.ANALYTICS,
            status=ConsentStatus.PENDING,
            legal_basis="consent",
            purpose="Track learning progress and provide personalized recommendations",
            data_categories=["learning_progress", "assessment_scores"],
        )
    """

    __tablename__ = "consent_records"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )
    consent_type: Mapped[ConsentType] = mapped_column(
        Enum(ConsentType), nullable=False
    )
    status: Mapped[ConsentStatus] = mapped_column(
        Enum(ConsentStatus), nullable=False, default=ConsentStatus.PENDING
    )

    # Consent timing
    granted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Legal basis and context (GDPR Article 6)
    legal_basis: Mapped[str] = mapped_column(String(100), nullable=False)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    data_categories: Mapped[list[str]] = mapped_column(JSON, nullable=False)

    # User context
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Parental consent (COPPA compliance)
    requires_parental_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    parental_consent_given: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    parent_verification_token: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    parent_verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Version for optimistic locking
    version: Mapped[int] = mapped_column(Integer, default=1)

    # Relationships
    audit_logs: Mapped[list["ConsentAuditLog"]] = relationship(
        "ConsentAuditLog", back_populates="consent_record"
    )
    preferences: Mapped[list["PreferenceSettings"]] = relationship(
        "PreferenceSettings", back_populates="consent_record"
    )

    __table_args__ = (
        Index("idx_consent_user_type", "user_id", "consent_type"),
        Index("idx_consent_tenant_status", "tenant_id", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<ConsentRecord(user_id={self.user_id}, "
            f"type={self.consent_type.value}, status={self.status.value})>"
        )

    def grant(self, user_agent: Optional[str] = None, ip_address: Optional[str] = None):
        """Grant this consent."""
        self.status = ConsentStatus.GRANTED
        self.granted_at = datetime.utcnow()
        self.revoked_at = None
        self.user_agent = user_agent
        self.ip_address = ip_address

    def revoke(self):
        """Revoke this consent."""
        self.status = ConsentStatus.REVOKED
        self.revoked_at = datetime.utcnow()


class ParentalRight(Base):
    """
    Parental rights and controls under COPPA.

    Manages parent-child relationships and the rights parents have
    over their children's data.

    Attributes:
        parent_email: Email address of the verified parent
        child_user_id: User ID of the child
        right_type: Type of parental right
        is_active: Whether this right is currently active
    """

    __tablename__ = "parental_rights"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    parent_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    child_user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )

    # Rights and permissions
    right_type: Mapped[ParentalRightType] = mapped_column(
        Enum(ParentalRightType), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Verification
    verification_token: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    verification_method: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    # Expiration
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    __table_args__ = (
        Index("idx_parental_parent_child", "parent_email", "child_user_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<ParentalRight(parent={self.parent_email}, "
            f"child={self.child_user_id}, type={self.right_type.value})>"
        )


class PreferenceSettings(Base):
    """
    User preference settings for data handling.

    Granular controls for different data uses, linked to a consent record.

    Attributes:
        consent_record_id: Reference to the parent consent record
        email_notifications: Allow email notifications
        analytics_tracking: Allow analytics tracking
        personalization: Allow personalized content
    """

    __tablename__ = "preference_settings"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    consent_record_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("consent_records.id"), nullable=False
    )

    # Communication preferences
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    sms_notifications: Mapped[bool] = mapped_column(Boolean, default=False)
    push_notifications: Mapped[bool] = mapped_column(Boolean, default=True)

    # Data processing preferences
    analytics_tracking: Mapped[bool] = mapped_column(Boolean, default=False)
    personalization: Mapped[bool] = mapped_column(Boolean, default=True)
    marketing_use: Mapped[bool] = mapped_column(Boolean, default=False)

    # Third-party sharing
    share_with_partners: Mapped[bool] = mapped_column(Boolean, default=False)
    share_for_research: Mapped[bool] = mapped_column(Boolean, default=False)

    # Chat and media preferences
    chat_monitoring_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    media_capture_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    behavioral_analysis_consent: Mapped[bool] = mapped_column(Boolean, default=False)

    # Data retention preferences
    data_retention_period_days: Mapped[int] = mapped_column(Integer, default=365)
    auto_delete_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Custom preferences (JSON for flexibility)
    custom_preferences: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSON, default=dict
    )

    # Metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    consent_record: Mapped["ConsentRecord"] = relationship(
        "ConsentRecord", back_populates="preferences"
    )

    def __repr__(self) -> str:
        return f"<PreferenceSettings(consent_id={self.consent_record_id})>"


class DataExportRequest(Base):
    """
    Data export requests for GDPR Article 20 compliance.

    Tracks export requests with 30-day completion requirement.
    Supports exports from multiple data sources.

    Attributes:
        user_id: User requesting the export
        status: Current request status
        data_categories: Specific data types requested
        format_preference: Preferred export format (json, csv, xml)
    """

    __tablename__ = "data_export_requests"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )
    requestor_email: Mapped[str] = mapped_column(String(255), nullable=False)

    # Request details
    request_type: Mapped[str] = mapped_column(String(50), default="full_export")
    data_categories: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    format_preference: Mapped[str] = mapped_column(String(20), default="json")

    # Status tracking
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus), default=RequestStatus.PENDING
    )
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Export details
    export_file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    export_file_size_bytes: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    download_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    download_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    download_count: Mapped[int] = mapped_column(Integer, default=0)

    # Data sources included
    postgres_exported: Mapped[bool] = mapped_column(Boolean, default=False)
    mongodb_exported: Mapped[bool] = mapped_column(Boolean, default=False)
    s3_exported: Mapped[bool] = mapped_column(Boolean, default=False)
    snowflake_exported: Mapped[bool] = mapped_column(Boolean, default=False)

    # Error handling
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)

    # Parental request handling
    is_parental_request: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    parent_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    __table_args__ = (
        Index("idx_export_user_status", "user_id", "status"),
        Index("idx_export_requested_at", "requested_at"),
    )

    def __repr__(self) -> str:
        return f"<DataExportRequest(user_id={self.user_id}, status={self.status.value})>"


class DeletionRequest(Base):
    """
    Data deletion requests for GDPR Article 17 compliance.

    Tracks deletion requests with cascaded deletes across all systems.
    Supports both full deletion and category-specific deletion.

    Attributes:
        user_id: User requesting deletion
        scope: Deletion scope (all_data or specific_categories)
        status: Current request status
    """

    __tablename__ = "deletion_requests"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )
    requestor_email: Mapped[str] = mapped_column(String(255), nullable=False)

    # Request details
    deletion_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    scope: Mapped[str] = mapped_column(String(50), default="all_data")
    data_categories: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)

    # Status tracking
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus), default=RequestStatus.PENDING
    )
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Deletion progress across systems
    postgres_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    mongodb_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    s3_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    snowflake_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    # Deletion details
    records_deleted_count: Mapped[int] = mapped_column(Integer, default=0)
    files_deleted_count: Mapped[int] = mapped_column(Integer, default=0)
    storage_freed_bytes: Mapped[int] = mapped_column(Integer, default=0)

    # Retention exceptions
    legal_hold: Mapped[bool] = mapped_column(Boolean, default=False)
    legal_hold_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retention_required_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Error handling
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)

    # Parental request handling
    is_parental_request: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    parent_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    __table_args__ = (
        Index("idx_deletion_user_status", "user_id", "status"),
        Index("idx_deletion_requested_at", "requested_at"),
    )

    def __repr__(self) -> str:
        return f"<DeletionRequest(user_id={self.user_id}, status={self.status.value})>"


class ConsentAuditLog(Base):
    """
    Comprehensive audit log for all consent operations.

    Immutable audit trail for compliance and forensics.
    Includes checksum for tamper detection.

    Attributes:
        action: Type of action performed
        user_id: User affected by the action
        actor_id: Who performed the action
        details: Structured details about the action
    """

    __tablename__ = "consent_audit_logs"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )

    # Core audit info
    action: Mapped[AuditAction] = mapped_column(Enum(AuditAction), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Subject and actor
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    actor_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    actor_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )

    # Related records
    consent_record_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("consent_records.id"), nullable=True
    )
    export_request_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("data_export_requests.id"), nullable=True
    )
    deletion_request_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("deletion_requests.id"), nullable=True
    )

    # Action details
    details: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    old_values: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    new_values: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Context
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Legal compliance
    legal_basis: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    compliance_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Integrity protection
    checksum: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Relationships
    consent_record: Mapped[Optional["ConsentRecord"]] = relationship(
        "ConsentRecord", back_populates="audit_logs"
    )

    __table_args__ = (
        Index("idx_consent_audit_user_timestamp", "user_id", "timestamp"),
        Index("idx_consent_audit_action", "action"),
    )

    def __repr__(self) -> str:
        return (
            f"<ConsentAuditLog(action={self.action.value}, "
            f"user_id={self.user_id}, timestamp={self.timestamp})>"
        )
