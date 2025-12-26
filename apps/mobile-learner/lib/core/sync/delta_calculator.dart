import '../database/local_database.dart';
import 'sync_models.dart';

/// Delta Calculator
///
/// Calculates the differences between local and server data
/// to enable efficient incremental synchronization.
class DeltaCalculator {
  /// Calculate deltas between local and server changes
  DeltaResult calculateDeltas({
    required List<LocalChange> localChanges,
    required List<ServerChange> serverChanges,
  }) {
    final localOnly = <LocalChange>[];
    final serverOnly = <ServerChange>[];
    final conflicts = <DeltaConflict>[];

    // Index server changes by entity key
    final serverIndex = <String, ServerChange>{};
    for (final change in serverChanges) {
      final key = _entityKey(change.entityType, change.entityId);
      serverIndex[key] = change;
    }

    // Process local changes
    final processedServerKeys = <String>{};

    for (final localChange in localChanges) {
      final key = _entityKey(localChange.entityType, localChange.entityId);
      final serverChange = serverIndex[key];

      if (serverChange == null) {
        // Local-only change - needs to be pushed
        localOnly.add(localChange);
      } else {
        // Both local and server have changes - potential conflict
        processedServerKeys.add(key);

        if (_isConflict(localChange, serverChange)) {
          conflicts.add(DeltaConflict(
            entityType: localChange.entityType,
            entityId: localChange.entityId,
            localChange: localChange.data,
            serverChange: serverChange.data,
          ));
        } else if (_serverIsNewer(localChange, serverChange)) {
          // Server change is newer, apply it
          serverOnly.add(serverChange);
        } else {
          // Local change is newer, push it
          localOnly.add(localChange);
        }
      }
    }

    // Add server-only changes (not in local changes)
    for (final entry in serverIndex.entries) {
      if (!processedServerKeys.contains(entry.key)) {
        serverOnly.add(entry.value);
      }
    }

    return DeltaResult(
      localOnly: localOnly,
      serverOnly: serverOnly,
      conflicts: conflicts,
    );
  }

  /// Calculate field-level deltas for a single entity
  FieldDelta calculateFieldDeltas({
    required Map<String, dynamic> localData,
    required Map<String, dynamic> serverData,
    List<String>? ignoreFields,
  }) {
    final ignored = ignoreFields?.toSet() ?? <String>{};
    ignored.addAll(['created_at', 'updated_at', 'is_synced', 'version']);

    final localFields = <String, dynamic>{};
    final serverFields = <String, dynamic>{};
    final conflictingFields = <String, FieldConflict>{};
    final unchangedFields = <String, dynamic>{};

    final allKeys = {...localData.keys, ...serverData.keys}
        .where((k) => !ignored.contains(k));

    for (final key in allKeys) {
      final localValue = localData[key];
      final serverValue = serverData[key];

      if (!serverData.containsKey(key)) {
        // Field only exists locally
        localFields[key] = localValue;
      } else if (!localData.containsKey(key)) {
        // Field only exists on server
        serverFields[key] = serverValue;
      } else if (_valuesEqual(localValue, serverValue)) {
        // Values are the same
        unchangedFields[key] = localValue;
      } else {
        // Values differ - conflict
        conflictingFields[key] = FieldConflict(
          fieldName: key,
          localValue: localValue,
          serverValue: serverValue,
        );
      }
    }

    return FieldDelta(
      localOnlyFields: localFields,
      serverOnlyFields: serverFields,
      conflictingFields: conflictingFields,
      unchangedFields: unchangedFields,
    );
  }

  /// Merge field-level changes with conflict resolution
  Map<String, dynamic> mergeFields({
    required FieldDelta delta,
    required FieldMergeStrategy strategy,
    Map<String, FieldMergeStrategy>? fieldStrategies,
  }) {
    final result = Map<String, dynamic>.from(delta.unchangedFields);

    // Add local-only fields
    result.addAll(delta.localOnlyFields);

    // Add server-only fields
    result.addAll(delta.serverOnlyFields);

    // Resolve conflicts
    for (final entry in delta.conflictingFields.entries) {
      final fieldName = entry.key;
      final conflict = entry.value;
      final fieldStrategy = fieldStrategies?[fieldName] ?? strategy;

      result[fieldName] = _resolveFieldConflict(conflict, fieldStrategy);
    }

    return result;
  }

  /// Check if two change sets have overlapping entities
  bool hasOverlap(
    List<LocalChange> localChanges,
    List<ServerChange> serverChanges,
  ) {
    final localKeys = localChanges
        .map((c) => _entityKey(c.entityType, c.entityId))
        .toSet();
    final serverKeys = serverChanges
        .map((c) => _entityKey(c.entityType, c.entityId))
        .toSet();

    return localKeys.intersection(serverKeys).isNotEmpty;
  }

  /// Get entities that need conflict resolution
  List<String> getConflictingEntities(
    List<LocalChange> localChanges,
    List<ServerChange> serverChanges,
  ) {
    final conflicts = <String>[];

    final serverIndex = <String, ServerChange>{};
    for (final change in serverChanges) {
      serverIndex[_entityKey(change.entityType, change.entityId)] = change;
    }

    for (final localChange in localChanges) {
      final key = _entityKey(localChange.entityType, localChange.entityId);
      final serverChange = serverIndex[key];

      if (serverChange != null && _isConflict(localChange, serverChange)) {
        conflicts.add(key);
      }
    }

    return conflicts;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  String _entityKey(String entityType, String entityId) {
    return '$entityType:$entityId';
  }

  bool _isConflict(LocalChange local, ServerChange server) {
    // If timestamps are very close (within 1 second), consider it a conflict
    final timeDiff = local.changedAt.difference(server.timestamp).abs();
    if (timeDiff < const Duration(seconds: 1)) {
      return true;
    }

    // If the same fields were modified, it's a conflict
    final localFields = local.data.keys.toSet();
    final serverFields = server.data.keys.toSet();
    final overlapping = localFields.intersection(serverFields);

    return overlapping.isNotEmpty;
  }

  bool _serverIsNewer(LocalChange local, ServerChange server) {
    return server.timestamp.isAfter(local.changedAt);
  }

  bool _valuesEqual(dynamic a, dynamic b) {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    if (a is Map && b is Map) {
      if (a.length != b.length) return false;
      for (final key in a.keys) {
        if (!b.containsKey(key) || !_valuesEqual(a[key], b[key])) {
          return false;
        }
      }
      return true;
    }

    if (a is List && b is List) {
      if (a.length != b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (!_valuesEqual(a[i], b[i])) return false;
      }
      return true;
    }

    return a == b;
  }

  dynamic _resolveFieldConflict(
    FieldConflict conflict,
    FieldMergeStrategy strategy,
  ) {
    switch (strategy) {
      case FieldMergeStrategy.preferLocal:
        return conflict.localValue;

      case FieldMergeStrategy.preferServer:
        return conflict.serverValue;

      case FieldMergeStrategy.preferNewest:
        // Requires timestamp tracking per field
        // Default to server if we can't determine
        return conflict.serverValue;

      case FieldMergeStrategy.preferLargest:
        if (conflict.localValue is num && conflict.serverValue is num) {
          return (conflict.localValue as num) > (conflict.serverValue as num)
              ? conflict.localValue
              : conflict.serverValue;
        }
        return conflict.serverValue;

      case FieldMergeStrategy.concatenate:
        if (conflict.localValue is String && conflict.serverValue is String) {
          return '${conflict.localValue}\n${conflict.serverValue}';
        }
        if (conflict.localValue is List && conflict.serverValue is List) {
          return [...conflict.localValue, ...conflict.serverValue];
        }
        return conflict.serverValue;

      case FieldMergeStrategy.union:
        if (conflict.localValue is List && conflict.serverValue is List) {
          final set = {...conflict.localValue, ...conflict.serverValue};
          return set.toList();
        }
        return conflict.serverValue;
    }
  }
}

/// Result of delta calculation
class DeltaResult {
  /// Changes that exist only locally and need to be pushed
  final List<LocalChange> localOnly;

  /// Changes that exist only on server and need to be pulled
  final List<ServerChange> serverOnly;

  /// Changes that conflict between local and server
  final List<DeltaConflict> conflicts;

  DeltaResult({
    required this.localOnly,
    required this.serverOnly,
    required this.conflicts,
  });

  /// Total number of changes to process
  int get totalChanges => localOnly.length + serverOnly.length + conflicts.length;

  /// Whether there are any conflicts
  bool get hasConflicts => conflicts.isNotEmpty;

  /// Whether there are any changes at all
  bool get hasChanges => totalChanges > 0;

  Map<String, dynamic> toJson() => {
        'localOnly': localOnly.length,
        'serverOnly': serverOnly.length,
        'conflicts': conflicts.length,
        'totalChanges': totalChanges,
      };
}

/// Field-level delta calculation result
class FieldDelta {
  /// Fields that only exist in local data
  final Map<String, dynamic> localOnlyFields;

  /// Fields that only exist in server data
  final Map<String, dynamic> serverOnlyFields;

  /// Fields that exist in both but have different values
  final Map<String, FieldConflict> conflictingFields;

  /// Fields that are the same in both
  final Map<String, dynamic> unchangedFields;

  FieldDelta({
    required this.localOnlyFields,
    required this.serverOnlyFields,
    required this.conflictingFields,
    required this.unchangedFields,
  });

  /// Whether there are any field conflicts
  bool get hasConflicts => conflictingFields.isNotEmpty;

  /// Whether there are any differences at all
  bool get hasDifferences =>
      localOnlyFields.isNotEmpty ||
      serverOnlyFields.isNotEmpty ||
      conflictingFields.isNotEmpty;
}

/// Represents a conflict for a single field
class FieldConflict {
  final String fieldName;
  final dynamic localValue;
  final dynamic serverValue;

  FieldConflict({
    required this.fieldName,
    required this.localValue,
    required this.serverValue,
  });
}

/// Strategy for resolving field-level conflicts
enum FieldMergeStrategy {
  /// Always use local value
  preferLocal,

  /// Always use server value
  preferServer,

  /// Use the newest value (requires timestamp tracking)
  preferNewest,

  /// For numbers, use the largest value
  preferLargest,

  /// For strings/lists, concatenate values
  concatenate,

  /// For lists, merge unique values
  union,
}
