/// Analytics Repository
///
/// Data access for engagement analytics.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_common/flutter_common.dart';

import '../models/models.dart';
import '../services/sync/connectivity_monitor.dart';

/// Repository for engagement analytics data access.
class AnalyticsRepository {
  AnalyticsRepository({
    required this.api,
    required this.connectivity,
  });

  final AivoApiClient api;
  final ConnectivityMonitor connectivity;

  // In-memory caches
  final Map<String, ClassEngagement> _classEngagementCache = {};
  final Map<String, StudentEngagement> _studentEngagementCache = {};
  final Map<String, List<EngagementTimelinePoint>> _timelineCache = {};
  final Map<String, List<ContentEngagement>> _contentEngagementCache = {};
  final Map<String, List<EngagementAlert>> _alertsCache = {};

  DateTime? _cacheTime;
  static const _cacheValidDuration = Duration(minutes: 5);

  bool get _isCacheValid =>
      _cacheTime != null &&
      DateTime.now().difference(_cacheTime!) < _cacheValidDuration;

  /// Fetch class engagement data.
  Future<ClassEngagement?> fetchClassEngagement(
    String classId,
    DateRange period,
  ) async {
    final cacheKey = '$classId-${period.start.toIso8601String()}';

    // Return cache if valid
    if (_isCacheValid && _classEngagementCache.containsKey(cacheKey)) {
      return _classEngagementCache[cacheKey];
    }

    if (!await connectivity.isOnline) {
      return _classEngagementCache[cacheKey];
    }

    try {
      final response = await api.get(
        '/analytics/classes/$classId/engagement',
        queryParameters: {
          'startDate': period.start.toIso8601String(),
          'endDate': period.end.toIso8601String(),
        },
      );
      final engagement =
          ClassEngagement.fromJson(response.data as Map<String, dynamic>);

      _classEngagementCache[cacheKey] = engagement;
      _cacheTime = DateTime.now();
      return engagement;
    } catch (e) {
      debugPrint('[AnalyticsRepository] Error fetching class engagement: $e');
      return _classEngagementCache[cacheKey];
    }
  }

  /// Fetch individual student engagement data.
  Future<StudentEngagement?> fetchStudentEngagement(
    String studentId,
    DateRange period,
  ) async {
    final cacheKey = '$studentId-${period.start.toIso8601String()}';

    if (_isCacheValid && _studentEngagementCache.containsKey(cacheKey)) {
      return _studentEngagementCache[cacheKey];
    }

    if (!await connectivity.isOnline) {
      return _studentEngagementCache[cacheKey];
    }

    try {
      final response = await api.get(
        '/analytics/students/$studentId/engagement',
        queryParameters: {
          'startDate': period.start.toIso8601String(),
          'endDate': period.end.toIso8601String(),
        },
      );
      final engagement =
          StudentEngagement.fromJson(response.data as Map<String, dynamic>);

      _studentEngagementCache[cacheKey] = engagement;
      _cacheTime = DateTime.now();
      return engagement;
    } catch (e) {
      debugPrint(
          '[AnalyticsRepository] Error fetching student engagement: $e');
      return _studentEngagementCache[cacheKey];
    }
  }

  /// Fetch engagement timeline for a class.
  Future<List<EngagementTimelinePoint>> fetchEngagementTimeline(
    String classId,
    TimelineGranularity granularity, {
    DateRange? period,
  }) async {
    final cacheKey = '$classId-${granularity.name}';

    if (_isCacheValid && _timelineCache.containsKey(cacheKey)) {
      return _timelineCache[cacheKey]!;
    }

    if (!await connectivity.isOnline) {
      return _timelineCache[cacheKey] ?? [];
    }

    try {
      final queryParams = <String, dynamic>{
        'granularity': granularity.name,
      };
      if (period != null) {
        queryParams['startDate'] = period.start.toIso8601String();
        queryParams['endDate'] = period.end.toIso8601String();
      }

      final response = await api.get(
        '/analytics/classes/$classId/engagement/timeline',
        queryParameters: queryParams,
      );
      final data = response.data as List;
      final timeline = data
          .map((json) =>
              EngagementTimelinePoint.fromJson(json as Map<String, dynamic>))
          .toList();

      _timelineCache[cacheKey] = timeline;
      _cacheTime = DateTime.now();
      return timeline;
    } catch (e) {
      debugPrint(
          '[AnalyticsRepository] Error fetching engagement timeline: $e');
      return _timelineCache[cacheKey] ?? [];
    }
  }

  /// Fetch engagement data by content for a class.
  Future<List<ContentEngagement>> fetchEngagementByContent(
    String classId, {
    DateRange? period,
  }) async {
    final cacheKey = classId;

    if (_isCacheValid && _contentEngagementCache.containsKey(cacheKey)) {
      return _contentEngagementCache[cacheKey]!;
    }

    if (!await connectivity.isOnline) {
      return _contentEngagementCache[cacheKey] ?? [];
    }

    try {
      final queryParams = <String, dynamic>{};
      if (period != null) {
        queryParams['startDate'] = period.start.toIso8601String();
        queryParams['endDate'] = period.end.toIso8601String();
      }

      final response = await api.get(
        '/analytics/classes/$classId/engagement/content',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );
      final data = response.data as List;
      final contentEngagement = data
          .map((json) =>
              ContentEngagement.fromJson(json as Map<String, dynamic>))
          .toList();

      _contentEngagementCache[cacheKey] = contentEngagement;
      _cacheTime = DateTime.now();
      return contentEngagement;
    } catch (e) {
      debugPrint(
          '[AnalyticsRepository] Error fetching content engagement: $e');
      return _contentEngagementCache[cacheKey] ?? [];
    }
  }

  /// Fetch engagement alerts (disengaged students) for a class.
  Future<List<EngagementAlert>> fetchEngagementAlerts(
    String classId, {
    bool includeResolved = false,
  }) async {
    final cacheKey = '$classId-$includeResolved';

    if (_isCacheValid && _alertsCache.containsKey(cacheKey)) {
      return _alertsCache[cacheKey]!;
    }

    if (!await connectivity.isOnline) {
      return _alertsCache[cacheKey] ?? [];
    }

    try {
      final response = await api.get(
        '/analytics/classes/$classId/engagement/alerts',
        queryParameters: {
          'includeResolved': includeResolved.toString(),
        },
      );
      final data = response.data as List;
      final alerts = data
          .map(
              (json) => EngagementAlert.fromJson(json as Map<String, dynamic>))
          .toList();

      _alertsCache[cacheKey] = alerts;
      _cacheTime = DateTime.now();
      return alerts;
    } catch (e) {
      debugPrint('[AnalyticsRepository] Error fetching engagement alerts: $e');
      return _alertsCache[cacheKey] ?? [];
    }
  }

  /// Fetch engagement patterns for a student.
  Future<EngagementPatterns?> fetchEngagementPatterns(
    String studentId, {
    DateRange? period,
  }) async {
    if (!await connectivity.isOnline) {
      return null;
    }

    try {
      final queryParams = <String, dynamic>{};
      if (period != null) {
        queryParams['startDate'] = period.start.toIso8601String();
        queryParams['endDate'] = period.end.toIso8601String();
      }

      final response = await api.get(
        '/analytics/students/$studentId/engagement/patterns',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );
      return EngagementPatterns.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      debugPrint(
          '[AnalyticsRepository] Error fetching engagement patterns: $e');
      return null;
    }
  }

  /// Fetch session history for a student.
  Future<List<SessionHistoryEntry>> fetchSessionHistory(
    String studentId, {
    DateRange? period,
    int? limit,
  }) async {
    if (!await connectivity.isOnline) {
      return [];
    }

    try {
      final queryParams = <String, dynamic>{};
      if (period != null) {
        queryParams['startDate'] = period.start.toIso8601String();
        queryParams['endDate'] = period.end.toIso8601String();
      }
      if (limit != null) {
        queryParams['limit'] = limit.toString();
      }

      final response = await api.get(
        '/analytics/students/$studentId/sessions',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );
      final data = response.data as List;
      return data
          .map((json) =>
              SessionHistoryEntry.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('[AnalyticsRepository] Error fetching session history: $e');
      return [];
    }
  }

  /// Fetch engagement recommendations for a student.
  Future<List<EngagementRecommendation>> fetchEngagementRecommendations(
    String studentId,
  ) async {
    if (!await connectivity.isOnline) {
      return [];
    }

    try {
      final response = await api.get(
        '/analytics/students/$studentId/engagement/recommendations',
      );
      final data = response.data as List;
      return data
          .map((json) =>
              EngagementRecommendation.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint(
          '[AnalyticsRepository] Error fetching recommendations: $e');
      return [];
    }
  }

  /// Mark an engagement alert as resolved.
  Future<bool> resolveAlert(String alertId) async {
    if (!await connectivity.isOnline) {
      return false;
    }

    try {
      await api.patch('/analytics/engagement/alerts/$alertId/resolve');
      // Invalidate alerts cache
      _alertsCache.clear();
      return true;
    } catch (e) {
      debugPrint('[AnalyticsRepository] Error resolving alert: $e');
      return false;
    }
  }

  /// Clear all caches.
  void clearCache() {
    _classEngagementCache.clear();
    _studentEngagementCache.clear();
    _timelineCache.clear();
    _contentEngagementCache.clear();
    _alertsCache.clear();
    _cacheTime = null;
  }

  /// Force refresh class engagement data.
  Future<ClassEngagement?> refreshClassEngagement(
    String classId,
    DateRange period,
  ) async {
    final cacheKey = '$classId-${period.start.toIso8601String()}';
    _classEngagementCache.remove(cacheKey);
    return fetchClassEngagement(classId, period);
  }

  /// Force refresh student engagement data.
  Future<StudentEngagement?> refreshStudentEngagement(
    String studentId,
    DateRange period,
  ) async {
    final cacheKey = '$studentId-${period.start.toIso8601String()}';
    _studentEngagementCache.remove(cacheKey);
    return fetchStudentEngagement(studentId, period);
  }
}
