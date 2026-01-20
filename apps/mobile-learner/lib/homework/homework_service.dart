import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart' show useMockWhen;

const _baseUrl = String.fromEnvironment('HOMEWORK_HELPER_BASE_URL', defaultValue: 'http://localhost:4025');
const _useHomeworkMock = bool.fromEnvironment('USE_HOMEWORK_MOCK', defaultValue: false);

/// Check if mock mode should be used (safe guard - only in debug mode)
bool get _shouldUseMock => useMockWhen(_useHomeworkMock, 'HomeworkService');

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
    if (_shouldUseMock) {
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
    if (_shouldUseMock) {
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
    if (_shouldUseMock) {
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
    if (_shouldUseMock) {
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

/// Result from OCR scan.
class OCRScanResult {
  const OCRScanResult({
    required this.success,
    required this.text,
    required this.confidence,
    required this.provider,
    required this.processingTimeMs,
    this.containsMath = false,
    this.mathExpressions,
  });

  final bool success;
  final String text;
  final double confidence;
  final String provider;
  final int processingTimeMs;
  final bool containsMath;
  final List<MathExpression>? mathExpressions;

  factory OCRScanResult.fromJson(Map<String, dynamic> json) {
    final extraction = json['extraction'] as Map<String, dynamic>? ?? {};
    final mathExprs = extraction['mathExpressions'] as List<dynamic>?;

    return OCRScanResult(
      success: json['success'] == true,
      text: extraction['text']?.toString() ?? '',
      confidence: (extraction['confidence'] as num?)?.toDouble() ?? 0.0,
      provider: extraction['provider']?.toString() ?? 'unknown',
      processingTimeMs: (extraction['processingTimeMs'] as num?)?.toInt() ?? 0,
      containsMath: extraction['containsMath'] == true,
      mathExpressions: mathExprs?.map((e) => MathExpression.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

/// A detected math expression from OCR.
class MathExpression {
  const MathExpression({
    required this.raw,
    this.latex,
  });

  final String raw;
  final String? latex;

  factory MathExpression.fromJson(Map<String, dynamic> json) {
    return MathExpression(
      raw: json['raw']?.toString() ?? '',
      latex: json['latex']?.toString(),
    );
  }
}

/// Result from scan-and-start (OCR + homework session creation).
class ScanAndStartResult {
  const ScanAndStartResult({
    required this.ocrComplete,
    required this.homeworkStarted,
    required this.extraction,
    this.session,
    this.error,
  });

  final bool ocrComplete;
  final bool homeworkStarted;
  final OCRScanResult extraction;
  final HomeworkSession? session;
  final String? error;

  factory ScanAndStartResult.fromJson(Map<String, dynamic> json) {
    final submissionData = json['submission'] as Map<String, dynamic>?;
    final stepsData = json['steps'] as List<dynamic>?;

    HomeworkSession? session;
    if (submissionData != null && stepsData != null) {
      session = HomeworkSession(
        id: submissionData['id']?.toString() ?? '',
        sessionId: submissionData['sessionId']?.toString() ?? '',
        problem: json['extraction']?['text']?.toString() ?? '',
        steps: stepsData.map((s) => HomeworkStep.fromJson(_mapStepResponse(s as Map<String, dynamic>))).toList(),
        currentStepIndex: 0,
        isComplete: false,
      );
    }

    return ScanAndStartResult(
      ocrComplete: json['ocrComplete'] == true,
      homeworkStarted: json['homeworkStarted'] == true,
      extraction: OCRScanResult.fromJson(json),
      session: session,
      error: json['error']?.toString(),
    );
  }

  static Map<String, dynamic> _mapStepResponse(Map<String, dynamic> step) {
    return {
      'id': step['id'],
      'stepNumber': step['stepOrder'],
      'prompt': step['promptText'],
      'isCompleted': step['isCompleted'] ?? false,
    };
  }
}

/// Extension to HomeworkService for OCR capabilities.
extension HomeworkOCRService on HomeworkService {
  /// Scan an image and extract text using OCR.
  /// POST /upload/base64
  Future<OCRScanResult> scanImage({
    required String base64ImageData,
    required HomeworkSubject subject,
    required String gradeBand,
    bool detectMath = true,
  }) async {
    if (_shouldUseMock) {
      await Future.delayed(const Duration(milliseconds: 1200));
      return _mockOCRResult(subject);
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/upload/base64',
        data: {
          'imageData': base64ImageData,
          'subject': subject.code,
          'gradeBand': gradeBand,
          'detectMath': detectMath,
        },
      );

      if (response.data == null) {
        throw const HomeworkException('No OCR result returned');
      }

      return OCRScanResult.fromJson(response.data!);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Scan an image and automatically start a homework session.
  /// POST /upload/scan-and-start (multipart)
  Future<ScanAndStartResult> scanAndStartHomework({
    required Uint8List imageBytes,
    required String filename,
    required HomeworkSubject subject,
    required String gradeBand,
    bool detectMath = true,
    int maxSteps = 5,
    bool autoStart = true,
  }) async {
    if (_shouldUseMock) {
      await Future.delayed(const Duration(milliseconds: 1500));
      return _mockScanAndStartResult(subject, gradeBand);
    }

    try {
      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(
          imageBytes,
          filename: filename,
          contentType: DioMediaType.parse(_getMimeType(filename)),
        ),
        'subject': subject.code,
        'gradeBand': gradeBand,
        'detectMath': detectMath.toString(),
        'maxSteps': maxSteps.toString(),
        'autoStart': autoStart.toString(),
      });

      final response = await _dio.post<Map<String, dynamic>>(
        '/upload/scan-and-start',
        data: formData,
        options: Options(
          contentType: 'multipart/form-data',
        ),
      );

      if (response.data == null) {
        throw const HomeworkException('No result returned');
      }

      return ScanAndStartResult.fromJson(response.data!);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get available OCR providers.
  /// GET /upload/providers
  Future<Map<String, dynamic>> getOCRProviders() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/upload/providers');
      return response.data ?? {};
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  String _getMimeType(String filename) {
    final ext = filename.toLowerCase().split('.').last;
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'heic':
        return 'image/heic';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'image/jpeg';
    }
  }

  OCRScanResult _mockOCRResult(HomeworkSubject subject) {
    final mockText = subject == HomeworkSubject.math
        ? 'Solve for x: 2x + 5 = 13'
        : 'Read the following passage and answer the questions below.';

    return OCRScanResult(
      success: true,
      text: mockText,
      confidence: 0.95,
      provider: 'mock',
      processingTimeMs: 850,
      containsMath: subject == HomeworkSubject.math,
      mathExpressions: subject == HomeworkSubject.math
          ? [const MathExpression(raw: '2x + 5 = 13', latex: r'2x + 5 = 13')]
          : null,
    );
  }

  ScanAndStartResult _mockScanAndStartResult(HomeworkSubject subject, String gradeBand) {
    final ocrResult = _mockOCRResult(subject);
    final session = _mockHomeworkSession(ocrResult.text, subject);

    return ScanAndStartResult(
      ocrComplete: true,
      homeworkStarted: true,
      extraction: ocrResult,
      session: session,
    );
  }
}

/// Provider for the homework service.
final homeworkServiceProvider = Provider<HomeworkService>((ref) => HomeworkService());
