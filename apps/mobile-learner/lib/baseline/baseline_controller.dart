import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

import 'baseline_service.dart';

/// State for the learner's baseline assessment session.
class LearnerBaselineState {
  const LearnerBaselineState({
    this.profile,
    this.currentItem,
    this.attemptId,
    this.isLoading = false,
    this.error,
    this.isComplete = false,
    this.isOnBreak = false,
    this.questionStartTime,
  });

  final BaselineProfile? profile;
  final BaselineItem? currentItem;
  final String? attemptId;
  final bool isLoading;
  final String? error;
  final bool isComplete;
  final bool isOnBreak;
  final DateTime? questionStartTime;

  /// Current question number (1-based).
  int get currentQuestion => currentItem?.sequence ?? 0;

  /// Total questions.
  int get totalQuestions => currentItem?.totalItems ?? 25;

  /// Progress as a fraction (0.0 to 1.0).
  double get progress => totalQuestions > 0 ? currentQuestion / totalQuestions : 0.0;

  /// Whether the baseline needs to be started.
  bool get needsStart =>
      profile != null &&
      profile!.status == BaselineProfileStatus.notStarted;

  /// Whether the baseline is in progress.
  bool get isInProgress =>
      profile != null &&
      profile!.status == BaselineProfileStatus.inProgress;

  /// Whether the baseline is done (completed or accepted).
  bool get isDone =>
      profile == null ||
      profile!.status == BaselineProfileStatus.completed ||
      profile!.status == BaselineProfileStatus.finalAccepted;

  LearnerBaselineState copyWith({
    BaselineProfile? profile,
    BaselineItem? currentItem,
    String? attemptId,
    bool? isLoading,
    String? error,
    bool? isComplete,
    bool? isOnBreak,
    DateTime? questionStartTime,
    bool clearCurrentItem = false,
  }) {
    return LearnerBaselineState(
      profile: profile ?? this.profile,
      currentItem: clearCurrentItem ? null : (currentItem ?? this.currentItem),
      attemptId: attemptId ?? this.attemptId,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      isComplete: isComplete ?? this.isComplete,
      isOnBreak: isOnBreak ?? this.isOnBreak,
      questionStartTime: questionStartTime ?? this.questionStartTime,
    );
  }
}

/// Controller for the learner's baseline assessment flow.
class LearnerBaselineController extends StateNotifier<LearnerBaselineState> {
  LearnerBaselineController(this._service) : super(const LearnerBaselineState());

  final LearnerBaselineService _service;

  /// Check baseline status for a learner after PIN authentication.
  Future<void> checkBaselineStatus(String learnerId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final profile = await _service.getProfileByLearner(learnerId);

      if (profile == null) {
        // No baseline profile exists
        state = state.copyWith(isLoading: false, profile: profile);
        return;
      }

      String? attemptId;
      if (profile.status == BaselineProfileStatus.inProgress) {
        // Get the active attempt ID
        attemptId = profile.activeAttempt?.id;
      }

      state = state.copyWith(
        isLoading: false,
        profile: profile,
        attemptId: attemptId,
      );

      // If in progress, load the next item
      if (attemptId != null) {
        await loadNextItem();
      }
    } on BaselineException catch (err) {
      state = state.copyWith(isLoading: false, error: err.message);
    } catch (err) {
      state = state.copyWith(isLoading: false, error: 'Failed to check baseline status');
    }
  }

  /// Set the attempt ID (e.g., when parent starts it from their device).
  void setAttemptId(String attemptId) {
    state = state.copyWith(attemptId: attemptId);
  }

  /// Load the next question item.
  Future<void> loadNextItem() async {
    final attemptId = state.attemptId;
    if (attemptId == null) {
      state = state.copyWith(error: 'No active attempt');
      return;
    }

    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _service.getNextItem(attemptId);

      if (response.complete) {
        // All items answered, complete the attempt
        await _completeAttempt();
      } else if (response.item != null) {
        state = state.copyWith(
          isLoading: false,
          currentItem: response.item,
          questionStartTime: DateTime.now(),
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          error: 'Failed to load question',
        );
      }
    } on BaselineException catch (err) {
      state = state.copyWith(isLoading: false, error: err.message);
    } catch (_) {
      state = state.copyWith(isLoading: false, error: 'Failed to load next question');
    }
  }

  /// Submit an answer for the current question.
  Future<bool> submitAnswer(dynamic response) async {
    final currentItem = state.currentItem;
    if (currentItem == null) {
      state = state.copyWith(error: 'No current question');
      return false;
    }

    state = state.copyWith(isLoading: true, error: null);

    try {
      // Calculate latency
      int? latencyMs;
      if (state.questionStartTime != null) {
        latencyMs = DateTime.now().difference(state.questionStartTime!).inMilliseconds;
      }

      await _service.submitAnswer(
        itemId: currentItem.itemId,
        response: response,
        latencyMs: latencyMs,
      );

      state = state.copyWith(isLoading: false);
      return true;
    } on BaselineException catch (err) {
      state = state.copyWith(isLoading: false, error: err.message);
      return false;
    } catch (_) {
      state = state.copyWith(isLoading: false, error: 'Failed to submit answer');
      return false;
    }
  }

  /// Complete the baseline attempt.
  Future<void> _completeAttempt() async {
    final attemptId = state.attemptId;
    if (attemptId == null) return;

    try {
      await _service.completeAttempt(attemptId);
      state = state.copyWith(
        isLoading: false,
        isComplete: true,
        clearCurrentItem: true,
      );
    } on BaselineException catch (err) {
      state = state.copyWith(isLoading: false, error: err.message);
    } catch (_) {
      state = state.copyWith(isLoading: false, error: 'Failed to complete assessment');
    }
  }

  /// Take a break (pause the assessment UI).
  void takeBreak() {
    state = state.copyWith(isOnBreak: true);
  }

  /// Resume from break.
  void resumeFromBreak() {
    state = state.copyWith(
      isOnBreak: false,
      questionStartTime: DateTime.now(), // Reset timer after break
    );
  }

  /// Clear error.
  void clearError() {
    state = state.copyWith(error: null);
  }

  /// Reset state (e.g., on logout).
  void reset() {
    state = const LearnerBaselineState();
  }
}

/// Provider for the learner baseline controller.
final learnerBaselineControllerProvider =
    StateNotifierProvider<LearnerBaselineController, LearnerBaselineState>((ref) {
  final service = ref.read(learnerBaselineServiceProvider);
  return LearnerBaselineController(service);
});
