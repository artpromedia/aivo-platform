import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_learner/onboarding/onboarding_guard.dart';
import 'package:mobile_learner/onboarding/onboarding_state.dart';
import 'package:mobile_learner/onboarding/onboarding_steps.dart';

void main() {
  group('onboardingRedirect', () {
    test('returns null when not authenticated', () {
      final result = onboardingRedirect(
        onboardingState: OnboardingState.notStarted(),
        currentPath: '/plan',
        isAuthenticated: false,
      );

      expect(result, isNull);
    });

    test('returns null when still loading', () {
      final result = onboardingRedirect(
        onboardingState: OnboardingState.initial(),
        currentPath: '/plan',
        isAuthenticated: true,
      );

      expect(result, isNull);
    });

    test('returns null for exempt paths', () {
      final exemptPaths = ['/login', '/pin', '/onboarding'];

      for (final path in exemptPaths) {
        final result = onboardingRedirect(
          onboardingState: OnboardingState.notStarted(),
          currentPath: path,
          isAuthenticated: true,
        );

        expect(result, isNull, reason: 'Path $path should be exempt');
      }
    });

    test('redirects to onboarding when not complete', () {
      final result = onboardingRedirect(
        onboardingState: OnboardingState.notStarted(),
        currentPath: '/plan',
        isAuthenticated: true,
      );

      expect(result, equals('/onboarding'));
    });

    test('redirects to baseline when onboarding complete but on onboarding screen', () {
      final result = onboardingRedirect(
        onboardingState: OnboardingState.completed(),
        currentPath: '/onboarding',
        isAuthenticated: true,
      );

      expect(result, equals('/baseline/intro'));
    });

    test('returns null when onboarding complete and not on onboarding', () {
      final result = onboardingRedirect(
        onboardingState: OnboardingState.completed(),
        currentPath: '/plan',
        isAuthenticated: true,
      );

      expect(result, isNull);
    });

    test('handles partial onboarding paths', () {
      final result = onboardingRedirect(
        onboardingState: OnboardingState.notStarted(),
        currentPath: '/onboarding/profile',
        isAuthenticated: true,
      );

      // Should be exempt since it starts with /onboarding
      expect(result, isNull);
    });
  });

  group('OnboardingState helpers', () {
    test('isReady returns true when not loading', () {
      expect(OnboardingState.initial().isReady, isFalse);
      expect(OnboardingState.notStarted().isReady, isTrue);
      expect(OnboardingState.completed().isReady, isTrue);
    });

    test('progress calculation is correct', () {
      const step0 = OnboardingState(
        currentStep: OnboardingStep.welcome,
        isCompleted: false,
        isLoading: false,
      );
      expect(step0.progress, equals(0.0));

      const step1 = OnboardingState(
        currentStep: OnboardingStep.profileSetup,
        isCompleted: false,
        isLoading: false,
      );
      expect(step1.progress, equals(0.25));

      const step2 = OnboardingState(
        currentStep: OnboardingStep.preferences,
        isCompleted: false,
        isLoading: false,
      );
      expect(step2.progress, equals(0.5));

      const step3 = OnboardingState(
        currentStep: OnboardingStep.baselineIntro,
        isCompleted: false,
        isLoading: false,
      );
      expect(step3.progress, equals(0.75));

      final completed = OnboardingState.completed();
      expect(completed.progress, equals(1.0));
    });
  });
}
