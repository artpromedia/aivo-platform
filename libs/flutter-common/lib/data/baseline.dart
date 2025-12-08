/// Baseline assessment domain types and models used across mobile apps.

// Navigation diagram (Parent flow):
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Dashboard -> AddChild -> (consent) -> CreateBaselineProfile -> Dashboard   │
// │ Dashboard: BaselineCard shows status per child                              │
// │   - NOT_STARTED: "Start Baseline" -> calls /start -> IN_PROGRESS            │
// │   - IN_PROGRESS: "Resume Baseline" -> opens learner app flow                │
// │   - COMPLETED: "View Results" -> BaselineResultScreen                       │
// │   - FINAL_ACCEPTED: "View Results" -> BaselineResultScreen (read-only)      │
// │ BaselineResultScreen:                                                       │
// │   - "Accept Results" -> /accept-final -> FINAL_ACCEPTED                     │
// │   - "Request Retest" (if attemptCount == 1) -> modal -> /retest             │
// └─────────────────────────────────────────────────────────────────────────────┘

// Navigation diagram (Learner flow):
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ PinEntry -> check baseline status -> route:                                 │
// │   - NOT_STARTED: BaselineIntroScreen -> Start -> BaselineQuestionScreen     │
// │   - IN_PROGRESS: BaselineQuestionScreen (resume from last unanswered)       │
// │   - COMPLETED/FINAL_ACCEPTED: TodayPlanScreen                               │
// │ BaselineQuestionScreen:                                                     │
// │   - loop 25 questions: fetch next -> display -> submit answer               │
// │   - "Take a break" button -> BreakScreen -> "Ready to continue" -> return   │
// │   - After Q25: /complete -> BaselineCompleteScreen -> TodayPlan             │
// └─────────────────────────────────────────────────────────────────────────────┘

/// The five baseline assessment domains.
enum BaselineDomain {
  ela('ELA', 'Reading & Writing'),
  math('MATH', 'Math'),
  science('SCIENCE', 'Science'),
  speech('SPEECH', 'Speech & Language'),
  sel('SEL', 'Social-Emotional');

  const BaselineDomain(this.code, this.label);
  final String code;
  final String label;

  static BaselineDomain fromCode(String code) {
    return BaselineDomain.values.firstWhere(
      (d) => d.code == code.toUpperCase(),
      orElse: () => BaselineDomain.ela,
    );
  }
}

/// Baseline profile status enum.
enum BaselineProfileStatus {
  notStarted('NOT_STARTED'),
  inProgress('IN_PROGRESS'),
  completed('COMPLETED'),
  retestAllowed('RETEST_ALLOWED'),
  finalAccepted('FINAL_ACCEPTED');

  const BaselineProfileStatus(this.value);
  final String value;

  static BaselineProfileStatus fromValue(String value) {
    return BaselineProfileStatus.values.firstWhere(
      (s) => s.value == value,
      orElse: () => BaselineProfileStatus.notStarted,
    );
  }
}

/// Retest reason types.
enum RetestReason {
  distracted('DISTRACTED', 'Child was distracted'),
  anxiety('ANXIETY', 'Test anxiety'),
  technicalIssue('TECHNICAL_ISSUE', 'Technical issue'),
  other('OTHER', 'Other reason');

  const RetestReason(this.code, this.label);
  final String code;
  final String label;

  static RetestReason fromCode(String code) {
    return RetestReason.values.firstWhere(
      (r) => r.code == code,
      orElse: () => RetestReason.other,
    );
  }
}

/// Domain score result.
class DomainScore {
  const DomainScore({
    required this.domain,
    required this.correct,
    required this.total,
    required this.percentage,
  });

  final BaselineDomain domain;
  final int correct;
  final int total;
  final double percentage;

  factory DomainScore.fromJson(Map<String, dynamic> json) {
    return DomainScore(
      domain: BaselineDomain.fromCode(json['domain']?.toString() ?? 'ELA'),
      correct: (json['correct'] as num?)?.toInt() ?? 0,
      total: (json['total'] as num?)?.toInt() ?? 5,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

/// Baseline attempt summary.
class BaselineAttempt {
  const BaselineAttempt({
    required this.id,
    required this.attemptNumber,
    required this.startedAt,
    this.completedAt,
    this.domainScores = const [],
    this.overallScore,
    this.retestReason,
    this.retestNotes,
  });

  final String id;
  final int attemptNumber;
  final DateTime startedAt;
  final DateTime? completedAt;
  final List<DomainScore> domainScores;
  final double? overallScore;
  final RetestReason? retestReason;
  final String? retestNotes;

  bool get isCompleted => completedAt != null;

  factory BaselineAttempt.fromJson(Map<String, dynamic> json) {
    final domainScoresJson = json['domainScoresJson'] as Map<String, dynamic>?;
    final domainScores = <DomainScore>[];
    if (domainScoresJson != null) {
      for (final entry in domainScoresJson.entries) {
        final data = entry.value as Map<String, dynamic>? ?? {};
        domainScores.add(DomainScore(
          domain: BaselineDomain.fromCode(entry.key),
          correct: (data['correct'] as num?)?.toInt() ?? 0,
          total: (data['total'] as num?)?.toInt() ?? 5,
          percentage: (data['correct'] as num? ?? 0) / (data['total'] as num? ?? 5),
        ));
      }
    }

    final overallJson = json['overallEstimateJson'] as Map<String, dynamic>?;
    final overallScore = overallJson?['score'] as num?;

    return BaselineAttempt(
      id: json['id']?.toString() ?? '',
      attemptNumber: (json['attemptNumber'] as num?)?.toInt() ?? 1,
      startedAt: DateTime.tryParse(json['startedAt']?.toString() ?? '') ?? DateTime.now(),
      completedAt: json['completedAt'] != null
          ? DateTime.tryParse(json['completedAt'].toString())
          : null,
      domainScores: domainScores,
      overallScore: overallScore?.toDouble(),
      retestReason: json['retestReasonType'] != null
          ? RetestReason.fromCode(json['retestReasonType'].toString())
          : null,
      retestNotes: json['retestReasonNotes']?.toString(),
    );
  }
}

/// Baseline profile with attempts.
class BaselineProfile {
  const BaselineProfile({
    required this.id,
    required this.tenantId,
    required this.learnerId,
    required this.gradeBand,
    required this.status,
    required this.attemptCount,
    this.finalAttemptId,
    this.attempts = const [],
  });

  final String id;
  final String tenantId;
  final String learnerId;
  final String gradeBand;
  final BaselineProfileStatus status;
  final int attemptCount;
  final String? finalAttemptId;
  final List<BaselineAttempt> attempts;

  /// Get the active (in-progress) attempt if any.
  BaselineAttempt? get activeAttempt {
    try {
      return attempts.firstWhere((a) => !a.isCompleted);
    } catch (_) {
      return null;
    }
  }

  /// Get the most recent completed attempt.
  BaselineAttempt? get latestCompletedAttempt {
    final completed = attempts.where((a) => a.isCompleted).toList();
    if (completed.isEmpty) return null;
    completed.sort((a, b) => b.attemptNumber.compareTo(a.attemptNumber));
    return completed.first;
  }

  /// Whether a retest can be requested.
  bool get canRequestRetest =>
      status == BaselineProfileStatus.completed && attemptCount == 1;

  factory BaselineProfile.fromJson(Map<String, dynamic> json) {
    final attemptsJson = json['attempts'] as List? ?? [];
    final attempts = attemptsJson
        .whereType<Map<String, dynamic>>()
        .map(BaselineAttempt.fromJson)
        .toList();

    return BaselineProfile(
      id: json['id']?.toString() ?? '',
      tenantId: json['tenantId']?.toString() ?? '',
      learnerId: json['learnerId']?.toString() ?? '',
      gradeBand: json['gradeBand']?.toString() ?? 'K5',
      status: BaselineProfileStatus.fromValue(json['status']?.toString() ?? 'NOT_STARTED'),
      attemptCount: (json['attemptCount'] as num?)?.toInt() ?? 0,
      finalAttemptId: json['finalAttemptId']?.toString(),
      attempts: attempts,
    );
  }
}

/// A baseline question item.
class BaselineItem {
  const BaselineItem({
    required this.itemId,
    required this.sequence,
    required this.totalItems,
    required this.domain,
    required this.skillCode,
    required this.questionType,
    required this.questionText,
    this.options,
  });

  final String itemId;
  final int sequence;
  final int totalItems;
  final BaselineDomain domain;
  final String skillCode;
  final String questionType; // MULTIPLE_CHOICE or OPEN_ENDED
  final String questionText;
  final List<String>? options;

  bool get isMultipleChoice => questionType == 'MULTIPLE_CHOICE';
  bool get isOpenEnded => questionType == 'OPEN_ENDED';

  factory BaselineItem.fromJson(Map<String, dynamic> json) {
    final optionsList = json['options'] as List?;
    return BaselineItem(
      itemId: json['itemId']?.toString() ?? '',
      sequence: (json['sequence'] as num?)?.toInt() ?? 1,
      totalItems: (json['totalItems'] as num?)?.toInt() ?? 25,
      domain: BaselineDomain.fromCode(json['domain']?.toString() ?? 'ELA'),
      skillCode: json['skillCode']?.toString() ?? '',
      questionType: json['questionType']?.toString() ?? 'MULTIPLE_CHOICE',
      questionText: json['questionText']?.toString() ?? '',
      options: optionsList?.map((o) => o.toString()).toList(),
    );
  }
}

/// Response for starting a baseline attempt.
class StartAttemptResponse {
  const StartAttemptResponse({
    required this.attemptId,
    required this.attemptNumber,
    required this.totalItems,
  });

  final String attemptId;
  final int attemptNumber;
  final int totalItems;

  factory StartAttemptResponse.fromJson(Map<String, dynamic> json) {
    return StartAttemptResponse(
      attemptId: json['attemptId']?.toString() ?? '',
      attemptNumber: (json['attemptNumber'] as num?)?.toInt() ?? 1,
      totalItems: (json['totalItems'] as num?)?.toInt() ?? 25,
    );
  }
}

/// Response for submitting an answer.
class AnswerResponse {
  const AnswerResponse({
    required this.responseId,
    required this.isCorrect,
    this.score,
  });

  final String responseId;
  final bool isCorrect;
  final double? score;

  factory AnswerResponse.fromJson(Map<String, dynamic> json) {
    return AnswerResponse(
      responseId: json['responseId']?.toString() ?? '',
      isCorrect: json['isCorrect'] == true,
      score: (json['score'] as num?)?.toDouble(),
    );
  }
}

/// Response for completing an attempt.
class CompleteAttemptResponse {
  const CompleteAttemptResponse({
    required this.attemptId,
    required this.status,
    required this.score,
    required this.domainScores,
  });

  final String attemptId;
  final String status;
  final double score;
  final List<DomainScore> domainScores;

  factory CompleteAttemptResponse.fromJson(Map<String, dynamic> json) {
    final scoresJson = json['domainScores'] as List? ?? [];
    final domainScores = scoresJson
        .whereType<Map<String, dynamic>>()
        .map(DomainScore.fromJson)
        .toList();

    return CompleteAttemptResponse(
      attemptId: json['attemptId']?.toString() ?? '',
      status: json['status']?.toString() ?? 'COMPLETED',
      score: (json['score'] as num?)?.toDouble() ?? 0.0,
      domainScores: domainScores,
    );
  }
}

/// Response from /next endpoint.
class NextItemResponse {
  const NextItemResponse({
    required this.complete,
    this.item,
    this.message,
  });

  final bool complete;
  final BaselineItem? item;
  final String? message;

  factory NextItemResponse.fromJson(Map<String, dynamic> json) {
    final itemJson = json['item'] as Map<String, dynamic>?;
    return NextItemResponse(
      complete: json['complete'] == true,
      item: itemJson != null ? BaselineItem.fromJson(itemJson) : null,
      message: json['message']?.toString(),
    );
  }
}
