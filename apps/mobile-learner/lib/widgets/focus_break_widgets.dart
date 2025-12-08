import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../focus/focus_controller.dart';
import '../focus/focus_service.dart';

/// A banner widget that appears when focus monitoring detects a need for a break.
/// Shows a gentle, non-punitive prompt to take a regulation break.
class FocusBreakBanner extends ConsumerWidget {
  const FocusBreakBanner({
    super.key,
    required this.learnerId,
  });

  final String learnerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final focusState = ref.watch(focusControllerProvider(learnerId));
    final gradeBand = ref.watch(gradeThemeControllerProvider);
    final theme = Theme.of(context);

    // Don't show if no break is recommended or already on break
    if (!focusState.requiresBreak || focusState.isOnBreak) {
      return const SizedBox.shrink();
    }

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.tertiaryContainer,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: theme.colorScheme.shadow.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.tertiary.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.spa,
                      size: 24,
                      color: theme.colorScheme.tertiary,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _titleForGrade(gradeBand),
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: theme.colorScheme.onTertiaryContainer,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _messageForGrade(gradeBand),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onTertiaryContainer.withOpacity(0.8),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Dismiss button
                  IconButton(
                    onPressed: () {
                      ref.read(focusControllerProvider(learnerId).notifier)
                          .dismissBreakRecommendation();
                    },
                    icon: Icon(
                      Icons.close,
                      size: 20,
                      color: theme.colorScheme.onTertiaryContainer.withOpacity(0.6),
                    ),
                    tooltip: 'Dismiss',
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        ref.read(focusControllerProvider(learnerId).notifier)
                            .dismissBreakRecommendation();
                      },
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(
                          color: theme.colorScheme.outline.withOpacity(0.5),
                        ),
                      ),
                      child: const Text('Not now'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: () {
                        final activity = focusState.pendingActivity ??
                            const RegulationActivity(
                              type: BreakActivityType.breathing,
                              title: 'Take a Breath',
                              instructions: 'Let\'s take a few deep breaths together.',
                              durationSeconds: 60,
                            );

                        context.push('/focus/break', extra: {
                          'learnerId': learnerId,
                          'activity': activity,
                        });
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: theme.colorScheme.tertiary,
                        foregroundColor: theme.colorScheme.onTertiary,
                      ),
                      child: Text(_buttonTextForGrade(gradeBand)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _titleForGrade(AivoGradeBand gradeBand) {
    return switch (gradeBand) {
      AivoGradeBand.k5 => 'How about a break? 🌈',
      AivoGradeBand.g6_8 => 'Need a quick break?',
      AivoGradeBand.g9_12 => 'Time for a break?',
    };
  }

  String _messageForGrade(AivoGradeBand gradeBand) {
    return switch (gradeBand) {
      AivoGradeBand.k5 => 'Let\'s do something fun to help your brain rest!',
      AivoGradeBand.g6_8 => 'A short break can help you focus better.',
      AivoGradeBand.g9_12 => 'Taking a moment can improve your concentration.',
    };
  }

  String _buttonTextForGrade(AivoGradeBand gradeBand) {
    return switch (gradeBand) {
      AivoGradeBand.k5 => 'Let\'s go!',
      AivoGradeBand.g6_8 => 'Take a break',
      AivoGradeBand.g9_12 => 'Take a break',
    };
  }
}

/// A floating action button for requesting a break (user-initiated).
class FocusBreakFAB extends ConsumerWidget {
  const FocusBreakFAB({
    super.key,
    required this.learnerId,
  });

  final String learnerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gradeBand = ref.watch(gradeThemeControllerProvider);
    final theme = Theme.of(context);

    return FloatingActionButton.extended(
      onPressed: () => _showBreakOptions(context, ref),
      backgroundColor: theme.colorScheme.tertiaryContainer,
      foregroundColor: theme.colorScheme.onTertiaryContainer,
      icon: const Icon(Icons.spa),
      label: Text(_fabLabelForGrade(gradeBand)),
    );
  }

  String _fabLabelForGrade(AivoGradeBand gradeBand) {
    return switch (gradeBand) {
      AivoGradeBand.k5 => 'I need a break',
      AivoGradeBand.g6_8 => 'Take a break',
      AivoGradeBand.g9_12 => 'Break',
    };
  }

  Future<void> _showBreakOptions(BuildContext context, WidgetRef ref) async {
    final theme = Theme.of(context);
    final gradeBand = ref.read(gradeThemeControllerProvider);

    // First, optionally ask how they're feeling
    final mood = await showModalBottomSheet<SelfReportedMood>(
      context: context,
      builder: (context) => _MoodPicker(gradeBand: gradeBand),
    );

    if (!context.mounted) return;

    // Get recommendations
    final controller = ref.read(focusControllerProvider(learnerId).notifier);
    final activities = await controller.requestBreakRecommendations(mood: mood);

    if (!context.mounted) return;

    if (activities.isEmpty) {
      // Fallback activity
      final defaultActivity = const RegulationActivity(
        type: BreakActivityType.breathing,
        title: 'Take a Breath',
        instructions: 'Let\'s take a few deep breaths. Breathe in for 4 counts, out for 4 counts.',
        durationSeconds: 60,
      );

      context.push('/focus/break', extra: {
        'learnerId': learnerId,
        'activity': defaultActivity,
      });
      return;
    }

    // Show activity picker if multiple options
    if (activities.length > 1) {
      final selected = await showModalBottomSheet<RegulationActivity>(
        context: context,
        builder: (context) => _ActivityPicker(activities: activities, gradeBand: gradeBand),
      );

      if (selected != null && context.mounted) {
        context.push('/focus/break', extra: {
          'learnerId': learnerId,
          'activity': selected,
        });
      }
    } else {
      context.push('/focus/break', extra: {
        'learnerId': learnerId,
        'activity': activities.first,
      });
    }
  }
}

class _MoodPicker extends StatelessWidget {
  const _MoodPicker({required this.gradeBand});

  final AivoGradeBand gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            _titleForGrade(gradeBand),
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: SelfReportedMood.values.map((mood) {
              return InkWell(
                onTap: () => Navigator.of(context).pop(mood),
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      Text(mood.emoji, style: const TextStyle(fontSize: 36)),
                      const SizedBox(height: 4),
                      Text(mood.label, style: theme.textTheme.bodySmall),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Skip'),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  String _titleForGrade(AivoGradeBand gradeBand) {
    return switch (gradeBand) {
      AivoGradeBand.k5 => 'How are you feeling?',
      AivoGradeBand.g6_8 => 'How are you feeling right now?',
      AivoGradeBand.g9_12 => 'Current mood?',
    };
  }
}

class _ActivityPicker extends StatelessWidget {
  const _ActivityPicker({
    required this.activities,
    required this.gradeBand,
  });

  final List<RegulationActivity> activities;
  final AivoGradeBand gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _titleForGrade(gradeBand),
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          ...activities.map((activity) {
            final iconData = switch (activity.type) {
              BreakActivityType.breathing => Icons.air,
              BreakActivityType.stretching => Icons.self_improvement,
              BreakActivityType.movement => Icons.directions_run,
              BreakActivityType.grounding => Icons.spa,
              BreakActivityType.mindfulPause => Icons.psychology,
              BreakActivityType.simpleGame => Icons.sports_esports,
            };

            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.tertiaryContainer,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(iconData, color: theme.colorScheme.tertiary),
                ),
                title: Text(activity.title),
                subtitle: Text('${activity.durationSeconds ~/ 60} min'),
                trailing: const Icon(Icons.chevron_right),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                tileColor: theme.colorScheme.surfaceContainerLow,
                onTap: () => Navigator.of(context).pop(activity),
              ),
            );
          }),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  String _titleForGrade(AivoGradeBand gradeBand) {
    return switch (gradeBand) {
      AivoGradeBand.k5 => 'Pick an activity!',
      AivoGradeBand.g6_8 => 'Choose an activity',
      AivoGradeBand.g9_12 => 'Select an activity',
    };
  }
}
