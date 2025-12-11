/// Sync Manager Service
///
/// Manages synchronization between local offline storage and server APIs.
/// Handles preloading content, recording events, and syncing when online.
library;

import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import 'offline_database.dart';
import 'offline_tables.dart';
import 'connectivity_service.dart';

// ══════════════════════════════════════════════════════════════════════════════
// MODELS
// ══════════════════════════════════════════════════════════════════════════════

/// Result of a preload operation.
class PreloadResult {
  const PreloadResult({
    required this.success,
    required this.activitiesReady,
    required this.bytesDownloaded,
    this.error,
  });

  final bool success;
  final int activitiesReady;
  final int bytesDownloaded;
  final String? error;

  factory PreloadResult.failure(String error) => PreloadResult(
        success: false,
        activitiesReady: 0,
        bytesDownloaded: 0,
        error: error,
      );
}

/// Result of a sync operation.
class SyncResult {
  SyncResult({
    this.success = false,
    this.sessionsSynced = 0,
    this.sessionsFailed = 0,
    this.eventsSynced = 0,
    this.eventsFailed = 0,
    this.error,
    this.duration = Duration.zero,
    this.offlineDuration,
  });

  bool success;
  int sessionsSynced;
  int sessionsFailed;
  int eventsSynced;
  int eventsFailed;
  String? error;
  Duration duration;
  Duration? offlineDuration;

  factory SyncResult.offline() => SyncResult(
        success: false,
        error: 'Device is offline',
      );

  int get totalSynced => sessionsSynced + eventsSynced;
  int get totalFailed => sessionsFailed + eventsFailed;
}

/// Current sync status for UI display.
class SyncStatusInfo {
  const SyncStatusInfo({
    required this.state,
    this.pendingEvents = 0,
    this.pendingSessions = 0,
    this.lastSyncAt,
    this.lastError,
  });

  final SyncState state;
  final int pendingEvents;
  final int pendingSessions;
  final DateTime? lastSyncAt;
  final String? lastError;

  bool get hasPendingData => pendingEvents > 0 || pendingSessions > 0;
}

/// Sync state enum.
enum SyncState {
  idle,
  syncing,
  offline,
  error,
}

/// A learner event to be recorded.
class LearnerEvent {
  const LearnerEvent({
    required this.type,
    required this.payload,
    this.timestamp,
  });

  final LearnerEventType type;
  final Map<String, dynamic> payload;
  final DateTime? timestamp;

  Map<String, dynamic> toJson() => {
        'type': type.name,
        'payload': payload,
        'timestamp': (timestamp ?? DateTime.now()).toIso8601String(),
      };
}

/// Types of learner events.
enum LearnerEventType {
  learningEvent,
  focusEvent,
  answerEvent,
  completionEvent,
  breakEvent,
  navigationEvent,
}

// ══════════════════════════════════════════════════════════════════════════════
// API INTERFACES (to be implemented by app-specific services)
// ══════════════════════════════════════════════════════════════════════════════

/// Interface for plan API operations.
abstract class PlanApiClient {
  Future<Map<String, dynamic>> generateTodaysPlan(String learnerId);
}

/// Interface for content API operations.
abstract class ContentApiClient {
  Future<List<Map<String, dynamic>>> batchFetchContent(List<String> contentIds);
}

/// Interface for session API operations.
abstract class SessionApiClient {
  Future<Map<String, dynamic>> createSession({
    required String learnerId,
    required String subject,
    required String sessionType,
    required DateTime startedAt,
    required bool offlineOrigin,
    String? localSessionId,
  });

  Future<void> endSession(String sessionId);
}

/// Interface for event API operations.
abstract class EventApiClient {
  Future<void> batchUploadEvents({
    required String sessionId,
    required List<Map<String, dynamic>> events,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC MANAGER
// ══════════════════════════════════════════════════════════════════════════════

/// Manages offline sync operations.
///
/// Key responsibilities:
/// - Pre-fetch content for offline use (preloadForToday)
/// - Record events locally (recordEvent)
/// - Sync data when online (syncNow)
/// - Handle connectivity changes
/// - Resolve conflicts
class SyncManager {
  SyncManager({
    required this.database,
    required this.connectivityService,
    required this.planApi,
    required this.contentApi,
    required this.sessionApi,
    required this.eventApi,
  }) {
    _setupConnectivityListener();
  }

  final OfflineDatabase database;
  final ConnectivityService connectivityService;
  final PlanApiClient planApi;
  final ContentApiClient contentApi;
  final SessionApiClient sessionApi;
  final EventApiClient eventApi;

  final _uuid = const Uuid();

  Timer? _syncDebouncer;
  StreamSubscription? _connectivitySub;
  DateTime? _lastOfflineAt;
  int _syncRetryCount = 0;

  final _statusController = StreamController<SyncStatusInfo>.broadcast();

  /// Stream of sync status updates.
  Stream<SyncStatusInfo> get statusStream => _statusController.stream;

  /// Check if device is online.
  bool get isOnline => connectivityService.isOnline;

  /// Stream of connectivity changes.
  Stream<bool> get connectivityStream =>
      connectivityService.stateStream.map((s) => s == ConnectionState.online);

  /// Get current sync status.
  Future<SyncStatusInfo> getCurrentStatus() async {
    final pendingEvents = await database.getPendingEventCount();
    final pendingSessions = (await database.getSessionsToSync()).length;

    return SyncStatusInfo(
      state: isOnline ? SyncState.idle : SyncState.offline,
      pendingEvents: pendingEvents,
      pendingSessions: pendingSessions,
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRELOAD FOR TODAY
  // ════════════════════════════════════════════════════════════════════════════

  /// Pre-fetch today's plan and required content for offline use.
  ///
  /// This should be called when the app starts or when connectivity is restored.
  /// It fetches the learner's plan and caches all required content locally.
  Future<PreloadResult> preloadForToday(String learnerId) async {
    if (!isOnline) {
      return PreloadResult.failure('Device is offline');
    }

    try {
      // 1. Fetch today's plan from API
      final planJson = await planApi.generateTodaysPlan(learnerId);

      // 2. Extract learner info and save
      await _cacheLearnerFromPlan(learnerId, planJson);

      // 3. Extract content IDs from activities
      final contentIds = _extractContentIds(planJson);

      // 4. Find content not already cached
      final uncachedIds = await database.findUncachedContent(contentIds);

      // 5. Fetch missing content
      int bytesDownloaded = 0;
      if (uncachedIds.isNotEmpty) {
        final contentList = await contentApi.batchFetchContent(uncachedIds);

        // 6. Cache content
        for (final content in contentList) {
          final contentKey = content['contentKey'] as String;
          final jsonPayload = jsonEncode(content);
          bytesDownloaded += jsonPayload.length;

          await database.upsertContent(OfflineContent(
            contentKey: contentKey,
            contentType: content['type']?.toString() ?? 'exercise',
            subject: content['subject']?.toString() ?? '',
            gradeBand: content['gradeBand']?.toString() ?? '',
            jsonPayload: jsonPayload,
            mediaPathsJson: null,
            sizeBytes: jsonPayload.length,
            expiresAt: DateTime.now()
                .add(const Duration(days: 7))
                .millisecondsSinceEpoch,
            createdAt: DateTime.now().millisecondsSinceEpoch,
            lastAccessedAt: DateTime.now().millisecondsSinceEpoch,
          ));
        }
      }

      // 7. Create session skeleton
      final localSessionId = _uuid.v4();
      await database.insertSession(OfflineSession(
        localSessionId: localSessionId,
        serverSessionId: null,
        learnerId: learnerId,
        subject: _extractPrimarySubject(planJson),
        sessionType: SessionType.learning.name,
        status: SyncStatus.pendingSync.name,
        origin: SessionOrigin.online.name,
        startedAt: DateTime.now().millisecondsSinceEpoch,
        endedAt: null,
        planJson: jsonEncode(planJson),
        errorMessage: null,
        retryCount: 0,
        lastUpdatedAt: DateTime.now().millisecondsSinceEpoch,
      ));

      return PreloadResult(
        success: true,
        activitiesReady: contentIds.length,
        bytesDownloaded: bytesDownloaded,
      );
    } catch (e) {
      return PreloadResult.failure(e.toString());
    }
  }

  Future<void> _cacheLearnerFromPlan(
      String learnerId, Map<String, dynamic> plan) async {
    final learnerSnapshot = plan['learnerSnapshot'] as Map<String, dynamic>?;

    await database.upsertLearner(OfflineLearner(
      learnerId: learnerId,
      displayName:
          learnerSnapshot?['displayName']?.toString() ?? 'Unknown Learner',
      gradeBand: learnerSnapshot?['gradeBand']?.toString() ?? 'K-2',
      avatarUrl: learnerSnapshot?['avatarUrl']?.toString(),
      preferencesJson: learnerSnapshot?['preferences'] != null
          ? jsonEncode(learnerSnapshot!['preferences'])
          : null,
      tenantId: learnerSnapshot?['tenantId']?.toString() ?? '',
      lastSyncedAt: DateTime.now().millisecondsSinceEpoch,
    ));
  }

  List<String> _extractContentIds(Map<String, dynamic> plan) {
    final activities = plan['activities'] as List<dynamic>? ?? [];
    return activities
        .map((a) => a['contentId']?.toString())
        .whereType<String>()
        .toList();
  }

  String _extractPrimarySubject(Map<String, dynamic> plan) {
    final activities = plan['activities'] as List<dynamic>? ?? [];
    if (activities.isEmpty) return 'GENERAL';

    // Count subjects and return most common
    final subjects = <String, int>{};
    for (final a in activities) {
      final subject = a['domain']?.toString() ?? 'GENERAL';
      subjects[subject] = (subjects[subject] ?? 0) + 1;
    }

    return subjects.entries
        .reduce((a, b) => a.value > b.value ? a : b)
        .key;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RECORD EVENT
  // ════════════════════════════════════════════════════════════════════════════

  /// Record a learner event locally.
  ///
  /// Events are stored with PENDING_SYNC status and will be uploaded
  /// when connectivity is available.
  Future<void> recordEvent(String localSessionId, LearnerEvent event) async {
    final sequenceNum = await database.getNextSequenceNum(localSessionId);
    final pendingStatus = SyncStatus.pendingSync.name;

    await database.insertEvent(OfflineEventsCompanion.insert(
      localSessionId: localSessionId,
      eventType: event.type.name,
      eventJson: jsonEncode(event.toJson()),
      status: Value(pendingStatus),
      sequenceNum: sequenceNum,
      createdAt: DateTime.now().millisecondsSinceEpoch,
    ));

    // If online, trigger debounced sync
    if (isOnline) {
      _scheduleSyncDebounced();
    }

    // Update status
    _emitStatus();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // START / END SESSION
  // ════════════════════════════════════════════════════════════════════════════

  /// Start a new offline session.
  ///
  /// Creates a local session record that will be synced when online.
  Future<String> startSession({
    required String learnerId,
    required String subject,
    SessionType type = SessionType.learning,
  }) async {
    final localSessionId = _uuid.v4();
    final origin = isOnline ? SessionOrigin.online : SessionOrigin.offline;

    await database.insertSession(OfflineSession(
      localSessionId: localSessionId,
      serverSessionId: null,
      learnerId: learnerId,
      subject: subject,
      sessionType: type.name,
      status: SyncStatus.pendingSync.name,
      origin: origin.name,
      startedAt: DateTime.now().millisecondsSinceEpoch,
      endedAt: null,
      planJson: null,
      errorMessage: null,
      retryCount: 0,
      lastUpdatedAt: DateTime.now().millisecondsSinceEpoch,
    ));

    // Try to create on server if online
    if (isOnline) {
      _scheduleSyncDebounced();
    }

    return localSessionId;
  }

  /// End a session.
  Future<void> endSession(String localSessionId) async {
    await database.endSession(localSessionId);

    // Trigger sync to upload end event
    if (isOnline) {
      _scheduleSyncDebounced();
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SYNC NOW
  // ════════════════════════════════════════════════════════════════════════════

  /// Trigger immediate sync attempt.
  ///
  /// Uploads all pending sessions and events to the server.
  /// Uses batch operations for efficiency.
  Future<SyncResult> syncNow({bool force = false}) async {
    if (!isOnline && !force) {
      return SyncResult.offline();
    }

    final startTime = DateTime.now();
    final result = SyncResult();

    _emitStatus(state: SyncState.syncing);

    try {
      // 1. Sync sessions without server IDs first
      await _syncPendingSessions(result);

      // 2. Sync pending events in batches
      await _syncPendingEvents(result);

      result.success = result.sessionsFailed == 0 && result.eventsFailed == 0;
      result.duration = DateTime.now().difference(startTime);

      if (_lastOfflineAt != null) {
        result.offlineDuration = DateTime.now().difference(_lastOfflineAt!);
        _lastOfflineAt = null;
      }

      // Reset retry count on success
      if (result.success) {
        _syncRetryCount = 0;
      }
    } catch (e) {
      result.success = false;
      result.error = e.toString();
    }

    _emitStatus(
      state: result.success ? SyncState.idle : SyncState.error,
      lastError: result.error,
    );

    return result;
  }

  Future<void> _syncPendingSessions(SyncResult result) async {
    final pendingSessions = await database.getSessionsToSync();

    for (final session in pendingSessions) {
      if (session.serverSessionId != null) continue;

      try {
        final serverSession = await sessionApi.createSession(
          learnerId: session.learnerId,
          subject: session.subject,
          sessionType: session.sessionType,
          startedAt:
              DateTime.fromMillisecondsSinceEpoch(session.startedAt),
          offlineOrigin: session.origin == SessionOrigin.offline.name,
          localSessionId: session.localSessionId,
        );

        await database.updateSessionServerIds(
          localSessionId: session.localSessionId,
          serverSessionId: serverSession['id'] as String,
        );

        result.sessionsSynced++;
      } catch (e) {
        // Handle conflict: session already exists
        if (_isConflictError(e)) {
          await _handleSessionConflict(session, e);
          result.sessionsSynced++;
        } else {
          await database.markSessionFailed(
              session.localSessionId, e.toString());
          result.sessionsFailed++;
        }
      }
    }
  }

  Future<void> _syncPendingEvents(SyncResult result) async {
    final pendingEvents = await database.getEventsToSync(limit: 100);
    if (pendingEvents.isEmpty) return;

    // Group events by session
    final bySession = <String, List<OfflineEvent>>{};
    for (final event in pendingEvents) {
      bySession.putIfAbsent(event.localSessionId, () => []).add(event);
    }

    for (final entry in bySession.entries) {
      final session = await database.getSession(entry.key);
      if (session?.serverSessionId == null) {
        // Session not synced yet, skip events
        continue;
      }

      try {
        final serverEvents = entry.value.map((e) {
          final payload = jsonDecode(e.eventJson) as Map<String, dynamic>;
          final event = <String, dynamic>{
            'localEventId': e.id.toString(),
          };
          event.addAll(payload);
          return event;
        }).toList();

        await eventApi.batchUploadEvents(
          sessionId: session!.serverSessionId!,
          events: serverEvents,
        );

        await database.markEventsSynced(entry.value.map((e) => e.id).toList());
        result.eventsSynced += entry.value.length;
      } catch (e) {
        await database.markEventsFailed(
          entry.value.map((e) => e.id).toList(),
          e.toString(),
        );
        result.eventsFailed += entry.value.length;
      }
    }
  }

  bool _isConflictError(dynamic error) {
    final errorStr = error.toString().toLowerCase();
    return errorStr.contains('409') || errorStr.contains('conflict');
  }

  Future<void> _handleSessionConflict(
      OfflineSession session, dynamic error) async {
    // For MVP: just mark as synced and log
    // The server will deduplicate events by localEventId
    await database.updateSessionServerIds(
      localSessionId: session.localSessionId,
      serverSessionId: session.localSessionId, // Use local as server ID
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CONNECTIVITY HANDLING
  // ════════════════════════════════════════════════════════════════════════════

  void _setupConnectivityListener() {
    _connectivitySub = connectivityService.stateStream.distinct().listen((state) {
      if (state == ConnectionState.online) {
        // Came back online
        _scheduleSyncWithBackoff(_syncRetryCount);
      } else if (state == ConnectionState.offline) {
        // Went offline
        _lastOfflineAt = DateTime.now();
        _emitStatus(state: SyncState.offline);
      }
    });
  }

  void _scheduleSyncDebounced({Duration delay = const Duration(seconds: 1)}) {
    _syncDebouncer?.cancel();
    _syncDebouncer = Timer(delay, () => syncNow());
  }

  void _scheduleSyncWithBackoff(int attempt) {
    final delaySeconds = math.min(30, math.pow(2, attempt).toInt());
    _scheduleSyncDebounced(delay: Duration(seconds: delaySeconds));
  }

  Future<void> _emitStatus({
    SyncState? state,
    String? lastError,
  }) async {
    final pendingEvents = await database.getPendingEventCount();
    final pendingSessions = (await database.getSessionsToSync()).length;

    _statusController.add(SyncStatusInfo(
      state: state ?? (isOnline ? SyncState.idle : SyncState.offline),
      pendingEvents: pendingEvents,
      pendingSessions: pendingSessions,
      lastSyncAt: DateTime.now(),
      lastError: lastError,
    ));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CACHE MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /// Prune expired and oversized cache entries.
  Future<void> pruneCache({int maxCacheBytes = 100 * 1024 * 1024}) async {
    // 1. Delete expired content
    await database.deleteExpiredContent(DateTime.now());

    // 2. Check total size
    final totalSize = await database.getTotalCacheSize();
    if (totalSize > maxCacheBytes) {
      final keysToEvict = await database.getLRUContentKeys(
        targetBytes: totalSize - maxCacheBytes,
      );
      await database.deleteContentByKeys(keysToEvict);
    }

    // 3. Delete old synced events
    await database.deleteOldSyncedEvents(
      DateTime.now().subtract(const Duration(days: 7)),
    );
  }

  /// Dispose resources.
  void dispose() {
    _syncDebouncer?.cancel();
    _connectivitySub?.cancel();
    _statusController.close();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RIVERPOD PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

/// Provider for the offline database.
final offlineDatabaseProvider = Provider<OfflineDatabase>((ref) {
  final db = OfflineDatabase();
  ref.onDispose(() => db.close());
  return db;
});

/// Provider for the connectivity service.
final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  final service = ConnectivityService();
  ref.onDispose(() => service.dispose());
  return service;
});

/// Provider for sync status stream.
final syncStatusProvider = StreamProvider<SyncStatusInfo>((ref) {
  final syncManager = ref.watch(syncManagerProvider);
  return syncManager.statusStream;
});

/// Provider for connectivity state.
final isOnlineProvider = Provider<bool>((ref) {
  final connectivity = ref.watch(connectivityServiceProvider);
  return connectivity.isOnline;
});

/// Provider for the sync manager (must be overridden with API clients).
final syncManagerProvider = Provider<SyncManager>((ref) {
  throw UnimplementedError(
    'syncManagerProvider must be overridden with app-specific API clients',
  );
});
