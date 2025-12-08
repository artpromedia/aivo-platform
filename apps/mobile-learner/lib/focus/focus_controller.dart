import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

import 'focus_service.dart';

/// State for focus telemetry and break management.
class FocusState {
  const FocusState({
    this.isMonitoring = false,
    this.lastPingTime,
    this.requiresBreak = false,
    this.focusLossReasons = const [],
    this.pendingActivity,
    this.isOnBreak = false,
    this.breakStartTime,
    this.error,
  });

  /// Whether focus monitoring is active.
  final bool isMonitoring;

  /// When the last ping was sent.
  final DateTime? lastPingTime;

  /// Whether a break is recommended based on telemetry.
  final bool requiresBreak;

  /// Reasons detected for focus loss.
  final List<String> focusLossReasons;

  /// Activity suggested for the next break.
  final RegulationActivity? pendingActivity;

  /// Whether currently on a break.
  final bool isOnBreak;

  /// When the current break started.
  final DateTime? breakStartTime;

  /// Any error from the focus service.
  final String? error;

  FocusState copyWith({
    bool? isMonitoring,
    DateTime? lastPingTime,
    bool? requiresBreak,
    List<String>? focusLossReasons,
    RegulationActivity? pendingActivity,
    bool clearPendingActivity = false,
    bool? isOnBreak,
    DateTime? breakStartTime,
    String? error,
    bool clearError = false,
  }) {
    return FocusState(
      isMonitoring: isMonitoring ?? this.isMonitoring,
      lastPingTime: lastPingTime ?? this.lastPingTime,
      requiresBreak: requiresBreak ?? this.requiresBreak,
      focusLossReasons: focusLossReasons ?? this.focusLossReasons,
      pendingActivity: clearPendingActivity ? null : pendingActivity ?? this.pendingActivity,
      isOnBreak: isOnBreak ?? this.isOnBreak,
      breakStartTime: breakStartTime ?? this.breakStartTime,
      error: clearError ? null : error ?? this.error,
    );
  }
}

/// Controller for focus monitoring and break management.
/// Sends periodic pings with telemetry and handles break recommendations.
class FocusController extends StateNotifier<FocusState> {
  FocusController(this._service, this._learnerId) : super(const FocusState());

  final FocusService _service;
  final String _learnerId;

  Timer? _pingTimer;
  DateTime? _lastInteractionTime;
  String? _currentSessionId;
  String? _currentActivityId;
  String? _currentGradeBand;

  static const _pingIntervalMs = 30000; // 30 seconds

  /// Configure the controller with session/activity context.
  void configure({
    required String sessionId,
    required String activityId,
    required AivoGradeBand gradeBand,
  }) {
    _currentSessionId = sessionId;
    _currentActivityId = activityId;
    _currentGradeBand = switch (gradeBand) {
      AivoGradeBand.k5 => 'K5',
      AivoGradeBand.g6_8 => 'G6_8',
      AivoGradeBand.g9_12 => 'G9_12',
    };
  }

  /// Start focus monitoring (sends periodic pings).
  void startMonitoring() {
    if (state.isMonitoring) return;

    state = state.copyWith(isMonitoring: true, clearError: true);
    _lastInteractionTime = DateTime.now();

    // Start periodic ping timer
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(
      const Duration(milliseconds: _pingIntervalMs),
      (_) => _sendPing(),
    );

    debugPrint('[FocusController] Monitoring started');
  }

  /// Stop focus monitoring.
  void stopMonitoring() {
    _pingTimer?.cancel();
    _pingTimer = null;
    state = state.copyWith(isMonitoring: false);
    debugPrint('[FocusController] Monitoring stopped');
  }

  /// Record user interaction (resets idle timer).
  void recordInteraction() {
    _lastInteractionTime = DateTime.now();
  }

  /// Record app going to background.
  Future<void> recordBackgrounded() async {
    await _sendPing(appInBackground: true);
  }

  /// Record rapid exit (user tried to leave activity quickly).
  Future<void> recordRapidExit() async {
    await _sendPing(rapidExit: true);
  }

  /// Self-report mood (triggers immediate ping).
  Future<void> reportMood(SelfReportedMood mood) async {
    await _sendPing(mood: mood);
  }

  /// Dismiss the break recommendation (user chooses to continue).
  void dismissBreakRecommendation() {
    state = state.copyWith(
      requiresBreak: false,
      clearPendingActivity: true,
    );
  }

  /// Start a break with the given activity.
  Future<void> startBreak(RegulationActivity activity) async {
    if (_currentSessionId == null) return;

    state = state.copyWith(
      isOnBreak: true,
      breakStartTime: DateTime.now(),
    );

    try {
      await _service.notifyBreakStarted(
        sessionId: _currentSessionId!,
        learnerId: _learnerId,
        activityType: activity.type,
        activityTitle: activity.title,
      );
    } catch (e) {
      debugPrint('[FocusController] Failed to notify break started: $e');
    }
  }

  /// Complete the current break.
  Future<void> completeBreak({
    required RegulationActivity activity,
    required bool completedFully,
    int? helpfulnessRating,
  }) async {
    if (_currentSessionId == null) return;

    final duration = state.breakStartTime != null
        ? DateTime.now().difference(state.breakStartTime!).inSeconds
        : null;

    state = state.copyWith(
      isOnBreak: false,
      requiresBreak: false,
      clearPendingActivity: true,
    );

    try {
      await _service.notifyBreakComplete(
        sessionId: _currentSessionId!,
        learnerId: _learnerId,
        activityType: activity.type,
        completedFully: completedFully,
        helpfulnessRating: helpfulnessRating,
        actualDurationSeconds: duration,
      );
    } catch (e) {
      debugPrint('[FocusController] Failed to notify break complete: $e');
    }
  }

  /// Request a break (user-initiated).
  Future<List<RegulationActivity>> requestBreakRecommendations({
    SelfReportedMood? mood,
  }) async {
    if (_currentSessionId == null || _currentGradeBand == null) {
      return [];
    }

    try {
      final result = await _service.getRecommendation(
        sessionId: _currentSessionId!,
        learnerId: _learnerId,
        gradeBand: _currentGradeBand!,
        currentActivityId: _currentActivityId,
        mood: mood,
        focusLossReasons: state.focusLossReasons.isNotEmpty ? state.focusLossReasons : null,
      );

      return result.activities;
    } catch (e) {
      debugPrint('[FocusController] Failed to get recommendations: $e');
      return [];
    }
  }

  /// Internal: Send a focus ping.
  Future<void> _sendPing({
    bool appInBackground = false,
    SelfReportedMood? mood,
    bool? rapidExit,
  }) async {
    if (_currentSessionId == null || _currentActivityId == null) return;

    final idleMs = _lastInteractionTime != null
        ? DateTime.now().difference(_lastInteractionTime!).inMilliseconds
        : 0;

    try {
      final result = await _service.sendPing(
        sessionId: _currentSessionId!,
        learnerId: _learnerId,
        activityId: _currentActivityId!,
        idleMs: idleMs,
        appInBackground: appInBackground,
        mood: mood,
        rapidExit: rapidExit,
      );

      state = state.copyWith(
        lastPingTime: DateTime.now(),
        requiresBreak: result.requiresBreak,
        focusLossReasons: result.reasons,
        pendingActivity: result.recommendation,
        clearError: true,
      );

      if (result.requiresBreak) {
        debugPrint('[FocusController] Break recommended: ${result.reasons}');
      }
    } catch (e) {
      state = state.copyWith(error: e.toString());
      debugPrint('[FocusController] Ping failed: $e');
    }
  }

  @override
  void dispose() {
    _pingTimer?.cancel();
    super.dispose();
  }
}

/// Provider for focus controller, scoped to a learner.
final focusControllerProvider = StateNotifierProvider.family<FocusController, FocusState, String>(
  (ref, learnerId) {
    final service = ref.read(focusServiceProvider);
    final controller = FocusController(service, learnerId);

    ref.onDispose(() {
      controller.stopMonitoring();
    });

    return controller;
  },
);
