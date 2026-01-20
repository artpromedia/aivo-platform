/// Onboarding State
///
/// State management for the onboarding flow.
library;

import 'onboarding_steps.dart';

/// The current state of the onboarding flow.
class OnboardingState {
  const OnboardingState({
    required this.currentStep,
    required this.isCompleted,
    required this.isLoading,
    this.error,
    this.profileData,
    this.preferencesData,
  });

  /// Initial state before onboarding check.
  factory OnboardingState.initial() {
    return const OnboardingState(
      currentStep: OnboardingStep.welcome,
      isCompleted: false,
      isLoading: true,
      error: null,
      profileData: null,
      preferencesData: null,
    );
  }

  /// State when onboarding is already completed.
  factory OnboardingState.completed() {
    return const OnboardingState(
      currentStep: OnboardingStep.complete,
      isCompleted: true,
      isLoading: false,
      error: null,
      profileData: null,
      preferencesData: null,
    );
  }

  /// State when starting fresh onboarding.
  factory OnboardingState.notStarted() {
    return const OnboardingState(
      currentStep: OnboardingStep.welcome,
      isCompleted: false,
      isLoading: false,
      error: null,
      profileData: null,
      preferencesData: null,
    );
  }

  /// The current step in the onboarding flow.
  final OnboardingStep currentStep;

  /// Whether onboarding has been completed.
  final bool isCompleted;

  /// Whether the state is currently loading.
  final bool isLoading;

  /// Any error that occurred.
  final String? error;

  /// Profile data collected during onboarding.
  final OnboardingProfileData? profileData;

  /// Preferences data collected during onboarding.
  final OnboardingPreferencesData? preferencesData;

  /// Whether we're past the initial loading state.
  bool get isReady => !isLoading;

  /// The progress through the onboarding flow (0.0 to 1.0).
  double get progress {
    if (isCompleted) return 1.0;
    return currentStep.stepIndex / totalOnboardingSteps;
  }

  /// Create a copy with updated values.
  OnboardingState copyWith({
    OnboardingStep? currentStep,
    bool? isCompleted,
    bool? isLoading,
    String? error,
    OnboardingProfileData? profileData,
    OnboardingPreferencesData? preferencesData,
    bool clearError = false,
  }) {
    return OnboardingState(
      currentStep: currentStep ?? this.currentStep,
      isCompleted: isCompleted ?? this.isCompleted,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      profileData: profileData ?? this.profileData,
      preferencesData: preferencesData ?? this.preferencesData,
    );
  }
}

/// Profile data collected during onboarding.
class OnboardingProfileData {
  const OnboardingProfileData({
    this.displayName,
    this.avatarId,
    this.gradeLevel,
  });

  /// The learner's preferred display name.
  final String? displayName;

  /// The selected avatar ID.
  final String? avatarId;

  /// The learner's grade level.
  final int? gradeLevel;

  /// Whether the profile data is complete enough to proceed.
  bool get isComplete => displayName != null && displayName!.isNotEmpty;

  OnboardingProfileData copyWith({
    String? displayName,
    String? avatarId,
    int? gradeLevel,
  }) {
    return OnboardingProfileData(
      displayName: displayName ?? this.displayName,
      avatarId: avatarId ?? this.avatarId,
      gradeLevel: gradeLevel ?? this.gradeLevel,
    );
  }
}

/// Preferences data collected during onboarding.
class OnboardingPreferencesData {
  const OnboardingPreferencesData({
    this.useDyslexiaFont = false,
    this.useHighContrast = false,
    this.useReducedMotion = false,
    this.preferredSubjects = const [],
    this.learningGoals = const [],
  });

  /// Whether to use a dyslexia-friendly font.
  final bool useDyslexiaFont;

  /// Whether to use high contrast mode.
  final bool useHighContrast;

  /// Whether to reduce motion animations.
  final bool useReducedMotion;

  /// List of preferred subject IDs.
  final List<String> preferredSubjects;

  /// List of learning goal IDs.
  final List<String> learningGoals;

  OnboardingPreferencesData copyWith({
    bool? useDyslexiaFont,
    bool? useHighContrast,
    bool? useReducedMotion,
    List<String>? preferredSubjects,
    List<String>? learningGoals,
  }) {
    return OnboardingPreferencesData(
      useDyslexiaFont: useDyslexiaFont ?? this.useDyslexiaFont,
      useHighContrast: useHighContrast ?? this.useHighContrast,
      useReducedMotion: useReducedMotion ?? this.useReducedMotion,
      preferredSubjects: preferredSubjects ?? this.preferredSubjects,
      learningGoals: learningGoals ?? this.learningGoals,
    );
  }
}
