import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:audioplayers/audioplayers.dart';

import 'transition_service.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITION WARNING WIDGET
// Main widget that shows countdown warnings before activity changes
// ═══════════════════════════════════════════════════════════════════════════════

/// Shows a visual countdown warning before transitioning to the next activity.
class TransitionWarningWidget extends ConsumerStatefulWidget {
  const TransitionWarningWidget({
    super.key,
    required this.plan,
    required this.onComplete,
    required this.onAcknowledge,
    this.onSkip,
  });

  final TransitionPlan plan;
  final VoidCallback onComplete;
  final VoidCallback onAcknowledge;
  final VoidCallback? onSkip;

  @override
  ConsumerState<TransitionWarningWidget> createState() => _TransitionWarningWidgetState();
}

class _TransitionWarningWidgetState extends ConsumerState<TransitionWarningWidget>
    with TickerProviderStateMixin {
  late Timer _timer;
  late int _secondsRemaining;
  late int _currentWarningIndex;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _acknowledged = false;
  // Tracks interaction count for analytics - will be used when analytics integration is added
  // ignore: unused_field
  int _interactionCount = 0;

  @override
  void initState() {
    super.initState();
    _secondsRemaining = widget.plan.totalDuration;
    _currentWarningIndex = 0;

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _startTimer();
    _playInitialWarning();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining <= 0) {
        timer.cancel();
        widget.onComplete();
        return;
      }

      setState(() {
        _secondsRemaining--;
      });

      _checkWarnings();
    });
  }

  void _checkWarnings() {
    final warnings = widget.plan.warnings;
    for (int i = _currentWarningIndex; i < warnings.length; i++) {
      if (_secondsRemaining == warnings[i].secondsBefore) {
        _triggerWarning(warnings[i], i);
        _currentWarningIndex = i + 1;
        break;
      }
    }
  }

  void _triggerWarning(TransitionWarning warning, int index) {
    // Play audio if enabled
    if (widget.plan.audio.enabled && warning.audioType != null) {
      _playAudioWarning(warning.audioType!);
    }

    // Trigger haptic if enabled
    if (widget.plan.haptic.enabled) {
      _triggerHaptic();
    }
  }

  Future<void> _playInitialWarning() async {
    if (widget.plan.audio.enabled) {
      await _playAudioWarning(widget.plan.audio.warningType.code);
    }
  }

  Future<void> _playAudioWarning(String type) async {
    try {
      // Map warning type to asset
      final assetMap = {
        'gentle_chime': 'audio/gentle_chime.mp3',
        'nature_sound': 'audio/nature_bell.mp3',
        'musical': 'audio/musical_ding.mp3',
        'spoken': 'audio/spoken_warning.mp3',
        'character_voice': 'audio/character_voice.mp3',
      };

      final asset = assetMap[type] ?? 'audio/gentle_chime.mp3';
      await _audioPlayer.setVolume(widget.plan.audio.volume);
      await _audioPlayer.play(AssetSource(asset));
    } catch (_) {
      // Audio playback failed, continue silently
    }
  }

  void _triggerHaptic() {
    switch (widget.plan.haptic.intensity) {
      case 'light':
        HapticFeedback.lightImpact();
        break;
      case 'strong':
        HapticFeedback.heavyImpact();
        break;
      default:
        HapticFeedback.mediumImpact();
    }
  }

  void _handleAcknowledge() {
    setState(() {
      _acknowledged = true;
      _interactionCount++;
    });
    widget.onAcknowledge();
  }

  void _handleSkip() {
    if (widget.plan.allowSkip && widget.onSkip != null) {
      _timer.cancel();
      widget.onSkip!();
    }
  }

  @override
  void dispose() {
    _timer.cancel();
    _pulseController.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final warningColor = _getWarningColor();

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: warningColor.withOpacity(0.3),
            blurRadius: 20,
            spreadRadius: 2,
          ),
        ],
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // First/Then Board
          if (widget.plan.firstThenBoard != null) ...[
            FirstThenBoardWidget(board: widget.plan.firstThenBoard!),
            const SizedBox(height: 24),
          ],

          // Countdown Timer
          _buildCountdownWidget(),

          const SizedBox(height: 16),

          // Warning Message
          _buildWarningMessage(),

          const SizedBox(height: 24),

          // Action Buttons
          _buildActionButtons(),
        ],
      ),
    );
  }

  Widget _buildCountdownWidget() {
    switch (widget.plan.visual.style) {
      case VisualWarningStyle.circle:
        return _CircleCountdownWidget(
          secondsRemaining: _secondsRemaining,
          totalDuration: widget.plan.totalDuration,
          color: _getWarningColor(),
          showTimer: widget.plan.visual.showTimer,
          pulseAnimation: _pulseAnimation,
        );
      case VisualWarningStyle.bar:
        return _BarCountdownWidget(
          secondsRemaining: _secondsRemaining,
          totalDuration: widget.plan.totalDuration,
          color: _getWarningColor(),
          showTimer: widget.plan.visual.showTimer,
        );
      case VisualWarningStyle.sandTimer:
        return _SandTimerWidget(
          secondsRemaining: _secondsRemaining,
          totalDuration: widget.plan.totalDuration,
          color: _getWarningColor(),
        );
      case VisualWarningStyle.character:
        return _CharacterCountdownWidget(
          secondsRemaining: _secondsRemaining,
          totalDuration: widget.plan.totalDuration,
        );
    }
  }

  Widget _buildWarningMessage() {
    final currentWarning = _getCurrentWarningMessage();

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: Text(
        currentWarning,
        key: ValueKey(currentWarning),
        style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: _getWarningColor(),
              fontWeight: FontWeight.bold,
            ),
        textAlign: TextAlign.center,
      ),
    );
  }

  String _getCurrentWarningMessage() {
    final warnings = widget.plan.warnings;
    for (final warning in warnings.reversed) {
      if (_secondsRemaining <= warning.secondsBefore) {
        return warning.message;
      }
    }
    return "We'll be changing activities soon!";
  }

  Widget _buildActionButtons() {
    final colorScheme = Theme.of(context).colorScheme;

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (widget.plan.allowSkip && widget.onSkip != null)
          OutlinedButton(
            onPressed: _handleSkip,
            child: const Text('Skip'),
          ),
        const SizedBox(width: 16),
        if (!_acknowledged)
          ElevatedButton.icon(
            onPressed: _handleAcknowledge,
            icon: const Icon(Icons.thumb_up),
            label: const Text("I'm Ready!"),
            style: ElevatedButton.styleFrom(
              backgroundColor: colorScheme.primary,
              foregroundColor: colorScheme.onPrimary,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          )
        else
          Chip(
            avatar: Icon(Icons.check_circle, color: colorScheme.primary),
            label: const Text('Ready!'),
            backgroundColor: colorScheme.primaryContainer,
          ),
      ],
    );
  }

  Color _getWarningColor() {
    final progress = _secondsRemaining / widget.plan.totalDuration;
    final scheme = widget.plan.visual.colorScheme;

    switch (scheme) {
      case TransitionColorScheme.greenYellowRed:
        if (progress > 0.5) return Colors.green;
        if (progress > 0.2) return Colors.orange;
        return Colors.red;
      case TransitionColorScheme.bluePurple:
        if (progress > 0.5) return Colors.blue;
        if (progress > 0.2) return Colors.deepPurple;
        return Colors.purple;
      case TransitionColorScheme.highContrast:
        if (progress > 0.3) return Colors.black;
        return Colors.red;
      case TransitionColorScheme.grayscale:
        final value = (progress * 128).toInt() + 64;
        return Color.fromRGBO(value, value, value, 1);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COUNTDOWN VISUALIZATION WIDGETS
// ═══════════════════════════════════════════════════════════════════════════════

class _CircleCountdownWidget extends StatelessWidget {
  const _CircleCountdownWidget({
    required this.secondsRemaining,
    required this.totalDuration,
    required this.color,
    required this.showTimer,
    required this.pulseAnimation,
  });

  final int secondsRemaining;
  final int totalDuration;
  final Color color;
  final bool showTimer;
  final Animation<double> pulseAnimation;

  @override
  Widget build(BuildContext context) {
    final progress = secondsRemaining / totalDuration;

    return ScaleTransition(
      scale: pulseAnimation,
      child: SizedBox(
        width: 150,
        height: 150,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Background circle
            SizedBox(
              width: 150,
              height: 150,
              child: CircularProgressIndicator(
                value: 1.0,
                strokeWidth: 12,
                backgroundColor: color.withOpacity(0.2),
                valueColor: AlwaysStoppedAnimation<Color>(color.withOpacity(0.2)),
              ),
            ),
            // Progress circle
            SizedBox(
              width: 150,
              height: 150,
              child: CircularProgressIndicator(
                value: progress,
                strokeWidth: 12,
                backgroundColor: Colors.transparent,
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ),
            // Timer text
            if (showTimer)
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '$secondsRemaining',
                    style: TextStyle(
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                  Text(
                    'seconds',
                    style: TextStyle(
                      fontSize: 14,
                      color: color.withOpacity(0.7),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _BarCountdownWidget extends StatelessWidget {
  const _BarCountdownWidget({
    required this.secondsRemaining,
    required this.totalDuration,
    required this.color,
    required this.showTimer,
  });

  final int secondsRemaining;
  final int totalDuration;
  final Color color;
  final bool showTimer;

  @override
  Widget build(BuildContext context) {
    final progress = secondsRemaining / totalDuration;

    return Column(
      children: [
        if (showTimer)
          Text(
            '$secondsRemaining seconds',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        const SizedBox(height: 12),
        Container(
          height: 24,
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: color.withOpacity(0.2),
          ),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: progress,
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: color,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _SandTimerWidget extends StatelessWidget {
  const _SandTimerWidget({
    required this.secondsRemaining,
    required this.totalDuration,
    required this.color,
  });

  final int secondsRemaining;
  final int totalDuration;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final progress = secondsRemaining / totalDuration;

    return SizedBox(
      width: 100,
      height: 150,
      child: CustomPaint(
        painter: _SandTimerPainter(
          progress: progress,
          color: color,
        ),
      ),
    );
  }
}

class _SandTimerPainter extends CustomPainter {
  _SandTimerPainter({required this.progress, required this.color});

  final double progress;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final outlinePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;

    // Draw hourglass outline
    final path = Path();
    
    // Top bulb
    path.moveTo(10, 0);
    path.lineTo(size.width - 10, 0);
    path.quadraticBezierTo(size.width, 0, size.width, 10);
    path.lineTo(size.width * 0.6, size.height * 0.45);
    path.quadraticBezierTo(size.width / 2, size.height / 2, size.width * 0.4, size.height * 0.45);
    path.lineTo(0, 10);
    path.quadraticBezierTo(0, 0, 10, 0);
    
    // Bottom bulb
    path.moveTo(0, size.height - 10);
    path.quadraticBezierTo(0, size.height, 10, size.height);
    path.lineTo(size.width - 10, size.height);
    path.quadraticBezierTo(size.width, size.height, size.width, size.height - 10);
    path.lineTo(size.width * 0.6, size.height * 0.55);
    path.quadraticBezierTo(size.width / 2, size.height / 2, size.width * 0.4, size.height * 0.55);
    path.lineTo(0, size.height - 10);

    canvas.drawPath(path, outlinePaint);

    // Draw sand in top (decreasing)
    final topSandHeight = size.height * 0.4 * progress;
    final topSandRect = Rect.fromLTWH(
      15, 
      size.height * 0.05 + (size.height * 0.4 - topSandHeight), 
      size.width - 30, 
      topSandHeight,
    );
    canvas.drawRect(topSandRect, paint);

    // Draw sand in bottom (increasing)
    final bottomSandHeight = size.height * 0.4 * (1 - progress);
    final bottomSandRect = Rect.fromLTWH(
      15, 
      size.height * 0.55, 
      size.width - 30, 
      bottomSandHeight,
    );
    canvas.drawRect(bottomSandRect, paint);
  }

  @override
  bool shouldRepaint(covariant _SandTimerPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.color != color;
  }
}

class _CharacterCountdownWidget extends StatelessWidget {
  const _CharacterCountdownWidget({
    required this.secondsRemaining,
    required this.totalDuration,
  });

  final int secondsRemaining;
  final int totalDuration;

  @override
  Widget build(BuildContext context) {
    final progress = secondsRemaining / totalDuration;
    final emoji = _getCharacterEmoji(progress);

    return Column(
      children: [
        Text(
          emoji,
          style: const TextStyle(fontSize: 80),
        ),
        const SizedBox(height: 8),
        Text(
          '$secondsRemaining',
          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
      ],
    );
  }

  String _getCharacterEmoji(double progress) {
    if (progress > 0.7) return '😊'; // Happy - lots of time
    if (progress > 0.5) return '🙂'; // Calm
    if (progress > 0.3) return '😮'; // Alert
    if (progress > 0.1) return '😯'; // Hurry up
    return '🎉'; // Almost there!
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIRST/THEN BOARD WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

/// Visual First/Then board showing current and upcoming activity.
class FirstThenBoardWidget extends StatelessWidget {
  const FirstThenBoardWidget({
    super.key,
    required this.board,
  });

  final FirstThenBoard board;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          // FIRST
          Expanded(
            child: _ActivityCard(
              label: 'FIRST',
              activity: board.currentActivity,
              isFirst: true,
            ),
          ),

          // Arrow
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Icon(
              Icons.arrow_forward_rounded,
              size: 32,
              color: colorScheme.primary,
            ),
          ),

          // THEN
          Expanded(
            child: _ActivityCard(
              label: 'THEN',
              activity: board.nextActivity,
              isFirst: false,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({
    required this.label,
    required this.activity,
    required this.isFirst,
  });

  final String label;
  final ActivityInfo activity;
  final bool isFirst;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isFirst 
            ? colorScheme.primaryContainer.withOpacity(0.5)
            : colorScheme.secondaryContainer.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: isFirst ? colorScheme.primary : colorScheme.secondary,
                ),
          ),
          const SizedBox(height: 8),
          // Activity thumbnail or icon
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(8),
            ),
            child: activity.thumbnailUrl != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      activity.thumbnailUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _buildActivityIcon(),
                    ),
                  )
                : _buildActivityIcon(),
          ),
          const SizedBox(height: 8),
          Text(
            activity.title,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildActivityIcon() {
    final iconData = _getActivityIcon(activity.type);
    return Icon(iconData, size: 32, color: Colors.grey[600]);
  }

  IconData _getActivityIcon(String type) {
    switch (type.toLowerCase()) {
      case 'video':
        return Icons.play_circle_outline;
      case 'quiz':
      case 'assessment':
        return Icons.quiz_outlined;
      case 'game':
        return Icons.sports_esports_outlined;
      case 'reading':
        return Icons.menu_book_outlined;
      case 'practice':
        return Icons.edit_outlined;
      case 'interactive':
        return Icons.touch_app_outlined;
      default:
        return Icons.school_outlined;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITION ROUTINE WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

/// Guides the learner through a transition routine step by step.
class TransitionRoutineWidget extends ConsumerStatefulWidget {
  const TransitionRoutineWidget({
    super.key,
    required this.routine,
    required this.onComplete,
    this.onSkip,
  });

  final TransitionRoutine routine;
  final VoidCallback onComplete;
  final VoidCallback? onSkip;

  @override
  ConsumerState<TransitionRoutineWidget> createState() => _TransitionRoutineWidgetState();
}

class _TransitionRoutineWidgetState extends ConsumerState<TransitionRoutineWidget>
    with TickerProviderStateMixin {
  int _currentStepIndex = 0;
  Timer? _stepTimer;
  int _stepSecondsRemaining = 0;
  bool _stepCompleted = false;

  late AnimationController _breathingController;

  @override
  void initState() {
    super.initState();
    _breathingController = AnimationController(
      duration: const Duration(seconds: 4),
      vsync: this,
    );

    _startCurrentStep();
  }

  void _startCurrentStep() {
    if (_currentStepIndex >= widget.routine.steps.length) {
      widget.onComplete();
      return;
    }

    final step = widget.routine.steps[_currentStepIndex];
    _stepSecondsRemaining = step.duration;
    _stepCompleted = false;

    // Start breathing animation if it's a breathing step
    if (step.type == RoutineStepType.breathing) {
      _breathingController.repeat(reverse: true);
    } else {
      _breathingController.stop();
    }

    _stepTimer?.cancel();
    _stepTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_stepSecondsRemaining <= 0) {
        timer.cancel();
        if (!step.requiresCompletion || _stepCompleted) {
          _advanceStep();
        }
        return;
      }
      setState(() {
        _stepSecondsRemaining--;
      });
    });
  }

  void _advanceStep() {
    setState(() {
      _currentStepIndex++;
    });
    _startCurrentStep();
  }

  void _markStepComplete() {
    setState(() {
      _stepCompleted = true;
    });
    HapticFeedback.lightImpact();
    
    // If timer already finished, advance
    if (_stepSecondsRemaining <= 0) {
      _advanceStep();
    }
  }

  @override
  void dispose() {
    _stepTimer?.cancel();
    _breathingController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_currentStepIndex >= widget.routine.steps.length) {
      return const SizedBox.shrink();
    }

    final step = widget.routine.steps[_currentStepIndex];
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Progress indicator
          _buildProgressIndicator(),
          
          const SizedBox(height: 24),

          // Step visualization
          _buildStepVisualization(step),

          const SizedBox(height: 16),

          // Instruction
          Text(
            step.instruction,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 16),

          // Timer
          Text(
            '$_stepSecondsRemaining',
            style: Theme.of(context).textTheme.displaySmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: colorScheme.primary,
                ),
          ),

          const SizedBox(height: 24),

          // Actions
          _buildActions(step),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(widget.routine.steps.length, (index) {
        final isCompleted = index < _currentStepIndex;
        final isCurrent = index == _currentStepIndex;

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: isCurrent ? 24 : 12,
          height: 12,
          decoration: BoxDecoration(
            color: isCompleted || isCurrent
                ? Theme.of(context).colorScheme.primary
                : Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(6),
          ),
        );
      }),
    );
  }

  Widget _buildStepVisualization(TransitionRoutineStep step) {
    switch (step.type) {
      case RoutineStepType.breathing:
        return _BreathingVisualization(controller: _breathingController);
      case RoutineStepType.movement:
        return const _MovementVisualization();
      case RoutineStepType.sensory:
        return const _SensoryVisualization();
      case RoutineStepType.countdown:
        return _CountdownVisualization(seconds: _stepSecondsRemaining);
      case RoutineStepType.preview:
        return const _PreviewVisualization();
      case RoutineStepType.readyCheck:
        return _ReadyCheckVisualization(isReady: _stepCompleted);
    }
  }

  Widget _buildActions(TransitionRoutineStep step) {
    final colorScheme = Theme.of(context).colorScheme;

    if (step.requiresCompletion) {
      return ElevatedButton.icon(
        onPressed: _stepCompleted ? null : _markStepComplete,
        icon: Icon(_stepCompleted ? Icons.check : Icons.thumb_up),
        label: Text(_stepCompleted ? 'Done!' : "I'm Ready!"),
        style: ElevatedButton.styleFrom(
          backgroundColor: _stepCompleted 
              ? colorScheme.surfaceContainerHighest 
              : colorScheme.primary,
          foregroundColor: _stepCompleted 
              ? colorScheme.onSurfaceVariant 
              : colorScheme.onPrimary,
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
        ),
      );
    }

    return TextButton(
      onPressed: _advanceStep,
      child: const Text('Skip'),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP VISUALIZATION WIDGETS
// ═══════════════════════════════════════════════════════════════════════════════

class _BreathingVisualization extends StatelessWidget {
  const _BreathingVisualization({required this.controller});

  final AnimationController controller;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        final size = 80 + (controller.value * 40);
        return Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
            border: Border.all(
              color: Theme.of(context).colorScheme.primary,
              width: 3,
            ),
          ),
          child: Center(
            child: Text(
              controller.value < 0.5 ? 'Breathe In' : 'Breathe Out',
              style: TextStyle(
                color: Theme.of(context).colorScheme.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        );
      },
    );
  }
}

class _MovementVisualization extends StatelessWidget {
  const _MovementVisualization();

  @override
  Widget build(BuildContext context) {
    return const Text(
      '🤸‍♂️',
      style: TextStyle(fontSize: 80),
    );
  }
}

class _SensoryVisualization extends StatelessWidget {
  const _SensoryVisualization();

  @override
  Widget build(BuildContext context) {
    return const Text(
      '🧘',
      style: TextStyle(fontSize: 80),
    );
  }
}

class _CountdownVisualization extends StatelessWidget {
  const _CountdownVisualization({required this.seconds});

  final int seconds;

  @override
  Widget build(BuildContext context) {
    return Text(
      '$seconds',
      style: Theme.of(context).textTheme.displayLarge?.copyWith(
            fontWeight: FontWeight.bold,
            color: Theme.of(context).colorScheme.primary,
          ),
    );
  }
}

class _PreviewVisualization extends StatelessWidget {
  const _PreviewVisualization();

  @override
  Widget build(BuildContext context) {
    return const Text(
      '👀',
      style: TextStyle(fontSize: 80),
    );
  }
}

class _ReadyCheckVisualization extends StatelessWidget {
  const _ReadyCheckVisualization({required this.isReady});

  final bool isReady;

  @override
  Widget build(BuildContext context) {
    return Text(
      isReady ? '✅' : '👍',
      style: const TextStyle(fontSize: 80),
    );
  }
}
