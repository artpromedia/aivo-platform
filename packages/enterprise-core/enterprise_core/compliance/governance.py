"""
Data Governance Models

Enterprise-grade data governance for:
- Retention policies
- Data Subject Rights (DSR) requests
- Legal holds
- Data inventory tracking

Ported from: aivo-legacy/services/data-governance-svc/models/__init__.py

Features:
- Entity-specific retention rules
- Multi-compliance framework support (FERPA, COPPA, GDPR)
- Legal hold management
- DSR request processing
- Data classification and tracking

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
    ForeignKey,
    Integer,
    String,
    Text,
    Index,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from enterprise_core.models.base import Base


class EntityType(str, enum.Enum):
    """Types of entities that can have retention policies."""

    USER = "user"
    STUDENT = "student"
    EMPLOYEE = "employee"
    CUSTOMER = "customer"
    TENANT = "tenant"
    SESSION = "session"
    LOG = "log"
    DOCUMENT = "document"
    MESSAGE = "message"
    TRANSACTION = "transaction"
    ASSESSMENT = "assessment"
    LEARNING_RECORD = "learning_record"


class DSRType(str, enum.Enum):
    """Types of Data Subject Rights requests."""

    EXPORT = "export"
    DELETE = "delete"
    PORTABILITY = "portability"
    RECTIFICATION = "rectification"
    RESTRICTION = "restriction"
    ACCESS = "access"


class DSRStatus(str, enum.Enum):
    """Status of DSR requests."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"  # Blocked by legal hold
    VERIFIED = "verified"
    EXPIRED = "expired"


class LegalHoldStatus(str, enum.Enum):
    """Status of legal holds."""

    ACTIVE = "active"
    RELEASED = "released"
    EXPIRED = "expired"


class SensitivityLevel(str, enum.Enum):
    """Data sensitivity classification levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RetentionPolicy(Base):
    """
    Retention policy for different entity types.

    Defines how long data should be kept and when it can be automatically deleted.
    Supports multi-tenant and multi-compliance framework configurations.

    Attributes:
        entity_type: Type of entity this policy applies to
        retention_days: Number of days to retain data
        compliance_framework: Compliance framework (FERPA, COPPA, GDPR)
        auto_delete_enabled: Whether automatic deletion is enabled

    Example:
        policy = RetentionPolicy(
            entity_type=EntityType.LEARNING_RECORD,
            tenant_id=tenant_uuid,
            retention_days=365 * 7,  # 7 years for FERPA
            compliance_framework="FERPA",
            auto_delete_enabled=True,
            created_by="admin-123",
            updated_by="admin-123",
        )
    """

    __tablename__ = "retention_policies"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )

    # Retention settings
    retention_days: Mapped[int] = mapped_column(Integer, nullable=False)
    auto_delete_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    grace_period_days: Mapped[int] = mapped_column(Integer, default=30)

    # Compliance settings
    legal_basis: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    compliance_framework: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    # Metadata
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    custom_rules: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    updated_by: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationships
    dsr_requests: Mapped[list["DSRRequest"]] = relationship(
        "DSRRequest", back_populates="retention_policy", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("entity_type", "tenant_id", name="uq_retention_entity_tenant"),
        Index("idx_retention_entity_type", "entity_type"),
        Index("idx_retention_tenant", "tenant_id"),
        CheckConstraint("retention_days > 0", name="ck_retention_positive"),
        CheckConstraint("grace_period_days >= 0", name="ck_grace_period_non_negative"),
    )

    def __repr__(self) -> str:
        return f"<RetentionPolicy(entity_type={self.entity_type}, days={self.retention_days})>"


class DSRRequest(Base):
    """
    Data Subject Rights request.

    Tracks DSR requests (export, delete, rectify, etc.) through their lifecycle.
    Integrates with legal holds to prevent deletion when holds are active.

    Attributes:
        dsr_type: Type of DSR request
        subject_id: ID of the data subject
        status: Current processing status
        progress_percentage: Processing progress (0-100)
    """

    __tablename__ = "dsr_requests"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )

    # Request details
    dsr_type: Mapped[str] = mapped_column(String(20), nullable=False)
    subject_id: Mapped[str] = mapped_column(String(100), nullable=False)
    subject_type: Mapped[str] = mapped_column(String(50), nullable=False)
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )

    # Request metadata
    requester_email: Mapped[str] = mapped_column(String(255), nullable=False)
    requester_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    legal_basis: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Processing status
    status: Mapped[str] = mapped_column(String(20), default=DSRStatus.PENDING.value)
    progress_percentage: Mapped[int] = mapped_column(Integer, default=0)

    # Results
    export_file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    export_download_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    export_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    deletion_summary: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )
    error_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Compliance tracking
    verification_token: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    identity_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    completion_certificate: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    retention_policy_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("retention_policies.id"), nullable=True
    )
    retention_policy: Mapped[Optional[RetentionPolicy]] = relationship(
        "RetentionPolicy", back_populates="dsr_requests"
    )

    blocked_by_holds: Mapped[list["LegalHold"]] = relationship(
        "LegalHold",
        secondary="dsr_legal_hold_blocks",
        back_populates="blocked_requests",
    )

    __table_args__ = (
        Index("idx_dsr_subject", "subject_id", "subject_type"),
        Index("idx_dsr_status", "status"),
        Index("idx_dsr_type", "dsr_type"),
        Index("idx_dsr_tenant", "tenant_id"),
        Index("idx_dsr_requested_at", "requested_at"),
        CheckConstraint(
            "progress_percentage >= 0 AND progress_percentage <= 100",
            name="ck_progress_range",
        ),
    )

    def __repr__(self) -> str:
        return f"<DSRRequest(type={self.dsr_type}, subject={self.subject_id}, status={self.status})>"


class LegalHold(Base):
    """
    Legal hold that prevents data deletion.

    When a legal hold is active, data matching its criteria cannot be deleted.
    This ensures compliance with legal discovery and litigation requirements.

    Attributes:
        name: Human-readable name for the hold
        case_number: Associated legal case number
        entity_types: Types of entities covered by this hold
        status: Current hold status (active, released, expired)
    """

    __tablename__ = "legal_holds"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )

    # Hold details
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    case_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Scope
    entity_types: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    subject_ids: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )

    # Hold status
    status: Mapped[str] = mapped_column(String(20), default=LegalHoldStatus.ACTIVE.value)

    # Dates
    effective_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expiry_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    released_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Legal details
    legal_authority: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    custodian_name: Mapped[str] = mapped_column(String(200), nullable=False)
    custodian_email: Mapped[str] = mapped_column(String(255), nullable=False)

    # Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    updated_by: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationships
    blocked_requests: Mapped[list[DSRRequest]] = relationship(
        "DSRRequest",
        secondary="dsr_legal_hold_blocks",
        back_populates="blocked_by_holds",
    )

    __table_args__ = (
        Index("idx_legal_hold_status", "status"),
        Index("idx_legal_hold_effective", "effective_date"),
        Index("idx_legal_hold_tenant", "tenant_id"),
        Index("idx_legal_hold_case", "case_number"),
    )

    def __repr__(self) -> str:
        return f"<LegalHold(name={self.name}, status={self.status})>"

    def release(self, released_by: str) -> None:
        """Release this legal hold."""
        self.status = LegalHoldStatus.RELEASED.value
        self.released_at = datetime.utcnow()
        self.updated_by = released_by


class DSRLegalHoldBlock(Base):
    """Many-to-many relationship between DSR requests and legal holds."""

    __tablename__ = "dsr_legal_hold_blocks"

    dsr_request_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("dsr_requests.id"), primary_key=True
    )
    legal_hold_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("legal_holds.id"), primary_key=True
    )
    blocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class DataInventoryItem(Base):
    """
    Tracks data items for governance and DSR processing.

    Provides a comprehensive inventory of all data, classified by type,
    sensitivity, and storage location. Essential for DSR processing
    and compliance audits.

    Attributes:
        entity_type: Type of entity
        entity_id: Unique identifier for the entity
        data_category: Data classification (PII, Educational, etc.)
        sensitivity_level: Sensitivity classification
        storage_location: Where the data is stored
    """

    __tablename__ = "data_inventory"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )

    # Item identification
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(100), nullable=False)
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, index=True
    )

    # Data classification
    data_category: Mapped[str] = mapped_column(String(100), nullable=False)
    sensitivity_level: Mapped[str] = mapped_column(String(20), nullable=False)

    # Storage information
    storage_location: Mapped[str] = mapped_column(String(200), nullable=False)
    table_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    column_names: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Retention metadata
    data_created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    last_accessed: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    retention_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Flags
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_anonymized: Mapped[bool] = mapped_column(Boolean, default=False)
    has_legal_hold: Mapped[bool] = mapped_column(Boolean, default=False)

    # Audit
    discovered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "entity_type",
            "entity_id",
            "data_category",
            "storage_location",
            name="uq_inventory_item",
        ),
        Index("idx_inventory_entity", "entity_type", "entity_id"),
        Index("idx_inventory_tenant", "tenant_id"),
        Index("idx_inventory_retention", "retention_until"),
        Index("idx_inventory_category", "data_category"),
        Index("idx_inventory_legal_hold", "has_legal_hold"),
    )

    def __repr__(self) -> str:
        return (
            f"<DataInventoryItem(entity={self.entity_type}:{self.entity_id}, "
            f"category={self.data_category})>"
        )
