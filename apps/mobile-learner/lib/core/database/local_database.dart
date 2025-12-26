import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as path;

import '../sync/sync_models.dart';
import '../sync/conflict_resolver.dart';
import 'schema.dart';

/// Local SQLite Database with Change Tracking
///
/// Features:
/// - Automatic change tracking for sync
/// - Soft deletes for conflict resolution
/// - Version history for rollback
/// - Efficient querying with indexes
class LocalDatabase {
  static LocalDatabase? _instance;
  static LocalDatabase get instance => _instance ??= LocalDatabase._();

  LocalDatabase._();

  Database? _db;
  bool _isInitialized = false;

  Database get db {
    if (_db == null) {
      throw StateError('Database not initialized. Call initialize() first.');
    }
    return _db!;
  }

  /// Initialize the database
  Future<void> initialize() async {
    if (_isInitialized) return;

    final documentsDir = await getApplicationDocumentsDirectory();
    final dbPath = path.join(documentsDir.path, 'aivo_learner.db');

    _db = await openDatabase(
      dbPath,
      version: DatabaseSchema.version,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
      onConfigure: _onConfigure,
    );

    _isInitialized = true;
    debugPrint('[LocalDatabase] Initialized at $dbPath');
  }

  Future<void> _onConfigure(Database db) async {
    // Enable foreign keys
    await db.execute('PRAGMA foreign_keys = ON');
    // Enable WAL mode for better concurrency
    await db.execute('PRAGMA journal_mode = WAL');
  }

  Future<void> _onCreate(Database db, int version) async {
    // Create tables
    for (final sql in DatabaseSchema.createStatements) {
      await db.execute(sql);
    }

    // Create indexes
    for (final sql in DatabaseSchema.indexStatements) {
      await db.execute(sql);
    }

    // Create triggers for change tracking
    for (final sql in DatabaseSchema.triggerStatements) {
      await db.execute(sql);
    }

    debugPrint('[LocalDatabase] Created database schema v$version');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    debugPrint('[LocalDatabase] Upgrading from v$oldVersion to v$newVersion');

    // Run migrations
    for (var v = oldVersion + 1; v <= newVersion; v++) {
      final migrations = DatabaseSchema.migrations[v];
      if (migrations != null) {
        for (final sql in migrations) {
          await db.execute(sql);
        }
      }
    }
  }

  // ============================================================================
  // LESSONS
  // ============================================================================

  Future<void> saveLesson(Lesson lesson) async {
    await _db!.transaction((txn) async {
      // Save lesson
      await txn.insert(
        'lessons',
        lesson.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );

      // Save blocks
      for (final block in lesson.blocks) {
        await txn.insert(
          'lesson_blocks',
          {
            ...block.toMap(),
            'lesson_id': lesson.id,
          },
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }

      // Track change
      await _trackChange(
        txn,
        'lesson',
        lesson.id,
        ChangeType.upsert,
        lesson.toMap(),
      );
    });
  }

  Future<Lesson?> getLesson(String lessonId) async {
    final lessonMaps = await _db!.query(
      'lessons',
      where: 'id = ? AND deleted_at IS NULL',
      whereArgs: [lessonId],
    );

    if (lessonMaps.isEmpty) return null;

    final blocks = await _db!.query(
      'lesson_blocks',
      where: 'lesson_id = ? AND deleted_at IS NULL',
      whereArgs: [lessonId],
      orderBy: '"order" ASC',
    );

    return Lesson.fromMap(
      lessonMaps.first,
      blocks: blocks.map((b) => LessonBlock.fromMap(b)).toList(),
    );
  }

  Future<List<Lesson>> getOfflineLessons() async {
    final lessonMaps = await _db!.query(
      'lessons',
      where: 'is_offline = 1 AND deleted_at IS NULL',
      orderBy: 'title ASC',
    );

    return Future.wait(lessonMaps.map((m) async {
      final blocks = await _db!.query(
        'lesson_blocks',
        where: 'lesson_id = ?',
        whereArgs: [m['id']],
        orderBy: '"order" ASC',
      );
      return Lesson.fromMap(
        m,
        blocks: blocks.map((b) => LessonBlock.fromMap(b)).toList(),
      );
    }));
  }

  Future<bool> isLessonOffline(String lessonId) async {
    final result = await _db!.query(
      'lessons',
      columns: ['is_offline'],
      where: 'id = ?',
      whereArgs: [lessonId],
    );
    if (result.isEmpty) return false;
    return (result.first['is_offline'] as int?) == 1;
  }

  Future<void> upsertLesson(Map<String, dynamic> data) async {
    await _db!.insert(
      'lessons',
      {
        ...data,
        'updated_at': DateTime.now().toIso8601String(),
        'is_synced': 1,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> markAvailableOffline(String lessonId) async {
    await _db!.update(
      'lessons',
      {'is_offline': 1, 'offline_at': DateTime.now().toIso8601String()},
      where: 'id = ?',
      whereArgs: [lessonId],
    );
  }

  Future<void> removeOfflineLesson(String lessonId) async {
    await _db!.update(
      'lessons',
      {'is_offline': 0, 'offline_at': null},
      where: 'id = ?',
      whereArgs: [lessonId],
    );
  }

  Future<int> getOfflineLessonSize(String lessonId) async {
    final result = await _db!.rawQuery('''
      SELECT SUM(size) as total_size FROM (
        SELECT LENGTH(content) as size FROM lessons WHERE id = ?
        UNION ALL
        SELECT LENGTH(content) as size FROM lesson_blocks WHERE lesson_id = ?
        UNION ALL
        SELECT size FROM cached_media WHERE lesson_id = ?
      )
    ''', [lessonId, lessonId, lessonId]);

    return (result.first['total_size'] as int?) ?? 0;
  }

  // ============================================================================
  // LEARNING SESSIONS
  // ============================================================================

  Future<String> createSession(String lessonId, String studentId) async {
    final id = _generateId();
    final now = DateTime.now().toIso8601String();

    await _db!.insert('learning_sessions', {
      'id': id,
      'lesson_id': lessonId,
      'student_id': studentId,
      'status': 'active',
      'progress': 0,
      'started_at': now,
      'created_at': now,
      'updated_at': now,
      'is_synced': 0,
    });

    await _trackChange(
      null,
      'learning_session',
      id,
      ChangeType.create,
      {'lesson_id': lessonId, 'student_id': studentId},
    );

    return id;
  }

  Future<LearningSession?> getActiveSession(
      String lessonId, String studentId) async {
    final maps = await _db!.query(
      'learning_sessions',
      where: 'lesson_id = ? AND student_id = ? AND status = ?',
      whereArgs: [lessonId, studentId, 'active'],
      orderBy: 'started_at DESC',
      limit: 1,
    );

    if (maps.isEmpty) return null;
    return LearningSession.fromMap(maps.first);
  }

  Future<void> updateSession(
      String sessionId, Map<String, dynamic> updates) async {
    final now = DateTime.now().toIso8601String();

    await _db!.update(
      'learning_sessions',
      {
        ...updates,
        'updated_at': now,
        'is_synced': 0,
      },
      where: 'id = ?',
      whereArgs: [sessionId],
    );

    await _trackChange(
        null, 'learning_session', sessionId, ChangeType.update, updates);
  }

  Future<void> upsertSession(Map<String, dynamic> data) async {
    await _db!.insert(
      'learning_sessions',
      {...data, 'is_synced': 1},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  // ============================================================================
  // RESPONSES
  // ============================================================================

  Future<void> saveResponse(Response response, {bool isLocal = false}) async {
    final now = DateTime.now().toIso8601String();

    await _db!.insert(
      'responses',
      {
        ...response.toMap(),
        'created_at': now,
        'updated_at': now,
        'is_synced': isLocal ? 0 : 1,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );

    if (isLocal) {
      await _trackChange(
        null,
        'response',
        response.id,
        ChangeType.create,
        response.toMap(),
      );
    }
  }

  Future<List<Response>> getSessionResponses(String sessionId) async {
    final maps = await _db!.query(
      'responses',
      where: 'session_id = ?',
      whereArgs: [sessionId],
      orderBy: 'created_at ASC',
    );

    return maps.map((m) => Response.fromMap(m)).toList();
  }

  Future<void> upsertResponse(Map<String, dynamic> data) async {
    await _db!.insert(
      'responses',
      {...data, 'is_synced': 1},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  // ============================================================================
  // SKILL MASTERY
  // ============================================================================

  Future<void> updateSkillMastery(
    String studentId,
    String skillId,
    double masteryLevel,
  ) async {
    final now = DateTime.now().toIso8601String();

    await _db!.insert(
      'skill_mastery',
      {
        'id': '${studentId}_$skillId',
        'student_id': studentId,
        'skill_id': skillId,
        'mastery_level': masteryLevel,
        'updated_at': now,
        'created_at': now,
        'is_synced': 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );

    await _trackChange(
      null,
      'skill_mastery',
      '${studentId}_$skillId',
      ChangeType.update,
      {'mastery_level': masteryLevel},
    );
  }

  Future<Map<String, double>> getSkillMasteryLevels(String studentId) async {
    final maps = await _db!.query(
      'skill_mastery',
      where: 'student_id = ?',
      whereArgs: [studentId],
    );

    return Map.fromEntries(
      maps.map((m) => MapEntry(
            m['skill_id'] as String,
            (m['mastery_level'] as num).toDouble(),
          )),
    );
  }

  Future<void> upsertSkillMastery(Map<String, dynamic> data) async {
    await _db!.insert(
      'skill_mastery',
      {...data, 'is_synced': 1},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  // ============================================================================
  // PROGRESS
  // ============================================================================

  Future<void> updateProgress(
    String entityId,
    Map<String, dynamic> data, {
    bool isLocal = false,
  }) async {
    await _db!.update(
      'progress',
      {
        ...data,
        'updated_at': DateTime.now().toIso8601String(),
        'is_synced': isLocal ? 0 : 1,
      },
      where: 'id = ?',
      whereArgs: [entityId],
    );

    if (isLocal) {
      await _trackChange(null, 'progress', entityId, ChangeType.update, data);
    }
  }

  Future<void> markLessonCompleted(
    String lessonId,
    Map<String, dynamic> data, {
    bool isLocal = false,
  }) async {
    final id = '${data['studentId']}_$lessonId';

    await _db!.insert(
      'lesson_completions',
      {
        'id': id,
        'lesson_id': lessonId,
        'student_id': data['studentId'],
        'score': data['score'],
        'time_spent_seconds': data['timeSpentSeconds'],
        'completed_at': DateTime.now().toIso8601String(),
        'is_synced': isLocal ? 0 : 1,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );

    if (isLocal) {
      await _trackChange(
          null, 'lesson_completion', lessonId, ChangeType.create, data);
    }
  }

  // ============================================================================
  // CHANGE TRACKING
  // ============================================================================

  Future<List<LocalChange>> getChangesSince(DateTime? since) async {
    String whereClause = 'synced_at IS NULL';
    List<dynamic> whereArgs = [];

    if (since != null) {
      whereClause += ' OR changed_at > ?';
      whereArgs.add(since.toIso8601String());
    }

    final maps = await _db!.query(
      'change_log',
      where: whereClause,
      whereArgs: whereArgs.isEmpty ? null : whereArgs,
      orderBy: 'changed_at ASC',
    );

    return maps.map((m) => LocalChange.fromMap(m)).toList();
  }

  Future<void> markChangesSynced(List<String> changeIds) async {
    if (changeIds.isEmpty) return;

    final placeholders = changeIds.map((_) => '?').join(', ');
    await _db!.update(
      'change_log',
      {'synced_at': DateTime.now().toIso8601String()},
      where: 'id IN ($placeholders)',
      whereArgs: changeIds,
    );
  }

  Future<void> _trackChange(
    Transaction? txn,
    String entityType,
    String entityId,
    ChangeType changeType,
    Map<String, dynamic> data,
  ) async {
    final db = txn ?? _db!;

    // Store previous state for potential rollback
    await _storePreviousState(db, entityType, entityId);

    await db.insert('change_log', {
      'id': _generateId(),
      'entity_type': entityType,
      'entity_id': entityId,
      'change_type': changeType.name,
      'data': jsonEncode(data),
      'changed_at': DateTime.now().toIso8601String(),
      'synced_at': null,
    });
  }

  Future<void> _storePreviousState(
    dynamic db,
    String entityType,
    String entityId,
  ) async {
    final tableName = _getTableName(entityType);
    if (tableName == null) return;

    final current = await db.query(
      tableName,
      where: 'id = ?',
      whereArgs: [entityId],
    );

    if (current.isNotEmpty) {
      await db.insert('entity_history', {
        'id': _generateId(),
        'entity_type': entityType,
        'entity_id': entityId,
        'data': jsonEncode(current.first),
        'created_at': DateTime.now().toIso8601String(),
      });
    }
  }

  Future<Map<String, dynamic>?> getPreviousState(
    String entityType,
    String entityId,
  ) async {
    final maps = await _db!.query(
      'entity_history',
      where: 'entity_type = ? AND entity_id = ?',
      whereArgs: [entityType, entityId],
      orderBy: 'created_at DESC',
      limit: 1,
    );

    if (maps.isEmpty) return null;
    return jsonDecode(maps.first['data'] as String);
  }

  Future<void> restoreState(
    String entityType,
    String entityId,
    Map<String, dynamic> state,
  ) async {
    final tableName = _getTableName(entityType);
    if (tableName == null) return;

    await _db!.update(
      tableName,
      state,
      where: 'id = ?',
      whereArgs: [entityId],
    );
  }

  // ============================================================================
  // CONFLICT MANAGEMENT
  // ============================================================================

  Future<List<SyncConflict>> getUnresolvedConflicts() async {
    final maps = await _db!.query(
      'conflicts',
      where: 'resolved_at IS NULL',
      orderBy: 'created_at ASC',
    );

    return maps
        .map((m) => SyncConflict(
              localVersion: jsonDecode(m['local_data'] as String),
              serverVersion: jsonDecode(m['server_data'] as String),
              entityType: m['entity_type'] as String,
              entityId: m['entity_id'] as String,
            ))
        .toList();
  }

  Future<void> storeConflict(
    String entityType,
    String entityId,
    Map<String, dynamic> localData,
    Map<String, dynamic> serverData,
  ) async {
    await _db!.insert('conflicts', {
      'id': _generateId(),
      'entity_type': entityType,
      'entity_id': entityId,
      'local_data': jsonEncode(localData),
      'server_data': jsonEncode(serverData),
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  Future<void> applyConflictResolution({
    required String entityType,
    required String entityId,
    required Map<String, dynamic> data,
  }) async {
    final tableName = _getTableName(entityType);
    if (tableName == null) return;

    await _db!.transaction((txn) async {
      // Apply resolved data
      await txn.update(
        tableName,
        data,
        where: 'id = ?',
        whereArgs: [entityId],
      );

      // Mark conflict as resolved
      await txn.update(
        'conflicts',
        {'resolved_at': DateTime.now().toIso8601String()},
        where: 'entity_type = ? AND entity_id = ? AND resolved_at IS NULL',
        whereArgs: [entityType, entityId],
      );
    });
  }

  // ============================================================================
  // MEDIA CACHE
  // ============================================================================

  Future<void> cacheMedia(
    String url,
    List<int> bytes, {
    String? lessonId,
    String? mimeType,
  }) async {
    final cacheDir = await getTemporaryDirectory();
    final fileName = _hashUrl(url);
    final file = File(path.join(cacheDir.path, 'media', fileName));

    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes);

    await _db!.insert(
      'cached_media',
      {
        'url': url,
        'lesson_id': lessonId,
        'file_path': file.path,
        'size': bytes.length,
        'mime_type': mimeType,
        'cached_at': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<File?> getCachedMedia(String url) async {
    final maps = await _db!.query(
      'cached_media',
      where: 'url = ?',
      whereArgs: [url],
    );

    if (maps.isEmpty) return null;

    final filePath = maps.first['file_path'] as String;
    final file = File(filePath);

    if (await file.exists()) {
      // Update last accessed time
      await _db!.update(
        'cached_media',
        {'last_accessed_at': DateTime.now().toIso8601String()},
        where: 'url = ?',
        whereArgs: [url],
      );
      return file;
    }

    // Cache miss - file was deleted
    await _db!.delete('cached_media', where: 'url = ?', whereArgs: [url]);
    return null;
  }

  Future<void> clearMediaCache(String? lessonId) async {
    String? whereClause;
    List<dynamic>? whereArgs;

    if (lessonId != null) {
      whereClause = 'lesson_id = ?';
      whereArgs = [lessonId];
    }

    final maps = await _db!.query(
      'cached_media',
      where: whereClause,
      whereArgs: whereArgs,
    );

    for (final map in maps) {
      final file = File(map['file_path'] as String);
      if (await file.exists()) {
        await file.delete();
      }
    }

    await _db!.delete(
      'cached_media',
      where: whereClause,
      whereArgs: whereArgs,
    );
  }

  /// Get total cache size
  Future<int> getCacheSize() async {
    final result = await _db!.rawQuery(
      'SELECT SUM(size) as total FROM cached_media',
    );
    return (result.first['total'] as int?) ?? 0;
  }

  /// Prune cache to fit within size limit
  Future<void> pruneCache(int maxSizeBytes) async {
    final currentSize = await getCacheSize();
    if (currentSize <= maxSizeBytes) return;

    // Get oldest accessed media
    final maps = await _db!.query(
      'cached_media',
      orderBy: 'last_accessed_at ASC, cached_at ASC',
    );

    int sizeToDelete = currentSize - maxSizeBytes;
    final urlsToDelete = <String>[];

    for (final map in maps) {
      if (sizeToDelete <= 0) break;

      final url = map['url'] as String;
      final size = map['size'] as int;
      final filePath = map['file_path'] as String;

      urlsToDelete.add(url);
      sizeToDelete -= size;

      // Delete file
      final file = File(filePath);
      if (await file.exists()) {
        await file.delete();
      }
    }

    // Delete from database
    if (urlsToDelete.isNotEmpty) {
      final placeholders = urlsToDelete.map((_) => '?').join(', ');
      await _db!.delete(
        'cached_media',
        where: 'url IN ($placeholders)',
        whereArgs: urlsToDelete,
      );
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  String? _getTableName(String entityType) {
    const mapping = {
      'lesson': 'lessons',
      'learning_session': 'learning_sessions',
      'response': 'responses',
      'skill_mastery': 'skill_mastery',
      'progress': 'progress',
      'lesson_completion': 'lesson_completions',
    };
    return mapping[entityType];
  }

  String _generateId() {
    return DateTime.now().microsecondsSinceEpoch.toRadixString(36) +
        (DateTime.now().hashCode & 0xFFFFFF).toRadixString(36);
  }

  String _hashUrl(String url) {
    return url.hashCode.toRadixString(36);
  }

  /// Close the database
  Future<void> close() async {
    await _db?.close();
    _db = null;
    _isInitialized = false;
    _instance = null;
  }

  /// Reset the database (for testing)
  Future<void> reset() async {
    await close();
    final documentsDir = await getApplicationDocumentsDirectory();
    final dbPath = path.join(documentsDir.path, 'aivo_learner.db');
    final file = File(dbPath);
    if (await file.exists()) {
      await file.delete();
    }
    await initialize();
  }
}

enum ChangeType { create, update, delete, upsert }

class LocalChange {
  final String id;
  final String entityType;
  final String entityId;
  final ChangeType changeType;
  final Map<String, dynamic> data;
  final DateTime changedAt;

  LocalChange({
    required this.id,
    required this.entityType,
    required this.entityId,
    required this.changeType,
    required this.data,
    required this.changedAt,
  });

  factory LocalChange.fromMap(Map<String, dynamic> map) {
    return LocalChange(
      id: map['id'] as String,
      entityType: map['entity_type'] as String,
      entityId: map['entity_id'] as String,
      changeType: ChangeType.values.firstWhere(
        (e) => e.name == map['change_type'],
      ),
      data: jsonDecode(map['data'] as String),
      changedAt: DateTime.parse(map['changed_at'] as String),
    );
  }
}
