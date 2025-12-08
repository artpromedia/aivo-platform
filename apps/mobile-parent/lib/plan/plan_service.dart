import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

const _baseUrl = String.fromEnvironment(
  'LEARNER_MODEL_BASE_URL',
  defaultValue: 'http://localhost:4015',
);

const _useMock = bool.fromEnvironment('USE_PLAN_MOCK', defaultValue: false);

/// Service for interacting with Virtual Brain Plan APIs.
class PlanService {
  PlanService({String? accessToken}) {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      headers: accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
    ));
  }

  late final Dio _dio;

  /// Get difficulty recommendation for a learner.
  Future<DifficultyRecommendationResponse> getDifficultyRecommendation(
    String learnerId, {
    String? domain,
    String? skillCode,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockDifficultyRecommendation(learnerId, domain: domain, skillCode: skillCode);
    }

    final queryParams = <String, dynamic>{};
    if (domain != null) queryParams['domain'] = domain;
    if (skillCode != null) queryParams['skillCode'] = skillCode;

    final response = await _dio.get(
      '/virtual-brains/$learnerId/difficulty-recommendation',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
    return DifficultyRecommendationResponse.fromJson(response.data as Map<String, dynamic>);
  }

  DifficultyRecommendationResponse _mockDifficultyRecommendation(
    String learnerId, {
    String? domain,
    String? skillCode,
  }) {
    final mastery = domain == 'MATH' ? 0.72 : 0.48;
    final recommendation = mastery > 0.7
        ? DifficultyRecommendation.harder
        : mastery < 0.4
            ? DifficultyRecommendation.easier
            : DifficultyRecommendation.same;

    return DifficultyRecommendationResponse(
      learnerId: learnerId,
      recommendation: recommendation,
      reason: recommendation == DifficultyRecommendation.harder
          ? 'Great progress lately. Let’s introduce more challenge.'
          : recommendation == DifficultyRecommendation.easier
              ? 'Accuracy dipped; easing difficulty to rebuild confidence.'
              : 'Current level is working; keep consistency.',
      currentMastery: mastery,
      recentPerformance: const RecentPerformance(
        totalAttempts: 20,
        correctCount: 14,
        correctRate: 0.7,
      ),
      suggestedDifficultyLevel: recommendation == DifficultyRecommendation.harder
          ? 4
          : recommendation == DifficultyRecommendation.easier
              ? 2
              : 3,
      scopeDomain: domain,
      scopeSkillCode: skillCode,
    );
  }
}

/// Provider for PlanService.
final planServiceProvider = Provider<PlanService>((ref) => PlanService());

/// Provider for fetching difficulty recommendation for a learner.
final difficultyRecommendationProvider =
    FutureProvider.family<DifficultyRecommendationResponse, String>(
  (ref, learnerId) async {
    final service = ref.read(planServiceProvider);
    return service.getDifficultyRecommendation(learnerId);
  },
);
