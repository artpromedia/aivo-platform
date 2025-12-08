import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../analytics/analytics_service.dart';

/// Card showing homework & focus summary for a learner on parent dashboard.
class HomeworkFocusCard extends ConsumerWidget {
  const HomeworkFocusCard({
    super.key,
    required this.learner,
    required this.parentId,
  });

  final Learner learner;
  final String parentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsAsync = ref.watch(
      learnerAnalyticsProvider((parentId: parentId, learnerId: learner.id)),
    );

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push(
          '/homework-focus-detail/${learner.id}',
          extra: {'learnerName': learner.name, 'parentId': parentId},
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                    child: Text(
                      learner.name.isNotEmpty ? learner.name[0].toUpperCase() : '?',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          learner.name,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        Text(
                          'Homework & Focus',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.chevron_right,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Metrics
              analyticsAsync.when(
                data: (analytics) => _buildMetrics(context, analytics),
                loading: () => const _MetricsLoading(),
                error: (_, __) => _buildErrorState(context),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetrics(BuildContext context, LearnerAnalytics analytics) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Row(
          children: [
            // Homework sessions this week
            Expanded(
              child: _MetricTile(
                icon: Icons.menu_book,
                label: 'Homework/week',
                value: analytics.homework.homeworkSessionsPerWeek.toStringAsFixed(1),
              ),
            ),
            const SizedBox(width: 12),
            // Focus breaks
            Expanded(
              child: _MetricTile(
                icon: Icons.spa,
                label: 'Breaks/session',
                value: analytics.focus.avgFocusBreaksPerSession.toStringAsFixed(1),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Independence pill
        _IndependencePill(
          label: analytics.homework.independenceLabel,
          labelText: analytics.homework.independenceLabelText,
        ),
      ],
    );
  }

  Widget _buildErrorState(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer.withOpacity(0.3),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            Icons.info_outline,
            size: 18,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 8),
          Text(
            'Unable to load analytics',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
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

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: theme.colorScheme.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
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
}

class _IndependencePill extends StatelessWidget {
  const _IndependencePill({
    required this.label,
    required this.labelText,
  });

  final IndependenceLabel label;
  final String labelText;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Color bgColor;
    Color textColor;
    IconData icon;

    switch (label) {
      case IndependenceLabel.needsSupport:
        bgColor = Colors.orange.shade100;
        textColor = Colors.orange.shade800;
        icon = Icons.support;
        break;
      case IndependenceLabel.buildingIndependence:
        bgColor = Colors.blue.shade100;
        textColor = Colors.blue.shade800;
        icon = Icons.trending_up;
        break;
      case IndependenceLabel.mostlyIndependent:
        bgColor = Colors.green.shade100;
        textColor = Colors.green.shade800;
        icon = Icons.star;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: textColor),
          const SizedBox(width: 6),
          Text(
            'Independence: $labelText',
            style: theme.textTheme.labelMedium?.copyWith(
              color: textColor,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricsLoading extends StatelessWidget {
  const _MetricsLoading();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: _shimmerBox(context, 60)),
            const SizedBox(width: 12),
            Expanded(child: _shimmerBox(context, 60)),
          ],
        ),
        const SizedBox(height: 12),
        _shimmerBox(context, 32),
      ],
    );
  }

  Widget _shimmerBox(BuildContext context, double height) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(8),
      ),
    );
  }
}
