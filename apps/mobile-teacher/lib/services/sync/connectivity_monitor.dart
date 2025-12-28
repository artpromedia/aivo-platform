/// Connectivity Monitor
///
/// Monitors network connectivity status.
library;

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_common/offline/connectivity_service.dart';

/// Monitors connectivity status for the app.
class ConnectivityMonitor {
  ConnectivityMonitor({ConnectivityService? connectivityService})
      : _connectivityService = connectivityService ?? ConnectivityService();

  final ConnectivityService _connectivityService;
  
  StreamSubscription<ConnectionState>? _subscription;
  final _stateController = StreamController<bool>.broadcast();
  bool _isOnline = true;

  /// Stream of connectivity status (true = online).
  Stream<bool> get stateStream => _stateController.stream;

  /// Current connectivity status.
  Future<bool> get isOnline async {
    try {
      return _connectivityService.isOnline;
    } catch (e) {
      debugPrint('[ConnectivityMonitor] Error checking connectivity: $e');
      return _isOnline;
    }
  }

  /// Initialize the monitor.
  Future<void> initialize() async {
    await _connectivityService.initialize();
    
    _subscription = _connectivityService.stateStream.listen((state) {
      final online = state == ConnectionState.online;
      if (online != _isOnline) {
        _isOnline = online;
        _stateController.add(online);
      }
    });

    _isOnline = await isOnline;
  }

  /// Dispose resources.
  void dispose() {
    _subscription?.cancel();
    _stateController.close();
    _connectivityService.dispose();
  }
}
