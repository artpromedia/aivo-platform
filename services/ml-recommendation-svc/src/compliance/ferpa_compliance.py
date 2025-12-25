"""
FERPA Compliance Module for Predictive Analytics

Ensures all predictive analytics operations comply with the Family Educational
Rights and Privacy Act (FERPA) requirements.

Key FERPA Requirements:
1. Written consent before disclosing PII from education records
2. Right to access and amend records
3. Annual notification of rights
4. Limited directory information exceptions
5. Audit trail for disclosures

This module provides:
- Data minimization (only necessary data)
- Access control enforcement
- Audit logging
- Consent management
- De-identification utilities
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Optional
import hashlib
import json
import logging
import re
import uuid

logger = logging.getLogger(__name__)


class ConsentType(str, Enum):
    """Types of consent for data use"""
    EDUCATIONAL_PURPOSE = "educational_purpose"      # Normal educational use
    RESEARCH = "research"                            # Research studies
    DIRECTORY_INFORMATION = "directory_information"  # Public info (name, etc.)
    THIRD_PARTY_DISCLOSURE = "third_party"          # Sharing with external parties
    PREDICTIVE_ANALYTICS = "predictive_analytics"   # ML predictions


class ConsentStatus(str, Enum):
    """Status of consent"""
    PENDING = "pending"
    GRANTED = "granted"
    DENIED = "denied"
    WITHDRAWN = "withdrawn"
    EXPIRED = "expired"


class DisclosureReason(str, Enum):
    """FERPA-permitted disclosure reasons"""
    SCHOOL_OFFICIAL = "school_official"          # Legitimate educational interest
    DIRECTORY_INFORMATION = "directory_info"     # Publicly available
    CONSENT = "consent"                          # Parent/student consent
    HEALTH_SAFETY = "health_safety"              # Emergency situations
    JUDICIAL_ORDER = "judicial_order"            # Court order
    AUDIT = "audit"                              # Authorized audit
    STUDIES = "studies"                          # Approved research


@dataclass
class DataAccessRequest:
    """Request to access student data"""
    request_id: str
    requestor_id: str
    requestor_role: str
    student_id: str
    data_types: list[str]
    purpose: str
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class DisclosureRecord:
    """Record of data disclosure (required by FERPA)"""
    disclosure_id: str
    student_id: str
    disclosed_to: str
    disclosed_by: str
    disclosure_reason: DisclosureReason
    data_disclosed: list[str]
    purpose: str
    timestamp: datetime
    consent_id: Optional[str] = None


@dataclass
class ConsentRecord:
    """Record of consent for data use"""
    consent_id: str
    student_id: str
    guardian_id: str
    consent_type: ConsentType
    status: ConsentStatus
    granted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    scope: dict = field(default_factory=dict)
    withdrawn_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)


class FERPAComplianceService:
    """
    FERPA compliance enforcement for predictive analytics.
    
    Ensures:
    1. Only authorized personnel access student data
    2. Consent is obtained where required
    3. All disclosures are logged
    4. Data is minimized to what's necessary
    5. Student/parent access rights are respected
    """
    
    # Roles with legitimate educational interest
    AUTHORIZED_ROLES = {
        "teacher",
        "counselor",
        "administrator",
        "principal",
        "special_education_coordinator",
        "school_psychologist",
        "intervention_specialist",
    }
    
    # Data types that can be accessed by role
    ROLE_DATA_ACCESS = {
        "teacher": [
            "risk_score",
            "risk_level",
            "risk_factors",
            "intervention_recommendations",
            "academic_metrics",
        ],
        "counselor": [
            "risk_score",
            "risk_level",
            "risk_factors",
            "intervention_recommendations",
            "academic_metrics",
            "behavioral_metrics",
            "engagement_metrics",
            "intervention_history",
        ],
        "administrator": [
            "risk_score",
            "risk_level",
            "aggregate_metrics",  # Aggregated only
        ],
        "intervention_specialist": [
            "risk_score",
            "risk_level",
            "risk_factors",
            "intervention_recommendations",
            "intervention_history",
            "protective_factors",
        ],
    }
    
    # Sensitive data requiring additional consent
    SENSITIVE_DATA_TYPES = {
        "demographic_data",
        "disability_status",
        "medical_information",
        "disciplinary_records",
        "psychological_assessments",
    }
    
    def __init__(self, db_connection, audit_logger=None):
        self.db = db_connection
        self.audit = audit_logger or logger
    
    def check_access(
        self,
        request: DataAccessRequest,
    ) -> tuple[bool, str, list[str]]:
        """
        Check if a data access request is permitted under FERPA.
        
        Returns:
            Tuple of (allowed, reason, permitted_data_types)
        """
        # 1. Check if requestor has legitimate educational interest
        if request.requestor_role not in self.AUTHORIZED_ROLES:
            self._log_denied_access(request, "unauthorized_role")
            return (
                False,
                f"Role '{request.requestor_role}' is not authorized to access student data",
                [],
            )
        
        # 2. Check if requestor has relationship with student
        has_relationship = self._check_relationship(
            request.requestor_id,
            request.student_id,
        )
        
        if not has_relationship:
            self._log_denied_access(request, "no_relationship")
            return (
                False,
                "Requestor does not have a legitimate educational relationship with this student",
                [],
            )
        
        # 3. Determine permitted data types based on role
        role_data = self.ROLE_DATA_ACCESS.get(request.requestor_role, [])
        permitted = [dt for dt in request.data_types if dt in role_data]
        
        # 4. Check for sensitive data requiring additional consent
        sensitive_requested = [
            dt for dt in request.data_types
            if dt in self.SENSITIVE_DATA_TYPES
        ]
        
        if sensitive_requested:
            consent = self._check_consent(
                request.student_id,
                ConsentType.EDUCATIONAL_PURPOSE,
                sensitive_requested,
            )
            
            if not consent:
                # Remove sensitive data from permitted list
                permitted = [dt for dt in permitted if dt not in self.SENSITIVE_DATA_TYPES]
                self._log_access_modification(
                    request,
                    f"Sensitive data removed due to lack of consent: {sensitive_requested}",
                )
        
        if not permitted:
            self._log_denied_access(request, "no_permitted_data")
            return (
                False,
                "None of the requested data types are permitted for your role",
                [],
            )
        
        # 5. Log approved access
        self._log_approved_access(request, permitted)
        
        return (True, "Access granted", permitted)
    
    async def log_disclosure(
        self,
        student_id: str,
        disclosed_to: str,
        disclosed_by: str,
        reason: DisclosureReason,
        data_disclosed: list[str],
        purpose: str,
        consent_id: Optional[str] = None,
    ) -> DisclosureRecord:
        """
        Log a disclosure of student data (required by FERPA).
        
        FERPA requires maintaining a record of each disclosure
        that can be accessed by parents/eligible students.
        """
        record = DisclosureRecord(
            disclosure_id=f"disc_{uuid.uuid4().hex[:12]}",
            student_id=student_id,
            disclosed_to=disclosed_to,
            disclosed_by=disclosed_by,
            disclosure_reason=reason,
            data_disclosed=data_disclosed,
            purpose=purpose,
            timestamp=datetime.now(timezone.utc),
            consent_id=consent_id,
        )
        
        await self._store_disclosure(record)
        
        self.audit.info(
            f"Disclosure logged: {record.disclosure_id} - "
            f"Student {student_id} data disclosed to {disclosed_to} "
            f"for {purpose}"
        )
        
        return record
    
    def get_disclosure_log(
        self,
        student_id: str,
        requestor_id: str,
    ) -> list[DisclosureRecord]:
        """
        Get disclosure log for a student.
        
        Parents and eligible students have the right to review
        the record of disclosures made from education records.
        """
        # Verify requestor is parent/guardian or eligible student
        is_authorized = self._check_disclosure_log_access(
            student_id, requestor_id
        )
        
        if not is_authorized:
            raise PermissionError(
                "Only parents/guardians or eligible students can access disclosure logs"
            )
        
        disclosures = self._get_disclosures(student_id)
        
        self.audit.info(
            f"Disclosure log accessed for student {student_id} by {requestor_id}"
        )
        
        return disclosures
    
    async def request_consent(
        self,
        student_id: str,
        guardian_id: str,
        consent_type: ConsentType,
        scope: dict,
        purpose: str,
    ) -> ConsentRecord:
        """
        Request consent for data use.
        
        Creates a pending consent request that must be approved
        by the parent/guardian before the data can be used.
        """
        record = ConsentRecord(
            consent_id=f"consent_{uuid.uuid4().hex[:12]}",
            student_id=student_id,
            guardian_id=guardian_id,
            consent_type=consent_type,
            status=ConsentStatus.PENDING,
            scope=scope,
            created_at=datetime.now(timezone.utc),
        )
        
        await self._store_consent(record)
        
        # Send notification to guardian
        await self._notify_consent_request(
            guardian_id=guardian_id,
            student_id=student_id,
            consent_type=consent_type,
            purpose=purpose,
        )
        
        self.audit.info(
            f"Consent requested: {record.consent_id} - "
            f"Type: {consent_type.value}, Student: {student_id}"
        )
        
        return record
    
    async def grant_consent(
        self,
        consent_id: str,
        guardian_id: str,
        duration_days: Optional[int] = 365,
    ) -> ConsentRecord:
        """Grant consent for data use"""
        record = await self._get_consent(consent_id)
        
        if record.guardian_id != guardian_id:
            raise PermissionError("Only the designated guardian can grant consent")
        
        record.status = ConsentStatus.GRANTED
        record.granted_at = datetime.now(timezone.utc)
        
        if duration_days:
            record.expires_at = datetime.now(timezone.utc) + timedelta(days=duration_days)
        
        await self._update_consent(record)
        
        self.audit.info(
            f"Consent granted: {consent_id} by guardian {guardian_id}"
        )
        
        return record
    
    async def withdraw_consent(
        self,
        consent_id: str,
        guardian_id: str,
        reason: Optional[str] = None,
    ) -> ConsentRecord:
        """
        Withdraw previously granted consent.
        
        Under FERPA, parents have the right to withdraw consent
        at any time. Withdrawal applies prospectively only.
        """
        record = await self._get_consent(consent_id)
        
        if record.guardian_id != guardian_id:
            raise PermissionError("Only the designated guardian can withdraw consent")
        
        record.status = ConsentStatus.WITHDRAWN
        record.withdrawn_at = datetime.now(timezone.utc)
        
        await self._update_consent(record)
        
        self.audit.info(
            f"Consent withdrawn: {consent_id} by guardian {guardian_id}. "
            f"Reason: {reason or 'Not provided'}"
        )
        
        return record
    
    def minimize_data(
        self,
        data: dict,
        permitted_fields: list[str],
    ) -> dict:
        """
        Apply data minimization - return only permitted fields.
        
        FERPA principle: Only access data necessary for the
        educational purpose.
        """
        return {k: v for k, v in data.items() if k in permitted_fields}
    
    def _get_default_remove_fields(self) -> list[str]:
        """Get default list of fields to remove for de-identification."""
        return [
            "student_id",
            "name",
            "email",
            "ssn",
            "address",
            "phone",
            "parent_name",
            "date_of_birth",
        ]
    
    def _generalize_zip_code(self, value: Any) -> str:
        """Generalize zip code to first 3 digits."""
        return str(value)[:3] + "XX" if value else ""
    
    def _generalize_birth_year(self, value: Any) -> str:
        """Generalize birth year to 5-year range."""
        if not value:
            return ""
        base = (value // 5) * 5
        return f"{base}-{base + 4}"
    
    def _generalize_quasi_identifier(self, key: str, value: Any) -> Optional[str]:
        """Generalize a quasi-identifier value."""
        if key == "zip_code":
            return self._generalize_zip_code(value)
        if key == "birth_year":
            return self._generalize_birth_year(value)
        return None
    
    def _generate_record_id(self, record: dict) -> str:
        """Generate anonymized record ID from record hash."""
        return hashlib.sha256(
            json.dumps(record, sort_keys=True, default=str).encode()
        ).hexdigest()[:12]
    
    def _de_identify_record(
        self,
        record: dict,
        remove_fields: list[str],
        quasi_identifiers: list[str],
    ) -> dict:
        """De-identify a single record."""
        cleaned = {}
        for key, value in record.items():
            if key in remove_fields:
                continue
            if key in quasi_identifiers:
                generalized = self._generalize_quasi_identifier(key, value)
                if generalized is not None:
                    cleaned[key] = generalized
            else:
                cleaned[key] = value
        cleaned["record_id"] = self._generate_record_id(record)
        return cleaned
    
    def de_identify_data(
        self,
        data: list[dict],
        remove_fields: Optional[list[str]] = None,
    ) -> list[dict]:
        """
        De-identify data for research or aggregate analysis.
        
        Removes or hashes direct identifiers and quasi-identifiers.
        """
        remove_fields = remove_fields or self._get_default_remove_fields()
        quasi_identifiers = ["zip_code", "birth_year"]
        
        return [
            self._de_identify_record(record, remove_fields, quasi_identifiers)
            for record in data
        ]
    
    def check_k_anonymity(
        self,
        data: list[dict],
        quasi_identifiers: list[str],
        k: int = 5,
    ) -> tuple[bool, dict]:
        """
        Check if dataset meets k-anonymity requirement.
        
        K-anonymity: Every combination of quasi-identifiers
        appears at least k times in the dataset.
        """
        from collections import Counter
        
        # Create equivalence classes
        equivalence_classes = Counter()
        
        for record in data:
            qi_values = tuple(
                record.get(qi, None) for qi in quasi_identifiers
            )
            equivalence_classes[qi_values] += 1
        
        # Check if all classes have at least k members
        violations = {
            str(qi): count
            for qi, count in equivalence_classes.items()
            if count < k
        }
        
        return (len(violations) == 0, violations)
    
    async def handle_data_request(
        self,
        student_id: str,
        requestor_id: str,
    ) -> dict:
        """
        Handle parent/student request to view their education records.
        
        Under FERPA, parents (or eligible students 18+) have the
        right to inspect and review education records.
        """
        # Verify requestor rights
        is_authorized = self._check_record_access_rights(
            student_id, requestor_id
        )
        
        if not is_authorized:
            raise PermissionError(
                "Only parents/guardians or eligible students can access records"
            )
        
        # Compile records
        records = self._compile_student_records(student_id)
        
        # Log access
        await self.log_disclosure(
            student_id=student_id,
            disclosed_to=requestor_id,
            disclosed_by="system",
            reason=DisclosureReason.CONSENT,
            data_disclosed=["education_records"],
            purpose="Parent/student record access request",
        )
        
        return records
    
    async def handle_amendment_request(
        self,
        student_id: str,
        requestor_id: str,
        record_type: str,
        requested_change: str,
        reason: str,
    ) -> dict:
        """
        Handle request to amend education records.
        
        Under FERPA, parents have the right to request amendment
        of records they believe are inaccurate or misleading.
        """
        # Verify requestor rights
        is_authorized = self._check_record_access_rights(
            student_id, requestor_id
        )
        
        if not is_authorized:
            raise PermissionError(
                "Only parents/guardians or eligible students can request amendments"
            )
        
        # Create amendment request
        request_id = f"amend_{uuid.uuid4().hex[:12]}"
        
        await self._store_amendment_request({
            "request_id": request_id,
            "student_id": student_id,
            "requestor_id": requestor_id,
            "record_type": record_type,
            "requested_change": requested_change,
            "reason": reason,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
        })
        
        self.audit.info(
            f"Amendment request created: {request_id} for student {student_id}"
        )
        
        return {
            "request_id": request_id,
            "status": "pending",
            "message": (
                "Your amendment request has been received. "
                "You will be notified of the decision within 30 days."
            ),
        }
    
    # Helper methods (placeholders - implement with actual DB)
    
    def _check_relationship(
        self,
        user_id: str,  # noqa: ARG002
        student_id: str,  # noqa: ARG002
    ) -> bool:
        """Check if user has educational relationship with student"""
        # Query enrollments, class assignments, etc.
        return True  # Placeholder
    
    def _check_consent(
        self,
        student_id: str,  # noqa: ARG002
        consent_type: ConsentType,  # noqa: ARG002
        data_types: list[str],  # noqa: ARG002
    ) -> bool:
        """Check if consent exists for data access"""
        return True  # Placeholder
    
    def _check_disclosure_log_access(
        self,
        student_id: str,  # noqa: ARG002
        requestor_id: str,  # noqa: ARG002
    ) -> bool:
        """Check if requestor can access disclosure log"""
        return True  # Placeholder
    
    def _check_record_access_rights(
        self,
        student_id: str,  # noqa: ARG002
        requestor_id: str,  # noqa: ARG002
    ) -> bool:
        """Check if requestor has rights to access records"""
        return True  # Placeholder
    
    async def _store_disclosure(self, record: DisclosureRecord) -> None:
        """Store disclosure record"""
        pass
    
    def _get_disclosures(
        self,
        student_id: str,  # noqa: ARG002
    ) -> list[DisclosureRecord]:
        """Get all disclosures for a student"""
        return []
    
    async def _store_consent(self, record: ConsentRecord) -> None:
        """Store consent record"""
        pass
    
    async def _get_consent(self, consent_id: str) -> ConsentRecord:
        """Get consent record"""
        raise NotImplementedError()
    
    async def _update_consent(self, record: ConsentRecord) -> None:
        """Update consent record"""
        pass
    
    async def _notify_consent_request(
        self,
        guardian_id: str,
        student_id: str,
        consent_type: ConsentType,
        purpose: str,
    ) -> None:
        """Send consent request notification"""
        pass
    
    def _compile_student_records(
        self,
        student_id: str,  # noqa: ARG002
    ) -> dict:
        """Compile all education records for student"""
        return {}
    
    async def _store_amendment_request(self, request: dict) -> None:
        """Store amendment request"""
        pass
    
    def _log_denied_access(
        self,
        request: DataAccessRequest,
        reason: str,
    ) -> None:
        """Log denied access attempt"""
        self.audit.warning(
            f"Access denied: {request.request_id} - "
            f"User {request.requestor_id} ({request.requestor_role}) "
            f"tried to access data for student {request.student_id}. "
            f"Reason: {reason}"
        )
    
    def _log_access_modification(
        self,
        request: DataAccessRequest,
        modification: str,
    ) -> None:
        """Log access modification"""
        self.audit.info(
            f"Access modified: {request.request_id} - {modification}"
        )
    
    def _log_approved_access(
        self,
        request: DataAccessRequest,
        permitted_data: list[str],
    ) -> None:
        """Log approved access"""
        self.audit.info(
            f"Access approved: {request.request_id} - "
            f"User {request.requestor_id} ({request.requestor_role}) "
            f"accessing {permitted_data} for student {request.student_id}"
        )


# Decorator for FERPA compliance on API endpoints
def require_ferpa_compliance(data_types: list[str]):
    """
    Decorator to enforce FERPA compliance on API endpoints.
    
    Usage:
        @require_ferpa_compliance(["risk_score", "risk_factors"])
        async def get_student_risk(student_id: str, current_user: User):
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract user and student from kwargs
            current_user = kwargs.get("current_user")
            student_id = kwargs.get("student_id")
            
            if not current_user or not student_id:
                raise ValueError("FERPA check requires current_user and student_id")
            
            # Create access request
            request = DataAccessRequest(
                request_id=f"req_{uuid.uuid4().hex[:12]}",
                requestor_id=current_user.id,
                requestor_role=current_user.role,
                student_id=student_id,
                data_types=data_types,
                purpose=func.__name__,
            )
            
            # Check access
            ferpa = FERPAComplianceService(db_connection=None)  # Would inject
            allowed, reason, permitted = await ferpa.check_access(request)
            
            if not allowed:
                raise PermissionError(f"FERPA: {reason}")
            
            # Store permitted data types for function to use
            kwargs["_permitted_data_types"] = permitted
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator
