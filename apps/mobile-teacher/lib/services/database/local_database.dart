/// Teacher Local Database
///
/// Local SQLite database for offline-first functionality.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter_common/flutter_common.dart' 
    hide SyncStatus, SyncOperationType, SyncConflict, ConflictType;

import '../../models/models.dart';

/// Local database for the Teacher app.
/// 
/// This wraps the shared OfflineDatabase from flutter_common
/// and adds teacher-specific data access methods.
class TeacherLocalDatabase {
  TeacherLocalDatabase({OfflineDatabase? database})
      : _db = database ?? OfflineDatabase();

  final OfflineDatabase _db;

  /// Close the database.
  Future<void> close() => _db.closeDatabase();

  // ════════════════════════════════════════════════════════════════════════════
  // STUDENTS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get all students.
  Future<List<Student>> getStudents() async {
    final learners = await _db.getAllLearners();
    return learners.map(_learnerToStudent).toList();
  }

  /// Get a student by ID.
  Future<Student?> getStudent(String id) async {
    final learner = await _db.getLearner(id);
    return learner != null ? _learnerToStudent(learner) : null;
  }

  /// Get students by class ID.
  Future<List<Student>> getStudentsByClass(String classId) async {
    // For now, return all learners. In a full implementation,
    // we'd filter by class membership.
    final learners = await _db.getAllLearners();
    return learners.map(_learnerToStudent).toList();
  }

  /// Cache students.
  Future<void> cacheStudents(List<Student> students) async {
    for (final student in students) {
      await _db.upsertLearner(_studentToLearner(student));
    }
  }

  /// Update a student.
  Future<Student> updateStudent(String id, UpdateStudentDto dto) async {
    final existing = await getStudent(id);
    if (existing == null) {
      throw Exception('Student not found: $id');
    }

    final updated = existing.copyWith(
      firstName: dto.firstName ?? existing.firstName,
      lastName: dto.lastName ?? existing.lastName,
      gradeLevel: dto.gradeLevel ?? existing.gradeLevel,
      hasIep: dto.hasIep ?? existing.hasIep,
      has504: dto.has504 ?? existing.has504,
      accommodations: dto.accommodations ?? existing.accommodations,
      updatedAt: DateTime.now(),
    );

    await _db.upsertLearner(_studentToLearner(updated));
    return updated;
  }

  Student _learnerToStudent(OfflineLearner learner) {
    final metadata = learner.preferencesJson != null
        ? jsonDecode(learner.preferencesJson!) as Map<String, dynamic>
        : <String, dynamic>{};

    return Student(
      id: learner.learnerId,
      firstName: learner.displayName.split(' ').first,
      lastName: learner.displayName.split(' ').skip(1).join(' '),
      email: metadata['email'] as String?,
      classIds: (metadata['classIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      avatarUrl: learner.avatarUrl,
      gradeLevel: metadata['gradeLevel'] as int?,
      hasIep: metadata['hasIep'] as bool? ?? false,
      has504: metadata['has504'] as bool? ?? false,
      accommodations: (metadata['accommodations'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      lastActiveAt: DateTime.fromMillisecondsSinceEpoch(learner.lastSyncedAt * 1000),
      createdAt: DateTime.fromMillisecondsSinceEpoch(learner.lastSyncedAt * 1000),
    );
  }

  OfflineLearner _studentToLearner(Student student) {
    final metadata = jsonEncode({
      'email': student.email,
      'classIds': student.classIds,
      'gradeLevel': student.gradeLevel,
      'hasIep': student.hasIep,
      'has504': student.has504,
      'accommodations': student.accommodations,
      'parentEmails': student.parentEmails,
    });

    return OfflineLearner(
      learnerId: student.id,
      displayName: student.fullName,
      gradeBand: _gradeToGradeBand(student.gradeLevel),
      avatarUrl: student.avatarUrl,
      tenantId: 'default',
      lastSyncedAt: (student.lastActiveAt ?? DateTime.now()).millisecondsSinceEpoch ~/ 1000,
      preferencesJson: metadata,
    );
  }

  String _gradeToGradeBand(int? gradeLevel) {
    if (gradeLevel == null) return 'K-2';
    if (gradeLevel <= 2) return 'K-2';
    if (gradeLevel <= 5) return '3-5';
    if (gradeLevel <= 8) return '6-8';
    return '9-12';
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SESSIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get all sessions.
  Future<List<Session>> getSessions() async {
    // Use the content cache for sessions
    final cached = await _db.getAllContentByType('session');
    return cached
        .map((c) => Session.fromJson(jsonDecode(c.jsonPayload) as Map<String, dynamic>))
        .toList();
  }

  /// Get a session by ID.
  Future<Session?> getSession(String id) async {
    final cached = await _db.getContent(id);
    if (cached == null || cached.contentType != 'session') return null;
    return Session.fromJson(jsonDecode(cached.jsonPayload) as Map<String, dynamic>);
  }

  /// Cache sessions.
  Future<void> cacheSessions(List<Session> sessions) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expiresAt = DateTime.now().add(const Duration(days: 7)).millisecondsSinceEpoch;
    for (final session in sessions) {
      final jsonData = jsonEncode(session.toJson());
      await _db.upsertContent(OfflineContent(
        contentKey: session.id,
        contentType: 'session',
        subject: 'general',
        gradeBand: 'K-12',
        jsonPayload: jsonData,
        mediaPathsJson: null,
        sizeBytes: jsonData.length,
        expiresAt: expiresAt,
        createdAt: now,
        lastAccessedAt: now,
      ));
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // IEP GOALS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get IEP goals for a student.
  Future<List<IepGoal>> getIepGoals(String studentId) async {
    final cached = await _db.getAllContentByType('iep_goal');
    return cached
        .map((c) => IepGoal.fromJson(jsonDecode(c.jsonPayload) as Map<String, dynamic>))
        .where((g) => g.studentId == studentId)
        .toList();
  }

  /// Cache IEP goals.
  Future<void> cacheIepGoals(List<IepGoal> goals) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expiresAt = DateTime.now().add(const Duration(days: 7)).millisecondsSinceEpoch;
    for (final goal in goals) {
      final jsonData = jsonEncode(goal.toJson());
      await _db.upsertContent(OfflineContent(
        contentKey: goal.id,
        contentType: 'iep_goal',
        subject: 'iep',
        gradeBand: 'K-12',
        jsonPayload: jsonData,
        mediaPathsJson: null,
        sizeBytes: jsonData.length,
        expiresAt: expiresAt,
        createdAt: now,
        lastAccessedAt: now,
      ));
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MESSAGES
  // ════════════════════════════════════════════════════════════════════════════

  /// Get conversations.
  Future<List<Conversation>> getConversations() async {
    final cached = await _db.getAllContentByType('conversation');
    return cached
        .map((c) => Conversation.fromJson(jsonDecode(c.jsonPayload) as Map<String, dynamic>))
        .toList();
  }

  /// Get messages for a conversation.
  Future<List<Message>> getMessages(String conversationId) async {
    final cached = await _db.getAllContentByType('message');
    return cached
        .map((c) => Message.fromJson(jsonDecode(c.jsonPayload) as Map<String, dynamic>))
        .where((m) => m.conversationId == conversationId)
        .toList();
  }

  /// Cache conversations.
  Future<void> cacheConversations(List<Conversation> conversations) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expiresAt = DateTime.now().add(const Duration(days: 7)).millisecondsSinceEpoch;
    for (final conv in conversations) {
      final jsonData = jsonEncode(conv.toJson());
      await _db.upsertContent(OfflineContent(
        contentKey: conv.id,
        contentType: 'conversation',
        subject: 'messaging',
        gradeBand: 'K-12',
        jsonPayload: jsonData,
        mediaPathsJson: null,
        sizeBytes: jsonData.length,
        expiresAt: expiresAt,
        createdAt: now,
        lastAccessedAt: now,
      ));
    }
  }

  /// Cache messages.
  Future<void> cacheMessages(List<Message> messages) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expiresAt = DateTime.now().add(const Duration(days: 7)).millisecondsSinceEpoch;
    for (final msg in messages) {
      final jsonData = jsonEncode(msg.toJson());
      await _db.upsertContent(OfflineContent(
        contentKey: msg.id,
        contentType: 'message',
        subject: 'messaging',
        gradeBand: 'K-12',
        jsonPayload: jsonData,
        mediaPathsJson: null,
        sizeBytes: jsonData.length,
        expiresAt: expiresAt,
        createdAt: now,
        lastAccessedAt: now,
      ));
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SYNC QUEUE
  // ════════════════════════════════════════════════════════════════════════════

  /// Add an operation to the sync queue.
  Future<void> addSyncOperation(SyncOperation operation) async {
    final payload = jsonEncode({
      'operationId': operation.id,
      'entityType': operation.entityType,
      'entityId': operation.entityId,
      'data': operation.data,
    });
    await _db.enqueueSyncOperation(OfflineSyncQueueCompanion.insert(
      operationType: operation.type.name,
      payloadJson: payload,
      createdAt: operation.createdAt.millisecondsSinceEpoch ~/ 1000,
    ));
  }

  /// Get pending sync operations.
  Future<List<SyncOperation>> getPendingSyncOperations() async {
    final queue = await _db.getNextSyncOperations(limit: 100);
    return queue.map(_queueItemToOperation).toList();
  }

  /// Get pending sync count.
  Future<int> getPendingSyncCount() async {
    final queue = await _db.getNextSyncOperations(limit: 1000);
    return queue.length;
  }

  /// Get a sync operation by ID.
  Future<SyncOperation?> getSyncOperation(String id) async {
    final items = await _db.getNextSyncOperations(limit: 1000);
    final intId = int.tryParse(id);
    final item = items.where((i) => i.id == intId).firstOrNull;
    return item != null ? _queueItemToOperation(item) : null;
  }

  /// Mark operation as synced.
  Future<void> markSynced(String operationId) async {
    final intId = int.tryParse(operationId);
    if (intId != null) {
      await _db.markSyncDone(intId);
    }
  }

  /// Mark operation as failed.
  Future<void> markFailed(String operationId, String error) async {
    final intId = int.tryParse(operationId);
    if (intId != null) {
      await _db.markSyncFailed(intId, error);
    }
  }

  /// Mark operation as having a conflict.
  Future<void> markConflict(String operationId, String conflictData) async {
    // For now, treat conflicts as failures with the conflict data as error message
    final intId = int.tryParse(operationId);
    if (intId != null) {
      await _db.markSyncFailed(intId, 'Conflict: $conflictData');
    }
  }

  /// Update sync operation data.
  Future<void> updateSyncOperationData(
    String operationId,
    Map<String, dynamic> data,
  ) async {
    // Update the payload in the sync queue
    // This would require an additional method in OfflineDatabase
  }

  /// Remove a sync operation.
  Future<void> removeSyncOperation(String operationId) async {
    // The OfflineDatabase doesn't have a delete by ID method for sync queue.
    // Mark as done instead.
    final intId = int.tryParse(operationId);
    if (intId != null) {
      await _db.markSyncDone(intId);
    }
  }

  /// Get operations marked as conflicts.
  Future<List<SyncConflict>> getConflicts() async {
    // For now, return an empty list since conflict tracking
    // would require additional database schema
    return [];
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ASSIGNMENTS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get all assignments.
  Future<List<Assignment>> getAssignments() async {
    final cached = await _db.getAllContentByType('assignment');
    return cached
        .map((c) => Assignment.fromJson(jsonDecode(c.jsonPayload) as Map<String, dynamic>))
        .toList();
  }

  /// Get an assignment by ID.
  Future<Assignment?> getAssignment(String id) async {
    final cached = await _db.getContent(id);
    if (cached == null || cached.contentType != 'assignment') return null;
    return Assignment.fromJson(jsonDecode(cached.jsonPayload) as Map<String, dynamic>);
  }

  /// Get assignments by class ID.
  Future<List<Assignment>> getAssignmentsByClass(String classId) async {
    final all = await getAssignments();
    return all.where((a) => a.classId == classId).toList();
  }

  /// Cache assignments.
  Future<void> cacheAssignments(List<Assignment> assignments) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expiresAt = DateTime.now().add(const Duration(days: 7)).millisecondsSinceEpoch;
    for (final assignment in assignments) {
      final jsonData = jsonEncode(assignment.toJson());
      await _db.upsertContent(OfflineContent(
        contentKey: assignment.id,
        contentType: 'assignment',
        subject: 'grades',
        gradeBand: 'K-12',
        jsonPayload: jsonData,
        mediaPathsJson: null,
        sizeBytes: jsonData.length,
        expiresAt: expiresAt,
        createdAt: now,
        lastAccessedAt: now,
      ));
    }
  }

  /// Delete an assignment from cache.
  Future<void> deleteAssignment(String id) async {
    await _db.deleteContent(id);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SUBMISSIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get submissions for an assignment.
  Future<List<Submission>> getSubmissions(String assignmentId) async {
    final cached = await _db.getAllContentByType('submission');
    return cached
        .map((c) => Submission.fromJson(jsonDecode(c.jsonPayload) as Map<String, dynamic>))
        .where((s) => s.assignmentId == assignmentId)
        .toList();
  }

  /// Get a submission by ID.
  Future<Submission?> getSubmission(String id) async {
    final cached = await _db.getContent(id);
    if (cached == null || cached.contentType != 'submission') return null;
    return Submission.fromJson(jsonDecode(cached.jsonPayload) as Map<String, dynamic>);
  }

  /// Cache submissions.
  Future<void> cacheSubmissions(List<Submission> submissions) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expiresAt = DateTime.now().add(const Duration(days: 7)).millisecondsSinceEpoch;
    for (final submission in submissions) {
      final jsonData = jsonEncode(submission.toJson());
      await _db.upsertContent(OfflineContent(
        contentKey: submission.id,
        contentType: 'submission',
        subject: 'grades',
        gradeBand: 'K-12',
        jsonPayload: jsonData,
        mediaPathsJson: null,
        sizeBytes: jsonData.length,
        expiresAt: expiresAt,
        createdAt: now,
        lastAccessedAt: now,
      ));
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GRADES / GRADEBOOK
  // ════════════════════════════════════════════════════════════════════════════

  /// Get gradebook for a class.
  Future<Gradebook?> getGradebook(String classId) async {
    final cached = await _db.getContent('gradebook_$classId');
    if (cached == null || cached.contentType != 'gradebook') return null;
    return Gradebook.fromJson(jsonDecode(cached.jsonPayload) as Map<String, dynamic>);
  }

  /// Cache gradebook.
  Future<void> cacheGradebook(Gradebook gradebook) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expiresAt = DateTime.now().add(const Duration(days: 1)).millisecondsSinceEpoch;
    final jsonData = jsonEncode(gradebook.toJson());
    await _db.upsertContent(OfflineContent(
      contentKey: 'gradebook_${gradebook.classId}',
      contentType: 'gradebook',
      subject: 'grades',
      gradeBand: 'K-12',
      jsonPayload: jsonData,
      mediaPathsJson: null,
      sizeBytes: jsonData.length,
      expiresAt: expiresAt,
      createdAt: now,
      lastAccessedAt: now,
    ));
  }

  /// Get grade entries for a student.
  Future<List<GradeEntry>> getGradesByStudent(String studentId) async {
    final cached = await _db.getAllContentByType('grade_entry');
    return cached
        .map((c) => GradeEntry.fromJson(jsonDecode(c.jsonPayload) as Map<String, dynamic>))
        .where((g) => g.studentId == studentId)
        .toList();
  }

  /// Get grade entries for an assignment.
  Future<List<GradeEntry>> getGradesByAssignment(String assignmentId) async {
    final cached = await _db.getAllContentByType('grade_entry');
    return cached
        .map((c) => GradeEntry.fromJson(jsonDecode(c.jsonPayload) as Map<String, dynamic>))
        .where((g) => g.assignmentId == assignmentId)
        .toList();
  }

  /// Get a specific grade entry.
  Future<GradeEntry?> getGrade(String studentId, String assignmentId) async {
    final cached = await _db.getContent('grade_${studentId}_$assignmentId');
    if (cached == null || cached.contentType != 'grade_entry') return null;
    return GradeEntry.fromJson(jsonDecode(cached.jsonPayload) as Map<String, dynamic>);
  }

  /// Cache grade entries.
  Future<void> cacheGrades(List<GradeEntry> grades) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expiresAt = DateTime.now().add(const Duration(days: 7)).millisecondsSinceEpoch;
    for (final grade in grades) {
      final jsonData = jsonEncode(grade.toJson());
      await _db.upsertContent(OfflineContent(
        contentKey: 'grade_${grade.studentId}_${grade.assignmentId}',
        contentType: 'grade_entry',
        subject: 'grades',
        gradeBand: 'K-12',
        jsonPayload: jsonData,
        mediaPathsJson: null,
        sizeBytes: jsonData.length,
        expiresAt: expiresAt,
        createdAt: now,
        lastAccessedAt: now,
      ));
    }
  }

  /// Update a grade entry locally (for offline support).
  Future<GradeEntry> updateGrade(GradeEntry grade) async {
    await cacheGrades([grade]);
    return grade;
  }

  /// Get student grade summary for a class.
  Future<StudentGrade?> getStudentGrade(String classId, String studentId) async {
    final cached = await _db.getContent('student_grade_${classId}_$studentId');
    if (cached == null || cached.contentType != 'student_grade') return null;
    return StudentGrade.fromJson(jsonDecode(cached.jsonPayload) as Map<String, dynamic>);
  }

  /// Cache student grade summaries.
  Future<void> cacheStudentGrades(List<StudentGrade> grades) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expiresAt = DateTime.now().add(const Duration(days: 1)).millisecondsSinceEpoch;
    for (final grade in grades) {
      final jsonData = jsonEncode(grade.toJson());
      await _db.upsertContent(OfflineContent(
        contentKey: 'student_grade_${grade.classId}_${grade.studentId}',
        contentType: 'student_grade',
        subject: 'grades',
        gradeBand: 'K-12',
        jsonPayload: jsonData,
        mediaPathsJson: null,
        sizeBytes: jsonData.length,
        expiresAt: expiresAt,
        createdAt: now,
        lastAccessedAt: now,
      ));
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ASSIGNMENT CATEGORIES
  // ════════════════════════════════════════════════════════════════════════════

  /// Get categories for a class.
  Future<List<AssignmentCategory>> getCategories(String classId) async {
    final cached = await _db.getAllContentByType('category');
    return cached
        .map((c) => AssignmentCategory.fromJson(jsonDecode(c.jsonPayload) as Map<String, dynamic>))
        .where((cat) => cat.classId == classId)
        .toList();
  }

  /// Cache categories.
  Future<void> cacheCategories(List<AssignmentCategory> categories) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expiresAt = DateTime.now().add(const Duration(days: 30)).millisecondsSinceEpoch;
    for (final category in categories) {
      final jsonData = jsonEncode(category.toJson());
      await _db.upsertContent(OfflineContent(
        contentKey: category.id,
        contentType: 'category',
        subject: 'grades',
        gradeBand: 'K-12',
        jsonPayload: jsonData,
        mediaPathsJson: null,
        sizeBytes: jsonData.length,
        expiresAt: expiresAt,
        createdAt: now,
        lastAccessedAt: now,
      ));
    }
  }

  SyncOperation _queueItemToOperation(OfflineSyncQueueEntry item) {
    final payload = jsonDecode(item.payloadJson) as Map<String, dynamic>;
    return SyncOperation(
      id: item.id.toString(),
      type: SyncOperationType.values.firstWhere(
        (e) => e.name == item.operationType,
        orElse: () => SyncOperationType.update,
      ),
      entityType: payload['entityType'] as String? ?? 'unknown',
      entityId: payload['entityId'] as String? ?? '',
      data: payload['data'] as Map<String, dynamic>? ?? {},
      createdAt: DateTime.fromMillisecondsSinceEpoch(item.createdAt * 1000),
      status: SyncStatus.values.firstWhere(
        (e) => e.name == item.status.toLowerCase(),
        orElse: () => SyncStatus.pending,
      ),
      retryCount: item.retryCount,
      lastError: item.errorMessage,
      lastAttemptAt: item.lastAttemptAt != null 
          ? DateTime.fromMillisecondsSinceEpoch(item.lastAttemptAt! * 1000) 
          : null,
    );
  }
}
