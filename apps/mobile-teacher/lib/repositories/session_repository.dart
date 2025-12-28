/// Session Repository
///
/// Offline-first data access for sessions.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_common/flutter_common.dart';

import '../models/models.dart';
import '../services/database/local_database.dart';
import '../services/sync/sync_service.dart';
import '../services/sync/connectivity_monitor.dart';

/// Repository for session data access.
class SessionRepository {
  SessionRepository({
    required this.api,
    required this.db,
    required this.sync,
    required this.connectivity,
  });

  final AivoApiClient api;
  final TeacherLocalDatabase db;
  final SyncService sync;
  final ConnectivityMonitor connectivity;

  /// Get all sessions.
  Future<List<Session>> getSessions() async {
    final cached = await db.getSessions();
    
    if (await connectivity.isOnline) {
      _refreshSessionsInBackground();
    }
    
    return cached;
  }

  /// Get sessions by class.
  Future<List<Session>> getSessionsByClass(String classId) async {
    final all = await getSessions();
    return all.where((s) => s.classId == classId).toList();
  }

  /// Get active sessions for a class.
  Future<List<Session>> getActiveSessions(String classId) async {
    final sessions = await getSessionsByClass(classId);
    return sessions.where((s) => s.status == SessionStatus.active).toList();
  }

  /// Get a session by ID.
  Future<Session?> getSession(String id) async {
    var session = await db.getSession(id);
    
    if (session == null && await connectivity.isOnline) {
      try {
        final response = await api.get('/session/sessions/$id');
        session = Session.fromJson(response.data as Map<String, dynamic>);
        await db.cacheSessions([session]);
      } catch (e) {
        debugPrint('[SessionRepository] Error fetching session: $e');
      }
    }
    
    return session;
  }

  /// Create a new session.
  Future<Session> createSession(CreateSessionDto dto) async {
    if (await connectivity.isOnline) {
      try {
        final response = await api.post('/session/sessions', data: dto.toJson());
        final session = Session.fromJson(response.data as Map<String, dynamic>);
        await db.cacheSessions([session]);
        return session;
      } catch (e) {
        // Fall through to offline creation
      }
    }

    // Create locally with temp ID
    final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}';
    final session = Session(
      id: tempId,
      classId: dto.classId,
      teacherId: '', // Will be set by server
      status: SessionStatus.scheduled,
      sessionType: dto.sessionType,
      title: dto.title,
      description: dto.description,
      studentIds: dto.studentIds,
      subject: dto.subject,
      scheduledAt: dto.scheduledAt,
      durationMinutes: dto.durationMinutes,
      objectives: dto.objectives,
      createdAt: DateTime.now(),
    );

    await db.cacheSessions([session]);
    await sync.queueCreate(
      entityType: 'session',
      entityId: tempId,
      data: dto.toJson(),
    );

    return session;
  }

  /// Start a session.
  Future<Session> startSession(String sessionId) async {
    final session = await getSession(sessionId);
    if (session == null) throw Exception('Session not found');

    final updated = session.copyWith(
      status: SessionStatus.active,
      startedAt: DateTime.now(),
    );

    await db.cacheSessions([updated]);
    await sync.queueUpdate(
      entityType: 'session',
      entityId: sessionId,
      data: {'status': 'active', 'startedAt': updated.startedAt?.toIso8601String()},
    );

    return updated;
  }

  /// End a session.
  Future<Session> endSession(String sessionId, {String? notes}) async {
    final session = await getSession(sessionId);
    if (session == null) throw Exception('Session not found');

    final updated = session.copyWith(
      status: SessionStatus.completed,
      endedAt: DateTime.now(),
      notes: notes ?? session.notes,
    );

    await db.cacheSessions([updated]);
    await sync.queueUpdate(
      entityType: 'session',
      entityId: sessionId,
      data: {
        'status': 'completed',
        'endedAt': updated.endedAt?.toIso8601String(),
        'notes': notes,
      },
    );

    return updated;
  }

  /// Add a note to a session.
  Future<SessionNote> addSessionNote({
    required String sessionId,
    required String content,
    String? studentId,
    bool isPrivate = false,
    List<String> tags = const [],
  }) async {
    final noteId = 'note_${DateTime.now().millisecondsSinceEpoch}';
    final note = SessionNote(
      id: noteId,
      sessionId: sessionId,
      studentId: studentId,
      content: content,
      isPrivate: isPrivate,
      tags: tags,
      createdAt: DateTime.now(),
    );

    await sync.queueCreate(
      entityType: 'session_note',
      entityId: noteId,
      data: note.toJson(),
    );

    return note;
  }

  /// Force refresh from server.
  Future<List<Session>> refreshSessions() async {
    if (!await connectivity.isOnline) {
      return db.getSessions();
    }

    try {
      final response = await api.get('/session/sessions');
      final data = response.data as List;
      final sessions = data
          .map((json) => Session.fromJson(json as Map<String, dynamic>))
          .toList();
      
      await db.cacheSessions(sessions);
      return sessions;
    } catch (e) {
      debugPrint('[SessionRepository] Error refreshing sessions: $e');
      return db.getSessions();
    }
  }

  void _refreshSessionsInBackground() async {
    try {
      final response = await api.get('/session/sessions');
      final data = response.data as List;
      final sessions = data
          .map((json) => Session.fromJson(json as Map<String, dynamic>))
          .toList();
      
      await db.cacheSessions(sessions);
    } catch (e) {
      debugPrint('[SessionRepository] Background refresh failed: $e');
    }
  }
}
