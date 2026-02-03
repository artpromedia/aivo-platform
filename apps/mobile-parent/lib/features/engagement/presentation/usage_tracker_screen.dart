/// Usage Tracker Screen
///
/// Screen showing daily and weekly usage statistics.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/engagement_models.dart';
import '../providers/engagement_provider.dart';
import '../widgets/widgets.dart';

/// Screen displaying usage tracking and statistics.
class UsageTrackerScreen extends ConsumerStatefulWidget {
  const UsageTrackerScreen({
    super.key,
    required this.childId,
  });

  final String childId;

  @override
  ConsumerState<UsageTrackerScreen> createState() => _UsageTrackerScreenState();
}

class _UsageTrackerScreenState extends ConsumerState<UsageTrackerScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Usage Tracker'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Today'),
            Tab(text: 'This Week'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _TodayTab(childId: widget.childId),
          _WeeklyTab(childId: widget.childId),
        ],
      ),
    );
  }
}

/// Tab showing today's usage.
class _TodayTab extends ConsumerWidget {
  const _TodayTab({required this.childId});

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final usageAsync = ref.watch(todayUsageProvider(childId));
    final sessionsAsync = ref.watch(recentSessionsProvider(childId));
    final theme = Theme.of(context);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(todayUsageProvider(childId));
        ref.invalidate(recentSessionsProvider(childId));
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Today's stats
          usageAsync.when(
            loading: () => const Card(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
            error: (e, _) => Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Error loading usage: $e'),
              ),
            ),
            data: (usage) => Column(
              children: [
                _TodaySummaryCard(usage: usage),
                const SizedBox(height: 16),
                UsageStatsRow(usage: usage),
                const SizedBox(height: 16),
                if (usage.subjectBreakdown.isNotEmpty)
                  SubjectBreakdownChart(subjectTotals: usage.subjectBreakdown),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Recent sessions
          Text(
            'Today\'s Sessions',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          sessionsAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('Error: $e'),
            data: (sessions) {
              final todaySessions = sessions.where((s) {
                final today = DateTime.now();
                return s.startTime.year == today.year &&
                    s.startTime.month == today.month &&
                    s.startTime.day == today.day;
              }).toList();

              if (todaySessions.isEmpty) {
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(
                            Icons.hourglass_empty,
                            size: 48,
                            color: theme.colorScheme.outline,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'No sessions yet today',
                            style: theme.textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }

              return SessionList(sessions: todaySessions);
            },
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }
}

/// Today's summary card.
class _TodaySummaryCard extends StatelessWidget {
  const _TodaySummaryCard({required this.usage});

  final DailyUsage usage;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final engagementPercent = (usage.averageEngagement * 100).round();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.calendar_today, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  _formatDate(usage.date),
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _BigStat(
                  value: '${usage.totalMinutes}',
                  unit: 'min',
                  label: 'Total Time',
                  color: Colors.blue,
                ),
                _BigStat(
                  value: '$engagementPercent',
                  unit: '%',
                  label: 'Engagement',
                  color: _getEngagementColor(usage.averageEngagement),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${days[date.weekday % 7]}, ${months[date.month - 1]} ${date.day}';
  }

  Color _getEngagementColor(double engagement) {
    if (engagement >= 0.8) return Colors.green;
    if (engagement >= 0.5) return Colors.orange;
    return Colors.red;
  }
}

/// Big stat display.
class _BigStat extends StatelessWidget {
  const _BigStat({
    required this.value,
    required this.unit,
    required this.label,
    required this.color,
  });

  final String value;
  final String unit;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              value,
              style: theme.textTheme.headlineLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                unit,
                style: theme.textTheme.titleMedium?.copyWith(
                  color: color,
                ),
              ),
            ),
          ],
        ),
        Text(
          label,
          style: theme.textTheme.labelMedium?.copyWith(
            color: theme.colorScheme.outline,
          ),
        ),
      ],
    );
  }
}

/// Tab showing weekly usage.
class _WeeklyTab extends ConsumerWidget {
  const _WeeklyTab({required this.childId});

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final weeklyAsync = ref.watch(weeklyUsageProvider(childId));
    final reportAsync = ref.watch(weeklyReportProvider(childId));
    final theme = Theme.of(context);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(weeklyUsageProvider(childId));
        ref.invalidate(weeklyReportProvider(childId));
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Weekly summary card
          weeklyAsync.when(
            loading: () => const Card(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
            error: (e, _) => Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Error: $e'),
              ),
            ),
            data: (summary) => Column(
              children: [
                _WeeklySummaryCard(summary: summary),
                const SizedBox(height: 16),
                WeeklyUsageChart(summary: summary),
                const SizedBox(height: 16),
                if (summary.subjectTotals.isNotEmpty)
                  SubjectBreakdownChart(subjectTotals: summary.subjectTotals),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Weekly insights
          reportAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (report) {
              if (report.insights.isEmpty) return const SizedBox.shrink();

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Weekly Insights',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: report.insights
                            .map((insight) => Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 4),
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
                                        child: Text(
                                          insight,
                                          style: theme.textTheme.bodySmall,
                                        ),
                                      ),
                                    ],
                                  ),
                                ))
                            .toList(),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }
}

/// Weekly summary card.
class _WeeklySummaryCard extends StatelessWidget {
  const _WeeklySummaryCard({required this.summary});

  final UsageSummary summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final trendColor = summary.engagementTrend >= 0 ? Colors.green : Colors.red;
    final trendIcon = summary.engagementTrend >= 0
        ? Icons.trending_up
        : Icons.trending_down;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Text(
              'This Week',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              '${_formatDate(summary.startDate)} - ${_formatDate(summary.endDate)}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _WeeklyStat(
                  icon: Icons.timer,
                  value: '${summary.totalMinutes}',
                  label: 'Total Minutes',
                  color: Colors.blue,
                ),
                _WeeklyStat(
                  icon: Icons.school,
                  value: '${summary.totalLessons}',
                  label: 'Lessons',
                  color: Colors.green,
                ),
                _WeeklyStat(
                  icon: Icons.calendar_today,
                  value: '${summary.averageDailyMinutes}',
                  label: 'Avg/Day',
                  color: Colors.purple,
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: trendColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(trendIcon, color: trendColor, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    '${summary.engagementTrend >= 0 ? '+' : ''}${(summary.engagementTrend * 100).round()}% vs last week',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: trendColor,
                      fontWeight: FontWeight.w500,
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

  String _formatDate(DateTime date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[date.month - 1]} ${date.day}';
  }
}

/// Weekly stat widget.
class _WeeklyStat extends StatelessWidget {
  const _WeeklyStat({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String value;
  final String label;
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
