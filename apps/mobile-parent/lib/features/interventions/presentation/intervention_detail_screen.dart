/// Intervention Detail Screen
///
/// Detailed view of a single intervention.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/intervention_history.dart';
import '../providers/intervention_provider.dart';
import '../widgets/widgets.dart';

/// Screen showing detailed information about an intervention.
class InterventionDetailScreen extends ConsumerWidget {
  const InterventionDetailScreen({
    super.key,
    required this.interventionId,
  });

  final String interventionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final detailsAsync = ref.watch(interventionDetailsProvider(interventionId));
    final outcomesAsync = ref.watch(interventionOutcomesProvider(interventionId));
    final evidenceAsync = ref.watch(interventionEvidenceProvider(interventionId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Support Details'),
      ),
      body: detailsAsync.when(
        data: (intervention) => _buildContent(
          context,
          intervention,
          outcomesAsync,
          evidenceAsync,
          theme,
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text('Failed to load details'),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: () =>
                    ref.invalidate(interventionDetailsProvider(interventionId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    InterventionRecord intervention,
    AsyncValue<InterventionOutcome?> outcomesAsync,
    AsyncValue<List<InterventionEvidence>> evidenceAsync,
    ThemeData theme,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header card
          _buildHeaderCard(intervention, theme),
          const SizedBox(height: 16),

          // Description
          _buildDescriptionSection(intervention, theme),
          const SizedBox(height: 16),

          // Goals
          if (intervention.goals.isNotEmpty)
            _buildGoalsSection(intervention, theme),

          // Progress
          if (intervention.progressHistory.isNotEmpty)
            _buildProgressSection(intervention, theme),

          // Outcome
          outcomesAsync.when(
            data: (outcome) {
              if (outcome == null) return const SizedBox.shrink();
              return _buildOutcomeSection(outcome, theme);
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, __) => const SizedBox.shrink(),
          ),

          // Evidence
          evidenceAsync.when(
            data: (evidence) {
              if (evidence.isEmpty) return const SizedBox.shrink();
              return _buildEvidenceSection(evidence, theme);
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),

          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildHeaderCard(InterventionRecord intervention, ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _getCategoryColor(intervention.category)
                        .withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    _getCategoryIcon(intervention.category),
                    color: _getCategoryColor(intervention.category),
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        intervention.title,
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _getTypeLabel(intervention.type),
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _buildStatusChip(intervention.status),
                const SizedBox(width: 8),
                _buildCategoryChip(intervention.category),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Icon(
                  Icons.calendar_today,
                  size: 16,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 4),
                Text(
                  'Started: ${_formatDate(intervention.startDate)}',
                  style: theme.textTheme.bodySmall,
                ),
                if (intervention.endDate != null) ...[
                  const SizedBox(width: 16),
                  Icon(
                    Icons.event,
                    size: 16,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Ended: ${_formatDate(intervention.endDate!)}',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ],
            ),
            if (intervention.assignedByName != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    Icons.person,
                    size: 16,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Assigned by: ${intervention.assignedByName}',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDescriptionSection(
    InterventionRecord intervention,
    ThemeData theme,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Description',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              intervention.description,
              style: theme.textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGoalsSection(
    InterventionRecord intervention,
    ThemeData theme,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Goals',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              ...intervention.goals.map((goal) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.flag,
                          size: 16,
                          color: theme.colorScheme.primary,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(goal),
                        ),
                      ],
                    ),
                  )),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProgressSection(
    InterventionRecord intervention,
    ThemeData theme,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Progress',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              InterventionProgressChart(
                progressHistory: intervention.progressHistory,
                height: 120,
              ),
              const SizedBox(height: 16),
              // Progress history list
              ...intervention.progressHistory.reversed.take(5).map((progress) {
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: InterventionCircularProgress(
                    progress: progress.progressValue,
                    size: 40,
                  ),
                  title: Text(_formatDate(progress.date)),
                  subtitle: progress.notes != null ? Text(progress.notes!) : null,
                  trailing: Text(
                    '${(progress.progressValue * 100).round()}%',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOutcomeSection(
    InterventionOutcome outcome,
    ThemeData theme,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    'Outcome',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  OutcomeBadge(outcome: outcome),
                ],
              ),
              const SizedBox(height: 16),
              if (outcome.notes != null) ...[
                Text(
                  outcome.notes!,
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
              ],
              if (outcome.improvements.isNotEmpty) ...[
                Text(
                  'Improvements',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: Colors.green,
                  ),
                ),
                const SizedBox(height: 4),
                ...outcome.improvements.map((item) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        children: [
                          Icon(Icons.check, size: 14, color: Colors.green),
                          const SizedBox(width: 4),
                          Expanded(child: Text(item)),
                        ],
                      ),
                    )),
                const SizedBox(height: 8),
              ],
              if (outcome.challenges.isNotEmpty) ...[
                Text(
                  'Challenges',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: Colors.orange,
                  ),
                ),
                const SizedBox(height: 4),
                ...outcome.challenges.map((item) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        children: [
                          Icon(Icons.info, size: 14, color: Colors.orange),
                          const SizedBox(width: 4),
                          Expanded(child: Text(item)),
                        ],
                      ),
                    )),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEvidenceSection(
    List<InterventionEvidence> evidence,
    ThemeData theme,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Related Documents',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              ...evidence.map((item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(_getEvidenceIcon(item.type)),
                    title: Text(item.title),
                    subtitle: item.description != null
                        ? Text(
                            item.description!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          )
                        : null,
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // TODO: Open evidence
                    },
                  )),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(InterventionStatus status) {
    final color = _getStatusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            _getStatusLabel(status),
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(InterventionCategory category) {
    final color = _getCategoryColor(category);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_getCategoryIcon(category), size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            _getCategoryLabel(category),
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(InterventionStatus status) {
    switch (status) {
      case InterventionStatus.active:
        return Colors.blue;
      case InterventionStatus.completed:
        return Colors.green;
      case InterventionStatus.paused:
        return Colors.orange;
      case InterventionStatus.discontinued:
        return Colors.grey;
      case InterventionStatus.pending:
        return Colors.purple;
    }
  }

  String _getStatusLabel(InterventionStatus status) {
    switch (status) {
      case InterventionStatus.active:
        return 'Active';
      case InterventionStatus.completed:
        return 'Completed';
      case InterventionStatus.paused:
        return 'Paused';
      case InterventionStatus.discontinued:
        return 'Ended';
      case InterventionStatus.pending:
        return 'Pending';
    }
  }

  Color _getCategoryColor(InterventionCategory category) {
    switch (category) {
      case InterventionCategory.academic:
        return Colors.blue;
      case InterventionCategory.behavioral:
        return Colors.orange;
      case InterventionCategory.social:
        return Colors.green;
      case InterventionCategory.accessibility:
        return Colors.purple;
      case InterventionCategory.engagement:
        return Colors.teal;
      case InterventionCategory.motivation:
        return Colors.pink;
    }
  }

  IconData _getCategoryIcon(InterventionCategory category) {
    switch (category) {
      case InterventionCategory.academic:
        return Icons.school;
      case InterventionCategory.behavioral:
        return Icons.psychology;
      case InterventionCategory.social:
        return Icons.people;
      case InterventionCategory.accessibility:
        return Icons.accessibility;
      case InterventionCategory.engagement:
        return Icons.trending_up;
      case InterventionCategory.motivation:
        return Icons.emoji_events;
    }
  }

  String _getCategoryLabel(InterventionCategory category) {
    switch (category) {
      case InterventionCategory.academic:
        return 'Academic';
      case InterventionCategory.behavioral:
        return 'Behavioral';
      case InterventionCategory.social:
        return 'Social';
      case InterventionCategory.accessibility:
        return 'Accessibility';
      case InterventionCategory.engagement:
        return 'Engagement';
      case InterventionCategory.motivation:
        return 'Motivation';
    }
  }

  String _getTypeLabel(InterventionType type) {
    switch (type) {
      case InterventionType.aiAdaptive:
        return 'AI-Powered Support';
      case InterventionType.teacherRecommended:
        return 'Teacher Recommendation';
      case InterventionType.systemGenerated:
        return 'Automated Support';
      case InterventionType.parentRequested:
        return 'Parent Request';
    }
  }

  IconData _getEvidenceIcon(EvidenceType type) {
    switch (type) {
      case EvidenceType.document:
        return Icons.description;
      case EvidenceType.image:
        return Icons.image;
      case EvidenceType.video:
        return Icons.video_file;
      case EvidenceType.assessment:
        return Icons.quiz;
      case EvidenceType.report:
        return Icons.assessment;
      case EvidenceType.note:
        return Icons.note;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }
}
