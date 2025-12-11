/// Offline support for Aivo Flutter apps.
///
/// This library provides offline-first functionality including:
/// - Local SQLite database (Drift)
/// - Sync manager for queuing and uploading data
/// - Connectivity monitoring
/// - Conflict resolution UI
/// - Content preloading & delta updates
/// - Background sync with exponential backoff
/// - Idempotency & conflict resolution
/// - Sync health UI widgets
///
/// See docs/mobile/offline_architecture.md for architecture details.
/// See docs/sync/background_sync_retry.md for sync & retry documentation.
library;

export 'background_sync_worker.dart';
export 'conflict_resolution.dart';
export 'connectivity_service.dart';
export 'content_preloader.dart';
// Hide SyncConflict and ConflictResolution from idempotency.dart 
// as they're already exported from conflict_resolution.dart
export 'idempotency.dart' hide SyncConflict, ConflictResolution;
export 'offline_database.dart';
export 'offline_tables.dart';
export 'sync_health_widgets.dart';
export 'sync_manager.dart';
// Hide SyncState from sync_scheduler.dart as it conflicts with 
// the SyncState enum in sync_manager.dart
export 'sync_scheduler.dart' hide SyncState;
