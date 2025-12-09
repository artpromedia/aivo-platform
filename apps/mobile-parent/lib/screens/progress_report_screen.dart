import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../reports/reports_service.dart';

/// Progress Report Screen for Parent App
/// Displays a comprehensive, scrollable view of a learner's progress.
class ProgressReportScreen extends ConsumerWidget {
  const ProgressReportScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportAsync = ref.watch(parentLearnerReportProvider(learnerId));

    return Scaffold(
      appBar: AppBar(
        title: Text('$learnerName\'s Progress'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            tooltip: 'Share Report',
            onPressed: () => _shareReport(context, reportAsync),
          ),
        ],
      ),
      body: reportAsync.when(
        data: (report) => _ReportContent(report: report),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _ErrorView(
          error: error.toString(),
          onRetry: () => ref.invalidate(parentLearnerReportProvider(learnerId)),
        ),
      ),
    );
  }

  void _shareReport(BuildContext context, AsyncValue<ParentLearnerReport> reportAsync) {
    reportAsync.whenData((report) {
      final text = _generateShareText(report);
      Share.share(text, subject: '${report.learnerName}\'s Progress Report');
    });
  }

  String _generateShareText(ParentLearnerReport report) {
    final buffer = StringBuffer();
    buffer.writeln('📊 ${report.learnerName}\'s Progress Report');
    buffer.writeln('Generated: ${_formatDate(report.generatedAt)}');
    buffer.writeln();

    buffer.writeln('📚 Baseline Assessment');
    buffer.writeln(report.baseline.overallSummary);
    buffer.writeln();

    if (report.virtualBrain.initialized) {
      buffer.writeln('🧠 Learning Profile');
      buffer.writeln(report.virtualBrain.overallSummary);
      buffer.writeln();
    }

    buffer.writeln('🎯 Goals');
    buffer.writeln(report.goals.overallSummary);
    buffer.writeln();

    buffer.writeln('📝 Homework');
    buffer.writeln(report.homework.summary);
    buffer.writeln();

    buffer.writeln('🧘 Focus');
    buffer.writeln(report.focus.summary);

    return buffer.toString();
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }
}

class _ReportContent extends StatelessWidget {
  const _ReportContent({required this.report});

  final ParentLearnerReport report;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        // Provider will be invalidated by pull-to-refresh
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Report header
            _ReportHeader(report: report),
            const SizedBox(height: 24),

            // Baseline section
            _SectionCard(
              icon: Icons.assessment,
              title: 'Baseline Assessment',
              iconColor: Colors.blue,
              child: _BaselineSection(baseline: report.baseline),
            ),
            const SizedBox(height: 16),

            // Virtual Brain section
            _SectionCard(
              icon: Icons.psychology,
              title: 'Learning Profile',
              iconColor: Colors.purple,
              child: _VirtualBrainSection(virtualBrain: report.virtualBrain),
            ),
            const SizedBox(height: 16),

            // Goals section
            _SectionCard(
              icon: Icons.flag,
              title: 'Goals',
              iconColor: Colors.green,
              child: _GoalsSection(goals: report.goals),
            ),
            const SizedBox(height: 16),

            // Homework section
            _SectionCard(
              icon: Icons.menu_book,
              title: 'Homework Helper',
              iconColor: Colors.orange,
              child: _HomeworkSection(homework: report.homework),
            ),
            const SizedBox(height: 16),

            // Focus section
            _SectionCard(
              icon: Icons.spa,
              title: 'Focus & Attention',
              iconColor: Colors.teal,
              child: _FocusSection(focus: report.focus),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _ReportHeader extends StatelessWidget {
  const _ReportHeader({required this.report});

  final ParentLearnerReport report;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Progress Report',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          'Last ${report.reportPeriodDays} days • Generated ${_formatDate(report.generatedAt)}',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
      ],
    );
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.icon,
    required this.title,
    required this.iconColor,
    required this.child,
  });

  final IconData icon;
  final String title;
  final Color iconColor;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: iconColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: iconColor, size: 20),
                ),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }
}

class _BaselineSection extends StatelessWidget {
  const _BaselineSection({required this.baseline});

  final BaselineSummary baseline;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Status chip
        _StatusChip(
          status: baseline.status,
          label: _getStatusLabel(baseline.status),
        ),
        const SizedBox(height: 12),

        // Summary text
        Text(
          baseline.overallSummary,
          style: Theme.of(context).textTheme.bodyMedium,
        ),

        // Domain breakdowns
        if (baseline.domains.isNotEmpty) ...[
          const SizedBox(height: 16),
          ...baseline.domains.map((domain) => _DomainItem(domain: domain)),
        ],
      ],
    );
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'COMPLETED':
        return 'Complete';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'RETEST_ALLOWED':
        return 'Retest Available';
      default:
        return 'Not Started';
    }
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status, required this.label});

  final String status;
  final String label;

  @override
  Widget build(BuildContext context) {
    final (color, bgColor) = _getColors(status, context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }

  (Color, Color) _getColors(String status, BuildContext context) {
    switch (status) {
      case 'COMPLETED':
        return (Colors.green.shade700, Colors.green.shade50);
      case 'IN_PROGRESS':
        return (Colors.blue.shade700, Colors.blue.shade50);
      case 'ACTIVE':
        return (Colors.orange.shade700, Colors.orange.shade50);
      default:
        return (Colors.grey.shade700, Colors.grey.shade100);
    }
  }
}

class _DomainItem extends StatelessWidget {
  const _DomainItem({required this.domain});

  final DomainSummary domain;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            domain.assessed ? Icons.check_circle : Icons.circle_outlined,
            size: 18,
            color: domain.assessed
                ? Colors.green
                : Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  domain.domain,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                ),
                Text(
                  domain.summary,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _VirtualBrainSection extends StatelessWidget {
  const _VirtualBrainSection({required this.virtualBrain});

  final VirtualBrainSummary virtualBrain;

  @override
  Widget build(BuildContext context) {
    if (!virtualBrain.initialized) {
      return Text(
        virtualBrain.overallSummary,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          virtualBrain.overallSummary,
          style: Theme.of(context).textTheme.bodyMedium,
        ),

        // Strengths
        if (virtualBrain.strengths.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(
            '✨ Strengths',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 8),
          ...virtualBrain.strengths.map((skill) => _SkillItem(
                skill: skill,
                isStrength: true,
              )),
        ],

        // Focus areas
        if (virtualBrain.focusAreas.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(
            '🎯 Areas of Focus',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 8),
          ...virtualBrain.focusAreas.map((skill) => _SkillItem(
                skill: skill,
                isStrength: false,
              )),
        ],
      ],
    );
  }
}

class _SkillItem extends StatelessWidget {
  const _SkillItem({required this.skill, required this.isStrength});

  final SkillDetail skill;
  final bool isStrength;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isStrength
              ? Colors.green.withOpacity(0.05)
              : Colors.orange.withOpacity(0.05),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    skill.skill,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    skill.domain,
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              skill.description,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GoalsSection extends StatelessWidget {
  const _GoalsSection({required this.goals});

  final GoalsSummary goals;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Summary badges
        Row(
          children: [
            _CountBadge(
              count: goals.activeGoals.length,
              label: 'Active',
              color: Colors.blue,
            ),
            const SizedBox(width: 8),
            _CountBadge(
              count: goals.completedCount,
              label: 'Completed',
              color: Colors.green,
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Summary text
        Text(
          goals.overallSummary,
          style: Theme.of(context).textTheme.bodyMedium,
        ),

        // Active goals list
        if (goals.activeGoals.isNotEmpty) ...[
          const SizedBox(height: 16),
          ...goals.activeGoals.map((goal) => _GoalItem(goal: goal)),
        ],
      ],
    );
  }
}

class _CountBadge extends StatelessWidget {
  const _CountBadge({
    required this.count,
    required this.label,
    required this.color,
  });

  final int count;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$count',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: color,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: color,
                ),
          ),
        ],
      ),
    );
  }
}

class _GoalItem extends StatelessWidget {
  const _GoalItem({required this.goal});

  final GoalDetail goal;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    goal.title,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                  ),
                ),
                _StatusChip(status: goal.status, label: goal.status),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              goal.progressText,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            if (goal.targetDate != null) ...[
              const SizedBox(height: 4),
              Text(
                'Target: ${goal.targetDate!.month}/${goal.targetDate!.day}/${goal.targetDate!.year}',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _HomeworkSection extends StatelessWidget {
  const _HomeworkSection({required this.homework});

  final HomeworkReportSummary homework;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Metrics row
        Row(
          children: [
            Expanded(
              child: _MetricTile(
                value: homework.sessionsPerWeek.toStringAsFixed(1),
                label: 'Sessions/week',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _MetricTile(
                value: '${homework.totalSessions}',
                label: 'Total sessions',
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Independence badge
        _IndependenceBadge(
          label: homework.independenceLabel,
          labelText: homework.independenceLabelText,
          score: homework.independenceScore,
        ),
        const SizedBox(height: 12),

        // Summary
        Text(
          homework.summary,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ],
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
        ],
      ),
    );
  }
}

class _IndependenceBadge extends StatelessWidget {
  const _IndependenceBadge({
    required this.label,
    required this.labelText,
    required this.score,
  });

  final String label;
  final String labelText;
  final double score;

  @override
  Widget build(BuildContext context) {
    final (color, icon) = _getStyle(label);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  labelText,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: color,
                      ),
                ),
                Text(
                  'Independence score: ${(score * 100).round()}%',
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  (Color, IconData) _getStyle(String label) {
    switch (label) {
      case 'mostly_independent':
        return (Colors.green, Icons.emoji_events);
      case 'building_independence':
        return (Colors.blue, Icons.trending_up);
      case 'needs_support':
      default:
        return (Colors.orange, Icons.support);
    }
  }
}

class _FocusSection extends StatelessWidget {
  const _FocusSection({required this.focus});

  final FocusReportSummary focus;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Metrics row
        Row(
          children: [
            Expanded(
              child: _MetricTile(
                value: focus.avgBreaksPerSession.toStringAsFixed(1),
                label: 'Breaks/session',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _MetricTile(
                value: '${focus.avgSessionDurationMinutes.round()} min',
                label: 'Avg session',
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Summary
        Text(
          focus.summary,
          style: Theme.of(context).textTheme.bodyMedium,
        ),

        if (focus.totalSessions > 0) ...[
          const SizedBox(height: 8),
          Text(
            'Based on ${focus.totalSessions} learning sessions',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
        ],
      ],
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.error, required this.onRetry});

  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 48,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Unable to load report',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              error,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}
