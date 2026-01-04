/// Writing service for writing assistance
library;

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'writing_models.dart';

/// Service for writing assistance features
class WritingService {
  final String baseUrl;
  final String Function() getAuthToken;
  final String studentId;

  WritingService({
    required this.baseUrl,
    required this.getAuthToken,
    required this.studentId,
  });

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${getAuthToken()}',
  };

  /// Get writing prompts
  Future<List<WritingPrompt>> getPrompts({
    WritingTaskType? type,
    WritingLevel? level,
    String? subject,
  }) async {
    var url = '$baseUrl/api/writing/prompts?studentId=$studentId';
    if (type != null) url += '&type=${type.name}';
    if (level != null) url += '&level=${level.name}';
    if (subject != null) url += '&subject=$subject';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw WritingException('Failed to load prompts');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => WritingPrompt.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Start a writing session
  Future<WritingSession> startSession(String promptId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/writing/sessions'),
      headers: _headers,
      body: json.encode({
        'studentId': studentId,
        'promptId': promptId,
      }),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw WritingException('Failed to start writing session');
    }

    final data = json.decode(response.body);
    return WritingSession(
      id: data['id'] as String,
      promptId: promptId,
      studentId: studentId,
      startedAt: DateTime.now(),
      metrics: const WritingMetrics(),
    );
  }

  /// Save writing progress
  Future<void> saveProgress(WritingSession session) async {
    await http.put(
      Uri.parse('$baseUrl/api/writing/sessions/${session.id}'),
      headers: _headers,
      body: json.encode(session.toJson()),
    );
  }

  /// Submit writing for feedback
  Future<WritingFeedback> submitWriting(WritingSession session) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/writing/sessions/${session.id}/submit'),
      headers: _headers,
      body: json.encode(session.toJson()),
    );

    if (response.statusCode != 200) {
      throw WritingException('Failed to submit writing');
    }

    return WritingFeedback.fromJson(json.decode(response.body));
  }

  /// Get AI writing suggestions
  Future<List<WritingSuggestion>> getSuggestions(String text, {
    WritingLevel? level,
    List<SuggestionType>? types,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/writing/suggestions'),
      headers: _headers,
      body: json.encode({
        'text': text,
        'studentId': studentId,
        if (level != null) 'level': level.name,
        if (types != null) 'types': types.map((t) => t.name).toList(),
      }),
    );

    if (response.statusCode != 200) {
      throw WritingException('Failed to get suggestions');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => WritingSuggestion.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get word bank for vocabulary practice
  Future<List<WordBankItem>> getWordBank({
    required String gradeLevel,
    String? category,
    int count = 10,
  }) async {
    var url = '$baseUrl/api/writing/wordbank?gradeLevel=$gradeLevel&count=$count';
    if (category != null) url += '&category=$category';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw WritingException('Failed to load word bank');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => WordBankItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get sentence starters
  Future<List<String>> getSentenceStarters({
    required WritingTaskType type,
    required WritingLevel level,
  }) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/writing/starters?type=${type.name}&level=${level.name}'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      return _getDefaultStarters(type);
    }

    return List<String>.from(json.decode(response.body));
  }

  /// Get writing history
  Future<List<WritingSession>> getHistory({int limit = 20}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/writing/sessions?studentId=$studentId&limit=$limit'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw WritingException('Failed to load writing history');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) {
      return WritingSession(
        id: e['id'] as String,
        promptId: e['promptId'] as String,
        studentId: studentId,
        content: e['content'] as String? ?? '',
        startedAt: DateTime.parse(e['startedAt'] as String),
        submittedAt: e['submittedAt'] != null
            ? DateTime.parse(e['submittedAt'] as String)
            : null,
        metrics: WritingMetrics(
          wordCount: e['wordCount'] as int? ?? 0,
        ),
      );
    }).toList();
  }

  List<String> _getDefaultStarters(WritingTaskType type) {
    switch (type) {
      case WritingTaskType.story:
        return [
          'Once upon a time...',
          'In a faraway land...',
          'Long ago...',
          'One sunny day...',
          'It all started when...',
        ];
      case WritingTaskType.essay:
        return [
          'In my opinion...',
          'I believe that...',
          'There are many reasons why...',
          'First, I want to explain...',
          'The main idea is...',
        ];
      case WritingTaskType.letter:
        return [
          'Dear...',
          'I am writing to tell you about...',
          'I hope this letter finds you well.',
          'Thank you for...',
        ];
      case WritingTaskType.journal:
        return [
          'Today I...',
          'I felt...',
          'Something interesting happened...',
          'I learned that...',
        ];
      default:
        return [
          'I think...',
          'In my experience...',
          'One important thing is...',
          'I want to share...',
        ];
    }
  }

  /// Analyze text metrics
  WritingMetrics analyzeText(String text) {
    if (text.isEmpty) {
      return const WritingMetrics();
    }

    final words = text.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
    final sentences = text.split(RegExp(r'[.!?]+')).where((s) => s.trim().isNotEmpty).toList();
    final paragraphs = text.split(RegExp(r'\n\s*\n')).where((p) => p.trim().isNotEmpty).toList();

    final wordCount = words.length;
    final sentenceCount = sentences.length;
    final paragraphCount = paragraphs.length;

    final totalWordLength = words.fold(0, (sum, word) => sum + word.length);
    final averageWordLength = wordCount > 0 ? totalWordLength / wordCount : 0.0;
    final averageSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0.0;

    final uniqueWords = words.map((w) => w.toLowerCase()).toSet().length;

    return WritingMetrics(
      wordCount: wordCount,
      sentenceCount: sentenceCount,
      paragraphCount: paragraphCount,
      averageWordLength: averageWordLength,
      averageSentenceLength: averageSentenceLength,
      uniqueWords: uniqueWords,
    );
  }
}

/// Writing exception
class WritingException implements Exception {
  final String message;
  WritingException(this.message);

  @override
  String toString() => 'WritingException: $message';
}
