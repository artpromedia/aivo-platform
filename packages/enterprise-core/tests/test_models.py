"""
Tests for enterprise_core.models.base module.

Covers SQLAlchemy mixins: UUIDMixin, TimestampMixin, TenantMixin,
SoftDeleteMixin, AuditableMixin, and the Base class.
"""

import pytest
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from enterprise_core.models.base import (
    Base,
    UUIDMixin,
    TimestampMixin,
    TenantMixin,
    SoftDeleteMixin,
    AuditableMixin,
)


# ── Concrete test models using the mixins ─────────────────────────


class SimpleUUID(Base, UUIDMixin):
    __tablename__ = "test_simple_uuid"
    name: Mapped[str] = mapped_column(String(100), default="test")


class SimpleTimestamp(Base, TimestampMixin):
    __tablename__ = "test_simple_timestamp"
    label: Mapped[str] = mapped_column(String(100), default="label")


class TenantModel(Base, TimestampMixin, TenantMixin):
    __tablename__ = "test_tenant_model"
    title: Mapped[str] = mapped_column(String(200), default="title")


class SoftDeleteModel(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "test_soft_delete_model"
    content: Mapped[str] = mapped_column(String(500), default="content")


class AuditableModel(Base, TimestampMixin, AuditableMixin):
    __tablename__ = "test_auditable_model"
    value: Mapped[str] = mapped_column(String(100), default="value")


# ── Base class tests ──────────────────────────────────────────────


class TestBase:
    """Tests for the Base declarative base class."""

    def test_base_is_declarative_base(self):
        assert hasattr(Base, "metadata")
        assert hasattr(Base, "registry")

    def test_type_annotation_map_contains_datetime(self):
        assert datetime in Base.type_annotation_map

    def test_type_annotation_map_contains_uuid(self):
        assert UUID in Base.type_annotation_map

    def test_subclass_has_tablename(self):
        assert SimpleUUID.__tablename__ == "test_simple_uuid"


# ── UUIDMixin tests ──────────────────────────────────────────────


class TestUUIDMixin:
    """Tests for UUIDMixin."""

    def test_has_id_column(self):
        cols = {c.name for c in SimpleUUID.__table__.columns}
        assert "id" in cols

    def test_id_is_primary_key(self):
        id_col = SimpleUUID.__table__.c.id
        assert id_col.primary_key

    def test_id_has_index(self):
        id_col = SimpleUUID.__table__.c.id
        assert id_col.index


# ── TimestampMixin tests ─────────────────────────────────────────


class TestTimestampMixin:
    """Tests for TimestampMixin (inherits UUIDMixin)."""

    def test_has_created_at_column(self):
        cols = {c.name for c in SimpleTimestamp.__table__.columns}
        assert "created_at" in cols

    def test_has_updated_at_column(self):
        cols = {c.name for c in SimpleTimestamp.__table__.columns}
        assert "updated_at" in cols

    def test_has_id_from_uuid_mixin(self):
        cols = {c.name for c in SimpleTimestamp.__table__.columns}
        assert "id" in cols

    def test_created_at_not_nullable(self):
        col = SimpleTimestamp.__table__.c.created_at
        assert col.nullable is False

    def test_updated_at_not_nullable(self):
        col = SimpleTimestamp.__table__.c.updated_at
        assert col.nullable is False

    def test_dict_method_exists(self):
        assert hasattr(TimestampMixin, "dict")
        assert callable(TimestampMixin.dict)


# ── TenantMixin tests ────────────────────────────────────────────


class TestTenantMixin:
    """Tests for TenantMixin."""

    def test_has_tenant_id_column(self):
        cols = {c.name for c in TenantModel.__table__.columns}
        assert "tenant_id" in cols

    def test_tenant_id_is_nullable(self):
        col = TenantModel.__table__.c.tenant_id
        assert col.nullable is True

    def test_tenant_id_is_indexed(self):
        col = TenantModel.__table__.c.tenant_id
        assert col.index is True


# ── SoftDeleteMixin tests ────────────────────────────────────────


class TestSoftDeleteMixin:
    """Tests for SoftDeleteMixin."""

    def test_has_is_deleted_column(self):
        cols = {c.name for c in SoftDeleteModel.__table__.columns}
        assert "is_deleted" in cols

    def test_has_deleted_at_column(self):
        cols = {c.name for c in SoftDeleteModel.__table__.columns}
        assert "deleted_at" in cols

    def test_has_deleted_by_column(self):
        cols = {c.name for c in SoftDeleteModel.__table__.columns}
        assert "deleted_by" in cols

    def test_is_deleted_default_false(self):
        col = SoftDeleteModel.__table__.c.is_deleted
        assert col.default.arg is False

    def test_soft_delete_method(self):
        model = SoftDeleteModel()
        model.is_deleted = False
        model.deleted_at = None
        model.deleted_by = None
        model.soft_delete()
        assert model.is_deleted is True
        assert isinstance(model.deleted_at, datetime)
        assert model.deleted_by is None

    def test_soft_delete_with_user(self):
        model = SoftDeleteModel()
        model.is_deleted = False
        model.deleted_at = None
        model.deleted_by = None
        user_id = uuid4()
        model.soft_delete(deleted_by=user_id)
        assert model.is_deleted is True
        assert model.deleted_by == user_id

    def test_restore_method(self):
        model = SoftDeleteModel()
        model.is_deleted = True
        model.deleted_at = datetime.utcnow()
        model.deleted_by = uuid4()
        model.restore()
        assert model.is_deleted is False
        assert model.deleted_at is None
        assert model.deleted_by is None


# ── AuditableMixin tests ─────────────────────────────────────────


class TestAuditableMixin:
    """Tests for AuditableMixin."""

    def test_has_created_by_column(self):
        cols = {c.name for c in AuditableModel.__table__.columns}
        assert "created_by" in cols

    def test_has_updated_by_column(self):
        cols = {c.name for c in AuditableModel.__table__.columns}
        assert "updated_by" in cols

    def test_set_creator(self):
        model = AuditableModel()
        uid = uuid4()
        model.set_creator(uid)
        assert model.created_by == uid
        assert model.updated_by == uid

    def test_set_updater(self):
        model = AuditableModel()
        uid = uuid4()
        model.set_updater(uid)
        assert model.updated_by == uid
