/// Disengaged Alert Card Widget
///
/// Card displaying alerts for disengaged students.
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../models/analytics.dart';

/// Card showing a disengagement alert with actions.
class DisengagedAlertCard extends StatelessWidget {
  const DisengagedAlertCard({
    super.key,
    required this.alert,
    this.onTap,
    this.onResolve,
    this.compact = false,
  });

  final EngagementAlert alert;
  final VoidCallback? onTap;
  final VoidCallback? onResolve;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final severityColor = _getSeverityColor(alert.severity);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              left: BorderSide(
                color: severityColor,
                width: 4,
              ),
            ),
          ),
          padding: const EdgeInsets.all(12),
          child: compact ? _buildCompactContent(theme) : _buildFullContent(theme),
        ),
      ),
    );
  }

  Widget _buildCompactContent(ThemeData theme) {
    return Row(
      children: [
        _buildSeverityIcon(),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                alert.studentName,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                alert.alertType.label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        if (alert.engagementLevel != null)
          _EngagementLevelChip(level: alert.engagementLevel!),
        const Icon(Icons.chevron_right, color: Colors.grey),
      ],
    );
  }

  Widget _buildFullContent(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _buildSeverityIcon(),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        alert.studentName,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      if (alert.engagementLevel != null)
                        _EngagementLevelChip(level: alert.engagementLevel!),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    alert.alertType.label,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: _getSeverityColor(alert.severity),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          alert.message,
          style: theme.textTheme.bodyMedium,
        ),
        if (alert.suggestedActions.isNotEmpty) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: alert.suggestedActions.take(2).map((action) {
              return Chip(
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                label: Text(
                  action,
                  style: theme.textTheme.bodySmall,
                ),
                padding: EdgeInsets.zero,
                visualDensity: VisualDensity.compact,
              );
            }).toList(),
          ),
        ],
        const SizedBox(height: 8),
        Row(
          children: [
            Icon(
              Icons.access_time,
              size: 14,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: 4),
            Text(
              _formatRelativeTime(alert.createdAt),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const Spacer(),
            if (onResolve != null && !alert.isResolved)
              TextButton.icon(
                onPressed: onResolve,
                icon: const Icon(Icons.check, size: 16),
                label: const Text('Resolve'),
                style: TextButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                ),
              ),
            if (onTap != null)
              TextButton.icon(
                onPressed: onTap,
                icon: const Icon(Icons.person, size: 16),
                label: const Text('View'),
                style: TextButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildSeverityIcon() {
    final color = _getSeverityColor(alert.severity);
    final icon = _getSeverityIcon(alert.severity);

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: color, size: 20),
    );
  }

  Color _getSeverityColor(AlertSeverity severity) {
    switch (severity) {
      case AlertSeverity.low:
        return Colors.blue;
      case AlertSeverity.medium:
        return AivoBrand.warning;
      case AlertSeverity.high:
        return Colors.orange;
      case AlertSeverity.critical:
        return AivoBrand.error;
    }
  }

  IconData _getSeverityIcon(AlertSeverity severity) {
    switch (severity) {
      case AlertSeverity.low:
        return Icons.info_outline;
      case AlertSeverity.medium:
        return Icons.warning_amber;
      case AlertSeverity.high:
        return Icons.warning;
      case AlertSeverity.critical:
        return Icons.error;
    }
  }

  String _formatRelativeTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return 'just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else {
      return '${difference.inDays}d ago';
    }
  }
}

/// Chip showing engagement level.
class _EngagementLevelChip extends StatelessWidget {
  const _EngagementLevelChip({required this.level});

  final EngagementLevel level;

  @override
  Widget build(BuildContext context) {
    final color = _getLevelColor(level);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        level.label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Color _getLevelColor(EngagementLevel level) {
    switch (level) {
      case EngagementLevel.low:
        return AivoBrand.error;
      case EngagementLevel.medium:
        return AivoBrand.warning;
      case EngagementLevel.high:
        return AivoBrand.success;
      case EngagementLevel.exceptional:
        return Colors.blue;
    }
  }
}

/// Summary banner for multiple alerts.
class EngagementAlertsBanner extends StatelessWidget {
  const EngagementAlertsBanner({
    super.key,
    required this.alertCount,
    required this.criticalCount,
    this.onTap,
  });

  final int alertCount;
  final int criticalCount;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasCritical = criticalCount > 0;
    final color = hasCritical ? AivoBrand.error : AivoBrand.warning;

    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(
                  hasCritical ? Icons.error : Icons.warning_amber,
                  color: color,
                  size: 28,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$alertCount students need attention',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: color,
                        ),
                      ),
                      if (hasCritical)
                        Text(
                          '$criticalCount critical',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AivoBrand.error,
                          ),
                        ),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_forward,
                  color: color,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
