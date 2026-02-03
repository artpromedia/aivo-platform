/// Student Ranking List Widget
///
/// Displays ranked list of students with their performance.
library;

import 'package:flutter/material.dart';

import '../../../models/analytics.dart';

/// List widget showing student rankings.
class StudentRankingList extends StatelessWidget {
  const StudentRankingList({
    super.key,
    required this.students,
    this.title,
    this.showRank = true,
    this.showTrend = true,
    this.showGrade = true,
    this.maxVisible,
    this.onStudentTap,
    this.onViewAll,
    this.emptyMessage = 'No students to display',
    this.highlightTopN = 3,
    this.isTopPerformers = true,
  });

  final List<StudentAnalyticsProfile> students;
  final String? title;
  final bool showRank;
  final bool showTrend;
  final bool showGrade;
  final int? maxVisible;
  final void Function(StudentAnalyticsProfile)? onStudentTap;
  final VoidCallback? onViewAll;
  final String emptyMessage;
  final int highlightTopN;
  final bool isTopPerformers;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final displayStudents = maxVisible != null
        ? students.take(maxVisible!).toList()
        : students;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title!,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (onViewAll != null && students.length > (maxVisible ?? 0))
                TextButton(
                  onPressed: onViewAll,
                  child: const Text('View All'),
                ),
            ],
          ),
          const SizedBox(height: 12),
        ],
        if (displayStudents.isEmpty)
          _buildEmptyState(theme)
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: displayStudents.length,
            separatorBuilder: (context, index) => const Divider(height: 1),
            itemBuilder: (context, index) {
              return _StudentRankingTile(
                student: displayStudents[index],
                rank: index + 1,
                showRank: showRank,
                showTrend: showTrend,
                showGrade: showGrade,
                isHighlighted: index < highlightTopN,
                isTopPerformer: isTopPerformers,
                onTap: onStudentTap != null
                    ? () => onStudentTap!(displayStudents[index])
                    : null,
              );
            },
          ),
      ],
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.people_outline,
              size: 40,
              color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 8),
            Text(
              emptyMessage,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StudentRankingTile extends StatelessWidget {
  const _StudentRankingTile({
    required this.student,
    required this.rank,
    this.showRank = true,
    this.showTrend = true,
    this.showGrade = true,
    this.isHighlighted = false,
    this.isTopPerformer = true,
    this.onTap,
  });

  final StudentAnalyticsProfile student;
  final int rank;
  final bool showRank;
  final bool showTrend;
  final bool showGrade;
  final bool isHighlighted;
  final bool isTopPerformer;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      leading: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showRank) ...[
            _buildRankBadge(theme),
            const SizedBox(width: 8),
          ],
          _buildAvatar(theme),
        ],
      ),
      title: Text(
        student.studentName,
        style: theme.textTheme.bodyMedium?.copyWith(
          fontWeight: FontWeight.w500,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: _buildSubtitle(theme),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showGrade) _buildGradeBadge(theme),
          if (showTrend) ...[
            const SizedBox(width: 8),
            _buildTrendIndicator(theme),
          ],
        ],
      ),
    );
  }

  Widget _buildRankBadge(ThemeData theme) {
    Color badgeColor;
    if (isHighlighted && isTopPerformer) {
      switch (rank) {
        case 1:
          badgeColor = Colors.amber;
          break;
        case 2:
          badgeColor = Colors.grey.shade400;
          break;
        case 3:
          badgeColor = Colors.brown.shade300;
          break;
        default:
          badgeColor = theme.colorScheme.surfaceContainerHighest;
      }
    } else if (isHighlighted && !isTopPerformer) {
      badgeColor = Colors.red.shade100;
    } else {
      badgeColor = theme.colorScheme.surfaceContainerHighest;
    }

    return Container(
      width: 28,
      height: 28,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: badgeColor,
        shape: BoxShape.circle,
      ),
      child: Text(
        rank.toString(),
        style: theme.textTheme.bodySmall?.copyWith(
          fontWeight: FontWeight.bold,
          color: isHighlighted && isTopPerformer && rank <= 3
              ? Colors.black87
              : theme.colorScheme.onSurface,
        ),
      ),
    );
  }

  Widget _buildAvatar(ThemeData theme) {
    return CircleAvatar(
      radius: 20,
      backgroundColor: theme.colorScheme.primaryContainer,
      backgroundImage:
          student.avatarUrl != null ? NetworkImage(student.avatarUrl!) : null,
      child: student.avatarUrl == null
          ? Text(
              _getInitials(student.studentName),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onPrimaryContainer,
                fontWeight: FontWeight.w600,
              ),
            )
          : null,
    );
  }

  Widget _buildSubtitle(ThemeData theme) {
    final items = <String>[];

    if (student.engagementScore > 0) {
      items.add('${(student.engagementScore * 100).toInt()}% engaged');
    }

    if (student.attendanceRate > 0) {
      items.add('${(student.attendanceRate * 100).toInt()}% attendance');
    }

    if (items.isEmpty && student.strengthAreas.isNotEmpty) {
      items.add('Strong in: ${student.strengthAreas.first}');
    }

    if (items.isEmpty && student.improvementAreas.isNotEmpty) {
      items.add('Needs help: ${student.improvementAreas.first}');
    }

    return Text(
      items.isEmpty ? 'Grade ${student.gradeLevel}' : items.join(' • '),
      style: theme.textTheme.bodySmall?.copyWith(
        color: theme.colorScheme.onSurfaceVariant,
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }

  Widget _buildGradeBadge(ThemeData theme) {
    Color gradeColor;
    if (student.overallGrade >= 90) {
      gradeColor = Colors.green;
    } else if (student.overallGrade >= 80) {
      gradeColor = Colors.lightGreen;
    } else if (student.overallGrade >= 70) {
      gradeColor = Colors.amber;
    } else if (student.overallGrade >= 60) {
      gradeColor = Colors.orange;
    } else {
      gradeColor = Colors.red;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: gradeColor.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        '${student.overallGrade.toStringAsFixed(0)}%',
        style: theme.textTheme.bodySmall?.copyWith(
          color: gradeColor,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildTrendIndicator(ThemeData theme) {
    IconData icon;
    Color color;

    switch (student.trend) {
      case TrendDirection.increasing:
        icon = Icons.trending_up;
        color = Colors.green;
        break;
      case TrendDirection.decreasing:
        icon = Icons.trending_down;
        color = Colors.red;
        break;
      case TrendDirection.stable:
        icon = Icons.trending_flat;
        color = theme.colorScheme.onSurfaceVariant;
        break;
    }

    return Icon(icon, size: 20, color: color);
  }

  String _getInitials(String name) {
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.substring(0, 1).toUpperCase();
  }
}

/// Compact student chip for displaying in rows.
class StudentChip extends StatelessWidget {
  const StudentChip({
    super.key,
    required this.student,
    this.onTap,
    this.showGrade = true,
    this.showTrend = false,
  });

  final StudentAnalyticsProfile student;
  final VoidCallback? onTap;
  final bool showGrade;
  final bool showTrend;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ActionChip(
      onPressed: onTap,
      avatar: CircleAvatar(
        radius: 12,
        backgroundColor: theme.colorScheme.primaryContainer,
        backgroundImage:
            student.avatarUrl != null ? NetworkImage(student.avatarUrl!) : null,
        child: student.avatarUrl == null
            ? Text(
                student.studentName.substring(0, 1).toUpperCase(),
                style: const TextStyle(fontSize: 10),
              )
            : null,
      ),
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(student.studentName.split(' ').first),
          if (showGrade) ...[
            const SizedBox(width: 4),
            Text(
              '${student.overallGrade.toStringAsFixed(0)}%',
              style: theme.textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
          if (showTrend) ...[
            const SizedBox(width: 4),
            Icon(
              student.trend == TrendDirection.increasing
                  ? Icons.arrow_upward
                  : student.trend == TrendDirection.decreasing
                      ? Icons.arrow_downward
                      : Icons.remove,
              size: 12,
              color: student.trend == TrendDirection.increasing
                  ? Colors.green
                  : student.trend == TrendDirection.decreasing
                      ? Colors.red
                      : null,
            ),
          ],
        ],
      ),
    );
  }
}
