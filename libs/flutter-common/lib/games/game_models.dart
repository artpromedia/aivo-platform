/// Game models for educational games
library;

import 'package:flutter/material.dart';

/// Game type enumeration
enum GameType {
  wordSearch,
  crossword,
  memory,
  puzzle,
  mathBlaster,
  spellingBee,
  vocabularyMatch,
  numberNinja,
  patternRecognition,
  storySequence,
}

/// Difficulty level for games
enum GameDifficulty {
  easy,
  medium,
  hard,
  adaptive,
}

/// Game state
enum GameState {
  notStarted,
  playing,
  paused,
  completed,
  failed,
}

/// Base game configuration
class GameConfig {
  final String id;
  final GameType type;
  final String title;
  final String description;
  final GameDifficulty difficulty;
  final int timeLimit; // in seconds, 0 = no limit
  final int targetScore;
  final bool soundEnabled;
  final bool hapticEnabled;
  final Map<String, dynamic> customSettings;

  const GameConfig({
    required this.id,
    required this.type,
    required this.title,
    this.description = '',
    this.difficulty = GameDifficulty.medium,
    this.timeLimit = 0,
    this.targetScore = 100,
    this.soundEnabled = true,
    this.hapticEnabled = true,
    this.customSettings = const {},
  });

  GameConfig copyWith({
    String? id,
    GameType? type,
    String? title,
    String? description,
    GameDifficulty? difficulty,
    int? timeLimit,
    int? targetScore,
    bool? soundEnabled,
    bool? hapticEnabled,
    Map<String, dynamic>? customSettings,
  }) {
    return GameConfig(
      id: id ?? this.id,
      type: type ?? this.type,
      title: title ?? this.title,
      description: description ?? this.description,
      difficulty: difficulty ?? this.difficulty,
      timeLimit: timeLimit ?? this.timeLimit,
      targetScore: targetScore ?? this.targetScore,
      soundEnabled: soundEnabled ?? this.soundEnabled,
      hapticEnabled: hapticEnabled ?? this.hapticEnabled,
      customSettings: customSettings ?? this.customSettings,
    );
  }

  factory GameConfig.fromJson(Map<String, dynamic> json) {
    return GameConfig(
      id: json['id'] as String,
      type: GameType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => GameType.memory,
      ),
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      difficulty: GameDifficulty.values.firstWhere(
        (e) => e.name == json['difficulty'],
        orElse: () => GameDifficulty.medium,
      ),
      timeLimit: json['timeLimit'] as int? ?? 0,
      targetScore: json['targetScore'] as int? ?? 100,
      soundEnabled: json['soundEnabled'] as bool? ?? true,
      hapticEnabled: json['hapticEnabled'] as bool? ?? true,
      customSettings: Map<String, dynamic>.from(json['customSettings'] as Map? ?? {}),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type.name,
    'title': title,
    'description': description,
    'difficulty': difficulty.name,
    'timeLimit': timeLimit,
    'targetScore': targetScore,
    'soundEnabled': soundEnabled,
    'hapticEnabled': hapticEnabled,
    'customSettings': customSettings,
  };
}

/// Game progress tracking
class GameProgress {
  final String sessionId;
  final String gameId;
  final GameState state;
  final int score;
  final int moves;
  final int correctAnswers;
  final int wrongAnswers;
  final int hintsUsed;
  final Duration elapsed;
  final List<GameEvent> events;

  const GameProgress({
    required this.sessionId,
    required this.gameId,
    this.state = GameState.notStarted,
    this.score = 0,
    this.moves = 0,
    this.correctAnswers = 0,
    this.wrongAnswers = 0,
    this.hintsUsed = 0,
    this.elapsed = Duration.zero,
    this.events = const [],
  });

  double get accuracy {
    final total = correctAnswers + wrongAnswers;
    if (total == 0) return 0.0;
    return correctAnswers / total;
  }

  GameProgress copyWith({
    String? sessionId,
    String? gameId,
    GameState? state,
    int? score,
    int? moves,
    int? correctAnswers,
    int? wrongAnswers,
    int? hintsUsed,
    Duration? elapsed,
    List<GameEvent>? events,
  }) {
    return GameProgress(
      sessionId: sessionId ?? this.sessionId,
      gameId: gameId ?? this.gameId,
      state: state ?? this.state,
      score: score ?? this.score,
      moves: moves ?? this.moves,
      correctAnswers: correctAnswers ?? this.correctAnswers,
      wrongAnswers: wrongAnswers ?? this.wrongAnswers,
      hintsUsed: hintsUsed ?? this.hintsUsed,
      elapsed: elapsed ?? this.elapsed,
      events: events ?? this.events,
    );
  }

  Map<String, dynamic> toJson() => {
    'sessionId': sessionId,
    'gameId': gameId,
    'state': state.name,
    'score': score,
    'moves': moves,
    'correctAnswers': correctAnswers,
    'wrongAnswers': wrongAnswers,
    'hintsUsed': hintsUsed,
    'elapsed': elapsed.inMilliseconds,
    'events': events.map((e) => e.toJson()).toList(),
  };
}

/// Game event for analytics
class GameEvent {
  final String type;
  final DateTime timestamp;
  final Map<String, dynamic> data;

  const GameEvent({
    required this.type,
    required this.timestamp,
    this.data = const {},
  });

  factory GameEvent.now(String type, [Map<String, dynamic> data = const {}]) {
    return GameEvent(type: type, timestamp: DateTime.now(), data: data);
  }

  Map<String, dynamic> toJson() => {
    'type': type,
    'timestamp': timestamp.toIso8601String(),
    'data': data,
  };
}

/// Memory game card
class MemoryCard {
  final String id;
  final String matchId;
  final String content;
  final String? imageUrl;
  final bool isFlipped;
  final bool isMatched;

  const MemoryCard({
    required this.id,
    required this.matchId,
    required this.content,
    this.imageUrl,
    this.isFlipped = false,
    this.isMatched = false,
  });

  MemoryCard copyWith({
    String? id,
    String? matchId,
    String? content,
    String? imageUrl,
    bool? isFlipped,
    bool? isMatched,
  }) {
    return MemoryCard(
      id: id ?? this.id,
      matchId: matchId ?? this.matchId,
      content: content ?? this.content,
      imageUrl: imageUrl ?? this.imageUrl,
      isFlipped: isFlipped ?? this.isFlipped,
      isMatched: isMatched ?? this.isMatched,
    );
  }
}

/// Word search puzzle
class WordSearchPuzzle {
  final int rows;
  final int cols;
  final List<List<String>> grid;
  final List<HiddenWord> words;
  final List<FoundWord> foundWords;

  const WordSearchPuzzle({
    required this.rows,
    required this.cols,
    required this.grid,
    required this.words,
    this.foundWords = const [],
  });

  factory WordSearchPuzzle.fromJson(Map<String, dynamic> json) {
    return WordSearchPuzzle(
      rows: json['rows'] as int,
      cols: json['cols'] as int,
      grid: (json['grid'] as List).map((row) => List<String>.from(row as List)).toList(),
      words: (json['words'] as List).map((w) => HiddenWord.fromJson(w as Map<String, dynamic>)).toList(),
      foundWords: (json['foundWords'] as List?)?.map((w) => FoundWord.fromJson(w as Map<String, dynamic>)).toList() ?? [],
    );
  }
}

/// Hidden word in word search
class HiddenWord {
  final String word;
  final int startRow;
  final int startCol;
  final int endRow;
  final int endCol;

  const HiddenWord({
    required this.word,
    required this.startRow,
    required this.startCol,
    required this.endRow,
    required this.endCol,
  });

  factory HiddenWord.fromJson(Map<String, dynamic> json) {
    return HiddenWord(
      word: json['word'] as String,
      startRow: json['startRow'] as int,
      startCol: json['startCol'] as int,
      endRow: json['endRow'] as int,
      endCol: json['endCol'] as int,
    );
  }
}

/// Found word in word search
class FoundWord {
  final String word;
  final List<Offset> cells;
  final DateTime foundAt;

  const FoundWord({
    required this.word,
    required this.cells,
    required this.foundAt,
  });

  factory FoundWord.fromJson(Map<String, dynamic> json) {
    return FoundWord(
      word: json['word'] as String,
      cells: (json['cells'] as List).map((c) => Offset(
        (c['x'] as num).toDouble(),
        (c['y'] as num).toDouble(),
      )).toList(),
      foundAt: DateTime.parse(json['foundAt'] as String),
    );
  }
}

/// Math problem for math games
class MathProblem {
  final String id;
  final String question;
  final String correctAnswer;
  final List<String> options;
  final String? hint;
  final int points;
  final Duration? timeLimit;

  const MathProblem({
    required this.id,
    required this.question,
    required this.correctAnswer,
    this.options = const [],
    this.hint,
    this.points = 10,
    this.timeLimit,
  });

  factory MathProblem.fromJson(Map<String, dynamic> json) {
    return MathProblem(
      id: json['id'] as String,
      question: json['question'] as String,
      correctAnswer: json['correctAnswer'] as String,
      options: List<String>.from(json['options'] as List? ?? []),
      hint: json['hint'] as String?,
      points: json['points'] as int? ?? 10,
      timeLimit: json['timeLimit'] != null
          ? Duration(seconds: json['timeLimit'] as int)
          : null,
    );
  }
}

/// Spelling word
class SpellingWord {
  final String word;
  final String? audioUrl;
  final String? definition;
  final String? exampleSentence;
  final List<String>? syllables;

  const SpellingWord({
    required this.word,
    this.audioUrl,
    this.definition,
    this.exampleSentence,
    this.syllables,
  });

  factory SpellingWord.fromJson(Map<String, dynamic> json) {
    return SpellingWord(
      word: json['word'] as String,
      audioUrl: json['audioUrl'] as String?,
      definition: json['definition'] as String?,
      exampleSentence: json['exampleSentence'] as String?,
      syllables: (json['syllables'] as List?)?.cast<String>(),
    );
  }
}

/// Game result
class GameResult {
  final String gameId;
  final String sessionId;
  final int finalScore;
  final int maxScore;
  final Duration totalTime;
  final double accuracy;
  final int starsEarned; // 0-3
  final bool isNewHighScore;
  final List<String> badgesEarned;
  final int xpEarned;

  const GameResult({
    required this.gameId,
    required this.sessionId,
    required this.finalScore,
    required this.maxScore,
    required this.totalTime,
    required this.accuracy,
    this.starsEarned = 0,
    this.isNewHighScore = false,
    this.badgesEarned = const [],
    this.xpEarned = 0,
  });

  double get scorePercentage => maxScore > 0 ? finalScore / maxScore : 0.0;

  Map<String, dynamic> toJson() => {
    'gameId': gameId,
    'sessionId': sessionId,
    'finalScore': finalScore,
    'maxScore': maxScore,
    'totalTime': totalTime.inMilliseconds,
    'accuracy': accuracy,
    'starsEarned': starsEarned,
    'isNewHighScore': isNewHighScore,
    'badgesEarned': badgesEarned,
    'xpEarned': xpEarned,
  };
}
