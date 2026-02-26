/// Tutor Sessions Screen
///
/// View a child's tutor session history and detailed session reports.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/tutor_models.dart';
import '../providers/tutor_provider.dart';

/// Screen displaying a child's past tutor sessions.
///
/// Shows a chronological list of completed tutor sessions grouped by date.
/// Tapping a session expands a detailed session report inline.
class TutorSessionsScreen extends ConsumerWidget {
  const TutorSessionsScreen({
    super.key,
    required this.childId,
    required this.childName,
  });

  /// The ID of the child whose sessions to display.
  final String childId;

  /// Display name for the child, used in the app bar subtitle.
  final String childName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionsAsync = ref.watch(tutorSessionsProvider(childId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tutor Sessions'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(24),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Padding(
              padding: const EdgeInsets.only(left: 16, bottom: 8),
              child: Text(
                childName,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ),
        ),
      ),
      body: sessionsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _ErrorState(
          message: error.toString(),
          onRetry: () => ref.invalidate(tutorSessionsProvider(childId)),
        ),
        data: (sessions) {
          if (sessions.isEmpty) {
            return _EmptyState(childName: childName);
          }

          return RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(tutorSessionsProvider(childId)),
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: sessions.length,
              itemBuilder: (context, index) {
                final session = sessions[index];
                final showDateHeader = index == 0 ||
                    !_isSameDay(
                      sessions[index - 1].startedAt,
                      session.startedAt,
                    );

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (showDateHeader)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                        child: Text(
                          _formatDateHeader(session.startedAt),
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    _SessionTile(
                      session: session,
                      childId: childId,
                    ),
                  ],
                );
              },
            ),
          );
        },
      ),
    );
  }

  // ── Date helpers ───────────────────────────────────────────────────

  static bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  static String _formatDateHeader(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(date.year, date.month, date.day);
    final diff = today.difference(target).inDays;

    if (diff == 0) return 'Today';
    if (diff == 1) return 'Yesterday';
    if (diff < 7) return _weekdayName(date.weekday);

    return '${_monthName(date.month)} ${date.day}, ${date.year}';
  }

  static String _weekdayName(int weekday) {
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    return days[weekday - 1];
  }

  static String _monthName(int month) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return months[month - 1];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION TILE
// ═══════════════════════════════════════════════════════════════════════════════

/// A single session list tile. Tapping it opens the session report.
class _SessionTile extends ConsumerWidget {
  const _SessionTile({
    required this.session,
    required this.childId,
  });

  final TutorSession session;
  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _showSessionReport(context, ref),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Subject icon
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: _subjectColor(session.subject).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  _subjectIcon(session.subject),
                  color: _subjectColor(session.subject),
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),

              // Session info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            session.personaName,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          _formatTime(session.startedAt),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          _subjectIcon(session.subject),
                          size: 14,
                          color: colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _subjectLabel(session.subject),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Icon(
                          Icons.timer_outlined,
                          size: 14,
                          color: colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${session.durationMinutes} min',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                        if (session.masteryScoreDelta != null) ...[
                          const SizedBox(width: 12),
                          _MasteryDeltaBadge(delta: session.masteryScoreDelta!),
                        ],
                      ],
                    ),
                    if (session.summary != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        session.summary!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(width: 4),
              Icon(
                Icons.chevron_right,
                size: 20,
                color: colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSessionReport(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) =>
            _SessionReportSheet(
              childId: childId,
              sessionId: session.id,
              scrollController: scrollController,
            ),
      ),
    );
  }

  // ── Formatting helpers ─────────────────────────────────────────────

  static String _formatTime(DateTime dt) {
    final hour = dt.hour == 0
        ? 12
        : dt.hour > 12
            ? dt.hour - 12
            : dt.hour;
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:${dt.minute.toString().padLeft(2, '0')} $period';
  }

  static IconData _subjectIcon(String subject) {
    switch (subject.toLowerCase()) {
      case 'math':
        return Icons.calculate;
      case 'reading':
        return Icons.menu_book;
      case 'science':
        return Icons.science;
      case 'writing':
        return Icons.edit_note;
      case 'socialstudies':
      case 'social studies':
        return Icons.public;
      case 'sel':
        return Icons.favorite;
      case 'coding':
        return Icons.code;
      case 'language':
        return Icons.translate;
      default:
        return Icons.school;
    }
  }

  static String _subjectLabel(String subject) {
    switch (subject.toLowerCase()) {
      case 'math':
        return 'Math';
      case 'reading':
        return 'Reading';
      case 'science':
        return 'Science';
      case 'writing':
        return 'Writing';
      case 'socialstudies':
      case 'social studies':
        return 'Social Studies';
      case 'sel':
        return 'SEL';
      case 'coding':
        return 'Coding';
      case 'language':
        return 'Language';
      default:
        return subject;
    }
  }

  static Color _subjectColor(String subject) {
    switch (subject.toLowerCase()) {
      case 'math':
        return Colors.blue;
      case 'reading':
        return Colors.purple;
      case 'science':
        return Colors.teal;
      case 'writing':
        return Colors.orange;
      case 'socialstudies':
      case 'social studies':
        return Colors.brown;
      case 'sel':
        return Colors.pink;
      case 'coding':
        return Colors.indigo;
      case 'language':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION REPORT SHEET
// ═══════════════════════════════════════════════════════════════════════════════

/// Bottom sheet that fetches and shows the detailed session report.
class _SessionReportSheet extends ConsumerWidget {
  const _SessionReportSheet({
    required this.childId,
    required this.sessionId,
    required this.scrollController,
  });

  final String childId;
  final String sessionId;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportAsync =
        ref.watch(tutorSessionReportProvider(childId, sessionId));
    final theme = Theme.of(context);

    return reportAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 12),
            Text('Failed to load report', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(error.toString(), style: theme.textTheme.bodySmall),
          ],
        ),
      ),
      data: (report) => SingleChildScrollView(
        controller: scrollController,
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: theme.colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Title
            Text(
              'Session Report',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${report.personaName} -- ${report.subject}',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 20),

            // Quick stats row
            Row(
              children: [
                _ReportStat(
                  icon: Icons.timer,
                  label: 'Duration',
                  value: '${report.durationMinutes} min',
                ),
                const SizedBox(width: 16),
                if (report.masteryScoreBefore != null &&
                    report.masteryScoreAfter != null)
                  _ReportStat(
                    icon: Icons.trending_up,
                    label: 'Mastery',
                    value: '${report.masteryScoreBefore}% '
                        '-> ${report.masteryScoreAfter}%',
                  ),
              ],
            ),
            const SizedBox(height: 20),

            // Summary
            Text(
              'Summary',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(report.summary, style: theme.textTheme.bodyMedium),
            const SizedBox(height: 20),

            // Topics covered
            if (report.topicsCovered.isNotEmpty) ...[
              Text(
                'Topics Covered',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: report.topicsCovered
                    .map(
                      (topic) => Chip(
                        label: Text(topic),
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        visualDensity: VisualDensity.compact,
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 20),
            ],

            // Skills practiced
            if (report.skillsPracticed.isNotEmpty) ...[
              Text(
                'Skills Practiced',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              ...report.skillsPracticed.map(
                (skill) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Icon(
                        Icons.check_circle,
                        size: 16,
                        color: Colors.green,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(skill, style: theme.textTheme.bodyMedium),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],

            // AI notes
            if (report.aiNotes != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer
                      .withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.psychology,
                      size: 18,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'AI Tutor Notes',
                            style: theme.textTheme.labelSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            report.aiNotes!,
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Parent recommendation
            if (report.parentRecommendation != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border:
                      Border.all(color: Colors.amber.withValues(alpha: 0.4)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.lightbulb_outline,
                      size: 18,
                      color: Colors.amber,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Recommendation',
                            style: theme.textTheme.labelSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: Colors.amber.shade800,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            report.parentRecommendation!,
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Close button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Close'),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

/// Small stat block used in the report sheet.
class _ReportStat extends StatelessWidget {
  const _ReportStat({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: theme.colorScheme.primary),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  Text(
                    value,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Mastery score delta badge.
class _MasteryDeltaBadge extends StatelessWidget {
  const _MasteryDeltaBadge({required this.delta});

  final int delta;

  @override
  Widget build(BuildContext context) {
    final isPositive = delta > 0;
    final color = isPositive ? Colors.green : Colors.red;
    final prefix = isPositive ? '+' : '';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isPositive ? Icons.arrow_upward : Icons.arrow_downward,
            size: 10,
            color: color,
          ),
          const SizedBox(width: 2),
          Text(
            '$prefix$delta%',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

/// Empty state when no sessions exist for the child.
class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.childName});

  final String childName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.chat_bubble_outline,
                size: 40,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'No Sessions Yet',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '$childName hasn\'t had any tutor sessions yet.\n'
              'Sessions will appear here once they start learning with a tutor.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

/// Error state with retry affordance.
class _ErrorState extends StatelessWidget {
  const _ErrorState({
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
              'Failed to load sessions',
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
