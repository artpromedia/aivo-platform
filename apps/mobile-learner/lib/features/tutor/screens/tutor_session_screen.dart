/// Tutor Session Screen
///
/// Active tutoring session screen with an animated avatar at the top,
/// scrollable chat messages in the middle, and an input bar at the bottom.
/// Uses the tutor_session_provider for state and tutor_audio_provider
/// for TTS playback with lip-sync.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/tutor_models.dart';
import '../providers/tutor_session_provider.dart';
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

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
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

    await ref.read(tutorSessionProvider.notifier).sendMessage(content.trim());
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
    final audioState = ref.watch(tutorAudioProvider);
    final voicePref = ref.watch(tutorVoicePreferenceProvider);

    // Determine the current emotion for the avatar.
    final currentEmotion = _getCurrentEmotion(sessionState, audioState);

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
            IconButton(
              icon: Icon(
                voicePref.voiceEnabled
                    ? Icons.volume_up_rounded
                    : Icons.volume_off_rounded,
              ),
              tooltip: voicePref.voiceEnabled ? 'Voice on' : 'Voice off',
              onPressed: () {
                ref.read(tutorVoicePreferenceProvider.notifier).toggle();
                // Stop any currently playing audio when disabling voice
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
      body: _buildBody(context, theme, sessionState, audioState, currentEmotion),
    );
  }

  Widget _buildBody(
    BuildContext context,
    ThemeData theme,
    TutorSessionState sessionState,
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
    TutorAudioState audioState,
    EmotionType currentEmotion,
  ) {
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

        // Chat messages
        Expanded(
          child: _buildMessageList(theme, sessionState),
        ),

        // Input bar
        TutorInputBar(
          onSubmit: _handleSendMessage,
          isLoading: sessionState.isSending,
          enabled: !sessionState.isSending,
        ),
      ],
    );
  }

  Widget _buildMessageList(
    ThemeData theme,
    TutorSessionActive sessionState,
  ) {
    final messages = sessionState.messages;

    if (messages.isEmpty) {
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

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: messages.length,
      itemBuilder: (context, index) {
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
        // Session summary header
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: theme.colorScheme.primaryContainer.withOpacity(0.3),
          ),
          child: Column(
            children: [
              Icon(
                Icons.check_circle_rounded,
                size: 48,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(height: 12),
              Text(
                'Session Complete',
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

  /// Determine the current emotion to display on the avatar.
  EmotionType _getCurrentEmotion(
    TutorSessionState sessionState,
    TutorAudioState audioState,
  ) {
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
