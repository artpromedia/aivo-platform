import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const _baseUrl = String.fromEnvironment('HOMEWORK_HELPER_BASE_URL', defaultValue: 'http://localhost:4025');
const _useHomeworkMock = bool.fromEnvironment('USE_HOMEWORK_MOCK', defaultValue: false);

/// Log warning when mock data is used in non-debug mode
void _logMockWarning() {
  assert(() {
    debugPrint('⚠️ WARNING: Homework service is using mock data.');
    return true;
  }());
}

/// Subject areas for homework help.
enum HomeworkSubject {
  ela('ELA', 'English Language Arts'),
  math('MATH', 'Mathematics'),
  science('SCIENCE', 'Science'),
  other('OTHER', 'Other Subject');

  const HomeworkSubject(this.code, this.displayName);
  final String code;
  final String displayName;
}

/// A scaffolded step in the homework help flow.
class HomeworkStep {
  const HomeworkStep({
    required this.id,
    required this.stepNumber,
    required this.prompt,
    required this.isCompleted,
    this.hint,
    this.learnerResponse,
    this.feedback,
    this.isCorrect,
  });

  final String id;
  final int stepNumber;
  final String prompt;
  final bool isCompleted;
  final String? hint;
  final String? learnerResponse;
  final String? feedback;
  final bool? isCorrect;

  factory HomeworkStep.fromJson(Map<String, dynamic> json) {
    return HomeworkStep(
      id: json['id']?.toString() ?? '',
      stepNumber: json['stepNumber'] is num ? (json['stepNumber'] as num).toInt() : 0,
      prompt: json['prompt']?.toString() ?? '',
      isCompleted: json['isCompleted'] == true,
      hint: json['hint']?.toString(),
      learnerResponse: json['learnerResponse']?.toString(),
      feedback: json['feedback']?.toString(),
      isCorrect: json['isCorrect'] as bool?,
    );
  }

  HomeworkStep copyWith({
    String? id,
    int? stepNumber,
    String? prompt,
    bool? isCompleted,
    String? hint,
    String? learnerResponse,
    String? feedback,
    bool? isCorrect,
  }) {
    return HomeworkStep(
      id: id ?? this.id,
      stepNumber: stepNumber ?? this.stepNumber,
      prompt: prompt ?? this.prompt,
      isCompleted: isCompleted ?? this.isCompleted,
      hint: hint ?? this.hint,
      learnerResponse: learnerResponse ?? this.learnerResponse,
      feedback: feedback ?? this.feedback,
      isCorrect: isCorrect ?? this.isCorrect,
    );
  }
}

/// Result from starting a homework help session.
class HomeworkSession {
  const HomeworkSession({
    required this.id,
    required this.sessionId,
    required this.problem,
    required this.steps,
    required this.currentStepIndex,
    required this.isComplete,
  });

  final String id;
  final String sessionId;
  final String problem;
  final List<HomeworkStep> steps;
  final int currentStepIndex;
  final bool isComplete;

  factory HomeworkSession.fromJson(Map<String, dynamic> json) {
    final stepsJson = json['steps'] as List<dynamic>? ?? [];
    return HomeworkSession(
      id: json['id']?.toString() ?? '',
      sessionId: json['sessionId']?.toString() ?? '',
      problem: json['problem']?.toString() ?? '',
      steps: stepsJson.map((s) => HomeworkStep.fromJson(s as Map<String, dynamic>)).toList(),
      currentStepIndex: json['currentStepIndex'] is num ? (json['currentStepIndex'] as num).toInt() : 0,
      isComplete: json['isComplete'] == true,
    );
  }

  HomeworkSession copyWith({
    String? id,
    String? sessionId,
    String? problem,
    List<HomeworkStep>? steps,
    int? currentStepIndex,
    bool? isComplete,
  }) {
    return HomeworkSession(
      id: id ?? this.id,
      sessionId: sessionId ?? this.sessionId,
      problem: problem ?? this.problem,
      steps: steps ?? this.steps,
      currentStepIndex: currentStepIndex ?? this.currentStepIndex,
      isComplete: isComplete ?? this.isComplete,
    );
  }
}

/// Result from answering a homework step.
class StepAnswerResult {
  const StepAnswerResult({
    required this.stepId,
    required this.isCorrect,
    this.feedback,
    this.hint,
    required this.proceedToNext,
  });

  final String stepId;
  final bool isCorrect;
  final String? feedback;
  final String? hint;
  final bool proceedToNext;

  factory StepAnswerResult.fromJson(Map<String, dynamic> json) {
    return StepAnswerResult(
      stepId: json['stepId']?.toString() ?? '',
      isCorrect: json['isCorrect'] == true,
      feedback: json['feedback']?.toString(),
      hint: json['hint']?.toString(),
      proceedToNext: json['proceedToNext'] == true,
    );
  }
}

/// Exception thrown by homework API operations.
class HomeworkException implements Exception {
  const HomeworkException(this.message, {this.code});
  final String message;
  final int? code;

  @override
  String toString() => message;
}

/// Service for Homework Helper API calls.
class HomeworkService {
  HomeworkService({String? accessToken})
      : _dio = Dio(BaseOptions(
          baseUrl: _baseUrl,
          headers: accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
        ));

  final Dio _dio;

  /// Start a new homework help session.
  /// POST /homework/start
  Future<HomeworkSession> startHomework({
    required String problemText,
    required HomeworkSubject subject,
    required String gradeBand,
    String sourceType = 'TEXT',
  }) async {
    if (_useHomeworkMock) {
      _logMockWarning();
      await Future.delayed(const Duration(milliseconds: 800));
      return _mockHomeworkSession(problemText, subject);
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/homework/start',
        data: {
          'rawText': problemText,
          'subject': subject.code,
          'gradeBand': gradeBand,
          'sourceType': sourceType,
          'maxSteps': 5,
        },
      );

      if (response.data == null) {
        throw const HomeworkException('No data returned');
      }

      return HomeworkSession.fromJson(response.data!);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get steps for an existing homework session.
  /// GET /homework/:id/steps
  Future<List<HomeworkStep>> getSteps(String homeworkId) async {
    if (_useHomeworkMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockSteps();
    }

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/homework/$homeworkId/steps',
      );

      if (response.data == null) {
        throw const HomeworkException('No steps returned');
      }

      final stepsJson = response.data!['steps'] as List<dynamic>? ?? [];
      return stepsJson.map((s) => HomeworkStep.fromJson(s as Map<String, dynamic>)).toList();
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Submit an answer for a homework step.
  /// POST /homework/steps/:stepId/answer
  Future<StepAnswerResult> answerStep({
    required String stepId,
    required String responseText,
    bool requestFeedback = true,
  }) async {
    if (_useHomeworkMock) {
      await Future.delayed(const Duration(milliseconds: 500));
      return _mockAnswerResult(stepId, responseText);
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/homework/steps/$stepId/answer',
        data: {
          'responseText': responseText,
          'requestFeedback': requestFeedback,
        },
      );

      if (response.data == null) {
        throw const HomeworkException('No answer result returned');
      }

      return StepAnswerResult.fromJson(response.data!);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Complete the homework session.
  /// POST /homework/:id/complete
  Future<void> completeHomework(String homeworkId) async {
    if (_useHomeworkMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return;
    }

    try {
      await _dio.post<void>('/homework/$homeworkId/complete');
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  HomeworkException _handleError(DioException err) {
    final statusCode = err.response?.statusCode;
    final message = err.response?.data is Map
        ? (err.response?.data as Map)['error']?.toString() ?? err.message
        : err.message ?? 'Network error';
    return HomeworkException(message ?? 'Unknown error', code: statusCode);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MOCK DATA
  // ════════════════════════════════════════════════════════════════════════════

  HomeworkSession _mockHomeworkSession(String problem, HomeworkSubject subject) {
    return HomeworkSession(
      id: 'hw-mock-001',
      sessionId: 'session-mock-001',
      problem: problem,
      steps: _mockSteps(),
      currentStepIndex: 0,
      isComplete: false,
    );
  }

  List<HomeworkStep> _mockSteps() {
    return const [
      HomeworkStep(
        id: 'step-1',
        stepNumber: 1,
        prompt: 'First, let\'s understand what the problem is asking. Can you identify the key information given in the problem?',
        isCompleted: false,
      ),
      HomeworkStep(
        id: 'step-2',
        stepNumber: 2,
        prompt: 'Great! Now, what operation do you think we need to use to solve this? Think about what we\'re trying to find.',
        isCompleted: false,
      ),
      HomeworkStep(
        id: 'step-3',
        stepNumber: 3,
        prompt: 'Let\'s set up the equation. How would you write this mathematically?',
        isCompleted: false,
      ),
      HomeworkStep(
        id: 'step-4',
        stepNumber: 4,
        prompt: 'Now solve the equation step by step. Show your work!',
        isCompleted: false,
      ),
      HomeworkStep(
        id: 'step-5',
        stepNumber: 5,
        prompt: 'Finally, let\'s check our answer. Does it make sense in the context of the problem?',
        isCompleted: false,
      ),
    ];
  }

  StepAnswerResult _mockAnswerResult(String stepId, String response) {
    // Simple mock logic - consider "correct" if response is non-empty with >10 chars
    final isCorrect = response.length > 10;
    return StepAnswerResult(
      stepId: stepId,
      isCorrect: isCorrect,
      feedback: isCorrect
          ? 'Good thinking! You\'re on the right track.'
          : 'That\'s a good start! Let me give you a hint to help you think about it differently.',
      hint: isCorrect ? null : 'Try breaking down the problem into smaller parts.',
      proceedToNext: isCorrect,
    );
  }
}

/// Provider for the homework service.
final homeworkServiceProvider = Provider<HomeworkService>((ref) => HomeworkService());
