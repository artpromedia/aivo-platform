import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

import '../analytics/analytics_service.dart';

/// Detail screen showing homework & focus analytics trends.
class HomeworkFocusDetailScreen extends ConsumerWidget {
  const HomeworkFocusDetailScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
    required this.parentId,
  });

  final String learnerId;
  final String learnerName;
  final String parentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsAsync = ref.watch(
      learnerAnalyticsProvider((parentId: parentId, learnerId: learnerId)),
    );

    return Scaffold(
      appBar: AppBar(
        title: Text('$learnerName\'s Progress'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(learnerAnalyticsProvider((parentId: parentId, learnerId: learnerId)));
        },
        child: analyticsAsync.when(
          data: (analytics) => _buildContent(context, analytics),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => _buildError(context, err.toString()),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, LearnerAnalytics analytics) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Homework Section
          Text('Homework Helper', style: theme.textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(
            'How your child uses the homework helper',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),

          _HomeworkSummaryCard(homework: analytics.homework),

          const SizedBox(height: 24),

          // Independence explanation
          _IndependenceExplanationCard(
            label: analytics.homework.independenceLabel,
            score: analytics.homework.independenceScore,
          ),

          const SizedBox(height: 32),

          // Focus Section
          Text('Focus & Breaks', style: theme.textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(
            'How your child manages focus during learning',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),

          _FocusSummaryCard(focus: analytics.focus),

          const SizedBox(height: 24),

          // Focus interpretation
          _FocusInterpretationCard(summary: analytics.focus.summary),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildError(BuildContext context, String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: 48,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Unable to load analytics',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              error,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeworkSummaryCard extends StatelessWidget {
  const _HomeworkSummaryCard({required this.homework});

  final HomeworkSummary homework;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _StatRow(
              icon: Icons.calendar_today,
              label: 'Sessions this week',
              value: homework.homeworkSessionsPerWeek.toStringAsFixed(1),
              subtitle: '${homework.totalHomeworkSessions} total sessions',
            ),
            const Divider(height: 24),
            _StatRow(
              icon: Icons.format_list_numbered,
              label: 'Avg. steps per homework',
              value: homework.avgStepsPerHomework.toStringAsFixed(1),
            ),
            const Divider(height: 24),
            _StatRow(
              icon: Icons.access_time,
              label: 'Last homework',
              value: homework.lastHomeworkDate != null
                  ? _formatDate(homework.lastHomeworkDate!)
                  : 'No data yet',
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays} days ago';
    return '${date.month}/${date.day}';
  }
}

class _IndependenceExplanationCard extends StatelessWidget {
  const _IndependenceExplanationCard({
    required this.label,
    required this.score,
  });

  final IndependenceLabel label;
  final double score;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Color bgColor;
    Color textColor;
    String explanation;
    String encouragement;

    switch (label) {
      case IndependenceLabel.needsSupport:
        bgColor = Colors.orange.shade50;
        textColor = Colors.orange.shade800;
        explanation = 'Your child often uses hints when working through problems.';
        encouragement = 'This is completely normal! Learning takes time, and it\'s great they\'re asking for help when needed.';
        break;
      case IndependenceLabel.buildingIndependence:
        bgColor = Colors.blue.shade50;
        textColor = Colors.blue.shade800;
        explanation = 'Your child is starting to work through more problems independently.';
        encouragement = 'They\'re making great progress! Encourage them to try problems on their own before using hints.';
        break;
      case IndependenceLabel.mostlyIndependent:
        bgColor = Colors.green.shade50;
        textColor = Colors.green.shade800;
        explanation = 'Your child works through most problems without needing hints.';
        encouragement = 'Excellent work! They\'re developing strong problem-solving skills.';
        break;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.psychology, color: textColor),
              const SizedBox(width: 8),
              Text(
                'Independence: ${label.displayText}',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: textColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            explanation,
            style: theme.textTheme.bodyMedium?.copyWith(color: textColor),
          ),
          const SizedBox(height: 8),
          Text(
            encouragement,
            style: theme.textTheme.bodySmall?.copyWith(
              color: textColor.withOpacity(0.8),
              fontStyle: FontStyle.italic,
            ),
          ),
          const SizedBox(height: 12),
          // Score indicator
          LinearProgressIndicator(
            value: score,
            backgroundColor: textColor.withOpacity(0.2),
            valueColor: AlwaysStoppedAnimation(textColor),
            borderRadius: BorderRadius.circular(4),
          ),
          const SizedBox(height: 4),
          Text(
            '${(score * 100).round()}% independent',
            style: theme.textTheme.labelSmall?.copyWith(color: textColor),
          ),
        ],
      ),
    );
  }
}

class _FocusSummaryCard extends StatelessWidget {
  const _FocusSummaryCard({required this.focus});

  final FocusSummary focus;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _StatRow(
              icon: Icons.spa,
              label: 'Avg. breaks per session',
              value: focus.avgFocusBreaksPerSession.toStringAsFixed(1),
            ),
            const Divider(height: 24),
            _StatRow(
              icon: Icons.timer,
              label: 'Avg. session length',
              value: '${focus.avgSessionDurationMinutes.round()} min',
            ),
            const Divider(height: 24),
            _StatRow(
              icon: Icons.analytics,
              label: 'Sessions analyzed',
              value: focus.totalSessions.toString(),
            ),
          ],
        ),
      ),
    );
  }
}

class _FocusInterpretationCard extends StatelessWidget {
  const _FocusInterpretationCard({required this.summary});

  final String summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.tertiaryContainer.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.lightbulb_outline,
            color: theme.colorScheme.tertiary,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              summary,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onTertiaryContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  const _StatRow({
    required this.icon,
    required this.label,
    required this.value,
    this.subtitle,
  });

  final IconData icon;
  final String label;
  final String value;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Icon(icon, size: 20, color: theme.colorScheme.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: theme.textTheme.bodyMedium),
              if (subtitle != null)
                Text(
                  subtitle!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
            ],
          ),
        ),
        Text(
          value,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
