/// Repository for LMS/Google Classroom integration
/// Handles OAuth, sync, assignments, and grade passback
library;

import 'package:flutter_common/flutter_common.dart' hide SyncResult;
import '../models/lms_integration.dart';
import '../services/database/local_database.dart';
import '../services/sync/sync_service.dart';
import '../services/sync/connectivity_monitor.dart';

/// Repository for Google Classroom integration operations
class LmsRepository {
  LmsRepository({
    required AivoApiClient api,
    required TeacherLocalDatabase db,
    required SyncService sync,
    required ConnectivityMonitor connectivity,
  })  : _api = api,
        _db = db,
        _sync = sync,
        _connectivity = connectivity;

  final AivoApiClient _api;
  final TeacherLocalDatabase _db;
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
        if (cached.isNotEmpty) return cached.cast<ClassroomCourse>();
        rethrow;
      }
    }

    return cached.cast<ClassroomCourse>();
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
        if (cached.isNotEmpty) return cached.cast<CourseMapping>();
        rethrow;
      }
    }

    return cached.cast<CourseMapping>();
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
  // STUDENT ROSTER & MAPPINGS
  // ==========================================================================

  /// Get students from a Google Classroom course with mapping info
  Future<List<GoogleClassroomStudent>> getCourseStudents(String courseId) async {
    final cacheKey = 'classroom_students_$courseId';
    final cached = await _db.getCachedStudents(cacheKey);

    if (await _connectivity.isOnline) {
      try {
        final response = await _api.get('$_basePath/courses/$courseId/students');
        final students = (response.data as List<dynamic>)
            .map((json) => GoogleClassroomStudent.fromJson(json as Map<String, dynamic>))
            .toList();

        // Cache students
        await _db.cacheClassroomStudents(cacheKey, students);

        return students;
      } catch (e) {
        if (cached.isNotEmpty) return cached.cast<GoogleClassroomStudent>();
        rethrow;
      }
    }

    return cached.cast<GoogleClassroomStudent>();
  }

  /// Get all student mappings for a course
  Future<List<StudentMapping>> getStudentMappings({String? courseId}) async {
    final cacheKey = courseId != null 
        ? 'student_mappings_$courseId' 
        : 'student_mappings_all';
    final cached = await _db.getCachedStudentMappings(cacheKey);

    if (await _connectivity.isOnline) {
      try {
        final response = await _api.get(
          '$_basePath/students/mappings',
          queryParameters: {
            if (courseId != null) 'courseId': courseId,
          },
        );
        
        final mappings = (response.data as List<dynamic>)
            .map((json) => StudentMapping.fromJson(json as Map<String, dynamic>))
            .toList();

        await _db.cacheStudentMappings(cacheKey, mappings);

        return mappings;
      } catch (e) {
        if (cached.isNotEmpty) return cached.cast<StudentMapping>();
        rethrow;
      }
    }

    return cached.cast<StudentMapping>();
  }

  /// Map a Google Classroom student to an AIVO student
  Future<StudentMapping> mapStudentToAivo({
    required String googleUserId,
    required String aivoStudentId,
    required String courseId,
  }) async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required');
    }

    final response = await _api.post(
      '$_basePath/students/mappings',
      data: {
        'googleUserId': googleUserId,
        'aivoStudentId': aivoStudentId,
        'courseId': courseId,
      },
    );

    final mapping = StudentMapping.fromJson(response.data as Map<String, dynamic>);

    // Refresh cached student data
    await getCourseStudents(courseId);

    return mapping;
  }

  /// Remove a student mapping
  Future<void> unmapStudent(String mappingId, {String? courseId}) async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required');
    }

    await _api.delete('$_basePath/students/mappings/$mappingId');

    // Refresh cached data if courseId provided
    if (courseId != null) {
      await getCourseStudents(courseId);
    }
  }

  /// Auto-map students by matching email addresses
  Future<List<StudentMapping>> autoMapStudents(String courseId) async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required');
    }

    final response = await _api.post(
      '$_basePath/courses/$courseId/students/auto-map',
    );

    final mappings = (response.data as List<dynamic>)
        .map((json) => StudentMapping.fromJson(json as Map<String, dynamic>))
        .toList();

    // Refresh cached student data
    await getCourseStudents(courseId);

    return mappings;
  }

  /// Get list of AIVO students available for mapping
  Future<List<Map<String, dynamic>>> getAivoStudentsForMapping(
    String classId, {
    String? searchQuery,
  }) async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required');
    }

    final response = await _api.get(
      '/api/classes/$classId/students',
      queryParameters: {
        'unmappedOnly': true,
        if (searchQuery != null && searchQuery.isNotEmpty) 'search': searchQuery,
      },
    );

    return (response.data as List<dynamic>)
        .map((json) => json as Map<String, dynamic>)
        .toList();
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
    final cached = await _db.getCachedSyncHistory();

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

        await _db.cacheSyncHistory(history);

        return history;
      } catch (e) {
        if (cached.isNotEmpty) return cached.cast<SyncHistoryEntry>();
        rethrow;
      }
    }

    return cached.cast<SyncHistoryEntry>();
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
    final cached = await _db.getCachedAssignmentLinks();

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

        await _db.cacheAssignmentLinks(assignments);

        return assignments;
      } catch (e) {
        if (cached.isNotEmpty) return cached.cast<AssignmentLink>();
        rethrow;
      }
    }

    return cached.cast<AssignmentLink>();
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
    final cached = await _db.getCachedPendingGrades();

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

        await _db.cachePendingGrades(grades);

        return grades;
      } catch (e) {
        if (cached.isNotEmpty) return cached.cast<PendingGrade>();
        rethrow;
      }
    }

    return cached.cast<PendingGrade>();
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
      await _sync.queueUpdate(
        entityType: 'grade_passback',
        entityId: '$assignmentId-$studentId',
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

  /// Retry failed grade passbacks
  Future<GradePassbackResult> retryFailedPassbacks({String? courseId}) async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required');
    }

    final response = await _api.post(
      '$_basePath/grades/retry-failed',
      data: courseId != null ? {'courseId': courseId} : null,
    );
    return GradePassbackResult.fromJson(response.data as Map<String, dynamic>);
  }

  /// Get passback history (recent sync attempts)
  Future<List<GradePassbackQueueItem>> getPassbackHistory({
    String? courseId,
    int limit = 50,
  }) async {
    final queryParams = <String, dynamic>{
      'limit': limit.toString(),
      if (courseId != null) 'courseId': courseId,
    };

    // Try to get from API if online
    if (await _connectivity.isOnline) {
      try {
        final response = await _api.get(
          '$_basePath/grades/history',
          queryParameters: queryParams,
        );
        final history = (response.data as List<dynamic>)
            .map((json) => GradePassbackQueueItem.fromJson(json as Map<String, dynamic>))
            .toList();

        // Cache history
        await _db.cachePassbackHistory(history);

        return history;
      } catch (e) {
        // Fall through to cached data
      }
    }

    // Return cached data
    return await _db.getCachedPassbackHistory() ?? [];
  }

  // ==========================================================================
  // PASSBACK SETTINGS
  // ==========================================================================

  /// Get grade passback settings
  Future<PassbackSettings> getPassbackSettings() async {
    // Check for cached settings first
    final cached = await _db.getCachedPassbackSettings();

    if (await _connectivity.isOnline) {
      try {
        final response = await _api.get('$_basePath/settings/passback');
        final settings = PassbackSettings.fromJson(
          response.data as Map<String, dynamic>,
        );

        // Cache settings
        await _db.cachePassbackSettings(settings);

        return settings;
      } catch (e) {
        if (cached != null) return cached;
        // Return defaults if no cached data and API fails
        return const PassbackSettings();
      }
    }

    return cached ?? const PassbackSettings();
  }

  /// Update grade passback settings
  Future<PassbackSettings> updatePassbackSettings(PassbackSettings settings) async {
    // Always cache locally first for offline support
    await _db.cachePassbackSettings(settings);

    if (!await _connectivity.isOnline) {
      // Queue settings update for later sync
      await _sync.queueUpdate(
        entityType: 'passback_settings',
        entityId: 'current',
        data: settings.toJson(),
      );
      return settings;
    }

    final response = await _api.put(
      '$_basePath/settings/passback',
      data: settings.toJson(),
    );

    return PassbackSettings.fromJson(response.data as Map<String, dynamic>);
  }

  /// Queue a grade for passback (used when saving grades offline)
  Future<void> queueGradeForPassback({
    required String gradeId,
    required String studentId,
    required String studentName,
    required String assignmentId,
    required String assignmentTitle,
    required double score,
    required double maxPoints,
  }) async {
    final item = GradePassbackQueueItem(
      id: 'queue_${DateTime.now().millisecondsSinceEpoch}',
      gradeId: gradeId,
      studentId: studentId,
      studentName: studentName,
      assignmentId: assignmentId,
      assignmentTitle: assignmentTitle,
      score: score,
      maxPoints: maxPoints,
      status: GradeSyncStatus.pending,
      createdAt: DateTime.now(),
    );

    await _db.addToPassbackQueue(item);

    // Try to sync immediately if online
    if (await _connectivity.isOnline) {
      try {
        await syncGrade(
          assignmentId: assignmentId,
          studentId: studentId,
          score: score,
        );
        // Mark as synced
        await _db.updatePassbackQueueItemStatus(item.id, GradeSyncStatus.synced);
      } catch (e) {
        // Keep in queue for retry
        await _db.updatePassbackQueueItemStatus(
          item.id,
          GradeSyncStatus.failed,
          error: e.toString(),
        );
      }
    }
  }

  /// Get pending items from the passback queue
  Future<List<GradePassbackQueueItem>> getPassbackQueue() async {
    return await _db.getPassbackQueue();
  }

  /// Process pending items in the passback queue
  Future<GradePassbackResult> processPassbackQueue() async {
    if (!await _connectivity.isOnline) {
      throw Exception('Internet connection required');
    }

    final queue = await _db.getPassbackQueue();
    final pendingItems = queue.where((item) => item.canRetry).toList();

    if (pendingItems.isEmpty) {
      return const GradePassbackResult(
        successful: 0,
        failed: 0,
        errors: [],
      );
    }

    int successful = 0;
    int failed = 0;
    final errors = <GradePassbackError>[];

    for (final item in pendingItems) {
      try {
        await syncGrade(
          assignmentId: item.assignmentId,
          studentId: item.studentId,
          score: item.score,
        );
        await _db.updatePassbackQueueItemStatus(item.id, GradeSyncStatus.synced);
        successful++;
      } catch (e) {
        await _db.updatePassbackQueueItemStatus(
          item.id,
          GradeSyncStatus.failed,
          error: e.toString(),
          incrementAttempt: true,
        );
        failed++;
        errors.add(GradePassbackError(
          studentId: item.studentId,
          error: e.toString(),
        ));
      }
    }

    return GradePassbackResult(
      successful: successful,
      failed: failed,
      errors: errors,
    );
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
