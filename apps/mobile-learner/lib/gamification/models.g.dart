// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_BadgeRequirement _$BadgeRequirementFromJson(Map<String, dynamic> json) =>
    _BadgeRequirement(
      type: json['type'] as String,
      targetValue: (json['targetValue'] as num).toInt(),
      skillId: json['skillId'] as String?,
    );

Map<String, dynamic> _$BadgeRequirementToJson(_BadgeRequirement instance) =>
    <String, dynamic>{
      'type': instance.type,
      'targetValue': instance.targetValue,
      'skillId': instance.skillId,
    };

_GamificationBadge _$GamificationBadgeFromJson(Map<String, dynamic> json) =>
    _GamificationBadge(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      iconUrl: json['iconUrl'] as String,
      category: json['category'] as String,
      rarity: $enumDecodeNullable(_$BadgeRarityEnumMap, json['rarity']) ??
          BadgeRarity.common,
      pointsValue: (json['pointsValue'] as num?)?.toInt() ?? 0,
      requirement: json['requirement'] == null
          ? null
          : BadgeRequirement.fromJson(
              json['requirement'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$GamificationBadgeToJson(_GamificationBadge instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'iconUrl': instance.iconUrl,
      'category': instance.category,
      'rarity': _$BadgeRarityEnumMap[instance.rarity]!,
      'pointsValue': instance.pointsValue,
      'requirement': instance.requirement,
    };

const _$BadgeRarityEnumMap = {
  BadgeRarity.common: 'common',
  BadgeRarity.uncommon: 'uncommon',
  BadgeRarity.rare: 'rare',
  BadgeRarity.epic: 'epic',
  BadgeRarity.legendary: 'legendary',
};

_EarnedBadge _$EarnedBadgeFromJson(Map<String, dynamic> json) => _EarnedBadge(
      id: json['id'] as String,
      badge: GamificationBadge.fromJson(json['badge'] as Map<String, dynamic>),
      earnedAt: json['earnedAt'] as String,
      earnedForActivity: json['earnedForActivity'] as String?,
    );

Map<String, dynamic> _$EarnedBadgeToJson(_EarnedBadge instance) =>
    <String, dynamic>{
      'id': instance.id,
      'badge': instance.badge,
      'earnedAt': instance.earnedAt,
      'earnedForActivity': instance.earnedForActivity,
    };

_GamificationProfile _$GamificationProfileFromJson(Map<String, dynamic> json) =>
    _GamificationProfile(
      learnerId: json['learnerId'] as String,
      totalPoints: (json['totalPoints'] as num?)?.toInt() ?? 0,
      level: (json['level'] as num?)?.toInt() ?? 1,
      pointsToNextLevel: (json['pointsToNextLevel'] as num?)?.toInt() ?? 100,
      streakDays: (json['streakDays'] as num?)?.toInt() ?? 0,
      longestStreak: (json['longestStreak'] as num?)?.toInt() ?? 0,
      recentBadges: (json['recentBadges'] as List<dynamic>?)
              ?.map((e) => EarnedBadge.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      totalBadges: (json['totalBadges'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$GamificationProfileToJson(
        _GamificationProfile instance) =>
    <String, dynamic>{
      'learnerId': instance.learnerId,
      'totalPoints': instance.totalPoints,
      'level': instance.level,
      'pointsToNextLevel': instance.pointsToNextLevel,
      'streakDays': instance.streakDays,
      'longestStreak': instance.longestStreak,
      'recentBadges': instance.recentBadges,
      'totalBadges': instance.totalBadges,
    };

_GamificationBadgeProgress _$GamificationBadgeProgressFromJson(
        Map<String, dynamic> json) =>
    _GamificationBadgeProgress(
      badgeId: json['badgeId'] as String,
      progress: (json['progress'] as num?)?.toInt() ?? 0,
      target: (json['target'] as num?)?.toInt() ?? 1,
      percentComplete: (json['percentComplete'] as num?)?.toDouble() ?? 0,
      earned: json['earned'] as bool? ?? false,
    );

Map<String, dynamic> _$GamificationBadgeProgressToJson(
        _GamificationBadgeProgress instance) =>
    <String, dynamic>{
      'badgeId': instance.badgeId,
      'progress': instance.progress,
      'target': instance.target,
      'percentComplete': instance.percentComplete,
      'earned': instance.earned,
    };
