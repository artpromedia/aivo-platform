/// Activity Player Widget - ND-3.2
///
/// Plays regulation activities step by step with visual guidance,
/// timer, and progress tracking. Works completely offline.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../offline/cached_activities.dart';
import '../../../offline/offline_regulation_service.dart';

class ActivityPlayerScreen extends ConsumerStatefulWidget {
  final CachedActivity activity;
  final String learnerId;

  const ActivityPlayerScreen({
    super.key,
    required this.activity,
    required this.learnerId,
  });

  @override
  ConsumerState<ActivityPlayerScreen> createState() => _ActivityPlayerScreenState();
}

class _ActivityPlayerScreenState extends ConsumerState<ActivityPlayerScreen>
    with TickerProviderStateMixin {
  int _currentStepIndex = 0;
  int _currentStepSeconds = 0;
  int _totalElapsedSeconds = 0;
  bool _isPlaying = false;
  bool _isCompleted = false;
  Timer? _timer;
  int? _moodBefore;
  int? _moodAfter;
  DateTime? _startTime;

  late AnimationController _breathingController;
  late AnimationController _progressController;

  @override
  void initState() {
    super.initState();
    _breathingController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    );
    _progressController = AnimationController(
      vsync: this,
      duration: Duration(seconds: widget.activity.durationSeconds),
    );
    _showMoodCheckIn();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _breathingController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  ActivityStep get _currentStep => widget.activity.steps[_currentStepIndex];

  void _showMoodCheckIn() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      showModalBottomSheet(
        context: context,
        isDismissible: false,
        enableDrag: false,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (context) => _MoodCheckInSheet(
          title: 'How are you feeling right now?',
          onMoodSelected: (mood) {
            setState(() => _moodBefore = mood);
            Navigator.pop(context);
          },
        ),
      );
    });
  }

  void _startActivity() {
    if (_moodBefore == null) {
      _showMoodCheckIn();
      return;
    }

    setState(() {
      _isPlaying = true;
      _startTime = DateTime.now();
    });

    _startStepTimer();
    _startBreathingAnimation();
    _progressController.forward();
  }

  void _startStepTimer() {
    _timer?.cancel();
    _currentStepSeconds = 0;

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }

      setState(() {
        _currentStepSeconds++;
        _totalElapsedSeconds++;

        if (_currentStepSeconds >= _currentStep.durationSeconds) {
          _advanceToNextStep();
        }
      });
    });
  }

  void _startBreathingAnimation() {
    if (widget.activity.category == ActivityCategory.breathing) {
      _breathingController.repeat(reverse: true);
    }
  }

  void _advanceToNextStep() {
    if (_currentStepIndex < widget.activity.steps.length - 1) {
      setState(() {
        _currentStepIndex++;
        _currentStepSeconds = 0;
      });
      
      // Haptic feedback for step change
      HapticFeedback.lightImpact();
    } else {
      _completeActivity();
    }
  }

  void _pauseActivity() {
    setState(() => _isPlaying = false);
    _timer?.cancel();
    _breathingController.stop();
    _progressController.stop();
  }

  void _resumeActivity() {
    setState(() => _isPlaying = true);
    _startStepTimer();
    if (widget.activity.category == ActivityCategory.breathing) {
      _breathingController.repeat(reverse: true);
    }
    _progressController.forward();
  }

  void _completeActivity() {
    _timer?.cancel();
    _breathingController.stop();
    
    setState(() {
      _isPlaying = false;
      _isCompleted = true;
    });

    // Haptic feedback for completion
    HapticFeedback.mediumImpact();

    // Show mood check-out
    showModalBottomSheet(
      context: context,
      isDismissible: false,
      enableDrag: false,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _MoodCheckInSheet(
        title: 'How are you feeling now?',
        onMoodSelected: (mood) {
          setState(() => _moodAfter = mood);
          Navigator.pop(context);
          _saveAndShowCompletion();
        },
      ),
    );
  }

  Future<void> _saveAndShowCompletion() async {
    // Record usage
    final service = ref.read(offlineRegulationServiceProvider);
    await service.recordActivityUsage(
      learnerId: widget.learnerId,
      activityId: widget.activity.id,
      durationSeconds: _totalElapsedSeconds,
      completed: true,
      moodBefore: _moodBefore,
      moodAfter: _moodAfter,
    );

    if (!mounted) return;

    // Show completion dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => _CompletionDialog(
        activity: widget.activity,
        moodBefore: _moodBefore!,
        moodAfter: _moodAfter!,
        durationSeconds: _totalElapsedSeconds,
        onDone: () {
          Navigator.of(context).pop();
          Navigator.of(context).pop();
        },
      ),
    );
  }

  void _stopActivity() async {
    _timer?.cancel();
    _breathingController.stop();

    // Record partial usage
    if (_startTime != null) {
      final service = ref.read(offlineRegulationServiceProvider);
      await service.recordActivityUsage(
        learnerId: widget.learnerId,
        activityId: widget.activity.id,
        durationSeconds: _totalElapsedSeconds,
        completed: false,
        stoppedAtStep: _currentStepIndex,
        moodBefore: _moodBefore,
      );
    }

    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _getBackgroundColor(),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => _showExitConfirmation(context),
        ),
        actions: [
          if (!_isCompleted)
            TextButton.icon(
              icon: const Icon(Icons.skip_next),
              label: const Text('Skip'),
              onPressed: _currentStepIndex < widget.activity.steps.length - 1
                  ? () {
                      _currentStepSeconds = _currentStep.durationSeconds;
                      _advanceToNextStep();
                    }
                  : null,
            ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // Activity title
              Text(
                widget.activity.name,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              
              // Overall progress
              _buildOverallProgress(),
              
              const Spacer(),

              // Main visual area
              _buildVisualArea(),

              const Spacer(),

              // Current instruction
              _buildInstructionCard(),

              const SizedBox(height: 24),

              // Step progress
              _buildStepProgress(),

              const SizedBox(height: 24),

              // Controls
              _buildControls(),
            ],
          ),
        ),
      ),
    );
  }

  Color _getBackgroundColor() {
    switch (widget.activity.category) {
      case ActivityCategory.breathing:
        return Colors.blue.shade50;
      case ActivityCategory.grounding:
        return Colors.green.shade50;
      case ActivityCategory.movement:
        return Colors.orange.shade50;
      case ActivityCategory.sensory:
        return Colors.purple.shade50;
      case ActivityCategory.sounds:
        return Colors.indigo.shade50;
      case ActivityCategory.counting:
        return Colors.teal.shade50;
      default:
        return Theme.of(context).colorScheme.surface;
    }
  }

  Widget _buildOverallProgress() {
    final progress = _totalElapsedSeconds / widget.activity.durationSeconds;
    final remaining = widget.activity.durationSeconds - _totalElapsedSeconds;

    return Column(
      children: [
        LinearProgressIndicator(
          value: progress.clamp(0.0, 1.0),
          backgroundColor: Colors.white.withOpacity(0.3),
          borderRadius: BorderRadius.circular(4),
        ),
        const SizedBox(height: 4),
        Text(
          '${_formatDuration(remaining)} remaining',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }

  Widget _buildVisualArea() {
    if (widget.activity.category == ActivityCategory.breathing) {
      return _buildBreathingVisual();
    } else if (widget.activity.category == ActivityCategory.counting) {
      return _buildCountingVisual();
    } else {
      return _buildGenericVisual();
    }
  }

  Widget _buildBreathingVisual() {
    return AnimatedBuilder(
      animation: _breathingController,
      builder: (context, child) {
        final size = 120 + (_breathingController.value * 80);
        return Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.blue.withOpacity(0.3),
            border: Border.all(
              color: Colors.blue,
              width: 3,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.blue.withOpacity(0.2),
                blurRadius: 20,
                spreadRadius: 5,
              ),
            ],
          ),
          child: Center(
            child: Text(
              _getBreathingText(),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: Colors.blue.shade700,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        );
      },
    );
  }

  String _getBreathingText() {
    final instruction = _currentStep.instruction.toLowerCase();
    if (instruction.contains('in')) return 'Breathe In';
    if (instruction.contains('out')) return 'Breathe Out';
    if (instruction.contains('hold')) return 'Hold';
    return '';
  }

  Widget _buildCountingVisual() {
    final visualCue = _currentStep.visualCue ?? '';
    return Container(
      width: 160,
      height: 160,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.teal.withOpacity(0.2),
      ),
      child: Center(
        child: Text(
          visualCue,
          style: Theme.of(context).textTheme.displayLarge?.copyWith(
            color: Colors.teal.shade700,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildGenericVisual() {
    return Container(
      width: 160,
      height: 160,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: _getCategoryColor().withOpacity(0.2),
      ),
      child: Center(
        child: Icon(
          _getCategoryIcon(),
          size: 80,
          color: _getCategoryColor(),
        ),
      ),
    );
  }

  Color _getCategoryColor() {
    switch (widget.activity.category) {
      case ActivityCategory.breathing:
        return Colors.blue;
      case ActivityCategory.grounding:
        return Colors.green;
      case ActivityCategory.movement:
        return Colors.orange;
      case ActivityCategory.sensory:
        return Colors.purple;
      case ActivityCategory.sounds:
        return Colors.indigo;
      case ActivityCategory.counting:
        return Colors.teal;
      default:
        return Colors.grey;
    }
  }

  IconData _getCategoryIcon() {
    switch (widget.activity.category) {
      case ActivityCategory.breathing:
        return Icons.air;
      case ActivityCategory.grounding:
        return Icons.spa;
      case ActivityCategory.movement:
        return Icons.directions_run;
      case ActivityCategory.sensory:
        return Icons.touch_app;
      case ActivityCategory.sounds:
        return Icons.music_note;
      case ActivityCategory.counting:
        return Icons.format_list_numbered;
      default:
        return Icons.self_improvement;
    }
  }

  Widget _buildInstructionCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            _currentStep.instruction,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          // Step timer
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.timer_outlined,
                size: 20,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(width: 8),
              Text(
                '${_currentStep.durationSeconds - _currentStepSeconds}s',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStepProgress() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(widget.activity.steps.length, (index) {
        final isActive = index == _currentStepIndex;
        final isCompleted = index < _currentStepIndex;

        return Container(
          width: isActive ? 24 : 8,
          height: 8,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),
            color: isCompleted
                ? _getCategoryColor()
                : isActive
                    ? _getCategoryColor().withOpacity(0.7)
                    : Colors.grey.withOpacity(0.3),
          ),
        );
      }),
    );
  }

  Widget _buildControls() {
    if (!_isPlaying && _startTime == null) {
      // Not started yet
      return FilledButton.icon(
        onPressed: _moodBefore != null ? _startActivity : null,
        icon: const Icon(Icons.play_arrow),
        label: const Text('Start'),
        style: FilledButton.styleFrom(
          minimumSize: const Size(200, 56),
        ),
      );
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Stop button
        OutlinedButton.icon(
          onPressed: () => _showExitConfirmation(context),
          icon: const Icon(Icons.stop),
          label: const Text('Stop'),
        ),
        const SizedBox(width: 16),
        // Play/Pause button
        FilledButton.icon(
          onPressed: _isPlaying ? _pauseActivity : _resumeActivity,
          icon: Icon(_isPlaying ? Icons.pause : Icons.play_arrow),
          label: Text(_isPlaying ? 'Pause' : 'Resume'),
          style: FilledButton.styleFrom(
            minimumSize: const Size(140, 56),
          ),
        ),
      ],
    );
  }

  void _showExitConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Stop Activity?'),
        content: const Text(
          'Are you sure you want to stop? Your progress will be saved.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Continue'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              _stopActivity();
            },
            child: const Text('Stop'),
          ),
        ],
      ),
    );
  }

  String _formatDuration(int seconds) {
    final minutes = seconds ~/ 60;
    final secs = seconds % 60;
    if (minutes > 0) {
      return '$minutes:${secs.toString().padLeft(2, '0')}';
    }
    return '${secs}s';
  }
}

class _MoodCheckInSheet extends StatelessWidget {
  final String title;
  final void Function(int mood) onMoodSelected;

  const _MoodCheckInSheet({
    required this.title,
    required this.onMoodSelected,
  });

  @override
  Widget build(BuildContext context) {
    final moods = [
      (1, '😢', 'Very upset'),
      (2, '😟', 'Upset'),
      (3, '😐', 'Okay'),
      (4, '🙂', 'Good'),
      (5, '😊', 'Great'),
    ];

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: moods.map((mood) => _buildMoodOption(
              context,
              mood.$1,
              mood.$2,
              mood.$3,
            )).toList(),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildMoodOption(
    BuildContext context,
    int value,
    String emoji,
    String label,
  ) {
    return InkWell(
      onTap: () => onMoodSelected(value),
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 40)),
            const SizedBox(height: 4),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _CompletionDialog extends StatelessWidget {
  final CachedActivity activity;
  final int moodBefore;
  final int moodAfter;
  final int durationSeconds;
  final VoidCallback onDone;

  const _CompletionDialog({
    required this.activity,
    required this.moodBefore,
    required this.moodAfter,
    required this.durationSeconds,
    required this.onDone,
  });

  @override
  Widget build(BuildContext context) {
    final moodChange = moodAfter - moodBefore;
    final moodEmojis = ['😢', '😟', '😐', '🙂', '😊'];

    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            '🎉',
            style: TextStyle(fontSize: 60),
          ),
          const SizedBox(height: 16),
          Text(
            'Well Done!',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'You completed ${activity.name}',
            style: Theme.of(context).textTheme.bodyLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          // Mood comparison
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Column(
                children: [
                  Text('Before', style: Theme.of(context).textTheme.bodySmall),
                  Text(
                    moodEmojis[moodBefore - 1],
                    style: const TextStyle(fontSize: 32),
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Icon(
                  Icons.arrow_forward,
                  color: moodChange > 0
                      ? Colors.green
                      : moodChange < 0
                          ? Colors.red
                          : Colors.grey,
                ),
              ),
              Column(
                children: [
                  Text('After', style: Theme.of(context).textTheme.bodySmall),
                  Text(
                    moodEmojis[moodAfter - 1],
                    style: const TextStyle(fontSize: 32),
                  ),
                ],
              ),
            ],
          ),
          if (moodChange > 0) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                'Mood improved by $moodChange! 💪',
                style: TextStyle(
                  color: Colors.green.shade700,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
          const SizedBox(height: 16),
          Text(
            'Duration: ${durationSeconds ~/ 60}:${(durationSeconds % 60).toString().padLeft(2, '0')}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
      actions: [
        FilledButton(
          onPressed: onDone,
          style: FilledButton.styleFrom(
            minimumSize: const Size(double.infinity, 48),
          ),
          child: const Text('Done'),
        ),
      ],
    );
  }
}
