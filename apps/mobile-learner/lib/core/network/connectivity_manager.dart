import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

/// Network quality levels
enum NetworkQuality {
  /// No network connection
  none,

  /// Poor network (2G or unstable)
  poor,

  /// Fair network (3G)
  fair,

  /// Good network (4G/LTE)
  good,

  /// Excellent network (5G/WiFi)
  excellent,
}

/// Connectivity Manager
///
/// Manages network connectivity state and provides:
/// - Real-time connectivity monitoring
/// - Network quality assessment
/// - Connection type detection
/// - Automatic reconnection handling
class ConnectivityManager {
  static ConnectivityManager? _instance;
  static ConnectivityManager get instance =>
      _instance ??= ConnectivityManager._();

  ConnectivityManager._();

  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  final _connectivityController =
      StreamController<List<ConnectivityResult>>.broadcast();
  final _networkQualityController = StreamController<NetworkQuality>.broadcast();

  List<ConnectivityResult> _currentConnectivity = [ConnectivityResult.none];
  NetworkQuality _currentQuality = NetworkQuality.none;

  bool _isInitialized = false;

  /// Current connectivity results
  List<ConnectivityResult> get currentConnectivity => _currentConnectivity;

  /// Current network quality
  NetworkQuality get currentQuality => _currentQuality;

  /// Stream of connectivity changes
  Stream<List<ConnectivityResult>> get onConnectivityChanged =>
      _connectivityController.stream;

  /// Stream of network quality changes
  Stream<NetworkQuality> get onNetworkQualityChanged =>
      _networkQualityController.stream;

  /// Check if currently connected to any network
  Future<bool> get isConnected async {
    final results = await _connectivity.checkConnectivity();
    return results.any((r) => r != ConnectivityResult.none);
  }

  /// Check if connected to WiFi
  bool get isOnWifi =>
      _currentConnectivity.contains(ConnectivityResult.wifi);

  /// Check if connected to mobile data
  bool get isOnMobileData =>
      _currentConnectivity.contains(ConnectivityResult.mobile);

  /// Check if connected to ethernet
  bool get isOnEthernet =>
      _currentConnectivity.contains(ConnectivityResult.ethernet);

  /// Initialize the connectivity manager
  Future<void> initialize() async {
    if (_isInitialized) return;

    // Get initial connectivity state
    _currentConnectivity = await _connectivity.checkConnectivity();
    _currentQuality = _assessNetworkQuality(_currentConnectivity);

    // Listen to connectivity changes
    _subscription = _connectivity.onConnectivityChanged.listen(
      _handleConnectivityChange,
    );

    _isInitialized = true;
    debugPrint(
        '[ConnectivityManager] Initialized: $_currentConnectivity, quality: $_currentQuality');
  }

  /// Check current connectivity
  Future<List<ConnectivityResult>> checkConnectivity() async {
    final results = await _connectivity.checkConnectivity();
    _handleConnectivityChange(results);
    return results;
  }

  /// Wait for connection with timeout
  Future<bool> waitForConnection({
    Duration timeout = const Duration(seconds: 30),
  }) async {
    if (await isConnected) return true;

    try {
      await onConnectivityChanged
          .where((results) => results.any((r) => r != ConnectivityResult.none))
          .first
          .timeout(timeout);
      return true;
    } catch (e) {
      // Timeout or other error - expected during network issues
      assert(() {
        debugPrint('[ConnectivityManager] Connection wait timed out: $e');
        return true;
      }());
      return false;
    }
  }

  /// Check if network is suitable for large downloads
  bool get isSuitableForDownload {
    if (_currentQuality == NetworkQuality.none ||
        _currentQuality == NetworkQuality.poor) {
      return false;
    }
    return true;
  }

  /// Check if network is suitable for background sync
  bool get isSuitableForBackgroundSync {
    // Allow background sync on fair or better connections
    return _currentQuality.index >= NetworkQuality.fair.index;
  }

  /// Check if should use reduced bandwidth mode
  bool get shouldReduceBandwidth {
    return _currentQuality == NetworkQuality.poor ||
        _currentQuality == NetworkQuality.fair;
  }

  /// Dispose resources
  void dispose() {
    _subscription?.cancel();
    _connectivityController.close();
    _networkQualityController.close();
    _instance = null;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  void _handleConnectivityChange(List<ConnectivityResult> results) {
    final previousConnectivity = _currentConnectivity;
    final previousQuality = _currentQuality;

    _currentConnectivity = results;
    _currentQuality = _assessNetworkQuality(results);

    // Notify listeners if connectivity changed
    if (!_areResultsEqual(previousConnectivity, results)) {
      _connectivityController.add(results);
      debugPrint('[ConnectivityManager] Connectivity changed: $results');
    }

    // Notify listeners if quality changed
    if (previousQuality != _currentQuality) {
      _networkQualityController.add(_currentQuality);
      debugPrint('[ConnectivityManager] Network quality changed: $_currentQuality');
    }
  }

  NetworkQuality _assessNetworkQuality(List<ConnectivityResult> results) {
    if (results.isEmpty || results.every((r) => r == ConnectivityResult.none)) {
      return NetworkQuality.none;
    }

    // WiFi and Ethernet are typically excellent
    if (results.contains(ConnectivityResult.wifi) ||
        results.contains(ConnectivityResult.ethernet)) {
      return NetworkQuality.excellent;
    }

    // Mobile data quality varies, default to good
    // In a real implementation, you would measure actual bandwidth
    if (results.contains(ConnectivityResult.mobile)) {
      return NetworkQuality.good;
    }

    // VPN or other connection types
    if (results.contains(ConnectivityResult.vpn)) {
      return NetworkQuality.good;
    }

    // Bluetooth is typically poor for data
    if (results.contains(ConnectivityResult.bluetooth)) {
      return NetworkQuality.poor;
    }

    return NetworkQuality.fair;
  }

  bool _areResultsEqual(
      List<ConnectivityResult> a, List<ConnectivityResult> b) {
    if (a.length != b.length) return false;
    final setA = a.toSet();
    final setB = b.toSet();
    return setA.containsAll(setB) && setB.containsAll(setA);
  }
}

/// Extension to add helper methods to ConnectivityResult
extension ConnectivityResultExtension on ConnectivityResult {
  /// Human-readable name for the connectivity type
  String get displayName {
    switch (this) {
      case ConnectivityResult.wifi:
        return 'WiFi';
      case ConnectivityResult.mobile:
        return 'Mobile Data';
      case ConnectivityResult.ethernet:
        return 'Ethernet';
      case ConnectivityResult.vpn:
        return 'VPN';
      case ConnectivityResult.bluetooth:
        return 'Bluetooth';
      case ConnectivityResult.other:
        return 'Other';
      case ConnectivityResult.none:
        return 'Offline';
    }
  }

  /// Icon name for the connectivity type
  String get iconName {
    switch (this) {
      case ConnectivityResult.wifi:
        return 'wifi';
      case ConnectivityResult.mobile:
        return 'signal_cellular_alt';
      case ConnectivityResult.ethernet:
        return 'settings_ethernet';
      case ConnectivityResult.vpn:
        return 'vpn_lock';
      case ConnectivityResult.bluetooth:
        return 'bluetooth';
      case ConnectivityResult.other:
        return 'device_unknown';
      case ConnectivityResult.none:
        return 'signal_wifi_off';
    }
  }
}

/// Extension to add helper methods to NetworkQuality
extension NetworkQualityExtension on NetworkQuality {
  /// Human-readable description
  String get description {
    switch (this) {
      case NetworkQuality.none:
        return 'No connection';
      case NetworkQuality.poor:
        return 'Poor connection';
      case NetworkQuality.fair:
        return 'Fair connection';
      case NetworkQuality.good:
        return 'Good connection';
      case NetworkQuality.excellent:
        return 'Excellent connection';
    }
  }

  /// Suggested actions based on quality
  String get suggestedAction {
    switch (this) {
      case NetworkQuality.none:
        return 'Working offline. Changes will sync when connected.';
      case NetworkQuality.poor:
        return 'Connection is slow. Large downloads may fail.';
      case NetworkQuality.fair:
        return 'Connection is fair. Downloads may be slower.';
      case NetworkQuality.good:
      case NetworkQuality.excellent:
        return 'Connection is good for all activities.';
    }
  }

  /// Color code for UI
  int get colorCode {
    switch (this) {
      case NetworkQuality.none:
        return 0xFF9E9E9E; // Grey
      case NetworkQuality.poor:
        return 0xFFF44336; // Red
      case NetworkQuality.fair:
        return 0xFFFF9800; // Orange
      case NetworkQuality.good:
        return 0xFF4CAF50; // Green
      case NetworkQuality.excellent:
        return 0xFF2196F3; // Blue
    }
  }
}
