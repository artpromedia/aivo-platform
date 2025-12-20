/// ND-2.3: Calming Intervention Widget
///
/// Implements various calming interventions:
/// - Breathing exercises (box breathing, 4-7-8)
/// - Grounding (5-4-3-2-1 technique)
/// - Movement breaks
/// - Sensory exercises
/// - Encouragement and affirmations

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_common/theme/aivo_brand.dart';

import 'emotional_state_provider.dart';

/// Widget that displays and guides through a calming intervention.
class CalmingInterventionWidget extends StatelessWidget {
  final SuggestedIntervention intervention;
  final VoidCallback onComplete;
  final VoidCallback? onSkip;

  const CalmingInterventionWidget({
    super.key,
    required this.intervention,
    required this.onComplete,
    this.onSkip,
  });

  @override
  Widget build(BuildContext context) {
    switch (intervention.interventionType) {
      case 'BREATHING':
        return BreathingExerciseWidget(
          intervention: intervention,
          onComplete: onComplete,
          onSkip: onSkip,
        );
      case 'GROUNDING':
        return GroundingExerciseWidget(
          intervention: intervention,
          onComplete: onComplete,
          onSkip: onSkip,
        );
      case 'MOVEMENT':
        return MovementBreakWidget(
          intervention: intervention,
          onComplete: onComplete,
          onSkip: onSkip,
        );
      case 'SENSORY':
        return SensoryExerciseWidget(
          intervention: intervention,
          onComplete: onComplete,
          onSkip: onSkip,
        );
      case 'ENCOURAGEMENT':
        return EncouragementWidget(
          intervention: intervention,
          onComplete: onComplete,
          onSkip: onSkip,
        );
      case 'BREAK':
        return BreakTimerWidget(
          intervention: intervention,
          onComplete: onComplete,
          onSkip: onSkip,
        );
      default:
        return GenericInterventionWidget(
          intervention: intervention,
          onComplete: onComplete,
          onSkip: onSkip,
        );
    }
  }
}

/// Breathing exercise widget with animated circle.
class BreathingExerciseWidget extends StatefulWidget {
  final SuggestedIntervention intervention;
  final VoidCallback onComplete;
  final VoidCallback? onSkip;

  const BreathingExerciseWidget({
    super.key,
    required this.intervention,
    required this.onComplete,
    this.onSkip,
  });

  @override
  State<BreathingExerciseWidget> createState() => _BreathingExerciseWidgetState();
}

class _BreathingExerciseWidgetState extends State<BreathingExerciseWidget>
    with TickerProviderStateMixin {
  late AnimationController _breathController;
  late Animation<double> _breathAnimation;
  int _breathCount = 0;
  int _totalBreaths = 4;
  String _phase = 'inhale';
  Timer? _phaseTimer;

  // Breathing pattern (in seconds)
  static const int inhaleTime = 4;
  static const int holdTime = 4;
  static const int exhaleTime = 4;
  static const int pauseTime = 2;

  @override
  void initState() {
    super.initState();
    _totalBreaths = widget.intervention.durationSeconds ~/ 14; // Full cycle
    _setupBreathAnimation();
    _startBreathing();
  }

  void _setupBreathAnimation() {
    _breathController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: inhaleTime),
    );
    _breathAnimation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _breathController, curve: Curves.easeInOut),
    );
  }

  void _startBreathing() {
    _runPhase('inhale');
  }

  void _runPhase(String phase) {
    if (!mounted) return;

    setState(() => _phase = phase);
    HapticFeedback.lightImpact();

    switch (phase) {
      case 'inhale':
        _breathController.duration = const Duration(seconds: inhaleTime);
        _breathController.forward(from: 0);
        _phaseTimer = Timer(const Duration(seconds: inhaleTime), () {
          _runPhase('hold');
        });
        break;
      case 'hold':
        _phaseTimer = Timer(const Duration(seconds: holdTime), () {
          _runPhase('exhale');
        });
        break;
      case 'exhale':
        _breathController.duration = const Duration(seconds: exhaleTime);
        _breathController.reverse();
        _phaseTimer = Timer(const Duration(seconds: exhaleTime), () {
          _runPhase('pause');
        });
        break;
      case 'pause':
        _breathCount++;
        if (_breathCount >= _totalBreaths) {
          widget.onComplete();
        } else {
          _phaseTimer = Timer(const Duration(seconds: pauseTime), () {
            _runPhase('inhale');
          });
        }
        break;
    }
  }

  @override
  void dispose() {
    _phaseTimer?.cancel();
    _breathController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Progress indicator
          Text(
            'Breath ${_breathCount + 1} of $_totalBreaths',
            style: TextStyle(
              fontSize: 16,
              color: Colors.white.withOpacity(0.7),
            ),
          ),
          const SizedBox(height: 40),

          // Breathing circle
          AnimatedBuilder(
            animation: _breathAnimation,
            builder: (context, child) {
              return Container(
                width: 200 * _breathAnimation.value,
                height: 200 * _breathAnimation.value,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AivoBrand.sky[400]!,
                      AivoBrand.sky[600]!.withOpacity(0.6),
                    ],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AivoBrand.calmingBlue.withOpacity(0.4),
                      blurRadius: 30,
                      spreadRadius: 10,
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 40),

          // Phase instruction
          Text(
            _getPhaseInstruction(),
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),

          Text(
            _getPhaseDescription(),
            style: TextStyle(
              fontSize: 18,
              color: Colors.white.withOpacity(0.8),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 60),

          // Skip button
          if (widget.onSkip != null)
            TextButton(
              onPressed: widget.onSkip,
              child: Text(
                'Skip',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.white.withOpacity(0.5),
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _getPhaseInstruction() {
    switch (_phase) {
      case 'inhale':
        return 'Breathe In';
      case 'hold':
        return 'Hold';
      case 'exhale':
        return 'Breathe Out';
      case 'pause':
        return 'Rest';
      default:
        return '';
    }
  }

  String _getPhaseDescription() {
    switch (_phase) {
      case 'inhale':
        return 'Fill your lungs slowly...';
      case 'hold':
        return 'Keep the air inside...';
      case 'exhale':
        return 'Let it all go...';
      case 'pause':
        return 'Prepare for the next breath...';
      default:
        return '';
    }
  }
}

/// 5-4-3-2-1 Grounding exercise widget.
class GroundingExerciseWidget extends StatefulWidget {
  final SuggestedIntervention intervention;
  final VoidCallback onComplete;
  final VoidCallback? onSkip;

  const GroundingExerciseWidget({
    super.key,
    required this.intervention,
    required this.onComplete,
    this.onSkip,
  });

  @override
  State<GroundingExerciseWidget> createState() => _GroundingExerciseWidgetState();
}

class _GroundingExerciseWidgetState extends State<GroundingExerciseWidget> {
  int _currentStep = 0;
  int _currentCount = 5;

  final List<_GroundingStep> _steps = [
    _GroundingStep(
      sense: 'See',
      count: 5,
      instruction: 'Look around and name 5 things you can SEE',
      icon: Icons.visibility_rounded,
      color: AivoBrand.calmingBlue,
    ),
    _GroundingStep(
      sense: 'Touch',
      count: 4,
      instruction: 'Notice 4 things you can TOUCH',
      icon: Icons.touch_app_rounded,
      color: AivoBrand.calmingGreen,
    ),
    _GroundingStep(
      sense: 'Hear',
      count: 3,
      instruction: 'Listen for 3 things you can HEAR',
      icon: Icons.hearing_rounded,
      color: AivoBrand.sunshine[500]!,
    ),
    _GroundingStep(
      sense: 'Smell',
      count: 2,
      instruction: 'Notice 2 things you can SMELL',
      icon: Icons.air_rounded,
      color: AivoBrand.calmingPurple,
    ),
    _GroundingStep(
      sense: 'Taste',
      count: 1,
      instruction: 'Notice 1 thing you can TASTE',
      icon: Icons.restaurant_rounded,
      color: AivoBrand.coral[500]!,
    ),
  ];

  void _recordItem() {
    HapticFeedback.lightImpact();
    setState(() {
      _currentCount--;
      if (_currentCount <= 0) {
        _currentStep++;
        if (_currentStep >= _steps.length) {
          widget.onComplete();
        } else {
          _currentCount = _steps[_currentStep].count;
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_currentStep >= _steps.length) {
      return const SizedBox.shrink();
    }

    final step = _steps[_currentStep];

    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Progress dots
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(_steps.length, (index) {
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: index <= _currentStep
                      ? _steps[index].color
                      : Colors.white.withOpacity(0.3),
                ),
              );
            }),
          ),
          const SizedBox(height: 40),

          // Sense icon
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: step.color.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              step.icon,
              size: 50,
              color: step.color,
            ),
          ),
          const SizedBox(height: 24),

          // Number remaining
          Text(
            '$_currentCount',
            style: TextStyle(
              fontSize: 72,
              fontWeight: FontWeight.bold,
              color: step.color,
            ),
          ),
          const SizedBox(height: 16),

          // Instruction
          Text(
            step.instruction,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w500,
              color: Colors.white,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 48),

          // Tap to count button
          GestureDetector(
            onTap: _recordItem,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              decoration: BoxDecoration(
                color: step.color,
                borderRadius: BorderRadius.circular(30),
              ),
              child: const Text(
                'Tap when you find one',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(height: 40),

          // Skip button
          if (widget.onSkip != null)
            TextButton(
              onPressed: widget.onSkip,
              child: Text(
                'Skip',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.white.withOpacity(0.5),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _GroundingStep {
  final String sense;
  final int count;
  final String instruction;
  final IconData icon;
  final Color color;

  const _GroundingStep({
    required this.sense,
    required this.count,
    required this.instruction,
    required this.icon,
    required this.color,
  });
}

/// Movement break widget.
class MovementBreakWidget extends StatefulWidget {
  final SuggestedIntervention intervention;
  final VoidCallback onComplete;
  final VoidCallback? onSkip;

  const MovementBreakWidget({
    super.key,
    required this.intervention,
    required this.onComplete,
    this.onSkip,
  });

  @override
  State<MovementBreakWidget> createState() => _MovementBreakWidgetState();
}

class _MovementBreakWidgetState extends State<MovementBreakWidget> {
  int _currentActivity = 0;
  int _countdown = 10;
  Timer? _timer;

  final List<_MovementActivity> _activities = [
    _MovementActivity(
      name: 'Stretch Up',
      instruction: 'Reach your hands high above your head!',
      icon: Icons.accessibility_new_rounded,
    ),
    _MovementActivity(
      name: 'Touch Toes',
      instruction: 'Bend down and try to touch your toes.',
      icon: Icons.sports_gymnastics_rounded,
    ),
    _MovementActivity(
      name: 'Shake It Out',
      instruction: 'Shake your hands and feet!',
      icon: Icons.vibration_rounded,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _countdown--;
        if (_countdown <= 0) {
          HapticFeedback.mediumImpact();
          _currentActivity++;
          if (_currentActivity >= _activities.length) {
            _timer?.cancel();
            widget.onComplete();
          } else {
            _countdown = 10;
          }
        }
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_currentActivity >= _activities.length) {
      return const SizedBox.shrink();
    }

    final activity = _activities[_currentActivity];

    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Progress
          Text(
            'Activity ${_currentActivity + 1} of ${_activities.length}',
            style: TextStyle(
              fontSize: 16,
              color: Colors.white.withOpacity(0.7),
            ),
          ),
          const SizedBox(height: 40),

          // Activity icon
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: AivoBrand.calmingGreen.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              activity.icon,
              size: 60,
              color: AivoBrand.calmingGreen,
            ),
          ),
          const SizedBox(height: 24),

          // Countdown
          Text(
            '$_countdown',
            style: TextStyle(
              fontSize: 64,
              fontWeight: FontWeight.bold,
              color: AivoBrand.calmingGreen,
            ),
          ),
          const SizedBox(height: 16),

          // Activity name
          Text(
            activity.name,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),

          // Instruction
          Text(
            activity.instruction,
            style: TextStyle(
              fontSize: 18,
              color: Colors.white.withOpacity(0.8),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 60),

          // Skip button
          if (widget.onSkip != null)
            TextButton(
              onPressed: widget.onSkip,
              child: Text(
                'Skip',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.white.withOpacity(0.5),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _MovementActivity {
  final String name;
  final String instruction;
  final IconData icon;

  const _MovementActivity({
    required this.name,
    required this.instruction,
    required this.icon,
  });
}

/// Sensory exercise widget.
class SensoryExerciseWidget extends StatefulWidget {
  final SuggestedIntervention intervention;
  final VoidCallback onComplete;
  final VoidCallback? onSkip;

  const SensoryExerciseWidget({
    super.key,
    required this.intervention,
    required this.onComplete,
    this.onSkip,
  });

  @override
  State<SensoryExerciseWidget> createState() => _SensoryExerciseWidgetState();
}

class _SensoryExerciseWidgetState extends State<SensoryExerciseWidget> {
  int _tapCount = 0;
  static const int _targetTaps = 10;

  void _onTap() {
    HapticFeedback.lightImpact();
    setState(() {
      _tapCount++;
      if (_tapCount >= _targetTaps) {
        widget.onComplete();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final progress = _tapCount / _targetTaps;

    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text(
            'Tap the circle gently',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Feel the soft vibration',
            style: TextStyle(
              fontSize: 18,
              color: Colors.white.withOpacity(0.8),
            ),
          ),
          const SizedBox(height: 60),

          // Tappable circle with progress
          GestureDetector(
            onTap: _onTap,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: SweepGradient(
                  colors: [
                    const Color(0xFF9C27B0),
                    const Color(0xFF9C27B0).withOpacity(0.3),
                    const Color(0xFF9C27B0),
                  ],
                  stops: [0, progress, 1],
                ),
              ),
              child: Center(
                child: Container(
                  width: 160,
                  height: 160,
                  decoration: const BoxDecoration(
                    color: Color(0xFF1A1A2E),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '${_targetTaps - _tapCount}',
                      style: const TextStyle(
                        fontSize: 48,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF9C27B0),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 60),

          // Skip button
          if (widget.onSkip != null)
            TextButton(
              onPressed: widget.onSkip,
              child: Text(
                'Skip',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.white.withOpacity(0.5),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Encouragement widget with affirmations.
class EncouragementWidget extends StatefulWidget {
  final SuggestedIntervention intervention;
  final VoidCallback onComplete;
  final VoidCallback? onSkip;

  const EncouragementWidget({
    super.key,
    required this.intervention,
    required this.onComplete,
    this.onSkip,
  });

  @override
  State<EncouragementWidget> createState() => _EncouragementWidgetState();
}

class _EncouragementWidgetState extends State<EncouragementWidget> {
  int _currentIndex = 0;
  late List<String> _affirmations;

  @override
  void initState() {
    super.initState();
    _affirmations = widget.intervention.content.affirmations ??
        [
          'You are doing great!',
          'It\'s okay to take your time.',
          'Everyone learns at their own pace.',
          'You\'ve got this!',
          'Keep going, you\'re making progress!',
        ];
  }

  void _nextAffirmation() {
    setState(() {
      _currentIndex++;
      if (_currentIndex >= _affirmations.length) {
        widget.onComplete();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_currentIndex >= _affirmations.length) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Progress dots
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(_affirmations.length, (index) {
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: index <= _currentIndex
                      ? const Color(0xFFFFD700)
                      : Colors.white.withOpacity(0.3),
                ),
              );
            }),
          ),
          const SizedBox(height: 60),

          // Star icon
          const Icon(
            Icons.star_rounded,
            size: 80,
            color: Color(0xFFFFD700),
          ),
          const SizedBox(height: 40),

          // Affirmation text
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: Text(
              _affirmations[_currentIndex],
              key: ValueKey(_currentIndex),
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 60),

          // Next button
          ElevatedButton(
            onPressed: _nextAffirmation,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFFD700),
              foregroundColor: Colors.black87,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(30),
              ),
            ),
            child: Text(
              _currentIndex < _affirmations.length - 1 ? 'Next' : 'Done',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 40),

          // Skip button
          if (widget.onSkip != null)
            TextButton(
              onPressed: widget.onSkip,
              child: Text(
                'Skip',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.white.withOpacity(0.5),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Break timer widget.
class BreakTimerWidget extends StatefulWidget {
  final SuggestedIntervention intervention;
  final VoidCallback onComplete;
  final VoidCallback? onSkip;

  const BreakTimerWidget({
    super.key,
    required this.intervention,
    required this.onComplete,
    this.onSkip,
  });

  @override
  State<BreakTimerWidget> createState() => _BreakTimerWidgetState();
}

class _BreakTimerWidgetState extends State<BreakTimerWidget> {
  late int _remainingSeconds;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _remainingSeconds = widget.intervention.durationSeconds;
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _remainingSeconds--;
        if (_remainingSeconds <= 0) {
          _timer?.cancel();
          HapticFeedback.mediumImpact();
          widget.onComplete();
        }
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final minutes = _remainingSeconds ~/ 60;
    final seconds = _remainingSeconds % 60;
    final progress = 1 - (_remainingSeconds / widget.intervention.durationSeconds);

    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.pause_circle_outline_rounded,
            size: 60,
            color: Color(0xFF64B5F6),
          ),
          const SizedBox(height: 24),

          const Text(
            'Take a Break',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),

          Text(
            widget.intervention.content.instructions,
            style: TextStyle(
              fontSize: 18,
              color: Colors.white.withOpacity(0.8),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 48),

          // Timer circle
          Stack(
            alignment: Alignment.center,
            children: [
              SizedBox(
                width: 180,
                height: 180,
                child: CircularProgressIndicator(
                  value: progress,
                  strokeWidth: 8,
                  backgroundColor: Colors.white.withOpacity(0.2),
                  valueColor: const AlwaysStoppedAnimation<Color>(
                    Color(0xFF64B5F6),
                  ),
                ),
              ),
              Text(
                '$minutes:${seconds.toString().padLeft(2, '0')}',
                style: const TextStyle(
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 60),

          // Early finish button
          TextButton(
            onPressed: () {
              _timer?.cancel();
              widget.onComplete();
            },
            child: const Text(
              'I\'m ready to continue',
              style: TextStyle(
                fontSize: 18,
                color: Color(0xFF64B5F6),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Generic intervention widget for unknown types.
class GenericInterventionWidget extends StatelessWidget {
  final SuggestedIntervention intervention;
  final VoidCallback onComplete;
  final VoidCallback? onSkip;

  const GenericInterventionWidget({
    super.key,
    required this.intervention,
    required this.onComplete,
    this.onSkip,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.favorite_rounded,
            size: 60,
            color: Color(0xFFE91E63),
          ),
          const SizedBox(height: 24),

          Text(
            intervention.name,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),

          Text(
            intervention.content.instructions,
            style: TextStyle(
              fontSize: 18,
              color: Colors.white.withOpacity(0.8),
            ),
            textAlign: TextAlign.center,
          ),

          if (intervention.content.steps != null) ...[
            const SizedBox(height: 32),
            ...intervention.content.steps!.map((step) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        decoration: const BoxDecoration(
                          color: Color(0xFFE91E63),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.check,
                          size: 16,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          step,
                          style: const TextStyle(
                            fontSize: 16,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                )),
          ],

          const SizedBox(height: 48),

          ElevatedButton(
            onPressed: onComplete,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE91E63),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(30),
              ),
            ),
            child: const Text(
              'Done',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),

          if (onSkip != null) ...[
            const SizedBox(height: 20),
            TextButton(
              onPressed: onSkip,
              child: Text(
                'Skip',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.white.withOpacity(0.5),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
