import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../pin/pin_storage.dart';
import '../study_skills_models.dart';
import '../study_skills_service.dart';

/// Memory Techniques Screen
///
/// Provides memory tools including:
/// - Flashcard decks with spaced repetition
/// - Memory techniques library (mnemonics, visualization, etc.)
/// - Review sessions
class MemoryTechniquesScreen extends StatefulWidget {
  final String learnerId;

  const MemoryTechniquesScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<MemoryTechniquesScreen> createState() => _MemoryTechniquesScreenState();
}

class _MemoryTechniquesScreenState extends State<MemoryTechniquesScreen>
    with SingleTickerProviderStateMixin {
  StudySkillsService? _service;
  late TabController _tabController;

  List<MemoryTechnique> _techniques = [];
  List<MemoryCard> _cards = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _initializeService();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    final token = await storage.read() ?? '';

    _service = StudySkillsService(accessToken: token);
    await _loadData();
  }

  Future<void> _loadData() async {
    if (_service == null) return;

    setState(() => _isLoading = true);

    try {
      final results = await Future.wait([
        _service!.getMemoryTechniques(widget.learnerId),
        _service!.getMemoryCards(widget.learnerId),
      ]);

      if (mounted) {
        setState(() {
          _techniques = results[0] as List<MemoryTechnique>;
          _cards = results[1] as List<MemoryCard>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Map<String, List<MemoryCard>> get _cardsByDeck {
    final decks = <String, List<MemoryCard>>{};
    for (final card in _cards) {
      decks.putIfAbsent(card.deck, () => []).add(card);
    }
    return decks;
  }

  int get _dueCardsCount {
    return _cards.where((c) {
      return c.nextReview == null || c.nextReview!.isBefore(DateTime.now());
    }).length;
  }

  void _showCreateCardDialog() {
    final frontController = TextEditingController();
    final backController = TextEditingController();
    final subjectController = TextEditingController();
    final deckController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('New Flashcard'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: frontController,
                decoration: const InputDecoration(
                  labelText: 'Front (Question)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: backController,
                decoration: const InputDecoration(
                  labelText: 'Back (Answer)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: subjectController,
                decoration: const InputDecoration(
                  labelText: 'Subject',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: deckController,
                decoration: const InputDecoration(
                  labelText: 'Deck Name',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (frontController.text.isNotEmpty &&
                  backController.text.isNotEmpty &&
                  subjectController.text.isNotEmpty &&
                  deckController.text.isNotEmpty &&
                  _service != null) {
                await _service!.createMemoryCard(
                  userId: widget.learnerId,
                  front: frontController.text,
                  back: backController.text,
                  subject: subjectController.text,
                  deck: deckController.text,
                );
                if (mounted) {
                  Navigator.pop(context);
                  _loadData();
                }
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  void _startReviewSession(List<MemoryCard> cards) {
    if (cards.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No cards to review')),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _FlashcardReviewScreen(
          cards: cards,
          learnerId: widget.learnerId,
        ),
      ),
    ).then((_) => _loadData());
  }

  IconData _getTechniqueIcon(MemoryTechniqueType type) {
    switch (type) {
      case MemoryTechniqueType.mnemonic:
        return Icons.text_fields;
      case MemoryTechniqueType.visualization:
        return Icons.visibility;
      case MemoryTechniqueType.chunking:
        return Icons.grid_view;
      case MemoryTechniqueType.association:
        return Icons.link;
      case MemoryTechniqueType.storyMethod:
        return Icons.auto_stories;
      case MemoryTechniqueType.custom:
        return Icons.edit;
    }
  }

  Color _getTechniqueColor(MemoryTechniqueType type) {
    switch (type) {
      case MemoryTechniqueType.mnemonic:
        return const Color(0xFF3B82F6);
      case MemoryTechniqueType.visualization:
        return const Color(0xFF8B5CF6);
      case MemoryTechniqueType.chunking:
        return const Color(0xFF10B981);
      case MemoryTechniqueType.association:
        return const Color(0xFFF59E0B);
      case MemoryTechniqueType.storyMethod:
        return const Color(0xFFEC4899);
      case MemoryTechniqueType.custom:
        return AivoBrand.gray;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Memory Techniques'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Flashcards'),
            Tab(text: 'Techniques'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildFlashcardsTab(),
                _buildTechniquesTab(),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateCardDialog,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildFlashcardsTab() {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Quick review card
            if (_dueCardsCount > 0)
              Card(
                color: const Color(0xFF8B5CF6),
                child: InkWell(
                  onTap: () {
                    final dueCards = _cards.where((c) {
                      return c.nextReview == null ||
                          c.nextReview!.isBefore(DateTime.now());
                    }).toList();
                    _startReviewSession(dueCards);
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.play_circle_fill,
                          color: Colors.white,
                          size: 48,
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Review Due Cards',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '$_dueCardsCount cards ready for review',
                                style: const TextStyle(
                                  color: Colors.white70,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          Icons.arrow_forward,
                          color: Colors.white,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 24),

            // Decks
            const Text(
              'Your Decks',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),

            if (_cardsByDeck.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      Icon(Icons.style,
                          size: 48, color: AivoBrand.gray.shade400),
                      const SizedBox(height: 12),
                      Text(
                        'No flashcards yet',
                        style: TextStyle(
                          fontSize: 16,
                          color: AivoBrand.gray.shade600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text('Tap + to create your first card'),
                    ],
                  ),
                ),
              )
            else
              ..._cardsByDeck.entries.map((entry) {
                final deckName = entry.key;
                final deckCards = entry.value;
                final dueCount = deckCards.where((c) {
                  return c.nextReview == null ||
                      c.nextReview!.isBefore(DateTime.now());
                }).length;

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: InkWell(
                    onTap: () => _startReviewSession(deckCards),
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color:
                                  const Color(0xFF8B5CF6).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.style,
                              color: Color(0xFF8B5CF6),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  deckName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${deckCards.length} cards',
                                  style: TextStyle(
                                    color: AivoBrand.gray.shade600,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (dueCount > 0)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFF8B5CF6),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '$dueCount due',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  Widget _buildTechniquesTab() {
    if (_techniques.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.psychology, size: 64, color: AivoBrand.gray.shade400),
            const SizedBox(height: 16),
            Text(
              'No techniques yet',
              style: TextStyle(
                fontSize: 18,
                color: AivoBrand.gray.shade600,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _techniques.length,
        itemBuilder: (context, index) {
          final technique = _techniques[index];
          final color = _getTechniqueColor(technique.type);

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: InkWell(
              onTap: () => _showTechniqueDetail(technique),
              borderRadius: BorderRadius.circular(12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        _getTechniqueIcon(technique.type),
                        color: color,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            technique.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            technique.description,
                            style: TextStyle(
                              color: AivoBrand.gray.shade600,
                              fontSize: 13,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              // Effectiveness stars
                              ...List.generate(5, (i) {
                                return Icon(
                                  i < technique.effectiveness
                                      ? Icons.star
                                      : Icons.star_border,
                                  size: 14,
                                  color: const Color(0xFFF59E0B),
                                );
                              }),
                              const Spacer(),
                              Text(
                                'Used ${technique.timesUsed}x',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AivoBrand.gray.shade500,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  void _showTechniqueDetail(MemoryTechnique technique) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        final color = _getTechniqueColor(technique.type);

        return DraggableScrollableSheet(
          initialChildSize: 0.6,
          maxChildSize: 0.9,
          minChildSize: 0.4,
          expand: false,
          builder: (context, scrollController) {
            return SingleChildScrollView(
              controller: scrollController,
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Handle bar
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AivoBrand.gray.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Header
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          _getTechniqueIcon(technique.type),
                          color: color,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              technique.name,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: List.generate(5, (i) {
                                return Icon(
                                  i < technique.effectiveness
                                      ? Icons.star
                                      : Icons.star_border,
                                  size: 16,
                                  color: const Color(0xFFF59E0B),
                                );
                              }),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Description
                  Text(
                    technique.description,
                    style: const TextStyle(fontSize: 15),
                  ),
                  const SizedBox(height: 24),

                  // Steps
                  const Text(
                    'How to Use',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...technique.steps.asMap().entries.map((entry) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: color.withOpacity(0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                '${entry.key + 1}',
                                style: TextStyle(
                                  color: color,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(entry.value),
                          ),
                        ],
                      ),
                    );
                  }),

                  // Examples
                  if (technique.examples != null &&
                      technique.examples!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    const Text(
                      'Examples',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...technique.examples!.map((example) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AivoBrand.gray.shade100,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(example),
                        )),
                  ],
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _FlashcardReviewScreen extends StatefulWidget {
  final List<MemoryCard> cards;
  final String learnerId;

  const _FlashcardReviewScreen({
    required this.cards,
    required this.learnerId,
  });

  @override
  State<_FlashcardReviewScreen> createState() => _FlashcardReviewScreenState();
}

class _FlashcardReviewScreenState extends State<_FlashcardReviewScreen> {
  late List<MemoryCard> _reviewCards;
  int _currentIndex = 0;
  bool _showAnswer = false;
  int _correct = 0;
  int _incorrect = 0;

  @override
  void initState() {
    super.initState();
    _reviewCards = List.from(widget.cards)..shuffle();
  }

  void _answer(bool correct) {
    if (correct) {
      _correct++;
    } else {
      _incorrect++;
    }

    setState(() {
      _showAnswer = false;
      if (_currentIndex < _reviewCards.length - 1) {
        _currentIndex++;
      } else {
        _showResults();
      }
    });
  }

  void _showResults() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Review Complete!'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.celebration,
              size: 48,
              color: Color(0xFF8B5CF6),
            ),
            const SizedBox(height: 16),
            Text(
              'You reviewed ${_reviewCards.length} cards',
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _ResultBadge(
                  icon: Icons.check_circle,
                  label: 'Correct',
                  value: _correct,
                  color: AivoBrand.success,
                ),
                const SizedBox(width: 24),
                _ResultBadge(
                  icon: Icons.cancel,
                  label: 'Incorrect',
                  value: _incorrect,
                  color: AivoBrand.error,
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: const Text('Done'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                _currentIndex = 0;
                _correct = 0;
                _incorrect = 0;
                _reviewCards.shuffle();
              });
            },
            child: const Text('Review Again'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final card = _reviewCards[_currentIndex];

    return Scaffold(
      appBar: AppBar(
        title: Text('${_currentIndex + 1} / ${_reviewCards.length}'),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Icon(Icons.check, color: AivoBrand.success, size: 18),
                const SizedBox(width: 4),
                Text('$_correct'),
                const SizedBox(width: 12),
                Icon(Icons.close, color: AivoBrand.error, size: 18),
                const SizedBox(width: 4),
                Text('$_incorrect'),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Progress bar
          LinearProgressIndicator(
            value: (_currentIndex + 1) / _reviewCards.length,
            backgroundColor: AivoBrand.gray.shade200,
            valueColor:
                const AlwaysStoppedAnimation(Color(0xFF8B5CF6)),
          ),

          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() => _showAnswer = true);
              },
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Card(
                  elevation: 4,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        // Deck label
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color:
                                const Color(0xFF8B5CF6).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            card.deck,
                            style: const TextStyle(
                              color: Color(0xFF8B5CF6),
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        const Spacer(),

                        // Card content
                        AnimatedCrossFade(
                          duration: const Duration(milliseconds: 300),
                          crossFadeState: _showAnswer
                              ? CrossFadeState.showSecond
                              : CrossFadeState.showFirst,
                          firstChild: Column(
                            children: [
                              const Icon(
                                Icons.quiz,
                                size: 48,
                                color: Color(0xFF8B5CF6),
                              ),
                              const SizedBox(height: 24),
                              Text(
                                card.front,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 24),
                              Text(
                                'Tap to reveal answer',
                                style: TextStyle(
                                  color: AivoBrand.gray.shade500,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                          secondChild: Column(
                            children: [
                              const Icon(
                                Icons.lightbulb,
                                size: 48,
                                color: Color(0xFF10B981),
                              ),
                              const SizedBox(height: 24),
                              Text(
                                card.back,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Answer buttons
          if (_showAnswer)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _answer(false),
                      icon: const Icon(Icons.close),
                      label: const Text('Incorrect'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AivoBrand.error,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _answer(true),
                      icon: const Icon(Icons.check),
                      label: const Text('Correct'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AivoBrand.success,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _ResultBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  final int value;
  final Color color;

  const _ResultBadge({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color, size: 32),
        const SizedBox(height: 4),
        Text(
          '$value',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: AivoBrand.gray.shade600,
          ),
        ),
      ],
    );
  }
}
