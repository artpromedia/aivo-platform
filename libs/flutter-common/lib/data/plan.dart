/// Data models for Today's Plan and Difficulty Recommendations.
/// 
/// These models mirror the TypeScript definitions in @aivo/ts-types
/// for consistency across platforms.

/// Activity type for learning objects.
enum LearningObjectType {
  lesson,
  exercise,
  game,
  video,
  reading,
  assessment;

  static LearningObjectType fromString(String value) {
    return LearningObjectType.values.firstWhere(
      (e) => e.name.toUpperCase() == value.toUpperCase(),
      orElse: () => LearningObjectType.exercise,
    );
  }

  String toJson() => name.toUpperCase();
}

/// Why an activity was recommended.
enum ActivityReason {
  focusArea,
  practice,
  challenge,
  aiRecommended;

  static ActivityReason fromString(String value) {
    switch (value.toLowerCase()) {
      case 'focus_area':
        return ActivityReason.focusArea;
      case 'practice':
        return ActivityReason.practice;
      case 'challenge':
        return ActivityReason.challenge;
      case 'ai_recommended':
        return ActivityReason.aiRecommended;
      default:
        return ActivityReason.practice;
    }
  }

  String get displayLabel {
    switch (this) {
      case ActivityReason.focusArea:
        return 'Focus Area';
      case ActivityReason.practice:
        return 'Practice';
      case ActivityReason.challenge:
        return 'Challenge';
      case ActivityReason.aiRecommended:
        return 'Recommended';
    }
  }
}

/// Difficulty recommendation values.
enum DifficultyRecommendation {
  easier,
  same,
  harder;

  static DifficultyRecommendation fromString(String value) {
    return DifficultyRecommendation.values.firstWhere(
      (e) => e.name.toUpperCase() == value.toUpperCase(),
      orElse: () => DifficultyRecommendation.same,
    );
  }

  String get displayLabel {
    switch (this) {
      case DifficultyRecommendation.easier:
        return 'Start Easier';
      case DifficultyRecommendation.same:
        return 'Keep Current';
      case DifficultyRecommendation.harder:
        return 'Try Harder';
    }
  }

  String get emoji {
    switch (this) {
      case DifficultyRecommendation.easier:
        return '🌱';
      case DifficultyRecommendation.same:
        return '✨';
      case DifficultyRecommendation.harder:
        return '🚀';
    }
  }
}

/// A single activity in the learner's daily plan.
class TodaysPlanActivity {
  const TodaysPlanActivity({
    required this.activityId,
    required this.skillCode,
    required this.skillDisplayName,
    required this.domain,
    required this.difficultyLevel,
    required this.objectType,
    required this.title,
    this.description,
    required this.estimatedMinutes,
    this.contentUrl,
    required this.currentMastery,
    required this.reason,
  });

  final String activityId;
  final String skillCode;
  final String skillDisplayName;
  final String domain;
  final int difficultyLevel;
  final LearningObjectType objectType;
  final String title;
  final String? description;
  final int estimatedMinutes;
  final String? contentUrl;
  final double currentMastery;
  final ActivityReason reason;

  factory TodaysPlanActivity.fromJson(Map<String, dynamic> json) {
    return TodaysPlanActivity(
      activityId: json['activityId'] as String,
      skillCode: json['skillCode'] as String,
      skillDisplayName: json['skillDisplayName'] as String,
      domain: json['domain'] as String,
      difficultyLevel: json['difficultyLevel'] as int,
      objectType: LearningObjectType.fromString(json['objectType'] as String),
      title: json['title'] as String,
      description: json['description'] as String?,
      estimatedMinutes: json['estimatedMinutes'] as int,
      contentUrl: json['contentUrl'] as String?,
      currentMastery: (json['currentMastery'] as num).toDouble(),
      reason: ActivityReason.fromString(json['reason'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
    'activityId': activityId,
    'skillCode': skillCode,
    'skillDisplayName': skillDisplayName,
    'domain': domain,
    'difficultyLevel': difficultyLevel,
    'objectType': objectType.toJson(),
    'title': title,
    'description': description,
    'estimatedMinutes': estimatedMinutes,
    'contentUrl': contentUrl,
    'currentMastery': currentMastery,
    'reason': reason.name,
  };

  /// Get an icon for this activity type.
  String get typeIcon {
    switch (objectType) {
      case LearningObjectType.lesson:
        return '📚';
      case LearningObjectType.exercise:
        return '✏️';
      case LearningObjectType.game:
        return '🎮';
      case LearningObjectType.video:
        return '🎬';
      case LearningObjectType.reading:
        return '📖';
      case LearningObjectType.assessment:
        return '📝';
    }
  }

  /// Get a color-coded difficulty label.
  String get difficultyLabel {
    if (difficultyLevel <= 2) return 'Easy';
    if (difficultyLevel <= 4) return 'Medium';
    return 'Hard';
  }
}

/// Focus area summary for the plan.
class FocusArea {
  const FocusArea({
    required this.domain,
    required this.skillCount,
    required this.avgMastery,
  });

  final String domain;
  final int skillCount;
  final double avgMastery;

  factory FocusArea.fromJson(Map<String, dynamic> json) {
    return FocusArea(
      domain: json['domain'] as String,
      skillCount: json['skillCount'] as int,
      avgMastery: (json['avgMastery'] as num).toDouble(),
    );
  }
}

/// Response from today's plan endpoint.
class TodaysPlan {
  const TodaysPlan({
    required this.learnerId,
    required this.planDate,
    required this.totalMinutes,
    required this.activities,
    required this.focusAreas,
    required this.aiPlannerUsed,
  });

  final String learnerId;
  final String planDate;
  final int totalMinutes;
  final List<TodaysPlanActivity> activities;
  final List<FocusArea> focusAreas;
  final bool aiPlannerUsed;

  factory TodaysPlan.fromJson(Map<String, dynamic> json) {
    return TodaysPlan(
      learnerId: json['learnerId'] as String,
      planDate: json['planDate'] as String,
      totalMinutes: json['totalMinutes'] as int,
      activities: (json['activities'] as List<dynamic>)
          .map((e) => TodaysPlanActivity.fromJson(e as Map<String, dynamic>))
          .toList(),
      focusAreas: (json['focusAreas'] as List<dynamic>)
          .map((e) => FocusArea.fromJson(e as Map<String, dynamic>))
          .toList(),
      aiPlannerUsed: json['aiPlannerUsed'] as bool,
    );
  }

  /// Check if there are any activities in the plan.
  bool get isEmpty => activities.isEmpty;
  bool get isNotEmpty => activities.isNotEmpty;

  /// Total number of activities.
  int get activityCount => activities.length;

  /// Get activities by domain.
  List<TodaysPlanActivity> activitiesForDomain(String domain) {
    return activities.where((a) => a.domain == domain).toList();
  }
}

/// Recent performance data (if available).
class RecentPerformance {
  const RecentPerformance({
    required this.totalAttempts,
    required this.correctCount,
    required this.correctRate,
  });

  final int totalAttempts;
  final int correctCount;
  final double correctRate;

  factory RecentPerformance.fromJson(Map<String, dynamic> json) {
    return RecentPerformance(
      totalAttempts: json['totalAttempts'] as int,
      correctCount: json['correctCount'] as int,
      correctRate: (json['correctRate'] as num).toDouble(),
    );
  }

  /// Get a percentage string.
  String get percentageLabel => '${(correctRate * 100).round()}%';
}

/// Response from difficulty recommendation endpoint.
class DifficultyRecommendationResponse {
  const DifficultyRecommendationResponse({
    required this.learnerId,
    required this.recommendation,
    required this.reason,
    required this.currentMastery,
    this.recentPerformance,
    required this.suggestedDifficultyLevel,
    this.scopeDomain,
    this.scopeSkillCode,
  });

  final String learnerId;
  final DifficultyRecommendation recommendation;
  final String reason;
  final double currentMastery;
  final RecentPerformance? recentPerformance;
  final int suggestedDifficultyLevel;
  final String? scopeDomain;
  final String? scopeSkillCode;

  factory DifficultyRecommendationResponse.fromJson(Map<String, dynamic> json) {
    final scope = json['scope'] as Map<String, dynamic>?;
    return DifficultyRecommendationResponse(
      learnerId: json['learnerId'] as String,
      recommendation: DifficultyRecommendation.fromString(json['recommendation'] as String),
      reason: json['reason'] as String,
      currentMastery: (json['currentMastery'] as num).toDouble(),
      recentPerformance: json['recentPerformance'] != null
          ? RecentPerformance.fromJson(json['recentPerformance'] as Map<String, dynamic>)
          : null,
      suggestedDifficultyLevel: json['suggestedDifficultyLevel'] as int,
      scopeDomain: scope?['domain'] as String?,
      scopeSkillCode: scope?['skillCode'] as String?,
    );
  }

  /// Get mastery as a percentage.
  String get masteryPercentage => '${(currentMastery * 100).round()}%';
}
