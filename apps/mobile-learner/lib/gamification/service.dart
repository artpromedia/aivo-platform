/// Gamification API service
///
/// Communicates with the gamification-svc mobile endpoints for
/// badges, profiles, and badge progress.
library;

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/environment.dart';
import 'models.dart';

/// Service for gamification-svc mobile API
class GamificationService {
  GamificationService(this._dio, {required this.baseUrl});

  final Dio _dio;
  final String baseUrl;

  /// Get all available badges (GET /gamification/badges)
  Future<List<GamificationBadge>> getAllBadges() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '$baseUrl/gamification/badges',
    );
    final badges = (response.data!['badges'] as List<dynamic>)
        .map((b) => GamificationBadge.fromJson(b as Map<String, dynamic>))
        .toList();
    return badges;
  }

  /// Get earned badges for a learner (GET /gamification/:learnerId/badges)
  Future<List<EarnedBadge>> getEarnedBadges({
    required String learnerId,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '$baseUrl/gamification/$learnerId/badges',
    );
    final badges = (response.data!['badges'] as List<dynamic>)
        .map((b) => EarnedBadge.fromJson(b as Map<String, dynamic>))
        .toList();
    return badges;
  }

  /// Get gamification profile (GET /gamification/:learnerId/profile)
  Future<GamificationProfile> getProfile({
    required String learnerId,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '$baseUrl/gamification/$learnerId/profile',
    );
    return GamificationProfile.fromJson(response.data!);
  }

  /// Get progress for a specific badge (GET /gamification/:learnerId/badges/:badgeId/progress)
  Future<GamificationBadgeProgress> getBadgeProgress({
    required String learnerId,
    required String badgeId,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '$baseUrl/gamification/$learnerId/badges/$badgeId/progress',
    );
    return GamificationBadgeProgress.fromJson(response.data!);
  }
}

/// Provider for the gamification service
final gamificationServiceProvider = Provider<GamificationService>((ref) {
  final dio = Dio();
  return GamificationService(
    dio,
    baseUrl: EnvironmentConfig.gamificationBaseUrl,
  );
});
