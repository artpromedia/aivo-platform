import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Adaptive Games Screen
///
/// Displays a grid of adaptive learning games that adjust
/// difficulty based on learner performance.
class AdaptiveGamesScreen extends ConsumerStatefulWidget {
  final String learnerId;

  const AdaptiveGamesScreen({
    super.key,
    required this.learnerId,
  });

  @override
  ConsumerState<AdaptiveGamesScreen> createState() => _AdaptiveGamesScreenState();
}

class _AdaptiveGamesScreenState extends ConsumerState<AdaptiveGamesScreen> {
  String _selectedSubject = 'all';
  String _selectedDifficulty = 'adaptive';

  final List<Map<String, dynamic>> _games = [
    {
      'id': 'memory-math',
      'title': 'Math Memory',
      'description': 'Match equations with their answers',
      'type': 'memory',
      'subject': 'math',
      'icon': '🧠',
      'difficulty': 'adaptive',
    },
    {
      'id': 'pattern-sequence',
      'title': 'Pattern Finder',
      'description': 'Complete the pattern sequence',
      'type': 'pattern',
      'subject': 'math',
      'icon': '🔷',
      'difficulty': 'adaptive',
    },
    {
      'id': 'word-sort',
      'title': 'Word Sorter',
      'description': 'Sort words into categories',
      'type': 'sorting',
      'subject': 'reading',
      'icon': '📊',
      'difficulty': 'adaptive',
    },
    {
      'id': 'vocab-match',
      'title': 'Vocabulary Match',
      'description': 'Match words with definitions',
      'type': 'matching',
      'subject': 'reading',
      'icon': '🔗',
      'difficulty': 'adaptive',
    },
    {
      'id': 'story-sequence',
      'title': 'Story Builder',
      'description': 'Put story events in order',
      'type': 'sequencing',
      'subject': 'reading',
      'icon': '🔢',
      'difficulty': 'adaptive',
    },
    {
      'id': 'science-match',
      'title': 'Science Explorer',
      'description': 'Match science concepts',
      'type': 'matching',
      'subject': 'science',
      'icon': '🔬',
      'difficulty': 'adaptive',
    },
  ];

  List<Map<String, dynamic>> get filteredGames {
    return _games.where((game) {
      if (_selectedSubject != 'all' && game['subject'] != _selectedSubject) {
        return false;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Learning Games'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterSheet,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Subject filter chips
            Padding(
              padding: const EdgeInsets.all(16),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip('All', 'all'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Math', 'math'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Reading', 'reading'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Science', 'science'),
                  ],
                ),
              ),
            ),
            // Games grid
            Expanded(
              child: GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 0.85,
                ),
                itemCount: filteredGames.length,
                itemBuilder: (context, index) {
                  final game = filteredGames[index];
                  return _buildGameCard(game);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedSubject == value;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          _selectedSubject = value;
        });
      },
    );
  }

  Widget _buildGameCard(Map<String, dynamic> game) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _launchGame(game['id']),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Icon header
            Container(
              height: 80,
              color: Theme.of(context).primaryColor.withOpacity(0.1),
              child: Center(
                child: Text(
                  game['icon'],
                  style: const TextStyle(fontSize: 40),
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
                      game['title'],
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      game['description'],
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    // Adaptive badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.purple.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.auto_awesome,
                            size: 12,
                            color: Colors.purple[700],
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Adaptive',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: Colors.purple[700],
                            ),
                          ),
                        ],
                      ),
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

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Filter Games',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Text(
              'Difficulty',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                ChoiceChip(
                  label: const Text('🤖 Adaptive'),
                  selected: _selectedDifficulty == 'adaptive',
                  onSelected: (_) => setState(() => _selectedDifficulty = 'adaptive'),
                ),
                ChoiceChip(
                  label: const Text('🌱 Easy'),
                  selected: _selectedDifficulty == 'easy',
                  onSelected: (_) => setState(() => _selectedDifficulty = 'easy'),
                ),
                ChoiceChip(
                  label: const Text('🌿 Medium'),
                  selected: _selectedDifficulty == 'medium',
                  onSelected: (_) => setState(() => _selectedDifficulty = 'medium'),
                ),
                ChoiceChip(
                  label: const Text('🌳 Hard'),
                  selected: _selectedDifficulty == 'hard',
                  onSelected: (_) => setState(() => _selectedDifficulty = 'hard'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Apply Filters'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _launchGame(String gameId) {
    // TODO: Navigate to game player screen
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Launching game: $gameId')),
    );
  }
}
