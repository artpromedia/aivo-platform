/// Sync Operation Model
///
/// Represents operations to be synced with the server.
library;

import 'package:flutter/foundation.dart';

/// Sync operation type.
enum SyncOperationType {
  create,
  update,
  delete,
}

/// Sync status.
enum SyncStatus {
  pending,
  syncing,
  synced,
  failed,
  conflict,
}

/// A sync operation to be processed.
@immutable
class SyncOperation {
  const SyncOperation({
    required this.id,
    required this.type,
    required this.entityType,
    required this.entityId,
    required this.data,
    required this.createdAt,
    this.status = SyncStatus.pending,
    this.retryCount = 0,
    this.lastError,
    this.lastAttemptAt,
    this.serverTimestamp,
  });

  final String id;
  final SyncOperationType type;
  final String entityType; // 'session_note', 'iep_progress', 'message', etc.
  final String entityId;
  final Map<String, dynamic> data;
  final DateTime createdAt;
  final SyncStatus status;
  final int retryCount;
  final String? lastError;
  final DateTime? lastAttemptAt;
  final DateTime? serverTimestamp;

  bool get canRetry => retryCount < 5;
  bool get isPending => status == SyncStatus.pending;
  bool get hasConflict => status == SyncStatus.conflict;

  factory SyncOperation.fromJson(Map<String, dynamic> json) {
    return SyncOperation(
      id: json['id'] as String,
      type: SyncOperationType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => SyncOperationType.update,
      ),
      entityType: json['entityType'] as String,
      entityId: json['entityId'] as String,
      data: json['data'] as Map<String, dynamic>,
      createdAt: DateTime.parse(json['createdAt'] as String),
      status: SyncStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => SyncStatus.pending,
      ),
      retryCount: json['retryCount'] as int? ?? 0,
      lastError: json['lastError'] as String?,
      lastAttemptAt: json['lastAttemptAt'] != null
          ? DateTime.tryParse(json['lastAttemptAt'] as String)
          : null,
      serverTimestamp: json['serverTimestamp'] != null
          ? DateTime.tryParse(json['serverTimestamp'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'entityType': entityType,
      'entityId': entityId,
      'data': data,
      'createdAt': createdAt.toIso8601String(),
      'status': status.name,
      'retryCount': retryCount,
      'lastError': lastError,
      'lastAttemptAt': lastAttemptAt?.toIso8601String(),
      'serverTimestamp': serverTimestamp?.toIso8601String(),
    };
  }

  SyncOperation copyWith({
    String? id,
    SyncOperationType? type,
    String? entityType,
    String? entityId,
    Map<String, dynamic>? data,
    DateTime? createdAt,
    SyncStatus? status,
    int? retryCount,
    String? lastError,
    DateTime? lastAttemptAt,
    DateTime? serverTimestamp,
  }) {
    return SyncOperation(
      id: id ?? this.id,
      type: type ?? this.type,
      entityType: entityType ?? this.entityType,
      entityId: entityId ?? this.entityId,
      data: data ?? this.data,
      createdAt: createdAt ?? this.createdAt,
      status: status ?? this.status,
      retryCount: retryCount ?? this.retryCount,
      lastError: lastError ?? this.lastError,
      lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
      serverTimestamp: serverTimestamp ?? this.serverTimestamp,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SyncOperation &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// Result of a sync operation.
@immutable
class SyncResult {
  const SyncResult({
    required this.success,
    this.operationsSynced = 0,
    this.operationsFailed = 0,
    this.conflicts = const [],
    this.error,
    this.duration = Duration.zero,
  });

  final bool success;
  final int operationsSynced;
  final int operationsFailed;
  final List<SyncConflict> conflicts;
  final String? error;
  final Duration duration;

  factory SyncResult.failure(String error) => SyncResult(
        success: false,
        error: error,
      );

  factory SyncResult.offline() => const SyncResult(
        success: false,
        error: 'Device is offline',
      );
}

/// A sync conflict that needs resolution.
@immutable
class SyncConflict {
  const SyncConflict({
    required this.operationId,
    required this.entityType,
    required this.entityId,
    required this.localData,
    required this.serverData,
    required this.conflictType,
    this.detectedAt,
  });

  final String operationId;
  final String entityType;
  final String entityId;
  final Map<String, dynamic> localData;
  final Map<String, dynamic> serverData;
  final ConflictType conflictType;
  final DateTime? detectedAt;

  factory SyncConflict.fromJson(Map<String, dynamic> json) {
    return SyncConflict(
      operationId: json['operationId'] as String,
      entityType: json['entityType'] as String,
      entityId: json['entityId'] as String,
      localData: json['localData'] as Map<String, dynamic>,
      serverData: json['serverData'] as Map<String, dynamic>,
      conflictType: ConflictType.values.firstWhere(
        (e) => e.name == json['conflictType'],
        orElse: () => ConflictType.dataModified,
      ),
      detectedAt: json['detectedAt'] != null
          ? DateTime.tryParse(json['detectedAt'] as String)
          : null,
    );
  }
}

/// Type of sync conflict.
enum ConflictType {
  dataModified,
  deletedOnServer,
  versionMismatch,
}

/// Strategy for resolving conflicts.
enum ResolutionStrategy {
  keepLocal,
  keepServer,
  merge,
  askUser,
}
