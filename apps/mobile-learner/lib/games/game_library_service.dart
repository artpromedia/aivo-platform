import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/environment.dart';

/// Game types available in the library.
enum GameType {
  focusBreak('FOCUS_BREAK', 'Focus Break'),
  brainTraining('BRAIN_TRAINING', 'Brain Training'),
  educational('EDUCATIONAL', 'Educational'),
  reward('REWARD', 'Reward'),
  relaxation('RELAXATION', 'Relaxation');

  const GameType(this.code, this.displayName);
  final String code;
  final String displayName;
}

/// Game categories.
enum GameCategory {
  puzzle('PUZZLE', 'Puzzle'),
  memory('MEMORY', 'Memory'),
  reaction('REACTION', 'Reaction'),
  pattern('PATTERN', 'Pattern'),
  relaxation('RELAXATION', 'Relaxation'),
  movement('MOVEMENT', 'Movement'),
  creative('CREATIVE', 'Creative'),
  math('MATH', 'Math'),
  language('LANGUAGE', 'Language');

  const GameCategory(this.code, this.displayName);
  final String code;
  final String displayName;
}

/// Cognitive skills targeted by games.
enum CognitiveSkill {
  workingMemory('WORKING_MEMORY', 'Working Memory'),
  attention('ATTENTION', 'Attention'),
  processingSpeed('PROCESSING_SPEED', 'Processing Speed'),
  cognitiveFlexibility('COGNITIVE_FLEXIBILITY', 'Cognitive Flexibility'),
  inhibitoryControl('INHIBITORY_CONTROL', 'Inhibitory Control'),
  visualSpatial('VISUAL_SPATIAL', 'Visual Spatial'),
  verbalReasoning('VERBAL_REASONING', 'Verbal Reasoning'),
  patternRecognition('PATTERN_RECOGNITION', 'Pattern Recognition');

  const CognitiveSkill(this.code, this.displayName);
  final String code;
  final String displayName;
}

/// A game available in the library.
class Game {
  const Game({
    required this.id,
    required this.slug,
    required this.title,
    required this.description,
    required this.type,
    required this.category,
    required this.minAge,
    required this.maxAge,
    required this.durationSeconds,
    required this.cognitiveSkills,
    this.thumbnailUrl,
    this.instructions,
    this.accessibilityFeatures = const [],
  });

  final String id;
  final String slug;
  final String title;
  final String description;
  final GameType type;
  final GameCategory category;
  final int minAge;
  final int maxAge;
  final int durationSeconds;
  final List<CognitiveSkill> cognitiveSkills;
  final String? thumbnailUrl;
  final String? instructions;
  final List<String> accessibilityFeatures;

  factory Game.fromJson(Map<String, dynamic> json) {
    return Game(
      id: json['id']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      type: GameType.values.firstWhere(
        (t) => t.code == json['type'],
        orElse: () => GameType.focusBreak,
      ),
      category: GameCategory.values.firstWhere(
        (c) => c.code == json['category'],
        orElse: () => GameCategory.puzzle,
      ),
      minAge: (json['minAge'] as num?)?.toInt() ?? 5,
      maxAge: (json['maxAge'] as num?)?.toInt() ?? 18,
      durationSeconds: (json['durationSeconds'] as num?)?.toInt() ?? 60,
      cognitiveSkills: (json['cognitiveSkills'] as List<dynamic>?)
              ?.map((s) => CognitiveSkill.values.firstWhere(
                    (cs) => cs.code == s,
                    orElse: () => CognitiveSkill.attention,
                  ))
              .toList() ??
          [],
      thumbnailUrl: json['thumbnailUrl']?.toString(),
      instructions: json['instructions']?.toString(),
      accessibilityFeatures:
          (json['accessibilityFeatures'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }
}

/// A game session for a learner.
class GameSession {
  const GameSession({
    required this.id,
    required this.gameId,
    required this.startedAt,
    this.endedAt,
    this.score,
    this.stars,
    this.completed = false,
    this.durationSeconds,
  });

  final String id;
  final String gameId;
  final DateTime startedAt;
  final DateTime? endedAt;
  final int? score;
  final int? stars;
  final bool completed;
  final int? durationSeconds;

  factory GameSession.fromJson(Map<String, dynamic> json) {
    return GameSession(
      id: json['id']?.toString() ?? '',
      gameId: json['gameId']?.toString() ?? '',
      startedAt: DateTime.tryParse(json['startedAt']?.toString() ?? '') ?? DateTime.now(),
      endedAt: json['endedAt'] != null ? DateTime.tryParse(json['endedAt'].toString()) : null,
      score: (json['score'] as num?)?.toInt(),
      stars: (json['stars'] as num?)?.toInt(),
      completed: json['completed'] == true,
      durationSeconds: (json['durationSeconds'] as num?)?.toInt(),
    );
  }
}

/// Brain training plan for the day.
class BrainTrainingPlan {
  const BrainTrainingPlan({
    required this.date,
    required this.games,
    required this.completedGames,
    required this.totalGames,
  });

  final DateTime date;
  final List<Game> games;
  final List<String> completedGames;
  final int totalGames;

  int get remainingGames => totalGames - completedGames.length;
  bool get isComplete => completedGames.length >= totalGames;

  factory BrainTrainingPlan.fromJson(Map<String, dynamic> json) {
    final gamesJson = json['games'] as List<dynamic>? ?? [];
    return BrainTrainingPlan(
      date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
      games: gamesJson.map((g) => Game.fromJson(g as Map<String, dynamic>)).toList(),
      completedGames: (json['completedGames'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      totalGames: (json['totalGames'] as num?)?.toInt() ?? 3,
    );
  }
}

/// Brain training statistics.
class BrainTrainingStats {
  const BrainTrainingStats({
    required this.totalSessions,
    required this.totalPlayTimeSeconds,
    required this.currentStreak,
    required this.longestStreak,
    required this.skillProgress,
    required this.lastPlayedAt,
  });

  final int totalSessions;
  final int totalPlayTimeSeconds;
  final int currentStreak;
  final int longestStreak;
  final Map<CognitiveSkill, double> skillProgress;
  final DateTime? lastPlayedAt;

  factory BrainTrainingStats.fromJson(Map<String, dynamic> json) {
    final progressJson = json['skillProgress'] as Map<String, dynamic>? ?? {};
    final skillProgress = <CognitiveSkill, double>{};
    progressJson.forEach((key, value) {
      final skill = CognitiveSkill.values.firstWhere(
        (s) => s.code == key,
        orElse: () => CognitiveSkill.attention,
      );
      skillProgress[skill] = (value as num?)?.toDouble() ?? 0.0;
    });

    return BrainTrainingStats(
      totalSessions: (json['totalSessions'] as num?)?.toInt() ?? 0,
      totalPlayTimeSeconds: (json['totalPlayTimeSeconds'] as num?)?.toInt() ?? 0,
      currentStreak: (json['currentStreak'] as num?)?.toInt() ?? 0,
      longestStreak: (json['longestStreak'] as num?)?.toInt() ?? 0,
      skillProgress: skillProgress,
      lastPlayedAt: json['lastPlayedAt'] != null ? DateTime.tryParse(json['lastPlayedAt'].toString()) : null,
    );
  }
}

/// Exception thrown by game library API operations.
class GameLibraryException implements Exception {
  const GameLibraryException(this.message, {this.code});
  final String message;
  final int? code;

  @override
  String toString() => message;
}

/// Service for Game Library API calls.
class GameLibraryService {
  GameLibraryService({String? accessToken})
      : _dio = Dio(BaseOptions(
          baseUrl: EnvironmentConfig.gameLibraryBaseUrl,
          headers: accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
        ));

  final Dio _dio;

  /// Get list of games with optional filters.
  Future<List<Game>> getGames({
    GameType? type,
    GameCategory? category,
    String? gradeBand,
    CognitiveSkill? cognitiveSkill,
    int? maxDurationSec,
  }) async {
    if (EnvironmentConfig.useGameMock) {
      await Future.delayed(const Duration(milliseconds: 500));
      return _mockGames();
    }

    try {
      final queryParams = <String, dynamic>{};
      if (type != null) queryParams['type'] = type.code;
      if (category != null) queryParams['category'] = category.code;
      if (gradeBand != null) queryParams['gradeBand'] = gradeBand;
      if (cognitiveSkill != null) queryParams['cognitiveSkill'] = cognitiveSkill.code;
      if (maxDurationSec != null) queryParams['maxDurationSec'] = maxDurationSec;

      final response = await _dio.get<Map<String, dynamic>>(
        '/games',
        queryParameters: queryParams,
      );

      final gamesJson = response.data?['games'] as List<dynamic>? ?? [];
      return gamesJson.map((g) => Game.fromJson(g as Map<String, dynamic>)).toList();
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get a random focus break game.
  Future<Game?> getFocusBreakGame({required String gradeBand, List<String>? excludeSlugs}) async {
    if (EnvironmentConfig.useGameMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockGames().first;
    }

    try {
      final queryParams = <String, dynamic>{'gradeBand': gradeBand};
      if (excludeSlugs != null && excludeSlugs.isNotEmpty) {
        queryParams['exclude'] = excludeSlugs.join(',');
      }

      final response = await _dio.get<Map<String, dynamic>>(
        '/games/focus-break',
        queryParameters: queryParams,
      );

      final gameJson = response.data?['game'] as Map<String, dynamic>?;
      return gameJson != null ? Game.fromJson(gameJson) : null;
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get personalized game recommendations.
  Future<List<Game>> getRecommendations({
    required String context,
    required String gradeBand,
    int limit = 5,
  }) async {
    if (EnvironmentConfig.useGameMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return _mockGames().take(limit).toList();
    }

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/games/recommendations',
        queryParameters: {
          'context': context,
          'gradeBand': gradeBand,
          'limit': limit,
        },
      );

      final gamesJson = response.data?['recommendations'] as List<dynamic>? ?? [];
      return gamesJson.map((g) => Game.fromJson(g as Map<String, dynamic>)).toList();
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Start a new game session.
  Future<GameSession> startSession({
    required String gameId,
    required String context,
    String? difficulty,
    String? learningSessionId,
  }) async {
    if (EnvironmentConfig.useGameMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return GameSession(
        id: 'mock-session-${DateTime.now().millisecondsSinceEpoch}',
        gameId: gameId,
        startedAt: DateTime.now(),
      );
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/games/sessions',
        data: {
          'gameId': gameId,
          'context': context,
          if (difficulty != null) 'difficulty': difficulty,
          if (learningSessionId != null) 'learningSessionId': learningSessionId,
        },
      );

      final sessionJson = response.data?['session'] as Map<String, dynamic>?;
      if (sessionJson == null) {
        throw const GameLibraryException('No session returned');
      }

      return GameSession.fromJson(sessionJson);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// End a game session with results.
  Future<GameSession> endSession({
    required String sessionId,
    int? score,
    int? stars,
    int? levelReached,
    Map<String, dynamic>? metrics,
    required bool completed,
  }) async {
    if (EnvironmentConfig.useGameMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return GameSession(
        id: sessionId,
        gameId: 'mock-game',
        startedAt: DateTime.now().subtract(const Duration(minutes: 2)),
        endedAt: DateTime.now(),
        score: score,
        stars: stars,
        completed: completed,
        durationSeconds: 120,
      );
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/games/sessions/$sessionId/end',
        data: {
          if (score != null) 'score': score,
          if (stars != null) 'stars': stars,
          if (levelReached != null) 'levelReached': levelReached,
          if (metrics != null) 'metrics': metrics,
          'completed': completed,
        },
      );

      final sessionJson = response.data?['session'] as Map<String, dynamic>?;
      if (sessionJson == null) {
        throw const GameLibraryException('No session returned');
      }

      return GameSession.fromJson(sessionJson);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get today's brain training plan.
  Future<BrainTrainingPlan> getBrainTrainingPlan({required String gradeBand}) async {
    if (EnvironmentConfig.useGameMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return BrainTrainingPlan(
        date: DateTime.now(),
        games: _mockGames().where((g) => g.type == GameType.brainTraining).toList(),
        completedGames: [],
        totalGames: 3,
      );
    }

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/games/brain-training/plan',
        queryParameters: {'gradeBand': gradeBand},
      );

      final planJson = response.data?['plan'] as Map<String, dynamic>?;
      if (planJson == null) {
        throw const GameLibraryException('No plan returned');
      }

      return BrainTrainingPlan.fromJson(planJson);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Mark a brain training game as completed.
  Future<BrainTrainingPlan> completeBrainTrainingGame({required String gameId}) async {
    if (EnvironmentConfig.useGameMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return BrainTrainingPlan(
        date: DateTime.now(),
        games: _mockGames().where((g) => g.type == GameType.brainTraining).toList(),
        completedGames: [gameId],
        totalGames: 3,
      );
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/games/brain-training/complete/$gameId',
      );

      final planJson = response.data?['plan'] as Map<String, dynamic>?;
      if (planJson == null) {
        throw const GameLibraryException('No plan returned');
      }

      return BrainTrainingPlan.fromJson(planJson);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get brain training statistics.
  Future<BrainTrainingStats> getBrainTrainingStats() async {
    if (EnvironmentConfig.useGameMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return BrainTrainingStats(
        totalSessions: 42,
        totalPlayTimeSeconds: 12600,
        currentStreak: 5,
        longestStreak: 14,
        skillProgress: {
          CognitiveSkill.workingMemory: 0.72,
          CognitiveSkill.attention: 0.85,
          CognitiveSkill.processingSpeed: 0.68,
        },
        lastPlayedAt: DateTime.now().subtract(const Duration(hours: 18)),
      );
    }

    try {
      final response = await _dio.get<Map<String, dynamic>>('/games/brain-training/stats');

      final statsJson = response.data?['stats'] as Map<String, dynamic>?;
      if (statsJson == null) {
        throw const GameLibraryException('No stats returned');
      }

      return BrainTrainingStats.fromJson(statsJson);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  GameLibraryException _handleError(DioException err) {
    final statusCode = err.response?.statusCode;
    final message = err.response?.data is Map
        ? (err.response?.data as Map)['error']?.toString() ?? err.message
        : err.message ?? 'Network error';
    return GameLibraryException(message ?? 'Unknown error', code: statusCode);
  }

  List<Game> _mockGames() {
    return const [
      Game(
        id: 'game-1',
        slug: 'bubble-breathing',
        title: 'Bubble Breathing',
        description: 'Blow virtual bubbles by taking deep breaths. Great for calming down.',
        type: GameType.focusBreak,
        category: GameCategory.relaxation,
        minAge: 5,
        maxAge: 18,
        durationSeconds: 120,
        cognitiveSkills: [CognitiveSkill.inhibitoryControl],
        accessibilityFeatures: ['Audio cues', 'High contrast'],
      ),
      Game(
        id: 'game-2',
        slug: 'memory-match',
        title: 'Memory Match',
        description: 'Match pairs of cards to test your memory skills.',
        type: GameType.brainTraining,
        category: GameCategory.memory,
        minAge: 6,
        maxAge: 18,
        durationSeconds: 180,
        cognitiveSkills: [CognitiveSkill.workingMemory, CognitiveSkill.visualSpatial],
        accessibilityFeatures: ['Screen reader', 'Large cards'],
      ),
      Game(
        id: 'game-3',
        slug: 'pattern-pop',
        title: 'Pattern Pop',
        description: 'Find and complete patterns as quickly as you can.',
        type: GameType.brainTraining,
        category: GameCategory.pattern,
        minAge: 7,
        maxAge: 18,
        durationSeconds: 90,
        cognitiveSkills: [CognitiveSkill.patternRecognition, CognitiveSkill.processingSpeed],
        accessibilityFeatures: ['Color blind mode'],
      ),
    ];
  }
}

/// Provider for the game library service.
final gameLibraryServiceProvider = Provider<GameLibraryService>((ref) => GameLibraryService());
