/// Teacher Local Database
///
/// Local SQLite database for offline-first functionality.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter_common/flutter_common.dart' as fc
    hide SyncStatus, SyncOperationType, SyncConflict, ConflictType;

import '../../models/models.dart';

/// Local database for the Teacher app.
/// 
/// This wraps the shared OfflineDatabase from flutter_common
/// and adds teacher-specific data access methods.
class TeacherLocalDatabase {
  TeacherLocalDatabase({fc.OfflineDatabase? database})
      : _db = database ?? fc.OfflineDatabase();

  final fc.OfflineDatabase _db;

  /// Close the database.
  Future<void> close() => _db.closeDatabase();

  // ════════════════════════════════════════════════════════════════════════════
  // STUDENTS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get all students.
  Future<List<Student>> getStudents() async {
    final learners = await _db.getAllLearners();
    return learners.map(_learnerToStudent).toList().cast<Student>();
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
    return learners.map(_learnerToStudent).toList().cast<Student>();
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

  Student _learnerToStudent(fc.OfflineLearner learner) {
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

  fc.OfflineLearner _studentToLearner(Student student) {
    final metadata = jsonEncode({
      'email': student.email,
      'classIds': student.classIds,
      'gradeLevel': student.gradeLevel,
      'hasIep': student.hasIep,
      'has504': student.has504,
      'accommodations': student.accommodations,
      'parentEmails': student.parentEmails,
    });

    return fc.OfflineLearner(
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
      await _db.upsertContent(fc.OfflineContent(
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
      await _db.upsertContent(fc.OfflineContent(
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
      await _db.upsertContent(fc.OfflineContent(
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
      await _db.upsertContent(fc.OfflineContent(
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
    await _db.enqueueSyncOperation(fc.OfflineSyncQueueCompanion.insert(
      operationType: operation.type.name,
      payloadJson: payload,
      createdAt: operation.createdAt.millisecondsSinceEpoch ~/ 1000,
    ));
  }

  /// Get pending sync operations.
  Future<List<SyncOperation>> getPendingSyncOperations() async {
    final queue = await _db.getNextSyncOperations(limit: 100);
    return queue.map(_queueItemToOperation).toList().cast<SyncOperation>();
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
      await _db.upsertContent(fc.OfflineContent(
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
    await _db.deleteContentByKeys([id]);
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
      await _db.upsertContent(fc.OfflineContent(
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
    await _db.upsertContent(fc.OfflineContent(
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
      await _db.upsertContent(fc.OfflineContent(
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
      await _db.upsertContent(fc.OfflineContent(
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
  // ASSESSMENTS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get all assessments for a class.
  /// Assessments are stored with a class-prefixed key to allow filtering by class.
  Future<List<Assessment>> getAssessmentsByClass(String classId) async {
    final cached = await _db.getAllContentByType('assessment_class_$classId');
    return cached
        .map((c) => Assessment.fromJson(jsonDecode(c.jsonPayload) as Map<String, dynamic>))
        .toList();
  }

  /// Get a single assessment by ID.
  Future<Assessment?> getAssessment(String id) async {
    // Search all assessment content types for the matching ID
    final allContent = await _db.getAllContentByType('assessment');
    for (final content in allContent) {
      if (content.contentKey.endsWith('_$id')) {
        return Assessment.fromJson(jsonDecode(content.jsonPayload) as Map<String, dynamic>);
      }
    }
    // Also check class-prefixed types
    final cached = await _getCachedValue('assessment_$id');
    if (cached != null) {
      return Assessment.fromJson(cached as Map<String, dynamic>);
    }
    return null;
  }

  /// Cache assessments for a specific class.
  Future<void> cacheAssessments(List<Assessment> assessments, {String? classId}) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expiresAt = DateTime.now().add(const Duration(days: 7)).millisecondsSinceEpoch;
    for (final assessment in assessments) {
      final jsonData = jsonEncode(assessment.toJson());
      final contentType = classId != null ? 'assessment_class_$classId' : 'assessment';
      await _db.upsertContent(fc.OfflineContent(
        contentKey: 'assessment_${assessment.id}',
        contentType: contentType,
        subject: 'assessments',
        gradeBand: 'K-12',
        jsonPayload: jsonData,
        mediaPathsJson: null,
        sizeBytes: jsonData.length,
        expiresAt: expiresAt,
        createdAt: now,
        lastAccessedAt: now,
      ));
      // Also cache individually for direct ID lookups
      await _setCachedValue('assessment_${assessment.id}', assessment.toJson());
    }
  }

  /// Delete an assessment from cache.
  Future<void> deleteAssessment(String id) async {
    await _db.deleteContentByKeys(['assessment_$id']);
    await _deleteCachedValue('assessment_$id');
  }

  /// Get assessment results.
  Future<dynamic> getAssessmentResults(String assessmentId) async {
    return _getCachedValue('assessment_results_$assessmentId');
  }

  /// Cache assessment results.
  Future<void> cacheAssessmentResults(String assessmentId, dynamic results) async {
    await _setCachedValue('assessment_results_$assessmentId', results);
  }

  /// Get assessment submissions.
  Future<List<dynamic>> getAssessmentSubmissions(String assessmentId) async {
    final cached = await _getCachedValue('assessment_submissions_$assessmentId');
    return cached != null ? cached as List<dynamic> : [];
  }

  /// Cache assessment submissions.
  Future<void> cacheAssessmentSubmissions(String assessmentId, List<dynamic> submissions) async {
    await _setCachedValue('assessment_submissions_$assessmentId', submissions);
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
      await _db.upsertContent(fc.OfflineContent(
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

  SyncOperation _queueItemToOperation(fc.OfflineSyncQueueEntry item) {
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

  // ════════════════════════════════════════════════════════════════════════════
  // LMS / GOOGLE CLASSROOM CACHE
  // ════════════════════════════════════════════════════════════════════════════

  Future<dynamic> _getCachedValue(String key) async {
    final content = await _db.getContent(key);
    if (content == null) return null;
    return jsonDecode(content.jsonPayload);
  }

  Future<void> _setCachedValue(String key, dynamic value) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expiresAt = DateTime.now().add(const Duration(days: 7)).millisecondsSinceEpoch;
    final jsonData = jsonEncode(value);
    
    await _db.upsertContent(fc.OfflineContent(
      contentKey: key,
      contentType: 'lms_cache',
      subject: 'google_classroom',
      gradeBand: 'K-12',
      jsonPayload: jsonData,
      mediaPathsJson: null,
      sizeBytes: jsonData.length,
      expiresAt: expiresAt,
      createdAt: now,
      lastAccessedAt: now,
    ));
  }

  Future<void> _deleteCachedValue(String key) async {
    await _db.deleteContentByKeys([key]);
  }

  /// Get cached LMS connection status
  Future<dynamic> getCachedLmsConnectionStatus() async {
    return _getCachedValue('lms_connection_status');
  }

  /// Cache LMS connection status
  Future<void> cacheLmsConnectionStatus(dynamic status) async {
    await _setCachedValue('lms_connection_status', status);
  }

  /// Get cached classroom courses
  Future<List<dynamic>> getCachedClassroomCourses() async {
    final cached = await _getCachedValue('classroom_courses');
    return cached != null ? cached as List<dynamic> : [];
  }

  /// Cache classroom courses
  Future<void> cacheClassroomCourses(List<dynamic> courses) async {
    await _setCachedValue('classroom_courses', courses);
  }

  /// Get cached classroom course by ID
  Future<dynamic> getCachedClassroomCourse(String courseId) async {
    return _getCachedValue('classroom_course_$courseId');
  }

  /// Get cached course mappings
  Future<List<dynamic>> getCachedCourseMappings() async {
    final cached = await _getCachedValue('course_mappings');
    return cached != null ? cached as List<dynamic> : [];
  }

  /// Cache course mappings
  Future<void> cacheCourseMappings(List<dynamic> mappings) async {
    await _setCachedValue('course_mappings', mappings);
  }

  /// Get cached sync history
  Future<List<dynamic>> getCachedSyncHistory() async {
    final cached = await _getCachedValue('lms_sync_history');
    return cached != null ? cached as List<dynamic> : [];
  }

  /// Cache sync history
  Future<void> cacheSyncHistory(List<dynamic> history) async {
    await _setCachedValue('lms_sync_history', history);
  }

  /// Get cached assignment links
  Future<List<dynamic>> getCachedAssignmentLinks() async {
    final cached = await _getCachedValue('assignment_links');
    return cached != null ? cached as List<dynamic> : [];
  }

  /// Cache assignment links
  Future<void> cacheAssignmentLinks(List<dynamic> links) async {
    await _setCachedValue('assignment_links', links);
  }

  /// Get cached pending grades for passback
  Future<List<dynamic>> getCachedPendingGrades() async {
    final cached = await _getCachedValue('pending_grades');
    return cached != null ? cached as List<dynamic> : [];
  }

  /// Cache pending grades
  Future<void> cachePendingGrades(List<dynamic> grades) async {
    await _setCachedValue('pending_grades', grades);
  }

  /// Clear all LMS/Google Classroom cache
  Future<void> clearLmsCache() async {
    await _db.deleteContentByKeys([
      'lms_connection_status',
      'classroom_courses',
      'course_mappings',
      'lms_sync_history',
      'assignment_links',
      'pending_grades',
    ]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GOOGLE CLASSROOM STUDENT ROSTER CACHE
  // ════════════════════════════════════════════════════════════════════════════

  /// Get cached students for a classroom course
  Future<List<dynamic>> getCachedStudents(String cacheKey) async {
    final cached = await _getCachedValue(cacheKey);
    return cached != null ? cached as List<dynamic> : [];
  }

  /// Cache students for a classroom course (generic key-based caching)
  Future<void> cacheClassroomStudents(String cacheKey, List<dynamic> students) async {
    await _setCachedValue(cacheKey, students);
  }

  /// Get cached student mappings
  Future<List<dynamic>> getCachedStudentMappings(String cacheKey) async {
    final cached = await _getCachedValue(cacheKey);
    return cached != null ? cached as List<dynamic> : [];
  }

  /// Cache student mappings
  Future<void> cacheStudentMappings(String cacheKey, List<dynamic> mappings) async {
    await _setCachedValue(cacheKey, mappings);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RISK PREDICTION CACHE
  // ════════════════════════════════════════════════════════════════════════════

  /// Get cached risk prediction for a student
  Future<dynamic> getCachedRiskPrediction(String studentId) async {
    return _getCachedValue('risk_prediction_$studentId');
  }

  /// Cache risk prediction for a student
  Future<void> cacheRiskPrediction(String studentId, dynamic prediction) async {
    await _setCachedValue('risk_prediction_$studentId', prediction);
  }

  /// Get cached classroom risk summary
  Future<dynamic> getCachedClassroomRiskSummary(String classroomId) async {
    return _getCachedValue('classroom_risk_summary_$classroomId');
  }

  /// Cache classroom risk summary
  Future<void> cacheClassroomRiskSummary(String classroomId, dynamic summary) async {
    await _setCachedValue('classroom_risk_summary_$classroomId', summary);
  }

  /// Get cached early warning report
  Future<dynamic> getCachedEarlyWarningReport(String classId) async {
    return _getCachedValue('early_warning_report_$classId');
  }

  /// Cache early warning report
  Future<void> cacheEarlyWarningReport(String classId, dynamic report) async {
    await _setCachedValue('early_warning_report_$classId', report);
  }

  /// Get cached at-risk students list
  Future<List<dynamic>> getCachedAtRiskStudents() async {
    final cached = await _getCachedValue('at_risk_students');
    return cached != null ? cached as List<dynamic> : [];
  }

  /// Cache at-risk students list
  Future<void> cacheAtRiskStudents(List<dynamic> students) async {
    await _setCachedValue('at_risk_students', students);
  }

  /// Get cached risk history for a student
  Future<List<dynamic>> getCachedRiskHistory(String studentId) async {
    final cached = await _getCachedValue('risk_history_$studentId');
    return cached != null ? cached as List<dynamic> : [];
  }

  /// Cache risk history for a student
  Future<void> cacheRiskHistory(String studentId, List<dynamic> history) async {
    await _setCachedValue('risk_history_$studentId', history);
  }

  /// Get cached student IDs
  Future<List<String>> getCachedStudentIds() async {
    final cached = await _getCachedValue('student_ids');
    if (cached == null) return [];
    return (cached as List<dynamic>).cast<String>();
  }

  // ========================================================================
  // PHASE 1 ENHANCEMENTS - Advanced Risk Prediction Cache Methods
  // ========================================================================

  /// Get cached student risk profile
  Future<dynamic> getCachedRiskProfile(String studentId) async {
    return _getCachedValue('risk_profile_$studentId');
  }

  /// Cache student risk profile
  Future<void> cacheRiskProfile(String studentId, dynamic profile) async {
    await _setCachedValue('risk_profile_$studentId', profile);
  }

  /// Get cached class risk overview
  Future<dynamic> getCachedClassRiskOverview(String classId) async {
    return _getCachedValue('class_risk_overview_$classId');
  }

  /// Cache class risk overview
  Future<void> cacheClassRiskOverview(String classId, dynamic overview) async {
    await _setCachedValue('class_risk_overview_$classId', overview);
  }

  /// Get cached risk trends
  Future<dynamic> getCachedRiskTrends(String studentId) async {
    return _getCachedValue('risk_trends_$studentId');
  }

  /// Cache risk trends
  Future<void> cacheRiskTrends(String studentId, dynamic trends) async {
    await _setCachedValue('risk_trends_$studentId', trends);
  }

  /// Get cached predictive indicators
  Future<List<dynamic>> getCachedPredictiveIndicators(String studentId) async {
    final cached = await _getCachedValue('predictive_indicators_$studentId');
    return cached != null ? cached as List<dynamic> : [];
  }

  /// Cache predictive indicators
  Future<void> cachePredictiveIndicators(String studentId, List<dynamic> indicators) async {
    await _setCachedValue('predictive_indicators_$studentId', indicators);
  }

  /// Get cached historical risk data
  Future<dynamic> getCachedHistoricalRiskData(String studentId) async {
    return _getCachedValue('historical_risk_data_$studentId');
  }

  /// Cache historical risk data
  Future<void> cacheHistoricalRiskData(String studentId, dynamic historicalData) async {
    await _setCachedValue('historical_risk_data_$studentId', historicalData);
  }

  // ========================================================================
  // INTERVENTION CACHE METHODS
  // ========================================================================

  /// Get cached intervention suggestions
  Future<List<dynamic>> getCachedInterventionSuggestions(String studentId) async {
    final cached = await _getCachedValue('intervention_suggestions_$studentId');
    return cached != null ? cached as List<dynamic> : [];
  }

  /// Cache intervention suggestions
  Future<void> cacheInterventionSuggestions(
    String studentId,
    List<dynamic> suggestions,
  ) async {
    await _setCachedValue('intervention_suggestions_$studentId', suggestions);
  }

  /// Get cached intervention
  Future<dynamic> getCachedIntervention(String interventionId) async {
    return _getCachedValue('intervention_$interventionId');
  }

  /// Cache intervention
  Future<void> cacheIntervention(dynamic intervention) async {
    final id = intervention is Map ? intervention['id'] as String? : null;
    if (id != null) {
      await _setCachedValue('intervention_$id', intervention);
    }
  }

  /// Get cached intervention outcome
  Future<dynamic> getCachedInterventionOutcome(String outcomeId) async {
    return _getCachedValue('intervention_outcome_$outcomeId');
  }

  /// Cache intervention outcome
  Future<void> cacheInterventionOutcome(dynamic outcome) async {
    final id = outcome is Map ? outcome['id'] as String? : null;
    if (id != null) {
      await _setCachedValue('intervention_outcome_$id', outcome);
    }
  }

  /// Get cached intervention history
  Future<dynamic> getCachedInterventionHistory(String studentId) async {
    return _getCachedValue('intervention_history_$studentId');
  }

  /// Cache intervention history
  Future<void> cacheInterventionHistory(String studentId, dynamic history) async {
    await _setCachedValue('intervention_history_$studentId', history);
  }

  /// Get cached active interventions
  Future<List<dynamic>> getCachedActiveInterventions(String studentId) async {
    final cached = await _getCachedValue('active_interventions_$studentId');
    return cached != null ? cached as List<dynamic> : [];
  }

  /// Cache active interventions
  Future<void> cacheActiveInterventions(
    String studentId,
    List<dynamic> interventions,
  ) async {
    await _setCachedValue('active_interventions_$studentId', interventions);
  }

  /// Get cached intervention templates
  Future<List<dynamic>> getCachedInterventionTemplates() async {
    final cached = await _getCachedValue('intervention_templates');
    return cached != null ? cached as List<dynamic> : [];
  }

  /// Cache intervention templates
  Future<void> cacheInterventionTemplates(List<dynamic> templates) async {
    await _setCachedValue('intervention_templates', templates);
  }

  /// Delete intervention from cache
  Future<void> deleteIntervention(String interventionId) async {
    await _db.deleteContentByKeys(['intervention_$interventionId']);
  }

  /// Clear all intervention cache
  Future<void> clearInterventionCache() async {
    // This would need to be implemented more efficiently in production
    // For now, we'll just document it needs implementation
  }

  /// Clear all risk prediction cache
  Future<void> clearRiskCache() async {
    // Delete all content with 'risk' in the key (using batch delete would be more efficient)
    // For now, we'll delete the main known keys
    await _db.deleteContentByKeys([
      'at_risk_students',
      'student_ids',
    ]);
  }

  // ========================================================================
  // GRADE PASSBACK SETTINGS & QUEUE CACHE
  // ========================================================================

  /// Get cached passback settings
  Future<PassbackSettings?> getCachedPassbackSettings() async {
    final cached = await _getCachedValue('passback_settings');
    if (cached == null) return null;
    return PassbackSettings.fromJson(cached as Map<String, dynamic>);
  }

  /// Cache passback settings
  Future<void> cachePassbackSettings(PassbackSettings settings) async {
    await _setCachedValue('passback_settings', settings.toJson());
  }

  /// Get cached passback history
  Future<List<GradePassbackQueueItem>?> getCachedPassbackHistory() async {
    final cached = await _getCachedValue('passback_history');
    if (cached == null) return null;
    return (cached as List<dynamic>)
        .map((json) => GradePassbackQueueItem.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Cache passback history
  Future<void> cachePassbackHistory(List<GradePassbackQueueItem> history) async {
    await _setCachedValue(
      'passback_history',
      history.map((h) => h.toJson()).toList(),
    );
  }

  /// Get passback queue (pending items to sync)
  Future<List<GradePassbackQueueItem>> getPassbackQueue() async {
    final cached = await _getCachedValue('passback_queue');
    if (cached == null) return [];
    return (cached as List<dynamic>)
        .map((json) => GradePassbackQueueItem.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Add item to passback queue
  Future<void> addToPassbackQueue(GradePassbackQueueItem item) async {
    final queue = await getPassbackQueue();
    queue.add(item);
    await _setCachedValue(
      'passback_queue',
      queue.map((i) => i.toJson()).toList(),
    );
  }

  /// Update passback queue item status
  Future<void> updatePassbackQueueItemStatus(
    String itemId,
    GradeSyncStatus status, {
    String? error,
    bool incrementAttempt = false,
  }) async {
    final queue = await getPassbackQueue();
    final index = queue.indexWhere((i) => i.id == itemId);
    if (index == -1) return;

    final item = queue[index];
    queue[index] = item.copyWith(
      status: status,
      lastError: error,
      attemptCount: incrementAttempt ? item.attemptCount + 1 : item.attemptCount,
      lastAttemptAt: DateTime.now(),
    );

    await _setCachedValue(
      'passback_queue',
      queue.map((i) => i.toJson()).toList(),
    );
  }

  /// Remove synced items from passback queue
  Future<void> cleanupPassbackQueue() async {
    final queue = await getPassbackQueue();
    final filtered = queue.where((i) => i.status != GradeSyncStatus.synced).toList();
    await _setCachedValue(
      'passback_queue',
      filtered.map((i) => i.toJson()).toList(),
    );
  }

  /// Clear passback queue
  Future<void> clearPassbackQueue() async {
    await _db.deleteContentByKeys(['passback_queue']);
  }
}
