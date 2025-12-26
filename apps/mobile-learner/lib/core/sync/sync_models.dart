import 'dart:convert';

import 'package:hive/hive.dart';

/// Sync operation types
enum SyncOperationType {
  createResponse,
  updateProgress,
  updateSession,
  completeLesson,
  updateMastery,
  createBookmark,
  deleteBookmark,
  updateSettings,
}

/// Sync operation status
enum SyncOperationStatus {
  pending,
  inProgress,
  completed,
  failed,
}

/// Sync state
enum SyncState {
  idle,
  syncing,
  offline,
  error,
}

/// Sync status for entities
enum SyncStatus {
  synced,
  pending,
  error,
}

/// Sync operation
class SyncOperation {
  final String id;
  final SyncOperationType type;
  final String entityType;
  final String entityId;
  final Map<String, dynamic> data;
  final int priority;
  final int attempts;
  final int maxAttempts;
  final SyncOperationStatus status;
  final DateTime queuedAt;
  final DateTime? lastAttemptAt;
  final DateTime? completedAt;
  final String? errorMessage;

  SyncOperation({
    required this.id,
    required this.type,
    required this.entityType,
    required this.entityId,
    required this.data,
    this.priority = 0,
    this.attempts = 0,
    this.maxAttempts = 5,
    this.status = SyncOperationStatus.pending,
    required this.queuedAt,
    this.lastAttemptAt,
    this.completedAt,
    this.errorMessage,
  });

  SyncOperation copyWith({
    String? id,
    SyncOperationType? type,
    String? entityType,
    String? entityId,
    Map<String, dynamic>? data,
    int? priority,
    int? attempts,
    int? maxAttempts,
    SyncOperationStatus? status,
    DateTime? queuedAt,
    DateTime? lastAttemptAt,
    DateTime? completedAt,
    String? errorMessage,
  }) {
    return SyncOperation(
      id: id ?? this.id,
      type: type ?? this.type,
      entityType: entityType ?? this.entityType,
      entityId: entityId ?? this.entityId,
      data: data ?? this.data,
      priority: priority ?? this.priority,
      attempts: attempts ?? this.attempts,
      maxAttempts: maxAttempts ?? this.maxAttempts,
      status: status ?? this.status,
      queuedAt: queuedAt ?? this.queuedAt,
      lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
      completedAt: completedAt ?? this.completedAt,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  factory SyncOperation.fromMap(Map<String, dynamic> map) {
    return SyncOperation(
      id: map['id'] as String,
      type: SyncOperationType.values.firstWhere(
        (e) => e.name == map['operation_type'],
      ),
      entityType: map['entity_type'] as String,
      entityId: map['entity_id'] as String,
      data: map['data'] is String
          ? jsonDecode(map['data'] as String)
          : map['data'] as Map<String, dynamic>,
      priority: map['priority'] as int? ?? 0,
      attempts: map['attempts'] as int? ?? 0,
      maxAttempts: map['max_attempts'] as int? ?? 5,
      status: SyncOperationStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => SyncOperationStatus.pending,
      ),
      queuedAt: DateTime.parse(map['queued_at'] as String),
      lastAttemptAt: map['last_attempt_at'] != null
          ? DateTime.parse(map['last_attempt_at'] as String)
          : null,
      completedAt: map['completed_at'] != null
          ? DateTime.parse(map['completed_at'] as String)
          : null,
      errorMessage: map['error_message'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'operation_type': type.name,
      'entity_type': entityType,
      'entity_id': entityId,
      'data': data,
      'priority': priority,
      'attempts': attempts,
      'queued_at': queuedAt.toIso8601String(),
    };
  }
}

/// Sync result
class SyncResult {
  final bool success;
  final String? error;
  final bool isOffline;
  final int pushedCount;
  final int pulledCount;
  final int conflictsResolved;
  final Duration? duration;

  SyncResult({
    required this.success,
    this.error,
    this.isOffline = false,
    this.pushedCount = 0,
    this.pulledCount = 0,
    this.conflictsResolved = 0,
    this.duration,
  });

  Map<String, dynamic> toJson() => {
        'success': success,
        'error': error,
        'isOffline': isOffline,
        'pushedCount': pushedCount,
        'pulledCount': pulledCount,
        'conflictsResolved': conflictsResolved,
        'durationMs': duration?.inMilliseconds,
      };
}

/// Offline download result
class OfflineDownloadResult {
  final String lessonId;
  bool success;
  String? error;
  int mediaDownloaded;
  int mediaFailed;
  int totalSize;

  OfflineDownloadResult({
    required this.lessonId,
    this.success = false,
    this.error,
    this.mediaDownloaded = 0,
    this.mediaFailed = 0,
    this.totalSize = 0,
  });

  Map<String, dynamic> toJson() => {
        'lessonId': lessonId,
        'success': success,
        'error': error,
        'mediaDownloaded': mediaDownloaded,
        'mediaFailed': mediaFailed,
        'totalSize': totalSize,
      };
}

/// Download options
class DownloadOptions {
  final bool includeMedia;
  final bool includeAttachments;
  final int? maxMediaSize;
  final List<String>? mediaTypes;

  DownloadOptions({
    this.includeMedia = true,
    this.includeAttachments = true,
    this.maxMediaSize,
    this.mediaTypes,
  });
}

/// Server change from pull response
class ServerChange {
  final String entityType;
  final String entityId;
  final Map<String, dynamic> data;
  final DateTime timestamp;
  final String? changeType;
  final int? version;

  ServerChange({
    required this.entityType,
    required this.entityId,
    required this.data,
    required this.timestamp,
    this.changeType,
    this.version,
  });

  factory ServerChange.fromJson(Map<String, dynamic> json) {
    return ServerChange(
      entityType: json['entityType'] as String,
      entityId: json['entityId'] as String,
      data: json['data'] as Map<String, dynamic>,
      timestamp: DateTime.parse(json['timestamp'] as String),
      changeType: json['changeType'] as String?,
      version: json['version'] as int?,
    );
  }

  Map<String, dynamic> toJson() => {
        'entityType': entityType,
        'entityId': entityId,
        'data': data,
        'timestamp': timestamp.toIso8601String(),
        'changeType': changeType,
        'version': version,
      };
}

/// Server conflict response
class ServerConflict {
  final Map<String, dynamic> serverData;
  final DateTime serverTimestamp;
  final String conflictType;

  ServerConflict({
    required this.serverData,
    required this.serverTimestamp,
    required this.conflictType,
  });

  factory ServerConflict.fromJson(Map<String, dynamic> json) {
    return ServerConflict(
      serverData: json['serverData'] as Map<String, dynamic>,
      serverTimestamp: DateTime.parse(json['serverTimestamp'] as String),
      conflictType: json['conflictType'] as String,
    );
  }
}

/// Delta conflict
class DeltaConflict {
  final String entityType;
  final String entityId;
  final Map<String, dynamic> localChange;
  final Map<String, dynamic> serverChange;

  DeltaConflict({
    required this.entityType,
    required this.entityId,
    required this.localChange,
    required this.serverChange,
  });
}

/// Sync metadata for Hive storage
class SyncMetadata extends HiveObject {
  final DateTime? timestamp;
  final String? deviceId;
  final int? retryCount;
  final String? lastError;

  SyncMetadata({
    this.timestamp,
    this.deviceId,
    this.retryCount,
    this.lastError,
  });
}

/// Hive type adapter for SyncMetadata
class SyncMetadataAdapter extends TypeAdapter<SyncMetadata> {
  @override
  final int typeId = 0;

  @override
  SyncMetadata read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return SyncMetadata(
      timestamp: fields[0] as DateTime?,
      deviceId: fields[1] as String?,
      retryCount: fields[2] as int?,
      lastError: fields[3] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, SyncMetadata obj) {
    writer
      ..writeByte(4)
      ..writeByte(0)
      ..write(obj.timestamp)
      ..writeByte(1)
      ..write(obj.deviceId)
      ..writeByte(2)
      ..write(obj.retryCount)
      ..writeByte(3)
      ..write(obj.lastError);
  }
}

/// Hive type adapter for SyncOperation
class SyncOperationAdapter extends TypeAdapter<SyncOperation> {
  @override
  final int typeId = 1;

  @override
  SyncOperation read(BinaryReader reader) {
    final map = reader.readMap().cast<String, dynamic>();
    return SyncOperation.fromMap(map);
  }

  @override
  void write(BinaryWriter writer, SyncOperation obj) {
    writer.writeMap(obj.toJson());
  }
}

// ============================================================================
// DOMAIN MODELS
// ============================================================================

/// Lesson model
class Lesson {
  final String id;
  final String title;
  final String? description;
  final String? content;
  final String? tenantId;
  final String status;
  final String? difficulty;
  final int? estimatedDuration;
  final String? thumbnailUrl;
  final bool isOffline;
  final DateTime? offlineAt;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<LessonBlock> blocks;

  Lesson({
    required this.id,
    required this.title,
    this.description,
    this.content,
    this.tenantId,
    this.status = 'published',
    this.difficulty,
    this.estimatedDuration,
    this.thumbnailUrl,
    this.isOffline = false,
    this.offlineAt,
    this.version = 1,
    required this.createdAt,
    required this.updatedAt,
    this.blocks = const [],
  });

  factory Lesson.fromMap(Map<String, dynamic> map,
      {List<LessonBlock> blocks = const []}) {
    return Lesson(
      id: map['id'] as String,
      title: map['title'] as String,
      description: map['description'] as String?,
      content: map['content'] as String?,
      tenantId: map['tenant_id'] as String?,
      status: map['status'] as String? ?? 'published',
      difficulty: map['difficulty'] as String?,
      estimatedDuration: map['estimated_duration'] as int?,
      thumbnailUrl: map['thumbnail_url'] as String?,
      isOffline: (map['is_offline'] as int?) == 1,
      offlineAt: map['offline_at'] != null
          ? DateTime.parse(map['offline_at'] as String)
          : null,
      version: map['version'] as int? ?? 1,
      createdAt: DateTime.parse(map['created_at'] as String),
      updatedAt: DateTime.parse(map['updated_at'] as String),
      blocks: blocks,
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'title': title,
        'description': description,
        'content': content,
        'tenant_id': tenantId,
        'status': status,
        'difficulty': difficulty,
        'estimated_duration': estimatedDuration,
        'thumbnail_url': thumbnailUrl,
        'is_offline': isOffline ? 1 : 0,
        'offline_at': offlineAt?.toIso8601String(),
        'version': version,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
      };
}

/// Lesson block model
class LessonBlock {
  final String id;
  final String lessonId;
  final String type;
  final Map<String, dynamic> content;
  final int order;
  final Map<String, dynamic>? settings;
  final DateTime createdAt;
  final DateTime updatedAt;

  LessonBlock({
    required this.id,
    required this.lessonId,
    required this.type,
    required this.content,
    required this.order,
    this.settings,
    required this.createdAt,
    required this.updatedAt,
  });

  factory LessonBlock.fromMap(Map<String, dynamic> map) {
    return LessonBlock(
      id: map['id'] as String,
      lessonId: map['lesson_id'] as String,
      type: map['type'] as String,
      content: map['content'] is String
          ? jsonDecode(map['content'] as String)
          : map['content'] as Map<String, dynamic>,
      order: map['order'] as int,
      settings: map['settings'] != null
          ? (map['settings'] is String
              ? jsonDecode(map['settings'] as String)
              : map['settings'] as Map<String, dynamic>)
          : null,
      createdAt: DateTime.parse(map['created_at'] as String),
      updatedAt: DateTime.parse(map['updated_at'] as String),
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'lesson_id': lessonId,
        'type': type,
        'content': jsonEncode(content),
        'order': order,
        'settings': settings != null ? jsonEncode(settings) : null,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
      };
}

/// Learning session model
class LearningSession {
  final String id;
  final String lessonId;
  final String studentId;
  final String status;
  final double progress;
  final double? score;
  final int timeSpentSeconds;
  final int currentBlockIndex;
  final DateTime startedAt;
  final DateTime? completedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isSynced;
  final int version;

  LearningSession({
    required this.id,
    required this.lessonId,
    required this.studentId,
    this.status = 'active',
    this.progress = 0,
    this.score,
    this.timeSpentSeconds = 0,
    this.currentBlockIndex = 0,
    required this.startedAt,
    this.completedAt,
    required this.createdAt,
    required this.updatedAt,
    this.isSynced = false,
    this.version = 1,
  });

  factory LearningSession.fromMap(Map<String, dynamic> map) {
    return LearningSession(
      id: map['id'] as String,
      lessonId: map['lesson_id'] as String,
      studentId: map['student_id'] as String,
      status: map['status'] as String? ?? 'active',
      progress: (map['progress'] as num?)?.toDouble() ?? 0,
      score: (map['score'] as num?)?.toDouble(),
      timeSpentSeconds: map['time_spent_seconds'] as int? ?? 0,
      currentBlockIndex: map['current_block_index'] as int? ?? 0,
      startedAt: DateTime.parse(map['started_at'] as String),
      completedAt: map['completed_at'] != null
          ? DateTime.parse(map['completed_at'] as String)
          : null,
      createdAt: DateTime.parse(map['created_at'] as String),
      updatedAt: DateTime.parse(map['updated_at'] as String),
      isSynced: (map['is_synced'] as int?) == 1,
      version: map['version'] as int? ?? 1,
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'lesson_id': lessonId,
        'student_id': studentId,
        'status': status,
        'progress': progress,
        'score': score,
        'time_spent_seconds': timeSpentSeconds,
        'current_block_index': currentBlockIndex,
        'started_at': startedAt.toIso8601String(),
        'completed_at': completedAt?.toIso8601String(),
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
        'is_synced': isSynced ? 1 : 0,
        'version': version,
      };
}

/// Response model
class Response {
  final String id;
  final String sessionId;
  final String blockId;
  final Map<String, dynamic> responseData;
  final bool? isCorrect;
  final double? score;
  final int? timeSpentSeconds;
  final int attemptNumber;
  final String? feedback;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isSynced;

  Response({
    required this.id,
    required this.sessionId,
    required this.blockId,
    required this.responseData,
    this.isCorrect,
    this.score,
    this.timeSpentSeconds,
    this.attemptNumber = 1,
    this.feedback,
    required this.createdAt,
    required this.updatedAt,
    this.isSynced = false,
  });

  factory Response.fromMap(Map<String, dynamic> map) {
    return Response(
      id: map['id'] as String,
      sessionId: map['session_id'] as String,
      blockId: map['block_id'] as String,
      responseData: map['response_data'] is String
          ? jsonDecode(map['response_data'] as String)
          : map['response_data'] as Map<String, dynamic>,
      isCorrect: map['is_correct'] == 1,
      score: (map['score'] as num?)?.toDouble(),
      timeSpentSeconds: map['time_spent_seconds'] as int?,
      attemptNumber: map['attempt_number'] as int? ?? 1,
      feedback: map['feedback'] as String?,
      createdAt: DateTime.parse(map['created_at'] as String),
      updatedAt: DateTime.parse(map['updated_at'] as String),
      isSynced: (map['is_synced'] as int?) == 1,
    );
  }

  factory Response.fromJson(Map<String, dynamic> json) {
    return Response(
      id: json['id'] as String,
      sessionId: json['sessionId'] as String,
      blockId: json['blockId'] as String,
      responseData: json['responseData'] as Map<String, dynamic>,
      isCorrect: json['isCorrect'] as bool?,
      score: (json['score'] as num?)?.toDouble(),
      timeSpentSeconds: json['timeSpentSeconds'] as int?,
      attemptNumber: json['attemptNumber'] as int? ?? 1,
      feedback: json['feedback'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
      isSynced: json['isSynced'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'session_id': sessionId,
        'block_id': blockId,
        'response_data': jsonEncode(responseData),
        'is_correct': isCorrect == true ? 1 : (isCorrect == false ? 0 : null),
        'score': score,
        'time_spent_seconds': timeSpentSeconds,
        'attempt_number': attemptNumber,
        'feedback': feedback,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
        'is_synced': isSynced ? 1 : 0,
      };

  Map<String, dynamic> toJson() => {
        'id': id,
        'sessionId': sessionId,
        'blockId': blockId,
        'responseData': responseData,
        'isCorrect': isCorrect,
        'score': score,
        'timeSpentSeconds': timeSpentSeconds,
        'attemptNumber': attemptNumber,
        'feedback': feedback,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'isSynced': isSynced,
      };
}
