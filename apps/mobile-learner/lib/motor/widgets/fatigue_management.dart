/// Fatigue Management Widget - ND-3.3
///
/// Provides fatigue detection, break reminders, and requirement reduction
/// for learners who experience motor fatigue during extended use.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../motor_profile_provider.dart';

/// Controller for managing fatigue state and break reminders
class FatigueManager extends ChangeNotifier {
  Timer? _breakTimer;
  Timer? _sessionTimer;
  DateTime? _sessionStart;
  int _breakReminderMinutes = 20;
  bool _isBreakRemindersEnabled = false;
  bool _isBreakDialogShowing = false;
  int _totalSessionMinutes = 0;
  double _estimatedFatigueLevel = 0.0; // 0.0 - 1.0
  int? _fatigueThresholdMinutes;

  // Getters
  DateTime? get sessionStart => _sessionStart;
  int get breakReminderMinutes => _breakReminderMinutes;
  bool get isBreakRemindersEnabled => _isBreakRemindersEnabled;
  int get totalSessionMinutes => _totalSessionMinutes;
  double get estimatedFatigueLevel => _estimatedFatigueLevel;
  bool get isBreakDue => _estimatedFatigueLevel > 0.7;
  bool get isFatigued => _estimatedFatigueLevel > 0.5;

  /// Configure from motor profile
  void configure({
    required bool breakRemindersEnabled,
    required int breakIntervalMinutes,
    int? fatigueThresholdMinutes,
  }) {
    _isBreakRemindersEnabled = breakRemindersEnabled;
    _breakReminderMinutes = breakIntervalMinutes;
    _fatigueThresholdMinutes = fatigueThresholdMinutes;

    if (_isBreakRemindersEnabled && _sessionStart != null) {
      _startBreakTimer();
    }
    notifyListeners();
  }

  /// Start tracking session
  void startSession() {
    _sessionStart = DateTime.now();
    _totalSessionMinutes = 0;
    _estimatedFatigueLevel = 0.0;

    // Start session timer to track duration
    _sessionTimer?.cancel();
    _sessionTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      _updateSessionMetrics();
    });

    if (_isBreakRemindersEnabled) {
      _startBreakTimer();
    }

    notifyListeners();
  }

  void _startBreakTimer() {
    _breakTimer?.cancel();
    _breakTimer = Timer(
      Duration(minutes: _breakReminderMinutes),
      _onBreakTimerFired,
    );
  }

  void _updateSessionMetrics() {
    if (_sessionStart == null) return;

    _totalSessionMinutes = DateTime.now().difference(_sessionStart!).inMinutes;

    // Estimate fatigue based on session duration
    if (_fatigueThresholdMinutes != null && _fatigueThresholdMinutes! > 0) {
      _estimatedFatigueLevel =
          (_totalSessionMinutes / _fatigueThresholdMinutes!).clamp(0.0, 1.0);
    } else {
      // Default fatigue curve: 50% at 30 min, 80% at 60 min
      _estimatedFatigueLevel = (1 - 1 / (1 + _totalSessionMinutes / 30))
          .clamp(0.0, 1.0);
    }

    notifyListeners();
  }

  void _onBreakTimerFired() {
    if (!_isBreakDialogShowing) {
      _isBreakDialogShowing = true;
      notifyListeners();
    }
  }

  /// Record that user took a break
  void recordBreak() {
    _isBreakDialogShowing = false;
    _estimatedFatigueLevel = (_estimatedFatigueLevel - 0.3).clamp(0.0, 1.0);

    if (_isBreakRemindersEnabled) {
      _startBreakTimer();
    }

    notifyListeners();
  }

  /// User dismissed break reminder without taking break
  void dismissBreakReminder() {
    _isBreakDialogShowing = false;
    notifyListeners();

    // Remind again in 5 minutes
    _breakTimer?.cancel();
    _breakTimer = Timer(const Duration(minutes: 5), _onBreakTimerFired);
  }

  /// End tracking session
  void endSession() {
    _breakTimer?.cancel();
    _sessionTimer?.cancel();
    _sessionStart = null;
    _isBreakDialogShowing = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _breakTimer?.cancel();
    _sessionTimer?.cancel();
    super.dispose();
  }
}

/// Widget that wraps content and provides fatigue management
class FatigueManagementWrapper extends StatefulWidget {
  final Widget child;
  final FatigueManager? manager;

  const FatigueManagementWrapper({
    super.key,
    required this.child,
    this.manager,
  });

  @override
  State<FatigueManagementWrapper> createState() =>
      _FatigueManagementWrapperState();
}

class _FatigueManagementWrapperState extends State<FatigueManagementWrapper> {
  late FatigueManager _manager;

  @override
  void initState() {
    super.initState();
    _manager = widget.manager ?? FatigueManager();
  }

  @override
  void dispose() {
    if (widget.manager == null) {
      _manager.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        // Configure manager from profile
        _manager.configure(
          breakRemindersEnabled: motorProfile.autoBreakReminders,
          breakIntervalMinutes: motorProfile.breakReminderIntervalMinutes,
          fatigueThresholdMinutes: motorProfile.fatigueThresholdMinutes,
        );

        if (!motorProfile.hasFatigue && !motorProfile.autoBreakReminders) {
          return widget.child;
        }

        return ListenableBuilder(
          listenable: _manager,
          builder: (context, _) {
            return Stack(
              children: [
                widget.child,

                // Break reminder overlay
                if (_manager._isBreakDialogShowing)
                  _BreakReminderOverlay(
                    manager: _manager,
                    multiplier: motorProfile.touchTargetMultiplier,
                  ),
              ],
            );
          },
        );
      },
    );
  }
}

class _BreakReminderOverlay extends StatelessWidget {
  final FatigueManager manager;
  final double multiplier;

  const _BreakReminderOverlay({
    required this.manager,
    required this.multiplier,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black.withOpacity(0.7),
      child: Center(
        child: Container(
          margin: const EdgeInsets.all(32),
          padding: EdgeInsets.all(24 * multiplier),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.self_improvement,
                size: 64 * multiplier,
                color: Colors.blue,
              ),
              SizedBox(height: 16 * multiplier),
              Text(
                'Time for a Break!',
                style: TextStyle(
                  fontSize: 24 * multiplier,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 8 * multiplier),
              Text(
                'You\'ve been working for ${manager.totalSessionMinutes} minutes.\n'
                'Take a short break to rest your hands.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16 * multiplier),
              ),
              SizedBox(height: 24 * multiplier),

              // Break suggestions
              _BreakSuggestions(multiplier: multiplier),

              SizedBox(height: 24 * multiplier),

              // Action buttons
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextButton(
                    onPressed: () {
                      manager.dismissBreakReminder();
                      HapticFeedback.lightImpact();
                    },
                    child: Text(
                      'Remind me later',
                      style: TextStyle(fontSize: 14 * multiplier),
                    ),
                  ),
                  SizedBox(width: 16 * multiplier),
                  ElevatedButton(
                    onPressed: () {
                      manager.recordBreak();
                      HapticFeedback.mediumImpact();
                    },
                    child: Padding(
                      padding: EdgeInsets.symmetric(
                        horizontal: 16 * multiplier,
                        vertical: 8 * multiplier,
                      ),
                      child: Text(
                        'I took a break',
                        style: TextStyle(fontSize: 16 * multiplier),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BreakSuggestions extends StatelessWidget {
  final double multiplier;

  const _BreakSuggestions({required this.multiplier});

  static const List<Map<String, dynamic>> suggestions = [
    {'icon': Icons.pan_tool, 'text': 'Shake out your hands'},
    {'icon': Icons.remove_red_eye, 'text': 'Look away from the screen'},
    {'icon': Icons.air, 'text': 'Take deep breaths'},
    {'icon': Icons.directions_walk, 'text': 'Stand up and stretch'},
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      children: suggestions.map((suggestion) {
        return Padding(
          padding: EdgeInsets.symmetric(vertical: 4 * multiplier),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                suggestion['icon'] as IconData,
                size: 20 * multiplier,
                color: Colors.grey.shade600,
              ),
              SizedBox(width: 8 * multiplier),
              Text(
                suggestion['text'] as String,
                style: TextStyle(
                  fontSize: 14 * multiplier,
                  color: Colors.grey.shade700,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

/// Fatigue level indicator widget
class FatigueLevelIndicator extends StatelessWidget {
  final FatigueManager manager;
  final bool showLabel;
  final double? width;

  const FatigueLevelIndicator({
    super.key,
    required this.manager,
    this.showLabel = true,
    this.width,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;

        return ListenableBuilder(
          listenable: manager,
          builder: (context, _) {
            final level = manager.estimatedFatigueLevel;
            final color = _getColorForLevel(level);

            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (showLabel)
                  Padding(
                    padding: EdgeInsets.only(bottom: 4 * multiplier),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _getIconForLevel(level),
                          size: 16 * multiplier,
                          color: color,
                        ),
                        SizedBox(width: 4 * multiplier),
                        Text(
                          _getLabelForLevel(level),
                          style: TextStyle(
                            fontSize: 12 * multiplier,
                            color: color,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),

                // Progress bar
                Container(
                  width: width ?? 100,
                  height: 8 * multiplier,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(4 * multiplier),
                  ),
                  child: FractionallySizedBox(
                    alignment: Alignment.centerLeft,
                    widthFactor: level,
                    child: Container(
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: BorderRadius.circular(4 * multiplier),
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Color _getColorForLevel(double level) {
    if (level < 0.3) return Colors.green;
    if (level < 0.5) return Colors.lightGreen;
    if (level < 0.7) return Colors.orange;
    return Colors.red;
  }

  IconData _getIconForLevel(double level) {
    if (level < 0.3) return Icons.battery_full;
    if (level < 0.5) return Icons.battery_5_bar;
    if (level < 0.7) return Icons.battery_3_bar;
    return Icons.battery_1_bar;
  }

  String _getLabelForLevel(double level) {
    if (level < 0.3) return 'Fresh';
    if (level < 0.5) return 'Good';
    if (level < 0.7) return 'Getting tired';
    return 'Need a break';
  }
}

/// Widget that adapts its requirements based on fatigue level
class FatigueAdaptiveWidget extends StatelessWidget {
  final Widget normalChild;
  final Widget? fatiguedChild;
  final Widget? veryFatiguedChild;
  final FatigueManager manager;

  const FatigueAdaptiveWidget({
    super.key,
    required this.normalChild,
    required this.manager,
    this.fatiguedChild,
    this.veryFatiguedChild,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        if (!motorProfile.reduceRequirementsOnFatigue) {
          return normalChild;
        }

        return ListenableBuilder(
          listenable: manager,
          builder: (context, _) {
            final level = manager.estimatedFatigueLevel;

            if (level > 0.7 && veryFatiguedChild != null) {
              return veryFatiguedChild!;
            }
            if (level > 0.5 && fatiguedChild != null) {
              return fatiguedChild!;
            }
            return normalChild;
          },
        );
      },
    );
  }
}

/// Settings panel for fatigue management
class FatigueManagementSettings extends StatelessWidget {
  final FatigueManager manager;

  const FatigueManagementSettings({
    super.key,
    required this.manager,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Fatigue Management',
              style: TextStyle(
                fontSize: 18 * multiplier,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 16 * multiplier),

            // Break reminders toggle
            SwitchListTile(
              title: Text(
                'Break Reminders',
                style: TextStyle(fontSize: 16 * multiplier),
              ),
              subtitle: Text(
                'Get reminders to take breaks',
                style: TextStyle(fontSize: 12 * multiplier),
              ),
              value: motorProfile.autoBreakReminders,
              onChanged: (value) {
                motorProfile.updateAccommodation('autoBreakReminders', value);
              },
            ),

            if (motorProfile.autoBreakReminders) ...[
              SizedBox(height: 8 * multiplier),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Remind every ${motorProfile.breakReminderIntervalMinutes} minutes',
                      style: TextStyle(fontSize: 14 * multiplier),
                    ),
                    Slider(
                      value: motorProfile.breakReminderIntervalMinutes.toDouble(),
                      min: 5,
                      max: 60,
                      divisions: 11,
                      label: '${motorProfile.breakReminderIntervalMinutes} min',
                      onChanged: (value) {
                        motorProfile.updateAccommodation(
                          'breakReminderIntervalMinutes',
                          value.round(),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],

            SizedBox(height: 16 * multiplier),

            // Reduce requirements toggle
            SwitchListTile(
              title: Text(
                'Reduce Requirements When Tired',
                style: TextStyle(fontSize: 16 * multiplier),
              ),
              subtitle: Text(
                'Simplify tasks when fatigue is detected',
                style: TextStyle(fontSize: 12 * multiplier),
              ),
              value: motorProfile.reduceRequirementsOnFatigue,
              onChanged: (value) {
                motorProfile.updateAccommodation(
                  'reduceRequirementsOnFatigue',
                  value,
                );
              },
            ),

            SizedBox(height: 16 * multiplier),

            // Current fatigue level
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Current Session',
                    style: TextStyle(
                      fontSize: 14 * multiplier,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  SizedBox(height: 8 * multiplier),
                  FatigueLevelIndicator(
                    manager: manager,
                    width: double.infinity,
                  ),
                  SizedBox(height: 8 * multiplier),
                  Text(
                    'Session time: ${manager.totalSessionMinutes} minutes',
                    style: TextStyle(
                      fontSize: 12 * multiplier,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}
