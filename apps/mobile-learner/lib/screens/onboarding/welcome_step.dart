import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../onboarding/onboarding_controller.dart';

/// Welcome step - introduces the learner to AIVO.
class WelcomeStep extends ConsumerWidget {
  const WelcomeStep({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Spacer(flex: 2),

          // Welcome illustration
          Container(
            width: 200,
            height: 200,
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.waving_hand,
              size: 100,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(height: 40),

          // Welcome text
          Text(
            'Welcome to AIVO!',
            style: theme.textTheme.headlineLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: theme.colorScheme.onSurface,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),

          Text(
            'Your personal learning adventure starts here. '
            'We\'ll help you learn in a way that\'s just right for you!',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),

          // Feature highlights
          _FeatureHighlight(
            icon: Icons.auto_awesome,
            text: 'Learning that adapts to you',
            theme: theme,
          ),
          const SizedBox(height: 12),
          _FeatureHighlight(
            icon: Icons.emoji_events_outlined,
            text: 'Fun games and rewards',
            theme: theme,
          ),
          const SizedBox(height: 12),
          _FeatureHighlight(
            icon: Icons.favorite_outline,
            text: 'Support when you need it',
            theme: theme,
          ),

          const Spacer(flex: 3),

          // Get started button
          FilledButton(
            onPressed: () {
              ref.read(onboardingControllerProvider.notifier).nextStep();
            },
            style: FilledButton.styleFrom(
              minimumSize: const Size(double.infinity, 56),
              textStyle: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            child: const Text('Let\'s Go!'),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _FeatureHighlight extends StatelessWidget {
  const _FeatureHighlight({
    required this.icon,
    required this.text,
    required this.theme,
  });

  final IconData icon;
  final String text;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          icon,
          color: theme.colorScheme.primary,
          size: 24,
        ),
        const SizedBox(width: 12),
        Text(
          text,
          style: theme.textTheme.bodyLarge,
        ),
      ],
    );
  }
}
