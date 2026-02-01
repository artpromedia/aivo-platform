/// Aivo Progress Widgets
///
/// XP progress bars and level progress rings with grade-band adaptive styling.
/// Matches web gamification design with Mint gradient for XP.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme/aivo_brand.dart';
import '../../theme/aivo_motion.dart';
import '../../theme/aivo_theme.dart';
import 'aivo_gamification_colors.dart';

// ══════════════════════════════════════════════════════════════════════════════
// XP PROGRESS BAR
// ══════════════════════════════════════════════════════════════════════════════

/// XP progress bar with animated fill and shimmer effect.
///
/// Features:
/// - Mint gradient fill matching web design
/// - Animated progress changes
/// - Optional shimmer effect
/// - Grade-band adaptive sizing
class AivoXpProgressBar extends StatefulWidget {
  const AivoXpProgressBar({
    super.key,
    required this.currentXp,
    required this.maxXp,
    this.height,
    this.showLabel = true,
    this.showShimmer = true,
    this.animationDuration,
    this.gradeBand,
    this.semanticLabel,
  });

  /// Current XP amount.
  final int currentXp;

  /// Maximum XP for this level.
  final int maxXp;

  /// Bar height. Defaults based on grade band.
  final double? height;

  /// Whether to show XP label.
  final bool showLabel;

  /// Whether to show shimmer animation.
  final bool showShimmer;

  /// Animation duration for progress changes.
  final Duration? animationDuration;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  /// Semantic label for accessibility.
  final String? semanticLabel;

  @override
  State<AivoXpProgressBar> createState() => _AivoXpProgressBarState();
}

class _AivoXpProgressBarState extends State<AivoXpProgressBar>
    with SingleTickerProviderStateMixin {
  late AnimationController _shimmerController;

  @override
  void initState() {
    super.initState();
    _shimmerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    if (widget.showShimmer) {
      _shimmerController.repeat();
    }
  }

  @override
  void didUpdateWidget(AivoXpProgressBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.showShimmer && !_shimmerController.isAnimating) {
      _shimmerController.repeat();
    } else if (!widget.showShimmer && _shimmerController.isAnimating) {
      _shimmerController.stop();
    }
  }

  @override
  void dispose() {
    _shimmerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradeBand = widget.gradeBand ?? AivoTheme.gradeBandOf(context);

    // Grade-band adaptive height
    final height = widget.height ??
        switch (gradeBand) {
          AivoGradeBand.k5 => 16.0,
          AivoGradeBand.g6_8 => 12.0,
          AivoGradeBand.g9_12 => 10.0,
        };

    // Grade-band adaptive border radius
    final borderRadius = switch (gradeBand) {
      AivoGradeBand.k5 => height / 2,
      AivoGradeBand.g6_8 => height / 2,
      AivoGradeBand.g9_12 => 4.0,
    };

    final progress = widget.maxXp > 0
        ? (widget.currentXp / widget.maxXp).clamp(0.0, 1.0)
        : 0.0;

    final duration = widget.animationDuration ??
        AivoMotion.durationFor(gradeBand).base;

    return Semantics(
      label: widget.semanticLabel ??
          '${widget.currentXp} of ${widget.maxXp} XP, ${(progress * 100).round()}% progress',
      value: '${(progress * 100).round()}%',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Progress bar
          Container(
            height: height,
            decoration: BoxDecoration(
              color: AivoGamificationColors.xpBackground,
              borderRadius: BorderRadius.circular(borderRadius),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(borderRadius),
              child: Stack(
                children: [
                  // Animated fill
                  AnimatedContainer(
                    duration: duration,
                    curve: Curves.easeOutCubic,
                    width: double.infinity,
                    alignment: Alignment.centerLeft,
                    child: FractionallySizedBox(
                      widthFactor: progress,
                      child: Container(
                        decoration: const BoxDecoration(
                          gradient: AivoGamificationColors.xpGradient,
                        ),
                        child: widget.showShimmer
                            ? AnimatedBuilder(
                                animation: _shimmerController,
                                builder: (context, child) {
                                  return ShaderMask(
                                    shaderCallback: (bounds) {
                                      return LinearGradient(
                                        begin: Alignment.centerLeft,
                                        end: Alignment.centerRight,
                                        colors: const [
                                          Colors.transparent,
                                          Colors.white24,
                                          Colors.transparent,
                                        ],
                                        stops: [
                                          _shimmerController.value - 0.3,
                                          _shimmerController.value,
                                          _shimmerController.value + 0.3,
                                        ].map((e) => e.clamp(0.0, 1.0)).toList(),
                                      ).createShader(bounds);
                                    },
                                    blendMode: BlendMode.srcATop,
                                    child: Container(color: Colors.white),
                                  );
                                },
                              )
                            : null,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Label
          if (widget.showLabel) ...[
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${widget.currentXp} / ${widget.maxXp} XP',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: AivoGamificationColors.xpSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  '${(progress * 100).round()}%',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LEVEL PROGRESS RING
// ══════════════════════════════════════════════════════════════════════════════

/// Circular level progress ring with animated fill.
///
/// Features:
/// - Purple-blue gradient ring
/// - Level number in center
/// - Optional rotating shine effect
/// - Grade-band adaptive sizing
class AivoLevelRing extends StatefulWidget {
  const AivoLevelRing({
    super.key,
    required this.level,
    required this.progress,
    this.size,
    this.strokeWidth,
    this.showShine = true,
    this.gradeBand,
    this.semanticLabel,
  });

  /// Current level number.
  final int level;

  /// Progress to next level (0.0 - 1.0).
  final double progress;

  /// Ring size. Defaults based on grade band.
  final double? size;

  /// Ring stroke width.
  final double? strokeWidth;

  /// Whether to show rotating shine effect.
  final bool showShine;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  /// Semantic label.
  final String? semanticLabel;

  @override
  State<AivoLevelRing> createState() => _AivoLevelRingState();
}

class _AivoLevelRingState extends State<AivoLevelRing>
    with SingleTickerProviderStateMixin {
  late AnimationController _shineController;

  @override
  void initState() {
    super.initState();
    _shineController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    );
    if (widget.showShine) {
      _shineController.repeat();
    }
  }

  @override
  void dispose() {
    _shineController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradeBand = widget.gradeBand ?? AivoTheme.gradeBandOf(context);

    // Grade-band adaptive size
    final size = widget.size ??
        switch (gradeBand) {
          AivoGradeBand.k5 => 80.0,
          AivoGradeBand.g6_8 => 64.0,
          AivoGradeBand.g9_12 => 56.0,
        };

    final strokeWidth = widget.strokeWidth ??
        switch (gradeBand) {
          AivoGradeBand.k5 => 6.0,
          AivoGradeBand.g6_8 => 5.0,
          AivoGradeBand.g9_12 => 4.0,
        };

    return Semantics(
      label: widget.semanticLabel ??
          'Level ${widget.level}, ${(widget.progress * 100).round()}% to next level',
      child: SizedBox(
        width: size,
        height: size,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Background ring
            SizedBox(
              width: size,
              height: size,
              child: CircularProgressIndicator(
                value: 1.0,
                strokeWidth: strokeWidth,
                valueColor: AlwaysStoppedAnimation(
                  theme.colorScheme.surfaceContainerHighest,
                ),
              ),
            ),

            // Progress ring
            SizedBox(
              width: size,
              height: size,
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: widget.progress),
                duration: AivoMotion.durationFor(gradeBand).base,
                curve: Curves.easeOutCubic,
                builder: (context, value, child) {
                  return CustomPaint(
                    painter: _GradientRingPainter(
                      progress: value,
                      strokeWidth: strokeWidth,
                      gradient: AivoGamificationColors.levelGradient,
                    ),
                  );
                },
              ),
            ),

            // Shine effect
            if (widget.showShine)
              AnimatedBuilder(
                animation: _shineController,
                builder: (context, child) {
                  return Transform.rotate(
                    angle: _shineController.value * 2 * math.pi,
                    child: Container(
                      width: size + 4,
                      height: size + 4,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AivoBrand.primary[300]!.withValues(alpha: 0.5),
                          width: 2,
                          strokeAlign: BorderSide.strokeAlignOutside,
                        ),
                      ),
                    ),
                  );
                },
              ),

            // Center gradient circle with level
            Container(
              width: size - strokeWidth * 2 - 8,
              height: size - strokeWidth * 2 - 8,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: AivoGamificationColors.levelGradient,
                boxShadow: [
                  BoxShadow(
                    color: Color(0x408B5CF6),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Center(
                child: Text(
                  '${widget.level}',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Custom painter for gradient progress ring.
class _GradientRingPainter extends CustomPainter {
  _GradientRingPainter({
    required this.progress,
    required this.strokeWidth,
    required this.gradient,
  });

  final double progress;
  final double strokeWidth;
  final LinearGradient gradient;

  @override
  void paint(Canvas canvas, Size size) {
    if (progress <= 0) return;

    final rect = Rect.fromLTWH(0, 0, size.width, size.height);
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    final paint = Paint()
      ..shader = SweepGradient(
        startAngle: -math.pi / 2,
        endAngle: math.pi * 1.5,
        colors: gradient.colors,
      ).createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      progress * 2 * math.pi,
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(_GradientRingPainter oldDelegate) {
    return progress != oldDelegate.progress ||
        strokeWidth != oldDelegate.strokeWidth;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMBINED LEVEL PROGRESS WIDGET
// ══════════════════════════════════════════════════════════════════════════════

/// Combined level badge and XP progress bar widget.
///
/// Displays:
/// - Level ring on the left
/// - XP progress bar with remaining XP on the right
class AivoLevelProgress extends StatelessWidget {
  const AivoLevelProgress({
    super.key,
    required this.level,
    required this.currentXp,
    required this.xpForNextLevel,
    this.levelTitle,
    this.gradeBand,
  });

  /// Current level.
  final int level;

  /// Current XP in this level.
  final int currentXp;

  /// XP required to reach next level.
  final int xpForNextLevel;

  /// Optional level title (e.g., "Explorer", "Scholar").
  final String? levelTitle;

  /// Grade band.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradeBand = this.gradeBand ?? AivoTheme.gradeBandOf(context);
    final progress =
        xpForNextLevel > 0 ? (currentXp / xpForNextLevel).clamp(0.0, 1.0) : 0.0;
    final remaining = xpForNextLevel - currentXp;

    return Row(
      children: [
        // Level ring
        AivoLevelRing(
          level: level,
          progress: progress,
          gradeBand: gradeBand,
        ),

        const SizedBox(width: 16),

        // Progress info
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Level label
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    levelTitle ?? 'Level $level',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  // Next level preview
                  Opacity(
                    opacity: 0.5,
                    child: Row(
                      children: [
                        Text(
                          'Next',
                          style: theme.textTheme.labelSmall,
                        ),
                        const SizedBox(width: 4),
                        Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: theme.colorScheme.surfaceContainerHighest,
                          ),
                          child: Center(
                            child: Text(
                              '${level + 1}',
                              style: theme.textTheme.labelSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 8),

              // XP progress bar
              AivoXpProgressBar(
                currentXp: currentXp,
                maxXp: xpForNextLevel,
                gradeBand: gradeBand,
                showLabel: false,
              ),

              const SizedBox(height: 4),

              // XP remaining text
              Text(
                '$remaining XP to level ${level + 1}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
