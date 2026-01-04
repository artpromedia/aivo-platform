/// Sync Service
///
/// Manages offline-first data synchronization with the server.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_common/flutter_common.dart'
    hide SyncOperationType, SyncResult, SyncConflict, ConflictType, SyncStatusInfo, EnvConfig;
import 'package:uuid/uuid.dart';

import '../../models/sync_operation.dart';
import '../../config/env_config.dart';
import '../database/local_database.dart';
import 'connectivity_monitor.dart';

const _uuid = Uuid();

/// Sync service for managing offline operations.
class SyncService {
  SyncService({
    required this.localDb,
    required this.apiClient,
    required this.connectivity,
  });

  final TeacherLocalDatabase localDb;
  final AivoApiClient apiClient;
  final ConnectivityMonitor connectivity;

  Timer? _syncTimer;
  bool _isSyncing = false;
  final _statusController = StreamController<SyncStatusInfo>.broadcast();

  /// Stream of sync status updates.
  Stream<SyncStatusInfo> get statusStream => _statusController.stream;

  /// Current sync status.
  SyncStatusInfo _status = const SyncStatusInfo(state: SyncState.idle);
  SyncStatusInfo get status => _status;

  /// Initialize the sync service.
  Future<void> initialize() async {
    // Start listening to connectivity changes
    connectivity.stateStream.listen((isOnline) {
      if (isOnline) {
        // Sync when coming back online
        syncPendingOperations();
      } else {
        _updateStatus(_status.copyWith(state: SyncState.offline));
      }
    });

    // Initial sync if online
    if (await connectivity.isOnline) {
      await syncPendingOperations();
    }
  }

  /// Start background sync.
  void startBackgroundSync() {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(
      Duration(minutes: EnvConfig.syncIntervalMinutes),
      (_) => syncPendingOperations(),
    );
  }

  /// Stop background sync.
  void stopBackgroundSync() {
    _syncTimer?.cancel();
    _syncTimer = null;
  }

  /// Queue an operation for sync.
  Future<void> queueOperation(SyncOperation operation) async {
    await localDb.addSyncOperation(operation);
    
    final pendingCount = await localDb.getPendingSyncCount();
    _updateStatus(_status.copyWith(pendingOperations: pendingCount));

    // Try to sync immediately if online
    if (await connectivity.isOnline && !_isSyncing) {
      unawaited(syncPendingOperations());
    }
  }

  /// Create and queue a sync operation.
  Future<String> queueCreate({
    required String entityType,
    required String entityId,
    required Map<String, dynamic> data,
  }) async {
    final operation = SyncOperation(
      id: _uuid.v4(),
      type: SyncOperationType.create,
      entityType: entityType,
      entityId: entityId,
      data: data,
      createdAt: DateTime.now(),
    );
    await queueOperation(operation);
    return operation.id;
  }

  /// Create and queue an update operation.
  Future<String> queueUpdate({
    required String entityType,
    required String entityId,
    required Map<String, dynamic> data,
  }) async {
    final operation = SyncOperation(
      id: _uuid.v4(),
      type: SyncOperationType.update,
      entityType: entityType,
      entityId: entityId,
      data: data,
      createdAt: DateTime.now(),
    );
    await queueOperation(operation);
    return operation.id;
  }

  /// Create and queue a delete operation.
  Future<String> queueDelete({
    required String entityType,
    required String entityId,
  }) async {
    final operation = SyncOperation(
      id: _uuid.v4(),
      type: SyncOperationType.delete,
      entityType: entityType,
      entityId: entityId,
      data: {},
      createdAt: DateTime.now(),
    );
    await queueOperation(operation);
    return operation.id;
  }

  /// Sync all pending operations.
  Future<SyncResult> syncPendingOperations() async {
    if (_isSyncing) {
      return const SyncResult(success: false, error: 'Sync already in progress');
    }

    if (!await connectivity.isOnline) {
      return SyncResult.offline();
    }

    _isSyncing = true;
    _updateStatus(_status.copyWith(state: SyncState.syncing));
    
    final stopwatch = Stopwatch()..start();
    int synced = 0;
    int failed = 0;
    final conflicts = <SyncConflict>[];

    try {
      final operations = await localDb.getPendingSyncOperations();

      for (final operation in operations) {
        try {
          await _syncOperation(operation);
          await localDb.markSynced(operation.id);
          synced++;
        } catch (e) {
          if (_isConflict(e)) {
            final conflict = await _handleConflict(operation, e);
            if (conflict != null) {
              conflicts.add(conflict);
            }
          } else {
            await localDb.markFailed(operation.id, e.toString());
            failed++;
          }
        }
      }

      stopwatch.stop();
      
      final pendingCount = await localDb.getPendingSyncCount();
      _updateStatus(SyncStatusInfo(
        state: conflicts.isNotEmpty ? SyncState.error : SyncState.idle,
        pendingOperations: pendingCount,
        lastSyncAt: DateTime.now(),
        lastError: conflicts.isNotEmpty ? 'Conflicts detected' : null,
      ));

      return SyncResult(
        success: failed == 0 && conflicts.isEmpty,
        operationsSynced: synced,
        operationsFailed: failed,
        conflicts: conflicts,
        duration: stopwatch.elapsed,
      );
    } catch (e) {
      stopwatch.stop();
      _updateStatus(_status.copyWith(
        state: SyncState.error,
        lastError: e.toString(),
      ));
      return SyncResult.failure(e.toString());
    } finally {
      _isSyncing = false;
    }
  }

  /// Sync a single operation.
  Future<void> _syncOperation(SyncOperation operation) async {
    final endpoint = _getEndpoint(operation.entityType);
    
    switch (operation.type) {
      case SyncOperationType.create:
        await apiClient.post(endpoint, data: operation.data);
        break;
      case SyncOperationType.update:
        await apiClient.put('$endpoint/${operation.entityId}', data: operation.data);
        break;
      case SyncOperationType.delete:
        await apiClient.delete('$endpoint/${operation.entityId}');
        break;
    }
  }

  /// Get API endpoint for entity type.
  String _getEndpoint(String entityType) {
    switch (entityType) {
      case 'session_note':
        return '/session/notes';
      case 'iep_progress':
        return '/iep/progress';
      case 'message':
        return '/messaging/messages';
      case 'student':
        return '/students';
      case 'session':
        return '/session/sessions';
      case 'attendance':
        return '/attendance';
      default:
        return '/$entityType';
    }
  }

  /// Check if error is a conflict.
  bool _isConflict(dynamic error) {
    if (error is ApiException) {
      return error.statusCode == 409;
    }
    return false;
  }

  /// Handle a sync conflict.
  Future<SyncConflict?> _handleConflict(
    SyncOperation operation,
    dynamic error,
  ) async {
    try {
      // Fetch server version
      final endpoint = _getEndpoint(operation.entityType);
      final response = await apiClient.get('$endpoint/${operation.entityId}');
      final serverData = response.data as Map<String, dynamic>;

      final conflict = SyncConflict(
        operationId: operation.id,
        entityType: operation.entityType,
        entityId: operation.entityId,
        localData: operation.data,
        serverData: serverData,
        conflictType: ConflictType.dataModified,
        detectedAt: DateTime.now(),
      );

      await localDb.markConflict(operation.id, jsonEncode(conflict));
      return conflict;
    } catch (e) {
      debugPrint('[SyncService] Error detecting conflict: $e');
      return null;
    }
  }

  /// Resolve a conflict.
  Future<void> resolveConflict(
    SyncConflict conflict,
    ResolutionStrategy strategy,
  ) async {
    switch (strategy) {
      case ResolutionStrategy.keepLocal:
        // Force push local data
        await _forceSync(conflict.operationId);
        break;
      case ResolutionStrategy.keepServer:
        // Discard local changes
        await localDb.removeSyncOperation(conflict.operationId);
        break;
      case ResolutionStrategy.merge:
        // Merge data (implementation depends on entity type)
        final merged = _mergeData(conflict.localData, conflict.serverData);
        await localDb.updateSyncOperationData(conflict.operationId, merged);
        await _forceSync(conflict.operationId);
        break;
      case ResolutionStrategy.askUser:
        // This is handled by the UI
        break;
    }
  }

  /// Force sync an operation (skip conflict check).
  Future<void> _forceSync(String operationId) async {
    final operation = await localDb.getSyncOperation(operationId);
    if (operation == null) return;

    final endpoint = _getEndpoint(operation.entityType);
    
    switch (operation.type) {
      case SyncOperationType.create:
      case SyncOperationType.update:
        await apiClient.put(
          '$endpoint/${operation.entityId}',
          data: {...operation.data, '_force': true},
        );
        break;
      case SyncOperationType.delete:
        await apiClient.delete('$endpoint/${operation.entityId}?force=true');
        break;
    }

    await localDb.markSynced(operationId);
  }

  /// Merge local and server data.
  Map<String, dynamic> _mergeData(
    Map<String, dynamic> local,
    Map<String, dynamic> server,
  ) {
    // Simple merge: prefer local for non-null values
    final merged = Map<String, dynamic>.from(server);
    for (final entry in local.entries) {
      if (entry.value != null) {
        merged[entry.key] = entry.value;
      }
    }
    return merged;
  }

  /// Get pending sync operations.
  Future<List<SyncOperation>> getPendingOperations() async {
    return localDb.getPendingSyncOperations();
  }

  /// Get sync conflicts.
  Future<List<SyncConflict>> getConflicts() async {
    return localDb.getConflicts();
  }

  /// Update status and notify listeners.
  void _updateStatus(SyncStatusInfo newStatus) {
    _status = newStatus;
    _statusController.add(newStatus);
  }

  /// Dispose resources.
  void dispose() {
    stopBackgroundSync();
    _statusController.close();
  }
}

/// Extended sync status info.
class SyncStatusInfo {
  const SyncStatusInfo({
    required this.state,
    this.pendingOperations = 0,
    this.lastSyncAt,
    this.lastError,
  });

  final SyncState state;
  final int pendingOperations;
  final DateTime? lastSyncAt;
  final String? lastError;

  bool get hasPendingData => pendingOperations > 0;

  SyncStatusInfo copyWith({
    SyncState? state,
    int? pendingOperations,
    DateTime? lastSyncAt,
    String? lastError,
  }) {
    return SyncStatusInfo(
      state: state ?? this.state,
      pendingOperations: pendingOperations ?? this.pendingOperations,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
      lastError: lastError,
    );
  }
}
