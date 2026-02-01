/// Aivo Streak Widget
///
/// Fire-styled streak counter with animated flame effect.
/// Matches web gamification design with Coral → Sunshine gradient.
library;

import 'package:flutter/material.dart';

import '../../theme/aivo_brand.dart';
import '../../theme/aivo_motion.dart';
import '../../theme/aivo_theme.dart';
import 'aivo_gamification_colors.dart';

// ══════════════════════════════════════════════════════════════════════════════
// STREAK FLAME WIDGET
// ══════════════════════════════════════════════════════════════════════════════

/// Animated fire/flame icon for streak display.
///
/// Features:
/// - Animated flickering flame
/// - Coral → Sunshine gradient
/// - Optional glow effect
/// - Intensity based on streak count
class AivoStreakFlame extends StatefulWidget {
  const AivoStreakFlame({
    super.key,
    this.size = 32,
    this.intensity = 1.0,
    this.animate = true,
    this.showGlow = true,
    this.gradeBand,
  });

  /// Flame size.
  final double size;

  /// Intensity of animation (0.0 - 2.0).
  final double intensity;

  /// Whether to animate.
  final bool animate;

  /// Whether to show glow effect.
  final bool showGlow;

  /// Grade band.
  final AivoGradeBand? gradeBand;

  @override
  State<AivoStreakFlame> createState() => _AivoStreakFlameState();
}

class _AivoStreakFlameState extends State<AivoStreakFlame>
    with TickerProviderStateMixin {
  late AnimationController _flickerController;
  late AnimationController _scaleController;
  late Animation<double> _flickerAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();

    _flickerController = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: (200 / widget.intensity).round()),
    );

    _scaleController = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: (800 / widget.intensity).round()),
    );

    _flickerAnimation = Tween<double>(begin: -0.05, end: 0.05).animate(
      CurvedAnimation(parent: _flickerController, curve: Curves.easeInOut),
    );

    _scaleAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.easeInOut),
    );

    if (widget.animate) {
      _flickerController.repeat(reverse: true);
      _scaleController.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(AivoStreakFlame oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.animate != oldWidget.animate) {
      if (widget.animate) {
        _flickerController.repeat(reverse: true);
        _scaleController.repeat(reverse: true);
      } else {
        _flickerController.stop();
        _scaleController.stop();
        _flickerController.value = 0.5;
        _scaleController.value = 0.5;
      }
    }
  }

  @override
  void dispose() {
    _flickerController.dispose();
    _scaleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_flickerController, _scaleController]),
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnimation.value,
          child: Transform.rotate(
            angle: _flickerAnimation.value,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Glow effect
                if (widget.showGlow)
                  Container(
                    width: widget.size * 1.5,
                    height: widget.size * 1.5,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          AivoGamificationColors.streakGlow,
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),

                // Flame icon
                ShaderMask(
                  shaderCallback: (bounds) {
                    return const LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        AivoGamificationColors.streakFire,
                        Color(0xFFFFA500),
                        AivoGamificationColors.streakFlame,
                      ],
                      stops: [0.0, 0.5, 1.0],
                    ).createShader(bounds);
                  },
                  child: Icon(
                    Icons.local_fire_department_rounded,
                    size: widget.size,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STREAK COUNTER WIDGET
// ══════════════════════════════════════════════════════════════════════════════

/// Streak counter displaying days streak with flame icon.
///
/// Features:
/// - Animated flame icon
/// - Large streak count
/// - Optional subtitle
/// - Grade-band adaptive sizing
class AivoStreakCounter extends StatefulWidget {
  const AivoStreakCounter({
    super.key,
    required this.streakDays,
    this.subtitle,
    this.compact = false,
    this.animate = true,
    this.gradeBand,
    this.semanticLabel,
  });

  /// Number of streak days.
  final int streakDays;

  /// Optional subtitle text.
  final String? subtitle;

  /// Compact mode.
  final bool compact;

  /// Whether to animate.
  final bool animate;

  /// Grade band.
  final AivoGradeBand? gradeBand;

  /// Semantic label.
  final String? semanticLabel;

  @override
  State<AivoStreakCounter> createState() => _AivoStreakCounterState();
}

class _AivoStreakCounterState extends State<AivoStreakCounter>
    with SingleTickerProviderStateMixin {
  late AnimationController _countController;
  int _displayCount = 0;

  @override
  void initState() {
    super.initState();
    _displayCount = widget.streakDays;
    _countController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
  }

  @override
  void didUpdateWidget(AivoStreakCounter oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.streakDays != oldWidget.streakDays) {
      _animateCount(oldWidget.streakDays, widget.streakDays);
    }
  }

  void _animateCount(int from, int to) {
    _countController.reset();
    _countController.addListener(() {
      setState(() {
        _displayCount =
            (from + (to - from) * _countController.value).round();
      });
    });
    _countController.forward();
  }

  @override
  void dispose() {
    _countController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradeBand = widget.gradeBand ?? AivoTheme.gradeBandOf(context);

    // Grade-band adaptive flame intensity
    final intensity = switch (gradeBand) {
      AivoGradeBand.k5 => 1.2,
      AivoGradeBand.g6_8 => 1.0,
      AivoGradeBand.g9_12 => 0.8,
    };

    if (widget.compact) {
      return _buildCompact(theme, gradeBand, intensity);
    }

    return _buildFull(theme, gradeBand, intensity);
  }

  Widget _buildCompact(
    ThemeData theme,
    AivoGradeBand gradeBand,
    double intensity,
  ) {
    final flameSize = switch (gradeBand) {
      AivoGradeBand.k5 => 24.0,
      AivoGradeBand.g6_8 => 20.0,
      AivoGradeBand.g9_12 => 18.0,
    };

    return Semantics(
      label: widget.semanticLabel ?? '$_displayCount day streak',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AivoStreakFlame(
            size: flameSize,
            intensity: intensity,
            animate: widget.animate,
            showGlow: false,
            gradeBand: gradeBand,
          ),
          const SizedBox(width: 4),
          Text(
            '$_displayCount',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: AivoGamificationColors.streakFire,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFull(
    ThemeData theme,
    AivoGradeBand gradeBand,
    double intensity,
  ) {
    final flameSize = switch (gradeBand) {
      AivoGradeBand.k5 => 56.0,
      AivoGradeBand.g6_8 => 48.0,
      AivoGradeBand.g9_12 => 40.0,
    };

    return Semantics(
      label: widget.semanticLabel ?? '$_displayCount day streak',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Flame
          AivoStreakFlame(
            size: flameSize,
            intensity: intensity,
            animate: widget.animate,
            gradeBand: gradeBand,
          ),

          const SizedBox(height: 8),

          // Count
          Text(
            '$_displayCount',
            style: theme.textTheme.headlineLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: AivoGamificationColors.streakFire,
            ),
          ),

          // Subtitle
          Text(
            widget.subtitle ?? 'day streak',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STREAK CARD
// ══════════════════════════════════════════════════════════════════════════════

/// Card displaying streak information with flame animation.
///
/// Features:
/// - Animated fire background
/// - Streak count and milestone progress
/// - Personal best indicator
class AivoStreakCard extends StatelessWidget {
  const AivoStreakCard({
    super.key,
    required this.currentStreak,
    required this.longestStreak,
    this.nextMilestone,
    this.onTap,
    this.gradeBand,
  });

  /// Current streak days.
  final int currentStreak;

  /// Longest streak achieved.
  final int longestStreak;

  /// Next milestone (e.g., 7, 30, 100 days).
  final int? nextMilestone;

  /// Callback when card is tapped.
  final VoidCallback? onTap;

  /// Grade band.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradeBand = this.gradeBand ?? AivoTheme.gradeBandOf(context);

    final borderRadius = switch (gradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusLg,
      AivoGradeBand.g6_8 => AivoBrand.radiusMd,
      AivoGradeBand.g9_12 => AivoBrand.radiusSm,
    };

    final isAtPersonalBest = currentStreak >= longestStreak && currentStreak > 0;
    final milestone = nextMilestone ?? _getNextMilestone(currentStreak);
    final milestoneProgress =
        milestone > 0 ? (currentStreak / milestone).clamp(0.0, 1.0) : 1.0;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(borderRadius),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                AivoGamificationColors.streakFire.withValues(alpha: 0.15),
                AivoGamificationColors.streakFlame.withValues(alpha: 0.1),
              ],
            ),
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: AivoGamificationColors.streakFire.withValues(alpha: 0.3),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Flame and count
                  AivoStreakCounter(
                    streakDays: currentStreak,
                    compact: true,
                    gradeBand: gradeBand,
                  ),

                  const Spacer(),

                  // Personal best badge
                  if (isAtPersonalBest)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AivoGamificationColors.streakFlame
                            .withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.emoji_events_rounded,
                            size: 14,
                            color: AivoGamificationColors.badgeGold,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Best!',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: AivoGamificationColors.badgeGold,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),

              const SizedBox(height: 12),

              // Milestone progress
              Text(
                'Next milestone: $milestone days',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),

              const SizedBox(height: 8),

              // Progress bar
              Container(
                height: 6,
                decoration: BoxDecoration(
                  color: AivoGamificationColors.streakFire.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(3),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: milestoneProgress),
                    duration: AivoMotion.durationFor(gradeBand).base,
                    curve: Curves.easeOutCubic,
                    builder: (context, value, child) {
                      return FractionallySizedBox(
                        widthFactor: value,
                        alignment: Alignment.centerLeft,
                        child: Container(
                          decoration: const BoxDecoration(
                            gradient: AivoGamificationColors.streakGradient,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),

              const SizedBox(height: 8),

              // Days remaining
              Text(
                '${milestone - currentStreak} days to go',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: AivoGamificationColors.streakFire,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  int _getNextMilestone(int current) {
    const milestones = [3, 7, 14, 30, 60, 100, 180, 365];
    for (final m in milestones) {
      if (m > current) return m;
    }
    return ((current ~/ 100) + 1) * 100; // Next hundred
  }
}
