"""
Tests for enterprise_core.compliance.consent module.

Covers consent enums, ConsentRecord, ParentalRight, and related models.
"""

import pytest
from datetime import datetime

from enterprise_core.compliance.consent import (
    ConsentType,
    ConsentStatus,
    ParentalRightType,
    RequestStatus,
    AuditAction,
)


# ── ConsentType enum tests ───────────────────────────────────────


class TestConsentType:
    """Tests for the ConsentType enum."""

    def test_data_collection_value(self):
        assert ConsentType.DATA_COLLECTION.value == "data_collection"

    def test_data_processing_value(self):
        assert ConsentType.DATA_PROCESSING.value == "data_processing"

    def test_analytics_value(self):
        assert ConsentType.ANALYTICS.value == "analytics"

    def test_marketing_value(self):
        assert ConsentType.MARKETING.value == "marketing"

    def test_chat_monitoring_value(self):
        assert ConsentType.CHAT_MONITORING.value == "chat_monitoring"

    def test_personalization_value(self):
        assert ConsentType.PERSONALIZATION.value == "personalization"

    def test_research_value(self):
        assert ConsentType.RESEARCH.value == "research"

    def test_is_string_enum(self):
        assert isinstance(ConsentType.DATA_COLLECTION, str)

    def test_all_members_count(self):
        # DATA_COLLECTION, DATA_PROCESSING, DATA_SHARING, MARKETING,
        # ANALYTICS, CHAT_MONITORING, MEDIA_CAPTURE, BEHAVIORAL_ANALYSIS,
        # THIRD_PARTY_SERVICES, PERSONALIZATION, RESEARCH
        assert len(ConsentType) == 11


# ── ConsentStatus enum tests ─────────────────────────────────────


class TestConsentStatus:
    """Tests for the ConsentStatus enum."""

    def test_granted_value(self):
        assert ConsentStatus.GRANTED.value == "granted"

    def test_revoked_value(self):
        assert ConsentStatus.REVOKED.value == "revoked"

    def test_pending_value(self):
        assert ConsentStatus.PENDING.value == "pending"

    def test_expired_value(self):
        assert ConsentStatus.EXPIRED.value == "expired"

    def test_all_statuses(self):
        assert len(ConsentStatus) == 4


# ── ParentalRightType enum tests ─────────────────────────────────


class TestParentalRightType:
    """Tests for the ParentalRightType enum."""

    def test_view_child_data(self):
        assert ParentalRightType.VIEW_CHILD_DATA.value == "view_child_data"

    def test_modify_consent(self):
        assert ParentalRightType.MODIFY_CONSENT.value == "modify_consent"

    def test_delete_child_data(self):
        assert ParentalRightType.DELETE_CHILD_DATA.value == "delete_child_data"

    def test_export_child_data(self):
        assert ParentalRightType.EXPORT_CHILD_DATA.value == "export_child_data"

    def test_restrict_data_use(self):
        assert ParentalRightType.RESTRICT_DATA_USE.value == "restrict_data_use"

    def test_all_members(self):
        assert len(ParentalRightType) == 5


# ── RequestStatus enum tests ─────────────────────────────────────


class TestRequestStatus:
    """Tests for the RequestStatus enum."""

    def test_pending(self):
        assert RequestStatus.PENDING.value == "pending"

    def test_in_progress(self):
        assert RequestStatus.IN_PROGRESS.value == "in_progress"

    def test_completed(self):
        assert RequestStatus.COMPLETED.value == "completed"

    def test_failed(self):
        assert RequestStatus.FAILED.value == "failed"

    def test_cancelled(self):
        assert RequestStatus.CANCELLED.value == "cancelled"


# ── AuditAction enum tests ───────────────────────────────────────


class TestAuditAction:
    """Tests for the AuditAction enum."""

    def test_consent_granted_action(self):
        assert AuditAction.CONSENT_GRANTED.value == "consent_granted"

    def test_consent_revoked_action(self):
        assert AuditAction.CONSENT_REVOKED.value == "consent_revoked"

    def test_data_export_requested(self):
        assert AuditAction.DATA_EXPORT_REQUESTED.value == "data_export_requested"

    def test_deletion_requested(self):
        assert AuditAction.DELETION_REQUESTED.value == "deletion_requested"

    def test_cascade_delete_triggered(self):
        assert AuditAction.CASCADE_DELETE_TRIGGERED.value == "cascade_delete_triggered"

    def test_all_actions_count(self):
        # 9 actions: consent_granted, consent_revoked, consent_updated,
        # parental_right_exercised, data_export_requested, data_export_completed,
        # deletion_requested, deletion_completed, cascade_delete_triggered
        assert len(AuditAction) == 9

    def test_is_string_enum(self):
        assert isinstance(AuditAction.CONSENT_GRANTED, str)


# ── ConsentRecord model tests ────────────────────────────────────


class TestConsentRecordSchema:
    """Tests for ConsentRecord table schema."""

    def test_tablename(self):
        from enterprise_core.compliance.consent import ConsentRecord
        assert ConsentRecord.__tablename__ == "consent_records"

    def test_has_user_id_column(self):
        from enterprise_core.compliance.consent import ConsentRecord
        cols = {c.name for c in ConsentRecord.__table__.columns}
        assert "user_id" in cols

    def test_has_consent_type_column(self):
        from enterprise_core.compliance.consent import ConsentRecord
        cols = {c.name for c in ConsentRecord.__table__.columns}
        assert "consent_type" in cols

    def test_has_status_column(self):
        from enterprise_core.compliance.consent import ConsentRecord
        cols = {c.name for c in ConsentRecord.__table__.columns}
        assert "status" in cols

    def test_has_legal_basis_column(self):
        from enterprise_core.compliance.consent import ConsentRecord
        cols = {c.name for c in ConsentRecord.__table__.columns}
        assert "legal_basis" in cols

    def test_has_purpose_column(self):
        from enterprise_core.compliance.consent import ConsentRecord
        cols = {c.name for c in ConsentRecord.__table__.columns}
        assert "purpose" in cols

    def test_has_version_column(self):
        from enterprise_core.compliance.consent import ConsentRecord
        cols = {c.name for c in ConsentRecord.__table__.columns}
        assert "version" in cols

    def test_has_parental_consent_columns(self):
        from enterprise_core.compliance.consent import ConsentRecord
        cols = {c.name for c in ConsentRecord.__table__.columns}
        assert "requires_parental_consent" in cols
        assert "parental_consent_given" in cols
        assert "parent_email" in cols

    def test_has_indexes(self):
        from enterprise_core.compliance.consent import ConsentRecord
        index_names = {idx.name for idx in ConsentRecord.__table__.indexes}
        assert "idx_consent_user_type" in index_names
        assert "idx_consent_tenant_status" in index_names


# ── ParentalRight model tests ────────────────────────────────────


class TestParentalRightSchema:
    """Tests for ParentalRight table schema."""

    def test_tablename(self):
        from enterprise_core.compliance.consent import ParentalRight
        assert ParentalRight.__tablename__ == "parental_rights"

    def test_has_parent_email(self):
        from enterprise_core.compliance.consent import ParentalRight
        cols = {c.name for c in ParentalRight.__table__.columns}
        assert "parent_email" in cols

    def test_has_child_user_id(self):
        from enterprise_core.compliance.consent import ParentalRight
        cols = {c.name for c in ParentalRight.__table__.columns}
        assert "child_user_id" in cols

    def test_has_right_type(self):
        from enterprise_core.compliance.consent import ParentalRight
        cols = {c.name for c in ParentalRight.__table__.columns}
        assert "right_type" in cols

    def test_has_is_active(self):
        from enterprise_core.compliance.consent import ParentalRight
        cols = {c.name for c in ParentalRight.__table__.columns}
        assert "is_active" in cols
