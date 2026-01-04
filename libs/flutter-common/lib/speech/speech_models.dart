/// Speech therapy models
library;

/// Speech sound category
enum SoundCategory {
  vowels,
  consonants,
  blends,
  digraphs,
}

/// Word position for sound practice
enum WordPosition {
  initial,
  medial,
  final_,
}

/// Speech practice type
enum PracticeType {
  isolation,
  syllable,
  word,
  phrase,
  sentence,
  conversation,
}

/// Target sound for practice
class TargetSound {
  final String id;
  final String sound;
  final String phoneme;
  final SoundCategory category;
  final String? description;
  final String? audioUrl;
  final String? videoUrl;
  final List<String> examples;

  const TargetSound({
    required this.id,
    required this.sound,
    required this.phoneme,
    required this.category,
    this.description,
    this.audioUrl,
    this.videoUrl,
    this.examples = const [],
  });

  factory TargetSound.fromJson(Map<String, dynamic> json) {
    return TargetSound(
      id: json['id'] as String,
      sound: json['sound'] as String,
      phoneme: json['phoneme'] as String,
      category: SoundCategory.values.firstWhere(
        (e) => e.name == json['category'],
        orElse: () => SoundCategory.consonants,
      ),
      description: json['description'] as String?,
      audioUrl: json['audioUrl'] as String?,
      videoUrl: json['videoUrl'] as String?,
      examples: List<String>.from(json['examples'] as List? ?? []),
    );
  }
}

/// Practice word
class PracticeWord {
  final String id;
  final String word;
  final String targetSound;
  final WordPosition position;
  final String? imageUrl;
  final String? audioUrl;
  final String? phonetic;
  final int syllableCount;

  const PracticeWord({
    required this.id,
    required this.word,
    required this.targetSound,
    required this.position,
    this.imageUrl,
    this.audioUrl,
    this.phonetic,
    this.syllableCount = 1,
  });

  factory PracticeWord.fromJson(Map<String, dynamic> json) {
    return PracticeWord(
      id: json['id'] as String,
      word: json['word'] as String,
      targetSound: json['targetSound'] as String,
      position: WordPosition.values.firstWhere(
        (e) => e.name == json['position'] || e.name == '${json['position']}_',
        orElse: () => WordPosition.initial,
      ),
      imageUrl: json['imageUrl'] as String?,
      audioUrl: json['audioUrl'] as String?,
      phonetic: json['phonetic'] as String?,
      syllableCount: json['syllableCount'] as int? ?? 1,
    );
  }
}

/// Practice sentence
class PracticeSentence {
  final String id;
  final String sentence;
  final String targetSound;
  final int targetSoundCount;
  final String? audioUrl;
  final String? imageUrl;

  const PracticeSentence({
    required this.id,
    required this.sentence,
    required this.targetSound,
    this.targetSoundCount = 1,
    this.audioUrl,
    this.imageUrl,
  });

  factory PracticeSentence.fromJson(Map<String, dynamic> json) {
    return PracticeSentence(
      id: json['id'] as String,
      sentence: json['sentence'] as String,
      targetSound: json['targetSound'] as String,
      targetSoundCount: json['targetSoundCount'] as int? ?? 1,
      audioUrl: json['audioUrl'] as String?,
      imageUrl: json['imageUrl'] as String?,
    );
  }
}

/// Practice session
class SpeechPracticeSession {
  final String id;
  final String studentId;
  final String goalId;
  final TargetSound targetSound;
  final PracticeType practiceType;
  final DateTime startedAt;
  final DateTime? completedAt;
  final List<PracticeAttempt> attempts;

  const SpeechPracticeSession({
    required this.id,
    required this.studentId,
    required this.goalId,
    required this.targetSound,
    required this.practiceType,
    required this.startedAt,
    this.completedAt,
    this.attempts = const [],
  });

  int get correctCount => attempts.where((a) => a.isCorrect).length;
  int get totalAttempts => attempts.length;
  double get accuracy => totalAttempts > 0 ? correctCount / totalAttempts : 0;

  SpeechPracticeSession copyWith({
    DateTime? completedAt,
    List<PracticeAttempt>? attempts,
  }) {
    return SpeechPracticeSession(
      id: id,
      studentId: studentId,
      goalId: goalId,
      targetSound: targetSound,
      practiceType: practiceType,
      startedAt: startedAt,
      completedAt: completedAt ?? this.completedAt,
      attempts: attempts ?? this.attempts,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'studentId': studentId,
    'goalId': goalId,
    'targetSound': targetSound.id,
    'practiceType': practiceType.name,
    'startedAt': startedAt.toIso8601String(),
    'completedAt': completedAt?.toIso8601String(),
    'attempts': attempts.map((a) => a.toJson()).toList(),
    'accuracy': accuracy,
  };
}

/// Individual practice attempt
class PracticeAttempt {
  final String id;
  final String itemId;
  final String itemType;
  final String? recordingUrl;
  final Duration? recordingDuration;
  final bool isCorrect;
  final double? confidenceScore;
  final String? feedback;
  final DateTime timestamp;

  const PracticeAttempt({
    required this.id,
    required this.itemId,
    required this.itemType,
    this.recordingUrl,
    this.recordingDuration,
    required this.isCorrect,
    this.confidenceScore,
    this.feedback,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'itemId': itemId,
    'itemType': itemType,
    'recordingUrl': recordingUrl,
    'recordingDuration': recordingDuration?.inMilliseconds,
    'isCorrect': isCorrect,
    'confidenceScore': confidenceScore,
    'feedback': feedback,
    'timestamp': timestamp.toIso8601String(),
  };
}

/// Speech goal
class SpeechGoal {
  final String id;
  final String studentId;
  final TargetSound targetSound;
  final PracticeType targetLevel;
  final int targetAccuracy;
  final int currentAccuracy;
  final DateTime startDate;
  final DateTime? targetDate;
  final bool isAchieved;
  final List<PracticeType> unlockedLevels;

  const SpeechGoal({
    required this.id,
    required this.studentId,
    required this.targetSound,
    required this.targetLevel,
    this.targetAccuracy = 80,
    this.currentAccuracy = 0,
    required this.startDate,
    this.targetDate,
    this.isAchieved = false,
    this.unlockedLevels = const [PracticeType.isolation],
  });

  factory SpeechGoal.fromJson(Map<String, dynamic> json) {
    return SpeechGoal(
      id: json['id'] as String,
      studentId: json['studentId'] as String,
      targetSound: TargetSound.fromJson(json['targetSound'] as Map<String, dynamic>),
      targetLevel: PracticeType.values.firstWhere(
        (e) => e.name == json['targetLevel'],
        orElse: () => PracticeType.conversation,
      ),
      targetAccuracy: json['targetAccuracy'] as int? ?? 80,
      currentAccuracy: json['currentAccuracy'] as int? ?? 0,
      startDate: DateTime.parse(json['startDate'] as String),
      targetDate: json['targetDate'] != null
          ? DateTime.parse(json['targetDate'] as String)
          : null,
      isAchieved: json['isAchieved'] as bool? ?? false,
      unlockedLevels: (json['unlockedLevels'] as List?)
          ?.map((e) => PracticeType.values.firstWhere(
                (p) => p.name == e,
                orElse: () => PracticeType.isolation,
              ))
          .toList() ?? [PracticeType.isolation],
    );
  }
}

/// Home practice assignment
class HomePractice {
  final String id;
  final String goalId;
  final String studentId;
  final List<PracticeItem> items;
  final int targetRepetitions;
  final int completedRepetitions;
  final DateTime assignedAt;
  final DateTime? dueDate;
  final DateTime? completedAt;
  final String? instructions;

  const HomePractice({
    required this.id,
    required this.goalId,
    required this.studentId,
    required this.items,
    this.targetRepetitions = 10,
    this.completedRepetitions = 0,
    required this.assignedAt,
    this.dueDate,
    this.completedAt,
    this.instructions,
  });

  bool get isComplete => completedRepetitions >= targetRepetitions;
  double get progress => targetRepetitions > 0
      ? (completedRepetitions / targetRepetitions).clamp(0, 1)
      : 0;

  factory HomePractice.fromJson(Map<String, dynamic> json) {
    return HomePractice(
      id: json['id'] as String,
      goalId: json['goalId'] as String,
      studentId: json['studentId'] as String,
      items: (json['items'] as List)
          .map((e) => PracticeItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      targetRepetitions: json['targetRepetitions'] as int? ?? 10,
      completedRepetitions: json['completedRepetitions'] as int? ?? 0,
      assignedAt: DateTime.parse(json['assignedAt'] as String),
      dueDate: json['dueDate'] != null
          ? DateTime.parse(json['dueDate'] as String)
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      instructions: json['instructions'] as String?,
    );
  }
}

/// Generic practice item
class PracticeItem {
  final String id;
  final String type;
  final String content;
  final String? imageUrl;
  final String? audioUrl;

  const PracticeItem({
    required this.id,
    required this.type,
    required this.content,
    this.imageUrl,
    this.audioUrl,
  });

  factory PracticeItem.fromJson(Map<String, dynamic> json) {
    return PracticeItem(
      id: json['id'] as String,
      type: json['type'] as String,
      content: json['content'] as String,
      imageUrl: json['imageUrl'] as String?,
      audioUrl: json['audioUrl'] as String?,
    );
  }
}

/// Speech analysis result
class SpeechAnalysisResult {
  final bool isCorrect;
  final double confidence;
  final String? detectedSound;
  final String? feedback;
  final List<SpeechIssue> issues;

  const SpeechAnalysisResult({
    required this.isCorrect,
    required this.confidence,
    this.detectedSound,
    this.feedback,
    this.issues = const [],
  });

  factory SpeechAnalysisResult.fromJson(Map<String, dynamic> json) {
    return SpeechAnalysisResult(
      isCorrect: json['isCorrect'] as bool,
      confidence: (json['confidence'] as num).toDouble(),
      detectedSound: json['detectedSound'] as String?,
      feedback: json['feedback'] as String?,
      issues: (json['issues'] as List?)
          ?.map((e) => SpeechIssue.fromJson(e as Map<String, dynamic>))
          .toList() ?? [],
    );
  }
}

/// Speech issue detected
class SpeechIssue {
  final String type;
  final String description;
  final String? suggestion;

  const SpeechIssue({
    required this.type,
    required this.description,
    this.suggestion,
  });

  factory SpeechIssue.fromJson(Map<String, dynamic> json) {
    return SpeechIssue(
      type: json['type'] as String,
      description: json['description'] as String,
      suggestion: json['suggestion'] as String?,
    );
  }
}
