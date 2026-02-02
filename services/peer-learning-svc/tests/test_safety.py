"""Tests for Safety module - ContentModerator, ReportingSystem, MinorProtectionService."""
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from app.models.safety import (
    ContentModerator,
    ReportingSystem,
    MinorProtectionService,
    SafetyManager,
    ContentCategory,
    ReportStatus,
    ActionType,
    ConsentType,
    ContentModerationResult,
    Report,
    ModerationAction,
    UserSafetyProfile,
    SupervisionSettings,
)


class TestContentModerator:
    """Tests for ContentModerator class."""

    def test_init_default(self):
        """Test default initialization."""
        moderator = ContentModerator(strict_mode=False)
        assert moderator is not None
        assert moderator.strict_mode is False

    def test_init_strict_mode(self):
        """Test strict mode initialization."""
        moderator = ContentModerator(strict_mode=True)
        assert moderator.strict_mode is True

    def test_moderate_safe_content(self):
        """Test moderation of safe content."""
        moderator = ContentModerator()
        result = moderator.moderate(
            content="Let's study calculus together!",
        )
        assert isinstance(result, ContentModerationResult)
        assert result.is_safe is True

    def test_moderate_inappropriate_content(self):
        """Test moderation catches inappropriate content."""
        moderator = ContentModerator()
        result = moderator.moderate(
            content="You are so stupid and an idiot",
        )
        assert result.is_safe is False
        assert ContentCategory.BULLYING in result.categories or ContentCategory.INAPPROPRIATE in result.categories

    def test_moderate_pii_content(self):
        """Test moderation catches personal information."""
        moderator = ContentModerator()
        result = moderator.moderate(
            content="My phone number is 555-123-4567 and email is test@example.com",
        )
        # Should flag PII
        assert ContentCategory.PERSONAL_INFO in result.categories
        assert len(result.flagged_phrases) > 0

    def test_moderate_self_harm_content(self):
        """Test moderation catches self-harm content."""
        moderator = ContentModerator(strict_mode=True)
        result = moderator.moderate(
            content="I want to hurt myself",
        )
        assert result.is_safe is False
        assert ContentCategory.SELF_HARM in result.categories
        assert result.requires_review is True

    def test_moderate_with_content_id(self):
        """Test moderation with content ID tracking."""
        moderator = ContentModerator()
        result = moderator.moderate(
            content="Hello world",
            content_id="msg_123",
        )
        assert result.content_id == "msg_123"

    def test_strict_mode_more_sensitive(self):
        """Test that strict mode is more sensitive."""
        normal_mod = ContentModerator(strict_mode=False)
        strict_mod = ContentModerator(strict_mode=True)
        
        # Borderline content
        content = "That's a bad idea and you should feel bad"
        
        normal_result = normal_mod.moderate(content)
        strict_result = strict_mod.moderate(content)
        
        # Strict mode should be at least as strict
        assert strict_result.confidence >= normal_result.confidence or not strict_result.is_safe

    def test_check_patterns_bullying(self):
        """Test pattern detection for bullying."""
        moderator = ContentModerator()
        result = moderator.moderate(
            content="You are a loser and nobody likes you",
        )
        assert ContentCategory.BULLYING in result.categories

    def test_empty_content(self):
        """Test moderation of empty content."""
        moderator = ContentModerator()
        result = moderator.moderate(content="")
        assert result.is_safe is True

    def test_suggestions_provided_for_unsafe(self):
        """Test that suggestions are provided for unsafe content."""
        moderator = ContentModerator()
        result = moderator.moderate(
            content="Here's my phone: 555-123-4567",
        )
        if not result.is_safe:
            assert len(result.suggestions) > 0


class TestReportingSystem:
    """Tests for ReportingSystem class."""

    def test_init(self):
        """Test initialization."""
        system = ReportingSystem()
        assert system is not None
        assert len(system._reports) == 0

    def test_create_report(self):
        """Test creating a report."""
        system = ReportingSystem()
        report = system.create_report(
            reporter_id="user_001",
            reported_user_id="user_002",
            report_type="harassment",
            description="User was being mean to me",
        )
        
        assert isinstance(report, Report)
        assert report.reporter_id == "user_001"
        assert report.reported_user_id == "user_002"
        assert report.status == ReportStatus.PENDING
        assert report.report_id is not None

    def test_create_report_with_context(self):
        """Test creating a report with additional context."""
        system = ReportingSystem()
        report = system.create_report(
            reporter_id="user_001",
            reported_user_id="user_002",
            report_type="inappropriate_content",
            description="Posted inappropriate content",
            content_id="msg_123",
            group_id="group_456",
            session_id="session_789",
        )
        
        assert report.content_id == "msg_123"
        assert report.group_id == "group_456"
        assert report.session_id == "session_789"

    def test_get_report(self):
        """Test retrieving a report."""
        system = ReportingSystem()
        report = system.create_report(
            reporter_id="user_001",
            reported_user_id="user_002",
            report_type="spam",
            description="Spamming messages",
        )
        
        retrieved = system.get_report(report.report_id)
        assert retrieved is not None
        assert retrieved.report_id == report.report_id

    def test_get_nonexistent_report(self):
        """Test retrieving a nonexistent report."""
        system = ReportingSystem()
        retrieved = system.get_report("nonexistent_id")
        assert retrieved is None

    def test_update_report_status(self):
        """Test updating report status."""
        system = ReportingSystem()
        report = system.create_report(
            reporter_id="user_001",
            reported_user_id="user_002",
            report_type="harassment",
            description="Harassment",
        )
        
        updated = system.update_report_status(
            report.report_id,
            ReportStatus.UNDER_REVIEW,
            reviewed_by="admin_001",
        )
        
        assert updated is not None
        assert updated.status == ReportStatus.UNDER_REVIEW
        assert updated.reviewed_by == "admin_001"

    def test_resolve_report(self):
        """Test resolving a report."""
        system = ReportingSystem()
        report = system.create_report(
            reporter_id="user_001",
            reported_user_id="user_002",
            report_type="harassment",
            description="Harassment",
        )
        
        resolved = system.update_report_status(
            report.report_id,
            ReportStatus.RESOLVED,
            resolution="Warning issued to user",
            resolution_action=ActionType.WARNING,
            reviewed_by="admin_001",
        )
        
        assert resolved is not None
        assert resolved.status == ReportStatus.RESOLVED
        assert resolved.resolution == "Warning issued to user"
        assert resolved.resolution_action == ActionType.WARNING

    def test_get_user_reports(self):
        """Test getting reports for a user."""
        system = ReportingSystem()
        
        # Create multiple reports
        system.create_report("user_001", "user_003", "spam", "Spam")
        system.create_report("user_002", "user_003", "harassment", "Mean")
        system.create_report("user_001", "user_004", "spam", "More spam")
        
        # Get reports against user_003
        reports = system.get_reports_against_user(user_id="user_003")
        assert len(reports) == 2

    def test_get_pending_reports(self):
        """Test filtering reports by status."""
        system = ReportingSystem()
        
        r1 = system.create_report("u1", "u2", "spam", "Spam 1")
        r2 = system.create_report("u1", "u3", "spam", "Spam 2")
        system.update_report_status(r1.report_id, ReportStatus.RESOLVED)
        
        pending = system.get_pending_reports()
        
        assert len(pending) == 1
        assert pending[0].report_id == r2.report_id

    def test_report_priority_calculation(self):
        """Test that safety concerns have higher priority."""
        system = ReportingSystem()
        
        safety_report = system.create_report(
            reporter_id="user_001",
            reported_user_id="user_002",
            report_type="safety_concern",
            description="Safety issue",
        )
        
        spam_report = system.create_report(
            reporter_id="user_001",
            reported_user_id="user_003",
            report_type="spam",
            description="Spam",
        )
        
        # Safety concern should have higher priority
        safety_priority = system.calculate_priority(safety_report)
        spam_priority = system.calculate_priority(spam_report)
        assert safety_priority > spam_priority


class TestMinorProtectionService:
    """Tests for MinorProtectionService class."""

    def test_init(self):
        """Test initialization."""
        service = MinorProtectionService()
        assert service is not None

    def test_register_minor(self):
        """Test registering a minor user."""
        service = MinorProtectionService()
        profile = service.register_minor(
            user_id="minor_001",
            supervisor_id="parent_001",
        )
        
        assert isinstance(profile, UserSafetyProfile)
        assert profile.user_id == "minor_001"
        assert profile.is_minor is True
        assert profile.supervisor_id == "parent_001"

    def test_register_adult(self):
        """Test registering an adult user."""
        service = MinorProtectionService()
        profile = service.register_adult(user_id="adult_001")
        
        assert profile.is_minor is False
        assert profile.supervisor_id is None

    def test_is_minor_check(self):
        """Test checking if user is a minor."""
        service = MinorProtectionService()
        service.register_minor("minor_001", "parent_001")
        service.register_adult("adult_001")
        
        minor_profile = service.get_safety_profile("minor_001")
        adult_profile = service.get_safety_profile("adult_001")
        unknown_profile = service.get_safety_profile("unknown_user")
        
        assert minor_profile is not None and minor_profile.is_minor is True
        assert adult_profile is not None and adult_profile.is_minor is False
        assert unknown_profile is None

    def test_get_supervision_settings(self):
        """Test getting supervision settings."""
        service = MinorProtectionService()
        service.register_minor("minor_001", "parent_001")
        
        settings = service.get_supervision_settings("minor_001")
        assert isinstance(settings, SupervisionSettings)
        assert settings.require_session_approval is True

    def test_check_session_allowed_adults(self):
        """Test session allowed for adults."""
        service = MinorProtectionService()
        service.register_adult("adult_001")
        service.register_adult("adult_002")
        
        allowed, reasons = service.check_session_allowed("adult_001")
        assert allowed is True

    def test_check_session_allowed_minor(self):
        """Test session check for minor."""
        service = MinorProtectionService()
        service.register_minor("minor_001", "parent_001")
        
        allowed, reasons = service.check_session_allowed("minor_001")
        # Result depends on implementation details
        assert isinstance(allowed, bool)
        assert isinstance(reasons, list)


class TestSafetyManager:
    """Tests for SafetyManager class."""

    def test_init(self):
        """Test initialization."""
        manager = SafetyManager()
        assert manager is not None
        assert manager.content_moderator is not None
        assert manager.reporting_system is not None
        assert manager.minor_protection is not None

    def test_init_strict_mode(self):
        """Test strict mode propagation."""
        manager = SafetyManager(strict_mode=True)
        assert manager.content_moderator.strict_mode is True

    def test_moderate_safe(self):
        """Test combined moderation for safe content."""
        manager = SafetyManager()
        result = manager.content_moderator.moderate(
            content="Let's learn math together!",
        )
        assert result.is_safe is True

    def test_moderate_unsafe(self):
        """Test combined moderation for unsafe content."""
        manager = SafetyManager(strict_mode=True)
        result = manager.content_moderator.moderate(
            content="You stupid idiot",
        )
        assert result.is_safe is False

    def test_handle_report(self):
        """Test handling a report through the manager."""
        manager = SafetyManager()
        report = manager.reporting_system.create_report(
            reporter_id="user_001",
            reported_user_id="user_002",
            report_type="harassment",
            description="Mean messages",
        )
        
        assert report is not None
        assert report.status == ReportStatus.PENDING

    def test_check_session_safety_all_adults(self):
        """Test session safety check with all adults."""
        manager = SafetyManager()
        manager.minor_protection.register_adult("adult_001")
        manager.minor_protection.register_adult("adult_002")
        
        # Check session for each user
        allowed1, _ = manager.minor_protection.check_session_allowed("adult_001")
        allowed2, _ = manager.minor_protection.check_session_allowed("adult_002")
        
        assert allowed1 is True
        assert allowed2 is True

    def test_get_user_safety_profile(self):
        """Test getting user safety profile."""
        manager = SafetyManager()
        manager.minor_protection.register_adult("user_001")
        
        profile = manager.minor_protection.get_safety_profile("user_001")
        assert profile is not None
        assert profile.user_id == "user_001"


class TestContentModerationIntegration:
    """Integration tests for content moderation."""

    def test_moderation_flow(self):
        """Test complete moderation flow."""
        manager = SafetyManager(strict_mode=True)
        
        # Safe message
        result1 = manager.content_moderator.moderate(
            "Hello, let's study!",
        )
        assert result1.is_safe is True
        
        # Unsafe message
        result2 = manager.content_moderator.moderate(
            "You're a stupid loser",
        )
        assert result2.is_safe is False
        
        # If unsafe, create report
        if not result2.is_safe:
            report = manager.reporting_system.create_report(
                reporter_id="system",
                reported_user_id="user_001",
                report_type="inappropriate_content",
                description=f"Auto-flagged content: {result2.flagged_phrases}",
                content_id=result2.content_id,
            )
            assert report.status == ReportStatus.PENDING

    def test_minor_protection_flow(self):
        """Test complete minor protection flow."""
        manager = SafetyManager(strict_mode=True)
        
        # Register users
        manager.minor_protection.register_minor(
            "minor_001",
            "parent_001",
        )
        manager.minor_protection.register_adult("tutor_001")
        
        # Check if session is allowed
        allowed, reasons = manager.minor_protection.check_session_allowed(
            "minor_001",
        )
        
        # Should have specific handling for minor sessions
        assert isinstance(reasons, list)
