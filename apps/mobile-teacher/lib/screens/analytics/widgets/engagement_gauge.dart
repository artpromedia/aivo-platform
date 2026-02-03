/// Engagement Gauge Widget
///
/// A visual meter showing engagement level with animated display.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../models/analytics.dart';

/// Visual gauge for displaying engagement level.
class EngagementGauge extends StatelessWidget {
  const EngagementGauge({
    super.key,
    required this.value,
    this.level,
    this.size = 120,
    this.showLabel = true,
    this.animate = true,
  });

  /// Engagement value from 0.0 to 1.0.
  final double value;

  /// Engagement level classification.
  final EngagementLevel? level;

  /// Size of the gauge.
  final double size;

  /// Whether to show the label below the gauge.
  final bool showLabel;

  /// Whether to animate the gauge.
  final bool animate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final displayLevel = level ?? _calculateLevel(value);
    final color = _getLevelColor(displayLevel);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: size,
          height: size,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Background arc
              CustomPaint(
                size: Size(size, size),
                painter: _GaugeBackgroundPainter(
                  backgroundColor: theme.colorScheme.surfaceContainerHighest,
                ),
              ),
              // Value arc
              animate
                  ? TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: value.clamp(0.0, 1.0)),
                      duration: const Duration(milliseconds: 800),
                      curve: Curves.easeOutCubic,
                      builder: (context, animatedValue, child) {
                        return CustomPaint(
                          size: Size(size, size),
                          painter: _GaugeValuePainter(
                            value: animatedValue,
                            color: color,
                          ),
                        );
                      },
                    )
                  : CustomPaint(
                      size: Size(size, size),
                      painter: _GaugeValuePainter(
                        value: value.clamp(0.0, 1.0),
                        color: color,
                      ),
                    ),
              // Center content
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${(value * 100).round()}%',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                  if (showLabel)
                    Text(
                      displayLevel.label,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  EngagementLevel _calculateLevel(double value) {
    if (value < 0.25) return EngagementLevel.low;
    if (value < 0.5) return EngagementLevel.medium;
    if (value < 0.75) return EngagementLevel.high;
    return EngagementLevel.exceptional;
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

/// Mini engagement gauge for compact displays.
class MiniEngagementGauge extends StatelessWidget {
  const MiniEngagementGauge({
    super.key,
    required this.value,
    this.size = 40,
  });

  final double value;
  final double size;

  @override
  Widget build(BuildContext context) {
    return EngagementGauge(
      value: value,
      size: size,
      showLabel: false,
      animate: false,
    );
  }
}

/// Background arc painter for the gauge.
class _GaugeBackgroundPainter extends CustomPainter {
  _GaugeBackgroundPainter({required this.backgroundColor});

  final Color backgroundColor;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 10;

    final paint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12
      ..strokeCap = StrokeCap.round;

    // Draw 270-degree arc (from -225 to 45 degrees)
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      _degreesToRadians(135), // Start at bottom-left
      _degreesToRadians(270), // Sweep 270 degrees
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;

  double _degreesToRadians(double degrees) => degrees * math.pi / 180;
}

/// Value arc painter for the gauge.
class _GaugeValuePainter extends CustomPainter {
  _GaugeValuePainter({
    required this.value,
    required this.color,
  });

  final double value;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (value <= 0) return;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 10;

    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12
      ..strokeCap = StrokeCap.round;

    // Draw arc proportional to value
    final sweepAngle = 270 * value;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      _degreesToRadians(135), // Start at bottom-left
      _degreesToRadians(sweepAngle),
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _GaugeValuePainter oldDelegate) {
    return oldDelegate.value != value || oldDelegate.color != color;
  }

  double _degreesToRadians(double degrees) => degrees * math.pi / 180;
}
