/// Grading Repository
///
/// Repository for rubric management and grading operations.
library;

import 'package:dio/dio.dart';

import '../models/rubric.dart';

/// Repository for rubric and grading operations.
class GradingRepository {
  GradingRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  // ============================================================
  // Rubric Operations
  // ============================================================

  /// Fetch all rubrics for the teacher.
  Future<List<Rubric>> fetchRubrics({
    RubricStatus? status,
    RubricType? type,
    String? searchQuery,
  }) async {
    final response = await _dio.get(
      '/api/v1/teacher/rubrics',
      queryParameters: {
        if (status != null) 'status': status.value,
        if (type != null) 'type': type.value,
        if (searchQuery != null && searchQuery.isNotEmpty) 'q': searchQuery,
      },
    );
    final list = response.data as List<dynamic>;
    return list.map((e) => Rubric.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Fetch a single rubric by ID.
  Future<Rubric> fetchRubric(String rubricId) async {
    final response = await _dio.get('/api/v1/teacher/rubrics/$rubricId');
    return Rubric.fromJson(response.data as Map<String, dynamic>);
  }

  /// Create a new rubric.
  Future<Rubric> createRubric(Rubric rubric) async {
    final response = await _dio.post(
      '/api/v1/teacher/rubrics',
      data: rubric.toJson(),
    );
    return Rubric.fromJson(response.data as Map<String, dynamic>);
  }

  /// Update an existing rubric.
  Future<Rubric> updateRubric(Rubric rubric) async {
    final response = await _dio.put(
      '/api/v1/teacher/rubrics/${rubric.id}',
      data: rubric.toJson(),
    );
    return Rubric.fromJson(response.data as Map<String, dynamic>);
  }

  /// Delete a rubric.
  Future<void> deleteRubric(String rubricId) async {
    await _dio.delete('/api/v1/teacher/rubrics/$rubricId');
  }

  /// Duplicate a rubric.
  Future<Rubric> duplicateRubric(String rubricId, {String? newName}) async {
    final response = await _dio.post(
      '/api/v1/teacher/rubrics/$rubricId/duplicate',
      data: {
        if (newName != null) 'name': newName,
      },
    );
    return Rubric.fromJson(response.data as Map<String, dynamic>);
  }

  /// Share a rubric with other teachers.
  Future<void> shareRubric(String rubricId, List<String> teacherIds) async {
    await _dio.post(
      '/api/v1/teacher/rubrics/$rubricId/share',
      data: {'teacherIds': teacherIds},
    );
  }

  /// Fetch rubric templates/presets.
  Future<List<Rubric>> fetchRubricTemplates() async {
    final response = await _dio.get('/api/v1/teacher/rubrics/templates');
    final list = response.data as List<dynamic>;
    return list.map((e) => Rubric.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Generate rubric with AI assistance.
  Future<Rubric> generateRubricWithAI({
    required String assignmentTitle,
    required String assignmentDescription,
    RubricType type = RubricType.analytic,
    int criteriaCount = 4,
  }) async {
    final response = await _dio.post(
      '/api/v1/teacher/rubrics/generate',
      data: {
        'assignmentTitle': assignmentTitle,
        'assignmentDescription': assignmentDescription,
        'type': type.value,
        'criteriaCount': criteriaCount,
      },
    );
    return Rubric.fromJson(response.data as Map<String, dynamic>);
  }

  // ============================================================
  // Grading Queue Operations
  // ============================================================

  /// Fetch the grading queue.
  Future<List<GradingQueueItem>> fetchGradingQueue({
    GradingStatus? status,
    GradingPriority? priority,
    String? assignmentId,
    String? classId,
    int limit = 50,
    int offset = 0,
  }) async {
    final response = await _dio.get(
      '/api/v1/teacher/grading/queue',
      queryParameters: {
        if (status != null) 'status': status.value,
        if (priority != null) 'priority': priority.value,
        if (assignmentId != null) 'assignmentId': assignmentId,
        if (classId != null) 'classId': classId,
        'limit': limit,
        'offset': offset,
      },
    );
    final list = response.data as List<dynamic>;
    return list
        .map((e) => GradingQueueItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Fetch grading queue statistics.
  Future<GradingQueueStats> fetchGradingQueueStats() async {
    final response = await _dio.get('/api/v1/teacher/grading/queue/stats');
    return GradingQueueStats.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetch a submission for grading.
  Future<GradingSubmission> fetchSubmission(String submissionId) async {
    final response =
        await _dio.get('/api/v1/teacher/grading/submissions/$submissionId');
    return GradingSubmission.fromJson(response.data as Map<String, dynamic>);
  }

  /// Submit grades for a submission.
  Future<void> submitGrades({
    required String submissionId,
    required Map<String, CriterionScore> criteriaScores,
    required String feedback,
    bool returnToStudent = false,
  }) async {
    await _dio.post(
      '/api/v1/teacher/grading/submissions/$submissionId/grade',
      data: {
        'criteriaScores':
            criteriaScores.map((k, v) => MapEntry(k, v.toJson())),
        'feedback': feedback,
        'returnToStudent': returnToStudent,
      },
    );
  }

  /// Request AI grading assistance.
  Future<Map<String, CriterionScore>> requestAIGradingAssist(
    String submissionId,
  ) async {
    final response = await _dio.post(
      '/api/v1/teacher/grading/submissions/$submissionId/ai-assist',
    );
    final data = response.data as Map<String, dynamic>;
    return (data['suggestedScores'] as Map<String, dynamic>).map(
      (k, v) => MapEntry(k, CriterionScore.fromJson(v as Map<String, dynamic>)),
    );
  }

  /// Add a comment to a submission.
  Future<GradingComment> addComment({
    required String submissionId,
    required String text,
    int? position,
    bool isPrivate = false,
  }) async {
    final response = await _dio.post(
      '/api/v1/teacher/grading/submissions/$submissionId/comments',
      data: {
        'text': text,
        if (position != null) 'position': position,
        'isPrivate': isPrivate,
      },
    );
    return GradingComment.fromJson(response.data as Map<String, dynamic>);
  }

  /// Delete a comment.
  Future<void> deleteComment(String submissionId, String commentId) async {
    await _dio.delete(
      '/api/v1/teacher/grading/submissions/$submissionId/comments/$commentId',
    );
  }

  /// Return graded submission to student.
  Future<void> returnToStudent(String submissionId) async {
    await _dio.post(
      '/api/v1/teacher/grading/submissions/$submissionId/return',
    );
  }

  /// Batch grade multiple submissions.
  Future<void> batchGrade({
    required List<String> submissionIds,
    required double score,
    String? feedback,
  }) async {
    await _dio.post(
      '/api/v1/teacher/grading/batch',
      data: {
        'submissionIds': submissionIds,
        'score': score,
        if (feedback != null) 'feedback': feedback,
      },
    );
  }

  /// Update priority for a queue item.
  Future<void> updatePriority(
    String queueItemId,
    GradingPriority priority,
  ) async {
    await _dio.patch(
      '/api/v1/teacher/grading/queue/$queueItemId/priority',
      data: {'priority': priority.value},
    );
  }

  /// Skip/defer a queue item.
  Future<void> skipQueueItem(String queueItemId, {String? reason}) async {
    await _dio.post(
      '/api/v1/teacher/grading/queue/$queueItemId/skip',
      data: {
        if (reason != null) 'reason': reason,
      },
    );
  }

  /// Fetch recent grading activity.
  Future<List<GradingQueueItem>> fetchRecentlyGraded({
    int limit = 20,
  }) async {
    final response = await _dio.get(
      '/api/v1/teacher/grading/recent',
      queryParameters: {'limit': limit},
    );
    final list = response.data as List<dynamic>;
    return list
        .map((e) => GradingQueueItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
