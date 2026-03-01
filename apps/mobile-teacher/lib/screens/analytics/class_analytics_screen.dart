/// Class Analytics Overview Screen
///
/// Shows analytics overview for a specific class with period filtering,
/// performance metrics, and student rankings.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../models/analytics.dart';
import '../../providers/analytics_provider.dart';
import 'widgets/widgets.dart';

/// Class analytics overview screen.
class ClassAnalyticsScreen extends ConsumerStatefulWidget {
  const ClassAnalyticsScreen({
    super.key,
    required this.classId,
    this.className,
  });

  final String classId;
  final String? className;

  @override
  ConsumerState<ClassAnalyticsScreen> createState() =>
      _ClassAnalyticsScreenState();
}

class _ClassAnalyticsScreenState extends ConsumerState<ClassAnalyticsScreen> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final selectedPeriod = ref.watch(selectedAnalyticsPeriodProvider);
    final dashboardAsync = ref.watch(analyticsDashboardProvider(widget.classId));

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.className ?? 'Class Analytics'),
        actions: [
          IconButton(
            icon: const Icon(Icons.grid_view),
            tooltip: 'Skill Matrix',
            onPressed: () => context.push(
              '/analytics/${widget.classId}/skills?name=${Uri.encodeComponent(widget.className ?? "Class")}',
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(analyticsDashboardProvider(widget.classId)),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          // Period selector
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: PeriodSelector(
              selectedPeriod: selectedPeriod,
              onPeriodChanged: (period) {
                ref.read(selectedAnalyticsPeriodProvider.notifier).state = period;
              },
              style: PeriodSelectorStyle.chips,
            ),
          ),

          // Main content
          Expanded(
            child: dashboardAsync.when(
              data: (dashboard) => _buildContent(context, theme, dashboard),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => _buildError(context, error),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    ThemeData theme,
    AnalyticsDashboardState dashboard,
  ) {
    final analytics = dashboard.classAnalytics;

    if (analytics == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.analytics_outlined, size: 64, color: theme.disabledColor),
            const SizedBox(height: 16),
            Text(
              'No analytics data available',
              style: theme.textTheme.titleMedium?.copyWith(
                color: theme.disabledColor,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Data will appear once students start activities.',
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(analyticsDashboardProvider(widget.classId));
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Metrics row
          _buildMetricsRow(theme, analytics),
          const SizedBox(height: 24),

          // Performance trend section
          Text(
            'Performance Trend',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          _buildTrendCard(theme, analytics),
          const SizedBox(height: 24),

          // Top performers
          _buildStudentSection(
            context,
            theme,
            title: 'Top Performers',
            icon: Icons.emoji_events,
            iconColor: Colors.amber,
            students: dashboard.topStudents,
            emptyMessage: 'No student data available',
          ),
          const SizedBox(height: 20),

          // Needs attention
          _buildStudentSection(
            context,
            theme,
            title: 'Needs Attention',
            icon: Icons.warning_amber_rounded,
            iconColor: AivoBrand.error,
            students: dashboard.strugglingStudents,
            emptyMessage: 'No students need attention',
            isAlert: true,
          ),
          const SizedBox(height: 20),

          // Insights
          if (dashboard.insights.isNotEmpty) ...[
            Text(
              'Insights',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ...dashboard.insights.map(
              (insight) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InsightCard(insight: insight),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMetricsRow(ThemeData theme, ClassAnalytics analytics) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cardWidth = (constraints.maxWidth - 12) / 2;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            SizedBox(
              width: cardWidth,
              child: MetricCard(
                title: 'Active Students',
                value: '${analytics.activeStudents}/${analytics.totalStudents}',
                icon: Icons.people,
                color: AivoBrand.primary,
                compact: true,
              ),
            ),
            SizedBox(
              width: cardWidth,
              child: MetricCard(
                title: 'Avg Performance',
                value: '${analytics.overallPerformance.toStringAsFixed(0)}%',
                icon: Icons.trending_up,
                color: _performanceColor(analytics.overallPerformance),
                compact: true,
              ),
            ),
            SizedBox(
              width: cardWidth,
              child: MetricCard(
                title: 'Avg Grade',
                value: analytics.averageGrade.toStringAsFixed(1),
                icon: Icons.grade,
                color: Colors.amber,
                compact: true,
              ),
            ),
            SizedBox(
              width: cardWidth,
              child: MetricCard(
                title: 'Completion Rate',
                value:
                    '${(analytics.completionMetrics.assignmentCompletionRate ?? 0).toStringAsFixed(0)}%',
                icon: Icons.check_circle,
                color: AivoBrand.success,
                compact: true,
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildTrendCard(ThemeData theme, ClassAnalytics analytics) {
    final trendIcon = switch (analytics.trendDirection) {
      TrendDirection.improving => Icons.trending_up,
      TrendDirection.declining => Icons.trending_down,
      TrendDirection.stable => Icons.trending_flat,
    };
    final trendColor = switch (analytics.trendDirection) {
      TrendDirection.improving => AivoBrand.success,
      TrendDirection.declining => AivoBrand.error,
      TrendDirection.stable => Colors.grey,
    };
    final trendLabel = switch (analytics.trendDirection) {
      TrendDirection.improving => 'Improving',
      TrendDirection.declining => 'Declining',
      TrendDirection.stable => 'Stable',
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: trendColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(trendIcon, color: trendColor, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    trendLabel,
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: trendColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Overall class performance is $trendLabel over the selected period.',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStudentSection(
    BuildContext context,
    ThemeData theme, {
    required String title,
    required IconData icon,
    required Color iconColor,
    required List<StudentAnalyticsProfile> students,
    required String emptyMessage,
    bool isAlert = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, color: iconColor, size: 20),
            const SizedBox(width: 8),
            Text(
              title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            if (students.isNotEmpty) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${students.length}',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: iconColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 12),
        if (students.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text(
                  emptyMessage,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.disabledColor,
                  ),
                ),
              ),
            ),
          )
        else
          ...students.take(5).map((student) => _buildStudentTile(
                context,
                theme,
                student,
                isAlert: isAlert,
              )),
      ],
    );
  }

  Widget _buildStudentTile(
    BuildContext context,
    ThemeData theme,
    StudentAnalyticsProfile student, {
    bool isAlert = false,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isAlert
              ? AivoBrand.error.withOpacity(0.1)
              : AivoBrand.primary.withOpacity(0.1),
          child: Text(
            student.studentName.isNotEmpty
                ? student.studentName[0].toUpperCase()
                : '?',
            style: TextStyle(
              color: isAlert ? AivoBrand.error : AivoBrand.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(student.studentName),
        subtitle: Text(
          'Grade: ${student.letterGrade} • Completion: ${(student.completionMetrics.assignmentCompletionRate ?? 0).toStringAsFixed(0)}%',
          style: theme.textTheme.bodySmall,
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: _performanceColor(student.overallGrade).withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            '${student.overallGrade.toStringAsFixed(0)}%',
            style: theme.textTheme.labelMedium?.copyWith(
              color: _performanceColor(student.overallGrade),
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        onTap: () => context.push(
          '/learner/${student.studentId}?name=${Uri.encodeComponent(student.studentName)}',
        ),
      ),
    );
  }

  Widget _buildError(BuildContext context, Object error) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AivoBrand.error),
          const SizedBox(height: 16),
          Text(
            'Failed to load analytics',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            error.toString(),
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () =>
                ref.invalidate(analyticsDashboardProvider(widget.classId)),
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Color _performanceColor(double value) {
    if (value >= 80) return AivoBrand.success;
    if (value >= 60) return Colors.amber;
    return AivoBrand.error;
  }
}
