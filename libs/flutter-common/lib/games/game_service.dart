/// Game service for educational games
library;

import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;
import 'game_models.dart';

/// Service for managing educational games
class GameService {
  final String baseUrl;
  final String Function() getAuthToken;
  final String studentId;

  GameService({
    required this.baseUrl,
    required this.getAuthToken,
    required this.studentId,
  });

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${getAuthToken()}',
  };

  /// Get available games for a skill/subject
  Future<List<GameConfig>> getAvailableGames({
    String? skillId,
    String? subject,
    GameDifficulty? difficulty,
  }) async {
    var url = '$baseUrl/api/games?studentId=$studentId';
    if (skillId != null) url += '&skillId=$skillId';
    if (subject != null) url += '&subject=$subject';
    if (difficulty != null) url += '&difficulty=${difficulty.name}';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw GameException('Failed to load games');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => GameConfig.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Start a game session
  Future<GameSession> startGame(String gameId, {GameDifficulty? difficulty}) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/games/$gameId/start'),
      headers: _headers,
      body: json.encode({
        'studentId': studentId,
        if (difficulty != null) 'difficulty': difficulty.name,
      }),
    );

    if (response.statusCode != 200) {
      throw GameException('Failed to start game');
    }

    return GameSession.fromJson(json.decode(response.body));
  }

  /// Submit game progress
  Future<void> submitProgress(String sessionId, GameProgress progress) async {
    await http.post(
      Uri.parse('$baseUrl/api/games/sessions/$sessionId/progress'),
      headers: _headers,
      body: json.encode(progress.toJson()),
    );
  }

  /// Complete a game session
  Future<GameResult> completeGame(String sessionId, GameProgress progress) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/games/sessions/$sessionId/complete'),
      headers: _headers,
      body: json.encode(progress.toJson()),
    );

    if (response.statusCode != 200) {
      throw GameException('Failed to complete game');
    }

    return GameResult(
      gameId: progress.gameId,
      sessionId: sessionId,
      finalScore: progress.score,
      maxScore: json.decode(response.body)['maxScore'] as int? ?? progress.score,
      totalTime: progress.elapsed,
      accuracy: progress.accuracy,
      starsEarned: _calculateStars(progress),
      isNewHighScore: json.decode(response.body)['isNewHighScore'] as bool? ?? false,
      badgesEarned: List<String>.from(json.decode(response.body)['badgesEarned'] as List? ?? []),
      xpEarned: json.decode(response.body)['xpEarned'] as int? ?? 0,
    );
  }

  /// Get game history
  Future<List<GameHistoryEntry>> getGameHistory({int limit = 20}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/games/history?studentId=$studentId&limit=$limit'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw GameException('Failed to load game history');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => GameHistoryEntry.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get high scores
  Future<List<HighScore>> getHighScores(String gameId, {String scope = 'class'}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/games/$gameId/highscores?scope=$scope'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw GameException('Failed to load high scores');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => HighScore.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Generate a memory game
  Future<List<MemoryCard>> generateMemoryGame({
    required int pairs,
    required String category,
    GameDifficulty difficulty = GameDifficulty.medium,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/games/memory/generate'),
      headers: _headers,
      body: json.encode({
        'pairs': pairs,
        'category': category,
        'difficulty': difficulty.name,
      }),
    );

    if (response.statusCode != 200) {
      throw GameException('Failed to generate memory game');
    }

    final List<dynamic> data = json.decode(response.body);
    final cards = <MemoryCard>[];

    for (var i = 0; i < data.length; i++) {
      final item = data[i] as Map<String, dynamic>;
      final matchId = item['matchId'] as String;
      // Create two cards for each pair
      cards.add(MemoryCard(
        id: '${matchId}_1',
        matchId: matchId,
        content: item['content'] as String,
        imageUrl: item['imageUrl'] as String?,
      ));
      cards.add(MemoryCard(
        id: '${matchId}_2',
        matchId: matchId,
        content: item['content'] as String,
        imageUrl: item['imageUrl'] as String?,
      ));
    }

    // Shuffle cards
    cards.shuffle(Random());
    return cards;
  }

  /// Generate a word search puzzle
  Future<WordSearchPuzzle> generateWordSearch({
    required List<String> words,
    int gridSize = 10,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/games/wordsearch/generate'),
      headers: _headers,
      body: json.encode({
        'words': words,
        'gridSize': gridSize,
      }),
    );

    if (response.statusCode != 200) {
      throw GameException('Failed to generate word search');
    }

    return WordSearchPuzzle.fromJson(json.decode(response.body));
  }

  /// Generate math problems
  Future<List<MathProblem>> generateMathProblems({
    required String operation,
    required int count,
    int minNumber = 1,
    int maxNumber = 10,
    GameDifficulty difficulty = GameDifficulty.medium,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/games/math/generate'),
      headers: _headers,
      body: json.encode({
        'operation': operation,
        'count': count,
        'minNumber': minNumber,
        'maxNumber': maxNumber,
        'difficulty': difficulty.name,
      }),
    );

    if (response.statusCode != 200) {
      throw GameException('Failed to generate math problems');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => MathProblem.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get spelling words for a level
  Future<List<SpellingWord>> getSpellingWords({
    required String gradeLevel,
    int count = 10,
    String? category,
  }) async {
    var url = '$baseUrl/api/games/spelling/words?gradeLevel=$gradeLevel&count=$count';
    if (category != null) url += '&category=$category';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw GameException('Failed to load spelling words');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => SpellingWord.fromJson(e as Map<String, dynamic>)).toList();
  }

  int _calculateStars(GameProgress progress) {
    if (progress.accuracy >= 0.9) return 3;
    if (progress.accuracy >= 0.7) return 2;
    if (progress.accuracy >= 0.5) return 1;
    return 0;
  }
}

/// Game session
class GameSession {
  final String id;
  final String gameId;
  final GameConfig config;
  final DateTime startedAt;

  const GameSession({
    required this.id,
    required this.gameId,
    required this.config,
    required this.startedAt,
  });

  factory GameSession.fromJson(Map<String, dynamic> json) {
    return GameSession(
      id: json['id'] as String,
      gameId: json['gameId'] as String,
      config: GameConfig.fromJson(json['config'] as Map<String, dynamic>),
      startedAt: DateTime.parse(json['startedAt'] as String),
    );
  }
}

/// Game history entry
class GameHistoryEntry {
  final String gameId;
  final String gameTitle;
  final GameType gameType;
  final int score;
  final int stars;
  final DateTime playedAt;

  const GameHistoryEntry({
    required this.gameId,
    required this.gameTitle,
    required this.gameType,
    required this.score,
    required this.stars,
    required this.playedAt,
  });

  factory GameHistoryEntry.fromJson(Map<String, dynamic> json) {
    return GameHistoryEntry(
      gameId: json['gameId'] as String,
      gameTitle: json['gameTitle'] as String,
      gameType: GameType.values.firstWhere(
        (e) => e.name == json['gameType'],
        orElse: () => GameType.memory,
      ),
      score: json['score'] as int,
      stars: json['stars'] as int,
      playedAt: DateTime.parse(json['playedAt'] as String),
    );
  }
}

/// High score entry
class HighScore {
  final String playerName;
  final String? avatarUrl;
  final int score;
  final int rank;
  final bool isCurrentUser;

  const HighScore({
    required this.playerName,
    this.avatarUrl,
    required this.score,
    required this.rank,
    this.isCurrentUser = false,
  });

  factory HighScore.fromJson(Map<String, dynamic> json) {
    return HighScore(
      playerName: json['playerName'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      score: json['score'] as int,
      rank: json['rank'] as int,
      isCurrentUser: json['isCurrentUser'] as bool? ?? false,
    );
  }
}

/// Game exception
class GameException implements Exception {
  final String message;
  GameException(this.message);

  @override
  String toString() => 'GameException: $message';
}
