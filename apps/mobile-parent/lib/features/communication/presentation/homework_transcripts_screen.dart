/// Homework Transcripts Screen
///
/// Screen for viewing homework session transcripts.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/communication_models.dart';
import '../providers/communication_provider.dart';

/// Screen showing list of homework transcripts.
class HomeworkTranscriptsScreen extends ConsumerWidget {
  const HomeworkTranscriptsScreen({
    super.key,
    required this.childId,
  });

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final transcriptsAsync = ref.watch(transcriptsNotifierProvider(childId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Homework Sessions'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (subject) {
              ref
                  .read(transcriptsNotifierProvider(childId).notifier)
                  .filterBySubject(subject == 'all' ? null : subject);
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'all',
                child: Text('All Subjects'),
              ),
              const PopupMenuItem(
                value: 'math',
                child: Text('Math'),
              ),
              const PopupMenuItem(
                value: 'reading',
                child: Text('Reading'),
              ),
              const PopupMenuItem(
                value: 'science',
                child: Text('Science'),
              ),
              const PopupMenuItem(
                value: 'writing',
                child: Text('Writing'),
              ),
            ],
          ),
        ],
      ),
      body: transcriptsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (transcripts) {
          if (transcripts.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.history,
                    size: 64,
                    color: theme.colorScheme.outline,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No homework sessions yet',
                    style: theme.textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Homework session transcripts\nwill appear here',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () =>
                ref.read(transcriptsNotifierProvider(childId).notifier).refresh(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: transcripts.length,
              itemBuilder: (context, index) {
                final transcript = transcripts[index];
                return _TranscriptCard(
                  transcript: transcript,
                  onTap: () => context.push(
                    '/children/$childId/transcripts/${transcript.id}',
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

/// Card showing transcript summary.
class _TranscriptCard extends StatelessWidget {
  const _TranscriptCard({
    required this.transcript,
    required this.onTap,
  });

  final HomeworkTranscript transcript;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final completion = (transcript.completionPercentage * 100).round();

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
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
                      color: _getSubjectColor(transcript.subject)
                          .withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      _getSubjectIcon(transcript.subject),
                      color: _getSubjectColor(transcript.subject),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          transcript.assignmentTitle,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          '${_formatSubject(transcript.subject)} · ${_formatDate(transcript.startTime)}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.outline,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _CompletionBadge(percentage: completion),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _MetricChip(
                    icon: Icons.timer,
                    label: '${transcript.durationMinutes} min',
                  ),
                  const SizedBox(width: 8),
                  _MetricChip(
                    icon: Icons.help_outline,
                    label: '${transcript.summary.hintsUsed} hints',
                  ),
                  const SizedBox(width: 8),
                  _MetricChip(
                    icon: Icons.check_circle_outline,
                    label:
                        '${transcript.summary.correctAnswers}/${transcript.summary.totalQuestions}',
                  ),
                ],
              ),
              if (transcript.aiSummary != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest
                        .withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.auto_awesome,
                        size: 16,
                        color: theme.colorScheme.primary,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          transcript.aiSummary!,
                          style: theme.textTheme.bodySmall,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Color _getSubjectColor(String subject) {
    final colors = {
      'math': Colors.blue,
      'reading': Colors.green,
      'science': Colors.purple,
      'writing': Colors.orange,
    };
    return colors[subject.toLowerCase()] ?? Colors.grey;
  }

  IconData _getSubjectIcon(String subject) {
    final icons = {
      'math': Icons.calculate,
      'reading': Icons.menu_book,
      'science': Icons.science,
      'writing': Icons.edit_note,
    };
    return icons[subject.toLowerCase()] ?? Icons.school;
  }

  String _formatSubject(String subject) {
    return subject.substring(0, 1).toUpperCase() + subject.substring(1);
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inDays == 0) {
      return 'Today';
    } else if (diff.inDays == 1) {
      return 'Yesterday';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} days ago';
    } else {
      return '${date.month}/${date.day}';
    }
  }
}

/// Completion badge.
class _CompletionBadge extends StatelessWidget {
  const _CompletionBadge({required this.percentage});

  final int percentage;

  @override
  Widget build(BuildContext context) {
    final color = percentage >= 80
        ? Colors.green
        : percentage >= 50
            ? Colors.orange
            : Colors.red;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        '$percentage%',
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }
}

/// Small metric chip.
class _MetricChip extends StatelessWidget {
  const _MetricChip({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: theme.colorScheme.outline),
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

/// Screen showing transcript details.
class TranscriptDetailScreen extends ConsumerWidget {
  const TranscriptDetailScreen({
    super.key,
    required this.childId,
    required this.transcriptId,
  });

  final String childId;
  final String transcriptId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final transcriptAsync = ref.watch(transcriptProvider(childId, transcriptId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Session Details'),
      ),
      body: transcriptAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (transcript) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Header
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      transcript.assignmentTitle,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.school, size: 16, color: theme.colorScheme.outline),
                        const SizedBox(width: 4),
                        Text(
                          _formatSubject(transcript.subject),
                          style: theme.textTheme.bodySmall,
                        ),
                        const SizedBox(width: 16),
                        Icon(Icons.schedule, size: 16, color: theme.colorScheme.outline),
                        const SizedBox(width: 4),
                        Text(
                          '${transcript.durationMinutes} minutes',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.calendar_today, size: 16, color: theme.colorScheme.outline),
                        const SizedBox(width: 4),
                        Text(
                          _formatDateTime(transcript.startTime),
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Summary stats
            _SummarySection(summary: transcript.summary),
            const SizedBox(height: 16),

            // AI summary
            if (transcript.aiSummary != null) ...[
              Text(
                'AI Summary',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.auto_awesome, color: theme.colorScheme.primary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(transcript.aiSummary!),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Timeline
            Text(
              'Session Timeline',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            ...transcript.entries.map(
              (entry) => _TimelineEntry(entry: entry),
            ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  String _formatSubject(String subject) {
    return subject.substring(0, 1).toUpperCase() + subject.substring(1);
  }

  String _formatDateTime(DateTime date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final hour = date.hour > 12 ? date.hour - 12 : date.hour;
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '${months[date.month - 1]} ${date.day} at $hour:${date.minute.toString().padLeft(2, '0')} $period';
  }
}

/// Summary section widget.
class _SummarySection extends StatelessWidget {
  const _SummarySection({required this.summary});

  final TranscriptSummary summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accuracy = summary.totalQuestions > 0
        ? (summary.correctAnswers / summary.totalQuestions * 100).round()
        : 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Performance Summary',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _SummaryTile(
                    icon: Icons.check_circle,
                    label: 'Accuracy',
                    value: '$accuracy%',
                    color: Colors.green,
                  ),
                ),
                Expanded(
                  child: _SummaryTile(
                    icon: Icons.help,
                    label: 'Hints Used',
                    value: '${summary.hintsUsed}',
                    color: Colors.orange,
                  ),
                ),
                Expanded(
                  child: _SummaryTile(
                    icon: Icons.warning,
                    label: 'Struggles',
                    value: '${summary.strugglesDetected}',
                    color: Colors.red,
                  ),
                ),
              ],
            ),
            if (summary.strengthsShown.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(
                'Strengths',
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Wrap(
                spacing: 4,
                runSpacing: 4,
                children: summary.strengthsShown.map((s) {
                  return Chip(
                    avatar: const Icon(Icons.star, size: 16, color: Colors.amber),
                    label: Text(s, style: theme.textTheme.labelSmall),
                    padding: EdgeInsets.zero,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  );
                }).toList(),
              ),
            ],
            if (summary.areasForImprovement.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'Areas for Improvement',
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Wrap(
                spacing: 4,
                runSpacing: 4,
                children: summary.areasForImprovement.map((a) {
                  return Chip(
                    avatar: const Icon(Icons.trending_up, size: 16, color: Colors.blue),
                    label: Text(a, style: theme.textTheme.labelSmall),
                    padding: EdgeInsets.zero,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  );
                }).toList(),
              ),
            ],
            if (summary.parentRecommendation != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.family_restroom, size: 20, color: Colors.blue),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'For Parents',
                            style: theme.textTheme.labelMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: Colors.blue,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            summary.parentRecommendation!,
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Summary tile.
class _SummaryTile extends StatelessWidget {
  const _SummaryTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Icon(icon, color: color),
        const SizedBox(height: 4),
        Text(
          value,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.outline,
          ),
        ),
      ],
    );
  }
}

/// Timeline entry widget.
class _TimelineEntry extends StatelessWidget {
  const _TimelineEntry({required this.entry});

  final TranscriptEntry entry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (icon, color, title) = _getEntryInfo(entry.type);

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 16, color: color),
              ),
              Container(
                width: 2,
                height: 40,
                color: theme.dividerColor,
              ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          title,
                          style: theme.textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: color,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          _formatTime(entry.timestamp),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.outline,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      entry.content,
                      style: theme.textTheme.bodySmall,
                    ),
                    if (entry.wasCorrect != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            entry.wasCorrect! ? Icons.check : Icons.close,
                            size: 14,
                            color: entry.wasCorrect! ? Colors.green : Colors.red,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            entry.wasCorrect! ? 'Correct' : 'Needs review',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: entry.wasCorrect! ? Colors.green : Colors.red,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  (IconData, Color, String) _getEntryInfo(TranscriptEntryType type) {
    switch (type) {
      case TranscriptEntryType.question:
        return (Icons.help_outline, Colors.blue, 'Question');
      case TranscriptEntryType.answer:
        return (Icons.chat_bubble_outline, Colors.green, 'Answer');
      case TranscriptEntryType.hintRequested:
        return (Icons.lightbulb_outline, Colors.orange, 'Hint Used');
      case TranscriptEntryType.aiExplanation:
        return (Icons.auto_awesome, Colors.purple, 'AI Explanation');
      case TranscriptEntryType.struggleDetected:
        return (Icons.warning_amber, Colors.red, 'Struggle Detected');
      case TranscriptEntryType.breakTaken:
        return (Icons.coffee, Colors.teal, 'Break');
      case TranscriptEntryType.topicChange:
        return (Icons.swap_horiz, Colors.indigo, 'Topic Change');
      case TranscriptEntryType.milestoneReached:
        return (Icons.emoji_events, Colors.amber, 'Milestone');
    }
  }

  String _formatTime(DateTime time) {
    final hour = time.hour > 12 ? time.hour - 12 : time.hour;
    final period = time.hour >= 12 ? 'PM' : 'AM';
    return '$hour:${time.minute.toString().padLeft(2, '0')} $period';
  }
}
