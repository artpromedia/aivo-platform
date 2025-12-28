import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../sync/sync_models.dart';

/// Media download response
class MediaDownloadResponse {
  final Uint8List bytes;
  final String? mimeType;
  final int size;

  MediaDownloadResponse({
    required this.bytes,
    this.mimeType,
    required this.size,
  });
}

/// Push changes response
class PushChangesResponse {
  final List<PushResult> results;

  PushChangesResponse({required this.results});

  factory PushChangesResponse.fromJson(Map<String, dynamic> json) {
    return PushChangesResponse(
      results: (json['results'] as List)
          .map((r) => PushResult.fromJson(r as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Individual push result
class PushResult {
  final String operationId;
  final bool success;
  final String? error;
  final ServerConflict? conflict;

  PushResult({
    required this.operationId,
    required this.success,
    this.error,
    this.conflict,
  });

  factory PushResult.fromJson(Map<String, dynamic> json) {
    return PushResult(
      operationId: json['operationId'] as String,
      success: json['success'] as bool,
      error: json['error'] as String?,
      conflict: json['conflict'] != null
          ? ServerConflict.fromJson(json['conflict'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// Pull changes response
class PullChangesResponse {
  final List<ServerChange> changes;
  final String? nextCursor;
  final DateTime serverTime;

  PullChangesResponse({
    required this.changes,
    this.nextCursor,
    required this.serverTime,
  });

  factory PullChangesResponse.fromJson(Map<String, dynamic> json) {
    return PullChangesResponse(
      changes: (json['changes'] as List)
          .map((c) => ServerChange.fromJson(c as Map<String, dynamic>))
          .toList(),
      nextCursor: json['nextCursor'] as String?,
      serverTime: DateTime.parse(json['serverTime'] as String),
    );
  }
}

/// API Client for sync operations
///
/// Handles all network communication with the sync service
class ApiClient {
  final Dio _dio;
  final String _baseUrl;
  String? _authToken;

  ApiClient({
    required String baseUrl,
    String? authToken,
    Dio? dio,
  })  : _baseUrl = baseUrl,
        _authToken = authToken,
        _dio = dio ?? Dio() {
    _setupInterceptors();
  }

  void _setupInterceptors() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_authToken != null) {
          options.headers['Authorization'] = 'Bearer $_authToken';
        }
        options.headers['Content-Type'] = 'application/json';
        return handler.next(options);
      },
      onError: (error, handler) {
        debugPrint('[ApiClient] Error: ${error.message}');
        return handler.next(error);
      },
    ));
  }

  /// Set authentication token
  void setAuthToken(String token) {
    _authToken = token;
  }

  /// Clear authentication token
  void clearAuthToken() {
    _authToken = null;
  }

  // ============================================================================
  // SYNC API
  // ============================================================================

  /// Push local changes to server
  Future<PushChangesResponse> pushChanges({
    required List<Map<String, dynamic>> operations,
    required String deviceId,
  }) async {
    final response = await _dio.post(
      '$_baseUrl/api/sync/push',
      data: {
        'operations': operations,
        'deviceId': deviceId,
      },
    );

    return PushChangesResponse.fromJson(response.data);
  }

  /// Push a single change to server
  Future<void> pushSingleChange({
    required Map<String, dynamic> operation,
    required String deviceId,
  }) async {
    await _dio.post(
      '$_baseUrl/api/sync/push/single',
      data: {
        'operation': operation,
        'deviceId': deviceId,
      },
    );
  }

  /// Pull changes from server
  Future<PullChangesResponse> pullChanges({
    DateTime? since,
    String? cursor,
    int limit = 50,
    required String deviceId,
  }) async {
    final response = await _dio.get(
      '$_baseUrl/api/sync/pull',
      queryParameters: {
        if (since != null) 'since': since.toIso8601String(),
        if (cursor != null) 'cursor': cursor,
        'limit': limit,
        'deviceId': deviceId,
      },
    );

    return PullChangesResponse.fromJson(response.data);
  }

  /// Get delta changes since a timestamp
  Future<List<ServerChange>> getDeltaChanges({
    DateTime? since,
    required String deviceId,
  }) async {
    final response = await _dio.get(
      '$_baseUrl/api/sync/delta',
      queryParameters: {
        if (since != null) 'since': since.toIso8601String(),
        'deviceId': deviceId,
      },
    );

    return (response.data['changes'] as List)
        .map((c) => ServerChange.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  /// Resolve a conflict on the server
  Future<void> resolveConflict({
    required String operationId,
    required Map<String, dynamic> resolution,
    required String deviceId,
  }) async {
    await _dio.post(
      '$_baseUrl/api/sync/resolve',
      data: {
        'operationId': operationId,
        'resolution': resolution,
        'deviceId': deviceId,
      },
    );
  }

  // ============================================================================
  // LESSON API
  // ============================================================================

  /// Get a lesson by ID
  Future<Lesson> getLesson(
    String lessonId, {
    bool includeMedia = false,
    bool includeBlocks = true,
  }) async {
    final response = await _dio.get(
      '$_baseUrl/api/lessons/$lessonId',
      queryParameters: {
        'includeMedia': includeMedia,
        'includeBlocks': includeBlocks,
      },
    );

    final data = response.data as Map<String, dynamic>;
    final blocks = (data['blocks'] as List?)
            ?.map((b) => LessonBlock.fromMap(_convertToSnakeCase(b)))
            .toList() ??
        [];

    return Lesson.fromMap(_convertToSnakeCase(data), blocks: blocks);
  }

  /// Get lessons available for offline
  Future<List<Lesson>> getAvailableLessons({
    String? courseId,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _dio.get(
      '$_baseUrl/api/lessons',
      queryParameters: {
        if (courseId != null) 'courseId': courseId,
        'page': page,
        'limit': limit,
      },
    );

    return (response.data['lessons'] as List).map((l) {
      final data = _convertToSnakeCase(l as Map<String, dynamic>);
      return Lesson.fromMap(data);
    }).toList();
  }

  // ============================================================================
  // MEDIA API
  // ============================================================================

  /// Download media file
  Future<MediaDownloadResponse> downloadMedia(String url) async {
    final response = await _dio.get<List<int>>(
      url,
      options: Options(
        responseType: ResponseType.bytes,
      ),
    );

    final contentType = response.headers.value('content-type');

    return MediaDownloadResponse(
      bytes: Uint8List.fromList(response.data!),
      mimeType: contentType,
      size: response.data!.length,
    );
  }

  /// Download media with progress callback
  Future<MediaDownloadResponse> downloadMediaWithProgress(
    String url, {
    void Function(int received, int total)? onProgress,
    CancelToken? cancelToken,
  }) async {
    final response = await _dio.get<List<int>>(
      url,
      options: Options(
        responseType: ResponseType.bytes,
      ),
      onReceiveProgress: onProgress,
      cancelToken: cancelToken,
    );

    final contentType = response.headers.value('content-type');

    return MediaDownloadResponse(
      bytes: Uint8List.fromList(response.data!),
      mimeType: contentType,
      size: response.data!.length,
    );
  }

  // ============================================================================
  // SESSION API
  // ============================================================================

  /// Create or resume a learning session
  Future<Map<String, dynamic>> createSession({
    required String lessonId,
    required String studentId,
  }) async {
    final response = await _dio.post(
      '$_baseUrl/api/sessions',
      data: {
        'lessonId': lessonId,
        'studentId': studentId,
      },
    );

    return response.data;
  }

  /// Update session progress
  Future<void> updateSessionProgress({
    required String sessionId,
    required double progress,
    required int timeSpentSeconds,
    int? currentBlockIndex,
  }) async {
    await _dio.patch(
      '$_baseUrl/api/sessions/$sessionId/progress',
      data: {
        'progress': progress,
        'timeSpentSeconds': timeSpentSeconds,
        if (currentBlockIndex != null) 'currentBlockIndex': currentBlockIndex,
      },
    );
  }

  /// Complete a session
  Future<void> completeSession({
    required String sessionId,
    required double score,
    required int timeSpentSeconds,
  }) async {
    await _dio.post(
      '$_baseUrl/api/sessions/$sessionId/complete',
      data: {
        'score': score,
        'timeSpentSeconds': timeSpentSeconds,
      },
    );
  }

  // ============================================================================
  // RESPONSE API
  // ============================================================================

  /// Submit a response
  Future<Map<String, dynamic>> submitResponse({
    required String sessionId,
    required String blockId,
    required Map<String, dynamic> responseData,
    int? timeSpentSeconds,
  }) async {
    final response = await _dio.post(
      '$_baseUrl/api/responses',
      data: {
        'sessionId': sessionId,
        'blockId': blockId,
        'responseData': responseData,
        if (timeSpentSeconds != null) 'timeSpentSeconds': timeSpentSeconds,
      },
    );

    return response.data;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /// Convert camelCase keys to snake_case
  Map<String, dynamic> _convertToSnakeCase(Map<String, dynamic> data) {
    return data.map((key, value) {
      final snakeKey = key.replaceAllMapped(
        RegExp(r'[A-Z]'),
        (match) => '_${match.group(0)!.toLowerCase()}',
      );
      return MapEntry(
        snakeKey.startsWith('_') ? snakeKey.substring(1) : snakeKey,
        value is Map<String, dynamic> ? _convertToSnakeCase(value) : value,
      );
    });
  }

  /// Dispose resources
  void dispose() {
    _dio.close();
  }
}
