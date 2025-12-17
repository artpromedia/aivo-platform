/// Baseline Service
///
/// Manages baseline assessments and learner profiling.
library;

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_config.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// BASELINE MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Baseline profile status.
enum BaselineStatus {
  notStarted,
  inProgress,
  completed,
  expired;

  bool get canStart => this == notStarted || this == expired;
  bool get needsCompletion => this == inProgress;
}

/// Baseline profile for a learner.
class BaselineProfile {
  const BaselineProfile({
    required this.id,
    required this.learnerId,
    required this.status,
    this.subjects = const [],
    this.currentSubject,
    this.currentSessionId,
    this.startedAt,
    this.completedAt,
    this.estimatedMinutesRemaining,
    this.progress = 0.0,
  });

  final String id;
  final String learnerId;
  final BaselineStatus status;
  final List<BaselineSubjectStatus> subjects;
  final String? currentSubject;
  final String? currentSessionId;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final int? estimatedMinutesRemaining;
  final double progress;

  factory BaselineProfile.fromJson(Map<String, dynamic> json) {
    return BaselineProfile(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      status: BaselineStatus.values.firstWhere(
        (s) => s.name == (json['status'] as String?)?.toLowerCase(),
        orElse: () => BaselineStatus.notStarted,
      ),
      subjects: (json['subjects'] as List<dynamic>?)
              ?.map((s) =>
                  BaselineSubjectStatus.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
      currentSubject: json['currentSubject'] as String?,
      currentSessionId: json['currentSessionId'] as String?,
      startedAt: json['startedAt'] != null
          ? DateTime.parse(json['startedAt'] as String)
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      estimatedMinutesRemaining: json['estimatedMinutesRemaining'] as int?,
      progress: (json['progress'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'learnerId': learnerId,
        'status': status.name,
        'subjects': subjects.map((s) => s.toJson()).toList(),
        'currentSubject': currentSubject,
        'currentSessionId': currentSessionId,
        'startedAt': startedAt?.toIso8601String(),
        'completedAt': completedAt?.toIso8601String(),
        'estimatedMinutesRemaining': estimatedMinutesRemaining,
        'progress': progress,
      };
}

/// Status for a subject within baseline.
class BaselineSubjectStatus {
  const BaselineSubjectStatus({
    required this.subject,
    required this.status,
    this.questionsAnswered = 0,
    this.estimatedQuestionsRemaining = 0,
    this.startedAt,
    this.completedAt,
    this.result,
  });

  final String subject;
  final BaselineStatus status;
  final int questionsAnswered;
  final int estimatedQuestionsRemaining;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final BaselineSubjectResult? result;

  factory BaselineSubjectStatus.fromJson(Map<String, dynamic> json) {
    return BaselineSubjectStatus(
      subject: json['subject'] as String,
      status: BaselineStatus.values.firstWhere(
        (s) => s.name == (json['status'] as String?)?.toLowerCase(),
        orElse: () => BaselineStatus.notStarted,
      ),
      questionsAnswered: json['questionsAnswered'] as int? ?? 0,
      estimatedQuestionsRemaining:
          json['estimatedQuestionsRemaining'] as int? ?? 0,
      startedAt: json['startedAt'] != null
          ? DateTime.parse(json['startedAt'] as String)
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      result: json['result'] != null
          ? BaselineSubjectResult.fromJson(
              json['result'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'subject': subject,
        'status': status.name,
        'questionsAnswered': questionsAnswered,
        'estimatedQuestionsRemaining': estimatedQuestionsRemaining,
        'startedAt': startedAt?.toIso8601String(),
        'completedAt': completedAt?.toIso8601String(),
        'result': result?.toJson(),
      };
}

/// Result for a subject baseline.
class BaselineSubjectResult {
  const BaselineSubjectResult({
    required this.subject,
    required this.gradeLevel,
    required this.proficiencyLevel,
    this.strengthAreas = const [],
    this.improvementAreas = const [],
    this.topicProficiencies = const {},
  });

  final String subject;
  final String gradeLevel;
  final String proficiencyLevel; // 'below', 'at', 'above'
  final List<String> strengthAreas;
  final List<String> improvementAreas;
  final Map<String, double> topicProficiencies;

  factory BaselineSubjectResult.fromJson(Map<String, dynamic> json) {
    return BaselineSubjectResult(
      subject: json['subject'] as String,
      gradeLevel: json['gradeLevel'] as String,
      proficiencyLevel: json['proficiencyLevel'] as String? ?? 'at',
      strengthAreas:
          (json['strengthAreas'] as List<dynamic>?)?.cast<String>() ?? [],
      improvementAreas:
          (json['improvementAreas'] as List<dynamic>?)?.cast<String>() ?? [],
      topicProficiencies: (json['topicProficiencies'] as Map<String, dynamic>?)
              ?.map((k, v) => MapEntry(k, (v as num).toDouble())) ??
          {},
    );
  }

  Map<String, dynamic> toJson() => {
        'subject': subject,
        'gradeLevel': gradeLevel,
        'proficiencyLevel': proficiencyLevel,
        'strengthAreas': strengthAreas,
        'improvementAreas': improvementAreas,
        'topicProficiencies': topicProficiencies,
      };
}

/// Baseline question.
class BaselineQuestion {
  const BaselineQuestion({
    required this.id,
    required this.subject,
    required this.topic,
    required this.type,
    required this.prompt,
    this.stimulus,
    this.options = const [],
    this.mediaUrl,
    this.estimatedDifficulty,
  });

  final String id;
  final String subject;
  final String topic;
  final String type;
  final String prompt;
  final String? stimulus;
  final List<QuestionOption> options;
  final String? mediaUrl;
  final double? estimatedDifficulty;

  factory BaselineQuestion.fromJson(Map<String, dynamic> json) {
    return BaselineQuestion(
      id: json['id'] as String,
      subject: json['subject'] as String,
      topic: json['topic'] as String? ?? '',
      type: json['type'] as String? ?? 'multipleChoice',
      prompt: json['prompt'] as String,
      stimulus: json['stimulus'] as String?,
      options: (json['options'] as List<dynamic>?)
              ?.map((o) => QuestionOption.fromJson(
                  o is String ? {'id': o, 'text': o} : o as Map<String, dynamic>))
              .toList() ??
          [],
      mediaUrl: json['mediaUrl'] as String?,
      estimatedDifficulty: (json['estimatedDifficulty'] as num?)?.toDouble(),
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

/// Answer result for baseline question.
class BaselineAnswerResult {
  const BaselineAnswerResult({
    required this.questionId,
    required this.correct,
    this.nextQuestion,
    required this.progress,
    this.subjectComplete = false,
    this.baselineComplete = false,
  });

  final String questionId;
  final bool correct;
  final BaselineQuestion? nextQuestion;
  final double progress;
  final bool subjectComplete;
  final bool baselineComplete;

  factory BaselineAnswerResult.fromJson(Map<String, dynamic> json) {
    return BaselineAnswerResult(
      questionId: json['questionId'] as String,
      correct: json['correct'] as bool? ?? false,
      nextQuestion: json['nextQuestion'] != null
          ? BaselineQuestion.fromJson(
              json['nextQuestion'] as Map<String, dynamic>)
          : null,
      progress: (json['progress'] as num?)?.toDouble() ?? 0.0,
      subjectComplete: json['subjectComplete'] as bool? ?? false,
      baselineComplete: json['baselineComplete'] as bool? ?? false,
    );
  }
}

/// Break suggestion during baseline.
class BaselineBreakSuggestion {
  const BaselineBreakSuggestion({
    required this.suggested,
    required this.reason,
    this.durationMinutes = 5,
    this.activity,
  });

  final bool suggested;
  final String reason;
  final int durationMinutes;
  final String? activity;

  factory BaselineBreakSuggestion.fromJson(Map<String, dynamic> json) {
    return BaselineBreakSuggestion(
      suggested: json['suggested'] as bool? ?? false,
      reason: json['reason'] as String? ?? '',
      durationMinutes: json['durationMinutes'] as int? ?? 5,
      activity: json['activity'] as String?,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BASELINE SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Service for managing baseline assessments.
class BaselineService {
  BaselineService({
    required AivoApiClient apiClient,
  }) : _apiClient = apiClient;

  final AivoApiClient _apiClient;

  /// Get baseline profile for a learner.
  Future<BaselineProfile> getProfile(String learnerId) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      ApiEndpoints.baselineProfile(learnerId),
    );

    return BaselineProfile.fromJson(response.data!);
  }

  /// Start baseline assessment.
  Future<BaselineProfile> startBaseline({
    required String learnerId,
    List<String>? subjects,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiEndpoints.baselineStart(learnerId),
      data: {
        if (subjects != null) 'subjects': subjects,
      },
    );

    return BaselineProfile.fromJson(response.data!);
  }

  /// Get next question in baseline.
  Future<BaselineQuestion> getNextQuestion(String sessionId) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      ApiEndpoints.baselineQuestion(sessionId),
    );

    return BaselineQuestion.fromJson(response.data!);
  }

  /// Submit answer for baseline question.
  Future<BaselineAnswerResult> submitAnswer({
    required String sessionId,
    required String questionId,
    required dynamic answer,
    int? timeSpentSeconds,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiEndpoints.baselineAnswer(sessionId),
      data: {
        'questionId': questionId,
        'answer': answer,
        'timeSpentSeconds': timeSpentSeconds,
      },
    );

    return BaselineAnswerResult.fromJson(response.data!);
  }

  /// Check if break is suggested.
  Future<BaselineBreakSuggestion> checkBreakSuggestion(String sessionId) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '${ApiEndpoints.baseline}/sessions/$sessionId/break-check',
    );

    return BaselineBreakSuggestion.fromJson(response.data!);
  }

  /// Record break taken.
  Future<void> recordBreak({
    required String sessionId,
    required int durationSeconds,
    String? activity,
  }) async {
    await _apiClient.post(
      '${ApiEndpoints.baseline}/sessions/$sessionId/break',
      data: {
        'durationSeconds': durationSeconds,
        'activity': activity,
      },
    );
  }

  /// Pause baseline session.
  Future<void> pauseSession(String sessionId) async {
    await _apiClient.post(
      '${ApiEndpoints.baseline}/sessions/$sessionId/pause',
    );
  }

  /// Resume baseline session.
  Future<BaselineQuestion> resumeSession(String sessionId) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '${ApiEndpoints.baseline}/sessions/$sessionId/resume',
    );

    return BaselineQuestion.fromJson(response.data!);
  }

  /// Complete baseline assessment.
  Future<BaselineProfile> completeBaseline(String sessionId) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '${ApiEndpoints.baseline}/sessions/$sessionId/complete',
    );

    return BaselineProfile.fromJson(response.data!);
  }

  /// Get baseline results summary.
  Future<List<BaselineSubjectResult>> getResults(String learnerId) async {
    final response = await _apiClient.get<List<dynamic>>(
      '${ApiEndpoints.baseline}/profiles/$learnerId/results',
    );

    return (response.data ?? [])
        .map((r) => BaselineSubjectResult.fromJson(r as Map<String, dynamic>))
        .toList();
  }

  /// Skip current subject (if allowed).
  Future<BaselineProfile> skipSubject({
    required String sessionId,
    required String subject,
    String? reason,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '${ApiEndpoints.baseline}/sessions/$sessionId/skip-subject',
      data: {
        'subject': subject,
        'reason': reason,
      },
    );

    return BaselineProfile.fromJson(response.data!);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIVERPOD PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for BaselineService.
final baselineServiceProvider = Provider<BaselineService>((ref) {
  return BaselineService(
    apiClient: AivoApiClient.instance,
  );
});

/// Provider for baseline profile.
final baselineProfileProvider =
    FutureProvider.family<BaselineProfile, String>((ref, learnerId) async {
  final service = ref.watch(baselineServiceProvider);
  return service.getProfile(learnerId);
});

/// State provider for current baseline session.
final currentBaselineSessionProvider =
    StateProvider<String?>((ref) => null);

/// State provider for current baseline question.
final currentBaselineQuestionProvider =
    StateProvider<BaselineQuestion?>((ref) => null);
