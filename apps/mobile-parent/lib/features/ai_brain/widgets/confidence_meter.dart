/// Confidence Meter Widget
///
/// Visual meter showing AI confidence level.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Meter showing AI confidence level.
class ConfidenceMeter extends StatelessWidget {
  const ConfidenceMeter({
    super.key,
    required this.level,
    this.size = 120,
    this.showLabel = true,
  });

  /// Confidence level from 0.0 to 1.0.
  final double level;
  final double size;
  final bool showLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _getConfidenceColor(level);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: size,
          height: size / 2 + 20,
          child: Stack(
            alignment: Alignment.bottomCenter,
            children: [
              // Background arc
              CustomPaint(
                size: Size(size, size / 2),
                painter: _MeterBackgroundPainter(
                  backgroundColor: theme.colorScheme.surfaceContainerHighest,
                ),
              ),
              // Value arc
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: level.clamp(0.0, 1.0)),
                duration: const Duration(milliseconds: 800),
                curve: Curves.easeOutCubic,
                builder: (context, animatedValue, child) {
                  return CustomPaint(
                    size: Size(size, size / 2),
                    painter: _MeterValuePainter(
                      value: animatedValue,
                      color: color,
                    ),
                  );
                },
              ),
              // Center content
              Positioned(
                bottom: 0,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${(level * 100).round()}%',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: color,
                      ),
                    ),
                    if (showLabel)
                      Text(
                        _getConfidenceLabel(level),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (showLabel) ...[
          const SizedBox(height: 8),
          Text(
            'AI Confidence',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ],
    );
  }

  Color _getConfidenceColor(double level) {
    if (level >= 0.8) return Colors.green;
    if (level >= 0.6) return Colors.blue;
    if (level >= 0.4) return Colors.orange;
    return Colors.red;
  }

  String _getConfidenceLabel(double level) {
    if (level >= 0.8) return 'Very Confident';
    if (level >= 0.6) return 'Confident';
    if (level >= 0.4) return 'Moderate';
    return 'Learning';
  }
}

/// Background arc painter.
class _MeterBackgroundPainter extends CustomPainter {
  _MeterBackgroundPainter({required this.backgroundColor});

  final Color backgroundColor;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height);
    final radius = size.width / 2 - 10;

    final paint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      math.pi,
      math.pi,
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Value arc painter.
class _MeterValuePainter extends CustomPainter {
  _MeterValuePainter({
    required this.value,
    required this.color,
  });

  final double value;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (value <= 0) return;

    final center = Offset(size.width / 2, size.height);
    final radius = size.width / 2 - 10;

    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12
      ..strokeCap = StrokeCap.round;

    final sweepAngle = math.pi * value;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      math.pi,
      sweepAngle,
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _MeterValuePainter oldDelegate) {
    return oldDelegate.value != value || oldDelegate.color != color;
  }
}

/// Compact inline confidence indicator.
class InlineConfidenceIndicator extends StatelessWidget {
  const InlineConfidenceIndicator({
    super.key,
    required this.level,
    this.width = 100,
  });

  final double level;
  final double width;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _getConfidenceColor(level);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: width,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: level,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation(color),
              minHeight: 8,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '${(level * 100).round()}%',
          style: theme.textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }

  Color _getConfidenceColor(double level) {
    if (level >= 0.8) return Colors.green;
    if (level >= 0.6) return Colors.blue;
    if (level >= 0.4) return Colors.orange;
    return Colors.red;
  }
}
