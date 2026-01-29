import 'dart:convert';
import 'package:http/http.dart' as http;
import 'models.dart';

/// API client for home activities service
class HomeActivitiesApi {
  final String baseUrl;
  final http.Client client;

  HomeActivitiesApi({
    this.baseUrl = 'https://api.aivo.app/home-activities',
    http.Client? client,
  }) : client = client ?? http.Client();

  // ============================================================================
  // Learning Games
  // ============================================================================

  /// Get available learning games for a child
  Future<List<LearningGame>> getGames({
    required String childId,
    GameCategory? category,
    String? skillArea,
    DifficultyLevel? difficulty,
  }) async {
    final queryParams = <String, String>{
      'childId': childId,
      if (category != null) 'category': category.name,
      if (skillArea != null) 'skillArea': skillArea,
      if (difficulty != null) 'difficulty': difficulty.name,
    };

    final uri = Uri.parse('$baseUrl/api/parent/games')
        .replace(queryParameters: queryParams);
    final response = await client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => LearningGame.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load games');
    }
  }

  /// Get game details
  Future<LearningGame> getGameDetails(String gameId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/api/parent/games/$gameId'),
    );

    if (response.statusCode == 200) {
      return LearningGame.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to load game details');
    }
  }

  /// Start a game session
  Future<GameSession> startGameSession({
    required String gameId,
    required String childId,
  }) async {
    final response = await client.post(
      Uri.parse('$baseUrl/api/parent/game-sessions'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'gameId': gameId,
        'childId': childId,
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return GameSession.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to start game session');
    }
  }

  /// Complete a game session
  Future<GameSession> completeGameSession({
    required String sessionId,
    required int score,
    required int timeSpent,
    Map<String, dynamic>? sessionData,
  }) async {
    final response = await client.put(
      Uri.parse('$baseUrl/api/parent/game-sessions/$sessionId/complete'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'score': score,
        'timeSpent': timeSpent,
        'sessionData': sessionData,
      }),
    );

    if (response.statusCode == 200) {
      return GameSession.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to complete game session');
    }
  }

  /// Get game progress for a child
  Future<List<GameProgress>> getGameProgress(String childId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/api/parent/games/progress?childId=$childId'),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => GameProgress.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load game progress');
    }
  }

  // ============================================================================
  // Practice Exercises
  // ============================================================================

  /// Get available practice exercises
  Future<List<PracticeExercise>> getExercises({
    required String childId,
    String? subject,
    String? skillArea,
    DifficultyLevel? difficulty,
  }) async {
    final queryParams = <String, String>{
      'childId': childId,
      if (subject != null) 'subject': subject,
      if (skillArea != null) 'skillArea': skillArea,
      if (difficulty != null) 'difficulty': difficulty.name,
    };

    final uri = Uri.parse('$baseUrl/api/parent/exercises')
        .replace(queryParameters: queryParams);
    final response = await client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => PracticeExercise.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load exercises');
    }
  }

  /// Start an exercise session
  Future<ExerciseSession> startExerciseSession({
    required String exerciseId,
    required String childId,
  }) async {
    final response = await client.post(
      Uri.parse('$baseUrl/api/parent/exercise-sessions'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'exerciseId': exerciseId,
        'childId': childId,
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return ExerciseSession.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to start exercise session');
    }
  }

  /// Submit exercise answer
  Future<ExerciseResult> submitAnswer({
    required String sessionId,
    required String questionId,
    required dynamic answer,
  }) async {
    final response = await client.post(
      Uri.parse('$baseUrl/api/parent/exercise-sessions/$sessionId/answer'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'questionId': questionId,
        'answer': answer,
      }),
    );

    if (response.statusCode == 200) {
      return ExerciseResult.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to submit answer');
    }
  }

  /// Complete exercise session
  Future<ExerciseSession> completeExerciseSession(String sessionId) async {
    final response = await client.put(
      Uri.parse('$baseUrl/api/parent/exercise-sessions/$sessionId/complete'),
    );

    if (response.statusCode == 200) {
      return ExerciseSession.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to complete exercise session');
    }
  }

  /// Get exercise progress
  Future<List<ExerciseProgress>> getExerciseProgress(String childId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/api/parent/exercises/progress?childId=$childId'),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => ExerciseProgress.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load exercise progress');
    }
  }

  // ============================================================================
  // Skill Builders
  // ============================================================================

  /// Get available skill builders
  Future<List<SkillBuilder>> getSkillBuilders({
    required String childId,
    String? skillCategory,
    DifficultyLevel? difficulty,
  }) async {
    final queryParams = <String, String>{
      'childId': childId,
      if (skillCategory != null) 'skillCategory': skillCategory,
      if (difficulty != null) 'difficulty': difficulty.name,
    };

    final uri = Uri.parse('$baseUrl/api/parent/skill-builders')
        .replace(queryParameters: queryParams);
    final response = await client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => SkillBuilder.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load skill builders');
    }
  }

  /// Get skill builder details with activities
  Future<SkillBuilder> getSkillBuilderDetails(String builderId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/api/parent/skill-builders/$builderId'),
    );

    if (response.statusCode == 200) {
      return SkillBuilder.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to load skill builder details');
    }
  }

  /// Start skill builder activity
  Future<SkillBuilderSession> startSkillBuilderActivity({
    required String builderId,
    required String activityId,
    required String childId,
  }) async {
    final response = await client.post(
      Uri.parse('$baseUrl/api/parent/skill-builder-sessions'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'builderId': builderId,
        'activityId': activityId,
        'childId': childId,
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return SkillBuilderSession.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to start skill builder activity');
    }
  }

  /// Complete skill builder activity
  Future<SkillBuilderSession> completeSkillBuilderActivity({
    required String sessionId,
    required bool completed,
    int? score,
    String? notes,
  }) async {
    final response = await client.put(
      Uri.parse('$baseUrl/api/parent/skill-builder-sessions/$sessionId/complete'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'completed': completed,
        if (score != null) 'score': score,
        if (notes != null) 'notes': notes,
      }),
    );

    if (response.statusCode == 200) {
      return SkillBuilderSession.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to complete skill builder activity');
    }
  }

  /// Get skill builder progress
  Future<List<SkillBuilderProgress>> getSkillBuilderProgress(String childId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/api/parent/skill-builders/progress?childId=$childId'),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => SkillBuilderProgress.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load skill builder progress');
    }
  }

  // ============================================================================
  // Family Activities
  // ============================================================================

  /// Get available family activities
  Future<List<FamilyActivity>> getFamilyActivities({
    required String childId,
    ActivityType? type,
    int? minAge,
    int? maxAge,
    int? estimatedTime,
  }) async {
    final queryParams = <String, String>{
      'childId': childId,
      if (type != null) 'type': type.name,
      if (minAge != null) 'minAge': minAge.toString(),
      if (maxAge != null) 'maxAge': maxAge.toString(),
      if (estimatedTime != null) 'estimatedTime': estimatedTime.toString(),
    };

    final uri = Uri.parse('$baseUrl/api/parent/family-activities')
        .replace(queryParameters: queryParams);
    final response = await client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => FamilyActivity.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load family activities');
    }
  }

  /// Get activity details
  Future<FamilyActivity> getActivityDetails(String activityId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/api/parent/family-activities/$activityId'),
    );

    if (response.statusCode == 200) {
      return FamilyActivity.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to load activity details');
    }
  }

  /// Start family activity
  Future<FamilyActivitySession> startFamilyActivity({
    required String activityId,
    required String childId,
    List<String>? participants,
  }) async {
    final response = await client.post(
      Uri.parse('$baseUrl/api/parent/family-activity-sessions'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'activityId': activityId,
        'childId': childId,
        if (participants != null) 'participants': participants,
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return FamilyActivitySession.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to start family activity');
    }
  }

  /// Complete family activity with feedback
  Future<FamilyActivitySession> completeFamilyActivity({
    required String sessionId,
    required int rating,
    String? feedback,
    List<String>? photos,
  }) async {
    final response = await client.put(
      Uri.parse('$baseUrl/api/parent/family-activity-sessions/$sessionId/complete'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'rating': rating,
        if (feedback != null) 'feedback': feedback,
        if (photos != null) 'photos': photos,
      }),
    );

    if (response.statusCode == 200) {
      return FamilyActivitySession.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to complete family activity');
    }
  }

  /// Get completed family activities
  Future<List<FamilyActivitySession>> getCompletedActivities(String childId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/api/parent/family-activity-sessions?childId=$childId&completed=true'),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => FamilyActivitySession.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load completed activities');
    }
  }

  /// Get activity recommendations
  Future<List<FamilyActivity>> getRecommendedActivities(String childId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/api/parent/family-activities/recommended?childId=$childId'),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => FamilyActivity.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load recommended activities');
    }
  }
}
