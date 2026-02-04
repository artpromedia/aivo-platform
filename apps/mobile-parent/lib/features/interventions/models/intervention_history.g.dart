// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'intervention_history.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$InterventionRecordImpl _$$InterventionRecordImplFromJson(
        Map<String, dynamic> json) =>
    _$InterventionRecordImpl(
      id: json['id'] as String,
      childId: json['childId'] as String,
      type: $enumDecode(_$InterventionTypeEnumMap, json['type']),
      title: json['title'] as String,
      description: json['description'] as String,
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: json['endDate'] == null
          ? null
          : DateTime.parse(json['endDate'] as String),
      status: $enumDecode(_$InterventionStatusEnumMap, json['status']),
      category: $enumDecode(_$InterventionCategoryEnumMap, json['category']),
      outcome: json['outcome'] == null
          ? null
          : InterventionOutcome.fromJson(
              json['outcome'] as Map<String, dynamic>),
      assignedBy: json['assignedBy'] as String?,
      assignedByName: json['assignedByName'] as String?,
      goals:
          (json['goals'] as List<dynamic>?)?.map((e) => e as String).toList() ??
              const [],
      progressHistory: (json['progressHistory'] as List<dynamic>?)
              ?.map((e) =>
                  InterventionProgress.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      metadata: json['metadata'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$$InterventionRecordImplToJson(
        _$InterventionRecordImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'childId': instance.childId,
      'type': _$InterventionTypeEnumMap[instance.type]!,
      'title': instance.title,
      'description': instance.description,
      'startDate': instance.startDate.toIso8601String(),
      'endDate': instance.endDate?.toIso8601String(),
      'status': _$InterventionStatusEnumMap[instance.status]!,
      'category': _$InterventionCategoryEnumMap[instance.category]!,
      'outcome': instance.outcome,
      'assignedBy': instance.assignedBy,
      'assignedByName': instance.assignedByName,
      'goals': instance.goals,
      'progressHistory': instance.progressHistory,
      'metadata': instance.metadata,
    };

const _$InterventionTypeEnumMap = {
  InterventionType.aiAdaptive: 'aiAdaptive',
  InterventionType.teacherRecommended: 'teacherRecommended',
  InterventionType.systemGenerated: 'systemGenerated',
  InterventionType.parentRequested: 'parentRequested',
};

const _$InterventionStatusEnumMap = {
  InterventionStatus.active: 'active',
  InterventionStatus.completed: 'completed',
  InterventionStatus.paused: 'paused',
  InterventionStatus.discontinued: 'discontinued',
  InterventionStatus.pending: 'pending',
};

const _$InterventionCategoryEnumMap = {
  InterventionCategory.academic: 'academic',
  InterventionCategory.behavioral: 'behavioral',
  InterventionCategory.social: 'social',
  InterventionCategory.accessibility: 'accessibility',
  InterventionCategory.engagement: 'engagement',
  InterventionCategory.motivation: 'motivation',
};

_$InterventionOutcomeImpl _$$InterventionOutcomeImplFromJson(
        Map<String, dynamic> json) =>
    _$InterventionOutcomeImpl(
      successLevel: $enumDecode(_$SuccessLevelEnumMap, json['successLevel']),
      metrics: (json['metrics'] as Map<String, dynamic>).map(
        (k, e) => MapEntry(k, (e as num).toDouble()),
      ),
      notes: json['notes'] as String?,
      evaluatedAt: json['evaluatedAt'] == null
          ? null
          : DateTime.parse(json['evaluatedAt'] as String),
      evaluatedBy: json['evaluatedBy'] as String?,
      improvements: (json['improvements'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      challenges: (json['challenges'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$InterventionOutcomeImplToJson(
        _$InterventionOutcomeImpl instance) =>
    <String, dynamic>{
      'successLevel': _$SuccessLevelEnumMap[instance.successLevel]!,
      'metrics': instance.metrics,
      'notes': instance.notes,
      'evaluatedAt': instance.evaluatedAt?.toIso8601String(),
      'evaluatedBy': instance.evaluatedBy,
      'improvements': instance.improvements,
      'challenges': instance.challenges,
    };

const _$SuccessLevelEnumMap = {
  SuccessLevel.notYetMeasured: 'notYetMeasured',
  SuccessLevel.minimal: 'minimal',
  SuccessLevel.partial: 'partial',
  SuccessLevel.significant: 'significant',
  SuccessLevel.full: 'full',
};

_$InterventionProgressImpl _$$InterventionProgressImplFromJson(
        Map<String, dynamic> json) =>
    _$InterventionProgressImpl(
      date: DateTime.parse(json['date'] as String),
      progressValue: (json['progressValue'] as num).toDouble(),
      notes: json['notes'] as String?,
      recordedBy: json['recordedBy'] as String?,
    );

Map<String, dynamic> _$$InterventionProgressImplToJson(
        _$InterventionProgressImpl instance) =>
    <String, dynamic>{
      'date': instance.date.toIso8601String(),
      'progressValue': instance.progressValue,
      'notes': instance.notes,
      'recordedBy': instance.recordedBy,
    };

_$InterventionSummaryImpl _$$InterventionSummaryImplFromJson(
        Map<String, dynamic> json) =>
    _$InterventionSummaryImpl(
      childId: json['childId'] as String,
      totalInterventions: (json['totalInterventions'] as num).toInt(),
      activeCount: (json['activeCount'] as num).toInt(),
      completedCount: (json['completedCount'] as num).toInt(),
      successfulCount: (json['successfulCount'] as num).toInt(),
      byCategory: (json['byCategory'] as Map<String, dynamic>).map(
        (k, e) => MapEntry(
            $enumDecode(_$InterventionCategoryEnumMap, k), (e as num).toInt()),
      ),
      lastUpdated: json['lastUpdated'] == null
          ? null
          : DateTime.parse(json['lastUpdated'] as String),
    );

Map<String, dynamic> _$$InterventionSummaryImplToJson(
        _$InterventionSummaryImpl instance) =>
    <String, dynamic>{
      'childId': instance.childId,
      'totalInterventions': instance.totalInterventions,
      'activeCount': instance.activeCount,
      'completedCount': instance.completedCount,
      'successfulCount': instance.successfulCount,
      'byCategory': instance.byCategory
          .map((k, e) => MapEntry(_$InterventionCategoryEnumMap[k]!, e)),
      'lastUpdated': instance.lastUpdated?.toIso8601String(),
    };

_$InterventionEvidenceImpl _$$InterventionEvidenceImplFromJson(
        Map<String, dynamic> json) =>
    _$InterventionEvidenceImpl(
      id: json['id'] as String,
      interventionId: json['interventionId'] as String,
      title: json['title'] as String,
      type: $enumDecode(_$EvidenceTypeEnumMap, json['type']),
      url: json['url'] as String?,
      description: json['description'] as String?,
      uploadedAt: json['uploadedAt'] == null
          ? null
          : DateTime.parse(json['uploadedAt'] as String),
    );

Map<String, dynamic> _$$InterventionEvidenceImplToJson(
        _$InterventionEvidenceImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'interventionId': instance.interventionId,
      'title': instance.title,
      'type': _$EvidenceTypeEnumMap[instance.type]!,
      'url': instance.url,
      'description': instance.description,
      'uploadedAt': instance.uploadedAt?.toIso8601String(),
    };

const _$EvidenceTypeEnumMap = {
  EvidenceType.document: 'document',
  EvidenceType.image: 'image',
  EvidenceType.video: 'video',
  EvidenceType.assessment: 'assessment',
  EvidenceType.report: 'report',
  EvidenceType.note: 'note',
};
