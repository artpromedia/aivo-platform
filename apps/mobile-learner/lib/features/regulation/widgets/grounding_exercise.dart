/// Grounding Exercise Widget - ND-3.2
///
/// Interactive 5-4-3-2-1 grounding exercise and variations.
/// Guides users through sensory awareness activities.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../offline/cached_activities.dart';

class GroundingExerciseWidget extends StatefulWidget {
  final CachedActivity activity;
  final bool autoStart;
  final void Function(bool completed, int durationSeconds)? onComplete;

  const GroundingExerciseWidget({
    super.key,
    required this.activity,
    this.autoStart = false,
    this.onComplete,
  });

  @override
  State<GroundingExerciseWidget> createState() => _GroundingExerciseWidgetState();
}

class _GroundingExerciseWidgetState extends State<GroundingExerciseWidget>
    with TickerProviderStateMixin {
  int _currentStepIndex = 0;
  int _stepSecondsRemaining = 0;
  int _totalSeconds = 0;
  bool _isRunning = false;
  bool _isCompleted = false;
  Timer? _timer;
  
  late AnimationController _progressController;
  late AnimationController _iconController;

  @override
  void initState() {
    super.initState();
    _progressController = AnimationController(
      vsync: this,
      duration: Duration(seconds: _currentStep.durationSeconds),
    );
    _iconController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    
    _stepSecondsRemaining = _currentStep.durationSeconds;

    if (widget.autoStart) {
      WidgetsBinding.instance.addPostFrameCallback((_) => start());
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _progressController.dispose();
    _iconController.dispose();
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

    _startStepTimer();
  }

  void pause() {
    setState(() => _isRunning = false);
    _timer?.cancel();
    _progressController.stop();
  }

  void resume() {
    setState(() => _isRunning = true);
    _startStepTimer();
  }

  void stop() {
    _timer?.cancel();
    _progressController.stop();
    
    widget.onComplete?.call(_isCompleted, _totalSeconds);
    
    setState(() {
      _isRunning = false;
      _currentStepIndex = 0;
      _stepSecondsRemaining = widget.activity.steps.first.durationSeconds;
    });
  }

  void _startStepTimer() {
    _progressController.duration = Duration(seconds: _stepSecondsRemaining);
    _progressController.forward(from: 0);
    
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
    });
  }

  void _advanceToNextStep() {
    HapticFeedback.lightImpact();
    
    _iconController.forward(from: 0);
    
    setState(() {
      _currentStepIndex++;
      _stepSecondsRemaining = _currentStep.durationSeconds;
    });

    _progressController.duration = Duration(seconds: _currentStep.durationSeconds);
    _progressController.forward(from: 0);
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
    HapticFeedback.mediumImpact();
    
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
        // Step indicator
        _buildStepIndicator(),
        
        const SizedBox(height: 24),

        // Main content area
        Expanded(
          child: _isCompleted
              ? _buildCompletionView()
              : _buildStepView(),
        ),

        const SizedBox(height: 24),

        // Controls
        if (!_isCompleted) _buildControls(),
      ],
    );
  }

  Widget _buildStepIndicator() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: List.generate(widget.activity.steps.length, (index) {
          final isActive = index == _currentStepIndex;
          final isCompleted = index < _currentStepIndex;
          
          return Expanded(
            child: Container(
              height: 4,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(2),
                color: isCompleted
                    ? Theme.of(context).colorScheme.primary
                    : isActive
                        ? Theme.of(context).colorScheme.primary.withOpacity(0.5)
                        : Theme.of(context).colorScheme.surfaceContainerHighest,
              ),
              child: isActive
                  ? AnimatedBuilder(
                      animation: _progressController,
                      builder: (context, child) {
                        return FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: _progressController.value,
                          child: Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(2),
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                        );
                      },
                    )
                  : null,
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
          // Step icon
          _buildStepIcon(),
          
          const SizedBox(height: 32),

          // Instruction
          _buildInstruction(),

          const SizedBox(height: 24),

          // Timer
          _buildTimer(),

          const SizedBox(height: 32),

          // Interactive input area (for 5-4-3-2-1)
          if (_is54321Activity()) _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildStepIcon() {
    final visualCue = _currentStep.visualCue ?? '';
    final icon = _getIconForVisualCue(visualCue);
    final color = _getColorForStep(_currentStepIndex);

    return ScaleTransition(
      scale: Tween<double>(begin: 0.8, end: 1.0).animate(
        CurvedAnimation(parent: _iconController, curve: Curves.elasticOut),
      ),
      child: Container(
        width: 120,
        height: 120,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              color.withOpacity(0.3),
              color.withOpacity(0.1),
            ],
          ),
          border: Border.all(color: color, width: 3),
        ),
        child: Icon(icon, size: 56, color: color),
      ),
    );
  }

  IconData _getIconForVisualCue(String cue) {
    switch (cue.toLowerCase()) {
      case 'eye':
      case 'see':
        return Icons.visibility;
      case 'hand':
      case 'feel':
        return Icons.touch_app;
      case 'ear':
      case 'hear':
        return Icons.hearing;
      case 'nose':
      case 'smell':
        return Icons.air;
      case 'tongue':
      case 'taste':
        return Icons.restaurant;
      case 'feet':
      case 'feet_flat':
        return Icons.accessibility_new;
      case 'legs':
        return Icons.directions_walk;
      case 'belly':
        return Icons.self_improvement;
      case 'shoulders':
        return Icons.accessibility;
      case 'face':
        return Icons.face;
      case 'head':
        return Icons.psychology;
      case 'roots_growing':
      case 'deep_roots':
        return Icons.park;
      case 'tree':
        return Icons.nature;
      case 'safe':
        return Icons.favorite;
      default:
        return Icons.spa;
    }
  }

  Color _getColorForStep(int stepIndex) {
    final colors = [
      Colors.blue,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.pink,
      Colors.teal,
    ];
    return colors[stepIndex % colors.length];
  }

  Widget _buildInstruction() {
    return Column(
      children: [
        Text(
          'Step ${_currentStepIndex + 1} of ${widget.activity.steps.length}',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          _currentStep.instruction,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildTimer() {
    final color = _getColorForStep(_currentStepIndex);
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(30),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.timer_outlined, color: color, size: 20),
          const SizedBox(width: 8),
          Text(
            '${_stepSecondsRemaining}s',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  bool _is54321Activity() {
    return widget.activity.id == 'grounding_54321';
  }

  Widget _buildInputArea() {
    // For 5-4-3-2-1, show placeholders for user to mentally note things
    final counts = [5, 4, 3, 2, 1];
    final count = _currentStepIndex < counts.length
        ? counts[_currentStepIndex]
        : 1;

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      alignment: WrapAlignment.center,
      children: List.generate(count, (index) {
        return Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            border: Border.all(
              color: _getColorForStep(_currentStepIndex).withOpacity(0.5),
              width: 2,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Text(
              '${index + 1}',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: _getColorForStep(_currentStepIndex),
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildCompletionView() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text('🌟', style: TextStyle(fontSize: 80)),
        const SizedBox(height: 24),
        Text(
          'You did it!',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'You completed the grounding exercise',
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
        _buildCompletionAffirmation(),
      ],
    );
  }

  Widget _buildCompletionAffirmation() {
    final affirmations = [
      'You are present in this moment.',
      'You are safe and grounded.',
      'You handled that beautifully.',
      'Your senses connect you to now.',
      'You have the strength to be calm.',
    ];
    
    final affirmation = affirmations[_totalSeconds % affirmations.length];

    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.green.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.format_quote, color: Colors.green),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              affirmation,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontStyle: FontStyle.italic,
                color: Colors.green.shade700,
              ),
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
            ),
          ],
          if (!_isRunning && _totalSeconds > 0 && !_isCompleted)
            FilledButton.icon(
              onPressed: resume,
              icon: const Icon(Icons.play_arrow),
              label: const Text('Resume'),
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

/// Standalone 5-4-3-2-1 Grounding Widget
class FiveToOneGroundingWidget extends StatefulWidget {
  final void Function(bool completed)? onComplete;

  const FiveToOneGroundingWidget({
    super.key,
    this.onComplete,
  });

  @override
  State<FiveToOneGroundingWidget> createState() => _FiveToOneGroundingWidgetState();
}

class _FiveToOneGroundingWidgetState extends State<FiveToOneGroundingWidget> {
  int _currentSenseIndex = 0;
  final List<List<String>> _responses = [[], [], [], [], []];

  static const _senses = [
    (5, '👀', 'SEE', 'Look around and name 5 things you can see'),
    (4, '✋', 'FEEL', 'Touch and name 4 things you can feel'),
    (3, '👂', 'HEAR', 'Listen and name 3 things you can hear'),
    (2, '👃', 'SMELL', 'Notice and name 2 things you can smell'),
    (1, '👅', 'TASTE', 'Name 1 thing you can taste'),
  ];

  @override
  Widget build(BuildContext context) {
    if (_currentSenseIndex >= _senses.length) {
      return _buildCompletionView();
    }

    final sense = _senses[_currentSenseIndex];
    final currentResponses = _responses[_currentSenseIndex];
    final isComplete = currentResponses.length >= sense.$1;

    return Column(
      children: [
        // Progress
        _buildProgress(),
        
        const SizedBox(height: 32),

        // Current sense
        Text(
          sense.$2,
          style: const TextStyle(fontSize: 64),
        ),
        const SizedBox(height: 16),
        Text(
          '${sense.$1} things you can ${sense.$3}',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          sense.$4,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          textAlign: TextAlign.center,
        ),

        const SizedBox(height: 32),

        // Response chips
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: List.generate(sense.$1, (index) {
            final hasResponse = index < currentResponses.length;
            return ActionChip(
              label: Text(hasResponse ? currentResponses[index] : 'Tap to add'),
              avatar: hasResponse
                  ? const Icon(Icons.check_circle, size: 18, color: Colors.green)
                  : const Icon(Icons.add_circle_outline, size: 18),
              onPressed: hasResponse
                  ? null
                  : () => _showAddResponseDialog(index),
            );
          }),
        ),

        const Spacer(),

        // Navigation
        Padding(
          padding: const EdgeInsets.all(24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (_currentSenseIndex > 0)
                TextButton.icon(
                  onPressed: () => setState(() => _currentSenseIndex--),
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Back'),
                )
              else
                const SizedBox(width: 100),
              
              FilledButton.icon(
                onPressed: isComplete ? _nextSense : null,
                icon: const Icon(Icons.arrow_forward),
                label: Text(_currentSenseIndex < _senses.length - 1 ? 'Next' : 'Finish'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildProgress() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: List.generate(_senses.length, (index) {
          final isActive = index == _currentSenseIndex;
          final isCompleted = index < _currentSenseIndex;
          
          return Expanded(
            child: Container(
              height: 8,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(4),
                color: isCompleted
                    ? Colors.green
                    : isActive
                        ? Colors.blue
                        : Colors.grey.withOpacity(0.3),
              ),
              child: Center(
                child: Text(
                  '${_senses[index].$1}',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: (isCompleted || isActive) ? Colors.white : Colors.grey,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  void _showAddResponseDialog(int index) {
    final controller = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('What do you ${_senses[_currentSenseIndex].$3.toLowerCase()}?'),
        content: TextField(
          controller: controller,
          autofocus: true,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(
            hintText: 'Type something...',
            border: OutlineInputBorder(),
          ),
          onSubmitted: (value) {
            if (value.isNotEmpty) {
              setState(() {
                _responses[_currentSenseIndex].add(value);
              });
              Navigator.pop(context);
            }
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                setState(() {
                  _responses[_currentSenseIndex].add(controller.text);
                });
                Navigator.pop(context);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _nextSense() {
    if (_currentSenseIndex < _senses.length - 1) {
      setState(() => _currentSenseIndex++);
    } else {
      widget.onComplete?.call(true);
    }
  }

  Widget _buildCompletionView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('🌟', style: TextStyle(fontSize: 80)),
          const SizedBox(height: 24),
          Text(
            'You are grounded!',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'You used all 5 senses to connect with the present moment',
            style: Theme.of(context).textTheme.bodyLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          FilledButton(
            onPressed: () => widget.onComplete?.call(true),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }
}
