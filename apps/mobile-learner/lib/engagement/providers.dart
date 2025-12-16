/// Engagement state management with Riverpod
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'models.dart';
import 'service.dart';

/// State for engagement data
class EngagementState {
  const EngagementState({
    this.profile,
    this.badges = const [],
    this.badgeProgress = const [],
    this.unseenBadges = const [],
    this.kudos = const [],
    this.settings,
    this.isLoading = false,
    this.error,
  });

  final EngagementProfile? profile;
  final List<LearnerBadge> badges;
  final List<BadgeProgress> badgeProgress;
  final List<LearnerBadge> unseenBadges;
  final List<Kudos> kudos;
  final EffectiveSettings? settings;
  final bool isLoading;
  final String? error;

  EngagementState copyWith({
    EngagementProfile? profile,
    List<LearnerBadge>? badges,
    List<BadgeProgress>? badgeProgress,
    List<LearnerBadge>? unseenBadges,
    List<Kudos>? kudos,
    EffectiveSettings? settings,
    bool? isLoading,
    String? error,
  }) {
    return EngagementState(
      profile: profile ?? this.profile,
      badges: badges ?? this.badges,
      badgeProgress: badgeProgress ?? this.badgeProgress,
      unseenBadges: unseenBadges ?? this.unseenBadges,
      kudos: kudos ?? this.kudos,
      settings: settings ?? this.settings,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Engagement controller for a specific learner
class EngagementController extends StateNotifier<EngagementState> {
  EngagementController(this._service, this._tenantId, this._learnerId)
      : super(const EngagementState());

  final EngagementService _service;
  final String _tenantId;
  final String _learnerId;

  /// Load all engagement data
  Future<void> loadEngagement() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final results = await Future.wait([
        _service.getEngagement(tenantId: _tenantId, learnerId: _learnerId),
        _service.getLearnerBadges(tenantId: _tenantId, learnerId: _learnerId),
        _service.getBadgeProgress(tenantId: _tenantId, learnerId: _learnerId),
        _service.getUnseenBadges(tenantId: _tenantId, learnerId: _learnerId),
        _service.getKudos(tenantId: _tenantId, learnerId: _learnerId),
        _service.getEffectiveSettings(tenantId: _tenantId, learnerId: _learnerId),
      ]);

      state = state.copyWith(
        profile: results[0] as EngagementProfile,
        badges: results[1] as List<LearnerBadge>,
        badgeProgress: results[2] as List<BadgeProgress>,
        unseenBadges: results[3] as List<LearnerBadge>,
        kudos: results[4] as List<Kudos>,
        settings: results[5] as EffectiveSettings,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Refresh just the profile (for quick updates after events)
  Future<void> refreshProfile() async {
    try {
      final profile = await _service.getEngagement(
        tenantId: _tenantId,
        learnerId: _learnerId,
      );
      state = state.copyWith(profile: profile);
    } catch (e) {
      // Silently fail for refresh
    }
  }

  /// Mark a badge as seen
  Future<void> markBadgeSeen(LearnerBadge badge) async {
    try {
      await _service.markBadgeSeen(
        tenantId: _tenantId,
        learnerId: _learnerId,
        badgeCode: badge.badgeCode,
        learnerBadgeId: badge.id,
      );
      // Remove from unseen list
      state = state.copyWith(
        unseenBadges: state.unseenBadges.where((b) => b.id != badge.id).toList(),
      );
    } catch (e) {
      // Silently fail
    }
  }

  /// Update preferences
  Future<void> updatePreferences({
    RewardStyle? preferredRewardStyle,
    bool? muteCelebrations,
    bool? reducedVisuals,
    bool? showBadges,
    bool? showStreaks,
    bool? showXp,
  }) async {
    try {
      await _service.updatePreferences(
        tenantId: _tenantId,
        learnerId: _learnerId,
        preferredRewardStyle: preferredRewardStyle,
        muteCelebrations: muteCelebrations,
        reducedVisuals: reducedVisuals,
        showBadges: showBadges,
        showStreaks: showStreaks,
        showXp: showXp,
      );
      // Reload settings
      final settings = await _service.getEffectiveSettings(
        tenantId: _tenantId,
        learnerId: _learnerId,
      );
      state = state.copyWith(settings: settings);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}

/// Provider for engagement controller
final engagementControllerProvider = StateNotifierProvider.family<
    EngagementController, EngagementState, ({String tenantId, String learnerId})>(
  (ref, params) {
    final service = ref.watch(engagementServiceProvider);
    return EngagementController(service, params.tenantId, params.learnerId);
  },
);

/// Simple provider for just the engagement profile
final engagementProfileProvider =
    FutureProvider.family<EngagementProfile, ({String tenantId, String learnerId})>(
  (ref, params) async {
    final service = ref.watch(engagementServiceProvider);
    return service.getEngagement(
      tenantId: params.tenantId,
      learnerId: params.learnerId,
    );
  },
);

/// Provider for earned badges
final learnerBadgesProvider =
    FutureProvider.family<List<LearnerBadge>, ({String tenantId, String learnerId})>(
  (ref, params) async {
    final service = ref.watch(engagementServiceProvider);
    return service.getLearnerBadges(
      tenantId: params.tenantId,
      learnerId: params.learnerId,
    );
  },
);

/// Provider for badge progress
final badgeProgressProvider =
    FutureProvider.family<List<BadgeProgress>, ({String tenantId, String learnerId})>(
  (ref, params) async {
    final service = ref.watch(engagementServiceProvider);
    return service.getBadgeProgress(
      tenantId: params.tenantId,
      learnerId: params.learnerId,
    );
  },
);

/// Provider for kudos
final kudosProvider =
    FutureProvider.family<List<Kudos>, ({String tenantId, String learnerId})>(
  (ref, params) async {
    final service = ref.watch(engagementServiceProvider);
    return service.getKudos(
      tenantId: params.tenantId,
      learnerId: params.learnerId,
    );
  },
);
