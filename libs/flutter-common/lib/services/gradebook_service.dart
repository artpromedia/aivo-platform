/// Gradebook Service
///
/// API client for gradebook operations in mobile-teacher app.
library;

import 'package:flutter_common/api/api_client.dart';

/// Service for gradebook API operations.
class GradebookService {
  final AivoApiClient _client;

  GradebookService({AivoApiClient? client})
      : _client = client ?? AivoApiClient.instance;

  static const String _basePath = '/gradebook-svc/gradebook';

  // ═══════════════════════════════════════════════════════════════════════════
  // GRADEBOOK DATA
  // ═══════════════════════════════════════════════════════════════════════════

  /// Fetch the complete gradebook for a classroom.
  Future<GradebookData> getClassroomGradebook(String classroomId) async {
    final response = await _client.get<Map<String, dynamic>>(
      '$_basePath/classroom/$classroomId',
    );
    return GradebookData.fromJson(response.data!);
  }

  /// Get gradebook configuration for a classroom.
  Future<GradebookConfig?> getGradebookConfig(String classroomId) async {
    try {
      final response = await _client.get<Map<String, dynamic>>(
        '$_basePath/config/$classroomId',
      );
      return GradebookConfig.fromJson(response.data!);
    } catch (e) {
      return null;
    }
  }

  /// Create or update gradebook configuration.
  Future<GradebookConfig> upsertGradebookConfig({
    required String classroomId,
    required String teacherId,
    required String tenantId,
    String? gradingScale,
    bool? showOverallGrade,
    bool? allowLateSubmissions,
    int? latePenaltyPercent,
  }) async {
    final response = await _client.post<Map<String, dynamic>>(
      '$_basePath/config',
      data: {
        'classroomId': classroomId,
        'teacherId': teacherId,
        'tenantId': tenantId,
        if (gradingScale != null) 'gradingScale': gradingScale,
        if (showOverallGrade != null) 'showOverallGrade': showOverallGrade,
        if (allowLateSubmissions != null)
          'allowLateSubmissions': allowLateSubmissions,
        if (latePenaltyPercent != null)
          'latePenaltyPercent': latePenaltyPercent,
      },
    );
    return GradebookConfig.fromJson(response.data!);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════

  /// Create a grade category.
  Future<GradeCategory> createCategory({
    required String gradebookConfigId,
    required String name,
    required double weight,
    String? color,
    int? dropLowest,
    int? orderIndex,
  }) async {
    final response = await _client.post<Map<String, dynamic>>(
      '$_basePath/categories',
      data: {
        'gradebookConfigId': gradebookConfigId,
        'name': name,
        'weight': weight,
        if (color != null) 'color': color,
        if (dropLowest != null) 'dropLowest': dropLowest,
        if (orderIndex != null) 'orderIndex': orderIndex,
      },
    );
    return GradeCategory.fromJson(response.data!);
  }

  /// Update category weights.
  Future<void> updateCategoryWeights(
      List<Map<String, dynamic>> categories) async {
    await _client.put<Map<String, dynamic>>(
      '$_basePath/categories/weights',
      data: {'categories': categories},
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Create an assignment.
  Future<GradebookAssignment> createAssignment({
    required String classroomId,
    required String categoryId,
    required String teacherId,
    required String tenantId,
    required String title,
    required double maxPoints,
    DateTime? dueDate,
    String? description,
  }) async {
    final response = await _client.post<Map<String, dynamic>>(
      '$_basePath/assignments',
      data: {
        'classroomId': classroomId,
        'categoryId': categoryId,
        'teacherId': teacherId,
        'tenantId': tenantId,
        'title': title,
        'maxPoints': maxPoints,
        if (dueDate != null) 'dueDate': dueDate.toIso8601String(),
        if (description != null) 'description': description,
      },
    );
    return GradebookAssignment.fromJson(response.data!);
  }

  /// Update an assignment.
  Future<GradebookAssignment> updateAssignment(
    String assignmentId,
    Map<String, dynamic> updates,
  ) async {
    final response = await _client.put<Map<String, dynamic>>(
      '$_basePath/assignments/$assignmentId',
      data: updates,
    );
    return GradebookAssignment.fromJson(response.data!);
  }

  /// Publish an assignment.
  Future<GradebookAssignment> publishAssignment(String assignmentId) async {
    final response = await _client.post<Map<String, dynamic>>(
      '$_basePath/assignments/$assignmentId/publish',
    );
    return GradebookAssignment.fromJson(response.data!);
  }

  /// Delete an assignment.
  Future<void> deleteAssignment(String assignmentId) async {
    await _client.delete<void>('$_basePath/assignments/$assignmentId');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GRADES
  // ═══════════════════════════════════════════════════════════════════════════

  /// Submit a grade.
  Future<StudentGrade> submitGrade({
    required String assignmentId,
    required String studentId,
    required String classroomId,
    required String gradedBy,
    required String tenantId,
    double? pointsEarned,
    String? letterGrade,
    String? feedback,
    bool? isExcused,
    bool? isLate,
    bool? isMissing,
  }) async {
    final response = await _client.post<Map<String, dynamic>>(
      '$_basePath/grades',
      data: {
        'assignmentId': assignmentId,
        'studentId': studentId,
        'classroomId': classroomId,
        'gradedBy': gradedBy,
        'tenantId': tenantId,
        if (pointsEarned != null) 'pointsEarned': pointsEarned,
        if (letterGrade != null) 'letterGrade': letterGrade,
        if (feedback != null) 'feedback': feedback,
        if (isExcused != null) 'isExcused': isExcused,
        if (isLate != null) 'isLate': isLate,
        if (isMissing != null) 'isMissing': isMissing,
      },
    );
    return StudentGrade.fromJson(response.data!);
  }

  /// Update a grade.
  Future<StudentGrade> updateGrade(
    String gradeId,
    Map<String, dynamic> updates,
  ) async {
    final response = await _client.put<Map<String, dynamic>>(
      '$_basePath/grades/$gradeId',
      data: updates,
    );
    return StudentGrade.fromJson(response.data!);
  }

  /// Get grade history for audit trail.
  Future<List<GradeHistoryEntry>> getGradeHistory(String gradeId) async {
    final response = await _client.get<List<dynamic>>(
      '$_basePath/grades/$gradeId/history',
    );
    return (response.data!)
        .map((e) => GradeHistoryEntry.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Get all grades for a student in a classroom.
  Future<StudentGradesResult> getStudentGrades(
    String classroomId,
    String studentId,
  ) async {
    final response = await _client.get<Map<String, dynamic>>(
      '$_basePath/student/$studentId/classroom/$classroomId',
    );
    return StudentGradesResult.fromJson(response.data!);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORT/EXPORT
  // ═══════════════════════════════════════════════════════════════════════════

  /// Bulk import grades.
  Future<BulkImportResult> bulkImportGrades({
    required String classroomId,
    required String teacherId,
    required String tenantId,
    required List<Map<String, dynamic>> grades,
  }) async {
    final response = await _client.post<Map<String, dynamic>>(
      '$_basePath/import',
      data: {
        'classroomId': classroomId,
        'teacherId': teacherId,
        'tenantId': tenantId,
        'grades': grades,
      },
    );
    return BulkImportResult.fromJson(response.data!);
  }

  /// Export gradebook as CSV.
  Future<String> exportGradebook(String classroomId) async {
    final response = await _client.get<String>(
      '$_basePath/export/$classroomId',
    );
    return response.data!;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA MODELS
// ═══════════════════════════════════════════════════════════════════════════

/// Complete gradebook data for a classroom.
class GradebookData {
  final String classroomId;
  final String classroomName;
  final GradebookConfig? config;
  final List<GradebookStudent> students;
  final List<GradebookAssignment> assignments;
  final List<GradeCategory> categories;

  GradebookData({
    required this.classroomId,
    required this.classroomName,
    this.config,
    required this.students,
    required this.assignments,
    required this.categories,
  });

  factory GradebookData.fromJson(Map<String, dynamic> json) {
    return GradebookData(
      classroomId: json['classroomId'] as String,
      classroomName: json['classroomName'] as String? ?? '',
      config: json['config'] != null
          ? GradebookConfig.fromJson(json['config'] as Map<String, dynamic>)
          : null,
      students: (json['students'] as List<dynamic>?)
              ?.map((e) =>
                  GradebookStudent.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      assignments: (json['assignments'] as List<dynamic>?)
              ?.map((e) =>
                  GradebookAssignment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      categories: (json['categories'] as List<dynamic>?)
              ?.map((e) => GradeCategory.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

/// Gradebook configuration.
class GradebookConfig {
  final String id;
  final String classroomId;
  final String gradingScale;
  final bool showOverallGrade;
  final bool allowLateSubmissions;
  final int latePenaltyPercent;

  GradebookConfig({
    required this.id,
    required this.classroomId,
    required this.gradingScale,
    required this.showOverallGrade,
    required this.allowLateSubmissions,
    required this.latePenaltyPercent,
  });

  factory GradebookConfig.fromJson(Map<String, dynamic> json) {
    return GradebookConfig(
      id: json['id'] as String,
      classroomId: json['classroomId'] as String,
      gradingScale: json['gradingScale'] as String? ?? 'POINTS',
      showOverallGrade: json['showOverallGrade'] as bool? ?? true,
      allowLateSubmissions: json['allowLateSubmissions'] as bool? ?? true,
      latePenaltyPercent: json['latePenaltyPercent'] as int? ?? 0,
    );
  }
}

/// Grade category.
class GradeCategory {
  final String id;
  final String name;
  final double weight;
  final String? color;
  final int dropLowest;
  final int orderIndex;

  GradeCategory({
    required this.id,
    required this.name,
    required this.weight,
    this.color,
    required this.dropLowest,
    required this.orderIndex,
  });

  factory GradeCategory.fromJson(Map<String, dynamic> json) {
    return GradeCategory(
      id: json['id'] as String,
      name: json['name'] as String,
      weight: (json['weight'] as num).toDouble(),
      color: json['color'] as String?,
      dropLowest: json['dropLowest'] as int? ?? 0,
      orderIndex: json['orderIndex'] as int? ?? 0,
    );
  }
}

/// Student in gradebook.
class GradebookStudent {
  final String id;
  final String displayName;
  final String? avatarUrl;
  final double? overallGrade;
  final String? letterGrade;
  final Map<String, StudentGrade> grades;

  GradebookStudent({
    required this.id,
    required this.displayName,
    this.avatarUrl,
    this.overallGrade,
    this.letterGrade,
    required this.grades,
  });

  factory GradebookStudent.fromJson(Map<String, dynamic> json) {
    final gradesJson = json['grades'] as Map<String, dynamic>? ?? {};
    return GradebookStudent(
      id: json['id'] as String,
      displayName: json['displayName'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      overallGrade: (json['overallGrade'] as num?)?.toDouble(),
      letterGrade: json['letterGrade'] as String?,
      grades: gradesJson.map(
        (k, v) => MapEntry(k, StudentGrade.fromJson(v as Map<String, dynamic>)),
      ),
    );
  }
}

/// Assignment in gradebook.
class GradebookAssignment {
  final String id;
  final String title;
  final String? description;
  final String categoryId;
  final double maxPoints;
  final DateTime? dueDate;
  final bool isPublished;
  final DateTime createdAt;

  GradebookAssignment({
    required this.id,
    required this.title,
    this.description,
    required this.categoryId,
    required this.maxPoints,
    this.dueDate,
    required this.isPublished,
    required this.createdAt,
  });

  factory GradebookAssignment.fromJson(Map<String, dynamic> json) {
    return GradebookAssignment(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      categoryId: json['categoryId'] as String,
      maxPoints: (json['maxPoints'] as num).toDouble(),
      dueDate: json['dueDate'] != null
          ? DateTime.parse(json['dueDate'] as String)
          : null,
      isPublished: json['isPublished'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

/// Individual grade entry.
class StudentGrade {
  final String id;
  final String assignmentId;
  final String studentId;
  final double? pointsEarned;
  final String? letterGrade;
  final double? percentage;
  final String? feedback;
  final bool isExcused;
  final bool isLate;
  final bool isMissing;
  final DateTime? gradedAt;

  StudentGrade({
    required this.id,
    required this.assignmentId,
    required this.studentId,
    this.pointsEarned,
    this.letterGrade,
    this.percentage,
    this.feedback,
    required this.isExcused,
    required this.isLate,
    required this.isMissing,
    this.gradedAt,
  });

  factory StudentGrade.fromJson(Map<String, dynamic> json) {
    return StudentGrade(
      id: json['id'] as String,
      assignmentId: json['assignmentId'] as String,
      studentId: json['studentId'] as String,
      pointsEarned: (json['pointsEarned'] as num?)?.toDouble(),
      letterGrade: json['letterGrade'] as String?,
      percentage: (json['percentage'] as num?)?.toDouble(),
      feedback: json['feedback'] as String?,
      isExcused: json['isExcused'] as bool? ?? false,
      isLate: json['isLate'] as bool? ?? false,
      isMissing: json['isMissing'] as bool? ?? false,
      gradedAt: json['gradedAt'] != null
          ? DateTime.parse(json['gradedAt'] as String)
          : null,
    );
  }
}

/// Grade history entry for audit trail.
class GradeHistoryEntry {
  final String id;
  final String gradeId;
  final double? previousPoints;
  final double? newPoints;
  final String? previousLetter;
  final String? newLetter;
  final String changedBy;
  final String changeReason;
  final DateTime changedAt;

  GradeHistoryEntry({
    required this.id,
    required this.gradeId,
    this.previousPoints,
    this.newPoints,
    this.previousLetter,
    this.newLetter,
    required this.changedBy,
    required this.changeReason,
    required this.changedAt,
  });

  factory GradeHistoryEntry.fromJson(Map<String, dynamic> json) {
    return GradeHistoryEntry(
      id: json['id'] as String,
      gradeId: json['gradeId'] as String,
      previousPoints: (json['previousPoints'] as num?)?.toDouble(),
      newPoints: (json['newPoints'] as num?)?.toDouble(),
      previousLetter: json['previousLetter'] as String?,
      newLetter: json['newLetter'] as String?,
      changedBy: json['changedBy'] as String,
      changeReason: json['changeReason'] as String? ?? '',
      changedAt: DateTime.parse(json['changedAt'] as String),
    );
  }
}

/// Result for student grades query.
class StudentGradesResult {
  final String studentId;
  final String classroomId;
  final double? overallGrade;
  final String? letterGrade;
  final List<StudentGrade> grades;
  final Map<String, double> categoryGrades;

  StudentGradesResult({
    required this.studentId,
    required this.classroomId,
    this.overallGrade,
    this.letterGrade,
    required this.grades,
    required this.categoryGrades,
  });

  factory StudentGradesResult.fromJson(Map<String, dynamic> json) {
    final catGrades = json['categoryGrades'] as Map<String, dynamic>? ?? {};
    return StudentGradesResult(
      studentId: json['studentId'] as String,
      classroomId: json['classroomId'] as String,
      overallGrade: (json['overallGrade'] as num?)?.toDouble(),
      letterGrade: json['letterGrade'] as String?,
      grades: (json['grades'] as List<dynamic>?)
              ?.map((e) => StudentGrade.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      categoryGrades:
          catGrades.map((k, v) => MapEntry(k, (v as num).toDouble())),
    );
  }
}

/// Result of bulk import operation.
class BulkImportResult {
  final int imported;
  final int updated;
  final int failed;
  final List<String> errors;

  BulkImportResult({
    required this.imported,
    required this.updated,
    required this.failed,
    required this.errors,
  });

  factory BulkImportResult.fromJson(Map<String, dynamic> json) {
    return BulkImportResult(
      imported: json['imported'] as int? ?? 0,
      updated: json['updated'] as int? ?? 0,
      failed: json['failed'] as int? ?? 0,
      errors: (json['errors'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }
}
