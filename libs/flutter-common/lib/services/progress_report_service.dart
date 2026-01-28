/// Progress Report API Service
///
/// Provides access to learner progress reports and analytics.
library;

import 'package:dio/dio.dart';

import '../api/api_client.dart';
import '../api/api_config.dart';

/// Progress summary for a learner
class ProgressSummary {
  final String learnerId;
  final String learnerName;
  final int totalActivitiesCompleted;
  final int totalTimeSpentMinutes;
  final double averageAccuracy;
  final int streakDays;
  final DateTime lastActivityAt;
  final Map<String, SkillProgress> skillProgress;

  const ProgressSummary({
    required this.learnerId,
    required this.learnerName,
    required this.totalActivitiesCompleted,
    required this.totalTimeSpentMinutes,
    required this.averageAccuracy,
    required this.streakDays,
    required this.lastActivityAt,
    required this.skillProgress,
  });

  factory ProgressSummary.fromJson(Map<String, dynamic> json) {
    return ProgressSummary(
      learnerId: json['learnerId'] as String,
      learnerName: json['learnerName'] as String,
      totalActivitiesCompleted: json['totalActivitiesCompleted'] as int,
      totalTimeSpentMinutes: json['totalTimeSpentMinutes'] as int,
      averageAccuracy: (json['averageAccuracy'] as num).toDouble(),
      streakDays: json['streakDays'] as int,
      lastActivityAt: DateTime.parse(json['lastActivityAt'] as String),
      skillProgress: (json['skillProgress'] as Map<String, dynamic>).map(
        (key, value) =>
            MapEntry(key, SkillProgress.fromJson(value as Map<String, dynamic>)),
      ),
    );
  }

  Map<String, dynamic> toJson() => {
        'learnerId': learnerId,
        'learnerName': learnerName,
        'totalActivitiesCompleted': totalActivitiesCompleted,
        'totalTimeSpentMinutes': totalTimeSpentMinutes,
        'averageAccuracy': averageAccuracy,
        'streakDays': streakDays,
        'lastActivityAt': lastActivityAt.toIso8601String(),
        'skillProgress':
            skillProgress.map((key, value) => MapEntry(key, value.toJson())),
      };
}

/// Progress for a specific skill
class SkillProgress {
  final String skillId;
  final String skillName;
  final double masteryLevel;
  final int activitiesCompleted;
  final int totalActivities;
  final DateTime? lastPracticedAt;

  const SkillProgress({
    required this.skillId,
    required this.skillName,
    required this.masteryLevel,
    required this.activitiesCompleted,
    required this.totalActivities,
    this.lastPracticedAt,
  });

  factory SkillProgress.fromJson(Map<String, dynamic> json) {
    return SkillProgress(
      skillId: json['skillId'] as String,
      skillName: json['skillName'] as String,
      masteryLevel: (json['masteryLevel'] as num).toDouble(),
      activitiesCompleted: json['activitiesCompleted'] as int,
      totalActivities: json['totalActivities'] as int,
      lastPracticedAt: json['lastPracticedAt'] != null
          ? DateTime.parse(json['lastPracticedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'skillId': skillId,
        'skillName': skillName,
        'masteryLevel': masteryLevel,
        'activitiesCompleted': activitiesCompleted,
        'totalActivities': totalActivities,
        'lastPracticedAt': lastPracticedAt?.toIso8601String(),
      };
}

/// Activity entry in a learner's progress
class ActivityEntry {
  final String id;
  final String type;
  final String title;
  final DateTime completedAt;
  final int durationMinutes;
  final double? accuracy;
  final String? skillId;

  const ActivityEntry({
    required this.id,
    required this.type,
    required this.title,
    required this.completedAt,
    required this.durationMinutes,
    this.accuracy,
    this.skillId,
  });

  factory ActivityEntry.fromJson(Map<String, dynamic> json) {
    return ActivityEntry(
      id: json['id'] as String,
      type: json['type'] as String,
      title: json['title'] as String,
      completedAt: DateTime.parse(json['completedAt'] as String),
      durationMinutes: json['durationMinutes'] as int,
      accuracy: json['accuracy'] != null
          ? (json['accuracy'] as num).toDouble()
          : null,
      skillId: json['skillId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'title': title,
        'completedAt': completedAt.toIso8601String(),
        'durationMinutes': durationMinutes,
        'accuracy': accuracy,
        'skillId': skillId,
      };
}

/// Weekly progress report
class WeeklyReport {
  final String learnerId;
  final DateTime weekStart;
  final DateTime weekEnd;
  final int activitiesCompleted;
  final int timeSpentMinutes;
  final double averageAccuracy;
  final List<String> skillsImproved;
  final List<String> areasToFocus;
  final String? teacherNote;

  const WeeklyReport({
    required this.learnerId,
    required this.weekStart,
    required this.weekEnd,
    required this.activitiesCompleted,
    required this.timeSpentMinutes,
    required this.averageAccuracy,
    required this.skillsImproved,
    required this.areasToFocus,
    this.teacherNote,
  });

  factory WeeklyReport.fromJson(Map<String, dynamic> json) {
    return WeeklyReport(
      learnerId: json['learnerId'] as String,
      weekStart: DateTime.parse(json['weekStart'] as String),
      weekEnd: DateTime.parse(json['weekEnd'] as String),
      activitiesCompleted: json['activitiesCompleted'] as int,
      timeSpentMinutes: json['timeSpentMinutes'] as int,
      averageAccuracy: (json['averageAccuracy'] as num).toDouble(),
      skillsImproved: (json['skillsImproved'] as List).cast<String>(),
      areasToFocus: (json['areasToFocus'] as List).cast<String>(),
      teacherNote: json['teacherNote'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'learnerId': learnerId,
        'weekStart': weekStart.toIso8601String(),
        'weekEnd': weekEnd.toIso8601String(),
        'activitiesCompleted': activitiesCompleted,
        'timeSpentMinutes': timeSpentMinutes,
        'averageAccuracy': averageAccuracy,
        'skillsImproved': skillsImproved,
        'areasToFocus': areasToFocus,
        'teacherNote': teacherNote,
      };
}

/// Progress Report API Service
class ProgressReportService {
  final Dio _dio;

  ProgressReportService({Dio? dio}) : _dio = dio ?? AivoApiClient.instance.dio;

  /// Get progress summary for a learner
  Future<ProgressSummary> getProgressSummary(String learnerId) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiEndpoints.progressReportSummary.replaceAll('{learnerId}', learnerId),
    );
    return ProgressSummary.fromJson(response.data!);
  }

  /// Get recent activities for a learner
  Future<List<ActivityEntry>> getRecentActivities(
    String learnerId, {
    int limit = 20,
    int offset = 0,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiEndpoints.progressReportActivities
          .replaceAll('{learnerId}', learnerId),
      queryParameters: {'limit': limit, 'offset': offset},
    );
    final data = response.data!['activities'] as List;
    return data
        .map((e) => ActivityEntry.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Get skill-level progress for a learner
  Future<List<SkillProgress>> getSkillProgress(String learnerId) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiEndpoints.progressReportSkills.replaceAll('{learnerId}', learnerId),
    );
    final data = response.data!['skills'] as List;
    return data
        .map((e) => SkillProgress.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Get weekly reports for a learner
  Future<List<WeeklyReport>> getWeeklyReports(
    String learnerId, {
    int limit = 4,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiEndpoints.progressReportWeekly.replaceAll('{learnerId}', learnerId),
      queryParameters: {'limit': limit},
    );
    final data = response.data!['reports'] as List;
    return data
        .map((e) => WeeklyReport.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Get linked learners for a parent
  Future<List<ProgressSummary>> getLinkedLearners() async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiEndpoints.progressReportLinkedLearners,
    );
    final data = response.data!['learners'] as List;
    return data
        .map((e) => ProgressSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
