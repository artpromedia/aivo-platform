/// Tutor Chat Bubble Widget
///
/// Displays a single message in the tutor chat interface with different
/// styling for user, assistant, and system messages. Assistant messages
/// include an emotion indicator and optional audio playback button.
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../models/tutor_models.dart';

/// Chat bubble widget for displaying tutor conversation messages.
class TutorChatBubble extends StatelessWidget {
  /// The message to display.
  final TutorMessage message;

  /// Name of the tutor persona (shown in assistant message header).
  final String personaName;

  /// Callback to play TTS audio for this message. Null if no audio.
  final VoidCallback? onPlayAudio;

  const TutorChatBubble({
    super.key,
    required this.message,
    required this.personaName,
    this.onPlayAudio,
  });

  @override
  Widget build(BuildContext context) {
    switch (message.role) {
      case MessageRole.user:
        return _buildUserBubble(context);
      case MessageRole.assistant:
        return _buildAssistantBubble(context);
      case MessageRole.system:
        return _buildSystemBubble(context);
    }
  }

  Widget _buildUserBubble(BuildContext context) {
    final theme = Theme.of(context);

    return Align(
      alignment: Alignment.centerRight,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        child: Semantics(
          label: 'You said: ${message.content}',
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(4),
              ),
            ),
            child: Text(
              message.content,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onPrimary,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAssistantBubble(BuildContext context) {
    final theme = Theme.of(context);

    return Align(
      alignment: Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.80,
        ),
        child: Semantics(
          label: '$personaName said: ${message.content}',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: persona name + emotion indicator
              Padding(
                padding: const EdgeInsets.only(left: 4, bottom: 4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      personaName,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: AivoBrand.gray.shade600,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (message.emotion != null) ...[
                      const SizedBox(width: 6),
                      _EmotionBadge(emotion: message.emotion!),
                    ],
                  ],
                ),
              ),

              // Message bubble
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(4),
                    topRight: Radius.circular(16),
                    bottomLeft: Radius.circular(16),
                    bottomRight: Radius.circular(16),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      message.content,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurface,
                      ),
                    ),

                    // Audio playback button
                    if (onPlayAudio != null) ...[
                      const SizedBox(height: 8),
                      _AudioPlayButton(onTap: onPlayAudio!),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSystemBubble(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Semantics(
        label: 'System message: ${message.content}',
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 4),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: theme.colorScheme.errorContainer.withOpacity(0.5),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            message.content,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onErrorContainer,
              fontStyle: FontStyle.italic,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// EMOTION BADGE
// ============================================================================

/// Small badge showing the tutor's current emotion state.
class _EmotionBadge extends StatelessWidget {
  final EmotionType emotion;

  const _EmotionBadge({required this.emotion});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: _emotionColor.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _emotionIcon,
            size: 10,
            color: _emotionColor,
          ),
          const SizedBox(width: 3),
          Text(
            emotion.label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: _emotionColor,
              fontSize: 9,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  IconData get _emotionIcon {
    switch (emotion) {
      case EmotionType.neutral:
        return Icons.sentiment_neutral_rounded;
      case EmotionType.happy:
        return Icons.sentiment_satisfied_rounded;
      case EmotionType.thinking:
        return Icons.psychology_rounded;
      case EmotionType.encouraging:
        return Icons.thumb_up_rounded;
      case EmotionType.excited:
        return Icons.celebration_rounded;
      case EmotionType.empathetic:
        return Icons.favorite_rounded;
    }
  }

  Color get _emotionColor {
    switch (emotion) {
      case EmotionType.neutral:
        return Colors.grey;
      case EmotionType.happy:
        return Colors.amber.shade700;
      case EmotionType.thinking:
        return Colors.blue;
      case EmotionType.encouraging:
        return Colors.green;
      case EmotionType.excited:
        return Colors.purple;
      case EmotionType.empathetic:
        return Colors.pink;
    }
  }
}

// ============================================================================
// AUDIO PLAY BUTTON
// ============================================================================

/// Compact button to trigger TTS audio playback for a message.
class _AudioPlayButton extends StatelessWidget {
  final VoidCallback onTap;

  const _AudioPlayButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Semantics(
      button: true,
      label: 'Play audio',
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: theme.colorScheme.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.volume_up_rounded,
                size: 14,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: 4),
              Text(
                'Listen',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
