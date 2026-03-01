/// Gamification models matching the gamification-svc mobile API
///
/// These models match the MobileBadge / MobileEarnedBadge / MobileGamificationProfile
/// shapes returned by the gamification-svc routes.
library;

import 'package:freezed_annotation/freezed_annotation.dart';

part 'models.freezed.dart';
part 'models.g.dart';

/// Badge rarity tier (determines visual styling)
enum BadgeRarity {
  @JsonValue('common')
  common,
  @JsonValue('uncommon')
  uncommon,
  @JsonValue('rare')
  rare,
  @JsonValue('epic')
  epic,
  @JsonValue('legendary')
  legendary,
}

/// Gamification badge category (from gamification-svc)
enum GamificationCategory {
  @JsonValue('onboarding')
  onboarding,
  @JsonValue('learning')
  learning,
  @JsonValue('streak')
  streak,
  @JsonValue('mastery')
  mastery,
  @JsonValue('skill')
  skill,
  @JsonValue('quiz')
  quiz,
  @JsonValue('social')
  social,
  @JsonValue('special')
  special,
  @JsonValue('xp')
  xp,
  @JsonValue('time')
  time,
  @JsonValue('secret')
  secret,
}

/// Requirement for earning a badge
@freezed
abstract class BadgeRequirement with _$BadgeRequirement {
  const factory BadgeRequirement({
    required String type,
    required int targetValue,
    String? skillId,
  }) = _BadgeRequirement;

  factory BadgeRequirement.fromJson(Map<String, dynamic> json) =>
      _$BadgeRequirementFromJson(json);
}

/// A badge available in the gamification system
@freezed
abstract class GamificationBadge with _$GamificationBadge {
  const factory GamificationBadge({
    required String id,
    required String name,
    required String description,
    required String iconUrl,
    required String category,
    @Default(BadgeRarity.common) BadgeRarity rarity,
    @Default(0) int pointsValue,
    BadgeRequirement? requirement,
  }) = _GamificationBadge;

  factory GamificationBadge.fromJson(Map<String, dynamic> json) =>
      _$GamificationBadgeFromJson(json);
}

/// A badge earned by a learner
@freezed
abstract class EarnedBadge with _$EarnedBadge {
  const factory EarnedBadge({
    required String id,
    required GamificationBadge badge,
    required String earnedAt,
    String? earnedForActivity,
  }) = _EarnedBadge;

  factory EarnedBadge.fromJson(Map<String, dynamic> json) =>
      _$EarnedBadgeFromJson(json);
}

/// Gamification profile for a learner
@freezed
abstract class GamificationProfile with _$GamificationProfile {
  const factory GamificationProfile({
    required String learnerId,
    @Default(0) int totalPoints,
    @Default(1) int level,
    @Default(100) int pointsToNextLevel,
    @Default(0) int streakDays,
    @Default(0) int longestStreak,
    @Default([]) List<EarnedBadge> recentBadges,
    @Default(0) int totalBadges,
  }) = _GamificationProfile;

  factory GamificationProfile.fromJson(Map<String, dynamic> json) =>
      _$GamificationProfileFromJson(json);
}

/// Progress towards earning a specific badge
@freezed
abstract class GamificationBadgeProgress with _$GamificationBadgeProgress {
  const factory GamificationBadgeProgress({
    required String badgeId,
    @Default(0) int progress,
    @Default(1) int target,
    @Default(0) double percentComplete,
    @Default(false) bool earned,
  }) = _GamificationBadgeProgress;

  factory GamificationBadgeProgress.fromJson(Map<String, dynamic> json) =>
      _$GamificationBadgeProgressFromJson(json);
}
