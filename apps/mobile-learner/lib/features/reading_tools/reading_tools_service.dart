/// Reading tools service for mobile learner app
library;

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'reading_tools_models.dart';

/// Service for reading tools functionality
class ReadingToolsService {
  final String baseUrl;
  final String Function() getAuthToken;
  final String learnerId;

  ReadingToolsService({
    required this.baseUrl,
    required this.getAuthToken,
    required this.learnerId,
  });

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${getAuthToken()}',
      };

  /// Get available TTS voices
  Future<List<TTSVoice>> getVoices() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/reading/tts/voices'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw ReadingToolsException('Failed to load voices');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => TTSVoice.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get TTS settings for learner
  Future<TTSSettings> getTTSSettings() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/reading/tts/settings?learnerId=$learnerId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      // Return default settings if not found
      return TTSSettings(learnerId: learnerId, voiceId: 'default');
    }

    return TTSSettings.fromJson(json.decode(response.body));
  }

  /// Update TTS settings
  Future<void> updateTTSSettings(TTSSettings settings) async {
    await http.put(
      Uri.parse('$baseUrl/api/reading/tts/settings'),
      headers: _headers,
      body: json.encode(settings.toJson()),
    );
  }

  /// Save a reading session
  Future<void> saveReadingSession({
    required String text,
    required int duration,
    required int wordsRead,
    required int pauseCount,
  }) async {
    await http.post(
      Uri.parse('$baseUrl/api/reading/sessions'),
      headers: _headers,
      body: json.encode({
        'learnerId': learnerId,
        'text': text,
        'duration': duration,
        'wordsRead': wordsRead,
        'pauseCount': pauseCount,
        'timestamp': DateTime.now().toIso8601String(),
      }),
    );
  }

  /// Get vocabulary words for learner
  Future<List<VocabularyWord>> getVocabularyWords({int limit = 50}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/reading/vocabulary?learnerId=$learnerId&limit=$limit'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      return [];
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => VocabularyWord.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Add a word to vocabulary
  Future<VocabularyWord> addVocabularyWord({
    required String word,
    required String definition,
    String? example,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/reading/vocabulary'),
      headers: _headers,
      body: json.encode({
        'learnerId': learnerId,
        'word': word,
        'definition': definition,
        'example': example,
      }),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw ReadingToolsException('Failed to add word');
    }

    return VocabularyWord.fromJson(json.decode(response.body));
  }

  /// Update vocabulary word mastery
  Future<void> updateWordMastery(String wordId, int masteryLevel) async {
    await http.put(
      Uri.parse('$baseUrl/api/reading/vocabulary/$wordId/mastery'),
      headers: _headers,
      body: json.encode({
        'learnerId': learnerId,
        'masteryLevel': masteryLevel,
      }),
    );
  }

  /// Get word predictions based on context
  Future<List<WordPrediction>> getWordPredictions(String context) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/reading/predict'),
      headers: _headers,
      body: json.encode({
        'learnerId': learnerId,
        'context': context,
      }),
    );

    if (response.statusCode != 200) {
      return [];
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => WordPrediction.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Generate comprehension questions for text
  Future<List<ComprehensionQuestion>> generateComprehensionQuestions(String text) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/reading/comprehension/generate'),
      headers: _headers,
      body: json.encode({
        'learnerId': learnerId,
        'text': text,
      }),
    );

    if (response.statusCode != 200) {
      throw ReadingToolsException('Failed to generate questions');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => ComprehensionQuestion.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Look up word definition
  Future<Map<String, dynamic>> lookupWord(String word) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/reading/dictionary?word=${Uri.encodeComponent(word)}'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw ReadingToolsException('Word not found');
    }

    return json.decode(response.body) as Map<String, dynamic>;
  }
}

/// Reading tools exception
class ReadingToolsException implements Exception {
  final String message;
  ReadingToolsException(this.message);

  @override
  String toString() => 'ReadingToolsException: $message';
}
