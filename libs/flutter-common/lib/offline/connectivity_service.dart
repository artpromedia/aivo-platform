/// Connectivity Service
///
/// Monitors network connectivity and provides online/offline state
/// to the application. Uses connectivity_plus for native connectivity
/// detection and performs actual reachability checks.
library;

import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;
import 'package:rxdart/rxdart.dart';

// ══════════════════════════════════════════════════════════════════════════════
// CONNECTION STATE
// ══════════════════════════════════════════════════════════════════════════════

/// Connection state enum.
enum ConnectionState {
  /// Device is online and API is reachable.
  online,

  /// Device is offline or API is unreachable.
  offline,

  /// Connection state is unknown (initial state).
  unknown,
}

// ══════════════════════════════════════════════════════════════════════════════
// CONNECTIVITY SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/// Service that monitors network connectivity.
///
/// Uses a two-phase approach:
/// 1. Monitor native connectivity (Wi-Fi, mobile, etc.)
/// 2. Verify actual API reachability with a health check
///
/// This handles cases where the device has a network connection
/// but can't reach the internet (captive portals, proxies, etc.).
class ConnectivityService {
  ConnectivityService({
    String? healthCheckUrl,
    Duration? healthCheckTimeout,
    Duration? recheckInterval,
  })  : _healthCheckUrl = healthCheckUrl ?? 'https://api.aivo.app/health',
        _healthCheckTimeout =
            healthCheckTimeout ?? const Duration(seconds: 5),
        _recheckInterval = recheckInterval ?? const Duration(seconds: 30);

  final String _healthCheckUrl;
  final Duration _healthCheckTimeout;
  final Duration _recheckInterval;

  final Connectivity _connectivity = Connectivity();
  final BehaviorSubject<ConnectionState> _stateSubject =
      BehaviorSubject.seeded(ConnectionState.unknown);

  StreamSubscription? _connectivitySub;
  Timer? _recheckTimer;
  bool _initialized = false;

  /// Stream of connection state changes.
  Stream<ConnectionState> get stateStream => _stateSubject.stream;

  /// Current connection state.
  ConnectionState get currentState => _stateSubject.value;

  /// Whether the device is currently online.
  bool get isOnline => currentState == ConnectionState.online;

  /// Whether the device is currently offline.
  bool get isOffline => currentState == ConnectionState.offline;

  /// Initialize the connectivity service.
  ///
  /// Must be called before using the service. Sets up native
  /// connectivity monitoring and performs an initial check.
  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    // Perform initial connectivity check
    await _checkConnectivity();

    // Listen for native connectivity changes
    _connectivitySub = _connectivity.onConnectivityChanged.listen(
      _handleConnectivityChange,
    );

    // Periodic recheck for edge cases
    _recheckTimer = Timer.periodic(_recheckInterval, (_) {
      _checkConnectivity();
    });
  }

  /// Force a connectivity check.
  ///
  /// Useful when the user explicitly wants to retry.
  Future<ConnectionState> forceCheck() async {
    await _checkConnectivity();
    return currentState;
  }

  /// Perform a connectivity check.
  Future<void> _checkConnectivity() async {
    final results = await _connectivity.checkConnectivity();
    await _handleConnectivityChange(results);
  }

  /// Handle native connectivity changes.
  Future<void> _handleConnectivityChange(List<ConnectivityResult> results) async {
    final hasNativeConnection = results.any((r) =>
        r == ConnectivityResult.wifi ||
        r == ConnectivityResult.mobile ||
        r == ConnectivityResult.ethernet ||
        r == ConnectivityResult.vpn);

    if (hasNativeConnection) {
      // Verify actual internet connectivity
      final reachable = await _pingServer();
      _updateState(reachable ? ConnectionState.online : ConnectionState.offline);
    } else {
      _updateState(ConnectionState.offline);
    }
  }

  /// Ping the health endpoint to verify connectivity.
  Future<bool> _pingServer() async {
    try {
      final response = await http
          .get(Uri.parse(_healthCheckUrl))
          .timeout(_healthCheckTimeout);

      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (_) {
      return false;
    }
  }

  /// Update the connection state if changed.
  void _updateState(ConnectionState newState) {
    if (_stateSubject.value != newState) {
      _stateSubject.add(newState);
    }
  }

  /// Dispose resources.
  void dispose() {
    _connectivitySub?.cancel();
    _recheckTimer?.cancel();
    _stateSubject.close();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONNECTIVITY MIXIN
// ══════════════════════════════════════════════════════════════════════════════

/// Mixin for widgets that need to react to connectivity changes.
///
/// Example:
/// ```dart
/// class MyWidget extends StatefulWidget with ConnectivityAware {
///   @override
///   void onConnectivityChanged(ConnectionState state) {
///     if (state == ConnectionState.online) {
///       // Refresh data
///     }
///   }
/// }
/// ```
mixin ConnectivityAwareMixin {
  StreamSubscription? _connectivitySubscription;

  /// Start listening to connectivity changes.
  void startConnectivityListener(ConnectivityService service) {
    _connectivitySubscription = service.stateStream.listen(
      onConnectivityChanged,
    );
  }

  /// Stop listening to connectivity changes.
  void stopConnectivityListener() {
    _connectivitySubscription?.cancel();
    _connectivitySubscription = null;
  }

  /// Called when connectivity changes. Override in implementing class.
  void onConnectivityChanged(ConnectionState state);
}

// ══════════════════════════════════════════════════════════════════════════════
// OFFLINE-AWARE WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

/// A helper for making API calls with offline fallback.
///
/// Example:
/// ```dart
/// final data = await offlineAwareCall(
///   connectivityService: connectivity,
///   onlineCall: () => api.fetchData(),
///   offlineFallback: () => localDb.getCachedData(),
/// );
/// ```
Future<T> offlineAwareCall<T>({
  required ConnectivityService connectivityService,
  required Future<T> Function() onlineCall,
  required Future<T> Function() offlineFallback,
  bool useOnlineWhenAvailable = true,
}) async {
  if (connectivityService.isOnline && useOnlineWhenAvailable) {
    try {
      return await onlineCall();
    } catch (_) {
      // Fall back to offline on error
      return await offlineFallback();
    }
  } else {
    return await offlineFallback();
  }
}

/// A helper for making API calls that queue when offline.
///
/// Example:
/// ```dart
/// await queueableCall(
///   connectivityService: connectivity,
///   syncManager: sync,
///   sessionId: sessionId,
///   call: () => api.submitAnswer(answer),
///   queueAsEvent: () => LearnerEvent(
///     type: LearnerEventType.answerEvent,
///     payload: answer.toJson(),
///   ),
/// );
/// ```
Future<void> queueableCall({
  required ConnectivityService connectivityService,
  required dynamic syncManager, // SyncManager from sync_manager.dart
  required String sessionId,
  required Future<void> Function() call,
  required dynamic Function() queueAsEvent, // LearnerEvent
}) async {
  if (connectivityService.isOnline) {
    try {
      await call();
      return;
    } catch (_) {
      // Fall through to queue
    }
  }

  // Queue for later sync
  await syncManager.recordEvent(sessionId, queueAsEvent());
}

// ══════════════════════════════════════════════════════════════════════════════
// BANDWIDTH DETECTION
// ══════════════════════════════════════════════════════════════════════════════

/// Bandwidth quality levels.
enum BandwidthQuality {
  /// High bandwidth (>= 10 Mbps) - full media, high-res images
  high,

  /// Medium bandwidth (2-10 Mbps) - compressed media, medium images
  medium,

  /// Low bandwidth (< 2 Mbps) - no video, low-res images
  low,

  /// Unknown bandwidth
  unknown,
}

/// Extension to detect bandwidth quality.
///
/// This is a basic implementation that uses connection type as a proxy.
/// For more accurate bandwidth detection, consider using a speed test.
extension BandwidthDetection on ConnectivityService {
  /// Get estimated bandwidth quality based on connection type.
  Future<BandwidthQuality> estimateBandwidthQuality() async {
    final results = await _connectivity.checkConnectivity();

    if (results.contains(ConnectivityResult.wifi) ||
        results.contains(ConnectivityResult.ethernet)) {
      return BandwidthQuality.high;
    } else if (results.contains(ConnectivityResult.mobile)) {
      // Mobile could be 4G/5G (high) or 3G (low)
      // Default to medium for safety
      return BandwidthQuality.medium;
    } else {
      return BandwidthQuality.unknown;
    }
  }

  /// Check if current connection is suitable for video content.
  Future<bool> canStreamVideo() async {
    final quality = await estimateBandwidthQuality();
    return quality == BandwidthQuality.high ||
        quality == BandwidthQuality.medium;
  }

  /// Check if current connection is suitable for heavy downloads.
  Future<bool> canDownloadHeavyContent() async {
    final quality = await estimateBandwidthQuality();
    return quality == BandwidthQuality.high;
  }
}
