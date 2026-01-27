"""
Enterprise Base Model Infrastructure

Reusable SQLAlchemy base classes and mixins for enterprise applications.
Provides consistent patterns for:
- UUID primary keys
- Timestamp tracking
- Multi-tenancy
- Soft deletion
- Audit logging

Ported from: aivo-legacy/services/integration-hub-svc/app/models/base.py
Enhanced with patterns from: aivo-legacy/services/auth-svc/app/models.py

Author: AIVO Platform Team
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, String, Boolean, func, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """
    Base class for all database models.

    Provides:
    - Type annotation mapping for datetime and UUID
    - Common configuration for all models

    Usage:
        class User(Base, TimestampMixin):
            __tablename__ = "users"
            email: Mapped[str] = mapped_column(String(255), unique=True)
    """

    type_annotation_map = {
        datetime: DateTime(timezone=True),
        UUID: PGUUID(as_uuid=True),
    }


class UUIDMixin:
    """
    Mixin for UUID primary key.

    Provides a UUID-based primary key with automatic generation.
    Preferred over integer PKs for:
    - Distributed systems (no sequence coordination)
    - Security (non-guessable IDs)
    - API design (stable external identifiers)

    Usage:
        class User(Base, UUIDMixin, TimestampMixin):
            __tablename__ = "users"
    """

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        index=True,
    )


class TimestampMixin(UUIDMixin):
    """
    Mixin for standard timestamp fields with UUID.

    Provides:
    - id: UUID primary key
    - created_at: Record creation timestamp (server-side default)
    - updated_at: Last update timestamp (auto-updated)

    Note: Inherits from UUIDMixin to provide combined functionality.

    Usage:
        class User(Base, TimestampMixin):
            __tablename__ = "users"
            email: Mapped[str] = mapped_column(String(255))
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def dict(self) -> dict[str, Any]:
        """
        Convert model to dictionary.

        Returns:
            Dictionary with column names and values
        """
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }


class TenantMixin:
    """
    Mixin for multi-tenant isolation.

    Provides tenant_id field for row-level tenant isolation.
    Essential for SaaS platforms serving multiple organizations.

    Usage:
        class Document(Base, TimestampMixin, TenantMixin):
            __tablename__ = "documents"
            title: Mapped[str] = mapped_column(String(255))

    Note: Always add tenant_id to unique constraints and indexes
    for proper multi-tenant data isolation.
    """

    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=True,
        index=True,
        comment="Tenant ID for multi-tenancy isolation",
    )


class SoftDeleteMixin:
    """
    Mixin for soft delete functionality.

    Provides fields for marking records as deleted without physical removal.
    Useful for:
    - Data recovery
    - Audit compliance
    - Referential integrity preservation

    Usage:
        class User(Base, TimestampMixin, SoftDeleteMixin):
            __tablename__ = "users"

        # Mark as deleted
        user.is_deleted = True
        user.deleted_at = datetime.utcnow()
        user.deleted_by = admin_user_id

        # Query non-deleted records
        session.query(User).filter(User.is_deleted == False)
    """

    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
        comment="Soft delete flag",
    )

    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when record was soft deleted",
    )

    deleted_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=True,
        comment="User ID who performed the soft delete",
    )

    def soft_delete(self, deleted_by: Optional[UUID] = None) -> None:
        """
        Mark this record as soft deleted.

        Args:
            deleted_by: UUID of user performing the deletion
        """
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
        if deleted_by:
            self.deleted_by = deleted_by

    def restore(self) -> None:
        """Restore a soft-deleted record."""
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None


class AuditableMixin:
    """
    Mixin for tracking record changes.

    Provides fields for tracking who created and last modified a record.
    Essential for compliance and audit requirements.

    Usage:
        class Policy(Base, TimestampMixin, AuditableMixin):
            __tablename__ = "policies"

        # Track creation
        policy.created_by = current_user_id

        # Track modification
        policy.updated_by = current_user_id
    """

    created_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=True,
        comment="User ID who created the record",
    )

    updated_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=True,
        comment="User ID who last updated the record",
    )

    def set_creator(self, user_id: UUID) -> None:
        """Set the creator of this record."""
        self.created_by = user_id
        self.updated_by = user_id

    def set_updater(self, user_id: UUID) -> None:
        """Set the last updater of this record."""
        self.updated_by = user_id
