import 'package:flutter/material.dart';

/// Animated XP gain display.
class XPAnimation extends StatelessWidget {
  const XPAnimation({
    super.key,
    required this.controller,
    required this.xpAmount,
    this.onComplete,
  });

  final AnimationController controller;
  final int xpAmount;
  final VoidCallback? onComplete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        final opacity = Curves.easeOut.transform(
          1 - controller.value,
        );
        final offset = 50 * controller.value;

        if (controller.value >= 1.0) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            onComplete?.call();
          });
        }

        return Opacity(
          opacity: opacity,
          child: Transform.translate(
            offset: Offset(0, -offset),
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 8,
              ),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    theme.colorScheme.primary,
                    theme.colorScheme.tertiary,
                  ],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: theme.colorScheme.primary.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.stars_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '+$xpAmount XP',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
