/// SEL (Social-Emotional Learning) Service
///
/// API client for SEL microservice endpoints including mood check-ins,
/// coping strategies, mindfulness exercises, social scenarios, and journal.
library;

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'sel_models.dart';

/// Service for SEL API interactions
class SELService {
  final String baseUrl;
  final String Function() getAuthToken;
  final String learnerId;

  SELService({
    required this.baseUrl,
    required this.getAuthToken,
    required this.learnerId,
  });

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${getAuthToken()}',
      };

  // ==========================================================================
  // MOOD CHECK-INS
  // ==========================================================================

  /// Create a new mood check-in
  Future<MoodCheckIn> createMoodCheckIn({
    required Mood mood,
    required int intensity,
    List<String>? triggers,
    String? notes,
    List<String>? copingStrategiesUsed,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/sel/mood-checkins'),
      headers: _headers,
      body: json.encode({
        'learnerId': learnerId,
        'mood': mood.name,
        'intensity': intensity,
        if (triggers != null) 'triggers': triggers,
        if (notes != null) 'notes': notes,
        if (copingStrategiesUsed != null)
          'copingStrategiesUsed': copingStrategiesUsed,
      }),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw SELException('Failed to create mood check-in: ${response.statusCode}');
    }

    final data = json.decode(response.body);
    return MoodCheckIn.fromJson(data['data'] ?? data);
  }

  /// Get mood check-in history
  Future<List<MoodCheckIn>> getMoodCheckIns({int limit = 30}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/sel/mood-checkins?learnerId=$learnerId&limit=$limit'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw SELException('Failed to load mood check-ins');
    }

    final data = json.decode(response.body);
    final List<dynamic> checkIns = data['data'] ?? data;
    return checkIns.map((c) => MoodCheckIn.fromJson(c as Map<String, dynamic>)).toList();
  }

  // ==========================================================================
  // COPING STRATEGIES
  // ==========================================================================

  /// Get all coping strategies
  Future<List<CopingStrategy>> getCopingStrategies({
    CopingCategory? category,
    Difficulty? difficulty,
  }) async {
    var url = '$baseUrl/api/sel/regulation-strategies';
    final params = <String>[];
    if (category != null) params.add('category=${category.name}');
    if (difficulty != null) params.add('difficulty=${difficulty.name}');
    if (params.isNotEmpty) url += '?${params.join('&')}';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw SELException('Failed to load coping strategies');
    }

    final data = json.decode(response.body);
    final List<dynamic> strategies = data['data'] ?? data;
    return strategies.map((s) => CopingStrategy.fromJson(s as Map<String, dynamic>)).toList();
  }

  /// Get a specific coping strategy by ID
  Future<CopingStrategy> getCopingStrategy(String strategyId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/sel/regulation-strategies/$strategyId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw SELException('Failed to load coping strategy');
    }

    final data = json.decode(response.body);
    return CopingStrategy.fromJson(data['data'] ?? data);
  }

  /// Record usage of a coping strategy
  Future<void> recordStrategyUse({
    required String strategyId,
    required int effectiveness,
    String? notes,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/sel/strategy-usage'),
      headers: _headers,
      body: json.encode({
        'learnerId': learnerId,
        'strategyId': strategyId,
        'effectiveness': effectiveness,
        if (notes != null) 'notes': notes,
      }),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw SELException('Failed to record strategy use');
    }
  }

  /// Toggle favorite status for a strategy
  Future<void> toggleStrategyFavorite(String strategyId, bool isFavorite) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/sel/regulation-strategies/$strategyId/favorite'),
      headers: _headers,
      body: json.encode({
        'learnerId': learnerId,
        'favorite': isFavorite,
      }),
    );

    if (response.statusCode != 200) {
      throw SELException('Failed to update favorite status');
    }
  }

  // ==========================================================================
  // MINDFULNESS EXERCISES
  // ==========================================================================

  /// Get mindfulness exercises
  Future<List<MindfulnessExercise>> getMindfulnessExercises({
    MindfulnessType? type,
    int? maxDuration,
  }) async {
    var url = '$baseUrl/api/sel/mindfulness';
    final params = <String>[];
    if (type != null) params.add('type=${type.name}');
    if (maxDuration != null) params.add('maxDuration=$maxDuration');
    if (params.isNotEmpty) url += '?${params.join('&')}';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw SELException('Failed to load mindfulness exercises');
    }

    final data = json.decode(response.body);
    final List<dynamic> exercises = data['data'] ?? data;
    return exercises.map((e) => MindfulnessExercise.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Record completion of a mindfulness exercise
  Future<void> recordExerciseCompletion({
    required String exerciseId,
    required int durationSeconds,
    int? rating,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/sel/mindfulness/$exerciseId/complete'),
      headers: _headers,
      body: json.encode({
        'learnerId': learnerId,
        'durationSeconds': durationSeconds,
        if (rating != null) 'rating': rating,
      }),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw SELException('Failed to record exercise completion');
    }
  }

  // ==========================================================================
  // SOCIAL SCENARIOS
  // ==========================================================================

  /// Get social scenarios
  Future<List<SocialScenario>> getSocialScenarios({String? category}) async {
    var url = '$baseUrl/api/sel/social-scenarios';
    if (category != null) url += '?category=$category';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw SELException('Failed to load social scenarios');
    }

    final data = json.decode(response.body);
    final List<dynamic> scenarios = data['data'] ?? data;
    return scenarios.map((s) => SocialScenario.fromJson(s as Map<String, dynamic>)).toList();
  }

  /// Submit answer for a social scenario
  Future<Map<String, dynamic>> submitScenarioAnswer({
    required String scenarioId,
    required String choiceId,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/sel/social-scenarios/$scenarioId/answer'),
      headers: _headers,
      body: json.encode({
        'learnerId': learnerId,
        'choiceId': choiceId,
      }),
    );

    if (response.statusCode != 200) {
      throw SELException('Failed to submit answer');
    }

    return json.decode(response.body) as Map<String, dynamic>;
  }

  // ==========================================================================
  // FEELINGS JOURNAL
  // ==========================================================================

  /// Get journal entries
  Future<List<JournalEntry>> getJournalEntries({int limit = 20}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/sel/journal?learnerId=$learnerId&limit=$limit'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw SELException('Failed to load journal entries');
    }

    final data = json.decode(response.body);
    final List<dynamic> entries = data['data'] ?? data;
    return entries.map((e) => JournalEntry.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Create a journal entry
  Future<JournalEntry> createJournalEntry({
    required String content,
    Mood? mood,
    List<String>? tags,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/sel/journal'),
      headers: _headers,
      body: json.encode({
        'learnerId': learnerId,
        'content': content,
        if (mood != null) 'mood': mood.name,
        if (tags != null) 'tags': tags,
      }),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw SELException('Failed to create journal entry');
    }

    final data = json.decode(response.body);
    return JournalEntry.fromJson(data['data'] ?? data);
  }

  /// Delete a journal entry
  Future<void> deleteJournalEntry(String entryId) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/api/sel/journal/$entryId'),
      headers: _headers,
    );

    if (response.statusCode != 200 && response.statusCode != 204) {
      throw SELException('Failed to delete journal entry');
    }
  }

  /// Update a journal entry
  Future<JournalEntry> updateJournalEntry({
    required String entryId,
    required String content,
    Mood? mood,
    List<String>? tags,
  }) async {
    final response = await http.put(
      Uri.parse('$baseUrl/api/sel/journal/$entryId'),
      headers: _headers,
      body: json.encode({
        'content': content,
        if (mood != null) 'mood': mood.name,
        if (tags != null) 'tags': tags,
      }),
    );

    if (response.statusCode != 200) {
      throw SELException('Failed to update journal entry');
    }

    final data = json.decode(response.body);
    return JournalEntry.fromJson(data['data'] ?? data);
  }

  // ==========================================================================
  // PROGRESS
  // ==========================================================================

  /// Get SEL progress
  Future<SELProgress> getProgress() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/sel/progress/$learnerId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw SELException('Failed to load SEL progress');
    }

    final data = json.decode(response.body);
    return SELProgress.fromJson(data['data'] ?? data);
  }
}

/// SEL exception class
class SELException implements Exception {
  final String message;
  SELException(this.message);

  @override
  String toString() => 'SELException: $message';
}
