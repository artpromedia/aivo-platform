/// Teacher Local Database
///
/// Local SQLite database for offline-first functionality.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter_common/flutter_common.dart';
import 'package:uuid/uuid.dart';

import '../../models/models.dart';

const _uuid = Uuid();

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
    final metadata = learner.metadata != null
        ? jsonDecode(learner.metadata!) as Map<String, dynamic>
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
      lastActiveAt: learner.lastSyncedAt,
      createdAt: learner.cachedAt,
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
      avatarUrl: student.avatarUrl,
      cachedAt: student.createdAt ?? DateTime.now(),
      lastSyncedAt: student.lastActiveAt,
      metadata: metadata,
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SESSIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get all sessions.
  Future<List<Session>> getSessions() async {
    // Use the content cache for sessions
    final cached = await _db.getAllCachedContent();
    return cached
        .where((c) => c.contentType == 'session')
        .map((c) => Session.fromJson(jsonDecode(c.contentData) as Map<String, dynamic>))
        .toList();
  }

  /// Get a session by ID.
  Future<Session?> getSession(String id) async {
    final cached = await _db.getCachedContent(id);
    if (cached == null || cached.contentType != 'session') return null;
    return Session.fromJson(jsonDecode(cached.contentData) as Map<String, dynamic>);
  }

  /// Cache sessions.
  Future<void> cacheSessions(List<Session> sessions) async {
    for (final session in sessions) {
      await _db.cacheContent(OfflineContentCacheCompanion.insert(
        contentId: session.id,
        contentType: 'session',
        contentData: jsonEncode(session.toJson()),
        cachedAt: DateTime.now(),
      ));
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // IEP GOALS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get IEP goals for a student.
  Future<List<IepGoal>> getIepGoals(String studentId) async {
    final cached = await _db.getAllCachedContent();
    return cached
        .where((c) => c.contentType == 'iep_goal')
        .map((c) => IepGoal.fromJson(jsonDecode(c.contentData) as Map<String, dynamic>))
        .where((g) => g.studentId == studentId)
        .toList();
  }

  /// Cache IEP goals.
  Future<void> cacheIepGoals(List<IepGoal> goals) async {
    for (final goal in goals) {
      await _db.cacheContent(OfflineContentCacheCompanion.insert(
        contentId: goal.id,
        contentType: 'iep_goal',
        contentData: jsonEncode(goal.toJson()),
        cachedAt: DateTime.now(),
      ));
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MESSAGES
  // ════════════════════════════════════════════════════════════════════════════

  /// Get conversations.
  Future<List<Conversation>> getConversations() async {
    final cached = await _db.getAllCachedContent();
    return cached
        .where((c) => c.contentType == 'conversation')
        .map((c) => Conversation.fromJson(jsonDecode(c.contentData) as Map<String, dynamic>))
        .toList();
  }

  /// Get messages for a conversation.
  Future<List<Message>> getMessages(String conversationId) async {
    final cached = await _db.getAllCachedContent();
    return cached
        .where((c) => c.contentType == 'message')
        .map((c) => Message.fromJson(jsonDecode(c.contentData) as Map<String, dynamic>))
        .where((m) => m.conversationId == conversationId)
        .toList();
  }

  /// Cache conversations.
  Future<void> cacheConversations(List<Conversation> conversations) async {
    for (final conv in conversations) {
      await _db.cacheContent(OfflineContentCacheCompanion.insert(
        contentId: conv.id,
        contentType: 'conversation',
        contentData: jsonEncode(conv.toJson()),
        cachedAt: DateTime.now(),
      ));
    }
  }

  /// Cache messages.
  Future<void> cacheMessages(List<Message> messages) async {
    for (final msg in messages) {
      await _db.cacheContent(OfflineContentCacheCompanion.insert(
        contentId: msg.id,
        contentType: 'message',
        contentData: jsonEncode(msg.toJson()),
        cachedAt: DateTime.now(),
      ));
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SYNC QUEUE
  // ════════════════════════════════════════════════════════════════════════════

  /// Add an operation to the sync queue.
  Future<void> addSyncOperation(SyncOperation operation) async {
    await _db.addToSyncQueue(OfflineSyncQueueCompanion.insert(
      operationId: operation.id,
      operationType: operation.type.name,
      entityType: operation.entityType,
      entityId: operation.entityId,
      payload: jsonEncode(operation.data),
      createdAt: operation.createdAt,
      status: operation.status.name,
      retryCount: operation.retryCount,
    ));
  }

  /// Get pending sync operations.
  Future<List<SyncOperation>> getPendingSyncOperations() async {
    final queue = await _db.getPendingSyncOperations();
    return queue.map(_queueItemToOperation).toList();
  }

  /// Get pending sync count.
  Future<int> getPendingSyncCount() async {
    final queue = await _db.getPendingSyncOperations();
    return queue.length;
  }

  /// Get a sync operation by ID.
  Future<SyncOperation?> getSyncOperation(String id) async {
    final items = await _db.getPendingSyncOperations();
    final item = items.where((i) => i.operationId == id).firstOrNull;
    return item != null ? _queueItemToOperation(item) : null;
  }

  /// Mark operation as synced.
  Future<void> markSynced(String operationId) async {
    await _db.updateSyncQueueStatus(operationId, 'synced');
  }

  /// Mark operation as failed.
  Future<void> markFailed(String operationId, String error) async {
    await _db.updateSyncQueueStatus(operationId, 'failed');
  }

  /// Mark operation as having a conflict.
  Future<void> markConflict(String operationId, String conflictData) async {
    await _db.updateSyncQueueStatus(operationId, 'conflict');
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
    await _db.removeFromSyncQueue(operationId);
  }

  SyncOperation _queueItemToOperation(OfflineSyncQueueData item) {
    return SyncOperation(
      id: item.operationId,
      type: SyncOperationType.values.firstWhere(
        (e) => e.name == item.operationType,
        orElse: () => SyncOperationType.update,
      ),
      entityType: item.entityType,
      entityId: item.entityId,
      data: jsonDecode(item.payload) as Map<String, dynamic>,
      createdAt: item.createdAt,
      status: SyncStatus.values.firstWhere(
        (e) => e.name == item.status,
        orElse: () => SyncStatus.pending,
      ),
      retryCount: item.retryCount,
      lastError: item.errorMessage,
      lastAttemptAt: item.lastAttemptAt,
    );
  }
}
