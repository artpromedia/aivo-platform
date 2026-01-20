import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';
import 'models.dart';
import 'providers.dart';

/// Practice exercises screen with subject-based exercises
class PracticeExercisesScreen extends ConsumerStatefulWidget {
  final String childId;

  const PracticeExercisesScreen({
    super.key,
    required this.childId,
  });

  @override
  ConsumerState<PracticeExercisesScreen> createState() => _PracticeExercisesScreenState();
}

class _PracticeExercisesScreenState extends ConsumerState<PracticeExercisesScreen> {
  String? _selectedSubject;
  DifficultyLevel? _selectedDifficulty;

  @override
  Widget build(BuildContext context) {
    final exercisesAsync = ref.watch(practiceExercisesProvider(widget.childId));
    final progressAsync = ref.watch(exerciseProgressProvider(widget.childId));

    return Column(
      children: [
        // Filters
        Container(
          padding: const EdgeInsets.all(16),
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _selectedSubject,
                  decoration: const InputDecoration(
                    labelText: 'Subject',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  items: const [
                    DropdownMenuItem(value: null, child: Text('All Subjects')),
                    DropdownMenuItem(value: 'Math', child: Text('Math')),
                    DropdownMenuItem(value: 'Reading', child: Text('Reading')),
                    DropdownMenuItem(value: 'Science', child: Text('Science')),
                    DropdownMenuItem(value: 'Writing', child: Text('Writing')),
                  ],
                  onChanged: (value) => setState(() => _selectedSubject = value),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: DropdownButtonFormField<DifficultyLevel>(
                  initialValue: _selectedDifficulty,
                  decoration: const InputDecoration(
                    labelText: 'Difficulty',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('All Levels')),
                    ...DifficultyLevel.values.map(
                      (difficulty) => DropdownMenuItem(
                        value: difficulty,
                        child: Text(difficulty.name.toUpperCase()),
                      ),
                    ),
                  ],
                  onChanged: (value) => setState(() => _selectedDifficulty = value),
                ),
              ),
            ],
          ),
        ),

        // Progress Summary
        if (progressAsync.value != null && progressAsync.value!.isNotEmpty)
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Theme.of(context).colorScheme.primaryContainer,
                  Theme.of(context).colorScheme.secondaryContainer,
                ],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildProgressStat(
                  'Completed',
                  progressAsync.value!.map((p) => p.completedCount).reduce((a, b) => a + b).toString(),
                  Icons.check_circle,
                ),
                _buildProgressStat(
                  'Avg Score',
                  '${(progressAsync.value!.map((p) => p.averageScore).reduce((a, b) => a + b) / progressAsync.value!.length).toStringAsFixed(0)}%',
                  Icons.star,
                ),
                _buildProgressStat(
                  'Improvement',
                  '+${(progressAsync.value!.map((p) => p.improvementRate).reduce((a, b) => a + b) / progressAsync.value!.length).toStringAsFixed(0)}%',
                  Icons.trending_up,
                ),
              ],
            ),
          ),

        // Exercises List
        Expanded(
          child: exercisesAsync.when(
            data: (exercises) {
              final filteredExercises = exercises.where((exercise) {
                if (_selectedSubject != null && exercise.subject != _selectedSubject) {
                  return false;
                }
                if (_selectedDifficulty != null && exercise.difficulty != _selectedDifficulty) {
                  return false;
                }
                return true;
              }).toList();

              if (filteredExercises.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.search_off, size: 64, color: AivoBrand.gray),
                      const SizedBox(height: 16),
                      Text('No exercises found', style: TextStyle(color: AivoBrand.gray)),
                    ],
                  ),
                );
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: filteredExercises.length,
                itemBuilder: (context, index) {
                  final exercise = filteredExercises[index];
                  final progress = progressAsync.value?.firstWhere(
                    (p) => p.exerciseId == exercise.id,
                    orElse: () => ExerciseProgress(
                      exerciseId: exercise.id,
                      exerciseTitle: exercise.title,
                      attemptsCount: 0,
                      completedCount: 0,
                      averageScore: 0,
                      bestScore: 0,
                      improvementRate: 0,
                    ),
                  );

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: InkWell(
                      onTap: () => _startExercise(exercise),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  _getSubjectIcon(exercise.subject),
                                  color: _getSubjectColor(exercise.subject),
                                  size: 32,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        exercise.title,
                                        style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        exercise.subject,
                                        style: TextStyle(fontSize: 14, color: AivoBrand.gray[600]),
                                      ),
                                    ],
                                  ),
                                ),
                                _buildDifficultyChip(exercise.difficulty),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              exercise.description,
                              style: const TextStyle(fontSize: 14),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Icon(Icons.quiz, size: 16, color: AivoBrand.gray[600]),
                                const SizedBox(width: 4),
                                Text('${exercise.questionCount} questions',
                                    style: TextStyle(fontSize: 12, color: AivoBrand.gray[600])),
                                const SizedBox(width: 16),
                                Icon(Icons.timer, size: 16, color: AivoBrand.gray[600]),
                                const SizedBox(width: 4),
                                Text('~${exercise.estimatedTime} min',
                                    style: TextStyle(fontSize: 12, color: AivoBrand.gray[600])),
                              ],
                            ),
                            if (progress != null && progress.attemptsCount > 0) ...[
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '${progress.completedCount} completed',
                                    style: TextStyle(fontSize: 12, color: AivoBrand.gray),
                                  ),
                                  Row(
                                    children: [
                                      const Icon(Icons.star, size: 16, color: Colors.amber),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Best: ${progress.bestScore.toStringAsFixed(0)}%',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  );
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => Center(child: Text('Error: ${error.toString()}')),
          ),
        ),
      ],
    );
  }

  Widget _buildProgressStat(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: Colors.white, size: 28),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Colors.white70),
        ),
      ],
    );
  }

  Widget _buildDifficultyChip(DifficultyLevel difficulty) {
    Color color;
    switch (difficulty) {
      case DifficultyLevel.beginner:
        color = AivoBrand.success;
        break;
      case DifficultyLevel.intermediate:
        color = AivoBrand.warning;
        break;
      case DifficultyLevel.advanced:
        color = AivoBrand.error;
        break;
      case DifficultyLevel.expert:
        color = Colors.purple;
        break;
    }

    return Chip(
      label: Text(
        difficulty.name.toUpperCase(),
        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
      ),
      backgroundColor: color.withOpacity(0.2),
      labelStyle: TextStyle(color: color),
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  Color _getSubjectColor(String subject) {
    switch (subject.toLowerCase()) {
      case 'math':
        return Colors.blue;
      case 'reading':
        return Colors.purple;
      case 'science':
        return AivoBrand.success;
      case 'writing':
        return AivoBrand.warning;
      default:
        return AivoBrand.gray;
    }
  }

  IconData _getSubjectIcon(String subject) {
    switch (subject.toLowerCase()) {
      case 'math':
        return Icons.calculate;
      case 'reading':
        return Icons.book;
      case 'science':
        return Icons.science;
      case 'writing':
        return Icons.edit;
      default:
        return Icons.assignment;
    }
  }

  void _startExercise(PracticeExercise exercise) async {
    await ref.read(exerciseSessionProvider.notifier).startSession(
          exercise.id,
          widget.childId,
        );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Starting ${exercise.title}...')),
      );
    }
  }
}
