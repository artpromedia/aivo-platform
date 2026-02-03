/// Subject Bar Chart Widget
///
/// Displays subject-wise performance as bar chart.
library;

import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../../models/analytics.dart';

/// Bar chart for subject performance breakdown.
class SubjectBarChart extends StatefulWidget {
  const SubjectBarChart({
    super.key,
    required this.subjects,
    this.title,
    this.height = 250,
    this.showValues = true,
    this.showGrid = true,
    this.horizontal = false,
    this.barWidth = 20,
    this.onSubjectTap,
    this.selectedSubjectId,
  });

  final List<SubjectPerformance> subjects;
  final String? title;
  final double height;
  final bool showValues;
  final bool showGrid;
  final bool horizontal;
  final double barWidth;
  final void Function(SubjectPerformance)? onSubjectTap;
  final String? selectedSubjectId;

  @override
  State<SubjectBarChart> createState() => _SubjectBarChartState();
}

class _SubjectBarChartState extends State<SubjectBarChart> {
  int touchedIndex = -1;

  @override
  Widget build(BuildContext context) {
    if (widget.subjects.isEmpty) {
      return _buildEmptyState(context);
    }

    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.title != null) ...[
          Text(
            widget.title!,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
        ],
        SizedBox(
          height: widget.height,
          child: widget.horizontal
              ? _buildHorizontalChart(theme)
              : _buildVerticalChart(theme),
        ),
      ],
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      height: widget.height,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.bar_chart,
              size: 48,
              color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 8),
            Text(
              'No subject data available',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVerticalChart(ThemeData theme) {
    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: 100,
        minY: 0,
        barTouchData: BarTouchData(
          enabled: true,
          touchCallback: (event, response) {
            if (event is FlTapUpEvent) {
              if (response != null && response.spot != null) {
                final index = response.spot!.touchedBarGroupIndex;
                if (index >= 0 && index < widget.subjects.length) {
                  widget.onSubjectTap?.call(widget.subjects[index]);
                }
              }
            }
            setState(() {
              touchedIndex = response?.spot?.touchedBarGroupIndex ?? -1;
            });
          },
          touchTooltipData: BarTouchTooltipData(
            getTooltipColor: (_) => theme.colorScheme.surfaceContainerHighest,
            tooltipRoundedRadius: 8,
            tooltipPadding: const EdgeInsets.all(8),
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              final subject = widget.subjects[group.x.toInt()];
              return BarTooltipItem(
                '${subject.subjectName}\n${subject.averageScore.toStringAsFixed(1)}%',
                theme.textTheme.bodySmall!.copyWith(
                  color: theme.colorScheme.onSurface,
                  fontWeight: FontWeight.w600,
                ),
              );
            },
          ),
        ),
        titlesData: _buildVerticalTitles(theme),
        borderData: FlBorderData(show: false),
        gridData: _buildGridData(theme),
        barGroups: _buildBarGroups(theme),
      ),
    );
  }

  Widget _buildHorizontalChart(ThemeData theme) {
    return RotatedBox(
      quarterTurns: 1,
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: 100,
          minY: 0,
          barTouchData: BarTouchData(
            enabled: true,
            touchCallback: (event, response) {
              if (event is FlTapUpEvent &&
                  response != null &&
                  response.spot != null) {
                final index = response.spot!.touchedBarGroupIndex;
                if (index >= 0 && index < widget.subjects.length) {
                  widget.onSubjectTap?.call(widget.subjects[index]);
                }
              }
            },
          ),
          titlesData: _buildHorizontalTitles(theme),
          borderData: FlBorderData(show: false),
          gridData: _buildGridData(theme),
          barGroups: _buildBarGroups(theme),
        ),
      ),
    );
  }

  FlTitlesData _buildVerticalTitles(ThemeData theme) {
    return FlTitlesData(
      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      bottomTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 40,
          getTitlesWidget: (value, meta) {
            final index = value.toInt();
            if (index < 0 || index >= widget.subjects.length) {
              return const SizedBox.shrink();
            }
            return Padding(
              padding: const EdgeInsets.only(top: 8),
              child: RotatedBox(
                quarterTurns: -1,
                child: Text(
                  _truncateLabel(widget.subjects[index].subjectName),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    fontSize: 10,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            );
          },
        ),
      ),
      leftTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 35,
          interval: 25,
          getTitlesWidget: (value, meta) {
            return Text(
              '${value.toInt()}%',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontSize: 10,
              ),
            );
          },
        ),
      ),
    );
  }

  FlTitlesData _buildHorizontalTitles(ThemeData theme) {
    return FlTitlesData(
      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      bottomTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 80,
          getTitlesWidget: (value, meta) {
            final index = value.toInt();
            if (index < 0 || index >= widget.subjects.length) {
              return const SizedBox.shrink();
            }
            return RotatedBox(
              quarterTurns: 3,
              child: Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Text(
                  widget.subjects[index].subjectName,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            );
          },
        ),
      ),
      leftTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 35,
          interval: 25,
          getTitlesWidget: (value, meta) {
            return RotatedBox(
              quarterTurns: 3,
              child: Text(
                '${value.toInt()}%',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  FlGridData _buildGridData(ThemeData theme) {
    if (!widget.showGrid) {
      return const FlGridData(show: false);
    }

    return FlGridData(
      show: true,
      drawVerticalLine: false,
      horizontalInterval: 25,
      getDrawingHorizontalLine: (value) {
        return FlLine(
          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.3),
          strokeWidth: 1,
        );
      },
    );
  }

  List<BarChartGroupData> _buildBarGroups(ThemeData theme) {
    return widget.subjects.asMap().entries.map((entry) {
      final index = entry.key;
      final subject = entry.value;
      final isSelected = subject.subjectId == widget.selectedSubjectId;
      final isTouched = touchedIndex == index;

      final color = _getBarColor(subject, theme);

      return BarChartGroupData(
        x: index,
        barRods: [
          BarChartRodData(
            toY: subject.averageScore,
            color: isTouched || isSelected
                ? color
                : color.withValues(alpha: 0.7),
            width: widget.barWidth,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
            backDrawRodData: BackgroundBarChartRodData(
              show: true,
              toY: 100,
              color: theme.colorScheme.surfaceContainerHighest,
            ),
          ),
        ],
        showingTooltipIndicators: widget.showValues && isTouched ? [0] : [],
      );
    }).toList();
  }

  Color _getBarColor(SubjectPerformance subject, ThemeData theme) {
    if (subject.color != null) {
      try {
        return Color(int.parse(subject.color!.replaceFirst('#', '0xFF')));
      } catch (_) {}
    }

    // Color based on score
    if (subject.averageScore >= 80) {
      return Colors.green;
    } else if (subject.averageScore >= 60) {
      return Colors.amber;
    } else {
      return Colors.red;
    }
  }

  String _truncateLabel(String label) {
    if (label.length <= 8) return label;
    return '${label.substring(0, 6)}...';
  }
}

/// A simple stacked bar showing completion vs total.
class CompletionBar extends StatelessWidget {
  const CompletionBar({
    super.key,
    required this.completed,
    required this.total,
    this.label,
    this.completedColor,
    this.remainingColor,
    this.height = 24,
    this.showPercentage = true,
    this.showNumbers = true,
  });

  final int completed;
  final int total;
  final String? label;
  final Color? completedColor;
  final Color? remainingColor;
  final double height;
  final bool showPercentage;
  final bool showNumbers;

  double get percentage => total > 0 ? (completed / total * 100) : 0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fillColor = completedColor ?? theme.colorScheme.primary;
    final bgColor = remainingColor ??
        theme.colorScheme.surfaceContainerHighest;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label!,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (showNumbers)
                Text(
                  '$completed / $total',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
        ],
        Stack(
          children: [
            Container(
              height: height,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(height / 2),
              ),
            ),
            FractionallySizedBox(
              widthFactor: (percentage / 100).clamp(0.0, 1.0),
              child: Container(
                height: height,
                decoration: BoxDecoration(
                  color: fillColor,
                  borderRadius: BorderRadius.circular(height / 2),
                ),
                child: showPercentage && percentage > 15
                    ? Center(
                        child: Text(
                          '${percentage.toStringAsFixed(0)}%',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: height * 0.45,
                          ),
                        ),
                      )
                    : null,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
