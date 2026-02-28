/// Gamification providers for Riverpod state management
///
/// Provides access to gamification data (badges, profiles, progress)
/// for use in the achievements screen and other gamification widgets.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'models.dart';
import 'service.dart';

/// Provider for all available badges (static catalog)
final allBadgesProvider = FutureProvider<List<GamificationBadge>>((ref) async {
  final service = ref.watch(gamificationServiceProvider);
  return service.getAllBadges();
});

/// Provider for earned badges for a specific learner
final earnedBadgesProvider =
    FutureProvider.family<List<EarnedBadge>, String>((ref, learnerId) async {
  final service = ref.watch(gamificationServiceProvider);
  return service.getEarnedBadges(learnerId: learnerId);
});

/// Provider for the gamification profile of a learner
final gamificationProfileProvider =
    FutureProvider.family<GamificationProfile, String>((ref, learnerId) async {
  final service = ref.watch(gamificationServiceProvider);
  return service.getProfile(learnerId: learnerId);
});

/// Provider for badge progress for a specific badge
final badgeProgressGamificationProvider = FutureProvider.family<
    GamificationBadgeProgress,
    ({String learnerId, String badgeId})>((ref, params) async {
  final service = ref.watch(gamificationServiceProvider);
  return service.getBadgeProgress(
    learnerId: params.learnerId,
    badgeId: params.badgeId,
  );
});
