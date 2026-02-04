// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ai_brain_state.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$AIBrainStateImpl _$$AIBrainStateImplFromJson(Map<String, dynamic> json) =>
    _$AIBrainStateImpl(
      childId: json['childId'] as String,
      childName: json['childName'] as String,
      currentFocus:
          AIFocus.fromJson(json['currentFocus'] as Map<String, dynamic>),
      recentAdaptations: (json['recentAdaptations'] as List<dynamic>)
          .map((e) => LearningAdaptation.fromJson(e as Map<String, dynamic>))
          .toList(),
      learningPath:
          LearningPath.fromJson(json['learningPath'] as Map<String, dynamic>),
      confidenceLevel: (json['confidenceLevel'] as num).toDouble(),
      lastUpdated: json['lastUpdated'] == null
          ? null
          : DateTime.parse(json['lastUpdated'] as String),
      activeStrategies: (json['activeStrategies'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      personality: json['personality'] == null
          ? null
          : AIPersonality.fromJson(json['personality'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$AIBrainStateImplToJson(_$AIBrainStateImpl instance) =>
    <String, dynamic>{
      'childId': instance.childId,
      'childName': instance.childName,
      'currentFocus': instance.currentFocus,
      'recentAdaptations': instance.recentAdaptations,
      'learningPath': instance.learningPath,
      'confidenceLevel': instance.confidenceLevel,
      'lastUpdated': instance.lastUpdated?.toIso8601String(),
      'activeStrategies': instance.activeStrategies,
      'personality': instance.personality,
    };

_$AIFocusImpl _$$AIFocusImplFromJson(Map<String, dynamic> json) =>
    _$AIFocusImpl(
      subject: json['subject'] as String,
      topic: json['topic'] as String,
      skill: json['skill'] as String,
      reason: $enumDecode(_$FocusReasonEnumMap, json['reason']),
      startedAt: json['startedAt'] == null
          ? null
          : DateTime.parse(json['startedAt'] as String),
      progress: (json['progress'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$$AIFocusImplToJson(_$AIFocusImpl instance) =>
    <String, dynamic>{
      'subject': instance.subject,
      'topic': instance.topic,
      'skill': instance.skill,
      'reason': _$FocusReasonEnumMap[instance.reason]!,
      'startedAt': instance.startedAt?.toIso8601String(),
      'progress': instance.progress,
    };

const _$FocusReasonEnumMap = {
  FocusReason.scheduledLesson: 'scheduledLesson',
  FocusReason.remediationNeeded: 'remediationNeeded',
  FocusReason.parentRequest: 'parentRequest',
  FocusReason.teacherAssigned: 'teacherAssigned',
  FocusReason.adaptiveRecommendation: 'adaptiveRecommendation',
  FocusReason.studentChoice: 'studentChoice',
};

_$LearningAdaptationImpl _$$LearningAdaptationImplFromJson(
        Map<String, dynamic> json) =>
    _$LearningAdaptationImpl(
      id: json['id'] as String,
      adaptationType:
          $enumDecode(_$AdaptationTypeEnumMap, json['adaptationType']),
      reason: json['reason'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      impact: json['impact'] as String?,
      previousValue: json['previousValue'] as String?,
      newValue: json['newValue'] as String?,
      wasSuccessful: json['wasSuccessful'] as bool? ?? false,
    );

Map<String, dynamic> _$$LearningAdaptationImplToJson(
        _$LearningAdaptationImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'adaptationType': _$AdaptationTypeEnumMap[instance.adaptationType]!,
      'reason': instance.reason,
      'timestamp': instance.timestamp.toIso8601String(),
      'impact': instance.impact,
      'previousValue': instance.previousValue,
      'newValue': instance.newValue,
      'wasSuccessful': instance.wasSuccessful,
    };

const _$AdaptationTypeEnumMap = {
  AdaptationType.difficultyAdjustment: 'difficultyAdjustment',
  AdaptationType.contentChange: 'contentChange',
  AdaptationType.paceChange: 'paceChange',
  AdaptationType.approachChange: 'approachChange',
  AdaptationType.scaffoldingAdded: 'scaffoldingAdded',
  AdaptationType.scaffoldingRemoved: 'scaffoldingRemoved',
  AdaptationType.topicSwitch: 'topicSwitch',
  AdaptationType.breakSuggested: 'breakSuggested',
  AdaptationType.encouragementStyle: 'encouragementStyle',
  AdaptationType.explanationStyle: 'explanationStyle',
};

_$AIDecisionImpl _$$AIDecisionImplFromJson(Map<String, dynamic> json) =>
    _$AIDecisionImpl(
      id: json['id'] as String,
      decisionType: $enumDecode(_$DecisionTypeEnumMap, json['decisionType']),
      context: json['context'] as String,
      rationale: json['rationale'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      outcome: json['outcome'] == null
          ? null
          : DecisionOutcome.fromJson(json['outcome'] as Map<String, dynamic>),
      confidenceScore: (json['confidenceScore'] as num?)?.toDouble(),
      alternatives: (json['alternatives'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$AIDecisionImplToJson(_$AIDecisionImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'decisionType': _$DecisionTypeEnumMap[instance.decisionType]!,
      'context': instance.context,
      'rationale': instance.rationale,
      'timestamp': instance.timestamp.toIso8601String(),
      'outcome': instance.outcome,
      'confidenceScore': instance.confidenceScore,
      'alternatives': instance.alternatives,
    };

const _$DecisionTypeEnumMap = {
  DecisionType.contentSelection: 'contentSelection',
  DecisionType.difficultyLevel: 'difficultyLevel',
  DecisionType.feedbackType: 'feedbackType',
  DecisionType.hintProvision: 'hintProvision',
  DecisionType.topicTransition: 'topicTransition',
  DecisionType.assessmentTiming: 'assessmentTiming',
  DecisionType.breakRecommendation: 'breakRecommendation',
  DecisionType.parentAlert: 'parentAlert',
  DecisionType.teacherNotification: 'teacherNotification',
};

_$DecisionOutcomeImpl _$$DecisionOutcomeImplFromJson(
        Map<String, dynamic> json) =>
    _$DecisionOutcomeImpl(
      successful: json['successful'] as bool,
      feedback: json['feedback'] as String?,
      engagementChange: (json['engagementChange'] as num?)?.toDouble(),
      performanceChange: (json['performanceChange'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$$DecisionOutcomeImplToJson(
        _$DecisionOutcomeImpl instance) =>
    <String, dynamic>{
      'successful': instance.successful,
      'feedback': instance.feedback,
      'engagementChange': instance.engagementChange,
      'performanceChange': instance.performanceChange,
    };

_$LearningPathImpl _$$LearningPathImplFromJson(Map<String, dynamic> json) =>
    _$LearningPathImpl(
      subject: json['subject'] as String,
      nodes: (json['nodes'] as List<dynamic>)
          .map((e) => LearningPathNode.fromJson(e as Map<String, dynamic>))
          .toList(),
      currentNodeIndex: (json['currentNodeIndex'] as num).toInt(),
      overallProgress: (json['overallProgress'] as num?)?.toDouble(),
      estimatedCompletion: json['estimatedCompletion'] == null
          ? null
          : DateTime.parse(json['estimatedCompletion'] as String),
    );

Map<String, dynamic> _$$LearningPathImplToJson(_$LearningPathImpl instance) =>
    <String, dynamic>{
      'subject': instance.subject,
      'nodes': instance.nodes,
      'currentNodeIndex': instance.currentNodeIndex,
      'overallProgress': instance.overallProgress,
      'estimatedCompletion': instance.estimatedCompletion?.toIso8601String(),
    };

_$LearningPathNodeImpl _$$LearningPathNodeImplFromJson(
        Map<String, dynamic> json) =>
    _$LearningPathNodeImpl(
      id: json['id'] as String,
      topic: json['topic'] as String,
      status: $enumDecode(_$NodeStatusEnumMap, json['status']),
      prerequisites: (json['prerequisites'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      nextSteps:
          (json['nextSteps'] as List<dynamic>).map((e) => e as String).toList(),
      masteryLevel: (json['masteryLevel'] as num?)?.toDouble(),
      estimatedMinutes: (json['estimatedMinutes'] as num?)?.toInt(),
      skills: (json['skills'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$LearningPathNodeImplToJson(
        _$LearningPathNodeImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'topic': instance.topic,
      'status': _$NodeStatusEnumMap[instance.status]!,
      'prerequisites': instance.prerequisites,
      'nextSteps': instance.nextSteps,
      'masteryLevel': instance.masteryLevel,
      'estimatedMinutes': instance.estimatedMinutes,
      'skills': instance.skills,
    };

const _$NodeStatusEnumMap = {
  NodeStatus.locked: 'locked',
  NodeStatus.available: 'available',
  NodeStatus.inProgress: 'inProgress',
  NodeStatus.completed: 'completed',
  NodeStatus.mastered: 'mastered',
  NodeStatus.needsReview: 'needsReview',
};

_$AIPersonalityImpl _$$AIPersonalityImplFromJson(Map<String, dynamic> json) =>
    _$AIPersonalityImpl(
      name: json['name'] as String,
      tone: json['tone'] as String,
      encouragementStyle: json['encouragementStyle'] as String,
      explanationStyle: json['explanationStyle'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      customSettings:
          json['customSettings'] as Map<String, dynamic>? ?? const {},
    );

Map<String, dynamic> _$$AIPersonalityImplToJson(_$AIPersonalityImpl instance) =>
    <String, dynamic>{
      'name': instance.name,
      'tone': instance.tone,
      'encouragementStyle': instance.encouragementStyle,
      'explanationStyle': instance.explanationStyle,
      'avatarUrl': instance.avatarUrl,
      'customSettings': instance.customSettings,
    };

_$SubjectInfoImpl _$$SubjectInfoImplFromJson(Map<String, dynamic> json) =>
    _$SubjectInfoImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      iconName: json['iconName'] as String,
      progress: (json['progress'] as num).toDouble(),
      lessonsCompleted: (json['lessonsCompleted'] as num).toInt(),
      totalLessons: (json['totalLessons'] as num).toInt(),
    );

Map<String, dynamic> _$$SubjectInfoImplToJson(_$SubjectInfoImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'iconName': instance.iconName,
      'progress': instance.progress,
      'lessonsCompleted': instance.lessonsCompleted,
      'totalLessons': instance.totalLessons,
    };
