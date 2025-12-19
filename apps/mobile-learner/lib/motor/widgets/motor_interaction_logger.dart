/// Motor Interaction Logger - ND-3.3
///
/// Provides utilities for logging motor interactions
/// to track usage and adapt accommodations over time.

import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';
import '../motor_profile_provider.dart';
import '../motor_accommodation_service.dart';

/// Types of motor interactions that can be logged
enum MotorInteractionType {
  tap('tap'),
  doubleTap('double_tap'),
  longPress('long_press'),
  drag('drag'),
  swipe('swipe'),
  pinch('pinch'),
  dwellSelect('dwell_select'),
  voiceInput('voice_input'),
  switchAccess('switch_access'),
  holdToActivate('hold_to_activate'),
  handwritingInput('handwriting_input'),
  gestureSimplified('gesture_simplified'),
  tremorFiltered('tremor_filtered'),
  accidentalTouchRejected('accidental_touch_rejected'),
  fatigueBreakTaken('fatigue_break_taken'),
  assistedDrag('assisted_drag');

  final String value;
  const MotorInteractionType(this.value);
}

/// Result of an interaction attempt
class InteractionResult {
  final bool successful;
  final int attemptCount;
  final int? successOnAttempt;
  final int? totalTimeMs;
  final double? accuracy;
  final bool usedAlternative;
  final String? alternativeMethod;

  const InteractionResult({
    required this.successful,
    this.attemptCount = 1,
    this.successOnAttempt,
    this.totalTimeMs,
    this.accuracy,
    this.usedAlternative = false,
    this.alternativeMethod,
  });

  factory InteractionResult.success({
    int attemptCount = 1,
    int? totalTimeMs,
    double? accuracy,
  }) {
    return InteractionResult(
      successful: true,
      attemptCount: attemptCount,
      successOnAttempt: attemptCount,
      totalTimeMs: totalTimeMs,
      accuracy: accuracy,
    );
  }

  factory InteractionResult.failure({
    int attemptCount = 1,
    int? totalTimeMs,
  }) {
    return InteractionResult(
      successful: false,
      attemptCount: attemptCount,
      totalTimeMs: totalTimeMs,
    );
  }

  factory InteractionResult.withAlternative({
    required String method,
    int attemptCount = 1,
    int? totalTimeMs,
  }) {
    return InteractionResult(
      successful: true,
      attemptCount: attemptCount,
      successOnAttempt: attemptCount,
      totalTimeMs: totalTimeMs,
      usedAlternative: true,
      alternativeMethod: method,
    );
  }
}

/// Mixin for widgets that log motor interactions
mixin MotorInteractionLogging<T extends StatefulWidget> on State<T> {
  MotorAccommodationService? _service;
  String? _learnerId;
  String? _sessionId;

  /// Initialize logging with service and learner context
  void initLogging() {
    try {
      final provider = context.read<MotorProfileProvider>();
      _service = provider.service;
      _learnerId = provider.service?.currentLearnerId;
    } catch (_) {
      // Provider not available - logging disabled
    }
  }

  /// Set session ID for grouping interactions
  void setSessionId(String sessionId) {
    _sessionId = sessionId;
  }

  /// Get the list of active accommodations
  List<String> get _activeAccommodations {
    try {
      final provider = context.read<MotorProfileProvider>();
      return [
        if (provider.tremorFilterEnabled) 'tremor_filter',
        if (provider.dwellTimeEnabled) 'dwell_selection',
        if (provider.dragAssistEnabled) 'drag_assist',
        if (provider.voiceInputEnabled) 'voice_input',
        if (provider.simplifiedGesturesEnabled) 'simplified_gestures',
        if (provider.switchAccessEnabled) 'switch_access',
        if (provider.holdToActivateEnabled) 'hold_to_activate',
        if (provider.accidentalTouchFilterEnabled) 'accidental_touch_filter',
        if (provider.fatigueManagementEnabled) 'fatigue_management',
      ];
    } catch (_) {
      return [];
    }
  }

  /// Log a motor interaction
  Future<void> logInteraction({
    required MotorInteractionType type,
    required InteractionResult result,
    String? targetElement,
    double? dragPathSmoothness,
  }) async {
    if (_service == null || _learnerId == null) return;

    await _service!.logInteraction(
      learnerId: _learnerId!,
      interactionType: type.value,
      sessionId: _sessionId,
      targetElement: targetElement,
      attemptCount: result.attemptCount,
      successOnAttempt: result.successOnAttempt,
      totalTimeMs: result.totalTimeMs,
      targetHitAccuracy: result.accuracy,
      dragPathSmoothness: dragPathSmoothness,
      successful: result.successful,
      usedAlternative: result.usedAlternative,
      alternativeMethod: result.alternativeMethod,
      accommodationsActive: _activeAccommodations,
    );
  }

  /// Quick log for successful tap
  Future<void> logTap({String? targetElement}) async {
    await logInteraction(
      type: MotorInteractionType.tap,
      result: InteractionResult.success(),
      targetElement: targetElement,
    );
  }

  /// Quick log for successful dwell selection
  Future<void> logDwellSelect({
    String? targetElement,
    int? dwellTimeMs,
  }) async {
    await logInteraction(
      type: MotorInteractionType.dwellSelect,
      result: InteractionResult.success(totalTimeMs: dwellTimeMs),
      targetElement: targetElement,
    );
  }

  /// Quick log for voice input
  Future<void> logVoiceInput({
    String? targetElement,
    bool successful = true,
  }) async {
    await logInteraction(
      type: MotorInteractionType.voiceInput,
      result: successful
          ? InteractionResult.withAlternative(method: 'voice')
          : InteractionResult.failure(),
      targetElement: targetElement,
    );
  }

  /// Quick log for switch access activation
  Future<void> logSwitchAccess({String? targetElement}) async {
    await logInteraction(
      type: MotorInteractionType.switchAccess,
      result: InteractionResult.withAlternative(method: 'switch'),
      targetElement: targetElement,
    );
  }

  /// Quick log for drag interaction
  Future<void> logDrag({
    String? targetElement,
    required bool successful,
    double? smoothness,
    bool assisted = false,
  }) async {
    await logInteraction(
      type: assisted
          ? MotorInteractionType.assistedDrag
          : MotorInteractionType.drag,
      result: successful
          ? InteractionResult.success()
          : InteractionResult.failure(),
      targetElement: targetElement,
      dragPathSmoothness: smoothness,
    );
  }
}

/// Static logger for use without mixin
class MotorInteractionLogger {
  final MotorAccommodationService service;
  final String learnerId;
  final String? sessionId;
  final BuildContext? context;

  MotorInteractionLogger({
    required this.service,
    required this.learnerId,
    this.sessionId,
    this.context,
  });

  /// Create from provider
  factory MotorInteractionLogger.fromContext(BuildContext context) {
    final provider = context.read<MotorProfileProvider>();
    return MotorInteractionLogger(
      service: provider.service!,
      learnerId: provider.service!.currentLearnerId!,
      context: context,
    );
  }

  /// Get active accommodations from context
  List<String> get activeAccommodations {
    if (context == null) return [];
    try {
      final provider = context!.read<MotorProfileProvider>();
      return [
        if (provider.tremorFilterEnabled) 'tremor_filter',
        if (provider.dwellTimeEnabled) 'dwell_selection',
        if (provider.dragAssistEnabled) 'drag_assist',
        if (provider.voiceInputEnabled) 'voice_input',
        if (provider.simplifiedGesturesEnabled) 'simplified_gestures',
        if (provider.switchAccessEnabled) 'switch_access',
        if (provider.holdToActivateEnabled) 'hold_to_activate',
        if (provider.accidentalTouchFilterEnabled) 'accidental_touch_filter',
        if (provider.fatigueManagementEnabled) 'fatigue_management',
      ];
    } catch (_) {
      return [];
    }
  }

  /// Log a motor interaction
  Future<void> log({
    required MotorInteractionType type,
    required InteractionResult result,
    String? targetElement,
    double? dragPathSmoothness,
  }) async {
    await service.logInteraction(
      learnerId: learnerId,
      interactionType: type.value,
      sessionId: sessionId,
      targetElement: targetElement,
      attemptCount: result.attemptCount,
      successOnAttempt: result.successOnAttempt,
      totalTimeMs: result.totalTimeMs,
      targetHitAccuracy: result.accuracy,
      dragPathSmoothness: dragPathSmoothness,
      successful: result.successful,
      usedAlternative: result.usedAlternative,
      alternativeMethod: result.alternativeMethod,
      accommodationsActive: activeAccommodations,
    );
  }

  /// Log a tap
  Future<void> logTap({String? targetElement}) async {
    await log(
      type: MotorInteractionType.tap,
      result: InteractionResult.success(),
      targetElement: targetElement,
    );
  }

  /// Log dwell selection
  Future<void> logDwellSelect({
    String? targetElement,
    int? dwellTimeMs,
  }) async {
    await log(
      type: MotorInteractionType.dwellSelect,
      result: InteractionResult.success(totalTimeMs: dwellTimeMs),
      targetElement: targetElement,
    );
  }

  /// Log voice input
  Future<void> logVoiceInput({
    String? targetElement,
    bool successful = true,
  }) async {
    await log(
      type: MotorInteractionType.voiceInput,
      result: successful
          ? InteractionResult.withAlternative(method: 'voice')
          : InteractionResult.failure(),
      targetElement: targetElement,
    );
  }

  /// Log drag
  Future<void> logDrag({
    String? targetElement,
    required bool successful,
    double? smoothness,
    bool assisted = false,
  }) async {
    await log(
      type: assisted
          ? MotorInteractionType.assistedDrag
          : MotorInteractionType.drag,
      result: successful
          ? InteractionResult.success()
          : InteractionResult.failure(),
      targetElement: targetElement,
      dragPathSmoothness: smoothness,
    );
  }

  /// Log switch access
  Future<void> logSwitchAccess({String? targetElement}) async {
    await log(
      type: MotorInteractionType.switchAccess,
      result: InteractionResult.withAlternative(method: 'switch'),
      targetElement: targetElement,
    );
  }

  /// Log tremor filtering event
  Future<void> logTremorFiltered({String? targetElement}) async {
    await log(
      type: MotorInteractionType.tremorFiltered,
      result: InteractionResult.success(),
      targetElement: targetElement,
    );
  }

  /// Log rejected accidental touch
  Future<void> logAccidentalTouchRejected({String? targetElement}) async {
    await log(
      type: MotorInteractionType.accidentalTouchRejected,
      result: InteractionResult.success(),
      targetElement: targetElement,
    );
  }

  /// Log fatigue break
  Future<void> logFatigueBreak({int? breakDurationMs}) async {
    await log(
      type: MotorInteractionType.fatigueBreakTaken,
      result: InteractionResult.success(totalTimeMs: breakDurationMs),
    );
  }
}

/// Extension to easily get logger from context
extension MotorLoggingContext on BuildContext {
  MotorInteractionLogger? get motorLogger {
    try {
      return MotorInteractionLogger.fromContext(this);
    } catch (_) {
      return null;
    }
  }
}
