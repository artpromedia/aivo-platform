/// Student Engagement Tile Widget
///
/// Tile displaying individual student engagement summary.
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../models/analytics.dart';
import 'engagement_gauge.dart';

/// Tile showing student engagement summary.
class StudentEngagementTile extends StatelessWidget {
  const StudentEngagementTile({
    super.key,
    required this.student,
    this.onTap,
    this.compact = false,
  });

  final StudentEngagement student;
  final VoidCallback? onTap;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final levelColor = _getLevelColor(student.engagementLevel);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: compact
            ? _buildCompactContent(theme, levelColor)
            : _buildFullContent(theme, levelColor),
      ),
    );
  }

  Widget _buildCompactContent(ThemeData theme, Color levelColor) {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          // Avatar with engagement indicator
          Stack(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: theme.colorScheme.primaryContainer,
                child: Text(
                  student.studentName.isNotEmpty
                      ? student.studentName[0].toUpperCase()
                      : '?',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: levelColor,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),
          // Name and level
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
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 1,
                      ),
                      decoration: BoxDecoration(
                        color: levelColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        student.engagementLevel.label,
                        style: TextStyle(
                          fontSize: 10,
                          color: levelColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    if (student.isAtRisk) ...[
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.warning_amber,
                        size: 14,
                        color: AivoBrand.warning,
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          // Trend indicator
          _buildTrendIndicator(theme),
          const SizedBox(width: 8),
          // Score
          Text(
            '${(student.engagementScore ?? student.metrics.overallScore * 100).round()}%',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: levelColor,
            ),
          ),
          const Icon(Icons.chevron_right, color: Colors.grey),
        ],
      ),
    );
  }

  Widget _buildFullContent(ThemeData theme, Color levelColor) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: theme.colorScheme.primaryContainer,
                child: Text(
                  student.studentName.isNotEmpty
                      ? student.studentName[0].toUpperCase()
                      : '?',
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          student.studentName,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (student.isAtRisk) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AivoBrand.warning.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.warning_amber,
                                  size: 12,
                                  color: AivoBrand.warning,
                                ),
                                SizedBox(width: 2),
                                Text(
                                  'At Risk',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: AivoBrand.warning,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    _buildEngagementLevelChip(levelColor),
                  ],
                ),
              ),
              MiniEngagementGauge(
                value: student.engagementScore ?? student.metrics.overallScore,
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Metrics row
          Row(
            children: [
              _buildMetricCard(
                Icons.schedule,
                '${student.metrics.avgSessionDuration.round()}m',
                'Avg Session',
                theme,
              ),
              _buildMetricCard(
                Icons.touch_app,
                '${(student.metrics.interactionRate * 100).round()}%',
                'Interaction',
                theme,
              ),
              _buildMetricCard(
                Icons.check_circle_outline,
                '${(student.metrics.completionRate * 100).round()}%',
                'Completion',
                theme,
              ),
              _buildTrendCard(theme),
            ],
          ),
          if (student.riskFactors.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 4,
              runSpacing: 4,
              children: student.riskFactors.take(3).map((factor) {
                return Chip(
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  label: Text(
                    factor,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AivoBrand.warning,
                    ),
                  ),
                  backgroundColor: AivoBrand.warning.withValues(alpha: 0.1),
                  side: BorderSide.none,
                  padding: EdgeInsets.zero,
                  visualDensity: VisualDensity.compact,
                );
              }).toList(),
            ),
          ],
          if (student.lastActive != null) ...[
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
                  'Last active ${_formatRelativeTime(student.lastActive!)}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEngagementLevelChip(Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        student.engagementLevel.label,
        style: TextStyle(
          fontSize: 11,
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildMetricCard(
    IconData icon,
    String value,
    String label,
    ThemeData theme,
  ) {
    return Expanded(
      child: Column(
        children: [
          Icon(
            icon,
            size: 16,
            color: theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrendCard(ThemeData theme) {
    return Expanded(
      child: Column(
        children: [
          _buildTrendIndicator(theme),
          const SizedBox(height: 4),
          Text(
            '${student.trend.percentChange.abs().toStringAsFixed(0)}%',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            'Trend',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrendIndicator(ThemeData theme) {
    final trend = student.trend;
    IconData icon;
    Color color;

    switch (trend.direction) {
      case TrendDirection.increasing:
        icon = Icons.trending_up;
        color = AivoBrand.success;
        break;
      case TrendDirection.decreasing:
        icon = Icons.trending_down;
        color = AivoBrand.error;
        break;
      case TrendDirection.stable:
        icon = Icons.trending_flat;
        color = theme.colorScheme.onSurfaceVariant;
        break;
    }

    return Icon(icon, size: 20, color: color);
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

/// List of student engagement tiles.
class StudentEngagementList extends StatelessWidget {
  const StudentEngagementList({
    super.key,
    required this.students,
    this.onStudentTap,
    this.compact = true,
  });

  final List<StudentEngagement> students;
  final void Function(StudentEngagement)? onStudentTap;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    if (students.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text(
            'No student engagement data',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: students.length,
      itemBuilder: (context, index) {
        return StudentEngagementTile(
          student: students[index],
          compact: compact,
          onTap:
              onStudentTap != null ? () => onStudentTap!(students[index]) : null,
        );
      },
    );
  }
}
