/// Speech Exercises Tab
///
/// Displays available speech exercises and allows learners to start practice sessions.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models.dart';
import '../../screens/speech_therapy_screen.dart';

final exercisesProvider = FutureProvider.autoDispose.family<List<SpeechExercise>, String?>((ref, targetSound) async {
  final service = ref.watch(speechTherapyServiceProvider);
  return service.getExercises(targetSound: targetSound);
});

/// Tab showing speech exercises
class SpeechExercisesTab extends ConsumerStatefulWidget {
  const SpeechExercisesTab({
    super.key,
    required this.learnerId,
  });

  final String learnerId;

  @override
  ConsumerState<SpeechExercisesTab> createState() => _SpeechExercisesTabState();
}

class _SpeechExercisesTabState extends ConsumerState<SpeechExercisesTab> {
  String? _selectedSound;

  @override
  Widget build(BuildContext context) {
    final exercisesAsync = ref.watch(exercisesProvider(_selectedSound));

    return Column(
      children: [
        // Sound filter
        Container(
          padding: const EdgeInsets.all(16),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilterChip(
                label: const Text('All Sounds'),
                selected: _selectedSound == null,
                onSelected: (_) => setState(() => _selectedSound = null),
              ),
              ...['s', 'r', 'l', 'th', 'sh', 'ch'].map((sound) => FilterChip(
                    label: Text(sound.toUpperCase()),
                    selected: _selectedSound == sound,
                    onSelected: (_) => setState(() => _selectedSound = sound),
                  )),
            ],
          ),
        ),

        // Exercises list
        Expanded(
          child: exercisesAsync.when(
            data: (exercises) {
              if (exercises.isEmpty) {
                return const Center(
                  child: Text('No exercises available'),
                );
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: exercises.length,
                itemBuilder: (context, index) {
                  final exercise = exercises[index];
                  return _ExerciseCard(
                    exercise: exercise,
                    onTap: () => _startExercise(context, exercise),
                  );
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => Center(
              child: Text('Error loading exercises: $error'),
            ),
          ),
        ),
      ],
    );
  }

  void _startExercise(BuildContext context, SpeechExercise exercise) {
    showModalBottomSheet(
      context: context,
      builder: (context) => _ExerciseDetailsSheet(
        exercise: exercise,
        learnerId: widget.learnerId,
      ),
    );
  }
}

class _ExerciseCard extends StatelessWidget {
  const _ExerciseCard({
    required this.exercise,
    required this.onTap,
  });

  final SpeechExercise exercise;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: Text(
                        exercise.targetSound.sound.toUpperCase(),
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: theme.colorScheme.onPrimaryContainer,
                          fontWeight: FontWeight.bold,
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
                          exercise.title,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          exercise.description,
                          style: theme.textTheme.bodySmall,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _InfoChip(
                    icon: Icons.schedule,
                    label: '${exercise.durationMinutes} min',
                  ),
                  const SizedBox(width: 8),
                  _InfoChip(
                    icon: Icons.star_outline,
                    label: 'Level ${exercise.difficulty}',
                  ),
                  const SizedBox(width: 8),
                  _InfoChip(
                    icon: Icons.book,
                    label: '${exercise.words.length} words',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: 4),
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _ExerciseDetailsSheet extends ConsumerStatefulWidget {
  const _ExerciseDetailsSheet({
    required this.exercise,
    required this.learnerId,
  });

  final SpeechExercise exercise;
  final String learnerId;

  @override
  ConsumerState<_ExerciseDetailsSheet> createState() => _ExerciseDetailsSheetState();
}

class _ExerciseDetailsSheetState extends ConsumerState<_ExerciseDetailsSheet> {
  int _currentStep = 0;
  bool _isPracticing = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (!_isPracticing) {
      return Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.exercise.title,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              widget.exercise.description,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            Text(
              'Instructions:',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ...widget.exercise.instructions.asMap().entries.map((entry) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            '${entry.key + 1}',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: theme.colorScheme.onPrimaryContainer,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          entry.value,
                          style: theme.textTheme.bodyMedium,
                        ),
                      ),
                    ],
                  ),
                )),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => setState(() => _isPracticing = true),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.all(16),
                ),
                child: const Text('Start Exercise'),
              ),
            ),
          ],
        ),
      );
    }

    // Practice mode
    final currentWord = widget.exercise.words[_currentStep];

    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Progress
          Row(
            children: [
              Text(
                'Word ${_currentStep + 1} of ${widget.exercise.words.length}',
                style: theme.textTheme.titleMedium,
              ),
              const Spacer(),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('End'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: (_currentStep + 1) / widget.exercise.words.length,
          ),
          const SizedBox(height: 32),

          // Word display
          if (currentWord.imageUrl != null)
            Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Center(
                child: Icon(Icons.image, size: 64),
              ),
            ),
          const SizedBox(height: 24),
          Text(
            currentWord.word,
            style: theme.textTheme.displaySmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: theme.colorScheme.primary,
            ),
          ),
          if (currentWord.phonetic != null) ...[
            const SizedBox(height: 8),
            Text(
              currentWord.phonetic!,
              style: theme.textTheme.titleMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
          const SizedBox(height: 32),

          // Action buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    // Play audio
                  },
                  icon: const Icon(Icons.volume_up),
                  label: const Text('Listen'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _nextWord,
                  icon: const Icon(Icons.check),
                  label: const Text('Next'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _nextWord() {
    if (_currentStep < widget.exercise.words.length - 1) {
      setState(() => _currentStep++);
    } else {
      // Complete exercise
      ref
          .read(speechTherapyServiceProvider)
          .completeExercise(widget.learnerId, widget.exercise.id);
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Exercise completed!')),
      );
    }
  }
}
