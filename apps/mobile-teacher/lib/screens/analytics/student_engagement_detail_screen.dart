/// Student Engagement Detail Screen
///
/// Detailed view of an individual student's engagement profile.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../models/analytics.dart';
import '../../models/iep_goal.dart';
import '../../providers/analytics_provider.dart';
import 'widgets/widgets.dart';

/// Screen showing detailed engagement data for a single student.
class StudentEngagementDetailScreen extends ConsumerStatefulWidget {
  const StudentEngagementDetailScreen({
    super.key,
    required this.studentId,
  });

  final String studentId;

  @override
  ConsumerState<StudentEngagementDetailScreen> createState() =>
      _StudentEngagementDetailScreenState();
}

class _StudentEngagementDetailScreenState
    extends ConsumerState<StudentEngagementDetailScreen> {
  DateRange get _defaultPeriod {
    final now = DateTime.now();
    return DateRange(
      start: now.subtract(const Duration(days: 30)),
      end: now,
    );
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  void _loadData() {
    ref
        .read(studentEngagementProvider.notifier)
        .loadEngagement(widget.studentId, _defaultPeriod);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = ref.watch(studentEngagementProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(state.engagement?.studentName ?? 'Student Engagement'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: state.isLoading ? null : _loadData,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: state.isLoading && state.engagement == null
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && state.engagement == null
              ? _buildErrorState(state.error!)
              : _buildContent(state, theme),
    );
  }

  Widget _buildErrorState(String error) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: AivoBrand.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to load engagement data',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              error,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(StudentEngagementState state, ThemeData theme) {
    final engagement = state.engagement!;

    return RefreshIndicator(
      onRefresh: () async => _loadData(),
      child: CustomScrollView(
        slivers: [
          // Engagement overview
          SliverToBoxAdapter(
            child: _buildOverviewSection(engagement, theme),
          ),

          // Metrics breakdown
          SliverToBoxAdapter(
            child: _buildMetricsSection(engagement, theme),
          ),

          // Engagement patterns
          if (state.patterns != null)
            SliverToBoxAdapter(
              child: _buildPatternsSection(state.patterns!, theme),
            ),

          // Session history
          if (state.sessionHistory.isNotEmpty)
            SliverToBoxAdapter(
              child: _buildSessionHistorySection(state.sessionHistory, theme),
            ),

          // Recommendations
          if (state.recommendations.isNotEmpty)
            SliverToBoxAdapter(
              child: _buildRecommendationsSection(state.recommendations, theme),
            ),

          // Risk factors
          if (engagement.riskFactors.isNotEmpty)
            SliverToBoxAdapter(
              child: _buildRiskFactorsSection(engagement.riskFactors, theme),
            ),

          const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
        ],
      ),
    );
  }

  Widget _buildOverviewSection(StudentEngagement engagement, ThemeData theme) {
    final levelColor = _getLevelColor(engagement.engagementLevel);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Row(
                children: [
                  // Student avatar
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: theme.colorScheme.primaryContainer,
                    child: Text(
                      engagement.studentName.isNotEmpty
                          ? engagement.studentName[0].toUpperCase()
                          : '?',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          engagement.studentName,
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: levelColor.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(
                                  color: levelColor.withValues(alpha: 0.3),
                                ),
                              ),
                              child: Text(
                                engagement.engagementLevel.label,
                                style: TextStyle(
                                  color: levelColor,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            if (engagement.isAtRisk) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AivoBrand.warning.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.warning_amber,
                                      size: 14,
                                      color: AivoBrand.warning,
                                    ),
                                    SizedBox(width: 4),
                                    Text(
                                      'At Risk',
                                      style: TextStyle(
                                        color: AivoBrand.warning,
                                        fontWeight: FontWeight.w600,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              // Engagement gauge
              EngagementGauge(
                value: engagement.engagementScore ?? engagement.metrics.overallScore,
                level: engagement.engagementLevel,
                size: 140,
              ),
              const SizedBox(height: 16),
              // Trend indicator
              _buildTrendRow(engagement.trend, theme),
              if (engagement.lastActive != null) ...[
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.access_time,
                      size: 14,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Last active ${_formatRelativeTime(engagement.lastActive!)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTrendRow(EngagementTrend trend, ThemeData theme) {
    final isPositive = trend.isPositive;
    final color = isPositive
        ? AivoBrand.success
        : trend.isConcerning
            ? AivoBrand.error
            : theme.colorScheme.onSurfaceVariant;
    final icon = trend.direction == TrendDirection.increasing
        ? Icons.trending_up
        : trend.direction == TrendDirection.decreasing
            ? Icons.trending_down
            : Icons.trending_flat;

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(width: 4),
        Text(
          '${trend.percentChange >= 0 ? '+' : ''}${trend.percentChange.toStringAsFixed(1)}%',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: color,
            fontWeight: FontWeight.w600,
          ),
        ),
        Text(
          ' from previous period',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildMetricsSection(StudentEngagement engagement, ThemeData theme) {
    final metrics = engagement.metrics;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Engagement Metrics',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  icon: Icons.schedule,
                  label: 'Avg Session',
                  value: '${metrics.avgSessionDuration.round()} min',
                  description: 'Duration per session',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MetricCard(
                  icon: Icons.timer,
                  label: 'Time on Task',
                  value: '${metrics.avgTimeOnTask.round()} min',
                  description: 'Focus per task',
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  icon: Icons.touch_app,
                  label: 'Interactions',
                  value: '${(metrics.interactionRate * 100).round()}%',
                  description: 'Interaction rate',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MetricCard(
                  icon: Icons.check_circle_outline,
                  label: 'Completion',
                  value: '${(metrics.completionRate * 100).round()}%',
                  description: 'Tasks completed',
                  valueColor: _getCompletionColor(metrics.completionRate),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  icon: Icons.play_circle_outline,
                  label: 'Sessions',
                  value: '${metrics.totalSessions}',
                  description: 'Total sessions',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MetricCard(
                  icon: Icons.mouse,
                  label: 'Total Interactions',
                  value: '${metrics.totalInteractions}',
                  description: 'All interactions',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPatternsSection(EngagementPatterns patterns, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Engagement Patterns',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 16),
              // Peak hours
              ListTile(
                leading: const Icon(Icons.schedule),
                title: const Text('Peak Hours'),
                subtitle: Text(patterns.peakHoursFormatted),
                contentPadding: EdgeInsets.zero,
              ),
              // Preferred days
              ListTile(
                leading: const Icon(Icons.calendar_today),
                title: const Text('Preferred Days'),
                subtitle: Text(patterns.preferredDaysFormatted),
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 8),
              // Hourly pattern visualization
              Text(
                'Activity by Hour',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 50,
                child: _buildHourlyChart(patterns.hourlyPattern, theme),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHourlyChart(Map<int, double> hourlyPattern, ThemeData theme) {
    return Row(
      children: List.generate(24, (hour) {
        final value = hourlyPattern[hour] ?? 0.0;
        return Expanded(
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 1),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: value),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildSessionHistorySection(
    List<SessionHistoryEntry> sessions,
    ThemeData theme,
  ) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Recent Sessions',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              TextButton(
                onPressed: () {
                  // TODO: Navigate to full session history
                },
                child: const Text('View All'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Card(
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: sessions.take(5).length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final session = sessions[index];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor:
                        _getEngagementColor(session.engagementScore)
                            .withValues(alpha: 0.2),
                    child: Text(
                      '${(session.engagementScore * 100).round()}',
                      style: TextStyle(
                        color: _getEngagementColor(session.engagementScore),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  title: Text(_formatDate(session.startTime)),
                  subtitle: Text(
                    '${session.durationMinutes} min • ${session.tasksCompleted} tasks',
                  ),
                  trailing: Text(
                    _formatTime(session.startTime),
                    style: theme.textTheme.bodySmall,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecommendationsSection(
    List<EngagementRecommendation> recommendations,
    ThemeData theme,
  ) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.lightbulb_outline, color: Colors.amber, size: 20),
              const SizedBox(width: 8),
              Text(
                'Recommendations',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...recommendations.map((rec) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: _getPriorityColor(rec.priority).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _getCategoryIcon(rec.category),
                      color: _getPriorityColor(rec.priority),
                      size: 20,
                    ),
                  ),
                  title: Text(rec.title),
                  subtitle: Text(
                    rec.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: _buildPriorityBadge(rec.priority, theme),
                  onTap: rec.relatedInterventionId != null
                      ? () => context.push('/interventions/${rec.relatedInterventionId}')
                      : null,
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildPriorityBadge(RecommendationPriority priority, ThemeData theme) {
    final color = _getPriorityColor(priority);
    final label = priority.name.toUpperCase();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildRiskFactorsSection(List<String> riskFactors, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.warning_amber, color: AivoBrand.warning, size: 20),
              const SizedBox(width: 8),
              Text(
                'Risk Factors',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: riskFactors.map((factor) {
              return Chip(
                label: Text(factor),
                backgroundColor: AivoBrand.warning.withValues(alpha: 0.1),
                side: BorderSide(color: AivoBrand.warning.withValues(alpha: 0.3)),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Color _getLevelColor(EngagementLevel level) {
    switch (level) {
      case EngagementLevel.low:
        return AivoBrand.error;
      case EngagementLevel.medium:
        return AivoBrand.warning;
      case EngagementLevel.high:
        return AivoBrand.success;
      case EngagementLevel.exceptional:
        return Colors.blue;
    }
  }

  Color _getCompletionColor(double rate) {
    if (rate >= 0.8) return AivoBrand.success;
    if (rate >= 0.5) return AivoBrand.warning;
    return AivoBrand.error;
  }

  Color _getEngagementColor(double score) {
    if (score >= 0.75) return Colors.blue;
    if (score >= 0.5) return AivoBrand.success;
    if (score >= 0.25) return AivoBrand.warning;
    return AivoBrand.error;
  }

  Color _getPriorityColor(RecommendationPriority priority) {
    switch (priority) {
      case RecommendationPriority.low:
        return Colors.blue;
      case RecommendationPriority.medium:
        return AivoBrand.warning;
      case RecommendationPriority.high:
        return Colors.orange;
      case RecommendationPriority.critical:
        return AivoBrand.error;
    }
  }

  IconData _getCategoryIcon(RecommendationCategory category) {
    switch (category) {
      case RecommendationCategory.engagement:
        return Icons.trending_up;
      case RecommendationCategory.timeManagement:
        return Icons.schedule;
      case RecommendationCategory.contentDifficulty:
        return Icons.tune;
      case RecommendationCategory.socialSupport:
        return Icons.people;
      case RecommendationCategory.accessibility:
        return Icons.accessibility;
      case RecommendationCategory.motivation:
        return Icons.emoji_events;
    }
  }

  String _formatRelativeTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return 'just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else {
      return '${difference.inDays}d ago';
    }
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }

  String _formatTime(DateTime date) {
    final hour = date.hour > 12 ? date.hour - 12 : date.hour;
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '$hour:${date.minute.toString().padLeft(2, '0')} $period';
  }
}

/// Metric card widget with description.
class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.description,
    this.valueColor,
  });

  final IconData icon;
  final String label;
  final String value;
  final String description;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 16, color: theme.colorScheme.onSurfaceVariant),
                const SizedBox(width: 4),
                Text(
                  label,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: valueColor,
              ),
            ),
            Text(
              description,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
