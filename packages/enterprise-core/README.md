# AIVO Enterprise Core

Enterprise-grade shared models for the AIVO Platform, ported from legacy repositories
(aivo and aivo-pro) to strengthen enterprise foundations.

## Overview

This package provides:

- **Base Models**: Reusable SQLAlchemy base classes and mixins
- **Compliance Models**: GDPR, COPPA, FERPA compliant data structures
- **ML Models**: Bayesian Knowledge Tracing and Adaptive Learning

## Installation

```bash
pip install -e packages/enterprise-core
```

Or add to your service's requirements:

```toml
[project.dependencies]
aivo-enterprise-core = { path = "../../packages/enterprise-core", develop = true }
```

## Modules

### 1. Base Models (`enterprise_core.models`)

Reusable SQLAlchemy infrastructure:

```python
from enterprise_core.models import (
    Base,           # SQLAlchemy declarative base
    TimestampMixin, # id, created_at, updated_at
    UUIDMixin,      # UUID primary key
    TenantMixin,    # Multi-tenancy support
    SoftDeleteMixin,# Soft delete functionality
    AuditableMixin, # created_by, updated_by tracking
    AuditEvent,     # Hash-chained audit logging
)

class MyModel(Base, TimestampMixin, TenantMixin):
    __tablename__ = "my_models"
    name: Mapped[str] = mapped_column(String(255))
```

### 2. Compliance Models (`enterprise_core.compliance`)

#### Consent Management (GDPR/COPPA)

```python
from enterprise_core.compliance import (
    ConsentRecord,      # User consent tracking
    ParentalRight,      # COPPA parental controls
    PreferenceSettings, # Granular preferences
    DataExportRequest,  # GDPR Article 20
    DeletionRequest,    # GDPR Article 17
)
```

#### Data Governance

```python
from enterprise_core.compliance import (
    RetentionPolicy,    # Data retention rules
    DSRRequest,         # Data subject rights
    LegalHold,          # Litigation holds
    DataInventoryItem,  # Data tracking
)
```

#### IEP/Special Education (FERPA)

```python
from enterprise_core.compliance import (
    IEPGoal,           # SMART goals
    IEPObjective,      # Short-term benchmarks
    IEPDataPoint,      # Progress data
    IEPAccommodation,  # Accommodations
    IEPService,        # Related services
    ComplianceLog,     # FERPA audit trail
)
```

### 3. ML Models (`enterprise_core.ml`)

#### Bayesian Knowledge Tracing

Research-backed implementation of BKT for tracking student mastery:

```python
from enterprise_core.ml import BayesianKnowledgeTracer, Response
from datetime import datetime

tracer = BayesianKnowledgeTracer()

# Record a student response
response = Response(
    correct=True,
    time_spent=15.5,
    attempt_number=1,
    timestamp=datetime.utcnow()
)

# Update knowledge state
prior, posterior = tracer.update_knowledge(
    student_id="student-123",
    skill="algebra-equations",
    response=response
)

# Check mastery
if posterior > 0.95:
    print("Skill mastered!")

# Get summary
summary = tracer.get_skill_summary("student-123", "algebra-equations")
```

#### Adaptive Learning Orchestrator

Intelligent recommendations for learning progression:

```python
from enterprise_core.ml import (
    AdaptiveLearningOrchestrator,
    LearnerMetrics,
)

orchestrator = AdaptiveLearningOrchestrator()

metrics = LearnerMetrics(
    student_id="student-123",
    subject="math",
    skill="algebra",
    recent_accuracy=0.92,
    overall_accuracy=0.85,
    completion_rate=0.95,
    average_time_per_task=25.0,
    focus_score=0.8,
    session_duration=20.0,
    consecutive_sessions=5,
    hint_usage_rate=0.1,
    current_level=5,
    attempts_at_current_level=15,
    successful_at_current_level=13,
    time_at_current_level=3.5,
)

recommendation = await orchestrator.analyze_and_recommend(metrics)
print(f"Recommendation: {recommendation.recommendation_type}")
print(f"Reasoning: {recommendation.reasoning}")
```

## Legacy Source Mapping

| Module | Source Repository | Source Path |
|--------|------------------|-------------|
| Base Models | aivo-legacy | services/integration-hub-svc/app/models/base.py |
| Audit Event | aivo-legacy | services/audit-log-svc/app/models/audit_event.py |
| Auth Models | aivo-legacy | services/auth-svc/app/models.py |
| Consent | aivo-legacy | services/consent-ledger-svc/app/models/models.py |
| Governance | aivo-legacy | services/data-governance-svc/models/__init__.py |
| BKT | aivo-pro | services/learning-session-svc/src/ml/knowledge_tracing.py |
| Adaptive | aivo-pro | services/training-alignment-svc/src/adaptive_orchestrator.py |
| IEP | aivo-pro | services/iep-assistant-svc/src/db/models.py |

## Enterprise Features

### Hash-Chained Audit Logging

WORM-compliant audit events with SHA-256 chain verification:

```python
from enterprise_core.models import AuditEvent

# Create audit event
event = AuditEvent.create_audit_event(
    actor="user-123",
    action="update",
    resource_type="user",
    resource_id="user-456",
    before_state={"email": "old@example.com"},
    after_state={"email": "new@example.com"},
    previous_hash="abc123...",  # Hash of previous event
)

# Verify integrity
if not event.verify_hash():
    raise SecurityError("Audit record tampered!")

# Verify chain integrity
is_valid, broken_at = AuditEvent.verify_chain(events)
```

### Multi-Tenancy

Built-in tenant isolation for SaaS:

```python
class Document(Base, TimestampMixin, TenantMixin):
    __tablename__ = "documents"
    title: Mapped[str] = mapped_column(String(255))

# Query with tenant isolation
docs = session.query(Document).filter(
    Document.tenant_id == current_tenant_id
).all()
```

### Compliance Framework Support

- **GDPR**: Consent management, data export, right to deletion
- **COPPA**: Parental consent, child data protection
- **FERPA**: Educational records privacy, IEP compliance
- **IDEA**: Special education requirements

## Requirements

- Python >= 3.12
- SQLAlchemy >= 2.0.35
- Pydantic >= 2.9.2
- NumPy >= 1.26.0 (for ML models)

## License

Proprietary - AIVO Platform
