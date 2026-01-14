/// Repository for LMS/Google Classroom integration
/// Handles OAuth, sync, assignments, and grade passback
library;

import 'package:flutter_common/flutter_common.dart';
import '../models/lms_integration.dart';
import '../services/database/local_database.dart';
import '../services/sync/sync_service.dart';
import '../services/sync/connectivity_monitor.dart';

/// Repository for Google Classroom integration operations
class LmsRepository {
  LmsRepository({
    required AivoApiClient api,
    required LocalDatabase db,
    required SyncService sync,
    required ConnectivityMonitor connectivity,
  })  : _api = api,
        _db = db,
        _sync = sync,
        _connectivity = connectivity;

  final AivoApiClient _api;
  final LocalDatabase _db;
  final SyncService _sync;
  final ConnectivityMonitor _connectivity;

  static const String _basePath = '/api/google-classroom';

  // ==========================================================================
  // AUTHENTICATION / CONNECTION
  // ==========================================================================

  /// Get current connection status
  Future<GoogleClassroomConnectionStatus> getConnectionStatus() async {
    // Check cached status first
    final cached = await _db.getCachedLmsConnectionStatus();

    if (await _connectivity.isOnline) {
      try {
        final response = await _api.get('$_basePath/status');
        final status = GoogleClassroomConnectionStatus.fromJson(
          response.data as Map<String, dynamic>,
        );

        // Cache the status
        await _db.cacheLmsConnectionStatus(status);

        return status;
      } catch (e) {
        if (cached != null) return cached;
        rethrow;
      }
    }

    return cached ?? GoogleClassroomConnectionStatus.disconnected;
  }

  /// Get OAuth authorization URL for connecting Google Classroom
  Future<String> getConnectUrl() async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required to connect Google Classroom');
    }

    final response = await _api.get('$_basePath/auth/connect');
    return response.data['url'] as String;
  }

  /// Disconnect Google Classroom integration
  Future<void> disconnect() async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required to disconnect');
    }

    await _api.delete('$_basePath/auth/disconnect');

    // Clear cached data
    await _db.clearLmsCache();
  }

  // ==========================================================================
  // COURSES
  // ==========================================================================

  /// Get list of teacher's Google Classroom courses
  Future<List<ClassroomCourse>> getCourses() async {
    final cached = await _db.getCachedClassroomCourses();

    if (await _connectivity.isOnline) {
      try {
        final response = await _api.get('$_basePath/courses');
        final courses = (response.data as List<dynamic>)
            .map((json) => ClassroomCourse.fromJson(json as Map<String, dynamic>))
            .toList();

        // Cache courses
        await _db.cacheClassroomCourses(courses);

        return courses;
      } catch (e) {
        if (cached.isNotEmpty) return cached;
        rethrow;
      }
    }

    return cached;
  }

  /// Get a single course by ID
  Future<ClassroomCourse> getCourse(String courseId) async {
    final cached = await _db.getCachedClassroomCourse(courseId);

    if (await _connectivity.isOnline) {
      try {
        final response = await _api.get('$_basePath/courses/$courseId');
        final course = ClassroomCourse.fromJson(
          response.data as Map<String, dynamic>,
        );

        return course;
      } catch (e) {
        if (cached != null) return cached;
        rethrow;
      }
    }

    if (cached != null) return cached;
    throw Exception('Course not available offline');
  }

  // ==========================================================================
  // COURSE MAPPINGS
  // ==========================================================================

  /// Get course mappings
  Future<List<CourseMapping>> getMappings() async {
    final cached = await _db.getCachedCourseMappings();

    if (await _connectivity.isOnline) {
      try {
        final response = await _api.get('$_basePath/mappings');
        final mappings = (response.data as List<dynamic>)
            .map((json) => CourseMapping.fromJson(json as Map<String, dynamic>))
            .toList();

        await _db.cacheCourseMappings(mappings);

        return mappings;
      } catch (e) {
        if (cached.isNotEmpty) return cached;
        rethrow;
      }
    }

    return cached;
  }

  /// Create a new course mapping
  Future<CourseMapping> createMapping({
    required String googleCourseId,
    required String classId,
    bool autoSync = true,
    bool syncGuardians = false,
  }) async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required');
    }

    final response = await _api.post(
      '$_basePath/mappings',
      data: {
        'googleCourseId': googleCourseId,
        'classId': classId,
        'autoSync': autoSync,
        'syncGuardians': syncGuardians,
      },
    );

    final mapping = CourseMapping.fromJson(response.data as Map<String, dynamic>);

    // Refresh cached mappings
    await getMappings();

    return mapping;
  }

  /// Delete a course mapping
  Future<void> deleteMapping(String mappingId) async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required');
    }

    await _api.delete('$_basePath/mappings/$mappingId');

    // Refresh cached mappings
    await getMappings();
  }

  // ==========================================================================
  // SYNC OPERATIONS
  // ==========================================================================

  /// Sync a single course roster
  Future<SyncResult> syncCourse(
    String courseId, {
    bool fullSync = false,
    bool syncGuardians = false,
  }) async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required for sync');
    }

    final response = await _api.post(
      '$_basePath/courses/$courseId/sync',
      data: {
        'full': fullSync,
        'syncGuardians': syncGuardians,
      },
    );

    return SyncResult.fromJson(response.data as Map<String, dynamic>);
  }

  /// Sync all linked courses
  Future<List<SyncResult>> syncAllCourses() async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required for sync');
    }

    final response = await _api.post('$_basePath/sync/all');
    return (response.data as List<dynamic>)
        .map((json) => SyncResult.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Get sync history
  Future<List<SyncHistoryEntry>> getSyncHistory({
    String? courseId,
    String? classId,
    int limit = 50,
  }) async {
    final cached = await _db.getCachedSyncHistory(courseId: courseId);

    if (await _connectivity.isOnline) {
      try {
        final response = await _api.get(
          '$_basePath/sync/history',
          queryParameters: {
            if (courseId != null) 'courseId': courseId,
            if (classId != null) 'classId': classId,
            'limit': limit,
          },
        );

        final history = (response.data as List<dynamic>)
            .map((json) => SyncHistoryEntry.fromJson(json as Map<String, dynamic>))
            .toList();

        await _db.cacheSyncHistory(history, courseId: courseId);

        return history;
      } catch (e) {
        if (cached.isNotEmpty) return cached;
        rethrow;
      }
    }

    return cached;
  }

  // ==========================================================================
  // ASSIGNMENTS
  // ==========================================================================

  /// Post a lesson as an assignment to Google Classroom
  Future<AssignmentLink> postAssignment(PostAssignmentRequest request) async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required');
    }

    final response = await _api.post(
      '$_basePath/assignments',
      data: request.toJson(),
    );

    return AssignmentLink.fromJson(response.data as Map<String, dynamic>);
  }

  /// Get linked assignments
  Future<List<AssignmentLink>> getAssignments({String? courseId}) async {
    final cached = await _db.getCachedAssignmentLinks(courseId: courseId);

    if (await _connectivity.isOnline) {
      try {
        final response = await _api.get(
          '$_basePath/assignments',
          queryParameters: {
            if (courseId != null) 'courseId': courseId,
          },
        );

        final assignments = (response.data as List<dynamic>)
            .map((json) => AssignmentLink.fromJson(json as Map<String, dynamic>))
            .toList();

        await _db.cacheAssignmentLinks(assignments, courseId: courseId);

        return assignments;
      } catch (e) {
        if (cached.isNotEmpty) return cached;
        rethrow;
      }
    }

    return cached;
  }

  /// Delete an assignment link
  Future<void> deleteAssignment(String assignmentId) async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required');
    }

    await _api.delete('$_basePath/assignments/$assignmentId');
  }

  // ==========================================================================
  // GRADE PASSBACK
  // ==========================================================================

  /// Get pending grades awaiting sync
  Future<List<PendingGrade>> getPendingGrades({String? courseId}) async {
    final cached = await _db.getCachedPendingGrades(courseId: courseId);

    if (await _connectivity.isOnline) {
      try {
        final response = await _api.get(
          '$_basePath/grades/pending',
          queryParameters: {
            if (courseId != null) 'courseId': courseId,
          },
        );

        final grades = (response.data as List<dynamic>)
            .map((json) => PendingGrade.fromJson(json as Map<String, dynamic>))
            .toList();

        await _db.cachePendingGrades(grades, courseId: courseId);

        return grades;
      } catch (e) {
        if (cached.isNotEmpty) return cached;
        rethrow;
      }
    }

    return cached;
  }

  /// Sync a single grade to Google Classroom
  Future<void> syncGrade({
    required String assignmentId,
    required String studentId,
    required double score,
    bool returnToStudent = true,
  }) async {
    if (!await _connectivity.isOnline) {
      // Queue for later sync
      await _sync.queueOperation(
        entityType: 'grade_passback',
        entityId: '$assignmentId-$studentId',
        operation: 'sync',
        data: {
          'assignmentId': assignmentId,
          'studentId': studentId,
          'score': score,
          'returnToStudent': returnToStudent,
        },
      );
      return;
    }

    await _api.post(
      '$_basePath/grades',
      data: {
        'assignmentId': assignmentId,
        'studentId': studentId,
        'score': score,
        'returnToStudent': returnToStudent,
      },
    );
  }

  /// Batch sync grades to Google Classroom
  Future<GradePassbackResult> syncGradesBatch({
    required String courseId,
    required List<String> gradeIds,
  }) async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required for batch grade sync');
    }

    final response = await _api.post(
      '$_basePath/grades/batch',
      data: {
        'courseId': courseId,
        'gradeIds': gradeIds,
      },
    );

    final result = GradePassbackResult.fromJson(response.data as Map<String, dynamic>);

    // Refresh pending grades
    await getPendingGrades(courseId: courseId);

    return result;
  }

  /// Auto-sync all pending grades
  Future<GradePassbackResult> autoSyncGrades() async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required');
    }

    final response = await _api.post('$_basePath/grades/auto-sync');
    return GradePassbackResult.fromJson(response.data as Map<String, dynamic>);
  }

  // ==========================================================================
  // CACHE MANAGEMENT
  // ==========================================================================

  /// Clear all LMS cached data
  Future<void> clearCache() async {
    await _db.clearLmsCache();
  }

  /// Refresh all LMS data in background
  Future<void> refreshInBackground() async {
    if (!await _connectivity.isOnline) return;

    try {
      await Future.wait([
        getConnectionStatus(),
        getCourses(),
        getMappings(),
        getPendingGrades(),
      ]);
    } catch (_) {
      // Ignore errors in background refresh
    }
  }
}
