/// Sync Provider
///
/// State management for offline sync.
library;

import 'package:flutter_common/flutter_common.dart' as common show SyncState;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../services/sync/sync_service.dart';
import 'core_providers.dart';

// ============================================================================
// State Classes
// ============================================================================

/// Convert flutter_common SyncState to local SyncStatus.
SyncStatus _mapSyncState(common.SyncState state) {
  switch (state) {
    case common.SyncState.idle:
      return SyncStatus.idle;
    case common.SyncState.syncing:
      return SyncStatus.syncing;
    case common.SyncState.offline:
      return SyncStatus.pending;
    case common.SyncState.error:
      return SyncStatus.failed;
  }
}

/// Sync state.
class SyncState {
  const SyncState({
    this.status = SyncStatus.idle,
    this.pendingCount = 0,
    this.conflicts = const [],
    this.lastSyncAt,
    this.error,
  });

  final SyncStatus status;
  final int pendingCount;
  final List<SyncConflict> conflicts;
  final DateTime? lastSyncAt;
  final String? error;

  bool get hasPendingChanges => pendingCount > 0;
  bool get hasConflicts => conflicts.isNotEmpty;

  SyncState copyWith({
    SyncStatus? status,
    int? pendingCount,
    List<SyncConflict>? conflicts,
    DateTime? lastSyncAt,
    String? error,
  }) {
    return SyncState(
      status: status ?? this.status,
      pendingCount: pendingCount ?? this.pendingCount,
      conflicts: conflicts ?? this.conflicts,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
      error: error,
    );
  }
}

// ============================================================================
// State Notifier
// ============================================================================

/// Sync notifier.
class SyncNotifier extends StateNotifier<SyncState> {
  SyncNotifier(this._syncService) : super(const SyncState()) {
    _init();
  }

  final SyncService _syncService;

  void _init() {
    // Listen to sync status changes
    _syncService.statusStream.listen((statusInfo) {
      state = state.copyWith(status: _mapSyncState(statusInfo.state));
    });
    
    // Load initial state
    _loadPendingCount();
    _loadConflicts();
  }

  Future<void> _loadPendingCount() async {
    final operations = await _syncService.getPendingOperations();
    state = state.copyWith(pendingCount: operations.length);
  }

  Future<void> _loadConflicts() async {
    final conflicts = await _syncService.getConflicts();
    state = state.copyWith(conflicts: conflicts);
  }

  /// Manually trigger sync.
  Future<void> syncNow() async {
    try {
      await _syncService.syncPendingOperations();
      await _loadPendingCount();
      await _loadConflicts();
      state = state.copyWith(lastSyncAt: DateTime.now());
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Resolve a sync conflict.
  Future<void> resolveConflict(SyncConflict conflict, ResolutionStrategy strategy) async {
    try {
      await _syncService.resolveConflict(conflict, strategy);
      await _loadConflicts();
      await _loadPendingCount();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Refresh sync state.
  Future<void> refresh() async {
    await _loadPendingCount();
    await _loadConflicts();
  }
}

// ============================================================================
// Providers
// ============================================================================

/// Sync state provider.
final syncProvider = StateNotifierProvider<SyncNotifier, SyncState>((ref) {
  final syncService = ref.watch(syncServiceProvider);
  return SyncNotifier(syncService);
});

/// Pending sync count provider.
final pendingSyncCountProvider = Provider<int>((ref) {
  final state = ref.watch(syncProvider);
  return state.pendingCount;
});

/// Sync conflicts provider.
final syncConflictsProvider = Provider<List<SyncConflict>>((ref) {
  final state = ref.watch(syncProvider);
  return state.conflicts;
});

/// Has pending changes provider.
final hasPendingChangesProvider = Provider<bool>((ref) {
  final state = ref.watch(syncProvider);
  return state.hasPendingChanges;
});

/// Sync status stream provider.
final syncStatusStreamProvider = StreamProvider<SyncStatus>((ref) {
  final syncService = ref.watch(syncServiceProvider);
  return syncService.statusStream.map((info) => _mapSyncState(info.state));
});

/// Last sync time provider.
final lastSyncTimeProvider = Provider<DateTime?>((ref) {
  final state = ref.watch(syncProvider);
  return state.lastSyncAt;
});
