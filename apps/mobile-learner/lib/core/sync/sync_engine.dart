import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import '../database/local_database.dart';
import '../network/api_client.dart';
import '../network/connectivity_manager.dart';
import '../../widgets/sync/download_progress.dart' show DownloadInfo, DownloadState;
import 'conflict_resolver.dart';
import 'delta_calculator.dart';
import 'sync_queue.dart';
import 'sync_models.dart';

/// Sync Engine - Core offline synchronization system
///
/// Implements a robust offline-first architecture with:
/// - Bidirectional sync with delta detection
/// - Optimistic updates with rollback capability
/// - Conflict resolution strategies
/// - Background sync support
/// - Multi-device coordination
class SyncEngine {
  static SyncEngine? _instance;
  static SyncEngine get instance => _instance ??= SyncEngine._();

  SyncEngine._();

  // Dependencies
  late final LocalDatabase _localDb;
  late final ApiClient _apiClient;
  late final ConnectivityManager _connectivity;
  late final SyncQueue _syncQueue;
  late final ConflictResolver _conflictResolver;
  late final DeltaCalculator _deltaCalculator;

  // State
  final _syncStateController = StreamController<SyncState>.broadcast();
  Stream<SyncState> get syncState => _syncStateController.stream;

  // Download progress tracking
  final _downloadProgressController = StreamController<List<DownloadInfo>>.broadcast();
  Stream<List<DownloadInfo>> get downloadProgress => _downloadProgressController.stream;
  final _activeDownloads = <String, DownloadInfo>{};

  SyncState _currentState = SyncState.idle;
  SyncState get currentState => _currentState;
  bool _isInitialized = false;
  Timer? _periodicSyncTimer;
  Timer? _retryTimer;
  int _currentRetryAttempt = 0;

  // Sync metadata
  late Box<SyncMetadata> _metadataBox;
  final _pendingOperations = <String, SyncOperation>{};

  // Configuration
  static const _periodicSyncInterval = Duration(minutes: 5);
  static const _retryDelayBase = Duration(seconds: 5);
  static const _maxRetryAttempts = 5;
  static const _batchSize = 50;

  /// Initialize the sync engine
  Future<void> initialize({
    required LocalDatabase localDb,
    required ApiClient apiClient,
    required ConnectivityManager connectivity,
  }) async {
    if (_isInitialized) return;

    _localDb = localDb;
    _apiClient = apiClient;
    _connectivity = connectivity;
    _syncQueue = SyncQueue(localDb);
    _conflictResolver = ConflictResolver();
    _deltaCalculator = DeltaCalculator();

    // Initialize Hive boxes
    await Hive.initFlutter();
    if (!Hive.isAdapterRegistered(0)) {
      Hive.registerAdapter(SyncMetadataAdapter());
    }
    if (!Hive.isAdapterRegistered(1)) {
      Hive.registerAdapter(SyncOperationAdapter());
    }
    _metadataBox = await Hive.openBox<SyncMetadata>('sync_metadata');

    // Load pending operations
    await _syncQueue.initialize();

    // Reload pending operations from queue
    final pending = await _syncQueue.getPendingOperations();
    for (final op in pending) {
      _pendingOperations[op.id] = op;
    }

    // Listen to connectivity changes
    _connectivity.onConnectivityChanged.listen(_handleConnectivityChange);

    // Start periodic sync if online
    if (await _connectivity.isConnected) {
      _startPeriodicSync();
    }

    _isInitialized = true;
    debugPrint('[SyncEngine] Initialized with ${_pendingOperations.length} pending operations');
  }

  /// Perform a full sync
  Future<SyncResult> performFullSync() async {
    if (_currentState == SyncState.syncing) {
      return SyncResult(
        success: false,
        error: 'Sync already in progress',
      );
    }

    _updateState(SyncState.syncing);
    final startTime = DateTime.now();

    try {
      // Check connectivity
      if (!await _connectivity.isConnected) {
        _updateState(SyncState.offline);
        return SyncResult(
          success: false,
          error: 'No internet connection',
          isOffline: true,
        );
      }

      // Phase 1: Push local changes
      final pushResult = await _pushLocalChanges();

      // Phase 2: Pull remote changes
      final pullResult = await _pullRemoteChanges();

      // Phase 3: Resolve any conflicts
      final conflictResult = await _resolveConflicts();

      // Update sync metadata
      await _updateSyncTimestamp();
      _currentRetryAttempt = 0;

      final duration = DateTime.now().difference(startTime);
      _updateState(SyncState.idle);

      return SyncResult(
        success: true,
        pushedCount: pushResult.count,
        pulledCount: pullResult.count,
        conflictsResolved: conflictResult.resolved,
        duration: duration,
      );
    } catch (e, stack) {
      debugPrint('[SyncEngine] Sync failed: $e\n$stack');
      _updateState(SyncState.error);
      _scheduleRetry();

      return SyncResult(
        success: false,
        error: e.toString(),
      );
    }
  }

  /// Perform incremental delta sync
  Future<SyncResult> performDeltaSync() async {
    if (_currentState == SyncState.syncing) {
      return SyncResult(success: false, error: 'Sync in progress');
    }

    _updateState(SyncState.syncing);

    try {
      final lastSyncTime = _getLastSyncTime();

      // Get local changes since last sync
      final localChanges = await _localDb.getChangesSince(lastSyncTime);

      // Get server changes since last sync
      final serverChanges = await _apiClient.getDeltaChanges(
        since: lastSyncTime,
        deviceId: await _getDeviceId(),
      );

      // Calculate deltas
      final deltas = _deltaCalculator.calculateDeltas(
        localChanges: localChanges,
        serverChanges: serverChanges,
      );

      // Apply deltas
      int pushed = 0;
      int pulled = 0;

      // Push local-only changes
      for (final delta in deltas.localOnly) {
        await _pushChange(delta);
        pushed++;
      }

      // Pull server-only changes
      for (final delta in deltas.serverOnly) {
        await _applyServerChange(delta);
        pulled++;
      }

      // Handle conflicts
      for (final conflict in deltas.conflicts) {
        await _handleConflict(conflict);
      }

      await _updateSyncTimestamp();
      _currentRetryAttempt = 0;
      _updateState(SyncState.idle);

      return SyncResult(
        success: true,
        pushedCount: pushed,
        pulledCount: pulled,
        conflictsResolved: deltas.conflicts.length,
      );
    } catch (e) {
      _updateState(SyncState.error);
      _scheduleRetry();
      return SyncResult(success: false, error: e.toString());
    }
  }

  /// Queue an operation for sync
  Future<void> queueOperation(SyncOperation operation) async {
    final id = const Uuid().v4();
    final queuedOp = operation.copyWith(
      id: id,
      queuedAt: DateTime.now(),
      status: SyncOperationStatus.pending,
    );

    // Store in queue
    await _syncQueue.enqueue(queuedOp);
    _pendingOperations[id] = queuedOp;

    // Apply optimistically
    await _applyOptimistically(queuedOp);

    // Try to sync immediately if online
    if (await _connectivity.isConnected) {
      _processQueue();
    }

    debugPrint('[SyncEngine] Operation queued: ${operation.type}');
  }

  /// Download content for offline access
  Future<OfflineDownloadResult> downloadForOffline({
    required String lessonId,
    DownloadOptions? options,
    void Function(double progress)? onProgress,
  }) async {
    final result = OfflineDownloadResult(lessonId: lessonId);

    try {
      // Fetch lesson with all content
      final lesson = await _apiClient.getLesson(
        lessonId,
        includeMedia: true,
        includeBlocks: true,
      );

      // Store lesson data
      await _localDb.saveLesson(lesson);

      // Download media assets
      if (options?.includeMedia ?? true) {
        final mediaUrls = _extractMediaUrls(lesson);
        int downloadedCount = 0;

        for (final url in mediaUrls) {
          try {
            await _downloadAndCacheMedia(url, lessonId);
            result.mediaDownloaded++;
            downloadedCount++;

            // Report progress
            if (onProgress != null) {
              onProgress(downloadedCount / mediaUrls.length);
            }
          } catch (e) {
            result.mediaFailed++;
            debugPrint('[SyncEngine] Media download failed: $url - $e');
          }
        }
      }

      // Mark as available offline
      await _localDb.markAvailableOffline(lessonId);

      result.success = true;
      result.totalSize = await _calculateDownloadSize(lessonId);

      return result;
    } catch (e) {
      result.error = e.toString();
      return result;
    }
  }

  /// Remove offline content
  Future<void> removeOfflineContent(String lessonId) async {
    await _localDb.removeOfflineLesson(lessonId);
    await _clearCachedMedia(lessonId);
  }

  /// Cancel an active download
  void cancelDownload(String lessonId) {
    _activeDownloads.remove(lessonId);
    _notifyDownloadProgress();
    debugPrint('[SyncEngine] Download cancelled: $lessonId');
  }

  /// Retry a failed download
  void retryDownload(String lessonId) {
    final download = _activeDownloads[lessonId];
    if (download != null) {
      _activeDownloads[lessonId] = DownloadInfo(
        id: download.id,
        title: download.title,
        subtitle: download.subtitle,
        progress: download.progress,
        state: DownloadState.downloading,
        totalBytes: download.totalBytes,
        downloadedBytes: download.downloadedBytes,
        startedAt: download.startedAt,
      );
      _notifyDownloadProgress();
      // Re-initiate download
      downloadForOffline(lessonId: lessonId);
    }
    debugPrint('[SyncEngine] Download retry: $lessonId');
  }

  /// Pause an active download
  void pauseDownload(String lessonId) {
    final download = _activeDownloads[lessonId];
    if (download != null) {
      _activeDownloads[lessonId] = DownloadInfo(
        id: download.id,
        title: download.title,
        subtitle: download.subtitle,
        progress: download.progress,
        state: DownloadState.paused,
        totalBytes: download.totalBytes,
        downloadedBytes: download.downloadedBytes,
        startedAt: download.startedAt,
      );
      _notifyDownloadProgress();
    }
    debugPrint('[SyncEngine] Download paused: $lessonId');
  }

  /// Resume a paused download
  void resumeDownload(String lessonId) {
    final download = _activeDownloads[lessonId];
    if (download != null) {
      _activeDownloads[lessonId] = DownloadInfo(
        id: download.id,
        title: download.title,
        subtitle: download.subtitle,
        progress: download.progress,
        state: DownloadState.downloading,
        totalBytes: download.totalBytes,
        downloadedBytes: download.downloadedBytes,
        startedAt: download.startedAt,
      );
      _notifyDownloadProgress();
      // Re-initiate download from where it left off
      downloadForOffline(lessonId: lessonId);
    }
    debugPrint('[SyncEngine] Download resumed: $lessonId');
  }

  void _notifyDownloadProgress() {
    _downloadProgressController.add(_activeDownloads.values.toList());
  }

  /// Get sync status for an entity
  SyncStatus getSyncStatus(String entityId) {
    final pending = _pendingOperations.values
        .where((op) => op.entityId == entityId)
        .toList();

    if (pending.isEmpty) {
      return SyncStatus.synced;
    }

    if (pending.any((op) => op.status == SyncOperationStatus.failed)) {
      return SyncStatus.error;
    }

    return SyncStatus.pending;
  }

  /// Get pending operations count
  int get pendingOperationsCount => _pendingOperations.length;

  /// Force retry failed operations
  Future<void> retryFailedOperations() async {
    final failed = await _syncQueue.getFailedOperations();
    for (final op in failed) {
      await _syncQueue.resetOperation(op.id);
      _pendingOperations[op.id] = op.copyWith(
        status: SyncOperationStatus.pending,
        attempts: 0,
      );
    }
    _processQueue();
  }

  /// Get offline lessons
  Future<List<Lesson>> getOfflineLessons() async {
    return await _localDb.getOfflineLessons();
  }

  /// Check if a lesson is available offline
  Future<bool> isLessonAvailableOffline(String lessonId) async {
    return await _localDb.isLessonOffline(lessonId);
  }

  /// Dispose resources
  void dispose() {
    _periodicSyncTimer?.cancel();
    _retryTimer?.cancel();
    _syncStateController.close();
    _instance = null;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  void _updateState(SyncState state) {
    _currentState = state;
    _syncStateController.add(state);
  }

  void _handleConnectivityChange(List<ConnectivityResult> results) {
    final hasConnection = results.any((r) => r != ConnectivityResult.none);

    if (hasConnection) {
      debugPrint('[SyncEngine] Back online, starting sync');
      _startPeriodicSync();
      _processQueue();
    } else {
      debugPrint('[SyncEngine] Gone offline');
      _updateState(SyncState.offline);
      _periodicSyncTimer?.cancel();
    }
  }

  void _startPeriodicSync() {
    _periodicSyncTimer?.cancel();
    _periodicSyncTimer = Timer.periodic(_periodicSyncInterval, (_) {
      performDeltaSync();
    });
  }

  void _scheduleRetry() {
    _retryTimer?.cancel();
    _currentRetryAttempt++;

    if (_currentRetryAttempt >= _maxRetryAttempts) {
      debugPrint('[SyncEngine] Max retry attempts reached');
      return;
    }

    final delay = _retryDelayBase * (1 << _currentRetryAttempt); // Exponential backoff
    debugPrint('[SyncEngine] Scheduling retry in ${delay.inSeconds}s (attempt $_currentRetryAttempt)');

    _retryTimer = Timer(delay, () {
      performDeltaSync();
    });
  }

  Future<_PushResult> _pushLocalChanges() async {
    final pendingOps = await _syncQueue.getPendingOperations();
    int successCount = 0;

    // Process in batches
    for (var i = 0; i < pendingOps.length; i += _batchSize) {
      final batch = pendingOps.skip(i).take(_batchSize).toList();

      try {
        final response = await _apiClient.pushChanges(
          operations: batch.map((op) => op.toJson()).toList(),
          deviceId: await _getDeviceId(),
        );

        // Mark successful operations
        for (final result in response.results) {
          if (result.success) {
            await _syncQueue.markCompleted(result.operationId);
            _pendingOperations.remove(result.operationId);
            successCount++;
          } else if (result.conflict != null) {
            await _handleServerConflict(result.operationId, result.conflict!);
          } else {
            await _syncQueue.markFailed(
              result.operationId,
              result.error ?? 'Unknown error',
            );
          }
        }
      } catch (e) {
        debugPrint('[SyncEngine] Batch push failed: $e');
        // Mark batch as failed, will retry later
        for (final op in batch) {
          await _syncQueue.markFailed(op.id, e.toString());
        }
      }
    }

    return _PushResult(count: successCount);
  }

  Future<_PullResult> _pullRemoteChanges() async {
    final lastSync = _getLastSyncTime();
    int pulledCount = 0;
    String? cursor;

    do {
      final response = await _apiClient.pullChanges(
        since: lastSync,
        cursor: cursor,
        limit: _batchSize,
        deviceId: await _getDeviceId(),
      );

      for (final change in response.changes) {
        await _applyServerChange(change);
        pulledCount++;
      }

      cursor = response.nextCursor;
    } while (cursor != null);

    return _PullResult(count: pulledCount);
  }

  Future<void> _applyServerChange(ServerChange change) async {
    switch (change.entityType) {
      case 'lesson':
        await _localDb.upsertLesson(change.data);
        break;
      case 'skill_mastery':
        await _localDb.upsertSkillMastery(change.data);
        break;
      case 'learning_session':
        await _localDb.upsertSession(change.data);
        break;
      case 'response':
        await _localDb.upsertResponse(change.data);
        break;
      default:
        debugPrint('[SyncEngine] Unknown entity type: ${change.entityType}');
    }
  }

  Future<void> _applyOptimistically(SyncOperation operation) async {
    // Apply change locally for immediate UI update
    switch (operation.type) {
      case SyncOperationType.createResponse:
        await _localDb.saveResponse(
          Response.fromJson(operation.data),
          isLocal: true,
        );
        break;
      case SyncOperationType.updateProgress:
        await _localDb.updateProgress(
          operation.entityId,
          operation.data,
          isLocal: true,
        );
        break;
      case SyncOperationType.completeLesson:
        await _localDb.markLessonCompleted(
          operation.entityId,
          operation.data,
          isLocal: true,
        );
        break;
      case SyncOperationType.updateSession:
        await _localDb.updateSession(operation.entityId, operation.data);
        break;
      case SyncOperationType.updateMastery:
        await _localDb.updateSkillMastery(
          operation.data['studentId'],
          operation.data['skillId'],
          operation.data['masteryLevel'],
        );
        break;
      default:
        break;
    }
  }

  Future<void> _processQueue() async {
    if (_currentState == SyncState.syncing) return;
    if (!await _connectivity.isConnected) return;

    final pending = await _syncQueue.getPendingOperations();
    if (pending.isEmpty) return;

    _updateState(SyncState.syncing);

    for (final operation in pending) {
      try {
        await _pushSingleOperation(operation);
        await _syncQueue.markCompleted(operation.id);
        _pendingOperations.remove(operation.id);
      } catch (e) {
        final attempts = operation.attempts + 1;
        if (attempts >= _maxRetryAttempts) {
          await _syncQueue.markFailed(operation.id, e.toString());
        } else {
          await _syncQueue.incrementAttempts(operation.id);
        }
      }
    }

    _updateState(SyncState.idle);
  }

  Future<void> _pushSingleOperation(SyncOperation operation) async {
    await _apiClient.pushSingleChange(
      operation: operation.toJson(),
      deviceId: await _getDeviceId(),
    );
  }

  Future<void> _pushChange(dynamic change) async {
    if (change is SyncOperation) {
      await _pushSingleOperation(change);
    } else if (change is LocalChange) {
      await _apiClient.pushSingleChange(
        operation: {
          'id': change.id,
          'operation_type': change.changeType.name,
          'entity_type': change.entityType,
          'entity_id': change.entityId,
          'data': change.data,
          'queued_at': change.changedAt.toIso8601String(),
        },
        deviceId: await _getDeviceId(),
      );
    }
  }

  Future<_ConflictResult> _resolveConflicts() async {
    final conflicts = await _localDb.getUnresolvedConflicts();
    int resolved = 0;

    for (final conflict in conflicts) {
      final resolution = await _conflictResolver.resolve(conflict);
      await _applyResolution(resolution);
      resolved++;
    }

    return _ConflictResult(resolved: resolved);
  }

  Future<void> _handleConflict(DeltaConflict conflict) async {
    final resolution = await _conflictResolver.resolve(
      SyncConflict(
        localVersion: conflict.localChange,
        serverVersion: conflict.serverChange,
        entityType: conflict.entityType,
        entityId: conflict.entityId,
      ),
    );
    await _applyResolution(resolution);
  }

  Future<void> _handleServerConflict(
    String operationId,
    ServerConflict conflict,
  ) async {
    final localOp = _pendingOperations[operationId];
    if (localOp == null) return;

    final resolution = await _conflictResolver.resolve(
      SyncConflict(
        localVersion: localOp.data,
        serverVersion: conflict.serverData,
        entityType: localOp.entityType,
        entityId: localOp.entityId,
      ),
    );

    if (resolution.useServer) {
      // Rollback local change
      await _rollbackOptimisticUpdate(localOp);
      await _applyServerChange(ServerChange(
        entityType: localOp.entityType,
        entityId: localOp.entityId,
        data: conflict.serverData,
        timestamp: conflict.serverTimestamp,
      ));
    } else {
      // Re-push with conflict resolution
      await _apiClient.resolveConflict(
        operationId: operationId,
        resolution: resolution.mergedData,
        deviceId: await _getDeviceId(),
      );
    }

    await _syncQueue.markCompleted(operationId);
    _pendingOperations.remove(operationId);
  }

  Future<void> _applyResolution(ConflictResolution resolution) async {
    await _localDb.applyConflictResolution(
      entityType: resolution.entityType,
      entityId: resolution.entityId,
      data: resolution.mergedData,
    );
  }

  Future<void> _rollbackOptimisticUpdate(SyncOperation operation) async {
    // Revert the optimistic update
    final previousState = await _localDb.getPreviousState(
      operation.entityType,
      operation.entityId,
    );

    if (previousState != null) {
      await _localDb.restoreState(
        operation.entityType,
        operation.entityId,
        previousState,
      );
    }
  }

  DateTime? _getLastSyncTime() {
    final metadata = _metadataBox.get('last_sync');
    return metadata?.timestamp;
  }

  Future<void> _updateSyncTimestamp() async {
    await _metadataBox.put(
      'last_sync',
      SyncMetadata(timestamp: DateTime.now()),
    );
  }

  Future<String> _getDeviceId() async {
    var deviceId = _metadataBox.get('device_id')?.deviceId;
    if (deviceId == null) {
      deviceId = const Uuid().v4();
      await _metadataBox.put(
        'device_id',
        SyncMetadata(deviceId: deviceId),
      );
    }
    return deviceId;
  }

  List<String> _extractMediaUrls(Lesson lesson) {
    final urls = <String>[];
    for (final block in lesson.blocks) {
      if (block.type == 'image' && block.content['src'] != null) {
        urls.add(block.content['src']);
      }
      if (block.type == 'video' && block.content['src'] != null) {
        urls.add(block.content['src']);
      }
      if (block.type == 'audio' && block.content['src'] != null) {
        urls.add(block.content['src']);
      }
    }
    return urls;
  }

  Future<void> _downloadAndCacheMedia(String url, String lessonId) async {
    final response = await _apiClient.downloadMedia(url);
    await _localDb.cacheMedia(url, response.bytes, lessonId: lessonId);
  }

  Future<void> _clearCachedMedia(String lessonId) async {
    await _localDb.clearMediaCache(lessonId);
  }

  Future<int> _calculateDownloadSize(String lessonId) async {
    return await _localDb.getOfflineLessonSize(lessonId);
  }
}

// Helper classes
class _PushResult {
  final int count;
  _PushResult({required this.count});
}

class _PullResult {
  final int count;
  _PullResult({required this.count});
}

class _ConflictResult {
  final int resolved;
  _ConflictResult({required this.resolved});
}
