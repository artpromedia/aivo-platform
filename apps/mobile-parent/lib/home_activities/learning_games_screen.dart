import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'models.dart';
import 'providers.dart';

/// Learning games screen with game catalog and progress tracking
class LearningGamesScreen extends ConsumerStatefulWidget {
  final String childId;

  const LearningGamesScreen({
    super.key,
    required this.childId,
  });

  @override
  ConsumerState<LearningGamesScreen> createState() => _LearningGamesScreenState();
}

class _LearningGamesScreenState extends ConsumerState<LearningGamesScreen> {
  GameCategory? _selectedCategory;
  DifficultyLevel? _selectedDifficulty;

  @override
  Widget build(BuildContext context) {
    final gamesAsync = ref.watch(learningGamesProvider(widget.childId));
    final progressAsync = ref.watch(gameProgressProvider(widget.childId));

    return Column(
      children: [
        // Filters
        Container(
          padding: const EdgeInsets.all(16),
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<GameCategory>(
                  initialValue: _selectedCategory,
                  decoration: const InputDecoration(
                    labelText: 'Category',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('All Categories')),
                    ...GameCategory.values.map(
                      (category) => DropdownMenuItem(
                        value: category,
                        child: Text(category.name.replaceAll('_', ' ').toUpperCase()),
                      ),
                    ),
                  ],
                  onChanged: (value) => setState(() => _selectedCategory = value),
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
            padding: const EdgeInsets.all(16),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Your Progress',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildProgressStat(
                          'Games Played',
                          progressAsync.value!.length.toString(),
                          Icons.gamepad,
                        ),
                        _buildProgressStat(
                          'Avg Score',
                          '${(progressAsync.value!.map((p) => p.averageScore).reduce((a, b) => a + b) / progressAsync.value!.length).toStringAsFixed(0)}%',
                          Icons.star,
                        ),
                        _buildProgressStat(
                          'Total Time',
                          '${(progressAsync.value!.map((p) => p.totalTimeSpent).reduce((a, b) => a + b) / 60).toStringAsFixed(0)}h',
                          Icons.timer,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

        // Games Grid
        Expanded(
          child: gamesAsync.when(
            data: (games) {
              final filteredGames = games.where((game) {
                if (_selectedCategory != null && game.category != _selectedCategory) {
                  return false;
                }
                if (_selectedDifficulty != null && game.difficulty != _selectedDifficulty) {
                  return false;
                }
                return true;
              }).toList();

              if (filteredGames.isEmpty) {
                return const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.search_off, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text('No games found', style: TextStyle(color: Colors.grey)),
                    ],
                  ),
                );
              }

              return GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.75,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: filteredGames.length,
                itemBuilder: (context, index) {
                  final game = filteredGames[index];
                  return _buildGameCard(game);
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => Center(
              child: Text('Error: ${error.toString()}'),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProgressStat(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }

  Widget _buildGameCard(LearningGame game) {
    final progress = ref.watch(gameProgressProvider(widget.childId)).value?.firstWhere(
          (p) => p.gameId == game.id,
          orElse: () => GameProgress(
            gameId: game.id,
            gameTitle: game.title,
            totalPlays: 0,
            totalTimeSpent: 0,
            averageScore: 0,
            bestScore: 0,
            lastPlayed: DateTime.now(),
            streak: 0,
          ),
        );

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _showGameDetails(game),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail
            Container(
              height: 120,
              color: _getCategoryColor(game.category).withValues(alpha: 0.2),
              child: Center(
                child: Icon(
                  _getCategoryIcon(game.category),
                  size: 48,
                  color: _getCategoryColor(game.category),
                ),
              ),
            ),
            
            // Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      game.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.timer, size: 14, color: Colors.grey[600]),
                        const SizedBox(width: 4),
                        Text(
                          '${game.estimatedTime} min',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    _buildDifficultyBadge(game.difficulty),
                    const Spacer(),
                    if (progress != null && progress.totalPlays > 0)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${progress.totalPlays} plays',
                            style: const TextStyle(fontSize: 11, color: Colors.grey),
                          ),
                          Row(
                            children: [
                              const Icon(Icons.star, size: 14, color: Colors.amber),
                              Text(
                                '${progress.averageScore.toStringAsFixed(0)}%',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDifficultyBadge(DifficultyLevel difficulty) {
    Color color;
    switch (difficulty) {
      case DifficultyLevel.beginner:
        color = Colors.green;
        break;
      case DifficultyLevel.intermediate:
        color = Colors.orange;
        break;
      case DifficultyLevel.advanced:
        color = Colors.red;
        break;
      case DifficultyLevel.expert:
        color = Colors.purple;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        difficulty.name.toUpperCase(),
        style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.bold),
      ),
    );
  }

  Color _getCategoryColor(GameCategory category) {
    switch (category) {
      case GameCategory.math:
        return Colors.blue;
      case GameCategory.reading:
        return Colors.purple;
      case GameCategory.science:
        return Colors.green;
      case GameCategory.art:
        return Colors.pink;
      case GameCategory.music:
        return Colors.orange;
      case GameCategory.logic:
        return Colors.indigo;
      case GameCategory.memory:
        return Colors.teal;
      case GameCategory.problem_solving:
        return Colors.deepOrange;
      case GameCategory.educational:
        return Colors.amber;
    }
  }

  IconData _getCategoryIcon(GameCategory category) {
    switch (category) {
      case GameCategory.math:
        return Icons.calculate;
      case GameCategory.reading:
        return Icons.book;
      case GameCategory.science:
        return Icons.science;
      case GameCategory.art:
        return Icons.palette;
      case GameCategory.music:
        return Icons.music_note;
      case GameCategory.logic:
        return Icons.psychology;
      case GameCategory.memory:
        return Icons.memory;
      case GameCategory.problem_solving:
        return Icons.lightbulb;
      case GameCategory.educational:
        return Icons.school;
    }
  }

  void _showGameDetails(LearningGame game) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(24),
          child: ListView(
            controller: scrollController,
            children: [
              Row(
                children: [
                  Icon(
                    _getCategoryIcon(game.category),
                    size: 48,
                    color: _getCategoryColor(game.category),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          game.title,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          game.skillArea,
                          style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              
              Text(
                game.description,
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 24),

              // Details
              _buildDetailRow(Icons.timer, 'Time', '${game.estimatedTime} minutes'),
              _buildDetailRow(Icons.child_care, 'Age', '${game.recommendedAge}+'),
              _buildDetailRow(Icons.signal_cellular_alt, 'Difficulty', game.difficulty.name.toUpperCase()),
              
              const SizedBox(height: 24),
              const Text(
                'Learning Objectives',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              ...game.learningObjectives.map(
                (objective) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.check_circle, size: 20, color: Colors.green),
                      const SizedBox(width: 8),
                      Expanded(child: Text(objective)),
                    ],
                  ),
                ),
              ),
              
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () async {
                  Navigator.pop(context);
                  await ref.read(gameSessionProvider.notifier).startSession(
                        game.id,
                        widget.childId,
                      );
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Starting ${game.title}...')),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text('START GAME', style: TextStyle(fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Text(
            '$label:',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
          ),
          const SizedBox(width: 8),
          Text(
            value,
            style: const TextStyle(fontSize: 14),
          ),
        ],
      ),
    );
  }
}
