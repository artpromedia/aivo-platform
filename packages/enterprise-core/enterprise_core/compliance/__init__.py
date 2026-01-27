"""
Enterprise Compliance Models

Provides GDPR, COPPA, and FERPA compliant models for:
- Consent management
- Data subject rights (DSR)
- Data governance
- Retention policies
- Legal holds
- IEP/Special Education

Ported from:
- aivo-legacy/services/consent-ledger-svc/app/models/models.py
- aivo-legacy/services/data-governance-svc/models/__init__.py
- aivo-pro/services/iep-assistant-svc/src/db/models.py
"""

from enterprise_core.compliance.consent import (
    ConsentType,
    ConsentStatus,
    ParentalRightType,
    RequestStatus,
    AuditAction,
    ConsentRecord,
    ParentalRight,
    PreferenceSettings,
    DataExportRequest,
    DeletionRequest,
    ConsentAuditLog,
)

from enterprise_core.compliance.governance import (
    EntityType,
    DSRType,
    DSRStatus,
    LegalHoldStatus,
    RetentionPolicy,
    DSRRequest,
    LegalHold,
    DSRLegalHoldBlock,
    DataInventoryItem,
)

from enterprise_core.compliance.iep import (
    GoalType,
    GoalStatus,
    ProgressTrend,
    IEPGoal,
    IEPObjective,
    IEPDataPoint,
    IEPDocument,
    IEPMeeting,
    IEPAmendment,
    IEPAccommodation,
    IEPService,
    StudentProgress,
    ComplianceLog,
)

__all__ = [
    # Consent enums
    "ConsentType",
    "ConsentStatus",
    "ParentalRightType",
    "RequestStatus",
    "AuditAction",
    # Consent models
    "ConsentRecord",
    "ParentalRight",
    "PreferenceSettings",
    "DataExportRequest",
    "DeletionRequest",
    "ConsentAuditLog",
    # Governance enums
    "EntityType",
    "DSRType",
    "DSRStatus",
    "LegalHoldStatus",
    # Governance models
    "RetentionPolicy",
    "DSRRequest",
    "LegalHold",
    "DSRLegalHoldBlock",
    "DataInventoryItem",
    # IEP enums
    "GoalType",
    "GoalStatus",
    "ProgressTrend",
    # IEP models
    "IEPGoal",
    "IEPObjective",
    "IEPDataPoint",
    "IEPDocument",
    "IEPMeeting",
    "IEPAmendment",
    "IEPAccommodation",
    "IEPService",
    "StudentProgress",
    "ComplianceLog",
]
