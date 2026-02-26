/// Tutor Session Provider
///
/// Riverpod state management for the tutor session lifecycle including
/// persona loading, session creation, message exchange, and session
/// completion. Uses StateNotifier pattern consistent with the codebase.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/tutor_models.dart';
import '../services/tutor_api_service.dart';

// ============================================================================
// STATE CLASSES
// ============================================================================

/// State for the list of available tutor personas.
sealed class TutorPersonasState {
  const TutorPersonasState();
}

class TutorPersonasLoading extends TutorPersonasState {
  const TutorPersonasLoading();
}

class TutorPersonasLoaded extends TutorPersonasState {
  const TutorPersonasLoaded(this.personas);
  final List<TutorPersona> personas;
}

class TutorPersonasError extends TutorPersonasState {
  const TutorPersonasError(this.message);
  final String message;
}

/// State for an active tutor session with messages.
sealed class TutorSessionState {
  const TutorSessionState();
}

class TutorSessionIdle extends TutorSessionState {
  const TutorSessionIdle();
}

class TutorSessionLoading extends TutorSessionState {
  const TutorSessionLoading();
}

class TutorSessionError extends TutorSessionState {
  const TutorSessionError(this.message);
  final String message;
}

class TutorSessionActive extends TutorSessionState {
  const TutorSessionActive({
    required this.session,
    required this.persona,
    required this.messages,
    this.isSending = false,
    this.isLoadingMessages = false,
  });

  final TutorSession session;
  final TutorPersona persona;
  final List<TutorMessage> messages;
  final bool isSending;
  final bool isLoadingMessages;

  TutorSessionActive copyWith({
    TutorSession? session,
    TutorPersona? persona,
    List<TutorMessage>? messages,
    bool? isSending,
    bool? isLoadingMessages,
  }) {
    return TutorSessionActive(
      session: session ?? this.session,
      persona: persona ?? this.persona,
      messages: messages ?? this.messages,
      isSending: isSending ?? this.isSending,
      isLoadingMessages: isLoadingMessages ?? this.isLoadingMessages,
    );
  }
}

class TutorSessionEnded extends TutorSessionState {
  const TutorSessionEnded({
    required this.session,
    required this.messages,
  });

  final TutorSession session;
  final List<TutorMessage> messages;
}

/// State for tutor session history list.
sealed class TutorHistoryState {
  const TutorHistoryState();
}

class TutorHistoryLoading extends TutorHistoryState {
  const TutorHistoryLoading();
}

class TutorHistoryLoaded extends TutorHistoryState {
  const TutorHistoryLoaded(this.sessions);
  final List<TutorSession> sessions;
}

class TutorHistoryError extends TutorHistoryState {
  const TutorHistoryError(this.message);
  final String message;
}

// ============================================================================
// PERSONAS NOTIFIER
// ============================================================================

/// Manages loading and caching of tutor personas.
class TutorPersonasNotifier extends StateNotifier<TutorPersonasState> {
  TutorPersonasNotifier(this._service) : super(const TutorPersonasLoading());

  final TutorApiService _service;

  /// Load all available tutor personas.
  Future<void> loadPersonas({TutorSubject? subject}) async {
    state = const TutorPersonasLoading();

    try {
      final personas = await _service.getPersonas(subject: subject);
      state = TutorPersonasLoaded(personas);
    } catch (e) {
      state = TutorPersonasError(e.toString());
    }
  }
}

// ============================================================================
// SESSION NOTIFIER
// ============================================================================

/// Manages the lifecycle of a single tutor session including message exchange.
class TutorSessionNotifier extends StateNotifier<TutorSessionState> {
  TutorSessionNotifier(this._service) : super(const TutorSessionIdle());

  final TutorApiService _service;

  /// Start a new tutoring session with the given persona.
  ///
  /// Creates a session on the backend, then loads the initial greeting
  /// message from the tutor.
  Future<void> startSession({
    required TutorPersona persona,
    String? topic,
  }) async {
    state = const TutorSessionLoading();

    try {
      final session = await _service.createSession(
        personaId: persona.id,
        subject: persona.subject,
        topic: topic,
      );

      // Load the initial messages (should include the tutor greeting).
      final messages = await _service.getMessages(sessionId: session.id);

      state = TutorSessionActive(
        session: session,
        persona: persona,
        messages: messages,
      );
    } catch (e) {
      state = TutorSessionError(e.toString());
    }
  }

  /// Resume an existing session by ID.
  Future<void> resumeSession({
    required String sessionId,
    required TutorPersona persona,
  }) async {
    state = const TutorSessionLoading();

    try {
      final session = await _service.getSession(sessionId);
      final messages = await _service.getMessages(sessionId: sessionId);

      if (session.status.isTerminal) {
        state = TutorSessionEnded(session: session, messages: messages);
      } else {
        state = TutorSessionActive(
          session: session,
          persona: persona,
          messages: messages,
        );
      }
    } catch (e) {
      state = TutorSessionError(e.toString());
    }
  }

  /// Send a message in the active session.
  ///
  /// Optimistically adds the user message to the UI, then waits for the
  /// assistant response from the backend. Updates state with the response
  /// once received.
  Future<void> sendMessage(String content) async {
    final current = state;
    if (current is! TutorSessionActive) return;

    // Create optimistic user message for immediate UI feedback.
    final userMessage = TutorMessage(
      id: 'temp-${DateTime.now().millisecondsSinceEpoch}',
      sessionId: current.session.id,
      role: MessageRole.user,
      content: content,
      timestamp: DateTime.now(),
    );

    state = current.copyWith(
      messages: [...current.messages, userMessage],
      isSending: true,
    );

    try {
      final response = await _service.sendMessage(
        sessionId: current.session.id,
        content: content,
      );

      // Replace temp user message with server-confirmed version and add
      // the assistant response.
      final currentState = state;
      if (currentState is TutorSessionActive) {
        final updatedMessages = [
          ...currentState.messages
              .where((m) => m.id != userMessage.id),
          userMessage.copyWith(
            id: 'user-${response.id}',
          ),
          response,
        ];

        state = currentState.copyWith(
          messages: updatedMessages,
          isSending: false,
          session: currentState.session.copyWith(
            messageCount: updatedMessages.length,
          ),
        );
      }
    } catch (e) {
      final currentState = state;
      if (currentState is TutorSessionActive) {
        // Add an error system message so the user knows something went wrong.
        final errorMessage = TutorMessage(
          id: 'error-${DateTime.now().millisecondsSinceEpoch}',
          sessionId: current.session.id,
          role: MessageRole.system,
          content: 'Failed to send message. Please try again.',
          timestamp: DateTime.now(),
        );

        state = currentState.copyWith(
          messages: [...currentState.messages, errorMessage],
          isSending: false,
        );
      }
    }
  }

  /// Load older messages for pagination.
  Future<void> loadMessages({String? before}) async {
    final current = state;
    if (current is! TutorSessionActive) return;

    state = current.copyWith(isLoadingMessages: true);

    try {
      final olderMessages = await _service.getMessages(
        sessionId: current.session.id,
        before: before,
      );

      state = current.copyWith(
        messages: [...olderMessages, ...current.messages],
        isLoadingMessages: false,
      );
    } catch (e) {
      state = current.copyWith(isLoadingMessages: false);
    }
  }

  /// End the current session.
  Future<void> endSession() async {
    final current = state;
    if (current is! TutorSessionActive) return;

    try {
      final endedSession = await _service.endSession(current.session.id);
      state = TutorSessionEnded(
        session: endedSession,
        messages: current.messages,
      );
    } catch (e) {
      // If ending fails, still allow the user to leave.
      state = TutorSessionEnded(
        session: current.session.copyWith(status: SessionStatus.completed),
        messages: current.messages,
      );
    }
  }

  /// Reset the session state back to idle.
  void reset() {
    state = const TutorSessionIdle();
  }
}

// ============================================================================
// HISTORY NOTIFIER
// ============================================================================

/// Manages loading the list of past tutor sessions.
class TutorHistoryNotifier extends StateNotifier<TutorHistoryState> {
  TutorHistoryNotifier(this._service) : super(const TutorHistoryLoading());

  final TutorApiService _service;

  /// Load past session history.
  Future<void> loadHistory({SessionStatus? status, int limit = 20}) async {
    state = const TutorHistoryLoading();

    try {
      final sessions = await _service.getSessions(
        status: status,
        limit: limit,
      );
      state = TutorHistoryLoaded(sessions);
    } catch (e) {
      state = TutorHistoryError(e.toString());
    }
  }

  /// Refresh history by reloading from the API.
  Future<void> refresh() async {
    await loadHistory();
  }
}

// ============================================================================
// PROVIDERS
// ============================================================================

/// Provider for the TutorApiService instance.
///
/// Must be overridden in the provider scope with a properly configured
/// instance that includes the base URL and auth token.
final tutorApiServiceProvider = Provider<TutorApiService>((ref) {
  throw UnimplementedError(
    'tutorApiServiceProvider must be overridden with a configured '
    'TutorApiService instance.',
  );
});

/// Provider for available tutor personas.
final tutorPersonasProvider =
    StateNotifierProvider<TutorPersonasNotifier, TutorPersonasState>((ref) {
  final service = ref.watch(tutorApiServiceProvider);
  return TutorPersonasNotifier(service);
});

/// Provider for the active tutor session.
final tutorSessionProvider =
    StateNotifierProvider<TutorSessionNotifier, TutorSessionState>((ref) {
  final service = ref.watch(tutorApiServiceProvider);
  return TutorSessionNotifier(service);
});

/// Provider for tutor session history.
final tutorHistoryProvider =
    StateNotifierProvider<TutorHistoryNotifier, TutorHistoryState>((ref) {
  final service = ref.watch(tutorApiServiceProvider);
  return TutorHistoryNotifier(service);
});
