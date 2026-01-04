/// Memory game widget for educational games
library;

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../game_models.dart';

/// Memory game widget with flip card animation
class MemoryGameWidget extends StatefulWidget {
  final List<MemoryCard> cards;
  final int columns;
  final Duration flipDuration;
  final Duration matchDelay;
  final bool soundEnabled;
  final bool hapticEnabled;
  final void Function(int score, int moves)? onScoreChange;
  final void Function(List<MemoryCard> cards, GameResult? result)? onGameComplete;
  final void Function(MemoryCard card)? onCardFlip;
  final void Function(MemoryCard card1, MemoryCard card2, bool matched)? onMatch;

  const MemoryGameWidget({
    super.key,
    required this.cards,
    this.columns = 4,
    this.flipDuration = const Duration(milliseconds: 300),
    this.matchDelay = const Duration(milliseconds: 1000),
    this.soundEnabled = true,
    this.hapticEnabled = true,
    this.onScoreChange,
    this.onGameComplete,
    this.onCardFlip,
    this.onMatch,
  });

  @override
  State<MemoryGameWidget> createState() => _MemoryGameWidgetState();
}

class _MemoryGameWidgetState extends State<MemoryGameWidget> {
  late List<MemoryCard> _cards;
  MemoryCard? _firstFlipped;
  MemoryCard? _secondFlipped;
  bool _isProcessing = false;
  int _score = 0;
  int _moves = 0;
  int _matchedPairs = 0;
  final Stopwatch _stopwatch = Stopwatch();

  @override
  void initState() {
    super.initState();
    _cards = List.from(widget.cards);
    _stopwatch.start();
  }

  @override
  void dispose() {
    _stopwatch.stop();
    super.dispose();
  }

  void _flipCard(int index) {
    if (_isProcessing) return;

    final card = _cards[index];
    if (card.isFlipped || card.isMatched) return;

    if (widget.hapticEnabled) {
      HapticFeedback.lightImpact();
    }

    setState(() {
      _cards[index] = card.copyWith(isFlipped: true);
    });

    widget.onCardFlip?.call(card);

    if (_firstFlipped == null) {
      _firstFlipped = _cards[index];
    } else {
      _secondFlipped = _cards[index];
      _moves++;
      _checkMatch();
    }
  }

  void _checkMatch() {
    if (_firstFlipped == null || _secondFlipped == null) return;

    _isProcessing = true;
    final isMatch = _firstFlipped!.matchId == _secondFlipped!.matchId;

    widget.onMatch?.call(_firstFlipped!, _secondFlipped!, isMatch);

    Timer(widget.matchDelay, () {
      setState(() {
        if (isMatch) {
          // Mark cards as matched
          _cards = _cards.map((card) {
            if (card.id == _firstFlipped!.id || card.id == _secondFlipped!.id) {
              return card.copyWith(isMatched: true, isFlipped: true);
            }
            return card;
          }).toList();

          _matchedPairs++;
          _score += 100;

          if (widget.hapticEnabled) {
            HapticFeedback.mediumImpact();
          }
        } else {
          // Flip cards back
          _cards = _cards.map((card) {
            if (card.id == _firstFlipped!.id || card.id == _secondFlipped!.id) {
              return card.copyWith(isFlipped: false);
            }
            return card;
          }).toList();

          _score = (_score - 10).clamp(0, double.infinity).toInt();
        }

        _firstFlipped = null;
        _secondFlipped = null;
        _isProcessing = false;

        widget.onScoreChange?.call(_score, _moves);

        // Check if game is complete
        if (_matchedPairs == _cards.length ~/ 2) {
          _stopwatch.stop();
          final result = GameResult(
            gameId: 'memory',
            sessionId: DateTime.now().millisecondsSinceEpoch.toString(),
            finalScore: _score,
            maxScore: (_cards.length ~/ 2) * 100,
            totalTime: _stopwatch.elapsed,
            accuracy: _matchedPairs / _moves,
            starsEarned: _calculateStars(),
          );
          widget.onGameComplete?.call(_cards, result);
        }
      });
    });
  }

  int _calculateStars() {
    final perfectMoves = _cards.length ~/ 2;
    final moveRatio = perfectMoves / _moves;
    if (moveRatio >= 0.8) return 3;
    if (moveRatio >= 0.5) return 2;
    if (moveRatio >= 0.3) return 1;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Score bar
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildStatItem(Icons.star, 'Score', _score.toString()),
              _buildStatItem(Icons.touch_app, 'Moves', _moves.toString()),
              _buildStatItem(
                Icons.check_circle,
                'Matched',
                '$_matchedPairs/${_cards.length ~/ 2}',
              ),
            ],
          ),
        ),

        // Card grid
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(16.0),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: widget.columns,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
              childAspectRatio: 1,
            ),
            itemCount: _cards.length,
            itemBuilder: (context, index) {
              return _MemoryCardWidget(
                card: _cards[index],
                flipDuration: widget.flipDuration,
                onTap: () => _flipCard(index),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildStatItem(IconData icon, String label, String value) {
    return Column(
      children: [
        Icon(icon, size: 24, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        Text(
          label,
          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
        ),
      ],
    );
  }
}

/// Individual memory card widget with flip animation
class _MemoryCardWidget extends StatefulWidget {
  final MemoryCard card;
  final Duration flipDuration;
  final VoidCallback onTap;

  const _MemoryCardWidget({
    required this.card,
    required this.flipDuration,
    required this.onTap,
  });

  @override
  State<_MemoryCardWidget> createState() => _MemoryCardWidgetState();
}

class _MemoryCardWidgetState extends State<_MemoryCardWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _flipAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: widget.flipDuration,
      vsync: this,
    );
    _flipAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void didUpdateWidget(_MemoryCardWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.card.isFlipped != oldWidget.card.isFlipped) {
      if (widget.card.isFlipped) {
        _controller.forward();
      } else {
        _controller.reverse();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.card.isFlipped || widget.card.isMatched ? null : widget.onTap,
      child: AnimatedBuilder(
        animation: _flipAnimation,
        builder: (context, child) {
          final isShowingFront = _flipAnimation.value < 0.5;
          final rotationAngle = _flipAnimation.value * 3.14159;

          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.001)
              ..rotateY(rotationAngle),
            child: isShowingFront ? _buildCardBack() : _buildCardFront(),
          );
        },
      ),
    );
  }

  Widget _buildCardBack() {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Center(
        child: Icon(
          Icons.question_mark,
          size: 32,
          color: Theme.of(context).colorScheme.onPrimary,
        ),
      ),
    );
  }

  Widget _buildCardFront() {
    return Transform(
      alignment: Alignment.center,
      transform: Matrix4.identity()..rotateY(3.14159),
      child: Container(
        decoration: BoxDecoration(
          color: widget.card.isMatched
              ? Colors.green[100]
              : Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: widget.card.isMatched
                ? Colors.green
                : Theme.of(context).colorScheme.outline,
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Center(
          child: widget.card.imageUrl != null
              ? Image.network(
                  widget.card.imageUrl!,
                  fit: BoxFit.contain,
                  width: double.infinity,
                  height: double.infinity,
                )
              : Text(
                  widget.card.content,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
        ),
      ),
    );
  }
}
