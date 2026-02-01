/// Aivo Coins Widget
///
/// Coins/currency display with gold styling and animations.
/// Uses Sunshine-400 (#FBBF24) gold with shadow (#B45309).
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme/aivo_theme.dart';
import 'aivo_gamification_colors.dart';

// ══════════════════════════════════════════════════════════════════════════════
// COIN ICON
// ══════════════════════════════════════════════════════════════════════════════

/// Animated coin icon with spin effect.
///
/// Features:
/// - Gold gradient styling
/// - Optional shine animation
/// - 3D spin effect on tap
class AivoCoin extends StatefulWidget {
  const AivoCoin({
    super.key,
    this.size = 32,
    this.showShine = true,
    this.onTap,
    this.semanticLabel,
  });

  /// Coin size.
  final double size;

  /// Whether to show shine animation.
  final bool showShine;

  /// Callback when tapped.
  final VoidCallback? onTap;

  /// Semantic label.
  final String? semanticLabel;

  @override
  State<AivoCoin> createState() => _AivoCoinState();
}

class _AivoCoinState extends State<AivoCoin>
    with SingleTickerProviderStateMixin {
  late AnimationController _shineController;

  @override
  void initState() {
    super.initState();
    _shineController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    );
    if (widget.showShine) {
      _shineController.repeat();
    }
  }

  @override
  void didUpdateWidget(AivoCoin oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.showShine && !_shineController.isAnimating) {
      _shineController.repeat();
    } else if (!widget.showShine && _shineController.isAnimating) {
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
    return Semantics(
      label: widget.semanticLabel ?? 'Coin',
      button: widget.onTap != null,
      child: GestureDetector(
        onTap: widget.onTap,
        child: SizedBox(
          width: widget.size,
          height: widget.size,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Coin base
              Container(
                width: widget.size,
                height: widget.size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AivoGamificationColors.coinHighlight,
                      AivoGamificationColors.coinGold,
                      AivoGamificationColors.coinShadow,
                    ],
                    stops: [0.0, 0.4, 1.0],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AivoGamificationColors.coinShadow.withValues(alpha: 0.4),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
              ),

              // Inner detail ring
              Container(
                width: widget.size * 0.75,
                height: widget.size * 0.75,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AivoGamificationColors.coinShadow.withValues(alpha: 0.4),
                    width: 1.5,
                  ),
                ),
                child: Center(
                  child: Icon(
                    Icons.auto_awesome,
                    size: widget.size * 0.35,
                    color: AivoGamificationColors.coinShadow,
                  ),
                ),
              ),

              // Shine effect
              if (widget.showShine)
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
// COIN COUNTER
// ══════════════════════════════════════════════════════════════════════════════

/// Animated coin counter with number display.
///
/// Features:
/// - Gold styling
/// - Animated count changes
/// - Compact and full modes
class AivoCoinCounter extends StatefulWidget {
  const AivoCoinCounter({
    super.key,
    required this.count,
    this.compact = false,
    this.showAnimation = true,
    this.gradeBand,
    this.onTap,
  });

  /// Coin count.
  final int count;

  /// Compact display mode.
  final bool compact;

  /// Whether to animate changes.
  final bool showAnimation;

  /// Grade band.
  final AivoGradeBand? gradeBand;

  /// Callback when tapped.
  final VoidCallback? onTap;

  @override
  State<AivoCoinCounter> createState() => _AivoCoinCounterState();
}

class _AivoCoinCounterState extends State<AivoCoinCounter>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  int _previousCount = 0;
  int _displayCount = 0;

  @override
  void initState() {
    super.initState();
    _previousCount = widget.count;
    _displayCount = widget.count;
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _scaleAnimation = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 1.0, end: 1.2),
        weight: 50,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.2, end: 1.0),
        weight: 50,
      ),
    ]).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));

    _controller.addListener(() {
      final progress = _controller.value;
      setState(() {
        _displayCount = (_previousCount +
                (widget.count - _previousCount) * progress)
            .round();
      });
    });
  }

  @override
  void didUpdateWidget(AivoCoinCounter oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.count != oldWidget.count && widget.showAnimation) {
      _previousCount = oldWidget.count;
      _controller.forward(from: 0);
    } else if (!widget.showAnimation) {
      _displayCount = widget.count;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradeBand = widget.gradeBand ?? AivoTheme.gradeBandOf(context);

    final coinSize = widget.compact
        ? switch (gradeBand) {
            AivoGradeBand.k5 => 20.0,
            AivoGradeBand.g6_8 => 18.0,
            AivoGradeBand.g9_12 => 16.0,
          }
        : switch (gradeBand) {
            AivoGradeBand.k5 => 28.0,
            AivoGradeBand.g6_8 => 24.0,
            AivoGradeBand.g9_12 => 20.0,
          };

    final textStyle = widget.compact
        ? theme.textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.bold,
            fontFeatures: [const FontFeature.tabularFigures()],
            color: AivoGamificationColors.coinGold,
          )
        : theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
            fontFeatures: [const FontFeature.tabularFigures()],
            color: AivoGamificationColors.coinGold,
          );

    return GestureDetector(
      onTap: widget.onTap,
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _scaleAnimation.value,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                AivoCoin(
                  size: coinSize,
                  showShine: !widget.compact,
                ),
                SizedBox(width: widget.compact ? 4 : 8),
                Text(
                  _formatCount(_displayCount),
                  style: textStyle,
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _formatCount(int count) {
    if (count >= 1000000) {
      return '${(count / 1000000).toStringAsFixed(1)}M';
    }
    if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}K';
    }
    return count.toString();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COIN GAIN ANIMATION
// ══════════════════════════════════════════════════════════════════════════════

/// Animated coin gain overlay.
///
/// Shows coins flying up when earned.
class AivoCoinGainOverlay extends StatefulWidget {
  const AivoCoinGainOverlay({
    super.key,
    required this.amount,
    this.onComplete,
    this.startPosition,
  });

  /// Amount of coins gained.
  final int amount;

  /// Callback when animation completes.
  final VoidCallback? onComplete;

  /// Starting position for coin animation.
  final Offset? startPosition;

  @override
  State<AivoCoinGainOverlay> createState() => _AivoCoinGainOverlayState();
}

class _AivoCoinGainOverlayState extends State<AivoCoinGainOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late List<_CoinParticle> _particles;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    // Create coin particles
    final random = math.Random();
    final numCoins = math.min(widget.amount, 10);
    _particles = List.generate(numCoins, (index) {
      return _CoinParticle(
        delay: index * 0.1,
        offsetX: (random.nextDouble() - 0.5) * 100,
        speedY: 150 + random.nextDouble() * 50,
        rotation: random.nextDouble() * math.pi * 2,
        rotationSpeed: (random.nextDouble() - 0.5) * 4,
      );
    });

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
    final size = MediaQuery.of(context).size;
    final startPos = widget.startPosition ?? Offset(size.width / 2, size.height / 2);

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Stack(
          children: [
            // Coin particles
            ..._particles.map((particle) {
              final adjustedProgress = ((_controller.value - particle.delay) / 
                  (1 - particle.delay)).clamp(0.0, 1.0);
              
              if (adjustedProgress <= 0) return const SizedBox.shrink();

              final y = startPos.dy - particle.speedY * adjustedProgress;
              final x = startPos.dx + particle.offsetX * adjustedProgress;
              final opacity = (1 - adjustedProgress * 0.8).clamp(0.0, 1.0);
              final rotation = particle.rotation + 
                  particle.rotationSpeed * adjustedProgress;

              return Positioned(
                left: x - 16,
                top: y - 16,
                child: Opacity(
                  opacity: opacity,
                  child: Transform.rotate(
                    angle: rotation,
                    child: const AivoCoin(size: 32, showShine: false),
                  ),
                ),
              );
            }),

            // Amount display
            Positioned(
              left: 0,
              right: 0,
              top: startPos.dy - 100 - (100 * _controller.value),
              child: Opacity(
                opacity: (1 - _controller.value).clamp(0.0, 1.0),
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: AivoGamificationColors.coinGold.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AivoGamificationColors.coinGold.withValues(alpha: 0.5),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const AivoCoin(size: 24, showShine: false),
                        const SizedBox(width: 8),
                        Text(
                          '+${widget.amount}',
                          style: theme.textTheme.titleLarge?.copyWith(
                            color: AivoGamificationColors.coinGold,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

/// Coin particle data for animation.
class _CoinParticle {
  _CoinParticle({
    required this.delay,
    required this.offsetX,
    required this.speedY,
    required this.rotation,
    required this.rotationSpeed,
  });

  final double delay;
  final double offsetX;
  final double speedY;
  final double rotation;
  final double rotationSpeed;
}

// ══════════════════════════════════════════════════════════════════════════════
// COIN STACK
// ══════════════════════════════════════════════════════════════════════════════

/// Stack of coins showing currency amount.
///
/// Visual representation of coin quantity.
class AivoCoinStack extends StatelessWidget {
  const AivoCoinStack({
    super.key,
    required this.amount,
    this.maxCoins = 5,
    this.coinSize = 32,
    this.stackOffset = 4,
  });

  /// Coin amount.
  final int amount;

  /// Maximum visible coins in stack.
  final int maxCoins;

  /// Size of each coin.
  final double coinSize;

  /// Vertical offset between coins.
  final double stackOffset;

  @override
  Widget build(BuildContext context) {
    final visibleCoins = math.min(
      math.max(1, (amount / 100).ceil()),
      maxCoins,
    );

    return SizedBox(
      width: coinSize,
      height: coinSize + (visibleCoins - 1) * stackOffset,
      child: Stack(
        children: List.generate(visibleCoins, (index) {
          return Positioned(
            bottom: index * stackOffset,
            child: AivoCoin(
              size: coinSize,
              showShine: index == visibleCoins - 1,
            ),
          );
        }),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PRICE TAG
// ══════════════════════════════════════════════════════════════════════════════

/// Price tag showing cost in coins.
///
/// Used for shop items and purchases.
class AivoCoinPriceTag extends StatelessWidget {
  const AivoCoinPriceTag({
    super.key,
    required this.price,
    this.originalPrice,
    this.canAfford = true,
    this.compact = false,
    this.gradeBand,
  });

  /// Current price.
  final int price;

  /// Original price (for showing discount).
  final int? originalPrice;

  /// Whether user can afford this.
  final bool canAfford;

  /// Compact mode.
  final bool compact;

  /// Grade band.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final coinSize = compact ? 16.0 : 24.0;
    final hasDiscount = originalPrice != null && originalPrice! > price;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 12,
        vertical: compact ? 4 : 6,
      ),
      decoration: BoxDecoration(
        color: canAfford
            ? AivoGamificationColors.coinGold.withValues(alpha: 0.15)
            : theme.colorScheme.errorContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(compact ? 12 : 16),
        border: Border.all(
          color: canAfford
              ? AivoGamificationColors.coinGold.withValues(alpha: 0.3)
              : theme.colorScheme.error.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AivoCoin(
            size: coinSize,
            showShine: false,
          ),
          const SizedBox(width: 4),
          if (hasDiscount) ...[
            Text(
              originalPrice.toString(),
              style: theme.textTheme.labelSmall?.copyWith(
                decoration: TextDecoration.lineThrough,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(width: 4),
          ],
          Text(
            price.toString(),
            style: (compact
                    ? theme.textTheme.labelMedium
                    : theme.textTheme.labelLarge)
                ?.copyWith(
              fontWeight: FontWeight.bold,
              color: canAfford
                  ? AivoGamificationColors.coinGold
                  : theme.colorScheme.error,
            ),
          ),
        ],
      ),
    );
  }
}
