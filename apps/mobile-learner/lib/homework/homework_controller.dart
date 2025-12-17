import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart' hide HomeworkStep;

import 'homework_service.dart';

/// State for homework helper flow.
class HomeworkState {
  const HomeworkState({
    this.session,
    this.currentStepIndex = 0,
    this.isLoading = false,
    this.error,
    this.showHint = false,
    this.stepFeedback,
  });

  final HomeworkSession? session;
  final int currentStepIndex;
  final bool isLoading;
  final String? error;
  final bool showHint;
  final String? stepFeedback;

  /// Get the current step being worked on.
  HomeworkStep? get currentStep {
    if (session == null || session!.steps.isEmpty) return null;
    if (currentStepIndex >= session!.steps.length) return null;
    return session!.steps[currentStepIndex];
  }

  /// Check if all steps are completed.
  bool get isComplete => session?.isComplete ?? false;

  /// Progress as a fraction (0.0 to 1.0).
  double get progress {
    if (session == null || session!.steps.isEmpty) return 0.0;
    final completedCount = session!.steps.where((s) => s.isCompleted).length;
    return completedCount / session!.steps.length;
  }

  /// Number of completed steps.
  int get completedSteps {
    if (session == null) return 0;
    return session!.steps.where((s) => s.isCompleted).length;
  }

  /// Total number of steps.
  int get totalSteps => session?.steps.length ?? 0;

  HomeworkState copyWith({
    HomeworkSession? session,
    int? currentStepIndex,
    bool? isLoading,
    String? error,
    bool? showHint,
    String? stepFeedback,
    bool clearError = false,
    bool clearFeedback = false,
  }) {
    return HomeworkState(
      session: session ?? this.session,
      currentStepIndex: currentStepIndex ?? this.currentStepIndex,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : error ?? this.error,
      showHint: showHint ?? this.showHint,
      stepFeedback: clearFeedback ? null : stepFeedback ?? this.stepFeedback,
    );
  }
}

/// Controller for managing homework helper state.
class HomeworkController extends StateNotifier<HomeworkState> {
  HomeworkController(this._service, String learnerId) : super(const HomeworkState());

  final HomeworkService _service;

  String? _currentGradeBand;

  /// Set the grade band for theming/API calls.
  void setGradeBand(AivoGradeBand band) {
    _currentGradeBand = switch (band) {
      AivoGradeBand.k5 => 'K5',
      AivoGradeBand.g6_8 => 'G6_8',
      AivoGradeBand.g9_12 => 'G9_12',
    };
  }

  /// Start a new homework help session.
  Future<bool> startHomework({
    required String problemText,
    required HomeworkSubject subject,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true, clearFeedback: true);

    try {
      final session = await _service.startHomework(
        problemText: problemText,
        subject: subject,
        gradeBand: _currentGradeBand ?? 'G6_8',
      );

      state = state.copyWith(
        session: session,
        currentStepIndex: 0,
        isLoading: false,
        showHint: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }

  /// Submit an answer for the current step.
  Future<bool> submitAnswer(String responseText) async {
    final step = state.currentStep;
    if (step == null) return false;

    state = state.copyWith(isLoading: true, clearError: true, clearFeedback: true);

    try {
      final result = await _service.answerStep(
        stepId: step.id,
        responseText: responseText,
      );

      // Update the step with response and feedback
      final updatedSteps = List<HomeworkStep>.from(state.session!.steps);
      final stepIndex = state.currentStepIndex;

      updatedSteps[stepIndex] = step.copyWith(
        learnerResponse: responseText,
        feedback: result.feedback,
        isCorrect: result.isCorrect,
        hint: result.hint,
        isCompleted: result.proceedToNext,
      );

      // Determine next step index
      var nextIndex = state.currentStepIndex;
      final isLastStep = stepIndex == updatedSteps.length - 1;
      final isComplete = result.proceedToNext && isLastStep;

      if (result.proceedToNext && !isLastStep) {
        nextIndex = stepIndex + 1;
      }

      state = state.copyWith(
        session: state.session!.copyWith(
          steps: updatedSteps,
          currentStepIndex: nextIndex,
          isComplete: isComplete,
        ),
        currentStepIndex: nextIndex,
        isLoading: false,
        stepFeedback: result.feedback,
        showHint: result.hint != null && !result.proceedToNext,
      );

      return result.proceedToNext;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }

  /// Toggle showing the hint for the current step.
  void toggleHint() {
    state = state.copyWith(showHint: !state.showHint);
  }

  /// Clear the feedback message.
  void clearFeedback() {
    state = state.copyWith(clearFeedback: true);
  }

  /// Complete the homework session.
  Future<void> completeHomework() async {
    final session = state.session;
    if (session == null) return;

    try {
      await _service.completeHomework(session.id);
      state = state.copyWith(
        session: session.copyWith(isComplete: true),
      );
    } catch (_) {
      // Non-critical - session already effectively complete
    }
  }

  /// Reset the homework state (clear session).
  void reset() {
    state = const HomeworkState();
  }
}

/// Provider for homework controller, scoped to a learner.
final homeworkControllerProvider = StateNotifierProvider.family<HomeworkController, HomeworkState, String>(
  (ref, learnerId) {
    final service = ref.read(homeworkServiceProvider);
    return HomeworkController(service, learnerId);
  },
);
