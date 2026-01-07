import 'dart:math';
import 'package:flutter/material.dart';

/// Confetti celebration overlay for streaks and achievements.
class StreakCelebration extends StatelessWidget {
  const StreakCelebration({
    super.key,
    required this.controller,
    this.onComplete,
  });

  final AnimationController controller;
  final VoidCallback? onComplete;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        if (controller.value >= 1.0) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            onComplete?.call();
          });
        }

        return IgnorePointer(
          child: CustomPaint(
            painter: _ConfettiPainter(
              progress: controller.value,
            ),
            size: Size.infinite,
          ),
        );
      },
    );
  }
}

class _ConfettiPainter extends CustomPainter {
  _ConfettiPainter({required this.progress});

  final double progress;
  final _random = Random(42); // Fixed seed for consistent confetti

  @override
  void paint(Canvas canvas, Size size) {
    final confettiCount = 50;
    final colors = [
      Colors.red,
      Colors.blue,
      Colors.green,
      Colors.yellow,
      Colors.purple,
      Colors.orange,
      Colors.pink,
    ];

    for (var i = 0; i < confettiCount; i++) {
      final x = _random.nextDouble() * size.width;
      final startY = -50.0;
      final endY = size.height + 50;
      final y = startY + (endY - startY) * progress;

      final color = colors[i % colors.length];
      final opacity = (1.0 - progress).clamp(0.0, 1.0);

      final paint = Paint()
        ..color = color.withOpacity(opacity)
        ..style = PaintingStyle.fill;

      // Random rotation
      final rotation = progress * _random.nextDouble() * 10;

      canvas.save();
      canvas.translate(x, y + _random.nextDouble() * 100 * progress);
      canvas.rotate(rotation);

      // Draw a small rectangle
      canvas.drawRect(
        Rect.fromCenter(center: Offset.zero, width: 8, height: 12),
        paint,
      );

      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant _ConfettiPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
