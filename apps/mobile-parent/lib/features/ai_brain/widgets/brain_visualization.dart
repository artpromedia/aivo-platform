/// Brain Visualization Widget
///
/// Animated brain graphic showing AI's current focus.
library;


import 'package:flutter/material.dart';

import '../models/ai_brain_state.dart';

/// Visual brain representation showing current AI focus.
class BrainVisualization extends StatefulWidget {
  const BrainVisualization({
    super.key,
    required this.focus,
    this.confidenceLevel = 0.75,
    this.size = 200,
    this.animate = true,
    this.onTap,
  });

  final AIFocus focus;
  final double confidenceLevel;
  final double size;
  final bool animate;
  final VoidCallback? onTap;

  @override
  State<BrainVisualization> createState() => _BrainVisualizationState();
}

class _BrainVisualizationState extends State<BrainVisualization>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    if (widget.animate) {
      _controller.repeat(reverse: true);
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

    return GestureDetector(
      onTap: widget.onTap,
      child: AnimatedBuilder(
        animation: _pulseAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: widget.animate ? _pulseAnimation.value : 1.0,
            child: child,
          );
        },
        child: SizedBox(
          width: widget.size,
          height: widget.size,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Outer glow
              Container(
                width: widget.size,
                height: widget.size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      _getFocusColor(widget.focus.reason).withValues(alpha: 0.3),
                      _getFocusColor(widget.focus.reason).withValues(alpha: 0.0),
                    ],
                  ),
                ),
              ),
              // Main brain circle
              Container(
                width: widget.size * 0.7,
                height: widget.size * 0.7,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      _getFocusColor(widget.focus.reason).withValues(alpha: 0.8),
                      _getFocusColor(widget.focus.reason),
                    ],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: _getFocusColor(widget.focus.reason).withValues(alpha: 0.4),
                      blurRadius: 20,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: Center(
                  child: Icon(
                    Icons.psychology,
                    size: widget.size * 0.35,
                    color: Colors.white,
                  ),
                ),
              ),
              // Confidence ring
              SizedBox(
                width: widget.size * 0.85,
                height: widget.size * 0.85,
                child: CircularProgressIndicator(
                  value: widget.confidenceLevel,
                  strokeWidth: 4,
                  backgroundColor: theme.colorScheme.surfaceContainerHighest,
                  valueColor: AlwaysStoppedAnimation(
                    _getConfidenceColor(widget.confidenceLevel),
                  ),
                ),
              ),
              // Focus label
              Positioned(
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: Text(
                    widget.focus.topic,
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getFocusColor(FocusReason reason) {
    switch (reason) {
      case FocusReason.scheduledLesson:
        return Colors.blue;
      case FocusReason.remediationNeeded:
        return Colors.orange;
      case FocusReason.parentRequest:
        return Colors.purple;
      case FocusReason.teacherAssigned:
        return Colors.teal;
      case FocusReason.adaptiveRecommendation:
        return Colors.indigo;
      case FocusReason.studentChoice:
        return Colors.green;
    }
  }

  Color _getConfidenceColor(double level) {
    if (level >= 0.8) return Colors.green;
    if (level >= 0.6) return Colors.blue;
    if (level >= 0.4) return Colors.orange;
    return Colors.red;
  }
}

/// Mini brain indicator for compact display.
class MiniBrainIndicator extends StatelessWidget {
  const MiniBrainIndicator({
    super.key,
    required this.isActive,
    this.size = 32,
  });

  final bool isActive;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isActive
            ? Colors.blue.withValues(alpha: 0.2)
            : Colors.grey.withValues(alpha: 0.2),
      ),
      child: Icon(
        Icons.psychology,
        size: size * 0.6,
        color: isActive ? Colors.blue : Colors.grey,
      ),
    );
  }
}
