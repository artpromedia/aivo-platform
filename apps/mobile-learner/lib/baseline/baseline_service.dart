import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

const _baseUrl = String.fromEnvironment('BASELINE_BASE_URL', defaultValue: 'http://localhost:4003');
const _useBaselineMock = bool.fromEnvironment('USE_BASELINE_MOCK', defaultValue: true);

/// Exception thrown by baseline API operations.
class BaselineException implements Exception {
  const BaselineException(this.message, {this.code});
  final String message;
  final int? code;

  @override
  String toString() => message;
}

/// Service for baseline assessment API calls in the learner app.
class LearnerBaselineService {
  LearnerBaselineService({String? accessToken})
      : _dio = Dio(BaseOptions(
          baseUrl: _baseUrl,
          headers: accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
        ));

  final Dio _dio;

  /// Get baseline profile by learner ID.
  /// GET /baseline/profiles/by-learner?learnerId=...
  Future<BaselineProfile?> getProfileByLearner(String learnerId) async {
    if (_useBaselineMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      // Deterministic mock state based on learnerId for consistent testing
      final mockState = learnerId.hashCode.abs() % 4;
      switch (mockState) {
        case 0:
          return null; // No profile yet
        case 1:
          return BaselineProfile(
            id: 'mock-profile-$learnerId',
            tenantId: 'tenant-1',
            learnerId: learnerId,
            gradeBand: 'K5',
            status: BaselineProfileStatus.notStarted,
            attemptCount: 0,
          );
        case 2:
          return BaselineProfile(
            id: 'mock-profile-$learnerId',
            tenantId: 'tenant-1',
            learnerId: learnerId,
            gradeBand: 'K5',
            status: BaselineProfileStatus.inProgress,
            attemptCount: 1,
            attempts: [
              BaselineAttempt(
                id: 'mock-attempt-1',
                attemptNumber: 1,
                startedAt: DateTime.now().subtract(const Duration(minutes: 10)),
              ),
            ],
          );
        default:
          return BaselineProfile(
            id: 'mock-profile-$learnerId',
            tenantId: 'tenant-1',
            learnerId: learnerId,
            gradeBand: 'K5',
            status: BaselineProfileStatus.finalAccepted,
            attemptCount: 1,
          );
      }
    }

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/baseline/profiles/by-learner',
        queryParameters: {'learnerId': learnerId},
      );
      if (response.statusCode == 404 || response.data == null) {
        return null;
      }
      return BaselineProfile.fromJson(response.data!);
    } on DioException catch (err) {
      if (err.response?.statusCode == 404) {
        return null;
      }
      throw _handleError(err);
    }
  }

  /// Get next unanswered item.
  /// GET /baseline/attempts/:attemptId/next
  Future<NextItemResponse> getNextItem(String attemptId) async {
    if (_useBaselineMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return _mockNextItem(attemptId);
    }

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/baseline/attempts/$attemptId/next',
      );
      return NextItemResponse.fromJson(response.data ?? {});
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Submit an answer for an item.
  /// POST /baseline/items/:itemId/answer
  Future<AnswerResponse> submitAnswer({
    required String itemId,
    required dynamic response,
    int? latencyMs,
  }) async {
    if (_useBaselineMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return AnswerResponse(
        responseId: 'mock-response-${DateTime.now().millisecondsSinceEpoch}',
        isCorrect: true,
        score: 1.0,
      );
    }

    try {
      final apiResponse = await _dio.post<Map<String, dynamic>>(
        '/baseline/items/$itemId/answer',
        data: {
          'response': response,
          if (latencyMs != null) 'latencyMs': latencyMs,
        },
      );
      return AnswerResponse.fromJson(apiResponse.data ?? {});
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Complete a baseline attempt.
  /// POST /baseline/attempts/:attemptId/complete
  Future<CompleteAttemptResponse> completeAttempt(String attemptId) async {
    if (_useBaselineMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return CompleteAttemptResponse(
        attemptId: attemptId,
        status: 'COMPLETED',
        score: 0.8,
        domainScores: [
          const DomainScore(domain: BaselineDomain.ela, correct: 4, total: 5, percentage: 0.8),
          const DomainScore(domain: BaselineDomain.math, correct: 5, total: 5, percentage: 1.0),
          const DomainScore(domain: BaselineDomain.science, correct: 3, total: 5, percentage: 0.6),
          const DomainScore(domain: BaselineDomain.speech, correct: 4, total: 5, percentage: 0.8),
          const DomainScore(domain: BaselineDomain.sel, correct: 4, total: 5, percentage: 0.8),
        ],
      );
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/baseline/attempts/$attemptId/complete',
      );
      return CompleteAttemptResponse.fromJson(response.data ?? {});
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  BaselineException _handleError(DioException err) {
    final data = err.response?.data;
    String message = 'Network error. Please try again.';
    if (data is Map && data['error'] != null) {
      message = data['error'].toString();
    }
    return BaselineException(message, code: err.response?.statusCode);
  }

  // --- Mock helpers ---

  static int _mockSequence = 0;

  NextItemResponse _mockNextItem(String attemptId) {
    _mockSequence++;
    if (_mockSequence > 25) {
      _mockSequence = 0;
      return const NextItemResponse(
        complete: true,
        message: 'All items answered. Call complete endpoint.',
      );
    }

    final domains = BaselineDomain.values;
    final domain = domains[(_mockSequence - 1) % domains.length];

    return NextItemResponse(
      complete: false,
      item: BaselineItem(
        itemId: 'mock-item-$_mockSequence',
        sequence: _mockSequence,
        totalItems: 25,
        domain: domain,
        skillCode: '${domain.code}.SKILL.${(_mockSequence - 1) ~/ 5 + 1}',
        questionType: _mockSequence % 4 == 0 ? 'OPEN_ENDED' : 'MULTIPLE_CHOICE',
        questionText: _mockQuestionText(domain, _mockSequence),
        options: _mockSequence % 4 == 0
            ? null
            : ['Answer A', 'Answer B', 'Answer C', 'Answer D'],
      ),
    );
  }

  String _mockQuestionText(BaselineDomain domain, int seq) {
    switch (domain) {
      case BaselineDomain.ela:
        return 'Read the sentence and choose the best word to complete it: "The cat ___ on the mat."';
      case BaselineDomain.math:
        return 'What is 7 + 5?';
      case BaselineDomain.science:
        return 'Which of these is a living thing?';
      case BaselineDomain.speech:
        return 'Which word rhymes with "cat"?';
      case BaselineDomain.sel:
        return 'What should you do when you feel frustrated?';
    }
  }

  /// Reset mock state (for testing).
  static void resetMockState() {
    _mockSequence = 0;
  }
}

/// Provider for the learner baseline service.
final learnerBaselineServiceProvider = Provider<LearnerBaselineService>((_) => LearnerBaselineService());
