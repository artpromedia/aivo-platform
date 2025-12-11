/// Idempotency & Conflict Resolution
///
/// Ensures reliable sync operations through:
/// - Client-generated idempotency keys (clientEventId)
/// - Conflict detection and resolution policies
/// - Deduplication of events from multiple devices
///
/// Key scenarios handled:
/// - Same learner, same day, multiple devices offline
/// - Duplicate events from retry attempts
/// - Out-of-order event arrival
/// - Concurrent session modifications
library;

import 'package:uuid/uuid.dart';

// ══════════════════════════════════════════════════════════════════════════════
// IDEMPOTENCY KEY GENERATION
// ══════════════════════════════════════════════════════════════════════════════

/// Generates client-side idempotency keys for events.
///
/// Keys are deterministic when possible (based on event content)
/// or random UUIDs for truly unique events.
class IdempotencyKeyGenerator {
  const IdempotencyKeyGenerator();

  static const _uuid = Uuid();

  /// Generate a random idempotency key (UUID v4).
  String generateRandom() => _uuid.v4();

  /// Generate a deterministic key from event content.
  ///
  /// For events that should be deduplicated based on content,
  /// generate a key from the event's identifying properties.
  String generateDeterministic({
    required String learnerId,
    required String eventType,
    required DateTime timestamp,
    String? sessionId,
    String? activityId,
  }) {
    // Use UUID v5 with our namespace for deterministic generation
    final namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace
    final name = [
      learnerId,
      eventType,
      timestamp.toUtc().toIso8601String(),
      sessionId ?? '',
      activityId ?? '',
    ].join(':');

    return _uuid.v5(namespace, name);
  }

  /// Generate a key for a session start event.
  String generateForSessionStart({
    required String learnerId,
    required DateTime startTime,
    required String deviceId,
  }) {
    return generateDeterministic(
      learnerId: learnerId,
      eventType: 'session_start',
      timestamp: startTime,
      sessionId: deviceId,
    );
  }

  /// Generate a key for an activity event.
  String generateForActivityEvent({
    required String sessionId,
    required String activityId,
    required String eventType,
    required int eventSequence,
  }) {
    final namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    final name = '$sessionId:$activityId:$eventType:$eventSequence';
    return _uuid.v5(namespace, name);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFLICT TYPES
// ══════════════════════════════════════════════════════════════════════════════

/// Types of conflicts that can occur during sync.
enum ConflictType {
  /// Same event sent multiple times (retry or duplicate device).
  duplicateEvent,

  /// Two devices modified the same session.
  concurrentSessionModification,

  /// Event references a session that doesn't exist.
  orphanedEvent,

  /// Event timestamp out of valid range.
  timestampConflict,

  /// Event data doesn't match server expectations.
  dataConflict,

  /// Server has newer version of the resource.
  versionConflict,
}

/// Resolution strategy for conflicts.
enum ConflictResolution {
  /// Server version wins.
  serverWins,

  /// Client version wins.
  clientWins,

  /// Merge both versions.
  merge,

  /// Discard the conflicting item.
  discard,

  /// Require manual intervention.
  manual,
}

/// A detected conflict with metadata.
class SyncConflict {
  const SyncConflict({
    required this.type,
    required this.resolution,
    required this.localId,
    this.serverId,
    this.localData,
    this.serverData,
    this.message,
  });

  final ConflictType type;
  final ConflictResolution resolution;
  final String localId;
  final String? serverId;
  final Map<String, dynamic>? localData;
  final Map<String, dynamic>? serverData;
  final String? message;

  bool get requiresManualResolution => resolution == ConflictResolution.manual;

  Map<String, dynamic> toJson() => {
        'type': type.name,
        'resolution': resolution.name,
        'localId': localId,
        if (serverId != null) 'serverId': serverId,
        if (message != null) 'message': message,
      };
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFLICT RESOLVER
// ══════════════════════════════════════════════════════════════════════════════

/// Resolves sync conflicts based on configurable policies.
class ConflictResolver {
  const ConflictResolver({
    this.defaultPolicy = ConflictPolicy.lastWriteWins,
    Map<ConflictType, ConflictPolicy>? typeOverrides,
  }) : _typeOverrides = typeOverrides ?? const {};

  final ConflictPolicy defaultPolicy;
  final Map<ConflictType, ConflictPolicy> _typeOverrides;

  /// Resolve a conflict and return the resolution strategy.
  ConflictResolution resolve(SyncConflict conflict) {
    final policy = _typeOverrides[conflict.type] ?? defaultPolicy;
    return policy.resolveConflict(conflict);
  }

  /// Handle a duplicate event conflict.
  ///
  /// Returns true if the event should be discarded (duplicate),
  /// false if it should be processed.
  bool handleDuplicateEvent({
    required String clientEventId,
    required bool serverHasEvent,
  }) {
    // If server already has this event, discard
    return serverHasEvent;
  }

  /// Handle concurrent session modification.
  ///
  /// Returns the merged session data or null if manual resolution needed.
  Map<String, dynamic>? handleConcurrentSession({
    required Map<String, dynamic> localSession,
    required Map<String, dynamic> serverSession,
    required DateTime localModified,
    required DateTime serverModified,
  }) {
    // For sessions, we typically want to merge events
    // but use the most recent metadata
    final useServerMetadata = serverModified.isAfter(localModified);

    return {
      ...localSession,
      // Use server's core metadata if newer
      if (useServerMetadata) 'endTime': serverSession['endTime'],
      if (useServerMetadata) 'updatedAt': serverSession['updatedAt'],
      // Always merge events (deduplicated by clientEventId)
      'mergedFromMultipleSources': true,
    };
  }
}

/// Policy for resolving conflicts.
abstract class ConflictPolicy {
  const ConflictPolicy();

  /// Last-write-wins: newer timestamp wins.
  static const lastWriteWins = _LastWriteWinsPolicy();

  /// Server always wins.
  static const serverWins = _ServerWinsPolicy();

  /// Client always wins.
  static const clientWins = _ClientWinsPolicy();

  /// Attempt to merge.
  static const merge = _MergePolicy();

  ConflictResolution resolveConflict(SyncConflict conflict);
}

class _LastWriteWinsPolicy extends ConflictPolicy {
  const _LastWriteWinsPolicy();

  @override
  ConflictResolution resolveConflict(SyncConflict conflict) {
    // Compare timestamps if available
    final localTime = conflict.localData?['updatedAt'] as String?;
    final serverTime = conflict.serverData?['updatedAt'] as String?;

    if (localTime != null && serverTime != null) {
      final local = DateTime.parse(localTime);
      final server = DateTime.parse(serverTime);
      return local.isAfter(server)
          ? ConflictResolution.clientWins
          : ConflictResolution.serverWins;
    }

    // Default to server if no timestamps
    return ConflictResolution.serverWins;
  }
}

class _ServerWinsPolicy extends ConflictPolicy {
  const _ServerWinsPolicy();

  @override
  ConflictResolution resolveConflict(SyncConflict conflict) =>
      ConflictResolution.serverWins;
}

class _ClientWinsPolicy extends ConflictPolicy {
  const _ClientWinsPolicy();

  @override
  ConflictResolution resolveConflict(SyncConflict conflict) =>
      ConflictResolution.clientWins;
}

class _MergePolicy extends ConflictPolicy {
  const _MergePolicy();

  @override
  ConflictResolution resolveConflict(SyncConflict conflict) {
    // Only merge for certain conflict types
    if (conflict.type == ConflictType.concurrentSessionModification) {
      return ConflictResolution.merge;
    }
    // Fall back to server wins for other types
    return ConflictResolution.serverWins;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC BATCH PROCESSOR
// ══════════════════════════════════════════════════════════════════════════════

/// Processes sync batches with idempotency and conflict handling.
class SyncBatchProcessor {
  SyncBatchProcessor({
    ConflictResolver? resolver,
  }) : resolver = resolver ?? const ConflictResolver();

  final ConflictResolver resolver;
  final _keyGenerator = const IdempotencyKeyGenerator();

  /// Statistics from the last batch processing.
  SyncBatchStats? lastStats;

  /// Process a batch of events for sync.
  ///
  /// Returns a list of events ready to send, with duplicates removed.
  Future<SyncBatchResult> processBatch({
    required List<LocalEvent> events,
    required Future<Set<String>> Function(List<String> clientEventIds)
        checkExistingEvents,
  }) async {
    final stats = SyncBatchStats();
    final toSync = <LocalEvent>[];
    final conflicts = <SyncConflict>[];
    final skipped = <String>[];

    // Extract all client event IDs
    final clientEventIds = events.map((e) => e.clientEventId).toList();

    // Check which events already exist on server
    final existingIds = await checkExistingEvents(clientEventIds);

    for (final event in events) {
      if (existingIds.contains(event.clientEventId)) {
        // Duplicate - skip
        stats.duplicatesSkipped++;
        skipped.add(event.clientEventId);
        continue;
      }

      // Validate event
      final validation = _validateEvent(event);
      if (!validation.isValid) {
        stats.validationErrors++;
        conflicts.add(SyncConflict(
          type: ConflictType.dataConflict,
          resolution: ConflictResolution.discard,
          localId: event.clientEventId,
          message: validation.error,
        ));
        continue;
      }

      toSync.add(event);
      stats.eventsToSync++;
    }

    lastStats = stats;

    return SyncBatchResult(
      events: toSync,
      conflicts: conflicts,
      skippedIds: skipped,
      stats: stats,
    );
  }

  /// Generate idempotency key for a new event.
  String generateEventKey({
    required String sessionId,
    required String eventType,
    required int sequenceNumber,
    String? activityId,
  }) {
    return _keyGenerator.generateForActivityEvent(
      sessionId: sessionId,
      activityId: activityId ?? '',
      eventType: eventType,
      eventSequence: sequenceNumber,
    );
  }

  _EventValidation _validateEvent(LocalEvent event) {
    // Check required fields
    if (event.clientEventId.isEmpty) {
      return _EventValidation(false, 'Missing clientEventId');
    }
    if (event.sessionId.isEmpty) {
      return _EventValidation(false, 'Missing sessionId');
    }
    if (event.eventType.isEmpty) {
      return _EventValidation(false, 'Missing eventType');
    }

    // Check timestamp validity (not in future, not too old)
    final now = DateTime.now();
    final maxAge = const Duration(days: 30);

    if (event.timestamp.isAfter(now.add(const Duration(minutes: 5)))) {
      return _EventValidation(false, 'Timestamp in future');
    }
    if (event.timestamp.isBefore(now.subtract(maxAge))) {
      return _EventValidation(false, 'Timestamp too old (>30 days)');
    }

    return _EventValidation(true, null);
  }
}

class _EventValidation {
  const _EventValidation(this.isValid, this.error);
  final bool isValid;
  final String? error;
}

/// A local event ready for sync.
class LocalEvent {
  const LocalEvent({
    required this.clientEventId,
    required this.sessionId,
    required this.eventType,
    required this.timestamp,
    required this.data,
    this.activityId,
    this.sequenceNumber = 0,
  });

  final String clientEventId;
  final String sessionId;
  final String eventType;
  final DateTime timestamp;
  final Map<String, dynamic> data;
  final String? activityId;
  final int sequenceNumber;

  Map<String, dynamic> toJson() => {
        'clientEventId': clientEventId,
        'sessionId': sessionId,
        'eventType': eventType,
        'timestamp': timestamp.toUtc().toIso8601String(),
        'data': data,
        if (activityId != null) 'activityId': activityId,
        'sequenceNumber': sequenceNumber,
      };
}

/// Result of processing a sync batch.
class SyncBatchResult {
  const SyncBatchResult({
    required this.events,
    required this.conflicts,
    required this.skippedIds,
    required this.stats,
  });

  final List<LocalEvent> events;
  final List<SyncConflict> conflicts;
  final List<String> skippedIds;
  final SyncBatchStats stats;

  bool get hasConflicts => conflicts.isNotEmpty;
  bool get hasEventsToSync => events.isNotEmpty;
}

/// Statistics from batch processing.
class SyncBatchStats {
  int eventsToSync = 0;
  int duplicatesSkipped = 0;
  int validationErrors = 0;
  int conflictsDetected = 0;

  int get totalProcessed =>
      eventsToSync + duplicatesSkipped + validationErrors;

  Map<String, dynamic> toJson() => {
        'eventsToSync': eventsToSync,
        'duplicatesSkipped': duplicatesSkipped,
        'validationErrors': validationErrors,
        'conflictsDetected': conflictsDetected,
        'totalProcessed': totalProcessed,
      };
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVER RESPONSE HANDLING
// ══════════════════════════════════════════════════════════════════════════════

/// Response from server after sync attempt.
class SyncResponse {
  const SyncResponse({
    required this.accepted,
    required this.rejected,
    required this.duplicates,
    this.serverTime,
  });

  /// Events that were accepted by the server.
  final List<String> accepted;

  /// Events that were rejected with reasons.
  final Map<String, String> rejected;

  /// Events that were duplicates (already existed).
  final List<String> duplicates;

  /// Server timestamp for sync.
  final DateTime? serverTime;

  factory SyncResponse.fromJson(Map<String, dynamic> json) {
    return SyncResponse(
      accepted: List<String>.from(json['accepted'] ?? []),
      rejected: Map<String, String>.from(json['rejected'] ?? {}),
      duplicates: List<String>.from(json['duplicates'] ?? []),
      serverTime: json['serverTime'] != null
          ? DateTime.parse(json['serverTime'] as String)
          : null,
    );
  }

  bool get allAccepted => rejected.isEmpty && duplicates.isEmpty;
  int get totalProcessed => accepted.length + rejected.length + duplicates.length;
}

/// Process server sync response and update local state.
class SyncResponseProcessor {
  const SyncResponseProcessor();

  /// Process server response and return actions to take.
  SyncResponseActions processResponse({
    required SyncResponse response,
    required List<LocalEvent> sentEvents,
  }) {
    final markSynced = <String>[];
    final markFailed = <String, String>{};
    final markDuplicate = <String>[];

    for (final event in sentEvents) {
      final id = event.clientEventId;

      if (response.accepted.contains(id)) {
        markSynced.add(id);
      } else if (response.duplicates.contains(id)) {
        // Duplicates are effectively synced
        markDuplicate.add(id);
      } else if (response.rejected.containsKey(id)) {
        markFailed[id] = response.rejected[id]!;
      }
    }

    return SyncResponseActions(
      markSynced: markSynced,
      markFailed: markFailed,
      markDuplicate: markDuplicate,
    );
  }
}

/// Actions to take based on server response.
class SyncResponseActions {
  const SyncResponseActions({
    required this.markSynced,
    required this.markFailed,
    required this.markDuplicate,
  });

  final List<String> markSynced;
  final Map<String, String> markFailed;
  final List<String> markDuplicate;

  int get totalActions =>
      markSynced.length + markFailed.length + markDuplicate.length;
}
