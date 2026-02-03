import 'dart:convert';
import 'package:http/http.dart' as http;
import 'models.dart';
import '../config/environment.dart';

/// Motor Skills Service
/// Service for managing motor skills development features
class MotorSkillsService {
  final http.Client client;
  final String baseUrl;

  MotorSkillsService({
    required this.client,
    String? baseUrl,
  }) : baseUrl = baseUrl ?? EnvironmentConfig.motorSkillsBaseUrl;

  // Handwriting Practice

  Future<List<HandwritingExercise>> getHandwritingExercises({
    HandwritingType? type,
    int? difficulty,
  }) async {
    var url = '$baseUrl/handwriting/exercises';
    final queryParams = <String, String>{};
    if (type != null) {
      queryParams['type'] = type.toString().split('.').last;
    }
    if (difficulty != null) {
      queryParams['difficulty'] = difficulty.toString();
    }
    if (queryParams.isNotEmpty) {
      url += '?${queryParams.entries.map((e) => '${e.key}=${e.value}').join('&')}';
    }

    final response = await client.get(Uri.parse(url));
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((e) => HandwritingExercise.fromJson(e)).toList();
    }
    throw Exception('Failed to load handwriting exercises');
  }

  Future<HandwritingExercise> getHandwritingExercise(String exerciseId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/handwriting/exercises/$exerciseId'),
    );
    if (response.statusCode == 200) {
      return HandwritingExercise.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to load handwriting exercise');
  }

  Future<HandwritingSession> startHandwritingSession({
    required String learnerId,
    required String exerciseId,
  }) async {
    final response = await client.post(
      Uri.parse('$baseUrl/handwriting/sessions'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'learnerId': learnerId,
        'exerciseId': exerciseId,
      }),
    );
    if (response.statusCode == 201) {
      return HandwritingSession.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to start handwriting session');
  }

  Future<HandwritingSession> completeHandwritingSession({
    required String sessionId,
    required int accuracy,
    required int strokesCompleted,
    List<String>? feedback,
    Map<String, dynamic>? traceData,
  }) async {
    final response = await client.patch(
      Uri.parse('$baseUrl/handwriting/sessions/$sessionId/complete'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'accuracy': accuracy,
        'strokesCompleted': strokesCompleted,
        'feedback': feedback ?? [],
        'traceData': traceData,
      }),
    );
    if (response.statusCode == 200) {
      return HandwritingSession.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to complete handwriting session');
  }

  Future<List<HandwritingSession>> getHandwritingSessions(String learnerId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/handwriting/sessions?learnerId=$learnerId'),
    );
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((e) => HandwritingSession.fromJson(e)).toList();
    }
    throw Exception('Failed to load handwriting sessions');
  }

  // Fine Motor Activities

  Future<List<FineMotorActivity>> getFineMotorActivities({
    FineMotorType? type,
    int? difficulty,
  }) async {
    var url = '$baseUrl/fine-motor/activities';
    final queryParams = <String, String>{};
    if (type != null) {
      queryParams['type'] = type.toString().split('.').last;
    }
    if (difficulty != null) {
      queryParams['difficulty'] = difficulty.toString();
    }
    if (queryParams.isNotEmpty) {
      url += '?${queryParams.entries.map((e) => '${e.key}=${e.value}').join('&')}';
    }

    final response = await client.get(Uri.parse(url));
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((e) => FineMotorActivity.fromJson(e)).toList();
    }
    throw Exception('Failed to load fine motor activities');
  }

  Future<FineMotorActivity> getFineMotorActivity(String activityId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/fine-motor/activities/$activityId'),
    );
    if (response.statusCode == 200) {
      return FineMotorActivity.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to load fine motor activity');
  }

  Future<FineMotorSession> startFineMotorSession({
    required String learnerId,
    required String activityId,
  }) async {
    final response = await client.post(
      Uri.parse('$baseUrl/fine-motor/sessions'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'learnerId': learnerId,
        'activityId': activityId,
      }),
    );
    if (response.statusCode == 201) {
      return FineMotorSession.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to start fine motor session');
  }

  Future<FineMotorSession> completeFineMotorSession({
    required String sessionId,
    required int stepsCompleted,
    required int accuracy,
    List<String>? achievements,
    Map<String, dynamic>? performanceData,
  }) async {
    final response = await client.patch(
      Uri.parse('$baseUrl/fine-motor/sessions/$sessionId/complete'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'stepsCompleted': stepsCompleted,
        'accuracy': accuracy,
        'achievements': achievements ?? [],
        'performanceData': performanceData,
      }),
    );
    if (response.statusCode == 200) {
      return FineMotorSession.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to complete fine motor session');
  }

  Future<List<FineMotorSession>> getFineMotorSessions(String learnerId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/fine-motor/sessions?learnerId=$learnerId'),
    );
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((e) => FineMotorSession.fromJson(e)).toList();
    }
    throw Exception('Failed to load fine motor sessions');
  }

  // Gross Motor Exercises

  Future<List<GrossMotorExercise>> getGrossMotorExercises({
    GrossMotorType? type,
    int? difficulty,
  }) async {
    var url = '$baseUrl/gross-motor/exercises';
    final queryParams = <String, String>{};
    if (type != null) {
      queryParams['type'] = type.toString().split('.').last;
    }
    if (difficulty != null) {
      queryParams['difficulty'] = difficulty.toString();
    }
    if (queryParams.isNotEmpty) {
      url += '?${queryParams.entries.map((e) => '${e.key}=${e.value}').join('&')}';
    }

    final response = await client.get(Uri.parse(url));
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((e) => GrossMotorExercise.fromJson(e)).toList();
    }
    throw Exception('Failed to load gross motor exercises');
  }

  Future<GrossMotorExercise> getGrossMotorExercise(String exerciseId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/gross-motor/exercises/$exerciseId'),
    );
    if (response.statusCode == 200) {
      return GrossMotorExercise.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to load gross motor exercise');
  }

  Future<GrossMotorSession> startGrossMotorSession({
    required String learnerId,
    required String exerciseId,
  }) async {
    final response = await client.post(
      Uri.parse('$baseUrl/gross-motor/sessions'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'learnerId': learnerId,
        'exerciseId': exerciseId,
      }),
    );
    if (response.statusCode == 201) {
      return GrossMotorSession.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to start gross motor session');
  }

  Future<GrossMotorSession> completeGrossMotorSession({
    required String sessionId,
    required int movementsCompleted,
    required int accuracy,
    Map<String, dynamic>? trackingData,
    List<String>? notes,
  }) async {
    final response = await client.patch(
      Uri.parse('$baseUrl/gross-motor/sessions/$sessionId/complete'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'movementsCompleted': movementsCompleted,
        'accuracy': accuracy,
        'trackingData': trackingData,
        'notes': notes ?? [],
      }),
    );
    if (response.statusCode == 200) {
      return GrossMotorSession.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to complete gross motor session');
  }

  Future<List<GrossMotorSession>> getGrossMotorSessions(String learnerId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/gross-motor/sessions?learnerId=$learnerId'),
    );
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((e) => GrossMotorSession.fromJson(e)).toList();
    }
    throw Exception('Failed to load gross motor sessions');
  }

  // Adaptive Input

  Future<AdaptiveInputProfile> getAdaptiveInputProfile(String learnerId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/adaptive-input/profile?learnerId=$learnerId'),
    );
    if (response.statusCode == 200) {
      return AdaptiveInputProfile.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to load adaptive input profile');
  }

  Future<AdaptiveInputProfile> updateAdaptiveInputSetting({
    required String profileId,
    required String settingId,
    required dynamic value,
  }) async {
    final response = await client.patch(
      Uri.parse('$baseUrl/adaptive-input/profile/$profileId/settings/$settingId'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'value': value}),
    );
    if (response.statusCode == 200) {
      return AdaptiveInputProfile.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to update adaptive input setting');
  }

  Future<AdaptiveInputProfile> resetAdaptiveInputSettings(String profileId) async {
    final response = await client.post(
      Uri.parse('$baseUrl/adaptive-input/profile/$profileId/reset'),
    );
    if (response.statusCode == 200) {
      return AdaptiveInputProfile.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to reset adaptive input settings');
  }

  Future<AdaptiveInputProfile> activateAdaptiveInputProfile(String profileId) async {
    final response = await client.post(
      Uri.parse('$baseUrl/adaptive-input/profile/$profileId/activate'),
    );
    if (response.statusCode == 200) {
      return AdaptiveInputProfile.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to activate adaptive input profile');
  }
}
