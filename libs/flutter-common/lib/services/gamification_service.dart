/// Gamification API Service
///
/// Provides access to learner achievements, badges, and rewards.
library;

import 'package:dio/dio.dart';

import '../api/api_client.dart';
import '../api/api_config.dart';

/// A badge that can be earned
class Badge {
  final String id;
  final String name;
  final String description;
  final String iconUrl;
  final BadgeCategory category;
  final BadgeRarity rarity;
  final int pointsValue;
  final BadgeRequirement? requirement;

  const Badge({
    required this.id,
    required this.name,
    required this.description,
    required this.iconUrl,
    required this.category,
    required this.rarity,
    required this.pointsValue,
    this.requirement,
  });

  factory Badge.fromJson(Map<String, dynamic> json) {
    return Badge(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      iconUrl: json['iconUrl'] as String,
      category: BadgeCategory.fromString(json['category'] as String),
      rarity: BadgeRarity.fromString(json['rarity'] as String),
      pointsValue: json['pointsValue'] as int,
      requirement: json['requirement'] != null
          ? BadgeRequirement.fromJson(json['requirement'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'iconUrl': iconUrl,
        'category': category.value,
        'rarity': rarity.value,
        'pointsValue': pointsValue,
        'requirement': requirement?.toJson(),
      };
}

/// Badge categories
enum BadgeCategory {
  achievement('achievement'),
  streak('streak'),
  skill('skill'),
  social('social'),
  special('special');

  final String value;
  const BadgeCategory(this.value);

  static BadgeCategory fromString(String value) {
    return BadgeCategory.values.firstWhere(
      (e) => e.value == value,
      orElse: () => BadgeCategory.achievement,
    );
  }
}

/// Badge rarity levels
enum BadgeRarity {
  common('common'),
  uncommon('uncommon'),
  rare('rare'),
  epic('epic'),
  legendary('legendary');

  final String value;
  const BadgeRarity(this.value);

  static BadgeRarity fromString(String value) {
    return BadgeRarity.values.firstWhere(
      (e) => e.value == value,
      orElse: () => BadgeRarity.common,
    );
  }
}

/// Requirements to earn a badge
class BadgeRequirement {
  final String type;
  final int targetValue;
  final String? skillId;

  const BadgeRequirement({
    required this.type,
    required this.targetValue,
    this.skillId,
  });

  factory BadgeRequirement.fromJson(Map<String, dynamic> json) {
    return BadgeRequirement(
      type: json['type'] as String,
      targetValue: json['targetValue'] as int,
      skillId: json['skillId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'type': type,
        'targetValue': targetValue,
        'skillId': skillId,
      };
}

/// A badge earned by a learner
class EarnedBadge {
  final String id;
  final Badge badge;
  final DateTime earnedAt;
  final String? earnedForActivity;

  const EarnedBadge({
    required this.id,
    required this.badge,
    required this.earnedAt,
    this.earnedForActivity,
  });

  factory EarnedBadge.fromJson(Map<String, dynamic> json) {
    return EarnedBadge(
      id: json['id'] as String,
      badge: Badge.fromJson(json['badge'] as Map<String, dynamic>),
      earnedAt: DateTime.parse(json['earnedAt'] as String),
      earnedForActivity: json['earnedForActivity'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'badge': badge.toJson(),
        'earnedAt': earnedAt.toIso8601String(),
        'earnedForActivity': earnedForActivity,
      };
}

/// Learner's gamification profile
class GamificationProfile {
  final String learnerId;
  final int totalPoints;
  final int level;
  final int pointsToNextLevel;
  final int streakDays;
  final int longestStreak;
  final List<EarnedBadge> recentBadges;
  final int totalBadges;
  final LeaderboardPosition? leaderboardPosition;

  const GamificationProfile({
    required this.learnerId,
    required this.totalPoints,
    required this.level,
    required this.pointsToNextLevel,
    required this.streakDays,
    required this.longestStreak,
    required this.recentBadges,
    required this.totalBadges,
    this.leaderboardPosition,
  });

  factory GamificationProfile.fromJson(Map<String, dynamic> json) {
    return GamificationProfile(
      learnerId: json['learnerId'] as String,
      totalPoints: json['totalPoints'] as int,
      level: json['level'] as int,
      pointsToNextLevel: json['pointsToNextLevel'] as int,
      streakDays: json['streakDays'] as int,
      longestStreak: json['longestStreak'] as int,
      recentBadges: (json['recentBadges'] as List)
          .map((e) => EarnedBadge.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalBadges: json['totalBadges'] as int,
      leaderboardPosition: json['leaderboardPosition'] != null
          ? LeaderboardPosition.fromJson(
              json['leaderboardPosition'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'learnerId': learnerId,
        'totalPoints': totalPoints,
        'level': level,
        'pointsToNextLevel': pointsToNextLevel,
        'streakDays': streakDays,
        'longestStreak': longestStreak,
        'recentBadges': recentBadges.map((e) => e.toJson()).toList(),
        'totalBadges': totalBadges,
        'leaderboardPosition': leaderboardPosition?.toJson(),
      };
}

/// Position on a leaderboard
class LeaderboardPosition {
  final int rank;
  final int totalParticipants;
  final String scope; // 'class', 'school', 'global'

  const LeaderboardPosition({
    required this.rank,
    required this.totalParticipants,
    required this.scope,
  });

  factory LeaderboardPosition.fromJson(Map<String, dynamic> json) {
    return LeaderboardPosition(
      rank: json['rank'] as int,
      totalParticipants: json['totalParticipants'] as int,
      scope: json['scope'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        'rank': rank,
        'totalParticipants': totalParticipants,
        'scope': scope,
      };
}

/// Leaderboard entry
class LeaderboardEntry {
  final int rank;
  final String learnerId;
  final String learnerName;
  final String? avatarUrl;
  final int points;
  final int level;
  final bool isCurrentUser;

  const LeaderboardEntry({
    required this.rank,
    required this.learnerId,
    required this.learnerName,
    this.avatarUrl,
    required this.points,
    required this.level,
    required this.isCurrentUser,
  });

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntry(
      rank: json['rank'] as int,
      learnerId: json['learnerId'] as String,
      learnerName: json['learnerName'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      points: json['points'] as int,
      level: json['level'] as int,
      isCurrentUser: json['isCurrentUser'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'rank': rank,
        'learnerId': learnerId,
        'learnerName': learnerName,
        'avatarUrl': avatarUrl,
        'points': points,
        'level': level,
        'isCurrentUser': isCurrentUser,
      };
}

/// Reward that can be redeemed with points
class Reward {
  final String id;
  final String name;
  final String description;
  final String iconUrl;
  final int pointsCost;
  final RewardType type;
  final bool isAvailable;

  const Reward({
    required this.id,
    required this.name,
    required this.description,
    required this.iconUrl,
    required this.pointsCost,
    required this.type,
    required this.isAvailable,
  });

  factory Reward.fromJson(Map<String, dynamic> json) {
    return Reward(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      iconUrl: json['iconUrl'] as String,
      pointsCost: json['pointsCost'] as int,
      type: RewardType.fromString(json['type'] as String),
      isAvailable: json['isAvailable'] as bool,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'iconUrl': iconUrl,
        'pointsCost': pointsCost,
        'type': type.value,
        'isAvailable': isAvailable,
      };
}

/// Types of rewards
enum RewardType {
  avatar('avatar'),
  theme('theme'),
  powerUp('power_up'),
  certificate('certificate'),
  physical('physical');

  final String value;
  const RewardType(this.value);

  static RewardType fromString(String value) {
    return RewardType.values.firstWhere(
      (e) => e.value == value,
      orElse: () => RewardType.avatar,
    );
  }
}

/// Gamification API Service
class GamificationService {
  final Dio _dio;

  GamificationService({Dio? dio}) : _dio = dio ?? AivoApiClient.instance.dio;

  /// Get gamification profile for a learner
  Future<GamificationProfile> getProfile(String learnerId) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiEndpoints.gamificationProfile.replaceAll('{learnerId}', learnerId),
    );
    return GamificationProfile.fromJson(response.data!);
  }

  /// Get all badges earned by a learner
  Future<List<EarnedBadge>> getEarnedBadges(String learnerId) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiEndpoints.gamificationBadges.replaceAll('{learnerId}', learnerId),
    );
    final data = response.data!['badges'] as List;
    return data
        .map((e) => EarnedBadge.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Get all available badges
  Future<List<Badge>> getAvailableBadges() async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiEndpoints.gamificationAllBadges,
    );
    final data = response.data!['badges'] as List;
    return data
        .map((e) => Badge.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Get leaderboard
  Future<List<LeaderboardEntry>> getLeaderboard({
    String scope = 'class',
    int limit = 20,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiEndpoints.gamificationLeaderboard,
      queryParameters: {'scope': scope, 'limit': limit},
    );
    final data = response.data!['entries'] as List;
    return data
        .map((e) => LeaderboardEntry.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Get available rewards
  Future<List<Reward>> getAvailableRewards() async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiEndpoints.gamificationRewards,
    );
    final data = response.data!['rewards'] as List;
    return data
        .map((e) => Reward.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Redeem a reward
  Future<bool> redeemReward(String rewardId) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '${ApiEndpoints.gamificationRewards}/$rewardId/redeem',
    );
    return response.data!['success'] as bool;
  }

  /// Get progress towards a specific badge
  Future<Map<String, dynamic>> getBadgeProgress(
    String learnerId,
    String badgeId,
  ) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '${ApiEndpoints.gamificationBadges.replaceAll('{learnerId}', learnerId)}/$badgeId/progress',
    );
    return response.data!;
  }
}
