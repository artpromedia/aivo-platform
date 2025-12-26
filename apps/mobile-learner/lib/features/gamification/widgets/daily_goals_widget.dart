/// Daily Goals Widget
///
/// Displays daily progress rings for XP, lessons, and time
library;

import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../gamification_models.dart';

/// Widget displaying three daily goal rings
class DailyGoalsWidget extends StatelessWidget {
  /// Today's XP earned
  final int todayXP;

  /// Daily XP goal
  final int dailyGoalXP;

  /// Lessons completed today
  final int lessonsCompleted;

  /// Daily lessons goal
  final int dailyGoalLessons;

  /// Minutes learned today
  final int minutesLearned;

  /// Daily minutes goal
  final int dailyGoalMinutes;

  const DailyGoalsWidget({
    super.key,
    required this.todayXP,
    required this.dailyGoalXP,
    required this.lessonsCompleted,
    required this.dailyGoalLessons,
    required this.minutesLearned,
    required this.dailyGoalMinutes,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.shade200,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.flag, color: Colors.blue),
              const SizedBox(width: 8),
              Text(
                'Daily Goals',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _GoalRing(
                icon: Icons.star,
                label: 'XP',
                current: todayXP,
                goal: dailyGoalXP,
                color: Colors.amber,
              ),
              _GoalRing(
                icon: Icons.menu_book,
                label: 'Lessons',
                current: lessonsCompleted,
                goal: dailyGoalLessons,
                color: Colors.blue,
              ),
              _GoalRing(
                icon: Icons.timer,
                label: 'Minutes',
                current: minutesLearned,
                goal: dailyGoalMinutes,
                color: Colors.green,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _GoalRing extends StatefulWidget {
  final IconData icon;
  final String label;
  final int current;
  final int goal;
  final Color color;

  const _GoalRing({
    required this.icon,
    required this.label,
    required this.current,
    required this.goal,
    required this.color,
  });

  @override
  State<_GoalRing> createState() => _GoalRingState();
}

class _GoalRingState extends State<_GoalRing>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  double get _progress => widget.goal > 0
      ? (widget.current / widget.goal).clamp(0, 1)
      : 0;

  bool get _isComplete => widget.current >= widget.goal && widget.goal > 0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );

    _animation = Tween<double>(
      begin: 0,
      end: _progress,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    ));

    _controller.forward();
  }

  @override
  void didUpdateWidget(_GoalRing oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.current != widget.current || oldWidget.goal != widget.goal) {
      _animation = Tween<double>(
        begin: _animation.value,
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

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AnimatedBuilder(
          animation: _animation,
          builder: (context, child) {
            return SizedBox(
              width: 80,
              height: 80,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Background ring
                  CustomPaint(
                    size: const Size(80, 80),
                    painter: _RingPainter(
                      progress: 1,
                      color: Colors.grey.shade200,
                      strokeWidth: 8,
                    ),
                  ),
                  // Progress ring
                  CustomPaint(
                    size: const Size(80, 80),
                    painter: _RingPainter(
                      progress: _animation.value,
                      color: widget.color,
                      strokeWidth: 8,
                    ),
                  ),
                  // Center content
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (_isComplete)
                        Icon(
                          Icons.check_circle,
                          color: widget.color,
                          size: 24,
                        )
                      else
                        Icon(
                          widget.icon,
                          color: widget.color,
                          size: 20,
                        ),
                      Text(
                        '${widget.current}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: widget.color,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
        const SizedBox(height: 8),
        Text(
          widget.label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: Colors.grey.shade700,
          ),
        ),
        Text(
          '${widget.current}/${widget.goal}',
          style: TextStyle(
            fontSize: 11,
            color: Colors.grey.shade500,
          ),
        ),
      ],
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

/// Compact daily goals widget for home screen
class DailyGoalsCompact extends StatelessWidget {
  final DailyProgress progress;
  final VoidCallback? onTap;

  const DailyGoalsCompact({
    super.key,
    required this.progress,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final allComplete = progress.dailyGoalReached;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: allComplete ? Colors.green.shade50 : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: allComplete ? Colors.green.shade300 : Colors.grey.shade200,
          ),
        ),
        child: Row(
          children: [
            Icon(
              allComplete ? Icons.check_circle : Icons.flag,
              color: allComplete ? Colors.green : Colors.blue,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    allComplete ? 'Daily goals complete!' : 'Daily Goals',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: allComplete ? Colors.green.shade700 : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      _MiniProgress(
                        progress: progress.xpProgress,
                        color: Colors.amber,
                      ),
                      const SizedBox(width: 8),
                      _MiniProgress(
                        progress: progress.lessonsProgress,
                        color: Colors.blue,
                      ),
                      const SizedBox(width: 8),
                      _MiniProgress(
                        progress: progress.minutesProgress,
                        color: Colors.green,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: Colors.grey.shade400,
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniProgress extends StatelessWidget {
  final double progress;
  final Color color;

  const _MiniProgress({
    required this.progress,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        height: 4,
        decoration: BoxDecoration(
          color: Colors.grey.shade200,
          borderRadius: BorderRadius.circular(2),
        ),
        child: FractionallySizedBox(
          alignment: Alignment.centerLeft,
          widthFactor: progress.clamp(0, 1),
          child: Container(
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ),
      ),
    );
  }
}
