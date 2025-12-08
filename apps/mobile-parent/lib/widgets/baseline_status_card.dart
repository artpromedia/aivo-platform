import 'package:flutter/material.dart';
import 'package:flutter_common/flutter_common.dart';

/// Card showing baseline assessment status for a child.
/// Displays status and appropriate CTA button based on current state.
class BaselineStatusCard extends StatelessWidget {
  const BaselineStatusCard({
    super.key,
    required this.learner,
    required this.profile,
    required this.onStart,
    required this.onResume,
    required this.onViewResults,
    this.isLoading = false,
  });

  final Learner learner;
  final BaselineProfile? profile;
  final VoidCallback onStart;
  final VoidCallback onResume;
  final VoidCallback onViewResults;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = profile?.status ?? BaselineProfileStatus.notStarted;
    final hasProfile = profile != null;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with child name
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                  child: Text(
                    learner.name.isNotEmpty ? learner.name[0].toUpperCase() : '?',
                    style: TextStyle(
                      color: theme.colorScheme.primary,
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
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        learner.grade != null ? 'Grade ${learner.grade}' : 'Grade not set',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                _StatusChip(status: status, hasProfile: hasProfile),
              ],
            ),
            const SizedBox(height: 16),

            // Status message
            Text(
              _statusMessage(status, hasProfile),
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),

            // CTA button
            SizedBox(
              width: double.infinity,
              child: _buildCtaButton(context, status, hasProfile),
            ),
          ],
        ),
      ),
    );
  }

  String _statusMessage(BaselineProfileStatus status, bool hasProfile) {
    if (!hasProfile) {
      return 'No baseline assessment set up yet. Please add consent to get started.';
    }

    switch (status) {
      case BaselineProfileStatus.notStarted:
        return 'Ready to begin! The baseline assessment helps us understand your child\'s learning needs.';
      case BaselineProfileStatus.inProgress:
        return 'Assessment in progress. Your child can continue where they left off.';
      case BaselineProfileStatus.completed:
        return 'Assessment complete! Review the results and decide if you\'d like to accept or request a retest.';
      case BaselineProfileStatus.retestAllowed:
        return 'A retest has been requested. Your child can retake the assessment.';
      case BaselineProfileStatus.finalAccepted:
        return 'Results accepted! Your child\'s personalized learning journey can begin.';
    }
  }

  Widget _buildCtaButton(
    BuildContext context,
    BaselineProfileStatus status,
    bool hasProfile,
  ) {
    if (isLoading) {
      return const FilledButton(
        onPressed: null,
        child: SizedBox(
          height: 20,
          width: 20,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

    if (!hasProfile) {
      return FilledButton.tonal(
        onPressed: null,
        style: FilledButton.styleFrom(
          minimumSize: const Size(double.infinity, 48),
        ),
        child: const Text('Set Up Required'),
      );
    }

    switch (status) {
      case BaselineProfileStatus.notStarted:
        return FilledButton.icon(
          onPressed: onStart,
          icon: const Icon(Icons.play_arrow),
          label: const Text('Start Baseline'),
          style: FilledButton.styleFrom(
            minimumSize: const Size(double.infinity, 48),
          ),
        );
      case BaselineProfileStatus.inProgress:
        return FilledButton.icon(
          onPressed: onResume,
          icon: const Icon(Icons.play_circle_outline),
          label: const Text('Resume Baseline'),
          style: FilledButton.styleFrom(
            minimumSize: const Size(double.infinity, 48),
          ),
        );
      case BaselineProfileStatus.retestAllowed:
        return FilledButton.icon(
          onPressed: onStart,
          icon: const Icon(Icons.refresh),
          label: const Text('Start Retest'),
          style: FilledButton.styleFrom(
            minimumSize: const Size(double.infinity, 48),
          ),
        );
      case BaselineProfileStatus.completed:
      case BaselineProfileStatus.finalAccepted:
        return FilledButton.icon(
          onPressed: onViewResults,
          icon: const Icon(Icons.assessment),
          label: const Text('View Results'),
          style: FilledButton.styleFrom(
            minimumSize: const Size(double.infinity, 48),
          ),
        );
    }
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({
    required this.status,
    required this.hasProfile,
  });

  final BaselineProfileStatus status;
  final bool hasProfile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Color chipColor;
    Color textColor;
    String label;
    IconData icon;

    if (!hasProfile) {
      chipColor = theme.colorScheme.surfaceContainerHighest;
      textColor = theme.colorScheme.onSurfaceVariant;
      label = 'Not Set Up';
      icon = Icons.pending_outlined;
    } else {
      switch (status) {
        case BaselineProfileStatus.notStarted:
          chipColor = theme.colorScheme.secondaryContainer;
          textColor = theme.colorScheme.onSecondaryContainer;
          label = 'Ready';
          icon = Icons.schedule;
        case BaselineProfileStatus.inProgress:
          chipColor = theme.colorScheme.primaryContainer;
          textColor = theme.colorScheme.onPrimaryContainer;
          label = 'In Progress';
          icon = Icons.hourglass_top;
        case BaselineProfileStatus.completed:
          chipColor = theme.colorScheme.tertiaryContainer;
          textColor = theme.colorScheme.onTertiaryContainer;
          label = 'Review Needed';
          icon = Icons.fact_check_outlined;
        case BaselineProfileStatus.retestAllowed:
          chipColor = theme.colorScheme.errorContainer;
          textColor = theme.colorScheme.onErrorContainer;
          label = 'Retest';
          icon = Icons.replay;
        case BaselineProfileStatus.finalAccepted:
          chipColor = Colors.green.shade100;
          textColor = Colors.green.shade800;
          label = 'Accepted';
          icon = Icons.check_circle;
      }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: chipColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: textColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: textColor,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
