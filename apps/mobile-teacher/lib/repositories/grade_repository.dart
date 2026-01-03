/// Grade Repository
///
/// Offline-first data access for grades and gradebook.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_common/flutter_common.dart';

import '../models/models.dart';
import '../services/database/local_database.dart';
import '../services/sync/sync_service.dart';
import '../services/sync/connectivity_monitor.dart';

/// Repository for grade data access.
class GradeRepository {
  GradeRepository({
    required this.api,
    required this.db,
    required this.sync,
    required this.connectivity,
  });

  final AivoApiClient api;
  final TeacherLocalDatabase db;
  final SyncService sync;
  final ConnectivityMonitor connectivity;

  // ════════════════════════════════════════════════════════════════════════════
  // GRADEBOOK
  // ════════════════════════════════════════════════════════════════════════════

  /// Get the gradebook for a class (offline-first).
  Future<Gradebook?> getGradebook(String classId) async {
    final cached = await db.getGradebook(classId);

    if (await connectivity.isOnline) {
      _refreshGradebookInBackground(classId);
    }

    return cached;
  }

  /// Force refresh gradebook from server.
  Future<Gradebook?> refreshGradebook(String classId) async {
    if (!await connectivity.isOnline) {
      return db.getGradebook(classId);
    }

    try {
      final response = await api.get('/classes/$classId/gradebook');
      final gradebook = Gradebook.fromJson(response.data as Map<String, dynamic>);
      await db.cacheGradebook(gradebook);
      return gradebook;
    } catch (e) {
      debugPrint('[GradeRepository] Error refreshing gradebook: $e');
      return db.getGradebook(classId);
    }
  }

  void _refreshGradebookInBackground(String classId) async {
    try {
      final response = await api.get('/classes/$classId/gradebook');
      final gradebook = Gradebook.fromJson(response.data as Map<String, dynamic>);
      await db.cacheGradebook(gradebook);
    } catch (e) {
      debugPrint('[GradeRepository] Background gradebook refresh failed: $e');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GRADES
  // ════════════════════════════════════════════════════════════════════════════

  /// Get a specific grade.
  Future<GradeEntry?> getGrade(String studentId, String assignmentId) async {
    return db.getGrade(studentId, assignmentId);
  }

  /// Get all grades for a student.
  Future<List<GradeEntry>> getGradesByStudent(String studentId) async {
    final cached = await db.getGradesByStudent(studentId);

    if (await connectivity.isOnline) {
      _refreshStudentGradesInBackground(studentId);
    }

    return cached;
  }

  /// Get all grades for an assignment.
  Future<List<GradeEntry>> getGradesByAssignment(String assignmentId) async {
    final cached = await db.getGradesByAssignment(assignmentId);

    if (await connectivity.isOnline) {
      _refreshAssignmentGradesInBackground(assignmentId);
    }

    return cached;
  }

  /// Update a grade.
  Future<GradeEntry> updateGrade(
    String studentId,
    String assignmentId,
    UpdateGradeDto dto,
  ) async {
    final existing = await db.getGrade(studentId, assignmentId);

    final updated = GradeEntry(
      id: existing?.id ?? 'grade_${studentId}_$assignmentId',
      studentId: studentId,
      assignmentId: assignmentId,
      studentName: existing?.studentName,
      assignmentTitle: existing?.assignmentTitle,
      pointsEarned: dto.pointsEarned ?? existing?.pointsEarned,
      pointsPossible: existing?.pointsPossible,
      letterGrade: existing?.letterGrade,
      percent: dto.pointsEarned != null && existing?.pointsPossible != null
          ? (dto.pointsEarned! / existing!.pointsPossible!) * 100
          : existing?.percent,
      isExcused: dto.isExcused ?? existing?.isExcused ?? false,
      isMissing: false,
      isLate: existing?.isLate ?? false,
      latePenalty: existing?.latePenalty,
      feedback: dto.feedback ?? existing?.feedback,
      gradedAt: DateTime.now(),
      syncStatus: 'pending',
    );

    await db.updateGrade(updated);
    await sync.queueUpdate(
      entityType: 'grade',
      entityId: '${studentId}_$assignmentId',
      data: {
        'studentId': studentId,
        'assignmentId': assignmentId,
        ...dto.toJson(),
      },
    );

    return updated;
  }

  /// Excuse a grade.
  Future<GradeEntry> excuseGrade(String studentId, String assignmentId) async {
    return updateGrade(studentId, assignmentId, const UpdateGradeDto(isExcused: true));
  }

  /// Remove excuse from a grade.
  Future<GradeEntry> unexcuseGrade(String studentId, String assignmentId) async {
    return updateGrade(studentId, assignmentId, const UpdateGradeDto(isExcused: false));
  }

  /// Bulk update grades.
  Future<void> bulkUpdateGrades(String assignmentId, BulkGradeDto dto) async {
    for (final entry in dto.grades) {
      final updated = GradeEntry(
        id: 'grade_${entry.studentId}_${entry.assignmentId}',
        studentId: entry.studentId,
        assignmentId: entry.assignmentId,
        pointsEarned: entry.pointsEarned,
        isExcused: entry.isExcused,
        feedback: entry.feedback,
        gradedAt: DateTime.now(),
        syncStatus: 'pending',
      );
      await db.updateGrade(updated);
    }

    if (await connectivity.isOnline) {
      try {
        await api.post(
          '/assignments/$assignmentId/grades/bulk',
          data: dto.toJson(),
        );
        // Refresh grades after bulk update
        _refreshAssignmentGradesInBackground(assignmentId);
      } catch (e) {
        await sync.queueUpdate(
          entityType: 'bulk_grades',
          entityId: assignmentId,
          data: dto.toJson(),
        );
      }
    } else {
      await sync.queueUpdate(
        entityType: 'bulk_grades',
        entityId: assignmentId,
        data: dto.toJson(),
      );
    }
  }

  void _refreshStudentGradesInBackground(String studentId) async {
    try {
      final response = await api.get('/students/$studentId/grades');
      final data = response.data as List;
      final grades = data
          .map((json) => GradeEntry.fromJson(json as Map<String, dynamic>))
          .toList();

      await db.cacheGrades(grades);
    } catch (e) {
      debugPrint('[GradeRepository] Background student grades refresh failed: $e');
    }
  }

  void _refreshAssignmentGradesInBackground(String assignmentId) async {
    try {
      final response = await api.get('/assignments/$assignmentId/grades');
      final data = response.data as List;
      final grades = data
          .map((json) => GradeEntry.fromJson(json as Map<String, dynamic>))
          .toList();

      await db.cacheGrades(grades);
    } catch (e) {
      debugPrint('[GradeRepository] Background assignment grades refresh failed: $e');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STUDENT GRADES (OVERALL)
  // ════════════════════════════════════════════════════════════════════════════

  /// Get a student's overall grade in a class.
  Future<StudentGrade?> getStudentGrade(String classId, String studentId) async {
    final cached = await db.getStudentGrade(classId, studentId);

    if (await connectivity.isOnline) {
      _refreshStudentGradeInBackground(classId, studentId);
    }

    return cached;
  }

  /// Get all student grades for a class.
  Future<List<StudentGrade>> getClassGrades(String classId) async {
    final gradebook = await getGradebook(classId);
    if (gradebook == null) return [];

    return gradebook.students
        .map((s) => s.overallGrade)
        .whereType<StudentGrade>()
        .toList();
  }

  /// Recalculate grades for a class.
  Future<void> recalculateClassGrades(String classId) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot recalculate grades while offline');
    }

    await api.post('/classes/$classId/grades/recalculate');
    _refreshGradebookInBackground(classId);
  }

  void _refreshStudentGradeInBackground(String classId, String studentId) async {
    try {
      final response = await api.get('/classes/$classId/students/$studentId/grade');
      final grade = StudentGrade.fromJson(response.data as Map<String, dynamic>);
      await db.cacheStudentGrades([grade]);
    } catch (e) {
      debugPrint('[GradeRepository] Background student grade refresh failed: $e');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EXPORT
  // ════════════════════════════════════════════════════════════════════════════

  /// Export gradebook (requires online).
  Future<String> exportGradebook(String classId, {String format = 'csv'}) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot export gradebook while offline');
    }

    final response = await api.post(
      '/classes/$classId/gradebook/export',
      data: {'format': format},
    );

    return response.data['downloadUrl'] as String;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GRADE AUDIT
  // ════════════════════════════════════════════════════════════════════════════

  /// Get grade audit log (requires online).
  Future<List<GradeAuditEntry>> getAuditLog({
    String? studentId,
    String? assignmentId,
    int limit = 50,
  }) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot access audit log while offline');
    }

    final queryParams = <String, dynamic>{'limit': limit};
    if (studentId != null) queryParams['studentId'] = studentId;
    if (assignmentId != null) queryParams['assignmentId'] = assignmentId;

    final response = await api.get('/grades/audit', queryParameters: queryParams);
    final data = response.data as List;
    return data
        .map((json) => GradeAuditEntry.fromJson(json as Map<String, dynamic>))
        .toList();
  }
}

/// Grade audit log entry.
class GradeAuditEntry {
  const GradeAuditEntry({
    required this.id,
    required this.studentId,
    required this.assignmentId,
    required this.action,
    required this.timestamp,
    this.studentName,
    this.assignmentTitle,
    this.previousValue,
    this.newValue,
    this.changedBy,
    this.reason,
  });

  final String id;
  final String studentId;
  final String assignmentId;
  final String action; // 'created', 'updated', 'excused', 'unexcused', 'deleted'
  final DateTime timestamp;
  final String? studentName;
  final String? assignmentTitle;
  final String? previousValue;
  final String? newValue;
  final String? changedBy;
  final String? reason;

  factory GradeAuditEntry.fromJson(Map<String, dynamic> json) {
    return GradeAuditEntry(
      id: json['id'] as String,
      studentId: json['studentId'] as String,
      assignmentId: json['assignmentId'] as String,
      action: json['action'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      studentName: json['studentName'] as String?,
      assignmentTitle: json['assignmentTitle'] as String?,
      previousValue: json['previousValue'] as String?,
      newValue: json['newValue'] as String?,
      changedBy: json['changedBy'] as String?,
      reason: json['reason'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'studentId': studentId,
      'assignmentId': assignmentId,
      'action': action,
      'timestamp': timestamp.toIso8601String(),
      'studentName': studentName,
      'assignmentTitle': assignmentTitle,
      'previousValue': previousValue,
      'newValue': newValue,
      'changedBy': changedBy,
      'reason': reason,
    };
  }
}
