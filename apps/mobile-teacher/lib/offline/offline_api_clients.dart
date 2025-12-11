/// Offline API Clients for Teacher App
///
/// Implements the API client interfaces required by SyncManager
/// for teacher-specific functionality.
library;

import 'package:dio/dio.dart';
import 'package:flutter_common/flutter_common.dart';

// ══════════════════════════════════════════════════════════════════════════════
// TEACHER PLAN API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// Teacher plan API client implementation.
///
/// Teachers fetch class/group plans rather than individual learner plans.
class TeacherPlanApiClient implements PlanApiClient {
  TeacherPlanApiClient({required this.dio, this.baseUrl});

  final Dio dio;
  final String? baseUrl;

  String get _baseUrl => baseUrl ?? 'https://api.aivo.app';

  @override
  Future<Map<String, dynamic>> generateTodaysPlan(String learnerId) async {
    // For teachers, learnerId is actually a classId or groupId
    final response = await dio.get(
      '$_baseUrl/teacher-planning/classes/$learnerId/today',
    );
    return response.data as Map<String, dynamic>;
  }

  /// Fetch plans for multiple learners in a class.
  Future<List<Map<String, dynamic>>> fetchClassPlans(String classId) async {
    final response = await dio.get(
      '$_baseUrl/teacher-planning/classes/$classId/learner-plans',
    );
    return (response.data as List).cast<Map<String, dynamic>>();
  }

  /// Fetch teacher's assigned groups/classes.
  Future<List<Map<String, dynamic>>> fetchTeacherGroups(String teacherId) async {
    final response = await dio.get(
      '$_baseUrl/teacher-planning/teachers/$teacherId/groups',
    );
    return (response.data as List).cast<Map<String, dynamic>>();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TEACHER SESSION API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// Teacher session API client for classroom sessions.
class TeacherSessionApiClient implements SessionApiClient {
  TeacherSessionApiClient({required this.dio, this.baseUrl});

  final Dio dio;
  final String? baseUrl;

  String get _baseUrl => baseUrl ?? 'https://api.aivo.app';

  @override
  Future<Map<String, dynamic>> createSession({
    required String learnerId,
    required String subject,
    required String sessionType,
    required DateTime startedAt,
    required bool offlineOrigin,
    String? localSessionId,
  }) async {
    final response = await dio.post(
      '$_baseUrl/session/classroom-sessions',
      data: {
        'classId': learnerId, // For teachers, this is classId
        'subject': subject,
        'sessionType': sessionType,
        'startedAt': startedAt.millisecondsSinceEpoch,
        'offlineOrigin': offlineOrigin,
        'localSessionId': localSessionId,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<void> endSession(String sessionId) async {
    await dio.patch(
      '$_baseUrl/session/classroom-sessions/$sessionId/end',
      data: {'endedAt': DateTime.now().millisecondsSinceEpoch},
    );
  }

  /// Create an attendance record for a classroom session.
  Future<Map<String, dynamic>> recordAttendance({
    required String sessionId,
    required String learnerId,
    required String status, // present, absent, tardy
    String? notes,
  }) async {
    final response = await dio.post(
      '$_baseUrl/session/classroom-sessions/$sessionId/attendance',
      data: {
        'learnerId': learnerId,
        'status': status,
        'notes': notes,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Batch upload attendance records.
  Future<void> batchRecordAttendance({
    required String sessionId,
    required List<Map<String, dynamic>> attendanceRecords,
  }) async {
    await dio.post(
      '$_baseUrl/session/classroom-sessions/$sessionId/attendance/batch',
      data: {'records': attendanceRecords},
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TEACHER EVENT API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// Teacher event API client for observation and note events.
class TeacherEventApiClient implements EventApiClient {
  TeacherEventApiClient({required this.dio, this.baseUrl});

  final Dio dio;
  final String? baseUrl;

  String get _baseUrl => baseUrl ?? 'https://api.aivo.app';

  @override
  Future<void> batchUploadEvents({
    required String sessionId,
    required List<Map<String, dynamic>> events,
  }) async {
    await dio.post(
      '$_baseUrl/session/classroom-sessions/$sessionId/events/batch',
      data: {'events': events},
    );
  }

  /// Upload a teacher observation/note.
  Future<Map<String, dynamic>> uploadObservation({
    required String sessionId,
    required String learnerId,
    required String observationType,
    required String content,
    Map<String, dynamic>? metadata,
  }) async {
    final response = await dio.post(
      '$_baseUrl/session/classroom-sessions/$sessionId/observations',
      data: {
        'learnerId': learnerId,
        'type': observationType,
        'content': content,
        'metadata': metadata,
      },
    );
    return response.data as Map<String, dynamic>;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TEACHER CONTENT API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// Teacher content API client.
///
/// Teachers may need lesson plans, teaching guides, and student materials.
class TeacherContentApiClient implements ContentApiClient {
  TeacherContentApiClient({required this.dio, this.baseUrl});

  final Dio dio;
  final String? baseUrl;

  String get _baseUrl => baseUrl ?? 'https://api.aivo.app';

  @override
  Future<List<Map<String, dynamic>>> batchFetchContent(
    List<String> contentKeys,
  ) async {
    final response = await dio.post(
      '$_baseUrl/content/batch',
      data: {'keys': contentKeys},
    );
    return (response.data as List).cast<Map<String, dynamic>>();
  }

  /// Fetch lesson plan for a specific activity.
  Future<Map<String, dynamic>> fetchLessonPlan(String activityId) async {
    final response = await dio.get(
      '$_baseUrl/teacher-planning/lesson-plans/$activityId',
    );
    return response.data as Map<String, dynamic>;
  }

  /// Fetch teaching guide for a content item.
  Future<Map<String, dynamic>> fetchTeachingGuide(String contentKey) async {
    final response = await dio.get(
      '$_baseUrl/content/$contentKey/teaching-guide',
    );
    return response.data as Map<String, dynamic>;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TEACHER NOTES API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// API client for teacher notes and observations.
class TeacherNotesApiClient {
  TeacherNotesApiClient({required this.dio, this.baseUrl});

  final Dio dio;
  final String? baseUrl;

  String get _baseUrl => baseUrl ?? 'https://api.aivo.app';

  /// Upload a batch of teacher notes.
  Future<void> batchUploadNotes(List<Map<String, dynamic>> notes) async {
    await dio.post(
      '$_baseUrl/teacher-planning/notes/batch',
      data: {'notes': notes},
    );
  }

  /// Fetch notes for a learner.
  Future<List<Map<String, dynamic>>> fetchLearnerNotes(String learnerId) async {
    final response = await dio.get(
      '$_baseUrl/teacher-planning/learners/$learnerId/notes',
    );
    return (response.data as List).cast<Map<String, dynamic>>();
  }

  /// Upload a single note.
  Future<Map<String, dynamic>> uploadNote({
    required String learnerId,
    required String noteType,
    required String content,
    Map<String, dynamic>? metadata,
  }) async {
    final response = await dio.post(
      '$_baseUrl/teacher-planning/notes',
      data: {
        'learnerId': learnerId,
        'type': noteType,
        'content': content,
        'metadata': metadata,
      },
    );
    return response.data as Map<String, dynamic>;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// API client for attendance management.
class AttendanceApiClient {
  AttendanceApiClient({required this.dio, this.baseUrl});

  final Dio dio;
  final String? baseUrl;

  String get _baseUrl => baseUrl ?? 'https://api.aivo.app';

  /// Upload batch attendance records.
  Future<void> batchUploadAttendance(List<Map<String, dynamic>> records) async {
    await dio.post(
      '$_baseUrl/session/attendance/batch',
      data: {'records': records},
    );
  }

  /// Fetch attendance for a class on a given date.
  Future<List<Map<String, dynamic>>> fetchClassAttendance({
    required String classId,
    required String date,
  }) async {
    final response = await dio.get(
      '$_baseUrl/session/classes/$classId/attendance',
      queryParameters: {'date': date},
    );
    return (response.data as List).cast<Map<String, dynamic>>();
  }
}
