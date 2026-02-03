/// Intervention Progress Indicator Widget
///
/// Visual indicators for intervention progress.
library;

import 'package:flutter/material.dart';

import '../models/intervention_history.dart';

/// Progress chart for an intervention.
class InterventionProgressChart extends StatelessWidget {
  const InterventionProgressChart({
    super.key,
    required this.progressHistory,
    this.height = 100,
  });

  final List<InterventionProgress> progressHistory;
  final double height;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (progressHistory.isEmpty) {
      return SizedBox(
        height: height,
        child: Center(
          child: Text(
            'No progress data yet',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      );
    }

    return SizedBox(
      height: height,
      child: CustomPaint(
        size: Size(double.infinity, height),
        painter: _ProgressChartPainter(
          progress: progressHistory,
          lineColor: theme.colorScheme.primary,
          backgroundColor: theme.colorScheme.surfaceContainerHighest,
        ),
      ),
    );
  }
}

class _ProgressChartPainter extends CustomPainter {
  _ProgressChartPainter({
    required this.progress,
    required this.lineColor,
    required this.backgroundColor,
  });

  final List<InterventionProgress> progress;
  final Color lineColor;
  final Color backgroundColor;

  @override
  void paint(Canvas canvas, Size size) {
    if (progress.isEmpty) return;

    final padding = 8.0;
    final chartWidth = size.width - padding * 2;
    final chartHeight = size.height - padding * 2;

    // Draw background line
    final bgPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4;

    canvas.drawLine(
      Offset(padding, size.height - padding),
      Offset(size.width - padding, size.height - padding),
      bgPaint,
    );

    // Draw progress line
    final linePaint = Paint()
      ..color = lineColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    final path = Path();
    for (var i = 0; i < progress.length; i++) {
      final x = padding + (i / (progress.length - 1)) * chartWidth;
      final y = padding + chartHeight - (progress[i].progressValue * chartHeight);

      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    canvas.drawPath(path, linePaint);

    // Draw points
    final pointPaint = Paint()
      ..color = lineColor
      ..style = PaintingStyle.fill;

    for (var i = 0; i < progress.length; i++) {
      final x = padding + (i / (progress.length - 1)) * chartWidth;
      final y = padding + chartHeight - (progress[i].progressValue * chartHeight);
      canvas.drawCircle(Offset(x, y), 4, pointPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Simple progress bar for intervention.
class InterventionProgressBar extends StatelessWidget {
  const InterventionProgressBar({
    super.key,
    required this.progress,
    this.height = 8,
    this.showLabel = true,
  });

  final double progress;
  final double height;
  final bool showLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _getProgressColor(progress);

    return Row(
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(height / 2),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: height,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
        ),
        if (showLabel) ...[
          const SizedBox(width: 8),
          Text(
            '${(progress * 100).round()}%',
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ],
    );
  }

  Color _getProgressColor(double progress) {
    if (progress >= 0.8) return Colors.green;
    if (progress >= 0.5) return Colors.blue;
    if (progress >= 0.3) return Colors.orange;
    return Colors.red;
  }
}

/// Circular progress indicator for intervention.
class InterventionCircularProgress extends StatelessWidget {
  const InterventionCircularProgress({
    super.key,
    required this.progress,
    this.size = 60,
  });

  final double progress;
  final double size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _getProgressColor(progress);

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CircularProgressIndicator(
            value: progress,
            strokeWidth: 4,
            backgroundColor: theme.colorScheme.surfaceContainerHighest,
            valueColor: AlwaysStoppedAnimation(color),
          ),
          Text(
            '${(progress * 100).round()}%',
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Color _getProgressColor(double progress) {
    if (progress >= 0.8) return Colors.green;
    if (progress >= 0.5) return Colors.blue;
    if (progress >= 0.3) return Colors.orange;
    return Colors.red;
  }
}
