/// Mock Services
///
/// Additional mock service implementations for testing.
library;

import 'dart:async';

import 'package:flutter_common/flutter_common.dart' show SyncState;
import 'package:mobile_teacher/models/models.dart';
import 'package:mobile_teacher/services/sync/sync_service.dart';

// ============================================================================
// Fake Implementations for Testing
// ============================================================================

/// Fake sync service for integration testing.
class FakeSyncService implements SyncService {
  FakeSyncService({
    this.initialState = SyncState.idle,
    this.initialPendingCount = 0,
  }) : _status = SyncStatusInfo(
          state: initialState,
          pendingOperations: initialPendingCount,
        );

  final SyncState initialState;
  final int initialPendingCount;

  SyncStatusInfo _status;
  final _statusController = StreamController<SyncStatusInfo>.broadcast();
  final List<SyncOperation> _pendingOperations = [];

  @override
  SyncStatusInfo get status => _status;

  @override
  Stream<SyncStatusInfo> get statusStream => _statusController.stream;

  void updateStatus(SyncStatusInfo newStatus) {
    _status = newStatus;
    _statusController.add(newStatus);
  }

  @override
  Future<void> queueOperation(SyncOperation operation) async {
    _pendingOperations.add(operation);
    updateStatus(_status.copyWith(
      pendingOperations: _pendingOperations.length,
    ));
  }

  @override
  Future<String> queueCreate({
    required String entityType,
    required String entityId,
    required Map<String, dynamic> data,
  }) async {
    final operation = SyncOperation(
      id: 'op-${_pendingOperations.length}',
      type: SyncOperationType.create,
      entityType: entityType,
      entityId: entityId,
      data: data,
      createdAt: DateTime.now(),
    );
    await queueOperation(operation);
    return operation.id;
  }

  @override
  Future<String> queueUpdate({
    required String entityType,
    required String entityId,
    required Map<String, dynamic> data,
  }) async {
    final operation = SyncOperation(
      id: 'op-${_pendingOperations.length}',
      type: SyncOperationType.update,
      entityType: entityType,
      entityId: entityId,
      data: data,
      createdAt: DateTime.now(),
    );
    await queueOperation(operation);
    return operation.id;
  }

  @override
  Future<String> queueDelete({
    required String entityType,
    required String entityId,
  }) async {
    final operation = SyncOperation(
      id: 'op-${_pendingOperations.length}',
      type: SyncOperationType.delete,
      entityType: entityType,
      entityId: entityId,
      data: {},
      createdAt: DateTime.now(),
    );
    await queueOperation(operation);
    return operation.id;
  }

  @override
  Future<SyncResult> syncPendingOperations() async {
    if (_pendingOperations.isEmpty) {
      return const SyncResult(success: true, operationsSynced: 0);
    }

    updateStatus(_status.copyWith(state: SyncState.syncing));

    // Simulate sync
    await Future.delayed(const Duration(milliseconds: 100));

    final synced = _pendingOperations.length;
    _pendingOperations.clear();

    updateStatus(SyncStatusInfo(
      state: SyncState.idle,
      pendingOperations: 0,
      lastSyncAt: DateTime.now(),
    ));

    return SyncResult(success: true, operationsSynced: synced);
  }

  @override
  Future<void> initialize() async {}

  @override
  void startBackgroundSync() {}

  @override
  void stopBackgroundSync() {}

  @override
  void dispose() {
    _statusController.close();
  }

  // Ignore other methods not needed for testing
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Fake API client for integration testing.
class FakeApiClient {
  FakeApiClient({
    this.shouldFail = false,
    this.latencyMs = 100,
  });

  final bool shouldFail;
  final int latencyMs;

  final Map<String, Map<String, dynamic>> _store = {};

  Future<T> _withLatency<T>(T Function() action) async {
    await Future.delayed(Duration(milliseconds: latencyMs));
    if (shouldFail) {
      throw Exception('Simulated API failure');
    }
    return action();
  }

  Future<Map<String, dynamic>> get(String path) async {
    return _withLatency(() => _store[path] ?? {});
  }

  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> data,
  ) async {
    return _withLatency(() {
      _store[path] = data;
      return data;
    });
  }

  Future<Map<String, dynamic>> put(
    String path,
    Map<String, dynamic> data,
  ) async {
    return _withLatency(() {
      _store[path] = {...?_store[path], ...data};
      return _store[path]!;
    });
  }

  Future<void> delete(String path) async {
    return _withLatency(() {
      _store.remove(path);
    });
  }

  void seed(String path, Map<String, dynamic> data) {
    _store[path] = data;
  }

  void clear() {
    _store.clear();
  }
}

// ============================================================================
// Sync Status and Result Types
// ============================================================================

/// Conflict resolution strategy.
enum ConflictResolution {
  clientWins,
  serverWins,
  merge,
}
