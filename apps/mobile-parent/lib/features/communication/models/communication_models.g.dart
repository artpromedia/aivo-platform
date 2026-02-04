// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'communication_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$HomeworkTranscriptImpl _$$HomeworkTranscriptImplFromJson(
        Map<String, dynamic> json) =>
    _$HomeworkTranscriptImpl(
      id: json['id'] as String,
      childId: json['childId'] as String,
      assignmentId: json['assignmentId'] as String,
      assignmentTitle: json['assignmentTitle'] as String,
      subject: json['subject'] as String,
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: DateTime.parse(json['endTime'] as String),
      durationMinutes: (json['durationMinutes'] as num).toInt(),
      entries: (json['entries'] as List<dynamic>)
          .map((e) => TranscriptEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
      summary:
          TranscriptSummary.fromJson(json['summary'] as Map<String, dynamic>),
      completionPercentage: (json['completionPercentage'] as num).toDouble(),
      aiSummary: json['aiSummary'] as String?,
    );

Map<String, dynamic> _$$HomeworkTranscriptImplToJson(
        _$HomeworkTranscriptImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'childId': instance.childId,
      'assignmentId': instance.assignmentId,
      'assignmentTitle': instance.assignmentTitle,
      'subject': instance.subject,
      'startTime': instance.startTime.toIso8601String(),
      'endTime': instance.endTime.toIso8601String(),
      'durationMinutes': instance.durationMinutes,
      'entries': instance.entries,
      'summary': instance.summary,
      'completionPercentage': instance.completionPercentage,
      'aiSummary': instance.aiSummary,
    };

_$TranscriptEntryImpl _$$TranscriptEntryImplFromJson(
        Map<String, dynamic> json) =>
    _$TranscriptEntryImpl(
      id: json['id'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      type: $enumDecode(_$TranscriptEntryTypeEnumMap, json['type']),
      content: json['content'] as String,
      questionAsked: json['questionAsked'] as String?,
      aiResponse: json['aiResponse'] as String?,
      hint: json['hint'] as String?,
      confidenceLevel: (json['confidenceLevel'] as num?)?.toDouble(),
      wasCorrect: json['wasCorrect'] as bool?,
      attemptNumber: (json['attemptNumber'] as num?)?.toInt(),
    );

Map<String, dynamic> _$$TranscriptEntryImplToJson(
        _$TranscriptEntryImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'timestamp': instance.timestamp.toIso8601String(),
      'type': _$TranscriptEntryTypeEnumMap[instance.type]!,
      'content': instance.content,
      'questionAsked': instance.questionAsked,
      'aiResponse': instance.aiResponse,
      'hint': instance.hint,
      'confidenceLevel': instance.confidenceLevel,
      'wasCorrect': instance.wasCorrect,
      'attemptNumber': instance.attemptNumber,
    };

const _$TranscriptEntryTypeEnumMap = {
  TranscriptEntryType.question: 'QUESTION',
  TranscriptEntryType.answer: 'ANSWER',
  TranscriptEntryType.hintRequested: 'HINT_REQUESTED',
  TranscriptEntryType.aiExplanation: 'AI_EXPLANATION',
  TranscriptEntryType.struggleDetected: 'STRUGGLE_DETECTED',
  TranscriptEntryType.breakTaken: 'BREAK_TAKEN',
  TranscriptEntryType.topicChange: 'TOPIC_CHANGE',
  TranscriptEntryType.milestoneReached: 'MILESTONE_REACHED',
};

_$TranscriptSummaryImpl _$$TranscriptSummaryImplFromJson(
        Map<String, dynamic> json) =>
    _$TranscriptSummaryImpl(
      totalQuestions: (json['totalQuestions'] as num).toInt(),
      correctAnswers: (json['correctAnswers'] as num).toInt(),
      hintsUsed: (json['hintsUsed'] as num).toInt(),
      strugglesDetected: (json['strugglesDetected'] as num).toInt(),
      topicsWorkedOn: (json['topicsWorkedOn'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      strengthsShown: (json['strengthsShown'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      areasForImprovement: (json['areasForImprovement'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      parentRecommendation: json['parentRecommendation'] as String?,
    );

Map<String, dynamic> _$$TranscriptSummaryImplToJson(
        _$TranscriptSummaryImpl instance) =>
    <String, dynamic>{
      'totalQuestions': instance.totalQuestions,
      'correctAnswers': instance.correctAnswers,
      'hintsUsed': instance.hintsUsed,
      'strugglesDetected': instance.strugglesDetected,
      'topicsWorkedOn': instance.topicsWorkedOn,
      'strengthsShown': instance.strengthsShown,
      'areasForImprovement': instance.areasForImprovement,
      'parentRecommendation': instance.parentRecommendation,
    };

_$TeacherNoteImpl _$$TeacherNoteImplFromJson(Map<String, dynamic> json) =>
    _$TeacherNoteImpl(
      id: json['id'] as String,
      childId: json['childId'] as String,
      teacherId: json['teacherId'] as String,
      teacherName: json['teacherName'] as String,
      subject: json['subject'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      type: $enumDecode(_$TeacherNoteTypeEnumMap, json['type']),
      title: json['title'] as String,
      content: json['content'] as String,
      isRead: json['isRead'] as bool,
      priority: $enumDecode(_$NotePriorityEnumMap, json['priority']),
      readAt: json['readAt'] == null
          ? null
          : DateTime.parse(json['readAt'] as String),
      attachmentUrls: (json['attachmentUrls'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      actionRequired: json['actionRequired'] as String?,
      actionDueDate: json['actionDueDate'] == null
          ? null
          : DateTime.parse(json['actionDueDate'] as String),
      acknowledged: json['acknowledged'] as bool?,
      parentResponse: json['parentResponse'] as String?,
    );

Map<String, dynamic> _$$TeacherNoteImplToJson(_$TeacherNoteImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'childId': instance.childId,
      'teacherId': instance.teacherId,
      'teacherName': instance.teacherName,
      'subject': instance.subject,
      'createdAt': instance.createdAt.toIso8601String(),
      'type': _$TeacherNoteTypeEnumMap[instance.type]!,
      'title': instance.title,
      'content': instance.content,
      'isRead': instance.isRead,
      'priority': _$NotePriorityEnumMap[instance.priority]!,
      'readAt': instance.readAt?.toIso8601String(),
      'attachmentUrls': instance.attachmentUrls,
      'actionRequired': instance.actionRequired,
      'actionDueDate': instance.actionDueDate?.toIso8601String(),
      'acknowledged': instance.acknowledged,
      'parentResponse': instance.parentResponse,
    };

const _$TeacherNoteTypeEnumMap = {
  TeacherNoteType.general: 'GENERAL',
  TeacherNoteType.progressUpdate: 'PROGRESS_UPDATE',
  TeacherNoteType.concern: 'CONCERN',
  TeacherNoteType.achievement: 'ACHIEVEMENT',
  TeacherNoteType.behavior: 'BEHAVIOR',
  TeacherNoteType.iepUpdate: 'IEP_UPDATE',
  TeacherNoteType.request: 'REQUEST',
  TeacherNoteType.reminder: 'REMINDER',
};

const _$NotePriorityEnumMap = {
  NotePriority.low: 'LOW',
  NotePriority.normal: 'NORMAL',
  NotePriority.high: 'HIGH',
  NotePriority.urgent: 'URGENT',
};

_$ProgressReportImpl _$$ProgressReportImplFromJson(Map<String, dynamic> json) =>
    _$ProgressReportImpl(
      id: json['id'] as String,
      childId: json['childId'] as String,
      childName: json['childName'] as String,
      period: $enumDecode(_$ReportPeriodEnumMap, json['period']),
      generatedAt: DateTime.parse(json['generatedAt'] as String),
      periodStart: DateTime.parse(json['periodStart'] as String),
      periodEnd: DateTime.parse(json['periodEnd'] as String),
      overallProgress: OverallProgress.fromJson(
          json['overallProgress'] as Map<String, dynamic>),
      subjectProgress: (json['subjectProgress'] as List<dynamic>)
          .map((e) => SubjectProgress.fromJson(e as Map<String, dynamic>))
          .toList(),
      engagement: EngagementMetrics.fromJson(
          json['engagement'] as Map<String, dynamic>),
      achievements: (json['achievements'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      areasForGrowth: (json['areasForGrowth'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      goalProgress: (json['goalProgress'] as List<dynamic>)
          .map((e) => GoalProgress.fromJson(e as Map<String, dynamic>))
          .toList(),
      teacherComments: json['teacherComments'] as String?,
      aiInsights: json['aiInsights'] as String?,
      pdfUrl: json['pdfUrl'] as String?,
    );

Map<String, dynamic> _$$ProgressReportImplToJson(
        _$ProgressReportImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'childId': instance.childId,
      'childName': instance.childName,
      'period': _$ReportPeriodEnumMap[instance.period]!,
      'generatedAt': instance.generatedAt.toIso8601String(),
      'periodStart': instance.periodStart.toIso8601String(),
      'periodEnd': instance.periodEnd.toIso8601String(),
      'overallProgress': instance.overallProgress,
      'subjectProgress': instance.subjectProgress,
      'engagement': instance.engagement,
      'achievements': instance.achievements,
      'areasForGrowth': instance.areasForGrowth,
      'goalProgress': instance.goalProgress,
      'teacherComments': instance.teacherComments,
      'aiInsights': instance.aiInsights,
      'pdfUrl': instance.pdfUrl,
    };

const _$ReportPeriodEnumMap = {
  ReportPeriod.weekly: 'WEEKLY',
  ReportPeriod.biweekly: 'BIWEEKLY',
  ReportPeriod.monthly: 'MONTHLY',
  ReportPeriod.quarterly: 'QUARTERLY',
  ReportPeriod.semester: 'SEMESTER',
};

_$OverallProgressImpl _$$OverallProgressImplFromJson(
        Map<String, dynamic> json) =>
    _$OverallProgressImpl(
      overallScore: (json['overallScore'] as num).toDouble(),
      previousScore: (json['previousScore'] as num).toDouble(),
      improvementRate: (json['improvementRate'] as num).toDouble(),
      lessonsCompleted: (json['lessonsCompleted'] as num).toInt(),
      totalMinutesLearned: (json['totalMinutesLearned'] as num).toInt(),
      daysActive: (json['daysActive'] as num).toInt(),
      currentStreak: (json['currentStreak'] as num).toInt(),
    );

Map<String, dynamic> _$$OverallProgressImplToJson(
        _$OverallProgressImpl instance) =>
    <String, dynamic>{
      'overallScore': instance.overallScore,
      'previousScore': instance.previousScore,
      'improvementRate': instance.improvementRate,
      'lessonsCompleted': instance.lessonsCompleted,
      'totalMinutesLearned': instance.totalMinutesLearned,
      'daysActive': instance.daysActive,
      'currentStreak': instance.currentStreak,
    };

_$SubjectProgressImpl _$$SubjectProgressImplFromJson(
        Map<String, dynamic> json) =>
    _$SubjectProgressImpl(
      subject: json['subject'] as String,
      score: (json['score'] as num).toDouble(),
      previousScore: (json['previousScore'] as num).toDouble(),
      improvementRate: (json['improvementRate'] as num).toDouble(),
      lessonsCompleted: (json['lessonsCompleted'] as num).toInt(),
      minutesSpent: (json['minutesSpent'] as num).toInt(),
      proficiencyLevel: json['proficiencyLevel'] as String,
      topicsCompleted: (json['topicsCompleted'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      topicsInProgress: (json['topicsInProgress'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      teacherNote: json['teacherNote'] as String?,
    );

Map<String, dynamic> _$$SubjectProgressImplToJson(
        _$SubjectProgressImpl instance) =>
    <String, dynamic>{
      'subject': instance.subject,
      'score': instance.score,
      'previousScore': instance.previousScore,
      'improvementRate': instance.improvementRate,
      'lessonsCompleted': instance.lessonsCompleted,
      'minutesSpent': instance.minutesSpent,
      'proficiencyLevel': instance.proficiencyLevel,
      'topicsCompleted': instance.topicsCompleted,
      'topicsInProgress': instance.topicsInProgress,
      'teacherNote': instance.teacherNote,
    };

_$EngagementMetricsImpl _$$EngagementMetricsImplFromJson(
        Map<String, dynamic> json) =>
    _$EngagementMetricsImpl(
      averageEngagement: (json['averageEngagement'] as num).toDouble(),
      attentionScore: (json['attentionScore'] as num).toDouble(),
      totalSessions: (json['totalSessions'] as num).toInt(),
      averageSessionLength: (json['averageSessionLength'] as num).toInt(),
      completionRate: (json['completionRate'] as num).toDouble(),
      hintsUsedPerLesson: (json['hintsUsedPerLesson'] as num).toInt(),
      activityByDay: Map<String, int>.from(json['activityByDay'] as Map),
      peakLearningTimes: (json['peakLearningTimes'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$$EngagementMetricsImplToJson(
        _$EngagementMetricsImpl instance) =>
    <String, dynamic>{
      'averageEngagement': instance.averageEngagement,
      'attentionScore': instance.attentionScore,
      'totalSessions': instance.totalSessions,
      'averageSessionLength': instance.averageSessionLength,
      'completionRate': instance.completionRate,
      'hintsUsedPerLesson': instance.hintsUsedPerLesson,
      'activityByDay': instance.activityByDay,
      'peakLearningTimes': instance.peakLearningTimes,
    };

_$GoalProgressImpl _$$GoalProgressImplFromJson(Map<String, dynamic> json) =>
    _$GoalProgressImpl(
      goalId: json['goalId'] as String,
      goalTitle: json['goalTitle'] as String,
      goalType: json['goalType'] as String,
      progress: (json['progress'] as num).toDouble(),
      targetDate: DateTime.parse(json['targetDate'] as String),
      status: $enumDecode(_$GoalStatusEnumMap, json['status']),
      notes: json['notes'] as String?,
    );

Map<String, dynamic> _$$GoalProgressImplToJson(_$GoalProgressImpl instance) =>
    <String, dynamic>{
      'goalId': instance.goalId,
      'goalTitle': instance.goalTitle,
      'goalType': instance.goalType,
      'progress': instance.progress,
      'targetDate': instance.targetDate.toIso8601String(),
      'status': _$GoalStatusEnumMap[instance.status]!,
      'notes': instance.notes,
    };

const _$GoalStatusEnumMap = {
  GoalStatus.notStarted: 'NOT_STARTED',
  GoalStatus.inProgress: 'IN_PROGRESS',
  GoalStatus.onTrack: 'ON_TRACK',
  GoalStatus.atRisk: 'AT_RISK',
  GoalStatus.completed: 'COMPLETED',
  GoalStatus.exceeded: 'EXCEEDED',
};

_$ReportRequestImpl _$$ReportRequestImplFromJson(Map<String, dynamic> json) =>
    _$ReportRequestImpl(
      childId: json['childId'] as String,
      period: $enumDecode(_$ReportPeriodEnumMap, json['period']),
      customStartDate: json['customStartDate'] == null
          ? null
          : DateTime.parse(json['customStartDate'] as String),
      customEndDate: json['customEndDate'] == null
          ? null
          : DateTime.parse(json['customEndDate'] as String),
      includeTranscripts: json['includeTranscripts'] as bool? ?? true,
      includeTeacherNotes: json['includeTeacherNotes'] as bool? ?? true,
      includeGoalProgress: json['includeGoalProgress'] as bool? ?? true,
      generatePdf: json['generatePdf'] as bool? ?? true,
    );

Map<String, dynamic> _$$ReportRequestImplToJson(_$ReportRequestImpl instance) =>
    <String, dynamic>{
      'childId': instance.childId,
      'period': _$ReportPeriodEnumMap[instance.period]!,
      'customStartDate': instance.customStartDate?.toIso8601String(),
      'customEndDate': instance.customEndDate?.toIso8601String(),
      'includeTranscripts': instance.includeTranscripts,
      'includeTeacherNotes': instance.includeTeacherNotes,
      'includeGoalProgress': instance.includeGoalProgress,
      'generatePdf': instance.generatePdf,
    };
