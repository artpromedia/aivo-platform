/// Engagement API
///
/// API client for engagement, streaks, and screen time data.
library;

import 'package:dio/dio.dart';

import '../models/engagement_models.dart';

/// API client for engagement features.
class EngagementApi {
  EngagementApi({required this.dio});

  final Dio dio;

  // ============================================================
  // Streak APIs
  // ============================================================

  /// Fetches the learning streak for a child.
  Future<LearningStreak> fetchStreak(String childId) async {
    final response = await dio.get('/api/v1/children/$childId/streak');
    return LearningStreak.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetches streak history for a date range.
  Future<List<StreakDay>> fetchStreakHistory(
    String childId, {
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    final response = await dio.get(
      '/api/v1/children/$childId/streak/history',
      queryParameters: {
        'start_date': startDate.toIso8601String(),
        'end_date': endDate.toIso8601String(),
      },
    );
    return (response.data as List)
        .map((json) => StreakDay.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Updates the weekly streak goal.
  Future<LearningStreak> updateWeeklyGoal(String childId, int goal) async {
    final response = await dio.patch(
      '/api/v1/children/$childId/streak/goal',
      data: {'weekly_goal': goal},
    );
    return LearningStreak.fromJson(response.data as Map<String, dynamic>);
  }

  // ============================================================
  // Usage Tracking APIs
  // ============================================================

  /// Fetches daily usage for a specific date.
  Future<DailyUsage> fetchDailyUsage(String childId, DateTime date) async {
    final response = await dio.get(
      '/api/v1/children/$childId/usage/daily',
      queryParameters: {'date': date.toIso8601String().split('T')[0]},
    );
    return DailyUsage.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetches usage summary for a date range.
  Future<UsageSummary> fetchUsageSummary(
    String childId, {
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    final response = await dio.get(
      '/api/v1/children/$childId/usage/summary',
      queryParameters: {
        'start_date': startDate.toIso8601String(),
        'end_date': endDate.toIso8601String(),
      },
    );
    return UsageSummary.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetches recent usage sessions.
  Future<List<UsageSession>> fetchRecentSessions(
    String childId, {
    int limit = 20,
  }) async {
    final response = await dio.get(
      '/api/v1/children/$childId/usage/sessions',
      queryParameters: {'limit': limit},
    );
    return (response.data as List)
        .map((json) => UsageSession.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  // ============================================================
  // Screen Time APIs
  // ============================================================

  /// Fetches screen time settings for a child.
  Future<ScreenTimeSettings> fetchScreenTimeSettings(String childId) async {
    final response = await dio.get('/api/v1/children/$childId/screen-time/settings');
    return ScreenTimeSettings.fromJson(response.data as Map<String, dynamic>);
  }

  /// Updates screen time settings.
  Future<ScreenTimeSettings> updateScreenTimeSettings(
    String childId,
    ScreenTimeSettings settings,
  ) async {
    final response = await dio.put(
      '/api/v1/children/$childId/screen-time/settings',
      data: settings.toJson(),
    );
    return ScreenTimeSettings.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetches current screen time status.
  Future<ScreenTimeStatus> fetchScreenTimeStatus(String childId) async {
    final response = await dio.get('/api/v1/children/$childId/screen-time/status');
    return ScreenTimeStatus.fromJson(response.data as Map<String, dynamic>);
  }

  /// Adds a screen time schedule.
  Future<ScreenTimeSettings> addSchedule(
    String childId,
    ScreenTimeSchedule schedule,
  ) async {
    final response = await dio.post(
      '/api/v1/children/$childId/screen-time/schedules',
      data: schedule.toJson(),
    );
    return ScreenTimeSettings.fromJson(response.data as Map<String, dynamic>);
  }

  /// Updates a screen time schedule.
  Future<ScreenTimeSettings> updateSchedule(
    String childId,
    ScreenTimeSchedule schedule,
  ) async {
    final response = await dio.put(
      '/api/v1/children/$childId/screen-time/schedules/${schedule.id}',
      data: schedule.toJson(),
    );
    return ScreenTimeSettings.fromJson(response.data as Map<String, dynamic>);
  }

  /// Deletes a screen time schedule.
  Future<void> deleteSchedule(String childId, String scheduleId) async {
    await dio.delete('/api/v1/children/$childId/screen-time/schedules/$scheduleId');
  }

  /// Grants temporary screen time extension.
  Future<ScreenTimeStatus> grantExtension(
    String childId, {
    required int additionalMinutes,
    String? reason,
  }) async {
    final response = await dio.post(
      '/api/v1/children/$childId/screen-time/extension',
      data: {
        'additional_minutes': additionalMinutes,
        'reason': reason,
      },
    );
    return ScreenTimeStatus.fromJson(response.data as Map<String, dynamic>);
  }

  // ============================================================
  // Milestone APIs
  // ============================================================

  /// Fetches engagement milestones for a child.
  Future<List<EngagementMilestone>> fetchMilestones(String childId) async {
    final response = await dio.get('/api/v1/children/$childId/milestones');
    return (response.data as List)
        .map((json) => EngagementMilestone.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Fetches the weekly engagement report.
  Future<WeeklyEngagementReport> fetchWeeklyReport(
    String childId, {
    DateTime? weekStartDate,
  }) async {
    final response = await dio.get(
      '/api/v1/children/$childId/engagement/weekly-report',
      queryParameters: weekStartDate != null
          ? {'week_start': weekStartDate.toIso8601String()}
          : null,
    );
    return WeeklyEngagementReport.fromJson(response.data as Map<String, dynamic>);
  }
}
