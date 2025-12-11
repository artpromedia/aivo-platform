/// Offline Initialization for Learner App
///
/// This module handles initialization of offline services and provides
/// Riverpod provider overrides for the app.
library;

import 'dart:async';

import 'package:flutter/material.dart' hide ConnectionState;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

import 'offline_api_clients.dart';

// ══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

/// Initializes offline services and returns provider overrides.
///
/// Call this before creating the ProviderScope:
/// ```dart
/// void main() async {
///   WidgetsFlutterBinding.ensureInitialized();
///   final overrides = await initializeOfflineServices();
///   runApp(ProviderScope(overrides: overrides, child: const LearnerApp()));
/// }
/// ```
Future<List<Override>> initializeOfflineServices({
  Future<String?> Function()? getAccessToken,
}) async {
  // Initialize connectivity service
  final connectivity = ConnectivityService();
  await connectivity.initialize();

  // Initialize database
  final database = OfflineDatabase();

  // Create token getter (default returns null, override in production)
  final tokenGetter = getAccessToken ?? () async => null;

  // Create API clients
  final planApi = LearnerPlanApiClient(getAccessToken: tokenGetter);
  final contentApi = LearnerContentApiClient(getAccessToken: tokenGetter);
  final sessionApi = LearnerSessionApiClient(getAccessToken: tokenGetter);
  final eventApi = LearnerEventApiClient(getAccessToken: tokenGetter);

  // Create sync manager
  final syncManager = SyncManager(
    database: database,
    connectivityService: connectivity,
    planApi: planApi,
    contentApi: contentApi,
    sessionApi: sessionApi,
    eventApi: eventApi,
  );

  // Return provider overrides
  return [
    offlineDatabaseProvider.overrideWithValue(database),
    connectivityServiceProvider.overrideWithValue(connectivity),
    accessTokenProvider.overrideWithValue(tokenGetter),
    planApiClientProvider.overrideWithValue(planApi),
    contentApiClientProvider.overrideWithValue(contentApi),
    sessionApiClientProvider.overrideWithValue(sessionApi),
    eventApiClientProvider.overrideWithValue(eventApi),
    learnerSyncManagerProvider.overrideWithValue(syncManager),
  ];
}

/// Container for initialized offline services.
class OfflineServices {
  const OfflineServices({
    required this.database,
    required this.connectivity,
    required this.syncManager,
  });

  final OfflineDatabase database;
  final ConnectivityService connectivity;
  final SyncManager syncManager;

  /// Dispose all services.
  Future<void> dispose() async {
    syncManager.dispose();
    connectivity.dispose();
    await database.closeDatabase();
  }
}

/// Provider for accessing offline services as a group.
final offlineServicesProvider = Provider<OfflineServices>((ref) {
  final db = ref.watch(offlineDatabaseProvider);
  final connectivity = ref.watch(connectivityServiceProvider);
  final syncManager = ref.watch(learnerSyncManagerProvider);

  return OfflineServices(
    database: db,
    connectivity: connectivity,
    syncManager: syncManager,
  );
});

/// Provider for connectivity state stream.
final connectivityStateProvider = StreamProvider<ConnectionState>((ref) {
  final service = ref.watch(connectivityServiceProvider);
  return service.stateStream;
});

// ══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

/// A banner that shows when the device is offline.
class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connectivity = ref.watch(connectivityServiceProvider);

    return StreamBuilder<ConnectionState>(
      stream: connectivity.stateStream,
      initialData: connectivity.currentState,
      builder: (context, snapshot) {
        if (snapshot.data == ConnectionState.online) {
          return const SizedBox.shrink();
        }

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
          color: Colors.orange.shade100,
          child: SafeArea(
            bottom: false,
            child: Row(
              children: [
                Icon(Icons.cloud_off, color: Colors.orange.shade800, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'You\'re offline. Your progress is saved and will sync when you reconnect.',
                    style: TextStyle(
                      color: Colors.orange.shade900,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// A banner that shows when the device is offline (using AsyncValue).
class OfflineStatusBanner extends StatelessWidget {
  const OfflineStatusBanner({
    super.key,
    required this.connectivityState,
  });

  final AsyncValue<ConnectionState> connectivityState;

  @override
  Widget build(BuildContext context) {
    return connectivityState.when(
      data: (state) {
        if (state == ConnectionState.online) {
          return const SizedBox.shrink();
        }

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
          color: Colors.orange.shade100,
          child: SafeArea(
            bottom: false,
            child: Row(
              children: [
                Icon(Icons.cloud_off, color: Colors.orange.shade800, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'You\'re offline. Your progress is saved and will sync when you reconnect.',
                    style: TextStyle(
                      color: Colors.orange.shade900,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}

/// A small indicator showing pending sync items.
class SyncPendingIndicator extends ConsumerWidget {
  const SyncPendingIndicator({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncManager = ref.watch(learnerSyncManagerProvider);

    return StreamBuilder<SyncStatusInfo>(
      stream: syncManager.statusStream,
      builder: (context, snapshot) {
        final status = snapshot.data;
        if (status == null || !status.hasPendingData) {
          return const SizedBox.shrink();
        }

        final total = status.pendingEvents + status.pendingSessions;

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.blue.shade100,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (status.state == SyncState.syncing)
                const SizedBox(
                  width: 12,
                  height: 12,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                Icon(Icons.sync, size: 14, color: Colors.blue.shade700),
              const SizedBox(width: 4),
              Text(
                '$total pending',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.blue.shade900,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// A widget that automatically preloads today's plan when mounted.
class PlanPreloader extends ConsumerStatefulWidget {
  const PlanPreloader({
    required this.learnerId,
    required this.child,
    this.onPreloadComplete,
    this.showLoadingIndicator = true,
    super.key,
  });

  final String learnerId;
  final Widget child;
  final void Function(PreloadResult)? onPreloadComplete;
  final bool showLoadingIndicator;

  @override
  ConsumerState<PlanPreloader> createState() => _PlanPreloaderState();
}

class _PlanPreloaderState extends ConsumerState<PlanPreloader> {
  bool _isPreloading = false;
  bool _hasPreloaded = false;

  @override
  void initState() {
    super.initState();
    _preloadIfNeeded();
  }

  @override
  void didUpdateWidget(PlanPreloader oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.learnerId != widget.learnerId) {
      _hasPreloaded = false;
      _preloadIfNeeded();
    }
  }

  Future<void> _preloadIfNeeded() async {
    if (_hasPreloaded || _isPreloading) return;

    final connectivity = ref.read(connectivityServiceProvider);
    if (!connectivity.isOnline) {
      _hasPreloaded = true; // Don't retry if offline
      return;
    }

    setState(() => _isPreloading = true);

    try {
      final syncManager = ref.read(learnerSyncManagerProvider);
      final result = await syncManager.preloadForToday(widget.learnerId);
      widget.onPreloadComplete?.call(result);
    } catch (e) {
      // Silently fail - user can still use cached data
      debugPrint('Preload failed: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isPreloading = false;
          _hasPreloaded = true;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isPreloading && widget.showLoadingIndicator) {
      return Stack(
        children: [
          widget.child,
          const Positioned(
            top: 8,
            right: 8,
            child: SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        ],
      );
    }

    return widget.child;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOKS / EXTENSIONS
// ══════════════════════════════════════════════════════════════════════════════

/// Extension on WidgetRef for convenient offline operations.
extension OfflineRefExtension on WidgetRef {
  /// Record a learner event (queued for sync).
  Future<void> recordLearnerEvent(
    String localSessionId,
    LearnerEventType type,
    Map<String, dynamic> payload,
  ) async {
    final syncManager = read(learnerSyncManagerProvider);
    await syncManager.recordEvent(
      localSessionId,
      LearnerEvent(type: type, payload: payload),
    );
  }

  /// Start a new offline-aware session.
  Future<String> startOfflineSession({
    required String learnerId,
    required String subject,
    SessionType type = SessionType.learning,
  }) async {
    final syncManager = read(learnerSyncManagerProvider);
    return syncManager.startSession(
      learnerId: learnerId,
      subject: subject,
      type: type,
    );
  }

  /// End an offline-aware session.
  Future<void> endOfflineSession(String localSessionId) async {
    final syncManager = read(learnerSyncManagerProvider);
    await syncManager.endSession(localSessionId);
  }

  /// Force a sync attempt.
  Future<SyncResult> syncNow() async {
    final syncManager = read(learnerSyncManagerProvider);
    return syncManager.syncNow();
  }

  /// Check if device is online.
  bool get isOnline {
    final connectivity = read(connectivityServiceProvider);
    return connectivity.isOnline;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LIFECYCLE OBSERVER
// ══════════════════════════════════════════════════════════════════════════════

/// Observer that handles sync on app lifecycle events.
class OfflineLifecycleObserver extends WidgetsBindingObserver {
  OfflineLifecycleObserver({required this.ref});

  final WidgetRef ref;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        // App came to foreground - try to sync
        _trySyncOnResume();
        break;
      case AppLifecycleState.paused:
        // App going to background - no action needed
        break;
      case AppLifecycleState.detached:
      case AppLifecycleState.inactive:
      case AppLifecycleState.hidden:
        break;
    }
  }

  Future<void> _trySyncOnResume() async {
    try {
      final connectivity = ref.read(connectivityServiceProvider);
      if (connectivity.isOnline) {
        final syncManager = ref.read(learnerSyncManagerProvider);
        await syncManager.syncNow();
      }
    } catch (e) {
      debugPrint('Sync on resume failed: $e');
    }
  }
}
