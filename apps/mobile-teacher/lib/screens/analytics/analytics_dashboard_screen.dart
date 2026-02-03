/// Analytics Dashboard Screen
///
/// Main analytics dashboard for viewing class and student performance.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/analytics.dart';
import '../../providers/analytics_provider.dart';
import 'widgets/widgets.dart';

/// Main analytics dashboard screen.
class AnalyticsDashboardScreen extends ConsumerStatefulWidget {
  const AnalyticsDashboardScreen({
    super.key,
    required this.classId,
    this.className,
  });

  final String classId;
  final String? className;

  @override
  ConsumerState<AnalyticsDashboardScreen> createState() =>
      _AnalyticsDashboardScreenState();
}

class _AnalyticsDashboardScreenState
    extends ConsumerState<AnalyticsDashboardScreen> {
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final selectedPeriod = ref.watch(selectedAnalyticsPeriodProvider);
    final dashboardAsync = ref.watch(analyticsDashboardProvider(widget.classId));
    final exportState = ref.watch(analyticsExportProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.className ?? 'Analytics'),
        actions: [
          ExportIconButton(
            onExport: () => _showExportDialog(context),
            isLoading: exportState.isExporting,
            tooltip: 'Export Report',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _refreshData(),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refreshData,
        child: CustomScrollView(
          controller: _scrollController,
          slivers: [
            // Period Selector
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: PeriodSelector(
                  selectedPeriod: selectedPeriod,
                  onPeriodChanged: (period) {
                    ref.read(selectedAnalyticsPeriodProvider.notifier).state =
                        period;
                  },
                  style: PeriodSelectorStyle.chips,
                ),
              ),
            ),

            // Export Status
            if (exportState.isExporting ||
                exportState.downloadUrl != null ||
                exportState.error != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: ExportStatusIndicator(
                    isExporting: exportState.isExporting,
                    downloadUrl: exportState.downloadUrl,
                    error: exportState.error,
                    onDownload: () {
                      // Handle download - platform specific
                      _handleDownload(exportState.downloadUrl!);
                    },
                    onDismiss: () {
                      ref.read(analyticsExportProvider.notifier).clearState();
                    },
                  ),
                ),
              ),

            // Dashboard Content
            dashboardAsync.when(
              data: (dashboard) => _buildDashboardContent(
                context,
                theme,
                dashboard,
                selectedPeriod,
              ),
              loading: () => const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, stack) => SliverFillRemaining(
                child: _buildErrorState(context, error.toString()),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDashboardContent(
    BuildContext context,
    ThemeData theme,
    AnalyticsDashboardState dashboard,
    AnalyticsPeriod period,
  ) {
    if (dashboard.error != null) {
      return SliverFillRemaining(
        child: _buildErrorState(context, dashboard.error!),
      );
    }

    final analytics = dashboard.classAnalytics;
    if (analytics == null) {
      return const SliverFillRemaining(
        child: Center(child: Text('No analytics data available')),
      );
    }

    return SliverList(
      delegate: SliverChildListDelegate([
        // Key Metrics Overview
        _buildMetricsSection(context, theme, analytics),

        const Divider(height: 32),

        // Insights Banner (if any high priority)
        if (dashboard.insights.any((i) =>
            i.priority == InsightPriority.high ||
            i.priority == InsightPriority.critical))
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: InsightBanner(
              insight: dashboard.insights.firstWhere(
                (i) =>
                    i.priority == InsightPriority.critical ||
                    i.priority == InsightPriority.high,
              ),
              onTap: () => _showInsightDetails(dashboard.insights.first),
            ),
          ),

        const SizedBox(height: 16),

        // Performance Trend Chart
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: PerformanceLineChart(
                data: analytics.performanceTrend,
                title: 'Performance Trend',
                height: 200,
                yAxisLabel: 'Average Score',
              ),
            ),
          ),
        ),

        const SizedBox(height: 16),

        // Subject Performance
        if (dashboard.subjectPerformance.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: SubjectBarChart(
                  subjects: dashboard.subjectPerformance,
                  title: 'Subject Performance',
                  height: 220,
                  onSubjectTap: (subject) =>
                      _navigateToSubjectDetails(subject),
                ),
              ),
            ),
          ),

        const SizedBox(height: 16),

        // Completion Metrics
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: _buildCompletionSection(
                context,
                theme,
                analytics.completionMetrics,
              ),
            ),
          ),
        ),

        const SizedBox(height: 16),

        // Student Rankings
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(left: 16, right: 8),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: StudentRankingList(
                      students: dashboard.topStudents,
                      title: '⭐ Top Performers',
                      maxVisible: 5,
                      isTopPerformers: true,
                      onStudentTap: _navigateToStudentDetails,
                      onViewAll: () => _showAllStudents(true),
                    ),
                  ),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(left: 8, right: 16),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: StudentRankingList(
                      students: dashboard.strugglingStudents,
                      title: '⚠️ Needs Attention',
                      maxVisible: 5,
                      isTopPerformers: false,
                      onStudentTap: _navigateToStudentDetails,
                      onViewAll: () => _showAllStudents(false),
                      emptyMessage: 'All students on track! 🎉',
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        // Insights Section
        if (dashboard.insights.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: InsightsList(
                  insights: dashboard.insights,
                  title: '💡 Insights & Recommendations',
                  maxVisible: 3,
                  compact: true,
                  onInsightTap: _showInsightDetails,
                  onViewAll: _showAllInsights,
                ),
              ),
            ),
          ),

        // Bottom padding
        const SizedBox(height: 32),
      ]),
    );
  }

  Widget _buildMetricsSection(
    BuildContext context,
    ThemeData theme,
    ClassAnalytics analytics,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Overview',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.5,
            children: [
              MetricCard(
                title: 'Average Grade',
                value: analytics.averageGrade,
                unit: '%',
                trend: analytics.trendDirection,
                icon: Icons.grade,
                color: _getGradeColor(analytics.averageGrade),
              ),
              MetricCard(
                title: 'Overall Performance',
                value: analytics.overallPerformance,
                unit: '%',
                trend: analytics.trendDirection,
                icon: Icons.trending_up,
                color: theme.colorScheme.primary,
              ),
              MetricCard(
                title: 'Active Students',
                value: analytics.activeStudents.toDouble(),
                unit: '/ ${analytics.totalStudents}',
                icon: Icons.people,
                color: theme.colorScheme.secondary,
              ),
              MetricCard(
                title: 'Participation',
                value: analytics.participationRate * 100,
                unit: '%',
                icon: Icons.how_to_reg,
                color: analytics.participationRate >= 0.8
                    ? Colors.green
                    : Colors.orange,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCompletionSection(
    BuildContext context,
    ThemeData theme,
    CompletionMetrics metrics,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Completion Rates',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 16),
        CompletionBar(
          completed: metrics.completedAssignments,
          total: metrics.totalAssignments,
          label: 'Assignments',
          completedColor: theme.colorScheme.primary,
        ),
        const SizedBox(height: 12),
        CompletionBar(
          completed: metrics.completedAssessments,
          total: metrics.totalAssessments,
          label: 'Assessments',
          completedColor: theme.colorScheme.secondary,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildSmallMetric(
                theme,
                'On-Time Rate',
                '${(metrics.onTimeSubmissionRate * 100).toStringAsFixed(0)}%',
                Icons.schedule,
                metrics.onTimeSubmissionRate >= 0.8
                    ? Colors.green
                    : Colors.orange,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildSmallMetric(
                theme,
                'Overdue',
                metrics.overdueCount.toString(),
                Icons.warning_amber,
                metrics.overdueCount > 0 ? Colors.red : Colors.green,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSmallMetric(
    ThemeData theme,
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
                Text(
                  label,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, String error) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: theme.colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to load analytics',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              error,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _refreshData,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Color _getGradeColor(double grade) {
    if (grade >= 90) return Colors.green;
    if (grade >= 80) return Colors.lightGreen;
    if (grade >= 70) return Colors.amber;
    if (grade >= 60) return Colors.orange;
    return Colors.red;
  }

  Future<void> _refreshData() async {
    ref.invalidate(analyticsDashboardProvider(widget.classId));
  }

  void _showExportDialog(BuildContext context) {
    showExportOptionsDialog(
      context,
      onExport: ({
        required AnalyticsExportFormat format,
        required bool includeStudentDetails,
        required bool includeCharts,
      }) {
        final period = ref.read(selectedAnalyticsPeriodProvider);
        if (format == AnalyticsExportFormat.pdf) {
          ref.read(analyticsExportProvider.notifier).exportPdf(
                widget.classId,
                period: period,
                includeStudentDetails: includeStudentDetails,
              );
        } else {
          ref.read(analyticsExportProvider.notifier).exportCsv(
                widget.classId,
                period: period,
              );
        }
      },
    );
  }

  void _handleDownload(String url) {
    // Platform-specific download handling
    // This would typically use url_launcher or a download manager
    debugPrint('Download URL: $url');
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Download started'),
        action: SnackBarAction(
          label: 'Open',
          onPressed: () {
            // Open URL
          },
        ),
      ),
    );
  }

  void _navigateToStudentDetails(StudentAnalyticsProfile student) {
    // Navigate to student detail screen
    debugPrint('Navigate to student: ${student.studentId}');
    // Navigator.push(context, MaterialPageRoute(
    //   builder: (context) => StudentAnalyticsDetailScreen(studentId: student.studentId),
    // ));
  }

  void _navigateToSubjectDetails(SubjectPerformance subject) {
    // Navigate to subject detail screen
    debugPrint('Navigate to subject: ${subject.subjectId}');
  }

  void _showInsightDetails(AnalyticsInsight insight) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) {
          return _InsightDetailSheet(
            insight: insight,
            scrollController: scrollController,
          );
        },
      ),
    );
  }

  void _showAllInsights() {
    // Navigate to all insights screen
    debugPrint('Show all insights');
  }

  void _showAllStudents(bool topPerformers) {
    // Navigate to student list screen
    debugPrint('Show all students: topPerformers=$topPerformers');
  }
}

class _InsightDetailSheet extends StatelessWidget {
  const _InsightDetailSheet({
    required this.insight,
    required this.scrollController,
  });

  final AnalyticsInsight insight;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: ListView(
        controller: scrollController,
        padding: const EdgeInsets.all(24),
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 24),
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Text(
            insight.title,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            insight.description,
            style: theme.textTheme.bodyLarge,
          ),
          if (insight.actionLabel != null) ...[
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () {
                Navigator.pop(context);
                // Navigate to action route
              },
              child: Text(insight.actionLabel!),
            ),
          ],
        ],
      ),
    );
  }
}
