// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$EngagementProfileImpl _$$EngagementProfileImplFromJson(
        Map<String, dynamic> json) =>
    _$EngagementProfileImpl(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      learnerId: json['learnerId'] as String,
      level: (json['level'] as num).toInt(),
      xpTotal: (json['xpTotal'] as num).toInt(),
      xpThisWeek: (json['xpThisWeek'] as num).toInt(),
      xpToday: (json['xpToday'] as num).toInt(),
      currentStreakDays: (json['currentStreakDays'] as num).toInt(),
      maxStreakDays: (json['maxStreakDays'] as num).toInt(),
      lastSessionDate: json['lastSessionDate'] == null
          ? null
          : DateTime.parse(json['lastSessionDate'] as String),
      sessionsCompleted: (json['sessionsCompleted'] as num).toInt(),
      totalMinutesLearned: (json['totalMinutesLearned'] as num).toInt(),
      preferredRewardStyle:
          $enumDecode(_$RewardStyleEnumMap, json['preferredRewardStyle']),
      muteCelebrations: json['muteCelebrations'] as bool,
      reducedVisuals: json['reducedVisuals'] as bool,
      showBadges: json['showBadges'] as bool,
      showStreaks: json['showStreaks'] as bool,
      showXp: json['showXp'] as bool,
      xpToNextLevel: (json['xpToNextLevel'] as num).toInt(),
      xpProgress: (json['xpProgress'] as num).toInt(),
      xpNeeded: (json['xpNeeded'] as num).toInt(),
      progressPercent: (json['progressPercent'] as num).toInt(),
    );

Map<String, dynamic> _$$EngagementProfileImplToJson(
        _$EngagementProfileImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'tenantId': instance.tenantId,
      'learnerId': instance.learnerId,
      'level': instance.level,
      'xpTotal': instance.xpTotal,
      'xpThisWeek': instance.xpThisWeek,
      'xpToday': instance.xpToday,
      'currentStreakDays': instance.currentStreakDays,
      'maxStreakDays': instance.maxStreakDays,
      'lastSessionDate': instance.lastSessionDate?.toIso8601String(),
      'sessionsCompleted': instance.sessionsCompleted,
      'totalMinutesLearned': instance.totalMinutesLearned,
      'preferredRewardStyle':
          _$RewardStyleEnumMap[instance.preferredRewardStyle]!,
      'muteCelebrations': instance.muteCelebrations,
      'reducedVisuals': instance.reducedVisuals,
      'showBadges': instance.showBadges,
      'showStreaks': instance.showStreaks,
      'showXp': instance.showXp,
      'xpToNextLevel': instance.xpToNextLevel,
      'xpProgress': instance.xpProgress,
      'xpNeeded': instance.xpNeeded,
      'progressPercent': instance.progressPercent,
    };

const _$RewardStyleEnumMap = {
  RewardStyle.visualBadges: 'VISUAL_BADGES',
  RewardStyle.praiseMessages: 'PRAISE_MESSAGES',
  RewardStyle.pointsAndLevels: 'POINTS_AND_LEVELS',
  RewardStyle.minimal: 'MINIMAL',
};

_$BadgeImpl _$$BadgeImplFromJson(Map<String, dynamic> json) => _$BadgeImpl(
      code: json['code'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      category: $enumDecode(_$BadgeCategoryEnumMap, json['category']),
      iconKey: json['iconKey'] as String,
      isSecret: json['isSecret'] as bool? ?? false,
    );

Map<String, dynamic> _$$BadgeImplToJson(_$BadgeImpl instance) =>
    <String, dynamic>{
      'code': instance.code,
      'name': instance.name,
      'description': instance.description,
      'category': _$BadgeCategoryEnumMap[instance.category]!,
      'iconKey': instance.iconKey,
      'isSecret': instance.isSecret,
    };

const _$BadgeCategoryEnumMap = {
  BadgeCategory.effort: 'EFFORT',
  BadgeCategory.consistency: 'CONSISTENCY',
  BadgeCategory.focus: 'FOCUS',
  BadgeCategory.collaboration: 'COLLABORATION',
  BadgeCategory.growth: 'GROWTH',
  BadgeCategory.milestone: 'MILESTONE',
};

_$LearnerBadgeImpl _$$LearnerBadgeImplFromJson(Map<String, dynamic> json) =>
    _$LearnerBadgeImpl(
      id: json['id'] as String,
      badgeCode: json['badgeCode'] as String,
      badgeName: json['badgeName'] as String,
      badgeDescription: json['badgeDescription'] as String,
      category: $enumDecode(_$BadgeCategoryEnumMap, json['category']),
      iconKey: json['iconKey'] as String,
      awardedAt: DateTime.parse(json['awardedAt'] as String),
      firstSeenAt: json['firstSeenAt'] == null
          ? null
          : DateTime.parse(json['firstSeenAt'] as String),
      source: json['source'] as String,
      note: json['note'] as String?,
    );

Map<String, dynamic> _$$LearnerBadgeImplToJson(_$LearnerBadgeImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'badgeCode': instance.badgeCode,
      'badgeName': instance.badgeName,
      'badgeDescription': instance.badgeDescription,
      'category': _$BadgeCategoryEnumMap[instance.category]!,
      'iconKey': instance.iconKey,
      'awardedAt': instance.awardedAt.toIso8601String(),
      'firstSeenAt': instance.firstSeenAt?.toIso8601String(),
      'source': instance.source,
      'note': instance.note,
    };

_$BadgeProgressImpl _$$BadgeProgressImplFromJson(Map<String, dynamic> json) =>
    _$BadgeProgressImpl(
      badgeCode: json['badgeCode'] as String,
      badgeName: json['badgeName'] as String,
      badgeDescription: json['badgeDescription'] as String,
      category: $enumDecode(_$BadgeCategoryEnumMap, json['category']),
      iconKey: json['iconKey'] as String,
      progress: (json['progress'] as num).toInt(),
      target: (json['target'] as num).toInt(),
      progressPercent: (json['progressPercent'] as num).toInt(),
      earned: json['earned'] as bool,
    );

Map<String, dynamic> _$$BadgeProgressImplToJson(_$BadgeProgressImpl instance) =>
    <String, dynamic>{
      'badgeCode': instance.badgeCode,
      'badgeName': instance.badgeName,
      'badgeDescription': instance.badgeDescription,
      'category': _$BadgeCategoryEnumMap[instance.category]!,
      'iconKey': instance.iconKey,
      'progress': instance.progress,
      'target': instance.target,
      'progressPercent': instance.progressPercent,
      'earned': instance.earned,
    };

_$KudosImpl _$$KudosImplFromJson(Map<String, dynamic> json) => _$KudosImpl(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      learnerId: json['learnerId'] as String,
      fromUserId: json['fromUserId'] as String,
      fromRole: json['fromRole'] as String,
      fromName: json['fromName'] as String?,
      message: json['message'] as String,
      emoji: json['emoji'] as String?,
      context: json['context'] as String,
      linkedSessionId: json['linkedSessionId'] as String?,
      linkedActionPlanId: json['linkedActionPlanId'] as String?,
      visibleToLearner: json['visibleToLearner'] as bool,
      readAt: json['readAt'] == null
          ? null
          : DateTime.parse(json['readAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$$KudosImplToJson(_$KudosImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'tenantId': instance.tenantId,
      'learnerId': instance.learnerId,
      'fromUserId': instance.fromUserId,
      'fromRole': instance.fromRole,
      'fromName': instance.fromName,
      'message': instance.message,
      'emoji': instance.emoji,
      'context': instance.context,
      'linkedSessionId': instance.linkedSessionId,
      'linkedActionPlanId': instance.linkedActionPlanId,
      'visibleToLearner': instance.visibleToLearner,
      'readAt': instance.readAt?.toIso8601String(),
      'createdAt': instance.createdAt.toIso8601String(),
    };

_$EngagementEventResultImpl _$$EngagementEventResultImplFromJson(
        Map<String, dynamic> json) =>
    _$EngagementEventResultImpl(
      xpAwarded: (json['xpAwarded'] as num).toInt(),
      newLevel: (json['newLevel'] as num).toInt(),
      newXpTotal: (json['newXpTotal'] as num).toInt(),
      streakDays: (json['streakDays'] as num).toInt(),
      leveledUp: json['leveledUp'] as bool,
      previousLevel: (json['previousLevel'] as num).toInt(),
      streakUpdated: json['streakUpdated'] as bool,
      previousStreak: (json['previousStreak'] as num).toInt(),
      awardedBadges: (json['awardedBadges'] as List<dynamic>?)
              ?.map((e) => BadgeAward.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$EngagementEventResultImplToJson(
        _$EngagementEventResultImpl instance) =>
    <String, dynamic>{
      'xpAwarded': instance.xpAwarded,
      'newLevel': instance.newLevel,
      'newXpTotal': instance.newXpTotal,
      'streakDays': instance.streakDays,
      'leveledUp': instance.leveledUp,
      'previousLevel': instance.previousLevel,
      'streakUpdated': instance.streakUpdated,
      'previousStreak': instance.previousStreak,
      'awardedBadges': instance.awardedBadges,
    };

_$BadgeAwardImpl _$$BadgeAwardImplFromJson(Map<String, dynamic> json) =>
    _$BadgeAwardImpl(
      code: json['code'] as String,
      name: json['name'] as String,
      isNew: json['isNew'] as bool,
    );

Map<String, dynamic> _$$BadgeAwardImplToJson(_$BadgeAwardImpl instance) =>
    <String, dynamic>{
      'code': instance.code,
      'name': instance.name,
      'isNew': instance.isNew,
    };

_$EffectiveSettingsImpl _$$EffectiveSettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$EffectiveSettingsImpl(
      xpEnabled: json['xpEnabled'] as bool,
      streaksEnabled: json['streaksEnabled'] as bool,
      badgesEnabled: json['badgesEnabled'] as bool,
      kudosEnabled: json['kudosEnabled'] as bool,
      celebrationsEnabled: json['celebrationsEnabled'] as bool,
      levelsEnabled: json['levelsEnabled'] as bool,
      showComparisons: json['showComparisons'] as bool,
      preferredRewardStyle:
          $enumDecode(_$RewardStyleEnumMap, json['preferredRewardStyle']),
      muteCelebrations: json['muteCelebrations'] as bool,
      reducedVisuals: json['reducedVisuals'] as bool,
      showBadges: json['showBadges'] as bool,
      showStreaks: json['showStreaks'] as bool,
      showXp: json['showXp'] as bool,
    );

Map<String, dynamic> _$$EffectiveSettingsImplToJson(
        _$EffectiveSettingsImpl instance) =>
    <String, dynamic>{
      'xpEnabled': instance.xpEnabled,
      'streaksEnabled': instance.streaksEnabled,
      'badgesEnabled': instance.badgesEnabled,
      'kudosEnabled': instance.kudosEnabled,
      'celebrationsEnabled': instance.celebrationsEnabled,
      'levelsEnabled': instance.levelsEnabled,
      'showComparisons': instance.showComparisons,
      'preferredRewardStyle':
          _$RewardStyleEnumMap[instance.preferredRewardStyle]!,
      'muteCelebrations': instance.muteCelebrations,
      'reducedVisuals': instance.reducedVisuals,
      'showBadges': instance.showBadges,
      'showStreaks': instance.showStreaks,
      'showXp': instance.showXp,
    };
