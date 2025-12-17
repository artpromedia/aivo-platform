/// Engagement Service
///
/// Manages XP, streaks, badges, leaderboards, and achievements.
library;

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// XP MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// XP status for a learner.
class XpStatus {
  const XpStatus({
    required this.totalXp,
    required this.level,
    required this.currentLevelXp,
    required this.xpForNextLevel,
    required this.progressPercent,
    required this.levelTitle,
    this.weeklyXp = 0,
    this.dailyXp = 0,
  });

  final int totalXp;
  final int level;
  final int currentLevelXp;
  final int xpForNextLevel;
  final double progressPercent;
  final String levelTitle;
  final int weeklyXp;
  final int dailyXp;

  factory XpStatus.fromJson(Map<String, dynamic> json) {
    return XpStatus(
      totalXp: json['totalXp'] as int? ?? 0,
      level: json['level'] as int? ?? 1,
      currentLevelXp: json['currentLevelXp'] as int? ?? 0,
      xpForNextLevel: json['xpForNextLevel'] as int? ?? 100,
      progressPercent: (json['progressPercent'] as num? ?? 0).toDouble(),
      levelTitle: json['levelTitle'] as String? ?? 'Novice',
      weeklyXp: json['weeklyXp'] as int? ?? 0,
      dailyXp: json['dailyXp'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'totalXp': totalXp,
        'level': level,
        'currentLevelXp': currentLevelXp,
        'xpForNextLevel': xpForNextLevel,
        'progressPercent': progressPercent,
        'levelTitle': levelTitle,
        'weeklyXp': weeklyXp,
        'dailyXp': dailyXp,
      };

  XpStatus copyWith({
    int? totalXp,
    int? level,
    int? currentLevelXp,
    int? xpForNextLevel,
    double? progressPercent,
    String? levelTitle,
    int? weeklyXp,
    int? dailyXp,
  }) {
    return XpStatus(
      totalXp: totalXp ?? this.totalXp,
      level: level ?? this.level,
      currentLevelXp: currentLevelXp ?? this.currentLevelXp,
      xpForNextLevel: xpForNextLevel ?? this.xpForNextLevel,
      progressPercent: progressPercent ?? this.progressPercent,
      levelTitle: levelTitle ?? this.levelTitle,
      weeklyXp: weeklyXp ?? this.weeklyXp,
      dailyXp: dailyXp ?? this.dailyXp,
    );
  }
}

/// Result of earning XP.
class XpEarnedResult {
  const XpEarnedResult({
    required this.xpEarned,
    required this.newTotal,
    required this.leveledUp,
    this.newLevel,
    this.newLevelTitle,
    this.bonusXp,
    this.bonusReason,
  });

  final int xpEarned;
  final int newTotal;
  final bool leveledUp;
  final int? newLevel;
  final String? newLevelTitle;
  final int? bonusXp;
  final String? bonusReason;

  factory XpEarnedResult.fromJson(Map<String, dynamic> json) {
    return XpEarnedResult(
      xpEarned: json['xpEarned'] as int? ?? 0,
      newTotal: json['newTotal'] as int? ?? 0,
      leveledUp: json['leveledUp'] as bool? ?? false,
      newLevel: json['newLevel'] as int?,
      newLevelTitle: json['newLevelTitle'] as String?,
      bonusXp: json['bonusXp'] as int?,
      bonusReason: json['bonusReason'] as String?,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STREAK MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Streak information.
class StreakInfo {
  const StreakInfo({
    required this.currentStreak,
    required this.longestStreak,
    required this.streakAtRisk,
    this.hoursUntilStreakBreak,
    required this.streakFreezeAvailable,
    required this.streakRecoveryAvailable,
    this.recoveryId,
    this.recentDays = const [],
    this.streakFreezeCount = 0,
  });

  final int currentStreak;
  final int longestStreak;
  final bool streakAtRisk;
  final int? hoursUntilStreakBreak;
  final bool streakFreezeAvailable;
  final bool streakRecoveryAvailable;
  final String? recoveryId;
  final List<StreakDay> recentDays;
  final int streakFreezeCount;

  factory StreakInfo.fromJson(Map<String, dynamic> json) {
    return StreakInfo(
      currentStreak: json['currentStreak'] as int? ?? 0,
      longestStreak: json['longestStreak'] as int? ?? 0,
      streakAtRisk: json['streakAtRisk'] as bool? ?? false,
      hoursUntilStreakBreak: json['hoursUntilStreakBreak'] as int?,
      streakFreezeAvailable: json['streakFreezeAvailable'] as bool? ?? false,
      streakRecoveryAvailable:
          json['streakRecoveryAvailable'] as bool? ?? false,
      recoveryId: json['recoveryId'] as String?,
      recentDays: (json['recentDays'] as List<dynamic>?)
              ?.map((d) => StreakDay.fromJson(d as Map<String, dynamic>))
              .toList() ??
          [],
      streakFreezeCount: json['streakFreezeCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'currentStreak': currentStreak,
        'longestStreak': longestStreak,
        'streakAtRisk': streakAtRisk,
        'hoursUntilStreakBreak': hoursUntilStreakBreak,
        'streakFreezeAvailable': streakFreezeAvailable,
        'streakRecoveryAvailable': streakRecoveryAvailable,
        'recoveryId': recoveryId,
        'recentDays': recentDays.map((d) => d.toJson()).toList(),
        'streakFreezeCount': streakFreezeCount,
      };
}

/// Individual streak day.
class StreakDay {
  const StreakDay({
    required this.date,
    required this.wasActive,
    required this.xpEarned,
    this.minutesLearned = 0,
  });

  final DateTime date;
  final bool wasActive;
  final int xpEarned;
  final int minutesLearned;

  factory StreakDay.fromJson(Map<String, dynamic> json) {
    return StreakDay(
      date: DateTime.parse(json['date'] as String),
      wasActive: json['wasActive'] as bool? ?? false,
      xpEarned: json['xpEarned'] as int? ?? 0,
      minutesLearned: json['minutesLearned'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'date': date.toIso8601String(),
        'wasActive': wasActive,
        'xpEarned': xpEarned,
        'minutesLearned': minutesLearned,
      };
}

/// Result of updating streak.
class StreakUpdateResult {
  const StreakUpdateResult({
    required this.currentStreak,
    required this.streakMaintained,
    required this.isNewRecord,
    this.xpBonus,
  });

  final int currentStreak;
  final bool streakMaintained;
  final bool isNewRecord;
  final int? xpBonus;

  factory StreakUpdateResult.fromJson(Map<String, dynamic> json) {
    return StreakUpdateResult(
      currentStreak: json['currentStreak'] as int? ?? 0,
      streakMaintained: json['streakMaintained'] as bool? ?? false,
      isNewRecord: json['isNewRecord'] as bool? ?? false,
      xpBonus: json['xpBonus'] as int?,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BADGE MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Badge definition.
class Badge {
  const Badge({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.category,
    required this.xpReward,
    required this.isSecret,
    this.tier,
    this.rarity,
  });

  final String id;
  final String name;
  final String description;
  final String icon;
  final String category;
  final int xpReward;
  final bool isSecret;
  final String? tier; // bronze, silver, gold, platinum
  final String? rarity; // common, uncommon, rare, epic, legendary

  factory Badge.fromJson(Map<String, dynamic> json) {
    return Badge(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String? ?? '',
      icon: json['icon'] as String? ?? 'badge',
      category: json['category'] as String? ?? 'general',
      xpReward: json['xpReward'] as int? ?? 0,
      isSecret: json['isSecret'] as bool? ?? false,
      tier: json['tier'] as String?,
      rarity: json['rarity'] as String?,
    );
  }
}

/// User's earned badge.
class UserBadge {
  const UserBadge({
    required this.badge,
    required this.earnedAt,
    this.progress,
  });

  final Badge badge;
  final DateTime earnedAt;
  final double? progress;

  factory UserBadge.fromJson(Map<String, dynamic> json) {
    return UserBadge(
      badge: Badge.fromJson(json['badge'] as Map<String, dynamic>? ?? json),
      earnedAt: DateTime.parse(json['earnedAt'] as String),
      progress: (json['progress'] as num?)?.toDouble(),
    );
  }
}

/// Badge progress information.
class BadgeProgress {
  const BadgeProgress({
    required this.badge,
    required this.progressPercent,
    this.progressDescription,
    this.current,
    this.target,
    this.isUnlocked = false,
  });

  final Badge badge;
  final double progressPercent;
  final String? progressDescription;
  final int? current;
  final int? target;
  final bool isUnlocked;

  factory BadgeProgress.fromJson(Map<String, dynamic> json) {
    return BadgeProgress(
      badge: Badge.fromJson(json['badge'] as Map<String, dynamic>),
      progressPercent: (json['progressPercent'] as num? ?? 0).toDouble(),
      progressDescription: json['progressDescription'] as String?,
      current: json['current'] as int?,
      target: json['target'] as int?,
      isUnlocked: json['isUnlocked'] as bool? ?? false,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEADERBOARD MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Leaderboard type.
enum LeaderboardType { daily, weekly, monthly, allTime }

/// Leaderboard scope.
enum LeaderboardScope { global, friends, classroom, school }

/// Leaderboard data.
class Leaderboard {
  const Leaderboard({
    required this.type,
    required this.scope,
    required this.entries,
    this.currentUserEntry,
    this.currentUserRank,
    this.totalParticipants,
    this.lastUpdated,
  });

  final LeaderboardType type;
  final LeaderboardScope scope;
  final List<LeaderboardEntry> entries;
  final LeaderboardEntry? currentUserEntry;
  final int? currentUserRank;
  final int? totalParticipants;
  final DateTime? lastUpdated;

  factory Leaderboard.fromJson(Map<String, dynamic> json) {
    return Leaderboard(
      type: LeaderboardType.values.firstWhere(
        (t) => t.name == (json['type'] as String? ?? 'weekly'),
        orElse: () => LeaderboardType.weekly,
      ),
      scope: LeaderboardScope.values.firstWhere(
        (s) => s.name == (json['scope'] as String? ?? 'global'),
        orElse: () => LeaderboardScope.global,
      ),
      entries: (json['entries'] as List<dynamic>?)
              ?.map(
                  (e) => LeaderboardEntry.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      currentUserEntry: json['currentUserEntry'] != null
          ? LeaderboardEntry.fromJson(
              json['currentUserEntry'] as Map<String, dynamic>)
          : null,
      currentUserRank: json['currentUserRank'] as int?,
      totalParticipants: json['totalParticipants'] as int?,
      lastUpdated: json['lastUpdated'] != null
          ? DateTime.parse(json['lastUpdated'] as String)
          : null,
    );
  }
}

/// Leaderboard entry.
class LeaderboardEntry {
  const LeaderboardEntry({
    required this.rank,
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    required this.xp,
    required this.level,
    this.isCurrentUser = false,
    this.change,
  });

  final int rank;
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final int xp;
  final int level;
  final bool isCurrentUser;
  final int? change; // rank change from previous period

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntry(
      rank: json['rank'] as int? ?? 0,
      userId: json['userId'] as String,
      displayName: json['displayName'] as String? ?? 'Unknown',
      avatarUrl: json['avatarUrl'] as String?,
      xp: json['xp'] as int? ?? 0,
      level: json['level'] as int? ?? 1,
      isCurrentUser: json['isCurrentUser'] as bool? ?? false,
      change: json['change'] as int?,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Achievement earned by user.
class Achievement {
  const Achievement({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.earnedAt,
    required this.xpReward,
    this.category,
    this.shareUrl,
  });

  final String id;
  final String name;
  final String description;
  final String icon;
  final DateTime earnedAt;
  final int xpReward;
  final String? category;
  final String? shareUrl;

  factory Achievement.fromJson(Map<String, dynamic> json) {
    return Achievement(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String? ?? '',
      icon: json['icon'] as String? ?? 'trophy',
      earnedAt: DateTime.parse(json['earnedAt'] as String),
      xpReward: json['xpReward'] as int? ?? 0,
      category: json['category'] as String?,
      shareUrl: json['shareUrl'] as String?,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGAGEMENT SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Service for managing engagement features.
class EngagementService {
  EngagementService({
    required AivoApiClient apiClient,
  }) : _apiClient = apiClient;

  final AivoApiClient _apiClient;
  static const _baseUrl = '/engagement';

  // Cache for XP status
  XpStatus? _cachedXpStatus;
  DateTime? _xpCacheTime;
  static const _xpCacheDuration = Duration(minutes: 5);

  // ═══════════════════════════════════════════════════════════════════════════
  // XP METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get current XP status.
  Future<XpStatus> getXpStatus({
    required String learnerId,
    bool forceRefresh = false,
  }) async {
    // Check cache
    if (!forceRefresh &&
        _cachedXpStatus != null &&
        _xpCacheTime != null &&
        DateTime.now().difference(_xpCacheTime!) < _xpCacheDuration) {
      return _cachedXpStatus!;
    }

    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_baseUrl/xp',
      queryParameters: {'learnerId': learnerId},
    );

    final status = XpStatus.fromJson(response.data!);
    _cachedXpStatus = status;
    _xpCacheTime = DateTime.now();

    return status;
  }

  /// Award XP to a learner.
  Future<XpEarnedResult> earnXp({
    required String learnerId,
    required int amount,
    required String source,
    String? sourceId,
    Map<String, dynamic>? metadata,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '$_baseUrl/xp',
      data: {
        'learnerId': learnerId,
        'amount': amount,
        'source': source,
        'sourceId': sourceId,
        'metadata': metadata,
      },
    );

    // Invalidate cache
    _cachedXpStatus = null;

    return XpEarnedResult.fromJson(response.data!);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STREAK METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get streak information.
  Future<StreakInfo> getStreakInfo({required String learnerId}) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_baseUrl/streaks',
      queryParameters: {'learnerId': learnerId},
    );

    return StreakInfo.fromJson(response.data!);
  }

  /// Check in to update streak.
  Future<StreakUpdateResult> updateStreak({required String learnerId}) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '$_baseUrl/streaks',
      data: {'learnerId': learnerId},
    );

    return StreakUpdateResult.fromJson(response.data!);
  }

  /// Use streak freeze to protect streak.
  Future<bool> useStreakFreeze({required String learnerId}) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '$_baseUrl/streaks/freeze',
      data: {'learnerId': learnerId},
    );

    return response.data?['success'] == true;
  }

  /// Recover a lost streak.
  Future<bool> useStreakRecovery({
    required String learnerId,
    required String recoveryId,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '$_baseUrl/streaks/recover',
      data: {
        'learnerId': learnerId,
        'recoveryId': recoveryId,
      },
    );

    return response.data?['success'] == true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BADGE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get all available badges.
  Future<List<Badge>> getAllBadges() async {
    final response = await _apiClient.get<List<dynamic>>(
      '$_baseUrl/badges',
    );

    return (response.data ?? [])
        .map((b) => Badge.fromJson(b as Map<String, dynamic>))
        .toList();
  }

  /// Get badges earned by a learner.
  Future<List<UserBadge>> getUserBadges({required String learnerId}) async {
    final response = await _apiClient.get<List<dynamic>>(
      '$_baseUrl/badges/earned',
      queryParameters: {'learnerId': learnerId},
    );

    return (response.data ?? [])
        .map((b) => UserBadge.fromJson(b as Map<String, dynamic>))
        .toList();
  }

  /// Get progress towards a specific badge.
  Future<BadgeProgress> getBadgeProgress({
    required String learnerId,
    required String badgeId,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_baseUrl/badges/$badgeId/progress',
      queryParameters: {'learnerId': learnerId},
    );

    return BadgeProgress.fromJson(response.data!);
  }

  /// Get progress towards all badges.
  Future<List<BadgeProgress>> getAllBadgeProgress({
    required String learnerId,
  }) async {
    final response = await _apiClient.get<List<dynamic>>(
      '$_baseUrl/badges/progress',
      queryParameters: {'learnerId': learnerId},
    );

    return (response.data ?? [])
        .map((b) => BadgeProgress.fromJson(b as Map<String, dynamic>))
        .toList();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEADERBOARD METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get leaderboard.
  Future<Leaderboard> getLeaderboard({
    required String learnerId,
    LeaderboardType type = LeaderboardType.weekly,
    LeaderboardScope scope = LeaderboardScope.global,
    int limit = 100,
    String? classroomId,
    String? schoolId,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_baseUrl/leaderboard',
      queryParameters: {
        'learnerId': learnerId,
        'type': type.name,
        'scope': scope.name,
        'limit': limit.toString(),
        if (classroomId != null) 'classroomId': classroomId,
        if (schoolId != null) 'schoolId': schoolId,
      },
    );

    return Leaderboard.fromJson(response.data!);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACHIEVEMENT METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get all achievements for a learner.
  Future<List<Achievement>> getAchievements({required String learnerId}) async {
    final response = await _apiClient.get<List<dynamic>>(
      '$_baseUrl/achievements',
      queryParameters: {'learnerId': learnerId},
    );

    return (response.data ?? [])
        .map((a) => Achievement.fromJson(a as Map<String, dynamic>))
        .toList();
  }

  /// Get recent achievements.
  Future<List<Achievement>> getRecentAchievements({
    required String learnerId,
    int limit = 10,
  }) async {
    final response = await _apiClient.get<List<dynamic>>(
      '$_baseUrl/achievements/recent',
      queryParameters: {
        'learnerId': learnerId,
        'limit': limit.toString(),
      },
    );

    return (response.data ?? [])
        .map((a) => Achievement.fromJson(a as Map<String, dynamic>))
        .toList();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIVERPOD PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for EngagementService.
final engagementServiceProvider = Provider<EngagementService>((ref) {
  return EngagementService(
    apiClient: AivoApiClient.instance,
  );
});

/// Provider for XP status.
final xpStatusProvider =
    FutureProvider.family<XpStatus, String>((ref, learnerId) async {
  final service = ref.watch(engagementServiceProvider);
  return service.getXpStatus(learnerId: learnerId);
});

/// Provider for streak info.
final streakInfoProvider =
    FutureProvider.family<StreakInfo, String>((ref, learnerId) async {
  final service = ref.watch(engagementServiceProvider);
  return service.getStreakInfo(learnerId: learnerId);
});

/// Provider for user badges.
final userBadgesProvider =
    FutureProvider.family<List<UserBadge>, String>((ref, learnerId) async {
  final service = ref.watch(engagementServiceProvider);
  return service.getUserBadges(learnerId: learnerId);
});
