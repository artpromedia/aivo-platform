import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_common/theme/theme.dart';

/// Visual Timer Screen
///
/// A full-featured Pomodoro-style timer with:
/// - Multiple visualization modes (pie, bar, digital)
/// - Work and break modes
/// - Audio alerts
/// - Quick presets
class VisualTimerScreen extends StatefulWidget {
  const VisualTimerScreen({super.key});

  @override
  State<VisualTimerScreen> createState() => _VisualTimerScreenState();
}

enum TimerMode { work, breakTime }
enum VisualizationType { pie, bar, digital }

class _VisualTimerScreenState extends State<VisualTimerScreen>
    with TickerProviderStateMixin {
  TimerMode _mode = TimerMode.work;
  VisualizationType _visualization = VisualizationType.pie;

  int _totalSeconds = 25 * 60;
  int _remainingSeconds = 25 * 60;
  bool _isRunning = false;
  bool _audioEnabled = true;
  Timer? _timer;

  late AnimationController _pulseController;

  static const List<int> _workPresets = [15, 20, 25, 30, 45];
  static const List<int> _breakPresets = [5, 10, 15];

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  void _startTimer() {
    if (_remainingSeconds <= 0) return;

    setState(() => _isRunning = true);
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_remainingSeconds > 0) {
          _remainingSeconds--;
        } else {
          _onTimerComplete();
        }
      });
    });
  }

  void _pauseTimer() {
    _timer?.cancel();
    setState(() => _isRunning = false);
  }

  void _resetTimer() {
    _timer?.cancel();
    setState(() {
      _isRunning = false;
      _remainingSeconds = _totalSeconds;
    });
  }

  void _setDuration(int minutes) {
    _timer?.cancel();
    setState(() {
      _totalSeconds = minutes * 60;
      _remainingSeconds = _totalSeconds;
      _isRunning = false;
    });
  }

  void _switchMode(TimerMode mode) {
    _timer?.cancel();
    setState(() {
      _mode = mode;
      final defaultMinutes = mode == TimerMode.work ? 25 : 5;
      _totalSeconds = defaultMinutes * 60;
      _remainingSeconds = _totalSeconds;
      _isRunning = false;
    });
  }

  void _onTimerComplete() {
    _timer?.cancel();
    setState(() => _isRunning = false);

    if (_audioEnabled) {
      HapticFeedback.heavyImpact();
    }

    _showCompletionDialog();
  }

  void _showCompletionDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _mode == TimerMode.work ? '🎉' : '☕',
              style: const TextStyle(fontSize: 64),
            ),
            const SizedBox(height: 16),
            Text(
              _mode == TimerMode.work ? 'Great work!' : 'Break time over!',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              _mode == TimerMode.work
                  ? "You've completed your focus session!"
                  : 'Ready to get back to work?',
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _switchMode(_mode == TimerMode.work
                  ? TimerMode.breakTime
                  : TimerMode.work);
            },
            child: Text(
              _mode == TimerMode.work ? 'Start Break' : 'Start Working',
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final minutes = _remainingSeconds ~/ 60;
    final seconds = _remainingSeconds % 60;
    final progress =
        _totalSeconds > 0 ? _remainingSeconds / _totalSeconds : 0.0;

    final presets = _mode == TimerMode.work ? _workPresets : _breakPresets;
    final modeColor =
        _mode == TimerMode.work ? const Color(0xFF3B82F6) : AivoBrand.success;

    return Scaffold(
      backgroundColor: modeColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: Icon(
              _audioEnabled ? Icons.volume_up : Icons.volume_off,
              color: Colors.white,
            ),
            onPressed: () => setState(() => _audioEnabled = !_audioEnabled),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // Mode Switcher
              Container(
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    Expanded(
                      child: _ModeButton(
                        label: '🎯 Work',
                        isSelected: _mode == TimerMode.work,
                        onTap: () => _switchMode(TimerMode.work),
                      ),
                    ),
                    Expanded(
                      child: _ModeButton(
                        label: '☕ Break',
                        isSelected: _mode == TimerMode.breakTime,
                        onTap: () => _switchMode(TimerMode.breakTime),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Visualization Switcher
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _VisualizationButton(
                    label: 'Pie',
                    isSelected: _visualization == VisualizationType.pie,
                    onTap: () =>
                        setState(() => _visualization = VisualizationType.pie),
                  ),
                  const SizedBox(width: 8),
                  _VisualizationButton(
                    label: 'Bar',
                    isSelected: _visualization == VisualizationType.bar,
                    onTap: () =>
                        setState(() => _visualization = VisualizationType.bar),
                  ),
                  const SizedBox(width: 8),
                  _VisualizationButton(
                    label: 'Digital',
                    isSelected: _visualization == VisualizationType.digital,
                    onTap: () => setState(
                        () => _visualization = VisualizationType.digital),
                  ),
                ],
              ),
              const Spacer(),

              // Timer Display
              if (_visualization == VisualizationType.pie)
                _PieTimerDisplay(
                  minutes: minutes,
                  seconds: seconds,
                  progress: progress,
                  isRunning: _isRunning,
                  pulseAnimation: _pulseController,
                  mode: _mode,
                ),
              if (_visualization == VisualizationType.bar)
                _BarTimerDisplay(
                  minutes: minutes,
                  seconds: seconds,
                  progress: progress,
                ),
              if (_visualization == VisualizationType.digital)
                _DigitalTimerDisplay(
                  minutes: minutes,
                  seconds: seconds,
                  mode: _mode,
                ),
              const Spacer(),

              // Controls
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (!_isRunning)
                    _ControlButton(
                      icon: Icons.play_arrow,
                      label: 'Start',
                      onTap: _startTimer,
                      isPrimary: true,
                    )
                  else
                    _ControlButton(
                      icon: Icons.pause,
                      label: 'Pause',
                      onTap: _pauseTimer,
                      isPrimary: true,
                    ),
                  const SizedBox(width: 16),
                  _ControlButton(
                    icon: Icons.refresh,
                    label: 'Reset',
                    onTap: _resetTimer,
                    isPrimary: false,
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Presets
              Text(
                'Quick Select',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.7),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: presets.map((preset) {
                  final isSelected = _totalSeconds == preset * 60;
                  return GestureDetector(
                    onTap: () => _setDuration(preset),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color:
                            isSelected ? Colors.white : Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '$preset min',
                        style: TextStyle(
                          color: isSelected ? modeColor : Colors.white,
                          fontWeight:
                              isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),

              // Tips
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '💡 ${_mode == TimerMode.work ? "Focus Tips" : "Break Tips"}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _mode == TimerMode.work
                          ? '• Remove distractions\n• Focus on one task\n• Stay hydrated'
                          : '• Step away from screen\n• Stretch or walk\n• Have a healthy snack',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ModeButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _ModeButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: isSelected ? Colors.black87 : Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

class _VisualizationButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _VisualizationButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color:
              isSelected ? Colors.white.withOpacity(0.3) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isPrimary;

  const _ControlButton({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.isPrimary,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
        decoration: BoxDecoration(
          color: isPrimary ? Colors.white : Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(30),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isPrimary ? Colors.black87 : Colors.white,
              size: 28,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: isPrimary ? Colors.black87 : Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PieTimerDisplay extends StatelessWidget {
  final int minutes;
  final int seconds;
  final double progress;
  final bool isRunning;
  final AnimationController pulseAnimation;
  final TimerMode mode;

  const _PieTimerDisplay({
    required this.minutes,
    required this.seconds,
    required this.progress,
    required this.isRunning,
    required this.pulseAnimation,
    required this.mode,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: pulseAnimation,
      builder: (context, child) {
        final scale = isRunning ? 1.0 + (pulseAnimation.value * 0.02) : 1.0;
        return Transform.scale(
          scale: scale,
          child: SizedBox(
            width: 250,
            height: 250,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Background circle
                CustomPaint(
                  size: const Size(250, 250),
                  painter: _TimerPainter(
                    progress: progress,
                    backgroundColor: Colors.white.withOpacity(0.2),
                    foregroundColor: Colors.white,
                  ),
                ),
                // Time display
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 48,
                        fontWeight: FontWeight.bold,
                        fontFeatures: [FontFeature.tabularFigures()],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      mode == TimerMode.work ? 'Focus Time' : 'Break Time',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _TimerPainter extends CustomPainter {
  final double progress;
  final Color backgroundColor;
  final Color foregroundColor;

  _TimerPainter({
    required this.progress,
    required this.backgroundColor,
    required this.foregroundColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 10;
    const strokeWidth = 12.0;

    // Background arc
    final backgroundPaint = Paint()
      ..color = backgroundColor
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, backgroundPaint);

    // Foreground arc
    final foregroundPaint = Paint()
      ..color = foregroundColor
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final sweepAngle = 2 * math.pi * progress;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      sweepAngle,
      false,
      foregroundPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _TimerPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

class _BarTimerDisplay extends StatelessWidget {
  final int minutes;
  final int seconds;
  final double progress;

  const _BarTimerDisplay({
    required this.minutes,
    required this.seconds,
    required this.progress,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 72,
            fontWeight: FontWeight.bold,
            fontFeatures: [FontFeature.tabularFigures()],
          ),
        ),
        const SizedBox(height: 24),
        Container(
          width: double.infinity,
          height: 24,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            borderRadius: BorderRadius.circular(12),
          ),
          child: FractionallySizedBox(
            widthFactor: progress,
            alignment: Alignment.centerLeft,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '${(progress * 100).round()}% remaining',
          style: TextStyle(
            color: Colors.white.withOpacity(0.8),
            fontSize: 14,
          ),
        ),
      ],
    );
  }
}

class _DigitalTimerDisplay extends StatelessWidget {
  final int minutes;
  final int seconds;
  final TimerMode mode;

  const _DigitalTimerDisplay({
    required this.minutes,
    required this.seconds,
    required this.mode,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 96,
            fontWeight: FontWeight.bold,
            fontFamily: 'monospace',
            fontFeatures: [FontFeature.tabularFigures()],
            letterSpacing: 8,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          mode == TimerMode.work ? '🎯 Focus Mode' : '☕ Break Mode',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
          ),
        ),
      ],
    );
  }
}
