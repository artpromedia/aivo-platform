import 'dart:async';
import 'package:flutter/material.dart';
import '../sel_models.dart';

/// Breathing Animation Widget
///
/// Animated guide for breathing exercises with expanding/contracting circle.
class BreathingAnimation extends StatefulWidget {
  final BreathingPattern pattern;
  final VoidCallback onComplete;
  final ValueChanged<int>? onTick;

  const BreathingAnimation({
    super.key,
    required this.pattern,
    required this.onComplete,
    this.onTick,
  });

  @override
  State<BreathingAnimation> createState() => _BreathingAnimationState();
}

class _BreathingAnimationState extends State<BreathingAnimation>
    with TickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  int _currentCycle = 1;
  int _elapsedSeconds = 0;
  String _instruction = 'Get ready...';
  BreathingPhase _phase = BreathingPhase.ready;
  Timer? _timer;
  Timer? _tickTimer;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _startBreathingCycle();
    _startTickTimer();
  }

  void _setupAnimations() {
    final totalCycleTime = widget.pattern.inhaleSeconds +
        widget.pattern.holdSeconds +
        widget.pattern.exhaleSeconds +
        widget.pattern.pauseSeconds;

    _controller = AnimationController(
      vsync: this,
      duration: Duration(seconds: totalCycleTime),
    );

    // Calculate fractions for each phase
    final inhaleFraction = widget.pattern.inhaleSeconds / totalCycleTime;
    final holdFraction = widget.pattern.holdSeconds / totalCycleTime;
    final exhaleFraction = widget.pattern.exhaleSeconds / totalCycleTime;

    _scaleAnimation = TweenSequence<double>([
      // Inhale - expand
      TweenSequenceItem(
        tween: Tween(begin: 0.5, end: 1.0)
            .chain(CurveTween(curve: Curves.easeInOut)),
        weight: inhaleFraction,
      ),
      // Hold - stay expanded
      TweenSequenceItem(
        tween: ConstantTween(1.0),
        weight: holdFraction,
      ),
      // Exhale - contract
      TweenSequenceItem(
        tween: Tween(begin: 1.0, end: 0.5)
            .chain(CurveTween(curve: Curves.easeInOut)),
        weight: exhaleFraction,
      ),
      // Pause - stay contracted
      TweenSequenceItem(
        tween: ConstantTween(0.5),
        weight: 1 - inhaleFraction - holdFraction - exhaleFraction,
      ),
    ]).animate(_controller);

    _opacityAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.3, end: 0.8), weight: inhaleFraction),
      TweenSequenceItem(tween: ConstantTween(0.8), weight: holdFraction),
      TweenSequenceItem(tween: Tween(begin: 0.8, end: 0.3), weight: exhaleFraction),
      TweenSequenceItem(
        tween: ConstantTween(0.3),
        weight: 1 - inhaleFraction - holdFraction - exhaleFraction,
      ),
    ]).animate(_controller);

    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        if (_currentCycle < widget.pattern.cycles) {
          setState(() {
            _currentCycle++;
          });
          _controller.reset();
          _startBreathingCycle();
        } else {
          widget.onComplete();
        }
      }
    });
  }

  void _startTickTimer() {
    _tickTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _elapsedSeconds++;
      widget.onTick?.call(_elapsedSeconds);
    });
  }

  void _startBreathingCycle() {
    int currentSecond = 0;

    void updatePhase() {
      if (!mounted) return;

      final inhale = widget.pattern.inhaleSeconds;
      final hold = widget.pattern.holdSeconds;
      final exhale = widget.pattern.exhaleSeconds;
      final pause = widget.pattern.pauseSeconds;

      if (currentSecond < inhale) {
        setState(() {
          _phase = BreathingPhase.inhale;
          _instruction = 'Breathe in... ${inhale - currentSecond}';
        });
      } else if (currentSecond < inhale + hold) {
        setState(() {
          _phase = BreathingPhase.hold;
          _instruction = 'Hold... ${inhale + hold - currentSecond}';
        });
      } else if (currentSecond < inhale + hold + exhale) {
        setState(() {
          _phase = BreathingPhase.exhale;
          _instruction = 'Breathe out... ${inhale + hold + exhale - currentSecond}';
        });
      } else {
        setState(() {
          _phase = BreathingPhase.pause;
          _instruction = 'Pause... ${inhale + hold + exhale + pause - currentSecond}';
        });
      }

      currentSecond++;

      if (currentSecond <= inhale + hold + exhale + pause) {
        _timer = Timer(const Duration(seconds: 1), updatePhase);
      }
    }

    // Start immediately
    updatePhase();
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    _timer?.cancel();
    _tickTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Cycle indicator
        Text(
          'Cycle $_currentCycle of ${widget.pattern.cycles}',
          style: TextStyle(
            color: Colors.white.withOpacity(0.6),
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 32),

        // Breathing circle
        AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return Container(
              width: 250,
              height: 250,
              alignment: Alignment.center,
              child: Container(
                width: 200 * _scaleAnimation.value,
                height: 200 * _scaleAnimation.value,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _getPhaseColor().withOpacity(_opacityAnimation.value),
                  boxShadow: [
                    BoxShadow(
                      color: _getPhaseColor().withOpacity(0.3),
                      blurRadius: 30 * _scaleAnimation.value,
                      spreadRadius: 10 * _scaleAnimation.value,
                    ),
                  ],
                ),
                child: Center(
                  child: Icon(
                    _getPhaseIcon(),
                    size: 48,
                    color: Colors.white,
                  ),
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 48),

        // Instruction text
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          child: Text(
            _instruction,
            key: ValueKey(_instruction),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }

  Color _getPhaseColor() {
    switch (_phase) {
      case BreathingPhase.ready:
        return Colors.grey;
      case BreathingPhase.inhale:
        return const Color(0xFF06B6D4); // Cyan
      case BreathingPhase.hold:
        return const Color(0xFF8B5CF6); // Purple
      case BreathingPhase.exhale:
        return const Color(0xFF22C55E); // Green
      case BreathingPhase.pause:
        return const Color(0xFFF97316); // Orange
    }
  }

  IconData _getPhaseIcon() {
    switch (_phase) {
      case BreathingPhase.ready:
        return Icons.self_improvement;
      case BreathingPhase.inhale:
        return Icons.arrow_upward;
      case BreathingPhase.hold:
        return Icons.pause;
      case BreathingPhase.exhale:
        return Icons.arrow_downward;
      case BreathingPhase.pause:
        return Icons.circle_outlined;
    }
  }
}

enum BreathingPhase {
  ready,
  inhale,
  hold,
  exhale,
  pause,
}
