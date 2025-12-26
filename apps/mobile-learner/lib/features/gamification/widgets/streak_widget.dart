/// Streak Widget
///
/// Displays the current streak with flame animation and calendar view
library;

import 'package:flutter/material.dart';
import '../gamification_models.dart';

/// Main streak display widget
class StreakWidget extends StatelessWidget {
  /// Current streak count
  final int currentStreak;

  /// Longest streak achieved
  final int longestStreak;

  /// Number of freeze protections available
  final int freezesAvailable;

  /// Whether today's activity is completed
  final bool completedToday;

  /// Callback when user wants to use a freeze
  final VoidCallback? onUseFreeze;

  const StreakWidget({
    super.key,
    required this.currentStreak,
    required this.longestStreak,
    required this.freezesAvailable,
    required this.completedToday,
    this.onUseFreeze,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.orange.shade50,
            Colors.amber.shade50,
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.orange.shade200),
      ),
      child: Column(
        children: [
          // Streak count with flame
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _AnimatedFlame(size: 32, isActive: completedToday),
              const SizedBox(width: 8),
              Text(
                '$currentStreak',
                style: theme.textTheme.headlineLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.orange.shade700,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                'day streak',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: Colors.orange.shade600,
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Status message
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: completedToday ? Colors.green.shade100 : Colors.amber.shade100,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  completedToday ? Icons.check_circle : Icons.access_time,
                  size: 16,
                  color: completedToday ? Colors.green.shade700 : Colors.amber.shade700,
                ),
                const SizedBox(width: 4),
                Text(
                  completedToday ? 'Completed for today!' : 'Complete a lesson to keep your streak!',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: completedToday ? Colors.green.shade700 : Colors.amber.shade700,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Stats row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _StatItem(
                icon: Icons.emoji_events,
                iconColor: Colors.amber,
                label: 'Longest',
                value: '$longestStreak days',
              ),
              Container(
                width: 1,
                height: 40,
                color: Colors.orange.shade200,
              ),
              _StatItem(
                icon: Icons.ac_unit,
                iconColor: Colors.blue,
                label: 'Freezes',
                value: '$freezesAvailable left',
                onTap: freezesAvailable > 0 && !completedToday ? onUseFreeze : null,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final VoidCallback? onTap;

  const _StatItem({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final content = Column(
      children: [
        Icon(icon, color: iconColor, size: 24),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade600,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: content,
        ),
      );
    }

    return content;
  }
}

/// Animated flame icon
class _AnimatedFlame extends StatefulWidget {
  final double size;
  final bool isActive;

  const _AnimatedFlame({
    required this.size,
    required this.isActive,
  });

  @override
  State<_AnimatedFlame> createState() => _AnimatedFlameState();
}

class _AnimatedFlameState extends State<_AnimatedFlame>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 1.15,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));

    if (widget.isActive) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(_AnimatedFlame oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive && !_controller.isAnimating) {
      _controller.repeat(reverse: true);
    } else if (!widget.isActive && _controller.isAnimating) {
      _controller.stop();
      _controller.value = 0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _scaleAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnimation.value,
          child: Text(
            '🔥',
            style: TextStyle(
              fontSize: widget.size,
              color: widget.isActive ? null : Colors.grey,
            ),
          ),
        );
      },
    );
  }
}

/// Streak calendar showing the last N days
class StreakCalendar extends StatelessWidget {
  /// List of streak days to display
  final List<StreakDay> days;

  /// Number of days to show per row
  final int daysPerRow;

  const StreakCalendar({
    super.key,
    required this.days,
    this.daysPerRow = 7,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Day labels
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: ['M', 'T', 'W', 'T', 'F', 'S', 'S']
              .map((d) => SizedBox(
                    width: 32,
                    child: Text(
                      d,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ))
              .toList(),
        ),
        const SizedBox(height: 8),
        // Calendar grid
        Wrap(
          spacing: 4,
          runSpacing: 4,
          children: days.map((day) => _CalendarDay(day: day)).toList(),
        ),
      ],
    );
  }
}

class _CalendarDay extends StatelessWidget {
  final StreakDay day;

  const _CalendarDay({required this.day});

  @override
  Widget build(BuildContext context) {
    Color backgroundColor;
    Color borderColor;
    Widget? icon;

    if (day.completed) {
      backgroundColor = Colors.orange.shade400;
      borderColor = Colors.orange.shade600;
      icon = const Icon(Icons.local_fire_department, color: Colors.white, size: 16);
    } else if (day.isFreezeUsed) {
      backgroundColor = Colors.blue.shade100;
      borderColor = Colors.blue.shade300;
      icon = const Icon(Icons.ac_unit, color: Colors.blue, size: 16);
    } else if (day.isToday) {
      backgroundColor = Colors.grey.shade100;
      borderColor = Colors.orange.shade400;
    } else {
      backgroundColor = Colors.grey.shade100;
      borderColor = Colors.grey.shade300;
    }

    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: backgroundColor,
        border: Border.all(color: borderColor, width: day.isToday ? 2 : 1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Center(
        child: icon ??
            Text(
              '${day.date.day}',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: Colors.grey.shade600,
              ),
            ),
      ),
    );
  }
}
