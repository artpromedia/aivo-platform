import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const _baseUrl = String.fromEnvironment('FOCUS_BASE_URL', defaultValue: 'http://localhost:4026');
const _useFocusMock = bool.fromEnvironment('USE_FOCUS_MOCK', defaultValue: false);

/// Log warning when mock data is used in non-debug mode
void _logMockWarning() {
  assert(() {
    debugPrint('⚠️ WARNING: Focus service is using mock data.');
    return true;
  }());
}

/// Types of regulation/break activities.
enum BreakActivityType {
  breathing('breathing', 'Breathing Exercise'),
  stretching('stretching', 'Stretching'),
  movement('movement', 'Movement Break'),
  grounding('grounding', 'Grounding Exercise'),
  mindfulPause('mindful_pause', 'Mindful Pause'),
  simpleGame('simple_game', 'Simple Game'),
  learningGame('learning_game', 'Learning Game');

  const BreakActivityType(this.code, this.displayName);
  final String code;
  final String displayName;
}

/// Types of learning break games.
enum LearningGameType {
  mathBubblePop('MATH_BUBBLE_POP', 'Math Bubble Pop'),
  wordScramble('WORD_SCRAMBLE', 'Word Scramble Sprint'),
  quickQuiz('QUICK_QUIZ', 'Quick Quiz Blast'),
  patternPower('PATTERN_POWER', 'Pattern Power'),
  factOrFiction('FACT_OR_FICTION', 'Fact or Fiction?'),
  numberNinja('NUMBER_NINJA', 'Number Ninja'),
  spellingBee('SPELLING_BEE', 'Spelling Bee Buzz');

  const LearningGameType(this.code, this.displayName);
  final String code;
  final String displayName;
}

/// A learning-laced brain break game.
class LearningBreakGame {
  const LearningBreakGame({
    required this.gameType,
    required this.title,
    required this.description,
    required this.instructions,
    required this.durationSeconds,
    required this.targetDomain,
    required this.targetSkillCodes,
    required this.difficulty,
    required this.gameConfig,
    this.xpReward = 15,
    this.coinReward = 5,
  });

  final LearningGameType gameType;
  final String title;
  final String description;
  final List<String> instructions;
  final int durationSeconds;
  final String targetDomain;
  final List<String> targetSkillCodes;
  final int difficulty;
  final Map<String, dynamic> gameConfig;
  final int xpReward;
  final int coinReward;

  factory LearningBreakGame.fromJson(Map<String, dynamic> json) {
    final typeCode = json['gameType']?.toString() ?? 'QUICK_QUIZ';
    final type = LearningGameType.values.firstWhere(
      (t) => t.code == typeCode,
      orElse: () => LearningGameType.quickQuiz,
    );

    final instructionsList = json['instructions'] as List<dynamic>? ?? [];

    return LearningBreakGame(
      gameType: type,
      title: json['title']?.toString() ?? 'Learning Break',
      description: json['description']?.toString() ?? '',
      instructions: instructionsList.map((i) => i.toString()).toList(),
      durationSeconds: json['estimatedDurationSeconds'] is num
          ? (json['estimatedDurationSeconds'] as num).toInt()
          : 60,
      targetDomain: json['targetDomain']?.toString() ?? 'MATH',
      targetSkillCodes: (json['targetSkillCodes'] as List<dynamic>?)
              ?.map((s) => s.toString())
              .toList() ??
          [],
      difficulty: json['difficulty'] is num ? (json['difficulty'] as num).toInt() : 3,
      gameConfig: json['gameConfig'] as Map<String, dynamic>? ?? {},
      xpReward: json['xpReward'] is num ? (json['xpReward'] as num).toInt() : 15,
      coinReward: json['coinReward'] is num ? (json['coinReward'] as num).toInt() : 5,
    );
  }
}

/// Result from generating a learning break.
class LearningBreakResult {
  const LearningBreakResult({
    required this.game,
    this.personalized = false,
    this.skillsAnalyzed = 0,
  });

  final LearningBreakGame game;
  final bool personalized;
  final int skillsAnalyzed;

  factory LearningBreakResult.fromJson(Map<String, dynamic> json) {
    final gameJson = json['game'] as Map<String, dynamic>? ?? {};
    final metaJson = json['meta'] as Map<String, dynamic>? ?? {};

    return LearningBreakResult(
      game: LearningBreakGame.fromJson(gameJson),
      personalized: metaJson['personalized'] == true,
      skillsAnalyzed: metaJson['skillsAnalyzed'] is num
          ? (metaJson['skillsAnalyzed'] as num).toInt()
          : 0,
    );
  }
}

/// Result from completing a learning break.
class LearningBreakCompleteResult {
  const LearningBreakCompleteResult({
    required this.success,
    this.score,
    this.accuracy,
    this.xpEarned = 0,
    this.coinsEarned = 0,
  });

  final bool success;
  final int? score;
  final int? accuracy;
  final int xpEarned;
  final int coinsEarned;

  factory LearningBreakCompleteResult.fromJson(Map<String, dynamic> json) {
    final resultsJson = json['results'] as Map<String, dynamic>? ?? {};

    return LearningBreakCompleteResult(
      success: json['success'] == true,
      score: resultsJson['score'] is num ? (resultsJson['score'] as num).toInt() : null,
      accuracy: resultsJson['accuracy'] is num ? (resultsJson['accuracy'] as num).toInt() : null,
      xpEarned: resultsJson['xpEarned'] is num ? (resultsJson['xpEarned'] as num).toInt() : 0,
      coinsEarned: resultsJson['coinsEarned'] is num ? (resultsJson['coinsEarned'] as num).toInt() : 0,
    );
  }
}

/// Self-reported mood options.
enum SelfReportedMood {
  happy('happy', '😊', 'Happy'),
  okay('okay', '😐', 'Okay'),
  frustrated('frustrated', '😤', 'Frustrated'),
  tired('tired', '😴', 'Tired'),
  confused('confused', '🤔', 'Confused');

  const SelfReportedMood(this.code, this.emoji, this.label);
  final String code;
  final String emoji;
  final String label;
}

/// A regulation activity recommendation.
class RegulationActivity {
  const RegulationActivity({
    required this.type,
    required this.title,
    required this.instructions,
    required this.durationSeconds,
    this.mediaUrl,
  });

  final BreakActivityType type;
  final String title;
  final String instructions;
  final int durationSeconds;
  final String? mediaUrl;

  factory RegulationActivity.fromJson(Map<String, dynamic> json) {
    final typeCode = json['activityType']?.toString() ?? 'breathing';
    final type = BreakActivityType.values.firstWhere(
      (t) => t.code == typeCode,
      orElse: () => BreakActivityType.breathing,
    );

    return RegulationActivity(
      type: type,
      title: json['title']?.toString() ?? 'Take a Break',
      instructions: json['instructions']?.toString() ?? '',
      durationSeconds: json['durationSeconds'] is num
          ? (json['durationSeconds'] as num).toInt()
          : 60,
      mediaUrl: json['mediaUrl']?.toString(),
    );
  }
}

/// Result from focus ping analysis.
class FocusPingResult {
  const FocusPingResult({
    required this.requiresBreak,
    this.reasons = const [],
    this.recommendation,
  });

  final bool requiresBreak;
  final List<String> reasons;
  final RegulationActivity? recommendation;

  factory FocusPingResult.fromJson(Map<String, dynamic> json) {
    RegulationActivity? recommendation;
    if (json['recommendation'] != null) {
      recommendation = RegulationActivity.fromJson(json['recommendation'] as Map<String, dynamic>);
    }

    final reasonsList = json['reasons'] as List<dynamic>? ?? [];

    return FocusPingResult(
      requiresBreak: json['requiresBreak'] == true,
      reasons: reasonsList.map((r) => r.toString()).toList(),
      recommendation: recommendation,
    );
  }
}

/// Result from break recommendation request.
class BreakRecommendation {
  const BreakRecommendation({
    required this.activities,
    this.message,
  });

  final List<RegulationActivity> activities;
  final String? message;

  factory BreakRecommendation.fromJson(Map<String, dynamic> json) {
    final activitiesList = json['activities'] as List<dynamic>? ?? [];

    return BreakRecommendation(
      activities: activitiesList
          .map((a) => RegulationActivity.fromJson(a as Map<String, dynamic>))
          .toList(),
      message: json['message']?.toString(),
    );
  }
}

/// Exception thrown by focus API operations.
class FocusException implements Exception {
  const FocusException(this.message, {this.code});
  final String message;
  final int? code;

  @override
  String toString() => message;
}

/// Service for Focus Monitor & Regulation API calls.
class FocusService {
  FocusService({String? accessToken})
      : _dio = Dio(BaseOptions(
          baseUrl: _baseUrl,
          headers: accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
        ));

  final Dio _dio;

  /// Send a focus ping with telemetry data.
  /// POST /focus/ping
  Future<FocusPingResult> sendPing({
    required String sessionId,
    required String learnerId,
    required String activityId,
    required int idleMs,
    required bool appInBackground,
    SelfReportedMood? mood,
    bool? rapidExit,
  }) async {
    if (_useFocusMock) {
      _logMockWarning();
      await Future.delayed(const Duration(milliseconds: 100));
      return _mockPingResult(idleMs, mood, rapidExit);
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/focus/ping',
        data: {
          'sessionId': sessionId,
          'learnerId': learnerId,
          'timestamp': DateTime.now().toUtc().toIso8601String(),
          'activityId': activityId,
          'idleMs': idleMs,
          'appInBackground': appInBackground,
          if (mood != null) 'selfReportedMood': mood.code,
          if (rapidExit != null) 'rapidExit': rapidExit,
        },
      );

      if (response.data == null) {
        throw const FocusException('No ping result returned');
      }

      return FocusPingResult.fromJson(response.data!);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get break recommendations based on context.
  /// POST /focus/recommendation
  Future<BreakRecommendation> getRecommendation({
    required String sessionId,
    required String learnerId,
    required String gradeBand,
    String? currentActivityId,
    SelfReportedMood? mood,
    List<String>? focusLossReasons,
  }) async {
    if (_useFocusMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return _mockRecommendation(gradeBand, mood);
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/focus/recommendation',
        data: {
          'sessionId': sessionId,
          'learnerId': learnerId,
          'context': {
            'gradeBand': gradeBand,
            if (currentActivityId != null) 'currentActivityId': currentActivityId,
            if (mood != null) 'mood': mood.code,
            if (focusLossReasons != null) 'focusLossReasons': focusLossReasons,
          },
        },
      );

      if (response.data == null) {
        throw const FocusException('No recommendation returned');
      }

      return BreakRecommendation.fromJson(response.data!);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Notify that a break has started.
  /// POST /focus/break-started
  Future<void> notifyBreakStarted({
    required String sessionId,
    required String learnerId,
    required BreakActivityType activityType,
    String? activityTitle,
  }) async {
    if (_useFocusMock) {
      await Future.delayed(const Duration(milliseconds: 50));
      return;
    }

    try {
      await _dio.post<void>(
        '/focus/break-started',
        data: {
          'sessionId': sessionId,
          'learnerId': learnerId,
          'activityType': activityType.code,
          if (activityTitle != null) 'activityTitle': activityTitle,
        },
      );
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Notify that a break has completed.
  /// POST /focus/break-complete
  Future<void> notifyBreakComplete({
    required String sessionId,
    required String learnerId,
    required BreakActivityType activityType,
    required bool completedFully,
    int? helpfulnessRating,
    int? actualDurationSeconds,
  }) async {
    if (_useFocusMock) {
      await Future.delayed(const Duration(milliseconds: 50));
      return;
    }

    try {
      await _dio.post<void>(
        '/focus/break-complete',
        data: {
          'sessionId': sessionId,
          'learnerId': learnerId,
          'activityType': activityType.code,
          'completedFully': completedFully,
          if (helpfulnessRating != null) 'helpfulnessRating': helpfulnessRating,
          if (actualDurationSeconds != null) 'actualDurationSeconds': actualDurationSeconds,
        },
      );
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LEARNING BREAK GAMES
  // ════════════════════════════════════════════════════════════════════════════

  /// Generate a personalized learning break game.
  /// POST /focus/learning-breaks/generate
  Future<LearningBreakResult> generateLearningBreak({
    required String sessionId,
    required String learnerId,
    required String tenantId,
    required String gradeBand,
    String? preferredDomain,
    int? maxDurationSeconds,
  }) async {
    if (_useFocusMock) {
      _logMockWarning();
      await Future.delayed(const Duration(milliseconds: 200));
      return _mockLearningBreak(gradeBand, preferredDomain);
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/focus/learning-breaks/generate',
        data: {
          'sessionId': sessionId,
          'learnerId': learnerId,
          'tenantId': tenantId,
          'gradeBand': gradeBand,
          if (preferredDomain != null) 'preferredDomain': preferredDomain,
          if (maxDurationSeconds != null) 'maxDurationSeconds': maxDurationSeconds,
        },
      );

      if (response.data == null) {
        throw const FocusException('No learning break returned');
      }

      return LearningBreakResult.fromJson(response.data!);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Notify that a learning break game has started.
  /// POST /focus/learning-breaks/start
  Future<void> notifyLearningBreakStarted({
    required String sessionId,
    required String learnerId,
    required LearningGameType gameType,
    required String targetDomain,
    required List<String> targetSkillCodes,
    required int difficulty,
  }) async {
    if (_useFocusMock) {
      await Future.delayed(const Duration(milliseconds: 50));
      return;
    }

    try {
      await _dio.post<void>(
        '/focus/learning-breaks/start',
        data: {
          'sessionId': sessionId,
          'learnerId': learnerId,
          'gameType': gameType.code,
          'targetDomain': targetDomain,
          'targetSkillCodes': targetSkillCodes,
          'difficulty': difficulty,
        },
      );
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Notify that a learning break game has completed.
  /// POST /focus/learning-breaks/complete
  Future<LearningBreakCompleteResult> notifyLearningBreakComplete({
    required String sessionId,
    required String learnerId,
    required LearningGameType gameType,
    required bool completed,
    int? score,
    int? correctAnswers,
    int? totalQuestions,
    int? durationSeconds,
    List<String>? targetSkillCodes,
    int? helpfulnessRating,
  }) async {
    if (_useFocusMock) {
      await Future.delayed(const Duration(milliseconds: 100));
      return LearningBreakCompleteResult(
        success: true,
        score: score,
        accuracy: totalQuestions != null && totalQuestions > 0 && correctAnswers != null
            ? ((correctAnswers / totalQuestions) * 100).round()
            : null,
        xpEarned: completed ? 15 : 0,
        coinsEarned: completed ? 5 : 0,
      );
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/focus/learning-breaks/complete',
        data: {
          'sessionId': sessionId,
          'learnerId': learnerId,
          'gameType': gameType.code,
          'completed': completed,
          if (score != null) 'score': score,
          if (correctAnswers != null) 'correctAnswers': correctAnswers,
          if (totalQuestions != null) 'totalQuestions': totalQuestions,
          if (durationSeconds != null) 'durationSeconds': durationSeconds,
          if (targetSkillCodes != null) 'targetSkillCodes': targetSkillCodes,
          if (helpfulnessRating != null) 'helpfulnessRating': helpfulnessRating,
        },
      );

      if (response.data == null) {
        throw const FocusException('No completion result returned');
      }

      return LearningBreakCompleteResult.fromJson(response.data!);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  FocusException _handleError(DioException err) {
    final statusCode = err.response?.statusCode;
    final message = err.response?.data is Map
        ? (err.response?.data as Map)['error']?.toString() ?? err.message
        : err.message ?? 'Network error';
    return FocusException(message ?? 'Unknown error', code: statusCode);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MOCK DATA
  // ════════════════════════════════════════════════════════════════════════════

  FocusPingResult _mockPingResult(int idleMs, SelfReportedMood? mood, bool? rapidExit) {
    // Simulate focus loss detection
    final needsBreak = idleMs > 60000 || // Idle for > 60s
        mood == SelfReportedMood.frustrated ||
        mood == SelfReportedMood.tired ||
        rapidExit == true;

    if (needsBreak) {
      return FocusPingResult(
        requiresBreak: true,
        reasons: [
          if (idleMs > 60000) 'extended_idle',
          if (mood == SelfReportedMood.frustrated) 'mood_frustrated',
          if (mood == SelfReportedMood.tired) 'mood_tired',
          if (rapidExit == true) 'rapid_exit',
        ],
        recommendation: const RegulationActivity(
          type: BreakActivityType.breathing,
          title: 'Take a Breath',
          instructions: 'Let\'s take a moment to breathe and reset.',
          durationSeconds: 60,
        ),
      );
    }

    return const FocusPingResult(requiresBreak: false);
  }

  BreakRecommendation _mockRecommendation(String gradeBand, SelfReportedMood? mood) {
    final activities = <RegulationActivity>[];

    // Grade-band and mood-appropriate activities
    if (mood == SelfReportedMood.frustrated || mood == SelfReportedMood.tired) {
      activities.add(const RegulationActivity(
        type: BreakActivityType.breathing,
        title: 'Box Breathing',
        instructions: 'Breathe in for 4 counts, hold for 4, out for 4, hold for 4. Repeat 3 times.',
        durationSeconds: 60,
      ));
    }

    if (gradeBand == 'K5') {
      activities.add(const RegulationActivity(
        type: BreakActivityType.movement,
        title: 'Shake It Out',
        instructions: 'Stand up and shake your arms, legs, and whole body for 30 seconds!',
        durationSeconds: 45,
      ));
      activities.add(const RegulationActivity(
        type: BreakActivityType.grounding,
        title: '5 Senses Check',
        instructions: 'Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.',
        durationSeconds: 90,
      ));
    } else if (gradeBand == 'G6_8') {
      activities.add(const RegulationActivity(
        type: BreakActivityType.stretching,
        title: 'Quick Stretch',
        instructions: 'Stretch your arms overhead, then touch your toes. Roll your shoulders back 5 times.',
        durationSeconds: 60,
      ));
      activities.add(const RegulationActivity(
        type: BreakActivityType.mindfulPause,
        title: 'Mindful Minute',
        instructions: 'Close your eyes and focus on your breath for one minute. Notice how your body feels.',
        durationSeconds: 60,
      ));
    } else {
      activities.add(const RegulationActivity(
        type: BreakActivityType.mindfulPause,
        title: 'Reset & Refocus',
        instructions: 'Take a moment to step back. What are you trying to accomplish? What\'s one thing you can try differently?',
        durationSeconds: 90,
      ));
      activities.add(const RegulationActivity(
        type: BreakActivityType.stretching,
        title: 'Desk Stretches',
        instructions: 'Stretch your neck, shoulders, and wrists. Take 3 deep breaths.',
        durationSeconds: 60,
      ));
    }

    return BreakRecommendation(
      activities: activities,
      message: mood == SelfReportedMood.frustrated
          ? 'It looks like you might need a moment. These activities can help you reset.'
          : 'Here are some activities to help you take a break.',
    );
  }

  LearningBreakResult _mockLearningBreak(String gradeBand, String? preferredDomain) {
    // Generate a mock learning break game
    final domain = preferredDomain ?? 'MATH';
    final isK5 = gradeBand == 'K5';

    late LearningGameType gameType;
    late String title;
    late String description;
    late List<String> instructions;
    late Map<String, dynamic> gameConfig;

    if (domain == 'MATH') {
      gameType = isK5 ? LearningGameType.mathBubblePop : LearningGameType.numberNinja;
      title = isK5 ? 'Math Bubble Pop' : 'Number Ninja';
      description = isK5
          ? 'Pop the bubbles with the right answers!'
          : 'Slice through math problems like a ninja!';
      instructions = isK5
          ? ['Bubbles float up with math problems', 'Tap the bubble with the correct answer', 'Pop as many as you can!']
          : ['Math problems appear on screen', 'Swipe to the correct answer', 'Build your combo streak!'];
      gameConfig = {
        'mathProblems': [
          {'expression': '5 + 3', 'correctAnswer': 8, 'options': [6, 7, 8, 9]},
          {'expression': '9 - 4', 'correctAnswer': 5, 'options': [3, 4, 5, 6]},
          {'expression': '2 × 6', 'correctAnswer': 12, 'options': [10, 11, 12, 14]},
        ],
        'timeLimit': 60,
      };
    } else {
      gameType = LearningGameType.wordScramble;
      title = 'Word Scramble Sprint';
      description = 'Unscramble the letters to find hidden words!';
      instructions = ['Look at the scrambled letters', 'Tap letters in order to spell the word', 'Use the hint if needed!'];
      gameConfig = {
        'words': [
          {'word': 'happy', 'scrambled': 'pahyp', 'hint': 'Feeling joyful'},
          {'word': 'friend', 'scrambled': 'rnfied', 'hint': 'Someone you play with'},
        ],
        'timeLimit': 90,
      };
    }

    return LearningBreakResult(
      game: LearningBreakGame(
        gameType: gameType,
        title: title,
        description: description,
        instructions: instructions,
        durationSeconds: 60,
        targetDomain: domain,
        targetSkillCodes: ['${domain}_GENERAL'],
        difficulty: 3,
        gameConfig: gameConfig,
        xpReward: 15,
        coinReward: 5,
      ),
      personalized: false,
      skillsAnalyzed: 0,
    );
  }
}

/// Provider for the focus service.
final focusServiceProvider = Provider<FocusService>((ref) => FocusService());
