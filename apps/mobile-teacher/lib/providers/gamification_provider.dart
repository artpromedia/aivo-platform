/// Gamification Providers
///
/// State management for gamification features.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/gamification.dart';
import '../repositories/gamification_repository.dart';
import '../repositories/repositories.dart';

/// Provider for gamification repository.
final gamificationRepositoryProvider = Provider<GamificationRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return GamificationRepository(dio: dio);
});

/// Provider for gamification settings.
final gamificationSettingsProvider =
    FutureProvider.family<GamificationSettings, String>((ref, classId) async {
  final repo = ref.watch(gamificationRepositoryProvider);
  return repo.fetchSettings(classId);
});

/// State for challenges.
class ChallengesState {
  const ChallengesState({
    this.challenges = const [],
    this.isLoading = false,
    this.error,
  });

  final List<ClassChallenge> challenges;
  final bool isLoading;
  final String? error;

  List<ClassChallenge> get active =>
      challenges.where((c) => c.status == ChallengeStatus.active).toList();

  List<ClassChallenge> get drafts =>
      challenges.where((c) => c.status == ChallengeStatus.draft).toList();

  ChallengesState copyWith({
    List<ClassChallenge>? challenges,
    bool? isLoading,
    String? error,
  }) {
    return ChallengesState(
      challenges: challenges ?? this.challenges,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Notifier for challenges.
class ChallengesNotifier extends StateNotifier<ChallengesState> {
  ChallengesNotifier(this._repository, this._classId) : super(const ChallengesState());

  final GamificationRepository _repository;
  final String _classId;

  Future<void> loadChallenges({ChallengeStatus? status}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final challenges = await _repository.fetchChallenges(_classId, status: status);
      state = state.copyWith(challenges: challenges, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<ClassChallenge> createChallenge(ClassChallenge challenge) async {
    final created = await _repository.createChallenge(challenge);
    state = state.copyWith(challenges: [...state.challenges, created]);
    return created;
  }

  Future<void> updateChallenge(ClassChallenge challenge) async {
    final updated = await _repository.updateChallenge(challenge);
    state = state.copyWith(
      challenges: state.challenges.map((c) => c.id == updated.id ? updated : c).toList(),
    );
  }

  Future<void> deleteChallenge(String challengeId) async {
    await _repository.deleteChallenge(_classId, challengeId);
    state = state.copyWith(
      challenges: state.challenges.where((c) => c.id != challengeId).toList(),
    );
  }

  Future<void> startChallenge(String challengeId) async {
    final updated = await _repository.startChallenge(_classId, challengeId);
    state = state.copyWith(
      challenges: state.challenges.map((c) => c.id == updated.id ? updated : c).toList(),
    );
  }

  Future<void> endChallenge(String challengeId) async {
    final updated = await _repository.endChallenge(_classId, challengeId);
    state = state.copyWith(
      challenges: state.challenges.map((c) => c.id == updated.id ? updated : c).toList(),
    );
  }
}

/// Provider for challenges notifier.
final challengesProvider =
    StateNotifierProvider.family<ChallengesNotifier, ChallengesState, String>((ref, classId) {
  final repo = ref.watch(gamificationRepositoryProvider);
  return ChallengesNotifier(repo, classId);
});

/// Provider for leaderboard.
final leaderboardProvider =
    FutureProvider.family<List<LeaderboardEntry>, String>((ref, classId) async {
  final repo = ref.watch(gamificationRepositoryProvider);
  return repo.fetchLeaderboard(classId);
});

/// Provider for available rewards.
final availableRewardsProvider = FutureProvider<List<Reward>>((ref) async {
  final repo = ref.watch(gamificationRepositoryProvider);
  return repo.fetchAvailableRewards();
});

/// Notifier for gamification settings.
class GamificationSettingsNotifier extends StateNotifier<AsyncValue<GamificationSettings>> {
  GamificationSettingsNotifier(this._repository, this._classId)
      : super(const AsyncLoading()) {
    _load();
  }

  final GamificationRepository _repository;
  final String _classId;

  Future<void> _load() async {
    try {
      final settings = await _repository.fetchSettings(_classId);
      state = AsyncData(settings);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> update(GamificationSettings settings) async {
    state = const AsyncLoading();
    try {
      final updated = await _repository.updateSettings(settings);
      state = AsyncData(updated);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> toggleFeature(String feature, bool enabled) async {
    final current = state.valueOrNull;
    if (current == null) return;

    GamificationSettings updated;
    switch (feature) {
      case 'points':
        updated = current.copyWith(pointsEnabled: enabled);
        break;
      case 'badges':
        updated = current.copyWith(badgesEnabled: enabled);
        break;
      case 'leaderboard':
        updated = current.copyWith(leaderboardEnabled: enabled);
        break;
      case 'streaks':
        updated = current.copyWith(streaksEnabled: enabled);
        break;
      case 'levels':
        updated = current.copyWith(levelsEnabled: enabled);
        break;
      case 'challenges':
        updated = current.copyWith(challengesEnabled: enabled);
        break;
      default:
        return;
    }

    await update(updated);
  }
}

/// Provider for gamification settings notifier.
final gamificationSettingsNotifierProvider = StateNotifierProvider.family<
    GamificationSettingsNotifier, AsyncValue<GamificationSettings>, String>((ref, classId) {
  final repo = ref.watch(gamificationRepositoryProvider);
  return GamificationSettingsNotifier(repo, classId);
});
