/// Movement Exercise Widget - ND-3.2
///
/// Guides users through movement-based regulation activities
/// like shaking, stretching, and cross-body movements.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../offline/cached_activities.dart';

class MovementExerciseWidget extends StatefulWidget {
  final CachedActivity activity;
  final bool autoStart;
  final void Function(bool completed, int durationSeconds)? onComplete;

  const MovementExerciseWidget({
    super.key,
    required this.activity,
    this.autoStart = false,
    this.onComplete,
  });

  @override
  State<MovementExerciseWidget> createState() => _MovementExerciseWidgetState();
}

class _MovementExerciseWidgetState extends State<MovementExerciseWidget>
    with TickerProviderStateMixin {
  int _currentStepIndex = 0;
  int _stepSecondsRemaining = 0;
  int _totalSeconds = 0;
  bool _isRunning = false;
  bool _isCompleted = false;
  Timer? _timer;

  late AnimationController _bounceController;
  late AnimationController _rotateController;

  @override
  void initState() {
    super.initState();
    
    _bounceController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );

    _rotateController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );

    _stepSecondsRemaining = _currentStep.durationSeconds;

    if (widget.autoStart) {
      WidgetsBinding.instance.addPostFrameCallback((_) => start());
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _bounceController.dispose();
    _rotateController.dispose();
    super.dispose();
  }

  ActivityStep get _currentStep => widget.activity.steps[_currentStepIndex];
  bool get _isLastStep => _currentStepIndex >= widget.activity.steps.length - 1;

  void start() {
    if (_isRunning) return;

    setState(() {
      _isRunning = true;
      _currentStepIndex = 0;
      _stepSecondsRemaining = _currentStep.durationSeconds;
      _totalSeconds = 0;
    });

    _startAnimations();
    _startStepTimer();
  }

  void pause() {
    setState(() => _isRunning = false);
    _timer?.cancel();
    _stopAnimations();
  }

  void resume() {
    setState(() => _isRunning = true);
    _startAnimations();
    _startStepTimer();
  }

  void stop() {
    _timer?.cancel();
    _stopAnimations();

    widget.onComplete?.call(_isCompleted, _totalSeconds);

    setState(() {
      _isRunning = false;
      _currentStepIndex = 0;
      _stepSecondsRemaining = widget.activity.steps.first.durationSeconds;
    });
  }

  void _startAnimations() {
    final intensity = widget.activity.customData?['intensity'] as String? ?? 'medium';
    
    if (intensity == 'high') {
      _bounceController.repeat(reverse: true);
    }
    
    _rotateController.repeat();
  }

  void _stopAnimations() {
    _bounceController.stop();
    _rotateController.stop();
  }

  void _startStepTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || !_isRunning) {
        timer.cancel();
        return;
      }

      setState(() {
        _totalSeconds++;
        _stepSecondsRemaining--;

        if (_stepSecondsRemaining <= 0) {
          if (_isLastStep) {
            _complete();
          } else {
            _advanceToNextStep();
          }
        }
      });

      // Pulse haptic for high-intensity movements
      if (widget.activity.customData?['intensity'] == 'high') {
        HapticFeedback.lightImpact();
      }
    });
  }

  void _advanceToNextStep() {
    HapticFeedback.mediumImpact();

    setState(() {
      _currentStepIndex++;
      _stepSecondsRemaining = _currentStep.durationSeconds;
    });

    // Restart animations for new step
    _stopAnimations();
    _startAnimations();
  }

  void skipStep() {
    if (_isLastStep) {
      _complete();
    } else {
      _advanceToNextStep();
    }
  }

  void _complete() {
    _timer?.cancel();
    _stopAnimations();
    HapticFeedback.heavyImpact();

    setState(() {
      _isRunning = false;
      _isCompleted = true;
    });

    widget.onComplete?.call(true, _totalSeconds);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Step progress
        _buildStepProgress(),

        const SizedBox(height: 24),

        // Main content
        Expanded(
          child: _isCompleted ? _buildCompletionView() : _buildStepView(),
        ),

        const SizedBox(height: 24),

        // Controls
        if (!_isCompleted) _buildControls(),
      ],
    );
  }

  Widget _buildStepProgress() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: List.generate(widget.activity.steps.length, (index) {
          final isActive = index == _currentStepIndex;
          final isCompleted = index < _currentStepIndex;

          return Expanded(
            child: Container(
              height: 6,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(3),
                color: isCompleted
                    ? Colors.orange
                    : isActive
                        ? Colors.orange.withOpacity(0.5)
                        : Colors.grey.withOpacity(0.3),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildStepView() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Animated icon
          _buildAnimatedIcon(),

          const SizedBox(height: 32),

          // Instruction
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.orange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.orange.withOpacity(0.3)),
            ),
            child: Column(
              children: [
                Text(
                  _currentStep.instruction,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                // Timer
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.timer_outlined, size: 20, color: Colors.orange),
                    const SizedBox(width: 8),
                    Text(
                      '${_stepSecondsRemaining}s',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Colors.orange,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 32),

          // Movement cues
          _buildMovementCues(),
        ],
      ),
    );
  }

  Widget _buildAnimatedIcon() {
    final visualCue = _currentStep.visualCue ?? '';
    final icon = _getIconForCue(visualCue);

    return AnimatedBuilder(
      animation: _bounceController,
      builder: (context, child) {
        final bounce = _bounceController.isAnimating
            ? 10 * _bounceController.value
            : 0.0;

        return Transform.translate(
          offset: Offset(0, -bounce),
          child: AnimatedBuilder(
            animation: _rotateController,
            builder: (context, child) {
              // Only rotate for certain movements
              final shouldRotate = visualCue == 'body' ||
                  visualCue == 'alternate' ||
                  visualCue == 'shoulders';
              final rotation = shouldRotate
                  ? 0.05 * _rotateController.value * 2 * 3.14159
                  : 0.0;

              return Transform.rotate(
                angle: rotation,
                child: Container(
                  width: 140,
                  height: 140,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Colors.orange.shade300,
                        Colors.orange.shade600,
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.orange.withOpacity(0.3),
                        blurRadius: 20,
                        spreadRadius: 5,
                      ),
                    ],
                  ),
                  child: Icon(icon, size: 64, color: Colors.white),
                ),
              );
            },
          ),
        );
      },
    );
  }

  IconData _getIconForCue(String cue) {
    switch (cue.toLowerCase()) {
      case 'hands':
        return Icons.back_hand;
      case 'arms':
        return Icons.accessibility;
      case 'legs':
        return Icons.directions_walk;
      case 'body':
        return Icons.accessibility_new;
      case 'still':
        return Icons.self_improvement;
      case 'reach_up':
        return Icons.arrow_upward;
      case 'bend_left':
        return Icons.arrow_back;
      case 'bend_right':
        return Icons.arrow_forward;
      case 'shoulders':
        return Icons.sync;
      case 'head':
        return Icons.face;
      case 'relax':
        return Icons.spa;
      case 'elephant':
        return Icons.pets;
      case 'bunny':
        return Icons.cruelty_free;
      case 'snake':
        return Icons.waves;
      case 'bird':
        return Icons.flight;
      case 'cat':
        return Icons.hotel;
      case 'stand':
        return Icons.person;
      case 'cross_right':
      case 'cross_left':
        return Icons.compare_arrows;
      case 'alternate':
        return Icons.swap_horiz;
      case 'stop':
        return Icons.stop_circle_outlined;
      default:
        return Icons.directions_run;
    }
  }

  Widget _buildMovementCues() {
    final intensity = widget.activity.customData?['intensity'] as String? ?? 'medium';
    
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildIntensityChip(intensity),
        const SizedBox(width: 12),
        Chip(
          avatar: const Icon(Icons.speed, size: 16),
          label: Text('Step ${_currentStepIndex + 1}/${widget.activity.steps.length}'),
          backgroundColor: Colors.grey.withOpacity(0.1),
          side: BorderSide.none,
        ),
      ],
    );
  }

  Widget _buildIntensityChip(String intensity) {
    final colors = {
      'low': Colors.green,
      'medium': Colors.orange,
      'high': Colors.red,
    };
    final labels = {
      'low': 'Gentle',
      'medium': 'Moderate',
      'high': 'Energetic',
    };

    return Chip(
      avatar: Icon(
        Icons.flash_on,
        size: 16,
        color: colors[intensity] ?? Colors.orange,
      ),
      label: Text(labels[intensity] ?? 'Moderate'),
      backgroundColor: (colors[intensity] ?? Colors.orange).withOpacity(0.1),
      side: BorderSide.none,
    );
  }

  Widget _buildCompletionView() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text('💪', style: TextStyle(fontSize: 80)),
        const SizedBox(height: 24),
        Text(
          'Great job moving!',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'You completed ${widget.activity.name}',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Time: ${_formatDuration(_totalSeconds)}',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 32),
        _buildPostMovementTip(),
      ],
    );
  }

  Widget _buildPostMovementTip() {
    final tips = [
      'Take a moment to notice how your body feels now.',
      'Your body released a lot of energy - great job!',
      'Movement helps your brain calm down and focus.',
      'Notice if you feel different than before you started.',
    ];
    
    final tip = tips[_totalSeconds % tips.length];

    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: Colors.orange.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.orange.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.lightbulb_outline, color: Colors.orange),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              tip,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildControls() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (!_isRunning && _totalSeconds == 0)
            FilledButton.icon(
              onPressed: start,
              icon: const Icon(Icons.play_arrow),
              label: const Text('Start'),
              style: FilledButton.styleFrom(
                minimumSize: const Size(140, 56),
                backgroundColor: Colors.orange,
              ),
            ),
          if (_isRunning) ...[
            OutlinedButton.icon(
              onPressed: stop,
              icon: const Icon(Icons.stop),
              label: const Text('Stop'),
            ),
            const SizedBox(width: 12),
            OutlinedButton.icon(
              onPressed: skipStep,
              icon: const Icon(Icons.skip_next),
              label: const Text('Skip'),
            ),
            const SizedBox(width: 12),
            FilledButton.icon(
              onPressed: pause,
              icon: const Icon(Icons.pause),
              label: const Text('Pause'),
              style: FilledButton.styleFrom(backgroundColor: Colors.orange),
            ),
          ],
          if (!_isRunning && _totalSeconds > 0 && !_isCompleted)
            FilledButton.icon(
              onPressed: resume,
              icon: const Icon(Icons.play_arrow),
              label: const Text('Resume'),
              style: FilledButton.styleFrom(backgroundColor: Colors.orange),
            ),
        ],
      ),
    );
  }

  String _formatDuration(int seconds) {
    final minutes = seconds ~/ 60;
    final secs = seconds % 60;
    if (minutes > 0) {
      return '${minutes}m ${secs}s';
    }
    return '${secs}s';
  }
}
