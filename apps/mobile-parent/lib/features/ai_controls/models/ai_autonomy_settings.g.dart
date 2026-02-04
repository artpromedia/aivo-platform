// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ai_autonomy_settings.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$AIAutonomySettingsImpl _$$AIAutonomySettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$AIAutonomySettingsImpl(
      childId: json['childId'] as String,
      overallLevel: $enumDecode(_$AutonomyLevelEnumMap, json['overallLevel']),
      categorySettings: (json['categorySettings'] as Map<String, dynamic>).map(
        (k, e) => MapEntry($enumDecode(_$DecisionCategoryEnumMap, k),
            CategoryAutonomy.fromJson(e as Map<String, dynamic>)),
      ),
      notifications: NotificationSettings.fromJson(
          json['notifications'] as Map<String, dynamic>),
      restrictions: (json['restrictions'] as List<dynamic>)
          .map((e) => AIRestriction.fromJson(e as Map<String, dynamic>))
          .toList(),
      pauseAllAI: json['pauseAllAI'] as bool? ?? false,
      pauseUntil: json['pauseUntil'] == null
          ? null
          : DateTime.parse(json['pauseUntil'] as String),
      pauseReason: json['pauseReason'] as String?,
      lastModified: json['lastModified'] == null
          ? null
          : DateTime.parse(json['lastModified'] as String),
      modifiedBy: json['modifiedBy'] as String?,
    );

Map<String, dynamic> _$$AIAutonomySettingsImplToJson(
        _$AIAutonomySettingsImpl instance) =>
    <String, dynamic>{
      'childId': instance.childId,
      'overallLevel': _$AutonomyLevelEnumMap[instance.overallLevel]!,
      'categorySettings': instance.categorySettings
          .map((k, e) => MapEntry(_$DecisionCategoryEnumMap[k]!, e)),
      'notifications': instance.notifications,
      'restrictions': instance.restrictions,
      'pauseAllAI': instance.pauseAllAI,
      'pauseUntil': instance.pauseUntil?.toIso8601String(),
      'pauseReason': instance.pauseReason,
      'lastModified': instance.lastModified?.toIso8601String(),
      'modifiedBy': instance.modifiedBy,
    };

const _$AutonomyLevelEnumMap = {
  AutonomyLevel.full: 'full',
  AutonomyLevel.moderate: 'moderate',
  AutonomyLevel.limited: 'limited',
  AutonomyLevel.requireApproval: 'requireApproval',
};

const _$DecisionCategoryEnumMap = {
  DecisionCategory.difficulty: 'difficulty',
  DecisionCategory.pace: 'pace',
  DecisionCategory.topics: 'topics',
  DecisionCategory.rewards: 'rewards',
  DecisionCategory.breaks: 'breaks',
  DecisionCategory.communication: 'communication',
  DecisionCategory.assessments: 'assessments',
  DecisionCategory.interventions: 'interventions',
};

_$CategoryAutonomyImpl _$$CategoryAutonomyImplFromJson(
        Map<String, dynamic> json) =>
    _$CategoryAutonomyImpl(
      category: $enumDecode(_$DecisionCategoryEnumMap, json['category']),
      level: $enumDecode(_$AutonomyLevelEnumMap, json['level']),
      enabled: json['enabled'] as bool? ?? true,
      customMessage: json['customMessage'] as String?,
      allowedValues: (json['allowedValues'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      blockedValues: (json['blockedValues'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      limits: json['limits'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$$CategoryAutonomyImplToJson(
        _$CategoryAutonomyImpl instance) =>
    <String, dynamic>{
      'category': _$DecisionCategoryEnumMap[instance.category]!,
      'level': _$AutonomyLevelEnumMap[instance.level]!,
      'enabled': instance.enabled,
      'customMessage': instance.customMessage,
      'allowedValues': instance.allowedValues,
      'blockedValues': instance.blockedValues,
      'limits': instance.limits,
    };

_$AIRestrictionImpl _$$AIRestrictionImplFromJson(Map<String, dynamic> json) =>
    _$AIRestrictionImpl(
      id: json['id'] as String,
      type: $enumDecode(_$RestrictionTypeEnumMap, json['type']),
      name: json['name'] as String,
      description: json['description'] as String,
      isActive: json['isActive'] as bool,
      parameters: json['parameters'] as Map<String, dynamic>?,
      startTime: json['startTime'] == null
          ? null
          : DateTime.parse(json['startTime'] as String),
      endTime: json['endTime'] == null
          ? null
          : DateTime.parse(json['endTime'] as String),
      daysOfWeek: (json['daysOfWeek'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$$AIRestrictionImplToJson(_$AIRestrictionImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'type': _$RestrictionTypeEnumMap[instance.type]!,
      'name': instance.name,
      'description': instance.description,
      'isActive': instance.isActive,
      'parameters': instance.parameters,
      'startTime': instance.startTime?.toIso8601String(),
      'endTime': instance.endTime?.toIso8601String(),
      'daysOfWeek': instance.daysOfWeek,
      'createdAt': instance.createdAt?.toIso8601String(),
    };

const _$RestrictionTypeEnumMap = {
  RestrictionType.time: 'time',
  RestrictionType.content: 'content',
  RestrictionType.feature: 'feature',
  RestrictionType.subject: 'subject',
};

_$NotificationSettingsImpl _$$NotificationSettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$NotificationSettingsImpl(
      priority: $enumDecodeNullable(
              _$NotificationPriorityEnumMap, json['priority']) ??
          NotificationPriority.important,
      approvalRequests: json['approvalRequests'] as bool? ?? true,
      majorDecisions: json['majorDecisions'] as bool? ?? true,
      allDecisions: json['allDecisions'] as bool? ?? false,
      dailySummary: json['dailySummary'] as bool? ?? true,
      weeklyReport: json['weeklyReport'] as bool? ?? false,
      interventionAlerts: json['interventionAlerts'] as bool? ?? true,
      progressMilestones: json['progressMilestones'] as bool? ?? true,
      preferredTime: json['preferredTime'] as String?,
    );

Map<String, dynamic> _$$NotificationSettingsImplToJson(
        _$NotificationSettingsImpl instance) =>
    <String, dynamic>{
      'priority': _$NotificationPriorityEnumMap[instance.priority]!,
      'approvalRequests': instance.approvalRequests,
      'majorDecisions': instance.majorDecisions,
      'allDecisions': instance.allDecisions,
      'dailySummary': instance.dailySummary,
      'weeklyReport': instance.weeklyReport,
      'interventionAlerts': instance.interventionAlerts,
      'progressMilestones': instance.progressMilestones,
      'preferredTime': instance.preferredTime,
    };

const _$NotificationPriorityEnumMap = {
  NotificationPriority.all: 'all',
  NotificationPriority.important: 'important',
  NotificationPriority.critical: 'critical',
  NotificationPriority.none: 'none',
};

_$ApprovalRequestImpl _$$ApprovalRequestImplFromJson(
        Map<String, dynamic> json) =>
    _$ApprovalRequestImpl(
      id: json['id'] as String,
      childId: json['childId'] as String,
      category: $enumDecode(_$DecisionCategoryEnumMap, json['category']),
      title: json['title'] as String,
      description: json['description'] as String,
      status: $enumDecode(_$ApprovalStatusEnumMap, json['status']),
      requestedAt: DateTime.parse(json['requestedAt'] as String),
      aiReasoning: json['aiReasoning'] as String?,
      proposedChange: json['proposedChange'] as Map<String, dynamic>?,
      currentState: json['currentState'] as Map<String, dynamic>?,
      expiresAt: json['expiresAt'] == null
          ? null
          : DateTime.parse(json['expiresAt'] as String),
      respondedAt: json['respondedAt'] == null
          ? null
          : DateTime.parse(json['respondedAt'] as String),
      parentResponse: json['parentResponse'] as String?,
      isUrgent: json['isUrgent'] as bool? ?? false,
    );

Map<String, dynamic> _$$ApprovalRequestImplToJson(
        _$ApprovalRequestImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'childId': instance.childId,
      'category': _$DecisionCategoryEnumMap[instance.category]!,
      'title': instance.title,
      'description': instance.description,
      'status': _$ApprovalStatusEnumMap[instance.status]!,
      'requestedAt': instance.requestedAt.toIso8601String(),
      'aiReasoning': instance.aiReasoning,
      'proposedChange': instance.proposedChange,
      'currentState': instance.currentState,
      'expiresAt': instance.expiresAt?.toIso8601String(),
      'respondedAt': instance.respondedAt?.toIso8601String(),
      'parentResponse': instance.parentResponse,
      'isUrgent': instance.isUrgent,
    };

const _$ApprovalStatusEnumMap = {
  ApprovalStatus.pending: 'pending',
  ApprovalStatus.approved: 'approved',
  ApprovalStatus.denied: 'denied',
  ApprovalStatus.expired: 'expired',
};

_$AutonomyPresetImpl _$$AutonomyPresetImplFromJson(Map<String, dynamic> json) =>
    _$AutonomyPresetImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      defaultLevel: $enumDecode(_$AutonomyLevelEnumMap, json['defaultLevel']),
      categoryLevels: (json['categoryLevels'] as Map<String, dynamic>).map(
        (k, e) => MapEntry($enumDecode(_$DecisionCategoryEnumMap, k),
            $enumDecode(_$AutonomyLevelEnumMap, e)),
      ),
      icon: $enumDecodeNullable(_$IconTypeEnumMap, json['icon']),
      isRecommended: json['isRecommended'] as bool? ?? false,
    );

Map<String, dynamic> _$$AutonomyPresetImplToJson(
        _$AutonomyPresetImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'defaultLevel': _$AutonomyLevelEnumMap[instance.defaultLevel]!,
      'categoryLevels': instance.categoryLevels.map((k, e) =>
          MapEntry(_$DecisionCategoryEnumMap[k]!, _$AutonomyLevelEnumMap[e]!)),
      'icon': _$IconTypeEnumMap[instance.icon],
      'isRecommended': instance.isRecommended,
    };

const _$IconTypeEnumMap = {
  IconType.shield: 'shield',
  IconType.balance: 'balance',
  IconType.rocket: 'rocket',
  IconType.lock: 'lock',
};

_$AIActivityEntryImpl _$$AIActivityEntryImplFromJson(
        Map<String, dynamic> json) =>
    _$AIActivityEntryImpl(
      id: json['id'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      category: $enumDecode(_$DecisionCategoryEnumMap, json['category']),
      action: json['action'] as String,
      description: json['description'] as String,
      approvalStatus:
          $enumDecodeNullable(_$ApprovalStatusEnumMap, json['approvalStatus']),
      parentAction: json['parentAction'] as String?,
      details: json['details'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$$AIActivityEntryImplToJson(
        _$AIActivityEntryImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'timestamp': instance.timestamp.toIso8601String(),
      'category': _$DecisionCategoryEnumMap[instance.category]!,
      'action': instance.action,
      'description': instance.description,
      'approvalStatus': _$ApprovalStatusEnumMap[instance.approvalStatus],
      'parentAction': instance.parentAction,
      'details': instance.details,
    };
