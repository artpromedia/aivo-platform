/// Life Skills Service
/// 
/// API client for the life-skills-svc backend.
library;

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'life_skills_models.dart';

/// Service for interacting with the Life Skills API
class LifeSkillsService {
  final String baseUrl;
  final String? authToken;
  final http.Client _client;

  LifeSkillsService({
    required this.baseUrl,
    this.authToken,
    http.Client? client,
  }) : _client = client ?? http.Client();

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (authToken != null) 'Authorization': 'Bearer $authToken',
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SKILLS
  // ══════════════════════════════════════════════════════════════════════════

  /// Get all available life skills
  Future<List<LifeSkill>> getSkills({
    SkillCategory? category,
    DifficultyLevel? difficulty,
    String? tenantId,
    String? search,
    int limit = 20,
    int offset = 0,
  }) async {
    final queryParams = <String, String>{
      'limit': limit.toString(),
      'offset': offset.toString(),
      if (category != null) 'category': category.name.toUpperCase(),
      if (difficulty != null) 'difficulty': difficulty.name.toUpperCase(),
      if (tenantId != null) 'tenantId': tenantId,
      if (search != null) 'search': search,
    };

    final uri = Uri.parse('$baseUrl/api/v1/skills').replace(queryParameters: queryParams);
    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode != 200) {
      throw Exception('Failed to load skills: ${response.body}');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final skills = data['skills'] as List<dynamic>;
    return skills.map((s) => LifeSkill.fromJson(s as Map<String, dynamic>)).toList();
  }

  /// Get skill categories with counts
  Future<List<Map<String, dynamic>>> getCategories() async {
    final uri = Uri.parse('$baseUrl/api/v1/skills/categories');
    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode != 200) {
      throw Exception('Failed to load categories: ${response.body}');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return (data['categories'] as List<dynamic>).cast<Map<String, dynamic>>();
  }

  /// Get skill guide with steps
  Future<SkillGuide> getSkillGuide(String skillId, {String? learnerId}) async {
    final queryParams = <String, String>{
      if (learnerId != null) 'learnerId': learnerId,
    };

    final uri = Uri.parse('$baseUrl/api/v1/skills/$skillId/guide')
        .replace(queryParameters: queryParams.isEmpty ? null : queryParams);
    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode != 200) {
      throw Exception('Failed to load skill guide: ${response.body}');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return SkillGuide.fromJson(data['guide'] as Map<String, dynamic>);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SESSIONS
  // ══════════════════════════════════════════════════════════════════════════

  /// Start a new skill practice session
  Future<Map<String, dynamic>> startSession({
    required String tenantId,
    required String learnerId,
    required String skillId,
    String? context,
    String? facilitator,
    String? facilitatorRole,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/sessions/start');
    final response = await _client.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'tenantId': tenantId,
        'learnerId': learnerId,
        'skillId': skillId,
        if (context != null) 'context': context,
        if (facilitator != null) 'facilitator': facilitator,
        if (facilitatorRole != null) 'facilitatorRole': facilitatorRole,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to start session: ${response.body}');
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  /// Record a step attempt
  Future<void> recordStepAttempt({
    required String sessionId,
    required int stepNumber,
    required bool wasSuccessful,
    required PromptLevel promptLevel,
    int? durationSeconds,
    String? errorType,
    String? errorNotes,
    String? aiPromptGiven,
    bool aiResponseUsed = false,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/sessions/$sessionId/step');
    final response = await _client.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'stepNumber': stepNumber,
        'wasSuccessful': wasSuccessful,
        'promptLevel': promptLevel.apiValue,
        if (durationSeconds != null) 'durationSeconds': durationSeconds,
        if (errorType != null) 'errorType': errorType,
        if (errorNotes != null) 'errorNotes': errorNotes,
        if (aiPromptGiven != null) 'aiPromptGiven': aiPromptGiven,
        'aiResponseUsed': aiResponseUsed,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to record step: ${response.body}');
    }
  }

  /// End a session
  Future<Map<String, dynamic>> endSession({
    required String sessionId,
    PromptLevel? overallPromptLevel,
    String? learnerMood,
    int? engagementLevel,
    String? sessionNotes,
    String? nextSessionFocus,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/sessions/$sessionId/end');
    final response = await _client.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        if (overallPromptLevel != null) 'overallPromptLevel': overallPromptLevel.apiValue,
        if (learnerMood != null) 'learnerMood': learnerMood,
        if (engagementLevel != null) 'engagementLevel': engagementLevel,
        if (sessionNotes != null) 'sessionNotes': sessionNotes,
        if (nextSessionFocus != null) 'nextSessionFocus': nextSessionFocus,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to end session: ${response.body}');
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SAFETY SCENARIOS
  // ══════════════════════════════════════════════════════════════════════════

  /// Get safety scenarios
  Future<List<SafetyScenario>> getSafetyScenarios({
    SafetyScenarioType? scenarioType,
    DifficultyLevel? difficulty,
    String? tenantId,
    int limit = 20,
    int offset = 0,
  }) async {
    final queryParams = <String, String>{
      'limit': limit.toString(),
      'offset': offset.toString(),
      if (scenarioType != null) 'scenarioType': scenarioType.name.toUpperCase(),
      if (difficulty != null) 'difficulty': difficulty.name.toUpperCase(),
      if (tenantId != null) 'tenantId': tenantId,
    };

    final uri = Uri.parse('$baseUrl/api/v1/safety/scenarios')
        .replace(queryParameters: queryParams);
    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode != 200) {
      throw Exception('Failed to load scenarios: ${response.body}');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final scenarios = data['scenarios'] as List<dynamic>;
    return scenarios.map((s) => SafetyScenario.fromJson(s as Map<String, dynamic>)).toList();
  }

  /// Get a specific safety scenario with choices
  Future<SafetyScenario> getSafetyScenario(String scenarioId) async {
    final uri = Uri.parse('$baseUrl/api/v1/safety/scenarios/$scenarioId');
    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode != 200) {
      throw Exception('Failed to load scenario: ${response.body}');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return SafetyScenario.fromJson(data['scenario'] as Map<String, dynamic>);
  }

  /// Get next scenario to practice
  Future<SafetyScenario?> getNextPracticeScenario({
    required String tenantId,
    required String learnerId,
    SafetyScenarioType? scenarioType,
  }) async {
    final queryParams = <String, String>{
      'tenantId': tenantId,
      if (scenarioType != null) 'scenarioType': scenarioType.name.toUpperCase(),
    };

    final uri = Uri.parse('$baseUrl/api/v1/safety/practice/$learnerId')
        .replace(queryParameters: queryParams);
    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode == 404) {
      return null;
    }

    if (response.statusCode != 200) {
      throw Exception('Failed to load practice scenario: ${response.body}');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return SafetyScenario.fromJson(data['scenario'] as Map<String, dynamic>);
  }

  /// Record a safety scenario attempt
  Future<Map<String, dynamic>> recordSafetyAttempt({
    required String tenantId,
    required String learnerId,
    required String scenarioId,
    required String choiceId,
    int? responseTimeMs,
    String? context,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/safety/attempts');
    final response = await _client.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'tenantId': tenantId,
        'learnerId': learnerId,
        'scenarioId': scenarioId,
        'choiceId': choiceId,
        if (responseTimeMs != null) 'responseTimeMs': responseTimeMs,
        if (context != null) 'context': context,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to record attempt: ${response.body}');
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AI COACH
  // ══════════════════════════════════════════════════════════════════════════

  /// Get AI guidance for a step
  Future<AIGuidance> getAIGuidance({
    required String tenantId,
    required String learnerId,
    required String skillId,
    required int stepNumber,
    String? sessionId,
    PromptLevel? currentPromptLevel,
    int? previousAttempts,
    String? lastError,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/ai-coach/guidance');
    final response = await _client.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'tenantId': tenantId,
        'learnerId': learnerId,
        'skillId': skillId,
        'stepNumber': stepNumber,
        if (sessionId != null) 'sessionId': sessionId,
        'context': {
          if (currentPromptLevel != null) 'currentPromptLevel': currentPromptLevel.apiValue,
          if (previousAttempts != null) 'previousAttempts': previousAttempts,
          if (lastError != null) 'lastError': lastError,
        },
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to get AI guidance: ${response.body}');
    }

    return AIGuidance.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  /// Get encouragement message
  Future<Encouragement> getEncouragement({
    required String tenantId,
    required String learnerId,
    required String skillId,
    required String event,
    Map<String, dynamic>? details,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/ai-coach/encouragement');
    final response = await _client.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'tenantId': tenantId,
        'learnerId': learnerId,
        'skillId': skillId,
        'event': event,
        if (details != null) 'details': details,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to get encouragement: ${response.body}');
    }

    return Encouragement.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PROGRESS
  // ══════════════════════════════════════════════════════════════════════════

  /// Get learner progress dashboard
  Future<Map<String, dynamic>> getProgressDashboard({
    required String tenantId,
    required String learnerId,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/progress/$learnerId/dashboard')
        .replace(queryParameters: {'tenantId': tenantId});
    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode != 200) {
      throw Exception('Failed to load dashboard: ${response.body}');
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  /// Get progress for all skills
  Future<List<Map<String, dynamic>>> getAllProgress({
    required String tenantId,
    required String learnerId,
    String? skillId,
    ProgressStatus? status,
    String? category,
  }) async {
    final queryParams = <String, String>{
      'tenantId': tenantId,
      'learnerId': learnerId,
      if (skillId != null) 'skillId': skillId,
      if (status != null) 'status': status.name.toUpperCase(),
      if (category != null) 'category': category,
    };

    final uri = Uri.parse('$baseUrl/api/v1/progress')
        .replace(queryParameters: queryParams);
    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode != 200) {
      throw Exception('Failed to load progress: ${response.body}');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return (data['progress'] as List<dynamic>).cast<Map<String, dynamic>>();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GOALS
  // ══════════════════════════════════════════════════════════════════════════

  /// Get learner goals
  Future<List<Map<String, dynamic>>> getGoals({
    required String tenantId,
    required String learnerId,
    bool? isActive,
  }) async {
    final queryParams = <String, String>{
      'tenantId': tenantId,
      'learnerId': learnerId,
      if (isActive != null) 'isActive': isActive.toString(),
    };

    final uri = Uri.parse('$baseUrl/api/v1/goals')
        .replace(queryParameters: queryParams);
    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode != 200) {
      throw Exception('Failed to load goals: ${response.body}');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return (data['goals'] as List<dynamic>).cast<Map<String, dynamic>>();
  }

  /// Create a new goal
  Future<Map<String, dynamic>> createGoal({
    required String tenantId,
    required String learnerId,
    required String skillId,
    required String createdByUserId,
    required String title,
    String? description,
    DateTime? targetDate,
    List<Map<String, String>>? milestones,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/goals');
    final response = await _client.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'tenantId': tenantId,
        'learnerId': learnerId,
        'skillId': skillId,
        'createdByUserId': createdByUserId,
        'title': title,
        if (description != null) 'description': description,
        if (targetDate != null) 'targetDate': targetDate.toIso8601String(),
        if (milestones != null) 'milestones': milestones,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to create goal: ${response.body}');
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  void dispose() {
    _client.close();
  }
}
