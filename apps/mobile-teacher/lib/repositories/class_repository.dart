/// Class Repository
///
/// Data access for classes/groups.
library;

import 'package:flutter_common/flutter_common.dart';

import '../models/models.dart';
import '../services/sync/connectivity_monitor.dart';

/// Repository for class data access.
class ClassRepository {
  ClassRepository({
    required this.api,
    required this.connectivity,
  });

  final AivoApiClient api;
  final ConnectivityMonitor connectivity;

  // In-memory cache
  List<ClassGroup>? _cachedClasses;
  DateTime? _cacheTime;
  static const _cacheValidDuration = Duration(minutes: 5);

  /// Get all classes for the teacher.
  Future<List<ClassGroup>> getClasses() async {
    // Return cache if still valid
    if (_cachedClasses != null && 
        _cacheTime != null &&
        DateTime.now().difference(_cacheTime!) < _cacheValidDuration) {
      return _cachedClasses!;
    }

    if (!await connectivity.isOnline) {
      return _cachedClasses ?? [];
    }

    try {
      final response = await api.get('/teacher-planning/classes');
      final data = response.data as List;
      final classes = data
          .map((json) => ClassGroup.fromJson(json as Map<String, dynamic>))
          .toList();
      
      _cachedClasses = classes;
      _cacheTime = DateTime.now();
      return classes;
    } catch (_) {
      return _cachedClasses ?? [];
    }
  }

  /// Get a class by ID.
  Future<ClassGroup?> getClass(String id) async {
    final classes = await getClasses();
    return classes.where((c) => c.id == id).firstOrNull;
  }

  /// Get class metrics.
  Future<ClassMetrics?> getClassMetrics(String classId, DateRange range) async {
    if (!await connectivity.isOnline) {
      return null;
    }

    try {
      final response = await api.get(
        '/analytics/classes/$classId/metrics',
        queryParameters: {
          'startDate': range.start.toIso8601String(),
          'endDate': range.end.toIso8601String(),
        },
      );
      return ClassMetrics.fromJson(response.data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  /// Get engagement heatmap.
  Future<EngagementHeatmap?> getEngagementHeatmap(String classId) async {
    if (!await connectivity.isOnline) {
      return null;
    }

    try {
      final response = await api.get('/analytics/classes/$classId/heatmap');
      return EngagementHeatmap.fromJson(response.data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  /// Get goal progress summary.
  Future<GoalProgressSummary?> getGoalProgress(String classId) async {
    if (!await connectivity.isOnline) {
      return null;
    }

    try {
      final response = await api.get('/analytics/classes/$classId/goals');
      return GoalProgressSummary.fromJson(response.data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  /// Get student alerts for a class.
  Future<List<StudentAlert>> getAlerts(String classId) async {
    if (!await connectivity.isOnline) {
      return [];
    }

    try {
      final response = await api.get('/analytics/classes/$classId/alerts');
      final data = response.data as List;
      return data
          .map((json) => StudentAlert.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Force refresh from server.
  Future<List<ClassGroup>> refreshClasses() async {
    _cachedClasses = null;
    _cacheTime = null;
    return getClasses();
  }
}
