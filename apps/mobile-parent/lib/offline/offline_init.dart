/// Offline Initialization for Parent App
///
/// This module handles initialization of offline services and provides
/// Riverpod provider overrides for the parent app.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart' hide ConnectionState;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

import 'offline_api_clients.dart';

// ══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

/// Initializes offline services for the Parent app.
///
/// Call this before creating the ProviderScope:
/// ```dart
/// void main() async {
///   WidgetsFlutterBinding.ensureInitialized();
///   await initializeOfflineServices();
///   runApp(const ProviderScope(child: ParentApp()));
/// }
/// ```
Future<void> initializeOfflineServices() async {
  // Pre-initialize the database to ensure tables are created
  OfflineDatabase();

  // Start connectivity monitoring
  final connectivity = ConnectivityService();
  await connectivity.initialize();
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

/// Provider for the offline database.
final offlineDatabaseProvider = Provider<OfflineDatabase>((ref) {
  final db = OfflineDatabase();
  ref.onDispose(() => db.closeDatabase());
  return db;
});

/// Provider for connectivity service.
final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  final service = ConnectivityService();
  service.initialize();
  ref.onDispose(() => service.dispose());
  return service;
});

/// Provider for connectivity state stream.
final connectivityStateProvider = StreamProvider<ConnectionState>((ref) {
  final service = ref.watch(connectivityServiceProvider);
  return service.stateStream;
});

/// Provider factory for creating a configured parent sync manager.
///
/// Usage:
/// ```dart
/// final syncManager = ref.watch(
///   configuredParentSyncManagerProvider(dio),
/// );
/// ```
final configuredParentSyncManagerProvider =
    Provider.family<SyncManager, dynamic>((ref, dio) {
  final db = ref.watch(offlineDatabaseProvider);
  final connectivity = ref.watch(connectivityServiceProvider);

  return SyncManager(
    database: db,
    connectivityService: connectivity,
    planApi: ParentPlanApiClient(dio: dio),
    contentApi: ParentContentApiClient(dio: dio),
    sessionApi: ParentSessionApiClient(dio: dio),
    eventApi: ParentEventApiClient(dio: dio),
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// PARENT-SPECIFIC CACHE HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/// Helper for caching parent-specific data locally.
class ParentCacheHelper {
  ParentCacheHelper({required this.database});

  final OfflineDatabase database;

  /// Generate a cache key for parent data.
  String _cacheKey(String learnerId, String dataType) =>
      '$learnerId:$dataType';

  /// Cache learner profiles for offline access.
  Future<void> cacheLearnerProfiles(
    List<Map<String, dynamic>> learners,
  ) async {
    for (final learner in learners) {
      await database.upsertLearner(OfflineLearner(
        learnerId: learner['id'] as String,
        displayName: learner['displayName'] as String,
        gradeBand: learner['gradeBand'] as String,
        avatarUrl: learner['avatarUrl'] as String?,
        preferencesJson: learner['preferences'] != null
            ? jsonEncode(learner['preferences'])
            : null,
        tenantId: learner['tenantId'] as String,
        lastSyncedAt: DateTime.now().millisecondsSinceEpoch,
      ));
    }
  }

  /// Cache progress reports for offline viewing.
  Future<void> cacheProgressReport({
    required String learnerId,
    required Map<String, dynamic> report,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expires =
        DateTime.now().add(const Duration(days: 7)).millisecondsSinceEpoch;

    await database.upsertParentCache(OfflineParentCacheEntry(
      cacheKey: _cacheKey(learnerId, 'progress_report'),
      learnerId: learnerId,
      dataType: 'progress_report',
      jsonPayload: jsonEncode(report),
      cachedAt: now,
      expiresAt: expires,
    ));
  }

  /// Cache weekly summary for offline viewing.
  Future<void> cacheWeeklySummary({
    required String learnerId,
    required Map<String, dynamic> summary,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expires =
        DateTime.now().add(const Duration(days: 7)).millisecondsSinceEpoch;

    await database.upsertParentCache(OfflineParentCacheEntry(
      cacheKey: _cacheKey(learnerId, 'weekly_summary'),
      learnerId: learnerId,
      dataType: 'weekly_summary',
      jsonPayload: jsonEncode(summary),
      cachedAt: now,
      expiresAt: expires,
    ));
  }

  /// Cache baseline results for offline viewing.
  Future<void> cacheBaselineResults({
    required String learnerId,
    required Map<String, dynamic> results,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expires =
        DateTime.now().add(const Duration(days: 30)).millisecondsSinceEpoch;

    await database.upsertParentCache(OfflineParentCacheEntry(
      cacheKey: _cacheKey(learnerId, 'baseline_results'),
      learnerId: learnerId,
      dataType: 'baseline_results',
      jsonPayload: jsonEncode(results),
      cachedAt: now,
      expiresAt: expires,
    ));
  }

  /// Get cached progress report.
  Future<Map<String, dynamic>?> getCachedProgressReport(
    String learnerId,
  ) async {
    final cache = await database.getParentCache(learnerId, 'progress_report');
    if (cache == null) return null;
    return jsonDecode(cache.jsonPayload) as Map<String, dynamic>;
  }

  /// Get cached weekly summary.
  Future<Map<String, dynamic>?> getCachedWeeklySummary(String learnerId) async {
    final cache = await database.getParentCache(learnerId, 'weekly_summary');
    if (cache == null) return null;
    return jsonDecode(cache.jsonPayload) as Map<String, dynamic>;
  }

  /// Get cached baseline results.
  Future<Map<String, dynamic>?> getCachedBaselineResults(
    String learnerId,
  ) async {
    final cache = await database.getParentCache(learnerId, 'baseline_results');
    if (cache == null) return null;
    return jsonDecode(cache.jsonPayload) as Map<String, dynamic>;
  }

  /// Cache homework focus settings.
  Future<void> cacheFocusSettings({
    required String learnerId,
    required Map<String, dynamic> settings,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expires =
        DateTime.now().add(const Duration(days: 1)).millisecondsSinceEpoch;

    await database.upsertParentCache(OfflineParentCacheEntry(
      cacheKey: _cacheKey(learnerId, 'focus_settings'),
      learnerId: learnerId,
      dataType: 'focus_settings',
      jsonPayload: jsonEncode(settings),
      cachedAt: now,
      expiresAt: expires,
    ));
  }

  /// Get cached focus settings.
  Future<Map<String, dynamic>?> getCachedFocusSettings(
    String learnerId,
  ) async {
    final cache = await database.getParentCache(learnerId, 'focus_settings');
    if (cache == null) return null;
    return jsonDecode(cache.jsonPayload) as Map<String, dynamic>;
  }
}

/// Provider for parent cache helper.
final parentCacheHelperProvider = Provider<ParentCacheHelper>((ref) {
  final db = ref.watch(offlineDatabaseProvider);
  return ParentCacheHelper(database: db);
});

// ══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

/// A banner that shows when the device is offline.
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
                    'You\'re offline. Showing cached data.',
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

/// Widget showing when data was last synced.
class LastSyncedIndicator extends StatelessWidget {
  const LastSyncedIndicator({
    super.key,
    required this.lastSyncedAt,
  });

  final DateTime? lastSyncedAt;

  @override
  Widget build(BuildContext context) {
    if (lastSyncedAt == null) return const SizedBox.shrink();

    final difference = DateTime.now().difference(lastSyncedAt!);
    String timeAgo;

    if (difference.inMinutes < 1) {
      timeAgo = 'just now';
    } else if (difference.inMinutes < 60) {
      timeAgo = '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      timeAgo = '${difference.inHours}h ago';
    } else {
      timeAgo = '${difference.inDays}d ago';
    }

    return Text(
      'Updated $timeAgo',
      style: TextStyle(
        color: Colors.grey.shade600,
        fontSize: 12,
      ),
    );
  }
}

/// Widget that shows cached vs live data indicator.
class CachedDataIndicator extends StatelessWidget {
  const CachedDataIndicator({
    super.key,
    this.isCached = false,
  });

  final bool isCached;

  @override
  Widget build(BuildContext context) {
    if (!isCached) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.cached, size: 12, color: Colors.grey.shade600),
          const SizedBox(width: 4),
          Text(
            'Cached',
            style: TextStyle(
              color: Colors.grey.shade600,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}
