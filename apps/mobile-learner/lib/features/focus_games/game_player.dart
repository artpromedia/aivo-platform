/// Focus Games - Game Player Widget
///
/// Flutter widget for playing mini-games during focus breaks.
/// Implements memory game, breathing visualizer, tap rhythm game, and more.
///
/// All games are designed to be:
/// - Appropriate for neurodiverse learners (clear, predictable)
/// - Short duration (30-120 seconds)
/// - Non-competitive (self-improvement focused)
/// - Calming/re-centering (not stimulating)

import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES & MODELS
// ══════════════════════════════════════════════════════════════════════════════

enum GameType {
  memory,
  breathing,
  tapRhythm,
  pattern,
  drawing,
  focusSpot,
  counting,
  shapeTracing,
}

enum GameCategory {
  cognitive,
  relaxation,
  physical,
  creative,
}

class MiniGame {
  final String id;
  final String title;
  final String description;
  final GameCategory category;
  final int durationSeconds;
  final List<String> instructions;
  final Map<String, dynamic> config;

  const MiniGame({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.durationSeconds,
    required this.instructions,
    required this.config,
  });

  GameType get gameType {
    final type = config['type'] as String;
    return GameType.values.firstWhere(
      (t) => t.toString().split('.').last == type,
      orElse: () => GameType.focusSpot,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GAME PLAYER WIDGET
// ══════════════════════════════════════════════════════════════════════════════

class FocusGamePlayer extends StatefulWidget {
  final MiniGame game;
  final void Function(bool completed, int? score, int? maxScore)? onComplete;
  final VoidCallback? onExit;

  const FocusGamePlayer({
    super.key,
    required this.game,
    this.onComplete,
    this.onExit,
  });

  @override
  State<FocusGamePlayer> createState() => _FocusGamePlayerState();
}

class _FocusGamePlayerState extends State<FocusGamePlayer> {
  GameState _state = GameState.instructions;
  int _timeRemaining = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timeRemaining = widget.game.durationSeconds;
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startGame() {
    setState(() => _state = GameState.playing);
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _timeRemaining--;
        if (_timeRemaining <= 0) {
          _handleComplete(true);
        }
      });
    });
  }

  void _handleComplete(bool completed, {int? score, int? maxScore}) {
    _timer?.cancel();
    setState(() => _state = GameState.completed);
    widget.onComplete?.call(completed, score, maxScore);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: Text(widget.game.title),
        actions: [
          if (_state == GameState.playing)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Center(
                child: Text(
                  '${_timeRemaining ~/ 60}:${(_timeRemaining % 60).toString().padLeft(2, '0')}',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: widget.onExit,
          ),
        ],
      ),
      body: SafeArea(
        child: _buildContent(),
      ),
    );
  }

  Widget _buildContent() {
    switch (_state) {
      case GameState.instructions:
        return _InstructionsView(
          instructions: widget.game.instructions,
          onStart: _startGame,
        );
      case GameState.playing:
        return _buildGameView();
      case GameState.completed:
        return _CompletionView(
          title: widget.game.title,
          onClose: widget.onExit,
        );
    }
  }

  Widget _buildGameView() {
    switch (widget.game.gameType) {
      case GameType.memory:
        return _MemoryGame(
          config: widget.game.config,
          onComplete: _handleComplete,
        );
      case GameType.breathing:
        return _BreathingVisualizer(
          config: widget.game.config,
          onComplete: _handleComplete,
        );
      case GameType.tapRhythm:
        return _TapRhythmGame(
          config: widget.game.config,
          onComplete: _handleComplete,
        );
      case GameType.drawing:
        return _DrawingGame(
          config: widget.game.config,
          onComplete: _handleComplete,
        );
      case GameType.focusSpot:
        return _FocusSpotGame(
          config: widget.game.config,
          onComplete: _handleComplete,
        );
      case GameType.counting:
        return _CountingGame(
          config: widget.game.config,
          onComplete: _handleComplete,
        );
      default:
        return Center(
          child: Text('Game type not implemented: ${widget.game.gameType}'),
        );
    }
  }
}

enum GameState { instructions, playing, completed }

// ══════════════════════════════════════════════════════════════════════════════
// INSTRUCTIONS VIEW
// ══════════════════════════════════════════════════════════════════════════════

class _InstructionsView extends StatelessWidget {
  final List<String> instructions;
  final VoidCallback onStart;

  const _InstructionsView({
    required this.instructions,
    required this.onStart,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'How to Play:',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 24),
            ...instructions.asMap().entries.map((entry) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          '${entry.key + 1}',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onPrimary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        entry.value,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 32),
            FilledButton(
              onPressed: onStart,
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                child: Text('Start Game'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPLETION VIEW
// ══════════════════════════════════════════════════════════════════════════════

class _CompletionView extends StatelessWidget {
  final String title;
  final VoidCallback? onClose;

  const _CompletionView({
    required this.title,
    this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              '✨',
              style: TextStyle(fontSize: 80),
            ),
            const SizedBox(height: 24),
            Text(
              'Great Job!',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            Text(
              'You completed $title! Hope you feel refreshed and ready to continue.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 32),
            FilledButton(
              onPressed: onClose,
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                child: Text('Back to Learning'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MEMORY GAME
// ══════════════════════════════════════════════════════════════════════════════

class _MemoryGame extends StatefulWidget {
  final Map<String, dynamic> config;
  final void Function(bool, {int? score, int? maxScore}) onComplete;

  const _MemoryGame({
    required this.config,
    required this.onComplete,
  });

  @override
  State<_MemoryGame> createState() => _MemoryGameState();
}

class _MemoryGameState extends State<_MemoryGame> {
  late List<_MemoryCard> cards;
  List<int> flippedIndices = [];
  int moves = 0;
  int matchedPairs = 0;
  late int totalPairs;

  @override
  void initState() {
    super.initState();
    totalPairs = widget.config['cardPairs'] as int? ?? 4;
    final theme = widget.config['theme'] as String? ?? 'shapes';
    _initializeCards(totalPairs, theme);
  }

  void _initializeCards(int pairs, String theme) {
    final values = _generateCardValues(pairs, theme);
    final allValues = [...values, ...values];
    allValues.shuffle();

    cards = allValues
        .asMap()
        .entries
        .map((e) => _MemoryCard(
              id: e.key,
              value: e.value,
              isFlipped: false,
              isMatched: false,
            ))
        .toList();
  }

  List<String> _generateCardValues(int pairs, String theme) {
    const themes = {
      'shapes': ['●', '■', '▲', '★', '♥', '◆'],
      'emojis': ['😊', '🌟', '🌈', '🎨', '🎵', '🌺'],
      'colors': ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'],
      'nature': ['🌸', '🌻', '🌿', '🍀', '🌺', '🌼'],
    };

    final values = themes[theme] ?? themes['shapes']!;
    return values.take(pairs).toList();
  }

  void _handleCardTap(int index) {
    if (flippedIndices.length == 2) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;

    setState(() {
      cards[index].isFlipped = true;
      flippedIndices.add(index);
    });

    if (flippedIndices.length == 2) {
      moves++;
      final first = flippedIndices[0];
      final second = flippedIndices[1];

      if (cards[first].value == cards[second].value) {
        // Match!
        Future.delayed(const Duration(milliseconds: 500), () {
          if (!mounted) return;
          setState(() {
            cards[first].isMatched = true;
            cards[second].isMatched = true;
            flippedIndices.clear();
            matchedPairs++;

            if (matchedPairs == totalPairs) {
              widget.onComplete(true, score: totalPairs * 2 - moves, maxScore: totalPairs * 2);
            }
          });
        });
      } else {
        // No match
        Future.delayed(const Duration(milliseconds: 1000), () {
          if (!mounted) return;
          setState(() {
            cards[first].isFlipped = false;
            cards[second].isFlipped = false;
            flippedIndices.clear();
          });
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Moves: $moves | Pairs: $matchedPairs/$totalPairs',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                childAspectRatio: 1,
              ),
              itemCount: cards.length,
              itemBuilder: (context, index) {
                final card = cards[index];
                return GestureDetector(
                  onTap: () => _handleCardTap(index),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    decoration: BoxDecoration(
                      color: card.isFlipped || card.isMatched
                          ? Theme.of(context).colorScheme.primary
                          : Theme.of(context).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: Theme.of(context).colorScheme.outline,
                        width: 2,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        card.isFlipped || card.isMatched ? card.value : '?',
                        style: TextStyle(
                          fontSize: 32,
                          color: card.isFlipped || card.isMatched
                              ? Theme.of(context).colorScheme.onPrimary
                              : Colors.transparent,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _MemoryCard {
  final int id;
  final String value;
  bool isFlipped;
  bool isMatched;

  _MemoryCard({
    required this.id,
    required this.value,
    required this.isFlipped,
    required this.isMatched,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// BREATHING VISUALIZER
// ══════════════════════════════════════════════════════════════════════════════

class _BreathingVisualizer extends StatefulWidget {
  final Map<String, dynamic> config;
  final void Function(bool) onComplete;

  const _BreathingVisualizer({
    required this.config,
    required this.onComplete,
  });

  @override
  State<_BreathingVisualizer> createState() => _BreathingVisualizerState();
}

class _BreathingVisualizerState extends State<_BreathingVisualizer>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  late int inhale;
  late int holdIn;
  late int exhale;
  late int holdOut;
  late int cycles;

  int currentCycle = 1;
  String phase = 'Breathe In';

  @override
  void initState() {
    super.initState();

    inhale = widget.config['inhaleSeconds'] as int? ?? 4;
    holdIn = widget.config['holdInSeconds'] as int? ?? 0;
    exhale = widget.config['exhaleSeconds'] as int? ?? 4;
    holdOut = widget.config['holdOutSeconds'] as int? ?? 0;
    cycles = widget.config['cycles'] as int? ?? 5;

    final totalDuration = inhale + holdIn + exhale + holdOut;
    _controller = AnimationController(
      vsync: this,
      duration: Duration(seconds: totalDuration),
    );

    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(_controller);

    _controller.addListener(_updatePhase);
    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        currentCycle++;
        if (currentCycle > cycles) {
          widget.onComplete(true);
        } else {
          _controller.reset();
          _controller.forward();
        }
      }
    });

    _controller.forward();
  }

  void _updatePhase() {
    final totalDuration = inhale + holdIn + exhale + holdOut;
    final elapsed = _animation.value * totalDuration;

    String newPhase;
    if (elapsed < inhale) {
      newPhase = 'Breathe In';
    } else if (elapsed < inhale + holdIn) {
      newPhase = 'Hold';
    } else if (elapsed < inhale + holdIn + exhale) {
      newPhase = 'Breathe Out';
    } else {
      newPhase = 'Hold';
    }

    if (newPhase != phase) {
      setState(() => phase = newPhase);
      HapticFeedback.lightImpact();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Cycle $currentCycle of $cycles',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 32),
          AnimatedBuilder(
            animation: _animation,
            builder: (context, child) {
              final totalDuration = inhale + holdIn + exhale + holdOut;
              final elapsed = _animation.value * totalDuration;

              double scale;
              if (elapsed < inhale) {
                // Inhale - grow
                scale = 0.5 + (elapsed / inhale) * 0.5;
              } else if (elapsed < inhale + holdIn) {
                // Hold in - stay large
                scale = 1.0;
              } else if (elapsed < inhale + holdIn + exhale) {
                // Exhale - shrink
                final exhaleProgress = (elapsed - inhale - holdIn) / exhale;
                scale = 1.0 - (exhaleProgress * 0.5);
              } else {
                // Hold out - stay small
                scale = 0.5;
              }

              return Container(
                width: 200 * scale,
                height: 200 * scale,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      Theme.of(context).colorScheme.primary,
                      Theme.of(context).colorScheme.primary.withOpacity(0.4),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 32),
          Text(
            phase,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TAP RHYTHM GAME
// ══════════════════════════════════════════════════════════════════════════════

class _TapRhythmGame extends StatefulWidget {
  final Map<String, dynamic> config;
  final void Function(bool, {int? score, int? maxScore}) onComplete;

  const _TapRhythmGame({
    required this.config,
    required this.onComplete,
  });

  @override
  State<_TapRhythmGame> createState() => _TapRhythmGameState();
}

class _TapRhythmGameState extends State<_TapRhythmGame> {
  late List<int> pattern;
  late int repetitions;
  int currentRep = 0;
  int currentBeat = 0;
  bool isActive = false;
  List<int> userTaps = [];

  @override
  void initState() {
    super.initState();
    pattern = (widget.config['pattern'] as List<dynamic>?)?.cast<int>() ?? [1000, 1000, 1000];
    repetitions = widget.config['repetitions'] as int? ?? 3;
    _startNextRepetition();
  }

  void _startNextRepetition() {
    if (currentRep >= repetitions) {
      final score = userTaps.length;
      final maxScore = repetitions * pattern.length;
      widget.onComplete(true, score: score, maxScore: maxScore);
      return;
    }

    Future.delayed(const Duration(milliseconds: 500), () {
      if (!mounted) return;
      setState(() => isActive = true);
      _playPattern();
    });
  }

  void _playPattern() async {
    for (int i = 0; i < pattern.length; i++) {
      if (!mounted) return;
      setState(() => currentBeat = i);
      HapticFeedback.mediumImpact();
      await Future.delayed(Duration(milliseconds: pattern[i]));
    }

    if (!mounted) return;
    setState(() {
      isActive = false;
      currentRep++;
      currentBeat = 0;
    });
    _startNextRepetition();
  }

  void _handleTap() {
    setState(() => userTaps.add(DateTime.now().millisecondsSinceEpoch));
    HapticFeedback.lightImpact();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Round ${currentRep + 1} of $repetitions',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(pattern.length, (i) {
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 8),
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i == currentBeat && isActive
                      ? Theme.of(context).colorScheme.primary
                      : Theme.of(context).colorScheme.surfaceContainerHighest,
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outline,
                    width: 2,
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 48),
          GestureDetector(
            onTap: _handleTap,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Theme.of(context).colorScheme.primary,
                boxShadow: [
                  BoxShadow(
                    color: Theme.of(context).colorScheme.primary.withOpacity(0.4),
                    blurRadius: 10,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Center(
                child: Text(
                  'TAP',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onPrimary,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            isActive ? 'Tap along with the rhythm!' : 'Watch and listen...',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SIMPLE GAME STUBS (for completeness)
// ══════════════════════════════════════════════════════════════════════════════

class _DrawingGame extends StatelessWidget {
  final Map<String, dynamic> config;
  final void Function(bool) onComplete;

  const _DrawingGame({
    required this.config,
    required this.onComplete,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('Drawing game - Canvas implementation needed'),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => onComplete(true),
            child: const Text('Complete'),
          ),
        ],
      ),
    );
  }
}

class _FocusSpotGame extends StatelessWidget {
  final Map<String, dynamic> config;
  final void Function(bool) onComplete;

  const _FocusSpotGame({
    required this.config,
    required this.onComplete,
  });

  @override
  Widget build(BuildContext context) {
    Future.delayed(Duration(seconds: config['duration'] as int? ?? 30), () {
      onComplete(true);
    });

    return Center(
      child: Container(
        width: 150,
        height: 150,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              Theme.of(context).colorScheme.primary,
              Theme.of(context).colorScheme.secondary,
            ],
          ),
        ),
      ),
    );
  }
}

class _CountingGame extends StatefulWidget {
  final Map<String, dynamic> config;
  final void Function(bool, {int? score, int? maxScore}) onComplete;

  const _CountingGame({
    required this.config,
    required this.onComplete,
  });

  @override
  State<_CountingGame> createState() => _CountingGameState();
}

class _CountingGameState extends State<_CountingGame> {
  late int count;
  String userAnswer = '';

  @override
  void initState() {
    super.initState();
    count = math.Random().nextInt(6) + 3; // 3-8 items
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'How many stars do you see?',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 24),
            Wrap(
              spacing: 16,
              runSpacing: 16,
              alignment: WrapAlignment.center,
              children: List.generate(
                count,
                (i) => const Text('⭐', style: TextStyle(fontSize: 36)),
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: 100,
              child: TextField(
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24),
                decoration: const InputDecoration(
                  hintText: '?',
                  border: OutlineInputBorder(),
                ),
                onChanged: (value) => setState(() => userAnswer = value),
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: userAnswer.isEmpty
                  ? null
                  : () {
                      final correct = int.tryParse(userAnswer) == count;
                      widget.onComplete(
                        true,
                        score: correct ? 1 : 0,
                        maxScore: 1,
                      );
                    },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }
}
