/// Assignment Repository
///
/// Offline-first data access for assignments and submissions.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_common/flutter_common.dart';

import '../models/models.dart';
import '../services/database/local_database.dart';
import '../services/sync/sync_service.dart';
import '../services/sync/connectivity_monitor.dart';

/// Repository for assignment data access.
class AssignmentRepository {
  AssignmentRepository({
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
  // ASSIGNMENTS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get all assignments (offline-first).
  Future<List<Assignment>> getAssignments() async {
    final cached = await db.getAssignments();

    if (await connectivity.isOnline) {
      _refreshAssignmentsInBackground();
    }

    return cached;
  }

  /// Get assignments for a specific class.
  Future<List<Assignment>> getAssignmentsByClass(String classId) async {
    final cached = await db.getAssignmentsByClass(classId);

    if (await connectivity.isOnline) {
      _refreshAssignmentsByClassInBackground(classId);
    }

    return cached;
  }

  /// Get a single assignment by ID.
  Future<Assignment?> getAssignment(String id) async {
    var assignment = await db.getAssignment(id);

    if (assignment == null && await connectivity.isOnline) {
      try {
        final response = await api.get('/assignments/$id');
        assignment = Assignment.fromJson(response.data as Map<String, dynamic>);
        await db.cacheAssignments([assignment]);
      } catch (e) {
        debugPrint('[AssignmentRepository] Error fetching assignment: $e');
      }
    }

    return assignment;
  }

  /// Create a new assignment.
  Future<Assignment> createAssignment(CreateAssignmentDto dto) async {
    if (await connectivity.isOnline) {
      try {
        final response = await api.post(
          '/classes/${dto.classId}/assignments',
          data: dto.toJson(),
        );
        final assignment = Assignment.fromJson(response.data as Map<String, dynamic>);
        await db.cacheAssignments([assignment]);
        return assignment;
      } catch (e) {
        debugPrint('[AssignmentRepository] Error creating assignment: $e');
        rethrow;
      }
    } else {
      // Create locally and queue for sync
      final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}';
      final assignment = Assignment(
        id: tempId,
        classId: dto.classId,
        title: dto.title,
        description: dto.description,
        instructions: dto.instructions,
        status: dto.publishImmediately ? AssignmentStatus.published : AssignmentStatus.draft,
        assignmentType: dto.assignmentType,
        categoryId: dto.categoryId,
        pointsPossible: dto.pointsPossible,
        weight: dto.weight,
        dueAt: dto.dueAt,
        availableAt: dto.availableAt,
        lockAt: dto.lockAt,
        allowLateSubmissions: dto.allowLateSubmissions,
        latePenaltyPercent: dto.latePenaltyPercent,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      await db.cacheAssignments([assignment]);
      await sync.queueCreate(
        entityType: 'assignment',
        entityId: tempId,
        data: dto.toJson(),
      );

      return assignment;
    }
  }

  /// Update an assignment.
  Future<Assignment> updateAssignment(String id, UpdateAssignmentDto dto) async {
    final existing = await db.getAssignment(id);
    if (existing == null) {
      throw Exception('Assignment not found: $id');
    }

    final updated = existing.copyWith(
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description,
      instructions: dto.instructions ?? existing.instructions,
      categoryId: dto.categoryId ?? existing.categoryId,
      pointsPossible: dto.pointsPossible ?? existing.pointsPossible,
      weight: dto.weight ?? existing.weight,
      dueAt: dto.dueAt ?? existing.dueAt,
      availableAt: dto.availableAt ?? existing.availableAt,
      lockAt: dto.lockAt ?? existing.lockAt,
      allowLateSubmissions: dto.allowLateSubmissions ?? existing.allowLateSubmissions,
      latePenaltyPercent: dto.latePenaltyPercent ?? existing.latePenaltyPercent,
      updatedAt: DateTime.now(),
    );

    await db.cacheAssignments([updated]);
    await sync.queueUpdate(
      entityType: 'assignment',
      entityId: id,
      data: dto.toJson(),
    );

    return updated;
  }

  /// Publish an assignment.
  Future<Assignment> publishAssignment(String id) async {
    final existing = await db.getAssignment(id);
    if (existing == null) {
      throw Exception('Assignment not found: $id');
    }

    final published = existing.copyWith(
      status: AssignmentStatus.published,
      publishedAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    await db.cacheAssignments([published]);

    if (await connectivity.isOnline) {
      try {
        await api.post('/assignments/$id/publish');
      } catch (e) {
        await sync.queueUpdate(
          entityType: 'assignment',
          entityId: id,
          data: {'action': 'publish'},
        );
      }
    } else {
      await sync.queueUpdate(
        entityType: 'assignment',
        entityId: id,
        data: {'action': 'publish'},
      );
    }

    return published;
  }

  /// Delete an assignment.
  Future<void> deleteAssignment(String id) async {
    await db.deleteAssignment(id);
    await sync.queueDelete(
      entityType: 'assignment',
      entityId: id,
    );
  }

  /// Duplicate an assignment.
  Future<Assignment> duplicateAssignment(String id) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot duplicate assignment while offline');
    }

    final response = await api.post('/assignments/$id/duplicate');
    final assignment = Assignment.fromJson(response.data as Map<String, dynamic>);
    await db.cacheAssignments([assignment]);
    return assignment;
  }

  /// Force refresh from server.
  Future<List<Assignment>> refreshAssignments() async {
    if (!await connectivity.isOnline) {
      return db.getAssignments();
    }

    try {
      final response = await api.get('/assignments');
      final data = response.data as List;
      final assignments = data
          .map((json) => Assignment.fromJson(json as Map<String, dynamic>))
          .toList();

      await db.cacheAssignments(assignments);
      return assignments;
    } catch (e) {
      return db.getAssignments();
    }
  }

  void _refreshAssignmentsInBackground() async {
    try {
      final response = await api.get('/assignments');
      final data = response.data as List;
      final assignments = data
          .map((json) => Assignment.fromJson(json as Map<String, dynamic>))
          .toList();

      await db.cacheAssignments(assignments);
    } catch (e) {
      debugPrint('[AssignmentRepository] Background refresh failed: $e');
    }
  }

  void _refreshAssignmentsByClassInBackground(String classId) async {
    try {
      final response = await api.get('/classes/$classId/assignments');
      final data = response.data as List;
      final assignments = data
          .map((json) => Assignment.fromJson(json as Map<String, dynamic>))
          .toList();

      await db.cacheAssignments(assignments);
    } catch (e) {
      debugPrint('[AssignmentRepository] Background class refresh failed: $e');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SUBMISSIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get submissions for an assignment.
  Future<List<Submission>> getSubmissions(String assignmentId) async {
    final cached = await db.getSubmissions(assignmentId);

    if (await connectivity.isOnline) {
      _refreshSubmissionsInBackground(assignmentId);
    }

    return cached;
  }

  /// Get a single submission.
  Future<Submission?> getSubmission(String submissionId) async {
    return db.getSubmission(submissionId);
  }

  /// Grade a submission.
  Future<Submission> gradeSubmission(
    String assignmentId,
    String submissionId,
    GradeSubmissionDto dto,
  ) async {
    final existing = await db.getSubmission(submissionId);
    if (existing == null) {
      throw Exception('Submission not found: $submissionId');
    }

    final graded = existing.copyWith(
      status: dto.isExcused ? SubmissionStatus.excused : SubmissionStatus.graded,
      pointsEarned: dto.pointsEarned,
      grade: dto.grade,
      feedback: dto.feedback,
      rubricScores: dto.rubricScores ?? existing.rubricScores,
      isExcused: dto.isExcused,
      gradedAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    await db.cacheSubmissions([graded]);
    await sync.queueUpdate(
      entityType: 'submission',
      entityId: submissionId,
      data: {
        'assignmentId': assignmentId,
        ...dto.toJson(),
      },
    );

    return graded;
  }

  /// Return a graded submission to the student.
  Future<Submission> returnSubmission(String assignmentId, String submissionId) async {
    final existing = await db.getSubmission(submissionId);
    if (existing == null) {
      throw Exception('Submission not found: $submissionId');
    }

    final returned = existing.copyWith(
      status: SubmissionStatus.returned,
      updatedAt: DateTime.now(),
    );

    await db.cacheSubmissions([returned]);

    if (await connectivity.isOnline) {
      try {
        await api.post('/assignments/$assignmentId/submissions/$submissionId/return');
      } catch (e) {
        await sync.queueUpdate(
          entityType: 'submission',
          entityId: submissionId,
          data: {'action': 'return'},
        );
      }
    } else {
      await sync.queueUpdate(
        entityType: 'submission',
        entityId: submissionId,
        data: {'action': 'return'},
      );
    }

    return returned;
  }

  /// Bulk grade submissions (mark all missing as zero).
  Future<void> markMissingAsZero(String assignmentId) async {
    if (await connectivity.isOnline) {
      await api.post('/assignments/$assignmentId/mark-missing-zero');
      _refreshSubmissionsInBackground(assignmentId);
    } else {
      await sync.queueUpdate(
        entityType: 'assignment',
        entityId: assignmentId,
        data: {'action': 'mark_missing_zero'},
      );
    }
  }

  void _refreshSubmissionsInBackground(String assignmentId) async {
    try {
      final response = await api.get('/assignments/$assignmentId/submissions');
      final data = response.data as List;
      final submissions = data
          .map((json) => Submission.fromJson(json as Map<String, dynamic>))
          .toList();

      await db.cacheSubmissions(submissions);
    } catch (e) {
      debugPrint('[AssignmentRepository] Background submissions refresh failed: $e');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CATEGORIES
  // ════════════════════════════════════════════════════════════════════════════

  /// Get assignment categories for a class.
  Future<List<AssignmentCategory>> getCategories(String classId) async {
    final cached = await db.getCategories(classId);

    if (await connectivity.isOnline && cached.isEmpty) {
      _refreshCategoriesInBackground(classId);
    }

    return cached;
  }

  /// Update categories for a class.
  Future<void> updateCategories(String classId, List<AssignmentCategory> categories) async {
    await db.cacheCategories(categories);

    if (await connectivity.isOnline) {
      try {
        await api.put(
          '/classes/$classId/categories',
          data: categories.map((c) => c.toJson()).toList(),
        );
      } catch (e) {
        await sync.queueUpdate(
          entityType: 'categories',
          entityId: classId,
          data: {'categories': categories.map((c) => c.toJson()).toList()},
        );
      }
    } else {
      await sync.queueUpdate(
        entityType: 'categories',
        entityId: classId,
        data: {'categories': categories.map((c) => c.toJson()).toList()},
      );
    }
  }

  void _refreshCategoriesInBackground(String classId) async {
    try {
      final response = await api.get('/classes/$classId/categories');
      final data = response.data as List;
      final categories = data
          .map((json) => AssignmentCategory.fromJson(json as Map<String, dynamic>))
          .toList();

      await db.cacheCategories(categories);
    } catch (e) {
      debugPrint('[AssignmentRepository] Background categories refresh failed: $e');
    }
  }
}
