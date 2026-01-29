import 'dart:convert';
import 'package:http/http.dart' as http;
import '../sensory/models.dart';

/// Service for Sprint 2.4 sensory accommodations
/// Separate from existing sensory profile service (ND-2.1)
class SensoryService {
  final String baseUrl;
  final http.Client client;

  SensoryService({
    this.baseUrl = 'https://api.aivo.app/sensory-accommodations',
    http.Client? client,
  }) : client = client ?? http.Client();

  // Sensory Breaks

  Future<List<SensoryBreak>> getSensoryBreaks({SensoryBreakType? type}) async {
    final uri = type != null
        ? Uri.parse('$baseUrl/breaks?type=${type.name}')
        : Uri.parse('$baseUrl/breaks');

    final response = await client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body) as List<dynamic>;
      return data.map((item) => SensoryBreak.fromJson(item as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load sensory breaks');
    }
  }

  Future<SensoryBreak> getSensoryBreak(String breakId) async {
    final response = await client.get(Uri.parse('$baseUrl/breaks/$breakId'));

    if (response.statusCode == 200) {
      return SensoryBreak.fromJson(json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to load sensory break');
    }
  }

  Future<SensoryBreakSession> startBreakSession(String learnerId, String breakId) async {
    final response = await client.post(
      Uri.parse('$baseUrl/breaks/sessions'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'learnerId': learnerId,
        'breakId': breakId,
        'startTime': DateTime.now().toIso8601String(),
      }),
    );

    if (response.statusCode == 201) {
      return SensoryBreakSession.fromJson(json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to start break session');
    }
  }

  Future<SensoryBreakSession> completeBreakSession(
    String sessionId,
    int rating, {
    String? notes,
  }) async {
    final response = await client.put(
      Uri.parse('$baseUrl/breaks/sessions/$sessionId'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'endTime': DateTime.now().toIso8601String(),
        'rating': rating,
        'notes': notes,
      }),
    );

    if (response.statusCode == 200) {
      return SensoryBreakSession.fromJson(json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to complete break session');
    }
  }

  Future<List<SensoryBreakSession>> getBreakSessions(String learnerId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/breaks/sessions?learnerId=$learnerId'),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body) as List<dynamic>;
      return data.map((item) => SensoryBreakSession.fromJson(item as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load break sessions');
    }
  }

  // Environment Customization

  Future<List<EnvironmentSetting>> getEnvironmentSettings(String learnerId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/environment/settings?learnerId=$learnerId'),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body) as List<dynamic>;
      return data.map((item) => EnvironmentSetting.fromJson(item as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load environment settings');
    }
  }

  Future<EnvironmentSetting> updateEnvironmentSetting(
    String learnerId,
    String settingId,
    dynamic value,
  ) async {
    final response = await client.put(
      Uri.parse('$baseUrl/environment/settings/$settingId'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'learnerId': learnerId,
        'value': value,
      }),
    );

    if (response.statusCode == 200) {
      return EnvironmentSetting.fromJson(json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to update environment setting');
    }
  }

  Future<List<EnvironmentSetting>> resetEnvironmentSettings(String learnerId) async {
    final response = await client.post(
      Uri.parse('$baseUrl/environment/settings/reset'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'learnerId': learnerId}),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body) as List<dynamic>;
      return data.map((item) => EnvironmentSetting.fromJson(item as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to reset environment settings');
    }
  }

  // Calming Activities

  Future<List<CalmingActivity>> getCalmingActivities({CalmingActivityType? type}) async {
    final uri = type != null
        ? Uri.parse('$baseUrl/calming?type=${type.name}')
        : Uri.parse('$baseUrl/calming');

    final response = await client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body) as List<dynamic>;
      return data.map((item) => CalmingActivity.fromJson(item as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load calming activities');
    }
  }

  Future<CalmingActivity> getCalmingActivity(String activityId) async {
    final response = await client.get(Uri.parse('$baseUrl/calming/$activityId'));

    if (response.statusCode == 200) {
      return CalmingActivity.fromJson(json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to load calming activity');
    }
  }

  Future<CalmingActivitySession> startCalmingSession(
    String learnerId,
    String activityId,
    int? moodBefore,
  ) async {
    final response = await client.post(
      Uri.parse('$baseUrl/calming/sessions'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'learnerId': learnerId,
        'activityId': activityId,
        'startTime': DateTime.now().toIso8601String(),
        'moodBefore': moodBefore,
      }),
    );

    if (response.statusCode == 201) {
      return CalmingActivitySession.fromJson(json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to start calming session');
    }
  }

  Future<CalmingActivitySession> completeCalmingSession(
    String sessionId,
    int? moodAfter, {
    bool completed = true,
  }) async {
    final response = await client.put(
      Uri.parse('$baseUrl/calming/sessions/$sessionId'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'endTime': DateTime.now().toIso8601String(),
        'moodAfter': moodAfter,
        'completed': completed,
      }),
    );

    if (response.statusCode == 200) {
      return CalmingActivitySession.fromJson(json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to complete calming session');
    }
  }

  Future<List<CalmingActivitySession>> getCalmingSessions(String learnerId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/calming/sessions?learnerId=$learnerId'),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body) as List<dynamic>;
      return data.map((item) => CalmingActivitySession.fromJson(item as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load calming sessions');
    }
  }

  // Sensory Preferences

  Future<SensoryProfile> getSensoryProfile(String learnerId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/profile/$learnerId'),
    );

    if (response.statusCode == 200) {
      return SensoryProfile.fromJson(json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to load sensory profile');
    }
  }

  Future<SensoryPreference> updateSensoryPreference(
    String learnerId,
    SensoryPreference preference,
  ) async {
    final response = await client.put(
      Uri.parse('$baseUrl/profile/$learnerId/preferences/${preference.id}'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(preference.toJson()),
    );

    if (response.statusCode == 200) {
      return SensoryPreference.fromJson(json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to update sensory preference');
    }
  }

  Future<void> addFavoriteBreak(String learnerId, String breakId) async {
    final response = await client.post(
      Uri.parse('$baseUrl/profile/$learnerId/favorites/breaks'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'breakId': breakId}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to add favorite break');
    }
  }

  Future<void> removeFavoriteBreak(String learnerId, String breakId) async {
    final response = await client.delete(
      Uri.parse('$baseUrl/profile/$learnerId/favorites/breaks/$breakId'),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to remove favorite break');
    }
  }

  Future<void> addFavoriteActivity(String learnerId, String activityId) async {
    final response = await client.post(
      Uri.parse('$baseUrl/profile/$learnerId/favorites/activities'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'activityId': activityId}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to add favorite activity');
    }
  }

  Future<void> removeFavoriteActivity(String learnerId, String activityId) async {
    final response = await client.delete(
      Uri.parse('$baseUrl/profile/$learnerId/favorites/activities/$activityId'),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to remove favorite activity');
    }
  }

  Future<SensoryProfile> updateSensitivities(
    String learnerId,
    List<String> sensitivities,
  ) async {
    final response = await client.put(
      Uri.parse('$baseUrl/profile/$learnerId/sensitivities'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'sensitivities': sensitivities}),
    );

    if (response.statusCode == 200) {
      return SensoryProfile.fromJson(json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to update sensitivities');
    }
  }
}
