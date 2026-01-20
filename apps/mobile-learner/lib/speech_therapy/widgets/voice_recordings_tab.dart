/// Voice Recordings Tab
///
/// View, playback, and manage saved voice recordings.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';

import '../models.dart';
import '../../screens/speech_therapy_screen.dart';

final recordingsProvider =
    FutureProvider.autoDispose.family<List<VoiceRecording>, String>((ref, learnerId) async {
  final service = ref.watch(speechTherapyServiceProvider);
  return service.getRecordings(learnerId);
});

/// Tab for viewing and managing voice recordings
class VoiceRecordingsTab extends ConsumerWidget {
  const VoiceRecordingsTab({
    super.key,
    required this.learnerId,
  });

  final String learnerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recordingsAsync = ref.watch(recordingsProvider(learnerId));

    return recordingsAsync.when(
      data: (recordings) {
        if (recordings.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.mic_none, size: 64, color: AivoBrand.gray),
                SizedBox(height: 16),
                Text(
                  'No recordings yet',
                  style: TextStyle(fontSize: 16, color: AivoBrand.gray),
                ),
                SizedBox(height: 8),
                Text(
                  'Complete exercises to create recordings',
                  style: TextStyle(fontSize: 14, color: AivoBrand.gray),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: recordings.length,
          itemBuilder: (context, index) {
            final recording = recordings[index];
            return _RecordingCard(
              recording: recording,
              onDelete: () async {
                await ref.read(speechTherapyServiceProvider).deleteRecording(recording.id);
                ref.invalidate(recordingsProvider(learnerId));
              },
            );
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(
        child: Text('Error loading recordings: $error'),
      ),
    );
  }
}

class _RecordingCard extends StatefulWidget {
  const _RecordingCard({
    required this.recording,
    required this.onDelete,
  });

  final VoiceRecording recording;
  final VoidCallback onDelete;

  @override
  State<_RecordingCard> createState() => _RecordingCardState();
}

class _RecordingCardState extends State<_RecordingCard> {
  bool _isPlaying = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final recording = widget.recording;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.mic,
                    color: theme.colorScheme.onPrimaryContainer,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        recording.targetSound != null
                            ? 'Sound: ${recording.targetSound!.toUpperCase()}'
                            : 'Recording',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatDate(recording.timestamp),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => _showDeleteDialog(context),
                  icon: const Icon(Icons.delete_outline),
                  color: theme.colorScheme.error,
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Duration and accuracy
            Row(
              children: [
                _InfoChip(
                  icon: Icons.schedule,
                  label: '${recording.durationSeconds}s',
                  color: theme.colorScheme.secondaryContainer,
                ),
                if (recording.accuracy != null) ...[
                  const SizedBox(width: 8),
                  _InfoChip(
                    icon: Icons.check_circle_outline,
                    label: '${(recording.accuracy! * 100).toStringAsFixed(0)}% accurate',
                    color: recording.accuracy! >= 0.7
                        ? AivoBrand.mint[100]!
                        : AivoBrand.sunshine[100]!,
                  ),
                ],
              ],
            ),

            // Feedback
            if (recording.feedback != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.lightbulb_outline,
                      size: 16,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        recording.feedback!,
                        style: theme.textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Playback button
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _togglePlayback,
                icon: Icon(_isPlaying ? Icons.stop : Icons.play_arrow),
                label: Text(_isPlaying ? 'Stop' : 'Play Recording'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        return '${difference.inMinutes}m ago';
      }
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${date.month}/${date.day}/${date.year}';
    }
  }

  void _togglePlayback() {
    setState(() => _isPlaying = !_isPlaying);

    if (_isPlaying) {
      // Simulate playback
      Future.delayed(Duration(seconds: widget.recording.durationSeconds), () {
        if (mounted) setState(() => _isPlaying = false);
      });
    }
  }

  void _showDeleteDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Recording'),
        content: const Text('Are you sure you want to delete this recording?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              widget.onDelete();
            },
            style: TextButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14),
          const SizedBox(width: 4),
          Text(
            label,
            style: theme.textTheme.labelSmall,
          ),
        ],
      ),
    );
  }
}
