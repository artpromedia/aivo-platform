"""
AIVO Enterprise Core Package

Enterprise-grade shared models for compliance, governance, and ML capabilities.
Ported from legacy aivo and aivo-pro repositories to strengthen enterprise foundations.

Modules:
    - models: Base SQLAlchemy models and reusable mixins
    - compliance: GDPR, COPPA, FERPA compliance models
    - ml: Machine learning models (BKT, adaptive learning)
    - schemas: Pydantic schemas for API validation

Usage:
    from enterprise_core.models import Base, TimestampMixin, AuditEvent
    from enterprise_core.compliance import ConsentRecord, DSRRequest
    from enterprise_core.ml import BayesianKnowledgeTracer
"""

__version__ = "1.0.0"
__author__ = "AIVO Platform Team"

from enterprise_core.models.base import (
    Base,
    TimestampMixin,
    UUIDMixin,
    TenantMixin,
    SoftDeleteMixin,
)
from enterprise_core.models.audit import AuditEvent

__all__ = [
    # Base models
    "Base",
    "TimestampMixin",
    "UUIDMixin",
    "TenantMixin",
    "SoftDeleteMixin",
    # Audit
    "AuditEvent",
]
