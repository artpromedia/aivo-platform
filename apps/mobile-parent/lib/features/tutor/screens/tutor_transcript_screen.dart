/// Tutor Transcript Screen
///
/// Text-only parent review of a tutor session conversation.
/// Shows session metadata at the top and a scrollable message list.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/tutor_models.dart';
import '../providers/tutor_provider.dart';

/// Subject color lookup matching the backend.
const Map<String, Color> _subjectColors = {
  'MATH': Color(0xFF3B82F6),
  'ELA': Color(0xFFA855F7),
  'SCIENCE': Color(0xFF22C55E),
  'HISTORY': Color(0xFFF97316),
  'CODING': Color(0xFF06B6D4),
};

/// Full-screen transcript viewer for parent review.
class TutorTranscriptScreen extends ConsumerWidget {
  const TutorTranscriptScreen({
    super.key,
    required this.sessionId,
    required this.personaName,
    required this.subject,
  });

  final String sessionId;
  final String personaName;
  final String subject;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final transcriptAsync = ref.watch(tutorTranscriptProvider(sessionId));
    final theme = Theme.of(context);
    final color = _subjectColors[subject.toUpperCase()] ?? Colors.grey;

    return Scaffold(
      appBar: AppBar(
        title: Text(personaName),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(24),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Padding(
              padding: const EdgeInsets.only(left: 16, bottom: 8),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    subject,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      body: transcriptAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _TranscriptError(
          message: error.toString(),
          onRetry: () => ref.invalidate(tutorTranscriptProvider(sessionId)),
        ),
        data: (transcript) => _TranscriptBody(transcript: transcript),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSCRIPT BODY
// ═══════════════════════════════════════════════════════════════════════════════

class _TranscriptBody extends StatelessWidget {
  const _TranscriptBody({required this.transcript});

  final TranscriptResponse transcript;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final session = transcript.session;
    final messages = transcript.messages;

    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 32),
      itemCount: messages.length + 1, // +1 for the header
      itemBuilder: (context, index) {
        if (index == 0) {
          return _SessionHeader(session: session);
        }
        final message = messages[index - 1];
        return _MessageBubble(
          message: message,
          personaName: session.persona.name,
        );
      },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION HEADER
// ═══════════════════════════════════════════════════════════════════════════════

class _SessionHeader extends StatelessWidget {
  const _SessionHeader({required this.session});

  final TranscriptSession session;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final startedAt = DateTime.tryParse(session.startedAt);

    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.timer_outlined,
                size: 16,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 4),
              Text(
                '${session.durationMinutes} minutes',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(width: 16),
              if (startedAt != null) ...[
                Icon(
                  Icons.calendar_today,
                  size: 16,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 4),
                Text(
                  _formatDate(startedAt),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          ),
          if (session.topic != null) ...[
            const SizedBox(height: 8),
            Text(
              session.topic!,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }

  static String _formatDate(DateTime dt) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final hour = dt.hour == 0
        ? 12
        : dt.hour > 12
            ? dt.hour - 12
            : dt.hour;
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year} at '
        '$hour:${dt.minute.toString().padLeft(2, '0')} $period';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE BUBBLE
// ═══════════════════════════════════════════════════════════════════════════════

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.message,
    required this.personaName,
  });

  final TranscriptMessage message;
  final String personaName;

  bool get _isUser => message.role == 'USER';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 3),
      child: Align(
        alignment: _isUser ? Alignment.centerRight : Alignment.centerLeft,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.78,
          ),
          child: Column(
            crossAxisAlignment:
                _isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              // Sender label
              Padding(
                padding: const EdgeInsets.only(left: 4, right: 4, bottom: 2),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _isUser ? 'Your child' : personaName,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (message.emotion != null) ...[
                      const SizedBox(width: 6),
                      _EmotionChip(emotion: message.emotion!),
                    ],
                  ],
                ),
              ),

              // Bubble
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: _isUser
                      ? theme.colorScheme.primary
                      : theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(16),
                    topRight: const Radius.circular(16),
                    bottomLeft: Radius.circular(_isUser ? 16 : 4),
                    bottomRight: Radius.circular(_isUser ? 4 : 16),
                  ),
                ),
                child: Text(
                  message.content,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: _isUser
                        ? theme.colorScheme.onPrimary
                        : theme.colorScheme.onSurface,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION CHIP
// ═══════════════════════════════════════════════════════════════════════════════

class _EmotionChip extends StatelessWidget {
  const _EmotionChip({required this.emotion});

  final String emotion;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _emotionColor(emotion);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        emotion,
        style: theme.textTheme.labelSmall?.copyWith(
          color: color,
          fontSize: 9,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  static Color _emotionColor(String emotion) {
    switch (emotion.toLowerCase()) {
      case 'happy':
        return Colors.amber.shade700;
      case 'thinking':
        return Colors.blue;
      case 'encouraging':
        return Colors.green;
      case 'excited':
        return Colors.purple;
      case 'empathetic':
        return Colors.pink;
      default:
        return Colors.grey;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR STATE
// ═══════════════════════════════════════════════════════════════════════════════

class _TranscriptError extends StatelessWidget {
  const _TranscriptError({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Failed to load transcript',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
