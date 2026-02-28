// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tutor_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$TutorAddonImpl _$$TutorAddonImplFromJson(Map<String, dynamic> json) =>
    _$TutorAddonImpl(
      id: json['id'] as String,
      personaName: json['personaName'] as String,
      subject: json['subject'] as String,
      description: json['description'] as String,
      priceCents: (json['priceCents'] as num).toInt(),
      billingPeriod: json['billingPeriod'] as String,
      status: $enumDecode(_$TutorAddonStatusEnumMap, json['status']),
      avatarUrl: json['avatarUrl'] as String?,
      highlights: (json['highlights'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      trialDaysRemaining: json['trialDaysRemaining'] as String?,
    );

Map<String, dynamic> _$$TutorAddonImplToJson(_$TutorAddonImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'personaName': instance.personaName,
      'subject': instance.subject,
      'description': instance.description,
      'priceCents': instance.priceCents,
      'billingPeriod': instance.billingPeriod,
      'status': _$TutorAddonStatusEnumMap[instance.status]!,
      'avatarUrl': instance.avatarUrl,
      'highlights': instance.highlights,
      'trialDaysRemaining': instance.trialDaysRemaining,
    };

const _$TutorAddonStatusEnumMap = {
  TutorAddonStatus.available: 'available',
  TutorAddonStatus.active: 'active',
  TutorAddonStatus.expired: 'expired',
};

_$TutorSessionImpl _$$TutorSessionImplFromJson(Map<String, dynamic> json) =>
    _$TutorSessionImpl(
      id: json['id'] as String,
      childId: json['childId'] as String,
      personaName: json['personaName'] as String,
      subject: json['subject'] as String,
      durationMinutes: (json['durationMinutes'] as num).toInt(),
      startedAt: DateTime.parse(json['startedAt'] as String),
      endedAt: json['endedAt'] == null
          ? null
          : DateTime.parse(json['endedAt'] as String),
      summary: json['summary'] as String?,
      masteryScoreDelta: (json['masteryScoreDelta'] as num?)?.toInt(),
      topicsCovered: (json['topicsCovered'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      status: $enumDecodeNullable(_$TutorSessionStatusEnumMap, json['status']),
    );

Map<String, dynamic> _$$TutorSessionImplToJson(_$TutorSessionImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'childId': instance.childId,
      'personaName': instance.personaName,
      'subject': instance.subject,
      'durationMinutes': instance.durationMinutes,
      'startedAt': instance.startedAt.toIso8601String(),
      'endedAt': instance.endedAt?.toIso8601String(),
      'summary': instance.summary,
      'masteryScoreDelta': instance.masteryScoreDelta,
      'topicsCovered': instance.topicsCovered,
      'status': _$TutorSessionStatusEnumMap[instance.status],
    };

const _$TutorSessionStatusEnumMap = {
  TutorSessionStatus.completed: 'completed',
  TutorSessionStatus.inProgress: 'inProgress',
  TutorSessionStatus.abandoned: 'abandoned',
};

_$TutorSessionReportImpl _$$TutorSessionReportImplFromJson(
        Map<String, dynamic> json) =>
    _$TutorSessionReportImpl(
      sessionId: json['sessionId'] as String,
      childId: json['childId'] as String,
      personaName: json['personaName'] as String,
      subject: json['subject'] as String,
      durationMinutes: (json['durationMinutes'] as num).toInt(),
      startedAt: DateTime.parse(json['startedAt'] as String),
      endedAt: json['endedAt'] == null
          ? null
          : DateTime.parse(json['endedAt'] as String),
      summary: json['summary'] as String,
      topicsCovered: (json['topicsCovered'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      skillsPracticed: (json['skillsPracticed'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      masteryScoreBefore: (json['masteryScoreBefore'] as num?)?.toInt(),
      masteryScoreAfter: (json['masteryScoreAfter'] as num?)?.toInt(),
      aiNotes: json['aiNotes'] as String?,
      parentRecommendation: json['parentRecommendation'] as String?,
    );

Map<String, dynamic> _$$TutorSessionReportImplToJson(
        _$TutorSessionReportImpl instance) =>
    <String, dynamic>{
      'sessionId': instance.sessionId,
      'childId': instance.childId,
      'personaName': instance.personaName,
      'subject': instance.subject,
      'durationMinutes': instance.durationMinutes,
      'startedAt': instance.startedAt.toIso8601String(),
      'endedAt': instance.endedAt?.toIso8601String(),
      'summary': instance.summary,
      'topicsCovered': instance.topicsCovered,
      'skillsPracticed': instance.skillsPracticed,
      'masteryScoreBefore': instance.masteryScoreBefore,
      'masteryScoreAfter': instance.masteryScoreAfter,
      'aiNotes': instance.aiNotes,
      'parentRecommendation': instance.parentRecommendation,
    };

_$SubjectBreakdownImpl _$$SubjectBreakdownImplFromJson(
        Map<String, dynamic> json) =>
    _$SubjectBreakdownImpl(
      subject: json['subject'] as String,
      sessions: (json['sessions'] as num).toInt(),
      minutes: (json['minutes'] as num).toInt(),
      topTopics: (json['topTopics'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      color: json['color'] as String,
    );

Map<String, dynamic> _$$SubjectBreakdownImplToJson(
        _$SubjectBreakdownImpl instance) =>
    <String, dynamic>{
      'subject': instance.subject,
      'sessions': instance.sessions,
      'minutes': instance.minutes,
      'topTopics': instance.topTopics,
      'color': instance.color,
    };

_$WeeklyUsageImpl _$$WeeklyUsageImplFromJson(Map<String, dynamic> json) =>
    _$WeeklyUsageImpl(
      week: json['week'] as String,
      sessions: (json['sessions'] as num).toInt(),
      minutes: (json['minutes'] as num).toInt(),
    );

Map<String, dynamic> _$$WeeklyUsageImplToJson(_$WeeklyUsageImpl instance) =>
    <String, dynamic>{
      'week': instance.week,
      'sessions': instance.sessions,
      'minutes': instance.minutes,
    };

_$LearnerBreakdownImpl _$$LearnerBreakdownImplFromJson(
        Map<String, dynamic> json) =>
    _$LearnerBreakdownImpl(
      learnerId: json['learnerId'] as String,
      totalSessions: (json['totalSessions'] as num).toInt(),
      totalMinutes: (json['totalMinutes'] as num).toInt(),
      favoriteSubject: json['favoriteSubject'] as String?,
      lastSessionAt: json['lastSessionAt'] as String?,
    );

Map<String, dynamic> _$$LearnerBreakdownImplToJson(
        _$LearnerBreakdownImpl instance) =>
    <String, dynamic>{
      'learnerId': instance.learnerId,
      'totalSessions': instance.totalSessions,
      'totalMinutes': instance.totalMinutes,
      'favoriteSubject': instance.favoriteSubject,
      'lastSessionAt': instance.lastSessionAt,
    };

_$TutorAnalyticsSummaryImpl _$$TutorAnalyticsSummaryImplFromJson(
        Map<String, dynamic> json) =>
    _$TutorAnalyticsSummaryImpl(
      totalSessions: (json['totalSessions'] as num).toInt(),
      totalMinutes: (json['totalMinutes'] as num).toInt(),
      totalMessages: (json['totalMessages'] as num).toInt(),
      averageSessionMinutes: (json['averageSessionMinutes'] as num).toDouble(),
      subjectBreakdown: (json['subjectBreakdown'] as List<dynamic>?)
              ?.map((e) => SubjectBreakdown.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      weeklyUsage: (json['weeklyUsage'] as List<dynamic>?)
              ?.map((e) => WeeklyUsage.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      learners: (json['learners'] as List<dynamic>?)
              ?.map((e) => LearnerBreakdown.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$TutorAnalyticsSummaryImplToJson(
        _$TutorAnalyticsSummaryImpl instance) =>
    <String, dynamic>{
      'totalSessions': instance.totalSessions,
      'totalMinutes': instance.totalMinutes,
      'totalMessages': instance.totalMessages,
      'averageSessionMinutes': instance.averageSessionMinutes,
      'subjectBreakdown': instance.subjectBreakdown,
      'weeklyUsage': instance.weeklyUsage,
      'learners': instance.learners,
    };

_$AnalyticsPersonaImpl _$$AnalyticsPersonaImplFromJson(
        Map<String, dynamic> json) =>
    _$AnalyticsPersonaImpl(
      name: json['name'] as String,
      slug: json['slug'] as String,
      avatar: json['avatar'] as String?,
    );

Map<String, dynamic> _$$AnalyticsPersonaImplToJson(
        _$AnalyticsPersonaImpl instance) =>
    <String, dynamic>{
      'name': instance.name,
      'slug': instance.slug,
      'avatar': instance.avatar,
    };

_$AnalyticsSessionImpl _$$AnalyticsSessionImplFromJson(
        Map<String, dynamic> json) =>
    _$AnalyticsSessionImpl(
      id: json['id'] as String,
      subject: json['subject'] as String,
      persona:
          AnalyticsPersona.fromJson(json['persona'] as Map<String, dynamic>),
      topic: json['topic'] as String?,
      startedAt: json['startedAt'] as String,
      endedAt: json['endedAt'] as String?,
      durationMinutes: (json['durationMinutes'] as num).toInt(),
      messageCount: (json['messageCount'] as num).toInt(),
      locale: json['locale'] as String?,
      status: json['status'] as String?,
      color: json['color'] as String,
    );

Map<String, dynamic> _$$AnalyticsSessionImplToJson(
        _$AnalyticsSessionImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'subject': instance.subject,
      'persona': instance.persona,
      'topic': instance.topic,
      'startedAt': instance.startedAt,
      'endedAt': instance.endedAt,
      'durationMinutes': instance.durationMinutes,
      'messageCount': instance.messageCount,
      'locale': instance.locale,
      'status': instance.status,
      'color': instance.color,
    };

_$AnalyticsSessionsResponseImpl _$$AnalyticsSessionsResponseImplFromJson(
        Map<String, dynamic> json) =>
    _$AnalyticsSessionsResponseImpl(
      sessions: (json['sessions'] as List<dynamic>)
          .map((e) => AnalyticsSession.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: (json['total'] as num).toInt(),
      page: (json['page'] as num).toInt(),
      pageSize: (json['pageSize'] as num).toInt(),
      totalPages: (json['totalPages'] as num).toInt(),
    );

Map<String, dynamic> _$$AnalyticsSessionsResponseImplToJson(
        _$AnalyticsSessionsResponseImpl instance) =>
    <String, dynamic>{
      'sessions': instance.sessions,
      'total': instance.total,
      'page': instance.page,
      'pageSize': instance.pageSize,
      'totalPages': instance.totalPages,
    };

_$TranscriptMessageImpl _$$TranscriptMessageImplFromJson(
        Map<String, dynamic> json) =>
    _$TranscriptMessageImpl(
      id: json['id'] as String,
      role: json['role'] as String,
      content: json['content'] as String,
      emotion: json['emotion'] as String?,
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$$TranscriptMessageImplToJson(
        _$TranscriptMessageImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'role': instance.role,
      'content': instance.content,
      'emotion': instance.emotion,
      'createdAt': instance.createdAt,
    };

_$TranscriptResponseImpl _$$TranscriptResponseImplFromJson(
        Map<String, dynamic> json) =>
    _$TranscriptResponseImpl(
      session:
          TranscriptSession.fromJson(json['session'] as Map<String, dynamic>),
      messages: (json['messages'] as List<dynamic>)
          .map((e) => TranscriptMessage.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$$TranscriptResponseImplToJson(
        _$TranscriptResponseImpl instance) =>
    <String, dynamic>{
      'session': instance.session,
      'messages': instance.messages,
    };

_$TranscriptSessionImpl _$$TranscriptSessionImplFromJson(
        Map<String, dynamic> json) =>
    _$TranscriptSessionImpl(
      id: json['id'] as String,
      subject: json['subject'] as String,
      topic: json['topic'] as String?,
      persona:
          AnalyticsPersona.fromJson(json['persona'] as Map<String, dynamic>),
      startedAt: json['startedAt'] as String,
      endedAt: json['endedAt'] as String?,
      durationMinutes: (json['durationMinutes'] as num).toInt(),
      locale: json['locale'] as String?,
    );

Map<String, dynamic> _$$TranscriptSessionImplToJson(
        _$TranscriptSessionImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'subject': instance.subject,
      'topic': instance.topic,
      'persona': instance.persona,
      'startedAt': instance.startedAt,
      'endedAt': instance.endedAt,
      'durationMinutes': instance.durationMinutes,
      'locale': instance.locale,
    };
