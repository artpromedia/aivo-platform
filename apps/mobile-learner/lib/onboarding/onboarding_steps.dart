/// Onboarding Steps
///
/// Defines the steps in the onboarding flow for new learners.
library;

import 'package:flutter/material.dart';

/// The steps in the onboarding flow.
enum OnboardingStep {
  /// Welcome to AIVO introduction
  welcome,

  /// Basic profile setup (name, avatar, grade)
  profileSetup,

  /// Learning preferences and accessibility settings
  preferences,

  /// Introduction to baseline assessment
  baselineIntro,

  /// Onboarding complete
  complete,
}

/// Extension methods for OnboardingStep.
extension OnboardingStepExtension on OnboardingStep {
  /// The display title for this step.
  String get title {
    switch (this) {
      case OnboardingStep.welcome:
        return 'Welcome';
      case OnboardingStep.profileSetup:
        return 'About You';
      case OnboardingStep.preferences:
        return 'Preferences';
      case OnboardingStep.baselineIntro:
        return 'Get Started';
      case OnboardingStep.complete:
        return 'Ready!';
    }
  }

  /// The description for this step.
  String get description {
    switch (this) {
      case OnboardingStep.welcome:
        return 'Welcome to your learning adventure!';
      case OnboardingStep.profileSetup:
        return 'Tell us a little about yourself.';
      case OnboardingStep.preferences:
        return 'Customize your learning experience.';
      case OnboardingStep.baselineIntro:
        return 'Let\'s see how we can help you learn.';
      case OnboardingStep.complete:
        return 'You\'re all set to start learning!';
    }
  }

  /// The icon for this step.
  IconData get icon {
    switch (this) {
      case OnboardingStep.welcome:
        return Icons.waving_hand;
      case OnboardingStep.profileSetup:
        return Icons.person_outline;
      case OnboardingStep.preferences:
        return Icons.tune;
      case OnboardingStep.baselineIntro:
        return Icons.psychology_outlined;
      case OnboardingStep.complete:
        return Icons.celebration;
    }
  }

  /// The zero-based index of this step in the flow.
  int get stepIndex {
    switch (this) {
      case OnboardingStep.welcome:
        return 0;
      case OnboardingStep.profileSetup:
        return 1;
      case OnboardingStep.preferences:
        return 2;
      case OnboardingStep.baselineIntro:
        return 3;
      case OnboardingStep.complete:
        return 4;
    }
  }

  /// Whether this is the last step before completion.
  bool get isLastContentStep => this == OnboardingStep.baselineIntro;

  /// Whether this is the completion step.
  bool get isComplete => this == OnboardingStep.complete;

  /// The next step in the flow, or null if complete.
  OnboardingStep? get nextStep {
    switch (this) {
      case OnboardingStep.welcome:
        return OnboardingStep.profileSetup;
      case OnboardingStep.profileSetup:
        return OnboardingStep.preferences;
      case OnboardingStep.preferences:
        return OnboardingStep.baselineIntro;
      case OnboardingStep.baselineIntro:
        return OnboardingStep.complete;
      case OnboardingStep.complete:
        return null;
    }
  }

  /// The previous step in the flow, or null if at start.
  OnboardingStep? get previousStep {
    switch (this) {
      case OnboardingStep.welcome:
        return null;
      case OnboardingStep.profileSetup:
        return OnboardingStep.welcome;
      case OnboardingStep.preferences:
        return OnboardingStep.profileSetup;
      case OnboardingStep.baselineIntro:
        return OnboardingStep.preferences;
      case OnboardingStep.complete:
        return OnboardingStep.baselineIntro;
    }
  }
}

/// The total number of content steps (excluding completion).
const int totalOnboardingSteps = 4;

/// Get a step by its index.
OnboardingStep stepFromIndex(int index) {
  return OnboardingStep.values[index.clamp(0, OnboardingStep.values.length - 1)];
}
