"""
ML Model Registry

Manages the lifecycle of machine-learning model versions:
register → validate → promote → shadow-test → activate → retire.

Stores model metadata and version history in PostgreSQL via SQLAlchemy.
Binary artefacts (weights / checkpoints) live in object storage —
this registry only tracks the URI.

Author: AIVO Platform Team
"""

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from enterprise_core.models.base import Base, TimestampMixin, TenantMixin


# ── Enums ────────────────────────────────────────────────────────


class ModelStage(StrEnum):
    """Model lifecycle stages."""

    REGISTERED = "registered"
    VALIDATED = "validated"
    STAGING = "staging"
    PRODUCTION = "production"
    SHADOW = "shadow"
    RETIRED = "retired"


class ModelFramework(StrEnum):
    """Supported ML frameworks."""

    SKLEARN = "sklearn"
    PYTORCH = "pytorch"
    ONNX = "onnx"
    CUSTOM = "custom"


# ── SQLAlchemy Table ─────────────────────────────────────────────


class ModelVersionRecord(Base, TimestampMixin, TenantMixin):
    """
    SQLAlchemy model for storing model versions in PostgreSQL.

    Each row represents a single versioned artefact for a named model.
    """

    __tablename__ = "ml_model_versions"

    name: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True, comment="Logical model name"
    )
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="Monotonically increasing version"
    )
    stage: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=ModelStage.REGISTERED,
        index=True,
        comment="Lifecycle stage",
    )
    framework: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="ML framework identifier"
    )
    artifact_uri: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="URI to model artefact in object storage"
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="Human-readable description"
    )

    # Metrics & metadata stored as JSONB for flexibility
    metrics: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True, comment="Evaluation metrics (accuracy, AUC, …)"
    )
    parameters: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True, comment="Training hyper-parameters"
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=False, index=True, comment="Active production flag"
    )

    registered_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), nullable=True, comment="User who registered"
    )
    promoted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="When promoted to prod"
    )

    def __repr__(self) -> str:
        return (
            f"<ModelVersionRecord(name={self.name!r}, v={self.version}, "
            f"stage={self.stage!r})>"
        )


# ── Pydantic Schema ─────────────────────────────────────────────


class ModelVersionSchema(BaseModel):
    """Pydantic view of a model version — used in API layer."""

    id: Optional[UUID] = None
    name: str = Field(..., min_length=1, max_length=255)
    version: int = Field(..., ge=1)
    stage: ModelStage = ModelStage.REGISTERED
    framework: ModelFramework = ModelFramework.CUSTOM
    artifact_uri: Optional[str] = None
    description: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    parameters: Optional[Dict[str, Any]] = None
    is_active: bool = False
    registered_by: Optional[UUID] = None
    promoted_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── In-Memory Registry (no DB dependency) ────────────────────────


class ModelRegistry:
    """
    ML Model Registry with versioning, promotion, rollback, and shadow testing.

    This is an in-memory implementation suitable for tests and single-process
    deployments.  For production persistence supply a SQLAlchemy ``Session``
    to the DB-backed methods (future extension).

    Usage::

        registry = ModelRegistry()

        # Register a new version
        v1 = registry.register_model(
            name="bkt-algebra",
            framework=ModelFramework.SKLEARN,
            artifact_uri="s3://models/bkt-algebra/v1.pkl",
            metrics={"accuracy": 0.91},
        )

        # Promote to production
        registry.promote(name="bkt-algebra", version=1)

        # Get the active model
        active = registry.get_active_model("bkt-algebra")
    """

    def __init__(self) -> None:
        # {name: [ModelVersionSchema, …]}  ordered by version
        self._models: Dict[str, List[ModelVersionSchema]] = {}

    # ── Register ─────────────────────────────────────────────────

    def register_model(
        self,
        name: str,
        framework: ModelFramework = ModelFramework.CUSTOM,
        artifact_uri: Optional[str] = None,
        description: Optional[str] = None,
        metrics: Optional[Dict[str, Any]] = None,
        parameters: Optional[Dict[str, Any]] = None,
        registered_by: Optional[UUID] = None,
    ) -> ModelVersionSchema:
        """
        Register a new model version.

        Version numbers auto-increment per model name.

        Returns:
            The newly created ``ModelVersionSchema``.
        """
        versions = self._models.setdefault(name, [])
        next_version = len(versions) + 1

        mv = ModelVersionSchema(
            id=uuid4(),
            name=name,
            version=next_version,
            stage=ModelStage.REGISTERED,
            framework=framework,
            artifact_uri=artifact_uri,
            description=description,
            metrics=metrics,
            parameters=parameters,
            registered_by=registered_by,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        versions.append(mv)
        return mv

    # ── Read ─────────────────────────────────────────────────────

    def get_model(self, name: str, version: int) -> Optional[ModelVersionSchema]:
        """Get a specific version of a model."""
        versions = self._models.get(name, [])
        for mv in versions:
            if mv.version == version:
                return mv
        return None

    def get_active_model(self, name: str) -> Optional[ModelVersionSchema]:
        """Return the currently active (production) version."""
        for mv in reversed(self._models.get(name, [])):
            if mv.is_active:
                return mv
        return None

    def list_versions(
        self,
        name: str,
        stage: Optional[ModelStage] = None,
    ) -> List[ModelVersionSchema]:
        """List versions of a model, optionally filtered by stage."""
        versions = self._models.get(name, [])
        if stage is not None:
            return [mv for mv in versions if mv.stage == stage]
        return list(versions)

    def list_models(self) -> List[str]:
        """Return names of all registered models."""
        return list(self._models.keys())

    # ── Promote / Rollback ───────────────────────────────────────

    def promote(
        self,
        name: str,
        version: int,
        stage: ModelStage = ModelStage.PRODUCTION,
    ) -> ModelVersionSchema:
        """
        Promote a version to *stage* and set it as the active model.

        Any previously active version of the same model is deactivated.

        Raises:
            KeyError: If model/version is not found.
        """
        mv = self.get_model(name, version)
        if mv is None:
            raise KeyError(f"Model {name!r} version {version} not found")

        # Deactivate previous active version
        for other in self._models.get(name, []):
            if other.is_active and other.version != version:
                other.is_active = False
                if other.stage == ModelStage.PRODUCTION:
                    other.stage = ModelStage.RETIRED
                other.updated_at = datetime.now(timezone.utc)

        mv.stage = stage
        mv.is_active = True
        mv.promoted_at = datetime.now(timezone.utc)
        mv.updated_at = datetime.now(timezone.utc)
        return mv

    def rollback(self, name: str) -> Optional[ModelVersionSchema]:
        """
        Roll back to the previous production version.

        Sets previous version back to PRODUCTION / active and retires
        the current active version.

        Returns:
            The restored ``ModelVersionSchema``, or *None* if there is
            no version to roll back to.
        """
        versions = self._models.get(name, [])
        active = self.get_active_model(name)
        if active is None:
            return None

        # Find the most recent retired version
        candidates = [
            mv
            for mv in reversed(versions)
            if mv.version < active.version and mv.stage in (
                ModelStage.RETIRED, ModelStage.VALIDATED, ModelStage.STAGING
            )
        ]
        if not candidates:
            return None

        previous = candidates[0]

        # Retire current active
        active.is_active = False
        active.stage = ModelStage.RETIRED
        active.updated_at = datetime.now(timezone.utc)

        # Restore previous
        previous.is_active = True
        previous.stage = ModelStage.PRODUCTION
        previous.promoted_at = datetime.now(timezone.utc)
        previous.updated_at = datetime.now(timezone.utc)

        return previous

    # ── Shadow Testing ───────────────────────────────────────────

    def start_shadow_test(
        self,
        name: str,
        shadow_version: int,
    ) -> ModelVersionSchema:
        """
        Begin shadow testing a candidate version alongside production.

        The candidate is marked as SHADOW while the active version
        remains in PRODUCTION.

        Raises:
            KeyError: If model/version not found.
            ValueError: If there is no active production model.
        """
        mv = self.get_model(name, shadow_version)
        if mv is None:
            raise KeyError(f"Model {name!r} version {shadow_version} not found")

        active = self.get_active_model(name)
        if active is None:
            raise ValueError(
                f"No active model for {name!r}; promote a version first"
            )

        mv.stage = ModelStage.SHADOW
        mv.updated_at = datetime.now(timezone.utc)
        return mv

    def complete_shadow_test(
        self,
        name: str,
        shadow_version: int,
        promote_shadow: bool = False,
    ) -> ModelVersionSchema:
        """
        Complete a shadow test.

        If *promote_shadow* is True the shadow version replaces the
        current production version.  Otherwise it moves to VALIDATED.

        Raises:
            KeyError: If model/version not found.
        """
        mv = self.get_model(name, shadow_version)
        if mv is None:
            raise KeyError(f"Model {name!r} version {shadow_version} not found")

        if promote_shadow:
            return self.promote(name, shadow_version)

        mv.stage = ModelStage.VALIDATED
        mv.updated_at = datetime.now(timezone.utc)
        return mv

    # ── Update / Delete ──────────────────────────────────────────

    def update_metrics(
        self,
        name: str,
        version: int,
        metrics: Dict[str, Any],
    ) -> ModelVersionSchema:
        """
        Update evaluation metrics for a model version.

        Raises:
            KeyError: If model/version not found.
        """
        mv = self.get_model(name, version)
        if mv is None:
            raise KeyError(f"Model {name!r} version {version} not found")

        mv.metrics = mv.metrics or {}
        mv.metrics.update(metrics)
        mv.updated_at = datetime.now(timezone.utc)
        return mv

    def retire(self, name: str, version: int) -> ModelVersionSchema:
        """
        Retire a model version.

        Raises:
            KeyError: If model/version not found.
        """
        mv = self.get_model(name, version)
        if mv is None:
            raise KeyError(f"Model {name!r} version {version} not found")

        mv.stage = ModelStage.RETIRED
        mv.is_active = False
        mv.updated_at = datetime.now(timezone.utc)
        return mv
