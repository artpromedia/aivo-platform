/// At-Risk Students Alert Card
/// Dashboard widget showing students requiring attention
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../models/risk_prediction.dart';
import '../../../providers/risk_provider.dart';
import '../../risk/widgets/risk_level_badge.dart';

/// Dashboard card showing at-risk student alerts
class AtRiskAlertCard extends ConsumerWidget {
  const AtRiskAlertCard({
    super.key,
    required this.onViewAll,
    this.onStudentTap,
    this.maxStudents = 3,
  });

  final VoidCallback onViewAll;
  final void Function(EarlyWarningStudent student)? onStudentTap;
  final int maxStudents;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(classroomRiskProvider);
    final criticalStudents = ref.watch(criticalStudentsProvider);
    final needingAttention = ref.watch(studentsNeedingAttentionProvider);
    final theme = Theme.of(context);

    // Show loading state
    if (state.isLoading && !state.hasData) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(width: 12),
              Text(
                'Loading risk data...',
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ),
        ),
      );
    }

    // No at-risk students
    if (needingAttention.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AivoBrand.success.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.check_circle,
                  color: AivoBrand.success,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'All Students On Track',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      'No students require immediate attention',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: onViewAll,
                child: const Text('View All'),
              ),
            ],
          ),
        ),
      );
    }

    // Has at-risk students
    final hasCritical = criticalStudents.isNotEmpty;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Alert header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: hasCritical
                    ? [
                        RiskLevelColors.critical,
                        RiskLevelColors.critical.withOpacity(0.8),
                      ]
                    : [
                        RiskLevelColors.atRisk,
                        RiskLevelColors.atRisk.withOpacity(0.8),
                      ],
              ),
            ),
            child: Row(
              children: [
                Icon(
                  hasCritical ? Icons.error : Icons.warning_amber,
                  color: Colors.white,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        hasCritical ? 'Critical Alert' : 'Students Need Attention',
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '${needingAttention.length} student${needingAttention.length != 1 ? 's' : ''} requiring attention',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.white.withOpacity(0.9),
                        ),
                      ),
                    ],
                  ),
                ),
                FilledButton.tonal(
                  onPressed: onViewAll,
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white.withOpacity(0.2),
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('View All'),
                ),
              ],
            ),
          ),

          // Student list
          ...needingAttention.take(maxStudents).map((student) {
            return _StudentListItem(
              student: student,
              onTap: onStudentTap != null ? () => onStudentTap!(student) : null,
            );
          }),

          // View more indicator
          if (needingAttention.length > maxStudents)
            InkWell(
              onTap: onViewAll,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '+${needingAttention.length - maxStudents} more students',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Icon(
                      Icons.arrow_forward,
                      size: 16,
                      color: theme.colorScheme.primary,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Individual student list item
class _StudentListItem extends StatelessWidget {
  const _StudentListItem({
    required this.student,
    this.onTap,
  });

  final EarlyWarningStudent student;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final riskColor = RiskLevelColors.forLevel(student.riskLevel);

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            // Avatar
            CircleAvatar(
              radius: 20,
              backgroundColor: riskColor.withOpacity(0.1),
              child: Text(
                _getInitials(student.studentName),
                style: TextStyle(
                  color: riskColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Name and status
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    student.studentName,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      RiskLevelBadge(
                        level: student.riskLevel,
                        size: RiskBadgeSize.small,
                      ),
                      if (student.daysAtRisk > 0) ...[
                        const SizedBox(width: 8),
                        Text(
                          '${student.daysAtRisk}d at risk',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            // Risk score
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${student.riskScorePercent}%',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: riskColor,
                  ),
                ),
                if (student.primaryRiskFactors.isNotEmpty)
                  Text(
                    student.primaryRiskFactors.first.feature,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      fontSize: 10,
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 8),
            Icon(
              Icons.chevron_right,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ],
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }
}

/// Compact at-risk badge for use in other cards
class AtRiskBadge extends StatelessWidget {
  const AtRiskBadge({
    super.key,
    required this.count,
    this.onTap,
    this.showZero = false,
  });

  final int count;
  final VoidCallback? onTap;
  final bool showZero;

  @override
  Widget build(BuildContext context) {
    if (count == 0 && !showZero) {
      return const SizedBox.shrink();
    }

    final color = count > 0 ? RiskLevelColors.atRisk : AivoBrand.success;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              count > 0 ? Icons.warning_amber : Icons.check_circle,
              size: 16,
              color: color,
            ),
            const SizedBox(width: 4),
            Text(
              count > 0 ? '$count at risk' : 'All on track',
              style: TextStyle(
                fontSize: 12,
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Mini risk overview for dashboard header
class RiskOverviewMini extends ConsumerWidget {
  const RiskOverviewMini({
    super.key,
    this.onTap,
  });

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(classroomRiskProvider);
    final theme = Theme.of(context);

    if (state.isLoading && !state.hasData) {
      return const SizedBox.shrink();
    }

    final critical = state.earlyWarningReport?.criticalStudents.length ?? 0;
    final atRisk = state.earlyWarningReport?.atRiskStudents.length ?? 0;
    final total = critical + atRisk;

    if (total == 0) {
      return const SizedBox.shrink();
    }

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: (critical > 0 ? RiskLevelColors.critical : RiskLevelColors.atRisk)
              .withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              critical > 0 ? Icons.error : Icons.warning_amber,
              size: 18,
              color: critical > 0 ? RiskLevelColors.critical : RiskLevelColors.atRisk,
            ),
            const SizedBox(width: 6),
            Text(
              '$total',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: critical > 0 ? RiskLevelColors.critical : RiskLevelColors.atRisk,
              ),
            ),
            const SizedBox(width: 4),
            Text(
              'at risk',
              style: theme.textTheme.bodySmall?.copyWith(
                color: critical > 0 ? RiskLevelColors.critical : RiskLevelColors.atRisk,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
