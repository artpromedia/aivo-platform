/// Background Sync Worker
///
/// Handles background sync execution using workmanager for periodic
/// background tasks. Coordinates sync triggers from:
/// - Connectivity restoration
/// - App foreground resume
/// - Periodic background execution (15-30 min intervals)
///
/// Respects OS battery and background constraints.
library;

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:workmanager/workmanager.dart';

import 'connectivity_service.dart';
import 'offline_database.dart';
import 'sync_scheduler.dart';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/// Unique task name for background sync.
const String backgroundSyncTaskName = 'aivo.sync.background';

/// Unique task name for connectivity-triggered sync.
const String connectivitySyncTaskName = 'aivo.sync.connectivity';

/// Minimum interval for periodic sync (Android: 15 min minimum).
const Duration minPeriodicSyncInterval = Duration(minutes: 15);

/// Default periodic sync interval.
const Duration defaultPeriodicSyncInterval = Duration(minutes: 30);

// ══════════════════════════════════════════════════════════════════════════════
// SYNC TRIGGER
// ══════════════════════════════════════════════════════════════════════════════

/// Reason why sync was triggered.
enum SyncTrigger {
  /// Triggered by periodic background task.
  periodic,

  /// Triggered by network connectivity restored.
  connectivity,

  /// Triggered by app returning to foreground.
  foreground,

  /// Triggered manually by user.
  manual,

  /// Triggered by content preload completing.
  preload,
}

/// Result of a background sync operation.
class BackgroundSyncResult {
  const BackgroundSyncResult({
    required this.success,
    required this.trigger,
    this.sessionsSynced = 0,
    this.eventsSynced = 0,
    this.sessionsFailed = 0,
    this.eventsFailed = 0,
    this.duration = Duration.zero,
    this.error,
  });

  final bool success;
  final SyncTrigger trigger;
  final int sessionsSynced;
  final int eventsSynced;
  final int sessionsFailed;
  final int eventsFailed;
  final Duration duration;
  final String? error;

  int get totalSynced => sessionsSynced + eventsSynced;
  int get totalFailed => sessionsFailed + eventsFailed;

  factory BackgroundSyncResult.failure(SyncTrigger trigger, String error) =>
      BackgroundSyncResult(
        success: false,
        trigger: trigger,
        error: error,
      );
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC WORKER CALLBACK
// ══════════════════════════════════════════════════════════════════════════════

/// Type for the sync execution callback.
///
/// This should be provided by the app to perform actual sync operations.
typedef SyncExecutor = Future<BackgroundSyncResult> Function(SyncTrigger trigger);

/// Global sync executor - must be set before background task runs.
SyncExecutor? _globalSyncExecutor;

/// Set the global sync executor for background tasks.
///
/// Call this in your app's main() before initializing the worker.
void setSyncExecutor(SyncExecutor executor) {
  _globalSyncExecutor = executor;
}

/// Top-level callback for workmanager.
///
/// This is called when a background task executes.
@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((taskName, inputData) async {
    try {
      // Determine trigger type from task name
      final trigger = taskName == connectivitySyncTaskName
          ? SyncTrigger.connectivity
          : SyncTrigger.periodic;

      // Execute sync if executor is set
      if (_globalSyncExecutor != null) {
        final result = await _globalSyncExecutor!(trigger);
        return result.success;
      }

      // No executor set - this can happen if app was killed
      // Return true to prevent retry spam
      return true;
    } catch (e) {
      debugPrint('Background sync error: $e');
      return false; // Will retry according to backoff policy
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// BACKGROUND SYNC WORKER
// ══════════════════════════════════════════════════════════════════════════════

/// Manages background sync execution and scheduling.
///
/// Features:
/// - Periodic background sync (15-30 min)
/// - Connectivity-triggered sync
/// - App lifecycle sync triggers
/// - Battery and network constraint awareness
class BackgroundSyncWorker {
  BackgroundSyncWorker({
    required this.database,
    required this.connectivityService,
    required this.scheduler,
    required this.syncExecutor,
    this.periodicInterval = defaultPeriodicSyncInterval,
  }) {
    // Set global executor for background task callback
    setSyncExecutor(syncExecutor);
  }

  final OfflineDatabase database;
  final ConnectivityService connectivityService;
  final SyncScheduler scheduler;
  final SyncExecutor syncExecutor;
  final Duration periodicInterval;

  StreamSubscription? _connectivitySub;
  bool _initialized = false;

  /// Initialize the background worker.
  ///
  /// Must be called after app initialization.
  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    // Initialize workmanager
    await Workmanager().initialize(
      callbackDispatcher,
      isInDebugMode: kDebugMode,
    );

    // Set up connectivity listener
    _setupConnectivityListener();

    // Schedule periodic background sync
    await _schedulePeriodicSync();

    // Initialize scheduler
    await scheduler.initialize();
  }

  /// Trigger sync on app foreground resume.
  ///
  /// Call this from your app's lifecycle handler.
  Future<BackgroundSyncResult> onAppResumed() async {
    if (!connectivityService.isOnline) {
      return BackgroundSyncResult.failure(
        SyncTrigger.foreground,
        'Device is offline',
      );
    }

    // Check if we should sync (respects backoff)
    if (!scheduler.state.shouldSync) {
      return BackgroundSyncResult.failure(
        SyncTrigger.foreground,
        'Sync not due yet',
      );
    }

    return syncExecutor(SyncTrigger.foreground);
  }

  /// Manually trigger sync.
  Future<BackgroundSyncResult> triggerManualSync() async {
    if (!connectivityService.isOnline) {
      return BackgroundSyncResult.failure(
        SyncTrigger.manual,
        'Device is offline',
      );
    }

    // Force sync resets backoff
    await scheduler.forceSync();
    return syncExecutor(SyncTrigger.manual);
  }

  /// Cancel all background sync tasks.
  Future<void> cancelAllTasks() async {
    await Workmanager().cancelAll();
  }

  /// Reschedule periodic sync with new interval.
  Future<void> updatePeriodicInterval(Duration interval) async {
    await Workmanager().cancelByUniqueName(backgroundSyncTaskName);
    await _schedulePeriodicSync(interval: interval);
  }

  void _setupConnectivityListener() {
    _connectivitySub = connectivityService.stateStream
        .distinct()
        .listen((state) async {
      if (state == ConnectionState.online) {
        // Connectivity restored - trigger one-time sync
        await _scheduleConnectivitySync();
      }
    });
  }

  Future<void> _schedulePeriodicSync({Duration? interval}) async {
    final syncInterval = interval ?? periodicInterval;

    // Ensure we meet Android's minimum interval
    final effectiveInterval = syncInterval < minPeriodicSyncInterval
        ? minPeriodicSyncInterval
        : syncInterval;

    await Workmanager().registerPeriodicTask(
      backgroundSyncTaskName,
      backgroundSyncTaskName,
      frequency: effectiveInterval,
      constraints: Constraints(
        networkType: NetworkType.connected,
        requiresBatteryNotLow: true,
      ),
      existingWorkPolicy: ExistingWorkPolicy.keep,
      backoffPolicy: BackoffPolicy.exponential,
      backoffPolicyDelay: const Duration(minutes: 1),
    );
  }

  Future<void> _scheduleConnectivitySync() async {
    // One-time task when connectivity is restored
    await Workmanager().registerOneOffTask(
      connectivitySyncTaskName,
      connectivitySyncTaskName,
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
      existingWorkPolicy: ExistingWorkPolicy.replace,
      initialDelay: const Duration(seconds: 5), // Small delay for network stabilization
    );
  }

  void dispose() {
    _connectivitySub?.cancel();
    scheduler.dispose();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// APP LIFECYCLE HANDLER
// ══════════════════════════════════════════════════════════════════════════════

/// Mixin for handling app lifecycle events for sync.
///
/// Add this to your main app widget or a dedicated lifecycle manager.
mixin SyncLifecycleHandler {
  BackgroundSyncWorker get syncWorker;

  /// Call when app enters foreground.
  Future<void> handleAppResumed() async {
    await syncWorker.onAppResumed();
  }

  /// Call when app enters background.
  void handleAppPaused() {
    // Background tasks will handle sync while app is paused
  }

  /// Call when app is detached (being killed).
  Future<void> handleAppDetached() async {
    // Ensure any in-progress work is saved
    syncWorker.dispose();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PLATFORM-SPECIFIC HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/// Check if background sync is supported on current platform.
bool isBackgroundSyncSupported() {
  // workmanager supports Android and iOS
  return !kIsWeb;
}

/// Get recommended sync interval for current platform.
Duration getRecommendedSyncInterval() {
  // Android has 15 min minimum, iOS may have different constraints
  return defaultPeriodicSyncInterval;
}

/// Request background sync permissions (iOS specific).
///
/// On iOS, background app refresh must be enabled by the user.
Future<bool> requestBackgroundSyncPermissions() async {
  // workmanager handles this internally
  // This is a placeholder for any additional permission requests
  return true;
}
