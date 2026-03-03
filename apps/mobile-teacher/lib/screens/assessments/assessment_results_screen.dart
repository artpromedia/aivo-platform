/// Assessment Results Screen
///
/// View assessment results, submissions, and analytics.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/assessment_provider.dart';
import '../../repositories/assessment_repository.dart';

/// Screen showing assessment results and analytics
class AssessmentResultsScreen extends ConsumerStatefulWidget {
  const AssessmentResultsScreen({
    required this.assessmentId,
    required this.assessmentName,
    super.key,
  });

  final String assessmentId;
  final String assessmentName;

  @override
  ConsumerState<AssessmentResultsScreen> createState() =>
      _AssessmentResultsScreenState();
}

class _AssessmentResultsScreenState
    extends ConsumerState<AssessmentResultsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);

    // Load results
    Future.microtask(() {
      ref
          .read(assessmentResultsProvider(widget.assessmentId).notifier)
          .loadResults();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(assessmentResultsProvider(widget.assessmentId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Results'),
            Text(
              widget.assessmentName,
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: () => _exportResults(context),
            tooltip: 'Export',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref
                .read(assessmentResultsProvider(widget.assessmentId).notifier)
                .loadResults(),
            tooltip: 'Refresh',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Submissions'),
            Tab(text: 'Questions'),
          ],
        ),
      ),
      body: state.isLoading && state.results == null
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && state.results == null
              ? _buildErrorState(context, state.error!)
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOverviewTab(context, state),
                    _buildSubmissionsTab(context, state),
                    _buildQuestionsTab(context, state),
                  ],
                ),
    );
  }

  Widget _buildErrorState(BuildContext context, String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            'Failed to load results',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(error, style: TextStyle(color: Colors.grey[600])),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => ref
                .read(assessmentResultsProvider(widget.assessmentId).notifier)
                .loadResults(),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewTab(BuildContext context, AssessmentResultsState state) {
    final results = state.results;
    if (results == null) {
      return const Center(child: Text('No results available'));
    }

    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Summary cards
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  icon: Icons.people,
                  label: 'Submissions',
                  value: '${results.submittedCount}',
                  color: Colors.blue,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  icon: Icons.grade,
                  label: 'Average Score',
                  value: '${results.averageScore.toStringAsFixed(1)}%',
                  color: _getScoreColor(results.averageScore),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  icon: Icons.trending_up,
                  label: 'Highest',
                  value: '${results.highestScore.toStringAsFixed(1)}%',
                  color: Colors.green,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  icon: Icons.trending_down,
                  label: 'Lowest',
                  value: '${results.lowestScore.toStringAsFixed(1)}%',
                  color: Colors.red,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Score distribution
          Text(
            'Score Distribution',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          _buildScoreDistribution(context, results),
          const SizedBox(height: 24),

          // Completion rate
          Text(
            'Completion Status',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          _buildCompletionStatus(context, results),
        ],
      ),
    );
  }

  Widget _buildScoreDistribution(
    BuildContext context,
    AssessmentResults results,
  ) {
    // Group scores into ranges
    final ranges = <String, int>{
      '90-100%': 0,
      '80-89%': 0,
      '70-79%': 0,
      '60-69%': 0,
      'Below 60%': 0,
    };

    for (final submission in results.submissions) {
      final score = submission.percentage ?? 
          ((submission.maxScore ?? 0) > 0 
              ? ((submission.score ?? 0) / submission.maxScore!) * 100 
              : 0);
      if (score >= 90) {
        ranges['90-100%'] = ranges['90-100%']! + 1;
      } else if (score >= 80) {
        ranges['80-89%'] = ranges['80-89%']! + 1;
      } else if (score >= 70) {
        ranges['70-79%'] = ranges['70-79%']! + 1;
      } else if (score >= 60) {
        ranges['60-69%'] = ranges['60-69%']! + 1;
      } else {
        ranges['Below 60%'] = ranges['Below 60%']! + 1;
      }
    }

    final total = results.submissions.length;
    final colors = [Colors.green, Colors.lightGreen, Colors.amber, Colors.orange, Colors.red];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: ranges.entries.toList().asMap().entries.map((entry) {
            final index = entry.key;
            final range = entry.value;
            final percent = total > 0 ? (range.value / total) : 0.0;

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  SizedBox(
                    width: 80,
                    child: Text(range.key, style: const TextStyle(fontSize: 12)),
                  ),
                  Expanded(
                    child: Stack(
                      children: [
                        Container(
                          height: 24,
                          decoration: BoxDecoration(
                            color: Colors.grey[200],
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        FractionallySizedBox(
                          widthFactor: percent,
                          child: Container(
                            height: 24,
                            decoration: BoxDecoration(
                              color: colors[index],
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 30,
                    child: Text(
                      '${range.value}',
                      textAlign: TextAlign.right,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildCompletionStatus(
    BuildContext context,
    AssessmentResults results,
  ) {
    final submitted = results.submissions
        .where((s) => s.status == SubmissionStatus.submitted)
        .length;
    final graded = results.submissions
        .where((s) => s.status == SubmissionStatus.graded)
        .length;
    final pending = results.submissions
        .where((s) => s.status == SubmissionStatus.inProgress)
        .length;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _CompletionStat(
              label: 'Graded',
              count: graded,
              color: Colors.green,
              icon: Icons.check_circle,
            ),
            _CompletionStat(
              label: 'Submitted',
              count: submitted,
              color: Colors.blue,
              icon: Icons.send,
            ),
            _CompletionStat(
              label: 'In Progress',
              count: pending,
              color: Colors.orange,
              icon: Icons.pending,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSubmissionsTab(
    BuildContext context,
    AssessmentResultsState state,
  ) {
    final submissions = state.results?.submissions ?? [];

    if (submissions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox_outlined, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No submissions yet',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Sort/filter bar
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: const InputDecoration(
                    hintText: 'Search students...',
                    prefixIcon: Icon(Icons.search),
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12),
                    isDense: true,
                  ),
                  // Note: Search is filtered client-side
                  onChanged: (value) {
                    // Could implement local filtering here
                  },
                ),
              ),
              const SizedBox(width: 8),
              PopupMenuButton<SubmissionSortBy>(
                icon: const Icon(Icons.sort),
                onSelected: (sort) {
                  ref
                      .read(assessmentResultsProvider(widget.assessmentId)
                          .notifier)
                      .setSort(sort);
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: SubmissionSortBy.name,
                    child: Text('Sort by Name'),
                  ),
                  const PopupMenuItem(
                    value: SubmissionSortBy.score,
                    child: Text('Sort by Score'),
                  ),
                  const PopupMenuItem(
                    value: SubmissionSortBy.submittedAt,
                    child: Text('Sort by Date'),
                  ),
                  const PopupMenuItem(
                    value: SubmissionSortBy.status,
                    child: Text('Sort by Status'),
                  ),
                ],
              ),
            ],
          ),
        ),

        // Submissions list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: state.sortedSubmissions.length,
            itemBuilder: (context, index) {
              final submission = state.sortedSubmissions[index];
              return _SubmissionCard(
                submission: submission,
                onTap: () => _viewSubmission(context, submission),
                onGrade: submission.status != SubmissionStatus.graded
                    ? () => _gradeSubmission(context, submission)
                    : null,
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildQuestionsTab(
    BuildContext context,
    AssessmentResultsState state,
  ) {
    final questionStats = state.results?.questionStats ?? [];

    if (questionStats.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.quiz_outlined, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No question data available',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: questionStats.length,
      itemBuilder: (context, index) {
        final stats = questionStats[index];
        return _QuestionStatsCard(
          questionNumber: index + 1,
          stats: stats,
        );
      },
    );
  }

  void _exportResults(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Export functionality coming soon'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _viewSubmission(BuildContext context, AssessmentSubmission submission) {
    // TODO: Navigate to submission detail screen
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Viewing submission from ${submission.studentName}'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _gradeSubmission(BuildContext context, AssessmentSubmission submission) {
    // TODO: Navigate to grading screen
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Grading submission from ${submission.studentName}'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Color _getScoreColor(double score) {
    if (score >= 90) return Colors.green;
    if (score >= 80) return Colors.lightGreen;
    if (score >= 70) return Colors.amber;
    if (score >= 60) return Colors.orange;
    return Colors.red;
  }
}

// ==========================================================================
// WIDGETS
// ==========================================================================

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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CompletionStat extends StatelessWidget {
  const _CompletionStat({
    required this.label,
    required this.count,
    required this.color,
    required this.icon,
  });

  final String label;
  final int count;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color, size: 28),
        const SizedBox(height: 4),
        Text(
          '$count',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(color: Colors.grey[600], fontSize: 12),
        ),
      ],
    );
  }
}

class _SubmissionCard extends StatelessWidget {
  const _SubmissionCard({
    required this.submission,
    required this.onTap,
    this.onGrade,
  });

  final AssessmentSubmission submission;
  final VoidCallback onTap;
  final VoidCallback? onGrade;

  @override
  Widget build(BuildContext context) {
    final scorePercent = submission.percentage ?? 
        ((submission.maxScore ?? 0) > 0
            ? ((submission.score ?? 0) / submission.maxScore!) * 100
            : 0.0);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getStatusColor(submission.status).withOpacity(0.2),
          child: Icon(
            _getStatusIcon(submission.status),
            color: _getStatusColor(submission.status),
          ),
        ),
        title: Text(submission.studentName),
        subtitle: Text(
          '${(submission.score ?? 0).toStringAsFixed(1)} / ${submission.maxScore ?? 0} pts '
          '(${scorePercent.toStringAsFixed(0)}%)',
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (onGrade != null)
              TextButton(
                onPressed: onGrade,
                child: const Text('Grade'),
              ),
            const Icon(Icons.chevron_right),
          ],
        ),
        onTap: onTap,
      ),
    );
  }

  Color _getStatusColor(SubmissionStatus status) {
    switch (status) {
      case SubmissionStatus.notStarted:
        return Colors.grey;
      case SubmissionStatus.inProgress:
        return Colors.orange;
      case SubmissionStatus.submitted:
        return Colors.blue;
      case SubmissionStatus.partiallyGraded:
        return Colors.amber;
      case SubmissionStatus.graded:
        return Colors.green;
    }
  }

  IconData _getStatusIcon(SubmissionStatus status) {
    switch (status) {
      case SubmissionStatus.notStarted:
        return Icons.hourglass_empty;
      case SubmissionStatus.inProgress:
        return Icons.edit;
      case SubmissionStatus.submitted:
        return Icons.send;
      case SubmissionStatus.partiallyGraded:
        return Icons.pending;
      case SubmissionStatus.graded:
        return Icons.check_circle;
    }
  }
}

class _QuestionStatsCard extends StatelessWidget {
  const _QuestionStatsCard({
    required this.questionNumber,
    required this.stats,
  });

  final int questionNumber;
  final QuestionStats stats;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final correctPercent = stats.correctRate;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: theme.colorScheme.primaryContainer,
                  child: Text(
                    '$questionNumber',
                    style: TextStyle(
                      color: theme.colorScheme.onPrimaryContainer,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    stats.questionStem,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _MiniStat(
                  label: 'Correct',
                  value: '${correctPercent.toStringAsFixed(0)}%',
                  color: Colors.green,
                ),
                const SizedBox(width: 24),
                _MiniStat(
                  label: 'Responses',
                  value: '${stats.totalResponses}',
                  color: Colors.blue,
                ),
                const SizedBox(width: 24),
                _MiniStat(
                  label: 'Avg Score',
                  value: stats.averageScore.toStringAsFixed(1),
                  color: Colors.orange,
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Correct percentage bar
            Stack(
              children: [
                Container(
                  height: 8,
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                FractionallySizedBox(
                  widthFactor: correctPercent / 100,
                  child: Container(
                    height: 8,
                    decoration: BoxDecoration(
                      color: Colors.green,
                      borderRadius: BorderRadius.circular(4),
                    ),
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

class _MiniStat extends StatelessWidget {
  const _MiniStat({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(color: Colors.grey[600], fontSize: 11),
        ),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
