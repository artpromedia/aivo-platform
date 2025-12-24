"""FERPA compliance and data protection."""

from .ferpa_compliance import (
    FERPAComplianceService,
    DataAccessRequest,
    DisclosureRecord,
    ConsentRecord,
    ConsentType,
    ConsentStatus,
    DisclosureReason,
    require_ferpa_compliance,
)

__all__ = [
    "FERPAComplianceService",
    "DataAccessRequest",
    "DisclosureRecord",
    "ConsentRecord",
    "ConsentType",
    "ConsentStatus",
    "DisclosureReason",
    "require_ferpa_compliance",
]
