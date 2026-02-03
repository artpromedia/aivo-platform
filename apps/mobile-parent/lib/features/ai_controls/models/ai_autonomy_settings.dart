/// AI Autonomy Settings Models
///
/// Models for parental control over AI tutor behavior.
library;

import 'package:freezed_annotation/freezed_annotation.dart';

part 'ai_autonomy_settings.freezed.dart';
part 'ai_autonomy_settings.g.dart';

/// Level of autonomy granted to the AI tutor.
enum AutonomyLevel {
  /// AI operates fully independently
  @JsonValue('full')
  full,

  /// AI operates with some oversight
  @JsonValue('moderate')
  moderate,

  /// AI has limited decision-making ability
  @JsonValue('limited')
  limited,

  /// All AI decisions require parent approval
  @JsonValue('requireApproval')
  requireApproval,
}

/// Category of AI decision.
enum DecisionCategory {
  /// Content difficulty adjustments
  @JsonValue('difficulty')
  difficulty,

  /// Learning pace changes
  @JsonValue('pace')
  pace,

  /// Topic/subject changes
  @JsonValue('topics')
  topics,

  /// Rewards and gamification
  @JsonValue('rewards')
  rewards,

  /// Break and rest suggestions
  @JsonValue('breaks')
  breaks,

  /// Communication style changes
  @JsonValue('communication')
  communication,

  /// Assessment scheduling
  @JsonValue('assessments')
  assessments,

  /// Intervention recommendations
  @JsonValue('interventions')
  interventions,
}

/// Status of an approval request.
enum ApprovalStatus {
  /// Pending parent review
  @JsonValue('pending')
  pending,

  /// Approved by parent
  @JsonValue('approved')
  approved,

  /// Denied by parent
  @JsonValue('denied')
  denied,

  /// Expired without action
  @JsonValue('expired')
  expired,
}

/// Type of AI restriction.
enum RestrictionType {
  /// Time-based restriction
  @JsonValue('time')
  time,

  /// Content-based restriction
  @JsonValue('content')
  content,

  /// Feature-based restriction
  @JsonValue('feature')
  feature,

  /// Subject-based restriction
  @JsonValue('subject')
  subject,
}

/// Priority level for notifications.
enum NotificationPriority {
  /// All notifications
  @JsonValue('all')
  all,

  /// Important only
  @JsonValue('important')
  important,

  /// Critical only
  @JsonValue('critical')
  critical,

  /// No notifications
  @JsonValue('none')
  none,
}

/// Overall AI autonomy settings for a child.
@freezed
class AIAutonomySettings with _$AIAutonomySettings {
  const factory AIAutonomySettings({
    required String childId,
    required AutonomyLevel overallLevel,
    required Map<DecisionCategory, CategoryAutonomy> categorySettings,
    required NotificationSettings notifications,
    required List<AIRestriction> restrictions,
    @Default(false) bool pauseAllAI,
    DateTime? pauseUntil,
    String? pauseReason,
    DateTime? lastModified,
    String? modifiedBy,
  }) = _AIAutonomySettings;

  factory AIAutonomySettings.fromJson(Map<String, dynamic> json) =>
      _$AIAutonomySettingsFromJson(json);
}

/// Autonomy settings for a specific category.
@freezed
class CategoryAutonomy with _$CategoryAutonomy {
  const factory CategoryAutonomy({
    required DecisionCategory category,
    required AutonomyLevel level,
    @Default(true) bool enabled,
    String? customMessage,
    List<String>? allowedValues,
    List<String>? blockedValues,
    Map<String, dynamic>? limits,
  }) = _CategoryAutonomy;

  factory CategoryAutonomy.fromJson(Map<String, dynamic> json) =>
      _$CategoryAutonomyFromJson(json);
}

/// A specific restriction on AI behavior.
@freezed
class AIRestriction with _$AIRestriction {
  const factory AIRestriction({
    required String id,
    required RestrictionType type,
    required String name,
    required String description,
    required bool isActive,
    Map<String, dynamic>? parameters,
    DateTime? startTime,
    DateTime? endTime,
    List<String>? daysOfWeek,
    DateTime? createdAt,
  }) = _AIRestriction;

  factory AIRestriction.fromJson(Map<String, dynamic> json) =>
      _$AIRestrictionFromJson(json);
}

/// Notification settings for AI activity.
@freezed
class NotificationSettings with _$NotificationSettings {
  const factory NotificationSettings({
    @Default(NotificationPriority.important) NotificationPriority priority,
    @Default(true) bool approvalRequests,
    @Default(true) bool majorDecisions,
    @Default(false) bool allDecisions,
    @Default(true) bool dailySummary,
    @Default(false) bool weeklyReport,
    @Default(true) bool interventionAlerts,
    @Default(true) bool progressMilestones,
    String? preferredTime,
  }) = _NotificationSettings;

  factory NotificationSettings.fromJson(Map<String, dynamic> json) =>
      _$NotificationSettingsFromJson(json);
}

/// A pending approval request from the AI.
@freezed
class ApprovalRequest with _$ApprovalRequest {
  const factory ApprovalRequest({
    required String id,
    required String childId,
    required DecisionCategory category,
    required String title,
    required String description,
    required ApprovalStatus status,
    required DateTime requestedAt,
    String? aiReasoning,
    Map<String, dynamic>? proposedChange,
    Map<String, dynamic>? currentState,
    DateTime? expiresAt,
    DateTime? respondedAt,
    String? parentResponse,
    @Default(false) bool isUrgent,
  }) = _ApprovalRequest;

  factory ApprovalRequest.fromJson(Map<String, dynamic> json) =>
      _$ApprovalRequestFromJson(json);
}

/// Preset autonomy configuration.
@freezed
class AutonomyPreset with _$AutonomyPreset {
  const factory AutonomyPreset({
    required String id,
    required String name,
    required String description,
    required AutonomyLevel defaultLevel,
    required Map<DecisionCategory, AutonomyLevel> categoryLevels,
    IconType? icon,
    @Default(false) bool isRecommended,
  }) = _AutonomyPreset;

  factory AutonomyPreset.fromJson(Map<String, dynamic> json) =>
      _$AutonomyPresetFromJson(json);
}

/// Icon type for presets.
enum IconType {
  @JsonValue('shield')
  shield,
  @JsonValue('balance')
  balance,
  @JsonValue('rocket')
  rocket,
  @JsonValue('lock')
  lock,
}

/// AI activity log entry.
@freezed
class AIActivityEntry with _$AIActivityEntry {
  const factory AIActivityEntry({
    required String id,
    required DateTime timestamp,
    required DecisionCategory category,
    required String action,
    required String description,
    ApprovalStatus? approvalStatus,
    String? parentAction,
    Map<String, dynamic>? details,
  }) = _AIActivityEntry;

  factory AIActivityEntry.fromJson(Map<String, dynamic> json) =>
      _$AIActivityEntryFromJson(json);
}
