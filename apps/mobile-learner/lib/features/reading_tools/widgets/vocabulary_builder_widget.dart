/// Vocabulary Builder Widget
///
/// Helps learners build vocabulary through:
/// - Word lists with definitions
/// - Flashcard practice
/// - Mastery tracking
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../reading_tools_models.dart';

/// Vocabulary mode enum
enum VocabularyMode { list, flashcards, practice }

/// Vocabulary Builder Widget
class VocabularyBuilderWidget extends ConsumerStatefulWidget {
  const VocabularyBuilderWidget({
    super.key,
    required this.learnerId,
  });

  final String learnerId;

  @override
  ConsumerState<VocabularyBuilderWidget> createState() =>
      _VocabularyBuilderWidgetState();
}

class _VocabularyBuilderWidgetState
    extends ConsumerState<VocabularyBuilderWidget> {
  VocabularyMode _mode = VocabularyMode.list;
  List<VocabularyWord> _words = [];
  bool _isLoading = true;
  int _currentFlashcardIndex = 0;
  bool _showDefinition = false;

  // Mock vocabulary words for demo
  final List<VocabularyWord> _mockWords = [
    VocabularyWord(
      id: '1',
      word: 'Perseverance',
      definition: 'The quality of continuing to try to achieve something difficult',
      pronunciation: '/ˌpɜːrsɪˈvɪərəns/',
      example: 'Her perseverance paid off when she finally passed the test.',
      masteryLevel: 3,
      addedAt: DateTime.now().subtract(const Duration(days: 5)),
    ),
    VocabularyWord(
      id: '2',
      word: 'Hypothesis',
      definition: 'A proposed explanation for something that can be tested',
      pronunciation: '/haɪˈpɒθəsɪs/',
      example: 'The scientist formed a hypothesis before starting the experiment.',
      masteryLevel: 2,
      addedAt: DateTime.now().subtract(const Duration(days: 3)),
    ),
    VocabularyWord(
      id: '3',
      word: 'Metamorphosis',
      definition: 'A complete change in form or character',
      pronunciation: '/ˌmetəˈmɔːfəsɪs/',
      example: 'The caterpillar undergoes metamorphosis to become a butterfly.',
      masteryLevel: 1,
      addedAt: DateTime.now().subtract(const Duration(days: 2)),
    ),
    VocabularyWord(
      id: '4',
      word: 'Ecosystem',
      definition: 'A community of living organisms interacting with their environment',
      pronunciation: '/ˈiːkəʊsɪstəm/',
      example: 'The rainforest is a complex ecosystem with many species.',
      masteryLevel: 4,
      addedAt: DateTime.now().subtract(const Duration(days: 7)),
    ),
    VocabularyWord(
      id: '5',
      word: 'Inference',
      definition: 'A conclusion reached based on evidence and reasoning',
      pronunciation: '/ˈɪnfərəns/',
      example: 'Based on the clues, she made an inference about the solution.',
      masteryLevel: 2,
      addedAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadWords();
  }

  Future<void> _loadWords() async {
    // In production, load from API
    await Future.delayed(const Duration(milliseconds: 500));
    setState(() {
      _words = _mockWords;
      _isLoading = false;
    });
  }

  void _nextFlashcard() {
    setState(() {
      _showDefinition = false;
      _currentFlashcardIndex = (_currentFlashcardIndex + 1) % _words.length;
    });
  }

  void _previousFlashcard() {
    setState(() {
      _showDefinition = false;
      _currentFlashcardIndex =
          (_currentFlashcardIndex - 1 + _words.length) % _words.length;
    });
  }

  Color _getMasteryColor(int level) {
    switch (level) {
      case 0:
        return Colors.grey;
      case 1:
        return Colors.red;
      case 2:
        return Colors.orange;
      case 3:
        return Colors.yellow.shade700;
      case 4:
        return Colors.lightGreen;
      case 5:
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    return Column(
      children: [
        // Mode Selector
        Padding(
          padding: const EdgeInsets.all(16),
          child: SegmentedButton<VocabularyMode>(
            segments: const [
              ButtonSegment(
                value: VocabularyMode.list,
                icon: Icon(Icons.list),
                label: Text('List'),
              ),
              ButtonSegment(
                value: VocabularyMode.flashcards,
                icon: Icon(Icons.style),
                label: Text('Cards'),
              ),
              ButtonSegment(
                value: VocabularyMode.practice,
                icon: Icon(Icons.quiz),
                label: Text('Practice'),
              ),
            ],
            selected: {_mode},
            onSelectionChanged: (selected) {
              setState(() => _mode = selected.first);
            },
          ),
        ),

        Expanded(
          child: switch (_mode) {
            VocabularyMode.list => _buildWordList(theme, colorScheme),
            VocabularyMode.flashcards => _buildFlashcards(theme, colorScheme),
            VocabularyMode.practice => _buildPractice(theme, colorScheme),
          },
        ),
      ],
    );
  }

  Widget _buildWordList(ThemeData theme, ColorScheme colorScheme) {
    return Column(
      children: [
        // Stats header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: colorScheme.surfaceContainerHighest,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStatItem('Total Words', '${_words.length}', Icons.book),
              _buildStatItem(
                'Mastered',
                '${_words.where((w) => w.masteryLevel >= 4).length}',
                Icons.star,
              ),
              _buildStatItem(
                'Learning',
                '${_words.where((w) => w.masteryLevel < 4).length}',
                Icons.trending_up,
              ),
            ],
          ),
        ),

        // Word list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _words.length,
            itemBuilder: (context, index) {
              final word = _words[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ExpansionTile(
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: _getMasteryColor(word.masteryLevel).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: Text(
                        word.word[0].toUpperCase(),
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: _getMasteryColor(word.masteryLevel),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  title: Text(
                    word.word,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  subtitle: Row(
                    children: [
                      ...List.generate(
                        5,
                        (i) => Icon(
                          i < word.masteryLevel
                              ? Icons.star
                              : Icons.star_border,
                          size: 16,
                          color: _getMasteryColor(word.masteryLevel),
                        ),
                      ),
                    ],
                  ),
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (word.pronunciation != null) ...[
                            Text(
                              word.pronunciation!,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: colorScheme.onSurfaceVariant,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                            const SizedBox(height: 8),
                          ],
                          Text(
                            word.definition,
                            style: theme.textTheme.bodyLarge,
                          ),
                          if (word.example != null) ...[
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: colorScheme.surfaceContainerHighest,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(
                                    Icons.format_quote,
                                    size: 20,
                                    color: colorScheme.primary,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      word.example!,
                                      style: theme.textTheme.bodyMedium?.copyWith(
                                        fontStyle: FontStyle.italic,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              OutlinedButton.icon(
                                onPressed: () {},
                                icon: const Icon(Icons.volume_up, size: 18),
                                label: const Text('Listen'),
                              ),
                              const SizedBox(width: 8),
                              OutlinedButton.icon(
                                onPressed: () {},
                                icon: const Icon(Icons.edit, size: 18),
                                label: const Text('Edit'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),

        // Add word button
        Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton.icon(
            onPressed: () => _showAddWordDialog(context),
            icon: const Icon(Icons.add),
            label: const Text('Add New Word'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }

  Widget _buildFlashcards(ThemeData theme, ColorScheme colorScheme) {
    if (_words.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.style, size: 64, color: colorScheme.onSurfaceVariant),
            const SizedBox(height: 16),
            Text('No flashcards yet', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text('Add words to your vocabulary to practice!'),
          ],
        ),
      );
    }

    final word = _words[_currentFlashcardIndex];

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Progress indicator
          Text(
            '${_currentFlashcardIndex + 1} of ${_words.length}',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: (_currentFlashcardIndex + 1) / _words.length,
          ),
          const SizedBox(height: 24),

          // Flashcard
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _showDefinition = !_showDefinition),
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                transitionBuilder: (child, animation) {
                  return FadeTransition(opacity: animation, child: child);
                },
                child: Card(
                  key: ValueKey('$_currentFlashcardIndex-$_showDefinition'),
                  elevation: 4,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (!_showDefinition) ...[
                          Text(
                            word.word,
                            style: theme.textTheme.headlineLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          if (word.pronunciation != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              word.pronunciation!,
                              style: theme.textTheme.titleMedium?.copyWith(
                                color: colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                          const SizedBox(height: 24),
                          Text(
                            'Tap to see definition',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ] else ...[
                          Text(
                            word.definition,
                            style: theme.textTheme.headlineSmall,
                            textAlign: TextAlign.center,
                          ),
                          if (word.example != null) ...[
                            const SizedBox(height: 24),
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: colorScheme.surfaceContainerHighest,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '"${word.example}"',
                                style: theme.textTheme.bodyLarge?.copyWith(
                                  fontStyle: FontStyle.italic,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ],
                          const SizedBox(height: 24),
                          Text(
                            'Tap to see word',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Navigation and rating buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton.filled(
                onPressed: _previousFlashcard,
                icon: const Icon(Icons.arrow_back),
              ),
              Row(
                children: [
                  FilledButton.tonalIcon(
                    onPressed: () {
                      // Mark as needs practice
                      _nextFlashcard();
                    },
                    icon: const Icon(Icons.replay, color: Colors.orange),
                    label: const Text('Again'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    onPressed: () {
                      // Mark as known
                      _nextFlashcard();
                    },
                    icon: const Icon(Icons.check),
                    label: const Text('Got it!'),
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.green,
                    ),
                  ),
                ],
              ),
              IconButton.filled(
                onPressed: _nextFlashcard,
                icon: const Icon(Icons.arrow_forward),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPractice(ThemeData theme, ColorScheme colorScheme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.quiz,
              size: 80,
              color: colorScheme.primary,
            ),
            const SizedBox(height: 24),
            Text(
              'Practice Mode',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Test your knowledge with quizzes and matching games!',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.play_arrow),
              label: const Text('Start Quiz'),
              style: FilledButton.styleFrom(
                minimumSize: const Size(200, 48),
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.grid_view),
              label: const Text('Matching Game'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(200, 48),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddWordDialog(BuildContext context) {
    final wordController = TextEditingController();
    final definitionController = TextEditingController();
    final exampleController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Add New Word',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: wordController,
              decoration: const InputDecoration(
                labelText: 'Word',
                border: OutlineInputBorder(),
              ),
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: definitionController,
              decoration: const InputDecoration(
                labelText: 'Definition',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: exampleController,
              decoration: const InputDecoration(
                labelText: 'Example sentence (optional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: () {
                    // Add word logic
                    Navigator.pop(context);
                  },
                  child: const Text('Add Word'),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
