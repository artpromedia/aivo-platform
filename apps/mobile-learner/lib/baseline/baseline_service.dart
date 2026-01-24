import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

import '../config/environment.dart';

/// Ensures mock data is only used in debug mode.
/// Throws [BaselineException] if mock is enabled in production.
void _ensureMockAllowedOrThrow(String operation) {
  if (!kDebugMode) {
    throw BaselineException(
      'Mock data is not allowed in production. '
      'Unable to perform $operation - Baseline API is unavailable.',
    );
  }
  // Log warning in debug mode
  debugPrint('⚠️ WARNING: Baseline service is using mock data for $operation.');
}

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
          baseUrl: EnvironmentConfig.baselineBaseUrl,
          headers: accessToken != null
              ? {'Authorization': 'Bearer $accessToken'}
              : null,
        ));

  final Dio _dio;

  /// Get baseline profile by learner ID.
  /// GET /baseline/profiles/by-learner?learnerId=...
  Future<BaselineProfile?> getProfileByLearner(String learnerId) async {
    if (EnvironmentConfig.useBaselineMock) {
      _ensureMockAllowedOrThrow('getProfileByLearner');
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
    if (EnvironmentConfig.useBaselineMock) {
      _ensureMockAllowedOrThrow('getNextItem');
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
    if (EnvironmentConfig.useBaselineMock) {
      _ensureMockAllowedOrThrow('submitAnswer');
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

  /// Prepare baseline questions based on parent assessment data.
  /// POST /baseline/prepare
  Future<PrepareBaselineResponse> prepareBaseline({
    required String learnerId,
    required String assessmentType,
    List<String>? accommodations,
    List<String>? areasOfConcern,
    bool hasIep = false,
    bool has504 = false,
    List<String>? disabilityCategories,
    List<String>? iepGoalDomains,
  }) async {
    if (EnvironmentConfig.useBaselineMock) {
      _ensureMockAllowedOrThrow('prepareBaseline');
      await Future.delayed(const Duration(milliseconds: 2000));

      // Mock adaptive domains based on IEP/parent assessment
      final baseDomains = [
        'MATH',
        'ELA',
        'SPELLING',
        'SPEECH',
        'CREATIVE_WRITING',
        'SEL',
        'LIFE_SKILLS'
      ];
      final adaptiveDomains = _getAdaptiveDomains(
        hasIep: hasIep,
        disabilityCategories: disabilityCategories ?? [],
        areasOfConcern: areasOfConcern ?? [],
        iepGoalDomains: iepGoalDomains ?? [],
      );
      final allDomains = [...baseDomains, ...adaptiveDomains];

      return PrepareBaselineResponse(
        success: true,
        domainsReady: allDomains,
        totalQuestions: allDomains.length * 5,
        estimatedDuration: 'About ${allDomains.length * 5} minutes',
        adaptiveDomains: adaptiveDomains,
      );
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/baseline/prepare',
        data: {
          'learnerId': learnerId,
          'assessmentType': assessmentType,
          if (accommodations != null) 'accommodations': accommodations,
          if (areasOfConcern != null) 'areasOfConcern': areasOfConcern,
          'hasIep': hasIep,
          'has504': has504,
          if (disabilityCategories != null)
            'disabilityCategories': disabilityCategories,
          if (iepGoalDomains != null) 'iepGoalDomains': iepGoalDomains,
        },
      );
      return PrepareBaselineResponse.fromJson(response.data ?? {});
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Determine adaptive domains based on IEP and parent assessment data.
  static List<String> _getAdaptiveDomains({
    required bool hasIep,
    required List<String> disabilityCategories,
    required List<String> areasOfConcern,
    required List<String> iepGoalDomains,
  }) {
    if (!hasIep && disabilityCategories.isEmpty && areasOfConcern.isEmpty) {
      return [];
    }

    final additionalDomains = <String>{};

    // IEP domain triggers based on disability categories
    const iepDomainTriggers = {
      'MOTOR': [
        'orthopedic_impairment',
        'other_health_impairment',
        'traumatic_brain_injury',
        'multiple_disabilities',
        'developmental_delay',
        'cerebral_palsy',
        'muscular_dystrophy',
      ],
      'EXECUTIVE_FUNCTION': [
        'specific_learning_disability',
        'other_health_impairment',
        'emotional_disturbance',
        'autism',
        'traumatic_brain_injury',
        'intellectual_disability',
      ],
      'SENSORY_PROCESSING': [
        'autism',
        'developmental_delay',
        'sensory_processing_disorder',
        'deafblindness',
        'hearing_impairment',
        'visual_impairment',
        'multiple_disabilities',
      ],
    };

    // Check disability categories
    for (final entry in iepDomainTriggers.entries) {
      final domain = entry.key;
      final triggers = entry.value;
      for (final category in disabilityCategories) {
        final normalized =
            category.toLowerCase().replaceAll(RegExp(r'\s+'), '_');
        if (triggers.contains(normalized)) {
          additionalDomains.add(domain);
          break;
        }
      }
    }

    // Check areas of concern keywords
    const concernKeywords = {
      'MOTOR': [
        'motor',
        'coordination',
        'handwriting',
        'grasp',
        'balance',
        'physical',
        'movement',
        'fine motor',
        'gross motor'
      ],
      'EXECUTIVE_FUNCTION': [
        'attention',
        'focus',
        'organization',
        'planning',
        'memory',
        'impulse',
        'adhd',
        'executive',
        'distract'
      ],
      'SENSORY_PROCESSING': [
        'sensory',
        'noise',
        'texture',
        'light',
        'overwhelmed',
        'meltdown',
        'sensitive',
        'overstimulated'
      ],
    };

    for (final concern in areasOfConcern) {
      final lowerConcern = concern.toLowerCase();
      for (final entry in concernKeywords.entries) {
        final domain = entry.key;
        final keywords = entry.value;
        if (keywords.any((kw) => lowerConcern.contains(kw))) {
          additionalDomains.add(domain);
        }
      }
    }

    // Map IEP goal domains
    for (final goalDomain in iepGoalDomains) {
      final lower = goalDomain.toLowerCase();
      if (lower.contains('motor') ||
          lower.contains('ot') ||
          lower.contains('pt')) {
        additionalDomains.add('MOTOR');
      }
      if (lower.contains('executive') ||
          lower.contains('attention') ||
          lower.contains('organization')) {
        additionalDomains.add('EXECUTIVE_FUNCTION');
      }
      if (lower.contains('sensory')) {
        additionalDomains.add('SENSORY_PROCESSING');
      }
    }

    return additionalDomains.toList();
  }

  /// Complete a baseline attempt.
  /// POST /baseline/attempts/:attemptId/complete
  Future<CompleteAttemptResponse> completeAttempt(String attemptId) async {
    if (EnvironmentConfig.useBaselineMock) {
      _ensureMockAllowedOrThrow('completeAttempt');
      await Future.delayed(const Duration(milliseconds: 300));
      return CompleteAttemptResponse(
        attemptId: attemptId,
        status: 'COMPLETED',
        score: 0.8,
        domainScores: [
          const DomainScore(
              domain: BaselineDomain.ela,
              correct: 4,
              total: 5,
              percentage: 0.8),
          const DomainScore(
              domain: BaselineDomain.math,
              correct: 5,
              total: 5,
              percentage: 1.0),
          const DomainScore(
              domain: BaselineDomain.science,
              correct: 3,
              total: 5,
              percentage: 0.6),
          const DomainScore(
              domain: BaselineDomain.speech,
              correct: 4,
              total: 5,
              percentage: 0.8),
          const DomainScore(
              domain: BaselineDomain.sel,
              correct: 4,
              total: 5,
              percentage: 0.8),
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
      case BaselineDomain.spelling:
        return 'How do you spell the word that means "cheerful"?';
      case BaselineDomain.creativeWriting:
        return 'Which sentence would make a good story beginning?';
      case BaselineDomain.lifeSkills:
        return 'What should you do before crossing the street?';
      case BaselineDomain.motor:
        return 'Which picture shows the correct way to hold a pencil?';
      case BaselineDomain.executiveFunction:
        return 'What should you do first when you have a big project to complete?';
      case BaselineDomain.sensoryProcessing:
        return 'What can you do if the room feels too loud?';
    }
  }

  /// Reset mock state (for testing).
  static void resetMockState() {
    _mockSequence = 0;
  }
}

/// Provider for the learner baseline service.
final learnerBaselineServiceProvider =
    Provider<LearnerBaselineService>((_) => LearnerBaselineService());
