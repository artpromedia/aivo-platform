/// Streak Calendar Widget
///
/// Visual calendar showing daily learning streaks.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/engagement_models.dart';
import '../providers/engagement_provider.dart';

/// Calendar widget displaying learning streaks.
class StreakCalendar extends ConsumerWidget {
  const StreakCalendar({
    super.key,
    required this.childId,
  });

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedMonth = ref.watch(selectedCalendarMonthProvider);
    final streakAsync = ref.watch(currentMonthStreakProvider(childId));
    final theme = Theme.of(context);

    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with month navigation
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () => _changeMonth(ref, -1),
                ),
                Text(
                  _formatMonth(selectedMonth),
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: _canGoForward(selectedMonth)
                      ? () => _changeMonth(ref, 1)
                      : null,
                ),
              ],
            ),
          ),

          // Weekday headers
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              children: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
                  .map((day) => Expanded(
                        child: Center(
                          child: Text(
                            day,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: theme.colorScheme.outline,
                            ),
                          ),
                        ),
                      ))
                  .toList(),
            ),
          ),
          const SizedBox(height: 8),

          // Calendar grid
          streakAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(32),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (e, _) => Padding(
              padding: const EdgeInsets.all(16),
              child: Text('Error loading streak data: $e'),
            ),
            data: (streakDays) => _CalendarGrid(
              month: selectedMonth,
              streakDays: streakDays,
              onDayTap: (date) => _onDayTap(context, ref, date, streakDays),
            ),
          ),
          const SizedBox(height: 8),

          // Legend
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _LegendItem(
                  color: Colors.green,
                  label: 'Active',
                ),
                const SizedBox(width: 16),
                _LegendItem(
                  color: Colors.green.withValues(alpha: 0.3),
                  label: 'Partial',
                ),
                const SizedBox(width: 16),
                _LegendItem(
                  color: theme.colorScheme.surfaceContainerHighest,
                  label: 'Inactive',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _changeMonth(WidgetRef ref, int delta) {
    final current = ref.read(selectedCalendarMonthProvider);
    ref.read(selectedCalendarMonthProvider.notifier).state = DateTime(
      current.year,
      current.month + delta,
      1,
    );
  }

  bool _canGoForward(DateTime month) {
    final now = DateTime.now();
    return month.year < now.year ||
        (month.year == now.year && month.month < now.month);
  }

  String _formatMonth(DateTime date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${months[date.month - 1]} ${date.year}';
  }

  void _onDayTap(
    BuildContext context,
    WidgetRef ref,
    DateTime date,
    List<StreakDay> streakDays,
  ) {
    final dayData = streakDays.firstWhere(
      (d) => _isSameDay(d.date, date),
      orElse: () => StreakDay(
        date: date,
        isActive: false,
        minutesLearned: 0,
        lessonsCompleted: 0,
        pointsEarned: 0,
      ),
    );

    showModalBottomSheet(
      context: context,
      builder: (context) => _DayDetailsSheet(day: dayData),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}

/// Calendar grid displaying days.
class _CalendarGrid extends StatelessWidget {
  const _CalendarGrid({
    required this.month,
    required this.streakDays,
    required this.onDayTap,
  });

  final DateTime month;
  final List<StreakDay> streakDays;
  final ValueChanged<DateTime> onDayTap;

  @override
  Widget build(BuildContext context) {
    final firstDayOfMonth = DateTime(month.year, month.month, 1);
    final lastDayOfMonth = DateTime(month.year, month.month + 1, 0);
    final daysInMonth = lastDayOfMonth.day;
    final startingWeekday = firstDayOfMonth.weekday % 7;

    final weeks = <List<int?>>[];
    var currentWeek = List<int?>.filled(7, null);
    var dayCounter = 1;

    // Fill first week with leading nulls
    for (var i = startingWeekday; i < 7 && dayCounter <= daysInMonth; i++) {
      currentWeek[i] = dayCounter++;
    }
    weeks.add(currentWeek);

    // Fill remaining weeks
    while (dayCounter <= daysInMonth) {
      currentWeek = List<int?>.filled(7, null);
      for (var i = 0; i < 7 && dayCounter <= daysInMonth; i++) {
        currentWeek[i] = dayCounter++;
      }
      weeks.add(currentWeek);
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Column(
        children: weeks.map((week) {
          return Row(
            children: week.map((day) {
              if (day == null) {
                return const Expanded(child: SizedBox(height: 40));
              }

              final date = DateTime(month.year, month.month, day);
              final streakDay = _getStreakDay(date);

              return Expanded(
                child: _CalendarDay(
                  day: day,
                  streakDay: streakDay,
                  isToday: _isToday(date),
                  isFuture: date.isAfter(DateTime.now()),
                  onTap: () => onDayTap(date),
                ),
              );
            }).toList(),
          );
        }).toList(),
      ),
    );
  }

  StreakDay? _getStreakDay(DateTime date) {
    try {
      return streakDays.firstWhere(
        (d) => d.date.year == date.year &&
            d.date.month == date.month &&
            d.date.day == date.day,
      );
    } catch (_) {
      return null;
    }
  }

  bool _isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }
}

/// Individual calendar day cell.
class _CalendarDay extends StatelessWidget {
  const _CalendarDay({
    required this.day,
    required this.streakDay,
    required this.isToday,
    required this.isFuture,
    required this.onTap,
  });

  final int day;
  final StreakDay? streakDay;
  final bool isToday;
  final bool isFuture;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isActive = streakDay?.isActive ?? false;
    final minutes = streakDay?.minutesLearned ?? 0;

    Color backgroundColor;
    if (isFuture) {
      backgroundColor = Colors.transparent;
    } else if (isActive && minutes >= 30) {
      backgroundColor = Colors.green;
    } else if (isActive || minutes > 0) {
      backgroundColor = Colors.green.withValues(alpha: 0.3 + (minutes / 60) * 0.4);
    } else {
      backgroundColor = theme.colorScheme.surfaceContainerHighest;
    }

    return Padding(
      padding: const EdgeInsets.all(2),
      child: InkWell(
        onTap: isFuture ? null : onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          height: 36,
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(8),
            border: isToday
                ? Border.all(color: theme.colorScheme.primary, width: 2)
                : null,
          ),
          child: Center(
            child: Text(
              '$day',
              style: theme.textTheme.bodySmall?.copyWith(
                color: (isActive && minutes >= 30)
                    ? Colors.white
                    : isFuture
                        ? theme.colorScheme.outline
                        : theme.colorScheme.onSurface,
                fontWeight: isToday ? FontWeight.bold : null,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Legend item widget.
class _LegendItem extends StatelessWidget {
  const _LegendItem({
    required this.color,
    required this.label,
  });

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: theme.textTheme.labelSmall,
        ),
      ],
    );
  }
}

/// Bottom sheet showing day details.
class _DayDetailsSheet extends StatelessWidget {
  const _DayDetailsSheet({required this.day});

  final StreakDay day;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: day.isActive ? Colors.green : Colors.grey,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  day.isActive ? Icons.check : Icons.remove,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _formatDate(day.date),
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      day.isActive ? 'Active Learning Day' : 'No Activity',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: day.isActive ? Colors.green : Colors.grey,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),
          _StatRow(
            icon: Icons.timer,
            label: 'Time Learned',
            value: '${day.minutesLearned} minutes',
          ),
          const SizedBox(height: 12),
          _StatRow(
            icon: Icons.school,
            label: 'Lessons Completed',
            value: '${day.lessonsCompleted}',
          ),
          const SizedBox(height: 12),
          _StatRow(
            icon: Icons.stars,
            label: 'Points Earned',
            value: '${day.pointsEarned}',
          ),
          if (day.highlight != null) ...[
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.emoji_events, color: Colors.amber),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      day.highlight!,
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${days[date.weekday % 7]}, ${months[date.month - 1]} ${date.day}';
  }
}

/// Row displaying a stat.
class _StatRow extends StatelessWidget {
  const _StatRow({
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

    return Row(
      children: [
        Icon(icon, size: 20, color: theme.colorScheme.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Text(label, style: theme.textTheme.bodyMedium),
        ),
        Text(
          value,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
