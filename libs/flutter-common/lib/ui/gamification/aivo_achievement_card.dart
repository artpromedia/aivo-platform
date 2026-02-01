/// Aivo Achievement Card
///
/// Achievement badges and cards with tier-based styling.
/// Gold, Silver, Bronze, and Platinum badge colors matching web design.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme/aivo_brand.dart';
import '../../theme/aivo_motion.dart';
import '../../theme/aivo_theme.dart';
import 'aivo_gamification_colors.dart';

// ══════════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT BADGE
// ══════════════════════════════════════════════════════════════════════════════

/// Achievement badge with tier-based styling.
///
/// Features:
/// - Gold, Silver, Bronze, Platinum colors
/// - Locked state with grayscale
/// - Optional shine animation
/// - Icon or emoji display
class AivoAchievementBadge extends StatefulWidget {
  const AivoAchievementBadge({
    super.key,
    required this.tier,
    this.icon,
    this.emoji,
    this.size = 64,
    this.isLocked = false,
    this.showShine = true,
    this.onTap,
    this.semanticLabel,
  });

  /// Badge tier determining colors.
  final BadgeTier tier;

  /// Icon to display.
  final IconData? icon;

  /// Emoji to display (alternative to icon).
  final String? emoji;

  /// Badge size.
  final double size;

  /// Whether badge is locked.
  final bool isLocked;

  /// Whether to show shine animation.
  final bool showShine;

  /// Callback when tapped.
  final VoidCallback? onTap;

  /// Semantic label.
  final String? semanticLabel;

  @override
  State<AivoAchievementBadge> createState() => _AivoAchievementBadgeState();
}

class _AivoAchievementBadgeState extends State<AivoAchievementBadge>
    with SingleTickerProviderStateMixin {
  late AnimationController _shineController;

  @override
  void initState() {
    super.initState();
    _shineController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );
    if (widget.showShine && !widget.isLocked) {
      _shineController.repeat();
    }
  }

  @override
  void didUpdateWidget(AivoAchievementBadge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.showShine && !widget.isLocked && !_shineController.isAnimating) {
      _shineController.repeat();
    } else if ((widget.isLocked || !widget.showShine) &&
        _shineController.isAnimating) {
      _shineController.stop();
    }
  }

  @override
  void dispose() {
    _shineController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = AivoGamificationColors.badgeColorsForTier(widget.tier);

    final effectivePrimary = widget.isLocked
        ? AivoGamificationColors.badgeLocked
        : colors.primary;
    final effectiveLight = widget.isLocked
        ? AivoGamificationColors.badgeLocked.withValues(alpha: 0.7)
        : colors.light;
    final effectiveDark = widget.isLocked
        ? AivoGamificationColors.badgeLocked.withValues(alpha: 0.5)
        : colors.dark;

    return Semantics(
      label: widget.semanticLabel ??
          '${widget.tier.name} badge${widget.isLocked ? ', locked' : ''}',
      button: widget.onTap != null,
      child: GestureDetector(
        onTap: widget.onTap,
        child: SizedBox(
          width: widget.size,
          height: widget.size,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Badge background
              Container(
                width: widget.size,
                height: widget.size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [effectiveLight, effectivePrimary, effectiveDark],
                    stops: const [0.0, 0.5, 1.0],
                  ),
                  boxShadow: widget.isLocked
                      ? null
                      : [
                          BoxShadow(
                            color: effectivePrimary.withValues(alpha: 0.4),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ],
                ),
              ),

              // Inner circle
              Container(
                width: widget.size * 0.8,
                height: widget.size * 0.8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: widget.isLocked
                      ? AivoGamificationColors.badgeLocked.withValues(alpha: 0.3)
                      : AivoGamificationColors.badgeBackground,
                  border: Border.all(
                    color: effectivePrimary.withValues(alpha: 0.5),
                    width: 2,
                  ),
                ),
                child: Center(
                  child: widget.isLocked
                      ? Icon(
                          Icons.lock_rounded,
                          size: widget.size * 0.35,
                          color: AivoGamificationColors.badgeLocked,
                        )
                      : widget.emoji != null
                          ? Text(
                              widget.emoji!,
                              style: TextStyle(fontSize: widget.size * 0.4),
                            )
                          : Icon(
                              widget.icon ?? Icons.star_rounded,
                              size: widget.size * 0.4,
                              color: effectivePrimary,
                            ),
                ),
              ),

              // Shine effect
              if (widget.showShine && !widget.isLocked)
                AnimatedBuilder(
                  animation: _shineController,
                  builder: (context, child) {
                    return ClipOval(
                      child: SizedBox(
                        width: widget.size,
                        height: widget.size,
                        child: ShaderMask(
                          shaderCallback: (bounds) {
                            final position = _shineController.value * 2 - 0.5;
                            return LinearGradient(
                              begin: Alignment(-1 + position, -1 + position),
                              end: Alignment(position, position),
                              colors: const [
                                Colors.transparent,
                                Colors.white30,
                                Colors.transparent,
                              ],
                            ).createShader(bounds);
                          },
                          blendMode: BlendMode.srcATop,
                          child: Container(color: Colors.white),
                        ),
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT CARD
// ══════════════════════════════════════════════════════════════════════════════

/// Full achievement card with badge, title, description, and progress.
///
/// Features:
/// - Badge with tier styling
/// - Title and description
/// - XP/coin rewards display
/// - Progress indicator for partial achievements
/// - Locked/unlocked states
class AivoAchievementCard extends StatelessWidget {
  const AivoAchievementCard({
    super.key,
    required this.title,
    required this.description,
    required this.tier,
    this.icon,
    this.emoji,
    this.xpReward,
    this.coinReward,
    this.progress,
    this.progressTotal,
    this.isLocked = false,
    this.unlockedAt,
    this.onTap,
    this.gradeBand,
  });

  /// Achievement title.
  final String title;

  /// Achievement description.
  final String description;

  /// Badge tier.
  final BadgeTier tier;

  /// Badge icon.
  final IconData? icon;

  /// Badge emoji.
  final String? emoji;

  /// XP reward amount.
  final int? xpReward;

  /// Coin reward amount.
  final int? coinReward;

  /// Current progress (for partial achievements).
  final int? progress;

  /// Total required for achievement.
  final int? progressTotal;

  /// Whether achievement is locked.
  final bool isLocked;

  /// When achievement was unlocked.
  final DateTime? unlockedAt;

  /// Callback when tapped.
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

    final badgeSize = switch (gradeBand) {
      AivoGradeBand.k5 => 72.0,
      AivoGradeBand.g6_8 => 64.0,
      AivoGradeBand.g9_12 => 56.0,
    };

    final colors = AivoGamificationColors.badgeColorsForTier(tier);
    final hasProgress = progress != null && progressTotal != null;
    final progressPercent = hasProgress
        ? (progress! / progressTotal!).clamp(0.0, 1.0)
        : null;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(borderRadius),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isLocked
                ? theme.colorScheme.surfaceContainerLow
                : theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: isLocked
                  ? theme.colorScheme.outline.withValues(alpha: 0.2)
                  : colors.primary.withValues(alpha: 0.3),
            ),
            boxShadow: isLocked
                ? null
                : [
                    BoxShadow(
                      color: colors.primary.withValues(alpha: 0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          child: Row(
            children: [
              // Badge
              AivoAchievementBadge(
                tier: tier,
                icon: icon,
                emoji: emoji,
                size: badgeSize,
                isLocked: isLocked,
              ),

              const SizedBox(width: 16),

              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title
                    Text(
                      title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: isLocked
                            ? theme.colorScheme.onSurfaceVariant
                            : null,
                      ),
                    ),

                    const SizedBox(height: 4),

                    // Description
                    Text(
                      description,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),

                    const SizedBox(height: 8),

                    // Progress or rewards
                    if (hasProgress && !isLocked && unlockedAt == null) ...[
                      // Progress bar
                      Row(
                        children: [
                          Expanded(
                            child: Container(
                              height: 6,
                              decoration: BoxDecoration(
                                color: colors.primary.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(3),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(3),
                                child: TweenAnimationBuilder<double>(
                                  tween: Tween(begin: 0, end: progressPercent!),
                                  duration:
                                      AivoMotion.durationFor(gradeBand).base,
                                  builder: (context, value, _) {
                                    return FractionallySizedBox(
                                      widthFactor: value,
                                      alignment: Alignment.centerLeft,
                                      child: Container(color: colors.primary),
                                    );
                                  },
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '$progress / $progressTotal',
                            style: theme.textTheme.labelSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: colors.primary,
                            ),
                          ),
                        ],
                      ),
                    ] else ...[
                      // Rewards row
                      Row(
                        children: [
                          if (xpReward != null && xpReward! > 0) ...[
                            Icon(
                              Icons.star_rounded,
                              size: 16,
                              color: AivoGamificationColors.xpPrimary,
                            ),
                            const SizedBox(width: 2),
                            Text(
                              '+$xpReward XP',
                              style: theme.textTheme.labelSmall?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: AivoGamificationColors.xpPrimary,
                              ),
                            ),
                          ],
                          if (coinReward != null && coinReward! > 0) ...[
                            if (xpReward != null && xpReward! > 0)
                              const SizedBox(width: 12),
                            Icon(
                              Icons.monetization_on_rounded,
                              size: 16,
                              color: AivoGamificationColors.coinGold,
                            ),
                            const SizedBox(width: 2),
                            Text(
                              '+$coinReward',
                              style: theme.textTheme.labelSmall?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: AivoGamificationColors.coinGold,
                              ),
                            ),
                          ],
                          const Spacer(),
                          // Unlocked timestamp
                          if (unlockedAt != null)
                            Text(
                              _formatDate(unlockedAt!),
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays} days ago';
    return '${date.month}/${date.day}/${date.year}';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT UNLOCK ANIMATION
// ══════════════════════════════════════════════════════════════════════════════

/// Animated achievement unlock overlay.
///
/// Shows a celebration animation when an achievement is unlocked.
class AivoAchievementUnlock extends StatefulWidget {
  const AivoAchievementUnlock({
    super.key,
    required this.title,
    required this.tier,
    this.icon,
    this.emoji,
    this.xpReward,
    this.onDismiss,
  });

  /// Achievement title.
  final String title;

  /// Badge tier.
  final BadgeTier tier;

  /// Badge icon.
  final IconData? icon;

  /// Badge emoji.
  final String? emoji;

  /// XP reward.
  final int? xpReward;

  /// Callback when dismissed.
  final VoidCallback? onDismiss;

  @override
  State<AivoAchievementUnlock> createState() => _AivoAchievementUnlockState();
}

class _AivoAchievementUnlockState extends State<AivoAchievementUnlock>
    with TickerProviderStateMixin {
  late AnimationController _scaleController;
  late AnimationController _particleController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _particleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _scaleAnimation = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.0, end: 1.2).chain(CurveTween(curve: Curves.easeOut)),
        weight: 60,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.2, end: 1.0).chain(CurveTween(curve: Curves.easeInOut)),
        weight: 40,
      ),
    ]).animate(_scaleController);

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _scaleController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOut),
      ),
    );

    _scaleController.forward();
    _particleController.forward();
  }

  @override
  void dispose() {
    _scaleController.dispose();
    _particleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AivoGamificationColors.badgeColorsForTier(widget.tier);

    return GestureDetector(
      onTap: widget.onDismiss,
      child: AnimatedBuilder(
        animation: _scaleController,
        builder: (context, child) {
          return Opacity(
            opacity: _fadeAnimation.value,
            child: Container(
              color: Colors.black54,
              child: Center(
                child: Transform.scale(
                  scale: _scaleAnimation.value,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Badge with particles
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          // Particle burst
                          AnimatedBuilder(
                            animation: _particleController,
                            builder: (context, child) {
                              return CustomPaint(
                                size: const Size(200, 200),
                                painter: _ParticlePainter(
                                  progress: _particleController.value,
                                  colors: AivoGamificationColors.confettiColors,
                                ),
                              );
                            },
                          ),

                          // Badge
                          AivoAchievementBadge(
                            tier: widget.tier,
                            icon: widget.icon,
                            emoji: widget.emoji,
                            size: 120,
                            showShine: true,
                          ),
                        ],
                      ),

                      const SizedBox(height: 24),

                      // Title
                      Text(
                        'Achievement Unlocked!',
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),

                      const SizedBox(height: 8),

                      Text(
                        widget.title,
                        style: theme.textTheme.headlineSmall?.copyWith(
                          color: colors.light,
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
                      ),

                      // XP reward
                      if (widget.xpReward != null) ...[
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: AivoGamificationColors.xpPrimary
                                .withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.star_rounded,
                                color: AivoGamificationColors.xpPrimary,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '+${widget.xpReward} XP',
                                style: theme.textTheme.titleMedium?.copyWith(
                                  color: AivoGamificationColors.xpPrimary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      const SizedBox(height: 24),

                      // Tap to dismiss
                      Text(
                        'Tap anywhere to continue',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.white54,
                        ),
                      ),
                    ],
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

/// Particle burst painter for achievement unlock.
class _ParticlePainter extends CustomPainter {
  _ParticlePainter({
    required this.progress,
    required this.colors,
  });

  final double progress;
  final List<Color> colors;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final random = math.Random(42); // Fixed seed for consistent particles

    for (int i = 0; i < 20; i++) {
      final angle = (i / 20) * 2 * math.pi + random.nextDouble() * 0.5;
      final distance = 50 + progress * 100 * (0.5 + random.nextDouble() * 0.5);
      final particleSize = (1 - progress) * (4 + random.nextDouble() * 4);

      final x = center.dx + math.cos(angle) * distance;
      final y = center.dy + math.sin(angle) * distance - progress * 30;

      final paint = Paint()
        ..color = colors[i % colors.length].withValues(alpha: 1 - progress)
        ..style = PaintingStyle.fill;

      canvas.drawCircle(Offset(x, y), particleSize, paint);
    }
  }

  @override
  bool shouldRepaint(_ParticlePainter oldDelegate) {
    return progress != oldDelegate.progress;
  }
}
