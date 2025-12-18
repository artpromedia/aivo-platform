/// Offline Regulation Service - ND-3.2
///
/// Manages regulation activities for offline use.
/// Provides activity discovery, execution tracking, and preference management.

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'cached_activities.dart';
import 'offline_storage.dart';
import 'offline_manager.dart';

/// Service for managing offline regulation activities
class OfflineRegulationService {
  final OfflineStorage _storage;
  final OfflineManager _offlineManager;

  OfflineRegulationService({
    required OfflineStorage storage,
    required OfflineManager offlineManager,
  })  : _storage = storage,
        _offlineManager = offlineManager;

  /// Get all available activities, prioritizing cached built-in activities
  Future<List<CachedActivity>> getAvailableActivities({
    ActivityCategory? category,
    AgeGroup? ageGroup,
    ActivityDifficulty? difficulty,
    String? tag,
    bool offlineOnly = false,
  }) async {
    List<CachedActivity> activities = CachedActivities.all;

    // Apply filters
    if (category != null) {
      activities = activities.where((a) => a.category == category).toList();
    }

    if (ageGroup != null) {
      activities = activities.where((a) =>
        a.ageGroups.contains(ageGroup) ||
        a.ageGroups.contains(AgeGroup.all)
      ).toList();
    }

    if (difficulty != null) {
      activities = activities.where((a) => a.difficulty == difficulty).toList();
    }

    if (tag != null) {
      activities = activities.where((a) => a.tags.contains(tag.toLowerCase())).toList();
    }

    if (offlineOnly) {
      final filteredActivities = <CachedActivity>[];
      for (final a in activities) {
        if (!a.requiresAudio || await _hasAudioAsset(a)) {
          filteredActivities.add(a);
        }
      }
      activities = filteredActivities;
    }

    // Try to load any downloaded activities from server
    if (!offlineOnly && _offlineManager.isOnline) {
      final serverActivities = await _loadServerActivities();
      activities = [...activities, ...serverActivities];
    }

    return activities;
  }

  Future<bool> _hasAudioAsset(CachedActivity activity) async {
    if (activity.audioAssetId == null) return true;
    return _storage.hasAsset(activity.audioAssetId!, 'mp3');
  }

  Future<List<CachedActivity>> _loadServerActivities() async {
    try {
      final storedActivities = await _storage.getAllRegulationActivities();
      return storedActivities
          .map((json) => CachedActivity.fromJson(json))
          .toList();
    } catch (e) {
      debugPrint('Failed to load server activities: $e');
      return [];
    }
  }

  /// Get activities by category
  Future<Map<ActivityCategory, List<CachedActivity>>> getActivitiesByCategory({
    AgeGroup? ageGroup,
  }) async {
    final result = <ActivityCategory, List<CachedActivity>>{};
    
    for (final category in ActivityCategory.values) {
      final activities = await getAvailableActivities(
        category: category,
        ageGroup: ageGroup,
      );
      if (activities.isNotEmpty) {
        result[category] = activities;
      }
    }
    
    return result;
  }

  /// Get activity by ID
  Future<CachedActivity?> getActivity(String id) async {
    // First check built-in activities
    final builtIn = CachedActivities.byId(id);
    if (builtIn != null) return builtIn;

    // Then check stored activities
    final stored = await _storage.getRegulationActivity(id);
    if (stored != null) {
      return CachedActivity.fromJson(stored);
    }

    return null;
  }

  /// Get recently used activities for a learner
  Future<List<CachedActivity>> getRecentActivities(String learnerId, {int limit = 5}) async {
    final prefs = await _storage.getPreferences(learnerId);
    if (prefs == null) return [];

    final recentIds = (prefs['recentActivityIds'] as List?)?.cast<String>() ?? [];
    final activities = <CachedActivity>[];

    for (final id in recentIds.take(limit)) {
      final activity = await getActivity(id);
      if (activity != null) {
        activities.add(activity);
      }
    }

    return activities;
  }

  /// Get favorite activities for a learner
  Future<List<CachedActivity>> getFavoriteActivities(String learnerId) async {
    final prefs = await _storage.getPreferences(learnerId);
    if (prefs == null) return [];

    final favoriteIds = (prefs['favoriteActivityIds'] as List?)?.cast<String>() ?? [];
    final activities = <CachedActivity>[];

    for (final id in favoriteIds) {
      final activity = await getActivity(id);
      if (activity != null) {
        activities.add(activity);
      }
    }

    return activities;
  }

  /// Mark activity as favorite
  Future<void> toggleFavorite(String learnerId, String activityId) async {
    final prefs = await _storage.getPreferences(learnerId) ?? {};
    final favoriteIds = (prefs['favoriteActivityIds'] as List?)?.cast<String>().toList() ?? [];

    if (favoriteIds.contains(activityId)) {
      favoriteIds.remove(activityId);
    } else {
      favoriteIds.add(activityId);
    }

    prefs['favoriteActivityIds'] = favoriteIds;
    await _storage.savePreferences(learnerId, prefs);
  }

  /// Check if activity is favorite
  Future<bool> isFavorite(String learnerId, String activityId) async {
    final prefs = await _storage.getPreferences(learnerId);
    if (prefs == null) return false;

    final favoriteIds = (prefs['favoriteActivityIds'] as List?)?.cast<String>() ?? [];
    return favoriteIds.contains(activityId);
  }

  /// Record activity usage
  Future<void> recordActivityUsage({
    required String learnerId,
    required String activityId,
    required int durationSeconds,
    bool completed = true,
    int? stoppedAtStep,
    String? feedback,
    int? moodBefore,
    int? moodAfter,
  }) async {
    // Save usage data
    final usage = {
      'learnerId': learnerId,
      'activityId': activityId,
      'timestamp': DateTime.now().toIso8601String(),
      'durationSeconds': durationSeconds,
      'completed': completed,
      'stoppedAtStep': stoppedAtStep,
      'feedback': feedback,
      'moodBefore': moodBefore,
      'moodAfter': moodAfter,
      'synced': false,
    };

    await _storage.saveActivityUsage(usage);

    // Update recent activities list
    await _updateRecentActivities(learnerId, activityId);

    // Try to sync if online
    if (_offlineManager.isOnline) {
      await _syncUsageData();
    }
  }

  Future<void> _updateRecentActivities(String learnerId, String activityId) async {
    final prefs = await _storage.getPreferences(learnerId) ?? {};
    final recentIds = (prefs['recentActivityIds'] as List?)?.cast<String>().toList() ?? [];

    // Remove if already in list
    recentIds.remove(activityId);
    
    // Add to front
    recentIds.insert(0, activityId);
    
    // Keep only last 10
    if (recentIds.length > 10) {
      recentIds.removeRange(10, recentIds.length);
    }

    prefs['recentActivityIds'] = recentIds;
    await _storage.savePreferences(learnerId, prefs);
  }

  Future<void> _syncUsageData() async {
    // This would sync with the server in a real implementation
    // For now, just mark as synced
    try {
      final unsynced = await _storage.getUnsyncedUsage();
      for (final usage in unsynced) {
        // TODO: Send to server API
        // await _api.syncUsage(usage);
        debugPrint('Would sync usage: ${usage['activityId']}');
      }
    } catch (e) {
      debugPrint('Failed to sync usage data: $e');
    }
  }

  /// Get usage statistics for a learner
  Future<ActivityUsageStats> getUsageStats(String learnerId) async {
    final allUsage = await _storage.getUnsyncedUsage();
    final learnerUsage = allUsage.where((u) => u['learnerId'] == learnerId).toList();

    if (learnerUsage.isEmpty) {
      return ActivityUsageStats.empty();
    }

    final totalSessions = learnerUsage.length;
    final completedSessions = learnerUsage.where((u) => u['completed'] == true).length;
    final totalDuration = learnerUsage.fold<int>(
      0,
      (sum, u) => sum + (u['durationSeconds'] as int? ?? 0),
    );

    // Count by category
    final categoryCount = <ActivityCategory, int>{};
    for (final usage in learnerUsage) {
      final activity = await getActivity(usage['activityId'] as String);
      if (activity != null) {
        categoryCount[activity.category] = (categoryCount[activity.category] ?? 0) + 1;
      }
    }

    // Find favorite category
    ActivityCategory? favoriteCategory;
    int maxCount = 0;
    for (final entry in categoryCount.entries) {
      if (entry.value > maxCount) {
        maxCount = entry.value;
        favoriteCategory = entry.key;
      }
    }

    return ActivityUsageStats(
      totalSessions: totalSessions,
      completedSessions: completedSessions,
      totalDurationSeconds: totalDuration,
      sessionsByCategory: categoryCount,
      favoriteCategory: favoriteCategory,
    );
  }

  /// Get recommended activities based on usage history and current mood
  Future<List<CachedActivity>> getRecommendedActivities({
    required String learnerId,
    String? currentMood,
    int limit = 3,
  }) async {
    final favorites = await getFavoriteActivities(learnerId);
    final recentActivities = await getRecentActivities(learnerId);
    final stats = await getUsageStats(learnerId);

    final recommendations = <CachedActivity>[];
    final usedIds = <String>{};
    
    // Exclude recently used activities from recommendations
    for (final activity in recentActivities) {
      usedIds.add(activity.id);
    }

    // Add a favorite if available
    if (favorites.isNotEmpty) {
      final favorite = favorites.firstWhere(
        (f) => !usedIds.contains(f.id),
        orElse: () => favorites.first,
      );
      recommendations.add(favorite);
      usedIds.add(favorite.id);
    }

    // Add from favorite category
    if (stats.favoriteCategory != null) {
      final categoryActivities = await getAvailableActivities(
        category: stats.favoriteCategory,
      );
      for (final activity in categoryActivities) {
        if (!usedIds.contains(activity.id)) {
          recommendations.add(activity);
          usedIds.add(activity.id);
          break;
        }
      }
    }

    // Add mood-based recommendations
    if (currentMood != null) {
      final moodTags = _getMoodTags(currentMood);
      for (final tag in moodTags) {
        if (recommendations.length >= limit) break;
        final tagActivities = CachedActivities.byTag(tag);
        for (final activity in tagActivities) {
          if (!usedIds.contains(activity.id)) {
            recommendations.add(activity);
            usedIds.add(activity.id);
            break;
          }
        }
      }
    }

    // Fill remaining slots with diverse activities
    while (recommendations.length < limit) {
      for (final category in ActivityCategory.values) {
        if (recommendations.length >= limit) break;
        final activities = await getAvailableActivities(category: category);
        for (final activity in activities) {
          if (!usedIds.contains(activity.id)) {
            recommendations.add(activity);
            usedIds.add(activity.id);
            break;
          }
        }
      }
      break; // Prevent infinite loop
    }

    return recommendations.take(limit).toList();
  }

  List<String> _getMoodTags(String mood) {
    switch (mood.toLowerCase()) {
      case 'anxious':
      case 'worried':
        return ['calm', 'anxiety', 'grounding'];
      case 'angry':
      case 'frustrated':
        return ['release', 'energy', 'movement'];
      case 'sad':
        return ['comfort', 'gentle', 'soothing'];
      case 'overwhelmed':
        return ['simple', 'calm', 'focus'];
      case 'tired':
        return ['gentle', 'relax', 'energy'];
      case 'restless':
        return ['movement', 'energy', 'shake'];
      default:
        return ['calm', 'focus'];
    }
  }

  /// Save learner preferences
  Future<void> savePreferences({
    required String learnerId,
    AgeGroup? preferredAgeGroup,
    List<ActivityCategory>? preferredCategories,
    bool? enableAudio,
    bool? enableVibration,
    bool? enableAnimations,
    int? defaultDurationSeconds,
  }) async {
    final existing = await _storage.getPreferences(learnerId) ?? {};

    if (preferredAgeGroup != null) {
      existing['preferredAgeGroup'] = preferredAgeGroup.name;
    }
    if (preferredCategories != null) {
      existing['preferredCategories'] = preferredCategories.map((c) => c.name).toList();
    }
    if (enableAudio != null) {
      existing['enableAudio'] = enableAudio;
    }
    if (enableVibration != null) {
      existing['enableVibration'] = enableVibration;
    }
    if (enableAnimations != null) {
      existing['enableAnimations'] = enableAnimations;
    }
    if (defaultDurationSeconds != null) {
      existing['defaultDurationSeconds'] = defaultDurationSeconds;
    }

    await _storage.savePreferences(learnerId, existing);
  }

  /// Get learner preferences
  Future<LearnerRegulationPreferences?> getPreferencesForLearner(String learnerId) async {
    final prefs = await _storage.getPreferences(learnerId);
    if (prefs == null) return null;

    return LearnerRegulationPreferences.fromJson(prefs);
  }
}

/// Usage statistics model
class ActivityUsageStats {
  final int totalSessions;
  final int completedSessions;
  final int totalDurationSeconds;
  final Map<ActivityCategory, int> sessionsByCategory;
  final ActivityCategory? favoriteCategory;

  ActivityUsageStats({
    required this.totalSessions,
    required this.completedSessions,
    required this.totalDurationSeconds,
    required this.sessionsByCategory,
    this.favoriteCategory,
  });

  factory ActivityUsageStats.empty() => ActivityUsageStats(
    totalSessions: 0,
    completedSessions: 0,
    totalDurationSeconds: 0,
    sessionsByCategory: {},
    favoriteCategory: null,
  );

  double get completionRate =>
      totalSessions > 0 ? completedSessions / totalSessions : 0.0;

  Duration get totalDuration => Duration(seconds: totalDurationSeconds);
  
  Duration get averageSessionDuration =>
      totalSessions > 0
          ? Duration(seconds: totalDurationSeconds ~/ totalSessions)
          : Duration.zero;
}

/// Learner preferences model
class LearnerRegulationPreferences {
  final AgeGroup? preferredAgeGroup;
  final List<ActivityCategory> preferredCategories;
  final bool enableAudio;
  final bool enableVibration;
  final bool enableAnimations;
  final int defaultDurationSeconds;
  final List<String> favoriteActivityIds;
  final List<String> recentActivityIds;

  LearnerRegulationPreferences({
    this.preferredAgeGroup,
    this.preferredCategories = const [],
    this.enableAudio = true,
    this.enableVibration = true,
    this.enableAnimations = true,
    this.defaultDurationSeconds = 60,
    this.favoriteActivityIds = const [],
    this.recentActivityIds = const [],
  });

  factory LearnerRegulationPreferences.fromJson(Map<String, dynamic> json) {
    return LearnerRegulationPreferences(
      preferredAgeGroup: json['preferredAgeGroup'] != null
          ? AgeGroup.values.firstWhere(
              (a) => a.name == json['preferredAgeGroup'],
              orElse: () => AgeGroup.all,
            )
          : null,
      preferredCategories: (json['preferredCategories'] as List?)
          ?.map((c) => ActivityCategory.values.firstWhere(
                (cat) => cat.name == c,
                orElse: () => ActivityCategory.breathing,
              ))
          .toList() ?? [],
      enableAudio: json['enableAudio'] as bool? ?? true,
      enableVibration: json['enableVibration'] as bool? ?? true,
      enableAnimations: json['enableAnimations'] as bool? ?? true,
      defaultDurationSeconds: json['defaultDurationSeconds'] as int? ?? 60,
      favoriteActivityIds: (json['favoriteActivityIds'] as List?)?.cast<String>() ?? [],
      recentActivityIds: (json['recentActivityIds'] as List?)?.cast<String>() ?? [],
    );
  }

  Map<String, dynamic> toJson() => {
    'preferredAgeGroup': preferredAgeGroup?.name,
    'preferredCategories': preferredCategories.map((c) => c.name).toList(),
    'enableAudio': enableAudio,
    'enableVibration': enableVibration,
    'enableAnimations': enableAnimations,
    'defaultDurationSeconds': defaultDurationSeconds,
    'favoriteActivityIds': favoriteActivityIds,
    'recentActivityIds': recentActivityIds,
  };
}

// === Riverpod Providers ===

final offlineStorageProvider = Provider<OfflineStorage>((ref) {
  return OfflineStorage();
});

final offlineManagerProvider = Provider<OfflineManager>((ref) {
  return OfflineManager.instance;
});

final offlineRegulationServiceProvider = Provider<OfflineRegulationService>((ref) {
  return OfflineRegulationService(
    storage: ref.watch(offlineStorageProvider),
    offlineManager: ref.watch(offlineManagerProvider),
  );
});

/// Provider for available activities with optional filters
final availableActivitiesProvider = FutureProvider.autoDispose
    .family<List<CachedActivity>, ActivityFilters>((ref, filters) async {
  final service = ref.watch(offlineRegulationServiceProvider);
  return service.getAvailableActivities(
    category: filters.category,
    ageGroup: filters.ageGroup,
    difficulty: filters.difficulty,
    tag: filters.tag,
    offlineOnly: filters.offlineOnly,
  );
});

/// Provider for recommended activities
final recommendedActivitiesProvider = FutureProvider.autoDispose
    .family<List<CachedActivity>, RecommendationParams>((ref, params) async {
  final service = ref.watch(offlineRegulationServiceProvider);
  return service.getRecommendedActivities(
    learnerId: params.learnerId,
    currentMood: params.currentMood,
    limit: params.limit,
  );
});

/// Filter parameters for activities
class ActivityFilters {
  final ActivityCategory? category;
  final AgeGroup? ageGroup;
  final ActivityDifficulty? difficulty;
  final String? tag;
  final bool offlineOnly;

  const ActivityFilters({
    this.category,
    this.ageGroup,
    this.difficulty,
    this.tag,
    this.offlineOnly = false,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ActivityFilters &&
          runtimeType == other.runtimeType &&
          category == other.category &&
          ageGroup == other.ageGroup &&
          difficulty == other.difficulty &&
          tag == other.tag &&
          offlineOnly == other.offlineOnly;

  @override
  int get hashCode =>
      category.hashCode ^
      ageGroup.hashCode ^
      difficulty.hashCode ^
      tag.hashCode ^
      offlineOnly.hashCode;
}

/// Parameters for recommendations
class RecommendationParams {
  final String learnerId;
  final String? currentMood;
  final int limit;

  const RecommendationParams({
    required this.learnerId,
    this.currentMood,
    this.limit = 3,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RecommendationParams &&
          runtimeType == other.runtimeType &&
          learnerId == other.learnerId &&
          currentMood == other.currentMood &&
          limit == other.limit;

  @override
  int get hashCode =>
      learnerId.hashCode ^ currentMood.hashCode ^ limit.hashCode;
}
