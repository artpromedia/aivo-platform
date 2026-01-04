/// Speech therapy service
library;

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'speech_models.dart';

/// Service for speech therapy features
class SpeechService {
  final String baseUrl;
  final String Function() getAuthToken;
  final String studentId;

  SpeechService({
    required this.baseUrl,
    required this.getAuthToken,
    required this.studentId,
  });

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${getAuthToken()}',
  };

  /// Get student's speech goals
  Future<List<SpeechGoal>> getGoals({bool activeOnly = true}) async {
    var url = '$baseUrl/api/speech/goals?studentId=$studentId';
    if (activeOnly) url += '&activeOnly=true';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw SpeechException('Failed to load goals');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => SpeechGoal.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get target sounds for a category
  Future<List<TargetSound>> getTargetSounds({SoundCategory? category}) async {
    var url = '$baseUrl/api/speech/sounds';
    if (category != null) url += '?category=${category.name}';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw SpeechException('Failed to load target sounds');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => TargetSound.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get practice words for a sound
  Future<List<PracticeWord>> getPracticeWords({
    required String soundId,
    WordPosition? position,
    int count = 10,
  }) async {
    var url = '$baseUrl/api/speech/words?soundId=$soundId&count=$count';
    if (position != null) url += '&position=${position.name}';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw SpeechException('Failed to load practice words');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => PracticeWord.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get practice sentences for a sound
  Future<List<PracticeSentence>> getPracticeSentences({
    required String soundId,
    int count = 5,
  }) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/speech/sentences?soundId=$soundId&count=$count'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw SpeechException('Failed to load practice sentences');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => PracticeSentence.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Start a practice session
  Future<SpeechPracticeSession> startSession({
    required String goalId,
    required TargetSound targetSound,
    required PracticeType practiceType,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/speech/sessions'),
      headers: _headers,
      body: json.encode({
        'studentId': studentId,
        'goalId': goalId,
        'targetSoundId': targetSound.id,
        'practiceType': practiceType.name,
      }),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw SpeechException('Failed to start session');
    }

    final data = json.decode(response.body);
    return SpeechPracticeSession(
      id: data['id'] as String,
      studentId: studentId,
      goalId: goalId,
      targetSound: targetSound,
      practiceType: practiceType,
      startedAt: DateTime.now(),
    );
  }

  /// Upload audio recording for analysis
  Future<SpeechAnalysisResult> analyzeRecording({
    required String sessionId,
    required String itemId,
    required String targetSound,
    required String targetWord,
    required File audioFile,
  }) async {
    final uri = Uri.parse('$baseUrl/api/speech/analyze');
    final request = http.MultipartRequest('POST', uri);

    request.headers.addAll({
      'Authorization': 'Bearer ${getAuthToken()}',
    });

    request.fields['sessionId'] = sessionId;
    request.fields['itemId'] = itemId;
    request.fields['targetSound'] = targetSound;
    request.fields['targetWord'] = targetWord;
    request.fields['studentId'] = studentId;

    request.files.add(await http.MultipartFile.fromPath(
      'audio',
      audioFile.path,
    ));

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode != 200) {
      throw SpeechException('Failed to analyze recording');
    }

    return SpeechAnalysisResult.fromJson(json.decode(response.body));
  }

  /// Submit practice attempt
  Future<void> submitAttempt({
    required String sessionId,
    required PracticeAttempt attempt,
  }) async {
    await http.post(
      Uri.parse('$baseUrl/api/speech/sessions/$sessionId/attempts'),
      headers: _headers,
      body: json.encode(attempt.toJson()),
    );
  }

  /// Complete practice session
  Future<SessionResult> completeSession(SpeechPracticeSession session) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/speech/sessions/${session.id}/complete'),
      headers: _headers,
      body: json.encode(session.toJson()),
    );

    if (response.statusCode != 200) {
      throw SpeechException('Failed to complete session');
    }

    return SessionResult.fromJson(json.decode(response.body));
  }

  /// Get home practice assignments
  Future<List<HomePractice>> getHomePractice({bool pendingOnly = true}) async {
    var url = '$baseUrl/api/speech/home-practice?studentId=$studentId';
    if (pendingOnly) url += '&pendingOnly=true';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw SpeechException('Failed to load home practice');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => HomePractice.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Update home practice progress
  Future<void> updateHomePracticeProgress({
    required String homePracticeId,
    required int completedRepetitions,
    List<PracticeAttempt>? attempts,
  }) async {
    await http.put(
      Uri.parse('$baseUrl/api/speech/home-practice/$homePracticeId'),
      headers: _headers,
      body: json.encode({
        'completedRepetitions': completedRepetitions,
        'attempts': attempts?.map((a) => a.toJson()).toList(),
      }),
    );
  }

  /// Get session history
  Future<List<SessionSummary>> getSessionHistory({int limit = 20}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/speech/sessions?studentId=$studentId&limit=$limit'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw SpeechException('Failed to load session history');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => SessionSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get progress report
  Future<SpeechProgressReport> getProgressReport({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    var url = '$baseUrl/api/speech/progress?studentId=$studentId';
    if (startDate != null) url += '&startDate=${startDate.toIso8601String()}';
    if (endDate != null) url += '&endDate=${endDate.toIso8601String()}';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw SpeechException('Failed to load progress report');
    }

    return SpeechProgressReport.fromJson(json.decode(response.body));
  }
}

/// Session completion result
class SessionResult {
  final int totalAttempts;
  final int correctAttempts;
  final double accuracy;
  final int pointsEarned;
  final bool levelUnlocked;
  final PracticeType? newLevel;
  final List<String> badges;

  const SessionResult({
    required this.totalAttempts,
    required this.correctAttempts,
    required this.accuracy,
    this.pointsEarned = 0,
    this.levelUnlocked = false,
    this.newLevel,
    this.badges = const [],
  });

  factory SessionResult.fromJson(Map<String, dynamic> json) {
    return SessionResult(
      totalAttempts: json['totalAttempts'] as int,
      correctAttempts: json['correctAttempts'] as int,
      accuracy: (json['accuracy'] as num).toDouble(),
      pointsEarned: json['pointsEarned'] as int? ?? 0,
      levelUnlocked: json['levelUnlocked'] as bool? ?? false,
      newLevel: json['newLevel'] != null
          ? PracticeType.values.firstWhere(
              (e) => e.name == json['newLevel'],
              orElse: () => PracticeType.isolation,
            )
          : null,
      badges: List<String>.from(json['badges'] as List? ?? []),
    );
  }
}

/// Session summary for history
class SessionSummary {
  final String id;
  final String soundId;
  final String soundName;
  final PracticeType practiceType;
  final double accuracy;
  final int totalAttempts;
  final DateTime completedAt;

  const SessionSummary({
    required this.id,
    required this.soundId,
    required this.soundName,
    required this.practiceType,
    required this.accuracy,
    required this.totalAttempts,
    required this.completedAt,
  });

  factory SessionSummary.fromJson(Map<String, dynamic> json) {
    return SessionSummary(
      id: json['id'] as String,
      soundId: json['soundId'] as String,
      soundName: json['soundName'] as String,
      practiceType: PracticeType.values.firstWhere(
        (e) => e.name == json['practiceType'],
        orElse: () => PracticeType.isolation,
      ),
      accuracy: (json['accuracy'] as num).toDouble(),
      totalAttempts: json['totalAttempts'] as int,
      completedAt: DateTime.parse(json['completedAt'] as String),
    );
  }
}

/// Speech progress report
class SpeechProgressReport {
  final int totalSessions;
  final int totalAttempts;
  final double overallAccuracy;
  final Map<String, double> accuracyBySound;
  final Map<String, double> accuracyByLevel;
  final List<String> masteredSounds;
  final List<String> inProgressSounds;
  final int streakDays;

  const SpeechProgressReport({
    required this.totalSessions,
    required this.totalAttempts,
    required this.overallAccuracy,
    this.accuracyBySound = const {},
    this.accuracyByLevel = const {},
    this.masteredSounds = const [],
    this.inProgressSounds = const [],
    this.streakDays = 0,
  });

  factory SpeechProgressReport.fromJson(Map<String, dynamic> json) {
    return SpeechProgressReport(
      totalSessions: json['totalSessions'] as int,
      totalAttempts: json['totalAttempts'] as int,
      overallAccuracy: (json['overallAccuracy'] as num).toDouble(),
      accuracyBySound: Map<String, double>.from(
        (json['accuracyBySound'] as Map? ?? {}).map(
          (k, v) => MapEntry(k as String, (v as num).toDouble()),
        ),
      ),
      accuracyByLevel: Map<String, double>.from(
        (json['accuracyByLevel'] as Map? ?? {}).map(
          (k, v) => MapEntry(k as String, (v as num).toDouble()),
        ),
      ),
      masteredSounds: List<String>.from(json['masteredSounds'] as List? ?? []),
      inProgressSounds: List<String>.from(json['inProgressSounds'] as List? ?? []),
      streakDays: json['streakDays'] as int? ?? 0,
    );
  }
}

/// Speech exception
class SpeechException implements Exception {
  final String message;
  SpeechException(this.message);

  @override
  String toString() => 'SpeechException: $message';
}
