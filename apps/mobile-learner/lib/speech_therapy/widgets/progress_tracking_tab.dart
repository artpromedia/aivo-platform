/// Progress Tracking Tab
///
/// Displays learner's speech therapy progress, statistics, and achievements.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';

import '../models.dart';
import '../../screens/speech_therapy_screen.dart';

final progressProvider =
    FutureProvider.autoDispose.family<SpeechProgress, String>((ref, learnerId) async {
  final service = ref.watch(speechTherapyServiceProvider);
  return service.getProgress(learnerId);
});

final assessmentHistoryProvider =
    FutureProvider.autoDispose.family<List<ArticulationAssessment>, String>((ref, learnerId) async {
  final service = ref.watch(speechTherapyServiceProvider);
  return service.getAssessmentHistory(learnerId);
});

/// Tab for viewing progress and statistics
class ProgressTrackingTab extends ConsumerWidget {
  const ProgressTrackingTab({
    super.key,
    required this.learnerId,
  });

  final String learnerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final progressAsync = ref.watch(progressProvider(learnerId));
    final historyAsync = ref.watch(assessmentHistoryProvider(learnerId));

    return progressAsync.when(
      data: (progress) {
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(progressProvider(learnerId));
            ref.invalidate(assessmentHistoryProvider(learnerId));
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Overall stats
              _OverallStatsCard(progress: progress),
              const SizedBox(height: 16),

              // Streak
              _StreakCard(progress: progress),
              const SizedBox(height: 16),

              // Sound progress
              _SoundProgressSection(progress: progress),
              const SizedBox(height: 16),

              // Recent assessments
              historyAsync.when(
                data: (assessments) => _RecentAssessmentsSection(assessments: assessments),
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (_, __) => const SizedBox.shrink(),
              ),
            ],
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(
        child: Text('Error loading progress: $error'),
      ),
    );
  }
}

class _OverallStatsCard extends StatelessWidget {
  const _OverallStatsCard({required this.progress});

  final SpeechProgress progress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Overall Progress',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: _StatItem(
                    icon: Icons.check_circle_outline,
                    label: 'Completed',
                    value: '${progress.exercisesCompleted}/${progress.totalExercises}',
                    color: AivoBrand.success,
                  ),
                ),
                Expanded(
                  child: _StatItem(
                    icon: Icons.mic,
                    label: 'Recordings',
                    value: progress.totalRecordings.toString(),
                    color: Colors.blue,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _StatItem(
                    icon: Icons.schedule,
                    label: 'Practice Time',
                    value: '${progress.practiceMinutes} min',
                    color: AivoBrand.warning,
                  ),
                ),
                Expanded(
                  child: _StatItem(
                    icon: Icons.star,
                    label: 'Accuracy',
                    value: '${(progress.overallAccuracy * 100).toStringAsFixed(0)}%',
                    color: Colors.purple,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Completion progress bar
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Exercise Completion',
                      style: theme.textTheme.titleSmall,
                    ),
                    Text(
                      '${progress.completionRate.toStringAsFixed(0)}%',
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: progress.completionRate / 100,
                    minHeight: 12,
                    backgroundColor: theme.colorScheme.surfaceContainerHighest,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 24),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

class _StreakCard extends StatelessWidget {
  const _StreakCard({required this.progress});

  final SpeechProgress progress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AivoBrand.sunshine[400]!, AivoBrand.error],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Text(
                  '🔥',
                  style: TextStyle(fontSize: 32),
                ),
              ),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Practice Streak',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${progress.currentStreakDays} days',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Longest: ${progress.longestStreakDays} days',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SoundProgressSection extends StatelessWidget {
  const _SoundProgressSection({required this.progress});

  final SpeechProgress progress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (progress.soundProgress.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Sound Progress',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ...progress.soundProgress.entries.map((entry) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: _SoundProgressItem(
                  sound: entry.key,
                  soundProgress: entry.value,
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _SoundProgressItem extends StatelessWidget {
  const _SoundProgressItem({
    required this.sound,
    required this.soundProgress,
  });

  final String sound;
  final SoundProgress soundProgress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(
                  sound.toUpperCase(),
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.onPrimaryContainer,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Level: ${_getLevelName(soundProgress.currentLevel)}',
                        style: theme.textTheme.titleSmall,
                      ),
                      Text(
                        '${soundProgress.successRate.toStringAsFixed(0)}% success',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${soundProgress.successful}/${soundProgress.attempts} attempts',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: soundProgress.successRate / 100,
            minHeight: 8,
            backgroundColor: theme.colorScheme.surfaceContainerHighest,
          ),
        ),
      ],
    );
  }

  String _getLevelName(PracticeType type) {
    switch (type) {
      case PracticeType.isolation:
        return 'Isolation';
      case PracticeType.syllable:
        return 'Syllable';
      case PracticeType.word:
        return 'Word';
      case PracticeType.phrase:
        return 'Phrase';
      case PracticeType.sentence:
        return 'Sentence';
      case PracticeType.conversation:
        return 'Conversation';
    }
  }
}

class _RecentAssessmentsSection extends StatelessWidget {
  const _RecentAssessmentsSection({required this.assessments});

  final List<ArticulationAssessment> assessments;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (assessments.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Recent Assessments',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ...assessments.take(5).map((assessment) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _AssessmentItem(assessment: assessment),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _AssessmentItem extends StatelessWidget {
  const _AssessmentItem({required this.assessment});

  final ArticulationAssessment assessment;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: _getAccuracyColor(assessment.overallAccuracy),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                '${(assessment.overallAccuracy * 100).toStringAsFixed(0)}%',
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Sound: ${assessment.targetSound.toUpperCase()}',
                  style: theme.textTheme.titleSmall,
                ),
                Text(
                  _formatDate(assessment.timestamp),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            assessment.overallAccuracy >= 0.7 ? Icons.check_circle : Icons.pending,
            color: _getAccuracyColor(assessment.overallAccuracy),
          ),
        ],
      ),
    );
  }

  Color _getAccuracyColor(double accuracy) {
    if (accuracy >= 0.8) return AivoBrand.success;
    if (accuracy >= 0.6) return AivoBrand.warning;
    return AivoBrand.error;
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }
}
