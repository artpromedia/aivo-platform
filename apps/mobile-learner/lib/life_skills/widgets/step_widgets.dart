/// Step Widgets
/// 
/// Widgets for the step-by-step view of life skills learning.

import 'package:flutter/material.dart';
import '../life_skills_models.dart';

/// Step Indicator Row - shows progress through steps
class StepIndicatorRow extends StatelessWidget {
  final int currentStep;
  final int totalSteps;
  final Function(int)? onStepTap;

  const StepIndicatorRow({
    super.key,
    required this.currentStep,
    required this.totalSteps,
    this.onStepTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: theme.colorScheme.outline.withOpacity(0.2),
          ),
        ),
      ),
      child: Row(
        children: [
          Text(
            'Step ${currentStep + 1} of $totalSteps',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const Spacer(),
          // Step dots
          Row(
            children: List.generate(totalSteps, (index) {
              final isCompleted = index < currentStep;
              final isCurrent = index == currentStep;

              return GestureDetector(
                onTap: onStepTap != null ? () => onStepTap!(index) : null,
                child: Container(
                  width: isCurrent ? 24 : 12,
                  height: 12,
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  decoration: BoxDecoration(
                    color: isCompleted
                        ? Colors.green
                        : isCurrent
                            ? theme.colorScheme.primary
                            : theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

/// Prompt Level Indicator - shows and allows changing current prompt level
class PromptLevelIndicator extends StatelessWidget {
  final PromptLevel currentLevel;
  final Function(PromptLevel)? onLevelChange;

  const PromptLevelIndicator({
    super.key,
    required this.currentLevel,
    this.onLevelChange,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final levels = PromptLevel.values;
    final currentIndex = levels.indexOf(currentLevel);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        border: Border(
          top: BorderSide(
            color: theme.colorScheme.outline.withOpacity(0.2),
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.assistant,
                size: 16,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 8),
              Text(
                'Support Level: ${currentLevel.displayName}',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.info_outline, size: 18),
                onPressed: () => _showLevelInfo(context),
                tooltip: 'About support levels',
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
            ],
          ),
          const SizedBox(height: 8),
          
          // Level slider
          Row(
            children: [
              Text(
                'More Help',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              Expanded(
                child: Slider(
                  value: currentIndex.toDouble(),
                  min: 0,
                  max: (levels.length - 1).toDouble(),
                  divisions: levels.length - 1,
                  label: currentLevel.displayName,
                  onChanged: onLevelChange != null
                      ? (value) => onLevelChange!(levels[value.round()])
                      : null,
                ),
              ),
              Text(
                'Independent',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showLevelInfo(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Support Levels',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            ...PromptLevel.values.map((level) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        margin: const EdgeInsets.only(top: 6),
                        decoration: BoxDecoration(
                          color: _getLevelColor(level),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              level.displayName,
                              style: Theme.of(context).textTheme.titleSmall,
                            ),
                            Text(
                              _getLevelDescription(level),
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                )),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Color _getLevelColor(PromptLevel level) {
    switch (level) {
      case PromptLevel.fullPhysical:
        return Colors.purple;
      case PromptLevel.partialPhysical:
        return Colors.blue;
      case PromptLevel.modeling:
        return Colors.indigo;
      case PromptLevel.gestural:
        return Colors.teal;
      case PromptLevel.verbal:
        return Colors.orange;
      case PromptLevel.visual:
        return Colors.amber;
      case PromptLevel.independent:
        return Colors.green;
    }
  }

  String _getLevelDescription(PromptLevel level) {
    switch (level) {
      case PromptLevel.fullPhysical:
        return 'Hand-over-hand guidance through the entire step';
      case PromptLevel.partialPhysical:
        return 'Light touch or partial guidance to help';
      case PromptLevel.modeling:
        return 'Demonstrating the action for the learner to watch';
      case PromptLevel.gestural:
        return 'Pointing or gesturing to guide the action';
      case PromptLevel.verbal:
        return 'Spoken instructions or reminders';
      case PromptLevel.visual:
        return 'Visual cues and supports to guide the action';
      case PromptLevel.independent:
        return 'Completing the step without any prompts';
    }
  }
}

/// Celebration Overlay - shows when learner completes a step successfully
class CelebrationOverlay extends StatelessWidget {
  final Animation<double> animation;
  final String message;

  const CelebrationOverlay({
    super.key,
    required this.animation,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: animation,
      builder: (context, child) {
        final scale = 0.5 + (animation.value * 0.5);
        final opacity = animation.value < 0.8 ? animation.value : 2 - (animation.value * 1.25);

        return Opacity(
          opacity: opacity.clamp(0.0, 1.0),
          child: Transform.scale(
            scale: scale,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 24,
                ),
                decoration: BoxDecoration(
                  color: Colors.green,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.green.withOpacity(0.4),
                      blurRadius: 20,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      '⭐',
                      style: TextStyle(fontSize: 48),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      message,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
