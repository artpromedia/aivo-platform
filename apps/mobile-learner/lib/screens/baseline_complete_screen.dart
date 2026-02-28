import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../baseline/baseline_controller.dart';
import '../l10n/generated/app_localizations.dart';

/// Celebration screen shown after completing the baseline assessment.
/// Shows a friendly congratulations message and option to continue.
class BaselineCompleteScreen extends ConsumerWidget {
  const BaselineCompleteScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              // Celebration visual
              Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      theme.colorScheme.primary.withOpacity(0.2),
                      theme.colorScheme.secondary.withOpacity(0.2),
                    ],
                  ),
                  shape: BoxShape.circle,
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Icon(
                      Icons.star,
                      size: 80,
                      color: theme.colorScheme.primary,
                    ),
                    Positioned(
                      top: 20,
                      right: 30,
                      child: Icon(
                        Icons.auto_awesome,
                        size: 28,
                        color: theme.colorScheme.secondary,
                      ),
                    ),
                    Positioned(
                      bottom: 25,
                      left: 25,
                      child: Icon(
                        Icons.auto_awesome,
                        size: 24,
                        color: theme.colorScheme.tertiary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 40),

              // Title
              Text(
                l10n.baselineCompleteTitle,
                style: theme.textTheme.displaySmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(height: 16),

              // Subtitle
              Text(
                l10n.baselineCompleteSubtitle,
                style: theme.textTheme.headlineSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),

              // Message
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Icon(
                        Icons.psychology_alt,
                        size: 40,
                        color: theme.colorScheme.primary,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        l10n.baselineCompleteMessage,
                        style: theme.textTheme.bodyLarge,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Email notification card
              Card(
                color: theme.colorScheme.primaryContainer.withOpacity(0.3),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(
                        Icons.email_outlined,
                        color: theme.colorScheme.primary,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          l10n.baselineCompleteEmailNotice,
                          style: theme.textTheme.bodyMedium,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const Spacer(),

              // What happens next
              Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      l10n.baselineCompleteNextSteps,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Continue button
              FilledButton.icon(
                onPressed: () {
                  // Reset baseline state and go to plan
                  ref.read(learnerBaselineControllerProvider.notifier).reset();
                  context.go('/plan');
                },
                icon: const Icon(Icons.celebration),
                label: Text(l10n.continueButton),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(double.infinity, 64),
                  textStyle: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Or go back to neutral
              TextButton(
                onPressed: () {
                  ref.read(learnerBaselineControllerProvider.notifier).reset();
                  context.go('/pin');
                },
                child: Text(l10n.switchLearner),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
