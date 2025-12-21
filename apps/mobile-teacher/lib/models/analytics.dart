/// Analytics Models
///
/// Models for analytics and reporting.
library;

import 'package:flutter/foundation.dart';

import 'iep_goal.dart';

/// Class-level metrics.
@immutable
class ClassMetrics {
  const ClassMetrics({
    required this.classId,
    required this.period,
    required this.totalStudents,
    required this.activeStudents,
    required this.averageEngagement,
    required this.averageProgress,
    required this.sessionsCompleted,
    required this.totalSessionMinutes,
    required this.goalsOnTrack,
    required this.goalsAtRisk,
    this.topPerformers = const [],
    this.needsAttention = const [],
  });

  final String classId;
  final DateRange period;
  final int totalStudents;
  final int activeStudents;
  final double averageEngagement; // 0.0 to 1.0
  final double averageProgress; // 0.0 to 1.0
  final int sessionsCompleted;
  final int totalSessionMinutes;
  final int goalsOnTrack;
  final int goalsAtRisk;
  final List<String> topPerformers;
  final List<String> needsAttention;

  double get participationRate =>
      totalStudents > 0 ? activeStudents / totalStudents : 0;

  factory ClassMetrics.fromJson(Map<String, dynamic> json) {
    return ClassMetrics(
      classId: json['classId'] as String,
      period: DateRange.fromJson(json['period'] as Map<String, dynamic>),
      totalStudents: json['totalStudents'] as int,
      activeStudents: json['activeStudents'] as int,
      averageEngagement: (json['averageEngagement'] as num).toDouble(),
      averageProgress: (json['averageProgress'] as num).toDouble(),
      sessionsCompleted: json['sessionsCompleted'] as int,
      totalSessionMinutes: json['totalSessionMinutes'] as int,
      goalsOnTrack: json['goalsOnTrack'] as int,
      goalsAtRisk: json['goalsAtRisk'] as int,
      topPerformers: (json['topPerformers'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      needsAttention: (json['needsAttention'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }
}

/// Individual student trends.
@immutable
class StudentTrends {
  const StudentTrends({
    required this.studentId,
    required this.period,
    required this.sessionsCompleted,
    required this.totalMinutes,
    required this.averageSessionLength,
    required this.engagementTrend,
    required this.progressTrend,
    required this.strengthAreas,
    required this.growthAreas,
    required this.weeklyData,
  });

  final String studentId;
  final DateRange period;
  final int sessionsCompleted;
  final int totalMinutes;
  final double averageSessionLength;
  final TrendDirection engagementTrend;
  final TrendDirection progressTrend;
  final List<String> strengthAreas;
  final List<String> growthAreas;
  final List<WeeklyDataPoint> weeklyData;

  factory StudentTrends.fromJson(Map<String, dynamic> json) {
    return StudentTrends(
      studentId: json['studentId'] as String,
      period: DateRange.fromJson(json['period'] as Map<String, dynamic>),
      sessionsCompleted: json['sessionsCompleted'] as int,
      totalMinutes: json['totalMinutes'] as int,
      averageSessionLength: (json['averageSessionLength'] as num).toDouble(),
      engagementTrend: TrendDirection.values.firstWhere(
        (e) => e.name == json['engagementTrend'],
        orElse: () => TrendDirection.stable,
      ),
      progressTrend: TrendDirection.values.firstWhere(
        (e) => e.name == json['progressTrend'],
        orElse: () => TrendDirection.stable,
      ),
      strengthAreas: (json['strengthAreas'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      growthAreas: (json['growthAreas'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      weeklyData: (json['weeklyData'] as List<dynamic>)
          .map((e) => WeeklyDataPoint.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Trend direction.
enum TrendDirection {
  increasing,
  stable,
  decreasing,
}

/// Weekly data point for charts.
@immutable
class WeeklyDataPoint {
  const WeeklyDataPoint({
    required this.weekStart,
    required this.engagement,
    required this.progress,
    required this.sessions,
    required this.minutes,
  });

  final DateTime weekStart;
  final double engagement;
  final double progress;
  final int sessions;
  final int minutes;

  factory WeeklyDataPoint.fromJson(Map<String, dynamic> json) {
    return WeeklyDataPoint(
      weekStart: DateTime.parse(json['weekStart'] as String),
      engagement: (json['engagement'] as num).toDouble(),
      progress: (json['progress'] as num).toDouble(),
      sessions: json['sessions'] as int,
      minutes: json['minutes'] as int,
    );
  }
}

/// Engagement heatmap data.
@immutable
class EngagementHeatmap {
  const EngagementHeatmap({
    required this.classId,
    required this.data,
  });

  final String classId;
  final List<HeatmapCell> data;

  factory EngagementHeatmap.fromJson(Map<String, dynamic> json) {
    return EngagementHeatmap(
      classId: json['classId'] as String,
      data: (json['data'] as List<dynamic>)
          .map((e) => HeatmapCell.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Heatmap cell.
@immutable
class HeatmapCell {
  const HeatmapCell({
    required this.dayOfWeek,
    required this.hour,
    required this.value,
    this.studentCount,
  });

  final int dayOfWeek; // 1 = Monday
  final int hour; // 0-23
  final double value; // 0.0 to 1.0
  final int? studentCount;

  factory HeatmapCell.fromJson(Map<String, dynamic> json) {
    return HeatmapCell(
      dayOfWeek: json['dayOfWeek'] as int,
      hour: json['hour'] as int,
      value: (json['value'] as num).toDouble(),
      studentCount: json['studentCount'] as int?,
    );
  }
}

/// Goal progress summary for class.
@immutable
class GoalProgressSummary {
  const GoalProgressSummary({
    required this.classId,
    required this.totalGoals,
    required this.onTrack,
    required this.atRisk,
    required this.achieved,
    required this.byCategory,
  });

  final String classId;
  final int totalGoals;
  final int onTrack;
  final int atRisk;
  final int achieved;
  final Map<String, CategoryProgress> byCategory;

  factory GoalProgressSummary.fromJson(Map<String, dynamic> json) {
    return GoalProgressSummary(
      classId: json['classId'] as String,
      totalGoals: json['totalGoals'] as int,
      onTrack: json['onTrack'] as int,
      atRisk: json['atRisk'] as int,
      achieved: json['achieved'] as int,
      byCategory: (json['byCategory'] as Map<String, dynamic>).map(
        (key, value) =>
            MapEntry(key, CategoryProgress.fromJson(value as Map<String, dynamic>)),
      ),
    );
  }
}

/// Progress for a category.
@immutable
class CategoryProgress {
  const CategoryProgress({
    required this.category,
    required this.total,
    required this.averageProgress,
    required this.onTrack,
    required this.atRisk,
  });

  final String category;
  final int total;
  final double averageProgress;
  final int onTrack;
  final int atRisk;

  factory CategoryProgress.fromJson(Map<String, dynamic> json) {
    return CategoryProgress(
      category: json['category'] as String,
      total: json['total'] as int,
      averageProgress: (json['averageProgress'] as num).toDouble(),
      onTrack: json['onTrack'] as int,
      atRisk: json['atRisk'] as int,
    );
  }
}

/// Student alert.
@immutable
class StudentAlert {
  const StudentAlert({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.type,
    required this.severity,
    required this.message,
    required this.createdAt,
    this.isRead = false,
    this.actionTaken,
    this.relatedGoalId,
  });

  final String id;
  final String studentId;
  final String studentName;
  final AlertType type;
  final AlertSeverity severity;
  final String message;
  final DateTime createdAt;
  final bool isRead;
  final String? actionTaken;
  final String? relatedGoalId;

  factory StudentAlert.fromJson(Map<String, dynamic> json) {
    return StudentAlert(
      id: json['id'] as String,
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      type: AlertType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => AlertType.other,
      ),
      severity: AlertSeverity.values.firstWhere(
        (e) => e.name == json['severity'],
        orElse: () => AlertSeverity.low,
      ),
      message: json['message'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      isRead: json['isRead'] as bool? ?? false,
      actionTaken: json['actionTaken'] as String?,
      relatedGoalId: json['relatedGoalId'] as String?,
    );
  }
}

/// Alert type.
enum AlertType {
  lowEngagement,
  goalAtRisk,
  missedSessions,
  behaviorConcern,
  progressDecline,
  iepDeadline,
  other,
}

/// Alert severity.
enum AlertSeverity {
  low,
  medium,
  high,
  critical,
}

/// Activity recommendation.
@immutable
class ActivityRecommendation {
  const ActivityRecommendation({
    required this.id,
    required this.name,
    required this.type,
    required this.description,
    required this.durationMinutes,
    required this.relevanceScore,
    this.contentId,
    this.targetSkills = const [],
    this.rationale,
  });

  final String id;
  final String name;
  final String type;
  final String description;
  final int durationMinutes;
  final double relevanceScore;
  final String? contentId;
  final List<String> targetSkills;
  final String? rationale;

  factory ActivityRecommendation.fromJson(Map<String, dynamic> json) {
    return ActivityRecommendation(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      description: json['description'] as String,
      durationMinutes: json['durationMinutes'] as int,
      relevanceScore: (json['relevanceScore'] as num).toDouble(),
      contentId: json['contentId'] as String?,
      targetSkills: (json['targetSkills'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      rationale: json['rationale'] as String?,
    );
  }
}

/// Session plan.
@immutable
class SessionPlan {
  const SessionPlan({
    required this.id,
    required this.name,
    required this.activities,
    required this.totalDuration,
    this.objectives = const [],
    this.notes,
  });

  final String id;
  final String name;
  final List<PlannedActivity> activities;
  final int totalDuration;
  final List<String> objectives;
  final String? notes;

  factory SessionPlan.fromJson(Map<String, dynamic> json) {
    return SessionPlan(
      id: json['id'] as String,
      name: json['name'] as String,
      activities: (json['activities'] as List<dynamic>)
          .map((e) => PlannedActivity.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalDuration: json['totalDuration'] as int,
      objectives: (json['objectives'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      notes: json['notes'] as String?,
    );
  }
}

/// Planned activity.
@immutable
class PlannedActivity {
  const PlannedActivity({
    required this.id,
    required this.name,
    required this.type,
    required this.durationMinutes,
    required this.order,
    this.contentId,
    this.notes,
  });

  final String id;
  final String name;
  final String type;
  final int durationMinutes;
  final int order;
  final String? contentId;
  final String? notes;

  factory PlannedActivity.fromJson(Map<String, dynamic> json) {
    return PlannedActivity(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      durationMinutes: json['durationMinutes'] as int,
      order: json['order'] as int,
      contentId: json['contentId'] as String?,
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'durationMinutes': durationMinutes,
      'order': order,
      'contentId': contentId,
      'notes': notes,
    };
  }
}

/// Session template.
@immutable
class SessionTemplate {
  const SessionTemplate({
    required this.id,
    required this.name,
    required this.description,
    required this.activities,
    required this.totalDuration,
    this.subject,
    this.gradeLevel,
    this.tags = const [],
  });

  final String id;
  final String name;
  final String description;
  final List<PlannedActivity> activities;
  final int totalDuration;
  final String? subject;
  final int? gradeLevel;
  final List<String> tags;

  factory SessionTemplate.fromJson(Map<String, dynamic> json) {
    return SessionTemplate(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      activities: (json['activities'] as List<dynamic>)
          .map((e) => PlannedActivity.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalDuration: json['totalDuration'] as int,
      subject: json['subject'] as String?,
      gradeLevel: json['gradeLevel'] as int?,
      tags: (json['tags'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }
}

/// Scheduled session.
@immutable
class ScheduledSession {
  const ScheduledSession({
    required this.id,
    required this.classId,
    required this.scheduledAt,
    required this.durationMinutes,
    this.title,
    this.planId,
    this.studentIds = const [],
    this.recurrence,
  });

  final String id;
  final String classId;
  final DateTime scheduledAt;
  final int durationMinutes;
  final String? title;
  final String? planId;
  final List<String> studentIds;
  final String? recurrence;

  factory ScheduledSession.fromJson(Map<String, dynamic> json) {
    return ScheduledSession(
      id: json['id'] as String,
      classId: json['classId'] as String,
      scheduledAt: DateTime.parse(json['scheduledAt'] as String),
      durationMinutes: json['durationMinutes'] as int,
      title: json['title'] as String?,
      planId: json['planId'] as String?,
      studentIds: (json['studentIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      recurrence: json['recurrence'] as String?,
    );
  }
}

/// DTO for creating a session plan.
class CreateSessionPlanDto {
  const CreateSessionPlanDto({
    required this.name,
    required this.activities,
    this.objectives = const [],
    this.notes,
  });

  final String name;
  final List<PlannedActivity> activities;
  final List<String> objectives;
  final String? notes;

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'activities': activities.map((e) => e.toJson()).toList(),
      'objectives': objectives,
      'notes': notes,
    };
  }
}

/// DTO for scheduling a session.
class ScheduleSessionDto {
  const ScheduleSessionDto({
    required this.classId,
    required this.scheduledAt,
    required this.durationMinutes,
    this.title,
    this.planId,
    this.studentIds = const [],
    this.recurrence,
  });

  final String classId;
  final DateTime scheduledAt;
  final int durationMinutes;
  final String? title;
  final String? planId;
  final List<String> studentIds;
  final String? recurrence;

  Map<String, dynamic> toJson() {
    return {
      'classId': classId,
      'scheduledAt': scheduledAt.toIso8601String(),
      'durationMinutes': durationMinutes,
      'title': title,
      'planId': planId,
      'studentIds': studentIds,
      'recurrence': recurrence,
    };
  }
}
