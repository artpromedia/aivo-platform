/// Engagement models for XP, streaks, badges, and kudos
library;

import 'package:freezed_annotation/freezed_annotation.dart';

part 'models.freezed.dart';
part 'models.g.dart';

/// Preferred reward style for the learner
enum RewardStyle {
  @JsonValue('VISUAL_BADGES')
  visualBadges,
  @JsonValue('PRAISE_MESSAGES')
  praiseMessages,
  @JsonValue('POINTS_AND_LEVELS')
  pointsAndLevels,
  @JsonValue('MINIMAL')
  minimal,
}

/// Badge category
enum BadgeCategory {
  @JsonValue('EFFORT')
  effort,
  @JsonValue('CONSISTENCY')
  consistency,
  @JsonValue('FOCUS')
  focus,
  @JsonValue('COLLABORATION')
  collaboration,
  @JsonValue('GROWTH')
  growth,
  @JsonValue('MILESTONE')
  milestone,
}

/// Engagement profile for a learner
@freezed
class EngagementProfile with _$EngagementProfile {
  const factory EngagementProfile({
    required String id,
    required String tenantId,
    required String learnerId,
    required int level,
    required int xpTotal,
    required int xpThisWeek,
    required int xpToday,
    required int currentStreakDays,
    required int maxStreakDays,
    DateTime? lastSessionDate,
    required int sessionsCompleted,
    required int totalMinutesLearned,
    required RewardStyle preferredRewardStyle,
    required bool muteCelebrations,
    required bool reducedVisuals,
    required bool showBadges,
    required bool showStreaks,
    required bool showXp,
    // Computed fields
    required int xpToNextLevel,
    required int xpProgress,
    required int xpNeeded,
    required int progressPercent,
  }) = _EngagementProfile;

  factory EngagementProfile.fromJson(Map<String, dynamic> json) =>
      _$EngagementProfileFromJson(json);
}

/// Badge definition
@freezed
class Badge with _$Badge {
  const factory Badge({
    required String code,
    required String name,
    required String description,
    required BadgeCategory category,
    required String iconKey,
    @Default(false) bool isSecret,
  }) = _Badge;

  factory Badge.fromJson(Map<String, dynamic> json) => _$BadgeFromJson(json);
}

/// Learner's earned badge
@freezed
class LearnerBadge with _$LearnerBadge {
  const factory LearnerBadge({
    required String id,
    required String badgeCode,
    required String badgeName,
    required String badgeDescription,
    required BadgeCategory category,
    required String iconKey,
    required DateTime awardedAt,
    DateTime? firstSeenAt,
    required String source,
    String? note,
  }) = _LearnerBadge;

  factory LearnerBadge.fromJson(Map<String, dynamic> json) =>
      _$LearnerBadgeFromJson(json);
}

/// Badge progress (for badges not yet earned)
@freezed
class BadgeProgress with _$BadgeProgress {
  const factory BadgeProgress({
    required String badgeCode,
    required String badgeName,
    required String badgeDescription,
    required BadgeCategory category,
    required String iconKey,
    required int progress,
    required int target,
    required int progressPercent,
    required bool earned,
  }) = _BadgeProgress;

  factory BadgeProgress.fromJson(Map<String, dynamic> json) =>
      _$BadgeProgressFromJson(json);
}

/// Kudos message from caregiver/teacher
@freezed
class Kudos with _$Kudos {
  const factory Kudos({
    required String id,
    required String tenantId,
    required String learnerId,
    required String fromUserId,
    required String fromRole,
    String? fromName,
    required String message,
    String? emoji,
    required String context,
    String? linkedSessionId,
    String? linkedActionPlanId,
    required bool visibleToLearner,
    DateTime? readAt,
    required DateTime createdAt,
  }) = _Kudos;

  factory Kudos.fromJson(Map<String, dynamic> json) => _$KudosFromJson(json);
}

/// Engagement event result (returned after completing an activity)
@freezed
class EngagementEventResult with _$EngagementEventResult {
  const factory EngagementEventResult({
    required int xpAwarded,
    required int newLevel,
    required int newXpTotal,
    required int streakDays,
    required bool leveledUp,
    required int previousLevel,
    required bool streakUpdated,
    required int previousStreak,
    @Default([]) List<BadgeAward> awardedBadges,
  }) = _EngagementEventResult;

  factory EngagementEventResult.fromJson(Map<String, dynamic> json) =>
      _$EngagementEventResultFromJson(json);
}

/// Badge awarded as part of an engagement event
@freezed
class BadgeAward with _$BadgeAward {
  const factory BadgeAward({
    required String code,
    required String name,
    required bool isNew,
  }) = _BadgeAward;

  factory BadgeAward.fromJson(Map<String, dynamic> json) =>
      _$BadgeAwardFromJson(json);
}

/// Effective gamification settings for a learner
@freezed
class EffectiveSettings with _$EffectiveSettings {
  const factory EffectiveSettings({
    required bool xpEnabled,
    required bool streaksEnabled,
    required bool badgesEnabled,
    required bool kudosEnabled,
    required bool celebrationsEnabled,
    required bool levelsEnabled,
    required bool showComparisons,
    // Learner preferences
    required RewardStyle preferredRewardStyle,
    required bool muteCelebrations,
    required bool reducedVisuals,
    required bool showBadges,
    required bool showStreaks,
    required bool showXp,
  }) = _EffectiveSettings;

  factory EffectiveSettings.fromJson(Map<String, dynamic> json) =>
      _$EffectiveSettingsFromJson(json);
}
