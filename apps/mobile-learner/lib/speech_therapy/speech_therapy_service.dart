/// Speech Therapy Service
///
/// Handles API communication for speech exercises, recordings, and progress tracking.

library;

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

import 'models.dart';

const String _baseUrl = 'http://localhost:8083/api/speech';

class SpeechTherapyService {
  final http.Client _client;

  SpeechTherapyService({http.Client? client}) : _client = client ?? http.Client();

  // Speech Exercises

  Future<List<SpeechExercise>> getExercises({String? targetSound}) async {
    final uri = Uri.parse('$_baseUrl/exercises${targetSound != null ? '?sound=$targetSound' : ''}');
    final response = await _client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> json = jsonDecode(response.body) as List;
      return json.map((e) => SpeechExercise.fromJson(e as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load speech exercises');
    }
  }

  Future<SpeechExercise> getExerciseById(String exerciseId) async {
    final uri = Uri.parse('$_baseUrl/exercises/$exerciseId');
    final response = await _client.get(uri);

    if (response.statusCode == 200) {
      return SpeechExercise.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to load exercise');
    }
  }

  Future<void> completeExercise(String learnerId, String exerciseId, {int? score}) async {
    final uri = Uri.parse('$_baseUrl/exercises/$exerciseId/complete');
    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'learnerId': learnerId,
        'score': score,
        'completedAt': DateTime.now().toIso8601String(),
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to complete exercise');
    }
  }

  // Voice Recordings

  Future<VoiceRecording> saveRecording(
    String learnerId,
    String exerciseId,
    String audioFilePath,
    int durationSeconds, {
    String? targetSound,
  }) async {
    final uri = Uri.parse('$_baseUrl/recordings');
    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'learnerId': learnerId,
        'exerciseId': exerciseId,
        'audioFilePath': audioFilePath,
        'durationSeconds': durationSeconds,
        'targetSound': targetSound,
        'timestamp': DateTime.now().toIso8601String(),
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return VoiceRecording.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to save recording');
    }
  }

  Future<List<VoiceRecording>> getRecordings(String learnerId, {int limit = 20}) async {
    final uri = Uri.parse('$_baseUrl/recordings?learnerId=$learnerId&limit=$limit');
    final response = await _client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> json = jsonDecode(response.body) as List;
      return json.map((e) => VoiceRecording.fromJson(e as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load recordings');
    }
  }

  Future<void> deleteRecording(String recordingId) async {
    final uri = Uri.parse('$_baseUrl/recordings/$recordingId');
    final response = await _client.delete(uri);

    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Failed to delete recording');
    }
  }

  // Articulation Practice

  Future<ArticulationAssessment> submitArticulationAssessment(
    String learnerId,
    String targetSound,
    List<ArticulationAttempt> attempts,
  ) async {
    final uri = Uri.parse('$_baseUrl/articulation/assess');
    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'learnerId': learnerId,
        'targetSound': targetSound,
        'attempts': attempts.map((a) => {
          'word': a.word,
          'position': a.position.name.replaceAll('_', ''),
          'correct': a.correct,
          'confidence': a.confidence,
          'error': a.error,
        }).toList(),
        'timestamp': DateTime.now().toIso8601String(),
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return ArticulationAssessment.fromJson(
        jsonDecode(response.body) as Map<String, dynamic>,
      );
    } else {
      throw Exception('Failed to submit assessment');
    }
  }

  Future<List<TargetSound>> getTargetSounds() async {
    final uri = Uri.parse('$_baseUrl/sounds');
    final response = await _client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> json = jsonDecode(response.body) as List;
      return json.map((e) => TargetSound.fromJson(e as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load target sounds');
    }
  }

  Future<List<PracticeWord>> getPracticeWords(
    String targetSound, {
    WordPosition? position,
  }) async {
    final queryParams = {
      'sound': targetSound,
      if (position != null) 'position': position.name.replaceAll('_', ''),
    };
    final uri = Uri.parse('$_baseUrl/words').replace(queryParameters: queryParams);
    final response = await _client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> json = jsonDecode(response.body) as List;
      return json.map((e) => PracticeWord.fromJson(e as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load practice words');
    }
  }

  // Progress Tracking

  Future<SpeechProgress> getProgress(String learnerId) async {
    final uri = Uri.parse('$_baseUrl/progress/$learnerId');
    final response = await _client.get(uri);

    if (response.statusCode == 200) {
      return SpeechProgress.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to load progress');
    }
  }

  Future<List<ArticulationAssessment>> getAssessmentHistory(
    String learnerId, {
    int limit = 10,
  }) async {
    final uri = Uri.parse('$_baseUrl/articulation/history?learnerId=$learnerId&limit=$limit');
    final response = await _client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> json = jsonDecode(response.body) as List;
      return json.map((e) => ArticulationAssessment.fromJson(e as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to load assessment history');
    }
  }

  void dispose() {
    _client.close();
  }
}
