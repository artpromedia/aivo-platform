/// Integration Repository
///
/// Data access for platform integrations (Google Classroom, Canvas, Clever).
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_common/flutter_common.dart';

import '../models/integration.dart';
import '../services/sync/connectivity_monitor.dart';

/// Repository for integration data access.
class IntegrationRepository {
  IntegrationRepository({
    required this.api,
    required this.connectivity,
  });

  final AivoApiClient api;
  final ConnectivityMonitor connectivity;

  // ════════════════════════════════════════════════════════════════════════════
  // CONNECTION STATUS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get connection status for all integrations.
  Future<Map<IntegrationType, IntegrationConnection>> getConnectionStatus() async {
    if (!await connectivity.isOnline) {
      return {};
    }

    try {
      final response = await api.get('/integrations/status');
      final data = response.data as Map<String, dynamic>;

      return {
        if (data['googleClassroom'] != null)
          IntegrationType.googleClassroom: IntegrationConnection.fromJson(
            data['googleClassroom'] as Map<String, dynamic>,
          ),
        if (data['canvas'] != null)
          IntegrationType.canvas: IntegrationConnection.fromJson(
            data['canvas'] as Map<String, dynamic>,
          ),
        if (data['clever'] != null)
          IntegrationType.clever: IntegrationConnection.fromJson(
            data['clever'] as Map<String, dynamic>,
          ),
      };
    } catch (e) {
      debugPrint('[IntegrationRepository] Error getting connection status: $e');
      return {};
    }
  }

  /// Get Google Classroom connection status.
  Future<IntegrationConnection?> getGoogleClassroomStatus() async {
    if (!await connectivity.isOnline) {
      return null;
    }

    try {
      final response = await api.get('/integrations/google-classroom/status');
      return IntegrationConnection.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      debugPrint('[IntegrationRepository] Error getting GC status: $e');
      return null;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // OAUTH / CONNECTION
  // ════════════════════════════════════════════════════════════════════════════

  /// Get OAuth URL for connecting Google Classroom.
  Future<String?> getGoogleClassroomAuthUrl() async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot connect while offline');
    }

    try {
      final response = await api.get('/integrations/google-classroom/auth/connect');
      return response.data['authUrl'] as String?;
    } catch (e) {
      debugPrint('[IntegrationRepository] Error getting auth URL: $e');
      rethrow;
    }
  }

  /// Disconnect Google Classroom.
  Future<void> disconnectGoogleClassroom() async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot disconnect while offline');
    }

    await api.post('/integrations/google-classroom/auth/disconnect');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // COURSES
  // ════════════════════════════════════════════════════════════════════════════

  /// Get available Google Classroom courses.
  Future<List<GoogleClassroomCourse>> getGoogleClassroomCourses() async {
    if (!await connectivity.isOnline) {
      return [];
    }

    try {
      final response = await api.get('/integrations/google-classroom/courses');
      final data = response.data as List;
      return data
          .map((json) => GoogleClassroomCourse.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('[IntegrationRepository] Error getting courses: $e');
      return [];
    }
  }

  /// Get course roster from Google Classroom.
  Future<List<Map<String, dynamic>>> getGoogleClassroomRoster(String courseId) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot fetch roster while offline');
    }

    final response = await api.get('/integrations/google-classroom/courses/$courseId/roster');
    return (response.data as List).cast<Map<String, dynamic>>();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MAPPINGS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get all course mappings.
  Future<List<CourseMapping>> getMappings() async {
    if (!await connectivity.isOnline) {
      return [];
    }

    try {
      final response = await api.get('/integrations/google-classroom/mappings');
      final data = response.data as List;
      return data
          .map((json) => CourseMapping.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('[IntegrationRepository] Error getting mappings: $e');
      return [];
    }
  }

  /// Create a course mapping.
  Future<CourseMapping> createMapping({
    required String aivoClassId,
    required String externalCourseId,
    required IntegrationType integrationType,
    bool syncRoster = true,
    bool syncGrades = true,
    bool syncAssignments = true,
  }) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot create mapping while offline');
    }

    final response = await api.post(
      '/integrations/google-classroom/mappings',
      data: {
        'aivoClassId': aivoClassId,
        'externalCourseId': externalCourseId,
        'integrationType': integrationType.name,
        'syncRoster': syncRoster,
        'syncGrades': syncGrades,
        'syncAssignments': syncAssignments,
      },
    );

    return CourseMapping.fromJson(response.data as Map<String, dynamic>);
  }

  /// Update a course mapping.
  Future<CourseMapping> updateMapping(String mappingId, {
    bool? syncRoster,
    bool? syncGrades,
    bool? syncAssignments,
  }) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot update mapping while offline');
    }

    final response = await api.patch(
      '/integrations/google-classroom/mappings/$mappingId',
      data: {
        if (syncRoster != null) 'syncRoster': syncRoster,
        if (syncGrades != null) 'syncGrades': syncGrades,
        if (syncAssignments != null) 'syncAssignments': syncAssignments,
      },
    );

    return CourseMapping.fromJson(response.data as Map<String, dynamic>);
  }

  /// Delete a course mapping.
  Future<void> deleteMapping(String mappingId) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot delete mapping while offline');
    }

    await api.delete('/integrations/google-classroom/mappings/$mappingId');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SYNC
  // ════════════════════════════════════════════════════════════════════════════

  /// Sync a single course.
  Future<SyncHistoryEntry> syncCourse(String courseId) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot sync while offline');
    }

    final response = await api.post('/integrations/google-classroom/courses/$courseId/sync');
    return SyncHistoryEntry.fromJson(response.data as Map<String, dynamic>);
  }

  /// Sync all mapped courses.
  Future<List<SyncHistoryEntry>> syncAll() async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot sync while offline');
    }

    final response = await api.post('/integrations/google-classroom/sync/all');
    final data = response.data as List;
    return data
        .map((json) => SyncHistoryEntry.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Get sync history.
  Future<List<SyncHistoryEntry>> getSyncHistory({int limit = 20}) async {
    if (!await connectivity.isOnline) {
      return [];
    }

    try {
      final response = await api.get(
        '/integrations/google-classroom/sync/history',
        queryParameters: {'limit': limit},
      );
      final data = response.data as List;
      return data
          .map((json) => SyncHistoryEntry.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('[IntegrationRepository] Error getting sync history: $e');
      return [];
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GRADE PASSBACK
  // ════════════════════════════════════════════════════════════════════════════

  /// Get pending grade passbacks.
  Future<List<PendingGradePassback>> getPendingGrades() async {
    if (!await connectivity.isOnline) {
      return [];
    }

    try {
      final response = await api.get('/integrations/google-classroom/grades/pending');
      final data = response.data as List;
      return data
          .map((json) => PendingGradePassback.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('[IntegrationRepository] Error getting pending grades: $e');
      return [];
    }
  }

  /// Sync grades to Google Classroom.
  Future<int> syncGrades(List<PendingGradePassback> grades) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot sync grades while offline');
    }

    final response = await api.post(
      '/integrations/google-classroom/grades/batch',
      data: {
        'grades': grades.map((g) => g.toJson()).toList(),
      },
    );

    return response.data['syncedCount'] as int? ?? 0;
  }

  /// Enable/disable auto grade sync.
  Future<void> setAutoGradeSync(bool enabled) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot update settings while offline');
    }

    await api.post(
      '/integrations/google-classroom/grades/auto-sync',
      data: {'enabled': enabled},
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ASSIGNMENTS
  // ════════════════════════════════════════════════════════════════════════════

  /// Post an assignment to Google Classroom.
  Future<String> postAssignment({
    required String aivoAssignmentId,
    required String externalCourseId,
    String? title,
    String? description,
    DateTime? dueDate,
    double? maxPoints,
  }) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot post assignment while offline');
    }

    final response = await api.post(
      '/integrations/google-classroom/assignments',
      data: {
        'aivoAssignmentId': aivoAssignmentId,
        'externalCourseId': externalCourseId,
        if (title != null) 'title': title,
        if (description != null) 'description': description,
        if (dueDate != null) 'dueDate': dueDate.toIso8601String(),
        if (maxPoints != null) 'maxPoints': maxPoints,
      },
    );

    return response.data['externalAssignmentId'] as String;
  }

  /// Get assignments posted to Google Classroom.
  Future<List<Map<String, dynamic>>> getPostedAssignments() async {
    if (!await connectivity.isOnline) {
      return [];
    }

    final response = await api.get('/integrations/google-classroom/assignments');
    return (response.data as List).cast<Map<String, dynamic>>();
  }
}
