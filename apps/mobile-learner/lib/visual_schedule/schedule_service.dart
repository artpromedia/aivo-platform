/// Schedule Service - ND-1.3
///
/// API client for visual schedule operations.

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'schedule_models.dart';

/// Service for interacting with the visual schedule API
class ScheduleService {
  final String baseUrl;
  final String Function() getAuthToken;
  final http.Client _client;

  ScheduleService({
    required this.baseUrl,
    required this.getAuthToken,
    http.Client? client,
  }) : _client = client ?? http.Client();

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${getAuthToken()}',
      };

  // ══════════════════════════════════════════════════════════════════════════
  // SCHEDULE OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  /// Get today's schedule for a learner
  Future<ScheduleWithProgress?> getTodaySchedule({
    required String learnerId,
    required String tenantId,
    ScheduleType? type,
  }) async {
    final queryParams = {
      'learnerId': learnerId,
      'tenantId': tenantId,
      if (type != null) 'type': _scheduleTypeToString(type),
    };

    final uri = Uri.parse('$baseUrl/schedules/today')
        .replace(queryParameters: queryParams);

    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode == 404) {
      return null;
    }

    if (response.statusCode != 200) {
      throw ScheduleServiceException(
        'Failed to get today\'s schedule',
        response.statusCode,
      );
    }

    return ScheduleWithProgress.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
    );
  }

  /// Get a schedule by ID
  Future<ScheduleWithProgress?> getScheduleById({
    required String scheduleId,
    required String learnerId,
  }) async {
    final uri = Uri.parse('$baseUrl/schedules/$scheduleId')
        .replace(queryParameters: {'learnerId': learnerId});

    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode == 404) {
      return null;
    }

    if (response.statusCode != 200) {
      throw ScheduleServiceException(
        'Failed to get schedule',
        response.statusCode,
      );
    }

    return ScheduleWithProgress.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
    );
  }

  /// Mark the current item as complete
  Future<ScheduleWithProgress> markCurrentAsComplete(String scheduleId) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/schedules/$scheduleId/complete-current'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw ScheduleServiceException(
        'Failed to complete current item',
        response.statusCode,
      );
    }

    return ScheduleWithProgress.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
    );
  }

  /// Skip the current item
  Future<ScheduleWithProgress> skipCurrentItem(String scheduleId) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/schedules/$scheduleId/skip-current'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw ScheduleServiceException(
        'Failed to skip current item',
        response.statusCode,
      );
    }

    return ScheduleWithProgress.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
    );
  }

  /// Update an item's status
  Future<ScheduleWithProgress> updateItemStatus({
    required String scheduleId,
    required String itemId,
    required ScheduleItemStatus status,
    int? actualDuration,
  }) async {
    final response = await _client.patch(
      Uri.parse('$baseUrl/schedules/$scheduleId/items/$itemId/status'),
      headers: _headers,
      body: jsonEncode({
        'status': _itemStatusToString(status),
        if (actualDuration != null) 'actualDuration': actualDuration,
      }),
    );

    if (response.statusCode != 200) {
      throw ScheduleServiceException(
        'Failed to update item status',
        response.statusCode,
      );
    }

    return ScheduleWithProgress.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PREFERENCES OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  /// Get or create preferences for a learner
  Future<SchedulePreferences> getPreferences({
    required String learnerId,
    required String tenantId,
  }) async {
    final uri = Uri.parse('$baseUrl/schedules/preferences/$learnerId')
        .replace(queryParameters: {'tenantId': tenantId});

    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode != 200) {
      throw ScheduleServiceException(
        'Failed to get preferences',
        response.statusCode,
      );
    }

    return SchedulePreferences.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
    );
  }

  /// Update learner preferences
  Future<SchedulePreferences> updatePreferences({
    required String learnerId,
    required Map<String, dynamic> updates,
  }) async {
    final response = await _client.patch(
      Uri.parse('$baseUrl/schedules/preferences/$learnerId'),
      headers: _headers,
      body: jsonEncode(updates),
    );

    if (response.statusCode != 200) {
      throw ScheduleServiceException(
        'Failed to update preferences',
        response.statusCode,
      );
    }

    return SchedulePreferences.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIVITY BREAKDOWN
  // ══════════════════════════════════════════════════════════════════════════

  /// Get activity breakdown steps
  Future<List<ScheduleSubItem>> getActivityBreakdown(
      String activityType) async {
    final response = await _client.get(
      Uri.parse('$baseUrl/schedules/activity-breakdown/$activityType'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw ScheduleServiceException(
        'Failed to get activity breakdown',
        response.statusCode,
      );
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final steps = json['steps'] as List<dynamic>;

    return steps
        .map((e) => ScheduleSubItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  String _scheduleTypeToString(ScheduleType type) {
    switch (type) {
      case ScheduleType.daily:
        return 'DAILY';
      case ScheduleType.session:
        return 'SESSION';
      case ScheduleType.activity:
        return 'ACTIVITY';
      case ScheduleType.custom:
        return 'CUSTOM';
    }
  }

  String _itemStatusToString(ScheduleItemStatus status) {
    switch (status) {
      case ScheduleItemStatus.upcoming:
        return 'upcoming';
      case ScheduleItemStatus.current:
        return 'current';
      case ScheduleItemStatus.completed:
        return 'completed';
      case ScheduleItemStatus.skipped:
        return 'skipped';
      case ScheduleItemStatus.inProgress:
        return 'in_progress';
    }
  }

  void dispose() {
    _client.close();
  }
}

/// Exception for schedule service errors
class ScheduleServiceException implements Exception {
  final String message;
  final int statusCode;

  ScheduleServiceException(this.message, this.statusCode);

  @override
  String toString() => 'ScheduleServiceException: $message (status: $statusCode)';
}
