/// Gamification types and models for mobile learner app
library;

import 'package:flutter/material.dart';

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
        return Colors.grey;
      case AchievementRarity.uncommon:
        return Colors.green;
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
        return Colors.grey;
      case ShopItemRarity.uncommon:
        return Colors.green;
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
