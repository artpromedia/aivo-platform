/// Aivo Hearts Widget
///
/// Hearts/lives display with full/empty states and animations.
/// Uses Coral-500 (#FF6B6B) for full, Gray-300 (#D4D4D8) for empty.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme/aivo_theme.dart';
import 'aivo_gamification_colors.dart';

// ══════════════════════════════════════════════════════════════════════════════
// SINGLE HEART
// ══════════════════════════════════════════════════════════════════════════════

/// Animated heart icon with full/empty states.
///
/// Features:
/// - Full heart: Coral-500 (#FF6B6B)
/// - Empty heart: Gray-300 (#D4D4D8)
/// - Bounce animation on state change
/// - Pulse animation for losing heart
class AivoHeart extends StatefulWidget {
  const AivoHeart({
    super.key,
    required this.isFull,
    this.size = 32,
    this.showAnimation = true,
    this.semanticLabel,
  });

  /// Whether the heart is full.
  final bool isFull;

  /// Heart size.
  final double size;

  /// Whether to show animation on change.
  final bool showAnimation;

  /// Semantic label for accessibility.
  final String? semanticLabel;

  @override
  State<AivoHeart> createState() => _AivoHeartState();
}

class _AivoHeartState extends State<AivoHeart>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _shakeAnimation;
  bool _wasFull = true;

  @override
  void initState() {
    super.initState();
    _wasFull = widget.isFull;
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _scaleAnimation = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 1.0, end: 0.6),
        weight: 30,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 0.6, end: 1.2),
        weight: 40,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.2, end: 1.0),
        weight: 30,
      ),
    ]).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));

    _shakeAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0, end: -10), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -10, end: 10), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 10, end: -5), weight: 2),
      TweenSequenceItem(tween: Tween(begin: -5, end: 0), weight: 1),
    ]).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));
  }

  @override
  void didUpdateWidget(AivoHeart oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isFull != _wasFull && widget.showAnimation) {
      _controller.forward(from: 0);
    }
    _wasFull = widget.isFull;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: widget.semanticLabel ??
          (widget.isFull ? 'Full heart' : 'Empty heart'),
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Transform.scale(
            scale: _scaleAnimation.value,
            child: Transform.translate(
              offset: Offset(_shakeAnimation.value * (widget.isFull ? 0 : 1), 0),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: widget.size,
                height: widget.size,
                child: CustomPaint(
                  painter: _HeartPainter(
                    color: widget.isFull
                        ? AivoGamificationColors.heartFull
                        : AivoGamificationColors.heartEmpty,
                    outlineColor: widget.isFull
                        ? AivoGamificationColors.heartFull
                        : AivoGamificationColors.heartEmpty.withValues(alpha: 0.5),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Custom heart shape painter.
class _HeartPainter extends CustomPainter {
  _HeartPainter({
    required this.color,
    required this.outlineColor,
  });

  final Color color;
  final Color outlineColor;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final outlinePaint = Paint()
      ..color = outlineColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final path = _createHeartPath(size);

    // Shadow
    canvas.drawPath(
      path.shift(const Offset(0, 2)),
      Paint()..color = color.withValues(alpha: 0.3),
    );

    canvas.drawPath(path, paint);
    canvas.drawPath(path, outlinePaint);
  }

  Path _createHeartPath(Size size) {
    final path = Path();
    final w = size.width;
    final h = size.height;

    path.moveTo(w / 2, h * 0.3);

    // Left curve
    path.cubicTo(
      w * 0.15, h * 0.05,
      -w * 0.1, h * 0.45,
      w / 2, h,
    );

    // Right curve
    path.moveTo(w / 2, h * 0.3);
    path.cubicTo(
      w * 0.85, h * 0.05,
      w * 1.1, h * 0.45,
      w / 2, h,
    );

    return path;
  }

  @override
  bool shouldRepaint(_HeartPainter oldDelegate) {
    return color != oldDelegate.color;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HEARTS ROW
// ══════════════════════════════════════════════════════════════════════════════

/// Row of hearts showing remaining lives.
///
/// Features:
/// - Configurable number of hearts
/// - Animated transitions on loss/gain
/// - Grade band adaptive sizing
class AivoHeartsRow extends StatelessWidget {
  const AivoHeartsRow({
    super.key,
    required this.currentHearts,
    required this.maxHearts,
    this.heartSize,
    this.spacing = 4,
    this.showAnimation = true,
    this.gradeBand,
  });

  /// Current number of hearts.
  final int currentHearts;

  /// Maximum number of hearts.
  final int maxHearts;

  /// Override heart size.
  final double? heartSize;

  /// Spacing between hearts.
  final double spacing;

  /// Whether to show animations.
  final bool showAnimation;

  /// Grade band.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final gradeBand = this.gradeBand ?? AivoTheme.gradeBandOf(context);

    final defaultHeartSize = switch (gradeBand) {
      AivoGradeBand.k5 => 32.0,
      AivoGradeBand.g6_8 => 28.0,
      AivoGradeBand.g9_12 => 24.0,
    };

    final effectiveSize = heartSize ?? defaultHeartSize;

    return Semantics(
      label: '$currentHearts of $maxHearts hearts remaining',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(maxHearts, (index) {
          return Padding(
            padding: EdgeInsets.only(right: index < maxHearts - 1 ? spacing : 0),
            child: AivoHeart(
              isFull: index < currentHearts,
              size: effectiveSize,
              showAnimation: showAnimation,
            ),
          );
        }),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HEARTS DISPLAY
// ══════════════════════════════════════════════════════════════════════════════

/// Hearts display with optional label and refill timer.
///
/// Features:
/// - Hearts row with animations
/// - Optional count display
/// - Refill countdown timer
/// - Grade band styling
class AivoHeartsDisplay extends StatelessWidget {
  const AivoHeartsDisplay({
    super.key,
    required this.currentHearts,
    required this.maxHearts,
    this.nextRefillTime,
    this.showCount = false,
    this.compact = false,
    this.gradeBand,
  });

  /// Current hearts.
  final int currentHearts;

  /// Maximum hearts.
  final int maxHearts;

  /// Time until next heart refill.
  final Duration? nextRefillTime;

  /// Whether to show numeric count.
  final bool showCount;

  /// Compact display mode.
  final bool compact;

  /// Grade band.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradeBand = this.gradeBand ?? AivoTheme.gradeBandOf(context);

    if (compact) {
      return _buildCompact(context, theme, gradeBand);
    }

    return _buildFull(context, theme, gradeBand);
  }

  Widget _buildCompact(
    BuildContext context,
    ThemeData theme,
    AivoGradeBand gradeBand,
  ) {
    final heartSize = switch (gradeBand) {
      AivoGradeBand.k5 => 24.0,
      AivoGradeBand.g6_8 => 20.0,
      AivoGradeBand.g9_12 => 18.0,
    };

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        AivoHeart(
          isFull: currentHearts > 0,
          size: heartSize,
          showAnimation: true,
        ),
        const SizedBox(width: 4),
        Text(
          '$currentHearts',
          style: theme.textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.bold,
            color: currentHearts > 0
                ? AivoGamificationColors.heartFull
                : AivoGamificationColors.heartEmpty,
          ),
        ),
      ],
    );
  }

  Widget _buildFull(
    BuildContext context,
    ThemeData theme,
    AivoGradeBand gradeBand,
  ) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AivoHeartsRow(
          currentHearts: currentHearts,
          maxHearts: maxHearts,
          gradeBand: gradeBand,
        ),
        if (showCount) ...[
          const SizedBox(height: 4),
          Text(
            '$currentHearts / $maxHearts',
            style: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
        if (nextRefillTime != null && currentHearts < maxHearts) ...[
          const SizedBox(height: 4),
          _RefillTimer(duration: nextRefillTime!),
        ],
      ],
    );
  }
}

/// Countdown timer for heart refill.
class _RefillTimer extends StatelessWidget {
  const _RefillTimer({required this.duration});

  final Duration duration;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          Icons.timer_outlined,
          size: 14,
          color: theme.colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: 4),
        Text(
          '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}',
          style: theme.textTheme.labelSmall?.copyWith(
            fontFeatures: [const FontFeature.tabularFigures()],
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HEART LOSS ANIMATION
// ══════════════════════════════════════════════════════════════════════════════

/// Animated heart breaking/losing overlay.
///
/// Shows when player loses a heart.
class AivoHeartLossOverlay extends StatefulWidget {
  const AivoHeartLossOverlay({
    super.key,
    required this.heartsRemaining,
    required this.maxHearts,
    this.onComplete,
  });

  /// Hearts remaining after loss.
  final int heartsRemaining;

  /// Maximum hearts.
  final int maxHearts;

  /// Callback when animation completes.
  final VoidCallback? onComplete;

  @override
  State<AivoHeartLossOverlay> createState() => _AivoHeartLossOverlayState();
}

class _AivoHeartLossOverlayState extends State<AivoHeartLossOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<double> _heartFallAnimation;
  late Animation<double> _heartRotateAnimation;
  late Animation<double> _heartFadeAnimation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _fadeAnimation = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0, end: 0.6),
        weight: 20,
      ),
      TweenSequenceItem(
        tween: ConstantTween(0.6),
        weight: 60,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 0.6, end: 0),
        weight: 20,
      ),
    ]).animate(_controller);

    _heartFallAnimation = Tween<double>(begin: 0, end: 200).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.2, 0.8, curve: Curves.easeInQuad),
      ),
    );

    _heartRotateAnimation = Tween<double>(begin: 0, end: 0.5).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.2, 0.8),
      ),
    );

    _heartFadeAnimation = Tween<double>(begin: 1, end: 0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.5, 1.0, curve: Curves.easeOut),
      ),
    );

    _controller.forward().then((_) {
      widget.onComplete?.call();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return IgnorePointer(
          ignoring: _fadeAnimation.value == 0,
          child: Container(
            color: Colors.black.withValues(alpha: _fadeAnimation.value),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Falling heart
                  Transform.translate(
                    offset: Offset(0, _heartFallAnimation.value),
                    child: Transform.rotate(
                      angle: _heartRotateAnimation.value * math.pi,
                      child: Opacity(
                        opacity: _heartFadeAnimation.value,
                        child: const AivoHeart(
                          isFull: true,
                          size: 80,
                          showAnimation: false,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Message
                  Opacity(
                    opacity: _fadeAnimation.value / 0.6,
                    child: Column(
                      children: [
                        Text(
                          widget.heartsRemaining > 0
                              ? 'You lost a heart!'
                              : 'Out of hearts!',
                          style: theme.textTheme.headlineSmall?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        AivoHeartsRow(
                          currentHearts: widget.heartsRemaining,
                          maxHearts: widget.maxHearts,
                          heartSize: 32,
                        ),
                      ],
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
