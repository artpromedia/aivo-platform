/// Gamification Models
///
/// Models for gamification controls and class challenges.
library;

import 'package:flutter/foundation.dart';

/// Types of rewards
enum RewardType {
  badge('BADGE'),
  points('POINTS'),
  achievement('ACHIEVEMENT'),
  streak('STREAK'),
  level('LEVEL'),
  title('TITLE');

  const RewardType(this.value);
  final String value;

  static RewardType fromString(String value) {
    return RewardType.values.firstWhere(
      (t) => t.value == value.toUpperCase(),
      orElse: () => RewardType.badge,
    );
  }
}

/// Challenge types
enum ChallengeType {
  individual('INDIVIDUAL'),
  team('TEAM'),
  classWide('CLASS_WIDE'),
  competition('COMPETITION');

  const ChallengeType(this.value);
  final String value;

  static ChallengeType fromString(String value) {
    return ChallengeType.values.firstWhere(
      (t) => t.value == value.toUpperCase(),
      orElse: () => ChallengeType.classWide,
    );
  }

  String get label {
    switch (this) {
      case ChallengeType.individual:
        return 'Individual';
      case ChallengeType.team:
        return 'Team';
      case ChallengeType.classWide:
        return 'Class-Wide';
      case ChallengeType.competition:
        return 'Competition';
    }
  }
}

/// Challenge status
enum ChallengeStatus {
  draft('DRAFT'),
  scheduled('SCHEDULED'),
  active('ACTIVE'),
  completed('COMPLETED'),
  cancelled('CANCELLED');

  const ChallengeStatus(this.value);
  final String value;

  static ChallengeStatus fromString(String value) {
    return ChallengeStatus.values.firstWhere(
      (s) => s.value == value.toUpperCase(),
      orElse: () => ChallengeStatus.draft,
    );
  }
}

/// Goal types for challenges
enum GoalType {
  completeLessons('COMPLETE_LESSONS'),
  earnPoints('EARN_POINTS'),
  maintainStreak('MAINTAIN_STREAK'),
  achieveScore('ACHIEVE_SCORE'),
  timeSpent('TIME_SPENT'),
  helpClassmates('HELP_CLASSMATES'),
  custom('CUSTOM');

  const GoalType(this.value);
  final String value;

  static GoalType fromString(String value) {
    return GoalType.values.firstWhere(
      (t) => t.value == value.toUpperCase(),
      orElse: () => GoalType.custom,
    );
  }

  String get label {
    switch (this) {
      case GoalType.completeLessons:
        return 'Complete Lessons';
      case GoalType.earnPoints:
        return 'Earn Points';
      case GoalType.maintainStreak:
        return 'Maintain Streak';
      case GoalType.achieveScore:
        return 'Achieve Score';
      case GoalType.timeSpent:
        return 'Time Spent';
      case GoalType.helpClassmates:
        return 'Help Classmates';
      case GoalType.custom:
        return 'Custom Goal';
    }
  }
}

/// A gamification reward
@immutable
class Reward {
  const Reward({
    required this.id,
    required this.name,
    required this.type,
    this.description,
    this.iconUrl,
    this.pointValue,
    this.rarity,
    this.isActive = true,
  });

  final String id;
  final String name;
  final RewardType type;
  final String? description;
  final String? iconUrl;
  final int? pointValue;
  final String? rarity;
  final bool isActive;

  factory Reward.fromJson(Map<String, dynamic> json) {
    return Reward(
      id: json['id'] as String,
      name: json['name'] as String,
      type: RewardType.fromString(json['type'] as String? ?? 'BADGE'),
      description: json['description'] as String?,
      iconUrl: json['iconUrl'] as String?,
      pointValue: json['pointValue'] as int?,
      rarity: json['rarity'] as String?,
      isActive: json['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type.value,
      if (description != null) 'description': description,
      if (iconUrl != null) 'iconUrl': iconUrl,
      if (pointValue != null) 'pointValue': pointValue,
      if (rarity != null) 'rarity': rarity,
      'isActive': isActive,
    };
  }
}

/// Gamification settings for a class
@immutable
class GamificationSettings {
  const GamificationSettings({
    required this.classId,
    this.pointsEnabled = true,
    this.badgesEnabled = true,
    this.leaderboardEnabled = true,
    this.streaksEnabled = true,
    this.levelsEnabled = true,
    this.challengesEnabled = true,
    this.pointsPerLesson = 10,
    this.pointsPerQuiz = 25,
    this.pointsPerPerfectScore = 50,
    this.streakBonus = 5,
    this.leaderboardVisibility = 'class',
    this.customRewards = const [],
  });

  final String classId;
  final bool pointsEnabled;
  final bool badgesEnabled;
  final bool leaderboardEnabled;
  final bool streaksEnabled;
  final bool levelsEnabled;
  final bool challengesEnabled;
  final int pointsPerLesson;
  final int pointsPerQuiz;
  final int pointsPerPerfectScore;
  final int streakBonus;
  final String leaderboardVisibility;
  final List<Reward> customRewards;

  factory GamificationSettings.fromJson(Map<String, dynamic> json) {
    return GamificationSettings(
      classId: json['classId'] as String,
      pointsEnabled: json['pointsEnabled'] as bool? ?? true,
      badgesEnabled: json['badgesEnabled'] as bool? ?? true,
      leaderboardEnabled: json['leaderboardEnabled'] as bool? ?? true,
      streaksEnabled: json['streaksEnabled'] as bool? ?? true,
      levelsEnabled: json['levelsEnabled'] as bool? ?? true,
      challengesEnabled: json['challengesEnabled'] as bool? ?? true,
      pointsPerLesson: json['pointsPerLesson'] as int? ?? 10,
      pointsPerQuiz: json['pointsPerQuiz'] as int? ?? 25,
      pointsPerPerfectScore: json['pointsPerPerfectScore'] as int? ?? 50,
      streakBonus: json['streakBonus'] as int? ?? 5,
      leaderboardVisibility: json['leaderboardVisibility'] as String? ?? 'class',
      customRewards: (json['customRewards'] as List<dynamic>?)
              ?.map((e) => Reward.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'classId': classId,
      'pointsEnabled': pointsEnabled,
      'badgesEnabled': badgesEnabled,
      'leaderboardEnabled': leaderboardEnabled,
      'streaksEnabled': streaksEnabled,
      'levelsEnabled': levelsEnabled,
      'challengesEnabled': challengesEnabled,
      'pointsPerLesson': pointsPerLesson,
      'pointsPerQuiz': pointsPerQuiz,
      'pointsPerPerfectScore': pointsPerPerfectScore,
      'streakBonus': streakBonus,
      'leaderboardVisibility': leaderboardVisibility,
      'customRewards': customRewards.map((r) => r.toJson()).toList(),
    };
  }

  GamificationSettings copyWith({
    String? classId,
    bool? pointsEnabled,
    bool? badgesEnabled,
    bool? leaderboardEnabled,
    bool? streaksEnabled,
    bool? levelsEnabled,
    bool? challengesEnabled,
    int? pointsPerLesson,
    int? pointsPerQuiz,
    int? pointsPerPerfectScore,
    int? streakBonus,
    String? leaderboardVisibility,
    List<Reward>? customRewards,
  }) {
    return GamificationSettings(
      classId: classId ?? this.classId,
      pointsEnabled: pointsEnabled ?? this.pointsEnabled,
      badgesEnabled: badgesEnabled ?? this.badgesEnabled,
      leaderboardEnabled: leaderboardEnabled ?? this.leaderboardEnabled,
      streaksEnabled: streaksEnabled ?? this.streaksEnabled,
      levelsEnabled: levelsEnabled ?? this.levelsEnabled,
      challengesEnabled: challengesEnabled ?? this.challengesEnabled,
      pointsPerLesson: pointsPerLesson ?? this.pointsPerLesson,
      pointsPerQuiz: pointsPerQuiz ?? this.pointsPerQuiz,
      pointsPerPerfectScore: pointsPerPerfectScore ?? this.pointsPerPerfectScore,
      streakBonus: streakBonus ?? this.streakBonus,
      leaderboardVisibility: leaderboardVisibility ?? this.leaderboardVisibility,
      customRewards: customRewards ?? this.customRewards,
    );
  }
}

/// A class challenge
@immutable
class ClassChallenge {
  const ClassChallenge({
    required this.id,
    required this.classId,
    required this.title,
    required this.type,
    required this.status,
    required this.goalType,
    required this.goalTarget,
    this.description,
    this.startDate,
    this.endDate,
    this.reward,
    this.participants = const [],
    this.progress = 0,
    this.teamSize,
    this.createdAt,
    this.createdBy,
  });

  final String id;
  final String classId;
  final String title;
  final ChallengeType type;
  final ChallengeStatus status;
  final GoalType goalType;
  final int goalTarget;
  final String? description;
  final DateTime? startDate;
  final DateTime? endDate;
  final Reward? reward;
  final List<ChallengeParticipant> participants;
  final double progress;
  final int? teamSize;
  final DateTime? createdAt;
  final String? createdBy;

  bool get isActive => status == ChallengeStatus.active;

  double get completionPercentage => (progress / goalTarget * 100).clamp(0, 100);

  factory ClassChallenge.fromJson(Map<String, dynamic> json) {
    return ClassChallenge(
      id: json['id'] as String,
      classId: json['classId'] as String,
      title: json['title'] as String,
      type: ChallengeType.fromString(json['type'] as String? ?? 'CLASS_WIDE'),
      status: ChallengeStatus.fromString(json['status'] as String? ?? 'DRAFT'),
      goalType: GoalType.fromString(json['goalType'] as String? ?? 'CUSTOM'),
      goalTarget: json['goalTarget'] as int? ?? 0,
      description: json['description'] as String?,
      startDate: json['startDate'] != null
          ? DateTime.parse(json['startDate'] as String)
          : null,
      endDate: json['endDate'] != null
          ? DateTime.parse(json['endDate'] as String)
          : null,
      reward: json['reward'] != null
          ? Reward.fromJson(json['reward'] as Map<String, dynamic>)
          : null,
      participants: (json['participants'] as List<dynamic>?)
              ?.map((e) =>
                  ChallengeParticipant.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      progress: (json['progress'] as num?)?.toDouble() ?? 0,
      teamSize: json['teamSize'] as int?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      createdBy: json['createdBy'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'classId': classId,
      'title': title,
      'type': type.value,
      'status': status.value,
      'goalType': goalType.value,
      'goalTarget': goalTarget,
      if (description != null) 'description': description,
      if (startDate != null) 'startDate': startDate!.toIso8601String(),
      if (endDate != null) 'endDate': endDate!.toIso8601String(),
      if (reward != null) 'reward': reward!.toJson(),
      'participants': participants.map((p) => p.toJson()).toList(),
      'progress': progress,
      if (teamSize != null) 'teamSize': teamSize,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (createdBy != null) 'createdBy': createdBy,
    };
  }

  ClassChallenge copyWith({
    String? id,
    String? classId,
    String? title,
    ChallengeType? type,
    ChallengeStatus? status,
    GoalType? goalType,
    int? goalTarget,
    String? description,
    DateTime? startDate,
    DateTime? endDate,
    Reward? reward,
    List<ChallengeParticipant>? participants,
    double? progress,
    int? teamSize,
    DateTime? createdAt,
    String? createdBy,
  }) {
    return ClassChallenge(
      id: id ?? this.id,
      classId: classId ?? this.classId,
      title: title ?? this.title,
      type: type ?? this.type,
      status: status ?? this.status,
      goalType: goalType ?? this.goalType,
      goalTarget: goalTarget ?? this.goalTarget,
      description: description ?? this.description,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      reward: reward ?? this.reward,
      participants: participants ?? this.participants,
      progress: progress ?? this.progress,
      teamSize: teamSize ?? this.teamSize,
      createdAt: createdAt ?? this.createdAt,
      createdBy: createdBy ?? this.createdBy,
    );
  }
}

/// A participant in a challenge
@immutable
class ChallengeParticipant {
  const ChallengeParticipant({
    required this.studentId,
    required this.studentName,
    this.teamId,
    this.teamName,
    this.progress = 0,
    this.pointsEarned = 0,
    this.joinedAt,
  });

  final String studentId;
  final String studentName;
  final String? teamId;
  final String? teamName;
  final double progress;
  final int pointsEarned;
  final DateTime? joinedAt;

  factory ChallengeParticipant.fromJson(Map<String, dynamic> json) {
    return ChallengeParticipant(
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      teamId: json['teamId'] as String?,
      teamName: json['teamName'] as String?,
      progress: (json['progress'] as num?)?.toDouble() ?? 0,
      pointsEarned: json['pointsEarned'] as int? ?? 0,
      joinedAt: json['joinedAt'] != null
          ? DateTime.parse(json['joinedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'studentId': studentId,
      'studentName': studentName,
      if (teamId != null) 'teamId': teamId,
      if (teamName != null) 'teamName': teamName,
      'progress': progress,
      'pointsEarned': pointsEarned,
      if (joinedAt != null) 'joinedAt': joinedAt!.toIso8601String(),
    };
  }
}

/// Leaderboard entry
@immutable
class LeaderboardEntry {
  const LeaderboardEntry({
    required this.rank,
    required this.studentId,
    required this.studentName,
    required this.points,
    this.level,
    this.streak,
    this.badgeCount,
    this.change,
  });

  final int rank;
  final String studentId;
  final String studentName;
  final int points;
  final int? level;
  final int? streak;
  final int? badgeCount;
  final int? change;

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntry(
      rank: json['rank'] as int,
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      points: json['points'] as int,
      level: json['level'] as int?,
      streak: json['streak'] as int?,
      badgeCount: json['badgeCount'] as int?,
      change: json['change'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'rank': rank,
      'studentId': studentId,
      'studentName': studentName,
      'points': points,
      if (level != null) 'level': level,
      if (streak != null) 'streak': streak,
      if (badgeCount != null) 'badgeCount': badgeCount,
      if (change != null) 'change': change,
    };
  }
}
