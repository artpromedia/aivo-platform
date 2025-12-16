// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ChildEngagementSummaryImpl _$$ChildEngagementSummaryImplFromJson(
        Map<String, dynamic> json) =>
    _$ChildEngagementSummaryImpl(
      learnerId: json['learnerId'] as String,
      learnerName: json['learnerName'] as String,
      totalXp: (json['totalXp'] as num).toInt(),
      level: (json['level'] as num).toInt(),
      streakDays: (json['streakDays'] as num).toInt(),
      totalBadges: (json['totalBadges'] as num).toInt(),
      recentBadges: (json['recentBadges'] as num).toInt(),
      kudosReceived: (json['kudosReceived'] as num).toInt(),
      lastActivityAt: json['lastActivityAt'] == null
          ? null
          : DateTime.parse(json['lastActivityAt'] as String),
    );

Map<String, dynamic> _$$ChildEngagementSummaryImplToJson(
        _$ChildEngagementSummaryImpl instance) =>
    <String, dynamic>{
      'learnerId': instance.learnerId,
      'learnerName': instance.learnerName,
      'totalXp': instance.totalXp,
      'level': instance.level,
      'streakDays': instance.streakDays,
      'totalBadges': instance.totalBadges,
      'recentBadges': instance.recentBadges,
      'kudosReceived': instance.kudosReceived,
      'lastActivityAt': instance.lastActivityAt?.toIso8601String(),
    };

_$ChildBadgeImpl _$$ChildBadgeImplFromJson(Map<String, dynamic> json) =>
    _$ChildBadgeImpl(
      code: json['code'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      icon: json['icon'] as String?,
      category: json['category'] as String,
      awardedAt: DateTime.parse(json['awardedAt'] as String),
      grantedBy: json['grantedBy'] as String?,
    );

Map<String, dynamic> _$$ChildBadgeImplToJson(_$ChildBadgeImpl instance) =>
    <String, dynamic>{
      'code': instance.code,
      'name': instance.name,
      'description': instance.description,
      'icon': instance.icon,
      'category': instance.category,
      'awardedAt': instance.awardedAt.toIso8601String(),
      'grantedBy': instance.grantedBy,
    };

_$SentKudosImpl _$$SentKudosImplFromJson(Map<String, dynamic> json) =>
    _$SentKudosImpl(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      learnerName: json['learnerName'] as String,
      message: json['message'] as String,
      sentAt: DateTime.parse(json['sentAt'] as String),
    );

Map<String, dynamic> _$$SentKudosImplToJson(_$SentKudosImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'learnerId': instance.learnerId,
      'learnerName': instance.learnerName,
      'message': instance.message,
      'sentAt': instance.sentAt.toIso8601String(),
    };

_$EngagementTimelineItemImpl _$$EngagementTimelineItemImplFromJson(
        Map<String, dynamic> json) =>
    _$EngagementTimelineItemImpl(
      id: json['id'] as String,
      type: json['type'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      icon: json['icon'] as String?,
      occurredAt: DateTime.parse(json['occurredAt'] as String),
    );

Map<String, dynamic> _$$EngagementTimelineItemImplToJson(
        _$EngagementTimelineItemImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'type': instance.type,
      'title': instance.title,
      'description': instance.description,
      'icon': instance.icon,
      'occurredAt': instance.occurredAt.toIso8601String(),
    };
