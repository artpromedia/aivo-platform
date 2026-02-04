/// Engagement Analytics Screen
///
/// Dashboard for viewing and analyzing student engagement metrics.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../models/analytics.dart';
import '../../models/iep_goal.dart';
import '../../providers/analytics_provider.dart';
import 'widgets/widgets.dart';

/// Main engagement analytics screen.
class EngagementScreen extends ConsumerStatefulWidget {
  const EngagementScreen({
    super.key,
    required this.classId,
  });

  final String classId;

  @override
  ConsumerState<EngagementScreen> createState() => _EngagementScreenState();
}

class _EngagementScreenState extends ConsumerState<EngagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  TimelineGranularity _timelineGranularity = TimelineGranularity.daily;

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
    _tabController = TabController(length: 4, vsync: this);

    // Load initial data
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _loadData() {
    final period = _defaultPeriod;
    ref.read(classEngagementProvider.notifier).loadEngagement(widget.classId, period);
    ref.read(engagementAlertsProvider.notifier).loadAlerts(widget.classId);
    ref.read(engagementTimelineProvider.notifier).loadTimeline(
      widget.classId,
      _timelineGranularity,
      period: period,
    );
  }

  @override
  Widget build(BuildContext context) {
    final engagementState = ref.watch(classEngagementProvider);
    final alertsState = ref.watch(engagementAlertsProvider);
    final timelineState = ref.watch(engagementTimelineProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Engagement Analytics'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Students'),
            Tab(text: 'Timeline'),
            Tab(text: 'Content'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: engagementState.isLoading ? null : _loadData,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: engagementState.isLoading && engagementState.engagement == null
          ? const Center(child: CircularProgressIndicator())
          : engagementState.error != null && engagementState.engagement == null
              ? _buildErrorState(engagementState.error!)
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOverviewTab(engagementState, alertsState, timelineState),
                    _buildStudentsTab(engagementState),
                    _buildTimelineTab(timelineState),
                    _buildContentTab(),
                  ],
                ),
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
            Icon(
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

  Widget _buildOverviewTab(
    ClassEngagementState engagementState,
    EngagementAlertsState alertsState,
    EngagementTimelineState timelineState,
  ) {
    final theme = Theme.of(context);
    final engagement = engagementState.engagement;

    if (engagement == null) {
      return const Center(child: Text('No engagement data available'));
    }

    return RefreshIndicator(
      onRefresh: () async => _loadData(),
      child: CustomScrollView(
        slivers: [
          // Alerts banner
          if (alertsState.unresolvedAlerts.isNotEmpty)
            SliverToBoxAdapter(
              child: EngagementAlertsBanner(
                alertCount: alertsState.unresolvedAlerts.length,
                criticalCount: alertsState.criticalAlerts.length,
                onTap: () => _showAlertsSheet(alertsState.alerts),
              ),
            ),

          // Class overview metrics
          SliverToBoxAdapter(
            child: _buildClassOverview(engagement, theme),
          ),

          // Distribution chart
          SliverToBoxAdapter(
            child: _buildDistributionSection(engagement, theme),
          ),

          // Timeline preview
          if (timelineState.timeline.isNotEmpty)
            SliverToBoxAdapter(
              child: _buildTimelinePreview(timelineState, theme),
            ),

          // At-risk students section
          if (engagement.atRiskStudents.isNotEmpty)
            SliverToBoxAdapter(
              child: _buildAtRiskSection(engagement, theme),
            ),

          // Top engaged students
          if (engagement.topEngaged.isNotEmpty)
            SliverToBoxAdapter(
              child: _buildTopEngagedSection(engagement, theme),
            ),

          const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
        ],
      ),
    );
  }

  Widget _buildClassOverview(ClassEngagement engagement, ThemeData theme) {
    final metrics = engagement.averageMetrics;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Class Overview',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              // Engagement gauge
              Expanded(
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        EngagementGauge(
                          value: metrics.overallScore,
                          size: 100,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Class Engagement',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              // Metrics cards
              Expanded(
                child: Column(
                  children: [
                    _MetricCard(
                      icon: Icons.schedule,
                      label: 'Avg Session',
                      value: '${metrics.avgSessionDuration.round()} min',
                    ),
                    const SizedBox(height: 8),
                    _MetricCard(
                      icon: Icons.timer,
                      label: 'Time on Task',
                      value: '${metrics.avgTimeOnTask.round()} min',
                    ),
                    const SizedBox(height: 8),
                    _MetricCard(
                      icon: Icons.check_circle_outline,
                      label: 'Completion',
                      value: '${(metrics.completionRate * 100).round()}%',
                      color: _getCompletionColor(metrics.completionRate),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (engagement.trend != null) ...[
            const SizedBox(height: 16),
            _buildTrendIndicator(engagement.trend!, theme),
          ],
        ],
      ),
    );
  }

  Widget _buildTrendIndicator(EngagementTrend trend, ThemeData theme) {
    final isPositive = trend.isPositive;
    final color = isPositive ? AivoBrand.success :
        trend.isConcerning ? AivoBrand.error : theme.colorScheme.onSurfaceVariant;
    final icon = trend.direction == TrendDirection.increasing
        ? Icons.trending_up
        : trend.direction == TrendDirection.decreasing
            ? Icons.trending_down
            : Icons.trending_flat;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 8),
          Text(
            '${trend.percentChange >= 0 ? '+' : ''}${trend.percentChange.toStringAsFixed(1)}% from previous period',
            style: theme.textTheme.bodyMedium?.copyWith(color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildDistributionSection(ClassEngagement engagement, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Engagement Distribution',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: EngagementDistributionChart(
                  distribution: engagement.distribution,
                  size: 180,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTimelinePreview(
    EngagementTimelineState timelineState,
    ThemeData theme,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Engagement Trend',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  TextButton(
                    onPressed: () => _tabController.animateTo(2),
                    child: const Text('View Details'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                height: 150,
                child: EngagementTimelineChart(
                  timeline: timelineState.timeline,
                  height: 150,
                  showLabels: true,
                  granularity: timelineState.granularity,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAtRiskSection(ClassEngagement engagement, ThemeData theme) {
    final atRiskStudents = engagement.atRiskStudents.take(3).toList();

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.warning_amber, color: AivoBrand.warning, size: 20),
              const SizedBox(width: 8),
              Text(
                'Students at Risk',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () => _tabController.animateTo(1),
                child: Text('See All (${engagement.atRiskStudents.length})'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...atRiskStudents.map((student) => StudentEngagementTile(
            student: student,
            compact: true,
            onTap: () => _navigateToStudentDetail(student),
          )),
        ],
      ),
    );
  }

  Widget _buildTopEngagedSection(ClassEngagement engagement, ThemeData theme) {
    final topStudents = engagement.topEngaged.take(3).toList();

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.star, color: Colors.amber, size: 20),
              const SizedBox(width: 8),
              Text(
                'Top Engaged',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...topStudents.map((student) => StudentEngagementTile(
            student: student,
            compact: true,
            onTap: () => _navigateToStudentDetail(student),
          )),
        ],
      ),
    );
  }

  Widget _buildStudentsTab(ClassEngagementState engagementState) {
    final engagement = engagementState.engagement;
    if (engagement == null) {
      return const Center(child: Text('No student data available'));
    }

    // Sort students by engagement level (at-risk first)
    final sortedStudents = List<StudentEngagement>.from(engagement.students)
      ..sort((a, b) {
        final aRisk = a.isAtRisk ? 0 : 1;
        final bRisk = b.isAtRisk ? 0 : 1;
        if (aRisk != bRisk) return aRisk.compareTo(bRisk);
        return (b.engagementScore ?? 0).compareTo(a.engagementScore ?? 0);
      });

    return RefreshIndicator(
      onRefresh: () async => _loadData(),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: sortedStudents.length,
        itemBuilder: (context, index) {
          final student = sortedStudents[index];
          return StudentEngagementTile(
            student: student,
            compact: false,
            onTap: () => _navigateToStudentDetail(student),
          );
        },
      ),
    );
  }

  Widget _buildTimelineTab(EngagementTimelineState timelineState) {
    final theme = Theme.of(context);

    return RefreshIndicator(
      onRefresh: () async => ref
          .read(engagementTimelineProvider.notifier)
          .loadTimeline(widget.classId, _timelineGranularity),
      child: CustomScrollView(
        slivers: [
          // Granularity selector
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'View by',
                    style: theme.textTheme.titleSmall,
                  ),
                  const SizedBox(height: 8),
                  SegmentedButton<TimelineGranularity>(
                    segments: const [
                      ButtonSegment(
                        value: TimelineGranularity.daily,
                        label: Text('Daily'),
                      ),
                      ButtonSegment(
                        value: TimelineGranularity.weekly,
                        label: Text('Weekly'),
                      ),
                      ButtonSegment(
                        value: TimelineGranularity.monthly,
                        label: Text('Monthly'),
                      ),
                    ],
                    selected: {_timelineGranularity},
                    onSelectionChanged: (selection) {
                      setState(() {
                        _timelineGranularity = selection.first;
                      });
                      ref
                          .read(engagementTimelineProvider.notifier)
                          .changeGranularity(widget.classId, _timelineGranularity);
                    },
                  ),
                ],
              ),
            ),
          ),

          // Timeline chart
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Engagement Over Time',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 16),
                      timelineState.isLoading
                          ? const Center(child: CircularProgressIndicator())
                          : EngagementTimelineChart(
                              timeline: timelineState.timeline,
                              height: 250,
                              granularity: _timelineGranularity,
                            ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Timeline data points
          if (timelineState.timeline.isNotEmpty)
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final point = timelineState.timeline.reversed.toList()[index];
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: _getEngagementColor(point.avgEngagement)
                          .withValues(alpha: 0.2),
                      child: Text(
                        '${(point.avgEngagement * 100).round()}',
                        style: TextStyle(
                          color: _getEngagementColor(point.avgEngagement),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    title: Text(_formatDate(point.timestamp)),
                    subtitle: Text(
                      '${point.activeStudents}/${point.totalStudents} active',
                    ),
                    trailing: Text(
                      '${(point.participationRate * 100).round()}%',
                      style: theme.textTheme.bodyLarge,
                    ),
                  );
                },
                childCount: timelineState.timeline.length,
              ),
            ),

          const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
        ],
      ),
    );
  }

  Widget _buildContentTab() {
    final contentAsync = ref.watch(contentEngagementProvider(widget.classId));
    final theme = Theme.of(context);

    return contentAsync.when(
      data: (content) {
        if (content.isEmpty) {
          return const Center(child: Text('No content engagement data'));
        }

        // Sort by engagement score descending
        final sortedContent = List<ContentEngagement>.from(content)
          ..sort((a, b) => b.avgEngagementScore.compareTo(a.avgEngagementScore));

        return RefreshIndicator(
          onRefresh: () async => ref.refresh(contentEngagementProvider(widget.classId)),
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Content Performance',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    return ContentEngagementTile(
                      content: sortedContent[index],
                    );
                  },
                  childCount: sortedContent.length,
                ),
              ),
              const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
            ],
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Failed to load content data'),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () => ref.refresh(contentEngagementProvider(widget.classId)),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  void _showAlertsSheet(List<EngagementAlert> alerts) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) {
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Text(
                      'Engagement Alerts',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const Divider(),
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  itemCount: alerts.length,
                  itemBuilder: (context, index) {
                    final alert = alerts[index];
                    return DisengagedAlertCard(
                      alert: alert,
                      onTap: () {
                        Navigator.pop(context);
                        context.push('/students/${alert.studentId}/engagement');
                      },
                      onResolve: () {
                        ref.read(engagementAlertsProvider.notifier).resolveAlert(alert.id);
                      },
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _navigateToStudentDetail(StudentEngagement student) {
    context.push('/students/${student.studentId}/engagement');
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

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }
}

/// Small metric card widget.
class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.icon,
    required this.label,
    required this.value,
    this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(icon, size: 18, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                Text(
                  value,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
