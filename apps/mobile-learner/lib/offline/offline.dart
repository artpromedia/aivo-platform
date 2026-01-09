/// Offline support for the Learner App.
///
/// This library provides offline-first functionality including:
/// - API clients that work with SyncManager
/// - Initialization helpers
/// - UI components (OfflineBanner, SyncPendingIndicator)
/// - Convenient extensions for recording events
/// - ND-3.2: Offline regulation activities
library;

export 'offline_api_clients.dart';
export 'offline_init.dart';

// ND-3.2: Offline Regulation Activities
export 'offline_manager.dart';
export 'offline_storage.dart';
export 'cached_activities.dart';
export 'offline_regulation_service.dart';

// HIGH-006: Offline Operation Queue
export 'offline_queue.dart';
