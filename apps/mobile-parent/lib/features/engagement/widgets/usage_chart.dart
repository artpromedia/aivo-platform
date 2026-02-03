/// Usage Chart Widget
///
/// Visual charts for displaying usage statistics.
library;

import 'package:flutter/material.dart';

import '../models/engagement_models.dart';

/// Bar chart showing daily usage over a week.
class WeeklyUsageChart extends StatelessWidget {
  const WeeklyUsageChart({
    super.key,
    required this.summary,
  });

  final UsageSummary summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final maxMinutes = summary.dailyData
        .map((d) => d.totalMinutes)
        .fold(0, (a, b) => a > b ? a : b);
    final displayMax = maxMinutes > 0 ? maxMinutes : 60;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Weekly Activity',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.timer, size: 16, color: theme.colorScheme.primary),
                const SizedBox(width: 4),
                Text(
                  '${summary.totalMinutes} min total',
                  style: theme.textTheme.bodySmall,
                ),
                const SizedBox(width: 16),
                Icon(Icons.trending_up, size: 16, color: Colors.green),
                const SizedBox(width: 4),
                Text(
                  '${summary.averageDailyMinutes} min/day avg',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 150,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: List.generate(7, (index) {
                  final dayData = index < summary.dailyData.length
                      ? summary.dailyData[index]
                      : null;
                  final minutes = dayData?.totalMinutes ?? 0;
                  final height = minutes > 0
                      ? (minutes / displayMax) * 120
                      : 4.0;

                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(
                            minutes > 0 ? '$minutes' : '-',
                            style: theme.textTheme.labelSmall,
                          ),
                          const SizedBox(height: 4),
                          Container(
                            height: height,
                            decoration: BoxDecoration(
                              color: _getBarColor(minutes, theme),
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _getDayLabel(index),
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: theme.colorScheme.outline,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getBarColor(int minutes, ThemeData theme) {
    if (minutes >= 60) return Colors.green;
    if (minutes >= 30) return Colors.lightGreen;
    if (minutes > 0) return Colors.orange;
    return theme.colorScheme.surfaceContainerHighest;
  }

  String _getDayLabel(int index) {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return days[index];
  }
}

/// Pie chart showing subject breakdown.
class SubjectBreakdownChart extends StatelessWidget {
  const SubjectBreakdownChart({
    super.key,
    required this.subjectTotals,
  });

  final Map<String, int> subjectTotals;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = subjectTotals.values.fold(0, (a, b) => a + b);
    final sortedSubjects = subjectTotals.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Time by Subject',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            if (total == 0)
              Center(
                child: Text(
                  'No activity data',
                  style: theme.textTheme.bodySmall,
                ),
              )
            else
              ...sortedSubjects.take(5).map((entry) {
                final percentage = (entry.value / total * 100).round();
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _SubjectBar(
                    subject: entry.key,
                    minutes: entry.value,
                    percentage: percentage,
                    color: _getSubjectColor(entry.key),
                  ),
                );
              }),
          ],
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
      'social_studies': Colors.teal,
      'art': Colors.pink,
      'music': Colors.amber,
    };
    return colors[subject.toLowerCase()] ?? Colors.grey;
  }
}

/// Individual subject bar.
class _SubjectBar extends StatelessWidget {
  const _SubjectBar({
    required this.subject,
    required this.minutes,
    required this.percentage,
    required this.color,
  });

  final String subject;
  final int minutes;
  final int percentage;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  _formatSubjectName(subject),
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
            Text(
              '${minutes}m ($percentage%)',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        LinearProgressIndicator(
          value: percentage / 100,
          backgroundColor: color.withValues(alpha: 0.2),
          valueColor: AlwaysStoppedAnimation(color),
        ),
      ],
    );
  }

  String _formatSubjectName(String subject) {
    return subject
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word.isNotEmpty
            ? '${word[0].toUpperCase()}${word.substring(1)}'
            : '')
        .join(' ');
  }
}

/// Usage summary stats row.
class UsageStatsRow extends StatelessWidget {
  const UsageStatsRow({
    super.key,
    required this.usage,
  });

  final DailyUsage usage;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: Icons.timer,
            label: 'Total Time',
            value: '${usage.totalMinutes}m',
            color: Colors.blue,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StatCard(
            icon: Icons.play_circle,
            label: 'Active',
            value: '${usage.activeMinutes}m',
            color: Colors.green,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StatCard(
            icon: Icons.school,
            label: 'Lessons',
            value: '${usage.lessonsCompleted}',
            color: Colors.purple,
          ),
        ),
      ],
    );
  }
}

/// Individual stat card.
class _StatCard extends StatelessWidget {
  const _StatCard({
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

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 4),
            Text(
              value,
              style: theme.textTheme.titleMedium?.copyWith(
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
        ),
      ),
    );
  }
}

/// Session list showing recent activity sessions.
class SessionList extends StatelessWidget {
  const SessionList({
    super.key,
    required this.sessions,
    this.maxItems = 5,
  });

  final List<UsageSession> sessions;
  final int maxItems;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final displaySessions = sessions.take(maxItems).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Recent Sessions',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            if (displaySessions.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'No recent sessions',
                    style: theme.textTheme.bodySmall,
                  ),
                ),
              )
            else
              ...displaySessions.map((session) => _SessionTile(session: session)),
          ],
        ),
      ),
    );
  }
}

/// Individual session tile.
class _SessionTile extends StatelessWidget {
  const _SessionTile({required this.session});

  final UsageSession session;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _getSubjectColor(session.subject).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              _getSubjectIcon(session.subject),
              color: _getSubjectColor(session.subject),
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  session.lessonTitle ?? session.activityType,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  '${_formatTime(session.startTime)} · ${session.durationMinutes}m',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.outline,
                  ),
                ),
              ],
            ),
          ),
          _EngagementBadge(score: session.engagementScore),
        ],
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

  String _formatTime(DateTime time) {
    final hour = time.hour > 12 ? time.hour - 12 : time.hour;
    final period = time.hour >= 12 ? 'PM' : 'AM';
    return '$hour:${time.minute.toString().padLeft(2, '0')} $period';
  }
}

/// Engagement score badge.
class _EngagementBadge extends StatelessWidget {
  const _EngagementBadge({required this.score});

  final double score;

  @override
  Widget build(BuildContext context) {
    final percentage = (score * 100).round();
    final color = score >= 0.8
        ? Colors.green
        : score >= 0.5
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
