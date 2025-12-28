/// Level Progress Ring Widget
/// 
/// Displays a circular progress indicator showing the player's current level
/// and XP progress towards the next level.
library;

import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../gamification_models.dart';

/// Size variants for the level progress ring
enum LevelRingSize { small, medium, large }

/// A circular progress ring showing the player's level and XP progress
class LevelProgressRing extends StatefulWidget {
  /// Current level
  final int level;
  
  /// Level title (e.g., "Rising Star")
  final String levelTitle;
  
  /// XP earned in current level
  final int currentXP;
  
  /// XP needed to reach next level
  final int xpToNextLevel;
  
  /// Size of the ring
  final LevelRingSize size;
  
  /// Whether to show the level title below
  final bool showTitle;
  
  /// Whether to animate on first build
  final bool animate;
  
  /// Optional avatar URL to show in center
  final String? avatarUrl;

  const LevelProgressRing({
    super.key,
    required this.level,
    required this.levelTitle,
    required this.currentXP,
    required this.xpToNextLevel,
    this.size = LevelRingSize.medium,
    this.showTitle = true,
    this.animate = true,
    this.avatarUrl,
  });

  @override
  State<LevelProgressRing> createState() => _LevelProgressRingState();
}

class _LevelProgressRingState extends State<LevelProgressRing>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _progressAnimation;

  double get _progress {
    if (widget.xpToNextLevel <= 0) return 1.0;
    return widget.currentXP / (widget.currentXP + widget.xpToNextLevel);
  }

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _progressAnimation = Tween<double>(
      begin: widget.animate ? 0.0 : _progress,
      end: _progress,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    ));

    if (widget.animate) {
      _controller.forward();
    } else {
      _controller.value = 1.0;
    }
  }

  @override
  void didUpdateWidget(LevelProgressRing oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.currentXP != widget.currentXP ||
        oldWidget.xpToNextLevel != widget.xpToNextLevel) {
      _progressAnimation = Tween<double>(
        begin: _progressAnimation.value,
        end: _progress,
      ).animate(CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOutCubic,
      ));
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  double get _ringSize {
    switch (widget.size) {
      case LevelRingSize.small:
        return 64;
      case LevelRingSize.medium:
        return 100;
      case LevelRingSize.large:
        return 140;
    }
  }

  double get _strokeWidth {
    switch (widget.size) {
      case LevelRingSize.small:
        return 4;
      case LevelRingSize.medium:
        return 6;
      case LevelRingSize.large:
        return 8;
    }
  }

  double get _fontSize {
    switch (widget.size) {
      case LevelRingSize.small:
        return 18;
      case LevelRingSize.medium:
        return 28;
      case LevelRingSize.large:
        return 36;
    }
  }

  @override
  Widget build(BuildContext context) {
    final levelConfig = GamificationConstants.getLevelConfig(widget.level);
    final theme = Theme.of(context);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedBuilder(
          animation: _progressAnimation,
          builder: (context, child) {
            return SizedBox(
              width: _ringSize,
              height: _ringSize,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Background ring
                  CustomPaint(
                    size: Size(_ringSize, _ringSize),
                    painter: _RingPainter(
                      progress: 1.0,
                      color: Colors.grey.shade200,
                      strokeWidth: _strokeWidth,
                    ),
                  ),
                  // Progress ring
                  CustomPaint(
                    size: Size(_ringSize, _ringSize),
                    painter: _RingPainter(
                      progress: _progressAnimation.value,
                      color: levelConfig.color,
                      strokeWidth: _strokeWidth,
                    ),
                  ),
                  // Center content
                  if (widget.avatarUrl != null)
                    ClipOval(
                      child: Image.network(
                        widget.avatarUrl!,
                        width: _ringSize - _strokeWidth * 4,
                        height: _ringSize - _strokeWidth * 4,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _buildLevelNumber(levelConfig),
                      ),
                    )
                  else
                    _buildLevelNumber(levelConfig),
                ],
              ),
            );
          },
        ),
        if (widget.showTitle) ...[
          const SizedBox(height: 8),
          Text(
            widget.levelTitle,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
          ),
          Text(
            '${widget.currentXP} / ${widget.currentXP + widget.xpToNextLevel} XP',
            style: theme.textTheme.bodySmall?.copyWith(
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildLevelNumber(LevelConfig levelConfig) {
    return Container(
      width: _ringSize - _strokeWidth * 4,
      height: _ringSize - _strokeWidth * 4,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            levelConfig.color.withOpacity(0.2),
            levelConfig.color.withOpacity(0.1),
          ],
        ),
      ),
      child: Center(
        child: Text(
          '${widget.level}',
          style: TextStyle(
            fontSize: _fontSize,
            fontWeight: FontWeight.bold,
            color: levelConfig.color,
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  final double progress;
  final Color color;
  final double strokeWidth;

  _RingPainter({
    required this.progress,
    required this.color,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final startAngle = -math.pi / 2;
    final sweepAngle = 2 * math.pi * progress;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(_RingPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.color != color ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}
