/// Writing models for writing assistance features
library;


/// Writing task type
enum WritingTaskType {
  freeWrite,
  response,
  essay,
  story,
  journal,
  letter,
  poem,
  report,
}

/// Writing difficulty level
enum WritingLevel {
  beginner,      // K-1
  elementary,    // 2-3
  intermediate,  // 4-5
  advanced,      // 6-8
  proficient,    // 9-12
}

/// Writing prompt
class WritingPrompt {
  final String id;
  final String title;
  final String prompt;
  final WritingTaskType type;
  final WritingLevel level;
  final int? minWords;
  final int? maxWords;
  final Duration? timeLimit;
  final List<WritingScaffold>? scaffolds;
  final List<String>? vocabularyWords;
  final String? rubricId;

  const WritingPrompt({
    required this.id,
    required this.title,
    required this.prompt,
    this.type = WritingTaskType.freeWrite,
    this.level = WritingLevel.elementary,
    this.minWords,
    this.maxWords,
    this.timeLimit,
    this.scaffolds,
    this.vocabularyWords,
    this.rubricId,
  });

  factory WritingPrompt.fromJson(Map<String, dynamic> json) {
    return WritingPrompt(
      id: json['id'] as String,
      title: json['title'] as String,
      prompt: json['prompt'] as String,
      type: WritingTaskType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => WritingTaskType.freeWrite,
      ),
      level: WritingLevel.values.firstWhere(
        (e) => e.name == json['level'],
        orElse: () => WritingLevel.elementary,
      ),
      minWords: json['minWords'] as int?,
      maxWords: json['maxWords'] as int?,
      timeLimit: json['timeLimit'] != null
          ? Duration(minutes: json['timeLimit'] as int)
          : null,
      scaffolds: (json['scaffolds'] as List?)
          ?.map((e) => WritingScaffold.fromJson(e as Map<String, dynamic>))
          .toList(),
      vocabularyWords: (json['vocabularyWords'] as List?)?.cast<String>(),
      rubricId: json['rubricId'] as String?,
    );
  }
}

/// Writing scaffold for guided writing
class WritingScaffold {
  final String id;
  final String label;
  final String placeholder;
  final int orderIndex;
  final bool isRequired;

  const WritingScaffold({
    required this.id,
    required this.label,
    required this.placeholder,
    required this.orderIndex,
    this.isRequired = true,
  });

  factory WritingScaffold.fromJson(Map<String, dynamic> json) {
    return WritingScaffold(
      id: json['id'] as String,
      label: json['label'] as String,
      placeholder: json['placeholder'] as String,
      orderIndex: json['orderIndex'] as int,
      isRequired: json['isRequired'] as bool? ?? true,
    );
  }
}

/// Writing session
class WritingSession {
  final String id;
  final String promptId;
  final String studentId;
  final String content;
  final Map<String, String> scaffoldResponses;
  final DateTime startedAt;
  final DateTime? submittedAt;
  final WritingMetrics metrics;
  final List<WritingRevision> revisions;

  const WritingSession({
    required this.id,
    required this.promptId,
    required this.studentId,
    this.content = '',
    this.scaffoldResponses = const {},
    required this.startedAt,
    this.submittedAt,
    required this.metrics,
    this.revisions = const [],
  });

  WritingSession copyWith({
    String? content,
    Map<String, String>? scaffoldResponses,
    DateTime? submittedAt,
    WritingMetrics? metrics,
    List<WritingRevision>? revisions,
  }) {
    return WritingSession(
      id: id,
      promptId: promptId,
      studentId: studentId,
      content: content ?? this.content,
      scaffoldResponses: scaffoldResponses ?? this.scaffoldResponses,
      startedAt: startedAt,
      submittedAt: submittedAt ?? this.submittedAt,
      metrics: metrics ?? this.metrics,
      revisions: revisions ?? this.revisions,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'promptId': promptId,
    'studentId': studentId,
    'content': content,
    'scaffoldResponses': scaffoldResponses,
    'startedAt': startedAt.toIso8601String(),
    'submittedAt': submittedAt?.toIso8601String(),
    'metrics': metrics.toJson(),
    'revisions': revisions.map((r) => r.toJson()).toList(),
  };
}

/// Writing metrics
class WritingMetrics {
  final int wordCount;
  final int sentenceCount;
  final int paragraphCount;
  final double averageWordLength;
  final double averageSentenceLength;
  final int uniqueWords;
  final Duration writingTime;
  final int pauseCount;
  final Duration totalPauseTime;

  const WritingMetrics({
    this.wordCount = 0,
    this.sentenceCount = 0,
    this.paragraphCount = 0,
    this.averageWordLength = 0,
    this.averageSentenceLength = 0,
    this.uniqueWords = 0,
    this.writingTime = Duration.zero,
    this.pauseCount = 0,
    this.totalPauseTime = Duration.zero,
  });

  WritingMetrics copyWith({
    int? wordCount,
    int? sentenceCount,
    int? paragraphCount,
    double? averageWordLength,
    double? averageSentenceLength,
    int? uniqueWords,
    Duration? writingTime,
    int? pauseCount,
    Duration? totalPauseTime,
  }) {
    return WritingMetrics(
      wordCount: wordCount ?? this.wordCount,
      sentenceCount: sentenceCount ?? this.sentenceCount,
      paragraphCount: paragraphCount ?? this.paragraphCount,
      averageWordLength: averageWordLength ?? this.averageWordLength,
      averageSentenceLength: averageSentenceLength ?? this.averageSentenceLength,
      uniqueWords: uniqueWords ?? this.uniqueWords,
      writingTime: writingTime ?? this.writingTime,
      pauseCount: pauseCount ?? this.pauseCount,
      totalPauseTime: totalPauseTime ?? this.totalPauseTime,
    );
  }

  Map<String, dynamic> toJson() => {
    'wordCount': wordCount,
    'sentenceCount': sentenceCount,
    'paragraphCount': paragraphCount,
    'averageWordLength': averageWordLength,
    'averageSentenceLength': averageSentenceLength,
    'uniqueWords': uniqueWords,
    'writingTime': writingTime.inSeconds,
    'pauseCount': pauseCount,
    'totalPauseTime': totalPauseTime.inSeconds,
  };
}

/// Writing revision
class WritingRevision {
  final DateTime timestamp;
  final String changeType;
  final int position;
  final String? oldText;
  final String? newText;

  const WritingRevision({
    required this.timestamp,
    required this.changeType,
    required this.position,
    this.oldText,
    this.newText,
  });

  Map<String, dynamic> toJson() => {
    'timestamp': timestamp.toIso8601String(),
    'changeType': changeType,
    'position': position,
    'oldText': oldText,
    'newText': newText,
  };
}

/// AI writing suggestion
class WritingSuggestion {
  final String id;
  final SuggestionType type;
  final String message;
  final int? startPosition;
  final int? endPosition;
  final String? replacement;
  final double confidence;

  const WritingSuggestion({
    required this.id,
    required this.type,
    required this.message,
    this.startPosition,
    this.endPosition,
    this.replacement,
    this.confidence = 1.0,
  });

  factory WritingSuggestion.fromJson(Map<String, dynamic> json) {
    return WritingSuggestion(
      id: json['id'] as String,
      type: SuggestionType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => SuggestionType.general,
      ),
      message: json['message'] as String,
      startPosition: json['startPosition'] as int?,
      endPosition: json['endPosition'] as int?,
      replacement: json['replacement'] as String?,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 1.0,
    );
  }
}

/// Suggestion type
enum SuggestionType {
  spelling,
  grammar,
  punctuation,
  wordChoice,
  sentenceStructure,
  clarity,
  vocabulary,
  transition,
  general,
  encouragement,
}

/// Writing feedback
class WritingFeedback {
  final String id;
  final String sessionId;
  final double overallScore;
  final Map<String, double> rubricScores;
  final List<WritingSuggestion> suggestions;
  final String summary;
  final List<String> strengths;
  final List<String> areasForImprovement;

  const WritingFeedback({
    required this.id,
    required this.sessionId,
    required this.overallScore,
    this.rubricScores = const {},
    this.suggestions = const [],
    this.summary = '',
    this.strengths = const [],
    this.areasForImprovement = const [],
  });

  factory WritingFeedback.fromJson(Map<String, dynamic> json) {
    return WritingFeedback(
      id: json['id'] as String,
      sessionId: json['sessionId'] as String,
      overallScore: (json['overallScore'] as num).toDouble(),
      rubricScores: Map<String, double>.from(
        (json['rubricScores'] as Map? ?? {}).map(
          (k, v) => MapEntry(k as String, (v as num).toDouble()),
        ),
      ),
      suggestions: (json['suggestions'] as List?)
          ?.map((e) => WritingSuggestion.fromJson(e as Map<String, dynamic>))
          .toList() ?? [],
      summary: json['summary'] as String? ?? '',
      strengths: List<String>.from(json['strengths'] as List? ?? []),
      areasForImprovement: List<String>.from(json['areasForImprovement'] as List? ?? []),
    );
  }
}

/// Word bank item
class WordBankItem {
  final String word;
  final String? definition;
  final String? partOfSpeech;
  final String? exampleSentence;
  final bool isUsed;

  const WordBankItem({
    required this.word,
    this.definition,
    this.partOfSpeech,
    this.exampleSentence,
    this.isUsed = false,
  });

  WordBankItem copyWith({bool? isUsed}) {
    return WordBankItem(
      word: word,
      definition: definition,
      partOfSpeech: partOfSpeech,
      exampleSentence: exampleSentence,
      isUsed: isUsed ?? this.isUsed,
    );
  }

  factory WordBankItem.fromJson(Map<String, dynamic> json) {
    return WordBankItem(
      word: json['word'] as String,
      definition: json['definition'] as String?,
      partOfSpeech: json['partOfSpeech'] as String?,
      exampleSentence: json['exampleSentence'] as String?,
    );
  }
}
