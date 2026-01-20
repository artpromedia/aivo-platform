/// Onboarding Controller
///
/// State management for the onboarding flow using Riverpod.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'onboarding_state.dart';
import 'onboarding_steps.dart';
import 'onboarding_storage.dart';

/// Provider for onboarding storage.
final onboardingStorageProvider = Provider<OnboardingStorage>((_) => OnboardingStorage());

/// Provider for the onboarding controller.
final onboardingControllerProvider =
    StateNotifierProvider<OnboardingController, OnboardingState>((ref) {
  final storage = ref.read(onboardingStorageProvider);
  return OnboardingController(storage);
});

/// Controller for managing onboarding state.
class OnboardingController extends StateNotifier<OnboardingState> {
  OnboardingController(this._storage) : super(OnboardingState.initial());

  final OnboardingStorage _storage;
  String? _learnerId;

  /// Initialize the controller and check onboarding status.
  Future<void> init(String learnerId) async {
    _learnerId = learnerId;
    state = state.copyWith(isLoading: true);

    try {
      final isCompleted = await _storage.isCompletedForLearner(learnerId);

      if (isCompleted) {
        state = OnboardingState.completed();
      } else {
        // Load any saved progress
        final savedName = await _storage.getProfileName(learnerId);
        final savedAvatar = await _storage.getAvatarId(learnerId);
        final savedGrade = await _storage.getGradeLevel(learnerId);

        state = OnboardingState.notStarted().copyWith(
          profileData: OnboardingProfileData(
            displayName: savedName,
            avatarId: savedAvatar,
            gradeLevel: savedGrade,
          ),
        );
      }
    } catch (e) {
      debugPrint('[OnboardingController] Error checking status: $e');
      state = OnboardingState.notStarted().copyWith(
        error: 'Failed to check onboarding status',
      );
    }
  }

  /// Reset the controller for a new learner (e.g., on logout).
  void reset() {
    _learnerId = null;
    state = OnboardingState.initial();
  }

  /// Move to the next step.
  void nextStep() {
    final next = state.currentStep.nextStep;
    if (next != null) {
      state = state.copyWith(currentStep: next, clearError: true);
    }
  }

  /// Move to the previous step.
  void previousStep() {
    final prev = state.currentStep.previousStep;
    if (prev != null) {
      state = state.copyWith(currentStep: prev, clearError: true);
    }
  }

  /// Go to a specific step.
  void goToStep(OnboardingStep step) {
    state = state.copyWith(currentStep: step, clearError: true);
  }

  /// Update profile data.
  Future<void> updateProfile({
    String? displayName,
    String? avatarId,
    int? gradeLevel,
  }) async {
    final newProfile = (state.profileData ?? const OnboardingProfileData()).copyWith(
      displayName: displayName,
      avatarId: avatarId,
      gradeLevel: gradeLevel,
    );

    state = state.copyWith(profileData: newProfile);

    // Persist profile data
    if (_learnerId != null) {
      try {
        if (displayName != null) {
          await _storage.saveProfileName(_learnerId!, displayName);
        }
        if (avatarId != null) {
          await _storage.saveAvatarId(_learnerId!, avatarId);
        }
        if (gradeLevel != null) {
          await _storage.saveGradeLevel(_learnerId!, gradeLevel);
        }
      } catch (e) {
        debugPrint('[OnboardingController] Error saving profile: $e');
      }
    }
  }

  /// Update preferences data.
  void updatePreferences({
    bool? useDyslexiaFont,
    bool? useHighContrast,
    bool? useReducedMotion,
    List<String>? preferredSubjects,
    List<String>? learningGoals,
  }) {
    final newPrefs = (state.preferencesData ?? const OnboardingPreferencesData()).copyWith(
      useDyslexiaFont: useDyslexiaFont,
      useHighContrast: useHighContrast,
      useReducedMotion: useReducedMotion,
      preferredSubjects: preferredSubjects,
      learningGoals: learningGoals,
    );

    state = state.copyWith(preferencesData: newPrefs);
  }

  /// Complete the onboarding flow.
  Future<void> completeOnboarding() async {
    if (_learnerId == null) {
      state = state.copyWith(error: 'No learner ID available');
      return;
    }

    state = state.copyWith(isLoading: true);

    try {
      await _storage.markCompleted(_learnerId!);
      state = OnboardingState.completed();
      debugPrint('[OnboardingController] Onboarding completed for $_learnerId');
    } catch (e) {
      debugPrint('[OnboardingController] Error completing onboarding: $e');
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to save completion status',
      );
    }
  }

  /// Skip onboarding (for testing or admin override).
  Future<void> skipOnboarding() async {
    if (_learnerId != null) {
      await _storage.markCompleted(_learnerId!);
    }
    state = OnboardingState.completed();
  }

  /// Clear error state.
  void clearError() {
    state = state.copyWith(clearError: true);
  }
}

/// Provider to check if onboarding is required.
final onboardingRequiredProvider = Provider<bool>((ref) {
  final state = ref.watch(onboardingControllerProvider);
  return !state.isCompleted && state.isReady;
});

/// Provider for the current onboarding step.
final currentOnboardingStepProvider = Provider<OnboardingStep>((ref) {
  final state = ref.watch(onboardingControllerProvider);
  return state.currentStep;
});

/// Provider for onboarding progress (0.0 to 1.0).
final onboardingProgressProvider = Provider<double>((ref) {
  final state = ref.watch(onboardingControllerProvider);
  return state.progress;
});
