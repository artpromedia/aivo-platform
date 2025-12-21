/// Sessions Provider
///
/// State management for session data.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../repositories/repositories.dart';
import 'core_providers.dart';

// ============================================================================
// State Classes
// ============================================================================

/// Sessions state.
class SessionsState {
  const SessionsState({
    this.sessions = const [],
    this.activeSessions = const [],
    this.isLoading = false,
    this.error,
    this.lastUpdated,
  });

  final List<Session> sessions;
  final List<Session> activeSessions;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;

  SessionsState copyWith({
    List<Session>? sessions,
    List<Session>? activeSessions,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
  }) {
    return SessionsState(
      sessions: sessions ?? this.sessions,
      activeSessions: activeSessions ?? this.activeSessions,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

// ============================================================================
// State Notifier
// ============================================================================

/// Sessions notifier.
class SessionsNotifier extends StateNotifier<SessionsState> {
  SessionsNotifier(this._repository) : super(const SessionsState());

  final SessionRepository _repository;

  /// Load all sessions.
  Future<void> loadSessions() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final sessions = await _repository.getSessions();
      final active = sessions.where((s) => s.status == SessionStatus.active).toList();
      
      state = state.copyWith(
        sessions: sessions,
        activeSessions: active,
        isLoading: false,
        lastUpdated: DateTime.now(),
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Refresh sessions from server.
  Future<void> refreshSessions() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final sessions = await _repository.refreshSessions();
      final active = sessions.where((s) => s.status == SessionStatus.active).toList();
      
      state = state.copyWith(
        sessions: sessions,
        activeSessions: active,
        isLoading: false,
        lastUpdated: DateTime.now(),
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Create a session.
  Future<Session> createSession(CreateSessionDto dto) async {
    final session = await _repository.createSession(dto);
    state = state.copyWith(
      sessions: [...state.sessions, session],
    );
    return session;
  }

  /// Start a session.
  Future<void> startSession(String sessionId) async {
    try {
      final updated = await _repository.startSession(sessionId);
      _updateSessionInState(updated);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// End a session.
  Future<void> endSession(String sessionId, {String? notes}) async {
    try {
      final updated = await _repository.endSession(sessionId, notes: notes);
      _updateSessionInState(updated);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Add a note to a session.
  Future<SessionNote> addNote({
    required String sessionId,
    required String content,
    String? studentId,
    bool isPrivate = false,
    List<String> tags = const [],
  }) async {
    return _repository.addSessionNote(
      sessionId: sessionId,
      content: content,
      studentId: studentId,
      isPrivate: isPrivate,
      tags: tags,
    );
  }

  void _updateSessionInState(Session updated) {
    final sessions = state.sessions.map((s) => 
      s.id == updated.id ? updated : s
    ).toList();
    
    final active = sessions.where((s) => s.status == SessionStatus.active).toList();
    
    state = state.copyWith(
      sessions: sessions,
      activeSessions: active,
    );
  }
}

// ============================================================================
// Providers
// ============================================================================

/// Sessions state provider.
final sessionsProvider = StateNotifierProvider<SessionsNotifier, SessionsState>((ref) {
  final repository = ref.watch(sessionRepositoryProvider);
  return SessionsNotifier(repository);
});

/// Single session provider.
final sessionProvider = FutureProvider.family<Session?, String>((ref, id) async {
  final repository = ref.watch(sessionRepositoryProvider);
  return repository.getSession(id);
});

/// Sessions by class provider.
final sessionsByClassProvider = FutureProvider.family<List<Session>, String>((ref, classId) async {
  final repository = ref.watch(sessionRepositoryProvider);
  return repository.getSessionsByClass(classId);
});

/// Active sessions by class provider.
final activeSessionsByClassProvider = FutureProvider.family<List<Session>, String>((ref, classId) async {
  final repository = ref.watch(sessionRepositoryProvider);
  return repository.getActiveSessions(classId);
});

/// Today's sessions provider.
final todaysSessionsProvider = Provider<List<Session>>((ref) {
  final state = ref.watch(sessionsProvider);
  final today = DateTime.now();
  
  return state.sessions.where((s) {
    final scheduled = s.scheduledAt ?? s.createdAt;
    return scheduled.year == today.year &&
           scheduled.month == today.month &&
           scheduled.day == today.day;
  }).toList();
});

/// Upcoming sessions provider.
final upcomingSessionsProvider = Provider<List<Session>>((ref) {
  final state = ref.watch(sessionsProvider);
  final now = DateTime.now();
  
  return state.sessions.where((s) {
    final scheduled = s.scheduledAt;
    return scheduled != null && 
           scheduled.isAfter(now) && 
           s.status == SessionStatus.scheduled;
  }).toList()
    ..sort((a, b) => (a.scheduledAt ?? a.createdAt)
        .compareTo(b.scheduledAt ?? b.createdAt));
});
