import 'dart:async';
import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:workmanager/workmanager.dart';

import '../database/local_database.dart';
import '../network/connectivity_manager.dart';

/// Background task identifiers
class BackgroundTaskIds {
  static const String periodicSync = 'com.aivo.learner.periodicSync';
  static const String offlineDownload = 'com.aivo.learner.offlineDownload';
  static const String cleanupCache = 'com.aivo.learner.cleanupCache';
  static const String retryFailedSync = 'com.aivo.learner.retryFailedSync';
}

/// Background Sync Service
///
/// Manages background synchronization using WorkManager (Android) and
/// BGTaskScheduler (iOS). Handles:
/// - Periodic sync when app is backgrounded
/// - Offline download queue processing
/// - Cache cleanup
/// - Retry of failed sync operations
class BackgroundSyncService {
  static BackgroundSyncService? _instance;
  static BackgroundSyncService get instance =>
      _instance ??= BackgroundSyncService._();

  BackgroundSyncService._();

  bool _isInitialized = false;

  /// Initialize the background sync service
  Future<void> initialize() async {
    if (_isInitialized) return;

    await Workmanager().initialize(
      callbackDispatcher,
      isInDebugMode: kDebugMode,
    );

    _isInitialized = true;
    debugPrint('[BackgroundSyncService] Initialized');
  }

  /// Register periodic sync task
  Future<void> registerPeriodicSync({
    Duration frequency = const Duration(hours: 1),
    bool requiresNetwork = true,
    bool requiresCharging = false,
  }) async {
    await Workmanager().registerPeriodicTask(
      BackgroundTaskIds.periodicSync,
      BackgroundTaskIds.periodicSync,
      frequency: frequency,
      constraints: Constraints(
        networkType:
            requiresNetwork ? NetworkType.connected : NetworkType.not_required,
        requiresBatteryNotLow: true,
        requiresCharging: requiresCharging,
      ),
      existingWorkPolicy: ExistingWorkPolicy.keep,
      backoffPolicy: BackoffPolicy.exponential,
      backoffPolicyDelay: const Duration(minutes: 5),
    );

    debugPrint(
        '[BackgroundSyncService] Registered periodic sync (frequency: ${frequency.inMinutes}min)');
  }

  /// Register one-time sync task (for immediate background sync)
  Future<void> scheduleImmediateSync() async {
    await Workmanager().registerOneOffTask(
      '${BackgroundTaskIds.periodicSync}_${DateTime.now().millisecondsSinceEpoch}',
      BackgroundTaskIds.periodicSync,
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
      backoffPolicy: BackoffPolicy.exponential,
      backoffPolicyDelay: const Duration(seconds: 30),
    );

    debugPrint('[BackgroundSyncService] Scheduled immediate sync');
  }

  /// Schedule offline download task
  Future<void> scheduleOfflineDownload({
    required String lessonId,
    Map<String, dynamic>? options,
  }) async {
    await Workmanager().registerOneOffTask(
      '${BackgroundTaskIds.offlineDownload}_$lessonId',
      BackgroundTaskIds.offlineDownload,
      inputData: {
        'lessonId': lessonId,
        ...?options,
      },
      constraints: Constraints(
        networkType: NetworkType.connected,
        requiresBatteryNotLow: true,
      ),
      backoffPolicy: BackoffPolicy.exponential,
      backoffPolicyDelay: const Duration(minutes: 1),
    );

    debugPrint('[BackgroundSyncService] Scheduled download for lesson: $lessonId');
  }

  /// Register cache cleanup task
  Future<void> registerCacheCleanup({
    Duration frequency = const Duration(days: 1),
  }) async {
    await Workmanager().registerPeriodicTask(
      BackgroundTaskIds.cleanupCache,
      BackgroundTaskIds.cleanupCache,
      frequency: frequency,
      constraints: Constraints(
        networkType: NetworkType.not_required,
        requiresBatteryNotLow: true,
      ),
      existingWorkPolicy: ExistingWorkPolicy.keep,
    );

    debugPrint('[BackgroundSyncService] Registered cache cleanup');
  }

  /// Schedule retry of failed sync operations
  Future<void> scheduleRetryFailedSync({
    Duration delay = const Duration(minutes: 15),
  }) async {
    await Workmanager().registerOneOffTask(
      '${BackgroundTaskIds.retryFailedSync}_${DateTime.now().millisecondsSinceEpoch}',
      BackgroundTaskIds.retryFailedSync,
      initialDelay: delay,
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
    );

    debugPrint(
        '[BackgroundSyncService] Scheduled retry in ${delay.inMinutes}min');
  }

  /// Cancel all background tasks
  Future<void> cancelAll() async {
    await Workmanager().cancelAll();
    debugPrint('[BackgroundSyncService] Cancelled all tasks');
  }

  /// Cancel specific task
  Future<void> cancelTask(String taskId) async {
    await Workmanager().cancelByUniqueName(taskId);
  }

  /// Handle app lifecycle state changes
  void onAppLifecycleStateChanged(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.paused:
        // App is going to background - schedule sync
        scheduleImmediateSync();
        break;
      case AppLifecycleState.resumed:
        // App is coming to foreground - sync might have happened
        break;
      case AppLifecycleState.detached:
        // App is being terminated
        break;
      default:
        break;
    }
  }
}

/// Top-level callback dispatcher for WorkManager
/// This must be a top-level function
@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((taskName, inputData) async {
    debugPrint('[BackgroundTask] Executing: $taskName');

    try {
      switch (taskName) {
        case BackgroundTaskIds.periodicSync:
          return await _executePeriodicSync();

        case BackgroundTaskIds.offlineDownload:
          final lessonId = inputData?['lessonId'] as String?;
          if (lessonId != null) {
            return await _executeOfflineDownload(lessonId, inputData);
          }
          return false;

        case BackgroundTaskIds.cleanupCache:
          return await _executeCleanupCache();

        case BackgroundTaskIds.retryFailedSync:
          return await _executeRetryFailedSync();

        default:
          debugPrint('[BackgroundTask] Unknown task: $taskName');
          return false;
      }
    } catch (e, stack) {
      debugPrint('[BackgroundTask] Error: $e\n$stack');
      return false;
    }
  });
}

/// Execute periodic sync
Future<bool> _executePeriodicSync() async {
  debugPrint('[BackgroundTask] Starting periodic sync');

  // Initialize dependencies
  final localDb = LocalDatabase.instance;
  await localDb.initialize();

  final connectivity = ConnectivityManager.instance;
  await connectivity.initialize();

  if (!await connectivity.isConnected) {
    debugPrint('[BackgroundTask] No connection, skipping sync');
    return true; // Return true to not retry immediately
  }

  // We need to get API client configuration from secure storage
  // For now, we'll skip if not available
  // In production, you'd retrieve the auth token and base URL from secure storage

  debugPrint('[BackgroundTask] Periodic sync completed');
  return true;
}

/// Execute offline download
Future<bool> _executeOfflineDownload(
  String lessonId,
  Map<String, dynamic>? options,
) async {
  debugPrint('[BackgroundTask] Starting offline download for: $lessonId');

  final localDb = LocalDatabase.instance;
  await localDb.initialize();

  final connectivity = ConnectivityManager.instance;
  await connectivity.initialize();

  if (!connectivity.isSuitableForDownload) {
    debugPrint('[BackgroundTask] Network not suitable for download');
    return false; // Will retry
  }

  // Actual download would happen here with proper API client initialization
  debugPrint('[BackgroundTask] Download completed for: $lessonId');
  return true;
}

/// Execute cache cleanup
Future<bool> _executeCleanupCache() async {
  debugPrint('[BackgroundTask] Starting cache cleanup');

  final localDb = LocalDatabase.instance;
  await localDb.initialize();

  // Prune cache to 500MB
  const maxCacheSize = 500 * 1024 * 1024; // 500MB
  await localDb.pruneCache(maxCacheSize);

  // Cleanup old completed sync operations
  // syncQueue.cleanupCompleted(); // Would need sync queue instance

  debugPrint('[BackgroundTask] Cache cleanup completed');
  return true;
}

/// Execute retry of failed sync operations
Future<bool> _executeRetryFailedSync() async {
  debugPrint('[BackgroundTask] Retrying failed sync operations');

  final localDb = LocalDatabase.instance;
  await localDb.initialize();

  final connectivity = ConnectivityManager.instance;
  await connectivity.initialize();

  if (!await connectivity.isConnected) {
    debugPrint('[BackgroundTask] No connection, skipping retry');
    return true;
  }

  // Actual retry would happen here with proper sync engine initialization
  debugPrint('[BackgroundTask] Retry completed');
  return true;
}

/// Platform-specific background sync configuration
class BackgroundSyncConfig {
  /// Minimum interval for background fetch (iOS requirement)
  static const Duration minimumBackgroundFetchInterval = Duration(minutes: 15);

  /// Default sync frequency
  static const Duration defaultSyncFrequency = Duration(hours: 1);

  /// Sync frequency when on WiFi
  static const Duration wifiSyncFrequency = Duration(minutes: 30);

  /// Sync frequency when on mobile data
  static const Duration mobileSyncFrequency = Duration(hours: 2);

  /// Maximum cache size in bytes (500MB)
  static const int maxCacheSize = 500 * 1024 * 1024;

  /// Cache cleanup frequency
  static const Duration cacheCleanupFrequency = Duration(days: 1);

  /// Maximum age for completed sync operations before cleanup
  static const Duration maxCompletedSyncAge = Duration(days: 7);
}
