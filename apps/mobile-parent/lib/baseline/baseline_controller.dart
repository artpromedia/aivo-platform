import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart' hide BaselineService, baselineServiceProvider;

import 'baseline_service.dart';

/// State for baseline data per learner, keyed by learnerId.
class BaselineState {
  const BaselineState({
    this.profiles = const {},
    this.isLoading = false,
    this.error,
  });

  /// Map of learnerId -> BaselineProfile
  final Map<String, BaselineProfile> profiles;
  final bool isLoading;
  final String? error;

  BaselineState copyWith({
    Map<String, BaselineProfile>? profiles,
    bool? isLoading,
    String? error,
  }) {
    return BaselineState(
      profiles: profiles ?? this.profiles,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }

  /// Get profile for a learner.
  BaselineProfile? profileFor(String learnerId) => profiles[learnerId];

  /// Get status label for UI.
  static String statusLabel(BaselineProfileStatus status) {
    switch (status) {
      case BaselineProfileStatus.notStarted:
        return 'Not Started';
      case BaselineProfileStatus.inProgress:
        return 'In Progress';
      case BaselineProfileStatus.completed:
        return 'Completed';
      case BaselineProfileStatus.retestAllowed:
        return 'Retest Allowed';
      case BaselineProfileStatus.finalAccepted:
        return 'Accepted';
    }
  }
}

/// Controller for managing baseline profiles in the parent app.
class BaselineController extends StateNotifier<BaselineState> {
  BaselineController(this._service) : super(const BaselineState());

  final BaselineService _service;

  /// Create a baseline profile for a new child after consent.
  Future<BaselineProfile?> createProfile({
    required String tenantId,
    required String learnerId,
    required int? grade,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final gradeBand = _gradeBandFromGrade(grade);
      final profile = await _service.createProfile(
        tenantId: tenantId,
        learnerId: learnerId,
        gradeBand: gradeBand,
      );
      state = state.copyWith(
        isLoading: false,
        profiles: {...state.profiles, learnerId: profile},
      );
      return profile;
    } on BaselineException catch (err) {
      state = state.copyWith(isLoading: false, error: err.message);
      return null;
    } catch (err) {
      state = state.copyWith(isLoading: false, error: 'Failed to create baseline profile');
      return null;
    }
  }

  /// Load baseline profile for a learner.
  Future<void> loadProfile(String learnerId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final profile = await _service.getProfileByLearner(learnerId);
      if (profile != null) {
        state = state.copyWith(
          isLoading: false,
          profiles: {...state.profiles, learnerId: profile},
        );
      } else {
        // No profile exists yet
        state = state.copyWith(isLoading: false);
      }
    } on BaselineException catch (err) {
      state = state.copyWith(isLoading: false, error: err.message);
    } catch (e) {
      debugPrint('[BaselineController] Error loading baseline status: $e');
      state = state.copyWith(isLoading: false, error: 'Failed to load baseline status');
    }
  }

  /// Refresh profile from backend.
  Future<void> refreshProfile(String profileId, String learnerId) async {
    try {
      final profile = await _service.getProfile(profileId);
      state = state.copyWith(
        profiles: {...state.profiles, learnerId: profile},
      );
    } catch (e) {
      // Silently fail on refresh
      debugPrint('[BaselineController] Refresh profile failed: $e');
    }
  }

  /// Start a baseline attempt.
  Future<StartAttemptResponse?> startBaseline(String profileId, String learnerId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _service.startAttempt(profileId);
      // Refresh profile to get updated status
      await refreshProfile(profileId, learnerId);
      state = state.copyWith(isLoading: false);
      return response;
    } on BaselineException catch (err) {
      state = state.copyWith(isLoading: false, error: err.message);
      return null;
    } catch (e) {
      debugPrint('[BaselineController] Error starting baseline: $e');
      state = state.copyWith(isLoading: false, error: 'Failed to start baseline');
      return null;
    }
  }

  /// Accept final results.
  Future<bool> acceptFinal(String profileId, String learnerId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _service.acceptFinal(profileId);
      await refreshProfile(profileId, learnerId);
      state = state.copyWith(isLoading: false);
      return true;
    } on BaselineException catch (err) {
      state = state.copyWith(isLoading: false, error: err.message);
      return false;
    } catch (e) {
      debugPrint('[BaselineController] Error accepting results: $e');
      state = state.copyWith(isLoading: false, error: 'Failed to accept results');
      return false;
    }
  }

  /// Request a retest.
  Future<bool> requestRetest({
    required String profileId,
    required String learnerId,
    required RetestReason reason,
    String? notes,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _service.requestRetest(
        profileId: profileId,
        reason: reason,
        notes: notes,
      );
      await refreshProfile(profileId, learnerId);
      state = state.copyWith(isLoading: false);
      return true;
    } on BaselineException catch (err) {
      state = state.copyWith(isLoading: false, error: err.message);
      return false;
    } catch (e) {
      debugPrint('[BaselineController] Error requesting retest: $e');
      state = state.copyWith(isLoading: false, error: 'Failed to request retest');
      return false;
    }
  }

  /// Clear error.
  void clearError() {
    state = state.copyWith(error: null);
  }

  String _gradeBandFromGrade(int? grade) {
    if (grade == null) return 'K5';
    if (grade <= 5) return 'K5';
    if (grade <= 8) return 'G6_8';
    return 'G9_12';
  }
}

/// Provider for baseline controller.
final baselineControllerProvider =
    StateNotifierProvider<BaselineController, BaselineState>((ref) {
  final service = ref.read(baselineServiceProvider);
  return BaselineController(service);
});

/// Provider to load baseline profiles for all children.
final childrenBaselineProvider =
    FutureProvider.family<Map<String, BaselineProfile?>, List<Learner>>((ref, learners) async {
  final service = ref.read(baselineServiceProvider);
  final results = <String, BaselineProfile?>{};

  for (final learner in learners) {
    try {
      results[learner.id] = await service.getProfileByLearner(learner.id);
    } catch (e) {
      debugPrint('[BaselineController] Error loading profile for ${learner.id}: $e');
      results[learner.id] = null;
    }
  }

  return results;
});
