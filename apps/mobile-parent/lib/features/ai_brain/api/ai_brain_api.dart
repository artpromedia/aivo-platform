/// AI Brain API
///
/// API endpoints for AI brain transparency data.
library;

import 'package:dio/dio.dart';

import '../models/ai_brain_state.dart';

/// API client for AI brain endpoints.
class AIBrainApi {
  AIBrainApi({required this.dio});

  final Dio dio;

  /// Fetch the current AI brain state for a child.
  Future<AIBrainState> fetchAIBrainState(String childId) async {
    final response = await dio.get('/ai/brain/$childId/state');
    return AIBrainState.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetch recent adaptations made for a child.
  Future<List<LearningAdaptation>> fetchRecentAdaptations(
    String childId, {
    int limit = 20,
  }) async {
    final response = await dio.get(
      '/ai/brain/$childId/adaptations',
      queryParameters: {'limit': limit},
    );
    final data = response.data as List;
    return data
        .map((json) => LearningAdaptation.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Fetch learning path for a subject.
  Future<LearningPath> fetchLearningPath(String childId, String subject) async {
    final response = await dio.get(
      '/ai/brain/$childId/learning-path',
      queryParameters: {'subject': subject},
    );
    return LearningPath.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetch AI decision log for a date range.
  Future<List<AIDecision>> fetchAIDecisionLog(
    String childId, {
    DateTime? startDate,
    DateTime? endDate,
    int limit = 50,
  }) async {
    final response = await dio.get(
      '/ai/brain/$childId/decisions',
      queryParameters: {
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
        'limit': limit,
      },
    );
    final data = response.data as List;
    return data
        .map((json) => AIDecision.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Fetch available subjects for a child.
  Future<List<SubjectInfo>> fetchSubjects(String childId) async {
    final response = await dio.get('/ai/brain/$childId/subjects');
    final data = response.data as List;
    return data
        .map((json) => SubjectInfo.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Fetch AI personality settings.
  Future<AIPersonality> fetchAIPersonality(String childId) async {
    final response = await dio.get('/ai/brain/$childId/personality');
    return AIPersonality.fromJson(response.data as Map<String, dynamic>);
  }
}
