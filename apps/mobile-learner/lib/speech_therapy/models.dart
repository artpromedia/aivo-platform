/// Speech Therapy Models
///
/// Data models for speech exercises, articulation practice,
/// voice recordings, and progress tracking.

library;

import 'package:flutter_common/speech/speech_models.dart';

export 'package:flutter_common/speech/speech_models.dart';

/// Speech exercise session
class SpeechExercise {
  final String id;
  final String title;
  final String description;
  final PracticeType practiceType;
  final TargetSound targetSound;
  final List<String> instructions;
  final List<PracticeWord> words;
  final int durationMinutes;
  final String? videoUrl;
  final String? imageUrl;
  final int difficulty; // 1-5

  const SpeechExercise({
    required this.id,
    required this.title,
    required this.description,
    required this.practiceType,
    required this.targetSound,
    required this.instructions,
    required this.words,
    required this.durationMinutes,
    this.videoUrl,
    this.imageUrl,
    this.difficulty = 1,
  });

  factory SpeechExercise.fromJson(Map<String, dynamic> json) {
    return SpeechExercise(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      practiceType: PracticeType.values.firstWhere(
        (e) => e.name == json['practiceType'],
        orElse: () => PracticeType.word,
      ),
      targetSound: TargetSound.fromJson(json['targetSound'] as Map<String, dynamic>),
      instructions: List<String>.from(json['instructions'] as List? ?? []),
      words: (json['words'] as List?)
              ?.map((w) => PracticeWord.fromJson(w as Map<String, dynamic>))
              .toList() ??
          [],
      durationMinutes: json['durationMinutes'] as int? ?? 10,
      videoUrl: json['videoUrl'] as String?,
      imageUrl: json['imageUrl'] as String?,
      difficulty: json['difficulty'] as int? ?? 1,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'practiceType': practiceType.name,
      'targetSound': {
        'id': targetSound.id,
        'sound': targetSound.sound,
        'phoneme': targetSound.phoneme,
        'category': targetSound.category.name,
      },
      'instructions': instructions,
      'durationMinutes': durationMinutes,
      'videoUrl': videoUrl,
      'imageUrl': imageUrl,
      'difficulty': difficulty,
    };
  }
}

/// Voice recording data
class VoiceRecording {
  final String id;
  final String learnerId;
  final String exerciseId;
  final String? targetSound;
  final DateTime timestamp;
  final String audioFilePath;
  final int durationSeconds;
  final double? accuracy;
  final String? feedback;
  final List<String>? errors;

  const VoiceRecording({
    required this.id,
    required this.learnerId,
    required this.exerciseId,
    this.targetSound,
    required this.timestamp,
    required this.audioFilePath,
    required this.durationSeconds,
    this.accuracy,
    this.feedback,
    this.errors,
  });

  factory VoiceRecording.fromJson(Map<String, dynamic> json) {
    return VoiceRecording(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      exerciseId: json['exerciseId'] as String,
      targetSound: json['targetSound'] as String?,
      timestamp: DateTime.parse(json['timestamp'] as String),
      audioFilePath: json['audioFilePath'] as String,
      durationSeconds: json['durationSeconds'] as int,
      accuracy: json['accuracy'] as double?,
      feedback: json['feedback'] as String?,
      errors: (json['errors'] as List?)?.cast<String>(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'learnerId': learnerId,
      'exerciseId': exerciseId,
      'targetSound': targetSound,
      'timestamp': timestamp.toIso8601String(),
      'audioFilePath': audioFilePath,
      'durationSeconds': durationSeconds,
      'accuracy': accuracy,
      'feedback': feedback,
      'errors': errors,
    };
  }
}

/// Speech progress data
class SpeechProgress {
  final String learnerId;
  final int totalExercises;
  final int exercisesCompleted;
  final int totalRecordings;
  final int practiceMinutes;
  final Map<String, SoundProgress> soundProgress;
  final List<DateTime> practiceStreak;
  final int currentStreakDays;
  final int longestStreakDays;
  final double overallAccuracy;

  const SpeechProgress({
    required this.learnerId,
    required this.totalExercises,
    required this.exercisesCompleted,
    required this.totalRecordings,
    required this.practiceMinutes,
    required this.soundProgress,
    required this.practiceStreak,
    required this.currentStreakDays,
    required this.longestStreakDays,
    required this.overallAccuracy,
  });

  factory SpeechProgress.fromJson(Map<String, dynamic> json) {
    return SpeechProgress(
      learnerId: json['learnerId'] as String,
      totalExercises: json['totalExercises'] as int,
      exercisesCompleted: json['exercisesCompleted'] as int,
      totalRecordings: json['totalRecordings'] as int,
      practiceMinutes: json['practiceMinutes'] as int,
      soundProgress: (json['soundProgress'] as Map<String, dynamic>?)?.map(
            (key, value) => MapEntry(
              key,
              SoundProgress.fromJson(value as Map<String, dynamic>),
            ),
          ) ??
          {},
      practiceStreak: (json['practiceStreak'] as List?)
              ?.map((d) => DateTime.parse(d as String))
              .toList() ??
          [],
      currentStreakDays: json['currentStreakDays'] as int? ?? 0,
      longestStreakDays: json['longestStreakDays'] as int? ?? 0,
      overallAccuracy: (json['overallAccuracy'] as num?)?.toDouble() ?? 0.0,
    );
  }

  double get completionRate =>
      totalExercises > 0 ? (exercisesCompleted / totalExercises) * 100 : 0.0;
}

/// Progress for a specific sound
class SoundProgress {
  final String sound;
  final int attempts;
  final int successful;
  final double averageAccuracy;
  final DateTime lastPracticed;
  final PracticeType currentLevel;

  const SoundProgress({
    required this.sound,
    required this.attempts,
    required this.successful,
    required this.averageAccuracy,
    required this.lastPracticed,
    required this.currentLevel,
  });

  factory SoundProgress.fromJson(Map<String, dynamic> json) {
    return SoundProgress(
      sound: json['sound'] as String,
      attempts: json['attempts'] as int,
      successful: json['successful'] as int,
      averageAccuracy: (json['averageAccuracy'] as num).toDouble(),
      lastPracticed: DateTime.parse(json['lastPracticed'] as String),
      currentLevel: PracticeType.values.firstWhere(
        (e) => e.name == json['currentLevel'],
        orElse: () => PracticeType.isolation,
      ),
    );
  }

  double get successRate => attempts > 0 ? (successful / attempts) * 100 : 0.0;
}

/// Articulation assessment result
class ArticulationAssessment {
  final String id;
  final String learnerId;
  final DateTime timestamp;
  final String targetSound;
  final List<ArticulationAttempt> attempts;
  final double overallAccuracy;
  final List<String> strengths;
  final List<String> areasForImprovement;
  final String? recommendations;

  const ArticulationAssessment({
    required this.id,
    required this.learnerId,
    required this.timestamp,
    required this.targetSound,
    required this.attempts,
    required this.overallAccuracy,
    required this.strengths,
    required this.areasForImprovement,
    this.recommendations,
  });

  factory ArticulationAssessment.fromJson(Map<String, dynamic> json) {
    return ArticulationAssessment(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      targetSound: json['targetSound'] as String,
      attempts: (json['attempts'] as List)
          .map((a) => ArticulationAttempt.fromJson(a as Map<String, dynamic>))
          .toList(),
      overallAccuracy: (json['overallAccuracy'] as num).toDouble(),
      strengths: List<String>.from(json['strengths'] as List? ?? []),
      areasForImprovement:
          List<String>.from(json['areasForImprovement'] as List? ?? []),
      recommendations: json['recommendations'] as String?,
    );
  }
}

/// Single articulation attempt
class ArticulationAttempt {
  final String word;
  final WordPosition position;
  final bool correct;
  final double confidence;
  final String? error;

  const ArticulationAttempt({
    required this.word,
    required this.position,
    required this.correct,
    required this.confidence,
    this.error,
  });

  factory ArticulationAttempt.fromJson(Map<String, dynamic> json) {
    return ArticulationAttempt(
      word: json['word'] as String,
      position: WordPosition.values.firstWhere(
        (e) => e.name == json['position'] || e.name == '${json['position']}_',
        orElse: () => WordPosition.initial,
      ),
      correct: json['correct'] as bool,
      confidence: (json['confidence'] as num).toDouble(),
      error: json['error'] as String?,
    );
  }
}
