"""
Safety Module

Content moderation, reporting system, and safety features for peer learning.
Includes special protections for minor students.
"""
import logging
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import List, Dict, Optional, Set, Any

import numpy as np

logger = logging.getLogger(__name__)


class ContentCategory(str, Enum):
    """Categories for content classification."""
    SAFE = "safe"
    INAPPROPRIATE = "inappropriate"
    BULLYING = "bullying"
    HARASSMENT = "harassment"
    SPAM = "spam"
    OFF_TOPIC = "off_topic"
    PERSONAL_INFO = "personal_info"
    ADULT_CONTENT = "adult_content"
    VIOLENCE = "violence"
    SELF_HARM = "self_harm"


class ReportStatus(str, Enum):
    """Status of a report."""
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"
    ESCALATED = "escalated"


class ActionType(str, Enum):
    """Types of moderation actions."""
    WARNING = "warning"
    MESSAGE_REMOVED = "message_removed"
    TEMPORARY_MUTE = "temporary_mute"
    SESSION_ENDED = "session_ended"
    USER_SUSPENDED = "user_suspended"
    PARENT_NOTIFIED = "parent_notified"
    ESCALATED_TO_ADMIN = "escalated_to_admin"


class ConsentType(str, Enum):
    """Types of consent required for various features."""
    SESSION_RECORDING = "session_recording"
    PEER_MATCHING = "peer_matching"
    GROUP_PARTICIPATION = "group_participation"
    ASSESSMENT_PARTICIPATION = "assessment_participation"
    DATA_SHARING = "data_sharing"
    COMMUNICATION = "communication"


@dataclass
class ContentModerationResult:
    """Result of content moderation check."""
    content_id: str
    is_safe: bool
    categories: List[ContentCategory]
    confidence: float
    flagged_phrases: List[str]
    suggestions: List[str]
    requires_review: bool
    auto_action: Optional[ActionType] = None


@dataclass
class Report:
    """User report for content or behavior."""
    report_id: str
    reporter_id: str
    reported_user_id: str
    content_id: Optional[str]
    group_id: Optional[str]
    session_id: Optional[str]
    report_type: str  # harassment, inappropriate_content, spam, safety_concern, other
    description: str
    status: ReportStatus
    created_at: datetime
    updated_at: datetime
    resolution: Optional[str] = None
    resolution_action: Optional[ActionType] = None
    reviewed_by: Optional[str] = None


@dataclass
class ModerationAction:
    """A moderation action taken."""
    action_id: str
    action_type: ActionType
    target_user_id: str
    target_content_id: Optional[str]
    reason: str
    performed_at: datetime
    performed_by: str  # "system" or admin_id
    expires_at: Optional[datetime] = None
    related_report_id: Optional[str] = None


@dataclass
class UserSafetyProfile:
    """Safety-related profile for a user."""
    user_id: str
    is_minor: bool
    age_verified: bool
    requires_supervision: bool
    supervisor_id: Optional[str]  # parent/guardian ID
    consents: Dict[ConsentType, bool] = field(default_factory=dict)
    consent_timestamps: Dict[ConsentType, datetime] = field(default_factory=dict)
    warnings_count: int = 0
    restrictions: List[str] = field(default_factory=list)
    trusted_contacts: List[str] = field(default_factory=list)
    blocked_users: List[str] = field(default_factory=list)


@dataclass
class SupervisionSettings:
    """Supervision settings for minors."""
    user_id: str
    supervisor_id: str
    require_session_approval: bool = True
    notify_on_session_start: bool = True
    notify_on_report: bool = True
    max_session_duration_minutes: int = 60
    allowed_hours_start: int = 6  # 6 AM
    allowed_hours_end: int = 21  # 9 PM
    allowed_group_types: List[str] = field(default_factory=lambda: ["study", "tutoring"])
    blocked_topics: List[str] = field(default_factory=list)


class ContentModerator:
    """
    Content moderation for peer learning platform.
    
    Handles:
    - Text content analysis
    - Keyword-based filtering
    - Pattern detection
    - Personal information protection
    """
    
    # Inappropriate content patterns (simplified, would use ML in production)
    INAPPROPRIATE_PATTERNS = [
        r'\b(hate|kill|attack)\s+(you|them|him|her)\b',
        r'\b(stupid|idiot|dumb)\b',
        r'\b(shut\s*up)\b',
    ]
    
    # Personal information patterns
    PERSONAL_INFO_PATTERNS = [
        r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',  # Phone numbers
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
        r'\b\d{1,4}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct)\b',  # Address
        r'\b(?:my|i\s+live\s+at|located\s+at)\s+\d+\s+\w+',  # Address context
    ]
    
    # Spam patterns
    SPAM_PATTERNS = [
        r'(click|visit|check out)\s+(this|my)\s+(link|website|site)',
        r'(buy|order|get)\s+now',
        r'(free|discount|offer)\s+.*\b(today|now|limited)\b',
    ]
    
    # Bullying patterns
    BULLYING_PATTERNS = [
        r'\b(nobody|no\s*one)\s+(likes|wants)\s+you\b',
        r'\byou\s+are\s+(a\s+)?(loser|failure|worthless)\b',
        r'\b(go\s+away|leave|get\s+out)\b',
    ]
    
    # Self-harm patterns (high priority)
    SELF_HARM_PATTERNS = [
        r'\b(hurt|harm)\s+(myself|self)\b',
        r'\b(want\s+to\s+die|end\s+it|give\s+up)\b',
        r'\b(cutting|self[-\s]?harm)\b',
    ]
    
    def __init__(self, strict_mode: bool = True):
        """
        Initialize ContentModerator.
        
        Args:
            strict_mode: If True, use stricter moderation (recommended for minors)
        """
        self.strict_mode = strict_mode
        self._compile_patterns()
        logger.info("ContentModerator initialized (strict_mode=%s)", strict_mode)
    
    def _compile_patterns(self) -> None:
        """Compile regex patterns for efficiency."""
        self._inappropriate_re = [re.compile(p, re.IGNORECASE) for p in self.INAPPROPRIATE_PATTERNS]
        self._personal_info_re = [re.compile(p, re.IGNORECASE) for p in self.PERSONAL_INFO_PATTERNS]
        self._spam_re = [re.compile(p, re.IGNORECASE) for p in self.SPAM_PATTERNS]
        self._bullying_re = [re.compile(p, re.IGNORECASE) for p in self.BULLYING_PATTERNS]
        self._self_harm_re = [re.compile(p, re.IGNORECASE) for p in self.SELF_HARM_PATTERNS]
    
    def moderate(
        self,
        content: str,
        content_id: Optional[str] = None,
        user_profile: Optional[UserSafetyProfile] = None,
    ) -> ContentModerationResult:
        """
        Moderate a piece of content.
        
        Args:
            content: The text content to moderate
            content_id: Optional ID for tracking
            user_profile: Optional user safety profile for context
        
        Returns:
            ContentModerationResult with analysis
        """
        if not content_id:
            content_id = str(uuid.uuid4())
        
        categories: List[ContentCategory] = []
        flagged_phrases: List[str] = []
        suggestions: List[str] = []
        confidence = 0.0
        
        # Check self-harm first (highest priority)
        self_harm_matches = self._check_patterns(content, self._self_harm_re)
        if self_harm_matches:
            categories.append(ContentCategory.SELF_HARM)
            flagged_phrases.extend(self_harm_matches)
            suggestions.append("Content contains concerning language. Consider reaching out to support resources.")
            confidence = max(confidence, 0.95)
        
        # Check bullying
        bullying_matches = self._check_patterns(content, self._bullying_re)
        if bullying_matches:
            categories.append(ContentCategory.BULLYING)
            flagged_phrases.extend(bullying_matches)
            suggestions.append("Content may contain bullying language. Please be respectful.")
            confidence = max(confidence, 0.85)
        
        # Check inappropriate content
        inappropriate_matches = self._check_patterns(content, self._inappropriate_re)
        if inappropriate_matches:
            categories.append(ContentCategory.INAPPROPRIATE)
            flagged_phrases.extend(inappropriate_matches)
            suggestions.append("Please use appropriate language in educational discussions.")
            confidence = max(confidence, 0.8)
        
        # Check personal information
        pii_matches = self._check_patterns(content, self._personal_info_re)
        if pii_matches:
            categories.append(ContentCategory.PERSONAL_INFO)
            flagged_phrases.extend(pii_matches)
            suggestions.append("Please avoid sharing personal information like phone numbers, emails, or addresses.")
            confidence = max(confidence, 0.9)
        
        # Check spam
        spam_matches = self._check_patterns(content, self._spam_re)
        if spam_matches:
            categories.append(ContentCategory.SPAM)
            flagged_phrases.extend(spam_matches)
            suggestions.append("Content appears to contain promotional material.")
            confidence = max(confidence, 0.75)
        
        # Determine safety and action
        is_safe = len(categories) == 0
        requires_review = False
        auto_action: Optional[ActionType] = None
        
        if ContentCategory.SELF_HARM in categories:
            requires_review = True
            auto_action = ActionType.ESCALATED_TO_ADMIN
        elif ContentCategory.BULLYING in categories or ContentCategory.HARASSMENT in categories:
            requires_review = True
            if self.strict_mode:
                auto_action = ActionType.MESSAGE_REMOVED
            else:
                auto_action = ActionType.WARNING
        elif ContentCategory.PERSONAL_INFO in categories:
            auto_action = ActionType.MESSAGE_REMOVED
            suggestions.append("Message removed to protect personal information.")
        elif ContentCategory.INAPPROPRIATE in categories:
            if self.strict_mode:
                auto_action = ActionType.MESSAGE_REMOVED
            else:
                auto_action = ActionType.WARNING
        
        # Apply stricter rules if user is a minor
        if user_profile and user_profile.is_minor:
            if categories and auto_action != ActionType.MESSAGE_REMOVED:
                auto_action = ActionType.MESSAGE_REMOVED
                requires_review = True
        
        if not categories:
            categories = [ContentCategory.SAFE]
            confidence = 0.95
        
        return ContentModerationResult(
            content_id=content_id,
            is_safe=is_safe,
            categories=categories,
            confidence=confidence,
            flagged_phrases=flagged_phrases,
            suggestions=suggestions,
            requires_review=requires_review,
            auto_action=auto_action,
        )
    
    def _check_patterns(self, content: str, patterns: List[re.Pattern]) -> List[str]:
        """Check content against a list of patterns."""
        matches = []
        for pattern in patterns:
            found = pattern.findall(content)
            matches.extend(found)
        return matches
    
    def batch_moderate(
        self,
        contents: List[Dict[str, str]],
        user_profile: Optional[UserSafetyProfile] = None,
    ) -> List[ContentModerationResult]:
        """
        Moderate multiple pieces of content.
        
        Args:
            contents: List of dicts with 'content_id' and 'content' keys
            user_profile: Optional user safety profile
        
        Returns:
            List of moderation results
        """
        results = []
        for item in contents:
            result = self.moderate(
                content=item.get("content", ""),
                content_id=item.get("content_id"),
                user_profile=user_profile,
            )
            results.append(result)
        return results


class ReportingSystem:
    """
    Reporting system for user-submitted reports.
    
    Handles:
    - Report creation and tracking
    - Report priority calculation
    - Report resolution workflow
    """
    
    # Priority weights for different report types
    PRIORITY_WEIGHTS = {
        "harassment": 0.9,
        "safety_concern": 1.0,
        "inappropriate_content": 0.7,
        "spam": 0.3,
        "other": 0.5,
    }
    
    def __init__(self):
        """Initialize ReportingSystem."""
        self._reports: Dict[str, Report] = {}
        self._user_reports: Dict[str, List[str]] = {}  # user_id -> report_ids
        logger.info("ReportingSystem initialized")
    
    def create_report(
        self,
        reporter_id: str,
        reported_user_id: str,
        report_type: str,
        description: str,
        content_id: Optional[str] = None,
        group_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> Report:
        """
        Create a new report.
        
        Args:
            reporter_id: ID of the user making the report
            reported_user_id: ID of the reported user
            report_type: Type of report
            description: Description of the issue
            content_id: Optional content ID being reported
            group_id: Optional group ID where issue occurred
            session_id: Optional session ID where issue occurred
        
        Returns:
            Created Report object
        """
        report_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        report = Report(
            report_id=report_id,
            reporter_id=reporter_id,
            reported_user_id=reported_user_id,
            content_id=content_id,
            group_id=group_id,
            session_id=session_id,
            report_type=report_type,
            description=description,
            status=ReportStatus.PENDING,
            created_at=now,
            updated_at=now,
        )
        
        self._reports[report_id] = report
        
        # Track reports by user
        if reporter_id not in self._user_reports:
            self._user_reports[reporter_id] = []
        self._user_reports[reporter_id].append(report_id)
        
        logger.info(
            "Report created: %s (type=%s, reporter=%s, reported=%s)",
            report_id, report_type, reporter_id, reported_user_id
        )
        
        return report
    
    def get_report(self, report_id: str) -> Optional[Report]:
        """Get a report by ID."""
        return self._reports.get(report_id)
    
    def get_user_reports(self, user_id: str) -> List[Report]:
        """Get all reports made by a user."""
        report_ids = self._user_reports.get(user_id, [])
        return [self._reports[rid] for rid in report_ids if rid in self._reports]
    
    def get_reports_against_user(self, user_id: str) -> List[Report]:
        """Get all reports against a user."""
        return [r for r in self._reports.values() if r.reported_user_id == user_id]
    
    def update_report_status(
        self,
        report_id: str,
        status: ReportStatus,
        resolution: Optional[str] = None,
        resolution_action: Optional[ActionType] = None,
        reviewed_by: Optional[str] = None,
    ) -> Optional[Report]:
        """Update a report's status."""
        report = self._reports.get(report_id)
        if not report:
            return None
        
        report.status = status
        report.updated_at = datetime.now(timezone.utc)
        
        if resolution:
            report.resolution = resolution
        if resolution_action:
            report.resolution_action = resolution_action
        if reviewed_by:
            report.reviewed_by = reviewed_by
        
        logger.info("Report %s updated to status %s", report_id, status.value)
        return report
    
    def get_pending_reports(self, limit: int = 50) -> List[Report]:
        """Get pending reports ordered by priority."""
        pending = [r for r in self._reports.values() if r.status == ReportStatus.PENDING]
        
        # Sort by priority (safety_concern first, then harassment, etc.)
        pending.sort(
            key=lambda r: (-self.PRIORITY_WEIGHTS.get(r.report_type, 0.5), r.created_at)
        )
        
        return pending[:limit]
    
    def calculate_priority(self, report: Report) -> float:
        """Calculate priority score for a report."""
        base_priority = self.PRIORITY_WEIGHTS.get(report.report_type, 0.5)
        
        # Increase priority if user has multiple reports against them
        reports_against = self.get_reports_against_user(report.reported_user_id)
        if len(reports_against) > 3:
            base_priority = min(1.0, base_priority + 0.2)
        
        return base_priority


class MinorProtectionService:
    """
    Special protections and supervision for minor users.
    
    Handles:
    - Supervision settings
    - Session approval workflow
    - Parent notifications
    - Activity time restrictions
    """
    
    def __init__(self):
        """Initialize MinorProtectionService."""
        self._safety_profiles: Dict[str, UserSafetyProfile] = {}
        self._supervision_settings: Dict[str, SupervisionSettings] = {}
        logger.info("MinorProtectionService initialized")
    
    def register_minor(
        self,
        user_id: str,
        supervisor_id: str,
        settings: Optional[Dict[str, Any]] = None,
    ) -> UserSafetyProfile:
        """
        Register a minor with supervision.
        
        Args:
            user_id: ID of the minor user
            supervisor_id: ID of the parent/guardian
            settings: Optional supervision settings
        
        Returns:
            UserSafetyProfile for the minor
        """
        profile = UserSafetyProfile(
            user_id=user_id,
            is_minor=True,
            age_verified=False,
            requires_supervision=True,
            supervisor_id=supervisor_id,
            consents={},
            consent_timestamps={},
        )
        self._safety_profiles[user_id] = profile
        
        # Create supervision settings
        supervision = SupervisionSettings(
            user_id=user_id,
            supervisor_id=supervisor_id,
            require_session_approval=settings.get("require_session_approval", True) if settings else True,
            notify_on_session_start=settings.get("notify_on_session_start", True) if settings else True,
            notify_on_report=settings.get("notify_on_report", True) if settings else True,
            max_session_duration_minutes=settings.get("max_session_duration_minutes", 60) if settings else 60,
            allowed_hours_start=settings.get("allowed_hours_start", 6) if settings else 6,
            allowed_hours_end=settings.get("allowed_hours_end", 21) if settings else 21,
        )
        self._supervision_settings[user_id] = supervision
        
        logger.info(
            "Minor %s registered with supervisor %s",
            user_id, supervisor_id
        )
        
        return profile
    
    def register_adult(self, user_id: str) -> UserSafetyProfile:
        """Register an adult user (no supervision required)."""
        profile = UserSafetyProfile(
            user_id=user_id,
            is_minor=False,
            age_verified=True,
            requires_supervision=False,
            supervisor_id=None,
        )
        self._safety_profiles[user_id] = profile
        return profile
    
    def get_safety_profile(self, user_id: str) -> Optional[UserSafetyProfile]:
        """Get safety profile for a user."""
        return self._safety_profiles.get(user_id)
    
    def get_supervision_settings(self, user_id: str) -> Optional[SupervisionSettings]:
        """Get supervision settings for a minor."""
        return self._supervision_settings.get(user_id)
    
    def check_session_allowed(
        self,
        user_id: str,
        session_type: str = "study",
        partner_ids: Optional[List[str]] = None,
    ) -> tuple[bool, List[str]]:
        """
        Check if a session is allowed for a user.
        
        Args:
            user_id: User ID
            session_type: Type of session
            partner_ids: IDs of session partners
        
        Returns:
            Tuple of (allowed, list of reasons if not allowed)
        """
        profile = self._safety_profiles.get(user_id)
        if not profile:
            # User not registered, allow by default
            return True, []
        
        if not profile.is_minor:
            return True, []
        
        settings = self._supervision_settings.get(user_id)
        if not settings:
            return True, []
        
        reasons = []
        
        # Check time restrictions
        now = datetime.now()
        current_hour = now.hour
        if current_hour < settings.allowed_hours_start or current_hour >= settings.allowed_hours_end:
            reasons.append(
                f"Sessions only allowed between {settings.allowed_hours_start}:00 and {settings.allowed_hours_end}:00"
            )
        
        # Check session type
        if session_type not in settings.allowed_group_types:
            reasons.append(f"Session type '{session_type}' not allowed")
        
        # Check for blocked users
        if partner_ids and profile.blocked_users:
            blocked = set(partner_ids) & set(profile.blocked_users)
            if blocked:
                reasons.append(f"One or more partners are blocked")
        
        return len(reasons) == 0, reasons
    
    def record_consent(
        self,
        user_id: str,
        consent_type: ConsentType,
        granted: bool,
    ) -> bool:
        """
        Record user consent for a feature.
        
        Args:
            user_id: User ID
            consent_type: Type of consent
            granted: Whether consent is granted
        
        Returns:
            True if recorded successfully
        """
        profile = self._safety_profiles.get(user_id)
        if not profile:
            return False
        
        profile.consents[consent_type] = granted
        profile.consent_timestamps[consent_type] = datetime.now(timezone.utc)
        
        logger.info(
            "Consent recorded for user %s: %s = %s",
            user_id, consent_type.value, granted
        )
        
        return True
    
    def check_consent(
        self,
        user_id: str,
        consent_type: ConsentType,
    ) -> tuple[bool, Optional[datetime]]:
        """
        Check if user has given consent for a feature.
        
        Args:
            user_id: User ID
            consent_type: Type of consent to check
        
        Returns:
            Tuple of (has_consent, timestamp of consent)
        """
        profile = self._safety_profiles.get(user_id)
        if not profile:
            # Unknown user - default to no consent for safety
            return False, None
        
        has_consent = profile.consents.get(consent_type, False)
        timestamp = profile.consent_timestamps.get(consent_type)
        
        return has_consent, timestamp
    
    def add_blocked_user(self, user_id: str, blocked_user_id: str) -> bool:
        """Add a user to the blocked list."""
        profile = self._safety_profiles.get(user_id)
        if not profile:
            return False
        
        if blocked_user_id not in profile.blocked_users:
            profile.blocked_users.append(blocked_user_id)
        
        return True
    
    def remove_blocked_user(self, user_id: str, blocked_user_id: str) -> bool:
        """Remove a user from the blocked list."""
        profile = self._safety_profiles.get(user_id)
        if not profile:
            return False
        
        if blocked_user_id in profile.blocked_users:
            profile.blocked_users.remove(blocked_user_id)
        
        return True
    
    def add_warning(self, user_id: str) -> int:
        """Add a warning to user's record, return total warnings."""
        profile = self._safety_profiles.get(user_id)
        if not profile:
            return 0
        
        profile.warnings_count += 1
        
        # Apply restrictions based on warning count
        if profile.warnings_count >= 3:
            if "limited_matching" not in profile.restrictions:
                profile.restrictions.append("limited_matching")
        if profile.warnings_count >= 5:
            if "require_approval" not in profile.restrictions:
                profile.restrictions.append("require_approval")
        
        logger.info(
            "Warning added for user %s: total=%d",
            user_id, profile.warnings_count
        )
        
        return profile.warnings_count
    
    def notify_supervisor(
        self,
        user_id: str,
        notification_type: str,
        details: Dict[str, Any],
    ) -> bool:
        """
        Create notification for supervisor (parent/guardian).
        
        In production, this would integrate with notification service.
        
        Args:
            user_id: Minor's user ID
            notification_type: Type of notification
            details: Notification details
        
        Returns:
            True if notification queued
        """
        profile = self._safety_profiles.get(user_id)
        if not profile or not profile.supervisor_id:
            return False
        
        settings = self._supervision_settings.get(user_id)
        
        # Check if notification should be sent
        should_notify = False
        if notification_type == "session_start" and settings and settings.notify_on_session_start:
            should_notify = True
        elif notification_type == "report" and settings and settings.notify_on_report:
            should_notify = True
        elif notification_type in ["warning", "suspension", "safety_concern"]:
            should_notify = True  # Always notify for serious issues
        
        if should_notify:
            logger.info(
                "Supervisor notification: %s notified about %s for %s",
                profile.supervisor_id, notification_type, user_id
            )
            # In production, queue notification here
        
        return should_notify


class SafetyManager:
    """
    Central safety manager coordinating all safety features.
    
    Combines:
    - Content moderation
    - Reporting system
    - Minor protection
    """
    
    def __init__(self, strict_mode: bool = True):
        """
        Initialize SafetyManager.
        
        Args:
            strict_mode: Enable stricter moderation
        """
        self.content_moderator = ContentModerator(strict_mode=strict_mode)
        self.reporting_system = ReportingSystem()
        self.minor_protection = MinorProtectionService()
        logger.info("SafetyManager initialized")
    
    def moderate_and_check(
        self,
        content: str,
        user_id: str,
        content_id: Optional[str] = None,
    ) -> ContentModerationResult:
        """
        Moderate content with user context.
        
        Args:
            content: Content to moderate
            user_id: User who created content
            content_id: Optional content ID
        
        Returns:
            Moderation result
        """
        profile = self.minor_protection.get_safety_profile(user_id)
        result = self.content_moderator.moderate(content, content_id, profile)
        
        # Apply additional actions based on result
        if result.auto_action == ActionType.WARNING:
            self.minor_protection.add_warning(user_id)
        
        # Notify supervisor for minors with issues
        if profile and profile.is_minor and not result.is_safe:
            self.minor_protection.notify_supervisor(
                user_id,
                "content_flagged",
                {
                    "content_id": content_id,
                    "categories": [c.value for c in result.categories],
                    "action": result.auto_action.value if result.auto_action else None,
                }
            )
        
        return result
    
    def check_session_safety(
        self,
        participant_ids: List[str],
        session_type: str = "study",
    ) -> tuple[bool, Dict[str, List[str]]]:
        """
        Check if a session is safe for all participants.
        
        Args:
            participant_ids: List of participant IDs
            session_type: Type of session
        
        Returns:
            Tuple of (all_allowed, dict of user_id -> reasons if not allowed)
        """
        issues: Dict[str, List[str]] = {}
        
        for user_id in participant_ids:
            other_ids = [p for p in participant_ids if p != user_id]
            allowed, reasons = self.minor_protection.check_session_allowed(
                user_id, session_type, other_ids
            )
            if not allowed:
                issues[user_id] = reasons
        
        return len(issues) == 0, issues
    
    def handle_report(
        self,
        reporter_id: str,
        reported_user_id: str,
        report_type: str,
        description: str,
        **kwargs,
    ) -> Report:
        """
        Handle a user report with appropriate notifications.
        
        Args:
            reporter_id: Reporter's user ID
            reported_user_id: Reported user's ID
            report_type: Type of report
            description: Report description
            **kwargs: Additional report fields
        
        Returns:
            Created report
        """
        report = self.reporting_system.create_report(
            reporter_id=reporter_id,
            reported_user_id=reported_user_id,
            report_type=report_type,
            description=description,
            **kwargs,
        )
        
        # Notify supervisors if minor is involved
        reported_profile = self.minor_protection.get_safety_profile(reported_user_id)
        if reported_profile and reported_profile.is_minor:
            self.minor_protection.notify_supervisor(
                reported_user_id,
                "report",
                {
                    "report_id": report.report_id,
                    "report_type": report_type,
                    "description": description,
                }
            )
        
        # Escalate high-priority reports
        if report_type == "safety_concern":
            self.reporting_system.update_report_status(
                report.report_id,
                ReportStatus.ESCALATED
            )
        
        return report
