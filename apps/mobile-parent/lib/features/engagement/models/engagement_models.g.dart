// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'engagement_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$LearningStreakImpl _$$LearningStreakImplFromJson(Map<String, dynamic> json) =>
    _$LearningStreakImpl(
      childId: json['childId'] as String,
      currentStreak: (json['currentStreak'] as num).toInt(),
      longestStreak: (json['longestStreak'] as num).toInt(),
      lastActiveDate: json['lastActiveDate'] == null
          ? null
          : DateTime.parse(json['lastActiveDate'] as String),
      streakHistory: (json['streakHistory'] as List<dynamic>)
          .map((e) => StreakDay.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalActiveDays: (json['totalActiveDays'] as num).toInt(),
      weeklyGoal: (json['weeklyGoal'] as num?)?.toInt() ?? 7,
      weeklyProgress: (json['weeklyProgress'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$$LearningStreakImplToJson(
        _$LearningStreakImpl instance) =>
    <String, dynamic>{
      'childId': instance.childId,
      'currentStreak': instance.currentStreak,
      'longestStreak': instance.longestStreak,
      'lastActiveDate': instance.lastActiveDate?.toIso8601String(),
      'streakHistory': instance.streakHistory,
      'totalActiveDays': instance.totalActiveDays,
      'weeklyGoal': instance.weeklyGoal,
      'weeklyProgress': instance.weeklyProgress,
    };

_$StreakDayImpl _$$StreakDayImplFromJson(Map<String, dynamic> json) =>
    _$StreakDayImpl(
      date: DateTime.parse(json['date'] as String),
      isActive: json['isActive'] as bool,
      minutesLearned: (json['minutesLearned'] as num).toInt(),
      lessonsCompleted: (json['lessonsCompleted'] as num).toInt(),
      pointsEarned: (json['pointsEarned'] as num).toInt(),
      highlight: json['highlight'] as String?,
    );

Map<String, dynamic> _$$StreakDayImplToJson(_$StreakDayImpl instance) =>
    <String, dynamic>{
      'date': instance.date.toIso8601String(),
      'isActive': instance.isActive,
      'minutesLearned': instance.minutesLearned,
      'lessonsCompleted': instance.lessonsCompleted,
      'pointsEarned': instance.pointsEarned,
      'highlight': instance.highlight,
    };

_$DailyUsageImpl _$$DailyUsageImplFromJson(Map<String, dynamic> json) =>
    _$DailyUsageImpl(
      childId: json['childId'] as String,
      date: DateTime.parse(json['date'] as String),
      totalMinutes: (json['totalMinutes'] as num).toInt(),
      activeMinutes: (json['activeMinutes'] as num).toInt(),
      idleMinutes: (json['idleMinutes'] as num).toInt(),
      sessions: (json['sessions'] as List<dynamic>)
          .map((e) => UsageSession.fromJson(e as Map<String, dynamic>))
          .toList(),
      subjectBreakdown: Map<String, int>.from(json['subjectBreakdown'] as Map),
      lessonsStarted: (json['lessonsStarted'] as num).toInt(),
      lessonsCompleted: (json['lessonsCompleted'] as num).toInt(),
      averageEngagement: (json['averageEngagement'] as num).toDouble(),
    );

Map<String, dynamic> _$$DailyUsageImplToJson(_$DailyUsageImpl instance) =>
    <String, dynamic>{
      'childId': instance.childId,
      'date': instance.date.toIso8601String(),
      'totalMinutes': instance.totalMinutes,
      'activeMinutes': instance.activeMinutes,
      'idleMinutes': instance.idleMinutes,
      'sessions': instance.sessions,
      'subjectBreakdown': instance.subjectBreakdown,
      'lessonsStarted': instance.lessonsStarted,
      'lessonsCompleted': instance.lessonsCompleted,
      'averageEngagement': instance.averageEngagement,
    };

_$UsageSessionImpl _$$UsageSessionImplFromJson(Map<String, dynamic> json) =>
    _$UsageSessionImpl(
      id: json['id'] as String,
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: json['endTime'] == null
          ? null
          : DateTime.parse(json['endTime'] as String),
      durationMinutes: (json['durationMinutes'] as num).toInt(),
      subject: json['subject'] as String,
      activityType: json['activityType'] as String,
      engagementScore: (json['engagementScore'] as num).toDouble(),
      lessonId: json['lessonId'] as String?,
      lessonTitle: json['lessonTitle'] as String?,
    );

Map<String, dynamic> _$$UsageSessionImplToJson(_$UsageSessionImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'startTime': instance.startTime.toIso8601String(),
      'endTime': instance.endTime?.toIso8601String(),
      'durationMinutes': instance.durationMinutes,
      'subject': instance.subject,
      'activityType': instance.activityType,
      'engagementScore': instance.engagementScore,
      'lessonId': instance.lessonId,
      'lessonTitle': instance.lessonTitle,
    };

_$UsageSummaryImpl _$$UsageSummaryImplFromJson(Map<String, dynamic> json) =>
    _$UsageSummaryImpl(
      childId: json['childId'] as String,
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: DateTime.parse(json['endDate'] as String),
      totalMinutes: (json['totalMinutes'] as num).toInt(),
      averageDailyMinutes: (json['averageDailyMinutes'] as num).toInt(),
      totalLessons: (json['totalLessons'] as num).toInt(),
      subjectTotals: Map<String, int>.from(json['subjectTotals'] as Map),
      dailyData: (json['dailyData'] as List<dynamic>)
          .map((e) => DailyUsage.fromJson(e as Map<String, dynamic>))
          .toList(),
      engagementTrend: (json['engagementTrend'] as num).toDouble(),
    );

Map<String, dynamic> _$$UsageSummaryImplToJson(_$UsageSummaryImpl instance) =>
    <String, dynamic>{
      'childId': instance.childId,
      'startDate': instance.startDate.toIso8601String(),
      'endDate': instance.endDate.toIso8601String(),
      'totalMinutes': instance.totalMinutes,
      'averageDailyMinutes': instance.averageDailyMinutes,
      'totalLessons': instance.totalLessons,
      'subjectTotals': instance.subjectTotals,
      'dailyData': instance.dailyData,
      'engagementTrend': instance.engagementTrend,
    };

_$ScreenTimeSettingsImpl _$$ScreenTimeSettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$ScreenTimeSettingsImpl(
      childId: json['childId'] as String,
      isEnabled: json['isEnabled'] as bool? ?? true,
      dailyLimitMinutes: (json['dailyLimitMinutes'] as num?)?.toInt() ?? 120,
      sessionLimitMinutes: (json['sessionLimitMinutes'] as num?)?.toInt() ?? 30,
      breakDurationMinutes:
          (json['breakDurationMinutes'] as num?)?.toInt() ?? 5,
      enforceBreaks: json['enforceBreaks'] as bool? ?? true,
      schedules: (json['schedules'] as List<dynamic>)
          .map((e) => ScreenTimeSchedule.fromJson(e as Map<String, dynamic>))
          .toList(),
      notifyOnLimitReached: json['notifyOnLimitReached'] as bool? ?? true,
      notifyOnBreakTime: json['notifyOnBreakTime'] as bool? ?? true,
      warningMinutesBefore:
          (json['warningMinutesBefore'] as num?)?.toInt() ?? 15,
      allowedExtensions: (json['allowedExtensions'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$ScreenTimeSettingsImplToJson(
        _$ScreenTimeSettingsImpl instance) =>
    <String, dynamic>{
      'childId': instance.childId,
      'isEnabled': instance.isEnabled,
      'dailyLimitMinutes': instance.dailyLimitMinutes,
      'sessionLimitMinutes': instance.sessionLimitMinutes,
      'breakDurationMinutes': instance.breakDurationMinutes,
      'enforceBreaks': instance.enforceBreaks,
      'schedules': instance.schedules,
      'notifyOnLimitReached': instance.notifyOnLimitReached,
      'notifyOnBreakTime': instance.notifyOnBreakTime,
      'warningMinutesBefore': instance.warningMinutesBefore,
      'allowedExtensions': instance.allowedExtensions,
    };

_$ScreenTimeScheduleImpl _$$ScreenTimeScheduleImplFromJson(
        Map<String, dynamic> json) =>
    _$ScreenTimeScheduleImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      daysOfWeek: (json['daysOfWeek'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      startTime: json['startTime'] as String,
      endTime: json['endTime'] as String,
      isActive: json['isActive'] as bool? ?? true,
    );

Map<String, dynamic> _$$ScreenTimeScheduleImplToJson(
        _$ScreenTimeScheduleImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'daysOfWeek': instance.daysOfWeek,
      'startTime': instance.startTime,
      'endTime': instance.endTime,
      'isActive': instance.isActive,
    };

_$ScreenTimeStatusImpl _$$ScreenTimeStatusImplFromJson(
        Map<String, dynamic> json) =>
    _$ScreenTimeStatusImpl(
      childId: json['childId'] as String,
      isWithinSchedule: json['isWithinSchedule'] as bool,
      usedMinutesToday: (json['usedMinutesToday'] as num).toInt(),
      remainingMinutes: (json['remainingMinutes'] as num).toInt(),
      currentSessionMinutes: (json['currentSessionMinutes'] as num).toInt(),
      nextBreakTime: json['nextBreakTime'] == null
          ? null
          : DateTime.parse(json['nextBreakTime'] as String),
      isOnBreak: json['isOnBreak'] as bool,
      level: $enumDecode(_$ScreenTimeStatusLevelEnumMap, json['level']),
    );

Map<String, dynamic> _$$ScreenTimeStatusImplToJson(
        _$ScreenTimeStatusImpl instance) =>
    <String, dynamic>{
      'childId': instance.childId,
      'isWithinSchedule': instance.isWithinSchedule,
      'usedMinutesToday': instance.usedMinutesToday,
      'remainingMinutes': instance.remainingMinutes,
      'currentSessionMinutes': instance.currentSessionMinutes,
      'nextBreakTime': instance.nextBreakTime?.toIso8601String(),
      'isOnBreak': instance.isOnBreak,
      'level': _$ScreenTimeStatusLevelEnumMap[instance.level]!,
    };

const _$ScreenTimeStatusLevelEnumMap = {
  ScreenTimeStatusLevel.good: 'GOOD',
  ScreenTimeStatusLevel.warning: 'WARNING',
  ScreenTimeStatusLevel.limitReached: 'LIMIT_REACHED',
  ScreenTimeStatusLevel.outsideSchedule: 'OUTSIDE_SCHEDULE',
};

_$EngagementMilestoneImpl _$$EngagementMilestoneImplFromJson(
        Map<String, dynamic> json) =>
    _$EngagementMilestoneImpl(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      type: $enumDecode(_$MilestoneTypeEnumMap, json['type']),
      requirement: (json['requirement'] as num).toInt(),
      progress: (json['progress'] as num).toInt(),
      isAchieved: json['isAchieved'] as bool,
      achievedAt: json['achievedAt'] == null
          ? null
          : DateTime.parse(json['achievedAt'] as String),
      iconUrl: json['iconUrl'] as String?,
      rewardDescription: json['rewardDescription'] as String?,
    );

Map<String, dynamic> _$$EngagementMilestoneImplToJson(
        _$EngagementMilestoneImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'description': instance.description,
      'type': _$MilestoneTypeEnumMap[instance.type]!,
      'requirement': instance.requirement,
      'progress': instance.progress,
      'isAchieved': instance.isAchieved,
      'achievedAt': instance.achievedAt?.toIso8601String(),
      'iconUrl': instance.iconUrl,
      'rewardDescription': instance.rewardDescription,
    };

const _$MilestoneTypeEnumMap = {
  MilestoneType.streak: 'STREAK',
  MilestoneType.totalMinutes: 'TOTAL_MINUTES',
  MilestoneType.lessonsCompleted: 'LESSONS_COMPLETED',
  MilestoneType.weeklyGoal: 'WEEKLY_GOAL',
  MilestoneType.subjectsExplored: 'SUBJECTS_EXPLORED',
};

_$WeeklyEngagementReportImpl _$$WeeklyEngagementReportImplFromJson(
        Map<String, dynamic> json) =>
    _$WeeklyEngagementReportImpl(
      childId: json['childId'] as String,
      weekStartDate: DateTime.parse(json['weekStartDate'] as String),
      totalMinutes: (json['totalMinutes'] as num).toInt(),
      daysActive: (json['daysActive'] as num).toInt(),
      lessonsCompleted: (json['lessonsCompleted'] as num).toInt(),
      averageEngagement: (json['averageEngagement'] as num).toDouble(),
      topSubject: json['topSubject'] as String,
      newMilestones: (json['newMilestones'] as List<dynamic>)
          .map((e) => EngagementMilestone.fromJson(e as Map<String, dynamic>))
          .toList(),
      summary: json['summary'] as String,
      insights:
          (json['insights'] as List<dynamic>).map((e) => e as String).toList(),
    );

Map<String, dynamic> _$$WeeklyEngagementReportImplToJson(
        _$WeeklyEngagementReportImpl instance) =>
    <String, dynamic>{
      'childId': instance.childId,
      'weekStartDate': instance.weekStartDate.toIso8601String(),
      'totalMinutes': instance.totalMinutes,
      'daysActive': instance.daysActive,
      'lessonsCompleted': instance.lessonsCompleted,
      'averageEngagement': instance.averageEngagement,
      'topSubject': instance.topSubject,
      'newMilestones': instance.newMilestones,
      'summary': instance.summary,
      'insights': instance.insights,
    };
