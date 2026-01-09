import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const _baseUrl = String.fromEnvironment(
  'PARENT_API_BASE_URL',
  defaultValue: 'http://localhost:3010',
);

const _useMock = bool.fromEnvironment('USE_DIFFICULTY_MOCK', defaultValue: true);

/// Skill domain enum
enum SkillDomain {
  ELA('ELA', 'English Language Arts'),
  MATH('MATH', 'Mathematics'),
  SCIENCE('SCIENCE', 'Science'),
  SPEECH('SPEECH', 'Speech & Language'),
  SEL('SEL', 'Social-Emotional Learning');

  const SkillDomain(this.code, this.displayName);
  final String code;
  final String displayName;

  static SkillDomain? fromCode(String? code) {
    if (code == null) return null;
    return SkillDomain.values.where((d) => d.code == code).firstOrNull;
  }
}

/// Status of a difficulty recommendation
enum DifficultyRecommendationStatus {
  pending('PENDING'),
  approved('APPROVED'),
  modified('MODIFIED'),
  denied('DENIED'),
  autoApplied('AUTO_APPLIED'),
  expired('EXPIRED');

  const DifficultyRecommendationStatus(this.value);
  final String value;

  static DifficultyRecommendationStatus fromValue(String value) {
    return DifficultyRecommendationStatus.values.firstWhere(
      (s) => s.value == value,
      orElse: () => DifficultyRecommendationStatus.pending,
    );
  }
}

/// Evidence supporting a difficulty recommendation
class DifficultyEvidence {
  const DifficultyEvidence({
    required this.masteryScore,
    required this.recentAccuracy,
    required this.practiceCount,
    required this.consecutiveSuccesses,
  });

  final double masteryScore;
  final double recentAccuracy;
  final int practiceCount;
  final int consecutiveSuccesses;

  factory DifficultyEvidence.fromJson(Map<String, dynamic> json) {
    return DifficultyEvidence(
      masteryScore: (json['masteryScore'] as num?)?.toDouble() ?? 0.0,
      recentAccuracy: (json['recentAccuracy'] as num?)?.toDouble() ?? 0.0,
      practiceCount: json['practiceCount'] as int? ?? 0,
      consecutiveSuccesses: json['consecutiveSuccesses'] as int? ?? 0,
    );
  }

  String get masteryPercentage => '${(masteryScore * 100).round()}%';
  String get accuracyPercentage => '${(recentAccuracy * 100).round()}%';
}

/// A pending difficulty recommendation awaiting parent approval
class PendingDifficultyRecommendation {
  const PendingDifficultyRecommendation({
    required this.id,
    required this.domain,
    required this.currentLevel,
    required this.recommendedLevel,
    required this.reasonTitle,
    required this.reasonDescription,
    required this.evidence,
    required this.expiresAt,
    required this.createdAt,
  });

  final String id;
  final SkillDomain? domain;
  final int currentLevel;
  final int recommendedLevel;
  final String reasonTitle;
  final String reasonDescription;
  final DifficultyEvidence evidence;
  final DateTime expiresAt;
  final DateTime createdAt;

  factory PendingDifficultyRecommendation.fromJson(Map<String, dynamic> json) {
    return PendingDifficultyRecommendation(
      id: json['id'] as String,
      domain: SkillDomain.fromCode(json['domain'] as String?),
      currentLevel: json['currentLevel'] as int,
      recommendedLevel: json['recommendedLevel'] as int,
      reasonTitle: json['reasonTitle'] as String,
      reasonDescription: json['reasonDescription'] as String,
      evidence: DifficultyEvidence.fromJson(
        json['evidence'] as Map<String, dynamic>? ?? {},
      ),
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  bool get isIncrease => recommendedLevel > currentLevel;
  bool get isDecrease => recommendedLevel < currentLevel;
  String get domainDisplayName => domain?.displayName ?? 'Overall';

  Duration get timeRemaining => expiresAt.difference(DateTime.now());
  bool get isExpired => DateTime.now().isAfter(expiresAt);
}

/// Response from getting pending recommendations
class PendingRecommendationsResponse {
  const PendingRecommendationsResponse({
    required this.studentId,
    required this.pendingCount,
    required this.recommendations,
  });

  final String studentId;
  final int pendingCount;
  final List<PendingDifficultyRecommendation> recommendations;

  factory PendingRecommendationsResponse.fromJson(Map<String, dynamic> json) {
    return PendingRecommendationsResponse(
      studentId: json['learnerId'] as String? ?? json['studentId'] as String,
      pendingCount: json['pendingCount'] as int? ?? 0,
      recommendations: (json['recommendations'] as List<dynamic>?)
              ?.map((r) => PendingDifficultyRecommendation.fromJson(
                  r as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

/// Parent's difficulty preferences for a child
class DifficultyPreferences {
  const DifficultyPreferences({
    this.autoApproveIncreases = false,
    this.autoApproveDecreases = false,
    this.notifyOnRecommendation = true,
    this.domainOverrides,
    this.maxDifficultyLevel,
    this.minDifficultyLevel,
  });

  final bool autoApproveIncreases;
  final bool autoApproveDecreases;
  final bool notifyOnRecommendation;
  final Map<String, DomainOverride>? domainOverrides;
  final int? maxDifficultyLevel;
  final int? minDifficultyLevel;

  factory DifficultyPreferences.fromJson(Map<String, dynamic> json) {
    final overridesJson = json['domainOverrides'] as Map<String, dynamic>?;
    Map<String, DomainOverride>? overrides;
    if (overridesJson != null) {
      overrides = overridesJson.map(
        (key, value) => MapEntry(
          key,
          DomainOverride.fromJson(value as Map<String, dynamic>),
        ),
      );
    }

    return DifficultyPreferences(
      autoApproveIncreases: json['autoApproveIncreases'] as bool? ?? false,
      autoApproveDecreases: json['autoApproveDecreases'] as bool? ?? false,
      notifyOnRecommendation: json['notifyOnRecommendation'] as bool? ?? true,
      domainOverrides: overrides,
      maxDifficultyLevel: json['maxDifficultyLevel'] as int?,
      minDifficultyLevel: json['minDifficultyLevel'] as int?,
    );
  }

  Map<String, dynamic> toJson() => {
        'autoApproveIncreases': autoApproveIncreases,
        'autoApproveDecreases': autoApproveDecreases,
        'notifyOnRecommendation': notifyOnRecommendation,
        'maxDifficultyLevel': maxDifficultyLevel,
        'minDifficultyLevel': minDifficultyLevel,
      };

  DifficultyPreferences copyWith({
    bool? autoApproveIncreases,
    bool? autoApproveDecreases,
    bool? notifyOnRecommendation,
    Map<String, DomainOverride>? domainOverrides,
    int? maxDifficultyLevel,
    int? minDifficultyLevel,
  }) {
    return DifficultyPreferences(
      autoApproveIncreases: autoApproveIncreases ?? this.autoApproveIncreases,
      autoApproveDecreases: autoApproveDecreases ?? this.autoApproveDecreases,
      notifyOnRecommendation:
          notifyOnRecommendation ?? this.notifyOnRecommendation,
      domainOverrides: domainOverrides ?? this.domainOverrides,
      maxDifficultyLevel: maxDifficultyLevel ?? this.maxDifficultyLevel,
      minDifficultyLevel: minDifficultyLevel ?? this.minDifficultyLevel,
    );
  }
}

/// A domain-specific difficulty override set by the parent
class DomainOverride {
  const DomainOverride({
    required this.lockedLevel,
    this.reason,
    this.lockedAt,
  });

  final int lockedLevel;
  final String? reason;
  final DateTime? lockedAt;

  factory DomainOverride.fromJson(Map<String, dynamic> json) {
    return DomainOverride(
      lockedLevel: json['lockedLevel'] as int,
      reason: json['reason'] as String?,
      lockedAt: json['lockedAt'] != null
          ? DateTime.parse(json['lockedAt'] as String)
          : null,
    );
  }
}

/// Current difficulty level for a domain
class DifficultyLevel {
  const DifficultyLevel({
    required this.level,
    required this.source,
  });

  final int level;
  final String source;

  factory DifficultyLevel.fromJson(Map<String, dynamic> json) {
    return DifficultyLevel(
      level: json['level'] as int,
      source: json['source'] as String,
    );
  }

  bool get isParentOverride => source == 'parent_override';
  bool get isCalculated => source == 'calculated';
  bool get isDefault => source == 'default';

  String get levelLabel {
    switch (level) {
      case 1:
        return 'Very Easy';
      case 2:
        return 'Easy';
      case 3:
        return 'Medium';
      case 4:
        return 'Challenging';
      case 5:
        return 'Advanced';
      default:
        return 'Level $level';
    }
  }
}

/// A record of a difficulty change
class DifficultyChangeRecord {
  const DifficultyChangeRecord({
    required this.id,
    required this.domain,
    required this.previousLevel,
    required this.newLevel,
    required this.changeSource,
    required this.changedByType,
    required this.wasEffective,
    required this.createdAt,
  });

  final String id;
  final SkillDomain? domain;
  final int previousLevel;
  final int newLevel;
  final String changeSource;
  final String changedByType;
  final bool? wasEffective;
  final DateTime createdAt;

  factory DifficultyChangeRecord.fromJson(Map<String, dynamic> json) {
    return DifficultyChangeRecord(
      id: json['id'] as String,
      domain: SkillDomain.fromCode(json['domain'] as String?),
      previousLevel: json['previousLevel'] as int,
      newLevel: json['newLevel'] as int,
      changeSource: json['changeSource'] as String,
      changedByType: json['changedByType'] as String,
      wasEffective: json['wasEffective'] as bool?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  bool get isIncrease => newLevel > previousLevel;
  bool get isDecrease => newLevel < previousLevel;
  String get domainDisplayName => domain?.displayName ?? 'Overall';
}

/// Response from responding to a recommendation
class RespondToRecommendationResponse {
  const RespondToRecommendationResponse({
    required this.success,
    required this.status,
    this.appliedLevel,
    required this.message,
  });

  final bool success;
  final DifficultyRecommendationStatus status;
  final int? appliedLevel;
  final String message;

  factory RespondToRecommendationResponse.fromJson(Map<String, dynamic> json) {
    return RespondToRecommendationResponse(
      success: json['success'] as bool,
      status: DifficultyRecommendationStatus.fromValue(json['status'] as String),
      appliedLevel: json['appliedLevel'] as int?,
      message: json['message'] as String,
    );
  }
}

/// Service for managing difficulty adjustments and parent approvals
class DifficultyService {
  DifficultyService({String? accessToken}) {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      headers: accessToken != null
          ? {'Authorization': 'Bearer $accessToken'}
          : null,
    ));
  }

  late final Dio _dio;

  /// Get pending difficulty recommendations for a child
  Future<PendingRecommendationsResponse> getPendingRecommendations(
      String studentId) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return _mockPendingRecommendations(studentId);
    }

    final response = await _dio.get(
      '/parent/students/$studentId/difficulty/recommendations',
    );
    return PendingRecommendationsResponse.fromJson(
        response.data as Map<String, dynamic>);
  }

  /// Respond to a difficulty recommendation (approve, modify, or deny)
  Future<RespondToRecommendationResponse> respondToRecommendation({
    required String recommendationId,
    required String action, // 'approve', 'modify', 'deny'
    int? modifiedLevel,
    String? parentNotes,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockRespondToRecommendation(action, modifiedLevel);
    }

    final response = await _dio.post(
      '/parent/difficulty/recommendations/respond',
      data: {
        'recommendationId': recommendationId,
        'action': action,
        if (modifiedLevel != null) 'modifiedLevel': modifiedLevel,
        if (parentNotes != null) 'parentNotes': parentNotes,
      },
    );
    return RespondToRecommendationResponse.fromJson(
        response.data as Map<String, dynamic>);
  }

  /// Get current difficulty levels for a child by domain
  Future<Map<SkillDomain, DifficultyLevel>> getDifficultyLevels(
      String studentId) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return _mockDifficultyLevels();
    }

    final response = await _dio.get(
      '/parent/students/$studentId/difficulty/levels',
    );
    final levelsJson =
        (response.data as Map<String, dynamic>)['levels'] as Map<String, dynamic>;

    return levelsJson.map((key, value) {
      final domain = SkillDomain.fromCode(key);
      if (domain == null) {
        throw Exception('Unknown domain: $key');
      }
      return MapEntry(
        domain,
        DifficultyLevel.fromJson(value as Map<String, dynamic>),
      );
    });
  }

  /// Set difficulty level for a specific domain (parent override)
  Future<void> setDomainDifficulty({
    required String studentId,
    required SkillDomain domain,
    required int level,
    String? reason,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return;
    }

    await _dio.post(
      '/parent/difficulty/domain/set',
      data: {
        'studentId': studentId,
        'domain': domain.code,
        'level': level,
        if (reason != null) 'reason': reason,
      },
    );
  }

  /// Get difficulty preferences for a child
  Future<DifficultyPreferences> getPreferences(String studentId) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return _mockPreferences();
    }

    final response = await _dio.get(
      '/parent/students/$studentId/difficulty/preferences',
    );
    final prefsJson =
        (response.data as Map<String, dynamic>)['preferences'] as Map<String, dynamic>;
    return DifficultyPreferences.fromJson(prefsJson);
  }

  /// Update difficulty preferences for a child
  Future<DifficultyPreferences> updatePreferences({
    required String studentId,
    bool? autoApproveIncreases,
    bool? autoApproveDecreases,
    bool? notifyOnRecommendation,
    int? maxDifficultyLevel,
    int? minDifficultyLevel,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockPreferences().copyWith(
        autoApproveIncreases: autoApproveIncreases,
        autoApproveDecreases: autoApproveDecreases,
        notifyOnRecommendation: notifyOnRecommendation,
        maxDifficultyLevel: maxDifficultyLevel,
        minDifficultyLevel: minDifficultyLevel,
      );
    }

    final response = await _dio.put(
      '/parent/difficulty/preferences',
      data: {
        'studentId': studentId,
        if (autoApproveIncreases != null)
          'autoApproveIncreases': autoApproveIncreases,
        if (autoApproveDecreases != null)
          'autoApproveDecreases': autoApproveDecreases,
        if (notifyOnRecommendation != null)
          'notifyOnRecommendation': notifyOnRecommendation,
        if (maxDifficultyLevel != null) 'maxDifficultyLevel': maxDifficultyLevel,
        if (minDifficultyLevel != null) 'minDifficultyLevel': minDifficultyLevel,
      },
    );
    final prefsJson =
        (response.data as Map<String, dynamic>)['preferences'] as Map<String, dynamic>;
    return DifficultyPreferences.fromJson(prefsJson);
  }

  /// Get difficulty change history for a child
  Future<List<DifficultyChangeRecord>> getDifficultyHistory(
    String studentId, {
    int limit = 20,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return _mockDifficultyHistory();
    }

    final response = await _dio.get(
      '/parent/students/$studentId/difficulty/history',
      queryParameters: {'limit': limit},
    );
    final historyJson =
        (response.data as Map<String, dynamic>)['history'] as List<dynamic>;
    return historyJson
        .map((h) => DifficultyChangeRecord.fromJson(h as Map<String, dynamic>))
        .toList();
  }

  // Mock implementations
  PendingRecommendationsResponse _mockPendingRecommendations(String studentId) {
    return PendingRecommendationsResponse(
      studentId: studentId,
      pendingCount: 2,
      recommendations: [
        PendingDifficultyRecommendation(
          id: 'rec-1',
          domain: SkillDomain.MATH,
          currentLevel: 3,
          recommendedLevel: 4,
          reasonTitle: 'Ready for More Challenge in Mathematics',
          reasonDescription:
              'Your child has been doing great in Mathematics! They\'ve achieved 85% accuracy over their last 15 activities with 6 correct answers in a row. We recommend moving from Level 3 to Level 4 to keep them challenged and engaged.',
          evidence: const DifficultyEvidence(
            masteryScore: 0.82,
            recentAccuracy: 0.85,
            practiceCount: 15,
            consecutiveSuccesses: 6,
          ),
          expiresAt: DateTime.now().add(const Duration(days: 5)),
          createdAt: DateTime.now().subtract(const Duration(days: 2)),
        ),
        PendingDifficultyRecommendation(
          id: 'rec-2',
          domain: SkillDomain.ELA,
          currentLevel: 3,
          recommendedLevel: 2,
          reasonTitle: 'Adjustment Recommended in English Language Arts',
          reasonDescription:
              'We\'ve noticed your child is finding English Language Arts activities challenging. Their recent accuracy is 35% over 8 activities. To build their confidence and foundational skills, we recommend adjusting from Level 3 to Level 2.',
          evidence: const DifficultyEvidence(
            masteryScore: 0.32,
            recentAccuracy: 0.35,
            practiceCount: 8,
            consecutiveSuccesses: 0,
          ),
          expiresAt: DateTime.now().add(const Duration(days: 6)),
          createdAt: DateTime.now().subtract(const Duration(days: 1)),
        ),
      ],
    );
  }

  RespondToRecommendationResponse _mockRespondToRecommendation(
    String action,
    int? modifiedLevel,
  ) {
    switch (action) {
      case 'approve':
        return const RespondToRecommendationResponse(
          success: true,
          status: DifficultyRecommendationStatus.approved,
          appliedLevel: 4,
          message: 'Difficulty change approved and applied',
        );
      case 'modify':
        return RespondToRecommendationResponse(
          success: true,
          status: DifficultyRecommendationStatus.modified,
          appliedLevel: modifiedLevel,
          message: 'Difficulty change modified to level $modifiedLevel and applied',
        );
      case 'deny':
        return const RespondToRecommendationResponse(
          success: true,
          status: DifficultyRecommendationStatus.denied,
          message: 'Difficulty change denied',
        );
      default:
        return const RespondToRecommendationResponse(
          success: false,
          status: DifficultyRecommendationStatus.pending,
          message: 'Invalid action',
        );
    }
  }

  Map<SkillDomain, DifficultyLevel> _mockDifficultyLevels() {
    return {
      SkillDomain.ELA: const DifficultyLevel(level: 3, source: 'calculated'),
      SkillDomain.MATH: const DifficultyLevel(level: 4, source: 'calculated'),
      SkillDomain.SCIENCE: const DifficultyLevel(level: 3, source: 'default'),
      SkillDomain.SPEECH: const DifficultyLevel(level: 2, source: 'parent_override'),
      SkillDomain.SEL: const DifficultyLevel(level: 3, source: 'calculated'),
    };
  }

  DifficultyPreferences _mockPreferences() {
    return const DifficultyPreferences(
      autoApproveIncreases: false,
      autoApproveDecreases: false,
      notifyOnRecommendation: true,
      maxDifficultyLevel: 5,
      minDifficultyLevel: 1,
    );
  }

  List<DifficultyChangeRecord> _mockDifficultyHistory() {
    return [
      DifficultyChangeRecord(
        id: 'history-1',
        domain: SkillDomain.MATH,
        previousLevel: 2,
        newLevel: 3,
        changeSource: 'system_recommendation',
        changedByType: 'parent',
        wasEffective: true,
        createdAt: DateTime.now().subtract(const Duration(days: 14)),
      ),
      DifficultyChangeRecord(
        id: 'history-2',
        domain: SkillDomain.SPEECH,
        previousLevel: 3,
        newLevel: 2,
        changeSource: 'parent_override',
        changedByType: 'parent',
        wasEffective: null,
        createdAt: DateTime.now().subtract(const Duration(days: 7)),
      ),
    ];
  }
}

// Providers

/// Provider for DifficultyService
final difficultyServiceProvider =
    Provider<DifficultyService>((ref) => DifficultyService());

/// Provider for pending difficulty recommendations
final pendingRecommendationsProvider = FutureProvider.family<
    PendingRecommendationsResponse, String>(
  (ref, studentId) async {
    final service = ref.read(difficultyServiceProvider);
    return service.getPendingRecommendations(studentId);
  },
);

/// Provider for current difficulty levels
final difficultyLevelsProvider =
    FutureProvider.family<Map<SkillDomain, DifficultyLevel>, String>(
  (ref, studentId) async {
    final service = ref.read(difficultyServiceProvider);
    return service.getDifficultyLevels(studentId);
  },
);

/// Provider for difficulty preferences
final difficultyPreferencesProvider =
    FutureProvider.family<DifficultyPreferences, String>(
  (ref, studentId) async {
    final service = ref.read(difficultyServiceProvider);
    return service.getPreferences(studentId);
  },
);

/// Provider for difficulty change history
final difficultyHistoryProvider =
    FutureProvider.family<List<DifficultyChangeRecord>, String>(
  (ref, studentId) async {
    final service = ref.read(difficultyServiceProvider);
    return service.getDifficultyHistory(studentId);
  },
);
