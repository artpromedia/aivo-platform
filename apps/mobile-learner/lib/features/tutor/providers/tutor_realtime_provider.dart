/// Tutor Realtime Provider
///
/// Riverpod state management for real-time tutor session communication
/// via the WebSocketClient from libs/flutter-common.
///
/// Implements the stream-then-synthesize pattern:
///   1. Send message → receive text chunks → show text immediately
///   2. After text complete → receive audio + visemes
///   3. Play audio with lip-sync via tutorAudioProvider
library;

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_common/realtime/websocket_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/tutor_models.dart';
import 'tutor_audio_provider.dart';

// ============================================================================
// STATE
// ============================================================================

/// State for the real-time tutor session.
class TutorRealtimeState {
  final List<TutorMessage> messages;
  final String streamingText;
  final bool isAiTyping;
  final String avatarState;
  final bool isConnected;
  final String? error;
  final String sessionId;

  const TutorRealtimeState({
    this.messages = const [],
    this.streamingText = '',
    this.isAiTyping = false,
    this.avatarState = 'idle',
    this.isConnected = false,
    this.error,
    this.sessionId = '',
  });

  TutorRealtimeState copyWith({
    List<TutorMessage>? messages,
    String? streamingText,
    bool? isAiTyping,
    String? avatarState,
    bool? isConnected,
    String? error,
    String? sessionId,
  }) =>
      TutorRealtimeState(
        messages: messages ?? this.messages,
        streamingText: streamingText ?? this.streamingText,
        isAiTyping: isAiTyping ?? this.isAiTyping,
        avatarState: avatarState ?? this.avatarState,
        isConnected: isConnected ?? this.isConnected,
        error: error,
        sessionId: sessionId ?? this.sessionId,
      );
}

// ============================================================================
// NOTIFIER
// ============================================================================

/// Manages real-time tutor session communication via WebSocket.
///
/// Uses the existing [WebSocketClient] from flutter-common which wraps
/// raw WebSocket with auto-reconnect and room management. Listens for
/// tutor-specific events and drives avatar state + lip-sync.
class TutorRealtimeNotifier extends StateNotifier<TutorRealtimeState> {
  TutorRealtimeNotifier(this._audioNotifier)
      : super(const TutorRealtimeState());

  final TutorAudioNotifier _audioNotifier;
  WebSocketClient? _wsClient;
  final List<StreamSubscription<dynamic>> _subscriptions = [];
  Timer? _emotionRevertTimer;

  /// Connect to the tutor session via WebSocket.
  Future<void> connect({
    required String sessionId,
    required String realtimeUrl,
    required String Function() getAuthToken,
    List<TutorMessage>? initialMessages,
  }) async {
    state = state.copyWith(sessionId: sessionId);

    if (initialMessages != null) {
      state = state.copyWith(messages: initialMessages);
    }

    _wsClient = WebSocketClient(
      config: WebSocketConfig(url: realtimeUrl),
      getAuthToken: getAuthToken,
    );

    await _wsClient!.connect();

    // Join the tutor session room
    _wsClient!.send('tutor:session:join', {'sessionId': sessionId});
    state = state.copyWith(isConnected: true, error: null);

    // ── Listen for tutor events ─────────────────────────────────
    _subscriptions.add(
      _wsClient!.on('tutor:typing').listen((_) {
        state = state.copyWith(
          isAiTyping: true,
          avatarState: 'thinking',
          streamingText: '',
        );
      }),
    );

    _subscriptions.add(
      _wsClient!.on('tutor:message:chunk').listen((data) {
        final accumulated = data['accumulatedText'] as String? ?? '';
        state = state.copyWith(streamingText: accumulated);
      }),
    );

    _subscriptions.add(
      _wsClient!.on('tutor:avatar:state').listen((data) {
        final newAvatarState = data['avatarState'] as String? ?? 'idle';
        final durationMs = data['durationMs'] as int?;

        state = state.copyWith(avatarState: newAvatarState);

        if (durationMs != null) {
          _emotionRevertTimer?.cancel();
          _emotionRevertTimer = Timer(
            Duration(milliseconds: durationMs),
            () {
              if (state.avatarState == newAvatarState) {
                state = state.copyWith(avatarState: 'idle');
              }
            },
          );
        }
      }),
    );

    _subscriptions.add(
      _wsClient!.on('tutor:message:end').listen((data) {
        final messageId = data['messageId'] as String;
        final content = data['content'] as String;
        final audioUrl = data['audioUrl'] as String?;
        final visemesRaw = data['visemes'] as List<dynamic>? ?? [];
        final emotionTag = data['emotionTag'] as String? ?? 'talking';

        // Parse visemes
        final visemes = visemesRaw
            .map((v) {
              final m = v as Map<String, dynamic>;
              return VisemeData(
                offsetMs: (m['offsetMs'] as num).toInt(),
                visemeId: (m['visemeId'] ?? '0').toString(),
                mouthOpen: (m['mouthOpen'] as num?)?.toDouble() ?? 0.0,
                durationMs: (m['durationMs'] as num?)?.toInt() ?? 0,
              );
            })
            .toList();

        // Clear streaming state
        state = state.copyWith(
          isAiTyping: false,
          streamingText: '',
        );

        // Add completed message
        final newMessage = TutorMessage(
          id: messageId,
          sessionId: state.sessionId,
          role: MessageRole.assistant,
          content: content,
          timestamp: DateTime.now(),
          audioUrl: audioUrl,
          visemes: visemes,
        );

        state = state.copyWith(
          messages: [...state.messages, newMessage],
        );

        // Stream-then-synthesize: play audio AFTER text is complete
        if (audioUrl != null && audioUrl.isNotEmpty && visemes.isNotEmpty) {
          // Show emotion briefly
          final emotionState =
              emotionTag == 'celebrating' ? 'celebrating' : 'encouraging';
          state = state.copyWith(avatarState: emotionState);

          // After 800ms, start audio + lip-sync
          Future.delayed(const Duration(milliseconds: 800), () {
            if (!mounted) return;
            state = state.copyWith(avatarState: 'talking');
            _audioNotifier.playMessageAudio(newMessage);
          });
        } else {
          // No audio — brief emotion, then idle
          final emotionState =
              emotionTag == 'celebrating' ? 'celebrating' : 'encouraging';
          state = state.copyWith(avatarState: emotionState);
          Future.delayed(const Duration(seconds: 2), () {
            if (!mounted) return;
            state = state.copyWith(avatarState: 'idle');
          });
        }
      }),
    );

    _subscriptions.add(
      _wsClient!.on('tutor:error').listen((data) {
        final message = data['message'] as String? ?? 'Something went wrong';
        final recoverable = data['recoverable'] as bool? ?? true;

        state = state.copyWith(
          isAiTyping: false,
          streamingText: '',
          avatarState: 'idle',
          error: message,
        );

        if (recoverable) {
          Future.delayed(const Duration(seconds: 5), () {
            if (!mounted) return;
            if (state.error == message) {
              state = state.copyWith(error: null);
            }
          });
        }
      }),
    );

    _subscriptions.add(
      _wsClient!.on('tutor:session:state').listen((data) {
        final status = data['status'] as String?;
        if (status == 'COMPLETED' || status == 'EXPIRED') {
          state = state.copyWith(
            error: data['reason'] as String? ?? 'Session ended',
          );
        }
      }),
    );

    // Connection state monitoring
    _subscriptions.add(
      _wsClient!.statusStream.listen((status) {
        state = state.copyWith(
          isConnected: status == ConnectionStatus.connected,
        );
      }),
    );
  }

  /// Send a message to the tutor.
  void sendMessage(String content) {
    if (content.trim().isEmpty || _wsClient == null) return;

    // Optimistic: add user message immediately
    final userMessage = TutorMessage(
      id: 'temp-${DateTime.now().millisecondsSinceEpoch}',
      sessionId: state.sessionId,
      role: MessageRole.user,
      content: content.trim(),
      timestamp: DateTime.now(),
    );

    state = state.copyWith(
      messages: [...state.messages, userMessage],
    );

    _wsClient!.send('tutor:message:send', {
      'sessionId': state.sessionId,
      'content': content.trim(),
    });
  }

  /// Disconnect and clean up.
  Future<void> disconnect() async {
    _emotionRevertTimer?.cancel();

    for (final sub in _subscriptions) {
      await sub.cancel();
    }
    _subscriptions.clear();

    if (_wsClient != null) {
      _wsClient!.send(
        'tutor:session:leave',
        {'sessionId': state.sessionId},
      );
      await _wsClient!.disconnect();
      _wsClient = null;
    }

    state = state.copyWith(isConnected: false);
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}

// ============================================================================
// PROVIDER
// ============================================================================

/// Provider for real-time tutor session communication.
///
/// Usage:
/// ```dart
/// final rtState = ref.watch(tutorRealtimeProvider);
/// // Connect:
/// ref.read(tutorRealtimeProvider.notifier).connect(
///   sessionId: session.id,
///   realtimeUrl: 'ws://localhost:4010',
///   getAuthToken: () => authToken,
/// );
/// // Send message:
/// ref.read(tutorRealtimeProvider.notifier).sendMessage('Hello!');
/// ```
final tutorRealtimeProvider =
    StateNotifierProvider<TutorRealtimeNotifier, TutorRealtimeState>((ref) {
  final audioNotifier = ref.read(tutorAudioProvider.notifier);
  return TutorRealtimeNotifier(audioNotifier);
});
