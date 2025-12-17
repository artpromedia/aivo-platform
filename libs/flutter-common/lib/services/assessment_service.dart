/// Assessment Service
///
/// Manages quizzes, assessments, and grading operations.
library;

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// ASSESSMENT MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Assessment type.
enum AssessmentType {
  quiz,
  test,
  exam,
  diagnostic,
  formative,
  summative,
  practice;

  String get displayName => switch (this) {
        quiz => 'Quiz',
        test => 'Test',
        exam => 'Exam',
        diagnostic => 'Diagnostic',
        formative => 'Formative',
        summative => 'Summative',
        practice => 'Practice',
      };
}

/// Assessment status.
enum AssessmentStatus {
  notStarted,
  inProgress,
  completed,
  expired,
  submitted;
}

/// Assessment definition.
class Assessment {
  const Assessment({
    required this.id,
    required this.title,
    required this.type,
    this.description,
    required this.questionCount,
    required this.timeLimit,
    this.passingScore,
    this.maxAttempts,
    this.shuffleQuestions = false,
    this.showResults = true,
    this.dueDate,
    this.status = AssessmentStatus.notStarted,
    this.attempt,
    this.bestScore,
    this.attemptCount = 0,
  });

  final String id;
  final String title;
  final AssessmentType type;
  final String? description;
  final int questionCount;
  final int timeLimit; // in minutes, 0 = unlimited
  final double? passingScore;
  final int? maxAttempts;
  final bool shuffleQuestions;
  final bool showResults;
  final DateTime? dueDate;
  final AssessmentStatus status;
  final AssessmentAttempt? attempt;
  final double? bestScore;
  final int attemptCount;

  bool get isOverdue =>
      dueDate != null && DateTime.now().isAfter(dueDate!);
  bool get canRetry =>
      maxAttempts == null || attemptCount < maxAttempts!;
  bool get isPassed =>
      bestScore != null && passingScore != null && bestScore! >= passingScore!;

  factory Assessment.fromJson(Map<String, dynamic> json) {
    return Assessment(
      id: json['id'] as String,
      title: json['title'] as String,
      type: AssessmentType.values.firstWhere(
        (t) => t.name == (json['type'] as String?)?.toLowerCase(),
        orElse: () => AssessmentType.quiz,
      ),
      description: json['description'] as String?,
      questionCount: json['questionCount'] as int? ?? 0,
      timeLimit: json['timeLimit'] as int? ?? 0,
      passingScore: (json['passingScore'] as num?)?.toDouble(),
      maxAttempts: json['maxAttempts'] as int?,
      shuffleQuestions: json['shuffleQuestions'] as bool? ?? false,
      showResults: json['showResults'] as bool? ?? true,
      dueDate: json['dueDate'] != null
          ? DateTime.parse(json['dueDate'] as String)
          : null,
      status: AssessmentStatus.values.firstWhere(
        (s) => s.name == (json['status'] as String?)?.toLowerCase(),
        orElse: () => AssessmentStatus.notStarted,
      ),
      attempt: json['attempt'] != null
          ? AssessmentAttempt.fromJson(json['attempt'] as Map<String, dynamic>)
          : null,
      bestScore: (json['bestScore'] as num?)?.toDouble(),
      attemptCount: json['attemptCount'] as int? ?? 0,
    );
  }
}

/// Assessment attempt.
class AssessmentAttempt {
  const AssessmentAttempt({
    required this.id,
    required this.assessmentId,
    required this.learnerId,
    required this.startedAt,
    this.completedAt,
    this.submittedAt,
    required this.status,
    this.score,
    this.timeSpentSeconds = 0,
    this.answers = const [],
    this.currentQuestionIndex = 0,
  });

  final String id;
  final String assessmentId;
  final String learnerId;
  final DateTime startedAt;
  final DateTime? completedAt;
  final DateTime? submittedAt;
  final AssessmentStatus status;
  final double? score;
  final int timeSpentSeconds;
  final List<AttemptAnswer> answers;
  final int currentQuestionIndex;

  bool get isCompleted => status == AssessmentStatus.completed;
  bool get isInProgress => status == AssessmentStatus.inProgress;
  int get answeredCount => answers.where((a) => a.answer != null).length;
  Duration get timeSpent => Duration(seconds: timeSpentSeconds);

  factory AssessmentAttempt.fromJson(Map<String, dynamic> json) {
    return AssessmentAttempt(
      id: json['id'] as String,
      assessmentId: json['assessmentId'] as String,
      learnerId: json['learnerId'] as String,
      startedAt: DateTime.parse(json['startedAt'] as String),
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      submittedAt: json['submittedAt'] != null
          ? DateTime.parse(json['submittedAt'] as String)
          : null,
      status: AssessmentStatus.values.firstWhere(
        (s) => s.name == (json['status'] as String?)?.toLowerCase(),
        orElse: () => AssessmentStatus.inProgress,
      ),
      score: (json['score'] as num?)?.toDouble(),
      timeSpentSeconds: json['timeSpentSeconds'] as int? ?? 0,
      answers: (json['answers'] as List<dynamic>?)
              ?.map((a) => AttemptAnswer.fromJson(a as Map<String, dynamic>))
              .toList() ??
          [],
      currentQuestionIndex: json['currentQuestionIndex'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'assessmentId': assessmentId,
        'learnerId': learnerId,
        'startedAt': startedAt.toIso8601String(),
        'completedAt': completedAt?.toIso8601String(),
        'submittedAt': submittedAt?.toIso8601String(),
        'status': status.name,
        'score': score,
        'timeSpentSeconds': timeSpentSeconds,
        'answers': answers.map((a) => a.toJson()).toList(),
        'currentQuestionIndex': currentQuestionIndex,
      };
}

/// Answer within an attempt.
class AttemptAnswer {
  const AttemptAnswer({
    required this.questionId,
    this.answer,
    this.isCorrect,
    this.points,
    this.maxPoints,
    this.timeSpentSeconds = 0,
    this.hintsUsed = 0,
    this.feedback,
  });

  final String questionId;
  final dynamic answer;
  final bool? isCorrect;
  final double? points;
  final double? maxPoints;
  final int timeSpentSeconds;
  final int hintsUsed;
  final String? feedback;

  factory AttemptAnswer.fromJson(Map<String, dynamic> json) {
    return AttemptAnswer(
      questionId: json['questionId'] as String,
      answer: json['answer'],
      isCorrect: json['isCorrect'] as bool?,
      points: (json['points'] as num?)?.toDouble(),
      maxPoints: (json['maxPoints'] as num?)?.toDouble(),
      timeSpentSeconds: json['timeSpentSeconds'] as int? ?? 0,
      hintsUsed: json['hintsUsed'] as int? ?? 0,
      feedback: json['feedback'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'questionId': questionId,
        'answer': answer,
        'isCorrect': isCorrect,
        'points': points,
        'maxPoints': maxPoints,
        'timeSpentSeconds': timeSpentSeconds,
        'hintsUsed': hintsUsed,
        'feedback': feedback,
      };
}

/// Assessment question (includes correct answer after submission).
class AssessmentQuestion {
  const AssessmentQuestion({
    required this.id,
    required this.type,
    required this.prompt,
    this.stimulus,
    this.options = const [],
    this.mediaUrl,
    this.points = 1,
    this.correctAnswer,
    this.explanation,
    this.hints = const [],
  });

  final String id;
  final String type;
  final String prompt;
  final String? stimulus;
  final List<QuestionOption> options;
  final String? mediaUrl;
  final int points;
  final dynamic correctAnswer;
  final String? explanation;
  final List<String> hints;

  factory AssessmentQuestion.fromJson(Map<String, dynamic> json) {
    return AssessmentQuestion(
      id: json['id'] as String,
      type: json['type'] as String? ?? 'multipleChoice',
      prompt: json['prompt'] as String,
      stimulus: json['stimulus'] as String?,
      options: (json['options'] as List<dynamic>?)
              ?.map((o) => QuestionOption.fromJson(
                  o is String ? {'id': o, 'text': o} : o as Map<String, dynamic>))
              .toList() ??
          [],
      mediaUrl: json['mediaUrl'] as String?,
      points: json['points'] as int? ?? 1,
      correctAnswer: json['correctAnswer'],
      explanation: json['explanation'] as String?,
      hints: (json['hints'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }
}

/// Question option.
class QuestionOption {
  const QuestionOption({
    required this.id,
    required this.text,
    this.imageUrl,
  });

  final String id;
  final String text;
  final String? imageUrl;

  factory QuestionOption.fromJson(Map<String, dynamic> json) {
    return QuestionOption(
      id: json['id'] as String,
      text: json['text'] as String,
      imageUrl: json['imageUrl'] as String?,
    );
  }
}

/// Assessment result after completion.
class AssessmentResult {
  const AssessmentResult({
    required this.attemptId,
    required this.assessmentId,
    required this.score,
    required this.maxScore,
    required this.percentScore,
    required this.passed,
    required this.timeSpentSeconds,
    required this.questionResults,
    this.xpEarned = 0,
    this.feedback,
    this.recommendations = const [],
  });

  final String attemptId;
  final String assessmentId;
  final double score;
  final double maxScore;
  final double percentScore;
  final bool passed;
  final int timeSpentSeconds;
  final List<QuestionResult> questionResults;
  final int xpEarned;
  final String? feedback;
  final List<String> recommendations;

  int get correctCount => questionResults.where((q) => q.isCorrect).length;
  int get incorrectCount => questionResults.where((q) => !q.isCorrect).length;

  factory AssessmentResult.fromJson(Map<String, dynamic> json) {
    return AssessmentResult(
      attemptId: json['attemptId'] as String,
      assessmentId: json['assessmentId'] as String,
      score: (json['score'] as num? ?? 0).toDouble(),
      maxScore: (json['maxScore'] as num? ?? 0).toDouble(),
      percentScore: (json['percentScore'] as num? ?? 0).toDouble(),
      passed: json['passed'] as bool? ?? false,
      timeSpentSeconds: json['timeSpentSeconds'] as int? ?? 0,
      questionResults: (json['questionResults'] as List<dynamic>?)
              ?.map((q) => QuestionResult.fromJson(q as Map<String, dynamic>))
              .toList() ??
          [],
      xpEarned: json['xpEarned'] as int? ?? 0,
      feedback: json['feedback'] as String?,
      recommendations:
          (json['recommendations'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }
}

/// Result for a single question.
class QuestionResult {
  const QuestionResult({
    required this.questionId,
    required this.isCorrect,
    required this.points,
    required this.maxPoints,
    this.userAnswer,
    this.correctAnswer,
    this.explanation,
  });

  final String questionId;
  final bool isCorrect;
  final double points;
  final double maxPoints;
  final dynamic userAnswer;
  final dynamic correctAnswer;
  final String? explanation;

  factory QuestionResult.fromJson(Map<String, dynamic> json) {
    return QuestionResult(
      questionId: json['questionId'] as String,
      isCorrect: json['isCorrect'] as bool? ?? false,
      points: (json['points'] as num? ?? 0).toDouble(),
      maxPoints: (json['maxPoints'] as num? ?? 0).toDouble(),
      userAnswer: json['userAnswer'],
      correctAnswer: json['correctAnswer'],
      explanation: json['explanation'] as String?,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSESSMENT SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Service for managing assessments and quizzes.
class AssessmentService {
  AssessmentService({
    required AivoApiClient apiClient,
  }) : _apiClient = apiClient;

  final AivoApiClient _apiClient;
  static const _baseUrl = '/assessments';

  /// Get available assessments for a learner.
  Future<List<Assessment>> getAssessments({
    required String learnerId,
    String? topicId,
    String? subjectId,
    AssessmentType? type,
  }) async {
    final response = await _apiClient.get<List<dynamic>>(
      _baseUrl,
      queryParameters: {
        'learnerId': learnerId,
        if (topicId != null) 'topicId': topicId,
        if (subjectId != null) 'subjectId': subjectId,
        if (type != null) 'type': type.name,
      },
    );

    return (response.data ?? [])
        .map((a) => Assessment.fromJson(a as Map<String, dynamic>))
        .toList();
  }

  /// Get a specific assessment.
  Future<Assessment> getAssessment(
    String assessmentId, {
    String? learnerId,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_baseUrl/$assessmentId',
      queryParameters: {
        if (learnerId != null) 'learnerId': learnerId,
      },
    );

    return Assessment.fromJson(response.data!);
  }

  /// Start an assessment attempt.
  Future<AssessmentAttempt> startAttempt({
    required String assessmentId,
    required String learnerId,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '$_baseUrl/$assessmentId/attempts',
      data: {'learnerId': learnerId},
    );

    return AssessmentAttempt.fromJson(response.data!);
  }

  /// Get questions for an attempt.
  Future<List<AssessmentQuestion>> getQuestions(String attemptId) async {
    final response = await _apiClient.get<List<dynamic>>(
      '$_baseUrl/attempts/$attemptId/questions',
    );

    return (response.data ?? [])
        .map((q) => AssessmentQuestion.fromJson(q as Map<String, dynamic>))
        .toList();
  }

  /// Get a specific question.
  Future<AssessmentQuestion> getQuestion(
    String attemptId,
    String questionId,
  ) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_baseUrl/attempts/$attemptId/questions/$questionId',
    );

    return AssessmentQuestion.fromJson(response.data!);
  }

  /// Submit an answer.
  Future<AttemptAnswer> submitAnswer({
    required String attemptId,
    required String questionId,
    required dynamic answer,
    int? timeSpentSeconds,
    int? hintsUsed,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '$_baseUrl/attempts/$attemptId/answers',
      data: {
        'questionId': questionId,
        'answer': answer,
        'timeSpentSeconds': timeSpentSeconds,
        'hintsUsed': hintsUsed,
      },
    );

    return AttemptAnswer.fromJson(response.data!);
  }

  /// Update time spent on an attempt.
  Future<void> updateTimeSpent({
    required String attemptId,
    required int timeSpentSeconds,
  }) async {
    await _apiClient.patch(
      '$_baseUrl/attempts/$attemptId',
      data: {'timeSpentSeconds': timeSpentSeconds},
    );
  }

  /// Submit the assessment attempt for grading.
  Future<AssessmentResult> submitAttempt(String attemptId) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '$_baseUrl/attempts/$attemptId/submit',
    );

    return AssessmentResult.fromJson(response.data!);
  }

  /// Get result for a completed attempt.
  Future<AssessmentResult> getResult(String attemptId) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_baseUrl/attempts/$attemptId/result',
    );

    return AssessmentResult.fromJson(response.data!);
  }

  /// Get attempt history for a learner.
  Future<List<AssessmentAttempt>> getAttemptHistory({
    required String learnerId,
    String? assessmentId,
    int limit = 20,
  }) async {
    final response = await _apiClient.get<List<dynamic>>(
      '$_baseUrl/attempts',
      queryParameters: {
        'learnerId': learnerId,
        if (assessmentId != null) 'assessmentId': assessmentId,
        'limit': limit.toString(),
      },
    );

    return (response.data ?? [])
        .map((a) => AssessmentAttempt.fromJson(a as Map<String, dynamic>))
        .toList();
  }

  /// Pause an attempt.
  Future<void> pauseAttempt(String attemptId) async {
    await _apiClient.post('$_baseUrl/attempts/$attemptId/pause');
  }

  /// Resume a paused attempt.
  Future<AssessmentAttempt> resumeAttempt(String attemptId) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '$_baseUrl/attempts/$attemptId/resume',
    );

    return AssessmentAttempt.fromJson(response.data!);
  }

  /// Get hint for a question.
  Future<String> getHint({
    required String attemptId,
    required String questionId,
    required int hintIndex,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_baseUrl/attempts/$attemptId/questions/$questionId/hint',
      queryParameters: {'index': hintIndex.toString()},
    );

    return response.data?['hint'] as String? ?? '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIVERPOD PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for AssessmentService.
final assessmentServiceProvider = Provider<AssessmentService>((ref) {
  return AssessmentService(
    apiClient: AivoApiClient.instance,
  );
});

/// Provider for assessments by learner.
final assessmentsProvider = FutureProvider.family<List<Assessment>, String>(
  (ref, learnerId) async {
    final service = ref.watch(assessmentServiceProvider);
    return service.getAssessments(learnerId: learnerId);
  },
);
