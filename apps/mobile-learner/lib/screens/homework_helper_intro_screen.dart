import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

/// Entry screen for the Homework Helper feature.
/// Shows a friendly intro explaining the feature and options to start.
class HomeworkHelperIntroScreen extends ConsumerWidget {
  const HomeworkHelperIntroScreen({super.key, required this.learnerId});

  final String learnerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final gradeBand = ref.watch(gradeThemeControllerProvider);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // Back button
              Align(
                alignment: Alignment.topLeft,
                child: IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => context.pop(),
                  tooltip: 'Go back',
                ),
              ),

              const Spacer(flex: 1),

              // Hero illustration
              _buildIllustration(theme, gradeBand),

              const SizedBox(height: 32),

              // Title
              Text(
                'Homework Helper',
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 16),

              // Description (grade-band appropriate)
              Text(
                _descriptionForGrade(gradeBand),
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 8),

              // Disclaimer (no direct answers)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.lightbulb_outline,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'I\'ll guide you through each step - you\'ll do the thinking!',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const Spacer(flex: 2),

              // Action buttons
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => context.push('/homework/input', extra: learnerId),
                  icon: const Icon(Icons.edit_note),
                  label: const Text('Type or paste your question'),
                ),
              ),

              const SizedBox(height: 12),

              // Future: camera/image option
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    // TODO: Implement camera/image flow
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Photo support is being added. Please type your question for now.'),
                        duration: Duration(seconds: 3),
                      ),
                    );
                  },
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: const Text('Take a picture'),
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildIllustration(ThemeData theme, AivoGradeBand gradeBand) {
    // Grade-band appropriate icon/illustration
    final iconData = switch (gradeBand) {
      AivoGradeBand.k5 => Icons.auto_stories, // Book for younger
      AivoGradeBand.g6_8 => Icons.school, // School for middle
      AivoGradeBand.g9_12 => Icons.psychology, // Brain for older
    };

    return Container(
      width: 120,
      height: 120,
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer,
        shape: BoxShape.circle,
      ),
      child: Icon(
        iconData,
        size: 60,
        color: theme.colorScheme.primary,
      ),
    );
  }

  String _descriptionForGrade(AivoGradeBand gradeBand) {
    return switch (gradeBand) {
      AivoGradeBand.k5 => 'Stuck on your homework? I can help you figure it out step by step. Let\'s learn together!',
      AivoGradeBand.g6_8 => 'Need help with an assignment? I\'ll break it down into steps and guide you through the problem.',
      AivoGradeBand.g9_12 => 'Need homework assistance? I\'ll provide scaffolded guidance to help you work through the problem methodically.',
    };
  }
}
