import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../onboarding/onboarding_controller.dart';

/// Baseline intro step - explains the upcoming baseline assessment.
class BaselineIntroStep extends ConsumerWidget {
  const BaselineIntroStep({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final state = ref.watch(onboardingControllerProvider);
    final displayName = state.profileData?.displayName ?? 'there';

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Spacer(),

          // Illustration
          Container(
            width: 160,
            height: 160,
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.psychology_outlined,
              size: 80,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(height: 32),

          // Title with name
          Text(
            'Almost There, $displayName!',
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),

          Text(
            'Before we start, we\'d like to learn how you think and solve problems. '
            'This helps us create the perfect learning path for you!',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),

          // What to expect card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Text(
                    'What to Expect',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _ExpectationRow(
                    icon: Icons.quiz_outlined,
                    text: 'Some fun questions about different topics',
                    theme: theme,
                  ),
                  const SizedBox(height: 12),
                  _ExpectationRow(
                    icon: Icons.timer_outlined,
                    text: 'Take your time - no rush!',
                    theme: theme,
                  ),
                  const SizedBox(height: 12),
                  _ExpectationRow(
                    icon: Icons.coffee_outlined,
                    text: 'You can take breaks whenever you need',
                    theme: theme,
                  ),
                  const SizedBox(height: 12),
                  _ExpectationRow(
                    icon: Icons.thumb_up_outlined,
                    text: 'There are no wrong answers - just do your best!',
                    theme: theme,
                  ),
                ],
              ),
            ),
          ),

          const Spacer(),

          // Navigation buttons
          Row(
            children: [
              OutlinedButton(
                onPressed: () {
                  ref.read(onboardingControllerProvider.notifier).previousStep();
                },
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(100, 56),
                ),
                child: const Text('Back'),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: FilledButton(
                  onPressed: state.isLoading
                      ? null
                      : () async {
                          await ref
                              .read(onboardingControllerProvider.notifier)
                              .completeOnboarding();
                        },
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(double.infinity, 56),
                  ),
                  child: state.isLoading
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('I\'m Ready!'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Reassurance text
          Text(
            'Your grown-up set this up just for you',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _ExpectationRow extends StatelessWidget {
  const _ExpectationRow({
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
      children: [
        Icon(
          icon,
          color: theme.colorScheme.primary,
          size: 24,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: theme.textTheme.bodyMedium,
          ),
        ),
      ],
    );
  }
}
