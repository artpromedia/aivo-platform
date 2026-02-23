/// Analytics Models
///
/// Models for analytics and reporting.
library;

import 'package:flutter/foundation.dart';

import 'iep_goal.dart';

// =============================================================================
// ANALYTICS PERIOD
// =============================================================================

/// Time period for analytics data.
enum AnalyticsPeriod {
  day('day', 'Today'),
  week('week', 'This Week'),
  month('month', 'This Month'),
  semester('semester', 'This Semester'),
  year('year', 'This Year'),
  custom('custom', 'Custom Range');

  const AnalyticsPeriod(this.value, this.label);
  final String value;
  final String label;

  static AnalyticsPeriod fromString(String value) {
    return AnalyticsPeriod.values.firstWhere(
      (p) => p.value == value,
      orElse: () => AnalyticsPeriod.week,
    );
  }

  DateRange getDateRange() {
    final now = DateTime.now();
    switch (this) {
      case AnalyticsPeriod.day:
        return DateRange(
          start: DateTime(now.year, now.month, now.day),
          end: now,
        );
      case AnalyticsPeriod.week:
        final weekStart = now.subtract(Duration(days: now.weekday - 1));
        return DateRange(
          start: DateTime(weekStart.year, weekStart.month, weekStart.day),
          end: now,
        );
      case AnalyticsPeriod.month:
        return DateRange(
          start: DateTime(now.year, now.month, 1),
          end: now,
        );
      case AnalyticsPeriod.semester:
        final semesterStart = now.month >= 8
            ? DateTime(now.year, 8, 1)
            : DateTime(now.year, 1, 1);
        return DateRange(start: semesterStart, end: now);
      case AnalyticsPeriod.year:
        return DateRange(
          start: DateTime(now.year, 1, 1),
          end: now,
        );
      case AnalyticsPeriod.custom:
        // Return last 30 days by default for custom
        return DateRange(
          start: now.subtract(const Duration(days: 30)),
          end: now,
        );
    }
  }
}

// =============================================================================
// TIME SERIES DATA
// =============================================================================

/// Single data point in a time series.
@immutable
class TimeSeriesDataPoint {
  const TimeSeriesDataPoint({
    required this.timestamp,
    required this.value,
    this.label,
    this.metadata,
  });

  final DateTime timestamp;
  final double value;
  final String? label;
  final Map<String, dynamic>? metadata;

  factory TimeSeriesDataPoint.fromJson(Map<String, dynamic> json) {
    return TimeSeriesDataPoint(
      timestamp: DateTime.parse(json['timestamp'] as String),
      value: (json['value'] as num).toDouble(),
      label: json['label'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() => {
        'timestamp': timestamp.toIso8601String(),
        'value': value,
        if (label != null) 'label': label,
        if (metadata != null) 'metadata': metadata,
      };
}

// =============================================================================
// PERFORMANCE METRIC
// =============================================================================

/// A single performance metric with trend data.
@immutable
class PerformanceMetric {
  const PerformanceMetric({
    required this.metricName,
    required this.value,
    required this.unit,
    this.change,
    this.changePercent,
    this.trend = TrendDirection.stable,
    this.trendData = const [],
    this.target,
    this.description,
  });

  final String metricName;
  final double value;
  final String unit;
  final double? change;
  final double? changePercent;
  final TrendDirection trend;
  final List<TimeSeriesDataPoint> trendData;
  final double? target;
  final String? description;

  /// Whether target is met
  bool get isTargetMet => target != null && value >= target!;

  /// Progress towards target (0.0 to 1.0+)
  double get targetProgress => target != null && target! > 0 ? value / target! : 0;

  factory PerformanceMetric.fromJson(Map<String, dynamic> json) {
    return PerformanceMetric(
      metricName: json['metricName'] as String,
      value: (json['value'] as num).toDouble(),
      unit: json['unit'] as String? ?? '',
      change: (json['change'] as num?)?.toDouble(),
      changePercent: (json['changePercent'] as num?)?.toDouble(),
      trend: TrendDirection.values.firstWhere(
        (t) => t.name == json['trend'],
        orElse: () => TrendDirection.stable,
      ),
      trendData: (json['trendData'] as List<dynamic>?)
              ?.map((e) => TimeSeriesDataPoint.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      target: (json['target'] as num?)?.toDouble(),
      description: json['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'metricName': metricName,
        'value': value,
        'unit': unit,
        if (change != null) 'change': change,
        if (changePercent != null) 'changePercent': changePercent,
        'trend': trend.name,
        'trendData': trendData.map((e) => e.toJson()).toList(),
        if (target != null) 'target': target,
        if (description != null) 'description': description,
      };
}

// =============================================================================
// SUBJECT PERFORMANCE
// =============================================================================

/// Performance data for a specific subject.
@immutable
class SubjectPerformance {
  const SubjectPerformance({
    required this.subjectId,
    required this.subjectName,
    required this.averageScore,
    required this.totalStudents,
    required this.passingCount,
    required this.assignmentsCompleted,
    required this.totalAssignments,
    this.trend = TrendDirection.stable,
    this.color,
    this.iconName,
    this.recentScores = const [],
  });

  final String subjectId;
  final String subjectName;
  final double averageScore;
  final int totalStudents;
  final int passingCount;
  final int assignmentsCompleted;
  final int totalAssignments;
  final TrendDirection trend;
  final String? color;
  final String? iconName;
  final List<TimeSeriesDataPoint> recentScores;

  double get passingRate => totalStudents > 0 ? passingCount / totalStudents : 0;
  double get completionRate =>
      totalAssignments > 0 ? assignmentsCompleted / totalAssignments : 0;

  factory SubjectPerformance.fromJson(Map<String, dynamic> json) {
    return SubjectPerformance(
      subjectId: json['subjectId'] as String,
      subjectName: json['subjectName'] as String,
      averageScore: (json['averageScore'] as num).toDouble(),
      totalStudents: json['totalStudents'] as int? ?? 0,
      passingCount: json['passingCount'] as int? ?? 0,
      assignmentsCompleted: json['assignmentsCompleted'] as int? ?? 0,
      totalAssignments: json['totalAssignments'] as int? ?? 0,
      trend: TrendDirection.values.firstWhere(
        (t) => t.name == json['trend'],
        orElse: () => TrendDirection.stable,
      ),
      color: json['color'] as String?,
      iconName: json['iconName'] as String?,
      recentScores: (json['recentScores'] as List<dynamic>?)
              ?.map((e) => TimeSeriesDataPoint.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'subjectId': subjectId,
        'subjectName': subjectName,
        'averageScore': averageScore,
        'totalStudents': totalStudents,
        'passingCount': passingCount,
        'assignmentsCompleted': assignmentsCompleted,
        'totalAssignments': totalAssignments,
        'trend': trend.name,
        if (color != null) 'color': color,
        if (iconName != null) 'iconName': iconName,
        'recentScores': recentScores.map((e) => e.toJson()).toList(),
      };
}

// =============================================================================
// COMPLETION METRICS
// =============================================================================

/// Completion and engagement metrics.
@immutable
class CompletionMetrics {
  const CompletionMetrics({
    required this.assignmentCompletionRate,
    required this.assessmentCompletionRate,
    required this.onTimeSubmissionRate,
    required this.averageGrade,
    required this.totalAssignments,
    required this.completedAssignments,
    required this.totalAssessments,
    required this.completedAssessments,
    required this.overdueCount,
    this.weeklyCompletions = const [],
  });

  final double assignmentCompletionRate;
  final double assessmentCompletionRate;
  final double onTimeSubmissionRate;
  final double averageGrade;
  final int totalAssignments;
  final int completedAssignments;
  final int totalAssessments;
  final int completedAssessments;
  final int overdueCount;
  final List<TimeSeriesDataPoint> weeklyCompletions;

  double get overallCompletionRate {
    final total = totalAssignments + totalAssessments;
    final completed = completedAssignments + completedAssessments;
    return total > 0 ? completed / total : 0;
  }

  factory CompletionMetrics.fromJson(Map<String, dynamic> json) {
    return CompletionMetrics(
      assignmentCompletionRate:
          (json['assignmentCompletionRate'] as num).toDouble(),
      assessmentCompletionRate:
          (json['assessmentCompletionRate'] as num).toDouble(),
      onTimeSubmissionRate: (json['onTimeSubmissionRate'] as num).toDouble(),
      averageGrade: (json['averageGrade'] as num).toDouble(),
      totalAssignments: json['totalAssignments'] as int? ?? 0,
      completedAssignments: json['completedAssignments'] as int? ?? 0,
      totalAssessments: json['totalAssessments'] as int? ?? 0,
      completedAssessments: json['completedAssessments'] as int? ?? 0,
      overdueCount: json['overdueCount'] as int? ?? 0,
      weeklyCompletions: (json['weeklyCompletions'] as List<dynamic>?)
              ?.map((e) => TimeSeriesDataPoint.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'assignmentCompletionRate': assignmentCompletionRate,
        'assessmentCompletionRate': assessmentCompletionRate,
        'onTimeSubmissionRate': onTimeSubmissionRate,
        'averageGrade': averageGrade,
        'totalAssignments': totalAssignments,
        'completedAssignments': completedAssignments,
        'totalAssessments': totalAssessments,
        'completedAssessments': completedAssessments,
        'overdueCount': overdueCount,
        'weeklyCompletions': weeklyCompletions.map((e) => e.toJson()).toList(),
      };
}

// =============================================================================
// STUDENT ANALYTICS PROFILE
// =============================================================================

/// Comprehensive analytics profile for a student.
@immutable
class StudentAnalyticsProfile {
  const StudentAnalyticsProfile({
    required this.studentId,
    required this.studentName,
    required this.overallGrade,
    required this.gradeLevel,
    required this.engagementScore,
    required this.attendanceRate,
    required this.completionMetrics,
    required this.subjectPerformances,
    required this.recentActivity,
    required this.strengthAreas,
    required this.improvementAreas,
    this.avatarUrl,
    this.rank,
    this.totalStudentsInClass,
    this.trend = TrendDirection.stable,
    this.riskLevel,
    this.lastActive,
  });

  final String studentId;
  final String studentName;
  final double overallGrade;
  final int gradeLevel;
  final double engagementScore;
  final double attendanceRate;
  final CompletionMetrics completionMetrics;
  final List<SubjectPerformance> subjectPerformances;
  final List<TimeSeriesDataPoint> recentActivity;
  final List<String> strengthAreas;
  final List<String> improvementAreas;
  final String? avatarUrl;
  final int? rank;
  final int? totalStudentsInClass;
  final TrendDirection trend;
  final String? riskLevel;
  final DateTime? lastActive;

  /// Letter grade
  String get letterGrade {
    if (overallGrade >= 90) return 'A';
    if (overallGrade >= 80) return 'B';
    if (overallGrade >= 70) return 'C';
    if (overallGrade >= 60) return 'D';
    return 'F';
  }

  factory StudentAnalyticsProfile.fromJson(Map<String, dynamic> json) {
    return StudentAnalyticsProfile(
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      overallGrade: (json['overallGrade'] as num).toDouble(),
      gradeLevel: json['gradeLevel'] as int? ?? 0,
      engagementScore: (json['engagementScore'] as num?)?.toDouble() ?? 0,
      attendanceRate: (json['attendanceRate'] as num?)?.toDouble() ?? 0,
      completionMetrics: CompletionMetrics.fromJson(
          json['completionMetrics'] as Map<String, dynamic>),
      subjectPerformances: (json['subjectPerformances'] as List<dynamic>?)
              ?.map((e) => SubjectPerformance.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      recentActivity: (json['recentActivity'] as List<dynamic>?)
              ?.map((e) => TimeSeriesDataPoint.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      strengthAreas: (json['strengthAreas'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      improvementAreas: (json['improvementAreas'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      avatarUrl: json['avatarUrl'] as String?,
      rank: json['rank'] as int?,
      totalStudentsInClass: json['totalStudentsInClass'] as int?,
      trend: TrendDirection.values.firstWhere(
        (t) => t.name == json['trend'],
        orElse: () => TrendDirection.stable,
      ),
      riskLevel: json['riskLevel'] as String?,
      lastActive: json['lastActive'] != null
          ? DateTime.tryParse(json['lastActive'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'studentId': studentId,
        'studentName': studentName,
        'overallGrade': overallGrade,
        'gradeLevel': gradeLevel,
        'engagementScore': engagementScore,
        'attendanceRate': attendanceRate,
        'completionMetrics': completionMetrics.toJson(),
        'subjectPerformances':
            subjectPerformances.map((e) => e.toJson()).toList(),
        'recentActivity': recentActivity.map((e) => e.toJson()).toList(),
        'strengthAreas': strengthAreas,
        'improvementAreas': improvementAreas,
        if (avatarUrl != null) 'avatarUrl': avatarUrl,
        if (rank != null) 'rank': rank,
        if (totalStudentsInClass != null)
          'totalStudentsInClass': totalStudentsInClass,
        'trend': trend.name,
        if (riskLevel != null) 'riskLevel': riskLevel,
        if (lastActive != null) 'lastActive': lastActive!.toIso8601String(),
      };
}

// =============================================================================
// CLASS ANALYTICS
// =============================================================================

/// Comprehensive analytics for a class.
@immutable
class ClassAnalytics {
  const ClassAnalytics({
    required this.classId,
    required this.className,
    required this.period,
    required this.overallPerformance,
    required this.trendDirection,
    required this.totalStudents,
    required this.activeStudents,
    required this.averageGrade,
    required this.completionMetrics,
    required this.subjectBreakdown,
    required this.performanceTrend,
    required this.topStudents,
    required this.strugglingStudents,
    this.engagementMetrics,
    this.insights = const [],
    this.lastUpdated,
  });

  final String classId;
  final String className;
  final AnalyticsPeriod period;
  final double overallPerformance;
  final TrendDirection trendDirection;
  final int totalStudents;
  final int activeStudents;
  final double averageGrade;
  final CompletionMetrics completionMetrics;
  final List<SubjectPerformance> subjectBreakdown;
  final List<TimeSeriesDataPoint> performanceTrend;
  final List<StudentAnalyticsProfile> topStudents;
  final List<StudentAnalyticsProfile> strugglingStudents;
  final EngagementMetrics? engagementMetrics;
  final List<AnalyticsInsight> insights;
  final DateTime? lastUpdated;

  double get participationRate =>
      totalStudents > 0 ? activeStudents / totalStudents : 0;

  factory ClassAnalytics.fromJson(Map<String, dynamic> json) {
    return ClassAnalytics(
      classId: json['classId'] as String,
      className: json['className'] as String? ?? '',
      period: AnalyticsPeriod.fromString(json['period'] as String? ?? 'week'),
      overallPerformance: (json['overallPerformance'] as num?)?.toDouble() ?? 0,
      trendDirection: TrendDirection.values.firstWhere(
        (t) => t.name == json['trendDirection'],
        orElse: () => TrendDirection.stable,
      ),
      totalStudents: json['totalStudents'] as int? ?? 0,
      activeStudents: json['activeStudents'] as int? ?? 0,
      averageGrade: (json['averageGrade'] as num?)?.toDouble() ?? 0,
      completionMetrics: json['completionMetrics'] != null
          ? CompletionMetrics.fromJson(
              json['completionMetrics'] as Map<String, dynamic>)
          : const CompletionMetrics(
              assignmentCompletionRate: 0,
              assessmentCompletionRate: 0,
              onTimeSubmissionRate: 0,
              averageGrade: 0,
              totalAssignments: 0,
              completedAssignments: 0,
              totalAssessments: 0,
              completedAssessments: 0,
              overdueCount: 0,
            ),
      subjectBreakdown: (json['subjectBreakdown'] as List<dynamic>?)
              ?.map((e) => SubjectPerformance.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      performanceTrend: (json['performanceTrend'] as List<dynamic>?)
              ?.map((e) => TimeSeriesDataPoint.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      topStudents: (json['topStudents'] as List<dynamic>?)
              ?.map(
                  (e) => StudentAnalyticsProfile.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      strugglingStudents: (json['strugglingStudents'] as List<dynamic>?)
              ?.map(
                  (e) => StudentAnalyticsProfile.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      engagementMetrics: json['engagementMetrics'] != null
          ? EngagementMetrics.fromJson(
              json['engagementMetrics'] as Map<String, dynamic>)
          : null,
      insights: (json['insights'] as List<dynamic>?)
              ?.map((e) => AnalyticsInsight.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      lastUpdated: json['lastUpdated'] != null
          ? DateTime.tryParse(json['lastUpdated'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'classId': classId,
        'className': className,
        'period': period.value,
        'overallPerformance': overallPerformance,
        'trendDirection': trendDirection.name,
        'totalStudents': totalStudents,
        'activeStudents': activeStudents,
        'averageGrade': averageGrade,
        'completionMetrics': completionMetrics.toJson(),
        'subjectBreakdown': subjectBreakdown.map((e) => e.toJson()).toList(),
        'performanceTrend': performanceTrend.map((e) => e.toJson()).toList(),
        'topStudents': topStudents.map((e) => e.toJson()).toList(),
        'strugglingStudents': strugglingStudents.map((e) => e.toJson()).toList(),
        if (engagementMetrics != null)
          'engagementMetrics': engagementMetrics!.toJson(),
        'insights': insights.map((e) => e.toJson()).toList(),
        if (lastUpdated != null) 'lastUpdated': lastUpdated!.toIso8601String(),
      };
}

// =============================================================================
// ENGAGEMENT METRICS
// =============================================================================

/// Detailed engagement metrics.
@immutable
class EngagementMetrics {
  const EngagementMetrics({
    required this.averageSessionDuration,
    required this.totalSessions,
    required this.averageSessionsPerWeek,
    required this.peakActivityHour,
    required this.peakActivityDay,
    required this.loginFrequency,
    required this.resourcesAccessed,
    this.activityByDay = const [],
    this.activityByHour = const [],
  });

  final double averageSessionDuration;
  final int totalSessions;
  final double averageSessionsPerWeek;
  final int peakActivityHour;
  final int peakActivityDay;
  final double loginFrequency;
  final int resourcesAccessed;
  final List<TimeSeriesDataPoint> activityByDay;
  final List<TimeSeriesDataPoint> activityByHour;

  String get peakDayName {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[peakActivityDay.clamp(0, 6)];
  }

  String get peakHourLabel {
    final hour = peakActivityHour.clamp(0, 23);
    if (hour == 0) return '12 AM';
    if (hour < 12) return '$hour AM';
    if (hour == 12) return '12 PM';
    return '${hour - 12} PM';
  }

  factory EngagementMetrics.fromJson(Map<String, dynamic> json) {
    return EngagementMetrics(
      averageSessionDuration:
          (json['averageSessionDuration'] as num).toDouble(),
      totalSessions: json['totalSessions'] as int? ?? 0,
      averageSessionsPerWeek:
          (json['averageSessionsPerWeek'] as num?)?.toDouble() ?? 0,
      peakActivityHour: json['peakActivityHour'] as int? ?? 0,
      peakActivityDay: json['peakActivityDay'] as int? ?? 0,
      loginFrequency: (json['loginFrequency'] as num?)?.toDouble() ?? 0,
      resourcesAccessed: json['resourcesAccessed'] as int? ?? 0,
      activityByDay: (json['activityByDay'] as List<dynamic>?)
              ?.map((e) => TimeSeriesDataPoint.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      activityByHour: (json['activityByHour'] as List<dynamic>?)
              ?.map((e) => TimeSeriesDataPoint.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'averageSessionDuration': averageSessionDuration,
        'totalSessions': totalSessions,
        'averageSessionsPerWeek': averageSessionsPerWeek,
        'peakActivityHour': peakActivityHour,
        'peakActivityDay': peakActivityDay,
        'loginFrequency': loginFrequency,
        'resourcesAccessed': resourcesAccessed,
        'activityByDay': activityByDay.map((e) => e.toJson()).toList(),
        'activityByHour': activityByHour.map((e) => e.toJson()).toList(),
      };
}

// =============================================================================
// ANALYTICS INSIGHT
// =============================================================================

/// AI-generated insight.
@immutable
class AnalyticsInsight {
  const AnalyticsInsight({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.priority,
    this.actionLabel,
    this.actionRoute,
    this.relatedStudentIds = const [],
    this.metadata,
    this.createdAt,
  });

  final String id;
  final InsightType type;
  final String title;
  final String description;
  final InsightPriority priority;
  final String? actionLabel;
  final String? actionRoute;
  final List<String> relatedStudentIds;
  final Map<String, dynamic>? metadata;
  final DateTime? createdAt;

  factory AnalyticsInsight.fromJson(Map<String, dynamic> json) {
    return AnalyticsInsight(
      id: json['id'] as String,
      type: InsightType.values.firstWhere(
        (t) => t.name == json['type'],
        orElse: () => InsightType.general,
      ),
      title: json['title'] as String,
      description: json['description'] as String,
      priority: InsightPriority.values.firstWhere(
        (p) => p.name == json['priority'],
        orElse: () => InsightPriority.medium,
      ),
      actionLabel: json['actionLabel'] as String?,
      actionRoute: json['actionRoute'] as String?,
      relatedStudentIds: (json['relatedStudentIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'title': title,
        'description': description,
        'priority': priority.name,
        if (actionLabel != null) 'actionLabel': actionLabel,
        if (actionRoute != null) 'actionRoute': actionRoute,
        'relatedStudentIds': relatedStudentIds,
        if (metadata != null) 'metadata': metadata,
        if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      };
}

/// Type of insight.
enum InsightType {
  general,
  performance,
  engagement,
  attendance,
  atRisk,
  achievement,
  trend,
  recommendation,
}

/// Priority level of insight.
enum InsightPriority {
  low,
  medium,
  high,
  critical,
}

// =============================================================================
// ANALYTICS EXPORT
// =============================================================================

/// Export format options.
enum AnalyticsExportFormat {
  pdf('pdf', 'PDF Report'),
  csv('csv', 'CSV Data'),
  excel('xlsx', 'Excel Spreadsheet');

  const AnalyticsExportFormat(this.value, this.label);
  final String value;
  final String label;
}

/// Analytics export request.
@immutable
class AnalyticsExportRequest {
  const AnalyticsExportRequest({
    required this.classId,
    required this.period,
    required this.format,
    this.includeStudentDetails = true,
    this.includeCharts = true,
    this.selectedStudentIds,
    this.sections = const [],
  });

  final String classId;
  final AnalyticsPeriod period;
  final AnalyticsExportFormat format;
  final bool includeStudentDetails;
  final bool includeCharts;
  final List<String>? selectedStudentIds;
  final List<String> sections;

  Map<String, dynamic> toJson() => {
        'classId': classId,
        'period': period.value,
        'format': format.value,
        'includeStudentDetails': includeStudentDetails,
        'includeCharts': includeCharts,
        if (selectedStudentIds != null) 'selectedStudentIds': selectedStudentIds,
        'sections': sections,
      };
}

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

// ============================================================================
// Engagement Analytics Models (Sprint 8: MT-005)
// ============================================================================

/// Student engagement level.
enum EngagementLevel {
  low('Low', 'Student shows minimal engagement'),
  medium('Medium', 'Student shows moderate engagement'),
  high('High', 'Student shows strong engagement'),
  exceptional('Exceptional', 'Student shows outstanding engagement');

  const EngagementLevel(this.label, this.description);
  final String label;
  final String description;
}

/// Engagement event type.
enum EngagementEventType {
  sessionStart,
  sessionEnd,
  taskStart,
  taskComplete,
  interaction,
  pauseStart,
  pauseEnd,
  helpRequested,
  contentViewed,
  assessmentStarted,
  assessmentCompleted,
}

/// Aggregated engagement metrics (detailed per-session tracking).
@immutable
class DetailedEngagementMetrics {
  const DetailedEngagementMetrics({
    required this.avgSessionDuration,
    required this.avgTimeOnTask,
    required this.interactionRate,
    required this.completionRate,
    this.totalSessions = 0,
    this.totalInteractions = 0,
    this.avgInteractionsPerSession = 0,
  });

  /// Average session duration in minutes.
  final double avgSessionDuration;

  /// Average time spent on each task in minutes.
  final double avgTimeOnTask;

  /// Rate of interactions per minute (0.0 to 1.0+).
  final double interactionRate;

  /// Completion rate of assigned tasks (0.0 to 1.0).
  final double completionRate;

  /// Total number of sessions in the period.
  final int totalSessions;

  /// Total number of interactions in the period.
  final int totalInteractions;

  /// Average number of interactions per session.
  final double avgInteractionsPerSession;

  factory DetailedEngagementMetrics.fromJson(Map<String, dynamic> json) {
    return DetailedEngagementMetrics(
      avgSessionDuration: (json['avgSessionDuration'] as num).toDouble(),
      avgTimeOnTask: (json['avgTimeOnTask'] as num).toDouble(),
      interactionRate: (json['interactionRate'] as num).toDouble(),
      completionRate: (json['completionRate'] as num).toDouble(),
      totalSessions: json['totalSessions'] as int? ?? 0,
      totalInteractions: json['totalInteractions'] as int? ?? 0,
      avgInteractionsPerSession:
          (json['avgInteractionsPerSession'] as num?)?.toDouble() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'avgSessionDuration': avgSessionDuration,
      'avgTimeOnTask': avgTimeOnTask,
      'interactionRate': interactionRate,
      'completionRate': completionRate,
      'totalSessions': totalSessions,
      'totalInteractions': totalInteractions,
      'avgInteractionsPerSession': avgInteractionsPerSession,
    };
  }

  /// Calculate overall engagement score (0.0 to 1.0).
  double get overallScore {
    // Weighted average of metrics
    const sessionWeight = 0.25;
    const timeOnTaskWeight = 0.25;
    const interactionWeight = 0.25;
    const completionWeight = 0.25;

    // Normalize session duration (assume 30 min is ideal)
    final sessionScore = (avgSessionDuration / 30).clamp(0.0, 1.0);
    // Normalize time on task (assume 5 min per task is ideal)
    final timeOnTaskScore = (avgTimeOnTask / 5).clamp(0.0, 1.0);
    // Interaction rate is already normalized
    final interactionScore = interactionRate.clamp(0.0, 1.0);
    // Completion rate is already 0-1
    final completionScore = completionRate;

    return (sessionScore * sessionWeight) +
        (timeOnTaskScore * timeOnTaskWeight) +
        (interactionScore * interactionWeight) +
        (completionScore * completionWeight);
  }
}

/// Engagement trend over time.
@immutable
class EngagementTrend {
  const EngagementTrend({
    required this.direction,
    required this.percentChange,
    required this.period,
    this.previousValue,
    this.currentValue,
  });

  /// Direction of the trend.
  final TrendDirection direction;

  /// Percent change in engagement (can be negative).
  final double percentChange;

  /// Period over which the trend was calculated.
  final DateRange period;

  /// Previous period's engagement value.
  final double? previousValue;

  /// Current period's engagement value.
  final double? currentValue;

  factory EngagementTrend.fromJson(Map<String, dynamic> json) {
    return EngagementTrend(
      direction: TrendDirection.values.firstWhere(
        (e) => e.name == json['direction'],
        orElse: () => TrendDirection.stable,
      ),
      percentChange: (json['percentChange'] as num).toDouble(),
      period: DateRange.fromJson(json['period'] as Map<String, dynamic>),
      previousValue: (json['previousValue'] as num?)?.toDouble(),
      currentValue: (json['currentValue'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'direction': direction.name,
      'percentChange': percentChange,
      'period': period.toJson(),
      'previousValue': previousValue,
      'currentValue': currentValue,
    };
  }

  /// Returns true if trend is positive.
  bool get isPositive =>
      direction == TrendDirection.increasing && percentChange > 0;

  /// Returns true if trend is concerning.
  bool get isConcerning =>
      direction == TrendDirection.decreasing && percentChange < -10;
}

/// Individual engagement event.
@immutable
class EngagementEvent {
  const EngagementEvent({
    required this.id,
    required this.eventType,
    required this.timestamp,
    this.duration,
    this.context,
    this.metadata,
  });

  final String id;

  /// Type of engagement event.
  final EngagementEventType eventType;

  /// When the event occurred.
  final DateTime timestamp;

  /// Duration in seconds (for events that have duration).
  final int? duration;

  /// Context about the event (e.g., content ID, task name).
  final Map<String, dynamic>? context;

  /// Additional metadata.
  final Map<String, dynamic>? metadata;

  factory EngagementEvent.fromJson(Map<String, dynamic> json) {
    return EngagementEvent(
      id: json['id'] as String,
      eventType: EngagementEventType.values.firstWhere(
        (e) => e.name == json['eventType'],
        orElse: () => EngagementEventType.interaction,
      ),
      timestamp: DateTime.parse(json['timestamp'] as String),
      duration: json['duration'] as int?,
      context: json['context'] as Map<String, dynamic>?,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'eventType': eventType.name,
      'timestamp': timestamp.toIso8601String(),
      'duration': duration,
      'context': context,
      'metadata': metadata,
    };
  }
}

/// Student engagement profile.
@immutable
class StudentEngagement {
  const StudentEngagement({
    required this.studentId,
    required this.studentName,
    required this.metrics,
    required this.engagementLevel,
    required this.trend,
    this.lastActive,
    this.recentEvents = const [],
    this.engagementScore,
    this.riskFactors = const [],
  });

  final String studentId;
  final String studentName;

  /// Aggregated engagement metrics.
  final DetailedEngagementMetrics metrics;

  /// Current engagement level classification.
  final EngagementLevel engagementLevel;

  /// Trend over the analysis period.
  final EngagementTrend trend;

  /// Last activity timestamp.
  final DateTime? lastActive;

  /// Recent engagement events.
  final List<EngagementEvent> recentEvents;

  /// Overall engagement score (0-100).
  final double? engagementScore;

  /// List of risk factors for disengagement.
  final List<String> riskFactors;

  factory StudentEngagement.fromJson(Map<String, dynamic> json) {
    return StudentEngagement(
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      metrics:
          DetailedEngagementMetrics.fromJson(json['metrics'] as Map<String, dynamic>),
      engagementLevel: EngagementLevel.values.firstWhere(
        (e) => e.name == json['engagementLevel'],
        orElse: () => EngagementLevel.medium,
      ),
      trend: EngagementTrend.fromJson(json['trend'] as Map<String, dynamic>),
      lastActive: json['lastActive'] != null
          ? DateTime.parse(json['lastActive'] as String)
          : null,
      recentEvents: (json['recentEvents'] as List<dynamic>?)
              ?.map((e) => EngagementEvent.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      engagementScore: (json['engagementScore'] as num?)?.toDouble(),
      riskFactors: (json['riskFactors'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'studentId': studentId,
      'studentName': studentName,
      'metrics': metrics.toJson(),
      'engagementLevel': engagementLevel.name,
      'trend': trend.toJson(),
      'lastActive': lastActive?.toIso8601String(),
      'recentEvents': recentEvents.map((e) => e.toJson()).toList(),
      'engagementScore': engagementScore,
      'riskFactors': riskFactors,
    };
  }

  /// Check if student is at risk of disengagement.
  bool get isAtRisk =>
      engagementLevel == EngagementLevel.low || trend.isConcerning;

  /// Get days since last active.
  int? get daysSinceActive {
    if (lastActive == null) return null;
    return DateTime.now().difference(lastActive!).inDays;
  }
}

/// Class-level engagement summary.
@immutable
class ClassEngagement {
  const ClassEngagement({
    required this.classId,
    required this.className,
    required this.period,
    required this.averageMetrics,
    required this.distribution,
    required this.students,
    this.trend,
    this.alerts = const [],
  });

  final String classId;
  final String className;
  final DateRange period;

  /// Class average engagement metrics.
  final DetailedEngagementMetrics averageMetrics;

  /// Distribution of engagement levels.
  final EngagementDistribution distribution;

  /// Individual student engagement data.
  final List<StudentEngagement> students;

  /// Class-level engagement trend.
  final EngagementTrend? trend;

  /// Disengaged student alerts.
  final List<EngagementAlert> alerts;

  factory ClassEngagement.fromJson(Map<String, dynamic> json) {
    return ClassEngagement(
      classId: json['classId'] as String,
      className: json['className'] as String,
      period: DateRange.fromJson(json['period'] as Map<String, dynamic>),
      averageMetrics: DetailedEngagementMetrics.fromJson(
          json['averageMetrics'] as Map<String, dynamic>),
      distribution: EngagementDistribution.fromJson(
          json['distribution'] as Map<String, dynamic>),
      students: (json['students'] as List<dynamic>)
          .map((e) => StudentEngagement.fromJson(e as Map<String, dynamic>))
          .toList(),
      trend: json['trend'] != null
          ? EngagementTrend.fromJson(json['trend'] as Map<String, dynamic>)
          : null,
      alerts: (json['alerts'] as List<dynamic>?)
              ?.map((e) => EngagementAlert.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'classId': classId,
      'className': className,
      'period': period.toJson(),
      'averageMetrics': averageMetrics.toJson(),
      'distribution': distribution.toJson(),
      'students': students.map((e) => e.toJson()).toList(),
      'trend': trend?.toJson(),
      'alerts': alerts.map((e) => e.toJson()).toList(),
    };
  }

  /// Get students at risk of disengagement.
  List<StudentEngagement> get atRiskStudents =>
      students.where((s) => s.isAtRisk).toList();

  /// Get top engaged students.
  List<StudentEngagement> get topEngaged => students
      .where((s) => s.engagementLevel == EngagementLevel.exceptional)
      .toList();
}

/// Distribution of engagement levels in a class.
@immutable
class EngagementDistribution {
  const EngagementDistribution({
    required this.low,
    required this.medium,
    required this.high,
    required this.exceptional,
    required this.total,
  });

  final int low;
  final int medium;
  final int high;
  final int exceptional;
  final int total;

  factory EngagementDistribution.fromJson(Map<String, dynamic> json) {
    return EngagementDistribution(
      low: json['low'] as int,
      medium: json['medium'] as int,
      high: json['high'] as int,
      exceptional: json['exceptional'] as int,
      total: json['total'] as int,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'low': low,
      'medium': medium,
      'high': high,
      'exceptional': exceptional,
      'total': total,
    };
  }

  /// Get percentage for each level.
  double get lowPercent => total > 0 ? (low / total) * 100 : 0;
  double get mediumPercent => total > 0 ? (medium / total) * 100 : 0;
  double get highPercent => total > 0 ? (high / total) * 100 : 0;
  double get exceptionalPercent => total > 0 ? (exceptional / total) * 100 : 0;
}

/// Alert for disengaged students.
@immutable
class EngagementAlert {
  const EngagementAlert({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.alertType,
    required this.severity,
    required this.message,
    required this.createdAt,
    this.engagementLevel,
    this.suggestedActions = const [],
    this.isResolved = false,
  });

  final String id;
  final String studentId;
  final String studentName;
  final EngagementAlertType alertType;
  final AlertSeverity severity;
  final String message;
  final DateTime createdAt;
  final EngagementLevel? engagementLevel;
  final List<String> suggestedActions;
  final bool isResolved;

  factory EngagementAlert.fromJson(Map<String, dynamic> json) {
    return EngagementAlert(
      id: json['id'] as String,
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      alertType: EngagementAlertType.values.firstWhere(
        (e) => e.name == json['alertType'],
        orElse: () => EngagementAlertType.lowEngagement,
      ),
      severity: AlertSeverity.values.firstWhere(
        (e) => e.name == json['severity'],
        orElse: () => AlertSeverity.medium,
      ),
      message: json['message'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      engagementLevel: json['engagementLevel'] != null
          ? EngagementLevel.values.firstWhere(
              (e) => e.name == json['engagementLevel'],
              orElse: () => EngagementLevel.low,
            )
          : null,
      suggestedActions: (json['suggestedActions'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      isResolved: json['isResolved'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'studentId': studentId,
      'studentName': studentName,
      'alertType': alertType.name,
      'severity': severity.name,
      'message': message,
      'createdAt': createdAt.toIso8601String(),
      'engagementLevel': engagementLevel?.name,
      'suggestedActions': suggestedActions,
      'isResolved': isResolved,
    };
  }
}

/// Types of engagement alerts.
enum EngagementAlertType {
  lowEngagement('Low Engagement'),
  decliningTrend('Declining Trend'),
  inactivity('Extended Inactivity'),
  lowCompletion('Low Completion Rate'),
  shortSessions('Short Session Duration');

  const EngagementAlertType(this.label);
  final String label;
}

/// Engagement timeline data point.
@immutable
class EngagementTimelinePoint {
  const EngagementTimelinePoint({
    required this.timestamp,
    required this.avgEngagement,
    required this.activeStudents,
    required this.totalStudents,
    this.metrics,
  });

  final DateTime timestamp;
  final double avgEngagement;
  final int activeStudents;
  final int totalStudents;
  final DetailedEngagementMetrics? metrics;

  factory EngagementTimelinePoint.fromJson(Map<String, dynamic> json) {
    return EngagementTimelinePoint(
      timestamp: DateTime.parse(json['timestamp'] as String),
      avgEngagement: (json['avgEngagement'] as num).toDouble(),
      activeStudents: json['activeStudents'] as int,
      totalStudents: json['totalStudents'] as int,
      metrics: json['metrics'] != null
          ? DetailedEngagementMetrics.fromJson(json['metrics'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'timestamp': timestamp.toIso8601String(),
      'avgEngagement': avgEngagement,
      'activeStudents': activeStudents,
      'totalStudents': totalStudents,
      'metrics': metrics?.toJson(),
    };
  }

  double get participationRate =>
      totalStudents > 0 ? activeStudents / totalStudents : 0;
}

/// Timeline granularity for engagement data.
enum TimelineGranularity {
  hourly,
  daily,
  weekly,
  monthly,
}

/// Content engagement data.
@immutable
class ContentEngagement {
  const ContentEngagement({
    required this.contentId,
    required this.contentName,
    required this.contentType,
    required this.viewCount,
    required this.completionCount,
    required this.avgTimeSpent,
    required this.avgEngagementScore,
    this.lastAccessed,
  });

  final String contentId;
  final String contentName;
  final String contentType;
  final int viewCount;
  final int completionCount;
  final double avgTimeSpent;
  final double avgEngagementScore;
  final DateTime? lastAccessed;

  factory ContentEngagement.fromJson(Map<String, dynamic> json) {
    return ContentEngagement(
      contentId: json['contentId'] as String,
      contentName: json['contentName'] as String,
      contentType: json['contentType'] as String,
      viewCount: json['viewCount'] as int,
      completionCount: json['completionCount'] as int,
      avgTimeSpent: (json['avgTimeSpent'] as num).toDouble(),
      avgEngagementScore: (json['avgEngagementScore'] as num).toDouble(),
      lastAccessed: json['lastAccessed'] != null
          ? DateTime.parse(json['lastAccessed'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'contentId': contentId,
      'contentName': contentName,
      'contentType': contentType,
      'viewCount': viewCount,
      'completionCount': completionCount,
      'avgTimeSpent': avgTimeSpent,
      'avgEngagementScore': avgEngagementScore,
      'lastAccessed': lastAccessed?.toIso8601String(),
    };
  }

  double get completionRate =>
      viewCount > 0 ? completionCount / viewCount : 0.0;
}

/// Engagement patterns for a student (time of day, day of week).
@immutable
class EngagementPatterns {
  const EngagementPatterns({
    required this.studentId,
    required this.hourlyPattern,
    required this.dailyPattern,
    this.peakHours = const [],
    this.preferredDays = const [],
  });

  final String studentId;

  /// Engagement by hour of day (0-23).
  final Map<int, double> hourlyPattern;

  /// Engagement by day of week (1-7, Monday=1).
  final Map<int, double> dailyPattern;

  /// Hours with highest engagement.
  final List<int> peakHours;

  /// Days with highest engagement.
  final List<int> preferredDays;

  factory EngagementPatterns.fromJson(Map<String, dynamic> json) {
    return EngagementPatterns(
      studentId: json['studentId'] as String,
      hourlyPattern: (json['hourlyPattern'] as Map<String, dynamic>).map(
        (key, value) => MapEntry(int.parse(key), (value as num).toDouble()),
      ),
      dailyPattern: (json['dailyPattern'] as Map<String, dynamic>).map(
        (key, value) => MapEntry(int.parse(key), (value as num).toDouble()),
      ),
      peakHours: (json['peakHours'] as List<dynamic>?)
              ?.map((e) => e as int)
              .toList() ??
          [],
      preferredDays: (json['preferredDays'] as List<dynamic>?)
              ?.map((e) => e as int)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'studentId': studentId,
      'hourlyPattern':
          hourlyPattern.map((key, value) => MapEntry(key.toString(), value)),
      'dailyPattern':
          dailyPattern.map((key, value) => MapEntry(key.toString(), value)),
      'peakHours': peakHours,
      'preferredDays': preferredDays,
    };
  }

  /// Get formatted peak hours string.
  String get peakHoursFormatted {
    if (peakHours.isEmpty) return 'No data';
    return peakHours.map((h) => '${h.toString().padLeft(2, '0')}:00').join(', ');
  }

  /// Get formatted preferred days string.
  String get preferredDaysFormatted {
    if (preferredDays.isEmpty) return 'No data';
    const days = [
      '',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ];
    return preferredDays.map((d) => days[d]).join(', ');
  }
}

/// Session history entry.
@immutable
class SessionHistoryEntry {
  const SessionHistoryEntry({
    required this.sessionId,
    required this.startTime,
    required this.endTime,
    required this.durationMinutes,
    required this.engagementScore,
    this.tasksCompleted = 0,
    this.interactionCount = 0,
    this.contentAccessed = const [],
  });

  final String sessionId;
  final DateTime startTime;
  final DateTime endTime;
  final int durationMinutes;
  final double engagementScore;
  final int tasksCompleted;
  final int interactionCount;
  final List<String> contentAccessed;

  factory SessionHistoryEntry.fromJson(Map<String, dynamic> json) {
    return SessionHistoryEntry(
      sessionId: json['sessionId'] as String,
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: DateTime.parse(json['endTime'] as String),
      durationMinutes: json['durationMinutes'] as int,
      engagementScore: (json['engagementScore'] as num).toDouble(),
      tasksCompleted: json['tasksCompleted'] as int? ?? 0,
      interactionCount: json['interactionCount'] as int? ?? 0,
      contentAccessed: (json['contentAccessed'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sessionId': sessionId,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
      'durationMinutes': durationMinutes,
      'engagementScore': engagementScore,
      'tasksCompleted': tasksCompleted,
      'interactionCount': interactionCount,
      'contentAccessed': contentAccessed,
    };
  }
}

/// Recommendations for improving student engagement.
@immutable
class EngagementRecommendation {
  const EngagementRecommendation({
    required this.id,
    required this.title,
    required this.description,
    required this.priority,
    required this.category,
    this.targetMetric,
    this.expectedImpact,
    this.relatedInterventionId,
  });

  final String id;
  final String title;
  final String description;
  final RecommendationPriority priority;
  final RecommendationCategory category;
  final String? targetMetric;
  final String? expectedImpact;
  final String? relatedInterventionId;

  factory EngagementRecommendation.fromJson(Map<String, dynamic> json) {
    return EngagementRecommendation(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      priority: RecommendationPriority.values.firstWhere(
        (e) => e.name == json['priority'],
        orElse: () => RecommendationPriority.medium,
      ),
      category: RecommendationCategory.values.firstWhere(
        (e) => e.name == json['category'],
        orElse: () => RecommendationCategory.engagement,
      ),
      targetMetric: json['targetMetric'] as String?,
      expectedImpact: json['expectedImpact'] as String?,
      relatedInterventionId: json['relatedInterventionId'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'priority': priority.name,
      'category': category.name,
      'targetMetric': targetMetric,
      'expectedImpact': expectedImpact,
      'relatedInterventionId': relatedInterventionId,
    };
  }
}

/// Priority levels for recommendations.
enum RecommendationPriority {
  low,
  medium,
  high,
  critical,
}

/// Categories of engagement recommendations.
enum RecommendationCategory {
  engagement,
  timeManagement,
  contentDifficulty,
  socialSupport,
  accessibility,
  motivation,
}

// ============================================================================
// Analytics Dashboard Models (Sprint 8)
// ============================================================================

/// State for analytics dashboard.
@immutable
class AnalyticsDashboardState {
  const AnalyticsDashboardState({
    this.classAnalytics,
    this.subjectPerformance = const [],
    this.topStudents = const [],
    this.strugglingStudents = const [],
    this.insights = const [],
    this.isLoading = false,
    this.error,
  });

  final ClassAnalytics? classAnalytics;
  final List<SubjectPerformance> subjectPerformance;
  final List<StudentAnalyticsProfile> topStudents;
  final List<StudentAnalyticsProfile> strugglingStudents;
  final List<AnalyticsInsight> insights;
  final bool isLoading;
  final String? error;

  factory AnalyticsDashboardState.fromJson(Map<String, dynamic> json) {
    return AnalyticsDashboardState(
      classAnalytics: json['classAnalytics'] != null
          ? ClassAnalytics.fromJson(
              json['classAnalytics'] as Map<String, dynamic>)
          : null,
      subjectPerformance: (json['subjectPerformance'] as List<dynamic>?)
              ?.map(
                  (e) => SubjectPerformance.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      topStudents: (json['topStudents'] as List<dynamic>?)
              ?.map((e) =>
                  StudentAnalyticsProfile.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      strugglingStudents: (json['strugglingStudents'] as List<dynamic>?)
              ?.map((e) =>
                  StudentAnalyticsProfile.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      insights: (json['insights'] as List<dynamic>?)
              ?.map((e) => AnalyticsInsight.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

/// State for analytics export.
@immutable
class AnalyticsExportState {
  const AnalyticsExportState({
    this.isExporting = false,
    this.downloadUrl,
    this.error,
  });

  final bool isExporting;
  final String? downloadUrl;
  final String? error;

  AnalyticsExportState copyWith({
    bool? isExporting,
    String? downloadUrl,
    String? error,
  }) {
    return AnalyticsExportState(
      isExporting: isExporting ?? this.isExporting,
      downloadUrl: downloadUrl,
      error: error,
    );
  }
}
