import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/realtime/websocket_client.dart';
import 'package:flutter_common/realtime/realtime_types.dart';

/// State for live session monitoring
class LiveSessionState {
  final Map<String, LiveSessionUpdate> activeSessions;
  final List<LiveSessionUpdate> recentUpdates;
  final List<LiveAlert> alerts;
  final bool subscribed;

  const LiveSessionState({
    this.activeSessions = const {},
    this.recentUpdates = const [],
    this.alerts = const [],
    this.subscribed = false,
  });

  LiveSessionState copyWith({
    Map<String, LiveSessionUpdate>? activeSessions,
    List<LiveSessionUpdate>? recentUpdates,
    List<LiveAlert>? alerts,
    bool? subscribed,
  }) {
    return LiveSessionState(
      activeSessions: activeSessions ?? this.activeSessions,
      recentUpdates: recentUpdates ?? this.recentUpdates,
      alerts: alerts ?? this.alerts,
      subscribed: subscribed ?? this.subscribed,
    );
  }

  /// Get unacknowledged alerts
  List<LiveAlert> get unacknowledgedAlerts =>
      alerts.where((a) => !a.acknowledged).toList();

  /// Get critical alerts
  List<LiveAlert> get criticalAlerts =>
      alerts.where((a) => a.severity == 'critical' && !a.acknowledged).toList();
}

/// Live session state notifier for Riverpod
class LiveSessionNotifier extends StateNotifier<LiveSessionState> {
  final WebSocketClient _client;
  final String _classId;
  final int _maxRecentUpdates;
  final int _maxAlerts;
  
  StreamSubscription? _activitySub;
  StreamSubscription? _progressSub;
  StreamSubscription? _completeSub;
  StreamSubscription? _alertSub;
  StreamSubscription? _statusSub;

  LiveSessionNotifier(
    this._client,
    this._classId, {
    int maxRecentUpdates = 50,
    int maxAlerts = 100,
  })  : _maxRecentUpdates = maxRecentUpdates,
        _maxAlerts = maxAlerts,
        super(const LiveSessionState()) {
    _setupListeners();
    _subscribe();
  }

  void _setupListeners() {
    // Session started/activity
    _activitySub = _client.onEvent(WSEventType.sessionActivity).listen((data) {
      if (data['classId'] != _classId) return;
      _handleSessionUpdate(data);
    });

    // Session progress
    _progressSub = _client.onEvent(WSEventType.sessionProgress).listen((data) {
      if (data['classId'] != _classId) return;
      _handleSessionUpdate(data);
    });

    // Session completed
    _completeSub = _client.onEvent(WSEventType.sessionComplete).listen((data) {
      if (data['classId'] != _classId) return;
      _handleSessionComplete(data);
    });

    // Alerts
    _alertSub = _client.onEvent(WSEventType.analyticsAlert).listen((data) {
      if (data['classId'] != _classId) return;
      _handleAlert(data);
    });

    // Handle reconnection
    _statusSub = _client.statusStream
        .where((s) => s == ConnectionStatus.connected)
        .skip(1) // Skip initial connection
        .listen((_) => _subscribe());
  }

  /// Subscribe to analytics for this class
  void _subscribe() async {
    if (!_client.isConnected) return;

    try {
      await _client.emit(WSEventType.analyticsSubscribe.value, {
        'classId': _classId,
      });
      state = state.copyWith(subscribed: true);
    } catch (e) {
      // Retry on failure
      Future.delayed(const Duration(seconds: 2), _subscribe);
    }
  }

  /// Handle session update (started/progress)
  void _handleSessionUpdate(Map<String, dynamic> data) {
    final update = LiveSessionUpdate.fromJson(data);
    
    // Update active sessions
    final updated = Map<String, LiveSessionUpdate>.from(state.activeSessions);
    updated[update.sessionId] = update;

    // Add to recent updates
    final recent = [update, ...state.recentUpdates]
        .take(_maxRecentUpdates)
        .toList();

    state = state.copyWith(
      activeSessions: updated,
      recentUpdates: recent,
    );
  }

  /// Handle session complete
  void _handleSessionComplete(Map<String, dynamic> data) {
    final update = LiveSessionUpdate.fromJson(data);

    // Remove from active sessions
    final updated = Map<String, LiveSessionUpdate>.from(state.activeSessions);
    updated.remove(update.sessionId);

    // Add to recent updates
    final recent = [update, ...state.recentUpdates]
        .take(_maxRecentUpdates)
        .toList();

    state = state.copyWith(
      activeSessions: updated,
      recentUpdates: recent,
    );
  }

  /// Handle alert
  void _handleAlert(Map<String, dynamic> data) {
    final alert = LiveAlert.fromJson(data);

    final alerts = [alert, ...state.alerts]
        .take(_maxAlerts)
        .toList();

    state = state.copyWith(alerts: alerts);
  }

  /// Acknowledge an alert
  void acknowledgeAlert(String alertId) {
    final updated = state.alerts.map((a) {
      if (a.id == alertId) {
        return a.copyWith(acknowledged: true);
      }
      return a;
    }).toList();

    state = state.copyWith(alerts: updated);

    // Notify server
    _client.send(WSEventType.alertAcknowledge.value, {
      'alertId': alertId,
    });
  }

  /// Clear all acknowledged alerts
  void clearAcknowledgedAlerts() {
    final updated = state.alerts.where((a) => !a.acknowledged).toList();
    state = state.copyWith(alerts: updated);
  }

  @override
  void dispose() {
    _activitySub?.cancel();
    _progressSub?.cancel();
    _completeSub?.cancel();
    _alertSub?.cancel();
    _statusSub?.cancel();
    super.dispose();
  }
}

/// Provider family for live session monitoring
final liveSessionProvider = StateNotifierProvider.family<LiveSessionNotifier, LiveSessionState, ({WebSocketClient client, String classId})>(
  (ref, params) => LiveSessionNotifier(params.client, params.classId),
);

/// Simplified provider for class live sessions
/// Usage: ref.watch(classLiveSessionProvider('class_123'))
final classLiveSessionProvider = StateNotifierProvider.family<LiveSessionNotifier, LiveSessionState, String>(
  (ref, classId) {
    // This requires a websocketClientProvider to be defined in the app
    throw UnimplementedError(
      'classLiveSessionProvider requires websocketClientProvider to be overridden in the app',
    );
  },
);
