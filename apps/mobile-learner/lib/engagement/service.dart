/// Engagement service for API communication
library;

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'models.dart';

/// Engagement API service
class EngagementService {
  EngagementService(this._dio, {required this.baseUrl});

  final Dio _dio;
  final String baseUrl;

  /// Get engagement profile for a learner
  Future<EngagementProfile> getEngagement({
    required String tenantId,
    required String learnerId,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '$baseUrl/engagement/$learnerId',
      queryParameters: {'tenantId': tenantId},
    );
    return EngagementProfile.fromJson(response.data!);
  }

  /// Get earned badges for a learner
  Future<List<LearnerBadge>> getLearnerBadges({
    required String tenantId,
    required String learnerId,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '$baseUrl/learners/$learnerId/badges',
      queryParameters: {'tenantId': tenantId},
    );
    final badges = (response.data!['badges'] as List<dynamic>)
        .map((b) => LearnerBadge.fromJson(b as Map<String, dynamic>))
        .toList();
    return badges;
  }

  /// Get badge progress for a learner
  Future<List<BadgeProgress>> getBadgeProgress({
    required String tenantId,
    required String learnerId,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '$baseUrl/learners/$learnerId/badges/progress',
      queryParameters: {'tenantId': tenantId},
    );
    final badges = (response.data!['badges'] as List<dynamic>)
        .map((b) => BadgeProgress.fromJson(b as Map<String, dynamic>))
        .toList();
    return badges;
  }

  /// Get unseen badges (newly awarded)
  Future<List<LearnerBadge>> getUnseenBadges({
    required String tenantId,
    required String learnerId,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '$baseUrl/learners/$learnerId/badges/unseen',
      queryParameters: {'tenantId': tenantId},
    );
    final badges = (response.data!['badges'] as List<dynamic>)
        .map((b) => LearnerBadge.fromJson(b as Map<String, dynamic>))
        .toList();
    return badges;
  }

  /// Mark a badge as seen
  Future<void> markBadgeSeen({
    required String tenantId,
    required String learnerId,
    required String badgeCode,
    required String learnerBadgeId,
  }) async {
    await _dio.post<void>(
      '$baseUrl/learners/$learnerId/badges/$badgeCode/seen',
      data: {
        'tenantId': tenantId,
        'learnerBadgeId': learnerBadgeId,
      },
    );
  }

  /// Get kudos for a learner
  Future<List<Kudos>> getKudos({
    required String tenantId,
    required String learnerId,
    int limit = 20,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '$baseUrl/learners/$learnerId/kudos',
      queryParameters: {'tenantId': tenantId, 'limit': limit},
    );
    final kudos = (response.data!['kudos'] as List<dynamic>)
        .map((k) => Kudos.fromJson(k as Map<String, dynamic>))
        .toList();
    return kudos;
  }

  /// Get effective settings for a learner
  Future<EffectiveSettings> getEffectiveSettings({
    required String tenantId,
    required String learnerId,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '$baseUrl/gamification/effective-settings',
      queryParameters: {'tenantId': tenantId, 'learnerId': learnerId},
    );
    return EffectiveSettings.fromJson(response.data!);
  }

  /// Update learner engagement preferences
  Future<void> updatePreferences({
    required String tenantId,
    required String learnerId,
    RewardStyle? preferredRewardStyle,
    bool? muteCelebrations,
    bool? reducedVisuals,
    bool? showBadges,
    bool? showStreaks,
    bool? showXp,
  }) async {
    final data = <String, dynamic>{'tenantId': tenantId};
    if (preferredRewardStyle != null) {
      data['preferredRewardStyle'] = preferredRewardStyle.name.toUpperCase();
    }
    if (muteCelebrations != null) data['muteCelebrations'] = muteCelebrations;
    if (reducedVisuals != null) data['reducedVisuals'] = reducedVisuals;
    if (showBadges != null) data['showBadges'] = showBadges;
    if (showStreaks != null) data['showStreaks'] = showStreaks;
    if (showXp != null) data['showXp'] = showXp;

    await _dio.patch<void>(
      '$baseUrl/learners/$learnerId/engagement-preferences',
      data: data,
    );
  }
}

/// Provider for the engagement service
final engagementServiceProvider = Provider<EngagementService>((ref) {
  // In a real app, Dio and baseUrl would be configured via environment
  final dio = Dio();
  const baseUrl = String.fromEnvironment(
    'ENGAGEMENT_API_URL',
    defaultValue: 'http://localhost:3000',
  );
  return EngagementService(dio, baseUrl: baseUrl);
});
