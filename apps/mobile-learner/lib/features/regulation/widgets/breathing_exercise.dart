/// Breathing Exercise Widget - ND-3.2
///
/// Specialized widget for breathing exercises with animated visual guidance.
/// Supports various breathing patterns (box, 4-7-8, bunny, star, etc.)

import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../offline/cached_activities.dart';

enum BreathPhase { inhale, holdIn, exhale, holdOut }

class BreathingExerciseWidget extends StatefulWidget {
  final CachedActivity activity;
  final bool autoStart;
  final void Function(bool completed, int durationSeconds)? onComplete;
  final void Function(int cycle, BreathPhase phase)? onPhaseChange;

  const BreathingExerciseWidget({
    super.key,
    required this.activity,
    this.autoStart = false,
    this.onComplete,
    this.onPhaseChange,
  });

  @override
  State<BreathingExerciseWidget> createState() => _BreathingExerciseWidgetState();
}

class _BreathingExerciseWidgetState extends State<BreathingExerciseWidget>
    with TickerProviderStateMixin {
  late AnimationController _breathController;
  late AnimationController _pulseController;
  late Animation<double> _breathAnimation;
  
  BreathPhase _currentPhase = BreathPhase.inhale;
  int _currentCycle = 1;
  int _phaseSecondsRemaining = 0;
  int _totalSeconds = 0;
  bool _isRunning = false;
  bool _isCompleted = false;
  Timer? _timer;

  // Breathing pattern parameters
  late int _inhaleSeconds;
  late int _holdInSeconds;
  late int _exhaleSeconds;
  late int _holdOutSeconds;
  late int _totalCycles;
  late String _shape;

  @override
  void initState() {
    super.initState();
    _parseActivityData();
    _setupAnimations();
    
    if (widget.autoStart) {
      WidgetsBinding.instance.addPostFrameCallback((_) => start());
    }
  }

  void _parseActivityData() {
    final customData = widget.activity.customData ?? {};
    
    _inhaleSeconds = customData['inhaleSeconds'] as int? ?? 4;
    _holdInSeconds = customData['holdInSeconds'] as int? ??
        customData['holdSeconds'] as int? ?? 0;
    _exhaleSeconds = customData['exhaleSeconds'] as int? ?? 4;
    _holdOutSeconds = customData['holdOutSeconds'] as int? ?? 0;
    _totalCycles = customData['cycles'] as int? ?? 6;
    _shape = customData['shape'] as String? ?? 'circle';

    _phaseSecondsRemaining = _inhaleSeconds;
  }

  void _setupAnimations() {
    _breathController = AnimationController(
      vsync: this,
      duration: Duration(seconds: _inhaleSeconds),
    );

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);

    _breathAnimation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _breathController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    _breathController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  void start() {
    if (_isRunning) return;
    
    setState(() {
      _isRunning = true;
      _currentPhase = BreathPhase.inhale;
      _currentCycle = 1;
      _phaseSecondsRemaining = _inhaleSeconds;
      _totalSeconds = 0;
    });

    _startPhaseAnimation();
    _startTimer();
  }

  void pause() {
    setState(() => _isRunning = false);
    _timer?.cancel();
    _breathController.stop();
  }

  void resume() {
    setState(() => _isRunning = true);
    _startPhaseAnimation();
    _startTimer();
  }

  void stop() {
    _timer?.cancel();
    _breathController.stop();
    
    widget.onComplete?.call(_isCompleted, _totalSeconds);
    
    setState(() {
      _isRunning = false;
      _currentPhase = BreathPhase.inhale;
      _currentCycle = 1;
      _phaseSecondsRemaining = _inhaleSeconds;
    });
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || !_isRunning) {
        timer.cancel();
        return;
      }

      setState(() {
        _totalSeconds++;
        _phaseSecondsRemaining--;

        if (_phaseSecondsRemaining <= 0) {
          _advancePhase();
        }
      });
    });
  }

  void _startPhaseAnimation() {
    _breathController.duration = Duration(seconds: _getCurrentPhaseDuration());
    
    switch (_currentPhase) {
      case BreathPhase.inhale:
        _breathController.forward(from: 0);
        break;
      case BreathPhase.holdIn:
        _breathController.value = 1.0;
        break;
      case BreathPhase.exhale:
        _breathController.reverse(from: 1);
        break;
      case BreathPhase.holdOut:
        _breathController.value = 0.0;
        break;
    }
  }

  int _getCurrentPhaseDuration() {
    switch (_currentPhase) {
      case BreathPhase.inhale:
        return _inhaleSeconds;
      case BreathPhase.holdIn:
        return _holdInSeconds;
      case BreathPhase.exhale:
        return _exhaleSeconds;
      case BreathPhase.holdOut:
        return _holdOutSeconds;
    }
  }

  void _advancePhase() {
    // Haptic feedback
    HapticFeedback.lightImpact();

    BreathPhase nextPhase;
    int nextDuration;

    switch (_currentPhase) {
      case BreathPhase.inhale:
        if (_holdInSeconds > 0) {
          nextPhase = BreathPhase.holdIn;
          nextDuration = _holdInSeconds;
        } else {
          nextPhase = BreathPhase.exhale;
          nextDuration = _exhaleSeconds;
        }
        break;
      case BreathPhase.holdIn:
        nextPhase = BreathPhase.exhale;
        nextDuration = _exhaleSeconds;
        break;
      case BreathPhase.exhale:
        if (_holdOutSeconds > 0) {
          nextPhase = BreathPhase.holdOut;
          nextDuration = _holdOutSeconds;
        } else {
          // Check if completed
          if (_currentCycle >= _totalCycles) {
            _complete();
            return;
          }
          _currentCycle++;
          nextPhase = BreathPhase.inhale;
          nextDuration = _inhaleSeconds;
        }
        break;
      case BreathPhase.holdOut:
        // Check if completed
        if (_currentCycle >= _totalCycles) {
          _complete();
          return;
        }
        _currentCycle++;
        nextPhase = BreathPhase.inhale;
        nextDuration = _inhaleSeconds;
        break;
    }

    setState(() {
      _currentPhase = nextPhase;
      _phaseSecondsRemaining = nextDuration;
    });

    widget.onPhaseChange?.call(_currentCycle, _currentPhase);
    _startPhaseAnimation();
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
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Cycle counter
        Text(
          'Cycle $_currentCycle of $_totalCycles',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 32),

        // Main breathing visual
        SizedBox(
          width: 280,
          height: 280,
          child: _buildBreathingVisual(),
        ),

        const SizedBox(height: 32),

        // Phase instruction
        _buildPhaseInstruction(),

        const SizedBox(height: 16),

        // Timer display
        Text(
          '${_phaseSecondsRemaining}s',
          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
            fontWeight: FontWeight.bold,
            color: _getPhaseColor(),
          ),
        ),

        const SizedBox(height: 32),

        // Controls
        if (!_isCompleted) _buildControls(),
        if (_isCompleted) _buildCompletionMessage(),
      ],
    );
  }

  Widget _buildBreathingVisual() {
    switch (_shape) {
      case 'square':
        return _buildSquareBreathing();
      case 'star':
        return _buildStarBreathing();
      default:
        return _buildCircleBreathing();
    }
  }

  Widget _buildCircleBreathing() {
    return AnimatedBuilder(
      animation: _breathAnimation,
      builder: (context, child) {
        final scale = _breathAnimation.value;
        return Stack(
          alignment: Alignment.center,
          children: [
            // Outer glow
            Container(
              width: 240 * scale,
              height: 240 * scale,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _getPhaseColor().withOpacity(0.1),
              ),
            ),
            // Middle ring
            Container(
              width: 200 * scale,
              height: 200 * scale,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: _getPhaseColor().withOpacity(0.3),
                  width: 2,
                ),
              ),
            ),
            // Inner circle
            Container(
              width: 160 * scale,
              height: 160 * scale,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    _getPhaseColor().withOpacity(0.6),
                    _getPhaseColor().withOpacity(0.3),
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: _getPhaseColor().withOpacity(0.3),
                    blurRadius: 20,
                    spreadRadius: 5,
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
          ],
        );
      },
    );
  }

  Widget _buildSquareBreathing() {
    return AnimatedBuilder(
      animation: _breathAnimation,
      builder: (context, child) {
        return CustomPaint(
          size: const Size(240, 240),
          painter: _BoxBreathingPainter(
            phase: _currentPhase,
            progress: _breathAnimation.value,
            color: _getPhaseColor(),
          ),
        );
      },
    );
  }

  Widget _buildStarBreathing() {
    return AnimatedBuilder(
      animation: _breathAnimation,
      builder: (context, child) {
        final scale = _breathAnimation.value;
        return CustomPaint(
          size: Size(240 * scale, 240 * scale),
          painter: _StarBreathingPainter(
            color: _getPhaseColor(),
            strokeWidth: 4,
          ),
        );
      },
    );
  }

  Widget _buildPhaseInstruction() {
    String instruction;
    IconData icon;

    switch (_currentPhase) {
      case BreathPhase.inhale:
        instruction = 'Breathe In';
        icon = Icons.arrow_upward;
        break;
      case BreathPhase.holdIn:
        instruction = 'Hold';
        icon = Icons.pause;
        break;
      case BreathPhase.exhale:
        instruction = 'Breathe Out';
        icon = Icons.arrow_downward;
        break;
      case BreathPhase.holdOut:
        instruction = 'Hold';
        icon = Icons.pause;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      decoration: BoxDecoration(
        color: _getPhaseColor().withOpacity(0.1),
        borderRadius: BorderRadius.circular(30),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: _getPhaseColor()),
          const SizedBox(width: 8),
          Text(
            instruction,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: _getPhaseColor(),
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildControls() {
    return Row(
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
          const SizedBox(width: 16),
          FilledButton.icon(
            onPressed: pause,
            icon: const Icon(Icons.pause),
            label: const Text('Pause'),
          ),
        ],
        if (!_isRunning && _totalSeconds > 0)
          FilledButton.icon(
            onPressed: resume,
            icon: const Icon(Icons.play_arrow),
            label: const Text('Resume'),
          ),
      ],
    );
  }

  Widget _buildCompletionMessage() {
    return Column(
      children: [
        const Text('🎉', style: TextStyle(fontSize: 48)),
        const SizedBox(height: 16),
        Text(
          'Great job!',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          'You completed $_totalCycles cycles',
          style: Theme.of(context).textTheme.bodyLarge,
        ),
      ],
    );
  }

  Color _getPhaseColor() {
    switch (_currentPhase) {
      case BreathPhase.inhale:
        return Colors.blue;
      case BreathPhase.holdIn:
        return Colors.purple;
      case BreathPhase.exhale:
        return Colors.teal;
      case BreathPhase.holdOut:
        return Colors.indigo;
    }
  }

  IconData _getPhaseIcon() {
    switch (_currentPhase) {
      case BreathPhase.inhale:
        return Icons.arrow_upward;
      case BreathPhase.holdIn:
        return Icons.pause;
      case BreathPhase.exhale:
        return Icons.arrow_downward;
      case BreathPhase.holdOut:
        return Icons.pause;
    }
  }
}

class _BoxBreathingPainter extends CustomPainter {
  final BreathPhase phase;
  final double progress;
  final Color color;

  _BoxBreathingPainter({
    required this.phase,
    required this.progress,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4;

    final activePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round;

    final rect = Rect.fromLTWH(20, 20, size.width - 40, size.height - 40);
    
    // Draw box outline
    canvas.drawRect(rect, paint);

    // Draw active side based on phase
    final path = Path();
    switch (phase) {
      case BreathPhase.inhale:
        // Left side going up
        final startY = rect.bottom;
        final endY = rect.top + (1 - progress) * rect.height;
        path.moveTo(rect.left, startY);
        path.lineTo(rect.left, endY);
        break;
      case BreathPhase.holdIn:
        // Top side going right
        final endX = rect.left + progress * rect.width;
        path.moveTo(rect.left, rect.top);
        path.lineTo(endX, rect.top);
        break;
      case BreathPhase.exhale:
        // Right side going down
        final endY = rect.top + progress * rect.height;
        path.moveTo(rect.right, rect.top);
        path.lineTo(rect.right, endY);
        break;
      case BreathPhase.holdOut:
        // Bottom side going left
        final endX = rect.right - progress * rect.width;
        path.moveTo(rect.right, rect.bottom);
        path.lineTo(endX, rect.bottom);
        break;
    }

    canvas.drawPath(path, activePaint);

    // Draw breathing ball
    Offset ballPosition;
    switch (phase) {
      case BreathPhase.inhale:
        ballPosition = Offset(rect.left, rect.bottom - progress * rect.height);
        break;
      case BreathPhase.holdIn:
        ballPosition = Offset(rect.left + progress * rect.width, rect.top);
        break;
      case BreathPhase.exhale:
        ballPosition = Offset(rect.right, rect.top + progress * rect.height);
        break;
      case BreathPhase.holdOut:
        ballPosition = Offset(rect.right - progress * rect.width, rect.bottom);
        break;
    }

    final ballPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    canvas.drawCircle(ballPosition, 12, ballPaint);
  }

  @override
  bool shouldRepaint(covariant _BoxBreathingPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.phase != phase;
  }
}

class _StarBreathingPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;

  _StarBreathingPainter({
    required this.color,
    this.strokeWidth = 4,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - strokeWidth;

    final path = Path();
    for (int i = 0; i < 5; i++) {
      final angle = (i * 144 - 90) * math.pi / 180;
      final x = center.dx + radius * math.cos(angle);
      final y = center.dy + radius * math.sin(angle);
      
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _StarBreathingPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}
