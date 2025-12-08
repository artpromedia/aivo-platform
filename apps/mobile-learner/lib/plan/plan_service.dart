import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

const _baseUrl = String.fromEnvironment('LEARNER_MODEL_BASE_URL', defaultValue: 'http://localhost:4015');
const _usePlanMock = bool.fromEnvironment('USE_PLAN_MOCK', defaultValue: true);

/// Exception thrown by plan API operations.
class PlanException implements Exception {
  const PlanException(this.message, {this.code});
  final String message;
  final int? code;

  @override
  String toString() => message;
}

/// Service for Today's Plan and Virtual Brain API calls.
class PlanService {
  PlanService({String? accessToken})
      : _dio = Dio(BaseOptions(
          baseUrl: _baseUrl,
          headers: accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
        ));

  final Dio _dio;

  /// Generate today's plan for a learner.
  /// POST /virtual-brains/:learnerId/todays-plan
  Future<TodaysPlan> generateTodaysPlan(
    String learnerId, {
    int? maxActivities,
    List<String>? includeDomains,
    bool useAiPlanner = false,
  }) async {
    if (_usePlanMock) {
      await Future.delayed(const Duration(milliseconds: 500));
      return _mockTodaysPlan(learnerId);
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/virtual-brains/$learnerId/todays-plan',
        data: {
          if (maxActivities != null) 'maxActivities': maxActivities,
          if (includeDomains != null) 'includeDomains': includeDomains,
          'useAiPlanner': useAiPlanner,
        },
      );

      if (response.data == null) {
        throw const PlanException('No plan data returned');
      }

      return TodaysPlan.fromJson(response.data!);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get difficulty recommendation for a learner.
  /// GET /virtual-brains/:learnerId/difficulty-recommendation
  Future<DifficultyRecommendationResponse> getDifficultyRecommendation(
    String learnerId, {
    String? domain,
    String? skillCode,
  }) async {
    if (_usePlanMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockDifficultyRecommendation(learnerId, domain: domain);
    }

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/virtual-brains/$learnerId/difficulty-recommendation',
        queryParameters: {
          if (domain != null) 'domain': domain,
          if (skillCode != null) 'skillCode': skillCode,
        },
      );

      if (response.data == null) {
        throw const PlanException('No recommendation data returned');
      }

      return DifficultyRecommendationResponse.fromJson(response.data!);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  PlanException _handleError(DioException err) {
    final statusCode = err.response?.statusCode;
    final message = err.response?.data is Map
        ? (err.response?.data as Map)['error']?.toString() ?? err.message
        : err.message ?? 'Network error';
    return PlanException(message ?? 'Unknown error', code: statusCode);
  }

  /// Mock today's plan for development/testing.
  TodaysPlan _mockTodaysPlan(String learnerId) {
    return TodaysPlan(
      learnerId: learnerId,
      planDate: DateTime.now().toIso8601String().split('T')[0],
      totalMinutes: 45,
      activities: [
        const TodaysPlanActivity(
          activityId: 'activity-1',
          skillCode: 'ELA_PHONEMIC_AWARENESS',
          skillDisplayName: 'Phonemic Awareness',
          domain: 'ELA',
          difficultyLevel: 2,
          objectType: LearningObjectType.lesson,
          title: 'Sound Patterns',
          description: 'Learn to identify beginning and ending sounds in words.',
          estimatedMinutes: 15,
          contentUrl: null,
          currentMastery: 0.35,
          reason: ActivityReason.focusArea,
        ),
        const TodaysPlanActivity(
          activityId: 'activity-2',
          skillCode: 'MATH_NUMBER_SENSE',
          skillDisplayName: 'Number Sense',
          domain: 'MATH',
          difficultyLevel: 3,
          objectType: LearningObjectType.exercise,
          title: 'Number Bonds to 10',
          description: 'Practice different ways to make 10.',
          estimatedMinutes: 10,
          contentUrl: null,
          currentMastery: 0.55,
          reason: ActivityReason.practice,
        ),
        const TodaysPlanActivity(
          activityId: 'activity-3',
          skillCode: 'SCI_OBSERVATION',
          skillDisplayName: 'Scientific Observation',
          domain: 'SCIENCE',
          difficultyLevel: 2,
          objectType: LearningObjectType.video,
          title: 'Watching the Weather',
          description: 'Learn to observe and record weather patterns.',
          estimatedMinutes: 10,
          contentUrl: null,
          currentMastery: 0.45,
          reason: ActivityReason.practice,
        ),
        const TodaysPlanActivity(
          activityId: 'activity-4',
          skillCode: 'SEL_SELF_AWARENESS',
          skillDisplayName: 'Self-Awareness',
          domain: 'SEL',
          difficultyLevel: 1,
          objectType: LearningObjectType.game,
          title: 'Feelings Check-In',
          description: 'Identify and name your emotions.',
          estimatedMinutes: 10,
          contentUrl: null,
          currentMastery: 0.60,
          reason: ActivityReason.practice,
        ),
      ],
      focusAreas: const [
        FocusArea(domain: 'ELA', skillCount: 1, avgMastery: 0.35),
        FocusArea(domain: 'MATH', skillCount: 1, avgMastery: 0.55),
        FocusArea(domain: 'SCIENCE', skillCount: 1, avgMastery: 0.45),
        FocusArea(domain: 'SEL', skillCount: 1, avgMastery: 0.60),
      ],
      aiPlannerUsed: false,
    );
  }

  /// Mock difficulty recommendation for development/testing.
  DifficultyRecommendationResponse _mockDifficultyRecommendation(
    String learnerId, {
    String? domain,
  }) {
    // Vary recommendation based on domain for testing
    final mastery = domain == 'MATH' ? 0.72 : 0.45;
    final recommendation = mastery > 0.7
        ? DifficultyRecommendation.harder
        : mastery < 0.4
            ? DifficultyRecommendation.easier
            : DifficultyRecommendation.same;

    return DifficultyRecommendationResponse(
      learnerId: learnerId,
      recommendation: recommendation,
      reason: mastery > 0.7
          ? 'Great progress! Ready for more challenging content.'
          : mastery < 0.4
              ? 'Let\'s build confidence with easier content.'
              : 'Current difficulty is working well. Keep it up!',
      currentMastery: mastery,
      recentPerformance: const RecentPerformance(
        totalAttempts: 25,
        correctCount: 18,
        correctRate: 0.72,
      ),
      suggestedDifficultyLevel: mastery > 0.7 ? 4 : mastery < 0.4 ? 2 : 3,
      scopeDomain: domain,
      scopeSkillCode: null,
    );
  }
}

/// Provider for the plan service.
final planServiceProvider = Provider.family<PlanService, String?>((ref, accessToken) {
  return PlanService(accessToken: accessToken);
});
