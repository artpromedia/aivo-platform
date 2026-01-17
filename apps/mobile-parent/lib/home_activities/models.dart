/// Data models for home activities

// ============================================================================
// Enums
// ============================================================================

enum GameCategory {
  math,
  reading,
  science,
  art,
  music,
  logic,
  memory,
  problem_solving,
}

enum DifficultyLevel {
  beginner,
  intermediate,
  advanced,
  expert,
}

enum ActivityType {
  indoor,
  outdoor,
  creative,
  educational,
  physical,
  social,
}

// ============================================================================
// Learning Games
// ============================================================================

class LearningGame {
  final String id;
  final String title;
  final String description;
  final GameCategory category;
  final String skillArea;
  final DifficultyLevel difficulty;
  final int recommendedAge;
  final int estimatedTime; // in minutes
  final String? thumbnailUrl;
  final List<String> learningObjectives;
  final int timesPlayed;
  final double? averageScore;
  final bool isFavorite;

  LearningGame({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.skillArea,
    required this.difficulty,
    required this.recommendedAge,
    required this.estimatedTime,
    this.thumbnailUrl,
    required this.learningObjectives,
    this.timesPlayed = 0,
    this.averageScore,
    this.isFavorite = false,
  });

  factory LearningGame.fromJson(Map<String, dynamic> json) {
    return LearningGame(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      category: GameCategory.values.firstWhere(
        (e) => e.name == json['category'],
        orElse: () => GameCategory.educational,
      ),
      skillArea: json['skillArea'] as String,
      difficulty: DifficultyLevel.values.firstWhere(
        (e) => e.name == json['difficulty'],
        orElse: () => DifficultyLevel.beginner,
      ),
      recommendedAge: json['recommendedAge'] as int,
      estimatedTime: json['estimatedTime'] as int,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      learningObjectives: (json['learningObjectives'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      timesPlayed: json['timesPlayed'] as int? ?? 0,
      averageScore: json['averageScore'] as double?,
      isFavorite: json['isFavorite'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'category': category.name,
      'skillArea': skillArea,
      'difficulty': difficulty.name,
      'recommendedAge': recommendedAge,
      'estimatedTime': estimatedTime,
      'thumbnailUrl': thumbnailUrl,
      'learningObjectives': learningObjectives,
      'timesPlayed': timesPlayed,
      'averageScore': averageScore,
      'isFavorite': isFavorite,
    };
  }
}

class GameSession {
  final String id;
  final String gameId;
  final String childId;
  final DateTime startTime;
  final DateTime? endTime;
  final int? score;
  final int? timeSpent;
  final Map<String, dynamic>? sessionData;
  final bool completed;

  GameSession({
    required this.id,
    required this.gameId,
    required this.childId,
    required this.startTime,
    this.endTime,
    this.score,
    this.timeSpent,
    this.sessionData,
    this.completed = false,
  });

  factory GameSession.fromJson(Map<String, dynamic> json) {
    return GameSession(
      id: json['id'] as String,
      gameId: json['gameId'] as String,
      childId: json['childId'] as String,
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime'] as String) : null,
      score: json['score'] as int?,
      timeSpent: json['timeSpent'] as int?,
      sessionData: json['sessionData'] as Map<String, dynamic>?,
      completed: json['completed'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'gameId': gameId,
      'childId': childId,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'score': score,
      'timeSpent': timeSpent,
      'sessionData': sessionData,
      'completed': completed,
    };
  }
}

class GameProgress {
  final String gameId;
  final String gameTitle;
  final int totalPlays;
  final int totalTimeSpent;
  final double averageScore;
  final double bestScore;
  final DateTime lastPlayed;
  final int streak;

  GameProgress({
    required this.gameId,
    required this.gameTitle,
    required this.totalPlays,
    required this.totalTimeSpent,
    required this.averageScore,
    required this.bestScore,
    required this.lastPlayed,
    required this.streak,
  });

  factory GameProgress.fromJson(Map<String, dynamic> json) {
    return GameProgress(
      gameId: json['gameId'] as String,
      gameTitle: json['gameTitle'] as String,
      totalPlays: json['totalPlays'] as int,
      totalTimeSpent: json['totalTimeSpent'] as int,
      averageScore: (json['averageScore'] as num).toDouble(),
      bestScore: (json['bestScore'] as num).toDouble(),
      lastPlayed: DateTime.parse(json['lastPlayed'] as String),
      streak: json['streak'] as int,
    );
  }
}

// ============================================================================
// Practice Exercises
// ============================================================================

class PracticeExercise {
  final String id;
  final String title;
  final String description;
  final String subject;
  final String skillArea;
  final DifficultyLevel difficulty;
  final int questionCount;
  final int estimatedTime;
  final List<String> tags;
  final double? completionRate;
  final double? averageScore;

  PracticeExercise({
    required this.id,
    required this.title,
    required this.description,
    required this.subject,
    required this.skillArea,
    required this.difficulty,
    required this.questionCount,
    required this.estimatedTime,
    required this.tags,
    this.completionRate,
    this.averageScore,
  });

  factory PracticeExercise.fromJson(Map<String, dynamic> json) {
    return PracticeExercise(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      subject: json['subject'] as String,
      skillArea: json['skillArea'] as String,
      difficulty: DifficultyLevel.values.firstWhere(
        (e) => e.name == json['difficulty'],
        orElse: () => DifficultyLevel.beginner,
      ),
      questionCount: json['questionCount'] as int,
      estimatedTime: json['estimatedTime'] as int,
      tags: (json['tags'] as List<dynamic>).map((e) => e as String).toList(),
      completionRate: json['completionRate'] as double?,
      averageScore: json['averageScore'] as double?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'subject': subject,
      'skillArea': skillArea,
      'difficulty': difficulty.name,
      'questionCount': questionCount,
      'estimatedTime': estimatedTime,
      'tags': tags,
      'completionRate': completionRate,
      'averageScore': averageScore,
    };
  }
}

class ExerciseSession {
  final String id;
  final String exerciseId;
  final String childId;
  final DateTime startTime;
  final DateTime? endTime;
  final int questionsAnswered;
  final int correctAnswers;
  final double? score;
  final bool completed;

  ExerciseSession({
    required this.id,
    required this.exerciseId,
    required this.childId,
    required this.startTime,
    this.endTime,
    this.questionsAnswered = 0,
    this.correctAnswers = 0,
    this.score,
    this.completed = false,
  });

  factory ExerciseSession.fromJson(Map<String, dynamic> json) {
    return ExerciseSession(
      id: json['id'] as String,
      exerciseId: json['exerciseId'] as String,
      childId: json['childId'] as String,
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime'] as String) : null,
      questionsAnswered: json['questionsAnswered'] as int? ?? 0,
      correctAnswers: json['correctAnswers'] as int? ?? 0,
      score: json['score'] as double?,
      completed: json['completed'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'exerciseId': exerciseId,
      'childId': childId,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'questionsAnswered': questionsAnswered,
      'correctAnswers': correctAnswers,
      'score': score,
      'completed': completed,
    };
  }
}

class ExerciseResult {
  final String questionId;
  final bool correct;
  final String? feedback;
  final String? explanation;

  ExerciseResult({
    required this.questionId,
    required this.correct,
    this.feedback,
    this.explanation,
  });

  factory ExerciseResult.fromJson(Map<String, dynamic> json) {
    return ExerciseResult(
      questionId: json['questionId'] as String,
      correct: json['correct'] as bool,
      feedback: json['feedback'] as String?,
      explanation: json['explanation'] as String?,
    );
  }
}

class ExerciseProgress {
  final String exerciseId;
  final String exerciseTitle;
  final int attemptsCount;
  final int completedCount;
  final double averageScore;
  final double bestScore;
  final DateTime? lastAttempt;
  final double improvementRate;

  ExerciseProgress({
    required this.exerciseId,
    required this.exerciseTitle,
    required this.attemptsCount,
    required this.completedCount,
    required this.averageScore,
    required this.bestScore,
    this.lastAttempt,
    required this.improvementRate,
  });

  factory ExerciseProgress.fromJson(Map<String, dynamic> json) {
    return ExerciseProgress(
      exerciseId: json['exerciseId'] as String,
      exerciseTitle: json['exerciseTitle'] as String,
      attemptsCount: json['attemptsCount'] as int,
      completedCount: json['completedCount'] as int,
      averageScore: (json['averageScore'] as num).toDouble(),
      bestScore: (json['bestScore'] as num).toDouble(),
      lastAttempt: json['lastAttempt'] != null
          ? DateTime.parse(json['lastAttempt'] as String)
          : null,
      improvementRate: (json['improvementRate'] as num).toDouble(),
    );
  }
}

// ============================================================================
// Skill Builders
// ============================================================================

class SkillBuilder {
  final String id;
  final String title;
  final String description;
  final String skillCategory;
  final DifficultyLevel difficulty;
  final List<SkillBuilderActivity> activities;
  final int totalActivities;
  final int completedActivities;
  final double progressPercentage;
  final String? iconUrl;

  SkillBuilder({
    required this.id,
    required this.title,
    required this.description,
    required this.skillCategory,
    required this.difficulty,
    this.activities = const [],
    required this.totalActivities,
    this.completedActivities = 0,
    this.progressPercentage = 0.0,
    this.iconUrl,
  });

  factory SkillBuilder.fromJson(Map<String, dynamic> json) {
    return SkillBuilder(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      skillCategory: json['skillCategory'] as String,
      difficulty: DifficultyLevel.values.firstWhere(
        (e) => e.name == json['difficulty'],
        orElse: () => DifficultyLevel.beginner,
      ),
      activities: json['activities'] != null
          ? (json['activities'] as List<dynamic>)
              .map((e) => SkillBuilderActivity.fromJson(e))
              .toList()
          : [],
      totalActivities: json['totalActivities'] as int,
      completedActivities: json['completedActivities'] as int? ?? 0,
      progressPercentage: (json['progressPercentage'] as num?)?.toDouble() ?? 0.0,
      iconUrl: json['iconUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'skillCategory': skillCategory,
      'difficulty': difficulty.name,
      'activities': activities.map((a) => a.toJson()).toList(),
      'totalActivities': totalActivities,
      'completedActivities': completedActivities,
      'progressPercentage': progressPercentage,
      'iconUrl': iconUrl,
    };
  }
}

class SkillBuilderActivity {
  final String id;
  final String title;
  final String description;
  final String instructions;
  final int estimatedTime;
  final bool completed;
  final int? score;

  SkillBuilderActivity({
    required this.id,
    required this.title,
    required this.description,
    required this.instructions,
    required this.estimatedTime,
    this.completed = false,
    this.score,
  });

  factory SkillBuilderActivity.fromJson(Map<String, dynamic> json) {
    return SkillBuilderActivity(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      instructions: json['instructions'] as String,
      estimatedTime: json['estimatedTime'] as int,
      completed: json['completed'] as bool? ?? false,
      score: json['score'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'instructions': instructions,
      'estimatedTime': estimatedTime,
      'completed': completed,
      'score': score,
    };
  }
}

class SkillBuilderSession {
  final String id;
  final String builderId;
  final String activityId;
  final String childId;
  final DateTime startTime;
  final DateTime? endTime;
  final bool completed;
  final int? score;
  final String? notes;

  SkillBuilderSession({
    required this.id,
    required this.builderId,
    required this.activityId,
    required this.childId,
    required this.startTime,
    this.endTime,
    this.completed = false,
    this.score,
    this.notes,
  });

  factory SkillBuilderSession.fromJson(Map<String, dynamic> json) {
    return SkillBuilderSession(
      id: json['id'] as String,
      builderId: json['builderId'] as String,
      activityId: json['activityId'] as String,
      childId: json['childId'] as String,
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime'] as String) : null,
      completed: json['completed'] as bool? ?? false,
      score: json['score'] as int?,
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'builderId': builderId,
      'activityId': activityId,
      'childId': childId,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'completed': completed,
      'score': score,
      'notes': notes,
    };
  }
}

class SkillBuilderProgress {
  final String builderId;
  final String builderTitle;
  final int totalActivities;
  final int completedActivities;
  final double progressPercentage;
  final DateTime? lastActivity;
  final int totalTimeSpent;

  SkillBuilderProgress({
    required this.builderId,
    required this.builderTitle,
    required this.totalActivities,
    required this.completedActivities,
    required this.progressPercentage,
    this.lastActivity,
    required this.totalTimeSpent,
  });

  factory SkillBuilderProgress.fromJson(Map<String, dynamic> json) {
    return SkillBuilderProgress(
      builderId: json['builderId'] as String,
      builderTitle: json['builderTitle'] as String,
      totalActivities: json['totalActivities'] as int,
      completedActivities: json['completedActivities'] as int,
      progressPercentage: (json['progressPercentage'] as num).toDouble(),
      lastActivity: json['lastActivity'] != null
          ? DateTime.parse(json['lastActivity'] as String)
          : null,
      totalTimeSpent: json['totalTimeSpent'] as int,
    );
  }
}

// ============================================================================
// Family Activities
// ============================================================================

class FamilyActivity {
  final String id;
  final String title;
  final String description;
  final ActivityType type;
  final int minAge;
  final int maxAge;
  final int estimatedTime;
  final List<String> materials;
  final List<String> instructions;
  final String? imageUrl;
  final List<String> learningBenefits;
  final int participantCount;
  final double? averageRating;
  final bool recommended;

  FamilyActivity({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.minAge,
    required this.maxAge,
    required this.estimatedTime,
    required this.materials,
    required this.instructions,
    this.imageUrl,
    required this.learningBenefits,
    this.participantCount = 0,
    this.averageRating,
    this.recommended = false,
  });

  factory FamilyActivity.fromJson(Map<String, dynamic> json) {
    return FamilyActivity(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      type: ActivityType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => ActivityType.educational,
      ),
      minAge: json['minAge'] as int,
      maxAge: json['maxAge'] as int,
      estimatedTime: json['estimatedTime'] as int,
      materials: (json['materials'] as List<dynamic>).map((e) => e as String).toList(),
      instructions: (json['instructions'] as List<dynamic>).map((e) => e as String).toList(),
      imageUrl: json['imageUrl'] as String?,
      learningBenefits:
          (json['learningBenefits'] as List<dynamic>).map((e) => e as String).toList(),
      participantCount: json['participantCount'] as int? ?? 0,
      averageRating: json['averageRating'] as double?,
      recommended: json['recommended'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'type': type.name,
      'minAge': minAge,
      'maxAge': maxAge,
      'estimatedTime': estimatedTime,
      'materials': materials,
      'instructions': instructions,
      'imageUrl': imageUrl,
      'learningBenefits': learningBenefits,
      'participantCount': participantCount,
      'averageRating': averageRating,
      'recommended': recommended,
    };
  }
}

class FamilyActivitySession {
  final String id;
  final String activityId;
  final String childId;
  final List<String> participants;
  final DateTime startTime;
  final DateTime? endTime;
  final bool completed;
  final int? rating;
  final String? feedback;
  final List<String>? photos;

  FamilyActivitySession({
    required this.id,
    required this.activityId,
    required this.childId,
    this.participants = const [],
    required this.startTime,
    this.endTime,
    this.completed = false,
    this.rating,
    this.feedback,
    this.photos,
  });

  factory FamilyActivitySession.fromJson(Map<String, dynamic> json) {
    return FamilyActivitySession(
      id: json['id'] as String,
      activityId: json['activityId'] as String,
      childId: json['childId'] as String,
      participants: json['participants'] != null
          ? (json['participants'] as List<dynamic>).map((e) => e as String).toList()
          : [],
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime'] as String) : null,
      completed: json['completed'] as bool? ?? false,
      rating: json['rating'] as int?,
      feedback: json['feedback'] as String?,
      photos: json['photos'] != null
          ? (json['photos'] as List<dynamic>).map((e) => e as String).toList()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'activityId': activityId,
      'childId': childId,
      'participants': participants,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'completed': completed,
      'rating': rating,
      'feedback': feedback,
      'photos': photos,
    };
  }
}
