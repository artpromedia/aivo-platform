/// Engagement Timeline Chart Widget
///
/// Line chart showing engagement trends over time.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../models/analytics.dart';

/// Line chart for engagement timeline.
class EngagementTimelineChart extends StatelessWidget {
  const EngagementTimelineChart({
    super.key,
    required this.timeline,
    this.height = 200,
    this.showLabels = true,
    this.granularity = TimelineGranularity.daily,
  });

  final List<EngagementTimelinePoint> timeline;
  final double height;
  final bool showLabels;
  final TimelineGranularity granularity;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (timeline.isEmpty) {
      return SizedBox(
        height: height,
        child: Center(
          child: Text(
            'No timeline data available',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: height,
          child: CustomPaint(
            size: Size(double.infinity, height),
            painter: _TimelineChartPainter(
              timeline: timeline,
              primaryColor: theme.colorScheme.primary,
              gridColor: theme.colorScheme.surfaceContainerHighest,
              textColor: theme.colorScheme.onSurfaceVariant,
              showLabels: showLabels,
            ),
          ),
        ),
        if (showLabels) ...[
          const SizedBox(height: 8),
          _buildDateLabels(context),
        ],
      ],
    );
  }

  Widget _buildDateLabels(BuildContext context) {
    final theme = Theme.of(context);

    if (timeline.isEmpty) return const SizedBox.shrink();

    // Show first, middle, and last dates
    final first = timeline.first;
    final last = timeline.last;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          _formatDate(first.timestamp),
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        if (timeline.length > 2)
          Text(
            _formatDate(timeline[timeline.length ~/ 2].timestamp),
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        Text(
          _formatDate(last.timestamp),
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  String _formatDate(DateTime date) {
    switch (granularity) {
      case TimelineGranularity.hourly:
        return '${date.hour}:00';
      case TimelineGranularity.daily:
        return '${date.month}/${date.day}';
      case TimelineGranularity.weekly:
        return 'W${_weekOfYear(date)}';
      case TimelineGranularity.monthly:
        return _monthName(date.month);
    }
  }

  int _weekOfYear(DateTime date) {
    final firstDayOfYear = DateTime(date.year, 1, 1);
    final dayOfYear = date.difference(firstDayOfYear).inDays + 1;
    return ((dayOfYear - date.weekday + 10) / 7).floor();
  }

  String _monthName(int month) {
    const months = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return months[month];
  }
}

/// Custom painter for the timeline chart.
class _TimelineChartPainter extends CustomPainter {
  _TimelineChartPainter({
    required this.timeline,
    required this.primaryColor,
    required this.gridColor,
    required this.textColor,
    required this.showLabels,
  });

  final List<EngagementTimelinePoint> timeline;
  final Color primaryColor;
  final Color gridColor;
  final Color textColor;
  final bool showLabels;

  @override
  void paint(Canvas canvas, Size size) {
    if (timeline.isEmpty) return;

    final paddingLeft = showLabels ? 32.0 : 8.0;
    const paddingRight = 8.0;
    const paddingTop = 16.0;
    const paddingBottom = 8.0;

    final chartWidth = size.width - paddingLeft - paddingRight;
    final chartHeight = size.height - paddingTop - paddingBottom;

    // Draw grid lines
    _drawGrid(canvas, size, paddingLeft, paddingTop, chartWidth, chartHeight);

    // Draw Y-axis labels
    if (showLabels) {
      _drawYAxisLabels(canvas, paddingLeft, paddingTop, chartHeight);
    }

    // Find min/max values
    double minVal = timeline.map((p) => p.avgEngagement).reduce(math.min);
    double maxVal = timeline.map((p) => p.avgEngagement).reduce(math.max);

    // Add padding to range
    final range = maxVal - minVal;
    if (range < 0.1) {
      minVal = math.max(0, minVal - 0.1);
      maxVal = math.min(1, maxVal + 0.1);
    }

    // Calculate points
    final points = <Offset>[];
    for (var i = 0; i < timeline.length; i++) {
      final x = paddingLeft + (i / (timeline.length - 1)) * chartWidth;
      final normalizedY = maxVal > minVal
          ? (timeline[i].avgEngagement - minVal) / (maxVal - minVal)
          : 0.5;
      final y = paddingTop + chartHeight - (normalizedY * chartHeight);
      points.add(Offset(x, y));
    }

    // Draw area under line
    _drawArea(canvas, points, paddingTop, chartHeight, paddingLeft, chartWidth);

    // Draw line
    _drawLine(canvas, points);

    // Draw points
    _drawPoints(canvas, points);
  }

  void _drawGrid(Canvas canvas, Size size, double paddingLeft,
      double paddingTop, double chartWidth, double chartHeight) {
    final gridPaint = Paint()
      ..color = gridColor
      ..strokeWidth = 1;

    // Horizontal grid lines
    for (var i = 0; i <= 4; i++) {
      final y = paddingTop + (chartHeight / 4) * i;
      canvas.drawLine(
        Offset(paddingLeft, y),
        Offset(paddingLeft + chartWidth, y),
        gridPaint,
      );
    }
  }

  void _drawYAxisLabels(Canvas canvas, double paddingLeft, double paddingTop,
      double chartHeight) {
    final textStyle = TextStyle(
      color: textColor,
      fontSize: 10,
    );

    final labels = ['100%', '75%', '50%', '25%', '0%'];
    for (var i = 0; i < labels.length; i++) {
      final y = paddingTop + (chartHeight / 4) * i;
      final textSpan = TextSpan(text: labels[i], style: textStyle);
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: TextDirection.ltr,
      );
      textPainter.layout();
      textPainter.paint(
        canvas,
        Offset(paddingLeft - textPainter.width - 4, y - textPainter.height / 2),
      );
    }
  }

  void _drawArea(Canvas canvas, List<Offset> points, double paddingTop,
      double chartHeight, double paddingLeft, double chartWidth) {
    if (points.isEmpty) return;

    final path = Path();
    path.moveTo(points.first.dx, paddingTop + chartHeight);
    path.lineTo(points.first.dx, points.first.dy);

    for (var i = 1; i < points.length; i++) {
      path.lineTo(points[i].dx, points[i].dy);
    }

    path.lineTo(points.last.dx, paddingTop + chartHeight);
    path.close();

    final areaPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          primaryColor.withValues(alpha: 0.3),
          primaryColor.withValues(alpha: 0.0),
        ],
      ).createShader(
          Rect.fromLTWH(paddingLeft, paddingTop, chartWidth, chartHeight));

    canvas.drawPath(path, areaPaint);
  }

  void _drawLine(Canvas canvas, List<Offset> points) {
    if (points.length < 2) return;

    final linePaint = Paint()
      ..color = primaryColor
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final path = Path();
    path.moveTo(points.first.dx, points.first.dy);

    for (var i = 1; i < points.length; i++) {
      path.lineTo(points[i].dx, points[i].dy);
    }

    canvas.drawPath(path, linePaint);
  }

  void _drawPoints(Canvas canvas, List<Offset> points) {
    final pointPaint = Paint()
      ..color = primaryColor
      ..style = PaintingStyle.fill;

    final borderPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    for (final point in points) {
      canvas.drawCircle(point, 5, borderPaint);
      canvas.drawCircle(point, 3.5, pointPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _TimelineChartPainter oldDelegate) {
    return oldDelegate.timeline != timeline;
  }
}

/// Compact sparkline chart for inline display.
class EngagementSparkline extends StatelessWidget {
  const EngagementSparkline({
    super.key,
    required this.values,
    this.width = 80,
    this.height = 24,
    this.color,
  });

  final List<double> values;
  final double width;
  final double height;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final lineColor = color ?? theme.colorScheme.primary;

    if (values.isEmpty) {
      return SizedBox(width: width, height: height);
    }

    return CustomPaint(
      size: Size(width, height),
      painter: _SparklinePainter(
        values: values,
        color: lineColor,
      ),
    );
  }
}

class _SparklinePainter extends CustomPainter {
  _SparklinePainter({
    required this.values,
    required this.color,
  });

  final List<double> values;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;

    const padding = 2.0;
    final chartWidth = size.width - padding * 2;
    final chartHeight = size.height - padding * 2;

    double minVal = values.reduce(math.min);
    double maxVal = values.reduce(math.max);
    if (maxVal - minVal < 0.01) {
      minVal = math.max(0, minVal - 0.1);
      maxVal = math.min(1, maxVal + 0.1);
    }

    final points = <Offset>[];
    for (var i = 0; i < values.length; i++) {
      final x = padding + (i / (values.length - 1)) * chartWidth;
      final normalizedY = maxVal > minVal
          ? (values[i] - minVal) / (maxVal - minVal)
          : 0.5;
      final y = padding + chartHeight - (normalizedY * chartHeight);
      points.add(Offset(x, y));
    }

    final linePaint = Paint()
      ..color = color
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path();
    path.moveTo(points.first.dx, points.first.dy);
    for (var i = 1; i < points.length; i++) {
      path.lineTo(points[i].dx, points[i].dy);
    }

    canvas.drawPath(path, linePaint);
  }

  @override
  bool shouldRepaint(covariant _SparklinePainter oldDelegate) {
    return oldDelegate.values != values || oldDelegate.color != color;
  }
}
