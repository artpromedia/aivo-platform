/// Gamification types and models for mobile learner app
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

/// Player level configuration
class LevelConfig {
  final int level;
  final String title;
  final int xpRequired;
  final Color color;

  const LevelConfig({
    required this.level,
    required this.title,
    required this.xpRequired,
    required this.color,
  });
}

/// Player profile with gamification data
class PlayerProfile {
  final String id;
  final String studentId;
  final int level;
  final String levelTitle;
  final int totalXP;
  final int currentLevelXP;
  final int xpToNextLevel;
  final int currentStreak;
  final int longestStreak;
  final int coins;
  final int gems;
  final int achievementsCount;
  final DateTime? lastActivityAt;

  const PlayerProfile({
    required this.id,
    required this.studentId,
    required this.level,
    required this.levelTitle,
    required this.totalXP,
    required this.currentLevelXP,
    required this.xpToNextLevel,
    required this.currentStreak,
    required this.longestStreak,
    required this.coins,
    required this.gems,
    required this.achievementsCount,
    this.lastActivityAt,
  });

  double get levelProgress => xpToNextLevel > 0 
      ? currentLevelXP / (currentLevelXP + xpToNextLevel) 
      : 1.0;

  factory PlayerProfile.fromJson(Map<String, dynamic> json) {
    return PlayerProfile(
      id: json['id'] as String,
      studentId: json['studentId'] as String,
      level: json['level'] as int,
      levelTitle: json['levelTitle'] as String,
      totalXP: json['totalXP'] as int,
      currentLevelXP: json['currentLevelXP'] as int,
      xpToNextLevel: json['xpToNextLevel'] as int,
      currentStreak: json['currentStreak'] as int,
      longestStreak: json['longestStreak'] as int,
      coins: json['coins'] as int,
      gems: json['gems'] as int,
      achievementsCount: json['achievementsCount'] as int,
      lastActivityAt: json['lastActivityAt'] != null 
          ? DateTime.parse(json['lastActivityAt'] as String) 
          : null,
    );
  }
}

/// Daily progress tracking
class DailyProgress {
  final int todayXP;
  final int dailyGoalXP;
  final int lessonsCompleted;
  final int dailyGoalLessons;
  final int minutesLearned;
  final int dailyGoalMinutes;
  final bool dailyGoalReached;

  const DailyProgress({
    required this.todayXP,
    required this.dailyGoalXP,
    required this.lessonsCompleted,
    required this.dailyGoalLessons,
    required this.minutesLearned,
    required this.dailyGoalMinutes,
    required this.dailyGoalReached,
  });

  double get xpProgress => dailyGoalXP > 0 ? todayXP / dailyGoalXP : 0;
  double get lessonsProgress => dailyGoalLessons > 0 ? lessonsCompleted / dailyGoalLessons : 0;
  double get minutesProgress => dailyGoalMinutes > 0 ? minutesLearned / dailyGoalMinutes : 0;

  factory DailyProgress.fromJson(Map<String, dynamic> json) {
    return DailyProgress(
      todayXP: json['todayXP'] as int,
      dailyGoalXP: json['dailyGoalXP'] as int,
      lessonsCompleted: json['lessonsCompleted'] as int,
      dailyGoalLessons: json['dailyGoalLessons'] as int,
      minutesLearned: json['minutesLearned'] as int,
      dailyGoalMinutes: json['dailyGoalMinutes'] as int,
      dailyGoalReached: json['dailyGoalReached'] as bool,
    );
  }
}

/// Achievement rarity levels
enum AchievementRarity { common, uncommon, rare, epic, legendary }

/// Achievement model
class Achievement {
  final String id;
  final String achievementId;
  final String name;
  final String description;
  final String icon;
  final AchievementRarity rarity;
  final String category;
  final int xpReward;
  final bool earned;
  final DateTime? earnedAt;
  final int currentProgress;
  final int targetProgress;

  const Achievement({
    required this.id,
    required this.achievementId,
    required this.name,
    required this.description,
    required this.icon,
    required this.rarity,
    required this.category,
    required this.xpReward,
    required this.earned,
    this.earnedAt,
    required this.currentProgress,
    required this.targetProgress,
  });

  double get progress => targetProgress > 0 ? currentProgress / targetProgress : 0;
  bool get isInProgress => !earned && currentProgress > 0;

  Color get rarityColor {
    switch (rarity) {
      case AchievementRarity.common:
        return AivoBrand.gray;
      case AchievementRarity.uncommon:
        return AivoBrand.success;
      case AchievementRarity.rare:
        return Colors.blue;
      case AchievementRarity.epic:
        return Colors.purple;
      case AchievementRarity.legendary:
        return Colors.amber;
    }
  }

  factory Achievement.fromJson(Map<String, dynamic> json) {
    return Achievement(
      id: json['id'] as String,
      achievementId: json['achievementId'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      icon: json['icon'] as String,
      rarity: AchievementRarity.values.byName(json['rarity'] as String),
      category: json['category'] as String,
      xpReward: json['xpReward'] as int,
      earned: json['earned'] as bool,
      earnedAt: json['earnedAt'] != null 
          ? DateTime.parse(json['earnedAt'] as String) 
          : null,
      currentProgress: json['currentProgress'] as int? ?? 0,
      targetProgress: json['targetProgress'] as int? ?? 1,
    );
  }
}

/// Streak day model
class StreakDay {
  final DateTime date;
  final bool completed;
  final bool isFreezeUsed;
  final bool isToday;

  const StreakDay({
    required this.date,
    required this.completed,
    required this.isFreezeUsed,
    required this.isToday,
  });

  factory StreakDay.fromJson(Map<String, dynamic> json) {
    return StreakDay(
      date: DateTime.parse(json['date'] as String),
      completed: json['completed'] as bool,
      isFreezeUsed: json['isFreezeUsed'] as bool? ?? false,
      isToday: json['isToday'] as bool? ?? false,
    );
  }
}

/// Streak data
class Streak {
  final int currentStreak;
  final int longestStreak;
  final int freezesAvailable;
  final int freezesUsedThisMonth;
  final bool completedToday;
  final DateTime? lastActivityDate;
  final List<StreakDay> calendar;

  const Streak({
    required this.currentStreak,
    required this.longestStreak,
    required this.freezesAvailable,
    required this.freezesUsedThisMonth,
    required this.completedToday,
    this.lastActivityDate,
    this.calendar = const [],
  });

  factory Streak.fromJson(Map<String, dynamic> json) {
    return Streak(
      currentStreak: json['currentStreak'] as int,
      longestStreak: json['longestStreak'] as int,
      freezesAvailable: json['freezesAvailable'] as int,
      freezesUsedThisMonth: json['freezesUsedThisMonth'] as int,
      completedToday: json['completedToday'] as bool,
      lastActivityDate: json['lastActivityDate'] != null 
          ? DateTime.parse(json['lastActivityDate'] as String) 
          : null,
      calendar: (json['calendar'] as List<dynamic>?)
          ?.map((e) => StreakDay.fromJson(e as Map<String, dynamic>))
          .toList() ?? [],
    );
  }
}

/// Challenge type
enum ChallengeType { daily, weekly, monthly, special }

/// Challenge status
enum ChallengeStatus { active, completed, expired }

/// Challenge model
class Challenge {
  final String id;
  final String title;
  final String description;
  final ChallengeType type;
  final ChallengeStatus status;
  final String icon;
  final int currentProgress;
  final int targetProgress;
  final int xpReward;
  final int coinReward;
  final DateTime expiresAt;

  const Challenge({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.status,
    required this.icon,
    required this.currentProgress,
    required this.targetProgress,
    required this.xpReward,
    required this.coinReward,
    required this.expiresAt,
  });

  double get progress => targetProgress > 0 ? currentProgress / targetProgress : 0;
  bool get isCompleted => status == ChallengeStatus.completed;
  
  Duration get timeRemaining => expiresAt.difference(DateTime.now());

  factory Challenge.fromJson(Map<String, dynamic> json) {
    return Challenge(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      type: ChallengeType.values.byName(json['type'] as String),
      status: ChallengeStatus.values.byName(json['status'] as String),
      icon: json['icon'] as String,
      currentProgress: json['currentProgress'] as int,
      targetProgress: json['targetProgress'] as int,
      xpReward: json['xpReward'] as int,
      coinReward: json['coinReward'] as int? ?? 0,
      expiresAt: DateTime.parse(json['expiresAt'] as String),
    );
  }
}

/// Leaderboard entry
class LeaderboardEntry {
  final int rank;
  final String studentId;
  final String displayName;
  final String? avatarUrl;
  final int score;
  final int level;
  final bool isCurrentUser;

  const LeaderboardEntry({
    required this.rank,
    required this.studentId,
    required this.displayName,
    this.avatarUrl,
    required this.score,
    required this.level,
    this.isCurrentUser = false,
  });

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json, {String? currentUserId}) {
    return LeaderboardEntry(
      rank: json['rank'] as int,
      studentId: json['studentId'] as String,
      displayName: json['displayName'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      score: json['score'] as int,
      level: json['level'] as int,
      isCurrentUser: json['studentId'] == currentUserId,
    );
  }
}

/// Shop item rarity
enum ShopItemRarity { common, uncommon, rare, epic, legendary }

/// Shop item category
enum ShopItemCategory { avatar, theme, effect, title, powerUp, bundle }

/// Shop item model
class ShopItem {
  final String id;
  final String name;
  final String description;
  final ShopItemCategory category;
  final ShopItemRarity rarity;
  final String imageUrl;
  final int priceCoins;
  final int priceGems;
  final bool isOwned;
  final bool isEquipped;
  final int? requiredLevel;
  final bool isLimited;
  final DateTime? availableUntil;

  const ShopItem({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.rarity,
    required this.imageUrl,
    required this.priceCoins,
    required this.priceGems,
    this.isOwned = false,
    this.isEquipped = false,
    this.requiredLevel,
    this.isLimited = false,
    this.availableUntil,
  });

  Color get rarityColor {
    switch (rarity) {
      case ShopItemRarity.common:
        return AivoBrand.gray;
      case ShopItemRarity.uncommon:
        return AivoBrand.success;
      case ShopItemRarity.rare:
        return Colors.blue;
      case ShopItemRarity.epic:
        return Colors.purple;
      case ShopItemRarity.legendary:
        return Colors.amber;
    }
  }

  factory ShopItem.fromJson(Map<String, dynamic> json) {
    return ShopItem(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      category: ShopItemCategory.values.byName(json['category'] as String),
      rarity: ShopItemRarity.values.byName(json['rarity'] as String),
      imageUrl: json['imageUrl'] as String,
      priceCoins: json['priceCoins'] as int,
      priceGems: json['priceGems'] as int? ?? 0,
      isOwned: json['isOwned'] as bool? ?? false,
      isEquipped: json['isEquipped'] as bool? ?? false,
      requiredLevel: json['requiredLevel'] as int?,
      isLimited: json['isLimited'] as bool? ?? false,
      availableUntil: json['availableUntil'] != null 
          ? DateTime.parse(json['availableUntil'] as String) 
          : null,
    );
  }
}

/// Gamification notification type
enum NotificationType {
  xpEarned,
  levelUp,
  achievementUnlocked,
  streakMilestone,
  challengeCompleted,
  dailyGoalCompleted,
  breakReminder,
  rankChange,
}

/// Gamification notification
class GamificationNotification {
  final String id;
  final NotificationType type;
  final String title;
  final String message;
  final Map<String, dynamic>? data;
  final DateTime createdAt;
  final bool isRead;

  const GamificationNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    this.data,
    required this.createdAt,
    this.isRead = false,
  });

  factory GamificationNotification.fromJson(Map<String, dynamic> json) {
    return GamificationNotification(
      id: json['id'] as String,
      type: NotificationType.values.byName(json['type'] as String),
      title: json['title'] as String,
      message: json['message'] as String,
      data: json['data'] as Map<String, dynamic>?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      isRead: json['isRead'] as bool? ?? false,
    );
  }
}

/// Level configuration constants
class GamificationConstants {
  static const List<LevelConfig> levels = [
    LevelConfig(level: 1, title: 'Novice Learner', xpRequired: 0, color: Color(0xFF9E9E9E)),
    LevelConfig(level: 2, title: 'Curious Explorer', xpRequired: 100, color: Color(0xFF795548)),
    LevelConfig(level: 3, title: 'Knowledge Seeker', xpRequired: 300, color: Color(0xFF607D8B)),
    LevelConfig(level: 4, title: 'Rising Star', xpRequired: 600, color: Color(0xFF8BC34A)),
    LevelConfig(level: 5, title: 'Bright Mind', xpRequired: 1000, color: Color(0xFF4CAF50)),
    LevelConfig(level: 6, title: 'Dedicated Student', xpRequired: 1500, color: Color(0xFF009688)),
    LevelConfig(level: 7, title: 'Quick Learner', xpRequired: 2100, color: Color(0xFF00BCD4)),
    LevelConfig(level: 8, title: 'Wisdom Gatherer', xpRequired: 2800, color: Color(0xFF03A9F4)),
    LevelConfig(level: 9, title: 'Knowledge Knight', xpRequired: 3600, color: Color(0xFF2196F3)),
    LevelConfig(level: 10, title: 'Scholar', xpRequired: 4500, color: Color(0xFF3F51B5)),
    LevelConfig(level: 11, title: 'Senior Scholar', xpRequired: 5500, color: Color(0xFF673AB7)),
    LevelConfig(level: 12, title: 'Master Student', xpRequired: 6600, color: Color(0xFF9C27B0)),
    LevelConfig(level: 13, title: 'Expert Learner', xpRequired: 7800, color: Color(0xFFE91E63)),
    LevelConfig(level: 14, title: 'Knowledge Sage', xpRequired: 9100, color: Color(0xFFF44336)),
    LevelConfig(level: 15, title: 'Grand Scholar', xpRequired: 10500, color: Color(0xFFFF5722)),
    LevelConfig(level: 16, title: 'Wisdom Master', xpRequired: 12000, color: Color(0xFFFF9800)),
    LevelConfig(level: 17, title: 'Learning Legend', xpRequired: 14000, color: Color(0xFFFFC107)),
    LevelConfig(level: 18, title: 'Academic Champion', xpRequired: 16500, color: Color(0xFFFFEB3B)),
    LevelConfig(level: 19, title: 'Knowledge Titan', xpRequired: 19500, color: Color(0xFFCDDC39)),
    LevelConfig(level: 20, title: 'Ultimate Legend', xpRequired: 25000, color: Color(0xFFFFD700)),
  ];

  static LevelConfig getLevelConfig(int level) {
    if (level < 1) return levels.first;
    if (level > levels.length) return levels.last;
    return levels[level - 1];
  }
}

// ============================================================================
// TEAM MODELS (Sprint 3.1)
// ============================================================================

/// Team types
enum TeamType { classroom, school, crossSchool }

/// Team member roles
enum TeamMemberRole { owner, captain, member }

/// Team model
class Team {
  final String id;
  final String name;
  final String description;
  final String? avatarUrl;
  final TeamType type;
  final String? schoolId;
  final String? classId;
  final int totalXp;
  final int weeklyXp;
  final int monthlyXp;
  final int level;
  final int? rank;
  final int memberCount;
  final int maxMembers;
  final bool isPublic;
  final DateTime createdAt;

  const Team({
    required this.id,
    required this.name,
    required this.description,
    this.avatarUrl,
    required this.type,
    this.schoolId,
    this.classId,
    required this.totalXp,
    required this.weeklyXp,
    required this.monthlyXp,
    required this.level,
    this.rank,
    required this.memberCount,
    required this.maxMembers,
    required this.isPublic,
    required this.createdAt,
  });

  Color get typeColor {
    switch (type) {
      case TeamType.classroom:
        return AivoBrand.success;
      case TeamType.school:
        return Colors.blue;
      case TeamType.crossSchool:
        return Colors.purple;
    }
  }

  factory Team.fromJson(Map<String, dynamic> json) {
    return Team(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      type: _parseTeamType(json['type'] as String?),
      schoolId: json['schoolId'] as String?,
      classId: json['classId'] as String?,
      totalXp: json['totalXp'] as int? ?? 0,
      weeklyXp: json['weeklyXp'] as int? ?? 0,
      monthlyXp: json['monthlyXp'] as int? ?? 0,
      level: json['level'] as int? ?? 1,
      rank: json['rank'] as int?,
      memberCount: json['memberCount'] as int? ?? 0,
      maxMembers: json['maxMembers'] as int? ?? 20,
      isPublic: json['isPublic'] as bool? ?? true,
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt'] as String) 
          : DateTime.now(),
    );
  }

  static TeamType _parseTeamType(String? type) {
    switch (type?.toLowerCase()) {
      case 'classroom':
        return TeamType.classroom;
      case 'school':
        return TeamType.school;
      case 'cross_school':
      case 'crossschool':
        return TeamType.crossSchool;
      default:
        return TeamType.classroom;
    }
  }
}

/// Team member model
class TeamMember {
  final String id;
  final String studentId;
  final String displayName;
  final String? avatarUrl;
  final TeamMemberRole role;
  final int contributedXp;
  final int weeklyContribution;
  final int? level;
  final DateTime joinedAt;

  const TeamMember({
    required this.id,
    required this.studentId,
    required this.displayName,
    this.avatarUrl,
    required this.role,
    required this.contributedXp,
    required this.weeklyContribution,
    this.level,
    required this.joinedAt,
  });

  bool get isLeader => role == TeamMemberRole.owner;
  bool get isCaptain => role == TeamMemberRole.captain;

  String get roleEmoji {
    switch (role) {
      case TeamMemberRole.owner:
        return '👑';
      case TeamMemberRole.captain:
        return '⭐';
      case TeamMemberRole.member:
        return '';
    }
  }

  factory TeamMember.fromJson(Map<String, dynamic> json) {
    return TeamMember(
      id: json['id'] as String,
      studentId: json['studentId'] as String,
      displayName: json['displayName'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      role: _parseRole(json['role'] as String?),
      contributedXp: json['contributedXp'] as int? ?? 0,
      weeklyContribution: json['weeklyContribution'] as int? ?? 0,
      level: json['level'] as int?,
      joinedAt: json['joinedAt'] != null 
          ? DateTime.parse(json['joinedAt'] as String) 
          : DateTime.now(),
    );
  }

  static TeamMemberRole _parseRole(String? role) {
    switch (role?.toLowerCase()) {
      case 'owner':
        return TeamMemberRole.owner;
      case 'captain':
        return TeamMemberRole.captain;
      default:
        return TeamMemberRole.member;
    }
  }
}

/// Team details with members and competitions
class TeamDetails extends Team {
  final List<TeamMember> members;
  final List<CompetitionStanding> competitions;

  const TeamDetails({
    required super.id,
    required super.name,
    required super.description,
    super.avatarUrl,
    required super.type,
    super.schoolId,
    super.classId,
    required super.totalXp,
    required super.weeklyXp,
    required super.monthlyXp,
    required super.level,
    super.rank,
    required super.memberCount,
    required super.maxMembers,
    required super.isPublic,
    required super.createdAt,
    required this.members,
    required this.competitions,
  });

  factory TeamDetails.fromJson(Map<String, dynamic> json) {
    return TeamDetails(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      type: Team._parseTeamType(json['type'] as String?),
      schoolId: json['schoolId'] as String?,
      classId: json['classId'] as String?,
      totalXp: json['totalXp'] as int? ?? 0,
      weeklyXp: json['weeklyXp'] as int? ?? 0,
      monthlyXp: json['monthlyXp'] as int? ?? 0,
      level: json['level'] as int? ?? 1,
      rank: json['rank'] as int?,
      memberCount: json['memberCount'] as int? ?? 0,
      maxMembers: json['maxMembers'] as int? ?? 20,
      isPublic: json['isPublic'] as bool? ?? true,
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt'] as String) 
          : DateTime.now(),
      members: (json['members'] as List<dynamic>?)
          ?.map((m) => TeamMember.fromJson(m as Map<String, dynamic>))
          .toList() ?? [],
      competitions: (json['competitions'] as List<dynamic>?)
          ?.map((c) => CompetitionStanding.fromJson(c as Map<String, dynamic>))
          .toList() ?? [],
    );
  }
}

/// Team invite model
class TeamInvite {
  final String id;
  final String teamId;
  final String teamName;
  final String invitedBy;
  final String inviterName;
  final String status;
  final DateTime expiresAt;
  final DateTime createdAt;

  const TeamInvite({
    required this.id,
    required this.teamId,
    required this.teamName,
    required this.invitedBy,
    required this.inviterName,
    required this.status,
    required this.expiresAt,
    required this.createdAt,
  });

  bool get isPending => status == 'pending';
  bool get isExpired => DateTime.now().isAfter(expiresAt);

  factory TeamInvite.fromJson(Map<String, dynamic> json) {
    return TeamInvite(
      id: json['id'] as String,
      teamId: json['teamId'] as String,
      teamName: json['teamName'] as String,
      invitedBy: json['invitedBy'] as String,
      inviterName: json['inviterName'] as String? ?? 'Unknown',
      status: json['status'] as String? ?? 'pending',
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

// ============================================================================
// COMPETITION MODELS (Sprint 3.1)
// ============================================================================

/// Competition types
enum CompetitionType { individual, team, classRoom, school }

/// Competition status
enum CompetitionStatus { upcoming, active, ended, cancelled }

/// Competition model
class Competition {
  final String id;
  final String name;
  final String description;
  final CompetitionType type;
  final String category;
  final CompetitionStatus status;
  final DateTime startDate;
  final DateTime endDate;
  final int currentParticipants;
  final int? minParticipants;
  final int? maxParticipants;
  final bool isPublic;
  final List<CompetitionPrize> prizes;

  const Competition({
    required this.id,
    required this.name,
    required this.description,
    required this.type,
    required this.category,
    required this.status,
    required this.startDate,
    required this.endDate,
    required this.currentParticipants,
    this.minParticipants,
    this.maxParticipants,
    required this.isPublic,
    required this.prizes,
  });

  bool get isActive => status == CompetitionStatus.active;
  bool get isUpcoming => status == CompetitionStatus.upcoming;
  bool get hasEnded => status == CompetitionStatus.ended;

  Duration get timeRemaining => endDate.difference(DateTime.now());
  Duration get timeUntilStart => startDate.difference(DateTime.now());

  String get timeRemainingText {
    if (hasEnded) return 'Ended';
    if (isUpcoming) {
      final days = timeUntilStart.inDays;
      if (days > 0) return 'Starts in $days days';
      final hours = timeUntilStart.inHours;
      if (hours > 0) return 'Starts in $hours hours';
      return 'Starting soon';
    }
    final days = timeRemaining.inDays;
    if (days > 0) return '$days days left';
    final hours = timeRemaining.inHours;
    if (hours > 0) return '$hours hours left';
    final minutes = timeRemaining.inMinutes;
    return '$minutes minutes left';
  }

  Color get statusColor {
    switch (status) {
      case CompetitionStatus.active:
        return AivoBrand.success;
      case CompetitionStatus.upcoming:
        return Colors.blue;
      case CompetitionStatus.ended:
        return AivoBrand.gray;
      case CompetitionStatus.cancelled:
        return AivoBrand.error;
    }
  }

  factory Competition.fromJson(Map<String, dynamic> json) {
    return Competition(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String? ?? '',
      type: _parseCompetitionType(json['type'] as String?),
      category: json['category'] as String? ?? 'xp_earned',
      status: _parseCompetitionStatus(json['status'] as String?),
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: DateTime.parse(json['endDate'] as String),
      currentParticipants: json['currentParticipants'] as int? ?? 0,
      minParticipants: json['minParticipants'] as int?,
      maxParticipants: json['maxParticipants'] as int?,
      isPublic: json['isPublic'] as bool? ?? true,
      prizes: (json['prizes'] as List<dynamic>?)
          ?.map((p) => CompetitionPrize.fromJson(p as Map<String, dynamic>))
          .toList() ?? [],
    );
  }

  static CompetitionType _parseCompetitionType(String? type) {
    switch (type?.toLowerCase()) {
      case 'individual':
        return CompetitionType.individual;
      case 'team':
        return CompetitionType.team;
      case 'class':
      case 'classroom':
        return CompetitionType.classRoom;
      case 'school':
        return CompetitionType.school;
      default:
        return CompetitionType.individual;
    }
  }

  static CompetitionStatus _parseCompetitionStatus(String? status) {
    switch (status?.toLowerCase()) {
      case 'upcoming':
        return CompetitionStatus.upcoming;
      case 'active':
        return CompetitionStatus.active;
      case 'ended':
        return CompetitionStatus.ended;
      case 'cancelled':
        return CompetitionStatus.cancelled;
      default:
        return CompetitionStatus.active;
    }
  }
}

/// Competition prize model
class CompetitionPrize {
  final int rank;
  final int? xp;
  final int? coins;
  final int? gems;
  final String? badge;
  final String? title;

  const CompetitionPrize({
    required this.rank,
    this.xp,
    this.coins,
    this.gems,
    this.badge,
    this.title,
  });

  String get displayText {
    final parts = <String>[];
    if (xp != null && xp! > 0) parts.add('$xp XP');
    if (coins != null && coins! > 0) parts.add('$coins coins');
    if (gems != null && gems! > 0) parts.add('$gems gems');
    if (badge != null) parts.add('🏆 Badge');
    if (title != null) parts.add('🎖️ Title');
    return parts.isEmpty ? 'Prize' : parts.join(' + ');
  }

  factory CompetitionPrize.fromJson(Map<String, dynamic> json) {
    return CompetitionPrize(
      rank: json['rank'] as int,
      xp: json['xp'] as int?,
      coins: json['coins'] as int?,
      gems: json['gems'] as int?,
      badge: json['badge'] as String?,
      title: json['title'] as String?,
    );
  }
}

/// Competition standing model
class CompetitionStanding {
  final String competitionId;
  final String competitionName;
  final int rank;
  final int score;
  final int totalParticipants;
  final String timeRemaining;
  final DateTime endsAt;

  const CompetitionStanding({
    required this.competitionId,
    required this.competitionName,
    required this.rank,
    required this.score,
    required this.totalParticipants,
    required this.timeRemaining,
    required this.endsAt,
  });

  bool get isTopThree => rank <= 3;

  String get rankEmoji {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '#$rank';
    }
  }

  factory CompetitionStanding.fromJson(Map<String, dynamic> json) {
    return CompetitionStanding(
      competitionId: json['competitionId'] as String,
      competitionName: json['competitionName'] as String,
      rank: json['rank'] as int,
      score: json['score'] as int,
      totalParticipants: json['totalParticipants'] as int? ?? 0,
      timeRemaining: json['timeRemaining'] as String? ?? '',
      endsAt: json['endsAt'] != null 
          ? DateTime.parse(json['endsAt'] as String)
          : DateTime.now().add(const Duration(days: 7)),
    );
  }
}

/// Competition participant model
class CompetitionParticipant {
  final int rank;
  final String participantId;
  final String participantName;
  final String? avatarUrl;
  final int score;
  final int? previousRank;
  final bool isCurrentUser;

  const CompetitionParticipant({
    required this.rank,
    required this.participantId,
    required this.participantName,
    this.avatarUrl,
    required this.score,
    this.previousRank,
    this.isCurrentUser = false,
  });

  int? get rankChange => previousRank != null ? previousRank! - rank : null;

  factory CompetitionParticipant.fromJson(Map<String, dynamic> json, {String? currentUserId}) {
    return CompetitionParticipant(
      rank: json['rank'] as int,
      participantId: json['participantId'] as String,
      participantName: json['participantName'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      score: json['score'] as int,
      previousRank: json['previousRank'] as int?,
      isCurrentUser: json['participantId'] == currentUserId,
    );
  }
}
