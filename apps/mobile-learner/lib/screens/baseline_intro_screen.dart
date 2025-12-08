import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Introduction screen shown before starting the baseline assessment.
/// Explains what will happen and prepares the learner.
class BaselineIntroScreen extends ConsumerWidget {
  const BaselineIntroScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Spacer(),

              // Friendly illustration placeholder
              Container(
                width: 180,
                height: 180,
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

              // Title
              Text(
                'Let\'s Get to Know You!',
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),

              // Description
              Text(
                'We have some fun questions to help us understand how you learn best.',
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),

              // What to expect
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      _InfoRow(
                        icon: Icons.format_list_numbered,
                        text: '25 questions about different subjects',
                        theme: theme,
                      ),
                      const SizedBox(height: 12),
                      _InfoRow(
                        icon: Icons.timer_outlined,
                        text: 'Take your time - there\'s no rush!',
                        theme: theme,
                      ),
                      const SizedBox(height: 12),
                      _InfoRow(
                        icon: Icons.pause_circle_outline,
                        text: 'You can take breaks if you need them',
                        theme: theme,
                      ),
                      const SizedBox(height: 12),
                      _InfoRow(
                        icon: Icons.star_outline,
                        text: 'Just do your best - that\'s all we ask!',
                        theme: theme,
                      ),
                    ],
                  ),
                ),
              ),

              const Spacer(),

              // Start button
              FilledButton(
                onPressed: () => context.go('/baseline/question'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(double.infinity, 64),
                  textStyle: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                child: const Text('I\'m Ready!'),
              ),
              const SizedBox(height: 16),

              // Secondary text
              Text(
                'Your grown-up started this for you',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
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
