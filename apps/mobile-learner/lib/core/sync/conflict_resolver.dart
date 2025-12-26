import 'dart:convert';

import 'package:collection/collection.dart';

import 'sync_models.dart';

/// Conflict Resolution Strategies
enum ConflictStrategy {
  /// Server always wins (safe default)
  serverWins,

  /// Client always wins (for offline-first priority)
  clientWins,

  /// Last write wins based on timestamp
  lastWriteWins,

  /// Merge changes intelligently
  merge,

  /// Ask user to resolve manually
  manual,
}

/// Conflict Resolver - Handles sync conflicts between local and server data
class ConflictResolver {
  /// Default strategy per entity type
  final Map<String, ConflictStrategy> _strategies = {
    'response': ConflictStrategy.clientWins, // User's answers are sacred
    'learning_session': ConflictStrategy.merge,
    'skill_mastery': ConflictStrategy.lastWriteWins,
    'progress': ConflictStrategy.merge,
    'lesson': ConflictStrategy.serverWins, // Content from server
    'settings': ConflictStrategy.merge,
  };

  /// Callbacks for manual resolution
  final Map<String, Future<ConflictResolution> Function(SyncConflict)>
      _manualResolvers = {};

  /// Resolve a sync conflict
  Future<ConflictResolution> resolve(SyncConflict conflict) async {
    final strategy =
        _strategies[conflict.entityType] ?? ConflictStrategy.serverWins;

    switch (strategy) {
      case ConflictStrategy.serverWins:
        return _resolveServerWins(conflict);

      case ConflictStrategy.clientWins:
        return _resolveClientWins(conflict);

      case ConflictStrategy.lastWriteWins:
        return _resolveLastWriteWins(conflict);

      case ConflictStrategy.merge:
        return _resolveMerge(conflict);

      case ConflictStrategy.manual:
        return _createManualResolution(conflict);
    }
  }

  /// Set custom strategy for an entity type
  void setStrategy(String entityType, ConflictStrategy strategy) {
    _strategies[entityType] = strategy;
  }

  /// Register a manual resolver callback
  void registerManualResolver(
    String entityType,
    Future<ConflictResolution> Function(SyncConflict) resolver,
  ) {
    _manualResolvers[entityType] = resolver;
  }

  // ============================================================================
  // RESOLUTION STRATEGIES
  // ============================================================================

  ConflictResolution _resolveServerWins(SyncConflict conflict) {
    return ConflictResolution(
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      mergedData: conflict.serverVersion,
      useServer: true,
      strategy: ConflictStrategy.serverWins,
    );
  }

  ConflictResolution _resolveClientWins(SyncConflict conflict) {
    return ConflictResolution(
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      mergedData: conflict.localVersion,
      useServer: false,
      strategy: ConflictStrategy.clientWins,
    );
  }

  ConflictResolution _resolveLastWriteWins(SyncConflict conflict) {
    final localTime = _extractTimestamp(conflict.localVersion);
    final serverTime = _extractTimestamp(conflict.serverVersion);

    final useServer = serverTime.isAfter(localTime);

    return ConflictResolution(
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      mergedData: useServer ? conflict.serverVersion : conflict.localVersion,
      useServer: useServer,
      strategy: ConflictStrategy.lastWriteWins,
    );
  }

  ConflictResolution _resolveMerge(SyncConflict conflict) {
    final merged = _mergeData(
      conflict.localVersion,
      conflict.serverVersion,
      conflict.entityType,
    );

    return ConflictResolution(
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      mergedData: merged,
      useServer: false, // We're using merged data
      strategy: ConflictStrategy.merge,
    );
  }

  Future<ConflictResolution> _createManualResolution(
      SyncConflict conflict) async {
    // Check if there's a registered manual resolver
    final resolver = _manualResolvers[conflict.entityType];
    if (resolver != null) {
      return await resolver(conflict);
    }

    // Mark for manual resolution - will be shown to user
    return ConflictResolution(
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      mergedData: conflict.serverVersion, // Default to server until resolved
      useServer: true,
      strategy: ConflictStrategy.manual,
      requiresManualResolution: true,
      localVersion: conflict.localVersion,
      serverVersion: conflict.serverVersion,
    );
  }

  // ============================================================================
  // MERGE LOGIC
  // ============================================================================

  Map<String, dynamic> _mergeData(
    Map<String, dynamic> local,
    Map<String, dynamic> server,
    String entityType,
  ) {
    switch (entityType) {
      case 'learning_session':
        return _mergeLearningSession(local, server);
      case 'progress':
        return _mergeProgress(local, server);
      case 'settings':
        return _mergeSettings(local, server);
      default:
        return _genericMerge(local, server);
    }
  }

  /// Merge learning session data
  /// Strategy: Combine responses, take max progress, merge time spent
  Map<String, dynamic> _mergeLearningSession(
    Map<String, dynamic> local,
    Map<String, dynamic> server,
  ) {
    final merged = Map<String, dynamic>.from(server);

    // Take the higher progress
    final localProgress = local['progress'] as num? ?? 0;
    final serverProgress = server['progress'] as num? ?? 0;
    merged['progress'] =
        localProgress > serverProgress ? localProgress : serverProgress;

    // Sum time spent (accounting for overlap)
    final localTime = local['timeSpentSeconds'] as int? ?? 0;
    final serverTime = server['timeSpentSeconds'] as int? ?? 0;
    final localLastSync = _extractTimestamp(local);
    final serverLastSync = _extractTimestamp(server);

    // If local is newer, add the difference
    if (localLastSync.isAfter(serverLastSync)) {
      final syncedTime = local['syncedTimeSpent'] as int? ?? 0;
      merged['timeSpentSeconds'] = serverTime + (localTime - syncedTime);
    } else {
      merged['timeSpentSeconds'] = serverTime;
    }

    // Merge responses array (union of unique responses)
    final localResponses =
        (local['responses'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final serverResponses =
        (server['responses'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    merged['responses'] = _mergeResponses(localResponses, serverResponses);

    // Take latest completion status
    if (local['status'] == 'completed' || server['status'] == 'completed') {
      merged['status'] = 'completed';
      merged['completedAt'] = local['completedAt'] ?? server['completedAt'];
    }

    // Use latest score
    final localScore = local['score'] as num?;
    final serverScore = server['score'] as num?;
    if (localScore != null && serverScore != null) {
      merged['score'] =
          localLastSync.isAfter(serverLastSync) ? localScore : serverScore;
    } else {
      merged['score'] = localScore ?? serverScore;
    }

    merged['mergedAt'] = DateTime.now().toIso8601String();
    merged['mergeSource'] = 'conflict_resolution';

    return merged;
  }

  /// Merge user progress data
  /// Strategy: Take maximum values for progress, preserve achievements
  Map<String, dynamic> _mergeProgress(
    Map<String, dynamic> local,
    Map<String, dynamic> server,
  ) {
    final merged = Map<String, dynamic>.from(server);

    // Always take higher mastery levels
    final localMastery = local['masteryLevels'] as Map<String, dynamic>? ?? {};
    final serverMastery =
        server['masteryLevels'] as Map<String, dynamic>? ?? {};

    final mergedMastery = <String, dynamic>{};
    final allSkills = {...localMastery.keys, ...serverMastery.keys};

    for (final skill in allSkills) {
      final localLevel = (localMastery[skill] as num?) ?? 0;
      final serverLevel = (serverMastery[skill] as num?) ?? 0;
      mergedMastery[skill] = localLevel > serverLevel ? localLevel : serverLevel;
    }
    merged['masteryLevels'] = mergedMastery;

    // Union of completed lessons
    final localCompleted =
        Set<String>.from(local['completedLessons'] as List? ?? []);
    final serverCompleted =
        Set<String>.from(server['completedLessons'] as List? ?? []);
    merged['completedLessons'] = localCompleted.union(serverCompleted).toList();

    // Union of achievements
    final localAchievements =
        Set<String>.from(local['achievements'] as List? ?? []);
    final serverAchievements =
        Set<String>.from(server['achievements'] as List? ?? []);
    merged['achievements'] =
        localAchievements.union(serverAchievements).toList();

    // Sum total time (prevent double counting)
    merged['totalTimeSpent'] = _mergeTimeSpent(
      local['totalTimeSpent'] as int? ?? 0,
      server['totalTimeSpent'] as int? ?? 0,
      local['lastTimeSync'] as String?,
      server['lastTimeSync'] as String?,
    );

    // Take higher streak (user's best performance)
    final localStreak = local['currentStreak'] as int? ?? 0;
    final serverStreak = server['currentStreak'] as int? ?? 0;
    merged['currentStreak'] =
        localStreak > serverStreak ? localStreak : serverStreak;

    // Take higher XP
    final localXp = local['totalXp'] as int? ?? 0;
    final serverXp = server['totalXp'] as int? ?? 0;
    merged['totalXp'] = localXp > serverXp ? localXp : serverXp;

    return merged;
  }

  /// Merge settings
  /// Strategy: Last write wins per setting key
  Map<String, dynamic> _mergeSettings(
    Map<String, dynamic> local,
    Map<String, dynamic> server,
  ) {
    final merged = <String, dynamic>{};
    final allKeys = {...local.keys, ...server.keys};

    for (final key in allKeys) {
      final localValue = local[key];
      final serverValue = server[key];

      if (localValue == null) {
        merged[key] = serverValue;
      } else if (serverValue == null) {
        merged[key] = localValue;
      } else if (localValue is Map && serverValue is Map) {
        // Nested settings - merge recursively
        final localTimestamp = _extractSettingTimestamp(localValue);
        final serverTimestamp = _extractSettingTimestamp(serverValue);
        merged[key] =
            localTimestamp.isAfter(serverTimestamp) ? localValue : serverValue;
      } else {
        // Use the local value if it was modified more recently
        // This requires tracking per-setting modification times
        merged[key] = localValue; // Simplified: prefer local for user settings
      }
    }

    return merged;
  }

  /// Generic merge for unknown entity types
  Map<String, dynamic> _genericMerge(
    Map<String, dynamic> local,
    Map<String, dynamic> server,
  ) {
    final merged = Map<String, dynamic>.from(server);

    // For each local key that's different, check timestamps
    for (final key in local.keys) {
      if (!const DeepCollectionEquality().equals(local[key], server[key])) {
        // If local was modified after server, keep local value
        final localModified = local['${key}ModifiedAt'] as String?;
        final serverModified = server['${key}ModifiedAt'] as String?;

        if (localModified != null && serverModified != null) {
          if (DateTime.parse(localModified)
              .isAfter(DateTime.parse(serverModified))) {
            merged[key] = local[key];
          }
        }
      }
    }

    return merged;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  List<Map<String, dynamic>> _mergeResponses(
    List<Map<String, dynamic>> local,
    List<Map<String, dynamic>> server,
  ) {
    final merged = <String, Map<String, dynamic>>{};

    // Index server responses by ID
    for (final response in server) {
      final id = response['id'] as String? ?? response['blockId'] as String?;
      if (id != null) merged[id] = response;
    }

    // Merge local responses
    for (final response in local) {
      final id = response['id'] as String? ?? response['blockId'] as String?;
      if (id == null) continue;

      if (merged.containsKey(id)) {
        // Response exists in both - take newer one
        final localTime = _extractTimestamp(response);
        final serverTime = _extractTimestamp(merged[id]!);
        if (localTime.isAfter(serverTime)) {
          merged[id] = response;
        }
      } else {
        // Local-only response
        merged[id] = response;
      }
    }

    return merged.values.toList();
  }

  int _mergeTimeSpent(
    int localTime,
    int serverTime,
    String? localLastSync,
    String? serverLastSync,
  ) {
    if (localLastSync == null || serverLastSync == null) {
      return localTime > serverTime ? localTime : serverTime;
    }

    final localSyncTime = DateTime.parse(localLastSync);
    final serverSyncTime = DateTime.parse(serverLastSync);

    if (localSyncTime.isAfter(serverSyncTime)) {
      // Local has newer data - use it
      return localTime;
    } else {
      // Server has newer data
      return serverTime;
    }
  }

  DateTime _extractTimestamp(Map<String, dynamic> data) {
    final timestamp =
        data['updatedAt'] ?? data['modifiedAt'] ?? data['createdAt'];
    if (timestamp == null) return DateTime.fromMillisecondsSinceEpoch(0);
    if (timestamp is DateTime) return timestamp;
    return DateTime.parse(timestamp as String);
  }

  DateTime _extractSettingTimestamp(dynamic value) {
    if (value is Map) {
      final timestamp = value['modifiedAt'] ?? value['updatedAt'];
      if (timestamp != null) {
        return DateTime.parse(timestamp as String);
      }
    }
    return DateTime.fromMillisecondsSinceEpoch(0);
  }
}

/// Represents a sync conflict between local and server versions
class SyncConflict {
  final Map<String, dynamic> localVersion;
  final Map<String, dynamic> serverVersion;
  final String entityType;
  final String entityId;
  final DateTime? localModifiedAt;
  final DateTime? serverModifiedAt;

  SyncConflict({
    required this.localVersion,
    required this.serverVersion,
    required this.entityType,
    required this.entityId,
    this.localModifiedAt,
    this.serverModifiedAt,
  });
}

/// Result of conflict resolution
class ConflictResolution {
  final String entityType;
  final String entityId;
  final Map<String, dynamic> mergedData;
  final bool useServer;
  final ConflictStrategy strategy;
  final bool requiresManualResolution;
  final Map<String, dynamic>? localVersion;
  final Map<String, dynamic>? serverVersion;

  ConflictResolution({
    required this.entityType,
    required this.entityId,
    required this.mergedData,
    required this.useServer,
    required this.strategy,
    this.requiresManualResolution = false,
    this.localVersion,
    this.serverVersion,
  });
}
