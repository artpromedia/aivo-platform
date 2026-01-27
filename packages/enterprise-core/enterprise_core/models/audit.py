"""
Immutable Audit Event Model with Hash Chain Verification

Implements WORM (Write Once Read Many) compliant audit logging with
SHA-256 hash chaining for tamper detection.

Ported from: aivo-legacy/services/audit-log-svc/app/models/audit_event.py

Schema matches S2C-05 specification:
    audit_event(id, ts, actor, actor_role, action, resource, before, after, ip, ua, sig)

Features:
- Append-only design (records cannot be modified or deleted)
- Hash chain for tamper detection
- Compliance-ready timestamps
- Request correlation
- Retention policy support

Author: AIVO Platform Team
"""

import hashlib
import json
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import JSON, String, Text, Index, DateTime
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from enterprise_core.models.base import Base, TimestampMixin


class AuditEvent(Base, TimestampMixin):
    """
    Immutable audit event model with WORM compliance.

    This table is append-only and uses hash chaining for tamper detection.
    Once written, records cannot be modified or deleted.

    Attributes:
        ts: Timestamp when the audit event occurred
        actor: User ID or system identifier who performed the action
        actor_role: Role of the actor at the time of action
        action: Action performed (create, update, delete, login, etc.)
        resource: Resource identifier (type:id or just type)
        before: State before the change (for updates/deletes)
        after: State after the change (for creates/updates)
        ip: IP address of the request
        ua: User agent string from the request
        sig: SHA-256 hash signature for tamper detection
        previous_hash: Hash of the previous audit record in chain
        current_hash: SHA-256 hash of this record's content

    Example:
        # Create an audit event
        event = AuditEvent.create_audit_event(
            actor="user-123",
            action="update",
            resource_type="user",
            resource_id="user-456",
            before_state={"email": "old@example.com"},
            after_state={"email": "new@example.com"},
            ip_address="192.168.1.1",
            previous_hash="abc123...",
        )

        # Verify integrity
        if not event.verify_hash():
            raise SecurityError("Audit record tampered!")
    """

    __tablename__ = "audit_events"

    # S2C-05 Core Fields
    ts: Mapped[datetime] = mapped_column(
        "timestamp",
        DateTime(timezone=True),
        nullable=False,
        index=True,
        default=datetime.utcnow,
        comment="Timestamp when the audit event occurred",
    )

    # Actor information (S2C-05: actor, actor_role)
    actor: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="User ID or system identifier who performed the action",
    )

    actor_role: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Role of the actor at the time of action",
    )

    # Action details (S2C-05: action)
    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Action performed (create, update, delete, login, etc.)",
    )

    # Resource information (S2C-05: resource)
    resource: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="Resource identifier (type:id or just type)",
    )

    resource_type: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="Type of resource affected",
    )

    resource_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        comment="ID of the specific resource affected",
    )

    # State tracking (S2C-05: before, after)
    before: Mapped[Optional[dict[str, Any]]] = mapped_column(
        "before_state",
        JSON,
        nullable=True,
        comment="State before the change (for updates/deletes)",
    )

    after: Mapped[Optional[dict[str, Any]]] = mapped_column(
        "after_state",
        JSON,
        nullable=True,
        comment="State after the change (for creates/updates)",
    )

    # Request context (S2C-05: ip, ua)
    ip: Mapped[Optional[str]] = mapped_column(
        "ip_address",
        String(45),  # IPv6 support
        nullable=True,
        comment="IP address of the request",
    )

    ua: Mapped[Optional[str]] = mapped_column(
        "user_agent",
        Text,
        nullable=True,
        comment="User agent string from the request",
    )

    # Correlation fields
    request_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        comment="Unique request ID for correlation",
    )

    session_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Session ID if applicable",
    )

    # Tenant isolation
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=True,
        index=True,
        comment="Tenant ID for multi-tenancy",
    )

    # Additional metadata
    metadata: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="Additional context-specific metadata",
    )

    # Hash chain for tamper detection (S2C-05: sig)
    current_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
        comment="SHA-256 hash of this record's content",
    )

    previous_hash: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        index=True,
        comment="Hash of the previous audit record in chain",
    )

    # Compliance fields
    retention_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Date when this record can be archived (compliance)",
    )

    compliance_flags: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="Compliance-related flags and metadata",
    )

    # Database indexes for efficient querying
    __table_args__ = (
        Index("idx_audit_timestamp_desc", "timestamp", postgresql_using="btree"),
        Index("idx_audit_actor_timestamp", "actor", "timestamp"),
        Index("idx_audit_action_timestamp", "action", "timestamp"),
        Index("idx_audit_resource", "resource_type", "resource_id"),
        Index("idx_audit_hash_chain", "previous_hash", "current_hash"),
        Index("idx_audit_request_correlation", "request_id", "session_id"),
        Index("idx_audit_tenant", "tenant_id", "timestamp"),
    )

    def __repr__(self) -> str:
        """String representation."""
        return (
            f"<AuditEvent(id={self.id}, actor='{self.actor}', "
            f"action='{self.action}', resource='{self.resource_type}')>"
        )

    def calculate_hash(self, previous_hash: Optional[str] = None) -> str:
        """
        Calculate SHA-256 hash of this audit event's content.

        The hash includes all relevant fields to ensure any modification
        is detectable. Uses sorted keys and consistent separators for
        deterministic hashing.

        Args:
            previous_hash: Hash of the previous record in the chain

        Returns:
            SHA-256 hash as hexadecimal string (64 characters)
        """
        content = {
            "id": str(self.id) if self.id else None,
            "timestamp": self.ts.isoformat() if self.ts else None,
            "actor": self.actor,
            "actor_role": self.actor_role,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "before_state": self.before,
            "after_state": self.after,
            "ip_address": self.ip,
            "user_agent": self.ua,
            "request_id": self.request_id,
            "session_id": self.session_id,
            "tenant_id": str(self.tenant_id) if self.tenant_id else None,
            "metadata": self.metadata,
            "previous_hash": previous_hash,
        }

        # Convert to JSON with sorted keys for deterministic hashing
        content_json = json.dumps(content, sort_keys=True, separators=(",", ":"))

        # Calculate SHA-256 hash
        return hashlib.sha256(content_json.encode("utf-8")).hexdigest()

    def verify_hash(self) -> bool:
        """
        Verify that the stored hash matches the calculated hash.

        Use this method to detect tampering with audit records.
        Should be run periodically as part of compliance audits.

        Returns:
            True if hash is valid, False if record has been tampered
        """
        calculated_hash = self.calculate_hash(self.previous_hash)
        return calculated_hash == self.current_hash

    @classmethod
    def create_audit_event(
        cls,
        actor: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        before_state: Optional[dict[str, Any]] = None,
        after_state: Optional[dict[str, Any]] = None,
        actor_role: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        session_id: Optional[str] = None,
        tenant_id: Optional[UUID] = None,
        metadata: Optional[dict[str, Any]] = None,
        previous_hash: Optional[str] = None,
        retention_until: Optional[datetime] = None,
        compliance_flags: Optional[dict[str, Any]] = None,
    ) -> "AuditEvent":
        """
        Create a new audit event with proper hash calculation.

        Factory method that ensures hash chain integrity by automatically
        calculating the hash based on all event content.

        Args:
            actor: User ID or system identifier
            action: Action performed (create, update, delete, login, etc.)
            resource_type: Type of resource affected
            resource_id: ID of specific resource
            before_state: State before change
            after_state: State after change
            actor_role: Role of actor
            ip_address: IP address of request
            user_agent: User agent string
            request_id: Request ID for correlation
            session_id: Session ID if applicable
            tenant_id: Tenant ID for multi-tenancy
            metadata: Additional metadata
            previous_hash: Hash of previous record in chain
            retention_until: Retention date for compliance
            compliance_flags: Compliance metadata

        Returns:
            New AuditEvent instance with calculated hash
        """
        event = cls(
            ts=datetime.utcnow(),
            actor=actor,
            actor_role=actor_role,
            action=action,
            resource=f"{resource_type}:{resource_id}" if resource_id else resource_type,
            resource_type=resource_type,
            resource_id=resource_id,
            before=before_state,
            after=after_state,
            ip=ip_address,
            ua=user_agent,
            request_id=request_id,
            session_id=session_id,
            tenant_id=tenant_id,
            metadata=metadata,
            previous_hash=previous_hash,
            retention_until=retention_until,
            compliance_flags=compliance_flags,
        )

        # Calculate and set the hash
        event.current_hash = event.calculate_hash(previous_hash)

        return event

    @staticmethod
    def verify_chain(events: list["AuditEvent"]) -> tuple[bool, Optional[int]]:
        """
        Verify the integrity of an audit event chain.

        Checks that each event's hash correctly references the previous
        event's hash, forming an unbroken chain.

        Args:
            events: List of AuditEvent objects sorted by timestamp

        Returns:
            Tuple of (is_valid, first_invalid_index)
            - (True, None) if chain is valid
            - (False, index) if chain is broken at index
        """
        for i, event in enumerate(events):
            # Verify this event's hash
            if not event.verify_hash():
                return False, i

            # Verify chain linkage (except first event)
            if i > 0:
                expected_previous = events[i - 1].current_hash
                if event.previous_hash != expected_previous:
                    return False, i

        return True, None
