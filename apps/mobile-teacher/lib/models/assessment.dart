/// Assessment models for mobile assessment builder
/// Matches web-teacher API contracts for mobile parity
library;

import 'package:flutter/foundation.dart';

/// Types of assessments
enum AssessmentType {
  quiz('QUIZ'),
  test('TEST'),
  exam('EXAM'),
  practice('PRACTICE'),
  survey('SURVEY'),
  diagnostic('DIAGNOSTIC');

  const AssessmentType(this.value);
  final String value;

  static AssessmentType fromString(String value) {
    return AssessmentType.values.firstWhere(
      (t) => t.value == value.toUpperCase(),
      orElse: () => AssessmentType.quiz,
    );
  }

  String get label {
    switch (this) {
      case AssessmentType.quiz:
        return 'Quiz';
      case AssessmentType.test:
        return 'Test';
      case AssessmentType.exam:
        return 'Exam';
      case AssessmentType.practice:
        return 'Practice';
      case AssessmentType.survey:
        return 'Survey';
      case AssessmentType.diagnostic:
        return 'Diagnostic';
    }
  }
}

/// Assessment status
enum AssessmentStatus {
  draft('DRAFT'),
  published('PUBLISHED'),
  archived('ARCHIVED');

  const AssessmentStatus(this.value);
  final String value;

  static AssessmentStatus fromString(String value) {
    return AssessmentStatus.values.firstWhere(
      (s) => s.value == value.toUpperCase(),
      orElse: () => AssessmentStatus.draft,
    );
  }
}

/// Question types supported
enum QuestionType {
  multipleChoice('MULTIPLE_CHOICE'),
  multipleSelect('MULTIPLE_SELECT'),
  trueFalse('TRUE_FALSE'),
  shortAnswer('SHORT_ANSWER'),
  essay('ESSAY'),
  fillBlank('FILL_BLANK'),
  matching('MATCHING'),
  ordering('ORDERING'),
  numeric('NUMERIC');

  const QuestionType(this.value);
  final String value;

  static QuestionType fromString(String value) {
    return QuestionType.values.firstWhere(
      (t) => t.value == value.toUpperCase(),
      orElse: () => QuestionType.multipleChoice,
    );
  }

  String get label {
    switch (this) {
      case QuestionType.multipleChoice:
        return 'Multiple Choice';
      case QuestionType.multipleSelect:
        return 'Multiple Select';
      case QuestionType.trueFalse:
        return 'True/False';
      case QuestionType.shortAnswer:
        return 'Short Answer';
      case QuestionType.essay:
        return 'Essay';
      case QuestionType.fillBlank:
        return 'Fill in Blank';
      case QuestionType.matching:
        return 'Matching';
      case QuestionType.ordering:
        return 'Ordering';
      case QuestionType.numeric:
        return 'Numeric';
    }
  }

  String get description {
    switch (this) {
      case QuestionType.multipleChoice:
        return 'Select one correct answer';
      case QuestionType.multipleSelect:
        return 'Select all correct answers';
      case QuestionType.trueFalse:
        return 'True or false question';
      case QuestionType.shortAnswer:
        return 'Text response with keyword matching';
      case QuestionType.essay:
        return 'Long-form written response';
      case QuestionType.fillBlank:
        return 'Fill in missing words';
      case QuestionType.matching:
        return 'Match terms with definitions';
      case QuestionType.ordering:
        return 'Arrange items in order';
      case QuestionType.numeric:
        return 'Numerical answer';
    }
  }
}

/// Difficulty level for questions
enum Difficulty {
  easy('EASY'),
  medium('MEDIUM'),
  hard('HARD');

  const Difficulty(this.value);
  final String value;

  static Difficulty fromString(String value) {
    return Difficulty.values.firstWhere(
      (d) => d.value == value.toUpperCase(),
      orElse: () => Difficulty.medium,
    );
  }

  String get label => name[0].toUpperCase() + name.substring(1);
}

/// Answer option for multiple choice/select questions
@immutable
class QuestionOption {
  const QuestionOption({
    required this.id,
    required this.text,
    required this.isCorrect,
    this.feedback,
  });

  final String id;
  final String text;
  final bool isCorrect;
  final String? feedback;

  factory QuestionOption.fromJson(Map<String, dynamic> json) {
    return QuestionOption(
      id: json['id'] as String? ?? '',
      text: json['text'] as String? ?? '',
      isCorrect: json['isCorrect'] as bool? ?? json['is_correct'] as bool? ?? false,
      feedback: json['feedback'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'text': text,
        'isCorrect': isCorrect,
        if (feedback != null) 'feedback': feedback,
      };

  QuestionOption copyWith({
    String? id,
    String? text,
    bool? isCorrect,
    String? feedback,
  }) {
    return QuestionOption(
      id: id ?? this.id,
      text: text ?? this.text,
      isCorrect: isCorrect ?? this.isCorrect,
      feedback: feedback ?? this.feedback,
    );
  }
}

/// Fill in blank slot
@immutable
class FillBlankSlot {
  const FillBlankSlot({
    required this.id,
    required this.position,
    required this.correctAnswers,
    this.caseSensitive = false,
  });

  final String id;
  final int position;
  final List<String> correctAnswers;
  final bool caseSensitive;

  factory FillBlankSlot.fromJson(Map<String, dynamic> json) {
    return FillBlankSlot(
      id: json['id'] as String? ?? '',
      position: json['position'] as int? ?? 0,
      correctAnswers: List<String>.from(
        json['correctAnswers'] as List<dynamic>? ??
            json['correct_answers'] as List<dynamic>? ?? [],
      ),
      caseSensitive: json['caseSensitive'] as bool? ??
          json['case_sensitive'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'position': position,
        'correctAnswers': correctAnswers,
        'caseSensitive': caseSensitive,
      };
}

/// Matching pair for matching questions
@immutable
class MatchingPair {
  const MatchingPair({
    required this.id,
    required this.left,
    required this.right,
  });

  final String id;
  final String left;
  final String right;

  factory MatchingPair.fromJson(Map<String, dynamic> json) {
    return MatchingPair(
      id: json['id'] as String? ?? '',
      left: json['left'] as String? ?? '',
      right: json['right'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'left': left,
        'right': right,
      };

  MatchingPair copyWith({String? id, String? left, String? right}) {
    return MatchingPair(
      id: id ?? this.id,
      left: left ?? this.left,
      right: right ?? this.right,
    );
  }
}

/// Individual question in an assessment
@immutable
class Question {
  const Question({
    required this.id,
    required this.type,
    required this.stem,
    this.stemHtml,
    required this.points,
    required this.difficulty,
    this.tags = const [],
    this.hint,
    this.explanation,
    this.options,
    this.correctOption,
    this.correctOptions,
    this.correctAnswer,
    this.blanks,
    this.pairs,
    this.correctOrder,
    this.imageUrl,
    this.tolerance,
    this.unit,
    this.partialCredit = false,
    this.rubricId,
    this.standards,
    this.isPublic = false,
    this.status = AssessmentStatus.draft,
  });

  final String id;
  final QuestionType type;
  final String stem;
  final String? stemHtml;
  final int points;
  final Difficulty difficulty;
  final List<String> tags;
  final String? hint;
  final String? explanation;

  // Multiple choice / Multiple select
  final List<QuestionOption>? options;
  final int? correctOption; // For single choice
  final List<int>? correctOptions; // For multiple select

  // Short answer / Essay / True-False / Numeric
  final dynamic correctAnswer;

  // Fill in blank
  final List<FillBlankSlot>? blanks;

  // Matching
  final List<MatchingPair>? pairs;

  // Ordering
  final List<String>? correctOrder;

  // Media
  final String? imageUrl;

  // Numeric specific
  final double? tolerance;
  final String? unit;

  // Grading
  final bool partialCredit;
  final String? rubricId;
  final List<String>? standards;

  // Meta
  final bool isPublic;
  final AssessmentStatus status;

  factory Question.fromJson(Map<String, dynamic> json) {
    return Question(
      id: json['id'] as String? ?? '',
      type: QuestionType.fromString(json['type'] as String? ?? 'MULTIPLE_CHOICE'),
      stem: json['stem'] as String? ?? '',
      stemHtml: json['stemHtml'] as String?,
      points: json['points'] as int? ?? 1,
      difficulty: Difficulty.fromString(json['difficulty'] as String? ?? 'MEDIUM'),
      tags: List<String>.from(json['tags'] as List<dynamic>? ?? []),
      hint: json['hint'] as String?,
      explanation: json['explanation'] as String?,
      options: json['options'] != null
          ? (json['options'] as List<dynamic>)
              .map((o) => QuestionOption.fromJson(o as Map<String, dynamic>))
              .toList()
          : null,
      correctOption: json['correctOption'] as int?,
      correctOptions: json['correctOptions'] != null
          ? List<int>.from(json['correctOptions'] as List<dynamic>)
          : null,
      correctAnswer: json['correctAnswer'],
      blanks: json['blanks'] != null
          ? (json['blanks'] as List<dynamic>)
              .map((b) => FillBlankSlot.fromJson(b as Map<String, dynamic>))
              .toList()
          : null,
      pairs: json['pairs'] != null
          ? (json['pairs'] as List<dynamic>)
              .map((p) => MatchingPair.fromJson(p as Map<String, dynamic>))
              .toList()
          : null,
      correctOrder: json['correctOrder'] != null
          ? List<String>.from(json['correctOrder'] as List<dynamic>)
          : null,
      imageUrl: json['imageUrl'] as String?,
      tolerance: (json['tolerance'] as num?)?.toDouble(),
      unit: json['unit'] as String?,
      partialCredit: json['partialCredit'] as bool? ?? false,
      rubricId: json['rubricId'] as String?,
      standards: json['standards'] != null
          ? List<String>.from(json['standards'] as List<dynamic>)
          : null,
      isPublic: json['isPublic'] as bool? ?? false,
      status: AssessmentStatus.fromString(json['status'] as String? ?? 'DRAFT'),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.value,
        'stem': stem,
        if (stemHtml != null) 'stemHtml': stemHtml,
        'points': points,
        'difficulty': difficulty.value,
        'tags': tags,
        if (hint != null) 'hint': hint,
        if (explanation != null) 'explanation': explanation,
        if (options != null) 'options': options!.map((o) => o.toJson()).toList(),
        if (correctOption != null) 'correctOption': correctOption,
        if (correctOptions != null) 'correctOptions': correctOptions,
        if (correctAnswer != null) 'correctAnswer': correctAnswer,
        if (blanks != null) 'blanks': blanks!.map((b) => b.toJson()).toList(),
        if (pairs != null) 'pairs': pairs!.map((p) => p.toJson()).toList(),
        if (correctOrder != null) 'correctOrder': correctOrder,
        if (imageUrl != null) 'imageUrl': imageUrl,
        if (tolerance != null) 'tolerance': tolerance,
        if (unit != null) 'unit': unit,
        'partialCredit': partialCredit,
        if (rubricId != null) 'rubricId': rubricId,
        if (standards != null) 'standards': standards,
        'isPublic': isPublic,
        'status': status.value,
      };

  Question copyWith({
    String? id,
    QuestionType? type,
    String? stem,
    String? stemHtml,
    int? points,
    Difficulty? difficulty,
    List<String>? tags,
    String? hint,
    String? explanation,
    List<QuestionOption>? options,
    int? correctOption,
    List<int>? correctOptions,
    dynamic correctAnswer,
    List<FillBlankSlot>? blanks,
    List<MatchingPair>? pairs,
    List<String>? correctOrder,
    String? imageUrl,
    double? tolerance,
    String? unit,
    bool? partialCredit,
    String? rubricId,
    List<String>? standards,
    bool? isPublic,
    AssessmentStatus? status,
  }) {
    return Question(
      id: id ?? this.id,
      type: type ?? this.type,
      stem: stem ?? this.stem,
      stemHtml: stemHtml ?? this.stemHtml,
      points: points ?? this.points,
      difficulty: difficulty ?? this.difficulty,
      tags: tags ?? this.tags,
      hint: hint ?? this.hint,
      explanation: explanation ?? this.explanation,
      options: options ?? this.options,
      correctOption: correctOption ?? this.correctOption,
      correctOptions: correctOptions ?? this.correctOptions,
      correctAnswer: correctAnswer ?? this.correctAnswer,
      blanks: blanks ?? this.blanks,
      pairs: pairs ?? this.pairs,
      correctOrder: correctOrder ?? this.correctOrder,
      imageUrl: imageUrl ?? this.imageUrl,
      tolerance: tolerance ?? this.tolerance,
      unit: unit ?? this.unit,
      partialCredit: partialCredit ?? this.partialCredit,
      rubricId: rubricId ?? this.rubricId,
      standards: standards ?? this.standards,
      isPublic: isPublic ?? this.isPublic,
      status: status ?? this.status,
    );
  }
}

/// Assessment settings
@immutable
class AssessmentSettings {
  const AssessmentSettings({
    this.timeLimit,
    this.allowLateSubmissions = false,
    this.latePenaltyPercent,
    this.allowBackNavigation = true,
    this.showOneQuestionAtATime = false,
    this.shuffleQuestions = false,
    this.shuffleOptions = false,
    this.requireLockdownBrowser = false,
    this.preventCopyPaste = false,
    this.detectTabSwitch = false,
    this.maxViolations = 3,
    this.maxAttempts = 1,
    this.attemptsGradingPolicy = 'HIGHEST',
    this.showCorrectAnswers = true,
    this.showCorrectAnswersAfter = 'IMMEDIATE',
    this.showPointValues = true,
    this.showFeedback = true,
    this.passingScore,
    this.gradeReleasePolicy = 'IMMEDIATE',
  });

  final int? timeLimit; // minutes
  final bool allowLateSubmissions;
  final double? latePenaltyPercent;
  final bool allowBackNavigation;
  final bool showOneQuestionAtATime;
  final bool shuffleQuestions;
  final bool shuffleOptions;
  final bool requireLockdownBrowser;
  final bool preventCopyPaste;
  final bool detectTabSwitch;
  final int maxViolations;
  final int maxAttempts;
  final String attemptsGradingPolicy;
  final bool showCorrectAnswers;
  final String showCorrectAnswersAfter;
  final bool showPointValues;
  final bool showFeedback;
  final double? passingScore;
  final String gradeReleasePolicy;

  factory AssessmentSettings.fromJson(Map<String, dynamic> json) {
    return AssessmentSettings(
      timeLimit: json['timeLimit'] as int?,
      allowLateSubmissions: json['allowLateSubmissions'] as bool? ?? false,
      latePenaltyPercent: (json['latePenaltyPercent'] as num?)?.toDouble(),
      allowBackNavigation: json['allowBackNavigation'] as bool? ?? true,
      showOneQuestionAtATime: json['showOneQuestionAtATime'] as bool? ?? false,
      shuffleQuestions: json['shuffleQuestions'] as bool? ?? false,
      shuffleOptions: json['shuffleOptions'] as bool? ?? false,
      requireLockdownBrowser: json['requireLockdownBrowser'] as bool? ?? false,
      preventCopyPaste: json['preventCopyPaste'] as bool? ?? false,
      detectTabSwitch: json['detectTabSwitch'] as bool? ?? false,
      maxViolations: json['maxViolations'] as int? ?? 3,
      maxAttempts: json['maxAttempts'] as int? ?? 1,
      attemptsGradingPolicy: json['attemptsGradingPolicy'] as String? ?? 'HIGHEST',
      showCorrectAnswers: json['showCorrectAnswers'] as bool? ?? true,
      showCorrectAnswersAfter: json['showCorrectAnswersAfter'] as String? ?? 'IMMEDIATE',
      showPointValues: json['showPointValues'] as bool? ?? true,
      showFeedback: json['showFeedback'] as bool? ?? true,
      passingScore: (json['passingScore'] as num?)?.toDouble(),
      gradeReleasePolicy: json['gradeReleasePolicy'] as String? ?? 'IMMEDIATE',
    );
  }

  Map<String, dynamic> toJson() => {
        if (timeLimit != null) 'timeLimit': timeLimit,
        'allowLateSubmissions': allowLateSubmissions,
        if (latePenaltyPercent != null) 'latePenaltyPercent': latePenaltyPercent,
        'allowBackNavigation': allowBackNavigation,
        'showOneQuestionAtATime': showOneQuestionAtATime,
        'shuffleQuestions': shuffleQuestions,
        'shuffleOptions': shuffleOptions,
        'requireLockdownBrowser': requireLockdownBrowser,
        'preventCopyPaste': preventCopyPaste,
        'detectTabSwitch': detectTabSwitch,
        'maxViolations': maxViolations,
        'maxAttempts': maxAttempts,
        'attemptsGradingPolicy': attemptsGradingPolicy,
        'showCorrectAnswers': showCorrectAnswers,
        'showCorrectAnswersAfter': showCorrectAnswersAfter,
        'showPointValues': showPointValues,
        'showFeedback': showFeedback,
        if (passingScore != null) 'passingScore': passingScore,
        'gradeReleasePolicy': gradeReleasePolicy,
      };

  AssessmentSettings copyWith({
    int? timeLimit,
    bool? allowLateSubmissions,
    double? latePenaltyPercent,
    bool? allowBackNavigation,
    bool? showOneQuestionAtATime,
    bool? shuffleQuestions,
    bool? shuffleOptions,
    bool? requireLockdownBrowser,
    bool? preventCopyPaste,
    bool? detectTabSwitch,
    int? maxViolations,
    int? maxAttempts,
    String? attemptsGradingPolicy,
    bool? showCorrectAnswers,
    String? showCorrectAnswersAfter,
    bool? showPointValues,
    bool? showFeedback,
    double? passingScore,
    String? gradeReleasePolicy,
  }) {
    return AssessmentSettings(
      timeLimit: timeLimit ?? this.timeLimit,
      allowLateSubmissions: allowLateSubmissions ?? this.allowLateSubmissions,
      latePenaltyPercent: latePenaltyPercent ?? this.latePenaltyPercent,
      allowBackNavigation: allowBackNavigation ?? this.allowBackNavigation,
      showOneQuestionAtATime: showOneQuestionAtATime ?? this.showOneQuestionAtATime,
      shuffleQuestions: shuffleQuestions ?? this.shuffleQuestions,
      shuffleOptions: shuffleOptions ?? this.shuffleOptions,
      requireLockdownBrowser: requireLockdownBrowser ?? this.requireLockdownBrowser,
      preventCopyPaste: preventCopyPaste ?? this.preventCopyPaste,
      detectTabSwitch: detectTabSwitch ?? this.detectTabSwitch,
      maxViolations: maxViolations ?? this.maxViolations,
      maxAttempts: maxAttempts ?? this.maxAttempts,
      attemptsGradingPolicy: attemptsGradingPolicy ?? this.attemptsGradingPolicy,
      showCorrectAnswers: showCorrectAnswers ?? this.showCorrectAnswers,
      showCorrectAnswersAfter: showCorrectAnswersAfter ?? this.showCorrectAnswersAfter,
      showPointValues: showPointValues ?? this.showPointValues,
      showFeedback: showFeedback ?? this.showFeedback,
      passingScore: passingScore ?? this.passingScore,
      gradeReleasePolicy: gradeReleasePolicy ?? this.gradeReleasePolicy,
    );
  }
}

/// Complete assessment model
@immutable
class Assessment {
  const Assessment({
    required this.id,
    required this.tenantId,
    required this.name,
    this.description,
    this.instructions,
    required this.type,
    required this.status,
    required this.questions,
    required this.settings,
    this.availableFrom,
    this.availableUntil,
    required this.totalPoints,
    this.passingScore,
    this.standards,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    required this.version,
  });

  final String id;
  final String tenantId;
  final String name;
  final String? description;
  final String? instructions;
  final AssessmentType type;
  final AssessmentStatus status;
  final List<Question> questions;
  final AssessmentSettings settings;
  final DateTime? availableFrom;
  final DateTime? availableUntil;
  final int totalPoints;
  final double? passingScore;
  final List<String>? standards;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int version;

  /// Number of questions
  int get questionCount => questions.length;

  /// Whether the assessment is published
  bool get isPublished => status == AssessmentStatus.published;

  /// Whether the assessment is currently available
  bool get isAvailable {
    if (!isPublished) return false;
    final now = DateTime.now();
    if (availableFrom != null && now.isBefore(availableFrom!)) return false;
    if (availableUntil != null && now.isAfter(availableUntil!)) return false;
    return true;
  }

  factory Assessment.fromJson(Map<String, dynamic> json) {
    return Assessment(
      id: json['id'] as String? ?? '',
      tenantId: json['tenantId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      instructions: json['instructions'] as String?,
      type: AssessmentType.fromString(json['type'] as String? ?? 'QUIZ'),
      status: AssessmentStatus.fromString(json['status'] as String? ?? 'DRAFT'),
      questions: (json['questions'] as List<dynamic>? ?? [])
          .map((q) => Question.fromJson(q as Map<String, dynamic>))
          .toList(),
      settings: AssessmentSettings.fromJson(
        json['settings'] as Map<String, dynamic>? ?? {},
      ),
      availableFrom: json['availableFrom'] != null
          ? DateTime.tryParse(json['availableFrom'] as String)
          : null,
      availableUntil: json['availableUntil'] != null
          ? DateTime.tryParse(json['availableUntil'] as String)
          : null,
      totalPoints: json['totalPoints'] as int? ?? 0,
      passingScore: (json['passingScore'] as num?)?.toDouble(),
      standards: json['standards'] != null
          ? List<String>.from(json['standards'] as List<dynamic>)
          : null,
      createdBy: json['createdBy'] as String? ?? '',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? '') ??
          DateTime.now(),
      version: json['version'] as int? ?? 1,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'tenantId': tenantId,
        'name': name,
        if (description != null) 'description': description,
        if (instructions != null) 'instructions': instructions,
        'type': type.value,
        'status': status.value,
        'questions': questions.map((q) => q.toJson()).toList(),
        'settings': settings.toJson(),
        if (availableFrom != null) 'availableFrom': availableFrom!.toIso8601String(),
        if (availableUntil != null) 'availableUntil': availableUntil!.toIso8601String(),
        'totalPoints': totalPoints,
        if (passingScore != null) 'passingScore': passingScore,
        if (standards != null) 'standards': standards,
        'createdBy': createdBy,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'version': version,
      };

  Assessment copyWith({
    String? id,
    String? tenantId,
    String? name,
    String? description,
    String? instructions,
    AssessmentType? type,
    AssessmentStatus? status,
    List<Question>? questions,
    AssessmentSettings? settings,
    DateTime? availableFrom,
    DateTime? availableUntil,
    int? totalPoints,
    double? passingScore,
    List<String>? standards,
    String? createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
    int? version,
  }) {
    return Assessment(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      description: description ?? this.description,
      instructions: instructions ?? this.instructions,
      type: type ?? this.type,
      status: status ?? this.status,
      questions: questions ?? this.questions,
      settings: settings ?? this.settings,
      availableFrom: availableFrom ?? this.availableFrom,
      availableUntil: availableUntil ?? this.availableUntil,
      totalPoints: totalPoints ?? this.totalPoints,
      passingScore: passingScore ?? this.passingScore,
      standards: standards ?? this.standards,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      version: version ?? this.version,
    );
  }
}
