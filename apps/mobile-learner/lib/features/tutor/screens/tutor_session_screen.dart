/// Tutor Session Screen
///
/// Active tutoring session screen with an animated avatar at the top,
/// scrollable chat messages in the middle, and an input bar at the bottom.
/// Integrates both the REST session provider and the WebSocket realtime
/// provider for streaming messages with audio lip-sync.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/tutor_models.dart';
import '../providers/tutor_session_provider.dart';
import '../providers/tutor_realtime_provider.dart';
import '../providers/tutor_audio_provider.dart';
import '../providers/tutor_voice_preference_provider.dart';
import '../widgets/animated_tutor_avatar.dart';
import '../widgets/tutor_chat_bubble.dart';
import '../widgets/tutor_input_bar.dart';

/// Screen displaying an active tutoring session with chat interface.
class TutorSessionScreen extends ConsumerStatefulWidget {
  final TutorPersona persona;

  const TutorSessionScreen({
    super.key,
    required this.persona,
  });

  @override
  ConsumerState<TutorSessionScreen> createState() =>
      _TutorSessionScreenState();
}

class _TutorSessionScreenState extends ConsumerState<TutorSessionScreen> {
  final ScrollController _scrollController = ScrollController();
  bool _realtimeConnected = false;

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  /// Connect to the WebSocket once the session becomes active.
  void _connectRealtime(TutorSession session) {
    if (_realtimeConnected) return;
    _realtimeConnected = true;

    final sessionState = ref.read(tutorSessionProvider);
    List<TutorMessage>? initialMessages;
    if (sessionState is TutorSessionActive) {
      initialMessages = sessionState.messages;
    }

    ref.read(tutorRealtimeProvider.notifier).connect(
          sessionId: session.id,
          realtimeUrl:
              const String.fromEnvironment('REALTIME_URL', defaultValue: 'ws://localhost:4010'),
          getAuthToken: () => '',
          initialMessages: initialMessages,
        );
  }

  /// Scroll the chat list to the bottom after a new message arrives.
  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _handleSendMessage(String content) async {
    if (content.trim().isEmpty) return;

    final rtState = ref.read(tutorRealtimeProvider);
    if (rtState.isConnected) {
      ref.read(tutorRealtimeProvider.notifier).sendMessage(content.trim());
    } else {
      await ref.read(tutorSessionProvider.notifier).sendMessage(content.trim());
    }
    _scrollToBottom();
  }

  Future<void> _handleEndSession() async {
    final shouldEnd = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('End session?'),
        content: const Text(
          'Are you sure you want to end this tutoring session?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('End Session'),
          ),
        ],
      ),
    );

    if (shouldEnd == true) {
      await ref.read(tutorRealtimeProvider.notifier).disconnect();
      await ref.read(tutorSessionProvider.notifier).endSession();
      await ref.read(tutorAudioProvider.notifier).stop();

      if (mounted) {
        Navigator.of(context).pop();
      }
    }
  }

  void _handlePlayAudio(TutorMessage message) {
    if (message.hasAudio) {
      ref.read(tutorAudioProvider.notifier).playMessageAudio(message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sessionState = ref.watch(tutorSessionProvider);
    final rtState = ref.watch(tutorRealtimeProvider);
    final audioState = ref.watch(tutorAudioProvider);
    final voicePref = ref.watch(tutorVoicePreferenceProvider);

    // Connect realtime when session becomes active
    if (sessionState is TutorSessionActive && !_realtimeConnected) {
      _connectRealtime(sessionState.session);
    }

    // Determine the current emotion for the avatar
    final currentEmotion = _getCurrentEmotion(sessionState, rtState, audioState);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              widget.persona.subject.icon,
              size: 20,
              color: widget.persona.subject.color,
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                widget.persona.name,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        actions: [
          if (sessionState is TutorSessionActive) ...[
            // Connection indicator
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Icon(
                rtState.isConnected
                    ? Icons.wifi_rounded
                    : Icons.wifi_off_rounded,
                size: 16,
                color: rtState.isConnected ? Colors.green : Colors.grey,
              ),
            ),
            IconButton(
              icon: Icon(
                voicePref.voiceEnabled
                    ? Icons.volume_up_rounded
                    : Icons.volume_off_rounded,
              ),
              tooltip: voicePref.voiceEnabled ? 'Voice on' : 'Voice off',
              onPressed: () {
                ref.read(tutorVoicePreferenceProvider.notifier).toggle();
                if (voicePref.voiceEnabled) {
                  ref.read(tutorAudioProvider.notifier).stop();
                }
              },
            ),
            IconButton(
              icon: const Icon(Icons.stop_circle_outlined),
              tooltip: 'End Session',
              onPressed: _handleEndSession,
            ),
          ],
        ],
      ),
      body: _buildBody(context, theme, sessionState, rtState, audioState, currentEmotion),
    );
  }

  Widget _buildBody(
    BuildContext context,
    ThemeData theme,
    TutorSessionState sessionState,
    TutorRealtimeState rtState,
    TutorAudioState audioState,
    EmotionType currentEmotion,
  ) {
    switch (sessionState) {
      case TutorSessionIdle():
      case TutorSessionLoading():
        return const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Starting session...'),
            ],
          ),
        );

      case TutorSessionError():
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.error_outline_rounded,
                  size: 64,
                  color: theme.colorScheme.error,
                ),
                const SizedBox(height: 16),
                Text(
                  'Something went wrong',
                  style: theme.textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  sessionState.message,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Go Back'),
                ),
              ],
            ),
          ),
        );

      case TutorSessionActive():
        return _buildActiveSession(
          context,
          theme,
          sessionState,
          rtState,
          audioState,
          currentEmotion,
        );

      case TutorSessionEnded():
        return _buildEndedSession(context, theme, sessionState);
    }
  }

  Widget _buildActiveSession(
    BuildContext context,
    ThemeData theme,
    TutorSessionActive sessionState,
    TutorRealtimeState rtState,
    TutorAudioState audioState,
    EmotionType currentEmotion,
  ) {
    // Prefer realtime messages if connected
    final messages = rtState.isConnected && rtState.messages.isNotEmpty
        ? rtState.messages
        : sessionState.messages;
    final isTyping = rtState.isAiTyping || sessionState.isSending;

    return Column(
      children: [
        // Animated tutor avatar area
        Container(
          height: 180,
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                widget.persona.subject.backgroundColor,
                theme.colorScheme.surface,
              ],
            ),
          ),
          child: Center(
            child: AnimatedTutorAvatar(
              personaAssetKey: widget.persona.avatarAssetKey,
              emotion: currentEmotion,
              mouthOpenAmount: audioState.mouthOpenAmount,
              size: 140,
            ),
          ),
        ),

        // Error banner from realtime
        if (rtState.error != null)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: theme.colorScheme.errorContainer,
            child: Text(
              rtState.error!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onErrorContainer,
              ),
              textAlign: TextAlign.center,
            ),
          ),

        // Chat messages
        Expanded(
          child: _buildMessageList(theme, messages, rtState.streamingText, isTyping),
        ),

        // Input bar
        TutorInputBar(
          onSubmit: _handleSendMessage,
          isLoading: isTyping,
          enabled: !isTyping,
        ),
      ],
    );
  }

  Widget _buildMessageList(
    ThemeData theme,
    List<TutorMessage> messages,
    String streamingText,
    bool isTyping,
  ) {
    if (messages.isEmpty && streamingText.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Say hello to start your tutoring session!',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    final showStreaming = streamingText.isNotEmpty;
    final itemCount = messages.length + (showStreaming ? 1 : 0);

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        // Streaming text bubble at the end
        if (showStreaming && index == messages.length) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _StreamingBubble(
              text: streamingText,
              personaName: widget.persona.name,
            ),
          );
        }

        final message = messages[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: TutorChatBubble(
            message: message,
            personaName: widget.persona.name,
            onPlayAudio: message.hasAudio
                ? () => _handlePlayAudio(message)
                : null,
          ),
        );
      },
    );
  }

  Widget _buildEndedSession(
    BuildContext context,
    ThemeData theme,
    TutorSessionEnded sessionState,
  ) {
    return Column(
      children: [
        // Session summary header with celebration
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                theme.colorScheme.primaryContainer.withOpacity(0.5),
                theme.colorScheme.secondaryContainer.withOpacity(0.3),
              ],
            ),
          ),
          child: Column(
            children: [
              const Text(
                '🎉',
                style: TextStyle(fontSize: 48),
              ),
              const SizedBox(height: 12),
              Text(
                'Session Complete!',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${sessionState.messages.length} messages '
                '- ${sessionState.session.formattedDuration}',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              if (sessionState.session.analytics != null) ...[
                const SizedBox(height: 12),
                _buildAnalyticsSummary(theme, sessionState.session.analytics!),
              ],
            ],
          ),
        ),

        // Read-only message history
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            itemCount: sessionState.messages.length,
            itemBuilder: (context, index) {
              final message = sessionState.messages[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: TutorChatBubble(
                  message: message,
                  personaName: widget.persona.name,
                ),
              );
            },
          ),
        ),

        // Return button
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Return to Tutors'),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAnalyticsSummary(ThemeData theme, SessionAnalytics analytics) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _AnalyticChip(
          icon: Icons.help_outline_rounded,
          label: '${analytics.questionsAsked} questions',
          theme: theme,
        ),
        const SizedBox(width: 12),
        _AnalyticChip(
          icon: Icons.check_circle_outline_rounded,
          label: '${analytics.correctAnswers} correct',
          theme: theme,
        ),
        if (analytics.engagementScore > 0) ...[
          const SizedBox(width: 12),
          _AnalyticChip(
            icon: Icons.star_outline_rounded,
            label: '${(analytics.engagementScore * 100).toInt()}% engaged',
            theme: theme,
          ),
        ],
      ],
    );
  }

  /// Determine the current emotion to display on the avatar.
  EmotionType _getCurrentEmotion(
    TutorSessionState sessionState,
    TutorRealtimeState rtState,
    TutorAudioState audioState,
  ) {
    // Realtime avatar state takes priority
    if (rtState.isConnected) {
      switch (rtState.avatarState) {
        case 'thinking':
          return EmotionType.thinking;
        case 'celebrating':
          return EmotionType.excited;
        case 'encouraging':
          return EmotionType.encouraging;
        case 'talking':
          return EmotionType.happy;
      }
    }

    if (sessionState is TutorSessionActive && sessionState.isSending) {
      return EmotionType.thinking;
    }

    if (sessionState is TutorSessionActive &&
        sessionState.messages.isNotEmpty) {
      final lastAssistantMessage = sessionState.messages
          .where((m) => m.isAssistant)
          .lastOrNull;

      if (lastAssistantMessage?.emotion != null) {
        return lastAssistantMessage!.emotion!;
      }
    }

    return EmotionType.neutral;
  }
}

// ============================================================================
// STREAMING BUBBLE
// ============================================================================

/// Displays the AI's in-progress streaming text with a blinking cursor.
class _StreamingBubble extends StatelessWidget {
  final String text;
  final String personaName;

  const _StreamingBubble({required this.text, required this.personaName});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Align(
      alignment: Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.80,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 4),
              child: Text(
                personaName,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(4),
                  topRight: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Flexible(
                    child: Text(
                      text,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                  ),
                  const SizedBox(width: 2),
                  _BlinkingCursor(color: theme.colorScheme.primary),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// BLINKING CURSOR
// ============================================================================

class _BlinkingCursor extends StatefulWidget {
  final Color color;
  const _BlinkingCursor({required this.color});

  @override
  State<_BlinkingCursor> createState() => _BlinkingCursorState();
}

class _BlinkingCursorState extends State<_BlinkingCursor>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Opacity(
          opacity: _controller.value,
          child: Container(
            width: 2,
            height: 16,
            decoration: BoxDecoration(
              color: widget.color,
              borderRadius: BorderRadius.circular(1),
            ),
          ),
        );
      },
    );
  }
}

// ============================================================================
// ANALYTIC CHIP
// ============================================================================

class _AnalyticChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final ThemeData theme;

  const _AnalyticChip({
    required this.icon,
    required this.label,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: theme.colorScheme.primary),
          const SizedBox(width: 4),
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}
