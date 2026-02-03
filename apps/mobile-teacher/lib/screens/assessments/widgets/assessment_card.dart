/// Assessment Card Widget
///
/// A card displaying assessment info with status badge for list views.
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../models/assessment.dart';

/// Card widget for displaying an assessment in a list
class AssessmentCard extends StatelessWidget {
  const AssessmentCard({
    required this.assessment,
    required this.onTap,
    this.onEdit,
    this.onDelete,
    this.onDuplicate,
    this.onPublish,
    super.key,
  });

  final Assessment assessment;
  final VoidCallback onTap;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final VoidCallback? onDuplicate;
  final VoidCallback? onPublish;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with status badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: _getStatusColor(assessment.status).withOpacity(0.1),
              ),
              child: Row(
                children: [
                  Icon(
                    _getTypeIcon(assessment.type),
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          assessment.name,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          assessment.type.label,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _StatusBadge(status: assessment.status),
                ],
              ),
            ),

            // Body with description and stats
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (assessment.description != null) ...[
                    Text(
                      assessment.description!,
                      style: theme.textTheme.bodyMedium,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 12),
                  ],

                  // Stats row
                  Row(
                    children: [
                      _StatChip(
                        icon: Icons.quiz_outlined,
                        label: '${assessment.questionCount} questions',
                      ),
                      const SizedBox(width: 12),
                      _StatChip(
                        icon: Icons.grade_outlined,
                        label: '${assessment.totalPoints.toStringAsFixed(0)} pts',
                      ),
                      if (assessment.settings.timeLimit != null) ...[
                        const SizedBox(width: 12),
                        _StatChip(
                          icon: Icons.timer_outlined,
                          label: '${assessment.settings.timeLimit} min',
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),

            // Actions row
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (assessment.status == AssessmentStatus.draft &&
                      onPublish != null)
                    TextButton.icon(
                      onPressed: onPublish,
                      icon: const Icon(Icons.publish, size: 18),
                      label: const Text('Publish'),
                      style: TextButton.styleFrom(
                        foregroundColor: AivoBrand.success,
                      ),
                    ),
                  if (onDuplicate != null)
                    IconButton(
                      icon: const Icon(Icons.copy_outlined, size: 20),
                      onPressed: onDuplicate,
                      tooltip: 'Duplicate',
                    ),
                  if (onEdit != null)
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, size: 20),
                      onPressed: onEdit,
                      tooltip: 'Edit',
                    ),
                  if (onDelete != null)
                    IconButton(
                      icon: Icon(Icons.delete_outline,
                          size: 20, color: Colors.red[400]),
                      onPressed: onDelete,
                      tooltip: 'Delete',
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(AssessmentStatus status) {
    switch (status) {
      case AssessmentStatus.draft:
        return AivoBrand.warning;
      case AssessmentStatus.published:
        return AivoBrand.success;
      case AssessmentStatus.archived:
        return AivoBrand.gray;
    }
  }

  IconData _getTypeIcon(AssessmentType type) {
    switch (type) {
      case AssessmentType.quiz:
        return Icons.quiz;
      case AssessmentType.test:
        return Icons.assignment;
      case AssessmentType.exam:
        return Icons.school;
      case AssessmentType.practice:
        return Icons.fitness_center;
      case AssessmentType.survey:
        return Icons.poll;
      case AssessmentType.diagnostic:
        return Icons.analytics;
    }
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final AssessmentStatus status;

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (status) {
      AssessmentStatus.draft => (AivoBrand.warning, 'Draft'),
      AssessmentStatus.published => (AivoBrand.success, 'Published'),
      AssessmentStatus.archived => (AivoBrand.gray, 'Archived'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      mainAxisSize: MainAxisSize.min,
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
    );
  }
}
