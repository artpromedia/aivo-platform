/// Fake Connectivity
///
/// Test utilities for simulating network connectivity states.
library;

import 'dart:async';

/// Fake connectivity service for testing offline scenarios.
class FakeConnectivityService {
  FakeConnectivityService({bool initialState = true}) : _isOnline = initialState;

  bool _isOnline;
  final _controller = StreamController<bool>.broadcast();

  /// Whether the device is currently online.
  bool get isOnline => _isOnline;

  /// Stream of connectivity changes.
  Stream<bool> get onConnectivityChanged => _controller.stream;

  /// Simulate going online.
  void goOnline() {
    if (!_isOnline) {
      _isOnline = true;
      _controller.add(true);
    }
  }

  /// Simulate going offline.
  void goOffline() {
    if (_isOnline) {
      _isOnline = false;
      _controller.add(false);
    }
  }

  /// Toggle connectivity state.
  void toggle() {
    _isOnline ? goOffline() : goOnline();
  }

  /// Dispose resources.
  void dispose() {
    _controller.close();
  }
}

/// Fake connectivity monitor for testing.
class FakeConnectivityMonitor {
  FakeConnectivityMonitor({bool initialState = true})
      : _service = FakeConnectivityService(initialState: initialState);

  final FakeConnectivityService _service;

  /// Whether the device is currently online.
  Future<bool> get isOnline async => _service.isOnline;

  /// Synchronous check if online.
  bool get isOnlineSync => _service.isOnline;

  /// Stream of connectivity state changes.
  Stream<bool> get stateStream => _service.onConnectivityChanged;

  /// Simulate going online.
  void goOnline() => _service.goOnline();

  /// Simulate going offline.
  void goOffline() => _service.goOffline();

  /// Toggle connectivity.
  void toggle() => _service.toggle();

  /// Dispose resources.
  void dispose() => _service.dispose();
}

/// Test helper for connectivity scenarios.
class ConnectivityTestHelper {
  ConnectivityTestHelper() : _monitor = FakeConnectivityMonitor();

  final FakeConnectivityMonitor _monitor;

  FakeConnectivityMonitor get monitor => _monitor;

  /// Simulate a network outage and recovery.
  Future<void> simulateOutageAndRecovery({
    Duration outageDuration = const Duration(seconds: 2),
  }) async {
    _monitor.goOffline();
    await Future.delayed(outageDuration);
    _monitor.goOnline();
  }

  /// Simulate intermittent connectivity.
  Future<void> simulateIntermittentConnectivity({
    int toggleCount = 5,
    Duration interval = const Duration(milliseconds: 500),
  }) async {
    for (var i = 0; i < toggleCount; i++) {
      await Future.delayed(interval);
      _monitor.toggle();
    }
  }

  /// Dispose resources.
  void dispose() => _monitor.dispose();
}
