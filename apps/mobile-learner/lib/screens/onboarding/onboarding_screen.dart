import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../onboarding/onboarding_controller.dart';
import '../../onboarding/onboarding_steps.dart';
import 'welcome_step.dart';
import 'profile_setup_step.dart';
import 'preferences_step.dart';
import 'baseline_intro_step.dart';

/// Main onboarding screen that orchestrates the onboarding flow.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  late PageController _pageController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onStepChanged(OnboardingStep step) {
    final targetPage = step.stepIndex;
    if (_pageController.hasClients && _pageController.page?.round() != targetPage) {
      _pageController.animateToPage(
        targetPage,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(onboardingControllerProvider);
    final theme = Theme.of(context);

    // Listen for step changes to animate PageView
    ref.listen<OnboardingStep>(currentOnboardingStepProvider, (prev, next) {
      _onStepChanged(next);
    });

    // If onboarding is complete, navigate away
    if (state.isCompleted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        context.go('/baseline/intro');
      });
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    // Show loading state
    if (state.isLoading) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text(
                'Getting ready...',
                style: theme.textTheme.bodyLarge,
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Progress indicator
            _OnboardingProgressBar(
              currentStep: state.currentStep,
              progress: state.progress,
            ),

            // Step content
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                children: const [
                  WelcomeStep(),
                  ProfileSetupStep(),
                  PreferencesStep(),
                  BaselineIntroStep(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Progress bar showing current position in onboarding flow.
class _OnboardingProgressBar extends StatelessWidget {
  const _OnboardingProgressBar({
    required this.currentStep,
    required this.progress,
  });

  final OnboardingStep currentStep;
  final double progress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Step indicators
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(totalOnboardingSteps, (index) {
              final isActive = index <= currentStep.stepIndex;
              final isCurrent = index == currentStep.stepIndex;

              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: isCurrent ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: isActive
                        ? theme.colorScheme.primary
                        : theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 8),

          // Step title
          Text(
            currentStep.title,
            style: theme.textTheme.labelMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
