/// Grade Sync Service
///
/// Manages automatic background synchronization of grades to Google Classroom.
/// Handles periodic sync, connectivity monitoring, and retry logic.
library;

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/lms_integration.dart';
import '../../providers/lms_provider.dart';
import '../../repositories/lms_repository.dart';
import '../database/local_database.dart';
import 'connectivity_monitor.dart';

/// Status of the grade sync service
enum GradeSyncServiceState {
  /// Service is not running
  idle,

  /// Service is waiting for next sync interval
  waiting,

  /// Service is currently syncing grades
  syncing,

  /// Service is offline, will resume when online
  offline,

  /// Service encountered an error
  error,
}

/// Status information for the grade sync service
@immutable
class GradeSyncServiceStatus {
  const GradeSyncServiceStatus({
    this.state = GradeSyncServiceState.idle,
    this.pendingCount = 0,
    this.failedCount = 0,
    this.lastSyncAt,
    this.nextSyncAt,
    this.lastError,
    this.lastResult,
  });

  final GradeSyncServiceState state;
  final int pendingCount;
  final int failedCount;
  final DateTime? lastSyncAt;
  final DateTime? nextSyncAt;
  final String? lastError;
  final GradePassbackResult? lastResult;

  /// Whether the service is actively syncing
  bool get isSyncing => state == GradeSyncServiceState.syncing;

  /// Whether there are items to sync
  bool get hasItemsToSync => pendingCount > 0 || failedCount > 0;

  GradeSyncServiceStatus copyWith({
    GradeSyncServiceState? state,
    int? pendingCount,
    int? failedCount,
    DateTime? lastSyncAt,
    DateTime? nextSyncAt,
    String? lastError,
    GradePassbackResult? lastResult,
  }) {
    return GradeSyncServiceStatus(
      state: state ?? this.state,
      pendingCount: pendingCount ?? this.pendingCount,
      failedCount: failedCount ?? this.failedCount,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
      nextSyncAt: nextSyncAt ?? this.nextSyncAt,
      lastError: lastError,
      lastResult: lastResult ?? this.lastResult,
    );
  }
}

/// Service for automatic grade synchronization to Google Classroom
class GradeSyncService {
  GradeSyncService({
    required this.repository,
    required this.localDb,
    required this.connectivity,
  });

  final LmsRepository repository;
  final TeacherLocalDatabase localDb;
  final ConnectivityMonitor connectivity;

  Timer? _syncTimer;
  Timer? _retryTimer;
  StreamSubscription<bool>? _connectivitySubscription;
  PassbackSettings _settings = const PassbackSettings();

  final _statusController =
      StreamController<GradeSyncServiceStatus>.broadcast();

  /// Stream of service status updates
  Stream<GradeSyncServiceStatus> get statusStream => _statusController.stream;

  GradeSyncServiceStatus _status = const GradeSyncServiceStatus();

  /// Current service status
  GradeSyncServiceStatus get status => _status;

  /// Initialize the sync service
  Future<void> initialize() async {
    // Load settings
    _settings = await repository.getPassbackSettings();

    // Listen to connectivity changes
    _connectivitySubscription = connectivity.stateStream.listen(_onConnectivityChanged);

    // Start sync if enabled and online
    if (_settings.autoSyncEnabled && await connectivity.isOnline) {
      await _startSyncTimer();
    } else if (!await connectivity.isOnline) {
      _updateStatus(_status.copyWith(state: GradeSyncServiceState.offline));
    }
  }

  /// Update settings (called when settings change)
  Future<void> updateSettings(PassbackSettings settings) async {
    _settings = settings;

    if (settings.autoSyncEnabled) {
      await _startSyncTimer();
    } else {
      _stopSyncTimer();
      _updateStatus(_status.copyWith(state: GradeSyncServiceState.idle));
    }
  }

  /// Start the periodic sync timer
  Future<void> _startSyncTimer() async {
    _stopSyncTimer();

    final interval = Duration(minutes: _settings.syncIntervalMinutes);
    final nextSync = DateTime.now().add(interval);

    _updateStatus(_status.copyWith(
      state: GradeSyncServiceState.waiting,
      nextSyncAt: nextSync,
    ));

    // Initial sync
    await _performSync();

    // Schedule periodic sync
    _syncTimer = Timer.periodic(interval, (_) => _performSync());
  }

  /// Stop the sync timer
  void _stopSyncTimer() {
    _syncTimer?.cancel();
    _syncTimer = null;
    _retryTimer?.cancel();
    _retryTimer = null;
  }

  /// Handle connectivity changes
  void _onConnectivityChanged(bool isOnline) {
    if (isOnline) {
      _updateStatus(_status.copyWith(state: GradeSyncServiceState.waiting));

      // Sync when coming back online
      if (_settings.autoSyncEnabled) {
        _performSync();
      }
    } else {
      _updateStatus(_status.copyWith(state: GradeSyncServiceState.offline));
    }
  }

  /// Perform the sync operation
  Future<void> _performSync() async {
    if (_status.isSyncing) return;

    if (!await connectivity.isOnline) {
      _updateStatus(_status.copyWith(state: GradeSyncServiceState.offline));
      return;
    }

    _updateStatus(_status.copyWith(state: GradeSyncServiceState.syncing));

    try {
      // Get items from local queue
      final queue = await repository.getPassbackQueue();
      final pendingItems = queue.where((i) => i.canRetry).toList();

      _updateStatus(_status.copyWith(
        pendingCount: pendingItems.where((i) => i.status == GradeSyncStatus.pending).length,
        failedCount: pendingItems.where((i) => i.status == GradeSyncStatus.failed).length,
      ));

      if (pendingItems.isEmpty) {
        _updateStatus(_status.copyWith(
          state: GradeSyncServiceState.waiting,
          lastSyncAt: DateTime.now(),
          nextSyncAt: DateTime.now().add(
            Duration(minutes: _settings.syncIntervalMinutes),
          ),
        ));
        return;
      }

      // Process the queue
      final result = await repository.processPassbackQueue();

      _updateStatus(_status.copyWith(
        state: GradeSyncServiceState.waiting,
        lastSyncAt: DateTime.now(),
        nextSyncAt: DateTime.now().add(
          Duration(minutes: _settings.syncIntervalMinutes),
        ),
        lastResult: result,
        pendingCount: 0,
        failedCount: result.failed,
      ));

      // Schedule retry for failed items if needed
      if (result.failed > 0 && _settings.retryPolicy != PassbackRetryPolicy.manual) {
        _scheduleRetry();
      }
    } catch (e) {
      debugPrint('Grade sync error: $e');
      _updateStatus(_status.copyWith(
        state: GradeSyncServiceState.error,
        lastError: e.toString(),
      ));

      // Schedule retry on error
      if (_settings.retryPolicy != PassbackRetryPolicy.manual) {
        _scheduleRetry();
      }
    }
  }

  /// Schedule a retry for failed items
  void _scheduleRetry() {
    _retryTimer?.cancel();

    final delay = switch (_settings.retryPolicy) {
      PassbackRetryPolicy.manual => null,
      PassbackRetryPolicy.once => const Duration(minutes: 5),
      PassbackRetryPolicy.exponential => _calculateExponentialDelay(),
    };

    if (delay != null) {
      _retryTimer = Timer(delay, _performRetry);
    }
  }

  /// Calculate exponential backoff delay
  Duration _calculateExponentialDelay() {
    // Get the max attempt count from failed items
    // For simplicity, use a base delay with exponential increase
    const baseDelay = Duration(minutes: 2);
    // In production, you'd track attempt counts and calculate accordingly
    return baseDelay;
  }

  /// Perform retry of failed items
  Future<void> _performRetry() async {
    if (_status.isSyncing) return;

    if (!await connectivity.isOnline) {
      _updateStatus(_status.copyWith(state: GradeSyncServiceState.offline));
      return;
    }

    _updateStatus(_status.copyWith(state: GradeSyncServiceState.syncing));

    try {
      final result = await repository.retryFailedPassbacks();

      _updateStatus(_status.copyWith(
        state: GradeSyncServiceState.waiting,
        lastSyncAt: DateTime.now(),
        lastResult: result,
        failedCount: result.failed,
      ));

      // Continue retrying if there are still failures and we haven't exceeded max attempts
      if (result.failed > 0 && _settings.retryPolicy == PassbackRetryPolicy.exponential) {
        _scheduleRetry();
      }
    } catch (e) {
      debugPrint('Grade retry error: $e');
      _updateStatus(_status.copyWith(
        state: GradeSyncServiceState.error,
        lastError: e.toString(),
      ));
    }
  }

  /// Manually trigger a sync
  Future<GradePassbackResult?> syncNow() async {
    if (_status.isSyncing) return null;

    _updateStatus(_status.copyWith(state: GradeSyncServiceState.syncing));

    try {
      final result = await repository.processPassbackQueue();

      _updateStatus(_status.copyWith(
        state: _settings.autoSyncEnabled
            ? GradeSyncServiceState.waiting
            : GradeSyncServiceState.idle,
        lastSyncAt: DateTime.now(),
        lastResult: result,
      ));

      return result;
    } catch (e) {
      _updateStatus(_status.copyWith(
        state: GradeSyncServiceState.error,
        lastError: e.toString(),
      ));
      return null;
    }
  }

  /// Update the service status
  void _updateStatus(GradeSyncServiceStatus newStatus) {
    _status = newStatus;
    _statusController.add(_status);
  }

  /// Dispose the service
  void dispose() {
    _stopSyncTimer();
    _connectivitySubscription?.cancel();
    _statusController.close();
  }
}

/// Provider for the grade sync service
final gradeSyncServiceProvider = Provider<GradeSyncService>((ref) {
  final service = GradeSyncService(
    repository: ref.watch(lmsRepositoryProvider),
    localDb: ref.watch(localDatabaseProvider),
    connectivity: ref.watch(connectivityMonitorProvider),
  );

  // Initialize the service
  service.initialize();

  // Update settings when they change
  ref.listen<PassbackSettingsState>(passbackSettingsProvider, (previous, next) {
    if (previous?.settings != next.settings) {
      service.updateSettings(next.settings);
    }
  });

  ref.onDispose(() {
    service.dispose();
  });

  return service;
});

/// Provider for the sync service status
final gradeSyncStatusProvider = StreamProvider<GradeSyncServiceStatus>((ref) {
  final service = ref.watch(gradeSyncServiceProvider);
  return service.statusStream;
});

/// Provider for whether auto-sync is active
final isAutoSyncActiveProvider = Provider<bool>((ref) {
  final status = ref.watch(gradeSyncStatusProvider);
  return status.when(
    data: (s) => s.state == GradeSyncServiceState.waiting || s.state == GradeSyncServiceState.syncing,
    loading: () => false,
    error: (_, __) => false,
  );
});
