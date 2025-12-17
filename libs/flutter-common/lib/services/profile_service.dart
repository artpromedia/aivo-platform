/// Profile Service
///
/// Manages user profiles, settings, and preferences.
library;

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Learner profile with detailed information.
class LearnerProfile {
  const LearnerProfile({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.displayName,
    this.avatarUrl,
    this.gradeLevel,
    this.birthDate,
    required this.tenantId,
    this.classroomIds = const [],
    this.preferences = const LearnerPreferences(),
    this.stats,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String firstName;
  final String lastName;
  final String? displayName;
  final String? avatarUrl;
  final String? gradeLevel;
  final DateTime? birthDate;
  final String tenantId;
  final List<String> classroomIds;
  final LearnerPreferences preferences;
  final LearnerStats? stats;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  String get fullName =>
      displayName ?? '$firstName $lastName';
  String get initials =>
      '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}'
          .toUpperCase();

  factory LearnerProfile.fromJson(Map<String, dynamic> json) {
    return LearnerProfile(
      id: json['id'] as String,
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      displayName: json['displayName'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      gradeLevel: json['gradeLevel'] as String?,
      birthDate: json['birthDate'] != null
          ? DateTime.parse(json['birthDate'] as String)
          : null,
      tenantId: json['tenantId'] as String,
      classroomIds:
          (json['classroomIds'] as List<dynamic>?)?.cast<String>() ?? [],
      preferences: json['preferences'] != null
          ? LearnerPreferences.fromJson(
              json['preferences'] as Map<String, dynamic>)
          : const LearnerPreferences(),
      stats: json['stats'] != null
          ? LearnerStats.fromJson(json['stats'] as Map<String, dynamic>)
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'firstName': firstName,
        'lastName': lastName,
        'displayName': displayName,
        'avatarUrl': avatarUrl,
        'gradeLevel': gradeLevel,
        'birthDate': birthDate?.toIso8601String(),
        'tenantId': tenantId,
        'classroomIds': classroomIds,
        'preferences': preferences.toJson(),
        'stats': stats?.toJson(),
        'createdAt': createdAt?.toIso8601String(),
        'updatedAt': updatedAt?.toIso8601String(),
      };

  LearnerProfile copyWith({
    String? id,
    String? firstName,
    String? lastName,
    String? displayName,
    String? avatarUrl,
    String? gradeLevel,
    DateTime? birthDate,
    String? tenantId,
    List<String>? classroomIds,
    LearnerPreferences? preferences,
    LearnerStats? stats,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return LearnerProfile(
      id: id ?? this.id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      displayName: displayName ?? this.displayName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      gradeLevel: gradeLevel ?? this.gradeLevel,
      birthDate: birthDate ?? this.birthDate,
      tenantId: tenantId ?? this.tenantId,
      classroomIds: classroomIds ?? this.classroomIds,
      preferences: preferences ?? this.preferences,
      stats: stats ?? this.stats,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Learner preferences.
class LearnerPreferences {
  const LearnerPreferences({
    this.theme = 'system',
    this.fontSize = 'medium',
    this.soundEnabled = true,
    this.musicEnabled = true,
    this.hapticFeedback = true,
    this.autoPlayVideos = true,
    this.showHints = true,
    this.readAloudEnabled = false,
    this.highContrastMode = false,
    this.reducedMotion = false,
    this.language = 'en',
    this.avatarId,
    this.favoriteSubjects = const [],
    this.dailyGoalMinutes = 15,
    this.notificationsEnabled = true,
    this.reminderTime,
  });

  final String theme;
  final String fontSize;
  final bool soundEnabled;
  final bool musicEnabled;
  final bool hapticFeedback;
  final bool autoPlayVideos;
  final bool showHints;
  final bool readAloudEnabled;
  final bool highContrastMode;
  final bool reducedMotion;
  final String language;
  final String? avatarId;
  final List<String> favoriteSubjects;
  final int dailyGoalMinutes;
  final bool notificationsEnabled;
  final String? reminderTime;

  factory LearnerPreferences.fromJson(Map<String, dynamic> json) {
    return LearnerPreferences(
      theme: json['theme'] as String? ?? 'system',
      fontSize: json['fontSize'] as String? ?? 'medium',
      soundEnabled: json['soundEnabled'] as bool? ?? true,
      musicEnabled: json['musicEnabled'] as bool? ?? true,
      hapticFeedback: json['hapticFeedback'] as bool? ?? true,
      autoPlayVideos: json['autoPlayVideos'] as bool? ?? true,
      showHints: json['showHints'] as bool? ?? true,
      readAloudEnabled: json['readAloudEnabled'] as bool? ?? false,
      highContrastMode: json['highContrastMode'] as bool? ?? false,
      reducedMotion: json['reducedMotion'] as bool? ?? false,
      language: json['language'] as String? ?? 'en',
      avatarId: json['avatarId'] as String?,
      favoriteSubjects:
          (json['favoriteSubjects'] as List<dynamic>?)?.cast<String>() ?? [],
      dailyGoalMinutes: json['dailyGoalMinutes'] as int? ?? 15,
      notificationsEnabled: json['notificationsEnabled'] as bool? ?? true,
      reminderTime: json['reminderTime'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'theme': theme,
        'fontSize': fontSize,
        'soundEnabled': soundEnabled,
        'musicEnabled': musicEnabled,
        'hapticFeedback': hapticFeedback,
        'autoPlayVideos': autoPlayVideos,
        'showHints': showHints,
        'readAloudEnabled': readAloudEnabled,
        'highContrastMode': highContrastMode,
        'reducedMotion': reducedMotion,
        'language': language,
        'avatarId': avatarId,
        'favoriteSubjects': favoriteSubjects,
        'dailyGoalMinutes': dailyGoalMinutes,
        'notificationsEnabled': notificationsEnabled,
        'reminderTime': reminderTime,
      };

  LearnerPreferences copyWith({
    String? theme,
    String? fontSize,
    bool? soundEnabled,
    bool? musicEnabled,
    bool? hapticFeedback,
    bool? autoPlayVideos,
    bool? showHints,
    bool? readAloudEnabled,
    bool? highContrastMode,
    bool? reducedMotion,
    String? language,
    String? avatarId,
    List<String>? favoriteSubjects,
    int? dailyGoalMinutes,
    bool? notificationsEnabled,
    String? reminderTime,
  }) {
    return LearnerPreferences(
      theme: theme ?? this.theme,
      fontSize: fontSize ?? this.fontSize,
      soundEnabled: soundEnabled ?? this.soundEnabled,
      musicEnabled: musicEnabled ?? this.musicEnabled,
      hapticFeedback: hapticFeedback ?? this.hapticFeedback,
      autoPlayVideos: autoPlayVideos ?? this.autoPlayVideos,
      showHints: showHints ?? this.showHints,
      readAloudEnabled: readAloudEnabled ?? this.readAloudEnabled,
      highContrastMode: highContrastMode ?? this.highContrastMode,
      reducedMotion: reducedMotion ?? this.reducedMotion,
      language: language ?? this.language,
      avatarId: avatarId ?? this.avatarId,
      favoriteSubjects: favoriteSubjects ?? this.favoriteSubjects,
      dailyGoalMinutes: dailyGoalMinutes ?? this.dailyGoalMinutes,
      notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
      reminderTime: reminderTime ?? this.reminderTime,
    );
  }
}

/// Learner statistics summary.
class LearnerStats {
  const LearnerStats({
    this.totalXp = 0,
    this.level = 1,
    this.currentStreak = 0,
    this.longestStreak = 0,
    this.totalSessionsCompleted = 0,
    this.totalTimeMinutes = 0,
    this.badgesEarned = 0,
    this.subjectProgress = const {},
  });

  final int totalXp;
  final int level;
  final int currentStreak;
  final int longestStreak;
  final int totalSessionsCompleted;
  final int totalTimeMinutes;
  final int badgesEarned;
  final Map<String, double> subjectProgress;

  factory LearnerStats.fromJson(Map<String, dynamic> json) {
    return LearnerStats(
      totalXp: json['totalXp'] as int? ?? 0,
      level: json['level'] as int? ?? 1,
      currentStreak: json['currentStreak'] as int? ?? 0,
      longestStreak: json['longestStreak'] as int? ?? 0,
      totalSessionsCompleted: json['totalSessionsCompleted'] as int? ?? 0,
      totalTimeMinutes: json['totalTimeMinutes'] as int? ?? 0,
      badgesEarned: json['badgesEarned'] as int? ?? 0,
      subjectProgress: (json['subjectProgress'] as Map<String, dynamic>?)
              ?.map((k, v) => MapEntry(k, (v as num).toDouble())) ??
          {},
    );
  }

  Map<String, dynamic> toJson() => {
        'totalXp': totalXp,
        'level': level,
        'currentStreak': currentStreak,
        'longestStreak': longestStreak,
        'totalSessionsCompleted': totalSessionsCompleted,
        'totalTimeMinutes': totalTimeMinutes,
        'badgesEarned': badgesEarned,
        'subjectProgress': subjectProgress,
      };
}

/// Avatar options.
class Avatar {
  const Avatar({
    required this.id,
    required this.name,
    required this.imageUrl,
    this.category,
    this.unlockRequirement,
    this.isUnlocked = true,
  });

  final String id;
  final String name;
  final String imageUrl;
  final String? category;
  final String? unlockRequirement;
  final bool isUnlocked;

  factory Avatar.fromJson(Map<String, dynamic> json) {
    return Avatar(
      id: json['id'] as String,
      name: json['name'] as String,
      imageUrl: json['imageUrl'] as String,
      category: json['category'] as String?,
      unlockRequirement: json['unlockRequirement'] as String?,
      isUnlocked: json['isUnlocked'] as bool? ?? true,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Service for managing user profiles.
class ProfileService {
  ProfileService({
    required AivoApiClient apiClient,
  }) : _apiClient = apiClient;

  final AivoApiClient _apiClient;
  static const _baseUrl = '/profiles';

  // Cache
  LearnerProfile? _cachedProfile;
  String? _cachedProfileId;

  /// Get learner profile.
  Future<LearnerProfile> getProfile(
    String learnerId, {
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh &&
        _cachedProfile != null &&
        _cachedProfileId == learnerId) {
      return _cachedProfile!;
    }

    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_baseUrl/learners/$learnerId',
    );

    final profile = LearnerProfile.fromJson(response.data!);
    _cachedProfile = profile;
    _cachedProfileId = learnerId;

    return profile;
  }

  /// Update learner profile.
  Future<LearnerProfile> updateProfile({
    required String learnerId,
    String? firstName,
    String? lastName,
    String? displayName,
    String? gradeLevel,
    DateTime? birthDate,
  }) async {
    final response = await _apiClient.patch<Map<String, dynamic>>(
      '$_baseUrl/learners/$learnerId',
      data: {
        if (firstName != null) 'firstName': firstName,
        if (lastName != null) 'lastName': lastName,
        if (displayName != null) 'displayName': displayName,
        if (gradeLevel != null) 'gradeLevel': gradeLevel,
        if (birthDate != null) 'birthDate': birthDate.toIso8601String(),
      },
    );

    final profile = LearnerProfile.fromJson(response.data!);
    _cachedProfile = profile;
    _cachedProfileId = learnerId;

    return profile;
  }

  /// Update avatar.
  Future<void> updateAvatar({
    required String learnerId,
    required String avatarId,
  }) async {
    await _apiClient.patch(
      '$_baseUrl/learners/$learnerId/avatar',
      data: {'avatarId': avatarId},
    );

    // Update cache
    if (_cachedProfileId == learnerId && _cachedProfile != null) {
      _cachedProfile = _cachedProfile!.copyWith(
        preferences: _cachedProfile!.preferences.copyWith(avatarId: avatarId),
      );
    }
  }

  /// Get available avatars.
  Future<List<Avatar>> getAvatars({String? learnerId}) async {
    final response = await _apiClient.get<List<dynamic>>(
      '$_baseUrl/avatars',
      queryParameters: {
        if (learnerId != null) 'learnerId': learnerId,
      },
    );

    return (response.data ?? [])
        .map((a) => Avatar.fromJson(a as Map<String, dynamic>))
        .toList();
  }

  /// Update preferences.
  Future<LearnerPreferences> updatePreferences({
    required String learnerId,
    required Map<String, dynamic> preferences,
  }) async {
    final response = await _apiClient.patch<Map<String, dynamic>>(
      '$_baseUrl/learners/$learnerId/preferences',
      data: preferences,
    );

    final prefs = LearnerPreferences.fromJson(response.data!);

    // Update cache
    if (_cachedProfileId == learnerId && _cachedProfile != null) {
      _cachedProfile = _cachedProfile!.copyWith(preferences: prefs);
    }

    return prefs;
  }

  /// Get learner statistics.
  Future<LearnerStats> getStats(String learnerId) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_baseUrl/learners/$learnerId/stats',
    );

    return LearnerStats.fromJson(response.data!);
  }

  /// Get progress by subject.
  Future<Map<String, double>> getSubjectProgress(String learnerId) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_baseUrl/learners/$learnerId/progress',
    );

    return (response.data ?? {})
        .map((k, v) => MapEntry(k, (v as num).toDouble()));
  }

  /// Upload avatar image.
  Future<String> uploadAvatarImage({
    required String learnerId,
    required List<int> imageBytes,
    required String fileName,
  }) async {
    // Note: This would typically use multipart form data
    // For now, we'll assume base64 encoding
    final response = await _apiClient.post<Map<String, dynamic>>(
      '$_baseUrl/learners/$learnerId/avatar/upload',
      data: {
        'fileName': fileName,
        'image': imageBytes,
      },
    );

    return response.data?['avatarUrl'] as String? ?? '';
  }

  /// Delete account request.
  Future<void> requestAccountDeletion(String learnerId) async {
    await _apiClient.post('$_baseUrl/learners/$learnerId/delete-request');
  }

  /// Clear local cache.
  void clearCache() {
    _cachedProfile = null;
    _cachedProfileId = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIVERPOD PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for ProfileService.
final profileServiceProvider = Provider<ProfileService>((ref) {
  return ProfileService(
    apiClient: AivoApiClient.instance,
  );
});

/// Provider for learner profile.
final learnerProfileProvider =
    FutureProvider.family<LearnerProfile, String>((ref, learnerId) async {
  final service = ref.watch(profileServiceProvider);
  return service.getProfile(learnerId);
});

/// Provider for learner stats.
final learnerStatsProvider =
    FutureProvider.family<LearnerStats, String>((ref, learnerId) async {
  final service = ref.watch(profileServiceProvider);
  return service.getStats(learnerId);
});

/// Provider for available avatars.
final avatarsProvider = FutureProvider<List<Avatar>>((ref) async {
  final service = ref.watch(profileServiceProvider);
  return service.getAvatars();
});
