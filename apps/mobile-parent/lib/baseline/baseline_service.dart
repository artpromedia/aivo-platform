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

/// Service for baseline assessment API calls.
class BaselineService {
  BaselineService({String? accessToken})
      : _dio = Dio(BaseOptions(
          baseUrl: _baseUrl,
          headers: accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
        ));

  final Dio _dio;

  /// Create a new baseline profile for a learner.
  /// POST /baseline/profiles
  Future<BaselineProfile> createProfile({
    required String tenantId,
    required String learnerId,
    required String gradeBand,
  }) async {
    if (_useBaselineMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return BaselineProfile(
        id: 'mock-profile-${learnerId.hashCode}',
        tenantId: tenantId,
        learnerId: learnerId,
        gradeBand: gradeBand,
        status: BaselineProfileStatus.notStarted,
        attemptCount: 0,
      );
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/baseline/profiles',
        data: {
          'tenantId': tenantId,
          'learnerId': learnerId,
          'gradeBand': gradeBand,
        },
      );
      return BaselineProfile.fromJson(response.data ?? {});
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Start a baseline attempt.
  /// POST /baseline/profiles/:profileId/start
  Future<StartAttemptResponse> startAttempt(String profileId) async {
    if (_useBaselineMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return StartAttemptResponse(
        attemptId: 'mock-attempt-${DateTime.now().millisecondsSinceEpoch}',
        attemptNumber: 1,
        totalItems: 25,
      );
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/baseline/profiles/$profileId/start',
      );
      return StartAttemptResponse.fromJson(response.data ?? {});
    } on DioException catch (err) {
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
        isCorrect: true, // Mock always correct
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

  /// Request a retest.
  /// POST /baseline/profiles/:profileId/retest
  Future<void> requestRetest({
    required String profileId,
    required RetestReason reason,
    String? notes,
  }) async {
    if (_useBaselineMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return;
    }

    try {
      await _dio.post<Map<String, dynamic>>(
        '/baseline/profiles/$profileId/retest',
        data: {
          'reason': reason.code,
          if (notes != null && notes.isNotEmpty) 'notes': notes,
        },
      );
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Accept final results.
  /// POST /baseline/profiles/:profileId/accept-final
  Future<void> acceptFinal(String profileId) async {
    if (_useBaselineMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return;
    }

    try {
      await _dio.post<Map<String, dynamic>>(
        '/baseline/profiles/$profileId/accept-final',
      );
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get a baseline profile with attempts.
  /// GET /baseline/profiles/:profileId
  Future<BaselineProfile> getProfile(String profileId) async {
    if (_useBaselineMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return _mockProfile(profileId);
    }

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/baseline/profiles/$profileId',
      );
      return BaselineProfile.fromJson(response.data ?? {});
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get baseline profile by learner ID.
  /// GET /baseline/profiles/by-learner?learnerId=...
  Future<BaselineProfile?> getProfileByLearner(String learnerId) async {
    if (_useBaselineMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      // Return mock profile in various states for testing
      final mockState = learnerId.hashCode % 4;
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
            attempts: [
              BaselineAttempt(
                id: 'mock-attempt-1',
                attemptNumber: 1,
                startedAt: DateTime.now().subtract(const Duration(days: 1)),
                completedAt: DateTime.now().subtract(const Duration(days: 1)),
                overallScore: 0.8,
                domainScores: [
                  const DomainScore(domain: BaselineDomain.ela, correct: 4, total: 5, percentage: 0.8),
                  const DomainScore(domain: BaselineDomain.math, correct: 5, total: 5, percentage: 1.0),
                  const DomainScore(domain: BaselineDomain.science, correct: 3, total: 5, percentage: 0.6),
                  const DomainScore(domain: BaselineDomain.speech, correct: 4, total: 5, percentage: 0.8),
                  const DomainScore(domain: BaselineDomain.sel, correct: 4, total: 5, percentage: 0.8),
                ],
              ),
            ],
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
        questionType: _mockSequence % 3 == 0 ? 'OPEN_ENDED' : 'MULTIPLE_CHOICE',
        questionText: 'This is sample question #$_mockSequence for ${domain.label}. What is the best answer?',
        options: _mockSequence % 3 == 0
            ? null
            : ['Answer option A', 'Answer option B', 'Answer option C', 'Answer option D'],
      ),
    );
  }

  BaselineProfile _mockProfile(String profileId) {
    return BaselineProfile(
      id: profileId,
      tenantId: 'tenant-1',
      learnerId: 'learner-1',
      gradeBand: 'K5',
      status: BaselineProfileStatus.completed,
      attemptCount: 1,
      attempts: [
        BaselineAttempt(
          id: 'attempt-1',
          attemptNumber: 1,
          startedAt: DateTime.now().subtract(const Duration(hours: 1)),
          completedAt: DateTime.now(),
          overallScore: 0.8,
          domainScores: [
            const DomainScore(domain: BaselineDomain.ela, correct: 4, total: 5, percentage: 0.8),
            const DomainScore(domain: BaselineDomain.math, correct: 5, total: 5, percentage: 1.0),
            const DomainScore(domain: BaselineDomain.science, correct: 3, total: 5, percentage: 0.6),
            const DomainScore(domain: BaselineDomain.speech, correct: 4, total: 5, percentage: 0.8),
            const DomainScore(domain: BaselineDomain.sel, correct: 4, total: 5, percentage: 0.8),
          ],
        ),
      ],
    );
  }

  /// Reset mock state (for testing).
  static void resetMockState() {
    _mockSequence = 0;
  }
}

/// Provider for the baseline service.
final baselineServiceProvider = Provider<BaselineService>((_) => BaselineService());
