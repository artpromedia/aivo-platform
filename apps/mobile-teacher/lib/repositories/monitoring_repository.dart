/// Monitoring Repository
///
/// Repository for real-time monitoring and SEL observations.
library;

import 'package:dio/dio.dart';

import '../models/monitoring.dart';

/// Repository for monitoring operations.
class MonitoringRepository {
  MonitoringRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  // ============================================================
  // Engagement Heatmap
  // ============================================================

  /// Fetch real-time engagement heatmap for a class.
  Future<EngagementHeatmap> fetchEngagementHeatmap(String classId) async {
    final response = await _dio.get('/api/v1/classes/$classId/heatmap');
    return EngagementHeatmap.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetch individual student activity.
  Future<StudentActivity> fetchStudentActivity(String classId, String studentId) async {
    final response = await _dio.get('/api/v1/classes/$classId/students/$studentId/activity');
    return StudentActivity.fromJson(response.data as Map<String, dynamic>);
  }

  /// Send nudge/notification to a student.
  Future<void> sendNudge(String classId, String studentId, {String? message}) async {
    await _dio.post(
      '/api/v1/classes/$classId/students/$studentId/nudge',
      data: {
        if (message != null) 'message': message,
      },
    );
  }

  /// Flag a student for attention.
  Future<void> flagStudent(String classId, String studentId, String flag) async {
    await _dio.post(
      '/api/v1/classes/$classId/students/$studentId/flag',
      data: {'flag': flag},
    );
  }

  // ============================================================
  // SEL Observations
  // ============================================================

  /// Fetch SEL observations for a class.
  Future<List<SELObservation>> fetchObservations(
    String classId, {
    String? studentId,
    SELCompetency? competency,
    DateTime? startDate,
    DateTime? endDate,
    int limit = 50,
  }) async {
    final response = await _dio.get(
      '/api/v1/classes/$classId/sel/observations',
      queryParameters: {
        if (studentId != null) 'studentId': studentId,
        if (competency != null) 'competency': competency.value,
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
        'limit': limit,
      },
    );
    final list = response.data as List<dynamic>;
    return list.map((e) => SELObservation.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Create a new SEL observation.
  Future<SELObservation> createObservation(String classId, SELObservation observation) async {
    final response = await _dio.post(
      '/api/v1/classes/$classId/sel/observations',
      data: observation.toJson(),
    );
    return SELObservation.fromJson(response.data as Map<String, dynamic>);
  }

  /// Update an observation.
  Future<SELObservation> updateObservation(String classId, SELObservation observation) async {
    final response = await _dio.put(
      '/api/v1/classes/$classId/sel/observations/${observation.id}',
      data: observation.toJson(),
    );
    return SELObservation.fromJson(response.data as Map<String, dynamic>);
  }

  /// Delete an observation.
  Future<void> deleteObservation(String classId, String observationId) async {
    await _dio.delete('/api/v1/classes/$classId/sel/observations/$observationId');
  }

  /// Fetch SEL summary for a student.
  Future<SELSummary> fetchStudentSELSummary(String classId, String studentId) async {
    final response = await _dio.get('/api/v1/classes/$classId/students/$studentId/sel/summary');
    return SELSummary.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetch class-wide SEL summary.
  Future<List<SELSummary>> fetchClassSELSummary(String classId) async {
    final response = await _dio.get('/api/v1/classes/$classId/sel/summary');
    final list = response.data as List<dynamic>;
    return list.map((e) => SELSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Fetch observation presets.
  Future<List<ObservationPreset>> fetchObservationPresets() async {
    final response = await _dio.get('/api/v1/sel/presets');
    final list = response.data as List<dynamic>;
    return list.map((e) => ObservationPreset.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Quick log observation using preset.
  Future<SELObservation> logQuickObservation(
    String classId,
    String studentId,
    String presetId, {
    String? note,
  }) async {
    final response = await _dio.post(
      '/api/v1/classes/$classId/sel/quick-log',
      data: {
        'studentId': studentId,
        'presetId': presetId,
        if (note != null) 'note': note,
      },
    );
    return SELObservation.fromJson(response.data as Map<String, dynamic>);
  }
}
