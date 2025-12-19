/// Motor Profile Provider - ND-3.3
///
/// State management for motor accommodations.
/// Provides reactive access to motor profile settings.

import 'package:flutter/foundation.dart';
import 'motor_models.dart';
import 'motor_accommodation_service.dart';

/// Provider for motor accommodation state
class MotorProfileProvider extends ChangeNotifier {
  MotorAccommodationService? _service;
  MotorProfile? _profile;
  MotorAccommodations? _accommodations;
  bool _loading = false;
  String? _error;
  String? _currentLearnerId;

  // Getters
  MotorAccommodationService? get service => _service;
  MotorProfile? get profile => _profile;
  MotorAccommodations? get accommodations => _accommodations;
  bool get loading => _loading;
  String? get error => _error;
  bool get hasAccommodations => _accommodations != null;

  // Quick access getters
  bool get enlargedTouchTargets =>
      _accommodations?.touchTargetMultiplier != null &&
      _accommodations!.touchTargetMultiplier > 1.0;

  double get touchTargetMultiplier =>
      _accommodations?.touchTargetMultiplier ?? 1.0;

  int get touchHoldDuration => _accommodations?.touchHoldDuration ?? 0;

  bool get voiceInputEnabled => _accommodations?.voiceInputEnabled ?? false;

  bool get dwellSelectionEnabled =>
      _accommodations?.dwellSelectionEnabled ?? false;

  int get dwellTimeMs => _accommodations?.dwellTimeMs ?? 1000;

  String get dwellIndicatorStyle =>
      _accommodations?.dwellIndicatorStyle ?? 'circle';

  bool get tremorFilterEnabled =>
      _accommodations?.tremorFilterEnabled ?? false;

  int get tremorFilterStrength =>
      _accommodations?.tremorFilterStrength ?? 50;

  bool get simplifiedGestures => _accommodations?.simplifiedGestures ?? false;

  bool get dragAssistEnabled => _accommodations?.dragAssistEnabled ?? false;

  bool get dragSnapToGrid => _accommodations?.dragSnapToGrid ?? false;

  int get dragGridSize => _accommodations?.dragGridSize ?? 20;

  bool get dragAutoComplete => _accommodations?.dragAutoComplete ?? false;

  int get dragAutoCompleteThreshold =>
      _accommodations?.dragAutoCompleteThreshold ?? 30;

  bool get enhancedTouchFeedback =>
      _accommodations?.enhancedTouchFeedback ?? false;

  String get hapticFeedbackIntensity =>
      _accommodations?.hapticFeedbackIntensity ?? 'normal';

  double get responseTimeMultiplier =>
      _accommodations?.responseTimeMultiplier ?? 1.0;

  bool get disableTimedElements =>
      _accommodations?.disableTimedElements ?? false;

  bool get preferTyping => _accommodations?.preferTyping ?? false;

  bool get enlargedKeyboard => _accommodations?.enlargedKeyboard ?? false;

  String get keyboardType => _accommodations?.keyboardType ?? 'standard';

  bool get showWordPrediction => _accommodations?.showWordPrediction ?? true;

  // Missing getters for widgets
  bool get holdToActivateEnabled =>
      _accommodations?.holdToActivateEnabled ?? false;

  bool get switchAccessEnabled =>
      _accommodations?.switchAccessEnabled ?? false;

  int get switchScanSpeed => _accommodations?.switchScanSpeed ?? 1000;

  bool get gesturesToButtons => _accommodations?.gesturesToButtons ?? false;

  double get tremorSmoothingFactor =>
      _accommodations?.tremorSmoothingFactor ?? 0.7;

  int get tremorWindowSize => _accommodations?.tremorWindowSize ?? 5;

  int get tremorMovementThreshold =>
      _accommodations?.tremorMovementThreshold ?? 3;

  bool get accidentalTouchFilter =>
      _accommodations?.accidentalTouchFilter ?? false;

  int get edgeIgnoreMargin => _accommodations?.edgeIgnoreMargin ?? 0;

  bool get showTouchRipples => _accommodations?.showTouchRipples ?? true;

  bool get highlightFocusedElement =>
      _accommodations?.highlightFocusedElement ?? false;

  // Fatigue management
  bool get hasFatigue => _profile?.hasFatigue ?? false;

  int? get fatigueThresholdMinutes => _profile?.fatigueThresholdMinutes;

  bool get autoBreakReminders =>
      _accommodations?.autoBreakReminders ?? false;

  int get breakReminderIntervalMinutes =>
      _accommodations?.breakReminderIntervalMinutes ?? 20;

  bool get reduceRequirementsOnFatigue =>
      _accommodations?.reduceRequirementsOnFatigue ?? false;

  // Alias getters for widget compatibility
  bool get dwellTimeEnabled => dwellSelectionEnabled;
  bool get simplifiedGesturesEnabled => simplifiedGestures;
  bool get accidentalTouchFilterEnabled => accidentalTouchFilter;
  bool get fatigueManagementEnabled =>
      autoBreakReminders || hasFatigue;

  /// Initialize with a service instance
  void initialize(MotorAccommodationService service) {
    _service = service;
  }

  /// Load accommodations for a learner
  Future<void> loadAccommodations(String learnerId) async {
    if (_service == null) {
      _error = 'Service not initialized';
      notifyListeners();
      return;
    }

    _loading = true;
    _error = null;
    _currentLearnerId = learnerId;
    notifyListeners();

    try {
      _profile = await _service!.getProfile(learnerId);
      _accommodations = await _service!.getAccommodations(learnerId);
      _error = null;
    } catch (e) {
      _error = e.toString();
      debugPrint('Failed to load motor accommodations: $e');
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  /// Update a single accommodation setting
  Future<void> updateAccommodation(String key, dynamic value) async {
    if (_service == null || _currentLearnerId == null) return;

    try {
      await _service!.updateProfile(_currentLearnerId!, {key: value});
      await loadAccommodations(_currentLearnerId!);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  /// Update multiple accommodation settings
  Future<void> updateAccommodations(Map<String, dynamic> updates) async {
    if (_service == null || _currentLearnerId == null) return;

    try {
      await _service!.updateProfile(_currentLearnerId!, updates);
      await loadAccommodations(_currentLearnerId!);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  /// Get content modifications based on motor profile
  Map<String, dynamic> getContentModifications() {
    if (_accommodations == null) {
      return {};
    }

    return {
      'touchTargetMultiplier': _accommodations!.touchTargetMultiplier,
      'responseTimeMultiplier': _accommodations!.responseTimeMultiplier,
      'disableTimedElements': _accommodations!.disableTimedElements,
      'preferredInputTypes': _getPreferredInputTypes(),
      'dragAssist': _accommodations!.dragAssistEnabled
          ? {
              'snapToGrid': _accommodations!.dragSnapToGrid,
              'gridSize': _accommodations!.dragGridSize,
              'autoComplete': _accommodations!.dragAutoComplete,
              'threshold': _accommodations!.dragAutoCompleteThreshold,
            }
          : null,
      'tremorFilter': _accommodations!.tremorFilterEnabled
          ? {
              'enabled': true,
              'strength': _accommodations!.tremorFilterStrength,
            }
          : null,
    };
  }

  List<String> _getPreferredInputTypes() {
    final types = <String>['multiple_choice'];

    if (_accommodations?.preferTyping == true) {
      types.add('typing');
    }
    if (_accommodations?.voiceInputEnabled == true) {
      types.add('voice');
    }
    if (_accommodations?.dwellSelectionEnabled == true) {
      types.add('dwell');
    }

    return types;
  }

  /// Clear loaded data
  void clear() {
    _profile = null;
    _accommodations = null;
    _currentLearnerId = null;
    _error = null;
    notifyListeners();
  }
}
