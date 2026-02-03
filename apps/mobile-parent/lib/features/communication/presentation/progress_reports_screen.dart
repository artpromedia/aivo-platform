/// Progress Reports Screen
///
/// Screen for viewing and generating progress reports.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/communication_models.dart';
import '../providers/communication_provider.dart';

/// Screen showing progress reports.
class ProgressReportsScreen extends ConsumerWidget {
  const ProgressReportsScreen({
    super.key,
    required this.childId,
  });

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportsAsync = ref.watch(reportsNotifierProvider(childId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Progress Reports'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showGenerateDialog(context, ref),
            tooltip: 'Generate Report',
          ),
        ],
      ),
      body: reportsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (reports) {
          if (reports.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.assessment,
                    size: 64,
                    color: theme.colorScheme.outline,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No reports yet',
                    style: theme.textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Generate your first\nprogress report',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: () => _showGenerateDialog(context, ref),
                    icon: const Icon(Icons.add),
                    label: const Text('Generate Report'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () =>
                ref.read(reportsNotifierProvider(childId).notifier).refresh(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: reports.length,
              itemBuilder: (context, index) {
                final report = reports[index];
                return _ReportCard(
                  report: report,
                  onTap: () => _showReportDetail(context, ref, report),
                );
              },
            ),
          );
        },
      ),
    );
  }

  void _showGenerateDialog(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _GenerateReportSheet(childId: childId),
    );
  }

  void _showReportDetail(
    BuildContext context,
    WidgetRef ref,
    ProgressReport report,
  ) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ReportDetailScreen(
          childId: childId,
          report: report,
        ),
      ),
    );
  }
}

/// Report card widget.
class _ReportCard extends StatelessWidget {
  const _ReportCard({
    required this.report,
    required this.onTap,
  });

  final ProgressReport report;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final improvement = report.overallProgress.improvementRate;

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
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.assessment,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _getPeriodLabel(report.period),
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '${_formatDate(report.periodStart)} - ${_formatDate(report.periodEnd)}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.outline,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _ScoreBadge(score: report.overallProgress.overallScore),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _MetricChip(
                    icon: Icons.school,
                    label: '${report.overallProgress.lessonsCompleted} lessons',
                  ),
                  const SizedBox(width: 8),
                  _MetricChip(
                    icon: Icons.timer,
                    label: '${report.overallProgress.totalMinutesLearned} min',
                  ),
                  const SizedBox(width: 8),
                  _MetricChip(
                    icon: Icons.local_fire_department,
                    label: '${report.overallProgress.currentStreak} streak',
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(
                    improvement >= 0 ? Icons.trending_up : Icons.trending_down,
                    size: 16,
                    color: improvement >= 0 ? Colors.green : Colors.red,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${improvement >= 0 ? '+' : ''}${(improvement * 100).round()}% vs previous',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: improvement >= 0 ? Colors.green : Colors.red,
                    ),
                  ),
                  const Spacer(),
                  if (report.pdfUrl != null)
                    TextButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.picture_as_pdf, size: 16),
                      label: const Text('PDF'),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getPeriodLabel(ReportPeriod period) {
    switch (period) {
      case ReportPeriod.weekly:
        return 'Weekly Report';
      case ReportPeriod.biweekly:
        return 'Bi-Weekly Report';
      case ReportPeriod.monthly:
        return 'Monthly Report';
      case ReportPeriod.quarterly:
        return 'Quarterly Report';
      case ReportPeriod.semester:
        return 'Semester Report';
    }
  }

  String _formatDate(DateTime date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[date.month - 1]} ${date.day}';
  }
}

/// Score badge.
class _ScoreBadge extends StatelessWidget {
  const _ScoreBadge({required this.score});

  final double score;

  @override
  Widget build(BuildContext context) {
    final percentage = (score * 100).round();
    final color = percentage >= 80
        ? Colors.green
        : percentage >= 60
            ? Colors.orange
            : Colors.red;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        shape: BoxShape.circle,
      ),
      child: Text(
        '$percentage',
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 18,
        ),
      ),
    );
  }
}

/// Metric chip.
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
          Text(label, style: theme.textTheme.labelSmall),
        ],
      ),
    );
  }
}

/// Generate report bottom sheet.
class _GenerateReportSheet extends ConsumerStatefulWidget {
  const _GenerateReportSheet({required this.childId});

  final String childId;

  @override
  ConsumerState<_GenerateReportSheet> createState() => _GenerateReportSheetState();
}

class _GenerateReportSheetState extends ConsumerState<_GenerateReportSheet> {
  ReportPeriod _selectedPeriod = ReportPeriod.weekly;
  bool _includeTranscripts = true;
  bool _includeTeacherNotes = true;
  bool _includeGoalProgress = true;
  bool _generatePdf = true;
  bool _isGenerating = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) {
          return ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(24),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.outline,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Generate Report',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),

              // Period selection
              Text(
                'Report Period',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: ReportPeriod.values.map((period) {
                  final isSelected = _selectedPeriod == period;
                  return ChoiceChip(
                    label: Text(_getPeriodLabel(period)),
                    selected: isSelected,
                    onSelected: (_) => setState(() => _selectedPeriod = period),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),

              // Include options
              Text(
                'Include in Report',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Card(
                child: Column(
                  children: [
                    CheckboxListTile(
                      title: const Text('Homework Transcripts'),
                      subtitle: const Text('Session summaries and details'),
                      value: _includeTranscripts,
                      onChanged: (v) =>
                          setState(() => _includeTranscripts = v ?? true),
                    ),
                    const Divider(height: 1),
                    CheckboxListTile(
                      title: const Text('Teacher Notes'),
                      subtitle: const Text('Communications from teachers'),
                      value: _includeTeacherNotes,
                      onChanged: (v) =>
                          setState(() => _includeTeacherNotes = v ?? true),
                    ),
                    const Divider(height: 1),
                    CheckboxListTile(
                      title: const Text('Goal Progress'),
                      subtitle: const Text('IEP and learning goal tracking'),
                      value: _includeGoalProgress,
                      onChanged: (v) =>
                          setState(() => _includeGoalProgress = v ?? true),
                    ),
                    const Divider(height: 1),
                    CheckboxListTile(
                      title: const Text('Generate PDF'),
                      subtitle: const Text('Downloadable and shareable'),
                      value: _generatePdf,
                      onChanged: (v) =>
                          setState(() => _generatePdf = v ?? true),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Generate button
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _isGenerating ? null : _generate,
                  icon: _isGenerating
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.auto_awesome),
                  label: Text(_isGenerating ? 'Generating...' : 'Generate Report'),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  String _getPeriodLabel(ReportPeriod period) {
    switch (period) {
      case ReportPeriod.weekly:
        return 'Weekly';
      case ReportPeriod.biweekly:
        return 'Bi-Weekly';
      case ReportPeriod.monthly:
        return 'Monthly';
      case ReportPeriod.quarterly:
        return 'Quarterly';
      case ReportPeriod.semester:
        return 'Semester';
    }
  }

  Future<void> _generate() async {
    setState(() => _isGenerating = true);

    try {
      final request = ReportRequest(
        childId: widget.childId,
        period: _selectedPeriod,
        includeTranscripts: _includeTranscripts,
        includeTeacherNotes: _includeTeacherNotes,
        includeGoalProgress: _includeGoalProgress,
        generatePdf: _generatePdf,
      );

      await ref.read(reportGenerationNotifierProvider.notifier).generate(
            widget.childId,
            request,
          );

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Report generated successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error generating report: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isGenerating = false);
      }
    }
  }
}

/// Report detail screen.
class ReportDetailScreen extends ConsumerWidget {
  const ReportDetailScreen({
    super.key,
    required this.childId,
    required this.report,
  });

  final String childId;
  final ProgressReport report;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(_getPeriodLabel(report.period)),
        actions: [
          if (report.pdfUrl != null)
            IconButton(
              icon: const Icon(Icons.download),
              onPressed: () => _downloadPdf(context, ref),
              tooltip: 'Download PDF',
            ),
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () => _showShareDialog(context, ref),
            tooltip: 'Share',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Overall progress card
          _OverallProgressCard(progress: report.overallProgress),
          const SizedBox(height: 16),

          // Subject progress
          Text(
            'Subject Progress',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          ...report.subjectProgress.map(
            (sp) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _SubjectProgressCard(progress: sp),
            ),
          ),
          const SizedBox(height: 16),

          // Engagement metrics
          Text(
            'Engagement',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          _EngagementCard(engagement: report.engagement),
          const SizedBox(height: 16),

          // Achievements
          if (report.achievements.isNotEmpty) ...[
            Text(
              'Achievements',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: report.achievements
                      .map((a) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              children: [
                                const Icon(Icons.emoji_events, color: Colors.amber),
                                const SizedBox(width: 8),
                                Expanded(child: Text(a)),
                              ],
                            ),
                          ))
                      .toList(),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Areas for growth
          if (report.areasForGrowth.isNotEmpty) ...[
            Text(
              'Areas for Growth',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: report.areasForGrowth
                      .map((a) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              children: [
                                const Icon(Icons.trending_up, color: Colors.blue),
                                const SizedBox(width: 8),
                                Expanded(child: Text(a)),
                              ],
                            ),
                          ))
                      .toList(),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // AI insights
          if (report.aiInsights != null) ...[
            Text(
              'AI Insights',
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
                    Expanded(child: Text(report.aiInsights!)),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  String _getPeriodLabel(ReportPeriod period) {
    switch (period) {
      case ReportPeriod.weekly:
        return 'Weekly Report';
      case ReportPeriod.biweekly:
        return 'Bi-Weekly Report';
      case ReportPeriod.monthly:
        return 'Monthly Report';
      case ReportPeriod.quarterly:
        return 'Quarterly Report';
      case ReportPeriod.semester:
        return 'Semester Report';
    }
  }

  void _downloadPdf(BuildContext context, WidgetRef ref) async {
    try {
      final url = await ref
          .read(reportShareNotifierProvider.notifier)
          .downloadPdf(childId, report.id);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Download started: $url')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _showShareDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => _ShareReportDialog(
        childId: childId,
        reportId: report.id,
      ),
    );
  }
}

/// Overall progress card.
class _OverallProgressCard extends StatelessWidget {
  const _OverallProgressCard({required this.progress});

  final OverallProgress progress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final score = (progress.overallScore * 100).round();
    final improvement = progress.improvementRate;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: _getScoreColor(score).withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: _getScoreColor(score),
                      width: 4,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      '$score',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: _getScoreColor(score),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Overall Score',
              style: theme.textTheme.titleSmall,
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  improvement >= 0 ? Icons.trending_up : Icons.trending_down,
                  size: 16,
                  color: improvement >= 0 ? Colors.green : Colors.red,
                ),
                const SizedBox(width: 4),
                Text(
                  '${improvement >= 0 ? '+' : ''}${(improvement * 100).round()}% from previous',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: improvement >= 0 ? Colors.green : Colors.red,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _SmallStat(
                  value: '${progress.lessonsCompleted}',
                  label: 'Lessons',
                ),
                _SmallStat(
                  value: '${progress.totalMinutesLearned}m',
                  label: 'Time',
                ),
                _SmallStat(
                  value: '${progress.daysActive}',
                  label: 'Active Days',
                ),
                _SmallStat(
                  value: '${progress.currentStreak}',
                  label: 'Streak',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getScoreColor(int score) {
    if (score >= 80) return Colors.green;
    if (score >= 60) return Colors.orange;
    return Colors.red;
  }
}

/// Small stat widget.
class _SmallStat extends StatelessWidget {
  const _SmallStat({
    required this.value,
    required this.label,
  });

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
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
    );
  }
}

/// Subject progress card.
class _SubjectProgressCard extends StatelessWidget {
  const _SubjectProgressCard({required this.progress});

  final SubjectProgress progress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final score = (progress.score * 100).round();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _getSubjectIcon(progress.subject),
                  color: _getSubjectColor(progress.subject),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _formatSubject(progress.subject),
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getScoreColor(score).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '$score%',
                    style: TextStyle(
                      color: _getScoreColor(score),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: progress.score,
              backgroundColor: _getSubjectColor(progress.subject).withValues(alpha: 0.2),
              valueColor: AlwaysStoppedAnimation(_getSubjectColor(progress.subject)),
            ),
            const SizedBox(height: 8),
            Text(
              '${progress.lessonsCompleted} lessons · ${progress.minutesSpent} minutes',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
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

  Color _getScoreColor(int score) {
    if (score >= 80) return Colors.green;
    if (score >= 60) return Colors.orange;
    return Colors.red;
  }
}

/// Engagement card.
class _EngagementCard extends StatelessWidget {
  const _EngagementCard({required this.engagement});

  final EngagementMetrics engagement;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _EngagementStat(
                  value: '${(engagement.averageEngagement * 100).round()}%',
                  label: 'Engagement',
                  icon: Icons.psychology,
                ),
                _EngagementStat(
                  value: '${engagement.totalSessions}',
                  label: 'Sessions',
                  icon: Icons.play_circle,
                ),
                _EngagementStat(
                  value: '${(engagement.completionRate * 100).round()}%',
                  label: 'Completion',
                  icon: Icons.check_circle,
                ),
              ],
            ),
            if (engagement.peakLearningTimes.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(
                'Peak Learning Times',
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Wrap(
                spacing: 8,
                children: engagement.peakLearningTimes
                    .map((t) => Chip(
                          avatar: const Icon(Icons.access_time, size: 16),
                          label: Text(t, style: theme.textTheme.labelSmall),
                          padding: EdgeInsets.zero,
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ))
                    .toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Engagement stat widget.
class _EngagementStat extends StatelessWidget {
  const _EngagementStat({
    required this.value,
    required this.label,
    required this.icon,
  });

  final String value;
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Icon(icon, color: theme.colorScheme.primary),
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
    );
  }
}

/// Share report dialog.
class _ShareReportDialog extends ConsumerStatefulWidget {
  const _ShareReportDialog({
    required this.childId,
    required this.reportId,
  });

  final String childId;
  final String reportId;

  @override
  ConsumerState<_ShareReportDialog> createState() => _ShareReportDialogState();
}

class _ShareReportDialogState extends ConsumerState<_ShareReportDialog> {
  final _emailController = TextEditingController();
  final _messageController = TextEditingController();
  bool _isSharing = false;

  @override
  void dispose() {
    _emailController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Share Report'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _emailController,
            decoration: const InputDecoration(
              labelText: 'Email addresses',
              hintText: 'Separate multiple with commas',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _messageController,
            decoration: const InputDecoration(
              labelText: 'Message (optional)',
              border: OutlineInputBorder(),
            ),
            maxLines: 2,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _isSharing ? null : _share,
          child: _isSharing
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Share'),
        ),
      ],
    );
  }

  Future<void> _share() async {
    if (_emailController.text.isEmpty) return;

    setState(() => _isSharing = true);

    try {
      final emails = _emailController.text
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList();

      await ref.read(reportShareNotifierProvider.notifier).share(
            widget.childId,
            widget.reportId,
            emails: emails,
            message: _messageController.text.isNotEmpty
                ? _messageController.text
                : null,
          );

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Report shared successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSharing = false);
      }
    }
  }
}
