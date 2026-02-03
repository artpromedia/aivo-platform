/// AI Controls API
///
/// API client for AI autonomy settings and approval requests.
library;

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/api/api_client.dart';
import '../models/ai_autonomy_settings.dart';

part 'ai_controls_api.g.dart';

/// Provider for the AI controls API client.
@riverpod
AIControlsApi aiControlsApi(Ref ref) {
  final dio = ref.watch(dioProvider);
  return AIControlsApi(dio);
}

/// API client for AI autonomy controls.
class AIControlsApi {
  AIControlsApi(this._dio);

  final Dio _dio;

  /// Fetch current autonomy settings for a child.
  Future<AIAutonomySettings> fetchAutonomySettings(String childId) async {
    final response = await _dio.get('/api/v1/children/$childId/ai-settings');
    return AIAutonomySettings.fromJson(response.data as Map<String, dynamic>);
  }

  /// Update autonomy settings for a child.
  Future<AIAutonomySettings> updateAutonomySettings(
    String childId,
    AIAutonomySettings settings,
  ) async {
    final response = await _dio.put(
      '/api/v1/children/$childId/ai-settings',
      data: settings.toJson(),
    );
    return AIAutonomySettings.fromJson(response.data as Map<String, dynamic>);
  }

  /// Update a specific category's autonomy level.
  Future<CategoryAutonomy> updateCategoryAutonomy(
    String childId,
    DecisionCategory category,
    CategoryAutonomy autonomy,
  ) async {
    final response = await _dio.patch(
      '/api/v1/children/$childId/ai-settings/categories/${category.name}',
      data: autonomy.toJson(),
    );
    return CategoryAutonomy.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetch pending approval requests for a child.
  Future<List<ApprovalRequest>> fetchPendingApprovals(String childId) async {
    final response = await _dio.get(
      '/api/v1/children/$childId/ai-approvals',
      queryParameters: {'status': 'pending'},
    );
    final list = response.data as List<dynamic>;
    return list
        .map((e) => ApprovalRequest.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Fetch all approval requests (including history).
  Future<List<ApprovalRequest>> fetchApprovalHistory(
    String childId, {
    int limit = 50,
    int offset = 0,
  }) async {
    final response = await _dio.get(
      '/api/v1/children/$childId/ai-approvals',
      queryParameters: {
        'limit': limit,
        'offset': offset,
      },
    );
    final list = response.data as List<dynamic>;
    return list
        .map((e) => ApprovalRequest.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Respond to an approval request.
  Future<ApprovalRequest> respondToApproval(
    String childId,
    String requestId, {
    required bool approved,
    String? comment,
  }) async {
    final response = await _dio.post(
      '/api/v1/children/$childId/ai-approvals/$requestId/respond',
      data: {
        'approved': approved,
        if (comment != null) 'comment': comment,
      },
    );
    return ApprovalRequest.fromJson(response.data as Map<String, dynamic>);
  }

  /// Add a new AI restriction.
  Future<AIRestriction> addRestriction(
    String childId,
    AIRestriction restriction,
  ) async {
    final response = await _dio.post(
      '/api/v1/children/$childId/ai-restrictions',
      data: restriction.toJson(),
    );
    return AIRestriction.fromJson(response.data as Map<String, dynamic>);
  }

  /// Update an existing restriction.
  Future<AIRestriction> updateRestriction(
    String childId,
    String restrictionId,
    AIRestriction restriction,
  ) async {
    final response = await _dio.put(
      '/api/v1/children/$childId/ai-restrictions/$restrictionId',
      data: restriction.toJson(),
    );
    return AIRestriction.fromJson(response.data as Map<String, dynamic>);
  }

  /// Delete a restriction.
  Future<void> deleteRestriction(String childId, String restrictionId) async {
    await _dio.delete('/api/v1/children/$childId/ai-restrictions/$restrictionId');
  }

  /// Fetch available autonomy presets.
  Future<List<AutonomyPreset>> fetchPresets() async {
    final response = await _dio.get('/api/v1/ai-settings/presets');
    final list = response.data as List<dynamic>;
    return list
        .map((e) => AutonomyPreset.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Apply a preset to a child's settings.
  Future<AIAutonomySettings> applyPreset(
    String childId,
    String presetId,
  ) async {
    final response = await _dio.post(
      '/api/v1/children/$childId/ai-settings/apply-preset',
      data: {'presetId': presetId},
    );
    return AIAutonomySettings.fromJson(response.data as Map<String, dynamic>);
  }

  /// Pause all AI activity for a child.
  Future<AIAutonomySettings> pauseAI(
    String childId, {
    DateTime? until,
    String? reason,
  }) async {
    final response = await _dio.post(
      '/api/v1/children/$childId/ai-settings/pause',
      data: {
        if (until != null) 'until': until.toIso8601String(),
        if (reason != null) 'reason': reason,
      },
    );
    return AIAutonomySettings.fromJson(response.data as Map<String, dynamic>);
  }

  /// Resume AI activity for a child.
  Future<AIAutonomySettings> resumeAI(String childId) async {
    final response = await _dio.post(
      '/api/v1/children/$childId/ai-settings/resume',
    );
    return AIAutonomySettings.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetch AI activity log.
  Future<List<AIActivityEntry>> fetchActivityLog(
    String childId, {
    int limit = 50,
    int offset = 0,
    DecisionCategory? category,
  }) async {
    final response = await _dio.get(
      '/api/v1/children/$childId/ai-activity',
      queryParameters: {
        'limit': limit,
        'offset': offset,
        if (category != null) 'category': category.name,
      },
    );
    final list = response.data as List<dynamic>;
    return list
        .map((e) => AIActivityEntry.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Update notification settings.
  Future<NotificationSettings> updateNotificationSettings(
    String childId,
    NotificationSettings settings,
  ) async {
    final response = await _dio.put(
      '/api/v1/children/$childId/ai-settings/notifications',
      data: settings.toJson(),
    );
    return NotificationSettings.fromJson(response.data as Map<String, dynamic>);
  }
}
