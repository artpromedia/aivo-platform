/// Offline database using Drift (SQLite).
///
/// This is the main database class that provides access to all offline
/// tables and common query methods.
library;

import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

import 'offline_tables.dart';

part 'offline_database.g.dart';

/// The main offline database for Aivo Flutter apps.
///
/// This database provides local storage for:
/// - Learner profiles
/// - Sessions and events
/// - Cached content
/// - Sync queue
/// - Teacher attendance/notes
/// - Parent summaries
@DriftDatabase(
  tables: [
    OfflineLearners,
    OfflineSessions,
    OfflineEvents,
    OfflineContentCache,
    OfflineSyncQueue,
    OfflineAttendanceRecords,
    OfflineTeacherNotes,
    OfflineParentCache,
  ],
)
class OfflineDatabase extends _$OfflineDatabase {
  OfflineDatabase() : super(_openConnection());

  /// For testing with in-memory database.
  OfflineDatabase.forTesting(super.e);

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (Migrator m) async {
        await m.createAll();
      },
      onUpgrade: (Migrator m, int from, int to) async {
        // Future migrations go here
      },
    );
  }

  /// Close the database connection.
  ///
  /// This is a convenience wrapper around the inherited close method
  /// to ensure it's visible in the public API.
  Future<void> closeDatabase() async {
    await close();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LEARNER OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get a learner by ID.
  Future<OfflineLearner?> getLearner(String learnerId) {
    return (select(offlineLearners)
          ..where((t) => t.learnerId.equals(learnerId)))
        .getSingleOrNull();
  }

  /// Upsert a learner profile.
  Future<void> upsertLearner(OfflineLearner learner) {
    return into(offlineLearners).insertOnConflictUpdate(learner);
  }

  /// Get all cached learners.
  Future<List<OfflineLearner>> getAllLearners() {
    return select(offlineLearners).get();
  }

  /// Delete a learner and all associated data.
  Future<void> deleteLearner(String learnerId) async {
    await transaction(() async {
      // Delete events for learner's sessions
      final sessions = await (select(offlineSessions)
            ..where((t) => t.learnerId.equals(learnerId)))
          .get();

      for (final session in sessions) {
        await (delete(offlineEvents)
              ..where((t) => t.localSessionId.equals(session.localSessionId)))
            .go();
      }

      // Delete sessions
      await (delete(offlineSessions)
            ..where((t) => t.learnerId.equals(learnerId)))
          .go();

      // Delete learner
      await (delete(offlineLearners)
            ..where((t) => t.learnerId.equals(learnerId)))
          .go();
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SESSION OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Create a new offline session.
  Future<void> insertSession(OfflineSession session) {
    return into(offlineSessions).insert(session);
  }

  /// Get a session by local ID.
  Future<OfflineSession?> getSession(String localSessionId) {
    return (select(offlineSessions)
          ..where((t) => t.localSessionId.equals(localSessionId)))
        .getSingleOrNull();
  }

  /// Get sessions that need to be synced.
  Future<List<OfflineSession>> getSessionsToSync() {
    return (select(offlineSessions)
          ..where((t) => t.status.equals(SyncStatus.pendingSync.name))
          ..orderBy([(t) => OrderingTerm.asc(t.startedAt)]))
        .get();
  }

  /// Get active (not ended) session for a learner.
  Future<OfflineSession?> getActiveSession(String learnerId) {
    return (select(offlineSessions)
          ..where((t) =>
              t.learnerId.equals(learnerId) & t.endedAt.isNull())
          ..orderBy([(t) => OrderingTerm.desc(t.startedAt)])
          ..limit(1))
        .getSingleOrNull();
  }

  /// Update session with server ID after sync.
  Future<void> updateSessionServerIds({
    required String localSessionId,
    required String serverSessionId,
  }) {
    return (update(offlineSessions)
          ..where((t) => t.localSessionId.equals(localSessionId)))
        .write(OfflineSessionsCompanion(
      serverSessionId: Value(serverSessionId),
      status: Value(SyncStatus.synchronized.name),
      lastUpdatedAt: Value(DateTime.now().millisecondsSinceEpoch),
    ));
  }

  /// Mark session as failed.
  Future<void> markSessionFailed(String localSessionId, String error) async {
    // First get current retry count
    final session = await (select(offlineSessions)
          ..where((t) => t.localSessionId.equals(localSessionId)))
        .getSingleOrNull();
    final currentRetry = session?.retryCount ?? 0;

    await (update(offlineSessions)
          ..where((t) => t.localSessionId.equals(localSessionId)))
        .write(OfflineSessionsCompanion(
      status: Value(SyncStatus.failed.name),
      errorMessage: Value(error),
      retryCount: Value(currentRetry + 1),
      lastUpdatedAt: Value(DateTime.now().millisecondsSinceEpoch),
    ));
  }

  /// End a session.
  Future<void> endSession(String localSessionId) {
    return (update(offlineSessions)
          ..where((t) => t.localSessionId.equals(localSessionId)))
        .write(OfflineSessionsCompanion(
      endedAt: Value(DateTime.now().millisecondsSinceEpoch),
      lastUpdatedAt: Value(DateTime.now().millisecondsSinceEpoch),
    ));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EVENT OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Insert a new event.
  Future<int> insertEvent(OfflineEventsCompanion event) {
    return into(offlineEvents).insert(event);
  }

  /// Get events that need to be synced.
  Future<List<OfflineEvent>> getEventsToSync({int limit = 100}) {
    return (select(offlineEvents)
          ..where((t) => t.status.equals(SyncStatus.pendingSync.name))
          ..orderBy([
            (t) => OrderingTerm.asc(t.localSessionId),
            (t) => OrderingTerm.asc(t.sequenceNum),
          ])
          ..limit(limit))
        .get();
  }

  /// Get the next sequence number for a session.
  Future<int> getNextSequenceNum(String localSessionId) async {
    final result = await customSelect(
      'SELECT MAX(sequence_num) as max_seq FROM offline_events WHERE local_session_id = ?',
      variables: [Variable.withString(localSessionId)],
    ).getSingleOrNull();

    final maxSeq = result?.read<int?>('max_seq');
    return (maxSeq ?? 0) + 1;
  }

  /// Mark events as synced.
  Future<void> markEventsSynced(List<int> eventIds) {
    final syncedStatus = SyncStatus.synchronized.name;
    return (update(offlineEvents)..where((t) => t.id.isIn(eventIds))).write(
      OfflineEventsCompanion(
        status: Value(syncedStatus),
        syncedAt: Value(DateTime.now().millisecondsSinceEpoch),
      ),
    );
  }

  /// Mark events as failed.
  Future<void> markEventsFailed(List<int> eventIds, String error) {
    final failedStatus = SyncStatus.failed.name;
    return (update(offlineEvents)..where((t) => t.id.isIn(eventIds))).write(
      OfflineEventsCompanion(
        status: Value(failedStatus),
        errorMessage: Value(error),
      ),
    );
  }

  /// Get pending event count.
  Future<int> getPendingEventCount() async {
    final result = await customSelect(
      'SELECT COUNT(*) as cnt FROM offline_events WHERE status = ?',
      variables: [Variable.withString(SyncStatus.pendingSync.name)],
    ).getSingle();

    return result.read<int>('cnt');
  }

  /// Delete old synced events.
  Future<int> deleteOldSyncedEvents(DateTime olderThan) {
    return (delete(offlineEvents)
          ..where((t) =>
              t.status.equals(SyncStatus.synchronized.name) &
              t.syncedAt.isSmallerThanValue(olderThan.millisecondsSinceEpoch)))
        .go();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CONTENT CACHE OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get cached content by key.
  Future<OfflineContent?> getContent(String contentKey) async {
    final content = await (select(offlineContentCache)
          ..where((t) => t.contentKey.equals(contentKey)))
        .getSingleOrNull();

    if (content != null) {
      // Update last accessed time
      await (update(offlineContentCache)
            ..where((t) => t.contentKey.equals(contentKey)))
          .write(OfflineContentCacheCompanion(
        lastAccessedAt: Value(DateTime.now().millisecondsSinceEpoch),
      ));
    }

    return content;
  }

  /// Upsert cached content.
  Future<void> upsertContent(OfflineContent content) {
    return into(offlineContentCache).insertOnConflictUpdate(content);
  }

  /// Find content keys that are not cached.
  Future<List<String>> findUncachedContent(List<String> contentKeys) async {
    final cached = await (select(offlineContentCache)
          ..where((t) => t.contentKey.isIn(contentKeys)))
        .get();

    final cachedKeys = cached.map((c) => c.contentKey).toSet();
    return contentKeys.where((k) => !cachedKeys.contains(k)).toList();
  }

  /// Delete expired content.
  Future<int> deleteExpiredContent(DateTime now) {
    return (delete(offlineContentCache)
          ..where((t) => t.expiresAt.isSmallerThanValue(now.millisecondsSinceEpoch)))
        .go();
  }

  /// Get total cache size in bytes.
  Future<int> getTotalCacheSize() async {
    final result = await customSelect(
      'SELECT SUM(size_bytes) as total FROM offline_content_cache',
    ).getSingle();

    return result.read<int?>('total') ?? 0;
  }

  /// Get LRU content keys for eviction.
  Future<List<String>> getLRUContentKeys({required int targetBytes}) async {
    final results = await customSelect(
      '''
      SELECT content_key, size_bytes 
      FROM offline_content_cache 
      ORDER BY last_accessed_at ASC
      ''',
    ).get();

    final keysToEvict = <String>[];
    var bytesToEvict = 0;

    for (final row in results) {
      if (bytesToEvict >= targetBytes) break;
      keysToEvict.add(row.read<String>('content_key'));
      bytesToEvict += row.read<int>('size_bytes');
    }

    return keysToEvict;
  }

  /// Delete content by keys.
  Future<int> deleteContentByKeys(List<String> keys) {
    return (delete(offlineContentCache)
          ..where((t) => t.contentKey.isIn(keys)))
        .go();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SYNC QUEUE OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Add an entry to the sync queue.
  Future<int> enqueueSyncOperation(OfflineSyncQueueCompanion entry) {
    return into(offlineSyncQueue).insert(entry);
  }

  /// Get next pending sync operations.
  Future<List<OfflineSyncQueueEntry>> getNextSyncOperations({int limit = 10}) {
    return (select(offlineSyncQueue)
          ..where((t) => t.status.equals('pending'))
          ..orderBy([
            (t) => OrderingTerm.asc(t.priority),
            (t) => OrderingTerm.asc(t.createdAt),
          ])
          ..limit(limit))
        .get();
  }

  /// Mark sync operation as done.
  Future<void> markSyncDone(int id) {
    return (update(offlineSyncQueue)..where((t) => t.id.equals(id))).write(
      const OfflineSyncQueueCompanion(status: Value('done')),
    );
  }

  /// Mark sync operation as failed.
  Future<void> markSyncFailed(int id, String error) async {
    // First get current retry count
    final item = await (select(offlineSyncQueue)
          ..where((t) => t.id.equals(id)))
        .getSingleOrNull();
    final currentRetry = item?.retryCount ?? 0;

    await (update(offlineSyncQueue)..where((t) => t.id.equals(id))).write(
      OfflineSyncQueueCompanion(
        status: const Value('failed'),
        errorMessage: Value(error),
        retryCount: Value(currentRetry + 1),
        lastAttemptAt: Value(DateTime.now().millisecondsSinceEpoch),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TEACHER APP OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Record attendance.
  Future<int> recordAttendance(OfflineAttendanceRecordsCompanion attendance) {
    return into(offlineAttendanceRecords).insert(attendance);
  }

  /// Get pending attendance records.
  Future<List<OfflineAttendance>> getPendingAttendance() {
    return (select(offlineAttendanceRecords)
          ..where((t) => t.syncStatus.equals(SyncStatus.pendingSync.name)))
        .get();
  }

  /// Mark attendance as synced.
  Future<void> markAttendanceSynced(List<int> ids) {
    return (update(offlineAttendanceRecords)..where((t) => t.id.isIn(ids)))
        .write(
      OfflineAttendanceRecordsCompanion(
        syncStatus: Value(SyncStatus.synchronized.name),
      ),
    );
  }

  /// Create a teacher note.
  Future<void> insertTeacherNote(OfflineTeacherNote note) {
    return into(offlineTeacherNotes).insert(note);
  }

  /// Get pending teacher notes.
  Future<List<OfflineTeacherNote>> getPendingTeacherNotes() {
    return (select(offlineTeacherNotes)
          ..where((t) => t.syncStatus.equals(SyncStatus.pendingSync.name)))
        .get();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PARENT APP OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get cached parent data.
  Future<OfflineParentCacheEntry?> getParentCache(
      String learnerId, String dataType) {
    return (select(offlineParentCache)
          ..where((t) =>
              t.learnerId.equals(learnerId) & t.dataType.equals(dataType)))
        .getSingleOrNull();
  }

  /// Upsert parent cache.
  Future<void> upsertParentCache(OfflineParentCacheEntry cache) {
    return into(offlineParentCache).insertOnConflictUpdate(cache);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SYNC STATE OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Key for storing sync state in the sync queue table.
  static const _syncStateKey = '__sync_state__';

  /// Get sync state as JSON.
  Future<Map<String, dynamic>?> getSyncStateJson() async {
    final result = await (select(offlineSyncQueue)
          ..where((t) => t.operationType.equals(_syncStateKey))
          ..limit(1))
        .getSingleOrNull();

    if (result == null) return null;
    
    // Parse the simple key=value format
    try {
      final pairs = result.payloadJson.split(',');
      final map = <String, dynamic>{};
      for (final pair in pairs) {
        final parts = pair.split('=');
        if (parts.length == 2) {
          final key = parts[0].trim();
          final value = parts[1].trim();
          // Try to parse as int first, then keep as string
          map[key] = int.tryParse(value) ?? value;
        }
      }
      return map.isEmpty ? null : map;
    } catch (_) {
      return null;
    }
  }

  /// Save sync state as JSON.
  Future<void> saveSyncStateJson(Map<String, dynamic> state) async {
    final payload = state.entries
        .where((e) => e.value != null)
        .map((e) => '${e.key}=${e.value}')
        .join(',');
    
    final entry = OfflineSyncQueueCompanion(
      operationType: const Value(_syncStateKey),
      payloadJson: Value(payload),
      status: const Value('active'),
      createdAt: Value(DateTime.now().millisecondsSinceEpoch),
    );

    // Delete old state and insert new
    await (delete(offlineSyncQueue)
          ..where((t) => t.operationType.equals(_syncStateKey)))
        .go();
    await into(offlineSyncQueue).insert(entry);
  }

  /// Reset session retry count.
  Future<void> resetSessionRetryCount(String localSessionId) {
    return (update(offlineSessions)
          ..where((t) => t.localSessionId.equals(localSessionId)))
        .write(const OfflineSessionsCompanion(
      retryCount: Value(0),
      errorMessage: Value(null),
    ));
  }

  /// Increment session retry count.
  Future<void> incrementSessionRetryCount(String localSessionId) async {
    final session = await getSession(localSessionId);
    final currentCount = session?.retryCount ?? 0;
    
    await (update(offlineSessions)
          ..where((t) => t.localSessionId.equals(localSessionId)))
        .write(OfflineSessionsCompanion(
      retryCount: Value(currentCount + 1),
      lastUpdatedAt: Value(DateTime.now().millisecondsSinceEpoch),
    ));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MAINTENANCE OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Clear all data (for logout).
  Future<void> clearAllData() async {
    await transaction(() async {
      await delete(offlineEvents).go();
      await delete(offlineSessions).go();
      await delete(offlineLearners).go();
      await delete(offlineContentCache).go();
      await delete(offlineSyncQueue).go();
      await delete(offlineAttendanceRecords).go();
      await delete(offlineTeacherNotes).go();
      await delete(offlineParentCache).go();
    });
  }

  /// Get database statistics.
  Future<Map<String, int>> getDatabaseStats() async {
    final stats = <String, int>{};

    stats['learners'] =
        (await customSelect('SELECT COUNT(*) as c FROM offline_learners')
                .getSingle())
            .read('c');
    stats['sessions'] =
        (await customSelect('SELECT COUNT(*) as c FROM offline_sessions')
                .getSingle())
            .read('c');
    stats['events'] =
        (await customSelect('SELECT COUNT(*) as c FROM offline_events')
                .getSingle())
            .read('c');
    stats['pendingEvents'] = await getPendingEventCount();
    stats['cacheSize'] = await getTotalCacheSize();

    return stats;
  }
}

/// Opens the database connection.
LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'aivo_offline.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
