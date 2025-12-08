import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

import 'plan_service.dart';

/// State for today's plan.
class PlanState {
  const PlanState({
    this.plan,
    this.isLoading = false,
    this.error,
    this.lastFetchTime,
  });

  final TodaysPlan? plan;
  final bool isLoading;
  final String? error;
  final DateTime? lastFetchTime;

  PlanState copyWith({
    TodaysPlan? plan,
    bool? isLoading,
    String? error,
    DateTime? lastFetchTime,
    bool clearError = false,
  }) {
    return PlanState(
      plan: plan ?? this.plan,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : error ?? this.error,
      lastFetchTime: lastFetchTime ?? this.lastFetchTime,
    );
  }

  /// Check if the plan needs refreshing (older than 1 hour or not loaded).
  bool get needsRefresh {
    if (plan == null) return true;
    if (lastFetchTime == null) return true;
    return DateTime.now().difference(lastFetchTime!).inHours >= 1;
  }
}

/// Controller for managing today's plan state.
class PlanController extends StateNotifier<PlanState> {
  PlanController(this._service, this._learnerId) : super(const PlanState());

  final PlanService _service;
  final String _learnerId;

  /// Fetch today's plan.
  Future<void> fetchTodaysPlan({
    int? maxActivities,
    List<String>? includeDomains,
    bool useAiPlanner = false,
    bool forceRefresh = false,
  }) async {
    // Skip if already loaded and not stale
    if (!forceRefresh && !state.needsRefresh) {
      return;
    }

    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final plan = await _service.generateTodaysPlan(
        _learnerId,
        maxActivities: maxActivities,
        includeDomains: includeDomains,
        useAiPlanner: useAiPlanner,
      );
      state = state.copyWith(
        plan: plan,
        isLoading: false,
        lastFetchTime: DateTime.now(),
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Clear the current plan (e.g., on logout).
  void clear() {
    state = const PlanState();
  }
}

/// Provider for plan controller, scoped to a learner.
final planControllerProvider = StateNotifierProvider.family<PlanController, PlanState, String>(
  (ref, learnerId) {
    // In real app, get access token from auth provider
    final service = PlanService(accessToken: null);
    return PlanController(service, learnerId);
  },
);

/// Provider for fetching difficulty recommendation.
final difficultyRecommendationProvider = FutureProvider.family<DifficultyRecommendationResponse, ({String learnerId, String? domain})>(
  (ref, params) async {
    final service = PlanService(accessToken: null);
    return service.getDifficultyRecommendation(
      params.learnerId,
      domain: params.domain,
    );
  },
);
