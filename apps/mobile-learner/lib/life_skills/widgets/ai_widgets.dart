/// AI Widgets
/// 
/// Widgets for displaying AI coaching and guidance in life skills learning.
library;

import 'package:flutter/material.dart';
import '../life_skills_models.dart';

/// AI Guidance Panel - collapsible panel showing AI guidance during practice
class AIGuidancePanel extends StatelessWidget {
  final AIGuidance guidance;
  final VoidCallback? onDismiss;

  const AIGuidancePanel({
    super.key,
    required this.guidance,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            theme.colorScheme.primaryContainer,
            theme.colorScheme.secondaryContainer,
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: theme.colorScheme.primary.withOpacity(0.2),
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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.psychology,
                      color: theme.colorScheme.onPrimaryContainer,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'AI Coach',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                    ),
                  ),
                  if (onDismiss != null)
                    IconButton(
                      icon: Icon(
                        Icons.close,
                        color: theme.colorScheme.onPrimaryContainer,
                        size: 20,
                      ),
                      onPressed: onDismiss,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                    ),
                ],
              ),
              const SizedBox(height: 12),

              // Main guidance
              Text(
                guidance.guidance,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onPrimaryContainer,
                  fontWeight: FontWeight.w500,
                ),
              ),

              // Visual cue
              if (guidance.visualCue != null) ...[
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '💡 ',
                      style: TextStyle(
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                    ),
                    Expanded(
                      child: Text(
                        guidance.visualCue!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                  ],
                ),
              ],

              // Audio prompt
              if (guidance.audioPrompt != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surface.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.volume_up_outlined,
                        size: 18,
                        color: theme.colorScheme.primary,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          guidance.audioPrompt!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Encouragement Card - displays AI encouragement on skill guide screen
class EncouragementCard extends StatelessWidget {
  final Encouragement encouragement;

  const EncouragementCard({super.key, required this.encouragement});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      color: Colors.amber.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('🌟', style: TextStyle(fontSize: 24)),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    encouragement.message,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            if (encouragement.celebration != null) ...[
              const SizedBox(height: 8),
              Center(
                child: Text(
                  encouragement.celebration!,
                  style: const TextStyle(fontSize: 32),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Adaptive Plan Card - shows AI-generated learning plan
class AdaptivePlanCard extends StatelessWidget {
  final Map<String, dynamic> plan;
  final VoidCallback? onStartPlan;

  const AdaptivePlanCard({
    super.key,
    required this.plan,
    this.onStartPlan,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final focusAreas = (plan['focusAreas'] as List<dynamic>?)?.cast<String>() ?? [];
    final recommendations = (plan['recommendations'] as List<dynamic>?)?.cast<String>() ?? [];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.tertiaryContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.route,
                    color: theme.colorScheme.onTertiaryContainer,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Your Learning Plan',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Personalized by AI Coach',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Focus areas
            if (focusAreas.isNotEmpty) ...[
              Text(
                'Focus Areas',
                style: theme.textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: focusAreas
                    .map((area) => Chip(
                          label: Text(area),
                          backgroundColor: theme.colorScheme.secondaryContainer,
                        ))
                    .toList(),
              ),
              const SizedBox(height: 16),
            ],

            // Recommendations
            if (recommendations.isNotEmpty) ...[
              Text(
                'Recommendations',
                style: theme.textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              ...recommendations.asMap().entries.map((entry) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            color: theme.colorScheme.primary,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              '${entry.key + 1}',
                              style: TextStyle(
                                color: theme.colorScheme.onPrimary,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(child: Text(entry.value)),
                      ],
                    ),
                  )),
            ],

            // Start button
            if (onStartPlan != null) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: onStartPlan,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Start This Plan'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Safety Coaching Bubble - shows AI feedback during safety scenarios
class SafetyCoachingBubble extends StatelessWidget {
  final String message;
  final bool isPositive;

  const SafetyCoachingBubble({
    super.key,
    required this.message,
    required this.isPositive,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = isPositive ? Colors.green : Colors.orange;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isPositive ? Icons.check_circle : Icons.info,
            color: color,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: color.shade700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

extension on Color {
  // ignore: unused_element
  Color get shade700 {
    final hsl = HSLColor.fromColor(this);
    return hsl.withLightness((hsl.lightness - 0.2).clamp(0.0, 1.0)).toColor();
  }
}
