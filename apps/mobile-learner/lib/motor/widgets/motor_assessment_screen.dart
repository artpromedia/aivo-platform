/// Motor Assessment Screen - ND-3.3
///
/// Provides an interactive assessment to evaluate learner's
/// motor abilities and configure accommodations accordingly.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../motor_profile_provider.dart';

/// Main motor assessment screen
class MotorAssessmentScreen extends StatefulWidget {
  final VoidCallback? onComplete;
  final VoidCallback? onSkip;

  const MotorAssessmentScreen({
    super.key,
    this.onComplete,
    this.onSkip,
  });

  @override
  State<MotorAssessmentScreen> createState() => _MotorAssessmentScreenState();
}

class _MotorAssessmentScreenState extends State<MotorAssessmentScreen> {
  int _currentStep = 0;
  final Map<String, dynamic> _assessmentResults = {};

  final List<_AssessmentStep> _steps = [
    _AssessmentStep(
      id: 'touch_precision',
      title: 'Touch Precision',
      description: 'Tap each target as accurately as you can',
      type: _AssessmentType.touchTargets,
    ),
    _AssessmentStep(
      id: 'hold_stability',
      title: 'Hold Stability',
      description: 'Touch and hold the target without moving',
      type: _AssessmentType.holdTest,
    ),
    _AssessmentStep(
      id: 'drag_ability',
      title: 'Drag Control',
      description: 'Drag the object to the target',
      type: _AssessmentType.dragTest,
    ),
    _AssessmentStep(
      id: 'tap_speed',
      title: 'Tap Speed',
      description: 'Tap the button as fast as comfortable',
      type: _AssessmentType.tapSpeed,
    ),
    _AssessmentStep(
      id: 'preferences',
      title: 'Preferences',
      description: 'Tell us about your preferences',
      type: _AssessmentType.preferences,
    ),
  ];

  void _completeStep(Map<String, dynamic> result) {
    _assessmentResults[_steps[_currentStep].id] = result;

    if (_currentStep < _steps.length - 1) {
      setState(() => _currentStep++);
    } else {
      _finishAssessment();
    }
  }

  void _finishAssessment() {
    // Analyze results and create update map
    final updates = _analyzeResults();

    // Save to provider using updateAccommodations
    final provider = context.read<MotorProfileProvider>();
    provider.updateAccommodations(updates);

    HapticFeedback.heavyImpact();
    widget.onComplete?.call();
  }

  Map<String, dynamic> _analyzeResults() {
    // Analyze touch precision
    final touchPrecision = _assessmentResults['touch_precision'] ?? {};
    final avgDistance = touchPrecision['averageDistance'] ?? 10.0;
    final touchTargetMultiplier = _calculateMultiplier(avgDistance);

    // Analyze hold stability
    final holdStability = _assessmentResults['hold_stability'] ?? {};
    final tremor = holdStability['tremorDetected'] ?? false;
    final holdDeviation = holdStability['deviation'] ?? 0.0;

    // Analyze drag ability
    final dragAbility = _assessmentResults['drag_ability'] ?? {};
    final dragAccuracy = dragAbility['accuracy'] ?? 1.0;

    // Analyze tap speed
    final tapSpeed = _assessmentResults['tap_speed'] ?? {};
    final avgTapTime = tapSpeed['averageTime'] ?? 200;

    // Analyze preferences
    final preferences = _assessmentResults['preferences'] ?? {};

    // Return a Map of updates using correct field names from MotorProfile
    return {
      'touchTargetMultiplier': touchTargetMultiplier,
      'enlargedTouchTargets': touchTargetMultiplier > 1.0,
      'tremorFilterEnabled': tremor || holdDeviation > 5,
      'tremorFilterStrength': tremor ? 0.7 : 0.5,
      'dwellSelectionEnabled': avgTapTime > 400,
      'dwellTimeMs': avgTapTime > 400 ? 500 : 1000,
      'dragAssistEnabled': dragAccuracy < 0.7,
      'dragAutoComplete': dragAccuracy < 0.7,
      'dragAutoCompleteThreshold': dragAccuracy < 0.7 ? 40 : 50,
      'voiceInputEnabled': preferences['preferVoice'] ?? false,
      'switchAccessEnabled': preferences['useSwitchDevice'] ?? false,
      'simplifiedGestures': dragAccuracy < 0.5,
      'touchHoldDuration': avgTapTime > 500 ? 300 : 0,
      'accidentalTouchFilter': touchTargetMultiplier > 1.3,
      'edgeIgnoreMargin': touchTargetMultiplier > 1.3 ? 20 : 0,
      'showTouchRipples': true,
      'highlightFocusedElement': true,
      'autoBreakReminders': preferences['experiencesFatigue'] ?? false,
      'hasFatigue': preferences['experiencesFatigue'] ?? false,
      'breakReminderIntervalMinutes': 20,
    };
  }

  double _calculateMultiplier(double avgDistance) {
    if (avgDistance < 5) return 1.0;
    if (avgDistance < 10) return 1.2;
    if (avgDistance < 20) return 1.5;
    if (avgDistance < 30) return 1.8;
    return 2.0;
  }

  @override
  Widget build(BuildContext context) {
    final step = _steps[_currentStep];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Motor Assessment'),
        actions: [
          TextButton(
            onPressed: widget.onSkip,
            child: const Text('Skip'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Progress indicator
          _ProgressBar(
            currentStep: _currentStep,
            totalSteps: _steps.length,
          ),

          // Step content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Text(
                    step.title,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    step.description,
                    style: Theme.of(context).textTheme.bodyLarge,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),

                  // Assessment widget
                  Expanded(
                    child: _buildAssessmentWidget(step),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAssessmentWidget(_AssessmentStep step) {
    switch (step.type) {
      case _AssessmentType.touchTargets:
        return _TouchPrecisionTest(
          onComplete: (result) => _completeStep(result),
        );
      case _AssessmentType.holdTest:
        return _HoldStabilityTest(
          onComplete: (result) => _completeStep(result),
        );
      case _AssessmentType.dragTest:
        return _DragControlTest(
          onComplete: (result) => _completeStep(result),
        );
      case _AssessmentType.tapSpeed:
        return _TapSpeedTest(
          onComplete: (result) => _completeStep(result),
        );
      case _AssessmentType.preferences:
        return _PreferencesForm(
          onComplete: (result) => _completeStep(result),
        );
    }
  }
}

enum _AssessmentType {
  touchTargets,
  holdTest,
  dragTest,
  tapSpeed,
  preferences,
}

class _AssessmentStep {
  final String id;
  final String title;
  final String description;
  final _AssessmentType type;

  const _AssessmentStep({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
  });
}

class _ProgressBar extends StatelessWidget {
  final int currentStep;
  final int totalSteps;

  const _ProgressBar({
    required this.currentStep,
    required this.totalSteps,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: List.generate(totalSteps, (index) {
          final isCompleted = index < currentStep;
          final isCurrent = index == currentStep;

          return Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 2),
              height: 4,
              decoration: BoxDecoration(
                color: isCompleted || isCurrent
                    ? Theme.of(context).primaryColor
                    : Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          );
        }),
      ),
    );
  }
}

/// Touch precision test - tap targets
class _TouchPrecisionTest extends StatefulWidget {
  final void Function(Map<String, dynamic> result) onComplete;

  const _TouchPrecisionTest({required this.onComplete});

  @override
  State<_TouchPrecisionTest> createState() => _TouchPrecisionTestState();
}

class _TouchPrecisionTestState extends State<_TouchPrecisionTest> {
  final List<Offset> _targetPositions = [];
  final List<double> _distances = [];
  int _currentTarget = 0;
  static const int _totalTargets = 5;

  @override
  void initState() {
    super.initState();
    _generateTargets();
  }

  void _generateTargets() {
    // Generate random target positions
    for (int i = 0; i < _totalTargets; i++) {
      _targetPositions.add(Offset(
        50.0 + (i * 60.0) % 200,
        50.0 + (i * 80.0) % 250,
      ));
    }
  }

  void _handleTap(Offset tapPosition) {
    if (_currentTarget >= _totalTargets) return;

    final targetCenter = _targetPositions[_currentTarget];
    final distance = (tapPosition - targetCenter).distance;
    _distances.add(distance);

    HapticFeedback.lightImpact();

    if (_currentTarget < _totalTargets - 1) {
      setState(() => _currentTarget++);
    } else {
      final avgDistance = _distances.reduce((a, b) => a + b) / _distances.length;
      widget.onComplete({
        'distances': _distances,
        'averageDistance': avgDistance,
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return GestureDetector(
          onTapDown: (details) => _handleTap(details.localPosition),
          child: Container(
            color: Colors.grey.shade100,
            child: Stack(
              children: [
                // Instructions
                const Positioned(
                  bottom: 20,
                  left: 0,
                  right: 0,
                  child: Text(
                    'Tap the blue circle',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 16),
                  ),
                ),

                // Current target
                if (_currentTarget < _totalTargets)
                  Positioned(
                    left: _targetPositions[_currentTarget].dx - 25,
                    top: _targetPositions[_currentTarget].dy - 25,
                    child: Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: Theme.of(context).primaryColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),

                // Progress
                Positioned(
                  top: 10,
                  right: 10,
                  child: Text('${_currentTarget + 1} / $_totalTargets'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Hold stability test
class _HoldStabilityTest extends StatefulWidget {
  final void Function(Map<String, dynamic> result) onComplete;

  const _HoldStabilityTest({required this.onComplete});

  @override
  State<_HoldStabilityTest> createState() => _HoldStabilityTestState();
}

class _HoldStabilityTestState extends State<_HoldStabilityTest> {
  bool _isHolding = false;
  Offset? _startPosition;
  final List<double> _deviations = [];
  double _holdProgress = 0;
  static const double _holdDuration = 3.0; // seconds

  void _handlePointerDown(PointerDownEvent event) {
    setState(() {
      _isHolding = true;
      _startPosition = event.localPosition;
      _holdProgress = 0;
    });
    _startHoldTimer();
  }

  void _handlePointerMove(PointerMoveEvent event) {
    if (!_isHolding || _startPosition == null) return;

    final deviation = (event.localPosition - _startPosition!).distance;
    _deviations.add(deviation);
  }

  void _handlePointerUp(PointerUpEvent event) {
    setState(() => _isHolding = false);
  }

  void _startHoldTimer() async {
    const tickDuration = Duration(milliseconds: 50);
    const totalTicks = (_holdDuration * 1000) ~/ 50;

    for (int i = 0; i < totalTicks && _isHolding; i++) {
      await Future.delayed(tickDuration);
      if (mounted && _isHolding) {
        setState(() => _holdProgress = (i + 1) / totalTicks);
      }
    }

    if (_isHolding) {
      _completeTest();
    }
  }

  void _completeTest() {
    final maxDeviation =
        _deviations.isEmpty ? 0.0 : _deviations.reduce((a, b) => a > b ? a : b);
    final avgDeviation = _deviations.isEmpty
        ? 0.0
        : _deviations.reduce((a, b) => a + b) / _deviations.length;

    HapticFeedback.mediumImpact();

    widget.onComplete({
      'tremorDetected': maxDeviation > 10,
      'deviation': avgDeviation,
      'maxDeviation': maxDeviation,
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          'Touch and hold the button for 3 seconds',
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),

        Listener(
          onPointerDown: _handlePointerDown,
          onPointerMove: _handlePointerMove,
          onPointerUp: _handlePointerUp,
          child: Container(
            width: 150,
            height: 150,
            decoration: BoxDecoration(
              color: _isHolding
                  ? Theme.of(context).primaryColor
                  : Colors.grey.shade300,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: SizedBox(
                width: 120,
                height: 120,
                child: CircularProgressIndicator(
                  value: _holdProgress,
                  strokeWidth: 8,
                  backgroundColor: Colors.white24,
                  valueColor: const AlwaysStoppedAnimation(Colors.white),
                ),
              ),
            ),
          ),
        ),

        const SizedBox(height: 16),
        Text(
          _isHolding ? 'Keep holding...' : 'Touch to start',
          style: const TextStyle(fontSize: 18),
        ),
      ],
    );
  }
}

/// Drag control test
class _DragControlTest extends StatefulWidget {
  final void Function(Map<String, dynamic> result) onComplete;

  const _DragControlTest({required this.onComplete});

  @override
  State<_DragControlTest> createState() => _DragControlTestState();
}

class _DragControlTestState extends State<_DragControlTest> {
  Offset _objectPosition = const Offset(50, 50);
  static const Offset _targetPosition = Offset(250, 300);
  static const double _targetRadius = 50;
  int _attempts = 0;
  int _successes = 0;
  static const int _totalAttempts = 3;

  void _handleDragUpdate(DragUpdateDetails details) {
    setState(() {
      _objectPosition += details.delta;
    });
  }

  void _handleDragEnd(DragEndDetails details) {
    final distance = (_objectPosition - _targetPosition).distance;
    final success = distance < _targetRadius;

    _attempts++;
    if (success) {
      _successes++;
      HapticFeedback.heavyImpact();
    } else {
      HapticFeedback.lightImpact();
    }

    if (_attempts >= _totalAttempts) {
      widget.onComplete({
        'accuracy': _successes / _attempts,
        'attempts': _attempts,
        'successes': _successes,
      });
    } else {
      // Reset for next attempt
      setState(() {
        _objectPosition = const Offset(50, 50);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Target zone
        Positioned(
          left: _targetPosition.dx - _targetRadius,
          top: _targetPosition.dy - _targetRadius,
          child: Container(
            width: _targetRadius * 2,
            height: _targetRadius * 2,
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.3),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.green, width: 2),
            ),
            child: const Center(
              child: Text('Drop here', textAlign: TextAlign.center),
            ),
          ),
        ),

        // Draggable object
        Positioned(
          left: _objectPosition.dx - 30,
          top: _objectPosition.dy - 30,
          child: GestureDetector(
            onPanUpdate: _handleDragUpdate,
            onPanEnd: _handleDragEnd,
            child: Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.2),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Icon(Icons.drag_indicator, color: Colors.white),
            ),
          ),
        ),

        // Progress
        Positioned(
          top: 10,
          right: 10,
          child: Text('Attempt ${_attempts + 1} / $_totalAttempts'),
        ),
      ],
    );
  }
}

/// Tap speed test
class _TapSpeedTest extends StatefulWidget {
  final void Function(Map<String, dynamic> result) onComplete;

  const _TapSpeedTest({required this.onComplete});

  @override
  State<_TapSpeedTest> createState() => _TapSpeedTestState();
}

class _TapSpeedTestState extends State<_TapSpeedTest> {
  DateTime? _lastTapTime;
  final List<int> _tapIntervals = [];
  int _tapCount = 0;
  static const int _totalTaps = 10;

  void _handleTap() {
    final now = DateTime.now();

    if (_lastTapTime != null) {
      final interval = now.difference(_lastTapTime!).inMilliseconds;
      _tapIntervals.add(interval);
    }

    _lastTapTime = now;
    _tapCount++;

    HapticFeedback.lightImpact();

    if (_tapCount >= _totalTaps) {
      final avgTime = _tapIntervals.isEmpty
          ? 200
          : _tapIntervals.reduce((a, b) => a + b) ~/ _tapIntervals.length;

      widget.onComplete({
        'intervals': _tapIntervals,
        'averageTime': avgTime,
        'tapCount': _tapCount,
      });
    } else {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          'Tap the button at your comfortable speed',
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),

        GestureDetector(
          onTap: _handleTap,
          child: Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor,
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Text(
                'TAP',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ),

        const SizedBox(height: 24),
        Text(
          '$_tapCount / $_totalTaps taps',
          style: const TextStyle(fontSize: 18),
        ),

        const SizedBox(height: 8),
        LinearProgressIndicator(
          value: _tapCount / _totalTaps,
        ),
      ],
    );
  }
}

/// Preferences form
class _PreferencesForm extends StatefulWidget {
  final void Function(Map<String, dynamic> result) onComplete;

  const _PreferencesForm({required this.onComplete});

  @override
  State<_PreferencesForm> createState() => _PreferencesFormState();
}

class _PreferencesFormState extends State<_PreferencesForm> {
  bool _preferVoice = false;
  bool _preferAlternatives = false;
  bool _useSwitchDevice = false;
  bool _experiencesFatigue = false;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _PreferenceSwitch(
            title: 'Voice input',
            subtitle: 'Use voice commands instead of touch',
            value: _preferVoice,
            onChanged: (v) => setState(() => _preferVoice = v),
          ),
          _PreferenceSwitch(
            title: 'Alternative input methods',
            subtitle: 'Show alternative ways to input text',
            value: _preferAlternatives,
            onChanged: (v) => setState(() => _preferAlternatives = v),
          ),
          _PreferenceSwitch(
            title: 'Switch access device',
            subtitle: 'Using an external switch device',
            value: _useSwitchDevice,
            onChanged: (v) => setState(() => _useSwitchDevice = v),
          ),
          _PreferenceSwitch(
            title: 'Fatigue management',
            subtitle: 'Experience motor fatigue during use',
            value: _experiencesFatigue,
            onChanged: (v) => setState(() => _experiencesFatigue = v),
          ),

          const SizedBox(height: 32),

          Center(
            child: ElevatedButton(
              onPressed: () {
                widget.onComplete({
                  'preferVoice': _preferVoice,
                  'preferAlternatives': _preferAlternatives,
                  'useSwitchDevice': _useSwitchDevice,
                  'experiencesFatigue': _experiencesFatigue,
                });
              },
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 48,
                  vertical: 16,
                ),
              ),
              child: const Text('Complete Assessment'),
            ),
          ),
        ],
      ),
    );
  }
}

class _PreferenceSwitch extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _PreferenceSwitch({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      title: Text(title),
      subtitle: Text(subtitle),
      value: value,
      onChanged: onChanged,
    );
  }
}
