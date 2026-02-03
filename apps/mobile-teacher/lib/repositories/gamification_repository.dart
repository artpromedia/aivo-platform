/// Gamification Repository
///
/// Repository for gamification and challenge operations.
library;

import 'package:dio/dio.dart';

import '../models/gamification.dart';

/// Repository for gamification operations.
class GamificationRepository {
  GamificationRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  /// Fetch gamification settings for a class.
  Future<GamificationSettings> fetchSettings(String classId) async {
    final response = await _dio.get('/api/v1/classes/$classId/gamification');
    return GamificationSettings.fromJson(response.data as Map<String, dynamic>);
  }

  /// Update gamification settings.
  Future<GamificationSettings> updateSettings(GamificationSettings settings) async {
    final response = await _dio.put(
      '/api/v1/classes/${settings.classId}/gamification',
      data: settings.toJson(),
    );
    return GamificationSettings.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetch challenges for a class.
  Future<List<ClassChallenge>> fetchChallenges(String classId, {ChallengeStatus? status}) async {
    final response = await _dio.get(
      '/api/v1/classes/$classId/challenges',
      queryParameters: {
        if (status != null) 'status': status.value,
      },
    );
    final list = response.data as List<dynamic>;
    return list.map((e) => ClassChallenge.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Create a new challenge.
  Future<ClassChallenge> createChallenge(ClassChallenge challenge) async {
    final response = await _dio.post(
      '/api/v1/classes/${challenge.classId}/challenges',
      data: challenge.toJson(),
    );
    return ClassChallenge.fromJson(response.data as Map<String, dynamic>);
  }

  /// Update a challenge.
  Future<ClassChallenge> updateChallenge(ClassChallenge challenge) async {
    final response = await _dio.put(
      '/api/v1/classes/${challenge.classId}/challenges/${challenge.id}',
      data: challenge.toJson(),
    );
    return ClassChallenge.fromJson(response.data as Map<String, dynamic>);
  }

  /// Delete a challenge.
  Future<void> deleteChallenge(String classId, String challengeId) async {
    await _dio.delete('/api/v1/classes/$classId/challenges/$challengeId');
  }

  /// Start a challenge.
  Future<ClassChallenge> startChallenge(String classId, String challengeId) async {
    final response = await _dio.post('/api/v1/classes/$classId/challenges/$challengeId/start');
    return ClassChallenge.fromJson(response.data as Map<String, dynamic>);
  }

  /// End a challenge.
  Future<ClassChallenge> endChallenge(String classId, String challengeId) async {
    final response = await _dio.post('/api/v1/classes/$classId/challenges/$challengeId/end');
    return ClassChallenge.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetch leaderboard for a class.
  Future<List<LeaderboardEntry>> fetchLeaderboard(String classId, {int limit = 20}) async {
    final response = await _dio.get(
      '/api/v1/classes/$classId/leaderboard',
      queryParameters: {'limit': limit},
    );
    final list = response.data as List<dynamic>;
    return list.map((e) => LeaderboardEntry.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Award points to a student.
  Future<void> awardPoints(String classId, String studentId, int points, {String? reason}) async {
    await _dio.post(
      '/api/v1/classes/$classId/students/$studentId/points',
      data: {
        'points': points,
        if (reason != null) 'reason': reason,
      },
    );
  }

  /// Award a badge to a student.
  Future<void> awardBadge(String classId, String studentId, String badgeId) async {
    await _dio.post(
      '/api/v1/classes/$classId/students/$studentId/badges',
      data: {'badgeId': badgeId},
    );
  }

  /// Fetch available rewards.
  Future<List<Reward>> fetchAvailableRewards() async {
    final response = await _dio.get('/api/v1/rewards');
    final list = response.data as List<dynamic>;
    return list.map((e) => Reward.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Create custom reward.
  Future<Reward> createCustomReward(String classId, Reward reward) async {
    final response = await _dio.post(
      '/api/v1/classes/$classId/rewards',
      data: reward.toJson(),
    );
    return Reward.fromJson(response.data as Map<String, dynamic>);
  }
}
