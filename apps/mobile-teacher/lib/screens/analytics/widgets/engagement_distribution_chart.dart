/// Engagement Distribution Chart Widget
///
/// A pie chart showing distribution of engagement levels.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../models/analytics.dart';

/// Pie chart showing engagement level distribution.
class EngagementDistributionChart extends StatelessWidget {
  const EngagementDistributionChart({
    super.key,
    required this.distribution,
    this.size = 200,
    this.showLegend = true,
    this.animate = true,
  });

  final EngagementDistribution distribution;
  final double size;
  final bool showLegend;
  final bool animate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (distribution.total == 0) {
      return SizedBox(
        width: size,
        height: size,
        child: Center(
          child: Text(
            'No data',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: size,
          height: size,
          child: animate
              ? TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: 1),
                  duration: const Duration(milliseconds: 800),
                  curve: Curves.easeOutCubic,
                  builder: (context, animatedValue, child) {
                    return CustomPaint(
                      size: Size(size, size),
                      painter: _PieChartPainter(
                        distribution: distribution,
                        animationValue: animatedValue,
                      ),
                    );
                  },
                )
              : CustomPaint(
                  size: Size(size, size),
                  painter: _PieChartPainter(
                    distribution: distribution,
                    animationValue: 1.0,
                  ),
                ),
        ),
        if (showLegend) ...[
          const SizedBox(height: 16),
          _buildLegend(context),
        ],
      ],
    );
  }

  Widget _buildLegend(BuildContext context) {
    // ignore: unused_local_variable
    final theme = Theme.of(context);

    return Wrap(
      spacing: 16,
      runSpacing: 8,
      alignment: WrapAlignment.center,
      children: [
        _LegendItem(
          color: _getLevelColor(EngagementLevel.exceptional),
          label: 'Exceptional',
          count: distribution.exceptional,
          percent: distribution.exceptionalPercent,
        ),
        _LegendItem(
          color: _getLevelColor(EngagementLevel.high),
          label: 'High',
          count: distribution.high,
          percent: distribution.highPercent,
        ),
        _LegendItem(
          color: _getLevelColor(EngagementLevel.medium),
          label: 'Medium',
          count: distribution.medium,
          percent: distribution.mediumPercent,
        ),
        _LegendItem(
          color: _getLevelColor(EngagementLevel.low),
          label: 'Low',
          count: distribution.low,
          percent: distribution.lowPercent,
        ),
      ],
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

/// Legend item for the chart.
class _LegendItem extends StatelessWidget {
  const _LegendItem({
    required this.color,
    required this.label,
    required this.count,
    required this.percent,
  });

  final Color color;
  final String label;
  final int count;
  final double percent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          '$label: $count (${percent.toStringAsFixed(0)}%)',
          style: theme.textTheme.bodySmall,
        ),
      ],
    );
  }
}

/// Custom painter for the pie chart.
class _PieChartPainter extends CustomPainter {
  _PieChartPainter({
    required this.distribution,
    required this.animationValue,
  });

  final EngagementDistribution distribution;
  final double animationValue;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 10;

    // Calculate angles for each segment
    final total = distribution.total;
    if (total == 0) return;

    final segments = [
      _ChartSegment(
        value: distribution.exceptional,
        color: Colors.blue,
      ),
      _ChartSegment(
        value: distribution.high,
        color: AivoBrand.success,
      ),
      _ChartSegment(
        value: distribution.medium,
        color: AivoBrand.warning,
      ),
      _ChartSegment(
        value: distribution.low,
        color: AivoBrand.error,
      ),
    ];

    double startAngle = -math.pi / 2; // Start from top

    for (final segment in segments) {
      if (segment.value == 0) continue;

      final sweepAngle =
          (segment.value / total) * 2 * math.pi * animationValue;

      final paint = Paint()
        ..color = segment.color
        ..style = PaintingStyle.fill;

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        true,
        paint,
      );

      startAngle += sweepAngle;
    }

    // Draw center hole for donut effect
    final holePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, radius * 0.6, holePaint);
  }

  @override
  bool shouldRepaint(covariant _PieChartPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue ||
        oldDelegate.distribution != distribution;
  }
}

class _ChartSegment {
  _ChartSegment({
    required this.value,
    required this.color,
  });

  final int value;
  final Color color;
}

/// Horizontal bar showing engagement distribution.
class EngagementDistributionBar extends StatelessWidget {
  const EngagementDistributionBar({
    super.key,
    required this.distribution,
    this.height = 24,
  });

  final EngagementDistribution distribution;
  final double height;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = distribution.total;

    if (total == 0) {
      return Container(
        height: height,
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(height / 2),
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(height / 2),
      child: SizedBox(
        height: height,
        child: Row(
          children: [
            if (distribution.exceptional > 0)
              Expanded(
                flex: distribution.exceptional,
                child: Container(color: Colors.blue),
              ),
            if (distribution.high > 0)
              Expanded(
                flex: distribution.high,
                child: Container(color: AivoBrand.success),
              ),
            if (distribution.medium > 0)
              Expanded(
                flex: distribution.medium,
                child: Container(color: AivoBrand.warning),
              ),
            if (distribution.low > 0)
              Expanded(
                flex: distribution.low,
                child: Container(color: AivoBrand.error),
              ),
          ],
        ),
      ),
    );
  }
}
