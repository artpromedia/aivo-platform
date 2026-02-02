"""
Privacy and Compliance Service

Handle data anonymization, consent management, retention policies,
and COPPA-compliant processing for learning analytics.
"""
import logging
import hashlib
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Set
from enum import Enum
import uuid

logger = logging.getLogger(__name__)


class ConsentType(Enum):
    """Types of data collection consent."""
    ANALYTICS = "analytics"
    PERSONALIZATION = "personalization"
    THIRD_PARTY = "third_party"
    RESEARCH = "research"
    MARKETING = "marketing"


class DataCategory(Enum):
    """Categories of collected data."""
    BEHAVIORAL = "behavioral"
    PERFORMANCE = "performance"
    DEMOGRAPHIC = "demographic"
    BIOMETRIC = "biometric"
    LOCATION = "location"
    DEVICE = "device"


class RetentionPeriod(Enum):
    """Data retention periods."""
    SESSION = "session"  # Delete after session ends
    THIRTY_DAYS = "30d"
    NINETY_DAYS = "90d"
    ONE_YEAR = "1y"
    INDEFINITE = "indefinite"


@dataclass
class ConsentRecord:
    """Record of user consent."""
    user_id: str
    consent_type: str
    granted: bool
    timestamp: datetime
    expires_at: Optional[datetime] = None
    version: str = "1.0"
    parent_guardian_id: Optional[str] = None  # For COPPA
    is_minor: bool = False


@dataclass
class AnonymizationResult:
    """Result of data anonymization."""
    original_fields_count: int
    anonymized_fields_count: int
    removed_fields: List[str]
    pseudonymized_fields: List[str]
    anonymous_id: str
    compliance_level: str


@dataclass
class PrivacyConfig:
    """Privacy configuration for a user."""
    user_id: str
    is_minor: bool = False
    consent_required: bool = True
    consents: Dict[str, bool] = field(default_factory=dict)
    data_retention: str = "90d"
    anonymize_by_default: bool = False
    parent_consent_required: bool = False


@dataclass
class ComplianceReport:
    """Compliance status report."""
    user_id: str
    is_compliant: bool
    coppa_compliant: bool
    gdpr_compliant: bool
    issues: List[str]
    recommendations: List[str]
    last_audit: datetime


class PrivacyComplianceService:
    """
    Handle privacy and compliance for learning analytics.

    Features:
    - Data anonymization for analytics
    - Consent-based collection
    - Retention policy enforcement
    - COPPA-compliant processing
    - GDPR data subject rights
    - Audit logging

    Usage:
        service = PrivacyComplianceService()
        anonymized = service.anonymize_data(user_data)
        can_collect = service.check_consent(user_id, "analytics")
        service.enforce_retention(user_id)
    """

    # COPPA age threshold
    COPPA_AGE_THRESHOLD = 13

    # PII fields that need anonymization
    PII_FIELDS = {
        "name", "first_name", "last_name", "email", "phone",
        "address", "ip_address", "device_id", "ssn", "date_of_birth",
        "photo", "voice_recording", "fingerprint", "face_id",
        "parent_email", "guardian_name", "school_name",
    }

    # Fields to completely remove for COPPA
    COPPA_REMOVE_FIELDS = {
        "precise_location", "persistent_device_id", "phone",
        "social_media", "advertising_id", "biometric_data",
    }

    # Default retention periods by data category
    DEFAULT_RETENTION = {
        DataCategory.BEHAVIORAL: RetentionPeriod.NINETY_DAYS,
        DataCategory.PERFORMANCE: RetentionPeriod.ONE_YEAR,
        DataCategory.DEMOGRAPHIC: RetentionPeriod.ONE_YEAR,
        DataCategory.BIOMETRIC: RetentionPeriod.SESSION,
        DataCategory.LOCATION: RetentionPeriod.THIRTY_DAYS,
        DataCategory.DEVICE: RetentionPeriod.NINETY_DAYS,
    }

    def __init__(
        self,
        default_anonymize: bool = False,
        strict_coppa: bool = True,
        audit_logging: bool = True,
    ):
        """
        Initialize the PrivacyComplianceService.

        Args:
            default_anonymize: Whether to anonymize data by default
            strict_coppa: Whether to enforce strict COPPA compliance
            audit_logging: Whether to maintain audit logs
        """
        self.default_anonymize = default_anonymize
        self.strict_coppa = strict_coppa
        self.audit_logging = audit_logging
        
        # Storage (in production, use secure database)
        self._consents: Dict[str, Dict[str, ConsentRecord]] = {}
        self._privacy_configs: Dict[str, PrivacyConfig] = {}
        self._audit_log: List[Dict[str, Any]] = []
        self._anonymous_id_map: Dict[str, str] = {}
        self._retention_schedule: Dict[str, datetime] = {}
        
        logger.info("PrivacyComplianceService initialized")

    def anonymize_data(
        self,
        data: Dict[str, Any],
        user_id: Optional[str] = None,
        level: str = "standard",
    ) -> tuple[Dict[str, Any], AnonymizationResult]:
        """
        Anonymize user data for analytics.

        Args:
            data: Raw data to anonymize.
            user_id: Optional user ID for consistent pseudonymization.
            level: Anonymization level (minimal, standard, strict).

        Returns:
            Tuple of (anonymized_data, AnonymizationResult).
        """
        anonymized = {}
        removed_fields = []
        pseudonymized_fields = []
        
        # Generate consistent anonymous ID
        if user_id:
            anonymous_id = self._get_or_create_anonymous_id(user_id)
        else:
            anonymous_id = str(uuid.uuid4())[:12]
        
        for key, value in data.items():
            key_lower = key.lower()
            
            # Check if field should be removed
            if level == "strict" and key_lower in self.COPPA_REMOVE_FIELDS:
                removed_fields.append(key)
                continue
            
            # Check if field is PII
            if self._is_pii_field(key_lower, value):
                if level == "minimal":
                    # Hash the value
                    anonymized[key] = self._hash_value(value)
                    pseudonymized_fields.append(key)
                elif level == "standard":
                    # Pseudonymize or generalize
                    anonymized[key] = self._pseudonymize_value(key_lower, value)
                    pseudonymized_fields.append(key)
                else:  # strict
                    removed_fields.append(key)
            else:
                anonymized[key] = value
        
        # Add anonymous ID
        anonymized["anonymous_id"] = anonymous_id
        
        # Remove any user_id references
        if "user_id" in anonymized and level != "minimal":
            del anonymized["user_id"]
            removed_fields.append("user_id")
        if "student_id" in anonymized and level != "minimal":
            del anonymized["student_id"]
            removed_fields.append("student_id")
        
        result = AnonymizationResult(
            original_fields_count=len(data),
            anonymized_fields_count=len(anonymized),
            removed_fields=removed_fields,
            pseudonymized_fields=pseudonymized_fields,
            anonymous_id=anonymous_id,
            compliance_level=level,
        )
        
        self._log_audit("anonymize_data", user_id, {
            "level": level,
            "fields_removed": len(removed_fields),
            "fields_pseudonymized": len(pseudonymized_fields),
        })
        
        return anonymized, result

    def check_consent(
        self,
        user_id: str,
        consent_type: str,
        data_category: Optional[str] = None,
    ) -> bool:
        """
        Check if user has given consent for data collection.

        Args:
            user_id: User identifier.
            consent_type: Type of consent to check.
            data_category: Optional data category.

        Returns:
            True if consent granted, False otherwise.
        """
        user_consents = self._consents.get(user_id, {})
        consent = user_consents.get(consent_type)
        
        if not consent:
            # Check privacy config
            config = self._privacy_configs.get(user_id)
            if config and config.consents.get(consent_type):
                return True
            return False
        
        # Check if expired
        if consent.expires_at and consent.expires_at < datetime.utcnow():
            return False
        
        return consent.granted

    def grant_consent(
        self,
        user_id: str,
        consent_type: str,
        is_minor: bool = False,
        parent_guardian_id: Optional[str] = None,
        expires_in_days: Optional[int] = None,
    ) -> ConsentRecord:
        """
        Record user consent.

        Args:
            user_id: User identifier.
            consent_type: Type of consent.
            is_minor: Whether user is a minor (COPPA).
            parent_guardian_id: Parent/guardian ID if minor.
            expires_in_days: Optional expiration period.

        Returns:
            ConsentRecord.
        """
        # COPPA check
        if is_minor and self.strict_coppa:
            if not parent_guardian_id:
                raise ValueError("Parent/guardian consent required for minors")
        
        expires_at = None
        if expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
        
        consent = ConsentRecord(
            user_id=user_id,
            consent_type=consent_type,
            granted=True,
            timestamp=datetime.utcnow(),
            expires_at=expires_at,
            parent_guardian_id=parent_guardian_id,
            is_minor=is_minor,
        )
        
        if user_id not in self._consents:
            self._consents[user_id] = {}
        self._consents[user_id][consent_type] = consent
        
        self._log_audit("grant_consent", user_id, {
            "consent_type": consent_type,
            "is_minor": is_minor,
            "parent_guardian": parent_guardian_id is not None,
        })
        
        return consent

    def revoke_consent(
        self,
        user_id: str,
        consent_type: str,
    ) -> bool:
        """
        Revoke user consent.

        Args:
            user_id: User identifier.
            consent_type: Type of consent to revoke.

        Returns:
            True if revoked, False if not found.
        """
        user_consents = self._consents.get(user_id, {})
        if consent_type in user_consents:
            user_consents[consent_type].granted = False
            self._log_audit("revoke_consent", user_id, {"consent_type": consent_type})
            return True
        return False

    def get_user_consents(self, user_id: str) -> Dict[str, ConsentRecord]:
        """Get all consent records for a user."""
        return self._consents.get(user_id, {})

    def is_coppa_compliant(
        self,
        user_id: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> tuple[bool, List[str]]:
        """
        Check if data processing is COPPA compliant.

        Args:
            user_id: User identifier.
            data: Optional data to check.

        Returns:
            Tuple of (is_compliant, issues).
        """
        issues = []
        config = self._privacy_configs.get(user_id, PrivacyConfig(user_id=user_id))
        
        # Check if minor
        if not config.is_minor:
            return True, []
        
        # Check parent consent
        if config.parent_consent_required:
            has_parent_consent = False
            user_consents = self._consents.get(user_id, {})
            for consent in user_consents.values():
                if consent.parent_guardian_id and consent.granted:
                    has_parent_consent = True
                    break
            
            if not has_parent_consent:
                issues.append("Missing verifiable parental consent")
        
        # Check data for prohibited fields
        if data:
            for field in self.COPPA_REMOVE_FIELDS:
                if field in data:
                    issues.append(f"Prohibited field collected: {field}")
        
        return len(issues) == 0, issues

    def enforce_retention(
        self,
        user_id: str,
        data_category: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Enforce data retention policies.

        Args:
            user_id: User identifier.
            data_category: Optional specific category.

        Returns:
            Retention enforcement result.
        """
        config = self._privacy_configs.get(user_id, PrivacyConfig(user_id=user_id))
        retention_period = config.data_retention
        
        # Calculate expiration
        retention_days = self._parse_retention_period(retention_period)
        expiration = datetime.utcnow() + timedelta(days=retention_days)
        
        self._retention_schedule[user_id] = expiration
        
        result = {
            "user_id": user_id,
            "retention_period": retention_period,
            "retention_days": retention_days,
            "data_expires_at": expiration.isoformat(),
            "enforcement_status": "scheduled",
        }
        
        self._log_audit("enforce_retention", user_id, result)
        
        return result

    def delete_user_data(
        self,
        user_id: str,
        categories: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Delete user data (right to erasure).

        Args:
            user_id: User identifier.
            categories: Optional specific categories to delete.

        Returns:
            Deletion result.
        """
        deleted = {
            "consents_deleted": False,
            "config_deleted": False,
            "anonymous_mapping_deleted": False,
            "retention_schedule_deleted": False,
        }
        
        # Delete consents
        if user_id in self._consents:
            del self._consents[user_id]
            deleted["consents_deleted"] = True
        
        # Delete privacy config
        if user_id in self._privacy_configs:
            del self._privacy_configs[user_id]
            deleted["config_deleted"] = True
        
        # Delete anonymous ID mapping
        if user_id in self._anonymous_id_map:
            del self._anonymous_id_map[user_id]
            deleted["anonymous_mapping_deleted"] = True
        
        # Delete retention schedule
        if user_id in self._retention_schedule:
            del self._retention_schedule[user_id]
            deleted["retention_schedule_deleted"] = True
        
        self._log_audit("delete_user_data", user_id, {
            "categories": categories or ["all"],
            "deleted": deleted,
        })
        
        return {
            "user_id": user_id,
            "status": "deleted",
            "deleted_items": deleted,
            "timestamp": datetime.utcnow().isoformat(),
        }

    def set_privacy_config(
        self,
        user_id: str,
        config: Dict[str, Any],
    ) -> PrivacyConfig:
        """
        Set privacy configuration for a user.

        Args:
            user_id: User identifier.
            config: Privacy configuration.

        Returns:
            PrivacyConfig object.
        """
        privacy_config = PrivacyConfig(
            user_id=user_id,
            is_minor=config.get("is_minor", False),
            consent_required=config.get("consent_required", True),
            consents=config.get("consents", {}),
            data_retention=config.get("data_retention", "90d"),
            anonymize_by_default=config.get("anonymize_by_default", False),
            parent_consent_required=config.get("parent_consent_required", False),
        )
        
        # Auto-set parent consent requirement for minors
        if privacy_config.is_minor and self.strict_coppa:
            privacy_config.parent_consent_required = True
        
        self._privacy_configs[user_id] = privacy_config
        
        self._log_audit("set_privacy_config", user_id, {
            "is_minor": privacy_config.is_minor,
            "parent_consent_required": privacy_config.parent_consent_required,
        })
        
        return privacy_config

    def get_privacy_config(self, user_id: str) -> Optional[PrivacyConfig]:
        """Get privacy configuration for a user."""
        return self._privacy_configs.get(user_id)

    def generate_compliance_report(self, user_id: str) -> ComplianceReport:
        """
        Generate compliance report for a user.

        Args:
            user_id: User identifier.

        Returns:
            ComplianceReport.
        """
        issues = []
        recommendations = []
        
        config = self._privacy_configs.get(user_id)
        user_consents = self._consents.get(user_id, {})
        
        # Check COPPA compliance
        coppa_compliant, coppa_issues = self.is_coppa_compliant(user_id)
        issues.extend(coppa_issues)
        
        # Check GDPR compliance
        gdpr_compliant = True
        
        # Check for required consents
        if config and config.consent_required:
            if "analytics" not in user_consents:
                issues.append("Analytics consent not recorded")
                recommendations.append("Obtain explicit analytics consent")
                gdpr_compliant = False
        
        # Check retention policy
        if user_id not in self._retention_schedule:
            recommendations.append("Set up data retention schedule")
        
        # Check anonymization
        if config and not config.anonymize_by_default:
            recommendations.append("Consider enabling default anonymization")
        
        is_compliant = len(issues) == 0
        
        report = ComplianceReport(
            user_id=user_id,
            is_compliant=is_compliant,
            coppa_compliant=coppa_compliant,
            gdpr_compliant=gdpr_compliant,
            issues=issues,
            recommendations=recommendations,
            last_audit=datetime.utcnow(),
        )
        
        self._log_audit("compliance_report", user_id, {
            "is_compliant": is_compliant,
            "coppa_compliant": coppa_compliant,
            "gdpr_compliant": gdpr_compliant,
            "issues_count": len(issues),
        })
        
        return report

    def get_audit_log(
        self,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Get audit log entries.

        Args:
            user_id: Optional user filter.
            action: Optional action filter.
            limit: Maximum entries to return.

        Returns:
            List of audit log entries.
        """
        entries = self._audit_log
        
        if user_id:
            entries = [e for e in entries if e.get("user_id") == user_id]
        if action:
            entries = [e for e in entries if e.get("action") == action]
        
        return entries[-limit:]

    def _is_pii_field(self, field_name: str, value: Any) -> bool:
        """Check if a field contains PII."""
        # Check field name
        if field_name in self.PII_FIELDS:
            return True
        
        # Check for common PII patterns
        if isinstance(value, str):
            # Email pattern
            if re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', value):
                return True
            # Phone pattern
            if re.match(r'^[\d\-\+\(\)\s]{10,}$', value):
                return True
            # IP address pattern
            if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', value):
                return True
        
        return False

    def _hash_value(self, value: Any) -> str:
        """Hash a value for pseudonymization."""
        value_str = str(value)
        return hashlib.sha256(value_str.encode()).hexdigest()[:16]

    def _pseudonymize_value(self, field_name: str, value: Any) -> Any:
        """Pseudonymize a value based on field type."""
        if field_name in {"email", "parent_email"}:
            return "***@***.***"
        elif field_name in {"name", "first_name", "last_name", "guardian_name"}:
            return "***"
        elif field_name in {"phone"}:
            return "***-***-****"
        elif field_name in {"ip_address"}:
            return "0.0.0.0"
        elif field_name in {"address"}:
            return "*** Street, ***, **"
        elif field_name in {"date_of_birth"}:
            return "****-**-**"
        else:
            return self._hash_value(value)

    def _get_or_create_anonymous_id(self, user_id: str) -> str:
        """Get or create consistent anonymous ID for a user."""
        if user_id not in self._anonymous_id_map:
            # Create deterministic anonymous ID
            hash_input = f"anon:{user_id}:salt_v1"
            self._anonymous_id_map[user_id] = hashlib.sha256(
                hash_input.encode()
            ).hexdigest()[:12]
        return self._anonymous_id_map[user_id]

    def _parse_retention_period(self, period: str) -> int:
        """Parse retention period string to days."""
        if period == "session":
            return 0
        elif period == "30d":
            return 30
        elif period == "90d":
            return 90
        elif period == "1y":
            return 365
        elif period == "indefinite":
            return 36500  # ~100 years
        else:
            # Try to parse as number of days
            try:
                return int(period.rstrip("d"))
            except ValueError:
                return 90  # Default

    def _log_audit(
        self,
        action: str,
        user_id: Optional[str],
        details: Dict[str, Any],
    ) -> None:
        """Log an audit entry."""
        if not self.audit_logging:
            return
        
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "action": action,
            "user_id": user_id,
            "details": details,
        }
        self._audit_log.append(entry)
        
        # Limit log size
        if len(self._audit_log) > 10000:
            self._audit_log = self._audit_log[-5000:]
