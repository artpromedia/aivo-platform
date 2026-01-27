/// SEL (Social-Emotional Learning) Models
///
/// Data models for mood check-ins, coping strategies, mindfulness exercises,
/// social scenarios, and feelings journal.
library;

import 'package:flutter/material.dart';

// ============================================================================
// MOOD & EMOTIONS
// ============================================================================

/// Mood types for check-ins
enum Mood {
  happy,
  sad,
  angry,
  worried,
  calm,
  excited,
  frustrated,
  tired;

  String get label {
    switch (this) {
      case Mood.happy:
        return 'Happy';
      case Mood.sad:
        return 'Sad';
      case Mood.angry:
        return 'Angry';
      case Mood.worried:
        return 'Worried';
      case Mood.calm:
        return 'Calm';
      case Mood.excited:
        return 'Excited';
      case Mood.frustrated:
        return 'Frustrated';
      case Mood.tired:
        return 'Tired';
    }
  }

  String get emoji {
    switch (this) {
      case Mood.happy:
        return '😊';
      case Mood.sad:
        return '😢';
      case Mood.angry:
        return '😠';
      case Mood.worried:
        return '😰';
      case Mood.calm:
        return '😌';
      case Mood.excited:
        return '🤩';
      case Mood.frustrated:
        return '😤';
      case Mood.tired:
        return '😴';
    }
  }

  Color get color {
    switch (this) {
      case Mood.happy:
        return const Color(0xFFFEF3C7);
      case Mood.sad:
        return const Color(0xFFDBEAFE);
      case Mood.angry:
        return const Color(0xFFFEE2E2);
      case Mood.worried:
        return const Color(0xFFFFEDD5);
      case Mood.calm:
        return const Color(0xFFDCFCE7);
      case Mood.excited:
        return const Color(0xFFF3E8FF);
      case Mood.frustrated:
        return const Color(0xFFFFE4E6);
      case Mood.tired:
        return const Color(0xFFF1F5F9);
    }
  }

  Color get textColor {
    switch (this) {
      case Mood.happy:
        return const Color(0xFF92400E);
      case Mood.sad:
        return const Color(0xFF1E40AF);
      case Mood.angry:
        return const Color(0xFF991B1B);
      case Mood.worried:
        return const Color(0xFFC2410C);
      case Mood.calm:
        return const Color(0xFF166534);
      case Mood.excited:
        return const Color(0xFF7C3AED);
      case Mood.frustrated:
        return const Color(0xFFBE123C);
      case Mood.tired:
        return const Color(0xFF475569);
    }
  }
}

/// Mood check-in model
class MoodCheckIn {
  final String id;
  final String learnerId;
  final DateTime timestamp;
  final Mood mood;
  final int intensity; // 1-5
  final List<String>? triggers;
  final String? notes;
  final List<String>? copingStrategiesUsed;

  const MoodCheckIn({
    required this.id,
    required this.learnerId,
    required this.timestamp,
    required this.mood,
    required this.intensity,
    this.triggers,
    this.notes,
    this.copingStrategiesUsed,
  });

  factory MoodCheckIn.fromJson(Map<String, dynamic> json) {
    return MoodCheckIn(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      mood: Mood.values.byName(json['mood'] as String),
      intensity: json['intensity'] as int,
      triggers: (json['triggers'] as List<dynamic>?)?.cast<String>(),
      notes: json['notes'] as String?,
      copingStrategiesUsed:
          (json['copingStrategiesUsed'] as List<dynamic>?)?.cast<String>(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'learnerId': learnerId,
        'timestamp': timestamp.toIso8601String(),
        'mood': mood.name,
        'intensity': intensity,
        if (triggers != null) 'triggers': triggers,
        if (notes != null) 'notes': notes,
        if (copingStrategiesUsed != null)
          'copingStrategiesUsed': copingStrategiesUsed,
      };
}

// ============================================================================
// COPING STRATEGIES
// ============================================================================

/// Coping strategy categories
enum CopingCategory {
  breathing,
  grounding,
  movement,
  creative,
  social,
  cognitive;

  String get label {
    switch (this) {
      case CopingCategory.breathing:
        return 'Breathing';
      case CopingCategory.grounding:
        return 'Grounding';
      case CopingCategory.movement:
        return 'Movement';
      case CopingCategory.creative:
        return 'Creative';
      case CopingCategory.social:
        return 'Social';
      case CopingCategory.cognitive:
        return 'Cognitive';
    }
  }

  String get icon {
    switch (this) {
      case CopingCategory.breathing:
        return '🌬️';
      case CopingCategory.grounding:
        return '🌿';
      case CopingCategory.movement:
        return '🏃';
      case CopingCategory.creative:
        return '🎨';
      case CopingCategory.social:
        return '👥';
      case CopingCategory.cognitive:
        return '🧠';
    }
  }

  Color get color {
    switch (this) {
      case CopingCategory.breathing:
        return const Color(0xFF06B6D4);
      case CopingCategory.grounding:
        return const Color(0xFF22C55E);
      case CopingCategory.movement:
        return const Color(0xFFF97316);
      case CopingCategory.creative:
        return const Color(0xFFEC4899);
      case CopingCategory.social:
        return const Color(0xFF8B5CF6);
      case CopingCategory.cognitive:
        return const Color(0xFF3B82F6);
    }
  }
}

/// Coping strategy difficulty
enum Difficulty {
  beginner,
  intermediate,
  advanced;

  String get label {
    switch (this) {
      case Difficulty.beginner:
        return 'Beginner';
      case Difficulty.intermediate:
        return 'Intermediate';
      case Difficulty.advanced:
        return 'Advanced';
    }
  }
}

/// Coping strategy model
class CopingStrategy {
  final String id;
  final String name;
  final CopingCategory category;
  final String description;
  final List<String> steps;
  final int duration; // in minutes
  final Difficulty difficulty;
  final List<String> tags;
  final String? imageUrl;
  final String? audioUrl;
  final bool isFavorite;

  const CopingStrategy({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.steps,
    required this.duration,
    required this.difficulty,
    required this.tags,
    this.imageUrl,
    this.audioUrl,
    this.isFavorite = false,
  });

  factory CopingStrategy.fromJson(Map<String, dynamic> json) {
    return CopingStrategy(
      id: json['id'] as String,
      name: json['name'] as String,
      category: CopingCategory.values.byName(json['category'] as String),
      description: json['description'] as String,
      steps: (json['steps'] as List<dynamic>).cast<String>(),
      duration: json['duration'] as int,
      difficulty: Difficulty.values.byName(json['difficulty'] as String),
      tags: (json['tags'] as List<dynamic>).cast<String>(),
      imageUrl: json['imageUrl'] as String?,
      audioUrl: json['audioUrl'] as String?,
      isFavorite: json['isFavorite'] as bool? ?? false,
    );
  }

  CopingStrategy copyWith({bool? isFavorite}) {
    return CopingStrategy(
      id: id,
      name: name,
      category: category,
      description: description,
      steps: steps,
      duration: duration,
      difficulty: difficulty,
      tags: tags,
      imageUrl: imageUrl,
      audioUrl: audioUrl,
      isFavorite: isFavorite ?? this.isFavorite,
    );
  }
}

// ============================================================================
// MINDFULNESS EXERCISES
// ============================================================================

/// Mindfulness exercise types
enum MindfulnessType {
  breathing,
  meditation,
  bodyScan,
  visualization;

  String get label {
    switch (this) {
      case MindfulnessType.breathing:
        return 'Breathing';
      case MindfulnessType.meditation:
        return 'Meditation';
      case MindfulnessType.bodyScan:
        return 'Body Scan';
      case MindfulnessType.visualization:
        return 'Visualization';
    }
  }

  String get icon {
    switch (this) {
      case MindfulnessType.breathing:
        return '🌬️';
      case MindfulnessType.meditation:
        return '🧘';
      case MindfulnessType.bodyScan:
        return '🫀';
      case MindfulnessType.visualization:
        return '🌈';
    }
  }
}

/// Mindfulness exercise model
class MindfulnessExercise {
  final String id;
  final String name;
  final MindfulnessType type;
  final String description;
  final int duration; // in seconds
  final List<String> instructions;
  final String? audioUrl;
  final BreathingPattern? breathingPattern;

  const MindfulnessExercise({
    required this.id,
    required this.name,
    required this.type,
    required this.description,
    required this.duration,
    required this.instructions,
    this.audioUrl,
    this.breathingPattern,
  });

  factory MindfulnessExercise.fromJson(Map<String, dynamic> json) {
    return MindfulnessExercise(
      id: json['id'] as String,
      name: json['name'] as String,
      type: MindfulnessType.values.byName(json['type'] as String),
      description: json['description'] as String,
      duration: json['duration'] as int,
      instructions: (json['instructions'] as List<dynamic>).cast<String>(),
      audioUrl: json['audioUrl'] as String?,
      breathingPattern: json['breathingPattern'] != null
          ? BreathingPattern.fromJson(
              json['breathingPattern'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// Breathing pattern for guided breathing
class BreathingPattern {
  final int inhaleSeconds;
  final int holdSeconds;
  final int exhaleSeconds;
  final int pauseSeconds;
  final int cycles;

  const BreathingPattern({
    required this.inhaleSeconds,
    this.holdSeconds = 0,
    required this.exhaleSeconds,
    this.pauseSeconds = 0,
    required this.cycles,
  });

  factory BreathingPattern.fromJson(Map<String, dynamic> json) {
    return BreathingPattern(
      inhaleSeconds: json['inhaleSeconds'] as int,
      holdSeconds: json['holdSeconds'] as int? ?? 0,
      exhaleSeconds: json['exhaleSeconds'] as int,
      pauseSeconds: json['pauseSeconds'] as int? ?? 0,
      cycles: json['cycles'] as int,
    );
  }

  int get totalDuration =>
      (inhaleSeconds + holdSeconds + exhaleSeconds + pauseSeconds) * cycles;
}

// ============================================================================
// SOCIAL SCENARIOS
// ============================================================================

/// Social scenario model
class SocialScenario {
  final String id;
  final String title;
  final String description;
  final String category;
  final String imageUrl;
  final List<ScenarioChoice> choices;
  final String? feedback;

  const SocialScenario({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.imageUrl,
    required this.choices,
    this.feedback,
  });

  factory SocialScenario.fromJson(Map<String, dynamic> json) {
    return SocialScenario(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      category: json['category'] as String,
      imageUrl: json['imageUrl'] as String? ?? '',
      choices: (json['choices'] as List<dynamic>)
          .map((c) => ScenarioChoice.fromJson(c as Map<String, dynamic>))
          .toList(),
      feedback: json['feedback'] as String?,
    );
  }
}

/// Choice option for social scenarios
class ScenarioChoice {
  final String id;
  final String text;
  final bool isCorrect;
  final String feedback;

  const ScenarioChoice({
    required this.id,
    required this.text,
    required this.isCorrect,
    required this.feedback,
  });

  factory ScenarioChoice.fromJson(Map<String, dynamic> json) {
    return ScenarioChoice(
      id: json['id'] as String,
      text: json['text'] as String,
      isCorrect: json['isCorrect'] as bool,
      feedback: json['feedback'] as String,
    );
  }
}

// ============================================================================
// FEELINGS JOURNAL
// ============================================================================

/// Journal entry model
class JournalEntry {
  final String id;
  final String learnerId;
  final DateTime timestamp;
  final String content;
  final Mood? mood;
  final List<String> tags;

  const JournalEntry({
    required this.id,
    required this.learnerId,
    required this.timestamp,
    required this.content,
    this.mood,
    this.tags = const [],
  });

  factory JournalEntry.fromJson(Map<String, dynamic> json) {
    return JournalEntry(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      content: json['content'] as String,
      mood: json['mood'] != null ? Mood.values.byName(json['mood'] as String) : null,
      tags: (json['tags'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'learnerId': learnerId,
        'timestamp': timestamp.toIso8601String(),
        'content': content,
        if (mood != null) 'mood': mood!.name,
        'tags': tags,
      };
}

// ============================================================================
// PROGRESS
// ============================================================================

/// SEL progress model
class SELProgress {
  final String learnerId;
  final int totalCheckIns;
  final int currentStreak;
  final int longestStreak;
  final List<MoodTrend> moodTrends;
  final int strategiesLearned;
  final int exercisesCompleted;
  final int scenariosCompleted;
  final int journalEntries;

  const SELProgress({
    required this.learnerId,
    required this.totalCheckIns,
    required this.currentStreak,
    required this.longestStreak,
    required this.moodTrends,
    required this.strategiesLearned,
    required this.exercisesCompleted,
    required this.scenariosCompleted,
    required this.journalEntries,
  });

  factory SELProgress.fromJson(Map<String, dynamic> json) {
    return SELProgress(
      learnerId: json['learnerId'] as String,
      totalCheckIns: json['totalCheckIns'] as int? ?? 0,
      currentStreak: json['currentStreak'] as int? ?? 0,
      longestStreak: json['longestStreak'] as int? ?? 0,
      moodTrends: (json['moodTrends'] as List<dynamic>?)
              ?.map((m) => MoodTrend.fromJson(m as Map<String, dynamic>))
              .toList() ??
          [],
      strategiesLearned: json['strategiesLearned'] as int? ?? 0,
      exercisesCompleted: json['exercisesCompleted'] as int? ?? 0,
      scenariosCompleted: json['scenariosCompleted'] as int? ?? 0,
      journalEntries: json['journalEntries'] as int? ?? 0,
    );
  }
}

/// Mood trend data point
class MoodTrend {
  final DateTime date;
  final String averageMood;
  final double intensity;

  const MoodTrend({
    required this.date,
    required this.averageMood,
    required this.intensity,
  });

  factory MoodTrend.fromJson(Map<String, dynamic> json) {
    return MoodTrend(
      date: DateTime.parse(json['date'] as String),
      averageMood: json['averageMood'] as String,
      intensity: (json['intensity'] as num).toDouble(),
    );
  }
}

// ============================================================================
// COMMON CONSTANTS
// ============================================================================

/// Common mood triggers
const List<String> commonTriggers = [
  'Schoolwork',
  'Social interaction',
  'Change in routine',
  'Noise/sensory',
  'Transition',
  'Conflict',
  'Excitement',
  'Tiredness',
  'Hunger',
  'Uncertainty',
];

/// Common coping strategies quick picks
const List<String> quickCopingStrategies = [
  'Deep breathing',
  'Took a break',
  'Talked to someone',
  'Used fidget',
  'Listened to music',
  'Went for a walk',
  'Positive self-talk',
  'Asked for help',
  'Counted to 10',
  'Squeezed a stress ball',
];
