import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../database/local_database.dart';
import 'sync_models.dart';

/// Sync Queue Manager
///
/// Manages the queue of operations waiting to be synced.
/// Supports:
/// - Priority ordering
/// - Retry with exponential backoff
/// - Operation deduplication
/// - Batch processing
class SyncQueue {
  final LocalDatabase _localDb;

  SyncQueue(this._localDb);

  bool _isInitialized = false;

  /// Initialize the sync queue
  Future<void> initialize() async {
    if (_isInitialized) return;

    // Clean up stale operations on startup
    await _cleanupStaleOperations();

    _isInitialized = true;
    debugPrint('[SyncQueue] Initialized');
  }

  /// Enqueue an operation for sync
  Future<void> enqueue(SyncOperation operation) async {
    // Check for duplicate operations
    final existing = await _findDuplicateOperation(operation);

    if (existing != null) {
      // Merge or replace existing operation
      await _mergeOperation(existing, operation);
      return;
    }

    await _localDb.db.insert('sync_queue', {
      'id': operation.id,
      'operation_type': operation.type.name,
      'entity_type': operation.entityType,
      'entity_id': operation.entityId,
      'data': jsonEncode(operation.data),
      'priority': operation.priority,
      'attempts': 0,
      'max_attempts': 5,
      'status': SyncOperationStatus.pending.name,
      'queued_at': DateTime.now().toIso8601String(),
    });

    debugPrint('[SyncQueue] Enqueued: ${operation.type} ${operation.entityId}');
  }

  /// Get pending operations ordered by priority
  Future<List<SyncOperation>> getPendingOperations() async {
    final maps = await _localDb.db.query(
      'sync_queue',
      where: 'status = ?',
      whereArgs: [SyncOperationStatus.pending.name],
      orderBy: 'priority DESC, queued_at ASC',
    );

    return maps.map((m) => SyncOperation.fromMap(m)).toList();
  }

  /// Get failed operations
  Future<List<SyncOperation>> getFailedOperations() async {
    final maps = await _localDb.db.query(
      'sync_queue',
      where: 'status = ?',
      whereArgs: [SyncOperationStatus.failed.name],
    );

    return maps.map((m) => SyncOperation.fromMap(m)).toList();
  }

  /// Get operation by ID
  Future<SyncOperation?> getOperation(String id) async {
    final maps = await _localDb.db.query(
      'sync_queue',
      where: 'id = ?',
      whereArgs: [id],
    );

    if (maps.isEmpty) return null;
    return SyncOperation.fromMap(maps.first);
  }

  /// Mark operation as completed
  Future<void> markCompleted(String operationId) async {
    await _localDb.db.update(
      'sync_queue',
      {
        'status': SyncOperationStatus.completed.name,
        'completed_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [operationId],
    );

    debugPrint('[SyncQueue] Completed: $operationId');
  }

  /// Mark operation as failed
  Future<void> markFailed(String operationId, String errorMessage) async {
    final op = await getOperation(operationId);
    if (op == null) return;

    final newAttempts = op.attempts + 1;
    final shouldRetry = newAttempts < op.maxAttempts;

    await _localDb.db.update(
      'sync_queue',
      {
        'status': shouldRetry
            ? SyncOperationStatus.pending.name
            : SyncOperationStatus.failed.name,
        'attempts': newAttempts,
        'error_message': errorMessage,
        'last_attempt_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [operationId],
    );

    debugPrint(
        '[SyncQueue] Failed: $operationId (attempt $newAttempts/${op.maxAttempts})');
  }

  /// Mark operation as in progress
  Future<void> markInProgress(String operationId) async {
    await _localDb.db.update(
      'sync_queue',
      {
        'status': SyncOperationStatus.inProgress.name,
        'last_attempt_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [operationId],
    );
  }

  /// Increment attempt count
  Future<void> incrementAttempts(String operationId) async {
    await _localDb.db.rawUpdate('''
      UPDATE sync_queue 
      SET attempts = attempts + 1, 
          last_attempt_at = ? 
      WHERE id = ?
    ''', [DateTime.now().toIso8601String(), operationId]);
  }

  /// Reset failed operation for retry
  Future<void> resetOperation(String operationId) async {
    await _localDb.db.update(
      'sync_queue',
      {
        'status': SyncOperationStatus.pending.name,
        'attempts': 0,
        'error_message': null,
      },
      where: 'id = ?',
      whereArgs: [operationId],
    );
  }

  /// Remove completed operations older than specified duration
  Future<int> cleanupCompleted(
      {Duration olderThan = const Duration(days: 7)}) async {
    final cutoff = DateTime.now().subtract(olderThan);

    return await _localDb.db.delete(
      'sync_queue',
      where: 'status = ? AND completed_at < ?',
      whereArgs: [
        SyncOperationStatus.completed.name,
        cutoff.toIso8601String()
      ],
    );
  }

  /// Get queue statistics
  Future<QueueStats> getStats() async {
    final results = await _localDb.db.rawQuery('''
      SELECT 
        status,
        COUNT(*) as count,
        AVG(attempts) as avg_attempts
      FROM sync_queue
      GROUP BY status
    ''');

    int pending = 0;
    int inProgress = 0;
    int completed = 0;
    int failed = 0;
    double avgAttempts = 0;

    for (final row in results) {
      final status = row['status'] as String;
      final count = row['count'] as int;

      switch (status) {
        case 'pending':
          pending = count;
          avgAttempts = (row['avg_attempts'] as num?)?.toDouble() ?? 0;
          break;
        case 'inProgress':
          inProgress = count;
          break;
        case 'completed':
          completed = count;
          break;
        case 'failed':
          failed = count;
          break;
      }
    }

    return QueueStats(
      pending: pending,
      inProgress: inProgress,
      completed: completed,
      failed: failed,
      averageAttempts: avgAttempts,
    );
  }

  /// Get operations by entity
  Future<List<SyncOperation>> getOperationsForEntity(
    String entityType,
    String entityId,
  ) async {
    final maps = await _localDb.db.query(
      'sync_queue',
      where: 'entity_type = ? AND entity_id = ?',
      whereArgs: [entityType, entityId],
      orderBy: 'queued_at ASC',
    );

    return maps.map((m) => SyncOperation.fromMap(m)).toList();
  }

  /// Cancel pending operations for an entity
  Future<void> cancelOperationsForEntity(
    String entityType,
    String entityId,
  ) async {
    await _localDb.db.delete(
      'sync_queue',
      where: 'entity_type = ? AND entity_id = ? AND status = ?',
      whereArgs: [entityType, entityId, SyncOperationStatus.pending.name],
    );
  }

  /// Clear all operations (use with caution)
  Future<void> clear() async {
    await _localDb.db.delete('sync_queue');
    debugPrint('[SyncQueue] Cleared all operations');
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  Future<SyncOperation?> _findDuplicateOperation(SyncOperation operation) async {
    // Only deduplicate certain operation types
    if (!_shouldDeduplicate(operation.type)) {
      return null;
    }

    final maps = await _localDb.db.query(
      'sync_queue',
      where: '''
        operation_type = ? 
        AND entity_type = ? 
        AND entity_id = ? 
        AND status = ?
      ''',
      whereArgs: [
        operation.type.name,
        operation.entityType,
        operation.entityId,
        SyncOperationStatus.pending.name,
      ],
    );

    if (maps.isEmpty) return null;
    return SyncOperation.fromMap(maps.first);
  }

  bool _shouldDeduplicate(SyncOperationType type) {
    // Operations that can be merged/deduplicated
    return [
      SyncOperationType.updateProgress,
      SyncOperationType.updateSession,
      SyncOperationType.updateMastery,
    ].contains(type);
  }

  Future<void> _mergeOperation(
    SyncOperation existing,
    SyncOperation newOp,
  ) async {
    // Merge data from both operations
    final mergedData = {
      ...existing.data,
      ...newOp.data,
    };

    // Use higher priority
    final priority =
        existing.priority > newOp.priority ? existing.priority : newOp.priority;

    await _localDb.db.update(
      'sync_queue',
      {
        'data': jsonEncode(mergedData),
        'priority': priority,
        'queued_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [existing.id],
    );

    debugPrint('[SyncQueue] Merged operation: ${existing.id}');
  }

  Future<void> _cleanupStaleOperations() async {
    // Mark old pending operations as failed after 24 hours
    final cutoff = DateTime.now().subtract(const Duration(hours: 24));

    final updated = await _localDb.db.update(
      'sync_queue',
      {
        'status': SyncOperationStatus.failed.name,
        'error_message': 'Operation timed out',
      },
      where: 'status = ? AND queued_at < ?',
      whereArgs: [SyncOperationStatus.pending.name, cutoff.toIso8601String()],
    );

    if (updated > 0) {
      debugPrint('[SyncQueue] Cleaned up $updated stale operations');
    }

    // Reset any operations stuck in 'inProgress' state (likely from app crash)
    final resetCount = await _localDb.db.update(
      'sync_queue',
      {
        'status': SyncOperationStatus.pending.name,
      },
      where: 'status = ?',
      whereArgs: [SyncOperationStatus.inProgress.name],
    );

    if (resetCount > 0) {
      debugPrint('[SyncQueue] Reset $resetCount stuck operations');
    }
  }
}

/// Queue statistics
class QueueStats {
  final int pending;
  final int inProgress;
  final int completed;
  final int failed;
  final double averageAttempts;

  QueueStats({
    required this.pending,
    required this.inProgress,
    required this.completed,
    required this.failed,
    required this.averageAttempts,
  });

  int get total => pending + inProgress + completed + failed;

  double get successRate {
    final processed = completed + failed;
    if (processed == 0) return 0;
    return completed / processed;
  }

  Map<String, dynamic> toJson() => {
        'pending': pending,
        'inProgress': inProgress,
        'completed': completed,
        'failed': failed,
        'total': total,
        'successRate': successRate,
        'averageAttempts': averageAttempts,
      };

  @override
  String toString() => 'QueueStats(pending: $pending, completed: $completed, '
      'failed: $failed, successRate: ${(successRate * 100).toStringAsFixed(1)}%)';
}
