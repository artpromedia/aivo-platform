import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

const _baseUrl = String.fromEnvironment(
  'LEARNER_MODEL_API_URL',
  defaultValue: 'http://localhost:4015/api',
);

const _useMock = bool.fromEnvironment('USE_PLAN_MOCK', defaultValue: true);

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
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 500));
      return _mockDifficultyRecommendation(domain);
    }

    final queryParams = <String, dynamic>{};
    if (domain != null) queryParams['domain'] = domain;

    final response = await _dio.get(
      '/virtual-brains/$learnerId/difficulty-recommendation',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
    return DifficultyRecommendationResponse.fromJson(response.data);
  }

  DifficultyRecommendationResponse _mockDifficultyRecommendation(String? domain) {
    // Mock shows some domains recommending increase, some decrease
    return DifficultyRecommendationResponse(
      learnerId: 'mock-learner-id',
      overall: DifficultyRecommendation.increase,
      currentDifficultyBand: 2,
      suggestedDifficultyBand: 3,
      byDomain: {
        'READING_FOUNDATIONS': const DomainRecommendation(
          recommendation: DifficultyRecommendation.increase,
          avgMastery: 0.85,
          activitiesCompleted: 12,
          currentBand: 2,
          suggestedBand: 3,
        ),
        'READING_COMPREHENSION': const DomainRecommendation(
          recommendation: DifficultyRecommendation.maintain,
          avgMastery: 0.55,
          activitiesCompleted: 8,
          currentBand: 2,
          suggestedBand: 2,
        ),
        'NUMBER_SENSE': const DomainRecommendation(
          recommendation: DifficultyRecommendation.decrease,
          avgMastery: 0.32,
          activitiesCompleted: 6,
          currentBand: 3,
          suggestedBand: 2,
        ),
        'OPERATIONS': const DomainRecommendation(
          recommendation: DifficultyRecommendation.maintain,
          avgMastery: 0.60,
          activitiesCompleted: 10,
          currentBand: 2,
          suggestedBand: 2,
        ),
        'PROBLEM_SOLVING': const DomainRecommendation(
          recommendation: DifficultyRecommendation.increase,
          avgMastery: 0.78,
          activitiesCompleted: 5,
          currentBand: 2,
          suggestedBand: 3,
        ),
      },
    );
  }
}

/// Provider for PlanService.
final planServiceProvider = Provider<PlanService>((ref) => PlanService());

/// Provider for fetching difficulty recommendation for a learner.
final difficultyRecommendationProvider = FutureProvider.family<DifficultyRecommendationResponse, String>(
  (ref, learnerId) async {
    final service = ref.read(planServiceProvider);
    return service.getDifficultyRecommendation(learnerId);
  },
);
